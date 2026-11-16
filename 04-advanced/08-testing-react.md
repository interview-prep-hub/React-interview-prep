# Testing React Apps

> **Level:** Advanced   **Time:** about 80 minutes   **Read first:** [State and events](../01-basics/05-state-and-events.md), [Custom hooks](../02-hooks/08-custom-hooks.md), [useContext](../02-hooks/05-usecontext.md)

## What you will learn
- Decide what to test, at which level (unit, integration, end-to-end), and what to leave untested.
- Set up Vitest, Testing Library, jest-dom and jsdom, and map every piece to its Jest equivalent.
- Write tests the way a user uses the page: find elements by role, click and type with `userEvent`, assert on what is visible.
- Test async UI, forms, lists, hooks, context, routing, timers, Suspense and error boundaries.
- Mock modules, `fetch` and the network (with MSW) without testing your mocks.
- Explain snapshots, coverage and flaky tests, and write a first end-to-end test with Playwright.

## 1. What to test and why
A test is a small program that checks your program. You write it once, and it checks your app every time you change code. Its real job is **confidence**: you can refactor or upgrade React and know quickly if you broke something.

Tests cost time to write, run and maintain. So you want the most confidence for the least cost. The "testing trophy" (Kent C. Dodds) describes where to spend:

```text
End-to-end     few    slow    real browser, whole app (Playwright)
Integration    MOST   medium  a component with its children and a fake network
Unit           some   fast    pure functions, reducers, custom hooks
Static         always free    TypeScript and ESLint catch typos and misuse
```

The old "pyramid" put most tests at the unit level. The trophy says the middle layer gives the best value: one test that renders a form, types into it and sees the result covers many small pieces at once.

The golden rule: **test behaviour, not implementation.** Ask "what does the user see and do?", not "which state variable changed?". If you rename a state variable or switch to `useReducer`, no test should fail, because the page still works the same.

**What happens, step by step** when a good test runs:
1. It renders the component into a fake browser (jsdom) inside Node.
2. It finds elements the way a person would (by their role, label or text).
3. It does what a person does (click, type).
4. It checks what the person would see (text, enabled state, a message).

**Common mistake:** asserting on structure or class names.

```jsx
// Breaks if you add a wrapper div or rename the class
expect(container.querySelector('.counter > p:nth-child(1)').textContent).toBe('Count: 1')

// Survives refactors, reads like a user story
expect(screen.getByText('Count: 1')).toBeInTheDocument()
```

Do not test: React itself, third-party libraries, trivial markup, or exact CSS. Do test: user flows, conditional UI, validation, error and empty states, and any logic with branches.

## 2. Setup: Vitest, Testing Library, jest-dom, jsdom
Each package has one job:

| Package | Job |
|---|---|
| `vitest` | the test runner: finds files, runs them, gives `describe`, `it`, `expect`, `vi` |
| `jsdom` | a fake browser DOM that runs inside Node, so `document` exists |
| `@testing-library/react` | `render`, `screen`, `renderHook`, `act` and the queries |
| `@testing-library/dom` | the query engine (a peer dependency of the React package) |
| `@testing-library/user-event` | realistic clicking and typing |
| `@testing-library/jest-dom` | extra matchers such as `toBeInTheDocument` |

```bash
npm i -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```

This is the config the practice app uses (the real file also has an `include` list and a plugin that swaps starter files for solution files, which you do not need):

```js
// vite.config.js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',          // fake browser
    globals: true,                 // describe/it/expect/vi without imports
    setupFiles: ['./test/setup.js'],
    css: false,                    // skip CSS processing, tests do not need it
  },
})
```

```js
// test/setup.js
import '@testing-library/jest-dom/vitest'   // adds the jest-dom matchers to expect
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()   // unmount what each test rendered
})
```

Add `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json` scripts. Run one file with `npm test -- path/to/file`.

**What happens, step by step:** Vitest reads the config, builds each test file with Vite, creates a jsdom window, runs `setup.js`, runs your tests, and runs `afterEach` after each one.

**Common mistake:** with `globals: false` (the default), Testing Library does not register its automatic cleanup, so a second test sees the first test's DOM. The fix is `globals: true` or the explicit `afterEach(cleanup)` above.

Jest equivalents (Jest 30 is current, but with Vite projects Vitest needs far less setup):

| Job | Vitest | Jest |
|---|---|---|
| Mock function | `vi.fn()` | `jest.fn()` |
| Mock a module | `vi.mock('./api.js', factory)` | `jest.mock('./api.js', factory)` |
| Keep the real module partly | `importOriginal` in the factory | `jest.requireActual` |
| Spy on a method | `vi.spyOn(obj, 'm')` | `jest.spyOn(obj, 'm')` |
| Fake timers | `vi.useFakeTimers()`, `vi.advanceTimersByTime(ms)` | `jest.useFakeTimers()`, `jest.advanceTimersByTime(ms)` |
| jest-dom import | `@testing-library/jest-dom/vitest` | `@testing-library/jest-dom` |
| Setup file option | `setupFiles` | `setupFilesAfterEnv` |
| DOM environment | `environment: 'jsdom'` | `testEnvironment: 'jsdom'` plus `npm i -D jest-environment-jsdom` |
| Globals | off by default, set `globals: true` | on by default |
| Build pipeline | reuses your Vite config | needs a Babel or SWC transform setup |

The Testing Library code is identical in both. Only the `vi.` and `jest.` calls differ.

## 3. Your first test: render, query, assert
Every test has three parts: **arrange** (render), **act** (click or type), **assert** (check).

```jsx
// Counter.jsx
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  )
}
```

