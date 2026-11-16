# Performance Optimization

> **Level:** Advanced   **Time:** about 80 minutes   **Read first:** [How React renders](01-how-react-renders.md), [React.memo, useMemo and useCallback](../02-hooks/07-memoization.md), [Other hooks](../02-hooks/09-other-hooks.md)

## What you will learn
- Follow one loop: measure, find the bottleneck, fix one thing, measure again.
- Read the React DevTools Profiler, the browser Performance panel, Lighthouse and the three Core Web Vitals (LCP, INP, CLS).
- Cut wasted renders with structure first (move state down, pass children, split context) and memoization second.
- Keep big lists fast (virtualization, pagination, content-visibility) and keep heavy work off the main thread.
- Reduce load time with code splitting, a smaller bundle, better images and fonts, and server rendering.
- Diagnose one real case end to end: a list of 10,000 items with a search box, with numbers.

## 1. The method: measure, find, fix, measure again
Performance work has one rule: never fix what you have not measured. Guessing is how people end up with `useMemo` on every line and a page that is still slow.

There are three kinds of "slow", and each has a different cause:
- **Slow to load:** the first screen takes long. Usual causes: too much JavaScript, big images, a slow server. Metric: LCP.
- **Slow to react:** clicks and typing feel laggy. Usual causes: too many renders, too many DOM nodes, one long task. Metric: INP.
- **Jumpy:** content moves while the page loads. Usual causes: images without a size, late-loading content. Metric: CLS.

Why does laggy input happen? The browser has one **main thread**. It runs your JavaScript, handles clicks, calculates layout and paints. Think of one cashier in a shop: if one customer has a huge cart, everyone waits. A piece of work that blocks the thread for more than 50 ms is called a **long task**, and input waits behind it.

The loop:
1. Reproduce the slow action and write down a number (milliseconds, render count, kilobytes).
2. Record it with a profiler and find the biggest cost.
3. Change one thing.
4. Measure again. Keep the change only if the number improved.

The simplest tool for step 1 is a render counter:

```jsx
function Row({ item }) {
  console.count('Row render') // prints "Row render: 1", "Row render: 2", ...
  return <li>{item.name}</li>
}
```

**What happens, step by step:**
1. Every time React calls `Row`, `console.count` prints a number that keeps growing.
2. You type in the search box and watch the number jump. That jump is your measurement.
3. After a fix, you repeat the same action. A smaller jump is proof, not a feeling.

**Common mistake:** adding memoization "to be safe".

```jsx
// Wrong: nothing was measured, and the memo bookkeeping costs more than the work
const total = useMemo(() => price + tax, [price, tax])

// Better: plain code
const total = price + tax
```

## 2. Tools and the numbers that matter
- **React DevTools Profiler:** press record, do the slow action, stop. The *flame graph* shows each component as a bar (wider means more time, grey means it did not render). The *ranked chart* lists the slowest first. In the Profiler settings, turn on "Record why each component rendered" to see reasons such as "props changed" or "parent rendered". In the Components settings, "Highlight updates when components render" flashes a border around each render.
- **Browser Performance panel:** records everything on the main thread. Look for long tasks (marked red) and open the bottom-up view to see which function cost the most. React 19.2 added Scheduler and Components tracks to this panel.
- **Lighthouse:** a lab test (one controlled run). Its score weights Total Blocking Time 30%, LCP 25%, CLS 25%, First Contentful Paint 10%, Speed Index 10%. INP is not in the score; TBT is a lab stand-in that usually correlates with it.
- **React Scan** highlights components that re-render, with no code changes. **why-did-you-render** logs avoidable renders in development only, and it does not work with React Compiler.

**Core Web Vitals** are measured on real visits, at the 75th percentile, for mobile and desktop separately:

| Metric | What it measures | Good | Poor |
|---|---|---|---|
| LCP (Largest Contentful Paint) | when the biggest image or text block is visible | up to 2.5 s | over 4 s |
| INP (Interaction to Next Paint) | delay from a click, tap or key until the next paint, across the whole visit | up to 200 ms | over 500 ms |
| CLS (Cumulative Layout Shift) | how much content jumps around | up to 0.1 | over 0.25 |

INP replaced FID (First Input Delay) as a Core Web Vital on 2024-03-12. Lab data (Lighthouse) helps you debug. Field data (real users) is what the vitals really use. Collect it with the `web-vitals` library:

```js
import { onLCP, onINP, onCLS } from 'web-vitals'

function report(metric) {
  // metric.rating is 'good', 'needs-improvement' or 'poor'
  navigator.sendBeacon('/vitals', JSON.stringify({ name: metric.name, value: metric.value, rating: metric.rating }))
}

onLCP(report)
onINP(report)
onCLS(report)
```

**What happens, step by step:**
1. Each `onX` call asks the browser to watch one metric.
2. When a value is ready, the library calls `report` with the name, the value and a rating.
3. `sendBeacon` posts it to your server without blocking the page. Some metrics (INP, CLS) can report again as the visit goes on.

**Common mistake:** profiling the development build.

```bash
# Wrong: dev mode runs StrictMode double renders and extra checks, so timings are inflated
npm run dev

# Right: measure the real thing
npm run build
npm run preview
```

## 3. Render less: change the structure first
A re-render is cheap when the component is small. It hurts when a slow component re-renders for no reason. These three structure fixes need no `memo`. Counts below come from a real run in the practice app (React 19.3.1, Vitest, no StrictMode; StrictMode doubles function calls in development).

