import { ToastProvider, useToast } from './ToastContext.jsx'

// Reference solution for exercise 31.
// The demo is a normal component: it just calls useToast() and has no idea
// how or where the toasts are drawn.

function Demo() {
  const { show } = useToast()

  return (
    <div>
      <h2>Toast system</h2>
      <button type="button" onClick={() => show('Here is some information', { type: 'info' })}>
        Show info
      </button>
      <button type="button" onClick={() => show('Saved successfully', { type: 'success' })}>
        Show success
      </button>
      <button type="button" onClick={() => show('Something went wrong', { type: 'error' })}>
        Show error
      </button>
      <button
        type="button"
        onClick={() => show('I stay until you close me', { type: 'info', duration: 0 })}
      >
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
