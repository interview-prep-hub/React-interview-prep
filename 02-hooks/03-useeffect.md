# useEffect

> **Level:** Intermediate   **Time:** about 75 minutes   **Read first:** [Hooks overview and rules](01-hooks-overview-and-rules.md), [useState in depth](02-usestate-in-depth.md)

## What you will learn
- Explain what an effect is for (keeping a component in sync with something outside React) and why it is not a "lifecycle method".
- Read the timeline of a render (render, commit, effect) and pick the right dependency array.
- Write cleanup functions for timers, listeners, subscriptions and network requests.
- Explain why effects run twice in development, and write effects that survive it.
- Fetch data in an effect without race conditions, and know when a library or a framework is the better tool.
- Fix stale closures and infinite loops, and decide when you do not need an effect at all.

## 1. What an effect is for

While a component renders, its job is small: take props and state, return JSX. That function must be **pure**. Pure means: the same inputs give the same output, and the function changes nothing outside itself. React may call your component more than once, pause it, or throw a render away, so a render must never do anything the outside world can notice.

Real apps still have to touch the outside world. They set the browser tab title, start timers, open connections, focus inputs. A change like that is called a **side effect**. React gives you two safe places for side effects:

- **Event handlers** run when the user does something (a click, a key press, a submit). Use them for "because the user did X".
- **Effects** run after React has put your component on the screen. Use them for "because this component is on screen with these props and state, something outside React must match".

An **external system** is anything React does not control: the browser's `document` and `window`, timers, the network, `localStorage`, a WebSocket, a map or chart library that was not written in React.

So the mental model is **synchronisation** (keeping two things matching). Think of a file-sync tool. You edit a file on your laptop, and the tool brings the cloud copy in line. When you stop using the folder, the tool disconnects. An effect has the same three parts:

1. **Setup:** the function you pass. It brings the outside world in line with the current props and state.
2. **Dependencies:** the list of values the setup reads. When one of them changes, the sync must be redone.
3. **Cleanup:** an optional function you return. It undoes the setup (disconnect, stop the timer, remove the listener).

Here is the smallest useful effect: keep the browser tab title in sync with a counter.

```jsx
import { useEffect, useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    document.title = `You clicked ${count} times`
  }, [count])

  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
}
```

**What happens, step by step:**
1. First render: `count` is `0`. React builds the JSX and puts the button on the screen.
2. After that, React runs the effect. It sets the tab title to `You clicked 0 times`.
3. The user clicks. `setCount(1)` asks for a new render, and the component runs again with `count` equal to `1`.
4. After this render is on the screen, React compares `[count]` with the previous list: `1` against `0`. They differ, so React runs the effect again. The title becomes `You clicked 1 times`.
5. If some other state changed but `count` did not, React would skip the effect. The title is already correct.

> React 19 can also render `<title>` from any component and moves it into the page `<head>` for you. The effect version is shown here because it teaches the idea, and the same idea applies to every other outside thing.

**Not a lifecycle method.** Class components had `componentDidMount`, `componentDidUpdate` and `componentWillUnmount`. It is tempting to read `useEffect` as "all three in one". That reading leads to bugs. The class question is "what should happen when the component mounts, updates, unmounts?". The effect question is "what outside thing must stay in sync with these values, and how do I start and stop that sync?". React decides when to start and stop, based on the values. See section 12 for the exact mapping and where it breaks.

**Common mistake:** doing the side effect directly in the component body.

```jsx
// Wrong: runs during render, which must stay pure
function Counter() {
  const [count, setCount] = useState(0)
  document.title = `You clicked ${count} times`
  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
}
```

```jsx
// Right: the side effect lives in an effect
useEffect(() => {
  document.title = `You clicked ${count} times`
}, [count])
```

Why: React can render a component several times (and, in development, it does on purpose). Work done in the body repeats, and it runs even for renders that never reach the screen.

## 2. The timeline: render, commit, effect

Every update goes through the same three steps:

```text
trigger (state or props change)
   -> RENDER: React calls your component function and gets JSX
   -> COMMIT: React updates the real DOM to match
   -> EFFECT: React runs your effects
```

Let us see it with logs. The component prints one line when it renders, and one line from inside its effect that reads what is on the screen at that moment.

```jsx
import { useEffect, useState } from 'react'

function Timeline() {
  const [n, setN] = useState(0)
  console.log('render, n =', n)

  useEffect(() => {
    console.log('effect, the screen text is "' + document.getElementById('out').textContent + '"')
  }, [n])

  return (
    <div>
      <p id="out">n is {n}</p>
      <button onClick={() => setN(n + 1)}>+1</button>
    </div>
  )
}
```

Output (React 19.3.1, one mount and one click):

```text
render, n = 0
effect, the screen text is "n is 0"
--- click
render, n = 1
effect, the screen text is "n is 1"
```

(The `--- click` line is added to show where the click happened. Reading the DOM with `getElementById` is only for this demo. Real code uses refs, see the [useRef](04-useref.md) lesson.)

**What happens, step by step:**
1. React calls `Timeline()`. It logs `render, n = 0` and returns JSX. Nothing is on the screen yet.
2. React commits: it creates the `<p>` and the `<button>` in the real DOM.
3. React runs the effect. The DOM already shows `n is 0`, so the log proves that effects run after the commit.
4. The click calls `setN(1)`. Steps 1 to 3 repeat with `n` equal to `1`.

Three facts to remember:

- **An effect sees the values of the render that created it.** Props and state are a snapshot for that render. The effect from the render with `n = 1` can only see `n = 1`.
- **Effects run after the commit, so the DOM is ready.** They never run while React is still rendering.
- **"After the commit" is not the same as "after the browser painted".** Usually the browser paints first and your effect runs a moment later. But when the update came from a click or a key press, React may run the effect before painting. The hook made for "before paint" is `useLayoutEffect` (section 11). A test in jsdom cannot show painting, so treat this as documented behaviour.

Also remember that effects do not run on the server. When a page is rendered to HTML on a server, only the render step happens.

**Common mistake:** expecting `setState` inside an effect to change the variable on the next line.

```jsx
useEffect(() => {
  setCount(5)
  console.log(count) // still the OLD value, for example 0
}, [])
```

```jsx
useEffect(() => {
  const next = 5
  setCount(next)
  console.log(next) // use the value you computed
}, [])
```

Why: `count` is a snapshot of this render. `setCount(5)` schedules the next render, in which `count` will be `5`.

## 3. The three dependency forms

The second argument of `useEffect` decides when the effect runs again. There are exactly three forms.

```jsx
import { useEffect, useState } from 'react'

function Forms() {
  const [a, setA] = useState(0)
  const [b, setB] = useState(0)

  useEffect(() => { console.log('A: no array') })
  useEffect(() => { console.log('B: empty array') }, [])
  useEffect(() => { console.log('C: [a]') }, [a])

  return (
    <div>
      <button onClick={() => setA(a + 1)}>a</button>
      <button onClick={() => setB(b + 1)}>b</button>
    </div>
  )
}
```

Output (mount, then a click on `a`, then a click on `b`):

```text
A: no array
B: empty array
C: [a]
--- click a
A: no array
C: [a]
--- click b
A: no array
```

| Form | When it runs |
|---|---|
| `useEffect(fn)` | After every render. |
| `useEffect(fn, [])` | After the first render only. (In development with StrictMode it also runs a second time, see section 6.) |
| `useEffect(fn, [a, b])` | After the first render, and after any later render where `a` or `b` changed. |

**What happens, step by step:**
1. On mount all three effects run, in the order they are written.
2. Clicking `a` changes state, so the component renders again. A has no array, so it runs. B has an empty array, so it never runs again. C lists `a`, and `a` changed, so it runs.
3. Clicking `b` also renders again. A runs. C does not, because `a` is the same as before.

**Which values go in the array?** The array is not a free choice, and it is not a performance switch. It is a statement of fact: "this effect reads these values". Put in every **reactive value** the effect uses. A reactive value is a prop, a state variable, or anything you declare in the component body (including functions). You do not list module-level constants, imports, or state setter functions such as `setCount` (React guarantees they never change). The ESLint rule `react-hooks/exhaustive-deps` checks this for you. Keep it on.

**Common mistake:** writing `[]` to "run once" while the effect reads props or state.

```jsx
// Wrong: the title is set once and never follows `name`
useEffect(() => {
  document.title = `Hello ${name}`
}, [])
```

```jsx
// Right: list what the effect reads
useEffect(() => {
  document.title = `Hello ${name}`
}, [name])
```

Why: with `[]` the effect keeps the `name` from the first render forever. I ran it: after changing `name` from "Ada" to "Grace" the title still said "Hello Ada".

## 4. How React compares dependencies

After each render, React compares every value in the array with its value from the previous render. It uses `Object.is`. It is almost the same as `===`: two values are equal when they are the very same value. If all values are equal, the effect is skipped. If even one differs, the effect runs.

`Object.is` results you should know (checked by running them):

```js
Object.is(1, 1)         // true
Object.is('a', 'a')     // true
Object.is({}, {})       // false: two different objects, even if they look the same
Object.is([1, 2], [1, 2]) // false: two different arrays
Object.is(NaN, NaN)     // true (plain === says false here)
Object.is(0, -0)        // false (plain === says true here)
```

Numbers, strings and booleans are compared by value. Objects, arrays and functions are compared by **reference** (are they the same object in memory?). And every render runs your component body from the top, so an object, array or function you write in the body is a brand new one each time.

```jsx
import { useEffect } from 'react'
import { createConnection } from './chat.js' // a stand-in for a real chat library

function ChatRoom({ roomId }) {
  const options = { roomId } // a NEW object on every render

  useEffect(() => {
    const connection = createConnection(options.roomId)
    connection.connect()
    return () => connection.disconnect()
  }, [options]) // changes on every render, so the effect runs on every render

  return <p>Room: {roomId}</p>
}
```