```jsx
import { useState } from 'react'

function Expensive() {
  console.count('Expensive render')
  return <p>Imagine a heavy chart here</p>
}

// Before: the state lives next to Expensive, so every click renders it too
function Together() {
  const [n, setN] = useState(0)
  return (
    <div>
      <button onClick={() => setN(n + 1)}>Clicked {n}</button>
      <Expensive />
    </div>
  )
}

// Fix 1: move the state down into its own small component
function ClickCounter() {
  const [n, setN] = useState(0)
  return <button onClick={() => setN(n + 1)}>Clicked {n}</button>
}
function MovedDown() {
  return (
    <div>
      <ClickCounter />
      <Expensive />
    </div>
  )
}

// Fix 2: pass the slow part in as children
function Shell({ children }) {
  const [n, setN] = useState(0)
  return (
    <div>
      <button onClick={() => setN(n + 1)}>Clicked {n}</button>
      {children}
    </div>
  )
}
function ViaChildren() {
  return (
    <Shell>
      <Expensive />
    </Shell>
  )
}
```

Measured, after mount plus 3 clicks: `Together` rendered `Expensive` **4** times, `MovedDown` **1**, `ViaChildren` **1**.

**What happens, step by step:**
1. In `Together`, a click changes state, so `Together` runs again and creates a new `<Expensive />` element. React renders it.
2. In `MovedDown`, only `ClickCounter` owns the state. `MovedDown` never re-renders, so `Expensive` is untouched.
3. In `ViaChildren`, `Shell` re-renders, but `<Expensive />` was created by `ViaChildren`, which did not re-render. It is the same element object as before, so React skips it.

**Fix 3: split a context.** One context holding everything re-renders every consumer on every change, and context has no selector (a way to read one field). Split the value that changes often from the one that does not:

```jsx
import { createContext, useContext, useReducer } from 'react'

const CountContext = createContext(0)
const DispatchContext = createContext(null)

function CountProvider({ children }) {
  const [count, inc] = useReducer((c) => c + 1, 0) // the reducer ignores the action
  return (
    <CountContext value={count}>
      <DispatchContext value={inc}>{children}</DispatchContext>
    </CountContext>
  )
}
```

```jsx
function Display() {
  console.count('Display render')
  return <p>count {useContext(CountContext)}</p>
}

function Buttons() {
  console.count('Buttons render')
  const inc = useContext(DispatchContext)
  return <button onClick={() => inc()}>Add one</button>
}

// <CountProvider><Display /><Buttons /></CountProvider>
```

Measured after 3 clicks: `Display` rendered **4** times, `Buttons` **1**. Both are created by the parent of `CountProvider`, so the provider re-rendering does not touch them; only a changed context value does. The dispatch function has a stable identity, so `DispatchContext` never changes. For state libraries with real selectors (`useSelector` in Redux, `useStore(s => s.count)` in Zustand), see [State management](../03-intermediate/06-state-management.md) and [Context in depth](../02-hooks/05-usecontext.md).

**Common mistake:** a new object as the context value.

```jsx
// Wrong: a new object every render, so every consumer re-renders whenever this component does
<ThemeContext value={{ theme, toggle }}>{children}</ThemeContext>

// Fixed: keep the same object until theme or toggle really change
const value = useMemo(() => ({ theme, toggle }), [theme, toggle])
<ThemeContext value={value}>{children}</ThemeContext>
```

## 4. Memoize where measured, and move heavy work away
After the structure fixes, three tools remain. [The memoization lesson](../02-hooks/07-memoization.md) teaches them in depth. The short version:
- `memo(Component)` skips a render when the props are shallow-equal. It only works if the props are stable, so a handler passed to a memoized child also needs `useCallback`, and an object needs `useMemo`.
- `useMemo(fn, deps)` remembers a calculated value between renders.
- `useCallback(fn, deps)` remembers a function.

**The costs of `useMemo`:** on every render React still compares the dependencies and keeps the old value in memory; the code gets harder to read; wrong dependencies give stale values; and React treats the cache as a hint, so it may throw it away. It pays off only when the calculation is really slow (a common rule of thumb is about 1 ms or more, measured with `console.time` in a production build) or when the value is passed to a memoized child or used as an effect dependency.

```jsx
import { useMemo, useState } from 'react'

function slowSum(n) {
  console.count('slowSum')
  let total = 0
  for (let i = 0; i < n; i++) total += i
  return total
}

export default function Calc() {
  const [n] = useState(1000)
  const [tick, setTick] = useState(0)
  const total = useMemo(() => slowSum(n), [n])
  return <button onClick={() => setTick(tick + 1)}>tick {tick}, total {total}</button>
}
```

Measured: after mount plus 3 clicks, `slowSum` ran **1** time. Each click re-renders `Calc`, but `n` did not change, so React reuses the stored total.

**Work that is too slow even once** (parsing a big file, image filtering, a long loop) blocks the main thread. Two fixes:
- **Web Worker:** run it on another thread. A worker cannot touch the DOM; you send it data with `postMessage` and receive the answer the same way.
- **Chunking:** do 500 items, yield to the browser with `await new Promise((r) => setTimeout(r))`, do the next 500. Input can run between chunks.

```js
// primes-worker.js
self.onmessage = (event) => {
  let count = 0
  for (let n = 2; n <= event.data; n++) {
    let isPrime = true
    for (let d = 2; d * d <= n; d++) {
      if (n % d === 0) {
        isPrime = false
        break
      }
    }
    if (isPrime) count++
  }
  self.postMessage(count)
}
```

```jsx
import { useEffect, useRef, useState } from 'react'

export default function Primes() {
  const workerRef = useRef(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const worker = new Worker(new URL('./primes-worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = (event) => setResult(event.data)
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  return (
    <div>
      <button onClick={() => workerRef.current.postMessage(5_000_000)}>Count primes to 5 million</button>
      <p>{result === null ? 'No result yet' : `Primes found: ${result}`}</p>
      <input aria-label="Type while it works" />
    </div>
  )
}
```

