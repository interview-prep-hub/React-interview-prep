# useReducer

> **Level:** Intermediate   **Time:** about 45 minutes   **Read first:** [useState in depth](02-usestate-in-depth.md), [useContext](05-usecontext.md)

## What you will learn
- Explain what a reducer is and read `useReducer(reducer, initialState)` line by line.
- Write reducers for a counter, a to-do list and a shopping cart, using immutable updates and a safe `default` case.
- Explain why a reducer must be pure, and what StrictMode does to one that is not.
- Choose between `useState` and `useReducer`, and defend the choice in an interview.
- Share reducer state with Context (one context for state, one for `dispatch`), keep async work out of the reducer, and model loading, success and error with a status field.
- Unit-test a reducer as a plain function, compare the pattern with Redux, and read typed actions in TypeScript.

## 1. What is a reducer?

A **reducer** is a plain function. It takes the current **state** and one **action**, and it returns the **next state**.

```text
(state, action) => newState
```

The name comes from `Array.prototype.reduce`, which you may already know. `reduce` walks through a list, keeps a running result, and combines the result so far with the next item:

```js
const prices = [5, 10, 20]
const total = prices.reduce((sum, price) => sum + price, 0)
console.log(total) // 35
```

A reducer in React does the same thing, but the "items" are **actions** that arrive over time. An action is a small object that says what happened, for example `{ type: 'increment' }`.

Here is a counter reducer with no React at all. We feed it a list of actions with `reduce`:

```js
function counterReducer(count, action) {
  if (action.type === 'increment') return count + 1
  if (action.type === 'decrement') return count - 1
  return count
}

const actions = [{ type: 'increment' }, { type: 'increment' }, { type: 'decrement' }]
console.log(actions.reduce(counterReducer, 0)) // 1
```

**What happens, step by step:**
1. `reduce` starts with the value `0`.
2. It calls `counterReducer(0, { type: 'increment' })`. The result is `1`.
3. It calls `counterReducer(1, { type: 'increment' })`. The result is `2`.
4. It calls `counterReducer(2, { type: 'decrement' })`. The result is `1`.
5. The final result, `1`, is printed.

A good picture is a bank statement. The balance is the state. Each line on the statement (deposit 50, withdraw 20) is an action. To know today's balance, start from the opening balance and apply each line in order. The reducer is the rule for applying one line.

Three words to remember:
- **State**: the current data.
- **Action**: a small object that describes what happened.
- **Dispatch**: the function you call to send an action to the reducer. You will meet it in the next section.

The reducer itself knows nothing about React. That is its biggest advantage: you can read it, run it and test it as ordinary JavaScript.

**Common mistake:** thinking the reducer changes the state. It does not. It *returns* the next state, and React stores whatever you return.

```js
// WRONG: changes the old object and returns nothing
function counterReducer(state, action) {
  if (action.type === 'increment') state.count++
}

// RIGHT: returns a new state
function counterReducer(state, action) {
  if (action.type === 'increment') return { count: state.count + 1 }
  return state
}
```

Why: the wrong version returns `undefined`, so the next state would be `undefined`. The right version returns a value for every action.

## 2. Your first useReducer: a counter

`useReducer` is the React hook that keeps a reducer's state inside a component. Its signature is:

```js
const [state, dispatch] = useReducer(reducer, initialState)
```

- `reducer` is your function `(state, action) => newState`.
- `initialState` is the starting state.
- `state` is the current state. `dispatch` is the function that sends actions.

Here is the counter as a component. Paste it into a Vite React app as `Counter.jsx`:

```jsx
import { useReducer } from 'react'

function counterReducer(count, action) {
  switch (action.type) {
    case 'increment':
      return count + 1
    case 'decrement':
      return count - 1
    case 'reset':
      return 0
    default:
      throw new Error(`Unknown action: ${action.type}`)
  }
}

export default function Counter() {
  const [count, dispatch] = useReducer(counterReducer, 0)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => dispatch({ type: 'decrement' })}>-1</button>
      <button onClick={() => dispatch({ type: 'increment' })}>+1</button>
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
    </div>
  )
}
```

The state here is just a number. It can be any value: a number, a string, an array or an object.

**What happens, step by step:**
1. On the first render React stores `0` as the state. `useReducer` returns `[0, dispatch]`, and the screen shows "Count: 0".
2. The user clicks "+1". The click handler calls `dispatch({ type: 'increment' })`.
3. `dispatch` does not change anything on the spot. It tells React: "an action arrived, please render this component again". (Section 9 shows proof.)
4. During the next render, React calls `counterReducer(0, { type: 'increment' })`. The reducer returns `1`.
5. React stores `1` as the new state and calls `Counter` again. This time `useReducer` returns `[1, dispatch]`, and the screen shows "Count: 1".

Be honest with yourself: for a plain counter, `useState` is shorter. We use a counter first only because it is the smallest example. The real payoff comes with the to-do list and the cart.

**Common mistake:** calling `dispatch` while rendering, or sending something that is not an action object.

```jsx
// WRONG: runs dispatch during render, which loops forever
<button onClick={dispatch({ type: 'increment' })}>+1</button>

// WRONG: a string is not an action object (action.type is undefined)
<button onClick={() => dispatch('increment')}>+1</button>

// RIGHT: an arrow function that sends an action object
<button onClick={() => dispatch({ type: 'increment' })}>+1</button>
```

Why: `dispatch(...)` without an arrow function runs right away, on every render. React stops it with the error "Too many re-renders. React limits the number of renders to prevent an infinite loop." The string version reaches the `default` case and throws `Unknown action: undefined`. Both outputs were checked with React 19.3.1.

## 3. Actions and the switch statement

An action is a plain object. By habit it has a `type` (what happened) plus any data the reducer needs:

```js
dispatch({ type: 'increment' })                      // no data needed
dispatch({ type: 'add', id: 7, text: 'Buy milk' })   // data as extra fields
dispatch({ type: 'toggle', id: 7 })
```

There are two common ways to carry data. Both are fine, but pick one per project:

```js
dispatch({ type: 'toggle', id: 7 })        // flat fields (this lesson, the React docs)
dispatch({ type: 'toggle', payload: 7 })   // a single payload field (Redux style)
```

You will see `payload` a lot in Redux code, so recognise it. The meaning is the same.

**Rules for good actions:**
- **Name what happened, not what to set.** `'add'`, `'toggle'`, `'item_added'` are good. `'set_tasks'` is not. A generic setter action turns your reducer into `useState` with extra steps, and the real logic moves back into your components. The Redux style guide gives the same advice: think of actions as events, not setters.
- **Stay consistent.** Imperative (`add_task`) and past tense (`task_added`) are both common. Choose one.
- **Send only what the reducer cannot know.** That means user input, an id made in the handler, or a server response. The reducer already has the current state, so do not send the state back inside the action.
- **Keep actions plain data.** No functions, no class instances. Plain data is easy to log and replay.

Inside the reducer, the usual way to handle many action types is a `switch`:

```js
function tasksReducer(tasks, action) {
  switch (action.type) {
    case 'add': {
      const task = { id: action.id, text: action.text, done: false }
      return [...tasks, task]
    }
    case 'clear':
      return []
    default:
      throw new Error(`Unknown action: ${action.type}`)
  }
}
```

**What happens, step by step:**
1. React calls `tasksReducer(currentTasks, action)`.
2. `switch (action.type)` jumps to the `case` that matches the type string.
3. That `case` computes and **returns** the next state. A `return` ends the function, so you do not need `break`.
4. If nothing matches, the `default` case runs. Here it throws an error.

Details worth knowing:
- Put braces `{ }` around a `case` that declares a variable with `const`, as `'add'` does. Without braces all cases share one scope, and ESLint reports it.
- **The `default` case.** With `useReducer`, a reducer only receives actions that *you* wrote. An unknown type is almost always a typo, so we throw and make the typo loud. We checked this: with `dispatch({ type: 'incremnt' })` the reducer threw while React was rendering, and an Error Boundary showed its fallback. Without a boundary, React removes the whole UI.
- **Redux does it differently.** In Redux, every reducer sees every action, so an unknown action is normal, and the `default` case returns `state`. Keep that in mind when you read Redux code.

**Common mistake:** forgetting to `return`.

```js
// WRONG: computes the value but never returns it
case 'increment':
  count + 1

// RIGHT
case 'increment':
  return count + 1
```

Why: without `return`, the code falls through to the next `case`, or the function ends and returns `undefined`. Your state silently becomes `undefined`, and the next render fails with an error such as "Cannot read properties of undefined".

## 4. Never mutate: immutable updates

To **mutate** means to change an object or array in place (`list.push(x)`, `obj.name = 'Ann'`). **Immutable** updates build a new object or array instead and leave the old one alone.

Reducers must be immutable, for two reasons.

**Reason 1: React compares by identity.** After the reducer runs, React asks `Object.is(oldState, newState)`. That asks "are these the very same object in memory?". If you change the old object and return it, the answer is "yes, same object", and React skips the re-render.

```js
function brokenCounterReducer(state, action) {
  if (action.type === 'increment') {
    state.count++ // WRONG: changes the old state object
    return state // WRONG: returns the very same object
  }
  return state
}
```

We ran a component with this reducer. It shows `state.count` and has a "+1" button and a "Redraw" button that only sets some unrelated state. The result (React 19.3.1):

```text
click "+1"      -> the screen still says "Count: 0"
click "Redraw"  -> the screen now says "Count: 1"
```

The data changed, but React never knew. The screen caught up only when something else forced a render.

**Reason 2: StrictMode runs your reducer twice** in development (section 6). A reducer that mutates its input does its damage twice. This one looks safer because it returns a copy, but it still mutates:

```js
function brokenTasksReducer(tasks, action) {
  if (action.type === 'add') {
    tasks.push({ id: action.id, text: action.text }) // WRONG: changes the old array
    return [...tasks] // a new array, so React re-renders
  }
  return tasks
}
```

With one click on "Add", the list showed 1 item without StrictMode and **2 items** inside `<StrictMode>`. The second reducer call pushed onto the array that the first call had already changed.

The fix is to build new values and never touch the old ones:

```js
function tasksReducer(tasks, action) {
  if (action.type === 'add') {
    return [...tasks, { id: action.id, text: action.text }] // a new array
  }
  return tasks
}
```

Your everyday toolbox:

| You want to... | Do not use | Use instead |
|---|---|---|
| Add to an array | `push`, `unshift` | `[...list, item]` |
| Remove from an array | `splice`, `pop`, `shift` | `list.filter(...)` |
| Replace one item | `list[i] = x` | `list.map(...)` |
| Change a field | `obj.x = 1` | `{ ...obj, x: 1 }` |
| Change a nested field | `obj.a.b = 1` | `{ ...obj, a: { ...obj.a, b: 1 } }` |
| Sort or reverse | `list.sort()`, `list.reverse()` | `[...list].sort(...)` or `list.toSorted(...)` |

