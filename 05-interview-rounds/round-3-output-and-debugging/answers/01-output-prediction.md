# Round 3 - Output Prediction and Debugging: Output Prediction - Answers

**Questions:** [../questions/01-output-prediction.md](../questions/01-output-prediction.md)

Every output below was produced by running the code with React 19.3.1, Testing Library and jsdom. Unless an answer says StrictMode, it was run without it. Remember the effect of StrictMode in development: each component function (and each state initializer and updater function) is called twice, so a `console.log` in the body shows up twice, and an effect on mount runs setup, then cleanup, then setup again.

## State and closures
### R3-SC-001 (Easy) Two plain updates versus two updater functions
**Answer:** After `plain`: `Count: 1`. After `updater` (starting from 1): `Count: 3`.

**Trace:**
1. First render: `count` is 0.
2. Click `plain`. The handler sees the snapshot `count = 0`, so it queues "set to 1" twice. React applies the queue: the result is 1.
3. The component renders again with `count = 1`.
4. Click `updater`. It queues two functions. React runs them one after the other: 1 becomes 2, then 2 becomes 3.

**The rule:** A render's `count` is a fixed snapshot. `setCount(value)` means "set it to this value". `setCount(fn)` means "take the latest value and change it", so the calls build on each other.
**Why it matters / follow-up:** The interviewer may ask when you must use the function form: whenever the next state depends on the previous state.
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R3-SC-002 (Easy) Logging right after setState
**Answer:** The click logs `handler 0`, then `render 1`. The button shows `Count: 1`.

**Trace:**
1. Mount logs `render 0`.
2. Click: `setCount(count + 1)` only schedules an update. The variable `count` in this handler is still 0, so the next line logs `handler 0`.
3. The handler ends. React re-renders with the new state and logs `render 1`.

**The rule:** State is a snapshot. `setState` does not change the variable in the running function; it asks React for a new render.
**Why it matters / follow-up:** To use the new value at once, compute it first (`const next = count + 1`) and use `next`. In StrictMode the render line would be logged twice.
**Learn more:** [state and events](../../../01-basics/05-state-and-events.md)

### R3-SC-003 (Medium) Updater, plain value, updater
**Answer:** `n = 6`.

**Trace:**
1. The three calls are queued in order and nothing runs yet.
2. React starts from 0. The first function gives 1.
3. `setN(5)` replaces the value: now 5.
4. The last function gets 5 and gives 6.

**The rule:** React applies queued updates in order. A plain value replaces the result so far. A function receives the result so far.
**Why it matters / follow-up:** A follow-up may be: what if the calls were `setN(x => x + 1)` then `setN(5)`? The answer is 5, because the last plain value wins.
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R3-SC-004 (Medium) Mutate and set the same reference
**Answer:** After `mutate`: the paragraph still shows `a` and no `render` line is logged. After `copy`: the paragraph shows `a b c` and `render a,b,c` is logged.

**Trace:**
1. Mount: `items` is `['a']`.
2. `mutate` pushes `'b'` into that same array object, so the array in memory is now `['a', 'b']`. Then `setItems(items)` passes the same reference.
3. React compares the new state with the old one using `Object.is`. They are the same object, so React skips the render. The screen still shows `a`.
4. `copy` builds a new array from the current contents, which already include the hidden `'b'`, and adds `'c'`. It is a new reference, so React renders `a b c`.

**The rule:** Never change state in place. Create a new array or object and pass that to the setter.
**Why it matters / follow-up:** Mutation also breaks `memo` and effect dependencies, and the hidden change appears later at a surprising time (as above).
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R3-SC-005 (Medium) Ref changes do not render
**Answer:** After three clicks: `clicks: 0`. After `redraw`: `clicks: 3`. Only one `render` line is logged after the first render, and it comes from `redraw`.

**Trace:**
1. Each `click` adds 1 to `clicks.current`. Changing a ref never asks React to render, so nothing is logged and the paragraph is unchanged.
2. `redraw` changes state, so React renders. During that render `clicks.current` is 3, so the paragraph shows 3.

**The rule:** A ref is a box that survives renders, but changing it does not cause a render. Use state for anything the screen shows.
**Why it matters / follow-up:** Reading `ref.current` during render is shown here only to demonstrate the behaviour. In real code, read refs in handlers and effects. Refs are right for timer ids, DOM nodes and "latest value" boxes.
**Learn more:** [useRef](../../../02-hooks/04-useref.md)

