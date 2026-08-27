export function getCurrentUser() {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload
  } catch {
    return null
  }
}

export function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { authorization: `Bearer ${token}` } : {}
}
