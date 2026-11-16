# What Is React and Why Use It

> **Level:** Beginner   **Time:** about 40 minutes   **Read first:** [JavaScript for React](01-javascript-for-react.md), [Set up your playground](../00-start-here/02-setup-your-playground.md)

## What you will learn
- Explain in plain words what React is, what problem it solves, and what it does not include.
- Compare imperative and declarative code by building the same counter twice.
- Describe components, props, state, one-way data flow and re-rendering, and explain the virtual DOM honestly.
- Trace how a React app starts (index.html, root div, `createRoot`, StrictMode) and read a fresh Vite project.
- Choose a way to start a new project today and place the common libraries on the ecosystem map.
- Answer "Why React?" and compare React with Angular, Vue and Svelte without bashing anyone.

## 1. What React is, and what it is not
**React is a JavaScript library for building user interfaces (UIs) out of components.** Let us define each word.

- A **user interface (UI)** is everything a person sees and clicks: text, buttons, forms, lists.
- A **component** is a small, reusable piece of UI that you write as a JavaScript function. A button, a search box or a whole page can each be a component.
- A **library** is code you call when you need it. You stay in charge of how the app is organised. A **framework** is a ready-made structure that decides how the app is organised and calls your code at the right moment. Think of a set of kitchen knives (library) versus a meal kit with a fixed recipe (framework).

React has one main job. You tell it what the screen should look like for the current data, and it updates the browser's page to match. The browser's page is called the **DOM** (Document Object Model): the live tree of elements (`<div>`, `<p>`, `<button>`) that the browser builds from HTML. JavaScript changes what the user sees by changing the DOM.

React is published as two npm packages:

```js
import { useState } from 'react'               // building blocks: components, state, hooks
import { createRoot } from 'react-dom/client'  // puts React's output into a browser page
```

**What happens, step by step:**
1. The `react` package gives you the tools to describe a UI and remember data. It knows nothing about browsers.
2. The `react-dom` package connects React to the browser DOM. `createRoot` attaches React to one element of the real page.
3. Your own code sits between them: many components that use `react`, and one start-up file that uses `react-dom`.

**What React includes:** components, JSX (the HTML-like syntax inside JavaScript), state (`useState`, `useReducer`), context, side effects (`useEffect`), Suspense for loading screens, and, since React 19, Actions for forms.

**What React does not include** (you add it, or you use a framework that adds it):
- Routing: changing "pages" and the URL (see [React Router](../03-intermediate/03-react-router.md)).
- Data fetching and caching (see [Data fetching](../03-intermediate/02-data-fetching.md)).
- App-wide state management beyond the built-in tools (see [State management](../03-intermediate/06-state-management.md)).
- Form validation. React gives you controlled inputs and form Actions, but not a validation system (see [Forms with libraries](../03-intermediate/04-forms-with-libraries.md)).
- A styling system, a build tool, a folder structure, and the wiring for server rendering.

**Common mistake:**
```text
Wrong:  "React is a full framework, like Angular."
Fixed:  "React is a UI library. Frameworks such as Next.js and React Router
         (framework mode) are built on top of it."
```
Why: React alone has no router, no data layer and no build setup, so it cannot be compared one to one with a complete framework.

## 2. The problem React solves: imperative versus declarative
Two words you must know:

- **Imperative** code says *how*, step by step: "find this element, set its text, then disable that button."
- **Declarative** code says *what* the result should be, and leaves the steps to the tool.

A taxi example: imperative is "turn left at the shop, then right at the lights." Declarative is "take me to the airport."

Let us build the **same small counter app twice**. The rules of the app:
- It shows `Count: N`.
- `+1` adds one. `-1` subtracts one, but is disabled when the count is 0. `Reset` goes back to 0.

### Version A: imperative (plain HTML and JavaScript)

```html
<!doctype html>
<html lang="en">
  <body>
    <h1>Counter</h1>
    <p>Count: <span id="count">0</span></p>
    <button id="minus" disabled>-1</button>
    <button id="plus">+1</button>
    <button id="reset">Reset</button>
    <script src="counter.js"></script>
  </body>
</html>
```

```js
// counter.js
let count = 0

const countEl = document.getElementById('count')
const minusBtn = document.getElementById('minus')
const plusBtn = document.getElementById('plus')
const resetBtn = document.getElementById('reset')

plusBtn.addEventListener('click', () => {
  count = count + 1
  countEl.textContent = count
  minusBtn.disabled = count === 0
})

minusBtn.addEventListener('click', () => {
  count = count - 1
  countEl.textContent = count
  minusBtn.disabled = count === 0
})

resetBtn.addEventListener('click', () => {
  count = 0
  countEl.textContent = count
  minusBtn.disabled = count === 0
})
```

**What happens, step by step:**
1. The browser builds the page from the HTML. The script runs: `count` is `0`, and the code grabs four elements.
2. It registers one click listener per button.
3. On `+1`, the handler does three jobs that **you** wrote by hand: change the data (`count`), find and update the text on screen, and update the `disabled` state of the `-1` button.
4. Every other handler repeats the same jobs.

Notice the weak point. The number exists twice: once in the JavaScript variable and once as text in the page. You keep the two copies equal by hand, in every handler. We ran a version where the `Reset` handler forgot its last line:

```js
resetBtn.addEventListener('click', () => {
  count = 0
  countEl.textContent = count
  // forgot: minusBtn.disabled = count === 0
})
```

Result of running it: click `+1`, then `Reset`. The screen shows `0`, but the `-1` button is still enabled. Click it and the screen shows `-1`. The page and the data disagree. This family of bug is one of the main reasons UI libraries exist.

### Version B: declarative (React)
Save this as `src/App.jsx` in a Vite React project (the next sections explain the files):

```jsx
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <h1>Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count - 1)} disabled={count === 0}>
        -1
      </button>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  )
}
```

**What happens, step by step:**
1. First render: React calls `Counter()`. `useState(0)` returns `[0, setCount]`. The function returns a description of the UI for `count = 0`, with `-1` disabled. React builds the real DOM from that description.
2. You click `+1`. The handler calls `setCount(1)`. That is all the handler does: it changes the data.
3. React notices the state changed and calls `Counter()` again. Now `useState` returns `1`, so the new description says `Count: 1` and `-1` is not disabled.
4. React compares the new description with the old one, finds two differences (the text and the `disabled` flag), and changes only those two things in the real DOM.

The handlers never touch the page. There is **one source of truth** (`count`), and the screen is *computed* from it. You cannot forget to update the `-1` button, because you never update it yourself.

