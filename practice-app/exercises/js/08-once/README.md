# 08 - once, before and after

**Level:** Easy | **Time:** 15 minutes | **Topics:** closures, higher-order functions, `this`, error handling

## The task

Sometimes a function must not run every time it is called. You may want to set something up **one time** (connect to a server), react only to the **first few** events, or wait until **enough** calls have happened (all three downloads are done).

You will build three "call limiters". Each one takes a function and returns a new function that controls how often the original really runs:

- `once(fn)` runs `fn` on the first call only. Later calls return the first result.
- `before(n, fn)` runs `fn` for the first `n - 1` calls, then stops and keeps returning the last result.
- `after(n, fn)` ignores the first `n - 1` calls, then runs `fn` on every call from the `n`-th one.

The state (a flag or a counter) must live inside a **closure**: variables inside the outer function that the returned function can still use. That way every wrapper has its own private state.

Work in [`index.js`](./index.js). Do not edit the test file.

## Requirements

**`once(fn)`**

1. Returns a new function. Calling `once` does not call `fn`.
2. On the first call, run `fn` with the **same arguments and the same `this`** as that call, save what it returns, and return it.
3. On every later call, return the saved result and do **not** call `fn`. The arguments and the `this` of later calls make no difference. A saved value is a real result even when it is `undefined`, `0`, `''`, `false`, `null` or `NaN`: it must still be returned and `fn` must still not run again.
4. Every wrapper has its own state, even two wrappers made from the same function.
5. **The retry choice:** if `fn` throws, `once` lets the error out unchanged and does **not** count that call. The next call runs `fn` again. As soon as one call returns normally, its result is final. (Some libraries choose the opposite, "a failed first call is also final". Both are valid. This exercise chooses retry, and the tests document it.)
6. If `fn` returns a promise, `once` saves that promise. Every caller gets the same promise, so one slow job is shared. `once` does not look inside the promise.

**`before(n, fn)`**

7. Returns a new function. For the first `n - 1` calls, run `fn` (with the `this` and the arguments of that call), save the result and return it. From the `n`-th call on, return the result of the **last** time `fn` ran, without calling `fn`.
8. When `n` is `1` or `0`, `fn` never runs and every call returns `undefined`.
9. A call where `fn` throws passes the error to the caller, and that call **still counts** as one of the `n - 1` runs. (This is different from `once`, on purpose.)

**`after(n, fn)`**

10. Returns a new function. The first `n - 1` calls are ignored: `fn` is not called and the call returns `undefined`. From the `n`-th call on, **every** call runs `fn` (with its `this` and arguments) and returns the result.
11. When `n` is `1` or `0`, `fn` runs on every call, from the first one.
12. An error thrown by `fn` goes to the caller.

**Bad input (`once`, `before` and `after`)**

13. If `fn` is not a function, throw a `TypeError`. For `before` and `after`, if `n` is not a whole number that is `0` or more (check it with `Number.isInteger`), throw a `RangeError`. This means `-1`, `1.5`, `NaN`, `Infinity`, `'2'` and a missing `n` all throw.

**Complexity target:** O(1) time for every call, and O(1) extra memory per wrapper (a flag or counter and one saved result).

## Examples

```js
const init = once(() => {
  console.log('connecting')
  return { connected: true }
})
init() // logs "connecting", returns { connected: true }
init() // logs nothing, returns the SAME object

const limited = before(3, (x) => x * 10)
limited(1) // 10  (call 1: runs)
limited(2) // 20  (call 2: runs)
limited(3) // 20  (call 3: does not run, returns the last result)

const delayed = after(3, (x) => x * 10)
delayed(1) // undefined  (ignored)
delayed(2) // undefined  (ignored)
delayed(3) // 30         (call 3 runs)
delayed(4) // 40         (and again)

let online = false
const connect = once(() => {
  if (!online) throw new Error('offline')
  return 'connected'
})
connect()   // throws Error('offline'): this call does not count
online = true
connect()   // 'connected'  (the retry)
connect()   // 'connected'  (remembered, the function is not called again)
```

## Acceptance criteria (what the tests check)

- `once` calls `fn` one time, returns the same result (the same object, not a copy) afterwards, and passes the arguments of the first call.
- Falsy results (`0`, `''`, `false`, `null`, `undefined`, `NaN`) are remembered too.
- Two wrappers keep separate state. `this` works for methods, and the first call's `this` wins.
- A throw on the first call is rethrown and the next call retries. After a success the result is final. A function that keeps throwing is retried every time.
- Promises: callers share one promise (fake timers). Also checked: a timer callback and a DOM event listener only react once.
- `before` runs `fn` exactly `n - 1` times and then returns the last result. `n` of `1` or `0` never calls `fn`. A throwing call counts.
- `after` ignores `n - 1` calls and then calls `fn` every time. `n` of `1` or `0` calls it every time.
- `before` and `after` keep `this` and arguments, and let errors from `fn` through.
- Bad `fn` throws `TypeError`. Bad `n` throws `RangeError`.

