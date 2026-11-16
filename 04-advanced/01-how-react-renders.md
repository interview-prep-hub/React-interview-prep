# How React Renders

> **Level:** Advanced   **Time:** about 75 minutes   **Read first:** [State and events](../01-basics/05-state-and-events.md), [useState in depth](../02-hooks/02-usestate-in-depth.md), [Conditional rendering and lists](../01-basics/06-conditional-rendering-and-lists.md)

## What you will learn
- Explain the three steps behind every screen change (trigger, render, commit) and say which work belongs to which step.
- Describe what the "virtual DOM" and a Fiber really are, and give an honest answer to "is the virtual DOM why React is fast?".
- Predict when React keeps, resets or throws away state, using the diffing rules and keys.
- Trace one click through the state snapshot, the update queue and batching, and say how many renders happen.
- Decide which components re-render after an update, and which tools stop it.
- Observe renders with logs and the Profiler, and explain StrictMode double rendering, `flushSync` and interruptible rendering.

All outputs in this lesson were produced by running the code with React 19.3.1 and Testing Library, unless the text says otherwise.

## 1. The big picture: trigger, render, commit

Every time something changes on a React screen, React does the same three steps, in the same order.

1. **Trigger.** Something asks for a render. Either the app starts, or a state setter is called.
2. **Render.** React calls your component functions. They return a description of the screen. React compares that description with the one from last time. Nothing on the page changes yet.
3. **Commit.** React changes the real DOM, but only where the new description differs from the old one. Then it runs your effects.

An analogy: think of an architect and a building crew. When something changes, the architect draws a fresh blueprint of how the building should look now. That is the **render**. Drawing is cheap, and a blueprint can be thrown away and redrawn without anyone noticing. Then the crew compares the new blueprint with the real building and changes only the parts that differ. That is the **commit**. People inside the building only notice when the crew works.

```text
  1. TRIGGER             2. RENDER                        3. COMMIT
  "something changed"    "what should the screen be?"     "make the screen match"

  root.render(<App />)   React calls your components      change the real DOM
  or                     from the top down and gets       (only the differences)
  a state update         a new tree of elements           attach and detach refs
  (setState, dispatch)   It compares it with last time    run layout effects
                                                          ...the browser paints...
  Touches nothing.       Touches nothing.                 run passive effects (useEffect)
                         Must be pure.                    Side effects live here.
```

Words you need before we go on:
- **Render** means "React calls your component function". It does not mean "pixels change". People say "render" in both ways, which causes confusion. In this lesson, render is always the function call.
- **Re-render** means React calls the component function again.
- **Commit** is the moment React writes to the DOM.
- **Effect** is code you ask React to run after a commit (`useEffect`, `useLayoutEffect`).

Let us watch the three steps with logs.

```jsx
import { useEffect, useLayoutEffect, useState } from 'react'

function Child({ label }) {
  console.log('Child render')
  useLayoutEffect(() => {
    console.log('Child layout effect')
  })
  useEffect(() => {
    console.log('Child passive effect')
  })
  return <p>{label}</p>
}

export default function App() {
  const [count, setCount] = useState(0)
  console.log('App render, count =', count)
  useLayoutEffect(() => {
    console.log('App layout effect')
  })
  useEffect(() => {
    console.log('App passive effect')
  })

  function handleClick() {
    console.log('click handler start')
    setCount((c) => c + 1)
    console.log('click handler end')
  }

  return (
    <div>
      <button onClick={handleClick}>Add</button>
      <Child label={`Count: ${count}`} />
    </div>
  )
}
```

Output on the first load:

```text
App render, count = 0
Child render
Child layout effect
App layout effect
Child passive effect
App passive effect
```

Output after one click:

```text
click handler start
click handler end
App render, count = 1
Child render
Child layout effect
App layout effect
Child passive effect
App passive effect
```

(A new Vite app wraps your app in `<StrictMode>`. There, every "render" line appears twice in development. Section 5 explains why. Everything else stays the same.)

**What happens, step by step:**
1. The click handler runs first. It calls `setCount`, which only asks for a render. The handler finishes and prints "click handler end". The variable `count` and the screen have not changed yet.
2. **Trigger done, render starts.** After the handler, React calls `App` with the new state. `App` returns new elements. React then calls `Child` because it is inside `App`. Parents render before children.
3. **Commit.** React finds that the text of the `<p>` changed and writes only that to the DOM.
4. **Layout effects** run next. Children run before parents.
5. The browser paints. **Passive effects** (`useEffect`) run after that, again children first. (More on exact timing in section 6.)

**Common mistake:** expecting the screen to be updated right after `setCount`.

```jsx
// WRONG: the DOM still has the old text on the next line
function handleClick() {
  setCount(count + 1)
  console.log(document.querySelector('p').textContent) // still "Count: 0"
}
```

```jsx
// RIGHT: if you must react to the new screen, use an effect
useEffect(() => {
  console.log(document.querySelector('p').textContent) // "Count: 1"
}, [count])
```

Why: `setCount` only queues work. The render and the commit happen after your handler finishes.

## 2. Step 1: the trigger

There are two kinds of trigger.

**The initial render.** Your app starts when you give React a DOM node and a component. In a Vite app this is `main.jsx`:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`createRoot` makes a **root**: React's connection to one DOM node. `root.render(...)` starts the first render. (For HTML that a server already produced, you use `hydrateRoot` instead. See [SSR and Server Components](05-ssr-and-server-components.md).)

An easy detail to miss: `root.render` does not draw anything before it returns. We checked with a real root:

```text
right after root.render: []
40 ms later: [<h1>Hello</h1>]
```

React does the work a moment later. So never write code that expects the page to be ready on the line after `root.render`.

**A re-render.** After the first render, a component renders again for one of these reasons:

| Reason | Example |
|---|---|
| Its own state changed | `setCount(1)` when the count was 0 |
| Its parent rendered | The parent's state changed, so React calls the child again, even with the same props |
| A context it reads changed | A `<ThemeContext value={...}>` above it got a new value |
| An outside store it subscribed to changed | A `useSyncExternalStore` store |

Two notes. First, "props changed" is not a separate trigger. Props only change because a parent rendered and passed new values (section 14). Second, "changed" for state means `Object.is(oldValue, newValue)` is `false`. Setting the same value again does nothing visible (section 15).

What does not trigger a render: changing a plain variable, changing `ref.current`, and mutating an object or array that is already in state. React has no way to notice them.

```jsx
import { useRef } from 'react'

export default function Clicker() {
  let clicks = 0
  const refClicks = useRef(0)

  return (
    <div>
      <button
        onClick={() => {
          clicks = clicks + 1
          refClicks.current = refClicks.current + 1
        }}
      >
        click me
      </button>
      <p>clicks: {clicks}</p>
      <p>ref clicks: {refClicks.current}</p>
    </div>
  )
}
```

After three clicks the component function had run once in total, and the screen still said:

```text
clicks: 0
ref clicks: 0
```

**What happens, step by step:**
1. The first render shows `clicks: 0` and `ref clicks: 0`.
2. Each click changes a variable and a ref. The variable belongs to the old render and is thrown away. The ref changed, but changing a ref does not ask React for anything.
3. No trigger happened, so no render happened, so the screen never changed. (If something else caused a render later, the ref value would show up, because a ref survives renders. It still is not the right tool for data the screen shows.)

**Common mistake:** mutating state and setting the same reference.

```jsx
// WRONG: same array object, so React sees "no change" and skips the render
function addItem() {
  list.push('b')
  setList(list)
}
```

```jsx
// RIGHT: a new array
function addItem() {
  setList([...list, 'b'])
}
```

Why: React compares state with `Object.is`. For objects that checks the reference, not the content. We ran the wrong version: zero extra renders and the screen stayed at `a`.

## 3. Step 2: the render phase

In the render phase React **calls your component functions**. A component takes props and returns JSX. JSX is not HTML and it does not make DOM nodes. It makes **React elements**: plain JavaScript objects that describe what you want.

```jsx
function Hello({ name }) {
  return <h1>Hello {name}</h1>
}

const element = <Hello name="Ada" />
console.log(element.type === Hello) // true
console.log(element.props)          // { name: 'Ada' }
console.log(element.key)            // null
```

An element is a small description with a few fields:

```text
{
  $$typeof: Symbol(react.transitional.element),
  type: Hello,            // a function for a component, a string like "div" for a DOM tag
  key: null,
  props: { name: 'Ada' },
}
```

(In development React adds a few debug fields and freezes the object. We checked that `Object.isFrozen(element)` is `true`.)

The important point: writing `<Hello name="Ada" />` does **not** call `Hello`. It builds an object that says "I would like a `Hello` with these props". React calls `Hello` later, when it renders. A DOM tag works the same way. `<div className="box">` is an element whose `type` is the string `"div"`.

Elements nest. A parent's element has its children inside `props.children`:

```text
<div className="box"><span>hi</span></div>

{ type: 'div', props: { className: 'box', children: { type: 'span', props: { children: 'hi' } } } }
```

Here is how React walks the tree. It starts at the root component, calls it, and looks at the elements it returned. For every element whose `type` is a component, it calls that component too. It goes down, then across.

```text
              App                 1. React calls App
            /     \               2. App returned <Header /> and <List />
       Header     List            3. React calls Header, then List
                 /    \           4. List returned two <Item />
             Item      Item       5. React calls Item, then Item
```

The log we saw in section 1 shows this order: `App render`, then `Child render`.

By the end, React has a full description of the new screen. While it builds that description, it also compares each piece with the old one (section 9). The result of the render phase is a list of changes to make, not a changed page.

**What happens, step by step:**
1. React calls `App(props)`. Hooks inside it read the current state from React's memory.
2. `App` returns elements. These are cheap objects.
3. For each element that is a component, React calls it with its props. This repeats down the tree.
4. For each DOM tag element, React notes what it wants: tag, attributes, text.
5. Nothing has touched the DOM so far.

**Common mistake:** calling a component like a normal function.

```jsx
// WRONG: Hello's hooks and state now belong to the parent
function App() {
  return <div>{Hello({ name: 'Ada' })}</div>
}
```

```jsx
// RIGHT: let React call it
function App() {
  return <div><Hello name="Ada" /></div>
}
```

Why: when you call it yourself, React does not know `Hello` exists. It gets no place in the tree, no state of its own, and its hooks get mixed up with the parent's.

## 4. Render must be pure

A render has to be a **pure calculation**. Pure means two things:

1. **Same inputs, same output.** Given the same props, state and context, the component returns the same JSX every time.
2. **No changes to anything outside.** The component must not change variables, objects or the page that existed before the render started.

