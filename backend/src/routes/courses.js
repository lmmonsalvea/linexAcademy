const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const { db } = require('../firebaseAdmin');
const { requireRole } = require('../middleware/auth');
const { validate } = require('../lib/validate');
const { asyncRoute } = require('../middleware/errorHandler');
const { renderCertificate } = require('../lib/certificate');
const { notifyCourseUpdate } = require('../lib/courseNotifications');
const { syncEnrollmentsForCourse, matchesAssignment } = require('../lib/enrollmentSync');

const router = express.Router();

const MODULE_TYPES = ['video', 'pdf', 'scorm', 'quiz', 'link'];
const canManageCourses = requireRole('instructor', 'admin_area', 'superadmin');

// Who may view someone else's progress/certificate — ported from
// courses_service/index.js `canViewOtherProgress`.
const canViewOthersProgress = (role) =>
  ['instructor', 'admin_area', 'superadmin'].includes(role);

// Roles that manage/oversee the catalog and therefore see every course
// regardless of business-unit/block assignment.
const seesEverything = (role) =>
  ['instructor', 'admin_area', 'superadmin'].includes(role);

const moduleInputSchema = z.object({
  id: z.string().optional(),
  type: z.enum(MODULE_TYPES),
  title: z.string().trim().min(1, 'El título del módulo es obligatorio'),
  url: z.string().trim().optional().nullable(),
  // A hidden module stays in the course (editable, re-showable) but is
  // dropped from the modules array served to anyone who isn't managing the
  // catalog, and excluded from progress/certificate requirements for
  // everyone — see activeModules()/visibleModulesFor() below.
  hidden: z.boolean().optional(),
});

const createCourseSchema = z.object({
  title: z.string().trim().min(1, 'El título del curso es obligatorio'),
  description: z.string().trim().optional(),
  area: z.string().trim().optional().nullable(),
  modules: z.array(moduleInputSchema).optional(),
  // Which business units / blocks / specific teams (knowledgeAreas ids,
  // block names, knowledgeDocuments ids) this course targets. Each is an
  // independently-sufficient scope (see matchesAssignment in
  // lib/enrollmentSync.js) — all three empty means "open to everyone".
  assignedAreaIds: z.array(z.string()).optional(),
  assignedBlocks: z.array(z.string()).optional(),
  assignedTeamIds: z.array(z.string()).optional(),
  order: z.number().optional(),
});

const updateCourseSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  area: z.string().trim().optional().nullable(),
  modules: z.array(moduleInputSchema).optional(),
  assignedAreaIds: z.array(z.string()).optional(),
  assignedBlocks: z.array(z.string()).optional(),
  assignedTeamIds: z.array(z.string()).optional(),
  order: z.number().optional(),
  // Providing a non-empty updateNote is what marks this as a real "update
  // announcement": it stamps updatedAt/updateNote (shown as a badge) and
  // triggers the notification email. Editing without one is a silent fix.
  updateNote: z.string().trim().optional(),
});

const reorderSchema = z.object({ ids: z.array(z.string()).min(1) });

const progressSchema = z.object({
  moduleId: z.string().min(1, 'Falta moduleId'),
});

function buildModule(input, order) {
  return {
    id: input.id || crypto.randomUUID(),
    type: input.type,
    title: input.title,
    url: input.url || null,
    hidden: !!input.hidden,
    order,
  };
}

// Hidden modules never count toward progress/certificate requirements, for
// anyone — "hidden" means "not currently part of the course", not "hidden
// but still mandatory".
function activeModules(course) {
  return (course.modules || []).filter((m) => !m.hidden);
}

// What a given role is allowed to see in the modules array itself: managing
// roles get everything (incl. hidden, so they can toggle it back), everyone
// else only ever sees the active ones.
function visibleModulesFor(course, role) {
  return seesEverything(role) ? (course.modules || []) : activeModules(course);
}

function computeProgress(modules, completedModules) {
  const total = (modules || []).length;
  const completed = completedModules || [];
  const percent = total === 0 ? 0 : Math.round((completed.length / total) * 100);
  return { completedModules: completed, percent, totalModules: total };
}

// Course is visible to `user` if it's open to everyone (no assignment set),
// the user's own business unit/block/team matches (see matchesAssignment),
// or the user has a role that manages/oversees the whole catalog regardless
// of assignment.
function isVisibleTo(course, user) {
  return seesEverything(user.role) || matchesAssignment(course, user);
}

const courseRef = (id) => db.collection('courses').doc(id);
const enrollmentRef = (courseId, uid) => courseRef(courseId).collection('enrollments').doc(uid);

async function getCourseOr404(id) {
  const snap = await courseRef(id).get();
  if (!snap.exists) throw { status: 404, message: 'Curso no encontrado' };
  return { id: snap.id, ...snap.data() };
}

function courseSummary(course, role) {
  return {
    id: course.id,
    title: course.title,
    description: course.description || '',
    area: course.area || null,
    modules: visibleModulesFor(course, role),
    assignedAreaIds: course.assignedAreaIds || [],
    assignedBlocks: course.assignedBlocks || [],
    assignedTeamIds: course.assignedTeamIds || [],
    order: course.order ?? null,
    updatedAt: course.updatedAt || null,
    updateNote: course.updateNote || null,
  };
}

