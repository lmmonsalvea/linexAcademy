const express = require('express');
const { z } = require('zod');
const { db } = require('../firebaseAdmin');
const { requireRole, ROLES } = require('../middleware/auth');
const { validate } = require('../lib/validate');
const { asyncRoute } = require('../middleware/errorHandler');

const router = express.Router();

// Admin panel for assigning/changing roles — previously a documented gap
// ("no existe aún un panel de administración para asignar/cambiar roles",
// roles_permisos.md). Only Superadmin manages roles (per the permissions
// matrix: "Gestionar roles: Superadmin").
router.get('/', requireRole('superadmin'), asyncRoute(async (req, res) => {
  const snap = await db.collection('users').orderBy('email').get();
  res.json({ users: snap.docs.map((d) => ({ uid: d.id, ...d.data() })) });
}));

const roleSchema = z.object({ role: z.enum(ROLES) });

router.patch('/:uid/role', requireRole('superadmin'), asyncRoute(async (req, res) => {
  const { role } = validate(roleSchema, req.body);
  const ref = db.collection('users').doc(req.params.uid);
  const snap = await ref.get();
  if (!snap.exists) throw { status: 404, message: 'Usuario no encontrado' };

  await ref.update({ role, roleUpdatedAt: new Date().toISOString(), roleUpdatedBy: req.user.uid });
  res.json({ uid: req.params.uid, role });
}));

// Which business unit (knowledgeArea id) / block a person belongs to —
// drives which assigned courses show up in their catalog (see
// isVisibleTo() in routes/courses.js) and who gets notified of a course
// update targeted at that unit/block. Nullable: clearing a field means
// "unassigned", not "leave as-is" — send null explicitly to clear it.
const assignmentSchema = z.object({
  areaId: z.string().nullable().optional(),
  block: z.string().nullable().optional(),
});

router.patch('/:uid/assignment', requireRole('superadmin'), asyncRoute(async (req, res) => {
  const { areaId, block } = validate(assignmentSchema, req.body);
  const ref = db.collection('users').doc(req.params.uid);
  const snap = await ref.get();
  if (!snap.exists) throw { status: 404, message: 'Usuario no encontrado' };

  const patch = {};
  if (areaId !== undefined) patch.areaId = areaId;
  if (block !== undefined) patch.block = block;
  await ref.update(patch);
  res.json({ uid: req.params.uid, ...patch });
}));

module.exports = router;
