# Round 7 - Performance and Testing: Testing Exercises - Answers

**Questions:** [../questions/02-testing-exercises.md](../questions/02-testing-exercises.md)

**About these answers:** every test file below was run with Vitest 5, React 19 and Testing Library, and every test passes. To check that the tests are real, key lines of the components were also broken on purpose (a wrong rule, a missing cleanup, a missing `aria` attribute) and a test failed each time. Each test file sits next to its component and imports it with `./Name.jsx`. The tests assume the practice app's setup: a `jsdom` environment, `@testing-library/jest-dom/vitest` loaded in a setup file, and `cleanup()` after each test.

## Forms and queries

### R7-TS-001 (Easy) Test a login form
**Answer:** test what the user sees and does: fill in the labelled fields, click the button, read the alert. Do not look at component state. Use `vi.fn()` as a spy for `onSubmit` and check both that it was called (valid data) and that it was not called (invalid data).

Save as `LoginForm.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import LoginForm from './LoginForm.jsx'

async function fillAndSubmit(user, { email, password }) {
  if (email) await user.type(screen.getByLabelText('Email'), email)
  if (password) await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('LoginForm', () => {
  it('shows both fields and a submit button', () => {
    render(<LoginForm onSubmit={vi.fn()} />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('rejects an email without @ and does not submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)

    await fillAndSubmit(user, { email: 'ada.example.com', password: 'longenough' })

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a short password and does not submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)

    await fillAndSubmit(user, { email: 'ada@example.com', password: 'short' })

    expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the typed values once, and clears an earlier error', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)

    // First a failed attempt, so an error is on screen.
    await fillAndSubmit(user, { email: 'ada@example.com', password: 'short' })
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // Fix the password and try again.
    await user.type(screen.getByLabelText('Password'), 'er-and-longer')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'shorter-and-longer',
    })
  })
})
```

**What to notice:**
- `getByLabelText` and `getByRole('button', { name })` mirror how a person finds the controls. If a label is missing, the test fails, which also protects accessibility.
- `queryByRole('alert')` returns `null` when nothing is there, so it is the right query for "must not exist". `getBy` would throw.
- `userEvent.setup()` and `await user.type(...)` play a full interaction (focus, key down, input, key up), unlike `fireEvent`, which sends one bare event. Prefer user-event.
- The helper `fillAndSubmit` removes repetition but each test still reads like a story.

**Why it matters / follow-up:** "How would you test submitting with the Enter key?" Type into a field and then `await user.keyboard('{Enter}')`. "Should you also test that `setError` was called?" No, that is an implementation detail.
**Learn more:** [Testing React](../../../04-advanced/08-testing-react.md), [Forms](../../../01-basics/07-forms.md)

### R7-TS-002 (Easy) Test tabs with accessible queries
**Answer:** query everything by role and accessible name. The panel gets its name from the tab through `aria-labelledby`, so `getByRole('tabpanel', { name: 'Billing' })` proves the wiring is correct. Check state with the ARIA attribute (`aria-selected`), because that is what assistive technology reads.

Save as `Tabs.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Tabs from './Tabs.jsx'

const TABS = [
  { id: 'profile', label: 'Profile', content: <p>Your profile details</p> },
  { id: 'billing', label: 'Billing', content: <p>Your invoices</p> },
  { id: 'security', label: 'Security', content: <p>Change your password</p> },
]

describe('Tabs', () => {
  it('exposes a tablist with one tab per section', () => {
    render(<Tabs tabs={TABS} />)
    const tablist = screen.getByRole('tablist', { name: 'Account sections' })
    expect(tablist).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Profile',
      'Billing',
      'Security',
    ])
  })

  it('selects the first tab and shows only its panel at the start', () => {
    render(<Tabs tabs={TABS} />)
    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Billing' })).toHaveAttribute('aria-selected', 'false')
    // The panel gets its accessible name from the tab (aria-labelledby).
    expect(screen.getByRole('tabpanel', { name: 'Profile' })).toHaveTextContent(
      'Your profile details',
    )
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
  })

  it('switches the selected tab and the visible panel on click', async () => {
    const user = userEvent.setup()
    render(<Tabs tabs={TABS} />)

    await user.click(screen.getByRole('tab', { name: 'Billing' }))

    expect(screen.getByRole('tab', { name: 'Billing' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tabpanel', { name: 'Billing' })).toHaveTextContent('Your invoices')
    expect(screen.queryByText('Your profile details')).not.toBeInTheDocument()
  })
})
```

