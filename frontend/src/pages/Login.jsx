import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

export default function Login(){
  const navigate = useNavigate()
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [msg,setMsg]=useState('')

  const submit=async e=>{
    e.preventDefault()
    const res=await fetch('http://localhost:5000/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})})
    const j=await res.json()
    if(res.ok){
      localStorage.setItem('token',j.token)
      navigate('/')
    } else setMsg(j.error||'Error')
  }

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <Logo />
        <div className="auth-tabs">
          <span className="on">Iniciar sesión</span>
          <Link to="/register">Crear cuenta</Link>
        </div>
        <form onSubmit={submit}>
          <div className="field"><label>Correo corporativo</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu.nombre@ultragroupla.com" /></div>
          <div className="field"><label>Contraseña</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
          <button className="btn btn-primary btn-block">Entrar</button>
        </form>
        {msg && <p className="auth-msg">{msg}</p>}
        <p className="auth-links"><Link to="/">← Volver al inicio</Link></p>
      </div>
    </div>
  )
}