Why does React insist? Because React decides when to call your component, and how often. It may call a component twice in a row (StrictMode does). It may start a render and throw it away (section 17). It may skip a component. If your render changes something outside, the result depends on how many times and when React happened to call it. That is a bug you cannot reproduce.

Here is a component that breaks the rule:

```jsx
let guestCount = 0

function Guest() {
  guestCount = guestCount + 1 // changes something outside the component
  return <li>Guest #{guestCount}</li>
}

export default function Board() {
  return (
    <ul>
      <Guest />
      <Guest />
      <Guest />
    </ul>
  )
}
```

Normal output: `Guest #1`, `Guest #2`, `Guest #3`. In StrictMode (the default in a Vite app) in development:

```text
Guest #2
Guest #4
Guest #6
```

**What happens, step by step:**
1. `Guest` reads and changes `guestCount`, a variable that lives outside the component. That is a side effect in render.
2. StrictMode calls every component twice. The first guest calls it twice, so `guestCount` goes to 2.
3. The second guest makes it 4, the third makes it 6. On the next re-render it would start from 6.
4. The output depends on how many times React calls the function. That is exactly what pure code must not do.

The fix is to pass the number in as a prop. Now the output is a function of the inputs:

```jsx
function Guest({ number }) {
  return <li>Guest #{number}</li>
}

export default function Board() {
  return (
    <ul>
      {[1, 2, 3].map((n) => (
        <Guest key={n} number={n} />
      ))}
    </ul>
  )
}
```

This prints `Guest #1`, `Guest #2`, `Guest #3`, also in StrictMode.

What is allowed in render, and where the rest goes:

| In render | Not in render | Put it here instead |
|---|---|---|
| Calculate from props, state, context | Change a module variable or global | An event handler or an effect |
| Create and fill a **local** array or object, then return it | Mutate props or state (`items.sort()`, `obj.x = 1`) | Copy first: `[...items].sort()` |
| Read `props`, `state`, `context` | `Math.random()` or `Date.now()` to build the output | State (created once), or an effect |
| Return JSX | Change the DOM, `document.title`, `localStorage`, start a timer, send a request | An effect, or an event handler |

"Local mutation is fine" deserves one example. This is pure, because `rows` is created and changed inside this one call and nobody else can see it:

```jsx
function List({ items }) {
  const rows = []
  for (const item of items) {
    rows.push(<li key={item.id}>{item.name}</li>)
  }
  return <ul>{rows}</ul>
}
```

**Common mistake:** sorting a prop in place.

```jsx
// WRONG: sort() changes the array that the parent owns
function Ranking({ scores }) {
  const sorted = scores.sort((a, b) => b - a)
  return <ol>{sorted.map((s) => <li key={s}>{s}</li>)}</ol>
}
```

```jsx
// RIGHT: sort a copy (or use scores.toSorted(...))
function Ranking({ scores }) {
  const sorted = [...scores].sort((a, b) => b - a)
  return <ol>{sorted.map((s) => <li key={s}>{s}</li>)}</ol>
}
```

Why: `sort` changes the array in place. The array belongs to the parent, so the child just changed the parent's data behind its back.

## 5. StrictMode: a detector for impure code

`<StrictMode>` is a wrapper component that adds extra checks **in development only**. It renders nothing on its own. It is the reason your logs show twice.

In development, StrictMode does these extra calls:

| What | Extra work |
|---|---|
| Your component function | Called twice per render |
| `useState` initializer, `useMemo` callback, `useReducer` reducer | Called twice |
| State updater functions (`setCount(c => c + 1)`) | Called twice |
| Effects, once, when a component mounts | Setup, then cleanup, then setup again |
| Ref callbacks (React 19), once, on mount | Attach, detach, attach again |

Since React 19.3, the extra effect cycle also happens when a server-rendered page is hydrated.

In React 19, the second render of a component reuses the `useMemo` and `useCallback` results from the first one, so memoized values stay the same object across the two passes.

Why does React do this on purpose? If your code is pure, calling it twice gives the same answer, and you never notice. If it is not pure, the second call shows the problem now, on your laptop, instead of in production under load. The extra effect cycle does the same for effects: if an effect has no cleanup, or the cleanup is wrong, you see it at once.

Let us look at the real order for a small tree.

```jsx
import { StrictMode, useEffect, useState } from 'react'

function Child() {
  console.log('Child render')
  return <p>child</p>
}

function App() {
  const [n] = useState(() => {
    console.log('useState initializer')
    return 0
  })
  console.log('App render')
  useEffect(() => {
    console.log('effect setup')
    return () => console.log('effect cleanup')
  }, [])
  return (
    <div>
      {n}
      <Child />
    </div>
  )
}

// StrictMode around <App /> in main.jsx
```

On mount, without StrictMode:

```text
useState initializer
App render
Child render
effect setup
```

On mount, with StrictMode (development):

```text
useState initializer
useState initializer
App render
App render
Child render
Child render
effect setup
effect cleanup
effect setup
```

**What happens, step by step:**
1. React calls `App`. In this first call it runs the `useState` initializer twice (a purity check) and then the body.
2. It calls `App` a second time, reusing the hook state from the first call, so the initializer does not run again.
3. It does the same for `Child`: two calls.
4. The commit happens once. The DOM is created once.
5. React runs the effect, then simulates a leave-and-return: cleanup, then setup again. This is the "mount, unmount, mount" check.

Facts to remember:
- The doubling is **development only**. We ran the same tree with `NODE_ENV=production` and every extra call disappeared.
- Only one set of DOM nodes is built. React uses the result of one of the two calls and ignores the other.
- Without React DevTools both `console.log` calls show. DevTools dims the second one.
- StrictMode applies to the tree below it. You cannot switch it off for one component.
- Treat a double-render surprise as a bug report from React, not as something to work around.

For the effect side of StrictMode (fetching, subscriptions, cleanup), see [useEffect](../02-hooks/03-useeffect.md).

**Common mistake:** a side effect inside a state initializer.

```jsx
// WRONG: registerUser() runs twice in development
const [id] = useState(() => {
  registerUser()
  return 1
})
```

```jsx
// RIGHT: side effects belong in an effect or an event handler
const [id] = useState(1)
useEffect(() => {
  registerUser()
  return () => unregisterUser()
}, [])
```

Why: initializers and updaters must be pure, so React is allowed to call them more than once.

## 6. Step 3: the commit phase

After the render phase, React knows what must change. In the commit phase it makes those changes. The commit is **not** pure. It writes to the DOM and runs your effects. It runs in one go, so users never see a half-finished update.

The commit has these parts, in this order:

1. **Change the DOM.** React creates, updates and removes DOM nodes. It only touches what differs. It also detaches old refs and runs the cleanups of old layout effects.
2. **Switch trees.** React marks the new tree as the current one (section 8).
3. **Layout phase.** React attaches refs, then runs layout effects (`useLayoutEffect`). The DOM is updated now, so you can measure it. Children run before parents.
4. **The browser paints.** This is the browser's job, not React's.
5. **Passive effects.** React runs the cleanups of old `useEffect` calls, then the new setups. Children run before parents.

```text
RENDER PHASE (pure, can be redone)      COMMIT PHASE (runs in one go)
------------------------------------    ------------------------------------------------
call components                         1. change the DOM, detach old refs
build the new element tree              2. switch the current tree
find the differences                    3. attach refs, run layout effects (children first)
Nothing visible changes.                ------------- the browser paints -------------
                                        4. run passive effects: useEffect (children first)
```

You can see the order in the section 1 log: layout effects, then passive effects. A short test confirms the ref rule:

```jsx
import { useLayoutEffect, useRef } from 'react'

export default function Box() {
  const ref = useRef(null)
  console.log('during render:', ref.current)
  useLayoutEffect(() => {
    console.log('in layout effect:', ref.current.tagName)
  })
  return <div ref={ref}>box</div>
}
```

```text
during render: null
in layout effect: DIV
```

**What happens, step by step:**
1. In the render phase the `<div>` does not exist yet, so the ref is `null`.
2. In the commit, React creates the `<div>` and puts it in the page.
3. React attaches the ref. Then it runs the layout effect, which now sees the real node.

This is why you read DOM refs in effects and event handlers, never in render.

About `useEffect` timing: React tries to run passive effects after the browser paints, so painting is not delayed. That is a goal, not a promise. If the update came from a discrete event such as a click, React may run them earlier. Only layout effects are guaranteed to run before paint. If your effect must run before the user sees the screen (for example to measure a box and move a tooltip), use `useLayoutEffect`. See [Other hooks](../02-hooks/09-other-hooks.md). A test in jsdom cannot show paint, so this part comes from the React docs and source, not from our runs.

**Common mistake:** measuring in `useEffect`, which can cause a flicker.

```jsx
// MAY FLICKER: the browser can paint with height 0 first, then paint again
useEffect(() => {
  setHeight(ref.current.offsetHeight)
}, [])
```

```jsx
// BETTER: measure and set state before the browser paints
useLayoutEffect(() => {
  setHeight(ref.current.offsetHeight)
}, [])
```

Why: a state update inside a layout effect is rendered and committed before the paint, so the user only sees the final result.

## 7. A render is not a DOM update

This is one of the most common interview questions, so test it with your own eyes.

```jsx
import { useReducer } from 'react'

export default function Page() {
  const [, forceRender] = useReducer((x) => x + 1, 0)
  return (
    <div>
      <h1>Hello Ada</h1>
      <button onClick={forceRender}>Render again</button>
    </div>
  )
}
```

We watched the DOM with a `MutationObserver` (a browser tool that reports every DOM change), clicked "Render again" once, and got:

```text
component function ran 2 times in total (1 mount + 1 re-render)
DOM changes: none
same h1 node: true
```

The component rendered. The DOM was not touched. Not even the `<h1>` node was replaced.

Now a component where one value changes:

```jsx
import { useState } from 'react'

export default function Ticker() {
  const [ticks, setTicks] = useState(0)
  return (
    <div>
      <h1>Hello Ada</h1>
      <p>Ticks: {ticks}</p>
      <button onClick={() => setTicks(ticks + 1)}>Tick</button>
    </div>
  )
}
```

After one click the observer reported one change: the text of the `ticks` text node became `"1"`. The `<h1>` was the same node as before.

Changing an attribute works the same way. For `<div className={on ? 'box on' : 'box'} title="same">` only the `class` attribute was written. The `title` was left alone.

Typing is also safe. We typed `my draft` into an uncontrolled `<input>`, re-rendered the parent, and the input still held `my draft`. It was the same node. React never replaced it.

**What happens, step by step:**
1. The render phase calls the component and gets a new description.
2. React compares the new description with the last one, element by element.
3. If an element is identical, React does nothing for it.
4. Only the differences go into the commit.

