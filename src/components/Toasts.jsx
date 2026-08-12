import { useCallback, useRef, useState } from 'react'
import { ToastContext } from '../toast.js'
import { AlertIcon, CheckIcon, XIcon } from './Icons.jsx'

const TOAST_TTL = 4200

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (type, message) => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, type, message }])
      setTimeout(() => dismiss(id), TOAST_TTL)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`} role="status">
            <span className="toast-icon">
              {toast.type === 'error' ? <AlertIcon size={18} /> : <CheckIcon size={18} />}
            </span>
            <span className="toast-msg">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <XIcon size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
