// One-off seed: loads the REAL content of the remaining "INSTRUCTIVOS
// PRODUCTOS" SharePoint subfolders (everything besides Aéreo, which has its
// own script) into one course per product — built by actually browsing
// those folders via the Microsoft 365 SharePoint connector.
//
// Left out on purpose (flagged in the console output, not silently
// dropped):
//   - A 691MB zip in HOTELES ("wetransfer_avs-training...") — not a single
//     coherent resource to link as one module.
//   - Windows .lnk shortcut files (not real content themselves).
//   - Old superseded versions when a clearly newer one exists in the same
//     folder (e.g. Localiza's V1-V3 instructivos when V4 exists).
//   - The separate "LOOP" folder (Microsoft Loop workspace, different
//     content model — not browsed this pass) and "VIDEOS instructivos"
//     (only has an Aéreo subfolder, already covered by the Aéreo course).
//
// Idempotent by course title: re-running replaces each course's modules
// instead of duplicating it.
//
// Usage:
//   GOOGLE_CLOUD_PROJECT=linexrewards-app FIRESTORE_DATABASE_ID=linex-academy \
//     node scripts/seed-instructivos-otros-productos.js

const crypto = require('crypto');
const { db } = require('../src/firebaseAdmin');

const INSTRUCTOR_UID = 'weNyhMALPAUntNlEf2U9QvKY6hA2';
const INSTRUCTOR_EMAIL = 'lmmonsalvea@linextravel.com';
const ROOT = 'https://smartlinksdev-my.sharepoint.com/personal/msmejiac_ultragroupla_com/Documents/GoogleDrive/OPERACIONES/GENERAL OPERACIONES/FORMACION/INSTRUCTIVOS PRODUCTOS';

const AUTOS = `${ROOT}/AUTOS`;
const HOTELES = `${ROOT}/HOTELES`;
const ASSISTVIAJE_RESPALDO = `${ROOT}/ASISTENCIAS/RESPALDO/ASSISTVIAJE`;
const PARQUES = `${ROOT}/PARQUES Y CRUCEROS`;

