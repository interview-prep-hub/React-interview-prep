# useRef and Refs

> **Level:** Intermediate   **Time:** about 45 minutes   **Read first:** [useState in depth](02-usestate-in-depth.md), [useEffect](03-useeffect.md)

## What you will learn
- Explain what a ref is, and why changing `ref.current` never causes a re-render.
- Use a ref as a handle to a DOM node: focus an input, scroll, measure, play and pause media.
- Use a ref as a mutable box that survives renders: timer ids, the previous value, the latest callback.
- Choose between a ref and state, and follow the rule that you do not read or write `ref.current` during render.
- Pass a ref to your own component (a normal prop in React 19, `forwardRef` in older code) and expose a small API with `useImperativeHandle`.
- Use callback refs, ref cleanup functions and a Map of refs for lists, and know when NOT to use a ref.

## 1. A ref is a box that React does not watch

A component function runs again on every render, and its local variables are created fresh each time. State is how you remember a value between renders, but state comes with a cost: changing it makes React render again. Sometimes you want to remember something **without** causing a render. That is what a **ref** is for.

`useRef(initialValue)` returns a plain object with one property: `{ current: initialValue }`. React gives you the **same object** on every render. You can read and change `ref.current` whenever you like. React does not watch it.

An analogy: state is the whiteboard in a meeting room. When someone writes on it, everybody looks up and the room is redrawn. A ref is a drawer in your own desk. You can put a note in and take it out, and nobody else notices.

Here is a small experiment. It puts a state counter and a ref counter side by side. (It breaks a rule on purpose, by reading the ref during render. Section 5 explains why that is a bad idea. We do it here to make the problem visible.)

```jsx
import { useRef, useState } from 'react'

function RefDemo() {
  const countRef = useRef(0)
  const [count, setCount] = useState(0)

  function addToRef() {
    countRef.current = countRef.current + 1
    console.log('ref is now', countRef.current)
  }

  return (
    <div>
      <p>State: {count}</p>
      <p>Ref: {countRef.current}</p>
      <button onClick={addToRef}>Add to ref</button>
      <button onClick={() => setCount(count + 1)}>Add to state</button>
    </div>
  )
}
```

**What happens, step by step** (checked by running it with React 19.3.1):
1. First render. The screen shows `State: 0` and `Ref: 0`. The component has rendered once.
2. You click "Add to ref" three times. Each click changes `countRef.current` and the console prints `ref is now 1`, then `2`, then `3`. React is never told, so there is no new render. The screen still says `Ref: 0`.
3. You click "Add to state" once. State changed, so React renders again. During that render the paragraph reads `countRef.current`, which is `3` now. The screen shows `State: 1` and `Ref: 3`.

The ref held the right number the whole time. The screen only caught up when something else caused a render. So a ref is the wrong tool for anything the user should see. Use state for that.

Quick comparison:

| | State | Ref |
|---|---|---|
| How you change it | call the setter | assign to `ref.current` |
| Causes a re-render | yes | no |
| When you see the new value | on the next render (a snapshot) | immediately, in the same line of code |
| Survives re-renders | yes | yes |
| Good for | what the screen shows | things the screen does not show |

One more detail. The argument of `useRef(0)` is used only on the first render. On later renders React ignores it and hands back the same object (we checked: after the argument changed from `1` to `2`, `ref.current` was still `1`).

`useRef` has two jobs. Sections 2 and 3 cover the first one (a handle to a DOM node). Sections 4 to 7 cover the second one (a mutable box).

**Common mistake:**

```jsx
// WRONG: the button text never updates when the ref changes
const likes = useRef(0)
return <button onClick={() => { likes.current += 1 }}>Likes: {likes.current}</button>

// RIGHT: the screen depends on it, so it is state
const [likes, setLikes] = useState(0)
return <button onClick={() => setLikes(likes + 1)}>Likes: {likes}</button>
```

Why: only a state setter tells React to render again.

## 2. Job one: a handle to a DOM node

A **DOM node** is the real element in the browser page, for example the actual `<input>` the user types into. React builds the page for you from JSX, and most of the time you never touch the real elements. But some things cannot be said as "the screen should look like this". They are **commands**: focus this input, scroll to that heading, play this video. Programmers call commands like this **imperative**. (React itself is **declarative**: you describe the result and React does the work.) A ref is how you get hold of the real element so you can give it a command.

You do two things:
1. Create a ref with `useRef(null)`.
2. Pass it to the element in the `ref` attribute: `<input ref={inputRef} />`.

React then puts the real element into `inputRef.current` after it has placed it on the page, and puts `null` back when the element is removed.

```jsx
import { useEffect, useRef } from 'react'

function SearchBox() {
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current.focus() // the cursor appears in the box
  }, [])

  return (
    <div>
      <input ref={inputRef} placeholder="Search..." />
      <button onClick={() => inputRef.current.focus()}>Focus the box</button>
    </div>
  )
}
```

**What happens, step by step:**
1. React renders `SearchBox`. `useRef(null)` gives `{ current: null }`. The input is not on the page yet, so `inputRef.current` is `null` during this render (we logged it: `ref.current=null`).
2. React puts the real `<input>` on the page. Because of `ref={inputRef}`, it sets `inputRef.current` to that element.
3. Now React runs the effect. `inputRef.current` is the real input, so `.focus()` works and the cursor appears.
4. Later, a click on the button runs the handler. It calls `.focus()` on the same element again.

The rule to remember: a DOM ref is ready in **effects** and **event handlers**. It is not ready during the first render.

A shortcut for the simple case: `<input autoFocus />` focuses the input when it appears, with no ref at all (we checked that it works). Use a ref when you need to focus later or only under some condition. Be careful with focus that jumps on its own, because it can confuse keyboard and screen reader users. The [accessibility lesson](../04-advanced/09-accessibility.md) covers focus management properly.

The ref is also `null` whenever the element is not rendered. If the input is behind `{show && <input ref={inputRef} />}`, then `inputRef.current` is `null` while `show` is false. We logged `null`, then `INPUT`, then `null` as `show` went false, true, false. Guard it when that can happen: `inputRef.current?.focus()`.

**Common mistake:**

```jsx
// WRONG: during render the input does not exist yet, so current is null and this crashes
const inputRef = useRef(null)
inputRef.current.focus()
return <input ref={inputRef} />

// RIGHT: wait until the element is on the page
useEffect(() => {
  inputRef.current.focus()
}, [])
```

Why: render only describes the screen. The real element exists after React commits (applies) the render to the page.

## 3. More jobs for DOM refs: scroll, measure, play, click outside

Once you hold the real element, you can call any browser method on it. The ones used most:

| Goal | What you call on `ref.current` |
|---|---|
| Focus or blur | `.focus()`, `.blur()` |
| Scroll an element into view | `.scrollIntoView({ behavior: 'smooth' })` |
| Measure size and position | `.getBoundingClientRect()` |
| Play or pause audio and video | `.play()`, `.pause()` |
| Select the text in an input | `.select()` |
| Is a click inside this element? | `.contains(event.target)` |

All of these belong in event handlers and effects, never in the render body.

**Scroll into view.**

```jsx
import { useRef } from 'react'

function Article() {
  const detailsRef = useRef(null)

  function jumpToDetails() {
    detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      <button onClick={jumpToDetails}>Jump to details</button>
      <p>... a lot of text here ...</p>
      <h2 ref={detailsRef}>Details</h2>
    </div>
  )
}
```

1. The `<h2>` is on the page and `detailsRef.current` points at it.
2. A click runs `jumpToDetails`, which asks the browser to scroll that heading to the top of the view, with an animation.

**Measure an element.** Measuring needs the real element, because only the browser knows how big text turned out to be. The result goes into state, because the screen shows it.

```jsx
import { useRef, useState } from 'react'

function MeasureBox() {
  const boxRef = useRef(null)
  const [height, setHeight] = useState(null)

  function measure() {
    setHeight(boxRef.current.getBoundingClientRect().height)
  }

  return (
    <div>
      <div ref={boxRef}>Some text that may wrap onto several lines on a narrow screen.</div>
      <button onClick={measure}>Measure</button>
      <p>Height: {height === null ? 'not measured yet' : `${height}px`}</p>
    </div>
  )
}
```

1. A click runs `measure`. It asks the real box for its rectangle and keeps only the height.
2. `setHeight` stores the number in state, so React renders and the paragraph shows it.
3. The ref is the way in. State is how the answer reaches the screen.

(A note for your tests: jsdom, the fake browser used by Vitest and Jest, does no layout. In our run the height came out as `0px`. To test code like this, replace `getBoundingClientRect` with a stub that returns the number you want.)

**Play and pause media.**

```jsx
import { useRef, useState } from 'react'

function Player() {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  function toggle() {
    const video = videoRef.current
    if (video.paused) {
      video.play()
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  return (
    <div>
      <video ref={videoRef} src="movie.mp4" />
      <button onClick={toggle}>{playing ? 'Pause' : 'Play'}</button>
    </div>
  )
}
```

