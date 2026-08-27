import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

const roles = [
  { value: 'empleado', label: 'Empleado (por defecto)' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'admin_area', label: 'Admin Área' },
  { value: 'admin_rrhh', label: 'Admin RRHH' },
  { value: 'knowledge_manager', label: 'Knowledge Manager' },
  { value: 'superadmin', label: 'Superadmin' }
]

export default function Register(){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [name,setName]=useState('')
  const [role,setRole]=useState('empleado')
  const [msg,setMsg]=useState('')
  const [verifyLink,setVerifyLink]=useState(null)

  const submit=async e=>{
    e.preventDefault()
    setVerifyLink(null)
    const res=await fetch('http://localhost:5000/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,name,role})})
    const j=await res.json()
    if(res.ok){
      setMsg('Registro exitoso. Confirma tu cuenta con el enlace de verificación.')
      setVerifyLink(`/verify?token=${j.verifyToken}`)
    } else setMsg(j.error||'Error')
  }

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <Logo />
        <div className="auth-tabs">
          <Link to="/login">Iniciar sesión</Link>
          <span className="on">Crear cuenta</span>
        </div>
        <form onSubmit={submit}>
          <div className="field"><label>Nombre</label><input value={name} onChange={e=>setName(e.target.value)} /></div>
          <div className="field"><label>Correo corporativo</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu.nombre@ultragroupla.com" /></div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            <small>8+ caracteres, una mayúscula y un número.</small>
          </div>
          <div className="field">
            <label>Rol</label>
            <select value={role} onChange={e=>setRole(e.target.value)}>
              {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <small>Temporal, mientras no exista un panel de administración para asignar roles.</small>
          </div>
          <small style={{ display: 'block', marginBottom: 14 }}>Solo correos @ultragroupla.com o @linextravel.com.</small>
          <button className="btn btn-primary btn-block">Crear mi cuenta</button>
        </form>
        {msg && <p className="auth-msg">{msg}</p>}
        {verifyLink && <p className="auth-msg">Dev: <Link to={verifyLink}>haz clic aquí para verificar tu cuenta</Link></p>}
        <p className="auth-links"><Link to="/">← Volver al inicio</Link></p>
      </div>
    </div>
  )
}
