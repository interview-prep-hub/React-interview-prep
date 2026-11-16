# Round 3 - Output Prediction and Debugging: Bug Hunt - Answers

**Questions:** [../questions/02-bug-hunt.md](../questions/02-bug-hunt.md)

Each bug was reproduced by running the buggy component in a test, and each fix was run against the same steps. A good answer in an interview has four parts: reproduce the symptom, name the root cause in one sentence, write the smallest fix, and say how you would stop it coming back (a test, a lint rule, a code review habit).

## Bugs
### R3-BG-001 (Medium) Stale closure in a key listener
**Answer:** The effect has `[]` as dependencies, so it runs once and the listener keeps the `score` of the first render (0). Every key press calls `setScore(0 + 10)`, which is always 10.

**Trace:**
1. Mount: the effect adds `onKeyDown`, which closes over `score = 0`.
2. First press: `setScore(10)`. The component renders with `score = 10`, but the effect does not run again, so the old listener stays.
3. Second press: the old listener still sees `score = 0` and sets 10 again. Nothing changes.

In the test, three presses gave `Score: 10` for the buggy version and `Score: 30` for the fixed one.

**The fix:** use the updater form, which receives the latest state:

```jsx
import { useEffect, useState } from 'react'

function ScoreboardFixed() {
  const [score, setScore] = useState(0)

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'ArrowUp') {
        setScore((s) => s + 10)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return <p>Score: {score}</p>
}
```

**The rule:** A callback inside an effect sees the values of the render that created it. Either use updater functions, or list the value in the dependencies (the listener is then removed and added on every change, which is correct but slower).
**Why it matters / follow-up:** The lint rule `react-hooks/exhaustive-deps` would have flagged `score`. Never silence it to hide a bug.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R3-BG-002 (Easy) A missing dependency
**Answer:** The effect uses `userId` but its dependency array is `[]`. It runs once for the first user and never again when `userId` changes.

**Trace:**
1. Mount with `userId = 1`: the effect loads `User 1`.
2. The parent passes `userId = 2`. The component renders, but React compares `[]` with `[]` and skips the effect.
3. The old `user` state stays on screen.

In the test: after the change the buggy card showed `User 1`, the fixed card showed `User 2`.

**The fix:** add `userId` to the dependencies. Adding an `ignore` flag in the cleanup also protects against a slow old response arriving late (see R3-BG-006):

```jsx
import { useEffect, useState } from 'react'

function UserCardFixed({ userId }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    let ignore = false
    fetchUser(userId).then((u) => {
      if (!ignore) setUser(u)
    })
    return () => {
      ignore = true
    }
  }, [userId])

  return <p>{user ? user.name : 'Loading...'}</p>
}
```

**The rule:** Every reactive value used inside an effect (props, state, things derived from them) belongs in the dependency array. The array says "re-run when these change".
**Why it matters / follow-up:** A follow-up is "when would you use `[]`?" Only when the effect uses no reactive values (for example, subscribing to something global).
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R3-BG-003 (Easy) Mutating state
**Answer:** `toggle` changes the todo object in place and passes the same array to `setTodos`. React sees the same reference, skips the render, and puts the controlled checkbox back to `checked={false}`.

**Trace:**
1. Click: the browser toggles the checkbox and calls `onChange`.
2. `todo.done = !todo.done` changes the object inside the state array. `setTodos(todos)` passes the same array.
3. `Object.is(old, new)` is true, so there is no render.
4. The input is controlled, so React restores `checked` to the value from the last render: false.

In the test, after clicking `Buy milk` the checkbox was still unchecked (and `Walk dog` too). With the fix both ended up checked.

**The fix:** create a new array and a new object for the changed item:

```jsx
import { useState } from 'react'

function TodoListFixed() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Walk dog', done: false },
  ])

  function toggle(id) {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  return (
    <ul>
      {todos.map((t) => (
        <li key={t.id}>
          <label>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
            {t.text}
          </label>
        </li>
      ))}
    </ul>
  )
}
```