**Common mistake:** editing the DOM by hand inside a React component.
```jsx
// Wrong: React and your code now both write to the same node
function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p id="msg">Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => { document.getElementById('msg').textContent = 'Changed by hand' }}>
        Edit by hand
      </button>
    </div>
  )
}
```
We ran it. After `Edit by hand`, the paragraph shows `Changed by hand`, and further clicks on `+1` change the state but the screen **stays** on `Changed by hand`, because React is still updating the text nodes it created, which are no longer in the page. Fixed: put everything the screen shows into state.
```jsx
// Fixed: the label is state, so React renders it and keeps it in sync
function Counter() {
  const [count, setCount] = useState(0)
  const [label, setLabel] = useState('Count')

  return (
    <div>
      <p>
        {label}: {count}
      </p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setLabel('Total')}>Rename label</button>
    </div>
  )
}
```
We ran the fixed version: `Count: 1`, then after `Rename label` it shows `Total: 1`, and the next `+1` shows `Total: 2`. Why: in React you change data, and React changes the screen. (The rare real need to touch a DOM node, such as focusing an input, uses a ref, see [useRef](../02-hooks/04-useref.md).)

## 3. Components
A **component** is a JavaScript function that returns the UI for one piece of the page. Two rules to start with: the name starts with a **capital letter**, and you use it like an HTML tag. The HTML-like syntax is called **JSX**, and [the JSX lesson](03-jsx.md) covers its rules.

```jsx
function Greeting({ name }) {
  return <p>Hello, {name}!</p>
}

export default function App() {
  return (
    <div>
      <Greeting name="Ada" />
      <Greeting name="Grace" />
    </div>
  )
}
```

**What happens, step by step:**
1. React calls `App()`. It returns a `<div>` that contains two `<Greeting />` elements.
2. For each `<Greeting />`, React calls `Greeting` with an object of inputs: `{ name: 'Ada' }`, then `{ name: 'Grace' }`.
3. Each call returns a `<p>`. React puts it all together. We ran it, and the page contains exactly `<div><p>Hello, Ada!</p><p>Hello, Grace!</p></div>`.

Components can contain components, so a React app is a **tree of components**: `App` at the top, small pieces at the bottom. You write `Greeting` once and reuse it as often as you like. Each use is independent.

**Common mistake:** a lowercase component name.
```jsx
// Wrong: lowercase means "HTML tag"
<greeting name="Ada" />
```
```jsx
// Fixed: capital letter means "my component"
<Greeting name="Ada" />
```
Why: React treats lowercase names as built-in HTML tags. We ran the wrong version: the page got an empty `<greeting name="Ada"></greeting>` element, and React logged "The tag <greeting> is unrecognized in this browser. If you meant to render a React component, start its name with an uppercase letter."

## 4. Props and one-way data flow
**Props** (short for properties) are the inputs a component receives from its parent. They work like function arguments. In the example above, `name` is a prop.

Data in React flows **one way: down**, from parent to child, through props. A child cannot change its props. When a child needs to ask for a change, the parent gives it a **function** as a prop, and the child calls that function. Data goes down like water in a pipe, and requests go back up through functions the parent handed over.

```jsx
import { useState } from 'react'

function LikeButton({ likes, onLike }) {
  return <button onClick={onLike}>Likes: {likes}</button>
}

export default function Post() {
  const [likes, setLikes] = useState(0)

  return (
    <article>
      <h2>My post</h2>
      <LikeButton likes={likes} onLike={() => setLikes(likes + 1)} />
      <p>{likes} people like this</p>
    </article>
  )
}
```

**What happens, step by step:**
1. The state `likes` lives in `Post`. `Post` is the **owner** of that data.
2. `Post` passes the value down (`likes={likes}`) and a function down (`onLike={...}`).
3. You click the button. The child calls `onLike()`. It does not change anything itself.
4. The function runs inside `Post` and calls `setLikes(1)`. `Post` re-renders and passes the new value down.
5. After two clicks we saw `<button>Likes: 2</button>` and `<p>2 people like this</p>`: both places updated from one number.

Why one-way flow helps: when something looks wrong, you ask "who owns this data?" and walk **up** the tree until you find the owner. There is no hidden two-way binding to chase. (More in [Components and props](04-components-and-props.md).)

**Common mistake:** writing to props.
```jsx
// Wrong: props are read-only
function Shout(props) {
  props.name = props.name.toUpperCase()
  return <p>{props.name}</p>
}
```
```jsx
// Fixed: compute a new value; never change the props object
function Shout({ name }) {
  const loud = name.toUpperCase()
  return <p>{loud}</p>
}
```
Why: in development React freezes the props object. We ran the wrong version and got `TypeError: Cannot assign to read only property 'name' of object '#<Object>'`. If a child really needs the parent's data to change, it calls a function prop, as `LikeButton` does.

## 5. State and re-rendering
**State** is data that a component remembers between renders and that makes React update the screen when it changes. You create it with the `useState` hook (a **hook** is a special function whose name starts with `use`; see [Hooks overview](../02-hooks/01-hooks-overview-and-rules.md)).

Two more words:
- A **render** means React calls your component function to get the UI description. It does **not** mean "draw on the screen".
- A **re-render** is a later render, triggered by a state change.

```jsx
import { useState } from 'react'

function Child() {
  console.log('Child renders')
  return <p>I am a child</p>
}

export default function Parent() {
  const [count, setCount] = useState(0)
  console.log('Parent renders, count =', count)

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
      <Child />
    </div>
  )
}
```

**What happens, step by step:** (we ran this without StrictMode)
1. First render. Console: `Parent renders, count = 0`, then `Child renders`.
2. You click. `setCount(1)` tells React that `Parent`'s state changed.
3. React re-renders `Parent`. Console: `Parent renders, count = 1`, then `Child renders`.
4. `Child` ran again even though its output did not change, because by default React re-renders the children of a component that re-rendered. Skipping that work is an optimisation for later ([Memoization](../02-hooks/07-memoization.md)).
5. A re-render is not a DOM update. We recorded the real page while this ran: exactly **one** change happened, the text inside the button. The `<p>` from `Child` was not touched.

The Vite template wraps your app in StrictMode, so in development you will see each line twice (section 8 explains why).

**Common mistake:** keeping changing data in a plain variable.
```jsx
// Wrong: a normal variable does not make React re-render
function Counter() {
  let count = 0
  return <button onClick={() => { count = count + 1 }}>Count: {count}</button>
}
```
```jsx
// Fixed: state does
function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>
}
```
Why: we clicked the wrong version three times. The variable went 1, 2, 3, but the button still said `Count: 0`: React was never told anything changed, and every render starts with a new `count = 0` anyway. (Details in [State and events](05-state-and-events.md).)

## 6. The virtual DOM, explained simply and honestly
### The problem
Why not redraw the whole page every time data changes? Because it is slow on big pages and it destroys things the DOM remembers. We tested a naive redraw (`app.innerHTML = ...` on every change) with a focused text box that had `abc` typed into it. After the redraw, the `<h1>` was a brand-new node, the text box was empty, and it had lost focus. Users notice that immediately.

### React's idea
1. Your JSX does not create DOM nodes. It creates plain JavaScript objects called **React elements**: small descriptions of what should be on screen.

