# Round 7 - Performance and Testing: Performance Scenarios - Answers

**Questions:** [../questions/01-performance-scenarios.md](../questions/01-performance-scenarios.md)

**The rule behind every answer:** measure first, change one thing, measure again. A fix you did not measure is a guess. All the code below was run in a test with Vitest and Testing Library (render counts, DOM output and timers checked). Browser timings depend on the device, so use the tools in each "Diagnose" part on your own page.

## Too many re-renders

### R7-PF-001 (Medium) Typing in a search box with 5000 rows is laggy
**Answer:**

**Diagnose:**
1. Reproduce on a production build (`npm run build`, then `npm run preview`). The dev build is slower on purpose (extra checks, StrictMode renders twice), so it exaggerates problems.
2. Open the React DevTools Profiler. In its settings turn on "Record why each component rendered while profiling". Record, type three letters, stop. The flame chart shows `Search` and thousands of `Row` components rendered on every keystroke, with a long commit time.
3. Confirm in the Chrome Performance panel (use "CPU: 4x slowdown" to look like a slower phone): one long task (a block of main-thread work over 50 ms) after each key press. Open the Bottom-Up tab to see how the time splits between your scripts (render and filter) and the browser's own rendering work (layout, paint).
4. Optional: a "why did you render" style tool (the why-did-you-render library or React Scan) prints or highlights components that re-render. Use it in development only, to confirm a guess.

**Cause:** each keystroke changes state in `Search`. React re-renders `Search`, runs the filter again, and re-renders every `Row`, because a child function component re-renders whenever its parent does, even with the same props. Then it updates thousands of DOM nodes. The input cannot repaint until all of that is done.

**Fix, in order:**
1. **Render less.** If only 20 rows fit on the screen, do not render 5000 (see R7-PF-007 for windowing), or paginate. This is usually the biggest win.
2. **Keep typing urgent and the list not urgent.** `useDeferredValue(query)` gives you a copy of the value that lags behind. React first renders with the new input text and the old deferred value, so the input updates at once. Then it renders the list in the background with the new value, and it can throw that render away if you type again.
3. **Make the list skip work.** Wrap the list in `memo` (this is what lets React skip it during the first, urgent render, because its props did not change). Wrap rows in `memo` so rows with the same `product` are skipped. Use `useMemo` for the filter result.
4. **Only if the filter itself is slow:** move it off the main thread (a Web Worker) or to the server.

**Code:**

```jsx
import { memo, useDeferredValue, useMemo, useState } from 'react'

const PRODUCTS = Array.from({ length: 5000 }, (_, i) => ({ id: i, name: `Product ${i}` }))

const Row = memo(function Row({ product }) {
  return <li>{product.name}</li>
})

// memo lets React skip this list during the urgent render, when the input
// already shows the new text but deferredQuery is still the old value.
const ProductList = memo(function ProductList({ query }) {
  const visible = useMemo(
    () => PRODUCTS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  )
  return (
    <ul>
      {visible.map((p) => (
        <Row key={p.id} product={p} />
      ))}
    </ul>
  )
})

export default function Search() {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  return (
    <>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ProductList query={deferredQuery} />
    </>
  )
}
```

**What happens, step by step:** you type "4". Render 1 (urgent): `query` is "4" but `deferredQuery` is still "". The `ProductList` props did not change, so `memo` skips it. The input shows "4" immediately. Render 2 (background): `deferredQuery` becomes "4", the list filters and renders. In a test the list function ran once on mount and exactly once more after the key press (not twice).

**When not to optimize:** with 200 rows and no visible lag, leave the code as it is. `memo` and `useMemo` cost a little on every render (comparing props, storing values) and make code harder to read. Also remember that `useDeferredValue` does not make rendering faster: on a slow device the list still takes the same time to appear. It only keeps the input responsive. Prefer it over a debounce for render cost, because it has no fixed delay and the work can be interrupted.