### R3-SC-006 (Medium) Two updates inside a timeout
**Answer:** The lines are `render 0 0` (mount) and `render 1 1`. The button shows `1 1`. You never see `render 1 0`.

**Trace:**
1. Click: the handler only schedules the timeout.
2. The timer fires. `setA(1)` and `setB(1)` run in the same tick.
3. React 18 and newer batch updates from timeouts, promises and native events too. It renders once with both new values.

**The rule:** Automatic batching: all updates in the same tick give one render, wherever they come from. Before React 18 (the old `ReactDOM.render`), updates inside timeouts were not batched.
**Why it matters / follow-up:** Follow-up: "How would you force a render in between?" (`flushSync`, rarely needed.) The test used `act`, and `createRoot` batches the same way in the browser.
**Learn more:** [how React renders](../../../04-advanced/01-how-react-renders.md)

### R3-SC-007 (Medium) Setting the same value
**Answer:** Click 1 (`set 0`): nothing logged. Click 2 (`set 1`): `render 1`. Click 3 (`set 1` again): `render 1` again (the surprise). Click 4 (`set 1`): nothing logged.

**Trace:**
1. State is 0 and `set 0` sets 0. The value is the same, so React skips the render.
2. `set 1` is a real change, so the component renders and logs `render 1`.
3. `set 1` again is the same value, but React sometimes has to call your component function once more to be sure it can bail out. That is the extra `render 1` line. It does not change the screen and React does not render the children for it.
4. After that, the same-value update is skipped without calling the function.

**The rule:** Setting the same value does not update the screen. The exact number of extra function calls is an internal detail, so never depend on it, and keep render functions free of side effects.
**Why it matters / follow-up:** Good follow-up: "Why must render be pure?" Because React may call it more than once (StrictMode, bail-outs, concurrent rendering).
**Learn more:** [how React renders](../../../04-advanced/01-how-react-renders.md)

### R3-SC-008 (Hard) Setting state during render
**Answer:** (a) The logs are `render 0`, `render 1`, `render 2`, `render 3`, and the screen shows `n = 3`. (b) React throws an error: `Too many re-renders. React limits the number of renders to prevent an infinite loop.`

**Trace:**
1. `Bounded` renders with `n = 0`, logs, and calls `setN(1)` while rendering its own body.
2. React throws away that output and calls the component again straight away with `n = 1`. No child renders and no DOM update happens in between.
3. This repeats for 2 and 3. At `n = 3` the `if` is false, so React commits once with `n = 3`.
4. `Unbounded` calls `setN` on every render with no condition. The loop never ends, so React stops it and throws.

**The rule:** You may set a component's own state during render only inside a condition that stops the loop (the "adjust state when a prop changes" pattern). Usually a `key`, derived values or an event handler is a better tool.
**Why it matters / follow-up:** Follow-up: "What about setting another component's state during render?" That is not allowed and React warns about it.
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R3-SC-009 (Medium) useState(prop) ignores later props
**Answer:** `dashboard: 1` and `panel: 0`.

**Trace:**
1. Mount: `Panel` calls `useState(0)` and keeps 0.
2. Click `next`: `Dashboard` renders with `start = 1` and passes it down.
3. `Panel` renders again, but `useState(start)` ignores its argument after the first render. State belongs to the component instance, which already exists.

**The rule:** The argument of `useState` is only the initial value. Copying a prop into state creates a second source of truth.
**Why it matters / follow-up:** Fix it by using the prop directly, by computing a value from it, or by resetting the instance with `<Panel key={start} start={start} />`.
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R3-SC-010 (Hard) A timeout that remembers an old render
**Answer:** `count was 0` is logged. The paragraph shows `Count: 3`.

**Trace:**
1. At the first click, the `showLater` function belongs to the render where `count` is 0. The timeout keeps that function.
2. Each `+1` click renders again with a new `count`, and creates new functions. The old timeout still holds the old function.
3. After three seconds the old function runs and reads its own `count`, which is 0.

**The rule:** Every render has its own props, state and functions (closures). A callback keeps the values of the render that created it.
**Why it matters / follow-up:** To read the latest value, store it in a ref (`latest.current = count`) and read `latest.current` inside the timeout. Say this is the same root cause as the stale interval in R3-EF-004.
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R3-SC-011 (Medium) var versus let in a loop
**Answer:** `var 3`, `var 3`, `var 3`, `let 0`, `let 1`, `let 2`.