1. `play()` and `pause()` are commands. There is no `playing` prop on `<video>` that does the same job, so a ref is the right tool.
2. The button label is something the user sees, so it lives in state (`playing`).
3. `video.play()` returns a promise, and the browser can refuse to play (for example when it blocks autoplay). In real code, add `.catch(...)` to handle that.

**Detect a click outside.** A classic: close a dropdown when the user clicks anywhere else.

```jsx
import { useEffect, useRef, useState } from 'react'

function Dropdown() {
  const [open, setOpen] = useState(true)
  const boxRef = useRef(null)

  useEffect(() => {
    function handlePointerDown(event) {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div>
      <div ref={boxRef}>
        <button onClick={() => setOpen(!open)}>Menu</button>
        {open && (
          <ul>
            <li>One</li>
            <li>Two</li>
          </ul>
        )}
      </div>
      <p>Click here to close the menu.</p>
    </div>
  )
}
```

1. After mount, the effect adds one listener on the whole `document`.
2. Every press anywhere in the page calls `handlePointerDown`. `event.target` is the element that was pressed.
3. `boxRef.current.contains(event.target)` is `true` when that element is the box or inside it. Then we do nothing.
4. When the press is outside the box, we set `open` to `false` and the list disappears. (We tested both cases: a press on "One" kept the list, a press on the paragraph closed it.)
5. The cleanup removes the listener when the component unmounts.

The practice app has a full version of this as an exercise, with a reusable hook: [21 - Dropdown with click outside](../practice-app/exercises/react/21-dropdown-click-outside/README.md). The [custom hooks lesson](08-custom-hooks.md) shows the hook form.

**Common mistake:**

```jsx
// WRONG: reading the element during render. On the first render it does not exist yet.
const width = boxRef.current.offsetWidth

// RIGHT: measure in an effect or a handler, then keep the number in state
useEffect(() => {
  setWidth(boxRef.current.offsetWidth)
}, [])
```

Why: render has to be a pure calculation, and the element only exists after the render is on the page. If you must measure before the browser paints, use `useLayoutEffect` (see [other hooks](09-other-hooks.md)).

## 4. Job two: a value that survives renders without causing them

Now the second job. Sometimes your component needs to remember something that the screen does not show. The classic case is the id that `setInterval` returns. You need it later to call `clearInterval`.

Where can you keep it? There are four candidates:
- **A normal variable in the component body.** It is created again on every render, so the value is lost.
- **A variable outside the component** (at the top of the file). It survives, but all copies of the component share it, and it stays alive after unmount. Two timers on one page would fight over one variable.
- **State.** It survives, but every change makes React render again for a value nobody looks at.
- **A ref.** One box per component copy, it survives renders, and changing it is silent. This is the one.

```jsx
import { useEffect, useRef, useState } from 'react'

function Timer() {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalId = useRef(null)

  function start() {
    if (intervalId.current !== null) return // already running
    setRunning(true)
    intervalId.current = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)
  }

  function stop() {
    clearInterval(intervalId.current)
    intervalId.current = null
    setRunning(false)
  }

  useEffect(() => {
    return () => clearInterval(intervalId.current) // stop the timer if the component goes away
  }, [])

  return (
    <div>
      <p>Seconds: {seconds}</p>
      <button onClick={start} disabled={running}>Start</button>
      <button onClick={stop} disabled={!running}>Stop</button>
    </div>
  )
}
```

**What happens, step by step:**
1. First render: `seconds` is `0`, `running` is `false`, and `intervalId.current` is `null`.
2. You click Start. `setInterval` returns a number, and we store it in `intervalId.current`. Storing it does not render. `setRunning(true)` does, but only so the buttons update.
3. Every second the callback runs `setSeconds((s) => s + 1)`. The component renders, and a render does not touch the ref, so the id is still there.
4. You click Stop. `stop` reads the id from the ref, clears the timer, and resets the box to `null`.
5. If the component is removed from the page while the timer runs, the effect cleanup clears it, so no timer is left behind. (In our run with fake timers: Start, 3 seconds, `Seconds: 3`. Stop, 3 more seconds, still `3`. Start again, 2 seconds, `5`. After unmount, 0 timers were pending.)

Look at how the two tools split the work. `running` is state because the buttons on screen depend on it. `intervalId` is a ref because only code needs it.

Other values that fit the same pattern: a `setTimeout` id for a debounce, an animation frame id, a WebSocket or `AbortController` object, an instance of a chart or map library, a flag like "the mouse is down" that only handlers read.

Want to practise? The stopwatch exercise is exactly this idea: [18 - Stopwatch with laps](../practice-app/exercises/react/18-stopwatch/README.md).

**Common mistake:**

```jsx
// WRONG: this variable is created again on every render
function BadTimer() {
  const [seconds, setSeconds] = useState(0)
  let intervalId = null

  function start() {
    intervalId = setInterval(() => setSeconds((s) => s + 1), 1000)
  }
  function stop() {
    clearInterval(intervalId) // intervalId is null here, so nothing is stopped
  }
  // ...
}

// RIGHT: const intervalId = useRef(null), as in Timer above
```

Why: after Start, the timer changes `seconds` every second, so the component renders again and again. Each render makes a fresh `intervalId` set to `null`, and the Stop button belongs to the newest render. We ran this: Start, 2 seconds, Stop, then 3 more seconds, and the display kept counting up to `5`. Stop did nothing.

## 5. The golden rule: do not read or write ref.current during render

Rendering means React calls your component function to find out what the screen should look like. React expects that function to be a **pure calculation**: the same props and state in, the same JSX out. React may call it twice (StrictMode does so on purpose in development), pause it, or throw a result away.

A ref breaks that promise in two ways:
- **Writing** a ref during render is a hidden side effect (a change outside the calculation).
- **Reading** a ref during render is a hidden input that React cannot track. This is what happened in section 1: the screen showed `Ref: 0` while the ref held `3`.

So touch `ref.current` only in places that run **after** render or in response to the user:
- event handlers (`onClick`, `onChange`, ...)
- effects (`useEffect`, `useLayoutEffect`)
- callback refs (section 8)

In the render body you only **pass** the ref along: `ref={myRef}`.

There is one allowed exception: **lazy initialisation**. If you need an expensive object created once, check for `null` and fill the box the first time:

```jsx
import { useRef } from 'react'

function createBoard() {
  console.log('building the board') // pretend this is slow
  return Array(9).fill(null)
}

function Board() {
  const boardRef = useRef(null)

  if (boardRef.current === null) {
    boardRef.current = createBoard() // runs only on the first render
  }

  return <button onClick={() => console.log(boardRef.current)}>Log the board</button>
}
```

Compare that with `useRef(createBoard())`. It looks the same, but `createBoard()` is an ordinary function call in the argument, so it runs on **every** render. React then keeps only the first result and throws the others away. We counted how often the object was built over 3 renders: 3 times with `useRef(new Thing())`, and once with the `null` check.

Your tools help here. The `react-hooks/refs` rule of `eslint-plugin-react-hooks` (version 7, part of the recommended preset) reports reads and writes of `ref.current` during render. React Compiler skips components that do it, which means they lose its automatic optimisation.

If you need a value in the output, the answer is state, not a ref.

**Common mistake:**

```jsx
// WRONG: writing to a ref in render. It also counts twice in StrictMode.
function Page() {
  const renderCount = useRef(0)
  renderCount.current += 1
  return <p>Renders: {renderCount.current}</p>
}
```

What we measured in StrictMode: `Renders: 2` right after the first mount, and `Renders: 4` after one update. Each real render calls the function twice. To count renders, use the React DevTools Profiler. To count something real, such as clicks, write in a handler.

## 6. Ref or state? How to choose

Ask one question: **does the screen need to show this value, or change when it changes?**
- Yes: use **state**.
- No, but I must remember it between renders: use a **ref**.
- No, and I only need it inside this one render: use a plain variable.

| Value | Shown on screen? | Remember across renders? | Use |
|---|---|---|---|
| Text of a controlled input | yes | yes | state |
| Is the modal open | yes | yes | state |
| Items of a shopping list | yes | yes | state |
| Interval or timeout id | no | yes | ref |
| The real `<input>` element | no | yes | ref |
| The previous value of a prop | usually no | yes | ref |
| The latest callback, for use inside an effect | no | yes | ref |
| "Is the mouse button down" read only in handlers | no | yes | ref |
| A filtered list worked out from props | yes | no (just recalculate it) | plain variable |

A useful difference: state is a **snapshot**, a ref is **live**. Inside one handler, after `setCount(count + 1)` the variable `count` still has the old value, because it belongs to the render that created this handler. But after `ref.current = ref.current + 1`, reading the ref gives the new value on the very next line. We logged both in one click: `count=0 ref=1`.

