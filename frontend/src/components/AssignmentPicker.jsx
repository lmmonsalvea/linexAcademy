import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

// Checkbox picker for "which business units / blocks does this apply to".
// Used both for scoping a course (assignedAreaIds/assignedBlocks, multiple
// of each allowed) and — via `single` — for assigning one person to their
// own business unit/block (Admin.jsx).
export default function AssignmentPicker({ assignedAreaIds, assignedBlocks, onChange, single = false }) {
  const [areas, setAreas] = useState([])
  const [blocksByArea, setBlocksByArea] = useState({})

  useEffect(() => {
    apiFetch('/api/knowledge/areas').then(({ areas: list }) => setAreas(list)).catch(() => {})
  }, [])

  const loadBlocks = (areaId) => {
    if (blocksByArea[areaId]) return
    apiFetch(`/api/knowledge/areas/${areaId}/blocks`)
      .then(({ blocks }) => setBlocksByArea((prev) => ({ ...prev, [areaId]: blocks })))
      .catch(() => {})
  }

  const toggleArea = (areaId) => {
    if (single) {
      const next = assignedAreaIds[0] === areaId ? [] : [areaId]
      onChange({ assignedAreaIds: next, assignedBlocks: [] })
      if (next.length) loadBlocks(areaId)
      return
    }
    const isOn = assignedAreaIds.includes(areaId)
    const nextAreaIds = isOn ? assignedAreaIds.filter((id) => id !== areaId) : [...assignedAreaIds, areaId]
    onChange({ assignedAreaIds: nextAreaIds, assignedBlocks })
    if (!isOn) loadBlocks(areaId)
  }

  const toggleBlock = (block) => {
    if (single) {
      const next = assignedBlocks[0] === block ? [] : [block]
      onChange({ assignedAreaIds, assignedBlocks: next })
      return
    }
    const isOn = assignedBlocks.includes(block)
    const next = isOn ? assignedBlocks.filter((b) => b !== block) : [...assignedBlocks, block]
    onChange({ assignedAreaIds, assignedBlocks: next })
  }

  return (
    <div className="assignment-picker">
      {areas.map((a) => {
        const checked = assignedAreaIds.includes(a.id)
        return (
          <div key={a.id} className="assignment-area">
            <label className="assignment-row">
              <input type={single ? 'radio' : 'checkbox'} checked={checked} onChange={() => toggleArea(a.id)} />
              {a.name}
            </label>
            {checked && (
              <div className="assignment-blocks">
                {(blocksByArea[a.id] || []).map((b) => (
                  <label key={b} className="assignment-row assignment-row-sub">
                    <input type={single ? 'radio' : 'checkbox'} checked={assignedBlocks.includes(b)} onChange={() => toggleBlock(b)} />
                    {b}
                  </label>
                ))}
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
