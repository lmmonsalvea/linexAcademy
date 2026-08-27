import React, { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { apiFetch } from '../utils/api'

const ROLES = ['empleado', 'instructor', 'admin_area', 'admin_rrhh', 'knowledge_manager', 'superadmin']
const ROLE_LABELS = {
  empleado: 'Empleado',
  instructor: 'Instructor',
  admin_area: 'Admin Área',
  admin_rrhh: 'Admin RRHH',
  knowledge_manager: 'Knowledge Manager',
  superadmin: 'Superadmin',
}

export default function Admin() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [savingUid, setSavingUid] = useState(null)

  const load = () => {
    apiFetch('/api/users').then((r) => setUsers(r.users)).catch((err) => setError(err.message))
  }

  useEffect(load, [])

  const changeRole = async (uid, role) => {
    setSavingUid(uid)
    try {
      await apiFetch(`/api/users/${uid}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)))
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingUid(null)
    }
  }

  return (
    <AppShell active="admin">
      <div className="panel-head"><h2>Administración de usuarios</h2></div>
      {error && <div className="info-note" style={{ margin: '16px 0' }}><span>{error}</span></div>}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr><th>Correo</th><th>Nombre</th><th>Rol</th></tr>
          </thead>
          <tbody>
            {users === null && <tr><td colSpan={3}>Cargando…</td></tr>}
            {users?.map((u) => (
              <tr key={u.uid}>
                <td>{u.email}</td>
                <td>{u.displayName}</td>
                <td>
                  <select
                    value={u.role}
                    disabled={savingUid === u.uid}
                    onChange={(e) => changeRole(u.uid, e.target.value)}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
