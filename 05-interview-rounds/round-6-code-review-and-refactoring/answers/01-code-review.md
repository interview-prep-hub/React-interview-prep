# Round 6 - Code Review and Refactoring: Code Review Scenarios - Answers

**Questions:** [../questions/01-code-review.md](../questions/01-code-review.md)

**How to read these answers:** each answer lists the problems in priority order (Blocker first), gives the complete refactored code, and ends with a sentence you could say aloud in a review. Severity words: **Blocker** (do not merge: a bug, data loss or a security hole), **Major** (fix before merge: a likely bug or a real cost), **Minor** (fix soon, can be a follow-up), **Nit** (taste or style). The refactored code of every answer was run in the practice app with Vitest and Testing Library, and every behaviour of the broken code described as "in a test run" was observed the same way. See the [round README](../README.md) for the review checklist and the scoring rubric.

## State and lists

### R6-CR-001 (Easy) Todo list that mutates its state
**Answer:** The problems, in priority order:

1. **Blocker - the state is mutated.** `push`, `splice` and `todos[index].done = ...` change the array and objects that React already holds. Then `setTodos(todos)` passes back the same array. React compares the new state with the old state using `Object.is`, sees the same reference, and skips the render. In a test run, clicking a checkbox leaves it unchecked (the data says done, the screen says not done), and clicking the remove button leaves the row on screen although the array is already empty. "Add" only seems to work by luck: `setText('')` causes a render, and that render happens to read the changed array.
2. **Major - the parent's data is mutated too.** `useState(initialTodos)` keeps the same array that the parent passed in. In a test run, adding one todo made the parent's `initialTodos` array longer. Other components that read that array change without any render.
3. **Major - handlers use the array index.** `toggleTodo(index)` breaks as soon as the list can be filtered or sorted, because the index no longer points at the same todo. Use the id.
4. **Minor - weak ids.** `Date.now()` can give the same value twice in one millisecond, and duplicate keys cause odd bugs. Use `crypto.randomUUID()` (or an id from the server).
5. **Minor - empty todos and no Enter key.** The text is not trimmed or checked, and "Add" is not a form submit button.
6. **Minor - accessibility.** The text input has no label, and the "x" button has no accessible name (a screen reader just says "x").

**Refactored code:**

```jsx
import { useState } from 'react';

export function TodoList({ initialTodos }) {
  const [todos, setTodos] = useState(initialTodos);
  const [text, setText] = useState('');

  function addTodo(event) {
    event.preventDefault();
    const title = text.trim();
    if (!title) return;
    setTodos((prev) => [...prev, { id: crypto.randomUUID(), text: title, done: false }]);
    setText('');
  }

  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo))
    );
  }

  function removeTodo(id) {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }

  return (
    <div>
      <form onSubmit={addTodo}>
        <label>
          New todo
          <input value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <button type="submit">Add</button>
      </form>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
              />
              {todo.text}
            </label>
            <button
              type="button"
              aria-label={`Remove ${todo.text}`}
              onClick={() => removeTodo(todo.id)}
            >
              x
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**What changed:** every update builds a new array (`[...prev, item]`, `map`, `filter`) and a new object for the todo that changes (`{ ...todo, done: !todo.done }`). The functional form `setTodos((prev) => ...)` always starts from the latest state. Handlers receive the id. The form gives you Enter-to-add for free, and the labels give each control a name.

**What to say in the review:** "I would block the merge because ticking and removing a todo do nothing on screen. The code changes the array in place and sets the same array back, so React sees no change and skips the render. It also changes the data the parent gave us. Please use functional updates with map and filter, and use the todo id instead of the index. The labels and the empty-text check are smaller things I would fix in the same pass."
**Why it matters / follow-up:** The interviewer may ask: "What if you wrote `setTodos([...todos])` after mutating?" It renders, but the objects inside are still shared with the parent and with older renders, which breaks memoized children and anything that compares by reference. Also be ready to explain how Immer lets you write mutating-looking code that stays immutable.
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md), [State and events](../../../01-basics/05-state-and-events.md)

### R6-CR-002 (Easy) Shortlist with index keys
**Answer:** The problems, in priority order:

1. **Blocker - `key={index}`.** React uses the key to decide which row is which between renders. With index keys, row identity is the position. After you remove Ann, Bob moves to index 0, so React reuses the first `Row` instance, together with its private `note` state, for Bob. In a test run, typing a note for Ann and then removing Ann left Bob's note box showing Ann's note. Sorting has the same problem. Use a stable, unique id from the data: `key={item.id}`.
2. **Minor - the remove handler reads `items` from the closure** and removes by index. Use a functional update and remove by id, so two quick updates cannot overwrite each other.
3. **Nit - buttons without `type`.** Harmless here (there is no form), but `type="button"` avoids surprises if the list is ever put inside a form.
4. **Good - praise it in the review.** `[...items].sort(...)` copies the array first. `items.sort(...)` would mutate state.

Do not fix missing ids with `key={Math.random()}`: a new key on every render makes React throw away and rebuild every row each time, losing focus and state. If the data has no ids, create them once when the data is loaded, not while rendering. Index keys are acceptable only for a static list that never reorders, inserts or deletes, and whose rows hold no state.

**Refactored code:**

```jsx
import { useState } from 'react';