**What happens, step by step:**
1. The effect creates the worker once (Vite bundles the `new URL(...)` file as a separate script) and stops it on unmount.
2. The click sends a number to the worker. The main thread returns at once.
3. The worker loops on its own thread. You can keep typing in the input.
4. The worker posts the count back, `onmessage` fires, and `setResult` shows it.

**Common mistake:** memoizing something cheap, or memoizing with an unstable input.

```jsx
// Wrong: filter() has a new array every render, so the memo below never hits
const visible = useMemo(() => items.filter(isActive), [items.filter(isActive)])

// Fixed: depend on the real inputs
const visible = useMemo(() => items.filter(isActive), [items])
```

## 5. Big lists: render only what is visible
The cost of a long list is the number of DOM nodes, not only the number of renders. Four options:
- **Virtualization (windowing):** keep only the rows near the viewport in the DOM and use a tall empty box so the scrollbar looks right. Libraries: `react-window` and TanStack Virtual (`@tanstack/react-virtual`). Check the docs of the version you install, the APIs differ between major versions.
- **Pagination or "load more":** the server sends 50 rows at a time. Simplest, and good for search engines and accessibility.
- **`content-visibility: auto`:** a CSS hint that lets the browser skip layout and paint for rows that are off screen. React still creates all the DOM nodes, so JavaScript and memory cost remain.
- **Smaller rows:** fewer elements per row, no heavy children.

```css
.row {
  content-visibility: auto;
  contain-intrinsic-size: auto 32px; /* a guess of the height so the scrollbar stays stable */
}
```

A library does the same job as the hand-written window you build in section 11, and adds measuring, variable heights and keyboard support. The usual shape is: give the scroll box a fixed height, ask the library for the list of visible items (with their offsets), render only those, and put a spacer as tall as the whole list inside.

**How a virtualizer works, step by step:**
1. The outer box has a fixed height and scrolls. An inner box is as tall as all rows together, so the scrollbar is honest.
2. On scroll, the library works out which row indexes are visible, plus a few extra above and below (overscan) to avoid blank flashes.
3. Only those rows are rendered, each placed at its offset (with `top` or `transform`).

Trade-offs to mention: browser find (Ctrl+F) cannot see rows that are not in the DOM, rows need a known or measured height, screen readers need hints such as `aria-rowcount`, and focus is lost when a focused row scrolls out. The React hooks lint plugin flags `useVirtualizer` as returning functions that cannot be memoized safely, so be careful when you combine it with React Compiler. You build a small version yourself in section 11 and in [exercise 24](../practice-app/exercises/react/24-virtualized-list/README.md).

**Common mistake:** rendering all rows and hoping `memo` fixes it.

```jsx
// Wrong: 10,000 <li> elements still exist, memo only saves re-renders
{rows.map((r) => <MemoRow key={r.id} item={r} />)}

// Fixed: render a window of about 20 rows
{rows.slice(first, last).map((r) => <MemoRow key={r.id} item={r} />)}
```

## 6. Stay responsive: transitions, debounce, layout thrashing
**Transitions and deferred values.** When one keystroke triggers a slow render, split the update in two: the input must update now, the list can wait. The details live in [Concurrent React and Suspense](03-concurrent-react-and-suspense.md) and [Other hooks](../02-hooks/09-other-hooks.md).

```jsx
import { useState, useTransition } from 'react'

function Search({ renderResults }) {
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleChange(e) {
    setText(e.target.value) // urgent: the input updates at once
    startTransition(() => setQuery(e.target.value)) // not urgent: can lag and be interrupted
  }

  return (
    <div>
      <input value={text} onChange={handleChange} aria-label="Search" />
      {isPending && <span>Updating...</span>}
      {renderResults(query)}
    </div>
  )
}
```

`const deferredQuery = useDeferredValue(query)` gives the same effect when you cannot wrap the setter. A transition does not make the work faster. It stops the work from blocking input, and React may drop a half-finished render when a newer keystroke arrives.

**Debounce and throttle.** *Debounce* waits until the user stops (search box: one request after 300 ms of silence). *Throttle* allows at most one call per interval (scroll and resize handlers). Both cut work; neither is needed if the work is already cheap.

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
```

**What happens, step by step:** each change of `value` starts a timer; the cleanup cancels the previous timer; only a value that stays unchanged for `delay` ms reaches `debounced`. Practice: [debounce](../practice-app/exercises/js/01-debounce/README.md), [throttle](../practice-app/exercises/js/02-throttle/README.md), [autocomplete](../practice-app/exercises/react/12-autocomplete-debounce/README.md).

**Layout thrashing.** Reading a layout value such as `offsetHeight` right after changing a style forces the browser to recalculate layout immediately. Doing that in a loop recalculates it again and again. Batch all reads, then all writes. Animate `transform` and `opacity`, which do not need layout.

```js
// Wrong: read, write, read, write... layout is recalculated on every pass
elements.forEach((el) => {
  el.style.height = el.offsetHeight + 10 + 'px'
})

// Fixed: all reads first, then all writes
const heights = elements.map((el) => el.offsetHeight)
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px'
})
```

**Common mistake:** putting the input's own value in a transition.

```jsx
// Wrong: the text box now lags behind the keyboard
startTransition(() => setText(e.target.value))

