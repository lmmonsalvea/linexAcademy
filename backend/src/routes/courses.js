const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const { db } = require('../firebaseAdmin');
const { requireRole } = require('../middleware/auth');
const { validate } = require('../lib/validate');
const { asyncRoute } = require('../middleware/errorHandler');
const { renderCertificate } = require('../lib/certificate');
const { notifyCourseUpdate } = require('../lib/courseNotifications');

const router = express.Router();

const MODULE_TYPES = ['video', 'pdf', 'scorm', 'quiz', 'link'];
const canManageCourses = requireRole('instructor', 'admin_area', 'superadmin');

// Who may view someone else's progress/certificate — ported from
// courses_service/index.js `canViewOtherProgress`.
const canViewOthersProgress = (role) =>
  ['instructor', 'admin_area', 'admin_rrhh', 'superadmin'].includes(role);

// Roles that manage/oversee the catalog and therefore see every course
// regardless of business-unit/block assignment.
const seesEverything = (role) =>
  ['instructor', 'admin_area', 'admin_rrhh', 'knowledge_manager', 'superadmin'].includes(role);

const moduleInputSchema = z.object({
  id: z.string().optional(),
  type: z.enum(MODULE_TYPES),
  title: z.string().trim().min(1, 'El título del módulo es obligatorio'),
  url: z.string().trim().optional().nullable(),
});

const createCourseSchema = z.object({
  title: z.string().trim().min(1, 'El título del curso es obligatorio'),
  description: z.string().trim().optional(),
  area: z.string().trim().optional().nullable(),
  modules: z.array(moduleInputSchema).optional(),
  // Which business units (knowledgeAreas ids) / blocks this course targets.
  // Empty arrays mean "open to everyone" — see isVisibleTo().
  assignedAreaIds: z.array(z.string()).optional(),
  assignedBlocks: z.array(z.string()).optional(),
});

const updateCourseSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  area: z.string().trim().optional().nullable(),
  modules: z.array(moduleInputSchema).optional(),
  assignedAreaIds: z.array(z.string()).optional(),
  assignedBlocks: z.array(z.string()).optional(),
  // Providing a non-empty updateNote is what marks this as a real "update
  // announcement": it stamps updatedAt/updateNote (shown as a badge) and
  // triggers the notification email. Editing without one is a silent fix.
  updateNote: z.string().trim().optional(),
});

const progressSchema = z.object({
  moduleId: z.string().min(1, 'Falta moduleId'),
});

function buildModule(input, order) {
  return {
    id: input.id || crypto.randomUUID(),
    type: input.type,
    title: input.title,
    url: input.url || null,
    order,
  };
}

function computeProgress(modules, completedModules) {
  const total = (modules || []).length;
  const completed = completedModules || [];
  const percent = total === 0 ? 0 : Math.round((completed.length / total) * 100);
  return { completedModules: completed, percent, totalModules: total };
}

// Course is visible to `user` if it's open to everyone (no assignment set),
// the user's own business unit/block matches, or the user has a role that
// manages/oversees the whole catalog regardless of assignment.
function isVisibleTo(course, user) {
  if (seesEverything(user.role)) return true;
  const areaIds = course.assignedAreaIds || [];
  const blocks = course.assignedBlocks || [];
  if (areaIds.length === 0 && blocks.length === 0) return true;
  if (areaIds.length && !areaIds.includes(user.areaId)) return false;
  if (blocks.length && !blocks.includes(user.block)) return false;
  return true;
}

const courseRef = (id) => db.collection('courses').doc(id);
const enrollmentRef = (courseId, uid) => courseRef(courseId).collection('enrollments').doc(uid);

async function getCourseOr404(id) {
  const snap = await courseRef(id).get();
  if (!snap.exists) throw { status: 404, message: 'Curso no encontrado' };
  return { id: snap.id, ...snap.data() };
}

function courseSummary(course) {
  return {
    id: course.id,
    title: course.title,
    description: course.description || '',
    area: course.area || null,
    modules: course.modules || [],
    assignedAreaIds: course.assignedAreaIds || [],
    assignedBlocks: course.assignedBlocks || [],
    updatedAt: course.updatedAt || null,
    updateNote: course.updateNote || null,
  };
}

