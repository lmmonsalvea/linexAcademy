import React, { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { apiFetch } from '../utils/api'
import { useAuth } from '../utils/auth'

const DOTS = ['#5B5CFF', '#6D28D9', '#E0B3FF', '#17153B', '#B4790F']
const canPublish = (role) => ['admin_area', 'superadmin'].includes(role)

export default function Knowledge() {
  const { profile, loading: authLoading } = useAuth()
  const [areas, setAreas] = useState([])
  const [selectedArea, setSelectedArea] = useState(null)
  const [documents, setDocuments] = useState([])
  const [blocks, setBlocks] = useState([])
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showAreaForm, setShowAreaForm] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [newAreaDescription, setNewAreaDescription] = useState('')

  const [showBlockForm, setShowBlockForm] = useState(false)
  const [newBlockName, setNewBlockName] = useState('')

  const [showDocForm, setShowDocForm] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocBlock, setNewDocBlock] = useState('')
  const [newDocContent, setNewDocContent] = useState('')
  const [newDocTags, setNewDocTags] = useState('')
  const [newDocVisibility, setNewDocVisibility] = useState('private')

  const [showVersionForm, setShowVersionForm] = useState(false)
  const [newVersionContent, setNewVersionContent] = useState('')

  const [renamingAreaId, setRenamingAreaId] = useState(null)
  const [renameAreaValue, setRenameAreaValue] = useState('')

  const [renamingBlock, setRenamingBlock] = useState(false)
  const [renameBlockValue, setRenameBlockValue] = useState('')

  const [editingTeam, setEditingTeam] = useState(false)
  const [teamMetaTitle, setTeamMetaTitle] = useState('')
  const [teamMetaBlock, setTeamMetaBlock] = useState('')
  const [teamMetaAreaId, setTeamMetaAreaId] = useState('')
  const [teamMetaVisibility, setTeamMetaVisibility] = useState('private')

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch('/api/knowledge/areas')
      .then(({ areas: list }) => {
        setAreas(list)
        if (list[0]) openArea(list[0])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Clicking a business unit expands it in place (column 1) to show its
  // blocks — it no longer immediately opens a document.
  const openArea = (area) => {
    if (selectedArea?.id === area.id) {
      // Clicking the already-expanded area again collapses it.
      setSelectedArea(null)
      setDocuments([])
      setBlocks([])
      setSelectedBlock(null)
      setSelectedDoc(null)
      return
    }
    setSelectedArea(area)
    setSelectedBlock(null)
    setSelectedDoc(null)
    setResults(null)
    setShowDocForm(false)
    setShowBlockForm(false)
    Promise.all([
      apiFetch(`/api/knowledge/areas/${area.id}/documents`),
      apiFetch(`/api/knowledge/areas/${area.id}/blocks`),
    ])
      .then(([docsRes, blocksRes]) => {
        setDocuments(docsRes.documents)
        setBlocks(blocksRes.blocks)
      })
      .catch((err) => setError(err.message))
  }

  // Clicking a block (nested under its expanded area) shows that block's
  // teams in column 2.
  const openBlock = (block) => {
    setSelectedBlock(block)
    setSelectedDoc(null)
    setShowDocForm(false)
  }

  const openDoc = (doc) => {
    setShowVersionForm(false)
    apiFetch(`/api/knowledge/documents/${doc.id}`)
      .then((full) => setSelectedDoc(full))
      .catch((err) => setError(err.message))
  }

  const search = async (e) => {
    e.preventDefault()
    if (!query.trim()) { setResults(null); return }
    try {
      const { documents: found } = await apiFetch(`/api/knowledge/search?q=${encodeURIComponent(query)}`)
      setResults(found)
    } catch (err) {
      setError(err.message)
    }
  }

  const createArea = async (e) => {
    e.preventDefault()
    if (!newAreaName.trim()) return
    setSaving(true)
    try {
      const area = await apiFetch('/api/knowledge/areas', {
        method: 'POST',
        body: JSON.stringify({ name: newAreaName, description: newAreaDescription }),
      })
      setAreas((prev) => [...prev, area])
      setNewAreaName('')
      setNewAreaDescription('')
      setShowAreaForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const moveArea = async (index, direction) => {
    const otherIndex = index + direction
    if (otherIndex < 0 || otherIndex >= areas.length) return
    const reordered = [...areas]
    ;[reordered[index], reordered[otherIndex]] = [reordered[otherIndex], reordered[index]]
    setAreas(reordered)
    try {
      await apiFetch('/api/knowledge/areas/reorder', { method: 'PUT', body: JSON.stringify({ ids: reordered.map((a) => a.id) }) })
    } catch (err) {
      setError(err.message)
    }
  }

  const createBlock = async (e) => {
    e.preventDefault()
    if (!selectedArea || !newBlockName.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/api/knowledge/areas/${selectedArea.id}/blocks`, {
        method: 'POST',
        body: JSON.stringify({ name: newBlockName.trim() }),
      })
      setBlocks((prev) => [...prev, newBlockName.trim()])
      setNewBlockName('')
      setShowBlockForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const moveBlock = async (index, direction) => {
    const otherIndex = index + direction
    if (otherIndex < 0 || otherIndex >= blocks.length) return
    const reordered = [...blocks]
    ;[reordered[index], reordered[otherIndex]] = [reordered[otherIndex], reordered[index]]
    setBlocks(reordered)
    try {
      await apiFetch(`/api/knowledge/areas/${selectedArea.id}/blocks/reorder`, { method: 'PUT', body: JSON.stringify({ names: reordered }) })
    } catch (err) {
      setError(err.message)
    }
  }

  const createDocument = async (e) => {
    e.preventDefault()
    if (!selectedArea || !newDocTitle.trim() || !newDocContent.trim()) return
    setSaving(true)
    try {
      const tags = newDocTags.split(',').map((t) => t.trim()).filter(Boolean)
      const doc = await apiFetch(`/api/knowledge/areas/${selectedArea.id}/documents`, {
        method: 'POST',
        body: JSON.stringify({ title: newDocTitle, content: newDocContent, tags, block: newDocBlock || undefined, visibility: newDocVisibility }),
      })
      setDocuments((prev) => [...prev, doc])
      const finalBlock = doc.block || doc.title
      setBlocks((prev) => (prev.includes(finalBlock) ? prev : [...prev, finalBlock]))
      setSelectedBlock(finalBlock)
      setSelectedDoc(doc)
      setNewDocTitle('')
      setNewDocBlock('')
      setNewDocContent('')
      setNewDocTags('')
      setNewDocVisibility('private')
      setShowDocForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const moveTeam = async (index, direction) => {
    const list = teamsInSelectedBlock
    const otherIndex = index + direction
    if (otherIndex < 0 || otherIndex >= list.length) return
    const reordered = [...list]
    ;[reordered[index], reordered[otherIndex]] = [reordered[otherIndex], reordered[index]]
    setDocuments((prev) => {
      const others = prev.filter((d) => (d.block || d.title) !== selectedBlock)
      return [...others, ...reordered]
    })
    try {
      await apiFetch(`/api/knowledge/areas/${selectedArea.id}/documents/reorder`, { method: 'PUT', body: JSON.stringify({ ids: reordered.map((d) => d.id) }) })
    } catch (err) {
      setError(err.message)
    }
  }

  const renameArea = async (e) => {
    e.preventDefault()
    if (!renamingAreaId || !renameAreaValue.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/api/knowledge/areas/${renamingAreaId}`, { method: 'PATCH', body: JSON.stringify({ name: renameAreaValue.trim() }) })
      setAreas((prev) => prev.map((a) => (a.id === renamingAreaId ? { ...a, name: renameAreaValue.trim() } : a)))
      if (selectedArea?.id === renamingAreaId) setSelectedArea((prev) => ({ ...prev, name: renameAreaValue.trim() }))
      setRenamingAreaId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const renameBlock = async (e) => {
    e.preventDefault()
    if (!selectedArea || !selectedBlock || !renameBlockValue.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/api/knowledge/areas/${selectedArea.id}/blocks/rename`, {
        method: 'POST',
        body: JSON.stringify({ oldName: selectedBlock, newName: renameBlockValue.trim() }),
      })
      setDocuments((prev) => prev.map((d) => ((d.block || d.title) === selectedBlock ? { ...d, block: renameBlockValue.trim() } : d)))
      setBlocks((prev) => prev.map((b) => (b === selectedBlock ? renameBlockValue.trim() : b)))
      setSelectedBlock(renameBlockValue.trim())
      setRenamingBlock(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const openTeamEdit = () => {
    setTeamMetaTitle(selectedDoc.title)
    setTeamMetaBlock(selectedDoc.block || selectedDoc.title)
    setTeamMetaAreaId(selectedDoc.areaId || selectedArea?.id || '')
    setTeamMetaVisibility(selectedDoc.visibility || 'private')
    setEditingTeam(true)
  }

  const saveTeamMeta = async (e) => {
    e.preventDefault()
    if (!selectedDoc) return
    setSaving(true)
    try {
      const patch = { title: teamMetaTitle.trim(), block: teamMetaBlock.trim(), areaId: teamMetaAreaId, visibility: teamMetaVisibility }
      const updated = await apiFetch(`/api/knowledge/documents/${selectedDoc.id}/meta`, { method: 'PATCH', body: JSON.stringify(patch) })
      setSelectedDoc(updated)
      setEditingTeam(false)
      if (selectedArea) {
        const [{ documents: docs }, { blocks: freshBlocks }] = await Promise.all([
          apiFetch(`/api/knowledge/areas/${selectedArea.id}/documents`),
          apiFetch(`/api/knowledge/areas/${selectedArea.id}/blocks`),
        ])
        setDocuments(docs)
        setBlocks(freshBlocks)
        // The team may have moved to a different block, or out of this area entirely.
        if (patch.areaId !== selectedArea.id) {
          setSelectedDoc(null)
          setSelectedBlock(null)
        } else {
          setSelectedBlock(patch.block)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const addVersion = async (e) => {
    e.preventDefault()
    if (!selectedDoc || !newVersionContent.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/api/knowledge/documents/${selectedDoc.id}/version`, {
        method: 'POST',
        body: JSON.stringify({ content: newVersionContent }),
      })
      const full = await apiFetch(`/api/knowledge/documents/${selectedDoc.id}`)
      setSelectedDoc(full)
      setDocuments((prev) => prev.map((d) => (d.id === full.id ? { ...d, currentVersion: full.currentVersion } : d)))
      setNewVersionContent('')
      setShowVersionForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) return <div className="page-loading">Cargando…</div>

  const latestVersion = selectedDoc?.versions?.[selectedDoc.versions.length - 1]

  const documentsByBlock = documents.reduce((acc, d) => {
    const block = d.block || d.title
    ;(acc[block] ||= []).push(d)
    return acc
  }, {})
  const teamsInSelectedBlock = selectedBlock ? documentsByBlock[selectedBlock] || [] : []

  return (
    <AppShell active="knowledge">
      <div className="panel-head">
        <div>
          <h2>Centro de conocimiento</h2>
          <div className="info-note" style={{ marginTop: 10 }}>
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></svg>
            <span>Cada unidad de negocio tiene bloques, y cada bloque sus equipos de trabajo. Un equipo es "público" (cualquiera en la compañía lo puede leer) o "privado" (solo su propia unidad/bloque).</span>
          </div>
        </div>
        {canPublish(profile?.role) && (
          <div className="panel-head-actions">
            <button className="btn btn-ghost" onClick={() => setShowAreaForm((v) => !v)}>+ Unidad de negocio</button>
            <button className="btn btn-ghost" disabled={!selectedArea} onClick={() => setShowBlockForm((v) => !v)}>+ Bloque</button>
            <button className="btn btn-primary" disabled={!selectedArea} onClick={() => setShowDocForm((v) => !v)}>+ Equipo de trabajo</button>
          </div>
        )}
      </div>

      {error && <div className="info-note" style={{ margin: '16px 0' }}><span>{error}</span></div>}

      <datalist id="kb-block-suggestions">
        {blocks.map((b) => <option key={b} value={b} />)}
      </datalist>

      {showAreaForm && (
        <form onSubmit={createArea} className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div className="section-title">Nueva unidad de negocio</div>
          <input
            placeholder="Nombre de la unidad"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: 10 }}
          />
          <input
            placeholder="Descripción (opcional)"
            value={newAreaDescription}
            onChange={(e) => setNewAreaDescription(e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: 10 }}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>Crear unidad</button>
        </form>
      )}

      {showBlockForm && selectedArea && (
        <form onSubmit={createBlock} className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div className="section-title">Nuevo bloque en {selectedArea.name}</div>
          <p style={{ color: 'var(--text-dim)', fontSize: '.82rem', margin: '4px 0 10px' }}>
            Crea el bloque vacío primero; luego agrégale equipos de trabajo desde "+ Equipo de trabajo".
          </p>
          <input
            placeholder="Nombre del bloque"
            value={newBlockName}
            onChange={(e) => setNewBlockName(e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: 10 }}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>Crear bloque</button>
        </form>
      )}

      {showDocForm && selectedArea && (
        <form onSubmit={createDocument} className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div className="section-title">Nuevo equipo de trabajo en {selectedArea.name}</div>
          <input
            placeholder="Nombre del equipo de trabajo"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: 10 }}
          />
          <input
            placeholder="Bloque al que pertenece (opcional — vacío si el equipo es su propio bloque)"
            value={newDocBlock}
            onChange={(e) => setNewDocBlock(e.target.value)}
            list="kb-block-suggestions"
            style={{ display: 'block', width: '100%', marginBottom: 10 }}
          />
          <textarea
            placeholder="Contenido"
            value={newDocContent}
            onChange={(e) => setNewDocContent(e.target.value)}
            rows={6}
            style={{ display: 'block', width: '100%', marginBottom: 10 }}
          />
          <input
            placeholder="Etiquetas separadas por coma (opcional)"
            value={newDocTags}
            onChange={(e) => setNewDocTags(e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: 10 }}
          />
          <div className="field">
            <label>Visibilidad</label>
            <select value={newDocVisibility} onChange={(e) => setNewDocVisibility(e.target.value)}>
              <option value="private">Privado — solo su propia unidad/bloque</option>
              <option value="public">Público — toda la compañía</option>
            </select>
          </div>
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>Publicar</button>
        </form>
      )}

      <form onSubmit={search} style={{ maxWidth: 420, margin: '18px 0' }}>
        <div className="searchbox" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar documentos… (ej. vacaciones, seguridad)" />
        </div>
      </form>

      {results && (
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div className="section-title">Resultados de búsqueda ({results.length})</div>
          <ul className="list-plain">
            {results.map((d) => (
              <li key={d.id}>
                <button className="btn-text" onClick={() => openDoc(d)}>{d.title}</button>
              </li>
            ))}
            {results.length === 0 && <li style={{ color: 'var(--text-dim)' }}>Sin resultados.</li>}
          </ul>
        </div>
      )}

      <div className="kb-grid">
        <div className="kb-col">
          {areas.map((a, i) => (
            <div key={a.id}>
              <div className="kb-area-row">
                <button className={`kb-area ${selectedArea?.id === a.id ? 'on' : ''}`} onClick={() => openArea(a)}>
                  <span className="dot" style={{ background: DOTS[i % DOTS.length] }}></span>
                  {a.name}
                  <svg className="kb-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={selectedArea?.id === a.id ? 'M6 15l6-6 6 6' : 'M9 6l6 6-6 6'} />
                  </svg>
                </button>
                {canPublish(profile?.role) && (
                  <>
                    <button className="kb-edit-btn" title="Mover arriba" disabled={i === 0} onClick={() => moveArea(i, -1)}>↑</button>
                    <button className="kb-edit-btn" title="Mover abajo" disabled={i === areas.length - 1} onClick={() => moveArea(i, 1)}>↓</button>
                    <button
                      className="kb-edit-btn"
                      title="Renombrar unidad"
                      onClick={() => { setRenamingAreaId(a.id); setRenameAreaValue(a.name) }}
                    >✎</button>
                  </>
                )}
              </div>
              {renamingAreaId === a.id && (
                <form onSubmit={renameArea} className="kb-rename-form">
                  <input value={renameAreaValue} onChange={(e) => setRenameAreaValue(e.target.value)} autoFocus />
                  <button className="btn-text" type="submit" disabled={saving}>Guardar</button>
                  <button className="btn-text" type="button" onClick={() => setRenamingAreaId(null)}>Cancelar</button>
                </form>
              )}
              {selectedArea?.id === a.id && (
                <div className="kb-block-list">
                  {blocks.map((block, bi) => (
                    <div key={block} className="kb-block-row">
                      <button
                        className={`kb-block-item ${selectedBlock === block ? 'on' : ''}`}
                        onClick={() => openBlock(block)}
                      >
                        {block}
                      </button>
                      {canPublish(profile?.role) && (
                        <>
                          <button className="kb-edit-btn" title="Mover arriba" disabled={bi === 0} onClick={() => moveBlock(bi, -1)}>↑</button>
                          <button className="kb-edit-btn" title="Mover abajo" disabled={bi === blocks.length - 1} onClick={() => moveBlock(bi, 1)}>↓</button>
                        </>
                      )}
                    </div>
                  ))}
                  {blocks.length === 0 && <p className="kb-empty">Sin bloques todavía.</p>}
                </div>
              )}
            </div>
          ))}
          {areas.length === 0 && <p className="kb-empty">Aún no hay áreas.</p>}
        </div>

        <div className="kb-col">
          {selectedBlock ? (
            <>
              <div className="kb-area-row">
                <div className="kb-block-label" style={{ padding: '6px 0 10px' }}>{selectedBlock}</div>
                {canPublish(profile?.role) && (
                  <button
                    className="kb-edit-btn"
                    title="Renombrar bloque"
                    onClick={() => { setRenamingBlock((v) => !v); setRenameBlockValue(selectedBlock) }}
                  >✎</button>
                )}
              </div>
              {renamingBlock && (
                <form onSubmit={renameBlock} className="kb-rename-form">
                  <input value={renameBlockValue} onChange={(e) => setRenameBlockValue(e.target.value)} autoFocus />
                  <button className="btn-text" type="submit" disabled={saving}>Guardar</button>
                  <button className="btn-text" type="button" onClick={() => setRenamingBlock(false)}>Cancelar</button>
                </form>
              )}
              {teamsInSelectedBlock.map((d, ti) => (
                <div key={d.id} className="kb-team-row">
                  <button className={`kb-team ${selectedDoc?.id === d.id ? 'on' : ''}`} onClick={() => openDoc(d)}>
                    <span>{d.title}{d.visibility === 'public' ? ' 🌐' : ''}</span>
                    <em>v{d.currentVersion || 1}</em>
                  </button>
                  {canPublish(profile?.role) && (
                    <>
                      <button className="kb-edit-btn" title="Mover arriba" disabled={ti === 0} onClick={() => moveTeam(ti, -1)}>↑</button>
                      <button className="kb-edit-btn" title="Mover abajo" disabled={ti === teamsInSelectedBlock.length - 1} onClick={() => moveTeam(ti, 1)}>↓</button>
                    </>
                  )}
                </div>
              ))}
              {teamsInSelectedBlock.length === 0 && <p className="kb-empty">Este bloque aún no tiene equipos — usa "+ Equipo de trabajo" arriba.</p>}
            </>
          ) : (
            <p className="kb-empty">Selecciona un bloque para ver sus equipos de trabajo.</p>
          )}
        </div>

        <div className="kb-reader">
          {selectedDoc ? (
            <>
              <div className="kb-area-row">
                <h3>{selectedDoc.title}</h3>
                {canPublish(profile?.role) && (
                  <button className="btn-text" onClick={() => (editingTeam ? setEditingTeam(false) : openTeamEdit())}>
                    {editingTeam ? 'Cerrar' : 'Editar equipo'}
                  </button>
                )}
              </div>
              <div className="kb-reader-meta">
                <span>✍️ {latestVersion?.updatedByEmail || 'sin especificar'}</span>
                <span>🕓 versión {selectedDoc.currentVersion || 1}</span>
                <span>{selectedDoc.visibility === 'public' ? '🌐 Público (toda la compañía)' : '🔒 Privado (solo esta unidad/bloque)'}</span>
              </div>

              {editingTeam && (
                <form onSubmit={saveTeamMeta} className="card" style={{ padding: 16, marginBottom: 18 }}>
                  <div className="field"><label>Nombre del equipo</label>
                    <input value={teamMetaTitle} onChange={(e) => setTeamMetaTitle(e.target.value)} />
                  </div>
                  <div className="field"><label>Bloque</label>
                    <input value={teamMetaBlock} onChange={(e) => setTeamMetaBlock(e.target.value)} list="kb-block-suggestions" />
                  </div>
                  <div className="field"><label>Unidad de negocio</label>
                    <select value={teamMetaAreaId} onChange={(e) => setTeamMetaAreaId(e.target.value)}>
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Visibilidad</label>
                    <select value={teamMetaVisibility} onChange={(e) => setTeamMetaVisibility(e.target.value)}>
                      <option value="private">Privado — solo su propia unidad/bloque</option>
                      <option value="public">Público — toda la compañía</option>
                    </select>
                  </div>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>Guardar cambios</button>
                </form>
              )}

              <div className="kb-reader-body">{selectedDoc.content}</div>

              {canPublish(profile?.role) && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--border-soft)' }}>
                  <button className="btn-text" onClick={() => setShowVersionForm((v) => !v)}>
                    {showVersionForm ? 'Cancelar' : 'Actualizar contenido'}
                  </button>
                  <p style={{ color: 'var(--text-dim)', fontSize: '.78rem', margin: '4px 0 0' }}>
                    Reemplaza el texto de arriba por uno nuevo. La versión anterior queda guardada en el historial (no se pierde).
                  </p>
                  {showVersionForm && (
                    <form onSubmit={addVersion} className="card" style={{ padding: 16, marginTop: 10 }}>
                      <textarea
                        placeholder="Contenido nuevo (reemplaza el actual)"
                        value={newVersionContent}
                        onChange={(e) => setNewVersionContent(e.target.value)}
                        rows={6}
                        style={{ display: 'block', width: '100%', marginBottom: 10 }}
                      />
                      <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>Guardar como versión {(selectedDoc.currentVersion || 1) + 1}</button>
                    </form>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="kb-empty">Selecciona un equipo de trabajo para leerlo.</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
