import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../utils/auth'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signInWithMicrosoft } = useAuth()
  const [error, setError] = useState(location.state?.deniedReason || '')
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithMicrosoft()
      navigate('/')
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('No se pudo iniciar sesión con Microsoft. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <Logo />
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', margin: '8px 0 20px' }}>
          Inicia sesión con tu cuenta corporativa de Microsoft
          <br />(@ultragroupla.com o @linextravel.com)
        </p>
        <button className="btn btn-primary btn-block" onClick={handleSignIn} disabled={loading}>
          {loading ? 'Conectando…' : 'Iniciar sesión con Microsoft'}
        </button>
        {error && <p className="auth-msg">{error}</p>}
        <p className="auth-links"><Link to="/">← Volver al inicio</Link></p>
      </div>
    </div>
  )
}