// 1. Create a course.
router.post('/', canManageCourses, asyncRoute(async (req, res) => {
  const data = validate(createCourseSchema, req.body);
  const modules = (data.modules || []).map((m, i) => buildModule(m, i));
  const course = {
    title: data.title,
    description: data.description || '',
    area: data.area || null,
    modules,
    assignedAreaIds: data.assignedAreaIds || [],
    assignedBlocks: data.assignedBlocks || [],
    updatedAt: null,
    updateNote: null,
    instructorUid: req.user.uid,
    instructorEmail: req.user.email,
    createdAt: new Date().toISOString(),
  };
  const ref = await db.collection('courses').add(course);
  res.json({ id: ref.id });
}));

// 2. Catalog / "my courses" — the frontend Dashboard already depends on the
// exact shape of the `mine=true` branch, do not change it.
router.get('/', asyncRoute(async (req, res) => {
  const snap = await db.collection('courses').get();
  const courses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (req.query.mine === 'true') {
    const results = [];
    for (const course of courses) {
      const enrollSnap = await enrollmentRef(course.id, req.user.uid).get();
      if (!enrollSnap.exists) continue;
      results.push({
        ...courseSummary(course),
        progress: computeProgress(course.modules, enrollSnap.data().completedModules),
      });
    }
    return res.json({ courses: results });
  }

  // Not "my courses": only show what this user is actually allowed to take,
  // per its business-unit/block assignment (roles that manage the catalog
  // see everything — see isVisibleTo).
  const visible = courses.filter((c) => isVisibleTo(c, req.user));
  const filtered = req.query.area ? visible.filter((c) => c.area === req.query.area) : visible;
  const results = [];
  for (const course of filtered) {
    const enrollSnap = await enrollmentRef(course.id, req.user.uid).get();
    results.push({ ...courseSummary(course), enrolled: enrollSnap.exists });
  }
  res.json({ courses: results });
}));

// 3. Single course + the current user's own progress.
router.get('/:id', asyncRoute(async (req, res) => {
  const course = await getCourseOr404(req.params.id);
  const enrollSnap = await enrollmentRef(course.id, req.user.uid).get();
  const enrolled = enrollSnap.exists;
  if (!isVisibleTo(course, req.user) && !enrolled) {
    throw { status: 403, message: 'Este curso no está disponible para tu unidad de negocio o bloque' };
  }
  const completedModules = enrolled ? enrollSnap.data().completedModules || [] : [];
  res.json({
    ...courseSummary(course),
    instructorUid: course.instructorUid || null,
    instructorEmail: course.instructorEmail || null,
    // Not in the original spec's response shape, but CourseDetail.jsx needs
    // it to decide whether to show "Inscribirme" vs the progress UI — percent
    // alone can't distinguish "enrolled, 0% done" from "not enrolled".
    enrolled,
    progress: computeProgress(course.modules, completedModules),
  });
}));

// 4. Edit a course. A non-empty `updateNote` marks it as a real "update
// announcement" — stamps updatedAt/updateNote (surfaced as a badge) and
// fires the notification email in the background (doesn't block the
// response; failures are logged, never surfaced to the caller).
router.patch('/:id', canManageCourses, asyncRoute(async (req, res) => {
  const data = validate(updateCourseSchema, req.body);
  const course = await getCourseOr404(req.params.id);

  const patch = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.description !== undefined) patch.description = data.description;
  if (data.area !== undefined) patch.area = data.area;
  if (data.assignedAreaIds !== undefined) patch.assignedAreaIds = data.assignedAreaIds;
  if (data.assignedBlocks !== undefined) patch.assignedBlocks = data.assignedBlocks;
  if (data.modules !== undefined) {
    patch.modules = data.modules.map((m, i) => buildModule(m, i));
  }

  const isAnnouncement = !!(data.updateNote && data.updateNote.trim());
  if (isAnnouncement) {
    patch.updatedAt = new Date().toISOString();
    patch.updateNote = data.updateNote.trim();
  }

  await courseRef(course.id).update(patch);
  const updated = await getCourseOr404(course.id);
  res.json(courseSummary(updated));

  if (isAnnouncement) {
    notifyCourseUpdate(updated).catch((err) => console.error('notifyCourseUpdate failed:', err));
  }
}));