When a ref value must reach the screen later, copy it into state at that moment, like `MeasureBox` did in section 3.

**Common mistake:**

```jsx
// WRONG: the loading flag is in a ref, so the spinner never appears
const loading = useRef(false)
async function load() {
  loading.current = true
  await fetchData()
  loading.current = false
}
return loading.current ? <Spinner /> : <List />

// RIGHT
const [loading, setLoading] = useState(false)
```

Why: "refs do not cause renders" is a feature for hidden values. Using it to skip renders for visible values just gives you a screen that is out of date.

## 7. Handy patterns with mutable refs

### 7a. The previous value (`usePrevious`)

How do you know what a prop or state value was on the last render? Store it in a ref **after** each render, and return it before that happens.

```jsx
import { useEffect, useRef, useState } from 'react'

function usePrevious(value) {
  const ref = useRef(undefined)

  useEffect(() => {
    ref.current = value // runs after the screen is updated
  })

  return ref.current // so for now it still holds the value from the last render
}

function Counter() {
  const [count, setCount] = useState(0)
  const [other, setOther] = useState(0)
  const previous = usePrevious(count)

  return (
    <div>
      <p>Now: {count}, before: {String(previous)}</p>
      <button onClick={() => setCount(count + 1)}>Add</button>
      <button onClick={() => setOther(other + 1)}>Other</button>
    </div>
  )
}
```

**What happens, step by step** (real output):
1. Mount. The hook returns `ref.current`, which is `undefined`. The screen shows `Now: 0, before: undefined`. After the render is on the page, the effect stores `0` in the ref.
2. Click Add. The hook returns the stored `0`: `Now: 1, before: 0`. Then the effect stores `1`.
3. Click Add again: `Now: 2, before: 1`.
4. Click Other. This is an unrelated state change, but it still renders the component. `count` is still `2`, and the ref holds `2` from the last render. The screen shows `Now: 2, before: 2`.

Step 4 is the catch. This version returns the value from **the last render**, not the last **different** value. It is the classic interview answer, so know it and know that limit.

It also reads `ref.current` during render, which section 5 told you to avoid. The React docs show a version that follows the rule. It keeps the previous value in state and updates it while rendering, with a condition so it cannot loop:

```jsx
function usePrevious(value) {
  const [current, setCurrent] = useState(value)
  const [previous, setPrevious] = useState(null)

  if (value !== current) {
    setPrevious(current)
    setCurrent(value)
  }

  return previous
}
```

Calling a setter during render is allowed for the **same** component when it sits behind a condition like this. React re-runs the component at once, before anything reaches the screen. Real output for Add, Add, Other: `0`, then `1`, then still `1`. It remembers the last different value. Pick the version that matches what you need.

### 7b. The latest value or callback (fixing stale closures)

A **stale closure** is a function that remembers old variable values from the render where it was created. It happens with timers and listeners that you set up once:

```jsx
useEffect(() => {
  const id = setInterval(() => {
    console.log('count is', count) // always the count from the first render
  }, 1000)
  return () => clearInterval(id)
}, [])
```

Here the interval is created on the first render, so `count` inside is `0` forever. (The ESLint hooks rule warns you about this missing dependency, and it is right to.) If you only need to **change** state, the fix is an updater function: `setCount((c) => c + 1)`. If you need to **read** the latest value, keep it in a ref:

```jsx
import { useEffect, useRef, useState } from 'react'

function Ticker() {
  const [count, setCount] = useState(0)
  const countRef = useRef(count)

  useEffect(() => {
    countRef.current = count // keep the box up to date after every render
  })

  useEffect(() => {
    const id = setInterval(() => {
      console.log('stale:', count, 'latest:', countRef.current)
    }, 1000)
    return () => clearInterval(id)
  }, []) // the interval is created once and never restarted

  return <button onClick={() => setCount(count + 1)}>Add ({count})</button>
}
```

**What happens, step by step:**
1. The first effect runs after every render and copies the newest `count` into the ref.
2. The second effect runs once. The interval it creates closes over the first render's `count` (`0`), but it reads the ref, which the first effect keeps fresh.
3. We clicked twice, waited one second, clicked once more, waited another second. The console printed `stale: 0 latest: 2`, then `stale: 0 latest: 3`.

The same trick works for a whole callback. This is the famous `useInterval` hook:

```jsx
function useInterval(callback, delay) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback // always the newest callback
  })

  useEffect(() => {
    if (delay === null) return // null means "paused"
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay]) // restarts only when the delay changes
}
```

Used like `useInterval(() => setTotal(total + step), 1000)`, the callback may use the newest `total` and `step`, and the interval is not recreated when they change. We ran it: with `step` going from 1 to 2 the total went `2`, then `4`, and `setInterval` was called once.

React 19.2 added a built-in tool for exactly this job: `useEffectEvent`, covered in [other hooks](09-other-hooks.md). The ref version still appears in a lot of existing code and in interviews, and it works in every React version.

Do not use this trick to hide a real dependency. If a value should restart the effect (a `roomId` for a chat connection, say), keep it in the dependency array.

### 7c. A "mounted" flag, and why you rarely need it

```jsx
const isMounted = useRef(false)

useEffect(() => {
  isMounted.current = true
  return () => {
    isMounted.current = false
  }
}, [])
```

Code can then ask `if (isMounted.current) setData(result)` before updating state after an async call. It works, and it even survives StrictMode (we logged `mounted=true, mounted=false, mounted=true`, because StrictMode mounts, unmounts and mounts again in development).

But the reason people wrote it is gone. Old React versions printed a warning when you set state on an unmounted component. React 19 does not (we checked: no message). The right way to stop stale async work is to cancel it in the effect itself, with an `AbortController` or an `ignore` flag. The [useEffect lesson](03-useeffect.md) shows how.

**Common mistake:** using a ref to skip the first run of an effect.

```jsx
// WRONG: breaks in development
const isFirst = useRef(true)
useEffect(() => {
  if (isFirst.current) {
    isFirst.current = false
    return
  }
  saveToServer(value) // runs on mount in StrictMode!
}, [value])
```

We tested it. A normal mount logs nothing, as intended. Under StrictMode the effect ran on mount anyway. StrictMode runs the effect, cleans up, and runs it again, and the ref keeps its value through that rehearsal. So the second run sees `isFirst.current === false`. Fix: write the effect so it is harmless on mount, or do the work in the event handler that changed the value.

## 8. Callback refs and ref cleanup functions

So far you passed an object to `ref`. You can also pass a **function**. This is a **callback ref**. React calls it with the DOM node when the node is attached to the page.

For a long time React then called the same function with `null` when the node was removed. React 19 adds a better way: your callback may **return a cleanup function**. If it does, React calls that cleanup on removal, **instead of** calling the callback with `null`. It is the same idea as the cleanup of an effect, tied to the life of one element.

When do you need this? When you must run code at the exact moment an element appears or disappears. A good example is watching an element's size with a `ResizeObserver` (a browser tool that reports size changes):

```jsx
import { useCallback, useState } from 'react'

function SizeReporter() {
  const [width, setWidth] = useState(0)

  const watchSize = useCallback((node) => {
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect() // runs when the node is removed
  }, [])

  return <div ref={watchSize}>Width: {width}px</div>
}
```

**What happens, step by step:**
1. React puts the `<div>` on the page and calls `watchSize(node)`.
2. We create an observer and start watching the node. When the size changes, the observer calls `setWidth` and the text updates.
3. We return a function that stops the observer.
4. When the `<div>` leaves the page, React calls that returned function, so nothing keeps watching a node that no longer exists. (We tested this with a fake observer: the events were `created`, `observe DIV`, `disconnect`.)

Another typical use is measuring a node as soon as it appears. A ref object cannot tell you "now it exists", but a callback ref can:

```jsx
import { useCallback, useState } from 'react'

function MeasuredHeading() {
  const [height, setHeight] = useState(0)

  const measuredRef = useCallback((node) => {
    if (node !== null) {
      setHeight(node.getBoundingClientRect().height)
    }
  }, [])

  return (
    <div>
      <h1 ref={measuredRef}>Hello</h1>
      <p>The heading is {Math.round(height)}px tall</p>
    </div>
  )
}
```

Here the `node !== null` check is needed because we did not return a cleanup, so React will also call us with `null` when the heading goes away. (In jsdom there is no layout, so a test needs a stub for `getBoundingClientRect`. With a stub that returns a height of 48, the text read `The heading is 48px tall`.)

**Why `useCallback`?** React calls a callback ref again whenever the function **changes**. An inline arrow function is a new function on every render. We logged what React does with each style:

| Ref style | On mount | On every re-render | On unmount |
|---|---|---|---|
| Object ref (`useRef`) | sets `current` to the node | nothing | sets `current` to `null` |
| Inline callback, no cleanup | `cb(node)` | `cb(null)`, then `cb(node)` | `cb(null)` |
| Inline callback, with cleanup | `cb(node)` | cleanup, then `cb(node)` | cleanup |
| Stable callback (`useCallback`), with cleanup | `cb(node)` | nothing | cleanup |