Here is the stand-in library, so you can paste the example:

```js
// chat.js
export function createConnection(roomId) {
  return {
    connect() { console.log('connect', roomId) },
    disconnect() { console.log('disconnect', roomId) },
  }
}
```

**What happens, step by step:**
1. Render 1 builds `options` (object #1). The effect runs and connects.
2. The parent re-renders for some unrelated reason. Render 2 builds `options` again: object #2. It looks the same, but `Object.is(#1, #2)` is `false`.
3. React sees a changed dependency. It runs the cleanup (disconnect) and then the effect (connect), although `roomId` did not change.

I ran this inside a parent that has an unrelated counter button, and clicked that button twice. The log was `connect general`, then `disconnect general` and `connect general` after each of the two re-renders. A chat connection that drops and reconnects on every render is a real bug.

**Fixes, in order of preference:**

1. **Create the object inside the effect** and depend on the primitive values it is made from.

```jsx
useEffect(() => {
  const options = { roomId }
  const connection = createConnection(options.roomId)
  connection.connect()
  return () => connection.disconnect()
}, [roomId]) // a string: compared by value
```

2. **Depend on primitives** (`roomId`, `user.id`) instead of the whole object (`user`), when the effect only reads those fields.
3. **Move constant objects and functions outside the component.** A value defined at module level is created once.
4. **Stabilise with `useMemo` or `useCallback`** when the object or function must come from the component body (see [Memoization](07-memoization.md)). This is the last resort.

The same holds for **functions**. A function declared in the body is a new function on every render, so it is a "changing" dependency. Declare the function inside the effect when only the effect uses it.

> The React Compiler can memoize objects and functions in components automatically, which may hide this problem. Do not rely on that. Write effects that stay correct even when a dependency changes identity: not every project uses the compiler, and it leaves alone any code that breaks the Rules of React.

**Common mistake:** putting an object or array literal straight into the array.

```jsx
// Wrong: an object literal is a new object on every render
useEffect(() => { /* ... */ }, [{ roomId }])
```

```jsx
// Right
useEffect(() => { /* ... */ }, [roomId])
```

Why: a literal inside the array is created again on every render, so `Object.is` never says "equal".

## 5. Cleanup: undoing the setup

The function you return from an effect is the **cleanup**. React calls it in two situations:

1. **Before the effect runs again** (because a dependency changed). The cleanup uses the OLD values, from the render that created it.
2. **When the component unmounts** (is removed from the screen).

It does not run right after the very first setup (apart from the development check in section 6).

```jsx
import { useEffect, useState } from 'react'
import { createConnection } from './chat.js'

function Room({ roomId }) {
  useEffect(() => {
    const connection = createConnection(roomId)
    connection.connect()
    return () => connection.disconnect()
  }, [roomId])

  return <h2>Room: {roomId}</h2>
}

function RoomDemo() {
  const [roomId, setRoomId] = useState('general')
  const [show, setShow] = useState(true)
  return (
    <div>
      <button onClick={() => setRoomId('travel')}>Go to travel</button>
      <button onClick={() => setShow(false)}>Hide</button>
      {show && <Room roomId={roomId} />}
    </div>
  )
}
```

Log (mount, then "Go to travel", then "Hide"):

```text
connect general
--- go to travel
disconnect general
connect travel
--- hide
disconnect travel
```

**What happens, step by step:**
1. Mount: the effect connects to `general`. React remembers the cleanup function it returned.
2. Click "Go to travel": `roomId` changes. Before running the effect again, React calls the remembered cleanup. It still knows `general`, because that closure belongs to the old render. So it disconnects `general`.
3. The new effect connects to `travel` and returns a new cleanup.
4. Click "Hide": the component unmounts, so React calls the last cleanup and disconnects `travel`.

The rule for writing cleanup: **it must undo exactly what the setup did.**

| Setup | Cleanup |
|---|---|
| `setInterval(fn, ms)` | `clearInterval(id)` |
| `setTimeout(fn, ms)` | `clearTimeout(id)` |
| `window.addEventListener('x', fn)` | `window.removeEventListener('x', fn)` (the same `fn`) |
| `socket = new WebSocket(url)` | `socket.close()` |
| `store.subscribe(fn)` | the unsubscribe function it returns |
| `fetch(url, { signal })` | `controller.abort()` |
| `observer.observe(node)` | `observer.disconnect()` |

**Many effects, which order?** When several effects change at the same time, React runs **all** cleanups first and **then** all setups. I measured the order for a parent and a child that both have a `useEffect` (React 19.3.1, no StrictMode):

```text
mount:    child effect, parent effect          (children first)
update:   child cleanup, parent cleanup, child effect, parent effect
unmount:  parent cleanup, child cleanup        (parent first)
```

Layout effects (section 11) run before passive effects in the same way. You rarely need this, but interviewers like it (see the practice items).

Good news: in React 19 you do not need an "is it still mounted?" flag to avoid the old warning "Can't perform a React state update on an unmounted component". That warning was removed. You still need cleanup for races (section 7).

**Common mistake:** a listener without cleanup, or a cleanup that removes a different function.

```jsx
// Wrong: every mount adds one more listener, none is ever removed
useEffect(() => {
  window.addEventListener('resize', () => setWidth(window.innerWidth))
}, [])
```

```jsx
// Right: name the function so the SAME one is added and removed
useEffect(() => {
  function handleResize() {
    setWidth(window.innerWidth)
  }
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

Why: `removeEventListener` only removes the exact function you added. A second arrow function with the same body is a different function.

## 6. StrictMode: why effects run twice in development

New projects made with Vite wrap the app in `<StrictMode>` in `main.jsx`. In **development only**, StrictMode adds extra checks. Two of them matter here:

- It renders every component twice, to catch render code that is not pure.
- After a component mounts, it runs the effect **one extra time**: setup, then cleanup, then setup again. It simulates "the user left and came back".

Why would React do that? Because a real app can unmount and remount a component (a route change, `<Activity>`, a conditional), and an effect that only works the first time is a bug. If your cleanup truly undoes your setup, "setup, cleanup, setup" ends up in the same place as a single "setup", and you never notice. If it does not, the extra cycle exposes the bug while you are still developing. In production builds none of this happens: the effect runs once.

Here is the room example from section 5, now inside `<StrictMode>`:

```text
connect general
disconnect general
connect general
--- go to travel
disconnect general
connect travel
--- hide
disconnect travel
```

The first three lines are the extra check. After them, the behaviour is the same as before.

Now a component that fails the check. It starts a timer and forgets to stop it:

```jsx
// Wrong: no cleanup
function Seconds() {
  const [s, setS] = useState(0)
  useEffect(() => {
    setInterval(() => setS((x) => x + 1), 1000)
  }, [])
  return <p>{s}</p>
}
```

**What happens, step by step, inside `<StrictMode>`:**
1. React mounts the component and runs the effect. Timer A starts.
2. StrictMode simulates "leaving": it runs the cleanup. There is none, so timer A keeps running.
3. StrictMode simulates "coming back": it runs the effect again. Timer B starts.
4. Every second both timers add 1, so the counter goes up by 2 instead of 1.

I ran it for three fake seconds: the screen said **6** instead of 3. Add the cleanup and it says 3:

```jsx
// Right
useEffect(() => {
  const id = setInterval(() => setS((x) => x + 1), 1000)
  return () => clearInterval(id)
}, [])
```

Even without StrictMode the bug is real: the timer would keep running after the component is gone.

**What to do about the double run:**

- **Do not fight it.** Do not remove StrictMode, and do not add a `useRef` flag such as `didRun` to skip the second run. If removing StrictMode "fixes" your page, you have a missing cleanup.
- **Make setup and cleanup symmetric.** Connect and disconnect. Subscribe and unsubscribe. Start and stop.
- **Some work is fine to run twice.** Setting a title, focusing an input and sending a "page viewed" analytics event are harmless; in development you just see the event twice.
- **Some work does not belong in an effect.** A purchase request must not run because a component appeared (it would fire twice in development and could repeat in production). Put it in the submit handler (section 10).
- **One-time app setup** (for example reading a token, or configuring a library) belongs at module level in your entry file, not inside a component effect.

The extra cycle happens for every component that mounts inside StrictMode, not only on the first page load. It does not repeat when a mounted component only updates. Since React 19.3 it also happens while hydrating server-rendered HTML.

The simulated "leave and come back" is not just a test. React's `<Activity>` component can hide a part of the screen while keeping its state. When it hides a subtree, React runs the cleanups of that subtree's effects, and when it shows the subtree again, React runs the setups again. Effects with a complete cleanup need no changes for that.

**Common mistake:** a ref flag to run an effect "only once".

```jsx
// Wrong: hides the problem, breaks when the component is shown again
const didRun = useRef(false)
useEffect(() => {
  if (didRun.current) return
  didRun.current = true
  startSomething()
}, [])
```

```jsx
// Right: make it safe to repeat
useEffect(() => {
  const stop = startSomething()
  return () => stop()
}, [])
```

Why: the flag stops the second run in development, but a real remount in production would then do nothing, and nothing would ever stop `startSomething`.

## 7. Fetching data in an effect, done right

Loading data from a server is a common use of effects, and the place where most bugs hide. We build it in steps. First the bug, then the fixes.

The examples use a fake `fetchUser(id)` so you can paste them with no network. User 1 is slow (2 seconds) and the others are fast (0.3 seconds). Real servers behave like this too: answers do not always come back in the order you asked.

```jsx
import { useEffect, useState } from 'react'

function fetchUser(id) {
  const delay = id === 1 ? 2000 : 300
  return new Promise((resolve) => {
    setTimeout(() => resolve({ id, name: `User ${id}` }), delay)
  })
}

function Profile({ id }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetchUser(id).then((data) => setUser(data)) // no protection
  }, [id])

  return <p>{user ? user.name : 'Loading...'}</p>
}