// 5. Append a module to an existing course.
router.post('/:id/modules', canManageCourses, asyncRoute(async (req, res) => {
  const data = validate(moduleInputSchema, req.body);
  const course = await getCourseOr404(req.params.id);
  const modules = course.modules || [];
  const newModule = buildModule(data, modules.length);
  await courseRef(course.id).update({ modules: [...modules, newModule] });
  res.json(newModule);
}));

// 6. Enroll — idempotent.
router.post('/:id/enroll', asyncRoute(async (req, res) => {
  const course = await getCourseOr404(req.params.id);
  const ref = enrollmentRef(course.id, req.user.uid);
  const snap = await ref.get();
  if (snap.exists) {
    return res.json(snap.data());
  }
  const enrollment = {
    uid: req.user.uid,
    email: req.user.email,
    completedModules: [],
    enrolledAt: new Date().toISOString(),
    completedAt: null,
  };
  await ref.set(enrollment);
  res.json(enrollment);
}));

// 7. Mark a module completed — auto-enrolls if needed (forgiving behavior
// ported from the old prototype's upsert).
router.post('/:id/progress', asyncRoute(async (req, res) => {
  const { moduleId } = validate(progressSchema, req.body);
  const course = await getCourseOr404(req.params.id);
  const modules = course.modules || [];
  if (!modules.some((m) => m.id === moduleId)) {
    throw { status: 400, message: 'El módulo no pertenece a este curso' };
  }

  const ref = enrollmentRef(course.id, req.user.uid);
  const snap = await ref.get();
  const existing = snap.exists
    ? snap.data()
    : {
        uid: req.user.uid,
        email: req.user.email,
        completedModules: [],
        enrolledAt: new Date().toISOString(),
        completedAt: null,
      };

  const completedModules = [...new Set([...(existing.completedModules || []), moduleId])];
  const isComplete = modules.length > 0 && completedModules.length === modules.length;

  await ref.set({
    ...existing,
    completedModules,
    completedAt: isComplete ? existing.completedAt || new Date().toISOString() : null,
  });

  res.json(computeProgress(modules, completedModules));
}));

// 8. View a specific user's progress.
router.get('/:id/progress/:uid', asyncRoute(async (req, res) => {
  const targetUid = req.params.uid;
  if (targetUid !== req.user.uid && !canViewOthersProgress(req.user.role)) {
    throw { status: 403, message: 'No tienes permisos para ver este progreso' };
  }
  const course = await getCourseOr404(req.params.id);
  const enrollSnap = await enrollmentRef(course.id, targetUid).get();
  const completedModules = enrollSnap.exists ? enrollSnap.data().completedModules || [] : [];
  res.json(computeProgress(course.modules, completedModules));
}));

// 9. Certificate — only once fully completed.
router.get('/:id/certificate', asyncRoute(async (req, res) => {
  const targetUid = req.query.uid || req.user.uid;
  if (targetUid !== req.user.uid && !canViewOthersProgress(req.user.role)) {
    throw { status: 403, message: 'No tienes permisos para ver este certificado' };
  }
  const course = await getCourseOr404(req.params.id);
  const modules = course.modules || [];
  const enrollSnap = await enrollmentRef(course.id, targetUid).get();
  const completedModules = enrollSnap.exists ? enrollSnap.data().completedModules || [] : [];

  if (modules.length === 0 || completedModules.length < modules.length) {
    throw { status: 403, message: 'El curso aún no está completado' };
  }

  const userSnap = await db.collection('users').doc(targetUid).get();
  const userData = userSnap.exists ? userSnap.data() : {};
  const studentName = userData.displayName || userData.email || targetUid;

  renderCertificate(res, { studentName, courseTitle: course.title, courseId: course.id });
}));

module.exports = router;
