import { createContext, useContext } from 'react'

// Exercise 31: Toast system.
// Read README.md in this folder for the full requirements.
//
// This file must export exactly two things: ToastProvider and useToast.
// Everything else stays private to this file.
//
// The TODO numbers are a suggested order of work (they are not in file order):
// start with the provider (2, 3, 4), then the stack and one toast (5, 6, 7),
// then the hook (8), then the demo page in App.jsx (9).

const MAX_VISIBLE = 3
const DEFAULT_DURATION = 3000

// TODO 1: the context is created for you with null as its default value.
// Decide what the provider will put into it (see TODO 4) so that useToast()
// can return { show, dismiss }, and what a null value means (see TODO 8).
const ToastContext = createContext(null)

function ToastItem({ toast, onDismiss }) {
  // TODO 6: render one toast.
  //  - role is "alert" for type "error", otherwise "status"
  //  - data-testid="toast" and data-type={type}
  //  - the message and a button named "Close"
  //
  // TODO 7: auto-dismiss. A toast with a duration above 0 must remove itself
  // after that many milliseconds. Whatever you start here, you must also stop
  // (what runs when this component leaves the screen?).
  return null
}

function ToastStack({ toasts, onDismiss }) {
  // TODO 5: the container element: role="region" and aria-label="Notifications".
  // It is always rendered, even when there are no toasts. Render one ToastItem
  // per toast. Which prop makes React keep each item's identity?
  return null
}

export function ToastProvider({ children }) {
  // TODO 2: keep the list of toasts in state. Each toast needs an id, a message,
  // a type and a duration.
  //
  // TODO 3: write show(message, options) and dismiss(id).
  //  - show returns the new id. Where can a unique id come from?
  //  - when a 4th toast arrives, the oldest one is dropped (MAX_VISIBLE)
  //  - both functions must keep working when called several times in a row,
  //    and must keep the same identity between renders
  //
  // TODO 4: provide { show, dismiss } through the context, and render the
  // ToastStack in a portal (document.body). Which object should you pass as
  // the context value so consumers do not re-render for no reason?
  return children
}

export function useToast() {
  // TODO 8: read the context. Throw an Error whose message contains
  // "ToastProvider" when it is used outside of a provider.
  return { show: () => undefined, dismiss: () => undefined }
}