So with an inline callback, setup and teardown repeat on every render. For cheap work that is fine. For an observer or an event listener, make the function stable with `useCallback` (or define it outside the component when it does not need props or state).

In development, StrictMode also runs your callback an extra time on mount, like it does for effects: `attach`, `cleanup`, `attach` (we logged exactly that). Your setup and cleanup must undo each other.

**Callback ref or object ref?** Use the object ref by default: it is short, and you read it in handlers and effects. Reach for a callback ref when you must react to the node appearing or disappearing, when you want to collect many nodes (next section), or when one element needs to feed two refs.

**Common mistake:**

```jsx
// WRONG for React 19 types: the arrow function implicitly returns the assignment's value
<input ref={(node) => (inputs.current = node)} />

// RIGHT: use braces, so nothing is returned (or return a real cleanup function)
<input ref={(node) => { inputs.current = node }} />
```

Why: in React 19 a returned function is treated as a cleanup. The React 19 TypeScript types reject any other implicit return value from a ref callback, to stop this kind of accident. At runtime we saw no warning for the first form and the node was stored, but the braces version is the safe habit.

## 9. Refs for lists: the Map pattern

Suppose you render a list and want to scroll to, or focus, one item by its id. You need one ref per item. But you cannot call `useRef` inside a loop, because hooks must run in the same order on every render (see [hooks overview and rules](01-hooks-overview-and-rules.md)).

The pattern: keep **one** ref that holds a `Map` (a key-value store), and let each item register its element in it with a callback ref.

```jsx
import { useRef } from 'react'

function CardList({ cards }) {
  const itemsRef = useRef(null)

  function getMap() {
    if (itemsRef.current === null) {
      itemsRef.current = new Map() // created on first use
    }
    return itemsRef.current
  }

  function scrollToCard(id) {
    const node = getMap().get(id)
    if (node) {
      node.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div>
      <button onClick={() => scrollToCard(3)}>Go to card 3</button>
      <ul>
        {cards.map((card) => (
          <li
            key={card.id}
            ref={(node) => {
              const map = getMap()
              map.set(card.id, node)
              return () => {
                map.delete(card.id)
              }
            }}
          >
            {card.title}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

**What happens, step by step:**
1. `itemsRef` starts as `null`. `getMap()` fills it with an empty `Map` the first time anyone asks (the lazy initialisation from section 5).
2. When React attaches each `<li>`, it calls that item's ref callback. The callback stores the element in the map under the card's id.
3. A click on the button calls `scrollToCard(3)`. It looks up the element by id and scrolls to it.
4. When a card is removed, React runs its cleanup and the entry is deleted. We tested it: with three cards the map had size 3. After removing card 3 the size was 2, and "Go to card 3" found nothing and did nothing, with no crash (that is what the `if (node)` guard is for).

Use a stable id as the key of the map. Using the array index would break as soon as items are inserted or reordered. We also checked that after adding a new first card, the entry for card 1 still pointed at card 1's element.

Another way out: make each row its own small component. Every component copy can call `useRef` for itself. Pick the Map when the parent needs to reach any item by id.

**Common mistake:**

```jsx
// WRONG: a hook inside a loop. React throws or misbehaves when the list length changes.
{items.map((item) => {
  const ref = useRef(null)
  return <li key={item.id} ref={ref}>{item.name}</li>
})}
```

Fix: the Map pattern above, or a child component that owns its ref.

## 10. Passing a ref to your own component

`<input ref={inputRef} />` works because `input` is a browser element. What about your own component, like `<FancyInput ref={inputRef} />`? The parent wants the real `<input>` that lives inside `FancyInput`.

**React 19 (current): `ref` is a normal prop for function components.** Take it out of the props and hand it to the element inside:

```jsx
import { useRef } from 'react'

function FancyInput({ ref, label, ...rest }) {
  return (
    <label>
      {label}
      <input ref={ref} {...rest} />
    </label>
  )
}

function Form() {
  const inputRef = useRef(null)

  return (
    <div>
      <FancyInput ref={inputRef} label="Name" />
      <button onClick={() => inputRef.current.focus()}>Focus the name field</button>
    </div>
  )
}
```

**What happens, step by step:**
1. `Form` creates `inputRef` and passes it to `FancyInput` as the `ref` prop.
2. `FancyInput` receives it like any other prop and puts it on the real `<input>`.
3. React sets `inputRef.current` to that `<input>`, even though `Form` never sees the `<input>` in its own JSX.
4. The click handler calls `.focus()` on it. We ran this and focus moved to the input, with no console warnings.

Because `ref` is now just a prop, a component that spreads all its props onto an element forwards the ref too: `function Input(props) { return <input {...props} /> }` works (we checked).

If the child ignores the prop, nothing is wired up. `inputRef.current` stays what it was (`null` if you started with `null`), and in 19.3.1 React prints no warning. Older versions did warn, which is how people learned about `forwardRef`.

**The older way: `forwardRef`.** In React 18 and earlier, `ref` was a reserved name like `key`. React removed it from the props, so a function component could never see it. `forwardRef` was a wrapper that passed the ref in as a **second argument**:

```jsx
import { forwardRef } from 'react'

const FancyInput = forwardRef(function FancyInput({ label, ...rest }, ref) {
  return (
    <label>
      {label}
      <input ref={ref} {...rest} />
    </label>
  )
})
```

The parent code is identical. It still works in React 19.3.1 with no warning. The React docs say it will be deprecated in a future release (no date given). You will see it all over older codebases and in many UI libraries, and interviewers still ask about it, so read it fluently. Write new code with the `ref` prop.

Refs also work on class components: the ref then holds the class instance, so you can call its methods. That is legacy, only for old code.

**New in React 19.3: refs on a Fragment.** A Fragment groups children without adding an element to the page. Now you can put a ref on it, to act on the whole group. You must write `<Fragment ref={...}>` with the import, because the short `<>` form cannot take a ref:

```jsx
import { Fragment, useRef } from 'react'

function TwoFields() {
  const groupRef = useRef(null)

  return (
    <div>
      <Fragment ref={groupRef}>
        <input placeholder="First" />
        <input placeholder="Second" />
      </Fragment>
      <button onClick={() => groupRef.current.focus()}>Focus first</button>
      <button onClick={() => groupRef.current.focusLast()}>Focus last</button>
    </div>
  )
}
```

`groupRef.current` is a special object (a `FragmentInstance`), not a DOM element. It has helper methods such as `focus`, `focusLast`, `blur`, `scrollIntoView` and `addEventListener`, which act on the Fragment's top-level DOM children. In our test, `focus()` landed on the first input and `focusLast()` on the second. For TypeScript types of refs, see the [TypeScript lesson](../03-intermediate/08-typescript-with-react.md). The full list of React 19 changes is in [React 19 and newer](../04-advanced/04-react-19-and-newer.md).

**Common mistake:**

```jsx
// WRONG: the ref prop is received but never used, so the parent's ref stays empty
function FancyInput({ label }) {
  return <input aria-label={label} />
}

// RIGHT
function FancyInput({ label, ref }) {
  return <input aria-label={label} ref={ref} />
}
```

Why: React hands you the ref. Wiring it to a real element is your job.

## 11. useImperativeHandle: expose a small API

When a parent gets a ref to your inner `<input>`, it gets the **whole** DOM node. It could change the style, remove it, or call anything. Sometimes you want to give the parent just a few safe commands. Sometimes the commands are not even DOM methods, like `shake()` or `reset()`.

`useImperativeHandle(ref, createHandle, dependencies)` lets you decide what the parent sees in `ref.current`.

```jsx
import { useImperativeHandle, useRef } from 'react'

function FancyInput({ ref }) {
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

  return <input ref={inputRef} defaultValue="hello" />
}

function Parent() {
  const fieldRef = useRef(null)

  return (
    <div>
      <FancyInput ref={fieldRef} />
      <button onClick={() => fieldRef.current.focus()}>Focus it</button>
      <button onClick={() => fieldRef.current.clear()}>Clear it</button>
    </div>
  )
}
```

**What happens, step by step:**
1. `FancyInput` keeps its own private ref, `inputRef`, to the real `<input>`.
2. `useImperativeHandle` tells React: "whatever ref the parent passed me, fill `current` with **this object** instead of a DOM node." The object has two methods.
3. The parent calls `fieldRef.current.focus()` or `.clear()`. These run the code inside `FancyInput`, which uses the private ref.
4. The parent cannot reach the real input. We listed the keys on the handle: only `focus` and `clear`. `fieldRef.current.style` is `undefined`.

The third argument is a dependency array, like in effects. React rebuilds the handle only when a listed value changes. (We tested with a `label` dependency: the handle was created for `a` and again for `b`, not on unrelated renders.) List any prop or state your methods use.

With the old API, the shape is the same, just wrapped in `forwardRef`:

```jsx
const FancyInput = forwardRef(function FancyInput(props, ref) {
  const inputRef = useRef(null)
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current.focus() }), [])
  return <input ref={inputRef} />
})
```

**When to use it, and when not.** Use it sparingly, for real commands that no prop can express: focus, scroll to a spot, play or pause, open an animated dialog, trigger a reset. If you can describe it as data (`open`, `value`, `selected`), use a prop instead. That is the React way, and it keeps the parent and child easy to follow.

**Common mistake:**

```jsx
// WRONG: pushing data into the child through an imperative method
panelRef.current.setOpen(true)

