import React from 'react'
import AppShell from '../components/AppShell'
import { getCurrentUser } from '../utils/auth'

export default function Dashboard(){
  const user = getCurrentUser()
  const firstName = (user?.name || user?.email || '').split(' ')[0]

  return (
    <AppShell active="home">
      <div className="panel-head">
        <div>
          <h2>Hola, {firstName}</h2>
          <p style={{ color: 'var(--text-dim)', marginTop: 4 }}>Esto es lo que tienes pendiente hoy.</p>
        </div>
      </div>

      <div className="info-note" style={{ margin: '16px 0' }}>
        <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></svg>
        <span>Los números de abajo todavía son de ejemplo — se conectarán a tus cursos y evaluaciones reales en la siguiente fase.</span>
      </div>

      <div className="stat-row">
        <div className="card stat-card"><span>Cursos en progreso</span><b className="mono">3</b><div className="delta">+1 esta semana</div></div>
        <div className="card stat-card"><span>Certificados obtenidos</span><b className="mono">5</b><div className="delta">+2 este mes</div></div>
        <div className="card stat-card"><span>Evaluaciones pendientes</span><b className="mono">1</b></div>
        <div className="card stat-card"><span>Horas de formación</span><b className="mono">18.5</b><div className="delta">+3.0 esta semana</div></div>
      </div>

      <div className="dash-grid">
        <div className="card" style={{ padding: 22 }}>
          <div className="section-title">Actividad reciente</div>
          <div className="activity-row"><div className="activity-dot" style={{ background: 'var(--success)' }}></div><div className="txt"><b>Completaste "Manual del colaborador"</b><div>Onboarding Linex Travel</div></div><time>hoy</time></div>
          <div className="activity-row"><div className="activity-dot" style={{ background: 'var(--blueviolet)' }}></div><div className="txt"><b>Nuevo documento publicado</b><div>Política de seguridad de la información · Tecnología</div></div><time>hace 3 días</time></div>
          <div className="activity-row"><div className="activity-dot" style={{ background: 'var(--warning)' }}></div><div className="txt"><b>Evaluación de onboarding pendiente</b><div>Vence en 4 días</div></div><time>hace 5 días</time></div>
          <div className="activity-row"><div className="activity-dot" style={{ background: 'var(--success)' }}></div><div className="txt"><b>Certificado emitido</b><div>Atención al cliente omnicanal</div></div><time>hace 1 semana</time></div>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="section-title">Recomendado para ti</div>
          <div className="reco-item"><div className="reco-thumb" style={{ background: 'linear-gradient(135deg,#5B5CFF,#6D28D9)' }}>✈️</div><div><b>Fundamentos de Travel Commerce</b><span>Producto · 1h 20min</span></div></div>
          <div className="reco-item"><div className="reco-thumb" style={{ background: 'linear-gradient(135deg,#E0B3FF,#5B5CFF)' }}>🧠</div><div><b>IA generativa en el día a día</b><span>Tecnología · 40 min</span></div></div>
          <div className="reco-item"><div className="reco-thumb" style={{ background: 'linear-gradient(135deg,#6D28D9,#17153B)' }}>🤝</div><div><b>Liderazgo y feedback efectivo</b><span>Habilidades blandas · 1h</span></div></div>
        </div>
      </div>
    </AppShell>
  )
}