**Trace:**
1. All six callbacks are scheduled. The two loops finish before any timer fires.
2. `var i` is one variable shared by the whole loop. When the loop ends it is 3, so each of the first three callbacks prints 3.
3. `let j` makes a new variable for each loop turn. Each callback keeps its own `j`: 0, 1, 2.
4. Timers with the same delay run in the order they were scheduled, so the `var` lines come first.

**The rule:** A closure remembers the variable, not the value at the time. `let` gives a fresh variable per iteration.
**Why it matters / follow-up:** This is the same idea as stale state in React. The old fix was an IIFE (a function that runs at once) to copy `i`.
**Learn more:** [JavaScript deep dive](../../../01-basics/10-javascript-deep-dive-for-interviews.md)

### R3-SC-012 (Hard) Event loop order
**Answer:** `script start`, `run start`, `script end`, `promise`, `run after await`, `timeout`.

**Trace:**
1. The script runs top to bottom. `script start` is logged. `setTimeout` only schedules a timer (a macrotask).
2. `Promise.resolve().then(...)` puts its callback in the microtask queue.
3. `run()` starts and logs `run start`. At `await null` the function pauses and its rest is queued as a microtask, after the `promise` one.
4. `script end` is logged. The call stack is now empty.
5. The browser empties the microtask queue in order: `promise`, then `run after await`.
6. Only then does the timer callback run: `timeout`.

**The rule:** Synchronous code first, then all microtasks (promise callbacks, code after `await`), then the next macrotask (timers, events).
**Why it matters / follow-up:** Follow-up: where would `queueMicrotask(() => console.log('x'))` run? With the other microtasks, in the order they were queued.
**Learn more:** [JavaScript deep dive](../../../01-basics/10-javascript-deep-dive-for-interviews.md)

## Effects
### R3-EF-001 (Medium) Effect order on mount
**Answer:** `outer render`, `inner render`, `inner layout effect`, `outer layout effect`, `inner effect`, `outer effect`.

**Trace:**
1. The render phase goes from the top down: `outer render`, then `inner render`.
2. React commits the DOM. Then it runs all layout effects (`useLayoutEffect`), children first: `inner layout effect`, `outer layout effect`.
3. After that, the passive effects (`useEffect`) run, also children first: `inner effect`, `outer effect`.

**The rule:** Render goes parent to child. Effects go child to parent. Layout effects run before passive effects.
**Why it matters / follow-up:** In StrictMode every render line would appear twice, and each effect line would appear twice on mount.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md) and [other hooks](../../../02-hooks/09-other-hooks.md)

### R3-EF-002 (Hard) Effect order on update and unmount
**Answer:** (a) On update: `leaf layout cleanup`, `branch layout cleanup`, `leaf layout setup`, `branch layout setup`, `leaf effect cleanup`, `branch effect cleanup`, `leaf effect setup`, `branch effect setup`. (b) On unmount: `branch layout cleanup`, `leaf layout cleanup`, `branch effect cleanup`, `leaf effect cleanup`.

**Trace:**
1. The effects have no dependency array, so they run after every render.
2. On the update, React first runs all layout cleanups (child, then parent), then all layout setups (child, then parent).
3. Later, the passive effects follow the same pattern: all cleanups first, then all setups.
4. On unmount only cleanups run. The layout cleanups come first. In this run React 19.3.1 cleaned the parent before the child, for both kinds.

**The rule:** Within one kind of effect, React finishes all cleanups before it runs any setup. Layout effects come before passive effects.
**Why it matters / follow-up:** Do not memorise the unmount order as a law. Say what you observed and that you rely on cleanup being independent.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R3-EF-003 (Hard) StrictMode double invocation
**Answer:** (a) `init`, `init`, `render 0`, `render 0`, `effect setup`, `effect cleanup`, `effect setup`. (b) `updater`, `updater`, `render 1`, `render 1`. (c) `n = 1`.

**Trace:**
1. In development, StrictMode calls the state initializer twice, then the component function twice.
2. React commits and runs the effect: `effect setup`. StrictMode then simulates a leave-and-return: `effect cleanup`, `effect setup` again.
3. On click, the updater function is called twice (it must be pure). The component renders twice.
4. The second updater result is not added on top. The state is 1, not 2.