Two more ideas:
- **Spread copies one level only.** It is a shallow copy. When you change something deep, copy every level on the path to it. Everything you did not touch can be shared with the old state. That sharing is why immutable updates are cheap.
- **If nothing changes, return the same `state`.** React then skips the re-render (section 9).

Deeply nested state gets wordy with spreads. A library called Immer lets you write code that looks like mutation and produces a new object safely. The `use-immer` package offers `useImmerReducer`, and Redux Toolkit uses Immer inside. Learn plain spreads first, because interviews ask for them. The Immer notes are in [useState in depth](02-usestate-in-depth.md).

**What happens, step by step** (the safe `[...tasks, item]` version):
1. The reducer receives the old array `tasks`.
2. `[...tasks, item]` creates a brand new array holding the old items plus the new one.
3. The old array is untouched. React sees a different object, so it renders again.
4. Even if the reducer runs twice, both runs start from the same untouched old array, so both give the same answer.

**Common mistake:** `map` makes a new array, but it can still hand back the old objects, and you may change them on the way.

```js
// WRONG: the array is new, but each line object is the old one, and we change it
items.map((line) => {
  if (line.id === id) line.quantity++
  return line
})

// RIGHT: a new object for the line that changes
items.map((line) => (line.id === id ? { ...line, quantity: line.quantity + 1 } : line))
```

Why: the old state still holds those line objects. Changing them changes the old state behind React's back.

## 5. A bigger example: a to-do list

Now a reducer that earns its keep. A to-do list has four things you can do: add a task, toggle it done, remove it, and clear all finished tasks. All four rules live in one function.

```jsx
import { useReducer, useState } from 'react'

function tasksReducer(tasks, action) {
  switch (action.type) {
    case 'add':
      return [...tasks, { id: action.id, text: action.text, done: false }]
    case 'toggle':
      return tasks.map((task) =>
        task.id === action.id ? { ...task, done: !task.done } : task,
      )
    case 'remove':
      return tasks.filter((task) => task.id !== action.id)
    case 'clear_done':
      return tasks.filter((task) => !task.done)
    default:
      throw new Error(`Unknown action: ${action.type}`)
  }
}

let nextId = 1

export default function TaskApp() {
  const [tasks, dispatch] = useReducer(tasksReducer, [])
  const [text, setText] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed === '') return
    dispatch({ type: 'add', id: nextId++, text: trimmed })
    setText('')
  }

  const doneCount = tasks.filter((task) => task.done).length

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          aria-label="New task"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <label>
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => dispatch({ type: 'toggle', id: task.id })}
              />
              <span style={{ textDecoration: task.done ? 'line-through' : 'none' }}>
                {task.text}
              </span>
            </label>
            <button onClick={() => dispatch({ type: 'remove', id: task.id })}>
              Delete {task.text}
            </button>
          </li>
        ))}
      </ul>

      <p>
        {doneCount} of {tasks.length} done
      </p>
      <button onClick={() => dispatch({ type: 'clear_done' })}>Clear done</button>
    </div>
  )
}
```

We ran this component: adding, ticking, deleting and clearing all work as described below, and adding a task inside StrictMode still gives exactly one row.

**What happens, step by step:**
1. The user types "Buy milk". Each keystroke calls `setText`. That text is a small piece of UI-only state, so `useState` is the right tool. The reducer is not involved.
2. The user presses Add. `handleSubmit` builds the action `{ type: 'add', id: 1, text: 'Buy milk' }` and dispatches it. The id is made here, in the handler.
3. During the next render React calls `tasksReducer([], action)`. The `'add'` case returns a new array with one task.
4. `setText('')` was called in the same handler. React batches both updates into one render, so the list shows the new row and the input empties together.
5. The user ticks the checkbox. `'toggle'` uses `map`: the matching task becomes a **new object** `{ ...task, done: true }`, and every other task is the same object as before.
6. `doneCount` is calculated during render from `tasks`. It is never stored.

Notice two habits:
- **Mixing hooks is normal.** `useReducer` holds the domain data (tasks). `useState` holds the throwaway input text. Use each where it fits.
- **Derived data is computed, not stored.** Never put `doneCount` into the state. A second copy of the same truth will drift out of sync.

**Common mistake:** storing something you can calculate.

```js
// WRONG: doneCount must be updated by hand in four different cases
const initialState = { tasks: [], doneCount: 0 }

// RIGHT: keep only the tasks, and calculate the count when you render
const doneCount = tasks.filter((task) => task.done).length
```

Why: every extra stored field is one more thing a case can forget to update.

## 6. Reducers must be pure (and what StrictMode does about it)

A **pure** function has two properties:
1. Same inputs give the same output.
2. It changes nothing outside itself (it has no **side effects**).

React needs this because the reducer runs *while React is rendering*, and rendering must be a calculation that can be repeated safely. React may call it more than once, throw a result away, or replay an update later.

To catch impure code early, **StrictMode calls your reducer twice** in development. Look at this reducer, which logs each call:

```jsx
function counterReducer(count, action) {
  console.log('reducer called with', action.type)
  switch (action.type) {
    case 'increment':
      return count + 1
    default:
      return count
  }
}
```

We clicked "+1" once and counted the calls (React 19.3.1):

```text
without StrictMode:  1 call
inside <StrictMode>: 2 calls
```

This happens only in development. A production build calls the reducer once. The initial-state function from section 7 and `setState` updater functions get the same double call.

If your reducer is pure, the second call returns the same answer, and nobody notices. If it is impure, the double call exposes the bug on your own laptop instead of in production. Think of it as a free test.

**Allowed inside a reducer:** read `state` and `action`, calculate with plain JavaScript, return a new value.

**Never inside a reducer:**
- Changing `state`, `action` or anything else in place (section 4).
- `fetch`, timers, `localStorage.setItem` and other side effects.
- Reading values that change by themselves: `Date.now()`, `Math.random()`, `crypto.randomUUID()`, a global counter.
- Calling `dispatch` or a `set...` function.
- `await`.

`console.log` is technically a side effect too. It is fine for debugging, and you remove it afterwards.

Here is a very common impure reducer. It gets ids from a variable outside the function:

```js
let nextId = 1

// WRONG: reads and changes a variable outside the function
function tasksReducer(tasks, action) {
  if (action.type === 'add') {
    return [...tasks, { id: nextId++, text: action.text }]
  }
  return tasks
}
```

We clicked "Add" three times and printed the ids:

```text
without StrictMode:  1,2,3
inside <StrictMode>: 2,4,6
```

In StrictMode each click used up two ids, because the reducer ran twice. The skipped numbers are the mild symptom. With `Math.random()` or `Date.now()` the two calls would give different answers, and React keeps only one of them. The fix is to make the id **in the event handler** and send it in the action, exactly as `TaskApp` does:

```jsx
dispatch({ type: 'add', id: nextId++, text: trimmed })
```

An event handler runs once per click, and handlers are allowed to have side effects. So the handler gathers everything that is "unpredictable" (ids, times, user input, server data) and the reducer only combines it with the state.

**What happens, step by step** (one click on Add in StrictMode, with the fix):
1. The handler makes the id once and dispatches `{ type: 'add', id: 1, text }`.
2. During the render, React calls the reducer with the old tasks and that action.
3. Because this is StrictMode, React calls it a second time with the same two inputs.
4. A pure reducer returns an equal array both times. One result is used and the other is dropped. Nothing visible changes.

**Common mistake:** side effects in the reducer.

```js
// WRONG: writes to storage inside the reducer
case 'add': {
  const next = [...tasks, action.task]
  localStorage.setItem('tasks', JSON.stringify(next))
  return next
}

// RIGHT: the reducer only returns the next state. Save it in an effect.
useEffect(() => {
  localStorage.setItem('tasks', JSON.stringify(tasks))
}, [tasks])
```

Why: the reducer may run twice or be replayed, and a render must never write to the outside world. Effects are covered in [useEffect](03-useeffect.md).

## 7. Initial state and the init function

So far we passed the initial state directly: `useReducer(counterReducer, 0)`. The full signature has an optional third argument:

```js
const [state, dispatch] = useReducer(reducer, initialArg, init)
```

If you pass `init`, React calls `init(initialArg)` **once, on the first render**, and uses the result as the initial state. With two arguments, `initialArg` simply *is* the initial state.

```jsx
import { useReducer } from 'react'

function init(startAt) {
  return { count: startAt }
}

function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 }
    case 'reset':
      return init(action.startAt)
    default:
      throw new Error(`Unknown action: ${action.type}`)
  }
}

export default function Counter({ startAt = 0 }) {
  const [state, dispatch] = useReducer(reducer, startAt, init)

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+1</button>
      <button onClick={() => dispatch({ type: 'reset', startAt })}>Reset</button>
    </div>
  )
}
```

**What happens, step by step:**
1. First render with `startAt = 5`: React calls `init(5)` and stores `{ count: 5 }`.
2. The user clicks "+1" twice. The reducer runs twice. `init` is not called again.
3. The user clicks Reset. The reducer calls `init(5)` itself and returns a fresh start state. This is the second use of `init`: one function builds the start state and also resets it.
4. If the parent later renders `<Counter startAt={50} />`, the count does **not** change. The initial value only matters on the first render. (Same rule as `useState`.)

We counted the calls to `init` (React 19.3.1):

```text
after the first render:        1
after two clicks on "+1":      1
after clicking Reset:          2
in StrictMode, first render:   2   (development only, the double call from section 6)
```

Why bother? Look at the "slow way", which many people write:

```jsx
// SLOWER: init(startAt) runs on EVERY render. Only the first result is used.
const [state, dispatch] = useReducer(reducer, init(startAt))
```

In the same test, this version called `init` 3 times after a first render and two clicks, because the call sits in the component body. For a cheap value like `{ count: 5 }` that does not matter. When creating the start state is expensive (parsing saved JSON, building a big array), pass the function and its argument separately.

A typical use is loading saved data once. Pass `undefined` as the argument when `init` needs none:

```js
function init() {
  const saved = localStorage.getItem('tasks')
  return saved ? JSON.parse(saved) : []
}

const [tasks, dispatch] = useReducer(tasksReducer, undefined, init)
```

Reading storage once in `init` is a common and accepted use: it runs a single time and changes nothing outside the component. Writing the data back belongs in an effect (section 6). This works in a browser-only app, because a server has no `localStorage`. A real app also wraps `JSON.parse` in `try/catch`, in case the saved text is damaged.