// RIGHT: let the parent own the data and pass it down
<Panel open={open} />
```

Why: with props, React always knows what is on screen. A method call hides a change from React's normal data flow, which is how bugs creep in.

## 12. flushSync: when you need the DOM updated right now

When you call a state setter, React does not update the page on that line. It waits until your handler finishes, then renders everything together (**batching**). That is normally good. But if the **next line** of your handler reads the DOM and expects the change, it sees the old page.

Here, a handler adds a task and then reads the last `<li>`:

```jsx
import { useRef, useState } from 'react'

function TaskList() {
  const [tasks, setTasks] = useState(['first'])
  const [seen, setSeen] = useState('')
  const listRef = useRef(null)

  function handleAdd() {
    setTasks([...tasks, `task ${tasks.length + 1}`])
    setSeen(listRef.current.lastChild.textContent) // reads the DOM too early
  }

  return (
    <div>
      <ul ref={listRef}>
        {tasks.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <button onClick={handleAdd}>Add</button>
      <p>Last item right after setState: {seen}</p>
    </div>
  )
}
```

We clicked Add once. The paragraph said `Last item right after setState: first`. The list on the page already showed `task 2`, but the handler had read it a moment too early.

`flushSync` from `react-dom` forces React to apply the update to the page immediately, inside that call:

```jsx
import { flushSync } from 'react-dom'

function handleAdd() {
  flushSync(() => {
    setTasks([...tasks, `task ${tasks.length + 1}`])
  })
  setSeen(listRef.current.lastChild.textContent) // now the new item is in the DOM
}
```

With `flushSync`, the same click gave `Last item right after setState: task 2`.

Treat `flushSync` as an **escape hatch**. It skips batching, so it can slow the page down, and React complains if you call it during render or inside an effect. In most cases there is a better way: do the DOM work in an effect that runs after the state change.

```jsx
useEffect(() => {
  endRef.current.scrollIntoView({ behavior: 'smooth' }) // after new messages are on the page
}, [messages])
```

We tested a chat list with this effect: it scrolled once on mount and once after sending a message. See [how React renders](../04-advanced/01-how-react-renders.md) for the batching rules behind this.

**Common mistake:**

```jsx
// WRONG: the DOM has not changed yet on the next line
setOpen(true)
dialogRef.current.querySelector('input').focus() // input may not exist yet

// RIGHT: wait for the render, in an effect that depends on the state
useEffect(() => {
  if (open) dialogRef.current.querySelector('input').focus()
}, [open])
```

## 13. When NOT to use refs

**Do not change DOM that React manages.** React keeps a picture of what each element should look like. If you edit the same element by hand (text, classes, attributes, children), React does not know. Then one of two things happens: React overwrites your change, or React gets confused and crashes.

We tried two experiments:

```jsx
function Panel() {
  const [open, setOpen] = useState(false)
  const [n, setN] = useState(0)
  const ref = useRef(null)

  return (
    <div>
      <div ref={ref} className={open ? 'panel open' : 'panel'}>Panel {n}</div>
      <button onClick={() => ref.current.classList.add('highlight')}>Hack</button>
      <button onClick={() => setN(n + 1)}>Change text</button>
      <button onClick={() => setOpen(!open)}>Toggle open</button>
    </div>
  )
}
```

1. After "Hack", the class was `panel highlight`.
2. After "Change text" (a render that does not touch `className`), it was still `panel highlight`.
3. After "Toggle open" changed the `className` prop, it became `panel open`. The `highlight` class vanished.

Your change survives some renders and disappears on others. That is the worst kind of bug: it depends on what else happens. The second experiment removes an element that React rendered, with `ref.current.remove()`, and then asks React to hide it. React tries to remove a node that is already gone and throws a `NotFoundError` ("the node to be removed is not a child of this node", exact wording depends on the browser). With no error boundary, the whole tree disappears.

The safe actions on a ref are the ones React does not track: **focus, scroll position, text selection, measuring, media playback**. For anything React renders (text, classes, which children exist), change state or props and let React do it. One more safe case: you render an empty `<div ref={...}>` and hand it to a non-React library, such as a map or chart, which then owns everything inside that div.

**Do not use refs to move data between components.** A parent that calls `childRef.current.getValue()` to collect form data is fighting the data flow. Lift the state up, or use callbacks (see [thinking in React](../01-basics/08-thinking-in-react.md)).

**Do not search the page by hand.** `document.getElementById('name')` or `document.querySelector(...)` inside a component bypasses React. It breaks when two copies of the component are on the page, and when the element lives in another place (like a portal, see [portals](../03-intermediate/05-error-boundaries-portals-and-friends.md)). A ref always points at the element of this copy of the component.

**Common mistake:**

```jsx
// WRONG: looks up the element by id, global and fragile
const name = document.getElementById('name').value

// RIGHT: a ref belongs to this component copy
const name = nameRef.current.value
```

## 14. createRef vs useRef

`createRef()` also makes a `{ current: null }` box. The difference is when it makes a new one.

- `createRef()` creates a **new** object every time it is called. It was made for class components, which create it once in the constructor.
- `useRef()` creates the object on the first render and returns the **same** object on every later render.

In a function component, `createRef` runs on every render, so you get a fresh empty box each time. Values are lost. We tested it with a "Save" button that wrote to the ref, and a "Log" button that read it. Before a re-render the log said `saved`. After one re-render it said `null`. With `useRef`, it said `saved` both times.

|  | `createRef` | `useRef` |
|---|---|---|
| Made for | class components | function components |
| New object each render | yes | no |
| Keeps a value between renders in a function component | no | yes |

A DOM ref made with `createRef` in a function component can seem to work, because React fills the new box again after every commit. It wastes work, and breaks as soon as you store anything else in it. In function components, always use `useRef`.

**Common mistake:**

```jsx
// WRONG in a function component: a new box on every render
const timerRef = createRef()

// RIGHT
const timerRef = useRef(null)
```

## 15. Uncontrolled inputs with refs

A **controlled** input keeps its text in React state: you pass `value` and `onChange`, and React is the single source of truth. An **uncontrolled** input keeps its text in the browser's own element. React does not know it until you ask. You ask through a ref (or through `FormData`). `defaultValue` sets the starting text.

```jsx
import { useRef, useState } from 'react'

function NameForm() {
  const nameRef = useRef(null)
  const [greeting, setGreeting] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    setGreeting(`Hello, ${nameRef.current.value}!`)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name
        <input ref={nameRef} defaultValue="" />
      </label>
      <button>Greet</button>
      <p>{greeting}</p>
    </form>
  )
}
```

**What happens, step by step:**
1. The user types. The browser keeps the text inside the input. React is not involved, and the component does not render on each key press.
2. The user submits. `handleSubmit` reads `nameRef.current.value`, the text at that moment.
3. We store the greeting in state so it reaches the screen. We typed `Ada` in a test and got `Hello, Ada!`.

When is this a good choice?
- **File inputs.** `<input type="file">` can only be uncontrolled. You read `fileRef.current.files` (a list of the chosen files, empty at first).
- **Simple forms** where you only need the values at submit time.
- **Hooking into non-React code** that reads or sets the input itself.

When should you choose controlled instead? When the screen reacts to the text while the user types: live validation, a character counter, disabling the button until the form is valid, formatting as you type. For many fields, `new FormData(event.currentTarget)` reads everything at once without a ref per field. The [forms lesson](../01-basics/07-forms.md) compares both styles in depth.

One React 19 detail: after a successful `<form action={fn}>`, React resets uncontrolled fields back to their default values. See [React 19 and newer](../04-advanced/04-react-19-and-newer.md).

**Common mistake:**

```jsx
// WRONG: value without onChange makes a read-only field, and React logs a warning
<input ref={nameRef} value="Ada" />

