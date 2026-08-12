import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppShell from '../src/AppShell.jsx'
import { ToastProvider } from '../src/components/Toasts.jsx'
import { api } from '../src/api.js'

vi.mock('../src/api.js', () => ({
  api: {
    listNotes: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
  },
}))

const token = 'test-token'
const note = {
  id: 1,
  title: 'Original title',
  body: 'Original body',
  created_at: '2026-08-12T12:00:00Z',
}

function renderApp(props = {}) {
  return render(
    <ToastProvider>
      <AppShell
        token={token}
        email="student@example.com"
        theme="light"
        onToggleTheme={() => {}}
        onLogout={() => {}}
        {...props}
      />
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AppShell state transitions', () => {
  test('loads notes once and filters them locally', async () => {
    api.listNotes.mockResolvedValue([note, { ...note, id: 2, title: 'Meeting notes' }])
    const user = userEvent.setup()

    renderApp()

    expect(await screen.findByRole('heading', { name: 'Original title' })).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox', { name: 'Search notes' }), 'meeting')
    expect(screen.getByRole('heading', { name: 'Meeting notes' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Original title' })).not.toBeInTheDocument()
    expect(api.listNotes).toHaveBeenCalledTimes(1)
  })

  test('creates a note and prepends it without a list refetch', async () => {
    api.listNotes.mockResolvedValue([note])
    api.createNote.mockResolvedValue({ ...note, id: 2, title: 'New title', body: 'New body' })
    const user = userEvent.setup()

    renderApp()
    await screen.findByRole('heading', { name: 'Original title' })
    await user.click(screen.getByRole('button', { name: 'New note' }))
    await user.type(screen.getByLabelText('Title'), 'New title')
    await user.type(screen.getByLabelText('Body'), 'New body')
    await user.click(screen.getByRole('button', { name: 'Create note' }))

    expect(await screen.findByRole('heading', { name: 'New title' })).toBeInTheDocument()
    expect(api.createNote).toHaveBeenCalledWith(token, { title: 'New title', body: 'New body' })
    expect(api.listNotes).toHaveBeenCalledTimes(1)
  })

  test('edits a pre-filled note and replaces it without a list refetch', async () => {
    api.listNotes.mockResolvedValue([note])
    api.updateNote.mockResolvedValue({ ...note, title: 'Updated title' })
    const user = userEvent.setup()

    renderApp()
    await screen.findByRole('heading', { name: 'Original title' })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Title')).toHaveValue('Original title')
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Updated title')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('heading', { name: 'Updated title' })).toBeInTheDocument()
    expect(api.updateNote).toHaveBeenCalledWith(token, 1, {
      title: 'Updated title', body: 'Original body',
    })
    expect(api.listNotes).toHaveBeenCalledTimes(1)
  })

  test('deletes after confirmation without refetching the list', async () => {
    api.listNotes.mockResolvedValue([note])
    api.deleteNote.mockResolvedValue(null)
    const user = userEvent.setup()

    renderApp()
    await screen.findByRole('heading', { name: 'Original title' })
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete note' }))

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Original title' })).not.toBeInTheDocument())
    expect(api.deleteNote).toHaveBeenCalledWith(token, 1)
    expect(api.listNotes).toHaveBeenCalledTimes(1)
  })

  test('handles a real-status 404 by removing the stale row and showing feedback', async () => {
    api.listNotes.mockResolvedValue([note])
    const error = new Error('Note not found')
    error.status = 404
    api.deleteNote.mockRejectedValue(error)
    const user = userEvent.setup()

    renderApp()
    await screen.findByRole('heading', { name: 'Original title' })
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete note' }))

    expect(await screen.findByText('Not found (404): Note not found')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Original title' })).not.toBeInTheDocument()
  })
})
