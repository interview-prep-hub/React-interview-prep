# Concurrent React and Suspense

> **Level:** Advanced   **Time:** about 65 minutes   **Read first:** [How React renders](01-how-react-renders.md), [Other hooks](../02-hooks/09-other-hooks.md), [Performance optimization](02-performance-optimization.md)

## What you will learn
- Explain what "concurrent rendering" means (and what it does not mean) and why `createRoot` is required.
- Split updates into urgent and non-urgent, and keep typing smooth with `useTransition` and `useDeferredValue`.
- Choose between `useTransition`, `useDeferredValue` and debounce, and name what transitions cannot do.
- Use `Suspense` with `lazy` and `use()`, pair it with error boundaries, and avoid waterfalls.
- Describe streaming SSR, `Activity`, `ViewTransition`, tearing and `useSyncExternalStore` in an interview.
- Read an ASCII timeline of a transition, and answer the standard concurrent-React questions.

## 1. What "concurrent" means
Before React 18, a render was one block. Once React started rendering, it ran to the end. If the render took 400 ms, the page froze for 400 ms: no typing, no clicking.

Concurrent rendering changes one thing: **a render can be interrupted, paused, resumed or thrown away**. React works in small slices and checks if something more important needs attention.

What it is **not**:
- It is not threads. JavaScript still runs on one main thread. React just takes turns.
- It is not automatic speed. The total work is the same, sometimes more. You gain responsiveness, not speed.
- It is not a mode you switch on. It is a set of tools (transitions, deferred values, Suspense) that you opt into.

Analogy: a cook who stops stirring the big pot to answer the door, then comes back. The soup is not cooked faster, but guests are never left outside.

**Why `createRoot` is required.** Concurrent features only work on a root made with `createRoot` (or `hydrateRoot` on the server-rendered path). The old `ReactDOM.render` made a "legacy root" without them, and it was removed in React 19 (it is `undefined` now).

```jsx
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);
```

**What happens, step by step:**
1. `createRoot` creates a root that can schedule work by priority.
2. `render(<App />)` hands the tree to React. It decides when and in how many slices to render it.
3. Plain updates (like a click) still feel instant. Only updates you mark as non-urgent are rendered in an interruptible way.

**Common mistake:** thinking "React 18+ is concurrent, so my slow list is now fast".

```jsx
// Wrong idea: nothing here is marked as low priority, so it blocks as before
setQuery(value); // renders the slow list as an urgent update

// Right: say what is allowed to wait
startTransition(() => setQuery(value));
```
Why: React cannot guess which update is allowed to wait. You tell it.

## 2. Urgent and non-urgent updates
React gives every update a priority. In plain words:
- **Urgent:** the user expects an instant reaction. Typing in an input, clicking, pressing a key.
- **Continuous:** scrolling, hovering, dragging. Smooth, but a tiny delay is fine.
- **Default:** `setState` from a timer or a network callback.
- **Transition (non-urgent):** "the screen may catch up a moment later". Switching tabs, filtering a big list, navigating.

React calls these priority levels **lanes** (more in React internals (planned)). The rule you need for interviews: a more urgent update can **interrupt** a lower one, and a transition never blocks input.

```jsx
function handleChange(e) {
  setText(e.target.value);              // urgent: the input must follow the finger
  startTransition(() => {
    setQuery(e.target.value);           // non-urgent: the heavy list can lag a little
  });
}
```

**What happens, step by step:**
1. The change event is a discrete (instant) event, so `setText` is rendered at once.
2. `setQuery` is inside `startTransition`, so it gets a low priority.
3. React renders the input first, then renders the list in slices. If you type again, it stops the list render and handles the keystroke first.

**Common mistake:** putting the input's own state in the transition.

```jsx
// Wrong: the input value is now a low-priority update
startTransition(() => setText(e.target.value));

// Right: controlled input state stays urgent, only the derived heavy part is a transition
setText(e.target.value);
startTransition(() => setQuery(e.target.value));
```
Why: the browser expects the input to update inside the change event. React's docs say a transition cannot control a text input.

## 3. useTransition
`useTransition()` returns `[isPending, startTransition]`. You wrap a state update in `startTransition` to mark it non-urgent. `isPending` is `true` while that transition is still working.

Here is the classic example: a text box that filters a slow list. The busy loop only **pretends** to be slow; never write that in real code.

