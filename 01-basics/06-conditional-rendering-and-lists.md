# Conditional Rendering and Lists

> **Level:** Beginner   **Time:** about 45 minutes   **Read first:** [JSX](./03-jsx.md), [Components and props](./04-components-and-props.md), [State and events](./05-state-and-events.md)

## What you will learn
- Choose between `if`, the ternary operator, `&&`, `||`, `??` and lookup objects to decide what a component shows
- Explain and avoid the `0` bug that `{count && <X />}` causes
- Build loading, error and empty states in the right order
- Render arrays with `map`, and explain what a `key` is for and how to choose a good one
- Show what goes wrong with a bad key, and explain why it happens
- Filter, sort, slice and total a list, and add, remove and reorder items, without changing the original data

Every example in this lesson was run with React 19.3.1 and Testing Library. The outputs you see are the real outputs.

## 1. What React draws for each kind of value

Two ideas power this whole lesson.

1. A component can only return a value. So "show this only sometimes" really means "pick a value that is either something to draw or nothing".
2. A list is an array of elements. React draws every item of the array, one after the other.

Both ideas depend on one rule: what does React draw for each kind of value you put inside `{ }`?

| Value inside `{ }` | What you see on the screen |
| --- | --- |
| `"hi"` | the text `hi` |
| `42` or `0` | the digits `42` or `0` |
| `NaN` | the text `NaN` |
| `""` (empty string) | nothing |
| `null` or `undefined` | nothing |
| `true` or `false` | nothing |
| `[]` (empty array) | nothing |
| `[1, 2, 3]` | `123` (every item is drawn, side by side, with no separator) |
| a JSX element | that element |
| a plain object such as `{ name: 'Ada' }` | an error |

A small example:

```jsx
function Demo() {
  return (
    <p>
      [{'hi'}] [{0}] [{null}] [{false}] [{[1, 2, 3]}]
    </p>
  )
}
```

**What happens, step by step:**
1. React evaluates each `{ }` expression one by one.
2. The string `'hi'` becomes text. The number `0` also becomes text: React does **not** treat zero as "nothing".
3. `null` and `false` produce no output, so only the square brackets around them remain.
4. The array `[1, 2, 3]` is drawn item by item, giving `123`.
5. The final HTML is `<p>[hi] [0] [] [] [123]</p>`.

Remember the zero. It is the seed of the most famous bug in this lesson (section 4).

**Common mistake:** putting a plain object inside `{ }`.

```jsx
const user = { name: 'Ada', age: 36 }

// Wrong: throws "Objects are not valid as a React child (found: object with keys {name, age})"
return <p>{user}</p>

// Right: pick the fields you want to show
return <p>{user.name}, {user.age}</p>
```

React cannot guess how to turn an object into screen content, so you choose the fields. A `Date` object fails the same way: use `date.toLocaleDateString()`.

## 2. If statements and early returns

A component is a normal JavaScript function. Before it returns JSX it can run any code, including `if`. The `if` goes before the `return`, because between `{ }` inside JSX only expressions fit, and `if` is a statement.

An **early return** means: deal with the special case first and return at once. The main case stays at the bottom with no extra indentation.

```jsx
function Greeting({ user }) {
  if (!user) {
    return <p>Please sign in.</p>
  }
  return <p>Welcome back, {user.name}!</p>
}
```

**What happens, step by step:**
1. A parent renders `<Greeting user={null} />`. React calls `Greeting`.
2. `!user` is `true`, so the function returns the sign-in paragraph. The last line never runs. The screen shows `Please sign in.`
3. Later the parent passes `{ name: 'Ada' }`. React calls `Greeting` again. This is a brand new call, so nothing is remembered from the first one.
4. `!user` is `false`, so the `if` is skipped and the screen shows `Welcome back, Ada!`.

To show nothing at all, return `null`:

```jsx
function Banner({ message }) {
  if (!message) return null
  return <div className="banner">{message}</div>
}
```

With `message=""` the container is completely empty. With `message="Sale today"` it holds `<div class="banner">Sale today</div>`. The component still runs on every render, it just draws nothing. Any hooks inside it still run too.

**Common mistake:** calling a hook after an early return.

```jsx
// Wrong: useState runs only when user exists
function Profile({ user }) {
  if (!user) return null
  const [open, setOpen] = useState(false)
  return <button onClick={() => setOpen(!open)}>{user.name}</button>
}

// Right: all hooks first, then the early returns
function Profile({ user }) {
  const [open, setOpen] = useState(false)
  if (!user) return null
  return <button onClick={() => setOpen(!open)}>{user.name}</button>
}
```

React remembers hooks by the order in which they are called, so every render must call the same hooks in the same order. In our test, a component with one hook before an early return and one after it crashed with `Rendered more hooks than during the previous render.` when the user appeared, and with `Rendered fewer hooks than expected. This may be caused by an accidental early return statement.` when the user went away. The fixed version above rendered correctly through null, user, click and null again. See [Hooks overview and rules](../02-hooks/01-hooks-overview-and-rules.md).

## 3. The ternary operator: either this or that

`condition ? valueIfTrue : valueIfFalse` is an expression, so it fits inside `{ }`. Use it when there are exactly two outcomes.

```jsx
import { useState } from 'react'

function AuthButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <button onClick={() => setIsLoggedIn(!isLoggedIn)}>
      {isLoggedIn ? 'Log out' : 'Log in'}
    </button>
  )
}
```

**What happens, step by step:**
1. First render: `isLoggedIn` is `false`, so the ternary picks `'Log in'`.
2. The user clicks. `setIsLoggedIn(true)` asks React to render again.
3. React calls `AuthButton` again. Now `isLoggedIn` is `true`, so the text is `'Log out'`. A second click flips it back.

You can choose between whole elements too, and use `null` for the "nothing" branch:

```jsx
{isLoggedIn ? <Dashboard /> : <LoginForm />}
<nav>{isAdmin ? <a href="/admin">Admin</a> : null}</nav>
```

With `isAdmin` true the nav holds `<a href="/admin">Admin</a>`. With `isAdmin` false the nav stays empty. When one branch is `null`, `&&` (next section) is usually shorter.

**Common mistake:** nesting ternaries.

```jsx
// Wrong: hard to read, easy to break
{status === 'loading' ? <Spinner /> : status === 'error' ? <ErrorBox /> : <List />}

// Right: with more than two outcomes, use early returns in a small component
// (section 8) or a lookup object (section 7)
```

## 4. `&&`: show it or show nothing (and the 0 bug)

`a && b` gives `a` when `a` is falsy, and gives `b` otherwise. React then draws the result. If the result is `false`, nothing appears. If it is an element, the element appears.

The falsy values in JavaScript are `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined` and `NaN`. Every other value is truthy, including `"0"`, `[]` and `{}`.

```jsx
function Inbox({ unread }) {
  return (
    <div>
      <h2>Inbox</h2>
      {unread > 0 && <p>You have {unread} unread messages.</p>}
    </div>
  )
}
```

**What happens, step by step:**
1. With `unread={5}`: `5 > 0` is `true`, so `true && <p>...</p>` gives the `<p>`. It is drawn.
2. With `unread={0}`: `0 > 0` is `false`, so the result is `false`. Nothing is drawn.

**Common mistake: the `0` bug.** Using the number itself as the left side:

```jsx
// Wrong
{unread && <p>You have {unread} unread messages.</p>}
```

With `unread={0}`, `0 && <p>...</p>` gives `0` (the left side, because it is falsy). React draws zero as text. The real output was:

```text
<div><h2>Inbox</h2>0</div>
```

A stray `0` on the screen is a classic bug. Here is what each left side does when written as `value && <span>X</span>`:

| Left side | What is drawn |
| --- | --- |
| `0` | `0` |
| `NaN` | `NaN` |
| `""` | nothing |
| `null`, `undefined`, `false` | nothing |
| `"0"` | the span (a non-empty string is truthy) |
| `[]` | the span (an empty array is truthy) |
| `1` | the span |

Four safe fixes:

```jsx
{unread > 0 && <p>...</p>}        // best: the check is a real boolean
{Boolean(unread) && <p>...</p>}   // converts to a boolean first
{!!unread && <p>...</p>}          // same idea, shorter
{unread ? <p>...</p> : null}      // a ternary never leaks the number
```

The same bug hides in `{items.length && <List />}`: with an empty array it draws `0`. Write `items.length > 0 &&` instead. And since `[]` is truthy, `{items && <List />}` draws the list even when it is empty.

## 5. `||` and `??`: fallback values

Sometimes you do not want to hide something, you want a **fallback**: "show this value, or else that one".

- `a || b` uses `b` whenever `a` is falsy (including `0` and `""`).
- `a ?? b` uses `b` only when `a` is `null` or `undefined`.

