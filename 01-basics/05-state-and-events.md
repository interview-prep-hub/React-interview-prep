# State and Events

> **Level:** Beginner   **Time:** about 55 minutes   **Read first:** [Components and props](04-components-and-props.md), [JSX](03-jsx.md)

## What you will learn
- Attach event handlers (`onClick`, `onChange`, `onSubmit`, `onKeyDown`) and avoid the classic `onClick={handle()}` bug.
- Explain what a synthetic event is, and use the event object, `preventDefault`, `stopPropagation`, bubbling and capture.
- Explain why an ordinary variable cannot hold changing screen data, and use `useState` instead.
- Describe what happens after a state update (trigger, render, commit) and why state behaves like a snapshot.
- Update objects and arrays without mutating them, and explain why mutation fails.
- Decide what belongs in state and what you should calculate, and list what makes a component re-render.

## 1. Events: how the user talks to your component

A page is quiet until the user does something: clicks, types, presses a key, submits a form. Each of these is an **event**. An **event handler** is a function you write. React calls it for you when the event happens.

You attach a handler with a prop named `on` plus the event name in camelCase: `onClick`, `onChange`, `onSubmit`, `onKeyDown`.

```jsx
function Greeter() {
  function handleClick() {
    alert('Hello!') // shows a browser popup
  }

  return <button onClick={handleClick}>Say hello</button>
}
```

**What happens, step by step:**
1. React renders the button and remembers that `handleClick` is its click handler.
2. Nothing else happens yet. `handleClick` is not run. It is waiting.
3. The user clicks. The browser creates a click event.
4. React finds the `onClick` handler of that button and calls `handleClick(event)`.
5. `alert('Hello!')` runs and the popup appears.

A naming habit worth copying: the **prop** starts with `on` (`onClick`), the **function** starts with `handle` (`handleClick`).

These are the events you will use most:

| Prop | Fires when |
|---|---|
| `onClick` | the element is clicked (mouse, touch or keyboard on a button) |
| `onChange` | the value of an input changes (React fires it on every keystroke) |
| `onSubmit` | a form is submitted (Enter in a field, or a click on a submit button) |
| `onKeyDown` / `onKeyUp` | a key goes down / comes up |
| `onFocus` / `onBlur` | an element gains / loses focus |
| `onMouseEnter` / `onMouseLeave` | the pointer enters / leaves an element |

An event handler is the right place for side effects: changing state, calling an API, writing to the console. Rendering itself (the component body) must stay free of side effects.

**Pass the function, do not call it.** In JSX, `onClick={handleClick}` gives React the function, so React can call it later. Writing `onClick={handleClick()}` calls it right now, while the component renders, and gives React whatever the function returned (usually `undefined`). Think of it as handing someone your phone number versus phoning them this second.

Here is what really happens when you make that mistake (output checked with React 19.3.1):

```jsx
function BadCall() {
  function sayHello() {
    console.log('hello')
  }

  // WRONG: sayHello() runs during render
  return <button onClick={sayHello()}>Say hello</button>
}
```

```text
sayHello calls right after the first render: 1
sayHello calls after the user clicks:         1   (the click did nothing)
```

If the function sets state, it is worse. React renders, the call sets state, React renders again, the call sets state again, and so on:

```text
Too many re-renders. React limits the number of renders to prevent an infinite loop.
```

**Common mistake:**

```jsx
// WRONG: calls the function while rendering
<button onClick={handleClick()}>Save</button>

// WRONG: a string is HTML style, not React
<button onClick="handleClick()">Save</button>

// RIGHT: pass the function itself
<button onClick={handleClick}>Save</button>
```

Why: `{handleClick()}` is an expression that runs immediately, and its result is what gets passed.

## 2. Passing arguments and reading the event object

Sometimes the handler needs to know more than "a click happened". Which menu item? Which row? You cannot write `onClick={handleChoose('Pizza')}` because that calls the function (see above). Wrap the call in an **arrow function** instead. The arrow function is the thing you pass. It calls `handleChoose` later, at click time.

```jsx
import { useState } from 'react'

function Menu() {
  const [message, setMessage] = useState('Nothing chosen yet')

  function handleChoose(name) {
    setMessage(`You chose ${name}`)
  }

  return (
    <div>
      <button onClick={() => handleChoose('Pizza')}>Pizza</button>
      <button onClick={() => handleChoose('Pasta')}>Pasta</button>
      <p>{message}</p>
    </div>
  )
}
```

**What happens, step by step:**
1. On render, each button gets its own small arrow function. `handleChoose` has not run yet.
2. The user clicks "Pasta". React calls the arrow function that belongs to that button.
3. The arrow function calls `handleChoose('Pasta')`.
4. `handleChoose` asks React to change `message`. React re-renders and shows "You chose Pasta".

(`useState` is explained properly in section 6. For now read `setMessage(...)` as "change the message and update the screen".)

The same idea works for list rows. You will use it all the time:

```jsx
<button onClick={() => handleRemove(item.id)}>Remove</button>
```

Creating a new small function on every render is normal and cheap. Do not worry about it until a profiler tells you to.

**The event object.** React passes one argument to every handler: the **event object**. It describes what happened. The fields you will use most:

- `e.type`: the kind of event, such as `"click"`.
- `e.target`: the element the user actually interacted with (the innermost one).
- `e.currentTarget`: the element whose handler is running right now.
- `e.target.value`: the current text of an input (for `onChange`).
- `e.target.checked`: the checked state of a checkbox.
- `e.key`: the key name for keyboard events, such as `"Enter"`.

`target` and `currentTarget` differ when the click lands on something inside the element that has the handler:

```jsx
function EventInfo() {
  const [info, setInfo] = useState('')

  function handleClick(e) {
    setInfo(
      `type=${e.type}, target=${e.target.tagName}, currentTarget=${e.currentTarget.tagName}`,
    )
  }

  return (
    <div>
      <button onClick={handleClick}>
        <span>Click me</span>
      </button>
      <p>{info}</p>
    </div>
  )
}
```

The user clicks on the words, which are inside the `<span>`. Result on screen:

```text
type=click, target=SPAN, currentTarget=BUTTON
```

The click landed on the span (`target`), but the handler belongs to the button (`currentTarget`).

**Common mistake:**

```jsx
// WRONG: handleChoose runs during render, and its result (undefined) becomes the handler
<button onClick={handleChoose('Pizza')}>Pizza</button>

// RIGHT: an arrow function that calls it on click
<button onClick={() => handleChoose('Pizza')}>Pizza</button>
```

Why: the arrow function is a value that waits. The bare call is an action that happens now.

## 3. Synthetic events, preventDefault and keyboard events

The `e` you receive is not the browser's raw event. It is a **synthetic event**: a wrapper React creates around the native event. It has the same shape (`type`, `target`, `preventDefault()`, `stopPropagation()` and so on), but it behaves the same in every browser. If you ever need the original, it is at `e.nativeEvent`.

Things worth knowing about React's events:

