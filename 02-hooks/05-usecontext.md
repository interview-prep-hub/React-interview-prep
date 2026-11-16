# useContext and the Context API

> **Level:** Intermediate   **Time:** about 50 minutes   **Read first:** [Components and props](../01-basics/04-components-and-props.md), [useState in depth](02-usestate-in-depth.md)

## What you will learn
- Explain what prop drilling is, why it hurts, and what to try before you reach for context.
- Create a context, provide a value, and read it with `useContext` and with `use` (React 19).
- Build a theme toggle and an auth provider where the context value holds state and functions to change it.
- Predict exactly which components re-render when a context value changes, and why `memo` does not stop it.
- Fix context performance problems: memoized values, small providers that take `children`, and split contexts.
- Write a custom hook with a missing-provider guard, test components that need a provider, and choose between props, composition, context and a state library.

## 1. The problem: prop drilling

In React, data flows down. A parent gives data to a child through **props**. That is simple and clear. The trouble starts when a component deep in the tree needs data that lives far above it. Every component in between must accept the prop and pass it on, even if it never uses it. This is called **prop drilling**, like a drill bit that has to go through many layers to reach the bottom.

Here is a tree four levels deep. Only `UserBadge` needs `userName`. Look at what `Page` and `Header` have to do.

```text
App          (owns userName)
  Page       (does not use it, only passes it down)
    Header   (does not use it, only passes it down)
      UserBadge   (the only one that shows it)
```

```jsx
import { useState } from 'react'

function UserBadge({ userName }) {
  return <div>Signed in as {userName}</div>
}

function Header({ userName }) {
  return (
    <header>
      <h1>My Shop</h1>
      <UserBadge userName={userName} />
    </header>
  )
}

function Page({ userName }) {
  return (
    <main>
      <Header userName={userName} />
      <p>Welcome to the shop.</p>
    </main>
  )
}

export default function App() {
  const [userName] = useState('Asha') // pretend this came from a login
  return <Page userName={userName} />
}
```

**What happens, step by step:**
1. `App` renders `Page` and passes `userName="Asha"`.
2. `Page` does not use it. It only hands it to `Header`.
3. `Header` does not use it either. It hands it to `UserBadge`.
4. `UserBadge` finally uses it. The page shows `My Shop`, then `Signed in as Asha`, then `Welcome to the shop.`

Why this hurts as the app grows:
- `Page` and `Header` carry a prop they do not care about. They are harder to read and harder to reuse.
- Adding a second shared value (say `theme`) means editing every component on the path again.
- Renaming the prop means editing all of them. Forgetting one link silently gives you `undefined`.

Do not overreact. Passing a prop through one or two levels is normal, explicit and easy to follow. Fix drilling when it starts to hurt. The options, in the order to try them:
1. Move the state closer to where it is used.
2. Pass finished elements down instead of data (composition, see section 15).
3. Use **context** (the rest of this lesson).
4. For big, fast-changing shared state, use a state library (section 14).

**Common mistake:** "fixing" drilling with a plain variable outside React.

```jsx
// Wrong: React does not know this variable changed, so nothing re-renders
let currentUser = 'Guest'

function UserBadge() {
  return <div>Signed in as {currentUser}</div>
}

export default function App() {
  return (
    <div>
      <button onClick={() => { currentUser = 'Asha' }}>Log in</button>
      <UserBadge />
    </div>
  )
}
```

After you click the button, the variable is `'Asha'`, but the screen still says `Signed in as Guest`. React only updates the screen when it re-renders, and it re-renders when state changes. Changing a plain variable does nothing. Fix: keep the value in state and share it with context (next section).

## 2. Context in three steps

A **context** is a channel that carries one value down the component tree. A component high up **provides** the value. Any component below it, however deep, can **read** it. The components in between do not need to know anything about it.

An analogy: a notice board in the lobby of a building. Anyone who works inside the building can read it. The people on the floors in between do not carry the message from door to door. And the board only serves people inside that building, not people outside. In React, "the building" is everything rendered inside the provider.

There are three steps:
1. **Create** the context with `createContext(defaultValue)`. Do this once, outside any component.
2. **Provide** a value with `<MyContext value={...}>`. Everything inside it can read the value.
3. **Read** the value in any component inside, with `useContext(MyContext)`.

New words: a **provider** supplies the value. A **consumer** is a component that reads it. A **subtree** is a component and everything rendered inside it.

Here is the same shop, without drilling:

```jsx
import { createContext, useContext } from 'react'

// Step 1: create the context
const UserContext = createContext('Guest')

function UserBadge() {
  // Step 3: read the value
  const userName = useContext(UserContext)
  return <div>Signed in as {userName}</div>
}

function Header() {
  return (
    <header>
      <h1>My Shop</h1>
      <UserBadge />
    </header>
  )
}

function Page() {
  return (
    <main>
      <Header />
      <p>Welcome to the shop.</p>
    </main>
  )
}

export default function App() {
  // Step 2: provide a value to everything inside
  return (
    <UserContext value="Asha">
      <Page />
    </UserContext>
  )
}
```

**What happens, step by step:**
1. `createContext('Guest')` makes a context object. `'Guest'` is its default value (section 3).
2. `App` renders `<UserContext value="Asha">`. Everything inside it now has `"Asha"` available.
3. `Page` and `Header` render with no props. They know nothing about the user.
4. `UserBadge` calls `useContext(UserContext)`. React looks up the tree for the nearest `UserContext` provider and returns its value, `"Asha"`.
5. The output is the same as before: `My Shop`, `Signed in as Asha`, `Welcome to the shop.` The middle components are now clean.

In a real project, the context lives in its own file and is imported by the provider and by the consumers. This lesson keeps small examples in one file to save space.

**Common mistake:** the consumer is not inside the provider.

```jsx
// Wrong: the provider is closed before Page, so Page is outside it
export default function App() {
  return (
    <>
      <UserContext value="Asha" />
      <Page />
    </>
  )
}

// Fixed: Page is inside the provider
export default function App() {
  return (
    <UserContext value="Asha">
      <Page />
    </UserContext>
  )
}
```

With the wrong version the badge says `Signed in as Guest`, the default value. No error appears, so this bug is easy to miss. Only components rendered inside the provider see its value.

## 3. The default value

`createContext('Guest')` takes one argument, the **default value**. It has a very narrow job: React uses it only when a component reads the context and there is **no provider above it**.

It is not an initial state. It never changes, and nothing re-renders because of it. Think of it as a fallback for "nobody provided anything".

```jsx
import { createContext, useContext } from 'react'

const ThemeContext = createContext('light')

function Label() {
  const theme = useContext(ThemeContext)
  return <p>Theme: {String(theme)}</p>
}
```

Here is what `Label` prints in four situations. Each one was run on React 19.3.1.

| What you render | What `Label` prints |
|---|---|
| `<Label />` with no provider | `Theme: light` |
| `<ThemeContext value="dark"><Label /></ThemeContext>` | `Theme: dark` |
| `<ThemeContext value={undefined}><Label /></ThemeContext>` | `Theme: undefined` |
| `<ThemeContext value={null}><Label /></ThemeContext>` | `Theme: null` |

**What happens, step by step:**
1. With no provider, React finds nothing above `Label`, so it returns the default, `'light'`.
2. With a provider, React returns the provider's value. The default is ignored.
3. A provider whose value is `undefined` still counts as a provider. The consumer gets `undefined`, not `'light'`.

The third row is the one people get wrong. The default is only for "no provider at all", never for "provider with an empty value".

**Common mistake:** passing a value that can be `undefined`.

```jsx
// Wrong: if settings.theme is missing, every consumer gets undefined, not 'light'
<ThemeContext value={settings.theme}>{children}</ThemeContext>

// Fixed: provide your own fallback
<ThemeContext value={settings.theme ?? 'light'}>{children}</ThemeContext>
```

How to choose a default:
- **A safe fallback** (`'light'`, `'en'`, a no-op function) makes a component work on its own, for example in a test or a UI catalogue, with no provider.
- **`null`** says "a provider is required". You then add a guard that throws a clear error (section 7). This is the usual choice for state and functions.

## 4. Provider syntax, nesting and old forms

### 4.1 The React 19 syntax

Since React 19, the context object itself is the provider. You write `<ThemeContext value={...}>`. Before 19 you wrote `<ThemeContext.Provider value={...}>`. Both work in React 19.3.1, but the docs call the `.Provider` form legacy, so use the short form in new code. There is a codemod that converts old code, so you do not have to rewrite it by hand.

### 4.2 The nearest provider wins

Providers can be nested. A component reads the value of the **closest** provider above it.

```jsx
import { createContext, useContext } from 'react'

const ThemeContext = createContext('light')

function Panel({ name }) {
  const theme = useContext(ThemeContext)
  return <p>{name}: {theme}</p>
}

export default function App() {
  return (
    <ThemeContext value="dark">
      <Panel name="A" />
      <ThemeContext value="blue">
        <Panel name="B" />
      </ThemeContext>
      <Panel name="C" />
    </ThemeContext>
  )
}
```

