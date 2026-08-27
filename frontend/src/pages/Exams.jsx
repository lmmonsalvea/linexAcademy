import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { getCurrentUser, authHeader } from '../utils/auth'

const API = 'http://localhost:4000'
const TYPE_LABEL = { mcq: 'Opción múltiple', tf: 'Verdadero / Falso', open: 'Respuesta abierta' }

export default function Exams(){
  const user = getCurrentUser()
  const [templates, setTemplates] = useState([])
  const [test, setTest] = useState(null)
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch(`${API}/templates`).then(r => r.json()).then(setTemplates).catch(() => {})
  }, [])

  const startTest = async (templateId) => {
    setMsg(''); setResult(null); setAnswers({}); setQIndex(0)
    const res = await fetch(`${API}/tests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeader() },
      body: JSON.stringify({ templateId })
    })
    const j = await res.json()
    if (res.ok) setTest(j)
    else setMsg(j.error || 'No se pudo iniciar la evaluación')
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
    const res = await fetch(`${API}/tests/${test.testId}/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeader() },
      body: JSON.stringify(payload)
    })
    const j = await res.json()
    if (res.ok) setResult(j)
    else setMsg(j.error || 'No se pudo enviar la evaluación')
  }

  if (!user) return <Navigate to="/login" replace />

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
        {templates.map(t => (
          <div key={t._id} className="card exam-row">
            <div className="exam-ic" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>📝</div>
            <div className="txt"><b>{t.name}</b><span>{(t.sections || []).reduce((n, s) => n + (s.questionIds || []).length, 0)} preguntas</span></div>
            <button className="btn btn-primary btn-sm" onClick={() => startTest(t._id)}>Comenzar</button>
          </div>
        ))}
        {templates.length === 0 && <p style={{ color: 'var(--text-dim)' }}>Aún no hay evaluaciones publicadas.</p>}
      </div>
      {msg && <p className="auth-msg">{msg}</p>}
    </AppShell>
  )
}
