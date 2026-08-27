import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { apiFetch, apiFetchBlob } from '../utils/api'

const MODULE_ICON = { video: '▶', pdf: '📄', scorm: '🧩', quiz: '📝' }
const MODULE_LABEL = { video: 'Vídeo', pdf: 'PDF · lectura', scorm: 'Paquete SCORM', quiz: 'Quiz' }

export default function CourseDetail(){
  const { id } = useParams()
  const navigate = useNavigate()

  const [course, setCourse] = useState(null)
  const [error, setError] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const load = useCallback(() => {
    apiFetch(`/api/courses/${id}`)
      .then(setCourse)
      .catch(err => setError(err.message))
  }, [id])

  useEffect(() => { load() }, [load])

  const enroll = async () => {
    setEnrolling(true)
    try {
      await apiFetch(`/api/courses/${id}/enroll`, { method: 'POST' })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnrolling(false)
    }
  }

  const completeModule = async (moduleId) => {
    try {
      await apiFetch(`/api/courses/${id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ moduleId })
      })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const downloadCertificate = async () => {
    setDownloading(true)
    try {
      const blob = await apiFetchBlob(`/api/courses/${id}/certificate`)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noreferrer')
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloading(false)
    }
  }

  if (!course) return <AppShell active="courses"><div className="page-loading">Cargando curso…</div></AppShell>

  const progress = course.progress || { completedModules: [], percent: 0, totalModules: course.modules.length }
  const isDone = m => progress.completedModules.includes(m.id)
  const percent = progress.percent || 0
  const isEnrolled = !!course.enrolled

  return (
    <AppShell active="courses">
      <button className="btn-text" onClick={() => navigate('/courses')}>← Volver al catálogo</button>

      <div className="course-hero" style={{ background: 'linear-gradient(120deg,#5B5CFF,#6D28D9 60%,#17153B)', marginTop: 14 }}>
        <h2>{course.title}</h2>
        {course.description && <p>{course.description}</p>}
        <div className="meta">
          <span>🎬 {course.modules.length} módulos</span>
          {course.area && <span>🏷 {course.area}</span>}
          {course.instructorEmail && <span>👤 {course.instructorEmail}</span>}
        </div>
        {!isEnrolled && (
          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={enroll} disabled={enrolling}>
            {enrolling ? 'Inscribiendo…' : 'Inscribirme'}
          </button>
        )}
      </div>

      {error && <div className="info-note" style={{ margin: '16px 0' }}><span>{error}</span></div>}

      <div className="detail-grid">
        <div>
          <div className="section-title">Módulos</div>
          {isEnrolled && (
            <div className="progress-track" style={{ marginBottom: 16 }}>
              <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>
          )}
          {course.modules.map((m, i) => (
            <div key={m.id} className={`module-row ${isDone(m) ? 'done' : isEnrolled ? 'current' : 'locked'}`}>
              <div className="module-ic">{MODULE_ICON[m.type] || '•'}</div>
              <div className="txt">
                <b>{i + 1}. {m.title}</b>
                <span>{MODULE_LABEL[m.type] || m.type}</span>
              </div>

              {m.type === 'video' && m.url && (
                <video controls src={m.url} style={{ maxWidth: '100%', borderRadius: 8, flexBasis: '100%' }} />
              )}
              {m.type === 'pdf' && m.url && (
                <a href={m.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Abrir PDF</a>
              )}
              {m.type === 'scorm' && m.url && (
                <iframe title={m.title} src={m.url} style={{ width: '100%', height: 320, border: '1px solid rgba(23,21,59,.1)', borderRadius: 8, flexBasis: '100%' }} />
              )}
              {m.type === 'quiz' && (
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/exams')}>Ir a la evaluación</button>
              )}

              {isDone(m) ? (
                <span className="pill pill-success">Completado</span>
              ) : isEnrolled ? (
                <button className="btn btn-ghost btn-sm" onClick={() => completeModule(m.id)}>Marcar como completado</button>
              ) : (
                <span className="pill pill-locked">Inscríbete para avanzar</span>
              )}
            </div>
          ))}
        </div>

        <div>
          <div className="section-title">Tu certificado</div>
          <div className="card cert-card">
            <div className="cert-ring" style={{ background: `conic-gradient(var(--blueviolet) 0 ${percent}%, var(--surface-2) ${percent}% 100%)` }}>{percent}%</div>
            {percent === 100 ? (
              <>
                <p style={{ color: 'var(--text-dim)', fontSize: '.86rem', marginBottom: 16 }}>¡Completaste el curso! Tu certificado ya está disponible.</p>
                <button className="btn btn-primary btn-sm" onClick={downloadCertificate} disabled={downloading}>
                  {downloading ? 'Generando…' : 'Descargar certificado'}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-dim)', fontSize: '.86rem', marginBottom: 16 }}>Completa todos los módulos para desbloquear tu certificado.</p>
                <button className="btn btn-ghost btn-sm" disabled>🔒 Certificado bloqueado</button>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