- **One listener at the top.** Since React 17, React adds its listeners once, on the root container (the DOM element you gave to `createRoot`), and works out which of your handlers match. This is called event delegation. You do not call `addEventListener` yourself for normal UI work.
- **No pooling any more.** Very old React reused event objects, so you had to call `e.persist()` before using `e` later. That is gone. You will still see `e.persist()` in old code; today it does nothing. One catch, checked by running it: once React has finished dispatching the event (for example after an `await` inside your handler), `e.currentTarget` is `null`, so read it early. Other fields such as `e.type` and `e.target` are still there.
- **`onChange` fires on every keystroke.** The plain HTML `change` event waits until the field loses focus. React's `onChange` behaves like the `input` event: it fires for each character. Typing "Ada" calls the handler 3 times.
- **`onFocus` and `onBlur` bubble** (see the next section). The native `focus` and `blur` events do not.
- **`onScroll` does not bubble** (since React 17).
- **Returning `false` does not cancel anything.** In plain HTML some handlers can `return false` to stop the default action. In React you must call `e.preventDefault()`.

**preventDefault.** Browsers have built-in behaviour for some events: a form submit reloads the page, a link click navigates. `e.preventDefault()` cancels that built-in behaviour. In React forms you almost always want it, because you handle the submit yourself:

```jsx
function SearchForm() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')

  function handleSubmit(e) {
    e.preventDefault() // stop the page reload
    setSubmitted(query)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        aria-label="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit">Search</button>
      <p>Last search: {submitted || 'none'}</p>
    </form>
  )
}
```

**What happens, step by step:**
1. The user types "react". Each keystroke calls the `onChange` arrow function, which stores the text in `query`.
2. The user clicks Search (or presses Enter). The browser starts a form submit and React calls `handleSubmit(e)`.
3. `e.preventDefault()` tells the browser: do not reload the page.
4. `setSubmitted(query)` saves the text. The screen shows "Last search: react".

We checked this by running it: after a handler that calls `e.preventDefault()`, the submit event reports "default prevented". After a handler that only does `return false`, it does not.

**Keyboard events.** Use `onKeyDown` and read `e.key`:

```jsx
function QuickNote() {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState('nothing')

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      setSaved(text)
      setText('')
    } else if (e.key === 'Escape') {
      setText('')
    }
  }

  return (
    <div>
      <input
        aria-label="Note"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <p>Saved: {saved}</p>
    </div>
  )
}
```

Typing "buy milk" and pressing Enter saves it and clears the box. Pressing Escape clears the box without saving. Key names are strings such as `"Enter"`, `"Escape"`, `"ArrowDown"` and `" "` (a space).

**Common mistake:**

```jsx
// WRONG: the page reloads and all state is lost
function handleSubmit() {
  setSubmitted(query)
}

// WRONG: React ignores the returned false
function handleSubmit() {
  setSubmitted(query)
  return false
}

// RIGHT
function handleSubmit(e) {
  e.preventDefault()
  setSubmitted(query)
}
```

Why: only `e.preventDefault()` tells the browser to skip its default action.

## 4. Bubbling, stopPropagation and capture

When you click a button inside a `div` inside a page, the click does not belong only to the button. The browser sends the event on a trip:

1. **Capture phase:** the event travels down from the top, through each parent, towards the clicked element.
2. **Target:** it reaches the clicked element.
3. **Bubble phase:** it travels back up through every parent, like a bubble rising in water.

In React, `onClick` runs in the **bubble** phase. If you add `Capture` to the name (`onClickCapture`), the handler runs in the **capture** phase instead. Every event has a capture twin: `onChangeCapture`, `onKeyDownCapture`, and so on.

```jsx
function BubbleDemo() {
  return (
    <div
      onClickCapture={() => console.log('outer div (capture)')}
      onClick={() => console.log('outer div (bubble)')}
    >
      <button onClick={() => console.log('button')}>Click me</button>
    </div>
  )
}
```

Clicking the button logs (checked with React 19.3.1):

```text
outer div (capture)
button
outer div (bubble)
```

**What happens, step by step:**
1. The click starts at the top. The outer div's capture handler runs first.
2. The event reaches the button. The button's `onClick` runs.
3. The event bubbles up. The outer div's normal `onClick` runs last.

That is why a click on a child can also trigger a parent's `onClick`. Sometimes you want that. Sometimes you do not. **`e.stopPropagation()`** stops the event from travelling further, so parents above do not see it.

A realistic case is a clickable card with a delete button inside. Clicking Delete should not also "select" the card:

```jsx
function Card({ onSelect, onRemove }) {
  return (
    <li onClick={onSelect}>
      Milk
      <button
        onClick={(e) => {
          e.stopPropagation() // do not also select the card
          onRemove()
        }}
      >
        Delete
      </button>
    </li>
  )
}
```

With `stopPropagation` in the button, the log from the first demo becomes:

```text
outer div (capture)
button
```

The outer bubble handler never ran. The capture handler did run, because it happens before the button's handler, so the button cannot stop it. That is the main use of the capture variants: they let a parent see an event first, whatever the children do. You will need them rarely.

Two different tools, often confused:

| Method | What it stops |
|---|---|
| `e.preventDefault()` | the browser's built-in action (form reload, link navigation) |
| `e.stopPropagation()` | the event reaching other handlers further along its path |

They are independent. Calling one does not call the other.

**Common mistake:** using `stopPropagation` casually. Checked by running it: in React 17 and later, calling `e.stopPropagation()` in a React handler also stops listeners that other code added with `document.addEventListener('click', ...)`. A "click outside to close the menu" feature built on a document listener silently stops working for that button.

```jsx
// RISKY: hides the click from every document-level listener too
<button onClick={(e) => { e.stopPropagation(); doThing() }}>Go</button>

// BETTER: do not stop the event unless a parent handler really causes a problem
<button onClick={doThing}>Go</button>
```

Why: an event that stops early is invisible to everyone further up, including code you did not write.

## 5. Why ordinary variables do not work

You know how to react to a click. Now you want the screen to change. The obvious first try is a normal variable:

```jsx
function BrokenCounter() {
  let count = 0

  function handleClick() {
    count = count + 1
    console.log('count is now', count)
  }

  return <button onClick={handleClick}>Clicked {count} times</button>
}
```

Click it three times. The console shows `1`, `2`, `3`. The button still says "Clicked 0 times".

**What happens, step by step:**
1. React calls `BrokenCounter()`. A fresh variable `count` is created with value 0. The button shows "Clicked 0 times".
2. The user clicks. `handleClick` changes `count` to 1 and logs it. Changing a normal variable does not tell React anything, so **React does not render again** and the screen keeps its old text.
3. Two more clicks log 2 and 3, for the same reason.
4. Now suppose something else makes React call `BrokenCounter()` again (say, its parent re-renders). That call creates a **brand new** `count` that starts at 0. **The old value is gone.** We checked this: after a re-render, the next click logs `1` again.

So a plain variable fails twice:
- **No re-render:** changing it does not update the screen.
- **No memory:** a local variable is recreated from scratch every time the function runs.

(Moving `let count = 0` outside the component keeps the number alive, but the screen still does not update, and every copy of the component would share the same number.)

A component needs two things: a place to **keep data between renders**, and a way to **tell React the data changed**. The `useState` hook gives you both.

**Common mistake:**

```jsx
// WRONG: normal variable
let count = 0
count = count + 1

// RIGHT: state
const [count, setCount] = useState(0)
setCount(count + 1)
```

Why: only the setter returned by `useState` tells React to render again.

## 6. useState: the basics

```jsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
}
```

Read the line `const [count, setCount] = useState(0)` in parts:

