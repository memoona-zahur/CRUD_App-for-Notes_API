import { useState } from 'react'
import { api } from '../api.js'
import { NoteIcon, SpinnerIcon } from './Icons.jsx'

function Login({ onLogin, initialError }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialError ?? null)
  const [submitting, setSubmitting] = useState(false)

  const isLogin = mode === 'login'

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (isLogin) {
        const { access_token } = await api.login(email, password)
        onLogin(access_token, email)
      } else {
        await api.register(email, password)
        const { access_token } = await api.login(email, password)
        onLogin(access_token, email)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <aside className="auth-showcase" aria-hidden="true">
          <div className="auth-showcase-brand">
            <span className="auth-logo">
              <NoteIcon size={25} />
            </span>
            <span>Noted</span>
          </div>
          <div className="auth-showcase-copy">
            <span className="auth-kicker">A calmer way to think</span>
            <h1>Your ideas deserve a beautiful home.</h1>
            <p>Capture the small details, shape the big ones, and keep every thought within reach.</p>
          </div>
          <div className="auth-preview-card">
            <div className="auth-preview-dot" />
            <div className="auth-preview-line auth-preview-line-lg" />
            <div className="auth-preview-line" />
            <div className="auth-preview-line auth-preview-line-sm" />
          </div>
          <p className="auth-showcase-footer">Private by design · Yours everywhere</p>
        </aside>

        <div className="auth-panel">
          <div className="auth-brand">
            <span className="auth-mobile-logo" aria-hidden="true">
              <NoteIcon size={20} />
            </span>
            <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
            <p>{isLogin ? 'Sign in to continue to your notes.' : 'Start collecting your ideas in one place.'}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={isLogin ? undefined : 8}
                required
              />
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? <SpinnerIcon className="spin" size={16} /> : null}
              {submitting ? 'Please wait…' : isLogin ? 'Sign in to Notes' : 'Create my account'}
            </button>

            <p className="auth-switch">
              {isLogin ? 'New to Noted?' : 'Already have an account?'}
              <button
                type="button"
                onClick={() => {
                  setMode(isLogin ? 'register' : 'login')
                  setError(null)
                }}
              >
                {isLogin ? 'Create an account' : 'Sign in'}
              </button>
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}

export default Login