```jsx
const element = <h1 className="title">Hello</h1>
console.log(element.type)   // "h1"
console.log(element.props)  // { className: "title", children: "Hello" }
```

A simplified view of that object (development builds add a few extra debug fields):

```js
{
  $$typeof: Symbol(react.transitional.element),  // marks "this is a React element"
  type: 'h1',                                    // an HTML tag name, or a component function
  key: null,
  props: { className: 'title', children: 'Hello' },
}
```

2. A whole tree of these objects, one per piece of UI, is what people call the **virtual DOM**. It is "virtual" because it is just data in memory, not real page nodes.
3. When state changes, React calls your components again and gets a **new** tree. It compares the new tree with the old one (this comparison is called **diffing**, and the process is **reconciliation**). Then it applies only the differences to the real DOM (the **commit**).

For our counter, going from `0` to `1`:

```text
Old description              New description
div                          div
  h1 "Counter"                 h1 "Counter"           same
  p  "Count: " 0               p  "Count: " 1         text changed
  button -1 (disabled)         button -1              attribute changed
  button +1                    button +1              same
  button Reset                 button Reset           same
```

**What happens, step by step:** we watched the real page with a `MutationObserver` while clicking `+1` the first time.
1. React ran `Counter()` and built the new description.
2. It found two differences and made exactly two DOM changes: one text node changed, and the `disabled` attribute was removed from the `-1` button.
3. The `<h1>`, the `<p>` and all three buttons were the very same DOM nodes before and after. Text typed into an input in the same component also survived a re-render (we checked: `abc` stayed, same node).

### The honest part
The virtual DOM is **not** a magic speed trick, and it is **not** a faster copy of the DOM. Building objects and comparing two trees is extra work. A hand-written, perfectly targeted DOM update can beat it. What the virtual DOM gives you is a *programming model*: you write declarative code ("this is the UI for this state"), and React works out a reasonably small set of DOM changes for you, so you do not track changes by hand. Where React apps get their real speed (or lose it) is elsewhere: batching several state updates into one render, avoiding unnecessary renders, splitting code, and scheduling urgent work first. Svelte and Solid have no virtual DOM and are fast too, which is the best proof that it is not "the reason".

Two names people mix up: **Shadow DOM** is a browser feature for web components and has nothing to do with React's virtual DOM. **Fiber** is the name of React's internal engine that implements this tree and schedules the work (see React internals (planned)). For keys and the exact diffing rules, see [How React renders](../04-advanced/01-how-react-renders.md).

**Common mistake:**
```text
Wrong:  "The virtual DOM is a copy of the DOM that is faster to edit, so React is fast."
Fixed:  "The virtual DOM is a tree of plain objects that describes the UI. React diffs
         it against the previous tree and updates only what changed. It costs some work
         and gives a declarative model, it is not the source of React's speed."
```

## 7. Single-page apps, multi-page apps and client-side rendering
In a **multi-page app (MPA)**, every link or form sends a request to the server, and the server answers with a complete new HTML page. The browser throws away the old page and shows the new one.

In a **single-page app (SPA)**, the browser loads one HTML page once. After that, JavaScript changes what is on screen. When you click a link, JavaScript swaps the content and updates the URL (using the browser History API) without a full reload. This is **client-side routing**; see [React Router](../03-intermediate/03-react-router.md).

Building the UI in the browser with JavaScript is called **client-side rendering (CSR)**. A plain Vite React app is a CSR SPA.

| | Multi-page app | SPA with client-side rendering |
|---|---|---|
| Moving to another page | New HTML request every time | JavaScript swaps content, no reload |
| First paint | Server sends ready HTML | Empty until the JavaScript has downloaded and run |
| Feels like | A website | An app (state survives between "pages") |
| Search and link previews | Content is in the HTML | The HTML holds only an empty root div |
| Server needed for | Every page | Serving files and an API |

**What happens, step by step** when you open a CSR React app:
1. The browser requests the URL. The server returns a tiny `index.html` (almost empty: a root `<div>` and a `<script>`).
2. The browser sees the script and downloads the JavaScript bundle (React plus your code).
3. The JavaScript runs, React builds the UI and inserts it into the root div.
4. Only now does the user see the app. Before step 3, the page is blank.

The fixes for the weak spots (blank start, SEO) are **server-side rendering (SSR)** and **static site generation (SSG)**: send ready-made HTML first, then React "wakes it up" in the browser (called **hydration**). Frameworks such as Next.js do this for you. See [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md). React itself does not force you to build an SPA.

**Common mistake:**
```text
Wrong:  Deploy an SPA to a plain static host. Open /about by clicking a link: works.
        Press refresh on /about: 404 Not Found.
Fixed:  Configure the host to answer every unknown path with index.html,
        so the client-side router can read the URL and show the right page.
```
Why: after a refresh, the browser asks the server for `/about`. No such file exists, only the router inside your JavaScript knows that route.

## 8. How a React app starts
Three small pieces start every Vite React app. These are the real files from a fresh project (`create-vite` 9.3.4, template `react`).

`index.html` (in the project root):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>my-app</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

`src/main.jsx`:
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**What happens, step by step:**
1. The browser loads `index.html`. It has an empty `<div id="root">`: the **mount point** where React will draw.
2. The `<script type="module">` loads `src/main.jsx` (Vite compiles it first, see section 9).
3. `document.getElementById('root')` finds the div, a normal DOM call.
4. `createRoot(div)` creates a **React root**: React's handle on that one DOM element. Everything inside it is now managed by React.
5. `.render(...)` tells React what to show. React calls `App`, then every component below it, and builds the DOM inside the root div.
6. The first `render` **clears** whatever was inside the div. We tested it: a `<p>Loading...</p>` inside the div disappeared. Calling `render` again later updates the same nodes instead of starting over.
7. Clicks and state changes from here on go through the re-render loop of section 5.

**What is StrictMode?** `<StrictMode>` is a wrapper that adds extra checks in **development only**. It renders nothing visible and does nothing in a production build. It does three things: it calls your component functions **twice** per render, to expose code that is not pure; it runs each effect's setup, cleanup, setup on mount, to expose missing cleanup; and it re-runs ref callbacks. We ran the section 5 example inside StrictMode, with an added effect:

```text
Mount:        Parent count=0, Parent count=0, Child, Child,
              effect setup, effect cleanup, effect setup
After a click: Parent count=1, Parent count=1, Child, Child
```

Each function ran twice. With React DevTools installed, the console may show the second set of logs dimmed. The double run is a feature: if your component gives different results the second time, it has a bug. Do not remove StrictMode to "fix" double logs. (Deep dive: [useEffect](../02-hooks/03-useeffect.md).)

**Common mistake 1:** a root id that does not match.
```jsx
// index.html has <div id="root">, but the code asks for "app"
createRoot(document.getElementById('app')).render(<App />)
```
We ran it: `Error: Target container is not a DOM element.` Fixed: use the same id in both files.