// RIGHT for an uncontrolled field: defaultValue
<input ref={nameRef} defaultValue="Ada" />
```

Why: `value` tells React "I control this field". Without an `onChange` that updates the value, the user cannot type.

## How interviewers test this
- They want you to name the **two jobs** of `useRef` (DOM handle, mutable box) and to pick the right one for a task: "focus an input" is the first, "store a timer id" is the second.
- A strong answer states two rules without being asked: **changing a ref does not re-render**, and **do not read or write `ref.current` during render** (except lazy initialisation). Saying "use state for anything the screen shows" ties them together.
- Expect follow-ups in a chain: ref vs state, then "how do you get the previous value", then "how do you avoid a stale closure", then "how do you pass a ref to a child component". Know React 19's `ref` prop **and** `forwardRef`, because both appear in real code.
- Senior-level checks: callback refs and cleanup functions, StrictMode running ref callbacks twice in development, a Map of refs for lists, `useImperativeHandle` used sparingly, and why you never edit DOM that React renders.
- Red flags: `document.querySelector` inside components, storing values the screen shows in refs, using a ref to skip effect runs, claiming `forwardRef` is required in React 19, putting `ref.current` in a dependency array, and treating an `isMounted` ref as a good default.
- In machine-coding rounds refs appear as the building blocks of focus management in a modal ([exercise 14](../practice-app/exercises/react/14-modal-portal/README.md)), a stopwatch ([exercise 18](../practice-app/exercises/react/18-stopwatch/README.md)) and click outside ([exercise 21](../practice-app/exercises/react/21-dropdown-click-outside/README.md)).

## Interview questions and model answers

### Q1. What is `useRef`, and what is it used for? (Easy)
`useRef(initial)` returns a plain object `{ current: initial }`, and React gives you the same object on every render. It has two jobs. The first is holding a **DOM element**: you pass the ref in the `ref` attribute and React fills `current` with the real element, so you can focus, scroll, measure or play it. The second is a **mutable box** that survives renders without causing them: timer ids, the previous value, the latest callback, a library instance. Changing `ref.current` never triggers a re-render.

```jsx
const inputRef = useRef(null)        // job 1: <input ref={inputRef} />
const timerId = useRef(null)         // job 2: timerId.current = setTimeout(...)
```

### Q2. What is the difference between `useRef` and `useState`? (Easy)
Both keep a value between renders. The difference is what a change does. Calling a state setter **schedules a re-render**, and the new value shows up in the next render (state is a snapshot). Assigning to `ref.current` **does nothing else**, and the new value is readable immediately on the next line. So use state for anything the screen displays or depends on, and a ref for values the user never sees, like a timer id or a DOM element. Putting visible data in a ref gives you a screen that is out of date.

### Q3. Why does changing a ref not cause a re-render? (Easy)
React renders again only when something tells it to: a state setter, a new parent render, a changed context. `ref.current = 5` is a plain assignment to a JavaScript object. React is not involved, and it cannot see it (there is no setter or proxy). That is deliberate: a ref is an escape hatch for values that should not drive the UI. The catch to remember is that the screen can show a stale value if you display a ref. We saw `Ref: 0` on screen while the ref held `3`, until an unrelated state change forced a render.

### Q4. How do you focus an input when the component mounts? (Easy)
There are two ways. The simple one is the `autoFocus` attribute: `<input autoFocus />`. The flexible one is a ref and an effect, because the ref is `null` during the first render and filled in only after React commits to the page:

```jsx
function SearchBox() {
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current.focus()
  }, [])

  return <input ref={inputRef} />
}
```

Calling `.focus()` in the render body would crash, since `inputRef.current` is `null` then. The effect also runs twice in development under StrictMode, which is harmless here. Mention accessibility: moving focus on load can disturb screen reader users, so do it only when it helps.

### Q5. What is `forwardRef`, why was it needed, and what changed in React 19? (Medium)
In React 18 and earlier, `ref` was a reserved name, like `key`. React removed it from the props, so a function component could not see the ref its parent passed. `forwardRef((props, ref) => ...)` wrapped the component and handed the ref in as a second argument, so the component could attach it to an inner DOM node. In React 19, `ref` is an **ordinary prop** for function components: write `function Input({ ref }) { return <input ref={ref} /> }` and no wrapper is needed. `forwardRef` still works in 19.3.1 with no warning, and the docs say it will be deprecated in a future release. Say you would write the `ref` prop in new code but you can read `forwardRef` code, which is everywhere in older apps and libraries.

### Q6. What is `useImperativeHandle`, and when would you use it? (Medium)
It controls what a parent gets when it puts a ref on your component: `useImperativeHandle(ref, () => ({ focus() { ... } }), [])`. Instead of the whole DOM node, the parent gets only the small object you return. That limits what the parent can do and lets you expose commands that are not DOM methods. Use it sparingly, for real imperative commands such as `focus()`, `scrollToTop()`, `play()` or `reset()`. If something can be a prop (`open`, `value`), make it a prop. The third argument lists dependencies, and React rebuilds the handle only when they change.

### Q7. How do you get the previous value of a prop or state? (Medium)
Keep it in a ref and update the ref in an effect, which runs after the render. During render, the ref still holds the old value, so you return that:

```jsx
function usePrevious(value) {
  const ref = useRef(undefined)
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}
```

Two things to add. This returns the value from the last **render**, so after an unrelated re-render it equals the current value. And it reads `ref.current` during render, against the usual rule. The React docs show a rule-following alternative: store the previous value in state and update it during render behind an `if (value !== current)` check. That version returns the last **different** value.

### Q8. What is the difference between a callback ref and an object ref? (Medium)
An **object ref** (`useRef`) is a box you read later: `ref.current` is the node, set after mount and `null` after unmount. A **callback ref** is a function you pass to `ref`. React calls it with the node when it attaches. Before React 19 it also called it with `null` on removal. In React 19 the callback can return a cleanup function, which React calls on removal instead. Use an object ref by default. Use a callback ref when you must run code at the moment a node appears or disappears (measure it, observe it, register it in a Map of refs). An inline callback is a new function each render, so React calls it again every render. Wrap it in `useCallback` when setup is expensive.

### Q9. Can you read or write `ref.current` during render? (Medium)
No, with one exception. Render must be a pure calculation, because React may run it more than once, pause it or discard it. Writing a ref in render is a hidden side effect, and reading one is a hidden input that React cannot track, so the output can be stale. Read and write refs in event handlers, effects and callback refs. The exception is **lazy initialisation**: `if (ref.current === null) ref.current = new Expensive()`, which is safe because it runs once and the result never changes. The `react-hooks/refs` lint rule flags violations, and React Compiler skips components that break the rule. Related: never change DOM that React renders through a ref, because React will overwrite your change or crash.

### Q10. How would you stop a `setInterval` from a button click? Where do you keep the interval id? (Easy)
In a ref. The id has to survive between the render that started the timer and the later render that stops it, but it is not shown on screen, so it must not cause renders.

```jsx
const intervalId = useRef(null)

