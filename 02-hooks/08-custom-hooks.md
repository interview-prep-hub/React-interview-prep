# Custom Hooks

> **Level:** Intermediate   **Time:** about 65 minutes   **Read first:** [Hooks overview and rules](01-hooks-overview-and-rules.md), [useEffect](03-useeffect.md)

## What you will learn
- Explain what a custom hook is, why its name starts with `use`, and why two components that call the same hook never share state.
- Decide when to extract logic into a hook, and when to leave it where it is.
- Build fourteen hooks from scratch and explain every line: `useToggle`, `useCounter`, `useLocalStorage`, `useDebounce`, `useDebouncedCallback`, `useFetch`, `usePrevious`, `useOnClickOutside`, `useMediaQuery`, `useWindowSize`, `useInterval`, `useEventListener`, `useOnlineStatus` and `useAsync`.
- Design a hook that is pleasant to use: naming, return shape, stable functions, cleanup and options.
- Test a hook with `renderHook` and `act`, and know when to test through a component instead.
- Compare custom hooks with HOCs and render props, and decide when a hook library is worth installing.

## 1. What a custom hook is

Sooner or later two components need the same behaviour. Here an accordion and a notice both keep an "open or closed" flag, and both write the same lines to flip it:

```jsx
import { useState } from 'react'

function Accordion({ title, children }) {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen((value) => !value)

  return (
    <section>
      <button onClick={toggle} aria-expanded={open}>{title}</button>
      {open && <div>{children}</div>}
    </section>
  )
}

function Notice() {
  const [visible, setVisible] = useState(true)
  const toggle = () => setVisible((value) => !value)

  if (!visible) return <button onClick={toggle}>Show notice</button>
  return (
    <p>
      New version available. <button onClick={toggle}>Dismiss</button>
    </p>
  )
}
```

The repeated part is small today. It grows: an initial value, a way to set the flag directly, a function that keeps its identity between renders. Copy and paste then starts to drift. The fix is to move the repeated lines into one function and give it a name. That function is a **custom hook**.

```jsx
// useToggle.js
import { useCallback, useState } from 'react'

export function useToggle(initial = false) {
  const [on, setOn] = useState(initial)
  const toggle = useCallback(() => setOn((value) => !value), [])
  return [on, toggle, setOn]
}
```

```jsx
// Accordion.jsx and Notice.jsx now read like a sentence
import { useToggle } from './useToggle.js'

function Accordion({ title, children }) {
  const [open, toggle] = useToggle(false)

  return (
    <section>
      <button onClick={toggle} aria-expanded={open}>{title}</button>
      {open && <div>{children}</div>}
    </section>
  )
}

function Notice() {
  const [visible, toggle] = useToggle(true)

  if (!visible) return <button onClick={toggle}>Show notice</button>
  return (
    <p>
      New version available. <button onClick={toggle}>Dismiss</button>
    </p>
  )
}
```

**What happens, step by step:**
1. `Accordion` renders. In its body it calls `useToggle(false)`. This is an ordinary function call.
2. Inside, `useState(false)` runs. React attaches that state to the component that is rendering right now, which is `Accordion`. The hook itself owns nothing.
3. `useToggle` returns an array: the current flag, a function that flips it, and the raw setter.
4. `Accordion` takes what it needs. It ignores the third item, and that is fine.
5. The user clicks the button. `toggle` calls `setOn((value) => !value)`. React re-renders `Accordion`, which calls `useToggle` again as part of its own render. The hook is not a separate thing that re-renders. It is just code that runs inside the component's render.
6. `Notice` does the same, on its own, with its own state.

Here is the whole definition. Learn it word for word, because interviewers ask it first:

> A **custom hook** is a JavaScript function whose name starts with `use` and that calls other hooks (built-in ones like `useState`, or other custom hooks).

That is all. There is no `createHook`, no registration, no base class. A custom hook is a normal function that is allowed to use React features, because it runs while a component renders.

Three rules keep it working. They are the Rules of Hooks from [the first lesson of this folder](01-hooks-overview-and-rules.md), applied to your own functions:
- The name starts with `use` followed by a capital letter: `useToggle`, `useOnlineStatus`.
- Inside, every hook is called at the top level, in the same order on every render. No hooks in `if`, loops, or after an early `return`.
- You call a custom hook only from a function component or from another custom hook. Never from an event handler or a plain function.

**Common mistake:** a name that does not start with `use`.

```jsx
// WRONG: the linter cannot tell this function is a hook
function counter() {
  const [n, setN] = useState(0)
  return [n, setN]
}

// RIGHT
function useCounter() {
  const [n, setN] = useState(0)
  return [n, setN]
}
```

The ESLint plugin `eslint-plugin-react-hooks` reports the first version as an error: `React Hook "useState" is called in function "counter" that is neither a React function component nor a custom React Hook function.` The `use` prefix is the signal that tells people and tools "the Rules of Hooks apply here".

## 2. Logic is shared, state is not

This is the most important idea in the lesson, and the most common trap in interviews. Say it out loud:

> A custom hook shares **logic**, not **state**. Every call to the hook gets its own fresh state.

A recipe is a good picture. The recipe is shared by every cook. Each cook still makes their own meal. The hook is the recipe. The component that calls it is the cook, and the state is the meal.

Here is the next hook, `useCounter`. It has a few options, so it returns an object.

```jsx
// useCounter.js
import { useCallback, useState } from 'react'

export function useCounter(initialValue = 0, { min = -Infinity, max = Infinity, step = 1 } = {}) {
  const [count, setCount] = useState(initialValue)

  const increment = useCallback(() => setCount((c) => Math.min(max, c + step)), [max, step])
  const decrement = useCallback(() => setCount((c) => Math.max(min, c - step)), [min, step])
  const set = useCallback((n) => setCount(Math.min(max, Math.max(min, n))), [min, max])
  const reset = useCallback(() => setCount(initialValue), [initialValue])

  return { count, increment, decrement, set, reset }
}
```

Read it slowly:
- `{ min = -Infinity, max = Infinity, step = 1 } = {}` is an **options object** with defaults. The final `= {}` means `useCounter(5)` works with no second argument.
- The updater form `setCount((c) => ...)` reads the newest count without needing `count` in the dependency list. That is what lets each function keep the same identity between renders (more on that in section 13).
- `Math.min` and `Math.max` keep the number between `min` and `max`.

Now two components that use it:

```jsx
function CounterA() {
  const { count, increment } = useCounter()
  return <button onClick={increment}>A: {count}</button>
}

function CounterB() {
  const { count, increment } = useCounter()
  return <button onClick={increment}>B: {count}</button>
}

function App() {
  return (
    <>
      <CounterA />
      <CounterB />
    </>
  )
}
```

The user clicks the A button twice. Then the screen shows (checked by running it with React 19.3.1):

```text
A: 2
B: 0
```

**What happens, step by step:**
1. `CounterA` calls `useCounter()`. That runs `useState(0)` inside `CounterA`. React stores the number in `CounterA`'s own slot.
2. `CounterB` calls `useCounter()`. That runs `useState(0)` again, now inside `CounterB`. It gets a different slot.
3. Two clicks on A change A's slot from 0 to 1 to 2. Only `CounterA` re-renders.
4. B's slot never changed, so B still shows 0.

It is the same even inside one component. If a component calls `useCounter()` twice, it gets two counters, and clicking one leaves the other alone (checked: after two clicks on the first, the screen showed `a 2` and `b 0`). Under the hood, React remembers hooks by the order they are called inside each component. The custom hook has no memory of its own. See How React stores hooks (planned) if you want the details.

**What if you really want to share state?** Move the state to a place that both components can reach:
- Lift the state up to the nearest common parent and pass it down (see [Thinking in React](../01-basics/08-thinking-in-react.md)).
- Put it in Context ([useContext](05-usecontext.md)).
- Put it in an external store or a server-state cache ([State management](../03-intermediate/06-state-management.md)).

A hook can then **read** that shared place. Every component sees the same data, because the data lives in the context, not in the hook.

**Common mistake:** expecting a hook to share its state.

```jsx
// WRONG idea: "useCart keeps the cart, so Header and CartPage see the same cart"
function useCart() {
  const [items, setItems] = useState([])
  return { items, setItems }
}
// Header and CartPage each call useCart(). Each gets its OWN empty array.
```

```jsx
// RIGHT: the state lives in a provider, and the hook only reads it
import { createContext, useContext, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  return <CartContext value={{ items, setItems }}>{children}</CartContext>
}

export function useCart() {
  return useContext(CartContext) // reads shared state, owns none
}
```

Why: the state belongs to whoever calls `useState`. Here that is `CartProvider`, which exists once. (If the provider re-renders often, memoize the `value` object. See [useContext](05-usecontext.md).)

## 3. When to extract a hook (and when not to)

Extracting is cheap, so people overdo it. Use these checks.

**Extract a hook when:**
1. The same logic appears in two or three places. (Wait for the second or third use. The first use teaches you the right shape.)
2. A group of lines belongs together, such as a `useState` plus an effect that subscribes and cleans up. Keep the subscribe code and the unsubscribe code side by side in one place.
3. A good name would make the component easier to read. `const online = useOnlineStatus()` beats twelve lines of listeners.
4. You want to test the logic without drawing any UI.
5. You want to be able to swap the inside later (for example a hand-written fetch for TanStack Query) without touching any component. Callers depend only on the name and the return shape.

**Do not extract when:**
1. The code is used once and is trivial. A hook with a name nobody needs is noise.
2. The hook only renames a built-in, for example `const useMyState = useState`.
3. The name says *when* it runs instead of *what* it does: `useMount(fn)`, `useUpdate(fn)`. The React docs advise against these "lifecycle" hooks. They hide the dependency array from the linter and push you back to thinking in lifecycles. Name hooks after what they give you, such as `useOnlineStatus`.
4. The code returns JSX. That is a component, not a hook (section 15).
5. You are guessing at a future need. Write the plain code first.

A one-line rule: **hooks are for logic** (state, effects, subscriptions, calculations), **components are for UI** (markup).

Here is the before and after for a component that needs to know if the browser is online:

```jsx
// Before (works in the browser): the reader must decode the effect
function SaveButton() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return <button disabled={!online}>Save</button>
}

// After: the component says WHAT it needs, the hook says HOW
function SaveButton() {
  const online = useOnlineStatus()
  return <button disabled={!online}>Save</button>
}
```

The second version is also easier to improve. In section 12 you will rewrite the inside of `useOnlineStatus` to be safer, and `SaveButton` will not change by one character.

## 4. useLocalStorage: lazy init, JSON, server safety, and other tabs

`localStorage` is a small key-value store in the browser. It stores **strings only**, and it survives page reloads. We want a hook that works like `useState` but remembers its value.