**Why it matters / follow-up:** "You wrapped Row in memo but pass `onSelect={() => select(p.id)}`. Does memo still help?" No. A new function every render means the props always differ. Use `useCallback` (or React Compiler), or pass the id and let the row call a stable handler.
**Learn more:** [Performance optimization](../../../04-advanced/02-performance-optimization.md), [Other hooks (useDeferredValue)](../../../02-hooks/09-other-hooks.md)

### R7-PF-002 (Medium) The whole page re-renders when the theme changes
**Answer:**

**Diagnose:** record a click in the Profiler with "Record why each component rendered" on. `Dashboard` says "The parent component rendered" (it does not read the context at all). `ThemeToggle` says "Context changed". That tells you the state lives too high.

**Cause:** `App` owns the theme state. When it changes, `App` runs again and creates new elements for all its children, so `Dashboard` re-renders too. Also, `value` is a new object on every render, so every consumer re-renders whenever `App` re-renders for any reason. And a context has no "selector": a component that reads only `theme` still re-renders when anything inside the value changes.

**Fix, in order:**
1. **Move the state into a provider component that takes `children`.** The `children` elements are created by the component above (`App`), which does not re-render, so they are the same objects as before and React skips them. Only components that read the context re-render.
2. **Memoize the context value** with `useMemo`, so a provider that re-renders for another reason does not re-render consumers that are wrapped in `memo`. Note: it protects `memo` components only. Plain children still re-render with their parent.
3. **Split the context** if some values change often and others rarely (for example state and the functions that change it).
4. **For themes, consider CSS variables.** Set an attribute on the root element and let CSS do the work. React renders nothing.

**Code:**

```jsx
import { createContext, useContext, useMemo, useState } from 'react'

const ThemeContext = createContext({ theme: 'light', toggle: () => {} })

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const value = useMemo(
    () => ({ theme, toggle: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) }),
    [theme],
  )
  return <ThemeContext value={value}>{children}</ThemeContext>
}

function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeContext)
  return <button onClick={toggle}>Theme: {theme}</button>
}

function Dashboard() {
  return <section aria-label="Dashboard">Heavy dashboard</section>
}

export default function App() {
  return (
    <ThemeProvider>
      <ThemeToggle />
      <Dashboard />
    </ThemeProvider>
  )
}
```

```js
// No React re-render at all: change an attribute, let CSS custom properties restyle the page.
function applyTheme(next) {
  document.documentElement.dataset.theme = next
}
```

```css
:root {
  --bg: #ffffff;
  --fg: #111111;
}
:root[data-theme='dark'] {
  --bg: #111111;
  --fg: #eeeeee;
}
body {
  background: var(--bg);
  color: var(--fg);
}
```

**Result in a test:** after one click, the slow version ran the `Dashboard` function 2 times in total (mount plus the toggle). The fixed version ran it once. The toggle button re-rendered in both, as it should, because it reads the context.

**When not to optimize:** a theme changes rarely, so context is a fine tool for it. If the whole page re-renders in 5 ms, ignore it. Context is a poor fit for values that change many times per second (mouse position, typing); use local state, a store with selectors, or refs for those.

**Why it matters / follow-up:** "Does `useMemo` on the value stop `Dashboard` from re-rendering in the slow version?" No. In the slow version `Dashboard` re-renders because its parent `App` re-rendered, not because of the context.
**Learn more:** [useContext](../../../02-hooks/05-usecontext.md), [Memoization](../../../02-hooks/07-memoization.md)

### R7-PF-003 (Easy) A header clock re-renders the heavy dashboard every second
**Answer:**

**Diagnose:** Profiler: a commit every second, with `Dashboard` coloured (rendered) and the reason "The parent component rendered". Grey components did not render. That points at state held too high, not at anything inside `Dashboard`.

**Cause:** `App` holds `now`. Each tick re-renders `App`, and `Dashboard` is one of its children, so it renders again with identical (empty) props.