```jsx
function Profile({ name, score }) {
  return (
    <p>
      {name || 'Guest'} scored {score ?? 'no score yet'}
    </p>
  )
}
```

Real outputs (the last column shows the bug of using `||` for the score too):

| `name` | `score` | `Profile` above | with `score \|\| 'no score yet'` |
| --- | --- | --- | --- |
| `'Ada'` | `90` | Ada scored 90 | Ada scored 90 |
| `''` | `0` | Guest scored 0 | Guest scored no score yet |
| `null` | `undefined` | Guest scored no score yet | Guest scored no score yet |

**What happens, step by step (second row):**
1. `name` is `''`, which is falsy, so `'' || 'Guest'` gives `'Guest'`. An empty name should look like a missing name, so `||` is right here.
2. `score` is `0`. `0 ?? 'no score yet'` gives `0`, because zero is not `null` or `undefined`. A score of zero is real data, so `??` is right here.
3. React draws that `0` as text, because it is a number.

Default parameter values follow the `??` rule, not the `||` rule. They apply only to `undefined`:

```jsx
function Avatar({ size = 40 }) {
  return <span>size={String(size)}</span>
}
```

`<Avatar />` and `<Avatar size={undefined} />` give `size=40`. But `<Avatar size={null} />` gives `size=null` and `<Avatar size={0} />` gives `size=0`.

**Common mistake:** using `||` for a number that can be zero.

```jsx
// Wrong: a score of 0 shows "no score yet"
{score || 'no score yet'}

// Right: only null and undefined count as missing
{score ?? 'no score yet'}
```

Rule of thumb: use `??` unless you really want `""`, `0` and `false` to trigger the fallback too.

## 6. Element variables and small components

When there are three or more outcomes, or a branch has a lot of JSX, put the element in a variable first, then use the variable in the return.

```jsx
function OnlineStatus({ state }) {
  let content
  if (state === 'online') {
    content = <span className="green">Online</span>
  } else if (state === 'away') {
    content = <span className="yellow">Away</span>
  } else {
    content = <span className="grey">Offline</span>
  }
  return <p>Status: {content}</p>
}
```

**What happens, step by step:**
1. `content` starts as `undefined`.
2. The `if` chain assigns one element to `content`, depending on `state`.
3. The return statement stays short: `Status: {content}`.
4. For `state="away"` the output is `<p>Status: <span class="yellow">Away</span></p>`. For `state="gone"` the last `else` runs and you get `Offline`.

If the chain grows, move it into its own **small component** with early returns. The parent then reads like a sentence:

```jsx
function StatusText({ status }) {
  if (status === 'online') return <span>Online</span>
  if (status === 'away') return <span>Away</span>
  return <span>Offline</span>
}

// In the parent:
<p>Status: <StatusText status={status} /></p>
```

Extract a component when a ternary gets nested, when the same condition appears twice, or when a branch is more than a few lines long.

**Common mistake:** forgetting the last `else`, so some inputs leave the variable empty.

```jsx
// Wrong: for state="gone", content stays undefined and nothing is drawn
let content
if (state === 'online') content = <span>Online</span>
else if (state === 'away') content = <span>Away</span>

// Right: end with an else, or give content a default value
let content = <span>Offline</span>
if (state === 'online') content = <span>Online</span>
else if (state === 'away') content = <span>Away</span>
```

`undefined` draws nothing (section 1), so this bug is silent. There is no error to warn you.

## 7. Lookup objects: a switch for JSX

An object can act like a `switch`. The key is the value you check, and the property is the result.

```jsx
const LABELS = { idle: 'Not started', running: 'In progress', done: 'Finished' }

function StatusLabel({ status }) {
  return <span>{LABELS[status] ?? 'Unknown'}</span>
}
```

You can store whole components in the object, too:

```jsx
const ListView = ({ items }) => (
  <ul>
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
)

const GridView = ({ items }) => (
  <div className="grid">
    {items.map((item) => (
      <span key={item}>{item}</span>
    ))}
  </div>
)

const VIEWS = { list: ListView, grid: GridView }

function Items({ mode, items }) {
  const View = VIEWS[mode] ?? ListView
  return <View items={items} />
}
```

**What happens, step by step:**
1. `mode` is `'grid'`. `VIEWS['grid']` is the `GridView` function.
2. The result goes into a variable called `View`. The name **must start with a capital letter**: in JSX a lowercase tag such as `<view>` means an HTML element, and a capital letter means a component.
3. React renders `<View items={items} />`, which is `GridView`. For `items=['a', 'b']` that gives `<div class="grid"><span>a</span><span>b</span></div>`.
4. For `mode="table"`, which is not in the object, `VIEWS['table']` is `undefined`, so `??` falls back to `ListView` and you get `<ul><li>a</li><li>b</li></ul>`.

A `switch` statement inside a helper function does the same job. Choose whichever reads better to you.

**Common mistake:** looking up a key that comes from outside (a URL, an API) without checking it.

```jsx
// Wrong: status = 'toString' finds a function on Object.prototype
<span>{LABELS[status] ?? 'Unknown'}</span>

// Right: only accept the object's own keys
<span>{Object.hasOwn(LABELS, status) ? LABELS[status] : 'Unknown'}</span>
```

In our run, `status="toString"` made React draw nothing and log an error, because a function is not a valid child. `??` did not help: a function is not `null` or `undefined`. A `Map` avoids the problem as well.

## 8. Loading, error and empty states

A screen that shows data from somewhere else (a server, a file) always has four states: **loading**, **error**, **empty** (loaded, but nothing to show) and **data**. If you forget one, the user sees a blank page, a crash, or a confusing message.

```jsx
function UserList({ status, users, error }) {
  if (status === 'loading') {
    return <p role="status">Loading users...</p>
  }
  if (status === 'error') {
    return <p role="alert">Could not load users: {error}</p>
  }
  if (users.length === 0) {
    return <p>No users yet.</p>
  }
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

**What happens, step by step:**
1. `status="loading"`: the first check matches. The component returns `Loading users...` and stops.
2. `status="error"`: the second check matches. For `error="Network down"` the user sees `Could not load users: Network down`.
3. `status="success"` with `users=[]`: the first two checks fail, the third matches, and the user sees `No users yet.`
4. `status="success"` with two users: all three checks fail, and `<ul><li>Ada</li><li>Linus</li></ul>` is drawn.

Two good habits:
- Keep **one** `status` string (`'loading'`, `'error'`, `'success'`) instead of two booleans such as `isLoading` and `isError`. Two booleans allow the impossible combination "loading and failed at the same time".
- Give the messages a role. `role="status"` is polite (screen readers announce it when idle) and `role="alert"` is urgent. The roles also let tests find the messages with `getByRole`. See [Accessibility](../04-advanced/09-accessibility.md).

How the data arrives (fetch, effects, TanStack Query) is the job of [Data fetching](../03-intermediate/02-data-fetching.md). This lesson only shows how to draw each state.

**Common mistake:** checking "empty" before "loading".

```jsx
// Wrong: while loading, users is still [], so the user sees "No users yet."
if (users.length === 0) return <p>No users yet.</p>
if (status === 'loading') return <p>Loading...</p>

// Right: loading first, then error, then empty, then data
if (status === 'loading') return <p>Loading...</p>
if (users.length === 0) return <p>No users yet.</p>
```

We ran the wrong order with `status="loading"` and `users=[]`. It drew `No users yet.`, a message that is false at that moment.

## 9. Conditional classes and styles

Often the element stays, and only its look changes. Use the same tools on the `className` and `style` props.

```jsx
function Tab({ label, isActive }) {
  return (
    <button className={isActive ? 'tab active' : 'tab'} aria-pressed={isActive}>
      {label}
    </button>
  )
}
```

With `isActive` true the HTML is `<button class="tab active" aria-pressed="true">Home</button>`. With false it is `class="tab" aria-pressed="false"`. The `aria-pressed` attribute tells screen reader users what the colour tells sighted users.

For inline styles, an `undefined` value means "do not set this property":

```jsx
<p style={{ color: isError ? 'red' : undefined, fontWeight: isActive ? 'bold' : 'normal' }}>
  Hello
</p>
```

With both flags true the HTML is `style="color: red; font-weight: bold;"`. With both false it is `style="font-weight: normal;"`, with no `color` at all.

When there are several optional classes, build an array, remove the falsy items, and join them:

```jsx
function Badge({ isPrimary, isLarge }) {
  const classes = ['badge', isPrimary && 'primary', isLarge && 'large'].filter(Boolean).join(' ')
  return <span className={classes}>New</span>
}
```

For `isPrimary` false and `isLarge` true, `classes` is exactly `"badge large"`.

**Common mistake:** using `&&` inside a template string.

```jsx
// Wrong: when isPrimary is false the class becomes the word "false"
<span className={`badge ${isPrimary && 'primary'}`}>New</span>

