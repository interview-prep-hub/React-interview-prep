# 02 - Throttle

**Level:** Easy | **Time:** 20 minutes | **Topics:** closures, timers (`setTimeout`), `this` and arguments, rate limiting

## The task

Write `throttle(fn, wait, options)`. It takes a function and returns a new function that lets `fn` run at most once every `wait` milliseconds, no matter how often you call it.

Think of a scroll handler. The browser can fire it 60 times a second, but you only want to update the page about 10 times a second. A throttle gives you regular updates and skips the rest. Calls that are skipped are not completely lost: the newest one can still run at the end of the window.

Work in [`index.js`](./index.js). Do not edit the test file.

Words used below:

- A **window** is a period of `wait` ms. A window opens on a call when the throttle is idle, and it closes `wait` ms later. Extra calls do NOT extend it.
- The **leading edge** is the start of a window. The **trailing edge** is the end of it.
- A call is **held back** when it arrives inside a window and does not run right away.

## Requirements

1. `index.js` has a named export `throttle(fn, wait = 0, { leading = true, trailing = true } = {})`. It returns a new function, called `throttled` below. `fn` itself is never changed.
2. If `fn` is not a function, `throttle` throws a `TypeError` (any message).
3. The throttle starts idle. A call made while it is idle opens a window that closes exactly `wait` ms later. The window has a fixed length: calls inside it never make it longer. A call made 1 ms before the window closes is still inside it. A call made when the window has already closed (and nothing was held back) is treated as a first call again.
4. `leading: true` (default) means the call that opens a window runs `fn` immediately, with its arguments and `this`.
5. Calls made while a window is open do not run `fn` immediately.
6. `trailing: true` (default) means that only the LAST call made inside the window is remembered, with its arguments and `this`. Earlier held back calls are forgotten. When the window closes, that remembered call runs `fn` right away, and a NEW window opens at that moment. So two runs of `fn` are never closer than `wait` ms. If no call was remembered, the throttle goes back to idle.
7. With both options on, a single call in a window runs `fn` once: the leading run is never repeated as a trailing run.
8. `leading: false` means the call that opens a window does not run immediately. It is held back like any other call, so a single call runs once, `wait` ms later, with the last arguments received. That run opens a new window, as in point 6.
9. `trailing: false` means calls made inside a window are dropped. When the window closes nothing runs, and the next call opens a new window (and with `leading: true` runs immediately).
10. `leading: false, trailing: false` never runs `fn`.
11. `throttled(...)` returns the result of the most recent run of `fn` (`undefined` before the first run). A call that does not run `fn` right now returns the previous result.
12. `throttled.cancel()` closes the window (it stops the timer, so the old window can never close a window that opens later) and drops the held back call for good. The next call opens a new window, as if it were the first call. It is safe to call when nothing is pending.
13. Errors thrown by `fn` are not swallowed. They come out of the `throttled(...)` call when `fn` runs on a leading call. The throttled function keeps working afterwards. A leading call that throws still opened its window, so the next call inside `wait` ms is held back as usual.
14. Every throttled function has its own private state. Two of them never affect each other.

(Libraries such as lodash differ slightly from point 6 when a call arrives right after a trailing run. The tests follow this README.)

## Examples

In every example `wait` is `100` and `t` is the time in ms.

```text
Defaults (leading and trailing)
  t=0    throttled('a')        fn('a') runs now
  t=20   throttled('b')        held back
  t=40   throttled('c')        held back, 'b' is forgotten
  t=100  fn('c') runs          the window closed

The trailing run opens a new window
  t=0    throttled('a')        fn('a') runs now
  t=50   throttled('b')        held back
  t=100  fn('b') runs          a new window is open until t=200
  t=110  throttled('c')        held back
  t=200  fn('c') runs

A quiet period
  t=0    throttled('a')        fn('a') runs now
  t=250  throttled('b')        fn('b') runs now (the window closed long ago and nobody was waiting)

{ leading: false }
  t=0    throttled('a')        nothing yet
  t=40   throttled('b')        nothing yet
  t=100  fn('b') runs

{ trailing: false }
  t=0    throttled('a')        fn('a') runs now
  t=40   throttled('b')        dropped
  t=120  throttled('c')        fn('c') runs now (a new window)
```

## Complexity target

O(1) time per call and O(1) extra memory: one timer, the last arguments, the last `this` and the last result. Do not store every call in an array.

## Acceptance criteria (what the tests check)

- The first call runs immediately. Calls inside the window are held back. When the window closes, one trailing call runs with the arguments and `this` of the last held back call.
- A single call runs only once. The boundary is exact: 99 ms is still inside the window, 100 ms is outside.
- After a quiet window the next call runs immediately. The trailing run opens a new window, so runs are never closer than `wait` ms. Extra calls do not stretch the window (unlike debounce).
- A steady stream of calls (one every 10 ms for 500 ms) runs `fn` at exactly 0, 100, 200, 300, 400 and 500 ms.
- Any number of arguments (including none) is passed through. Works as an object method. `wait` defaults to `0`.
- `fn` is not changed, and `throttle` returns a different function.
- `leading: false`, `trailing: false` and "both false" behave as described. With `leading: false` the trailing run still opens a new window.
- The return value is the result of the most recent run (`undefined` first when nothing ran yet).
- `cancel()` drops the held back call for good, keeps earlier runs, closes the window, stops its timer and is harmless when idle.
- A non-function `fn` throws a `TypeError`. Errors from `fn` are not swallowed, and a leading call that throws still opens its window. Two throttled functions do not share state (this includes the last result).