```jsx
// Counter.test.jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Counter } from './Counter.jsx'

it('increments when the button is clicked', async () => {
  const user = userEvent.setup()                        // 1
  render(<Counter />)                                   // 2
  expect(screen.getByText('Count: 0')).toBeInTheDocument()   // 3
  await user.click(screen.getByRole('button', { name: 'Increment' }))   // 4
  expect(screen.getByText('Count: 1')).toBeInTheDocument()   // 5
})
```

**What happens, step by step:**
1. `userEvent.setup()` creates a simulated user. Call it before `render`.
2. `render` mounts `<Counter />` into `document.body` inside `act`, so all effects and updates have finished when it returns.
3. `screen.getByText('Count: 0')` searches the whole body. If it finds nothing, it throws and the test fails.
4. `user.click` fires the real sequence a mouse produces (hover, mousedown, mouseup, click). We `await` it.
5. React re-rendered during the click, so the new text is already in the DOM.

See the same style in [the counter exercise test](../practice-app/exercises/react/01-counter/App.test.jsx).

**Common mistake:** forgetting `await` on a `user.*` call. The assertion then runs before the click finishes, and the test fails or, worse, passes by luck.

## 4. Queries: how to find things
Testing Library's queries try to find elements the way users and screen readers do. Use them in this order:

1. `getByRole('button', { name: 'Save' })`: what the element IS. Best, because it also proves your markup is accessible.
2. `getByLabelText('Email')`: form fields.
3. `getByPlaceholderText`: only if there is no label.
4. `getByText`: non-interactive text.
5. `getByDisplayValue`: the current value of an input.
6. `getByAltText`, `getByTitle`: images and titles.
7. `getByTestId('count')`: last resort, for things users cannot see or name (`data-testid` attribute).

Each query comes in three families:

| Family | 0 matches | 1 match | 2 or more | Waits? | Use it for |
|---|---|---|---|---|---|
| `getBy` | throws | the element | throws | no | "it is there now" |
| `queryBy` | `null` | the element | throws | no | "it is NOT there" |
| `findBy` | rejects after 1000 ms | the element | rejects | yes | "it will appear soon" |

Add `All` (`getAllBy`, `queryAllBy`, `findAllBy`) when you expect many. Without it, two matches are an error.

```jsx
render(<button>Save</button>)
screen.getByRole('button', { name: 'Save' })      // the button
screen.queryByRole('link')                        // null: fine for "is absent" checks
screen.getByRole('link')                          // throws: Unable to find an accessible element with the role "link"
screen.getByRole('button', { name: 'Sav' })       // throws: ... with the role "button" and name "Sav"
```

The real error also lists the roles that do exist, which is the fastest way to spot a typo. When stuck, call `screen.debug()` to print the DOM, or `logRoles(container)` (exported by Testing Library) to print every role.

`within` limits a search to one part of the page, for example when two sections both have a "Remove" button:

```jsx
const cart = screen.getByRole('region', { name: 'Cart' })    // <section aria-label="Cart">
within(cart).getByRole('button', { name: 'Remove' })
```

**Common mistake:** using `getByTestId` first. It always works, so you never find out that your button has no accessible name.

## 5. Events: userEvent versus fireEvent
`fireEvent.click(el)` dispatches ONE event. `userEvent` simulates what a person does, which is a chain of events (focus, keydown, keypress, input, keyup, and so on). Real handlers depend on those chains, so prefer `userEvent`.

I ran an input with an `onKeyDown` counter:

```jsx
await user.type(input, 'abc')                              // keydown handler ran 3 times, value "abc"
fireEvent.change(input, { target: { value: 'abcdef' } })   // keydown ran 0 more times, value "abcdef"
```

Use `userEvent` for clicks, typing, `tab`, `hover`, `selectOptions`, `upload`, `paste`, `keyboard`. Keep `fireEvent` for rare events users cannot produce one by one (a `scroll`, a custom event, `fireEvent.change` on a range input). `userEvent` is a separate package from `@testing-library/react`.

**Common mistake:** `userEvent.click(el)` without `setup()` and without `await`. Write `const user = userEvent.setup()` and `await user.click(el)`.

## 6. jest-dom matchers
These make assertions read like English and give good failure messages.

| Matcher | Checks |
|---|---|
| `toBeInTheDocument()` | the element exists in the DOM |
| `toBeVisible()` | it is in the DOM and not hidden by `display: none`, `hidden` and so on |
| `toBeDisabled()` / `toBeEnabled()` | form control state |
| `toHaveTextContent('Saved')` | text (substring or regex) |
| `toHaveValue('ada')` | value of input, select, textarea |
| `toBeChecked()` | checkbox or radio |
| `toHaveAttribute('href', '/home')` | an attribute |
| `toHaveFocus()` | focus (great for keyboard tests) |
| `toHaveAccessibleName('Close')` | the name a screen reader would speak |

Absence is `expect(screen.queryByText('x')).not.toBeInTheDocument()`. Do not use the old matchers `toBeEmpty`, `toBeInTheDOM` or `toHaveDescription`; they are deprecated.

## 7. Testing common components
### A form with validation and a callback
Callbacks are props, so pass a mock function made with `vi.fn()`. It records every call.

```jsx
// SignupForm.jsx
import { useState } from 'react'

export function SignupForm({ onSubmit }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!email.includes('@')) {
      setError('Enter a valid email')
      return
    }
    setError('')
    onSubmit({ email })
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && <p role="alert">{error}</p>}
      <button type="submit">Sign up</button>
    </form>
  )
}
```

```jsx
// SignupForm.test.jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignupForm } from './SignupForm.jsx'

it('shows an error and does not submit an invalid email', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  render(<SignupForm onSubmit={onSubmit} />)
  await user.type(screen.getByLabelText('Email'), 'nope')
  await user.click(screen.getByRole('button', { name: 'Sign up' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email')
  expect(onSubmit).not.toHaveBeenCalled()
})

it('submits a valid email and clears the error', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  render(<SignupForm onSubmit={onSubmit} />)
  await user.type(screen.getByLabelText('Email'), 'ada@example.com')
  await user.click(screen.getByRole('button', { name: 'Sign up' }))
  expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com' })
  expect(onSubmit).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
```

