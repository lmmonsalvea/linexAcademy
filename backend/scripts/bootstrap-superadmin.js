// One-off bootstrap: promotes a user to `superadmin`.
//
// Role-based access has a chicken-and-egg problem: everyone who signs in via
// Microsoft SSO auto-provisions as `empleado` (see
// src/middleware/auth.js), and only a `superadmin` can change roles
// (backend/src/routes/users.js). So the very first superadmin can't be set
// through the app itself — this script does it once, directly against
// Firestore.
//
// Usage (after the target person has logged in at least once, so their
// users/{uid} doc exists — if it doesn't exist yet, this creates it):
//   GOOGLE_CLOUD_PROJECT=linexrewards-app FIRESTORE_DATABASE_ID=linex-academy \
//     node scripts/bootstrap-superadmin.js someone@ultragroupla.com
//
// Requires Application Default Credentials for an account with Firestore +
// Firebase Auth access on the project (`gcloud auth application-default login`).

const { db, auth } = require('../src/firebaseAdmin');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: node scripts/bootstrap-superadmin.js <email>');
    process.exit(1);
  }

  const userRecord = await auth.getUserByEmail(email).catch(() => null);
  if (!userRecord) {
    console.error(`No existe ningún usuario de Firebase Auth con el correo ${email}. Esa persona debe iniciar sesión con Microsoft al menos una vez primero.`);
    process.exit(1);
  }

  const ref = db.collection('users').doc(userRecord.uid);
  const snap = await ref.get();

  const base = snap.exists
    ? snap.data()
    : { email, displayName: userRecord.displayName || email, createdAt: new Date().toISOString() };

  await ref.set({ ...base, role: 'superadmin', roleUpdatedAt: new Date().toISOString(), roleUpdatedBy: 'bootstrap-script' });

  console.log(`${email} (uid ${userRecord.uid}) es ahora superadmin.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
