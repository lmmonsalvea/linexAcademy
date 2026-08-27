const express = require('express');
const { z } = require('zod');
const { db } = require('../firebaseAdmin');
const { requireRole } = require('../middleware/auth');
const { validate } = require('../lib/validate');
const { asyncRoute } = require('../middleware/errorHandler');
const { toCsv } = require('../lib/csv');

const router = express.Router();

const questionsCol = () => db.collection('examQuestions');
const templatesCol = () => db.collection('examTemplates');
const attemptsCol = () => db.collection('examAttempts');

// Firestore admin SDK rejects `undefined` values inside writes. Optional
// fields (e.g. `options` on an 'open' question, `textAnswer` on an 'mcq'
// answer) are simply absent on the source object rather than forced to
// null, so every write payload is passed through this first.
function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

const questionSchema = z
  .object({
    text: z.string().min(1),
    type: z.enum(['mcq', 'tf', 'open']),
    options: z.array(z.string()).optional(),
    answer: z.number().int().optional(),
    tags: z.array(z.string()).optional(),
    area: z.string().optional(),
    difficulty: z.string().optional(),
  })
  .refine((q) => q.type === 'open' || (Array.isArray(q.options) && q.options.length > 0), {
    message: 'Las preguntas de opción múltiple o verdadero/falso requieren "options"',
    path: ['options'],
  })
  .refine((q) => q.type === 'open' || typeof q.answer === 'number', {
    message: 'Las preguntas de opción múltiple o verdadero/falso requieren "answer"',
    path: ['answer'],
  });

const templateSchema = z.object({
  title: z.string().min(1),
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        questionIds: z.array(z.string()).min(1),
        weight: z.number().optional(),
      })
    )
    .min(1),
  passScore: z.number().optional(),
});

const createTestSchema = z.object({ templateId: z.string().min(1) });

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      answerIndex: z.number().int().optional(),
      textAnswer: z.string().optional(),
    })
  ),
});

// --- Question bank ----------------------------------------------------
// Restricted to RRHH/superadmin: the raw bank carries the `answer` key
// (correct-option index) and reveals which questions belong to a template.
// The old prototype left GET /questions and GET /templates open to any
// authenticated user — a real leak fixed here. Test-takers only ever see a
// stripped per-question snapshot inside their own attempt (see POST /tests).
router.post(
  '/questions',
  requireRole('admin_rrhh', 'superadmin'),
  asyncRoute(async (req, res) => {
    const data = validate(questionSchema, req.body);
    const doc = stripUndefined({ ...data, createdAt: new Date().toISOString() });
    const ref = await questionsCol().add(doc);
    res.json({ id: ref.id, ...doc });
  })
);

