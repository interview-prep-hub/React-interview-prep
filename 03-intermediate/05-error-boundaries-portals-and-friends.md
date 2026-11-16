# Error Boundaries, Portals, Fragments and Friends

> **Level:** Intermediate   **Time:** about 55 minutes   **Read first:** [Components and props](../01-basics/04-components-and-props.md), [useEffect](../02-hooks/03-useeffect.md), [Component patterns](01-component-patterns.md)

## What you will learn
- Explain what an error boundary is, write one as a class, and place boundaries at the app, route and widget level.
- List the errors a boundary does not catch (event handlers, async code, server rendering, the boundary itself) and still send them to a boundary or a logger.
- Report errors to a monitoring service with `componentDidCatch` and the React 19 root options `onCaughtError`, `onUncaughtError` and `onRecoverableError`.
- Build a modal with `createPortal`, and explain why events and context follow the React tree and not the DOM tree.
- Use Fragments, StrictMode, the Profiler component, `React.lazy` and `Suspense` correctly, and say what each one is for.
- Recognise the older tools (`Children`, `cloneElement`, `createElement`) and the two escape hatches (`dangerouslySetInnerHTML`, `flushSync`), and know when not to reach for them.

This lesson is a toolbox. Part 1 (sections 1 to 7) is about errors. Part 2 (sections 8 to 10) is about portals. Part 3 (sections 11 to 17) covers the smaller tools. The behaviour described here was checked with React 19.3.1 in the practice app, and the outputs shown come from real runs. The one snippet that was not run (the `react-error-boundary` package) is marked in section 4.

## 1. What happens when a component throws

A component is just a function. While React calls it to draw the screen (this is called **rendering**), it can throw an error like any JavaScript function. A typical cause is reading a property of `undefined`.

```jsx
function Price({ product }) {
  return <p>{product.price.toFixed(2)}</p>
}

export default function App() {
  return (
    <div>
      <h1>Shop</h1>
      <Price product={{ name: 'Tea' }} />
    </div>
  )
}
```

The product has no `price`, so `product.price` is `undefined` and `.toFixed` throws a `TypeError`.

**What happens, step by step:**
1. React renders `App`, then the `<h1>`, then `Price`.
2. `Price` runs `product.price.toFixed(2)`. JavaScript throws "Cannot read properties of undefined".
3. React looks upward in the component tree for an **error boundary** (a component that handles errors, you will build one in section 2). There is none.
4. React gives up on the whole tree and removes it from the screen. In a test with a tree like this, the root container ended up completely empty, not even the `<h1>` was left. The user sees a white screen.
5. React reports the error. By default it goes to the browser console as an uncaught error. You can take over this step with the root options in section 7.

Why does React remove everything? A half-drawn screen can be wrong in dangerous ways (a checkout page with the wrong total). React chooses "show nothing" over "show something false".

An analogy: a fuse box in a house. Without separate fuses, one broken lamp turns off the whole house. Error boundaries are the separate fuses. One broken part trips only its own circuit.

**Common mistake:** wrapping the JSX in `try/catch`.

```jsx
// Wrong: this try/catch never sees the error
function App() {
  try {
    return <Price product={{ name: 'Tea' }} />
  } catch (error) {
    return <p>Oops</p>
  }
}
```

`<Price ... />` only creates a small description object. `Price` itself runs later, when React renders it, which is outside this `try` block. The fix is an error boundary around the component (section 2).

## 2. Your first error boundary

An **error boundary** is a class component that has at least one of two special methods: `static getDerivedStateFromError` and `componentDidCatch`. When any component below it throws while rendering, React asks the nearest boundary above to show a **fallback UI** (a replacement screen) instead of crashing everything.

```jsx
// src/ErrorBoundary.jsx
import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    // Runs while React is rendering. Keep it pure: just return the new state.
    return { error }
  }

  componentDidCatch(error, info) {
    // Runs after the fallback is on the screen. Side effects are allowed here.
    console.error('Caught by ErrorBoundary:', error.message)
    console.error(info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <p role="alert">Something went wrong.</p>
    }
    return this.props.children
  }
}
```

Use it by wrapping the part that can fail:

```jsx
import { ErrorBoundary } from './ErrorBoundary.jsx'

export default function App() {
  return (
    <div>
      <h1>Shop</h1>
      <ErrorBoundary>
        <Price product={{ name: 'Tea' }} />
      </ErrorBoundary>
      <p>The rest of the page still works.</p>
    </div>
  )
}
```

**What happens, step by step:**
1. `Price` throws while React renders it.
2. React walks up to the nearest class component that has `getDerivedStateFromError`. That is `ErrorBoundary`.
3. React calls `getDerivedStateFromError(error)`. The returned `{ error }` is merged into the boundary's state.
4. React renders the boundary again. Now `this.state.error` is set, so `render` returns the fallback `<p>` instead of the children.
5. After the fallback is committed to the screen, React calls `componentDidCatch(error, info)` once. `info.componentStack` is a string that lists the components between the thrower and the boundary.
6. The `<h1>` and the last paragraph, which are outside the boundary, are never touched.

The order below is from a real run (the lines are trimmed). React may call a failing component more than once while it tries to recover, so never rely on exact render counts. The order of these three events is stable:

```text
getDerivedStateFromError
Boundary render (error is set, so it shows the fallback)
componentDidCatch
```

The component stack from the same run looked like this (file names shortened):

```text
at Bomb (a-boundaries.test.jsx:47:8)
at ErrorBoundary (a-boundaries.test.jsx:20:1)
```

**Which method does what?** Remember it like this:
- `getDerivedStateFromError` decides **what to show**. It runs during rendering, so it must be pure (no logging, no network).
- `componentDidCatch` decides **what to do about it**. It runs after the screen is updated, so it is the place for logging.

**What a boundary catches:** errors thrown while rendering any component below it, in constructors and lifecycle methods, and in `useEffect` and `useLayoutEffect` callbacks of those components (a synchronous `throw` inside an effect was caught in my tests). It also catches thrown values that are not `Error` objects. A thrown string reached `getDerivedStateFromError` as a string, so write `error instanceof Error ? error.message : String(error)` when you display or log it.

**Why a class?** There is no hook for this. The two methods have no function-component version, and as of React 19.3 the React docs still tell you to write a class once, or to use the `react-error-boundary` package (section 4). Everything else in your app can be a function component. This one class is the usual exception.

**Common mistake 1:** putting the boundary inside the component that throws.

```jsx
// Wrong: Price throws while building its own JSX, before the boundary exists
function Price({ product }) {
  return (
    <ErrorBoundary>
      <p>{product.price.toFixed(2)}</p>
    </ErrorBoundary>
  )
}
```

```jsx
// Right: the boundary is above the component that can fail
<ErrorBoundary>
  <Price product={product} />
</ErrorBoundary>
```

A boundary only protects what is **below** it. It cannot catch an error from the component that renders it.

**Common mistake 2:** copying an old tutorial that only has `componentDidCatch` and calls `setState` in it.

```jsx
// Old style: the React docs call this deprecated
componentDidCatch(error) {
  this.setState({ error })
}
```

```jsx
// Current style: set the state in getDerivedStateFromError, log in componentDidCatch
static getDerivedStateFromError(error) {
  return { error }
}
```

The old style still ran in a test with React 19.3.1, but the React docs mark it as deprecated, so do not write new code this way.

## 3. Fallback UI, reset and retry

The boundary in section 2 has a problem. Once it shows the fallback, it stays there forever, even when the cause is fixed (the network came back, the user picked another item). To leave the fallback, the boundary must set its error back to `null`. Then React tries to render the children again. This is called **resetting** the boundary.

Here is a reusable boundary with three extras: a `fallback` (an element, or a function that receives the error and a `reset` function), an `onError` callback for logging, and `resetKeys` (a list of values that reset the boundary when one changes).

```jsx
// src/ErrorBoundary.jsx
import { Component } from 'react'

function keysChanged(a = [], b = []) {
  return a.length !== b.length || a.some((item, i) => !Object.is(item, b[i]))
}

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.props.onError?.(error, info)
  }

  componentDidUpdate(prevProps, prevState) {
    // Only reset if we were already showing an error BEFORE this update.
    // Otherwise the same update that caused the error could reset it at once.
    if (
      this.state.error !== null &&
      prevState.error !== null &&
      keysChanged(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.reset()
    }
  }

  reset = () => {
    this.props.onReset?.()
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (error !== null) {
      const { fallback } = this.props
      return typeof fallback === 'function' ? fallback({ error, reset: this.reset }) : fallback
    }
    return this.props.children
  }
}
```

Now use it. The page shows one user at a time. User 2 has broken data.

```jsx
import { useState } from 'react'
import { ErrorBoundary } from './ErrorBoundary.jsx'

function Profile({ userId }) {
  if (userId === 2) throw new Error('User 2 is broken')
  return <p>User {userId}</p>
}

export default function App() {
  const [id, setId] = useState(1)

  return (
    <>
      <button onClick={() => setId(id + 1)}>Next user</button>
      <ErrorBoundary
        resetKeys={[id]}
        onError={(error, info) => console.log('log:', error.message)}
        fallback={({ error, reset }) => (
          <div role="alert">
            <p>Oops: {error.message}</p>
            <button onClick={reset}>Try again</button>
          </div>
        )}
      >
        <Profile userId={id} />
      </ErrorBoundary>
    </>
  )
}
```

**What happens, step by step** (screen text from a real run):
1. First render: `Next user`, `User 1`.
2. Click "Next user". `id` becomes 2, `Profile` throws, the boundary shows `Oops: User 2 is broken` and a `Try again` button. `onError` ran exactly once, and its `info.componentStack` contained `Profile`. It also ran once inside `<StrictMode>`.
3. Click "Try again" while the data is still broken. `reset` clears the error, React renders `Profile` again, it throws again, and the fallback comes back. The retry button only helps when something has changed.
4. Click "Next user". `resetKeys` changed from `[2]` to `[3]`, so `componentDidUpdate` resets the boundary and the screen shows `User 3`.

**Three ways to reset a boundary:**
- A **retry button** that calls `reset`. Good after a network failure.
- **`resetKeys`**, as above. Good when the reason for the failure disappears because some input changed.
- A **`key` on the boundary**: `<ErrorBoundary key={id}>`. React throws away the old boundary and everything inside it and creates a fresh one. It is the simplest option and needs no extra code (a real test: broken, then the key changed, then the content came back). Every state below the boundary is lost too, which is fine at widget or page level.