**Common mistake:** calling the initialiser yourself.

```js
// WRONG: init(startAt) runs on every render
useReducer(reducer, init(startAt))

// RIGHT: pass the function and its argument, React calls it once
useReducer(reducer, startAt, init)
```

Why: the first form evaluates `init(startAt)` as an ordinary expression each time the component runs.

## 8. A shopping cart: nested state and derived data

The cart is the classic machine-coding task. It adds three new ideas: an object as state, a list inside that object, and totals that you compute instead of store.

Put the pure logic in its own file, `cartReducer.js`. Prices are whole cents (450 means $4.50). Integers avoid float errors such as `0.1 + 0.2`.

```js
export const emptyCart = { items: [] }

export function cartReducer(cart, action) {
  switch (action.type) {
    case 'add': {
      const exists = cart.items.some((line) => line.id === action.product.id)
      if (exists) {
        return {
          ...cart,
          items: cart.items.map((line) =>
            line.id === action.product.id
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          ),
        }
      }
      return {
        ...cart,
        items: [...cart.items, { ...action.product, quantity: 1 }],
      }
    }
    case 'increment':
      return {
        ...cart,
        items: cart.items.map((line) =>
          line.id === action.id ? { ...line, quantity: line.quantity + 1 } : line,
        ),
      }
    case 'decrement':
      return {
        ...cart,
        items: cart.items
          .map((line) =>
            line.id === action.id ? { ...line, quantity: line.quantity - 1 } : line,
          )
          .filter((line) => line.quantity > 0),
      }
    case 'remove':
      return { ...cart, items: cart.items.filter((line) => line.id !== action.id) }
    case 'clear':
      return emptyCart
    default:
      throw new Error(`Unknown action: ${action.type}`)
  }
}

// Derived data: computed from the state, never stored in it.
export function getItemCount(cart) {
  return cart.items.reduce((sum, line) => sum + line.quantity, 0)
}

export function getTotal(cart) {
  return cart.items.reduce((sum, line) => sum + line.price * line.quantity, 0)
}
```

Then the screen, `Shop.jsx`:

```jsx
import { useReducer } from 'react'
import { cartReducer, emptyCart, getItemCount, getTotal } from './cartReducer.js'

const PRODUCTS = [
  { id: 'p1', name: 'Notebook', price: 450 },
  { id: 'p2', name: 'Pen', price: 125 },
]

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function Shop() {
  const [cart, dispatch] = useReducer(cartReducer, emptyCart)

  return (
    <div>
      <h2>Products</h2>
      <ul>
        {PRODUCTS.map((product) => (
          <li key={product.id}>
            {product.name} {formatPrice(product.price)}
            <button
              aria-label={`Add ${product.name}`}
              onClick={() => dispatch({ type: 'add', product })}
            >
              Add
            </button>
          </li>
        ))}
      </ul>

      <h2>Cart ({getItemCount(cart)} items)</h2>
      {cart.items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <ul aria-label="Cart items">
          {cart.items.map((line) => (
            <li key={line.id}>
              {line.name} x {line.quantity}
              <button
                aria-label={`Decrease ${line.name}`}
                onClick={() => dispatch({ type: 'decrement', id: line.id })}
              >
                -
              </button>
              <button
                aria-label={`Increase ${line.name}`}
                onClick={() => dispatch({ type: 'increment', id: line.id })}
              >
                +
              </button>
              <button
                aria-label={`Remove ${line.name}`}
                onClick={() => dispatch({ type: 'remove', id: line.id })}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <p>Total: {formatPrice(getTotal(cart))}</p>
      <button onClick={() => dispatch({ type: 'clear' })}>Clear cart</button>
    </div>
  )
}
```

**What happens, step by step:**
1. The cart starts as `{ items: [] }`. The screen shows "Your cart is empty." and "Total: $0.00".
2. The user clicks "Add Notebook". The handler dispatches `{ type: 'add', product }`.
3. The reducer sees that no line with id `p1` exists. It returns `{ ...cart, items: [...cart.items, { ...product, quantity: 1 }] }`. That is a new cart object holding a new array.
4. The user clicks "Add Notebook" again. A line with id `p1` now exists, so `map` replaces just that line with `{ ...line, quantity: 2 }`.
5. The user clicks "Add Pen". A second line is appended.
6. On every render, `getItemCount(cart)` and `getTotal(cart)` run. With 2 notebooks and 1 pen the screen shows "Cart (3 items)" and "Total: $10.25" (450 + 450 + 125 = 1025 cents). We ran this shop and checked the numbers, also inside StrictMode.
7. "Decrease Pen" maps the pen line to quantity 0, and `filter` drops it. That is how a line disappears when it reaches zero.

Three design choices to point out in an interview:
- **The action carries the least data possible.** `'increment'` sends only an id. The reducer reads the current quantity itself, so two quick clicks cannot both start from a stale number.
- **Totals are derived.** `getItemCount` and `getTotal` read the state and never change it. They can be used anywhere, and they are always right.
- **The reducer lives in its own file with no React in it.** That makes it trivial to test (section 14).

Build the complete version yourself in [Exercise 19: shopping cart with a reducer](../practice-app/exercises/react/19-shopping-cart-reducer/README.md), and try a nested-state version in [Exercise 25: kanban board](../practice-app/exercises/react/25-kanban-board/README.md).

**Common mistake:** putting the new quantity in the action.

```js
// WRONG: the component computes the new number from a possibly stale value
dispatch({ type: 'set_quantity', id: line.id, quantity: line.quantity + 1 })

// RIGHT: say what happened, let the reducer do the arithmetic on current state
dispatch({ type: 'increment', id: line.id })
```

Why: the reducer always has the latest state when it runs. The component only has the snapshot from its last render.

## 9. What dispatch really does

Four facts explain almost every `useReducer` question.

**Fact 1: `dispatch` does not run the reducer straight away.** It queues the action and asks React to render. The reducer runs later, *during the render*. The state in your handler is still the old snapshot. Here is a component with log lines everywhere:

```jsx
import { useReducer } from 'react'

function reducer(count, action) {
  console.log(`reducer(${count}, ${action.type})`)
  return action.type === 'increment' ? count + 1 : count
}

export default function App() {
  const [count, dispatch] = useReducer(reducer, 0)
  console.log(`render count=${count}`)

  function handleClick() {
    console.log('handler: before dispatch')
    dispatch({ type: 'increment' })
    console.log(`handler: after dispatch, count is still ${count}`)
  }

  return <button onClick={handleClick}>Count: {count}</button>
}
```

Output after one click (React 19.3.1, no StrictMode):

```text
handler: before dispatch
handler: after dispatch, count is still 0
reducer(0, increment)
render count=1
```

The handler finishes first. Then React renders, and the reducer runs inside that render.

**Fact 2: actions queue up, and each one sees the result of the one before.** Dispatch three times in one handler and the reducer runs three times in a row, in one render. Compare it with `useState`:

```jsx
import { useReducer, useState } from 'react'

function reducer(count, action) {
  return action.type === 'add_one' ? count + 1 : count
}

export default function Demo() {
  const [viaReducer, dispatch] = useReducer(reducer, 0)
  const [viaState, setViaState] = useState(0)

  function handleClick() {
    dispatch({ type: 'add_one' })
    dispatch({ type: 'add_one' })
    dispatch({ type: 'add_one' })

    setViaState(viaState + 1)
    setViaState(viaState + 1)
    setViaState(viaState + 1)
  }

  return (
    <button onClick={handleClick}>
      reducer: {viaReducer}, state: {viaState}
    </button>
  )
}
```

After one click the button reads `reducer: 3, state: 1`. In a separate run with three dispatches we counted three reducer calls and one render. The `setViaState(viaState + 1)` calls all used the same stale `viaState` (0), so they all asked for 1. Each `dispatch` is applied to the latest state, like the updater form `setCount(c => c + 1)`. This is a real advantage of reducers: "add one to whatever it is when you get to me".

**Fact 3: `dispatch` has a stable identity.** It is the same function on every render of the component, just like a `set...` function from `useState`. We stored `dispatch` from three renders and compared them: all identical. So you can put it in a dependency array without re-running the effect, pass it down to children without making them re-render, and skip `useCallback` for it. The ESLint hooks rule knows this and does not ask you to list it.

**Fact 4: if the reducer returns the same state, React skips the children.** `Object.is(oldState, newState)` is `true`, so React does not re-render the children or run effects. We counted calls for a component with one child:

```text
dispatch a no-op action (reducer returns the same state):
  component function called: +1, child called: +0
dispatch a real change:
  component function called: +1, child called: +1
```

Why is the component called at all in the first case? Because the reducer runs as part of rendering that component. React has to call the component to find out the answer, and then it throws the render away. That is one more reason a component body must be pure. So, for actions that change nothing, **return `state` itself**, not a copy like `{ ...state }`.

One last detail: `dispatch` takes exactly one argument. There is no "callback after update" like the old class `setState`. In development React logs a warning if you pass a second argument. To run code after the update, use `useEffect`.

**Common mistake:** reading the state right after dispatching.

```jsx
// WRONG: count is still the old value here
dispatch({ type: 'increment' })
console.log(count) // the old number

// RIGHT: use the value in the next render, or in an effect
useEffect(() => {
  console.log('count is now', count)
}, [count])
```

Why: state is a snapshot of one render. It never changes in the middle of a render or a handler.

## 10. useState or useReducer?

Both hold state and both re-render the component. In fact, `useState` runs on the same machinery inside React. Its built-in reducer says: "if the action is a function, call it with the old state; otherwise use the action as the new state". The real question is where you want the *update logic* to live.

Here is a small game: score, lives and a game-over flag. First with `useState`:

```jsx
import { useState } from 'react'

export default function Game() {
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [gameOver, setGameOver] = useState(false)

  function handleCoin() {
    if (gameOver) return
    setScore(score + 10)
  }

  function handleHit() {
    if (gameOver) return
    setLives(lives - 1)
    if (lives - 1 === 0) setGameOver(true)
  }

  function handleRestart() {
    setScore(0)
    setLives(3)
    setGameOver(false)
  }

  return (
    <div>
      <p>Score {score}, lives {lives}</p>
      {gameOver && <p>Game over</p>}
      <button onClick={handleCoin}>Coin</button>
      <button onClick={handleHit}>Hit</button>
      <button onClick={handleRestart}>Restart</button>
    </div>
  )
}
```

The rules are spread over three handlers. "Ignore everything after game over" is repeated. "Restart" must remember all three values. Add a fourth value and you must update every handler.

The same game with a reducer:

