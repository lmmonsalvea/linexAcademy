// Dev-only helper: seeds demo content directly into Firestore (knowledge
// areas/documents, an exam question bank + template, and one course).
//
// Unlike the old prototype's seed script, this does NOT create fake user
// accounts — login is now real Microsoft/Entra ID SSO, so there's no way to
// "register" a synthetic account with a password. Real people show up in
// `users/{uid}` the first time they sign in (see src/middleware/auth.js);
// use scripts/bootstrap-superadmin.js to promote the first superadmin, then
// use the in-app Admin panel (/admin) to assign the rest.
//
// Usage:
//   GOOGLE_CLOUD_PROJECT=linexrewards-app FIRESTORE_DATABASE_ID=linex-academy \
//     node scripts/seed-demo-data.js

const { db } = require('../src/firebaseAdmin');

function searchTokensOf(...parts) {
  return [...new Set(parts.join(' ').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1))];
}

async function seedKnowledge() {
  console.log('1. Centro de conocimiento: áreas + documentos');
  const areas = [
    {
      name: 'Recursos Humanos',
      documents: [
        { title: 'Política de vacaciones', content: 'Todos los empleados tienen derecho a 15 días hábiles de vacaciones al año.' },
        { title: 'Proceso de onboarding', content: 'Guía paso a paso para el primer mes de un nuevo colaborador.' },
      ],
    },
    {
      name: 'Tecnología',
      documents: [
        { title: 'Estándares de código', content: 'Convenciones de nomenclatura, revisión de PRs y despliegue.' },
        { title: 'Política de seguridad de la información', content: 'Uso de contraseñas, VPN y manejo de datos sensibles.' },
      ],
    },
    {
      name: 'Operaciones',
      documents: [
        { title: 'Manual de atención al cliente', content: 'Protocolo de respuesta y escalamiento de casos.' },
      ],
    },
  ];

  const areaIdByName = {};
  for (const area of areas) {
    const ref = await db.collection('knowledgeAreas').add({
      name: area.name,
      description: '',
      createdAt: new Date().toISOString(),
    });
    areaIdByName[area.name] = ref.id;
    console.log(`  área creada: ${area.name} (${ref.id})`);

    for (const doc of area.documents) {
      const now = new Date().toISOString();
      const docRef = await db.collection('knowledgeDocuments').add({
        areaId: ref.id,
        title: doc.title,
        content: doc.content,
        tags: [],
        searchTokens: searchTokensOf(doc.title, doc.content),
        versions: [{ version: 1, content: doc.content, updatedAt: now, updatedByUid: 'seed-script', updatedByEmail: 'seed-script' }],
        currentVersion: 1,
        createdAt: now,
      });
      console.log(`    documento: ${doc.title} (${docRef.id})`);
    }
  }
  return areaIdByName;
}

async function seedExams() {
  console.log('\n2. Evaluaciones: banco de preguntas + plantilla');
  const questionDefs = [
    { text: '¿Cuál es la capital de Colombia?', type: 'mcq', options: ['Medellín', 'Bogotá', 'Cali', 'Cartagena'], answer: 1, tags: ['cultura_general'] },
    { text: '¿2 + 2 es igual a 4?', type: 'tf', options: ['Verdadero', 'Falso'], answer: 0, tags: ['logica'] },
    { text: '¿JavaScript es un lenguaje de programación?', type: 'tf', options: ['Verdadero', 'Falso'], answer: 0, tags: ['tecnico'] },
    { text: 'Describe brevemente qué es el trabajo en equipo para ti.', type: 'open', tags: ['habilidades_blandas'] },
  ];

  const questionIds = [];
  for (const q of questionDefs) {
    const ref = await db.collection('examQuestions').add({ ...q, createdAt: new Date().toISOString() });
    questionIds.push(ref.id);
    console.log(`  pregunta: ${q.text.slice(0, 40)}... (${ref.id})`);
  }

  const templateRef = await db.collection('examTemplates').add({
    title: 'Evaluación de onboarding',
    sections: [{ title: 'General', questionIds, weight: 100 }],
    passScore: 70,
    createdAt: new Date().toISOString(),
  });
  console.log(`  plantilla: Evaluación de onboarding (${templateRef.id})`);
  return templateRef.id;
}

async function seedCourse(areaIdByName, templateId) {
  console.log('\n3. Curso demo con módulos (vídeo, PDF, quiz)');
  const modules = [
    { id: 'mod-video', type: 'video', title: 'Bienvenida a Linex Travel', url: 'https://www.w3schools.com/html/mov_bbb.mp4', order: 0 },
    { id: 'mod-pdf', type: 'pdf', title: 'Manual del colaborador', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', order: 1 },
    { id: 'mod-quiz', type: 'quiz', title: 'Evaluación de onboarding', url: templateId, order: 2 },
  ];
  const ref = await db.collection('courses').add({
    title: 'Onboarding Linex Travel',
    description: 'Curso introductorio para nuevos colaboradores.',
    area: areaIdByName['Recursos Humanos'] || null,
    modules,
    instructorUid: 'seed-script',
    instructorEmail: 'seed-script',
    createdAt: new Date().toISOString(),
  });
  console.log(`  curso: Onboarding Linex Travel (${ref.id})`);
}

async function main() {
  const areaIdByName = await seedKnowledge();
  const templateId = await seedExams();
  await seedCourse(areaIdByName, templateId);
  console.log('\nListo. Los roles de usuario se asignan al iniciar sesión (empleado por defecto) — ver scripts/bootstrap-superadmin.js y /admin.');
}

main().catch((e) => {
  console.error('SEED FAILED:', e.message);
  process.exitCode = 1;
});