**What makes a good fallback:**
- Keep it simple and independent. It must not use the same data or context that just failed.
- Say what the user can do: try again, go back, reload the page.
- Use `role="alert"` so screen readers announce it.
- Never show raw error messages or stack traces to normal users. Log them (section 7) and show friendly text.

**Common mistake:** a fallback that can throw.

```jsx
// Wrong: the fallback reads the same broken object that caused the error
fallback={({ error }) => <p>Failed for {user.profile.name}</p>}
```

If the fallback throws, the boundary cannot handle that error. It travels up to the next boundary above (section 5 shows this). Keep fallbacks plain.

## 4. The react-error-boundary library

Writing the class once is fine, but many teams use the small package **react-error-boundary**, which the React docs also recommend. It gives you a ready boundary and a hook to send errors from event handlers into a boundary.

```bash
npm install react-error-boundary
```

```jsx
import { ErrorBoundary, useErrorBoundary } from 'react-error-boundary'

function Fallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong: {error.message}</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

function SaveButton() {
  const { showBoundary } = useErrorBoundary()

  async function save() {
    try {
      const res = await fetch('/api/profile', { method: 'POST' })
      if (!res.ok) throw new Error(`Save failed with status ${res.status}`)
    } catch (error) {
      showBoundary(error) // the nearest ErrorBoundary now shows its fallback
    }
  }

  return <button onClick={save}>Save</button>
}

export default function Page({ userId }) {
  return (
    <ErrorBoundary
      FallbackComponent={Fallback}
      resetKeys={[userId]}
      onError={(error, info) => console.log(error.message, info.componentStack)}
    >
      <SaveButton />
    </ErrorBoundary>
  )
}
```