## How to run

Run the commands from the `practice-app` folder. This is plain JavaScript, so there is nothing to see in the browser. The tests are the feedback.

```bash
npm test -- exercises/js/08-once
```

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/08-once
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Keep the state in `let` variables inside `once`, outside the returned function. For `once` you need a flag (did it finish?) and a place for the result.
2. Do not write `if (result)` to decide "already ran". A result of `0`, `''` or `undefined` is a real result. Use a separate flag.
3. To keep `this`, return a normal `function` (an arrow function has no `this` of its own) and call the original with `fn.apply(this, args)`.
4. The retry behaviour comes from the **order** of two lines. Think about which line runs after `fn` returns and which line would run if `fn` threw.
5. For `before`, a counter of "real calls left" works well. Decide whether you lower it before or after calling `fn`: the tests need a throwing call to still count.
6. For `after`, a counter of "calls still to ignore" is enough. Remember that `after(0, fn)` and `after(1, fn)` behave the same.
7. `once(fn)` looks like `before(2, fn)`. They differ in exactly one situation. Which one?

</details>

## Stretch goals

- What happens if `fn` calls the wrapper itself while it is still running (recursion)? Try it with your version. Which line order makes it loop forever, and which makes it return `undefined`?
- Build `once` from `before`: `const once = (fn) => before(2, fn)`. Which tests fail, and why?
- Add a `reset()` method to the function returned by `once`, so the next call runs `fn` again.
- After a successful first call, drop your reference to `fn` so it can be garbage collected. Why can that matter when `fn` captured a lot of data?
- Write `onceAsync(fn)`: it shares one in-flight promise between callers, but if that promise **rejects**, the next call tries again.
- Compare with [exercise 03 (memoize)](../03-memoize/README.md): `once` is like memoize for a function that takes no arguments.

## Interview follow-ups to prepare for

1. **Where is `once` used (initialisation, event listeners)?** Give three real places. How is `once(handler)` different from `addEventListener('click', handler, { once: true })`, and from a module-level `let initialised = false`?
   - A strong answer: lazy set-up of something expensive (a database client, an analytics SDK, a config load), protecting a button from a double submit, and callbacks that a library might call twice. The `{ once: true }` option removes the listener after the first event, while `once` keeps the listener attached and only ignores later events (but works with timers, callbacks and any API). A module-level flag works but spreads state around, cannot return the cached value, and is harder to test and reuse.
2. **`useRef` based once-only effects in React.** How do you run some code only once per component instance? What does `useRef` have to do with it, and does `useEffect(fn, [])` run only once?
   - A strong answer: with `[]` the effect runs after the first render, but in development StrictMode React mounts, cleans up and mounts again, so it runs twice. A guard such as `const ran = useRef(false)` survives that simulated remount because refs keep their value, and a ref change does not cause a re-render (unlike state). But the cleanup already ran in between, so a set-up with a matching cleanup can end up half torn down. The better fix is usually an effect that is safe to run twice, or doing one-time app set-up outside React with a module-level `once`.
3. **StrictMode implications.** What does StrictMode do in development that can make a once-style guard behave differently from production? Where must a `once` wrapper be created in a React app?
   - A strong answer: StrictMode renders components twice and runs effects as set up, clean up, set up again, to expose impure render code and missing cleanup. A `once(...)` created at module level is evaluated one time, so it survives that. A `once(...)` created inside the component body is a brand new wrapper (with fresh state) on every render, so it guards nothing. A guard can hide the symptom that StrictMode is trying to show you, so ask first what the missing cleanup is.

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md): closures, `this`, rest and spread, and `Function.prototype.apply`.
- [useEffect](../../../../02-hooks/03-useeffect.md): the synchronisation mindset, cleanup, and the StrictMode double run.
- [useRef](../../../../02-hooks/04-useref.md): refs as values that survive renders without causing one.
- [How React renders](../../../../04-advanced/01-how-react-renders.md): why render must be pure, and what StrictMode checks.
- [Error boundaries, portals and friends](../../../../03-intermediate/05-error-boundaries-portals-and-friends.md): StrictMode in the list of helper components.
- [Round 5: JavaScript coding](../../../../05-interview-rounds/round-5-javascript-coding/README.md): how this kind of exercise shows up in interviews.