**What happens, step by step:** `getByLabelText('Email')` finds the input through its `<label htmlFor>`; `user.type` clicks it and types key by key; clicking the submit button fires the form's `submit` event; the validation branch runs; `onSubmit` is a spy, so we check how it was called. In the first test the `alert` appears and the spy stays untouched. In the second, the spy got the object and `queryByRole('alert')` returns `null`.

### A list with filtering, conditional rendering and props

```jsx
// FruitList.jsx
import { useState } from 'react'

export function FruitList({ fruits }) {
  const [q, setQ] = useState('')
  const shown = fruits.filter((f) => f.toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <label>
        Filter
        <input value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {shown.length === 0 ? (
        <p>No matches</p>
      ) : (
        <ul>{shown.map((f) => <li key={f}>{f}</li>)}</ul>
      )}
    </div>
  )
}
```

```jsx
it('filters the list and shows an empty state', async () => {
  const user = userEvent.setup()
  render(<FruitList fruits={['Apple', 'Banana', 'Grape']} />)
  expect(screen.getAllByRole('listitem')).toHaveLength(3)

  await user.type(screen.getByLabelText('Filter'), 'ap')
  expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Apple', 'Grape'])

  await user.clear(screen.getByLabelText('Filter'))
  await user.type(screen.getByLabelText('Filter'), 'zzz')
  expect(screen.getByText('No matches')).toBeInTheDocument()
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
})
```

`<li>` has the role `listitem`, `<ul>` has `list`. To test different props, render again with new props, or call `const { rerender } = render(<FruitList fruits={a} />)` then `rerender(<FruitList fruits={b} />)`. Conditional UI is tested the same way: do the action, then check what appeared with `getBy` and what vanished with `queryBy`.

## 8. Async UI: findBy, waitFor and act
Data arrives after the first render, so right after `render` the screen still shows "Loading...". You must **wait**.

```jsx
// UserCard.jsx
import { useEffect, useState } from 'react'

export function UserCard({ id }) {
  const [state, setState] = useState({ status: 'loading' })
  useEffect(() => {
    let ignore = false
    fetch(`/api/users/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Request failed')
        return r.json()
      })
      .then((user) => !ignore && setState({ status: 'ok', user }))
      .catch(() => !ignore && setState({ status: 'error' }))
    return () => { ignore = true }
  }, [id])

  if (state.status === 'loading') return <p>Loading...</p>
  if (state.status === 'error') return <p role="alert">Could not load user</p>
  return <h2>{state.user.name}</h2>
}
```

```jsx
afterEach(() => vi.unstubAllGlobals())

it('shows the user after loading', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ name: 'Ada' }) }))
  render(<UserCard id="1" />)
  expect(screen.getByText('Loading...')).toBeInTheDocument()          // sync: the first render
  expect(await screen.findByRole('heading', { name: 'Ada' })).toBeInTheDocument()   // waits
  expect(fetch).toHaveBeenCalledWith('/api/users/1')
})

it('shows an error when the request fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
  render(<UserCard id="1" />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load user')
})
```

**What happens, step by step:**
1. `stubGlobal` replaces `fetch` with a mock that returns a resolved promise, so there is no real network.
2. `render` runs the component; the effect starts the fake request; the screen shows "Loading...".
3. `findByRole` is `getByRole` plus `waitFor`: it tries now, and again about every 50 ms, until the element exists or 1000 ms pass.
4. The promise resolves, `setState` runs, React re-renders, and the next retry finds the heading.
5. `afterEach` puts the real `fetch` back.

Three tools for waiting:
- `findBy...`: wait for something to appear. Your first choice.
- `waitForElementToBeRemoved(() => screen.queryByText('Loading...'))`: wait for something to disappear. It needs the element to exist at the start, and its callback must use `queryBy`.
- `waitFor(() => expect(...))`: retry any assertion until it passes, for example `await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))`. Put ONE assertion inside, and no actions (a click inside `waitFor` would repeat).

About `act`: React batches updates, and in tests it wants every update to happen inside `act(...)` so the DOM is settled when you assert. `render`, `userEvent` and `findBy`/`waitFor` already wrap their work in `act`. If you see "An update to X inside a test was not wrapped in act(...)", something updated state after your test stopped waiting. The fix is almost always to `await` the right thing (`findBy`), not to sprinkle `act`. In React 19 you import `act` from `react`, and Testing Library re-exports its own wrapper.

**Common mistake:** asserting synchronously on async data.

```jsx
render(<UserCard id="1" />)
expect(screen.getByRole('heading', { name: 'Ada' })).toBeInTheDocument()   // throws: still "Loading..."

// Fixed
expect(await screen.findByRole('heading', { name: 'Ada' })).toBeInTheDocument()
```

## 9. Mocking: functions, modules, fetch and the network
A **mock** is a stand-in that you control. Use one for slow, random or external things (network, time, a payment SDK), not for the code you are testing.

**Mock functions.** `vi.fn()` records calls. `vi.fn().mockReturnValue(1)`, `.mockResolvedValue(obj)` and `.mockRejectedValue(err)` set results. `vi.spyOn(obj, 'method')` watches a real method and can replace it; `mockRestore()` brings the original back. In Vitest 5, `clearMocks` is on by default, so call history is reset before each test (implementations stay).

**Mock a module.** Suppose `Greeting` calls `getUser` from `./api.js`:

```jsx
import { render, screen } from '@testing-library/react'
import { getUser } from './api.js'
import { Greeting } from './Greeting.jsx'

vi.mock('./api.js', () => ({ getUser: vi.fn() }))   // replaces the whole module