The main pieces (names are from the library's README):
- `FallbackComponent`, `fallbackRender` and `fallback`: three ways to describe the fallback. The first two receive `{ error, resetErrorBoundary }`.
- `onError(error, info)`: called when the boundary catches something. Use it for logging.
- `onReset` and `resetKeys`: the same ideas as in section 3.
- `useErrorBoundary()`: returns `{ showBoundary, resetBoundary }`. `showBoundary(error)` hands any error, for example one from an event handler or a `fetch`, to the nearest boundary (section 6 explains why you need this).
- `withErrorBoundary(Component, props)`: a wrapper function for the same thing.

Note: the practice app does not install this package, so the book's own tests did not run this snippet. Copy it into your own project and read the README of the version you install, because option details can change between versions.

**Common mistake:** calling `useErrorBoundary()` in a component that has no `ErrorBoundary` above it. There is nobody to receive the error, so the hook cannot do its job. Place a boundary above any component that uses it.

## 5. Where to put error boundaries

One boundary around the whole app is better than none, but it makes every failure a full-page failure. Good apps use three levels.

```text
<ErrorBoundary>                    App level: the last safety net
  <Header />                       Outside any page boundary, so it stays alive
  <ErrorBoundary>                  Route (page) level: "This page failed"
    <DashboardPage>
      <ErrorBoundary> <SalesChart />  </ErrorBoundary>   Widget level
      <ErrorBoundary> <OrdersTable /> </ErrorBoundary>   Widget level
      <ErrorBoundary> <UsersList />   </ErrorBoundary>   Widget level
    </DashboardPage>
  </ErrorBoundary>
</ErrorBoundary>
```

- **App level.** The last safety net. The fallback is a full-page message with a "Reload" button. If this one shows, something unexpected happened.
- **Route level.** One boundary per page, so the navigation stays visible and the user can leave the broken page. Routers and frameworks give you this: React Router lets you set an error element per route, and the Next.js App Router has an `error.js` file per route segment. See [React Router](03-react-router.md).
- **Widget level.** Around parts that can fail on their own and are not vital: a chart, a comments list, a third-party embed, a recommendations panel. The rest of the page keeps working.

Rule of thumb: put a boundary where a failure can happen **independently** (own data, own third-party code) and where the rest of the screen is still useful without it. Do not wrap every component. Too many boundaries hide bugs and make fallbacks pile up.

Here is the widget level in code, with a failing `OrdersTable`:

```jsx
export default function Dashboard() {
  return (
    <main>
      <ErrorBoundary fallback={<p>Sales are unavailable right now.</p>}>
        <SalesChart />
      </ErrorBoundary>
      <ErrorBoundary fallback={<p>Orders are unavailable right now.</p>}>
        <OrdersTable />
      </ErrorBoundary>
      <ErrorBoundary fallback={<p>Users are unavailable right now.</p>}>
        <UsersList />
      </ErrorBoundary>
    </main>
  )
}
```

**What happens, step by step** (from a test with three small widgets of this shape):
1. `SalesChart` renders normally and shows its text, `Sales ok`.
2. `OrdersTable` throws. Only its own boundary reacts and shows its fallback.
3. `UsersList` renders normally, `Users ok`.
4. The text on screen was `Sales ok`, then the orders fallback, then `Users ok`. When the same three widgets sat under one single boundary, the screen showed only one fallback and nothing else.

**Nesting rule.** An error goes to the **nearest** boundary above the component that threw. If that boundary's own fallback throws, the error goes to the next boundary above it. In a test, a boundary whose fallback threw `fallback exploded` was caught by the outer boundary, which showed its message.

**Boundaries and Suspense.** Put the boundary **outside** the `Suspense`. Suspense shows a loading state. The boundary shows the failure state (section 14 shows a failed code download):

```jsx
<ErrorBoundary fallback={<p>Could not load the chart.</p>}>
  <Suspense fallback={<p>Loading chart...</p>}>
    <Chart />
  </Suspense>
</ErrorBoundary>
```

**Common mistake:** a single app-level boundary and nothing else.

```jsx
// Wrong: any widget failure replaces the whole app
<ErrorBoundary fallback={<p>Something went wrong.</p>}>
  <App />
</ErrorBoundary>
```

Keep the app-level one as a safety net, and add route and widget boundaries below it.

## 6. What error boundaries do NOT catch

A boundary only watches **rendering**. These cases are outside its reach:

1. **Event handlers** (`onClick`, `onChange`, `onSubmit`). Handlers run after rendering, in response to the user. React does not need to throw the screen away, because rendering did not fail.
2. **Async code**: `setTimeout`, `setInterval`, promises, `fetch(...).then(...)`, `async` handlers, and an `async` function called from an effect.
3. **Server-side rendering.** There are no error boundaries on the server. See the note below.
4. **The boundary itself.** It cannot catch an error thrown by its own render. That goes to the next boundary above (section 5).
5. **Code outside React**, such as a plain `window.addEventListener` callback.

Proof for case 1, with a button that throws:

```jsx
function SaveButton() {
  return (
    <button
      onClick={() => {
        throw new Error('click failed')
      }}
    >
      Click me
    </button>
  )
}

// <ErrorBoundary fallback={<p>Oops</p>}><SaveButton /></ErrorBoundary>
```

**What happens, step by step** (from a real run):
1. The user clicks. The handler throws.
2. The boundary does **not** react. The button stays on the screen, and no fallback appears.
3. React reports the error to the browser as an uncaught error. In the test, a `window` `error` event with the message `click failed` was fired.

The same is true for case 2. A `throw` inside a `setTimeout` callback left the button on screen with no fallback. A rejected promise inside an `async` function that an effect called (`load()`) was also not caught.

### How to handle these errors

**Option A: keep the error local.** For a failed form submit, show an inline message. The user keeps what they typed.

```jsx
import { useState } from 'react'

function SaveForm() {
  const [message, setMessage] = useState('')

  async function onSubmit(event) {
    event.preventDefault()
    try {
      const res = await fetch('/api/profile', { method: 'POST' })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      setMessage('Saved')
    } catch (error) {
      setMessage('Could not save. Please try again.')
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <button>Save</button>
      <p role="status">{message}</p>
    </form>
  )
}
```

**Option B: hand the error to the nearest boundary.** Use this when the part cannot work at all. The trick is to rethrow the error **during rendering**, where boundaries can see it. There are two ways, and both worked in tests.

Store the error in state and throw it while rendering:

```jsx
import { useState } from 'react'

function LoadUser() {
  const [error, setError] = useState(null)
  if (error) throw error // now it is a render error

  return (
    <button
      onClick={async () => {
        try {
          const res = await fetch('/api/user')
          if (!res.ok) throw new Error(`Status ${res.status}`)
        } catch (e) {
          setError(e)
        }
      }}
    >
      Load user
    </button>
  )
}
```

Or package the "throw in a state updater" trick as a small hook. React runs state updater functions during the next render, so a throw inside one is a render error:

```jsx
import { useCallback, useState } from 'react'

export function useThrowToBoundary() {
  const [, setState] = useState()
  return useCallback((error) => {
    setState(() => {
      throw error
    })
  }, [])
}
```

```jsx
function LoadUser() {
  const throwToBoundary = useThrowToBoundary()

  async function load() {
    try {
      const res = await fetch('/api/user')
      if (!res.ok) throw new Error(`Status ${res.status}`)
    } catch (error) {
      throwToBoundary(error)
    }
  }

  return <button onClick={load}>Load user</button>
}
```

In a test, a `Network down` error from an async click handler went through this hook and the boundary showed `Failed: Network down`. This is exactly what `showBoundary` from `react-error-boundary` does.

**Option C: React 19 Actions.** If you run the async work in the function that `useTransition` gives you, an error thrown inside it goes to the nearest boundary by itself:

```jsx
import { useTransition } from 'react'

function SaveButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const res = await fetch('/api/profile', { method: 'POST' })
          if (!res.ok) throw new Error(`Status ${res.status}`)
        })
      }}
    >
      Save
    </button>
  )
}
```

Careful: this works for the `startTransition` that comes from the `useTransition` **hook**. The standalone `startTransition` function imported from `react` did not reach the boundary in my test. The error went to the window as an uncaught error. Data libraries have the same idea. TanStack Query has a `throwOnError` option, and `use(promise)` sends a rejected promise to the nearest boundary. See [Data fetching](02-data-fetching.md).

**Option D: a global net for logging only.** These two listeners cannot show a fallback, but they can report what nothing else caught:

```js
window.addEventListener('error', (event) => {
  logClientError('window-error', event.error ?? new Error(event.message))
})

window.addEventListener('unhandledrejection', (event) => {
  logClientError('unhandled-rejection', event.reason)
})
```

(`logClientError` is written in section 7.)

**Server rendering.** If a component throws on the server, there is no boundary to show a fallback. The server render APIs have their own `onError` and `onShellError` options for reporting. When the error is inside a `Suspense` boundary, React sends that boundary's fallback and lets the browser try the render again. See [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md).

**Common mistake:** expecting a boundary to catch a failed `fetch`.

```jsx
// Wrong: a failed request is an async error, the boundary never sees it
useEffect(() => {
  fetch('/api/user').then((r) => r.json()).then(setUser)
}, [])
```

```jsx
// Right: catch it and either show an inline message or throw it into render
useEffect(() => {
  fetch('/api/user')
    .then((r) => r.json())
    .then(setUser)
    .catch(setError) // render: if (error) throw error
}, [])
```

## 7. Reporting errors: logging and the React 19 root options

Users rarely tell you when something breaks. They close the tab. A **monitoring service** (an error tracker such as Sentry, Datadog or your own endpoint) receives each error, so you can see which ones happen and how often. A good report has the message, the JavaScript stack, the **component stack** (which components were on screen), the URL, your app version, and a time.

Write one small reporter and use it everywhere. A reporter must never throw, so it wraps its work in `try/catch`.

```js
// src/logClientError.js
export function logClientError(kind, error, componentStack) {
  const payload = {
    kind,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    componentStack,
    url: window.location.href,
    time: new Date().toISOString(),
  }

  if (import.meta.env.DEV) {
    console.error('[client error]', payload)
    return
  }

  try {
    fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true, // lets the request finish even if the page is closing
    }).catch(() => {})
  } catch {
    // Reporting must never cause a second error.
  }
}
```

(`/api/client-errors` is an endpoint of your own backend, or you replace the `fetch` with your tracker's SDK call.)

In production your code is **minified**, so a stack trace points to `main-3f2a.js:1:48213`. A **source map** file lets the tracker translate that back to your real file and line. See Tooling: Vite, ESLint and build (planned).

### Where to call the reporter

You can call it from `componentDidCatch` (or the `onError` prop of your boundary):

```jsx
<ErrorBoundary
  onError={(error, info) => logClientError('caught', error, info.componentStack)}
  fallback={<p>Something went wrong.</p>}
>
  <App />
</ErrorBoundary>
```

But React 19 has a better single place: three options on the root.

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { logClientError } from './logClientError.js'

createRoot(document.getElementById('root'), {
  onCaughtError(error, info) {
    logClientError('caught', error, info.componentStack)
  },
  onUncaughtError(error, info) {
    logClientError('uncaught', error, info.componentStack)
  },
  onRecoverableError(error, info) {
    logClientError('recoverable', error, info.componentStack)
  },
}).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

(`hydrateRoot` accepts the same three options for server-rendered apps.)

What each callback means:
- **`onCaughtError(error, info)`**: an error boundary caught the error. `info` has `componentStack` (a string) and `errorBoundary` (the boundary instance that caught it). This covers every boundary in the app, including ones inside libraries.
- **`onUncaughtError(error, info)`**: a render error that **no boundary caught**. The whole tree is gone, so this is your "white screen" alarm. `info` has `componentStack`.
- **`onRecoverableError(error, info)`**: React hit a problem and fixed it by itself, so the user saw no failure. The common case is a **hydration mismatch**: the HTML from the server did not match what the browser rendered, so React threw the server HTML away and rendered on the client. In a test, hydrating `<p>from-server</p>` with a component that rendered `from-client` called this callback with a message starting "Hydration failed because the server rendered text didn't match the client", and the final screen showed the client text. It is not an emergency, but a pile of these means a bug or a slow page.

**What happens, step by step** (real results from a test root with no `act` around it):
1. A failing component sits inside a boundary. The boundary shows its fallback, and `onCaughtError` is called once with `info.errorBoundary` set.
2. A failing component sits with no boundary. The root container becomes empty, and `onUncaughtError` is called once.
3. A button handler throws. **Neither** callback is called. Handler errors go to the window `error` event (section 6), so keep the `window` listeners from section 6 for them.
4. When you set a callback yourself, it **replaces** React's default logging. Without options, a caught error was logged by React with one `console.error`, and an uncaught error was sent to the window `error` event. With custom callbacks, neither default happened. So in development, `logClientError` above prints the error itself.

**Which place should log?** Pick one for each kind of error. If you log in both `componentDidCatch` and `onCaughtError`, every error is reported twice. A good split: the root options do the global reporting (they see everything), and a boundary's `onError` is only for local reactions, such as adding a widget name.

**Testing note.** Inside `act`, which Testing Library's `render` uses, an uncaught render error is rethrown to your test instead of reaching `onUncaughtError`. To test the root options, use `createRoot` directly (see the practice-app tests for examples).

**Common mistake:** logging code that can fail.

```jsx
// Wrong: if JSON.stringify or fetch throws here, you get a second error inside the error path
componentDidCatch(error, info) {
  fetch('/log', { method: 'POST', body: JSON.stringify({ error, info }) })
}
```

```jsx
// Right: one safe reporter function, with its own try/catch (shown above)
componentDidCatch(error, info) {
  logClientError('caught', error, info.componentStack)
}
```

An `Error` object turns into `{}` in `JSON.stringify`, so send `message` and `stack` as strings, as the reporter does.

## 8. Portals: render somewhere else in the DOM

Normally, what a component draws goes inside what its parent drew. That is usually what you want. But some UI must escape its parent's box:
- A **modal** has to cover the whole screen.
- A **tooltip** or **dropdown** must not be cut off by a container.
- A **toast** must sit in a screen corner no matter where it was created.

If you render these in place, CSS fights you:
- `overflow: hidden` on any ancestor clips the child.
- `z-index` only works inside a **stacking context** (a group of elements that are layered together). An ancestor with `transform`, `opacity` below 1 or `filter` starts a new stacking context, so a huge `z-index` inside it cannot beat a small one outside it.
- `position: fixed` is measured from the screen, but an ancestor with a `transform` becomes the reference instead.

(CSS details are in HTML, CSS and browser basics (planned).)

A **portal** fixes this: the component stays where it is in the **React tree**, but its DOM output is placed into a different DOM node.

```jsx
import { createPortal } from 'react-dom'

function Note() {
  return (
    <div className="card">
      <p>Inside the card.</p>
      {createPortal(<p>Drawn at the end of body.</p>, document.body)}
    </div>
  )
}
```

`createPortal(children, domNode)` takes what to draw and where to put it. It is imported from `react-dom`, not from `react`.

**What happens, step by step:**
1. React renders `Note`. The first `<p>` goes inside `.card`, like normal.
2. `createPortal` returns a special element. React draws its children into `document.body` instead of inside `.card`.
3. In the DOM, the second `<p>` is a child of `<body>`. It is **not** inside `.card`, so `overflow: hidden` or `transform` on `.card` cannot clip it.
4. In React's component tree, the second `<p>` is still a child of `Note`. It keeps working with state and props as if nothing special happened.
5. When `Note` is removed, React removes the portal content too.

Any DOM node that React does not manage works as the target. `document.body` is fine. Some teams add `<div id="modal-root"></div>` to `index.html` and use `document.getElementById('modal-root')`.

**Common mistake:** creating the portal on the server. `document` does not exist there.

```jsx
// Wrong during server rendering: document is undefined
function Tooltip({ text }) {
  return createPortal(<div>{text}</div>, document.body)
}
```

```jsx
// Right: render the portal only after something happened on the client (a modal starts closed)
function Modal({ open, children }) {
  if (!open) return null // document is not touched while closed
  return createPortal(children, document.body)
}
```

## 9. Two trees: events, context and errors follow React, CSS follows the DOM

A portal creates a split. There are two trees now:
- The **React tree**: which component is the child of which.
- The **DOM tree**: which element sits inside which.

For most things they are the same. For a portal they differ, so you must know which tree each feature follows.

| Feature | Follows |
|---|---|
| Context (`useContext`) | React tree |
| Event bubbling (`onClick` and friends) | React tree |
| Error boundaries | React tree |
| CSS inheritance (`color`, `font`) and selectors like `.card p` | DOM tree |
| `element.closest()`, `contains()`, native `addEventListener` | DOM tree |

Each of the first three rows was checked in a test. Here is the one that surprises people most, event bubbling.

```jsx
import { createPortal } from 'react-dom'

function Parent() {
  return (
    <div onClick={() => console.log('React onClick on Parent div')}>
      {createPortal(
        <button onClick={() => console.log('React onClick on portal button')}>Inside portal</button>,
        document.body
      )}
    </div>
  )
}
```

Click the button. The console shows:

```text
React onClick on portal button
React onClick on Parent div
```

**What happens, step by step:**
1. The button lives in `<body>` in the DOM, far away from `Parent`'s `<div>`.
2. React still sees the button as a descendant of that `<div>` in the React tree.
3. React runs the button's `onClick` first, then bubbles to the nearest React ancestor that has an `onClick`: the `<div>`. So the parent's handler runs, even though the DOM says they are not related.
4. A native `container.addEventListener('click', ...)` placed on the app's root element did **not** run in the test. In the real DOM the click never passed through that element.

Context works the same way. A component inside a portal still reads the context of its React parents: a `ThemedBox` portalled into `<body>` inside a `<ThemeContext value="dark">` printed `theme=dark`. And an error thrown by a portal child was caught by the error boundary around its React parent.

CSS is different. The portal content is a child of `<body>` in the DOM, so it inherits `color` and `font` from `body`, not from the component that created it, and a selector like `.card .tooltip` will not match.

**Why this is useful:** a modal can call the `onClick` and `onKeyDown` handlers of the component that opened it, and share its context, with no extra wiring.

**Why this can bite:** a click inside the modal bubbles to the opener's parents. A modal inside a clickable row can trigger the row's click.

**Common mistake and fix:**

```jsx
// Wrong: clicking inside the modal also runs select(item)
<li onClick={() => select(item)}>
  {item.name}
  <Modal open={open} onClose={close} title="Details">...</Modal>
</li>
```

```jsx
// Right (option 1): stop the click at the modal root
<div className="overlay" onClick={onClose}>
  <div role="dialog" onClick={(event) => event.stopPropagation()}>...</div>
</div>

// Right (option 2): render the Modal outside the clickable element in the JSX
<>
  <li onClick={() => select(item)}>{item.name}</li>
  <Modal open={open} onClose={close} title="Details">...</Modal>
</>
```

A test confirmed that `event.stopPropagation()` in the portal's button stopped the parent's React handler from running.

## 10. A modal you can paste, with focus and accessibility

Here is a small modal that uses a portal. It closes with a Close button, with the Escape key, and with a click on the dark background. It moves keyboard focus into the dialog when it opens and gives focus back to the opener when it closes.

```jsx
// src/Modal.jsx
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export function Modal({ open, onClose, title, children }) {
  const titleId = useId()
  const dialogRef = useRef(null)

  // Focus: move into the dialog on open, give it back on close.
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    dialogRef.current.focus()
    return () => opener?.focus()
  }, [open])

  // Escape key closes the dialog.
  useEffect(() => {
    if (!open) return
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="overlay" data-testid="overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>,
    document.body
  )
}
```

```jsx
// src/App.jsx
import { useState } from 'react'
import { Modal } from './Modal.jsx'

export default function App() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  return (
    <div style={{ overflow: 'hidden', transform: 'translateZ(0)' }}>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit profile">
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
      </Modal>
    </div>
  )
}
```

```css
/* src/index.css */
.overlay {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.5);
  display: grid;
  place-items: center;
}
.dialog {
  background: white;
  color: black;
  padding: 1.5rem;
  border-radius: 8px;
  min-width: 20rem;
}
```

The wrapper `div` in `App` clips its children and has a `transform`. That is on purpose: without the portal, the dialog would be trapped in that box.

**What happens, step by step** (verified with a user-event test, also inside `<StrictMode>`):
1. The page starts with only the button. `Modal` returns `null`, so nothing is in the DOM.
2. The user clicks "Open modal". `open` becomes `true`. `Modal` renders through `createPortal` into `<body>`. The dialog was **not** inside the app's container, its overlay was a child of `<body>`.
3. The first effect runs. It remembers the element that had focus (the opener button) and focuses the dialog (`tabIndex={-1}` makes a `div` focusable by script). The test confirmed `document.activeElement` was the dialog.
4. The user clicks the input and types "Ada". All three letters arrived, and the input kept focus even though `App` re-rendered on every key.
5. The user presses Escape. The second effect's listener calls `onClose`. `open` becomes `false`. The cleanup of the first effect runs and focuses the opener again. The test confirmed `document.activeElement` was the "Open modal" button.
6. A click on the overlay closes the modal. A click on the heading inside the dialog does not (`stopPropagation`). The Close button closes it.

**Why two effects?** The focus code must run only when the modal opens or closes, so its dependency list is `[open]`. The Escape code needs the latest `onClose`, so its list is `[open, onClose]`. If you put both in one effect, the focus code runs again every time the parent passes a new `onClose` function. In a test with a single effect, typing "Ada" into the input produced only `A`: after the first letter the parent re-rendered, the effect re-ran, and focus jumped from the input back to the dialog.

**What this modal does not do yet (accessibility checklist):**
- **Focus trap.** Pressing Tab on the last control should move to the first control inside the dialog, not to the page behind. Build it in exercise [14 Modal with portal](../practice-app/exercises/react/14-modal-portal/README.md).
- **Scroll lock.** The page behind should not scroll while the modal is open. The same exercise covers it.
- **Hiding the background.** `aria-modal="true"` asks screen readers to ignore the rest of the page. Some people also mark the background `inert`.
- The native `<dialog>` element with `showModal()` already does the focus trap, the Escape key and the "background is inert" part for you, and draws in the browser's top layer, so it escapes `overflow` and `z-index` without a portal. It is worth trying when you can use it. A custom modal gives you more control over animation and structure.
- A toast message (a small note that disappears) also uses a portal plus a live region. Build one in exercise [31 Toast system](../practice-app/exercises/react/31-toast-system/README.md). The full accessibility story is in [Accessibility](../04-advanced/09-accessibility.md).

**Common mistake:** a modal with no way for the keyboard user to leave, or one that never gives focus back.

```jsx
// Wrong: nothing handles Escape and focus. A keyboard user is lost.
return createPortal(<div className="overlay">{children}</div>, document.body)
```

```jsx
// Right: use the Modal above, which handles Escape, focus in and focus back
```

## 11. Fragments: grouping without extra DOM

A component must return one thing. A wrapper `<div>` is the usual answer, but sometimes the extra element is wrong. A table row may only contain cells. A flex or grid container needs its direct children.

A **Fragment** groups elements and adds nothing to the DOM. It has a short form `<>...</>` and a long form `<Fragment>...</Fragment>`.

```jsx
function Row() {
  return (
    <>
      <td>A</td>
      <td>B</td>
    </>
  )
}

export default function App() {
  return (
    <table>
      <tbody>
        <tr>
          <Row />
        </tr>
      </tbody>
    </table>
  )
}
```

**What happens, step by step:**
1. `Row` returns two `<td>` elements inside a fragment.
2. React draws the two cells directly inside the `<tr>`. The real output was `<table><tbody><tr><td>A</td><td>B</td></tr></tbody></table>`, with no wrapper.
3. With a `<div>` instead of the fragment, the HTML would be invalid and the table layout would break.

### Keys need the long form

When you `map` over data and each item produces **several** elements, the item needs a `key`. The short syntax `<>` cannot take attributes, so use `<Fragment key={...}>`.

```jsx
import { Fragment } from 'react'

const terms = [
  { id: 'a', term: 'React', desc: 'UI library' },
  { id: 'b', term: 'Vite', desc: 'Build tool' },
]

export default function Glossary() {
  return (
    <dl>
      {terms.map((t) => (
        <Fragment key={t.id}>
          <dt>{t.term}</dt>
          <dd>{t.desc}</dd>
        </Fragment>
      ))}
    </dl>
  )
}
```

The output is a flat `<dl><dt>React</dt><dd>UI library</dd><dt>Vite</dt><dd>Build tool</dd></dl>`. A `<div>` around each pair would be invalid inside a `<dl>`.

### Fragment refs (React 19.3)

Since React 19.3 (September 2026) a Fragment can take a `ref`. The ref gives you a handle for the group of DOM elements inside it. The handle has methods such as `focus()`, `focusLast()`, `blur()`, `addEventListener()`, `removeEventListener()`, `dispatchEvent()`, `scrollIntoView()`, `getClientRects()` and a few observer helpers. They act on the first-level DOM children of the fragment.

```jsx
import { Fragment, useRef } from 'react'

function Fields() {
  const groupRef = useRef(null)

  return (
    <>
      <button onClick={() => groupRef.current.focus()}>Focus first field</button>
      <Fragment ref={groupRef}>
        <input aria-label="First name" />
        <input aria-label="Last name" />
      </Fragment>
    </>
  )
}
```

In a test, `focus()` on the handle focused the first input, and `addEventListener('focusin', ...)` on the handle heard focus events from the first input. Only the long form `<Fragment ref>` works. The short `<>` cannot take a ref.

**Common mistake:** using the short syntax where a key is needed.

```jsx
// Wrong: the short fragment cannot have a key, and React warns about the missing key
{terms.map((t) => (
  <>
    <dt>{t.term}</dt>
    <dd>{t.desc}</dd>
  </>
))}
```

```jsx
// Right
{terms.map((t) => (
  <Fragment key={t.id}>
    <dt>{t.term}</dt>
    <dd>{t.desc}</dd>
  </Fragment>
))}
```

## 12. StrictMode: a development-only safety check

`<StrictMode>` is a component you wrap around your app (or any part of it). In **development** it makes React do extra work to expose bugs. In **production** it does nothing at all and costs nothing. Vite's React template already wraps your app in it.

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

What it does in development:
1. **Renders every component twice.** This includes the function body, `useState` initializer functions and state updater functions.
2. **Runs every effect one extra time on mount:** setup, then cleanup, then setup again.
3. **Calls ref callbacks one extra time on mount** (React 19).
4. **Warns about deprecated APIs.**
5. Since React 19.3 it also repeats effects during hydration (when server HTML becomes interactive).

Why? React may call your component more than once, pause a render, throw it away, or remove and re-add a component later (for example when it hides and shows one with `Activity`). So React asks two things of your code: **render must be pure** (same inputs, same output, no changes to anything outside), and **every effect must have a working cleanup**. StrictMode checks both by doing the risky thing on purpose, early, on your machine, not later in front of a user.

Real output for this component:

```jsx
function App() {
  console.log('render')
  useEffect(() => {
    console.log('setup')
    return () => console.log('cleanup')
  }, [])
  return <p>hi</p>
}
```

```text
Development with StrictMode:   render, render, setup, cleanup, setup
Production build:              render, setup
```

(The development line came from a test, the production line from a Node script with `NODE_ENV=production`.)

**What happens, step by step:**
1. React calls `App` twice. Only one result is used. The second call is there to see whether the output depends on anything besides props and state.
2. React puts the component on screen and runs the effect: `setup`.
3. React simulates the component leaving and coming back: it runs `cleanup`, then `setup` again. If your cleanup is correct, the second `setup` leaves you in the same state as the first.
4. In production, none of the extra calls happen.

### StrictMode finds impure renders

```jsx
let guestCount = 0

function Welcome() {
  guestCount = guestCount + 1 // changes a variable outside the component during render
  return <p>Guest number {guestCount}</p>
}
```

Without StrictMode the screen says "Guest number 1". Inside `<StrictMode>` it says "Guest number 2", because the function ran twice. The counter should be state or come from props. The double render is not the bug, it only shows you the bug.

### StrictMode finds missing cleanups

A very common surprise is a request that fires twice in development:

```jsx
useEffect(() => {
  let ignore = false

  fetch(`/api/users/${id}`)
    .then((res) => res.json())
    .then((data) => {
      if (!ignore) setUser(data)
    })

  return () => {
    ignore = true // cleanup: ignore the answer of an older request
  }
}, [id])
```

In a test inside `<StrictMode>`, the fetch started twice, the first answer was ignored, and the screen showed the result once. In production there is one request. The cleanup is what makes both cases correct. See [useEffect](../02-hooks/03-useeffect.md) for abort controllers and the full story.

**Things to remember:**
- Do not remove StrictMode to make the double calls go away, and do not add "run only once" hacks. Fix the purity bug or add the cleanup.
- `console.log` in render shows twice in development. React DevTools can dim the second log.
- StrictMode adds no UI and no production cost. It does not find every bug.
- For React 19, the second render reuses the results of `useMemo` and `useCallback` from the first one.

**Common mistake:** guarding the effect with a ref to stop the second run.

```jsx
// Wrong: hides the problem in development, and the leak is still there
const ran = useRef(false)
useEffect(() => {
  if (ran.current) return
  ran.current = true
  const id = setInterval(tick, 1000) // never cleared
}, [])
```

```jsx
// Right: the effect cleans up after itself, so running it twice is safe
useEffect(() => {
  const id = setInterval(tick, 1000)
  return () => clearInterval(id)
}, [])
```

## 13. The Profiler component

React DevTools has a Profiler tab for clicking around and recording. The **`<Profiler>` component** is the code version: you wrap a part of the tree, and React calls your function every time that part commits an update. It is useful when you want numbers inside the app, for example in a test or in a staging build.

```jsx
import { Profiler } from 'react'

function onRender(id, phase, actualDuration, baseDuration, startTime, commitTime) {
  console.log(`${id} ${phase}: ${actualDuration.toFixed(1)} ms`)
}

export default function App() {
  return (
    <Profiler id="Feed" onRender={onRender}>
      <Feed />
    </Profiler>
  )
}
```

The `onRender` arguments:
- `id`: the string from the `id` prop, so you know which profiler fired.
- `phase`: `"mount"` (first render), `"update"` (re-render) or `"nested-update"` (a re-render that was scheduled from a layout effect or `componentDidUpdate` while the previous update was being committed).
- `actualDuration`: milliseconds spent rendering this update for the wrapped part. If `memo` skipped work, this number drops.
- `baseDuration`: an estimate of the time to render the whole wrapped part with no memoization at all, the worst case.
- `startTime` and `commitTime`: timestamps of when React started rendering this update and when it committed it.

**What happens, step by step** (real run with a counter inside `<Profiler id="counter">`):
1. The component mounts. `onRender` is called with `"counter"` and `"mount"`.
2. The user clicks the button, state changes, and the component re-renders. `onRender` is called again with `"update"`.
3. All four time values were plain numbers in both calls (their sizes change from machine to machine, so do not hard-code them in tests).

Good to know:
- In a normal **production** build the Profiler is switched off and does nothing. You need React's special profiling build to measure there.
- Measuring has a cost, so wrap only the parts you care about.
- The callback can fire even if nothing on the screen changed, because something inside the wrapped part rendered. It tells you about rendering work, not DOM changes.
- Do not use it for app logic. It is a measuring tool.

For finding slow components and fixing them, see [Performance optimization](../04-advanced/02-performance-optimization.md).

**Common mistake:** one Profiler around the whole app.

```jsx
// Wrong: this only tells you "something in the app is slow", not what
<Profiler id="App" onRender={onRender}>
  <App />
</Profiler>
```

```jsx
// Right: wrap the suspects, give them names, and compare numbers before and after your fix
<Profiler id="ProductList" onRender={onRender}>
  <ProductList />
</Profiler>
<Profiler id="Cart" onRender={onRender}>
  <Cart />
</Profiler>
```

Development builds are slower than production builds, and StrictMode renders twice, so read the numbers as a comparison between two versions of your code, not as what users will see.

## 14. React.lazy and Suspense: load code only when needed

When you build a Vite app, all your imports are bundled into JavaScript files that the browser must download before the app starts. A big chart library or a rarely visited page makes that download larger for everybody. **Code splitting** means cutting the bundle into pieces and downloading a piece only when it is needed.

Two tools do this:
- A **dynamic import**, `import('./Chart.jsx')`, is a JavaScript feature that returns a promise. The bundler puts the imported file into its own separate file (a **chunk**).
- **`React.lazy`** wraps a dynamic import so that you can use the result as a component. **`Suspense`** shows a fallback while it loads.

```jsx
// src/Chart.jsx
export default function Chart() {
  return <p>Chart loaded</p>
}
```

```jsx
// src/Report.jsx
import { lazy, Suspense, useState } from 'react'

const Chart = lazy(() => import('./Chart.jsx'))

export default function Report() {
  const [show, setShow] = useState(false)

  return (
    <>
      <button onClick={() => setShow(true)}>Show chart</button>
      {show && (
        <Suspense fallback={<p>Loading chart...</p>}>
          <Chart />
        </Suspense>
      )}
    </>
  )
}
```

**What happens, step by step** (checked with a loader that resolves after a short delay):
1. The app starts. `lazy(...)` has only created a placeholder component. The chart's code is not downloaded.
2. The user clicks "Show chart". React renders `<Chart />` for the first time and calls the loader function.
3. The component cannot render yet, so it **suspends**. React shows the nearest `Suspense` fallback: `Loading chart...`.
4. The code arrives. React renders the real component and replaces the fallback. The screen says `Chart loaded`.
5. The loader ran once. Re-rendering the parent again and again did not call it again.

The rules:
- The loaded module must have a **default export**. With a named export, `lazy` fails with the error "Element type is invalid ... Lazy element type must resolve to a class or function". Map a named export like this: `lazy(() => import('./charts.jsx').then((m) => ({ default: m.Chart })))`.
- Define `lazy(...)` at the **top level of the file**, never inside a component (see the mistake below).
- One `Suspense` can cover many lazy components. Place it near the part that loads, so only that part shows a fallback. For a routed app, a common spot is around the router's outlet.
- Split at **routes** and at **big, rarely used pieces** (editors, charts, maps, admin screens). Do not split tiny components. The extra requests cost more than they save.
- Warm the cache early: calling the same `import('./Chart.jsx')` on `onMouseEnter` of the button starts the download before the click.

### When the download fails

The network can fail, or a new deployment can remove an old chunk file. The promise from `import()` then rejects, and the error is thrown in the lazy component. An **error boundary above the Suspense** catches it. In a test, a loader that rejected with `Failed to fetch dynamically imported module` led to the boundary showing `Could not load: Failed to fetch dynamically imported module`. Offer a "Reload page" button in that fallback, because a retry of the same import often needs a fresh page.

```jsx
<ErrorBoundary fallback={<p>Could not load the chart. Please reload the page.</p>}>
  <Suspense fallback={<p>Loading chart...</p>}>
    <Chart />
  </Suspense>
</ErrorBoundary>
```

Lazy routes are covered in [React Router](03-react-router.md). Suspense for data (`use(promise)`) is in [Data fetching](02-data-fetching.md) and, in depth, in [Concurrent React and Suspense](../04-advanced/03-concurrent-react-and-suspense.md). Bundle analysis is in [Performance optimization](../04-advanced/02-performance-optimization.md).

**Testing tip.** A component that suspends needs an awaited `act`. A plain `render(...)` from Testing Library can leave the tree stuck on the fallback. Write `await act(async () => { render(<Report />) })` and then `await screen.findByText(...)`.

**Common mistake:** creating the lazy component inside another component.

```jsx
// Wrong: every render makes a NEW lazy component, so React loads and re-suspends again
function Parent() {
  const [n, setN] = useState(0)
  const Chart = lazy(() => import('./Chart.jsx'))
  return <Suspense fallback={<p>Loading...</p>}><Chart /></Suspense>
}
```

```jsx
// Right: one lazy component for the whole app
const Chart = lazy(() => import('./Chart.jsx'))
function Parent() {
  return <Suspense fallback={<p>Loading...</p>}><Chart /></Suspense>
}
```

In a test with the wrong version, the loader ran once on mount and once more after each parent re-render: mount plus three re-renders made 4 loads, and the fallback showed again after a re-render. In the right version, the loader ran once, no matter how often the parent re-rendered.

## 15. Children, cloneElement, isValidElement and createElement

These tools belong to the older style of React. They still work in React 19, but the React docs list them as **legacy**: not recommended for new code. You will meet them in older code bases and in interview questions, so you should be able to read them.

### What `children` can be

The `children` prop can be one element, an array of elements, a string, a number, `null`, or a mix. Because of that, `children` is **not always an array**. The `Children` helper object (capital C, from `react`) works on any of these shapes.

```jsx
import { Children, isValidElement } from 'react'

function Probe({ children }) {
  console.log('count:', Children.count(children))
  console.log('toArray length:', Children.toArray(children).length)
  return <ul>{Children.map(children, (child) => (isValidElement(child) ? <li>{child}</li> : child))}</ul>
}

// <Probe>
//   <span>a</span>
//   {null}
//   {false}
//   text
//   {[<b key="x">x</b>, <i key="y">y</i>]}
// </Probe>
```

Real results for this usage:
- `Children.count(children)` is **6**. It counts the span, the `null`, the `false`, the text, and the two items of the array. Empty values count as nodes.
- `Children.toArray(children).length` is **4**. It drops the empty values and gives every item a key (the keys looked like `.0`, `.4:$x`, `.4:$y`).
- `Children.forEach` visited 6 positions, and `false` arrived as `null`.
- A `<>...</>` fragment with three spans counted as **1**. The helpers do not look inside fragments or inside the elements themselves.
- `Children.only(children)` returns the single child, and it **throws** if there are two (`React.Children.only expected to receive a single React element child`).

Why docs warn against it: the helpers only see what the parent passes in. If someone wraps a child in another component or a fragment, the result changes, and your code breaks silently.

**Common mistake:**

```jsx
// Wrong: with a single child, children is an element, not an array. length is undefined.
const total = children.length
```

```jsx
// Right
const total = Children.count(children)
```

### cloneElement

`cloneElement(element, props)` makes a copy of an element with extra or changed props. Older code used it to inject props into children:

```jsx
import { Children, cloneElement, isValidElement } from 'react'

function Item({ label, active }) {
  return (
    <li aria-current={active ? 'true' : undefined}>
      {label}
      {active ? ' (active)' : ''}
    </li>
  )
}

function List({ activeIndex, children }) {
  return (
    <ul>
      {Children.map(children, (child, i) =>
        isValidElement(child) ? cloneElement(child, { active: i === activeIndex }) : child
      )}
    </ul>
  )
}

// <List activeIndex={1}><Item label="One" /><Item label="Two" /></List>
```

The output was `<ul><li>One</li><li aria-current="true">Two (active)</li></ul>`.

It is fragile. If a child is a wrapper component that does not pass the injected `active` prop on, the prop is lost. In a test, a `Fancy` component that rendered `<Item label="Fancy" />` without forwarding props never became active, even at the active index.

Better options today:
- **Context**: the parent provides a value and the children read it (compound components, see [Component patterns](01-component-patterns.md)).
- **Render props**: `<List renderItem={(item, active) => ...} />`.
- **Plain data props**: pass an `items` array and let the parent render each item.

### isValidElement

`isValidElement(x)` answers "is this a React element?". In a test it was `true` for `<p />` and `false` for the string `'hi'`, the number `3`, a component function, `null`, and a plain object `{ type: 'p', props: {} }`. Use it before cloning or wrapping something you do not control, because children can be strings.

### createElement: what JSX turns into

JSX is only a nicer way to call a function. `createElement(type, props, ...children)` is the classic call. The build tool converts JSX into function calls like this (modern projects call a similar function named `jsx` from `react/jsx-runtime`, the idea is the same):

```jsx
import { createElement } from 'react'

const a = <h1 className="title">Hello <b>world</b></h1>

const b = createElement('h1', { className: 'title' }, 'Hello ', createElement('b', null, 'world'))
```

Both draw `<h1 class="title">Hello <b>world</b></h1>`. An element is a small plain object that describes what you want: its `type` (`'h1'`) and its `props` (the children live in `props.children`). It is not a DOM node. A rare, reasonable use of `createElement` is choosing a tag by a value:

```jsx
function Heading({ level, children }) {
  return createElement('h' + level, null, children) // level 3 gives <h3>
}
```

(In JSX you can do the same with a capitalised variable: `const Tag = 'h' + level` and then `<Tag>...</Tag>`.)

## 16. Two escape hatches: dangerouslySetInnerHTML and flushSync

### dangerouslySetInnerHTML

JSX text is **escaped** automatically. If a string contains `<b>bold</b>`, React shows the characters, not a bold element. That protects you from **XSS** (cross-site scripting: an attacker gets their JavaScript to run inside your page and acts as your user).

`dangerouslySetInnerHTML` turns the protection off for one element. React puts your string into the DOM as real HTML.

```jsx
const html = '<b>bold</b>'

<div>{html}</div>                                  // shows the text <b>bold</b>
<div dangerouslySetInnerHTML={{ __html: html }} /> // shows bold text
```

In a test, the first version produced `<div>&lt;b&gt;bold&lt;/b&gt;</div>` with 0 `<b>` elements, and the second produced `<div><b>bold</b></div>` with 1.

The long name is a warning on purpose. If the HTML string contains anything a user typed (a comment, a profile bio), an attacker can add a tag like `<img src=x onerror="...">`, and their code will run in your page. So:
- Use it only for content you trust (for example HTML you built yourself at build time), or
- **Sanitize** the string first with a maintained library such as DOMPurify:

```jsx
import DOMPurify from 'dompurify'

function Article({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
}
```

- You cannot give the element children at the same time. React throws "Can only set one of `children` or `props.dangerouslySetInnerHTML`".

More in [Security and i18n](../04-advanced/10-security-and-i18n.md).

### flushSync

React **batches** state updates: it collects the updates from an event handler and updates the screen once after the handler ends. That means the DOM is still old right after you call a setter.

```jsx
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'

function App() {
  const [n, setN] = useState(0)
  const ref = useRef(null)

  return (
    <>
      <p ref={ref}>n={n}</p>
      <button
        onClick={() => {
          setN(1)
          console.log(ref.current.textContent) // plain setN
        }}
      >
        plain
      </button>
      <button
        onClick={() => {
          flushSync(() => setN(2))
          console.log(ref.current.textContent) // after flushSync
        }}
      >
        sync
      </button>
    </>
  )
}
```

Real output: the "plain" button logs `n=0` (the old DOM). The "sync" button logs `n=2`. `flushSync(callback)` makes React finish the update inside the callback and write it to the DOM **immediately**, before the next line runs.

The classic use: add an item to a list and scroll to it. The new element must be in the DOM before you can scroll to it.

```jsx
flushSync(() => {
  setTodos([...todos, newTodo])
})
listRef.current.lastChild.scrollIntoView()
```

Rules:
- It is rare. It forces a render at once, which gives up batching and can slow the page down.
- Do not call it while rendering, and do not call it from inside an effect. In an effect it still worked in a test, but React printed a warning that it was called from a lifecycle method.
- Most "I need the DOM after the update" cases have a cleaner answer: a `useEffect` or `useLayoutEffect` that depends on the data (`useEffect(() => { lastItemRef.current?.scrollIntoView() }, [todos])`). See [How React renders](../04-advanced/01-how-react-renders.md) and [Other hooks](../02-hooks/09-other-hooks.md).

## 17. Putting it together

Here is how the pieces fit in one small app: StrictMode, the three root options, an app-level boundary, a widget boundary, and a lazy page behind Suspense.

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { logClientError } from './logClientError.js'

createRoot(document.getElementById('root'), {
  onCaughtError: (error, info) => logClientError('caught', error, info.componentStack),
  onUncaughtError: (error, info) => logClientError('uncaught', error, info.componentStack),
  onRecoverableError: (error, info) => logClientError('recoverable', error, info.componentStack),
}).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

```jsx
// src/App.jsx
import { Suspense, lazy } from 'react'
import { ErrorBoundary } from './ErrorBoundary.jsx'
import RecommendationsWidget from './RecommendationsWidget.jsx'

const Settings = lazy(() => import('./Settings.jsx'))

export default function App() {
  return (
    <ErrorBoundary fallback={<p>The app crashed. Please reload.</p>}>
      <h1>App</h1>

      <ErrorBoundary fallback={<p>Recommendations are unavailable.</p>}>
        <RecommendationsWidget />
      </ErrorBoundary>

      <Suspense fallback={<p>Loading settings...</p>}>
        <Settings />
      </Suspense>
    </ErrorBoundary>
  )
}
```

`RecommendationsWidget` and `Settings` stand for your own components. `ErrorBoundary` is the one from section 3.

**What happens, step by step** (checked in a test with a widget that always throws and a lazy page):
1. The first paint shows `App`, the widget's fallback (`Widget unavailable` in the test) and the Suspense fallback for the lazy page.
2. The widget error is caught by the inner boundary. `onCaughtError` is called once, and `info.errorBoundary` is the boundary instance.
3. When the lazy page has loaded, the Suspense fallback is replaced by the page. The header and the widget fallback stay as they were.
4. The report goes through `logClientError`, so you can swap the destination in one file.

## How interviewers test this
- **Boundaries first.** They ask what an error boundary is and what it cannot catch. A strong answer names render and lifecycle errors, then lists event handlers, async code, server rendering and the boundary itself, and says how to route each one. Red flags: "I would use try/catch around the component", or "there is a hook for it".
- **Why a class?** A strong answer says that `getDerivedStateFromError` and `componentDidCatch` have no hook version, and that teams use one class or the `react-error-boundary` package. A red flag is inventing a `useErrorBoundary` hook as if it were built in.
- **Strategy and reporting.** They want to hear about app, route and widget boundaries, fallbacks with a retry, and logging with source maps. The React 19 root options (`onCaughtError`, `onUncaughtError`, `onRecoverableError`) are a plus.
- **Portals.** Strong answers say events, context and error boundaries follow the React tree, while CSS follows the DOM tree. A red flag is thinking a click in a portal does not reach the React parent.
- **StrictMode.** Strong answers say it is a development-only purity and cleanup check. A red flag is calling it a bug, or saying it slows production.
- **lazy and Suspense.** They look for: top-level `lazy`, a default export, a fallback, an error boundary for failed chunks, and splitting at routes.

## Interview questions and model answers

### Q1. What is an error boundary? (Easy)
An error boundary is a class component that defines `static getDerivedStateFromError` and/or `componentDidCatch`. It catches errors thrown while rendering the components below it, in their lifecycle methods and in their effects. Instead of React removing the whole tree (a white screen), the boundary shows a fallback UI for its part of the tree. `getDerivedStateFromError(error)` returns the new state that switches the render to the fallback, and `componentDidCatch(error, info)` runs afterwards and is where you log. The rest of the app, outside the boundary, keeps working.

### Q2. What errors do error boundaries not catch? (Medium)
They only catch errors during rendering. They do not catch:
- errors in **event handlers**,
- errors in **async code** (`setTimeout`, promises, `fetch`, `async` functions),
- errors during **server-side rendering**,
- errors thrown by **the boundary itself** (those go to the next boundary above).

To send such errors to a boundary, catch them and rethrow during render. For example, `setState(() => { throw error })`, or `showBoundary(error)` from `react-error-boundary`. Anything you only want to report goes to `window` `error` and `unhandledrejection` listeners.

### Q3. Why must an error boundary be a class component? Can you write one with hooks? (Medium)
There is no hook equivalent. Catching a render error needs the class-only methods `getDerivedStateFromError` and `componentDidCatch`, and as of React 19.3 React has not added a function-component version. You write one class component and reuse it everywhere, or install `react-error-boundary`, which the React docs recommend. All your other components can stay functions. A candidate who says "just use `useErrorBoundary`" should add that it comes from the library and wraps a class internally.

### Q4. What is StrictMode and why does my component render twice? (Easy)
`<StrictMode>` is a development-only wrapper that checks your code for hidden bugs. It calls component functions twice, to show if the render is impure, and runs each effect as setup, cleanup, setup, to show if a cleanup is missing. You see `console.log` twice in development for that reason. In production nothing extra happens. It is not a bug to work around: fix the impurity (do not change outside variables during render) or add the missing cleanup.

### Q5. What is a portal and when would you use one? (Easy)
`createPortal(children, domNode)` renders children into a different DOM node while keeping them in the same place in the React tree. Use it for UI that must escape its parent's box: modals, tooltips, dropdowns, toasts. It avoids problems with `overflow: hidden`, `z-index` stacking contexts and `transform` on ancestors. The content stays connected to the React tree: it shares context, state and events with its React parent.

### Q6. If a button inside a portal is clicked, does the click bubble to the React parent? (Medium)
Yes. React events bubble along the React tree, not the DOM tree. In a test, a click on a portalled button ran the button's `onClick` and then the `onClick` of its React parent `<div>`, even though the button was in `<body>`. A native `addEventListener` on the app container did not run, since in the real DOM the click never passed through it. Practical result: a modal inside a clickable element can trigger that element's handler. Stop it with `event.stopPropagation()` at the modal root, or render the modal outside the clickable element.

```jsx
<div role="dialog" onClick={(event) => event.stopPropagation()}>...</div>
```

### Q7. What is a Fragment, and when do you need `<Fragment>` instead of `<>`? (Easy)
A Fragment lets a component return several elements without adding a wrapper element to the DOM. That keeps HTML valid (table rows, definition lists) and avoids extra `div`s in flex or grid layouts. `<>...</>` is the short form. It cannot take attributes, so when you map over data and each item returns several elements, you write `<Fragment key={item.id}>` to give the item a key. Since React 19.3 only the long form can take a `ref`.

### Q8. What are `React.lazy` and `Suspense` used for? (Medium)
They are the basic tools for code splitting. `lazy(() => import('./Chart.jsx'))` creates a component whose code is downloaded the first time it renders. While it downloads, the nearest `Suspense` shows its `fallback`. The imported module must have a default export, and `lazy` must be created at the top level of a file, not inside a component, or the code is loaded again on every render. Wrap the Suspense in an error boundary, because a failed download (network error or a removed chunk after a deploy) is a thrown error. Split at routes and at big, rarely used pieces.

### Q9. Where would you place error boundaries in a real application? (Medium)
In layers. One at the **app level** as the last safety net with a "reload" message. One per **route or page**, so navigation stays and the user can leave a broken page. And **widget-level** boundaries around parts that fail independently, like a chart or a third-party embed, so the rest of the page keeps working. Routers and frameworks give route-level boundaries for free. Do not wrap every component. Pair each boundary with logging and, where it makes sense, a retry button or `resetKeys`.

### Q10. How do you make errors from event handlers and async code show an error boundary's fallback? (Medium)
Boundaries only see errors thrown during render, so rethrow the error during render. Store it in state and `throw` it in the component body, or call a hook that does `setState(() => { throw error })`. The `useErrorBoundary().showBoundary` function of `react-error-boundary` does this. In React 19 you can also run the async work inside the `startTransition` function returned by `useTransition`, and an error thrown there goes to the nearest boundary. For small recoverable failures (a failed save), an inline message is often the better design than replacing the whole component.

### Q11. How do you report production errors to a monitoring service in React 19? (Hard)
Set the three root options in `createRoot` (or `hydrateRoot`). `onCaughtError(error, info)` runs when a boundary caught an error, `onUncaughtError` runs when none did (the tree is gone), and `onRecoverableError` runs when React recovered by itself, mostly hydration mismatches. Send the message, stack and `info.componentStack` from there. Custom callbacks replace React's default `console.error`. Handler and async errors do not reach these callbacks, so add `window` `error` and `unhandledrejection` listeners. Upload source maps to the tracker, or the stacks will point to minified code.

```jsx
createRoot(root, {
  onCaughtError: (error, info) => logClientError('caught', error, info.componentStack),
  onUncaughtError: (error, info) => logClientError('uncaught', error, info.componentStack),
  onRecoverableError: (error, info) => logClientError('recoverable', error, info.componentStack),
})
```

### Q12. Does StrictMode affect production? Why does my `useEffect` fetch run twice in development? (Medium)
StrictMode does nothing in production builds: no double render, no double effects. In development it runs each effect as setup, cleanup, setup, so a fetch in an effect starts twice. This is on purpose, to test that your cleanup works. Add an `ignore` flag or an `AbortController` in the cleanup so the old response is ignored. Then the effect is correct with one run or two. Do not remove StrictMode to "fix" it. Using a data library such as TanStack Query also avoids the duplicate request.

### Q13. What is the `<Profiler>` component, and how is it different from the DevTools Profiler? (Medium)
`<Profiler id onRender>` measures a part of your tree from code. React calls `onRender(id, phase, actualDuration, baseDuration, startTime, commitTime)` whenever that part commits. `phase` is `mount`, `update` or `nested-update`, and `actualDuration` is the render time of that update. The DevTools Profiler is a visual tool for recording a session by hand. The component is useful for automatic checks or for sending timings to analytics from a staging build. It is disabled in normal production builds and adds overhead, so use it sparingly.

### Q14. Why are `React.Children` and `cloneElement` discouraged, and what do you use instead? (Medium)
They depend on the exact shape of `children`. `Children.count` and `Children.map` do not look inside fragments or inside other components, so wrapping a child in a component changes the result without any error. `cloneElement` injects props into a child, but a wrapper child that does not forward the prop silently loses it. React lists them as legacy. Use context (compound components), render props, or plain props such as an `items` array. You should still be able to read them in old code.

### Q15. What is `flushSync` and when would you use it? (Hard)
`flushSync(() => setState(...))` forces React to apply the update inside the callback to the DOM synchronously, instead of batching it until the handler ends. In a test, the DOM text right after a plain `setN(1)` was still the old value, and right after `flushSync(() => setN(2))` it was the new one. The typical use is adding an item and then scrolling to its element in the same handler. It is an escape hatch: it gives up batching, can hurt performance, and must not be called during render or inside effects. Most cases are better solved with an effect that runs after the data changes.

## Common mistakes and gotchas
- **`try/catch` around JSX does nothing.** The child renders later. Wrap the child in an error boundary.
- **Boundary inside the failing component.** It must be above. Wrap at the call site.
- **Expecting boundaries to catch event handler and async errors.** Catch them yourself, then show an inline message or rethrow into render (`useThrowToBoundary`, `showBoundary`).
- **A fallback that can throw.** Keep it plain and independent of the data that failed.
- **Only one app-level boundary.** Add route and widget boundaries so a failure stays small.
- **A retry button that changes nothing.** Pair it with a refetch or `resetKeys`, or the same error returns at once.
- **Logging in both `componentDidCatch` and `onCaughtError`.** You report every error twice. Choose one place.
- **A reporter that can throw.** Wrap it in `try/catch`, send strings (`message`, `stack`), not raw `Error` objects.
- **Forgetting source maps.** Production stacks point to minified code. Upload source maps to your tracker.
- **Thinking a click in a portal does not reach the React parent.** It does. Use `stopPropagation` at the modal root or move the modal in the JSX.
- **A modal without Escape, focus-in and focus-back.** Keyboard users get lost. Handle them, and add a focus trap.
- **Focus code and key code in one effect.** A new `onClose` re-runs the effect and steals focus. Use separate effects with the right dependencies.
- **Short fragment where a key is needed.** Use `<Fragment key={id}>`.
- **`lazy` inside a component, or a named export.** Put `lazy` at the top level of the file and use a default export (or map the name to `default`).
- **No error boundary around `Suspense` for lazy code.** A failed chunk download then removes the whole app.
- **Removing StrictMode, or guarding effects with a ref, to hide double runs.** Fix the purity bug or add the cleanup.
- **`dangerouslySetInnerHTML` with unsanitised text.** Sanitize with DOMPurify, or avoid it.
- **`children.length` to count children.** Use `Children.count(children)`.
- **`flushSync` in render or effects.** It is a rare escape hatch for event handlers. Prefer an effect.
- **Testing suspended components with a plain `render`.** Use `await act(async () => { render(...) })`.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** A `ErrorBoundary` wraps a component tree. For each case, say whether the boundary catches the error: (a) a child throws while rendering, (b) a child's `onClick` handler throws, (c) a child's `useEffect` callback throws synchronously, (d) a child's `setTimeout` callback throws, (e) an `async` function called from a child's effect rejects, (f) the boundary's own `render` throws.

<details>
<summary>Show answer</summary>

- (a) **Yes.** This is the main case.
- (b) **No.** Handlers run outside rendering. The error goes to the window as an uncaught error. In a test the button stayed and no fallback appeared.
- (c) **Yes.** A synchronous throw inside `useEffect` (and `useLayoutEffect`) is caught. A test showed the boundary's fallback.
- (d) **No.** A `setTimeout` callback runs later, outside React. The boundary does not see it.
- (e) **No.** The rejection happens after an `await`, in a promise. In a test the screen kept the component and the rejection was unhandled.
- (f) **No, not by itself.** An error in a boundary's own render goes to the next boundary above it.

</details>

2. **(Easy)** Write an `ErrorBoundary` class component that accepts a `fallback` prop, shows it when a child throws, and logs the error and the component stack with `console.error` in the right lifecycle method. Test it with a child that throws.

<details>
<summary>Show answer</summary>

```jsx
import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}

function Bomb() {
  throw new Error('boom')
}

export default function App() {
  return (
    <ErrorBoundary fallback={<p role="alert">Something went wrong.</p>}>
      <Bomb />
    </ErrorBoundary>
  )
}
```

`getDerivedStateFromError` switches to the fallback during rendering (pure). `componentDidCatch` logs after the fallback is committed (side effect). The boundary wraps `Bomb` from above, it is not inside it.

</details>

3. **(Easy)** Write a `Glossary` component that renders this data as a `<dl>` with a `<dt>` and a `<dd>` for each entry, with no wrapper element around each pair and with correct keys: `[{ id: 1, term: 'JSX', desc: 'HTML-like syntax' }, { id: 2, term: 'Hook', desc: 'A function that starts with use' }]`.

<details>
<summary>Show answer</summary>

```jsx
import { Fragment } from 'react'

const entries = [
  { id: 1, term: 'JSX', desc: 'HTML-like syntax' },
  { id: 2, term: 'Hook', desc: 'A function that starts with use' },
]

export default function Glossary() {
  return (
    <dl>
      {entries.map((entry) => (
        <Fragment key={entry.id}>
          <dt>{entry.term}</dt>
          <dd>{entry.desc}</dd>
        </Fragment>
      ))}
    </dl>
  )
}
```

The long form `<Fragment key={...}>` is needed because the short `<>` cannot take a key. The output is a flat list: `<dl><dt>JSX</dt><dd>...</dd><dt>Hook</dt><dd>...</dd></dl>`.

</details>

4. **(Medium)** Predict the console output when the button is clicked, and say whether a native `container.addEventListener('click', ...)` on the element that React renders into would run.

```jsx
function Parent() {
  return (
    <div onClick={() => console.log('div')}>
      {createPortal(
        <button onClick={() => console.log('button')}>Go</button>,
        document.body
      )}
    </div>
  )
}
```

<details>
<summary>Show answer</summary>

The console shows `button` and then `div`. React events bubble along the React tree, where the `<div>` is the parent of the portal content. The native listener on the container does **not** run, because in the real DOM the button sits in `<body>` and the click never passes through the container. I confirmed both in a test.

</details>

5. **(Medium)** Predict the console output of this component in development with `<StrictMode>` around it, and in a production build.

```jsx
function App() {
  console.log('render')
  useEffect(() => {
    console.log('setup')
    return () => console.log('cleanup')
  }, [])
  return <p>hi</p>
}
```

<details>
<summary>Show answer</summary>

Development with StrictMode: `render`, `render`, `setup`, `cleanup`, `setup`.

Production: `render`, `setup`.

React calls the component twice to check that rendering is pure, and runs the effect as setup, cleanup, setup to check that the cleanup works. None of this happens in production. Both outputs came from real runs.

</details>

6. **(Medium)** A page shows `<Profile userId={id} />` and a "Next user" button. Profile throws for user 2. Using a boundary and **no** extra props or hooks, make the page recover automatically when the user moves to user 3.

<details>
<summary>Show answer</summary>

Put the `id` in the boundary's `key`:

```jsx
<ErrorBoundary key={id} fallback={<p role="alert">This profile failed.</p>}>
  <Profile userId={id} />
</ErrorBoundary>
```

When `id` changes, React sees a different key, throws the old boundary away (with its error state) and mounts a new one that renders `Profile` for the new user. In a test, a broken boundary came back to normal after its key changed. The cost: all state under the boundary is also reset. If you want to keep that state, use `resetKeys` in your boundary, as in section 3.

</details>

7. **(Medium)** Build a `Modal` component with a portal into `document.body`. Requirements: renders nothing when `open` is `false`; closes on Escape, on a click on the dark overlay and with a Close button; clicks inside the dialog do not close it; focus moves into the dialog on open and returns to the opener on close. (A full version with a focus trap and scroll lock is exercise 14.)

<details>
<summary>Show answer</summary>

Use the `Modal` from section 10. The key points:

- `if (!open) return null` and `createPortal(..., document.body)` for the portal.
- The overlay has `onClick={onClose}`. The dialog box has `onClick={(event) => event.stopPropagation()}`.
- One effect for focus with `[open]` as dependencies: remember `document.activeElement`, focus the dialog (it needs `tabIndex={-1}`), and focus the opener in the cleanup.
- A separate effect for the Escape key with `[open, onClose]`.
- `role="dialog"`, `aria-modal="true"` and `aria-labelledby` pointing to the heading id from `useId`.

To practice the missing parts (focus trap, scroll lock), do [exercise 14](../practice-app/exercises/react/14-modal-portal/README.md).

</details>

8. **(Medium)** You build a shop app with a header and navigation, routed pages, and a product page that has a main product section, a third-party reviews widget, and a "related products" list that loads separately. Where do you place error boundaries, and what does each fallback say or do?

<details>
<summary>Show answer</summary>

- **App level**, around everything: "Something went wrong" with a Reload button. The last safety net. Also logs, if the root options are not used.
- **Route level**, around the page area but **outside** the header and navigation: "This page could not be shown" with links to go home or back. The header stays so the user can navigate away. A router's error element per route can do this.
- **Widget level**, around the **reviews widget** (third-party code, fails on its own) and the **related products** list (own data): small inline messages like "Reviews are unavailable" with a Retry button. The main product section is not wrapped separately, because the page is useless without it, so its failure belongs to the route boundary.
- Put each `Suspense` for lazy or loading parts **inside** the matching boundary.
- Log every error with the root options. Use `resetKeys` or a `key` with the product id, so opening another product resets a failed boundary.

</details>

9. **(Hard)** This button calls an API. When the request fails, the error boundary above it should show its fallback, but nothing happens. Fix it without changing the boundary.

```jsx
function LoadUser() {
  return (
    <button
      onClick={async () => {
        const res = await fetch('/api/user')
        if (!res.ok) throw new Error(`Status ${res.status}`)
      }}
    >
      Load user
    </button>
  )
}
```

<details>
<summary>Show answer</summary>

The throw happens inside an async event handler, so the boundary never sees it. Catch the error and rethrow it during render with a small hook:

```jsx
import { useCallback, useState } from 'react'

function useThrowToBoundary() {
  const [, setState] = useState()
  return useCallback((error) => {
    setState(() => {
      throw error
    })
  }, [])
}

function LoadUser() {
  const throwToBoundary = useThrowToBoundary()

  return (
    <button
      onClick={async () => {
        try {
          const res = await fetch('/api/user')
          if (!res.ok) throw new Error(`Status ${res.status}`)
        } catch (error) {
          throwToBoundary(error)
        }
      }}
    >
      Load user
    </button>
  )
}
```

React runs the updater function during the next render. A throw there is a render error, so the nearest boundary handles it. A test with a `Network down` error showed the boundary's message. Alternatives: store the error in state and `throw` it in the component body, use `showBoundary` from `react-error-boundary`, or run the work in the `startTransition` from `useTransition`.

</details>

10. **(Hard)** What happens here when the parent re-renders three times (for example by clicking a button that increments `n`)? How many times does the loader run in total, what does the user see, and how do you fix it?

```jsx
function Parent() {
  const [n, setN] = useState(0)
  const Chart = lazy(() => import('./Chart.jsx'))

  return (
    <>
      <button onClick={() => setN(n + 1)}>rerender {n}</button>
      <Suspense fallback={<p>Loading...</p>}>
        <Chart />
      </Suspense>
    </>
  )
}
```

<details>
<summary>Show answer</summary>

`lazy(...)` runs on **every render**, so each render creates a brand-new component type. React treats it as a different component, remounts it, and calls the loader again. A test with the same structure counted 4 loader calls in total (the first render plus three re-renders), and the "Loading..." fallback showed again after a re-render.

Fix: create the lazy component once, at the top level of the file.

```jsx
const Chart = lazy(() => import('./Chart.jsx'))

function Parent() {
  const [n, setN] = useState(0)
  // ...
}
```

With that change the test counted 1 load, however many times the parent re-rendered.

</details>

11. **(Hard)** Write the `main.jsx` for an app so that errors caught by boundaries, errors no boundary caught, and errors React recovered from are all sent to `logClientError(kind, error, componentStack)`. Then answer: why should you not also log in every boundary's `componentDidCatch`, and which errors will your three callbacks still miss?

<details>
<summary>Show answer</summary>

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { logClientError } from './logClientError.js'

createRoot(document.getElementById('root'), {
  onCaughtError: (error, info) => logClientError('caught', error, info.componentStack),
  onUncaughtError: (error, info) => logClientError('uncaught', error, info.componentStack),
  onRecoverableError: (error, info) => logClientError('recoverable', error, info.componentStack),
}).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

If every boundary also logs in `componentDidCatch`, each caught error is reported twice, once by the boundary and once by `onCaughtError`. Let the root options do the global reporting, and use the boundary's `onError` only for local reactions.

The callbacks miss errors that happen outside rendering. In tests, a throwing click handler reached neither `onCaughtError` nor `onUncaughtError`. It only fired the window `error` event. The same goes for errors in timers and promises. Add `window.addEventListener('error', ...)` and `window.addEventListener('unhandledrejection', ...)` that call the same reporter. Also upload source maps so the stacks are readable.

</details>

12. **(Medium)** Predict the two numbers printed by this component for the usage below, and explain the difference.

```jsx
function Probe({ children }) {
  console.log(Children.count(children), Children.toArray(children).length)
  return null
}

// <Probe>
//   <span>a</span>
//   {null}
//   {false}
//   text
//   {[<b key="x">x</b>, <i key="y">y</i>]}
// </Probe>
```

<details>
<summary>Show answer</summary>

It prints `6 4`.

`Children.count` counts every node, including the empty ones: the span, `null`, `false`, the text, and the two array items make 6. `Children.toArray` removes empty values (`null`, `false`) and returns only real children: the span, the text, `<b>` and `<i>`, which is 4. It also gives each child a key. I got these numbers in a real run. This is one reason the helpers are easy to misuse, and why the docs call them legacy.

</details>

## Recap
- A render error with no boundary removes the whole tree. An error boundary (a class with `getDerivedStateFromError` and `componentDidCatch`) shows a fallback for its own part instead. There is still no hook version.
- A boundary protects what is below it. It does not catch errors in event handlers, async code, server rendering, or itself. Rethrow those during render (state, `useThrowToBoundary`, `showBoundary`) or report them with `window` listeners.
- Place boundaries at app, route and widget level. Reset them with a retry button, `resetKeys` or a `key`. Keep fallbacks simple.
- Report errors from one place: the React 19 root options `onCaughtError`, `onUncaughtError` and `onRecoverableError`. Use a reporter that never throws, and upload source maps.
- A portal (`createPortal`) draws into another DOM node but stays in the same place in the React tree: context, events and error boundaries follow React, CSS follows the DOM. A good modal also handles Escape, focus in, focus back and a focus trap.
- Fragments group without DOM nodes: use `<Fragment key>` for keyed groups, and `<Fragment ref>` (React 19.3) for a group handle.
- StrictMode is a development-only check: double render and setup, cleanup, setup. Fix purity bugs and add cleanups, never remove it to hide them.
- `lazy` plus `Suspense` split code (top-level `lazy`, default export, error boundary around it). `Children`, `cloneElement`, `dangerouslySetInnerHTML` (sanitize!) and `flushSync` are legacy or rare tools. Know them, use them sparingly.

## Where to go next
- Next lesson: [State management](06-state-management.md), which decides where state lives and how it travels through the tree.
- Go deeper on this lesson: [Concurrent React and Suspense](../04-advanced/03-concurrent-react-and-suspense.md) (Suspense with data, transitions), [Accessibility](../04-advanced/09-accessibility.md) (dialogs and focus), [Security and i18n](../04-advanced/10-security-and-i18n.md) (XSS and `dangerouslySetInnerHTML`), [Performance optimization](../04-advanced/02-performance-optimization.md) (Profiler and code splitting), Advanced patterns (planned) (error recovery).
- Related lessons: [Data fetching](02-data-fetching.md) (errors and Suspense for data), [React Router](03-react-router.md) (route error elements and lazy routes), Tooling: Vite, ESLint and build (planned) (source maps and error monitoring), Legacy class components (planned) (class lifecycle).
- Practice-app exercises: [14 Modal with portal](../practice-app/exercises/react/14-modal-portal/README.md), [31 Toast system](../practice-app/exercises/react/31-toast-system/README.md), [15 Fetch list with retry](../practice-app/exercises/react/15-fetch-list-retry/README.md).
- Interview practice: [Round 3, output and debugging](../05-interview-rounds/round-3-output-and-debugging/README.md), then its bug hunt questions (planned).