// Right
<span className={`badge ${isPrimary ? 'primary' : ''}`}>New</span>
```

The wrong version produced `class="badge false"`. The fixed ternary gives `"badge primary"` or `"badge "` (a trailing space, which is harmless). Writing your own helper for this is the [classnames exercise](../practice-app/exercises/js/21-classnames/README.md). More about CSS in React is in [Styling](../03-intermediate/07-styling.md).

## 10. Not rendering versus hiding: what happens to state

React keeps a component's state only while the component stays at the same place in the tree. When your JSX stops returning a component, React **unmounts** it (removes it from the screen) and throws its state away. Compare two ways to hide a counter:

```jsx
import { useState } from 'react'

function Counter({ label }) {
  const [n, setN] = useState(0)
  return (
    <button onClick={() => setN(n + 1)}>
      {label}: {n}
    </button>
  )
}

function WithAnd() {
  const [show, setShow] = useState(true)
  return (
    <div>
      <button onClick={() => setShow(!show)}>Toggle</button>
      {show && <Counter label="Count" />}
    </div>
  )
}

function WithHidden() {
  const [show, setShow] = useState(true)
  return (
    <div>
      <button onClick={() => setShow(!show)}>Toggle</button>
      <div hidden={!show}>
        <Counter label="Count" />
      </div>
    </div>
  )
}
```

**What happens, step by step:** click the counter twice (it shows `Count: 2`), click Toggle to hide, click Toggle again to show.
1. In `WithAnd`, hiding makes `show && ...` return `false`. The HTML is just `<div><button>Toggle</button></div>`. The counter is gone, and so is its state.
2. Showing it again creates a brand new `Counter` with `n = 0`. The screen says `Count: 0`.
3. In `WithHidden`, the counter is always rendered. Hiding only adds the `hidden` attribute: `<div hidden=""><button>Count: 2</button></div>`.
4. Showing it again reveals the same counter, still at `Count: 2`.

Two related facts:

**The same component type at the same spot keeps its state.** In `{first ? <Counter label="Ann" /> : <Counter label="Ben" />}` both branches are a `Counter` at the same position, so React sees "the same component". After two clicks on Ann and a swap, the screen showed `Ben: 2`. The label changed, the number stayed.

**A `key` resets state.** Give each branch a different key (`key="ann"` and `key="ben"`) and React treats them as different components: the same swap showed `Ben: 0`. This works outside lists, too. `<Profile key={userId} />` starts a fresh `Profile` whenever `userId` changes. Without the key, a counter inside `Profile` went from `User 1: 2` to `User 2: 2`. With the key it went to `User 2: 0`. More in [useState in depth](../02-hooks/02-usestate-in-depth.md).

Which should you choose? Unmounting (`&&`, ternary) is the default: it is simple, it frees memory, and it gives fresh state. Hide with `hidden` or CSS only when you must keep the state (a half-typed form, a scroll position). React 19.2 also added `<Activity mode="hidden">`, which hides a subtree and keeps its state; see [Concurrent React and Suspense](../04-advanced/03-concurrent-react-and-suspense.md).

**Common mistake:** expecting `&&` to remember state.

```jsx
// Wrong: the Editor's draft text is lost every time the panel closes
{isOpen && <Editor />}

// Right: keep the draft in a parent (lift the state up) ...
const [draft, setDraft] = useState('')
{isOpen && <Editor draft={draft} onChange={setDraft} />}
// ... or hide with the hidden attribute instead of unmounting
```

## 11. Rendering a list with `map`

Data often comes as an array. To show it, turn the array of data into an array of elements with `map`. React draws arrays (section 1).

```jsx
const fruits = [
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Banana' },
  { id: 3, name: 'Cherry' },
]

function FruitList() {
  return (
    <ul>
      {fruits.map((fruit) => (
        <li key={fruit.id}>{fruit.name}</li>
      ))}
    </ul>
  )
}
```

**What happens, step by step:**
1. `fruits.map(fn)` calls `fn` once for every item, in order, and collects the return values in a **new** array. The original array is untouched.
2. Each call returns one `<li>` element, so the new array holds three elements.
3. React draws the array in order: `<ul><li>Apple</li><li>Banana</li><li>Cherry</li></ul>`.
4. The `key` on each `<li>` is explained in the next section. Do not skip it.

Why `map` and not `forEach` or a `for` loop? Because `{ }` needs a **value**. `map` returns an array. `forEach` returns `undefined`, which draws nothing. A `for` loop is a statement and cannot sit inside `{ }` at all.

**Common mistake:** braces in the arrow function with no `return`.

```jsx
// Wrong: the braces make a function body, and nothing is returned
{fruits.map((fruit) => {
  <li key={fruit.id}>{fruit.name}</li>
})}

// Right: parentheses return the JSX directly ...
{fruits.map((fruit) => (
  <li key={fruit.id}>{fruit.name}</li>
))}

// ... or keep the braces and write return
{fruits.map((fruit) => {
  return <li key={fruit.id}>{fruit.name}</li>
})}
```

We ran the wrong version. The `<ul>` came out empty, with no warning and no error. Using `forEach` instead of `map` gave the same silent empty list.

## 12. Keys: what they are for

A **key** is a name tag that you stick on each item of a list. When the list changes, React reads the tags to work out which item was added, which was removed and which only moved. Without good tags it can only compare by position, and position is a poor identity when items move.

Think of a classroom. If you identify students by **seat number**, then when two students swap seats you cannot tell who is who. A **name tag** follows the student wherever they sit.

The rules:
1. **Unique among siblings.** Two items in the same array must not share a key. Items in different arrays may.
2. **Stable.** The same item must get the same key on every render.
3. **From the data.** A database id, a slug or a username is ideal.
4. **Never random.** Do not use `Math.random()`, and do not generate an id during render.
5. **Index only for static lists** (section 14).
6. **On the outermost element** that the `map` callback returns.

**What happens, step by step**, when a list changes from `[Ann (id 1), Ben (id 2)]` to `[Ben (id 2)]`:
1. Before the change, React holds one record per key: key `1` (Ann) with its `<li>`, and key `2` (Ben) with its `<li>`.
2. The new list contains only key `2`.
3. Key `1` has no match, so React removes Ann's `<li>`.
4. Key `2` matches, so React keeps Ben's `<li>` (and any state inside it) and only updates its props.

What the warnings look like:

- Missing key: React logs `Each child in a list should have a unique "key" prop.` and adds "Check the render method of" followed by your component name. The list still draws.
- Duplicate keys: React logs `Encountered two children with the same key`. The list still draws, but the warning calls the behaviour unsupported: items may be duplicated or left out.

**A key is not a prop.** React uses it for itself and does not pass it to your component:

```jsx
function Row(props) {
  return (
    <li>
      key prop is: {String(props.key)} | id prop is: {String(props.id)}
    </li>
  )
}

// In the parent:
<ul>
  {[{ id: 7 }].map((item) => (
    <Row key={item.id} id={item.id} />
  ))}
</ul>
```

The output is `key prop is: undefined | id prop is: 7`, and React logs a warning that `key` is not a prop. If a child needs the value, pass it again under another name, as `id` here.

**Keys only need to be unique among siblings.** We rendered two separate `<ul>` lists that both used the keys `1` and `2`. React printed no warning.

**Common mistake:** putting the key inside the child component instead of on the element in the `map`.

```jsx
// Wrong: the array holds <Row /> elements, and they have no key
function Row({ person }) {
  return <li key={person.id}>{person.name}</li>
}
{people.map((person) => <Row person={person} />)}

// Right: the key goes on whatever the map callback returns
function Row({ person }) {
  return <li>{person.name}</li>
}
{people.map((person) => <Row key={person.id} person={person} />)}
```

We ran the wrong version, and React still logged the missing key warning. React reads the key from the element in the array, not from inside the component.

## 13. What goes wrong with bad keys (a live example)

Here is a list where every row has an input box. The inputs are **uncontrolled**: the text lives inside the browser's input element, not in React state. The keys are the array **index**, which is the tempting wrong choice.

```jsx
import { useState } from 'react'

const START = [
  { id: 'a1', name: 'Alice' },
  { id: 'b2', name: 'Bob' },
  { id: 'c3', name: 'Carol' },
]

