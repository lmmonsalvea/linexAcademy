// One-off seed: loads the Linex Group org chart into the knowledge center as
// real structure, not demo data — one knowledgeArea per business unit, one
// knowledgeDocument per "bloque" inside it, and each document's content
// breaks down that block's own teams/leads/headcount.
//
// Idempotent by (area name, document title): re-running updates existing
// docs instead of duplicating them, since org data changes over time and
// this script doubles as "how we refresh it" going forward.
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

function renderBlockContent(bu, block) {
  const lines = [];
  lines.push(`Unidad de negocio: ${bu.name}`);
  lines.push(`Bloque: ${block.title}`);
  if (block.headcount != null) lines.push(`Personas: ${block.headcount}`);
  if (block.leader) lines.push(`Líder: ${block.leader}`);
  if (block.teams && block.teams.length) {
    lines.push('');
    lines.push('Equipos de trabajo:');
    for (const t of block.teams) {
      const parts = [t.name];
      if (t.headcount != null) parts.push(`${t.headcount} personas`);
      if (t.people) parts.push(t.people);
      lines.push(`- ${parts.join(' — ')}`);
    }
  }
  return lines.join('\n');
}

// --- Org chart data (transcribed from the current Linex Group org chart) ---

const BUSINESS_UNITS = [
  {
    name: 'Growth & Expansion',
    description: 'Crea nuevo negocio. SVP: vacante (interino: Daniel Andrés Peláez Vélez, SVP). 44 personas.',
    blocks: [
      {
        title: 'Travel Business Development',
        headcount: 31,
        leader: 'Juan Fernando Peláez Vélez (SVP)',
        teams: [
          { name: 'Travel B2B/B2C', headcount: 23, people: 'Manager: Camilo Salazar' },
          { name: 'Travel Supplier & Channel Mgmt.', headcount: 4, people: 'VP: Juan M. Pérez' },
          { name: 'Representations', headcount: 2, people: 'Lead: M. Daniela Acevedo' },
          { name: 'Travel Media', headcount: 1, people: 'Lead: Laura Montoya' },
        ],
      },
      { title: 'Client Solutions Builders', headcount: 7, leader: 'Santiago Patiño Betancur (SVP, CTO)' },
      { title: 'Partnerships', headcount: 4, leader: 'Danielle Amanda St John (Manager)' },
      { title: 'Banks', headcount: 1, leader: 'Diego Hernán Gómez Arteaga (VP)' },
    ],
  },
  {
    name: 'Business Operations',
    description: 'Opera el negocio. SVP: vacante. 93 personas.',
    blocks: [
      {
        title: 'Hosting Services',
        headcount: 14,
        leader: 'Wilmar Aguilar Castro (Manager)',
        teams: [
          { name: 'Information Security & Cybersecurity', headcount: 4 },
          { name: 'Platform & SRE', headcount: 2 },
          { name: 'Internal IT', headcount: 7, people: 'Manager: Andrés M. Estrada' },
        ],
      },
      {
        title: 'Rewards',
        headcount: 36,
        leader: 'Maira Alejandra Ruiz Garzón (Manager)',
        teams: [
          { name: 'Rewards Service Line', headcount: 26, people: 'Lead: Iván E. Toro' },
          { name: 'Rewards Operations', headcount: 6 },
          { name: 'Rewards Accounts', headcount: 3, people: 'Leads: N. Morales, J. P. David' },
        ],
      },
      { title: 'MarketPlace Operations', leader: 'Manager: vacante' },
      {
        title: 'Travel Operations',
        headcount: 42,
        leader: 'Laura María Monsalve Arroyave (Manager)',
        teams: [
          { name: 'Core Operations', headcount: 16, people: 'Leads: J. P. Murcia, W. A. Román' },
          { name: 'L1 & L2 Service Desk', headcount: 9, people: 'Lead: Liceth D. Marín' },
          { name: 'L3 Service Desk', headcount: 4 },
          { name: 'Product Operations', headcount: 6 },
          { name: 'Corporate Accounts', headcount: 3 },
          { name: 'Quality & Training', headcount: 3 },
        ],
      },
    ],
  },
  {
    name: 'Enterprise Transformation',
    description: 'Escala cómo trabaja Linex. SVP: Marla Soledad Mejía Castaño. 62 personas.',
    blocks: [
      {
        title: 'Internal Builders',
        headcount: 31,
        leader: 'Santiago Monsalve Calderón (Manager)',
        teams: [
          { name: 'Solutions Builders', people: 'Leads: L. M. Puerta, F. Zapata, Y. Guerrero, C. Reyes' },
          { name: 'Technical Management', people: 'Leads: J. C. Estrada, C. Garzón, O. Buitrago' },
        ],
      },
      {
        title: 'Enterprise Effectiveness',
        headcount: 19,
        leader: 'Julio César Franco Ardila (Manager)',
        teams: [
          { name: 'Automation QA', headcount: 13, people: 'Manager: Karen S. Jiménez' },
          { name: 'AI & Data', headcount: 4 },
          { name: 'Organizational Architecture & Transformation', headcount: 2, people: 'Manager: Simón A. Ramos' },
        ],
      },
      { title: 'Enterprise Delivery & Portfolio', headcount: 7, leader: 'María Cristina Barrios Díaz (Manager)' },
      { title: 'Marketing', headcount: 4, leader: 'Eliana María Martínez Marín (VP)' },
    ],
  },
  {
    name: 'Regional LATAM Management',
    description: 'Habilita y controla las operaciones regionales. SVP: Daniel Andrés Peláez Vélez. 63 personas.',
    blocks: [
      {
        title: 'Financial Operations',
        headcount: 39,
        leader: 'Rafael Antonio Montoya Estrada (VP)',
        teams: [
          { name: 'Billing', headcount: 19, people: 'Leads: A. Quintero, K. Vélez' },
          { name: 'Accounting', headcount: 9, people: 'Manager: S. Piedrahita' },
          { name: 'Treasury & Accounts Receivable', headcount: 5, people: 'Manager: G. Cardona' },
          { name: 'Revenue Control', headcount: 4, people: 'Lead: Karen Y. Caro' },
          { name: 'Financial Planning', headcount: 1 },
        ],
      },
      {
        title: 'Legal & Administrative',
        headcount: 17,
        leader: 'Juliana Soto Restrepo (VP)',
        teams: [
          { name: 'Human Resources', headcount: 9, people: 'Lead: Nora E. Escobar' },
          { name: 'Administrative Support', headcount: 5 },
          { name: 'Legal Affairs', headcount: 2 },
        ],
      },
      {
        title: 'Country Operations',
        headcount: 6,
        leader: 'Juan Mauricio Pérez Marín (VP)',
        teams: [
          { name: 'Peru Country Operations', headcount: 3, people: 'Lead: Itala C. Cordano' },
          { name: 'Ecuador Country Operations', headcount: 3, people: 'Lead: Elena G. Rosales' },
        ],
      },
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
    {
      title: 'Pricing & Economics',
      content: 'Gobernanza por excepción, fuera del organigrama. Decisiones de pricing, retorno y económicas materiales.',
      tags: ['gobernanza', 'pricing'],
    },
    {
      title: 'Product & Marketing Council',
      content: 'Gobernanza por excepción, fuera del organigrama. Productización oficial y portafolio comercializable.',
      tags: ['gobernanza', 'producto', 'marketing'],
    },
    {
      title: 'Architecture Council',
      content: 'Gobernanza por excepción, fuera del organigrama. Decisiones técnicas transversales y deuda estructural.',
      tags: ['gobernanza', 'arquitectura'],
    },
    {
      title: 'Executive Escalation',
      content: 'Gobernanza por excepción, fuera del organigrama. Conflictos estratégicos e inversión material.',
      tags: ['gobernanza', 'escalamiento'],
    },
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

async function upsertDocument(areaId, title, content, tags) {
  const existingSnap = await db.collection('knowledgeDocuments')
    .where('areaId', '==', areaId).where('title', '==', title).limit(1).get();

  const now = new Date().toISOString();
  const searchTokens = computeSearchTokens({ title, content, tags });

  if (!existingSnap.empty) {
    const ref = existingSnap.docs[0].ref;
    const data = existingSnap.docs[0].data();
    const newVersion = (data.currentVersion || 1) + 1;
    await ref.update({
      content,
      tags,
      searchTokens,
      currentVersion: newVersion,
      versions: [...(data.versions || []), { version: newVersion, content, updatedAt: now, updatedByUid: 'seed-script', updatedByEmail: 'seed-script' }],
    });
    console.log(`    actualizado: ${title}`);
    return;
  }

  await db.collection('knowledgeDocuments').add({
    areaId,
    title,
    content,
    tags,
    searchTokens,
    versions: [{ version: 1, content, updatedAt: now, updatedByUid: 'seed-script', updatedByEmail: 'seed-script' }],
    currentVersion: 1,
    createdAt: now,
  });
  console.log(`    creado: ${title}`);
}

async function main() {
  for (const bu of BUSINESS_UNITS) {
    console.log(`\nÁrea: ${bu.name}`);
    const areaId = await upsertArea(bu.name, bu.description);
    for (const block of bu.blocks) {
      const content = renderBlockContent(bu, block);
      const tags = ['organigrama', bu.name.toLowerCase(), block.title.toLowerCase()];
      await upsertDocument(areaId, block.title, content, tags);
    }
  }

  console.log(`\nÁrea: ${GOVERNANCE.name}`);
  const govAreaId = await upsertArea(GOVERNANCE.name, GOVERNANCE.description);
  for (const doc of GOVERNANCE.documents) {
    await upsertDocument(govAreaId, doc.title, doc.content, doc.tags);
  }

  console.log('\nListo. Organigrama cargado en el centro de conocimiento.');
}

main().catch((e) => {
  console.error('SEED FAILED:', e);
  process.exitCode = 1;
});
