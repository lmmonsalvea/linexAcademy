const express = require('express');
const { z } = require('zod');
const { db } = require('../firebaseAdmin');
const { requireRole } = require('../middleware/auth');
const { validate } = require('../lib/validate');
const { asyncRoute } = require('../middleware/errorHandler');

const router = express.Router();

const canManageContent = requireRole('admin_area', 'superadmin');
const canManageEverything = (role) => ['admin_area', 'superadmin'].includes(role);

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

// A document defaults to "private" — visible only to people whose own
// area/block match where it lives — matching the org-chart's own grouping.
// Marking a document "public" is what makes it visible company-wide,
// bypassing that. Managers (admin_area/superadmin) always see everything,
// same as courses' `seesEverything`.
function canReadDocument(doc, user) {
  if ((doc.visibility || 'private') === 'public') return true;
  if (canManageEverything(user.role)) return true;
  return user.areaId === doc.areaId && user.block === (doc.block || doc.title);
}

function sortByOrder(items) {
  return [...items].sort((a, b) => {
    const ao = a.order ?? Infinity;
    const bo = b.order ?? Infinity;
    if (ao !== bo) return ao - bo;
    return (a.name || a.title || '').localeCompare(b.name || b.title || '');
  });
}

const areaSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  order: z.number().optional(),
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
  order: z.number().optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

const versionSchema = z.object({
  content: z.string().min(1),
});

const reorderSchema = z.object({ ids: z.array(z.string()).min(1) });

// GET /api/knowledge/areas — any authenticated user.
router.get('/areas', asyncRoute(async (req, res) => {
  const snap = await db.collection('knowledgeAreas').get();
  res.json({ areas: sortByOrder(snap.docs.map((d) => ({ id: d.id, ...d.data() }))) });
}));

// POST /api/knowledge/areas — content managers only.
router.post('/areas', canManageContent, asyncRoute(async (req, res) => {
  const { name, description, order } = validate(areaSchema, req.body);
  const doc = { name, description: description || '', order: order ?? null, blocks: [], createdAt: new Date().toISOString() };
  const ref = await db.collection('knowledgeAreas').add(doc);
  res.json({ id: ref.id, ...doc });
}));

// PUT /api/knowledge/areas/reorder — sets `order` = position in the given
// id list. Content managers only.
router.put('/areas/reorder', canManageContent, asyncRoute(async (req, res) => {
  const { ids } = validate(reorderSchema, req.body);
  const batch = db.batch();
  ids.forEach((id, i) => batch.update(db.collection('knowledgeAreas').doc(id), { order: i }));
  await batch.commit();
  res.json({ reordered: ids.length });
}));

const areaUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  order: z.number().optional(),
});

// PATCH /api/knowledge/areas/:id — rename a business unit / change its
// description or order. Content managers only.
router.patch('/areas/:id', canManageContent, asyncRoute(async (req, res) => {
  const data = validate(areaUpdateSchema, req.body);
  const ref = db.collection('knowledgeAreas').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw { status: 404, message: 'Área no encontrada' };

  const patch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.order !== undefined) patch.order = data.order;
  await ref.update(patch);
  res.json({ id: ref.id, ...snap.data(), ...patch });
}));

const blockCreateSchema = z.object({ name: z.string().trim().min(1) });

// POST /api/knowledge/areas/:id/blocks — creates an empty block/folder in
// this area (a "bloque" is just a named, ordered entry in the area's own
// `blocks` registry — teams get attached to it later by setting their own
// `block` field to this name). Content managers only.
router.post('/areas/:id/blocks', canManageContent, asyncRoute(async (req, res) => {
  const { name } = validate(blockCreateSchema, req.body);
  const ref = db.collection('knowledgeAreas').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw { status: 404, message: 'Área no encontrada' };

  const blocks = snap.data().blocks || [];
  if (blocks.some((b) => b.name === name)) throw { status: 400, message: 'Ya existe un bloque con ese nombre en esta área' };

  const nextOrder = blocks.reduce((max, b) => Math.max(max, b.order ?? 0), -1) + 1;
  const updated = [...blocks, { name, order: nextOrder }];
  await ref.update({ blocks: updated });
  res.json({ blocks: sortByOrder(updated) });
}));

