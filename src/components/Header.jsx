import { LogOutIcon, MoonIcon, NoteIcon, SunIcon } from './Icons.jsx'

function Header({ email, theme, onToggleTheme, onLogout }) {
  const initial = email.slice(0, 1).toUpperCase()

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-brand">
          <span className="app-logo" aria-hidden="true">
            <NoteIcon size={18} />
          </span>
          <span>Notes</span>
        </div>

        <div className="app-header-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          <div className="user-chip" title={email}>
            <span className="avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="user-email">{email}</span>
          </div>

          <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>
            <LogOutIcon size={15} />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
