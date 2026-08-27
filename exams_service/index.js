const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/exams';
const jwtSecret = process.env.JWT_SECRET || 'devsecret';
let db;

MongoClient.connect(mongoUri)
  .then(client => {
    db = client.db();
    console.log('Connected to MongoDB (exams)');
  })
  .catch(err => console.error(err));

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.user = jwt.verify(auth.split(' ')[1], jwtSecret);
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

const isRRHHOrAdmin = req => ['admin_rrhh', 'superadmin'].includes(req.user.role);
const canManageExams = requireRole('admin_rrhh', 'superadmin');

// Questions: { text, type: 'mcq'|'tf'|'open', options: [], answer: index, tags: [] }
app.post('/questions', requireAuth, canManageExams, async (req, res) => {
  const q = req.body;
  q.createdAt = new Date();
  const result = await db.collection('questions').insertOne(q);
  res.json({ id: result.insertedId });
});

app.get('/questions', async (req, res) => {
  const qs = await db.collection('questions').find().toArray();
  res.json(qs);
});

// Templates: { name, sections: [{title, questionIds: [], weight}] }
app.post('/templates', requireAuth, canManageExams, async (req, res) => {
  const t = req.body;
  t.createdAt = new Date();
  const result = await db.collection('templates').insertOne(t);
  res.json({ id: result.insertedId });
});

app.get('/templates', async (req, res) => {
  const ts = await db.collection('templates').find().toArray();
  res.json(ts);
});

// Create a test instance for the authenticated user
app.post('/tests', requireAuth, async (req, res) => {
  const { templateId } = req.body;
  const userId = req.user.email;
  const template = await db.collection('templates').findOne({ _id: new ObjectId(templateId) });
  if (!template) return res.status(404).json({ error: 'Template not found' });
  // expand questions
  const questionIds = template.sections.flatMap(s => s.questionIds || []);
  const questions = await db.collection('questions').find({ _id: { $in: questionIds.map(id => new ObjectId(id)) } }).toArray();
  const instance = {
    templateId: new ObjectId(templateId),
    userId,
    questions: questions.map(q => ({ id: q._id, type: q.type, text: q.text, options: q.options })),
    startedAt: new Date(),
    status: 'in_progress'
  };
  const result = await db.collection('tests').insertOne(instance);
  res.json({ testId: result.insertedId, questions: instance.questions });
});

// Submit answers: { answers: [{questionId, answerIndex, textAnswer}] }
app.post('/tests/:id/submit', requireAuth, async (req, res) => {
  const testId = req.params.id;
  const { answers } = req.body;
  const test = await db.collection('tests').findOne({ _id: new ObjectId(testId) });
  if (!test) return res.status(404).json({ error: 'Test not found' });
  if (test.userId !== req.user.email) return res.status(403).json({ error: 'No autorizado' });
  // Autograde MCQ and TF
  let total = 0;
  let scored = 0;
  const details = [];
  for (const a of answers) {
    const q = await db.collection('questions').findOne({ _id: new ObjectId(a.questionId) });
    if (!q) continue;
    total += 1;
    let correct = false;
    if (q.type === 'mcq' || q.type === 'tf') {
      if (typeof a.answerIndex !== 'undefined' && a.answerIndex === q.answer) correct = true;
    }
    if (correct) scored += 1;
    details.push({ questionId: a.questionId, correct, given: a.answerIndex, expected: q.answer });
  }
  const score = total === 0 ? 0 : Math.round((scored / total) * 100);
  await db.collection('tests').updateOne({ _id: new ObjectId(testId) }, { $set: { status: 'completed', completedAt: new Date(), score, details } });
  res.json({ score, total, correct: scored, details });
});

app.get('/tests/:id/result', requireAuth, async (req, res) => {
  const test = await db.collection('tests').findOne({ _id: new ObjectId(req.params.id) });
  if (!test) return res.status(404).json({ error: 'Not found' });
  if (test.userId !== req.user.email && !isRRHHOrAdmin(req)) return res.status(403).json({ error: 'No autorizado' });
  res.json(test);
});

app.get('/tests/:id/export', requireAuth, canManageExams, async (req, res) => {
  const test = await db.collection('tests').findOne({ _id: new ObjectId(req.params.id) });
  if (!test) return res.status(404).json({ error: 'Not found' });
  const csvWriter = createCsvWriter({
    path: `/tmp/test_${req.params.id}.csv`,
    header: [
      { id: 'questionId', title: 'QuestionId' },
      { id: 'correct', title: 'Correct' },
      { id: 'given', title: 'Given' },
      { id: 'expected', title: 'Expected' }
    ]
  });
  const records = (test.details || []).map(d => ({ questionId: d.questionId, correct: d.correct, given: d.given, expected: d.expected }));
  await csvWriter.writeRecords(records);
  res.download(`/tmp/test_${req.params.id}.csv`);
});

app.listen(4000, () => console.log('Exams service listening on port 4000'));