**The rule:** StrictMode (development only) calls initializers, render and updater functions twice, and runs mount effects as setup, cleanup, setup, to expose impure code and missing cleanups. In production you get `init`, `render 0`, `effect setup`, and then `updater`, `render 1`.
**Why it matters / follow-up:** The right answer to "my effect runs twice" is to write a correct cleanup, not to remove StrictMode.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R3-EF-004 (Medium) setInterval with an empty dependency array
**Answer:** `StaleTimer` shows `stale: 1` after 1 second, after 2 seconds and after 10 seconds. `FreshTimer` shows `fresh: 1`, `fresh: 2` and `fresh: 10`.

**Trace:**
1. The effect runs only once, on mount. Its function remembers `c = 0` for the whole life of the interval.
2. Every second `StaleTimer` calls `setC(0 + 1)`, which is always 1.
3. `FreshTimer` calls `setC(x => x + 1)`. The function receives the latest state each time, so it counts.

**The rule:** An effect with `[]` sees the values of the first render only. Use an updater function, or list the value in the dependencies (then the interval restarts on each change).
**Why it matters / follow-up:** The ESLint rule `react-hooks/exhaustive-deps` warns about `StaleTimer`. Fix the code, do not silence the rule.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R3-EF-005 (Medium) An object as a dependency
**Answer:** `widget effect` is logged 3 times and `memo effect` once.

**Trace:**
1. Mount logs `widget effect` and `memo effect`.
2. Each click on the widget button re-renders `Widget`. It builds a new `options` object each time. React compares dependencies with `Object.is`, sees a different object, and runs the effect again. Two clicks give two more `widget effect` lines.
3. `WidgetMemo` keeps the same object because of `useMemo`, so its effect never runs again.

**The rule:** Dependencies are compared by reference. Objects, arrays and functions created in the render body are new on every render.
**Why it matters / follow-up:** Better fixes: depend on primitive values, move the object inside the effect, or move a constant object outside the component. With StrictMode on, each mount line would be logged twice.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R3-EF-006 (Hard) An async function passed to useEffect
**Answer:** (a) On mount React logs an error: `useEffect must not return anything besides a function, which is used for clean-up.` (React adds more advice after that sentence). The code still runs and logs `loaded`. (b) On unmount a TypeError is raised: `destroy is not a function`.

**Trace:**
1. An `async` function always returns a Promise.
2. React treats whatever the effect returns as the cleanup function. In development it warns because a Promise is not a function.
3. When the component unmounts, React tries to call the Promise as its cleanup and gets a TypeError.

**The rule:** An effect function must return nothing or a cleanup function. Put the async work in a function inside the effect and call it.
**Why it matters / follow-up:** Show the correct pattern: `useEffect(() => { async function load() { ... } load() }, [])`, with an ignore flag or an AbortController in the cleanup.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R3-EF-007 (Hard) A fetch in an effect under StrictMode
**Answer:** For both components `fakeFetch` is called 2 times and the paragraph ends as `data 2`. `NoGuard` logs `NoGuard set data 1` then `NoGuard set data 2`. `Guarded` logs only `Guarded set data 2`.

**Trace:**
1. Mount: the effect starts fetch number 1.
2. StrictMode runs the cleanup and then the effect again, which starts fetch number 2. In `Guarded` the cleanup set the first call's `ignore` flag to true.
3. After 100 ms fetch 1 resolves. `NoGuard` stores it. `Guarded` skips it because its flag is set.
4. Fetch 2 resolves and both store `data 2`.

**The rule:** An effect must survive setup, cleanup, setup. The cleanup should ignore (or abort) the old request. Without it, a slow old response can overwrite a newer one (a race condition).
**Why it matters / follow-up:** This double fetch happens only in development. In production there is one fetch. See R3-BG-006 for the race version.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R3-EF-008 (Medium) State set inside an effect
**Answer:** `render, ready = false`, then `render, ready = true`. The screen ends with `ready`.

**Trace:**
1. First render: `ready` is false, so the paragraph says `loading`.
2. React commits. Then the effect runs and calls `setReady(true)`.
3. React renders again with `ready = true`, and the paragraph says `ready`.

**The rule:** An effect runs after the commit, so state set in it costs one extra render. The browser may paint the first version before the second.
**Why it matters / follow-up:** If a value can be computed from props and state, compute it during render and skip the effect. `useLayoutEffect` would update before paint, but use it only for layout measuring. In StrictMode the lines would appear twice.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R3-EF-009 (Medium) Cleanup sees the old value
**Answer:** Mount: `connect 1`. Render with id 2: `disconnect 1`, `connect 2`. Render with id 2 again: nothing. Unmount: `disconnect 2`.

