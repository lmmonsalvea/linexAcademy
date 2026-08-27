import React from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

export default function Landing(){
  return (
    <div>
      <div className="landing-hero">
        <svg className="hero-globe" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
          <g fill="none" stroke="#6D28D9" strokeOpacity=".22">
            <path d="M120 620 Q 420 380 760 480 T 1150 320" strokeDasharray="2 10" strokeWidth="2" />
            <path d="M60 260 Q 380 200 640 300 T 1180 180" strokeDasharray="2 10" strokeWidth="2" />
          </g>
          <g fill="#5B5CFF" fillOpacity=".35">
            <circle cx="120" cy="620" r="4" /><circle cx="760" cy="480" r="4" /><circle cx="1150" cy="320" r="4" />
            <circle cx="60" cy="260" r="4" /><circle cx="640" cy="300" r="4" /><circle cx="1180" cy="180" r="4" />
          </g>
        </svg>

        <div className="hero-nav">
          <Logo size="lg" />
          <div className="actions">
            <Link to="/login" className="btn btn-ghost">Iniciar sesión</Link>
            <Link to="/register" className="btn btn-primary">Crear cuenta</Link>
          </div>
        </div>

        <div className="hero-body">
          <div className="hero-copy">
            <span className="eyebrow">Plataforma interna · Linex Travel &amp; UltraGroup</span>
            <h1>Todo lo que necesitas para <em>crecer aquí</em>, en un solo lugar.</h1>
            <p>Cursos, evaluaciones y el centro de conocimiento de la compañía, reunidos en una sola plataforma pensada para nuestro equipo — sin buscar en diez carpetas distintas.</p>
            <div className="hero-cta">
              <Link to="/register" className="btn btn-primary">Entrar a la plataforma →</Link>
              <Link to="/login" className="btn-text">Ya tengo una cuenta</Link>
            </div>
            <div className="hero-stats">
              <div><b className="mono">32</b><span>cursos activos</span></div>
              <div><b className="mono">6</b><span>áreas de conocimiento</span></div>
              <div><b className="mono">94%</b><span>satisfacción interna</span></div>
            </div>
          </div>
          <div className="hero-panel">
            <div className="hero-mock">
              <div className="bar"><span></span><span></span><span></span></div>
              <div className="content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: '.92rem' }}>Hola, Elena 👋</b>
                  <span className="pill pill-accent">3 cursos activos</span>
                </div>
                <div className="card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="reco-thumb" style={{ background: 'linear-gradient(135deg,#5B5CFF,#6D28D9)' }}>🎓</div>
                  <div style={{ flex: 1 }}><b style={{ fontSize: '.86rem', display: 'block' }}>Onboarding Linex Travel</b><span style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>2 de 3 módulos · 66%</span></div>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: '66%' }}></div></div>
                <div className="card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="reco-thumb" style={{ background: 'linear-gradient(135deg,#E0B3FF,#6D28D9)' }}>📄</div>
                  <div style={{ flex: 1 }}><b style={{ fontSize: '.86rem', display: 'block' }}>Política de seguridad de la información</b><span style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>Tecnología · actualizado hace 3 días</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <svg className="wave-divider" viewBox="0 0 1440 90" preserveAspectRatio="none" style={{ height: 90 }}>
          <path d="M0 40 C 320 90 460 0 760 30 C 1060 60 1200 10 1440 40 L1440 90 L0 90 Z" fill="#F7F6FD" />
        </svg>
      </div>

      <div className="features">
        <div className="features-head">
          <h2>Cuatro piezas, una sola plataforma</h2>
          <p>Cada sección resuelve algo puntual — juntas cubren todo el ciclo de aprendizaje interno.</p>
        </div>
        <div className="feature-grid">
          <div className="card feature-card">
            <div className="fc-ic">🎓</div>
            <h3>Cursos</h3>
            <p>Vídeos, PDFs, paquetes SCORM y evaluaciones, organizados por módulos con progreso y certificado al terminar.</p>
          </div>
          <div className="card feature-card">
            <div className="fc-ic">📚</div>
            <h3>Centro de conocimiento</h3>
            <p>Documentos y procesos de cada área, con versiones y autoría — para no volver a preguntar "¿dónde está ese PDF?".</p>
          </div>
          <div className="card feature-card">
            <div className="fc-ic">📝</div>
            <h3>Evaluaciones</h3>
            <p>Pruebas para procesos de ingreso, ascenso o refuerzo, calificadas al instante con reporte por sección.</p>
          </div>
          <div className="card feature-card">
            <div className="fc-ic">🔐</div>
            <h3>Roles y permisos</h3>
            <p>Cada persona ve lo que le corresponde: un Instructor publica cursos, RRHH ve resultados, cualquiera busca documentación.</p>
          </div>
        </div>
      </div>

      <div className="landing-footer">
        <span>Linex Travel · UltraGroup — uso interno</span>
        <span>Linex Academy</span>
      </div>
    </div>
  )
}