**What happens, step by step:**
1. `Panel A` has one provider above it, the `"dark"` one. It prints `A: dark`.
2. `Panel B` has two providers above it. The inner one (`"blue"`) is closest, so it wins: `B: blue`.
3. `Panel C` is outside the inner provider. Only the `"dark"` one is above it: `C: dark`.

This is how you build "a dark box inside a light page", or a component that tells its children how deep they are nested.

### 4.3 Context follows the React tree, not the DOM tree

If a component renders a modal with `createPortal`, the modal's DOM nodes live somewhere else in the page. But in React's tree they are still children of the component that rendered them. They see the same providers.

### 4.4 Old code you may meet

You will see these forms in older code bases. They still work in React 19.3.1.

```jsx
import { Component, createContext } from 'react'

const ThemeContext = createContext('light')

// 1. The old provider form
function OldProvider({ children }) {
  return <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>
}

// 2. Consumer: a render prop that receives the value
function OldConsumer() {
  return <ThemeContext.Consumer>{(theme) => <p>Consumer sees {theme}</p>}</ThemeContext.Consumer>
}

// 3. Class components read one context through static contextType
class Box extends Component {
  static contextType = ThemeContext
  render() {
    return <p>Class sees {this.context}</p>
  }
}
```

Inside a `<ThemeContext value="dark">`, `OldConsumer` prints `Consumer sees dark` and `Box` prints `Class sees dark`. In a function component, always prefer `useContext(ThemeContext)`. The even older "legacy context" (`contextTypes`, `getChildContext`) was removed in React 19.

**Common mistake:** creating the context inside a component.

```jsx
// Wrong: this would make a brand new context object on every render
function ThemeProvider({ children }) {
  const ThemeContext = createContext('light')
  return <ThemeContext value="dark">{children}</ThemeContext>
}

// Fixed: create it once, at module level (top of the file)
const ThemeContext = createContext('light')
function ThemeProvider({ children }) {
  return <ThemeContext value="dark">{children}</ThemeContext>
}
```

Consumers must import the same context object that the provider uses. A context created inside a component can never be shared.

## 5. Reading context conditionally with use(Context)

React 19 adds `use`. Given a context, `use(MyContext)` returns the same value as `useContext(MyContext)`. The difference is the rules. `useContext` is a hook, so it must run at the top level of the component, on every render, in the same order. `use` is not a hook. It may be called inside `if`, inside loops, and **after an early `return`**.

```jsx
import { createContext, use, useState } from 'react'

const CurrencyContext = createContext('USD')

function Price({ amount, hidden }) {
  if (hidden) {
    return <span>Price hidden</span>
  }
  const currency = use(CurrencyContext) // allowed after an early return
  return <span>{amount} {currency}</span>
}

export default function App() {
  const [currency, setCurrency] = useState('USD')
  const [hidden, setHidden] = useState(false)
  return (
    <CurrencyContext value={currency}>
      <button onClick={() => setCurrency((c) => (c === 'USD' ? 'EUR' : 'USD'))}>Change currency</button>
      <button onClick={() => setHidden((h) => !h)}>Toggle hidden</button>
      <Price amount={20} hidden={hidden} />
    </CurrencyContext>
  )
}
```

**What happens, step by step:**
1. First render: `hidden` is false, so `Price` reaches `use(CurrencyContext)`. The page shows `20 USD`.
2. Click "Toggle hidden": `Price` returns early. It shows `Price hidden` and never calls `use`.
3. Click "Change currency" while hidden: nothing visible changes (still `Price hidden`).
4. Click "Toggle hidden" again: `Price` reads the context again and shows `20 EUR`, the latest value.

There is one more benefit. A component only subscribes to a context if it read it in its **latest render**. In a check where the provider owns the state and `Price` is passed in as `children`, a currency change re-rendered `Price` once when it read the context, and zero times when it had returned early.

Rules to remember:
- `use` cannot be called inside a `try`/`catch` block.
- `use` reading a context is not supported in Server Components (see section 14).
- Both `useContext` and `use` read the context the same way. Choose `useContext` by default, and `use` when you need the condition.

**Common mistake:** calling `useContext` after an early return.

```jsx
// Wrong: breaks the Rules of Hooks (the hook is skipped on some renders)
function Price({ amount, hidden }) {
  if (hidden) return <span>Price hidden</span>
  const currency = useContext(CurrencyContext)
  return <span>{amount} {currency}</span>
}

// Fixed, option 1: read the context first, then return early
function Price({ amount, hidden }) {
  const currency = useContext(CurrencyContext)
  if (hidden) return <span>Price hidden</span>
  return <span>{amount} {currency}</span>
}

// Fixed, option 2: use `use`, which may come after a condition
```

The rules-of-hooks lint rule reports the wrong version. Read the [hooks rules lesson](01-hooks-overview-and-rules.md) if you want to know why hooks must run in a fixed order.

## 6. Updating context: put state and a setter in the value

A context has no setter of its own. It only carries whatever value the provider gives it. To make the value change, the provider must hold **state**. When the state changes, the provider re-renders and passes a new value. To let other components trigger the change, put a function in the value too.

The pattern has three parts:
1. A **provider component** that owns the state (`useState` or `useReducer`).
2. A **value** that holds the state and the functions that change it.
3. **Consumers** that read the value and call the functions.

A complete theme toggle. Paste it into `App.jsx` of a Vite React app.

```jsx
import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext(null)

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')

  function toggleTheme() {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }

  return <ThemeContext value={{ theme, toggleTheme }}>{children}</ThemeContext>
}

const palette = {
  light: { background: '#ffffff', color: '#111111' },
  dark: { background: '#111111', color: '#f5f5f5' },
}

function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext)
  return (
    <button onClick={toggleTheme}>
      Switch to {theme === 'light' ? 'dark' : 'light'} mode
    </button>
  )
}

function Card() {
  const { theme } = useContext(ThemeContext)
  return (
    <section style={{ ...palette[theme], padding: 16, borderRadius: 8 }}>
      <h2>Current theme: {theme}</h2>
      <ThemeToggle />
    </section>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <Card />
    </ThemeProvider>
  )
}
```

**What happens, step by step:**
1. `App` renders `ThemeProvider`. The provider calls `useState('light')`.
2. The provider renders `<ThemeContext value={{ theme: 'light', toggleTheme }}>` with `Card` inside as its `children`.
3. `Card` reads the value and shows `Current theme: light` on a white background. `ThemeToggle` reads it too and shows `Switch to dark mode`.
4. You click the button. `toggleTheme` calls `setTheme`. That state belongs to `ThemeProvider`, so `ThemeProvider` re-renders.
5. It creates a new value, `{ theme: 'dark', toggleTheme }`. React sees the value changed and re-renders every component that reads `ThemeContext`: `Card` and `ThemeToggle`.
6. The screen now shows `Current theme: dark`, a near-black background, and `Switch to light mode`.

Notice step 5. `Card` re-renders because it **reads the context**, not because its parent re-rendered. (Its element comes from `App` as `children`, so React could skip it otherwise.) Section 9 builds on this.

**Common mistake:** a plain variable instead of state.

```jsx
// Wrong: clicking changes a local variable, but React is never told to re-render
function ThemeProvider({ children }) {
  let theme = 'light'
  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light'
  }
  return <ThemeContext value={{ theme, toggleTheme }}>{children}</ThemeContext>
}

// Fixed: use state, as in the example above
const [theme, setTheme] = useState('light')
```

With the wrong version, clicking the button never changes the screen: the theme stays `light` forever. And even if something else made the provider re-render, `theme` would reset to `'light'`, because the variable is created again on every render. Anything that must change what the user sees has to be state.

## 7. A custom hook with a missing-provider guard (useTheme)

In the last example, the default is `null`. If someone uses `Card` without a `ThemeProvider`, `useContext` returns `null`, and the destructuring crashes with an error that starts like this (the exact words depend on your browser):

```text
Cannot destructure property 'theme' of ... as it is null.
```

That message does not say what is wrong. The fix is a small **custom hook** that reads the context and throws a clear error when the provider is missing.

```jsx
// theme.jsx
import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')

  function toggleTheme() {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }

  return <ThemeContext value={{ theme, toggleTheme }}>{children}</ThemeContext>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (value === null) {
    throw new Error('useTheme must be used inside a <ThemeProvider>')
  }
  return value
}
```

Now the consumers do not touch `ThemeContext` at all:

```jsx
// App.jsx
import { ThemeProvider, useTheme } from './theme.jsx'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return <button onClick={toggleTheme}>Switch to {theme === 'light' ? 'dark' : 'light'} mode</button>
}

export default function App() {
  return (
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  )
}
```