**What to notice:**
- No test ids and no class names. If someone renames a CSS class, these tests still pass. If someone breaks the ARIA wiring, they fail.
- `toEqual` on `getAllByRole('tab').map(...)` checks the order and the labels in one line.
- `getAllByRole('tabpanel')` with `toHaveLength(1)` proves the other panels are not shown.

**Why it matters / follow-up:** "What would you add for keyboard users?" A test that arrow keys move between tabs (after you implement them), using `user.keyboard('{ArrowRight}')` and checking focus with `toHaveFocus`.
**Learn more:** [Accessibility](../../../04-advanced/09-accessibility.md), [Testing React](../../../04-advanced/08-testing-react.md)

## Async code and timers

### R7-TS-003 (Medium) Test a component that fetches data
**Answer:** replace `fetch` with a mock so no real request happens, give each test its own response, and wait for the result with `findBy` (a query that retries until the element appears or a timeout passes). Put `vi.unstubAllGlobals()` in `afterEach` so a mock never leaks into the next test.

Save as `UserList.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import UserList from './UserList.jsx'

// A tiny stand-in for a fetch Response: only what the component uses.
function jsonResponse(body, { status = 200 } = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UserList', () => {
  it('shows a loading message, then the users', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse([
          { id: 1, name: 'Ada' },
          { id: 2, name: 'Grace' },
        ]),
      ),
    )
    render(<UserList />)

    expect(screen.getByText(/loading users/i)).toBeInTheDocument()
    expect(await screen.findByText('Ada')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.queryByText(/loading users/i)).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/users', expect.anything())
  })

  it('shows an empty state for an empty list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([])))
    render(<UserList />)
    expect(await screen.findByText('No users yet.')).toBeInTheDocument()
  })

  it('shows an alert when the server answers with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, { status: 500 })))
    render(<UserList />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load users/i)
  })

  it('shows an alert when the network is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    render(<UserList />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('retries after a failure and then shows the users', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({}, { status: 500 }))
        .mockResolvedValueOnce(jsonResponse([{ id: 1, name: 'Ada' }])),
    )
    render(<UserList />)

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Ada')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
```

**What to notice:**
- `mockResolvedValueOnce` twice lets one test describe "first call fails, second call works", which is exactly the retry story.
- The first assertion (`getByText(/loading users/i)`) runs straight after `render`, before the promise resolves, so it sees the loading state.
- `findByRole('alert')` waits; `getByRole` would fail because the error is not there yet. If you see "not wrapped in act" warnings, you probably asserted too early or forgot to await something. Prefer `findBy` over `waitFor` with a manual callback.
- The mock only provides `ok`, `status` and `json`, the parts the component uses.

**MSW versus mocking `fetch`:** a `fetch` mock replaces one function, so you must copy the shape of a real response by hand, and it only works for code that calls that function. MSW (Mock Service Worker) intercepts requests at the network level: your component, `fetch`, axios or any other client run unchanged, and you describe the server once. The same handlers can run in tests, in Storybook and in the browser during development. The shape below follows the MSW 3 documentation (Node setup). It is not part of the tested file and needs `npm install -D msw`; the component would have to call the same absolute URL.

```js
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('https://api.example.com/users', () => HttpResponse.json([{ id: 1, name: 'Ada' }])),
)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Inside one test: make the server fail for this test only
server.use(
  http.get('https://api.example.com/users', () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
)
```

**Why it matters / follow-up:** "How would you test the race where an old response arrives late?" Make two pending promises you resolve yourself, in the wrong order, and check that the screen shows the newest result (the `AbortError` branch in this component helps).
**Learn more:** [Testing React](../../../04-advanced/08-testing-react.md), [Data fetching](../../../03-intermediate/02-data-fetching.md)

