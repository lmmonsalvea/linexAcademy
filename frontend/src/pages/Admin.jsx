import React, { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import AssignmentPicker from '../components/AssignmentPicker'
import { apiFetch } from '../utils/api'
import { useAuth } from '../utils/auth'

const ROLES = ['empleado', 'instructor', 'admin_area', 'superadmin']
const ROLE_LABELS = {
  empleado: 'Empleado',
  instructor: 'Instructor',
  admin_area: 'Admin Área',
  superadmin: 'Superadmin',
}

const POSITION_TITLES = ['lead', 'manager', 'vp', 'svp']
const POSITION_LABELS = { lead: 'Lead', manager: 'Manager', vp: 'Vicepresidente (VP)', svp: 'SVP' }

export default function Admin() {
  const { profile } = useAuth()
  const [users, setUsers] = useState(null)
  const [areas, setAreas] = useState([])
  const [error, setError] = useState('')
  const [savingUid, setSavingUid] = useState(null)
  const [assigningUid, setAssigningUid] = useState(null)
  const [draftAssignment, setDraftAssignment] = useState({ assignedAreaIds: [], assignedBlocks: [], assignedTeamIds: [] })
  const [draftPositionTitle, setDraftPositionTitle] = useState('')

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
      assignedTeamIds: u.team ? [u.team] : [],
    })
    setDraftPositionTitle(u.positionTitle || '')
  }

  const saveAssignment = async (uid) => {
    setSavingUid(uid)
    try {
      const areaId = draftAssignment.assignedAreaIds[0] || null
      const block = draftAssignment.assignedBlocks[0] || null
      const team = draftAssignment.assignedTeamIds[0] || null
      const positionTitle = draftPositionTitle || null
      await apiFetch(`/api/users/${uid}/assignment`, { method: 'PATCH', body: JSON.stringify({ areaId, block, team, positionTitle }) })
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, areaId, block, team, positionTitle } : u)))
      setAssigningUid(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingUid(null)
    }
  }

  const toggleStatus = async (u) => {
    setSavingUid(u.uid)
    try {
      const disabled = !u.disabled
      await apiFetch(`/api/users/${u.uid}/status`, { method: 'PATCH', body: JSON.stringify({ disabled }) })
      setUsers((prev) => prev.map((x) => (x.uid === u.uid ? { ...x, disabled } : x)))
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingUid(null)
    }
  }

  const removeUser = async (u) => {
    if (!window.confirm(`¿Eliminar definitivamente a ${u.email}? Esta acción no se puede deshacer.`)) return
    setSavingUid(u.uid)
    try {
      await apiFetch(`/api/users/${u.uid}`, { method: 'DELETE' })
      setUsers((prev) => prev.filter((x) => x.uid !== u.uid))
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
            <tr><th>Correo</th><th>Nombre</th><th>Rol</th><th>Unidad / Bloque</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {users === null && <tr><td colSpan={6}>Cargando…</td></tr>}
            {users?.map((u) => {
              const isSelf = u.uid === profile?.uid
              return (
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
                    {u.areaId
                      ? `${areaName(u.areaId) || u.areaId}${u.block ? ` · ${u.block}` : ''}${u.positionTitle ? ` · ${POSITION_LABELS[u.positionTitle] || u.positionTitle}` : ''}`
                      : 'Sin asignar'}
                  </td>
                  <td>
                    {u.disabled
                      ? <span className="pill pill-locked">Inactivo</span>
                      : <span className="pill pill-success">Activo</span>}
                  </td>
                  <td style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn-text" onClick={() => openAssignment(u)}>
                      {assigningUid === u.uid ? 'Cerrar' : 'Asignar'}
                    </button>
                    <button
                      className="btn-text"
                      disabled={isSelf || savingUid === u.uid}
                      title={isSelf ? 'No puedes inactivar tu propia cuenta' : ''}
                      onClick={() => toggleStatus(u)}
                    >
                      {u.disabled ? 'Activar' : 'Inactivar'}
                    </button>
                    <button
                      className="btn-text"
                      style={{ color: 'var(--danger, #C0392B)' }}
                      disabled={isSelf || savingUid === u.uid}
                      title={isSelf ? 'No puedes eliminar tu propia cuenta' : ''}
                      onClick={() => removeUser(u)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
                {assigningUid === u.uid && (
                  <tr>
                    <td colSpan={6} style={{ background: 'var(--surface-2)' }}>
                      <div style={{ padding: 14, maxWidth: 420 }}>
                        <AssignmentPicker
                          single
                          assignedAreaIds={draftAssignment.assignedAreaIds}
                          assignedBlocks={draftAssignment.assignedBlocks}
                          assignedTeamIds={draftAssignment.assignedTeamIds}
                          onChange={setDraftAssignment}
                        />
                        <div className="field" style={{ marginTop: 10 }}>
                          <label>Cargo (opcional — informativo, no cambia permisos)</label>
                          <select value={draftPositionTitle} onChange={(e) => setDraftPositionTitle(e.target.value)}>
                            <option value="">Sin especificar</option>
                            {POSITION_TITLES.map((p) => <option key={p} value={p}>{POSITION_LABELS[p]}</option>)}
                          </select>
                        </div>
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
            )})}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