```jsx
// useLocalStorage.js
import { useEffect, useState } from 'react'

function readStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback // on the server there is no localStorage
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback // storage blocked, or the stored text is not valid JSON
  }
}

export function useLocalStorage(key, initialValue) {
  // Lazy initializer: the function runs only on the first render.
  const [value, setValue] = useState(() => readStorage(key, initialValue))

  // Save after every change.
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage full or blocked: the hook keeps working in memory
    }
  }, [key, value])

  // Follow changes made by OTHER tabs (the "storage" event never fires in the tab that wrote).
  useEffect(() => {
    function handleStorage(event) {
      if (event.storageArea !== window.localStorage) return
      if (event.key !== key || event.newValue === null) return // other key, or a removal
      try {
        setValue(JSON.parse(event.newValue))
      } catch {
        // ignore text that is not valid JSON
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [key])

  return [value, setValue]
}
```

Using it:

```jsx
function ThemeSwitch() {
  const [theme, setTheme] = useLocalStorage('theme', 'light')

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Theme: {theme}
    </button>
  )
}
```

**What happens, step by step:**
1. First visit. The lazy initializer runs `readStorage('theme', 'light')`. Nothing is stored, so it returns `'light'`.
2. The save effect runs after the render and writes the text `"light"` (with quotes, because it is JSON) to storage.
3. The user clicks. `setTheme('dark')` is the ordinary `useState` setter, so React re-renders with `'dark'`. The save effect runs again and writes `"dark"`.
4. The user reloads the page. The lazy initializer reads `"dark"` and `JSON.parse` turns it back into the string `dark`. The button says `Theme: dark`. (Checked by unmounting and mounting the component again: the new copy showed `Theme: dark`.)

Five details make this hook solid. Each one is an interview talking point.

**1. Lazy initialization.** `useState(() => readStorage(...))` passes a function. React calls it only on the first render. Reading storage is slow-ish, so you do not want to do it on every render. We counted storage reads over three renders: 1 with the arrow function, 3 without it.

**2. JSON.** Storage holds strings. `JSON.stringify` turns numbers, booleans, arrays and plain objects into text. `JSON.parse` turns them back. This does not work for functions, `Map`, `Set`, or `undefined`, and a `Date` comes back as a string.

**3. try/catch.** Three things can throw: `getItem` (storage blocked in some privacy modes), `JSON.parse` (broken text, maybe written by an older version of your app) and `setItem` (storage full). A hook that crashes the whole page because of a bad string is a bad hook, so each read falls back to the initial value.

**4. Server safety.** A server has no `window`, so `window.localStorage` would throw a `ReferenceError` when a framework renders your component on the server. The check `typeof window === 'undefined'` is safe because `typeof` never throws for a missing variable. We rendered a component with the hook on a fake server (no `window`) and got the fallback value. One honest caveat: in a server-rendered app, the server HTML shows the fallback while the first browser render may read a different stored value. That mismatch can cause a hydration warning. Frameworks have their own answers, and `useSyncExternalStore` (section 12) is a standard tool for it. See [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md).

**5. The `storage` event.** When one tab changes `localStorage`, the browser fires a `storage` event in the **other** tabs of the same site. It does not fire in the tab that made the change. The second effect listens for it and copies the new value into state. In a test we dispatched a `storage` event for our key with the text `7` and the hook returned `7`. An event for a different key changed nothing.

Because the hook returns the real `setValue` from `useState`, the updater form works for free: `setCount((c) => c + 1)` (checked).

Known limits, on purpose, to keep the code short:
- It also writes the initial value on mount. That is harmless.
- The `key` should stay the same for the life of the component. If it changes, the hook does not re-read the new key. Give the component a `key` prop to remount it, or build the hook on `useSyncExternalStore`.
- Two components in the same tab that use the same storage key do not update each other (the `storage` event does not fire in the same tab).
- A key removed in another tab is ignored.

**Common mistake:**

```js
// WRONG: readStorage runs on EVERY render, although React only uses the first result
const [value, setValue] = useState(readStorage(key, initialValue))

// RIGHT: pass a function, so it runs once
const [value, setValue] = useState(() => readStorage(key, initialValue))
```

Why: `readStorage(key, initialValue)` is evaluated as an argument before React is even called. Wrapping it in an arrow function hands React the *recipe*, and React uses it only when it needs the first value.

Also remember: `localStorage` can be read by any script on your page, so never keep passwords or login tokens in it (see [Security](../04-advanced/10-security-and-i18n.md)). Related exercise: [Exercise 11, a task list that saves itself](../practice-app/exercises/react/11-todo-advanced/README.md).

## 5. useDebounce: wait until the user stops

**Debounce** means: do not react to every change. Wait until changes stop for a short time, then react once. A search box is the classic case. Typing "react" changes the text five times, but you want one search, not five. (**Throttle** is the cousin: act at most once per time window, even while changes continue. Debounce suits "settle, then act". Throttle suits scroll and drag.)

`useDebounce` debounces a **value**. It returns a copy of the value that updates only after the original has been quiet for `delay` milliseconds.

```jsx
// useDebounce.js
import { useEffect, useState } from 'react'

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id) // a newer value cancels the older timer
  }, [value, delay])

  return debounced
}
```

Using it in a search box:

```jsx
import { useEffect, useState } from 'react'
import { useDebounce } from './useDebounce.js'

function SearchBox({ onSearch }) {
  const [text, setText] = useState('')
  const debounced = useDebounce(text, 300)

  useEffect(() => {
    if (debounced) onSearch(debounced)
  }, [debounced, onSearch])

  return <input aria-label="Search" value={text} onChange={(e) => setText(e.target.value)} />
}
```

**What happens, step by step:**
1. The first render returns the starting value at once. There is no delay on mount.
2. The user types `r`. `text` changes now, so the input feels instant. The `useDebounce` effect starts a 300 ms timer.
3. 100 ms later the user types `e`. `value` changed, so React runs the **cleanup** of the old effect first. `clearTimeout` cancels the first timer. A fresh 300 ms timer starts.
4. The user keeps typing "rea", "reac", "react". Every keystroke cancels the previous timer.
5. The user stops. 300 ms pass. The last timer fires, `setDebounced('react')` runs, and `debounced` finally changes.
6. The effect in `SearchBox` sees `debounced` change and calls `onSearch('react')` once.

We checked this with fake timers. Typing five letters, 100 ms apart, produced zero searches while typing and exactly one search, with `"react"`, after the pause. A value test gave the same shape: with the delay at 300, after the value changed twice, the debounced value was still the old one 299 ms after the last change and the new one at 300 ms. If `delay` itself changes, the effect restarts with the new delay (checked: changing to 100 made the next value arrive after 100 ms).

`useDebounce` is related to `useDeferredValue`, but not the same: debounce waits a fixed time, `useDeferredValue` lets React lower the priority of a render. See [Other hooks](09-other-hooks.md). To practice the plain JavaScript version, do [the debounce exercise](../practice-app/exercises/js/01-debounce/README.md).

**Common mistake:** no cleanup.

```js
// WRONG: every timer still fires, so nothing is debounced. The value just arrives late.
useEffect(() => {
  setTimeout(() => setDebounced(value), delay)
}, [value, delay])

// RIGHT: return a cleanup that cancels the previous timer
useEffect(() => {
  const id = setTimeout(() => setDebounced(value), delay)
  return () => clearTimeout(id)
}, [value, delay])
```

Why: the cleanup is what makes the *old* timer die when a *new* value arrives. Without it, all five timers run.

## 6. The latest-callback pattern: useInterval

`setInterval(fn, ms)` calls `fn` every `ms` milliseconds. Putting it in a component sounds easy:

```jsx
function Counter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 1000)
    return () => clearInterval(id)
  }, []) // the linter warns: 'count' is missing

  return <p>count: {count}</p>
}
```

Run it and watch. After five seconds the screen still says `count: 1`. We ran this with fake timers to be sure.

**Why:** the effect ran once, on the first render, when `count` was `0`. The arrow function inside `setInterval` **closed over** that `0`. This is a **stale closure**: a function that remembers an old value. Every tick computes `0 + 1` and sets `1`. React sees the same value `1` again and has nothing new to show.

There are three tempting fixes, and only the last is general:
1. Add `count` to the dependency list. This works, but the effect now restarts after every render. The interval is cleared and recreated each time. If anything re-renders the component more often than the delay, the timer **never fires**. We tested this: a component with a 1000 ms interval and an unrelated state change every 400 ms stayed at `count: 0` for five seconds.
2. Use the updater form `setCount((c) => c + 1)`. That fixes this one case, but the callback often needs other props or state, not only the count.
3. Keep the **newest callback in a ref**, and let the timer call whatever is in the ref. The timer is created once per delay. The callback it runs is always current.

```jsx
// useInterval.js
import { useEffect, useRef } from 'react'

export function useInterval(callback, delay) {
  const savedCallback = useRef(callback)

  // Runs after every render: keep the newest callback in the ref.
  useEffect(() => {
    savedCallback.current = callback
  })

  // Runs again only when delay changes. A delay of null pauses the timer.
  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
```

```jsx
function Counter() {
  const [count, setCount] = useState(0)
  useInterval(() => setCount(count + 1), 1000)
  return <p>count: {count}</p>
}
```

**What happens, step by step:**
1. First render. `useRef(callback)` stores the first callback. The first effect runs and stores it again. The second effect starts one interval, because `delay` is `1000`.
2. After one second the interval calls `savedCallback.current()`. That callback closed over `count = 0`, so it sets `1`.
3. React re-renders. The component now passes a **new** callback that closed over `count = 1`. The first effect (it has no dependency array, so it runs after every render) copies the new callback into the ref. The second effect does **not** run again, because `delay` did not change. The same interval keeps ticking.
4. The next tick calls the new callback, which sets `2`. After five seconds the screen says `count: 5` (checked).

Details:
- A **ref** is a box that survives re-renders. Changing `ref.current` does **not** cause a re-render, which is what we want here ([useRef](04-useref.md)).
- `delay === null` is a common convention for "paused". Calling `useInterval(fn, running ? 1000 : null)` gives you a pause button for free. We checked: with a 1 s delay the callback ran 3 times in 3 s, passing `null` stopped it, and after unmount it never ran again.
- Changing `delay` restarts the interval with the new speed.

**React 19.2 and later: `useEffectEvent`.** React now has a built-in tool for exactly this problem. An **Effect Event** is a function that always sees the latest props and state, but is not a dependency of the effect.

```jsx
import { useEffect, useEffectEvent } from 'react'

export function useInterval(callback, delay) {
  const onTick = useEffectEvent(callback)

  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => onTick(), delay)
    return () => clearInterval(id)
  }, [delay])
}
```

This version also reached `count: 5` after five seconds (checked). The rules: call the Effect Event only from inside an effect (including a timer or listener created there), never pass it to other components, and never put it in a dependency array. See [Other hooks](09-other-hooks.md). The ref version still matters: you will meet it in older code, in libraries that support React 18, and in interviews.

**Common mistake:** forgetting to clean up the timer.

```js
// WRONG: the timer keeps running after the component is gone
useEffect(() => {
  setInterval(() => savedCallback.current(), delay)
}, [delay])

// RIGHT
useEffect(() => {
  const id = setInterval(() => savedCallback.current(), delay)
  return () => clearInterval(id)
}, [delay])
```

Why: without `clearInterval`, every effect run adds one more timer. In development, StrictMode runs effects twice on purpose, so a missing cleanup shows up as two timers straight away.

