import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from '../src/api.js'

const API_URL = import.meta.env.VITE_API_URL

function mockResponse({ status, body }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('api wrapper', () => {
  test('login POSTs JSON to /api/v1/auth/login and returns the parsed body', async () => {
    fetchMock.mockResolvedValue(mockResponse({ status: 200, body: { access_token: 'abc' } }))

    const result = await api.login('a@b.com', 'secret')

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/v1/auth/login`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
      }),
    )
    expect(result).toEqual({ access_token: 'abc' })
  })

  test('attaches the JWT as Authorization: Bearer <token>', async () => {
    fetchMock.mockResolvedValue(mockResponse({ status: 200, body: [] }))

    await api.listNotes('the-token')

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/v1/notes`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer the-token' }),
      }),
    )
  })

  test('does not set a body or Content-Type when there is no payload', async () => {
    fetchMock.mockResolvedValue(mockResponse({ status: 200, body: [] }))

    await api.listNotes('t')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.body).toBeUndefined()
    expect(init.headers['Content-Type']).toBeUndefined()
  })

  test('returns null for a 204 (delete)', async () => {
    fetchMock.mockResolvedValue(mockResponse({ status: 204, body: null }))

    expect(await api.deleteNote('t', 5)).toBeNull()
  })

  test('throws with status 404 and the backend detail message', async () => {
    fetchMock.mockResolvedValue(mockResponse({ status: 404, body: { detail: 'Note not found' } }))

    const error = await api.deleteNote('t', 999).then(
      () => null,
      (e) => e,
    )

    expect(error.status).toBe(404)
    expect(error.message).toBe('Note not found')
  })

  test('throws a status-based message when detail is not a string', async () => {
    fetchMock.mockResolvedValue(mockResponse({ status: 422, body: { detail: [{ msg: 'nope' }] } }))

    const error = await api.createNote('t', {}).then(
      () => null,
      (e) => e,
    )

    expect(error.status).toBe(422)
    expect(error.message).toBe('Request failed with status 422')
  })

  test('create sends POST to /api/v1/notes with the note body', async () => {
    fetchMock.mockResolvedValue(mockResponse({ status: 201, body: { id: 1, title: 'hi' } }))

    const result = await api.createNote('t', { title: 'hi', body: 'there' })

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/v1/notes`,
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result).toEqual({ id: 1, title: 'hi' })
  })
})