const COURSES = [
  {
    title: 'Instructivos de Productos: Autos (Dollar, Hertz, Localiza, Thermeon, Thrifty)',
    area: 'Instructivos de Productos',
    modules: [
      { title: 'Documento de apoyo — flota estándar Estados Unidos', url: `${AUTOS}/DOCUMENTO APOYO FLOTA STANDARD ESTADOS UNIDOS.pptx` },
      { title: 'Documento de apoyo — flota estándar Europa', url: `${AUTOS}/DOCUMENTO APOYO FLOTA STANDARD EUROPA.pptx` },
      { title: 'Drop off (entrega en otra ciudad)', url: `${AUTOS}/DROP OFF.pdf` },
      { title: 'Entradas GDS — Amadeus y Sabre', url: `${AUTOS}/ENTRADAS GDS AMADEUS_SABRE.pdf` },
      { title: 'Ubicaciones mundiales — Hertz, Dollar, Thrifty', url: `${AUTOS}/Hertz_ Dollar_ Thrifty Worldwide Locations (1).xlsx` },
      { title: 'Instructivo Autos — Amadeus', url: `${AUTOS}/INSTRUCTIVO  AUTOS AMADEUS.docx.pdf` },
      { title: 'Instructivo Autos — Sabre', url: `${AUTOS}/INSTRUCTIVO DE AUTOS SABRE.docx.pdf` },
      { title: '[Dollar] Fleet Guide EE.UU. 2023', url: `${AUTOS}/DOLLAR/Dollar 2023 Inbound US Fleet Guide.pdf` },
      { title: '[Hertz] Instructivo HDT', url: `${AUTOS}/HERTZ/GP-IHDT-004 Instructivo de autos HDT V024.pdf` },
      { title: '[Hertz] Vehicle Guide Canadá 2025', url: `${AUTOS}/HERTZ/Hertz Canada Inbound Vehicle Guide 2025.pdf` },
      { title: '[Hertz] Instructivo Autos Sabre V2', url: `${AUTOS}/HERTZ/INSTRUCTIVO DE AUTOS SABRE V2.pdf` },
      { title: '[Hertz] Presentación vehículos eléctricos', url: `${AUTOS}/HERTZ/Presentación Vehiculos electricos.ppt` },
      { title: '[Hertz] Webinar Tesla', url: `${AUTOS}/HERTZ/Presentación Webinar -Tesla (1).pptx` },
      { title: '[Localiza] Capacitación (v4, vigente)', url: `${AUTOS}/LOCALIZA/Instructivo capacitacion Localiza V4.pdf` },
      { title: '[Localiza] Proceso de reserva (v5, vigente)', url: `${AUTOS}/LOCALIZA/PROCESO DE RESERVA LOCALIZA V5 (1).pdf` },
      { title: '[Localiza] Servicios adicionales en destino (v3, vigente)', url: `${AUTOS}/LOCALIZA/Servicios adicionales en destino V3 (1).pdf` },
      { title: '[Localiza] Gamas y vehículos (oficial 2023)', url: `${AUTOS}/LOCALIZA/Presentación Gamas y Vehiculos actualizado Oficial 2023.pdf` },
      { title: '[Localiza] Condiciones generales del contrato de alquiler', url: `${AUTOS}/LOCALIZA/CONDICIONES GENERALES DEL CONTRATO DE ALQUILER DE VEHÍCULOS (1).pdf` },
      { title: '[Localiza] Plantilla de cotización', url: `${AUTOS}/LOCALIZA/Plantilla cotizacion Localiza Actualizada 03-21 (2).docx` },
      { title: '[Thermeon] Instructivo México v2.0', url: `${AUTOS}/THERMEON/INSTRUCTIVO THERMEON MEXICO V_2.0.pdf` },
      { title: '[Thermeon] Grabación: capacitación (video)', url: `${AUTOS}/THERMEON/CAPACITACIÓN THERMEON-20240611_152712-Grabación de la reunión.mp4` },
      { title: '[Thermeon] Grabación: estructuración de proceso (video)', url: `${AUTOS}/THERMEON/ESTRUCTURACIÓN PROCESO THERMEON-20241031_100430-Grabación de la reunión.mp4` },
      { title: '[Thrifty] Fleet Guide EE.UU. 2023', url: `${AUTOS}/THRIFTY/Thrifty 2023 Inbound US Fleet Guide.pdf` },
    ],
  },
  {
    title: 'Instructivos de Productos: Gestor de Viajes',
    area: 'Instructivos de Productos',
    modules: [
      { title: 'Instructivo Gestor de Viajes', url: `${ROOT}/GESTOR DE VIAJES/Instructivo Gestor de viajes_.docx` },
    ],
  },
  {
    title: 'Instructivos de Productos: Pasarelas de Pago (Izipay, PagoLink)',
    area: 'Instructivos de Productos',
    modules: [
      { title: 'Manual para el usuario — Izipay', url: `${ROOT}/Pasarelas de pago/MANUAL PARA EL USUARIO IZIPAY.pdf` },
      { title: 'Manual de capacitación — PagoLink', url: `${ROOT}/Pasarelas de pago/MANUAL+DE+CAPACITACIÓN+PAGOLINK.pdf` },
    ],
  },
  {
    title: 'Instructivos de Productos: Odoo',
    area: 'Instructivos de Productos',
    modules: [
      { title: 'Guía Odoo', url: `${ROOT}/Odoo/Guia Odoo.docx` },
    ],
  },
  {
    title: 'Instructivos de Productos: Trenes',
    area: 'Instructivos de Productos',
    modules: [
      { title: 'Manual de Producto Trenes (v1.1, 2025)', url: `${ROOT}/TRENES/Manual de Producto Trenes V1.1 - 2025 (1).pdf` },
    ],
  },
  {
    title: 'Instructivos de Productos: Conecty',
    area: 'Instructivos de Productos',
    modules: [
      { title: 'Capacitación distribuidores', url: `${ROOT}/SIM/CAPACITACION DISTRIBUIDORES.pdf` },
      { title: 'Presentación Conecty', url: `${ROOT}/SIM/PRESENTACION CONECTY.pdf` },
      { title: 'Procedimiento de solicitudes (v3)', url: `${ROOT}/SIM/Procedimiento solicitudes Conecty v3.docx` },
    ],
  },
  {
    title: 'Instructivos de Productos: Confronta',
    area: 'Instructivos de Productos',
    modules: [
      { title: 'Instructivo Confronta', url: `${ROOT}/CONFRONTA/INSTRUCTIVO CONFRONTA.docx` },
    ],
  },
  {
    title: 'Instructivos de Productos: Hoteles',
    area: 'Instructivos de Productos',
    modules: [
      { title: 'Presentación de hoteles (actualizada)', url: `${HOTELES}/Actualizada - Presentación hoteles.pptx` },
      { title: 'Grabación: capacitación Expedia (video)', url: `${HOTELES}/CAPACITACIÓN EXPEDIA-20240606_151225-Grabación de la reunión.mp4` },
      { title: 'Capacitación Hoteles 2', url: `${HOTELES}/CAPACITACIÓN HOTELES 2.pptx` },
      { title: 'Instructivo Hoteles', url: `${HOTELES}/Instructivo Hoteles.pdf` },
      { title: 'Manual operativo Hoteles — Expedia (v1)', url: `${HOTELES}/Manual Operativo Hoteles Expedia V1.pdf` },
      { title: 'Presentación Hoteles (actualizada)', url: `${HOTELES}/Presentación Hoteles - Actualizada.pdf` },
      { title: 'Price (tarifas)', url: `${HOTELES}/Price.docx` },
      { title: 'Procesos operacionales — Hotelbeds', url: `${HOTELES}/Procesos Operacionales Hotelbeds.pdf` },
    ],
  },
  {
    title: 'Instructivos de Productos: Asistencias (AssistViaje)',
    area: 'Instructivos de Productos',
    modules: [
      { title: 'Portafolio AssistViaje (act. jul 2024)', url: `${ASSISTVIAJE_RESPALDO}/Portafolio Assistviaje - Act Jul 2024.pdf` },
      { title: 'Ayuda de ventas 2024 — Colombia', url: `${ASSISTVIAJE_RESPALDO}/Ayuda Ventas 2024 Colombia - Con precios act jun2024.pdf` },
      { title: 'Ayuda de ventas 2024 — Ecuador', url: `${ASSISTVIAJE_RESPALDO}/Ayuda Ventas 2024 Ecuador - Con precios act jun2024.pdf` },
      { title: 'Ayuda de ventas 2024 — Perú', url: `${ASSISTVIAJE_RESPALDO}/Ayuda Ventas 2024 Perú - Con precios act jun2024.pdf` },
      { title: 'Primas y productos AssistViaje (Ultragroup 2024)', url: `${ASSISTVIAJE_RESPALDO}/Primas y productos AssistViaje PVP Act - Ultragroup - 2024 V.1.xlsx` },
      { title: 'Instructivo de cotización y emisión (2024)', url: `${ASSISTVIAJE_RESPALDO}/INSTRUCTIVOS/Instructivo Cotizacion y Emisión Assist Viaje - Act 2024.pdf` },
      { title: 'Instructivo de cotización y emisión — Grupos (2024)', url: `${ASSISTVIAJE_RESPALDO}/INSTRUCTIVOS/Instructivo Cotizacion y Emision Grupos AssistViaje 2024.pdf` },
      { title: 'Promociones cargadas en plataforma', url: `${ASSISTVIAJE_RESPALDO}/INSTRUCTIVOS/Promociones Assistviaje - Cargadas en plataforma.pdf` },
    ],
  },
  {
    title: 'Instructivos de Productos: Parques y Cruceros (Disney, Sea World, Universal)',
    area: 'Instructivos de Productos',
    modules: [
      { title: '[Disney] My Disney Experience (guía Latam)', url: `${PARQUES}/DISNEY/DisneyLatam_MyDisneyExperienceSP (1).pdf` },
      { title: '[Disney] Manual de vinculación y reservas de parques', url: `${PARQUES}/DISNEY/Manual Vinculacion y reservas parques-1-9.pdf` },
      { title: '[Disney] Paso a paso: crear cuenta en MyDisney', url: `${PARQUES}/DISNEY/Paso a paso crear cuenta en MyDisney .pdf` },
      { title: '[Disney] Paso a paso: emisión Disney', url: `${PARQUES}/DISNEY/PASO A PASO EMISIÓN DISNEY.docx` },
      { title: '[Disney] Presentación general', url: `${PARQUES}/DISNEY/presentacion disney.pptx` },
      { title: '[Disney] Proceso de reserva — Cruceros Disney', url: `${PARQUES}/DISNEY/Proceso de reserva Cruceros Disney.docx` },
      { title: '[Disney] Transporte gratuito (buses / lancha)', url: `${PARQUES}/DISNEY/Transporte gratuito (Buses – Lancha).docx` },
      { title: '[Disney] Disney Genie — Product Overview Job Aid', url: `${PARQUES}/DISNEY/WDW Disney Genie Product Overview Job Aid - ESP 11.20.2023.pdf` },
      { title: '[Disney] WDW Overview — presentación completa', url: `${PARQUES}/DISNEY/WDW Overview Presentation - Spanish.pptx` },
      { title: '[Sea World] Presentación', url: `${PARQUES}/SEA WORLD/Sea World.pptx` },
      { title: '[Universal] Presentación', url: `${PARQUES}/UNIVERSAL/Universal.pptx` },
    ],
  },
];

