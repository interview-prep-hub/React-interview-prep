# 01 - Debounce

**Level:** Easy | **Time:** 20 minutes | **Topics:** closures, timers (`setTimeout`), `this` and arguments, higher-order functions

## The task

Write `debounce(fn, wait, options)`. It takes a function and returns a new function that delays calling `fn` until the calls have stopped for `wait` milliseconds.

Think of a search box. Without debounce, typing "react" sends five requests, one per key. With a 300 ms debounce it sends one request, after the user pauses.

Work in [`index.js`](./index.js). Do not edit the test file.

Words used below:

- A **burst** is a series of calls where each call comes less than `wait` ms after the one before it. The burst ends when `wait` ms pass with no new call.
- The **leading edge** is the start of a burst. The **trailing edge** is the end of it.

## Requirements

1. `index.js` has a named export `debounce(fn, wait = 0, { leading = false, trailing = true } = {})`. It returns a new function, called `debounced` below. `fn` itself is never changed.
2. If `fn` is not a function, `debounce` throws a `TypeError` (any message).
3. With the default options, every call to `debounced` restarts a timer of `wait` ms. When the timer finishes without another call, `fn` runs once. A `wait` of `0` still postpones the call: `fn` runs on the next timer tick, never synchronously.
4. `fn` runs with the arguments and the `this` of the LAST call of the burst. Earlier calls of the burst are forgotten.
5. `leading: true` means the first call of a burst runs `fn` immediately, with that call's arguments and `this`. Other calls in the same burst do not run `fn` immediately.
6. `trailing: true` means that at the end of a burst `fn` runs with the last call's arguments and `this`, but only if at least one call arrived AFTER the call that already ran. So with both flags on, a burst with a single call runs `fn` once, and a burst with two or more calls runs `fn` twice (first call at the start, last call at the end).
7. `leading: true, trailing: false` runs `fn` only on the first call of each burst. `leading: false, trailing: false` never runs `fn`. The two options have separate defaults: `{ trailing: false }` alone means `leading` is still `false`, so `fn` never runs.
8. A new burst starts when `wait` ms have passed since the last call. Each burst gets its own leading run.
9. `debounced(...)` returns the result of the most recent run of `fn` (`undefined` before the first run). A call that does not run `fn` right now returns the previous result.
10. `debounced.cancel()` drops the pending trailing call, stops the timer and ends the current burst. The next call starts a new burst (so with `leading: true` it runs immediately), and the stopped timer can never end that new burst early. It is safe to call when nothing is pending.
11. `debounced.flush()` ends the current burst now. If a trailing call is pending, it runs immediately with the last arguments and `this`, `flush()` returns its result, and the timer must not run it a second time. If nothing is pending, `flush()` does not call `fn` and returns the result of the most recent run (`undefined` if there was none). After `flush()` the next call starts a new burst. (Libraries such as lodash differ in this last detail. The tests follow this README.)
12. Errors thrown by `fn` are not swallowed. They come out of the `debounced(...)` call (for a leading run) or out of `flush()`. The debounced function keeps working afterwards. A failed run is gone for good (a later `flush()` does not retry it), and a leading call that throws still started its burst, so the next call inside `wait` ms is held back as usual.
13. Every debounced function has its own private state. Two of them never affect each other.

## Examples

In every example `wait` is `100` and `t` is the time in ms.

```text
Default options (trailing only)
  t=0    debounced('a')
  t=50   debounced('b')        the timer restarts, it would now finish at t=150
  t=120  debounced('c')        restarts again, it now finishes at t=220
  t=220  fn('c') runs, once

Two separate bursts
  t=0    debounced('a')   ->   t=100 fn('a') runs
  t=300  debounced('b')   ->   t=400 fn('b') runs

{ leading: true, trailing: false }
  t=0    debounced('a')        fn('a') runs now
  t=50   debounced('b')        ignored, and the quiet time restarts
  t=200  debounced('z')        fn('z') runs now (a new burst, 150 ms after the last call)

{ leading: true } (trailing stays true)
  t=0    debounced('a')        fn('a') runs now
  t=30   debounced('b')        held back
  t=130  fn('b') runs
  (a burst with only debounced('a') would run fn once)

flush
  debounced('x'); debounced.flush()   fn('x') runs now and flush() returns what fn returned.
                                      Nothing runs at t=100.
```

## Complexity target

O(1) time per call and O(1) extra memory: one timer, the last arguments, the last `this` and the last result. Do not store every call in an array.

## Acceptance criteria (what the tests check)

- `fn` does not run before `wait` ms have passed, then runs exactly once.
- A burst of calls gives one run, with the arguments and `this` of the last call. Each new call restarts the waiting time. Calls that are far apart give separate runs.
- Any number of arguments (including none) is passed through. Works as an object method. `wait = 0` still postpones the call, and it is also the default when no `wait` is given.
- `fn` is not changed, and `debounce` returns a different function.
- `leading` and `trailing` work alone and together, including the "single call fires once" rule, a new leading run for every burst, the `this` and arguments of the leading run, and the "both false" case.
- The return value is the result of the most recent run (`undefined` first).
- `cancel()` drops the pending call, keeps earlier runs, stops the timer, ends the burst and is harmless when idle.
- `flush()` runs the pending call now (once, even if you flush again), returns its result, returns the last result when nothing is pending, and ends the burst (also when nothing was pending).
- A non-function `fn` throws a `TypeError`. Errors from `fn` are not swallowed, and a failed run is not retried. A leading call that throws still starts its burst. Two debounced functions do not share state (this includes the last result).

## How to run

```bash
npm test -- exercises/js/01-debounce
```