it('greets the user', async () => {
  vi.mocked(getUser).mockResolvedValue({ name: 'Grace' })
  render(<Greeting id={7} />)
  expect(await screen.findByText('Hello, Grace')).toBeInTheDocument()
  expect(getUser).toHaveBeenCalledWith(7)
})
```

Vitest moves `vi.mock` to the top of the file before the imports run, and in Vitest 5 it must be at the top level (inside an `if` or a function it throws). To keep the real exports and replace only one, use `vi.mock('./api.js', async (importOriginal) => ({ ...(await importOriginal()), getUser: vi.fn() }))`.

**Mock fetch or mock the network?**

| | Stub `fetch` (`vi.stubGlobal`) | MSW (Mock Service Worker) |
|---|---|---|
| What is faked | the function `fetch` | the server: real `fetch` runs, requests are intercepted |
| Setup | none | install `msw`, one server file |
| Tests the URL, method, headers, JSON parsing | no | yes |
| Survives switching to axios or another client | no | yes |
| Best for | a few simple tests | a whole app, shared handlers, realistic tests |

MSW 3 setup (`npm i -D msw`). Note the names: `http` and `HttpResponse`, and `onUnhandledFrame` (the old `onUnhandledRequest` option and the old `rest`/`ctx` API are gone).

```js
// test/server.js
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const server = setupServer(
  http.get('/api/users/:id', ({ params }) => HttpResponse.json({ id: params.id, name: 'Ada' })),
)
```

```js
// test/setup.js (add to the existing file)
import { server } from './server.js'
import { beforeAll, afterEach, afterAll } from 'vitest'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))   // unknown requests fail the test
afterEach(() => server.resetHandlers())                          // drop per-test overrides
afterAll(() => server.close())
```

```jsx
import { http, HttpResponse } from 'msw'
import { server } from '../test/server.js'

it('shows an error on a 500', async () => {
  server.use(http.get('/api/users/:id', () => HttpResponse.json({ message: 'boom' }, { status: 500 })))
  render(<UserCard id="1" />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load user')
})
```

**What happens, step by step:** the default handler answers every test with Ada. `server.use` puts a 500 handler in front of it for this one test. The component calls the real `fetch`; MSW intercepts it and answers; the component takes its error branch. `resetHandlers` removes the override afterwards. Relative URLs like `/api/users/1` work because jsdom provides a `location`. `HttpResponse.error()` simulates a network failure, and `await delay(ms)` (from `msw`) simulates a slow server.

**Common mistake:** mocking so much that the test only checks the mock. If you mock the child components, the hook and the API, nothing real is left to fail. Mock the edges (network, time), keep the middle real.

## 10. Hooks, reducers and pure functions
**Pure functions and reducers** need no React at all: call and compare. They are the cheapest tests to write.

```js
import { cartReducer } from './cartReducer.js'

it('adds an item without mutating the old state', () => {
  const start = { items: [] }
  const next = cartReducer(start, { type: 'add', item: 'tea' })
  expect(next).toEqual({ items: ['tea'] })
  expect(start).toEqual({ items: [] })   // the original is untouched
  expect(next).not.toBe(start)
})
```

**Custom hooks** can only run inside a component, so Testing Library gives `renderHook`. It renders a tiny invisible component that calls your hook and gives you `result.current`. State changes go inside `act`.

```jsx
import { renderHook, act } from '@testing-library/react'
import { useCallback, useState } from 'react'

function useCounter(initial = 0) {
  const [count, setCount] = useState(initial)
  const increment = useCallback(() => setCount((c) => c + 1), [])
  const reset = useCallback(() => setCount(initial), [initial])
  return { count, increment, reset }
}

it('increments and resets', () => {
  const { result } = renderHook(() => useCounter(5))
  expect(result.current.count).toBe(5)
  act(() => result.current.increment())
  expect(result.current.count).toBe(6)
  act(() => result.current.reset())
  expect(result.current.count).toBe(5)
})

it('keeps the first initial value when props change', () => {
  const { result, rerender } = renderHook(({ initial }) => useCounter(initial), { initialProps: { initial: 1 } })
  rerender({ initial: 10 })
  expect(result.current.count).toBe(1)   // useState only uses its initial value once
})
```

**What happens, step by step:** `renderHook` mounts the hook; `result.current` always holds the latest return value (read it AFTER each `act`, do not destructure early); `act` runs `increment`, React re-renders, `result.current` points at the new object; `rerender` re-renders with new props. If you call `result.current.increment()` without `act`, the count stays `0` and React logs the "not wrapped in act" warning. The old package `@testing-library/react-hooks` is obsolete.

If a hook is hard to test alone, test it through a small component that uses it. That is the "behaviour" way and often better.

**The TDD loop** (test-driven development) is red, green, refactor: write a failing test, write the least code to pass, then clean up with the tests as a safety net.

```js
// 1. RED: formatPrice does not exist yet, the test fails
it('formats cents as dollars', () => {
  expect(formatPrice(1999)).toBe('$19.99')
  expect(formatPrice(5)).toBe('$0.05')
})
// 2. GREEN: the simplest code that passes
export const formatPrice = (cents) => `$${(cents / 100).toFixed(2)}`
// 3. REFACTOR: improve names and structure, run the tests again
```

TDD fits pure logic and bug fixes (write the failing test that reproduces the bug first). For UI, many teams write the component first and the test right after.

## 11. Context and router
Components that read context or routes need a **wrapper**: the provider they expect. Pass it with the `wrapper` option of `render`, and put it in a **custom render helper** so every test file reuses it.

```jsx
import { createContext, useContext } from 'react'
import { render, screen } from '@testing-library/react'

const ThemeContext = createContext('light')
function ThemeLabel() {
  const theme = useContext(ThemeContext)
  return <p>Theme: {theme}</p>
}

// test/test-utils.jsx : your own render
function renderWithTheme(ui, { theme = 'light', ...options } = {}) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeContext value={theme}>{children}</ThemeContext>,
    ...options,
  })
}

