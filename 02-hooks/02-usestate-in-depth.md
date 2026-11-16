# useState in Depth

> **Level:** Beginner   **Time:** about 55 minutes   **Read first:** [State and events](../01-basics/05-state-and-events.md), [Hooks overview and rules](01-hooks-overview-and-rules.md)

## What you will learn
- Explain what `useState` returns and what really happens when you call the setter (a queue of updates, then one render).
- Choose between `setX(value)` and `setX(prev => next)`, and predict the result of several updates in one handler.
- Explain automatic batching and why state looks "one step behind" inside a handler, so you can answer "is `setState` synchronous?" with confidence.
- Use lazy initial state, and predict what happens when you set the same value.
- Update objects and arrays immutably (add, remove, update, insert, replace, reorder), and know when Immer or normalised state helps.
- Fix stale state in timers and async code, design clean state, avoid copying props into state, reset state with `key`, and choose between state, a ref and a plain variable.

## 1. What `useState` gives you

You used `useState` in [State and events](../01-basics/05-state-and-events.md). This lesson opens the box. Most state bugs, and most interview questions, live in the details.

```jsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
}
```

Think of state as a **slot** that React keeps for this one component instance, outside your function. Your function runs many times. The slot stays. Each `useState` call gets its own slot, and React finds the right slot by the **order** of the calls. That is why hooks cannot be called inside `if` or loops (see [Hooks overview and rules](01-hooks-overview-and-rules.md)).

Facts to know (we checked these by running code on React 19.3.1):

- `useState(initialValue)` returns an array with exactly two items: the current value and a setter function.
- The initial value is used **only on the first render**. We rendered a component with `start={10}`, clicked once, then re-rendered it with `start={99}`. The screen showed 11, not 100.
- The setter has the **same identity on every render** of the same component instance (we compared it over 3 renders). That is why the React lint rule does not ask you to list it in dependency arrays.
- The setter **returns `undefined`**. There is nothing to wait for and no new value to read from it.
- The setter **replaces** the state. It does not merge. (The old class `this.setState` did merge. Hooks do not.)
- The setter takes **one** argument. The old class form `setState(value, callback)` does not exist. If you pass a second argument, React logs a warning that it is not supported, and the callback never runs. To run code after a render, use an effect ([useEffect](03-useeffect.md)).

**What happens, step by step:**
1. First render: React sees the first `useState` call, creates a slot, stores `0` in it, and returns `[0, setCount]`.
2. The user clicks. `setCount(1)` puts an update in that slot's queue and asks React to render.
3. React runs the queue (the stored `0` becomes `1`), saves `1` in the slot, and calls `Counter()` again.
4. This time `useState(0)` ignores its argument and returns `[1, setCount]`. The button says "Clicked 1 times".

**Common mistake:** expecting the setter to merge, like the old class `setState`.

```jsx
const [user, setUser] = useState({ name: 'Ada', age: 30 })

// WRONG: the state is now { age: 31 }. The name is gone.
setUser({ age: 31 })

// RIGHT: copy the old fields, then replace the one you change
setUser({ ...user, age: 31 })
```

Why: the setter swaps the whole value. We ran the wrong version and the state printed as `{"age":31}`.

## 2. Two ways to call the setter: a value or an updater

```jsx
setCount(5)             // a value: "make it 5"
setCount((c) => c + 1)  // an updater function: "take the latest count and add 1"
```

React does not apply an update the moment you call the setter. It puts the update in a **queue**. When your handler finishes, React walks the queue from first to last, starting from the value it has stored, and the result is the next state.

- A **value** in the queue means: forget everything so far, the state is now this.
- An **updater** in the queue means: take everything so far and change it.

```jsx
function handleClick() {
  setCount(10)            // queue: [replace with 10]
  setCount((c) => c * 2)  // queue: [replace with 10, double it]
}
```

Starting from 0, the screen shows **20** after one click (checked).

**What happens, step by step:**
1. The click runs `handleClick`. `setCount(10)` adds "replace with 10" to the queue. Nothing renders yet, and `count` inside the handler is still 0.
2. `setCount(c => c * 2)` adds "double it". Still no render.
3. The handler ends. React processes the queue: 0, then 10, then 20.
4. React calls the component once, with `count` equal to 20.

Rules for an updater function:
- It receives one argument: the **latest** state, including the effect of earlier updates in the queue.
- It must **return** the next state.
- It must be **pure**: no side effects, no changing its argument, no calling other setters.
- Name the parameter after the state: `c` for `count`, `prev`, or `prevCount`.

**Common mistake:**

```jsx
// WRONG: braces without return, so the function returns undefined
setCount((c) => { c + 1 })

// RIGHT
setCount((c) => c + 1)
```

Why: an arrow function with braces needs an explicit `return`. Without it the next state is `undefined`.

## 3. The snapshot quiz: predict, then check

You met the **snapshot** idea in the last lesson: inside one render, `count` is a fixed number. Handlers made in that render all see that same number. Now use it with the queue.

In every case below, `number` starts at `0` (`const [number, setNumber] = useState(0)`) and the handler runs once. Predict the result before you read the table.

```jsx
// Quiz 1
setNumber(number + 1)
setNumber(number + 1)
setNumber(number + 1)

// Quiz 2
setNumber((n) => n + 1)
setNumber((n) => n + 1)
setNumber((n) => n + 1)

// Quiz 3
setNumber(number + 5)
setNumber((n) => n + 1)

// Quiz 4
setNumber(number + 5)
setNumber((n) => n + 1)
setNumber(42)

// Quiz 5
setNumber((n) => n + 1)
setNumber(42)
setNumber((n) => n + 1)
```

| Quiz | Queue after the handler | Result |
|---|---|---|
| 1 | replace with 1, replace with 1, replace with 1 | **1** |
| 2 | add 1, add 1, add 1 | **3** |
| 3 | replace with 5, add 1 | **6** |
| 4 | replace with 5, add 1, replace with 42 | **42** |
| 5 | add 1, replace with 42, add 1 | **43** |

We ran all five. The first click in each caused exactly **one** render. A second click starts from the new value: quiz 1 goes 1 then 2, quiz 2 goes 3 then 6.

**What happens, step by step (quiz 3):**
1. React renders with `number` equal to 0. The click handler is created in that render, so it sees `number` as 0.
2. `setNumber(number + 5)` is really `setNumber(0 + 5)`. The queue is: replace with 5.
3. `setNumber(n => n + 1)` adds a second item. The queue is: replace with 5, add 1.
4. The handler ends. React runs the queue: 0, then 5, then 6.
5. React renders once with `number` equal to 6.

The rule to remember: **a plain value throws away everything before it. An updater builds on everything before it.** In quiz 1, `number` is 0 for the whole handler. It never becomes 1 inside it, so all three lines mean "replace with 1".

The same idea explains the old question about `console.log`:

```jsx
function handleClick() {
  setCount(count + 1)
  console.log(count) // prints the OLD count, because this code belongs to the old render
}
```

We clicked twice and the log showed `0` then `1`, while the screen showed 2. If you need the new value right now, calculate it first and use your variable:

```jsx
function handleClick() {
  const next = count + 1
  setCount(next)
  console.log(next) // the value you just asked for
}
```

**Common mistake:**

```jsx
// WRONG: expects +3, gets +1
setNumber(number + 1)
setNumber(number + 1)
setNumber(number + 1)

// RIGHT: each call builds on the one before
setNumber((n) => n + 1)
setNumber((n) => n + 1)
setNumber((n) => n + 1)
```

Why: with a number you reuse one old snapshot. With a function React passes the latest value each time.

## 4. When an updater function is required

"Required" means the code is wrong without it. These are the cases.

**1. Several updates to the same state in one event.** You saw this in the quiz.

**2. Code that runs later than the render it was created in.** Timers, intervals, promise callbacks and anything after an `await` hold an old snapshot. Here is a "like" button that saves to a server first:

```jsx
import { useState } from 'react'

export default function LikeButton({ saveToServer }) {
  const [likes, setLikes] = useState(0)

  async function handleClick() {
    await saveToServer()
    setLikes(likes + 1) // BUG: `likes` is from the render where the click happened
  }

  return <button onClick={handleClick}>Likes: {likes}</button>
}
```

**What happens, step by step:**
1. The user clicks twice quickly, before the first save has finished. Both clicks happen in the render where `likes` is 0, so both handlers hold `likes = 0`.
2. The first save finishes. It runs `setLikes(0 + 1)`.
3. The second save finishes. It runs `setLikes(0 + 1)` too.
4. The screen shows **1** instead of 2. We ran it: with the plain value the button reads `Likes: 1`. With `setLikes((l) => l + 1)` it reads `Likes: 2`.

**3. Callbacks you create once and keep.** An effect with an empty dependency array, or a `useCallback(..., [])` function, never sees newer values. Section 10 shows the classic stuck interval.

