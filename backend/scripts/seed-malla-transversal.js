// One-off seed: creates the 8 courses of the "Formación Inicial Transversal
// – Compañía" curriculum as a work path open to every business unit — per
// request, this is transversal (no assignedAreaIds/assignedBlocks), so it
// shows up for everyone regardless of their unit/block assignment.
//
// Each course is created with ZERO modules — this is the curriculum
// skeleton (objective, contents, expected outcome, duration) as agreed;
// actual videos/readings/quizzes get attached later via "Editar curso" by
// whoever owns each module's content.
//
// All 8 share `area: "Formación Inicial Transversal"`, which the catalog
// already lets people filter by by clicking that chip (see Courses.jsx) —
// that's what makes them read as one path instead of 8 unrelated courses.
// Titles are numbered ("Módulo 1: ...") for the same reason, since course
// order in the catalog isn't otherwise guaranteed.
//
// Usage:
//   GOOGLE_CLOUD_PROJECT=linexrewards-app FIRESTORE_DATABASE_ID=linex-academy \
//     node scripts/seed-malla-transversal.js

const { db } = require('../src/firebaseAdmin');

const INSTRUCTOR_UID = 'weNyhMALPAUntNlEf2U9QvKY6hA2';
const INSTRUCTOR_EMAIL = 'lmmonsalvea@linextravel.com';
const AREA = 'Formación Inicial Transversal';

const MODULES = [
  {
    n: 1,
    title: 'Contexto de Países y Operación Regional',
    duration: '2 horas',
    objetivo: 'Comprender el alcance geográfico de la compañía y las particularidades operativas, regulatorias y comerciales de cada país.',
    contenidos: [
      'Países donde opera la compañía',
      'Diferencias regulatorias y operativas',
      'Medios de pago y monedas',
      'Impacto del contexto local en procesos y experiencia',
      'Casos comparativos entre países',
    ],
    resultado: 'El colaborador identifica por qué los procesos y decisiones varían según el país.',
  },
  {
    n: 2,
    title: 'Modelo Operativo y Core de Negocio',
    duration: '2.5 horas',
    objetivo: 'Entender cómo funciona el negocio y cómo la compañía genera valor e ingresos.',
    contenidos: [
      'Modelo de negocio',
      'Tipología de clientes (B2C, B2B, B2B2C)',
      'Cadena de valor del servicio',
      'Principales fuentes de ingreso y costos',
      'Rol de cada área en el negocio',
    ],
    resultado: 'El colaborador conecta su rol con los resultados del negocio.',
  },
  {
    n: 3,
    title: 'Industria Travel: Ecosistema y Funcionamiento',
    duration: '3 horas',
    objetivo: 'Comprender la industria travel como un ecosistema interconectado.',
    contenidos: [
      'Actores de la industria travel',
      'Flujo completo de una reserva',
      'Conceptos clave: tarifas, inventario, reglas, emisión',
      'Cambios, cancelaciones y reembolsos',
      'Tendencias actuales del sector',
    ],
    resultado: 'El colaborador entiende la industria más allá de su función específica.',
  },
  {
    n: 4,
    title: 'Ecosistema Tecnológico de la Compañía',
    duration: '3 horas',
    objetivo: 'Conocer las tecnologías que soportan el negocio y su impacto en la operación.',
    contenidos: [
      'Arquitectura tecnológica (alto nivel)',
      'Frontend, backend e integraciones',
      'APIs y pasarelas de pago',
      'Dependencias tecnológicas',
      'Impacto de fallas tecnológicas en el negocio',
    ],
    resultado: 'El colaborador comprende el rol de la tecnología y sus limitaciones.',
  },
  {
    n: 5,
    title: 'Aliados Estratégicos y Dependencias',
    duration: '2 horas',
    objetivo: 'Identificar el rol de los aliados en la operación del negocio.',
    contenidos: [
      'Tipos de aliados',
      'Responsabilidades compartidas',
      'SLA y niveles de servicio',
      'Dependencias operativas',
      'Casos reales de incidentes con aliados',
    ],
    resultado: 'Mayor criterio al analizar incidentes y escalamiento de problemas.',
  },
  {
    n: 6,
    title: 'Representaciones, Marcas y Lineamientos',
    duration: '1.5 horas',
    objetivo: 'Comprender las marcas que representa la compañía y los lineamientos asociados.',
    contenidos: [
      'Marcas y representaciones',
      'Rol de la compañía frente a cada marca',
      'Lineamientos de comunicación',
      'Implicaciones comerciales y legales',
      'Mensajes permitidos y no permitidos',
    ],
    resultado: 'Comunicación alineada y consistente hacia clientes y aliados.',
  },
  {
    n: 7,
    title: 'Activos Digitales',
    duration: '2 horas',
    objetivo: 'Reconocer los activos digitales como elementos críticos del negocio.',
    contenidos: [
      'Tipos de activos digitales',
      'Rol de cada activo en el customer journey',
      'Relación entre activos',
      'Riesgos operativos asociados',
      'Buenas prácticas de uso',
    ],
    resultado: 'Mayor conciencia sobre el impacto de los activos digitales en la operación.',
  },
  {
    n: 8,
    title: 'Funcionamiento General de los Sitios Web',
    duration: '2.5 horas',
    objetivo: 'Entender el flujo end-to-end desde la perspectiva del cliente.',
    contenidos: [
      'Flujo de compra completo',
      'Información visible al cliente',
      'Diferencias con vistas operativas',
      'Puntos críticos del journey',
      'Errores frecuentes y su origen',
    ],
    resultado: 'Mayor empatía con el cliente y mejor análisis de incidencias.',
  },
];

function renderDescription(m) {
  return [
    `Objetivo: ${m.objetivo}`,
    '',
    'Contenidos:',
    ...m.contenidos.map((c) => `- ${c}`),
    '',
    `Resultado esperado: ${m.resultado}`,
    `Duración: ${m.duration}`,
  ].join('\n');
}

async function upsertCourse(title, description) {
  const existing = await db.collection('courses').where('title', '==', title).limit(1).get();
  if (!existing.empty) {
    await existing.docs[0].ref.update({ description, area: AREA });
    console.log(`  actualizado: ${title}`);
    return;
  }
  await db.collection('courses').add({
    title,
    description,
    area: AREA,
    modules: [],
    assignedAreaIds: [],
    assignedBlocks: [],
    updatedAt: null,
    updateNote: null,
    instructorUid: INSTRUCTOR_UID,
    instructorEmail: INSTRUCTOR_EMAIL,
    createdAt: new Date().toISOString(),
  });
  console.log(`  creado: ${title}`);
}

async function main() {
  console.log(`Programa: Formación Inicial Transversal – Compañía (${MODULES.length} módulos, área "${AREA}")`);
  for (const m of MODULES) {
    const title = `Módulo ${m.n}: ${m.title}`;
    await upsertCourse(title, renderDescription(m));
  }
  console.log('\nListo. Cada curso quedó sin módulos de contenido (video/lectura) — agréguenlos desde "Editar curso" cuando el material esté listo.');
}

main().catch((e) => {
  console.error('SEED FAILED:', e);
  process.exitCode = 1;
});