function App() {
  const [id, setId] = useState(1)
  return (
    <>
      <button onClick={() => setId(2)}>Show user 2</button>
      <Profile id={id} />
    </>
  )
}
```

**The race condition, step by step** (I ran this with fake timers):
1. At time 0, `Profile` mounts with `id = 1`. The effect asks for user 1. The answer will come at 2000 ms. The screen says `Loading...`.
2. At 500 ms the user clicks "Show user 2". `id` becomes `2`, and the effect runs again. It asks for user 2. The answer will come at 800 ms.
3. At 800 ms user 2 arrives. `setUser` runs. The screen says `User 2`. Correct so far.
4. At 2000 ms the OLD request for user 1 finally arrives. Its `.then` still calls `setUser`. The screen now says `User 1`, although `id` is `2`.

That is a **race condition**: two requests race, and the one that was sent first finishes last, so old data overwrites new data.

**Fix 1: the ignore flag.** Use the cleanup to mark the old effect run as outdated.

```jsx
useEffect(() => {
  let ignore = false

  fetchUser(id).then((data) => {
    if (!ignore) setUser(data)
  })

  return () => {
    ignore = true
  }
}, [id])
```

**Why it works:** each run of the effect creates its own `ignore` variable. When `id` changes, React runs the cleanup of the old run, which sets that run's `ignore` to `true`. When the old answer arrives, `if (!ignore)` is false and the answer is dropped. In my run the screen showed `User 2` at 800 ms and still `User 2` at 2300 ms.

**Fix 2: AbortController.** The ignore flag stops stale answers from being used. `AbortController` goes further and cancels the browser request itself, which saves bandwidth. It works with `fetch`.

Here is the full pattern with loading, error and cancel:

```jsx
import { useEffect, useState } from 'react'

