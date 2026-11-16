# The Other Hooks

> **Level:** Advanced   **Time:** about 60 minutes   **Read first:** [Hooks overview and rules](01-hooks-overview-and-rules.md), [useEffect](03-useeffect.md), [useRef](04-useref.md), [Memoization](07-memoization.md)

## What you will learn
- Choose between `useEffect` and `useLayoutEffect`, and explain how a layout effect removes a visible flicker.
- Build accessible, server-safe form fields with `useId`.
- Keep a screen responsive with `useTransition` and `useDeferredValue`, and explain how they differ from each other and from debouncing.
- Subscribe to data that lives outside React with `useSyncExternalStore`, and explain what "tearing" is.
- Say what `useInsertionEffect`, `useDebugValue`, `useImperativeHandle` and `useEffectEvent` are for, including the real status of `useEffectEvent`.
- Name every built-in hook by category, and pick the right one from a master table.

## 1. The big picture: where each hook fits

You already know the everyday hooks: `useState`, `useEffect`, `useRef`, `useContext`. This lesson covers the rest. Some of them fix problems that look tiny until you meet them (a flicker, a duplicate id). Some are mostly for people who write libraries. A few are new.

Here is the plan:

- **Useful in app code:** `useLayoutEffect`, `useId`, `useTransition`, `useDeferredValue`, `useEffectEvent`.
- **Mostly for libraries and shared code:** `useSyncExternalStore`, `useInsertionEffect`, `useDebugValue`, `useImperativeHandle`.
- **React 19 additions:** `useActionState`, `useOptimistic`, `useFormStatus`, and the `use` API. They get a short table here, because [React 19 and newer](../04-advanced/04-react-19-and-newer.md) owns them.

Several of these hooks are about **timing**, so you need three words first:

