import React, { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import AssignmentPicker from '../components/AssignmentPicker'
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
  const [areas, setAreas] = useState([])
  const [error, setError] = useState('')
  const [savingUid, setSavingUid] = useState(null)
  const [assigningUid, setAssigningUid] = useState(null)
  const [draftAssignment, setDraftAssignment] = useState({ assignedAreaIds: [], assignedBlocks: [] })

  const load = () => {
    apiFetch('/api/users').then((r) => setUsers(r.users)).catch((err) => setError(err.message))
    apiFetch('/api/knowledge/areas').then((r) => setAreas(r.areas)).catch(() => {})
  }

  useEffect(load, [])

  const areaName = (areaId) => areas.find((a) => a.id === areaId)?.name || null

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

  const openAssignment = (u) => {
    setAssigningUid(u.uid)
    setDraftAssignment({
      assignedAreaIds: u.areaId ? [u.areaId] : [],
      assignedBlocks: u.block ? [u.block] : [],
    })
  }

  const saveAssignment = async (uid) => {
    setSavingUid(uid)
    try {
      const areaId = draftAssignment.assignedAreaIds[0] || null
      const block = draftAssignment.assignedBlocks[0] || null
      await apiFetch(`/api/users/${uid}/assignment`, { method: 'PATCH', body: JSON.stringify({ areaId, block }) })
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, areaId, block } : u)))
      setAssigningUid(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingUid(null)
    }
  }

  return (
    <AppShell active="admin">
      <div className="panel-head"><h2>Administración de usuarios</h2></div>
      <div className="info-note" style={{ margin: '10px 0 16px' }}>
        <span>La unidad de negocio y el bloque de una persona determinan qué cursos asignados le aparecen en el catálogo.</span>
      </div>
      {error && <div className="info-note" style={{ margin: '16px 0' }}><span>{error}</span></div>}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr><th>Correo</th><th>Nombre</th><th>Rol</th><th>Unidad / Bloque</th><th></th></tr>
          </thead>
          <tbody>
            {users === null && <tr><td colSpan={5}>Cargando…</td></tr>}
            {users?.map((u) => (
              <React.Fragment key={u.uid}>
                <tr>
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
                  <td style={{ color: 'var(--text-dim)', fontSize: '.82rem' }}>
                    {u.areaId ? `${areaName(u.areaId) || u.areaId}${u.block ? ` · ${u.block}` : ''}` : 'Sin asignar'}
                  </td>
                  <td>
                    <button className="btn-text" onClick={() => openAssignment(u)}>
                      {assigningUid === u.uid ? 'Cerrar' : 'Asignar'}
                    </button>
                  </td>
                </tr>
                {assigningUid === u.uid && (
                  <tr>
                    <td colSpan={5} style={{ background: 'var(--surface-2)' }}>
                      <div style={{ padding: 14, maxWidth: 420 }}>
                        <AssignmentPicker
                          single
                          assignedAreaIds={draftAssignment.assignedAreaIds}
                          assignedBlocks={draftAssignment.assignedBlocks}
                          onChange={setDraftAssignment}
                        />
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: 10 }}
                          disabled={savingUid === u.uid}
                          onClick={() => saveAssignment(u.uid)}
                        >
                          {savingUid === u.uid ? 'Guardando…' : 'Guardar asignación'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
