import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/auth'
import Logo from './Logo'

const ROLE_LABELS = {
  empleado: 'Empleado',
  instructor: 'Instructor',
  admin_area: 'Admin Área',
  admin_rrhh: 'Admin RRHH',
  knowledge_manager: 'Knowledge Manager',
  superadmin: 'Superadmin'
}

const NAV = [
  { key: 'home', to: '/', label: 'Inicio', icon: <path d="M4 11 12 4l8 7M6 10v9h12v-9" /> },
  { key: 'courses', to: '/courses', label: 'Cursos', icon: <><path d="M4 6h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3V6Z" /><path d="M18 9h2v11h-2" /></> },
  { key: 'knowledge', to: '/knowledge', label: 'Centro de conocimiento', icon: <><path d="M5 4h9l5 5v11H5z" /><path d="M14 4v5h5M8.5 13h7M8.5 16.5h7" /></> },
  { key: 'exams', to: '/exams', label: 'Evaluaciones', icon: <><path d="M9 3h6l1 3H8l1-3Z" /><path d="M6 6h12v15H6Z" /><path d="M9.5 11.5 11 13l3.5-3.5" /></> }
]

function initialsOf(user) {
  const base = user?.displayName || user?.email || '??'
  return base.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function AppShell({ active, children }) {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const user = profile
  const canSeeRRHH = ['admin_rrhh', 'superadmin'].includes(user?.role)
  const canSeeAdmin = user?.role === 'superadmin'

  const logout = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/"><Logo size="sm" /></Link>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <Link key={n.key} to={n.to} className={`nav-item ${active === n.key ? 'on' : ''}`}>
              <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{n.icon}</svg>
              {n.label}
            </Link>
          ))}
          {canSeeRRHH && (
            <Link to="/rrhh" className={`nav-item ${active === 'rrhh' ? 'on' : ''}`}>
              <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 20v-1a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v1M15 4.2a3.2 3.2 0 1 1 0 6.2M17 20v-1a4.2 4.2 0 0 0-2.3-3.7" />
                <circle cx="9" cy="9" r="3.4" />
              </svg>
              Panel RRHH
            </Link>
          )}
          {canSeeAdmin && (
            <Link to="/admin" className={`nav-item ${active === 'admin' ? 'on' : ''}`}>
              <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
              </svg>
              Administración
            </Link>
          )}
        </nav>
        <div className="sidebar-foot">
          <div className="user-card">
            <div className="avatar" style={{ background: 'var(--blueviolet)' }}>{initialsOf(user)}</div>
            <div className="who">
              <b>{user?.name || user?.email}</b>
              <span>{ROLE_LABELS[user?.role] || user?.role}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 10 }} onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="searchbox">
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input placeholder="Buscar cursos, documentos, evaluaciones…" disabled />
          </div>
        </header>
        <section className="panel">{children}</section>
      </div>
    </div>
  )
}
