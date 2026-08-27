import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Logo from '../components/Logo'

export default function Verify(){
  const [params] = useSearchParams()
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setStatus('missing'); return }
    fetch(`http://localhost:5000/verify?token=${encodeURIComponent(token)}`)
      .then(r => r.ok ? setStatus('ok') : setStatus('error'))
      .catch(() => setStatus('error'))
  }, [params])

  return (
    <div className="auth-screen">
      <div className="auth-box" style={{ textAlign: 'center' }}>
        <Logo />
        <div style={{ marginTop: 26 }}>
          {status === 'checking' && <p>Verificando tu cuenta...</p>}
          {status === 'ok' && <>
            <span className="pill pill-success" style={{ marginBottom: 14 }}>Cuenta verificada</span>
            <p>Ya puedes <Link to="/login">iniciar sesión</Link>.</p>
          </>}
          {status === 'missing' && <p>Falta el token de verificación en el enlace.</p>}
          {status === 'error' && <p>El token de verificación no es válido o ya fue usado.</p>}
        </div>
      </div>
    </div>
  )
}