function UserProfile({ id }) {
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(`https://jsonplaceholder.typicode.com/users/${id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setUser(data)
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return // we cancelled it on purpose
        setError(err)
        setLoading(false)
      })

    return () => controller.abort()
  }, [id])

  if (loading) return <p>Loading...</p>
  if (error) return <p role="alert">Something went wrong: {error.message}</p>
  return <h2>{user.name}</h2>
}
```

**What happens, step by step:**
1. The effect creates an `AbortController`, resets `loading` and `error`, and starts the request with the controller's `signal`.
2. If the answer is not OK (a 404, a 500), the first `.then` throws. `fetch` does **not** reject for HTTP errors on its own, so `res.ok` must be checked by hand.
3. On success the data and `loading = false` are stored. The two `set` calls are batched into one render.
4. If `id` changes (or the component unmounts) before the answer arrives, React runs the cleanup. `controller.abort()` cancels the request, and `fetch` rejects with an `AbortError`.
5. The `catch` recognises `AbortError` and returns without touching state. Any other error goes to the screen.

I tested this component with a mock `fetch` that honours `signal`. In plain mode it made one request. Inside `<StrictMode>` it made two (the first was aborted by the extra cleanup), showed the data from the second, and never showed an error. That is exactly what you want: the double request in development is just StrictMode checking your cleanup.

Use the ignore flag for anything that cannot be cancelled (a promise from a library, a timer), and `AbortController` for `fetch`. You can use both.

**Can the effect callback be `async`?** No. An `async` function always returns a promise, and React expects the callback to return nothing or a cleanup function.

```jsx
// Wrong
useEffect(async () => {
  const res = await fetch(url)
  setData(await res.json())
}, [url])
```

I ran this. On mount React logs "must not return anything besides a function, which is used for clean-up". On unmount it crashes with `TypeError: destroy is not a function`, because React tries to call the promise as the cleanup. Declare an async function inside the effect instead, and call it:

```jsx
// Right
useEffect(() => {
  let ignore = false
  async function load() {
    const res = await fetch(url)
    const json = await res.json()
    if (!ignore) setData(json)
  }
  load()
  return () => {
    ignore = true
  }
}, [url])
```

**Is this the best way to fetch?** It is the right way to do it by hand, but usually not the best way to do it. Hand-written effect fetching has known costs: no caching (going back refetches), request waterfalls (a child only starts loading after its parent rendered), nothing happens on the server so the first HTML has no data, and a lot of repeated code. Prefer:

- the data features of your framework (Next.js, React Router loaders),
- a data library such as TanStack Query,
- Suspense with `use` and a promise that is cached outside the component,
- Server Components, where data loads on the server before any JavaScript reaches the browser.

If you must hand-write it, put the effect in a custom hook such as `useFetch` so you can swap it later (see [Custom hooks](08-custom-hooks.md)). The full story is in [Data fetching](../03-intermediate/02-data-fetching.md), and you can practise it in the exercise [fetch list with retry](../practice-app/exercises/react/15-fetch-list-retry/README.md).

> The newer lint rule `react-hooks/set-state-in-effect` (in `eslint-plugin-react-hooks` 7.x) is aimed at calling `setState` synchronously in the body of an effect, such as the `setLoading(true)` line at the top above. Setting state later, inside a callback or after an `await`, is the normal case. If the rule complains about the reset lines, one calm answer is to give the component a `key` so its state starts fresh for each id.

**Common mistake:** no cleanup on the request, and no handling of errors or empty states.

```jsx
// Wrong: can race, ignores HTTP errors, has no error state
useEffect(() => {
  fetch(url).then((r) => r.json()).then(setData)
}, [url])
```

```jsx
// Right: abort on cleanup, check res.ok, keep an error state
useEffect(() => {
  const controller = new AbortController()
  fetch(url, { signal: controller.signal })
    .then((res) => {
      if (!res.ok) throw new Error(`Status ${res.status}`)
      return res.json()
    })
    .then(setData)
    .catch((err) => {
      if (err.name !== 'AbortError') setError(err)
    })
  return () => controller.abort()
}, [url])
```

Why: three things can go wrong with any request: it can arrive late (race), it can fail, and it can be slow. Show a state for each.

## 8. Stale closures in effects

A **closure** is a function that remembers the variables around it from when it was created. Every render creates new functions, and each one remembers that render's props and state. A **stale closure** is a function that still remembers old values when you expected fresh ones.

The classic trap is a timer inside an effect with `[]`:

```jsx
import { useEffect, useState } from 'react'

function Ticker() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1) // `count` here is always 0
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return <p>{count}</p>
}
```

**What happens, step by step:**
1. The first render has `count = 0`. The effect runs once (empty array) and its interval callback remembers `count = 0`.
2. After 1 second the callback runs `setCount(0 + 1)`. The state becomes `1`.
3. The component re-renders with `count = 1`. But `[]` means the effect does not run again, so the interval still holds the callback from render 1.
4. After 2 seconds the callback runs `setCount(0 + 1)` again. `1` is set again. Nothing changes.

I ran it for five fake seconds: the screen said **1**.

**Fixes, from simplest to most advanced:**

**1. Functional update.** If you only need the previous state to compute the next one, do not read the variable at all.

```jsx
setCount((c) => c + 1) // React passes the latest state in
```

After five fake seconds the screen said 5. This is the best fix for counters and toggles, and the effect keeps its `[]`.

**2. Add the value to the dependencies.** Correct, and the linter asks for it. The effect restarts whenever the value changes.

```jsx
useEffect(() => {
  const id = setTimeout(() => setCount(count + 1), 1000)
  return () => clearTimeout(id)
}, [count])
```

I switched to `setTimeout` here, because restarting a `setInterval` on every tick is wasteful. This reached 5 after five fake seconds too. Use this when the effect really should restart with the value (a new room id, a new search text).

**3. Keep the latest value in a ref.** Use this when a long-lived callback must read fresh values but you do not want to restart the effect. A **ref** (see the [useRef](04-useref.md) lesson) is a box whose `.current` you can change without causing a render.

```jsx
import { useEffect, useRef, useState } from 'react'

function Logger({ onLog }) {
  const [count, setCount] = useState(0)
  const countRef = useRef(count)

  useEffect(() => {
    countRef.current = count // keep the box fresh after every render
  })

  useEffect(() => {
    const id = setInterval(() => onLog('count is ' + countRef.current), 1000)
    return () => clearInterval(id)
  }, [onLog])

  return <button onClick={() => setCount(count + 1)}>Add</button>
}
```

After two clicks, the next tick logged `count is 2`, while the interval was never restarted.

**4. `useEffectEvent`.** This hook is made for exactly the situation in fix 3.

An **Effect Event** is a function that you define with `useEffectEvent`. It always sees the latest props and state, and it is not a dependency. You call it from inside an effect.

```jsx
import { useEffect, useEffectEvent } from 'react'
import { createConnection } from './chat.js'

function Room({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showToast('Connected to ' + roomId, theme) // always the latest theme
  })

  useEffect(() => {
    const connection = createConnection(roomId)
    connection.connect()
    onConnected()
    return () => connection.disconnect()
  }, [roomId]) // theme is not needed here

  return <h2>{roomId}</h2>
}
```

(`showToast` is any function that shows a message.) I ran it: the room connected once, and changing `theme` from light to dark did **not** reconnect. Changing `roomId` did disconnect and reconnect, and the toast used the dark theme.

**Is `useEffectEvent` stable?** Yes. It became stable in React 19.2 (October 2025) and it is in 19.3.1. Some older articles and answers still call it "experimental". That is out of date. It is still new, so older codebases (React 18 or early 19) do not have it, and for those you use the ref pattern from fix 3. It has strict rules:

- Call it only from inside effects (or from another Effect Event of the same component). Never during render.
- Never pass it to a child component, and never put it in a dependency array. Its identity changes on every render on purpose.
- Do not use it just to silence the lint rule. If a value should restart the sync (like `roomId`), it is a real dependency.

Effect Events are covered again in [Other hooks](09-other-hooks.md).

**Handlers have snapshots too.** Event handlers are closures as well. Say a button handler runs `setCount(count + 1)` and also starts `setTimeout(() => alert(count), 3000)`. Each timer remembers the `count` of the render in which its click happened. I clicked three times and waited: the three timers reported 0, 1 and 2, while the button already said 3. That is correct behaviour, not a bug. State is a snapshot of one render.

**Never silence `exhaustive-deps`.** Writing `// eslint-disable-next-line react-hooks/exhaustive-deps` hides the stale closure instead of fixing it. When the linter complains, change the code: use a functional update, move the value inside the effect, add it to the array, or use an Effect Event.

**Common mistake:** silencing the linter to keep `[]`.

```jsx
// Wrong
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000)
  return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

```jsx
// Right
useEffect(() => {
  const id = setInterval(() => setCount((c) => c + 1), 1000)
  return () => clearInterval(id)
}, [])
```

Why: the linter was right. The functional update removes the need for `count` and the array can honestly stay empty.

## 9. Infinite loops

An effect can cause a render, and a render can run the effect again. If each pass changes something, you get a loop that never ends. The tab becomes slow or freezes, and in development React prints a "Maximum update depth exceeded" warning.

**Cause 1: setting state that is also a dependency.**

```jsx
function Bad() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(count + 1) // changes count...
  }, [count]) // ...which re-runs this effect

  return <p>{count}</p>
}
```

**What happens, step by step:**
1. Render with `count = 0`. The effect runs and sets `count` to `1`.
2. Render with `count = 1`. `[count]` changed (0 to 1), so the effect runs and sets `2`.
3. Render with `count = 2`. The effect runs again. And so on, for ever.

I mounted this and let it run: the counter passed 120 and was still going. React printed a development warning that starts "Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render." That sentence names the two usual causes. (Setting a state to the value it already has does NOT loop: React sees no change and stops. The loop needs a value that changes every time.)

**Cause 2: no dependency array and a state update.** An effect with no array runs after every render. If it sets state to something new each time, the loop is the same.

```jsx
useEffect(() => {
  setItems([...items, 'x']) // new array, so a new render, so this effect again
}) // no array
```

**Cause 3: an object, array or function dependency that is new on every render** (section 4), combined with a state update inside the effect. This one is sneaky because the effect does not set a dependency directly.

```jsx
function Results({ type }) {
  const [rows, setRows] = useState([])
  const filters = { type } // new object each render

  useEffect(() => {
    search(filters).then(setRows) // new array of rows each time
  }, [filters])

  return <p>{rows.length} rows</p>
}
```

**What happens, step by step:**
1. Render 1: `filters` is object #1. The effect runs and starts a search.
2. The search finishes, and `setRows` stores a new array. React renders again.
3. Render 2: `filters` is object #2, a different object. React sees a changed dependency and runs the effect, which starts another search.
4. Go back to step 2. The component searches again and again, and each answer causes the next search.

I ran this with a fake instant search: it made more than fifty searches in 150 ms. With `[type]` as the dependency it made exactly **one**.

**How to fix it, in this order:**

1. **Ask whether you need the effect.** Many loops come from effects that copy data into state (section 10). Compute it in render instead.
2. **Make dependencies stable:** use primitives (`[type]`), build objects inside the effect, or memoize them.
3. **Use a functional update** when you only need the previous state, and keep the state out of the array.
4. **Add a condition** so the update only happens when something really changed.
5. **Never fix a loop by deleting dependencies** or silencing the linter. That hides a stale closure and the bug comes back in another shape.

To find which dependency keeps changing, log them inside the effect (`console.log(filters)`), or compare them in a small test with `Object.is`.

**Common mistake:** a state update in an effect that lists the same state.

```jsx
// Wrong: loops
useEffect(() => { setCount(count + 1) }, [count])
```

```jsx
// Right: if you wanted to count clicks, update the counter in the click handler
function handleClick() {
  setCount((c) => c + 1)
}
```

Why: a counter that follows something the user does should change when the user does it. An effect that changes its own dependency has no natural stopping point.

## 10. You might not need an effect

The most useful skill with effects is knowing when **not** to write one. The official guidance is short: effects are for synchronising with external systems. If there is no external system, you probably do not need an effect. Two situations never need one:

- **Transforming data for rendering.** Calculate it during render.
- **Handling a user event.** Put the code in the event handler.

An extra effect usually costs an extra render, and often shows a wrong value for one frame. Here is a map:

| You want to... | Do this instead of an effect |
|---|---|
| Compute a value from props or state | Calculate it during render |
| Cache an expensive calculation | `useMemo` (measure first) |
| Reset all state when a prop changes | Give the component a `key` |
| Change part of the state when a prop changes | Store an id and derive the rest |
| Do something because of a click or submit | Put it in the event handler |
| Run a chain of updates | Do all of it in one handler |
| Notify the parent about a change | Call the parent's function in the same handler |
| Run app-wide setup once | Module-level code, not a mount effect |
| Read a browser value that changes (online status) | `useSyncExternalStore` |
| Load data | Framework or library; an effect with cleanup if you must |

### 10.1 Derived data

```jsx
// Bad: stores something that can be computed, and syncs it with an effect
function Form() {
  const [first, setFirst] = useState('Ada')
  const [last, setLast] = useState('Lovelace')
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    setFullName(first + ' ' + last)
  }, [first, last])

  // ...inputs that call setFirst and setLast, and show fullName
}
```

```jsx
// Good: calculate during render
const fullName = first + ' ' + last
```

**What happens in the bad version:** the first render shows `fullName` as an empty string. The effect then sets it, which triggers a second render with the right value. I logged the renders: `render, fullName = ""` and then `render, fullName = "Ada Lovelace"`. After a click that changes `first`, it was again two renders, with the old name shown first. The good version renders once per change, with the right value.

The rule: if you can calculate it from props and state, it is not state. For slow calculations, wrap the expression in `useMemo` (see [Memoization](07-memoization.md)).

### 10.2 Reset state when a prop changes: use `key`

```jsx
// Bad: the comment box keeps the old user's text for one render, then an effect clears it
function CommentBox({ userId }) {
  const [comment, setComment] = useState('')

  useEffect(() => {
    setComment('')
  }, [userId])
  // ...
}
```

```jsx
// Good: a different key makes React throw the old component away and start a fresh one
<CommentBox key={userId} userId={userId} />
```

**What happens in the bad version:** when `userId` changes from 1 to 2, the component renders first with `userId = 2` and the old text `"hi"` (so the new user briefly sees the old comment), then the effect clears it, then it renders again. With `key`, React sees a different key, unmounts the old instance (and all its state) and mounts a new one: the first render for user 2 already has an empty comment.

If only some state should reset, store an id instead of an object and derive the rest:

```jsx
const [selectedId, setSelectedId] = useState(null)
const selected = items.find((item) => item.id === selectedId) ?? null // always valid
```

More on this in [useState in depth](02-usestate-in-depth.md).

### 10.3 Event logic belongs in event handlers

An effect cannot tell **why** it is running. A handler knows exactly what the user did.

```jsx
// Bad: also fires when the page loads with the item already in the cart
useEffect(() => {
  if (product.isInCart) {
    showToast(`Added ${product.name} to the cart`)
  }
}, [product])
```

```jsx
// Good: only after the click
function handleBuyClick() {
  addToCart(product)
  showToast(`Added ${product.name} to the cart`)
}
```

The same applies to sending data. A form POST belongs in `handleSubmit`, not in an effect that watches a "submitted" state.

```jsx
function handleSubmit(event) {
  event.preventDefault()
  post('/api/register', { firstName, lastName })
}
```

A test you can use: *"Did this happen because the user did something, or because the component is on the screen?"* A click or submit means a handler. "The page was shown" (an analytics page view, opening a connection) means an effect. If two handlers share logic, put it in a normal function and call it from both.

### 10.4 Chains of effects

```jsx
// Bad: three renders, and a moment with a wrong combination (country US, city "Pune")
useEffect(() => { setCity('') }, [country])
useEffect(() => { setPostcode('') }, [city])
```

```jsx
// Good: one handler, one render
function handleCountryChange(nextCountry) {
  setCountry(nextCountry)
  setCity('')
  setPostcode('')
}
```

I logged the bad version after changing the country: the component rendered with the new country and the old city and postcode, then with the city cleared and the old postcode, then with everything cleared. In the handler version all three updates are batched into one render.

### 10.5 Telling the parent

```jsx
// Bad: the parent is told after the render, and also once on mount
useEffect(() => {
  onChange(isOn)
}, [isOn, onChange])
```

```jsx
// Good: tell the parent in the same event that changed the state
function handleClick() {
  const next = !isOn
  setIsOn(next)
  onChange(next)
}
```

I ran both. The effect version called `onChange(false)` on mount, before the user did anything, and called it again on the click. The handler version called it only on the click. Better still, when parent and child would hold the same value twice, let the parent own the state and pass it down (a controlled component, see [Thinking in React](../01-basics/08-thinking-in-react.md)). In the same way, do not fetch in a child just to hand the data up: let the parent fetch it and pass it down.

### 10.6 One-time app setup

```jsx
// Bad: runs twice in development, and again whenever App remounts
function App() {
  useEffect(() => {
    checkAuthToken()
  }, [])
}
```

```js
// Good: at module level of your entry file, runs once per page load
if (typeof window !== 'undefined') {
  checkAuthToken()
}
```

If the code is safe to run twice (idempotent), leaving it in an effect is also acceptable. The point is not to depend on "exactly once".

### 10.7 Subscribing to an external store: `useSyncExternalStore`

Reading something that changes outside React (the online status, the window size, a store) with an effect and a state variable works, but it is easy to get wrong:

```jsx
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true) // a guess, until the effect runs

  useEffect(() => {
    function update() {
      setIsOnline(navigator.onLine)
    }
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

The better tool is `useSyncExternalStore`. You give it two functions: how to **subscribe** (it returns the unsubscribe function) and how to **read the current value**. A third function gives the value to use during server rendering.

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

function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine, // read the value now
    () => true, // value to use on the server
  )
}
```

I tested both versions in jsdom by dispatching `offline` and `online` events: both showed "Offline" and "Online" correctly. The difference is under the hood. The effect version starts with a guess and corrects it after the first render. `useSyncExternalStore` reads the real value during the first render and also keeps every component consistent when React renders in the background (a problem called tearing, where two parts of the screen show different values of the same store). Many state libraries are built on it. More in [Other hooks](09-other-hooks.md).

### 10.8 When an effect IS the right tool

Effects are right when the component's being on screen needs an outside system to match: open and close a connection, start and stop a timer, add and remove a listener, call a method on a non-React widget, send a "page viewed" event, focus an input, fetch data (with cleanup). If you can name the outside system, an effect is probably correct. If you cannot, look for a simpler way first.

> A modern lint rule backs this up. `react-hooks/set-state-in-effect`, in the recommended preset of `eslint-plugin-react-hooks` 7.x, is aimed at state updates made synchronously in an effect body, which are often a sign of an effect that should have been plain render code.

**Common mistake:** copying props into state and syncing with an effect.

```jsx
// Wrong
const [value, setValue] = useState(props.value)
useEffect(() => { setValue(props.value) }, [props.value])
```

```jsx
// Right: use the prop directly, or lift state up
const value = props.value
```

Why: the copy lags one render behind, and now there are two sources of truth.

## 11. useEffect vs useLayoutEffect

Both hooks have the same shape (setup, dependencies, cleanup). The difference is **when** they run.

| | `useEffect` | `useLayoutEffect` |
|---|---|---|
| When it runs | After the commit, usually after the browser has painted (it may run earlier after a click) | Right after the DOM is updated, before the browser paints |
| Blocks the paint? | No | Yes, a slow layout effect delays what the user sees |
| Use it for | Almost everything: fetching, subscriptions, timers, logging, analytics | Reading layout (size, position) and changing the DOM or state before paint to avoid a flicker |
| Order | Runs after layout effects | Runs first |
| Default choice | Yes | Only when you can see a flicker |

A typical use of `useLayoutEffect` is positioning a tooltip: you must measure the tooltip with `getBoundingClientRect()`, then move it. With `useEffect` the user could see the tooltip in the wrong place for one frame, then jump. With `useLayoutEffect`, you measure, call `setState`, and React re-renders **before** painting, so the user never sees the wrong frame. A state update made inside `useLayoutEffect` is processed synchronously, before the browser gets a chance to paint (React counts it as a nested update). An update made inside `useEffect` is an ordinary later update.

Two more points:

- Both are skipped on the server. Old advice says to avoid `useLayoutEffect` in server-rendered apps because of a warning. React 19.3.1 prints no such warning for it.
- Start with `useEffect`. Switch only when you see a visible jump caused by measuring.

The deeper details, including `useInsertionEffect` for CSS-in-JS libraries, are in [Other hooks](09-other-hooks.md).

**Common mistake:** measuring the DOM in `useEffect` and getting a flash.

```jsx
// Wrong: the tooltip is painted at the wrong spot first
useEffect(() => {
  setHeight(ref.current.getBoundingClientRect().height)
}, [])
```

```jsx
// Right: measure before paint
useLayoutEffect(() => {
  setHeight(ref.current.getBoundingClientRect().height)
}, [])
```

Why: a layout effect runs before the paint, so the corrected render replaces the first one before anyone sees it.

## 12. Class lifecycle methods and useEffect

Interviewers still ask for the mapping, especially when you read or migrate older code (see Legacy React (planned)). It is only a rough guide.

| Class (legacy) | Hooks |
|---|---|
| `componentDidMount` | `useEffect(fn, [])` (it runs twice in development with StrictMode) |
| `componentDidUpdate` | `useEffect(fn, [deps])` (it also runs after mount) |
| `componentWillUnmount` | the cleanup function returned from the effect |
| mount + unmount pair | one effect with setup and cleanup |
| `shouldComponentUpdate` / `PureComponent` | `React.memo` |
| `getDerivedStateFromProps` | calculate in render, or use `key` |
| `getSnapshotBeforeUpdate`, `componentDidCatch`, `getDerivedStateFromError` | no hook version; error boundaries are still classes (or use the `react-error-boundary` package) |

A class component that keeps the tab title in sync:

```jsx
import { Component } from 'react'