**4. Reusable code that cannot know the latest value.** A toggle inside a custom hook is a good example:

```jsx
import { useCallback, useState } from 'react'

function useToggle(initial = false) {
  const [on, setOn] = useState(initial)
  const toggle = useCallback(() => setOn((o) => !o), [])
  return [on, toggle]
}
```

`toggle` reads no state, so it can stay the same function forever. The updater supplies the latest value.

**When a plain value is fine:** when the new value does not depend on the old one. `setName(e.target.value)`, `setOpen(false)` and `setCount(0)` are all fine. A single `setCount(count + 1)` in a click handler is fine too. If you are unsure, the updater form is always safe.

**Updaters must be pure.** In development, `<StrictMode>` (the Vite template turns it on) calls every updater **twice** to catch impure ones. We counted: one click ran the updater 1 time without StrictMode and 2 times with it. The second result is thrown away.

**Common mistake:**

```jsx
// WRONG: a side effect inside an updater runs twice in development
setCount((c) => {
  sendAnalytics('increment')
  return c + 1
})

// RIGHT: side effects go in the handler, outside the updater
sendAnalytics('increment')
setCount((c) => c + 1)
```

Why: React may call an updater more than once, so it must only calculate.

## 5. Batching: many updates, one render

**Batching** means React collects the updates from one event and renders once. It avoids wasted renders and half-finished screens.

```jsx
import { useState } from 'react'

export default function Scoreboard() {
  const [home, setHome] = useState(0)
  const [away, setAway] = useState(0)
  console.log(`render ${home}-${away}`)

  function bump() {
    setHome((h) => h + 1)
    setAway((a) => a + 1)
  }

  return <button onClick={bump}>{home}-{away}</button>
}
```

```text
render 0-0
render 1-1
```

There is never a `render 1-0`. Two updates, one render.

**What happens, step by step:**
1. The click runs `bump`. `setHome` adds an update to the `home` queue. `setAway` adds one to the `away` queue. Neither renders.
2. The handler ends. React sees pending updates and renders `Scoreboard` once, applying both queues.
3. One render logs `render 1-1`, and the DOM is updated once.

**Automatic batching (React 18 and newer).** Before React 18, only updates inside React event handlers were batched. An update in a `setTimeout` or a promise rendered once per setter call. Since React 18 (and in React 19), React batches **everywhere**. We ran the same `Scoreboard` and counted the renders after one action:

| Where the two updates happen | Renders |
|---|---|
| `onClick={bump}` (a React event handler) | 1 |
| `setTimeout(bump, 0)` | 1 |
| `Promise.resolve().then(bump)` | 1 |
| `bump` called from a native `addEventListener` callback | 1 |
| one update now, one inside a `setTimeout` of 10 ms | 2 |
| one update before and one after `await null` in a click handler | 2 |
| each update wrapped in `flushSync` | 2 |

The last three rows used this code:

```jsx
// one now, one after a 10 ms wait
setHome((h) => h + 1)
setTimeout(() => setAway((a) => a + 1), 10)

// one before and one after an await (inside an async click handler)
setHome((h) => h + 1)
await null
setAway((a) => a + 1)

// each one forced through at once (import { flushSync } from 'react-dom')
flushSync(() => setHome((h) => h + 1))
flushSync(() => setAway((a) => a + 1))
```

Read those three rows carefully:
- Updates separated by a real wait are different batches, because React has already rendered the first one.
- Code after an `await` is no longer inside the click, so it starts a new batch.
- `flushSync` (from `react-dom`) is the opt-out: it forces React to update the DOM right now. It is rare. Use it only when you must measure or scroll to the result immediately.

**Is `setState` synchronous?** The call itself returns at once, but it does not change anything you can see. The state changes when React next renders, which is after your handler finishes. For a click that happens straight after the handler. For other sources, like a timer, it happens a moment later. We checked: reading the DOM right after `setMessage('Saved')` still showed the old text `Draft`, and after the handler the DOM showed `Saved`. So the best short answer is: **updates are queued and batched, and the running code keeps its snapshot.** "Asynchronous" is a loose word for that. There is no promise to await.

**Common mistake:**

```jsx
// WRONG: the DOM has not changed yet when this line runs
setMessage('Saved')
console.log(document.getElementById('status').textContent) // still the old text

// RIGHT: work with the value you already have, or react in an effect
const next = 'Saved'
setMessage(next)
console.log(next)
```

Why: the screen is updated after the handler, not during it.

## 6. Lazy initial state

The argument to `useState` is used only on the first render. But JavaScript still **evaluates** it on every render. If it is expensive, you pay for nothing.

```jsx
import { useState } from 'react'

function readNotes() {
  return JSON.parse(localStorage.getItem('notes') ?? '[]') // parsing on every render is wasteful
}

function EagerNotes() {
  const [notes] = useState(readNotes()) // BAD: readNotes runs on EVERY render
  const [clicks, setClicks] = useState(0)
  return <button onClick={() => setClicks(clicks + 1)}>{notes.length} notes, {clicks} clicks</button>
}

function LazyNotes() {
  const [notes] = useState(() => readNotes()) // GOOD: readNotes runs once
  const [clicks, setClicks] = useState(0)
  return <button onClick={() => setClicks(clicks + 1)}>{notes.length} notes, {clicks} clicks</button>
}
```

If you pass a **function**, React calls it only on the first render and stores the result. This is called a **lazy initializer**. We mounted each component and clicked twice (3 renders) and counted the calls:

| Code | Calls to `readNotes` (3 renders) | Same, in development StrictMode |
|---|---|---|
| `useState(readNotes())` | 3 | 6 |
| `useState(() => readNotes())` | 1 | 2 |
| `useState(readNotes)` | 1 | 2 |

**What happens, step by step:**
1. With `useState(readNotes())`, JavaScript calls `readNotes()` first and hands the result to `useState`. React ignores that result after render 1, but the work was already done.
2. With `useState(() => readNotes())`, JavaScript only creates a small arrow function. `useState` calls it on the first render and never again.
3. `useState(readNotes)` (no parentheses) also works. You pass the function itself, and React calls it with no arguments.
4. In development, StrictMode calls the initializer twice on mount to check that it is pure. The second result is thrown away. In production it runs once.

When to bother: reading `localStorage`, parsing, building a big array, creating a class instance. For `0`, `''`, `false`, `[]` and `{}` it makes no difference.

**Gotcha: functions are special.** Lazy initializers and updaters are both functions, so React treats any function you pass to `useState` or to a setter as one of those. If you really want a function as state, wrap it in another function:

```jsx
const [handler, setHandler] = useState(() => () => 'first') // lazy init returns the function
setHandler(() => () => 'second')                              // updater returns the new function

// WRONG: React treats the bare function as an updater and calls it
setHandler(function third() { return 'third' }) // the state becomes the string 'third'
```

We checked: after the wrong call the state was the string `third`, not a function. Storing functions in state is rare. Usually a ref or a plain function in the component is better.

**Common mistake:**

```jsx
// WRONG: runs the expensive function on every render
const [todos, setTodos] = useState(createInitialTodos())

// RIGHT: pass the function, not its result
const [todos, setTodos] = useState(createInitialTodos)
```

Why: with parentheses you pass the result and React cannot skip the call.

## 7. Setting the same value

React decides whether state changed with **`Object.is`**. It is like `===`, with two differences: `NaN` equals `NaN`, and `0` does not equal `-0`.

```js
Object.is(5, 5)        // true
Object.is('a', 'a')    // true
Object.is({}, {})      // false (two different objects)
Object.is(NaN, NaN)    // true
Object.is(0, -0)       // false
```

If you set a value that is equal to the current one, React **bails out**: it does not render the children, does not run effects and does not touch the DOM. Here is a way to see it:

```jsx
import { useEffect, useState } from 'react'

const counts = { parent: 0, child: 0, effect: 0 } // a measuring trick for this demo only

function Child() {
  counts.child++
  return <i>child</i>
}

export default function Parent() {
  const [n, setN] = useState(0)
  counts.parent++
  useEffect(() => {
    counts.effect++
  }, [n])

  return (
    <div>
      <button onClick={() => setN(0)}>Set 0</button>
      <button onClick={() => setN(1)}>Set 1</button>
      <button onClick={() => setN((x) => x)}>Same</button>
      <Child />
    </div>
  )
}
```

We pressed the buttons in this order and recorded the running totals:

| Action | `Parent` calls | `Child` renders | Effect runs |
|---|---|---|---|
| after mount | 1 | 1 | 1 |
| "Set 0" twice (state is already 0) | 1 | 1 | 1 |
| "Set 1" (a real change) | 2 | 2 | 2 |
| "Set 1" again | 3 | 2 | 2 |
| "Set 1" a third time | 3 | 2 | 2 |
| "Same" (`x => x`) | 3 | 2 | 2 |