**Trace:**
1. Mount runs the setup with `id = 1`.
2. When `id` changes to 2, React runs the previous cleanup first. That cleanup closed over `id = 1`, so it logs `disconnect 1`. Then the new setup logs `connect 2`.
3. The next render has the same `id`, so React skips the effect.
4. On unmount, the last cleanup runs with `id = 2`.

**The rule:** The cleanup belongs to the render that created it, so it sees that render's values. Cleanup always runs before the next setup, and also on unmount.
**Why it matters / follow-up:** With StrictMode on, the mount would log `connect 1`, `disconnect 1`, `connect 1`.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

## Rendering, keys, memo and context
### R3-RM-001 (Medium) The && trap
**Answer:** The four paragraphs contain `0`, `0`, `list exists` and `NaN`.

**Trace:**
1. `count && ...` with 0: `&&` returns the left side when it is falsy, so the result is the number 0. React renders numbers, so it prints `0`.
2. `items.length && ...` with an empty array: the length is 0, same as above.
3. `items && ...`: an empty array is truthy, so the right side is used: `list exists`.
4. `price && ...` with `NaN`: `NaN` is falsy, so the result is `NaN`, which React prints as `NaN`.

**The rule:** React skips `false`, `null`, `undefined` and `true`, but it prints numbers. Turn the left side into a real boolean.
**Why it matters / follow-up:** Write `count > 0 && ...`, `Boolean(count) && ...` or a ternary `count ? <b>new</b> : null`.
**Learn more:** [conditional rendering and lists](../../../01-basics/06-conditional-rendering-and-lists.md)

### R3-RM-002 (Medium) memo with an inline object prop
**Answer:** `ShopInline`: `Price render` is logged 3 times (mount plus two clicks). `ShopMemo`: once.

**Trace:**
1. Each click re-renders the shop component.
2. `ShopInline` creates a new `{ color: 'red' }` object every time. `memo` compares props with `Object.is`, sees a new object, and renders `Price` again.
3. `ShopMemo` keeps one object with `useMemo`, so the props are equal and `memo` skips the render.

**The rule:** `memo` is a shallow reference check. Inline objects, arrays and functions break it.
**Why it matters / follow-up:** Alternative fix: define the constant object outside the component. Follow-up: when is `memo` not worth it? When the child is cheap or its props change on every render anyway.
**Learn more:** [memoization](../../../02-hooks/07-memoization.md)

### R3-RM-003 (Medium) Same position versus a new key
**Answer:** `Switch`: before `A: 2`, after `B: 2`. `SwitchKeyed`: before `A: 2`, after `B: 0`.

**Trace:**
1. In `Switch` both branches render `CounterBtn` at the same place in the tree. React sees the same type at the same position, so it keeps the instance and its state (2). Only the `label` prop changes.
2. In `SwitchKeyed` the key changes from `A` to `B`. A different key means a different identity, so React removes the old instance and mounts a new one with state 0.

**The rule:** State lives with a component's identity: its type, its position and its key. Same identity keeps state, new identity resets it.
**Why it matters / follow-up:** Use `key` on purpose to reset a form when the user changes.
**Learn more:** [how React renders](../../../04-advanced/01-how-react-renders.md)

### R3-RM-004 (Hard) A component defined inside a component
**Answer:** The input is empty after the click. It is a different DOM node (the old one is removed from the page). Moving `NameField` outside `Form` keeps `abc` and the same node.

**Trace:**
1. Each render of `Form` runs `function NameField() {...}` again. That creates a new function every time.
2. React compares the element types. A new function is a different type, even if the code is identical.
3. A different type at the same position means unmount the old subtree and mount a new one. The new `<input>` is empty.

**The rule:** Never declare a component inside another component. Define it at module level and pass data with props.
**Why it matters / follow-up:** This also loses focus and state and costs performance. The fixed version:

```jsx
import { useState } from 'react'

function NameField() {
  return <input aria-label="name" />
}

function FormFixed() {
  const [clicks, setClicks] = useState(0)

  return (
    <>
      <NameField />
      <button onClick={() => setClicks(clicks + 1)}>clicks: {clicks}</button>
    </>
  )
}
```

**Learn more:** [how React renders](../../../04-advanced/01-how-react-renders.md)

### R3-RM-005 (Hard) Index keys with uncontrolled inputs
**Answer:** The rows left are Bob and Cy. Bob's note box contains `hello` and Cy's is empty. With `key={name}` both boxes are empty.