### R7-TS-004 (Medium) Test a debounce with fake timers
**Answer:** fake timers replace `setTimeout` with a clock you control, so a 300 ms wait takes no real time. Advance the clock inside `act` so React applies the state updates the timers cause. Avoid asserting exactly on the boundary (299 ms versus 300 ms): leave a safe margin, as the tests do.

**The known problem:** under Vitest, after a plain `vi.useFakeTimers()`, Testing Library's waiting helpers (`findBy`, `waitFor`, and user-event, which uses them) can hang until the test times out. Testing Library only moves fake timers forward automatically when it detects Jest. Two ways that work:
1. `vi.useFakeTimers({ shouldAdvanceTime: true })` together with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` (used below).
2. Skip user-event: use `fireEvent.change(...)` (synchronous) and `act(() => vi.advanceTimersByTime(ms))`.

Because `shouldAdvanceTime` also lets the fake clock tick with real time, keep margins of 50 ms or more in your assertions.

Save as `DebouncedSearch.test.jsx`:

```jsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DebouncedSearch from './DebouncedSearch.jsx'

// Fake timers with Vitest and Testing Library:
// - shouldAdvanceTime lets the fake clock tick with real time, so user-event
//   and findBy* do not hang waiting for a timer that never fires.
// - advanceTimers tells user-event how to move the fake clock.
function setup(props) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const onSearch = vi.fn()
  render(<DebouncedSearch onSearch={onSearch} {...props} />)
  return { user, onSearch, input: screen.getByRole('textbox', { name: 'Search' }) }
}

function advance(ms) {
  // Wrap in act so React applies any state updates the timers cause.
  return act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DebouncedSearch', () => {
  it('does not call onSearch while the user is still typing, then calls it once', async () => {
    const { user, onSearch, input } = setup()

    await user.type(input, 'abc')
    await advance(250)
    expect(onSearch).not.toHaveBeenCalled()

    await advance(100)
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith('abc')
  })

  it('restarts the wait after every keystroke', async () => {
    const { user, onSearch, input } = setup()

    await user.type(input, 'a')
    await advance(200)
    await user.type(input, 'b')
    await advance(200) // 400 ms since the first key, but only 200 since the last
    expect(onSearch).not.toHaveBeenCalled()

    await advance(150)
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith('ab')
  })

  it('respects a custom delay', async () => {
    const { user, onSearch, input } = setup({ delay: 1000 })

    await user.type(input, 'x')
    await advance(900)
    expect(onSearch).not.toHaveBeenCalled()

    await advance(200)
    expect(onSearch).toHaveBeenCalledWith('x')
  })

  it('does not search for an empty box', async () => {
    const { onSearch } = setup()
    await advance(1000)
    expect(onSearch).not.toHaveBeenCalled()
  })
})
```

**What to notice:**
- `vi.useRealTimers()` in `afterEach` stops fake timers from leaking into other tests.
- The "restarts the wait" test is the heart of a debounce: 400 ms passed since the first key, yet nothing fired, because only 200 ms passed since the last key.
- The component's cleanup (`clearTimeout`) is what makes the debounce work. Removing it makes a test fail.

**Why it matters / follow-up:** "Why not just `await new Promise(r => setTimeout(r, 400))`?" It makes the suite slow and flaky. Fake timers are fast and deterministic.
**Learn more:** [Testing React](../../../04-advanced/08-testing-react.md), [Custom hooks (useDebounce)](../../../02-hooks/08-custom-hooks.md)

## Context, hooks and logic

### R7-TS-005 (Medium) Test a component that needs a context provider
**Answer:** use the `wrapper` option of `render`, hidden behind a small helper (`renderWithTheme`). The helper gives every test a provider and lets a test choose the starting value. This is the same pattern you use for a router, a store or a query client. Also test the guard that throws a clear error when the provider is missing.

Save as `ThemeToggle.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, ThemeToggle } from './ThemeToggle.jsx'

