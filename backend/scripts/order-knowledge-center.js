// One-off migration: stamps explicit `order` on the 5 existing knowledge
// areas, builds each area's `blocks` registry (name + order) matching the
// original org-chart sequence from seed-org-chart.js, and stamps `order` on
// every team (document) within its block, same original sequence.
//
// Idempotent: re-running just re-writes the same order values.
//
// Usage:
//   GOOGLE_CLOUD_PROJECT=linexrewards-app FIRESTORE_DATABASE_ID=linex-academy \
//     node scripts/order-knowledge-center.js

const { db } = require('../src/firebaseAdmin');

const AREAS = [
  {
    order: 1,
    name: 'Growth & Expansion',
    blocks: [
      { name: 'Travel Business Development', teams: ['Travel B2B/B2C', 'Travel Supplier & Channel Mgmt.', 'Representations', 'Travel Media'] },
      { name: 'Client Solutions Builders', teams: ['Client Solutions Builders'] },
      { name: 'Partnerships', teams: ['Partnerships'] },
      { name: 'Banks', teams: ['Banks'] },
    ],
  },
  {
    order: 2,
    name: 'Business Operations',
    blocks: [
      { name: 'Hosting Services', teams: ['Information Security & Cybersecurity', 'Platform & SRE', 'Internal IT'] },
      { name: 'Rewards', teams: ['Rewards Service Line', 'Rewards Operations', 'Rewards Accounts'] },
      { name: 'MarketPlace Operations', teams: ['MarketPlace Operations'] },
      { name: 'Travel Operations', teams: ['Core Operations', 'L1 Service Desk', 'L2 Service Desk', 'L3 Service Desk', 'Product Operations', 'Corporate Accounts', 'Quality & Training'] },
    ],
  },
  {
    order: 3,
    name: 'Enterprise Transformation',
    blocks: [
      { name: 'Internal Builders', teams: ['Solutions Builders', 'Technical Management'] },
      { name: 'Enterprise Effectiveness', teams: ['Automation QA', 'AI & Data', 'Organizational Architecture & Transformation'] },
      { name: 'Enterprise Delivery & Portfolio', teams: ['Enterprise Delivery & Portfolio'] },
      { name: 'Marketing', teams: ['Marketing'] },
    ],
  },
  {
    order: 4,
    name: 'Regional LATAM Management',
    blocks: [
      { name: 'Financial Operations', teams: ['Billing', 'Accounting', 'Treasury & Accounts Receivable', 'Revenue Control', 'Financial Planning'] },
      { name: 'Legal & Administrative', teams: ['Human Resources', 'Administrative Support', 'Legal Affairs'] },
      { name: 'Country Operations', teams: ['Peru Country Operations', 'Ecuador Country Operations'] },
    ],
  },
  {
    order: 5,
    name: 'Corporate Governance',
    blocks: [
      { name: 'Linex Group — Governance Structure', teams: ['Linex Group — Governance Structure'] },
      { name: 'Executive Escalation', teams: ['Executive Escalation'] },
      { name: 'Architecture Council', teams: ['Architecture Council'] },
      { name: 'Product & Marketing Council', teams: ['Product & Marketing Council'] },
      { name: 'Pricing & Economics', teams: ['Pricing & Economics'] },
    ],
  },
];

async function main() {
  for (const areaDef of AREAS) {
    const snap = await db.collection('knowledgeAreas').where('name', '==', areaDef.name).limit(1).get();
    if (snap.empty) { console.log(`(no encontrada) ${areaDef.name}`); continue; }
    const areaRef = snap.docs[0].ref;

    const blocksRegistry = areaDef.blocks.map((b, i) => ({ name: b.name, order: i }));
    await areaRef.update({ order: areaDef.order, blocks: blocksRegistry });
    console.log(`\nÁrea "${areaDef.name}" (order=${areaDef.order}):`);

    for (let bi = 0; bi < areaDef.blocks.length; bi++) {
      const block = areaDef.blocks[bi];
      for (let ti = 0; ti < block.teams.length; ti++) {
        const teamTitle = block.teams[ti];
        const docSnap = await db.collection('knowledgeDocuments')
          .where('areaId', '==', areaRef.id).where('title', '==', teamTitle).limit(1).get();
        if (docSnap.empty) { console.log(`    (equipo no encontrado) ${teamTitle}`); continue; }
        await docSnap.docs[0].ref.update({ order: ti, block: block.name });
        console.log(`  [${block.name}] order=${ti}: ${teamTitle}`);
      }
    }
  }
  console.log('\nListo.');
}

main().catch((e) => {
  console.error('MIGRATION FAILED:', e);
  process.exitCode = 1;
});
