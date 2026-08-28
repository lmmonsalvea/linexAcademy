// One-off fix: the "Gobierno Corporativo" knowledge area was seeded in
// Spanish while every other area/document in the app is in English — this
// translates it in place (area name/description + its one Spanish document)
// so the whole knowledge center is consistently English.
//
// Usage:
//   GOOGLE_CLOUD_PROJECT=linexrewards-app FIRESTORE_DATABASE_ID=linex-academy \
//     node scripts/translate-governance-area.js

const { db } = require('../src/firebaseAdmin');

function tokenize(text) {
  return Array.from(new Set((text || '').toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean)));
}

const NEW_CONTENT = [
  'Linex Group',
  '  └ Holder Holding — corporate ownership & governance entity (not an executive role)',
  '      └ Board of Directors — represents the shareholders; sets direction, capital and structural decisions',
  '          └ CEO — leads Linex Holding and reports to the Board: Philippe Stephan & Laurent Xatart',
  '',
  'Total headcount: 262 people, across 4 business units (see Growth & Expansion, Business Operations, Enterprise Transformation, Regional LATAM Management).',
].join('\n');

// The 4 business-unit areas kept their English org-chart names but got
// Spanish descriptions when seeded — translating back to the tone of the
// original org chart's own English taglines (Creates new business /
// Operates the business / Scales how Linex works / Enables and controls
// regional operations), for the same "everything in English" consistency.
const BUSINESS_UNIT_DESCRIPTIONS = {
  'Growth & Expansion': 'Creates new business. SVP: vacant (interim: Daniel Andrés Peláez Vélez, SVP). 44 people.',
  'Business Operations': 'Operates the business. SVP: vacant. 93 people.',
  'Enterprise Transformation': 'Scales how Linex works. SVP: Marla Soledad Mejía Castaño. 62 people.',
  'Regional LATAM Management': 'Enables and controls regional operations. SVP: Daniel Andrés Peláez Vélez. 63 people.',
};

async function translateBusinessUnitDescriptions() {
  for (const [name, description] of Object.entries(BUSINESS_UNIT_DESCRIPTIONS)) {
    const snap = await db.collection('knowledgeAreas').where('name', '==', name).limit(1).get();
    if (snap.empty) { console.log(`  (skip) area "${name}" not found`); continue; }
    await snap.docs[0].ref.update({ description });
    console.log(`  area description translated: ${name}`);
  }
}

async function main() {
  await translateBusinessUnitDescriptions();

  const areaSnap = await db.collection('knowledgeAreas').where('name', '==', 'Gobierno Corporativo').limit(1).get();
  if (areaSnap.empty) {
    console.log('Area "Gobierno Corporativo" not found — nothing to translate.');
    process.exit(0);
  }
  const areaRef = areaSnap.docs[0].ref;
  await areaRef.update({
    name: 'Corporate Governance',
    description: "Linex Group's governance structure, outside the operational business-unit org chart.",
  });
  console.log('Area renamed: Gobierno Corporativo -> Corporate Governance');

  const docSnap = await db.collection('knowledgeDocuments')
    .where('areaId', '==', areaRef.id).where('title', '==', 'Linex Group — estructura de gobierno').limit(1).get();
  if (docSnap.empty) {
    console.log('Governance structure document not found — skipped.');
    process.exit(0);
  }
  const docRef = docSnap.docs[0].ref;
  const data = docSnap.docs[0].data();
  const newTitle = 'Linex Group — Governance Structure';
  const newVersion = (data.currentVersion || 1) + 1;
  await docRef.update({
    title: newTitle,
    content: NEW_CONTENT,
    tags: ['governance', 'org-chart', 'ceo'],
    searchTokens: tokenize(`${newTitle} ${NEW_CONTENT} governance org-chart ceo`),
    currentVersion: newVersion,
    versions: [...(data.versions || []), {
      version: newVersion,
      content: NEW_CONTENT,
      updatedAt: new Date().toISOString(),
      updatedByUid: 'translate-script',
      updatedByEmail: 'translate-script',
    }],
  });
  console.log(`Document translated: "${data.title}" -> "${newTitle}"`);

  const OTHER_TRANSLATIONS = {
    'Pricing & Economics': 'Governance by exception, outside the org chart. Pricing, return and material economic decisions.',
    'Architecture Council': 'Governance by exception, outside the org chart. Cross-cutting technical decisions and structural debt.',
    'Executive Escalation': 'Governance by exception, outside the org chart. Strategic conflicts and material investment.',
    'Product & Marketing Council': 'Governance by exception, outside the org chart. Official productization and marketable portfolio.',
  };

  for (const [title, content] of Object.entries(OTHER_TRANSLATIONS)) {
    const snap = await db.collection('knowledgeDocuments').where('areaId', '==', areaRef.id).where('title', '==', title).limit(1).get();
    if (snap.empty) { console.log(`  (skip) "${title}" not found`); continue; }
    const ref = snap.docs[0].ref;
    const d = snap.docs[0].data();
    const v = (d.currentVersion || 1) + 1;
    await ref.update({
      content,
      searchTokens: tokenize(`${title} ${content} governance`),
      currentVersion: v,
      versions: [...(d.versions || []), { version: v, content, updatedAt: new Date().toISOString(), updatedByUid: 'translate-script', updatedByEmail: 'translate-script' }],
    });
    console.log(`  translated: "${title}"`);
  }
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exitCode = 1;
});