**What happens, step by step:**
1. "Set 0" when the state is 0: React compares `0` and `0`, sees they are equal and stops. Nothing runs at all.
2. "Set 1": a real change. `Parent` renders, `Child` renders (a parent render renders its children), and the effect runs because `n` changed.
3. "Set 1" again: this is the odd row. React could not be sure the queue was empty, so it called `Parent` one more time. It then found the state unchanged and stopped. `Child` did not render and the effect did not run. React's docs say it may call your component one extra time before it bails out, and that this "should not matter".
4. The third time, React is sure, and nothing runs.

Two lessons. First, you do not need to check "is it the same?" yourself before calling the setter. Second, your component function must be pure, because it can run one extra time.

**Objects and arrays follow the same rule, by reference.** If you mutate an object and pass the same object back, that is "the same value", so nothing renders. We ran it: after `o.count++; setO(o)` there was no new render and the screen still showed `count 0`. After `setO({ ...o })` it showed `count 1`. A screen that does not update even though the data changed is the classic sign of mutation.

**Common mistake:**

```jsx
// WRONG: same array, so React bails out and the screen stays old
items.push(newItem)
setItems(items)

// RIGHT: a new array
setItems([...items, newItem])
```

Why: React only sees references. Give it a new object or array so it can see the change.

## 8. Updating objects

The rule: treat state as **read-only**. Copy the object, change the copy, pass the copy to the setter. The spread syntax `...` copies the properties, and the ones written after it win.

A form with many fields is the classic case. Use the input's `name` to know which field changed:

```jsx
import { useState } from 'react'

export default function SignupForm() {
  const [form, setForm] = useState({ firstName: 'Ada', lastName: 'Lovelace', email: '' })

  function handleChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  return (
    <form>
      <input aria-label="First" name="firstName" value={form.firstName} onChange={handleChange} />
      <input aria-label="Last" name="lastName" value={form.lastName} onChange={handleChange} />
      <input aria-label="Email" name="email" value={form.email} onChange={handleChange} />
      <p>{JSON.stringify(form)}</p>
    </form>
  )
}
```

**What happens, step by step:**
1. The user types in the First field. React calls `handleChange` with the event.
2. `const { name, value } = e.target` reads the field name (`firstName`) and the new text. We read them **first**, before touching the setter.
3. `{ ...f, [name]: value }` copies every field, then sets the one named by `name`. The square brackets are a **computed property name**: the key is whatever the variable holds.
4. After typing `Grace` in First and an address in Email, the paragraph showed `{"firstName":"Grace","lastName":"Lovelace","email":"g@x.org"}`. The untouched field kept its value.

**Nested objects need a copy at every level on the path to the change.** Spread is **shallow**: it copies the top level only, and inner objects are still shared. (We checked: after `const copy = { ...user }`, `copy.address === user.address` is `true`.)

```jsx
const [game, setGame] = useState({
  title: 'Chess',
  player: { name: 'Ada', stats: { wins: 3, losses: 1 } },
})

function addWin() {
  setGame({
    ...game,
    player: {
      ...game.player,
      stats: { ...game.player.stats, wins: game.player.stats.wins + 1 },
    },
  })
}
```

Click "Add win" once and the screen shows `Chess: Ada 4-1`. Each `...` keeps the siblings of the thing you change (`title`, `name`, `losses`). Only the objects on the path to `wins` are new. Everything else is shared with the old state, which is cheap and safe.

**Read event fields before you use updaters.** React clears `e.currentTarget` once your handler has finished, and an updater may run after that:

```jsx
function handleChange(e) {
  setCount((c) => c + 1)
  setForm((f) => ({ ...f, a: e.currentTarget.value })) // RISKY: may run later, when currentTarget is null
}
```

We ran this and React threw `Cannot read properties of null (reading 'value')`. The safe version reads the fields first (`const { name, value } = e.target`) and uses only those variables inside the updater. We ran that version too, and it worked.

### Immer: write the short version, get the safe result

Deep updates like `addWin` get long. **Immer** is a small library (it is not part of React) that lets you write code that looks like mutation. It gives your function a **draft**, a stand-in for the real object. You change the draft. Immer works out what changed and builds a new object for you, reusing every part you did not touch. The original is never changed.

```jsx
import { useImmer } from 'use-immer' // npm install immer use-immer

export default function Game() {
  const [game, updateGame] = useImmer({
    title: 'Chess',
    player: { name: 'Ada', stats: { wins: 3, losses: 1 } },
  })

  function addWin() {
    updateGame((draft) => {
      draft.player.stats.wins += 1 // looks like mutation, but draft is a safe stand-in
    })
  }

  return <button onClick={addWin}>{game.player.name} has {game.player.stats.wins} wins</button>
}
```

You can also use Immer with plain `useState`. `produce(recipe)` with one argument returns a function, and `useState` treats a function as an updater:

```jsx
import { produce } from 'immer'

setGame(produce((draft) => { draft.player.stats.wins += 1 }))
```

Redux Toolkit uses Immer inside `createSlice`, which is why its reducers are allowed to "mutate" ([State management](../03-intermediate/06-state-management.md)). Use Immer when nesting is deep and you cannot flatten it. In an interview, show the spread version first, then mention Immer as the tool you would reach for. Never mutate state outside a draft.

**Common mistake:**

```jsx
// WRONG: shallow copy, the nested object is still the old one
const next = { ...game }
next.player.stats.wins += 1
setGame(next)

// RIGHT: copy each level you change
setGame({ ...game, player: { ...game.player, stats: { ...game.player.stats, wins: 4 } } })
```

Why: `next.player` is the same object as `game.player`, so you changed old state.

## 9. Updating arrays

Arrays follow the same rule: never change the array in state. Some methods **mutate** (`push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `array[i] = x`). Do not call them on state. Use the methods and patterns that **return a new array**.

Our sample list for the table below is `items = [a, b, c]`, each item an object `{ id, title }` with ids 1, 2, 3:

| Task | Immutable recipe | Result |
|---|---|---|
| add at the end | `[...items, item]` | a, b, c, d |
| add at the start | `[item, ...items]` | z, a, b, c |
| insert at index 1 | `[...items.slice(0, 1), item, ...items.slice(1)]` or `items.toSpliced(1, 0, item)` | a, new, b, c |
| remove by id | `items.filter((x) => x.id !== 2)` | a, c |
| remove by index | `items.filter((_, i) => i !== 1)` or `items.toSpliced(1, 1)` | a, c |
| update one item | `items.map((x) => (x.id === 2 ? { ...x, title: 'B' } : x))` | a, B, c |
| replace by index | `items.map((x, i) => (i === 1 ? item : x))` or `items.with(1, item)` | a, r, c |
| reverse | `[...items].reverse()` or `items.toReversed()` | c, b, a |
| sort | `[...items].sort(compare)` or `items.toSorted(compare)` | sorted copy |
| clear | `[]` | empty |

We ran every recipe on that list. The original list was unchanged each time. The results above are what we got.

`toSpliced`, `with`, `toSorted` and `toReversed` are newer (ES2023) methods that return a copy. They work in current browsers and Node. The spread forms work everywhere.

**Reorder.** There is no one-line method for "move" or "swap", so write small helpers that copy first:

```js
function move(list, from, to) {
  const copy = [...list]
  const [item] = copy.splice(from, 1) // splice on the COPY is fine
  copy.splice(to, 0, item)
  return copy
}

function swap(list, i, j) {
  const copy = [...list]
  ;[copy[i], copy[j]] = [copy[j], copy[i]]
  return copy
}

move(items, 0, 2) // b, c, a
swap(items, 0, 2) // c, b, a
```

Mutating a **copy** is fine. The rule is only about the array that is in state. Then use it: `setItems(move(items, 0, 2))`.

**Nested arrays** need a copy at each level, like nested objects:

```jsx
setRows(
  rows.map((row) => (row.id === 2 ? { ...row, tags: [...row.tags, 'z'] } : row)),
)
```

**What happens, step by step:**
1. `rows.map(...)` builds a new outer array.
2. For the row with id 2, it builds a new row object, with a new `tags` array that has `z` at the end.
3. All other rows are returned as they are. We checked: the untouched row is the **same object** as before.
4. That last point is useful. A memoized row component (`React.memo`) can skip rendering for rows whose object did not change.

Two more facts we checked: `sort()` changes the array **and** returns the same array (`a.sort() === a` is `true`), so `setScores(scores.sort())` is a mutation in disguise. And when you reorder a list, give rows **stable keys** (ids, not indexes). We swapped two counters with id keys and the count moved with its item (`b: 0`, `a: 1`). See [Conditional rendering and lists](../01-basics/06-conditional-rendering-and-lists.md).

**Common mistake:**

```jsx
// WRONG: push and sort change the array in state
items.push(newItem)
setItems(items)
setItems(items.sort(byTitle))

// RIGHT
setItems([...items, newItem])
setItems([...items].sort(byTitle))
```

Why: the mutating versions pass the same reference, so React sees no change.

## 10. Stale state in closures

A **closure** is a function that remembers the variables around it. Each render creates new variables and new functions. A function created in render 1 keeps the values from render 1 for as long as it lives. If it lives past render 2, 3 and 4 (a timer, an interval, a promise), it keeps looking at old values. That is a **stale closure**.

First, a case where the old value is exactly right:

```jsx
import { useState } from 'react'

export default function Form() {
  const [to, setTo] = useState('Alice')
  const [message, setMessage] = useState('Hello')

  function handleSubmit(e) {
    e.preventDefault()
    setTimeout(() => {
      console.log(`You said ${message} to ${to}`)
    }, 5000)
  }

  return (
    <form onSubmit={handleSubmit}>
      <select aria-label="To" value={to} onChange={(e) => setTo(e.target.value)}>
        <option>Alice</option>
        <option>Bob</option>
      </select>
      <input aria-label="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
      <button type="submit">Send</button>
    </form>
  )
}
```

The user clicks Send, then quickly changes the recipient to Bob and the text to something else. Five seconds later the log says `You said Hello to Alice`. We ran it. That is **correct**: the message that was sent is the one the user saw when they clicked Send. The snapshot is a feature. Now the cases where it is a bug.

**The stuck interval.** A counter that should tick every second:

```jsx
import { useEffect, useState } from 'react'

export default function Clock() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1) // BUG: `count` is always 0 here
    }, 1000)
    return () => clearInterval(id)
  }, []) // empty array: the effect runs once, in the first render

  return <p>Seconds: {count}</p>
}
```

**What happens, step by step:**
1. The first render has `count` equal to 0. The effect runs once and creates an interval. The arrow function inside it remembers `count = 0`.
2. After 1 second the interval calls `setCount(0 + 1)`. The screen shows 1.
3. The component renders again, but the effect does **not** run again (empty array). The interval still holds the old function with `count = 0`.
4. Every later tick calls `setCount(0 + 1)` again. We ran it for 5 seconds, with and without StrictMode: the screen said `Seconds: 1`.

Three fixes. Pick by what the code needs:

```jsx
// FIX 1: an updater. Best when you only need to compute the next state.
setCount((c) => c + 1)
```

Shows `Seconds: 5` after 5 seconds (checked, with and without StrictMode). The effect never needs `count`, so `[]` is now correct.

```jsx
// FIX 2: list the value and let the effect restart. Best when the effect really needs the value.
useEffect(() => {
  const id = setTimeout(() => setCount(count + 1), 1000)
  return () => clearTimeout(id)
}, [count])
```

Also shows `Seconds: 5` after 5 seconds (checked). Each render creates a fresh timer with a fresh `count`, and the cleanup removes the old one.

```jsx
// FIX 3: read the latest value through a ref
const latest = useRef(count)
useEffect(() => {
  latest.current = count // keep the ref up to date after every render
})

