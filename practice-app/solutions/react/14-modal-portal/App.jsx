import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Reference solution for exercise 14.
// Key ideas:
// - createPortal puts the overlay and dialog straight into document.body, so no
//   ancestor (overflow: hidden, transform, z-index) can clip or hide them.
// - One effect per job (scroll lock, focus, keyboard). Each effect remembers what
//   it changed inside its own closure and undoes it in its cleanup. This stays
//   correct when React runs effects twice in StrictMode.
// - The scroll-lock and focus effects depend only on `open`. If they also depended
//   on `onClose` (a new function on every parent render), they would re-run and
//   steal focus again each time the parent re-renders.

// Elements the keyboard can focus. (jsdom has no layout, so we do not filter hidden ones.)
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusable(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE))
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.6)',
  display: 'grid',
  placeItems: 'center',
}

const dialogStyle = {
  background: 'white',
  color: '#111',
  padding: 24,
  borderRadius: 8,
  minWidth: 300,
  outline: 'none',
}

export function Modal({ open, onClose, title, children }) {
  const dialogRef = useRef(null)
  const titleId = useId()

  // 1. Lock page scrolling while the modal is open.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow // could be '' or any value
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous // restore exactly what was there
    }
  }, [open])

  // 2. Move focus into the dialog, and give it back when the modal closes.
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    // Read this BEFORE moving focus. It is usually the "Open modal" button.
    const opener = document.activeElement
    const [first] = getFocusable(dialog)
    const target = first ?? dialog // the dialog itself has tabIndex -1, so it can take focus
    target.focus()
    return () => {
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [open])

  // 3. Keyboard: Escape closes, Tab and Shift+Tab stay inside the dialog.
  // The listener is on `document` (not on the dialog) so we still hear Tab when
  // focus has fallen out of the dialog, for example after clicking plain text.
  // The handler reads `onClose`, so `onClose` is a dependency: the listener is
  // swapped when the parent passes a new function, which is cheap and always uses
  // the newest one. The list of focusable elements is read on every Tab press, so
  // it stays right when the dialog content changes while it is open.
  useEffect(() => {
    if (!open) return
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      const items = getFocusable(dialog)
      if (items.length === 0) {
        event.preventDefault() // nothing to tab to, so keep focus on the dialog
        dialog.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      if (!dialog.contains(active)) {
        // Focus is outside the dialog: pull it back in.
        event.preventDefault()
        const entry = event.shiftKey ? last : first
        entry.focus()
      } else if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault()
        last.focus() // wrap backwards
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus() // wrap forwards
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Hooks above always run. Only now is it safe to render nothing.
  if (!open) return null

  function handleOverlayClick(event) {
    // A click inside the dialog bubbles up to the overlay too.
    // Only close when the overlay itself was the target.
    if (event.target === event.currentTarget) onClose()
  }

  return createPortal(
    <div style={overlayStyle} data-testid="modal-overlay" onClick={handleOverlayClick}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={dialogStyle}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 id={titleId} style={{ margin: 0 }}>
            {title}
          </h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  )
}

// A box that clips its children and creates a new containing block for fixed
// elements. Without a portal the dialog would be trapped inside this box.
const clippingBoxStyle = {
  overflow: 'hidden',
  transform: 'translateZ(0)',
  height: 90,
  padding: 12,
  border: '1px dashed #888',
}

export default function App() {
  const [open, setOpen] = useState(false)
  // Typing re-renders App, which gives Modal a NEW onClose function every time.
  // Your effects must keep working through that.
  const [nickname, setNickname] = useState('')
  const close = () => setOpen(false)

  return (
    <div>
      <h1>Modal demo</h1>
      <div style={clippingBoxStyle}>
        <p>This box clips everything inside it.</p>
        <button type="button" onClick={() => setOpen(true)}>
          Open modal
        </button>
        <Modal open={open} onClose={close} title="Edit profile">
          <p>Change how other people see you.</p>
          <label>
            Nickname{' '}
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </label>
          <p>
            <button type="button" onClick={close}>
              Save
            </button>
          </p>
        </Modal>
      </div>
    </div>
  )
}