function Row({ item, onRemove }) {
  const [note, setNote] = useState('');
  return (
    <li>
      {item.name}
      <input
        aria-label={`Note for ${item.name}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button type="button" onClick={onRemove}>
        Remove {item.name}
      </button>
    </li>
  );
}

export function Shortlist({ initial }) {
  const [items, setItems] = useState(initial);

  function sortByName() {
    setItems((prev) => [...prev].sort((a, b) => a.name.localeCompare(b.name)));
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div>
      <button type="button" onClick={sortByName}>
        Sort A-Z
      </button>
      <ul>
        {items.map((item) => (
          <Row key={item.id} item={item} onRemove={() => removeItem(item.id)} />
        ))}
      </ul>
    </div>
  );
}
```

**What to say in the review:** "I would block the merge because index keys glue each row's private state to its position, not to the person. After removing a row, the next candidate inherits the note. Please key by `item.id`, and remove by id with a functional update."
**Why it matters / follow-up:** The interviewer may ask where the note should live. State inside `Row` is lost if the row unmounts (for example when a filter hides it). If notes must survive, store them in the parent's data next to the item. Another follow-up: what does React do with keys on a reorder (it moves the existing DOM nodes instead of rebuilding them).
**Learn more:** [Conditional rendering and lists](../../../01-basics/06-conditional-rendering-and-lists.md), [How React renders](../../../04-advanced/01-how-react-renders.md)

### R6-CR-003 (Easy) Cart with derived state in effects
**Answer:** The problems, in priority order:

1. **Major - derived values are stored in state and synced with effects.** `subtotal`, `total` and `visible` can all be calculated from `items`, `taxRate` and `onlyInStock`. Keeping a copy in state creates a second source of truth. The effects run after the render, so the first screen shows `0.00`, then a second render fixes the subtotal, then a third render fixes the total. The user can see wrong numbers, and any code path that forgets to update one copy leaves the screen out of sync. I would ask for this change before merging.
2. **Major - `useState(items)` for `visible`** copies a prop into state. When the prop changes, the copy is stale until an effect catches up. Remove it.
3. **Minor - money with floating point.** `subtotal * (1 + taxRate)` can give results such as `11.000000000000002`. `toFixed(2)` hides it on screen only. For real money, store integer cents and round once.
4. **Nit - do not reach for `useMemo` by reflex.** A `reduce` over a small cart is cheap. Add `useMemo` only if the Profiler shows this calculation is slow.

**Refactored code:**

```jsx
import { useState } from 'react';

export function Cart({ items, taxRate }) {
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Derived values: calculated from props and state during render.
  const visible = onlyInStock ? items.filter((item) => item.inStock) : items;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = subtotal * (1 + taxRate);

  return (
    <section>
      <label>
        <input
          type="checkbox"
          checked={onlyInStock}
          onChange={(e) => setOnlyInStock(e.target.checked)}
        />
        Only in stock
      </label>
      <ul>
        {visible.map((item) => (
          <li key={item.id}>
            {item.name} x {item.qty}
          </li>
        ))}
      </ul>
      <p>Subtotal: {subtotal.toFixed(2)}</p>
      <p>Total: {total.toFixed(2)}</p>
    </section>
  );
}
```

**What changed:** only `onlyInStock` is real state, because it is something the user chooses. Everything else is calculated during the render from props and state, so it is always correct and there are no extra renders. Effects are for talking to things outside React, not for copying values between state variables.

**What to say in the review:** "These three values can be calculated from the props and one checkbox, so they should not be state. With effects syncing them we render three times and the first paint shows zeros. Please compute them in the render body; there is nothing to sync."
**Why it matters / follow-up:** The interviewer may ask: "Is it ever fine to copy a prop into state?" Yes, for an initial value the user then edits (name it `initialX`), and you can reset it by changing the component's `key`. Another follow-up: when would you add `useMemo` (a measured slow calculation with stable inputs).
**Learn more:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md), [useEffect](../../../02-hooks/03-useeffect.md)

## Effects and data fetching

### R6-CR-004 (Medium) Contact form that sends from an effect
**Answer:** The problems, in priority order:

1. **Blocker - the submit logic lives in an effect.** "Send the form" is the answer to a user action, so it belongs in the submit handler. Here, the click only sets `submitted`, and an effect that depends on `submitted`, `email` and `message` does the work. `submitted` stays true until the request ends, so every keystroke during the request runs the effect again and sends the form again. In a test run, submitting and then typing two characters made `fetch` run 3 times.
2. **Blocker - errors are treated as success.** `fetch` only rejects on network failure. For HTTP 500 it resolves, so `.then(() => setSent(true))` runs, `onSent()` is called and the form is cleared. The user's message is lost, and the user is told it was sent. There is also no `.catch`: on a network failure `submitted` stays true and the button stays disabled forever.
3. **Major - an effect chain.** `submitted` triggers an effect that sets `sent`, which triggers another effect that sets four more states. That is three renders and a flow nobody can follow. `onSent` in the dependency list makes it fragile if the parent passes a new function every render.
4. **Minor - no feedback and no button type.** The user sees nothing while sending or when it fails.

**Refactored code:**

```jsx
import { useState } from 'react';

export function ContactForm({ onSent }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'error'

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message }),
      });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
    } catch {
      setStatus('error');
      return;
    }
    setEmail('');
    setMessage('');
    setStatus('idle');
    onSent();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Email
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Message
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      {status === 'error' && (
        <p role="alert">Could not send your message. Please try again.</p>
      )}
      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
```

**What changed:** the work happens once, in `handleSubmit`. One `status` value (`idle`, `sending` or `error`) replaces the two booleans, and the button is disabled while sending. The form is cleared and `onSent` is called only after the server answered with a success status. A failure shows a message and keeps what the user typed.

**What to say in the review:** "I would block the merge because pressing Send can post the same message many times, and a server error is treated as success and wipes the form. The sending code should live in the submit handler, not in an effect, and we must check `res.ok` before clearing anything."
**Why it matters / follow-up:** The interviewer may ask when an effect is right for a request: when the request should happen because the component is on screen (for example, loading data or logging a page view), not because of a click. A good follow-up is how React 19 Actions with `useActionState` would simplify the pending and error handling.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md), [React 19 and newer](../../../04-advanced/04-react-19-and-newer.md)

### R6-CR-005 (Medium) Countdown with a stale closure and no cleanup
**Answer:** The problems, in priority order:

1. **Blocker - a stale closure.** The effect runs once, so the interval callback keeps the value of `left` from the first render. Every tick does `setLeft(3 - 1)`. In a test run with `seconds={3}`, the text showed "2 seconds left" and stayed there, and `onDone` was never called.
2. **Blocker - the interval is never cleared.** There is no cleanup function. After the component unmounts, the timer keeps running (in a test run one timer was still pending after unmount). In development, StrictMode mounts, unmounts and mounts again to expose exactly this, so you would get two intervals.
3. **Major - the resize listener is never removed.** Each mount adds another listener, and the anonymous arrow function could not be removed anyway, because `removeEventListener` needs the same function reference.
4. **Major - the `eslint-disable` hides the cause of problem 1.** The exhaustive-deps rule was warning about the missing `left` and `onDone`. Do not silence it; fix the code.
5. **Minor - `onDone` is also stale.** It is captured from the first render too.
6. **Minor - `useState(window.innerWidth)`** reads `window` on every render and fails when the component renders on a server. Use a lazy initializer for the client, and `useSyncExternalStore` if you must support server rendering.

**Refactored code:**

```jsx
import { useEffect, useEffectEvent, useState } from 'react';

export function Countdown({ seconds, onDone }) {
  const [left, setLeft] = useState(seconds);
  const [width, setWidth] = useState(() => window.innerWidth);

  // Always calls the latest onDone, without making the timer effect depend on it.
  const handleDone = useEffectEvent(() => onDone());

  useEffect(() => {
    if (left <= 0) {
      handleDone();
      return;
    }
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <p>
      {left} seconds left (window is {width}px wide)
    </p>
  );
}
```

**What happens, step by step:**
1. First render: `left` is 3. The effect schedules one timeout for 1 second.
2. After 1 second the timeout runs `setLeft((s) => s - 1)`. The functional update never reads a stale value.
3. `left` changed, so React runs the cleanup (clears the old timeout) and the effect again, which schedules the next timeout.
4. When `left` is 0, the effect calls `handleDone()` once and schedules nothing.
5. On unmount, the cleanup clears the pending timeout and the resize listener is removed.

`useEffectEvent` (stable since React 19.2) wraps `onDone` so the effect can call the latest version without listing it as a dependency. Call it only from inside effects, and never pass it to children.

**What to say in the review:** "I would block the merge because the countdown gets stuck on 2 and `onDone` never fires: the interval keeps the first value of `left`. The timer and the resize listener are also never cleaned up. Please remove the eslint-disable; the rule was pointing at the bug."
**Why it matters / follow-up:** The interviewer may ask: "A chain of timeouts drifts a little. How do you build an accurate timer?" Store a deadline (`Date.now() + seconds * 1000`) and compute the remaining time from the clock on each tick. Another follow-up: extract the resize logic into a `useWindowWidth` custom hook.
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md), [Custom hooks](../../../02-hooks/08-custom-hooks.md), [Other hooks](../../../02-hooks/09-other-hooks.md)