**What happens, step by step:**
1. `theme.jsx` exports only the provider and the hook. The context object stays private.
2. `useTheme` calls `useContext`. Inside a provider it returns the value object.
3. Outside a provider it returns the default, `null`. The guard sees `null` and throws `useTheme must be used inside a <ThemeProvider>`. You find the mistake in seconds.
4. In TypeScript, the guard also narrows the type from `Theme | null` to `Theme`, so consumers never deal with `null`. See the [TypeScript lesson](../03-intermediate/08-typescript-with-react.md).

Why this is the standard way to write context:
- A clear error message instead of a confusing crash.
- A small public API: `ThemeProvider` and `useTheme`. You can change how the context works inside without touching consumers.
- One place to add logic later (for example, `useTheme` could return extra helpers).

**Common mistake:** a guard that uses a falsy check.

```jsx
// Wrong: if the value is legitimately 0, '' or false, the guard throws
const value = useContext(CountContext)
if (!value) throw new Error('useCount must be used inside a <CountProvider>')

// Fixed: compare with null explicitly
if (value === null) throw new Error('useCount must be used inside a <CountProvider>')
```

With a provider value of `0`, the wrong version throws the "must be used inside" error even though the provider exists. The right version shows `Count: 0`.

## 8. A second example: the current user and login

Auth is the other classic use of context. Many components need to know who is signed in: the navbar, the dashboard, a "Delete" button. This example is deliberately simple, with a fake login. Paste it into `App.jsx`.

```jsx
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  function login(name) {
    setUser({ name })
  }

  function logout() {
    setUser(null)
  }

  return <AuthContext value={{ user, login, logout }}>{children}</AuthContext>
}

function useAuth() {
  const value = useContext(AuthContext)
  if (value === null) {
    throw new Error('useAuth must be used inside an <AuthProvider>')
  }
  return value
}

function LoginForm() {
  const { login } = useAuth()
  const [name, setName] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (name.trim() !== '') {
      login(name.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button type="submit">Log in</button>
    </form>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  return (
    <div>
      <span>Hello, {user.name}</span> <button onClick={logout}>Log out</button>
    </div>
  )
}

function Navbar() {
  const { user } = useAuth()
  return <nav>{user ? <UserMenu /> : <p>Please log in.</p>}</nav>
}

function Shell() {
  const { user } = useAuth()
  return (
    <>
      <Navbar />
      {user ? <h2>Dashboard for {user.name}</h2> : <LoginForm />}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
```

**What happens, step by step:**
1. `AuthProvider` starts with `user = null`. `Navbar` shows `Please log in.` and `Shell` shows the login form.
2. You type a name. The text lives in `LoginForm`'s own state. Typing does not touch the context.
3. You submit. `login('Asha')` runs `setUser({ name: 'Asha' })` inside the provider.
4. The provider re-renders with a new value. Every component that reads `AuthContext` re-renders: `Navbar` now shows `Hello, Asha` and a "Log out" button, and `Shell` shows `Dashboard for Asha`.
5. "Log out" calls `setUser(null)` and the screen returns to step 1.

Two design points:
- **Keep drafts local.** The input text is only needed by the form, so it stays in the form's `useState`. Put in context only what other components need.
- **Context is for the interface, not for security.** Hiding a button for logged-out users is a convenience. The server must still check permissions. For tokens, cookies and real login flows, see APIs, HTTP and auth (planned).

**Common mistake:** reading `user.name` when `user` can be `null`.

```jsx
// Wrong: crashes while nobody is logged in
function Greeting() {
  const { user } = useAuth()
  return <h2>Hello, {user.name}</h2>
}

// Fixed: handle the logged-out case
function Greeting() {
  const { user } = useAuth()
  return <h2>Hello, {user ? user.name : 'guest'}</h2>
}
```

The wrong version throws `Cannot read properties of null (reading 'name')`. The provider can tell you a user may not exist. You still have to handle it where you read it.

This provider has a hidden performance problem: its value is a new object on every render. The next section explains it and gives the fix.

## 9. How re-rendering works with context

### 9.1 The rules

When a provider re-renders, React compares the old `value` with the new `value` using `Object.is`. This is the same check used for dependency arrays: primitives are compared by value, and objects, arrays and functions are compared by identity (same object in memory).

1. If the value is **the same** (`Object.is` says so), consumers do not re-render because of the context.
2. If the value is **different**, every component that read the context re-renders. This holds for both `useContext` and `use`.
3. There are **no partial subscriptions**. A component that only uses `name` still re-renders when only `count` changed, because the whole value changed. Context has no selectors.
4. Components that do **not** read the context are not re-rendered because of it. They may still re-render for normal reasons, such as their parent re-rendering.
5. `React.memo` does **not** block a context update. Memo compares props. Context is not a prop.

Each component remembers which contexts it read. When a provider's value changes, React finds those components and schedules them to render. For the deep details, see the internals lesson (planned).

### 9.2 Seeing it with logs

Three consumers. `NameLabel` uses only `name`. `CountButton` uses `count` and `setCount`. `StaticText` does not read the context.

```jsx
import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

function AppProvider({ children }) {
  const [name] = useState('Asha')
  const [count, setCount] = useState(0)
  return <AppContext value={{ name, count, setCount }}>{children}</AppContext>
}

function NameLabel() {
  const { name } = useContext(AppContext)
  console.log('NameLabel rendered')
  return <p>Name: {name}</p>
}

function CountButton() {
  const { count, setCount } = useContext(AppContext)
  console.log('CountButton rendered')
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>
}

function StaticText() {
  console.log('StaticText rendered')
  return <p>I do not use context.</p>
}

export default function App() {
  return (
    <AppProvider>
      <NameLabel />
      <CountButton />
      <StaticText />
    </AppProvider>
  )
}
```

Console output, measured on React 19.3.1:

```text
On mount:
NameLabel rendered
CountButton rendered
StaticText rendered

After one click on the button:
NameLabel rendered
CountButton rendered
```

**What happens, step by step:**
1. Mount: all three render once.
2. Click: `setCount` changes state inside `AppProvider`. The provider builds a new value object.
3. The value changed, so every reader re-renders. `CountButton` needs the new `count`. `NameLabel` re-renders too, even though `name` did not change, because there are no selectors.
4. `StaticText` does not read the context. Its element was created in `App`, which did not re-render, so React reuses it and skips it.

In development with StrictMode, every line appears twice. That is React checking your components. It is not extra real work and does not happen in production.

### 9.3 The pitfall: a new object on every render

An object literal in JSX, like `value={{ name: 'Asha' }}`, creates a **new object every time that component renders**. Even if the contents are the same, `Object.is(oldObject, newObject)` is `false`. So every consumer re-renders every time the component that renders the provider re-renders.

Here the provider sits in `App`, next to a search box that changes on every keystroke. `NameLabel` is wrapped in `memo`, so you might expect it to be safe.

```jsx
import { createContext, memo, useContext, useState } from 'react'

const UserContext = createContext(null)

const NameLabel = memo(function NameLabel() {
  const user = useContext(UserContext)
  console.log('NameLabel rendered')
  return <p>Name: {user.name}</p>
})

export default function App() {
  const [query, setQuery] = useState('')
  return (
    <UserContext value={{ name: 'Asha' }}>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <NameLabel />
    </UserContext>
  )
}
```

Typing `abc` (three keystrokes) logs `NameLabel rendered` once on mount and then **three more times**.

**What happens, step by step:**
1. Each keystroke calls `setQuery`, so `App` re-renders.
2. `{ name: 'Asha' }` creates a brand new object. It is a different object from the last render's object.
3. React compares old and new value with `Object.is`. They differ, so `NameLabel` is told to re-render.
4. `memo` did not help. It only compares props, and `NameLabel` has none. The context change goes straight around it.

### 9.4 The fix: memoize the value

`useMemo` returns the same object until its dependencies change.

```jsx
import { createContext, memo, useContext, useMemo, useState } from 'react'

// UserContext and NameLabel are the same as in the previous example.
export default function App() {
  const [query, setQuery] = useState('')
  const [name] = useState('Asha')
  const value = useMemo(() => ({ name }), [name]) // same object until `name` changes
  return (
    <UserContext value={value}>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <NameLabel />
    </UserContext>
  )
}
```

Now typing `abc` logs nothing after mount. The object is the same, `Object.is` says "no change", and `NameLabel` is skipped.

The same fix for the auth provider from section 8. Functions that live inside the `useMemo` factory are created only when the factory runs again. `setUser` has a stable identity, so it does not need to be a dependency.

```jsx
function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const value = useMemo(
    () => ({
      user,
      login: (name) => setUser({ name }),
      logout: () => setUser(null),
    }),
    [user],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
```

When is this worth doing? When the provider can re-render for a reason **other than the value changing**: it has other state, or a parent with fast-changing state re-renders it. If the provider only ever re-renders because its own value changed, the memo changes nothing.

The React Compiler (see the [memoization lesson](07-memoization.md)) is designed to add this kind of memoization automatically. Do not depend on it for correctness. You will read code without it, and understanding why the problem exists is what interviewers ask about.