function handleReport() {
  setTimeout(() => {
    console.log(`snapshot ${count}, latest ${latest.current}`)
  }, 3000)
}
```

We pressed "report", then "add" three times, and 3 seconds later the log said `snapshot 0, latest 3`. The closure still has the old number, and the ref has the newest. Use a ref when a callback must read the freshest value without restarting. (React 19.2 also added `useEffectEvent` for the same need inside effects. It is covered in [Other hooks](09-other-hooks.md).) Refs themselves are in [useRef](04-useref.md).

**Common mistake:**

```jsx
// WRONG: hide the lint warning by deleting the dependency. The bug stays.
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000)
  return () => clearInterval(id)
}, []) // eslint-disable-line react-hooks/exhaustive-deps

// RIGHT: change the code so the dependency is not needed
useEffect(() => {
  const id = setInterval(() => setCount((c) => c + 1), 1000)
  return () => clearInterval(id)
}, [])
```

Why: the lint warning is telling the truth. Fix the cause, do not silence the messenger.

## 11. Designing state: five principles

Good state is small and honest. These are the five rules from the React docs, with examples.

**1. Group related state.** If two values always change together, keep them in one object. If they are unrelated, use separate `useState` calls.

```jsx
// Two variables you must always update together
const [x, setX] = useState(0)
const [y, setY] = useState(0)

// One object
const [position, setPosition] = useState({ x: 0, y: 0 })
```

**2. Avoid contradictions.** Several booleans can say impossible things. We built a form with `isSending` and `isSent`, forgot to turn the first one off, and the screen printed `sending=true sent=true`. Replace the booleans with one **status**:

```jsx
import { useState } from 'react'

export default function FeedbackForm() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('typing') // 'typing', 'sending' or 'sent'

  function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    setTimeout(() => setStatus('sent'), 1000) // stands in for a network call
  }

  if (status === 'sent') return <p>Thanks for your feedback: {text}</p>

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        aria-label="Feedback"
        value={text}
        disabled={status === 'sending'}
        onChange={(e) => setText(e.target.value)}
      />
      <button disabled={text === '' || status === 'sending'}>
        {status === 'sending' ? 'Sending...' : 'Send'}
      </button>
    </form>
  )
}
```

**What happens, step by step:**
1. The form starts with `status = 'typing'` and empty text, so the button reads `Send` and is disabled.
2. The user types "Great". The button is enabled.
3. The user submits. `setStatus('sending')` makes the textarea and button disabled and the label `Sending...`.
4. One second later `setStatus('sent')` replaces the form with `Thanks for your feedback: Great`.

We ran this flow and saw exactly those four screens. Three states, one variable, no way to be "sending and sent".

**3. Avoid redundant state.** If you can calculate it from other state or props, do not store it. `const fullName = firstName + ' ' + lastName` in the body is better than a third state that you must remember to update (see [State and events](../01-basics/05-state-and-events.md)).

**4. Avoid duplication.** Do not keep the same data in two places. A classic case is storing the whole selected object next to the list it came from:

```jsx
// WRONG: the product exists in `products` AND in `selected`
const [products, setProducts] = useState(initialProducts)
const [selected, setSelected] = useState(products[0])

// RIGHT: store the id, find the object each render
const [products, setProducts] = useState(initialProducts)
const [selectedId, setSelectedId] = useState(1)
const selected = products.find((p) => p.id === selectedId)
```

We raised the price of "Tea" from 3 to 4. With the wrong design the list said `Select Tea ($4)` and the line below said `Selected: Tea $3`. With the id design both said 4.

**5. Avoid deep nesting.** Deeply nested state is hard to update (see section 8). If you can, flatten it.

### Normalised state: store items by id

For lists that contain lists (comments with replies, folders in folders), the usual fix is **normalisation**: keep every item once in an object keyed by id, and refer to children by id.

```js
// Nested: to edit comment 3 you must walk the whole tree and copy every ancestor
const tree = {
  id: 1, text: 'root', replies: [
    { id: 2, text: 'a', replies: [{ id: 3, text: 'a1', replies: [] }] },
    { id: 4, text: 'b', replies: [] },
  ],
}

// Normalised: a flat lookup table, children listed by id
const comments = {
  byId: {
    1: { id: 1, text: 'root', replyIds: [2, 4] },
    2: { id: 2, text: 'a', replyIds: [3] },
    3: { id: 3, text: 'a1', replyIds: [] },
    4: { id: 4, text: 'b', replyIds: [] },
  },
}

// Editing comment 3 touches one entry
const next = {
  ...comments,
  byId: { ...comments.byId, 3: { ...comments.byId[3], text: 'EDITED' } },
}
```

We ran the edit: the text changed, and the other comment objects were the **same objects** as before. You render the tree by looking up `byId[id]` and recursing over `replyIds`. This is the same idea as database tables and as `createEntityAdapter` in Redux Toolkit ([State management](../03-intermediate/06-state-management.md)). When updates are many and varied, a reducer keeps the logic in one place ([useReducer](06-usereducer.md)).

**Common mistake:**

```jsx
// WRONG: two booleans can disagree
const [isLoading, setIsLoading] = useState(false)
const [isError, setIsError] = useState(false)

// RIGHT: one status that can only be one thing
const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'error' | 'success'
```

Why: with N booleans there are 2 to the power N combinations, and most of them make no sense.

## 12. Do not copy props into state

`useState(props.color)` reads the prop **once**, on the first render. After that, the state is a private copy that never follows the prop.

```jsx
import { useState } from 'react'

function Swatch({ color }) {
  const [shown] = useState(color) // copies the prop once
  return <p>color prop={color} shown={shown}</p>
}

