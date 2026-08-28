import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

// Checkbox picker for "which business unit / block / specific team does
// this apply to" — the three independently-sufficient scopes a course can
// target (assigning to an area means everyone in it; a block narrows to
// that block; a team narrows to just that team), or — via `single` — the
// one area/block/team a single person belongs to (Admin.jsx).
export default function AssignmentPicker({ assignedAreaIds, assignedBlocks, assignedTeamIds, onChange, single = false }) {
  const [areas, setAreas] = useState([])
  const [blocksByArea, setBlocksByArea] = useState({})
  const [docsByArea, setDocsByArea] = useState({})

  useEffect(() => {
    apiFetch('/api/knowledge/areas').then(({ areas: list }) => setAreas(list)).catch(() => {})
  }, [])

  const loadBlocks = (areaId) => {
    if (!blocksByArea[areaId]) {
      apiFetch(`/api/knowledge/areas/${areaId}/blocks`)
        .then(({ blocks }) => setBlocksByArea((prev) => ({ ...prev, [areaId]: blocks })))
        .catch(() => {})
    }
    if (!docsByArea[areaId]) {
      apiFetch(`/api/knowledge/areas/${areaId}/documents`)
        .then(({ documents }) => setDocsByArea((prev) => ({ ...prev, [areaId]: documents })))
        .catch(() => {})
    }
  }

  const toggleArea = (areaId) => {
    if (single) {
      const next = assignedAreaIds[0] === areaId ? [] : [areaId]
      onChange({ assignedAreaIds: next, assignedBlocks: [], assignedTeamIds: [] })
      if (next.length) loadBlocks(areaId)
      return
    }
    const isOn = assignedAreaIds.includes(areaId)
    const nextAreaIds = isOn ? assignedAreaIds.filter((id) => id !== areaId) : [...assignedAreaIds, areaId]
    onChange({ assignedAreaIds: nextAreaIds, assignedBlocks, assignedTeamIds })
    if (!isOn) loadBlocks(areaId)
  }

  const toggleBlock = (block) => {
    if (single) {
      const next = assignedBlocks[0] === block ? [] : [block]
      onChange({ assignedAreaIds, assignedBlocks: next, assignedTeamIds: [] })
      return
    }
    const isOn = assignedBlocks.includes(block)
    const next = isOn ? assignedBlocks.filter((b) => b !== block) : [...assignedBlocks, block]
    onChange({ assignedAreaIds, assignedBlocks: next, assignedTeamIds })
  }

  const toggleTeam = (teamId) => {
    if (single) {
      const next = assignedTeamIds[0] === teamId ? [] : [teamId]
      onChange({ assignedAreaIds, assignedBlocks, assignedTeamIds: next })
      return
    }
    const isOn = assignedTeamIds.includes(teamId)
    const next = isOn ? assignedTeamIds.filter((t) => t !== teamId) : [...assignedTeamIds, teamId]
    onChange({ assignedAreaIds, assignedBlocks, assignedTeamIds: next })
  }

  return (
    <div className="assignment-picker">
      {areas.map((a) => {
        const areaChecked = assignedAreaIds.includes(a.id)
        return (
          <div key={a.id} className="assignment-area">
            <label className="assignment-row">
              <input type={single ? 'radio' : 'checkbox'} checked={areaChecked} onChange={() => toggleArea(a.id)} />
              {a.name}
            </label>
            {areaChecked && (
              <div className="assignment-blocks">
                {(blocksByArea[a.id] || []).map((b) => {
                  const blockChecked = assignedBlocks.includes(b)
                  const teamsInBlock = (docsByArea[a.id] || []).filter((d) => (d.block || d.title) === b)
                  return (
                    <div key={b}>
                      <label className="assignment-row assignment-row-sub">
                        <input type={single ? 'radio' : 'checkbox'} checked={blockChecked} onChange={() => toggleBlock(b)} />
                        {b}
                      </label>
                      {blockChecked && teamsInBlock.length > 0 && (
                        <div className="assignment-teams">
                          {teamsInBlock.map((d) => (
                            <label key={d.id} className="assignment-row assignment-row-sub2">
                              <input type={single ? 'radio' : 'checkbox'} checked={assignedTeamIds.includes(d.id)} onChange={() => toggleTeam(d.id)} />
                              {d.title}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                {blocksByArea[a.id] && blocksByArea[a.id].length === 0 && (
                  <p className="kb-empty" style={{ padding: '4px 10px' }}>Sin bloques en esta área.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
      {areas.length === 0 && <p className="kb-empty">Aún no hay áreas en el centro de conocimiento.</p>}
    </div>
  )
}