class Title extends Component {
  componentDidMount() {
    document.title = this.props.text
  }
  componentDidUpdate(prevProps) {
    if (prevProps.text !== this.props.text) {
      document.title = this.props.text
    }
  }
  render() {
    return <h1>{this.props.text}</h1>
  }
}
```

The function version is shorter, and it cannot forget the update case:

```jsx
function Title({ text }) {
  useEffect(() => {
    document.title = text
  }, [text])

  return <h1>{text}</h1>
}
```

**Why the mapping is only approximate:**
- A class splits one job across three methods, and you must remember to keep them consistent (a classic bug: the chat room class that connects in `componentDidMount` but forgets to reconnect in `componentDidUpdate` when `roomId` changes). One effect handles start, change and stop together.
- `componentDidMount` runs once per mount. An effect with `[]` also runs once per mount, but in development it runs the setup twice, so code that is "mount-only" must be safe to repeat.
- Effects run after paint (usually). `componentDidMount` runs synchronously after the DOM is updated, like `useLayoutEffect`.
- The effect function does not receive `prevProps`. If you need the old value, keep it in a ref.

**Common mistake:** copying the "did it change?" check from `componentDidUpdate` into the effect.

```jsx
// Wrong: a hand-made change check that React already does for you
const [prevText, setPrevText] = useState(text)
useEffect(() => {
  if (text !== prevText) {
    document.title = text
    setPrevText(text)
  }
})
```

```jsx
// Right: the dependency array IS the change check
useEffect(() => {
  document.title = text
}, [text])
```

Why: a class had to compare old and new props by hand. With an effect, React compares the dependencies for you and skips the effect when nothing changed.

## 13. Practical recipes

Short, complete examples of the effects you will meet most. The document title recipe is in section 1.

### 13.1 Window size (a resize listener)

```jsx
import { useEffect, useState } from 'react'

function WindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return <p>Window width: {width}px</p>
}
```

**What happens:** the initial value is read from the window. The effect adds one `resize` listener. Every resize updates state and re-renders. On unmount the same function is removed. (I counted: one `addEventListener('resize')` and one `removeEventListener('resize')`.) One limit: `useState(window.innerWidth)` would crash when the component is rendered on a server, because `window` does not exist there. A `useSyncExternalStore` version with a server value avoids that. The online listener in section 10.7 is the same recipe.

### 13.2 A clock with `setInterval`

```jsx
import { useEffect, useState } from 'react'

function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return <p>{now.toLocaleTimeString()}</p>
}
```

**What happens:** the lazy initial value (a function) is called once. The effect starts one interval that stores a new `Date` every second. `setNow(new Date())` reads no state, so there is no stale closure and `[]` is honest. The cleanup stops the timer. Practise it in the [stopwatch](../practice-app/exercises/react/18-stopwatch/README.md) and [traffic light](../practice-app/exercises/react/10-traffic-light/README.md) exercises.

### 13.3 Debounced search

**Debounce** means: wait until the user stops typing for a moment, then act once. One effect with a timer and a cleanup does it, and the same cleanup protects against stale answers.

```jsx
import { useEffect, useState } from 'react'

const COUNTRIES = ['India', 'Indonesia', 'Ireland', 'Italy', 'Iceland']

function searchCountries(query) {
  const found = COUNTRIES.filter((c) => c.toLowerCase().startsWith(query.toLowerCase()))
  return new Promise((resolve) => setTimeout(() => resolve(found), 100))
}

function CountrySearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    if (query === '') return
    let ignore = false
    const timerId = setTimeout(() => {
      searchCountries(query).then((found) => {
        if (!ignore) setResults(found)
      })
    }, 300)
    return () => {
      ignore = true
      clearTimeout(timerId)
    }
  }, [query])

  return (
    <div>
      <label>
        Search
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {query !== '' && (
        <ul>
          {results.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

**What happens, step by step:**
1. Each keystroke changes `query`, so React runs the cleanup of the previous run (cancel its timer, mark its answer as ignored) and then starts a new 300 ms timer.
2. If the user keeps typing, every timer is cancelled before it fires. Only the last one survives.
3. When 300 ms pass with no typing, the search runs. If its answer arrives while `query` is unchanged, it is stored.
4. If the user types again while the search is in flight, the cleanup sets `ignore`, and the old answer is dropped.

I typed `i`, `in`, `ind` with 100 ms between keys, inside `<StrictMode>`. At 299 ms after the last key there had been no search call. At 300 ms there was exactly one call, `searchCountries("ind")`, and then the list showed India and Indonesia. One limit of this version: after the user edits the text, the previous list stays visible until the new answer arrives. The exercise [autocomplete with debounce](../practice-app/exercises/react/12-autocomplete-debounce/README.md) asks you to remove it at once. Later you can extract this logic into a `useDebounce` hook (see [Custom hooks](08-custom-hooks.md)).

### 13.4 WebSocket (a sketch)

A WebSocket is a long-lived connection to a server, where the server can push messages. It is a perfect effect: opening and closing are the setup and cleanup.

```jsx
import { useEffect, useState } from 'react'

function LiveFeed({ url }) {
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('connecting')

  useEffect(() => {
    const socket = new WebSocket(url)
    socket.onopen = () => setStatus('open')
    socket.onmessage = (event) => setMessages((prev) => [...prev, event.data])
    socket.onclose = () => setStatus('closed')
    return () => socket.close()
  }, [url])

  return (
    <div>
      <p>Status: {status}</p>
      <ul>
        {messages.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  )
}
```

**What happens:** the effect opens one socket for the current `url` and attaches handlers. Messages are added with a functional update, so the handler never reads old state. When `url` changes or the component unmounts, `socket.close()` runs. I tested it with a fake `WebSocket` class inside `<StrictMode>`: it created a socket, closed it, created a second one, and the second one received the message.

This is a sketch. A production client also needs reconnection with back-off, authentication, heartbeats, and a decision about what to do with `status` when `url` changes. Browsers can print a console message in development when the first socket is closed before it connected. That comes from the StrictMode check and is harmless. See APIs, HTTP and auth (planned).

### 13.5 Syncing state with `localStorage`

```jsx
import { useEffect, useState } from 'react'

function Notes() {
  const [text, setText] = useState(() => localStorage.getItem('notes') ?? '')

  useEffect(() => {
    localStorage.setItem('notes', text)
  }, [text])

  return <textarea aria-label="Notes" value={text} onChange={(e) => setText(e.target.value)} />
}
```

**What happens:** the **lazy initial state** reads the saved text once, during the first render, so there is no flash of empty text. The effect writes to `localStorage` after every change of `text` (the outside system being kept in sync). I tested it: with "saved earlier" stored, the box started with that text; after typing "hello", the stored value was "hello"; after unmounting and mounting again, the box showed "hello". Real code should wrap `localStorage` access in `try/catch` (it can throw in private mode or when full). This is the seed of a `useLocalStorage` hook ([Custom hooks](08-custom-hooks.md)).

### 13.6 Focusing an input

```jsx
import { useEffect, useRef } from 'react'

function SearchBox() {
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current.focus()
  }, [])

  return <input ref={inputRef} aria-label="Search" />
}
```

**What happens:** `inputRef.current` is empty during render and filled after the commit. By the time the effect runs, it points to the real `<input>`, and `focus()` is called. A test confirmed `document.activeElement` is that input. Focusing twice (StrictMode) is harmless. For a plain "focus on load" the `autoFocus` attribute is simpler. Use an effect when focus depends on a condition, such as moving focus into a panel when it opens. See [useRef](04-useref.md).

### 13.7 Analytics: a page view

```jsx
import { useEffect } from 'react'

function ProductPage({ productId }) {
  useEffect(() => {
    analytics.track('page_view', { page: `/products/${productId}` })
  }, [productId])

  return <p>Product {productId}</p>
}
```

(`analytics` is your analytics client.) **What happens:** the event is sent once after the page appears, and again if `productId` changes. This is a proper effect: the event is not caused by a click, it is caused by the component being shown. In development inside StrictMode I saw the event twice, and once without StrictMode. That is expected; production sends it once. Do not add a ref flag to hide the second one.

**Common mistake:** starting the outside work in the component body instead of in an effect.

```jsx
// Wrong: a new socket on every render, and none is ever closed
function LiveFeed({ url }) {
  const socket = new WebSocket(url)
  // ...
}
```

```jsx
// Right: open it in an effect and close it in the cleanup (see 13.4)
useEffect(() => {
  const socket = new WebSocket(url)
  return () => socket.close()
}, [url])
```

Why: the body runs on every render, so the "outside work" would repeat each time and nothing would stop it.

## How interviewers test this

- **The mental model.** A strong answer says "synchronise with an external system" and "setup and cleanup". A weak answer says "it is componentDidMount, componentDidUpdate and componentWillUnmount together".
- **Honest dependency arrays.** Can you explain the three forms and `Object.is`? Do you list every value the effect reads, and know why an object in the array reruns the effect every render? Red flag: silencing `exhaustive-deps`.
- **Cleanup and StrictMode.** Can you say why an effect runs twice in development and that it is a check, not a bug? Red flags: "I removed StrictMode", or a ref flag to skip the second run.
- **Data fetching.** Do you handle loading, error and `res.ok`, and do you prevent races (ignore flag or `AbortController`)? Do you know that libraries, Suspense and Server Components are usually better? Red flag: an `async` effect callback.
- **Judgement.** Can you point at an effect in code review and say "this is derived data" or "this belongs in the click handler"? That is a senior signal.
- **Puzzles.** Expect "predict the log order", a counter stuck at 1 (stale closure), and an infinite loop to diagnose.

## Interview questions and model answers

### Q1. What is `useEffect` and what is it for? (Easy)
`useEffect` lets a component run code after React has updated the screen, so that it can synchronise with something outside React: the network, timers, subscriptions, the DOM, browser APIs. It takes a setup function and an optional dependency array, and the setup may return a cleanup function. It is not for calculating values from props and state (do that during render), and not for reacting to clicks (use event handlers). It is also not simply "componentDidMount": React decides when to start and stop the sync, based on the dependencies.

```jsx
useEffect(() => {
  const id = setInterval(tick, 1000) // setup
  return () => clearInterval(id)     // cleanup
}, [])
```

### Q2. Explain the dependency array. (Easy)
The array lists every reactive value the effect reads (props, state, and values or functions declared in the component body). After each render React compares each item with its previous value using `Object.is`; if all are equal, the effect is skipped, otherwise the old effect is cleaned up and the new one runs. With no array the effect runs after every render. With `[]` it runs after the first render only. With `[a, b]` it runs after the first render and whenever `a` or `b` changes. The array is a statement of what the effect uses, not a performance switch, and the `exhaustive-deps` lint rule checks it.

### Q3. What is the difference between running an effect on every render and running it once? (Easy)
`useEffect(fn)` has no array, so it runs after every render, and its cleanup runs before each re-run. `useEffect(fn, [])` runs after the first render only, and its cleanup runs on unmount. The risk of `[]` is that the effect keeps the props and state of the first render forever (a stale closure) if it reads any. The risk of no array is repeating expensive work or creating loops. Usually the right answer is neither: list the real dependencies, and the effect runs exactly when its inputs change. In development with StrictMode, `[]` effects run setup, cleanup, setup on mount.

### Q4. What is the cleanup function, and when does it run? (Easy)
It is the function an effect returns. It undoes what the setup did: clear a timer, remove a listener, close a socket, unsubscribe, abort a request. React calls it before the effect runs again (using the old values) and when the component unmounts. Without cleanup you leak timers and listeners, and you get duplicate subscriptions. For parent and child effects, React runs all cleanups of an update first and then all setups (children before parents on mount and update); on unmount the parent's cleanup runs before the child's.

### Q5. Can the effect callback be `async`? (Easy)
No. An async function returns a promise, but React expects `undefined` or a cleanup function. React logs a warning that the effect must not return anything besides a function, and on unmount it tries to call the promise as the cleanup and throws `destroy is not a function`. Define an async function inside the effect and call it, and use an ignore flag or `AbortController` in the cleanup. Alternatively use `.then()` chains.

### Q6. Why does my effect run twice in development? (Medium)
Because the app is wrapped in `<StrictMode>`. In development React mounts each component, runs the effect, runs the cleanup, and runs the effect again. It simulates the component being removed and shown again, to check that your cleanup really undoes your setup. It does not happen in production and it is not a bug. The fix is to write symmetric setup and cleanup (connect and disconnect, subscribe and unsubscribe, fetch and ignore or abort). Do not remove StrictMode, and do not use a ref flag to skip the second run. Work that must happen only once (a purchase) belongs in an event handler; one-time app setup belongs at module level.

### Q7. How do you fetch data with `useEffect`? Is it the best way? (Medium)
Start the request in the effect with the id or url as the dependency, keep `loading`, `error` and `data` in state, check `res.ok` (fetch does not reject on a 404), handle errors, and return a cleanup that cancels or ignores the request. Do not make the effect callback async: define an inner async function. That is the correct manual pattern. But it is usually not the best: it has no caching, creates waterfalls, does not run on the server, and needs boilerplate. Prefer your framework's data loading, TanStack Query, Suspense with `use`, or Server Components, and wrap a hand-made version in a custom hook.

### Q8. What is a race condition in an effect and how do you avoid it? (Medium)
When the input of an effect changes quickly (a search text, a user id), several requests are in flight at once. They may finish out of order, so an old answer can arrive last and overwrite the correct one. The fix is cleanup: set a local `ignore` flag to `true` in the cleanup and only call `setState` when `ignore` is false, so every effect run ignores answers that belong to an outdated run. For `fetch`, also use an `AbortController` and call `abort()` in the cleanup so the old request is cancelled, and treat `AbortError` as expected.

```jsx
useEffect(() => {
  let ignore = false
  load(id).then((data) => { if (!ignore) setData(data) })
  return () => { ignore = true }
}, [id])
```

### Q9. When do you use an effect and when an event handler? (Medium)
Use an event handler when the code runs **because the user did something** (click, submit, key press): the handler knows exactly what happened. Use an effect when the code runs **because the component is on screen** and an outside system must match its props and state (a connection, a subscription, a title, a page-view event). A POST on submit belongs in `handleSubmit`; "show a toast after adding to cart" belongs in the click handler, not in an effect watching the cart, which would also fire on page load. If two handlers share logic, extract a plain function.

### Q10. What causes an infinite loop in `useEffect`, and how do you avoid it? (Medium)
An effect that sets state, where that state (or something that changes because of it) is a dependency or the array is missing, re-runs after every render forever. The common causes are: `setCount(count + 1)` with `[count]`; a state update in an effect with no array; and an object, array or function created in the component body used as a dependency while the effect sets state. Fixes: ask whether you need the effect at all (derive in render); use primitive or stable dependencies (build objects inside the effect, or use `useMemo`); use functional updates; add a condition. Never "fix" it by removing the dependency or silencing the linter.

### Q11. What is a stale closure in an effect? Should you ignore `exhaustive-deps`? (Medium)
A closure remembers the values from the render where it was created. An effect with `[]` that reads state keeps the first render's value for ever, so `setInterval(() => setCount(count + 1))` stays at 1. Do not silence the lint rule; fix the cause. Use a functional update (`setCount((c) => c + 1)`) if you only need the previous state, add the value to the dependencies if the effect should restart, keep the latest value in a ref, or use `useEffectEvent` for non-reactive logic that must see the latest props and state. The linter is almost always right.

### Q12. What is the difference between `useEffect` and `useLayoutEffect`? (Medium)
`useEffect` runs after the commit, usually after the browser has painted, and does not block painting. `useLayoutEffect` runs right after the DOM updates and before the paint, and blocks it. Use `useLayoutEffect` to measure layout (size or position of an element) and adjust before the user sees the first frame, so there is no flicker. Use `useEffect` for everything else, because it does not delay the first paint. A state update inside `useLayoutEffect` re-renders synchronously before paint. Both are skipped during server rendering.

### Q13. What is "You Might Not Need an Effect"? Give examples. (Medium)
It is the React guidance that effects are only for synchronising with external systems. Examples where you do not need one: derived data (compute `fullName` in render instead of syncing it into state), resetting state when a prop changes (use a different `key`), user-triggered work such as a POST or a toast (event handler), chains of effects that set each other's state (do it all in one handler), telling the parent about a change (call its callback in the same handler), and subscribing to a store (use `useSyncExternalStore`). Extra effects cost an extra render and can show a wrong value for a frame.

### Q14. How do class lifecycle methods map to `useEffect`? (Medium)
Roughly: `componentDidMount` is an effect with `[]`; `componentDidUpdate` is an effect with dependencies; `componentWillUnmount` is the cleanup. The mapping breaks in important ways. An effect is about synchronisation: when a dependency changes React runs cleanup and setup together, so you do not hand-write the "if props changed" logic that classes needed. An effect usually runs after paint, while `componentDidMount` runs before it. In development an effect's setup runs twice. `getSnapshotBeforeUpdate` and error boundaries have no hook equivalent.

### Q15. What is `useEffectEvent`, and is it stable? (Hard)
It lets you write logic that runs from inside an effect but is not a reason to re-run the effect. The function it returns always sees the latest props and state. For example, a chat effect depends on `roomId`, but a "connected" toast also reads `theme`; with an Effect Event, changing `theme` does not reconnect. It is stable since React 19.2 (October 2025), so it is in 19.3.1. Rules: call it only from effects, never during render; do not pass it to children or list it in dependencies; and do not use it merely to silence the linter. Older React versions do not have it; there you use a ref that holds the latest value.

## Common mistakes and gotchas
- **Empty `[]` while reading props or state.** The effect uses first-render values forever. List the dependencies, or use a functional update.
- **Silencing `exhaustive-deps`.** It hides a stale closure. Fix the code instead.
- **Object, array or function in the dependency array** that is created in render. Create it inside the effect, depend on primitives, or memoize it.
- **No cleanup** for timers, listeners, sockets and subscriptions. Return a function that undoes the setup, with the same function reference for listeners.
- **An effect to compute derived state.** Calculate it during render.
- **Event logic in an effect** (a POST, a toast). Put it in the handler that caused it.
- **An `async` effect callback.** Define an inner `async function` and call it.
- **Fetching with no race protection, no `res.ok` check, no error or loading state.** Use an ignore flag or `AbortController`, check `res.ok`, show all states.
- **Setting state that is in the dependency array**, with no condition. Use a functional update or restructure to avoid the loop.
- **Skipping the StrictMode double run with a ref flag**, or removing StrictMode. Make the effect symmetric and safe to repeat.
- **Relying on "exactly once".** An effect can run again after a remount (route change, `<Activity>`). Design for repeat.
- **Reading layout in `useEffect`** and seeing a flicker. Use `useLayoutEffect` for measuring before paint.
- **Adding an "is mounted" flag** for the old unmounted-state warning. That warning no longer exists; the real need is race protection.
- **Calling a hook inside the effect.** Hooks run at the top level of the component, never inside effects or handlers.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Predict the console output. Mount the component, click the button once, then unmount it.

```jsx
function App() {
  const [n, setN] = useState(0)
  console.log('A: render', n)
  useEffect(() => {
    console.log('B: effect', n)
    return () => console.log('C: cleanup', n)
  }, [n])
  return <button onClick={() => setN(n + 1)}>+1</button>
}
```

<details>
<summary>Show answer</summary>

```text
A: render 0
B: effect 0
--- click
A: render 1
C: cleanup 0
B: effect 1
--- unmount
C: cleanup 1
```

On the click the component renders first (A), then React cleans up the previous effect with its OLD value (C with `0`), then runs the new effect (B with `1`). On unmount only the cleanup of the latest effect runs, with `n = 1`. I ran it to confirm the order.

</details>

2. **(Easy)** A component has five effects, with the arrays `none`, `[]`, `[a]`, `[a, b]` and `[obj]` where `const obj = { a }` is created in the body. State `a` and `b` start at 0 and are changed by two buttons. Which effects run on mount, after clicking `a`, and after clicking `b`?

<details>
<summary>Show answer</summary>

- On mount: all five run.
- After clicking `a`: the no-array effect (every render), `[a]`, `[a, b]` and `[obj]`. `[obj]` runs because `obj` is a new object on every render, so it always counts as changed. `[]` does not run.
- After clicking `b`: the no-array effect, `[a, b]` (because `b` changed) and `[obj]` (new object again). `[a]` does not run, because `a` did not change. `[]` does not run.

Two lessons: `[]` only runs on mount (twice in development), and an object created in the body makes its effect run on every render, just like having no array. I confirmed these with a test.

</details>

3. **(Easy)** This component shows a greeting in the tab title, but the title does not change when `name` changes. Fix it, and explain why it broke.

```jsx
function Hello({ name }) {
  useEffect(() => {
    document.title = `Hello ${name}`
  }, [])
  return <p>{name}</p>
}
```

<details>
<summary>Show answer</summary>

```jsx
function Hello({ name }) {
  useEffect(() => {
    document.title = `Hello ${name}`
  }, [name])
  return <p>{name}</p>
}
```

The `[]` array tells React that the effect uses no changing values, so it runs only after the first render and keeps the first `name` for ever. The effect reads `name`, so `name` must be in the array. I verified that with `[]` the title stayed "Hello Ada" after the prop changed to "Grace".

</details>

4. **(Easy)** Coding task: build `LastKey`, a component that shows `Last key: a` after the user presses the key `a` anywhere on the page (listen for `keydown` on `window`). It must start with `Last key: none`, and must not leave a listener behind when it unmounts.

<details>
<summary>Show answer</summary>

```jsx
import { useEffect, useState } from 'react'

function LastKey() {
  const [key, setKey] = useState('none')

  useEffect(() => {
    function handleKeyDown(event) {
      setKey(event.key)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return <p>Last key: {key}</p>
}
```

The handler is a named function so that exactly the same function is added and removed. `setKey` is stable and `handleKeyDown` is created inside the effect, so the empty array is honest. I tested that dispatching a `keydown` for `a` shows `Last key: a`, and that a key press after unmount does nothing.

</details>

5. **(Medium)** This counter should count up every second but sticks at 1. Explain why, and give three different fixes.

```jsx
function Ticker() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return <p>{count}</p>
}
```

<details>
<summary>Show answer</summary>

**Why:** the effect runs once (`[]`) during the first render, where `count` is `0`. The callback passed to `setInterval` closes over that `0`, so every tick runs `setCount(0 + 1)`. After the first tick the state is already 1, so later ticks change nothing. This is a stale closure.

**Fixes:**
1. Functional update: `setCount((c) => c + 1)`. The callback no longer reads `count`, and `[]` stays honest.
2. Add `count` to the array and use `setTimeout` instead, so each new value starts a new timer: `useEffect(() => { const id = setTimeout(() => setCount(count + 1), 1000); return () => clearTimeout(id) }, [count])`.
3. Keep the latest value in a ref (`countRef.current = count` in a no-array effect) and read `countRef.current` in the interval, or use `useEffectEvent` (React 19.2+).

I ran the bad version for five fake seconds (it showed 1) and fixes 1 and 2 (both showed 5).

</details>

6. **(Medium)** Coding task: the component below shows the wrong user after a quick switch from user 1 (slow) to user 2 (fast). Fix the race condition with an ignore flag, then describe how `AbortController` would improve it.

```jsx
function Profile({ id }) {
  const [user, setUser] = useState(null)
  useEffect(() => {
    fetchUser(id).then((data) => setUser(data))
  }, [id])
  return <p>{user ? user.name : 'Loading...'}</p>
}
```

<details>
<summary>Show answer</summary>

```jsx
function Profile({ id }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    let ignore = false
    fetchUser(id).then((data) => {
      if (!ignore) setUser(data)
    })
    return () => {
      ignore = true
    }
  }, [id])

  return <p>{user ? user.name : 'Loading...'}</p>
}
```

When `id` changes, React runs the cleanup of the old run, which flips that run's own `ignore` to `true`, so the late answer for user 1 is dropped. In my test the screen showed `User 2` at 800 ms and still `User 2` at 2300 ms (the buggy version switched back to `User 1` at 2000 ms).

If `fetchUser` uses `fetch`, create `const controller = new AbortController()`, pass `{ signal: controller.signal }`, and call `controller.abort()` in the cleanup. This cancels the network request itself. In the `catch`, return early when `err.name === 'AbortError'`. Also add `loading` and `error` state and check `res.ok`.

</details>

7. **(Medium)** Predict the console log for this component inside `<StrictMode>` in development. Mount it, click "travel", then hide it.

```jsx
function Room({ roomId }) {
  useEffect(() => {
    const connection = createConnection(roomId) // logs "connect <id>" and "disconnect <id>"
    connection.connect()
    return () => connection.disconnect()
  }, [roomId])
  return <h2>{roomId}</h2>
}
```

<details>
<summary>Show answer</summary>

```text
connect general
disconnect general
connect general
--- click travel
disconnect general
connect travel
--- hide
disconnect travel
```

The first three lines are StrictMode's extra check: setup, cleanup, setup. After that the component behaves exactly as without StrictMode. If the log showed "connect general" twice in a row without a "disconnect" between them, the cleanup would be missing, and that is the bug StrictMode is designed to reveal.

</details>

8. **(Medium)** Coding task: remove the unnecessary effects from this component without changing its behaviour. The parent passes `user` and `onDirtyChange`, and shows a different user by changing `user`.

```jsx
function UserForm({ user, onDirtyChange }) {
  const [name, setName] = useState(user.name)
  const [upper, setUpper] = useState('')

  useEffect(() => { setUpper(name.toUpperCase()) }, [name])
  useEffect(() => { setName(user.name) }, [user.id])
  useEffect(() => { onDirtyChange(name !== user.name) }, [name])

  return (
    <div>
      <input aria-label="name" value={name} onChange={(e) => setName(e.target.value)} />
      <p>{upper}</p>
    </div>
  )
}
```

<details>
<summary>Show answer</summary>

```jsx
function UserForm({ user, onDirtyChange }) {
  const [name, setName] = useState(user.name)
  const upper = name.toUpperCase() // derived, not state

  function handleChange(event) {
    const next = event.target.value
    setName(next)
    onDirtyChange(next !== user.name) // notify in the same event
  }

  return (
    <div>
      <input aria-label="name" value={name} onChange={handleChange} />
      <p>{upper}</p>
    </div>
  )
}

// In the parent: a different key resets the state for each user
// <UserForm key={user.id} user={user} onDirtyChange={setDirty} />
```

Three smells removed: (1) `upper` is derived, so calculate it in render; (2) resetting state when `user.id` changes is done with `key={user.id}`; (3) telling the parent happens in the change handler, so it does not run on mount or after a delay. I tested the fixed version: no call to `onDirtyChange` on mount, one call with `true` after typing, and the input showed the new user's name after the key changed. The original version also rendered with an empty `upper` first. One detail: when the parent switches to another user, it should also reset its own "dirty" flag in the same handler, because the new form starts clean.

</details>

9. **(Medium)** Find the infinite loop and give two fixes.

```jsx
function Results({ type }) {
  const [rows, setRows] = useState([])
  const options = { type, limit: 10 }

  useEffect(() => {
    search(options).then(setRows)
  }, [options])

  return <p>{rows.length} rows</p>
}
```

<details>
<summary>Show answer</summary>

`options` is a new object on every render, so `[options]` always looks changed. The effect runs, `search` resolves, `setRows` stores a new array, the component renders, `options` is new again, and the effect runs again, for ever.

Fix 1 (best): build the object inside the effect and depend on the primitives.

```jsx
useEffect(() => {
  search({ type, limit: 10 }).then(setRows)
}, [type])
```

Fix 2: keep the object in the body but stabilise it: `const options = useMemo(() => ({ type, limit: 10 }), [type])` and keep `[options]`. A third option is to move a constant `limit` out of the component. Also add an ignore flag for the race.

I ran the loop version: it made more than 50 searches in 150 ms. The `[type]` version made exactly one.

</details>

10. **(Medium)** Coding task: build the autocomplete from the exercise [autocomplete with debounce](../practice-app/exercises/react/12-autocomplete-debounce/README.md). Try it on your own first, then compare your approach with the key idea.

<details>
<summary>Show answer</summary>

The key idea is one effect keyed on the query. Inside, set a 300 ms `setTimeout` that calls the API, keep an `ignore` flag for stale answers, and in the cleanup clear the timer and set `ignore = true`. Every new keystroke runs the cleanup of the previous run, so only the last query is sent, and a late answer can never overwrite a newer one. Treat an empty (or only spaces) query separately: send nothing and show nothing. Section 13.3 has a working version of this pattern. From the `practice-app` folder, run your version against the exercise tests with `npm test -- exercises/react/12-autocomplete-debounce`, and see how the reference solution fares with `npm run test:solutions -- exercises/react/12-autocomplete-debounce`.

</details>

11. **(Hard)** A `Parent` and its `Child` each have a `useLayoutEffect` and a `useEffect`, all with a dependency on `id`. A button in `Parent` increments `id`. Predict the order of all the setups and cleanups: on mount, after one click, and on unmount (no StrictMode).

<details>
<summary>Show answer</summary>

```text
mount:
parent render, child render
child layout setup, parent layout setup
child effect setup, parent effect setup
click:
parent render, child render
child layout cleanup, parent layout cleanup
child layout setup, parent layout setup
child effect cleanup, parent effect cleanup
child effect setup, parent effect setup
unmount:
parent layout cleanup, child layout cleanup
parent effect cleanup, child effect cleanup
```

Rules: layout effects run before passive effects. Children run before parents on mount and update. On an update, the cleanups of each kind run before the setups of that kind. On unmount the parent runs before the child. I measured this order in React 19.3.1.

</details>

12. **(Hard)** Coding task: this room reconnects when the `theme` prop changes, although only `roomId` should cause a reconnect. Fix it so the "Connected" toast still uses the latest theme. Give one version for React 19.2 and later, and one that also works in older React.

```jsx
function Room({ roomId, theme }) {
  useEffect(() => {
    const connection = createConnection(roomId)
    connection.connect()
    showToast('Connected to ' + roomId, theme)
    return () => connection.disconnect()
  }, [roomId, theme])
  return <h2>{roomId}</h2>
}
```

<details>
<summary>Show answer</summary>

**React 19.2 and later: `useEffectEvent`.**

```jsx
import { useEffect, useEffectEvent } from 'react'

function Room({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showToast('Connected to ' + roomId, theme)
  })

  useEffect(() => {
    const connection = createConnection(roomId)
    connection.connect()
    onConnected()
    return () => connection.disconnect()
  }, [roomId])

  return <h2>{roomId}</h2>
}
```

**Older React: a ref that holds the latest theme.**

```jsx
const themeRef = useRef(theme)
useEffect(() => {
  themeRef.current = theme
})

useEffect(() => {
  const connection = createConnection(roomId)
  connection.connect()
  showToast('Connected to ' + roomId, themeRef.current)
  return () => connection.disconnect()
}, [roomId])
```

In my test of the `useEffectEvent` version, changing `theme` from light to dark produced no disconnect or connect. Changing `roomId` disconnected and reconnected, and the toast used the dark theme. `roomId` stays a real dependency because the connection depends on it.

</details>

## Recap
- An effect synchronises a component with something outside React. It is not a lifecycle method; think setup, dependencies, cleanup.
- Order of events: render, commit, then effects. An effect sees the props and state of its own render.
- Dependencies: no array runs every render, `[]` runs after mount, `[a, b]` runs when a value changes. List everything the effect reads, and never silence `exhaustive-deps`.
- React compares dependencies with `Object.is`, so objects, arrays and functions created in the body look new every render. Create them inside the effect or depend on primitives.
- Cleanup undoes the setup. It runs before the next run and on unmount. StrictMode runs setup, cleanup, setup in development to check this.
- When fetching, check `res.ok`, handle loading and error, and guard against races with an ignore flag or `AbortController`. Libraries, Suspense and Server Components are usually better. Never make the effect callback `async`.
- Stale closures: use functional updates, correct dependencies, a ref, or `useEffectEvent` (stable since React 19.2).
- Often you do not need an effect: derive data in render, reset with `key`, put user-caused work in handlers, use `useSyncExternalStore` for external stores.

## Where to go next
- Next lesson: [useRef](04-useref.md), the box that holds DOM nodes and latest values (used in several effect fixes above).
- Other hooks used with effects: [Other hooks](09-other-hooks.md) (`useLayoutEffect`, `useSyncExternalStore`, `useEffectEvent`) and [Custom hooks](08-custom-hooks.md) (`useFetch`, `useDebounce`, `useLocalStorage`).
- Fetching in depth: [Data fetching](../03-intermediate/02-data-fetching.md). The render and commit phases in detail: [How React renders](../04-advanced/01-how-react-renders.md) and React internals (planned).
- Old code you may meet: Legacy class components (planned).
- Interview practice: [Round 3, output and debugging](../05-interview-rounds/round-3-output-and-debugging/README.md), then its effects questions in questions/02-effects-and-lifecycle.md (planned).
- Practice-app exercises: [traffic light](../practice-app/exercises/react/10-traffic-light/README.md), [autocomplete with debounce](../practice-app/exercises/react/12-autocomplete-debounce/README.md), [fetch list with retry](../practice-app/exercises/react/15-fetch-list-retry/README.md), [stopwatch](../practice-app/exercises/react/18-stopwatch/README.md).
