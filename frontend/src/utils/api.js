import { auth } from '../firebase'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

// Shared fetch wrapper: attaches the current user's Firebase ID token as a
// Bearer header (verified server-side on every request — see
// backend/src/middleware/auth.js) and normalizes error responses.
export async function apiFetch(path, options = {}) {
  const user = auth.currentUser
  const token = user ? await user.getIdToken() : null

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || res.statusText)
  }
  return res.status === 204 ? null : res.json()
}

// For endpoints that return a binary file (PDF certificate, CSV export):
// fetches with the auth header and returns a Blob the caller can open/save.
export async function apiFetchBlob(path) {
  const user = auth.currentUser
  const token = user ? await user.getIdToken() : null
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || res.statusText)
  }
  return res.blob()
}

export { BASE_URL }