```jsx
import { useReducer } from 'react'

const initialGame = { score: 0, lives: 3, gameOver: false }

function gameReducer(game, action) {
  switch (action.type) {
    case 'coin':
      return game.gameOver ? game : { ...game, score: game.score + 10 }
    case 'hit': {
      if (game.gameOver) return game
      const lives = game.lives - 1
      return { ...game, lives, gameOver: lives === 0 }
    }
    case 'restart':
      return initialGame
    default:
      throw new Error(`Unknown action: ${action.type}`)
  }
}

export default function Game() {
  const [game, dispatch] = useReducer(gameReducer, initialGame)

  return (
    <div>
      <p>Score {game.score}, lives {game.lives}</p>
      {game.gameOver && <p>Game over</p>}
      <button onClick={() => dispatch({ type: 'coin' })}>Coin</button>
      <button onClick={() => dispatch({ type: 'hit' })}>Hit</button>
      <button onClick={() => dispatch({ type: 'restart' })}>Restart</button>
    </div>
  )
}
```

We played both versions through the same steps (two coins, three hits, a coin after game over, a restart) and they behave the same. The difference is where the rules live. In the reducer version, every rule is in one place. Restart is just `return initialGame`.

**How to decide, step by step:**
1. Start with `useState`. It is shorter, and most state is simple.
2. Ask: do several values change together, or must they stay consistent with each other (lives and gameOver)? That points to `useReducer`.
3. Ask: does the next state depend on the previous state in more than one way (add, toggle, remove, clear)? That points to `useReducer`.
4. Ask: do many handlers, or many child components, change the same state with the same rules? One `dispatch` is easier to pass down than six callbacks.
5. Ask: do you want to test the logic without rendering anything, or log every action while debugging? A reducer makes both easy.
6. If you answered "no" to all of these, stay with `useState`. Switch later when the handlers get repetitive.

Choose `useState` for: a boolean (open or closed), an input's text, a selected tab, one number. Choose `useReducer` for: carts, forms with many linked fields, multi-step wizards, games, boards, anything with a status field, anything that has "rules".

The cost of a reducer is more code up front and one level of indirection: to see what a button does, you jump to the reducer. A single component may use both, as `TaskApp` does.

**Common mistake:** a reducer that is only a setter.

```js
// WRONG: this is useState with extra steps
function reducer(state, action) {
  switch (action.type) {
    case 'set_count':
      return { ...state, count: action.value }
    case 'set_step':
      return { ...state, step: action.value }
  }
}

// RIGHT: actions that name what happened, with the rules inside the reducer
//   { type: 'increment' }, { type: 'reset' }
```

Why: if the actions only say "put this value there", all the real logic still lives in the components, and you got none of the benefit.

## 11. useReducer plus Context: sharing state across the app

Every call to `useReducer` creates its own state for its own component. Two components that use the same reducer *function* do **not** share state; they only share the logic. To share the state itself, call `useReducer` once, high in the tree, and hand the result down.

Handing it down through props gets tiring ("prop drilling"). Context removes the chain. The well-known pattern uses **two** contexts: one for the state and one for `dispatch`.

```jsx
// TasksContext.jsx
import { createContext, useContext, useReducer } from 'react'

const TasksContext = createContext(null)
const TasksDispatchContext = createContext(null)

function tasksReducer(tasks, action) {
  switch (action.type) {
    case 'add':
      return [...tasks, { id: action.id, text: action.text, done: false }]
    case 'toggle':
      return tasks.map((task) =>
        task.id === action.id ? { ...task, done: !task.done } : task,
      )
    case 'clear':
      return []
    default:
      throw new Error(`Unknown action: ${action.type}`)
  }
}

export function TasksProvider({ children }) {
  const [tasks, dispatch] = useReducer(tasksReducer, [])

  return (
    <TasksContext value={tasks}>
      <TasksDispatchContext value={dispatch}>{children}</TasksDispatchContext>
    </TasksContext>
  )
}

export function useTasks() {
  const tasks = useContext(TasksContext)
  if (tasks === null) {
    throw new Error('useTasks must be used inside a TasksProvider')
  }
  return tasks
}

export function useTasksDispatch() {
  const dispatch = useContext(TasksDispatchContext)
  if (dispatch === null) {
    throw new Error('useTasksDispatch must be used inside a TasksProvider')
  }
  return dispatch
}
```

In React 19 you write `<TasksContext value={...}>` directly. Older code writes `<TasksContext.Provider value={...}>`, which still works. See [useContext](05-usecontext.md).

Now the components that use it. They never receive props. They call the hooks:

```jsx
// App.jsx
import { TasksProvider, useTasks, useTasksDispatch } from './TasksContext.jsx'

let nextId = 1

function AddTask() {
  const dispatch = useTasksDispatch()

  function handleClick() {
    const id = nextId++
    dispatch({ type: 'add', id, text: `Task ${id}` })
  }

  return <button onClick={handleClick}>Add task</button>
}

function ClearButton() {
  const dispatch = useTasksDispatch()
  return <button onClick={() => dispatch({ type: 'clear' })}>Clear</button>
}

function TaskList() {
  const tasks = useTasks()
  const dispatch = useTasksDispatch()

  if (tasks.length === 0) return <p>No tasks yet.</p>

  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          <label>
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => dispatch({ type: 'toggle', id: task.id })}
            />
            {task.text}
          </label>
        </li>
      ))}
    </ul>
  )
}

export default function App() {
  return (
    <TasksProvider>
      <AddTask />
      <ClearButton />
      <TaskList />
    </TasksProvider>
  )
}
```

**What happens, step by step:**
1. `TasksProvider` calls `useReducer` once. It publishes `tasks` through one context and `dispatch` through the other.
2. `AddTask` calls `useTasksDispatch()` and receives `dispatch`. `TaskList` calls `useTasks()` and receives the array.
3. The user clicks "Add task". `dispatch` sends the action. The reducer runs, and the provider re-renders with a new `tasks` array.
4. React updates every component that *reads* `TasksContext`, which is `TaskList`. It re-renders and shows the new row.
5. `AddTask` and `ClearButton` read only the dispatch context. Its value is the same `dispatch` function as before. Also, `TasksProvider` receives them as its `children` prop from `App`, so they are the same element objects as last time. React has no reason to render them again.

**Why two contexts?** We counted renders after two clicks on "Add task" (no StrictMode, which would only double the function calls):

```text
Two contexts (the code above):
  AddTask: 1 render   ClearButton: 1 render   TaskList: 3 renders

One context holding { tasks, dispatch } (even wrapped in useMemo):
  AddTask: 3 renders  ClearButton: 3 renders  TaskList: 3 renders
```

The count includes the first render, so `TaskList` rendered once on mount and once per click. With a single combined object, the value changes whenever `tasks` changes. Then every component that only wanted `dispatch` renders too, for nothing. With two contexts, `dispatch` never changes (section 9, fact 3), so the components that only send actions stay still.

Notice also that no `useMemo` is needed here. `tasks` is a state value and `dispatch` is stable, so each context value changes only when it truly should. A combined `{ tasks, dispatch }` object literal would be a new object on every render, and you would need `useMemo`.

**Where this pattern stops working well:**
- Every component that calls `useTasks()` re-renders when *any* part of `tasks` changes. Context has no selectors, so a component cannot subscribe to just one slice.
- That is fine for a theme, the logged-in user, a cart, a wizard or a small app. It can hurt when state changes very often (typing, dragging) or when hundreds of components read it.
- Keep fast-changing UI state local, in the component that needs it. Split big state into several providers by topic. Put each provider as low in the tree as it can go.
- If you outgrow it, a store with selectors (Redux Toolkit, Zustand) is the next step. See [State management](../03-intermediate/06-state-management.md).

**Common mistake:** one context with an inline object.

```jsx
// WRONG: a new object on every render, so every consumer renders every time
<TasksContext value={{ tasks, dispatch }}>{children}</TasksContext>

// RIGHT: two contexts, each value changes only when it really changes
<TasksContext value={tasks}>
  <TasksDispatchContext value={dispatch}>{children}</TasksDispatchContext>
</TasksContext>
```

Why: Context compares the value with `Object.is`. A fresh object is never equal to the last one.

## 12. Async work stays outside the reducer

A reducer is synchronous and pure. It cannot wait for a server, so it must not use `await` and must not call `fetch`. What happens if someone makes it `async`?

```js
// WRONG: an async function always returns a Promise
async function counterReducer(state, action) {
  if (action.type === 'increment') return { count: state.count + 1 }
  return state
}
```

We ran it. After one click, the "state" was a Promise (`[object Promise]`) and `state.count` was `undefined`. In JSX, `{state.count}` shows nothing for `undefined`, so the number simply vanished from the screen. The next dispatch would compute `undefined + 1`, which is `NaN`. A reducer must return the next state itself, never a Promise of it.

The rule is simple: **the event handler (or an effect) does the async work, and the reducer records what happened.** The handler dispatches one action when the work starts and another when it finishes:

```jsx
async function handleLoad() {
  dispatch({ type: 'fetch_started' })
  try {
    const user = await fetchUser(id)
    dispatch({ type: 'fetch_succeeded', user })
  } catch (error) {
    dispatch({ type: 'fetch_failed', error: error.message })
  }
}
```

The reducer stays small and pure: it only turns each action into the next state. Redux handles this with *middleware* (thunks). With `useReducer` you simply write the handler.

React 19 also has a hook with a reducer-like shape that *does* accept an async function: `useActionState`. It is built for form submissions and Actions, and it is not a replacement for `useReducer`. It is explained in [React 19 and newer](../04-advanced/04-react-19-and-newer.md).

**Common mistake:** doing the async work in the reducer, or dispatching from the reducer.

```js
// WRONG: side effects and dispatch inside the reducer
case 'load':
  fetch('/api/user').then((res) => dispatch({ type: 'loaded', res }))
  return { ...state, loading: true }

// RIGHT: the handler fetches and dispatches. The reducer only returns state.
```

Why: the reducer can run twice (StrictMode) and runs during render. That code would send two requests and update state in the middle of a render.

## 13. Status machines: loading, success, error

Data that comes from a server is always in one of a few situations: nothing asked yet, waiting, arrived, or failed. Many people track this with several booleans:

```js
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState(null)
const [user, setUser] = useState(null)
```

These can contradict each other. Nothing stops `isLoading` and `error` from both being set, or `user` from holding old data while a new request is loading. These are **impossible states**, and every one is a bug waiting to happen.

A better way is one field called `status` that holds exactly one of four values:

- `'idle'`: nothing has been requested yet.
- `'loading'`: waiting for the answer.
- `'success'`: the answer arrived. The data is in the state.
- `'error'`: the request failed. The message is in the state.

This is a small **state machine**: a fixed set of states and the allowed moves between them.

