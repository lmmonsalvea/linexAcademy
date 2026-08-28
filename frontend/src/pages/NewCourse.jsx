import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import AssignmentPicker from '../components/AssignmentPicker'
import { apiFetch } from '../utils/api'

const emptyModule = () => ({ type: 'video', title: '', url: '' })

export default function NewCourse(){
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [area, setArea] = useState('')
  const [modules, setModules] = useState([emptyModule()])
  const [assignedAreaIds, setAssignedAreaIds] = useState([])
  const [assignedBlocks, setAssignedBlocks] = useState([])
  const [assignedTeamIds, setAssignedTeamIds] = useState([])
  const [order, setOrder] = useState('')
  const [msg, setMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const updateModule = (i, field, value) => {
    setModules(modules.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  const submit = async e => {
    e.preventDefault()
    setMsg('')
    setSubmitting(true)
    const payload = {
      title,
      description,
      area: area || null,
      modules: modules.filter(m => m.title.trim()),
      assignedAreaIds,
      assignedBlocks,
      assignedTeamIds,
      order: order.trim() === '' ? undefined : Number(order)
    }
    try {
      const { id } = await apiFetch('/api/courses', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      navigate(`/courses/${id}`)
    } catch (err) {
      setMsg(err.message || 'Error al crear el curso')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell active="courses">
      <button className="btn-text" onClick={() => navigate('/courses')}>← Volver al catálogo</button>
      <div className="panel-head" style={{ marginTop: 14 }}><h2>Crear curso</h2></div>

      <form onSubmit={submit} style={{ maxWidth: 620 }}>
        <div className="field"><label>Título</label><input value={title} onChange={e => setTitle(e.target.value)} required /></div>
        <div className="field"><label>Descripción</label><input value={description} onChange={e => setDescription(e.target.value)} /></div>
        <div className="field"><label>Área</label><input value={area} onChange={e => setArea(e.target.value)} placeholder="ej. Tecnología" /></div>
        <div className="field"><label>Orden en el catálogo (opcional)</label><input type="number" value={order} onChange={e => setOrder(e.target.value)} placeholder="ej. 1" /></div>

        <div className="section-title" style={{ marginTop: 8 }}>¿Para quién es este curso?</div>
        <p style={{ color: 'var(--text-dim)', fontSize: '.82rem', margin: '4px 0 10px' }}>
          Sin nada seleccionado, el curso queda abierto a todos. Puedes limitarlo a una unidad de negocio completa, a un bloque específico, o a un equipo de trabajo puntual — cada nivel es independiente.
        </p>
        <AssignmentPicker
          assignedAreaIds={assignedAreaIds}
          assignedBlocks={assignedBlocks}
          assignedTeamIds={assignedTeamIds}
          onChange={({ assignedAreaIds, assignedBlocks, assignedTeamIds }) => {
            setAssignedAreaIds(assignedAreaIds); setAssignedBlocks(assignedBlocks); setAssignedTeamIds(assignedTeamIds)
          }}
        />

        <div className="section-title" style={{ marginTop: 20 }}>Módulos</div>
        {modules.map((m, i) => (
          <div key={i} className="card" style={{ padding: 16, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="field">
              <label>Tipo</label>
              <select value={m.type} onChange={e => updateModule(i, 'type', e.target.value)}>
                <option value="video">Vídeo</option>
                <option value="pdf">PDF</option>
                <option value="scorm">SCORM</option>
                <option value="quiz">Quiz</option>
                <option value="link">Enlace externo</option>
                <option value="reading">Lectura (texto dentro de la plataforma)</option>
              </select>
            </div>
            <div className="field"><label>Título del módulo</label><input value={m.title} onChange={e => updateModule(i, 'title', e.target.value)} /></div>
            {m.type === 'reading' ? (
              <div className="field"><label>Contenido</label>
                <textarea value={m.content || ''} onChange={e => updateModule(i, 'content', e.target.value)} rows={10} style={{ display: 'block', width: '100%' }} />
              </div>
            ) : m.type !== 'quiz' && (
              <div className="field"><label>URL</label><input value={m.url} onChange={e => updateModule(i, 'url', e.target.value)} placeholder="https://..." /></div>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModules([...modules, emptyModule()])}>+ Agregar módulo</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creando…' : 'Crear curso'}</button>
        </div>
      </form>
      {msg && <p className="auth-msg">{msg}</p>}
    </AppShell>
  )
}
