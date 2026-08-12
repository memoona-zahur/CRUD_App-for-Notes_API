const API_URL = import.meta.env.VITE_API_URL

if (!API_URL) {
  throw new Error('VITE_API_URL is not set. Copy .env.example to .env and set it to your API base URL.')
}

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) return null

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const detail = data?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : `Request failed with status ${response.status}`
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return data
}

export const api = {
  register: (email, password) =>
    request('/v1/auth/register', { method: 'POST', body: { email, password } }),
  login: (email, password) =>
    request('/v1/auth/login', { method: 'POST', body: { email, password } }),
  listNotes: (token) => request('/v1/notes', { token }),
  createNote: (token, note) =>
    request('/v1/notes', { method: 'POST', token, body: note }),
  updateNote: (token, id, note) =>
    request(`/v1/notes/${id}`, { method: 'PUT', token, body: note }),
  deleteNote: (token, id) =>
    request(`/v1/notes/${id}`, { method: 'DELETE', token }),
}