## 7. useDebouncedCallback: debounce a function

Sometimes you do not have a value to debounce. You have an action: save a draft, send an analytics event, run a search. `useDebouncedCallback` returns a function that waits until calls stop, then runs the real function once with the **last** arguments.

```jsx
// useDebouncedCallback.js
import { useEffect, useMemo, useRef } from 'react'

export function useDebouncedCallback(callback, delay = 300) {
  const callbackRef = useRef(callback)
  const timerRef = useRef(null)

  // Always remember the newest callback, without restarting any timer.
  useEffect(() => {
    callbackRef.current = callback
  })

  // Cancel a pending call when the component unmounts.
  useEffect(() => () => clearTimeout(timerRef.current), [])

  return useMemo(() => {
    const debounced = (...args) => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => callbackRef.current(...args), delay)
    }
    debounced.cancel = () => clearTimeout(timerRef.current)
    return debounced
  }, [delay])
}
```

```jsx
function Editor() {
  const [text, setText] = useState('')
  const saveDraft = useDebouncedCallback((value) => {
    localStorage.setItem('draft', value)
  }, 800)

  return (
    <textarea
      aria-label="Draft"
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        saveDraft(e.target.value)
      }}
    />
  )
}
```

**What happens, step by step:**
1. Every keystroke sets state (so the text shows at once) and calls `saveDraft(value)`.
2. `saveDraft` clears the previous timer, then starts a new 800 ms timer. The timer id lives in `timerRef`, a ref, because changing it must not cause a re-render.
3. When 800 ms pass with no typing, the timer fires and calls `callbackRef.current(value)`. The ref always holds the newest callback (the same trick as `useInterval`), so the callback never uses stale props.
4. `useMemo` builds the debounced function once per `delay`. Its identity stays the same across renders, so it is safe in dependency arrays.
5. On unmount the cleanup clears the timer, so a save does not run for a component that no longer exists. `saveDraft.cancel()` does the same on demand.

We checked it with fake timers. Calling it with `a`, `b`, `c` quickly made zero calls after 199 ms and one call, with `c`, at 200 ms. After `cancel()` nothing ran. After unmount nothing ran. If the callback changed before the timer fired, the **new** callback ran. The returned function kept its identity when only the callback changed, and got a new identity when `delay` changed.

**Which one should you use?** Use `useDebounce` when the debounced thing is a *value* that renders or drives an effect (the search text). Use `useDebouncedCallback` when you want to run an *action* and do not need an extra piece of state.

**Common mistake:** creating the debounced function during render.

```jsx
// WRONG: every render makes a brand-new debounced function with its own timer
function Editor() {
  const [text, setText] = useState('')
  const save = debounce(saveDraft, 800) // debounce() is a plain helper, not a hook
  // ...
}

// RIGHT: the hook keeps one timer for the life of the component
const save = useDebouncedCallback(saveDraft, 800)
```

Why: typing re-renders the component, which creates a new `save` with a new timer, and the old timers are never cancelled. We tested this: three keystrokes led to `saveDraft` being called three times, so nothing was debounced.

## 8. Listening to events: useEventListener and useOnClickOutside

Adding and removing event listeners is the same dance every time: add in an effect, remove in the cleanup, and do not capture a stale handler. Put it in one hook.

```jsx
// useEventListener.js
import { useEffect, useRef } from 'react'

function toNode(target) {
  if (target === undefined) return window
  if (target && 'current' in target) return target.current // a ref object
  return target // window, document or an element
}

export function useEventListener(type, handler, { target, capture = false, passive = false } = {}) {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    const node = toNode(target)
    if (!node) return
    const listener = (event) => handlerRef.current(event)
    node.addEventListener(type, listener, { capture, passive })
    return () => node.removeEventListener(type, listener, { capture })
  }, [type, target, capture, passive])
}
```

```jsx
function SaveShortcut({ onSave }) {
  useEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      onSave()
    }
  })

  return <p>Press Ctrl+S to save</p>
}
```

**What happens, step by step:**
1. With no `target`, the hook listens on `window`. `window` is only touched inside an effect, and effects never run on the server, so this is server-safe.
2. The handler is stored in `handlerRef` after every render. The real listener calls `handlerRef.current(event)`, so it always uses the newest `onSave`, even though the listener itself was added only once.
3. Because the handler is not a dependency of the effect, an inline arrow function does **not** cause a remove and re-add of the listener on every render. The effect re-runs only when `type`, `target`, `capture` or `passive` change.
4. The options come in an **options object** with defaults. The effect depends on the primitive values inside it, not on the object (an inline `{}` is a new object every render, so depending on it would re-run the effect every time).
5. The cleanup removes the same listener. After unmount the handler never runs again.

We checked all of this: a window `keydown` handler that read state saw the **newest** state (it saw `2` after two clicks), a `ref` target received only clicks inside its element, a `document` target worked, and after unmount an event produced no extra calls.

`target` can be `window` (the default), `document`, an element, or a ref (`{ target: ref }`).

### useOnClickOutside

A dropdown, modal or popover must close when the user clicks somewhere else. That is "listen on the whole document, and ignore clicks inside my element". It builds on the same pattern:

```jsx
// useOnClickOutside.js
import { useEffect, useRef } from 'react'

export function useOnClickOutside(ref, handler) {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    function onPointerDown(event) {
      const element = ref.current
      if (!element || element.contains(event.target)) return // inside click, or nothing mounted
      handlerRef.current(event)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [ref])
}
```

```jsx
import { useRef, useState } from 'react'
import { useOnClickOutside } from './useOnClickOutside.js'

function Dropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOnClickOutside(ref, () => setOpen(false))

  return (
    <div>
      <div ref={ref}>
        <button onClick={() => setOpen((o) => !o)}>Menu</button>
        {open && (
          <ul>
            <li><button>Profile</button></li>
          </ul>
        )}
      </div>
      <p>Outside text</p>
    </div>
  )
}
```

**What happens, step by step:**
1. The ref is attached to a `<div>` that wraps **both** the menu button and the list.
2. The user clicks "Menu". The press happens inside `ref.current`, so `contains(event.target)` is `true` and the outside handler does nothing. The button's own `onClick` opens the list.
3. The user clicks "Profile". It is a descendant of the ref element, so it counts as inside. The list stays open.
4. The user clicks "Outside text". `contains` is `false`, so the hook calls the handler, which runs `setOpen(false)`. The list closes.

We drove this with real clicks in a test and saw exactly that: open, still open after an inside click, closed after an outside click. After unmount, a click anywhere called the handler zero more times. After a re-render with a new handler, the new handler ran.

Why `pointerdown` and not `mousedown` plus `touchstart`? A pointer event covers mouse, touch and pen with one listener. Using both `mousedown` and `touchstart` can fire twice on a touch screen, because browsers also send a pretend mouse event after a touch.

**Common mistake:** putting the ref only on the panel.

```jsx
// WRONG: the button is OUTSIDE the ref
<button onClick={() => setOpen((o) => !o)}>Menu</button>
{open && <ul ref={panelRef}>...</ul>}
```

What happens when the list is open and you click the button to close it: the press is "outside" the panel, so the hook closes the list. Then the button's `onClick` runs and toggles it back to **open**. In our test the list was still open after clicking the button to close it. Fix: wrap the trigger and the panel in one element and attach the ref to that wrapper, as in the example above. Practice this in [Dropdown with click outside](../practice-app/exercises/react/21-dropdown-click-outside/README.md).

## 9. useFetch: loading, error, data, abort, and no races

**Read this first:** in a real app, use a data library such as TanStack Query (see the end of this section). A hand-written `useFetch` is still worth knowing, because interviewers ask for it, and because writing it teaches you the traps of fetching in an effect.

```jsx
// useFetch.js
import { useEffect, useState } from 'react'

export function useFetch(url) {
  // The result remembers WHICH url it belongs to.
  const [result, setResult] = useState({ url: null, data: null, error: null })

  useEffect(() => {
    if (!url) return
    const controller = new AbortController()

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ url, data, error: null })
      })
      .catch((error) => {
        if (controller.signal.aborted) return // we cancelled it ourselves: not an error
        setResult({ url, data: null, error })
      })

    return () => controller.abort()
  }, [url])

  // A result only counts if it belongs to the current url.
  const isCurrent = result.url === url
  return {
    data: isCurrent ? result.data : null,
    error: isCurrent ? result.error : null,
    loading: Boolean(url) && !isCurrent,
  }
}
```

```jsx
function UserCard({ id }) {
  const { data, loading, error } = useFetch(`/api/users/${id}`)

  if (loading) return <p>Loading...</p>
  if (error) return <p role="alert">Could not load: {error.message}</p>
  return <h2>{data.name}</h2>
}
```

**What happens, step by step:**
1. First render. `result.url` is `null`, which is not equal to the current URL, so `loading` is `true` and `data` is `null`. The component shows "Loading...".
2. The effect runs. It creates an `AbortController` and starts the request, passing `controller.signal`.
3. The server answers. `response.ok` is true, `response.json()` parses the body, and `setResult({ url, data, error: null })` stores the answer **together with the URL it belongs to**.
4. Next render: `result.url === url`, so `isCurrent` is `true`, `loading` becomes `false`, and `data` is the user.
5. The `id` prop changes. `url` changes, so React runs the cleanup (`controller.abort()` cancels the old request) and starts a new request. In the very same render, `result.url` no longer equals `url`, so `loading` is `true` and `data` is `null` straight away. There is no flash of the old user.

Why each piece is there:
- **`response.ok`.** `fetch` only rejects on network failure. A `404` or `500` still *resolves*. Without the check, the error page body would be treated as good data. We tested a 500: the hook gave `error.message` of `HTTP 500`.
- **`AbortController`.** It cancels the request when the URL changes or the component unmounts. Checked: after the URL changed, the first request's signal was aborted; after unmount, the signal was aborted.
- **`signal.aborted` checks.** An aborted request makes `fetch` reject with an `AbortError`, which is not a real error, so we ignore it. We also check `signal.aborted` before saving a successful answer, because an answer can already be on its way when the abort happens.
- **Race condition safety.** A *race* is when two requests are in flight and the older one finishes last. Without protection, the old answer overwrites the new one and the screen shows data for a URL that is no longer selected. We tested the worst case: the URL changed from `/a` to `/b`, then the answer for `/b` arrived, then the late answer for `/a` arrived. The hook kept `B` (also when the fake `fetch` ignored the abort signal entirely).
- **`loading` is derived, not stored.** There is no `setLoading(true)` inside the effect. The hook compares the stored URL with the current URL during render. Fewer states means fewer ways to get out of sync.
- **A falsy `url` means "do nothing".** `useFetch(null)` makes no request and returns `loading: false` (checked: zero calls to `fetch`). That helps when you wait for user input.
- **StrictMode.** In development React runs the effect, cleans it up, and runs it again. We checked: `fetch` was called twice, the first request was aborted, the second one answered, and the hook ended with the data and `loading: false`.

