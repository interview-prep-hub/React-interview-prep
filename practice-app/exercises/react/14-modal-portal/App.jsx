import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Exercise 14: Modal rendered in a portal, with focus management and accessibility.
// Read README.md in this folder for the full requirements.
// Your job is the Modal component. The App at the bottom is the demo page and is
// already written (the tests rely on its texts, so keep them).
// Keep Modal as a named export too: some tests render it on its own.

// Elements the keyboard can focus. Handy for the focus trap.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Basic look so you can see the result in the browser (npm run dev).
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
  // TODO 1: create a ref for the dialog element, and an id for the title with useId().

  // TODO 2 (effect): while `open`, lock page scrolling with document.body.style.overflow.
  //   Remember the OLD value and put it back in the cleanup function.

  // TODO 3 (effect): when the modal opens, remember document.activeElement, then move
  //   focus to an element inside the dialog. In the cleanup, focus the remembered element.

  // TODO 4 (effect): while `open`, listen for "keydown" on `document`.
  //   Escape calls onClose. Tab and Shift+Tab must stay inside the dialog (wrap around).
  //   Work out the first and last focusable element inside the handler, on every key press.
  //   Remove the listener in the cleanup. This effect uses onClose, so list it as a dependency.

  // TODO 5: when `open` is false, render nothing. (Hooks must still run before this line.)

  // TODO 6: render the markup below with createPortal(..., document.body):
  //   overlay div   style={overlayStyle}  data-testid="modal-overlay"  closes on click (overlay itself only)
  //     dialog div  style={dialogStyle}   role, aria-modal, aria-labelledby
  //       header: <h2> with the title, and a "Close" button
  //       {children}

  return null
}

// A box that clips its children and creates a new containing block for fixed
// elements. Without a portal your dialog would be trapped inside this box.
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
