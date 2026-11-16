# Round 1 - Screening Quiz: 90 Quick Questions - Answers

**Questions:** [../questions/01-screening-quiz.md](../questions/01-screening-quiz.md)

## Basics: React fundamentals

### R1-BS-001 (Easy) What is React?
**Answer:** React is a JavaScript library for building user interfaces out of small reusable pieces called components. You describe what the screen should look like for the current data, and React updates the page when the data changes.  
**Why it matters / follow-up:** "Why not just write plain DOM code?" Because React removes the manual "find the element and update it" work, which is where many bugs come from.  
**Learn more:** [What is React](../../../01-basics/02-what-is-react.md)

### R1-BS-002 (Easy) Library or framework?
**Answer:** False. React is a library that focuses on rendering the UI. Routing, data fetching and server rendering come from other tools such as React Router, TanStack Query and Next.js.  
**Why it matters / follow-up:** "So what do you add to build a real app?" Name a router, a data-fetching tool and a build tool or framework.  
**Learn more:** [What is React](../../../01-basics/02-what-is-react.md)

### R1-BS-003 (Easy) Declarative vs imperative
**Answer:** React is declarative. You describe what the UI should look like for a given state, and React works out the DOM steps. In imperative code you write every step yourself, like "find this element, then change its text".  
**Why it matters / follow-up:** Be ready to show a counter written both ways.  
**Learn more:** [What is React](../../../01-basics/02-what-is-react.md)

### R1-BS-004 (Medium) Is the virtual DOM why React is fast?
**Answer:** Mostly false. The virtual DOM is a lightweight description of the UI (plain JavaScript objects) that React compares with the previous one to find the smallest set of real DOM changes. That is fast enough for most apps, but it is not faster than careful hand-written DOM code; the real benefit is the simple programming model.  
**Why it matters / follow-up:** "Which phase applies the changes to the DOM?" The commit phase.  
**Learn more:** [What is React](../../../01-basics/02-what-is-react.md), [How React renders](../../../04-advanced/01-how-react-renders.md)

### R1-BS-005 (Easy) Function vs class components
**Answer:** Function components with hooks are the standard. Class components still work and you will see them in old code. The one thing only a class can still do is be an error boundary (a component that catches errors thrown by its children).  
**Why it matters / follow-up:** "Is there a hook for error boundaries?" No. Libraries such as react-error-boundary wrap the class for you.  
**Learn more:** Legacy React: class components and Redux connect (planned), [Error boundaries, portals and friends](../../../03-intermediate/05-error-boundaries-portals-and-friends.md)

## Basics: JSX and lists

### R1-BS-006 (Easy) What JSX compiles to
**Answer:** JSX compiles to plain function calls (from `react/jsx-runtime`) that create element objects. With the modern JSX transform, which Vite and Next.js set up for you, you do not need to import React just to write JSX.  
**Why it matters / follow-up:** "Is JSX required to use React?" No, but almost everyone uses it.  
**Learn more:** [JSX](../../../01-basics/03-jsx.md)

### R1-BS-007 (Easy) Renamed attributes in JSX
**Answer:** `class` becomes `className` and `for` becomes `htmlFor`, because `class` and `for` are reserved words in JavaScript. Most other attributes are camelCase too, for example `onClick` and `tabIndex`.  
**Why it matters / follow-up:** "How do you write an inline style?" With an object: `style={{ color: 'red' }}`.  
**Learn more:** [JSX](../../../01-basics/03-jsx.md)

### R1-BS-008 (Easy) Two siblings without a wrapper
**Answer:** False. JSX needs a single root, so wrap the siblings in a fragment (`<>...</>`), which groups them without adding an extra DOM element.  
**Why it matters / follow-up:** "When do you need the long `<Fragment key={id}>` form?" When each item of a list returns several elements, because the short form cannot take a key.  
**Learn more:** [JSX](../../../01-basics/03-jsx.md)

### R1-BS-009 (Easy) What goes in curly braces
**Answer:** Any JavaScript expression: a variable, a function call, a ternary, a template string. Statements such as `if` and `for` are not allowed. A plain object cannot be rendered as a child (React throws an error), although you can pass one to `style`.  
**Why it matters / follow-up:** "How do you do an if/else in JSX?" Use a ternary, or compute a variable before the `return`.  
**Learn more:** [JSX](../../../01-basics/03-jsx.md)

### R1-BS-010 (Easy) The zero pitfall
**Answer:** It renders the number `0` on the screen, because `0 && x` evaluates to `0` and React renders numbers. Use a real boolean instead: `{count > 0 && <Badge />}`.  
**Why it matters / follow-up:** "Why do `false` and `null` render nothing but `0` does?" See the next question.  
**Learn more:** [Conditional rendering and lists](../../../01-basics/06-conditional-rendering-and-lists.md)

### R1-BS-011 (Easy) Calling the handler by mistake
**Answer:** `handleSave()` is called while rendering, not on click, and its return value becomes the handler. Pass the function itself, `onClick={handleSave}`, or wrap it when you need arguments: `onClick={() => handleSave(id)}`.  
**Why it matters / follow-up:** If that call sets state, you get an infinite render loop.  
**Learn more:** [State and events](../../../01-basics/05-state-and-events.md)