So "the component re-rendered" tells you React ran your function. It does not tell you the page changed. A re-render with identical output is wasted CPU time, not a wrong screen. That is the reason we reduce needless renders in [Performance optimization](02-performance-optimization.md). And it is the reason you should not say "re-render means DOM update" in an interview.

To see real DOM changes, use a `MutationObserver` in a test (practice item 10), or watch the Elements panel in Chrome, which briefly flashes a node when it changes. React DevTools' "Highlight updates" shows which components rendered, which is a different thing.

**Common mistake:** "Every re-render is slow because React rebuilds the page."

```text
WRONG: render = React rebuilds the page
RIGHT: render = React calls my function and compares the result; the page changes only where it differs
```

Why: if rendering rebuilt the page, the typed text in the input above would have been lost. It was kept.

## 8. What the "virtual DOM" and Fiber really are

You have now seen both ingredients of the "virtual DOM". The phrase names an **idea**: React keeps a lightweight description of the UI in memory and uses it to update the real DOM. There is no `VirtualDOM` object you can import. In practice it is two things.

**1. React elements.** The objects your JSX creates (section 3). They are cheap, plain, and thrown away after each render. They describe the UI. They hold no state.

**2. The Fiber tree.** React's own bookkeeping. React makes one **fiber** for each component instance and each DOM element. A fiber is a JavaScript object that lives across renders. Its main fields:

| Field | What it holds |
|---|---|
| `type` and `key` | Which component or tag it is, and its key |
| `stateNode` | The real DOM node (for a DOM tag) |
| `child`, `sibling`, `return` | Links to the first child, the next sibling and the parent |
| `memoizedProps` and `memoizedState` | The props from the last render, and the state. For function components `memoizedState` is the list of hooks |
| `flags` | What the commit must do for it: place, update, delete |
| `lanes` | The priority of pending work |
| `alternate` | The twin fiber (see below) |

```text
App
 |  child
 v
Header --sibling--> List --sibling--> Footer
                    |  child
                    v
                  Item --sibling--> Item

(every fiber also points up to its parent with "return")
```

Because fibers are linked by pointers and not by function calls on the JavaScript stack, React can stop in the middle of the tree and continue later. That is the main reason Fiber exists (section 17).

React keeps **two** fiber trees. The **current** tree is what is on screen now. The **work-in-progress** tree is the one being built in the render phase. Each fiber has an `alternate` that points to its twin in the other tree, and React reuses the twins from one render to the next. When the commit finishes writing to the DOM, React flips a pointer and the work-in-progress tree becomes the current one. It is like a game drawing the next frame off screen and then swapping it in.

```text
                      before the update     during the render phase     after the commit
 current tree         A (on screen)         A (still on screen)         A' (on screen now)
 work-in-progress     A' (old twin)         A' (being built)            A (spare, reused next time)
```

Hooks live here too. The state of a component is not inside your function. It is stored on the fiber as a linked list, in the order you called the hooks. React finds `useState` number 2 by position. That is the whole reason for the Rules of Hooks (always call hooks in the same order). The full story is in React internals deep dive (planned).

**Is the virtual DOM why React is fast?** Be honest here. Building and comparing objects costs time. Hand-written DOM code for one specific update can be faster than any framework. What the virtual DOM buys you is a simple programming model: you describe the screen for the current state, and React works out the DOM changes. React also avoids touching the DOM when nothing changed, and it batches updates. That is the real gain. Some other frameworks skip a virtual DOM and update the DOM in other ways, so the virtual DOM is a design choice, not a requirement for speed.

A weak answer and a strong answer:

```text
WEAK:   "The virtual DOM is a copy of the DOM. DOM is slow, so React uses a copy to be fast."
STRONG: "JSX returns plain objects (elements) that describe the UI. React compares the new
         tree with the previous one and commits only the differences to the real DOM. That
         keeps my code declarative and avoids needless DOM writes. It is not free, so I still
         avoid needless renders."
```

**Common mistake:** thinking the virtual DOM is a second copy of the whole page that React keeps in sync.

```text
WRONG: React keeps a full copy of the page's HTML
RIGHT: React keeps elements (descriptions) and fibers (bookkeeping with state and links)
```

Why: the old tree is not "HTML". It is fibers that carry props, state, effects and priorities.

## 9. Reconciliation: how React compares two trees

**Reconciliation** is the comparing step. React takes the tree from the last render and the tree from this render and decides, for every piece: keep it, update it, create it or remove it. People also call it **diffing**. It happens during the render phase. The DOM writes that follow happen in the commit.

Comparing two arbitrary trees perfectly is far too slow. So React makes two assumptions that let it do it in one walk down the tree:

1. **Two elements of different types give different trees.** Do not bother comparing inside them.
2. **A key tells React which children are the same across renders.** (Section 10.)

From these come the rules. React looks at each **position** in the tree. A position is a slot, like "the first child of this `div`".

| At one position, last render vs this render | React does |
|---|---|
| Same type (and same key) | **Keeps** the DOM node or the component instance and its state. Updates the props. For a DOM tag, only the attributes that changed are written |
| Different type | **Tears down** the old subtree (state lost, DOM removed, effect cleanups run). **Builds** a new subtree from nothing |
| A position that exists now but not before | Creates it |
| A position that existed before but not now | Removes it |

Then React goes into the children and repeats the rules.

Here is the first rule in action. Both branches render a `Counter`, so it is the same type in the same position:

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

export default function App() {
  const [showB, setShowB] = useState(false)
  return (
    <div>
      {showB ? <Counter label="B" /> : <Counter label="A" />}
      <button onClick={() => setShowB(!showB)}>Swap</button>
    </div>
  )
}
```

Click the counter once (`A: 1`), then click Swap:

```text
before Swap:  A: 1
after Swap:   B: 1
```

**What happens, step by step:**
1. At the first position the old element was `<Counter label="A" />` and the new one is `<Counter label="B" />`.
2. The type is the same (`Counter`), so React keeps the existing instance, with its state `1`.
3. It only gives it the new prop `label="B"`.
4. The result is `B: 1`. It looks like a different counter, but React sees one counter with a new label.

Now the second rule. Wrap the counter in different tags:

```jsx
{showB ? <section><Counter label="A" /></section> : <div><Counter label="A" /></div>}
```

Click the counter once, then Swap:

```text
before Swap:  A: 1
after Swap:   A: 0
```

`div` and `section` are different types at the same position. React tears down the whole subtree and builds a new one, so the state is gone.

The tree below shows the second case:

```text
 last render             this render
 <div>                   <section>            different type at the root of this branch
   <Counter A />           <Counter A />      so the whole old branch is removed
                                              and a new one is created, state starts at 0
```

State is not stored in your function and not in the DOM. React stores it on the fiber, which belongs to a position in the tree. Same type at the same position keeps the fiber. Anything else makes a new fiber.

**Common mistake:** defining a component inside another component.

```jsx
// WRONG: Inner is a NEW function on every render of Parent,
// so React sees a different type every time and remounts it
function Parent() {
  const [tick, setTick] = useState(0)

  function Inner() {
    const [n, setN] = useState(0)
    return <button onClick={() => setN(n + 1)}>inner: {n}</button>
  }

  return (
    <div>
      <Inner />
      <button onClick={() => setTick(tick + 1)}>Re-render parent ({tick})</button>
    </div>
  )
}
```

```jsx
// RIGHT: define it once at the top level
function Inner() {
  const [n, setN] = useState(0)
  return <button onClick={() => setN(n + 1)}>inner: {n}</button>
}

function Parent() {
  const [tick, setTick] = useState(0)
  return (
    <div>
      <Inner />
      <button onClick={() => setTick(tick + 1)}>Re-render parent ({tick})</button>
    </div>
  )
}
```

Why: we ran the wrong version. Click the inner button once (`inner: 1`), then re-render the parent: the text goes back to `inner: 0` and the DOM node is a new one. A function created inside a render is a new function each time, which React reads as a new type.

## 10. Keys: identity for list items

A list is the hard case for diffing. Items can be added, removed or moved. If React only had positions to go on, it could not tell "Bob moved up" from "the first row now shows Bob". A **key** is an identity card. It tells React which item is which across renders.

- Same key as last time: the **same item**. Keep its DOM node and state. Update its props.
- A key that is new: a **new item**. Create it.
- A key that is gone: **removed**. Destroy it, with its state.

Here is a list where every row has an uncontrolled `<input>` (React does not control its text, so the browser keeps it). We type `typed-in-Ada` into Ada's input, and then change the list. We run it twice: once with index keys, once with id keys.

```jsx
import { useState } from 'react'

const initial = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Cy' },
]

export default function Notes({ byIndex }) {
  const [people, setPeople] = useState(initial)
  return (
    <div>
      <button onClick={() => setPeople(people.slice(1))}>Remove first</button>
      <button onClick={() => setPeople([...people].reverse())}>Reverse</button>
      <ul>
        {people.map((person, index) => (
          <li key={byIndex ? index : person.id}>
            {person.name} <input aria-label={`note for ${person.name}`} />
          </li>
        ))}
      </ul>
    </div>
  )
}
```

What each row's input holds afterwards (the text in brackets is the input value):

| Action | `key={index}` | `key={person.id}` |
|---|---|---|
| Start | Ada=[typed-in-Ada] Bob=[] Cy=[] | Ada=[typed-in-Ada] Bob=[] Cy=[] |
| Remove first | Bob=[**typed-in-Ada**] Cy=[] | Bob=[] Cy=[] |
| Reverse | Cy=[**typed-in-Ada**] Bob=[] Ada=[] | Cy=[] Bob=[] Ada=[typed-in-Ada] |

With index keys the typed text stays in the **row**, not with the **person**. Bob suddenly owns Ada's note. With id keys the text follows Ada.

The same bug hits state inside child components. We gave each row a "liked" toggle, liked Ada, and removed Ada: with index keys the list became `Bob liked | Cy not liked`. With id keys it was `Bob not liked | Cy not liked`.

**What happens, step by step (remove the first item):**
1. Index keys. Before: key 0 is Ada, key 1 is Bob, key 2 is Cy. After: key 0 is Bob, key 1 is Cy.
2. React matches by key. Key 0 exists in both lists, same type, so it **keeps row 0** and only changes the text from "Ada" to "Bob". The input in row 0 is kept, with Ada's typed text.
3. Key 1 is also kept and gets "Cy". Key 2 is gone, so the last row is removed.
4. Id keys. Before: keys 1, 2, 3. After: keys 2, 3. Key 1 is gone, so **Ada's row is removed** with its input and state. Rows 2 and 3 are untouched.

```text
index keys                                  id keys
before: [0 Ada] [1 Bob] [2 Cy]              before: [1 Ada] [2 Bob] [3 Cy]
after:  [0 Bob] [1 Cy]                      after:  [2 Bob] [3 Cy]
React:  0 kept, text Ada -> Bob             React:  1 removed (Ada and her state)
        1 kept, text Bob -> Cy                      2 kept, nothing changes
        2 removed (the last row)                    3 kept, nothing changes
