import assert from 'node:assert/strict'

const API_URL = process.env.VITE_API_URL ?? 'http://localhost:8000/api'
const API_SERVER_URL = API_URL.replace(/\/api\/?$/, '')
const PASSWORD = 'password123'
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = response.status === 204 ? null : await response.json().catch(() => null)
  return { response, data }
}

async function createUser(label) {
  const email = `api-${label}-${stamp}@example.com`
  const registration = await request('/v1/auth/register', {
    method: 'POST', body: { email, password: PASSWORD },
  })
  assert.equal(registration.response.status, 201)
  const login = await request('/v1/auth/login', {
    method: 'POST', body: { email, password: PASSWORD },
  })
  assert.equal(login.response.status, 200)
  return { email, token: login.data.access_token }
}

const health = await fetch(`${API_SERVER_URL}/health`)
assert.equal(health.status, 200)

const owner = await createUser('owner')
const stranger = await createUser('stranger')
console.log('1. Health, registration, and real JWT login OK')

const duplicate = await request('/v1/auth/register', {
  method: 'POST', body: { email: owner.email, password: PASSWORD },
})
assert.equal(duplicate.response.status, 409)
assert.equal(duplicate.data.detail, 'Email already registered')

const unauthorized = await request('/v1/notes')
assert.equal(unauthorized.response.status, 401)
console.log('2. Real 409 and 401 responses OK')

const created = await request('/v1/notes', {
  method: 'POST', token: owner.token, body: { title: 'Integration note', body: 'stored in PostgreSQL' },
})
assert.equal(created.response.status, 201)
assert.equal(created.data.title, 'Integration note')

const listed = await request('/v1/notes', { token: owner.token })
assert.equal(listed.response.status, 200)
assert.ok(listed.data.some((note) => note.id === created.data.id))
console.log('3. Real create and list against PostgreSQL OK')

const updated = await request(`/v1/notes/${created.data.id}`, {
  method: 'PUT', token: owner.token, body: { title: 'Updated integration note' },
})
assert.equal(updated.response.status, 200)
assert.equal(updated.data.title, 'Updated integration note')
assert.equal(updated.data.body, 'stored in PostgreSQL')

const hiddenFromStranger = await request(`/v1/notes/${created.data.id}`, {
  token: stranger.token,
})
assert.equal(hiddenFromStranger.response.status, 404)
console.log('4. Real partial update and ownership isolation (404, not 403) OK')

const deleted = await request(`/v1/notes/${created.data.id}`, {
  method: 'DELETE', token: owner.token,
})
assert.equal(deleted.response.status, 204)

const deletedAgain = await request(`/v1/notes/${created.data.id}`, {
  method: 'DELETE', token: owner.token,
})
assert.equal(deletedAgain.response.status, 404)
assert.equal(deletedAgain.data.detail, 'Note not found')
console.log('5. Real delete (204) and stale delete (404) OK')

console.log('\nALL REAL API INTEGRATION CHECKS PASSED')