**Common mistake 2:** copying an old tutorial.
```jsx
// Wrong (React 17 and older): ReactDOM.render was removed in React 19
import ReactDOM from 'react-dom'
ReactDOM.render(<App />, document.getElementById('root'))
```
```jsx
// Fixed (React 18 and 19)
import { createRoot } from 'react-dom/client'
createRoot(document.getElementById('root')).render(<App />)
```
Why: in React 19, `ReactDOM.render` is `undefined`, so the old call fails with `TypeError: ReactDOM.render is not a function`.

## 9. JSX needs a build step
Browsers do not understand JSX. Plain JavaScript stops at the first `<`:

```js
const el = <h1>Hi</h1>   // SyntaxError: Unexpected token '<'
```

A **build tool** (here, Vite) rewrites JSX into normal JavaScript function calls before the browser sees it. Roughly:

```jsx
// What you write
const el = <h1 className="title">Hello, {name}</h1>
```
```js
// What the tool produces (shown in module form; real output has small extra details)
import { jsxs } from 'react/jsx-runtime'

const el = jsxs('h1', { className: 'title', children: ['Hello, ', name] })
```

**What happens, step by step:**
1. You write JSX in a `.jsx` file.
2. The build tool compiles it to calls such as `jsx(...)` and `jsxs(...)` from `react/jsx-runtime`. These calls return the React element objects from section 6.
3. In development, the tool uses `jsxDEV`, which also records the file and line number for better error messages. We saw this in a real dev server: our `main.jsx` came back with `_jsxDEV(StrictMode, { children: _jsxDEV(App, {}, ...) })`.
4. Since React 17 the build tool adds those imports for you, so new code does not need `import React from 'react'`.

You do not have to use JSX (you could call `createElement` yourself), but nearly everyone does. The rules of JSX are in [the JSX lesson](03-jsx.md).

**Common mistake:**
```text
Wrong:  Serve the project folder with any plain static file server, or double-click index.html.
        The browser receives src/main.jsx untouched and cannot run it.
Fixed:  npm run dev   (the Vite dev server compiles JSX when the browser asks for each file)
```

## 10. A tour of a fresh Vite React project
Create one (Vite 8 needs Node 20.19+ or 22.12+; Node 20 is already end of life, so use a current LTS such as 22 or newer):

```bash
npm create vite@latest my-app -- --template react
cd my-app
npm install
npm run dev
```

`--template react` is the JavaScript version. Use `react-ts` for TypeScript (see [TypeScript with React](../03-intermediate/08-typescript-with-react.md)). The interactive prompts change between versions, so the flags above are the stable way. Here is what `create-vite` 9.3.4 really created (we scaffolded, installed and built it on 2026-11-10):

```text
my-app/
  .gitignore
  .oxlintrc.json
  README.md
  index.html          <- the one HTML page (project root, not in src)
  package.json
  vite.config.js
  public/
    favicon.svg       <- copied to the site root as they are
    icons.svg
  src/
    main.jsx          <- start-up file (section 8)
    App.jsx           <- the top component
    App.css
    index.css
    assets/
      hero.png        <- images that your code imports; Vite bundles and renames them
      react.svg
      vite.svg
```

After `npm install` you also get `node_modules/` and `package-lock.json`; after `npm run build` you get `dist/`.

`package.json`:
```json
{
  "name": "my-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.3.1",
    "react-dom": "^19.3.1"
  },
  "devDependencies": {
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.2",
    "oxlint": "^1.90.0",
    "vite": "^8.3.6"
  }
}
```

`vite.config.js`:
```js
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
```

`src/App.jsx` (shortened; the full file adds logos and links as plain markup):
```jsx
import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        {/* logos and a heading */}
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>
      {/* links to the docs and the community */}
    </>
  )
}

export default App
```

Look at what it shows: a component, a `useState` counter, and a button. It is the same idea as section 2.