const blockRenameSchema = z.object({
  oldName: z.string().trim().min(1),
  newName: z.string().trim().min(1),
});

// POST /api/knowledge/areas/:id/blocks/rename — updates the area's own
// `blocks` registry entry, bulk-updates every team (document) using the old
// name, AND cascades to every person whose own assignment pointed at that
// block (see users.js PATCH /:uid/assignment) — otherwise their assignment
// would silently point at a name nothing uses anymore. Content managers only.
router.post('/areas/:id/blocks/rename', canManageContent, asyncRoute(async (req, res) => {
  const { oldName, newName } = validate(blockRenameSchema, req.body);
  const areaRef = db.collection('knowledgeAreas').doc(req.params.id);
  const areaSnap = await areaRef.get();
  if (!areaSnap.exists) throw { status: 404, message: 'Área no encontrada' };

  const blocks = areaSnap.data().blocks || [];
  const registryBlocks = blocks.some((b) => b.name === oldName)
    ? blocks.map((b) => (b.name === oldName ? { ...b, name: newName } : b))
    : [...blocks, { name: newName, order: blocks.reduce((max, b) => Math.max(max, b.order ?? 0), -1) + 1 }];
  await areaRef.update({ blocks: registryBlocks });

  const docsSnap = await db.collection('knowledgeDocuments')
    .where('areaId', '==', req.params.id).where('block', '==', oldName).get();
  const batch = db.batch();
  docsSnap.docs.forEach((d) => batch.update(d.ref, { block: newName }));

  const usersSnap = await db.collection('users')
    .where('areaId', '==', req.params.id).where('block', '==', oldName).get();
  usersSnap.docs.forEach((d) => batch.update(d.ref, { block: newName }));

  await batch.commit();
  res.json({ renamedDocuments: docsSnap.size, renamedUsers: usersSnap.size });
}));

// PUT /api/knowledge/areas/:id/blocks/reorder — sets order = position in
// the given name list, for blocks already in (or newly added to) the
// registry. Content managers only.
router.put('/areas/:id/blocks/reorder', canManageContent, asyncRoute(async (req, res) => {
  const { names } = validate(z.object({ names: z.array(z.string()).min(1) }), req.body);
  const ref = db.collection('knowledgeAreas').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw { status: 404, message: 'Área no encontrada' };

  const existing = snap.data().blocks || [];
  const byName = new Map(existing.map((b) => [b.name, b]));
  const reordered = names.map((name, i) => ({ name, order: i, ...(byName.get(name) || {}), ...{ order: i } }));
  await ref.update({ blocks: reordered });
  res.json({ blocks: reordered });
}));

// GET /api/knowledge/areas/:id/documents — any authenticated user, minus
// private documents outside their own area/block (see canReadDocument). List
// view only — omits content/versions to keep the payload light.
router.get('/areas/:id/documents', asyncRoute(async (req, res) => {
  const snap = await db.collection('knowledgeDocuments').where('areaId', '==', req.params.id).get();
  const documents = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((doc) => canReadDocument(doc, req.user))
    .map((data) => ({
      id: data.id,
      title: data.title,
      tags: data.tags || [],
      block: data.block || data.title,
      order: data.order ?? null,
      visibility: data.visibility || 'private',
      currentVersion: data.currentVersion,
      createdAt: data.createdAt,
    }));
  res.json({ documents: sortByOrder(documents) });
}));

