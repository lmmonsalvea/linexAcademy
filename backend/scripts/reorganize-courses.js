// One-off migration:
//  1. Stamps `order` on the 8 "Formación Inicial Transversal" courses,
//     matching the module number already in their title ("Módulo N: ...").
//  2. Renumbers the 7 product-instructivo courses that stay under
//     "Instructivos de Productos" (Aéreo, Hoteles, Autos, Asistencias,
//     Parques y Cruceros, Trenes, Conecty), prefixing "Módulo N: " and
//     setting `order`.
//  3. Moves the other 4 (Pasarelas de Pago, Confronta, Odoo, Gestor de
//     Viajes) into a brand-new "Procesos Operativos" catalog, likewise
//     renumbered.
//
// Idempotent: matches by the *current* title each course already has (either
// the original un-numbered title, or the already-migrated "Módulo N: ..."
// one), so re-running is safe.
//
// Usage:
//   GOOGLE_CLOUD_PROJECT=linexrewards-app FIRESTORE_DATABASE_ID=linex-academy \
//     node scripts/reorganize-courses.js

const { db } = require('../src/firebaseAdmin');

const TRANSVERSAL_TITLE_RE = /^Módulo (\d+):/;

const PRODUCTS_CATALOG = [
  { n: 1, match: 'Aéreo', title: 'Módulo 1: Aéreo (Sabre, Amadeus, KIU, Copa Connect, NDC)' },
  { n: 2, match: 'Hoteles', title: 'Módulo 2: Hoteles' },
  { n: 3, match: 'Autos', title: 'Módulo 3: Autos (Dollar, Hertz, Localiza, Thermeon, Thrifty)' },
  { n: 4, match: 'Asistencias', title: 'Módulo 4: Asistencias (AssistViaje)' },
  { n: 5, match: 'Parques y Cruceros', title: 'Módulo 5: Parques y Cruceros (Disney, Sea World, Universal)' },
  { n: 6, match: 'Trenes', title: 'Módulo 6: Trenes' },
  { n: 7, match: 'Conecty', title: 'Módulo 7: Conecty' },
];

const OPERATIONS_CATALOG = [
  { n: 1, match: 'Pasarelas de Pago', title: 'Módulo 1: Pasarelas de Pago (Izipay, PagoLink)' },
  { n: 2, match: 'Confronta', title: 'Módulo 2: Confronta' },
  { n: 3, match: 'Odoo', title: 'Módulo 3: Odoo' },
  { n: 4, match: 'Gestor de Viajes', title: 'Módulo 4: Gestor de Viajes' },
];

async function findByTitleContaining(snap, fragment) {
  return snap.docs.find((d) => (d.data().title || '').includes(fragment) && !TRANSVERSAL_TITLE_RE.test(d.data().title));
}

async function main() {
  const snap = await db.collection('courses').get();

  console.log('Formación Inicial Transversal — stamping order from title:');
  for (const doc of snap.docs) {
    const title = doc.data().title || '';
    const match = title.match(TRANSVERSAL_TITLE_RE);
    if (match && doc.data().area === 'Formación Inicial Transversal') {
      await doc.ref.update({ order: Number(match[1]) });
      console.log(`  order=${match[1]}: ${title}`);
    }
  }

  console.log('\nInstructivos de Productos — renumbering:');
  for (const item of PRODUCTS_CATALOG) {
    const doc = await findByTitleContaining(snap, item.match);
    if (!doc) { console.log(`  (ya migrado o no encontrado) ${item.match}`); continue; }
    await doc.ref.update({ title: item.title, order: item.n, area: 'Instructivos de Productos' });
    console.log(`  Módulo ${item.n}: ${item.match} -> "${item.title}"`);
  }

  console.log('\nProcesos Operativos — moviendo y renumerando:');
  for (const item of OPERATIONS_CATALOG) {
    const doc = await findByTitleContaining(snap, item.match);
    if (!doc) { console.log(`  (ya migrado o no encontrado) ${item.match}`); continue; }
    await doc.ref.update({ title: item.title, order: item.n, area: 'Procesos Operativos' });
    console.log(`  Módulo ${item.n}: ${item.match} -> "${item.title}" (área: Procesos Operativos)`);
  }

  console.log('\nListo.');
}

main().catch((e) => {
  console.error('MIGRATION FAILED:', e);
  process.exitCode = 1;
});