**Common mistake:** assuming `useMemo` on the value stops all extra renders.

```jsx
// useMemo keeps the value stable. It does NOT stop plain children from re-rendering
// when the component that renders them re-renders.
const value = useMemo(() => ({ color: 'red' }), [])
```

A stable value only helps components that can skip rendering for another reason, such as being wrapped in `memo`. A plain child re-renders whenever its parent does, whatever the value is. The next section shows the stronger fix.

## 10. Fix: keep the provider small and pass children

The best protection is to make the provider re-render **less often**, and to stop it from dragging other components along. Put the state in its own small component that takes `children`.

Compare two versions. Both show a count and have a `Sidebar` that does not use context.

```jsx
import { createContext, useContext, useState } from 'react'

const CountContext = createContext(null)

function CountDisplay() {
  const { count } = useContext(CountContext)
  console.log('CountDisplay rendered')
  return <p>Count: {count}</p>
}

function Sidebar() {
  console.log('Sidebar rendered')
  return <aside>Sidebar</aside>
}

// Version 1: the state lives in App, which also creates the children
export function AppStateInApp() {
  const [count, setCount] = useState(0)
  return (
    <CountContext value={{ count }}>
      <button onClick={() => setCount(count + 1)}>Add</button>
      <CountDisplay />
      <Sidebar />
    </CountContext>
  )
}

// Version 2: the state lives in a small provider that receives children
function CountProvider({ children }) {
  const [count, setCount] = useState(0)
  return (
    <CountContext value={{ count }}>
      <button onClick={() => setCount(count + 1)}>Add</button>
      {children}
    </CountContext>
  )
}

export function AppStateInProvider() {
  return (
    <CountProvider>
      <CountDisplay />
      <Sidebar />
    </CountProvider>
  )
}
```

To try both, render one of the two exported apps at a time from `main.jsx`. After one click on "Add":

```text
Version 1 logs:
CountDisplay rendered
Sidebar rendered

Version 2 logs:
CountDisplay rendered
```

**What happens, step by step:**
1. In version 1, the click changes state in `App`. `App` re-renders and runs its JSX again. That creates **new** `<CountDisplay />` and `<Sidebar />` elements. React re-renders both.
2. In version 2, the click changes state inside `CountProvider`. `CountProvider` re-renders, but its `children` were created by `AppStateInProvider`, which did **not** re-render. They are the same element objects as before, so React skips them.
3. `CountDisplay` still re-renders in version 2, but only because it reads the context and the value changed. `Sidebar` does not read it, so it is skipped.

That is why every provider in this lesson is written as `function XProvider({ children })`. The rule of thumb: **put the state in a provider component that takes `children` and does nothing else.** Then a state change only re-renders the components that actually read the context.

Also put each provider as low in the tree as the consumers allow. A `CartProvider` that only the shop pages need does not have to wrap the login page.

**Common mistake:** a provider that builds its own children.

```jsx
// Wrong: the provider creates <CountDisplay /> and <Sidebar /> itself,
// so they are new elements every time its state changes
function CountProvider() {
  const [count, setCount] = useState(0)
  return (
    <CountContext value={{ count }}>
      <button onClick={() => setCount(count + 1)}>Add</button>
      <CountDisplay />
      <Sidebar />
    </CountContext>
  )
}

// Fixed: take the children from the parent, as in version 2 above
function CountProvider({ children }) {
  const [count, setCount] = useState(0)
  return (
    <CountContext value={{ count }}>
      <button onClick={() => setCount(count + 1)}>Add</button>
      {children}
    </CountContext>
  )
}
```

With the wrong version, one click logs both `CountDisplay rendered` and `Sidebar rendered`. It behaves like version 1: whoever owns the state also creates the elements, so they all re-render.

## 11. Fix: split contexts (state vs actions, and by domain)

If the value holds both state and functions, a component that only **triggers** changes (a button) re-renders on every state change, because the value changed. Splitting solves this. Put the changing state in one context and the stable functions in another.

`useReducer` makes this easy. It returns `[state, dispatch]`, and `dispatch` has a stable identity: it is the same function on every render. (Reducers are the topic of the [next lesson](06-usereducer.md). Here you only need to know that `dispatch({ type: 'increment' })` asks the reducer for the next state.)

```jsx
import { createContext, useContext, useReducer } from 'react'

const CountStateContext = createContext(null)
const CountDispatchContext = createContext(null)

function countReducer(count, action) {
  switch (action.type) {
    case 'increment':
      return count + 1
    case 'reset':
      return 0
    default:
      throw new Error(`Unknown action: ${action.type}`)
  }
}

function CountProvider({ children }) {
  const [count, dispatch] = useReducer(countReducer, 0)
  return (
    <CountDispatchContext value={dispatch}>
      <CountStateContext value={count}>{children}</CountStateContext>
    </CountDispatchContext>
  )
}

function useCount() {
  const count = useContext(CountStateContext)
  if (count === null) throw new Error('useCount must be used inside a <CountProvider>')
  return count
}

function useCountDispatch() {
  const dispatch = useContext(CountDispatchContext)
  if (dispatch === null) throw new Error('useCountDispatch must be used inside a <CountProvider>')
  return dispatch
}

function CountDisplay() {
  const count = useCount()
  console.log('CountDisplay rendered')
  return <p>Count: {count}</p>
}

function Buttons() {
  const dispatch = useCountDispatch()
  console.log('Buttons rendered')
  return (
    <div>
      <button onClick={() => dispatch({ type: 'increment' })}>Add one</button>
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
    </div>
  )
}

export default function App() {
  return (
    <CountProvider>
      <CountDisplay />
      <Buttons />
    </CountProvider>
  )
}
```

After one click on "Add one":

```text
Split contexts:
CountDisplay rendered

One context holding { count, dispatch }:
CountDisplay rendered
Buttons rendered
```

**What happens, step by step:**
1. Click "Add one": `dispatch` runs the reducer. The count goes from 0 to 1. The page shows `Count: 1`.
2. `CountStateContext` now has a new value, so `CountDisplay` re-renders.
3. `CountDispatchContext` still holds the same `dispatch` function, so its value did not change. `Buttons` reads only that context, so it is **not** re-rendered.
4. In the one-context version, the value `{ count, dispatch }` is a new object whenever the count changes. `Buttons` reads it, so it re-renders too, for nothing.

If your state comes from `useState` instead, put the functions in a memoized "actions" object: `useMemo(() => ({ increment: () => setCount((c) => c + 1) }), [])`.

**Split by domain too.** Do not build one giant `AppContext` with the theme, the user, the cart and the notifications. Anything that changes re-renders every reader. Give each area its own context, provider and hook: `ThemeContext`, `AuthContext`, `CartContext`. Things that change at different speeds, or that different components use, belong in different contexts.

Do not over-split. Each context costs a provider, a hook and a guard. Start with one context per domain. Split state from actions when a button or form re-renders too often, and measure first (see the [performance lesson](../04-advanced/02-performance-optimization.md)).

**Common mistake:** splitting the contexts but creating the actions object on every render.

```jsx
// Wrong: a new actions object each time the provider renders,
// so every reader of the actions context re-renders anyway
// (this version uses useState, so the functions live in CountActionsContext)
function CountProvider({ children }) {
  const [count, setCount] = useState(0)
  return (
    <CountActionsContext value={{ increment: () => setCount((c) => c + 1) }}>
      <CountStateContext value={count}>{children}</CountStateContext>
    </CountActionsContext>
  )
}

// Fixed: memoize it (or pass dispatch from useReducer, which is already stable)
const actions = useMemo(() => ({ increment: () => setCount((c) => c + 1) }), [])
```

In a check with a `CountDisplay` and a `Buttons` component, one click logged both with the wrong version, and only `CountDisplay` with the memoized one.

## 12. Several providers: nesting and order

An app usually has several contexts. You nest the providers. The order matters in one case: **a provider that reads another context must be inside it.**

```jsx
import { createContext, useContext, useState } from 'react'
import { AuthProvider, useAuth } from './auth.jsx'
import { ThemeProvider, useTheme } from './theme.jsx'

const CartContext = createContext(null)

function CartProvider({ children }) {
  const { user } = useAuth() // CartProvider needs the user, so it must sit inside AuthProvider
  const [items, setItems] = useState([])
  const addItem = (item) => setItems((list) => [...list, item])
  return <CartContext value={{ owner: user ? user.name : 'guest', items, addItem }}>{children}</CartContext>
}

function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
```

Here `theme.jsx` is the file from section 7. `auth.jsx` is the same idea for the auth example: it exports `AuthProvider` and `useAuth`.

**What happens, step by step:**
1. `ThemeProvider` is outermost. Nothing it needs comes from other contexts.
2. `AuthProvider` is inside it.
3. `CartProvider` calls `useAuth()` during its own render. That works only because `AuthProvider` is above it.
4. Swap the order so `CartProvider` is outside `AuthProvider` and `useAuth()` finds no provider. Your guard throws `useAuth must be used inside an <AuthProvider>`.