### R6-CR-006 (Hard) Search box with a fetch race
**Answer:** The problems, in priority order:

1. **Blocker - no error handling.** There is no `.catch`, and `isLoading` is only turned off on the success path. After a network failure the "Loading..." text stays forever. `isError` is declared and rendered but never set, so it is dead code.
2. **Blocker - `res.ok` is not checked.** `fetch` resolves for 404 and 500. `res.json()` then gives an error object (or throws on an HTML body), `setUsers(data)` stores a non-array, and `users.map` throws "not a function". With no error boundary the whole screen disappears.
3. **Blocker - a race condition.** Type "a", then "ab": two requests are in flight. If the response for "a" arrives after the response for "ab", it overwrites the newer data. The input says "ab" but the list shows results for "a". Cancel the old request in the effect cleanup with an `AbortController` (an "ignore" flag also works but only drops the result; abort also stops the network work).
4. **Major - two booleans allow impossible states.** `isLoading` and `isError` can both be true. Use one `status` value: `loading`, `success` or `error`.
5. **Major - the query is not URL-encoded.** `a&b` or `#` would break the URL. Use `encodeURIComponent`.
6. **Minor - one request per keystroke, no label, no empty state.** Debounce the input (or use `useDeferredValue`), label the input, and show "No users found."

In a real project I would also say: "this is what TanStack Query is for." It already handles caching, cancelling, retries and the status states.

**Refactored code:**