### R1-BS-012 (Easy) What renders for false
**Answer:** False. `false`, `true`, `null` and `undefined` render nothing. Numbers (including `0`) and strings do render.  
**Why it matters / follow-up:** This is why the `cond && <Thing />` pattern works.  
**Learn more:** [Conditional rendering and lists](../../../01-basics/06-conditional-rendering-and-lists.md)

### R1-BS-013 (Easy) Why keys
**Answer:** The key tells React which item is which between renders, so it can match, move, add or remove items correctly instead of rebuilding them. Use a stable, unique id from your data, such as a database id.  
**Why it matters / follow-up:** "Is `key` available inside the child as a prop?" No, React uses it internally.  
**Learn more:** [Conditional rendering and lists](../../../01-basics/06-conditional-rendering-and-lists.md), [How React renders](../../../04-advanced/01-how-react-renders.md)

### R1-BS-014 (Medium) Index as key
**Answer:** If items can be reordered, filtered, inserted or removed, the index no longer follows the item, so state and DOM (like text typed in an input) stay with the wrong row. It is fine for a static list that never changes order and has no per-item state.  
**Why it matters / follow-up:** "Is `Math.random()` a good key?" No, it changes on every render, so every item remounts.  
**Learn more:** [Conditional rendering and lists](../../../01-basics/06-conditional-rendering-and-lists.md), [How React renders](../../../04-advanced/01-how-react-renders.md)

## Basics: props, state and forms

### R1-BS-015 (Easy) Props vs state
**Answer:** Props are inputs a component receives from its parent, and the component must not change them. State is data the component owns and remembers between renders, and changing it causes a re-render.  
**Why it matters / follow-up:** "Can a child change its parent's state?" Only through a function that the parent passes down as a prop.  
**Learn more:** [Components and props](../../../01-basics/04-components-and-props.md), [State and events](../../../01-basics/05-state-and-events.md)

### R1-BS-016 (Easy) Are props read-only?
**Answer:** False. Props are read-only. If the child needs a change, the parent passes down a callback such as `onChange`, and the child calls it so the parent updates its own state.  
**Why it matters / follow-up:** "Why does React insist on this?" One-way data flow keeps updates predictable and easy to debug.  
**Learn more:** [Components and props](../../../01-basics/04-components-and-props.md)

### R1-BS-017 (Easy) Prop drilling
**Answer:** Prop drilling means passing props through many layers of components that do not use them, just to reach a deep child. You can avoid it with context, by composing components with `children`, or with a state library.  
**Why it matters / follow-up:** "When is drilling fine?" Two or three levels is normal and often the simplest choice.  
**Learn more:** [Components and props](../../../01-basics/04-components-and-props.md), [useContext](../../../02-hooks/05-usecontext.md)

### R1-BS-018 (Easy) The children prop
**Answer:** `children` holds whatever you put between a component's opening and closing tags: text, elements or other components. It lets a component act as a wrapper (a card, a layout) without knowing its content.  
**Why it matters / follow-up:** "Can `children` be a function?" Yes, that is the render props pattern.  
**Learn more:** [Components and props](../../../01-basics/04-components-and-props.md), [Component patterns](../../../03-intermediate/01-component-patterns.md)

### R1-BS-019 (Easy) Controlled vs uncontrolled
**Answer:** A controlled input gets its value from React state (`value` plus `onChange`), so React is the source of truth. An uncontrolled input keeps its value in the DOM, and you read it when needed with a ref or `FormData`.  
**Why it matters / follow-up:** "Which would you use for a very large form?" Often uncontrolled inputs or a form library, to avoid a re-render on every keystroke.  
**Learn more:** [Forms](../../../01-basics/07-forms.md)

### R1-BS-020 (Medium) Value without onChange
**Answer:** The field becomes read-only: typing does nothing because React keeps putting `name` back, and React logs a warning. Add `onChange` to make it controlled, use `defaultValue` for an uncontrolled field, or add `readOnly` if that is what you want.  
**Why it matters / follow-up:** "What if `value` starts as `undefined` and later becomes a string?" React warns about switching from uncontrolled to controlled.  
**Learn more:** [Forms](../../../01-basics/07-forms.md)

### R1-BS-021 (Easy) Lifting state up
**Answer:** When two components need the same data, you move the state to their closest common parent and pass it down as props, with callbacks for changes. This gives you one source of truth.  
**Why it matters / follow-up:** "When does lifting get awkward?" When the state has to travel through many levels; then consider context.  
**Learn more:** [Thinking in React](../../../01-basics/08-thinking-in-react.md)

