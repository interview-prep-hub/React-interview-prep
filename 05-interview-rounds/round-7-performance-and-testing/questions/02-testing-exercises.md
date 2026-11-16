# Round 7 - Performance and Testing: Testing Exercises

**How to use this file:** Each exercise gives you a small component, hook or function and asks you to write the tests. Allow 10 to 15 minutes each. Set up a folder in the practice app, for example `practice-app/scratch/r7-practice/` (its Vitest settings already pick up `scratch/**/*.test.jsx`), save the code under the file name given in each exercise, write `<Name>.test.jsx` next to it and run `npm test -- scratch/r7-practice` from `practice-app`. Say aloud what each test proves before you write it. Self-score: one point for tests that check behaviour the user sees, one for queries by role or label, one for covering the failure and edge cases, one for no real network, no real waiting and no test that depends on another test.
**Answers:** [answers/02-testing-exercises.md](../answers/02-testing-exercises.md)  (do not open until you have tried)
**Learn first:** [Testing React](../../../04-advanced/08-testing-react.md), [Custom hooks](../../../02-hooks/08-custom-hooks.md), [Error boundaries](../../../03-intermediate/05-error-boundaries-portals-and-friends.md), [React Router](../../../03-intermediate/03-react-router.md), [Accessibility](../../../04-advanced/09-accessibility.md)

**Tools used:** Vitest (the test runner), React Testing Library (renders components and finds elements the way a user would), user-event (simulates real typing and clicking) and jest-dom (extra checks such as `toBeInTheDocument`). The practice app already has all of these set up with a `jsdom` environment (a fake browser that runs in Node). Exercise R7-TS-009 also needs the `react-router` package, which the practice app does not install: run `npm install react-router` in a scratch project (or in the practice app if you do not mind changing its dependencies).

**Rule of thumb for queries (most preferred first):** `getByRole` (with `name`), `getByLabelText`, `getByPlaceholderText`, `getByText`, `getByDisplayValue`, then `getByAltText` and `getByTitle`, and only last `getByTestId`. Use `getBy` when the element must exist, `queryBy` to check that it does not exist, and `findBy` when it appears later (async).

## Forms and queries

**R7-TS-001 (Easy)** Save as `LoginForm.jsx` and write `LoginForm.test.jsx`. Test that: the fields and the button are on the screen; a bad email shows an error and does not call `onSubmit`; a short password shows an error and does not call `onSubmit`; valid values call `onSubmit` once with the typed values, and an earlier error disappears.

```jsx
import { useState } from 'react'

export default function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!email.includes('@')) {
      setError('Enter a valid email')
      return
    }
    if (password.length < 8) {
      setError('Password must have at least 8 characters')
      return
    }
    setError('')
    onSubmit({ email, password })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Log in</button>
    </form>
  )
}
```

**R7-TS-002 (Easy)** Save as `Tabs.jsx`. Write tests that find everything by role and accessible name (no test ids, no CSS selectors). Check the tablist, the tabs, which tab is selected, which panel is shown, and that clicking another tab switches both.

```jsx
import { useState } from 'react'

export default function Tabs({ tabs }) {
  const [active, setActive] = useState(tabs[0].id)

  return (
    <div>
      <div role="tablist" aria-label="Account sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={tab.id === active}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map(
        (tab) =>
          tab.id === active && (
            <div
              key={tab.id}
              role="tabpanel"
              id={`panel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
            >
              {tab.content}
            </div>
          ),
      )}
    </div>
  )
}
```

## Async code and timers

**R7-TS-003 (Medium)** Save as `UserList.jsx`. Write tests with a mocked network (no real requests): the loading message, the list on success, the empty state, an error status from the server, a network failure, and the Retry button recovering after a failure. Explain how MSW (Mock Service Worker) differs from mocking `fetch` yourself.

```jsx
import { useEffect, useState } from 'react'

export default function UserList() {
  const [state, setState] = useState({ status: 'loading', users: [] })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/users', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((users) => setState({ status: 'success', users }))
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ status: 'error', users: [] })
      })
    return () => controller.abort()
  }, [attempt])

  function retry() {
    setState({ status: 'loading', users: [] })
    setAttempt((n) => n + 1)
  }

  if (state.status === 'loading') return <p>Loading users...</p>
  if (state.status === 'error') {
    return (
      <div>
        <p role="alert">Could not load users.</p>
        <button onClick={retry}>Retry</button>
      </div>
    )
  }
  if (state.users.length === 0) return <p>No users yet.</p>
  return (
    <ul>
      {state.users.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  )
}
```

**R7-TS-004 (Medium)** Save as `DebouncedSearch.jsx`. Test the timing with fake timers (no real waiting): `onSearch` is not called while the user is still typing, it is called once with the final text after the pause, every keystroke restarts the wait, a custom `delay` is respected, and an empty box never searches. There is a known problem when fake timers meet Testing Library: how do you avoid it?

```jsx
import { useEffect, useState } from 'react'