```

Rules for good keys:
- **Unique among siblings.** Not unique in the whole app. Two lists can reuse the same keys.
- **Stable.** The same item must get the same key on every render. Take it from your data (a database id).
- **Not the index** when the list can be reordered, filtered, or changed at the start or in the middle.
- **Not `Math.random()`** and not a new id made during render. A new key every render means "a new item every render".
- **Created with the item.** If your data has no ids, make one when the item is created, in the event handler (`crypto.randomUUID()` or a counter), and store it with the item.
- **Not a prop.** `key` is read by React and not passed to your component. In the child, `props.key` is `undefined`, and React logs that `key` is not a prop. Pass the value again under another name (such as `id`) if the child needs it.
- To give a **group** of elements a key, use `<Fragment key={id}>...</Fragment>`. The short `<>` form cannot take a key.

```jsx
import { Fragment } from 'react'

{terms.map((item) => (
  <Fragment key={item.id}>
    <dt>{item.term}</dt>
    <dd>{item.meaning}</dd>
  </Fragment>
))}
```

React helps you in development. A list without keys logs `Each child in a list should have a unique "key" prop.` Two siblings with the same key log `Encountered two children with the same key`. (React prints each of these once, not on every render.)

When is an index key acceptable? When the list is static: it is never reordered, filtered, or edited in the middle, and the rows hold no state or uncontrolled inputs. A fixed list of menu links is an example. When in doubt, use an id.

**Common mistake:** a new key on every render.

```jsx
// WRONG: every row is destroyed and rebuilt on every render
{items.map((item) => <Row key={Math.random()} item={item} />)}
```

```jsx
// RIGHT
{items.map((item) => <Row key={item.id} item={item} />)}
```

Why: a new key means a new identity, so React unmounts the old row (state, focus and typed text lost) and mounts a new one. In a check with React 19.3.1, a row's mount effect ran again after every parent re-render.

## 11. Resetting state with a key

A key is not only for lists. You can put one on any element. When its key changes, React treats it as a different element: it removes the old one, with its state and DOM, and builds a new one. That is the clean way to reset a component.

```jsx
import { useEffect, useState } from 'react'

function Counter({ name }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    console.log('Counter mounted')
    return () => console.log('Counter unmounted')
  }, [])
  return (
    <button onClick={() => setN(n + 1)}>
      {name}: {n}
    </button>
  )
}

export default function App() {
  const [id, setId] = useState(1)
  return (
    <div>
      <Counter key={id} name={`user ${id}`} />
      <button onClick={() => setId(id + 1)}>Next user</button>
    </div>
  )
}
```

Click the counter twice (`user 1: 2`), then click "Next user". The log shows `Counter unmounted`, then `Counter mounted`, and the button reads `user 2: 0`.

**What happens, step by step:**
1. `id` changes from 1 to 2, so the key of the `Counter` element changes.
2. Same type, but a different key. React does not match the old fiber with the new element.
3. It removes the old `Counter`: its effect cleanup runs and its state is dropped.
4. It creates a new `Counter` with fresh state `0`.

This is the answer to "how do I reset a component when a prop changes?" without an effect. Section 12 of [useState in depth](../02-hooks/02-usestate-in-depth.md) covers the same trick for forms.

**Common mistake:** copying a prop into state and expecting it to follow the prop.

```jsx
// WRONG: the draft is copied once. Pick another user and the old draft stays.
function Editor({ user }) {
  const [draft, setDraft] = useState(user.name)
  return <input value={draft} onChange={(e) => setDraft(e.target.value)} />
}

<Editor user={user} />
```

```jsx
// RIGHT: a different user gives a different key, so Editor starts fresh
<Editor key={user.id} user={user} />
```

Why: `useState(user.name)` uses its argument only on the first render of that instance. We ran both versions. After typing `!` and picking Bob, the wrong version still showed `Ada!`. With the key it showed `Bob`.

## 12. State is a snapshot, and updates wait in a queue

Now back to the trigger. What exactly happens inside a `setCount` call? This also explains the batching in section 13.

**State is a snapshot.** Each render gets its own values of `count`, `props` and every function created in it. They never change during that render. The click handler you wrote in render number 3 sees the values of render number 3, even if it runs later.

**Updates wait in a queue.** Each `useState` has its own queue. `setCount(x)` does not change `count`. It puts a note in the queue ("replace with x", or "call this function") and asks React to render. In the next render, React takes the state it had, replays the notes in order, and the result is the state for that render.

```jsx
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  function addThreePlain() {
    setCount(count + 1)
    setCount(count + 1)
    setCount(count + 1)
    console.log('right after the three calls, count is still', count)
  }

  function addThreeUpdaters() {
    setCount((c) => c + 1)
    setCount((c) => c + 1)
    setCount((c) => c + 1)
  }

  return (
    <div>
      <p>count: {count}</p>
      <button onClick={addThreePlain}>plain x3</button>
      <button onClick={addThreeUpdaters}>updater x3</button>
    </div>
  )
}
```

Click "plain x3" once: the log says `count is still 0` and the screen shows `count: 1`. Then click "updater x3" once: the screen shows `count: 4`.

**What happens, step by step:**
1. In "plain x3", `count` is `0` for the whole handler. The queue gets three notes: "replace with 1", "replace with 1", "replace with 1".
2. React replays them: 0 becomes 1, then 1, then 1. The result is `1`. Three notes, one effect.
3. In "updater x3" the notes are functions. React calls the first with `1` (the current state), gets `2`, calls the second with `2`, and so on. The result is `4`.

A plain value **replaces** what came before. An updater **builds on** it. You can mix them. Starting at 0, `setN(n + 5); setN(x => x + 1); setN(42)` gives `42`:

| Note in the queue | What it means | State after |
|---|---|---|
| (start) | | 0 |
| `setN(n + 5)` | replace with 5 (`n` was 0 in this snapshot) | 5 |
| `setN(x => x + 1)` | call the function with 5 | 6 |
| `setN(42)` | replace with 42 | 42 |

The snapshot rule also catches code that runs later. A timer created in a handler keeps the values of that render:

```jsx
function handleClick() {
  setCount(count + 1)
  setTimeout(() => setMessage('timer saw count = ' + count), 1000)
}
```

We clicked once from `count = 0` and waited one second. The screen showed `count: 1` and the message `timer saw count = 0`. The timer function belongs to the old render, so it reads the old `count`.

One more thing. Because React may call an updater function more than once (StrictMode does), updaters must be pure. We counted the calls for one click: 1 in a normal tree and 2 inside StrictMode.

So "is `setState` async?" has this precise answer: the call returns at once and changes nothing in the running code. The update is queued, and React applies it in the next render. See [useState in depth](../02-hooks/02-usestate-in-depth.md) for more on updaters and stale closures.

**Common mistake:** using the old value to compute something right after the call.

```jsx
// WRONG: count is still the old value
setCount(count + 1)
sendAnalytics(count)
```

```jsx
// RIGHT: calculate once, use twice
const next = count + 1
setCount(next)
sendAnalytics(next)
```

Why: `count` is a snapshot. The new value exists only as the variable you calculate yourself.

## 13. Batching: many updates, one render

**Batching** means React collects the state updates that happen close together and processes them in **one** render. It does not render in the middle of your code. It waits until the current piece of JavaScript finishes, then handles the whole queue.

Why? Two reasons. It saves work (one render, not three). And it avoids showing half-updated screens, such as a new first name next to an old last name.

Since React 18, batching is **automatic** everywhere. Before React 18, only updates inside React event handlers were batched. Updates inside a `setTimeout`, a promise callback or a native event listener caused one render per `setState`. That is no longer true.

```jsx
import { useState } from 'react'

export default function Batching() {
  const [a, setA] = useState(0)
  const [b, setB] = useState(0)
  console.log('render', a, b)

  function bump() {
    setA((x) => x + 1)
    setB((x) => x + 1)
    setA((x) => x + 1)
  }

  return (
    <div>
      <button onClick={bump}>React click handler</button>
      <button onClick={() => setTimeout(bump, 0)}>setTimeout</button>
      <button onClick={() => Promise.resolve().then(bump)}>Promise</button>
      <p>
        {a} - {b}
      </p>
    </div>
  )
}
```

Each button, clicked once, printed exactly one `render` line, even though `bump` makes three updates:

```text
render 2 1
render 4 2
render 6 3
```

We also counted renders for the same kind of updates in other places (React 19.3.1, a real root):

| Where the updates happen | Renders |
|---|---|
| Inside a React `onClick` | 1 |
| Inside a `setTimeout` callback | 1 |
| Inside a promise `.then` callback | 1 |
| Inside a native `addEventListener` callback | 1 |
| Two pairs of updates with `await null` between them | 1 |
| One update, `await` a 10 ms timer, then more updates | 2 |
| Two separate `flushSync` calls | 2 |

**What happens, step by step:**
1. The first `setA` puts a note in the queue and tells React "please render soon". React plans one render task.
2. The next `setB` and `setA` put more notes in the queue. The task is already planned, so nothing new is planned.
3. Your code ends. React runs the planned task. It replays all the notes and renders once.
4. In the timer case, `await` a 10 ms timer lets React run its task first. The later updates start a new batch, so the render count is 2.

For a click, React renders and commits right after your handler returns, before the browser handles the next event. In our check, the DOM still had the old text on the line after `button.click()`. One microtask later it had the new text.

**Common mistake:** relying on the React 17 rules, or thinking you must batch by hand.

```jsx
// OLD ADVICE, not needed in React 18 and 19
import { unstable_batchedUpdates } from 'react-dom'
unstable_batchedUpdates(() => {
  setA(1)
  setB(2)
})
```

```jsx
// RIGHT: just call the setters
setA(1)
setB(2)
```

Why: batching is automatic now. If you ever need the opposite, an immediate render, that is `flushSync` (section 16).

## 14. When do children re-render?

The rule that surprises most people: **when a component renders, all the components it returns render too**, even if their props did not change.

```jsx
function Child() {
  console.log('Child render')
  return <p>child</p>
}

function Parent() {
  const [n, setN] = useState(0)
  console.log('Parent render')
  return (
    <div>
      <button onClick={() => setN(n + 1)}>rerender</button>
      <Child />
    </div>
  )
}
```

After one click, both lines print again: `Parent render`, then `Child render`. `Child` has no props at all. React does not ask "did anything change for you?". It asks "did your parent hand me a new props object?". And a parent that renders always creates new elements, so it always hands over new props objects.

Three tools change that. Here is a parent with five kinds of child, after one parent re-render:

```jsx
import { memo, useState } from 'react'

