import React, { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { apiFetch, apiFetchBlob } from '../utils/api'

const STATUS_LABEL = { in_progress: 'En progreso', graded: 'Calificado' }

export default function RRHHPanel(){
  const [templates, setTemplates] = useState([])
  const [templateId, setTemplateId] = useState('')
  const [attempts, setAttempts] = useState(null)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => {
    apiFetch('/api/exams/templates')
      .then((r) => setTemplates(r.templates))
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!templateId) { setAttempts(null); return }
    let cancelled = false
    setError('')
    apiFetch(`/api/exams/tests/report?templateId=${encodeURIComponent(templateId)}`)
      .then((r) => { if (!cancelled) setAttempts(r.attempts) })
      .catch((err) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [templateId])

  const template = templates.find((t) => t.id === templateId)
  const passScore = template?.passScore ?? 60

  const graded = (attempts || []).filter((a) => a.status === 'graded')
  const count = attempts?.length || 0
  const average = graded.length ? Math.round(graded.reduce((sum, a) => sum + (a.score || 0), 0) / graded.length) : null
  const passRate = graded.length ? Math.round((graded.filter((a) => a.score >= passScore).length / graded.length) * 100) : null

  const downloadCsv = async (id) => {
    setDownloadingId(id)
    setError('')
    try {
      const blob = await apiFetchBlob(`/api/exams/tests/${id}/export.csv`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `test-${id}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <AppShell active="rrhh">
      <div className="panel-head">
        <div>
          <h2>Panel RRHH</h2>
          <div className="info-note" style={{ marginTop: 10 }}>
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></svg>
            <span>Elige una plantilla de evaluación para ver los resultados reales de quienes la han presentado.</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18 }}>
        <div className="section-title">Plantilla de evaluación</div>
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--surface-2)', background: 'var(--surface)', minWidth: 280 }}>
          <option value="">Selecciona una plantilla…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      {error && <div className="info-note" style={{ margin: '16px 0' }}><span>{error}</span></div>}

      {templateId && attempts && (
        <>
          <div className="stat-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="card stat-card"><span>Evaluaciones presentadas</span><b className="mono">{count}</b></div>
            <div className="card stat-card"><span>Promedio general</span><b className="mono">{average === null ? '—' : `${average}%`}</b></div>
            <div className="card stat-card"><span>Tasa de aprobación</span><b className="mono">{passRate === null ? '—' : `${passRate}%`}</b></div>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div className="section-title">Resultados por candidato</div>
            <div className="scrollx">
              <table className="table">
                <thead>
                  <tr><th>Candidato</th><th>Puntaje</th><th>Estado</th><th></th></tr>
                </thead>
                <tbody>
                  {attempts.map((a) => {
                    const passed = a.status === 'graded' && a.score >= passScore
                    return (
                      <tr key={a.id}>
                        <td>{a.email}</td>
                        <td className="mono">{a.status === 'graded' ? `${a.score}%` : '—'}</td>
                        <td>
                          {a.status === 'graded'
                            ? <span className={`pill ${passed ? 'pill-success' : 'pill-warning'}`}>{passed ? 'Aprobado' : 'No aprobado'}</span>
                            : <span className="pill pill-warning">{STATUS_LABEL[a.status] || a.status}</span>}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" disabled={downloadingId === a.id} onClick={() => downloadCsv(a.id)}>
                            {downloadingId === a.id ? 'Descargando…' : 'Descargar CSV'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {attempts.length === 0 && (
                    <tr><td colSpan={4} style={{ color: 'var(--text-dim)' }}>Nadie ha presentado esta evaluación todavía.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  )
}