**Fix, in order:**
1. **Colocate the state.** Put `now` and the interval into a small `Clock` component. `App` then has no state and never re-renders after the first time. This is the cheapest and clearest fix.
2. **Composition with `children`.** If the state must stay in a layout component, pass the heavy part in from above: `<ClockLayout><Dashboard /></ClockLayout>`. The `<Dashboard />` element is created by `App`, which does not re-render, so React reuses it.
3. **`memo(Dashboard)`** skips the render when props are equal. It works here because `Dashboard` has no props. With props you must keep them stable (`useMemo`, `useCallback`), or `memo` never skips.
4. **React Compiler** (a build-time tool, stable since version 1.0 in October 2025) adds this kind of memoization automatically to components and hooks written by the Rules of React. It can often remove the need for hand-written `memo`, `useMemo` and `useCallback`. It does not fix code that breaks the rules, and the docs advise keeping the manual memoization that already exists. It complements understanding re-renders, it does not replace it.

**Code:**

```jsx
import { useEffect, useState } from 'react'

function Dashboard() {
  return <section aria-label="Dashboard">Heavy dashboard</section>
}

// The state that changes every second now lives in the smallest component that needs it.
function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return <header>{now.toLocaleTimeString()}</header>
}

export default function App() {
  return (
    <>
      <Clock />
      <Dashboard />
    </>
  )
}
```

```jsx
// Option 2: heavy content passed as children
function ClockLayout({ children }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <>
      <header>{now.toLocaleTimeString()}</header>
      {children}
    </>
  )
}

export default function App() {
  return (
    <ClockLayout>
      <Dashboard />
    </ClockLayout>
  )
}
```

**Result in a test:** after 3 ticks (fake timers) the slow version had run `Dashboard` 4 times (mount plus 3). The fixed version ran it once.

**When not to optimize:** if `Dashboard` takes under a millisecond, one render per second is free. Do not wrap everything in `memo` "just in case": a `memo` child that receives a new object or function on every render never skips, so you pay for the comparison and get nothing.

**Why it matters / follow-up:** "What is the cheapest optimization in React?" Moving state down (colocation). "Why does the `children` trick work?" Because the element object is created in a component that did not re-render.
**Learn more:** [Memoization](../../../02-hooks/07-memoization.md), [How React renders](../../../04-advanced/01-how-react-renders.md)

## Slow interactions

### R7-PF-004 (Hard) Poor INP on a category dropdown
**Answer:**

**What INP is:** Interaction to Next Paint. For each click, tap or key press it measures the time until the browser paints the next frame: waiting for the main thread (input delay), running your handlers and React's rendering (processing), and painting (presentation delay). A page's INP is close to its slowest interaction during the visit. It is measured on real users at the 75th percentile: good is 200 ms or less, poor is above 500 ms. It replaced FID as a Core Web Vital in March 2024.