**What happens, step by step:**
1. `npm run dev` starts the Vite dev server, by default at `http://localhost:5173/`. It serves your files **one by one**, without bundling first.
2. For `/`, the browser gets your `index.html` plus two small scripts that Vite adds (the hot-reload client and the React Fast Refresh set-up). When the browser asks for `/src/main.jsx`, Vite compiles the JSX on the spot (section 9).
3. You edit and save a file. **Fast Refresh** swaps in the new code without reloading the page, and keeps component state if the file only exports components.
4. `npm run build` bundles, minifies and fingerprints everything into `dist/`. In our run: `index.html` (0.45 kB) with a script tag that points to a hashed file such as `/assets/index-DSXtc1GT.js`, one JS file of 222.44 kB (69.28 kB gzipped) and one CSS file. Almost all of the JS is React itself (about 219 kB when React's packages were split into their own chunk in an experiment on the TypeScript template). The built `index.html` still contains only the empty `<div id="root"></div>`.
5. `npm run preview` serves `dist/` locally (default port 4173), so you can check the production build before deploying.
6. `npm run lint` runs Oxlint. `.oxlintrc.json` turns on `react/rules-of-hooks` as an error and a warning for files that export more than components (that rule protects Fast Refresh). ESLint is the other common choice, see Tooling (planned).

React Compiler (automatic memoization) is not switched on in this template, because it slows dev and build a little. The template README says so and links to the install guide. See [Memoization](../02-hooks/07-memoization.md).

**Common mistake:**
```text
Wrong:  Double-click index.html in the file explorer, or open it with a basic file server.
Fixed:  Run npm run dev and open the address it prints (http://localhost:5173/ by default).
```
Why: the page needs Vite to compile `src/main.jsx`, and resolve imports such as `react`.

## 11. The ecosystem map, and how to start a new project today
React stays small on purpose, so a real project is React plus a few libraries. Here is the map. You do not need to learn them now; you need to know the categories and one or two names in each.

| You need | Common choices | Where this book covers it |
|---|---|---|
| A starting point with routing, data and server features | Next.js, React Router (framework mode), TanStack Start | [Next.js essentials](../04-advanced/06-nextjs-essentials.md) |
| A build tool without a framework | Vite, Parcel, Rsbuild | Tooling (planned) |
| Routing | React Router, TanStack Router, or file routing in a framework | [React Router](../03-intermediate/03-react-router.md) |
| Server data (fetching, caching) | TanStack Query, SWR, framework loaders | [Data fetching](../03-intermediate/02-data-fetching.md) |
| Client state | Built in: `useState`, `useReducer`, Context. Libraries: Redux Toolkit, Zustand, Jotai | [State management](../03-intermediate/06-state-management.md) |
| Forms | Controlled inputs, React 19 form Actions, React Hook Form with Zod | [Forms with libraries](../03-intermediate/04-forms-with-libraries.md) |
| Styling | CSS and CSS Modules, Tailwind CSS, CSS-in-JS | [Styling](../03-intermediate/07-styling.md) |
| Ready-made components | MUI, shadcn/ui, Radix UI, Mantine | [Styling](../03-intermediate/07-styling.md) |
| Testing | Vitest or Jest with Testing Library, MSW for network, Playwright for end to end | [Testing React](../04-advanced/08-testing-react.md) |
| Types | TypeScript | [TypeScript with React](../03-intermediate/08-typescript-with-react.md) |

### What react.dev recommends for a new project (November 2026)
The React team's page "Creating a React App" says: if you want a new app or site, **start with a framework**. The frameworks it recommends are **Next.js** (App Router), **React Router** (framework mode) and **Expo** (for native mobile apps). It lists TanStack Start and RedwoodSDK as newer options. A framework gives you routing, data fetching, code splitting and server rendering that you would otherwise build and maintain yourself. Frameworks do not force a server: they can also produce a plain client-side SPA or a static export.

If you do not want a framework, the same docs name **Vite**, **Parcel** and **Rsbuild** as build tools, and then you own the routing, data and performance work. For learning and for this book's practice app, Vite is the simplest choice.

A small note on dates: docs pages can lag behind releases. At the time of writing, that page still says "React Router (v7)", while the current major version is 8.

### Create React App is deprecated
**Create React App (CRA)** was the official starter for years. On 14 February 2025 the React team deprecated it: it had no active maintainers and could not deliver what production apps need (routing, data fetching, code splitting). It still exists on npm in maintenance mode, and installing it prints a deprecation notice, but you should not start new projects with it. Use a framework or Vite instead. Old tutorials that say `npx create-react-app` and `react-scripts start` are out of date.

**Common mistake:**
```bash
# Wrong: deprecated starter from old tutorials
npx create-react-app my-app
```
```bash
# Fixed: pick one
npm create vite@latest my-app -- --template react   # plain SPA, you add the rest
npx create-next-app@latest                          # Next.js framework
npx create-react-router@latest                      # React Router framework mode
```

## 12. React compared with Angular, Vue and Svelte
Interviewers ask this to see whether you can think in trade-offs. The table describes the general design of each. These projects change often, so check their docs before quoting a version or a feature.

| | React | Angular | Vue | Svelte |
|---|---|---|---|---|
| What it is | UI library | Full framework | Progressive framework (core plus official add-ons) | Compiler-based framework (SvelteKit adds routing and server features) |
| You write UI with | JSX (markup inside JavaScript) | HTML templates plus TypeScript classes | HTML-like templates in single-file components | HTML-like templates in `.svelte` files |
| Built in beyond the view | Little: state and context. Router, data and forms are separate | A lot: router, forms, HTTP client, dependency injection | Core only; official router and state libraries are separate packages | Core only; SvelteKit adds routing and more |
| How the screen updates | Re-runs components and diffs the result (virtual DOM) | Its own change detection over compiled templates | Tracks which reactive data a component reads and re-renders it; the template compiler skips static parts | Compiles components so they update the exact DOM nodes (no virtual DOM) |
| Language | JavaScript or TypeScript | TypeScript | JavaScript or TypeScript | JavaScript or TypeScript |
| Often chosen for | Flexible apps, the biggest ecosystem, many teams | Large teams that want one complete, opinionated toolkit | Teams that like templates and a gentle learning curve | Small bundles and simple code |

Solid is worth one sentence: it looks like React (JSX), but components run once and updates are fine grained, with no virtual DOM.

How to talk about this safely in an interview:
- Say what each tool does well. Never say "X is bad".
- Choose by context: team skills, hiring market, project type, ecosystem, SEO needs, time.
- Admit React's costs (choosing a stack, hooks learning curve). It shows judgement.
- Job listings favour React in many markets, but this differs by country and industry, so say "in many markets" and not "everywhere".

### A ready-made answer to "Why React?"
Say this in about a minute, in your own words:

> "I would pick React for three reasons. First, the programming model: I describe what the UI should look like for the current state, and React updates the DOM. That removes a whole class of bugs where the screen and the data disagree, and components keep code reusable and easy to test. Second, the ecosystem and the people: routing, data fetching, forms, testing, component libraries and frameworks like Next.js and React Router are mature, and it is easy to find developers, documentation and answers. Third, flexibility: React is a library, so I can adopt it in one page or build a whole app, and I choose the tools that fit. The trade-off is that I have to choose and maintain that stack, and hooks take time to learn well. Angular suits teams that want one complete, opinionated toolkit. Vue is a friendly, template-based option with an official ecosystem. Svelte is lean and compiles away much of the runtime. All of them can ship great products, so if the team already knows React or we need to hire quickly, React is my default."

Why this answer works: it leads with the model (not with hype), it is specific, it names a real trade-off, it respects the alternatives, and it ends by tying the choice to the team's context.

**Common mistake:**
```text
Wrong:  "React is the best because it is fast and everyone uses it."
Fixed:  "React fits when we want a flexible component model and a big ecosystem.
         The cost is that we choose our own stack. Here is how I would decide for this project..."
```

## 13. Pros and cons of React
Pros:
- **Declarative model:** you describe the UI for a state, so the screen and data cannot drift apart.
- **Components:** small, reusable, testable pieces.
- **Huge ecosystem and community:** libraries, docs, answers and jobs.
- **Flexible and gradual:** use it on one page of an old site, or for a whole app.
- **Runs on the server too:** server rendering and Server Components through frameworks.
- **Strong tooling:** DevTools, the `rules-of-hooks` lint rule, TypeScript, Testing Library.
- **Long-term stewardship:** since February 2026, React is owned by the React Foundation (hosted by the Linux Foundation) and no longer by Meta.

Cons:
- **Only the view:** you choose and maintain the rest of the stack, and projects differ from each other.
- **Learning curve:** hooks have rules, and effects and stale values confuse beginners.
- **Easy to render too much:** performance needs care (React Compiler helps a lot).
- **Fast-moving advice:** tutorials age quickly (CRA, class components, `ReactDOM.render`).
- **Client-only apps start blank and are harder for search engines;** a framework fixes this.
- **A fixed runtime cost:** the starter app ships about 69 kB gzipped of JavaScript before you write a line of your own.

## 14. React DevTools in five lines
1. Install the **React Developer Tools** extension for your browser (Chrome, Firefox or Edge).
2. Open the browser DevTools (F12) on a React page. Two tabs appear: **Components** and **Profiler**.
3. **Components** shows your component tree. Click a component to see its props, state and hooks, and edit them live to try things out.
4. In the Components settings, turn on **Highlight updates when components render**: colored boxes flash around whatever re-renders. This makes section 5 visible.
5. **Profiler**: press record, use the app, stop, and see which components rendered and how long each took. Use a development build for the most helpful names and warnings.

## 15. A short history of React
- **2013:** Facebook (now Meta) open-sources React. The big idea: UI as a function of state, with components.
- **2017 (React 16):** the core is rewritten (the engine is called Fiber). It is the foundation for later features.
- **February 2019 (React 16.8):** **hooks** arrive. Before this, state and lifecycle needed class components. Classes still exist but are **legacy** (see Legacy React (planned)).
- **Late 2020:** **Server Components** are shown as a research demo. They became stable with React 19, run only on the server, and frameworks such as Next.js use them. React 17 (October 2020) has no new features; it makes upgrading easier.
- **March 2022 (React 18):** `createRoot` and **concurrent rendering** (React can prepare updates without blocking the screen), automatic batching and Transitions.
- **December 2024 (React 19):** Actions and form hooks, the `use` API, `ref` as a normal prop, and metadata tags in components.
- **2025:** Create React App deprecated (February), React 19.1 (March), then React 19.2 (October: `Activity`, `useEffectEvent`) and **React Compiler 1.0** (October: automatic memoization).
- **February 2026:** the **React Foundation** takes over React from Meta.
- **September 2026 (React 19.3):** `<ViewTransition>` and Fragment refs become stable. **React 19.3.1** (October 2026) is the latest release on 10 November 2026.

Keep React up to date. In December 2025 a critical security advisory (CVE-2025-55182) was published for the server packages that implement Server Components. It did not affect apps that do not support Server Components, such as a plain client-side Vite app. Details in [Security](../04-advanced/10-security-and-i18n.md). For what changed in each 19.x version see [React 19 and newer](../04-advanced/04-react-19-and-newer.md).

## How interviewers test this
- **Plain-words explanation.** They want a clear one-minute answer to "what is React", not a memorised definition. A strong answer says library, components, declarative, and what is not included.
- **Honest virtual DOM answer.** Strong: tree of plain objects, diffing, only the changes reach the real DOM, and "it is not magic or free". Red flag: "it is a faster copy of the DOM" or "that is why React is fast".
- **Current knowledge.** Do you say `createRoot`, Vite or a framework, and "CRA is deprecated"? Red flags: `ReactDOM.render`, "start with create-react-app".
- **Fair comparison.** They test judgement, not loyalty. Strong answers tie the choice to team, project and trade-offs. Red flag: trashing other tools.
- **Boot and tooling basics.** Can you trace index.html to the first render, and say what StrictMode does and why logs run twice in development?
- **Follow-ups.** "What is state" leads to re-renders and keys, and "SPA" leads to SEO and SSR. Be ready to take one more step on every answer.

## Interview questions and model answers

### Q1. What is React, and what problem does it solve? (Easy)
React is a JavaScript library for building user interfaces out of small, reusable pieces called components. The problem it solves is keeping the screen in sync with your data. With plain DOM code you must find elements and update each one by hand every time the data changes, and it is easy to forget one. With React you describe what the UI should look like for the current data, and React updates the real DOM for you. It is a library, not a framework: it handles the view, and you add routing, data fetching and so on.

### Q2. What is the virtual DOM, and is it the reason React is fast? (Medium)
The virtual DOM is a lightweight description of the UI made of plain JavaScript objects (React elements). When state changes, React calls your components to get a new description, compares it with the previous one (diffing, called reconciliation), and applies only the differences to the real DOM. It is not a faster DOM and it is not free, because building and comparing objects takes time. Its real value is the programming model: you write declarative code and still get small DOM updates. React apps are fast when updates are batched and unnecessary work is avoided; Svelte and Solid have no virtual DOM and are also fast.

```jsx
const element = <h1 className="title">Hello</h1>
// element.type is "h1", element.props is { className: "title", children: "Hello" }
```

### Q3. What is the difference between declarative and imperative programming? (Easy)
Imperative code says how to do something step by step: find this element, set its text, toggle that button. Declarative code says what the result should be and leaves the steps to the tool. React is declarative: `<p>Count: {count}</p>` states what the screen shows for any value of `count`. The benefit is one source of truth (the state) and a screen computed from it, so you get fewer out-of-sync bugs. CSS and SQL are declarative too.

### Q4. What are props and state, and what is one-way data flow? (Easy)
Props are inputs a parent passes to a child. The child must treat them as read-only. State is data a component owns and remembers; you change it with a setter, and the change makes React re-render. One-way data flow means data moves down the tree through props. When a child needs a change, the parent passes it a function, and the child calls that function. This makes it easy to trace who owns each piece of data.

### Q5. Is React a library or a framework? (Easy)
React is a library. A library is code you call; a framework calls your code and prescribes the structure. React handles the view layer only. It has no router, no data-fetching client, no form validation and no build setup. Frameworks built on React, such as Next.js and React Router in framework mode, add those parts. The line is a little blurry today because the React docs recommend starting with a framework, but the `react` package itself is still a UI library.

### Q6. Why would you choose React over Angular, Vue or Svelte? (Medium)
I would explain the model first: declarative components that remove "screen out of sync" bugs. Then the ecosystem and hiring pool, and the flexibility of choosing my own tools. Then I would state the trade-off honestly: I must choose and maintain the stack, and hooks take time to learn. Angular fits teams that want one opinionated toolkit, Vue is a friendly template-based option, and Svelte is lean because it compiles away much of the runtime. The final choice depends on the team's skills and the project. (The full one-minute script is in section 12.)

### Q7. How would you start a new React project today? Is Create React App still fine? (Medium)
No. The React team deprecated Create React App on 14 February 2025 because it had no active maintainers and could not meet production needs. The React docs recommend starting with a framework, such as Next.js or React Router in framework mode, because it brings routing, data fetching and server rendering. If I want a plain client-side app, or I am learning, I use Vite: `npm create vite@latest my-app -- --template react`. With Vite I then pick my own router and data library.

### Q8. What is a single-page app, and what are its downsides? (Medium)
A single-page app loads one HTML page and then uses JavaScript to change the content and the URL without full reloads, which is client-side routing. It feels like an application and keeps state between screens. The downsides are a blank page until the JavaScript has downloaded and run, a heavier first load, and weaker handling by search engines and link-preview tools that read only the first HTML. The usual fix is server-side rendering or static generation through a framework such as Next.js, where the server sends ready HTML and React then hydrates it.

### Q9. What does StrictMode do, and why do my logs show twice? (Medium)
StrictMode is a development-only wrapper that adds extra checks. It calls component functions twice per render to reveal impure code, runs effects as setup, cleanup, setup on mount to reveal missing cleanup, and re-runs ref callbacks. It does nothing in a production build and shows nothing on screen. So double logs in development are expected and are not a bug. The right fix, if something breaks, is to make the component pure or to add the missing cleanup, not to remove StrictMode.

### Q10. Walk me through what happens when a React app loads in the browser. (Medium)
The server returns a small `index.html` with an empty root div and a script tag. The browser downloads the JavaScript bundle. The start-up file calls `createRoot` on the root div and then `render(<App />)`. React calls `App` and all the components below it, builds the DOM inside the div (replacing anything that was there), and the user sees the app. From then on, events change state, state changes trigger re-renders, and React applies only the differences to the DOM.

### Q11. Why does JSX need a build step, and what does it become? (Easy)
JSX is not valid JavaScript, and browsers cannot parse it. A build tool (Vite, or a compiler such as Babel or Oxc) rewrites it into function calls before the code reaches the browser. `<h1 className="title">Hi</h1>` becomes roughly `jsx('h1', { className: 'title', children: 'Hi' })` using `react/jsx-runtime`. Those calls return plain objects called React elements. Since React 17 you do not need to import React in each file for this to work.

### Q12. What makes a component re-render, and does a re-render change the DOM? (Medium)
A component re-renders when its own state changes, and by default also when its parent re-renders (React calls the children again). A re-render means React calls the component function and gets a new UI description. It does not mean the DOM changes. React compares the new description with the old one and updates the DOM only where they differ. For example, a child can run again with no DOM change at all. Reducing needless renders is a performance topic for later.

### Q13. What are the pros and cons of React, and when would you not choose it? (Medium)
Pros: declarative components, a huge ecosystem and community, flexibility, good tooling, and a path to server rendering. Cons: it is only the view layer, so you assemble the stack; hooks have a learning curve; performance needs care; and advice changes fast. I would think twice for a mostly static content site where a static site generator is simpler, or for a small team that wants one complete toolkit and prefers Angular. Even for content sites, a React framework with server rendering is often still fine.

### Q14. Svelte and Solid have no virtual DOM. Is the virtual DOM obsolete? (Hard)
No, it is a trade-off. Svelte compiles components into code that updates the exact DOM nodes when a variable changes. Solid tracks which expressions read which signals and re-runs only those. Neither needs to diff. React's model (re-run the component, diff the output) is simple for developers to reason about: components are plain functions of state. It also separates "what to show" from "where to show it", so React can render to the server and to other targets. The price is extra work at runtime, which React reduces with batching, Transitions, and the opt-in React Compiler (version 1.0 since October 2025), which memoizes automatically.

### Q15. How do you use React DevTools? (Easy)
It is a browser extension that adds two tabs. The Components tab shows the component tree, and for each component its props, state and hooks, which you can edit live. I turn on "Highlight updates when components render" to see what re-renders after an action. The Profiler tab records an interaction and shows, for each commit, which components rendered and how long each took. I use it to find unnecessary renders before I think about optimising.

## Common mistakes and gotchas
- **Calling React a framework.** Say "UI library"; Next.js and React Router (framework mode) are frameworks built on it.
- **"The virtual DOM is why React is fast."** Explain what it does (describe, diff, apply changes) and admit it costs work.
- **Using `ReactDOM.render` from old tutorials.** It is gone in React 19: use `createRoot(...).render(...)`.
- **Starting a new project with Create React App.** It is deprecated: use a framework or `npm create vite@latest`.
- **A root id that does not match `index.html`.** You get "Target container is not a DOM element": use the same id in both places.
- **Editing the DOM by hand inside components.** React will fight your edit: put the data in state (use a ref only for things like focus).
- **Using a plain variable for changing data.** The screen will not update: use `useState`.
- **Thinking a re-render equals a DOM update.** The DOM changes only where the new description differs.
- **Writing to props.** React freezes them in development: compute a new value, or call a function prop.
- **A lowercase component name.** `<greeting />` is an HTML tag: start component names with a capital letter.
- **Removing StrictMode to hide double logs.** It is a development check: fix the impurity instead.
- **Opening `index.html` by double-click.** Browsers cannot run JSX: use `npm run dev`.
- **Getting a 404 on refresh after deploying an SPA.** Make the host fall back to `index.html` for unknown paths.
- **Trusting a tutorial without checking its date.** Check that it uses `createRoot`, Vite or a framework, and hooks.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Label each line as imperative or declarative: (a) `list.appendChild(li)`, (b) `<ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>`, (c) `button.disabled = true`, (d) the CSS rule `p { color: red }`, (e) the SQL `SELECT name FROM users WHERE age > 30`, (f) `<button disabled={count === 0}>`.

<details>
<summary>Show answer</summary>

(a) imperative: you issue a command to change the DOM. (b) declarative: it states what the list looks like for `items`. (c) imperative: a command that changes one property. (d) declarative: you say what you want, the browser decides how. (e) declarative: you describe the result, the database decides how to get it. (f) declarative: the button's state is computed from `count`. Lines (c) and (f) do almost the same job, but (c) is a step you execute, while (f) is a rule React applies on every render.

</details>

2. **(Easy)** Coding task: In a fresh Vite project, type (do not paste) the React `Counter` from section 2 into `src/App.jsx`. Add a `+10` button. Check that `-1` is disabled at 0 and that `Reset` works. Then try the practice-app exercise [01 Counter](../practice-app/exercises/react/01-counter/README.md).

<details>
<summary>Show answer</summary>

Add one line next to the other buttons:

```jsx
<button onClick={() => setCount(count + 10)}>+10</button>
```

You only changed data. You did not touch `-1`'s `disabled` state, yet it updates by itself, because it is computed from `count`. That is the point of the exercise: compare it with how many places you would edit in the imperative version.

</details>

3. **(Easy)** Predict: you click the button below three times. What does the button say afterwards, and what does the console log? Then fix it.

```jsx
function Counter() {
  let count = 0
  return (
    <button onClick={() => { count = count + 1; console.log(count) }}>
      Count: {count}
    </button>
  )
}
```

<details>
<summary>Show answer</summary>

The button still says `Count: 0`. The console logs `1`, `2`, `3`. Why: `count` is a normal variable, and changing it does not tell React to render again. Even if React rendered for another reason, the function would run again and create a fresh `count = 0`. Fix: `const [count, setCount] = useState(0)` and `onClick={() => setCount(count + 1)}`.

</details>

4. **(Easy)** Coding task: convert this imperative snippet to a React component with the same behaviour.

```html
<button id="toggle">Show</button>
<p id="secret" hidden>Secret message</p>
<script>
  const button = document.getElementById('toggle')
  const secret = document.getElementById('secret')
  button.addEventListener('click', () => {
    const wasHidden = secret.hidden
    secret.hidden = !wasHidden
    button.textContent = wasHidden ? 'Hide' : 'Show'
  })
</script>
```

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

export default function Toggle() {
  const [shown, setShown] = useState(false)

  return (
    <div>
      <button onClick={() => setShown(!shown)}>{shown ? 'Hide' : 'Show'}</button>
      {shown && <p>Secret message</p>}
    </div>
  )
}
```

We ran it. At first the page is `<div><button>Show</button></div>`. After a click it is `<div><button>Hide</button><p>Secret message</p></div>`, and after a second click it is back to the first form. The paragraph is not rendered at all while hidden (the original only hid it). The state is one boolean, and both the button label and the paragraph are computed from it.

</details>

5. **(Medium)** Predict the console output (no StrictMode): on mount, after the first click, and after the second click. Which DOM changes happen on the first click?

```jsx
import { useState } from 'react'

function Row({ label }) {
  console.log('Row', label)
  return <li>{label}</li>
}

export default function List() {
  const [open, setOpen] = useState(false)
  console.log('List, open =', open)

  return (
    <div>
      <button onClick={() => setOpen(!open)}>{open ? 'Close' : 'Open'}</button>
      <ul>
        <Row label="A" />
        {open && <Row label="B" />}
      </ul>
    </div>
  )
}
```

<details>
<summary>Show answer</summary>

We ran it. Mount: `List, open = false`, `Row A`. First click: `List, open = true`, `Row A`, `Row B`. Second click: `List, open = false`, `Row A`. On the first click the DOM gets exactly two changes: the button's text changes from `Open` to `Close`, and a new `<li>` for B is inserted into the `<ul>`. `Row A` ran again (its function was called) but its `<li>` was not touched. Render is not the same as a DOM update. In development with StrictMode, every line would appear twice.

</details>

6. **(Medium)** Coding task (browser console): run the `Counter` in your Vite project. Paste this into the console, then click `+1` twice. How many records does the observer print each time, and of which types?

```js
const root = document.getElementById('root')
const observer = new MutationObserver((records) => {
  console.log(records.map((r) => r.type))
})
observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true })
```

<details>
<summary>Show answer</summary>

First click (0 to 1): `['characterData', 'attributes']`. One record is the changed text of the count; the other is the `disabled` attribute being removed from `-1`. Second click (1 to 2): `['characterData']`, because only the text changes (the `-1` button stays enabled). We ran this with and without StrictMode and got the same records: React touches the page only where the description differs. Nothing is replaced, so focus and typed text survive.

</details>

7. **(Medium)** Coding task: in your Vite project, make `App` log `render` and add an effect that logs `effect setup` and `effect cleanup`. Look at the console. Then remove `<StrictMode>` in `main.jsx`, reload, and compare. Explain the difference.

```jsx
import { useEffect } from 'react'