function Plain() {
  return <p>plain</p>
}
const MemoNoProps = memo(function MemoNoProps() {
  return <p>memo, no props</p>
})
const MemoInline = memo(function MemoInline({ style }) {
  return <p style={style}>memo, inline object</p>
})
const MemoStable = memo(function MemoStable({ style }) {
  return <p style={style}>memo, stable object</p>
})
const MemoChildren = memo(function MemoChildren({ children }) {
  return <div>{children}</div>
})

const stable = { color: 'green' }

export default function Parent() {
  const [n, setN] = useState(0)
  return (
    <div>
      <button onClick={() => setN(n + 1)}>tick {n}</button>
      <Plain />
      <MemoNoProps />
      <MemoInline style={{ color: 'red' }} />
      <MemoStable style={stable} />
      <MemoChildren>
        <span>child</span>
      </MemoChildren>
    </div>
  )
}
```

Extra renders after one click, as we measured them:

| Component | Extra renders | Why |
|---|---|---|
| `Parent` | 1 | Its own state changed |
| `Plain` | 1 | Not memoized: it renders whenever its parent does |
| `MemoNoProps` | 0 | `memo` compares props. There are none, so they are equal |
| `MemoInline` | 1 | `{ color: 'red' }` is a **new object** every render, so the prop differs |
| `MemoStable` | 0 | The same `stable` object each time, so the prop is equal |
| `MemoChildren` | 1 | `<span>child</span>` is a **new element** every render, so `children` differs |

**What happens, step by step:**
1. `Parent` renders and creates new elements for all five children. Each element has a new props object.
2. For `Plain`, React sees a new props object, so it calls `Plain`.
3. For a `memo` component, React instead compares the old and new props **one by one with `Object.is`** (a shallow comparison). If all are equal, it skips the component and its whole subtree.
4. A new inline object, array, function or JSX element is never equal to the old one, even with the same content. That is why `MemoInline` and `MemoChildren` still render.

This gives you three ways to stop wasted renders, in order of preference:

**1. Move state down.** Put the state in the smallest component that needs it. A search box that owns its own `query` state does not re-render the chart next to it:

```jsx
function SearchBox() {
  const [query, setQuery] = useState('')
  return <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
}

function Page() {
  return (
    <div>
      <SearchBox />
      <SlowChart />
    </div>
  )
}
```

**2. Pass content as `children`.** Elements created by a component above are the same object on every render of the wrapper:

```jsx
function Wrapper({ children }) {
  const [n, setN] = useState(0)
  return (
    <div>
      <button onClick={() => setN(n + 1)}>wrapper tick {n}</button>
      {children}
      <Sibling />
    </div>
  )
}

function App() {
  return (
    <Wrapper>
      <Inside />
    </Wrapper>
  )
}
```

When `Wrapper` re-rendered, `Sibling` rendered once more and `Inside` rendered **zero** more times. `<Inside />` was created by `App`, and `App` did not render, so React received the same element object with the same props object and skipped it. `<Sibling />` is created inside `Wrapper`, so it is new each time.

**3. `React.memo`, `useMemo`, `useCallback`.** Use them when the first two do not fit, and keep the props stable. [Memoization](../02-hooks/07-memoization.md) covers when this is worth it. React Compiler can add much of this skipping for you at build time, but you still need this mental model to know what it does.

Two more things that cause renders below a provider: a **context** consumer renders whenever the `value` of its provider changes (compared with `Object.is`), even through a `memo` boundary, and there is no way to subscribe to only one field. See [useContext](../02-hooks/05-usecontext.md).

**Common mistake:** thinking `useCallback` stops a normal child from rendering.

```jsx
// WRONG: Child is not wrapped in memo, so it renders on every parent render anyway
const handleSave = useCallback(() => save(id), [id])
return <Child onSave={handleSave} />
```

```jsx
// RIGHT: the stable function only helps a child that compares its props
const Child = memo(function Child({ onSave }) {
  return <button onClick={onSave}>Save</button>
})
```

Why: `useCallback` only keeps a function's identity. The skipping is done by `memo`. We checked: a plain child given a stable `useCallback` function still re-rendered.

## 15. How React decides what to update: the whole flow

You can now put the pieces together. This is the answer to "how does React decide what to update?".

```text
For every component React visits during a render:

  own state update queued?  ........... yes -> call the component
  a context it reads changed? ......... yes -> call the component
  props object different from last time? yes -> call the component (memo: only if a prop differs)
  none of the above ................... skip it and its subtree
                                        (but still visit any descendant that has its own update)

After calling a component, compare the elements it returned with last time:
  same type and same key  -> keep the fiber, state and DOM node; update the props
  different type or key   -> remove the old subtree; create the new one

For DOM tags, compare attributes and text, and note only the real differences.

Commit: apply only the noted differences to the DOM, then run effects.
```

One detail interviewers like: **setting the same value**. React compares the new state with the old using `Object.is`. If they are equal, it bails out: no children, no effects, no DOM work. We counted how often the component functions ran:

```text
setN(0) when n is already 0:   Parent +0, Child +0
setN(1) (a real change):       Parent +1, Child +1
setN(1) again, right after:    Parent +1, Child +0
setN(1) a third time:          Parent +0, Child +0
```

On the "again" line React called `Parent` once more, found the state unchanged and stopped before touching `Child`, effects or the DOM. React cannot always prove up front that the queue is empty, so it sometimes calls the function to check. The React docs say this extra call should not matter, and it does not when your render is pure. It is one more reason to keep renders pure.

## 16. `flushSync`: render now, not later

Sometimes you need the DOM to be updated on the very next line. `flushSync` (from `react-dom`) forces React to render and commit the updates inside its callback right away, and not batch them for later.

The classic case: add an item to a list, then scroll to it.

```jsx
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'

export default function Tasks() {
  const [tasks, setTasks] = useState([{ id: 0, text: 'Task 0' }])
  const listRef = useRef(null)

  function addPlain() {
    const id = tasks.length
    setTasks([...tasks, { id, text: `Task ${id}` }])
    console.log('items in the DOM right after setTasks:', listRef.current.children.length)
  }

  function addSync() {
    const id = tasks.length
    flushSync(() => {
      setTasks([...tasks, { id, text: `Task ${id}` }])
    })
    console.log('items in the DOM right after flushSync:', listRef.current.children.length)
    listRef.current.lastChild.scrollIntoView() // now the last child is the NEW item
  }

  return (
    <div>
      <button onClick={addPlain}>add plain</button>
      <button onClick={addSync}>add sync</button>
      <ul ref={listRef}>
        {tasks.map((task) => (
          <li key={task.id}>{task.text}</li>
        ))}
      </ul>
    </div>
  )
}
```

We started with one item. "add plain" logged `1` (the old count; the page had two items after the handler ended). "add sync" then logged `3`: the new item was already in the DOM on the next line.

**What happens, step by step:**
1. In `addPlain`, `setTasks` queues an update. The handler continues with the old DOM. The new item appears after the handler ends.
2. In `addSync`, `flushSync` runs the callback, then renders and commits at once, before it returns.
3. The next line sees the updated DOM, so `lastChild` is the new item and `scrollIntoView` scrolls to it.

Rules:
- `flushSync` **opts out of batching**. Two `flushSync` calls give two renders (we counted 2). Use it rarely.
- It can hurt performance, because it forces work React would otherwise combine or delay. It can also force a pending Suspense boundary to show its fallback.
- Do not call it during render. Inside an effect it works but logs a warning that it was called from inside a lifecycle method.
- Reach for it only when you must read the DOM or run non-React code right after an update, such as scrolling, focusing or a third-party library. For most "after the update" work an effect is the better tool.

**Common mistake:** using `flushSync` to see the new state value.

```jsx
// WRONG: flushSync does not change the variable `count` in this function
flushSync(() => setCount(count + 1))
console.log(count) // still the old value
```

```jsx
// RIGHT: state is a snapshot, so compute the value yourself
const next = count + 1
setCount(next)
console.log(next)
```

Why: `flushSync` updates the DOM, not the variables in your running function. A snapshot never changes.

## 17. Can a render be interrupted?

Yes, for some updates. This is the idea behind **concurrent rendering**, and it is why the render phase must be pure.

React splits updates into urgent ones (typing, clicking) and non-urgent ones (a transition, a deferred value, a Suspense retry). The render phase of a **non-urgent** update is done in small slices. After a slice of about 5 ms, React hands control back to the browser so it can react to the user. If an urgent update arrives, React can **abandon** the half-finished render, handle the urgent one first, and then start the non-urgent render again from the top.

The **commit** is never interrupted. React applies all the DOM changes of one render in one go.

We can watch this. Forty rows, each slow, are rendered in a transition. A click arrives while it is half done:

```jsx
startTransition(() => setQuery('slow')) // non-urgent: renders 40 slow rows
// ... 20 ms later, the user clicks and an urgent update happens:
setText('clicked')
```

The log, with the first and last row of each pass:

```text
--- start a transition for q="slow"
App render: text="" q="slow"
Row 0 rendered for query "slow"            <- the transition started...
--- a click arrives while the transition is rendering
App render: text="clicked" q=""            <- ...but the click is handled first,
Row 0 rendered for query ""                   with the OLD transition state
Row 39 rendered for query ""
App render: text="clicked" q="slow"        <- then the transition starts again
Row 0 rendered for query "slow"
Row 39 rendered for query "slow"           <- and this time it finishes
```

Notice that `Row 39` was never rendered for `"slow"` in the first attempt. That pass was thrown away.

**What happens, step by step:**
1. The transition starts. React renders `App` and the first rows, in slices.
2. The click arrives. A click is an urgent update, so it has higher priority.
3. React drops the half-built tree. Nothing was written to the DOM.
4. It renders the click's update. The transition state is still the old one (`q=""`), and commits.
5. It restarts the transition and, this time, finishes and commits.

What can be interrupted, in our checks:

| Update | Can its render be paused or abandoned? |
|---|---|
| A transition (`startTransition`, `useTransition`) | Yes |
| The background render of `useDeferredValue` | Yes |
| A normal `setState` in a click handler | No, it renders to the end |
| A normal `setState` in a `setTimeout` | No, it renders to the end |

Also, a click interrupts a running transition, but a plain `setState` from a timer does not. It waits for the transition to finish.

The lesson for your code: **a component may run and its result may never be used.** If a render had side effects (a network call, a log to analytics, a changed global), they would happen for work that React threw away. Pure renders make this safe. Effects and DOM writes only happen in the commit, which is never thrown away. For the APIs that start non-urgent work, see [Concurrent React and Suspense](03-concurrent-react-and-suspense.md). For the scheduler and the priority system, see React internals deep dive (planned).

**Common mistake:** a side effect in the render body.

```jsx
// WRONG: this may run for a render that React then throws away
function Product({ id }) {
  analytics.track('product viewed', id)
  return <h1>Product {id}</h1>
}
```

```jsx
// RIGHT: effects run after a render was committed
function Product({ id }) {
  useEffect(() => {
    analytics.track('product viewed', id)
  }, [id])
  return <h1>Product {id}</h1>
}
```

Why: only the commit is certain. A rendered but abandoned tree never reaches the effects.

## 18. How to observe renders

You cannot fix what you cannot see. Use these tools, from simplest to strongest.

**1. A `console.log` at the top of the component.** The simplest tool, and good enough to answer "did this render, and in what order?".

```jsx
function Child({ name }) {
  console.log('Child render:', name)
  return <p>{name}</p>
}
```

In a StrictMode development app every line prints twice. Count the pairs, or look at DevTools, which dims the second line.

**2. The `<Profiler>` component.** It measures renders of the tree inside it and tells you the phase.

```jsx
import { Profiler, useState } from 'react'

