const express = require('express');
const { z } = require('zod');
const { db, auth } = require('../firebaseAdmin');
const { requireRole, ROLES } = require('../middleware/auth');
const { validate } = require('../lib/validate');
const { asyncRoute } = require('../middleware/errorHandler');
const { syncEnrollmentsForUser } = require('../lib/enrollmentSync');

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

const POSITION_TITLES = ['lead', 'manager', 'vp', 'svp'];

// Which business unit (knowledgeArea id) / block / specific team
// (knowledgeDocument id) a person belongs to — drives which assigned
// courses show up in their catalog (see matchesAssignment in
// lib/enrollmentSync.js) and who gets notified of a course update targeted
// at that scope. `positionTitle` records their level in the org chart
// (Lead/Manager/VP/SVP) — informational, not an access-control field.
// Nullable: clearing a field means "unassigned", not "leave as-is" — send
// null explicitly to clear it.
const assignmentSchema = z.object({
  areaId: z.string().nullable().optional(),
  block: z.string().nullable().optional(),
  team: z.string().nullable().optional(),
  positionTitle: z.enum(POSITION_TITLES).nullable().optional(),
});

router.patch('/:uid/assignment', requireRole('superadmin'), asyncRoute(async (req, res) => {
  const { areaId, block, team, positionTitle } = validate(assignmentSchema, req.body);
  const ref = db.collection('users').doc(req.params.uid);
  const snap = await ref.get();
  if (!snap.exists) throw { status: 404, message: 'Usuario no encontrado' };

  const patch = {};
  if (areaId !== undefined) patch.areaId = areaId;
  if (block !== undefined) patch.block = block;
  if (team !== undefined) patch.team = team;
  if (positionTitle !== undefined) patch.positionTitle = positionTitle;
  await ref.update(patch);
  res.json({ uid: req.params.uid, ...patch });

  // Hand out (or newly qualify for) whatever courses now match this
  // person's unit/block — see enrollmentSync.js.
  const updatedSnap = await ref.get();
  syncEnrollmentsForUser({ uid: req.params.uid, ...updatedSnap.data() })
    .catch((err) => console.error('syncEnrollmentsForUser failed:', err));
}));

const statusSchema = z.object({ disabled: z.boolean() });

// Inactivar/reactivar: blocks sign-in in Firebase Auth (the `disabled` check
// in middleware/auth.js reads Firestore fresh on every request, so this
// takes effect on the account's very next call) without losing their data —
// unlike delete, this is reversible.
router.patch('/:uid/status', requireRole('superadmin'), asyncRoute(async (req, res) => {
  if (req.params.uid === req.user.uid) {
    throw { status: 400, message: 'No puedes inactivar tu propia cuenta' };
  }
  const { disabled } = validate(statusSchema, req.body);
  const ref = db.collection('users').doc(req.params.uid);
  const snap = await ref.get();
  if (!snap.exists) throw { status: 404, message: 'Usuario no encontrado' };

  await auth.updateUser(req.params.uid, { disabled });
  await ref.update({ disabled });
  res.json({ uid: req.params.uid, disabled });
}));

// Permanent delete — removes both the Firebase Auth account (so they can't
// sign back in and auto-reprovision) and this app's own record.
router.delete('/:uid', requireRole('superadmin'), asyncRoute(async (req, res) => {
  if (req.params.uid === req.user.uid) {
    throw { status: 400, message: 'No puedes eliminar tu propia cuenta' };
  }
  const ref = db.collection('users').doc(req.params.uid);
  const snap = await ref.get();
  if (!snap.exists) throw { status: 404, message: 'Usuario no encontrado' };

  await auth.deleteUser(req.params.uid).catch((err) => {
    // Already gone from Firebase Auth (e.g. deleted directly in console
    // before) shouldn't block cleaning up our own leftover record.
    if (err.code !== 'auth/user-not-found') throw err;
  });
  await ref.delete();
  res.json({ uid: req.params.uid, deleted: true });
}));

module.exports = router;