## How to run

```bash
npm test -- exercises/js/02-throttle
```

The tests use fake timers, so they finish instantly and never depend on real waiting.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/02-throttle
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Keep the state in variables inside `throttle` (a closure): the timer id, the held back arguments, the held back `this`, and the last result. "Idle" simply means there is no running timer.
2. Write `throttled` as a normal `function throttled(...args)`, not an arrow function, so it gets its own `this`. Run `fn` with `fn.apply(thisValue, args)`.
3. Unlike debounce, you must NOT clear and restart the timer on every call. Start the timer only when a call finds the throttle idle. That is what makes the window a fixed length. Start it BEFORE you run `fn`, so a leading `fn` that throws still leaves its window open.
4. When the timer finishes, set the timer id back to `undefined`. If a call was held back, start a new timer FIRST and then run the held back call. That is how the trailing run opens a new window.
5. For the options: if the call opens a window and `leading` is on, run `fn` now and stop. Otherwise, if `trailing` is on, remember this call (overwrite the older one).
6. `cancel` clears the timer, sets the timer id back to `undefined`, and forgets the held back call.

</details>

## Stretch goals

- Add `throttled.flush()` that runs the held back call right now (and returns its result).
- Add `throttled.pending()` that returns `true` while a trailing call is waiting.
- Write `rafThrottle(fn)` that uses `requestAnimationFrame` (see the second follow-up below) and test it by replacing `requestAnimationFrame` with a fake (`vi.stubGlobal`).
- Build `throttle` on top of your `debounce` from [01 - Debounce](../01-debounce/README.md) by adding a `maxWait` option to `debounce`.

## Interview follow-ups to prepare for

**1. When do you use throttle and when debounce (scroll, resize, input)?**

<details>
<summary>Show answer</summary>

Ask: "do I need updates WHILE the activity goes on, or only AFTER it stops?"

- Scroll: throttle when you need to react while the user scrolls (a progress bar, "show the back-to-top button", lazy loading checks). Debounce only if you need the final scroll position.
- Resize: throttle (or `requestAnimationFrame`) for a layout that must follow the window live. Debounce for expensive work that only needs the final size, such as recalculating a chart.
- Input: debounce for search-as-you-type and validation, because only the final text matters. Throttle is rarely right for text input. Use a leading throttle or leading debounce to stop a user from firing a button many times.
- Pointer events (`mousemove`, drag): throttle, so the UI follows the pointer at a steady rate.

Both techniques cut the number of calls. Debounce can postpone forever if calls never stop, while throttle guarantees a run at least once per window.

</details>

**2. How would you throttle with `requestAnimationFrame`, and why?**

<details>
<summary>Show answer</summary>

For visual updates the best "window" is one screen frame, about 16.7 ms at 60 Hz. `requestAnimationFrame` (rAF) runs your callback right before the next paint, so you never do more work than the screen can show, and the browser pauses it in background tabs. A rAF throttle remembers the latest arguments and schedules at most one frame:

```js
function rafThrottle(fn) {
  let frameId = null
  let lastArgs

  function throttled(...args) {
    lastArgs = args // keep only the latest call
    if (frameId !== null) return // a frame is already scheduled
    frameId = requestAnimationFrame(() => {
      frameId = null
      fn(...lastArgs)
    })
  }

  throttled.cancel = () => {
    cancelAnimationFrame(frameId)
    frameId = null
  }

  return throttled
}
```

Use rAF for animation, scroll-linked visuals and drag. Use the time-based `throttle` when the work is not tied to painting (for example sending a network request at most once per second), or when you need a specific rate.

</details>

**3. How do you throttle an event handler in a React component?**

<details>
<summary>Show answer</summary>

Create the throttled function once, keep it between renders, and clean it up. If you build it in the component body, every render gets a new throttle with its own timer and the throttling stops working (the same problem as in the debounce exercise).

```jsx
import { useEffect, useMemo, useState } from 'react'
import { throttle } from './index.js'

function MouseTracker() {
  const [pos, setPos] = useState({ x: 0, y: 0 })

  // Created once, so the window survives re-renders.
  const onMove = useMemo(() => throttle((x, y) => setPos({ x, y }), 100), [])

  // Drop a pending trailing call when the component goes away.
  useEffect(() => () => onMove.cancel(), [onMove])

  return (
    <div style={{ height: 200 }} onMouseMove={(e) => onMove(e.clientX, e.clientY)}>
      {pos.x}, {pos.y}
    </div>
  )
}
```

Two details to mention. First, pass plain values (`e.clientX`) instead of the event object: React only sets `event.currentTarget` while the handler is running, so a trailing call that reads it later gets `null`. Second, if the throttled function uses props or state, it would see stale values from the render that created it, so call the newest callback through a ref (the `useDebouncedCallback` pattern from the debounce exercise).

</details>

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (closures, `this`, arrow functions vs normal functions)
- [useEffect](../../../../02-hooks/03-useeffect.md) (cleanup functions)
- [useRef](../../../../02-hooks/04-useref.md) (keeping the latest callback without re-rendering)
- [Memoization](../../../../02-hooks/07-memoization.md) (`useMemo`, `useCallback`, stable references)
- [Custom hooks](../../../../02-hooks/08-custom-hooks.md) (wrapping timers in hooks)
- Related exercise: [01 - Debounce](../01-debounce/README.md)
- Interview round: [Round 5 - JavaScript coding](../../../../05-interview-rounds/round-5-javascript-coding/README.md)