// Fixed: the controlled value is urgent, only the expensive result is a transition
setText(e.target.value)
startTransition(() => setQuery(e.target.value))
```

## 7. Load less code: code splitting and bundle size
A **bundle** is the JavaScript file the build produces. A big one delays the first screen, because the browser must download, parse and run it. **Code splitting** cuts it into pieces (**chunks**) and loads a piece only when needed. In React you split with `lazy` and a dynamic `import()`:

```jsx
import { lazy, Suspense, useState } from 'react'

const loadSettings = () => import('./Settings.jsx') // Settings.jsx needs a default export
const Settings = lazy(loadSettings)

export default function App() {
  const [show, setShow] = useState(false)
  return (
    <div>
      <button onMouseEnter={loadSettings} onFocus={loadSettings} onClick={() => setShow(true)}>
        Settings
      </button>
      <Suspense fallback={<p>Loading settings...</p>}>{show && <Settings />}</Suspense>
    </div>
  )
}
```

**What happens, step by step:**
1. The bundler sees `import('./Settings.jsx')` and writes that file as its own chunk.
2. `lazy` does not call the loader until `Settings` is first rendered.
3. On first render the loader runs, the component suspends, and `Suspense` shows the fallback. When the chunk arrives, the real component replaces it. In a real run the fallback showed first, and the loader was called once even after the parent re-rendered.
4. Hovering or focusing the button calls `loadSettings` early (a **prefetch**). The browser caches the module, so the later click finds it ready.

Split at **routes** first (each page is a chunk; see [React Router](../03-intermediate/03-react-router.md)), then at heavy features that most visitors never open (a chart library, a rich-text editor, a modal).

**Shrinking the bundle:**
1. **Analyse.** `npm run build` prints each chunk with its size and gzip size, and warns above 500 kB. For a picture, add `rollup-plugin-visualizer` (it works in Vite 8) and open `stats.html`:

```js
// vite.config.js (after: npm i -D rollup-plugin-visualizer)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [react(), visualizer({ filename: 'stats.html', template: 'treemap', gzipSize: true })],
})
```

2. **Tree shaking.** The build drops exports you never use, but only from ES modules. Import by name from packages that ship ES modules.
3. **Replace heavy libraries.** Check the cost of a package before adding it (the "Import Cost" editor extension and the bundlephobia site show it). A date library for one formatting call can often become `Intl.DateTimeFormat`.
4. **Remove duplicates and dead code:** two versions of one library, unused dependencies, polyfills you do not need.

See also Tooling (planned).

**Common mistake:** two classic ones.

```jsx
// Wrong: lazy() inside a component creates a new component type on every render
function Page() {
  const Chart = lazy(() => import('./Chart.jsx'))
  return <Suspense fallback="Loading..."><Chart /></Suspense>
}

// Fixed: define it once at module level
const Chart = lazy(() => import('./Chart.jsx'))
```

In a real run, the wrong version called the loader again after one parent re-render and showed the fallback again. The second mistake is lazy-loading what is on screen at the start (it delays LCP). And `import _ from 'lodash'` pulls in the whole library; use `import { sortBy } from 'lodash-es'`.

## 8. Images, fonts, network and the server
Images are often the largest part of a page and usually the LCP element.

```jsx
{/* The hero image is the LCP element: load it early, never lazy */}
<img src="/hero.avif" width="1200" height="600" fetchPriority="high" alt="Team at work" />

{/* Below the fold: lazy, with a known size so the page does not jump (CLS) */}
<img src="/team.avif" width="400" height="300" loading="lazy" decoding="async" alt="The team" />
```

- Use modern formats (AVIF, WebP), and `srcSet` and `sizes` so phones get small files.
- Always give `width` and `height` (or CSS `aspect-ratio`) so space is reserved.
- Fonts: serve WOFF2 from your own domain, subset them, preload the one used above the fold, and set `font-display: swap` so text shows at once in a fallback font.

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap;
}
```

**Network:**
- Give files with a hash in the name a long `Cache-Control` lifetime, and keep the HTML short-lived. Compress with Brotli or gzip. Use a CDN.
- Do not fetch in a waterfall (A, then B, then C) when requests are independent; start them together.
- A server-state library such as TanStack Query shares one request between components that ask for the same data and caches the result. Prefetch the next page on hover. See [Data fetching](../03-intermediate/02-data-fetching.md).

**Server rendering.** With plain client-side rendering the browser first gets an empty page, then downloads JavaScript, then renders. SSR or static generation sends real HTML first, which helps LCP. Streaming SSR sends the page in pieces as `Suspense` parts become ready. Server Components never ship their code to the browser, which shrinks the bundle. Client components still hydrate, so you still need the fixes above. Details: [SSR and Server Components](05-ssr-and-server-components.md).

**What happens, step by step (the LCP chain):** the browser downloads HTML, finds the hero image, downloads it, and paints it. Each delay (slow server, late discovery, big file, render-blocking script) adds to LCP. `fetchPriority="high"` and a small AVIF shorten the image step; SSR shortens the HTML step.

**Common mistake:** `loading="lazy"` on the hero image.

```jsx
// Wrong: the browser delays the most important image
<img src="/hero.avif" loading="lazy" alt="Team at work" />

// Fixed
<img src="/hero.avif" width="1200" height="600" fetchPriority="high" alt="Team at work" />
```

## 9. Memory leaks
A **memory leak** is memory your app keeps but no longer needs. The app slows down over a long session and may crash a phone tab. The usual cause in React is an effect that starts something and never stops it: timers, event listeners, WebSocket or other subscriptions, requests with no abort. Another cause is a module-level cache that only grows.

```jsx
import { useEffect } from 'react'

// Leaks: the interval keeps running after the component is gone
function Leaky({ onTick }) {
  useEffect(() => {
    setInterval(onTick, 1000)
  }, [onTick])
  return <p>leaky</p>
}

// Fixed: return a cleanup function
function Clean({ onTick }) {
  useEffect(() => {
    const id = setInterval(onTick, 1000)
    return () => clearInterval(id)
  }, [onTick])
  return <p>clean</p>
}
```