function start() {
  intervalId.current = setInterval(tick, 1000)
}
function stop() {
  clearInterval(intervalId.current)
  intervalId.current = null
}
useEffect(() => () => clearInterval(intervalId.current), []) // clear on unmount
```

A plain `let` fails because each render makes a new variable, so `stop` sees `null`. State works but renders for nothing. A module-level variable is shared by every copy of the component.

### Q11. When would you use an uncontrolled input with a ref instead of state? (Medium)
When you only need the value at one moment, usually on submit, and the screen does not react while the user types. Examples: a simple form, a file input (always uncontrolled, read `ref.current.files`), or an input that non-React code also touches. You set the start text with `defaultValue` and read `ref.current.value` in the handler. Choose a controlled input (`value` plus `onChange`) when you need live validation, a character counter, formatting as the user types or a button disabled until the form is valid. For many fields, `new FormData(form)` avoids one ref per field.

### Q12. How do you create refs for a list of items? (Medium)
You cannot call `useRef` in a loop, since hooks must run in the same order on every render. Keep one ref that holds a `Map` keyed by a stable id, and give each item a callback ref that adds its element to the map (and, in React 19, returns a cleanup that deletes it):

```jsx
ref={(node) => {
  const map = getMap()
  map.set(card.id, node)
  return () => map.delete(card.id)
}}
```

Then `getMap().get(id)?.scrollIntoView()` reaches any item. Do not key the map by array index, because indexes shift when items are added or moved. The other option is a small child component per item, each with its own `useRef`.

### Q13. How do you read the latest state inside a `setInterval` or event listener without recreating it every render? (Hard)
The effect that creates the interval closes over the values of the render where it ran, so they go **stale**. If you only need to update state, use the updater form: `setCount((c) => c + 1)`. If you need to read the latest value, mirror it into a ref in an effect that runs after every render, and read the ref inside the timer:

```jsx
const latest = useRef(callback)
useEffect(() => { latest.current = callback })
useEffect(() => {
  const id = setInterval(() => latest.current(), 1000)
  return () => clearInterval(id)
}, [])
```

This is the classic `useInterval` hook. React 19.2 added `useEffectEvent`, which solves the same problem with less ceremony. Do not use the ref to hide a value that should really restart the effect.

### Q14. What is the difference between `createRef` and `useRef`? (Easy)
`createRef` makes a new `{ current: null }` every time it is called. It is for class components, where it is called once in the constructor. In a function component it would run on every render, so the box is replaced each time and stored values are lost. `useRef` creates the box on the first render and returns the same one afterwards. In function components, always use `useRef`.

### Q15. What does `flushSync` do, and when would you need it? (Hard)
Normally React batches state updates and updates the page after your handler ends. `flushSync(() => setState(...))` from `react-dom` forces React to apply that update to the DOM immediately, before the call returns. You need it in rare cases where the next line reads the updated DOM through a ref, for example scrolling to a row you just added. It is an escape hatch: it gives up batching, it can hurt performance, and React complains if you call it during render or in an effect. Usually the better answer is an effect that depends on the state, so the DOM work runs after React has rendered.

## Common mistakes and gotchas
- **Reading or writing `ref.current` during render.** Move it into a handler or effect, or use state. Only lazy initialisation (`if (ref.current === null)`) is allowed.
- **Showing a ref value on screen.** It will not update. Use state for anything displayed.
- **Using a DOM ref before the element exists.** It is `null` during the first render and whenever the element is not rendered. Use effects and handlers, and guard with `ref.current?.` when the element is conditional.
- **`useRef(expensive())`.** The call runs on every render. Use the `null` check and fill the ref once.
- **Putting `ref.current` in a dependency array.** Changing a ref does not render, so the effect does not re-run until something else renders. Use state, or a callback ref when you need to react to a node appearing.
- **Changing DOM that React manages** (`classList`, `textContent`, `remove()`). React overwrites your change or throws. Change state or props instead.
- **`document.getElementById` or `querySelector` inside components.** It breaks with two copies of the component and with portals. Use a ref.
- **Forgetting to pass `ref` down.** In React 19 take `ref` from the props (or spread all props) and attach it to the inner element. A child that ignores it leaves the parent's ref empty.
- **An inline callback ref with expensive setup.** React calls it again on every render. Wrap it in `useCallback`.
- **A callback ref that implicitly returns something.** `ref={(n) => (x.current = n)}` is rejected by the React 19 TypeScript types. Use braces.
- **Skipping the first effect run with a ref flag.** StrictMode breaks it in development. Make the effect safe on mount instead.
- **Counting renders with `ref.current += 1` in render.** It double counts in StrictMode. Use the Profiler.
- **Reading a DOM ref in an effect cleanup.** By then React may already have set it to `null`. Copy the node into a variable at the top of the effect and use that variable in the cleanup.
- **TypeScript.** In the React 19 types, `useRef` needs an argument and you type a DOM ref like `useRef<HTMLInputElement>(null)`. See the [TypeScript lesson](../03-intermediate/08-typescript-with-react.md).
- **`createRef` in a function component.** It makes a new box every render. Use `useRef`.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Predict. A user clicks the button twice. What does the console print for each click, and what does the button say after the second click?

   ```jsx
   function Demo() {
     const [count, setCount] = useState(0)
     const ref = useRef(0)

     function handleClick() {
       setCount(count + 1)
       ref.current = ref.current + 1
       console.log(count, ref.current)
     }

     return <button onClick={handleClick}>Clicked {count} times</button>
   }
   ```

<details>
<summary>Show answer</summary>

The first click prints `0 1`. The second click prints `1 2`. After the second click the button says `Clicked 2 times`.

`count` is a snapshot. Inside one handler it keeps the value from the render that created the handler, so the first click still sees `0` even though `setCount(count + 1)` was just called. The ref is live: `ref.current` is `1` on the very next line. After the first click React renders with `count` at `1`, and the second click's handler sees `1`, while the ref has moved on to `2`. We ran the first click and saw `0 1`.

</details>

2. **(Easy)** Code. Build a name field that is focused as soon as the component mounts. Add a "Clear" button that empties the field and puts the cursor back in it.

<details>
<summary>Show answer</summary>

```jsx
import { useEffect, useRef, useState } from 'react'

function NameField() {
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current.focus() // runs after the input is on the page
  }, [])

  function handleClear() {
    setName('')
    inputRef.current.focus() // clicking the button moved focus away, so move it back
  }

  return (
    <div>
      <label>
        Name
        <input ref={inputRef} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button onClick={handleClear}>Clear</button>
    </div>
  )
}
```

The text is state (it is shown and controlled). The element is a ref (a command target). We tested it: the input has focus right after mount, and after typing `Ada` and clicking Clear the value is empty and the input has focus again.

</details>

3. **(Easy)** Explain. You need to remember the id returned by `setInterval` so a Stop button can clear it. Why is a ref better than a normal `let` variable in the component, a variable at the top of the file, or state?

<details>
<summary>Show answer</summary>

- **`let` in the component body:** it is created again on every render. The timer changes state every second, so the component renders again and again, and the Stop button belongs to the newest render, where the variable is `null`. We ran this: Stop did nothing and the display kept counting.
- **A variable at the top of the file:** it survives renders, but all copies of the component share it. Two timers on one page would overwrite each other's id, and the value outlives the component.
- **State:** it survives, but each change schedules a render, and nobody sees the id, so those renders are wasted.
- **A ref:** one box per component copy, the same object on every render, and changing it is silent. That is exactly the set of properties this value needs.

</details>

4. **(Medium)** Code. Build a `Timer` with Start, Stop and Reset buttons that counts seconds. Keep the interval id in a ref, make sure double clicks on Start do not start two timers, and make sure no timer is left running after the component is removed. (Compare with the [stopwatch exercise](../practice-app/exercises/react/18-stopwatch/README.md).)

<details>
<summary>Show answer</summary>

```jsx
import { useEffect, useRef, useState } from 'react'

