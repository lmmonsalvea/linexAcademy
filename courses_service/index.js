const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const PDFDocument = require('pdfkit');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/courses';
const jwtSecret = process.env.JWT_SECRET || 'devsecret';
const moduleTypes = ['video', 'pdf', 'scorm', 'quiz'];
let db;

MongoClient.connect(mongoUri)
  .then(client => {
    db = client.db();
    console.log('Connected to MongoDB (courses)');
  })
  .catch(err => console.error(err));

function requireAuth(req, res, next) {
  // Accepts the token via header (fetch calls) or ?token= (plain downloadable links, e.g. the certificate)
  const header = req.headers.authorization;
  const token = header ? header.split(' ')[1] : req.query.token;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
    next();
  };
}

const canManageCourses = requireRole('instructor', 'admin_area', 'superadmin');

function normalizeModules(modules) {
  return (modules || [])
    .filter(m => moduleTypes.includes(m.type))
    .map((m, i) => ({
      _id: new ObjectId(),
      type: m.type,
      title: m.title || `Módulo ${i + 1}`,
      url: m.url || null,
      quizTemplateId: m.quizTemplateId || null,
      order: typeof m.order === 'number' ? m.order : i
    }));
}

// Create a course: { title, description, area, modules: [{type,title,url,quizTemplateId}] }
app.post('/courses', requireAuth, canManageCourses, async (req, res) => {
  const { title, description, area, modules } = req.body;
  if (!title) return res.status(400).json({ error: 'Falta el título del curso' });
  const course = {
    title,
    description: description || '',
    area: area || null,
    instructorId: req.user.email,
    modules: normalizeModules(modules),
    published: true,
    createdAt: new Date()
  };
  const result = await db.collection('courses').insertOne(course);
  res.json({ id: result.insertedId });
});

// Catalog
app.get('/courses', async (req, res) => {
  const filter = { published: true };
  if (req.query.area) filter.area = req.query.area;
  const courses = await db.collection('courses').find(filter).toArray();
  res.json(courses);
});

app.get('/courses/:id', async (req, res) => {
  const course = await db.collection('courses').findOne({ _id: new ObjectId(req.params.id) });
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  res.json(course);
});

// Add a module to an existing course
app.post('/courses/:id/modules', requireAuth, canManageCourses, async (req, res) => {
  const courseId = new ObjectId(req.params.id);
  const course = await db.collection('courses').findOne({ _id: courseId });
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  const [newModule] = normalizeModules([{ ...req.body, order: course.modules.length }]);
  if (!newModule) return res.status(400).json({ error: 'Tipo de módulo inválido' });
  await db.collection('courses').updateOne({ _id: courseId }, { $push: { modules: newModule } });
  res.json(newModule);
});

// Enroll the authenticated user in a course
app.post('/courses/:id/enroll', requireAuth, async (req, res) => {
  const userId = req.user.email;
  const courseId = new ObjectId(req.params.id);
  const course = await db.collection('courses').findOne({ _id: courseId });
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  await db.collection('progress').updateOne(
    { courseId, userId },
    { $setOnInsert: { courseId, userId, completedModules: [], enrolledAt: new Date() } },
    { upsert: true }
  );
  res.json({ ok: true });
});

// Mark a module as completed for the authenticated user
app.post('/courses/:id/progress', requireAuth, async (req, res) => {
  const { moduleId } = req.body;
  const userId = req.user.email;
  if (!moduleId) return res.status(400).json({ error: 'Falta moduleId' });
  const courseId = new ObjectId(req.params.id);
  const course = await db.collection('courses').findOne({ _id: courseId });
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  if (!course.modules.some(m => m._id.toString() === moduleId)) {
    return res.status(400).json({ error: 'Módulo no pertenece al curso' });
  }
  await db.collection('progress').updateOne(
    { courseId, userId },
    { $addToSet: { completedModules: moduleId }, $setOnInsert: { enrolledAt: new Date() } },
    { upsert: true }
  );
  const progress = await db.collection('progress').findOne({ courseId, userId });
  const percent = Math.round((progress.completedModules.length / course.modules.length) * 100);
  res.json({ completedModules: progress.completedModules, percent });
});

const canViewOtherProgress = req => ['instructor', 'admin_area', 'admin_rrhh', 'superadmin'].includes(req.user.role);

app.get('/courses/:id/progress/:userId', requireAuth, async (req, res) => {
  if (req.params.userId !== req.user.email && !canViewOtherProgress(req)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const courseId = new ObjectId(req.params.id);
  const course = await db.collection('courses').findOne({ _id: courseId });
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  const progress = await db.collection('progress').findOne({ courseId, userId: req.params.userId });
  const completedModules = progress ? progress.completedModules : [];
  const percent = course.modules.length === 0 ? 0 : Math.round((completedModules.length / course.modules.length) * 100);
  res.json({ completedModules, percent, totalModules: course.modules.length });
});

// Certificate: only issued once progress is 100%
app.get('/courses/:id/certificate/:userId', requireAuth, async (req, res) => {
  if (req.params.userId !== req.user.email && !canViewOtherProgress(req)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const courseId = new ObjectId(req.params.id);
  const course = await db.collection('courses').findOne({ _id: courseId });
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  const progress = await db.collection('progress').findOne({ courseId, userId: req.params.userId });
  const completed = progress ? progress.completedModules.length : 0;
  if (course.modules.length === 0 || completed < course.modules.length) {
    return res.status(403).json({ error: 'El curso aún no está completado' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="certificado-${req.params.id}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
  doc.pipe(res);

  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#DDE1FF');
  doc.fillColor('#17153B').fontSize(20).font('Helvetica-Bold').text('Linex', 50, 50, { continued: true });
  doc.fillColor('#5B5CFF').text(' Travel');
  doc.fillColor('#17153B').fontSize(30).font('Helvetica-Bold')
    .text('Certificado de finalización', 0, 160, { align: 'center' });
  doc.fontSize(16).font('Helvetica')
    .text('Este certificado acredita que', 0, 220, { align: 'center' });
  doc.fontSize(22).font('Helvetica-Bold')
    .text(req.params.userId, 0, 250, { align: 'center' });
  doc.fontSize(16).font('Helvetica')
    .text('completó satisfactoriamente el curso', 0, 290, { align: 'center' });
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#5B5CFF')
    .text(course.title, 0, 320, { align: 'center' });
  doc.fillColor('#17153B').fontSize(12).font('Helvetica')
    .text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}`, 0, doc.page.height - 100, { align: 'center' });

  doc.end();
});

app.listen(7000, () => console.log('Courses service listening on port 7000'));