**What happens, step by step:** in a real run with fake timers, both components were mounted and then unmounted, and 3 seconds passed. `Leaky`'s callback was called **3** times (and would never stop), `Clean`'s **0** times. The leaked interval also keeps the component's variables alive. The same shape applies to `addEventListener` (remove it in cleanup), `socket.close()`, `unsubscribe()` and `controller.abort()`. See [useEffect](../02-hooks/03-useeffect.md).

How to find one: in Chrome DevTools, open the Memory tab, take a heap snapshot, repeat the suspect action 10 times, take another, and compare. Growing counts, or "Detached" DOM nodes, point to the leak.

**Common mistake:** assuming the cleanup is optional because "the component is gone".

```jsx
// Wrong: the listener stays on window after unmount
useEffect(() => {
  window.addEventListener('resize', onResize)
}, [onResize])

// Fixed
useEffect(() => {
  window.addEventListener('resize', onResize)
  return () => window.removeEventListener('resize', onResize)
}, [onResize])
```

## 10. React Compiler, budgets and monitoring
**React Compiler 1.0** (stable since 2025-10-07) is a build step that adds memoization for you. It targets re-render work: skipping cascading re-renders of children and skipping expensive calculations inside components and hooks. It does not target first-mount cost, big lists, bundle size or the network. It skips code that breaks the Rules of React without failing the build. Keep `useMemo` and `useCallback` as an escape hatch, for example for a value used as an effect dependency, and do not rip out existing ones blindly. Opt a component out with `"use no memo"`. Setup with Vite 8 (`npm i -D babel-plugin-react-compiler @rolldown/plugin-babel`):

```js
// vite.config.js
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
})
```

Compiled components show a "Memo" badge in React DevTools. The compiler lint rules ship inside `eslint-plugin-react-hooks` 7 and work even without the compiler. More in [the memoization lesson](../02-hooks/07-memoization.md).

**Budgets and monitoring.** A **performance budget** is a limit the team agrees on and checks automatically, so speed does not slowly rot:
- Field targets (p75 of real users): LCP up to 2.5 s, INP up to 200 ms, CLS up to 0.1.
- Build limits, for example "initial JavaScript under a size you choose", checked in CI with a size-limit tool or a Lighthouse CI run.
- Real user monitoring with the `web-vitals` snippet from section 2, with alerts when a metric turns "poor" after a release.

See [Frontend system design](11-frontend-system-design.md) for observability, and Browser and web platform (planned) for the rendering pipeline.

**Common mistake:** trusting only your own fast laptop.

```text
Wrong: "Lighthouse says 98 on my machine, so users are fine."
Fixed: check field data from real devices, and test with CPU throttling and a slow network.
```

## 11. Worked scenario: 10,000 items with a search box
**The problem:** a page shows 10,000 items and a search box. Typing feels slow. We follow the loop from section 1.

**Setup.** The data is `Array.from({ length: 10000 }, (_, i) => ({ id: i + 1, name: 'Item ' + (i + 1) }))`. Numbers below were measured in the practice app with Vitest and jsdom (a fake browser with no layout or paint). A real browser pays more, so trust the render counts and compare the milliseconds only as ratios.

**Step 0, the slow version:**

```jsx
import { useState } from 'react'

const ITEMS = Array.from({ length: 10000 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))

function Row({ item }) {
  console.count('Row render')
  return <li>{item.name}</li>
}

export default function SlowSearch() {
  const [query, setQuery] = useState('')
  const rows = ITEMS.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p>{rows.length} results</p>
      <ul>
        {rows.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </ul>
    </div>
  )
}
```

**Step 1, measure.** Mount: **10,000** `Row` renders and 10,000 `<li>` elements (about 200-260 ms). Typing "1": **3,440** rows match, and all 3,440 re-render (about 45-65 ms). Typing "12": 299 more renders. The Profiler would show the same: one `SlowSearch` render and thousands of `Row` bars.

**Step 2, `memo(Row)`.** Write `const Row = memo(function Row({ item }) {...})`. The `item` objects are the same objects as before, so props are equal. Typing "1": **0** row renders (about 30 ms, down from about 45-65). `useMemo` around the filter would not help here: `query` is the dependency and it is the thing that changes on each key.

But look at the other side: clearing the box mounts **9,701** rows again, and 10,000 `<li>` still sit in the DOM. `memo` removed wasted renders; it did not remove the real problem, which is the number of DOM nodes.

**Step 3, virtualization.** Render only the rows in view. A small hand-written version (fixed row height):

```jsx
import { useState } from 'react'

const ROW_HEIGHT = 32
const VIEWPORT_HEIGHT = 320
const OVERSCAN = 5

function WindowedList({ rows }) {
  const [scrollTop, setScrollTop] = useState(0)
  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const last = Math.min(rows.length, Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ROW_HEIGHT) + OVERSCAN)
  return (
    <div
      data-testid="viewport"
      style={{ height: VIEWPORT_HEIGHT, overflowY: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <ul style={{ height: rows.length * ROW_HEIGHT, position: 'relative', margin: 0, padding: 0, listStyle: 'none' }}>
        {rows.slice(first, last).map((row, i) => (
          <li
            key={row.id}
            style={{ position: 'absolute', top: (first + i) * ROW_HEIGHT, height: ROW_HEIGHT, left: 0, right: 0 }}
          >
            {row.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function WindowedSearch() {
  const [query, setQuery] = useState('')
  const rows = ITEMS.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p>{rows.length} results</p>
      <WindowedList key={query} rows={rows} />
    </div>
  )
}
```