it('reads the theme from context', () => {
  renderWithTheme(<ThemeLabel />, { theme: 'dark' })
  expect(screen.getByText('Theme: dark')).toBeInTheDocument()
})
```

In React 19 you can write `<ThemeContext value={...}>` directly as the provider. The same helper pattern wraps Redux `Provider`, a TanStack `QueryClientProvider` (make a fresh `QueryClient` per test) or a router. `renderHook` accepts `wrapper` too. See [useContext](../02-hooks/05-usecontext.md).

**Router.** Use an in-memory router so no real URL or browser history is involved. With React Router 8, import everything from `react-router` (the package `react-router-dom` is gone). See [React Router](../03-intermediate/03-react-router.md).

```jsx
import { MemoryRouter, Routes, Route, Link, useParams } from 'react-router'

function Profile() {
  const { id } = useParams()
  return <h1>Profile {id}</h1>
}

function App() {
  return (
    <>
      <Link to="/profile/7">My profile</Link>
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route path="/profile/:id" element={<Profile />} />
      </Routes>
    </>
  )
}

it('navigates to a profile', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
  expect(screen.getByText('Home')).toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: 'My profile' }))
  expect(screen.getByRole('heading', { name: 'Profile 7' })).toBeInTheDocument()
})
```

For apps that use loaders and actions (data mode), build the router from route objects and start at any URL:

```jsx
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'   // only RouterProvider comes from /dom

const router = createMemoryRouter(
  [{ path: '/profile/:id', element: <Profile /> }],
  { initialEntries: ['/profile/7'] },
)
render(<RouterProvider router={router} />)
expect(await screen.findByRole('heading', { name: 'Profile 7' })).toBeInTheDocument()
```

`initialEntries` is the "current URL" for the test. A link click is a user action, so use `userEvent`. Assert on what appears, not on `router.state`.

## 12. Timers, Suspense and error boundaries
**Fake timers** let a 3 second timeout finish instantly.

```jsx
import { useEffect, useState } from 'react'

function Toast({ message, ms = 3000 }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), ms)
    return () => clearTimeout(t)
  }, [ms])
  return visible ? <p role="status">{message}</p> : null
}
```

```jsx
import { act } from 'react'

afterEach(() => vi.useRealTimers())