```text
idle ----fetch_started----> loading ----fetch_succeeded----> success
                              |
                              +--------fetch_failed--------> error

success or error ----fetch_started----> loading   (try again)
any state --------------reset---------> idle
```

The reducer follows the picture:

```jsx
import { useReducer } from 'react'

const initialState = { status: 'idle', user: null, error: null }

function userReducer(state, action) {
  switch (action.type) {
    case 'fetch_started':
      return { status: 'loading', user: null, error: null }
    case 'fetch_succeeded':
      if (state.status !== 'loading') return state // ignore a stray result
      return { status: 'success', user: action.user, error: null }
    case 'fetch_failed':
      if (state.status !== 'loading') return state
      return { status: 'error', user: null, error: action.error }
    case 'reset':
      return initialState
    default:
      throw new Error(`Unknown action: ${action.type}`)
  }
}

// A pretend server call. Id 0 does not exist.
function fakeFetchUser(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id === 0) reject(new Error('User not found'))
      else resolve({ id, name: `User ${id}` })
    }, 500)
  })
}

export default function UserLoader() {
  const [state, dispatch] = useReducer(userReducer, initialState)
  const busy = state.status === 'loading'

  async function handleLoad(id) {
    dispatch({ type: 'fetch_started' })
    try {
      const user = await fakeFetchUser(id)
      dispatch({ type: 'fetch_succeeded', user })
    } catch (error) {
      dispatch({ type: 'fetch_failed', error: error.message })
    }
  }

  return (
    <div>
      <button onClick={() => handleLoad(1)} disabled={busy}>
        Load user 1
      </button>
      <button onClick={() => handleLoad(0)} disabled={busy}>
        Load missing user
      </button>
      <button onClick={() => dispatch({ type: 'reset' })} disabled={busy}>
        Reset
      </button>

      {state.status === 'idle' && <p>Pick a button.</p>}
      {state.status === 'loading' && <p>Loading...</p>}
      {state.status === 'success' && <p>Loaded: {state.user.name}</p>}
      {state.status === 'error' && <p role="alert">Error: {state.error}</p>}
    </div>
  )
}
```

**What happens, step by step:**
1. The page starts as `idle` and shows "Pick a button."
2. The user clicks "Load user 1". The handler dispatches `fetch_started`. The reducer returns `status: 'loading'`, and clears the old user and error. The buttons become disabled and the screen shows "Loading...".
3. The handler waits for `fakeFetchUser(1)`. This takes 500 ms. React is free to render in the meantime.
4. The promise resolves with `{ id: 1, name: 'User 1' }`. The handler dispatches `fetch_succeeded`. The reducer checks that the status is `'loading'`, then returns `status: 'success'`. The screen shows "Loaded: User 1".
5. The user clicks "Load missing user". After 500 ms the promise rejects. The `catch` block dispatches `fetch_failed`, and the screen shows the alert "Error: User not found".
6. "Reset" returns to the idle state.

We ran this with fake timers: the success path, the error path and Reset all work as described, and the success path also works inside StrictMode.

Why this is better than three booleans: the `status` is a single value, so it can only be in one situation at a time. The screen is a simple `status === ...` check. The line `if (state.status !== 'loading') return state` makes unexpected actions harmless, for example a result that arrives after the user pressed Reset.

Be honest about its limits. That guard does not solve a race between two overlapping requests: an old answer could arrive while a *newer* request is loading, and be accepted. To handle that, tag each request with an id and ignore answers with the wrong id, or cancel the old request with `AbortController`. See [useEffect](03-useeffect.md) and [Data fetching](../03-intermediate/02-data-fetching.md). Libraries such as TanStack Query keep this kind of status for you (`pending`, `error`, `success`), which is why they are the usual choice for server data. State machines in more depth are in Advanced patterns (planned).

**Common mistake:** forgetting to clear the old data when a new request starts.

```js
// WRONG: the old error stays around while loading
case 'fetch_started':
  return { ...state, status: 'loading' }

// RIGHT: start from a clean slate
case 'fetch_started':
  return { status: 'loading', user: null, error: null }
```

Why: otherwise a stale error or user can show next to the "Loading..." message.

## 14. Testing a reducer

Because a reducer is a pure function, it is the easiest code in a React app to test. There is no rendering, no DOM, no mocks and no `act`. You call a function and check what it returns.

First move the `tasksReducer` function from section 5 into its own file, `tasksReducer.js`, and add the word `export` in front of it (`export function tasksReducer(tasks, action) { ... }`). The function body does not change. Then `TaskApp.jsx` imports it, and so can a test.

Here is the test, written for Vitest (the same style works in Jest):

```js
// tasksReducer.test.js
import { describe, it, expect } from 'vitest'
import { tasksReducer } from './tasksReducer.js'

// Freezes an object and everything inside it. Changing a frozen object throws.
function deepFreeze(value) {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

const milk = { id: 1, text: 'Buy milk', done: false }
const dog = { id: 2, text: 'Walk dog', done: true }

describe('tasksReducer', () => {
  it('adds a task at the end', () => {
    const before = deepFreeze([milk])
    const after = tasksReducer(before, { type: 'add', id: 2, text: 'Walk dog' })
    expect(after).toEqual([milk, { id: 2, text: 'Walk dog', done: false }])
  })

  it('toggles only the task with that id', () => {
    const before = deepFreeze([milk, dog])
    const after = tasksReducer(before, { type: 'toggle', id: 1 })
    expect(after[0].done).toBe(true)
    expect(after[1]).toBe(dog) // untouched items are the very same object
  })

  it('removes a task', () => {
    const before = deepFreeze([milk, dog])
    expect(tasksReducer(before, { type: 'remove', id: 1 })).toEqual([dog])
  })

  it('clears finished tasks', () => {
    const before = deepFreeze([milk, dog])
    expect(tasksReducer(before, { type: 'clear_done' })).toEqual([milk])
  })

  it('never changes the old state', () => {
    const before = deepFreeze([milk, dog])
    const after = tasksReducer(before, { type: 'add', id: 3, text: 'x' })
    expect(after).not.toBe(before)
    expect(before).toHaveLength(2)
  })

  it('replays a list of actions', () => {
    const actions = [
      { type: 'add', id: 1, text: 'A' },
      { type: 'add', id: 2, text: 'B' },
      { type: 'toggle', id: 1 },
      { type: 'clear_done' },
    ]
    expect(actions.reduce(tasksReducer, [])).toEqual([{ id: 2, text: 'B', done: false }])
  })

  it('throws for an unknown action', () => {
    expect(() => tasksReducer([], { type: 'explode' })).toThrow('Unknown action: explode')
  })
})
```

All seven tests pass in the practice app's Vitest 5 setup.

**What happens, step by step:**
1. Each test builds a starting state and calls the reducer directly, like any function.
2. `deepFreeze` locks the starting state. Test files are ES modules, which run in strict mode. In strict mode, changing a frozen object throws a `TypeError`. So a reducer that mutates fails the test loudly. We tried it: `tasks.push(...)` on a frozen array throws `TypeError: Cannot add property 0, object is not extensible`.
3. `expect(after[1]).toBe(dog)` checks that items you did not change are the *same objects*. This proves you copy only what changes.
4. The "replay" test feeds a whole list of actions to `reduce`, exactly like section 1. This is also a handy way to reproduce a bug: record the actions a user sent, then replay them in a test.
5. The last test checks the `default` case, so a typo in an action name is caught.

You can also test the screen with Testing Library, to check that buttons and reducer are wired together. Keep the many rule-by-rule checks at the reducer level, where they are fast and simple. See [Testing React](../04-advanced/08-testing-react.md).

**Common mistake:** testing only through the UI.

```text
WRONG: render the whole app and click through 12 situations to test 12 reducer rules
RIGHT: 12 one-line reducer tests, plus 1 or 2 UI tests for the wiring
```

Why: UI tests are slower and break for unrelated reasons, such as a renamed button.

## 15. Redux: the same idea with a store around it

If you understand `useReducer`, you already know most of Redux. Redux is built on the same four ideas: a **reducer** `(state, action) => newState`, **actions** that describe what happened, a **dispatch** function, and **immutable, pure** updates.

What Redux adds is a **store**: one object, outside React, that holds the state and a list of listeners. Here is a tiny version, using the counter reducer from section 2:

```js
function counterReducer(count, action) {
  switch (action.type) {
    case 'increment':
      return count + 1
    case 'decrement':
      return count - 1
    default:
      return count
  }
}

function createMiniStore(reducer, initialState) {
  let state = initialState
  const listeners = new Set()

  return {
    getState: () => state,
    dispatch(action) {
      state = reducer(state, action)
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

const store = createMiniStore(counterReducer, 0)
const unsubscribe = store.subscribe(() => console.log('state is now', store.getState()))

store.dispatch({ type: 'increment' }) // state is now 1
store.dispatch({ type: 'increment' }) // state is now 2
unsubscribe()
store.dispatch({ type: 'increment' }) // prints nothing, but getState() is 3
```

That is the core of Redux in about 15 lines: keep a state, run the reducer on `dispatch`, tell the listeners. We ran it and it printed `state is now 1` and `state is now 2`, and ended with a state of 3. You can build a fuller version in [Exercise 32: mini Redux store](../practice-app/exercises/react/32-mini-redux-store/README.md).

**What happens, step by step:**
1. `createMiniStore` keeps `state` in a variable that lives outside any component.
2. `dispatch` runs the reducer with the current state and the action, and saves the result.
3. It then calls every subscribed listener. In a real app, the listener tells React to re-render.
4. `subscribe` returns an unsubscribe function, so a component can stop listening when it unmounts.

The real Redux is bigger than this sketch. React-Redux connects a store to components with `useSelector` and `useDispatch` (it uses `useSyncExternalStore` inside; see [Other hooks](09-other-hooks.md)). Here is how the two compare:

| | `useReducer` | Redux (Redux Toolkit) |
|---|---|---|
| Where the state lives | Inside a React component | In a store outside React |
| How others read it | Props, or Context | Any component, with `useSelector` |
| Re-render control | Context consumers re-render on any change | A selector re-renders only when its slice changes |
| Async work | Write it in handlers or effects | Middleware (thunks) is built in |
| Debugging tools | React DevTools | Redux DevTools: every action, time travel |
| Writing updates | Spread and `map` by hand | `createSlice` with Immer, so you can write "mutating" code |

Other differences to know:
- Redux builds a big reducer from small ones (`combineReducers`). Each small reducer must ignore actions it does not know, which is why Redux reducers `return state` in the `default` case.
- The Redux docs now recommend Redux Toolkit for all new code, and treat the old plain `createStore` function as legacy. If you meet hand-written Redux with giant `switch` statements and string constants, that is older style.
- `useReducer` plus Context is sometimes called "Redux-lite". It is a good fit for small and medium shared state, but it is not a full replacement. See the decision guide in [State management](../03-intermediate/06-state-management.md).