**What happens, step by step:**
1. The scroll box is 320 px tall; the `<ul>` inside is as tall as 10,000 rows, so the scrollbar is honest.
2. `first` and `last` come from `scrollTop`: at the top, rows 0 to 15 (10 visible plus 5 overscan).
3. Only that slice is rendered, and each row is placed with `top`. Scrolling to 3200 px renders 20 rows, "Item 96" to "Item 115".
4. `key={query}` makes React start a fresh `WindowedList` for each query, which resets the scroll position to the top (a new key means a new component instance).
5. `scrollTop` lives inside `WindowedList`, so a scroll re-renders only about 20 rows and never re-runs the filter.

**Step 4, re-measure.** Mount: **15** rows (about 10-17 ms). Typing "1": 15 row renders, 15 `<li>` in the DOM, about 3 ms, and the header still says 3,440 results.

| Version | Row renders on mount | Row renders typing "1" | `<li>` in DOM after "1" | Time to type "1" (jsdom) |
|---|---|---|---|---|
| Plain rows | 10,000 | 3,440 | 3,440 | about 45-65 ms |
| `memo(Row)` | 10,000 | 0 | 3,440 | about 30 ms |
| Windowed | 15 | 15 | 15 | about 3 ms |

**Step 5, keep going only if needed.** If each row is heavy even at 20 rows, add `useDeferredValue(query)` so the input stays instant. If the data comes from a server, filter on the server and paginate. In production code, replace the hand-written window with TanStack Virtual or `react-window` (variable heights, keyboard support, accessibility). Finally, verify in the production build with the Performance panel: the typing interaction should stay well under 200 ms, then watch INP in the field.

**Common mistake:** declaring victory from the dev server.

```text
Wrong: "It felt fast in npm run dev, ship it."
Fixed: record the same action in npm run preview, with CPU 4x slowdown, and compare with the number from step 1.
```

## How interviewers test this
- **Method over tricks.** A strong answer starts with "I would measure first" and names a tool (Profiler, Performance panel, Lighthouse, field Web Vitals). A red flag is listing `useMemo` and `useCallback` as the first answer.
- **Structure before memoization.** Moving state down, passing children and splitting context come first. Candidates who can explain why (a re-render creates new child elements, `children` keeps the same ones) stand out.
- **Knowing the costs.** Every fix has a price: memo adds comparisons, virtualization breaks browser find, lazy loading adds a loading state, workers copy data.
- **Current facts.** INP replaced FID; React Compiler automates memoization; the dev build is slower than production; StrictMode doubles renders in development only.
- **Scenario thinking.** "The list is slow, what do you do?" expects steps, numbers and a stop condition, not a list of buzzwords. Practice with [round 7](../05-interview-rounds/round-7-performance-and-testing/README.md).

## Interview questions and model answers
### Q1. How would you optimise a slow React app? (Medium)
I start by measuring, not guessing. I reproduce the slow action and record it with the React DevTools Profiler and the Performance panel in a production build. Then I classify the problem: slow load (bundle, images, server; LCP), slow interaction (renders, long tasks, too many DOM nodes; INP) or layout jumps (CLS). For renders I fix structure first (move state down, pass children, split context), then memoize what the Profiler shows is hot. For big data I virtualize or paginate; for load I code split, shrink the bundle and optimise images. After each change I measure again and stop when the number meets the goal.

### Q2. When should you use `React.memo`, `useMemo` and `useCallback`? (Medium)
Only when something downstream compares values and the work saved is real. `memo` skips a component render when props are shallow-equal, so it needs stable props. `useMemo` helps for a slow calculation or for a value passed to a memoized child or an effect dependency. `useCallback` helps when the function goes to a memoized child or is an effect dependency; on its own it saves nothing. With React Compiler enabled most of this is automatic, and the hooks remain an escape hatch. See [the memoization lesson](../02-hooks/07-memoization.md).

### Q3. How do you find unnecessary re-renders? (Medium)
In the Profiler I record the action, then look at which components rendered and why: with "Record why each component rendered" on, it says "props changed", "state changed" or "parent rendered". "Highlight updates" gives a quick visual check, and React Scan does the same without changing code. In code, a `console.count` in the component gives exact numbers. I do this in development to learn *why*, but I judge *how slow* in a production build, because the dev build and StrictMode add extra work.

### Q4. What are Core Web Vitals, and what is INP? (Medium)
They are three user-centred metrics measured at the 75th percentile of real visits: LCP (when the main content shows, good up to 2.5 s), INP (how fast the page responds to input, good up to 200 ms) and CLS (layout stability, good up to 0.1). INP replaced FID in 2024. It looks at every click, tap and key press in a visit and measures the time until the next paint: input delay, handler time and rendering. To improve it: do less work in handlers, split long tasks, use transitions for non-urgent updates, cut render cost and DOM size, and keep third-party scripts in check.

### Q5. What is virtualization (windowing)? (Medium)
Instead of putting 10,000 rows in the DOM, you render only the rows in or near the viewport and use a tall spacer so the scrollbar behaves normally. As the user scrolls, the visible slice changes. It cuts DOM size, memory, render time and layout cost. Libraries: `react-window` and TanStack Virtual. Trade-offs: browser find does not see unrendered rows, variable heights need measuring, and accessibility needs care. Pagination is the simpler alternative when the design allows it.