Notes:
- A single `AppProviders` component keeps `main.jsx` tidy. Many people accept this small "pyramid" as the price of separate contexts.
- Global providers (theme, auth, locale) go near the root. Local ones (a form's state, one modal's state) go near the components that use them.
- If two nested providers use the **same** context, the inner one wins for its subtree (section 4.2).

**Common mistake:** the providers in the wrong order.

```jsx
// Wrong: CartProvider calls useAuth(), but AuthProvider is below it
<CartProvider>
  <AuthProvider>{children}</AuthProvider>
</CartProvider>

// Fixed: the provider that is needed goes outside
<AuthProvider>
  <CartProvider>{children}</CartProvider>
</AuthProvider>
```

With the wrong order, rendering throws `useAuth must be used inside an <AuthProvider>`. The guard hook turns a confusing bug into a one-line fix.

## 13. Testing components that use context

A component that calls `useTheme()` throws without a provider, so tests need to render it inside one. Testing Library's `render` takes a `wrapper` option for this. The wrapper is a component that receives `children`, and `ThemeProvider` already has that shape.

```jsx
import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ThemeProvider, useTheme } from './theme.jsx'

function Probe() {
  const { theme, toggleTheme } = useTheme()
  return <button onClick={toggleTheme}>{theme}</button>
}

describe('ThemeProvider', () => {
  it('toggles the theme when the button is clicked', async () => {
    const user = userEvent.setup()
    render(<Probe />, { wrapper: ThemeProvider })

    expect(screen.getByRole('button')).toHaveTextContent('light')
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('dark')
  })

  it('works when you test the hook directly', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })
    expect(result.current.theme).toBe('light')
  })

  it('throws a helpful error outside a provider', () => {
    expect(() => render(<Probe />)).toThrow('useTheme must be used inside a <ThemeProvider>')
  })
})
```

**What happens, step by step:**
1. `render(<Probe />, { wrapper: ThemeProvider })` renders `<ThemeProvider><Probe /></ThemeProvider>`. `useTheme()` works.
2. The test clicks the button like a user. The text changes from `light` to `dark`. The test checks what the user sees, not the context internals.
3. `renderHook` runs a hook inside the same kind of wrapper and gives you `result.current`.
4. The third test renders `Probe` with no wrapper and checks that the guard throws. With React 19.3.1 and Testing Library 16.3.3, `render` re-throws the error and nothing extra is printed. If your setup prints React's error report to the console, silence it for that test with `vi.spyOn(console, 'error').mockImplementation(() => {})` and restore it afterwards.

For the auth example, drive it like a user: render the app, type a name, click "Log in", and check for `Dashboard for Asha`. If many tests need the same providers, write one helper:

```jsx
import { render } from '@testing-library/react'
import { AuthProvider } from './auth.jsx'
import { ThemeProvider } from './theme.jsx'

export function renderWithProviders(ui, options) {
  function Wrapper({ children }) {
    return (
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    )
  }
  return render(ui, { wrapper: Wrapper, ...options })
}
```

When a test needs to control the starting value, give the provider an optional prop (for example `initialUser`), or export the context object for tests and render it with a fake value. More testing patterns are in the [testing lesson](../04-advanced/08-testing-react.md).

**Common mistake:** rendering a consumer with no provider and testing nothing useful.

```jsx
// Wrong: this throws before any assertion runs (if the hook has a guard)
render(<Card />)

// Fixed: wrap it
render(<Card />, { wrapper: ThemeProvider })
```

## 14. When context is the right tool (and when it is not)

Context is a **delivery system** for a value. It is not a state manager. The state still comes from `useState` or `useReducer`. Context only gets that state to the components that need it.

**Good fits** (shared by many components, changes rarely):
- Theme (light or dark) and other UI preferences.
- The current user or session.
- Locale and translations.
- Feature flags and app configuration.
- An object that other components call, such as an API client or a "show toast" function. A toast system is a good example, because components only need to **call** it and almost never re-render when toasts change. Try it in the [toast system exercise](../practice-app/exercises/react/31-toast-system/README.md).
- A parent and children that work together as one unit (tabs, accordions, menus). See [component patterns](../03-intermediate/01-component-patterns.md).
- Libraries that share state with your components: routing libraries and form libraries (for example `FormProvider` in React Hook Form) use context under the hood.

**Poor fits:**
- State that changes many times per second: mouse position, typing in a text field, animation frames, timers. Every change re-renders every reader.
- Large global state where different components use different small slices. All readers re-render on any change, because context has no selectors.
- Server data (lists from an API, with loading, caching and refetching). Use a data library such as TanStack Query. See [data fetching](../03-intermediate/02-data-fetching.md).
- State that belongs in the URL, such as filters and the current page.

**What to use instead for hot or large shared state:**
- A store with **selectors**, such as Zustand, Jotai or Redux Toolkit. A component subscribes to just the slice it uses, so it re-renders only when that slice changes. In a comparison run on React 19.3.1, changing one field of a context object re-rendered both consumers, while Zustand with selectors re-rendered only the component that used the changed field.
- `useSyncExternalStore` if you build your own store. See [other hooks](09-other-hooks.md).
- The "context selector" pattern, covered in advanced patterns (planned).
- The overview of all kinds of state is in [state management](../03-intermediate/06-state-management.md).

This is a rule of thumb, not a law: start with props and local state; add context when drilling hurts and the value changes rarely; reach for a store when many components need different slices of fast-changing state.

**Server Components.** In frameworks with Server Components, a Server Component cannot read context. Components that use `useContext` or `use(Context)` run on the client (`'use client'`). The 19.3 release notes report that a Server Component can now render a context provider that is imported from a client module. See [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md).

**Common mistake:** putting everything in one global context "because it is easy".

```jsx
// Wrong: one context for unrelated things. Any change re-renders every reader.
<AppContext value={{ user, theme, cart, notifications, mousePosition }}>

// Fixed: one context per domain, and hot state kept local or in a store
<ThemeProvider>
  <AuthProvider>
    <CartProvider>{children}</CartProvider>
  </AuthProvider>
</ThemeProvider>
```

## 15. Context, props, composition or a state library?

There is one more way to avoid drilling that needs no new API: **composition**. Instead of passing data down, pass finished elements down. The component that owns the data builds the element and hands it over as a prop or as `children`.

```jsx
function UserBadge({ userName }) {
  return <div>Signed in as {userName}</div>
}

function Header({ badge }) {
  return (
    <header>
      <h1>My Shop</h1>
      {badge}
    </header>
  )
}

function Page({ header }) {
  return (
    <main>
      {header}
      <p>Welcome to the shop.</p>
    </main>
  )
}

export default function App() {
  const userName = 'Asha'
  return <Page header={<Header badge={<UserBadge userName={userName} />} />} />
}
```

**What happens, step by step:**
1. `App` creates the `UserBadge` element itself, with `userName` already inside it.
2. It passes that element to `Header` as `badge`, and `Header`'s element to `Page` as `header`.
3. `Page` and `Header` only place the elements. They do not know what a user is. The output is the same: `My Shop`, `Signed in as Asha`, `Welcome to the shop.`

This works well for layout pieces. Its cost is that the top component must know the layout, and it gets crowded if many pieces are involved.

| Tool | Best for | What re-renders | Watch out for |
|---|---|---|---|
| Props | Direct parent to child, one or two levels | The receiving component | Drilling when the tree gets deep |
| Composition (`children`, slots) | Layout pieces, avoiding drilling without new concepts | Nothing extra | The top component must build the pieces |
| Context | Shared values that rarely change: theme, user, locale | Every reader, when the value changes | No selectors, new-object pitfall |
| State library (Zustand, Redux Toolkit, Jotai) | Large or fast-changing shared client state | Only components whose selected slice changed | An extra dependency and concepts |
| Server-state library (TanStack Query) | Data that comes from an API | Components using that query | Not for UI-only state |

A quick way to decide:
1. Can the state live closer to where it is used? Move it.
2. Can you pass elements instead of data? Use composition.
3. Is it a shared value that rarely changes? Use context.
4. Is it large, fast-changing, or used in small slices by many components? Use a store with selectors.
5. Is it data from a server? Use a data-fetching library.

**Common mistake:** using context for a value that one child needs.

```jsx
// Overkill: a context, a provider and a hook for a single title
const TitleContext = createContext('')

// Simpler: a prop
<Header title="My Shop" />
```

Context hides where a value comes from, because a reader has to hunt for the provider. A plain prop is easier to follow. Use context when the value really is needed by many components far apart.

