// One-off seed: loads the Linex Group org chart into the knowledge center as
// real structure — one knowledgeArea per business unit, and one
// knowledgeDocument per "equipo de trabajo" (team), grouped by its "bloque"
// via the `block` field so the UI can show block headers within an area.
//
// Deliberately does NOT put employee names/headcounts into the documents —
// each team document is just an empty, ready-to-fill container (title +
// block), because that's where real operational content gets loaded later,
// not a copy of the org chart's people data.
//
// Idempotent by (area name, document title): re-running updates existing
// docs instead of duplicating them.
//
// Usage:
//   GOOGLE_CLOUD_PROJECT=linexrewards-app FIRESTORE_DATABASE_ID=linex-academy \
//     node scripts/seed-org-chart.js

const { db } = require('../src/firebaseAdmin');

function tokenize(text) {
  return Array.from(new Set((text || '').toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean)));
}

function computeSearchTokens({ title, content, tags }) {
  return tokenize(`${title || ''} ${content || ''} ${(tags || []).join(' ')}`);
}

function placeholderContent(teamTitle, blockTitle) {
  return blockTitle === teamTitle
    ? `Espacio del equipo "${teamTitle}". Aún sin contenido — aquí se documentará su información operativa.`
    : `Espacio del equipo "${teamTitle}", dentro del bloque "${blockTitle}". Aún sin contenido — aquí se documentará su información operativa.`;
}

// --- Org chart data: business unit -> blocks -> teams (names only) ---
// A block with no `teams` array is itself the only team (e.g. "Marketing").

const BUSINESS_UNITS = [
  {
    name: 'Growth & Expansion',
    description: 'Crea nuevo negocio. SVP: vacante (interino: Daniel Andrés Peláez Vélez, SVP). 44 personas.',
    blocks: [
      { title: 'Travel Business Development', teams: ['Travel B2B/B2C', 'Travel Supplier & Channel Mgmt.', 'Representations', 'Travel Media'] },
      { title: 'Client Solutions Builders' },
      { title: 'Partnerships' },
      { title: 'Banks' },
    ],
  },
  {
    name: 'Business Operations',
    description: 'Opera el negocio. SVP: vacante. 93 personas.',
    blocks: [
      { title: 'Hosting Services', teams: ['Information Security & Cybersecurity', 'Platform & SRE', 'Internal IT'] },
      { title: 'Rewards', teams: ['Rewards Service Line', 'Rewards Operations', 'Rewards Accounts'] },
      { title: 'MarketPlace Operations' },
      { title: 'Travel Operations', teams: ['Core Operations', 'L1 & L2 Service Desk', 'L3 Service Desk', 'Product Operations', 'Corporate Accounts', 'Quality & Training'] },
    ],
  },
  {
    name: 'Enterprise Transformation',
    description: 'Escala cómo trabaja Linex. SVP: Marla Soledad Mejía Castaño. 62 personas.',
    blocks: [
      { title: 'Internal Builders', teams: ['Solutions Builders', 'Technical Management'] },
      { title: 'Enterprise Effectiveness', teams: ['Automation QA', 'AI & Data', 'Organizational Architecture & Transformation'] },
      { title: 'Enterprise Delivery & Portfolio' },
      { title: 'Marketing' },
    ],
  },
  {
    name: 'Regional LATAM Management',
    description: 'Habilita y controla las operaciones regionales. SVP: Daniel Andrés Peláez Vélez. 63 personas.',
    blocks: [
      { title: 'Financial Operations', teams: ['Billing', 'Accounting', 'Treasury & Accounts Receivable', 'Revenue Control', 'Financial Planning'] },
      { title: 'Legal & Administrative', teams: ['Human Resources', 'Administrative Support', 'Legal Affairs'] },
      { title: 'Country Operations', teams: ['Peru Country Operations', 'Ecuador Country Operations'] },
    ],
  },
];

