const express = require('express');
const { z } = require('zod');
const { db } = require('../firebaseAdmin');
const { requireRole } = require('../middleware/auth');
const { validate } = require('../lib/validate');
const { asyncRoute } = require('../middleware/errorHandler');

const router = express.Router();

const canManageContent = requireRole('admin_area', 'superadmin');

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
  // Groups documents within an area into the org chart's "bloque" they
  // belong to (e.g. "Travel Operations") — each document itself is a
  // "equipo de trabajo" (team), the actual content container. Defaults to
  // the document's own title when omitted, i.e. a standalone team that is
  // its own block (see seed-org-chart.js).
  block: z.string().optional(),
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

const areaUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
});

// PATCH /api/knowledge/areas/:id — rename a business unit / change its
// description. Content managers only.
router.patch('/areas/:id', canManageContent, asyncRoute(async (req, res) => {
  const data = validate(areaUpdateSchema, req.body);
  const ref = db.collection('knowledgeAreas').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw { status: 404, message: 'Área no encontrada' };

  const patch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  await ref.update(patch);
  res.json({ id: ref.id, ...snap.data(), ...patch });
}));

const blockRenameSchema = z.object({
  oldName: z.string().trim().min(1),
  newName: z.string().trim().min(1),
});

// POST /api/knowledge/areas/:id/blocks/rename — a "bloque" isn't its own
// Firestore entity, just a string every team (document) in it shares — so
// renaming one means bulk-updating every document in this area whose
// `block` matches the old name. Content managers only.
router.post('/areas/:id/blocks/rename', canManageContent, asyncRoute(async (req, res) => {
  const { oldName, newName } = validate(blockRenameSchema, req.body);
  const snap = await db.collection('knowledgeDocuments')
    .where('areaId', '==', req.params.id)
    .where('block', '==', oldName)
    .get();
  if (snap.empty) throw { status: 404, message: 'Ningún equipo usa ese bloque en esta área' };

  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { block: newName }));
  await batch.commit();
  res.json({ renamed: snap.size });
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
      block: data.block || data.title,
      currentVersion: data.currentVersion,
      createdAt: data.createdAt,
    };
  });
  res.json({ documents });
}));

// GET /api/knowledge/areas/:id/blocks — any authenticated user. Lightweight
// list of the distinct block names in an area, used to populate course
// assignment pickers (NewCourse/CourseDetail) and the admin user-assignment
// picker, without fetching every document's content.
router.get('/areas/:id/blocks', asyncRoute(async (req, res) => {
  const snap = await db.collection('knowledgeDocuments').where('areaId', '==', req.params.id).get();
  const blocks = Array.from(new Set(snap.docs.map((d) => d.data().block || d.data().title)));
  res.json({ blocks });
}));

// POST /api/knowledge/areas/:id/documents — content managers only. Documents
// are published directly on write (no draft/review state machine — the old
// prototype never implemented one and roles_permisos.md only describes it
// as an aspiration).
router.post('/areas/:id/documents', canManageContent, asyncRoute(async (req, res) => {
  const { title, content, tags, block } = validate(documentSchema, req.body);
  const now = new Date().toISOString();
  const doc = {
    areaId: req.params.id,
    title,
    content,
    tags: tags || [],
    block: block || title,
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

const documentMetaSchema = z.object({
  title: z.string().trim().min(1).optional(),
  block: z.string().trim().min(1).optional(),
  areaId: z.string().trim().min(1).optional(),
});

// PATCH /api/knowledge/documents/:id/meta — rename a team, and/or move it to
// a different block/business unit. Separate from POST .../version, which is
// for content changes only. Content managers only.
router.patch('/documents/:id/meta', canManageContent, asyncRoute(async (req, res) => {
  const data = validate(documentMetaSchema, req.body);
  const ref = db.collection('knowledgeDocuments').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw { status: 404, message: 'Documento no encontrado' };
  const existing = snap.data();

  const patch = {};
  if (data.areaId !== undefined) patch.areaId = data.areaId;
  if (data.title !== undefined) patch.title = data.title;

  if (data.block !== undefined) {
    patch.block = data.block;
  } else if (data.title !== undefined && existing.block === existing.title) {
    // This team was its own standalone block (block === its old title) —
    // keep that in sync with the rename instead of leaving a stale block
    // name nothing else points to.
    patch.block = data.title;
  }

  const newTitle = patch.title !== undefined ? patch.title : existing.title;
  patch.searchTokens = computeSearchTokens({ title: newTitle, content: existing.content, tags: existing.tags });

  await ref.update(patch);
  res.json({ id: ref.id, ...existing, ...patch });
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
