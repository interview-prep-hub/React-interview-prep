# Round 2 - Concepts and Theory: Fundamentals and Hooks - Answers

**Questions:** [../questions/01-fundamentals-and-hooks.md](../questions/01-fundamentals-and-hooks.md)

## What React is and how it thinks
### R2-FN-001 (Easy) What is React and what problem does it solve?
**Answer:** React is a JavaScript library for building user interfaces out of small, reusable pieces called components. With hand-written DOM code you must find every element that depends on some data and update it yourself each time the data changes. As the app grows, it becomes very easy to forget one place, and the screen drifts out of sync with the data. In React you describe what the UI should look like for the current data, and React works out which DOM changes are needed. So the UI becomes a function of state: the same state always gives the same screen. You also get reuse (components), a clear one-way data flow, and a large ecosystem.
**Why it matters / follow-up:** The interviewer often continues with "so what does React not do for you?" (see R2-FN-002), or "why React and not Vue or Angular?".
**Learn more:** [What is React](../../../01-basics/02-what-is-react.md)

### R2-FN-002 (Easy) Library or framework?
**Answer:** React itself is a library. It handles rendering components and keeping the screen in sync with state, and it leaves the rest of the app to you. Out of the box it does not give you routing, a data-fetching and caching layer, a build setup, or server rendering. You add those with other tools: React Router for routing, TanStack Query for server data, Vite for building. Frameworks built on React, such as Next.js, bundle many of these choices. Today react.dev recommends starting a new app with a framework, and Create React App was deprecated for new projects in February 2025.
**Why it matters / follow-up:** Expect "how would you start a new project today?". A safe answer: a framework if you need routing and server rendering, otherwise Vite with React.
**Learn more:** [What is React](../../../01-basics/02-what-is-react.md)

### R2-FN-003 (Easy) Declarative versus imperative UI
**Answer:** Imperative code tells the computer how to change the screen, step by step: find the element, set its text, add a class, remove a child. Declarative code describes what the screen should look like for the current data, and the library figures out the steps. In React you write JSX for each state and let React update the DOM. This removes a whole class of bugs where one branch of your code forgets to undo what another branch did.
```jsx
// Imperative DOM code
button.textContent = isOn ? "On" : "Off";
button.classList.toggle("active", isOn);

// Declarative React
<button className={isOn ? "active" : ""}>{isOn ? "On" : "Off"}</button>
```
**Why it matters / follow-up:** "Is there any imperative code in React?" Yes: refs, focusing an input and effects that talk to outside systems are deliberate escape hatches.
**Learn more:** [What is React](../../../01-basics/02-what-is-react.md)

