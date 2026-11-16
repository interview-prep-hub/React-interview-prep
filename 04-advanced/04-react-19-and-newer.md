# React 19 and Newer

> **Level:** Advanced   **Time:** about 70 minutes   **Read first:** [Forms basics](../01-basics/07-forms.md), [Other hooks](../02-hooks/09-other-hooks.md), [Concurrent React and Suspense](03-concurrent-react-and-suspense.md)

## What you will learn
- Explain what an Action is and build a form with `<form action>`, `useActionState`, `useFormStatus` and `useOptimistic`.
- Use `use()` to read a promise or a context, and say why it is not a hook.
- Write components with `ref` as a normal prop, ref cleanup functions and `<Context value>`.
- List what 19.1, 19.2 and 19.3 added, and which of those features are stable today.
- Migrate old code: know what React 19 removed and which codemods help.
- Summarise the React Compiler 1.0 and answer the common "what is new in React 19" questions.

## 1. The big picture: what changed since React 18
React 18 gave us concurrent rendering. React 19 builds on it with three themes:
- **Async work is a first-class citizen** (Actions, forms, `use`, optimistic UI).
- **Less boilerplate** (`ref` as a prop, `<Context>` as provider, metadata tags anywhere).
- **Cleanup** (many old APIs are removed).

Version timeline (dates are npm publish dates):

| Version | Date | Headline |
|---|---|---|
| 18.3 | 2024-04 | Same code as 18.2, plus warnings for everything 19 removes |
| 19.0 | 2024-12-05 | Actions, `useActionState`, `useOptimistic`, `use`, `useFormStatus`, `ref` as prop, metadata, preload APIs, removals |
| 19.1 | 2025-03-28 | Owner Stacks (`captureOwnerStack`, dev only), better Suspense, new `useId` format |
| 19.2 | 2025-10-01 | `Activity`, `useEffectEvent`, `cacheSignal`, Performance Tracks, partial pre-rendering APIs |
| 19.3 | 2026-09-09 | `ViewTransition`, `addTransitionType`, Fragment refs, `browser()`, Trusted Types support |
| 19.3.1 | 2026-10-14 | Only a Server Components transport fix |

React Compiler 1.0 is a separate package, released 2025-10-07 (section 16).

**Honest status (checked November 2026, React 19.3.1):** everything in this lesson is **stable**. Only these are still experimental or canary-only, so do not use them in production: `<Suspense defer>`, `unstable_SuspenseList`, `unstable_startGestureTransition`, `optimisticKey`, and the `importMap` server option. The low-level APIs that bundlers use for Server Components do not follow semver. Use the newest patch of your minor line, because several security patches shipped for the Server Components packages.

## 2. Actions: async work in transitions
Before 19, an async update meant juggling `isLoading`, `error` and result state by hand. React 19 defines an **Action**: any function you pass to `startTransition` (or to the start function of `useTransition`). It may be `async`. React tracks the whole function as "pending", handles errors, and commits the result as one non-blocking update.

```jsx
import { useState, useTransition } from 'react';

function saveName(name) {
  return new Promise((resolve) => setTimeout(() => resolve(name), 500));
}

export default function Profile() {
  const [name, setName] = useState('Ann');
  const [draft, setDraft] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const saved = await saveName(draft);
      startTransition(() => {
        setName(saved);
      });
    });
  }

  return (
    <div>
      <p>Saved name: {name}</p>
      <input aria-label="New name" value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button onClick={handleSave} disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
```

**What happens, step by step** (run in a test: type "Bo", click Save):
1. The click calls `startTransition` with an async function. `isPending` becomes `true` right away.
2. The button shows "Saving..." and is disabled for the whole 500 ms, across the `await`.
3. The promise resolves. The inner `startTransition` applies `setName`.
4. The Action ends. `isPending` goes back to `false` and the screen shows "Saved name: Bo".

**Common mistake:** calling a state setter after an `await` without wrapping it. React only marks the code before the first `await` as part of the Transition (a documented limitation).

```jsx
// Wrong: this setName is not marked as a Transition
startTransition(async () => {
  const saved = await saveName(draft);
  setName(saved);
});

// Fixed: wrap the update that comes after the await
startTransition(async () => {
  const saved = await saveName(draft);
  startTransition(() => setName(saved));
});
```

## 3. Forms: the action prop and automatic reset
In React 19 you can pass a **function** to a form's `action` prop. React calls it with the form's `FormData` inside a Transition. You do not need `onSubmit`, `preventDefault` or controlled inputs.

```jsx
export default function NameForm() {
  async function saveAction(formData) {
    const name = formData.get('name');
    await new Promise((resolve) => setTimeout(resolve, 300));
    console.log(`Saved ${name}`);
  }

  return (
    <form action={saveAction}>
      <input name="name" />
      <button type="submit">Save</button>
    </form>
  );
}
```

**What happens, step by step:**
1. The user submits. React stops the browser reload and builds a `FormData` from the fields (each field needs a `name`).
2. React calls `saveAction(formData)` inside a Transition. The page stays responsive.
3. When the function finishes without throwing, React **resets the form's uncontrolled fields** to their default values. The input is empty again.
4. `<button formAction={fn}>` and `<input formAction={fn}>` work the same way, so one form can have several actions.

