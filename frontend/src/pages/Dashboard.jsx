import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../utils/auth'
import { apiFetch } from '../utils/api'

export default function Dashboard() {
  const { profile } = useAuth()
  const firstName = (profile?.displayName || profile?.email || '').split(' ')[0]

  const [courses, setCourses] = useState(null)
  const [tests, setTests] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiFetch('/api/courses?mine=true'),
      apiFetch('/api/exams/tests?mine=true'),
    ])
      .then(([coursesRes, testsRes]) => {
        if (cancelled) return
        setCourses(coursesRes.courses)
        setTests(testsRes.tests)
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => { cancelled = true }
  }, [])

  const loading = courses === null || tests === null

  const inProgress = courses?.filter((c) => c.progress.percent > 0 && c.progress.percent < 100) || []
  const completed = courses?.filter((c) => c.progress.percent === 100) || []
  const pendingTests = tests?.filter((t) => t.status !== 'graded') || []

  return (
    <AppShell active="home">
      <div className="panel-head">
        <div>
          <h2>Hola, {firstName}</h2>
          <p style={{ color: 'var(--text-dim)', marginTop: 4 }}>Esto es lo que tienes pendiente hoy.</p>
        </div>
      </div>

      {error && <div className="info-note" style={{ margin: '16px 0' }}><span>No se pudieron cargar tus datos: {error}</span></div>}

      {!loading && (
        <div className="stat-row">
          <div className="card stat-card"><span>Cursos en progreso</span><b className="mono">{inProgress.length}</b></div>
          <div className="card stat-card"><span>Certificados obtenidos</span><b className="mono">{completed.length}</b></div>
          <div className="card stat-card"><span>Evaluaciones pendientes</span><b className="mono">{pendingTests.length}</b></div>
          <div className="card stat-card"><span>Cursos inscritos</span><b className="mono">{courses?.length || 0}</b></div>
        </div>
      )}

      <div className="dash-grid">
        <div className="card" style={{ padding: 22 }}>
          <div className="section-title">Continuar aprendiendo</div>
          {loading && <p style={{ color: 'var(--text-dim)' }}>Cargando…</p>}
          {!loading && inProgress.length === 0 && (
            <p style={{ color: 'var(--text-dim)' }}>No tienes cursos en progreso. <Link to="/courses">Explora el catálogo →</Link></p>
          )}
          {inProgress.map((c) => (
            <div key={c.id} className="activity-row">
              <div className="activity-dot" style={{ background: 'var(--blueviolet)' }}></div>
              <div className="txt">
                <b><Link to={`/courses/${c.id}`}>{c.title}</Link></b>
                <div>{c.progress.completedModules.length} de {c.progress.totalModules} módulos · {c.progress.percent}%</div>
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="section-title">Evaluaciones</div>
          {loading && <p style={{ color: 'var(--text-dim)' }}>Cargando…</p>}
          {!loading && pendingTests.length === 0 && (
            <p style={{ color: 'var(--text-dim)' }}>No tienes evaluaciones pendientes.</p>
          )}
          {pendingTests.map((t) => (
            <div key={t.id} className="activity-row">
              <div className="activity-dot" style={{ background: 'var(--warning)' }}></div>
              <div className="txt">
                <b>{t.templateTitle}</b>
                <div>{t.status === 'in_progress' ? 'En progreso' : 'Sin iniciar'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
