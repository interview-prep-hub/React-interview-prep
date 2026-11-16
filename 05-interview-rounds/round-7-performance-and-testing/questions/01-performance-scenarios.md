# Round 7 - Performance and Testing: Performance Scenarios

**How to use this file:** Each item is a real-looking problem report. Give yourself 8 to 10 minutes per scenario. Say your answer out loud in this order: (1) how you would find the cause, (2) the fixes in the order you would try them, (3) when you would leave the code alone. Then open the answers file and score yourself: one point for the right diagnosis tool, one for the right cause, one for a correct fix with code, one for "when not to optimize".
**Answers:** [answers/01-performance-scenarios.md](../answers/01-performance-scenarios.md)  (do not open until you have tried)
**Learn first:** [Performance optimization](../../../04-advanced/02-performance-optimization.md), [Memoization](../../../02-hooks/07-memoization.md), [How React renders](../../../04-advanced/01-how-react-renders.md), [Concurrent React and Suspense](../../../04-advanced/03-concurrent-react-and-suspense.md)

A short vocabulary before you start:
- **Re-render:** React calls your component function again to work out what the screen should look like.
- **Commit:** React applies the changes to the real page (the DOM).
- **Profiler:** the React DevTools tab that records which components rendered and how long they took.
- **Main thread:** the one thread where the browser runs JavaScript, handles clicks and paints the screen. If it is busy, the page feels frozen.

## Too many re-renders

**R7-PF-001 (Medium)** The product search page below renders 5000 rows under a text box. On a mid-range laptop, typing in the box feels laggy: letters appear late. How do you find the cause, and what do you change, in what order?

```jsx
import { useState } from 'react'

const PRODUCTS = Array.from({ length: 5000 }, (_, i) => ({ id: i, name: `Product ${i}` }))

function Row({ product }) {
  return <li>{product.name}</li>
}

export default function Search() {
  const [query, setQuery] = useState('')
  const visible = PRODUCTS.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {visible.map((p) => (
          <Row key={p.id} product={p} />
        ))}
      </ul>
    </>
  )
}
```

**R7-PF-002 (Medium)** Users click a theme toggle. Everything on the page re-renders, including a heavy dashboard that does not care about the theme, and the click feels slow. How do you prove what is happening, how do you fix it, and is there a way to change the theme without re-rendering React components at all?

```jsx
import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext({ theme: 'light', toggle: () => {} })

function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeContext)
  return <button onClick={toggle}>Theme: {theme}</button>
}

function Dashboard() {
  // Imagine charts and a big table here. It never reads the theme.
  return <section aria-label="Dashboard">Heavy dashboard</section>
}

export default function App() {
  const [theme, setTheme] = useState('light')
  const value = { theme, toggle: () => setTheme(theme === 'light' ? 'dark' : 'light') }
  return (
    <ThemeContext value={value}>
      <ThemeToggle />
      <Dashboard />
    </ThemeContext>
  )
}
```

**R7-PF-003 (Easy)** A small clock in the header ticks every second. The Profiler shows the heavy `Dashboard` re-rendering once per second as well. Why does this happen, and what are the options to stop it? Mention React Compiler.

```jsx
import { useEffect, useState } from 'react'

function Dashboard() {
  // Imagine charts and a big table here.
  return <section aria-label="Dashboard">Heavy dashboard</section>
}

export default function App() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <header>{now.toLocaleTimeString()}</header>
      <Dashboard />
    </>
  )
}
```

## Slow interactions

**R7-PF-004 (Hard)** On a product page, picking a category from a custom dropdown takes about 600 ms before the menu closes and the grid updates. Field data (real users) says the page has a poor INP. What is INP, how do you find the slow interaction, and how do you fix this component without changing what the user sees in the end?

```jsx
import { useState } from 'react'

const CATEGORIES = ['all', 'shoes', 'hats', 'bags']
const PRODUCTS = Array.from({ length: 3000 }, (_, i) => ({
  id: i,
  category: CATEGORIES[(i % 3) + 1],
  name: `Item ${i}`,
}))

function ProductGrid({ category }) {
  const items = category === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === category)
  return (
    <ul aria-label="Products">
      {items.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  )
}

export default function Products() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('all')

  function choose(value) {
    setOpen(false)
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
      <ProductGrid category={category} />
    </div>
  )
}
```

**R7-PF-005 (Medium)** A report component builds statistics from 20,000 orders. Typing in the note box under the report is laggy. How do you confirm that the calculation is the problem, and how do you fix it? When is `useMemo` the wrong tool?

```jsx
import { useState } from 'react'

export function computeStats(orders) {
  const sorted = [...orders].sort((a, b) => b.amount - a.amount)
  const customers = [...new Set(orders.map((o) => o.customer))]
  const perCustomer = customers.map((c) =>
    orders.filter((o) => o.customer === c).reduce((sum, o) => sum + o.amount, 0),
  )
  return { top: sorted[0], customers: customers.length, best: Math.max(...perCustomer) }
}

export default function Report({ orders }) {
  const [note, setNote] = useState('')
  const summary = computeStats(orders) // runs again on every keystroke in the note
  return (
    <div>
      <p>Customers: {summary.customers}</p>
      <p>Biggest order: {summary.top.amount}</p>
      <textarea aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
    </div>
  )
}
```

**R7-PF-006 (Medium)** The search box below calls the API on every keystroke. When someone types "abc" quickly, three requests are sent, the server is hammered, and sometimes the answer for "ab" arrives after the answer for "abc", so the screen shows the wrong results. Fix it, and explain debounce versus throttle. Would `useDeferredValue` help here?

```jsx
import { useState } from 'react'

export default function SearchBox() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  function handleChange(event) {
    const text = event.target.value
    setQuery(text)
    fetch(`/api/search?q=${encodeURIComponent(text)}`)
      .then((res) => res.json())
      .then(setResults)
  }

  return (
    <div>
      <input aria-label="Search" value={query} onChange={handleChange} />
      <ul>
        {results.map((r) => (
          <li key={r.id}>{r.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

## Big lists, bundles and loading

**R7-PF-007 (Medium)** A table page renders 10,000 rows. The first render takes seconds, scrolling is janky and memory use is high. Every row is 32 px tall. Explain virtualization (also called windowing) and write a minimal windowed list. What are the downsides?

**R7-PF-008 (Medium)** Lighthouse says "Reduce unused JavaScript". Your main bundle (the JavaScript file the browser downloads first) is 2 MB. How do you find out what is inside it, and how do you shrink it? Give code for at least two changes.

**R7-PF-009 (Hard)** Field data for a landing page shows LCP of 4.5 s and CLS of 0.3. The page is a client-side React app: it fetches the hero image URL from an API in an effect, images have no size, and a web font swaps in late. What do you check, what do you change, and which of these problems can React itself help with?

## Memory

**R7-PF-010 (Hard)** Support reports that the dashboard tab grows to over 1 GB of memory after a day, and that moving between pages many times makes it climb. The component below is used on one of those pages. How do you find a memory leak in a React app, what is wrong here, and how do you fix it?

```jsx
import { useEffect, useState } from 'react'

export default function LiveStatus() {
  const [width, setWidth] = useState(window.innerWidth)
  const [ticks, setTicks] = useState(0)

  useEffect(() => {
    window.addEventListener('resize', () => setWidth(window.innerWidth))
    setInterval(() => setTicks((t) => t + 1), 1000)
  }, [])

  return (
    <p>
      Width {width}, ticks {ticks}
    </p>
  )
}
```
