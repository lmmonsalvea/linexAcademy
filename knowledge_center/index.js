const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/knowledge';
const jwtSecret = process.env.JWT_SECRET || 'devsecret';
let db;

MongoClient.connect(mongoUri)
  .then(client => {
    db = client.db();
    console.log('Connected to MongoDB');
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

const canManageContent = requireRole('admin_area', 'knowledge_manager', 'superadmin');

// Areas: each area has documents
app.get('/areas', async (req, res) => {
  const areas = await db.collection('areas').find().toArray();
  res.json(areas);
});

app.post('/areas', requireAuth, canManageContent, async (req, res) => {
  const doc = req.body;
  const result = await db.collection('areas').insertOne(doc);
  res.json({ id: result.insertedId });
});

app.get('/areas/:id/documents', async (req, res) => {
  const areaId = req.params.id;
  const docs = await db.collection('documents').find({ areaId }).toArray();
  res.json(docs);
});

app.post('/areas/:id/documents', requireAuth, canManageContent, async (req, res) => {
  const areaId = req.params.id;
  const doc = req.body;
  doc.areaId = areaId;
  doc.createdAt = new Date();
  // Initialize versions array
  doc.versions = [{ version: 1, content: doc.content || '', createdAt: new Date(), author: doc.author || null }];
  doc.currentVersion = 1;
  const result = await db.collection('documents').insertOne(doc);
  res.json({ id: result.insertedId });
});

// Get document by id including versions
app.get('/documents/:id', async (req, res) => {
  const id = req.params.id;
  const doc = await db.collection('documents').findOne({ _id: new ObjectId(id) });
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

// Add a new version to a document
app.post('/documents/:id/version', requireAuth, canManageContent, async (req, res) => {
  const id = req.params.id;
  const { content, author } = req.body;
  const doc = await db.collection('documents').findOne({ _id: new ObjectId(id) });
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const newVersion = (doc.currentVersion || 1) + 1;
  const versionObj = { version: newVersion, content: content || '', createdAt: new Date(), author: author || null };
  await db.collection('documents').updateOne({ _id: new ObjectId(id) }, { $push: { versions: versionObj }, $set: { currentVersion: newVersion, content: content } });
  res.json({ version: newVersion });
});

// Simple search across titles and content
app.get('/search', async (req, res) => {
  const q = req.query.q || '';
  if (!q) return res.json([]);
  const regex = new RegExp(q, 'i');
  const docs = await db.collection('documents').find({ $or: [{ title: regex }, { content: regex }, { 'versions.content': regex }] }).toArray();
  res.json(docs);
});

app.listen(3000, () => console.log('Knowledge center API listening on port 3000'));
