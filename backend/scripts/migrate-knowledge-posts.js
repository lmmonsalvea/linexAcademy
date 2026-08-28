// One-off migration: the knowledge center used to model each team
// (knowledgeDocuments) as a single content+versions blob with one
// visibility flag. It now models a team as a plain container, with one or
// more independent `knowledgePosts` underneath it — each with its own
// content, version history, and visibility (see routes/knowledge.js).
//
// For every existing team that still has a `content` field, this creates
// one knowledgePost carrying over its title/content/tags/visibility/
// versions/currentVersion, then strips those fields off the team doc
// (which from now on is metadata-only: areaId/title/block/order).
//
// Idempotent: a team with no `content` field left (already migrated) is
// skipped.
//
// Usage:
//   GOOGLE_CLOUD_PROJECT=linexrewards-app FIRESTORE_DATABASE_ID=linex-academy \
//     node scripts/migrate-knowledge-posts.js

const { FieldValue } = require('firebase-admin/firestore');
const { db } = require('../src/firebaseAdmin');

async function main() {
  const snap = await db.collection('knowledgeDocuments').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.content === undefined) { skipped++; continue; }

    const now = new Date().toISOString();
    const post = {
      teamId: doc.id,
      areaId: data.areaId,
      block: data.block || data.title,
      title: data.title,
      content: data.content,
      tags: data.tags || [],
      order: 0,
      visibility: data.visibility || 'private',
      sharedWithEmails: [],
      searchTokens: data.searchTokens || [],
      versions: data.versions || [{
        version: 1,
        content: data.content,
        updatedAt: data.createdAt || now,
        updatedByUid: null,
        updatedByEmail: null,
      }],
      currentVersion: data.currentVersion || 1,
      createdAt: data.createdAt || now,
    };
    await db.collection('knowledgePosts').add(post);

    await doc.ref.update({
      content: FieldValue.delete(),
      tags: FieldValue.delete(),
      visibility: FieldValue.delete(),
      searchTokens: FieldValue.delete(),
      versions: FieldValue.delete(),
      currentVersion: FieldValue.delete(),
    });

    console.log(`  migrado: "${data.title}"`);
    migrated++;
  }

  console.log(`\nListo. ${migrated} equipos migrados a publicaciones, ${skipped} ya estaban migrados.`);
}

main().catch((e) => {
  console.error('MIGRATION FAILED:', e);
  process.exitCode = 1;
});