**Common mistake:** being surprised that the typed value disappears after a validation error. The reset happens whenever the function finishes without throwing, even if you returned an error message. Keep the value by feeding it back through `defaultValue` (see section 4). A form with a function action always sends POST, whatever its `method` prop says.

```jsx
// Wrong: no name attribute, formData.get('email') is null
<input type="text" />
// Fixed
<input name="email" type="text" />
```

Libraries such as React Hook Form are still useful for big forms. See [Forms with libraries](../03-intermediate/04-forms-with-libraries.md).

## 4. useActionState: state that an Action produces
`useActionState` wraps an Action function and gives you its **result** as state, plus a pending flag. It lives in `react`. (Its earlier name was `useFormState`; that name is no longer documented.)

```jsx
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

async function subscribe(previousState, formData) {
  const email = String(formData.get('email'));
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (!email.includes('@')) {
    return { message: 'Please enter a valid email', email };
  }
  return { message: `Thanks, ${email}`, email: '' };
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Sending...' : 'Subscribe'}
    </button>
  );
}

export default function SubscribeForm() {
  const [state, formAction] = useActionState(subscribe, { message: '', email: '' });
  return (
    <form action={formAction}>
      <label>
        Email <input name="email" defaultValue={state.email} />
      </label>
      <SubmitButton />
      <p role="status">{state.message}</p>
    </form>
  );
}
```

**What happens, step by step** (verified by running it):
1. `useActionState(fn, initialState)` returns `[state, formAction, isPending]`. We pass `formAction` to the form.
2. On submit React calls `subscribe(previousState, formData)`. The first argument is the **previous state**, the second is the form data.
3. While it runs, `SubmitButton` shows "Sending...".
4. Whatever the function returns becomes the new `state`. Typing "bad" shows "Please enter a valid email" and the input still contains "bad", because `defaultValue` is now `state.email` and the reset goes back to it.
5. Submitting a valid email returns `email: ''`, so the field is cleared. Without `defaultValue`, the field is cleared after every submit.

Facts to remember: dispatches queue and run in order; the Action is not double-invoked in StrictMode; if it throws, the nearest Error Boundary handles it; the third argument `permalink` only matters with Server Functions and progressive enhancement.

**Common mistake:** forgetting the extra first parameter.

```jsx
// Wrong: formData is actually the previous state
async function subscribe(formData) { return { message: formData.get('email') }; }
// Fixed
async function subscribe(previousState, formData) { return { message: formData.get('email') }; }
```

## 5. useFormStatus: a child reads the form's status
`useFormStatus()` (imported from `react-dom`, not `react`) returns `{ pending, data, method, action }` for the **parent `<form>`**. It is meant for design-system components like a submit button that should not need props.

It must be called by a component rendered **inside** the form. In the same component that renders the `<form>`, `pending` stays `false` (verified):

```jsx
// Wrong: this component renders the form, so it is not inside it
function Form() {
  const { pending } = useFormStatus();            // always false
  return <form action={save}><button>{pending ? 'Saving' : 'Go'}</button></form>;
}
// Fixed: move the hook into a child, like SubmitButton in section 4
```

`data` holds the `FormData` being submitted while pending, and is `null` otherwise. If you only need the pending flag next to the form, the third value of `useActionState` (`isPending`) is enough.

## 6. useOptimistic: show the result before the server answers
**Optimistic UI** means showing the expected result immediately and fixing it later if the server disagrees. `useOptimistic(value, reducer)` returns `[optimisticValue, addOptimistic]`. It shows `value`, plus whatever you added, **only while an Action is pending**. When the Action ends, success or error, React drops your temporary changes and shows the real `value` again.

```jsx
import { startTransition, useOptimistic, useState } from 'react';

function sendToServer(text) {
  return new Promise((resolve, reject) => {
    setTimeout(() => (text === 'fail' ? reject(new Error('Network down')) : resolve({ id: Date.now(), text })), 500);
  });
}

export default function Chat() {
  const [messages, setMessages] = useState([{ id: 1, text: 'Hello' }]);
  const [error, setError] = useState('');
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (current, text) => [...current, { id: 'temp', text, sending: true }],
  );

  async function sendAction(formData) {
    const text = String(formData.get('text'));
    addOptimisticMessage(text);
    setError('');
    try {
      const saved = await sendToServer(text);
      startTransition(() => setMessages((current) => [...current, saved]));
    } catch {
      startTransition(() => setError('Could not send'));
    }
  }

  return (
    <div>
      <ul>
        {optimisticMessages.map((m) => (
          <li key={m.id}>{m.text}{m.sending ? ' (sending...)' : ''}</li>
        ))}
      </ul>
      <p role="alert">{error}</p>
      <form action={sendAction}>
        <input name="text" aria-label="Message" />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

**What happens, step by step** (render log from a real run, sending "Hi"):
1. Submit: `addOptimisticMessage('Hi')` runs. The list renders `Hello, Hi (sending...)` at once.
2. Half a second later the server answers. `setMessages` stores the real message.
3. The Action ends and the optimistic layer is dropped. The list renders `Hello, Hi`. Render sequence: `Hello` then `Hello,Hi*` then `Hello,Hi`.
4. Send the text `fail`: the list shows `Hello, fail (sending...)`, then falls back to `Hello`, and "Could not send" appears. Reverting is automatic.

**Common mistake:** a plain `setMessages` after the `await`. In a real run this caused one extra render where the message appeared twice (`Hello,Hi,Hi*`), because the real update was not part of the Transition while the optimistic layer was still on.

```jsx
// Wrong: state update after await is not marked as part of the Transition
const saved = await sendToServer(text);
setMessages((current) => [...current, saved]);
// Fixed
startTransition(() => setMessages((current) => [...current, saved]));
```

The setter must be called inside an Action or Transition. Called elsewhere, React warns and the value only flashes.

## 7. The use API: read a promise or a context during render
`use` reads a value from a resource. It works with two kinds of resource.

**A promise.** `use(promise)` suspends the component (shows the nearest `<Suspense>` fallback) until the promise settles, then returns the value. A rejected promise goes to the nearest Error Boundary.

```jsx
import { Suspense, use } from 'react';