async function upsertCourse(def) {
  const modules = def.modules.map((m, i) => ({ id: crypto.randomUUID(), order: i, type: 'link', title: m.title, url: m.url }));
  const description = `Contenido real extraído de la carpeta SharePoint "INSTRUCTIVOS PRODUCTOS / ${def.title.replace('Instructivos de Productos: ', '')}". ${modules.length} recurso(s).`;

  const existing = await db.collection('courses').where('title', '==', def.title).limit(1).get();
  if (!existing.empty) {
    await existing.docs[0].ref.update({ modules, description });
    console.log(`  actualizado: ${def.title} (${modules.length} módulos)`);
    return;
  }
  await db.collection('courses').add({
    title: def.title,
    description,
    area: def.area,
    modules,
    assignedAreaIds: [],
    assignedBlocks: [],
    updatedAt: null,
    updateNote: null,
    instructorUid: INSTRUCTOR_UID,
    instructorEmail: INSTRUCTOR_EMAIL,
    createdAt: new Date().toISOString(),
  });
  console.log(`  creado: ${def.title} (${modules.length} módulos)`);
}

async function main() {
  for (const def of COURSES) {
    await upsertCourse(def);
  }
  console.log('\nListo.');
  console.log('Omitido a propósito: el .zip de 691MB en Hoteles (wetransfer_avs-training...), el acceso');
  console.log('directo .lnk en Disney, versiones superadas (Localiza V1-V3), la carpeta "LOOP"');
  console.log('(otro modelo de contenido, Microsoft Loop) y "VIDEOS instructivos" (solo tenía Aéreo,');
  console.log('ya cubierto en ese curso).');
}

main().catch((e) => {
  console.error('SEED FAILED:', e);
  process.exitCode = 1;
});
