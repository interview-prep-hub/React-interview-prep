# Hooks Overview and the Rules of Hooks

> **Level:** Beginner   **Time:** about 40 minutes   **Read first:** [State and events](../01-basics/05-state-and-events.md), [Components and props](../01-basics/04-components-and-props.md)

## What you will learn
- Explain what a hook is, and why React added hooks (the `this` problem, scattered lifecycle code, wrapper hell, hard-to-reuse stateful logic).
- State the two Rules of Hooks and fix code that breaks them.
- Explain, with a small model of numbered slots, why React needs hooks to run in the same order on every render.
- Set up `eslint-plugin-react-hooks` and say what its rules check.
- Find the right hook for a job with a map of every built-in hook, and know which lesson teaches each one.
- Translate class lifecycle methods into hooks, and compare class and function components the way interviewers expect.

## 1. What a hook is, in plain words

A React component is a function. React calls it every time it needs to know what the screen should show. Each call is a **render**. Every call starts from nothing: local variables are created, used, and thrown away when the function returns.

That is a problem. If a button must remember how many times it was clicked, a normal local variable cannot do it, because the next render gets a fresh variable.

A **hook** solves this. A hook is a special function whose name starts with `use`. When your component calls a hook during render, React gives that function a new ability:

- `useState` remembers a value between renders.
- `useEffect` runs code after the screen updates (a **side effect** is any work that reaches outside the render, such as a timer, a network call, or changing `document.title`).
- `useContext` reads shared data without passing props down.
- `useRef` keeps a box that survives renders, or points at a DOM element.

Hooks arrived in React 16.8 (2019). Before that, only class components could have state and lifecycle methods. Today, function components with hooks are the normal way to write React.

```jsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  console.log(`render count=${count}`)

  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
}

export default Counter
```

**What happens, step by step:**
1. React calls `Counter()` for the first time. `useState(0)` sees that this is the first render, so React stores `0` for this component and returns `[0, setCount]`. The log prints `render count=0`.
2. The button shows "Clicked 0 times".
3. The user clicks. The handler calls `setCount(1)`. This does not change `count` in the running function. It tells React: "the stored value is now 1, please render again".
4. React calls `Counter()` again. This time `useState(0)` ignores the `0` (it is only used on the first render) and returns the stored value, so `count` is `1`. The log prints `render count=1`.
5. The same happens after a second click.

I ran this component and clicked twice. The log was (React 19.3.1, no StrictMode; in development, StrictMode calls the function twice per render on purpose, so you would see doubled lines):

```text
render count=0
render count=1
render count=2
```

`useState` is explained fully in [useState in depth](02-usestate-in-depth.md). Here the goal is to understand what a hook is and how React treats it.

**Common mistake:** calling a hook outside a component.

```jsx
import { useState } from 'react'

// WRONG: a hook at module level, outside any component
const [count, setCount] = useState(0)

function Counter() {
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

```jsx
import { useState } from 'react'

// RIGHT: the hook runs inside the component, during render
function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

Why: hooks only work while React is rendering a component, because that is when React knows which component is asking. Outside a render, React throws an error that starts with "Invalid hook call. Hooks can only be called inside of the body of a function component."

## 2. The four problems hooks solved

Interviewers love this question: "Why were hooks introduced?" The answer has four parts. Each one is easier to feel when you see the old code.

### 2.1 The `this` problem

In a class component, state and handlers live on `this`. But in JavaScript, `this` depends on **how a function is called**, not where it was written. When you pass `this.handleClick` to a button, React later calls it as a plain function, and `this` is lost.

```jsx
import { Component } from 'react'

class LikeButton extends Component {
  constructor(props) {
    super(props)
    this.state = { likes: 0 }
    // Forget the next line and every click crashes
    this.handleClick = this.handleClick.bind(this)
  }

  handleClick() {
    this.setState((state) => ({ likes: state.likes + 1 }))
  }

  render() {
    return <button onClick={this.handleClick}>Likes: {this.state.likes}</button>
  }
}
```

I removed the `bind` line and clicked. The click failed with `Cannot read properties of undefined (reading 'setState')`, because `this` was `undefined` inside `handleClick`. With the `bind` line, the click worked and the button showed "Likes: 1".

The function component has no `this` at all:

```jsx
import { useState } from 'react'

function LikeButton() {
  const [likes, setLikes] = useState(0)
  return <button onClick={() => setLikes(likes + 1)}>Likes: {likes}</button>
}
```

**What happens, step by step:**
1. `likes` and `setLikes` are ordinary variables inside the function, so any handler written in the function can use them.
2. There is nothing to bind, and nothing to forget.
3. Class syntax also needs a `constructor`, `super(props)` and `render()`. The function version is shorter and easier to read.

### 2.2 Related code was split apart, unrelated code was mixed together

Class lifecycle methods are organised by **time** (mount, update, unmount), not by **purpose**. So one job gets cut into pieces, and different jobs share the same method.

```jsx
import { Component } from 'react'

class Dashboard extends Component {
  state = { width: window.innerWidth }

  componentDidMount() {
    document.title = `Width: ${this.state.width}` // job A
    window.addEventListener('resize', this.handleResize) // job B starts
  }

  componentDidUpdate() {
    document.title = `Width: ${this.state.width}` // job A again
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize) // job B ends, far away
  }

  handleResize = () => this.setState({ width: window.innerWidth })

  render() {
    return <p>Window width: {this.state.width}px</p>
  }
}
```

Job A (the page title) is written twice. Job B (the resize listener) starts in one method and ends in another. Jobs A and B share `componentDidMount`. Bugs love this kind of layout: a very common one is adding a listener and forgetting to remove it.

With hooks, you group code by purpose. Each `useEffect` holds one job, and its cleanup sits right next to its setup:

```jsx
import { useEffect, useState } from 'react'

function Dashboard() {
  const [width, setWidth] = useState(window.innerWidth)

  // Job A: keep the page title in sync with the width
  useEffect(() => {
    document.title = `Width: ${width}`
  }, [width])

  // Job B: listen for resizes
  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return <p>Window width: {width}px</p>
}
```

**What happens, step by step:**
1. On the first render, React shows "Window width: 1024px" (the width in my test). After the screen is updated, React runs both effects: the title becomes "Width: 1024", and the listener is added.
2. When the window is resized, `handleResize` calls `setWidth`. React renders again and shows the new width.
3. Because `width` changed, effect A runs again and updates the title. Effect B does not run again, because its dependency list `[]` is empty.
4. When the component leaves the screen, React calls the function returned by effect B, which removes the listener.

I ran the class version and the hooks version side by side. Both showed "Window width: 500px" and the title "Width: 500" after a resize to 500, and both added the resize listener once and removed it once on unmount. Effects are explained in [useEffect](03-useeffect.md).

### 2.3 Wrapper hell

Before hooks, the way to share logic between components was a **higher-order component** (HOC: a function that takes a component and returns a new, wrapped component) or a **render prop** (a prop whose value is a function that returns JSX). Each one adds another layer around your component.

```jsx
// Sketch: withRouter, withTheme, withAuth, connect and the Auth, Theme, Window
// components are assumed to exist. This is about the shape, not a runnable app.
export default withRouter(withTheme(withAuth(connect(mapState)(Profile))))

// Render props nest the same way:
<Auth>
  {(user) => (
    <Theme>
      {(theme) => (
        <Window>
          {(width) => <Profile user={user} theme={theme} width={width} />}
        </Window>
      )}
    </Theme>
  )}
</Auth>
```

