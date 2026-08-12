import { useCallback, useState } from 'react'
import Login from './components/Login.jsx'
import AppShell from './AppShell.jsx'
import { ToastProvider } from './components/Toasts.jsx'
import { useTheme } from './theme.js'

const TOKEN_KEY = 'notes_token'
const EMAIL_KEY = 'notes_email'

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY) ?? '')
  const [notice, setNotice] = useState(null)
  const { theme, toggle } = useTheme()

  const handleLogin = useCallback((accessToken, userEmail) => {
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(EMAIL_KEY, userEmail)
    setToken(accessToken)
    setEmail(userEmail)
    setNotice(null)
  }, [])

  const handleLogout = useCallback((reason = null) => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EMAIL_KEY)
    setToken(null)
    setEmail('')
    setNotice(reason)
  }, [])

  if (!token) {
    return <Login onLogin={handleLogin} initialError={notice} />
  }

  return (
    <ToastProvider>
      <AppShell
        token={token}
        email={email}
        theme={theme}
        onToggleTheme={toggle}
        onLogout={handleLogout}
      />
    </ToastProvider>
  )
}

export default App