- **Render:** React calls your component function to find out what the screen should show. Nothing on the screen changes yet.
- **Commit:** React applies the result to the real DOM (the page's element tree).
- **Paint:** the browser draws the pixels on the screen.

Here is the order for one update:

```text
1. render           React calls your component. The screen is unchanged.
2. commit           React updates the real DOM.
                      - insertion effects run first   (useInsertionEffect)
                      - then layout effects run       (useLayoutEffect)
3. paint            The browser draws the new pixels.
4. passive effects  useEffect runs. Usually after paint.
                    (After a click or key press it may run earlier, before paint.)
```

I checked the order with a component that had all three kinds of effect, using React 19.3.1. The log was:

```text
render
insertion effect
layout effect
passive effect
```

One limit to know: the tests in the practice app run in jsdom, a fake browser that has no screen. It never paints, so a test cannot prove that something happened "before paint" or "after paint". Where a lesson below talks about paint, it comes from the React docs and from the order of events, not from a screenshot.

**Common mistake:** reaching for the special hook first.

```jsx
// WRONG: layout effects block painting, and fetching does not need layout
useLayoutEffect(() => {
  fetch('/api/user')
    .then((res) => res.json())
    .then(setUser)
}, [])
```

```jsx
// RIGHT: start with useEffect (and a cleanup, see the useEffect lesson)
useEffect(() => {
  const controller = new AbortController()
  fetch('/api/user', { signal: controller.signal })
    .then((res) => res.json())
    .then(setUser)
    .catch(() => {})
  return () => controller.abort()
}, [])
```

Why: `useLayoutEffect` runs before the browser can paint, so slow work inside it freezes what the user sees. Use it only when you must read or fix the layout before paint.

## 2. useLayoutEffect: measure before paint

`useLayoutEffect` has exactly the same shape as `useEffect`: `useLayoutEffect(setup, dependencies?)`, and `setup` may return a cleanup function. The only difference is **when it runs**. It runs right after React updates the DOM and **before the browser paints**.

Why would you want that? Sometimes you must **read the layout** (how big or where an element is) and then change something based on what you read. If you do the reading in `useEffect`, the browser may paint the wrong version first and then paint the fixed version one frame later. The user sees a jump. That jump is called a **flicker**.

```text
useEffect:         render -> commit -> PAINT (wrong place) -> effect -> render -> commit -> PAINT (right place)
useLayoutEffect:   render -> commit -> effect -> render -> commit -> PAINT (right place)
```

### 2.1 Example: a tooltip that sits above its target

To place a tooltip above a button, you need the tooltip's own height. You only know the height after the tooltip is in the DOM. So: render it, measure it, move it.

```jsx
import { useLayoutEffect, useRef, useState } from 'react'

function Tooltip({ targetRect, children }) {
  const ref = useRef(null)
  const [tooltipHeight, setTooltipHeight] = useState(0)

  useLayoutEffect(() => {
    // The DOM is updated, but the browser has not painted yet
    setTooltipHeight(ref.current.getBoundingClientRect().height)
  }, [children])

  // Put the tooltip just above the target
  const top = targetRect.top - tooltipHeight

  return (
    <div
      ref={ref}
      role="tooltip"
      style={{ position: 'absolute', top, left: targetRect.left }}
    >
      {children}
    </div>
  )
}

// Usage (in a real app, targetRect comes from button.getBoundingClientRect())
// <Tooltip targetRect={{ top: 100, left: 20 }}>Save your work</Tooltip>
```

**What happens, step by step:**
1. First render: `tooltipHeight` is `0`, so `top` is `100 - 0 = 100`. React puts the `div` in the DOM.
2. Before the browser paints, React runs the layout effect. It reads the real height from the DOM and calls `setTooltipHeight`.
3. React sees a state update that was scheduled inside a layout effect. It re-renders **right away**, still before the paint. Now `top` is `100 - 40 = 60` (if the tooltip is 40px tall).
4. The browser paints once. The user only ever sees the tooltip in its final place.

I ran this component with React 19.3.1. jsdom has no layout, so I replaced `getBoundingClientRect` with a fake that returns a height of 40. The renders logged `tooltipHeight=0`, then `tooltipHeight=40`, and the final style was `top: 60px; left: 20px`.

I also looked at how React labels the second render, using `<Profiler>`. When the state is set inside `useLayoutEffect`, the phases were `mount, nested-update`. When it is set inside `useEffect`, they were `mount, update`. A "nested update" is one that React flushes at once, in the same go as the commit that caused it. That is the "before paint" behaviour.

### 2.2 Example: an auto-growing textarea (no state at all)

A layout effect does not have to set state. It can change the DOM directly. This textarea grows with its text:

```jsx
import { useLayoutEffect, useRef } from 'react'

function AutoGrowTextarea({ value, onChange }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    el.style.height = 'auto' // shrink first, so scrollHeight is the true content height
    el.style.height = el.scrollHeight + 'px'
  }, [value])

  return <textarea ref={ref} value={value} onChange={onChange} rows={1} />
}
```

**What happens, step by step:**
1. The user types. The parent updates `value`, and React re-renders and commits.
2. Before paint, the effect resets the height, reads `scrollHeight` (the height the content needs), and sets the real height.
3. The browser paints the textarea already at the right size. With `useEffect` you could catch one frame at the old size.

(In my jsdom test I faked `scrollHeight` as 123, and the style became `123px`.)

### 2.3 See the flicker yourself (a browser-only demo)

You cannot see a flicker in a test, so try this in a real Vite app. The `slowDown` helper blocks the page on purpose, so the gap between the two paints is long enough to notice.

```jsx
import { useEffect, useState } from 'react'

function slowDown(ms) {
  const start = performance.now()
  while (performance.now() - start < ms) {
    // block the main thread on purpose
  }
}

export default function MovingBox() {
  const [left, setLeft] = useState(0)

  useEffect(() => {
    slowDown(300) // pretend measuring is slow
    setLeft(200)
  }, [])

  return (
    <div style={{ marginLeft: left, width: 80, height: 80, background: 'tomato' }} />
  )
}
```

With `useEffect`, you should see the box at the left edge first, then the page freezes for about 300 ms, then the box jumps to the right. Now change `useEffect` to `useLayoutEffect` (and the import) and reload. The page stays blank for about 300 ms, and the box then appears **already** in its final place. It never shows at the left edge.

Notes for this demo: the default Vite template wraps the app in `<StrictMode>`, which runs the effect twice in development, so you wait twice as long. That is normal. Browsers decide when to paint, so with a very small delay you might not catch the flicker. That is why the demo is slow on purpose. The demo also shows the price of a layout effect: it **blocks painting**, so slow work inside it freezes the screen.

### 2.4 Order of effects and cleanups

I logged a component with both kinds of effect and cleanups. Mount, update and unmount gave this order:

```text
Mount:     render, layout effect, passive effect
Update:    render, layout cleanup, layout effect, passive cleanup, passive effect
Unmount:   layout cleanup, passive cleanup
```

For a parent and a child on mount, the order is: parent render, child render, child layout effect, parent layout effect, child passive effect, parent passive effect. Children run first, and all layout effects run before any passive effect.

### 2.5 useLayoutEffect and server rendering

Old tutorials say: "`useLayoutEffect` warns when you render on the server, so write `useIsomorphicLayoutEffect`." That advice is out of date. I called `renderToString` on a component with a layout effect in React 19.3.1. There was no warning (no `console.error`, no `console.warn`), and the effect did not run, because effects never run on the server.

So the real rules are:
- Effects of every kind (layout, passive, insertion) do not run during server rendering. They run in the browser after the HTML arrives and React hydrates it.
- The server HTML contains whatever the **first render** produced. In the tooltip example that is the tooltip at `top: 100`. The layout effect fixes it after hydration.
- So design the first render to look acceptable (for example hidden until measured), or accept a small correction after hydration.

**Common mistake:** reading the layout during render.

```jsx
// WRONG: ref.current is null on the first render, so this crashes
function Box() {
  const ref = useRef(null)
  const height = ref.current.getBoundingClientRect().height
  return <div ref={ref}>Hello</div>
}
```

```jsx
// RIGHT: read the layout after the DOM exists, in a layout effect
function Box() {
  const ref = useRef(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    setHeight(ref.current.getBoundingClientRect().height)
  }, [])

  return <div ref={ref}>Hello (I am {height}px tall)</div>
}
```

Why: during render the DOM node does not exist yet, and reading layout in render is a side effect that breaks the "render must be pure" rule. Effects are the place for it.

**When to use `useLayoutEffect`:** measuring and positioning (tooltips, popovers, auto-size), restoring scroll position, and any fix for a flicker that you can actually see. **When not to:** data fetching, subscriptions, logging. Start with `useEffect`.

## 3. useId: unique ids that survive server rendering

Some HTML needs an id string to connect two elements: a `<label>` to its `<input>`, an input to the hint text that describes it (`aria-describedby`). `useId` gives your component a **unique, stable id string**.

Why not just write the id yourself?

- A fixed id such as `"email"` breaks the moment your component appears twice on a page. Two elements with the same id are invalid, and a label may focus the wrong input.
- A random id (`Math.random()`) breaks **server rendering**. The server makes one random id, the browser makes another, and React reports a hydration mismatch (the server HTML and the first browser render disagree).
- `useId` makes ids from the component's position in the tree. The server and the browser build the same tree, so they get the same id.

### 3.1 Example: a reusable text field

```jsx
import { useId } from 'react'

function TextField({ label, hint, error }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ')

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
      />
      {hint && <p id={hintId}>{hint}</p>}
      {error && (
        <p id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default function App() {
  return (
    <>
      <TextField label="Email" hint="We never share it." />
      <TextField label="Name" error="Name is required." />
    </>
  )
}
```

**What happens, step by step:**
1. Each `TextField` calls `useId()` once and gets its own id. In my run the two ids were `_r_0_` and `_r_1_` (your numbers can differ).
2. The `label` points at the input through `htmlFor={id}`. Clicking the label focuses the correct input. Testing Library's `getByLabelText('Email')` found the right input.
3. One id gives you many. Add a suffix for related elements: `${id}-hint`, `${id}-error`. You do not call `useId` once per id.
4. The hint is linked with `aria-describedby`. A screen reader reads the hint after the label. In my test the email input's accessible description was "We never share it." and the name input's was "Name is required."
5. The id stays the same on later renders. I re-rendered the component and the id did not change.

### 3.2 What the id looks like (and why you must not rely on it)

The format has changed twice, so treat it as **opaque**: never parse it, never hard-code it, never build a CSS selector by hand around it.

| React version | Client id | Server id |
|---|---|---|
| 19.0 | `:r0:` | `:R0:` |
| 19.1 | `«r0»` | `«R0»` |
| 19.2 and later (including 19.3.1) | `_r_0_` | `_R_0_` |

The newer underscore form is valid in CSS selectors and in `view-transition-name`. I confirmed `_r_0_` on the client, and `_R_0_` from `renderToString`. The capital `R` on the server and the lower-case `r` in the browser is expected. Hydrating server HTML that contains these ids gave no warning.

If you put several React apps on one page, give each root an `identifierPrefix` option (`createRoot(el, { identifierPrefix: 'app1-' })`) so their ids cannot collide.

### 3.3 useId is not a list key

An id from `useId` belongs to a **component's place in the tree**, not to a piece of data. A list key has a different job: it tells React which item is which when the list changes. Keys must come from your data.

**Common mistake:** using `useId` to make keys.

```jsx
// WRONG: a hook inside a loop breaks the Rules of Hooks, and an id is not a key
items.map((item) => {
  const id = useId()
  return <li key={id}>{item.name}</li>
})
```

```jsx
// RIGHT: the key comes from the data
items.map((item) => <li key={item.id}>{item.name}</li>)
```

Why: you may not call a hook inside a loop or a callback. And even if you could, a key made from position cannot follow an item when the list is reordered. Also do not use `useId` for cache keys or as a database id.

A second common mistake is the random id:

```jsx
// WRONG: different on the server and in the browser, and new on every render
const id = 'field-' + Math.random()
```

```jsx
// RIGHT
const id = useId()
```

## 4. useTransition and startTransition: mark an update as not urgent

By default, every state update is **urgent**. React renders it from start to finish, and the browser cannot respond to the user until React is done. If that render takes 200 ms (a big list, a heavy chart), the page freezes for 200 ms. The user clicks a tab, and the whole page feels stuck until the render ends.

A **transition** is an update that you mark as **not urgent**. React then:

- renders it in the background, in small slices (about 5 ms each), so the browser can still handle clicks and typing between slices;
- **throws away** a half-finished transition render if something urgent arrives (the user clicks or types), handles the urgent update first, and then restarts the transition;
- if content that is already on the screen would suspend again (Suspense), keeps showing the **old** content instead of a loading fallback.

You write it like this:

```jsx
const [isPending, startTransition] = useTransition()

startTransition(() => {
  setTab('posts') // this update is now a transition
})
```

`isPending` is `true` from the moment you start the transition until React commits the result. Use it to show feedback: a dimmed panel, a small spinner.

### 4.1 Example: tabs with a slow tab

To feel the difference you need something slow. The `PostRow` below burns about 1 ms per row on purpose (with the same `slowDown` helper as in section 2.3), so the Posts tab takes about 200 ms to render. This is a demo trick, not production code.

```jsx
import { useState, useTransition } from 'react'

function slowDown(ms) {
  const start = performance.now()
  while (performance.now() - start < ms) {
    // block the main thread on purpose
  }
}

function Home() {
  return <p>Welcome home.</p>
}

function Posts() {
  const rows = []
  for (let i = 0; i < 200; i++) {
    rows.push(<PostRow key={i} number={i} />)
  }
  return <ul>{rows}</ul>
}

function PostRow({ number }) {
  slowDown(1) // 200 rows x 1 ms = about 200 ms for the whole tab
  return <li>Post {number}</li>
}

export default function Tabs() {
  const [tab, setTab] = useState('home')
  const [isPending, startTransition] = useTransition()

  function selectTab(nextTab) {
    startTransition(() => {
      setTab(nextTab)
    })
  }

  return (
    <div>
      <button onClick={() => selectTab('home')}>Home</button>
      <button onClick={() => selectTab('posts')}>Posts</button>
      {isPending && <span role="status"> Loading...</span>}
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        {tab === 'home' ? <Home /> : <Posts />}
      </div>
    </div>
  )
}
```

**What happens, step by step:**
1. The user clicks "Posts". The click handler calls `startTransition(() => setTab('posts'))`.
2. React renders once right away with `tab` still `'home'` and `isPending` equal to `true`. The old tab stays on screen, dimmed, with "Loading..." beside it. This render is fast.
3. In the background React renders the Posts tab in slices. The buttons stay clickable during this time. If the user clicks "Home" now, React drops the half-built Posts render and handles the click.
4. When the Posts render is complete, React commits it: `tab` is `'posts'`, `isPending` is `false`, and the new tab appears.

I ran a small version of this (no artificial delay, so the test is fast) and logged every render of `Tabs` and what the panel showed at each commit:

```text
render tab=home pending=false      (first render)
--- click Posts
render tab=home pending=true       panel still shows "Home content"
render tab=posts pending=false     panel shows "Posts content"
```

Without `startTransition`, the same click gave a single render, `tab=posts`, and the old tab disappeared at once (the page freezes while the slow tab renders).

### 4.2 startTransition without the hook

`react` also exports a plain `startTransition` function. It does the same marking but gives you no `isPending`. Use it when you are outside a component (for example in a library or a router) or when you do not need pending feedback.

```jsx
import { startTransition } from 'react'

function onSelect(nextTab) {
  startTransition(() => {
    setTab(nextTab)
  })
}
```

### 4.3 Async functions in transitions (React 19)

Since React 19 the function you pass can be `async`. React keeps `isPending` true until the whole async function finishes. These are called **Actions**. There is one catch: state updates you make **after an `await`** are no longer inside the transition. Wrap them in another `startTransition`.

```jsx
import { startTransition, useState, useTransition } from 'react'

function SaveButton() {
  const [savedCount, setSavedCount] = useState(0)
  const [isPending, startSaving] = useTransition()

  function save() {
    startSaving(async () => {
      await saveToServer() // your own async function; isPending stays true while we wait
      // After an await we are outside the transition, so mark this update again
      startTransition(() => {
        setSavedCount((n) => n + 1)
      })
    })
  }

  return (
    <button disabled={isPending} onClick={save}>
      {isPending ? 'Saving...' : 'Save'} ({savedCount})
    </button>
  )
}
```

I ran this with a fake 30 ms save. After the click the renders were `saved=0 pending=true`, then `saved=1 pending=false`. More on Actions in [React 19 and newer](../04-advanced/04-react-19-and-newer.md).

### 4.4 Rules and limits of transitions

- **The function runs immediately and must set state synchronously.** Updates made in a `setTimeout` inside `startTransition` are not transitions. I tested it: `isPending` flashed `true` and `false` at once, and the `setTimeout` update arrived later as a normal update.
- **A transition only helps when React rendering is the slow part.** If you wait for the network, a transition does not make it faster. (Use Suspense, caching or a query library.)
- **You cannot use a transition to control a text input.** See the mistake below.
- **A transition is not a delay.** It starts rendering at once. It simply lets urgent work go first.
- For more (how Suspense and transitions work together, time slicing), see [Concurrent React and Suspense](../04-advanced/03-concurrent-react-and-suspense.md).

**Common mistake:** putting the input's own state into the transition.

```jsx
// WRONG: the input value is now a non-urgent update, so typing can lag or feel broken
function Search() {
  const [text, setText] = useState('')
  const [, startTransition] = useTransition()
  return (
    <input
      value={text}
      onChange={(e) => {
        const value = e.target.value
        startTransition(() => setText(value))
      }}
    />
  )
}
```

```jsx
// RIGHT: two states. The input follows the keyboard at once; the list may lag.
function FilterList({ items }) {
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleChange(event) {
    const value = event.target.value
    setText(value) // urgent: the input must follow the keyboard
    startTransition(() => {
      setQuery(value) // not urgent: the list may lag behind
    })
  }

  const visible = items.filter((item) => item.toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <input aria-label="Filter" value={text} onChange={handleChange} />
      {isPending && <span role="status">Updating...</span>}
      <ul style={{ opacity: isPending ? 0.6 : 1 }}>
        {visible.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
```

Why: a typed character must appear at once. React docs say a controlled input cannot be driven by a transition, because input events need a synchronous update. (In a Testing Library test the wrong version still passes, because `act` flushes everything. The problem only shows in a real browser with a slow tree.) With two states, the render log after typing "a" was:

```text
render text="a" query=""  pending=true     (the input already shows "a")
render text="a" query="a" pending=false    (the list catches up)
```

## 5. useDeferredValue: a copy of a value that lags behind

Sometimes you do not own the code that sets the state. A value just **arrives**, for example as a prop. You still want the slow part of the screen to lag instead of freezing the page.

`useDeferredValue(value)` returns a **deferred copy** of `value`:

- On an update, React first re-renders with the **old** deferred value (fast, so the urgent part of the screen updates at once).
- Then it re-renders again in the background with the **new** value.
- If `value` changes again during that background render, React abandons it and starts over with the newest value.

### 5.1 Example: a search page

```jsx
import { memo, useDeferredValue, useState } from 'react'

function slowDown(ms) {
  const start = performance.now()
  while (performance.now() - start < ms) {
    // block the main thread on purpose
  }
}

const ALL_ITEMS = Array.from({ length: 300 }, (_, i) => `Product ${i + 1}`)

const ResultList = memo(function ResultList({ query }) {
  const q = query.toLowerCase()
  const matches = ALL_ITEMS.filter((item) => item.toLowerCase().includes(q))
  return (
    <ul>
      {matches.map((item) => (
        <Row key={item} text={item} />
      ))}
    </ul>
  )
})

function Row({ text }) {
  slowDown(1) // fake cost: 1 ms per row
  return <li>{text}</li>
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery

  return (
    <div>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div style={{ opacity: isStale ? 0.5 : 1 }}>
        <ResultList query={deferredQuery} />
      </div>
    </div>
  )
}
```

**What happens, step by step:**
1. The user types "a". `query` becomes `"a"`. `deferredQuery` is still `""` for now.
2. React renders `SearchPage` with `query="a"` and `deferredQuery=""`. The input shows "a" at once. `isStale` is `true`, so the list is dimmed. `ResultList` receives the same `query` as before (`""`), and because it is wrapped in `memo`, React **skips** it. This pass is fast.
3. React starts a second render in the background, where `deferredQuery` is `"a"`. Now `ResultList` really renders.
4. If the user types "p" before step 3 is done, React drops that background render and starts again with `"ap"`.
5. When it finishes, the list shows the results, `isStale` is `false`, and the dimming goes away.

The log from my run (5 items instead of 300, typing "a"):

```text
SearchPage render query="a" deferred=""  stale=true
SearchPage render query="a" deferred="a" stale=false
ResultList render query="a"
```

`ResultList` did not render during the first pass. It rendered once, with the settled value.

**The `memo` matters.** I removed `memo` from `ResultList` and typed "a" again. The list rendered in **both** passes (first with the old `""`, then with `"a"`). So the slow work ran for every keystroke, and the deferred value saved nothing. The deferred value only helps if the slow child can skip rendering when its props have not changed. (A React Compiler build can do that for you; see [Memoization](07-memoization.md).)

### 5.2 The `initialValue` argument (React 19)

`useDeferredValue(value, initialValue)` takes an optional second argument. On the **first render**, the hook returns `initialValue`. Then React immediately re-renders in the background with the real `value`.

```jsx
function Preview({ text }) {
  const shown = useDeferredValue(text, '...')
  console.log(`text="${text}" shown="${shown}"`)
  return <p>{shown}</p>
}

// <Preview text="hello" />
```

The log:

```text
text="hello" shown="..."
text="hello" shown="hello"
```

Use it to show a cheap placeholder on the first paint when the real content is expensive. Without the second argument, the first render returns the value itself (one render, no lag).

### 5.3 Two details to remember

- Pass **primitive** values (strings, numbers) or objects created **outside** rendering. If you build a new object inside render and pass it in, it is "different" on every render, and React keeps re-rendering in the background for nothing.
- It does **not** promise fewer network requests (the React docs say so). It has no timer, so if you fetch using the deferred value you can still send many requests. See the next section.

**Common mistake:** deferring a value but not memoizing the slow child.

```jsx
// WRONG: ResultList is not memoized, so it re-renders on every keystroke anyway
function ResultList({ query }) { /* slow work */ }
```

```jsx
// RIGHT
const ResultList = memo(function ResultList({ query }) { /* slow work */ })
```

Why: when a parent re-renders, a normal child re-renders too. `memo` lets the child skip the urgent pass, which is the whole point.

## 6. useTransition vs useDeferredValue vs debounce

All three are about "do not let a slow update block the typing". They work in different ways.

| | `useTransition` / `startTransition` | `useDeferredValue` | Debounce |
|---|---|---|---|
| What you wrap | The code that **sets** state | A **value** you read | A function call or a value, with a timer |
| Needs the setter? | Yes | No, it works on props | Depends on how you build it |
| Gives you | `isPending` | Compare old and new to know it is stale | Nothing |
| Fixed delay? | No | No | Yes (for example 300 ms) |
| Can React interrupt it? | Yes | Yes | No, once the timer fires the work is urgent |
| Fewer network requests? | No guarantee | No guarantee | Yes, that is its job |

How to choose:

- **You own the `setState` call** (you can wrap it): `startTransition`. You also get `isPending`.
- **The value comes from outside** (a prop, or a hook you cannot edit): `useDeferredValue`.
- **You want fewer requests or fewer expensive calls**: debounce (see `useDebounce` in [Custom hooks](08-custom-hooks.md), and the [autocomplete exercise](../practice-app/exercises/react/12-autocomplete-debounce/README.md)). A debounce waits a fixed time after the last change. That delay is there even on a fast computer, and when the timer fires the heavy render is urgent and can still freeze the page.
- They combine well. For a search box: debounce the value that goes into the request, and defer the value that goes into the heavy list.

**Common mistake:** using a deferred value or a transition as a replacement for debouncing a request.

```jsx
// WRONG: there is no timer here, so this can still send a request for many keystrokes
const deferredQuery = useDeferredValue(query)
useEffect(() => {
  fetchResults(deferredQuery)
}, [deferredQuery])
```

```jsx
// RIGHT: debounce what goes into the request (useDebounce is in the Custom hooks lesson)
const debouncedQuery = useDebounce(query, 300)
useEffect(() => {
  fetchResults(debouncedQuery)
}, [debouncedQuery])
```

Why: `useDeferredValue` and transitions decide **when React renders**. They do not decide **when you call a server**. Only a timer (debounce) or a smarter data layer can cut requests. (The effect should also clean up stale requests; see [useEffect](03-useeffect.md).)

## 7. useSyncExternalStore: reading data that lives outside React

React state lives inside React. But a lot of data does not:

- a global store (your own, or from a library),
- browser APIs: `navigator.onLine`, `window.matchMedia`, scroll position,
- a third-party widget that keeps its own state.

We call these **external stores**. They can change at any moment, and React is not told. To show them in a component, you must **subscribe** to changes and re-render.

### 7.1 The old way and its problems

```jsx
import { useEffect, useState } from 'react'

function useOnlineStatusOld() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    function update() {
      setIsOnline(navigator.onLine)
    }
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return isOnline
}
```

This works in simple apps, but:
- The **first render shows `true`** even if the browser is offline. The correct value arrives one render later. I made `navigator.onLine` return `false` and logged what the component saw: `[true, false]`. The user may see "Online" for a moment.
- With concurrent rendering, different components can read **different versions** of the store during one render (see "tearing" below).
- It does not give you a clean answer for server rendering.

This is why the React docs list "subscribing to an external store" as a case where you should not write your own effect (see "You might not need an effect" in [useEffect](03-useeffect.md)).

### 7.2 The hook

```jsx
const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)
```

| Argument | What it is | Rules |
|---|---|---|
| `subscribe(callback)` | Registers `callback` to be called whenever the store changes. Returns an **unsubscribe** function. | Must be a **stable** function (define it outside the component, or memoize it). |
| `getSnapshot()` | Returns the current value of the store. | Cheap. Must return the **same value** while nothing changed (React compares with `Object.is`). |
| `getServerSnapshot()` | The value to use while rendering on the server and while hydrating. | Required if the component is rendered on the server. Must be the same on the server and on the first client render. |

The word **snapshot** means "the value of the store right now". React asks for it during render and again before committing.

### 7.3 Example: online status

```jsx
import { useSyncExternalStore } from 'react'

function subscribe(callback) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot() {
  return navigator.onLine
}

function getServerSnapshot() {
  return true // the server cannot know; assume online
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function StatusBar() {
  const isOnline = useOnlineStatus()
  return <p>{isOnline ? 'Online' : 'Offline'}</p>
}
```

**What happens, step by step:**
1. On the first render React calls `getSnapshot()` and gets the **real** value (`navigator.onLine`). No wrong first frame.
2. After the commit, React calls `subscribe` with its own callback. We attach it to the browser's `online` and `offline` events.
3. The browser fires `offline`. Our listener calls React's callback. React calls `getSnapshot()` again, sees the value changed from `true` to `false`, and re-renders.
4. On unmount, React calls the function that `subscribe` returned, and the listeners are removed.

My test (React 19.3.1, with `navigator.onLine` faked): the component showed "Online"; after an `offline` event it re-rendered and showed "Offline"; after an `online` event it showed "Online" again. Two listeners were added, and two were removed on unmount. For server rendering I faked a browser that was offline and called `renderToString`: the HTML was `<p>Online</p>`, because the server uses `getServerSnapshot`.

### 7.4 Example: a tiny store (a mini Zustand)

This is the idea behind many state libraries. First the store, with no React in it:

```js
// store.js
export function createStore(initialState) {
  let state = initialState
  const listeners = new Set()

  return {
    getState: () => state,
    setState(update) {
      const next = typeof update === 'function' ? update(state) : update
      if (Object.is(next, state)) return // nothing changed, tell nobody
      state = next
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
```

Then a hook with a **selector** (a function that picks the part of the state a component needs):

```jsx
import { useSyncExternalStore } from 'react'
import { createStore } from './store.js'

const counterStore = createStore({ count: 0, name: 'Ann' })

function useStore(store, selector) {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()))
}

function Count() {
  const count = useStore(counterStore, (state) => state.count)
  return (
    <button onClick={() => counterStore.setState((s) => ({ ...s, count: s.count + 1 }))}>
      Count: {count}
    </button>
  )
}

function Name() {
  const name = useStore(counterStore, (state) => state.name)
  return <p>Name: {name}</p>
}

export default function App() {
  return (
    <>
      <Count />
      <Name />
    </>
  )
}
```

**What happens, step by step:**
1. `store.subscribe` is the same function on every render, so React subscribes once.
2. The `getSnapshot` function (`() => selector(...)`) is a new function each render. That is fine: React calls it and compares the **result**, not the function.
3. A click calls `setState` with a **new object**. All listeners run. Each hooked component asks its `getSnapshot` again.
4. `Count` sees `count` changed (0 to 1) and re-renders. `Name` sees the same `'Ann'`, so React does not re-render it.

My render counts (a render counter in each component): after mount, `Count` 1 and `Name` 1. After one click: `Count` 2, `Name` 1. After changing the name: `Count` 2, `Name` 2. Calling `setState` with the very same object caused no render at all.

You can build a full version of this in the [mini Redux store exercise](../practice-app/exercises/react/32-mini-redux-store/README.md). The [mini query hook exercise](../practice-app/exercises/react/27-mini-query-hook/README.md) uses the same idea for a cache.

### 7.5 The two classic mistakes

**Mistake 1: `getSnapshot` returns a new object each time.**

```jsx
// WRONG: a new object on every call, so React thinks the store changed every time
const value = useSyncExternalStore(store.subscribe, () => ({ count: store.getState().count }))
```

```jsx
// RIGHT: return a value that stays the same while the store is unchanged
const count = useSyncExternalStore(store.subscribe, () => store.getState().count)
```

I ran the wrong version. React logged "The result of getSnapshot should be cached to avoid an infinite loop", then threw "Maximum update depth exceeded", and nothing rendered. A selector must return a primitive or an existing object from the store, not a freshly built one.

**Mistake 2: an unstable `subscribe` function.**

```jsx
// WRONG: a new subscribe function on every render,
// so React unsubscribes and subscribes again after every render
function Counter() {
  const state = useSyncExternalStore((callback) => store.subscribe(callback), store.getState)
  return <p>{state.count}</p>
}
```

```jsx
// RIGHT: pass a stable function (store.subscribe, or one defined outside the component)
function Counter() {
  const state = useSyncExternalStore(store.subscribe, store.getState)
  return <p>{state.count}</p>
}
```

I counted `subscribe` calls. With the inline function: 1 call on mount and 3 after two re-renders. With the stable function: 1 call in total. If `subscribe` must depend on a prop (like a media query string), wrap it in `useCallback`.

### 7.6 Why it exists: tearing

**Tearing** means the screen shows **two versions of the same data at once**. It can happen with concurrent rendering (transitions, deferred values), because React may **pause** in the middle of rendering a large tree to let the browser breathe.

```text
Time ->        start                    pause                              after the pause
React:         renders the first rows   (browser runs other code)          renders the remaining rows
Outside:                                the store changes from 0 to 1
Direct read:   first rows show 0                                           remaining rows show 1    <- torn
```

A direct read looks like this:

```jsx
// Reads an external store during render without a subscription. This can tear.
function Row({ id }) {
  const value = store.getState().value
  return <li>{value}</li>
}
```

I built the experiment: 20 rows, each costing 2 ms, rendered in a transition, with a timer that changed the store from 0 to 1 while React was paused. With the direct read, the first row showed `0` and the other 19 showed `1`. The screen was torn. With `useSyncExternalStore`, all 20 rows showed `1`. React noticed the store changed before committing, threw away the work, and rendered again (the first row's render function ran 3 times). Timing varies from computer to computer, so the number of old rows can differ, but a direct read can end up with a mix of old and new rows.

So `useSyncExternalStore` makes two promises:
- React checks `getSnapshot` again **before it commits**. If the value changed, it re-renders synchronously, so every component shows the same version.
- Updates that come from a store are always **urgent**. You cannot mark them as transitions. That is the price of consistency.

### 7.7 Server rendering and hydration

If a component using `useSyncExternalStore` is rendered on the server, you **must** pass `getServerSnapshot`. I called `renderToString` without it and React threw: "Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering."

`getServerSnapshot` must return the **same value on the server and during the first client render (hydration)**. If the real client value differs (the user is offline), React hydrates with the server value and then re-renders with the real one.

### 7.8 When to use it

- **Yes:** browser APIs (online status, media queries, scroll or window size, `document.visibilityState`), third-party non-React stores, and writing your own state library.
- **No:** your normal component state. Use `useState`, `useReducer` or context. For a shared app-wide store, state libraries use this hook internally to connect to React, so you normally use their hooks instead of writing this yourself.

## 8. useInsertionEffect: for CSS-in-JS library authors

`useInsertionEffect` is the earliest effect. It runs **before** layout effects, so it can put styles in the page before anything reads the layout.

It was made for one audience: authors of **CSS-in-JS libraries** that create CSS rules at runtime and inject `<style>` tags. In an app, you will almost never write it.

Why the library needs it:
- Injecting styles during **render** is a side effect, and render must be pure.
- Injecting in `useEffect` is **too late**: the browser may paint the unstyled element first.
- Injecting in `useLayoutEffect` is **too late for other layout effects**: they may read the layout before the rule exists, which forces the browser to recompute styles.

```jsx
import { useInsertionEffect } from 'react'

function useGlobalStyle(css) {
  useInsertionEffect(() => {
    const tag = document.createElement('style')
    tag.textContent = css
    document.head.appendChild(tag)
    return () => tag.remove()
  }, [css])
}

function Badge() {
  useGlobalStyle('.badge { background-color: gold; padding: 4px 8px; }')
  return <span className="badge">New</span>
}
```

**What happens, step by step:**
1. React renders `Badge` and puts the `<span>` into the DOM.
2. The insertion effect runs and adds a `<style>` tag with the rule to `<head>`.
3. Layout effects run next. The rule already exists, so anything they measure is styled.
4. On unmount (or when `css` changes), the cleanup removes the tag.

I checked the order: render, insertion effect, layout effect, passive effect. In a layout effect, `getComputedStyle` of the badge already returned `rgb(255, 215, 0)` (gold), and after unmount there were zero style tags left. A real library would also cache rules and avoid duplicates; this toy injects one tag per component.

Facts to remember:
- It does **not** run on the server.
- Refs are not attached yet when it runs (`ref.current` is `null`). Do not try to measure here.
- Do not set state inside it. I tried: React logged "useInsertionEffect must not schedule updates."
- Do not use it for anything except injecting style rules.

**Common mistake:** using it in app code for general DOM work.

```jsx
// WRONG: this is not what insertion effects are for
useInsertionEffect(() => {
  document.title = title
}, [title])
```

```jsx
// RIGHT
useEffect(() => {
  document.title = title
}, [title])
```

Why: only style injection needs to run before layout. Everything else belongs in `useEffect` (or `useLayoutEffect` if you must read layout).

## 9. useDebugValue: a label for custom hooks in DevTools

`useDebugValue(value, format?)` does not change what your component shows. It adds a **label** next to your custom hook in the React DevTools "Components" panel, so you can see the hook's current value at a glance.

```jsx
import { useDebugValue, useSyncExternalStore } from 'react'

function useOnlineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  useDebugValue(isOnline ? 'Online' : 'Offline')
  return isOnline
}
```

(`subscribe`, `getSnapshot` and `getServerSnapshot` are the functions from section 7.3.)

In DevTools, selecting a component that uses this hook shows a row such as `OnlineStatus: "Online"` instead of just `true`. I cannot show DevTools in a test, but I ran the component and it rendered exactly as before.

The second argument is an optional **format function**. Use it when formatting is expensive, so React only runs it when you inspect the hook:

```jsx
useDebugValue(date, (d) => d.toISOString())
```

I counted calls to a format function in a normal render with no DevTools attached: zero.

Use `useDebugValue` in **shared** hooks and library hooks, especially when the raw value is hard to read. Do not add it to every custom hook; it adds noise.

**Common mistake:** doing expensive formatting in the first argument.

```jsx
// WRONG: this expression runs on every render, even when nobody has DevTools open
useDebugValue(JSON.stringify(bigObject, null, 2))
```

```jsx
// RIGHT: pass the raw value and a format function, which only runs when you inspect the hook
useDebugValue(bigObject, (value) => JSON.stringify(value, null, 2))
```

Why: the first argument is an ordinary expression, so JavaScript evaluates it on every render. The format function is only called when DevTools asks for it.

## 10. useImperativeHandle: choose what the parent can reach

Normally, if a parent holds a `ref` to your component, it gets the raw DOM node and can do anything to it. `useImperativeHandle(ref, createHandle, dependencies?)` lets you hand out a **small, custom object** instead, with only the methods you choose.

This hook is covered with refs in [useRef](04-useref.md). Here is the short version for React 19, where `ref` is an ordinary prop (no `forwardRef` needed):

```jsx
import { useImperativeHandle, useRef } from 'react'

function FancyInput({ ref, ...props }) {
  const inputRef = useRef(null)

  useImperativeHandle(
    ref,
    () => ({
      focus() {
        inputRef.current.focus()
      },
      clear() {
        inputRef.current.value = ''
      },
    }),
    [],
  )

  return <input ref={inputRef} {...props} />
}

function Form() {
  const fancyRef = useRef(null)
  return (
    <div>
      <FancyInput ref={fancyRef} defaultValue="hello" aria-label="Name" />
      <button onClick={() => fancyRef.current.focus()}>Focus</button>
      <button onClick={() => fancyRef.current.clear()}>Clear</button>
    </div>
  )
}
```

**What happens, step by step:**
1. `Form` creates `fancyRef` and passes it to `FancyInput` as the `ref` prop.
2. `FancyInput` keeps its own `inputRef` for the real `<input>`.
3. `useImperativeHandle` sets `fancyRef.current` to the object `{ focus, clear }`, not to the DOM node.
4. The parent can call `focus()` and `clear()`. In my run `Object.keys(fancyRef.current)` was `["focus", "clear"]`, `fancyRef.current.value` was `undefined`, "Focus" moved focus to the input, and "Clear" emptied it.

The handle is rebuilt only when the dependencies change (an empty array means once).

**When to use it:** a few imperative actions that props cannot express well: `focus()`, `scrollTo()`, `play()`, `reset()`. **When not to:** anything that can be a prop or state. "Open this modal" should be an `open` prop, not a `modal.open()` method.

**Common mistake:** using it to let the parent read or set the child's state.

```jsx
// WRONG: the parent reaches into the child to change its state
useImperativeHandle(ref, () => ({ setValue }), [])
```

```jsx
// RIGHT: lift the state up and pass value and onChange as props
function Child({ value, onChange }) { /* ... */ }
```

Why: data should flow down in props. A handle is for commands, not for sharing data.

## 11. useEffectEvent: read the latest values without re-running the effect

**Status first:** `useEffectEvent` is **stable since React 19.2** (October 2025) and is in React 19.3.1. Older tutorials call it "experimental" or "canary only". That is out of date. It does **not** exist in React 18 or in early React 19.

The problem it solves: an effect should only re-run when its **real** dependencies change, but some code inside it needs the **latest** props or state. If you list that value in the dependencies, the effect restarts too often. If you leave it out, the effect reads an old value (a stale closure).

The full story of stale closures is in [useEffect](03-useeffect.md#8-stale-closures-in-effects). Here is a different example, a ticker whose `step` can change while it runs:

```jsx
import { useEffect, useEffectEvent, useState } from 'react'

function Ticker({ step }) {
  const [count, setCount] = useState(0)

  const onTick = useEffectEvent(() => {
    setCount((c) => c + step) // always sees the latest step
  })

  useEffect(() => {
    const id = setInterval(() => {
      onTick()
    }, 1000)
    return () => clearInterval(id)
  }, []) // the timer does not depend on step

  return <p>{count}</p>
}

// Usage: <Ticker step={1} />, and let the parent change step later
```

**What happens, step by step:**
1. The effect starts one interval timer when the component mounts.
2. Every second the timer calls `onTick()`. React makes sure `onTick` runs the **latest** version of the function, so it sees the current `step`.
3. When the parent changes `step`, the effect does **not** re-run. The timer keeps its rhythm.
4. The next tick uses the new `step`.

I ran it with fake timers. With `step={1}` the count was 2 at 2.5 seconds. I changed `step` to 10 at 2.5 seconds. At 3 seconds (the next tick) the count was 12, and `setInterval` had been called once. For comparison:
- With `step` in the dependency array (`[step]`), the timer restarted at 2.5 s, so at 3 s the count was still 2 and the next tick came at 3.5 s. `setInterval` was called twice.
- With an empty array and `step` read directly inside the interval (a stale closure), the timer kept adding the old `1` forever. In that run the count at 3 seconds was 3, even though `step` had become 10.

Rules for effect events (from the React docs):
- Call `useEffectEvent` at the top level of a component or custom hook.
- Call the function it returns **only from inside an effect** (`useEffect`, `useLayoutEffect`, `useInsertionEffect`) or from another effect event.
- Do **not** pass it to a child component or another hook, and do **not** put it in a dependency array. Its identity changes on every render on purpose.
- Do **not** use it just to silence the `exhaustive-deps` lint rule. If the value is a real reason for the effect to re-run (like `roomId` in a chat connection), it must stay a dependency.

**Common mistake:** hiding a real dependency inside an effect event.

```jsx
// WRONG: roomId decides which room we join, but it is hidden inside the event,
// so the effect never re-runs (and never disconnects) when the room changes
const onJoin = useEffectEvent(() => {
  createConnection(roomId).connect()
})
useEffect(() => {
  onJoin()
}, [])
```

```jsx
// RIGHT: roomId is why the effect runs, so it is a dependency. Only theme is "just read".
const onConnected = useEffectEvent(() => showToast('Connected', theme))
useEffect(() => {
  const connection = createConnection(roomId)
  connection.on('connected', () => onConnected())
  connection.connect()
  return () => connection.disconnect()
}, [roomId])
```

Why: ask "should this effect run again when this value changes?" If yes, it is a dependency. If no, it can be read through an effect event.

## 12. The React 19 hooks and APIs (short table)

React 19 added hooks and APIs for **forms and Actions** (functions that run inside a transition and may be async). They are explained in full in [React 19 and newer](../04-advanced/04-react-19-and-newer.md). This table is a memory aid.

| API | Import from | What it does | Remember |
|---|---|---|---|
| `use` | `react` | Reads a promise or a context during render | **Not a hook.** It may be called inside `if` and loops, but not inside `try/catch`. The promise must be stable (from a cache, a framework or a Server Component), not created during render. |
| `useActionState` | `react` | State produced by an Action, plus a pending flag | Returns `[state, formAction, isPending]`. It used to be called `useFormState`. |
| `useFormStatus` | `react-dom` | Tells you whether the parent `<form>` is submitting | Must be called by a component **rendered inside** the form. |
| `useOptimistic` | `react` | Shows a temporary value while an Action runs | The setter must be called inside an Action or transition. When the Action ends, the UI goes back to the real value. |
| `startTransition(async () => ...)` | `react` | An Action: an async transition | State updates after an `await` need their own `startTransition` (section 4.3). |

**Common mistake:** calling `useFormStatus` in the component that renders the `<form>`.

```jsx
// WRONG: this component is not inside the form it renders, so pending is never true
function Signup() {
  const { pending } = useFormStatus()
  return (
    <form action={saveUser}>
      <button disabled={pending}>Save</button>
    </form>
  )
}
```

```jsx
// RIGHT: read it in a child that is rendered inside the form
function SubmitButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>Save</button>
}

function Signup() {
  return (
    <form action={saveUser}>
      <SubmitButton />
    </form>
  )
}
```

Why: `useFormStatus` reads the status of the nearest parent form, like context does. A component cannot be its own parent.

## 13. Master table: every built-in hook

How many are there? The React 19.3 docs list **18 hooks** in the `react` package and **1** in `react-dom` (`useFormStatus`), so **19 hooks** in total. `use` is an API that looks like a hook, but the docs say it is not one. React 18 had 15. React 19 added `useActionState` and `useOptimistic` (19.0), `useFormStatus` in `react-dom` (19.0), and `useEffectEvent` (19.2).

| Hook | From | What it is for | Reach for it when | Lesson |
|---|---|---|---|---|
| **State** | | | | |
| `useState` | react | Local state | A value changes over time and the UI depends on it | [useState](02-usestate-in-depth.md) |
| `useReducer` | react | State changed by a reducer function | Many related fields, or named actions | [useReducer](06-usereducer.md) |
| **Context** | | | | |
| `useContext` | react | Read the nearest context value | You want shared data without passing props down | [useContext](05-usecontext.md) |
| **Refs** | | | | |
| `useRef` | react | A box that survives renders and does not cause a render | You need a DOM node, a timer id, or the previous value | [useRef](04-useref.md) |
| `useImperativeHandle` | react | Customise what a ref exposes | A parent must call `focus()` or `scrollTo()` on your component (rare) | [section 10](#10-useimperativehandle-choose-what-the-parent-can-reach) |
| **Effects** | | | | |
| `useEffect` | react | Sync with an outside system after render | Fetching, subscriptions, timers, analytics | [useEffect](03-useeffect.md) |
| `useLayoutEffect` | react | Same, but before paint | You measure layout and see a flicker | [section 2](#2-uselayouteffect-measure-before-paint) |
| `useInsertionEffect` | react | Run before layout effects | You write a CSS-in-JS library | [section 8](#8-useinsertioneffect-for-css-in-js-library-authors) |
| `useEffectEvent` | react (19.2) | Non-reactive logic called from effects | An effect needs the latest value without re-running | [section 11](#11-useeffectevent-read-the-latest-values-without-re-running-the-effect) |
| **Performance** | | | | |
| `useMemo` | react | Cache a calculation | An expensive calculation, or a stable object for a `memo` child | [Memoization](07-memoization.md) |
| `useCallback` | react | Cache a function | A stable function for a `memo` child or a dependency | [Memoization](07-memoization.md) |
| `useTransition` | react | Mark an update as not urgent, with `isPending` | A click starts a slow render and you own the `setState` | [section 4](#4-usetransition-and-starttransition-mark-an-update-as-not-urgent) |
| `useDeferredValue` | react | A lagging copy of a value | A slow render is caused by a value you did not set | [section 5](#5-usedeferredvalue-a-copy-of-a-value-that-lags-behind) |
| **Other** | | | | |
| `useDebugValue` | react | A label in DevTools | You ship a shared custom hook | [section 9](#9-usedebugvalue-a-label-for-custom-hooks-in-devtools) |
| `useId` | react | A unique id that is safe for server rendering | You link a label, an input and a hint | [section 3](#3-useid-unique-ids-that-survive-server-rendering) |
| `useSyncExternalStore` | react | Subscribe to a store outside React | Browser APIs, external stores, library code | [section 7](#7-usesyncexternalstore-reading-data-that-lives-outside-react) |
| **React 19: Actions and forms** | | | | |
| `useActionState` | react (19) | State from an Action, plus pending | A form submit produces a result or an error | [React 19](../04-advanced/04-react-19-and-newer.md) |
| `useOptimistic` | react (19) | A temporary value during an Action | You want instant feedback before the server answers | [React 19](../04-advanced/04-react-19-and-newer.md) |
| `useFormStatus` | react-dom (19) | Status of the parent form | A submit button inside a form needs to know if it is submitting | [React 19](../04-advanced/04-react-19-and-newer.md) |
| `use` (not a hook) | react (19) | Read a promise or a context | You need to read it conditionally, or read a promise | [React 19](../04-advanced/04-react-19-and-newer.md) |

Quick symptom guide:
- "My input lags because the list under it is slow": `useTransition` (you own the setter) or `useDeferredValue` (you only get a value), plus `memo` on the slow child.
- "I see a one-frame jump after measuring": `useLayoutEffect`.
- "Two inputs got the same id" or "hydration mismatch on ids": `useId`.
- "I need data from a store or a browser API": `useSyncExternalStore`.
- "My effect restarts too often because it reads a value that should not restart it": `useEffectEvent`.
- "I want a clearer name for my hook in DevTools": `useDebugValue`.

## How interviewers test this

- **Timing and purpose, not just names.** A strong answer to "`useEffect` vs `useLayoutEffect`" explains the order (render, commit, layout effect, paint, passive effect), gives a real use (measuring a tooltip) and a cost (it blocks paint). A red flag is "`useLayoutEffect` is just a faster `useEffect`".
- **Choosing between look-alikes.** `useTransition` vs `useDeferredValue` vs debounce is a favourite. Strong answers say who owns the setter, that neither needs a fixed delay, that both can be interrupted, and that only a debounce (or a smarter data layer) is meant to cut requests. A red flag is "it makes the code run faster". It does not; it reorders work.
- **`useSyncExternalStore` depth.** The best answers mention tearing, why `getSnapshot` must return a cached value, and `getServerSnapshot`. A red flag is rebuilding it with `useState` and `useEffect` without noticing the first-render and tearing problems.
- **Currency.** `useEffectEvent` is stable since 19.2; `useFormState` became `useActionState`; the `useId` format is opaque; `useLayoutEffect` no longer warns on the server. Calling `useEffectEvent` "experimental" shows old study material.
- **Counting and classifying.** Can you name the hooks by category, and know that `use` is not a hook? Can you say which hooks are for libraries?
- **Honesty about rare hooks.** "I would not use `useInsertionEffect` in an app; it is for CSS-in-JS library authors" is a good answer. Pretending to use it daily is not.

## Interview questions and model answers

### Q1. What is the difference between `useEffect` and `useLayoutEffect`? (Medium)
They have the same shape but run at different times. `useLayoutEffect` runs right after React updates the DOM and **before the browser paints**. `useEffect` runs later, usually after paint (after a click it may run earlier). So use `useLayoutEffect` when you must read layout (size, position) and fix something before the user sees a wrong frame: tooltips, popovers, auto-sizing a textarea. A state update inside a layout effect is re-rendered before paint. The cost is that it blocks painting, so slow work inside it freezes the screen. Start with `useEffect` and switch only when you see a flicker. Neither runs during server rendering.

### Q2. What is the difference between `useTransition` and `useDeferredValue`? (Medium)
Both tell React that some rendering is **not urgent**, so typing and clicking stay responsive, and both can be interrupted. With `useTransition` you wrap the code that **sets** state (`startTransition(() => setQuery(v))`) and you get `isPending`. With `useDeferredValue(value)` you wrap a **value** you only receive, such as a prop, and you get a copy that lags behind. Use a transition when you own the setter, a deferred value when you do not. Neither is a tool for fewer network requests, and for the deferred value the slow child must be wrapped in `memo` to skip the urgent pass.

### Q3. What is `useId` for? (Easy)
It creates a **unique, stable id string** per component instance, for linking elements such as a `<label>` and its `<input>`, or an input and its `aria-describedby` hint. A fixed id breaks when a component appears twice, and `Math.random()` breaks server rendering because the server and browser would make different ids (a hydration mismatch). `useId` derives the id from the component's place in the tree, so the server and client agree. Add suffixes for related ids (`${id}-hint`). Do not use it for list keys, and do not depend on its format; it changed in React 19.1 and again in 19.2.

### Q4. What is `useEffectEvent`, and is it stable? (Medium)
It wraps logic that you call **from inside an effect** but that should not be a reason for the effect to re-run. The function it returns always sees the latest props and state. For example, a timer effect with no dependencies can call an effect event that reads the current `step`. It is **stable since React 19.2** (October 2025), so it is in 19.3.1; older articles that call it experimental are out of date. Rules: call it only from effects, do not pass it to children, do not list it in dependencies, and do not use it only to silence the lint rule.

### Q5. What is `useSyncExternalStore`, and why not `useState` plus `useEffect`? (Medium)
It subscribes a component to a store that lives **outside React**: `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`. It fixes problems that the effect version has. The first render already reads the real value (no wrong first frame). It avoids **tearing**, where different parts of the screen show different versions of the store during concurrent rendering, because React re-checks the snapshot before committing. It also has a clear answer for server rendering through `getServerSnapshot`. Rules: `getSnapshot` must return a cached value (a new object each call causes an infinite loop error), and `subscribe` must be a stable function.

### Q6. How many built-in hooks are there? Name them by category. (Easy)
In React 19.3 the docs list 18 hooks in `react` plus `useFormStatus` in `react-dom`, so 19. `use` is an API and not a hook. (React 18 had 15.) By category: **State:** `useState`, `useReducer`. **Context:** `useContext`. **Refs:** `useRef`, `useImperativeHandle`. **Effects:** `useEffect`, `useLayoutEffect`, `useInsertionEffect`, `useEffectEvent`. **Performance:** `useMemo`, `useCallback`, `useTransition`, `useDeferredValue`. **Other:** `useDebugValue`, `useId`, `useSyncExternalStore`. **React 19 forms and Actions:** `useActionState`, `useOptimistic`, `useFormStatus`.

### Q7. Which hooks are mainly for library authors? (Medium)
`useSyncExternalStore` (connecting stores, such as state libraries, to React), `useInsertionEffect` (CSS-in-JS libraries injecting style rules), `useDebugValue` (labels for shared hooks in DevTools), and `useImperativeHandle` (component libraries exposing a small API such as `focus()`). `useId` is also handy for component libraries, because its ids are safe for server rendering. An application developer might use `useSyncExternalStore` for a browser API, and almost never `useInsertionEffect`.

### Q8. How is `useDeferredValue` different from debouncing? (Medium)
A debounce waits a **fixed time** (say 300 ms) after the last change before it lets the value through. That delay happens even on a fast machine, and when it fires, the heavy render is urgent and can freeze the page. `useDeferredValue` has **no fixed delay**: React starts the background render at once, adapts to the device speed, and can **interrupt** it when the value changes again. But it is not a tool for fewer network requests (it has no timer); a debounce is. For a search box, combine them: debounce the value that triggers the request, and defer the value that feeds the heavy list.

### Q9. What is tearing, and how does React prevent it? (Hard)
Tearing is when the UI shows two versions of the same data at once. With concurrent rendering, React can pause in the middle of a big render. If an external store changes during the pause, components rendered before the change show the old value, and components rendered after show the new one. `useSyncExternalStore` prevents this. React re-reads `getSnapshot` before committing, and if the value changed it re-renders **synchronously**, so everything agrees. The cost is that store updates cannot be transitions. In my experiment (20 rows, a store change mid-render), a direct read gave one row of `0` and 19 rows of `1`, and `useSyncExternalStore` gave all `1`.

### Q10. Can you wrap a controlled input's `setState` in `startTransition`? (Hard)
No. A controlled input must update synchronously, because the typed character has to appear at once. A transition is non-urgent, so the input value can lag and typing feels broken. The fix is two pieces of state: an urgent one for the input (`text`) and a transition (or deferred) one for the expensive result (`query`). Call `setText(value)` normally and `startTransition(() => setQuery(value))` for the list. Or keep one state and defer it with `useDeferredValue`.

### Q11. What is `useImperativeHandle`, and when would you use it? (Medium)
It lets a component choose what a parent's `ref` points to. Instead of the raw DOM node, the parent gets a small object with only the methods you define, such as `focus()` and `clear()`. In React 19 `ref` is a normal prop, so you no longer need `forwardRef`. Use it for imperative commands that props express badly (focus, scroll, play, reset). Do not use it for data or for things that can be props, like opening a modal. See [useRef](04-useref.md).

### Q12. What is `useInsertionEffect`? (Hard)
It is an effect that runs **before layout effects**, made for CSS-in-JS libraries that create style rules at runtime. Injecting styles in render is a side effect, injecting in `useEffect` is too late (an unstyled paint), and injecting in `useLayoutEffect` is too late for other layout effects that read the layout. The insertion effect puts the rule into `<head>` first. It does not run on the server, refs are not attached yet, and you must not set state inside it (React logs "useInsertionEffect must not schedule updates."). Application code should not use it.

### Q13. What does `useDebugValue` do? (Easy)
It adds a label next to a custom hook in the React DevTools Components panel, for example `OnlineStatus: "Online"` instead of just `true`. It does not change the rendered output. An optional second argument is a format function that React only calls when you inspect the hook, so expensive formatting costs nothing in normal use. Use it in shared or library hooks. Skip it in everyday hooks.

### Q14. Which hooks did React 19 add, and is `use` a hook? (Medium)
React 19.0 added `useActionState` (state from a form Action, with `isPending`; it was named `useFormState`), `useOptimistic` (a temporary value while an Action runs), `useFormStatus` in `react-dom` (the status of the parent form), and the `use` API. React 19.2 added `useEffectEvent`. `use` reads a promise or a context during render. The docs say it is **not a hook**, because unlike hooks it may be called inside conditions and loops (but not inside `try/catch`). Transitions can also take async functions in 19, which are called Actions.

### Q15. What happens with `useLayoutEffect` during server rendering? (Medium)
The effect does not run on the server, like all effects. The server HTML is whatever the first render produced, and the layout effect corrects it after hydration in the browser. Older React versions printed a warning about this, and people wrote a `useIsomorphicLayoutEffect` wrapper. In React 19.3.1 I called `renderToString` with a layout effect and there was no warning, so that wrapper is no longer needed to silence anything. Design the first render so it looks acceptable until the effect runs.

## Common mistakes and gotchas
- **Using `useLayoutEffect` for everything.** It blocks painting. Fix: default to `useEffect`; use a layout effect only to measure and fix a visible flicker.
- **Reading layout during render.** `ref.current` is `null` on the first render. Fix: measure in `useLayoutEffect`.
- **Hard-coded or random ids.** Duplicates and hydration mismatches. Fix: `useId`, with suffixes for related ids.
- **`useId` as a list key.** Hooks cannot be called in a loop, and ids are not data. Fix: use an id from your data as the key.
- **Parsing or hard-coding the `useId` format.** It changed in 19.1 and 19.2. Fix: treat it as an opaque string.
- **Putting an input's own state in a transition.** Typing lags. Fix: two states, urgent for the input, transition or deferred for the result.
- **Expecting `startTransition` to help with slow networks.** It only affects React rendering. Fix: use Suspense, caching or a query library.
- **State updates after `await` in an Action.** They are not transitions. Fix: wrap them in their own `startTransition`.
- **`useDeferredValue` without `memo`.** The slow child still renders in the urgent pass. Fix: wrap the slow child in `memo`.
- **A new object passed to `useDeferredValue` every render.** It always looks different. Fix: pass primitives or stable objects.
- **`getSnapshot` returning a new object.** Infinite loop error. Fix: return a primitive or an existing object from the store, and update the store immutably.
- **An inline `subscribe` function.** React resubscribes on every render. Fix: pass a stable function (`useCallback` if it depends on props).
- **No `getServerSnapshot` on a server-rendered page.** React throws and falls back to client rendering. Fix: provide one that returns the same value as the first client render.
- **Using `useInsertionEffect` for non-style work, or setting state in it.** Fix: only inject style rules there.
- **Hiding a real dependency in `useEffectEvent`.** The effect no longer reacts when it should. Fix: keep real triggers in the dependency array.
- **Calling `useEffectEvent` "experimental".** It has been stable since React 19.2.
- **`useFormStatus` in the form's own component.** It never reports pending. Fix: call it in a child rendered inside the `<form>`.
- **Using `useImperativeHandle` for data flow.** Fix: use props and lifted state.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Pick the hook. For each job, name the best hook and say why: (a) read a tooltip's height and position it before the user sees it; (b) give an `<input>` and its `<label>` ids that never clash when the component is used five times; (c) show a live "Online / Offline" badge from the browser; (d) keep typing smooth when a 5000-row list filters on every key; (e) inject a `<style>` rule at runtime from a library; (f) let a timer effect read the newest prop without restarting.

<details>
<summary>Show answer</summary>

- (a) `useLayoutEffect`. It runs after the DOM is updated and before paint, so you measure and fix the position without a flicker.
- (b) `useId`. It gives each instance its own stable id (and the server and browser agree).
- (c) `useSyncExternalStore`, with `subscribe` listening to the `online` and `offline` events, `getSnapshot` returning `navigator.onLine`, and a `getServerSnapshot`.
- (d) `useTransition` if you own the `setState` for the filter (keep the input state urgent, put the query state in the transition), or `useDeferredValue` if the value arrives as a prop. Wrap the list in `memo`.
- (e) `useInsertionEffect`. It runs before layout effects, so the rule exists before anything reads layout. This is for library authors.
- (f) `useEffectEvent` (stable since React 19.2). The timer calls the effect event, which always sees the latest prop, and the effect keeps an empty (or unrelated) dependency array.

</details>

2. **(Easy)** Build a `Switch` component: `<Switch label="Dark mode" />` renders a checkbox with `role="switch"` and a `<label>`. Put two switches on one page. Clicking the text of the second one must toggle only the second switch.

<details>
<summary>Show answer</summary>

```jsx
import { useId } from 'react'

export function Switch({ label }) {
  const id = useId()
  return (
    <div>
      <input id={id} type="checkbox" role="switch" />
      <label htmlFor={id}>{label}</label>
    </div>
  )
}
```

Each `Switch` gets its own id, so each label belongs to its own input. I tested it with two switches: clicking the text "Notifications" checked that switch and left "Dark mode" unchecked. If you hard-coded `id="switch"`, both labels would point at the first input.

</details>

3. **(Easy)** Predict the console output order when this mounts (no StrictMode):

```jsx
function Child() {
  console.log('Child render')
  useLayoutEffect(() => { console.log('Child layout effect') })
  useEffect(() => { console.log('Child effect') })
  return <p>child</p>
}

function Parent() {
  console.log('Parent render')
  useLayoutEffect(() => { console.log('Parent layout effect') })
  useEffect(() => { console.log('Parent effect') })
  return <Child />
}
```

<details>
<summary>Show answer</summary>

```text
Parent render
Child render
Child layout effect
Parent layout effect
Child effect
Parent effect
```

Render goes top-down. Then all layout effects run (child first, then parent), and only after that do the passive effects run (child first, then parent). I ran it to confirm the order. In StrictMode (development) each component also renders twice and effects run an extra setup, cleanup, setup cycle.

</details>

4. **(Medium)** Write a hook `useMediaQuery(query)` with `useSyncExternalStore`. It returns `true` when `window.matchMedia(query).matches` is true, updates when the query result changes, works when `query` changes, and returns `false` on the server.

<details>
<summary>Show answer</summary>

```jsx
import { useCallback, useSyncExternalStore } from 'react'

export function useMediaQuery(query) {
  const subscribe = useCallback(
    (callback) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', callback)
      return () => mql.removeEventListener('change', callback)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
```

`subscribe` depends on `query`, so it is wrapped in `useCallback`. That keeps it stable while `query` stays the same, and it makes React resubscribe when `query` changes. `getSnapshot` returns a boolean, which is a stable value. I tested it with a fake `matchMedia`: it started as "narrow", switched to "wide" when the `change` listeners fired, showed "narrow" again when I passed a different query string, and the listener was removed on unmount.

</details>

5. **(Medium)** Predict the logs, and say what happens if you remove the second argument of `useDeferredValue`:

```jsx
function Preview({ text }) {
  const shown = useDeferredValue(text, '...')
  console.log(`text="${text}" shown="${shown}"`)
  return <p>{shown}</p>
}
// first render: <Preview text="hello" />
```

<details>
<summary>Show answer</summary>

```text
text="hello" shown="..."
text="hello" shown="hello"
```

On the first render the hook returns the `initialValue`, `'...'`. Then React re-renders in the background with the real value. Without the second argument, the first render returns `"hello"` directly: only one log line, `text="hello" shown="hello"`. (`initialValue` was added in React 19.)

</details>

6. **(Medium)** This component crashes with "Maximum update depth exceeded". Explain why, and fix it.

```jsx
const store = createStore({ count: 0 })

function Counter() {
  const snapshot = useSyncExternalStore(store.subscribe, () => ({
    count: store.getState().count,
  }))
  return <p>{snapshot.count}</p>
}
```

<details>
<summary>Show answer</summary>

`getSnapshot` builds a **new object** on every call. React calls `getSnapshot` more than once and compares the results with `Object.is`. Two calls give two different objects, so React thinks the store keeps changing, re-renders, and loops. In development React first logs "The result of getSnapshot should be cached to avoid an infinite loop".

Fix: return a value that stays the same while the store is unchanged.

```jsx
function Counter() {
  const count = useSyncExternalStore(store.subscribe, () => store.getState().count)
  return <p>{count}</p>
}
```

A primitive (a number) is equal to itself on every call. Returning `store.getState()` itself would also work, as long as the store only replaces its state object when something changes.

</details>

7. **(Medium)** Build `FilterList({ items })`. A text input filters the list. The input must always follow the keyboard, the list is allowed to lag, and "Updating..." (with `role="status"`) must show while the list is behind. Use `useTransition`.

<details>
<summary>Show answer</summary>

```jsx
import { useState, useTransition } from 'react'

export function FilterList({ items }) {
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleChange(event) {
    const value = event.target.value
    setText(value) // urgent: the input
    startTransition(() => {
      setQuery(value) // not urgent: the list
    })
  }

  const visible = items.filter((item) => item.toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <input aria-label="Filter" value={text} onChange={handleChange} />
      {isPending && <span role="status">Updating...</span>}
      <ul style={{ opacity: isPending ? 0.6 : 1 }}>
        {visible.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
```

Two states are the key: `text` is the input's value and stays urgent, `query` drives the list and sits in the transition. I tested it with `['apple', 'banana', 'avocado']`: typing "av" left only "avocado", and the status message was gone at the end.

</details>

8. **(Medium)** A `Swatches` component draws 300 colour boxes from a `hue` prop and is slow. Build a `HuePicker` with a range slider (0 to 360) so the slider stays smooth while the swatches catch up. Dim the swatches while they are behind. Use `useDeferredValue`.

<details>
<summary>Show answer</summary>

```jsx
import { memo, useDeferredValue, useState } from 'react'

const Swatches = memo(function Swatches({ hue }) {
  const swatches = []
  for (let i = 0; i < 300; i++) {
    swatches.push(
      <div
        key={i}
        data-testid="swatch"
        style={{ display: 'inline-block', width: 12, height: 12, background: `hsl(${hue}, 80%, ${20 + (i % 60)}%)` }}
      />,
    )
  }
  return <div>{swatches}</div>
})

export function HuePicker() {
  const [hue, setHue] = useState(200)
  const deferredHue = useDeferredValue(hue)
  const isStale = hue !== deferredHue

  return (
    <div>
      <input
        type="range"
        min="0"
        max="360"
        aria-label="Hue"
        value={hue}
        onChange={(event) => setHue(Number(event.target.value))}
      />
      <div data-testid="grid" style={{ opacity: isStale ? 0.6 : 1 }}>
        <Swatches hue={deferredHue} />
      </div>
    </div>
  )
}
```

The slider reads `hue` (urgent). The grid reads `deferredHue` (background). `memo` lets `Swatches` skip the urgent pass, because `deferredHue` has not changed yet. In my test (20 swatches instead of 300), I moved the slider to 120. The slider showed 120 at once, `Swatches` rendered once for 200 (mount) and once for 120, and the grid's opacity was back to `1` at the end.

</details>

9. **(Medium)** Write a custom hook `useInterval(callback, delay)`. It must always call the **latest** `callback`, must **not** restart the timer when `callback` changes, and must pause when `delay` is `null`. Use `useEffectEvent`.

<details>
<summary>Show answer</summary>

```jsx
import { useEffect, useEffectEvent } from 'react'

export function useInterval(callback, delay) {
  const onTick = useEffectEvent(callback)

  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => {
      onTick()
    }, delay)
    return () => clearInterval(id)
  }, [delay])
}
```

`callback` is wrapped in an effect event, so the effect always calls the newest one and `callback` is not a dependency. The only real reason to restart the timer is a new `delay`. I tested it with fake timers and a counter that adds `step` every second: after `step` changed from 1 to 10 at 2.5 seconds, the tick at 3 seconds gave 12 (2 + 10), `setInterval` had been called once, and setting `delay` to `null` stopped the counting. Before React 19.2 you would store the callback in a ref and update it in an effect.

</details>

10. **(Hard)** Explain tearing. Why can a component that reads `store.getState()` straight in render tear, and what exactly does `useSyncExternalStore` do to prevent it? What is the trade-off?

<details>
<summary>Show answer</summary>

Tearing means different parts of the screen show different versions of the same data. It needs two things: a render that can be **paused** (a transition or a deferred value, rendered in slices), and a data source that can change **outside React** during the pause. Components rendered before the change read the old value, and components rendered after read the new one. A plain read of `store.getState()` during render has no way for React to notice.

`useSyncExternalStore` tells React where the data lives. React calls `getSnapshot` during render, and **again before committing**. If the value differs, it throws the render away and renders again **synchronously**, so every component shows one version. It also subscribes, so later changes re-render the component.

The trade-off: updates that come from an external store are always urgent. They cannot be marked as transitions, because that would allow the inconsistent state the hook is designed to prevent. In my run (20 rows, a store change in the middle of a transition) the direct read produced `0` in the first row and `1` in the other 19, while `useSyncExternalStore` produced `1` in all 20.

</details>

11. **(Hard)** Build `createStore(initialState)` (with `getState`, `setState`, `subscribe`) and a hook `useStore(store, selector)` using `useSyncExternalStore`. Two components, one reading `count` and one reading `name`, must show the right values. A component must **not** re-render when a part of the state it does not read changes, and `setState` with the same object must cause no render. Write the proof as a render counter.

<details>
<summary>Show answer</summary>

```jsx
import { useSyncExternalStore } from 'react'

export function createStore(initialState) {
  let state = initialState
  const listeners = new Set()

  return {
    getState: () => state,
    setState(update) {
      const next = typeof update === 'function' ? update(state) : update
      if (Object.is(next, state)) return
      state = next
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function useStore(store, selector) {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()))
}
```

Proof with counters (declare `store` and the counters outside the components):

```jsx
const store = createStore({ count: 0, name: 'Ann' })
const renders = { count: 0, name: 0 }

function Count() {
  const count = useStore(store, (s) => s.count)
  renders.count++
  return <p>count {count}</p>
}

function Name() {
  const name = useStore(store, (s) => s.name)
  renders.name++
  return <p>name {name}</p>
}
```

My counts: after mount `{count: 1, name: 1}`. After `setState((s) => ({ ...s, count: s.count + 1 }))`: `{count: 2, name: 1}`. After `setState((s) => ({ ...s, name: 'Bo' }))`: `{count: 2, name: 2}`. The selector returns a primitive, so unchanged slices give the same snapshot and React skips the component. `store.subscribe` is the same function every render, so there is one subscription per component.

</details>

12. **(Hard)** A product search page has two problems: typing is laggy because a heavy list re-renders on every key, and the app sends one request per key. Explain how you would fix each, which hooks you would use, and what you would NOT expect each hook to fix.

<details>
<summary>Show answer</summary>

They are two separate problems with two separate fixes.

**Lag (React rendering is slow).** Keep the input state urgent and render the list from a lagging value. Either use `useDeferredValue(query)` and pass the deferred value to a `memo`-wrapped list, or keep `text` and `query` as two states and set `query` inside `startTransition`. This makes the input follow the keyboard and lets the list catch up in the background. Also look at the list itself (virtualization for thousands of rows).

**Too many requests (network).** `useTransition` and `useDeferredValue` do **not** promise fewer requests: they have no timer, so many requests can still go out. Debounce the value that goes into the request (for example 300 ms, with a `useDebounce` hook), cancel or ignore stale responses (`AbortController` or an `ignore` flag in the effect cleanup, as in the [useEffect](03-useeffect.md) lesson), or use a query library that does this for you.

A sketch that combines them:

```jsx
const [text, setText] = useState('')
const debouncedText = useDebounce(text, 300)   // fewer requests
const results = useResults(debouncedText)      // fetch with cleanup
const deferredResults = useDeferredValue(results) // heavy list can lag
// <ResultList results={deferredResults} /> where ResultList is wrapped in memo
```

What I would not expect: the deferred value to make the list cheaper (it only moves the work to a lower priority), or a transition to speed up a slow server.

</details>

## Recap
- Order of one update: render, commit (insertion effects, then layout effects), paint, then passive effects (`useEffect`). Only layout effects are guaranteed to run before paint.
- `useLayoutEffect` is for measuring and fixing layout before paint. It blocks painting, so default to `useEffect`. React 19.3.1 prints no server-render warning for it, but no effect runs on the server.
- `useId` gives unique, server-safe ids for labels and ARIA links. Its format is opaque and it is never a list key.
- `useTransition` (you own the setter, you get `isPending`) and `useDeferredValue` (you receive a value, wrap the slow child in `memo`) keep the UI responsive. Neither is a tool for fewer network requests; debounce is.
- `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` reads outside data without tearing. `getSnapshot` must return a cached value and `subscribe` must be stable.
- `useInsertionEffect` (CSS-in-JS authors), `useDebugValue` (DevTools labels) and `useImperativeHandle` (a small ref API) are rare in app code.
- `useEffectEvent` is stable since React 19.2: call it only from effects, never put it in dependencies, never hide a real trigger inside it.
- React 19.3 has 19 hooks: 18 in `react` plus `useFormStatus` in `react-dom`. `use` is an API, not a hook.

## Where to go next
- Next lesson: [Component patterns](../03-intermediate/01-component-patterns.md).
- Go deeper on transitions, Suspense and time slicing: [Concurrent React and Suspense](../04-advanced/03-concurrent-react-and-suspense.md).
- The React 19 hooks in full (Actions, `useActionState`, `useOptimistic`, `use`): [React 19 and newer](../04-advanced/04-react-19-and-newer.md).
- How rendering and committing really work: [How React renders](../04-advanced/01-how-react-renders.md).
- One-page summary of every hook: Hooks cheat sheet (planned).
- Practice: [Mini Redux store](../practice-app/exercises/react/32-mini-redux-store/README.md) (the pattern from section 7.4), [Mini query hook](../practice-app/exercises/react/27-mini-query-hook/README.md), [Autocomplete with debounce](../practice-app/exercises/react/12-autocomplete-debounce/README.md).
- Quiz yourself: Round 2 hooks questions (planned).
