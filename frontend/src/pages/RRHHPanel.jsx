import React from 'react'
import { Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { getCurrentUser } from '../utils/auth'

export default function RRHHPanel(){
  const user = getCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  if (!['admin_rrhh', 'superadmin'].includes(user.role)) {
    return <AppShell active="rrhh"><p>Esta sección es solo para Admin RRHH y Superadmin.</p></AppShell>
  }

  return (
    <AppShell active="rrhh">
      <div className="panel-head">
        <div>
          <h2>Panel RRHH</h2>
          <div className="info-note" style={{ marginTop: 10 }}>
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></svg>
            <span>Datos de ejemplo — se conectará a los resultados reales de <code>exams_service</code> en la siguiente fase.</span>
          </div>
        </div>
      </div>
      <div className="stat-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="card stat-card"><span>Evaluaciones este mes</span><b className="mono">47</b></div>
        <div className="card stat-card"><span>Promedio general</span><b className="mono">78%</b></div>
        <div className="card stat-card"><span>Tasa de aprobación</span><b className="mono">86%</b><div className="delta">+4pts vs. mes anterior</div></div>
      </div>
      <div className="card" style={{ padding: 22 }}>
        <div className="section-title">Resultados recientes por candidato</div>
        <div className="scrollx">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.86rem' }}>
            <thead><tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}><th style={{ padding: '8px 0' }}>Candidato</th><th>Proceso</th><th>Puntaje</th><th>Estado</th></tr></thead>
            <tbody>
              <tr style={{ borderTop: '1px solid var(--border-soft)' }}><td style={{ padding: '10px 0' }}>Elena Empleado</td><td>Onboarding</td><td className="mono">—</td><td><span className="pill pill-warning">Pendiente</span></td></tr>
              <tr style={{ borderTop: '1px solid var(--border-soft)' }}><td style={{ padding: '10px 0' }}>Marco Salinas</td><td>Ascenso · Soporte N2</td><td className="mono">91%</td><td><span className="pill pill-success">Aprobado</span></td></tr>
              <tr style={{ borderTop: '1px solid var(--border-soft)' }}><td style={{ padding: '10px 0' }}>Julia Restrepo</td><td>Ingreso · Ventas</td><td className="mono">64%</td><td><span className="pill pill-warning">En revisión</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