### R1-BS-022 (Medium) State is a snapshot
**Answer:** It prints `0`, and the button then shows "Clicked 1". State is a snapshot: in this render `n` is always 0, and `setN` only schedules the next render with a new value.  
**Why it matters / follow-up:** "How do you use the new value right away?" Put it in a variable first: `const next = n + 1`.  
**Learn more:** [State and events](../../../01-basics/05-state-and-events.md), [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R1-BS-023 (Medium) Mutating state
**Answer:** No. You changed the same array and passed the same reference, so React sees no change and skips the re-render. Create a new array instead: `setItems([...items, 'new'])`.  
**Why it matters / follow-up:** The same rule applies to objects; copy them with spread.  
**Learn more:** [State and events](../../../01-basics/05-state-and-events.md), [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R1-BS-024 (Easy) What causes a re-render
**Answer:** Its own state changes (a state setter is called with a new value), its parent re-renders, or a context it reads changes value.  
**Why it matters / follow-up:** "Do changed props cause a render?" Props only change when the parent re-renders.  
**Learn more:** [How React renders](../../../04-advanced/01-how-react-renders.md), [State and events](../../../01-basics/05-state-and-events.md)

### R1-BS-025 (Medium) Parent re-render
**Answer:** True by default, even if their props did not change. You can skip it with `React.memo`, or by passing the child down as `children` from higher up, because that element object stays the same. A re-render is also not always a DOM update: React only changes the DOM if the output differs.  
**Why it matters / follow-up:** "Is a re-render expensive?" Usually it is cheap; measure before you optimise.  
**Learn more:** [How React renders](../../../04-advanced/01-how-react-renders.md), [Memoization](../../../02-hooks/07-memoization.md)

### R1-BS-026 (Easy) Pure components and side effects
**Answer:** A pure component returns the same JSX for the same props, state and context, and does nothing else while rendering. Side effects such as fetching data, changing the DOM directly, starting timers or writing to outside variables belong in event handlers or `useEffect`.  
**Why it matters / follow-up:** "How does StrictMode help?" In development it renders twice, which exposes impure code.  
**Learn more:** [Components and props](../../../01-basics/04-components-and-props.md), [How React renders](../../../04-advanced/01-how-react-renders.md)

## Hooks: state and rules

### R1-HK-001 (Easy) What is a hook?
**Answer:** A hook is a function whose name starts with `use` and that lets a function component use React features such as state, effects, context and refs. Examples are `useState`, `useEffect` and `useContext`; custom hooks combine them to share logic.  
**Why it matters / follow-up:** "Why were hooks added?" To reuse stateful logic without classes, HOCs or render props.  
**Learn more:** [Hooks overview and rules](../../../02-hooks/01-hooks-overview-and-rules.md)

### R1-HK-002 (Easy) Rules of hooks
**Answer:** Call hooks only at the top level of a component or custom hook (not in loops, conditions or nested functions), and only from React function components or other hooks. React remembers hook state by call order, so the order must be the same on every render.  
**Why it matters / follow-up:** The error "Rendered more hooks than during the previous render" usually means a hook sits inside a condition.  
**Learn more:** [Hooks overview and rules](../../../02-hooks/01-hooks-overview-and-rules.md)

### R1-HK-003 (Easy) Hook inside an if
**Answer:** False. Even a rare change shifts the call order, so React would match state to the wrong hook. Call the hook at the top every time, and put the condition around how you use its value.  
**Why it matters / follow-up:** The `use` API is the exception, it may be called conditionally.  
**Learn more:** [Hooks overview and rules](../../../02-hooks/01-hooks-overview-and-rules.md)

### R1-HK-004 (Easy) What useState returns
**Answer:** An array of two items: the current value and a setter function, usually written `const [count, setCount] = useState(0)`. The `0` is used only on the first render.  
**Why it matters / follow-up:** "Does the setter change the variable at once?" No, it schedules a re-render.  
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R1-HK-005 (Medium) Functional updates
**Answer:** `a` is 1 and `b` is 3. In the first handler `a` is 0 on all three lines (a snapshot), so each call sets the value to 1. An updater function receives the latest queued value each time, so it counts up three times.  
**Why it matters / follow-up:** Both handlers cause only one re-render, because React batches the updates.  
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R1-HK-006 (Medium) Lazy initial state
**Answer:** You pass a function to `useState`, like `useState(() => readFromStorage())`, and React calls it only on the first render. With `useState(readFromStorage())` the call runs on every render and the result is thrown away after the first.  
**Why it matters / follow-up:** Pass the function itself, not its result.  
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

## Hooks: effects and refs

### R1-HK-007 (Easy) What useEffect is for
**Answer:** It runs code after React has updated the screen, to synchronise the component with something outside React: a network request, a subscription, a timer, the page title, or a non-React widget. It is not for calculating values that you render.  
**Why it matters / follow-up:** "Event handler or effect?" If it happens because of a user action, use an event handler.  
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R1-HK-008 (Easy) Dependency array
**Answer:** With no array the effect runs after every render. With `[]` it runs after the first render only. With `[a, b]` it runs after the first render and again whenever `a` or `b` has changed.  
**Why it matters / follow-up:** "How are dependencies compared?" With `Object.is`, so objects and functions count as changed when they are new each render.  
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R1-HK-009 (Easy) Cleanup
**Answer:** Before the effect runs again (when dependencies changed) and when the component unmounts. Use it to undo what the effect did, such as clearing a timer, removing a listener or closing a connection.  
**Why it matters / follow-up:** With `[]` as dependencies, the cleanup runs only on unmount.  
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R1-HK-010 (Medium) Async effect
**Answer:** False. An async function returns a promise, but React expects the callback to return nothing or a cleanup function. Define an async function inside the effect and call it, or use a data-fetching library.  
**Why it matters / follow-up:** "How do you avoid a race condition when fetching?" Use an ignore flag or an `AbortController` in the cleanup.  
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R1-HK-011 (Medium) Effects run twice
**Answer:** In StrictMode, React mounts, unmounts and mounts the component again in development to check that your cleanup really undoes the effect. It does not happen in production. If the double run breaks something, the cleanup is missing or wrong.  
**Why it matters / follow-up:** Removing StrictMode is not the fix.  
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md), [How React renders](../../../04-advanced/01-how-react-renders.md)

### R1-HK-012 (Medium) Effect loop
**Answer:** There is no dependency array, so the effect runs after every render, sets state, causes a new render, and repeats. Add the right dependencies, or ask whether you need an effect at all (an event handler is often enough). An object or array created in render and listed as a dependency can loop for the same reason, because it is new on every render.  
**Why it matters / follow-up:** Fix object dependencies by depending on primitive values or by memoising the object.  
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md)

