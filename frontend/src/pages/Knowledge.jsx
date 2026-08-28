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
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [posts, setPosts] = useState([])
  const [selectedPost, setSelectedPost] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showAreaForm, setShowAreaForm] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [newAreaDescription, setNewAreaDescription] = useState('')

  const [showBlockForm, setShowBlockForm] = useState(false)
  const [newBlockName, setNewBlockName] = useState('')

  const [showTeamForm, setShowTeamForm] = useState(false)
  const [newTeamTitle, setNewTeamTitle] = useState('')
  const [newTeamBlock, setNewTeamBlock] = useState('')

  const [showPostForm, setShowPostForm] = useState(false)
  const [newPostTitle, setNewPostTitle] = useState('')
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostTags, setNewPostTags] = useState('')
  const [newPostVisibility, setNewPostVisibility] = useState('private')
  const [newPostShared, setNewPostShared] = useState('')

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

  const [editingPostMeta, setEditingPostMeta] = useState(false)
  const [postMetaTitle, setPostMetaTitle] = useState('')
  const [postMetaVisibility, setPostMetaVisibility] = useState('private')
  const [postMetaShared, setPostMetaShared] = useState('')

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
  // blocks — it no longer immediately opens a team.
  const openArea = (area) => {
    if (selectedArea?.id === area.id) {
      // Clicking the already-expanded area again collapses it.
      setSelectedArea(null)
      setDocuments([])
      setBlocks([])
      setSelectedBlock(null)
      setSelectedTeam(null)
      setPosts([])
      setSelectedPost(null)
      return
    }
    setSelectedArea(area)
    setSelectedBlock(null)
    setSelectedTeam(null)
    setPosts([])
    setSelectedPost(null)
    setResults(null)
    setShowTeamForm(false)
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
    setSelectedTeam(null)
    setPosts([])
    setSelectedPost(null)
    setShowTeamForm(false)
  }

  // Clicking a team (column 2) loads its independent posts into column 3.
  const openTeam = (team) => {
    setSelectedTeam(team)
    setSelectedPost(null)
    setShowPostForm(false)
    apiFetch(`/api/knowledge/documents/${team.id}/posts`)
      .then(({ posts: list }) => setPosts(list))
      .catch((err) => setError(err.message))
  }

  const openPost = (post) => {
    setShowVersionForm(false)
    setEditingPostMeta(false)
    apiFetch(`/api/knowledge/posts/${post.id}`)
      .then((full) => setSelectedPost(full))
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

  const openSearchResult = (result) => {
    setShowVersionForm(false)
    setEditingPostMeta(false)
    apiFetch(`/api/knowledge/posts/${result.id}`)
      .then((full) => {
        setSelectedPost(full)
        setSelectedTeam({ id: result.teamId })
        setPosts([])
      })
      .catch((err) => setError(err.message))
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

  const createTeam = async (e) => {
    e.preventDefault()
    if (!selectedArea || !newTeamTitle.trim()) return
    setSaving(true)
    try {
      const team = await apiFetch(`/api/knowledge/areas/${selectedArea.id}/documents`, {
        method: 'POST',
        body: JSON.stringify({ title: newTeamTitle, block: newTeamBlock || undefined }),
      })
      setDocuments((prev) => [...prev, team])
      const finalBlock = team.block || team.title
      setBlocks((prev) => (prev.includes(finalBlock) ? prev : [...prev, finalBlock]))
      setSelectedBlock(finalBlock)
      openTeam(team)
      setNewTeamTitle('')
      setNewTeamBlock('')
      setShowTeamForm(false)
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
    setTeamMetaTitle(selectedTeam.title)
    setTeamMetaBlock(selectedTeam.block || selectedTeam.title)
    setTeamMetaAreaId(selectedTeam.areaId || selectedArea?.id || '')
    setEditingTeam(true)
  }

  const saveTeamMeta = async (e) => {
    e.preventDefault()
    if (!selectedTeam) return
    setSaving(true)
    try {
      const patch = { title: teamMetaTitle.trim(), block: teamMetaBlock.trim(), areaId: teamMetaAreaId }
      const updated = await apiFetch(`/api/knowledge/documents/${selectedTeam.id}/meta`, { method: 'PATCH', body: JSON.stringify(patch) })
      setSelectedTeam(updated)
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
          setSelectedTeam(null)
          setSelectedBlock(null)
          setPosts([])
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

  const createPost = async (e) => {
    e.preventDefault()
    if (!selectedTeam || !newPostTitle.trim() || !newPostContent.trim()) return
    setSaving(true)
    try {
      const tags = newPostTags.split(',').map((t) => t.trim()).filter(Boolean)
      const sharedWithEmails = newPostShared.split(',').map((t) => t.trim()).filter(Boolean)
      const post = await apiFetch(`/api/knowledge/documents/${selectedTeam.id}/posts`, {
        method: 'POST',
        body: JSON.stringify({ title: newPostTitle, content: newPostContent, tags, visibility: newPostVisibility, sharedWithEmails }),
      })
      setPosts((prev) => [...prev, post])
      setSelectedPost(post)
      setNewPostTitle('')
      setNewPostContent('')
      setNewPostTags('')
      setNewPostVisibility('private')
      setNewPostShared('')
      setShowPostForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const movePost = async (index, direction) => {
    const otherIndex = index + direction
    if (otherIndex < 0 || otherIndex >= posts.length) return
    const reordered = [...posts]
    ;[reordered[index], reordered[otherIndex]] = [reordered[otherIndex], reordered[index]]
    setPosts(reordered)
    try {
      await apiFetch(`/api/knowledge/documents/${selectedTeam.id}/posts/reorder`, { method: 'PUT', body: JSON.stringify({ ids: reordered.map((p) => p.id) }) })
    } catch (err) {
      setError(err.message)
    }
  }

  const openPostMetaEdit = () => {
    setPostMetaTitle(selectedPost.title)
    setPostMetaVisibility(selectedPost.visibility || 'private')
    setPostMetaShared((selectedPost.sharedWithEmails || []).join(', '))
    setEditingPostMeta(true)
  }

  const savePostMeta = async (e) => {
    e.preventDefault()
    if (!selectedPost) return
    setSaving(true)
    try {
      const sharedWithEmails = postMetaShared.split(',').map((t) => t.trim()).filter(Boolean)
      const patch = { title: postMetaTitle.trim(), visibility: postMetaVisibility, sharedWithEmails }
      const updated = await apiFetch(`/api/knowledge/posts/${selectedPost.id}/meta`, { method: 'PATCH', body: JSON.stringify(patch) })
      setSelectedPost(updated)
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...patch } : p)))
      setEditingPostMeta(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deletePost = async () => {
    if (!selectedPost || !window.confirm(`¿Eliminar la publicación "${selectedPost.title}"? Esta acción no se puede deshacer.`)) return
    setSaving(true)
    try {
      await apiFetch(`/api/knowledge/posts/${selectedPost.id}`, { method: 'DELETE' })
      setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id))
      setSelectedPost(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const addVersion = async (e) => {
    e.preventDefault()
    if (!selectedPost || !newVersionContent.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/api/knowledge/posts/${selectedPost.id}/version`, {
        method: 'POST',
        body: JSON.stringify({ content: newVersionContent }),
      })
      const full = await apiFetch(`/api/knowledge/posts/${selectedPost.id}`)
      setSelectedPost(full)
      setPosts((prev) => prev.map((p) => (p.id === full.id ? { ...p, currentVersion: full.currentVersion } : p)))
      setNewVersionContent('')
      setShowVersionForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) return <div className="page-loading">Cargando…</div>

  const latestVersion = selectedPost?.versions?.[selectedPost.versions.length - 1]

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
            <span>Cada unidad de negocio tiene bloques, y cada bloque sus equipos de trabajo. Un equipo puede tener varias publicaciones independientes (ej. "Política de vacaciones", "Procesos disciplinarios") y cada una decide si es pública para toda la compañía, privada para su unidad/bloque, o compartida solo con personas puntuales.</span>
          </div>
        </div>
        {canPublish(profile?.role) && (
          <div className="panel-head-actions">
            <button className="btn btn-ghost" onClick={() => setShowAreaForm((v) => !v)}>+ Unidad de negocio</button>
            <button className="btn btn-ghost" disabled={!selectedArea} onClick={() => setShowBlockForm((v) => !v)}>+ Bloque</button>
            <button className="btn btn-primary" disabled={!selectedArea} onClick={() => setShowTeamForm((v) => !v)}>+ Equipo de trabajo</button>
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

      {showTeamForm && selectedArea && (
        <form onSubmit={createTeam} className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div className="section-title">Nuevo equipo de trabajo en {selectedArea.name}</div>
          <p style={{ color: 'var(--text-dim)', fontSize: '.82rem', margin: '4px 0 10px' }}>
            El equipo se crea vacío — después le agregas una o varias publicaciones, cada una con su propia visibilidad.
          </p>
          <input
            placeholder="Nombre del equipo de trabajo"
            value={newTeamTitle}
            onChange={(e) => setNewTeamTitle(e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: 10 }}
          />
          <input
            placeholder="Bloque al que pertenece (opcional — vacío si el equipo es su propio bloque)"
            value={newTeamBlock}
            onChange={(e) => setNewTeamBlock(e.target.value)}
            list="kb-block-suggestions"
            style={{ display: 'block', width: '100%', marginBottom: 10 }}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>Crear equipo</button>
        </form>
      )}

      <form onSubmit={search} style={{ maxWidth: 420, margin: '18px 0' }}>
        <div className="searchbox" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar publicaciones… (ej. vacaciones, seguridad)" />
        </div>
      </form>

      {results && (
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div className="section-title">Resultados de búsqueda ({results.length})</div>
          <ul className="list-plain">
            {results.map((d) => (
              <li key={d.id}>
                <button className="btn-text" onClick={() => openSearchResult(d)}>{d.title}</button>
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
                  <button className={`kb-team ${selectedTeam?.id === d.id ? 'on' : ''}`} onClick={() => openTeam(d)}>
                    <span>{d.title}</span>
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

        <div className="kb-col">
          {selectedTeam ? (
            <>
              <div className="kb-area-row">
                <div className="kb-block-label" style={{ padding: '6px 0 10px' }}>{selectedTeam.title}</div>
                {canPublish(profile?.role) && (
                  <button className="kb-edit-btn" title="Editar equipo" onClick={() => (editingTeam ? setEditingTeam(false) : openTeamEdit())}>✎</button>
                )}
              </div>
              {editingTeam && (
                <form onSubmit={saveTeamMeta} className="card" style={{ padding: 16, marginBottom: 12 }}>
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
                  <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>Guardar cambios</button>
                </form>
              )}

              {canPublish(profile?.role) && (
                <button className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }} onClick={() => setShowPostForm((v) => !v)}>
                  {showPostForm ? 'Cancelar' : '+ Publicación'}
                </button>
              )}

              {showPostForm && (
                <form onSubmit={createPost} className="card" style={{ padding: 16, marginBottom: 14 }}>
                  <div className="section-title">Nueva publicación en {selectedTeam.title}</div>
                  <input
                    placeholder="Título (ej. Política de vacaciones)"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    style={{ display: 'block', width: '100%', marginBottom: 10 }}
                  />
                  <textarea
                    placeholder="Contenido"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={6}
                    style={{ display: 'block', width: '100%', marginBottom: 10 }}
                  />
                  <input
                    placeholder="Etiquetas separadas por coma (opcional)"
                    value={newPostTags}
                    onChange={(e) => setNewPostTags(e.target.value)}
                    style={{ display: 'block', width: '100%', marginBottom: 10 }}
                  />
                  <div className="field">
                    <label>Visibilidad</label>
                    <select value={newPostVisibility} onChange={(e) => setNewPostVisibility(e.target.value)}>
                      <option value="private">Privado — solo esta unidad/bloque</option>
                      <option value="public">Público — toda la compañía</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Compartir además con personas específicas (opcional)</label>
                    <input
                      placeholder="correos separados por coma, ej. juan@ultragroupla.com"
                      value={newPostShared}
                      onChange={(e) => setNewPostShared(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>Publicar</button>
                </form>
              )}

              {posts.map((p, pi) => (
                <div key={p.id} className="kb-team-row">
                  <button className={`kb-team ${selectedPost?.id === p.id ? 'on' : ''}`} onClick={() => openPost(p)}>
                    <span>{p.title}{p.visibility === 'public' ? ' 🌐' : (p.sharedWithEmails || []).length ? ' 👤' : ''}</span>
                    <em>v{p.currentVersion || 1}</em>
                  </button>
                  {canPublish(profile?.role) && (
                    <>
                      <button className="kb-edit-btn" title="Mover arriba" disabled={pi === 0} onClick={() => movePost(pi, -1)}>↑</button>
                      <button className="kb-edit-btn" title="Mover abajo" disabled={pi === posts.length - 1} onClick={() => movePost(pi, 1)}>↓</button>
                    </>
                  )}
                </div>
              ))}
              {posts.length === 0 && !showPostForm && <p className="kb-empty">Este equipo aún no tiene publicaciones.</p>}
            </>
          ) : (
            <p className="kb-empty">Selecciona un equipo para ver sus publicaciones.</p>
          )}
        </div>

        <div className="kb-reader">
          {selectedPost ? (
            <>
              <div className="kb-area-row">
                <h3>{selectedPost.title}</h3>
                {canPublish(profile?.role) && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-text" onClick={() => (editingPostMeta ? setEditingPostMeta(false) : openPostMetaEdit())}>
                      {editingPostMeta ? 'Cerrar' : 'Editar'}
                    </button>
                    <button className="btn-text" onClick={deletePost} style={{ color: 'var(--danger, #c0392b)' }}>Eliminar</button>
                  </div>
                )}
              </div>
              <div className="kb-reader-meta">
                <span>✍️ {latestVersion?.updatedByEmail || 'sin especificar'}</span>
                <span>🕓 versión {selectedPost.currentVersion || 1}</span>
                <span>
                  {selectedPost.visibility === 'public'
                    ? '🌐 Público (toda la compañía)'
                    : '🔒 Privado (solo esta unidad/bloque)'}
                  {(selectedPost.sharedWithEmails || []).length > 0 && ` · 👤 compartido con ${selectedPost.sharedWithEmails.join(', ')}`}
                </span>
              </div>

              {editingPostMeta && (
                <form onSubmit={savePostMeta} className="card" style={{ padding: 16, marginBottom: 18 }}>
                  <div className="field"><label>Título</label>
                    <input value={postMetaTitle} onChange={(e) => setPostMetaTitle(e.target.value)} />
                  </div>
                  <div className="field"><label>Visibilidad</label>
                    <select value={postMetaVisibility} onChange={(e) => setPostMetaVisibility(e.target.value)}>
                      <option value="private">Privado — solo esta unidad/bloque</option>
                      <option value="public">Público — toda la compañía</option>
                    </select>
                  </div>
                  <div className="field"><label>Compartir además con personas específicas</label>
                    <input
                      placeholder="correos separados por coma"
                      value={postMetaShared}
                      onChange={(e) => setPostMetaShared(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>Guardar cambios</button>
                </form>
              )}

              <div className="kb-reader-body">{selectedPost.content}</div>

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
                      <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>Guardar como versión {(selectedPost.currentVersion || 1) + 1}</button>
                    </form>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="kb-empty">Selecciona una publicación para leerla.</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