**The rule:** Treat state as read-only. Replace objects and arrays, never edit them. Use `map`, `filter`, spread, or a helper such as Immer.
**Why it matters / follow-up:** Mutation also breaks `memo` and effect dependencies, and it hides bugs because a later render can make the change appear.
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R3-BG-004 (Medium) Index keys with local state
**Answer:** The list uses `key={index}`. When a note is added at the top, the keys stay 0, 1, 2 and so on, but they now point to different notes. The open/closed state belongs to the component instance with key 0, which now shows the new note.

**Trace:**
1. One note: instance with key 0 shows `Groceries`. You open it, so key 0 has `open = true`.
2. A note is added at the front. The list is `[New note, Groceries]` with keys 0 and 1.
3. React reuses instance 0 (open) for `New note`, and creates a new instance for key 1 (closed) for `Groceries`.

In the test the rows were `New notewrite here` (open) and `Groceries` (closed). With the fix they were `New note` (closed) and `Groceriesmilk, eggs` (still open).

**The fix:** use the note's own id as the key:

```jsx
import { useState } from 'react'

function NoteListFixed() {
  const [notes, setNotes] = useState([{ id: 1, title: 'Groceries', body: 'milk, eggs' }])

  function addNote() {
    const next = { id: notes.length + 1, title: 'New note', body: 'write here' }
    setNotes([next, ...notes])
  }

  return (
    <>
      <button onClick={addNote}>Add note</button>
      <ul>
        {notes.map((note) => (
          <NoteRow key={note.id} note={note} />
        ))}
      </ul>
    </>
  )
}
```

**The rule:** The key is the identity of the item. State follows the key. Use a stable unique id from the data. Index keys are fine only for lists that never reorder, insert or delete.
**Why it matters / follow-up:** The id must be created when the item is created (not in render). `Date.now()` and `Math.random()` inside render make new keys each time.
**Learn more:** [lists and keys](../../../01-basics/06-conditional-rendering-and-lists.md)

### R3-BG-005 (Hard) An effect loop caused by an object dependency
**Answer:** `filters` is a new object on every render, and it is the effect's dependency. The effect fetches, `setProducts` stores a new array, the component renders, `filters` is new again, and the effect runs again. This repeats without end.

**Trace:**
1. Render: `filters = { category, inStock: true }` is created.
2. The effect runs because the dependency changed (a new object). It starts a fetch.
3. The fetch resolves with a new array. `setProducts` sees a new reference and re-renders.
4. Back to step 1 with a new `filters` object.

In the test I capped the mock after 25 answers so it would stop. The buggy version still made 26 calls within 40 turns of the event loop. The fixed one made 1.

**The fix:** depend on the primitive value and build the object inside the effect:

```jsx
import { useEffect, useState } from 'react'

function ProductsFixed({ category }) {
  const [products, setProducts] = useState([])

  useEffect(() => {
    fetchProducts({ category, inStock: true }).then(setProducts)
  }, [category])

  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  )
}
```

**The rule:** Dependencies are compared by reference. Do not put objects, arrays or functions created in render into the dependency array. Use primitives, create the object inside the effect, or memoize it.
**Why it matters / follow-up:** Always check the network tab and the Profiler when you see "stuck loading". A loop also needs a state update that always makes a new value, so ask "what is new on every render?".
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R3-BG-006 (Hard) A race condition in a search box
**Answer:** The two requests are not guaranteed to finish in order. If `ab` answers first and `a` answers later, the late answer is stored last and replaces the right one.

**Trace:**
1. Type `a`: the effect starts request A. Type `b`: React cleans up the first effect (it does nothing here) and starts request AB.
2. AB answers: `results for ab` is shown.
3. A answers late: `.then(setResult)` runs and stores `results for a`.
4. The input says `ab`, the result says `a`.

In the test, the buggy version ended with `Result: results for a` and the fixed version with `Result: results for ab`.

**The fix:** make the cleanup ignore answers from old effects:

```jsx
import { useEffect, useState } from 'react'

function SearchFixed() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState('')

  useEffect(() => {
    if (!query) return
    let ignore = false
    searchApi(query).then((data) => {
      if (!ignore) setResult(data)
    })
    return () => {
      ignore = true
    }
  }, [query])

  return (
    <>
      <input aria-label="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p>Result: {result}</p>
    </>
  )
}
```

