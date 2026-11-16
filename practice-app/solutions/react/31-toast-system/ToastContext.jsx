import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Reference solution for exercise 31: Toast system.
//
// Key ideas:
// - The list of toasts is state inside the provider. The context value is
//   only { show, dismiss }, and it is memoised, so components that call
//   useToast() do NOT re-render when toasts come and go.
// - show and dismiss use functional state updates, so they never depend on a
//   stale `toasts` array. That also makes them stable (useCallback with []).
// - Ids come from a counter in a ref. The id is created inside show(), not
//   inside the state updater (updaters must be pure and React may run them twice).
// - Each ToastItem owns its own timer in an effect. When the item leaves the
//   screen for ANY reason (Close, dismiss, dropped, provider unmount) React runs
//   the effect cleanup, which clears the timer. No manual bookkeeping.
// - key={toast.id} keeps a toast's DOM node and timer alive while others change.
// - The stack is rendered with a portal into document.body, so no parent with
//   overflow or z-index can clip it.

const MAX_VISIBLE = 3
const DEFAULT_DURATION = 3000

const ToastContext = createContext(null)

const COLORS = { info: '#2563eb', success: '#16a34a', error: '#dc2626' }

const stackStyle = {
  position: 'fixed',
  right: 16,
  bottom: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  width: 320,
  maxWidth: 'calc(100vw - 32px)',
}

function toastStyle(type) {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 12px',
    background: '#ffffff',
    color: '#111827',
    borderLeft: `4px solid ${COLORS[type]}`,
    borderRadius: 4,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  }
}

function ToastItem({ toast, onDismiss }) {
  const { id, message, type, duration } = toast

  useEffect(() => {
    // duration 0 means sticky: no timer at all.
    if (duration === 0) return undefined

    const timer = setTimeout(() => onDismiss(id), duration)
    // Runs when the toast unmounts (and before the effect re-runs).
    return () => clearTimeout(timer)
  }, [id, duration, onDismiss])

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      data-testid="toast"
      data-type={type}
      style={toastStyle(type)}
    >
      <span>{message}</span>
      <button type="button" onClick={() => onDismiss(id)}>
        Close
      </button>
    </div>
  )
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div role="region" aria-label="Notifications" style={stackStyle}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => {
    // Unknown or already removed ids simply match nothing.
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback((message, { type = 'info', duration = DEFAULT_DURATION } = {}) => {
    const id = nextId.current++
    // Newest goes last. slice(-3) keeps the three newest, so the oldest is dropped.
    setToasts((current) => [...current, { id, message, type, duration }].slice(-MAX_VISIBLE))
    return id
  }, [])

  // Same object on every render, so consumers are not re-rendered by toast changes.
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss])

  // React 19: the context object can be rendered directly as the provider.
  // The portal is still part of the React tree, so ToastStack shares this state.
  return (
    <ToastContext value={api}>
      {children}
      {createPortal(<ToastStack toasts={toasts} onDismiss={dismiss} />, document.body)}
    </ToastContext>
  )
}

export function useToast() {
  const api = useContext(ToastContext)
  if (api === null) {
    throw new Error('useToast must be used inside a <ToastProvider>')
  }
  return api
}
