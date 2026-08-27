const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// On Cloud Run this uses Application Default Credentials automatically — no
// service account key file, per docs/org-context.md
// (iam.disableServiceAccountKeyCreation is enforced org-wide). Locally, run
// `gcloud auth application-default login` once, or point
// GOOGLE_APPLICATION_CREDENTIALS at a local emulator config.
const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'linexrewards-app',
});

// Named database, not (default) — linexrewards-app is shared across many
// products, each with its own Firestore database (see docs/org-context.md).
const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || 'linex-academy');
const auth = getAuth(app);

module.exports = { db, auth };