// A custom render helper: every test gets the provider without repeating it.
function renderWithTheme(ui, { initialTheme } = {}) {
  function Wrapper({ children }) {
    return <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
  }
  return render(ui, { wrapper: Wrapper })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ThemeToggle', () => {
  it('shows the light theme by default', () => {
    renderWithTheme(<ThemeToggle />)
    expect(screen.getByText('Current theme: light')).toBeInTheDocument()
  })

  it('starts from the theme given to the provider', () => {
    renderWithTheme(<ThemeToggle />, { initialTheme: 'dark' })
    expect(screen.getByText('Current theme: dark')).toBeInTheDocument()
  })

  it('switches between light and dark on click', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Switch theme' }))
    expect(screen.getByText('Current theme: dark')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Switch theme' }))
    expect(screen.getByText('Current theme: light')).toBeInTheDocument()
  })

  it('throws a helpful error when there is no provider', () => {
    // React logs the error to the console; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ThemeToggle />)).toThrow('useTheme must be used inside ThemeProvider')
  })
})
```

**What to notice:**
- The tests go through the real provider and the real component; they do not reach into the context object.
- The provider has an `initialTheme` prop. Giving a component a way to start in a known state is a good "test seam".
- The "no provider" test expects `render` to throw. React logs the error too, so `console.error` is silenced with a spy, which `vi.restoreAllMocks()` undoes.

**Why it matters / follow-up:** "Where would you keep `renderWithTheme`?" In a shared `test-utils.jsx`, often combined with other providers into one `renderWithProviders`. Keep the options small.
**Learn more:** [useContext](../../../02-hooks/05-usecontext.md), [Testing React](../../../04-advanced/08-testing-react.md)

### R7-TS-006 (Medium) Test a custom hook with renderHook
**Answer:** `renderHook(() => useLocalStorage(...))` runs the hook inside a tiny test component and gives you `result.current`, which always holds the latest return value. Wrap anything that changes state in `act`, so React finishes its updates before you read the result. Reset `localStorage` before each test, because it is shared between tests in the same file.

Save as `useLocalStorage.test.js`:

```js
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useLocalStorage } from './useLocalStorage.js'

beforeEach(() => {
  localStorage.clear()
})

describe('useLocalStorage', () => {
  it('returns the initial value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage('name', 'Ada'))
    expect(result.current[0]).toBe('Ada')
  })

  it('reads an existing value from localStorage', () => {
    localStorage.setItem('name', JSON.stringify('Grace'))
    const { result } = renderHook(() => useLocalStorage('name', 'Ada'))
    expect(result.current[0]).toBe('Grace')
  })

  it('updates the state and saves it', () => {
    const { result } = renderHook(() => useLocalStorage('name', 'Ada'))

    act(() => {
      result.current[1]('Linus')
    })

    expect(result.current[0]).toBe('Linus')
    expect(JSON.parse(localStorage.getItem('name'))).toBe('Linus')
  })

  it('supports a functional update', () => {
    const { result } = renderHook(() => useLocalStorage('count', 1))

    act(() => {
      result.current[1]((n) => n + 1)
    })
    act(() => {
      result.current[1]((n) => n + 1)
    })

    expect(result.current[0]).toBe(3)
    expect(localStorage.getItem('count')).toBe('3')
  })

  it('works with objects', () => {
    const { result } = renderHook(() => useLocalStorage('prefs', { dark: false }))

    act(() => {
      result.current[1]({ dark: true })
    })

    expect(JSON.parse(localStorage.getItem('prefs'))).toEqual({ dark: true })
  })

  it('falls back to the initial value when the stored text is not valid JSON', () => {
    localStorage.setItem('name', '{not json')
    const { result } = renderHook(() => useLocalStorage('name', 'Ada'))
    expect(result.current[0]).toBe('Ada')
  })

  it('keeps the value across a re-render of the same hook', () => {
    const { result, rerender } = renderHook(() => useLocalStorage('name', 'Ada'))
    act(() => {
      result.current[1]('Linus')
    })
    rerender()
    expect(result.current[0]).toBe('Linus')
  })
})
```

**What to notice:**
- Read `result.current` after the `act`, not before: it is replaced on every render, so an old copy is stale.
- Tests check the public contract (the returned value and what is stored), not the `useState` and `useEffect` inside.
- For a hook that needs a provider, pass `{ wrapper }` to `renderHook`, the same idea as in R7-TS-005. To change props between renders, use `renderHook(cb, { initialProps })` and `rerender(newProps)`.

**Why it matters / follow-up:** "What happens in this hook if `key` changes?" The state keeps the old value, because the initializer runs only once, and the effect then writes that old value under the new key. That is a real limitation worth knowing (and a test you could add after fixing it).
**Learn more:** [Custom hooks](../../../02-hooks/08-custom-hooks.md)

### R7-TS-007 (Easy) Test a reducer and a pure function
**Answer:** pure logic needs no React. Call the function with a state and an action, and compare the result. Make the tests short, table-like and independent. Prove immutability by deep-freezing the input: in an ES module (strict mode) a mutation of a frozen object throws, so the test fails loudly.

Save as `cart.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { cartReducer, cartTotal, initialCart } from './cart.js'