function onRender(id, phase) {
  console.log(`${id}: ${phase}`)
}

function Counter() {
  const [n, setN] = useState(0)
  return <button onClick={() => setN(n + 1)}>n={n}</button>
}

export default function App() {
  return (
    <Profiler id="counter" onRender={onRender}>
      <Counter />
    </Profiler>
  )
}
```

One mount and two clicks logged `counter: mount`, `counter: update`, `counter: update`. The full callback is `onRender(id, phase, actualDuration, baseDuration, startTime, commitTime)`. The `phase` is `"mount"`, `"update"` or `"nested-update"` (an update caused by a layout effect). Profiling is off in production builds unless you use React's profiling build. Treat the numbers as timing, not as proof that the DOM changed (section 7).

**3. React DevTools.** This is the browser extension. In the Components tab, the settings (gear icon) have an option to highlight components when they render, which flashes a border around each component that rendered. In the Profiler tab you press record, use the app, and stop. You get a flame chart of every commit: which components rendered, how long each took, and which were skipped. There is also an option to record why each component rendered ("props changed", "state changed", "parent rendered"). Menu names change a little between versions, so look for these words.

**4. The browser.** The Chrome Elements panel flashes DOM nodes as they change. That is the real DOM view. React 19.2 also added React tracks to Chrome's Performance panel for the scheduler and component timings.

**5. In tests, count commits and DOM, not function calls.** Under StrictMode a component function runs twice per render, so a raw call counter doubles. Use a `Profiler` and count commits, or assert on what the user sees. Testing Library can wrap your test in StrictMode with `render(ui, { reactStrictMode: true })`.

Always measure before you "fix" a render. A component that renders often is not a problem unless it is slow or it makes something visible go wrong.

**Common mistake:** counting renders with a variable in the component.

```jsx
// WRONG: impure, and it doubles in StrictMode
let renders = 0
function Widget() {
  renders++
  return <p>{renders}</p>
}
```

```jsx
// RIGHT: log it, or use the Profiler
function Widget() {
  console.log('Widget render')
  return <p>widget</p>
}
```

Why: changing a module variable in render is a side effect (section 4). Logging is also a side effect, but a harmless one that does not change what React shows.

## 19. Putting it together: the life of one click

Here is the full picture, from click to screen. Use it as your spoken answer when an interviewer asks "what happens when I click this button and call setState?".

```text
user clicks the button
  |
  v
[event] React calls onClick(e).        The handler is a snapshot of the render it was created in.
  |   setCount(c => c + 1)             Puts an update in the queue. Marks this component as dirty.
  |   (more setState calls)            More notes in the same queue: they are batched.
  |   handler returns                  Nothing has rendered yet. The screen is still old.
  v
[trigger -> render] right after the handler, before the next event
  |   React replays the queue and calls App(), then the children that must render.
  |   The returned elements are compared with the old fibers:
  |     same type and key -> keep and update;  different -> replace;  same props object -> skip.
  |   Result: a list of DOM changes. This part is pure and could be redone.
  v
[commit] one go, never interrupted
  |   1. write the differences to the DOM (here: the text of one <p>)
  |   2. attach refs, run layout effects (children first)
  v
[the browser paints the new screen]
  v
[passive effects] useEffect cleanups of the old render, then the new setups (children first)
```

In 60 seconds, out loud: "A state update puts a note in a queue and asks React to render. React waits until my handler is done, so all updates from one event share one render. In the render phase React calls my components from the top to build a new tree of elements, and it diffs that tree against the previous one using the type and the key at each position. Render has to be pure, because React can call it twice, pause it or drop it. In the commit phase React writes only the real differences to the DOM, attaches refs, runs layout effects, then the browser paints, then `useEffect` runs. A re-render does not always change the DOM."

**Common mistake:** describing the flow as "setState changes the state and then updates the DOM".

```text
WRONG: setState -> state changes -> DOM changes
RIGHT: setState -> update queued -> render (call components, compare) -> commit (DOM, effects)
```

Why: the two missing steps, the queue and the render phase, are exactly what the questions in interviews are about.

## How interviewers test this
- **"What happens when you call setState?"** This is the favourite. A strong answer walks through trigger, queue, batching, render, diff and commit, and mentions that render is pure and that effects come after the commit. A red flag is "React re-renders the whole page" or "it updates the DOM".
- **Virtual DOM.** They want an honest answer: elements are descriptions, React diffs them and commits only differences. A red flag is "the virtual DOM is faster than the real DOM", with no mention of the cost.
- **Output prediction on state and keys.** The same component type in both branches of a ternary (state kept), a different wrapper tag (state reset), index keys with inputs, a component defined inside a component. The strong answer says "state belongs to a position and a type" before giving the result.
- **Re-render prediction.** Parent state with a plain child, a `memo` child with an inline object, content passed as `children`. The strong answer names props identity and gives the fix (move state down, pass children, stable props), and does not reach for `memo` first.
- **Batching and the snapshot.** Three `setCount(count + 1)`, a `console.log` after the setter, a `setTimeout` that reads state, two setters in a timeout. A red flag is "setState is async" with nothing more, or the React 17 rule that batching only works in event handlers.
- **Senior probes.** Why StrictMode renders twice, whether a render can be interrupted, what a Fiber is, when `flushSync` is right, and how you would find out why something re-renders (measure first, then fix).

## Interview questions and model answers

### Q1. Explain the virtual DOM. Is it why React is fast? (Easy)
The virtual DOM is an idea, not an API. When your components render, they return React elements: small plain objects that describe the UI (a type, props and children). React keeps its own internal tree of that (the Fiber tree, which also holds state and effects), compares the new elements with the previous ones, and changes only the real DOM nodes that differ. So it lets you write "this is what the screen looks like for this state" and leave the DOM work to React. It is not magic speed: creating and comparing objects costs time, and careful hand-written DOM code can beat it. React's practical wins are that it avoids needless DOM writes, batches updates, and gives you a simple model. I would say the virtual DOM is the cost of a declarative model, and React works to keep that cost low.

### Q2. What triggers a re-render in React? (Easy)
The first `root.render` starts the first render. After that, a component renders again when its own state changes (`setState` or `dispatch` with a value that is different under `Object.is`), when its parent renders (the default, even with the same props), when a context it reads changes its value, or when an outside store it subscribes to with `useSyncExternalStore` changes. "Props changed" is not an extra trigger, because props only change when a parent renders. Changing a plain variable, a ref, or mutating state triggers nothing. Setting state to the same value does nothing visible: React skips the children and effects, although it may call the component once more to check.

### Q3. Explain the render phase and the commit phase. (Medium)
Render is when React calls my components and compares the result with the last tree. It must be pure, and it does not touch the DOM, so React can pause it, redo it or throw it away. Commit is when React applies the differences to the DOM. In the commit it detaches and attaches refs and runs layout effects, which see the updated DOM and run before paint, children first. After the browser paints, React runs `useEffect` effects. Commit is not interrupted, so users never see half an update. I put side effects in event handlers or effects, never in render.

```jsx
// in render: a pure calculation
const total = items.length * price