## How interviewers test this
- **Do you know what context is for?** A strong answer says it removes prop drilling by delivering a value to a subtree, and that it is not a state manager. "Context replaces Redux" is a red flag.
- **Can you state the re-render rule?** Every component that reads the context re-renders when the value changes (compared with `Object.is`), no partial subscriptions, and `memo` does not stop it.
- **Do you know more fixes than "use useMemo"?** Strong answers name memoizing the value, a small provider that takes `children`, splitting state from actions, splitting by domain, and moving hot state to a store.
- **Can you design a provider properly?** Provider component with state, a value that holds state and functions, a custom hook, and a clear error when the provider is missing.
- **Output questions.** Typical ones: what a consumer prints with no provider, with `value={undefined}`, and with nested providers.
- **Red flags:** one giant global context, putting fast-changing state in context, mutating the value object, and an inline object value in a busy provider.

## Interview questions and model answers

### Q1. What is the Context API and what problem does it solve? (Easy)
Context lets a component share a value with every component below it in the tree, without passing the value through props at every level. It solves **prop drilling**. You create it with `createContext`, supply the value with a provider (`<MyContext value={...}>`), and read it with `useContext(MyContext)` or `use(MyContext)`. It fits values that many components need and that change rarely, such as theme, current user and locale. Context only delivers a value. The state itself still comes from `useState` or `useReducer`.

### Q2. What is prop drilling, and how do you avoid it? (Easy)
Prop drilling means passing a prop through several components that do not use it, only so a deep child can read it. It makes code noisy and hard to change. First try to restructure: move state closer to where it is used, or pass finished elements down with `children` or slots (composition). If many components far apart need the same value, use context. For large or fast-changing shared state, use a state library. One or two levels of passing props is perfectly fine.

### Q3. How do createContext, the Provider and useContext work together? (Easy)
`createContext(defaultValue)` makes a context object. A provider, `<MyContext value={x}>`, sets the value for everything rendered inside it. `useContext(MyContext)` looks up the tree for the closest provider of that context and returns its value. If there is no provider above, it returns the default value. A component that reads a context re-renders whenever the provided value changes.

```jsx
const ThemeContext = createContext('light')

<ThemeContext value="dark">
  <Page />            {/* any component inside can call useContext(ThemeContext) */}
</ThemeContext>
```

### Q4. What is the default value passed to createContext used for? (Easy)
React uses it only when a component reads the context and there is no provider above it. It is not an initial state and it never changes. A provider with `value={undefined}` still counts as a provider, so consumers get `undefined`, not the default. People use a safe fallback (like `'light'`) so components work alone in tests, or `null` together with a custom hook that throws a clear error when the provider is missing.

### Q5. When does a component that uses useContext re-render? (Medium)
In two cases. First, for the normal reasons: its own state changed, or its parent re-rendered. Second, whenever the value of the closest provider changes, compared with `Object.is`. There are no partial subscriptions. A component that uses only `name` still re-renders when only `count` changed, because the whole value object is new. `React.memo` does not prevent it. Components that do not read the context are not re-rendered because of it.

### Q6. Does context replace Redux? (Medium)
No. They do different jobs. Context is a way to deliver a value through the tree. Redux (or Zustand, or Jotai) is a state management library: it holds the state, defines how it changes, and lets components subscribe to small slices with selectors. You can build global state from context plus `useReducer`, and that is fine for modest apps whose state changes rarely. But because context has no selectors, every reader re-renders on any change. A store with selectors re-renders only the components whose slice changed, and Redux Toolkit adds dev tools and middleware. Many apps use all of them: context for theme and auth, a data library for server state, and a store only if the client state is large or hot.

### Q7. What performance problems can context cause, and how do you fix them? (Medium)
The main problem is that any change to the value re-renders every consumer, even those that use only a part of it. It gets worse when the value is a new object on every render (so consumers re-render even when nothing really changed) and when the context holds state that changes very often. The fixes are: memoize the value with `useMemo`, keep the provider a small component that takes `children`, split state from actions and unrelated data into separate contexts, and move hot state out of context into local state or a store with selectors. Measure first, with the React DevTools Profiler, before optimizing.

### Q8. How do you avoid unnecessary re-renders with context? (Medium)
A short checklist:
1. Put the state in its own provider component that takes `children`, so siblings are not dragged along.
2. Memoize an object value with `useMemo` (and functions with `useCallback`, or define them inside the memo factory) when the provider can re-render for other reasons.
3. Split into several contexts: state vs dispatch, and one per domain.
4. Place providers low in the tree, only as high as their consumers need.
5. Keep fast-changing state local, or use a store with selectors.

```jsx
const value = useMemo(() => ({ user, login, logout }), [user, login, logout])
```

### Q9. Can you have multiple contexts? What happens with nested providers? (Easy)
Yes, as many as you need, and it is the recommended way to organize an app: one context per domain (theme, auth, cart). You nest the providers. A provider that reads another context must be placed inside it. If two providers of the **same** context are nested, a consumer reads the value of the closest one, so an inner provider overrides the outer one for its subtree.

### Q10. How does a child component update a value stored in context? (Easy)
It does not change the context directly. The provider owns the state (`useState` or `useReducer`) and puts the state and the functions that change it into the value. The child reads them and calls a function, which updates the provider's state. The provider re-renders with a new value, and the readers re-render. Never mutate the value object, because React cannot see that.

```jsx
const { theme, toggleTheme } = useTheme()
<button onClick={toggleTheme}>{theme}</button>
```

### Q11. Why wrap useContext in a custom hook with a guard? (Medium)
Three reasons. The guard gives a clear error (`useTheme must be used inside a <ThemeProvider>`) instead of a confusing crash like "cannot destructure property of null". The hook keeps the context object private, so the public API is small and you can change the inside later. And in TypeScript the guard narrows the type from `Theme | null` to `Theme`. Check with `=== null`, not with `!value`, because a valid value such as `0` or `''` would wrongly throw.

### Q12. What is the difference between useContext and use(Context)? (Medium)
They return the same value, and a component that reads either way re-renders when the value changes. The difference is the rules. `useContext` is a hook, so it must be called at the top level in the same order on every render. `use` is not a hook: it may be called inside `if` statements and loops and after an early `return`. It cannot be called inside `try`/`catch`. Also, `use(Context)` is not supported in Server Components. In practice, use `useContext` by default and `use` when you need to read the context conditionally. If a component did not read the context in its latest render, a change to the context does not re-render it.

### Q13. Do you still need `<Context.Provider>` in React 19? (Easy)
No. Since React 19 you can render the context itself as the provider: `<ThemeContext value={...}>`. The `.Provider` form still works in 19.3.1, but the docs call it legacy, so use the short form in new code. `Context.Consumer` (a render-prop component) also still works and is legacy. In function components, `useContext` or `use` is the way to read.

### Q14. Does React.memo stop a context update from reaching a component? (Hard)
No. `memo` compares props, and context is not a prop. A `memo` component that calls `useContext` re-renders when the provided value changes. If a `memo` wrapper contains a consumer, the wrapper can be skipped, but the consumer inside it still re-renders, because React updates the components that read the context directly. The reverse also matters: memoizing the provider's value only helps `memo` components. A plain child of a parent that re-renders still re-renders, so the stronger fix is to move the state into a provider that takes `children`.

### Q15. How do you test a component that uses context? (Medium)
Render it inside the provider. With Testing Library, use the `wrapper` option: `render(<Probe />, { wrapper: ThemeProvider })`. For hooks, use `renderHook(() => useTheme(), { wrapper: ThemeProvider })`. Test behaviour the way a user sees it: click the button, check the text. To test the guard, render a consumer without the provider and expect it to throw: `expect(() => render(<Probe />)).toThrow('useTheme must be used inside a <ThemeProvider>')`. If many tests need the same providers, write a `renderWithProviders` helper. To control the starting value, give the provider an optional prop (like `initialUser`) or render the context with a fake value.

## Common mistakes and gotchas
- **Consumer outside the provider shows the default value.** Fix: wrap the right subtree, and use a `null` default plus a guard hook so the mistake throws.
- **`value={undefined}` hides the default.** The default only applies when there is no provider at all. Fix: give your own fallback with `??`.
- **Inline object value in a busy provider** (`value={{ a, b }}`). Every consumer re-renders on every render of the provider's parent. Fix: `useMemo`, or move the state into a small provider.
- **One giant `AppContext`.** Any change re-renders every reader. Fix: one context per domain, and split state from actions.
- **Fast-changing state in context** (mouse position, typing, timers). Fix: keep it local, or use a store with selectors.
- **Mutating the value** (`ctx.theme = 'dark'`). React cannot see it, so nothing re-renders. Fix: change state in the provider and pass a new value.
- **A plain variable in the provider** instead of state. Fix: `useState` or `useReducer`.
- **`useContext` after an early return or inside an `if`.** It breaks the Rules of Hooks. Fix: read it at the top, or use `use`.
- **Guard written as `if (!value)`.** It throws for valid falsy values. Fix: `value === null`.
- **Provider order.** A provider that reads another context placed outside it throws. Fix: nest it inside.
- **Believing `memo` blocks context updates.** It does not. Fix: reduce re-renders at the provider, as in sections 9 to 11.
- **Creating the context inside a component.** Fix: create it once at module level.
- **Server data in context** (loading flags, cached lists). Fix: use a data-fetching library.
- **Counting renders in development.** StrictMode runs components twice, so logs appear twice. Fix: remember this when you read console counts, or test without StrictMode.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** In your own words, describe the three steps of using context. What happens if you skip the middle step (providing a value)?