const apple = { id: 'apple', name: 'Apple', price: 120 }
const pear = { id: 'pear', name: 'Pear', price: 80 }

// Freeze the state so any accidental mutation throws an error in strict mode.
function deepFreeze(value) {
  Object.values(value).forEach((v) => {
    if (typeof v === 'object' && v !== null) deepFreeze(v)
  })
  return Object.freeze(value)
}

function run(actions, start = initialCart) {
  return actions.reduce((state, action) => cartReducer(deepFreeze(state), action), start)
}

describe('cartReducer', () => {
  it('adds a new item with quantity 1', () => {
    const state = run([{ type: 'add', item: apple }])
    expect(state.items).toEqual([{ ...apple, qty: 1 }])
  })

  it('adding the same item again increases its quantity', () => {
    const state = run([
      { type: 'add', item: apple },
      { type: 'add', item: apple },
    ])
    expect(state.items).toHaveLength(1)
    expect(state.items[0].qty).toBe(2)
  })

  it('keeps different items separate and in the order they were added', () => {
    const state = run([
      { type: 'add', item: apple },
      { type: 'add', item: pear },
    ])
    expect(state.items.map((i) => i.id)).toEqual(['apple', 'pear'])
  })

  it('removes an item', () => {
    const state = run([
      { type: 'add', item: apple },
      { type: 'add', item: pear },
      { type: 'remove', id: 'apple' },
    ])
    expect(state.items.map((i) => i.id)).toEqual(['pear'])
  })

  it('sets a quantity, and removes the item when the quantity is 0 or less', () => {
    const withThree = run([
      { type: 'add', item: apple },
      { type: 'setQty', id: 'apple', qty: 3 },
    ])
    expect(withThree.items[0].qty).toBe(3)

    const gone = cartReducer(withThree, { type: 'setQty', id: 'apple', qty: 0 })
    expect(gone.items).toEqual([])
  })

  it('clears the cart', () => {
    const state = run([{ type: 'add', item: apple }, { type: 'clear' }])
    expect(state).toEqual(initialCart)
  })

  it('returns the same state object for an unknown action', () => {
    const state = deepFreeze({ items: [{ ...apple, qty: 1 }] })
    expect(cartReducer(state, { type: 'unknown' })).toBe(state)
  })

  it('never changes the state it was given', () => {
    const before = deepFreeze({ items: [{ ...apple, qty: 1 }] })
    const after = cartReducer(before, { type: 'add', item: apple })
    expect(after).not.toBe(before)
    expect(before.items[0].qty).toBe(1)
  })
})