**Why TanStack Query is better in real apps.** This hook is honest and small, but it is missing most of what real apps need:
- **A cache and de-duplication.** Three components that call `useFetch('/api/user')` make three requests (checked). A query library makes one and shares the answer.
- **Stale data refresh.** Show cached data at once, then refresh in the background; refetch when the window regains focus or the network comes back.
- **Retries with backoff,** pagination, infinite lists, and mutations that update or invalidate cached data.
- **Devtools,** server rendering support, and years of bug fixes for edge cases you will not think of.

The same screen with TanStack Query 5:

```jsx
import { useQuery } from '@tanstack/react-query'

function UserCard({ id }) {
  const { data, isPending, error } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${id}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    },
  })

  if (isPending) return <p>Loading...</p>
  if (error) return <p role="alert">Could not load: {error.message}</p>
  return <h2>{data.name}</h2>
}
```

(The app also needs a `QueryClientProvider` near the root.) A good habit: wrap it in your own hook, `useUser(id)`. Components call `useUser(id)`, and you can start with the hand-written version and move to TanStack Query later without touching a single component. That is the "swap the inside" benefit from section 3. More in [Data fetching](../03-intermediate/02-data-fetching.md). To build a tiny query library yourself, try [Mini query hook](../practice-app/exercises/react/27-mini-query-hook/README.md).

**Common mistake:** an `async` function as the effect callback.

```js
// WRONG: an async function returns a Promise, and React treats the return value as the cleanup
useEffect(async () => {
  const response = await fetch(url)
  setData(await response.json())
}, [url])

// RIGHT: keep the effect callback synchronous, and use .then or an inner async function
useEffect(() => {
  let ignore = false
  async function load() {
    const response = await fetch(url)
    const json = await response.json()
    if (!ignore) setData(json)
  }
  load()
  return () => {
    ignore = true
  }
}, [url])
```

Why: in development React warns that an Effect must not return anything besides a function, and when the component unmounts it fails with `destroy is not a function`, because it tries to call the Promise as the cleanup function. The `ignore` flag in the fixed version is the older cousin of `AbortController`: it does not cancel the request, it only throws the stale answer away.

## 10. useAsync: run an async function on demand

`useFetch` runs by itself whenever the URL changes. It keeps the screen in sync with a URL. But many tasks start from a **user action**: click Save, submit a form, press Delete. For those you want a hook that runs only when you call it, and tracks `idle`, `pending`, `success` and `error` for you.

```jsx
// useAsync.js
import { useCallback, useEffect, useRef, useState } from 'react'

const IDLE = { status: 'idle', data: null, error: null }

export function useAsync(asyncFunction) {
  const [state, setState] = useState(IDLE)
  const functionRef = useRef(asyncFunction)
  const lastCall = useRef(0)

  useEffect(() => {
    functionRef.current = asyncFunction
  })

  // Invalidate any call that is still running when the component unmounts.
  useEffect(
    () => () => {
      lastCall.current += 1
    },
    [],
  )

  const run = useCallback(async (...args) => {
    const callId = ++lastCall.current
    setState({ status: 'pending', data: null, error: null })
    try {
      const data = await functionRef.current(...args)
      if (callId === lastCall.current) setState({ status: 'success', data, error: null })
    } catch (error) {
      if (callId === lastCall.current) setState({ status: 'error', data: null, error })
    }
  }, [])

  const reset = useCallback(() => {
    lastCall.current += 1 // forget any call in flight
    setState(IDLE)
  }, [])

  return { ...state, isPending: state.status === 'pending', run, reset }
}
```

```jsx
async function saveProfile(name) {
  const response = await fetch('/api/profile', { method: 'POST', body: JSON.stringify({ name }) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

function SaveButton({ name }) {
  const { run, status, error } = useAsync(saveProfile)

  return (
    <div>
      <button onClick={() => run(name)} disabled={status === 'pending'}>
        {status === 'pending' ? 'Saving...' : 'Save'}
      </button>
      {status === 'error' && <p role="alert">{error.message}</p>}
      {status === 'success' && <p>Saved</p>}
    </div>
  )
}
```

**What happens, step by step:**
1. First render: `status` is `idle`. The button says "Save".
2. The user clicks. `run('Ada')` bumps `lastCall` to `1`, remembers `callId = 1`, and sets the status to `pending`. The button is disabled and says "Saving...".
3. `saveProfile('Ada')` runs through `functionRef.current`. When it resolves, we compare `callId` with `lastCall.current`. They match, so the status becomes `success`.
4. If the request fails with a 500, the `catch` block sets `error` and the page shows the alert instead.

We tested both paths with a fake `fetch`: the button showed "Saving..." and was disabled while the request ran, then the page showed "Saved". A failing request showed `HTTP 500` in the alert.

Design choices worth explaining out loud:
- **The call counter handles overlapping calls.** If the user clicks twice and the first request finishes last, only the *latest* call's result is kept. Tested: the second answer won even though the first one arrived later.
- **`functionRef` keeps `run` stable.** The ref holds the newest function, so `run` has the same identity on every render even if you pass an inline arrow function (checked), and it always calls the newest function.
- **`run` never throws.** Errors go into state. That way `onClick={() => run(name)}` cannot produce an unhandled promise rejection.
- **The unmount effect** bumps the counter, so a late answer is ignored. React 19 no longer warns about state updates after unmount, but ignoring them is still cleaner.
- **The status names** match TanStack Query's `pending`, `success`, `error`, plus `idle`, which makes a later move easy. For real mutations, `useMutation` from TanStack Query does this and more.

**Common mistake:** a boolean `loading` plus a separate `error` plus a separate `data`.

```js
// WRONG: three states that can disagree (loading true AND error set?)
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
const [data, setData] = useState(null)

// RIGHT: one object, one status, changed together
const [state, setState] = useState({ status: 'idle', data: null, error: null })
```

Why: one state value is always consistent, because you replace the whole object in one update.

## 11. usePrevious: the value from before

Sometimes you need to compare "now" with "before": did the price go up or down? Did the user count change? `usePrevious` returns the value from the previous render. This is a very common interview question.

```jsx
// usePrevious.js
import { useEffect, useRef } from 'react'

export function usePrevious(value) {
  const ref = useRef(undefined)

  useEffect(() => {
    ref.current = value // runs after the render, so the line below still sees the old value
  })

  return ref.current
}
```

```jsx
function Counter() {
  const [count, setCount] = useState(0)
  const [other, setOther] = useState(0)
  const previous = usePrevious(count)

  return (
    <div>
      <p>now {count}, before {String(previous)}</p>
      <button onClick={() => setCount(count + 1)}>count</button>
      <button onClick={() => setOther(other + 1)}>other {other}</button>
    </div>
  )
}
```

**What happens, step by step:**
1. First render. The ref holds `undefined`, so the hook returns `undefined`. The screen shows `now 0, before undefined`. After the render, the effect stores `0` in the ref.
2. Click "count". The component renders with `count = 1`. The hook runs `return ref.current` **before** the effect of this render has run, so it returns `0`. The screen shows `now 1, before 0`. Then the effect stores `1`.
3. Click "count" again: `now 2, before 1`.
4. Now click the unrelated "other" button. The component re-renders with `count` still `2`. The ref holds `2` from the last render, so the screen shows `now 2, before 2`.

Step 4 is the gotcha. The hook returns the value from the **previous render**, not the previous *different* value. That is exactly the output we got when we ran this component:

```text
now 0, before undefined
now 1, before 0
now 2, before 1
now 2, before 2
```

If you want the previous value *that was different*, store a pair in state and update it during render:

```jsx
import { useState } from 'react'

export function usePreviousDistinct(value) {
  const [pair, setPair] = useState({ current: value, previous: undefined })
  if (!Object.is(pair.current, value)) {
    setPair({ current: value, previous: pair.current })
  }
  return pair.previous
}
```

Calling `setPair` during render is allowed for the **same** component when it is guarded by a condition. React throws away the current render output and renders again at once, before anything reaches the screen (see [useState in depth](02-usestate-in-depth.md)). Here is a comparison. The first render receives `1`, then the component re-renders with `1`, `2`, `2` and `3`:

```text
render number:        1          2          3          4          5
value passed in:      1          1          2          2          3
usePrevious:          undefined  1          1          2          2
usePreviousDistinct:  undefined  undefined  1          1          2
```

(Both columns were produced by running the two hooks.)

One more honest point: the classic version reads `ref.current` **during render**. The React docs say not to read or write refs while rendering, because render must be pure. The linter rule `react-hooks/refs` in `eslint-plugin-react-hooks` 7 reports it as `Cannot access refs during render`, and the React Compiler skips components that break the rule. The classic version is still the expected answer in an interview. Give it first, then mention this caveat and the state version. Often you do not need `usePrevious` at all: you can compare the old and new value inside the event handler that changes it.

## 12. Reading the outside world: useSyncExternalStore

Some data lives **outside React** and changes on its own: the window size, whether the network is up, a CSS media query, a third-party store. React cannot see these changes, so you must subscribe. The hook made for this is `useSyncExternalStore`:

```jsx
const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
```

- `subscribe(onChange)`: start listening to the outside source. Call `onChange` whenever it changes. Return a function that stops listening.
- `getSnapshot()`: read the current value **right now**. If nothing changed, it must return the same value as last time (React compares with `Object.is`).
- `getServerSnapshot()`: the value to use when rendering on the server and during hydration, where there is no browser to ask.

Why not `useState` plus `useEffect`? The effect version shows a default value first and corrects it in an effect right after, which can cause a flash of the wrong UI. It can also show two different values in one render pass when React renders in pieces. `useSyncExternalStore` reads the real value immediately and keeps the whole screen consistent. Full details are in [Other hooks](09-other-hooks.md).

### useMediaQuery

A **media query** like `(min-width: 768px)` is true or false depending on the screen. `window.matchMedia(query)` gives you an object with `.matches` and a `change` event.

```jsx
// useMediaQuery.js
import { useCallback, useSyncExternalStore } from 'react'

export function useMediaQuery(query) {
  // subscribe must keep the same identity while the query is the same.
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches, // browser: read the real answer
    () => false, // server and hydration: no screen to ask, so pick a default
  )
}
```

```jsx
function Layout() {
  const isWide = useMediaQuery('(min-width: 768px)')
  return isWide ? <Sidebar /> : <MobileMenu />
}
```

**What happens, step by step:**
1. `Layout` renders. React calls `getSnapshot` and gets `true` or `false` for the current screen. No flash, no default first.
2. React calls `subscribe`, which adds a `change` listener to the media query list.
3. The user rotates the phone. The browser fires `change`. Our listener is React's `onChange`.
4. React calls `getSnapshot` again. If the answer is different, `Layout` re-renders with the new value. If it is the same, nothing happens.
5. On unmount React calls the function that `subscribe` returned, which removes the listener.

We tested it with a small fake `matchMedia` (jsdom has none): the hook returned the starting value, followed a change, removed its listener on unmount (listener count went from 1 to 0), and resubscribed when the `query` argument changed. Over three renders with the same query, `subscribe` ran once. That is why `subscribe` is wrapped in `useCallback`: if `subscribe` gets a new identity on every render, React unsubscribes and subscribes again every time.

