import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { getCurrentUser } from '../utils/auth'

const API = 'http://localhost:3000'
const DOTS = ['#5B5CFF', '#6D28D9', '#E0B3FF', '#17153B', '#B4790F']
const canPublish = role => ['admin_area', 'knowledge_manager', 'superadmin'].includes(role)

export default function Knowledge(){
  const user = getCurrentUser()
  const [areas, setAreas] = useState([])
  const [selectedArea, setSelectedArea] = useState(null)
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)

  useEffect(() => {
    fetch(`${API}/areas`).then(r => r.json()).then(list => {
      setAreas(list)
      if (list[0]) openArea(list[0])
    }).catch(() => {})
  }, [])

  const openArea = (area) => {
    setSelectedArea(area)
    setSelectedDoc(null)
    setResults(null)
    fetch(`${API}/areas/${area._id}/documents`).then(r => r.json()).then(docs => {
      setDocuments(docs)
      if (docs[0]) openDoc(docs[0])
    }).catch(() => {})
  }

  const openDoc = (doc) => {
    fetch(`${API}/documents/${doc._id}`).then(r => r.json()).then(setSelectedDoc).catch(() => {})
  }

  const search = async (e) => {
    e.preventDefault()
    if (!query.trim()) { setResults(null); return }
    const r = await fetch(`${API}/search?q=${encodeURIComponent(query)}`)
    setResults(await r.json())
  }

  if (!user) return <Navigate to="/login" replace />

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
        {canPublish(user.role) && (
          <div className="panel-head-actions"><button className="btn btn-primary">+ Publicar documento</button></div>
        )}
      </div>

      <form onSubmit={search} style={{ maxWidth: 420, margin: '18px 0' }}>
        <div className="searchbox" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar documentos… (ej. vacaciones, seguridad)" />
        </div>
      </form>

      {results && (
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div className="section-title">Resultados de búsqueda ({results.length})</div>
          <ul className="list-plain">
            {results.map(d => <li key={d._id}><button className="btn-text" onClick={() => setSelectedDoc(d)}>{d.title}</button></li>)}
            {results.length === 0 && <li style={{ color: 'var(--text-dim)' }}>Sin resultados.</li>}
          </ul>
        </div>
      )}

      <div className="kb-grid">
        <div className="kb-col">
          {areas.map((a, i) => (
            <button key={a._id} className={`kb-area ${selectedArea?._id === a._id ? 'on' : ''}`} onClick={() => openArea(a)}>
              <span className="dot" style={{ background: DOTS[i % DOTS.length] }}></span>
              {a.name || a.title}
            </button>
          ))}
          {areas.length === 0 && <p className="kb-empty">Aún no hay áreas.</p>}
        </div>

        <div className="kb-col">
          {documents.map(d => (
            <button key={d._id} className={`kb-doc ${selectedDoc?._id === d._id ? 'on' : ''}`} onClick={() => openDoc(d)}>
              <b>{d.title}</b>
              <span>v{d.currentVersion || 1}</span>
            </button>
          ))}
          {selectedArea && documents.length === 0 && <p className="kb-empty">Esta área aún no tiene documentos.</p>}
        </div>

        <div className="kb-reader">
          {selectedDoc ? (
            <>
              <h3>{selectedDoc.title}</h3>
              <div className="kb-reader-meta">
                <span>✍️ {selectedDoc.author || 'sin especificar'}</span>
                <span>🕓 versión {selectedDoc.currentVersion || 1}</span>
              </div>
              <div className="kb-reader-body">{selectedDoc.content}</div>
            </>
          ) : (
            <p className="kb-empty">Selecciona un documento para leerlo.</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
