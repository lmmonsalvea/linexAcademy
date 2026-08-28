import React, { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { apiFetch } from '../utils/api'
import { useAuth } from '../utils/auth'

const DOTS = ['#5B5CFF', '#6D28D9', '#E0B3FF', '#17153B', '#B4790F']
const canPublish = (role) => ['admin_area', 'knowledge_manager', 'superadmin'].includes(role)

export default function Knowledge() {
  const { profile, loading: authLoading } = useAuth()
  const [areas, setAreas] = useState([])
  const [selectedArea, setSelectedArea] = useState(null)
  const [documents, setDocuments] = useState([])
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showAreaForm, setShowAreaForm] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [newAreaDescription, setNewAreaDescription] = useState('')

  const [showDocForm, setShowDocForm] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocBlock, setNewDocBlock] = useState('')
  const [newDocContent, setNewDocContent] = useState('')
  const [newDocTags, setNewDocTags] = useState('')

  const [showVersionForm, setShowVersionForm] = useState(false)
  const [newVersionContent, setNewVersionContent] = useState('')

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
      setSelectedBlock(null)
      setSelectedDoc(null)
      return
    }
    setSelectedArea(area)
    setSelectedBlock(null)
    setSelectedDoc(null)
    setResults(null)
    setShowDocForm(false)
    apiFetch(`/api/knowledge/areas/${area.id}/documents`)
      .then(({ documents: docs }) => setDocuments(docs))
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
      setAreas((prev) => [...prev, area].sort((a, b) => a.name.localeCompare(b.name)))
      setNewAreaName('')
      setNewAreaDescription('')
      setShowAreaForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
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
        body: JSON.stringify({ title: newDocTitle, content: newDocContent, tags, block: newDocBlock || undefined }),
      })
      setDocuments((prev) => [...prev, doc])
      setSelectedBlock(doc.block || doc.title)
      setSelectedDoc(doc)
      setNewDocTitle('')
      setNewDocBlock('')
      setNewDocContent('')
      setNewDocTags('')
      setShowDocForm(false)
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

  // Group the expanded area's teams (documents) by the "bloque" they belong
  // to — a team with no block set is its own standalone block (server
  // already defaults `block` to the team's own title).
  const documentsByBlock = documents.reduce((acc, d) => {
    const block = d.block || d.title
    ;(acc[block] ||= []).push(d)
    return acc
  }, {})
  const blockNames = Object.keys(documentsByBlock)
  const teamsInSelectedBlock = selectedBlock ? documentsByBlock[selectedBlock] || [] : []

  return (
    <AppShell active="knowledge">
      <div className="panel-head">
        <div>
          <h2>Centro de conocimiento</h2>
          <div className="info-note" style={{ marginTop: 10 }}>
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></svg>
            <span>Documentos y procesos de cada área, con historial de versiones. Cualquiera puede consultarlos, sin necesidad de estar tomando ningún curso.</span>
          </div>
        </div>
        {canPublish(profile?.role) && (
          <div className="panel-head-actions">
            <button className="btn btn-ghost" onClick={() => setShowAreaForm((v) => !v)}>+ Área</button>
            <button
              className="btn btn-primary"
              disabled={!selectedArea}
              onClick={() => setShowDocForm((v) => !v)}
            >
              + Publicar equipo
            </button>
          </div>
        )}
      </div>

      {error && <div className="info-note" style={{ margin: '16px 0' }}><span>{error}</span></div>}

      {showAreaForm && (
        <form onSubmit={createArea} className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div className="section-title">Nueva área</div>
          <input
            placeholder="Nombre del área"
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
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>Crear área</button>
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
          <datalist id="kb-block-suggestions">
            {blockNames.map((b) => <option key={b} value={b} />)}
          </datalist>
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
              <button className={`kb-area ${selectedArea?.id === a.id ? 'on' : ''}`} onClick={() => openArea(a)}>
                <span className="dot" style={{ background: DOTS[i % DOTS.length] }}></span>
                {a.name}
                <svg className="kb-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={selectedArea?.id === a.id ? 'M6 15l6-6 6 6' : 'M9 6l6 6-6 6'} />
                </svg>
              </button>
              {selectedArea?.id === a.id && (
                <div className="kb-block-list">
                  {blockNames.map((block) => (
                    <button
                      key={block}
                      className={`kb-block-item ${selectedBlock === block ? 'on' : ''}`}
                      onClick={() => openBlock(block)}
                    >
                      {block}
                    </button>
                  ))}
                  {blockNames.length === 0 && <p className="kb-empty">Sin bloques todavía.</p>}
                </div>
              )}
            </div>
          ))}
          {areas.length === 0 && <p className="kb-empty">Aún no hay áreas.</p>}
        </div>

        <div className="kb-col">
          {selectedBlock ? (
            <>
              <div className="kb-block-label">{selectedBlock}</div>
              {teamsInSelectedBlock.map((d) => (
                <button key={d.id} className={`kb-team ${selectedDoc?.id === d.id ? 'on' : ''}`} onClick={() => openDoc(d)}>
                  <span>{d.title}</span>
                  <em>v{d.currentVersion || 1}</em>
                </button>
              ))}
            </>
          ) : (
            <p className="kb-empty">Selecciona un bloque para ver sus equipos de trabajo.</p>
          )}
        </div>

        <div className="kb-reader">
          {selectedDoc ? (
            <>
              <h3>{selectedDoc.title}</h3>
              <div className="kb-reader-meta">
                <span>✍️ {latestVersion?.updatedByEmail || 'sin especificar'}</span>
                <span>🕓 versión {selectedDoc.currentVersion || 1}</span>
                {canPublish(profile?.role) && (
                  <button className="btn-text" onClick={() => setShowVersionForm((v) => !v)}>Nueva versión</button>
                )}
              </div>

              {showVersionForm && (
                <form onSubmit={addVersion} className="card" style={{ padding: 16, marginBottom: 18 }}>
                  <textarea
                    placeholder="Contenido de la nueva versión"
                    value={newVersionContent}
                    onChange={(e) => setNewVersionContent(e.target.value)}
                    rows={6}
                    style={{ display: 'block', width: '100%', marginBottom: 10 }}
                  />
                  <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>Guardar versión</button>
                </form>
              )}

              <div className="kb-reader-body">{selectedDoc.content}</div>
            </>
          ) : (
            <p className="kb-empty">Selecciona un equipo de trabajo para leerlo.</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