`false` as the server snapshot means "the query does not match" when rendering on a server, because a server has no screen to measure. Prefer CSS media queries for pure styling. Use this hook when JavaScript must decide *what to render*.

### useWindowSize

```jsx
// useWindowSize.js
import { useMemo, useSyncExternalStore } from 'react'

function subscribe(onChange) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

export function useWindowSize() {
  // Two primitive snapshots: numbers compare equal when nothing changed.
  const width = useSyncExternalStore(subscribe, () => window.innerWidth, () => 0)
  const height = useSyncExternalStore(subscribe, () => window.innerHeight, () => 0)
  return useMemo(() => ({ width, height }), [width, height])
}
```

`subscribe` is defined outside the hook, so it never changes identity. We call `useSyncExternalStore` twice with **numbers** because of the rule about `getSnapshot`: it must return the same value when nothing changed. Numbers do that. Objects do not.

We tested it: the hook returned `{ width: 1024, height: 768 }`, then after a resize to 500 it returned `{ width: 500, height: 768 }` with one extra render. A `resize` event where the size did not change caused **zero** re-renders. `resize` fires many times during a drag. If each size change re-renders something expensive, wrap the result with `useDebounce` from section 5.

**Common mistake:** a snapshot that returns a new object every time.

```jsx
// WRONG: a new object on every call, so React thinks the store changed every time
const size = useSyncExternalStore(subscribe, () => ({ width: window.innerWidth }))
```

React detects this. It logs `The result of getSnapshot should be cached to avoid an infinite loop`, and then the render fails with `Maximum update depth exceeded`. We ran it and got both messages. Fix: return primitives (as above), or compute the object once and cache it until the underlying values change.

### useOnlineStatus

```jsx
// useOnlineStatus.js
import { useSyncExternalStore } from 'react'

function subscribe(onChange) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true, // the server cannot know: assume online
  )
}
```

This is the safer rewrite promised in section 3. The `SaveButton` component did not change. We tested it: `true` at the start, `false` after an `offline` event, `true` again after an `online` event.

One caveat to remember: `navigator.onLine` being `true` only means the device has a network connection. It does not prove the internet or your server is reachable. Treat it as a hint, and let failed requests tell the truth.

A note on `useLocalStorage`: it can also be built on `useSyncExternalStore`. The snapshot would be the raw stored *string* (a primitive, so no caching problem), and `subscribe` would listen to `storage` plus a small custom event for same-tab updates. That version handles a changing `key` and keeps components in the same tab in sync. The `useState` version in section 4 is easier to learn and is what interviewers expect first.

## 13. Design guidelines

A hook is an API. Other people (and you, in six months) use it without reading the inside. These rules make it pleasant.

**1. Name it for what it gives, with the `use` prefix.** `useOnlineStatus`, `useDebounce`, `useLocalStorage`. Not `useData`, `useStuff`, or `useMount`. A good name makes a comment unnecessary.

**2. Choose the return shape on purpose.** Return an **array** when there are one to three values and callers will want to rename them, like `useState` does: `const [open, toggle] = useToggle()`. Return an **object** when there are four or more values, or some are optional: `const { data, loading, error } = useFetch(url)`. Objects let callers pick by name, skip what they do not need, and let you add fields later without breaking anyone. With TypeScript an array return needs a tuple type or `as const` ([TypeScript with React](../03-intermediate/08-typescript-with-react.md)).

**3. Return stable functions.** If a hook returns functions, keep their identity between renders unless their inputs change. Callers put them in dependency arrays and pass them to memoized children. A new function every render triggers extra effect runs and breaks `memo`. The recipe is `useCallback` with functional updates (`setCount((c) => c + 1)`), so the function does not depend on the current state. We checked `useCounter`: `increment`, `decrement` and `reset` were the same functions after a re-render. The returned *object* was a new one each time, which is fine because callers destructure it. The React Compiler can add this memoization for you, but designing for stability still matters when other code depends on the identity ([Memoization](07-memoization.md)).

**4. Clean up everything you start.** Every timer, listener, subscription and request needs a cleanup in the same effect. StrictMode runs effects as setup, cleanup, setup in development to expose missing cleanups.

**5. Use an options object for optional settings.** After two or three arguments, switch to `useThing(required, { optionA, optionB })`. Give each option a default, and give the whole object a default (`= {}`). **Do not** put the options object itself in a dependency array: an inline `{ delay: 100 }` is a new object on every render. We counted effect runs over three renders: an effect that depended on the object ran 3 times, one that depended on the primitive inside ran once. Destructure the primitives and depend on those.

**6. Do one thing. Compose small hooks.** Avoid a "god hook" like `useEverythingAboutUsers` with twelve return values and flags. Build small hooks and combine them. A debounced, fetching search is just two hooks plus a few lines:

```jsx
function useSearch(text) {
  const query = useDebounce(text.trim(), 300)
  const url = query ? `/api/search?q=${encodeURIComponent(query)}` : null
  return useFetch(url)
}

function SearchBox() {
  const [text, setText] = useState('')
  const { data, loading, error } = useSearch(text)

  return (
    <div>
      <input aria-label="Search" value={text} onChange={(e) => setText(e.target.value)} />
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && (
        <ul>
          {data.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

We tested this with a fake `fetch` and fake timers. Typing "react" one letter at a time, 100 ms apart, made **zero** requests while typing. After the pause there was exactly one request, to `/api/search?q=react`, and "Loading..." showed until the answer arrived. Then the list appeared. Try the full version in [Autocomplete with debounce](../practice-app/exercises/react/12-autocomplete-debounce/README.md).

**7. Hooks are for logic, components are for UI.** A hook returns data and functions. The component decides how they look. If a hook starts returning markup, ask whether it should be a component (section 15).

**8. State the contract.** Does the callback need to be stable? What happens when the arguments change? What does it return before data arrives? A comment of two lines saves a bug report.

**9. Be safe on the server.** Do not touch `window`, `document`, `localStorage` or `navigator` while rendering. Touch them inside effects or event handlers, behind a `typeof window` check, or through `useSyncExternalStore` with a server snapshot.

**10. Follow the Rules of React.** Do not change the arguments you receive. Do not do side effects during render. Call hooks at the top level. The lint plugin catches most of this, so keep it on.

## 14. Testing custom hooks

You cannot call a hook directly in a test:

```js
const counter = useCounter() // Error: Invalid hook call. Hooks can only be called inside of the body of a function component.
```

A hook needs a component to run in. Testing Library gives you `renderHook`, which renders a tiny invisible component that calls your hook, and gives you the result.

```js
import { renderHook, act } from '@testing-library/react'

const { result, rerender, unmount } = renderHook(() => useCounter(5))
```

- `result.current` is the **latest** value the hook returned.
- `rerender(newProps)` renders again, optionally with new props. Pass `initialProps` to `renderHook` to give the first props.
- `unmount()` unmounts, so you can test cleanup.
- `act(...)` wraps anything that changes state. It runs your code and then lets React finish every update and effect before the next line. Without it, `result.current` can show the old value, and React prints a warning.
- Options: `wrapper` (a component to render around the hook, for context) and `reactStrictMode: true` (to test with StrictMode).

(Use Testing Library's own `renderHook`. The older `@testing-library/react-hooks` package is not needed any more.)

The tests below use Vitest and Testing Library. To set them up in your own Vite app, see [Set up your playground](../00-start-here/02-setup-your-playground.md). The files sit next to the hooks. The assertions are the real ones we ran against the hooks in this lesson.

**A simple hook:**

```js
// useCounter.test.js
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCounter } from './useCounter.js'

describe('useCounter', () => {
  it('starts at the initial value', () => {
    const { result } = renderHook(() => useCounter(5))
    expect(result.current.count).toBe(5)
  })

  it('increments and decrements', () => {
    const { result } = renderHook(() => useCounter(0))
    act(() => result.current.increment())
    act(() => result.current.increment())
    act(() => result.current.decrement())
    expect(result.current.count).toBe(1)
  })

  it('never goes above max', () => {
    const { result } = renderHook(() => useCounter(0, { max: 2 }))
    act(() => {
      result.current.increment()
      result.current.increment()
      result.current.increment()
    })
    expect(result.current.count).toBe(2)
  })
})
```

Three calls in one `act` all count, because each uses the updater form and sees the newest value. Notice that we read `result.current.increment` *inside* `act`, always after the previous update finished.

**A hook with timers, using fake timers:**

```js
// useDebounce.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce.js'

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('updates only after the quiet period', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    })
    expect(result.current).toBe('a')

    rerender({ value: 'ab' })
    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('a') // not yet

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('ab')
  })
})
```

`vi.useFakeTimers()` replaces `setTimeout` with a clock you control. `vi.advanceTimersByTime(ms)` moves it forward, and `act` lets React process the state change that the timer made. Always restore real timers afterwards. One thing we met while preparing this lesson: `userEvent` calls hung (the test timed out) while Vitest fake timers were on. In those tests we used `fireEvent` and moved the clock by hand.

**A hook that uses the browser:**

```js
// useLocalStorage.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage.js'

describe('useLocalStorage', () => {
  beforeEach(() => localStorage.clear())

  it('reads the stored value', () => {
    localStorage.setItem('theme', JSON.stringify('dark'))
    const { result } = renderHook(() => useLocalStorage('theme', 'light'))
    expect(result.current[0]).toBe('dark')
  })

  it('saves changes as JSON', () => {
    const { result } = renderHook(() => useLocalStorage('theme', 'light'))
    act(() => result.current[1]('dark'))
    expect(localStorage.getItem('theme')).toBe('"dark"')
  })

  it('follows a change made in another tab', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0))
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'count', newValue: '7', storageArea: localStorage }),
      )
    })
    expect(result.current[0]).toBe(7)
  })
})
```

jsdom (the fake browser used in tests) has `localStorage`, so you only need to clear it before each test. You fake "another tab" by dispatching the event yourself.

**A hook that fetches, with a fetch you control:**

```js
// useFetch.test.js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFetch } from './useFetch.js'

describe('useFetch', () => {
  afterEach(() => vi.unstubAllGlobals())

  // A fetch the test controls: nothing is answered until the test says so.
  function mockFetch() {
    const pending = []
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (url, { signal }) =>
          new Promise((resolve) => {
            pending.push({ url, signal, respond: (body) => resolve({ ok: true, json: async () => body }) })
          }),
      ),
    )
    return pending
  }

  it('shows the newest answer even if an old one arrives late', async () => {
    const pending = mockFetch()
    const { result, rerender } = renderHook(({ url }) => useFetch(url), {
      initialProps: { url: '/a' },
    })
    rerender({ url: '/b' })

    await act(async () => pending[1].respond('B'))
    await act(async () => pending[0].respond('A')) // the old answer arrives late
    expect(result.current.data).toBe('B')
  })

  it('aborts the request when the component unmounts', () => {
    const pending = mockFetch()
    const { unmount } = renderHook(() => useFetch('/a'))
    expect(pending[0].signal.aborted).toBe(false)
    unmount()
    expect(pending[0].signal.aborted).toBe(true)
  })

  it('survives StrictMode (the effect runs twice in development)', async () => {
    const pending = mockFetch()
    const { result } = renderHook(() => useFetch('/a'), { reactStrictMode: true })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(pending[0].signal.aborted).toBe(true)

    await act(async () => pending[1].respond('ok'))
    expect(result.current.data).toBe('ok')
  })
})
```

Never hit the real network in a unit test. A fake `fetch` that you answer by hand lets you test the awkward orders, such as "the old answer arrives last", which a real server almost never gives you on demand. `await act(async () => ...)` is needed because the answer is a promise that resolves later.

**A hook that needs context** uses the `wrapper` option:

```jsx
import { it, expect } from 'vitest'
import { createContext, useContext } from 'react'
import { renderHook } from '@testing-library/react'

