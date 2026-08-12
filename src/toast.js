import { createContext, useContext } from 'react'

export const ToastContext = createContext(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (context === null) {
    throw new Error('useToast must be used inside a <ToastProvider>')
  }
  return context
}