- `useState(0)` asks React for one piece of state. `0` is the **initial value**. It is used only on the very first render. After that React ignores it.
- It returns an array with exactly two items: the **current value** (`count`) and a **setter function** (`setCount`).
- `const [a, b] = ...` is array destructuring. You pick the names. The convention is `[thing, setThing]`.
- State can hold any value: a number, string, boolean, array, object or `null`.
- Call `useState` at the top level of your component, never inside an `if`, a loop or a nested function. (The reason is in [the hooks overview](../02-hooks/01-hooks-overview-and-rules.md).)

**What happens, step by step:**
1. First render: React calls `Counter()`. `useState(0)` returns `[0, setCount]`. The button shows "Clicked 0 times".
2. The user clicks. The arrow function calls `setCount(0 + 1)`. This is a request: "make the count 1".
3. React stores the new value and calls `Counter()` again.
4. This time `useState(0)` returns `[1, setCount]`. It ignores the `0` because this component already has state. The button shows "Clicked 1 times".

You can see the renders by logging in the component body:

```jsx
function Counter() {
  const [count, setCount] = useState(0)
  console.log('render, count =', count)
  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
}
```

```text
render, count = 0
render, count = 1
```

A note you will meet in your own project: the Vite template wraps your app in `<StrictMode>`. In development StrictMode calls every component twice on purpose, to catch bugs. So you will see each line twice (`count = 0`, `count = 0`, `count = 1`, `count = 1`). That is normal, it only happens in development, and it does not mean your component rendered twice on screen.

Three more tiny examples, all with the same shape (a value in state, an event that sets it, JSX that reads it).

**A toggle.** A boolean in state:

```jsx
function Disclosure() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Show'} details</button>
      {open && <p>Here are the details.</p>}
    </div>
  )
}
```

**A checkbox.** For checkboxes you read `e.target.checked`, not `value`. Here a boolean in state also enables a button:

```jsx
function Agree() {
  const [agreed, setAgreed] = useState(false)

  return (
    <>
      <label>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        I agree
      </label>
      <button disabled={!agreed}>Continue</button>
    </>
  )
}
```

**A text input that echoes what you type.** This is the most important pattern in this lesson:

```jsx
function NameEcho() {
  const [name, setName] = useState('')

  return (
    <div>
      <label>
        Name <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <p>Hello, {name || 'stranger'}!</p>
    </div>
  )
}
```

**What happens, step by step:**
1. The input's `value` comes from state (`''`), so the box is empty and the text says "Hello, stranger!".
2. The user types "A". The browser changes the box, and React calls `onChange`.
3. The handler reads `e.target.value` (`"A"`) and calls `setName('A')`.
4. React renders again. The input's `value` is now `"A"` and the paragraph says "Hello, A!".
5. Each further letter repeats steps 2 to 4.

An input whose value is controlled by state like this is called a **controlled input**. The state is the single source of truth; the input just displays it. There is a full lesson on this in [Forms](07-forms.md). One warning to remember now: if you give an input `value` but no `onChange`, React warns that you rendered a read-only field.

**Several pieces of state.** Call `useState` as many times as you need. Use separate calls for values that are unrelated (`name` and `isOpen`). Group values into one object when they always change together (such as the `x` and `y` of a point).

If a value does not affect what is on the screen (a timer id, for example), it probably should not be state. The [useRef lesson](../02-hooks/04-useref.md) covers where it goes.

**Common mistake:**

```jsx
// WRONG: count is a const, so this throws an error, and it would not tell React anyway
count++
count = count + 1

// RIGHT: ask React to change it
setCount(count + 1)
```

Why: you never change state directly. You call the setter and React does the update.

## 7. What happens when state changes: trigger, render, commit

Every update on screen goes through three steps. Picture a restaurant:

- **Trigger** (an order comes in): something asks for a new screen. Two things can do that: the very first render of your app, and a state update.
- **Render** (the kitchen prepares the dish): React calls your component function to find out what the screen *should* look like. This returns JSX. Nothing on the real page changes yet. Here "render" means "React calls your function", not "pixels are drawn".
- **Commit** (the waiter serves the dish): React compares the new JSX with the previous one and changes only the real DOM nodes that differ. Then the browser paints.

```text
trigger          ->   render              ->   commit
setCount(1)           React calls Counter()    React updates the DOM text
```

Two consequences matter in interviews:

1. **A render is not a DOM update.** If a render produces the same JSX as before, React skips the commit and the DOM is not touched. "The component re-rendered" does not mean "the page changed".
2. **Your component body runs again on every render.** So it must be a pure calculation: same inputs (props, state) give the same JSX, and no side effects like changing variables outside or setting state unconditionally. Side effects belong in event handlers (this lesson) or in effects (a later lesson).

The deep version of this, including how React works out what to change, is in [How React renders](../04-advanced/01-how-react-renders.md). For now the three words are enough.

**Common mistake:** calling a setter while rendering.

```jsx
function Bad() {
  const [n, setN] = useState(0)
  setN(n + 1) // WRONG: sets state during render, which triggers another render, forever
  return <p>{n}</p>
}
```

Fix: set state in response to an event (a handler) or inside an effect. Rendering must only calculate JSX. React stops this loop with the "Too many re-renders" error you saw earlier.

## 8. State is a snapshot

Here is the idea that explains most "why is my state wrong?" bugs.

**Each render has its own values.** When React calls your component, it hands it the state *as it is for that render*. Inside that call, `count` is a fixed number. It is like a photograph of the state taken at that moment. Your event handlers are created in the same call, so they see the same photograph.

Calling `setCount` does **not** change the `count` variable in the code that is running. It asks React for a new render, and *that* render gets a new snapshot.

```jsx
function SnapshotDemo() {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount(count + 1)
    console.log('right after setCount:', count)
  }

  return <button onClick={handleClick}>Count: {count}</button>
}
```

Click twice. The console shows:

```text
right after setCount: 0
right after setCount: 1
```

The screen shows "Count: 2" at the end.

**What happens, step by step:**
1. First render: `count` is 0 inside this call and inside `handleClick`.
2. Click: `setCount(0 + 1)` asks for a new render. The next line logs `count`, which in *this* snapshot is still 0.
3. React renders again with `count` = 1. A new `handleClick` is created that sees 1.
4. Second click: logs 1 (the old snapshot of that render), asks for 2. The screen shows 2.

The log is always one step behind the screen. The code after `setCount` is running in the old snapshot.

The same thing happens with timers. A delayed function remembers the snapshot it was created in:

```jsx
function handleClick() {
  setCount(count + 5)
  setTimeout(() => {
    console.log('timer sees', count)
  }, 1000)
}
```

Click once (from 0). One second later the log says `timer sees 0`, while the screen already shows 5.

Another consequence: calling the same setter three times with the snapshot value does not add 3.

```jsx
function handleClick() {
  setCount(count + 1)
  setCount(count + 1)
  setCount(count + 1)
}
```

From 0, one click gives **1**, not 3. All three lines mean "set the count to 0 + 1". React applies them in order: 1, 1, 1.

**Functional updates (a first look).** If the new value depends on the previous value, pass a function to the setter instead of a number. React calls it with the latest value:

```jsx
function handleClick() {
  setCount((c) => c + 1)
  setCount((c) => c + 1)
  setCount((c) => c + 1)
}
```

From 0, one click gives **3**. React keeps the three functions in a queue and runs them one after another: 0 becomes 1, then 2, then 3.