const ThemeContext = createContext('light')
const useTheme = () => useContext(ThemeContext)

it('uses the wrapper option', () => {
  const wrapper = ({ children }) => <ThemeContext value="dark">{children}</ThemeContext>
  const { result } = renderHook(() => useTheme(), { wrapper })
  expect(result.current).toBe('dark')
})
```

**A hook for something jsdom does not have.** jsdom has no `matchMedia`, so the test provides a tiny fake. For `navigator.onLine`, spy on the getter:

```js
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery } from './useMediaQuery.js'
import { useOnlineStatus } from './useOnlineStatus.js'

// jsdom has no matchMedia, so the test provides a tiny fake.
function mockMatchMedia(initialMatches) {
  let matches = initialMatches
  const listeners = new Set()
  window.matchMedia = vi.fn(() => ({
    get matches() {
      return matches
    },
    addEventListener: (type, listener) => listeners.add(listener),
    removeEventListener: (type, listener) => listeners.delete(listener),
  }))
  return (next) => {
    matches = next
    listeners.forEach((listener) => listener())
  }
}

describe('useMediaQuery', () => {
  it('follows the media query', () => {
    const setMatches = mockMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'))
    expect(result.current).toBe(true)

    act(() => setMatches(false))
    expect(result.current).toBe(false)
  })
})