**Common mistake:** adding Redux because it is famous.

```text
WRONG: install Redux Toolkit for a modal's open/closed flag
RIGHT: useState for local state, useReducer for local rules, Context or a store only for truly shared state
```

Why: every layer of tooling is code to read and maintain. Choose it when the problem needs it.

## 16. TypeScript teaser: typed actions

In TypeScript you describe the possible actions as a **discriminated union**: a union of object types that all have a `type` field with a different literal value. TypeScript then knows exactly which other fields each action has.

```tsx
import { useReducer } from 'react'

type Task = { id: number; text: string; done: boolean }

type TaskAction =
  | { type: 'add'; id: number; text: string }
  | { type: 'toggle'; id: number }
  | { type: 'remove'; id: number }
  | { type: 'clear_done' }

function tasksReducer(tasks: Task[], action: TaskAction): Task[] {
  switch (action.type) {
    case 'add':
      return [...tasks, { id: action.id, text: action.text, done: false }]
    case 'toggle':
      return tasks.map((task) =>
        task.id === action.id ? { ...task, done: !task.done } : task,
      )
    case 'remove':
      return tasks.filter((task) => task.id !== action.id)
    case 'clear_done':
      return tasks.filter((task) => !task.done)
    default: {
      const unreachable: never = action
      throw new Error(`Unknown action: ${JSON.stringify(unreachable)}`)
    }
  }
}

const initialTasks: Task[] = []

export function Example() {
  const [tasks, dispatch] = useReducer(tasksReducer, initialTasks)

  function handleAdd() {
    dispatch({ type: 'add', id: 1, text: 'Buy milk' }) // OK
    // dispatch({ type: 'add', id: 1 })                // error: 'text' is missing
    // dispatch({ type: 'toggel', id: 1 })             // error: not a valid action type
  }

  return <button onClick={handleAdd}>{tasks.length} tasks</button>
}
```

What TypeScript gives you:
1. **Narrowing.** Inside `case 'add'`, TypeScript knows `action` has `id` and `text`. Inside `case 'toggle'` it knows only `id`.
2. **Typo and missing-field errors** at the `dispatch` call, before you run anything.
3. **Exhaustive checking.** In `default`, every action type has already been handled, so `action` has the type `never`. If you add a new action to the union and forget its `case`, `action` is no longer `never` there, and the line `const unreachable: never = action` becomes a compile error.
4. **Inference.** You do not usually write generic arguments. `useReducer` works out the state and action types from the reducer function.

The full TypeScript lesson is [TypeScript with React](../03-intermediate/08-typescript-with-react.md).

**Common mistake:** typing the action loosely.

```ts
// WRONG: any string is accepted, and nothing says which fields exist
type Action = { type: string; id?: number; text?: string }

// RIGHT: a union with one exact shape per action
type TaskAction = { type: 'toggle'; id: number } | { type: 'clear_done' }
```

Why: with `type: string` and optional fields, TypeScript cannot tell you that `toggle` needs an `id`, so typos and missing fields compile fine.

## How interviewers test this

- **The `useState` versus `useReducer` judgement.** This is the most common question. A strong answer gives concrete reasons (related fields, several kinds of transition, shared rules, testability) and says "start with `useState`". Red flags: "`useReducer` is always better", or "it is only for global state".
- **Purity.** They want to hear why the reducer must be pure, and that StrictMode calls it twice on purpose. Red flags: `fetch`, `Math.random`, `Date.now` or `push` inside a reducer.
- **Machine-coding tasks.** To-do lists, shopping carts, kanban boards, undo and redo, and multi-step forms are classic `useReducer` tasks. They watch for immutable updates, clear action names, a `default` case, and derived values (totals, counts) that are computed instead of stored.
- **Context pairing.** Can you share a reducer with Context? A strong answer splits state and dispatch into two contexts and knows that `dispatch` is stable. Red flag: one context holding a fresh `{ state, dispatch }` object on every render.
- **Async and status.** They check that you keep async work out of the reducer, and that you model loading, success and error as one `status`, not several booleans.
- **Redux and TypeScript links.** Can you map `useReducer` to Redux (store, selectors, middleware, Redux Toolkit with Immer)? In TypeScript shops, can you write discriminated-union actions?

## Interview questions and model answers

### Q1. What is the difference between `useState` and `useReducer`, and when do you pick each? (Easy)
Both hold state and re-render the component when it changes. With `useState` you call a setter with the new value. With `useReducer` you call `dispatch` with an action, and a reducer function works out the next state from the current state and the action. Pick `useState` for simple or independent values such as a toggle or an input's text. Pick `useReducer` when several values change together, when the next state depends on the previous one in several ways, when many handlers apply the same rules, or when you want to unit-test the logic without React. Start with `useState` and move to a reducer when the update logic gets repetitive.

```jsx
const [count, setCount] = useState(0)             // you choose the new value
const [count, dispatch] = useReducer(reducer, 0)  // you describe what happened
```

### Q2. What is a reducer? (Easy)
A reducer is a pure function with the shape `(state, action) => newState`. The name comes from `Array.prototype.reduce`: it combines the result so far with one more item. In React, `useReducer(reducer, initialState)` stores the state, and React calls your reducer with the current state and each dispatched action. The reducer returns the next state. It must not change its inputs and must not have side effects.

```js
function counterReducer(count, action) {
  return action.type === 'increment' ? count + 1 : count
}
```

### Q3. Why must a reducer be pure? What does StrictMode do to it? (Medium)
React runs the reducer while it renders, and rendering must be a repeatable calculation. React may call the reducer more than once, drop a result, or replay an update. In development, StrictMode deliberately calls your reducer twice (and your initial-state function too) to expose impurity. A pure reducer returns the same answer both times, so nothing changes. An impure one shows bugs at once: a reducer that does `nextId++` gives ids 2, 4, 6 instead of 1, 2, 3, and one that does `tasks.push(x)` adds each task twice. This double call happens only in development. Side effects such as ids, timestamps and network calls belong in the handler, and their results travel in the action.

### Q4. Can a reducer be async or call an API? Where does async code go? (Medium)
No. A reducer is synchronous and pure. An `async` reducer returns a Promise, so your state becomes a Promise and `state.count` turns `undefined`. Do the async work in an event handler (or an effect), and dispatch an action for each stage: started, succeeded, failed. The reducer just records the result, usually in a `status` field. Redux handles this with middleware such as thunks, and React 19 has `useActionState` for async form actions. With `useReducer`, the handler is the place.

```jsx
dispatch({ type: 'fetch_started' })
const user = await fetchUser(id)
dispatch({ type: 'fetch_succeeded', user })
```

### Q5. How do you share a reducer's state between components? (Medium)
Call `useReducer` once, in a common parent, and pass `state` and `dispatch` down as props. Or put them in Context so deep children can read them without drilling. The usual pattern uses two contexts, one for the state and one for `dispatch`, plus custom hooks like `useTasks()` and `useTasksDispatch()`. A common trap: two components that each call `useReducer(sameReducer, ...)` do **not** share state. They get two independent copies, and only the logic is shared. The same is true for a custom hook that wraps `useReducer`.

### Q6. Is `dispatch` stable? Why does it matter? (Medium)
Yes. `dispatch` is the same function on every render of that component, like the setter from `useState`. It matters in three places. First, you can put it in an effect's dependency array without making the effect re-run. Second, you can pass it to children without making them re-render. Third, in the Context pattern, a separate dispatch context never changes its value, so components that only send actions do not re-render when the state changes. The ESLint hooks rule knows `dispatch` is stable and does not ask you to list it.

### Q7. How does `useReducer` relate to Redux? (Medium)
It is the same pattern: a pure reducer, actions that describe what happened, `dispatch`, and immutable updates. The differences are about where the state lives and what tooling surrounds it. `useReducer` state belongs to a component and is shared through props or Context. Redux keeps state in a store outside React. Components subscribe to slices with `useSelector`, so only the ones whose slice changed re-render. Redux also gives you middleware for async work and Redux DevTools with time travel. Redux Toolkit's `createSlice` uses Immer, so you can write code that looks like mutation. If you know `useReducer`, Redux is mostly "the same, plus a store and tools".

### Q8. I dispatched an action but the screen did not update. What could be wrong? (Medium)
Check these in order. First, the reducer may have mutated the old state and returned the same object. React compares with `Object.is`, sees the same object, and skips the render. Second, a `case` may be missing its `return`, so the state became `undefined`. Third, the action type may not match any `case`, and a `default` that returns `state` hides the typo. Fourth, `dispatch` may never have run, for example `onClick={dispatch(...)}` without an arrow function. Fifth, the component may be reading a stale copy of the data, such as `useState(props.x)`. The classic one is the first:

```js
// WRONG: same object back, no re-render
state.count++
return state
// RIGHT
return { ...state, count: state.count + 1 }
```

### Q9. What is the third argument of `useReducer`? (Medium)
It is an optional initialiser function. `useReducer(reducer, initialArg, init)` calls `init(initialArg)` once, on the first render, and uses the result as the initial state. It is useful when building the start state is expensive, because `useReducer(reducer, init(arg))` would run `init` on every render and throw the extra results away. We measured this: with the third argument `init` ran once for a first render plus two updates, and with the inline call it ran three times. You can also reuse `init` inside the reducer to implement a `reset` action. The initial value is used only on the first render. Changing the prop later does not reset the state.

### Q10. Why does `state` still show the old value right after `dispatch`? What if I dispatch three times? (Medium)
State is a snapshot of one render. `dispatch` only queues the action and asks React to render. The reducer runs later, inside the next render, so the handler still sees the old state. When you dispatch three times, the three actions are queued and processed in order in one render. Each reducer call receives the result of the previous one. Three `increment` actions add 3. By contrast, `setCount(count + 1)` three times adds 1, because all three use the same stale `count`. The updater form `setCount(c => c + 1)` behaves like dispatch.

### Q11. How do you unit-test a reducer? (Easy)
A reducer is a plain function, so you import it and call it. There is no rendering, no mocks and no `act`. Test each action type with an input state and an expected output state. Test the unknown-action case. Freeze the input with `Object.freeze` (deeply) so that a mutating reducer throws and fails the test. You can feed a list of actions to `reduce` to test a whole sequence, or to replay a bug. Add one or two component tests to check that the buttons are wired to the right actions.

