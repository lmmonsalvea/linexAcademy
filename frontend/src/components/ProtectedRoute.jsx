import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../utils/auth'

export default function ProtectedRoute({ children, roles }) {
  const { firebaseUser, profile, loading, error } = useAuth()

  if (loading) return <div className="page-loading">Cargando…</div>
  if (!firebaseUser) return <Navigate to="/login" replace />
  if (error || !profile) {
    return <Navigate to="/login" replace state={{ deniedReason: error }} />
  }
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />

  return children
}