In React DevTools this shows up as a deep pile of wrapper components, often called "wrapper hell". Props also arrive from nowhere: reading `Profile`, you cannot tell which wrapper supplied `theme`.

With hooks the same dependencies are plain function calls at the top of the component:

```jsx
function Profile() {
  const user = useAuth()
  const theme = useTheme()
  const width = useWindowWidth()

  return <h1 className={theme}>{user.name} ({width}px)</h1>
}
```

**What happens, step by step:**
1. Each hook call returns a value directly.
2. You choose the variable names, so you can see where every value comes from.
3. The component tree has no extra layers.

### 2.4 Stateful logic was hard to reuse

"Stateful logic" means logic that needs state or effects, such as "track the window width". In a class you could not extract it as a plain function, because it used `this.state` and lifecycle methods. HOCs and render props were the workaround.

With hooks, you move the `useState` and `useEffect` calls into your own function. That function is a **custom hook**. Here is job B from above, extracted:

```jsx
import { useEffect, useState } from 'react'

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return width
}

function Banner() {
  const width = useWindowWidth()
  return <h1>{width < 600 ? 'Small screen' : 'Wide screen'}</h1>
}

function Sidebar() {
  const width = useWindowWidth()
  return width < 600 ? null : <aside>Sidebar</aside>
}
```

**What happens, step by step:**
1. `Banner` and `Sidebar` both call `useWindowWidth()`. Each call creates its own `width` state and its own resize listener. They do not share state; they share **code**.
2. When the window shrinks to 400px, both listeners fire, and both components render again.
3. I ran this with `Banner` and `Sidebar` side by side. At 1000px: "Wide screen" and the sidebar showed. After a resize to 400px: "Small screen" and the sidebar disappeared.

Custom hooks get a full lesson in [Custom hooks](08-custom-hooks.md).

To sum up section 2:

| Problem with classes | How hooks help |
|---|---|
| `this` and manual binding | No `this`. Values are plain variables in the function. |
| Lifecycle methods split one job and mix several | One `useEffect` per job, with cleanup next to setup. |
| HOCs and render props create wrapper layers | Hooks are flat function calls. |
| Stateful logic could not be extracted simply | Move hook calls into a custom hook. |

Hooks were added next to classes, not instead of them. Classes still work and are still exported by React; they are marked legacy (not recommended for new code).

**Common mistake:** moving listener code into `useEffect` and forgetting the cleanup, which the old `componentWillUnmount` used to handle.

```jsx
// WRONG: every mount adds a listener and nothing ever removes it
useEffect(() => {
  window.addEventListener('resize', handleResize)
}, [])
```

```jsx
// RIGHT: return a cleanup function that undoes the setup
useEffect(() => {
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

Why: React calls the returned function when the component leaves the screen (and before the effect runs again), so setup and cleanup always come as a pair.

## 3. The two Rules of Hooks

React gives you a lot of freedom, but hooks come with two rules. They are short:

1. **Only call hooks at the top level.** Do not call them inside conditions, loops, nested functions, after an early `return`, or inside `try`/`catch`.
2. **Only call hooks from React functions.** That means function components, or your own custom hooks (functions whose names start with `use`). Not from plain JavaScript functions, and not from class components.

"Top level" means: directly in the body of the component or custom hook, before any early return, not inside any `{ }` block that may or may not run.

```jsx
import { useState } from 'react'

// WRONG: the hook is only called for members
function Greeting({ isMember }) {
  if (isMember) {
    const [points, setPoints] = useState(0)
  }
  return <p>Hello</p>
}
```

```jsx
import { useState } from 'react'

// RIGHT: always call the hook. Make the USE of the value conditional.
function Greeting({ isMember }) {
  const [points] = useState(0)
  return isMember ? <p>Points: {points}</p> : <p>Join us</p>
}
```

**What happens, step by step:**
1. In the wrong version, a member's render calls one hook and a guest's render calls zero hooks. The number of hook calls depends on a prop.
2. React tracks hooks by their position in the call order (section 4 shows exactly how). A call order that changes between renders confuses React.
3. In the right version, the hook is called on every render, in the same place. Only the JSX depends on the condition.

Here is a short catalogue of the forms this mistake takes, each with its fix (these are fragments to recognise, not code to paste):

```text
1. Inside a condition
     if (open) { useEffect(...) }
   Fix: call the hook always; put the condition in the JSX or inside the hook.

2. After an early return
     if (!user) return null
     const [note, setNote] = useState('')
   Fix: move every hook above the return.

3. Inside a loop
     items.map((item) => { const [liked, setLiked] = useState(false) ... })
   Fix: make a child component per item, and call the hook there.

4. Inside an event handler or any nested function
     <button onClick={() => { const [n, setN] = useState(0) }}>
   Fix: call the hook at the top; use its result inside the handler.

5. Inside the callback of useEffect, useMemo or useCallback
     useEffect(() => { const theme = useContext(ThemeContext) }, [])
   Fix: call the hook at the top; use its result inside the callback.

6. Hidden behind && or a ternary
     const data = ready && useData()
   Fix: call the hook, then use the value conditionally.

7. Inside try, catch or finally
     try { const [n] = useState(0) } catch (e) { ... }
   Fix: call the hook above the try block.
```

Two more breaks come from Rule 2:

```jsx
import { useContext } from 'react'

// WRONG: a plain function that is neither a component nor a custom hook
function formatPrice(value) {
  const locale = useContext(LocaleContext)
  return new Intl.NumberFormat(locale).format(value)
}

// RIGHT option A: rename it so it is a custom hook, and call it from a component
function useFormatPrice() {
  const locale = useContext(LocaleContext)
  return (value) => new Intl.NumberFormat(locale).format(value)
}

// RIGHT option B: keep formatPrice plain and pass the data in
function formatPriceFor(locale, value) {
  return new Intl.NumberFormat(locale).format(value)
}
```

And a class component cannot call hooks at all. A hook call inside a class `render` throws "Invalid hook call", the same error as in section 1. (Section 8 shows how to give a class component a hook's value.)

**Common mistake:** wanting "a hook per list item" and putting it in the loop. The fix is always the same: let each item be its own component, because each component instance has its own hooks.

```jsx
import { useState } from 'react'

// WRONG: a hook inside map
function Playlist({ songs }) {
  return (
    <ul>
      {songs.map((song) => {
        const [liked, setLiked] = useState(false)
        return <li key={song}>{song} {liked ? 'liked' : ''}</li>
      })}
    </ul>
  )
}

// RIGHT: one component per song, each with its own state
function Song({ title }) {
  const [liked, setLiked] = useState(false)
  return (
    <li>
      <button onClick={() => setLiked(!liked)}>{liked ? 'Unlike' : 'Like'}</button> {title}
    </li>
  )
}

function PlaylistFixed({ songs }) {
  return (
    <ul>
      {songs.map((song) => (
        <Song key={song} title={song} />
      ))}
    </ul>
  )
}
```

Why: the wrong version looks fine until the list length changes. I rendered it with two songs (it worked), then with three songs, and React threw "Rendered more hooks than during the previous render." The fixed version kept the "liked" state when a song was added.

One more case: if you need different hooks for different situations, split into components and choose between them:

```jsx
function Page({ user }) {
  return user ? <MemberPage user={user} /> : <GuestPage />
}
```

`MemberPage` and `GuestPage` can each call whatever hooks they need.

A note on `use`: React 19 has an API called `use` that looks like a hook but is not one. Unlike hooks, it may be called inside conditions and loops, and after an early return (but not inside `try`/`catch`). Q12 below covers it. It is the only exception.

## 4. Why the rules exist: React finds hooks by call order

When you write `const [count, setCount] = useState(0)`, you give React no name for this piece of state. So how does React find the right value on the next render? It uses **position**: the first hook call in the component is hook number 1, the second is number 2, and so on.

Think of a row of numbered lockers that React keeps for each component. Each hook call opens the next locker in the row. On the first render, React puts a value into each locker. On later renders, the same calls open the same lockers in the same order. If one render skips a call, every later call opens the wrong locker.

Here is a tiny model in plain JavaScript (no React). Save it as `tiny-hooks.mjs` and run `node tiny-hooks.mjs`:

```js
let slots = [] // the lockers: one slot per hook call, in call order
let cursor = 0 // the number of the slot the NEXT hook call will use