describe('cartTotal', () => {
  it('is 0 for an empty cart', () => {
    expect(cartTotal(initialCart)).toBe(0)
  })

  it('adds up price times quantity', () => {
    const state = run([
      { type: 'add', item: apple },
      { type: 'setQty', id: 'apple', qty: 3 },
      { type: 'add', item: pear },
    ])
    expect(cartTotal(state)).toBe(3 * 120 + 80)
  })
})
```

**What to notice:**
- `run([...actions])` replays a story with `reduce`, so each test is a few lines.
- The unknown-action test uses `toBe` (same object), because returning the same state is what lets React skip a re-render.
- Prices are whole cents, so the total test has no floating-point surprises (`0.1 + 0.2` problems).
- Tests like these run in milliseconds. Put as much logic as you can in pure functions and test it here.

**Why it matters / follow-up:** "Should you also test the component that uses this reducer?" Yes, but only a few behaviours: the reducer's details are already covered.
**Learn more:** [useReducer](../../../02-hooks/06-usereducer.md)

## Errors, routing and accessibility

### R7-TS-008 (Medium) Test an error boundary
**Answer:** make a child that throws on demand, render it inside the boundary and check the fallback. Error boundaries are still class components (there is no hook version), so test them through their behaviour: the fallback, the `onError` callback, and recovery. React and jsdom both log a caught error to the console, so silence `console.error` in these tests to keep the output readable.

Save as `ErrorBoundary.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary.jsx'

let shouldThrow = false

function Bomb() {
  if (shouldThrow) throw new Error('boom')
  return <p>All good</p>
}