router.get(
  '/questions',
  requireRole('admin_rrhh', 'superadmin'),
  asyncRoute(async (req, res) => {
    const snap = await questionsCol().orderBy('createdAt', 'desc').get();
    res.json({ questions: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  })
);

// --- Templates ----------------------------------------------------------
router.post(
  '/templates',
  requireRole('admin_rrhh', 'superadmin'),
  asyncRoute(async (req, res) => {
    const data = validate(templateSchema, req.body);
    const doc = stripUndefined({ ...data, createdAt: new Date().toISOString() });
    const ref = await templatesCol().add(doc);
    res.json({ id: ref.id, ...doc });
  })
);

router.get(
  '/templates',
  requireRole('admin_rrhh', 'superadmin'),
  asyncRoute(async (req, res) => {
    const snap = await templatesCol().orderBy('createdAt', 'desc').get();
    res.json({ templates: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  })
);

// --- Test attempts --------------------------------------------------------
router.post(
  '/tests',
  asyncRoute(async (req, res) => {
    const { templateId } = validate(createTestSchema, req.body);
    const templateSnap = await templatesCol().doc(templateId).get();
    if (!templateSnap.exists) throw { status: 404, message: 'Plantilla de evaluación no encontrada' };
    const template = templateSnap.data();

    const questionIds = [...new Set((template.sections || []).flatMap((s) => s.questionIds || []))];
    const questionSnaps = await Promise.all(questionIds.map((id) => questionsCol().doc(id).get()));

    // Snapshot each question WITHOUT the `answer` key — taken once here and
    // never re-fetched from the live bank for display later, and the
    // grading step below never trusts this snapshot either, only the live
    // question doc.
    const questions = questionSnaps
      .filter((d) => d.exists)
      .map((d) => {
        const q = d.data();
        return stripUndefined({ id: d.id, type: q.type, text: q.text, options: q.options });
      });

    const attempt = {
      templateId,
      templateTitle: template.title,
      uid: req.user.uid,
      email: req.user.email,
      questions,
      answers: [],
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    };
    const ref = await attemptsCol().add(attempt);
    res.json({ id: ref.id, questions });
  })
);

router.post(
  '/tests/:id/submit',
  asyncRoute(async (req, res) => {
    const { answers } = validate(submitSchema, req.body);
    const ref = attemptsCol().doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw { status: 404, message: 'Evaluación no encontrada' };
    const attempt = snap.data();
    if (attempt.uid !== req.user.uid) throw { status: 403, message: 'No autorizado' };

    let total = 0;
    let correctCount = 0;
    const details = [];

    for (const a of answers) {
      // Re-fetch the live question doc — never trust the request or the
      // attempt's own snapshot for grading.
      const qSnap = await questionsCol().doc(a.questionId).get();
      if (!qSnap.exists) continue; // question removed from the bank since the attempt started
      const q = qSnap.data();
      total += 1;

      let correct = false;
      let given;
      let expected;
      if (q.type === 'open') {
        // Never auto-graded (RRHH grades manually later), but the text
        // answer must still be persisted — the old prototype silently
        // dropped `textAnswer` here, leaving nothing to grade.
        given = a.textAnswer;
      } else {
        given = a.answerIndex;
        expected = q.answer;
        correct = typeof a.answerIndex === 'number' && a.answerIndex === q.answer;
      }
      if (correct) correctCount += 1;
      details.push(stripUndefined({ questionId: a.questionId, correct, given, expected }));
    }

    const score = total === 0 ? 0 : Math.round((correctCount / total) * 100);
    await ref.update({
      status: 'graded',
      score,
      total,
      correct: correctCount,
      details,
      answers: answers.map((a) => stripUndefined(a)),
      submittedAt: new Date().toISOString(),
    });
    res.json({ score, total, correct: correctCount, details });
  })
);

// Static path — declared ahead of the parametric /tests/:id/* routes below
// for clarity, though the differing segment counts mean there's no real
// collision either way.
router.get(
  '/tests/report',
  requireRole('admin_rrhh', 'superadmin'),
  asyncRoute(async (req, res) => {
    const { templateId } = req.query;
    if (!templateId) throw { status: 400, message: 'Falta el parámetro templateId' };
    const snap = await attemptsCol().where('templateId', '==', templateId).get();
    const attempts = snap.docs.map((d) => {
      const t = d.data();
      return {
        id: d.id,
        uid: t.uid,
        email: t.email,
        score: t.score,
        total: t.total,
        status: t.status,
        submittedAt: t.submittedAt,
      };
    });
    res.json({ attempts });
  })
);

router.get(
  '/tests',
  asyncRoute(async (req, res) => {
    // Contract already depended on by Dashboard.jsx — always the caller's
    // own attempts, regardless of the `mine` query value.
    const snap = await attemptsCol().where('uid', '==', req.user.uid).get();
    const tests = snap.docs.map((d) => {
      const t = d.data();
      return { id: d.id, templateTitle: t.templateTitle, status: t.status, score: t.score, total: t.total };
    });
    res.json({ tests });
  })
);

router.get(
  '/tests/:id/result',
  asyncRoute(async (req, res) => {
    const snap = await attemptsCol().doc(req.params.id).get();
    if (!snap.exists) throw { status: 404, message: 'Evaluación no encontrada' };
    const attempt = snap.data();
    const isOwner = attempt.uid === req.user.uid;
    const isRRHH = ['admin_rrhh', 'superadmin'].includes(req.user.role);
    if (!isOwner && !isRRHH) throw { status: 403, message: 'No autorizado' };
    res.json({ id: snap.id, ...attempt });
  })
);

router.get(
  '/tests/:id/export.csv',
  requireRole('admin_rrhh', 'superadmin'),
  asyncRoute(async (req, res) => {
    const snap = await attemptsCol().doc(req.params.id).get();
    if (!snap.exists) throw { status: 404, message: 'Evaluación no encontrada' };
    const attempt = snap.data();
    // Generated in memory and streamed straight into the response — no
    // filesystem write. The old prototype wrote to a hardcoded
    // `/tmp/test_${id}.csv` (broke outside Linux, raced on concurrent
    // exports, leaked disk); fixed here.
    const csv = toCsv(attempt.details || [], [
      { key: 'questionId', header: 'QuestionId' },
      { key: 'correct', header: 'Correct' },
      { key: 'given', header: 'Given' },
      { key: 'expected', header: 'Expected' },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="test-${req.params.id}.csv"`);
    res.send(csv);
  })
);

module.exports = router;