**The rule:** An effect that fetches needs a cleanup that stops the old request from changing state: an `ignore` flag, or an `AbortController` to cancel the request. This also makes the effect safe in StrictMode.
**Why it matters / follow-up:** Follow-up: "What about debouncing?" It reduces requests, but it does not fix the race. Libraries such as TanStack Query handle this for you.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R3-BG-007 (Easy) Calling the handler instead of passing it
**Answer:** `onClick={track('buy_click', productId)}` calls `track` while rendering and passes its result (`undefined`) to `onClick`. So the event is sent on every render, and a click does nothing.

**Trace:**
1. React renders the button. To build the JSX it evaluates `track(...)`, which logs `track buy_click 7`.
2. `track` returns `undefined`, so `onClick` is `undefined`. React does not warn about this.
3. A click has no handler. In the test, the click logged nothing.

**The fix:** pass a function that calls `track` when the event happens:

```jsx
function BuyButtonFixed({ productId }) {
  return <button onClick={() => track('buy_click', productId)}>Buy</button>
}
```

**The rule:** `onClick={fn}` passes the function. `onClick={fn()}` passes the result of calling it. If you need arguments, wrap the call in an arrow function.
**Why it matters / follow-up:** A related version crashes: `onClick={setCount(count + 1)}` sets state while rendering and ends in `Too many re-renders`.
**Learn more:** [state and events](../../../01-basics/05-state-and-events.md)

### R3-BG-008 (Medium) An unstable context value
**Answer:** `AuthProvider` creates a new `{ user, setUser }` object on every render. When the theme button re-renders `AppShell`, `AuthProvider` renders again, the context value is a new object, and every consumer re-renders. `memo` cannot help because the change comes through context, not props.

**Trace:**
1. Click the theme button: `AppShell` renders, so `AuthProvider` renders.
2. The inline object is a new reference, so React sees the context value changed.
3. `Header` reads the context, so it renders even though it is wrapped in `memo`.

In the test, three clicks logged `Header render` three times. With the fix, zero times.

**The fix:** memoize the value so it changes only when `user` changes. `setUser` from `useState` is already stable:

```jsx
import { createContext, useMemo, useState } from 'react'

function AuthProviderFixed({ children }) {
  const [user, setUser] = useState({ name: 'Ann' })
  const value = useMemo(() => ({ user, setUser }), [user])
  return <AuthContext value={value}>{children}</AuthContext>
}
```

**The rule:** Context compares the value by reference. Keep the value stable with `useMemo` (and `useCallback` for functions you put in it), or split the context into several smaller ones.
**Why it matters / follow-up:** Follow-up: "Does this matter for small apps?" Often not. It matters when many or expensive consumers exist. Measure with the Profiler first.
**Learn more:** [useContext](../../../02-hooks/05-usecontext.md)

### R3-BG-009 (Medium) A missing cleanup for an event listener
**Answer:** The effect adds a `resize` listener on window but never removes it. Each time the widget mounts, one more listener stays alive, even after the widget is gone.

**Trace:**
1. Toggle the widget: mount, add listener 1.
2. Hide it: unmount. React has no cleanup to run, so listener 1 stays on `window`.
3. Show it again: listener 2 is added. And so on.
4. A resize calls every old listener. They also keep the old component state in memory.

In the test, after the widget was mounted three times, one resize logged `resize handler` 3 times. With the fix it logged once.

**The fix:** return a cleanup that removes the same function:

```jsx
import { useEffect, useState } from 'react'

function WindowSizeFixed() {
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    function onResize() {
      console.log('resize handler')
      setWidth(window.innerWidth)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return <p>width: {width}</p>
}
```

**StrictMode:** in development, StrictMode runs setup, cleanup, setup on every mount. With the buggy code, one mount already left two listeners (one resize logged the line twice in the test). That is how StrictMode shows a missing cleanup.
**The rule:** Every effect that subscribes, listens, sets a timer or opens a connection must return a cleanup that undoes it.
**Why it matters / follow-up:** The same holds for `setInterval`, `WebSocket`, observers and third-party widgets.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R3-BG-010 (Medium) State copied from a prop
**Answer:** `useState(user.name)` only uses its argument on the first render. When the prop changes, the component instance stays alive and keeps its old state, `Ann`.