beforeEach(() => {
  shouldThrow = false
  // React and jsdom both log a caught render error. Keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the fallback and reports the error when a child throws', () => {
    shouldThrow = true
    const onError = vi.fn()
    render(
      <ErrorBoundary onError={onError}>
        <Bomb />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.')
    expect(screen.queryByText('All good')).not.toBeInTheDocument()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(onError.mock.calls[0][0].message).toBe('boom')
  })

  it('recovers when the user clicks Try again and the problem is gone', async () => {
    const user = userEvent.setup()
    shouldThrow = true
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()

    shouldThrow = false // the cause has been fixed
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText('All good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the fallback again if the child still throws after Try again', async () => {
    const user = userEvent.setup()
    shouldThrow = true
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
```

**What to notice:**
- `shouldThrow` is a plain variable the `Bomb` reads, so a test can "fix the bug" before clicking Try again.
- The last test matters: a boundary that resets but keeps failing must show the fallback again, not crash.
- Remember what boundaries do not catch: errors in event handlers, in async code (promises, timers) and in the boundary itself. Those need `try/catch` or your own error state.
- `getDerivedStateFromError` picks the fallback (render phase); `componentDidCatch` is for side effects such as reporting. In React 19 you can also report from the root with the `onCaughtError` option of `createRoot`.

**Why it matters / follow-up:** "How do you reset a boundary when the route changes?" Give it a `key` that changes with the route, or reset it from a parent.
**Learn more:** [Error boundaries](../../../03-intermediate/05-error-boundaries-portals-and-friends.md)

### R7-TS-009 (Medium) Test routing without a browser
**Answer:** wrap the component in a `MemoryRouter` and use `initialEntries` to start at any URL. A memory router keeps the history in memory, so it needs no browser address bar and no real navigation. Test the visible result (headings, links, messages) and navigate by clicking links like a user. This uses React Router 8, where everything is imported from `react-router`.

Save as `ProductsApp.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import ProductsApp from './ProductsApp.jsx'

// MemoryRouter keeps the "URL" in memory, so no real browser history is needed.
function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ProductsApp />
    </MemoryRouter>,
  )
}

describe('ProductsApp routing', () => {
  it('lists the products on /products with a link for each', () => {
    renderAt('/products')
    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Keyboard' })).toHaveAttribute('href', '/products/p1')
    expect(screen.getByRole('link', { name: 'Monitor' })).toHaveAttribute('href', '/products/p2')
  })

  it('opens the detail page when a link is clicked, and goes back with the link', async () => {
    const user = userEvent.setup()
    renderAt('/products')

    await user.click(screen.getByRole('link', { name: 'Monitor' }))
    expect(screen.getByRole('heading', { name: 'Monitor' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Back to products' }))
    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument()
  })

  it('reads the id from the URL when the user lands directly on a detail page', () => {
    renderAt('/products/p1')
    expect(screen.getByRole('heading', { name: 'Keyboard' })).toBeInTheDocument()
  })

  it('shows a message for an unknown product', () => {
    renderAt('/products/nope')
    expect(screen.getByText('Product not found')).toBeInTheDocument()
  })

  it('shows a not-found page for an unknown route', () => {
    renderAt('/somewhere/else')
    expect(screen.getByText('Page not found')).toBeInTheDocument()
  })
})
```

If your app uses a data router (`createBrowserRouter` with `RouterProvider`), use the memory version of it in tests:

```jsx
import { createMemoryRouter, RouterProvider } from 'react-router'

const router = createMemoryRouter(
  [{ path: '/products/:id', element: <ProductDetail /> }],
  { initialEntries: ['/products/p2'] },
)
render(<RouterProvider router={router} />)
```

**What to notice:**
- `getByRole('link', { name })` plus `toHaveAttribute('href', ...)` checks that links point to the right place without leaving the page.
- Landing directly on `/products/p1` tests that `useParams` reads the URL. That is a different path from clicking a link.
- Test the unhappy routes (unknown product, unknown URL) too. Many real bugs hide there.
- Do not mock `useParams` or `Link`. A real memory router is simple and gives a more honest test.

**Why it matters / follow-up:** "How do you check the current URL?" Render a small helper that shows `useLocation().pathname`, or assert on what the page shows (preferred).
**Learn more:** [React Router](../../../03-intermediate/03-react-router.md)

### R7-TS-010 (Hard) Test the accessibility behaviour of a modal
**Answer:** test what keyboard and screen reader users depend on: the `dialog` role with an accessible name, focus moving into the dialog, Escape closing it, and focus returning to the opener. `toHaveFocus()` checks `document.activeElement`. `user.keyboard('{Escape}')` sends the key to whatever is focused, which is why the "focus moves in" test matters: without it Escape would not reach the dialog.

Save as `SettingsPage.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import SettingsPage from './SettingsPage.jsx'

async function openDialog(user) {
  await user.click(screen.getByRole('button', { name: 'Open settings' }))
  return screen.getByRole('dialog', { name: 'Settings' })
}

describe('Modal in SettingsPage', () => {
  it('is closed at first', () => {
    render(<SettingsPage />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens a dialog that is named by its title and marked modal', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    const dialog = await openDialog(user)

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('Choose your options.')).toBeInTheDocument()
  })

  it('moves focus into the dialog when it opens', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    const dialog = await openDialog(user)

    expect(dialog).toHaveFocus()
  })

  it('closes on Escape and gives focus back to the button that opened it', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)
    await openDialog(user)

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open settings' })).toHaveFocus()
  })

  it('closes with the Close button and restores focus', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)
    await openDialog(user)

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open settings' })).toHaveFocus()
  })

  it('does not close on other keys', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)
    await openDialog(user)

    await user.keyboard('a')

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  })
})
```

**What to notice:**
- `getByRole('dialog', { name: 'Settings' })` works because `aria-labelledby` points at the heading (the `id` comes from `useId`).
- The test of "focus goes back" is the one people forget. Removing the effect's cleanup makes it fail.
- The negative test ("does not close on other keys") guards against a handler that closes on every key.
- jsdom does not do layout, so these tests cannot judge colours, overlap or real visibility. Automated checkers such as axe catch many structure problems in jsdom, but colour contrast needs a real browser.

**What this modal still lacks:** a focus trap (Tab and Shift+Tab should stay inside while it is open); making the rest of the page unreachable and hidden from screen readers while it is open (for example the `inert` attribute on the page behind it); locking page scroll; closing on a click on the backdrop; and usually rendering it in a portal. `aria-modal="true"` tells assistive technology the background is not available, but the browser does not trap focus for you. Each of those behaviours deserves its own test once you build it.

**Why it matters / follow-up:** "Would you use the native `<dialog>` element?" It gives you Escape handling and focus management from the browser, which removes much of this code. Check how well your test environment supports it before you rely on it in unit tests.
**Learn more:** [Accessibility](../../../04-advanced/09-accessibility.md), [Error boundaries, portals and friends](../../../03-intermediate/05-error-boundaries-portals-and-friends.md)