export default function App() {
  console.log('render')
  useEffect(() => {
    console.log('effect setup')
    return () => console.log('effect cleanup')
  }, [])
  return <h1>Hello</h1>
}
```

<details>
<summary>Show answer</summary>

With StrictMode (development): `render`, `render`, `effect setup`, `effect cleanup`, `effect setup`. Without StrictMode: `render`, `effect setup`. StrictMode renders twice to check purity, and runs the effect once, cleans it up and runs it again to check that cleanup really undoes setup. Both happen in development only, so a production build behaves like the second list. Put StrictMode back after the experiment.

</details>

8. **(Medium)** Explain: a teammate says "React is fast because of the virtual DOM". Write a short, polite reply.

<details>
<summary>Show answer</summary>

A model reply: "The virtual DOM is a tree of plain objects that describes the UI. React diffs the new tree against the old one and updates only what changed. That gives us a declarative model with reasonably small DOM updates, but it does cost work: React builds and compares objects. A hand-tuned DOM update can be faster, and Svelte and Solid are fast without a virtual DOM. React apps get fast by batching updates, avoiding needless renders, splitting code and using Transitions, so I would describe the virtual DOM as the mechanism that makes the declarative style practical, not as the source of speed."

</details>

9. **(Medium)** Explain: you must build a marketing site that has to rank in search engines and load quickly on slow phones. Do you use a plain Vite SPA or a framework? Why?

<details>
<summary>Show answer</summary>

A framework with server rendering or static generation, such as Next.js or React Router in framework mode. A plain Vite SPA sends an almost empty HTML page and shows nothing until all the JavaScript has downloaded and run, which hurts first load on slow phones and gives search engines and link previews less to read. A framework can send ready HTML (SSR or SSG) and then hydrate it, and it gives routing and code splitting for free. For a very simple site, a static site generator without much client-side JavaScript could be even lighter.

</details>

10. **(Hard)** Predict and explain: what happens when this component renders in development, and how do you fix it?

```jsx
function Welcome(props) {
  props.name = props.name.toUpperCase()
  return <p>Welcome, {props.name}</p>
}