// after the commit: work that touches the outside world
useEffect(() => {
  document.title = `Total: ${total}`
}, [total])
```

### Q4. Why do list items need keys, and why are index keys risky? (Easy)
A key tells React which item is which across renders, so it can keep the right DOM node and state for each item. Without stable keys React only has positions. With index keys, if I remove or reorder items, the state and DOM that belonged to a position stay there while the data moves. We saw it: with `key={index}`, I typed into Ada's input and removed Ada, and Bob's input held Ada's text. With `key={person.id}` it was correct. Keys must be unique among siblings and stable, so use an id from the data. An index is acceptable only for a static list with no state or inputs. `Math.random()` is wrong because it makes a new item every render.

### Q5. What is reconciliation, and how does React decide what to update? (Medium)
Reconciliation is how React compares the tree from the last render with the new one and decides what to keep, change or remove. It uses two assumptions to avoid an expensive full comparison. Elements of different types produce different trees, and keys identify children across renders. At each position: the same type and key means keep the instance and DOM node and update the props; a different type means remove the old subtree (state lost) and build a new one. For DOM tags only the changed attributes and text are marked. It also skips whole subtrees when nothing changed for them: no queued update, no context change, and the same props object. Then the commit applies only the marked changes.

### Q6. Does a parent re-render re-render all its children? How do you stop it? (Medium)
Yes, by default. A child renders when its parent renders, even with the same props, because the parent creates new elements and so new props objects. I can stop it in three ways. First, move state down into the component that needs it. Second, pass the expensive part as `children`, so the same element object arrives from above and React skips it. Third, wrap the child in `React.memo` and keep its props stable with `useMemo` and `useCallback`; an inline object or function prop breaks `memo`. I measure first. React Compiler can automate much of this, but only on code that follows the rules of React.

### Q7. Is `setState` asynchronous? Why do I see the old value right after calling it? (Easy)
The call returns at once, and it changes nothing in the running function. State is a snapshot: each render has its own values, and my handler belongs to one render. `setState` puts an update in a queue and asks React to render. React applies the queue in the next render, after my handler finishes. So `setCount(count + 1); console.log(count)` prints the old value, and even the DOM is still old on the next line. There is no promise to await. If I need the new value, I compute it first in a variable. If I need to run code after the screen updates, I use an effect. For repeated updates I use the updater form, `setCount(c => c + 1)`.

### Q8. What is batching? What changed in React 18? (Medium)
Batching means React collects state updates and renders once for all of them, instead of once per `setState`. It saves renders and avoids showing half-updated screens. Before React 18, only updates inside React event handlers were batched. Updates in a `setTimeout`, a promise or a native event listener rendered once each. Since React 18, and in 19, batching is automatic everywhere. We counted one render for three updates in a click handler, a timeout, a promise callback and a native listener. A real wait between updates, such as `await` on a timer, makes separate batches. `flushSync` is the opt-out.

### Q9. Why does a component render twice in StrictMode? (Medium)
StrictMode is a development-only check for impure code. It calls the component body, state initializers, `useMemo` callbacks, reducers and updater functions twice. If my render is pure, the second call gives the same result and I never notice. If it changes a global variable or mutates props, the output shows the bug right away. On mount it also runs each effect as setup, cleanup, setup, to catch missing cleanups. React uses the result of one of the two calls. It does nothing in production builds. The fix is to make the code pure or add the missing cleanup, not to remove StrictMode.

### Q10. Does a re-render mean the DOM was updated? (Medium)
No. A re-render means React called my component function again. After that, React compares the new elements with the old, and only differences go to the DOM. We forced a re-render of a component with identical output and watched the DOM with a `MutationObserver`: the component function ran again, zero DOM changes were reported, and the same `<h1>` node stayed in the page. When one text value changed, only that one text node was written. A needless re-render costs CPU time. It is not a wrong screen. That is why I measure before optimizing.

### Q11. Why does a component defined inside another component lose its state? When does React keep or reset state? (Medium)
State belongs to a position in the tree, tied to a component type. Same type at the same position, with the same key, keeps the state even if props differ. A different type or key resets it. A component defined inside another one is a new function on every render, so React sees a new type each time, tears down the old subtree and mounts a new one. We saw `inner: 1` go back to `inner: 0` and the DOM node being replaced. The fix is to define components at the top level of the module. I can also use `key` on purpose to reset: `<Editor key={user.id} />`.

### Q12. How do you find out why a component re-rendered? (Medium)
First I look at the trigger: did its own state change, did its parent render, or did a context value change? A `console.log` at the top of the component shows whether and in which order it rendered. In React DevTools I turn on "highlight updates" to see which components render when I interact, and I use the Profiler with "record why each component rendered" to get a reason and the time per component. Then I check the usual suspects: an inline object or function prop breaking `memo`, a context value recreated on each render, or state kept too high in the tree. I only act when the render is slow or causes a visible problem.

### Q13. What is Fiber? (Hard)
A fiber is a JavaScript object that React keeps for each component instance and DOM element. It holds the type and key, the props from the last render, the state (for a function component, the linked list of hooks), links to the parent, first child and next sibling, flags for the work the commit must do, and a priority (lanes). React keeps two fiber trees: the current one that is on screen, and a work-in-progress one that it builds during render, with each fiber linked to its twin through `alternate`. When the commit ends, the pointer flips. Because fibers are linked by pointers and not by recursive calls, React can pause, resume or abandon the render phase. That is what makes concurrent rendering possible.

### Q14. Can React interrupt a render? (Hard)
Yes, for non-urgent work. Transitions, deferred values and Suspense retries are rendered in small time slices, about 5 ms each, and React can stop between slices. If an urgent update such as a click arrives, React can abandon the half-built tree, render and commit the urgent update, then restart the non-urgent render. We watched it: the row at the end of the list was never rendered in the abandoned pass. Normal updates, such as a click handler's `setState` or one from a timer, render to the end without yielding. The commit is never interrupted. This is why render must be pure: a render can run and then be thrown away.

### Q15. What is `flushSync` and when would you use it? (Hard)
`flushSync(() => { ... })` from `react-dom` makes React render and commit the updates inside the callback synchronously, so the DOM is updated on the next line, and it opts out of batching. I use it rarely, for example to add an item and then scroll to it or focus it, or to read the DOM right after an update for a non-React library. It hurts performance, it should not be called during render, and in an effect it logs a warning. It does not change the variables in my function, because state is still a snapshot. For most "do something after the update" cases, an effect is better.

## Common mistakes and gotchas
- **Reading state or the DOM on the line after `setState`** gives the old value. Fix: compute a local variable, or use an effect.
- **Side effects in render** (module counters, `document.title`, requests, `Math.random()` for output). Fix: do them in event handlers or effects.
- **Mutating props or state** (`items.sort()`, `list.push(x); setList(list)`). Fix: copy first, then set.
- **Components defined inside components** lose their state on every parent render. Fix: define them at the top level.
- **Index keys on lists that change**, and `Math.random()` keys. Fix: use a stable id from the data.
- **Reading `props.key`.** It is `undefined`. Fix: pass the id as a separate prop.
- **Copying a prop into state** and expecting it to follow. Fix: use the prop, or reset with `key`.
- **Thinking `useCallback` or `useMemo` helps a child that is not `memo`.** Fix: use `memo` too, or move state down.
- **Wrapping everything in `memo` by habit.** Fix: measure first; move state down or pass `children` before you memoize.
- **Counting renders with function calls under StrictMode.** The count doubles. Fix: count commits with a Profiler or assert on the DOM.
- **Treating "re-rendered" as "DOM updated".** Fix: say "React called my function"; check real DOM changes with a `MutationObserver` or the Elements panel.
- **Repeating the React 17 rule** that batching only works in event handlers. Fix: it is automatic since React 18.
- **Using `flushSync` to fix a stale value.** It cannot. Fix: updater functions or a local variable.
- **Calling a component as a function** (`Hello(props)`). Fix: use JSX so React owns the call.
- **Removing StrictMode to silence double logs.** Fix: make the code pure and add effect cleanups.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Predict. `Child` has no props. `Parent` has a counter button. You click the button three times (no StrictMode). How many times in total does each of `Parent` and `Child` log? Then wrap `Child` in `memo` and answer again.

   ```jsx
   import { useState } from 'react'

   function Child() {
     console.log('Child')
     return <p>child</p>
   }

   export default function Parent() {
     const [n, setN] = useState(0)
     console.log('Parent')
     return (
       <>
         <button onClick={() => setN(n + 1)}>+</button>
         <Child />
       </>
     )
   }
   ```

<details>
<summary>Show answer</summary>

`Parent` logs **4** times (1 mount and 3 clicks). `Child` also logs **4** times. A parent that renders makes its children render, even with no props.

With `const MemoChild = memo(Child)` and `<MemoChild />`, `Child` logs only **1** time (the mount). A memo component with no props has equal props every time, so React skips it. `Parent` still logs 4 times. We ran both versions.

</details>

2. **(Easy)** Predict. How many renders (after the first) happen in each case? `a`, `b` and `c` are three separate `useState` values, React 19, no StrictMode.

   ```jsx
   // case 1
   setTimeout(() => {
     setA(1)
     setB(1)
     setC(1)
   }, 0)

   // case 2
   async function run() {
     setA(2)
     await new Promise((resolve) => setTimeout(resolve, 10))
     setB(2)
     setC(2)
   }
   ```

<details>
<summary>Show answer</summary>

Case 1 gives **1** render. Case 2 gives **2** renders.

- Case 1: three updates in one timer callback are batched. Since React 18 this works outside event handlers too. (In React 17 it would have been 3 renders.)
- Case 2: `setA(2)` is queued. The 10 ms wait lets React render before the next line, so `a` is rendered alone. After the wait, `setB` and `setC` start a new batch, which gives the second render.

We counted `console.log('render')` calls in both cases and got 1 and 2.

</details>

3. **(Easy)** Code. This `Guest` component numbers guests with a module variable. In StrictMode the numbers come out as 2, 4, 6 and keep growing. Make it pure so it always shows 1, 2, 3.

   ```jsx
   let guestNumber = 0

   function Guest({ name }) {
     guestNumber = guestNumber + 1
     return (
       <li>
         Guest #{guestNumber}: {name}
       </li>
     )
   }

   export default function Board() {
     const names = ['Ada', 'Bob', 'Cy']
     return (
       <ul>
         {names.map((name) => (
           <Guest key={name} name={name} />
         ))}
       </ul>
     )
   }
   ```

<details>
<summary>Show answer</summary>

Pass the number in as a prop. The index of the item in the list is the number, so the output depends only on the inputs:

```jsx
function Guest({ number, name }) {
  return (
    <li>
      Guest #{number}: {name}
    </li>
  )
}

export default function Board() {
  const names = ['Ada', 'Bob', 'Cy']
  return (
    <ul>
      {names.map((name, index) => (
        <Guest key={name} number={index + 1} name={name} />
      ))}
    </ul>
  )
}
```

This shows `Guest #1: Ada | Guest #2: Bob | Guest #3: Cy`, also inside StrictMode and after any number of re-renders. The old version changed a variable outside the component during render, which is a side effect.

</details>

