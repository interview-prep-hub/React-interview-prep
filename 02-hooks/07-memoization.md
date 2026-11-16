# React.memo, useMemo and useCallback

> **Level:** Intermediate   **Time:** about 55 minutes   **Read first:** [useState in depth](02-usestate-in-depth.md), [State and events](../01-basics/05-state-and-events.md), [Components and props](../01-basics/04-components-and-props.md)

## What you will learn
- Explain what makes a component re-render, and why a re-render is usually cheap and harmless.
- Use referential equality to predict when `React.memo`, `useMemo` and `useCallback` help, and when they do nothing at all.
- Use all three correctly: shallow prop comparison, custom comparators, the `children` trap, dependency arrays and stale values.
- Measure a slow screen with a render counter and the React Profiler, and show a real before and after.
- Apply the cheaper fixes first: move state down, pass content as `children`, calculate instead of storing derived data.
- Explain what React Compiler 1.0 automates, what happens to your manual memoization, and how to talk about it in a 2026 interview.

## 1. What makes a component re-render (and why that is usually fine)

**Memoization** means remembering the result of some work and reusing it when the inputs are the same. React gives you three tools for it: `React.memo` for components, `useMemo` for values and `useCallback` for functions. They are easy to misuse because people skip two questions: *what does "the same" mean here?* and *who checks?* Sections 2 and 6 answer them. First we need to know what we are trying to avoid.

A **render** is React calling your component function to find out what should be on screen. The function returns JSX. A **re-render** is React calling it again because something changed. A render is not a DOM update. After rendering, React compares the new JSX with the previous JSX and changes the real DOM only where the two differ. That second step is called the **commit** (see [How React renders](../04-advanced/01-how-react-renders.md)).

A picture that helps: rendering is redrawing a blueprint, committing is building the house. Redrawing is cheap. React keeps the building to a minimum.

A component re-renders for exactly three reasons:
1. Its own state changed.
2. Its parent re-rendered.
3. A context it reads changed (see [useContext](05-usecontext.md)).

Reason 2 surprises people. **By default, React does not check whether a child's props changed.** When a component renders, every component it returns renders too, and so on down the tree, even when the props are identical.

```jsx
import { useState } from 'react'

function Child() {
  console.log('Child render')
  return <p>I am a child.</p>
}

export default function Parent() {
  const [count, setCount] = useState(0)
  console.log('Parent render')

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
      <Child />
    </div>
  )
}
```

**What happens, step by step:**
1. On mount, `Parent` renders and returns JSX that contains `<Child />`. React renders `Child` too.
2. The user clicks. `setCount(1)` tells React that `Parent`'s state changed.
3. React calls `Parent` again. It logs `Parent render` and returns new JSX with a fresh `<Child />` element.
4. `Child` is part of what `Parent` returned, so React calls `Child` as well. It has no props and nothing about it changed, but it still re-renders.
5. React commits. It compares old and new output and finds one difference: the number inside the button text. In my test, a `MutationObserver` saw exactly one DOM change (that text) and the `<p>` element was never touched.

```text
mount:   Parent render, Child render
click 1: Parent render, Child render
```

A note on the logs in this lesson: every count was measured **without** `<StrictMode>`. A new Vite project wraps your app in `<StrictMode>` in `main.jsx`, and in development that makes React call each component twice, so every log appears twice. Remove the wrapper while you experiment, or read the numbers as "twice as many". Section 10 explains why.

**Why this is usually fine:**
- A render is a function call plus a comparison. Most components do very little work.
- React changes the DOM only where the output differs, and the DOM is the expensive part.
- Caching is not free either (section 6). Skipping a cheap render can cost as much as doing it.

A re-render becomes a problem only when **both** things are true: the render is slow (heavy calculation, thousands of elements) **and** it happens very often (every keystroke, every mouse move, every animation frame). The symptom is lag when typing or dragging.

**Common mistake:** caching something that costs almost nothing.

```jsx
// WRONG: comparing props costs about as much as rendering one <span>
const Label = memo(function Label({ text }) {
  return <span>{text}</span>
})

// RIGHT: a plain function component
function Label({ text }) {
  return <span>{text}</span>
}
```

Why: `memo` has to compare every prop on every parent render. For a tiny component the comparison saves nothing.

## 2. Referential equality: why a new `{}` is not the same `{}`

To skip work, React must decide whether two values are "the same". It uses a very simple rule called **referential equality**: *are these two values the very same thing in memory?*

- **Primitive values** (numbers, strings, booleans, `null`, `undefined`) are compared by value. `'hi'` is the same as `'hi'`.
- **Objects, arrays and functions** are compared by identity. Two objects with identical contents are still two different objects.

```js
console.log(5 === 5) // true
console.log('hi' === 'hi') // true
console.log({} === {}) // false
console.log([] === []) // false

const a = { x: 1 }
const b = { x: 1 }
const c = a
console.log(a === b) // false: same content, different objects
console.log(a === c) // true: the very same object

const f = () => {}
const g = () => {}
console.log(f === g) // false: two separate functions

console.log(Object.is(a, c)) // true
console.log(Object.is(NaN, NaN)) // true (but NaN === NaN is false)
```

Running this prints, line by line: `true true false false false true false true true`.

React compares with `Object.is`. It behaves like `===` except that `NaN` equals `NaN` and `+0` differs from `-0`. You will not notice the difference in daily work. It is used for props in `memo`, for dependency arrays, for context values, and for deciding whether `setState` received a new value (so `items.push(x); setItems(items)` does nothing: same array, same identity).

Now the part that matters. Every render is a fresh run of your component function, so **anything you create inside the function is a new thing every render**.

```jsx
import { useEffect, useMemo, useRef, useState } from 'react'

export default function IdentityDemo() {
  const [count, setCount] = useState(0)

  const options = { size: 10 } // a new object on every render
  const onSave = () => {} // a new function on every render
  const stable = useMemo(() => ({ size: 10 }), []) // the same object every render

  const previous = useRef(null)
  useEffect(() => {
    if (previous.current) {
      console.log(
        `render ${count}: options same? ${previous.current.options === options}, ` +
          `onSave same? ${previous.current.onSave === onSave}, ` +
          `stable same? ${previous.current.stable === stable}`,
      )
    }
    previous.current = { options, onSave, stable }
  })

  return <button onClick={() => setCount(count + 1)}>Render again ({count})</button>
}
```

**What happens, step by step:**
1. On each render, `options` and `onSave` are built from scratch. They look the same as last time but are new objects.
2. `useMemo` returns the stored object, so `stable` is the same object every time (section 4 explains how).
3. The Effect has no dependency array, so it runs after every render. It compares this render's values with the ones saved after the previous render.
4. After two clicks, it printed:

```text
render 1: options same? false, onSave same? false, stable same? true
render 2: options same? false, onSave same? false, stable same? true
```

Keep this picture in your head: *new object, new function, new identity, every render.* The rest of the lesson is about when that matters and what to do about it.

**Common mistake:** putting an object created during render into a dependency array.

```jsx
// WRONG: `filters` is a new object every render, so this Effect runs after every render
function Tasks({ status }) {
  const filters = { status }
  useEffect(() => {
    loadTasks(filters)
  }, [filters])
}

// RIGHT: depend on the primitive value and build the object inside the Effect
function Tasks({ status }) {
  useEffect(() => {
    loadTasks({ status })
  }, [status])
}
```

Why: the dependency array uses the same identity comparison. A new object is always "changed". (`loadTasks` stands for any function of yours that loads data.)

## 3. React.memo: skip a render when the props did not change

### 3.1 What it does

`memo` wraps a component. Before React renders that component again, it compares the new props with the old props. If they are **shallowly equal**, React skips the render and reuses the last result. Shallowly equal means: every prop passes `Object.is(oldValue, newValue)`. React does not look inside objects or arrays.

```jsx
import { memo, useState } from 'react'

const Greeting = memo(function Greeting({ name }) {
  console.log('Greeting render')
  return <p>Hello, {name}!</p>
})

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
      <Greeting name="Ada" />
    </div>
  )
}
```

**What happens, step by step:**
1. On mount, `App` renders and `Greeting` renders. One log.
2. The user clicks. `App`'s state changes and `App` re-renders. It returns `<Greeting name="Ada" />` with a new props object `{ name: 'Ada' }`.
3. Because `Greeting` is wrapped in `memo`, React compares the old props with the new ones. `'Ada'` and `'Ada'` are strings, which compare by value, so they are equal.
4. React skips `Greeting` and reuses its previous output. No log.

After mount and three clicks, `Greeting render` was logged **once**, not four times.

`memo` only protects against re-renders caused by the parent. It does **not** stop a render caused by the component's own state or by a context it reads. Those always render.

**Common mistake:** passing an inline object or inline function to a memoized child.

```jsx
import { memo, useState } from 'react'

const Chart = memo(function Chart({ options, onSelect }) {
  console.log('Chart render')
  return <button onClick={() => onSelect('bar')}>Chart ({options.color})</button>
})

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
      {/* WRONG: a new object and a new function on every render */}
      <Chart options={{ color: 'teal' }} onSelect={(kind) => console.log(kind)} />
    </div>
  )
}
```

After mount and three clicks, `Chart render` was logged **4 times**, as if `memo` were not there. Either problem alone is enough: I also ran the file with only the object inline and with only the function inline, and both gave 4. Each render creates a new `{ color: 'teal' }` and a new arrow function, so the shallow comparison sees "changed" and gives up.

The fix, when the values never change, is to create them once, outside the component:

```jsx
const CHART_OPTIONS = { color: 'teal' } // created once, when the file loads

function handleSelect(kind) {
  console.log(kind)
}

// inside App:
<Chart options={CHART_OPTIONS} onSelect={handleSelect} />
```