// <Welcome name="ada" />
```

<details>
<summary>Show answer</summary>

It throws `TypeError: Cannot assign to read only property 'name' of object '#<Object>'` (we ran it). In development React freezes the props object, and props are read-only by contract in every build: a child must never change what its parent gave it, which is what keeps data flow one-way and predictable. Fix: compute a new value, as in `const name = props.name.toUpperCase()`. If the child needs the parent's data to change, the parent passes down a function and the child calls it.

</details>

11. **(Hard)** Design discussion: a teammate proposes rewriting a 40-page, server-rendered website in React "because it is modern". Give a balanced answer and a safer plan.

<details>
<summary>Show answer</summary>

Ask what problem the rewrite solves. React helps most where pages hold interactive, stateful UI (dashboards, editors, complex forms). It brings costs: a client-side JavaScript bundle, a new build pipeline, and the risk of losing SEO and fast first paint if everything becomes a client-rendered SPA. A rewrite also freezes feature work and risks regressions. A safer plan: adopt React gradually, one interactive widget or page at a time, mounted into the existing pages with `createRoot` on a single element, and keep server rendering for content pages. If most of the site is content and some of it is interactive, a React framework with server rendering lets you keep SEO and speed while sharing components. Measure before and after (load time, Core Web Vitals), and keep a rollback path.

</details>

## Recap
- React is a UI library for building interfaces from components; it does not include routing, data fetching, form validation or a build tool.
- Declarative code describes what the UI looks like for the current state; imperative code lists the steps. React lets you write the first kind, with one source of truth.
- Props flow down from parent to child and are read-only; children ask for changes by calling functions the parent passes down. State is data a component owns, and changing it re-renders.
- A render is React calling your function; only the differences between the old and new descriptions reach the real DOM.
- The virtual DOM is a tree of plain objects that React diffs. It gives a declarative model; it is not a faster DOM and not the reason React is fast.
- A React app starts from `index.html` with a root div, then `createRoot(root).render(<App />)`; StrictMode adds development-only checks (double render, double effects).
- JSX needs a build step (Vite compiles it). Start new projects with a framework (Next.js, React Router) or `npm create vite@latest`; Create React App is deprecated.
- Compare React with Angular, Vue and Svelte by trade-offs and context, and give a clear "Why React?" answer.

## Where to go next
- Next lesson: [JSX](03-jsx.md), then [Components and props](04-components-and-props.md) and [State and events](05-state-and-events.md).
- How rendering really works: [How React renders](../04-advanced/01-how-react-renders.md).
- Quiz yourself: [Round 1 screening quiz](../05-interview-rounds/round-1-screening-quiz/README.md) and its basics questions (planned).
- Practice app: [01 Counter](../practice-app/exercises/react/01-counter/README.md). Set-up help: [Set up your playground](../00-start-here/02-setup-your-playground.md).
- Terms in one place: Glossary (planned).
