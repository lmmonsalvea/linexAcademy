const { db } = require('../firebaseAdmin');
const { sendMail } = require('./mailer');

// SMTP servers commonly cap recipients per message — send in batches
// instead of one call per person (keeps this cheap) or one giant BCC list.
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Who should hear about an update: everyone currently enrolled (they're
// already taking it), plus — only if the course is actually scoped to a
// business unit/block — everyone in that scope, even if not enrolled yet,
// since the update is what might get them to start it. A fully open course
// (no assignment) only notifies people already enrolled; blasting the whole
// company on every open-course edit isn't what was asked for.
async function collectRecipients(course) {
  const emails = new Set();

  const enrollSnap = await db.collection('courses').doc(course.id).collection('enrollments').get();
  enrollSnap.docs.forEach((d) => {
    const email = d.data().email;
    if (email) emails.add(email);
  });

  const areaIds = course.assignedAreaIds || [];
  const blocks = course.assignedBlocks || [];
  if (areaIds.length > 0 || blocks.length > 0) {
    let usersQuery = db.collection('users');
    if (areaIds.length > 0) {
      usersQuery = usersQuery.where('areaId', 'in', areaIds.slice(0, 30));
    }
    const usersSnap = await usersQuery.get();
    usersSnap.docs.forEach((d) => {
      const u = d.data();
      if (!u.email) return;
      if (blocks.length > 0 && !blocks.includes(u.block)) return;
      emails.add(u.email);
    });
  }

  return Array.from(emails);
}

async function notifyCourseUpdate(course) {
  const recipients = await collectRecipients(course);
  if (recipients.length === 0) return;

  const subject = `Actualización disponible en el curso: ${course.title}`;
  const text = [
    `Hay una actualización disponible en el curso "${course.title}" en linexAcademy.`,
    '',
    course.updateNote,
  ].join('\n');

  for (const batch of chunk(recipients, 90)) {
    await sendMail({ to: batch, subject, text });
  }
}

module.exports = { notifyCourseUpdate };