const userCache = new Map();
function loadUser(id) {
  if (!userCache.has(id)) {
    userCache.set(id, new Promise((resolve) => setTimeout(() => resolve({ id, name: 'Ann' }), 300)));
  }
  return userCache.get(id);
}

function UserName({ userPromise }) {
  const user = use(userPromise);
  return <p>User: {user.name}</p>;
}

export default function App() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <UserName userPromise={loadUser(1)} />
    </Suspense>
  );
}
```

**What happens, step by step:**
1. `App` calls `loadUser(1)` on every render, but the cache returns the **same promise** each time.
2. `UserName` calls `use(userPromise)`. The promise is pending, so React shows "Loading...".
3. After 300 ms the promise resolves, React retries, and `UserName` renders "User: Ann".

**A context.** `use(Context)` works like `useContext`, but you may call it after an early return or inside a condition:

```jsx
import { createContext, use } from 'react';

const ThemeContext = createContext('light');

function Heading({ children }) {
  if (children == null) return null;     // early return first
  const theme = use(ThemeContext);       // allowed after it
  return <h2 className={theme}>{children}</h2>;
}

export default function App() {
  return (
    <ThemeContext value="dark">
      <Heading>Hello</Heading>
      <Heading />
    </ThemeContext>
  );
}
```
Result: one `<h2 class="dark">`. The second `Heading` returns before it reads the context.

Rules:
- `use` is **not a hook**, even though it runs during render. Unlike hooks it can sit in loops, conditions and after early returns. It cannot be used inside `try/catch` (use an Error Boundary or `.catch` on the promise).
- The promise must be **stable across renders**. Create it outside the component, in a cache, in a framework loader, or in a Server Component and pass it down.
- `use(Context)` is not supported in Server Components.

**Common mistake:** creating the promise inside a Client Component's render.

```jsx
// Wrong: a new promise on every render
function User() {
  const user = use(fetch('/api/user').then((r) => r.json()));
  return <p>{user.name}</p>;
}
// Fixed: receive a stable promise (from a cache, loader or Server Component)
function User({ userPromise }) {
  const user = use(userPromise);
  return <p>{user.name}</p>;
}
```
React 19.3.1 logs "A component was suspended by an uncached promise" for promises that settle immediately. For a slow promise there may be no warning, but the component keeps re-rendering and never leaves the fallback.

**Testing gotcha:** a component that suspends must be rendered with `await act(async () => { render(<App />) })`. The plain `render()` uses a sync `act`, and the tree can stay stuck on the fallback. See [Testing React](08-testing-react.md) and [Data fetching](../03-intermediate/02-data-fetching.md) for fetch patterns.

## 8. ref as a prop and ref cleanup functions
In React 19, function components receive `ref` like any other prop. You no longer need `forwardRef`.

```jsx
import { useRef } from 'react';