export default function Page() {
  const [color, setColor] = useState('red')

  return (
    <div>
      <button onClick={() => setColor('blue')}>Make blue</button>
      <Swatch color={color} />
    </div>
  )
}
```

**What happens, step by step:**
1. First render: `Swatch` gets `color = 'red'`. `useState('red')` stores `red`. The text is `color prop=red shown=red`.
2. The user clicks "Make blue". `Page` renders and passes `color = 'blue'`.
3. `Swatch` renders again. The prop is `blue`, but `useState('blue')` ignores its argument because the slot already exists.
4. The screen shows `color prop=blue shown=red`. We ran it. The two copies disagree.

What to do:
- **Use the prop directly.** This is the right answer most of the time.
- **If you truly want only a starting value**, name the prop so it says so: `initialColor`. Then it is clear that later changes are ignored on purpose.
- **If the child must restart when something changes**, give it a `key`.

### Reset state with a key

A `key` tells React which component instance is which. When the key changes, React throws away the old instance, with all its state, and creates a fresh one. Here is an editor for the selected contact:

```jsx
import { useState } from 'react'

const contacts = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Bea' },
]

function EditContact({ contact }) {
  const [name, setName] = useState(contact.name)
  return <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
}

export default function Page() {
  const [id, setId] = useState(1)
  const contact = contacts.find((c) => c.id === id)

  return (
    <div>
      {contacts.map((c) => (
        <button key={c.id} onClick={() => setId(c.id)}>{c.name}</button>
      ))}
      <EditContact key={contact.id} contact={contact} />
    </div>
  )
}
```

We typed `Ada Lovelace` into the box for Ada, then clicked Bea. **Without** `key={contact.id}` the box still said `Ada Lovelace`. **With** it, the box said `Bea`.

**What happens, step by step:**
1. The key was `1` while Ada was selected. The input state is `Ada Lovelace`.
2. The user clicks Bea. `contact.id` is now `2`, so the key changed from `1` to `2`.
3. React sees a different key at that spot. It unmounts the old `EditContact` (its state is destroyed) and mounts a new one.
4. The new one runs `useState(contact.name)` as a first render, so the box starts with `Bea`.

A key does not have to come from data. To build a "Reset" button, keep a counter and use it as the key:

```jsx
const [version, setVersion] = useState(0)
// ...
<Form key={version} />
<button onClick={() => setVersion((v) => v + 1)}>Reset</button>
```

We typed `Ada`, pressed Reset, and the box was empty (checked). The cost of a key: React rebuilds the whole subtree, including its DOM, and re-runs its effects. Put the key on the smallest component that needs the reset.

**Common mistake:**

```jsx
// WRONG: the child ignores new props after its first render
function EditContact({ contact }) {
  const [name, setName] = useState(contact.name)
  // ...
}
<EditContact contact={contact} />

// RIGHT: a key makes a new instance for each contact
<EditContact key={contact.id} contact={contact} />
```

Why: state belongs to the component instance, and a new key creates a new instance.

## 13. Setting state during render

Sometimes state depends on a prop and must adjust when the prop changes. For example, a results list is on page 3, and the user changes the filter. The page should go back to 1.

Rendering must be pure, but React makes one exception: you may call the **setter of the same component** during render, if it is behind a condition. React then throws away the output of that pass and re-runs the component at once with the new state. This is the **derived state pattern**:

```jsx
import { useState } from 'react'

function PageView({ filter, page }) {
  return <p>Showing {filter}, page {page}</p>
}

export default function Results({ filter }) {
  const [page, setPage] = useState(1)
  const [prevFilter, setPrevFilter] = useState(filter)

  if (filter !== prevFilter) {
    setPrevFilter(filter) // remember that we have handled this filter
    setPage(1)            // adjust our own state
  }

  return (
    <div>
      <PageView filter={filter} page={page} />
      <button onClick={() => setPage(page + 1)}>Next</button>
    </div>
  )
}
```

A small parent to try it with:

```jsx
export default function App() {
  const [filter, setFilter] = useState('cats')

  return (
    <div>
      <button onClick={() => setFilter('dogs')}>Dogs</button>
      <Results filter={filter} />
    </div>
  )
}
```

(Put `Results` and `App` in separate files, or rename the exports, so each file has one default export.)

**What happens, step by step:**
1. The user is on `cats`, page 3 (after pressing Next twice). The parent now passes `filter = 'dogs'`.
2. `Results` runs. `'dogs' !== 'cats'`, so it calls `setPrevFilter('dogs')` and `setPage(1)` while rendering.
3. React sees the render-time updates, discards this pass's output, and calls `Results` again immediately with the new state. This time `filter === prevFilter`, so the `if` is skipped and the function finishes normally.
4. React commits **once**. `PageView` rendered only once and only ever saw `dogs` with page 1.

We counted (no StrictMode): after the filter change, `Results` was called 2 times, `PageView` rendered 1 time, there was 1 commit, and `PageView` only ever saw `dogs/1`. In development StrictMode all of these function-call numbers go up, but the commit stays 1.

Compare the effect version, the one many tutorials teach:

```jsx
useEffect(() => {
  setPage(1)
}, [filter])
```

The same test gave: 2 `PageView` renders, 2 commits, and `PageView` saw `dogs/3` (the stale page) **before** `dogs/1`. The user can see a flash of wrong content, and React does the work twice.

The preferred order of tools, from best to last resort:
1. **Calculate it.** If a value can be derived from props or state, derive it. No state adjustment needed.
2. **Use a key.** Reset everything in a subtree when an id changes (section 12): `<Results key={filter} filter={filter} />`. In our test the key version rendered `PageView` once, with `dogs/1`.
3. **The pattern above.** Use it when you need to keep part of the state and reset another part.
4. **An effect.** Only when you must talk to the outside world, never just to adjust state.

Rules for setting state during render:
- Only call the setter of **this** component. Calling another component's setter during render logs a warning that starts "Cannot update a component while rendering a different component" (checked).
- Always put it behind a condition that becomes false on the next pass.
- Do nothing else in that branch: no network calls, no timers.
- Without a condition you get an endless loop, and React stops it with `Too many re-renders. React limits the number of renders to prevent an infinite loop.` (checked).

**Common mistake:**

```jsx
// WRONG: no condition, so every render sets state and renders again, forever
const [n, setN] = useState(0)
setN(n + 1)

// RIGHT: change state in an event handler
<button onClick={() => setN(n + 1)}>Add</button>
```

Why: an unguarded setter during render is a loop that never ends.

## 14. State belongs to a position in the tree

React remembers state by **where** a component sits in the tree, not by what you named it. Three rules:

- **Same component type at the same position keeps its state.**
- **A different type at that position resets it** (the old one is removed, a new one is created).
- **A different `key` resets it**, even for the same type.

```jsx
import { useState } from 'react'

function Counter({ label }) {
  const [n, setN] = useState(0)
  return <button onClick={() => setN(n + 1)}>{label}: {n}</button>
}

export default function App() {
  const [isB, setIsB] = useState(false)

  return (
    <div>
      {isB ? <Counter label="B" /> : <Counter label="A" />}
      <button onClick={() => setIsB(!isB)}>Switch</button>
    </div>
  )
}
```

We clicked the counter once (`A: 1`) and then pressed Switch. The button read **`B: 1`**. The label changed, but the count stayed, because both branches put a `Counter` in the same spot.

**What happens, step by step:**
1. Before the switch, the tree has a `Counter` as the first child of the `div`. Its state is `1`.
2. After the switch, the tree still has a `Counter` as the first child of the `div`. Same type, same position.
3. React reuses the existing instance and its state. Only the `label` prop changed.

Here is the same situation with three different endings. We ran all of them (click once or twice, then Switch):

| Code | After Switch |
|---|---|
| `{isB ? <Counter label="B" /> : <Counter label="A" />}` | `B: 1` (state kept) |
| `{isB ? <Counter key="B" label="B" /> : <Counter key="A" label="A" />}` | `B: 0` (different key, reset) |
| `{isB ? <section><Counter label="C" /></section> : <div><Counter label="C" /></div>}` | `C: 0` (`section` is a different type than `div`, reset) |

More facts about position:
- **A hidden component loses its state.** With `{show && <Counter />}`, hiding and showing resets the count (we checked: back to 0). To keep the state, keep the component mounted and hide it with CSS, or lift the state up. React 19.2 also added `<Activity mode="hidden">`, which hides a subtree and keeps its state ([Concurrent React and Suspense](../04-advanced/03-concurrent-react-and-suspense.md)).
- **Never define a component inside another component.** Each render of the parent creates a new function, which React sees as a new type, so the inner component loses its state every time. We ran it: `inner 1` became `inner 0` after the parent re-rendered. Define components at the top level of the file.
- **In lists, keys are the identity.** Use stable ids, so state follows the item when the order changes (section 9).

**Common mistake:**

```jsx
// WRONG: Inner is a new component on every render of Parent, so its state is lost
function Parent() {
  function Inner() {
    const [n, setN] = useState(0)
    return <button onClick={() => setN(n + 1)}>inner {n}</button>
  }
  return <Inner />
}

