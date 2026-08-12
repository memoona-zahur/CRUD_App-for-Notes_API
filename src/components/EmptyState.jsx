import { NoteIcon, SearchIcon } from './Icons.jsx'

function EmptyState({ searching }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">
        {searching ? <SearchIcon size={36} /> : <NoteIcon size={36} />}
      </div>
      <h2>{searching ? 'No matches' : 'No notes yet'}</h2>
      <p>
        {searching
          ? 'Try a different search term.'
          : 'Create your first note and it will show up here.'}
      </p>
    </div>
  )
}

export default EmptyState