Rules of thumb:
- New value computed from the old one (`count + 1`, toggle, append to a list): use the **updater form** `setX((prev) => ...)`.
- New value that does not depend on the old one (`setName(e.target.value)`, `setCount(0)`): pass the value directly.
- Name the parameter after the state (`c` for `count`) or `prevCount`.
- An updater function must be pure: calculate and return, nothing else. In development StrictMode calls it twice to check.

You will hear "setState is asynchronous". That is a loose way to say what you just saw: the update is queued and applied on the next render, and your running code keeps its old snapshot. There is no promise to await. The more exact words are "queued" and "snapshot". More cases (intervals, lazy initial state, resetting state) are in [useState in depth](../02-hooks/02-usestate-in-depth.md).

**Common mistake:**

```jsx
// WRONG: three calls, all based on the same snapshot, result +1
setCount(count + 1)
setCount(count + 1)
setCount(count + 1)

// RIGHT: each call builds on the previous one, result +3
setCount((c) => c + 1)
setCount((c) => c + 1)
setCount((c) => c + 1)
```

Why: with a number you reuse one stale snapshot; with a function React passes the latest value each time.

## 9. State belongs to one component instance (props vs state)

Every time you write `<Counter />`, React creates a separate copy of that component, and each copy has its own memory.

```jsx
function LabeledCounter({ label }) {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      {label}: {count}
    </button>
  )
}

function TwoCounters() {
  return (
    <div>
      <LabeledCounter label="A" />
      <LabeledCounter label="B" />
    </div>
  )
}
```

Click A twice and B never. The screen shows `A: 2` and `B: 0`.

**What happens, step by step:**
1. React creates two `LabeledCounter` instances. Each gets its own `count`, starting at 0.
2. A click on A calls A's setter. React re-renders only the part that belongs to A's state.
3. B's `count` was never touched, so B still shows 0.

`label` and `count` look similar in the JSX but they are different kinds of data:

| | Props | State |
|---|---|---|
| Who sets it | the parent | the component itself, through its setter |
| Can the component change it | no, it is read-only | yes, through the setter |
| Lives | in the parent's call | inside this component instance |
| Example | `label="A"` | `count` |

Related facts:
- **State is private.** A parent or a sibling cannot read your state. If two components need the same data, move the state up to their closest common parent and pass it down as props. That move is called lifting state up ([Thinking in React](08-thinking-in-react.md)).
- **State is local to the place on the screen.** If a component disappears (for example `{show && <LabeledCounter />}` turns false), React throws its state away. When it comes back it starts at the initial value again. We checked: count 2, hide, show, and it reads `A: 0`.
- A parent can pass its state down as a prop, and pass a handler function down as a prop so the child can ask for a change. That is how data flows down and events flow up.

**Common mistake:**

```jsx
// WRONG: count arrives as a prop, so this only changes a local copy and nothing re-renders
function Counter({ count }) {
  return <button onClick={() => { count = count + 1 }}>{count}</button>
}

// RIGHT: if the component changes the value, the component owns it as state
function Counter({ initialCount }) {
  const [count, setCount] = useState(initialCount)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

Why: props belong to the parent and are read-only. A component changes only its own state.

## 10. Updating objects: replace, never mutate

State can hold an object. The rule: **treat state as read-only.** Never change an object in place. Make a new copy with the change, and give the copy to the setter.

The wrong way, which looks almost right:

```jsx
function BadBirthday() {
  const [user, setUser] = useState({ name: 'Ada', age: 30 })
  const [, setTick] = useState(0) // only here so the Refresh button can force a re-render

  function birthday() {
    user.age = user.age + 1 // mutates the existing object
    setUser(user)           // same object as before
  }

  return (
    <div>
      <button onClick={birthday}>
        {user.name} is {user.age}
      </button>
      <button onClick={() => setTick((t) => t + 1)}>Refresh</button>
    </div>
  )
}
```

Click the first button twice: it still says "Ada is 30". Then click Refresh (which causes an unrelated re-render): it suddenly says "Ada is 32". That kind of delayed, confusing behaviour is typical of mutation bugs.

**Why mutation fails:**
1. React decides whether state changed by comparing the old and new values with `Object.is`. For objects and arrays that compares the **reference** (the identity), not the contents.
2. After the mutation, `user` is still the same object, so `setUser(user)` passes the same reference. React sees "no change", skips the render, and the screen keeps old data. The data is already changed, but nobody told the screen.
3. Even when it appears to work, you break guarantees that other features rely on: a snapshot from an earlier render is supposed to stay the same, `React.memo` compares by reference, and effects compare their dependencies by reference.

The right way is to build a new object. The **spread** syntax `...user` copies all properties of `user` into a new object; properties written after it replace the copied ones:

```jsx
function GoodBirthday() {
  const [user, setUser] = useState({ name: 'Ada', age: 30 })

  function birthday() {
    setUser({ ...user, age: user.age + 1 })
  }

  return (
    <button onClick={birthday}>
      {user.name} is {user.age}
    </button>
  )
}
```

**What happens, step by step:**
1. Click. `{ ...user, age: user.age + 1 }` creates a new object `{ name: 'Ada', age: 31 }`.
2. `setUser` receives a reference that is different from the current one. React sees a change and renders.
3. The screen shows "Ada is 31". Two clicks give 32 and, as we counted, three renders in total (the first plus one per click).

**Nested objects need a copy at each level you change.** Spread copies only the top level (a "shallow copy"). Inner objects are still shared with the old object. We checked: after `const copy = { ...user }`, `copy.address === user.address` is `true`. So to change `user.address.city`, copy `address` too:

```jsx
function CityEditor() {
  const [user, setUser] = useState({
    name: 'Ada',
    address: { city: 'London', zip: 'N1' },
  })

  function moveToParis() {
    setUser({
      ...user,
      address: { ...user.address, city: 'Paris' },
    })
  }

  return (
    <div>
      <p>
        {user.name} lives in {user.address.city} ({user.address.zip})
      </p>
      <button onClick={moveToParis}>Move to Paris</button>
    </div>
  )
}
```

After the click the screen reads "Ada lives in Paris (N1)". The `zip` is kept because `...user.address` copied it.

Keep state as flat as you can. Deeply nested state makes updates long. (A library called Immer lets you write the short mutating-looking version and produces the safe copy for you; see [useState in depth](../02-hooks/02-usestate-in-depth.md).)

**Common mistake:**

```jsx
// WRONG: changes the existing object
user.age = 31
setUser(user)

// RIGHT: a new object
setUser({ ...user, age: 31 })
```

Why: React only notices a change when the reference is different.

## 11. Updating arrays: add, remove, change

Arrays follow the same rule. Many array methods **mutate** the array they are called on. Avoid those on state, and use the methods that **return a new array**:

| To do this | Avoid (mutates) | Prefer (returns a new array) |
|---|---|---|
| add at the end | `push` | `[...items, newItem]` |
| add at the start | `unshift` | `[newItem, ...items]` |
| remove | `splice`, `pop`, `shift` | `items.filter(item => item.id !== id)` |
| change one item | `items[i] = x` | `items.map(item => item.id === id ? { ...item, done: true } : item)` |
| sort | `sort` | `[...items].sort(...)` or `items.toSorted(...)` |
| reverse | `reverse` | `[...items].reverse()` or `items.toReversed()` |

`toSorted` and `toReversed` are newer array methods that return a copy (they exist in current browsers and Node). The `[...items].sort()` form works everywhere.

A trap: `sort()` changes the array **and** returns the same array. We checked: `const b = a.sort()` gives `a === b`. So `setScores(scores.sort())` is a mutation in disguise. Our test shows it: click "Sort" on `[30, 10, 20]` with a mutating sort and the screen still says `30, 10, 20`. Copy first, then sort: `setScores([...scores].sort((a, b) => a - b))`.

Now a complete example that uses add, remove and change together, plus a calculated value. It is a small shopping list:

```jsx
import { useState } from 'react'