// Bonus context (not a business unit, but part of the same org chart): the
// corporate governance layer and the "governance by exception" bodies.
const GOVERNANCE = {
  name: 'Gobierno Corporativo',
  description: 'Estructura de gobierno de Linex Group, por fuera del organigrama operativo de unidades de negocio.',
  documents: [
    {
      title: 'Linex Group — estructura de gobierno',
      content: [
        'Linex Group',
        '  └ Holder Holding — entidad de propiedad y gobierno corporativo (no es un rol ejecutivo)',
        '      └ Board of Directors — representa a los accionistas; define dirección, capital y decisiones estructurales',
        '          └ CEO — lidera Linex Holding y reporta a la Junta: Philippe Stephan & Laurent Xatart',
        '',
        'Total de la organización: 262 personas, distribuidas en 4 unidades de negocio (ver áreas Growth & Expansion, Business Operations, Enterprise Transformation, Regional LATAM Management).',
      ].join('\n'),
      tags: ['gobierno', 'organigrama', 'ceo'],
    },
    { title: 'Pricing & Economics', content: 'Gobernanza por excepción, fuera del organigrama. Decisiones de pricing, retorno y económicas materiales.', tags: ['gobernanza', 'pricing'] },
    { title: 'Product & Marketing Council', content: 'Gobernanza por excepción, fuera del organigrama. Productización oficial y portafolio comercializable.', tags: ['gobernanza', 'producto', 'marketing'] },
    { title: 'Architecture Council', content: 'Gobernanza por excepción, fuera del organigrama. Decisiones técnicas transversales y deuda estructural.', tags: ['gobernanza', 'arquitectura'] },
    { title: 'Executive Escalation', content: 'Gobernanza por excepción, fuera del organigrama. Conflictos estratégicos e inversión material.', tags: ['gobernanza', 'escalamiento'] },
  ],
};

async function findAreaByName(name) {
  const snap = await db.collection('knowledgeAreas').where('name', '==', name).limit(1).get();
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function upsertArea(name, description) {
  const existing = await findAreaByName(name);
  if (existing) {
    await db.collection('knowledgeAreas').doc(existing.id).update({ description });
    return existing.id;
  }
  const ref = await db.collection('knowledgeAreas').add({ name, description, createdAt: new Date().toISOString() });
  return ref.id;
}

async function upsertDocument(areaId, title, content, tags, block) {
  const existingSnap = await db.collection('knowledgeDocuments')
    .where('areaId', '==', areaId).where('title', '==', title).limit(1).get();

  const now = new Date().toISOString();
  const searchTokens = computeSearchTokens({ title, content, tags });

  if (!existingSnap.empty) {
    const ref = existingSnap.docs[0].ref;
    const data = existingSnap.docs[0].data();
    await ref.update({ block, tags, searchTokens });
    console.log(`      actualizado: ${title}`);
    return;
  }

  await db.collection('knowledgeDocuments').add({
    areaId,
    title,
    content,
    tags,
    block,
    searchTokens,
    versions: [{ version: 1, content, updatedAt: now, updatedByUid: 'seed-script', updatedByEmail: 'seed-script' }],
    currentVersion: 1,
    createdAt: now,
  });
  console.log(`      creado: ${title}`);
}

async function main() {
  for (const bu of BUSINESS_UNITS) {
    console.log(`\nÁrea: ${bu.name}`);
    const areaId = await upsertArea(bu.name, bu.description);
    for (const block of bu.blocks) {
      const teamTitles = block.teams && block.teams.length ? block.teams : [block.title];
      console.log(`  Bloque: ${block.title}`);
      for (const teamTitle of teamTitles) {
        const content = placeholderContent(teamTitle, block.title);
        const tags = ['organigrama', bu.name.toLowerCase(), block.title.toLowerCase()];
        await upsertDocument(areaId, teamTitle, content, tags, block.title);
      }
    }
  }

  console.log(`\nÁrea: ${GOVERNANCE.name}`);
  const govAreaId = await upsertArea(GOVERNANCE.name, GOVERNANCE.description);
  for (const doc of GOVERNANCE.documents) {
    await upsertDocument(govAreaId, doc.title, doc.content, doc.tags, doc.title);
  }

  console.log('\nListo. Organigrama (bloques y equipos, sin nombres de personas) cargado en el centro de conocimiento.');
}

main().catch((e) => {
  console.error('SEED FAILED:', e);
  process.exitCode = 1;
});
