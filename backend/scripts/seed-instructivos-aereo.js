// One-off seed: loads the REAL content of the "INSTRUCTIVOS PRODUCTOS >
// AÉREO" SharePoint folder tree into a course — replaces the earlier
// version of this script, which only had generic links because it couldn't
// browse those folders. This version was built by actually reading them via
// the Microsoft 365 SharePoint connector (folder listings + document text).
//
// Source folders (all under .../FORMACION/INSTRUCTIVOS PRODUCTOS/):
//   - AEROLINEAS/COPA AIRLINES, AEROLINEAS/SATENA
//   - AEREO RESPALDO (+ its KIU/ and NDC/ subfolders)
// A few unrelated/misplaced files found alongside these (a commissions
// spreadsheet, an AssistViaje pricing sheet) were deliberately left out —
// they aren't Aéreo training content.
//
// Idempotent by course title: re-running replaces the modules list instead
// of duplicating the course.
//
// Usage:
//   GOOGLE_CLOUD_PROJECT=linexrewards-app FIRESTORE_DATABASE_ID=linex-academy \
//     node scripts/seed-instructivos-aereo.js

const crypto = require('crypto');
const { db } = require('../src/firebaseAdmin');

const INSTRUCTOR_UID = 'weNyhMALPAUntNlEf2U9QvKY6hA2';
const INSTRUCTOR_EMAIL = 'lmmonsalvea@linextravel.com';
const COURSE_TITLE = 'Instructivos de Productos: Aéreo (Sabre, Amadeus, KIU, Copa Connect, NDC)';

const AEREO_RESPALDO = 'https://smartlinksdev-my.sharepoint.com/personal/msmejiac_ultragroupla_com/Documents/GoogleDrive/OPERACIONES/GENERAL OPERACIONES/FORMACION/INSTRUCTIVOS PRODUCTOS/AEREO RESPALDO';
const KIU_DIR = `${AEREO_RESPALDO}/KIU`;
const NDC_DIR = `${AEREO_RESPALDO}/NDC`;
const COPA_DIR = 'https://smartlinksdev-my.sharepoint.com/personal/msmejiac_ultragroupla_com/Documents/GoogleDrive/OPERACIONES/GENERAL OPERACIONES/FORMACION/INSTRUCTIVOS PRODUCTOS/AEROLINEAS/COPA AIRLINES';
const SATENA_DIR = 'https://smartlinksdev-my.sharepoint.com/personal/msmejiac_ultragroupla_com/Documents/GoogleDrive/OPERACIONES/GENERAL OPERACIONES/FORMACION/INSTRUCTIVOS PRODUCTOS/AEROLINEAS/SATENA';