let nextId = 3 // only used to make ids for new items

export default function ShoppingList() {
  const [items, setItems] = useState([
    { id: 1, name: 'Milk', bought: false },
    { id: 2, name: 'Eggs', bought: true },
  ])
  const [draft, setDraft] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    const name = draft.trim()
    if (name === '') return
    setItems([...items, { id: nextId++, name, bought: false }])
    setDraft('')
  }

  function handleRemove(id) {
    setItems(items.filter((item) => item.id !== id))
  }

  function handleToggle(id) {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, bought: !item.bought } : item,
      ),
    )
  }

  const boughtCount = items.filter((item) => item.bought).length

  return (
    <div>
      <form onSubmit={handleAdd}>
        <input
          aria-label="New item"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={item.bought}
                onChange={() => handleToggle(item.id)}
              />
              {item.name}
            </label>
            <button onClick={() => handleRemove(item.id)}>Remove {item.name}</button>
          </li>
        ))}
      </ul>
      <p>
        Bought {boughtCount} of {items.length}
      </p>
    </div>
  )
}
```

**What happens, step by step:**
1. Two pieces of state: `items` (the list) and `draft` (what is typed in the box). The first render shows Milk (not bought), Eggs (bought) and "Bought 1 of 2".
2. **Add:** the user types "Bread" and submits. `handleAdd` stops the page reload, builds a **new array** with the old items plus the new one (`[...items, newItem]`), and clears the box. The screen shows 3 items and "Bought 1 of 3".
3. **Toggle:** a click on the Milk checkbox runs `items.map(...)`. For the item with the matching id it returns a **copy** with `bought` flipped. All other items are returned unchanged. Result: "Bought 2 of 3".
4. **Remove:** `items.filter(...)` returns a new array without that item. The row disappears and the totals update.
5. `boughtCount` is not stored. It is calculated from `items` on every render (see the next section).
6. `key={item.id}` gives each row a stable identity so React can tell rows apart. Keys are covered in [Conditional rendering and lists](06-conditional-rendering-and-lists.md).

`nextId++` runs inside an event handler, not during rendering, so it does not break the "rendering is pure" rule. In a bigger app you would get ids from the server or from `crypto.randomUUID()`.

**Common mistake:**

```jsx
// WRONG: push mutates the array in state
items.push({ id: 3, name: 'Bread', bought: false })
setItems(items)

// RIGHT
setItems([...items, { id: 3, name: 'Bread', bought: false }])
```

Why: same array reference, so React sees no change.

## 12. Do not store what you can calculate

State should hold the **smallest amount of data** that describes the situation. Anything you can work out from existing state or props is a **derived value**. Calculate it in the component body, on every render.

```jsx
function NameForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const fullName = `${firstName} ${lastName}`.trim() // derived, not state

  return (
    <div>
      <label>
        First name{' '}
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </label>
      <label>
        Last name{' '}
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </label>
      <p>Full name: {fullName || '(empty)'}</p>
    </div>
  )
}
```

**What happens, step by step:**
1. State holds two facts: first name and last name.
2. Each render computes `fullName` from them.
3. Whatever the user types, `fullName` is always correct, because there is only one source of truth.

The other design stores `fullName` in a third state variable. Now every handler must remember to update all three. Forget one and the screen disagrees with itself. Copies of the same data drift apart.

The same rule explains the like button:

```jsx
function LikeButton({ baseLikes }) {
  const [liked, setLiked] = useState(false)
  const likes = baseLikes + (liked ? 1 : 0) // derived

  return (
    <button onClick={() => setLiked(!liked)} aria-pressed={liked}>
      {liked ? 'Unlike' : 'Like'} ({likes})
    </button>
  )
}
```

With `baseLikes` 41, the button reads `Like (41)`, then `Unlike (42)` after a click, and back to `Like (41)` after a second click. One piece of state (`liked`), one calculated number. In the shopping list, `boughtCount` is derived the same way.

Things you usually should not put in state:
- A value you can compute from other state or props (full name, totals, a filtered list, a count).
- A copy of a prop: `useState(props.value)` reads the prop only on the first render. If the prop changes later, the state does not follow. Use the prop directly.
- Two variables that must always agree. Keep one and derive the other (practice item 11 shows this).
- A value that does not affect the screen (use a ref, covered in the useRef lesson).

**Common mistake:**

```jsx
// WRONG: fullName is a copy that must be kept in sync by hand
const [fullName, setFullName] = useState('')

// RIGHT: calculate it
const fullName = `${firstName} ${lastName}`.trim()
```

Why: derived state is a bug waiting for you to forget one update.

## 13. What causes a re-render, and how updates are batched

A component renders again in these cases:

1. **Its own state changed.** The setter was called with a value that is different (compared with `Object.is`).
2. **Its parent rendered.** When a parent renders, React renders all the children it returns, even if their props did not change. A child with no props at all still renders again.
3. **A context it reads changed.** (Context is a later lesson.)

Things that do **not** cause a render: changing a normal variable, changing `ref.current`, or mutating state in place.

Rule 2 surprises people, so here it is in code:

```jsx
function Child() {
  console.log('Child rendered')
  return <p>I am a child with no props</p>
}

function Parent() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Parent clicked {count}</button>
      <Child />
    </div>
  )
}
```

`Child` logs once on mount, and again after each click. After mount and two clicks it has rendered 3 times, although it has no props and nothing about it changed. Usually this is fine and fast. When it is not, you can wrap a child in `React.memo` so React skips it when its props are equal ([Memoization](../02-hooks/07-memoization.md)). Putting state in the smallest component that needs it also limits the damage: a component with its own state re-renders alone when that state changes (practice item 9 shows this).

**Setting the same value.** If you call the setter with a value equal to the current one, React bails out. Checked by running it: a fresh counter at 0 and two clicks on "Set to 0" gave no extra renders. React may call the component function one extra time in some cases before it gives up, but it will not render the children or touch the DOM. For objects and arrays, "equal" means the same reference, which is why the mutation bug in section 10 shows nothing.

**Batching.** If a handler calls several setters, React does not render after each call. It waits until the handler finishes, applies all the updates together, and renders **once**:

```jsx
function BatchDemo() {
  const [first, setFirst] = useState(0)
  const [second, setSecond] = useState(0)
  console.log(`render ${first} ${second}`)

  function handleClick() {
    setFirst(first + 1)
    setSecond(second + 1)
  }

  return <button onClick={handleClick}>{first} and {second}</button>
}
```

```text
render 0 0
render 1 1
```

There is never a `render 1 0`. Two updates, one render.

Since React 18 this is true everywhere, not only in React event handlers. Updates inside `setTimeout`, promise callbacks and native event handlers are batched too. We ran a `setTimeout` with two updater calls and got a single render (`render 2 2`). Two updates separated by a real wait (a timer or a network call) are two separate renders, because the first batch has already been rendered by then. Older tutorials say "React only batches inside event handlers". That was true before React 18 and is not true now.

**Common mistake:**

```jsx
// WRONG belief: "Child has no props, so React will skip it when Parent renders"
<Child />