function useState(initial) {
  const slot = cursor // this call owns slot number `cursor`
  cursor++ // the next hook call gets the next slot
  if (slot >= slots.length) slots.push(initial) // first render: fill the slot
  const setState = (value) => {
    slots[slot] = value
  }
  return [slots[slot], setState]
}

// "React" does this before every render: start again at slot 0
function renderComponent(Component, props) {
  cursor = 0
  return Component(props)
}

let setCount
function Counter() {
  const [name] = useState('Ada') // slot 0
  const [count, set] = useState(0) // slot 1
  setCount = set
  return `${name} has clicked ${count} times`
}

console.log(renderComponent(Counter), JSON.stringify(slots))
setCount(5)
console.log(renderComponent(Counter), JSON.stringify(slots))
```

Output (I ran it):

```text
Ada has clicked 0 times ["Ada",0]
Ada has clicked 5 times ["Ada",5]
```

**What happens, step by step:**
1. Render 1: `cursor` is 0. The first `useState('Ada')` takes slot 0 and fills it. The second `useState(0)` takes slot 1 and fills it.
2. `setCount(5)` writes `5` into slot 1. (The setter remembers its slot number.)
3. Render 2: `cursor` resets to 0. The first call reads slot 0 and gets `'Ada'`. The second call reads slot 1 and gets `5`. The initial values (`'Ada'`, `0`) are ignored, because the slots already exist.

The name `count` is just your local variable. React never sees it. The only thing React knows is "this was the second hook call".

Now break it with a conditional hook:

```js
slots = [] // a fresh component
cursor = 0

function Broken({ showName }) {
  if (showName) {
    useState('Ada') // hook A: called only sometimes
  }
  const [count] = useState(0) // hook B
  return `count is ${count}`
}

console.log(renderComponent(Broken, { showName: true }), JSON.stringify(slots))
console.log(renderComponent(Broken, { showName: false }), JSON.stringify(slots))
```

Output (I ran it, appended to the same file):

```text
count is 0 ["Ada",0]
count is Ada ["Ada",0]
```

```text
Render 1 (showName = true)             Render 2 (showName = false)
call 1: useState('Ada') -> slot 0      (call skipped)
call 2: useState(0)     -> slot 1      call 1: useState(0) -> slot 0, which holds 'Ada'
```

On the second render, hook B is the first call, so it reads slot 0 and gets `'Ada'`. The page says "count is Ada". There was no error, just wrong data. That is the worst kind of bug, and it is why the rule exists.

The model is simplified in two ways. Real React keeps the hooks of each component instance in a linked list attached to an internal object (a fiber), not in one global array, so two components never share slots. And real React notices some mistakes. I ran these cases in React 19.3.1:

- **More hooks than before:** a hook that appears on a later render. React throws `Rendered more hooks than during the previous render.` and, in development, also logs "React has detected a change in the order of Hooks called by ..." with a table of the two orders.
- **Fewer hooks than before:** React throws `Rendered fewer hooks than expected. This may be caused by an accidental early return statement.`
- **Same number, different hook types:** for example `useState` on one render and `useRef` in the same position on the next. Nothing throws; development builds log the same "change in the order of Hooks" error, and production builds have no such check. The component is simply wrong.

So the check is not a safety net you can rely on. Follow the rules and let the linter (next section) catch mistakes before they run. Section 4 is the part to explain out loud in an interview. For how React stores hooks for real, see React internals deep dive (planned).

**Common mistake:** calling a component like a normal function.

```jsx
// WRONG: Child() runs inside Parent's render, so Child's hooks become Parent's hooks
function Parent({ show }) {
  const [p] = useState('p')
  return <div>{p} {show ? Child() : null}</div>
}