**Diagnose:**
1. **Field:** the `web-vitals` library, `onINP` (use the attribution build) tells you which element and event were slow in real sessions. Chrome UX Report or PageSpeed Insights give the same number at the 75th percentile.
2. **Lab:** Chrome DevTools Performance panel with "CPU: 4x slowdown". Record, click the option, stop. The Interactions track shows the click split into input delay, processing and presentation delay. In the main-thread flame chart look for a long task under the click handler (React's render and commit).
3. React DevTools Profiler on the same click shows which components rendered in that commit: here the whole 3000-item grid.

**Cause:** `choose` updates two states in one urgent update. React renders the menu and the 3000-item grid in one go, and the browser cannot paint the closed menu until that finishes.

**Fix, in order:**
1. **Split urgent from not urgent.** Closing the menu and showing the chosen label are urgent. Re-filtering the grid can wait. Use `useDeferredValue(category)` for the grid (code below), or `useTransition` when you control the place that sets the state.
2. **Memoize the heavy child.** Without `memo`, the urgent render still renders `ProductGrid` (with the old value) and you pay the full cost before the paint. With `memo` that render skips it. In a test the grid function ran once on mount and once after the choice (2 in total), and the menu was already closed after the click.
3. **Make the work smaller:** window the list (R7-PF-007), paginate, or remove slow per-item work.
4. **Keep handlers light:** do not put analytics, large parsing or logging in the click handler. Run it after the paint.

**Code:**

```jsx
import { memo, useDeferredValue, useState } from 'react'

const CATEGORIES = ['all', 'shoes', 'hats', 'bags']
const PRODUCTS = Array.from({ length: 3000 }, (_, i) => ({
  id: i,
  category: CATEGORIES[(i % 3) + 1],
  name: `Item ${i}`,
}))

const ProductGrid = memo(function ProductGrid({ category }) {
  const items = category === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === category)
  return (
    <ul aria-label="Products">
      {items.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  )
})

export default function Products() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('all')
  const deferredCategory = useDeferredValue(category)

  function choose(value) {
    setOpen(false) // urgent: the menu closes and the label changes at once
    setCategory(value)
  }

  return (
    <div>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>
        Category: {category}
      </button>
      {open && (
        <ul role="menu" aria-label="Category">
          {CATEGORIES.map((c) => (
            <li key={c} role="none">
              <button role="menuitem" onClick={() => choose(c)}>
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
      <ProductGrid category={deferredCategory} />
    </div>
  )
}
```

The same idea with `useTransition`. The label state is urgent, the grid state is inside the transition, and `isPending` lets you show a hint:

```jsx
import { memo, useState, useTransition } from 'react'

const ProductGrid = memo(function ProductGrid({ category }) {
  // the same heavy list as before
  return <ul aria-label="Products">{category}</ul>
})

export default function Products() {
  const [category, setCategory] = useState('all') // drives the label: urgent
  const [gridCategory, setGridCategory] = useState('all') // drives the grid: can wait
  const [isPending, startTransition] = useTransition()

  function choose(value) {
    setCategory(value)
    startTransition(() => setGridCategory(value))
  }

  return (
    <div>
      <button onClick={() => choose('hats')}>Category: {category}</button>
      {isPending && <span role="status">Updating...</span>}
      <ProductGrid category={gridCategory} />
    </div>
  )
}
```

**Important limits:** a transition does not make rendering faster. It makes it interruptible and moves it after the urgent paint. React can pause between components, but it cannot pause in the middle of one component function, so one render that takes 600 ms by itself will still block when it runs. If the user clicks again, React drops the stale background render and starts again with the newest value.

**When not to optimize:** if the interaction is already under 200 ms, stop. Lab numbers move with the device, so use field data to decide which interactions are worth the work.

**Why it matters / follow-up:** "Why not just use `setTimeout` to delay the filter?" It delays the work but it still blocks the main thread when it runs and cannot be interrupted. Transitions can be interrupted.
**Learn more:** [Concurrent React and Suspense](../../../04-advanced/03-concurrent-react-and-suspense.md), [Other hooks](../../../02-hooks/09-other-hooks.md)

### R7-PF-005 (Medium) An expensive calculation runs on every keystroke
**Answer:**

**Diagnose:**
1. The Profiler shows `Report` with a long render time on every key press, but it only shows the time of the whole component, not what inside it is slow.
2. In the Chrome Performance panel, open the Bottom-Up or Call Tree tab for a keystroke and look for `computeStats` and the time it takes. A quick check is to wrap the call in `console.time` and `console.timeEnd` for a moment. The React docs use about 1 ms as a rough point where a calculation starts to be worth memoizing.

**Cause:** two problems. The calculation is slow because it sorts everything (n log n) and, for each customer, filters all orders again (n times the number of customers). And it runs on every render, including the ones caused by the note box, which have nothing to do with the orders.

**Fix, in order:**
1. **Make the algorithm cheaper.** One pass with a `Map` is linear. Fix the algorithm before you cache a slow one.
2. **Do not recompute for unrelated renders.** Either move the note state into its own component (colocation), or use `useMemo(() => computeStats(orders), [orders])`.
3. **If it is still slow for very large data** (tens of milliseconds): move the work to a Web Worker, or compute it on the server or ahead of time, and show a loading state.
4. React Compiler can memoize this value automatically for components written by the rules.

**Code:**

```jsx
import { useMemo, useState } from 'react'

export function computeStats(orders) {
  const perCustomer = new Map()
  let top = null
  for (const o of orders) {
    if (top === null || o.amount > top.amount) top = o
    perCustomer.set(o.customer, (perCustomer.get(o.customer) ?? 0) + o.amount)
  }
  return { top, customers: perCustomer.size, best: Math.max(...perCustomer.values()) }
}

export default function Report({ orders }) {
  const [note, setNote] = useState('')
  const summary = useMemo(() => computeStats(orders), [orders])
  return (
    <div>
      <p>Customers: {summary.customers}</p>
      <p>Biggest order: {summary.top.amount}</p>
      <textarea aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
    </div>
  )
}
```

In a test the fast and the slow `computeStats` returned equal results for sample data, and with three characters typed into the note, the calculation ran once.

**When `useMemo` is the wrong tool:** when the calculation takes microseconds (a short `map` or `filter` on a small array), when its dependencies change on every render anyway (the parent passes a new `orders` array each time, so the cache never hits), and when you need a guarantee. `useMemo` is a performance hint: React may drop the cached value, so the code must stay correct without it. In StrictMode (development) the function also runs twice on purpose.

**Why it matters / follow-up:** "The parent passes `orders={rows.filter(...)}` inline. Does your `useMemo` work?" No, the array is new on every parent render. Memoize it in the parent or fetch it in a stable way.
**Learn more:** [Memoization](../../../02-hooks/07-memoization.md)

### R7-PF-006 (Medium) A request on every keystroke, and answers that arrive out of order
**Answer:**

**Diagnose:** open the Network tab and type quickly: you see one request per key. Set the network throttle to "Slow 3G" and you can reproduce the wrong-results bug: responses are not guaranteed to come back in the order you sent them. This is a network and correctness problem, not a render problem, so the Profiler will not show it.

**Fix, in order:**
1. **Debounce the input.** Debouncing waits until the user stops for a moment (250 to 400 ms is common) and then acts once on the latest value.
2. **Cancel the old request.** An effect with an `AbortController` aborts the previous request in its cleanup, so a slow old answer can never overwrite a newer one. (An ignore flag does the same job without cancelling the network call.)
3. **Use a data library** such as TanStack Query for caching, de-duplication and race handling, instead of writing this by hand in every component.
4. **Add limits:** do not search for fewer than two characters, and rate-limit on the server.

**Debounce versus throttle:** debounce fires once after the events stop (good for search boxes and auto-save). Throttle fires at most once per time interval while events keep coming (good for scroll, resize and mouse move handlers).

**Would `useDeferredValue` help?** Not with the network. It defers rendering work; it does not wait for the user to stop typing, so requests triggered from it can still happen on every key. Use it for expensive rendering and a debounce for requests.

**Code:**

```jsx
import { useEffect, useState } from 'react'

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export default function SearchBox() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const [results, setResults] = useState([])

  useEffect(() => {
    if (debouncedQuery === '') return
    const controller = new AbortController()
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then(setResults)
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err)
      })
    return () => controller.abort() // a newer query cancels the older request
  }, [debouncedQuery])

  const shown = debouncedQuery === '' ? [] : results
  return (
    <div>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {shown.map((r) => (
          <li key={r.id}>{r.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

**Result in a test (fake timers and a mocked `fetch`):** typing "a", "ab", "abc" with 100 ms pauses sent no request until 300 ms after the last key, then exactly one request (`/api/search?q=abc`). Typing another letter later sent a second request and the first request's signal was aborted.

**When not to optimize:** filtering 100 items that are already in memory needs no debounce; it only adds delay. Keep the delay small, because it is added to every search.

**Why it matters / follow-up:** "When does the effect cleanup run?" Before the next run of the effect and when the component unmounts, so the abort happens exactly when a newer query starts.
**Learn more:** [Custom hooks](../../../02-hooks/08-custom-hooks.md), [useEffect](../../../02-hooks/03-useeffect.md)

## Big lists, bundles and loading

### R7-PF-007 (Medium) Windowing a 10,000 row list
**Answer:**

**Diagnose:** the Elements panel or the Performance monitor shows the number of DOM nodes (ten thousand rows with several elements each is tens of thousands of nodes). The Performance panel shows long scripting, layout and paint times. The cost grows with the number of rows, not with what the user can see.

**Idea:** virtualization (windowing) renders only the rows that are visible, plus a few extra above and below (the "overscan"), inside a tall empty container that keeps the scrollbar the right size. When the user scrolls, you work out which rows are in view from `scrollTop` and the fixed row height.

**Fix, in order:**
1. Ask whether you need all the rows: filters, search or pagination (from the server) often solve it.
2. Window the list. For production use a library such as TanStack Virtual or react-window, which handle variable heights, measuring, horizontal lists and more. Know how to write the simple fixed-height version for interviews.
3. Keep stable keys (the item id, not the index) and memoize row components if rows are heavy.

**Code:**

```jsx
import { useState } from 'react'

const ROW_HEIGHT = 32
const OVERSCAN = 3

export default function VirtualList({ items, height = 320 }) {
  const [scrollTop, setScrollTop] = useState(0)

  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const last = Math.min(items.length, Math.ceil((scrollTop + height) / ROW_HEIGHT) + OVERSCAN)

  return (
    <div
      role="list"
      aria-label="Rows"
      style={{ height, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * ROW_HEIGHT, position: 'relative' }}>
        {items.slice(first, last).map((item, i) => (
          <div
            key={item.id}
            role="listitem"
            style={{ position: 'absolute', top: (first + i) * ROW_HEIGHT, height: ROW_HEIGHT }}
          >
            {item.name}
          </div>
        ))}
      </div>
    </div>
  )
}
```

The maths: `first = floor(scrollTop / 32) - overscan` and `last = ceil((scrollTop + height) / 32) + overscan`. Each visible row is placed with `position: absolute` at `index * 32`. In a test, 10,000 items produced fewer than 20 rows in the DOM; after scrolling to `scrollTop = 3200`, "Row 100" was present and "Row 0" was gone. (jsdom has no layout, so the test passes the height as a prop and fires a scroll event with a `scrollTop` value.)

**Downsides:** the browser's find-in-page cannot find rows that are not in the DOM. Screen readers do not know the real size of the list unless you add `aria-setsize` and `aria-posinset` (or `aria-rowcount` for tables). Keyboard focus can be lost when the focused row scrolls out and is removed. Variable row heights, sticky headers and "jump to row" are harder. For static content, the CSS property `content-visibility: auto` lets the browser skip rendering off-screen parts cheaply, but it does not reduce React's own render work.

**When not to optimize:** a few hundred simple rows render fine. Do not add virtualization to a list that never grows.

**Why it matters / follow-up:** "How do you handle rows of different heights?" Measure rows as they render and cache the heights, or use a library. The practice app has a related exercise: `practice-app/exercises/react/24-virtualized-list`.
**Learn more:** [Performance optimization](../../../04-advanced/02-performance-optimization.md)

### R7-PF-008 (Medium) A 2 MB JavaScript bundle
**Answer:**

**Diagnose:**
1. `vite build` prints the size of each chunk, plus its gzip size, and warns about chunks above 500 kB (uncompressed, the `build.chunkSizeWarningLimit` setting).
2. Add a bundle visualizer to see what takes the space as a treemap (a map of boxes sized by bytes). Often one or two libraries are most of it.
3. In Chrome, the Network tab shows transfer size (compressed) against resource size, and the Coverage tab shows how many bytes of each file were unused during page load.

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [react(), visualizer({ filename: 'stats.html', template: 'treemap', gzipSize: true })],
})
```

**Fix, in order (biggest wins first):**
1. **Split by route.** Each page becomes its own chunk, loaded when the user visits it. Also lazy-load heavy features behind a click (a chart, a rich text editor, a PDF viewer, a map).
2. **Trim heavy dependencies.** Import single functions instead of whole libraries, replace big libraries with smaller ones or built-in APIs, and look for two versions of the same library.
3. **Make sure tree shaking works.** Tree shaking drops code you never use, but only for ES module imports.
4. **Compress and cache.** Serve gzip or Brotli, and cache hashed file names for a long time. This reduces download time, not the time the browser spends parsing and running the code.
5. **Load third-party scripts** (analytics, chat widgets) later, with `async` or `defer`, or after the first interaction.
6. In a framework with Server Components, keep code that only renders data on the server so it is never sent to the browser.

**Code:**

```jsx
import { lazy, Suspense, useState } from 'react'

// The chart code is downloaded only when the user asks for the chart.
const SalesChart = lazy(() => import('./SalesChart.jsx'))

export default function Reports() {
  const [show, setShow] = useState(false)
  return (
    <div>
      <button onClick={() => setShow(true)}>Show chart</button>
      {show && (
        <Suspense fallback={<p>Loading chart...</p>}>
          <SalesChart />
        </Suspense>
      )}
    </div>
  )
}
```

`lazy` expects the loaded module to have a `default` export. In a test the chart text appeared only after the click, once the module had loaded.

```js
// Before: the whole library ends up in the bundle
import _ from 'lodash'
const save = _.debounce(saveDraft, 300)

// After: a named import from the ES module build can be tree-shaken
import { debounce } from 'lodash-es'
const saveLater = debounce(saveDraft, 300)

// A built-in API instead of a date library for simple formatting
const label = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date())
```

**When not to optimize:** do not lazy-load content that is visible on the first screen (it delays LCP), and do not slice the app into dozens of tiny chunks (many requests and loading spinners can be slower than one medium file). Set a size budget in CI and measure again after each change.

**Why it matters / follow-up:** "How do you avoid a spinner when the user clicks a lazy route?" Start loading the chunk early, for example on link hover or when the browser is idle, or use a transition so the old page stays visible.
**Learn more:** Tooling: Vite, ESLint, build (planned), [Performance optimization](../../../04-advanced/02-performance-optimization.md)

### R7-PF-009 (Hard) Poor LCP and CLS on a landing page
**Answer:**

**The three Core Web Vitals** (at the 75th percentile of real users): LCP (Largest Contentful Paint, when the biggest element appears): good 2.5 s or less, poor above 4.0 s. INP: good 200 ms or less, poor above 500 ms. CLS (Cumulative Layout Shift, how much things jump around): good 0.1 or less, poor above 0.25. A page passes only if all three are good.

**Diagnose:**
1. Separate field from lab. Field data (Chrome UX Report, PageSpeed Insights, your own `web-vitals` reporting) says what real users get. Lighthouse is lab data from one simulated run.
2. For LCP use the `web-vitals` attribution build, which names the LCP element and splits the time into server response, resource load delay, resource load duration and render delay. In the Network waterfall look for a chain: HTML, then JavaScript, then the API call, then the image. That chain is the likely culprit here.
3. For CLS use the Performance panel's layout shift markers, or turn on "Layout Shift Regions" in the Rendering tab to see what jumps.

**Fix LCP, in order:**
1. **Remove the waterfall.** In a pure client-side app the browser must download JavaScript, run React and call the API before it even learns the image URL. Put the image in the HTML the server sends (server rendering, static generation or streaming in a framework), or at least make the URL known without waiting for the API.
2. **Load the hero image early:** `fetchPriority="high"`, never `loading="lazy"` on it, the right size, a modern format (AVIF or WebP) and `srcset` for different screens. Lazy-load images below the first screen.
3. **Send less JavaScript before the first render** (R7-PF-008).
4. Check server speed and CDN caching.

**Fix CLS, in order:**
1. **Reserve space.** Give images `width` and `height` (or CSS `aspect-ratio`), and make loading skeletons the same size as the final content.
2. **Do not insert content above what the user is reading** (late banners, ads, cookie bars). Reserve their space or place them as overlays.
3. **Fonts:** use `font-display: swap`, preload the main font, and use a fallback font with similar metrics so the swap moves little.
4. Animate with `transform`, not `top` or `left`.

**Code:**

```jsx
export default function Hero() {
  return (
    <section>
      <img
        src="/img/hero-1200.avif"
        alt="Team collaborating at a whiteboard"
        width="1200"
        height="600"
        fetchPriority="high"
      />
      <img src="/img/gallery-1.avif" alt="Office" width="600" height="400" loading="lazy" />
    </section>
  )
}
```

In React 19 the props are written `fetchPriority` and `loading`; in a test they appear in the DOM as `fetchpriority="high"` and `loading="lazy"`, with no warnings.

**Where React helps:** server rendering and streaming (through a framework such as Next.js or React Router in framework mode) for LCP; code splitting and Suspense for less JavaScript up front; transitions, memoization and virtualization for INP. CLS is mostly about HTML and CSS discipline, not React.

**When not to optimize:** do not chase a perfect Lighthouse score; aim for good field numbers. Do not lazy-load the LCP image. Do not preload many resources: too many preloads compete for the same bandwidth. Note that the Lighthouse score uses Total Blocking Time (a lab stand-in that often goes together with INP), not INP itself.

**Why it matters / follow-up:** "Why can lab and field numbers disagree?" The lab run is one device and one network; the field is many devices, caches and connections.
**Learn more:** [Performance optimization](../../../04-advanced/02-performance-optimization.md), Browser and web platform (planned)

## Memory

### R7-PF-010 (Hard) A memory leak after navigating around
**Answer:**

**Diagnose:**
1. Open the Chrome Performance monitor panel and watch JS heap size, DOM nodes and JS event listeners while you move between pages repeatedly. A healthy app looks like a sawtooth (memory grows, garbage collection drops it). A leak climbs and never comes back down.
2. Use the Memory tab. Click the trash can to force garbage collection, take a heap snapshot, repeat the action 5 to 10 times, force garbage collection again, take a second snapshot, and use the Comparison view to see which objects keep growing. Filter by "Detached" to find DOM nodes that were removed from the page but are still referenced.
3. Read the code for anything started outside React and never stopped: `addEventListener`, `setInterval`, `WebSocket`, observers (`IntersectionObserver`, `ResizeObserver`), store subscriptions, and global arrays or caches that only grow.
4. In development, StrictMode runs each effect, then its cleanup, then the effect again, once on mount. A missing cleanup shows up immediately as a doubled listener or timer.

**Cause here:** the effect adds a `resize` listener and starts an interval, and never removes either. They live outside React, so they keep references to `setWidth`, `setTicks` and everything in their closures. The garbage collector cannot free the component, and every visit to the page adds another listener and another timer.

**Fix:** use a named handler and return a cleanup function from the effect.

**Code:**

```jsx
import { useEffect, useState } from 'react'

export default function LiveStatus() {
  const [width, setWidth] = useState(window.innerWidth)
  const [ticks, setTicks] = useState(0)

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    const id = setInterval(() => setTicks((t) => t + 1), 1000)

    return () => {
      window.removeEventListener('resize', onResize)
      clearInterval(id)
    }
  }, [])

  return (
    <p>
      Width {width}, ticks {ticks}
    </p>
  )
}
```

**Result in a test:** after unmounting the leaky component, one `resize` listener had been added and none removed, and one timer was still pending. The fixed component, rendered in StrictMode, added two listeners and removed two (the extra pair is StrictMode's setup, cleanup, setup check), and left no timers behind.

**Other usual suspects:** unbounded caches (use a size limit or an LRU cache), module-level variables holding big data or DOM nodes, subscriptions to stores or sockets without an unsubscribe, and long-lived closures that capture large objects.

**When not to optimize:** a small, steady memory use that goes up and down is normal. Prove a leak by growth after forced garbage collection before you start changing code. Not every effect needs a cleanup either (a one-time read with nothing to undo does not).

**Why it matters / follow-up:** "Does setting state on an unmounted component leak?" Not by itself in modern React, and the old warning was removed. The leak is the thing that keeps the reference alive (the listener or timer), not the state update.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md), [JavaScript deep dive: memory leaks](../../../01-basics/10-javascript-deep-dive-for-interviews.md)