Now `Chart render` was logged once after three clicks. When the value depends on props or state, you cannot hoist it out of the component. That is the job of `useMemo` and `useCallback` (sections 4 and 5).

### 3.2 A custom comparison function

`memo` accepts an optional second argument: your own comparison function. It receives the old props and the new props, and returns `true` when they should count as equal (so React may skip the render).

```jsx
import { memo, useState } from 'react'

const UserCard = memo(
  function UserCard({ user }) {
    console.log('UserCard render')
    return <p>{user.name}</p>
  },
  // Return true when the props are "equal enough" and React may skip the render.
  (prevProps, nextProps) => prevProps.user.id === nextProps.user.id,
)

export default function App() {
  const [name, setName] = useState('Ada')
  const [tick, setTick] = useState(0)
  const user = { id: 1, name } // a new object on every render

  return (
    <div>
      <button onClick={() => setTick(tick + 1)}>Tick {tick}</button>
      <button onClick={() => setName('Grace')}>Rename</button>
      <UserCard user={user} />
    </div>
  )
}
```

**What happens, step by step:**
1. Each `Tick` click re-renders `App`, which builds a brand new `user` object. A default `memo` would see a changed prop.
2. Your comparison only looks at `user.id`, which is still `1`. It returns `true`, so React skips `UserCard`. After two ticks, `UserCard render` was still logged once.
3. Now the trap. Click `Rename`. The name really changed, but the comparison still only looks at `id`. It returns `true`, React skips the render, and the screen **still shows `Ada`**.

That is the danger: **your comparison replaces the default one**, so anything you forget to compare is ignored, and the UI goes stale. Rules for custom comparisons:
- Compare every prop that affects the output, including function props. In a second test I used `() => true` ("never re-render") on a button whose `onPick` handler read a changing `mode`. After switching `mode` to `B` and clicking Pick, the screen said `Picked: A`, because the button still held the first handler.
- Keep it cheap. A deep equality check on a big object can cost more than the render you are saving.
- Prefer fixing the props (stable identities) over writing a comparison. Use a comparison only when you cannot change the parent.

### 3.3 memo and the `children` prop

`children` is a prop like any other. JSX such as `<p>Static text</p>` creates a new element object every time the parent renders, so `children` is a new value every time.

```jsx
import { memo, useState } from 'react'

const Card = memo(function Card({ title, children }) {
  console.log('Card render')
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  )
})

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
      <Card title="Notes">
        <p>Static text</p>
      </Card>
    </div>
  )
}
```

**What happens, step by step:**
1. Every click re-renders `App`.
2. `App` evaluates `<p>Static text</p>` again and gets a new element object.
3. `title="Notes"` is equal, but `children` is a new object, so the shallow comparison fails and `Card` re-renders.
4. After mount and three clicks, `Card render` was logged **4 times**. `memo` did nothing.

Two ways to keep the `children` identity stable, both measured at 1 render after three clicks:

```jsx
// Option 1: create the element once, outside the component
const notes = <p>Static text</p>
// <Card title="Notes">{notes}</Card>

// Option 2: remember the element with useMemo
const notes = useMemo(() => <p>Static text</p>, [])
// <Card title="Notes">{notes}</Card>
```

These work, but they are a sign you are fighting the structure. Section 9 shows the better fix: do not create the children in the component that keeps changing.

## 4. useMemo: remember a calculated value

`useMemo(calculate, dependencies)` runs `calculate` during render, stores the result, and on later renders gives you the stored result **unless a dependency changed**. Dependencies are compared with `Object.is`, one by one.

```jsx
import { useMemo, useState } from 'react'

const TODOS = Array.from({ length: 5000 }, (_, i) => ({
  id: i,
  text: `Task ${i}`,
  done: i % 3 === 0,
}))

function filterTodos(todos, filter) {
  console.log('filtering...')
  if (filter === 'done') return todos.filter((t) => t.done)
  if (filter === 'open') return todos.filter((t) => !t.done)
  return todos
}

export default function TodoList() {
  const [filter, setFilter] = useState('all')
  const [dark, setDark] = useState(false)

  // Runs again only when `filter` changes. Toggling the theme reuses the old result.
  const visible = useMemo(() => filterTodos(TODOS, filter), [filter])

  return (
    <div className={dark ? 'dark' : 'light'}>
      <button onClick={() => setDark(!dark)}>Toggle theme</button>
      <button onClick={() => setFilter('done')}>Show done</button>
      <p>{visible.length} tasks</p>
    </div>
  )
}
```

**What happens, step by step:**
1. First render: React calls the function, which logs `filtering...`. React stores the result together with the dependency list `['all']`.
2. The user toggles the theme. `TodoList` re-renders. React compares `['all']` with `['all']`. They are equal, so React returns the stored array and never calls the function.
3. The user clicks `Show done`. The dependency is now `'done'`, which differs from `'all'`. React calls the function again and stores the new result.

```text
mount:               filtering...        (5000 tasks)
toggle theme twice:  (no log)
click "Show done":   filtering...        (1667 tasks)
```

**Is it really expensive?** Measure before you cache. Wrap the code in `console.time`:

```js
console.time('filter')
const visible = filterTodos(todos, filter)
console.timeEnd('filter')
```

On my machine, filtering these 5,000 items took about 0.2 ms. You cannot feel that, so in real code this `useMemo` would be unnecessary. I used it because it makes the effect easy to see. The React docs give a rough rule: if the measured time adds up to around a millisecond or more, caching may be worth it.

`useMemo` has a second, more common job: **keeping an object or array at the same identity** so that something downstream can compare it.

```jsx
import { memo, useMemo, useState } from 'react'

const Chart = memo(function Chart({ options }) {
  console.log('Chart render')
  return (
    <p>
      {options.pageSize} per page, sorted by {options.sort}
    </p>
  )
})

export default function App() {
  const [pageSize, setPageSize] = useState(10)
  const [sort] = useState('name')
  const [tick, setTick] = useState(0)

  // Same object until pageSize or sort changes.
  const options = useMemo(() => ({ pageSize, sort }), [pageSize, sort])

  return (
    <div>
      <button onClick={() => setTick(tick + 1)}>Tick {tick}</button>
      <button onClick={() => setPageSize(25)}>25 per page</button>
      <Chart options={options} />
    </div>
  )
}
```

**What happens, step by step:**
1. `options` depends on `pageSize` and `sort`. While they stay the same, `useMemo` returns the same object.
2. Clicking `Tick` re-renders `App`, but `Chart` gets the identical object. `memo` sees equal props and skips it. After mount and two ticks, `Chart render` was logged once.
3. Clicking `25 per page` changes a dependency, so `useMemo` builds a new object. `Chart` re-renders, which is correct because the content changed. The count went to 2.

**Rules for `useMemo`:**
- The calculation must be **pure**: no side effects, no changing outside values. React may call it more than once in development (section 10).
- It takes no arguments. It reads the values it needs from the component, and each of them must be in the dependency array. The lint rule `react-hooks/exhaustive-deps` checks this.
- Call it at the top level of a component or custom hook, never inside a loop, a condition, or after an early `return`.

**Common mistake:** `useMemo` around cheap work.

```jsx
// WRONG: the "calculation" is one addition, caching it costs more than doing it
const total = useMemo(() => price + tax, [price, tax])

// RIGHT: just calculate it
const total = price + tax
```

Why: React still compares the dependencies on every render and keeps the result in memory. For one addition that is pure overhead.

## 5. useCallback: remember a function

`useCallback(fn, dependencies)` returns the **same function object** between renders until a dependency changes. It is not a new idea: it is `useMemo` for functions.

```jsx
const a = useCallback(fn, deps)
const b = useMemo(() => fn, deps) // exactly the same result
```

I checked that both give one single function across re-renders. Why do we need a separate hook? Because writing `useMemo(() => () => ..., deps)` is awkward to read.

Here is the classic use: a memoized child that receives a handler.

```jsx
import { memo, useCallback, useState } from 'react'

const AddButton = memo(function AddButton({ onAdd }) {
  console.log('AddButton render')
  return <button onClick={onAdd}>Add item</button>
})

export default function Cart() {
  const [items, setItems] = useState([])
  const [note, setNote] = useState('')

  // The same function on every render, because the dependency array is empty.
  const handleAdd = useCallback(() => {
    setItems((prev) => [...prev, `Item ${prev.length + 1}`])
  }, [])

  return (
    <div>
      <input aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
      <AddButton onAdd={handleAdd} />
      <p>{items.length} items</p>
    </div>
  )
}
```

**What happens, step by step:**
1. Typing in the note box changes `note`, so `Cart` re-renders on every keystroke.
2. Because of `useCallback(..., [])`, `handleAdd` is the same function every time.
3. `AddButton` is wrapped in `memo`, sees the same `onAdd`, and is skipped.
4. After mount and typing `abc`, `AddButton render` was logged **once**. The same file **without** `useCallback` logged it **4 times**.
5. The button still works. Clicking it adds an item.

Why does `handleAdd` use `setItems((prev) => ...)` instead of `setItems([...items, ...])`? If it read `items` directly, `items` would have to be in the dependency array, and the function would change every time an item is added. The **updater form** lets the function not depend on any state, so `[]` is correct. The set functions from `useState` and the `dispatch` from `useReducer` already keep the same identity forever, so you do not need to list them as dependencies.

**Common mistake:** wrong or missing dependencies. The function captures the values from the render in which it was created (a **stale closure**).

```jsx
// WRONG: reads `count`, but the dependency array is empty
const showCount = useCallback(() => {
  setMessage(`count is ${count}`)
}, [])

// RIGHT: every value the function reads is listed
const showCount = useCallback(() => {
  setMessage(`count is ${count}`)
}, [count])
```