// GET /api/knowledge/areas/:id/blocks — any authenticated user. Reads the
// area's own `blocks` registry (source of truth for order/existence);
// merges in any block name that shows up on a document but isn't in the
// registry yet, for areas seeded before the registry existed.
router.get('/areas/:id/blocks', asyncRoute(async (req, res) => {
  const areaSnap = await db.collection('knowledgeAreas').doc(req.params.id).get();
  if (!areaSnap.exists) throw { status: 404, message: 'Área no encontrada' };
  const registry = areaSnap.data().blocks || [];

  const docsSnap = await db.collection('knowledgeDocuments').where('areaId', '==', req.params.id).get();
  const fromDocs = new Set(docsSnap.docs.map((d) => d.data().block || d.data().title));
  const knownNames = new Set(registry.map((b) => b.name));
  const merged = [...registry];
  let nextOrder = registry.reduce((max, b) => Math.max(max, b.order ?? 0), -1) + 1;
  for (const name of fromDocs) {
    if (!knownNames.has(name)) merged.push({ name, order: nextOrder++ });
  }

  res.json({ blocks: sortByOrder(merged).map((b) => b.name) });
}));

// POST /api/knowledge/areas/:id/documents — content managers only. Documents
// are published directly on write (no draft/review state machine — the old
// prototype never implemented one and roles_permisos.md only describes it
// as an aspiration).
router.post('/areas/:id/documents', canManageContent, asyncRoute(async (req, res) => {
  const { title, content, tags, block, order, visibility } = validate(documentSchema, req.body);
  const now = new Date().toISOString();
  const doc = {
    areaId: req.params.id,
    title,
    content,
    tags: tags || [],
    block: block || title,
    order: order ?? null,
    visibility: visibility || 'private',
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

// PUT /api/knowledge/areas/:id/documents/reorder — sets order = position in
// the given id list (typically all the teams within one block). Content
// managers only.
router.put('/areas/:id/documents/reorder', canManageContent, asyncRoute(async (req, res) => {
  const { ids } = validate(reorderSchema, req.body);
  const batch = db.batch();
  ids.forEach((id, i) => batch.update(db.collection('knowledgeDocuments').doc(id), { order: i }));
  await batch.commit();
  res.json({ reordered: ids.length });
}));

// GET /api/knowledge/documents/:id — any authenticated user allowed to read
// it (see canReadDocument). Full document including version history.
router.get('/documents/:id', asyncRoute(async (req, res) => {
  const snap = await db.collection('knowledgeDocuments').doc(req.params.id).get();
  if (!snap.exists) throw { status: 404, message: 'Documento no encontrado' };
  const doc = { id: snap.id, ...snap.data() };
  if (!canReadDocument(doc, req.user)) {
    throw { status: 403, message: 'Este documento es privado para otra unidad/bloque' };
  }
  res.json(doc);
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
  order: z.number().optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

// PATCH /api/knowledge/documents/:id/meta — rename a team, move it to a
// different block/business unit, reorder it, and/or change whether it's
// public (company-wide) or private (restricted to its own area/block).
// Separate from POST .../version, which is for content changes only.
// Content managers only.
router.patch('/documents/:id/meta', canManageContent, asyncRoute(async (req, res) => {
  const data = validate(documentMetaSchema, req.body);
  const ref = db.collection('knowledgeDocuments').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw { status: 404, message: 'Documento no encontrado' };
  const existing = snap.data();

  const patch = {};
  if (data.areaId !== undefined) patch.areaId = data.areaId;
  if (data.title !== undefined) patch.title = data.title;
  if (data.order !== undefined) patch.order = data.order;
  if (data.visibility !== undefined) patch.visibility = data.visibility;

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

// GET /api/knowledge/search?q= — any authenticated user, minus private
// documents outside their own area/block. Tokenized keyword search (see
// `tokenize` above for why this replaces the old regex search).
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
    .filter((doc) => canReadDocument(doc, req.user))
    .map((doc) => ({ id: doc.id, title: doc.title, areaId: doc.areaId, tags: doc.tags || [] }));

  res.json({ documents });
}));

module.exports = router;