### R2-FN-004 (Medium) The virtual DOM
**Answer:** The virtual DOM is the idea that React builds a lightweight tree of plain JavaScript objects (React elements) describing the UI. After a state change React renders again, compares the new tree with the old one (this is "diffing"), and applies only the differences to the real DOM. It is not the reason React is fast: creating and comparing objects is extra work compared with a hand-tuned direct DOM update. What it buys you is a simple declarative programming model with good-enough speed, because React batches updates and touches the DOM as little as possible. Svelte and Solid skip the virtual DOM and update the DOM directly, which shows that a virtual DOM is not required for speed.
**Why it matters / follow-up:** The red flag is saying "the virtual DOM makes React faster than the real DOM". A follow-up may be "what is Fiber?" (React's internal engine that splits rendering into small units of work).
**Learn more:** [How React renders](../../../04-advanced/01-how-react-renders.md)

### R2-FN-005 (Medium) Component, element and instance
**Answer:** A component is the function (or class) that you write, such as `function Card(props)`. An element is a plain, immutable object that describes what to render, such as the result of `<Card title="Hi" />`. It holds a `type` and `props` and is very cheap to create. An instance is the live thing React keeps for a mounted component: for classes an object made with `new`, for function components an internal record (a Fiber) that holds the state and effects. You never touch it directly. Two `<Counter />` elements on the page give two instances, each with its own state. The broader word "node" (ReactNode) means anything React can render: an element, a string, a number, `null` or an array of these.
**Why it matters / follow-up:** This explains why "rendering a component" just means calling your function, and why the same component used twice does not share state.
**Learn more:** [JSX](../../../01-basics/03-jsx.md)

## Components, JSX and lists
### R2-FN-006 (Easy) Function versus class components
**Answer:** A function component is a plain function that takes props and returns JSX. With hooks it can hold state, run effects, read context and use refs. Class components use `this`, lifecycle methods and `setState`. Function components won because hooks let you reuse stateful logic through custom hooks without wrapper components (HOCs, render props). Related code also stays together, for example an effect keeps a subscription's setup and cleanup in one place instead of splitting them across `componentDidMount` and `componentWillUnmount`. There is also no `this` binding confusion and less boilerplate. Classes still work and are not removed, but they are legacy for new code. The one thing only classes can do is be an error boundary (`getDerivedStateFromError`, `componentDidCatch`); in function-based code people use the `react-error-boundary` package.
**Why it matters / follow-up:** Expect "map the lifecycle methods to hooks, and say where the mapping misleads". Short version: `useEffect` is about synchronising, not about "mount" and "update".
**Learn more:** [Hooks overview and rules](../../../02-hooks/01-hooks-overview-and-rules.md)

### R2-FN-007 (Medium) Pure components and side effects
**Answer:** A component is pure when, for the same props, state and context, it always returns the same JSX and changes nothing outside itself while rendering. A side effect is anything that reaches outside: a network request, a subscription, a timer, editing the DOM by hand, writing to a variable declared outside the component, or mutating props. Side effects belong in event handlers (when the user did something) or in effects (to synchronise with an outside system), never in the render body. React relies on purity because it may call your component more than once (StrictMode does this on purpose), pause a render, throw it away, or render in a different order. Changing something you created during this same render, like pushing into a local array, is fine.
```jsx
let clicks = 0;
function Bad() {
  clicks++; // mutates something outside during render: impure
  return <p>{clicks}</p>;
}
```
**Why it matters / follow-up:** "How does StrictMode help here?" It renders twice in development so impure code shows up as a visible difference.
**Learn more:** [How React renders](../../../04-advanced/01-how-react-renders.md)

### R2-FN-008 (Easy) Props, one-way data flow and prop drilling
**Answer:** Data flows down the tree: a parent passes props to a child, and the child cannot change them. If a child needs to cause a change, the parent passes down a function as a prop. The child calls it, the parent updates its own state, and everything re-renders with new props. This is good because you can always trace where a value came from, and a child cannot secretly change its parent's data. The cost is prop drilling: passing a prop through many layers that do not use it. First try composition (pass the finished JSX down as `children` or a prop), then Context or a state library when many distant components need the same data.
**Why it matters / follow-up:** The follow-up is "when is Context the wrong fix for drilling?". Answer: when the value changes often, because every consumer re-renders.
**Learn more:** [Components and props](../../../01-basics/04-components-and-props.md)

### R2-FN-009 (Easy) What JSX compiles to
**Answer:** JSX is syntax sugar. A compiler (Babel, SWC, esbuild or TypeScript) turns `<h1 className="t">Hi</h1>` into a function call such as `jsx("h1", { className: "t", children: "Hi" })`, imported from `react/jsx-runtime`. That call returns a plain element object. Since React 17 the "new JSX transform" adds that import for you, so you no longer need `import React from "react"` just to write JSX. You still import hooks and other APIs you use by name. The older transform produced `React.createElement(...)` calls, which is why old files import React.
**Why it matters / follow-up:** "Why must component names start with a capital letter?" A lowercase tag such as `<div>` becomes the string `"div"`, a capital name is treated as a variable that holds a component.
**Learn more:** [JSX](../../../01-basics/03-jsx.md)

### R2-FN-010 (Medium) What goes in braces and what renders
**Answer:** Inside `{}` you can put any JavaScript expression: a variable, a function call, a ternary, a `map`. You cannot put statements such as `if` or `for`. Plain objects are not valid React children and throw an error, but arrays of renderable values are fine. `null`, `undefined`, `true` and `false` render nothing. Numbers render as text, including `0`. That is the bug in the line from the question: when `items.length` is `0`, the `&&` returns `0`, and React shows a literal "0" on the screen. Fix it by making the condition a real boolean, such as `items.length > 0 && ...`, or use a ternary.
**Why it matters / follow-up:** The same trap appears with any number or empty string on the left of `&&`. Interviewers love it as an output question.
**Learn more:** [Conditional rendering and lists](../../../01-basics/06-conditional-rendering-and-lists.md)

### R2-FN-011 (Medium) Keys and index keys
**Answer:** A key tells React which list item is which between renders. With keys React can match old and new items, keep the right state and DOM node with each item, and move items instead of rebuilding them. Use a stable, unique id from your data, such as a database id. Index keys are risky when the list can be reordered, filtered or have items inserted. The index then points to a different item than before, so React reuses the component of the old item (with its input text, checkbox state and so on) for a different one. In the code from the question, deleting the first todo would leave leftover local state in the wrong row. Index keys are fine for a static list that never changes order and has no local state. Never use `Math.random()` as a key: every render creates new keys, so everything remounts.
**Why it matters / follow-up:** Follow-up: "what else do keys do?" Changing the key of a component forces a remount, which is a way to reset its state.
**Learn more:** [Conditional rendering and lists](../../../01-basics/06-conditional-rendering-and-lists.md)

## Props, state and forms
### R2-FN-012 (Easy) Controlled versus uncontrolled
**Answer:** In a controlled input, React state is the source of truth: you pass `value` and an `onChange` that updates the state. In an uncontrolled input the DOM keeps the value, and you read it when needed with a ref or with `FormData` on submit; `defaultValue` sets the starting text. Choose controlled when you need live validation, formatting while typing, a disabled button that depends on the value, or fields that depend on each other. Choose uncontrolled for simple forms where you only need the values on submit, since it needs less code and fewer re-renders. File inputs are always uncontrolled. Two classic bugs: giving `value` without `onChange` makes the field read-only, and starting with `undefined` then switching to a string triggers a "changing uncontrolled to controlled" warning.
**Why it matters / follow-up:** The same idea applies to your own components (`value` plus `onChange` versus internal state). React Hook Form uses uncontrolled inputs to avoid a re-render per keystroke.
**Learn more:** [Forms](../../../01-basics/07-forms.md)

### R2-FN-013 (Easy) Props versus state
**Answer:** Props are inputs a component receives from its parent, and the component must treat them as read-only. State is memory owned by the component that can change over time, and calling its setter triggers a re-render. A good rule: if a value can be computed from props or other state, do not store it, compute it during render. If it changes because of user interaction and must survive re-renders, it is state. Both cause a re-render when they change. A child's props are often a parent's state, which is how data moves down.
**Why it matters / follow-up:** The next question is usually "where should this state live?". See R2-FN-014.
**Learn more:** [State and events](../../../01-basics/05-state-and-events.md)

### R2-FN-014 (Easy) Lifting state up and single source of truth
**Answer:** When two components need the same changing data, move the state to their nearest common parent and pass the value and the setter (as callbacks) down. This gives a single source of truth: the data lives in exactly one place, so two siblings can never disagree about it. A temperature input shown in both Celsius and Fahrenheit is the textbook example. Do not lift higher than necessary. Keep state as close as possible to where it is used (colocation), which keeps components simple and limits re-renders. If lifting makes you drill through many layers, consider composition or Context.
**Why it matters / follow-up:** Interviewers connect this to "Thinking in React": find the minimal state, decide who owns it, add inverse data flow with callbacks.
**Learn more:** [Thinking in React](../../../01-basics/08-thinking-in-react.md)

### R2-FN-015 (Medium) State is a snapshot
**Answer:** The console shows `0`. Each render is a snapshot: inside that render, `count` is a constant. `setCount(count + 1)` does not change the variable in the running function. It asks React to re-render with a new state value, and the next render gets `count` equal to `1`. So the handler, which was created in the render where `count` was `0`, logs `0`. This is why "setState is asynchronous" is only a rough description: the more exact idea is that updates are queued, batched, and each render sees fixed values. The same snapshot idea explains stale values inside `setTimeout` callbacks.
**Why it matters / follow-up:** The follow-up is "how do you get the new value then?". Compute it into a variable first (`const next = count + 1`), or use the new state in the next render or an effect.
**Learn more:** [State and events](../../../01-basics/05-state-and-events.md)

### R2-FN-016 (Medium) Functional updates and batching
**Answer:** Version A ends at `1`, version B ends at `2`. In version A both calls use the same snapshot, `count` is `0`, so both queue "set to 1". In version B each call queues a function. React applies the functions in order: the first turns `0` into `1`, the second turns `1` into `2`. Use the function form whenever the new state depends on the previous state. Batching means React groups several state updates from one event into a single re-render. Since React 18, batching is automatic everywhere, including in timeouts, promises and native event handlers, not only inside React event handlers. `flushSync` can opt out but is rarely needed.
**Why it matters / follow-up:** "Does React re-render after each setState?" No, once per batch. Another follow-up is the stale closure in R2-HK-006.
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R2-FN-017 (Easy) Immutable state updates
**Answer:** React decides whether state changed by comparing the old and new value with `Object.is`, which for objects and arrays means comparing references. In the code from the question, `push` changes the same array, and `setTodos(todos)` passes the same reference, so React sees no change and may skip the re-render. Mutation also breaks `React.memo`, effect dependencies and any logic that compares old and new values. Always create a new value: `setTodos([...todos, { id: nextId++, text }])`. For updates use `map` and `filter`, and for objects use spread: `{ ...user, name }`. For nested data copy every level along the path, or use a helper such as Immer, which lets you write mutating-looking code that produces an immutable result.
**Why it matters / follow-up:** Interviewers also ask about normalising state (store items by id) to make nested updates simple.
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R2-FN-018 (Medium) Derived state and resetting with a key
**Answer:** `useState(user.name)` uses the prop only as the initial value. If the parent later passes a different `user`, the state does not follow, and the form shows the old person. Storing `fullName` in state is also a bug waiting to happen, because it is a second copy that can drift from `first` and `last`. The fix for computed values is to calculate them during render: `const fullName = user.first + " " + user.last`, with `useMemo` only if it is truly expensive. If you want the component to start fresh whenever the identity changes, give it a key: `<Profile key={user.id} user={user} />`. A new key makes React discard the old instance and create a new one with fresh state. Avoid syncing state from props with an effect, because it causes an extra render and a flash of old data.
**Why it matters / follow-up:** This is the standard "you might not need an effect" example (see R2-HK-009).
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

## Hooks: basics and effects
### R2-HK-001 (Easy) What hooks are and why they exist
**Answer:** Hooks are functions whose names start with `use`, which let function components use React features such as state (`useState`), effects (`useEffect`), context (`useContext`) and refs (`useRef`). They arrived in React 16.8. Before that, sharing stateful logic between classes meant higher-order components or render props, which wrapped components in layers. Related logic was also split across lifecycle methods, while unrelated logic was mixed together in the same method. Classes also had `this` confusion. Hooks fix these: you extract logic into custom hooks, each call gets its own state, and the component tree does not change.
**Why it matters / follow-up:** Follow-up: "what are the rules of hooks?" (R2-HK-002).
**Learn more:** [Hooks overview and rules](../../../02-hooks/01-hooks-overview-and-rules.md)

### R2-HK-002 (Medium) Rules of hooks
**Answer:** There are two rules. Call hooks only at the top level of a component or custom hook, never inside conditions, loops, nested functions or after an early return. Call hooks only from React function components or custom hooks. The reason is that React does not know the names of your hooks. It stores each component's hook data in an ordered list and matches them by call order on every render. If a condition changes the order, React would give one hook's state to another hook, and you see errors such as "Rendered more hooks than during the previous render". If you need a condition, put it inside the hook (or inside the effect), or move the code into a child component. The `use` function is the exception: it can be called conditionally and in loops. The `eslint-plugin-react-hooks` package checks both rules for you.
**Why it matters / follow-up:** A common follow-up is "implement a tiny `useState`". The core idea is an array of slots and an index that resets each render.
**Learn more:** [Hooks overview and rules](../../../02-hooks/01-hooks-overview-and-rules.md)

### R2-HK-003 (Medium) What useEffect is for
**Answer:** An effect lets a component synchronise with a system outside React: a network connection, a subscription, a browser API such as `document.title`, a timer, or a non-React widget. React runs it after rendering and updating the screen. The right mental model is "start synchronising, and stop synchronising when needed", not "run on mount" or "run on update". It is not for calculating values from props or state (do that during render), for reacting to a click (do that in the event handler), or for resetting state when a prop changes (use a key). Most bugs with effects come from using them for these things.
```jsx
useEffect(() => {
  const connection = connect(roomId);
  return () => connection.disconnect();
}, [roomId]);
```
**Why it matters / follow-up:** Follow-up: "what does the dependency array do?" (R2-HK-004).
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R2-HK-004 (Easy) The dependency array
**Answer:** With no array, the effect runs after every render. With `[]`, it runs after the first render and its cleanup runs on unmount. With `[a, b]`, it runs after the first render and again whenever `a` or `b` changed, compared with `Object.is`. The array is not a choice you make for speed: it must list every reactive value the effect reads, which means props, state and any variable or function declared inside the component. State setters and refs are stable and do not need to be listed. Objects and functions created during render are new on each render, so putting them in the array makes the effect re-run every time. Move them inside the effect, outside the component, or memoise them.
**Why it matters / follow-up:** Follow-up: "why is my effect in an infinite loop?" Usually the effect sets state that is also a dependency, or a dependency is a new object every render.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R2-HK-005 (Easy) Cleanup
**Answer:** The cleanup is the function your effect returns. React runs it before re-running the effect with new values, and when the component unmounts. Its job is to undo what the setup did: clear timers, remove event listeners, unsubscribe, close connections, abort requests. Without it you get leaks, duplicated listeners and updates from outdated requests. The order is: render with new values, run the old cleanup (with the old values), then run the new setup.
```jsx
useEffect(() => {
  function onResize() { setWidth(window.innerWidth); }
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);
```
**Why it matters / follow-up:** "What are typical memory leaks in React?" Timers, listeners and subscriptions without cleanup.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R2-HK-006 (Hard) The stuck timer (stale closure)
**Answer:** Every render creates new functions that close over that render's variables. The effect has `[]`, so it ran only after the first render, and its interval callback closes over `count` from that render, which is `0`. Each second it calls `setCount(0 + 1)`, so the state becomes `1` and stays `1`. There are two fixes. The best one here is a functional update, `setCount((c) => c + 1)`, which does not read `count` at all, so the effect needs no dependency. The other is to list `count` in the array, which works but restarts the interval every second. Do not just leave the array empty and hide the warning. If you need the latest value without restarting the effect, use `useEffectEvent`.
**Why it matters / follow-up:** The same stale-value problem happens in timeouts and async handlers. Follow-up: "what does a handler see versus an effect?" Both see the values of the render they were created in.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R2-HK-007 (Hard) exhaustive-deps and useEffectEvent
**Answer:** The dependency list states what the effect reads. If you hide a dependency, the effect runs with stale values, as in the timer bug. When the lint rule complains, try these in order. Move the function or value inside the effect, or out of the component if it does not depend on props. Use a functional state update so you do not read the state. Depend on a primitive (an id) instead of a whole object. If the problem is that you want to read the latest value inside an effect without re-synchronising when it changes, use `useEffectEvent`, which is stable since React 19.2. You define the non-reactive logic in an Effect Event, and call it only from inside effects. Do not pass it to child components, do not put it in a dependency array, and do not use it just to silence the linter when the value should trigger re-synchronisation.
```jsx
const onConnected = useEffectEvent(() => {
  showToast(`Connected to ${roomId}`, theme); // always sees the latest theme
});

useEffect(() => {
  const connection = connect(roomId);
  connection.on("connected", () => onConnected());
  return () => connection.disconnect();
}, [roomId]); // theme changes do not reconnect
```
**Why it matters / follow-up:** Before 19.2, people used a ref holding the latest callback. Follow-up: "is `useEffectEvent` an optimisation?" No, it expresses which logic is non-reactive.
**Learn more:** [Other hooks](../../../02-hooks/09-other-hooks.md)

### R2-HK-008 (Medium) Effects run twice in development
**Answer:** In development, `StrictMode` mounts the component, runs the effect, runs the cleanup, and runs the effect again. This simulates a user leaving and returning, to check that your effect cleans up properly. If you see a duplicated connection or a duplicated request, your effect is missing a cleanup. `StrictMode` also renders components twice to catch impure rendering (in React 19 the second render reuses `useMemo` and `useCallback` results from the first), and it calls ref callbacks twice on mount. None of this happens in production. Do not remove `StrictMode` or add a "has run" ref to hide it. Fix the effect with a cleanup, or move one-time work such as analytics out of the effect.
**Why it matters / follow-up:** Follow-up: "is `useEffect(..., [])` the same as `componentDidMount`?" No, because of this setup, cleanup, setup cycle.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R2-HK-009 (Medium) You might not need an effect
**Answer:** An effect is only for synchronising with outside systems. These cases do not need one. Values you can compute from props or state: calculate during render (use `useMemo` if it is slow). Reacting to a user action: do the work in the event handler. Resetting state when a prop changes: use a `key`. Chains of effects that set state to trigger other effects: compute everything in one handler. Telling a parent about a change: call its callback in the handler. Subscribing to an external store: use `useSyncExternalStore`. Fetching data is a legitimate effect, but a query library or framework is usually better. Effects run after render, so setting state in them causes an extra render and a visual flicker.
```jsx
// Bad: extra render and a second source of truth
useEffect(() => setFull(first + " " + last), [first, last]);

// Good
const full = first + " " + last;
```
**Why it matters / follow-up:** A quick test to say out loud: "Am I synchronising with something outside React? If not, I do not need an effect."
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R2-HK-010 (Hard) Race conditions when fetching in an effect
**Answer:** If `id` changes from 1 to 2 quickly, two requests are in flight. Responses can arrive out of order, so the response for 1 may arrive last and overwrite the correct data for 2. The fix is to ignore or cancel the outdated request in the cleanup. Cancelling with an `AbortController` also saves bandwidth. You should also handle loading and error states and reset old data when `id` changes. In development you will see two requests because of StrictMode, which is expected. A query library such as TanStack Query handles all of this, plus caching, retries and deduplication.
```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/users/${id}`, { signal: controller.signal })
    .then((res) => res.json())
    .then(setUser)
    .catch((err) => {
      if (err.name !== "AbortError") setError(err);
    });
  return () => controller.abort();
}, [id]);
```
**Why it matters / follow-up:** "Why can the effect callback not be async?" An async function returns a promise, but React expects either nothing or a cleanup function. Define an async function inside the effect and call it.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R2-HK-011 (Medium) useEffect versus useLayoutEffect
**Answer:** `useLayoutEffect` runs synchronously after React updates the DOM but before the browser paints, so it blocks painting. `useEffect` usually runs after the screen has been updated. Use `useLayoutEffect` when you must measure the DOM and change something before the user sees a frame, for example measuring a tooltip with `getBoundingClientRect` and then positioning it. This avoids a flicker where the tooltip first appears in the wrong place. For everything else use `useEffect`, because layout effects delay the paint and hurt performance. Layout effects do not run during server rendering. A third one, `useInsertionEffect`, exists mainly for CSS-in-JS libraries to inject styles.
**Why it matters / follow-up:** Follow-up: "what is the order of effects on mount?" Children's effects run before parents', and layout effects run before passive effects.
**Learn more:** [Other hooks](../../../02-hooks/09-other-hooks.md)

## Hooks: refs, context, reducers, memoization and custom hooks
### R2-HK-012 (Easy) useRef
**Answer:** A ref is a plain object `{ current: value }` that React keeps the same between renders. The main uses are: holding a DOM node (`ref={inputRef}`, then `inputRef.current.focus()`), and holding a mutable value that is not shown on screen, such as a timer id, the previous value, or the latest callback. Changing `ref.current` does not cause a re-render because React does not watch it. It is an escape hatch. If the value should appear on screen, it must be state. Do not read or write `ref.current` during render, except for one-time setup. Do it in event handlers or effects.
**Why it matters / follow-up:** Follow-up: "state versus ref versus a plain variable?" State: shown on screen, triggers render. Ref: not shown, survives renders. Plain variable: reset on every render.
**Learn more:** [useRef](../../../02-hooks/04-useref.md)

### R2-HK-013 (Medium) Refs as props and forwardRef
**Answer:** In React 19, function components receive `ref` as an ordinary prop, so you can write `function MyInput({ ref, ...props }) { return <input ref={ref} {...props} />; }` and the parent can pass `ref` as usual. Before 19, `ref` was special and was not passed in props, so you wrapped the component in `forwardRef`. `forwardRef` still works in 19.3 with no warning, but react.dev says it will be deprecated in a future release, so new code should use the prop. In 19, a ref callback can also return a cleanup function. To expose only a few methods to the parent instead of the whole DOM node, use `useImperativeHandle`, and use it sparingly.
**Why it matters / follow-up:** In TypeScript with React 19 types, `useRef` needs an argument: `useRef<HTMLInputElement>(null)`.
**Learn more:** [useRef](../../../02-hooks/04-useref.md)

### R2-HK-014 (Medium) Context and re-renders
**Answer:** Context passes a value to any depth without prop drilling. You create it with `createContext`, provide it with `<ThemeContext value={...}>` (in React 19; `.Provider` also still works) and read it with `useContext`. When the provided value changes (compared with `Object.is`), every component that reads that context re-renders, even if it is wrapped in `memo`. Components that do not read it are not re-rendered by the context itself. The common performance bug is `value={{ user, setUser }}`: it makes a new object on every render of the provider, so all consumers re-render whenever the provider does. Fixes: wrap the value in `useMemo`, split the context (one for state, one for dispatch, or one per topic), keep provider state in a small component and pass `children`, or use a store with selectors (Zustand, Redux) for values that change often.
**Why it matters / follow-up:** "Context versus Redux?" Context is a delivery mechanism with no selectors. It suits low-frequency values such as theme, locale and current user.
**Learn more:** [useContext](../../../02-hooks/05-usecontext.md)

### R2-HK-015 (Medium) useReducer versus useState
**Answer:** `useState` is great for simple, independent values. Choose `useReducer` when the state is an object with several related fields, when the next state depends on the previous one in non-trivial ways, or when many different events update the same state. You collect all update logic in one pure function, `(state, action) => newState`, and components just `dispatch` named actions such as `{ type: "added", text }`. Benefits: the logic is easy to unit test because the reducer is a plain function, updates are easier to follow in code, and `dispatch` has a stable identity, so you can pass it down or leave it out of dependency arrays. The reducer must be pure and must not mutate state. The cost is more boilerplate for small cases. `useReducer` plus Context is a common pattern for medium-sized shared state.
**Why it matters / follow-up:** In TypeScript, actions are typed as a discriminated union (see the typing question in part 2).
**Learn more:** [useReducer](../../../02-hooks/06-usereducer.md)

### R2-HK-016 (Hard) useMemo, useCallback and React.memo
**Answer:** `useMemo` caches a computed value between renders until its dependencies change. `useCallback` caches a function's identity, and is equal to `useMemo(() => fn, deps)`. `React.memo` wraps a component so it skips re-rendering when its props are shallowly equal to the last render. `memo` silently fails when a prop is a new object, array or function on every render. In the code from the question, `onSelect={(id) => ...}` is a new function each time `List` renders, so every `Row` re-renders anyway, and the same happens when you pass JSX as `children`. Fix it by wrapping the handler in `useCallback` in the parent, or by moving the function out. Do not memoise everything: it costs memory and comparisons, so measure with the Profiler first. React Compiler 1.0 (stable since October 2025) memoises components and hooks automatically when your code follows the Rules of React, so manual memoisation is now mostly an escape hatch, for example to stabilise a value used as an effect dependency.
**Why it matters / follow-up:** Ways to cut renders without memo: move state down, and pass expensive subtrees as `children`.
**Learn more:** [Memoization](../../../02-hooks/07-memoization.md)

### R2-HK-017 (Easy) Custom hooks
**Answer:** A custom hook is a function whose name starts with `use` and that calls other hooks. It extracts reusable stateful logic, for example `useDebounce`, `useLocalStorage`, `useFetch` or `useToggle`. You extract one when the same logic repeats, or when a component mixes too many concerns and reads better with the logic named and moved out. It shares logic, not state: each component that calls the hook gets its own independent state. To share state between components, use lifted state, Context or an external store. Custom hooks follow the same rules as built-in hooks, and the `use` prefix lets the linter check them. You can test them with `renderHook` from Testing Library.
```jsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return [on, toggle];
}
```
**Why it matters / follow-up:** "Do two components using one custom hook share state?" No. Say it clearly, it is a favourite trick question.
**Learn more:** [Custom hooks](../../../02-hooks/08-custom-hooks.md)