```jsx
import { memo, useState, useTransition } from 'react';

const ALL = Array.from({ length: 400 }, (_, i) => `Item ${i + 1}`);

function SlowRow({ text }) {
  const end = performance.now() + 1; // simulate 1 ms of work per row
  while (performance.now() < end) {}
  return <li>{text}</li>;
}

const FilteredList = memo(function FilteredList({ query }) {
  const rows = ALL.filter((item) => item.toLowerCase().includes(query.toLowerCase()));
  return (
    <ul>
      {rows.map((item) => (
        <SlowRow key={item} text={item} />
      ))}
    </ul>
  );
});

export default function Search() {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    const value = e.target.value;
    setText(value);
    startTransition(() => {
      setQuery(value);
    });
  }

  return (
    <div>
      <input aria-label="Search" value={text} onChange={handleChange} />
      {isPending && <p>Updating list...</p>}
      <FilteredList query={query} />
    </div>
  );
}
```

**What happens, step by step** (I ran a version of this and logged every render of `Search` after typing `Item 4` in one change event):
1. Render 1: `text=Item 4 query= pending=true`. The input shows the new text and `isPending` is `true`. The list still shows the old query.
2. React renders the list for the new query in the background, in slices.
3. Render 2: `text=Item 4 query=Item 4 pending=false`. The new list is committed and `isPending` flips back.
4. If you press another key during step 2, React pauses the list work, updates the input first, then restarts the list work.

Why `memo`? The urgent render (step 1) re-renders `Search`. Without `memo`, `FilteredList` would re-render too, with the old query, and the slow rows would block the input again. See [Memoization](../02-hooks/07-memoization.md).

**Async transitions (React 19).** You can pass an `async` function. `isPending` stays `true` for the whole function, across every `await` (observed `false, true, false`).

```jsx
function SaveButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  function handleClick() {
    startTransition(async () => {
      await new Promise((r) => setTimeout(r, 800)); // pretend to call a server
      startTransition(() => setMessage('Saved'));    // wrap the update after await again
    });
  }

  return (
    <button onClick={handleClick} disabled={isPending}>
      {isPending ? 'Saving...' : message || 'Save'}
    </button>
  );
}
```

**Common mistake:** a state update after `await` is **not** marked as a transition automatically.

```jsx
// Wrong: runs as a normal urgent update
startTransition(async () => {
  await save();
  setMessage('Saved');
});

// Right: wrap it again
startTransition(async () => {
  await save();
  startTransition(() => setMessage('Saved'));
});
```
Why: React loses the transition context when the function pauses at `await` (a documented limitation).

You can also import `startTransition` directly from `react` when you do not need `isPending` (for example, in code outside a component). Form `action`s and `useActionState` use the same async-transition machinery, see [React 19 and newer](04-react-19-and-newer.md).

## 4. What transitions cannot do
- **They do not make slow code fast.** The list still costs 400 ms of work. A transition only moves it out of the way of typing. To really cut the cost, see [Performance optimization](02-performance-optimization.md) (virtualization, memoization, less work).
- **They do not cover controlled inputs.** Keep the text state urgent (section 2).
- **They cannot "wait" for a `fetch` in an effect or handler.** A transition only waits for things that suspend (`use`, `lazy`, framework data). Section 6 shows how.
- **They cannot be used to run code later.** The function you pass runs immediately and synchronously. Only the state updates it makes are low priority.
- **Updates after `await` are not transitions** (section 3).

If rendering is fast, a transition adds nothing. Measure first.

## 5. useDeferredValue
Sometimes you do not own the `setState`, for example when the value arrives as a prop. `useDeferredValue(value)` gives you a **lagging copy** of a value. It returns the old value first, then React re-renders in the background with the new one.

```jsx
import { memo, useDeferredValue, useState } from 'react';

// FilteredList is the memo component from section 3

export default function SearchDeferred() {
  const [text, setText] = useState('');
  const deferredText = useDeferredValue(text);
  const isStale = text !== deferredText;

  return (
    <div>
      <input aria-label="Search" value={text} onChange={(e) => setText(e.target.value)} />
      <div style={{ opacity: isStale ? 0.5 : 1 }}>
        <FilteredList query={deferredText} />
      </div>
    </div>
  );
}
```

**What happens, step by step** (observed render log after typing `a`):
1. Render 1: `text=a deferred=` . The input is current, the list still gets the old value, so it is skipped by `memo`.
2. React schedules a low-priority render with the new value.
3. Render 2: `text=a deferred=a`. The list updates. If you type again meanwhile, the background render is abandoned and restarted.
4. `isStale` is `true` between steps 1 and 3, so you can dim the list.

**Initial value.** `useDeferredValue(value, initialValue)` returns `initialValue` on the very first render, then re-renders with `value`. I observed `useDeferredValue('final', 'initial')` render `initial` then `final`. It is useful to show a cheap first paint.

