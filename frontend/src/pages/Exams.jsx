import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../utils/auth'
import { apiFetch } from '../utils/api'

const TYPE_LABEL = { mcq: 'Opción múltiple', tf: 'Verdadero / Falso', open: 'Respuesta abierta' }

export default function Exams(){
  const { profile, loading: authLoading } = useAuth()
  const [templates, setTemplates] = useState(null)
  const [test, setTest] = useState(null)
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    // Any authenticated user can take a test, but only instructor/superadmin
    // can browse the raw template list — a plain employee starting an
    // evaluation gets the templateId handed to them (course/process flow),
    // so we only try to preload the picker for roles allowed to see it.
    if (!profile) return
    if (!['instructor', 'superadmin'].includes(profile.role)) { setTemplates([]); return }
    apiFetch('/api/exams/templates').then((r) => setTemplates(r.templates)).catch((err) => setMsg(err.message))
  }, [profile])

  const startTest = async (templateId) => {
    setMsg(''); setResult(null); setAnswers({}); setQIndex(0)
    try {
      const j = await apiFetch('/api/exams/tests', { method: 'POST', body: JSON.stringify({ templateId }) })
      setTest(j)
    } catch (err) {
      setMsg(err.message || 'No se pudo iniciar la evaluación')
    }
  }

  const setAnswer = (questionId, value) => setAnswers({ ...answers, [questionId]: value })

  const submit = async () => {
    const payload = {
      answers: test.questions.map(q => ({
        questionId: q.id,
        answerIndex: typeof answers[q.id] === 'number' ? answers[q.id] : undefined,
        textAnswer: typeof answers[q.id] === 'string' ? answers[q.id] : undefined
      }))
    }
    try {
      const j = await apiFetch(`/api/exams/tests/${test.id}/submit`, { method: 'POST', body: JSON.stringify(payload) })
      setResult(j)
    } catch (err) {
      setMsg(err.message || 'No se pudo enviar la evaluación')
    }
  }

  if (authLoading) return <AppShell active="exams"><div className="page-loading">Cargando…</div></AppShell>
  if (!profile) return <Navigate to="/login" replace />

  if (result) {
    return (
      <AppShell active="exams">
        <div className="result-wrap">
          <span className={`pill ${result.score >= 60 ? 'pill-success' : 'pill-warning'}`} style={{ marginBottom: 16 }}>
            {result.score >= 60 ? 'Evaluación aprobada' : 'Evaluación no aprobada'}
          </span>
          <div className="gauge" style={{ background: `conic-gradient(var(--blueviolet) 0 ${result.score}%, var(--surface-2) ${result.score}% 100%)` }}>
            <b>{result.score}%</b><span>Puntaje</span>
          </div>
          <h2 style={{ marginBottom: 6 }}>Resultado</h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: 26 }}>Respondiste {result.correct} de {result.total} preguntas correctamente.</p>
          <button className="btn btn-primary" onClick={() => { setTest(null); setResult(null) }}>Volver a evaluaciones</button>
        </div>
      </AppShell>
    )
  }

  if (test) {
    const q = test.questions[qIndex]
    const answered = typeof answers[q.id] !== 'undefined' && answers[q.id] !== ''
    const isLast = qIndex === test.questions.length - 1

    return (
      <AppShell active="exams">
        <div className="exam-run">
          <button className="btn-text" onClick={() => setTest(null)}>← Salir de la evaluación</button>
          <div className="exam-progress" style={{ marginTop: 14 }}>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${((qIndex + 1) / test.questions.length) * 100}%` }}></div></div>
            <span className="q-count">{qIndex + 1} / {test.questions.length}</span>
          </div>
          <div className="card q-card">
            <span className="pill pill-accent q-type">{TYPE_LABEL[q.type] || q.type}</span>
            <h3>{q.text}</h3>
            {(q.type === 'mcq' || q.type === 'tf') && q.options.map((opt, i) => (
              <div key={i} className={`opt ${answers[q.id] === i ? 'sel' : ''}`} onClick={() => setAnswer(q.id, i)}>
                <span className="radio"></span>{opt}
              </div>
            ))}
            {q.type === 'open' && (
              <textarea rows={4} value={answers[q.id] || ''} onChange={e => setAnswer(q.id, e.target.value)} placeholder="Tu respuesta..." />
            )}
          </div>
          <div className="exam-run-foot">
            <button className="btn btn-ghost" disabled={qIndex === 0} onClick={() => setQIndex(qIndex - 1)}>← Anterior</button>
            {isLast ? (
              <button className="btn btn-primary" disabled={!answered} onClick={submit}>Enviar evaluación</button>
            ) : (
              <button className="btn btn-primary" disabled={!answered} onClick={() => setQIndex(qIndex + 1)}>Siguiente →</button>
            )}
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell active="exams">
      <div className="panel-head">
        <div>
          <h2>Evaluaciones disponibles</h2>
          <div className="info-note" style={{ marginTop: 10 }}>
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></svg>
            <span>Pruebas ligadas a un curso o a un proceso de RRHH. Las de opción múltiple y verdadero/falso se califican al instante.</span>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        {templates === null && <p style={{ color: 'var(--text-dim)' }}>Cargando…</p>}
        {templates && templates.map(t => (
          <div key={t.id} className="card exam-row">
            <div className="exam-ic" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>📝</div>
            <div className="txt"><b>{t.title}</b><span>{(t.sections || []).reduce((n, s) => n + (s.questionIds || []).length, 0)} preguntas</span></div>
            <button className="btn btn-primary btn-sm" onClick={() => startTest(t.id)}>Comenzar</button>
          </div>
        ))}
        {templates && templates.length === 0 && <p style={{ color: 'var(--text-dim)' }}>Aún no hay evaluaciones publicadas.</p>}
      </div>
      {msg && <p className="auth-msg">{msg}</p>}
    </AppShell>
  )
}
