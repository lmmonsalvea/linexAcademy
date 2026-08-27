import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { getCurrentUser, authHeader } from '../utils/auth'

const emptyModule = () => ({ type: 'video', title: '', url: '', quizTemplateId: '' })
const allowedRoles = ['instructor', 'admin_area', 'superadmin']

export default function NewCourse(){
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [area, setArea] = useState('')
  const [modules, setModules] = useState([emptyModule()])
  const [msg, setMsg] = useState('')

  const updateModule = (i, field, value) => {
    setModules(modules.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  const submit = async e => {
    e.preventDefault()
    const payload = {
      title,
      description,
      area: area || null,
      modules: modules.filter(m => m.title && (m.url || m.type === 'quiz'))
    }
    const res = await fetch('http://localhost:7000/courses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeader() },
      body: JSON.stringify(payload)
    })
    const j = await res.json()
    if (res.ok) navigate(`/courses/${j.id}`)
    else setMsg(j.error || 'Error al crear el curso')
  }

  if (!user) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) {
    return (
      <AppShell active="courses">
        <p>Tu rol ({user.role}) no tiene permiso para crear cursos. Se requiere Instructor, Admin Área o Superadmin.</p>
      </AppShell>
    )
  }

  return (
    <AppShell active="courses">
      <button className="btn-text" onClick={() => navigate('/courses')}>← Volver al catálogo</button>
      <div className="panel-head" style={{ marginTop: 14 }}><h2>Crear curso</h2></div>

      <form onSubmit={submit} style={{ maxWidth: 620 }}>
        <div className="field"><label>Título</label><input value={title} onChange={e => setTitle(e.target.value)} required /></div>
        <div className="field"><label>Descripción</label><input value={description} onChange={e => setDescription(e.target.value)} /></div>
        <div className="field"><label>Área</label><input value={area} onChange={e => setArea(e.target.value)} placeholder="ej. Tecnología" /></div>

        <div className="section-title" style={{ marginTop: 8 }}>Módulos</div>
        {modules.map((m, i) => (
          <div key={i} className="card" style={{ padding: 16, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="field">
              <label>Tipo</label>
              <select value={m.type} onChange={e => updateModule(i, 'type', e.target.value)}>
                <option value="video">Vídeo</option>
                <option value="pdf">PDF</option>
                <option value="scorm">SCORM</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>
            <div className="field"><label>Título del módulo</label><input value={m.title} onChange={e => updateModule(i, 'title', e.target.value)} /></div>
            {m.type !== 'quiz' && (
              <div className="field"><label>URL</label><input value={m.url} onChange={e => updateModule(i, 'url', e.target.value)} placeholder="https://..." /></div>
            )}
            {m.type === 'quiz' && (
              <div className="field"><label>ID de plantilla de evaluación</label><input value={m.quizTemplateId} onChange={e => updateModule(i, 'quizTemplateId', e.target.value)} /></div>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModules([...modules, emptyModule()])}>+ Agregar módulo</button>
          <button type="submit" className="btn btn-primary">Crear curso</button>
        </div>
      </form>
      {msg && <p className="auth-msg">{msg}</p>}
    </AppShell>
  )
}