describe('useOnlineStatus', () => {
  it('follows the offline and online events', () => {
    let online = true
    vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(() => online)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)

    act(() => {
      online = false
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe(false)
  })
})
```

**Test the hook directly, or through a component?**
- Test **directly** when the hook is reusable and has its own contract with edge cases: timers, cleanup, many inputs. `renderHook` is quick and precise.
- Test **through a component** when the hook is made for one component, or when the point is what the user sees. Do not test private details. This is how we test a hook that touches the DOM, such as `useOnClickOutside`:

```jsx
// Dropdown.test.jsx
import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// Dropdown is the component from section 8

it('closes when you click outside', async () => {
  const user = userEvent.setup()
  render(<Dropdown />)

  await user.click(screen.getByRole('button', { name: 'Menu' }))
  expect(screen.queryByRole('button', { name: 'Profile' })).not.toBeNull()

  await user.click(screen.getByText('Outside text'))
  expect(screen.queryByRole('button', { name: 'Profile' })).toBeNull()
})
```

More on testing strategy, mocking the network with MSW, and end-to-end tests: [Testing React](../04-advanced/08-testing-react.md).

**Common mistakes when testing hooks:**
- Changing state without `act`. React prints `An update to TestComponent inside a test was not wrapped in act(...)`. We reproduced it by calling `result.current.increment()` directly. Wrap it in `act`.
- Copying a value out of `result.current` once (`const { count } = result.current`) and checking it later. That copy is stale. Read `result.current.count` again after each `act`.
- Forgetting to restore real timers or to unstub globals, so one test leaks into the next.
- Calling the hook directly instead of using `renderHook`.
- Testing React itself (does `useState` work?) instead of your own contract.

## 15. Custom hook vs HOC vs render prop (and hooks that return JSX)

Before hooks, React had two patterns for sharing logic between components. You will still meet them in older code and in interviews.

**HOC (higher-order component):** a function that takes a component and returns a new component with extra props.

```jsx
function withOnlineStatus(Component) {
  return function WithOnlineStatus(props) {
    const online = useOnlineStatus()
    return <Component {...props} online={online} />
  }
}

const SaveButton = withOnlineStatus(function SaveButton({ online }) {
  return <button disabled={!online}>Save</button>
})
```

**Render prop:** a component that does the logic and calls a function (usually `children`) to know what to draw.

```jsx
function OnlineStatus({ children }) {
  const online = useOnlineStatus()
  return children(online)
}

function SaveButton() {
  return (
    <OnlineStatus>
      {(online) => <button disabled={!online}>Save</button>}
    </OnlineStatus>
  )
}
```

**Custom hook:**

```jsx
function SaveButton() {
  const online = useOnlineStatus()
  return <button disabled={!online}>Save</button>
}
```

How they compare:
- **HOC.** Extra wrapper components in the tree ("wrapper hell"), props injected invisibly (name clashes are possible), and hard to type. The origin of a prop is not visible where you use it.
- **Render prop.** Nesting gets deep when you combine several, and the logic must be in a component so the function-as-child syntax appears in your JSX.
- **Custom hook.** A flat call, no extra component, easy to combine (call as many hooks as you want), easy to type and to test. The limit: hooks work only in function components and other hooks, not in classes.

HOCs and render props are not dead. They are still the right tool when the logic must **render something around** the child (an error boundary is class-only, a layout wrapper, a provider), when you must support class components, or when a library's API already uses them. In modern code they are often thin wrappers over a hook, as in the examples above. See [Component patterns](../03-intermediate/01-component-patterns.md) and Legacy class components (planned).

**Can a custom hook return JSX?** Yes, it is only a function, so it can return anything. But it is usually a smell. The classic trap is a hook that **creates a component inside itself**:

```jsx
// WRONG: Dialog is a NEW component type on every render of the caller
function useBadDialog() {
  function Dialog() {
    const [text, setText] = useState('')
    return <input aria-label="Reason" value={text} onChange={(e) => setText(e.target.value)} />
  }
  return Dialog
}
```

Each time the page re-renders, `useBadDialog` runs again and makes a different `Dialog` function. React sees a different component type, throws the old one away, and mounts a new one, so its state is lost. We typed `too slow` into the input, re-rendered the parent, and the field was empty again.

The safe form defines the component **outside** and lets the hook decide only *what* to render:

```jsx
function Dialog() {
  const [text, setText] = useState('')
  return <input aria-label="Reason" value={text} onChange={(e) => setText(e.target.value)} />
}

function useGoodDialog() {
  const [open, setOpen] = useState(false)
  const dialog = open ? <Dialog /> : null
  return { dialog, show: () => setOpen(true) }
}
```

Here the typed text survived a parent re-render (checked). Still, the cleanest design is the **headless** one: the hook returns state and handlers (or "props getters"), and a real component draws the UI. That keeps logic and markup apart, which is the whole point. More in [Component patterns](../03-intermediate/01-component-patterns.md).

## 16. Hook libraries: use them, but know what is inside

You do not have to write every hook. Collections of ready-made hooks exist:
- General collections for React: `react-use`, `usehooks-ts`, `ahooks`, `@uidotdev/usehooks`. They contain the small hooks from this lesson (`useToggle`, `useDebounce`, `useLocalStorage`, `useMediaQuery`, `usePrevious`, `useInterval`, ...) and many more.
- The idea comes from Vue's **VueUse**, a big collection of small reusable functions. The React collections above are the closest equivalents.
- **TanStack** is a family of libraries built around hooks: TanStack Query (server state), TanStack Table, TanStack Form, TanStack Virtual, TanStack Router.
- Other hook-first libraries: React Hook Form (forms), SWR (data fetching), Zustand and Jotai (state), and headless UI kits such as React Aria and Radix (accessible behaviour).

How to decide:
- **Copy or write it yourself** when the hook is small (about 5 to 30 lines), like `useToggle` or `usePrevious`. A dependency costs bundle size, upgrade work and review time.
- **Use a library** when the problem is hard and full of edge cases: server-state caching, forms, virtualization, accessibility behaviour for comboboxes and dialogs. Do not rebuild those in production.
- Before adding a collection, check: is it maintained, is it tree-shakeable (so you only ship the hooks you use), does it work with React 19 and with server rendering, and is the hook's behaviour (cleanup, SSR safety, stable functions) what you expect? Read the source of the hooks you rely on. It is usually short.

In an interview, show both skills: write the small hooks live without help, and know the name of the library for the big ones.

## How interviewers test this
- **The first trap: shared state.** They ask "if two components use the same hook, do they share state?" A strong answer is a clear "no, each call has its own state", with the recipe picture and how to share state when you need to (lift up, context, store).
- **Live coding of one or two small hooks:** `useToggle`, `useDebounce`, `useLocalStorage`, `usePrevious`, `useFetch`. They watch for cleanup in effects, correct dependency arrays, the lazy initializer, error handling, and whether you explain each line while you type.
- **Edge cases:** stale closures in timers and listeners, race conditions in fetching, server rendering (`window` is undefined), StrictMode double effects, unmounting while a request is in flight.
- **Design judgement:** when to extract, naming, array versus object return, stable function identities, small hooks that compose, logic in hooks and UI in components.
- **Awareness of better tools:** for fetching, a strong candidate says "I can write it, but in a real app I would use TanStack Query" and gives reasons (cache, dedupe, retries).
- **Testing:** `renderHook`, `act`, fake timers, mocking `fetch`, and when to test through a component.
- **Red flags:** a hook name without `use`, effects with no cleanup, `useEffect(async ...)`, ignoring `response.ok`, hooks called conditionally, "I put the state in a module variable to share it" without understanding the cost, and wrapping every line of code in a custom hook.

## Interview questions and model answers

### Q1. What is a custom hook? (Easy)
A custom hook is a JavaScript function whose name starts with `use` and that calls other hooks. It lets you pull stateful logic (state, effects, refs, context) out of components and reuse it. There is nothing special to register: it is a normal function that runs inside a component's render. It returns whatever you like, such as a value, an array or an object. A custom hook shares **logic**, not **state**.

```jsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial)
  const toggle = useCallback(() => setOn((v) => !v), [])
  return [on, toggle, setOn]
}
```

### Q2. When should you create a custom hook? Give examples. (Easy)
When the same logic is used in two or three places, when a state-plus-effect group belongs together (subscribe and unsubscribe side by side), when a good name makes the component easier to read, when you want to test the logic without UI, or when you want to be able to swap the inside later. Typical examples are `useDebounce`, `useLocalStorage`, `useFetch`, `useOnlineStatus`, `useMediaQuery` and `useOnClickOutside`. Do not extract code that is used once, a hook that only renames a built-in, or "lifecycle" hooks like `useMount`. And never extract something that returns JSX: that is a component.

### Q3. If two components use the same custom hook, do they share state? (Easy)
No. Each call to a hook creates its own state, owned by the component that made the call. Two components that both call `useCounter()` have two separate counters. Even two calls in one component are independent. The hook shares the *recipe*, not the *meal*. To share state, lift it to a common parent, put it in Context, or use an external store. A hook can then read from that shared place, but the sharing comes from the place, not from the hook.

### Q4. Why must a custom hook's name start with `use`? (Easy)
It is a convention that people and tools rely on. It tells the reader that the function follows the Rules of Hooks, and it tells the ESLint plugin (`react-hooks/rules-of-hooks`) where to enforce them: no hooks in conditions or loops, and no hooks in plain functions. The linter will report `useState` inside a function called `counter`. React does not check the name at runtime. What makes hooks work is the *order* of the calls, so the prefix is about communication and safety checks, not magic.

### Q5. How do you write `useDebounce`? (Medium)
Keep a copy of the value in state, and update that copy from a timer. An effect starts a `setTimeout` for `delay` milliseconds, and its cleanup clears the timer, so a newer value cancels the older timer. Only when the value stays unchanged for the whole delay does the timer fire and update the copy. Both `value` and `delay` go in the dependency array.

```jsx
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
```

Mention the two edge cases: the first render returns the starting value with no delay, and without the cleanup nothing is debounced. For debouncing a function instead of a value, store the newest callback in a ref and keep the timer id in a ref (`useDebouncedCallback`).

### Q6. How do you test a custom hook? (Medium)
You cannot call a hook outside a component, so use `renderHook` from Testing Library. It renders a small component that calls the hook and gives you `result.current` (the latest return value), `rerender` and `unmount`. Wrap anything that changes state in `act`. Use `vi.useFakeTimers()` for timers, stub `fetch` instead of using the network, and use the `wrapper` option when the hook needs context. If the hook belongs to one component or the behaviour is about what the user sees, test through the component instead.

```js
const { result } = renderHook(() => useCounter(0))
act(() => result.current.increment())
expect(result.current.count).toBe(1)
```

### Q7. Custom hook vs HOC vs render prop: what is the difference? (Medium)
All three share logic between components. A HOC wraps a component and injects props. A render prop is a component that calls a function child to learn what to draw. A custom hook is just a function you call inside your component. Hooks give the flattest code: no extra components in the tree, no hidden props, easy to combine and to type. HOCs and render props nest and hide where props come from. They are still useful when the logic must render something around the child (an error boundary, a provider, a layout), or when you work with class components, which cannot use hooks.

### Q8. Can a custom hook return JSX? (Medium)
Technically yes, because a hook is a normal function. In practice it is usually a bad idea. A hook that defines a component inside itself creates a new component type on every render, so React remounts it and its state is lost (a typed value in an input disappears when the parent re-renders). Returning an element built from a component that is defined *outside* the hook is safe, but it still mixes logic with markup. The better design is a headless hook that returns state and handlers, with the component drawing the UI.

### Q9. Should a custom hook return an array or an object? (Medium)
Use an **array** for one to three values that callers will want to rename, as `useState` does: `const [open, toggle] = useToggle()`. Use an **object** for four or more values, or when some are optional: `const { data, loading, error } = useFetch(url)`. Objects are self-documenting, let callers skip values, and let you add fields later without breaking anyone. In TypeScript, an array return needs a tuple type or `as const`, otherwise the type becomes a union of every item.

### Q10. How would you write `useLocalStorage`? What can go wrong? (Medium)
Use `useState` with a **lazy initializer** that reads storage once, parses it with `JSON.parse`, and falls back to the initial value. Save with `JSON.stringify` in an effect that depends on `[key, value]`. Return the real setter so the updater form works.

```js
const [value, setValue] = useState(() => readStorage(key, initialValue))
useEffect(() => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}, [key, value])
```

Edge cases: `getItem`, `JSON.parse` and `setItem` can all throw (blocked storage, bad JSON, full quota), so wrap them in `try/catch`. A server has no `window`, so guard with `typeof window === 'undefined'`. To sync tabs, listen to the `storage` event, which fires in the *other* tabs only. Values that are not JSON-safe (functions, `Map`, `Date`) do not round-trip. And never store secrets there.

### Q11. How does `usePrevious` work, and what is the catch? (Medium)
Keep the value in a ref and update the ref in an effect without a dependency array. An effect runs *after* the render, so during the render the ref still holds the value from the previous render. The hook returns `ref.current` and the effect then stores the new value. The catch: it returns the value from the previous **render**, so after an unrelated re-render it equals the current value. If you need the previous *different* value, keep a `{ current, previous }` pair in state and update it during render when the value changes. Also note that reading a ref during render is discouraged and flagged by the `react-hooks/refs` lint rule.

```js
function usePrevious(value) {
  const ref = useRef(undefined)
  useEffect(() => { ref.current = value })
  return ref.current
}
```

### Q12. Why does `setInterval` inside a hook show a stale value, and how do you fix it? (Hard)
The effect runs once, and the callback it gave to `setInterval` closed over the state of that first render. Every tick sees the same old value. Putting the callback in the dependency array restarts the timer after every render, which can starve it if renders are more frequent than the delay. The fix is the **latest-callback pattern**: store the callback in a ref and update the ref after every render, create the interval once per delay, and have the interval call `ref.current()`. With React 19.2 or later you can use `useEffectEvent` for the same effect. Pass `null` as the delay to pause.

```js
useEffect(() => { savedCallback.current = callback })
useEffect(() => {
  if (delay === null) return
  const id = setInterval(() => savedCallback.current(), delay)
  return () => clearInterval(id)
}, [delay])
```

### Q13. How do you write `useFetch` without race conditions, and why use TanStack Query instead? (Hard)
Create an `AbortController` in the effect, pass its signal to `fetch`, and abort in the cleanup, so changing the URL or unmounting cancels the old request. Ignore `AbortError`, check `response.ok` because `fetch` does not reject on 404 or 500, and do not save a result if the signal was aborted. Store the result together with the URL it belongs to, and derive `loading` by comparing that URL with the current one, so the old data never shows under a new URL. Do not make the effect callback `async`.

TanStack Query is better in real apps because it adds what this hook lacks: a shared cache and de-duplication (three components, one request), background refresh and refetch on focus, retries with backoff, pagination, mutations with invalidation, devtools and server rendering support. A good compromise is to wrap it in your own hook such as `useUser(id)`, so you can change the inside later.

### Q14. Why use `useSyncExternalStore` for `useMediaQuery` or `useOnlineStatus` instead of `useState` and `useEffect`? (Hard)
These values live outside React and change on their own. With `useState` plus `useEffect` you must pick a default first and correct it after the first render, which can flash the wrong UI, and you can see two different values in one render pass when React renders in pieces. `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` reads the real value during render, re-reads it when the store notifies, keeps the whole screen consistent, and gives you a place (`getServerSnapshot`) to say what to use on the server and during hydration. Two rules to remember: `subscribe` must keep its identity between renders (define it outside the hook or wrap it in `useCallback`), and `getSnapshot` must return the same value when nothing changed, so it cannot create a new object on every call.

## Common mistakes and gotchas
- **Expecting a hook to share state between components.** Each call has its own state. Fix: lift the state up, use Context, or use a store, and let the hook read it.
- **A hook name without `use`.** The linter and your teammates cannot tell it is a hook. Fix: rename to `useSomething`.
- **Calling a hook inside a condition, loop or after a return inside your custom hook.** Fix: call the hook every time and put the condition inside it or around its result.
- **A custom "lifecycle" hook like `useMount(fn)`.** It hides dependencies from the linter. Fix: name the hook after what it does and keep the dependency array honest.
- **`useState(readStorage())` instead of `useState(() => readStorage())`.** It reads storage on every render. Fix: pass the lazy function.
- **A debounce with no cleanup, or a debounced function created during render.** Nothing is debounced. Fix: `clearTimeout` in the cleanup, and keep the timer in a hook with refs.
- **Stale closures in timers and listeners.** The callback remembers old state. Fix: the latest-callback ref pattern, `useEffectEvent`, or the updater form of `setState`.
- **A callback or an options object in the dependency array.** The effect re-runs on every render. Fix: store the callback in a ref, and destructure the options into primitives.
- **Returning a new function on every render.** It breaks `memo` and re-runs effects of callers. Fix: `useCallback` with functional updates.
- **Touching `window`, `document` or `localStorage` during render.** Crashes server rendering. Fix: guard with `typeof window`, use an effect, or `useSyncExternalStore` with a server snapshot.
- **A `useSyncExternalStore` `getSnapshot` that returns a new object each call.** It causes an infinite loop. Fix: return primitives or cache the object.
- **A `fetch` hook with no `AbortController`, no `response.ok` check, or an `async` effect callback.** You get races, silent 404s and crashes at unmount. Fix: follow the `useFetch` in section 9, or use TanStack Query.
- **`useOnClickOutside` with the trigger button outside the ref.** The outside handler closes the panel and the button reopens it. Fix: attach the ref to a wrapper around both.
- **A hook that defines a component inside itself.** The component remounts on every render and loses state. Fix: define the component outside and return data or an element.
- **Testing a hook without `act`, with a stale `result.current` copy, or with the real network and real timers.** Fix: `renderHook` plus `act`, read `result.current` fresh, and fake `fetch` and timers.
- **Over-abstracting.** A hook for every three lines, or one giant hook that does everything. Fix: extract on the second or third use, give each hook one job, and compose.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard. The code tasks fit in the practice app or any Vite React sandbox. The helper hooks `useEventListener`, `useInterval`, `useFetch` and `useDebounce` are the ones built in this lesson.

1. **(Easy)** Predict what happens. Both components below call `useCounter()` from section 2. The user clicks the A button twice, then the B button once. What do the two buttons show?

   ```jsx
   function A() {
     const { count, increment } = useCounter()
     return <button onClick={increment}>A: {count}</button>
   }
   function B() {
     const { count, increment } = useCounter()
     return <button onClick={increment}>B: {count}</button>
   }
   ```

<details>
<summary>Show answer</summary>

The buttons show `A: 2` and `B: 1`. Each component's call to `useCounter()` has its own `useState`, so the state is not shared. Clicking A changes only A's state, and clicking B changes only B's. The hook shares the logic (how to count), not the numbers. We ran this and got exactly `A: 2` and `B: 1`.

</details>

2. **(Easy)** For each function, say whether it is a correct custom hook and why, or what you would change.

   ```js
   function useTitle(title) {
     useEffect(() => { document.title = title }, [title])
   }

   function getUser() {
     return useContext(UserContext)
   }

   function useFormatPrice(amount) {
     return '$' + amount.toFixed(2)
   }
   ```

<details>
<summary>Show answer</summary>

- `useTitle` is a correct custom hook. Its name starts with `use` and it calls a hook (`useEffect`) at the top level.
- `getUser` calls `useContext` but its name does not start with `use`. The linter reports an error, and teammates will not know the Rules of Hooks apply. Rename it `useUser`.
- `useFormatPrice` calls no hooks at all. It works, but the `use` prefix promises hook behaviour that is not there. Call it `formatPrice`, and use it like any plain function. A `use` name should mean "this calls hooks".

</details>

3. **(Easy)** Code: write `useKeyPress(targetKey)`. It returns `true` while the key named `targetKey` is held down, and `false` otherwise. Use `useEventListener` from section 8.

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'
import { useEventListener } from './useEventListener.js'

export function useKeyPress(targetKey) {
  const [pressed, setPressed] = useState(false)

  useEventListener('keydown', (event) => {
    if (event.key === targetKey) setPressed(true)
  })
  useEventListener('keyup', (event) => {
    if (event.key === targetKey) setPressed(false)
  })

  return pressed
}
```