### R1-HK-013 (Medium) Silencing exhaustive-deps
**Answer:** The warning means the effect uses a value that is missing from its dependency list, so the effect may read stale values. Fix the cause instead: move the function inside the effect, use a functional state update, derive the value, or use `useEffectEvent` for logic that should not re-trigger the effect.  
**Why it matters / follow-up:** "Who wins, the linter or your intuition?" The linter almost always.  
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md), [Other hooks](../../../02-hooks/09-other-hooks.md)

### R1-HK-014 (Hard) Stale closure in an interval
**Answer:** It shows `1` and stays there. The effect ran once, so the callback closed over `n = 0` forever and keeps setting the state to 1. Use `setN(x => x + 1)`, which does not need `n`.  
**Why it matters / follow-up:** This is a stale closure, one of the most common hook bugs.  
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md), [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R1-HK-015 (Easy) Refs and re-rendering
**Answer:** No. A ref is a plain box that React keeps between renders, and writing to it does not notify React. Use state when the screen must change, and a ref for values that do not affect the output, such as timer ids, DOM nodes or the previous value.  
**Why it matters / follow-up:** Name the three common uses of `useRef`.  
**Learn more:** [useRef](../../../02-hooks/04-useref.md)

### R1-HK-016 (Medium) State, ref or variable
**Answer:** Use state for data shown on screen that changes over time. Use a ref for a value you must keep between renders that does not affect the output, or to reach a DOM element. A plain variable is reset on every render, so it is only for values computed from props and state.  
**Why it matters / follow-up:** "What about a variable outside the component?" It is shared by all instances, which is usually a bug.  
**Learn more:** [useRef](../../../02-hooks/04-useref.md), [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R1-HK-017 (Medium) useEffect vs useLayoutEffect
**Answer:** `useEffect` usually runs after the browser has painted, so it does not block the screen. `useLayoutEffect` runs after React updates the DOM but before the browser paints, so you can measure and adjust layout without a visible flicker. Use `useEffect` by default.  
**Why it matters / follow-up:** Layout effects do not run during server rendering.  
**Learn more:** [Other hooks](../../../02-hooks/09-other-hooks.md)

## Hooks: memoization, context and more

### R1-HK-018 (Easy) useMemo vs useCallback
**Answer:** `useMemo` caches a calculated value and `useCallback` caches a function. `useCallback(fn, deps)` is the same as `useMemo(() => fn, deps)`. Both only give you a stable reference until the dependencies change.  
**Why it matters / follow-up:** "When does a stable function matter?" When it goes to a memoised child or is a dependency of another hook.  
**Learn more:** [Memoization](../../../02-hooks/07-memoization.md)

### R1-HK-019 (Medium) memo that does not work
**Answer:** A prop is a new object, array or function on every render (such as `style={{ color: 'red' }}` or `onClick={() => ...}`), so the shallow comparison sees a change. JSX passed as `children` has the same effect. Stabilise the prop with `useMemo` or `useCallback`, or move it out of the component.  
**Why it matters / follow-up:** The React Compiler can add this memoisation for you.  
**Learn more:** [Memoization](../../../02-hooks/07-memoization.md)

### R1-HK-020 (Medium) When not to memoize
**Answer:** When the work is cheap or you have not measured a problem. Memoisation costs extra code, comparisons and memory, and can hide stale-value bugs. Profile first, fix the structure (for example move state down), and remember the React Compiler can add memoisation automatically.  
**Why it matters / follow-up:** "What is your first fix for a slow render?" Colocate state or split the component.  
**Learn more:** [Memoization](../../../02-hooks/07-memoization.md), [Performance optimization](../../../04-advanced/02-performance-optimization.md)

### R1-HK-021 (Medium) Context updates
**Answer:** Every component that reads that context re-renders, even if it only uses a small part of the value, and `React.memo` does not stop it. Keep the value stable (memoise objects), split large contexts into smaller ones, or use a store with selectors for fast-changing data.  
**Why it matters / follow-up:** The default value is used only when there is no Provider above.  
**Learn more:** [useContext](../../../02-hooks/05-usecontext.md)

### R1-HK-022 (Medium) useReducer vs useState
**Answer:** When state is an object with several fields that change together, or when many different actions update it. A reducer puts all update rules in one pure function, which is easy to read and test. For a single simple value, `useState` is enough.  
**Why it matters / follow-up:** Reducers must be pure and must not mutate the old state.  
**Learn more:** [useReducer](../../../02-hooks/06-usereducer.md)

### R1-HK-023 (Easy) Custom hooks and shared state
**Answer:** No. Each call gets its own state and effects, as if you had written the code inside each component. To share state, lift it up, use context, or use a store.  
**Why it matters / follow-up:** A custom hook shares logic, not data.  
**Learn more:** [Custom hooks](../../../02-hooks/08-custom-hooks.md)

### R1-HK-024 (Medium) useId
**Answer:** `useId` creates a unique, stable id string, useful for linking a `label` to an input (`htmlFor` and `id`) and for ARIA attributes. It gives the same value on the server and the client, so hydration matches. Do not use it for list keys; use your data's ids.  
**Why it matters / follow-up:** "Why not `Math.random()`?" It differs between server and client and causes a hydration mismatch.  
**Learn more:** [Other hooks](../../../02-hooks/09-other-hooks.md)

### R1-HK-025 (Hard) useTransition vs useDeferredValue
**Answer:** `useTransition` lets you mark a state update that you control as low priority (and gives you `isPending`), so urgent updates like typing stay responsive. `useDeferredValue` takes a value you do not control, such as a prop, and gives you a copy that lags behind and updates later in the background.  
**Why it matters / follow-up:** Both help keep input responsive (good INP).  
**Learn more:** [Other hooks](../../../02-hooks/09-other-hooks.md), [Concurrent React and Suspense](../../../04-advanced/03-concurrent-react-and-suspense.md)

## Advanced: rendering and performance

### R1-AD-001 (Medium) Trigger, render, commit
**Answer:** Trigger: a state update (or the first render) schedules work. Render: React calls your components to work out what the UI should be, with no DOM changes yet. Commit: React applies the needed changes to the DOM, then runs layout effects and effects.  
**Why it matters / follow-up:** "Why must rendering be pure?" React may call or repeat a render at any time.  
**Learn more:** [How React renders](../../../04-advanced/01-how-react-renders.md)

### R1-AD-002 (Hard) Component defined inside a component
**Answer:** Each render of `Page` creates a new `Panel` function, so React sees a different component type and unmounts and remounts it, which clears the typed text and any state. Define `Panel` at module level and pass data as props.  
**Why it matters / follow-up:** The same happens with components created inside render by a higher-order component.  
**Learn more:** [How React renders](../../../04-advanced/01-how-react-renders.md)

### R1-AD-003 (Medium) Keeping and resetting state
**Answer:** State is kept while the same component type stays at the same position in the tree. It resets if the type or position changes, or if the `key` changes. Changing the `key` is the standard way to reset a form, for example when the selected user changes.  
**Why it matters / follow-up:** A `key` works on any component, not only list items.  
**Learn more:** [How React renders](../../../04-advanced/01-how-react-renders.md), [useState in depth](../../../02-hooks/02-usestate-in-depth.md)

### R1-AD-004 (Easy) Finding slow renders
**Answer:** Use the React DevTools Profiler to record an interaction and see which components rendered and how long they took, and turn on "highlight updates" to see renders on screen. Measure first, then fix, and judge speed in a production build because development builds are slower.  
**Why it matters / follow-up:** "What is your first fix?" Move state closer to where it is used.  
**Learn more:** [Performance optimization](../../../04-advanced/02-performance-optimization.md)

### R1-AD-005 (Medium) Code splitting
**Answer:** `lazy(() => import('./Page'))` loads a component's code only when it is first rendered, and `Suspense` shows a fallback while it loads. The usual split points are routes and big, rarely used pieces such as modals or charts, which makes the first bundle smaller.  
**Why it matters / follow-up:** Wrap it in an error boundary in case the chunk fails to load.  
**Learn more:** [Performance optimization](../../../04-advanced/02-performance-optimization.md), [Error boundaries, portals and friends](../../../03-intermediate/05-error-boundaries-portals-and-friends.md)

### R1-AD-006 (Easy) Virtualization
**Answer:** It renders only the rows visible in the viewport (plus a few extra) instead of thousands of DOM nodes. You need it for very long lists or tables, and libraries such as TanStack Virtual and react-window do the hard parts.  
**Why it matters / follow-up:** Trade-offs are find-in-page and some accessibility behaviour.  
**Learn more:** [Performance optimization](../../../04-advanced/02-performance-optimization.md)

### R1-AD-007 (Medium) Core Web Vitals
**Answer:** LCP (Largest Contentful Paint) is how fast the main content appears, INP (Interaction to Next Paint) is how quickly the page responds to input, and CLS (Cumulative Layout Shift) is how much the layout jumps around. INP replaced FID in 2024.  
**Why it matters / follow-up:** React levers: code splitting for LCP, transitions for INP, reserved image sizes for CLS.  
**Learn more:** [Performance optimization](../../../04-advanced/02-performance-optimization.md)

## Advanced: ecosystem, state, routing and forms

### R1-AD-008 (Easy) Starting a new app
**Answer:** Create React App was sunset in February 2025, so do not use it. Use a framework such as Next.js (or React Router in framework mode), or Vite for a client-only single-page app.  
**Why it matters / follow-up:** "Why a framework?" It gives routing, data loading and server rendering out of the box.  
**Learn more:** [What is React](../../../01-basics/02-what-is-react.md), Tooling: Vite, ESLint, build (planned)

### R1-AD-009 (Medium) Kinds of state
**Answer:** Local UI state uses `useState` or `useReducer`. Shared client state uses context for slow-changing values or a store such as Redux Toolkit or Zustand for busy state. Server data uses a cache library like TanStack Query, and URL state (filters, page) lives in the router's params and search params.  
**Why it matters / follow-up:** "Why not put everything in Redux?" Server data and URL state have better dedicated tools.  
**Learn more:** [State management](../../../03-intermediate/06-state-management.md)

### R1-AD-010 (Medium) TanStack Query vs effects
**Answer:** It handles caching, request de-duplication, loading and error states, refetching, retries and cache invalidation for you. With effects you must write all of that by hand, plus race-condition handling.  
**Why it matters / follow-up:** Be ready to explain "stale-while-revalidate".  
**Learn more:** [Data fetching](../../../03-intermediate/02-data-fetching.md)

### R1-AD-011 (Easy) Client-side routing
**Answer:** The router intercepts link clicks, uses the browser History API (`pushState`) to change the URL, and renders the component for the new route. The browser does not request a new HTML page from the server.  
**Why it matters / follow-up:** On a hard refresh the server must still return the app's `index.html` for every route.  
**Learn more:** [React Router](../../../03-intermediate/03-react-router.md)

### R1-AD-012 (Easy) Protected routes
**Answer:** Wrap the route in a component that checks the auth state and either renders the page or redirects to the login page, for example with the router's `Navigate`. This only hides the UI: the server must still check permissions on every API call.  
**Why it matters / follow-up:** "What about returning to the page after login?" Remember the original location and redirect back.  
**Learn more:** [React Router](../../../03-intermediate/03-react-router.md)

### R1-AD-013 (Easy) Client and server validation
**Answer:** Both. Client validation gives quick feedback to the user, while server validation is required for security because anyone can bypass the browser. Show each error next to its field, and validate on blur or on submit.  
**Why it matters / follow-up:** Forms libraries such as React Hook Form with a Zod schema can share rules.  
**Learn more:** [Forms](../../../01-basics/07-forms.md), [Forms with libraries](../../../03-intermediate/04-forms-with-libraries.md)

## Advanced: testing and TypeScript

### R1-AD-014 (Easy) Testing Library idea
**Answer:** Test what the user sees and does, not internals such as state or component names. Prefer queries by accessible role, like `getByRole('button', { name: 'Save' })`, then by label text, and use test ids only as a last resort.  
**Why it matters / follow-up:** Role queries also catch accessibility problems.  
**Learn more:** [Testing React](../../../04-advanced/08-testing-react.md)

### R1-AD-015 (Medium) getBy, queryBy, findBy
**Answer:** `getBy` throws if the element is missing, so use it when the element must exist. `queryBy` returns `null` if it is missing, so use it to assert that something is absent. `findBy` returns a promise that waits (up to a timeout) for the element to appear, for async UI.  
**Why it matters / follow-up:** When do you use `waitFor`? For assertions that are not a simple element appearing.  
**Learn more:** [Testing React](../../../04-advanced/08-testing-react.md)

### R1-AD-016 (Easy) Typing props
**Answer:** Define an `interface` or `type` for the props and annotate the destructured parameter, for example `function Button({ label, onClick }: ButtonProps)`. Use `React.ReactNode` for `children` and `?` for optional props.  
**Why it matters / follow-up:** `React.ComponentProps<'button'>` extends the native button props.  
**Learn more:** [TypeScript with React](../../../03-intermediate/08-typescript-with-react.md)

### R1-AD-017 (Medium) Typing events and refs
**Answer:** Use `React.ChangeEvent<HTMLInputElement>`, for example `(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)`. For a ref, write `useRef<HTMLInputElement>(null)`; in React 19 types `useRef` needs an argument, and `current` is `null` until the element mounts.  
**Why it matters / follow-up:** "Why is `current` possibly null?" The ref is empty before mount and after unmount.  
**Learn more:** [TypeScript with React](../../../03-intermediate/08-typescript-with-react.md)

## Advanced: SSR, Server Components and React 19

### R1-AD-018 (Medium) CSR, SSR and SSG
**Answer:** CSR (client-side rendering): the browser downloads JavaScript and builds the page, starting from almost empty HTML. SSR (server-side rendering): the server renders HTML for each request. SSG (static site generation): the HTML is built once at build time and served as static files. SSR and SSG show content sooner and help SEO; CSR is the simplest to host.  
**Why it matters / follow-up:** "What is ISR?" Static pages that are regenerated in the background after a set time.  
**Learn more:** [SSR and Server Components](../../../04-advanced/05-ssr-and-server-components.md)

### R1-AD-019 (Hard) Hydration mismatch
**Answer:** Hydration is when React attaches event handlers to HTML that the server made. A mismatch means the first client render produced different output than the server HTML, usually because of `Date.now()`, `Math.random()`, `window` or `localStorage` checks during render, or invalid HTML nesting. Render the same on both sides and move browser-only values into an effect.  
**Why it matters / follow-up:** `useId` exists to give matching ids on both sides.  
**Learn more:** [SSR and Server Components](../../../04-advanced/05-ssr-and-server-components.md)

### R1-AD-020 (Hard) Server Component vs SSR
**Answer:** A Server Component runs only on the server, sends its result to the browser, adds no code to the client bundle, and cannot use state, effects or browser APIs. SSR is different: it renders Client Components to HTML on the server, and they then run in the browser as well. `"use client"` marks a module boundary: that file and what it imports become client code, which does not mean it runs only in the browser.  
**Why it matters / follow-up:** "Can a Client Component import a Server Component?" Not directly; pass it in as `children` or a prop.  
**Learn more:** [SSR and Server Components](../../../04-advanced/05-ssr-and-server-components.md)

### R1-AD-021 (Medium) React 19 headline features
**Answer:** Actions (functions for form submits and mutations with built-in pending and error handling), the hooks `useActionState`, `useFormStatus`, `useOptimistic` and `use`, `ref` as a normal prop, `<Context>` used directly as a provider, built-in support for document metadata tags, and stable Server Components.  
**Why it matters / follow-up:** "What was removed?" For example `propTypes` and `defaultProps` on function components, and `ReactDOM.render`.  
**Learn more:** [React 19 and newer](../../../04-advanced/04-react-19-and-newer.md)

### R1-AD-022 (Easy) Ref prop and context provider in 19
**Answer:** `ref` is now a normal prop for function components, so `forwardRef` is no longer needed (it still works). For context, write `<ThemeContext value={theme}>` instead of `<ThemeContext.Provider value={theme}>`.  
**Why it matters / follow-up:** The old `.Provider` form still works but is considered legacy.  
**Learn more:** [React 19 and newer](../../../04-advanced/04-react-19-and-newer.md), [useRef](../../../02-hooks/04-useref.md)

### R1-AD-023 (Hard) The use API
**Answer:** `use(promise)` reads the promise's result and suspends the component until it settles (a rejection goes to the nearest error boundary), and `use(context)` reads a context. Unlike other hooks it may be called inside conditions and loops. The promise must be stable across renders, for example from a Server Component or a data library, not created inside the Client Component's render.  
**Why it matters / follow-up:** "What goes wrong with a new promise on every render?" The component suspends forever in a render loop.  
**Learn more:** [React 19 and newer](../../../04-advanced/04-react-19-and-newer.md), [Concurrent React and Suspense](../../../04-advanced/03-concurrent-react-and-suspense.md)

### R1-AD-024 (Hard) useOptimistic on failure
**Answer:** `useOptimistic` shows a temporary value while an Action (such as a form submit) is running. When the Action ends, whether it succeeded or failed, the UI goes back to the real value, so a failed request rolls the optimistic change back automatically. Call its setter inside an Action or a transition.  
**Why it matters / follow-up:** Show an error message too, so the user knows why the item disappeared.  
**Learn more:** [React 19 and newer](../../../04-advanced/04-react-19-and-newer.md)

## Advanced: accessibility and security

### R1-AD-025 (Easy) Semantic HTML before ARIA
**Answer:** Native elements like `button`, `a`, `label` and `nav` give you keyboard support, focus and screen reader meaning for free. ARIA only changes what assistive technology announces, never the behaviour, so a `div role="button"` still needs keyboard handling that you must write yourself.  
**Why it matters / follow-up:** The first rule of ARIA is to not use ARIA when a native element does the job.  
**Learn more:** [Accessibility](../../../04-advanced/09-accessibility.md)

### R1-AD-026 (Medium) Accessible modal
**Answer:** Move focus into the dialog when it opens, keep Tab inside it (a focus trap), close on Escape, and return focus to the element that opened it. It also needs `role="dialog"` (or the native `<dialog>` element) with an accessible name, for example through `aria-labelledby`.  
**Why it matters / follow-up:** A portal is a common way to render the modal at the end of `body`.  
**Learn more:** [Accessibility](../../../04-advanced/09-accessibility.md), [Error boundaries, portals and friends](../../../03-intermediate/05-error-boundaries-portals-and-friends.md)

### R1-AD-027 (Easy) XSS and React
**Answer:** React escapes values you put in JSX, so user text is not run as HTML. The risky API is `dangerouslySetInnerHTML`, which inserts raw HTML, so sanitise the HTML with a library such as DOMPurify first. User-controlled URLs, like a `javascript:` link in `href`, are another risk.  
**Why it matters / follow-up:** A Content Security Policy (CSP) is a second layer of defence.  
**Learn more:** [Security and i18n](../../../04-advanced/10-security-and-i18n.md)

### R1-AD-028 (Medium) Where to store tokens
**Answer:** JavaScript can read localStorage, so an XSS attack can steal a token stored there. An `HttpOnly` cookie cannot be read by JavaScript, which is safer against theft, but then you need protection against CSRF, for example `SameSite` cookies. Neither choice removes the need to prevent XSS.  
**Why it matters / follow-up:** "What does CSRF mean?" A malicious site makes the browser send your logged-in cookie to another site.  
**Learn more:** [Security and i18n](../../../04-advanced/10-security-and-i18n.md), APIs, HTTP and auth for frontend (planned)

### R1-AD-029 (Hard) Server Actions are public endpoints
**Answer:** Server functions are exposed as public HTTP endpoints, so anyone can call them directly with any data, not only through your form. Validate the input and check authorisation inside every action, as you would in an API route, and never trust the client.  
**Why it matters / follow-up:** Hiding a button in the UI is not security.  
**Learn more:** [SSR and Server Components](../../../04-advanced/05-ssr-and-server-components.md), [Security and i18n](../../../04-advanced/10-security-and-i18n.md)

## JavaScript and CSS quick checks

### R1-JS-001 (Easy) typeof null
**Answer:** It prints `"object"`. This is an old bug in JavaScript that cannot be fixed without breaking the web. To test for null, use `value === null`.  
**Why it matters / follow-up:** `typeof undefined` is `"undefined"`, and `typeof NaN` is `"number"`.  
**Learn more:** [JavaScript deep dive for interviews](../../../01-basics/10-javascript-deep-dive-for-interviews.md)

### R1-JS-002 (Easy) Floating point
**Answer:** It prints `false`, because `0.1 + 0.2` is `0.30000000000000004`. Numbers use binary floating point, so compare with a small tolerance or work in whole units such as cents.  
**Why it matters / follow-up:** The same applies in any language that uses IEEE 754 numbers.  
**Learn more:** [JavaScript deep dive for interviews](../../../01-basics/10-javascript-deep-dive-for-interviews.md)

### R1-JS-003 (Easy) Loose vs strict equality
**Answer:** It prints `true false true`. `==` converts types before comparing, while `===` compares type and value. Prefer `===`.  
**Why it matters / follow-up:** `null == undefined` is true but `null === undefined` is false.  
**Learn more:** [JavaScript deep dive for interviews](../../../01-basics/10-javascript-deep-dive-for-interviews.md)

### R1-JS-004 (Medium) var in a loop
**Answer:** It prints `3`, `3`, `3`. All three callbacks share one `var i`, and the loop has finished (so `i` is 3) before any timer runs. With `let i`, each iteration gets its own copy and it prints `0`, `1`, `2`.  
**Why it matters / follow-up:** This is a closure question; the callbacks close over the variable, not its value at that moment.  
**Learn more:** [JavaScript deep dive for interviews](../../../01-basics/10-javascript-deep-dive-for-interviews.md), [JavaScript for React](../../../01-basics/01-javascript-for-react.md)

### R1-JS-005 (Medium) Event loop order
**Answer:** It prints `A`, `D`, `C`, `B`. Synchronous code runs first (A, D), then microtasks such as promise callbacks (C), then macrotasks such as timers (B).  
**Why it matters / follow-up:** `await` continues as a microtask too.  
**Learn more:** [JavaScript deep dive for interviews](../../../01-basics/10-javascript-deep-dive-for-interviews.md)

### R1-JS-006 (Easy) map vs forEach
**Answer:** `forEach` returns `undefined`, so you cannot use its result in JSX. `map` returns a new array with the result of each call, so use `map` (with a `key` on each element).  
**Why it matters / follow-up:** `map` does not change the original array.  
**Learn more:** [JavaScript for React](../../../01-basics/01-javascript-for-react.md), [Conditional rendering and lists](../../../01-basics/06-conditional-rendering-and-lists.md)

### R1-JS-007 (Easy) Arrays are references
**Answer:** It prints `4`. Arrays and objects are assigned by reference, so `a` and `b` point to the same array. To copy it, use `[...a]`, which is why React state updates use copies.  
**Why it matters / follow-up:** Spread makes a shallow copy; nested objects are still shared.  
**Learn more:** [JavaScript for React](../../../01-basics/01-javascript-for-react.md), [JavaScript deep dive for interviews](../../../01-basics/10-javascript-deep-dive-for-interviews.md)

### R1-JS-008 (Medium) Closures
**Answer:** A closure is a function that remembers the variables from the place where it was created. In React each render creates new handlers that close over that render's props and state, which is why a timer started in one render can later see old values (a stale closure).  
**Why it matters / follow-up:** Be ready to show a counter built with a closure.  
**Learn more:** [JavaScript deep dive for interviews](../../../01-basics/10-javascript-deep-dive-for-interviews.md), [useEffect](../../../02-hooks/03-useeffect.md)

### R1-JS-009 (Easy) CSS box model
**Answer:** With the default `content-box` it is 250px (200 + 20 + 20 + 5 + 5). With `border-box` the width includes padding and border, so the box stays 200px wide. Many projects set `border-box` for every element.  
**Why it matters / follow-up:** "What is the order from the inside out?" Content, padding, border, margin.  
**Learn more:** HTML, CSS and browser basics (planned)

### R1-JS-010 (Easy) Centering with flexbox
**Answer:** On the parent, set `display: flex; justify-content: center; align-items: center;`, and give the parent a height. CSS grid can do it with `display: grid; place-items: center;`.  
**Why it matters / follow-up:** `justify-content` works on the main axis, `align-items` on the cross axis.  
**Learn more:** HTML, CSS and browser basics (planned)