**Trace:**
1. Mount: `name` state starts as `Ann`.
2. The parent passes Bob. `ProfileEditor` renders again, but `useState` ignores the new initial value.
3. The input shows the state, which is still `Ann`.

In the test the input said `Ann` before and after clicking `Next user`. With the fix it said `Bob`.

**The fix (smallest change):** give the editor a key so a new user means a new instance with fresh state:

```jsx
import { useState } from 'react'

function ProfilePageFixed() {
  const [id, setId] = useState(1)
  return (
    <>
      <button onClick={() => setId(2)}>Next user</button>
      <ProfileEditor key={id} user={users[id]} />
    </>
  )
}
```

**The rule:** `useState` initial values are read once. To reset state when an identity changes, change the `key`. Other options: lift the state up, or derive the value instead of copying it.
**Why it matters / follow-up:** Do not fix this with an effect that copies the prop into state. It costs an extra render and still shows stale data for one frame.
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R3-BG-011 (Medium) A hook after an early return
**Answer:** `useEffect` is called after `if (!user) return`. While signed out, the component calls 1 hook (`useState`). After sign-in it calls 2. React expects the same hooks in the same order on every render, so it throws.

**Trace:**
1. Render with `user = null`: `useState` runs, then the early return. The effect hook is skipped.
2. Render with a user: `useState` runs, the `if` is false, and `useEffect` runs as a second hook.
3. React compares with the previous render and finds one more hook. It reports `React has detected a change in the order of Hooks called by Profile` and throws `Rendered more hooks than during the previous render.`

In the test, the buggy version threw this error on the second render. The fixed version rendered `Show name`.

**The fix:** call all hooks first, then return early. Put the condition inside the effect:

```jsx
import { useEffect, useState } from 'react'

function ProfileFixed({ user }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (user) document.title = user.name
  }, [user])

  if (!user) {
    return <p>Please sign in</p>
  }

  return <button onClick={() => setOpen(!open)}>{open ? user.name : 'Show name'}</button>
}
```

**The rule:** The rules of hooks: call hooks at the top level, in the same order every time. No hooks after an early return, inside conditions, loops or nested functions.
**Why it matters / follow-up:** React tracks hooks by call order, not by name. The ESLint plugin `react-hooks/rules-of-hooks` catches this.
**Learn more:** [hooks overview and rules](../../../02-hooks/01-hooks-overview-and-rules.md)

### R3-BG-012 (Easy) Replacing an object instead of merging it
**Answer:** `setForm({ name: ... })` replaces the whole state object, so `email` becomes `undefined`. `setForm({ email: ... })` drops `name` the same way. The inputs then flip between controlled and uncontrolled, which causes the warning.

**Trace:**
1. State starts as `{ name: '', email: '' }`.
2. Typing the name sets the state to `{ name: 'Ann' }`. `form.email` is now `undefined`.
3. Typing the email sets the state to `{ email: 'a@b.c' }`. `form.name` is now `undefined`.
4. The paragraph shows an empty name. The name input has `value={undefined}`, so React treats it as uncontrolled and the browser keeps showing `Ann`. The screen and the state disagree.

In the test the paragraph was `Hello , we will write to a@b.c` while the name box still showed `Ann`. With the fix it was `Hello Ann, we will write to a@b.c`.

**The fix:** copy the old fields, then change one:

```jsx
import { useState } from 'react'

function SignupFormFixed() {
  const [form, setForm] = useState({ name: '', email: '' })

  return (
    <form>
      <input
        aria-label="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        aria-label="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <p>
        Hello {form.name}, we will write to {form.email}
      </p>
    </form>
  )
}
```

**The rule:** `useState` setters replace the state; they do not merge like the old class `setState`. Spread the previous object. When another field depends on the previous state in an async place, use the updater form `setForm(f => ({ ...f, name }))`.
**Why it matters / follow-up:** For big forms, mention `useReducer` or a form library.
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)