// Explicit `order` first (ascending), undefined/null last, title as a
// stable tiebreaker — keeps a numbered path ("Módulo 1", "Módulo 2", ...)
// in the sequence it was given rather than Firestore's arbitrary order.
function sortByOrder(courses) {
  return [...courses].sort((a, b) => {
    const ao = a.order ?? Infinity;
    const bo = b.order ?? Infinity;
    if (ao !== bo) return ao - bo;
    return (a.title || '').localeCompare(b.title || '');
  });
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
    assignedTeamIds: data.assignedTeamIds || [],
    order: data.order ?? null,
    updatedAt: null,
    updateNote: null,
    instructorUid: req.user.uid,
    instructorEmail: req.user.email,
    createdAt: new Date().toISOString(),
  };
  const ref = await db.collection('courses').add(course);
  res.json({ id: ref.id });

  // Fire-and-forget: a brand-new course with no assignment is open to
  // everyone (the transversal case), so this is what actually hands it out
  // as a work path on creation, not just on later edits.
  syncEnrollmentsForCourse({ id: ref.id, ...course }).catch((err) => console.error('syncEnrollmentsForCourse failed:', err));
}));

// 2. Catalog / "my courses" — the frontend Dashboard already depends on the
// exact shape of the `mine=true` branch, do not change it.
router.get('/', asyncRoute(async (req, res) => {
  const snap = await db.collection('courses').get();
  const courses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (req.query.mine === 'true') {
    const results = [];
    for (const course of sortByOrder(courses)) {
      const enrollSnap = await enrollmentRef(course.id, req.user.uid).get();
      if (!enrollSnap.exists) continue;
      results.push({
        ...courseSummary(course, req.user.role),
        progress: computeProgress(activeModules(course), enrollSnap.data().completedModules),
      });
    }
    return res.json({ courses: results });
  }

  // Not "my courses": only show what this user is actually allowed to take,
  // per its business-unit/block/team assignment (roles that manage the
  // catalog see everything — see isVisibleTo).
  const visible = sortByOrder(courses.filter((c) => isVisibleTo(c, req.user)));
  const filtered = req.query.area ? visible.filter((c) => c.area === req.query.area) : visible;
  const results = [];
  for (const course of filtered) {
    const enrollSnap = await enrollmentRef(course.id, req.user.uid).get();
    results.push({ ...courseSummary(course, req.user.role), enrolled: enrollSnap.exists });
  }
  res.json({ courses: results });
}));

// Reorder courses (typically within one `area` catalog at a time) — sets
// `order` = position in the given id list. Managing roles only.
router.put('/reorder', canManageCourses, asyncRoute(async (req, res) => {
  const { ids } = validate(reorderSchema, req.body);
  const batch = db.batch();
  ids.forEach((id, i) => batch.update(courseRef(id), { order: i }));
  await batch.commit();
  res.json({ reordered: ids.length });
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
    ...courseSummary(course, req.user.role),
    instructorUid: course.instructorUid || null,
    instructorEmail: course.instructorEmail || null,
    // `enrolled` used to gate a self-serve "Inscribirme" button; enrollment
    // is now assigned automatically (see enrollmentSync.js), but the field
    // stays since CourseDetail.jsx still uses it to tell "assigned to me,
    // 0% done" apart from "not assigned to me at all".
    enrolled,
    progress: computeProgress(activeModules(course), completedModules),
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
  if (data.assignedTeamIds !== undefined) patch.assignedTeamIds = data.assignedTeamIds;
  if (data.order !== undefined) patch.order = data.order;
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
  res.json(courseSummary(updated, req.user.role));

  if (isAnnouncement) {
    notifyCourseUpdate(updated).catch((err) => console.error('notifyCourseUpdate failed:', err));
  }
  // The assignment may have changed — hand the course out to anyone newly
  // in scope. Cheap/idempotent enough to just always run on edit.
  syncEnrollmentsForCourse(updated).catch((err) => console.error('syncEnrollmentsForCourse failed:', err));
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
  const active = activeModules(course);
  const isComplete = active.length > 0 && active.every((m) => completedModules.includes(m.id));

  await ref.set({
    ...existing,
    completedModules,
    completedAt: isComplete ? existing.completedAt || new Date().toISOString() : null,
  });

  res.json(computeProgress(active, completedModules));
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
  res.json(computeProgress(activeModules(course), completedModules));
}));

// 9. Certificate — only once fully completed.
router.get('/:id/certificate', asyncRoute(async (req, res) => {
  const targetUid = req.query.uid || req.user.uid;
  if (targetUid !== req.user.uid && !canViewOthersProgress(req.user.role)) {
    throw { status: 403, message: 'No tienes permisos para ver este certificado' };
  }
  const course = await getCourseOr404(req.params.id);
  const modules = activeModules(course);
  const enrollSnap = await enrollmentRef(course.id, targetUid).get();
  const completedModules = enrollSnap.exists ? enrollSnap.data().completedModules || [] : [];

  if (modules.length === 0 || !modules.every((m) => completedModules.includes(m.id))) {
    throw { status: 403, message: 'El curso aún no está completado' };
  }

  const userSnap = await db.collection('users').doc(targetUid).get();
  const userData = userSnap.exists ? userSnap.data() : {};
  const studentName = userData.displayName || userData.email || targetUid;

  renderCertificate(res, { studentName, courseTitle: course.title, courseId: course.id });
}));

module.exports = router;