### Q12. How would you model loading, success and error with `useReducer`? (Medium)
Use a single `status` field with the values `idle`, `loading`, `success` and `error`, instead of separate booleans that can contradict each other. Each action moves the state along an allowed path: `fetch_started` goes to `loading` and clears the old data and error, `fetch_succeeded` goes to `success` with the data, `fetch_failed` goes to `error` with the message. The handler does the fetch and dispatches these actions. The reducer can ignore a result that arrives in the wrong status. The screen is then a simple check on `status`. For server data in a real app, a library such as TanStack Query manages this for you.

### Q13. Does `useReducer` plus Context replace Redux? (Hard)
For small and medium apps it often does. You get one source of truth, predictable updates, and no extra dependency. The limits are real, though. Context has no selectors, so every consumer re-renders when any part of the value changes. There are no built-in middleware or DevTools, and you write typed hooks and providers by hand. Signs you have outgrown it: performance problems from frequent updates, many cross-cutting async flows, a need for time-travel debugging, or a stack of nested providers. Then move to Redux Toolkit or a store like Zustand. Also remember that server data (lists from an API) usually belongs in a query library, not in any of these.

### Q14. How do you type a reducer in TypeScript? (Medium)
Describe the actions as a discriminated union: one object type per action, each with a literal `type`. Give the reducer the signature `(state: State, action: Action): State`. TypeScript narrows `action` inside each `case`, so `action.id` is allowed only where the action has an `id`. It also rejects typos and missing fields at `dispatch` calls. Add `const unreachable: never = action` in `default` for an exhaustive check, which fails to compile when a new action has no `case`. `useReducer` infers its types from the reducer, so you rarely write generics.

## Common mistakes and gotchas

- **Mutating state in the reducer** (`push`, `state.x = ...`). Return new objects and arrays with spread, `map` and `filter`.
- **Forgetting `return` in a `case`.** The state becomes `undefined`. Return from every branch.
- **No `default` case, or a `default` that hides typos.** In `useReducer`, throw an error for unknown action types.
- **Side effects in the reducer** (`fetch`, `localStorage`, `Math.random`, `Date.now`, a global counter). Do them in the handler or an effect and send the result in the action.
- **Making the reducer `async`.** It returns a Promise and breaks the state. Do async work in handlers and dispatch the results.
- **Storing derived data** such as totals and counts. Compute them while rendering.
- **Generic setter actions** like `set_value`. Use actions that name what happened, and keep the rules in the reducer.
- **`onClick={dispatch({ ... })}`.** It runs during render. Use `onClick={() => dispatch({ ... })}`.
- **Reading state right after `dispatch`.** It is still the old snapshot. Use the next render, or an effect.
- **Putting the computed result in the action** (`quantity: line.quantity + 1`). Send the id and let the reducer compute from current state.
- **One context with `{ state, dispatch }` created inline.** Use two contexts, or wrap the object in `useMemo`.
- **Expecting two components to share a reducer's state** because they use the same reducer function. Lift the `useReducer` call up, or use Context.
- **Returning a copy when nothing changed.** Return the same `state` so React can skip the work.
- **Passing a second argument to `dispatch`** as a callback. It is not supported. Use `useEffect`.
- **Using `useReducer` for a single boolean.** `useState` is simpler. Keep reducers for real rules.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Predict. What does this print? Work it out step by step before you run it.

   ```js
   function reducer(state, action) {
     switch (action.type) {
       case 'add':
         return state + action.amount
       case 'double':
         return state * 2
       default:
         return state
     }
   }

   const actions = [
     { type: 'add', amount: 3 },
     { type: 'double' },
     { type: 'add', amount: 1 },
     { type: 'unknown' },
   ]

   console.log(actions.reduce(reducer, 0))
   ```

<details>
<summary>Show answer</summary>

It prints `7`. Step by step: start at `0`. `add 3` gives `3`. `double` gives `6`. `add 1` gives `7`. The `unknown` action reaches `default`, which returns the state unchanged, so the result stays `7`. We ran it and got `7`.

In a `useReducer` reducer you would normally *throw* in the `default` case instead, so that a typo in an action name is not silently ignored.

</details>

2. **(Easy)** Code. This step counter uses two `useState` calls. Convert it to a single `useReducer` with the actions `increment`, `decrement`, `set_step` and `reset`. Reset puts the count back to 0 and the step back to 1.

   ```jsx
   import { useState } from 'react'

   export default function StepCounter() {
     const [count, setCount] = useState(0)
     const [step, setStep] = useState(1)

     return (
       <div>
         <p>Count: {count}</p>
         <label>
           Step
           <input type="number" value={step} onChange={(e) => setStep(Number(e.target.value))} />
         </label>
         <button onClick={() => setCount(count + step)}>Add step</button>
         <button onClick={() => setCount(count - step)}>Subtract step</button>
         <button
           onClick={() => {
             setCount(0)
             setStep(1)
           }}
         >
           Reset
         </button>
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

```jsx
import { useReducer } from 'react'

function stepReducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step }
    case 'decrement':
      return { ...state, count: state.count - state.step }
    case 'set_step':
      return { ...state, step: action.step }
    case 'reset':
      return { count: 0, step: 1 }
    default:
      throw new Error(`Unknown action: ${action.type}`)
  }
}

export default function StepCounter() {
  const [state, dispatch] = useReducer(stepReducer, { count: 0, step: 1 })

  return (
    <div>
      <p>Count: {state.count}</p>
      <label>
        Step
        <input
          type="number"
          value={state.step}
          onChange={(e) => dispatch({ type: 'set_step', step: Number(e.target.value) })}
        />
      </label>
      <button onClick={() => dispatch({ type: 'increment' })}>Add step</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>Subtract step</button>
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
    </div>
  )
}
```

Notice that the reducer reads `state.step` itself, so the buttons do not need to send it. Reset no longer has to remember two setters: it returns one fresh object. We ran both versions through the same steps (set the step to 5, add twice, subtract once, then reset) and they behave the same.

The `set_step` action is an honest, small setter. That is acceptable here because the input really does "set a value". Just avoid turning *every* action into a setter.

</details>

3. **(Easy)** Predict and explain. A counter's reducer is written like this. The component shows `state.count`, has a "+1" button that dispatches `{ type: 'increment' }`, and a "Redraw" button that only updates an unrelated `useState`. What does the screen show after clicking "+1" once, and after then clicking "Redraw"? What changes if the component is inside `<StrictMode>`? How do you fix it?

   ```js
   function brokenCounterReducer(state, action) {
     if (action.type === 'increment') {
       state.count++
       return state
     }
     return state
   }
   ```

<details>
<summary>Show answer</summary>

Without StrictMode: after "+1" the screen still says `Count: 0`. After "Redraw" it says `Count: 1`. Inside `<StrictMode>`: after "+1" it still says `Count: 0`, but after "Redraw" it says `Count: 2`. We ran all four cases.

Why: the reducer changes the old object and returns the same object. React compares old and new state with `Object.is`, sees they are identical, and skips the re-render, so the click appears to do nothing. The data did change, so the next unrelated render shows it. In StrictMode the reducer runs twice on the same object, so `count++` happens twice and the number jumps by 2.

Fix: return a new object and leave the old one alone.

```js
function counterReducer(state, action) {
  if (action.type === 'increment') {
    return { ...state, count: state.count + 1 }
  }
  return state
}
```

</details>

4. **(Medium)** Code. Add an `edit` action to `tasksReducer` from section 5. It changes the text of one task: `{ type: 'edit', id, text }`. Write tests that prove three things: the right task changes, an unknown id changes nothing, and the old state is not mutated.

<details>
<summary>Show answer</summary>

Add this case to the reducer:

```js
case 'edit':
  return tasks.map((task) =>
    task.id === action.id ? { ...task, text: action.text } : task,
  )
```

Then the tests (using the `deepFreeze` helper from section 14):

```js
import { describe, it, expect } from 'vitest'
import { tasksReducer } from './tasksReducer.js'

// deepFreeze as in section 14

describe('edit action', () => {
  const before = deepFreeze([
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Walk dog', done: true },
  ])

  it('changes the text of the matching task only', () => {
    const after = tasksReducer(before, { type: 'edit', id: 1, text: 'Buy oat milk' })
    expect(after[0]).toEqual({ id: 1, text: 'Buy oat milk', done: false })
    expect(after[1]).toBe(before[1]) // the other task is the same object
  })

  it('leaves the list equal when the id is unknown', () => {
    expect(tasksReducer(before, { type: 'edit', id: 99, text: 'x' })).toEqual(before)
  })

  it('does not mutate the old state', () => {
    tasksReducer(before, { type: 'edit', id: 1, text: 'Changed' })
    expect(before[0].text).toBe('Buy milk')
  })
})
```

Because `before` is deeply frozen, a reducer that wrote `task.text = action.text` would throw a `TypeError` and fail the tests. We ran these checks against a reducer with this `edit` case, and they pass.

</details>

5. **(Medium)** Predict. After ONE click on this button, what does it show? How many times does the component render because of that click?

   ```jsx
   import { useReducer, useState } from 'react'

   function reducer(count, action) {
     return action.type === 'add_one' ? count + 1 : count
   }

   export default function Demo() {
     const [viaReducer, dispatch] = useReducer(reducer, 0)
     const [viaState, setViaState] = useState(0)

     function handleClick() {
       dispatch({ type: 'add_one' })
       dispatch({ type: 'add_one' })
       dispatch({ type: 'add_one' })

       setViaState(viaState + 1)
       setViaState(viaState + 1)
       setViaState(viaState + 1)
     }

     return (
       <button onClick={handleClick}>
         reducer: {viaReducer}, state: {viaState}
       </button>
     )
   }
   ```

<details>
<summary>Show answer</summary>

The button shows `reducer: 3, state: 1`, and the click causes one render. We ran it.

The three `dispatch` calls are queued. In the next render React runs the reducer three times in a row: `0 -> 1 -> 2 -> 3`. Each call receives the result of the previous one. The three `setViaState(viaState + 1)` calls all use the same snapshot value `viaState = 0`, so each one says "set it to 1". The result is 1. All six updates are batched into one render.

The fix for the `useState` version is the updater form: `setViaState((n) => n + 1)`. A dispatched action behaves like an updater.

</details>

6. **(Medium)** Predict and fix. This reducer creates the id. You click "Add" three times. Which ids do you see without StrictMode, and which inside `<StrictMode>`? Why? How do you fix it?

   ```js
   let nextId = 1

   function tasksReducer(tasks, action) {
     if (action.type === 'add') {
       return [...tasks, { id: nextId++, text: action.text }]
     }
     return tasks
   }
   ```

<details>
<summary>Show answer</summary>

Without StrictMode the ids are `1,2,3`. Inside StrictMode they are `2,4,6`. We ran both.

The reducer is impure: it reads and changes the outside variable `nextId`. In development StrictMode calls every reducer twice, and each call used up one id. React keeps one result and drops the other, so the numbers skip.

Fix: create the id in the event handler, which runs once per click and may have side effects, and send it in the action. The reducer then becomes pure.

```js
// in the handler
dispatch({ type: 'add', id: nextId++, text })