I ran both versions: click Increment twice, then Show count. The wrong version shows `count is 0` (it still sees the first render's `count`). The right version shows `count is 2`. Never silence the lint rule with `eslint-disable`. It exists to catch exactly this bug.

## 6. The rule: they only help when something downstream compares

Here is the sentence to remember:

> **`useMemo` and `useCallback` do not stop anything by themselves. They only keep a value at the same identity. They help only if something later compares that value by reference and skips work when it is equal.**

Three things compare by reference:

| You stabilise... | Who compares it | If nobody compares |
|---|---|---|
| An object, array or function passed as a prop | A `memo` child (shallow props comparison) | The child re-renders anyway |
| A value in a dependency array | `useEffect`, `useMemo`, `useCallback` | The Effect or cache re-runs every render |
| The `value` of a context Provider | Every component that reads that context | All readers re-render when the Provider re-renders |

**Proof 1: a stable function and a child that does not compare.** This is the cart from section 5, but `AddButton` is a plain component, not wrapped in `memo`:

```jsx
// NOT wrapped in memo
function AddButton({ onAdd }) {
  console.log('AddButton render')
  return <button onClick={onAdd}>Add item</button>
}
// handleAdd is still a perfect useCallback function
```

After mount and three keystrokes, `AddButton render` was logged **4 times**. The function was stable, but nothing compared it, so `useCallback` bought nothing. It only added cost.

**Proof 2: a dependency array.** Here the object in the dependency array changes identity every render:

```jsx
import { useEffect, useState } from 'react'

export default function Room({ roomId = 'general' }) {
  const [tick, setTick] = useState(0)
  const options = { roomId } // a new object on every render

  useEffect(() => {
    console.log('connect to', options.roomId)
    return () => console.log('disconnect from', options.roomId)
  }, [options])

  return <button onClick={() => setTick(tick + 1)}>Re-render ({tick})</button>
}
```

After mount and two clicks, the log was `connect`, `disconnect`, `connect`, `disconnect`, `connect`. The Effect reconnected on **every render** even though `roomId` never changed. The best fix is to depend on the primitive and build the object inside the Effect:

```jsx
useEffect(() => {
  const options = { roomId } // created inside the Effect, so it is not a dependency
  console.log('connect to', options.roomId)
  return () => console.log('disconnect from', options.roomId)
}, [roomId])
```

Now the log is just `connect to general`, once. (Wrapping `options` in `useMemo` would also work, but moving it inside is simpler and needs no cache.)

**Proof 3: context.** A Provider that builds its `value` inline gives all its consumers a new identity each time it re-renders:

```jsx
import { createContext, useContext, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

function ThemedLabel() {
  const theme = useContext(ThemeContext)
  console.log('ThemedLabel render')
  return <p>Theme: {theme.mode}</p>
}

function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light')
  const [clicks, setClicks] = useState(0) // unrelated state in the same component

  // RIGHT: the same object until `mode` changes
  const value = useMemo(() => ({ mode, setMode }), [mode])

  return (
    <ThemeContext value={value}>
      <button onClick={() => setClicks(clicks + 1)}>Unrelated clicks: {clicks}</button>
      {children}
    </ThemeContext>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ThemedLabel />
    </ThemeProvider>
  )
}
```

After mount and two clicks on the unrelated button, `ThemedLabel render` was logged **once** with the `useMemo` value, and **3 times** when I wrote `value={{ mode, setMode }}` inline. More about context in [useContext](05-usecontext.md).

**What memoization costs.** It is cheap, but never free:
- **Memory:** React keeps the cached value and the dependency array for as long as the component is mounted.
- **Comparisons:** every render compares every dependency, and `memo` compares every prop.
- **First render:** memoization does not make the first render faster. It adds a little bookkeeping.
- **Bugs:** a wrong dependency list gives you stale values (section 5). That is the biggest cost.
- **Noise:** the code gets harder to read.

**One unstable prop breaks the chain.** `memo` skips only when **all** props are equal. If a child has five props and one is an inline object, you get no benefit from stabilising the other four.

**Common mistake:** stabilising a value that nobody compares.

```jsx
// WRONG: ItemList is a plain component, so nothing compares `style`
const style = useMemo(() => ({ color }), [color])
return <ItemList style={style} />

// RIGHT: either remove the useMemo, or wrap ItemList in memo AND keep all its props stable
const style = { color }
return <ItemList style={style} />
```

Why: with no `memo` on `ItemList`, it re-renders whenever the parent does, whatever you do to `style`.

## 7. A real before and after, measured

Let us fix a real slowdown and prove the fix with numbers. The page has 200 product rows and a "Note" input. Each row burns 0.5 ms on purpose (`slowDown`) to stand in for real work such as formatting, calculations or a lot of markup. The state of the note lives in `App`, so every keystroke re-renders all 200 rows.

Two measuring tools are built into the file:
- `rowRenders`, a counter that goes up each time a `Row` renders. It is a demo trick: real components should not change variables while rendering.
- The **`<Profiler>`** component. You wrap part of the tree in `<Profiler id="..." onRender={fn}>`. After each commit that touches that part, React calls `onRender(id, phase, actualDuration, baseDuration, startTime, commitTime)`. `phase` is `'mount'` or `'update'`. `actualDuration` is the time React spent rendering that subtree in this commit. `baseDuration` is an estimate of what rendering the whole subtree would cost with no memoization at all.

The **before** version:

```jsx
import { Profiler, useState } from 'react'

const PRODUCTS = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, name: `Product ${i + 1}` }))

let rowRenders = 0 // demo only: counts how many rows rendered since the last commit

function slowDown(ms) {
  // Pretend each row does real work (formatting, maths, big markup).
  const end = performance.now() + ms
  while (performance.now() < end) {
    // wait
  }
}

function Row({ product, selected, onSelect }) {
  rowRenders++
  slowDown(0.5)
  return (
    <li>
      <button aria-pressed={selected} onClick={() => onSelect(product.id)}>
        {product.name}
      </button>
    </li>
  )
}

function report(id, phase, actualDuration, baseDuration) {
  console.log(
    `${id} ${phase}: rows rendered ${rowRenders}, ` +
      `actual ${actualDuration.toFixed(0)} ms, base ${baseDuration.toFixed(0)} ms`,
  )
  rowRenders = 0
}

export default function App() {
  const [note, setNote] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  return (
    <div>
      <label>
        Note <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <Profiler id="list" onRender={report}>
        <ul>
          {PRODUCTS.map((product) => (
            <Row
              key={product.id}
              product={product}
              selected={product.id === selectedId}
              onSelect={(id) => setSelectedId(id)}
            />
          ))}
        </ul>
      </Profiler>
    </div>
  )
}
```

I typed `abc` into the note box, then clicked two product buttons. The Profiler printed this for the three keystrokes:

```text
list update: rows rendered 200, actual 171 ms, base 168 ms
list update: rows rendered 200, actual 287 ms, base 284 ms
list update: rows rendered 200, actual 184 ms, base 182 ms
```

**What happens, step by step:**
1. A keystroke calls `setNote`, so `App` re-renders.
2. `App` creates 200 new `<Row>` elements, each with a new props object and a brand new `onSelect` arrow function.
3. `Row` is a plain component, so React renders all 200 of them. Each burns 0.5 ms, and `rowRenders` ends at 200.
4. The Profiler reports the commit. `actual` is close to `base` because nothing was skipped.

Every keystroke pays the full price, even though no product changed. This is the lag a user would feel.

**Fix 1: `memo` on the row, `useCallback` on the handler.** All three `Row` props must be stable. `product` comes from a constant array, so it is stable. `selected` is a boolean, so it is compared by value. `onSelect` was a new arrow function every render, so it needs `useCallback`. Only these parts change:

```jsx
import { memo, Profiler, useCallback, useState } from 'react'

const Row = memo(function Row({ product, selected, onSelect }) {
  rowRenders++
  slowDown(0.5)
  return (
    <li>
      <button aria-pressed={selected} onClick={() => onSelect(product.id)}>
        {product.name}
      </button>
    </li>
  )
})

// inside App:
const handleSelect = useCallback((id) => {
  setSelectedId(id)
}, [])

// and in the list:
// <Row key={product.id} product={product} selected={product.id === selectedId} onSelect={handleSelect} />
```

(`setSelectedId` itself is already stable, so `onSelect={setSelectedId}` would work too. I wrapped it because real handlers usually do more than one thing.)

Same test, same three keystrokes:

```text
list update: rows rendered 0, actual 1 ms, base 263 ms
list update: rows rendered 0, actual 1 ms, base 263 ms
list update: rows rendered 0, actual 1 ms, base 263 ms
```

**What happens, step by step:**
1. A keystroke re-renders `App`, which again creates 200 `<Row>` elements.
2. For each row, `memo` compares the old and new props: `product` is the same object, `selected` is the same boolean, `onSelect` is the same function.
3. All three are equal for every row, so React skips all 200. No row function runs.
4. The Profiler still reports a commit, but `actual` is 1 ms while `base` still says 263 ms. That gap is exactly what memoization saves. The numbers to read are `rows rendered` and `actual`, not whether the callback fired.

Selecting rows now re-renders only the rows whose `selected` prop changed. The first click rendered 1 row (nothing was selected before) and the second click rendered 2 rows (the old selection and the new one), about 2 ms each.

**Fix 2: move the state down, no memo at all.** The note state is only used by the input. Give the input its own component and remove the `note` state from `App`. Everything else in the file stays as in the "before" version (plain `Row`, no `memo`); only these parts change:

```jsx
function NoteBox() {
  const [note, setNote] = useState('') // the typing state now lives down here
  return (
    <label>
      Note <input value={note} onChange={(e) => setNote(e.target.value)} />
    </label>
  )
}

export default function App() {
  const [selectedId, setSelectedId] = useState(null)

  return (
    <div>
      <NoteBox />
      <Profiler id="list" onRender={report}>
        {/* the same <ul> of plain <Row> components as before */}
      </Profiler>
    </div>
  )
}
```

Typing `abc` now printed **nothing at all**: `App` does not re-render, so the list is not even touched. But selecting a row still renders all 200 rows (164 and 188 ms in my two clicks), because `Row` is not memoized and the selection state still lives in `App`.

The results (one run in a test environment, so the exact milliseconds will differ on your machine; the pattern will not):

| Version | One keystroke | One row selection |
|---|---|---|
| Before | 200 rows, about 170-290 ms | 200 rows, about 165-240 ms |
| `memo` + `useCallback` | 0 rows, about 1 ms | 1 or 2 rows, about 2 ms |
| State moved down, no memo | list not rendered | 200 rows, about 165-190 ms |

Each fix solves a different interaction. If both interactions matter, use both: keep the typing state low in the tree **and** memoize the rows.

**Using React DevTools instead of code.** You can do the same without editing your components:
1. Install the React DevTools browser extension. Open your app and the **Profiler** tab.
2. Click record, do the slow thing (type in the box), click stop.
3. Each bar at the top is one commit. Tall bars are slow commits. Click one.
4. The flamegraph shows which components rendered and how long each took. Components that did not render in that commit are drawn in grey.
5. In the Profiler settings, turn on the option that records **why each component rendered**. Then re-record. Hovering a component tells you whether its props, state, hooks or parent caused the render. In the Components tab there is also a setting to highlight components when they re-render. (Menu names differ a little between DevTools versions.) Tools such as React Scan do a similar outline-on-render in development.

**Measure fairly.**
- Compare before and after in the same setup. Trust the ratio, not the exact milliseconds.
- A development server is slower than a production build, and StrictMode doubles renders. For real numbers, use `npm run build` then `npm run preview`.
- The `<Profiler>` component does nothing useful in a normal production build (it needs React's profiling build), so treat it as a development tool.

**Common mistake:** optimising without measuring, then trusting a feeling. Add the memo, run the same interaction, and look at the numbers. If `actual` did not drop, remove the memo again.

## 8. Common wrong usage

Most wrong usage falls into a few patterns. Fix in this order.

**1. `useMemo` on cheap work.** Adding two numbers, joining a string, a `.map` on ten items. The cache costs more than the work. Do the calculation directly.

**2. `useCallback` on every handler.** Handlers passed to DOM elements like `<button onClick={...}>` are never compared: React simply uses whichever handler the element has now. A stable function only helps if the receiving **component** is memoized or the function is in a dependency array.

```jsx
// Pointless: <button> does not compare its onClick
const handleClick = useCallback(() => setOpen(true), [])
return <button onClick={handleClick}>Open</button>
```

**3. `memo` with inline props or JSX children.** Section 3: one inline object, inline function or JSX child silently turns `memo` into a no-op. Check all props.

**4. Wrong or missing dependencies.** Section 5: stale closures, and `eslint-disable` to hide the warning. List everything the function reads, or use the updater form of `setState` to avoid depending on state.

**5. Unstable dependencies.** An object or array created during render, used as a dependency, changes every render. Then `useMemo` recalculates every time and Effects re-run every time (section 6). Depend on primitives instead.

**6. Components defined inside components.** This one is worse than useless:

```jsx
export default function App() {
  const [tick, setTick] = useState(0)

  // WRONG: a new component type is created on every render of App
  const Row = memo(function Row({ label }) {
    console.log('Row render')
    return <p>{label}</p>
  })

  return (
    <div>
      <button onClick={() => setTick(tick + 1)}>Tick {tick}</button>
      <Row label="Hello" />
    </div>
  )
}
```

After mount and two ticks, `Row render` was logged **3 times**, and the `<p>` DOM node was replaced each time. React saw a new component type, so it threw the old one away and mounted a new one. Memo never got a chance, and any state inside `Row` would be lost. Define components at the top level of the file.

**7. `memo` on components that almost always get new props.** If the props change on nearly every render, the comparison is wasted work.

**8. Using these hooks for correctness.** "Run this only once" with `useMemo` is not safe (section 10).

**9. Storing calculated data in state.** `useState` plus `useEffect` to copy one value into another is slower and buggier than calculating (section 9).

## 9. Better first fixes: change the structure before you cache

Memoization treats the symptom: React keeps doing work and you skip some of it. The best fix removes the work. Try these first.

### 9.1 Move state down

Put state in the lowest component that needs it. If only one small part of a big component uses a state variable, that small part should own it. Here the colour state is in `App`, so typing re-renders the slow tree:

```jsx
export default function App() {
  const [color, setColor] = useState('tomato')

  return (
    <div>
      <input value={color} onChange={(e) => setColor(e.target.value)} />
      <p style={{ color }}>This text uses the color.</p>
      <SlowTree />
    </div>
  )
}
```

Move the colour and the things that use it into their own component:

```jsx
import { useState } from 'react'

function SlowTree() {
  console.log('SlowTree render')
  return <p>Imagine a big, slow part of the page here.</p>
}

function ColorPicker() {
  const [color, setColor] = useState('tomato') // the state lives next to the code that uses it
  return (
    <>
      <input value={color} onChange={(e) => setColor(e.target.value)} />
      <p style={{ color }}>This text uses the color.</p>
    </>
  )
}

export default function App() {
  return (
    <div>
      <ColorPicker />
      <SlowTree />
    </div>
  )
}
```

**What happens, step by step:**
1. Typing changes `ColorPicker`'s state, so only `ColorPicker` re-renders.
2. `App` does not re-render, so `SlowTree` is not even asked to.
3. I typed three letters. In the "state in `App`" version `SlowTree render` was logged 4 times (mount plus three keystrokes). In this version it was logged **once**.

No `memo`, no `useCallback`, nothing to keep correct.

### 9.2 Lift content up: pass slow parts as `children`

Sometimes the state really must wrap the slow part (for example a colour that styles a wrapper `div` around it). Then let the **parent of the wrapper** create the slow part and pass it in as `children`.

```jsx
import { useState } from 'react'

function SlowTree() {
  console.log('SlowTree render')
  return <p>Imagine a big, slow part of the page here.</p>
}

function ColorArea({ children }) {
  const [color, setColor] = useState('tomato')

  return (
    <div style={{ color }}>
      <input value={color} onChange={(e) => setColor(e.target.value)} />
      {children}
    </div>
  )
}

export default function App() {
  // App never re-renders, so this <SlowTree /> element is created only once.
  return (
    <ColorArea>
      <SlowTree />
    </ColorArea>
  )
}
```

**What happens, step by step:**
1. `App` creates the `<SlowTree />` element once and hands it to `ColorArea` as `children`.
2. Typing changes the state inside `ColorArea`, so `ColorArea` re-renders.
3. It returns the same `children` it was given. That element is the **same object** as last time, because `App` did not run again.
4. React sees an identical element and skips it. After three keystrokes `SlowTree render` was still logged once.

This is the reason section 3.3 says to be careful with `children`: the same prop that breaks `memo` can also be the cheapest way to skip a render, as long as it is created **above** the component that keeps changing.

### 9.3 Do not store what you can calculate

If a value can be worked out from props and state, do not keep a second copy in state and sync it with an Effect.

```jsx
import { useEffect, useState } from 'react'

const FRUITS = ['apple', 'apricot', 'banana', 'cherry', 'grape']

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(FRUITS) // a second copy of data you can calculate
  console.log('Search render, results:', results.length)

  // WRONG: an Effect that only copies calculated data into state
  useEffect(() => {
    setResults(FRUITS.filter((f) => f.includes(query)))
  }, [query])

  return (
    <div>
      <input aria-label="Query" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p>{results.length} results</p>
    </div>
  )
}
```

The fixed version calculates during render:

```jsx
import { useState } from 'react'

const FRUITS = ['apple', 'apricot', 'banana', 'cherry', 'grape']

export default function Search() {
  const [query, setQuery] = useState('')
  const results = FRUITS.filter((f) => f.includes(query)) // calculated during render
  console.log('Search render, results:', results.length)

  return (
    <div>
      <input aria-label="Query" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p>{results.length} results</p>
    </div>
  )
}
```

What I saw when typing the letter `a`:

```text
Effect version:      Search render, results: 5    <- first render with the OLD results
                     Search render, results: 4    <- second render after the Effect ran
Calculated version:  Search render, results: 4
```

The Effect version renders twice per change, and for one render it shows stale data. (On mount it also renders twice, because `filter` returns a new array that `setResults` stores.) The calculated version renders once and is always in sync. If the calculation really is expensive, wrap **that line** in `useMemo`. More on derived state in [useState in depth](02-usestate-in-depth.md) and [useEffect](03-useeffect.md).

### 9.4 Other levers

Long lists: render only the visible rows (virtualisation) or paginate. Slow updates triggered by typing: [`useTransition` and `useDeferredValue`](09-other-hooks.md). The full toolbox, including code splitting, is in [Performance optimization](../04-advanced/02-performance-optimization.md).

**A good order of attack:** measure, then move state down, then pass content as `children`, then calculate instead of storing, then reduce what is rendered, and only then memoize.

## 10. Hints, not promises (and what Strict Mode does)

React treats `useMemo`, `useCallback` and `memo` as **performance hints**. The React docs say React may throw away a cached value. In everyday use React keeps them, but your code must still be correct if the calculation ran again. A simple test for any component:

> If you deleted every `useMemo`, `useCallback` and `memo`, the app must behave exactly the same, only slower.

**Strict Mode** is a development-only wrapper that helps catch impure code. For `useMemo` it calls your calculation twice. In React 19 the second render reuses the result of the first, so both renders see the same object, but the function itself still runs twice. This is the `TodoList` from section 4 wrapped in `<StrictMode>`:

```text
                     calls of the calculation
mount                2     (1 without StrictMode)
toggle theme         +0
click "Show done"    +2    (+1 without StrictMode)
```

If your calculation is pure, running it twice is harmless. If it is not (it mutates something, or logs and counts), you have just found a bug. Production builds do not do this.

**Common mistake:** using `useMemo` as a guarantee.

```jsx
// WRONG: if React ever drops the cache, this id changes and breaks your form
const formId = useMemo(() => crypto.randomUUID(), [])

// RIGHT: state is never thrown away while the component is mounted
const [formId] = useState(() => crypto.randomUUID())
```

Why: `useMemo` is for avoiding repeated work, not for storing identity or values you cannot recompute.

There is one legitimate "semantic" use: keeping a value stable because an Effect depends on it. Even there, first try to remove the dependency, as in section 6.

## 11. React Compiler 1.0: memoization done for you

Writing `useMemo`, `useCallback` and `memo` by hand is repetitive and easy to get wrong. The **React Compiler** does it automatically at build time.

**What it is.** A build tool (implemented as a Babel plugin, `babel-plugin-react-compiler`). Version 1.0.0 was published on 7 October 2025 and the React team calls it stable. It reads your components and hooks, works out what each value depends on, and adds cache checks. It is **opt-in** (the docs still describe it as an optional addition), and it works with React 17, 18 and 19.

**What it does for you.**
- It caches values, functions **and JSX elements** inside components and hooks, so unchanged children get the same element and React skips them. This is the same thing you did by hand in this lesson.
- It is finer-grained than the hooks: it can memoize code after an early `return`, which `useMemo` cannot.
- It targets **updates**: skipping cascading re-renders, and skipping expensive calculations done inside a component or hook.

Here is the proof. This file has no `memo`, `useMemo` or `useCallback` anywhere:

```jsx
import { useState } from 'react'

function Greeting({ name }) {
  console.log('Greeting render')
  return <p>Hello, {name}!</p>
}

function Chart({ options }) {
  console.log('Chart render')
  return <p>Color: {options.color}</p>
}

// No memo, useMemo or useCallback anywhere in this file.
export default function App() {
  const [count, setCount] = useState(0)
  const [color] = useState('teal')

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
      <Greeting name="Ada" />
      <Chart options={{ color }} />
    </div>
  )
}
```

I ran the file twice with three clicks, once as written and once after compiling it with `babel-plugin-react-compiler` 1.0.0:

```text
                                  Greeting renders    Chart renders
as written                        4                   4
compiled (same source code)       1                   1
```

Here is a shortened piece of what the compiler wrote for `Greeting` (the exact names and numbers are internal details and can change between versions):

```jsx
import { c as _c } from "react/compiler-runtime";
function Greeting(t0) {
  const $ = _c(2);
  const {
    name
  } = t0;
  console.log("Greeting render");
  let t1;
  if ($[0] !== name) {
    t1 = <p>Hello, {name}!</p>;
    $[0] = name;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}
```

Read it as plain code. `$` is a small cache array that React keeps for the component. The compiler checks `$[0] !== name` (did the input change?), and only then builds the JSX; otherwise it returns the stored element. In `App` it did the same for `<Greeting name="Ada" />` (no inputs, so it is built once) and for `<Chart options={{ color }} />` (rebuilt only when `color` changes). That is what you would write by hand with `useMemo`.

**How to turn it on (high level).**
- **Easiest:** start a new Vite project from a compiler template: `npm create vite@latest my-app -- --template react-compiler` (a `react-compiler-ts` variant exists too).
- **Existing Vite 8 project** with `@vitejs/plugin-react` 6 (the version that dropped the inline Babel option): install `babel-plugin-react-compiler`, `@rolldown/plugin-babel` and `@babel/core`, then:

  ```js
  // vite.config.js
  import { defineConfig } from 'vite'
  import react, { reactCompilerPreset } from '@vitejs/plugin-react'
  import babel from '@rolldown/plugin-babel'

  export default defineConfig({
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  })
  ```

- **Next.js 16:** install `babel-plugin-react-compiler` and set `reactCompiler: true` in the Next config.
- **Plain Babel:** add `'babel-plugin-react-compiler'` as the first plugin.
- **React 17 or 18:** also install `react-compiler-runtime` and set the `target` option. React 19 needs nothing extra.

See Tooling: Vite, ESLint and builds (planned) for the general Vite setup. The Babel route adds build time, and Vite's native route is still experimental.

**How to adopt it safely.**
- Use `compilationMode: 'annotation'` to compile only functions that start with the directive `'use memo'`. Use `'use no memo'` to exclude one function. This lets you roll it out component by component.
- If your test coverage is thin, pin the exact compiler version (`npm install --save-exact`) and upgrade on purpose, because new versions can change how finely it memoizes.
- Update `eslint-plugin-react-hooks` to version 7 or later. It includes lint rules built from the compiler's analysis (for example `purity`, `refs`, `immutability` and `preserve-manual-memoization`). They run even when the compiler is not installed, and they show you which components the compiler would skip.
- To check that it is on: the build output imports `c` from `react/compiler-runtime`, and the installation page says DevTools marks compiled components with a "Memo" badge.

**What happens to your manual memoization.** Leave it. The docs advise keeping existing `useMemo`, `useCallback` and `memo`, and removing them only after testing, because removal can change what the compiler produces. For **new** code, write plain components and let the compiler do the work. Keep manual hooks as an **escape hatch** when you need exact control, such as a value that must stay stable because an Effect depends on it.

**What it does not do.**
- It compiles only components and hooks. A plain utility function or a class component is left alone.
- It assumes your code follows the Rules of React (pure render, no changing props or state, no reading refs during render). When it finds a violation it **skips that component** without failing the build, so that component is simply not memoized. I checked this: a component that writes `ref.current` during render was skipped while its neighbour was compiled.
- It does not fix slow algorithms, it does not make the first render faster, and it does not share caches between components.
- It does not make impure code correct. Code that relied on a particular identity, such as an Effect with an unstable dependency, can behave differently once compiled.
- Some tools do not cooperate. For example, the `why-did-you-render` library is not compatible with the compiler.

**Common mistake:** deleting manual memoization in bulk, or leaning on memoization (manual or automatic) to keep an Effect dependency stable.

```jsx
// RISKY: this Effect is only correct while `options` keeps the same identity
const options = useMemo(() => ({ roomId }), [roomId])
useEffect(() => {
  connect(options)
}, [options])

// SAFER: depend on the primitive, so no memoization is needed at all
useEffect(() => {
  connect({ roomId })
}, [roomId])
```

Why: removing hooks changes the compiler's output, and some of them (like the one above) protect behaviour, not only speed. Leave existing memoization alone, enable the compiler for a few components, run your tests and the Profiler, and remove hooks one at a time. (`connect` stands for any function of yours that opens a connection.)

**How to talk about it in a 2026 interview.** A strong answer shows you understand both worlds:
- Say what problem memoization solves (skipping work when inputs are the same) and why identity matters. The compiler is built on the same idea, so the fundamentals still count.
- Say that the compiler is stable, opt-in and build-time, and that it needs code that follows the Rules of React.
- Say that on a project **with** the compiler you write plain code and use manual hooks only as an escape hatch, and on a project **without** it you measure first, fix the structure, and memoize last.
- Avoid: "the compiler is experimental" (it is 1.0), "the compiler makes React fast so I never need to think about it", and "I wrap everything in `useMemo` to be safe".

## How interviewers test this

- **Do you know what actually causes a re-render?** A strong answer names the three triggers, states that children re-render by default, and separates "render" from "DOM update".
- **Can you explain memoization with referential equality?** Not "it makes React faster". The answer should be about identity, shallow comparison and who compares.
- **Can you explain why a memoized child still re-renders, and fix it?** Expect an inline object or function, a JSX `children` prop, or a component defined inside another component.
- **Do you measure and fix structure first?** Strong candidates mention the Profiler or DevTools, moving state down and passing `children`, and only then memoization. A red flag is "I wrap everything in `useMemo` and `useCallback`".
- **Do you know where React is going?** In 2026 expect a question on the React Compiler. A strong answer covers what it automates, that manual hooks stay as an escape hatch, and its limits. A red flag is treating it as magic, or as experimental.
- **Live tasks:** predict the render counts of a small tree, fix a list that re-renders on every keystroke, or find a stale closure in a `useCallback`.

## Interview questions and model answers

### Q1. What is the difference between React.memo, useMemo and useCallback? (Easy)
All three remember something between renders, but they remember different things. `React.memo(Component)` remembers a component's last output and skips re-rendering it when its props are shallowly equal to the last props. `useMemo(fn, deps)` remembers the **result** of `fn` (a number, an array, an object, even JSX) and recalculates only when a dependency changes. `useCallback(fn, deps)` remembers the **function itself**, and is shorthand for `useMemo(() => fn, deps)`.

`memo` is the one that skips work. `useMemo` and `useCallback` keep the values you pass to a memoized child (or put in a dependency array) at the same identity, so the comparison can succeed. `useMemo` can also stand alone to skip an expensive calculation. `useCallback` alone changes nothing you can see.

```jsx
const Child = memo(function Child({ onSave, options }) { /* ... */ })

// in the parent:
const options = useMemo(() => ({ size }), [size])
const onSave = useCallback(() => save(size), [size])
return <Child options={options} onSave={onSave} />
```

### Q2. What makes a component re-render? Does a parent re-render re-render all its children? (Easy)
A component re-renders when (1) its own state changes, (2) its parent re-renders, or (3) a context it reads changes. Changed props are not a separate cause: they are the result of the parent rendering.

Yes, by default a parent re-render re-renders everything it returns, down the whole subtree, whatever the props are. React does not compare props unless the child is wrapped in `memo`. There is one exception: if the child is the **same element object** as last time, such as `children` passed down from a component that did not re-render, React skips it. And remember that a render only calls your function. The DOM is changed only where the output differs.

### Q3. What is referential equality and why does it matter in React? (Easy)
It means "are these two values the very same object in memory?". Primitives compare by value, so `'a' === 'a'`. Objects, arrays and functions compare by identity, so `{} === {}` is `false`, and `() => {} === () => {}` is also `false`.

It matters because React compares with `Object.is` in several places: `memo` compares props, dependency arrays compare their entries, context compares its `value`, and `setState` compares the new state to the old. Every render creates new objects and functions, so a value that is "the same" in content is "different" in identity. That is why an inline `{ color: 'teal' }` breaks `memo` and a `useEffect` dependency. It is also why `items.push(x); setItems(items)` does not re-render: same array, same identity.

### Q4. When should you use useMemo and useCallback, and when should you not? (Medium)
Use them when something downstream compares by reference and you have a reason to care: a `memo` child that re-renders often with equal data and is slow to render, a value in a dependency array that must stay stable, a context `value` object, or a calculation that you measured as expensive (roughly a millisecond or more).

Do not use them on cheap work, on handlers passed to plain DOM elements, on components that receive new props every time anyway, or "just in case" everywhere. Each one costs memory, a comparison on every render, readability, and the risk of stale values from a wrong dependency list. The order I follow is: measure, fix the structure (move state down, pass `children`, calculate instead of storing), and memoize last. If the project uses the React Compiler, write plain code and let it do this.

### Q5. Does useCallback prevent a child from re-rendering by itself? (Medium)
No. `useCallback` only gives you the same function object across renders. The child still re-renders whenever the parent does, unless the child is wrapped in `memo` (or the function is compared in a dependency array). I tested a cart with a stable `useCallback` handler and a plain child: the child rendered 4 times for 3 keystrokes. With `memo` on the child it rendered once.

Both halves are needed, and **every** prop of the memoized child must be stable. One inline object or function among the props is enough to defeat it.

### Q6. My child is wrapped in React.memo but still re-renders. Why? (Medium)
Go through this checklist:
1. A prop is a new object, array or function on every render (an inline `{}` or `() => {}`, or the result of `.filter` or `.map` in the parent). Stabilise it with a constant, `useMemo` or `useCallback`.
2. The `children` prop is JSX created in the parent. It is a new element every render.
3. The child reads a context whose value changed, or has its own state that changed. `memo` does not stop these.
4. Your `useMemo` or `useCallback` has an unstable dependency, so it recomputes every render anyway.
5. The memoized component is defined inside another component, so it is a new component type on every render.
6. Its `key` changes, so React mounts a new instance instead of updating the old one.
7. A custom comparison function returns `false` too often.

To find which prop changed, use the Profiler's "why did this render" option in DevTools.

### Q7. How does React.memo compare props? Can you give it your own comparison? (Medium)
By default it compares props **shallowly**: for each prop it asks `Object.is(oldValue, newValue)`. If every prop passes, the render is skipped. It never looks inside objects.

The optional second argument is `arePropsEqual(prevProps, nextProps)`, which returns `true` to skip the render. Because it replaces the default check, anything you do not compare is ignored. In my test, a comparison that looked only at `user.id` kept showing `Ada` after the name changed to `Grace`. Compare every prop that affects the output, including functions, and avoid deep equality on large objects because it can cost more than the render. In practice, fixing the props so the default check works is better.

### Q8. How do dependency arrays work, and what happens with a missing or unstable dependency? (Medium)
React compares each dependency with `Object.is` against the value from the previous render. If none changed, `useMemo` and `useCallback` return the stored value, and `useEffect` does not re-run. With no array at all, `useMemo` and `useCallback` give you no caching (they recompute every render) and an Effect runs after every render. With `[]`, the value is computed once and kept.

A **missing** dependency is a stale closure: the function keeps the values from the render where it was created. I ran a `useCallback(..., [])` that read `count`; after two increments it still reported `count is 0`. An **unstable** dependency, such as an object created during render, never compares equal, so the cache is rebuilt (or the Effect re-runs) on every render. Fix the first by listing the value (or using the updater form of `setState`), and the second by depending on primitives or moving the object inside the Effect.

### Q9. What does the React Compiler do, and do you still need useMemo and useCallback? (Medium)
The React Compiler (1.0, released October 2025) is an opt-in build step, a Babel plugin, that automatically adds memoization to components and hooks. It works out what each value depends on and caches values, functions and JSX elements, which is what you would write by hand with `useMemo`, `useCallback` and `memo`, but at a finer grain (it can even memoize after an early return).

It only works with code that follows the Rules of React. Components that break them are skipped, not memoized. It does not fix slow algorithms or speed up the first render. With the compiler on, I write plain code and keep manual hooks as an escape hatch, for example for a value that must stay stable as an Effect dependency. I leave existing manual memoization alone unless tests show it is safe to remove. Without the compiler, the measure-first guidance in this lesson applies. I would also say that understanding referential equality still matters, because the compiler is built on it.

### Q10. How do you find out why a component re-renders and measure whether a fix helped? (Medium)
In the browser I use the React DevTools Profiler: record the slow interaction, look at the commits and the flamegraph (grey components did not render), and turn on the option that records why each component rendered. DevTools can also highlight components when they re-render. In code I can wrap a subtree in `<Profiler onRender>` to log `actualDuration` and `baseDuration`, or add a temporary `console.log` or counter.

Then I compare before and after on the same interaction. `actualDuration` should drop well below `baseDuration` when memoization works. I remember that development builds are slower, that StrictMode doubles component calls, and that the Profiler is a development tool. For absolute numbers I use a production build.

### Q11. What would you try before reaching for memo? (Medium)
I try fixes that remove work without any cache to keep correct:
1. **Move state down** into the smallest component that uses it, so the slow siblings do not re-render.
2. **Lift content up**: create the slow part in a parent that does not change and pass it in as `children`, so the element keeps its identity.
3. **Calculate instead of storing**: no state plus Effect for derived data.
4. **Render less**: virtualise or paginate long lists.
5. **Defer heavy updates** with `useTransition` or `useDeferredValue`.

Only if the measurements still show a problem do I add `memo`, `useMemo` and `useCallback`. In my 200-row example, moving the typing state down removed the list render completely while memoizing the rows made it cost about 1 ms. Each fix solved a different interaction.

### Q12. Is useMemo a guarantee? What does Strict Mode do to it? (Hard)
No, it is a performance hint. The React docs say React may discard cached values, so your code must be correct even if the calculation runs again. A good test: delete every memoization call, and the app must behave the same, only slower. Do not use `useMemo` for values whose identity must never change (use `useState` or a ref for that), and never for side effects.

In development, Strict Mode calls the calculation twice to expose impure code. In React 19 the second render reuses the first render's result, so both renders see the same object. In my run of a filtering component: 2 calls on mount (1 without Strict Mode), 0 when an unrelated state changed, and 2 when the dependency changed. Production builds do not double-call.

### Q13. Why does memoizing a context value matter? (Hard)
React decides whether to re-render a context's consumers by comparing the Provider's `value` with `Object.is`. If the Provider component re-renders and builds `value={{ user, setUser }}` inline, it is a new object every time, so every consumer re-renders even when nothing inside changed. In my test, a consumer rendered 3 times after two unrelated clicks with an inline value and once with `useMemo(() => ({ mode, setMode }), [mode])`.

Limits to mention: it only helps when the Provider re-renders for unrelated reasons; when the value really changes, every consumer re-renders, because there are no selectors; and it does not stop plain child components that are not consumers (their renders depend on how `children` flows). Better designs are to keep Provider state local, pass `children` through, and split one big context into several small ones. See [useContext](05-usecontext.md).

### Q14. How do you pass a handler that needs an item's id to a memoized list item without breaking memo? (Hard)
Do not create a closure per item in the parent (`onToggle={() => toggle(task.id)}`): that is a new function for every item on every render. Instead pass **one stable handler** and let the item call it with its own id:

```jsx
const toggleTodo = useCallback((id) => {
  setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
}, [])

<TodoItem key={task.id} task={task} onToggle={toggleTodo} />
// inside TodoItem: <input onChange={() => onToggle(task.id)} />
```

The updater form keeps the dependency array empty. Because the update is immutable, only the toggled task becomes a new object, so only its row re-renders. In my test with three todos: typing in a separate input re-rendered 0 items (the version without `useCallback` re-rendered all 3 per keystroke), and toggling one item re-rendered only that item.

### Q15. How does React.memo compare to PureComponent and shouldComponentUpdate? (Medium)
`PureComponent` (a class) implements `shouldComponentUpdate` with a shallow comparison of both props and state. `React.memo` is the function-component version and compares **props only**. State needs no comparison in a function component, because calling a `useState` setter with a value equal to the current one (by `Object.is`) does not cause a re-render anyway. `memo` also accepts a custom comparison, which plays the role of a hand-written `shouldComponentUpdate`, but with the opposite meaning of the return value (`true` means "equal, skip"). Both use shallow comparison, so both break with inline objects and functions. `PureComponent` is legacy: see legacy class components (planned).

## Common mistakes and gotchas

- **Measuring in a development build with StrictMode on:** renders and logs look doubled. Compare ratios, or use a production build.
- **Memoizing the callback but not the component that receives it:** `useCallback` does nothing for a plain child. Wrap the child in `memo` too.
- **Memoizing the child but leaving one inline prop:** one new object or function defeats `memo`. Check every prop.
- **Calling `useMemo` or `useCallback` after an early `return`, in a loop, or in a condition:** hooks must run in the same order every render. Put them above the `return`, or move the repeated part into its own child component.
- **Using `useMemo` inside `.map`:** hooks are not allowed in loops. Make an item component that owns its own `useMemo`.
- **Hiding a dependency warning with `eslint-disable`:** you are hiding a stale-closure bug. List the dependency, use the updater form of `setState`, or restructure.
- **Mutating a memoized value:** `useMemo(() => list.sort(), [list])` sorts the original array in place. Copy first (`[...list].sort()`, or `list.toSorted()`).
- **Expecting `memo` to stop context updates:** a memoized component that reads a context still re-renders when the value changes. Memoize or split the context.
- **Deep equality in a custom comparison:** it can cost more than the render. Fix the props instead.
- **Counting `Profiler` callbacks as proof of work:** the callback can fire even when your rows did not render. Read `actualDuration` and your own render counters.
- **Copying "memoize everything" from an old tutorial:** it was a workaround for a problem the compiler now solves. Measure first.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard. For coding tasks, paste the code into a Vite React app (or a scratch test) and count renders with `console.log`. Remove `<StrictMode>` first, or your counts will be doubled.

1. **(Easy)** Predict. After the page loads and you click the button 3 times, how many times is `Plain render` and `Memoed render` logged? Why?

   ```jsx
   import { memo, useState } from 'react'

   function Plain({ label }) {
     console.log('Plain render')
     return <p>{label}</p>
   }

   const Memoed = memo(function Memoed({ label }) {
     console.log('Memoed render')
     return <p>{label}</p>
   })

   export default function App() {
     const [n, setN] = useState(0)

     return (
       <div>
         <button onClick={() => setN(n + 1)}>Add ({n})</button>
         <Plain label="a" />
         <Memoed label="b" />
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

`Plain render` is logged **4 times** (mount plus 3 clicks). `Memoed render` is logged **once**.

Each click re-renders `App`. `Plain` is rendered along with its parent, because React does not compare props for a plain component. `Memoed` is wrapped in `memo`: its only prop is the string `"b"`, which compares equal by value, so React skips it. We ran this and got 4 and 1.

</details>

2. **(Easy)** Predict the output of this snippet, line by line, and explain each answer in one phrase.

   ```js
   const a = { id: 1 }
   const b = { id: 1 }
   const c = a
   console.log(a === b, a === c, Object.is(a, c), [] === [], 'x' === 'x')
   ```

<details>
<summary>Show answer</summary>

It prints `false true true false true`.

- `a === b` is `false`: same content, but two different objects.
- `a === c` is `true`: `c` points at the very same object as `a`.
- `Object.is(a, c)` is `true` for the same reason (React uses `Object.is`).
- `[] === []` is `false`: two separate empty arrays.
- `'x' === 'x'` is `true`: strings compare by value.

This is the whole reason an inline `{}` or `() => {}` looks "changed" to `memo` on every render. We ran this in Node and got exactly this line.

</details>

3. **(Easy)** Code. `Badge` is wrapped in `memo`, yet it re-renders on every click. Change `App` (not `Badge`) so that `Badge render` is logged only once, however many times the button is clicked.

   ```jsx
   import { memo, useState } from 'react'

   const Badge = memo(function Badge({ user, onOpen }) {
     console.log('Badge render')
     return <button onClick={onOpen}>{user.name}</button>
   })

   export default function App() {
     const [n, setN] = useState(0)

     return (
       <div>
         <button onClick={() => setN(n + 1)}>Clicked {n} times</button>
         <Badge user={{ name: 'Ada' }} onOpen={() => console.log('open')} />
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

Both `user` and `onOpen` are created again on every render, so the shallow comparison always sees a change. Neither depends on props or state, so move them out of the component:

```jsx
import { memo, useState } from 'react'

const ADA = { name: 'Ada' } // created once, when the file loads

function openProfile() {
  console.log('open')
}

const Badge = memo(function Badge({ user, onOpen }) {
  console.log('Badge render')
  return <button onClick={onOpen}>{user.name}</button>
})

export default function App() {
  const [n, setN] = useState(0)

  return (
    <div>
      <button onClick={() => setN(n + 1)}>Clicked {n} times</button>
      <Badge user={ADA} onOpen={openProfile} />
    </div>
  )
}
```

We ran both versions: the original logged `Badge render` 4 times after 3 clicks, this one logged it once. If the values did depend on state, you would use `useMemo(() => ({ name }), [name])` and `useCallback(..., [deps])` inside `App` instead.

</details>

4. **(Medium)** Predict. After the page loads and you click twice, how many times are `Panel render` and `Info render` logged? Then give two different ways to make both be logged only once.

   ```jsx
   import { memo, useState } from 'react'

   function Info() {
     console.log('Info render')
     return <span>Some info</span>
   }

   const Panel = memo(function Panel({ children }) {
     console.log('Panel render')
     return <div>{children}</div>
   })

   export default function App() {
     const [n, setN] = useState(0)

     return (
       <div>
         <button onClick={() => setN(n + 1)}>Clicked {n} times</button>
         <Panel>
           <Info />
         </Panel>
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

Both are logged **3 times** (mount plus 2 clicks).

`<Info />` is written inside `App`, so every render of `App` creates a new element and passes it to `Panel` as `children`. A new `children` prop fails the shallow comparison, so `memo` does nothing. `Panel` re-renders, and so does `Info` inside it.

Fix A, **move the state down**, so `App` never re-renders:

```jsx
function ClickCounter() {
  const [n, setN] = useState(0)
  return <button onClick={() => setN(n + 1)}>Clicked {n} times</button>
}

export default function App() {
  return (
    <div>
      <ClickCounter />
      <Panel>
        <Info />
      </Panel>
    </div>
  )
}
```

Fix B, **create the element once**:

```jsx
const info = <Info /> // outside the component

// inside App:
<Panel>{info}</Panel>
```

We ran both fixes: each logged `Panel render` once and `Info render` once.

</details>

5. **(Medium)** Code. In this to-do list `TodoItem` is memoized, but typing in the draft box re-renders every item, and toggling one item re-renders all three. Change `App` so that typing re-renders **no** item and toggling an item re-renders **only that item**.

   ```jsx
   import { memo, useState } from 'react'

   const TodoItem = memo(function TodoItem({ task, onToggle }) {
     console.log(`TodoItem ${task.id} render`)
     return (
       <li>
         <label>
           <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} />
           {task.text}
         </label>
       </li>
     )
   })

   export default function App() {
     const [todos, setTodos] = useState([
       { id: 1, text: 'Write', done: false },
       { id: 2, text: 'Test', done: false },
       { id: 3, text: 'Ship', done: false },
     ])
     const [draft, setDraft] = useState('')

     function toggleTodo(id) {
       setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
     }

     return (
       <div>
         <input aria-label="Draft" value={draft} onChange={(e) => setDraft(e.target.value)} />
         <ul>
           {todos.map((task) => (
             <TodoItem key={task.id} task={task} onToggle={toggleTodo} />
           ))}
         </ul>
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

`toggleTodo` is a new function every render, so `memo` always fails. Make it stable with `useCallback`, and use the **updater form** of `setTodos` so the function does not read `todos` and the dependency list can be empty:

```jsx
import { memo, useCallback, useState } from 'react'

const TodoItem = memo(function TodoItem({ task, onToggle }) {
  console.log(`TodoItem ${task.id} render`)
  return (
    <li>
      <label>
        <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} />
        {task.text}
      </label>
    </li>
  )
})

export default function App() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Write', done: false },
    { id: 2, text: 'Test', done: false },
    { id: 3, text: 'Ship', done: false },
  ])
  const [draft, setDraft] = useState('')

  // The updater form means the function does not read `todos`, so [] is a correct dependency list.
  const toggleTodo = useCallback((id) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }, [])

  return (
    <div>
      <input aria-label="Draft" value={draft} onChange={(e) => setDraft(e.target.value)} />
      <ul>
        {todos.map((task) => (
          <TodoItem key={task.id} task={task} onToggle={toggleTodo} />
        ))}
      </ul>
    </div>
  )
}
```

We ran both versions. Original: typing `ab` logged 6 item renders (3 per keystroke), and toggling `Test` logged 3. Solution: typing logged nothing, and toggling `Test` logged only `TodoItem 2 render`. The other two items keep the same `task` object (the `map` only creates a new object for the toggled one), so their props are equal.

</details>

6. **(Medium)** Explain. A teammate wrote the code below and says "I used `useCallback` so the button will not re-render". Is this useful? What would you tell them?

   ```jsx
   function App() {
     const handleClick = useCallback(() => console.log('hi'), [])
     return <button onClick={handleClick}>Hi</button>
   }
   ```

<details>
<summary>Show answer</summary>

It is not useful. `useCallback` only keeps the function at the same identity. For that to prevent any work, something must compare the function and skip when it is equal. A DOM element like `<button>` does not do that: React simply attaches the current handler. And `App` has no memoized child. Without a `memo` child, a dependency array that includes `handleClick`, or similar, the hook adds a dependency comparison and a stored function on every render for no gain.

Tell them: remove `useCallback` here. Add it only when `handleClick` is passed to a `memo` component (and all that component's other props are stable), or is used in a dependency array. And measure: if the button is cheap to render, nothing needs fixing.

</details>

7. **(Medium)** Code. Clicking `Menu` toggles a small list, but it also re-renders `ReportTable` (imagine 5,000 rows). Fix it **without** using `memo`, `useMemo` or `useCallback`.

   ```jsx
   import { useState } from 'react'

   function ReportTable() {
     console.log('ReportTable render')
     return (
       <table>
         <tbody>
           <tr>
             <td>Imagine 5,000 rows here</td>
           </tr>
         </tbody>
       </table>
     )
   }

   export default function App() {
     const [menuOpen, setMenuOpen] = useState(false)

     return (
       <div>
         <button onClick={() => setMenuOpen(!menuOpen)}>Menu</button>
         {menuOpen && (
           <ul>
             <li>Profile</li>
             <li>Sign out</li>
           </ul>
         )}
         <ReportTable />
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

Move the state down. Only the menu uses `menuOpen`, so the menu should own it:

```jsx
function Menu() {
  const [menuOpen, setMenuOpen] = useState(false) // the state now lives where it is used

  return (
    <>
      <button onClick={() => setMenuOpen(!menuOpen)}>Menu</button>
      {menuOpen && (
        <ul>
          <li>Profile</li>
          <li>Sign out</li>
        </ul>
      )}
    </>
  )
}

export default function App() {
  return (
    <div>
      <Menu />
      <ReportTable />
    </div>
  )
}
```

Opening and closing now re-renders only `Menu`. `App` never re-renders, so it never asks `ReportTable` to. We ran both: with two clicks on `Menu`, the original logged `ReportTable render` 3 times, the fixed version once (the mount).

</details>

8. **(Medium)** Predict. What do the button and the paragraph show after two clicks on the button? What is the bug, and what are two ways to fix it?

   ```jsx
   import { useMemo, useState } from 'react'

   export default function Price({ base = 10 }) {
     const [qty, setQty] = useState(1)
     const total = useMemo(() => base * qty, [base])

     return (
       <div>
         <button onClick={() => setQty(qty + 1)}>Quantity: {qty}</button>
         <p>Total: {total}</p>
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

The button shows `Quantity: 3` and the paragraph still shows `Total: 10`. We ran it and got exactly that.

The calculation reads `qty`, but the dependency array lists only `base`. `qty` changes, `base` does not, so React keeps returning the stored result from the first render. This is a stale value caused by a missing dependency.

Fix 1: list every value you read: `useMemo(() => base * qty, [base, qty])`.
Fix 2 (better here): drop `useMemo`. `base * qty` is one multiplication, far cheaper than the cache. Write `const total = base * qty`.

</details>

9. **(Hard)** Predict. This is the `TodoList` from section 4 (it logs `filtering...` inside the function given to `useMemo`), now rendered inside `<StrictMode>` in development. How many times in total has `filtering...` been logged (a) after mount, (b) after one click on `Toggle theme`, (c) after one more click on `Show done`? What would the numbers be without StrictMode?

<details>
<summary>Show answer</summary>

With StrictMode: (a) **2**, (b) **2**, (c) **4**. Without StrictMode: 1, 1, 2.

In development, StrictMode calls the `useMemo` calculation twice each time it actually needs to run, to expose impure code. On mount it runs (twice). Toggling the theme does not change the dependency `[filter]`, so the cached result is reused and nothing is logged. Clicking `Show done` changes `filter`, so the calculation runs again, twice. In React 19 the second render reuses the first render's result, so both renders see the same array even though the function was called twice. Production builds do not double-call. We measured these exact numbers.

The lesson: your calculation must be pure, so that calling it twice is harmless.

</details>

10. **(Hard)** Explain. Your team turns on the React Compiler 1.0 in a large app that is full of `useMemo`, `useCallback` and `memo`. A colleague proposes deleting all of them in the same pull request. What do you say, and what do you check?

<details>
<summary>Show answer</summary>

I would not delete them in one go. The React docs say to leave existing memoization in place, because removing it can change what the compiler produces, and some of it may be doing a job beyond speed (for example an object kept stable because an Effect depends on it, where an unstable value would make the Effect fire more often).

What I would do:
1. Enable the compiler with `compilationMode: 'annotation'` or per directory, and pin the exact version if test coverage is thin.
2. Upgrade `eslint-plugin-react-hooks` to 7.x and read its compiler-based lint results. Components that break the Rules of React (for example a ref written during render, or a global changed during render) are skipped by the compiler, so they stay un-memoized and need fixes first. The `preserve-manual-memoization` rule tells me whether the compiler can keep existing manual memoization.
3. Check which components are compiled (the build output imports from `react/compiler-runtime`, and DevTools marks them with a Memo badge).
4. Remove hooks gradually in components that are compiled, run the tests, and compare with the Profiler. Keep the ones that protect behaviour, such as stable Effect dependencies.
5. For **new** code, write plain components and add manual hooks only as an escape hatch.

I would also remind the team of what the compiler does not do: it does not fix slow algorithms, long lists or poor structure, and it does not make impure code correct.

</details>

11. **(Hard)** Code. You cannot change `App` or the data, but `Summary` must stop re-rendering on every tick. The `items` array is rebuilt with `.filter` on each render (new array, same objects inside). Add a custom comparison function so that `Summary render` is logged once however many times `Tick` is clicked, and clicking a name still works. Then say what you would do instead if you could change `App`, and name one bug your comparison can cause.

   ```jsx
   import { memo, useState } from 'react'

   const Summary = memo(function Summary({ items, onSelect }) {
     console.log('Summary render')
     return (
       <ul>
         {items.map((item) => (
           <li key={item.id}>
             <button onClick={() => onSelect(item.id)}>{item.name}</button>
           </li>
         ))}
       </ul>
     )
   })

   const PEOPLE = [
     { id: 1, name: 'Ada', active: true },
     { id: 2, name: 'Bob', active: false },
     { id: 3, name: 'Cy', active: true },
   ]

   function handleSelect(id) {
     console.log('selected', id)
   }

   export default function App() {
     const [tick, setTick] = useState(0)
     const items = PEOPLE.filter((p) => p.active) // a new array on every render

     return (
       <div>
         <button onClick={() => setTick(tick + 1)}>Tick {tick}</button>
         <Summary items={items} onSelect={handleSelect} />
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

Compare the array by its **contents** (same length, same objects in the same order) and also compare `onSelect`:

```jsx
function sameProps(prevProps, nextProps) {
  return (
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.items.length === nextProps.items.length &&
    prevProps.items.every((item, i) => item === nextProps.items[i])
  )
}

const Summary = memo(function Summary({ items, onSelect }) {
  console.log('Summary render')
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          <button onClick={() => onSelect(item.id)}>{item.name}</button>
        </li>
      ))}
    </ul>
  )
}, sameProps)
```

We ran it: the original logged `Summary render` 4 times after 3 ticks, this version once, and clicking `Cy` still logged `selected 3`.

If I could change `App`, I would not write a comparison at all. I would keep the array stable at the source: `const items = useMemo(() => PEOPLE.filter((p) => p.active), [])` (add real dependencies if the filter used state), and let plain `memo` do the default shallow check. That fixes the cause and cannot go stale.

A bug the comparison can cause: it hard-codes the list of props. If someone later adds a new prop to `Summary` (say `title`) and forgets to update `sameProps`, changes to that prop are silently ignored and the UI goes stale. The same thing happens if an item object is mutated in place instead of replaced, because the comparison sees the same object.

</details>

## Recap
- A component re-renders when its own state changes, its parent re-renders, or a context it reads changes. By default all children re-render with the parent, and a re-render is a function call, not a DOM rebuild.
- Objects, arrays and functions are compared by identity. Every render creates new ones, so `{}` from this render is never `===` to `{}` from the last one.
- `React.memo` skips a render when all props are shallowly equal (`Object.is`). One inline object, inline function or JSX `children` prop defeats it.
- `useMemo` caches a value and `useCallback` caches a function (`useCallback(fn, deps)` is `useMemo(() => fn, deps)`). Dependencies are compared with `Object.is`, and a missing one gives a stale closure.
- They help only when something downstream compares by reference: a `memo` child, a dependency array, or a context value. Otherwise they only cost memory and comparisons.
- Fix the structure first: move state down, pass slow parts as `children`, calculate instead of storing derived state. Measure with the Profiler before and after.
- All three are performance hints, not guarantees. If you deleted them, the app must behave the same. Strict Mode calls `useMemo` calculations twice in development.
- React Compiler 1.0 is a stable, opt-in build step that memoizes components and hooks automatically. Keep existing manual memoization, write plain code for new work, and keep manual hooks as an escape hatch.

## Where to go next
- Next lesson: [Custom hooks](08-custom-hooks.md).
- Slow updates and heavy typing: [Other hooks](09-other-hooks.md) (`useTransition`, `useDeferredValue`).
- The full performance toolbox, profiling and the compiler in more depth: [Performance optimization](../04-advanced/02-performance-optimization.md), and the render pipeline behind it: [How React renders](../04-advanced/01-how-react-renders.md).
- Practice: build the [Data table exercise](../practice-app/exercises/react/23-data-table/README.md) and note which values should be calculated, which memoized, and which need neither.
- Output and debugging questions on memo and keys: Round 3, rendering, keys, memo, context (planned).
- Theory questions on rendering and performance: Round 2, rendering and performance (planned), and scenarios in [Round 7, performance scenarios](../05-interview-rounds/round-7-performance-and-testing/questions/01-performance-scenarios.md).
- One-page reference: Hooks cheatsheet (planned).
