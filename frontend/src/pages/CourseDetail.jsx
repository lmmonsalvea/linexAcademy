import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { getCurrentUser, authHeader } from '../utils/auth'

const API = 'http://localhost:7000'
const MODULE_ICON = { video: '▶', pdf: '📄', scorm: '🧩', quiz: '📝' }
const MODULE_LABEL = { video: 'Vídeo', pdf: 'PDF · lectura', scorm: 'Paquete SCORM', quiz: 'Quiz' }

export default function CourseDetail(){
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getCurrentUser()
  const userId = user ? (user.email || user.sub) : null
  const token = localStorage.getItem('token')

  const [course, setCourse] = useState(null)
  const [progress, setProgress] = useState({ completedModules: [], percent: 0 })

  const loadProgress = useCallback(() => {
    if (!userId) return
    fetch(`${API}/courses/${id}/progress/${encodeURIComponent(userId)}`, { headers: authHeader() })
      .then(r => r.json()).then(setProgress).catch(() => {})
  }, [id, userId])

  useEffect(() => {
    fetch(`${API}/courses/${id}`).then(r => r.json()).then(setCourse).catch(() => {})
  }, [id])

  useEffect(() => {
    if (!userId) return
    fetch(`${API}/courses/${id}/enroll`, {
      method: 'POST', headers: { 'content-type': 'application/json', ...authHeader() }
    }).then(loadProgress).catch(() => {})
  }, [id, userId, loadProgress])

  const completeModule = async (moduleId) => {
    if (!userId) return
    await fetch(`${API}/courses/${id}/progress`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeader() },
      body: JSON.stringify({ moduleId })
    })
    loadProgress()
  }

  if (!user) return <Navigate to="/login" replace />
  if (!course) return <AppShell active="courses"><p>Cargando curso...</p></AppShell>

  const isDone = m => progress.completedModules.includes(m._id)
  const percent = progress.percent || 0

  return (
    <AppShell active="courses">
      <button className="btn-text" onClick={() => navigate('/courses')}>← Volver al catálogo</button>

      <div className="course-hero" style={{ background: 'linear-gradient(120deg,#5B5CFF,#6D28D9 60%,#17153B)', marginTop: 14 }}>
        <h2>{course.title}</h2>
        {course.description && <p>{course.description}</p>}
        <div className="meta">
          <span>🎬 {course.modules.length} módulos</span>
          {course.area && <span>🏷 {course.area}</span>}
          {course.instructorId && <span>👤 {course.instructorId}</span>}
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <div className="section-title">Módulos</div>
          {course.modules.map((m, i) => (
            <div key={m._id} className={`module-row ${isDone(m) ? 'done' : 'current'}`}>
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
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => completeModule(m._id)}>Marcar como completado</button>
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
                <a
                  className="btn btn-primary btn-sm"
                  href={`${API}/courses/${id}/certificate/${encodeURIComponent(userId)}?token=${encodeURIComponent(token)}`}
                  target="_blank" rel="noreferrer"
                >Descargar certificado</a>
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