<details>
<summary>Show answer</summary>

1. **Create:** `const MyContext = createContext(defaultValue)`, once, at module level.
2. **Provide:** wrap part of the tree in `<MyContext value={something}>`. Everything inside can read `something`.
3. **Read:** call `useContext(MyContext)` (or `use(MyContext)`) in any component inside the provider.

If you skip step 2, a component that reads the context finds no provider above it, so it gets the default value from `createContext`. If you created it with `createContext(null)`, it gets `null`, and a guard hook would throw a clear error.

</details>

2. **(Easy)** Predict what is shown (this was run to check):

```jsx
const LangContext = createContext('en')

function Label() {
  return <p>{String(useContext(LangContext))}</p>
}

export default function App() {
  return (
    <>
      <Label />
      <LangContext value="fr">
        <Label />
      </LangContext>
      <LangContext value={undefined}>
        <Label />
      </LangContext>
    </>
  )
}
```

<details>
<summary>Show answer</summary>

Three paragraphs: `en`, `fr`, `undefined`.

- The first `Label` has no provider above it, so it gets the default, `'en'`.
- The second has a provider with `"fr"`.
- The third has a provider whose value is `undefined`. A provider always wins over the default, even with an empty value, so the consumer gets `undefined` (printed as the text `undefined` by `String`).

</details>

3. **(Easy)** **Code.** `currency` is drilled through `ProductList` and `ProductCard` to `Price`. Replace the drilling with a `CurrencyContext` whose default is `'USD'`. `App` should provide `'EUR'`. Expected result: `20 EUR` and `35 EUR`. `ProductList` rendered on its own should show `20 USD` and `35 USD`.

```jsx
function Price({ amount, currency }) {
  return <span>{amount} {currency}</span>
}

function ProductCard({ amount, currency }) {
  return <li><Price amount={amount} currency={currency} /></li>
}

function ProductList({ currency }) {
  return (
    <ul>
      <ProductCard amount={20} currency={currency} />
      <ProductCard amount={35} currency={currency} />
    </ul>
  )
}

export default function App() {
  return <ProductList currency="EUR" />
}
```

<details>
<summary>Show answer</summary>

```jsx
import { createContext, useContext } from 'react'

const CurrencyContext = createContext('USD')

function Price({ amount }) {
  const currency = useContext(CurrencyContext)
  return <span>{amount} {currency}</span>
}

function ProductCard({ amount }) {
  return <li><Price amount={amount} /></li>
}

function ProductList() {
  return (
    <ul>
      <ProductCard amount={20} />
      <ProductCard amount={35} />
    </ul>
  )
}

export default function App() {
  return (
    <CurrencyContext value="EUR">
      <ProductList />
    </CurrencyContext>
  )
}
```

`Price` reads the currency itself, so `ProductCard` and `ProductList` lose the prop. With the provider the result is `20 EUR` and `35 EUR`. Rendering `<ProductList />` without a provider falls back to the default and shows `20 USD` and `35 USD`.

</details>

4. **(Medium)** **Code.** Extend the `ThemeProvider` from section 7 so the theme survives a page refresh. Read the saved theme from `localStorage` on the first render, save it when it changes, and set `document.documentElement.dataset.theme` so CSS can react to it. Storage can be blocked, so handle errors.

<details>
<summary>Show answer</summary>

```jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'theme'

function getInitialTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme) // lazy initializer: runs once

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Storage can be blocked (for example in a private window). The theme still works for this visit.
    }
  }, [theme])

  const value = useMemo(
    () => ({ theme, toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) }),
    [theme],
  )
  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (value === null) throw new Error('useTheme must be used inside a <ThemeProvider>')
  return value
}
```

Checked with a test: with `'dark'` saved the first render shows `dark` and sets the `data-theme` attribute to `dark`. After a click the theme is `light`, storage holds `light` and the attribute is `light`. With nothing saved the theme is `light`.

