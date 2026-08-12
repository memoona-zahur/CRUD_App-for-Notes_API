import { useEffect, useMemo, useState } from 'react'
import { api } from './api.js'
import Header from './components/Header.jsx'
import NoteCard from './components/NoteCard.jsx'
import NoteFormModal from './components/NoteFormModal.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import EmptyState from './components/EmptyState.jsx'
import { useToast } from './toast.js'
import { PlusIcon, SearchIcon } from './components/Icons.jsx'

function AppShell({ token, email, theme, onToggleTheme, onLogout }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const { push } = useToast()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await api.listNotes(token)
        if (!cancelled) setNotes(data)
      } catch (err) {
        if (!cancelled && err.status === 401) {
          onLogout('Your session has expired. Please log in again.')
        } else if (!cancelled) {
          push('error', err.message || 'Could not load notes. Please try again.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token, onLogout, push])

  function handleActionError(err) {
    if (err.status === 401) {
      onLogout('Your session has expired. Please log in again.')
      return
    }
    if (err.status === 404) {
      push('error', `Not found (404): ${err.message}`)
    } else {
      push('error', err.message)
    }
  }

  async function handleCreate(values) {
    setBusy(true)
    try {
      const created = await api.createNote(token, values)
      setNotes((prev) => [created, ...prev])
      setEditor(null)
      push('success', 'Note created')
    } catch (err) {
      handleActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdate(values) {
    setBusy(true)
    try {
      const updated = await api.updateNote(token, editor.note.id, values)
      setNotes((prev) => prev.map((note) => (note.id === updated.id ? updated : note)))
      setEditor(null)
      push('success', 'Note updated')
    } catch (err) {
      if (err.status === 404) {
        setNotes((prev) => prev.filter((note) => note.id !== editor.note.id))
        setEditor(null)
      }
      handleActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmDelete() {
    setBusy(true)
    try {
      await api.deleteNote(token, deleting.id)
      setNotes((prev) => prev.filter((note) => note.id !== deleting.id))
      setDeleting(null)
      push('success', 'Note deleted')
    } catch (err) {
      if (err.status === 404) {
        setNotes((prev) => prev.filter((note) => note.id !== deleting.id))
        setDeleting(null)
      }
      handleActionError(err)
    } finally {
      setBusy(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (note) => note.title.toLowerCase().includes(q) || note.body.toLowerCase().includes(q),
    )
  }, [notes, query])

  const hasQuery = query.trim() !== ''

  return (
    <div className="app">
      <Header email={email} theme={theme} onToggleTheme={onToggleTheme} onLogout={onLogout} />

      <main className="app-main">
        <div className="toolbar">
          <div>
            <h1>Your notes</h1>
            <p className="subtitle">
              {loading
                ? 'Loading…'
                : notes.length === 1
                  ? '1 note'
                  : `${notes.length} notes`}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setEditor({ mode: 'create' })}
          >
            <PlusIcon size={16} />
            <span>New note</span>
          </button>
        </div>

        <div className="search">
          <SearchIcon size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            aria-label="Search notes"
          />
        </div>

        {loading ? (
          <div className="note-grid" aria-label="Loading notes">
            {[0, 1, 2].map((i) => (
              <div className="skeleton-card" key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState searching={hasQuery} />
        ) : (
          <div className="note-grid">
            {filtered.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={(target) => setEditor({ mode: 'edit', note: target })}
                onDelete={setDeleting}
              />
            ))}
          </div>
        )}
      </main>

      {editor && (
        <NoteFormModal
          key={editor.mode === 'edit' ? editor.note.id : 'create'}
          note={editor.mode === 'edit' ? editor.note : null}
          onSubmit={editor.mode === 'edit' ? handleUpdate : handleCreate}
          onClose={() => {
            if (!busy) setEditor(null)
          }}
          submitting={busy}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete this note?"
          message={`“${deleting.title}” will be permanently deleted. This action cannot be undone.`}
          confirmLabel="Delete note"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            if (!busy) setDeleting(null)
          }}
          busy={busy}
        />
      )}
    </div>
  )
}

export default AppShell