**Debounce versus deferred value.**
- Debounce waits a fixed time (say 300 ms) after the last keystroke. It always adds delay, even on a fast laptop, and the work is not interruptible once it starts.
- A deferred value has no fixed delay. It starts at once, adapts to the device, and can be interrupted.
- But `useDeferredValue` does **not** reduce network calls. If each new value triggers a `fetch`, you still want debounce (see [Custom hooks](../02-hooks/08-custom-hooks.md)). Use them together if needed.

**Choosing:** transition when you own the `setState` and want `isPending`; deferred value when you only have the value. Inside a transition, `useDeferredValue` returns the new value straight away.

**Common mistake:** deferring a value but passing a fresh object each render.

```jsx
// Wrong: a new object every render, so deferred value always differs and memo never helps
const deferred = useDeferredValue({ query: text });

// Right: defer a primitive (or a stable value)
const deferredQuery = useDeferredValue(text);
```
Why: React compares with `Object.is`; a new object is never equal, so React keeps re-rendering in the background.

## 6. Suspense: boundaries and fallbacks
Suspense lets a component say "I am not ready yet" and lets a parent decide what to show meanwhile.

- A **boundary** is a `<Suspense>` element.
- The **fallback** is what it shows (a spinner, a skeleton) while something inside is not ready.
- A component **suspends** when it calls `use(promise)` on a pending promise, or renders a `lazy` component whose code has not loaded.

```jsx
import { Suspense } from 'react';

<Suspense fallback={<p>Loading comments...</p>}>
  <Comments />
</Suspense>
```

**What happens, step by step:**
1. `Comments` suspends. React stops rendering it.
2. React finds the nearest `Suspense` above it and shows the fallback instead of the boundary's children.
3. When the promise settles, React retries the render of that part.
4. The fallback is replaced by the real content.

**Nesting and reveal order.** The nearest boundary above the suspended component wins. I ran both shapes with a promise that never settles:

```jsx
// A: one boundary around both. Output: "Loading page". Header is NOT shown.
<Suspense fallback={<p>Loading page</p>}>
  <h1>Header</h1>
  <Slow />
</Suspense>

// B: a boundary around the slow part only. Output: "Header" + "Loading comments".
<div>
  <h1>Header</h1>
  <Suspense fallback={<p>Loading comments</p>}>
    <Slow />
  </Suspense>
</div>
```
So place boundaries around **meaningful loading units**. One boundary for the whole page gives a blank page spinner. Too many tiny ones make content pop in one piece at a time. Siblings in one boundary appear together.

Reveal timing: React throttles reveals so content does not appear within about 300 ms of the last fallback. With a promise that resolved after 40 ms, the content became visible after roughly 320 to 350 ms. This avoids flicker. It also means tests need `findBy*` (waiting), not `getBy*`.

**Common mistake:** expecting Suspense to catch loading from an effect.

```jsx
// Wrong: fetching in an effect never triggers the boundary
useEffect(() => { fetch(url).then(setData); }, []);

// Right: use a Suspense-aware source
const data = use(fetchData(url)); // promise comes from a cache (section 7)
```
Why: Suspense only reacts to `use`, `lazy` and Suspense-aware frameworks and libraries.

## 7. Suspense for code and data
**Code: `lazy`.** The component's code is downloaded the first time it renders.

```jsx
import { lazy, Suspense } from 'react';

const Chart = lazy(() => import('./Chart.jsx')); // Chart.jsx must have a default export

export default function Dashboard() {
  return (
    <Suspense fallback={<p>Loading chart...</p>}>
      <Chart />
    </Suspense>
  );
}
```
Splitting strategy is covered in [Performance optimization](02-performance-optimization.md).

**Data: `use()` with a cached promise.** `use(promise)` reads the value of a promise during render. If it is pending, the component suspends.

```jsx
// api.js: a tiny cache so the SAME promise is returned for the same id
const cache = new Map();

export function fetchUser(id) {
  if (!cache.has(id)) {
    cache.set(
      id,
      fetch(`/api/users/${id}`).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
    );
  }
  return cache.get(id);
}
```

```jsx
import { Suspense, use } from 'react';
import { fetchUser } from './api.js';

function Profile({ id }) {
  const user = use(fetchUser(id));
  return <h2>{user.name}</h2>;
}

export default function App() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Profile id={1} />
    </Suspense>
  );
}
```

**What happens, step by step:**
1. First render: `fetchUser(1)` creates the promise and caches it. `use` sees it pending and suspends. The fallback shows.
2. The promise resolves. React retries `Profile`.
3. `fetchUser(1)` returns the **same** promise (from the cache), now resolved. `use` returns the value and `Profile` renders.

**Why the cache matters.** If you write `use(fetch(...))` directly in render, every retry creates a brand-new promise, and the component never finishes. I tried a promise created in render: with one that settles later, the tree stayed on the fallback and the component re-rendered about 9 times in 250 ms; with an already-settled one, React logged "A component was suspended by an uncached promise" and rendered 3 times.