4. **(Medium)** Predict. Click the counter twice, then click Swap. What does the counter show? Then change the code so Swap gives a fresh counter.

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

   export default function App() {
     const [isB, setIsB] = useState(false)
     return (
       <div>
         {isB ? <Counter label="B" /> : <Counter label="A" />}
         <button onClick={() => setIsB(!isB)}>Swap</button>
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

It shows **`B: 2`**. Both branches render a `Counter` at the same position, so React sees one counter with a new `label`. It keeps the state `2`.

To get a fresh counter, give the two elements different keys:

```jsx
{isB ? <Counter key="B" label="B" /> : <Counter key="A" label="A" />}
```

Now Swap shows **`B: 0`**: a different key means a different element, so React removes the old counter and mounts a new one. We ran both versions.

</details>

5. **(Medium)** Code. In this quiz the answer box keeps the old text when you click "Next question". Make it start empty for each question. Do not use `useEffect` and do not lift the state up.

   ```jsx
   import { useState } from 'react'

   const questions = ['Capital of France?', 'Capital of Japan?', 'Capital of Peru?']

   function Question({ text }) {
     const [answer, setAnswer] = useState('')
     return (
       <label>
         {text} <input value={answer} onChange={(e) => setAnswer(e.target.value)} />
       </label>
     )
   }

   export default function Quiz() {
     const [index, setIndex] = useState(0)
     return (
       <div>
         <Question text={questions[index]} />
         <button onClick={() => setIndex(index + 1)} disabled={index === questions.length - 1}>
           Next question
         </button>
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

Give `Question` a key that changes with the question:

```jsx
<Question key={index} text={questions[index]} />
```

**Why it works:** `Question` is the same type at the same position every time, so without a key React keeps its fiber and its `answer` state, and only changes `text`. With `key={index}`, the new question has a different key, so React unmounts the old `Question` (its state is dropped) and mounts a new one with `answer` equal to `''`. We typed `Paris` and clicked Next: without the key the box still held `Paris`, with the key it was empty.

</details>

6. **(Medium)** Predict. `n` starts at 0. What is `n` after the click?

   ```jsx
   <button
     onClick={() => {
       setN((x) => x + 1)
       setN(n + 10)
       setN((x) => x * 2)
     }}
   >
     go
   </button>
   ```

<details>
<summary>Show answer</summary>

**20.** The queue runs in order:

| Note | Result |
|---|---|
| start | 0 |
| `x => x + 1` | 1 |
| `n + 10` (a plain value, `n` is 0 in this snapshot) replaces with 10 | 10 |
| `x => x * 2` | 20 |

A plain value replaces everything before it. An updater builds on the state before it. React renders once with the final value. We ran it and the screen showed 20.

</details>

7. **(Medium)** Code. Type `typed-in-Ada` into Ada's note, then click "Remove first". Bob's note now shows Ada's text. Fix the bug.

   ```jsx
   import { useState } from 'react'

   const initial = [
     { id: 1, name: 'Ada' },
     { id: 2, name: 'Bob' },
     { id: 3, name: 'Cy' },
   ]

   export default function Notes() {
     const [people, setPeople] = useState(initial)
     return (
       <div>
         <button onClick={() => setPeople(people.slice(1))}>Remove first</button>
         <ul>
           {people.map((person, index) => (
             <li key={index}>
               {person.name} <input aria-label={`note for ${person.name}`} />
             </li>
           ))}
         </ul>
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

Use the stable id as the key:

```jsx
{people.map((person) => (
  <li key={person.id}>
    {person.name} <input aria-label={`note for ${person.name}`} />
  </li>
))}
```

**Why:** with `key={index}`, after the removal key 0 still exists. React keeps row 0 (and its input with Ada's typed text) and just changes the label from Ada to Bob. With `key={person.id}`, the key `1` is gone, so React removes Ada's row together with her input, and Bob's row keeps its own empty input. We checked: after the fix the inputs read `Bob=[]` and `Cy=[]`.

</details>

8. **(Medium)** Code. Typing in the search box re-renders `SlowChart` on every keystroke. Stop that in two different ways, without changing `SlowChart`.

   ```jsx
   import { useState } from 'react'

   function SlowChart() {
     console.log('SlowChart rendered')
     return <p>(imagine a chart that takes 200 ms to render)</p>
   }

   export default function App() {
     const [query, setQuery] = useState('')
     return (
       <div>
         <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
         <SlowChart />
       </div>
     )
   }
   ```

<details>
<summary>Show answer</summary>

**Way 1: move the state down.** Only the search box needs `query`.

```jsx
function SearchBox() {
  const [query, setQuery] = useState('')
  return <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
}

export default function App() {
  return (
    <div>
      <SearchBox />
      <SlowChart />
    </div>
  )
}
```

**Way 2: pass the chart as `children`.**

```jsx
function SearchShell({ children }) {
  const [query, setQuery] = useState('')
  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
      {children}
    </div>
  )
}

export default function App() {
  return (
    <SearchShell>
      <SlowChart />
    </SearchShell>
  )
}
```

In both versions `SlowChart` rendered 0 extra times after two edits (the original rendered 2 extra times). A third option is to wrap the chart in `memo`, which works here because `SlowChart` has no props. State placement is usually the better first move.

</details>

9. **(Medium)** Predict. Write the exact console output when this app mounts (no StrictMode). Then say what StrictMode adds.

   ```jsx
   import { useEffect, useLayoutEffect } from 'react'

   function Widget() {
     console.log('Widget render')
     useLayoutEffect(() => {
       console.log('Widget layout effect')
       return () => console.log('Widget layout cleanup')
     })
     useEffect(() => {
       console.log('Widget effect')
       return () => console.log('Widget cleanup')
     })
     return <p>widget</p>
   }

   export default function Page() {
     console.log('Page render')
     useLayoutEffect(() => {
       console.log('Page layout effect')
       return () => console.log('Page layout cleanup')
     })
     useEffect(() => {
       console.log('Page effect')
       return () => console.log('Page cleanup')
     })
     return <Widget />
   }
   ```

<details>
<summary>Show answer</summary>

Without StrictMode:

```text
Page render
Widget render
Widget layout effect
Page layout effect
Widget effect
Page effect
```

Render goes parent first, top to bottom. Effects go child first. All layout effects run before any passive effect.

With StrictMode, each render line appears twice (`Page render`, `Page render`, `Widget render`, `Widget render`), then the effects run as above, and then React runs one extra cycle: `Page layout cleanup`, `Widget layout cleanup`, `Page cleanup`, `Widget cleanup`, followed by `Widget layout effect`, `Page layout effect`, `Widget effect`, `Page effect` again. Cleanups on this simulated unmount go parent first. We ran both.

</details>

10. **(Hard)** Code. Write a Vitest and Testing Library test that proves clicking "Render again" re-renders `Page` but makes **no DOM change**. Use a `MutationObserver`.

    ```jsx
    import { useState } from 'react'

    export default function Page() {
      const [, setTick] = useState(0)
      return (
        <div>
          <h1>Hello Ada</h1>
          <button onClick={() => setTick((t) => t + 1)}>Render again</button>
        </div>
      )
    }
    ```

<details>
<summary>Show answer</summary>

To count renders without changing the component, wrap it in a `Profiler` and count commits. Then watch the DOM with a `MutationObserver`:

```jsx
import { Profiler } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import Page from './Page.jsx'

test('a re-render with identical output does not touch the DOM', async () => {
  const user = userEvent.setup()
  const phases = []
  const { container } = render(
    <Profiler id="page" onRender={(id, phase) => phases.push(phase)}>
      <Page />
    </Profiler>,
  )
  const heading = container.querySelector('h1')

  const records = []
  const observer = new MutationObserver((list) => records.push(...list))
  observer.observe(container, { subtree: true, childList: true, attributes: true, characterData: true })

  await user.click(screen.getByRole('button', { name: 'Render again' }))
  records.push(...observer.takeRecords())
  observer.disconnect()

  expect(phases).toEqual(['mount', 'update']) // it did commit a render
  expect(records).toHaveLength(0) // but changed nothing in the DOM
  expect(container.querySelector('h1')).toBe(heading) // same node
})
```

`takeRecords()` collects any change that was reported but not yet delivered, so the check does not depend on timing. We ran this test and it passes: one `update` phase, zero DOM records, the same `<h1>`.

</details>

11. **(Hard)** Explain. A search page starts a transition that renders 1000 slow rows on each keystroke. The user types another letter while a transition render is half done. Describe what React does with the half-finished render, which update is shown first, and what this means for the code inside `Row`.

<details>
<summary>Show answer</summary>

Typing is an urgent update (a discrete event) and the row rendering is a transition, which is non-urgent and rendered in small time slices. When the new keystroke arrives:

1. React **abandons** the half-built tree. Nothing was written to the DOM, so the user sees no trace of it.
2. It renders and commits the urgent update first: the input shows the new letter, with the **old** transition state, so the list still shows the previous results.
3. It then **restarts** the transition from the top with the newest value.

We saw this in a log: the first pass rendered `Row 0` for the new query but never reached `Row 39`. After the click, an urgent pass ran with the old query, then a second transition pass ran all the way through.

For `Row`: its function may run for a render that is thrown away. So it must be pure, with no requests, no analytics, no changes to shared variables. Anything with side effects belongs in an effect, which only runs after a committed render.

</details>

12. **(Hard)** Explain and fix. After `addTask`, the page scrolls to the previous last item, not the new one. Why? Fix it two ways.

    ```jsx
    function addTask() {
      const id = tasks.length
      setTasks([...tasks, { id, text: `Task ${id}` }])
      listRef.current.lastChild.scrollIntoView()
    }
    ```

<details>
<summary>Show answer</summary>

**Why:** `setTasks` only queues an update. The handler keeps running with the old DOM, so `listRef.current.lastChild` is still the old last `<li>`. React adds the new `<li>` after the handler ends. We checked: right after `setTasks` the DOM held 1 item (the old count).

**Fix 1: `flushSync`.** Force the commit before the next line:

```jsx
import { flushSync } from 'react-dom'

function addTask() {
  const id = tasks.length
  flushSync(() => {
    setTasks([...tasks, { id, text: `Task ${id}` }])
  })
  listRef.current.lastChild.scrollIntoView()
}
```

Right after `flushSync` the DOM held the new item (the logged count included it).

**Fix 2: an effect.** Do the scroll after the commit, whenever the length changes. This is usually the better choice, because it does not force a synchronous render:

```jsx
useEffect(() => {
  listRef.current.lastChild?.scrollIntoView()
}, [tasks.length])
```

</details>

## Recap
- Every screen change is trigger, then render, then commit. Render calls your components and compares trees. Commit writes the differences to the DOM, runs layout effects, then (after paint) passive effects.
- A re-render is React calling your function again. It does not mean the DOM changed: only real differences are written.
- Render must be pure (same inputs, same output, no changes to outside things) because React may call it twice, pause it, or throw it away. StrictMode double-calls in development to expose impure code.
- The "virtual DOM" is React elements (plain description objects) plus the Fiber tree (React's linked bookkeeping with state, effects and priority). It is the price of a declarative model, not a speed trick.
- Reconciliation: same type and key at a position keeps state and the DOM node, a different type or key tears down and rebuilds. Use stable ids as keys, never the index for changing lists and never random values.
- State is a snapshot, updates wait in a queue (a plain value replaces, an updater builds on the last), and since React 18 updates are batched everywhere into one render.
- A parent render renders its children unless props are identical. Fix it by moving state down, passing `children`, or `memo` with stable props. Measure before you optimize.
- Non-urgent renders (transitions, deferred values) can be paused or abandoned and the commit cannot; `flushSync` forces an immediate commit and opts out of batching.

## Where to go next
- Next lesson: [Performance optimization](02-performance-optimization.md), where these rules turn into profiling and fixes. Then [Concurrent React and Suspense](03-concurrent-react-and-suspense.md) for transitions and deferred values.
- Go deeper into Fiber, the work loop, lanes and the scheduler in React internals deep dive (planned).
- Related hook lessons: [useEffect](../02-hooks/03-useeffect.md) (effects and StrictMode), [Memoization](../02-hooks/07-memoization.md), [useContext](../02-hooks/05-usecontext.md) and [Other hooks](../02-hooks/09-other-hooks.md) (`useLayoutEffect`).
- Test yourself: [Round 3, output and debugging](../05-interview-rounds/round-3-output-and-debugging/README.md), Round 3, rendering, keys, memo and context (planned) and Round 2, rendering and performance (planned).
- Practise: [17 Tic-tac-toe with history](../practice-app/exercises/react/17-tic-tac-toe-history/README.md) (every move is a new state snapshot) and [24 Virtualized list](../practice-app/exercises/react/24-virtualized-list/README.md) (render only what is visible).
- Keep handy: Gotchas and common mistakes (planned).