it('hides the toast after 3 seconds', () => {
  vi.useFakeTimers()
  render(<Toast message="Saved" />)
  expect(screen.getByRole('status')).toHaveTextContent('Saved')
  act(() => vi.advanceTimersByTime(2999))
  expect(screen.getByRole('status')).toBeInTheDocument()   // 1 ms early: still there
  act(() => vi.advanceTimersByTime(1))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
```

**What happens, step by step:** `useFakeTimers` replaces `setTimeout` and `Date`; the effect schedules a fake timer; `advanceTimersByTime(2999)` runs nothing yet; the extra 1 ms fires the callback, `setVisible(false)` runs inside `act`, and the toast leaves the DOM. Always switch back with `useRealTimers` in `afterEach`.

**Gotcha (Vitest + user-event):** with plain `vi.useFakeTimers()`, `await user.click(...)` and `findBy` hang until the 5 second test timeout, because Testing Library only advances fake timers when a global `jest` exists. These work: `vi.useFakeTimers({ shouldAdvanceTime: true })` with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` and `await act(async () => vi.advanceTimersByTime(3000))`; or `fireEvent` with sync `act`. Better still: avoid fake timers when you can wait for real with `findBy`.

**Lazy components and Suspense.** `findBy` waits for the lazy chunk, and the fallback is visible first:

```jsx
import { lazy, Suspense } from 'react'

const LazyHello = lazy(() => Promise.resolve({ default: () => <p>Loaded</p> }))

it('shows the fallback, then the lazy component', async () => {
  render(<Suspense fallback={<p>Loading...</p>}><LazyHello /></Suspense>)
  expect(screen.getByText('Loading...')).toBeInTheDocument()
  expect(await screen.findByText('Loaded')).toBeInTheDocument()
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
})
```

For a component that suspends with `use(promise)`, a plain `render` does not recover. Wrap it: `await act(async () => { render(<Suspense ...>...</Suspense>) })`, then `await screen.findByText(...)`. Create the promise outside the component. See [Concurrent React and Suspense](03-concurrent-react-and-suspense.md).

**Error boundaries.** React 19 logs one `console.error` for a caught render error. Pass `onCaughtError` to `render` to check it and silence the log. An error with NO boundary makes `render` throw.

```jsx
import { Component } from 'react'

class ErrorBoundary extends Component {   // boundaries still need a class
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <p role="alert">Something went wrong</p> : this.props.children
  }
}
function Boom() { throw new Error('boom') }

it('shows the fallback when a child throws', () => {
  const onCaughtError = vi.fn()
  render(<ErrorBoundary><Boom /></ErrorBoundary>, { onCaughtError })
  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
  expect(onCaughtError).toHaveBeenCalledTimes(1)
})

it('throws without a boundary', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})   // keep the output clean
  expect(() => render(<Boom />)).toThrow('boom')
})
```

More on boundaries: [Error boundaries](../03-intermediate/05-error-boundaries-portals-and-friends.md).

## 13. Accessibility, snapshots, coverage and flaky tests
**Accessibility.** Role-based queries already prove a lot: if `getByRole('button', { name: 'Save' })` works, a screen reader can find it. Add automatic rules with `jest-axe` (it works in Vitest):

```jsx
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

it('has no detectable accessibility violations', async () => {
  const { container } = render(<SignupForm onSubmit={() => {}} />)
  expect(await axe(container)).toHaveNoViolations()
})
```

axe finds only part of the problems (missing labels, image alt text, button names). jsdom cannot compute layout, so colour contrast is not checked here: use a real browser (Playwright with `@axe-core/playwright`). Manual keyboard and screen reader checks are still needed. See [Accessibility](09-accessibility.md).

**Snapshots.** `expect(container).toMatchSnapshot()` saves the rendered HTML to a file and fails when it changes. They are cheap to write and hurt when large: any harmless markup change fails the test, people run `-u` (update) without reading, and the test no longer says what matters. Use them for small stable output (a serialised object, an icon) and use `toMatchInlineSnapshot` when you do. For UI, assert on specific text and roles.

**Coverage.** `npm i -D @vitest/coverage-v8` then `npx vitest run --coverage` reports which lines ran during tests. The number says which code was **never executed**. It does NOT say the code is correct: a test with no assertions gives 100%. Use it to find untested branches, not as a goal to hit. Chasing 100% leads to tests of getters and trivial code.

**Flaky tests** pass and fail on the same code. Causes and cures:

| Cause | Cure |
|---|---|
| Asserting before async work finishes | `await findBy...` or `waitFor` |
| Real timers and `setTimeout` | fake timers, or wait on the visible result |
| Real network | MSW or a stubbed `fetch` |
| Shared state between tests (module variables, `localStorage`, a mock left set) | reset in `afterEach`, `cleanup`, `server.resetHandlers()` |
| Test order, random data, `Date.now()` | no order dependency, seed data, `vi.setSystemTime` |
| Animation, layout, real browser timing (E2E) | web-first assertions that auto-wait, never `sleep(2000)` |

A fixed sleep is the worst cure: slow when it works, still flaky on a busy CI machine.

## 14. End-to-end tests with Playwright
Component tests run in jsdom, a simulation. An **end-to-end (E2E)** test drives a real browser against the running app, so it also covers routing, the real server, cookies and CSS. It is slow, so cover only the critical journeys (sign in, checkout, the main flow).

```bash
npm init playwright@latest   # scaffolds config and an example
npx playwright test          # run headless; add --ui or --headed to watch
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI },
  use: { baseURL: 'http://localhost:5173' },
})
```

```ts
// e2e/tasks.spec.ts
import { test, expect } from '@playwright/test'

test('a user can add a task', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('New task').fill('Buy milk')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByRole('listitem')).toHaveText('Buy milk')
})
```

**What happens, step by step:** Playwright starts your dev server, opens Chromium, and `goto('/')` loads `baseURL`. `getByLabel` and `getByRole` use the same priority as Testing Library. Actions wait until the element is ready. `expect(locator).toHaveText` retries until it matches or times out, so you never write sleeps.

Choosing between them:

| | Component test (Vitest + RTL) | E2E (Playwright) |
|---|---|---|
| Runs in | jsdom, in Node | a real browser |
| Speed | milliseconds | seconds |
| Covers | one feature, fake network | the whole stack |
| Weak at | real layout, CSS, browser quirks | detail and edge cases (too slow) |

Many component edge cases, a few E2E journeys. **Visual regression** tools (Chromatic with Storybook, or Playwright screenshots) compare pictures of the UI to catch CSS changes. **Storybook** shows components in isolation, and its `play` functions and a11y addon can run as tests. Playwright's own React component testing package is no longer updated; use Vitest Browser Mode, Storybook, or RTL in jsdom instead. Cypress is the other common E2E tool.

## How interviewers test this
- They ask you to test a small component live. A strong answer renders it, queries with `getByRole`, uses `userEvent.setup()` with `await`, and asserts on visible output.
- They check you know why: behaviour over implementation, accessibility-first queries, `getBy` vs `queryBy` vs `findBy`.
- They probe async: "the test passes locally and fails on CI". Strong answers talk about `findBy`/`waitFor`, no fixed sleeps, and isolating network and time.
- They ask for a strategy: what you unit test, what is integration, what is E2E, and what you refuse to test.
- Red flags: `getByTestId` everywhere, testing state variables, snapshot-only suites, "100% coverage means no bugs", wrapping everything in `act` by hand, mocking the component under test.

## Interview questions and model answers
### Q1. How do you test a React component? (Easy)
I render it with React Testing Library, find elements the way a user would (by role, label or text), perform actions with `userEvent`, and assert on what is visible, using jest-dom matchers. I avoid testing internal state or implementation, so the test survives refactors. Callbacks are covered by passing `vi.fn()` and checking how it was called.

```jsx
render(<Counter />)
await user.click(screen.getByRole('button', { name: 'Increment' }))
expect(screen.getByText('Count: 1')).toBeInTheDocument()
```

### Q2. `getByRole` or `getByTestId`? What is the query priority? (Easy)
Prefer `getByRole` (with `name`), because it matches how users and assistive technology see the page and fails if your markup is not accessible. Then `getByLabelText` for fields, `getByPlaceholderText`, `getByText`, `getByDisplayValue`, then `getByAltText` and `getByTitle`. `getByTestId` is the last resort, for things with no role, text or label. A test id never proves anything about accessibility.

### Q3. What is the difference between `getBy`, `queryBy` and `findBy`? (Easy)
`getBy` returns the element or throws if there are none (or several). `queryBy` returns `null` when nothing matches, so it is the one to use for "is not there" assertions (it still throws on several). `findBy` is async: it retries until the element appears (1000 ms by default) and rejects otherwise, so use it for things that show up after a fetch or a timer. Each has an `All` version for many elements.

### Q4. `fireEvent` or `userEvent`? (Easy)
`fireEvent` dispatches a single DOM event. `userEvent` simulates what a person does: a click is hover, mousedown, mouseup and click, and typing fires keydown, keypress, input and keyup for each character, honouring disabled and readonly fields. Real components often depend on those chains, so `userEvent` finds more real bugs. Create it with `userEvent.setup()` and `await` each call. Use `fireEvent` only for events a user cannot produce directly.

### Q5. How do you test async code? (Medium)
I make the test wait for the visible result: `await screen.findByText(...)` for something that appears, `waitForElementToBeRemoved` for a spinner that goes away, and `waitFor` for an assertion that needs retrying. I never use fixed sleeps. I control the sources of delay: a mocked network (MSW or a stubbed `fetch`) and fake timers if needed. If I see an `act` warning, I look for an update my test did not wait for.

### Q6. How do you mock API calls? (Medium)
Two options. For simple cases, stub `fetch` with `vi.stubGlobal('fetch', vi.fn().mockResolvedValue(...))` and restore it with `vi.unstubAllGlobals()`. For realistic tests, use MSW: define `http.get(...)` handlers, start `setupServer` in the setup file, override one response with `server.use(...)` per test (for a 500 or a slow response), and `resetHandlers` after each test. MSW tests the real request code, so switching from `fetch` to axios does not break them. If a module wraps the API, `vi.mock` of that module also works.

### Q7. How do you test a custom hook? (Medium)
With `renderHook` from Testing Library, which renders a hidden component that calls the hook. Read the latest value from `result.current`, wrap state-changing calls in `act`, and use `initialProps` with `rerender` to test changes in arguments. If the hook needs context, pass a `wrapper`. If the hook is tightly tied to one component, test the component instead, which checks the behaviour users get. Do not use the old `@testing-library/react-hooks` package.

### Q8. What is the testing trophy? How do unit, integration and E2E tests differ? (Medium)
The trophy is a guide for where to invest: static analysis (TypeScript, ESLint) as the base, a few unit tests, the most integration tests, and a few E2E tests on top. Unit tests check one function or hook in isolation: fast and precise, but they say little about wiring. Integration tests render a component with its real children and a fake network: the best confidence per effort. E2E tests drive a real browser against the real app: highest realism, but slow and more flaky, so keep them for critical flows.

### Q9. What should you NOT test? (Medium)
Implementation details (state variable names, internal functions, hook call order, class names), third-party libraries (they have their own tests), React itself, pure markup with no logic, and things your mocks control. Avoid large snapshots and avoid chasing a coverage number. Test what the user can see and do, plus the logic with branches: validation, errors, empty states, permissions.

### Q10. How do you test components that use context or a router? (Medium)
Render them inside the provider they expect, using the `wrapper` option of `render`, ideally in a custom `renderWithProviders` helper reused by every test. For the router use `MemoryRouter` with `initialEntries` (or `createMemoryRouter` with `RouterProvider` for loaders and actions) to start at any URL, click links with `userEvent`, and assert on the page that appears. For context, pass the value you need through the wrapper, for example a dark theme or a logged-in user. Create a fresh store or `QueryClient` per test so tests do not share state.

### Q11. What does code coverage tell you, and are snapshot tests good? (Medium)
Coverage tells you which lines and branches ran during the tests. It cannot tell you the assertions are meaningful, so 100% can still hide bugs; use it to spot untested code. Large snapshots break on harmless changes and get updated without review, so they teach nothing. Small, stable snapshots are fine. For UI, assert on role and text instead.

### Q12. Why is a test flaky and how do you fix it? (Hard)
Flaky means different results on the same code. The usual causes are not waiting for async work, real timers or network, state shared between tests (module variables, storage, leftover mocks), order dependence, and random or time-based data. The cures are `findBy`/`waitFor`, MSW or stubs, fake timers, resetting everything in `afterEach`, fixed seeds and `vi.setSystemTime`. Never add `sleep`. Quarantine a flaky test quickly and fix the cause, because a flaky suite teaches the team to ignore failures.

## Common mistakes and gotchas
- Missing `await` on `user.click`/`user.type`: always `const user = userEvent.setup()` and `await` every call.
- Asserting right after `render` on data that loads later: use `await findBy...`.
- Using `getBy` to assert absence (it throws): use `queryBy` with `not.toBeInTheDocument()`.
- `getByTestId` first: try `getByRole` with `name` first.
- Calling a state-changing function outside `act` (hooks): wrap it in `act(() => ...)`.
- Fake timers with `userEvent` hang under Vitest: use `shouldAdvanceTime: true` plus `advanceTimers`, or `fireEvent`.
- Old MSW API (`rest`, `ctx`) or `onUnhandledRequest`: use `http`, `HttpResponse` and `onUnhandledFrame`.
- Mocks that leak into the next test: restore in `afterEach` (`vi.unstubAllGlobals()`, `mockRestore()`, `server.resetHandlers()`).
- Nested `vi.mock` inside a function or `if`: it must be at the top level of the file.
- Importing `act` from `react-dom/test-utils`, or using `react-test-renderer`: both are deprecated; use `act` from `react` or Testing Library.
- Unrelated `jest-dom` import missing: add `import '@testing-library/jest-dom/vitest'` to the setup file.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Explain: which query would you use for (a) a "Delete" button, (b) an input with the label "Password", (c) the paragraph "Your cart is empty", (d) a chart `<div>` with no text or role?

<details>
<summary>Show answer</summary>

(a) `getByRole('button', { name: 'Delete' })`. (b) `getByLabelText('Password')`. (c) `getByText('Your cart is empty')`. (d) `getByTestId('sales-chart')`, because nothing else identifies it. Better: give the chart an accessible name (`role="img"` with `aria-label`) and query by role.

</details>

2. **(Easy)** Predict: with `render(<button>Save</button>)`, what do `screen.getByRole('button', { name: 'Save' })`, `screen.queryByRole('link')` and `screen.getByRole('link')` do?

<details>
<summary>Show answer</summary>

The first returns the button. The second returns `null`, with no error. The third throws "Unable to find an accessible element with the role "link"", followed by the list of roles that exist.

</details>

3. **(Easy)** Code: given the `Toggle` below, write a test that checks the details are hidden at first, shown after the click, and that the button label changes.

```jsx
function Toggle() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)}>{open ? 'Hide details' : 'Show details'}</button>
      {open && <p>Here are the details</p>}
    </div>
  )
}
```

<details>
<summary>Show answer</summary>

```jsx
it('toggles the details', async () => {
  const user = userEvent.setup()
  render(<Toggle />)
  expect(screen.queryByText('Here are the details')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Show details' }))
  expect(screen.getByText('Here are the details')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Hide details' })).toBeInTheDocument()
})
```

`queryBy` for the absent state, `getBy` after the click, and the second button lookup uses the new name, which also checks the label change.

</details>

4. **(Medium)** Code: write tests for this hook with `renderHook`: it starts as `false` and `toggle` flips it.

```jsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial)
  const toggle = useCallback(() => setOn((v) => !v), [])
  return [on, toggle]
}
```

<details>
<summary>Show answer</summary>

```jsx
it('starts false and flips on toggle', () => {
  const { result } = renderHook(() => useToggle())
  expect(result.current[0]).toBe(false)
  act(() => result.current[1]())
  expect(result.current[0]).toBe(true)
  act(() => result.current[1]())
  expect(result.current[0]).toBe(false)
})
```

Read `result.current` again after each `act`, because it points at the newest return value.

</details>

5. **(Medium)** Debug: this test fails with "Unable to find ... heading" although the component works in the browser. Why, and what is the fix? (`fetch` is stubbed and resolves with `{ name: 'Ada' }`.)

```jsx
it('shows Ada', () => {
  render(<UserCard id="1" />)
  expect(screen.getByRole('heading', { name: 'Ada' })).toBeInTheDocument()
})
```

<details>
<summary>Show answer</summary>

`render` shows the first render, which is "Loading...". The data arrives in a later tick, but `getByRole` checks once, immediately. Make the test async and wait: `expect(await screen.findByRole('heading', { name: 'Ada' })).toBeInTheDocument()`. The non-awaiting version can also print an "update was not wrapped in act" warning because the state update happens after the test has finished.

</details>

6. **(Medium)** Code: test `UserCard` (section 8) for three states: loading text first, the user's name on success, and the alert on a failed request. Use a stubbed `fetch`.

<details>
<summary>Show answer</summary>

```jsx
afterEach(() => vi.unstubAllGlobals())

it('shows loading then the user', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ name: 'Ada' }) }))
  render(<UserCard id="1" />)
  expect(screen.getByText('Loading...')).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'Ada' })).toBeInTheDocument()
})

it('shows an alert when the request fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
  render(<UserCard id="1" />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load user')
})
```

</details>

7. **(Medium)** Predict: using `vi.useFakeTimers()` and the `Toast` from section 12 (3000 ms), after `act(() => vi.advanceTimersByTime(2999))` is the toast on screen? After one more millisecond? What goes wrong if you use `await user.click(...)` in the same test without any extra option?

<details>
<summary>Show answer</summary>

At 2999 ms the toast is still shown. After 3000 ms in total it is gone. With plain fake timers, `await user.click(...)` (and `findBy`/`waitFor`) hang until the 5 second test timeout, because Testing Library only advances fake timers when a global `jest` object exists. Use `vi.useFakeTimers({ shouldAdvanceTime: true })` with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`.

</details>

8. **(Hard)** Explain: a checkout feature has a cart reducer, a coupon form with validation, a payment API call and a "thank you" page. Which tests do you write at each level, and what do you mock?

<details>
<summary>Show answer</summary>

Unit: the reducer and any price or coupon calculation as plain function tests (no mocks). Integration (most of the effort): render the checkout page with providers, type a coupon, see the validation message, submit, and see the thank-you content; use MSW to return success, a 402 declined payment and a network error, and assert the user sees the right message each time. Mock only the network and time. E2E: one or two Playwright journeys (add item, pay in the provider's test mode, see the confirmation), because they cover real routing and the real backend. Skip tests for third-party payment widgets internals and for markup with no logic.

</details>

## Recap
- Test behaviour a user can see, not implementation: confidence per cost is highest in the integration layer (the trophy).
- Setup: Vitest + jsdom + Testing Library + jest-dom (`@testing-library/jest-dom/vitest` in a setup file) + `cleanup`; the Jest names differ only for `jest.` calls and config.
- Query priority: role (with name), label, placeholder, text, display value, alt/title, test id last.
- `getBy` throws, `queryBy` returns `null` (use it for absence), `findBy` waits; use `within` to narrow the search.
- `const user = userEvent.setup()` and `await user.click/type`; `fireEvent` is a single raw event.
- Wait for async UI with `findBy`, `waitFor` (one assertion) and `waitForElementToBeRemoved`; never use sleeps.
- Mock the edges: `vi.fn`, `vi.mock` (top level), stubbed `fetch`, or MSW 3 (`http`, `HttpResponse`, `onUnhandledFrame`).
- Hooks use `renderHook` + `act`; context and router use a `wrapper` or a custom render helper with `MemoryRouter`.
- Snapshots and coverage are tools, not goals; flaky tests come from async, time, network and shared state; E2E (Playwright) covers a few critical journeys.

## Where to go next
- Make your components testable and accessible: [Accessibility](09-accessibility.md).
- Practice: [the counter exercise test](../practice-app/exercises/react/01-counter/App.test.jsx) shows the style used across the exercises.
- Revise with the round: [Round 7 - performance and testing](../05-interview-rounds/round-7-performance-and-testing/README.md).
- Related lessons: [Custom hooks](../02-hooks/08-custom-hooks.md), [useReducer](../02-hooks/06-usereducer.md), [Data fetching](../03-intermediate/02-data-fetching.md), [Concurrent React and Suspense](03-concurrent-react-and-suspense.md).
