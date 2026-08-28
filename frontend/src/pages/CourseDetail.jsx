import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import AssignmentPicker from '../components/AssignmentPicker'
import { apiFetch, apiFetchBlob } from '../utils/api'
import { useAuth } from '../utils/auth'

const MODULE_ICON = { video: '▶', pdf: '📄', scorm: '🧩', quiz: '📝', link: '🔗' }
const MODULE_LABEL = { video: 'Vídeo', pdf: 'PDF · lectura', scorm: 'Paquete SCORM', quiz: 'Quiz', link: 'Enlace externo' }
const canEditCourse = (role) => ['instructor', 'admin_area', 'superadmin'].includes(role)
const emptyModule = () => ({ type: 'video', title: '', url: '', hidden: false })

export default function CourseDetail(){
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isManager = canEditCourse(profile?.role)

  const [course, setCourse] = useState(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editArea, setEditArea] = useState('')
  const [editModules, setEditModules] = useState([])
  const [editAreaIds, setEditAreaIds] = useState([])
  const [editBlocks, setEditBlocks] = useState([])
  const [updateNote, setUpdateNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    apiFetch(`/api/courses/${id}`)
      .then(setCourse)
      .catch(err => setError(err.message))
  }, [id])

  useEffect(() => { load() }, [load])

  // People are handed their work path, they don't sign themselves up — but
  // course-assignment sync (enrollmentSync.js) can lag a moment behind a
  // brand-new assignment. If this course is visible to someone (the GET
  // above didn't 403) and they're just not enrolled yet, quietly fix that
  // instead of showing a button. Managers viewing a course to edit it
  // aren't "taking" it, so this is skipped for them.
  useEffect(() => {
    if (!course || course.enrolled || isManager) return
    apiFetch(`/api/courses/${id}/enroll`, { method: 'POST' }).then(load).catch(() => {})
  }, [course, isManager, id, load])

  const openEdit = () => {
    setEditTitle(course.title)
    setEditDescription(course.description || '')
    setEditArea(course.area || '')
    setEditModules(course.modules.map(m => ({ ...m })))
    setEditAreaIds(course.assignedAreaIds || [])
    setEditBlocks(course.assignedBlocks || [])
    setUpdateNote('')
    setEditing(true)
  }

  const updateEditModule = (i, field, value) => {
    setEditModules(editModules.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  const saveEdit = async (asAnnouncement) => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: editTitle,
        description: editDescription,
        area: editArea || null,
        modules: editModules.filter(m => m.title.trim()),
        assignedAreaIds: editAreaIds,
        assignedBlocks: editBlocks,
      }
      if (asAnnouncement) payload.updateNote = updateNote
      await apiFetch(`/api/courses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      setEditing(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h2>{course.title}</h2>
          {isManager && (
            <button className="btn btn-ghost btn-sm" onClick={openEdit}>Editar curso</button>
          )}
        </div>
        {course.description && <p>{course.description}</p>}
        <div className="meta">
          <span>🎬 {course.modules.length} módulos</span>
          {course.area && <span>🏷 {course.area}</span>}
          {course.instructorEmail && <span>👤 {course.instructorEmail}</span>}
        </div>
        {course.updatedAt && (
          <div className="pill pill-accent" style={{ marginTop: 10 }} title={course.updateNote || ''}>
            🔄 Actualizado el {new Date(course.updatedAt).toLocaleDateString('es-CO')}
          </div>
        )}
      </div>

      {error && <div className="info-note" style={{ margin: '16px 0' }}><span>{error}</span></div>}
      {course.updateNote && (
        <div className="info-note" style={{ margin: '16px 0' }}>
          <span>Última actualización: {course.updateNote}</span>
        </div>
      )}

      {editing && (
        <div className="card" style={{ padding: 20, margin: '16px 0' }}>
          <div className="section-title">Editar curso</div>
          <div className="field"><label>Título</label><input value={editTitle} onChange={e => setEditTitle(e.target.value)} /></div>
          <div className="field"><label>Descripción</label><input value={editDescription} onChange={e => setEditDescription(e.target.value)} /></div>
          <div className="field"><label>Área</label><input value={editArea} onChange={e => setEditArea(e.target.value)} /></div>

          <div className="section-title" style={{ marginTop: 16 }}>¿Para quién es este curso?</div>
          <p style={{ color: 'var(--text-dim)', fontSize: '.82rem', margin: '4px 0 10px' }}>
            Sin nada seleccionado, queda abierto a todos. Al guardar, se asigna automáticamente a las personas de la unidad/bloque elegidos — no tienen que inscribirse.
          </p>
          <AssignmentPicker
            assignedAreaIds={editAreaIds}
            assignedBlocks={editBlocks}
            onChange={({ assignedAreaIds, assignedBlocks }) => { setEditAreaIds(assignedAreaIds); setEditBlocks(assignedBlocks) }}
          />

          <div className="section-title" style={{ marginTop: 16 }}>Módulos</div>
          {editModules.map((m, i) => (
            <div key={i} className="card" style={{ padding: 14, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="field">
                <label>Tipo</label>
                <select value={m.type} onChange={e => updateEditModule(i, 'type', e.target.value)}>
                  <option value="video">Vídeo</option>
                  <option value="pdf">PDF</option>
                  <option value="scorm">SCORM</option>
                  <option value="quiz">Quiz</option>
                  <option value="link">Enlace externo</option>
                </select>
              </div>
              <div className="field"><label>Título del módulo</label><input value={m.title} onChange={e => updateEditModule(i, 'title', e.target.value)} /></div>
              {m.type !== 'quiz' && (
                <div className="field"><label>URL</label><input value={m.url || ''} onChange={e => updateEditModule(i, 'url', e.target.value)} /></div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.84rem', color: 'var(--text-dim)' }}>
                <input type="checkbox" checked={!!m.hidden} onChange={e => updateEditModule(i, 'hidden', e.target.checked)} />
                Ocultar este módulo (queda guardado, pero no lo ven los estudiantes ni cuenta para el progreso)
              </label>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setEditModules([...editModules, emptyModule()])}>+ Agregar módulo</button>

          <div className="section-title">Anunciar actualización (opcional)</div>
          <p style={{ color: 'var(--text-dim)', fontSize: '.82rem', margin: '4px 0 10px' }}>
            Si escribes una nota, se marca el curso como actualizado y se envía un correo a quienes correspondan (inscritos, y quienes estén en la unidad/bloque asignado).
          </p>
          <textarea
            placeholder="ej. Se actualizó el módulo de seguridad con la nueva política"
            value={updateNote}
            onChange={e => setUpdateNote(e.target.value)}
            rows={3}
            style={{ display: 'block', width: '100%', marginBottom: 12 }}
          />

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={saving}>Cancelar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => saveEdit(false)} disabled={saving}>Guardar sin notificar</button>
            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(true)} disabled={saving || !updateNote.trim()}>
              {saving ? 'Guardando…' : 'Guardar y notificar actualización'}
            </button>
          </div>
        </div>
      )}

      <div className="detail-grid">
        <div>
          <div className="section-title">Módulos</div>
          {isEnrolled && (
            <div className="progress-track" style={{ marginBottom: 16 }}>
              <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>
          )}
          {course.modules.map((m, i) => (
            <div key={m.id} className={`module-row ${isDone(m) ? 'done' : (isEnrolled || isManager) ? 'current' : 'locked'}`}>
              <div className="module-ic">{MODULE_ICON[m.type] || '•'}</div>
              <div className="txt">
                <b>{i + 1}. {m.title}</b>
                <span>{MODULE_LABEL[m.type] || m.type}{m.hidden ? ' · Oculto' : ''}</span>
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
              {m.type === 'link' && m.url && (
                <a href={m.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Abrir enlace</a>
              )}

              {isDone(m) ? (
                <span className="pill pill-success">Completado</span>
              ) : isEnrolled ? (
                <button className="btn btn-ghost btn-sm" onClick={() => completeModule(m.id)}>Marcar como completado</button>
              ) : !isManager ? (
                <span className="pill pill-locked">No disponible</span>
              ) : null}
            </div>
          ))}
        </div>

        {isEnrolled && (
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
        )}
      </div>
    </AppShell>
  )
}