// RIGHT: define it outside
function Inner() {
  const [n, setN] = useState(0)
  return <button onClick={() => setN(n + 1)}>inner {n}</button>
}
function Parent() {
  return <Inner />
}
```

Why: React matches components by type, and a function created inside another function is a new type each time.

## 15. State, ref, or plain variable?

Not every value belongs in state. Ask three questions, in this order:

1. **Can you calculate it from existing state or props?** Then it is not state at all. Use a **plain variable** in the component body.
2. **Does the screen show it, and does it change over time?** Then use **state**.
3. **Must it survive between renders, but the screen does not show it?** (a timer id, a DOM node, a previous value, a flag) Then use a **ref**.

| | Plain variable in the component | `useRef` | `useState` |
|---|---|---|---|
| Survives a re-render | no, it is recreated | yes | yes |
| Changing it re-renders | no | no | yes |
| Good for | values calculated during render | timer ids, DOM nodes, previous values | anything the screen shows |
| Safe to read during render | yes | avoid it: React does not track it | yes |

Here are all three side by side. Each of the first three buttons changes its own value. The fourth forces a render:

```jsx
import { useRef, useState } from 'react'

export default function Three() {
  const [stateCount, setStateCount] = useState(0)
  const refCount = useRef(0)
  let variableCount = 0
  const [, setTick] = useState(0)

  return (
    <div>
      <button onClick={() => setStateCount(stateCount + 1)}>+ state</button>
      <button onClick={() => { refCount.current += 1 }}>+ ref</button>
      <button onClick={() => { variableCount += 1 }}>+ variable</button>
      <button onClick={() => setTick((t) => t + 1)}>re-render</button>
      <p>state={stateCount} ref={refCount.current} variable={variableCount}</p>
    </div>
  )
}
```

(Reading `refCount.current` while rendering is exactly what you should **not** do in real code. It is here only so you can see that the screen does not follow the ref.)

**What happens, step by step:**
1. We clicked "+ ref" 3 times. The ref holds 3, but nothing re-rendered, so the screen still said `state=0 ref=0 variable=0`.
2. We clicked "+ variable" 3 times. The local variable changed inside the handler, but nothing re-rendered either. The screen stayed at 0.
3. We clicked "+ state" 3 times. Each click re-rendered. The screen now said `state=3 ref=3 variable=0`. The ref value finally showed up, only because something else caused a render.
4. The variable is back to 0 on every render, because `let variableCount = 0` runs again each time the function runs.

A **module-level variable** (outside the component) survives renders but is shared by every copy of the component, and it never triggers a render. Treat it as a bug unless it is a real constant or a cache. The [useRef lesson](04-useref.md) goes deeper.

**Common mistake:**

```jsx
// WRONG: a ref for something the screen shows. The screen does not update.
const clicks = useRef(0)
<button onClick={() => { clicks.current += 1 }}>Clicked {clicks.current}</button>

// RIGHT: state
const [clicks, setClicks] = useState(0)
<button onClick={() => setClicks(clicks + 1)}>Clicked {clicks}</button>
```

Why: only a state update tells React to render again.

## How interviewers test this
- **Output prediction.** Three `setCount(count + 1)` calls, a mix of values and updaters, a `console.log` after the setter, a `setTimeout` that reads state. A strong answer says "snapshot" and "queue", gives the right number, and shows the updater fix. A red flag is guessing, or saying "it is async" and stopping.
- **Functional updates.** They want to hear when they are needed: several updates in a row, timers, intervals, async code. A strong answer gives the stuck interval or the lost async update as the example.
- **Immutability.** They watch what you write for "add an item", "remove an item" and "update a field". Strong: spread, `map`, `filter`, a copy at every nested level, and why (`Object.is`, references). Red flags: `push`, `splice`, `sort()` on state, `obj.x = ...`.
- **State design.** They ask what you would store. Strong answers avoid derived state, duplicated data, contradictory booleans and copied props, and know the `key` trick. A red flag is `useEffect` used just to copy props into state.
- **The details.** Lazy initial state, what happens when you set the same value, batching in React 18+, and the setter having no callback. These separate people who used React from people who understand it.
- **Small builds.** A counter, a toggle, a task list or a form. They look for correct updaters, immutable list updates, no extra state, and stable keys.

## Interview questions and model answers

### Q1. What does `useState` return, and what does the setter do? (Easy)
It returns a pair: the current state value and a setter function. The initial value is used only on the first render. Calling the setter does not change the variable you already have. It puts an update (a value or an updater function) in a queue and asks React to render. React runs the queue, stores the result, calls the component again, and `useState` then returns the new value. The setter keeps the same identity between renders, returns nothing, and replaces the state instead of merging it.

### Q2. Is `setState` synchronous or asynchronous? Why does the old value show right after the call? (Easy)
Neither word is exact. The call returns immediately, but it does not change the variable in the running code, because that code belongs to one render, which is a snapshot. The update is queued, and React applies it in the next render, after the handler finishes. So `setCount(count + 1); console.log(count)` prints the old number (we checked), and even the DOM still shows the old text until the handler ends. There is no promise to await. If you need the new value now, calculate it in a variable first. If you need to run code after it is on screen, use an effect.

### Q3. What is the difference between `setCount(count + 1)` and `setCount(c => c + 1)`? (Easy)
The first uses the `count` from the current render's snapshot. Three calls in one handler all say "set to the same number", so you get +1. The second is an updater function. React queues it and calls it with the latest pending state, so three calls give +3. A plain value replaces everything before it in the queue, and an updater builds on it.

```jsx
setCount(count + 1); setCount(count + 1); setCount(count + 1)       // +1
setCount((c) => c + 1); setCount((c) => c + 1); setCount((c) => c + 1) // +3
```

### Q4. When must you use the functional form of the setter? (Medium)
Whenever the new state depends on the old state and your code might hold an old snapshot. That means: several updates to the same state in one event, timers and intervals, code after an `await`, effects or callbacks with stable (empty) dependencies, and reusable helpers like a `toggle` in a custom hook. A plain value is fine when the new value does not depend on the old one (`setName(e.target.value)`, `setOpen(false)`). The updater must be pure, because StrictMode calls it twice in development.

### Q5. What is automatic batching? (Medium)
React groups the state updates from one event and renders once. Before React 18, only updates inside React event handlers were batched, so two `setState` calls in a `setTimeout` or a promise rendered twice. Since React 18, and in 19, updates are batched everywhere: event handlers, timeouts, promises and native listeners. We counted one render for each of those. Updates separated by a real wait are separate batches, and code after an `await` starts a new one. `flushSync` is the rare opt-out when you need the DOM updated at once.

### Q6. How do you update an object or an array in state, and why can't you mutate it? (Easy)
React compares old and new state with `Object.is`, which compares objects by reference. If you mutate and pass the same reference, React sees no change and skips the render, so the screen is stale. So make a copy with the change: `{ ...user, age: 31 }`, `[...items, x]`, `items.filter(...)`, `items.map(...)`. For nested data, copy every level on the path to the change, because spread is shallow. Immer is a library that lets you write the change as a mutation of a draft and produces the copy for you.

```jsx
setItems(items.map((x) => (x.id === id ? { ...x, done: true } : x)))
```

### Q7. Can state be an object? One object or several `useState` calls? (Easy)
Yes, state can be any value: a number, string, boolean, array, object, `null`, even a function (with care). Use one object when values always change together (`{ x, y }`). Use separate `useState` calls for unrelated values. Remember that the setter replaces the whole object, so you must copy the other fields: `setUser({ ...user, age: 31 })`. If you have many fields with complex transitions, consider `useReducer`.

### Q8. What is lazy initial state and when do you use it? (Medium)
You pass a function to `useState`: `useState(() => readNotes())`. React calls it only on the first render and ignores it later. Without the arrow, `useState(readNotes())` runs `readNotes()` on every render, and React throws the result away. We counted 3 calls against 1 over three renders. Use it when the initial value is expensive: reading `localStorage`, parsing, building a big array. For cheap values it makes no difference. You can also pass the function itself: `useState(readNotes)`.

### Q9. What happens if you set state to the same value? (Medium)
React compares with `Object.is`. If the value is equal, it bails out: it does not render the children, run effects or update the DOM. It may still call your component function one more time before it gives up, which is why render functions must be pure. For objects and arrays, "equal" means the same reference, so mutating and setting the same object does nothing visible. Always pass a new object or array when something changed.

### Q10. What is a stale closure in React, and how do you fix it? (Medium)
A function created in one render remembers that render's values. If it lives longer than the render (a `setTimeout`, an interval, a promise callback, an effect with `[]`), it keeps using old state. Example: `setInterval(() => setCount(count + 1), 1000)` in an effect with `[]` stays at 1. Fixes: use an updater (`setCount(c => c + 1)`), list the value in the dependencies so the effect restarts, or read the latest value from a ref. Do not hide the lint warning.

### Q11. Why shouldn't you copy props into state? (Medium)
`useState(props.value)` reads the prop only on the first render. If the prop changes later, the state does not follow, and the screen shows stale data. Use the prop directly, or derive the value. If you want a starting value only, name the prop `initialValue` so the behaviour is clear. If the child must restart when something changes, such as the selected user, give it a `key`. Copying props also creates two sources of truth.

### Q12. How do you reset a component's state? (Medium)
Give the component a `key`. When the key changes, React destroys the old instance and its state and creates a new one: `<EditContact key={contact.id} contact={contact} />`. For a Reset button, keep a counter in the parent and use it as the key. You can also call the setters with the initial values, but it is easy to forget a field. A key resets everything below it and costs a remount, so put it on the smallest component that needs it.

### Q13. When do you use state, a ref or a plain variable? (Medium)
State is for values the screen shows: changing it re-renders. A ref is for values that must survive renders but are not shown: timer ids, DOM nodes, previous values. Changing `ref.current` does not re-render, and you should not read it during render. A plain variable inside the component is for values you can calculate from state and props, and it is recreated every render. A module-level variable survives but is shared by all instances, so it is rarely right. We checked: clicking a ref button three times left the screen at 0 until something else re-rendered.

### Q14. Can you call `setState` during render? (Hard)
Only the setter of the same component, and only behind a condition. React discards that pass and re-runs the component at once with the new state, before children render and before anything is committed. It is used to adjust state when a prop changes: `if (filter !== prevFilter) { setPrevFilter(filter); setPage(1) }`. It beats an effect, which renders the stale value first and commits twice. Without a condition you get "Too many re-renders", and calling another component's setter logs a warning. Prefer deriving the value or using a `key` first.

### Q15. Predict the result: `setNumber(number + 5); setNumber(n => n + 1)` starting from 0. (Medium)
The result is 6. The queue holds "replace with 5" and "add 1". React runs them in order: 0, then 5, then 6, and renders once. If you add `setNumber(42)` at the end the result is 42, because a plain value replaces everything before it. If the order is `setNumber(n => n + 1); setNumber(42); setNumber(n => n + 1)` the result is 43. We ran all of these.

## Common mistakes and gotchas
- **`setCount(count + 1)` repeated** adds only once. Fix: use `setCount(c => c + 1)`.
- **Reading state right after the setter** gives the old value. Fix: calculate a local variable first, or use an effect to react after the render.
- **Mutating state** (`push`, `splice`, `sort()`, `obj.x = 1`) leaves the screen stale. Fix: copy with spread, `map`, `filter`, `toSorted`, then set.
- **Shallow copies of nested objects** share the inner objects. Fix: copy every level you change, or use Immer.
- **Expecting `setState` to merge.** `setUser({ age: 31 })` loses the other fields. Fix: `setUser({ ...user, age: 31 })`.
- **Passing a second callback argument** to the setter. Hooks ignore it and warn. Fix: use an effect.
- **`useState(expensive())`** runs on every render. Fix: `useState(() => expensive())` or `useState(expensive)`.
- **A stale interval or timer** (`[]` effect with `setCount(count + 1)`). Fix: an updater, the right dependencies, or a ref.
- **Using `e.currentTarget` inside an updater** can crash, because it is cleared after the handler. Fix: destructure what you need first.
- **Copying props into state** (`useState(props.x)`) ignores later changes. Fix: use the prop, or reset with `key`.
- **Contradictory booleans** (`isLoading` and `isError` together). Fix: one `status` value.
- **Duplicated data** (a selected object next to its list). Fix: store the id and derive the object.
- **Components defined inside components** lose state on every render. Fix: define them at the top level.
- **Setting state in render without a condition** loops forever. Fix: use an event handler, or guard it with a condition.
- **A ref for something the screen shows.** The screen never updates. Fix: use state.
- **Impure updaters** (side effects inside `setX(prev => ...)`) run twice in development. Fix: do side effects in the handler.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Predict. `number` starts at 0 and each handler runs once. What is `number` afterwards?

   ```jsx
   // a
   setNumber(number + 2)
   setNumber(number + 2)

   // b
   setNumber((n) => n + 2)
   setNumber((n) => n + 2)

   // c
   setNumber((n) => n + 2)
   setNumber(10)

   // d
   setNumber(10)
   setNumber((n) => n * 2)
   setNumber(number + 1)
   ```

<details>
<summary>Show answer</summary>

a is **2**, b is **4**, c is **10**, d is **1**.

- a: both lines mean "replace with 2" (`number` is 0 for the whole handler).
- b: add 2, add 2, so 0, 2, 4.
- c: add 2 gives 2, then "replace with 10" discards it. The result is 10.
- d: replace with 10, double it to 20, then "replace with 0 + 1" discards both. The result is 1.

A plain value throws away everything before it. An updater builds on it. We ran all four.

</details>

2. **(Easy)** Code. Build a counter with a **+1** button and a **+3** button. The +3 button must call the setter three times (do not write `count + 3`), and it must really add 3.

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  function addThree() {
    setCount((c) => c + 1)
    setCount((c) => c + 1)
    setCount((c) => c + 1)
  }

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={addThree}>+3</button>
      <p>Count: {count}</p>
    </div>
  )
}
```