**Trace:**
1. With `key={index}` the three rows have keys 0, 1 and 2.
2. After deleting Ann, the list has two rows with keys 0 (Bob) and 1 (Cy). React matches by key: it reuses row 0 and row 1, and removes row 2.
3. The text `hello` lives in the DOM input of row 0 (the input is uncontrolled, so React state does not hold it). That input is reused for Bob, so Bob now shows Ann's text.

**The rule:** A key must identify the item, not its position. Use a stable id from the data. Index keys are only safe for lists that never reorder, insert or delete.
**Why it matters / follow-up:** The fix:

```jsx
import { useState } from 'react'

function RowsFixed() {
  const [names, setNames] = useState(['Ann', 'Bob', 'Cy'])

  return (
    <ul>
      {names.map((name) => (
        <li key={name}>
          {name} <input aria-label={'note for ' + name} />
          <button onClick={() => setNames(names.filter((n) => n !== name))}>
            delete {name}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

**Learn more:** [conditional rendering and lists](../../../01-basics/06-conditional-rendering-and-lists.md)

### R3-RM-006 (Easy) The missing key warning
**Answer:** React prints this error in the console (in development only): `Each child in a list should have a unique "key" prop.` The list still renders as `<ul><li>react</li><li>hooks</li></ul>`.

**Trace:**
1. `tags.map(...)` returns an array of `<li>` elements with no keys.
2. React cannot tell the items apart when the list changes, so it warns. It falls back to the item position.
3. The warning is `console.error`. It does not throw, so the page works.

**The rule:** Give the outermost element returned by `map` a stable, unique `key`: `<li key={tag}>`.
**Why it matters / follow-up:** Follow-up: "Why not `Math.random()` as the key?" A new key on every render means every item is remounted, and state is lost.
**Learn more:** [conditional rendering and lists](../../../01-basics/06-conditional-rendering-and-lists.md)

### R3-RM-007 (Hard) memo with JSX children
**Answer:** `PageA`: the click logs `Box render` and `Note render`. `PageB`: the click logs nothing.

**Trace:**
1. In `PageA` the state lives in the same component that writes `<Box><Note /></Box>`. Each render creates a new `<Note />` element, so the `children` prop is a new object. `memo` sees changed props and renders `Box`, and so `Note`.
2. In `PageB` the state is inside `Shell`, but `children` is created by `PageB`, which does not re-render. `Shell` passes the same element object to `Box` every time.
3. The props are equal, so `memo` skips `Box`, and `Note` is not rendered either.

**The rule:** Elements are objects. `memo` is useless if you pass fresh JSX as `children`. Passing children in from a parent that does not re-render keeps them stable.
**Why it matters / follow-up:** This "move state down, pass children up" trick is often better than memo.
**Learn more:** [memoization](../../../02-hooks/07-memoization.md)

### R3-RM-008 (Medium) Context default and Provider
**Answer:** `one: theme = [light]`, `two: theme = [dark]`, `three: theme = []`.

**Trace:**
1. `Label one` has no provider above it, so `useContext` returns the default value `light`.
2. In React 19 you can write `<ThemeContext value="dark">` directly. `Label two` reads `dark`.
3. A provider with `value={undefined}` still provides a value, and that value is `undefined`. React does not fall back to the default, so `Label three` prints nothing between the brackets.

**The rule:** The default is used only when there is no provider above. Before React 19 you wrote `<ThemeContext.Provider value=...>`; the old form still works.
**Why it matters / follow-up:** A missing `value` prop is a classic source of `undefined` in consumers.
**Learn more:** [useContext](../../../02-hooks/05-usecontext.md)

### R3-RM-009 (Hard) Context changes go through memo
**Answer:** Mount: `Middle render`, `Reader render`. After `inc n`: `Reader render` only (and the paragraph shows `n = 1`). After `inc other`: nothing.

**Trace:**
1. Mount renders everything.
2. `inc n` changes the context value from 0 to 1. `Top` renders. `Middle` has no props, so `memo` skips it. React still finds the consumers of the changed context below it, so `Reader` renders.
3. `inc other` re-renders `Top`, but the context value is still 1 and `Middle` is skipped, so `Reader` has no reason to render.

**The rule:** A context change re-renders the components that read it, even when a `memo` parent in between is skipped. A parent re-render alone does not re-render a memoized child with equal props.
**Why it matters / follow-up:** Follow-up: "Does every state change in a provider re-render all consumers?" Only if the context value changes. See R3-BG-008 for an unstable value.
**Learn more:** [useContext](../../../02-hooks/05-usecontext.md)
