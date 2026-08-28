const { db } = require('../firebaseAdmin');

// A course with no assignment at all is open to the whole company (the
// transversal path). Otherwise, each of the three targeting levels is
// independently sufficient — assigning to an area means "everyone in that
// area", assigning to a block narrows it to that block, assigning to a
// specific team narrows it further to just that team. They're alternative
// scopes, not stacked filters: matching ANY one of them qualifies. This is
// the enrollment-eligibility test — deliberately role-blind (unlike
// courses.js's `seesEverything`, which is about catalog *visibility* for
// people managing the courses, not about who the course is actually for).
function matchesAssignment(course, user) {
  const areaIds = course.assignedAreaIds || [];
  const blocks = course.assignedBlocks || [];
  const teamIds = course.assignedTeamIds || [];
  if (areaIds.length === 0 && blocks.length === 0 && teamIds.length === 0) return true;
  if (areaIds.length && areaIds.includes(user.areaId)) return true;
  if (blocks.length && blocks.includes(user.block)) return true;
  if (teamIds.length && teamIds.includes(user.team)) return true;
  return false;
}

async function ensureEnrollment(courseId, user) {
  const ref = db.collection('courses').doc(courseId).collection('enrollments').doc(user.uid);
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set({
    uid: user.uid,
    email: user.email,
    completedModules: [],
    enrolledAt: new Date().toISOString(),
    completedAt: null,
    // Distinguishes system-assigned enrollment (via business-unit/block
    // targeting or an open/transversal course) from the old self-serve
    // POST /:id/enroll — people are handed their work path, not signing
    // themselves up.
    assignedBy: 'system',
  });
}

// Call after creating/editing a course (its assignment may have changed) —
// enrolls every currently-matching user who isn't already enrolled. Never
// un-enrolls anyone whose match lapsed, so in-progress work is never lost
// just because an assignment was narrowed later.
async function syncEnrollmentsForCourse(course) {
  const usersSnap = await db.collection('users').get();
  await Promise.all(usersSnap.docs.map((doc) => {
    const user = { uid: doc.id, ...doc.data() };
    return matchesAssignment(course, user) ? ensureEnrollment(course.id, user) : null;
  }));
}

// Call after a user's own areaId/block assignment changes, and right after
// a brand-new account auto-provisions — enrolls them into every
// currently-matching course (in particular, any open/transversal course,
// which has no assignment to match against and so applies to everyone from
// day one).
async function syncEnrollmentsForUser(user) {
  const coursesSnap = await db.collection('courses').get();
  await Promise.all(coursesSnap.docs.map((doc) => {
    const course = { id: doc.id, ...doc.data() };
    return matchesAssignment(course, user) ? ensureEnrollment(course.id, user) : null;
  }));
}

module.exports = { matchesAssignment, syncEnrollmentsForCourse, syncEnrollmentsForUser };