export default function NoteList() {
  const [people, setPeople] = useState(START)

  return (
    <div>
      <button onClick={() => setPeople(people.slice(1))}>Remove first</button>
      <button onClick={() => setPeople([{ id: 'z9', name: 'Zed' }, ...people])}>
        Add Zed at start
      </button>
      <button onClick={() => setPeople([...people].reverse())}>Reverse</button>
      <ul>
        {people.map((person, index) => (
          <li key={index}>
            {person.name}: <input aria-label={`Note for ${person.name}`} />
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Try it: type `hello` into Alice's box, then click one button. (Click "Add Zed at start" only once, because Zed has a fixed id.) Here is what we saw, row by row as `name: typed text`:

| Action | `key={index}` | `key={person.id}` |
| --- | --- | --- |
| Remove first | `Bob: hello`, `Carol:` | `Bob:`, `Carol:` |
| Add Zed at start | `Zed: hello`, `Alice:`, `Bob:`, `Carol:` | `Zed:`, `Alice: hello`, `Bob:`, `Carol:` |
| Reverse | `Carol: hello`, `Bob:`, `Alice:` | `Carol:`, `Bob:`, `Alice: hello` |

With index keys the text `hello` stays in the first row, even though the person in that row changed. With id keys the text follows Alice. That is the whole point of a key.

**Why this happens, step by step**, for "Remove first" with index keys:
1. The typed text is stored in the browser's `<input>` element, not in your data. Your data only knows names.
2. After the removal the list is `[Bob, Carol]`, with indexes `0` and `1`.
3. React sees key `0` again. It says: same key, same kind of element, so reuse the existing `<li>` and its `<input>`. It only updates the text from `Alice:` to `Bob:`.
4. The reused `<input>` still holds `hello`, so Bob's row now shows Alice's text.
5. Key `2` is missing from the new list, so the third `<li>` (Carol's old row) is removed, along with anything typed in it.

In one sentence: **React attaches state to a position (identified by the key), not to the data item.** An index key says "the first row", whoever is in it. An id key says "Alice's row", wherever she is.

This is not only about inputs. The same thing happens to state inside child components. We put a `Counter` (section 10) in each row, clicked Alice's counter twice, then removed the first row:

```text
before:                  Alice: 2 | Bob: 0 | Carol: 0
after, key={index}:      Bob: 2 | Carol: 0      (Alice's count landed on Bob)
after, key={person.id}:  Bob: 0 | Carol: 0      (correct)
```

Two more results from the same experiment:
- **No key at all** gave exactly the same output as index keys. When you give no key, React falls back to the index (and prints the missing key warning).
- **A random key** (`key={Math.random()}`) is a new key on every render, so React destroys and rebuilds every row each time. With two counters in the list, clicking Ann twice showed `Ann: 2`, but typing one letter into a different input in the parent reset it to `Ann: 0`. Typed text and focus are lost in the same way.

**Common mistake:** "my list works, so index keys must be fine."

```jsx
// Wrong: looks fine until someone deletes, sorts, filters or inserts
{people.map((person, index) => <PersonRow key={index} person={person} />)}

// Right: a stable id from the data
{people.map((person) => <PersonRow key={person.id} person={person} />)}
```

Index keys look right when you only append at the end and the rows hold no state. The bug appears the day a feature changes the order. Ids cost nothing, so use them from the start.

## 14. Where keys come from

1. **From the data.** Most data already has an id: a database primary key, a UUID, a slug, an email address that is guaranteed unique. Use it: `key={user.id}`.
2. **When you create an item, give it an id at that moment**, inside the event handler, never during render:

   ```jsx
   function addTask(text) {
     const task = { id: crypto.randomUUID(), text, done: false }
     setTasks((current) => [...current, task])
   }
   ```

   `crypto.randomUUID()` works in browsers on secure pages (https or localhost). A simple counter (`let nextId = 1`, then `nextId++`) works as well. Section 18 uses a counter.
3. **If the data from an API has no ids**, add them once when the data arrives (for example `rows.map((row) => ({ ...row, id: crypto.randomUUID() }))` in the code that stores the response), not on every render.
4. **Combine fields** when one field is not unique: `${order.id}-${line.sku}`.
5. **Do not use `useId`** for list keys. That hook is for linking labels to inputs.

**When is the index acceptable?** Only when **all** of these are true: the list never reorders, never filters, and never has items inserted or removed in the middle; and the items hold no state and no uncontrolled inputs. A fixed list of menu links is a fair example. If you are unsure, use an id.

**What happens, step by step**, with `addTask`:
1. The user submits the form. The handler runs once (handlers are not repeated on re-renders).
2. It creates one task with a brand new id.
3. `setTasks` stores a new array that includes the task.
4. On every later render the task still has the same id, so React keeps matching the same `<li>` to it.

**Common mistake:** creating the key during render.

```jsx
// Wrong: a new key on every render means a full rebuild of every row
{tasks.map((task) => <li key={crypto.randomUUID()}>{task.text}</li>)}

// Right: the key was stored with the item when it was created
{tasks.map((task) => <li key={task.id}>{task.text}</li>)}
```

## 15. Fragments with keys

Sometimes each item needs to produce two or more sibling elements with no wrapper. A description list is a good case: every entry is a `<dt>` followed by a `<dd>`, and you may not want an extra element around each pair. Another case is a component that returns several table rows, because a `<div>` is not allowed between `<tbody>` and `<tr>`. Use `Fragment`, which draws only its children. The short form `<>...</>` cannot take a key, so write `Fragment` out in full.

```jsx
import { Fragment } from 'react'

const terms = [
  { id: 'js', term: 'JSX', meaning: 'HTML-like syntax inside JavaScript' },
  { id: 'st', term: 'State', meaning: 'Data that changes over time' },
]

function Glossary() {
  return (
    <dl>
      {terms.map((item) => (
        <Fragment key={item.id}>
          <dt>{item.term}</dt>
          <dd>{item.meaning}</dd>
        </Fragment>
      ))}
    </dl>
  )
}
```

**What happens, step by step:**
1. For each term, the `map` callback returns one `Fragment` element, and that element carries the key.
2. React draws only the two children of each fragment, with no extra element in between.
3. The HTML is `<dl><dt>JSX</dt><dd>HTML-like syntax inside JavaScript</dd><dt>State</dt><dd>Data that changes over time</dd></dl>`.
4. React logged no warning.

**Common mistake:** forgetting the key on the fragment.

```jsx
// Wrong: React logs the missing key warning
{terms.map((item) => (
  <Fragment>
    <dt>{item.term}</dt>
    <dd>{item.meaning}</dd>
  </Fragment>
))}

// Right: put the key on the Fragment, the outermost element
{terms.map((item) => (
  <Fragment key={item.id}>
    <dt>{item.term}</dt>
    <dd>{item.meaning}</dd>
  </Fragment>
))}
```

The wrong version produced exactly one warning in our run.

## 16. Filter, sort, slice and reduce: lists you calculate

The list a user sees is usually **calculated** from three things: the full data, a search box and a sort option. Do not keep the filtered list in state. Keep only the inputs (the search text and the sort choice) in state, and calculate the visible list during every render. There is then one source of truth, and nothing can get out of sync. The exercise [Filterable list](../practice-app/exercises/react/07-filterable-list/README.md) practises exactly this.

```jsx
import { useState } from 'react'

const PRODUCTS = [
  { id: 1, name: 'Wireless Mouse', category: 'Electronics', price: 25 },
  { id: 2, name: 'Mechanical Keyboard', category: 'Electronics', price: 90 },
  { id: 3, name: 'Learning React', category: 'Books', price: 35 },
  { id: 4, name: 'Clean Code', category: 'Books', price: 30 },
  { id: 5, name: 'Desk Lamp', category: 'Home', price: 32 },
  { id: 6, name: 'Coffee Mug', category: 'Home', price: 12 },
]

function ProductList({ products }) {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')

  const needle = query.trim().toLowerCase()
  const visible = products
    .filter((product) => product.name.toLowerCase().includes(needle))
    .sort((a, b) =>
      sortBy === 'price' ? a.price - b.price : a.name.localeCompare(b.name),
    )

  return (
    <div>
      <label>
        Search
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <label>
        Sort by
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Name</option>
          <option value="price">Price</option>
        </select>
      </label>
      <p>
        Showing {visible.length} of {products.length}
      </p>
      {visible.length === 0 ? (
        <p>No products match "{query}".</p>
      ) : (
        <ul>
          {visible.map((product) => (
            <li key={product.id}>
              {product.name} (${product.price})
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Usage: <ProductList products={PRODUCTS} />
```

**What happens, step by step:**
1. On the first render `query` is `''`, so every name includes it, and `filter` keeps all six products. They are sorted by name: the first is `Clean Code ($30)` and the last is `Wireless Mouse ($25)`. The status line says `Showing 6 of 6`.
2. The user picks "Price". `setSortBy('price')` triggers a render. The same six products are now ordered `Coffee Mug ($12)`, `Wireless Mouse ($25)`, `Clean Code ($30)` and so on up to `Mechanical Keyboard ($90)`.
3. Typing `o` in the search box keeps four products (the names that contain an "o"), still sorted by price. The status line says `Showing 4 of 6`.
4. Typing `zzz` leaves zero matches. The empty branch runs and shows `No products match "zzz".`
5. `PRODUCTS` itself was never reordered: the ids were still `1, 2, 3, 4, 5, 6` afterwards.

Notice that `trim()` and `toLowerCase()` make the search forgiving. Also notice the two different empty states: "there is no data at all" and "nothing matches your search" deserve different messages.

### Sort changes the array it is called on

`sort()` and `reverse()` **mutate**, which means they rearrange the original array in place and return that same array. In React that breaks the rule "never change state or props in place". Our run:

```js
const a = [3, 1, 2]
const b = a.sort()
console.log(a === b) // true: the same array
console.log(a)       // [1, 2, 3]: the original was changed
```

`filter`, `map` and `slice` return **new** arrays, so sorting their result is safe. That is why the chain above is fine. When you sort the original, copy first, with spread or with `toSorted()`:

```js
const sorted = [...items].sort(compare)  // copy, then sort the copy
const sorted2 = items.toSorted(compare)  // one step; there is also toReversed()
```

`toSorted` and `toReversed` exist in Node 24 and in current browsers. Check your target browsers if you support old ones.

The default `sort()` compares items as **text**, even numbers:

```js
[10, 9, 1].sort()                // [1, 10, 9]   (text order, surprising)
[10, 9, 1].sort((x, y) => x - y) // [1, 9, 10]   (number order)
['b', 'a', 'C', 'ä', 'z'].sort()                             // ['C', 'a', 'b', 'z', 'ä']
['b', 'a', 'C', 'ä', 'z'].sort((x, y) => x.localeCompare(y)) // ['a', 'ä', 'b', 'C', 'z']
```

Always pass a compare function: `a - b` for numbers and `localeCompare` for words.

**Common mistake:** sorting a prop or state array in place during render.

```jsx
function BadSorted({ initial }) {
  const [list] = useState(initial)
  const sorted = list.sort((a, b) => a - b) // Wrong: sorts the state array itself
  return <p>{sorted.join(', ')}</p>
}

const sortedCopy = [...list].sort((a, b) => a - b) // Right: sort a copy
```

When we rendered `BadSorted` with `initial = [3, 1, 2]`, the paragraph said `1, 2, 3` and the caller's array was now `[1, 2, 3]` too. The render had changed data it did not own.

### `slice` for pagination

`slice(start, end)` copies a piece of an array and leaves the original alone. That makes it the tool for pages.

```jsx
const PAGE_SIZE = 3

function PagedList({ items }) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const pageItems = items.slice(start, start + PAGE_SIZE)

  return (
    <div>
      <ul>
        {pageItems.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
      <button onClick={() => setPage(page - 1)} disabled={page === 1}>
        Previous
      </button>
      <span>
        Page {page} of {pageCount}
      </span>
      <button onClick={() => setPage(page + 1)} disabled={page === pageCount}>
        Next
      </button>
    </div>
  )
}
```

**What happens, step by step**, with seven items named `Item 1` to `Item 7`:
1. `pageCount` is `Math.ceil(7 / 3)`, which is 3.
2. On page 1, `start` is 0, so `slice(0, 3)` gives Items 1 to 3. The text says `Page 1 of 3` and "Previous" is disabled.
3. Two clicks on Next reach page 3. `start` is 6 and `slice(6, 9)` gives only `Item 7`, because `slice` is happy to stop at the end of the array. "Next" is now disabled.
4. With an empty array, `pageCount` is `Math.max(1, 0)`, which is 1, so the text says `Page 1 of 1` and not `Page 1 of 0`.

When you filter, sort and paginate together, the order is: filter, then sort, then slice. The exercise [Pagination](../practice-app/exercises/react/13-pagination/README.md) goes deeper.

### `reduce` for totals

`reduce` folds a whole array into one value: a sum, a count, an object.

```jsx
function CartTotal({ lines }) {
  const total = lines.reduce((sum, line) => sum + line.price * line.qty, 0)
  const count = lines.reduce((n, line) => n + line.qty, 0)
  return (
    <p>
      {count} items, total ${(total / 100).toFixed(2)}
    </p>
  )
}

// <CartTotal lines={[
//   { id: 'm', name: 'Mug', price: 1250, qty: 2 },
//   { id: 'b', name: 'Book', price: 3499, qty: 1 },
// ]} />
```

**What happens, step by step:**
1. `reduce` starts with `sum = 0` (the second argument).
2. For the Mug it adds `1250 * 2 = 2500`. For the Book it adds `3499 * 1`. The total is `5999`.
3. The second `reduce` adds the quantities: `2 + 1 = 3`.
4. `5999 / 100` is `59.99`, and `toFixed(2)` prints exactly two decimals. The screen shows `3 items, total $59.99`.
5. With `lines=[]`, `reduce` returns the starting value, so you get `0 items, total $0.00`. The start value is what keeps an empty list from crashing.

Prices are stored in cents (whole numbers) to avoid floating point surprises such as `0.1 + 0.2`. Convert to dollars only when you display.

None of this needs `useMemo` yet. These calculations are cheap. Add memoization when you measure a slow render, not before ([Memoization](../02-hooks/07-memoization.md)).

## 17. Nested lists and `Object.entries`

A list of lists is a `map` inside a `map`. Each level needs its own keys. Here a flat list of products is grouped by category with `reduce`, then drawn as sections:

```jsx
function GroupedProducts({ products }) {
  const groups = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = []
    }
    acc[product.category].push(product)
    return acc
  }, {})

  return (
    <div>
      {Object.entries(groups).map(([category, list]) => (
        <section key={category}>
          <h3>{category}</h3>
          <ul>
            {list.map((product) => (
              <li key={product.id}>{product.name}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
```

**What happens, step by step**, with the six products from section 16:
1. `reduce` starts with an empty object `{}`. For each product it makes sure `acc[category]` is an array, then pushes the product in. (Changing `acc` is fine here: we created it a moment ago inside this render, so nobody else can see it.)
2. The result is `{ Electronics: [Mouse, Keyboard], Books: [Learning React, Clean Code], Home: [Desk Lamp, Coffee Mug] }`.
3. `Object.entries(groups)` turns that object into an array of `[key, value]` pairs. The `map` callback destructures each pair as `([category, list])`.
4. The outer `map` draws one `<section>` per category, and the category name is its key. The inner `map` draws the products, and each product id is its key.
5. The output is three sections in the order `Electronics`, `Books`, `Home`, each holding its two products.

`Object.entries` is also how you draw any plain object, such as a record of counts:

```jsx
function Stock() {
  const stock = { apples: 5, pears: 0, plums: 12 }
  return (
    <ul>
      {Object.entries(stock).map(([fruit, count]) => (
        <li key={fruit}>
          {fruit}: {count}
        </li>
      ))}
    </ul>
  )
}
```

That gives `apples: 5`, `pears: 0` and `plums: 12`. The zero is drawn, because it is a number inside the `<li>`, not the left side of an `&&`.

The order is not always what you expect. JavaScript puts keys that look like whole numbers first, in numeric order, then the other keys in the order they were added: `Object.entries({ b: 1, 2: 'x', a: 3, 1: 'y' })` gave `[['1','y'], ['2','x'], ['b',1], ['a',3]]`. If the order matters, sort the entries yourself. Newer runtimes also have `Object.groupBy(products, (p) => p.category)`, which replaces the `reduce` above; check your target browsers before relying on it.

**Common mistake:** forgetting the key on the outer level.

```jsx
// Wrong: the inner items have keys, but the outer <section> does not
{Object.entries(groups).map(([category, list]) => (
  <section>...</section>
))}

// Right: every level that is rendered by map needs a key
{Object.entries(groups).map(([category, list]) => (
  <section key={category}>...</section>
))}
```

## 18. Adding, removing, updating and reordering items

State must never be changed in place. React decides whether to re-render by comparing the new state with the old state **by reference** (is it the very same array or object?). If you push into the existing array and pass the same array back, React sees no change.

```jsx
function BadAdd() {
  const [items, setItems] = useState(['a'])
  return (
    <div>
      <button
        onClick={() => {
          items.push('b') // Wrong: changes the array in place
          setItems(items) // same array, so React sees nothing new
        }}
      >
        Add
      </button>
      <p>{items.join(',')}</p>
    </div>
  )
}
```

After one click the screen still said `a`, although the array in memory was already `['a', 'b']`. The screen and the data disagreed. The fix is always the same: **build a new array** and pass that. Here is a complete example with all four operations. It is tested in React's StrictMode, which runs updater functions twice in development to catch impure ones:

```jsx
import { useState } from 'react'

let nextId = 4

export default function TaskList() {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Learn JSX', done: true },
    { id: 2, text: 'Learn state', done: false },
    { id: 3, text: 'Learn lists', done: false },
  ])
  const [text, setText] = useState('')

  function addTask(event) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    const task = { id: nextId++, text: trimmed, done: false }
    setTasks((current) => [...current, task])
    setText('')
  }

  function removeTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id))
  }

  function toggleTask(id) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    )
  }

  function moveUp(id) {
    setTasks((current) => {
      const index = current.findIndex((task) => task.id === id)
      if (index <= 0) return current
      const next = [...current]
      next[index - 1] = current[index]
      next[index] = current[index - 1]
      return next
    })
  }

  return (
    <div>
      <form onSubmit={addTask}>
        <label>
          New task
          <input value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <button type="submit">Add</button>
      </form>
      {tasks.length === 0 ? (
        <p>Nothing to do. Add your first task above.</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>
              <label>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                />
                {task.text}
              </label>
              <button onClick={() => moveUp(task.id)}>Up {task.text}</button>
              <button onClick={() => removeTask(task.id)}>Delete {task.text}</button>
            </li>
          ))}
        </ul>
      )}
      <p>{tasks.filter((task) => !task.done).length} left</p>
    </div>
  )
}
```

The function form `setTasks((current) => ...)` always starts from the newest list. [useState in depth](../02-hooks/02-usestate-in-depth.md) explains why that matters.

**What happens, step by step:**
1. Start: three tasks, and `Learn JSX` is checked. The footer says `2 left`.
2. Type `  Ship it  ` and press Add. `trim()` removes the spaces, a new object with a fresh id is appended with `[...current, task]`, and the input clears. Four tasks, `3 left`.
3. Press Add with an empty input: `trimmed` is empty, so the handler returns early. Nothing changes.
4. Tick `Learn state`. `map` builds a new array. For the one matching id it builds a **new object** `{ ...task, done: !task.done }`. Every other task is passed through as it is. Now `2 left`.
5. Press Up on `Learn lists`. The updater copies the array and swaps two slots. The order becomes `Learn JSX`, `Learn lists`, `Learn state`, `Ship it`.
6. Press Up on the first task: `index <= 0`, so it returns `current` unchanged and nothing re-renders.
7. Delete every task: `filter` keeps only the items that pass the test. At the end the empty-state message appears and the footer says `0 left`.

Patterns to memorise (`list` is an array in state, `item` is a new item):

| Goal | Write this | Never write this |
| --- | --- | --- |
| Add to the end | `[...list, item]` | `list.push(item)` |
| Add to the start | `[item, ...list]` | `list.unshift(item)` |
| Insert at index `i` | `[...list.slice(0, i), item, ...list.slice(i)]` | `list.splice(i, 0, item)` |
| Remove by id | `list.filter((x) => x.id !== id)` | `list.splice(index, 1)` |
| Update one item | `list.map((x) => (x.id === id ? { ...x, done: true } : x))` | `x.done = true` |
| Reverse or sort | `[...list].reverse()`, `[...list].sort(cmp)` | `list.reverse()`, `list.sort(cmp)` |
| Clear | `[]` | `list.length = 0` |

The exercise [Task list (basic)](../practice-app/exercises/react/03%2Dtodo%2Dbasic/README.md) asks you to build this with tests.

**Common mistake:** changing an item inside `map`.

```jsx
// Wrong: this changes the object that is already in state
current.map((task) => {
  if (task.id === id) task.done = !task.done
  return task
})

// Right: make a new object for the one item that changes
current.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
```

We ran both versions. Outside StrictMode the wrong one seems to work: the box ticks. But it changed an object that React and other code may still hold. Inside StrictMode, which calls the updater twice, the wrong version toggled `done` twice, and the checkbox was still unchecked after one click. The right version ticked it. Also, the wrong version returns the very same task objects, so a `React.memo` row that receives one as a prop sees no change at all.

## 19. A note on performance (do not worry early)

- A few hundred simple rows render without any effort. Do not optimise lists before you see a problem.
- Good keys already help performance: React can move existing DOM nodes instead of rebuilding them.
- If a list has thousands of rows, or heavy rows, there are three tools: **pagination** (the `slice` you just learned), **virtualization** (render only the rows that are visible in the window), and `React.memo` on the row component.
- Measure with the browser's profiler first, then fix. See [Performance optimization](../04-advanced/02-performance-optimization.md). Virtualization is practised in the exercise [Virtualized list](../practice-app/exercises/react/24-virtualized-list/README.md).

## How interviewers test this
- **Keys are the number one list question.** They want: what a key is, why it must be stable and unique among siblings, why the index is risky, and a concrete failure (state or typed text on the wrong row). A strong answer includes the failure, not only the rule.
- **The `0` bug.** "What does `{count && <X />}` show when `count` is 0?" A strong answer says `0`, explains falsy values, and offers `count > 0 &&` or a ternary.
- **Machine coding.** Task list, filterable list, pagination and data table all use `map`, keys, immutable updates and empty states. They look for ids as keys, no mutation, an empty state, and an accessible `<ul>`/`<li>` or table structure.
- **Choosing the right tool.** Can you pick ternary versus `&&` versus early return and explain why? Do you avoid nested ternaries?
- **Purity.** Do you know `sort` mutates? Do you copy before sorting state? Do you keep the filtered list out of state?
- **Red flags:** `key={index}` on a list that changes, `key={Math.random()}`, `array.push` followed by `setState(array)`, `forEach` instead of `map`, an `&&` with a number on the left, no loading or empty state.

## Interview questions and model answers

### Q1. Why do list items need a key? (Easy)
A key is a stable identity for each item among its siblings. When a list changes, React compares the old and new keys to decide which items were added, removed or moved. That lets it reuse the existing DOM nodes and the component state of items that stayed, and create or delete only what changed. Without keys React can only compare by position, which breaks as soon as items move. React also logs `Each child in a list should have a unique "key" prop` when keys are missing.

### Q2. Can I use the array index as a key? (Easy)
Only for a static list: it never reorders, filters, or gets inserts and removals in the middle, and the items hold no state or uncontrolled inputs. Otherwise the state sticks to the position instead of the item. We ran it: with index keys, text typed into Alice's input moved to Bob's row after Alice was removed. Use a stable id from the data.

### Q3. What happens if I do not give keys? (Easy)
React logs a warning, still draws the list, and falls back to matching items by position (their index). In our test the behaviour was identical to index keys. So every problem of index keys applies, plus a console error.

### Q4. How do you render conditionally in five ways? (Easy)
1. `if` with an early return: `if (!user) return <SignIn />`.
2. The ternary: `{isLoggedIn ? <Logout /> : <Login />}`.
3. `&&`: `{unread > 0 && <Badge />}`.
4. An element variable, a `switch`, or a lookup object such as `VIEWS[mode]`.
5. Returning `null` from a small component so that it draws nothing.

A sixth is hiding with CSS or the `hidden` attribute, which keeps the component mounted. Use a ternary for two outcomes, `&&` for show-or-nothing, an early return for guard cases, and a lookup object for many cases.

### Q5. What is the 0 bug with `&&`? (Easy)
`a && b` returns `a` when `a` is falsy. If `a` is the number `0`, React draws `0`, because numbers are drawn as text (only `false`, `null`, `undefined`, `true` and `""` draw nothing). `NaN` does the same. Fix it by making the left side a real boolean, or use a ternary with `null`.

```jsx
{count && <Badge />}      // shows 0 when count is 0
{count > 0 && <Badge />}  // shows nothing
```

### Q6. Does a key have to be globally unique? (Easy)
No. A key only needs to be unique among its siblings, meaning the items of the same array inside the same parent. Two different lists can use the same ids. We rendered two `<ul>` lists that both used keys `1` and `2`, and React printed no warning.

### Q7. What is the difference between `key` and `id`, and why can I not read `props.key`? (Medium)
`key` is React's own bookkeeping attribute. React uses it and removes it, so it is never passed to your component. Reading `props.key` gives `undefined` and React logs a warning that `key` is not a prop. `id` is a normal field of your data (or the HTML `id` attribute). You often use the data id as the key. If the child also needs it, pass it again under another name: `<Row key={item.id} id={item.id} />`.

### Q8. What is the difference between `||` and `??`? (Medium)
`a || b` returns `b` when `a` is any falsy value: `0`, `""`, `false`, `null`, `undefined`, `NaN`. `a ?? b` returns `b` only when `a` is `null` or `undefined`. Use `??` when `0`, `""` or `false` are real values. For example `score ?? 'no score'` keeps a score of `0`, while `score || 'no score'` hides it. Default parameters (`size = 40`) follow the `??` idea: they apply only to `undefined`.

### Q9. How do you render a list of lists? (Medium)
Nest `map` calls. Each `map` makes its own array, so each level needs its own keys. For grouped data, group first (with `reduce` or `Object.groupBy`), then map over `Object.entries(groups)`:

```jsx
{Object.entries(groups).map(([category, items]) => (
  <section key={category}>
    <h3>{category}</h3>
    <ul>{items.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
  </section>
))}
```

### Q10. How do you sort or filter a list that is in state without bugs? (Medium)
Never change the state array. `filter`, `map` and `slice` return new arrays, so they are safe. `sort` and `reverse` mutate, so copy first (`[...items].sort(compare)` or `items.toSorted(compare)`). Better still, do not store the sorted or filtered list at all: keep the original data plus the search text and sort choice in state, and calculate the visible list during render. Always pass a compare function, because the default `sort()` orders numbers as text (`[10, 9, 1]` becomes `[1, 10, 9]`).

### Q11. What happens to a component's state when it is rendered conditionally? (Medium)
If the condition makes React stop returning the component (`{show && <Counter />}`), React unmounts it and its state is lost. When it comes back it starts fresh. If you hide it with CSS or the `hidden` attribute instead, it stays mounted and keeps its state. Also, two components of the same type at the same position (a ternary with `<Counter />` in both branches) share state, because React thinks it is the same component.

### Q12. How can a key be used to reset a component's state? (Medium)
Changing a component's key makes React treat it as a different component, so it throws the old one away and mounts a new one with fresh state. This works outside lists: `<Profile key={userId} />` resets local state whenever `userId` changes. In our test a counter inside `Profile` went from `User 1: 2` to `User 2: 2` without the key and to `User 2: 0` with it. It is cleaner than resetting each field in an effect.

### Q13. How do you handle loading, error and empty states? (Medium)
Keep one `status` value rather than several booleans, and check in this order with early returns: loading, error, empty, then data. Checking empty first makes the screen say "No users yet" while data is still loading. Give the messages `role="status"` and `role="alert"` so assistive technology announces them, and use different empty messages for "no data yet" and "no search results".

### Q14. How does React use keys when a list updates? (Hard)
React compares the new children with the previous ones. For each child it looks at the key and the element type. A match with the same key and type reuses the existing instance: its state and DOM node are kept and only the props change. A new key creates a new instance. An old key that is missing from the new list is unmounted. If a matched item sits at a different position, React moves its DOM node instead of rebuilding it. Without keys it matches by index, so the instance at slot 0 is always reused for whatever item is now first. See [How React renders](../04-advanced/01-how-react-renders.md).

### Q15. How would you display 10,000 rows? (Hard)
First ask whether the user really needs them all. Options, in order: pagination (server-side or with `slice`); search and filters so users reach what they need; and **virtualization** (windowing), which renders only the rows currently visible plus a small buffer, using a library or a hand-written version. Keep stable ids as keys and keep the row component cheap. Consider `React.memo` for rows if profiling shows the re-renders matter. Measure before and after. See [Performance optimization](../04-advanced/02-performance-optimization.md).

## Common mistakes and gotchas
- `{count && <X />}` draws `0`. Fix: `{count > 0 && <X />}` or a ternary.
- `{items.length && <List />}` draws `0` for an empty array. Fix: `items.length > 0 &&`.
- `key={index}` on a list that can change. Fix: use a stable id from the data.
- `key={Math.random()}` or `key={crypto.randomUUID()}` in render. Fix: create the id once, when the item is created.
- The key sits inside the child component. Fix: put it on the element the `map` returns (`<Row key={id} />`).
- Reading `props.key`. Fix: pass the value under another prop name.
- Braces in the arrow function with no `return`. Fix: use parentheses, or write `return`.
- Using `forEach` to build JSX. Fix: use `map`; it returns an array.
- `list.sort()` or `list.reverse()` on state or props. Fix: copy first (`[...list]` or `toSorted`).
- `list.push(x)` then `setList(list)`. Fix: `setList([...list, x])`.
- Changing an item in place (`task.done = true`). Fix: `{ ...task, done: true }`.
- `sort()` without a compare function on numbers. Fix: `sort((a, b) => a - b)`.
- Nested ternaries three levels deep. Fix: early returns, a lookup object or a small component.
- `` `badge ${isPrimary && 'primary'}` `` gives the class `false`. Fix: use a ternary or an array with `filter(Boolean)`.
- Checking `users.length === 0` before `status === 'loading'`. Fix: loading first.
- A lookup key from outside the app (`LABELS[status]`) can hit `toString`. Fix: `Object.hasOwn`, or use a `Map`.
- A hook placed after an early return. Fix: hooks first, early returns after.
- Defining a component inside another component (`function Field() {...}` inside `Form`). It is a new component on every render, so inputs inside it lose their text and focus after each keystroke. Fix: define it at the top level of the file.
- `{isOpen && <Editor />}` when the draft must survive. Fix: lift the state up, or hide instead of unmounting.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Predict what each line draws (write the visible text, or "nothing").
   ```jsx
   <p>A: {0 && <b>x</b>}</p>
   <p>B: {'' && <b>x</b>}</p>
   <p>C: {[] && <b>x</b>}</p>
   <p>D: {0 || 'none'}</p>
   <p>E: {0 ?? 'none'}</p>
   <p>F: {null ?? 'none'}</p>
   ```

<details>
<summary>Show answer</summary>

- A: `A: 0`. The left side `0` is falsy, so `&&` returns `0`, and React draws numbers.
- B: `B: ` and nothing else. An empty string is falsy and draws nothing.
- C: `C: x` (the bold x). An empty array is truthy, so the right side is returned.
- D: `D: none`. `0` is falsy, so `||` takes the fallback.
- E: `E: 0`. `0` is not `null` or `undefined`, so `??` keeps it, and React draws it.
- F: `F: none`. `null` triggers the `??` fallback.

</details>

2. **(Easy)** Write `Welcome({ user })`. When `user` is `null`, show `Please sign in.` Otherwise show `Hello, NAME!`, where NAME is `user.name`, or the word `friend` if the name is empty or missing. Use an early return.

<details>
<summary>Show answer</summary>

```jsx
function Welcome({ user }) {
  if (!user) {
    return <p>Please sign in.</p>
  }
  return <p>Hello, {user.name || 'friend'}!</p>
}
```

We ran it: `null` gives `Please sign in.`, `{ name: 'Ada' }` gives `Hello, Ada!`, and `{ name: '' }` gives `Hello, friend!`. Here `||` is right because an empty name should count as missing.

</details>

3. **(Medium)** Use the `NoteList` from section 13, with `key={index}`. You type `hi` into **Carol's** input (the last row) and then click "Remove first". What does the screen show? What would it show with `key={person.id}`? Explain.

<details>
<summary>Show answer</summary>

With `key={index}` the screen shows `Bob:` and `Carol:`, both with **empty** inputs. The text `hi` is gone. Removing the first row leaves keys `0` and `1`. React reuses the first two `<li>` elements (which held empty inputs) and removes the `<li>` for key `2`, which is the one that held `hi`. Carol now appears in a row whose input was never typed in.

With `key={person.id}` the screen shows `Bob:` (empty) and `Carol: hi`. The key `c3` matches Carol's old row, so her `<li>` and its input are kept, and only Alice's row is removed.

With index keys the typed text can end up on the wrong person, or disappear.

</details>

4. **(Medium)** Write `StatusBadge({ status })` using a lookup object. `draft` shows a grey badge with the text `Draft`, `review` shows a yellow one with `In review`, `published` shows a green one with `Published`. Any other status (even `'toString'`) shows `Unknown` with no colour. Each badge is a `<span className="badge ...">`.

<details>
<summary>Show answer</summary>

```jsx
const BADGES = {
  draft: { label: 'Draft', className: 'badge grey' },
  review: { label: 'In review', className: 'badge yellow' },
  published: { label: 'Published', className: 'badge green' },
}
const UNKNOWN_BADGE = { label: 'Unknown', className: 'badge' }

function StatusBadge({ status }) {
  const badge = Object.hasOwn(BADGES, status) ? BADGES[status] : UNKNOWN_BADGE
  return <span className={badge.className}>{badge.label}</span>
}
```

We ran it. `draft` gave `<span class="badge grey">Draft</span>`. `archived`, `toString` and `undefined` all gave `<span class="badge">Unknown</span>`. `Object.hasOwn` is what makes `toString` safe: a plain `BADGES[status] ?? UNKNOWN_BADGE` would find a function on `Object.prototype`.

</details>

5. **(Medium)** Write `OlderPeople({ people })`. Each person is `{ id, name, age }`. Show a heading `N people over 30` and a list of `NAME (AGE)` for people older than 30, oldest first. If nobody qualifies, show `Nobody is over 30.` The `people` prop must not be reordered.

<details>
<summary>Show answer</summary>

```jsx
function OlderPeople({ people }) {
  const older = people
    .filter((person) => person.age > 30)
    .sort((a, b) => b.age - a.age)

  if (older.length === 0) {
    return <p>Nobody is over 30.</p>
  }

  return (
    <div>
      <h2>{older.length} people over 30</h2>
      <ul>
        {older.map((person) => (
          <li key={person.id}>
            {person.name} ({person.age})
          </li>
        ))}
      </ul>
    </div>
  )
}
```

With Ann (28), Bo (41), Cy (35), Di (52) it drew `3 people over 30` and the list `Di (52)`, `Bo (41)`, `Cy (35)`. The prop order afterwards was still Ann, Bo, Cy, Di. `filter` returns a new array, so sorting it does not touch the prop. (If you sorted `people` directly, you would copy it first.)

</details>

6. **(Medium)** Build a `Cart` component with two lines in state: `{ id: 'mug', name: 'Mug', price: 1250, qty: 2 }` and `{ id: 'book', name: 'Book', price: 3499, qty: 1 }` (prices in cents). Each line has an "Add one NAME" button (quantity plus one) and a "Remove NAME" button. Show `Total: $59.99` (two decimals, calculated with `reduce`). When the cart is empty show `Your cart is empty.` Do not mutate state.

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

function Cart() {
  const [lines, setLines] = useState([
    { id: 'mug', name: 'Mug', price: 1250, qty: 2 },
    { id: 'book', name: 'Book', price: 3499, qty: 1 },
  ])
  const total = lines.reduce((sum, line) => sum + line.price * line.qty, 0)

  function addOne(id) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, qty: line.qty + 1 } : line)),
    )
  }

  function remove(id) {
    setLines((current) => current.filter((line) => line.id !== id))
  }

  if (lines.length === 0) {
    return <p>Your cart is empty.</p>
  }

  return (
    <div>
      <ul>
        {lines.map((line) => (
          <li key={line.id}>
            {line.name} x {line.qty}
            <button onClick={() => addOne(line.id)}>Add one {line.name}</button>
            <button onClick={() => remove(line.id)}>Remove {line.name}</button>
          </li>
        ))}
      </ul>
      <p>Total: ${(total / 100).toFixed(2)}</p>
    </div>
  )
}
```

We ran it in StrictMode. At the start the total was `$59.99`. After "Add one Book" it was `$94.98`. After removing the Mug it was `$69.98`. After removing the Book the screen showed `Your cart is empty.` The total is calculated during render, not stored in state.

</details>

7. **(Hard)** Using `Counter`, `WithAnd` and `WithHidden` from section 10: you click the counter twice, hide it, then show it again. What does each version display? Then take `{first ? <Counter label="Ann" /> : <Counter label="Ben" />}`: you click Ann's counter twice and press Swap. What is displayed, and what changes if you add `key="ann"` and `key="ben"`?

<details>
<summary>Show answer</summary>

- `WithAnd` shows `Count: 0`. Hiding unmounted the counter and destroyed its state.
- `WithHidden` shows `Count: 2`. The counter stayed mounted, and only the `hidden` attribute changed.
- The swap without keys shows `Ben: 2`. Both branches are a `Counter` at the same position, so React keeps the state and only the label changes.
- The swap with `key="ann"` and `key="ben"` shows `Ben: 0`. Different keys mean different components, so the state resets.

</details>

8. **(Hard)** Write `GroupedList({ products })` where each product is `{ id, name, category }`. Show one `<section>` per category with an `<h3>` and a `<ul>`. Categories must be in alphabetical order and products inside a category in alphabetical order by name. Do not change the `products` prop. Use `Object.entries` and put a key on every level.

<details>
<summary>Show answer</summary>

```jsx
function GroupedList({ products }) {
  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name))
  const groups = sorted.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = []
    }
    acc[product.category].push(product)
    return acc
  }, {})
  const entries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div>
      {entries.map(([category, items]) => (
        <section key={category}>
          <h3>{category}</h3>
          <ul>
            {items.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
```

With Wireless Mouse and Mechanical Keyboard (Electronics), Learning React and Clean Code (Books), and Desk Lamp (Home), the sections came out as Books (`Clean Code`, `Learning React`), Electronics (`Mechanical Keyboard`, `Wireless Mouse`) and Home (`Desk Lamp`). Sorting the products once, before grouping, keeps each group in name order. The copy `[...products]` protects the prop, and `Object.entries(groups)` creates a new array, so sorting it is safe.

</details>

9. **(Hard)** A form has a single controlled text input. After the user types one letter, the input loses focus and only the first letter is kept. Name two different causes you would look for, and how to fix each.

<details>
<summary>Show answer</summary>

Both causes make React **remount** the input on every render, so the browser throws away the old element, its focus and what was typed.

1. A random or changing key, such as `<input key={Math.random()} ... />` (or a key generated during render). Fix: remove the key, or use a stable one.
2. A component defined inside another component, such as `function Field() { return <input ... /> }` written inside `Form`, then rendered as `<Field />`. Every render of `Form` creates a new `Field` function, which React sees as a new component type. Fix: move `Field` to the top level of the file and pass `text` and `setText` as props.

We ran both. Typing `abc` left the value as just `a`, the DOM node was a different one afterwards, and the input was no longer focused. The control case, a plain stable input, ended with `abc`, the same node and focus kept.

</details>

10. **(Hard)** Find every bug in this component, then write the fixed version.
    ```jsx
    function Playlist({ songs: initialSongs }) {
      const [songs, setSongs] = useState(initialSongs)
      const [plays, setPlays] = useState(0)

      function addSong(title) {
        songs.push({ title })
        setSongs(songs)
      }

      return (
        <div>
          {plays && <p>Played {plays} times</p>}
          <ul>
            {songs.map((song, index) => {
              <li key={index}>{song.title}</li>
            })}
          </ul>
          <button onClick={() => addSong('New song')}>Add song</button>
          <button onClick={() => setPlays(plays + 1)}>Play</button>
        </div>
      )
    }
    ```

<details>
<summary>Show answer</summary>

Four bugs:
1. `plays && ...` draws a `0` when `plays` is 0. Use `plays > 0 &&`.
2. The `map` callback has braces and no `return`, so the list is always empty.
3. `key={index}` on a list that can grow, and the songs have no ids. Give every song an id and use it.
4. `addSong` pushes into the state array and sets the same array, so React never re-renders.

When we ran the broken version, the screen showed a `0`, an empty `<ul>`, and clicking "Add song" changed nothing. Fixed version:

```jsx
let nextSongId = 100

function Playlist({ initialSongs }) {
  const [songs, setSongs] = useState(initialSongs) // songs look like { id, title }
  const [plays, setPlays] = useState(0)

  function addSong(title) {
    setSongs((current) => [...current, { id: nextSongId++, title }])
  }

  return (
    <div>
      {plays > 0 && <p>Played {plays} times</p>}
      <ul>
        {songs.map((song) => (
          <li key={song.id}>{song.title}</li>
        ))}
      </ul>
      <button onClick={() => addSong('New song')}>Add song</button>
      <button onClick={() => setPlays(plays + 1)}>Play</button>
    </div>
  )
}
```

After one "Add song" and one "Play", the fixed version showed `Played 1 times`, then `Song A`, `Song B` and `New song`.

</details>

## Recap
- React draws strings and numbers (including `0` and `NaN`), draws nothing for `null`, `undefined`, `true`, `false` and `""`, and throws for plain objects.
- Conditional rendering is "choose a value": `if` with early return for guards, ternary for two outcomes, `&&` for show-or-nothing, lookup objects for many cases.
- Never put a number on the left of `&&`. Write `count > 0 &&`. Use `??` (not `||`) when `0` is a real value.
- Show loading first, then error, then empty, then data, using one `status` value.
- `&&` unmounts and loses state, `hidden` keeps it, and the same component type at the same position keeps it. A different `key` resets it.
- Render lists with `map` and give every item a stable key from the data that is unique among siblings. Never `Math.random()`, and use the index only for static lists.
- Bad keys attach state (typed text, child state) to the position instead of the item.
- Compute filtered, sorted and paged lists during render. `sort` and `reverse` mutate, so copy first. Update state arrays with spread, `filter` and `map`, never `push` or `splice`.

## Where to go next
- Next lesson: [Forms](./07-forms.md), where you control inputs and handle submit.
- Then: [Thinking in React](./08-thinking-in-react.md), which uses lists and derived data to design a whole screen.
- Practice app: [Task list (basic)](../practice-app/exercises/react/03%2Dtodo%2Dbasic/README.md) and [Filterable list](../practice-app/exercises/react/07-filterable-list/README.md).
- Pagination and virtualization: [Pagination](../practice-app/exercises/react/13-pagination/README.md) and [Virtualized list](../practice-app/exercises/react/24-virtualized-list/README.md).
- Interview practice: Round 1 basics quiz (planned) and Round 3 rendering, keys, memo, context (planned).
- Quick review: Patterns and syntax cheatsheet (planned) and Gotchas and common mistakes (planned).
