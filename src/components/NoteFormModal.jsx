import { useEffect, useRef, useState } from 'react'
import { SpinnerIcon, XIcon } from './Icons.jsx'

function NoteFormModal({ note, onSubmit, onClose, submitting }) {
  const dialogRef = useRef(null)
  const [title, setTitle] = useState(note?.title ?? '')
  const [body, setBody] = useState(note?.body ?? '')
  const isEdit = Boolean(note)

  useEffect(() => {
    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement
    dialog?.querySelector('input, textarea')?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key === 'Tab') {
        const focusables = dialog.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled])',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({ title: title.trim(), body: body.trim() })
  }

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-form-title"
        ref={dialogRef}
      >
        <div className="modal-header">
          <h2 id="note-form-title">{isEdit ? 'Edit note' : 'New note'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="note-title">Title</label>
            <input
              id="note-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grocery list"
              maxLength={255}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="note-body">Body</label>
            <textarea
              id="note-body"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What&apos;s on your mind?"
              required
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <SpinnerIcon className="spin" size={16} /> : null}
              {isEdit ? 'Save changes' : 'Create note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NoteFormModal