Key points: pass the function `getInitialTheme` (not its result) to `useState` so it runs only once. The effect keeps an outside system (storage and the page's root element) in sync with state. The `useMemo` keeps the value stable when the provider re-renders for other reasons.

</details>

5. **(Medium)** Predict which components log after one click on "Add". Then fix it so only the one that needs to re-render logs.

```jsx
const CountContext = createContext(null)

function CountDisplay() {
  const { count } = useContext(CountContext)
  console.log('CountDisplay rendered')
  return <p>Count: {count}</p>
}

function Sidebar() {
  console.log('Sidebar rendered')
  return <aside>Sidebar</aside>
}

export default function App() {
  const [count, setCount] = useState(0)
  return (
    <CountContext value={{ count }}>
      <button onClick={() => setCount(count + 1)}>Add</button>
      <CountDisplay />
      <Sidebar />
    </CountContext>
  )
}
```

<details>
<summary>Show answer</summary>

Both log: `CountDisplay rendered` and `Sidebar rendered`.

`App` owns the state, so it re-renders on the click and creates new `<CountDisplay />` and `<Sidebar />` elements. React re-renders both. `Sidebar` does not use context, but it is dragged along by its parent.

Fix: move the state into a small provider that takes `children`:

```jsx
function CountProvider({ children }) {
  const [count, setCount] = useState(0)
  return (
    <CountContext value={{ count }}>
      <button onClick={() => setCount(count + 1)}>Add</button>
      {children}
    </CountContext>
  )
}

export default function App() {
  return (
    <CountProvider>
      <CountDisplay />
      <Sidebar />
    </CountProvider>
  )
}
```

Now `App` does not re-render, so `children` are the same element objects and React skips `Sidebar`. Only `CountDisplay` logs, because it reads the context and the value changed. (Run with both versions: version 1 logged both, version 2 logged only `CountDisplay`.)

</details>

6. **(Medium)** In this app, `NameLabel` is wrapped in `memo`, yet typing in the search box re-renders it on every keystroke. Explain why, and give two different fixes.

```jsx
const UserContext = createContext(null)

const NameLabel = memo(function NameLabel() {
  const user = useContext(UserContext)
  console.log('NameLabel rendered')
  return <p>Name: {user.name}</p>
})

export default function App() {
  const [query, setQuery] = useState('')
  return (
    <UserContext value={{ name: 'Asha' }}>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <NameLabel />
    </UserContext>
  )
}
```

<details>
<summary>Show answer</summary>

**Why:** each keystroke re-renders `App`, and `{ name: 'Asha' }` is a new object every time. React compares the old and new context value with `Object.is`, sees a different object, and re-renders every reader. `memo` only compares props, and context is not a prop, so it cannot help.

**Fix 1: memoize the value.**

```jsx
const [name] = useState('Asha')
const value = useMemo(() => ({ name }), [name])
return <UserContext value={value}>...</UserContext>
```

**Fix 2: move the fast-changing state down** into its own component, so `App` never re-renders while you type.

```jsx
function SearchBox() {
  const [query, setQuery] = useState('')
  return <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
}

export default function App() {
  return (
    <UserContext value={{ name: 'Asha' }}>
      <SearchBox />
      <NameLabel />
    </UserContext>
  )
}
```

Measured: the original logged `NameLabel rendered` three more times for three keystrokes. Both fixes logged nothing after mount.

</details>

7. **(Medium)** **Code.** This notes list keeps `{ notes, dispatch }` in one context. Split it into two contexts so `AddNoteButton` does not re-render when a note is added. (`notesReducer` is already written. It handles the `'added'` action by returning a new array that includes the new note.)

```jsx
const NotesContext = createContext(null)

function NotesProvider({ children }) {
  const [notes, dispatch] = useReducer(notesReducer, [])
  return <NotesContext value={{ notes, dispatch }}>{children}</NotesContext>
}

function AddNoteButton() {
  const { dispatch } = useContext(NotesContext)
  console.log('AddNoteButton rendered')
  return <button onClick={() => dispatch({ type: 'added', id: Date.now(), text: 'New note' })}>Add note</button>
}

function NoteList() {
  const { notes } = useContext(NotesContext)
  console.log('NoteList rendered')
  return <ul>{notes.map((t) => <li key={t.id}>{t.text}</li>)}</ul>
}
```

<details>
<summary>Show answer</summary>

```jsx
const NotesContext = createContext(null)
const NotesDispatchContext = createContext(null)

function NotesProvider({ children }) {
  const [notes, dispatch] = useReducer(notesReducer, [])
  return (
    <NotesDispatchContext value={dispatch}>
      <NotesContext value={notes}>{children}</NotesContext>
    </NotesDispatchContext>
  )
}

function useNotes() {
  const notes = useContext(NotesContext)
  if (notes === null) throw new Error('useNotes must be used inside a <NotesProvider>')
  return notes
}

function useNotesDispatch() {
  const dispatch = useContext(NotesDispatchContext)
  if (dispatch === null) throw new Error('useNotesDispatch must be used inside a <NotesProvider>')
  return dispatch
}

function AddNoteButton() {
  const dispatch = useNotesDispatch()
  console.log('AddNoteButton rendered')
  return <button onClick={() => dispatch({ type: 'added', id: Date.now(), text: 'New note' })}>Add note</button>
}

function NoteList() {
  const notes = useNotes()
  console.log('NoteList rendered')
  return <ul>{notes.map((t) => <li key={t.id}>{t.text}</li>)}</ul>
}
```

`dispatch` has a stable identity, so `NotesDispatchContext` never changes. `AddNoteButton` reads only that context and is not re-rendered when notes change. Measured after one click: the single-context version logged both components, the split version logged only `NoteList`.

The [next lesson](06-usereducer.md) covers reducers in detail.

</details>

8. **(Medium)** **Code.** Write tests for the auth example from section 8: one that logs in and out through the UI, and one that checks `useAuth` throws outside a provider.

<details>
<summary>Show answer</summary>

```jsx
import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App, { useAuth } from './App.jsx' // export useAuth next to App for the test

describe('auth', () => {
  it('logs in and out', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('Please log in.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Name'), 'Asha')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(screen.getByText('Dashboard for Asha')).toBeInTheDocument()
    expect(screen.getByText('Hello, Asha')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(screen.getByText('Please log in.')).toBeInTheDocument()
  })

  it('useAuth throws outside an AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside an <AuthProvider>')
  })
})
```

The first test acts like a user and checks only what is on screen. The second renders the hook with no provider and expects the guard to throw. (Both patterns were run and pass. `toBeInTheDocument` needs `@testing-library/jest-dom`, which the practice app has set up.)

</details>

9. **(Hard)** Predict the four lines of text, in order.

```jsx
const DepthContext = createContext(0)

function Box({ children }) {
  const depth = useContext(DepthContext)
  return (
    <div>
      <p>Depth {depth}</p>
      <DepthContext value={depth + 1}>{children}</DepthContext>
    </div>
  )
}

export default function App() {
  return (
    <Box>
      <Box>
        <Box />
      </Box>
      <Box />
    </Box>
  )
}
```

<details>
<summary>Show answer</summary>

`Depth 0`, `Depth 1`, `Depth 2`, `Depth 1`.

- The outer `Box` has no provider above it, so it gets the default, 0. It then provides `1` to its children.
- Its first child `Box` reads `1`, prints `Depth 1`, and provides `2` to its own child.
- That grandchild `Box` reads `2` and prints `Depth 2`.
- The outer box's second child `Box` is a sibling of the first child. It reads the outer provider's `1`, so it prints `Depth 1`.

Each `Box` overrides the context for its own subtree only. This is the nearest-provider rule applied through a chain.

</details>

10. **(Hard)** A teammate keeps the whole shopping cart (items, add, remove, totals, coupon code) in a single context. Now the product list lags every time someone adds an item. Explain why, list the fixes in the order you would try them, and say when you would stop using context for the cart.

<details>
<summary>Show answer</summary>

**Why:** the context value changes on every cart change. Every component that reads it re-renders: all product cards that call `useCart()` just to get `addItem`, the header badge, the totals and so on. Context has no selectors, so a card that only needs `addItem` is re-rendered for nothing.

**Fixes, in order:**
1. **Split state from actions.** Put the cart data in one context and the stable functions (or `dispatch`) in another. Product cards read only the actions context, so they stop re-rendering when the cart changes.
2. **Keep the provider small** and take `children`, so the rest of the page is not dragged along.
3. **Memoize the value** (`useMemo`) so unrelated provider re-renders do not change it.
4. **Wrap product cards in `memo`** with stable props, so a parent re-render does not re-render all of them.
5. **Scope the provider** to the part of the app that needs the cart.

**When to move to a store:** if after these steps many components still need different slices of a cart that changes often, a store with selectors (Zustand, or Redux Toolkit) re-renders only the components whose selected slice changed. Cart data that really comes from a server should live in a data library such as TanStack Query. See the [shopping cart exercise](../practice-app/exercises/react/19-shopping-cart-reducer/README.md) for a reducer-based cart you can split yourself.

</details>

11. **(Hard)** **Code.** This component reads the theme only when it is not `plain`. It breaks the Rules of Hooks. Rewrite it so it still skips the context read when `plain` is true.

```jsx
function Badge({ plain }) {
  if (plain) {
    return <span>Plain badge</span>
  }
  const theme = useContext(ThemeContext)
  return <span>Badge in {theme} theme</span>
}
```

<details>
<summary>Show answer</summary>

Use `use`, which may be called after a condition:

```jsx
import { use } from 'react'

function Badge({ plain }) {
  if (plain) {
    return <span>Plain badge</span>
  }
  const theme = use(ThemeContext)
  return <span>Badge in {theme} theme</span>
}
```

Checked: `<Badge plain />` shows `Plain badge`. `<Badge />` with no provider and a default of `'light'` shows `Badge in light theme`, and inside a `"dark"` provider it shows `Badge in dark theme`.

The other valid fix is to move `useContext` above the early return. That always subscribes to the context. The `use` version subscribes only when it actually reads, so a theme change does not re-render a `plain` badge.

</details>

12. **(Hard)** The provider's value is memoized with `useMemo`. After one click on the button, which of these log: `Consumer`, `MemoConsumer` (wrapped in `memo`), `NoContext`? Then say what changes if the value is the inline object `{ color: 'red' }` instead.

```jsx
const ColorContext = createContext(null)

function Consumer() {
  const c = useContext(ColorContext)
  console.log('Consumer rendered')
  return <p>Consumer: {c.color}</p>
}

const MemoConsumer = memo(function MemoConsumer() {
  const c = useContext(ColorContext)
  console.log('MemoConsumer rendered')
  return <p>MemoConsumer: {c.color}</p>
})

function NoContext() {
  console.log('NoContext rendered')
  return <p>No context</p>
}

export default function App() {
  const [n, setN] = useState(0)
  const value = useMemo(() => ({ color: 'red' }), [])
  return (
    <ColorContext value={value}>
      <button onClick={() => setN(n + 1)}>Clicked {n}</button>
      <Consumer />
      <MemoConsumer />
      <NoContext />
    </ColorContext>
  )
}
```

<details>
<summary>Show answer</summary>

With the memoized value, `Consumer` and `NoContext` log. `MemoConsumer` does not.

- The click re-renders `App`, which creates new elements for `Consumer` and `NoContext`. Plain components re-render when their parent does. The memoized value does not help them.
- `MemoConsumer` has no props and the context value is the same object, so `memo` skips it. This is the one place where memoizing the value pays off.

With the inline `{ color: 'red' }`, `MemoConsumer` logs too, because the value is a new object on each render and context changes get around `memo`.

To stop `Consumer` and `NoContext` from re-rendering as well, move the click state out of `App`, for example into a small component that holds the button (or a provider that takes `children`). Memoizing the value is not enough, because the real cause of the re-render is the parent's state change.

</details>

## Recap
- Context delivers a value to a whole subtree without prop drilling: create it, provide it with `<Ctx value>`, read it with `useContext` or `use`.
- The default value is used only when there is no provider. A provider with `value={undefined}` overrides it.
- The nearest provider wins, so nested providers override outer ones for their subtree.
- To change context, the provider owns the state and puts the state and its setter functions in the value. Wrap it in a custom hook that throws when the provider is missing.
- When the value changes (`Object.is`), every component that reads the context re-renders. There are no selectors, and `memo` does not block it.
- Fixes: memoize an object value, keep the provider a small component that takes `children`, split state from actions and split by domain, and keep hot state local or in a store.
- Use context for rarely changing shared values (theme, user, locale). Use stores with selectors for large or fast state, and a data library for server data.
- Test with the `wrapper` option, and use `use(Context)` when you must read context conditionally.

## Where to go next
- Next lesson: [useReducer](06-usereducer.md), the other half of the "reducer plus context" pattern.
- Fixing re-renders properly: [Memoization](07-memoization.md) and [Performance optimization](../04-advanced/02-performance-optimization.md).
- Package a provider and hook as reusable logic: [Custom hooks](08-custom-hooks.md).
- Choosing where state lives: [State management](../03-intermediate/06-state-management.md) and [Component patterns](../03-intermediate/01-component-patterns.md).
- How React decides what to render: [How React renders](../04-advanced/01-how-react-renders.md).
- Practice: [Shopping cart with a reducer](../practice-app/exercises/react/19-shopping-cart-reducer/README.md) and [Toast system](../practice-app/exercises/react/31-toast-system/README.md).
- Drill the questions: Round 3, rendering, keys, memo and context (planned) and Round 2, hooks (planned).
- Revise on one page: Hooks cheatsheet (planned).
