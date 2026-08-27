import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../utils/auth'

// Matches the pattern used by the other Linex apps on this same Firebase
// project (athena, marlo): Microsoft as the primary "team member" option,
// Google as a secondary SSO option — both already enabled on
// linexrewards-app, nothing extra to configure on either side. Access is
// still gated the same way regardless of provider: the backend's
// email-domain allowlist (backend/src/middleware/auth.js).
export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signInWithMicrosoft, signInWithGoogle } = useAuth()
  const [error, setError] = useState(location.state?.deniedReason || '')
  const [loadingProvider, setLoadingProvider] = useState(null)

  const handleSignIn = async (provider, signIn) => {
    setError('')
    setLoadingProvider(provider)
    try {
      await signIn()
      navigate('/')
    } catch (err) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('Ese correo ya tiene una cuenta con otro método de inicio de sesión. Prueba con el otro botón.')
      } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(`No se pudo iniciar sesión con ${provider}. Intenta de nuevo.`)
      }
    } finally {
      setLoadingProvider(null)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <Logo />
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', margin: '8px 0 20px' }}>
          Inicia sesión con tu cuenta corporativa
          <br />(@ultragroupla.com o @linextravel.com)
        </p>

        <button
          className="btn btn-primary btn-block"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          onClick={() => handleSignIn('Google', signInWithGoogle)}
          disabled={loadingProvider !== null}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          {loadingProvider === 'Google' ? 'Conectando…' : 'Iniciar sesión con Google'}
        </button>

        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          onClick={() => handleSignIn('Outlook', signInWithMicrosoft)}
          disabled={loadingProvider !== null}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#0364B8" d="M13 3h8v8h-8z" />
            <path fill="#0078D4" d="M13 3 3 5v6h10z" />
            <path fill="#28A8EA" d="M13 11h8v8h-8z" />
            <path fill="#0078D4" d="M3 11h10v6H3z" />
            <path fill="#fff" d="M8 8.2a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6zm0 5.3a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
          </svg>
          {loadingProvider === 'Outlook' ? 'Conectando…' : 'Iniciar sesión con Outlook'}
        </button>

        {error && <p className="auth-msg">{error}</p>}
        <p className="auth-links"><Link to="/">← Volver al inicio</Link></p>
      </div>
    </div>
  )
}