### Q6. What is code splitting, and how does lazy loading work? (Medium)
Code splitting breaks one big bundle into chunks that load on demand. In React, `lazy(() => import('./X.jsx'))` wraps a dynamic import. The bundler emits `X` as its own chunk. The first time React renders it, the loader runs and the component suspends, so the nearest `Suspense` shows its fallback until the chunk arrives. Split by route first, then by heavy features. Prefetch on hover or idle to hide the wait. Define `lazy` at module level, and do not lazy-load content that is visible at the start.

### Q7. How do you reduce bundle size? (Medium)
Measure first: the build output and a visualizer treemap. Then remove or replace heavy dependencies, import by name from ES module packages so tree shaking works, split code by route and feature, remove duplicate versions and unused code, load rarely used features lazily, and compress with Brotli or gzip. Server Components also keep server-only code out of the browser bundle. Add a size check to CI so it cannot grow unnoticed.

### Q8. What are the costs of `useMemo`? (Hard)
Memory for the stored value and old dependencies, a dependency comparison on every render, more code to read, and the risk of stale values when dependencies are wrong. The cache is only a hint: React may discard it, and in development StrictMode calls the calculation twice. If the calculation is cheap, the bookkeeping can cost more than it saves. And it helps nothing unless the result is used by a memoized child, an effect dependency, or a really slow render.

### Q9. How do memory leaks happen in React, and how do you fix them? (Medium)
Most come from effects that start something and never undo it: `setInterval`, `addEventListener`, WebSocket or other subscriptions, requests with no abort. The fix is the cleanup function returned from the effect (`clearInterval`, `removeEventListener`, `unsubscribe`, `abort`). Other sources: caches that only grow, and closures holding large data. I find them with heap snapshots in the Memory tab: repeat the action and compare.

### Q10. Do you still need `useMemo` and `useCallback` with React Compiler? (Medium)
Much less. React Compiler 1.0 memoizes components and hooks at build time, so plain code gets most of the benefit. It skips code that breaks the Rules of React, and it does not help first-mount cost, big lists or bundle size. I keep manual memoization where I need exact control, such as a stable effect dependency, and I do not remove existing ones without measuring. Tools like why-did-you-render do not work with the compiler.

## Common mistakes and gotchas
- Optimising without a measurement: record first, keep a before and after number.
- Profiling the dev server: use `npm run build` and `npm run preview`; remember StrictMode doubles renders only in development.
- `memo` with unstable props (inline objects, arrow functions): stabilise with `useMemo` and `useCallback`, or move state down instead.
- `useCallback` on a handler passed to a plain child: it saves nothing; memoize the child too, or remove the hook.
- New object as a context value: wrap it in `useMemo`, or split the context.
- `lazy()` inside a component: move it to module level.
- Lazy-loading the hero image or the first screen: lazy-load only what is off screen.
- Images without `width` and `height`: add them to avoid layout shift.
- Effects without cleanup: return a function that stops the timer, listener or subscription.
- Virtualizing without a plan for focus, find and screen readers: add `aria` hints and test with the keyboard.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Explain: why should you measure performance in a production build, and what does StrictMode do to your render counts in development?

   <details>
   <summary>Show answer</summary>

   The production build is minified and has none of the development checks and warnings, so its timings are the real ones. In development, StrictMode calls each component function twice (it also runs effects as setup, cleanup, setup on mount), so function-call counts double while commits do not. Use development to learn *why* something renders, and `npm run build` plus `npm run preview` to judge *how slow* it is. In production there is no double rendering.

   </details>

2. **(Easy)** Predict: how many times does `Chart` render after the first mount plus 3 clicks (no StrictMode)? How would you stop the extra renders?

   ```jsx
   function Chart() {
     console.count('Chart')
     return <p>chart</p>
   }
   function Page() {
     const [open, setOpen] = useState(false)
     return (
       <div>
         <button onClick={() => setOpen(!open)}>Toggle</button>
         {open && <p>Details</p>}
         <Chart />
       </div>
     )
   }
   ```

   <details>
   <summary>Show answer</summary>

   **4** (1 on mount, 1 per click). `Page` re-renders on every click and creates a new `<Chart />` element, and React renders children of a re-rendered parent by default. Fixes: move the toggle into its own component, pass `<Chart />` in as `children` of a wrapper that owns the state, or wrap `Chart` in `memo` (it has no props, so they are always equal).

   </details>

3. **(Medium)** Predict: a component starts `setInterval(onTick, 1000)` in an effect with no cleanup. It mounts, then unmounts at once. How many times is `onTick` called during the next 3 seconds, and when does it stop? Fix it.

   <details>
   <summary>Show answer</summary>

   3 times in 3 seconds (measured with fake timers). It never stops: the interval is never cleared, so it keeps calling `onTick` and keeps the component's variables in memory. Fix:

   ```jsx
   useEffect(() => {
     const id = setInterval(onTick, 1000)
     return () => clearInterval(id)
   }, [onTick])
   ```

   </details>

4. **(Medium)** Code: typing in the colour box re-renders `BigReport`. Change the structure so it does not, without using `memo`.

   ```jsx
   export default function SlowPage() {
     const [color, setColor] = useState('tomato')
     return (
       <div style={{ background: color }}>
         <input aria-label="Colour" value={color} onChange={(e) => setColor(e.target.value)} />
         <BigReport />
       </div>
     )
   }
   ```

   <details>
   <summary>Show answer</summary>

   Move the state into a wrapper that receives the slow part as `children`:

   ```jsx
   function ColorPanel({ children }) {
     const [color, setColor] = useState('tomato')
     return (
       <div style={{ background: color }}>
         <input aria-label="Colour" value={color} onChange={(e) => setColor(e.target.value)} />
         {children}
       </div>
     )
   }

   export default function Page() {
     return (
       <ColorPanel>
         <BigReport />
       </ColorPanel>
     )
   }
   ```

   `Page` never re-renders, so the `<BigReport />` element is the same object each time and React skips it. Check with `console.count('BigReport')` inside it: it should print once.

   </details>