function Timer() {
  const [seconds, setSeconds] = useState(0)
  const intervalId = useRef(null)

  function start() {
    if (intervalId.current !== null) return // already running
    intervalId.current = setInterval(() => setSeconds((s) => s + 1), 1000)
  }

  function stop() {
    clearInterval(intervalId.current)
    intervalId.current = null
  }

  function reset() {
    stop()
    setSeconds(0)
  }

  useEffect(() => {
    return () => clearInterval(intervalId.current)
  }, [])

  return (
    <div>
      <p>{seconds}s</p>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
      <button onClick={reset}>Reset</button>
    </div>
  )
}
```

The `null` check in `start` is what protects against two timers. We tested in StrictMode with fake timers: two clicks on Start and 3 seconds gave `3s` (not 6), and after Reset plus 3 more seconds the display stayed at `0s` with 0 timers left.

</details>

5. **(Medium)** Predict. This uses the `usePrevious` hook from section 7a (the version with a ref and an effect with no dependency array). The user clicks Add, Add, then Other. What does the paragraph show after each of the three clicks? How would you change the hook so that after "Other" it still shows `before: 1`?

   ```jsx
   function Counter() {
     const [count, setCount] = useState(0)
     const [other, setOther] = useState(0)
     const previous = usePrevious(count)

     return (
       <div>
         <p>Now: {count}, before: {String(previous)}</p>
         <button onClick={() => setCount(count + 1)}>Add</button>
         <button onClick={() => setOther(other + 1)}>Other</button>
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

The three states are `Now: 1, before: 0`, then `Now: 2, before: 1`, then `Now: 2, before: 2`.

After Add, Add the hook returns the value stored after the previous render. Then Other changes unrelated state, the component renders again with `count` still `2`, and the ref holds `2` from the last render, so "before" equals "now". The hook returns the previous **render's** value, not the previous **different** value.

To keep the last different value, store it in state and update it during render, behind a condition:

```jsx
function usePrevious(value) {
  const [current, setCurrent] = useState(value)
  const [previous, setPrevious] = useState(null)

  if (value !== current) {
    setPrevious(current)
    setCurrent(value)
  }

  return previous
}
```

We ran it: Add, Add, Other gives `before: 0`, `before: 1`, `before: 1`. (It starts at `null` instead of `undefined`.)

</details>

6. **(Medium)** Code. Write a `VideoPlayer` component that renders a `<video>` and lets its parent call `play()` and `pause()` through a ref, without getting access to the `<video>` element itself. Show the parent with two buttons. Use React 19's `ref` prop.

<details>
<summary>Show answer</summary>

```jsx
import { useImperativeHandle, useRef } from 'react'

function VideoPlayer({ ref, src }) {
  const videoRef = useRef(null)

  useImperativeHandle(
    ref,
    () => ({
      play() {
        videoRef.current.play()
      },
      pause() {
        videoRef.current.pause()
      },
    }),
    [],
  )

  return <video ref={videoRef} src={src} />
}

function App() {
  const playerRef = useRef(null)

  return (
    <div>
      <VideoPlayer ref={playerRef} src="movie.mp4" />
      <button onClick={() => playerRef.current.play()}>Play</button>
      <button onClick={() => playerRef.current.pause()}>Pause</button>
    </div>
  )
}
```

`VideoPlayer` keeps its own private `videoRef`. `useImperativeHandle` swaps what the parent sees for the two-method object. We tested with `play` and `pause` stubs (jsdom does not implement media playback): one click on each called each method once. The dependency array is empty because the methods use only the ref, which never changes.

</details>

7. **(Medium)** Explain and fix. This component should show how many characters are in the box, but it crashes as soon as it renders. Why, and how do you fix it?

   ```jsx
   function CharCount() {
     const inputRef = useRef(null)

     return (
       <div>
         <input ref={inputRef} />
         <p>Length: {inputRef.current.value.length}</p>
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

It reads `inputRef.current` during render. On the first render the input is not on the page yet, so `current` is `null`, and React throws `Cannot read properties of null (reading 'value')` (we ran it). Even if it did not crash, reading a ref in render is wrong: typing does not render anything, so the number would never update.

The text affects what the screen shows, so it belongs in state:

```jsx
function CharCount() {
  const [text, setText] = useState('')

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <p>Length: {text.length}</p>
    </div>
  )
}
```

We typed `abcd` and the paragraph showed `Length: 4`. This is the same lesson as sections 1 and 5: if the screen shows it, use state.

</details>

8. **(Medium)** Code. Build a `Playlist` that renders a list of songs as buttons, plus a "Jump to last" button that moves keyboard focus to the last song button. Use the Map-of-refs pattern.

<details>
<summary>Show answer</summary>

```jsx
import { useRef } from 'react'

function Playlist({ songs }) {
  const itemsRef = useRef(null)

  function getMap() {
    if (itemsRef.current === null) {
      itemsRef.current = new Map()
    }
    return itemsRef.current
  }

  function focusSong(id) {
    getMap().get(id)?.focus()
  }

  return (
    <div>
      <button onClick={() => focusSong(songs.at(-1).id)}>Jump to last</button>
      <ul>
        {songs.map((song) => (
          <li key={song.id}>
            <button
              ref={(node) => {
                const map = getMap()
                map.set(song.id, node)
                return () => map.delete(song.id)
              }}
            >
              {song.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Each song button registers itself in the map under its id and removes itself on cleanup. We used three songs; clicking "Jump to last" focused the `Gamma` button. The key and the map key are the stable `song.id`, not the index. `?.` keeps `focusSong` safe if the id is missing.

</details>

9. **(Medium)** Explain. This component is written in the old style. Rewrite it for React 19, and say what happens if the author forgets to use the `ref` in the rewritten version.

   ```jsx
   const TextInput = forwardRef(function TextInput({ label }, ref) {
     return (
       <label>
         {label}
         <input ref={ref} />
       </label>
     )
   })
   ```

<details>
<summary>Show answer</summary>

```jsx
function TextInput({ label, ref }) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  )
}
```

There is no wrapper and no second argument: `ref` is read from the props like `label`. The parent code `<TextInput ref={inputRef} label="Name" />` does not change. We checked that both versions focus the input when the parent calls `inputRef.current.focus()`, with no console warning.

If the author forgets to attach `ref` to the `<input>`, nothing breaks loudly. The parent's `inputRef.current` just stays what it was (`null` if it started as `null`), and calling `.focus()` on it throws. In React 19.3.1 there is no warning for this, so test it. Spreading `{...props}` onto the input would also forward the ref.

</details>

10. **(Hard)** Predict. In development, with StrictMode on, what does this log for (a) the first mount, (b) one re-render caused by a state change, and (c) unmounting the component? Give the exact sequence of words.

    ```jsx
    function Field() {
      const [tick, setTick] = useState(0)

      return (
        <div>
          <input
            ref={() => {
              console.log('attach')
              return () => console.log('cleanup')
            }}
          />
          <button onClick={() => setTick(tick + 1)}>Re-render</button>
        </div>
      )
    }
    ```

<details>
<summary>Show answer</summary>

(a) Mount: `attach`, `cleanup`, `attach`. (b) One re-render: `cleanup`, `attach`. (c) Unmount: `cleanup`.

On mount, StrictMode rehearses an unmount and a mount to check that your cleanup really undoes your setup, so the callback runs, its cleanup runs, and it runs again. On re-render the arrow function is a **new function**, so React treats the ref as changed: it runs the old ref's cleanup, then attaches the new callback. On unmount only the cleanup runs, because a callback that returned a function is not called with `null`. We ran exactly this.

Two takeaways. Setup and cleanup must be symmetrical. And an inline callback ref repeats its setup on every render, so for expensive work wrap the function in `useCallback` and the re-render step disappears.

</details>

11. **(Hard)** Code. Write a hook `useEventListener(eventName, handler)` that adds a listener on `window` **once per event name** (not on every render) but always calls the **newest** `handler`. Then use it in a component that logs the current `count` on every keydown, where `count` is state changed by a button.

<details>
<summary>Show answer</summary>

```jsx
import { useEffect, useRef, useState } from 'react'

function useEventListener(eventName, handler) {
  const savedHandler = useRef(handler)

  useEffect(() => {
    savedHandler.current = handler // newest handler after every render
  })

  useEffect(() => {
    const listener = (event) => savedHandler.current(event)
    window.addEventListener(eventName, listener)
    return () => window.removeEventListener(eventName, listener)
  }, [eventName]) // re-attach only if the event name changes
}

function KeyLogger() {
  const [count, setCount] = useState(0)

  useEventListener('keydown', () => {
    console.log('count is', count)
  })

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>
}
```

The listener function that is attached to `window` never changes, but all it does is call `savedHandler.current`, which the first effect keeps pointing at the handler from the latest render. So the log shows the current count, and the listener is added once. Without the ref you would have to list `handler` in the dependencies and re-attach the listener on every render, or accept a stale `count`. This is the same trick as `useInterval` in section 7b.

</details>

12. **(Hard)** Explain. A chat app adds a message and then wants to scroll to the new last message. This handler scrolls to the previous last message instead. Why? Give two ways to fix it.

    ```jsx
    function handleSend() {
      setMessages([...messages, newMessage])
      listRef.current.lastChild.scrollIntoView()
    }
    ```

<details>
<summary>Show answer</summary>

`setMessages` only queues an update. React renders after the handler finishes (batching). So when `listRef.current.lastChild` runs on the next line, the new message is not in the DOM yet, and the old last child is scrolled to. We reproduced this with a list: reading the last child right after `setState` returned the old item while the page already showed the new one a moment later.

Fix 1: `flushSync` forces the update into the DOM first.

```jsx
import { flushSync } from 'react-dom'

function handleSend() {
  flushSync(() => {
    setMessages([...messages, newMessage])
  })
  listRef.current.lastChild.scrollIntoView()
}
```

With this, the same read returned the new item.

Fix 2 (usually better): scroll in an effect that runs after each render caused by new messages.

```jsx
useEffect(() => {
  listRef.current.lastChild.scrollIntoView()
}, [messages])
```

`flushSync` is an escape hatch that gives up batching and can slow the page. The effect version needs no special call and also handles messages that arrive from the network, not just from this handler.

</details>

## Recap
- `useRef(x)` returns the same `{ current: x }` object on every render. Changing `current` never causes a re-render.
- Job one: a DOM handle (`<input ref={r} />`) for focus, scroll, measure, play and pause. It is `null` during the first render and when the element is not rendered, so use it in effects and handlers.
- Job two: a mutable box for things the screen does not show: timer ids, the previous value, the latest callback, library instances.
- Ref or state: if the screen shows it, use state. Never read or write `ref.current` during render, except lazy initialisation (`if (ref.current === null)`).
- Callback refs run when a node attaches. In React 19 they may return a cleanup. Make them stable with `useCallback`. Use a Map of refs for lists.
- React 19: `ref` is a normal prop, so no `forwardRef` is needed, but you will still meet `forwardRef` in older code. `useImperativeHandle` exposes a small API, used sparingly.
- Do not change DOM that React manages, do not use `document.querySelector` in components, and reach for `flushSync` only as a rare escape hatch.
- Use `useRef` in function components, never `createRef`. Uncontrolled inputs read their value through a ref at submit time.

## Where to go next
- Next lesson: [useContext](05-usecontext.md).
- See refs packaged as reusable hooks (`usePrevious`, `useOnClickOutside`) in [custom hooks](08-custom-hooks.md), and `useLayoutEffect` and `useEffectEvent` in [other hooks](09-other-hooks.md).
- Practice in the app: [14 - Modal with portal and focus](../practice-app/exercises/react/14-modal-portal/README.md), [18 - Stopwatch with laps](../practice-app/exercises/react/18-stopwatch/README.md), [21 - Dropdown with click outside](../practice-app/exercises/react/21-dropdown-click-outside/README.md).
- Interview rounds: Round 1 hooks quiz (planned), Round 2 hooks theory (planned) and Round 3 state and closures (planned).
- Revise on one page: hooks cheatsheet (planned).