Three updaters build on each other. We clicked +3, +1, +3 and the screen read `Count: 7`. With `setCount(count + 1)` three times, +3 would add only 1.

</details>

3. **(Easy)** Explain. Which of these calls `buildList()` on every render, and which only once? Why?

   ```jsx
   const [a] = useState(buildList())
   const [b] = useState(() => buildList())
   const [c] = useState(buildList)
   ```

<details>
<summary>Show answer</summary>

Only line `a` calls `buildList()` on every render. Lines `b` and `c` call it once, on the first render.

In `a`, JavaScript evaluates `buildList()` before `useState` even runs, on every render, and React throws the result away after render 1. In `b`, you pass an arrow function. React calls it only when it needs the first value. In `c`, you pass the function itself. React calls it with no arguments, once. We counted over 3 renders: 3 calls for `a`, 1 for `b`, 1 for `c`. In development StrictMode the numbers are 6, 2 and 2, because the initializer is checked twice on mount.

</details>

4. **(Medium)** Code. Build a playlist that starts with Alpha and Beta. It needs: an "Add Gamma" button, a "Remove" button on each song, and an "Up" button on each song that moves it one place up (no effect on the first song). Never mutate the state.

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

let nextId = 3

export default function Playlist() {
  const [songs, setSongs] = useState([
    { id: 1, title: 'Alpha' },
    { id: 2, title: 'Beta' },
  ])

  function add(title) {
    setSongs([...songs, { id: nextId++, title }])
  }

  function remove(id) {
    setSongs(songs.filter((s) => s.id !== id))
  }

  function moveUp(index) {
    if (index === 0) return
    const copy = [...songs]
    ;[copy[index - 1], copy[index]] = [copy[index], copy[index - 1]]
    setSongs(copy)
  }

  return (
    <div>
      <button onClick={() => add('Gamma')}>Add Gamma</button>
      <ul>
        {songs.map((s, i) => (
          <li key={s.id}>
            {s.title}
            <button onClick={() => moveUp(i)}>Up {s.title}</button>
            <button onClick={() => remove(s.id)}>Remove {s.title}</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Add uses spread, remove uses `filter`, and move copies the array first and swaps in the copy. Keys are ids, not indexes. We ran it: add gives Alpha, Beta, Gamma. "Up Gamma" gives Alpha, Gamma, Beta. "Up Alpha" does nothing. "Remove Beta" leaves Alpha, Gamma. (`nextId++` runs in a handler, not during render, so it is fine.)

</details>

5. **(Medium)** Predict and fix. Starting at `Count: 1`, the user clicks "Double in 1 s", then quickly clicks "Add 1" twice, and waits. What does the screen show before and after the timer fires? Make "double" really double the latest count.

   ```jsx
   function Delayed() {
     const [count, setCount] = useState(1)

     function handleDouble() {
       setTimeout(() => setCount(count * 2), 1000)
     }

     return (
       <div>
         <button onClick={() => setCount(count + 1)}>Add 1</button>
         <button onClick={handleDouble}>Double in 1 s</button>
         <p>Count: {count}</p>
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

Before the timer: `Count: 3`. After the timer: **`Count: 2`**.

The timer was created in the render where `count` was 1, so it remembers 1 and calls `setCount(1 * 2)`. That replaces the 3 with 2. Fix: use an updater, so the timer asks for the latest value:

```jsx
setTimeout(() => setCount((c) => c * 2), 1000)
```

Now the screen shows `Count: 6` after the timer. We ran both versions.

</details>

6. **(Medium)** Code. A textarea should start with the text saved in `localStorage` under the key `draft` (or an empty string), and save every change back. Read `localStorage` only once, no matter how many times the component renders.

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

export default function Draft() {
  const [text, setText] = useState(() => localStorage.getItem('draft') ?? '')

  function handleChange(e) {
    const next = e.target.value
    setText(next)
    localStorage.setItem('draft', next)
  }

  return <textarea aria-label="Draft" value={text} onChange={handleChange} />
}
```

The initializer is a function, so `getItem` runs on the first render only. We mounted it with `saved text` in storage, made two edits, and counted: 1 call to `getItem` with the lazy version, 3 calls with `useState(localStorage.getItem('draft') ?? '')`. The save happens in the event handler. Saving in the handler keeps the render function free of side effects.

</details>

7. **(Medium)** Explain and fix. A quiz shows one question at a time. The user types "Paris" for the first question and clicks Next. The second question appears, but the input still says "Paris". Why? Fix it without changing `Question`.

   ```jsx
   function Question({ text }) {
     const [answer, setAnswer] = useState('')
     return (
       <label>
         {text} <input value={answer} onChange={(e) => setAnswer(e.target.value)} />
       </label>
     )
   }

   // in the parent:
   <Question text={questions[index]} />
   ```

<details>
<summary>Show answer</summary>

`Question` sits at the same position with the same type before and after Next. React keeps the instance and its `answer` state, and only the `text` prop changes. We ran it: after Next the label read `Capital of Spain?` and the input still showed `"Paris"`.

Fix: give it a key that changes with the question.

```jsx
<Question key={index} text={questions[index]} />
```

A new key makes a new instance with fresh state. We ran this too: after Next the input was empty.

</details>

8. **(Medium)** Predict. In each version, click the counter twice, then press Switch. What does the counter button show?

   ```jsx
   // v1
   {on ? <Counter label="B" /> : <Counter label="A" />}

   // v2
   {on ? <Counter key="b" label="B" /> : <Counter key="a" label="A" />}

   // v3
   {on ? <section><Counter label="C" /></section> : <div><Counter label="C" /></div>}
   ```

<details>
<summary>Show answer</summary>

v1 shows **`B: 2`**, v2 shows **`B: 0`**, v3 shows **`C: 0`**.

- v1: same type (`Counter`) at the same position, so React reuses the instance and keeps the count.
- v2: the keys differ (`a` and `b`), so React treats them as different components and resets.
- v3: `section` and `div` are different types at that position, so everything below them is rebuilt, and the count resets.

We ran all three.

</details>

9. **(Hard)** Code. `settings` is `{ theme: { mode: 'light', colors: { primary: '#06f', accent: '#f60' } }, notifications: { email: true, sms: false } }`. Write `setPrimary(color)` and `toggleSms()` as update functions for `useState`. Neither may mutate. Parts that did not change must keep their identity: after `setPrimary`, `settings.notifications` must be the same object as before.

<details>
<summary>Show answer</summary>

```jsx
const [settings, setSettings] = useState({
  theme: { mode: 'light', colors: { primary: '#06f', accent: '#f60' } },
  notifications: { email: true, sms: false },
})

function setPrimary(color) {
  setSettings((s) => ({
    ...s,
    theme: { ...s.theme, colors: { ...s.theme.colors, primary: color } },
  }))
}

function toggleSms() {
  setSettings((s) => ({
    ...s,
    notifications: { ...s.notifications, sms: !s.notifications.sms },
  }))
}
```

Copy every level on the path to the change: `settings`, `theme`, `colors` for the color, and `settings`, `notifications` for the toggle. We ran the same update logic: `setPrimary('#000')` gave primary `#000`, kept accent `#f60`, left the original at `#06f`, and `notifications` was the same object. `toggleSms` flipped `sms` to `true` and `theme` was the same object. With Immer each function would be one line on a draft.

</details>

10. **(Hard)** Explain. This uploader keeps `isUploading`, `isDone` and `hasError` as three booleans. After a successful upload the screen shows `uploading=true done=true error=false`. What went wrong, how many combinations can the state be in, and how would you redesign it?

    ```jsx
    async function upload() {
      setIsUploading(true)
      try {
        await sendFile()
        setIsDone(true)
      } catch {
        setHasError(true)
      }
    }
    ```

<details>
<summary>Show answer</summary>

The code never sets `isUploading` back to `false`, so after success the state says "uploading" and "done" at once. We ran it and got exactly `uploading=true done=true error=false`. Nothing in the language stops you from making such a mistake, because the three booleans can be in 2 x 2 x 2 = 8 combinations, and only 4 of them make sense: idle, uploading, done, error.

Redesign: one status value that can only be one thing.

```jsx
const [status, setStatus] = useState('idle') // 'idle' | 'uploading' | 'done' | 'error'

async function upload() {
  setStatus('uploading')
  try {
    await sendFile()
    setStatus('done')
  } catch {
    setStatus('error')
  }
}
```

Now every update replaces the previous status, so contradictions are impossible. The UI reads `status === 'uploading'` and so on.

</details>

11. **(Hard)** Code. Build `Trend({ value })`. It shows the value and the word `up` or `down` depending on how the prop changed since the previous render (and `same` at the start). Do it without `useEffect`.

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

export default function Trend({ value }) {
  const [prev, setPrev] = useState(value)
  const [trend, setTrend] = useState('same')

  if (value !== prev) {
    setTrend(value > prev ? 'up' : 'down')
    setPrev(value)
  }

  return <p>{value} ({trend})</p>
}
```

This is the derived state pattern: remember the previous prop in state, compare during render, and set state behind a condition. React re-runs the component immediately, so the screen never shows a stale `trend`. We rendered it with 5, then 8, then 3, and got `5 (same)`, `8 (up)`, `3 (down)`. A `useEffect` version would render the old trend first and commit twice.

</details>

12. **(Hard)** Predict. What does this component show, how many times does React call it, and does React log an error? Then remove the `if` condition and say what happens.

    ```jsx
    function Bad() {
      const [n, setN] = useState(0)
      if (n < 3) setN(n + 1)
      return <p>n is {n}</p>
    }
    ```

<details>
<summary>Show answer</summary>

It shows `n is 3`. React calls the function 4 times (with `n` equal to 0, 1, 2 and 3), and it logs no error. We ran it without StrictMode and recorded the calls `[0, 1, 2, 3]`. (StrictMode in development adds extra calls.)

Each time, the setter is called during render behind a condition. React discards the pass and re-runs the function with the new state. At `n = 3` the condition is false, so the loop ends and React commits once.

Without the `if`, `setN(n + 1)` runs on every pass and the loop never ends. React stops it with the error `Too many re-renders. React limits the number of renders to prevent an infinite loop.` The condition is what makes it legal.

</details>

## Recap
- `useState` returns `[value, setter]`. The initial value is used once. The setter keeps its identity, returns nothing and replaces (does not merge).
- Updates go into a queue. A plain value replaces everything before it, and an updater builds on it. `setNumber(number + 5); setNumber(n => n + 1)` from 0 gives 6.
- Use an updater whenever the next state depends on the previous one and the code might hold an old snapshot: repeated calls, timers, intervals, code after `await`. Updaters must be pure.
- React 18 and newer batch updates everywhere into one render. State is a snapshot, so the line after the setter sees the old value. "Queued and batched" is a better answer than "async".
- Lazy initial state (`useState(() => expensive())`) skips the work after the first render. Setting an equal value (`Object.is`) bails out, so mutate-and-set-the-same-object shows nothing.
- Update objects and arrays immutably: spread, `map`, `filter`, `toSorted`, `with`. Copy every nested level, or use Immer. Normalise nested lists by id.
- Keep state small: group related values, avoid contradictions, redundancy, duplication and deep nesting. Never copy props into state. Reset with `key`, or adjust during render behind a condition.
- State lives at a position in the tree. Same type at the same position keeps it, a different type or key resets it. State is for what the screen shows, a ref is for hidden values, a plain variable is for calculations.

## Where to go next
- Next lesson: [useEffect](03-useeffect.md), where timers, subscriptions and cleanup live. Related: [useRef](04-useref.md), [useReducer](06-usereducer.md) for complex state, [Memoization](07-memoization.md), and [State management](../03-intermediate/06-state-management.md).
- See the full render process: [How React renders](../04-advanced/01-how-react-renders.md). Revisit the basics in [State and events](../01-basics/05-state-and-events.md) and keys in [Conditional rendering and lists](../01-basics/06-conditional-rendering-and-lists.md).
- Practise: [01 Counter](../practice-app/exercises/react/01-counter/README.md), [17 Tic-tac-toe with history](../practice-app/exercises/react/17-tic-tac-toe-history/README.md) (state history, immutable updates), and [18 Stopwatch](../practice-app/exercises/react/18-stopwatch/README.md) (a timer and stale closures).
- Test yourself: Round 3, state and closures (planned) and Round 1, hooks quiz (planned).
- Keep handy: Hooks cheatsheet (planned) and Gotchas and common mistakes (planned).
