// One-off seed: turns the "Instructivos de Productos" material shared for
// Aéreo (Sabre NDC webinar, Copa Connect) into a real course.
//
// Two links could NOT be turned into real modules and are flagged below —
// re-run this after fixing them in code, or just edit the course in the app
// once it exists (Editar curso):
//   1. The Copa Connect manual PDF — only a filename was given
//      ("esp-official-manual-copa-connect-web-sprk-v1.3-ene-22-2026 (4).pdf"),
//      no URL. The module is created with an empty url as a placeholder.
//   2. The two SharePoint folder links are personal/authenticated links
//      (smartlinksdev-my.sharepoint.com/.../personal/msmejiac_...) — this
//      script can't enumerate what's inside them (no API access), so they're
//      linked as-is ("open this folder in SharePoint"). Anyone signed into
//      the same Microsoft tenant can browse them from there; if the intent
//      was one module per individual video, they need to be shared
//      separately (or added one by one via Editar curso).
//
// Usage:
//   GOOGLE_CLOUD_PROJECT=linexrewards-app FIRESTORE_DATABASE_ID=linex-academy \
//     node scripts/seed-instructivos-aereo.js

const crypto = require('crypto');
const { db } = require('../src/firebaseAdmin');

// Attributed to whoever asked for this course to be created — see
// backend/scripts/bootstrap-superadmin.js for how this account became
// superadmin.
const INSTRUCTOR_UID = 'weNyhMALPAUntNlEf2U9QvKY6hA2';
const INSTRUCTOR_EMAIL = 'lmmonsalvea@linextravel.com';

const COURSE_TITLE = 'Instructivos de Productos: Aéreo (Sabre NDC y Copa Connect)';

const MODULES = [
  {
    type: 'link',
    title: 'Webinar NDC dictado por Sabre (video)',
    url: 'https://youtu.be/RU8An6eQnLc',
  },
  {
    type: 'pdf',
    title: 'Presentación del webinar NDC — AF/KL en Sabre (PDF)',
    url: 'https://visit.sabre.com/l/687693/2026-07-24/2gwmp5/687693/1784900067TQI7VKPY/Webinar_AF_KL_NDC_en_Sabre_SP.pdf',
  },
  {
    type: 'link',
    title: 'Manual aplicativo Copa Connect (PDF) — falta el enlace, ver nota arriba',
    url: null,
  },
  {
    type: 'link',
    title: 'Tutoriales de la interfaz Copa Spark (Copa Connect)',
    url: 'https://www.copaair.com/es-gs/agencias/copa-connect/tutoriales-manual-copa-connect/tutoriales-interfaz-sprk/',
  },
  {
    type: 'link',
    title: 'Videos instructivos — Aéreo (carpeta SharePoint)',
    url: 'https://smartlinksdev-my.sharepoint.com/:f:/r/personal/msmejiac_ultragroupla_com/Documents/GoogleDrive/OPERACIONES/GENERAL%20OPERACIONES/FORMACION/INSTRUCTIVOS%20PRODUCTOS/VIDEOS%20instructivos/A%C3%A9reo?d=w9a508c1acf9543ea982056dbe4c16055&csf=1&web=1&e=A66MwN',
  },
  {
    type: 'link',
    title: 'Instructivos de productos — carpeta general (SharePoint)',
    url: 'https://smartlinksdev-my.sharepoint.com/:f:/r/personal/msmejiac_ultragroupla_com/Documents/GoogleDrive/OPERACIONES/GENERAL%20OPERACIONES/FORMACION/INSTRUCTIVOS%20PRODUCTOS?d=w1af6a3c3f89a403ea83f9762f15477ca&csf=1&web=1&e=3g2g82',
  },
];

async function main() {
  const existing = await db.collection('courses').where('title', '==', COURSE_TITLE).limit(1).get();
  if (!existing.empty) {
    console.log(`Ya existe "${COURSE_TITLE}" (${existing.docs[0].id}) — no se duplica. Edítalo desde la app si necesitas cambiar algo.`);
    process.exit(0);
  }

  const modules = MODULES.map((m, i) => ({ id: crypto.randomUUID(), order: i, url: null, ...m }));

  const ref = await db.collection('courses').add({
    title: COURSE_TITLE,
    description: 'Material de referencia para el producto Aéreo: webinar NDC de Sabre y guías del aplicativo Copa Connect.',
    area: 'Instructivos de Productos',
    modules,
    assignedAreaIds: [],
    assignedBlocks: [],
    updatedAt: null,
    updateNote: null,
    instructorUid: INSTRUCTOR_UID,
    instructorEmail: INSTRUCTOR_EMAIL,
    createdAt: new Date().toISOString(),
  });

  console.log(`Creado: ${COURSE_TITLE} (${ref.id})`);
  console.log('Pendiente: agregar el enlace real del manual de Copa Connect (módulo sin url).');
}

main().catch((e) => {
  console.error('SEED FAILED:', e);
  process.exitCode = 1;
});