The tests use fake timers, so they finish instantly and never depend on real waiting.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/01-debounce
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Keep the state in variables inside `debounce`, next to the returned function (a closure): the timer id, the last arguments, the last `this`, and the last result.
2. On every call, run `clearTimeout(timerId)` and then `timerId = setTimeout(...)`. When the timer callback runs, set `timerId` back to `undefined`. A call starts a new burst exactly when there is no running timer. Check this BEFORE you restart the timer, and start the new timer BEFORE you run `fn`, so a leading `fn` that throws still leaves its burst open.
3. Write `debounced` as a normal `function debounced(...args)`, not an arrow function, so it gets its own `this`. Run `fn` with `fn.apply(thisValue, args)`.
4. For the options: if the call starts a burst and `leading` is on, run `fn` now. Otherwise, if `trailing` is on, remember this call's arguments and `this` (overwrite the older ones). Because the leading call is not remembered, a burst with one call runs only once.
5. When the timer finishes, run the remembered call if there is one. Clear the remembered values BEFORE calling `fn`, so a `fn` that throws cannot leave a stale call behind.
6. `cancel` clears the timer and forgets the remembered call. `flush` clears the timer, then runs the remembered call if there is one, and returns the last result.

</details>

## Stretch goals

- Add a `maxWait` option (as lodash has): even if calls keep arriving, `fn` runs at least once every `maxWait` ms. Notice that you are now very close to a throttle, see [02 - Throttle](../02-throttle/README.md).
- Add `debounced.pending()` that returns `true` while a trailing call is waiting.
- Build a `useDebouncedCallback` hook on top of your function and test it with `renderHook` from `@testing-library/react`.

## Interview follow-ups to prepare for

**1. What is the difference between debounce and throttle, and when do you pick each?**

<details>
<summary>Show answer</summary>

Debounce waits for silence. It runs `fn` after the calls have stopped for `wait` ms, so a never-ending stream of calls postpones `fn` forever. Throttle limits the rate. It runs `fn` at most once per `wait` ms while the calls keep coming, so you get regular updates.

Pick debounce when only the final value matters: search-as-you-type, autosave after the user stops typing, "the window finished resizing, now recalculate the layout", validating a field after a pause. Pick throttle when you need regular updates during continuous activity: scroll position, dragging, `mousemove`, live resize.

A leading-edge debounce (`leading: true, trailing: false`) is also a good fit for ignoring double clicks on a submit button: the first click runs, the rest of the burst is ignored.

</details>

**2. How do you use debounce in React? Show `useDebounce` and `useDebouncedCallback`.**

<details>
<summary>Show answer</summary>

There are two common shapes. Debounce a VALUE when you want a slow-moving copy of a fast-changing state:

```jsx
import { useEffect, useState } from 'react'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id) // a new value (or unmount) cancels the old timer
  }, [value, delay])

  return debounced
}

function Search() {
  const [text, setText] = useState('')
  const query = useDebounce(text, 300) // changes 300 ms after the last keystroke

  useEffect(() => {
    // fetch the results for `query` here
  }, [query])

  return <input value={text} onChange={(e) => setText(e.target.value)} />
}
```

Debounce a FUNCTION when you want to limit how often a handler or a save call runs. This reuses the `debounce` you wrote:

```jsx
import { useEffect, useMemo, useRef } from 'react'
import { debounce } from './index.js'

function useDebouncedCallback(callback, wait) {
  const latest = useRef(callback)
  useEffect(() => {
    latest.current = callback // always call the newest version of the callback
  })

  // Created once per `wait`, so the timer survives re-renders.
  const debounced = useMemo(
    () => debounce((...args) => latest.current(...args), wait),
    [wait],
  )

  useEffect(() => () => debounced.cancel(), [debounced]) // no timer left after unmount
  return debounced
}
```

</details>

**3. Why must the debounced function be stable across renders?**

<details>
<summary>Show answer</summary>

A debounced function keeps its timer in a closure. If you create it in the component body, every render builds a new debounced function with a fresh, empty timer:

```jsx
import { useState } from 'react'
import { debounce } from './index.js'

function Search() {
  const [text, setText] = useState('')
  // Bug: a NEW debounced function (with a NEW timer) on every render.
  // (sendToServer stands for any function that calls your API.)
  const send = debounce((value) => sendToServer(value), 500)

  return (
    <input
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        send(e.target.value)
      }}
    />
  )
}
```

Each keystroke calls `setText`, which re-renders, so the next keystroke calls a different `send` with its own timer. Nothing is ever debounced: you get one server call per keystroke, just delayed by 500 ms.

The fix is to create it once and keep it between renders: `useMemo`, a `useRef` or `useState` initializer, or define it outside the component. Because the function is now created only once, it must not capture props or state directly (it would use stale values), so call the newest callback through a ref, as `useDebouncedCallback` above does. Finally, cancel it on unmount so a pending call does not run after the component is gone.

</details>

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (closures, `this`, arrow functions vs normal functions)
- [useEffect](../../../../02-hooks/03-useeffect.md) (cleanup functions)
- [useRef](../../../../02-hooks/04-useref.md) (keeping the latest callback without re-rendering)
- [Memoization](../../../../02-hooks/07-memoization.md) (`useMemo`, `useCallback`, stable references)
- [Custom hooks](../../../../02-hooks/08-custom-hooks.md) (`useDebounce`)
- Related exercises: [12 - Autocomplete with debounce](../../react/12-autocomplete-debounce/README.md) and [02 - Throttle](../02-throttle/README.md)
- Interview round: [Round 5 - JavaScript coding](../../../../05-interview-rounds/round-5-javascript-coding/README.md)
