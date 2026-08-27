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

module.exports = router;