```jsx
import { useEffect, useState } from 'react';

export function UserSearch() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');

    fetch(`/api/users?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setUsers(data);
        setStatus('success');
      })
      .catch((error) => {
        if (error.name === 'AbortError') return; // a newer request replaced this one
        setStatus('error');
      });

    return () => controller.abort();
  }, [query]);

  return (
    <div>
      <label>
        Search users
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {status === 'loading' && <p role="status">Loading...</p>}
      {status === 'error' && <p role="alert">Could not load users. Please try again.</p>}
      {status === 'success' && users.length === 0 && <p>No users found.</p>}
      {status === 'success' && (
        <ul>
          {users.map((user) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**What happens, step by step:**
1. The effect runs when `query` changes. It creates an `AbortController`, sets `status` to `loading` and starts the request with the controller's `signal`.
2. If the user types again, React runs the cleanup first: `controller.abort()` rejects the old request with an `AbortError`.
3. The `catch` ignores `AbortError` on purpose, because a newer request has replaced it. Any other error sets `status` to `error`.
4. A non-2xx response throws before the body is used, so it also ends in `error`.
5. In development StrictMode runs the effect twice. The first request is aborted and only the second one counts, which is the proof that the cleanup works.

**What to say in the review:** "I would block the merge for three reasons. A failed request leaves the spinner on forever. A 500 response is stored as the user list and crashes the page. And a slow old response can overwrite the newest one, so the list can disagree with the input. I suggest abort in the cleanup, an ok check, and a single status value."
**Why it matters / follow-up:** The interviewer may ask why we check `error.name === 'AbortError'`, and what happens if the abort comes after the response has already arrived (nothing: aborting a finished request does nothing). Expect a question about debouncing and about when to use TanStack Query instead of hand-written effects.
**Learn more:** [Data fetching](../../../03-intermediate/02-data-fetching.md), [useEffect](../../../02-hooks/03-useeffect.md)

## Hooks and components

### R6-CR-007 (Medium) Settings form with a hook after a return and an inner component
**Answer:** The problems, in priority order:

1. **Blocker - a hook is called after an early return.** `useState` for `bio` only runs when `settings` exists. Hooks must be called in the same order on every render. When `settings` changes from `undefined` to an object, React sees one more hook than before and throws "Rendered more hooks than during the previous render." In a test run the screen crashed exactly when the data arrived.
2. **Blocker - a component is defined inside another component.** `Field` is a new function on every render, so React treats it as a different component type. It throws away the old inputs and builds new ones on every state change. In a test run, typing `xyz` into the Name field (starting value "Ann") produced "Annx": the input was replaced after the first letter, so it lost focus and the rest of the typing went nowhere. It also wastes work and loses any state inside `Field`.
3. **Major - initial state read from a prop that is not ready.** `useState(settings?.name ?? '')` runs on the first render, when `settings` is still `undefined`, so `name` starts as an empty string and never receives the loaded value (initial state is only used once).
4. **Minor - the form has no submit button or handler.** Fine for a snippet, but ask what "save" does.

**Refactored code:**

```jsx
import { useState } from 'react';

// Defined once at module level, so its identity is stable between renders.
function Field({ label, value, onChange }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// Only rendered when settings exist, so its hooks always run in the same order.
function SettingsFields({ settings }) {
  const [name, setName] = useState(settings.name);
  const [bio, setBio] = useState(settings.bio);

  return (
    <form>
      <Field label="Name" value={name} onChange={setName} />
      <Field label="Bio" value={bio} onChange={setBio} />
    </form>
  );
}

export function SettingsForm({ settings }) {
  if (!settings) {
    return <p>Loading settings...</p>;
  }
  return <SettingsFields settings={settings} />;
}
```

**What changed:** `Field` lives at module level, so its identity is stable. The component is split in two: `SettingsForm` only decides between "loading" and "ready" (it has no hooks, so an early return is safe), and `SettingsFields` is rendered only when `settings` exists, so its `useState` calls always get real values. If the settings can change to another record later, give the inner component a key, for example `key={settings.id}`, so its state resets.

**What to say in the review:** "I would block the merge because this crashes when the data arrives: a hook is called after an early return. Also `Field` is defined inside the component, so every keystroke remounts the input and the user loses focus. Please move `Field` out and split the loading gate from the form."
**Why it matters / follow-up:** The interviewer may ask why calling a plain function like `renderField(...)` inside the component is different (it returns elements and does not create a new component type, so there is no remount), and why the rules of hooks need a stable call order (React stores hooks in a list by position).
**Learn more:** [Hooks overview and rules](../../../02-hooks/01-hooks-overview-and-rules.md), [Components and props](../../../01-basics/04-components-and-props.md)

## Accessibility, security and types

### R6-CR-008 (Medium) Signup form that keyboard and screen reader users cannot use
**Answer:** The problems, in priority order:

1. **Blocker - `div`s used as buttons.** A `<div onClick>` cannot be reached with the Tab key, does not react to Enter or Space, and has no role, so a screen reader does not announce a button. Keyboard and screen reader users cannot sign up. This also applies to "Terms" and to the `<i>` close icon. Use `<button>`: you get focus, keyboard support and the role for free.
2. **Blocker - the input has no label.** A `<span>Email</span>` next to an input is not connected to it, and a placeholder is not a label (it disappears while typing and is not reliably announced). Use `<label htmlFor>` and an `id`. `useId` gives ids that stay unique if the form is rendered twice.
3. **Blocker - the error is invisible to assistive technology and uses colour only.** Add `role="alert"` so it is announced when it appears, `aria-invalid` on the input, and `aria-describedby` to link the input to the message. Put the word "Error" in the text so colour is not the only signal.
4. **Major - it is not a form.** Pressing Enter in the input does nothing. Use `<form onSubmit>` with `event.preventDefault()` and a submit button.
5. **Major - the close icon has no accessible name.** Use a button with `aria-label="Close terms"` and hide the decorative symbol with `aria-hidden`.
6. **Major - the image has no `alt`.** A screen reader may read the file name. Describe it (`alt="Acme"`), or use `alt=""` if it is purely decoration.
7. **Minor - the Terms toggle does not say whether it is open.** Add `aria-expanded` and `aria-controls`. Use a functional update for the toggle.

**Refactored code:**

```jsx
import { useId, useState } from 'react';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const id = useId();
  const emailId = `${id}-email`;
  const errorId = `${id}-email-error`;
  const termsId = `${id}-terms`;

  function handleSubmit(event) {
    event.preventDefault();
    setError(email.includes('@') ? '' : 'Enter an email address like name@example.com.');
  }

  return (
    <form className="signup" onSubmit={handleSubmit} noValidate>
      <img src="/logo.png" alt="Acme" />
      <label htmlFor={emailId}>Email</label>
      <input
        id={emailId}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert" className="field-error">
          Error: {error}
        </p>
      )}
      <button type="submit">Sign up</button>
      <button
        type="button"
        aria-expanded={showTerms}
        aria-controls={termsId}
        onClick={() => setShowTerms((open) => !open)}
      >
        Terms
      </button>
      {showTerms && (
        <div id={termsId} className="terms">
          <p>By signing up you agree to be kind to other users.</p>
          <button type="button" aria-label="Close terms" onClick={() => setShowTerms(false)}>
            <span aria-hidden="true">x</span>
          </button>
        </div>
      )}
    </form>
  );
}
```

**What to say in the review:** "I would block the merge because people using a keyboard or a screen reader cannot use this form: the buttons are divs, so Tab skips them. The input has no label, and the error is not announced. All of this is fixed by using real elements: a form, a label, and buttons. A good check is that every query by role or label in a test finds the element."
**Why it matters / follow-up:** The interviewer may ask how you would test it (Testing Library queries `getByRole` and `getByLabelText` only work if the markup is accessible, so they double as an accessibility check) and when `role="alert"` is too noisy (use `aria-live="polite"` for non-urgent messages).
**Learn more:** [Accessibility](../../../04-advanced/09-accessibility.md), [Forms](../../../01-basics/07-forms.md)

### R6-CR-009 (Medium) Comment list open to XSS
**Answer:** The problems, in priority order:

1. **Blocker - `dangerouslySetInnerHTML` with text written by other users.** This is stored cross-site scripting (XSS). A comment body such as `<img src=x onerror=...>` runs script in the browser of everyone who views the post, and that script can read data and act as the viewer. React escapes text for you by default; this prop turns that protection off (that is why it has the word "dangerously" in it). Render the body as text: `<p>{comment.body}</p>`. If you really need rich text, sanitize it with a maintained library such as DOMPurify (with a tag allow-list) or on the server, or store Markdown and render it with a safe renderer. Add a Content-Security-Policy as a second layer.
2. **Blocker - a user-controlled `href`.** `javascript:alert(1)` as the website runs script when clicked. Do not rely on React to stop it. Allow only `http:` and `https:` URLs, as in the `safeUrl` helper below. For `target="_blank"` add `rel="noopener noreferrer"`, and `nofollow ugc` marks links written by users.
3. **Major - the auth token is read from `localStorage`.** Any script on the page, including the XSS above or a compromised dependency, can read it. Prefer an HttpOnly, Secure, SameSite cookie set by the server: JavaScript cannot read it, and the browser sends it when you use `credentials: 'include'`. HttpOnly limits the damage (the token cannot be stolen), but an XSS can still make requests as the user, so problems 1 and 2 still matter. This is an architecture change with server work (and CSRF protection), so raise it clearly in the review instead of hiding it in a small edit.
4. **Major - no error handling or cancel on the request**, and `postId` is not encoded in the URL (see R6-CR-006).

**Refactored code:**

```jsx
import { useEffect, useState } from 'react';

// Only allow web links. Anything else (javascript:, data:, relative text) returns null.
export function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function Comment({ comment }) {
  const website = safeUrl(comment.website);
  return (
    <article>
      <h4>{comment.author}</h4>
      <p>{comment.body}</p>
      {website && (
        <a href={website} target="_blank" rel="noopener noreferrer nofollow ugc">
          Website of {comment.author}
        </a>
      )}
    </article>
  );
}

export function CommentList({ postId }) {
  const [comments, setComments] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');

    // The session cookie (HttpOnly, set by the server) travels with the request.
    // No token is read from JavaScript-accessible storage.
    fetch(`/api/posts/${encodeURIComponent(postId)}/comments`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setComments(data);
        setStatus('success');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setStatus('error');
      });

    return () => controller.abort();
  }, [postId]);

  if (status === 'loading') return <p role="status">Loading comments...</p>;
  if (status === 'error') return <p role="alert">Could not load comments.</p>;

  return comments.map((comment) => <Comment key={comment.id} comment={comment} />);
}
```

**What to say in the review:** "I would block the merge because comments are written by other users and we insert them as raw HTML, so one bad comment runs script in every reader's browser. The website link has the same problem with javascript: URLs. Please render the body as text and only allow http and https links. Separately, I would like us to move the auth token out of localStorage into an HttpOnly cookie."
**Why it matters / follow-up:** The interviewer may ask: "Does React protect you completely from XSS?" No. It escapes text, but `dangerouslySetInnerHTML`, unchecked URLs in `href` or `src`, and untrusted HTML in other places are still your job. They may also ask what a CSP does (it limits which scripts the browser may run).
**Learn more:** [Security and i18n](../../../04-advanced/10-security-and-i18n.md), [Data fetching](../../../03-intermediate/02-data-fetching.md)

### R6-CR-010 (Medium) Editor that switches TypeScript off with any
**Answer:** The problems, in priority order:

1. **Blocker - the type lies about the age.** `[e.target.name]: e.target.value` always writes a string. After the user edits the age, `data.age` is `"31"` (a string) although `User.age` is a number, and `onSave` receives the wrong shape. TypeScript cannot warn because `data` is `any`. Keep the input text in string state, then convert and validate it on submit.
2. **Major - `any` for the props and the state.** `user: any` and `useState<any>` turn checking off: `data.nmae` compiles. The `User` type already exists but is not used.
3. **Major - `onSave: Function`.** The `Function` type accepts any function, so the parameters and the return value are not checked (`onSave(1, 2, 3)` compiles). Write `(user: User) => void`.
4. **Major - `res.json()` is `any` and `json as User` is a cast, not a check.** A cast only tells TypeScript to trust you. If the server answers with another shape, the failure happens later, far from the cause. Read the value as `unknown` and check it with a type guard (or a schema library such as Zod). `res.ok` and errors are also not handled.
5. **Major - event handlers typed `(e: any)`.** A typo such as `e.target.valu` compiles. Remove the annotation (inline handlers are inferred) or use `ChangeEvent<HTMLInputElement>` and `FormEvent<HTMLFormElement>`.
6. **Minor - non-null assertions.** `useRef<HTMLInputElement>(null!)` and `nameRef.current!.focus()` silence the check "this can be null". If the input is not mounted, it crashes at runtime. Use `useRef<HTMLInputElement>(null)` and `nameRef.current?.focus()`.
7. **Minor - the inputs have no labels** (see R6-CR-008).

**Refactored code:**

```tsx
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

export type User = { id: number; name: string; age: number };

type Props = {
  user: User;
  onSave: (user: User) => void;
};

// A type guard: checks the data at runtime, then tells TypeScript the result is a User.
function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'number' && typeof v.name === 'string' && typeof v.age === 'number';
}

export function UserEditor({ user, onSave }: Props) {
  const [name, setName] = useState(user.name);
  const [age, setAge] = useState(String(user.age)); // an input always holds a string
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  async function reload() {
    try {
      const res = await fetch(`/api/users/${user.id}`);
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const json: unknown = await res.json();
      if (!isUser(json)) throw new Error('Unexpected response shape');
      setName(json.name);
      setAge(String(json.age));
      setError(null);
    } catch {
      setError('Could not reload the user.');
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge) || parsedAge < 0) {
      setError('Age must be a whole number.');
      return;
    }
    setError(null);
    onSave({ id: user.id, name, age: parsedAge });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name
        <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Age
        <input value={age} inputMode="numeric" onChange={(e) => setAge(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={reload}>
        Reload
      </button>
      <button type="button" onClick={() => nameRef.current?.focus()}>
        Focus name
      </button>
      <button type="submit">Save</button>
    </form>
  );
}
```

**What changed:** `any` is gone. The props and state have real types, and a type guard (`value is User`) checks the server data at runtime. The age is a string while the user types and a number in the saved data. The refactored component was run under Vitest (types are removed there), so treat the type-level claims as something to confirm with `tsc` in your own project.

**What to say in the review:** "I would not merge this as is. `any` switches TypeScript off in the places where it would help most, and it already hides a real bug: after editing the age we send a string where the type says number. Please type the props, keep the age as text in the form and parse it on submit, and validate the server response before trusting it."
**Why it matters / follow-up:** The interviewer may ask about `unknown` versus `any` (`unknown` forces you to check before use, `any` lets anything through), when `as` is acceptable, and what a schema library adds (one definition for both the runtime check and the type).
**Learn more:** [TypeScript with React](../../../03-intermediate/08-typescript-with-react.md), [Forms](../../../01-basics/07-forms.md)

## Performance and structure

### R6-CR-011 (Hard) A memo that never skips
**Answer:** The problems, in priority order:

1. **Major - three new references on every render defeat `memo`.** `memo` compares each prop with `Object.is`. On every `Dashboard` render, `data` is a new array (from `filter` and `map`), `options` is a new object literal, and `onSelect` is a new arrow function. All three differ from the last render, so `PriceChart` renders again every time. The `memo` wrapper costs a comparison and saves nothing, and the slow chart redraws after every click.
2. **Major - the expensive calculation runs on every render.** `trades.filter(...).map(...)` runs even when only the theme or the selection changed. Here it is worth a `useMemo` because the list is big and the chart is slow.
3. **Minor - the parent must cooperate.** `useMemo` keyed on `trades` only helps if the parent passes the same `trades` array between renders. Check that, or the fix does nothing.
4. **Minor - measure, and consider other designs.** Open the React DevTools Profiler and use "why did this render" before and after. If the project uses React Compiler, it can memoize this automatically and the manual code becomes noise, so ask. You can also avoid the problem by moving the state down (the theme toggle in its own component) or by passing the chart as `children`.

**Refactored code:**

```jsx
import { memo, useMemo, useState } from 'react';
import { Chart } from './Chart';

// One object per theme, created once at module level. Its identity never changes.
const CHART_OPTIONS = {
  light: { animate: false, color: '#000' },
  dark: { animate: false, color: '#fff' },
};

const PriceChart = memo(function PriceChart({ data, options, onSelect }) {
  return <Chart data={data} options={options} onSelect={onSelect} />;
});

export function Dashboard({ trades }) {
  const [theme, setTheme] = useState('light');
  const [selected, setSelected] = useState(null);

  // Recalculated only when the trades array itself changes.
  const data = useMemo(
    () => trades.filter((trade) => trade.valid).map((trade) => ({ x: trade.time, y: trade.price })),
    [trades]
  );

  return (
    <div className={theme}>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle theme
      </button>
      {/* setSelected is stable: React keeps the same function between renders. */}
      <PriceChart data={data} options={CHART_OPTIONS[theme]} onSelect={setSelected} />
      <p>{selected ? `Selected price: ${selected.y}` : 'Nothing selected'}</p>
    </div>
  );
}
```

**What changed, one reference at a time:**
- `data`: `useMemo` with `[trades]`. The array is rebuilt only when `trades` changes.
- `options`: two constant objects at module level. A value that never changes needs no hook.
- `onSelect`: `setSelected` itself. State setter functions have a stable identity, so no wrapper (and no `useCallback`) is needed.

In a test run, the chart rendered once at the start and stayed at one render after a click on a point. Toggling the theme made it render a second time, which is correct, because the options really changed.

**What to say in the review:** "I would not merge this yet, because the memo does not do anything: it gets a new array, a new object and a new function on every render, so it never skips. I suggest a stable reference for each of the three props. Please attach a before and after Profiler capture so we know it worked."
**Why it matters / follow-up:** The interviewer may ask how `memo`, `useMemo` and `useCallback` relate (all three are about keeping the same reference or skipping work), what a stable `children` prop does, and what React Compiler changes.
**Learn more:** [Memoization](../../../02-hooks/07-memoization.md), [Performance optimization](../../../04-advanced/02-performance-optimization.md)

### R6-CR-012 (Medium) Memoizing everything, including a bug
**Answer:** The problems, in priority order:

1. **Blocker - a real bug, hidden by memoization.** `tagCount` uses `useMemo(() => user.tags.length, [])`. The empty dependency list means it is calculated once and never updated. In a test run, when the tags changed from two to one, the card showed "2 tags" next to a single badge. The exhaustive-deps rule would have warned about it. Memoization is an optimisation, not a correctness tool: if removing a `useMemo` changes the behaviour, the code was wrong.
2. **Major - memoizing work that is cheaper than the memoization.** Joining two strings, comparing a string and reading `length` take almost no time. Each hook adds a closure, a dependency array, a comparison on every render, a cached value in memory, and more code to read. The overhead is larger than the saving.
3. **Major - `useCallback` for a handler that goes to a DOM element.** A plain `<button>` does not skip anything when its props stay equal. `useCallback` helps only when the function is passed to a `memo` child or is a dependency of another hook, and only when that matters.
4. **Minor - `memo(Badge)`, a memoized style object and memoized JSX.** `Badge` renders one `<span>`, so the prop comparison costs about as much as the render. A constant style object can simply be written inline, and caching a list of elements saves almost nothing.
5. **Process - memoize because you measured.** Show a Profiler capture first. If React Compiler is on, manual memoization is mostly unnecessary.

**Refactored code:**

```jsx
function Badge({ label }) {
  return <span className="badge">{label}</span>;
}

export function ProfileCard({ user, onFollow }) {
  const fullName = `${user.first} ${user.last}`;
  const initials = `${user.first[0]}${user.last[0]}`;
  const isAdmin = user.role === 'admin';

  return (
    <div style={{ padding: 8 }}>
      <h3>
        {fullName} ({initials}){isAdmin && ' - admin'}
      </h3>
      <p>{user.tags.length} tags</p>
      {user.tags.map((tag) => (
        <Badge key={tag} label={tag} />
      ))}
      <button onClick={() => onFollow(user.id)}>Follow</button>
    </div>
  );
}
```

**What changed:** all the hooks are gone, and the component is easier to read and correct. If a profile later shows that `ProfileCard` is a bottleneck, add `memo` to the component with evidence.

**What to say in the review:** "There is a real bug here: `tagCount` has an empty dependency list, so the count goes stale when the tags change. The rest of the memoization costs more than it saves. I would remove all of it, and add `memo` or `useMemo` later only where a Profiler capture shows a problem."
**Why it matters / follow-up:** The interviewer may ask when you would keep `useCallback` (the function goes to a memoized child or into a dependency array, and profiling shows renders are expensive), and whether `memo` helps when the parent passes `children` JSX (no: JSX is a new object on every render).
**Learn more:** [Memoization](../../../02-hooks/07-memoization.md), [Performance optimization](../../../04-advanced/02-performance-optimization.md)

### R6-CR-013 (Medium) Prop drilling, and the opposite mistake
**Answer:** The problems, in priority order:

1. **Major (a design smell, not a blocker) - prop drilling.** `user` passes through `Layout` and `Header`, which never use it, only to reach `UserMenu` and `Avatar`. Every layer must know about `user`, a new field means touching four files, and `Layout` and `Header` cannot be reused without it. Drilling through two or three layers is normal. Four layers with two pure pass-throughs is the point to change the structure.
2. **Watch for the opposite smell: one global context for everything.** The suggestion "just put everything in one context" has a cost. Every consumer re-renders whenever any value in that context changes, and components secretly depend on a provider being above them, which makes them harder to reuse and test. Context is a good fit for values that many components at different depths need and that change rarely (current user, theme, language). Split contexts by topic, and keep server data in a data library.

There are two good fixes. Choose by how many distant components need the value.

**Option A (first choice here): composition.** `App` builds the element and passes it down as a slot. `Layout` and `Header` no longer know about users.

```jsx
import { useState } from 'react';

// Option A: composition. App builds the pieces and hands them to the layout as slots.
export function App() {
  const [user] = useState({ name: 'Asha', avatarUrl: '/asha.png' });

  return (
    <Layout header={<Header menu={<UserMenu user={user} />} />}>
      Page content
    </Layout>
  );
}

function Layout({ header, children }) {
  return (
    <div>
      {header}
      <main>{children}</main>
    </div>
  );
}

function Header({ menu }) {
  return (
    <header>
      <Logo />
      {menu}
    </header>
  );
}

function Logo() {
  return <strong>Acme</strong>;
}

function UserMenu({ user }) {
  return (
    <div>
      <Avatar user={user} />
      <span>{user.name}</span>
    </div>
  );
}

function Avatar({ user }) {
  return <img src={user.avatarUrl} alt={user.name} />;
}
```

**Option B: context.** Use it when many components at different depths need the user. A custom hook with a guard gives a clear error when the provider is missing. In React 19 you can render the context itself as the provider (`<UserContext value={user}>`).

```jsx
import { createContext, useContext, useState } from 'react';

// Option B: context. Only the components that need the user read it.
const UserContext = createContext(null);

function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error('useUser must be used inside <UserProvider>');
  return user;
}

function UserProvider({ user, children }) {
  return <UserContext value={user}>{children}</UserContext>;
}

export function App() {
  const [user] = useState({ name: 'Asha', avatarUrl: '/asha.png' });

  return (
    <UserProvider user={user}>
      <Layout />
    </UserProvider>
  );
}

function Layout() {
  return (
    <div>
      <Header />
      <main>Page content</main>
    </div>
  );
}

function Header() {
  return (
    <header>
      <Logo />
      <UserMenu />
    </header>
  );
}

function Logo() {
  return <strong>Acme</strong>;
}

function UserMenu() {
  const user = useUser();
  return (
    <div>
      <Avatar />
      <span>{user.name}</span>
    </div>
  );
}

function Avatar() {
  const user = useUser();
  return <img src={user.avatarUrl} alt={user.name} />;
}
```

In option B, the value passed to the provider is the state object, so its identity is stable. If you build a new object in the render (`value={{ user, logout }}`), wrap it in `useMemo`, otherwise every consumer re-renders each time the provider's parent renders.

**What to say in the review:** "This is not a blocker, but `user` goes through two components that do not use it. I would pass the menu in as a slot, because that adds no new concept. If more components need the user, a small `UserContext` with a `useUser` hook is fine. I would avoid a single context that holds everything, because every consumer would re-render on every change."
**Why it matters / follow-up:** The interviewer may ask when you would pick a state library (Zustand or Redux Toolkit) over context (frequent updates, many subscribers, selectors, devtools), and what the `children` prop and slots are really doing (inversion of control: the parent decides what is rendered).
**Learn more:** [useContext](../../../02-hooks/05-usecontext.md), [Component patterns](../../../03-intermediate/01-component-patterns.md), [Components and props](../../../01-basics/04-components-and-props.md)

### R6-CR-014 (Hard) The god component
**Answer:** The problems, in priority order:

1. **Blocker - a pagination bug.** `page` is never reset when the search text changes. Go to page 3, then type a search with four results: `slice(20, 30)` is empty, so the table is empty while "Prev" is enabled. Reset the page in the change handler (not in an effect).
2. **Blocker - the response is not checked, and errors are handled badly.** `r.json()` runs without checking `res.ok`. A 500 response with a JSON body is stored as the user list, and then `.filter` throws. There is also no abort on unmount. Replace `loading` and `error` with a single `status` (`loading`, `success` or `error`).
3. **Major - a god component.** One component fetches data, holds six pieces of state, applies filtering, sorting and paging rules, and renders a table and a panel. You cannot test the rules without mocking `fetch`, and you cannot reuse the table. Split by responsibility: a hook for data, pure functions for the rules, presentational components for the markup, and a page that wires them together.
4. **Major - a click handler on a `<tr>` and a "modal" that is a plain `div`.** The row cannot be reached or activated with the keyboard. Put a `<button>` in the first cell. The panel needs a role or label at least (a real modal also needs focus handling, or use the `<dialog>` element).
5. **Minor - the sort comparator never returns 0** (`a > b ? 1 : -1`), and it ignores accents and case rules. Use `localeCompare`.
6. **Minor - magic numbers and short names.** `10` appears three times (make it `PAGE_SIZE`), and `r`, `d`, `e`, `u` hide meaning.
7. **Do not flag this: `users.filter(...).sort(...)`.** `filter` returns a new array, so sorting it does not mutate state. A reviewer who flags it is wrong. `users.sort(...)` directly would be a bug.

**Refactored code:** five small files. Each has one job.

**userList.js** - pure rules, no React:

```js
export const PAGE_SIZE = 10;

// Pure functions: no React, easy to unit test. filter() returns a new array,
// so sorting that new array does not touch the original list.
export function filterAndSort(users, search) {
  const term = search.trim().toLowerCase();
  return users
    .filter((user) => user.name.toLowerCase().includes(term))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getPage(items, page) {
  return items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
}

export function hasNextPage(items, page) {
  return (page + 1) * PAGE_SIZE < items.length;
}
```

**useUsers.js** - data layer:

```js
import { useEffect, useState } from 'react';

// Data layer: loads the users and reports a single status.
export function useUsers() {
  const [state, setState] = useState({ status: 'loading', users: [] });

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/users', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((users) => setState({ status: 'success', users }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ status: 'error', users: [] });
      });

    return () => controller.abort();
  }, []);

  return state;
}
```

**UsersTable.jsx** - presentational:

```jsx
// Presentational: shows rows and reports clicks. It owns no state.
export function UsersTable({ users, onSelect }) {
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Email</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>
              <button type="button" onClick={() => onSelect(user)}>
                {user.name}
              </button>
            </td>
            <td>{user.email}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**UserDetails.jsx** - presentational:

```jsx
export function UserDetails({ user, onClose }) {
  return (
    <aside aria-label="User details">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </aside>
  );
}
```

**UsersPage.jsx** - the coordinator that owns the UI state:

```jsx
import { useState } from 'react';
import { filterAndSort, getPage, hasNextPage } from './userList.js';
import { useUsers } from './useUsers.js';
import { UserDetails } from './UserDetails.jsx';
import { UsersTable } from './UsersTable.jsx';

// Coordinator: owns the UI state (search, page, selection) and wires the pieces together.
export function UsersPage() {
  const { status, users } = useUsers();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);

  if (status === 'loading') return <p role="status">Loading...</p>;
  if (status === 'error') return <p role="alert">Could not load users.</p>;

  const matches = filterAndSort(users, search);

  function handleSearchChange(value) {
    setSearch(value);
    setPage(0); // a new search starts on the first page
  }

  return (
    <div>
      <label>
        Search users
        <input value={search} onChange={(e) => handleSearchChange(e.target.value)} />
      </label>
      <UsersTable users={getPage(matches, page)} onSelect={setSelected} />
      <button type="button" onClick={() => setPage(page - 1)} disabled={page === 0}>
        Prev
      </button>
      <button
        type="button"
        onClick={() => setPage(page + 1)}
        disabled={!hasNextPage(matches, page)}
      >
        Next
      </button>
      {selected && <UserDetails user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
```

**What changed:** all hooks are called before the early returns, so the order never changes. The rules are plain functions that you can test without React. The search handler resets the page together with the text. We did not add `useMemo` for `matches`: for a few hundred users it is cheap, and for thousands you would first measure, then memoize or virtualize the list.

**What to say in the review:** "There is a real bug: the page number is not reset when the search changes, so you can end up on an empty page. The fetch also does not check the response status. Beyond that, this component does everything, so I would split it: a hook for loading, pure functions for filter, sort and paging, and small components for the table and the details. I would also make the rows keyboard accessible."
**Why it matters / follow-up:** The interviewer may ask how you would test each piece (unit tests for `userList.js`, `renderHook` for `useUsers`, Testing Library for the page), when you would not split a component (a small one with one job), and why a data library such as TanStack Query would replace `useUsers` in a real app.
**Learn more:** [Thinking in React](../../../01-basics/08-thinking-in-react.md), [Custom hooks](../../../02-hooks/08-custom-hooks.md), [Component patterns](../../../03-intermediate/01-component-patterns.md)
