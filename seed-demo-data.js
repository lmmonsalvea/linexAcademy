// Dev-only helper: seeds demo users (one per role), knowledge areas/documents,
// an exams question bank + template, and a course — against the locally running services.
// Usage: node seed-demo-data.js   (requires auth_service, knowledge_center, exams_service and courses_service running)

const AUTH = 'http://localhost:5000';
const KNOWLEDGE = 'http://localhost:3000';
const EXAMS = 'http://localhost:4000';
const COURSES = 'http://localhost:7000';
const PASSWORD = 'Demo1234';

const USERS = [
  { email: 'empleado@ultragroupla.com', name: 'Elena Empleado', role: 'empleado' },
  { email: 'instructor@ultragroupla.com', name: 'Iván Instructor', role: 'instructor' },
  { email: 'admin.area@ultragroupla.com', name: 'Ana Admin Área', role: 'admin_area' },
  { email: 'admin.rrhh@ultragroupla.com', name: 'Roberto Admin RRHH', role: 'admin_rrhh' },
  { email: 'knowledge.manager@ultragroupla.com', name: 'Karen Knowledge Manager', role: 'knowledge_manager' },
  { email: 'superadmin@ultragroupla.com', name: 'Sara Superadmin', role: 'superadmin' }
];

async function registerAndLogin(user) {
  let res = await fetch(`${AUTH}/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...user, password: PASSWORD })
  });
  let body = await res.json();
  if (res.status === 409) {
    console.log(`  ${user.email} ya existía, solo inicio sesión`);
  } else if (!res.ok) {
    throw new Error(`register ${user.email} -> ${res.status} ${JSON.stringify(body)}`);
  } else {
    await fetch(`${AUTH}/verify?token=${body.verifyToken}`);
    console.log(`  creado + verificado: ${user.email} (${user.role})`);
  }
  res = await fetch(`${AUTH}/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: PASSWORD })
  });
  body = await res.json();
  if (!res.ok) throw new Error(`login ${user.email} -> ${res.status} ${JSON.stringify(body)}`);
  return body.token;
}

async function main() {
  console.log('1. Usuarios demo (uno por rol, password para todos: ' + PASSWORD + ')');
  const tokens = {};
  for (const u of USERS) tokens[u.role] = await registerAndLogin(u);

  const auth = role => ({ authorization: `Bearer ${tokens[role]}` });

  console.log('\n2. Centro de conocimiento: áreas + documentos');
  const areas = [
    { name: 'Recursos Humanos', documents: [
      { title: 'Política de vacaciones', content: 'Todos los empleados tienen derecho a 15 días hábiles de vacaciones al año...' },
      { title: 'Proceso de onboarding', content: 'Guía paso a paso para el primer mes de un nuevo colaborador...' }
    ]},
    { name: 'Tecnología', documents: [
      { title: 'Estándares de código', content: 'Convenciones de nomenclatura, revisión de PRs y despliegue...' },
      { title: 'Política de seguridad de la información', content: 'Uso de contraseñas, VPN y manejo de datos sensibles...' }
    ]},
    { name: 'Operaciones', documents: [
      { title: 'Manual de atención al cliente', content: 'Protocolo de respuesta y escalamiento de casos...' }
    ]}
  ];
  for (const area of areas) {
    let res = await fetch(`${KNOWLEDGE}/areas`, {
      method: 'POST', headers: { 'content-type': 'application/json', ...auth('knowledge_manager') },
      body: JSON.stringify({ name: area.name })
    });
    const { id: areaId } = await res.json();
    console.log(`  área creada: ${area.name} (${areaId})`);
    for (const doc of area.documents) {
      res = await fetch(`${KNOWLEDGE}/areas/${areaId}/documents`, {
        method: 'POST', headers: { 'content-type': 'application/json', ...auth('knowledge_manager') },
        body: JSON.stringify({ title: doc.title, content: doc.content, author: 'knowledge.manager@ultragroupla.com' })
      });
      const d = await res.json();
      console.log(`    documento: ${doc.title} (${d.id})`);
    }
  }

  console.log('\n3. Evaluaciones: banco de preguntas + plantilla');
  const questionDefs = [
    { text: '¿Cuál es la capital de Colombia?', type: 'mcq', options: ['Medellín', 'Bogotá', 'Cali', 'Cartagena'], answer: 1, tags: ['cultura_general'] },
    { text: '¿2 + 2 es igual a 4?', type: 'tf', options: ['Verdadero', 'Falso'], answer: 0, tags: ['logica'] },
    { text: '¿JavaScript es un lenguaje de programación?', type: 'tf', options: ['Verdadero', 'Falso'], answer: 0, tags: ['tecnico'] },
    { text: 'Describe brevemente qué es el trabajo en equipo para ti.', type: 'open', tags: ['habilidades_blandas'] }
  ];
  const questionIds = [];
  for (const q of questionDefs) {
    const res = await fetch(`${EXAMS}/questions`, {
      method: 'POST', headers: { 'content-type': 'application/json', ...auth('admin_rrhh') },
      body: JSON.stringify(q)
    });
    const { id } = await res.json();
    questionIds.push(id);
    console.log(`  pregunta: ${q.text.slice(0, 40)}... (${id})`);
  }
  let res = await fetch(`${EXAMS}/templates`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...auth('admin_rrhh') },
    body: JSON.stringify({
      name: 'Evaluación de onboarding',
      sections: [{ title: 'General', questionIds, weight: 100 }]
    })
  });
  const template = await res.json();
  console.log(`  plantilla: Evaluación de onboarding (${template.id})`);

  console.log('\n4. Curso demo con módulos (vídeo, PDF, quiz)');
  res = await fetch(`${COURSES}/courses`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...auth('instructor') },
    body: JSON.stringify({
      title: 'Onboarding Linex Travel',
      description: 'Curso introductorio para nuevos colaboradores.',
      area: 'Recursos Humanos',
      modules: [
        { type: 'video', title: 'Bienvenida a Linex Travel', url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
        { type: 'pdf', title: 'Manual del colaborador', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
        { type: 'quiz', title: 'Evaluación de onboarding', quizTemplateId: template.id }
      ]
    })
  });
  const course = await res.json();
  console.log(`  curso: Onboarding Linex Travel (${course.id})`);

  console.log('\nListo. Credenciales (password para todos: ' + PASSWORD + '):');
  USERS.forEach(u => console.log(`  ${u.role.padEnd(18)} ${u.email}`));
}

main().catch(e => { console.error('SEED FAILED:', e.message); process.exitCode = 1; });