Usage: `const shiftHeld = useKeyPress('Shift')`. Two listeners, both on `window`, both removed on unmount by `useEventListener`. We checked the sequence of results while pressing `a`, pressing `Shift`, and releasing `Shift`: `false`, `false`, `true`, `false` (the first value is before any key). Stretch: handle the window losing focus while the key is down (a `blur` listener that sets `false`).

</details>

4. **(Medium)** Predict. `const debounced = useDebounce(value, 300)`. The value starts as `'start'`. At time 0 ms it changes to `'b'`, at 100 ms to `'c'`, and at 200 ms to `'d'`. What is `debounced` at 499 ms, and at 500 ms?

<details>
<summary>Show answer</summary>

At 499 ms `debounced` is still `'start'`. At 500 ms it becomes `'d'`. Every change cancels the previous timer, so only the timer started at 200 ms survives, and it fires 300 ms later, at 500 ms. The values `'b'` and `'c'` are never seen. We ran this with fake timers and got `'start'` at 499 ms and `'d'` at 500 ms.

</details>

5. **(Medium)** Code: write `useCopyToClipboard(resetAfter = 2000)`. It returns `{ copied, copy }`. `copy(text)` calls `navigator.clipboard.writeText(text)`, sets `copied` to `true`, and sets it back to `false` after `resetAfter` milliseconds. It must not leave a timer running after unmount, and must return `true` or `false` to say if the copy worked.

<details>
<summary>Show answer</summary>

```jsx
import { useCallback, useEffect, useRef, useState } from 'react'

export function useCopyToClipboard(resetAfter = 2000) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  // Do not leave a timer running after the component is gone.
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const copy = useCallback(
    async (text) => {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        setCopied(false)
        return false // clipboard blocked or not available
      }
      setCopied(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), resetAfter)
      return true
    },
    [resetAfter],
  )

  return { copied, copy }
}
```

Points to mention: the clipboard API returns a promise and can reject (permission denied, or a page that is not on HTTPS or localhost), so `try/catch`. The timer id is in a ref because changing it must not cause a render. `clearTimeout` before starting a new timer means a second copy restarts the countdown. We tested it with a fake clipboard and fake timers: `copied` was `true` right after the copy, still `true` at 999 ms, and `false` at 1000 ms (with `resetAfter = 1000`). A failing clipboard returned `false`.

</details>

6. **(Medium)** Predict. Using the `usePrevious` from section 11, the user clicks the "count" button twice and then the unrelated "other" button once. What does the paragraph `now {count}, before {previous}` show after each of the three clicks, starting from `now 0, before undefined`?

<details>
<summary>Show answer</summary>

After the first click: `now 1, before 0`. After the second: `now 2, before 1`. After the "other" click: `now 2, before 2`. The hook returns the value from the previous **render**. The "other" click re-renders the component with `count` unchanged, so the previous render also had `count = 2`. If you want the previous *different* value, use the pair-in-state version `usePreviousDistinct`, which would still show `before 1`.

</details>

7. **(Medium)** Code: write `useCountdown(from)` with `useInterval`. It returns `{ secondsLeft, running, start, reset }`. Nothing happens until `start()` is called. It then counts down once per second and stops by itself at 0. `reset()` stops it and goes back to `from`. Do not store `running` as separate state if you can derive it.

<details>
<summary>Show answer</summary>

```jsx
import { useCallback, useState } from 'react'
import { useInterval } from './useInterval.js'

export function useCountdown(from) {
  const [secondsLeft, setSecondsLeft] = useState(from)
  const [started, setStarted] = useState(false)

  // Derived, not stored: the timer runs only while there is time left.
  const running = started && secondsLeft > 0

  useInterval(() => setSecondsLeft((s) => s - 1), running ? 1000 : null)

  const start = useCallback(() => setStarted(true), [])
  const reset = useCallback(() => {
    setStarted(false)
    setSecondsLeft(from)
  }, [from])

  return { secondsLeft, running, start, reset }
}
```

The trick is `useInterval(..., running ? 1000 : null)`: a `null` delay pauses the timer, so reaching 0 or not having started both stop it with no extra effect. With `from = 3` we checked: `secondsLeft` stayed 3 before `start()`, then after each second it was 2, 1, 0, 0, 0, and `reset()` brought it back to 3.

</details>

8. **(Hard)** Predict. A teammate wrote the dropdown below. The list is open. The user clicks the "Menu" button to close it. What happens, and why? How do you fix it?

   ```jsx
   function BuggyDropdown() {
     const [open, setOpen] = useState(false)
     const panelRef = useRef(null)
     useOnClickOutside(panelRef, () => setOpen(false))

     return (
       <div>
         <button onClick={() => setOpen((o) => !o)}>Menu</button>
         {open && <ul ref={panelRef}><li>Profile</li></ul>}
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

The list stays open (or closes and opens again so quickly that it looks like nothing happened). The button is outside `panelRef`, so pressing it counts as an outside press. `useOnClickOutside` runs `setOpen(false)` on `pointerdown`. Then the button's `onClick` runs `setOpen((o) => !o)` on the new state `false`, which makes it `true` again. We ran it with real clicks: after opening, clicking the button again left the list open.

Fix: put the ref on a wrapper that contains both the trigger and the panel:

```jsx
<div ref={ref}>
  <button onClick={() => setOpen((o) => !o)}>Menu</button>
  {open && <ul>...</ul>}
</div>
```

Now a press on the button is inside the ref, the outside handler ignores it, and the button's own click toggles the list.

</details>

9. **(Hard)** Code: extend the `useFetch` from section 9 with a `refetch` function. `refetch()` asks for the same URL again and shows `loading: true` while the new request runs. The returned `refetch` must keep the same identity between renders.

<details>
<summary>Show answer</summary>

The hook has to treat "same URL, second time" as a *different request*. Count the reloads, and build a `requestId` from the URL and the count. The result remembers the `requestId` instead of the URL.

```jsx
import { useCallback, useEffect, useState } from 'react'

export function useFetch(url) {
  const [reloads, setReloads] = useState(0)
  // Identifies one request: the same url asked for the 1st time, the 2nd time, and so on.
  const requestId = url ? `${url}#${reloads}` : null
  const [result, setResult] = useState({ requestId: null, data: null, error: null })

  useEffect(() => {
    if (!requestId) return
    const controller = new AbortController()

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ requestId, data, error: null })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setResult({ requestId, data: null, error })
      })

    return () => controller.abort()
  }, [url, requestId])

  const refetch = useCallback(() => setReloads((n) => n + 1), [])

  const isCurrent = result.requestId === requestId
  return {
    data: isCurrent ? result.data : null,
    error: isCurrent ? result.error : null,
    loading: Boolean(url) && !isCurrent,
    refetch,
  }
}
```

When `refetch()` runs, `reloads` changes, so `requestId` changes, so the effect re-runs (the cleanup aborts the old request and a new one starts). In the render, `result.requestId` no longer matches, so `loading` is `true`. We tested it with a controlled `fetch`: the first answer `1` showed, `refetch()` started a second request, and its answer `2` replaced the data. `refetch` is stable because it uses the updater form and has no dependencies. A nice stretch goal is to keep showing the old data while the refetch runs (stale-while-revalidate), which is what TanStack Query does for you.

</details>

10. **(Hard)** Explain. Twelve components across your app each call `useUser()`, which is a hook built on the `useFetch` from this lesson, always with the URL `/api/user`. How many requests does the page make? Name two problems this causes and two different ways to fix them.

<details>
<summary>Show answer</summary>

Twelve requests, one per call. Each call owns its own state and runs its own effect, because a hook shares logic, not state. We checked the smaller case: three components with the same URL made three `fetch` calls.

Problems: wasted network and server load, slower pages, and the twelve copies can disagree (one has the new name, another still has the old one after an update). Also, loading spinners appear at different times.

Fixes:
1. Use a server-state library such as TanStack Query. With `useQuery({ queryKey: ['user'], queryFn })` in each component (or inside your own `useUser`), all twelve share one cache entry and one request.
2. Fetch once near the top and share through Context. A `UserProvider` calls `useFetch('/api/user')` once and provides the result; `useUser()` becomes `useContext(UserContext)`.

(Fetching in a router loader or on the server and passing the data down is a third option.) Option 1 is usually the best because the cache also handles refresh, retries and updates.

</details>

## Recap
- A custom hook is a function whose name starts with `use` and that calls other hooks. It is a convention backed by the linter, not a React API.
- Hooks share **logic**, never **state**: every call gets its own state. To share state, lift it up, use Context, or use a store.
- Extract a hook on the second or third use, when a name makes code clearer, or when effect setup and cleanup belong together. Do not extract single-use code, and do not return JSX from a hook.
- The patterns to know cold: lazy init and `try/catch` for storage, cleanup in `useDebounce`, the latest-callback ref for timers and listeners, `AbortController` plus "result remembers its URL" for fetching, and `useSyncExternalStore` for browser values.
- `usePrevious` returns the value from the previous *render*; use a state pair if you need the previous *different* value.
- Good hook design: a clear name, an array return for few values and an object for many, stable function identities, cleanup for everything you start, an options object (depend on its primitives), and small hooks that compose.
- Test with `renderHook` and `act`, fake timers and a fake `fetch`. Test through a component when the behaviour is about what the user sees.
- Hooks beat HOCs and render props for sharing logic, but those still win when logic must render around a child. In real apps use TanStack Query for server data and a library for hard problems.

## Where to go next
- Next lesson: [Other hooks](09-other-hooks.md) (`useSyncExternalStore`, `useEffectEvent`, `useLayoutEffect`, `useId` and more).
- Review the pieces used here: [useEffect](03-useeffect.md), [useRef](04-useref.md), [Memoization](07-memoization.md), [useContext](05-usecontext.md).
- Sharing logic with components: [Component patterns](../03-intermediate/01-component-patterns.md). Fetching for real: [Data fetching](../03-intermediate/02-data-fetching.md). Testing in depth: [Testing React](../04-advanced/08-testing-react.md).
- Practice exercises: [Task list with storage](../practice-app/exercises/react/11-todo-advanced/README.md), [Autocomplete with debounce](../practice-app/exercises/react/12-autocomplete-debounce/README.md), [Dropdown with click outside](../practice-app/exercises/react/21-dropdown-click-outside/README.md), [Undo/redo hook](../practice-app/exercises/react/26-undo-redo-hook/README.md), [Mini query hook](../practice-app/exercises/react/27-mini-query-hook/README.md).
- Interview rounds: Round 2 hooks questions (planned) and [Round 4 machine coding](../05-interview-rounds/round-4-machine-coding/README.md).
- Quick reference: Hooks cheatsheet (planned).