// RIGHT: it renders every time. Only if you measured a real problem, ask React to skip it
import { memo } from 'react'

const Child = memo(function Child() {
  return <p>I am a child with no props</p>
})
```

Why: React cannot know a child is pure unless you say so with `memo`.

## How interviewers test this
- **Output prediction.** Three `setCount(count + 1)` calls, a `console.log` right after `setState`, a `setTimeout` that reads state. A strong answer names the snapshot, the update queue and the updater form, and gives the right numbers.
- **Mutation.** They watch whether you reach for `push`, `splice`, `sort` or `obj.x = ...` on state. A strong answer uses spread, `map` and `filter`, and explains the `Object.is` reference check. Mutating state is a red flag.
- **Event basics.** Arrow function with an argument, `preventDefault` on a form, never calling the handler in JSX. Red flags: `onClick={fn()}`, `return false`, `document.getElementById` inside a React component.
- **Vocabulary.** Trigger, render, commit; "a re-render is not a DOM update"; "a parent render renders its children". Saying "setState is async" and stopping there is weaker than saying "queued, and the handler sees a snapshot".
- **Design judgement.** What goes into state and what is derived. Where state should live. They often ask you to build a counter, toggle, task list or like button and watch for duplicated state, missing keys and mutations.

## Interview questions and model answers

### Q1. What is state in React, and how is it different from props? (Easy)
State is data that a component remembers between renders and that can change over time. You create it with `useState`, and when you change it through the setter, React renders the component again. Props are inputs that a parent passes in. A component must treat its props as read-only, while it owns and changes its own state. Data flows down through props; a child asks for changes by calling a function it received as a prop. If a value can be calculated from props or state, it is neither: it is just a normal variable in the component body.

### Q2. What causes a React component to re-render? (Easy)
Three things: its own state changes (the setter gets a value that is different by `Object.is`), its parent renders (children render by default even if their props are the same, unless wrapped in `React.memo`), or a context it reads changes. Changing a normal variable or `ref.current` does not cause a render. Also note that "render" means React calls your function again. The DOM is updated only where the output actually differs.

### Q3. Why should you not mutate state directly? (Easy)
React compares the old and new state with `Object.is`. If you mutate an object or array and pass the same reference to the setter, React sees "no change" and skips the render, so the screen is stale (and may suddenly catch up on a later unrelated render). Mutation also breaks the idea that each render is a snapshot, and it confuses `React.memo` and effect dependencies, which compare by reference. Instead, create a copy: `[...items, x]`, `items.filter(...)`, `items.map(...)`, `{ ...obj, key: value }`.

```jsx
setUser({ ...user, age: user.age + 1 }) // new object, React notices
```

### Q4. Is `setState` synchronous or asynchronous? Why does `console.log` after it show the old value? (Medium)
Neither word is exact. Calling the setter does not change the variable in the code that is already running. It queues an update, and React applies it on the next render, which gets a new snapshot of the state. The line after `setCount(count + 1)` still sees the old `count` because it belongs to the old render. There is no promise to await. If you need the new value right away, calculate it first: `const next = count + 1; setCount(next); use(next)`. To react to the new value after it is on screen, use an effect (later lesson).

### Q5. What is the difference between `setCount(count + 1)` and `setCount(c => c + 1)`? (Medium)
The first uses the `count` from the current render's snapshot. Calling it three times in one handler sets the count to the same number three times, so the result is +1. The second passes an updater function. React queues the functions and runs them in order, each one getting the latest value, so three calls give +3. Use the updater form whenever the new state depends on the previous state, and especially in timers and intervals that remember an old snapshot. Updater functions must be pure.

### Q6. What is a synthetic event? (Easy)
It is React's wrapper around the browser's native event. It has the same interface (`type`, `target`, `currentTarget`, `preventDefault`, `stopPropagation`, `key` and so on) and behaves the same across browsers. The original is available as `e.nativeEvent`. Since React 17 there is no event pooling, so you can read the event after an `await`, and `e.persist()` is an old no-op (but `e.currentTarget` is `null` once the handler has finished). Some React events differ from the native ones: `onChange` fires on every keystroke, and `onFocus` and `onBlur` bubble.

### Q7. How do you pass an argument to an event handler? (Easy)
Wrap the call in an arrow function: `onClick={() => handleRemove(item.id)}`. The arrow function is what React stores, and it calls `handleRemove` with the argument at click time. If you write `onClick={handleRemove(item.id)}` the function runs during render instead, which is a bug. Another option is a function that returns a function, but the arrow wrapper is the usual answer. Creating a small function per render is cheap.

### Q8. What is wrong with `<button onClick={handleClick()}>`? (Easy)
The parentheses call `handleClick` while the component renders, and React receives its return value (usually `undefined`) as the handler. So the click does nothing, and the function ran at the wrong time. If `handleClick` sets state, it triggers a render that runs it again, and React throws "Too many re-renders". Pass the function itself (`onClick={handleClick}`), or an arrow function when you need arguments (`onClick={() => handleClick(id)}`).

### Q9. What is the difference between `preventDefault` and `stopPropagation`, and what is event bubbling? (Medium)
Events travel down from the root to the target (capture), then back up through the parents (bubble). React's `onClick` runs in the bubble phase, and `onClickCapture` runs in the capture phase. `e.stopPropagation()` stops the event from reaching handlers further along that path, for example a parent's `onClick`. `e.preventDefault()` cancels the browser's built-in action, such as a form submit reloading the page. They are independent, and returning `false` from a React handler does neither.

### Q10. Does React batch state updates? (Medium)
Yes. Updates made in the same tick are collected and rendered once, so `setA(...)` followed by `setB(...)` gives one render, not two. Before React 18 this only applied inside React event handlers. Since 18 it applies everywhere: timeouts, promises and native event handlers too. Updates separated by a real wait (a timer or a network call) end up in separate renders. If you ever need an update flushed to the DOM immediately, `flushSync` exists, but it is rare.

### Q11. What should you store in state and what should you not? (Medium)
Store the smallest set of facts that changes over time and affects the screen (input text, which tab is open, the list of items). Do not store values you can calculate from other state or props (totals, filtered lists, full names), do not copy a prop into state (`useState(props.x)` ignores later changes), and do not keep two variables that must always agree. Values that do not affect the screen (timer ids, previous values) belong in a ref. Less state means fewer places to get out of sync.

### Q12. Why can't I just use a normal variable instead of state? (Easy)
Two reasons. First, changing a normal variable does not tell React anything, so React does not render again and the screen stays the same. Second, a local variable is created fresh each time the component function runs, so it forgets its value on the next render. `useState` solves both: React stores the value outside your function between renders, and the setter schedules a new render.

### Q13. What is a controlled input? (Easy)
It is an input whose value is driven by React state: you pass `value={text}` and an `onChange` that calls `setText(e.target.value)`. The state is the single source of truth, so you can validate, format or reset the value at any time. An uncontrolled input keeps its own value in the DOM and you read it when you need it (with a ref or `FormData`). Giving `value` without `onChange` produces a read-only field and a warning. Details are in the [Forms](07-forms.md) lesson.

### Q14. When a parent re-renders, do all its children re-render? (Medium)
By default yes: React renders every child the parent returns, even if the props are identical, because it cannot know the child is pure. That is usually cheap. To skip a child you can wrap it in `React.memo` (it then compares props), move state down into the component that needs it, or pass the child in as `children` from above. A re-render is only a function call; the DOM is touched only if the output differs. Do not memoize before you have measured a problem.

### Q15. Where does React attach event listeners? (Hard)
Since React 17, React adds one listener per event type on the root container, the DOM element passed to `createRoot`, not on every element and not on `document` (React 16 used `document`). When an event arrives, React works out the path from the target up to the root and calls the matching `onX` handlers in capture or bubble order. That is event delegation. A consequence: React's `e.stopPropagation()` stops the native event from reaching listeners higher up, such as ones on `document`, while native listeners lower in the tree (on the element itself) run before React sees the event at all.

## Common mistakes and gotchas
- **`onClick={handle()}`** runs the function during render. Fix: `onClick={handle}` or `onClick={() => handle(x)}`.
- **Mutating state** (`push`, `splice`, `sort`, `obj.x = 1`) leaves the screen stale. Fix: copy with spread, `map` or `filter`, then set.
- **Expecting new state right after the setter.** The running code still has the old snapshot. Fix: compute a local variable first, or react in an effect.
- **Repeating `setCount(count + 1)`** adds only once. Fix: `setCount(c => c + 1)`.
- **No `e.preventDefault()` in `onSubmit`** reloads the page and wipes your state. Fix: call it first in the handler. `return false` does nothing in React.
- **Storing derived data in state** (totals, full name, filtered list) drifts out of sync. Fix: calculate it during render.
- **`useState(props.value)`** copies a prop once and then ignores updates. Fix: use the prop directly, or lift the state.
- **Shallow copies of nested objects.** `{ ...user }` still shares `user.address`. Fix: copy each level you change.
- **`stopPropagation` everywhere** hides clicks from document-level listeners too. Fix: use it only when a parent handler really must not run.
- **`value` without `onChange`** on an input makes it read-only. Fix: add `onChange`, or use `defaultValue` for an uncontrolled input.
- **Setting state while rendering** (a setter call in the component body) loops forever. Fix: set state in handlers or effects.
- **Hooks inside `if` or loops** break the call order. Fix: call `useState` at the top level, and put the condition inside.
- **Expecting state to survive a hide and show.** A component that leaves the screen loses its state. Fix: keep the state in a parent that stays mounted.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Predict. What does this button show after three clicks, and what does the console print? Why?

   ```jsx
   function Clicker() {
     let clicks = 0

     function handleClick() {
       clicks = clicks + 1
       console.log(clicks)
     }

     return <button onClick={handleClick}>Clicks: {clicks}</button>
   }
   ```

<details>
<summary>Show answer</summary>

The console prints `1`, `2`, `3`. The button keeps showing `Clicks: 0`.

`clicks` is an ordinary local variable. Changing it does not tell React to render again, so the screen is never updated. The three clicks do change the variable, because all three handler calls share the same variable from that one render, which is why the log counts up. If anything made the component render again, a new `clicks` starting at 0 would be created and the old value would be lost. Fix: `const [clicks, setClicks] = useState(0)` and `setClicks(clicks + 1)`.

</details>

2. **(Easy)** Code. Build a password field with a Show/Hide button. The input starts as `type="password"`. Clicking the button toggles it to `type="text"` and back, and the button label changes between "Show" and "Hide".

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

function PasswordField() {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label>
        Password <input type={visible ? 'text' : 'password'} />
      </label>
      <button onClick={() => setVisible(!visible)}>{visible ? 'Hide' : 'Show'}</button>
    </div>
  )
}
```