const MODULES = [
  // Sabre
  { title: '[Sabre] Instructivo general — comandos, cotización, emisión', url: `${AEREO_RESPALDO}/INSTRUCTIVO SABRE. V4.docx`, note: 'Versión vigente (v4, sep. 2024): malas prácticas, teclas básicas, disponibilidad, cotización, PNR, emisión, formas de pago, anulación.' },
  { title: '[Sabre] Proceso operativo: cambios voluntarios', url: `${AEREO_RESPALDO}/Proceso operativo cambios voluntarios Sabre.pdf` },
  { title: '[Sabre] Revisados automáticos', url: `${AEREO_RESPALDO}/Revisados Sabre.pptx`, note: 'Cómo se generan los revisados automáticos según condiciones de tarifa (categoría 31 - penalidades).' },
  { title: '[Sabre] Grabación: webinar de cambios en Sabre', url: `${AEREO_RESPALDO}/cambios sabre-20240710_154200-Grabación de la reunión.mp4` },
  // Amadeus
  { title: '[Amadeus] Instructivo general — comandos, cotización, emisión', url: `${AEREO_RESPALDO}/INSTRUCTIVO AMADEUS. V2 (2).pdf` },
  { title: '[Amadeus] Cambios automáticos', url: `${AEREO_RESPALDO}/_CAMBIOS EN  AMADEUS (1).pptx`, note: 'Cambios automáticos según condiciones de tarifa (categoría 31 - penalidades).' },
  // Ancillary / EMD
  { title: "[EMD] Instructivo EMD's — servicios adicionales", url: `${AEREO_RESPALDO}/INSTRUCTIVO EMD's V.2.pptx` },
  { title: '[BGR] Instructivo BGR Copago', url: `${AEREO_RESPALDO}/INSTRUCTIVO BGR COPAGO.docx` },
  // KIU / Satena
  { title: '[KIU/Satena] Instructivo Satena-KIU', url: `${KIU_DIR}/INSTRUCTIVO SATENA-KIU.docx` },
  { title: '[KIU/Satena] Manual KIU de agencias 2.0', url: `${KIU_DIR}/KIU MANUAL DE AGENCIAS 2.0.pdf` },
  { title: '[KIU/Satena] Manual KIU NR (Easyfly)', url: `${KIU_DIR}/MANUAL KIU NR.docx (1).pdf`, note: 'Cómo ingresar y operar en KIU RES para Easyfly.' },
  { title: '[KIU/Satena] Circular 005 — contacto de emergencia obligatorio', url: `${KIU_DIR}/Circular 005 Comando obligatorio contacto de emergencia..pdf` },
  { title: '[KIU/Satena] Circular 0010-2021 — cambio de comando para emisiones online', url: `${KIU_DIR}/Circular No. 0010-2021  Cambio de comando para emisiones ON LINE.pdf` },
  { title: '[Satena] Condiciones comerciales públicas (vigentes 2024)', url: `${SATENA_DIR}/CT Publicas - Vigentes a partir del 01-09-2024 - Sin firma.pdf` },
  { title: '[Satena] Condiciones comerciales públicas (vigentes 2025)', url: `${SATENA_DIR}/CT-Publicas-WEB-Vigentes-partir-15-05-2025.pdf` },
  // Copa Connect
  { title: '[Copa Connect] Manual oficial Copa Connect (Web Spark)', url: `${COPA_DIR}/esp-copa-connect-web-sprk-v11-14-oct-2024.pdf`, note: 'Manual oficial del aplicativo Copa Connect / Spark.' },
  { title: '[Copa Connect] Asignación y emisión de asientos', url: `${COPA_DIR}/Asignación y emisión de asientos en Copa Connect.pdf` },
  { title: '[Copa Connect] Infografía: asignación y emisión de asientos', url: `${COPA_DIR}/ESP Infografia - Asignación y Emisión Asientos Copa Connect.pdf` },
  { title: '[Copa Connect] Guía general del aplicativo', url: `${NDC_DIR}/COPA CONNECT.docx` },
  { title: '[Copa Connect] Instructivo Spark — Copa comercial', url: `${NDC_DIR}/INSTRUCTIVO SPARK COPA COMERCIAL (1).docx` },
  { title: '[Copa Connect] Tutoriales de la interfaz Spark (sitio oficial Copa)', url: 'https://www.copaair.com/es-gs/agencias/copa-connect/tutoriales-manual-copa-connect/tutoriales-interfaz-sprk/' },
  // NDC por aerolínea
  { title: '[NDC] Latam NDC', url: `${NDC_DIR}/Latam NDC.docx` },
  { title: '[NDC] Avianca (AV) NDC en Sabre', url: `${NDC_DIR}/NDC AV Sabre (3).pdf` },
  { title: '[NDC] Netactica', url: `${NDC_DIR}/Netactica.docx` },
  { title: '[NDC] Proceso aerolínea JetSmart', url: `${NDC_DIR}/PROCESO AEROLÍNEA JETSMART.docx`, note: 'Aerolínea low cost — proceso operativo específico.' },
  { title: '[NDC] Proceso aerolínea Wingo', url: `${NDC_DIR}/PROCESO AEROLINEA WINGO.docx` },
  { title: 'Webinar NDC dictado por Sabre (video)', url: 'https://youtu.be/RU8An6eQnLc' },
  { title: 'Presentación del webinar NDC — AF/KL en Sabre (PDF)', url: 'https://visit.sabre.com/l/687693/2026-07-24/2gwmp5/687693/1784900067TQI7VKPY/Webinar_AF_KL_NDC_en_Sabre_SP.pdf' },
];

async function main() {
  const modules = MODULES.map((m, i) => ({
    id: crypto.randomUUID(),
    order: i,
    type: 'link',
    title: m.note ? `${m.title} — ${m.note}` : m.title,
    url: m.url,
  }));

  const existing = await db.collection('courses').where('title', '==', COURSE_TITLE).limit(1).get();
  const description = `Contenido real extraído de la carpeta SharePoint "INSTRUCTIVOS PRODUCTOS / Aéreo": instructivos de Sabre, Amadeus, KIU/Satena, Copa Connect y NDC por aerolínea (Latam, Avianca, JetSmart, Wingo). ${modules.length} recursos.`;

  if (!existing.empty) {
    await existing.docs[0].ref.update({ modules, description });
    console.log(`Actualizado: "${COURSE_TITLE}" (${existing.docs[0].id}) con ${modules.length} módulos reales.`);
  } else {
    const ref = await db.collection('courses').add({
      title: COURSE_TITLE,
      description,
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
    console.log(`Creado: "${COURSE_TITLE}" (${ref.id}) con ${modules.length} módulos reales.`);
  }

  console.log('\nOmitidos deliberadamente (no son contenido de formación de Aéreo):');
  console.log('  - COMISION AEROLINEAS .xlsx (referencia financiera interna)');
  console.log('  - Primas y productos AssistViaje...xlsx (producto distinto, archivo mal ubicado en la carpeta)');
}

main().catch((e) => {
  console.error('SEED FAILED:', e);
  process.exitCode = 1;
});