// in the reducer
return [...tasks, { id: action.id, text: action.text }]
```

Now, however many times React calls the reducer, the same action gives the same result.

</details>

7. **(Medium)** Explain. For each job, say where it belongs: in the **reducer**, in an **event handler**, in an **effect**, or computed **during render**. Give one reason each.
   - (a) Make a unique id for a new task.
   - (b) Work out the cart total.
   - (c) Send the order to the server.
   - (d) Save the cart to `localStorage` every time it changes.
   - (e) Decide the new quantity after a "decrement" click.
   - (f) Show a "Task added" message after dispatching.

<details>
<summary>Show answer</summary>

- (a) **Event handler.** Ids are unpredictable, so they cannot be made in a pure reducer. Make the id in the handler and send it in the action.
- (b) **During render.** The total is derived data. Compute it from the state with a helper like `getTotal(cart)`. Do not store it.
- (c) **Event handler.** It is async and talks to the outside world. The handler sends the request and dispatches `order_started`, `order_succeeded` and `order_failed`.
- (d) **Effect.** Saving is a side effect that should follow the state, whatever caused the change: `useEffect(() => { localStorage.setItem(...) }, [cart])`. The reducer must not write to storage.
- (e) **Reducer.** It is a pure rule that turns the current state and an action into the next state. The reducer has the latest quantity, so it should do the subtraction.
- (f) **Event handler** (or an effect that watches a value). Showing a message is a side effect on the outside world. If you set a flag in state, show the message while rendering from that flag.

</details>

8. **(Medium)** Code. Build a "Load joke" component with a status reducer. States: `idle`, `loading`, `success` (holds the joke) and `error` (holds a message). The button says "Load joke", and says "Retry" after an error. It is disabled while loading. Use this pretend server function, which fails on the first call and succeeds after that:

   ```js
   let attempts = 0

   function fakeFetchJoke() {
     attempts++
     return new Promise((resolve, reject) => {
       setTimeout(() => {
         if (attempts === 1) reject(new Error('Network down'))
         else resolve('Why did the hook cross the road? To get to the other render.')
       }, 300)
     })
   }
   ```

<details>
<summary>Show answer</summary>

```jsx
import { useReducer } from 'react'

const initialJoke = { status: 'idle', joke: null, error: null }

function jokeReducer(state, action) {
  switch (action.type) {
    case 'started':
      return { status: 'loading', joke: null, error: null }
    case 'succeeded':
      return state.status === 'loading'
        ? { status: 'success', joke: action.joke, error: null }
        : state
    case 'failed':
      return state.status === 'loading'
        ? { status: 'error', joke: null, error: action.message }
        : state
    default:
      throw new Error(`Unknown action: ${action.type}`)
  }
}

export default function JokeLoader() {
  const [state, dispatch] = useReducer(jokeReducer, initialJoke)

  async function load() {
    dispatch({ type: 'started' })
    try {
      dispatch({ type: 'succeeded', joke: await fakeFetchJoke() })
    } catch (error) {
      dispatch({ type: 'failed', message: error.message })
    }
  }

  return (
    <div>
      <button onClick={load} disabled={state.status === 'loading'}>
        {state.status === 'error' ? 'Retry' : 'Load joke'}
      </button>
      {state.status === 'loading' && <p>Loading...</p>}
      {state.status === 'success' && <p>{state.joke}</p>}
      {state.status === 'error' && <p role="alert">{state.error}</p>}
    </div>
  )
}
```

We ran it with fake timers: the first click shows "Loading..." and then the alert "Network down", the button reads "Retry", and the second click ends with the joke on the screen.

The handler does the async work. The reducer only records `started`, `succeeded` and `failed`, and it ignores a result that arrives when the status is not `loading`.

</details>

9. **(Hard)** Predict. Take the `TasksProvider`, `AddTask`, `ClearButton` and `TaskList` from section 11 and put a render counter in each of the three components (for example `renders.AddTask++` at the top of the function). Click "Add task" twice (no StrictMode). How many times has each component rendered? Then replace the two contexts with ONE context whose value is `useMemo(() => ({ tasks, dispatch }), [tasks])`. What are the counts now, and why?

<details>
<summary>Show answer</summary>

Two contexts: `AddTask` 1, `ClearButton` 1, `TaskList` 3. One combined context: `AddTask` 3, `ClearButton` 3, `TaskList` 3. We measured both.

With two contexts, `AddTask` and `ClearButton` read only the dispatch context. Its value is the stable `dispatch` function, which never changes. They render once on mount and never again. `TaskList` reads the tasks context, whose value changes on each add. It renders once on mount and once for each of the two clicks, which makes 3.

With one combined object, the value is a new object whenever `tasks` changes. `useMemo` cannot help, because `tasks` really did change. Every component that reads that context re-renders, including the two that only wanted `dispatch`. They render on mount and after each click, which makes 3.

The lesson: split contexts by how often they change. Put the stable things (dispatch) apart from the changing things (state).

</details>

10. **(Hard)** Code. Write a higher-order reducer `undoable(reducer, initialPresent)` that adds undo and redo to any reducer. It returns `[undoableReducer, initialState]`. The state shape is `{ past: [], present, future: [] }`. Rules: the `undo` action moves the last item of `past` into `present` and the old present to the front of `future`. `redo` does the opposite. Every other action goes to the inner reducer. If it changes the present, push the old present onto `past` and clear `future`. If it does not change it, return the same state. Undo with an empty `past` returns the same state.

<details>
<summary>Show answer</summary>

```js
function undoable(reducer, initialPresent) {
  const initial = { past: [], present: initialPresent, future: [] }

  function undoableReducer(state, action) {
    const { past, present, future } = state
    switch (action.type) {
      case 'undo':
        if (past.length === 0) return state
        return {
          past: past.slice(0, -1),
          present: past[past.length - 1],
          future: [present, ...future],
        }
      case 'redo':
        if (future.length === 0) return state
        return {
          past: [...past, present],
          present: future[0],
          future: future.slice(1),
        }
      default: {
        const next = reducer(present, action)
        if (next === present) return state
        return { past: [...past, present], present: next, future: [] }
      }
    }
  }

  return [undoableReducer, initial]
}
```

Use it with the `counterReducer` from section 2:

```jsx
const [reducer, initial] = undoable(counterReducer, 0)

function App() {
  const [state, dispatch] = useReducer(reducer, initial)
  return (
    <div>
      <p>Count: {state.present}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+1</button>
      <button onClick={() => dispatch({ type: 'undo' })} disabled={state.past.length === 0}>
        Undo
      </button>
      <button onClick={() => dispatch({ type: 'redo' })} disabled={state.future.length === 0}>
        Redo
      </button>
    </div>
  )
}
```

We ran it. Two increments, one undo and one redo behave as expected, and the sequence "increment, increment, undo, decrement" ends with `{"past":[0,1],"present":0,"future":[]}`: the new action cleared the redo history.

This works because a reducer is just a function: you can wrap one reducer in another. No history logic was added to the counter reducer. Try the full version in [Exercise 26: undo and redo](../practice-app/exercises/react/26-undo-redo-hook/README.md).

</details>

11. **(Hard)** Explain. Your team keeps all app state in one big `useReducer` behind a single Context. Users say that typing in a search box feels slow. What is probably happening, and what would you do, in order?

<details>
<summary>Show answer</summary>

Probably the search text is stored in that global state. Every keystroke dispatches an action, which creates a new state object. Every component that reads the context re-renders on every keystroke, including large parts of the page that do not care about the search text. Context has no selectors, so a component cannot ask for only one slice.

What I would do, in order:
1. **Measure first** with the React DevTools Profiler, to see which components render on each keystroke.
2. **Keep fast-changing UI state local.** The text of an input belongs in `useState` inside the search component (or a small parent), and only the committed search term goes to global state.
3. **Split the big state** into several providers by topic, and keep state and dispatch apart, so components subscribe only to what they need.
4. **Reduce the cost of the renders** that remain, with composition tricks (pass children from above) or `React.memo` on heavy parts. See [Memoization](07-memoization.md). A transition or `useDeferredValue` can also keep typing responsive.
5. **If it is still not enough**, move the shared state to a store with selectors (Redux Toolkit or Zustand), where a component re-renders only when its own slice changes.

Rewriting the whole state layer should be the last step, not the first.

</details>

## Recap

- A reducer is a pure function `(state, action) => newState`. `useReducer(reducer, initialState)` returns `[state, dispatch]`.
- `dispatch(action)` does not run the reducer at once. React runs it during the next render. Actions queue up, each sees the result of the one before, and `dispatch` has a stable identity.
- Actions describe what happened (`type` plus data). Use a `switch`, return from every case, and throw in `default` so typos are loud.
- Never mutate. Build new objects and arrays (spread, `map`, `filter`). If nothing changes, return the same `state`.
- Keep the reducer pure: no `fetch`, no random values or time, no storage writes. StrictMode calls it twice in development to catch this. Make ids and timestamps in the handler and send them in the action.
- Do not store what you can compute. Pass the init function as the third argument when the start state is expensive.
- Choose `useReducer` for linked fields, several kinds of transition and testable rules. Choose `useState` for simple values. Share a reducer with two contexts (state and dispatch). Do async work in handlers and model loading, success and error with one `status`.
- Test a reducer as a plain function. It is the same idea as Redux, which adds a store, selectors, middleware and DevTools. In TypeScript, type actions as a discriminated union.

## Where to go next

- Next lesson: [Memoization](07-memoization.md), to control extra renders.
- Practice with real tasks: [Exercise 19: shopping cart with a reducer](../practice-app/exercises/react/19-shopping-cart-reducer/README.md), [Exercise 25: kanban board](../practice-app/exercises/react/25-kanban-board/README.md), [Exercise 26: undo and redo](../practice-app/exercises/react/26-undo-redo-hook/README.md) and [Exercise 32: mini Redux store](../practice-app/exercises/react/32-mini-redux-store/README.md).
- Compare the options for app-wide state: [State management](../03-intermediate/06-state-management.md).
- Type your reducers: [TypeScript with React](../03-intermediate/08-typescript-with-react.md).
- Learn the testing tools: [Testing React](../04-advanced/08-testing-react.md).
- See the async cousin of reducers: [React 19 and newer](../04-advanced/04-react-19-and-newer.md) (`useActionState`).
- Quiz yourself: Round 1 hooks questions (planned) and Round 2 hooks questions (planned).
- Revise on one page: Hooks cheatsheet (planned).
