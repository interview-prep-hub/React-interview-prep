import { ToastProvider, useToast } from './ToastContext.jsx'

// Exercise 31: Toast system.
// Read README.md in this folder for the full requirements.
// Most of the work is in ToastContext.jsx. This file is the small demo page.

function Demo() {
  const { show } = useToast()

  return (
    <div>
      <h2>Toast system</h2>
      {/* TODO 9: make each button call show() with the message and options
          from the README (the sticky one needs duration 0). */}
      <button type="button" onClick={() => {}}>
        Show info
      </button>
      <button type="button" onClick={() => {}}>
        Show success
      </button>
      <button type="button" onClick={() => {}}>
        Show error
      </button>
      <button type="button" onClick={() => {}}>
        Show sticky
      </button>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Demo />
    </ToastProvider>
  )
}