function FancyInput({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

export default function App() {
  const inputRef = useRef(null);
  return (
    <>
      <FancyInput ref={inputRef} placeholder="Name" />
      <button onClick={() => inputRef.current.focus()}>Focus</button>
    </>
  );
}
```
Clicking the button focuses the input (verified). `forwardRef` is documented as deprecated and "will be deprecated in a future release", but it still works in 19.3.1 and logs no warning. Read old code, write new code with the prop.

**Ref cleanup.** A callback ref may now **return a cleanup function**. React calls it on unmount instead of calling your callback with `null`.

```jsx
function logRef(node) {
  console.log('attach', node.tagName);
  return () => console.log('cleanup');
}

function Measured() {
  return <div ref={logRef}>Hi</div>;
}
```
Real log: mount prints `attach DIV`; a re-render prints nothing (the function identity is stable); unmount prints `cleanup`. In `StrictMode` (development) the mount is `attach DIV`, `cleanup`, `attach DIV`, because React checks that your cleanup is correct.

**Common mistake:** an arrow function with an implicit return in a callback ref. The return value is now reserved for the cleanup function, so TypeScript rejects it.

```jsx
// Wrong: the assignment is returned
<div ref={(node) => (instance = node)} />
// Fixed: braces, nothing returned
<div ref={(node) => { instance = node; }} />
```
Also, `element.ref` is deprecated; read `element.props.ref`. More on refs: [useRef](../02-hooks/04-useref.md).

## 9. Context as a provider
Render the context object itself as the provider:

```jsx
const ThemeContext = createContext('light');

// React 19
<ThemeContext value="dark">{children}</ThemeContext>
// Older style, still works but labelled legacy
<ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>
```
That is the whole change. `Context.Consumer` is legacy too. Details of context behaviour: [useContext](../02-hooks/05-usecontext.md).

## 10. Document metadata, stylesheets and scripts
You can render `<title>`, `<meta>` and `<link>` **inside any component**. React hoists them into the document `<head>`. This works on the client, in streaming server rendering and in Server Components.

```jsx
function BlogPost({ post }) {
  return (
    <article>
      <title>{post.title}</title>
      <meta name="description" content={post.summary} />
      <link rel="stylesheet" href="/post.css" precedence="default" />
      <h1>{post.title}</h1>
    </article>
  );
}
```
A test run confirmed: `document.title` became the post title, the `meta` tag landed in `<head>`, and no `<title>` stayed inside the `<article>`.

Stylesheets and scripts got smarter too:
- A `<link rel="stylesheet">` with a **`precedence`** prop is de-duplicated and ordered by its precedence. React waits for it to load before revealing Suspense content that needs it.
- `<script async src="...">` can be rendered anywhere and is de-duplicated.
- Libraries such as React Helmet are still useful for advanced cases. A `<title>` inside a hidden `<Activity>` is not hoisted (19.3).

## 11. Resource preloading and custom elements
**Preloading APIs** (from `react-dom`) tell the browser to start fetching early. You can call them while rendering or in event handlers:

```jsx
import { preconnect, preload, preinit } from 'react-dom';

function Gallery() {
  preconnect('https://cdn.example.com');                         // open the connection
  preload('https://cdn.example.com/hero.jpg', { as: 'image' });  // fetch, do not run
  preinit('https://cdn.example.com/widget.js', { as: 'script' }); // fetch and run
  return <img src="https://cdn.example.com/hero.jpg" alt="Hero" />;
}
```
The full set is `prefetchDNS`, `preconnect`, `preload`, `preloadModule`, `preinit`, `preinitModule`.

**Custom elements** (Web Components) now work properly. React passes a prop as a **property** when the element has that property, otherwise as an **attribute**. Event names use an `on` prefix and keep their case: `onspeak` listens to the `speak` event. React 19 passes the "Custom Elements Everywhere" tests.

## 12. Better error reporting and hydration diffs
Before 19, one render error could be logged twice and re-thrown. Now it is reported once. You can plug in your own reporting with three **root options**:

```jsx
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

function sendToTracker(kind, error, componentStack) {
  // call your error-reporting service here
  console.error(kind, error.message, componentStack);
}

createRoot(document.getElementById('root'), {
  onCaughtError(error, info) { sendToTracker('caught', error, info.componentStack); },
  onUncaughtError(error, info) { sendToTracker('uncaught', error, info.componentStack); },
  onRecoverableError(error, info) { sendToTracker('recoverable', error, info.componentStack); },
}).render(<App />);
```
- `onCaughtError`: an Error Boundary caught it. Default: one `console.error`.
- `onUncaughtError`: nothing caught it. Default: `window.reportError`.
- `onRecoverableError`: React recovered by itself (for example a hydration mismatch fixed by client rendering).
- Production code that relied on re-thrown errors must move to these callbacks. In tests, inside `act`, uncaught errors are re-thrown by `act` and do not reach `onUncaughtError`.

**Hydration errors** now show one message with a `+`/`-` diff of server versus client HTML instead of several vague warnings. React also tolerates extra tags that browser extensions or third-party scripts add to `<head>` and `<body>`. More in [Error boundaries and friends](../03-intermediate/05-error-boundaries-portals-and-friends.md).

## 13. Smaller behaviour changes
**useDeferredValue initial value.** `useDeferredValue(value, initialValue)` returns `initialValue` on the first render, then re-renders in the background with the real value. A test with `useDeferredValue(query, '')` and `query = 'react'` logged `["", "react"]`.

```jsx
const [query] = useState('react');
const deferredQuery = useDeferredValue(query, '');   // '' first, then 'react'
```

**StrictMode.** In development, the second render of a component now **reuses** the `useMemo` and `useCallback` results from the first. Ref callbacks run twice on mount (see section 8). From 19.3, Effects also run twice (setup, cleanup, setup) during hydration, as they already did on client-rendered roots.

**Suspense.** When a component suspends, React shows the nearest fallback sooner and then pre-renders the sibling components in a follow-up pass. 19.1 made Suspense behave consistently on the client, the server and during hydration. Deeper coverage: [Concurrent React and Suspense](03-concurrent-react-and-suspense.md) and [How React renders](01-how-react-renders.md).

## 14. What 19.1, 19.2 and 19.3 added
All items below are stable in 19.3.1.

**19.1:** `captureOwnerStack()` returns a dev-only string of the components that rendered the current one (it is `undefined` in production, so guard the call). `React.act` was removed from production builds. The `useId` format changed in 19.1 and again in 19.2, so never hard-code or parse it.

**19.2: Activity.** `<Activity mode="hidden">` hides a subtree but keeps its state. Hidden children get `display: none`, their Effects are cleaned up, and they re-render at low priority. A test: click Count to 1, hide, show again.

```jsx
import { Activity, useEffect, useState } from 'react';

function Counter() {
  const [n, setN] = useState(0);
  useEffect(() => {
    console.log('setup');
    return () => console.log('cleanup');
  }, []);
  return <button onClick={() => setN(n + 1)}>Count {n}</button>;
}

export default function App() {
  const [mode, setMode] = useState('visible');
  return (
    <>
      <button onClick={() => setMode(mode === 'visible' ? 'hidden' : 'visible')}>Toggle</button>
      <Activity mode={mode}><Counter /></Activity>
    </>
  );
}
```
Real log: `setup`, then on hide `cleanup` (button style `display: none`, text still `Count 1`), then on show `setup` again and `Count 1` is back. Use it for tabs or routes you want to keep warm without keeping their Effects running. Only `visible` and `hidden` exist today.

**19.2: useEffectEvent.** It lets an Effect call logic that always sees the latest props and state, without making that logic a dependency.

```jsx
import { useEffect, useEffectEvent } from 'react';

function ChatRoom({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showToast(`Connected to ${roomId}`, theme);   // always the latest theme
  });

  useEffect(() => {
    const connection = createConnection(roomId);  // your own helper
    connection.on('connected', () => onConnected());
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]);                                    // theme is not a dependency
}
```
The Effect reconnects only when `roomId` changes. Rules: call the event only from Effects, do not pass it to children, do not list it in dependencies, and do not use it just to silence the lint. Full coverage: [Other hooks](../02-hooks/09-other-hooks.md).

**19.2: others.** `cacheSignal()` (Server Components only) gives an `AbortSignal` that fires when a `cache()` lifetime ends. Partial pre-rendering: `prerender` returns `{ prelude, postponed }`; you serve the static `prelude` from a CDN and later `resume` the rest. This is framework territory, see [SSR and Server Components](05-ssr-and-server-components.md). **Performance Tracks** add React-specific tracks (a Scheduler track and a Components track) to the Chrome DevTools performance profile.

**19.3: ViewTransition.** It animates elements when the page changes, using the browser's View Transitions API. Wrap the element in `<ViewTransition>`:

```jsx
import { ViewTransition, startTransition, useState } from 'react';

export default function Panel() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => startTransition(() => setOpen((o) => !o))}>Toggle panel</button>
      {open && (
        <ViewTransition>
          <div>Hello panel</div>
        </ViewTransition>
      )}
    </>
  );
}
```
How it works: it animates **only updates inside a Transition** (`startTransition`, a Suspense reveal, `useDeferredValue`); a plain `setState` is urgent and does not animate. There are four triggers (enter, exit, update, share) and class props (`default`, `enter`, `exit`, `update`, `share`) to style them. React calls `document.startViewTransition` itself, so never call it yourself. React does not honour `prefers-reduced-motion` for you. `addTransitionType` tags a Transition (for example forward or back) so you can animate differently. **Testing:** jsdom has no `document.startViewTransition`, so in tests the component just renders its children (verified: the panel appears).

**19.3: others.** Fragment refs (`<Fragment ref={r}>`, the `<>` shorthand cannot take a ref) give methods such as `focus`, `addEventListener` and `scrollIntoView` over the first-level DOM children. `use(browser())` marks a client subtree as browser-only. Server Components may render a client Context directly. Transitions now render independently. Trusted Types values are passed through to DOM sinks.

## 15. Removed and deprecated APIs, and how to migrate

| Old | Status in 19 | Use instead |
|---|---|---|
| `ReactDOM.render`, `hydrate`, `unmountComponentAtNode` | Removed | `createRoot` / `hydrateRoot`, `root.unmount()` |
| `ReactDOM.findDOMNode` | Removed | DOM refs |
| `propTypes` | Silently ignored | TypeScript (or another checker) |
| `defaultProps` on function components | Removed (class components keep it) | Default parameters |
| String refs (`ref="x"`) | Removed, throws | `useRef`, `createRef`, callback refs |
| Legacy context (`contextTypes`, `getChildContext`) | Removed | `createContext` and `useContext` |
| `React.createFactory` | Removed | JSX |
| `react-dom/test-utils` | Only a deprecated `act` is left | `act` from `react` |
| `react-test-renderer` | Deprecated, logs a message | Testing Library |
| `renderToNodeStream`, `renderToStaticNodeStream` | Removed | `renderToPipeableStream`, `renderToReadableStream` |
| `forwardRef` | Documented as deprecated, still works | `ref` as a prop |
| `Context.Provider` | Legacy, still works | `<Context value>` |
| `useFormState` | Renamed | `useActionState` |

A test confirmed that `Badge.defaultProps = { label: 'new' }` is ignored on a function component: `<Badge />` rendered `[]`, the prop was `undefined`.

```jsx
// Before: ignored in React 19
function Badge(props) { return <b>{props.label}</b>; }
Badge.defaultProps = { label: 'new' };
// After
function Badge({ label = 'new' }) { return <b>{label}</b>; }
```

**Migration plan:**
1. Upgrade to **18.3.1** first. It runs like 18.2 but warns about everything 19 removes. Fix the warnings.
2. Upgrade to 19. Run the codemod recipe: `npx codemod@latest react/19/migration-recipe`. It runs `replace-reactdom-render`, `replace-string-ref`, `replace-act-import`, `replace-use-form-state` and `prop-types-typescript`.
3. TypeScript projects: `npx types-react-codemod@latest preset-19 ./src`. Types such as `ReactChild` and the global `JSX` namespace were removed, and `useRef` needs an argument.
4. Move `defaultProps` to default parameters by hand, and replace test-renderer tests with Testing Library ([Testing React](08-testing-react.md)).
5. Update error reporting to the new root callbacks (section 12).

## 16. React Compiler 1.0 in one page
The **React Compiler** is a build-time tool (a Babel plugin, `babel-plugin-react-compiler`, version 1.0.0 released 2025-10-07, called production-ready by the React team). It adds memoization automatically, so you write less `useMemo`, `useCallback` and `React.memo`.

- It memoizes at a finer level than hand-written hooks. It can even memoize after an early return or around `use()` calls, which `useMemo` cannot.
- It targets **update** cost (skipping re-renders and repeated calculations), not first-mount cost.
- It only compiles components and hooks. Code that breaks the Rules of React (reading `ref.current` in render, mutating globals, setState during render) is **skipped**, not failed; the build continues.
- It works with React 17, 18 and 19 (set the `target` option for 17 or 18). The docs still describe it as optional.
- Manual `useMemo` and `useCallback` remain valid as escape hatches, for example to keep an Effect dependency stable.
- Compiler-powered lint rules ship in `eslint-plugin-react-hooks`.
- Tip from the React team: with weak test coverage, pin the exact compiler version.

Enable it in a new Vite app with the `react-compiler` template (`npm create vite@latest my-app -- --template react-compiler`). In an existing Vite 8 app using `@vitejs/plugin-react` 6, add `@rolldown/plugin-babel` and:

```js
// vite.config.js
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
```
The docs say compiled components show a "Memo" badge in React DevTools. More on when manual memoization still matters: [Memoization](../02-hooks/07-memoization.md) and [Performance optimization](02-performance-optimization.md).

## How interviewers test this
- They check whether you know the **headline list** (Actions, `useActionState`, `useOptimistic`, `use`, `ref` as prop, metadata, removals) and can explain each in one sentence.
- They ask for a small **form example**: pending state, error message, optimistic update. A strong answer uses `<form action>`, `useActionState` and a child `useFormStatus`, and mentions the automatic reset.
- They probe edge rules: `use` is not a hook, the promise must be stable, `useFormStatus` works only in a child of the form, `useOptimistic` reverts when the Action ends.
- They ask about **migration**: what was removed, the 18.3.1 stepping stone, codemods.
- Red flags: teaching `useFormState`, `ReactDOM.render`, `defaultProps` on function components, or saying "always wrap everything in `useMemo`" without knowing the Compiler. Claiming 19.2 or 19.3 features are "experimental" is also outdated.

## Interview questions and model answers
### Q1. What is new in React 19? (Easy)
Actions (async functions in transitions), `<form action>` with automatic reset, `useActionState`, `useFormStatus`, `useOptimistic`, the `use` API, `ref` as a normal prop with ref cleanup functions, `<Context>` as a provider, `<title>`, `<meta>` and `<link>` rendered anywhere, stylesheet and script support, resource preloading APIs, custom elements support, better error reporting (`onCaughtError`, `onUncaughtError`), hydration error diffs, and many removals. Later minors added `Activity` and `useEffectEvent` (19.2) and `ViewTransition` (19.3).

### Q2. What are Actions? (Medium)
An Action is a function, often async, that you pass to `startTransition` or to a form's `action` prop. React tracks it as pending for its whole duration (across `await`), keeps the UI responsive, handles errors through Error Boundaries, and commits the result as one update. It replaces the manual `isLoading` and `error` state. Remember that state updates after an `await` need their own `startTransition`.

### Q3. What is useActionState? (Medium)
`const [state, formAction, isPending] = useActionState(action, initialState)`. The action is called as `action(previousState, formData)` and what it returns becomes the new `state`. You pass `formAction` to `<form action>`. It replaces the old `useFormState` from react-dom. Calls queue in order, and a thrown error goes to the nearest Error Boundary. It is ideal for returning validation messages.

### Q4. How do forms work now? (Medium)
Pass a function to `<form action>`. React gives it the `FormData` inside a Transition, so there is no `onSubmit` plus `preventDefault`. After the function finishes without throwing, React **resets uncontrolled fields**. To keep a value, feed it back with `defaultValue` from state. Use `useFormStatus` in a child component (like a submit button) to read `pending`. It does not see a form it is not inside. `requestFormReset(form)` resets manually. For large forms with schemas, libraries are still common.

### Q5. Show a useOptimistic example. How does it revert? (Medium)
`const [optimistic, addOptimistic] = useOptimistic(messages, (current, text) => [...current, { text, sending: true }])`. In the Action, call `addOptimistic(text)` first, then `await` the server, then update the real state inside `startTransition`. While the Action is pending the UI shows the optimistic list. When the Action ends, whether it succeeded or failed, React shows the real `messages` again. On failure the temporary item simply disappears, so you also show an error message.

### Q6. What is the use hook? (Medium)
`use` reads a promise or a context during render. With a promise it suspends until it settles, and rejections go to an Error Boundary. With a context it works like `useContext`. It is not technically a hook: you can call it in conditions, loops and after early returns, but not in `try/catch`. The promise must be stable across renders (cache, loader or Server Component), never created fresh in a Client Component render.

### Q7. How does ref change in React 19? (Easy)
Function components receive `ref` as a normal prop, so `function Input({ ref, ...props })` works without `forwardRef`. `forwardRef` still works but is documented as deprecated. Callback refs can return a cleanup function, which React calls on unmount instead of calling the callback with `null`. `element.ref` is deprecated in favour of `element.props.ref`.

### Q8. What was removed in React 19, and how do you migrate? (Medium)
Removed: `ReactDOM.render`, `hydrate`, `unmountComponentAtNode`, `findDOMNode`, `propTypes` checks, `defaultProps` on function components, string refs, legacy context, `createFactory`, `react-dom/test-utils` (except `act`), `renderToNodeStream`. Migrate by going to 18.3.1 first and fixing its warnings, then running `npx codemod@latest react/19/migration-recipe`, and for TypeScript `npx types-react-codemod@latest preset-19`. `react-test-renderer` is deprecated; use Testing Library.

### Q9. What is the React Compiler? Do I still need useMemo? (Medium)
It is a build-time Babel plugin (1.0 released October 2025) that memoizes components and hooks automatically, so unnecessary re-renders and repeated calculations are skipped. It follows the Rules of React and skips code that breaks them. You write plain code by default. `useMemo` and `useCallback` stay as escape hatches, such as stabilising an Effect dependency. It does not speed up first mount.

### Q10. What did 19.2 and 19.3 add? (Hard)
19.2: `Activity` (hide UI while keeping state, Effects cleaned up), `useEffectEvent` (latest values inside Effects without dependencies), `cacheSignal`, Performance Tracks in Chrome DevTools, and partial pre-rendering APIs (`prerender` returns `postponed`, then `resume`). 19.3: stable `ViewTransition` and `addTransitionType` (animations only for updates inside a Transition), Fragment refs, `browser()`, Trusted Types support, and StrictMode running Effects twice during hydration. 19.3.1 only changed the Server Components transport.

### Q11. How are errors reported in React 19? (Hard)
Errors are reported once. Pass `onCaughtError` (caught by an Error Boundary), `onUncaughtError` (not caught) and `onRecoverableError` (React recovered, such as a hydration mismatch) to `createRoot` or `hydrateRoot`, and send them to a tracking service. Hydration mismatches now show a single diff.

## Common mistakes and gotchas
- Calling `useFormStatus` in the component that renders the `<form>`: move it to a child.
- Forgetting the `previousState` first parameter in a `useActionState` action: the signature is `(previousState, formData)`.
- State updates after an `await` in an Action without `startTransition`: wrap them (it also avoids a duplicate item with `useOptimistic`).
- Creating promises inside a Client Component and passing them to `use`: use a cache, a loader or a Server Component.
- Expecting form fields to keep their text after an Action: the reset is automatic, so use `defaultValue` from state.
- Missing `name` attributes: `FormData` only includes named fields.
- Implicit-return callback refs (`ref={(n) => (x = n)}`): use braces.
- Relying on `defaultProps`, `propTypes` or `ReactDOM.render` in new code: use default parameters, TypeScript and `createRoot`.
- Rendering a suspending component with sync `render()` in tests: use `await act(async () => ...)`.
- Calling `document.startViewTransition` yourself or expecting animation from a plain `setState`: wrap the update in `startTransition`.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.
1. **(Easy)** Explain: name five APIs removed in React 19 and what replaces each.

<details>
<summary>Show answer</summary>

`ReactDOM.render` (use `createRoot().render`), `findDOMNode` (use a DOM ref), `propTypes` (TypeScript), `defaultProps` on function components (default parameters), string refs (`useRef` or callback refs). Others: legacy context (`createContext`), `createFactory` (JSX), `unmountComponentAtNode` (`root.unmount()`), `react-dom/test-utils` (`act` from `react`).

</details>

2. **(Easy)** Predict what this renders in React 19, and fix it.
```jsx
function Badge(props) { return <b>{props.label}</b>; }
Badge.defaultProps = { label: 'new' };
export default function App() { return <Badge />; }
```

<details>
<summary>Show answer</summary>

It renders an empty `<b></b>`. React 19 ignores `defaultProps` on function components, so `props.label` is `undefined` (verified by running it). Fix: `function Badge({ label = 'new' }) { return <b>{label}</b>; }`.

</details>

3. **(Easy)** Coding task: rewrite this component without `forwardRef`, so the parent can still call `inputRef.current.focus()`.
```jsx
import { forwardRef } from 'react';
const Field = forwardRef(function Field(props, ref) {
  return <input ref={ref} {...props} />;
});
```

<details>
<summary>Show answer</summary>

```jsx
function Field({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```
The parent code does not change: `<Field ref={inputRef} />`. `ref` arrives as a normal prop.

</details>

4. **(Medium)** Coding task: build an "Add task" form with `useActionState`. If the title is empty, show "Title is required" and keep what was typed. Otherwise append the title to a list and clear the field. Disable the button with `useFormStatus` while it runs.

<details>
<summary>Show answer</summary>

```jsx
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

function AddButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Adding...' : 'Add'}</button>;
}

async function addTodo(previous, formData) {
  const title = String(formData.get('title')).trim();
  await new Promise((resolve) => setTimeout(resolve, 200));
  if (!title) return { ...previous, error: 'Title is required', title };
  return { todos: [...previous.todos, title], error: '', title: '' };
}

export default function Todos() {
  const [state, formAction] = useActionState(addTodo, { todos: [], error: '', title: '' });
  return (
    <form action={formAction}>
      <input name="title" aria-label="Title" defaultValue={state.title} />
      <AddButton />
      <p role="alert">{state.error}</p>
      <ul>{state.todos.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </form>
  );
}
```
The first parameter is the previous state; `defaultValue={state.title}` survives the automatic reset; the button is in a child so `useFormStatus` works.

</details>

5. **(Medium)** Predict: what does this button show while the form is submitting, and why? How do you fix it?
```jsx
function Form({ save }) {
  const { pending } = useFormStatus();
  return <form action={save}><button>{pending ? 'Saving' : 'Save'}</button></form>;
}
```

<details>
<summary>Show answer</summary>

It always shows "Save". `useFormStatus` reads the status of the form that is a **parent** of the calling component, and `Form` renders the form, it is not inside it (verified by running it). Fix: put the hook in a child component such as `SubmitButton` rendered inside the `<form>`, or use the `isPending` value from `useActionState`.

</details>

6. **(Medium)** Coding task: a `LikeButton` shows the like count. On click it should show `count + 1` immediately, call a slow `onLike()` promise, and go back to the real count if `onLike` fails. Use `useOptimistic`.

<details>
<summary>Show answer</summary>

```jsx
import { startTransition, useOptimistic, useState } from 'react';

function LikeButton({ likes, onLike }) {
  const [optimisticLikes, addLike] = useOptimistic(likes, (current, amount) => current + amount);

  function handleClick() {
    startTransition(async () => {
      addLike(1);
      try {
        await onLike();
      } catch {
        // the optimistic value is dropped when the Action ends
      }
    });
  }

  return <button onClick={handleClick}>Likes: {optimisticLikes}</button>;
}

export default function App() {
  const [likes, setLikes] = useState(10);
  async function like() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    startTransition(() => setLikes((n) => n + 1));
  }
  return <LikeButton likes={likes} onLike={like} />;
}
```
While `onLike` runs the button shows 11. On success the real state becomes 11. On failure the real state is still 10 and the button returns to 10. The setter is called inside an Action, as required.

</details>

7. **(Hard)** Explain why `const data = use(fetch('/api/items').then((r) => r.json()))` inside a Client Component is wrong. How do you fix it?

<details>
<summary>Show answer</summary>

Every render creates a brand-new promise. React suspends on it, retries, creates another new promise, and so on. With an instantly settled promise React 19.3.1 logs an "uncached promise" warning; with a slow one the component can loop on the fallback and never finish. `use` needs a **stable** promise. Create it outside render (a module-level cache keyed by id, or a library such as TanStack Query), receive it from a framework loader, or create it in a Server Component and pass it as a prop. Then `use(itemsPromise)` suspends once and resumes when it settles.

</details>

8. **(Hard)** Predict the console output and the visible text.
```jsx
// Counter logs 'setup' in an Effect and 'cleanup' in its cleanup, has a button "Count n".
// Steps: click "Count 0" once, then click Toggle (mode becomes 'hidden'), then Toggle again.
<Activity mode={mode}><Counter /></Activity>
```

<details>
<summary>Show answer</summary>

Console: `setup` on mount, `cleanup` when it becomes hidden, `setup` when it is visible again. While hidden, the button has `display: none` but its state is kept. After showing it again the button reads "Count 1" (verified by running it). `Activity` keeps state but destroys Effects while hidden, unlike conditional rendering, which loses state.

</details>

## Recap
- React 19 added Actions: async functions in transitions with automatic pending and error handling.
- Forms: `<form action={fn}>` gets `FormData`, resets uncontrolled fields, and pairs with `useActionState` (state) and `useFormStatus` (pending, child of the form only).
- `useOptimistic` shows a temporary value during an Action and drops it when the Action ends; wrap post-`await` updates in `startTransition`.
- `use` reads a stable promise or a context and may be called conditionally; it is not a hook.
- `ref` is a normal prop, ref callbacks can return cleanup, and `<Context value>` replaces `.Provider`.
- Metadata tags, stylesheets with `precedence`, preload APIs and root error callbacks reduce boilerplate.
- 19.2 added `Activity` and `useEffectEvent`; 19.3 added stable `ViewTransition` and Fragment refs; all are stable in 19.3.1.
- Migrate through 18.3.1, run `codemod react/19/migration-recipe`, and remember React Compiler 1.0 makes most manual memoization optional.

## Where to go next
- Next lesson: [SSR and Server Components](05-ssr-and-server-components.md), where Server Functions and `prerender` live.
- Related: [Concurrent React and Suspense](03-concurrent-react-and-suspense.md), [Other hooks](../02-hooks/09-other-hooks.md), [Forms with libraries](../03-intermediate/04-forms-with-libraries.md).
- Round files: [Concepts: rendering, state and modern React](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md) and [Output prediction](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md).
- Practice app: [Multi-step form](../practice-app/exercises/react/20-multi-step-form/README.md) and [Signup form validation](../practice-app/exercises/react/04-signup-form-validation/README.md); then rebuild them with `<form action>` and `useActionState`.
