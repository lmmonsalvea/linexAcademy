import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../utils/auth'
import { apiFetch } from '../utils/api'

const COVERS = [
  'linear-gradient(135deg,#5B5CFF,#6D28D9)',
  'linear-gradient(135deg,#17153B,#6D28D9)',
  'linear-gradient(135deg,#E0B3FF,#5B5CFF)',
  'linear-gradient(135deg,#6D28D9,#080808)',
  'linear-gradient(135deg,#5B5CFF,#17153B)',
  'linear-gradient(135deg,#E0B3FF,#6D28D9)'
]

const canCreate = role => ['instructor', 'admin_area', 'superadmin'].includes(role)

export default function Courses(){
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState(null)
  const [areaFilter, setAreaFilter] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/courses')
      .then(({ courses }) => { if (!cancelled) setCourses(courses) })
      .catch(err => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [])

  const isManager = canCreate(profile?.role)

  const moveCourse = async (visibleList, index, direction) => {
    const otherIndex = index + direction
    if (otherIndex < 0 || otherIndex >= visibleList.length) return
    const reordered = [...visibleList]
    ;[reordered[index], reordered[otherIndex]] = [reordered[otherIndex], reordered[index]]
    try {
      await apiFetch('/api/courses/reorder', { method: 'PUT', body: JSON.stringify({ ids: reordered.map(c => c.id) }) })
      const { courses: fresh } = await apiFetch('/api/courses')
      setCourses(fresh)
    } catch (err) {
      setError(err.message)
    }
  }

  if (courses === null) {
    return <AppShell active="courses"><div className="page-loading">Cargando cursos…</div></AppShell>
  }

  const areas = [...new Set(courses.map(c => c.area).filter(Boolean))]
  const visible = areaFilter ? courses.filter(c => c.area === areaFilter) : courses

  return (
    <AppShell active="courses">
      <div className="panel-head">
        <div>
          <h2>Catálogo de cursos</h2>
          <div className="info-note" style={{ marginTop: 10 }}>
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></svg>
            <span>Cada curso se asigna automáticamente según tu unidad de negocio y bloque de trabajo — avanza a tu ritmo. Al completar todos los módulos se habilita el certificado descargable.</span>
          </div>
        </div>
        {canCreate(profile?.role) && (
          <div className="panel-head-actions">
            <button className="btn btn-primary" onClick={() => navigate('/courses/new')}>+ Crear curso</button>
          </div>
        )}
      </div>

      {error && <div className="info-note" style={{ margin: '16px 0' }}><span>{error}</span></div>}

      {areas.length > 0 && (
        <div className="chip-row">
          <button className={`chip ${!areaFilter ? 'on' : ''}`} onClick={() => setAreaFilter(null)}>Todas las áreas</button>
          {areas.map(a => (
            <button key={a} className={`chip ${areaFilter === a ? 'on' : ''}`} onClick={() => setAreaFilter(a)}>{a}</button>
          ))}
        </div>
      )}

      <div className="course-grid">
        {visible.map((c, i) => (
          <div key={c.id} className="card course-card">
            <Link to={`/courses/${c.id}`} className="course-link">
              <div className="course-cover" style={{ background: COVERS[i % COVERS.length] }}>
                {c.area && <span className="tag">{c.area}</span>}
              </div>
              <div className="course-body">
                <h3>{c.title} {c.updatedAt && <span className="pill pill-accent" style={{ fontSize: '.66rem' }}>Actualizado</span>}</h3>
                {c.description && <span className="course-meta"><span>{c.description}</span></span>}
                <span className="course-meta"><span>🎬 {c.modules.length} módulo{c.modules.length === 1 ? '' : 's'}</span></span>
              </div>
            </Link>
            <div className="course-card-footer">
              {isManager && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => moveCourse(visible, i, -1)} title="Mover antes">↑</button>
                  <button className="btn btn-ghost btn-sm" disabled={i === visible.length - 1} onClick={() => moveCourse(visible, i, 1)} title="Mover después">↓</button>
                </div>
              )}
              <Link to={`/courses/${c.id}`} className="btn btn-primary btn-sm btn-block">Ver curso</Link>
            </div>
          </div>
        ))}
        {visible.length === 0 && <p style={{ color: 'var(--text-dim)' }}>Aún no hay cursos publicados.</p>}
      </div>
    </AppShell>
  )
}