This hand-made `Map` is for learning: it has no expiry, no retry and a rejected promise stays cached. In real apps use a library or framework that does this for you (TanStack Query's `useSuspenseQuery`, router loaders, Next.js and Server Components). See [Data fetching](../03-intermediate/02-data-fetching.md).

Two more facts about `use`: it can be called inside `if` and loops (unlike hooks), and it must **not** be wrapped in `try/catch` (React uses a special internal throw to suspend).

**Common mistake:** creating the promise in the component.

```jsx
// Wrong: new promise on every render, endless fallback
const user = use(fetch(`/api/users/${id}`).then((r) => r.json()));

// Right: the promise comes from a cache, a loader, a parent that created it once, or a Server Component
const user = use(fetchUser(id));
```
Why: React needs the same promise object across retries to know when it has settled.

## 8. Error boundaries, waterfalls and keeping content visible
**Loading and failing are two different states.** Suspense handles loading. An **error boundary** handles failure. A rejected promise passed to `use` is thrown to the nearest error boundary.

```jsx
import { Component, Suspense } from 'react';

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) return <p>Something failed: {this.state.error.message}</p>;
    return this.props.children;
  }
}

export default function Page() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<p>Loading...</p>}>
        <Profile id={1} />
      </Suspense>
    </ErrorBoundary>
  );
}
```
I ran a rejected promise through this shape and the page showed `Something failed: Network down`. Put the error boundary **outside** the Suspense so the error replaces the whole area. Without any error boundary, the whole root unmounts. Boundaries are still written as classes today; the docs point to the `react-error-boundary` package for a function-friendly wrapper. More in [Error boundaries](../03-intermediate/05-error-boundaries-portals-and-friends.md). Remember: a cached rejected promise stays rejected, so a "Retry" button must also clear that cache entry.

**Waterfalls.** A waterfall is when requests run one after another that could run together. With `use`, a child's fetch only starts when the child renders, and that only happens after the parent stops suspending. I logged the calls:

```jsx
function Parent() {
  const a = use(getA());          // suspends first
  return <Child a={a} />;
}
function Child() {
  const b = use(getB());          // getB() is only CALLED after A finished
  return <p>{b}</p>;
}
```
Log after the first render: `["A"]`. After A resolved: `["A","B"]`. The parallel version starts both before reading either:

```jsx
function Parent() {
  const a = getA();               // start both requests first
  const b = getB();
  return <p>{use(a)} {use(b)}</p>;
}
```
Log after the first render: `["A","B"]`. Better still: start requests outside the render path (a route loader, an event handler, or a Server Component) and pass the promises down.

**Keeping visible content during a transition.** Once content has been revealed, you usually do not want a spinner to replace it when you go to the next item. A transition gives that. I ran the same tab switch both ways (new id, data takes 50 ms):

```text
setId(id + 1)                        startTransition(() => setId(id + 1))
-------------------------------      -------------------------------------
click                                click
  -> old "User 1" hidden               -> "User 1" stays on screen
  -> "Loading..." shown                -> isPending is true ("Pending")
data arrives                         data arrives
  -> "User 2"                          -> "User 2" replaces "User 1"
```
With a plain `setId`, React hides the old nodes (`display: none`) and shows the fallback. In a transition, the old content stays and `isPending` tells you something is happening. This only protects **already revealed** content. The very first load still shows the fallback. `useDeferredValue` behaves the same way with Suspense.

An experimental `SuspenseList` exists only in the experimental channel, not in stable React 19.3.

## 9. Streaming SSR and selective hydration (short)
On the server, Suspense boundaries let React send the page in pieces. The user gets the shell (layout plus fallbacks) at once, and each slow part streams in later as HTML when its data is ready. This is **streaming SSR**.

On the client, React hydrates (attaches event handling to) each boundary **separately**. That is **selective hydration**: the boundary you interact with is hydrated first, and a slow boundary does not block the rest. In server HTML, boundaries are marked with comment nodes such as `<!--$-->` and `<!--/$-->`.

Two facts worth knowing:
- React 19.2 batches streamed reveals for a short time, so more content appears together, and stops batching as load time nears 2.5 s.
- In an experiment, a click on a boundary that was still waiting for its lazy chunk was dropped, not replayed (only "continuous" events such as hover or focus are queued). Do not assume every early click is replayed.

Full story in [SSR and Server Components](05-ssr-and-server-components.md).

## 10. Activity and ViewTransition
Both are stable in React 19.3.x (`Activity` since 19.2, `ViewTransition` since 19.3). Do not call them experimental.

**`<Activity>`** keeps a part of the UI alive but hidden.

```jsx
import { Activity, useState } from 'react';

export default function Tabs() {
  const [tab, setTab] = useState('a');
  return (
    <div>
      <button onClick={() => setTab('a')}>A</button>
      <button onClick={() => setTab('b')}>B</button>
      <Activity mode={tab === 'a' ? 'visible' : 'hidden'}>
        <Counter label="A" />
      </Activity>
      <Activity mode={tab === 'b' ? 'visible' : 'hidden'}>
        <Counter label="B" />
      </Activity>
    </div>
  );
}
```
When `mode="hidden"`: the children get `display: none`, their effects are cleaned up, their **state is kept**, and they re-render at low priority if props change. When visible again, state is restored and effects run again. I observed state `1` kept and the effect log `setup, cleanup, setup`. Only two modes exist today (`visible` and `hidden`). Compare with conditional rendering (`{tab === 'a' && <Counter />}`), which throws the state away.

**`<ViewTransition>`** wraps content so the browser can animate between old and new UI using its View Transition API.

```jsx
import { startTransition, useState, ViewTransition } from 'react';

export default function Toggle() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => startTransition(() => setOpen(!open))}>Toggle</button>
      <ViewTransition>{open ? <p>Details</p> : <p>Summary</p>}</ViewTransition>
    </div>
  );
}
```
Facts from the React docs: it animates only for updates that happen **inside a transition** (a `startTransition`, a Suspense reveal or `useDeferredValue`); a plain `setState` is urgent and does not animate. React calls `document.startViewTransition` itself, so do not call it. React does not honour `prefers-reduced-motion` for you. It is DOM only. **In tests:** jsdom has no `document.startViewTransition`, so `ViewTransition` just renders its children and nothing animates; test the content, not the animation. I did not run animations (that needs a real browser). There is also `addTransitionType(type)`, called inside `startTransition` to say why an update happens (for example forward or back navigation).

## 11. Tearing and useSyncExternalStore
**Tearing** is when one screen shows two versions of the same data. It can happen when render is interruptible and the data lives **outside React** (a global variable, a store). Render starts, the store changes halfway, the rest of the tree reads the new value. Part of the screen is old, part is new.

React state does not tear: React renders from a snapshot. External stores can. The fix is `useSyncExternalStore`.

```jsx
import { useSyncExternalStore } from 'react';

let value = 0;
const listeners = new Set();

export const getValue = () => value;
export function setValue(next) {
  value = next;
  listeners.forEach((listener) => listener());
}
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function Reading() {
  const current = useSyncExternalStore(subscribe, getValue);
  return <p>Value: {current}</p>;
}
```

**What happens, step by step.** In my experiment: 20 components, each reading the store, rendered in a slow transition; the store changed 9 ms into the render.
1. Reading `getValue()` directly in render: the final screen mixed `0` and `1` (torn).
2. Reading with `useSyncExternalStore`: all 20 showed `1`. React noticed the store changed before committing and re-rendered synchronously.
3. Docs: store updates are always blocking, and React re-checks the snapshot before committing a transition.

Rules: `getSnapshot` must return a cached value (a new object each call logs "should be cached" and ends in "Maximum update depth exceeded"), and for server rendering you must pass a third argument, `getServerSnapshot`. Redux, Zustand and similar libraries use this hook inside. Basics are in [Other hooks](../02-hooks/09-other-hooks.md).

## 12. Time slicing and priorities in practice
**Time slicing** means React renders a transition in short slices and then hands control back to the browser so it can paint and handle input. The scheduler's slice is about 5 ms. In my test, a transition render of 40 rows (2 ms each) let the event loop run about every 5 to 7 ms. The same tree rendered by a plain default-priority update ran with no gaps: urgent work is not time sliced.

Interruption rules I verified:
- A click (discrete event) during a slow transition render **interrupts** it. The transition is abandoned halfway, the click's update renders and commits with the old transition state, then the transition restarts from the beginning.
- A default-priority update from a `setTimeout` does **not** interrupt a transition render; the transition finishes first.
- Since React 19.3, two transitions started in different events render independently (before, they could be merged into one render). Two started in the same event still share a render.

## 13. Worked example: timelines
Same page, 400 rows at about 1 ms each (so about 400 ms per list render). Numbers are illustrative, the shape is what matters.

```text
A) Without a transition: one urgent update does everything
time (ms)      0         100        200        300        400
main thread    [ render input + all 400 rows, cannot be interrupted ]
screen         old ......................................... "a" appears
user feels     key press, then nothing for 400 ms: typing lags
```

```text
B) With startTransition(() => setQuery(value))
time (ms)      0   5       10      15      ...     400   (list work in slices)
main thread    [U][s][ ][s][ ][s][ ][s] ... [commit]
                |  |  |  |
                |  |  |  +-- browser handles key press, paint, input
screen         "a" in input at ~5 ms; list for "a" at ~400+ ms
isPending      false -> true (at 0) ........................ -> false
U = urgent render of the input;  s = a slice of the list render
```

```text
C) Second key arrives while the list is rendering (transition)
time (ms)      0     5 .......... 150 (key "b")  ..........................
main thread    [U:a][slices of list for "a"...][U:ab][restart list work ...]
screen         "a"                              "ab" in input immediately
list           old list ............................ new list later
```
In C, the input always keeps up. Whether the list for `a` is ever committed before the list for `ab` depends on timing, which is fine, because the list is allowed to lag.

## How interviewers test this
- They ask for a definition, then a scenario: "typing in a search box lags, what do you do?" A strong answer separates urgent state (input) from deferred work (list), reaches for `useTransition` or `useDeferredValue`, and mentions `memo` and measuring first.
- They check you know concurrency is about **responsiveness, not speed**, and not threads.
- They probe Suspense: what triggers it (`use`, `lazy`, frameworks, not effects), where boundaries go, and how errors and loading differ.
- Strong answers mention waterfalls, the need for a cached promise, and the already-visible-content behaviour in transitions.
- Senior candidates explain priorities (lanes), time slicing, interruption and tearing with `useSyncExternalStore`.
- Red flags: "useTransition debounces", "Suspense fetches data for you", "concurrent mode is a flag", "wrap everything in a transition".

## Interview questions and model answers
### Q1. What is concurrent rendering in React? (Easy)
It means React can interrupt, pause, resume or discard a render in progress, and give priority to more urgent updates like typing. It is not multithreading (still one thread) and not automatic speed: the total work is the same, but the UI stays responsive. You opt in by using transitions, deferred values and Suspense on a `createRoot` root.

### Q2. What is the difference between `useTransition` and `useDeferredValue`? (Medium)
Both mark work as low priority. `useTransition` wraps the **state update** (`startTransition(() => setQuery(v))`) and gives you `isPending`. Use it when you own the setter. `useDeferredValue(value)` wraps a **value** and returns a lagging copy; use it when you only receive the value (for example as a prop) or cannot touch the setter. With a deferred value you detect staleness yourself with `value !== deferred`. In both cases the heavy child should be memoized.

### Q3. What does Suspense do, and what is a fallback? (Easy)
`Suspense` lets part of the tree wait for something (code from `lazy`, data read with `use`) and shows a **fallback** UI such as a spinner or skeleton while it waits. When the thing is ready, React renders the real content. The nearest boundary above the suspended component shows its fallback. It does not fetch anything itself.

### Q4. Can Suspense be used for data fetching? (Medium)
Yes, but only with Suspense-aware sources: `use()` with a **cached** promise, libraries such as TanStack Query's `useSuspenseQuery`, router loaders, or frameworks and Server Components. Fetching in `useEffect` or an event handler does not trigger Suspense. The promise must be stable across retries; creating it inside render makes the component suspend forever or logs an "uncached promise" warning.

### Q5. How does React prioritise updates? (Medium)
Each update gets a priority (a lane) from where it came from: discrete events like clicks and keys are highest, continuous events (scroll, hover) next, default updates (timers, network callbacks) after that, then transitions, then idle work. A higher priority update can interrupt a lower one that is mid-render. Transitions are the lowest of the ones you control and are the only normal user-level way to say "this can wait".

### Q6. What is time slicing? (Medium)
React renders non-urgent work in small chunks (the scheduler yields about every 5 ms) and hands control back to the browser between chunks so it can handle input and paint. Only non-blocking work is sliced: transitions, deferred renders and Suspense retries. Urgent updates render in one go. It is why a heavy transition does not freeze typing.

### Q7. Does `useTransition` make my slow component faster? Is `useDeferredValue` a debounce? (Medium)
No to both. A transition does the same work, it only lets urgent updates go first. If the work is huge, optimise it (memoization, virtualization, less rendering). `useDeferredValue` is not a debounce: it has no fixed delay, adapts to the device, and its render is interruptible. But it does not reduce network requests, so keep a debounce when each value triggers a fetch.

### Q8. What is tearing and how does `useSyncExternalStore` prevent it? (Hard)
Tearing is when a single screen shows data from two moments, because an interruptible render read an external mutable store before and after it changed. React state is snapshot-based and safe. For external stores, `useSyncExternalStore(subscribe, getSnapshot)` lets React check the snapshot again before commit; if it changed, React re-renders synchronously so everything is consistent. `getSnapshot` must return a cached value, and SSR needs `getServerSnapshot`.

### Q9. How do you avoid waterfalls with Suspense? (Hard)
Start requests as early as possible and in parallel, not inside the component that needs them one by one. Options: create all promises before reading any with `use`, start fetches in a route loader or event handler, use a Server Component, or use a query library with prefetching. Also split boundaries so independent parts load and reveal independently. Know that a child's fetch only starts after its parent stops suspending.

### Q10. How do Suspense and error boundaries work together? (Medium)
Suspense covers **loading**, an error boundary covers **failure**. A rejected promise read with `use` is thrown to the nearest error boundary, so wrap the `Suspense` in an `ErrorBoundary` to show an error UI. Without one, the root unmounts. A Retry button must reset the boundary and also clear the cached rejected promise.

### Q11. What happens to already visible content when a transition suspends? (Hard)
React keeps showing the old content, sets `isPending` to `true`, and swaps to the new content when it is ready, instead of replacing it with the fallback. A plain `setState` would show the fallback. This only protects content that is already revealed, not the first load.

### Q12. What is `Activity`, and is it experimental? (Medium)
`<Activity mode="hidden">` hides a subtree (`display: none`), cleans up its effects but keeps its state, and keeps rendering it at low priority. It is stable since React 19.2. It is handy for tabs, wizards and routes you want to resume. It is not experimental.

## Common mistakes and gotchas
- Using `useTransition` and expecting a faster render. Fix: it only protects responsiveness; also reduce work.
- Putting the input's own state inside `startTransition`. Fix: keep it urgent, transition only the derived state.
- Forgetting `memo` on the heavy child. Fix: wrap it, or the urgent render re-renders it anyway.
- Updating state after `await` inside a transition and assuming it is low priority. Fix: wrap it in another `startTransition`.
- Creating the promise inside the component. Fix: cache it outside render or use a library or framework.
- Fetching in `useEffect` and wondering why Suspense does nothing. Fix: use a Suspense-aware source.
- One giant boundary (or a hundred tiny ones). Fix: one boundary per meaningful loading unit.
- No error boundary. Fix: put one outside the `Suspense`.
- Writing `getSnapshot` that returns a new object each call. Fix: return a cached value.
- Testing Suspense with plain synchronous `render()`. Fix: `await act(async () => { render(...) })` then `await screen.findBy...` (React logs a warning and the content never appears otherwise). Allow for the 300 ms reveal throttle.
- Calling `document.startViewTransition` yourself, or relying on it in jsdom. Fix: use `<ViewTransition>` and test content only.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Classify as urgent or transition: typing in a text box, filtering 10,000 rows from that text, clicking a "like" button, switching to a heavy "Reports" tab.
<details>
<summary>Show answer</summary>

Urgent: typing in the box, clicking "like". Transition: filtering the 10,000 rows (derived from the text) and rendering the heavy Reports tab. The rule: anything the user must see instantly stays urgent, anything that can lag a moment is a transition.

</details>

2. **(Easy)** Predict the render log of this component after the user types `a` once. Which values does the second line have?
```jsx
function Page() {
  const [text, setText] = useState('');
  const deferred = useDeferredValue(text);
  console.log(`text=${text} deferred=${deferred}`);
  return <input value={text} onChange={(e) => setText(e.target.value)} />;
}
```
<details>
<summary>Show answer</summary>

Two lines (ignoring StrictMode's double render): `text=a deferred=` and then `text=a deferred=a`. The first render is urgent, with the deferred value still old. The second is the background render with the new value.

</details>

3. **(Medium)** Coding: take a controlled input plus a slow list (use the `SlowRow` idea from section 3) where all state lives in one `useState`. Make typing smooth with `useTransition` and show "Updating list..." while it works.
<details>
<summary>Show answer</summary>

Split the state into `text` and `query`, wrap the list in `memo`, and set the query inside a transition:

```jsx
const [text, setText] = useState('');
const [query, setQuery] = useState('');
const [isPending, startTransition] = useTransition();

function handleChange(e) {
  setText(e.target.value);
  startTransition(() => setQuery(e.target.value));
}
// render: <input value={text} .../>, {isPending && <p>Updating list...</p>}, <FilteredList query={query} />
```
Without `memo` on `FilteredList` the urgent render still re-renders the slow rows.

</details>

4. **(Medium)** Coding: lazy-load a `Settings` component from `./Settings.jsx`, show "Loading settings..." while the code loads, and show "Could not load settings" if loading fails.
<details>
<summary>Show answer</summary>

```jsx
import { lazy, Suspense } from 'react';
// ErrorBoundary: class with getDerivedStateFromError (see section 8)

const Settings = lazy(() => import('./Settings.jsx'));

export default function Page() {
  return (
    <ErrorBoundary fallback={<p>Could not load settings</p>}>
      <Suspense fallback={<p>Loading settings...</p>}>
        <Settings />
      </Suspense>
    </ErrorBoundary>
  );
}
```
The error boundary is outside `Suspense`. A failed chunk download is an error, so it reaches the boundary. Make the boundary class render `this.props.fallback` when it has an error.

</details>

5. **(Medium)** Predict: a page shows `User 1` (already loaded). A button calls `setId(2)` and `User` reads `use(fetchUser(id))` inside a `Suspense` with fallback `Loading...`. What does the user see until `User 2` arrives? What changes if the button uses `startTransition(() => setId(2))` and the page shows `isPending`?
<details>
<summary>Show answer</summary>

With plain `setId`, the old content is hidden and `Loading...` is shown, then `User 2`. With `startTransition`, `User 1` stays visible, `isPending` is `true` (so you can show "Pending"), no fallback appears, and `User 2` replaces `User 1` when ready. Transitions protect already revealed content.

</details>

6. **(Medium)** Coding: write a small store with `useSyncExternalStore` for a counter (`increment`, `getCount`, `subscribe`) and a component that shows it. Then say what breaks if `getSnapshot` returns `{ count }`.
<details>
<summary>Show answer</summary>

```jsx
import { useSyncExternalStore } from 'react';

let count = 0;
const listeners = new Set();
const getCount = () => count;
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const increment = () => { count += 1; listeners.forEach((l) => l()); };

export default function Counter() {
  const value = useSyncExternalStore(subscribe, getCount);
  return <button onClick={increment}>Count: {value}</button>;
}
```
If `getSnapshot` returns a new object `{ count }` on every call, React sees a changed snapshot every time. It logs that the result should be cached and then fails with "Maximum update depth exceeded".

</details>

7. **(Hard)** Explain: why does `const user = use(fetch('/api/me').then((r) => r.json()))` inside a component keep showing the fallback forever, and give two ways to fix it.
<details>
<summary>Show answer</summary>

Each retry re-runs the component, which creates a new promise, which is pending again, so React suspends again, in a loop. Fix 1: create the promise once, outside render, and look it up from a cache keyed by the input (`use(fetchUser(id))`). Fix 2: let a library or framework own it (TanStack Query's `useSuspenseQuery`, a router loader that passes the promise down, or a Server Component passing a promise as a prop).

</details>

8. **(Hard)** Explain and fix: `Parent` calls `use(getA())` and then renders `Child`, which calls `use(getB())`. The page takes `time(A) + time(B)`. How do you make it `max(A, B)`?
<details>
<summary>Show answer</summary>

It is a waterfall: `getB()` is only called when `Child` renders, which is after `A` is done. Start both requests before reading either: `const a = getA(); const b = getB(); ... use(a) ... use(b)`, or start both in a route loader, an event handler or a Server Component and pass the promises down. If the parts are independent, give each its own `Suspense` boundary so each reveals when ready.

</details>

## Recap
- Concurrent rendering = renders can be interrupted, paused, resumed or discarded. It gives responsiveness, not speed, and is not threads.
- It needs `createRoot`. You opt in per update with `startTransition`, `useDeferredValue` and Suspense.
- Keep input state urgent; wrap the heavy derived update in a transition; memoize the heavy child. Updates after `await` need their own `startTransition`.
- `useTransition` owns the setter and gives `isPending`; `useDeferredValue` lags a value, adds no fixed delay, and does not reduce network calls.
- Suspense shows a fallback for the nearest boundary while `use` or `lazy` waits; it ignores effect-based fetching. The promise must be cached.
- Pair Suspense with an error boundary outside it, avoid waterfalls by starting requests in parallel, and use transitions so visible content is not replaced by a fallback.
- `Activity` (19.2) hides but keeps state; `ViewTransition` (19.3) animates transition updates only and does nothing in jsdom.
- Tearing is mixed old and new data from an external store; `useSyncExternalStore` makes React re-check and stay consistent.

## Where to go next
- Next: [React 19 and newer](04-react-19-and-newer.md) for Actions, `useOptimistic` and `use`, then [SSR and Server Components](05-ssr-and-server-components.md).
- Review the hook basics in [Other hooks](../02-hooks/09-other-hooks.md) and [Error boundaries](../03-intermediate/05-error-boundaries-portals-and-friends.md).
- Go deeper on priorities and the scheduler in React internals deep dive (planned).
- Practice: [Autocomplete with debounce](../practice-app/exercises/react/12-autocomplete-debounce/README.md) and [Round 2: rendering, state and modern React](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md).