5. **(Medium)** Code: load a `Settings` component only when the user clicks a button, show "Loading settings..." while it loads, and start loading when the pointer enters the button.

   <details>
   <summary>Show answer</summary>

   ```jsx
   import { lazy, Suspense, useState } from 'react'

   const loadSettings = () => import('./Settings.jsx') // default export
   const Settings = lazy(loadSettings)

   export default function App() {
     const [show, setShow] = useState(false)
     return (
       <div>
         <button onMouseEnter={loadSettings} onFocus={loadSettings} onClick={() => setShow(true)}>
           Settings
         </button>
         <Suspense fallback={<p>Loading settings...</p>}>{show && <Settings />}</Suspense>
       </div>
     )
   }
   ```

   `lazy` is created once at module level. Calling `loadSettings` early starts the download; the click then finds the module cached.

   </details>

6. **(Medium)** Explain: what goes wrong here when `count` changes, and how do you fix it?

   ```jsx
   function Page() {
     const [count, setCount] = useState(0)
     const Chart = lazy(() => import('./Chart.jsx'))
     return (
       <>
         <button onClick={() => setCount(count + 1)}>{count}</button>
         <Suspense fallback="Loading..."><Chart /></Suspense>
       </>
     )
   }
   ```

   <details>
   <summary>Show answer</summary>

   Every render creates a new lazy component, which React sees as a different component type. In a real run, one click made the loader run a second time and the fallback appear again; the old subtree is thrown away and its state is lost. Move `const Chart = lazy(...)` to module level, outside `Page`.

   </details>

7. **(Hard)** Code: write `FixedWindow({ rows, rowHeight = 32, height = 320 })` that renders only the visible rows plus 5 extra above and below. Test idea: with 10,000 rows, no more than 30 `<li>` exist.

   <details>
   <summary>Show answer</summary>

   ```jsx
   import { useState } from 'react'

   export default function FixedWindow({ rows, rowHeight = 32, height = 320 }) {
     const [scrollTop, setScrollTop] = useState(0)
     const first = Math.max(0, Math.floor(scrollTop / rowHeight) - 5)
     const last = Math.min(rows.length, Math.ceil((scrollTop + height) / rowHeight) + 5)
     return (
       <div style={{ height, overflowY: 'auto' }} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
         <ul style={{ height: rows.length * rowHeight, position: 'relative', margin: 0, padding: 0, listStyle: 'none' }}>
           {rows.slice(first, last).map((row, i) => (
             <li key={row.id} style={{ position: 'absolute', top: (first + i) * rowHeight, height: rowHeight }}>
               {row.name}
             </li>
           ))}
         </ul>
       </div>
     )
   }
   ```

   At the top it renders `ceil(320 / 32) + 5 = 15` rows. In a test, use `fireEvent.scroll(box, { target: { scrollTop: 3200 } })` (jsdom keeps `scrollTop` as a settable number) and check that the first visible row is the one at index 95. The full exercise is [exercise 24](../practice-app/exercises/react/24-virtualized-list/README.md).

   </details>

8. **(Hard)** Explain: field data for a shop page shows LCP 4.8 s, INP 350 ms and CLS 0.02. What do you check first, and in what order?

   <details>
   <summary>Show answer</summary>

   CLS is good, leave it. LCP is "poor" and INP "needs improvement", so start with LCP. Find the LCP element (Performance panel or Lighthouse). Typical causes: the hero image is lazy-loaded or found late, it is a big JPEG, the server is slow, or a large bundle blocks rendering in a client-rendered page. Fixes: `fetchPriority="high"`, AVIF at the right size, SSR or static generation, code splitting. Then INP: use the `web-vitals` attribution build or the Performance panel to find the slow interaction. Look for long handlers, big re-renders and huge lists; use transitions, state colocation, virtualization and lazy third-party scripts. Re-measure after each change and set a budget so the numbers do not regress.

   </details>

## Recap
- Measure, find the bottleneck, fix one thing, measure again. Use a production build.
- Core Web Vitals at p75: LCP up to 2.5 s, INP up to 200 ms, CLS up to 0.1. INP replaced FID in 2024.
- Fix renders by structure first (move state down, pass children, split context), then `memo`, `useMemo` and `useCallback` where measured.
- Heavy work goes to a Web Worker or into chunks. Big lists need virtualization or pagination, because DOM nodes are the real cost.
- Transitions and deferred values keep input responsive; debounce and throttle cut work; batch layout reads and writes.
- Split code at routes with `lazy` and `Suspense` (module level, prefetch on hover), analyse the bundle, import by name.
- Size images, set `fetchPriority` on the hero, use `font-display: swap`, cache and compress, render on the server.
- Clean up timers, listeners and subscriptions; React Compiler automates memoization, not lists, bundles or leaks.

## Where to go next
- Next lesson: [Concurrent React and Suspense](03-concurrent-react-and-suspense.md) (transitions, deferred values, streaming).
- Related lessons: [React.memo, useMemo and useCallback](../02-hooks/07-memoization.md), [SSR and Server Components](05-ssr-and-server-components.md), [Frontend system design](11-frontend-system-design.md), Advanced patterns (planned).
- Practice: [Exercise 24, virtualized list](../practice-app/exercises/react/24-virtualized-list/README.md), [Exercise 12, autocomplete with debounce](../practice-app/exercises/react/12-autocomplete-debounce/README.md).
- Interview drill: [Round 7, performance and testing](../05-interview-rounds/round-7-performance-and-testing/README.md).