One boolean in state is enough. The `type` attribute and the label are both calculated from it. We ran this: the input switches between `password` and `text` on each click.

</details>

3. **(Easy)** Find and fix the bug. This list is already broken before anyone clicks anything. What goes wrong and how do you fix it? (`onDelete` is a function from the parent that removes a task from the parent's state.)

   ```jsx
   {tasks.map((task) => (
     <li key={task.id}>
       {task.text}
       <button onClick={onDelete(task.id)}>Delete</button>
     </li>
   ))}
   ```

<details>
<summary>Show answer</summary>

`onDelete(task.id)` is called while rendering, once for every task, before anyone clicks. Because `onDelete` sets state in the parent, you are setting state during render. In our run React logged "Cannot update a component while rendering a different component" and the list ended up empty without a single click, because every render deleted more items.

Fix: pass a function that waits to be called.

```jsx
<button onClick={() => onDelete(task.id)}>Delete</button>
```

With this version, clicking Delete on "Wash up" removes only that row.

</details>

4. **(Easy)** Code. Build a text box. Below it, show what the user typed in UPPER CASE and the number of characters. Store only one piece of state.

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

function Echo() {
  const [text, setText] = useState('')

  return (
    <div>
      <label>
        Message <input value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <p>Shouting: {text.toUpperCase()}</p>
      <p>{text.length} characters</p>
    </div>
  )
}
```

The upper-case text and the length are derived from `text`, so they are calculated during render, not stored. Typing "hi there" shows `Shouting: HI THERE` and `8 characters`.

</details>

5. **(Medium)** Predict. This handler runs once, starting from `count = 0`. What is `count` after the re-render? What if it started from 100?

   ```jsx
   function handleClick() {
     setCount((c) => c + 1)
     setCount(5)
     setCount((c) => c + 1)
   }
   ```

<details>
<summary>Show answer</summary>

The result is **6**, from 0 and from 100, and on every later click too.

React processes the queue in order. The first updater is applied to the current value, giving 1 (or 101). `setCount(5)` then replaces whatever came before with 5. The last updater runs on that 5 and gives 6. A plain value in the queue discards the earlier results, and later updaters start from it. (We ran it: the button reads `Count: 6` after the first click and after the second.)

</details>

6. **(Medium)** Code. These three handlers all have a bug caused by mutation. Rewrite each so the screen updates.

   ```jsx
   const [tags, setTags] = useState(['react'])
   const [user, setUser] = useState({ name: 'Ada', address: { city: 'London' } })
   const [scores, setScores] = useState([3, 1, 2])

   function addTag() {
     tags.push('hooks')
     setTags(tags)
   }
   function moveToParis() {
     user.address.city = 'Paris'
     setUser(user)
   }
   function sortScores() {
     setScores(scores.sort((a, b) => a - b))
   }
   ```

<details>
<summary>Show answer</summary>

```jsx
function addTag() {
  setTags([...tags, 'hooks'])
}

function moveToParis() {
  setUser({ ...user, address: { ...user.address, city: 'Paris' } })
}

function sortScores() {
  setScores([...scores].sort((a, b) => a - b))
}
```

Each one builds a new array or object and passes that to the setter. `moveToParis` copies two levels because `address` is nested. `sortScores` copies before sorting because `sort` mutates and returns the same array, so `setScores(scores.sort(...))` passes the old reference. We ran the fixed versions: tags become `react,hooks`, the city `Paris`, scores `1,2,3`.

</details>

7. **(Medium)** Predict. The user clicks this button twice, quickly (both clicks within one second), starting from `count = 0`. What gets logged, and what does the screen show at the end?

   ```jsx
   function handleClick() {
     setCount(count + 5)
     setTimeout(() => {
       console.log('timer sees', count)
     }, 1000)
   }
   ```

<details>
<summary>Show answer</summary>

Logs: `timer sees 0` and then `timer sees 5`. The screen ends at `Count: 10`.

The first click runs in the render where `count` is 0. It sets 5, and its timer remembers 0. By the second click, React has rendered `count = 5`, so that handler sets 5 + 5 = 10, and its timer remembers 5. Each timer holds the snapshot of the render it was created in. (Checked by running it with fake timers.)

</details>

8. **(Medium)** Code. Build a scoreboard. Each player (start with Ana and Ben at 0 points) has +1 and -1 buttons. Show the total of all points. A "Reset all" button sets every player back to 0. Do not store the total in state.

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

function Scoreboard() {
  const [players, setPlayers] = useState([
    { id: 1, name: 'Ana', points: 0 },
    { id: 2, name: 'Ben', points: 0 },
  ])

  function changePoints(id, delta) {
    setPlayers(
      players.map((p) => (p.id === id ? { ...p, points: p.points + delta } : p)),
    )
  }

  function resetAll() {
    setPlayers(players.map((p) => ({ ...p, points: 0 })))
  }

  const total = players.reduce((sum, p) => sum + p.points, 0)

  return (
    <div>
      <ul>
        {players.map((p) => (
          <li key={p.id}>
            {p.name}: {p.points}
            <button onClick={() => changePoints(p.id, 1)}>+1 {p.name}</button>
            <button onClick={() => changePoints(p.id, -1)}>-1 {p.name}</button>
          </li>
        ))}
      </ul>
      <p>Total: {total}</p>
      <button onClick={resetAll}>Reset all</button>
    </div>
  )
}
```

`map` returns a new array, and only the changed player is copied with its new points. `total` is derived with `reduce` on each render. We ran this: Ana +2, Ben +1 then -2 gives Ana 2, Ben -1, total 1, and Reset all returns the total to 0.

</details>

9. **(Medium)** Predict. This page has a parent with state, a `Sidebar` with its own state, and a `Footer`. Each component logs its name when it renders. After mounting, you click "Add click". Then you click the Sidebar button. What is logged each time?

   ```jsx
   function Sidebar() {
     const [open, setOpen] = useState(false)
     console.log('Sidebar')
     return <button onClick={() => setOpen(!open)}>Sidebar {open ? 'open' : 'closed'}</button>
   }

   function Footer({ count }) {
     console.log('Footer')
     return <p>Clicks: {count}</p>
   }

   function Page() {
     const [count, setCount] = useState(0)
     console.log('Page')
     return (
       <div>
         <button onClick={() => setCount(count + 1)}>Add click</button>
         <Sidebar />
         <Footer count={count} />
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

On mount: `Page`, `Sidebar`, `Footer`. (This is without StrictMode. In a Vite dev server, StrictMode doubles each line.)

Click "Add click": `Page`, `Sidebar`, `Footer`. The state lives in `Page`, so `Page` renders, and a parent render renders all its children, including `Sidebar`, which has no props.

Click the Sidebar button: only `Sidebar`. Its state change renders that component (and its children, of which it has none). `Page` and `Footer` do not render, because rendering goes down the tree from the component whose state changed. We ran this and got exactly these logs.

</details>

10. **(Hard)** Predict the exact log order when the button is clicked, and explain which handler is missing from the log.

    ```jsx
    <div onClickCapture={() => log('A capture')} onClick={() => log('A bubble')}>
      <div
        onClickCapture={() => log('B capture')}
        onClick={(e) => {
          log('B bubble')
          e.stopPropagation()
        }}
      >
        <button onClick={() => log('button')}>Go</button>
      </div>
    </div>
    ```

<details>
<summary>Show answer</summary>

`A capture`, `B capture`, `button`, `B bubble`.

Capture handlers run first, from the outside in (A, then B). Then the target's own handler runs (`button`). Then the bubble phase goes from the inside out: `B bubble` runs and calls `stopPropagation`, so the event never reaches `A bubble`. That is the missing one. The capture handlers were not affected because they had already run before anything could stop the event. (Checked by running it.)

</details>

11. **(Hard)** Explain and fix. A mail list stores `items` and a copy of the chosen item in `selected`. After clicking "Shout 1", the list button says "Select Hello!" but the line below still says "Selected: Hello". Why? Redesign the state.

    ```jsx
    const [items, setItems] = useState([
      { id: 1, title: 'Hello' },
      { id: 2, title: 'World' },
    ])
    const [selected, setSelected] = useState(items[0])

    function shout(id) {
      setItems(items.map((i) => (i.id === id ? { ...i, title: i.title + '!' } : i)))
    }
    // ... <button onClick={() => setSelected(i)}>Select {i.title}</button>
    // ... <p>Selected: {selected.title}</p>
    ```

<details>
<summary>Show answer</summary>

The same item now exists in two places: in the `items` array and as the object saved in `selected`. `shout` replaces the item in `items` with a new copy (immutable update), but `selected` still points at the old object, which never changes. The two copies drifted apart. We reproduced it: list shows `Select Hello!`, the selected line shows `Selected: Hello`.

Fix: store only the id, and derive the object.

```jsx
const [selectedId, setSelectedId] = useState(1)
const selected = items.find((i) => i.id === selectedId)

// <button onClick={() => setSelectedId(i.id)}>Select {i.title}</button>
// <p>Selected: {selected.title}</p>
```

Now there is one source of truth (`items`) and `selected` is looked up on every render, so after "Shout 1" the line reads `Selected: Hello!`.

</details>

## Recap
- An event handler is a function you pass (`onClick={handle}`); never call it in JSX, and use `() => handle(x)` to pass arguments.
- React gives handlers a synthetic event (a cross-browser wrapper around the native one); call `e.preventDefault()` for forms, and know that `onChange` fires on every keystroke.
- Events capture down and bubble up; `onClick` is the bubble phase, `onClickCapture` the capture phase, and `stopPropagation` ends the trip early.
- A normal variable cannot replace state: changing it does not re-render, and it is recreated on each render. `useState` gives a remembered value plus a setter that triggers a render.
- An update goes trigger, render, commit. State is a snapshot per render, so `setCount(count + 1)` three times adds 1 and `setCount(c => c + 1)` three times adds 3.
- Never mutate state. Use spread, `map` and `filter` to make new objects and arrays; copy every nested level you change.
- Do not store what you can calculate; keep one source of truth. Each component instance has its own private state.
- A component re-renders when its state changes or its parent renders; updates are batched into one render, including in timeouts and promises since React 18.

## Where to go next
- Next lesson: [Conditional rendering and lists](06-conditional-rendering-and-lists.md), then [Forms](07-forms.md) (controlled inputs in full) and [Thinking in React](08-thinking-in-react.md) (lifting state up).
- Go deeper: [useState in depth](../02-hooks/02-usestate-in-depth.md) and [How React renders](../04-advanced/01-how-react-renders.md).
- Practise: [01 Counter](../practice-app/exercises/react/01-counter/README.md) and [09 Character counter](../practice-app/exercises/react/09-character-counter/README.md).
- Test yourself: [Round 3, output prediction and debugging](../05-interview-rounds/round-3-output-and-debugging/README.md) (start with the state and closures questions), and Round 1, basics quiz (planned).
- Keep handy: Gotchas and common mistakes (planned).