export default function DebouncedSearch({ onSearch, delay = 300 }) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (text === '') return
    const id = setTimeout(() => onSearch(text), delay)
    return () => clearTimeout(id)
  }, [text, delay, onSearch])

  return <input aria-label="Search" value={text} onChange={(e) => setText(e.target.value)} />
}
```

## Context, hooks and logic

**R7-TS-005 (Medium)** Save as `ThemeToggle.jsx`. The component needs a context provider. Write a reusable render helper that wraps the component in the provider, and test: the default theme, a theme given to the provider, toggling twice, and the error thrown when `useTheme` is used without a provider.

```jsx
import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ initialTheme = 'light', children }) {
  const [theme, setTheme] = useState(initialTheme)
  const value = {
    theme,
    toggle: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
  }
  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggle}>Switch theme</button>
    </div>
  )
}
```

**R7-TS-006 (Medium)** Save as `useLocalStorage.js`. Test this custom hook without building a component for it, using `renderHook`. Cover: initial value, reading a stored value, updating and saving, a functional update, an object value, bad JSON in storage, and a re-render of the same hook.

```js
import { useEffect, useState } from 'react'

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initialValue : JSON.parse(raw)
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}
```

**R7-TS-007 (Easy)** Save as `cart.js`. These are plain functions, so no React is needed. Test every action of the reducer, the `default` branch, the total, and prove that the reducer never mutates the state it receives.

```js
export const initialCart = { items: [] }

export function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const found = state.items.find((i) => i.id === action.item.id)
      if (found) {
        return {
          items: state.items.map((i) => (i.id === found.id ? { ...i, qty: i.qty + 1 } : i)),
        }
      }
      return { items: [...state.items, { ...action.item, qty: 1 }] }
    }
    case 'remove':
      return { items: state.items.filter((i) => i.id !== action.id) }
    case 'setQty': {
      if (action.qty <= 0) {
        return { items: state.items.filter((i) => i.id !== action.id) }
      }
      return {
        items: state.items.map((i) => (i.id === action.id ? { ...i, qty: action.qty } : i)),
      }
    }
    case 'clear':
      return initialCart
    default:
      return state
  }
}

// Prices are whole cents, so the total has no floating point error.
export function cartTotal(state) {
  return state.items.reduce((sum, i) => sum + i.price * i.qty, 0)
}
```

## Errors, routing and accessibility

**R7-TS-008 (Medium)** Save as `ErrorBoundary.jsx`. Test: children render normally; when a child throws, the fallback appears and `onError` receives the error; "Try again" recovers when the cause is gone and shows the fallback again if the child still throws. How do you keep the console clean in these tests?

```jsx
import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.props.onError?.(error, info)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <div role="alert">
          <p>Something went wrong.</p>
          <button onClick={this.reset}>Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}
```

**R7-TS-009 (Medium)** Save as `ProductsApp.jsx` (needs `react-router`, imported from `react-router`, not `react-router-dom`). Test routing without a browser: the list page and its links, clicking through to a detail page and back, landing directly on a detail URL, an unknown product, and an unknown route. Which router do you use in tests, and why?

```jsx
import { Link, Route, Routes, useParams } from 'react-router'

const PRODUCTS = [
  { id: 'p1', name: 'Keyboard' },
  { id: 'p2', name: 'Monitor' },
]

function ProductList() {
  return (
    <div>
      <h1>Products</h1>
      <ul>
        {PRODUCTS.map((p) => (
          <li key={p.id}>
            <Link to={`/products/${p.id}`}>{p.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProductDetail() {
  const { id } = useParams()
  const product = PRODUCTS.find((p) => p.id === id)
  if (!product) return <p>Product not found</p>
  return (
    <article>
      <h1>{product.name}</h1>
      <Link to="/products">Back to products</Link>
    </article>
  )
}

export default function ProductsApp() {
  return (
    <Routes>
      <Route path="/products" element={<ProductList />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="*" element={<p>Page not found</p>} />
    </Routes>
  )
}
```

**R7-TS-010 (Hard)** Save as `SettingsPage.jsx`. Test the accessibility behaviour of this modal, not its looks: it is closed at first; it opens as a dialog named by its title; focus moves into it; Escape and the Close button close it; focus goes back to the button that opened it. What does this component still not do that a full modal should?

```jsx
import { useEffect, useId, useRef, useState } from 'react'

export function Modal({ title, onClose, children }) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const opener = document.activeElement
    dialogRef.current.focus()
    return () => opener?.focus()
  }, [])

  function handleKeyDown(event) {
    if (event.key === 'Escape') onClose()
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <h2 id={titleId}>{title}</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  )
}

export default function SettingsPage() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open settings</button>
      {open && (
        <Modal title="Settings" onClose={() => setOpen(false)}>
          <p>Choose your options.</p>
        </Modal>
      )}
    </div>
  )
}
```
