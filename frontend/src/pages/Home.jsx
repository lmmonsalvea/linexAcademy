import React from 'react'
import Landing from './Landing'
import Dashboard from './Dashboard'
import { useAuth } from '../utils/auth'

export default function Home() {
  const { firebaseUser, profile, loading } = useAuth()
  if (loading) return <div className="page-loading">Cargando…</div>
  return firebaseUser && profile ? <Dashboard /> : <Landing />
}
