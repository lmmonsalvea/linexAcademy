const express = require('express');
const { z } = require('zod');
const { db } = require('../firebaseAdmin');
const { requireRole } = require('../middleware/auth');
const { validate } = require('../lib/validate');
const { asyncRoute } = require('../middleware/errorHandler');

const router = express.Router();

const canManageContent = requireRole('admin_area', 'knowledge_manager', 'superadmin');

// Tokenizes free text into lowercase word tokens. Used both to build the
// `searchTokens` index at write time and to tokenize the `q` search param —
// keeping both sides of the match in perfect sync. This is the fix for the
// old prototype's `new RegExp(q, 'i')` against Mongo (regex-injection/ReDoS
// risk): Firestore has no regex/full-text query support anyway, so instead
// of escaping user input we avoid building a pattern from it at all.
function tokenize(text) {
  return Array.from(
    new Set(
      (text || '')
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter(Boolean)
    )
  );
}

function computeSearchTokens({ title, content, tags }) {
  return tokenize(`${title || ''} ${content || ''} ${(tags || []).join(' ')}`);
}

const areaSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const documentSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

const versionSchema = z.object({
  content: z.string().min(1),
});

// GET /api/knowledge/areas — any authenticated user.
router.get('/areas', asyncRoute(async (req, res) => {
  const snap = await db.collection('knowledgeAreas').orderBy('name').get();
  res.json({ areas: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
}));

// POST /api/knowledge/areas — content managers only.
router.post('/areas', canManageContent, asyncRoute(async (req, res) => {
  const { name, description } = validate(areaSchema, req.body);
  const doc = { name, description: description || '', createdAt: new Date().toISOString() };
  const ref = await db.collection('knowledgeAreas').add(doc);
  res.json({ id: ref.id, ...doc });
}));

// GET /api/knowledge/areas/:id/documents — any authenticated user. List
// view only — omits content/versions to keep the payload light.
router.get('/areas/:id/documents', asyncRoute(async (req, res) => {
  const snap = await db.collection('knowledgeDocuments').where('areaId', '==', req.params.id).get();
  const documents = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title,
      tags: data.tags || [],
      currentVersion: data.currentVersion,
      createdAt: data.createdAt,
    };
  });
  res.json({ documents });
}));

// POST /api/knowledge/areas/:id/documents — content managers only. Documents
// are published directly on write (no draft/review state machine — the old
// prototype never implemented one and roles_permisos.md only describes it
// as an aspiration).
router.post('/areas/:id/documents', canManageContent, asyncRoute(async (req, res) => {
  const { title, content, tags } = validate(documentSchema, req.body);
  const now = new Date().toISOString();
  const doc = {
    areaId: req.params.id,
    title,
    content,
    tags: tags || [],
    searchTokens: computeSearchTokens({ title, content, tags }),
    versions: [{
      version: 1,
      content,
      updatedAt: now,
      updatedByUid: req.user.uid,
      updatedByEmail: req.user.email,
    }],
    currentVersion: 1,
    createdAt: now,
  };
  const ref = await db.collection('knowledgeDocuments').add(doc);
  res.json({ id: ref.id, ...doc });
}));

// GET /api/knowledge/documents/:id — any authenticated user. Full document
// including version history.
router.get('/documents/:id', asyncRoute(async (req, res) => {
  const snap = await db.collection('knowledgeDocuments').doc(req.params.id).get();
  if (!snap.exists) throw { status: 404, message: 'Documento no encontrado' };
  res.json({ id: snap.id, ...snap.data() });
}));

// POST /api/knowledge/documents/:id/version — content managers only. Appends
// a new version and updates the document's current content/search index.
router.post('/documents/:id/version', canManageContent, asyncRoute(async (req, res) => {
  const { content } = validate(versionSchema, req.body);
  const ref = db.collection('knowledgeDocuments').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw { status: 404, message: 'Documento no encontrado' };

  const data = snap.data();
  const newVersion = (data.currentVersion || 1) + 1;
  const now = new Date().toISOString();
  const versionEntry = {
    version: newVersion,
    content,
    updatedAt: now,
    updatedByUid: req.user.uid,
    updatedByEmail: req.user.email,
  };

  await ref.update({
    content,
    currentVersion: newVersion,
    versions: [...(data.versions || []), versionEntry],
    searchTokens: computeSearchTokens({ title: data.title, content, tags: data.tags }),
  });

  res.json({ id: ref.id, version: newVersion });
}));

// GET /api/knowledge/search?q= — any authenticated user. Tokenized keyword
// search (see `tokenize` above for why this replaces the old regex search).
// `array-contains-any` is OR-only and capped at 10 values by Firestore, so
// we slice the query tokens and then post-filter in application code to
// require ALL tokens to match, for better precision.
router.get('/search', asyncRoute(async (req, res) => {
  const tokens = tokenize(req.query.q);
  if (tokens.length === 0) return res.json({ documents: [] });

  const snap = await db.collection('knowledgeDocuments')
    .where('searchTokens', 'array-contains-any', tokens.slice(0, 10))
    .get();

  const documents = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((doc) => tokens.every((t) => (doc.searchTokens || []).includes(t)))
    .map((doc) => ({ id: doc.id, title: doc.title, areaId: doc.areaId, tags: doc.tags || [] }));

  res.json({ documents });
}));

module.exports = router;