// RIGHT: let React render it as its own component, with its own hooks
function Parent({ show }) {
  const [p] = useState('p')
  return <div>{p} {show ? <Child /> : null}</div>
}
```

Why: I rendered the wrong version with `show` false and then true. `Child`'s `useState` was added to `Parent`'s hook list after the first render, and React threw "Rendered more hooks than during the previous render."

## 5. Catching mistakes automatically: eslint-plugin-react-hooks

You should not have to catch hook mistakes by eye. The React team ships an ESLint plugin called `eslint-plugin-react-hooks`. (ESLint is a tool that reads your code and reports problems while you type.) The latest version on 2026-11-10 is 7.1.1.

Install it:

```bash
npm install --save-dev eslint eslint-plugin-react-hooks
```

A minimal `eslint.config.js` (ESLint's "flat config" file) for a Vite project with `.jsx` files:

```js
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  reactHooks.configs.flat.recommended,
]
```

If you use the older `.eslintrc` format, extend `plugin:react-hooks/recommended` instead. If you only want the two classic rules, you can switch them on by hand:

```js
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    files: ['**/*.{js,jsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
```

**What the two classic rules do:**
1. **`rules-of-hooks`** (an error) enforces this lesson. It flags hooks in conditions, loops, nested functions, after early returns, and in functions that are neither components nor hooks. To decide what is a component or a hook it looks at names: a component starts with a capital letter, and a hook is `use` followed by a capital letter. So a custom hook must be named `useSomething`, or the linter will not see it as one.
2. **`exhaustive-deps`** (a warning) checks the dependency array of `useEffect`, `useMemo` and `useCallback`. It reports any value the callback reads that is missing from the array. A missing dependency is the usual cause of stale values (the effect keeps using an old value).

**The compiler rules (version 7 and later).** Since version 7, the plugin also contains lint rules powered by the React Compiler (a build tool that adds memoization for you; stable as version 1.0 since 2025-10-07 and opt-in). You do not need the compiler installed to use these rules. In 7.1.1 the `recommended` preset switches on 16 rules in total (counted on that version; the number can change in later releases). Besides the two above, the ones worth knowing are:

- `set-state-in-render`: no unconditional state update while rendering (it loops forever).
- `set-state-in-effect`: flags a state setter called synchronously inside an Effect.
- `refs`: do not read or write `ref.current` during render.
- `purity` and `immutability`: render must be pure, and values you were given must not be mutated.
- `static-components`: do not create a component inside another component's render.
- `use-memo` and `preserve-manual-memoization`: `useMemo` must return a value, and manual memoization must be something the compiler can keep.

The compiler skips (it does not fail the build for) any component that breaks these rules, so fixing lint errors also helps the compiler. Version 7 replaces the old separate `eslint-plugin-react-compiler` package; if your project still has that package, remove it. One naming trap: the `recommended-legacy` preset name in some older articles existed only in version 6. In version 7 use `recommended` (old format) or `flat.recommended` (flat config).

Many Vite templates with ESLint already include the plugin, so check your `package.json` before adding it.

**Common mistake:** silencing a warning instead of fixing it.

```jsx
// WRONG: hides a real bug. If `name` changes, the title never updates.
useEffect(() => {
  document.title = `Hello ${name}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

```jsx
// RIGHT: list what the effect reads
useEffect(() => {
  document.title = `Hello ${name}`
}, [name])
```

Why: the warning is almost always right. When it feels wrong, the effect usually needs a different design (see [useEffect](03-useeffect.md)), not a disabled rule.

## 6. A map of the built-in hooks

React 19.3 has 18 built-in hooks in the `react` package, plus one in `react-dom` (`useFormStatus`), plus `use`, which is an API that looks like a hook. You do not need all of them on day one. Here is the whole map, grouped by job, with the lesson that teaches each.

**State: remember values between renders**
- `useState`: one value and a setter. The hook you will use most. See [useState in depth](02-usestate-in-depth.md).
- `useReducer`: state that changes through named actions handled by one reducer function. See [useReducer](06-usereducer.md).

**Context: read shared data without passing props through every level**
- `useContext`: read the nearest value of a context. See [useContext](05-usecontext.md).

**Ref: keep something that does not cause a render**
- `useRef`: a box whose `.current` survives renders (a DOM node, a timer id, a previous value). See [useRef](04-useref.md).
- `useImperativeHandle`: choose what a parent can do through a ref to your component (rare). See [useRef](04-useref.md).

**Effect: do work outside rendering**
- `useEffect`: run code after React updates the screen, to sync with something outside React. Second most common. See [useEffect](03-useeffect.md).
- `useLayoutEffect`: like `useEffect`, but runs before the browser paints, for measuring layout. See [Other hooks](09-other-hooks.md).
- `useInsertionEffect`: runs before layout effects; made for CSS-in-JS libraries. See [Other hooks](09-other-hooks.md).
- `useEffectEvent`: stable since React 19.2. Wraps logic that should read the latest props and state without making an Effect re-run. See [Other hooks](09-other-hooks.md).

**Performance: skip repeated work**
- `useMemo`: cache the result of a calculation between renders. See [Memoization](07-memoization.md).
- `useCallback`: cache a function between renders. See [Memoization](07-memoization.md).
- `useTransition`: mark a state update as non-urgent, so typing and clicking stay responsive. See [Other hooks](09-other-hooks.md) and [Concurrent React](../04-advanced/03-concurrent-react-and-suspense.md).
- `useDeferredValue`: show an older value while a new one renders in the background. See [Other hooks](09-other-hooks.md).

**Resource: read data during render**
- `use`: reads a promise or a context. It is not a hook (it may be called conditionally). See [React 19 and newer](../04-advanced/04-react-19-and-newer.md).

**Other**
- `useId`: a unique id for linking labels and inputs, stable between server and client. See [Other hooks](09-other-hooks.md).
- `useSyncExternalStore`: subscribe to data that lives outside React (a store, a browser API). See [Other hooks](09-other-hooks.md).
- `useDebugValue`: a label for your custom hook in React DevTools. See [Other hooks](09-other-hooks.md).

**React 19 additions (forms, Actions and optimistic updates)**
- `useActionState`: state produced by an Action (for example a form submit), plus a pending flag. It was called `useFormState` earlier.
- `useOptimistic`: show a temporary value while an Action is still running, then fall back to the real value.
- `useFormStatus` (imported from `react-dom`): tells a component whether the `<form>` around it is submitting. It must be called by a component rendered inside that form.
- All three are covered in [React 19 and newer](../04-advanced/04-react-19-and-newer.md). (`use` and `useEffectEvent`, listed above, also arrived in 19.x.)

And your own: [custom hooks](08-custom-hooks.md), which are just functions that call other hooks.

Two reminders. First, these state and effect hooks work in Client Components. Server Components cannot use them; see [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md). Second, `memo`, `lazy`, `startTransition` and `createContext` are not hooks, even though they live in the same package. A hook is a function you call during render that React tracks by call order.

In a typical app, `useState`, `useEffect`, `useRef` and `useContext` do most of the work, `useMemo` and `useCallback` appear sparingly, and custom hooks appear a lot.

**Common mistake:** using an Effect plus state for something you can simply calculate.

```jsx
// WRONG: an extra state variable, an extra render, and a moment where it is out of date
const [fullName, setFullName] = useState('')
useEffect(() => {
  setFullName(first + ' ' + last)
}, [first, last])

// RIGHT: calculate it while rendering
const fullName = first + ' ' + last
```

Why: effects are for syncing with things outside React. Values you can compute from props and state should be computed during render. [useEffect](03-useeffect.md) has a full section on this.

## 7. From class lifecycle methods to hooks

If you meet old code (or an old interview question), you need the mapping. Here it is. The most important thing to know about it is that it is a rough guide, not an exact translation.

| Class | Function component with hooks | Notes |
|---|---|---|
| `constructor` setting `this.state` | `useState(initial)`, or `useState(() => compute())` for a costly start | No `super(props)`, no `this`. |
| `render()` | the function body | Must stay pure. |
| `componentDidMount` | `useEffect(() => { ... }, [])` | Close, but not identical. In development StrictMode, the effect runs setup, cleanup, setup. |
| `componentDidUpdate` | `useEffect(() => { ... }, [deps])` | Also runs after the first render. React re-runs it when a dependency changes. |
| `componentWillUnmount` | the function returned from `useEffect` | The cleanup also runs before every re-run of the effect, not only on unmount. |
| `shouldComponentUpdate`, `PureComponent` | `React.memo(Component)` | `memo` compares props only. |
| `getDerivedStateFromProps` | calculate during render, or reset with a `key` | Rarely needed. See [useState in depth](02-usestate-in-depth.md). |
| `getSnapshotBeforeUpdate` | no hook | Stays a class. |
| `componentDidCatch`, `getDerivedStateFromError` (error boundaries) | no hook | Keep a small class, or use the `react-error-boundary` package. See [Error boundaries](../03-intermediate/05-error-boundaries-portals-and-friends.md). |
| `this.state` and `this.setState` | `useState` or `useReducer` | The setter replaces the value; `this.setState` merged objects. |
| `this.props` | the `props` argument | |
| `static contextType`, `Context.Consumer` | `useContext` | |
| `createRef`, string refs | `useRef` | |

Also: `componentWillMount`, `componentWillReceiveProps` and `componentWillUpdate` are deprecated. Do not write them, and do not look for a hook version.

Look back at the `Dashboard` in section 2.2 to see the table at work. `componentDidMount` plus `componentDidUpdate` (the title) became one effect with `[width]`. `componentDidMount` plus `componentWillUnmount` (the listener) became one effect with `[]` and a cleanup.

Where the mapping misleads: an effect is not "a lifecycle method". It means "keep this outside thing in sync with these values". An effect with `[userId]` covers mount, updates and unmount for that one concern in one place. If you think "this runs on mount", you will miss that it also runs again when `userId` changes. The lesson [useEffect](03-useeffect.md) goes deeper.

**Common mistake:** expecting `useState` to merge object state the way `this.setState` did.

```jsx
const [user, setUser] = useState({ name: 'Ada', age: 36 })

setUser({ name: 'Grace' }) // WRONG: the state is now { name: 'Grace' }, age is gone
setUser({ ...user, name: 'Grace' }) // RIGHT: copy the old fields, then change one
```

Why: the `useState` setter replaces the whole value. A class's `this.setState` merged the object you passed into the existing state.

## 8. Class components vs function components

This is one of the most common interview questions. A good answer is short, fair, and ends with a clear recommendation.

| | Class component | Function component |
|---|---|---|
| Written as | `class X extends Component` with a `render()` method | a function that returns JSX |
| State | `this.state` and `this.setState` (merges) | `useState` or `useReducer` (replaces) |
| Side effects | lifecycle methods | `useEffect` |
| `this` | everywhere; handlers must be bound | none |
| Sharing logic | HOCs and render props | custom hooks |
| Error boundaries | yes, the only way | no hook for it |
| Performance tools | `PureComponent`, `shouldComponentUpdate` | `React.memo`, `useMemo`, `useCallback`, React Compiler |
| React Compiler | not compiled | compiled |
| Status | supported, legacy, not recommended for new code | the default |

One more difference that interviewers like: **what a callback sees.** In a class, `this.props` always points to the latest props, so a delayed callback can read newer values than the render that scheduled it. In a function component, each render has its own props and state, and a callback keeps the values of the render that created it. This is why hooks code can have "stale value" bugs, and also why it is easier to reason about. [useState in depth](02-usestate-in-depth.md) shows examples.

**Why function components are preferred today:**
- Less code, and no `this`.
- Related logic stays together, and shared logic moves into custom hooks.
- Every new React feature is built for them: `use`, `useTransition`, `useOptimistic`, Actions and the React Compiler all assume function components and hooks.
- Libraries are written hook-first. Most community libraries (routing, data fetching, forms) now give you hooks.
- Code is easier to test and to read for people new to the codebase.

Classes are not removed. Two jobs still need a class: error boundaries, and `getSnapshotBeforeUpdate`. Many large codebases still contain class components, and interviews at service companies ask about them. They are covered in Legacy class components (planned).

**Can you use hooks in a class?** No. A hook call in a class throws "Invalid hook call". I checked: a class `render` that calls `useState` throws it, and so does a hook call inside an event handler. But class and function components can live in the same tree, and you can pass a hook's value into a class through a small function component wrapper:

```jsx
import { Component, useEffect, useState } from 'react'

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return width
}

class LegacyBanner extends Component {
  render() {
    return <p>Width seen by the class: {this.props.width}</p>
  }
}

function withWindowWidth(WrappedComponent) {
  return function WithWindowWidth(props) {
    const width = useWindowWidth()
    return <WrappedComponent {...props} width={width} />
  }
}

const Banner = withWindowWidth(LegacyBanner)
```

**What happens, step by step:**
1. `Banner` is a function component made by `withWindowWidth`. It is allowed to call `useWindowWidth()`.
2. It renders `LegacyBanner` and passes the width as a normal prop.
3. The class reads `this.props.width`. I rendered it at 900px and then resized to 320px; the class showed 900, then 320.

**Common mistake:** rewriting every class component just because hooks exist.

```text
WRONG: stop a feature to rewrite 200 working class components
RIGHT: write new components as functions, and convert a class when you are already changing it
```

Why: classes keep working, and a rewrite risks new bugs for no user benefit. Convert gradually.

## 9. Custom hooks: a first look

You have already seen one: `useWindowWidth`. A **custom hook** is a function that:
1. has a name starting with `use` followed by a capital letter, and
2. calls other hooks inside it.

Because it calls hooks, it must follow the same rules: call it only from a component or another custom hook, and always at the top level.

```jsx
import { useState } from 'react'

function useToggle(initial = false) {
  const [on, setOn] = useState(initial)

  function toggle() {
    setOn((value) => !value)
  }

  return [on, toggle]
}

function ToggleButton({ label }) {
  const [on, toggle] = useToggle()
  return (
    <button onClick={toggle}>
      {label}: {on ? 'on' : 'off'}
    </button>
  )
}

function Settings() {
  return (
    <>
      <ToggleButton label="Wifi" />
      <ToggleButton label="Bluetooth" />
    </>
  )
}
```

**What happens, step by step:**
1. Each `ToggleButton` calls `useToggle()`, which calls `useState`. The two buttons are two component instances, so each has its own slots in React's list.
2. Clicking "Wifi" flips only the Wifi state.
3. I clicked Wifi once. The buttons read: "Wifi: on" and "Bluetooth: off".

The key idea for interviews: **a custom hook shares logic, not state.** Each place that calls it gets its own state. To share state, use context, lift state up, or an external store.

**Common mistake:** naming a function `use...` when it does not call any hook, or forgetting the `use` prefix when it does.

```jsx
import { useState } from 'react'

// WRONG: calls a hook but the name does not start with "use"
function toggleState() {
  const [on, setOn] = useState(false)
  return [on, setOn]
}

// RIGHT: starts with "use"
function useToggleState() {
  const [on, setOn] = useState(false)
  return [on, setOn]
}
```

Why: the `use` prefix is how the linter, and your teammates, know that a function follows the Rules of Hooks. With the wrong name, the linter reports the `useState` call inside as a violation and cannot check the code that calls `toggleState`. If a function calls no hooks, give it a normal name.

## How interviewers test this
- **The definition.** A strong answer says: hooks are functions that let function components use state, effects, context and refs; they were added in React 16.8; they solved `this` confusion, scattered lifecycle code, wrapper hell and reuse of stateful logic. A weak answer says only "hooks let you use state in functions".
- **The reason behind the rules.** Anyone can recite "no hooks in ifs". Strong candidates explain that React matches hooks by call order, and can sketch the slot model. The follow-up is often "what exactly goes wrong?" (answer: values land in the wrong slot, or React throws "Rendered more hooks than during the previous render").
- **Class vs function, without bias.** Interviewers want a balanced comparison (state, effects, `this`, reuse, error boundaries) and a clear recommendation. A red flag is saying classes are deprecated or removed.
- **Lifecycle mapping with nuance.** Listing `componentDidMount` equals `useEffect(..., [])` is the baseline. Mentioning that effects are about synchronization, that StrictMode re-runs them in development, and that error boundaries have no hook earns extra credit.
- **Hooks vs HOCs and render props.** They check whether you understand the wrapper-hell problem, and when a HOC is still reasonable.
- **Tooling awareness.** Mentioning `eslint-plugin-react-hooks` (`rules-of-hooks`, `exhaustive-deps`) shows real project experience. Red flag: "I just disable the warning".

## Interview questions and model answers

### Q1. What are hooks, and what problem do they solve? (Easy)
Hooks are functions whose names start with `use` that let function components use React features such as state (`useState`), side effects (`useEffect`), context (`useContext`) and refs (`useRef`). They arrived in React 16.8; before that, only classes could do these things. They solved four problems: the `this` keyword and manual binding in classes, lifecycle methods that split one job across several methods and mix unrelated jobs in one, wrapper hell from higher-order components and render props, and the difficulty of reusing stateful logic. With hooks you group code by purpose, and you reuse logic by writing a custom hook.

### Q2. What are the Rules of Hooks? (Easy)
There are two. First, call hooks only at the top level of a component or custom hook: not inside conditions, loops, nested functions, `try`/`catch`, or after an early `return`. Second, call hooks only from React function components or custom hooks (names starting with `use`), not from plain JavaScript functions or class components. The ESLint rule `react-hooks/rules-of-hooks` enforces both.

### Q3. Why can hooks not be called conditionally? (Medium)
React does not know hooks by name. It remembers them by the order in which they are called during render, in a list attached to the component. On every render, the first hook call reads slot 1, the second reads slot 2, and so on. If a hook is skipped on one render, every later call shifts one slot and reads the wrong value, so state can silently land in the wrong variable. In the best case, React notices that the number of hooks changed and throws "Rendered more hooks than during the previous render." The fix is to call the hook every time and put the condition inside the hook, in an effect, or in the JSX, or to move the conditional part into a child component.

```jsx
// Do not call the hook only when `open` is true.
// Always call it, and put the condition inside:
useEffect(() => {
  if (!open) return
  // work that only matters when open
}, [open])
```

### Q4. How does React know which `useState` is which? (Medium)
By call order. For each component instance, React keeps an ordered list of hook slots. During the first render, each hook call creates the next slot and stores its initial value. On later renders, React resets a cursor to the start of the list, and each hook call reads the slot at the cursor and moves it forward. So the second `useState` always gets the second slot. The names on your side (`count`, `name`) are only local variables that React never sees. This is also why custom hooks compose well: each call to `useToggle()` simply takes the next slots, so two calls in one component never clash. Using names as keys would force you to invent a unique name for every hook call.

### Q5. What is the difference between class and function components? (Easy)
A class component extends `Component`, keeps state in `this.state`, uses lifecycle methods for side effects, needs `this` binding, and shares logic with HOCs and render props. A function component is a plain function; it keeps state with `useState`, runs side effects with `useEffect`, has no `this`, and shares logic with custom hooks. Function components are shorter, group related code, and are what new React features (and the React Compiler) are built for. Classes still work and are still needed for error boundaries, but React recommends functions for new code. One subtle difference: a function component's callbacks capture the props and state of the render that created them, while a class reads `this.props` at call time.

### Q6. Can you use hooks inside class components? (Easy)
No. Hooks need a function component or a custom hook, and calling one in a class throws "Invalid hook call". You can still use hook-based code with a class by writing a small function component or HOC that calls the hook and passes the value as a prop, as the `withWindowWidth` example above does. Class and function components can coexist in one app, so migration can be gradual.

### Q7. What is the difference between hooks and HOCs? (Medium)
A HOC is a function that takes a component and returns a new component that wraps it and injects props. A hook is a function you call inside your component that returns values directly. HOCs add extra layers to the tree, can make prop names collide, hide where a prop came from, and are awkward to type. Hooks add no layers, you name the values yourself, and several hooks compose by simply being called one after another. HOCs are not dead: you meet them in older libraries (like the legacy Redux `connect`) and they remain useful to wrap class components or to add behaviour around a whole component. See [Component patterns](../03-intermediate/01-component-patterns.md).

### Q8. How do class lifecycle methods map to hooks? (Medium)
`constructor` becomes `useState` initial values; `componentDidMount` becomes `useEffect(fn, [])`; `componentDidUpdate` becomes `useEffect(fn, [deps])`; `componentWillUnmount` becomes the cleanup function returned from the effect; `shouldComponentUpdate` becomes `React.memo`; `getDerivedStateFromProps` becomes calculating during render. The mapping is only a rough guide. Effects are about synchronizing with an outside system whenever certain values change, not about "mount" and "unmount" moments, and in development StrictMode runs the setup, cleanup, setup sequence on purpose. Error boundaries (`componentDidCatch`) and `getSnapshotBeforeUpdate` have no hook equivalent.

### Q9. What is a custom hook? Do two components that use the same custom hook share state? (Medium)
A custom hook is a function whose name starts with `use` and that calls other hooks, so you can reuse stateful logic. It must follow the Rules of Hooks. Two components that call the same custom hook do not share state: each call runs its own `useState` and `useEffect`, so each component instance gets its own slots. They share code, not data. To share data, lift the state up, use context, or use an external store.

### Q10. Name the built-in hooks by category. (Easy)
State: `useState`, `useReducer`. Context: `useContext`. Refs: `useRef`, `useImperativeHandle`. Effects: `useEffect`, `useLayoutEffect`, `useInsertionEffect`, `useEffectEvent`. Performance: `useMemo`, `useCallback`, `useTransition`, `useDeferredValue`. Other: `useId`, `useSyncExternalStore`, `useDebugValue`. React 19 additions: `useActionState`, `useOptimistic`, and `useFormStatus` from `react-dom`. Also `use`, which reads promises and context and is not technically a hook. That makes 18 hooks in `react`. Add that you use `useState`, `useEffect`, `useRef` and `useContext` most.

### Q11. What causes "Rendered more hooks than during the previous render"? (Medium)
It means a component called more hooks in this render than in the previous one. Typical causes: a hook inside an `if`, a hook placed after an early `return` that did not run the first time, a hook inside a loop whose length changed, or calling a component as a function (`Child()` instead of `<Child />`), which adds its hooks to the parent. The opposite case gives "Rendered fewer hooks than expected. This may be caused by an accidental early return statement." The fix is to make the sequence of hook calls identical on every render: move hooks above any return, and use a child component for conditional or repeated hooks.

### Q12. Is `use` a hook? Can it be called conditionally? (Hard)
`use` is a React API that is called during render, but the docs say it is not a hook. Unlike hooks, it can be called inside `if` statements and loops, and after an early return. It cannot be wrapped in `try`/`catch`. It reads either a promise (it suspends until the promise settles; the promise must be stable, for example from a cache or a Server Component, not created fresh in render) or a context (`use(ThemeContext)` works like `useContext` but may be conditional). I ran `use(ThemeContext)` after an early return and it worked, while a conditional `useContext` should still be treated as a Rules of Hooks violation.

### Q13. What does `eslint-plugin-react-hooks` do, and should you ever disable `exhaustive-deps`? (Medium)
It has two classic rules: `rules-of-hooks` (an error) enforces the two rules, and `exhaustive-deps` (a warning) checks that every value an effect, `useMemo` or `useCallback` reads is in its dependency array. Since version 7, the `recommended` preset also includes React Compiler based rules such as `set-state-in-render`, `refs`, `purity` and `static-components`. You should almost never disable `exhaustive-deps`: it points at real stale-value bugs. When it seems wrong, restructure the code (move the function inside the effect, use a functional state update, or use `useEffectEvent` for a part of the effect that should read the latest values without being a trigger), rather than silencing it.

### Q14. How would you implement a minimal `useState`? (Hard)
Keep an array of slots and a cursor outside the component. Each `useState` call takes the slot at the cursor, increments the cursor, fills the slot on the first render, and returns the value with a setter that writes into that slot and triggers a new render. Before each render, reset the cursor to 0.

```js
let slots = []
let cursor = 0
let rerender = () => {}

function useState(initial) {
  const slot = cursor
  cursor++
  if (slot >= slots.length) slots.push(initial)
  const setState = (next) => {
    slots[slot] = typeof next === 'function' ? next(slots[slot]) : next
    rerender()
  }
  return [slots[slot], setState]
}

function mount(Component) {
  rerender = () => {
    cursor = 0
    console.log(Component())
  }
  rerender()
}
```

I ran this with a `Counter` and two functional increments; it printed `count is 0`, `count is 1`, `count is 2`. Real React keeps slots per component instance, batches updates, schedules renders by priority, and bails out when the value did not change. The call-order idea is the same, and it explains the Rules of Hooks.

### Q15. Which class features can function components not replace? (Medium)
Two. Error boundaries need `getDerivedStateFromError` or `componentDidCatch`, and there is no hook for them; use a small class or the `react-error-boundary` package. `getSnapshotBeforeUpdate` also has no hook equivalent. Everything else (state, effects, context, refs, memoization) has a hooks counterpart.

## Common mistakes and gotchas
- **A hook after an early `return`.** The first render skips it, a later one does not. Fix: put all hooks above every `return`.
- **A hook inside `if`, a loop, `&&` or a ternary.** Fix: call it always; make the use of the result conditional, or move the conditional part into a child component.
- **A hook inside an event handler, `useEffect` or `useMemo` callback.** Fix: call it at the top of the component and use the result inside.
- **A hook in a plain function whose name does not start with `use`.** Fix: rename it `useSomething` and call it only from components or hooks, or pass the data in as arguments.
- **A hook in a class component.** Fix: convert the class, or wrap it in a function component that passes the value as a prop.
- **Calling a component as `Child()`.** Fix: render it as `<Child />`.
- **"Invalid hook call" with correct code.** The official causes are mismatched React and renderer versions, breaking the Rules of Hooks, or more than one copy of React in the app (common with linked packages in a monorepo). Fix: check `npm ls react react-dom`.
- **Silencing `exhaustive-deps` with a comment.** Fix: list the dependency, or redesign the effect.
- **Expecting `useState` to merge objects.** Fix: spread the old object into the new one.
- **Reusing a custom hook and expecting shared state.** Fix: each call has its own state; use context or lifted state to share.
- **Prefixing a function with `use` when it calls no hooks.** Fix: use a normal name. The prefix is a promise that rules apply.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** In your own words, state the two Rules of Hooks. Then list five places where a hook call is not allowed.

<details>
<summary>Show answer</summary>

Rule 1: call hooks only at the top level of the component or custom hook, so that the same hooks run in the same order on every render. Rule 2: call hooks only from function components or custom hooks (functions named `useSomething`).

Not allowed: inside an `if`; inside a loop (`for`, `while`, `map` callback); after an early `return`; inside an event handler or other nested function; inside the callback of `useEffect`, `useMemo` or `useCallback`; inside `try`/`catch`/`finally`; in a class component; in a plain function that is not a hook. Any five of these are a correct answer.

</details>

2. **(Easy)** Which of these break the Rules of Hooks? For each one that does, say which rule and how to fix it.

```jsx
// A
function A({ items }) {
  const [open, setOpen] = useState(false)
  return <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>
}

// B
function B({ id }) {
  if (id) {
    useEffect(() => {
      document.title = id
    }, [id])
  }
  return null
}

// C
function C() {
  function handleClick() {
    const [n, setN] = useState(0)
  }
  return <button onClick={handleClick}>Go</button>
}

// D
function formatPrice(value) {
  const locale = useContext(LocaleContext)
  return new Intl.NumberFormat(locale).format(value)
}

// E
function E({ user }) {
  const theme = useContext(ThemeContext)
  const name = user ? user.name : 'guest'
  const [open, setOpen] = useState(false)
  return <p>{theme} {name}</p>
}

// F
function F({ ready }) {
  const data = ready && useData()
  return <p>{String(data)}</p>
}
```

<details>
<summary>Show answer</summary>

- A is fine. The hook is at the top level; the `map` only creates JSX.
- B breaks Rule 1 (a hook inside an `if`). Fix: call `useEffect` always, and put `if (!id) return` inside the effect.
- C breaks Rule 1 (a hook inside a nested function). Fix: call `useState` at the top of `C` and use `n` and `setN` inside `handleClick`.
- D breaks Rule 2 (a hook inside a plain function that is not a component or hook). Fix: rename it `useFormatPrice` and call it from a component, or pass `locale` in as an argument.
- E is fine. The ternary picks a value, not a hook, and both hooks run on every render.
- F breaks Rule 1 (`&&` makes the call conditional). Fix: call `useData()` always, then use `ready ? data : null`. If the hook should do nothing when not ready, move the check inside the hook.

</details>

3. **(Easy)** Coding: this component crashes when `messages` changes from empty to non-empty. Fix it without changing what it shows.

```jsx
import { useState } from 'react'

function Inbox({ messages }) {
  const [showRead, setShowRead] = useState(true)
  if (messages.length === 0) {
    return <p>No messages</p>
  }
  const [selectedId, setSelectedId] = useState(null)
  const visible = showRead ? messages : messages.filter((m) => !m.read)
  return (
    <div>
      <button onClick={() => setShowRead(!showRead)}>{showRead ? 'Hide read' : 'Show read'}</button>
      <ul>
        {visible.map((m) => (
          <li key={m.id} onClick={() => setSelectedId(m.id)}>
            {m.id === selectedId ? '> ' : ''}
            {m.text}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

<details>
<summary>Show answer</summary>

The second `useState` sits after an early `return`. With an empty list, the component calls one hook; with messages it calls two, so React throws "Rendered more hooks than during the previous render." (I ran it: the buggy version rendered "No messages" first and then threw.) Move the hook above the return:

```jsx
import { useState } from 'react'

function Inbox({ messages }) {
  const [showRead, setShowRead] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  if (messages.length === 0) {
    return <p>No messages</p>
  }
  const visible = showRead ? messages : messages.filter((m) => !m.read)
  return (
    <div>
      <button onClick={() => setShowRead(!showRead)}>{showRead ? 'Hide read' : 'Show read'}</button>
      <ul>
        {visible.map((m) => (
          <li key={m.id} onClick={() => setSelectedId(m.id)}>
            {m.id === selectedId ? '> ' : ''}
            {m.text}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

I rendered the fixed version with `[]` and then with two messages. It showed "No messages", then the list. After selecting "Invoice" and clicking "Hide read", it showed "Show read" and "> Invoice".

</details>

4. **(Medium)** Predict: using the tiny slot model from section 4, what does this print on each of the three lines?

```js
slots = []
cursor = 0

function Broken2({ show }) {
  if (show) {
    useState('Ada')
  }
  const [count, setC] = useState(0)
  return { text: `count is ${count}`, setC }
}

let r = renderComponent(Broken2, { show: false })
console.log(r.text, JSON.stringify(slots))
r.setC(7)
r = renderComponent(Broken2, { show: false })
console.log(r.text, JSON.stringify(slots))
r = renderComponent(Broken2, { show: true })
console.log(r.text, JSON.stringify(slots))
```

<details>
<summary>Show answer</summary>

```text
count is 0 [0]
count is 7 [7]
count is 0 [7,0]
```

Walk through it. With `show: false` only one hook runs, so `count` lives in slot 0. `setC(7)` writes 7 into slot 0. When `show` becomes `true`, the first hook call (`useState('Ada')`) now reads slot 0 and receives 7 (ignoring `'Ada'`), and the second call (`useState(0)`) finds no slot 1 yet, so it creates one with `0`. The user's count of 7 silently jumped into the wrong hook, and `count` shows 0. No error at all. (I ran this in Node to get the output.)

</details>

5. **(Medium)** Coding: convert this class component to a function component with hooks. It must stop the timer when it leaves the screen.

```jsx
import { Component } from 'react'

class Ticker extends Component {
  state = { seconds: 0 }

  componentDidMount() {
    this.timer = setInterval(() => this.setState((s) => ({ seconds: s.seconds + 1 })), 1000)
  }

  componentWillUnmount() {
    clearInterval(this.timer)
  }

  render() {
    return <p>Seconds: {this.state.seconds}</p>
  }
}
```

<details>
<summary>Show answer</summary>

```jsx
import { useEffect, useState } from 'react'

function Ticker() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  return <p>Seconds: {seconds}</p>
}
```

`useState(0)` replaces `state = { seconds: 0 }`. The effect starts the interval (the old `componentDidMount`), and the function it returns clears the interval (the old `componentWillUnmount`). The functional update `(s) => s + 1` means the effect does not need `seconds` in its dependency list, so `[]` is correct and the linter is happy. The timer id is a local variable inside the effect, so no `this.timer` is needed.

I tested both versions with fake timers, with and without StrictMode: after 3 seconds both showed "Seconds: 3", and after unmount there were no timers left (1 before unmount, 0 after). In StrictMode the cleanup made the extra setup, cleanup, setup cycle harmless.

</details>

6. **(Medium)** For each class feature, name the hook or pattern that replaces it: `constructor` state, `componentDidMount`, `componentWillUnmount`, `shouldComponentUpdate`, `getDerivedStateFromProps`. Then name two class features that have no hook.

<details>
<summary>Show answer</summary>

- `constructor` state: `useState(initial)` (or `useState(() => compute())` for an expensive start).
- `componentDidMount`: `useEffect(fn, [])`, with the caveat that effects are synchronization, and StrictMode re-runs them in development.
- `componentWillUnmount`: the cleanup function returned from `useEffect`.
- `shouldComponentUpdate`: `React.memo(Component)` (props only).
- `getDerivedStateFromProps`: calculate the value during render, or reset state with a `key`.

No hook exists for: error boundaries (`getDerivedStateFromError`, `componentDidCatch`) and `getSnapshotBeforeUpdate`. Use a class (or `react-error-boundary` for boundaries).

</details>

7. **(Medium)** Coding: this playlist works at first but crashes when a song is added. Explain why and fix it so each song keeps its own liked state.

```jsx
import { useState } from 'react'

function Playlist({ songs }) {
  return (
    <ul>
      {songs.map((song) => {
        const [liked, setLiked] = useState(false)
        return (
          <li key={song}>
            <button onClick={() => setLiked(!liked)}>{liked ? 'Unlike' : 'Like'}</button> {song}
          </li>
        )
      })}
    </ul>
  )
}
```

<details>
<summary>Show answer</summary>

The hook is inside a loop, so the number of hook calls equals the number of songs. When the list grows from two songs to three, React sees more hooks than in the previous render and throws "Rendered more hooks than during the previous render." Fix it by extracting the row into a component, because each component instance has its own hooks:

```jsx
import { useState } from 'react'

function Song({ title }) {
  const [liked, setLiked] = useState(false)
  return (
    <li>
      <button onClick={() => setLiked(!liked)}>{liked ? 'Unlike' : 'Like'}</button> {title}
    </li>
  )
}

function Playlist({ songs }) {
  return (
    <ul>
      {songs.map((song) => (
        <Song key={song} title={song} />
      ))}
    </ul>
  )
}
```

I ran both: with the fixed version I liked song A, then added song C. The list showed "Unlike A", "Like B", "Like C". The key keeps each song's state attached to the right row.

</details>

8. **(Medium)** Coding: write a custom hook `useToggle(initial = false)` that returns `[on, toggle]`. Use it twice in one component, `A` starting `false` and `B` starting `true`. If the user clicks the "A" button once, what do the two buttons show?

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

function useToggle(initial = false) {
  const [on, setOn] = useState(initial)

  function toggle() {
    setOn((value) => !value)
  }

  return [on, toggle]
}

function Pair() {
  const [a, toggleA] = useToggle()
  const [b, toggleB] = useToggle(true)
  return (
    <div>
      <button onClick={toggleA}>A: {String(a)}</button>
      <button onClick={toggleB}>B: {String(b)}</button>
    </div>
  )
}
```

After one click on "A", the buttons read `A: true` and `B: true`. A started `false` and was flipped. B started `true` and was not touched. Each `useToggle()` call has its own slots, even inside one component, so the two toggles never interfere. I ran this to confirm the output.

</details>

9. **(Hard)** Predict: what does this component show on the first render, and what happens when `user` changes from `null` to `"Ada"`? Explain why, using the slot idea.

```jsx
import { useState } from 'react'

function Profile({ user }) {
  const [open] = useState(false)
  if (!user) return <p>Loading</p>
  const [note] = useState('')
  return (
    <p>
      {user} {String(open)} {note}
    </p>
  )
}
```

<details>
<summary>Show answer</summary>

First render (`user` is `null`): it shows "Loading". Only the first `useState` ran, so the component has one hook slot.

When `user` becomes `"Ada"`: the component now reaches the second `useState`, so it makes two hook calls where the previous render made one. React throws "Rendered more hooks than during the previous render." (and, in development, logs "React has detected a change in the order of Hooks called by Profile"). I rendered it inside an error boundary and got exactly that error on the second render.

Fix: move `const [note] = useState('')` above the `if (!user) return`.

One more detail: React only reports this when the component already called a hook on the previous render, so do not treat the error as a reliable safety net. The goal is to never change the number or order of hook calls in the first place.

</details>

10. **(Hard)** Coding: extend the tiny model from section 4 with a `useRef(initial)` that returns an object `{ current: initial }` which stays the same object on every render. Show that two renders return the same object, and that a value written to `current` between renders is still there.

<details>
<summary>Show answer</summary>

```js
function useRef(initial) {
  const slot = cursor
  cursor++
  if (slot >= slots.length) slots.push({ current: initial })
  return slots[slot]
}

let lastRef
function Timer() {
  const [count] = useState(0)
  const ref = useRef(null)
  lastRef = ref
  return `count ${count}`
}

console.log(renderComponent(Timer))
const first = lastRef
first.current = 'saved'
console.log(renderComponent(Timer))
const second = lastRef
console.log('same object:', first === second, '| current:', second.current)
console.log('slots:', JSON.stringify(slots))
```

Output (I ran it, together with the `useState` and `renderComponent` from section 4):

```text
count 0
count 0
same object: true | current: saved
slots: [0,{"current":"saved"}]
```

The ref is a slot that holds one object. It is created on the first render, and every later render hands back the same object. Writing to `current` just changes a property on that object. Nothing tells React to render, which is why changing a ref does not re-render a component, while a state setter (which calls `rerender()` in Q14's version) does.

</details>

## Recap
- A hook is a function named `use...` that lets a function component use React features: state, effects, context, refs. They arrived in React 16.8.
- Hooks solved four problems with classes: `this` binding, lifecycle methods that split one job and mix several, wrapper hell from HOCs and render props, and hard-to-reuse stateful logic.
- Rule 1: call hooks only at the top level (no conditions, loops, nested functions, `try`/`catch`, or after an early return). Rule 2: call hooks only from function components or custom hooks.
- Why: React finds each hook by its position in the call order, like numbered slots. A changed order means values land in the wrong slot, or React throws "Rendered more hooks than during the previous render."
- Use `eslint-plugin-react-hooks` (7.1.1): `rules-of-hooks` is an error, `exhaustive-deps` is a warning, and version 7 adds React Compiler based rules. Fix warnings, do not silence them.
- 18 hooks live in `react`: state, context, ref, effect, performance, other, and the React 19 additions; `use` is not a hook and can be conditional.
- Class lifecycle maps roughly to `useState`, `useEffect` (with cleanup), and `React.memo`; error boundaries and `getSnapshotBeforeUpdate` have no hook.
- Prefer function components for new code; classes still work. A custom hook shares logic, not state.

## Where to go next
- Next lesson: [useState in depth](02-usestate-in-depth.md), then [useEffect](03-useeffect.md) and [Custom hooks](08-custom-hooks.md).
- To see how React really stores hooks: React internals deep dive (planned).
- Practice hook questions in a timed round: [Round 2 - Concepts and theory](../05-interview-rounds/round-2-concepts-and-theory/README.md), and the hooks question set at Round 2 hooks questions (planned) with answers (planned).
- Revise on one page: Hooks cheatsheet (planned).
- Hands-on: [01 - Counter](../practice-app/exercises/react/01-counter/README.md) and [18 - Stopwatch](../practice-app/exercises/react/18-stopwatch/README.md).
