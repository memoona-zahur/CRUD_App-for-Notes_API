import { EditIcon, TrashIcon } from './Icons.jsx'

function NoteCard({ note, onEdit, onDelete }) {
  return (
    <article className="note-card">
      <div className="note-card-top">
        <h2 className="note-card-title">{note.title}</h2>
        <time className="note-card-date" dateTime={note.created_at}>
          {new Date(note.created_at).toLocaleString()}
        </time>
      </div>
      <p className="note-card-body">{note.body}</p>
      <div className="note-card-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEdit(note)}>
          <EditIcon size={14} />
          <span>Edit</span>
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-danger-ghost"
          onClick={() => onDelete(note)}
        >
          <TrashIcon size={14} />
          <span>Delete</span>
        </button>
      </div>
    </article>
  )
}

export default NoteCard
