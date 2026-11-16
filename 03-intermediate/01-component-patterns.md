# Component Patterns

> **Level:** Intermediate   **Time:** about 65 minutes   **Read first:** [Components and props](../01-basics/04-components-and-props.md), [useContext](../02-hooks/05-usecontext.md), [Custom hooks](../02-hooks/08-custom-hooks.md)

## What you will learn
- Build flexible components with `children`, slots and specialisation, and explain why React prefers composition to inheritance.
- Compare render props, higher-order components (HOCs) and custom hooks, and say why hooks replaced most HOCs and render props.
- Build compound components (a Tabs widget) with context, and a component that works both controlled and uncontrolled with a `useControllableState` helper.
- Explain headless components, props getters, the state reducer pattern and the polymorphic `as` prop.
- Forward refs and rest props correctly, and design a small, accessible component API (Button, Modal, Select).
- Decide when to split a component, render recursive trees, and pick the right pattern for a problem.

## 1. Composition: build big UI by putting pieces inside pieces

A **pattern** is a name for a solution that many teams found again and again. Every pattern in this lesson answers one question: how do I make a component reusable without making it hard to use?

The first answer is also the one you will use most: **composition**. You build a bigger component by putting smaller components inside it. The props lesson showed `children`. Here the idea gets a name: **containment**. Some components are boxes, and a box does not know what will go inside it. `Panel`, `Card`, `Dialog` and `Sidebar` are boxes. The box draws the frame. The parent decides the content. Think of a picture frame: it holds any picture, and nobody makes a new frame for every picture.

```jsx
function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export default function App() {
  return (
    <Panel title="Hello">
      <p>Body</p>
    </Panel>
  )
}
```

**What happens, step by step:**
1. `App` writes a `<p>` between `<Panel>` and `</Panel>`. React puts it in the `children` prop.
2. `Panel` renders its frame and places `{children}` under the heading.
3. The page gets `<section class="panel"><h2>Hello</h2><p>Body</p></section>`.
4. `Panel` does not care whether the content is text, a form or another `Panel`. Boxes can be nested as deep as you like.

### Composition instead of inheritance

In classic object-oriented code you reuse behaviour with **inheritance**: `class DangerButton extends Button`. In React you do not do that. The React team's advice, since its early docs, is to build with composition and not to build component inheritance trees. There are three reasons:

- A "different version" of a component is nearly always just different props. Nothing needs to be inherited.
- Inheritance ties the child to the inner details of the parent. Change the parent, and every child can break. A wrapper that uses a component through its props only depends on its public API.
- Composition can combine many pieces. Inheritance gives you one parent and that is all.

**Common mistake:** a box that has to know every kind of content, so every new kind of content needs a new prop.

```jsx
// Wrong: Panel must know about text, buttons and whatever comes next
<Panel title="Settings" text="Dark mode" showButton buttonLabel="Save" />

// Fixed: the parent passes exactly what it wants
<Panel title="Settings">
  <p>Dark mode</p>
  <button type="button">Save</button>
</Panel>
```

The fixed version never has to change `Panel` again. Reusable boxes take `children`.

## 2. Slots: more than one hole to fill

`children` is one hole. When a layout needs several holes, give each one a **name** by using a prop that holds JSX. Such a named hole is called a **slot**. A slot is an ordinary prop; JSX is just a value.

```jsx
function Card({ header, footer, children }) {
  return (
    <article className="card">
      {header && <header className="card-header">{header}</header>}
      <div className="card-body">{children}</div>
      {footer && <footer className="card-footer">{footer}</footer>}
    </article>
  )
}

export default function App() {
  return (
    <>
      <Card header={<h3>Invoice 42</h3>} footer={<button type="button">Pay now</button>}>
        <p>Total: 120 dollars</p>
      </Card>
      <Card>
        <p>Only body</p>
      </Card>
    </>
  )
}
```

**What happens, step by step:**
1. The first card gets three things: the `header` slot, the `footer` slot and the default slot (`children`).
2. `Card` puts each one in its place. The frame, spacing and order belong to `Card`. The content belongs to the caller.
3. The second card passes no slots. `header` and `footer` are `undefined`, so `header && ...` renders nothing. Slots are optional by default.
4. The result for the first card is `<article class="card"><header class="card-header"><h3>Invoice 42</h3></header><div class="card-body"><p>Total: 120 dollars</p></div><footer class="card-footer"><button type="button">Pay now</button></footer></article>`. The second card renders only the `card-body` div.

### Pass an element, or pass a component?

A slot usually receives an **element**: `icon={<SearchIcon />}`. That is the simplest way. Sometimes the box wants to decide the props of the thing it draws (for example the icon size). Then pass the **component** and let the box create the element. Rename the prop to a capital letter first, because JSX treats a lowercase name as an HTML tag:

```jsx
function IconButton({ icon: Icon, children }) {
  return (
    <button type="button">
      <Icon size={16} />
      <span>{children}</span>
    </button>
  )
}

function SearchIcon({ size }) {
  return <svg width={size} height={size} aria-hidden="true" />
}

// <IconButton icon={SearchIcon}>Search</IconButton>
// renders <button type="button"><svg width="16" height="16" aria-hidden="true"></svg><span>Search</span></button>
```

### Drawbacks

- The caller builds slot elements on every render. If you wrap `Card` in `React.memo`, it still renders again each time its parent renders, because `<h3>Invoice 42</h3>` is a brand-new object each time. (We ran a memoized card with a JSX slot: it rendered on mount and again after each parent render. A card given one stable element rendered only once.) See [Memoization](../02-hooks/07-memoization.md).
- Too many slots make the call site hard to read. When you reach four or five, look at compound components (section 7).

**Common mistake:** passing `0` or an empty value as a slot.

```jsx
// Wrong: when items is empty, items.length is 0, and "0" appears in the card
<Card footer={items.length && <Pager />}>...</Card>

// Fixed: pass null (or nothing) when there is no slot
<Card footer={items.length > 0 ? <Pager /> : null}>...</Card>
```

`0 && something` is `0`, and React renders the number `0` on the screen. Make slot conditions true booleans.

## 3. Specialisation: a special case built from a general component

**Specialisation** means making a more specific component by using a general one with some props filled in. `WelcomeDialog` is a `Dialog` with a particular title and message. You do not copy the dialog. You wrap it.

```jsx
function Dialog({ title, message, children }) {
  return (
    <section className="dialog">
      <h2>{title}</h2>
      <p>{message}</p>
      {children}
    </section>
  )
}

function WelcomeDialog() {
  return <Dialog title="Welcome" message="Thanks for visiting." />
}

function ConfirmDialog({ onConfirm, onCancel, ...props }) {
  return (
    <Dialog title="Are you sure?" {...props}>
      <button type="button" onClick={onCancel}>Cancel</button>
      <button type="button" onClick={onConfirm}>Confirm</button>
    </Dialog>
  )
}

// <WelcomeDialog />
// <ConfirmDialog message="Delete this file?" onConfirm={remove} onCancel={close} />
```

**What happens, step by step:**
1. `WelcomeDialog` takes no props. It fills in `title` and `message` and renders `<section class="dialog"><h2>Welcome</h2><p>Thanks for visiting.</p></section>`.
2. `ConfirmDialog` sets a default `title` and passes the rest of its props (`message` here) down with `{...props}`. It also adds two buttons as `children`.
3. The first `ConfirmDialog` shows the title "Are you sure?" and the message "Delete this file?". If a caller passes `title="Custom"`, the later `{...props}` wins, and the dialog shows "Custom". Props written first are defaults. Props written after are overrides.
4. `onConfirm` and `onCancel` are taken out of `props` so they are not passed to `Dialog`, which would ignore them.

The general component holds the layout. The specialised ones hold the decisions. A bug fix in `Dialog` reaches all of them.

**Common mistake:** putting `{...props}` last when the specialisation must stay special.

```jsx
function Button({ variant = 'primary', children, ...rest }) {
  return (
    <button type="button" className={`btn btn-${variant}`} {...rest}>
      {children}
    </button>
  )
}

// Wrong: a caller can still write <DangerButton variant="primary"> and undo the point of the component
function DangerButton(props) {
  return <Button variant="danger" {...props} />
}

// Fixed: forced props go after the spread
function DangerButton(props) {
  return <Button {...props} variant="danger" />
}
```

We ran the fixed version with `variant="primary"` passed in: the button still gets the class `btn btn-danger`. Rule of thumb: defaults before the spread, forced values after it.

## 4. Render props: let the parent decide what to draw

Sometimes a component owns some data or behaviour (a subscription, a measurement, a timer) but should not decide what the screen looks like. A **render prop** solves this. It is a prop whose value is a **function that returns JSX**. The component calls the function and hands it the data.

The function can have any prop name (`render`, `renderItem`). The most common form uses `children` as the function. That form is called **function as children**.

```jsx
import { useEffect, useState } from 'react'

function WindowWidth({ children }) {
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return children(width)
}

export default function App() {
  return (
    <WindowWidth>
      {(width) => <p>Window is {width}px wide</p>}
    </WindowWidth>
  )
}
```

**What happens, step by step:**
1. `App` passes a function between the tags. It is not JSX. It is a function that takes `width` and returns JSX.
2. `WindowWidth` keeps the width in state and listens for the browser `resize` event. It cleans up the listener when it unmounts.
3. On every render it calls `children(width)` and returns the result. In a test browser (jsdom) the first render shows `<p>Window is 1024px wide</p>`.
4. When the window changes size, state changes, `WindowWidth` renders again, calls your function with the new width, and the page shows the new number. We set `window.innerWidth = 500` and fired a `resize` event: the page showed `Window is 500px wide`.

`WindowWidth` knows the data. `App` knows the look. Neither knows the other's business.

The same idea works for lists. A `List` can own the looping and the `ul`, and let each caller draw one row:

```jsx
function List({ items, renderItem }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{renderItem(item)}</li>
      ))}
    </ul>
  )
}

// <List items={users} renderItem={(user) => <strong>{user.name}</strong>} />
// renders <ul><li><strong>Asha</strong></li><li><strong>Ben</strong></li></ul>
```

You will still meet this style in real code: `renderItem` in list and table libraries, and the old `<Context.Consumer>`, which was a render prop until `useContext` replaced it.

**When to use it today:** when a component must call back into the caller's code with data during its own render, and a hook cannot do it. The classic cases are `renderItem` for lists and virtualised lists, and "headless" components (section 10). For sharing plain logic, use a hook (section 6).

**Drawbacks:**
- **Nesting.** Several render props nest into a pyramid:

```jsx
// Imagine Theme and Locale are render-prop components like WindowWidth
<WindowWidth>
  {(width) => (
    <Theme>
      {(theme) => (
        <Locale>{(locale) => <Page width={width} theme={theme} locale={locale} />}</Locale>
      )}
    </Theme>
  )}
</WindowWidth>
```

- **The data lives only inside the function.** The parent component cannot use `width` in its own effects or handlers.
- **A new function on every render.** Your inline arrow is a new object each time, so a memoized child that receives it re-renders every time. (We ran this: a memoized component with an inline `render` prop rendered on mount and after each of two parent renders, 3 times.)

**Common mistake:** rendering `children` as if it were JSX when it is a function.

```jsx
// Wrong: children is a function, so React cannot draw it
function WindowWidth({ children }) {
  return <div>{children}</div>
}

// Fixed: call it and pass the data
function WindowWidth({ children }) {
  const width = useWindowWidth() // a hook that returns the width, see section 6
  return <div>{children(width)}</div>
}
```

With the wrong version React logs "Functions are not valid as a React child" and the `div` stays empty. If a caller passes a normal element instead of a function to the fixed version, you get `TypeError: children is not a function`.

## 5. Higher-order components (HOCs): a function that wraps a component

A **higher-order component** is a **function that takes a component and returns a new component**. The new component wraps the old one, adds something, and renders the old one. The name is borrowed from "higher-order function" (a function that takes or returns functions). By convention a HOC is named `withSomething`.

Before hooks (React 16.7 and older), HOCs were the main way to share logic between components. Redux `connect` is a HOC. The old React Router `withRouter` was one. You will see them in legacy code, and interviewers still ask about them.

Here are two small HOCs: one for loading, one for a login check.

```jsx
import { createContext, useContext } from 'react'

function getName(Component) {
  return Component.displayName || Component.name || 'Component'
}

function withLoading(Component) {
  function WithLoading({ isLoading, ...props }) {
    if (isLoading) return <p>Loading...</p>
    return <Component {...props} />
  }
  WithLoading.displayName = `withLoading(${getName(Component)})`
  return WithLoading
}

const AuthContext = createContext(null)

function withAuth(Component) {
  function WithAuth(props) {
    const user = useContext(AuthContext)
    if (!user) return <p>Please sign in.</p>
    return <Component {...props} user={user} />
  }
  WithAuth.displayName = `withAuth(${getName(Component)})`
  return WithAuth
}

function Profile({ user, title = 'Profile' }) {
  return (
    <p>
      {title}: {user.name}
    </p>
  )
}

const ProfileWithLoading = withLoading(Profile)
const SecureProfile = withAuth(Profile)
```

How the new components behave:

```jsx
// <ProfileWithLoading isLoading user={{ name: 'Asha' }} />
//   shows: Loading...
// <ProfileWithLoading isLoading={false} user={{ name: 'Asha' }} title="Account" />
//   shows: Account: Asha
// <SecureProfile />                      (no AuthContext value)
//   shows: Please sign in.
// <AuthContext value={{ name: 'Asha' }}><SecureProfile title="Hi" /></AuthContext>
//   shows: Hi: Asha
```

**What happens, step by step:**
1. `withLoading(Profile)` runs once, when the module loads. It returns a new component, `WithLoading`, that remembers `Profile` in a closure.
2. When `<ProfileWithLoading isLoading ... />` renders, `WithLoading` takes `isLoading` out of the props and decides what to show: the loading text, or `Profile`.
3. All other props (`user`, `title`) are passed on with `{...props}`. `Profile` does not know it was wrapped.
4. `withAuth` does the same with a login check. It reads the user from context and **adds a new prop**, `user`, so `Profile` gets data it never asked its parent for.
5. `displayName` is the name React DevTools shows. Without it, the wrapper would appear as an anonymous component. With it you see `withAuth(withLoading(Profile))`.

**Rules for writing a HOC:**
- Return a **new** component. Never change the original one.
- Pass unrelated props through with `{...props}`.
- Set a `displayName`.
- Call `withX(Component)` **once, at module level**. Never inside another component's render.

### The drawbacks (why HOCs fell out of favour)

- **Wrapper hell.** Each HOC adds a component to the tree. Four HOCs mean four extra layers, and DevTools shows `withTheme(withAuth(withLoading(Page)))`.
- **Props collisions.** The HOC and the caller may use the same prop name. Nothing warns you. We rendered `<SecureProfile user={{ name: 'Ben' }} />`: the HOC's `user` came after `{...props}`, so the page showed `Profile: Asha` and Ben's object was silently thrown away. Had the HOC put its prop first, the caller would win. Either way somebody loses without an error.
- **Hidden data flow.** Reading `Profile`, you cannot see where `user` comes from. You must find every HOC that wraps it.
- **Refs.** In React 18 and older, `ref` was not a normal prop. A wrapper swallowed it, so `ref` pointed at the wrapper and not at your component, and every HOC needed `forwardRef`. In React 19, `ref` is an ordinary prop on function components, so `{...props}` forwards it. We checked this on React 19.3.1: a ref passed to the wrapped component reached the real `<input>` through the HOC.
- **Static members are not copied.** If the original component has properties attached to it (like `Tabs.List` in section 7), the wrapper does not have them. Older code used a helper library to copy them.
- **Hard to type** in TypeScript, because the HOC changes the props.

### Where HOCs are still fine

- `memo(Component)` works like a HOC: it takes a component and returns a better one.
- Old libraries and code you maintain (Redux `connect`, MobX `observer`). See the legacy React lesson (planned).
- Wrapping **class components**, which cannot use hooks.
- A guard such as "must be logged in" can also be a normal wrapper component with `children`, which many teams prefer:

```jsx
function RequireAuth({ children }) {
  const user = useContext(AuthContext)
  if (!user) return <p>Please sign in.</p>
  return children
}

// <RequireAuth><Profile user={user} /></RequireAuth>
// shows "Please sign in." with no AuthContext value, and "Profile: Asha" when the user exists
```

No new component type, no hidden props, and you can see the guard in the JSX.

**Common mistake:** creating the HOC result inside a component.

```jsx
// Wrong: every render makes a NEW component type
function Parent() {
  const [n, setN] = useState(0)
  const EnhancedCounter = withLoading(Counter)
  return (
    <>
      <button type="button" onClick={() => setN(n + 1)}>Rerender parent ({n})</button>
      <EnhancedCounter isLoading={false} />
    </>
  )
}

// Fixed: create it once, outside any component
const EnhancedCounter = withLoading(Counter)

function Parent() {
  /* ... same JSX ... */
}
```

React decides "same component or new one?" by comparing the function itself. A new function every render means a new type, so React throws the old one away, including its state. We counted a `Counter` that had been clicked twice: after the parent re-rendered, it showed `Count: 0` again, and the mount log read `mount, unmount, mount`. The fixed version kept `Count: 2` and logged only one `mount`.

## 6. Custom hooks: the modern way to share logic

Hooks arrived in React 16.8 and gave function components their own way to share **stateful logic**: write a function that starts with `use` and calls other hooks. No extra component, no wrapper, no function child. The [custom hooks lesson](../02-hooks/08-custom-hooks.md) covers writing them. Here is why they replaced most render props and HOCs.

The same window-width logic, as a hook:

```jsx
import { useEffect, useState } from 'react'

function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth) // client-only: reads window

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
  return <p>{width < 600 ? 'Small screen' : 'Big screen'}</p>
}
```

**What happens, step by step:**
1. `Banner` calls `useWindowWidth()` like any function. The hook keeps its state and its listener inside the `Banner` that called it.
2. At 1024 pixels the page shows `Big screen`. After a resize to 500 it shows `Small screen`.
3. There is no extra component in the tree, no function child, and no prop that was injected from somewhere.

The render prop and the HOC can be built on top of the hook in a few lines. This is also how you keep old APIs alive after a migration:

```jsx
function WindowWidth({ children }) {
  return children(useWindowWidth())
}

function withWindowWidth(Component) {
  function WithWindowWidth(props) {
    const width = useWindowWidth()
    return <Component {...props} width={width} />
  }
  WithWindowWidth.displayName = `withWindowWidth(${Component.displayName || Component.name || 'Component'})`
  return WithWindowWidth
}
```

We rendered a render-prop consumer, a HOC-wrapped `Banner` and a hook consumer side by side. At a width of 1024 they showed `RP 1024`, `Big screen` and `1024`. After we set the width to 500 and fired a `resize` event, they showed `RP 500`, `Small screen` and `500`. All three follow the same logic.

**Why hooks won:**
- **No extra tree layers.** The component tree stays flat.
- **You see where data comes from.** `const width = useWindowWidth()` is right in the component.
- **No name collisions.** You choose the variable name yourself.
- **They combine.** Three hooks in a row replace the pyramid from section 4.
- **They work anywhere in the component**, including effects and event handlers, and TypeScript infers their types easily.

**What hooks cannot do:**
- They share **logic**, not **UI**. A hook cannot wrap or replace what a component renders (a login guard, an error boundary).
- They cannot be used in class components.
- Each component that calls a hook gets its **own** state. A hook does not share state between components. For shared state, lift the state up, or use context (section 14).

**Common mistake:** expecting two components that call the same hook to stay in sync.

```jsx
// Wrong idea: both use useToggle, so they must share one value
function ButtonA() {
  const [on, toggle] = useToggle()
  return <button type="button" onClick={toggle}>A is {on ? 'on' : 'off'}</button>
}
function StatusB() {
  const [on] = useToggle()
  return <p>B is {on ? 'on' : 'off'}</p>
}

// Fixed: one component owns the state and passes it down
function Fixed() {
  const [on, toggle] = useToggle()
  return (
    <>
      <button type="button" onClick={toggle}>A is {on ? 'on' : 'off'}</button>
      <p>B is {on ? 'on' : 'off'}</p>
    </>
  )
}
```

(Here `useToggle` is a simple hook that returns `[on, toggle]`, built on `useState`.) After one click on the wrong version, the page read `A is on` and `B is off`. In the fixed version it read `A is on` and `B is on`.

## 7. Compound components: parts that work together through context

Look at HTML. A `<select>` and its `<option>` elements only make sense together. You do not pass the selected value to each option by hand. They cooperate by themselves, and you decide the order and the content. A **compound component** brings this style to React: a set of components that share hidden state, so the user writes a readable tree and does not wire anything.

Compare two APIs for the same widget:

```jsx
// Configuration API: simple, but rigid
<Tabs tabs={[{ id: 'about', label: 'About', content: <About /> }]} />

// Compound API: flexible, reads like HTML
<Tabs defaultValue="about">
  <Tabs.List label="Product information">
    <Tabs.Tab value="about">About</Tabs.Tab>
    <Tabs.Tab value="pricing">Pricing</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="about">...</Tabs.Panel>
  <Tabs.Panel value="pricing">...</Tabs.Panel>
</Tabs>
```

With the compound version you can add an icon inside one tab, put a banner between the list and the panels, or style the parts separately, and `Tabs` does not need a new prop for any of it.

The recipe has three steps. The **root** component owns the state and puts it in a context. The **parts** read the context. Each part is a small component with one job.

```jsx
import { createContext, useContext, useId, useState } from 'react'

const TabsContext = createContext(null)

function useTabs() {
  const context = useContext(TabsContext)
  if (context === null) {
    throw new Error('Tabs.List, Tabs.Tab and Tabs.Panel must be used inside <Tabs>')
  }
  return context
}

export function Tabs({ defaultValue, children }) {
  const [value, setValue] = useState(defaultValue)
  const baseId = useId()

  return (
    <TabsContext value={{ value, setValue, baseId }}>
      <div className="tabs">{children}</div>
    </TabsContext>
  )
}

function TabList({ label, children }) {
  return (
    <div role="tablist" aria-label={label}>
      {children}
    </div>
  )
}

function Tab({ value, children }) {
  const { value: activeValue, setValue, baseId } = useTabs()
  const selected = activeValue === value

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      onClick={() => setValue(value)}
    >
      {children}
    </button>
  )
}

function TabPanel({ value, children }) {
  const { value: activeValue, baseId } = useTabs()
  if (activeValue !== value) return null

  return (
    <div role="tabpanel" id={`${baseId}-panel-${value}`} aria-labelledby={`${baseId}-tab-${value}`}>
      {children}
    </div>
  )
}

Tabs.List = TabList
Tabs.Tab = Tab
Tabs.Panel = TabPanel
```

Use it like this:

```jsx
export default function App() {
  return (
    <Tabs defaultValue="about">
      <Tabs.List label="Product information">
        <Tabs.Tab value="about">About</Tabs.Tab>
        <Tabs.Tab value="pricing">Pricing</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="about">Acme builds small tools.</Tabs.Panel>
      <Tabs.Panel value="pricing">Plans start at 9 dollars.</Tabs.Panel>
    </Tabs>
  )
}
```

**What happens, step by step:**
1. `Tabs` creates the state `value` (the active tab), starting at `"about"`, and a `baseId` from `useId`. `useId` gives a unique id string per `Tabs` instance, so two `Tabs` on one page never share ids.
2. `Tabs` puts `{ value, setValue, baseId }` in `TabsContext`. Everything between its tags can read it, however deep.
3. Each `Tab` reads the context. It is `selected` when its own `value` equals the active one. It sets `aria-selected`, builds ids from `baseId`, and calls `setValue` on click.
4. Each `TabPanel` reads the same context and renders nothing unless its `value` is the active one.
5. Initially the About tab has `aria-selected="true"` and `tabindex="0"`, Pricing has `aria-selected="false"` and `tabindex="-1"`, and only the About panel is in the page. A click on Pricing flips these and swaps the panel. We checked that the panel's accessible name becomes "Pricing" (it points at its tab through `aria-labelledby`).
6. We rendered two `Tabs` on one page: all four tab ids were different, for example `_r_1_-tab-about` and `_r_2_-tab-about`. (The exact text from `useId` can change between React versions, so never depend on it.)

A real tabs widget also needs arrow-key support and focus handling. The [Tabs exercise](../practice-app/exercises/react/05-tabs/README.md) asks you for exactly that.

`Tabs.List = TabList` hangs the parts on the root function as properties. You can also export flat names (`Tabs`, `TabsList`, `TabsTab`) and let callers write `import * as Tabs from './tabs'`. Both are fine. Flat exports are friendlier to some bundlers and frameworks that split server and client code.

The same recipe builds an Accordion (root holds which item is open) and a Select (root holds the selected value and whether it is open). The [Practice section](#practice-yourself) has you build the Accordion. Libraries such as Radix UI, Headless UI and React Aria are built like this.

```jsx
// A Select built as a compound component would read like this
<Select value={color} onValueChange={setColor} placeholder="Pick a color">
  <Select.Option value="red">Red</Select.Option>
  <Select.Option value="green">Green</Select.Option>
</Select>
```

### The old way: cloning children

Before hooks and the modern context API, compound components were built by walking `props.children` with `Children.map` and injecting props with `cloneElement`. Both are listed as **legacy** on react.dev ("not recommended for new code"), for good reason: the injected props only reach the **direct** children. We tested it:

```jsx
function OldTabs({ children }) {
  const [index, setIndex] = useState(0)
  return Children.map(children, (child, i) =>
    cloneElement(child, { active: i === index, onSelect: () => setIndex(i) }),
  )
}

// <OldTabs><Tab>One</Tab><FancyTab>Two</FancyTab></OldTabs>
```

If `FancyTab` is a user's own component that renders `<Tab>`, the injected `active` and `onSelect` land on `FancyTab`, which ignores them. Clicking "Two" did nothing. If the tabs are wrapped in a fragment (`<>...</>`), `Children.map` sees one child (the fragment), so neither tab was ever active. Context has none of these problems: a part can sit at any depth.

### Drawbacks

- More code, and more names for users to learn.
- Nothing forces the right order or number of parts. Users can forget a `Tabs.Panel`.
- The context value `{ value, setValue, baseId }` is a new object on every render of `Tabs`, so every part re-renders with it. For a small widget this is fine. Read [useContext](../02-hooks/05-usecontext.md) for the cure.
- Typing the dot-notation parts in TypeScript takes a little care.

**Common mistake:** using a part outside its root, with a bare `useContext` and no check.

```jsx
// Wrong: context is null outside <Tabs>, and the error is confusing
function Tab({ value, children }) {
  const { value: activeValue } = useContext(TabsContext) // TypeError about destructuring null
  /* ... */
}

// Fixed: a small hook that throws a helpful message (useTabs in the code above)
function Tab({ value, children }) {
  const { value: activeValue } = useTabs()
  /* ... */
}
```

We rendered `<Tabs.Tab>` alone: the fixed version throws "Tabs.List, Tabs.Tab and Tabs.Panel must be used inside <Tabs>", which tells the user what to do.

## 8. Controlled and uncontrolled component APIs

You know this pair from native inputs (see [Forms](../01-basics/07-forms.md)):

- **Controlled:** the parent owns the value. It passes `value` and `onChange`, and the input shows what the parent says.
- **Uncontrolled:** the component owns the value. The parent passes at most `defaultValue` (the starting value) and may listen with `onChange`.

Your own components can follow the same convention. A good reusable component supports **both**, so the caller picks. The logic is the same every time, so we put it in a small hook, `useControllableState`:

```jsx
import { useState } from 'react'

export function useControllableState({ value, defaultValue, onChange }) {
  const isControlled = value !== undefined
  const [innerValue, setInnerValue] = useState(defaultValue)
  const current = isControlled ? value : innerValue

  function setValue(next) {
    const nextValue = typeof next === 'function' ? next(current) : next
    if (!isControlled) setInnerValue(nextValue)
    if (!Object.is(nextValue, current)) onChange?.(nextValue)
  }

  return [current, setValue]
}
```

Use it in a quantity stepper (put it in the same file, so `useState` is already imported):

```jsx
function Stepper({ value, defaultValue = 0, onChange, step = 1 }) {
  const [current, setCurrent] = useControllableState({ value, defaultValue, onChange })

  return (
    <div>
      <button type="button" aria-label="Decrease" onClick={() => setCurrent(current - step)}>-</button>
      <output>{current}</output>
      <button type="button" aria-label="Increase" onClick={() => setCurrent(current + step)}>+</button>
    </div>
  )
}

export default function App() {
  const [qty, setQty] = useState(2)

  return (
    <>
      <Stepper value={qty} onChange={setQty} />
      <Stepper defaultValue={5} />
      <p>Parent sees {qty}</p>
    </>
  )
}
```

**What happens, step by step:**
1. The first `Stepper` gets `value={qty}`, which is not `undefined`, so it is **controlled**. The hook ignores its inner state and returns `qty`.
2. The second `Stepper` gets no `value`, so it is **uncontrolled**. The hook returns its inner state, which started as `defaultValue`.
3. The page starts as `-2+`, `-5+` and `Parent sees 2` (the two steppers show 2 and 5).
4. Click `+` on the first stepper. The hook calls `onChange(3)`, which is `setQty(3)`. The parent re-renders and passes `value={3}`. The page shows 3 and `Parent sees 3`.
5. Click `+` on the second stepper. The hook updates its own state, so the stepper shows 6. The parent never hears about it, because no `onChange` was passed, so the line still reads `Parent sees 3`.
6. `onChange` runs only when the value really changes, and in both modes. A parent can watch an uncontrolled component too.

**Which to offer?** Controlled gives the parent power: validate, reset, keep two widgets in sync, store the value in the URL. Uncontrolled is simpler to use, because the caller wires nothing. A reusable component should accept both. A one-off component in your app can pick whichever is simpler. To reset an uncontrolled component from outside, change its `key`.

**Rules and gotchas:**
- **Decide once.** The component is controlled when `value !== undefined`. Do not switch a component between modes while it is mounted. We rendered `<Stepper value={5} defaultValue={1} />` and then re-rendered it without `value`: it jumped from showing 5 to showing 1, because its inner state had never been updated while it was controlled.
- **Test for `undefined`, not truthiness.** `null`, `0`, `''` and `false` are real values. We passed `value={null}` and the hook returned `null`, as a controlled value should (for example "nothing selected").
- **Updater functions see a snapshot.** `setCount((c) => c + 1)` called twice in one click handler adds only 1, because both calls read the same `current`. (We ran it: the count was 1.) This is simpler than `useState`'s updater. Production libraries solve it with extra bookkeeping; when you need it, read the advanced patterns lesson (planned). In TypeScript you would make the hook generic, `useControllableState<T>`; see [TypeScript with React](08-typescript-with-react.md).
- **Naming.** For plain value components, many libraries call the callback `onValueChange(value)` and keep `onChange(event)` for native events. Pick a convention and stick to it.

**Common mistake:** a controlled component with no way to change.

```jsx
// Wrong: value is fixed at 5 and nothing updates it
<Stepper value={5} />

// Fixed: either hold the state in the parent...
function Parent() {
  const [qty, setQty] = useState(5)
  return <Stepper value={qty} onChange={setQty} />
}

// ...or let the component keep it
<Stepper defaultValue={5} />
```

We rendered `<Stepper value={5} onChange={fn} />` and clicked `+` twice: the display stayed 5, and `fn` received `6` both times, because the parent never fed 6 back. A native input does the same and React warns: "You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field."

## 9. Container and presentational components

This is an older pattern with a lasting idea. Split a feature into two kinds of component:

- A **presentational** component is about how things look. It gets data and callbacks from props, usually has no state of its own, and renders JSX. It is easy to reuse, test and show in isolation.
- A **container** component is about how things work. It owns the state, runs the logic (or fetches data), and passes the results down as props. It renders little markup of its own.

```jsx
import { useState } from 'react'

const USERS = [
  { id: 1, name: 'Asha Rao' },
  { id: 2, name: 'Ben Carter' },
  { id: 3, name: 'Chen Li' },
]

// Presentational: props in, JSX out, no state
function UserList({ users, query, onQueryChange }) {
  return (
    <div>
      <label>
        Search
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} />
      </label>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <ul>
          {users.map((user) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Container: owns state and logic
export default function UserListContainer() {
  const [query, setQuery] = useState('')
  const visible = USERS.filter((user) => user.name.toLowerCase().includes(query.toLowerCase()))

  return <UserList users={visible} query={query} onQueryChange={setQuery} />
}
```

**What happens, step by step:**
1. `UserListContainer` holds `query` and works out `visible`, the filtered users.
2. It renders `UserList` with plain props: the list, the query, and a callback.
3. `UserList` just draws. It has no idea where the users come from.
4. Typing `ch` calls `onQueryChange('ch')`. The container updates, and `UserList` receives one user, `Chen Li`.
5. Testing the presentational part needs no state at all: `<UserList users={[]} query="zzz" onQueryChange={() => {}} />` renders `No users found.` right away.

**A bit of history.** The split became popular around 2015, when Redux apps had "containers" made by `connect` and "dumb" components inside. After hooks arrived, its main promoter said he no longer pushed the split as a rule, because a custom hook separates logic from markup without forcing two components.

**The modern view.** The idea is still good: keep logic and markup apart. But the container is now often a **custom hook**:

```jsx
function useUserSearch(users) {
  const [query, setQuery] = useState('')
  const visible = users.filter((user) => user.name.toLowerCase().includes(query.toLowerCase()))
  return { query, setQuery, visible }
}

function UserSearch() {
  const { query, setQuery, visible } = useUserSearch(USERS)
  return <UserList users={visible} query={query} onQueryChange={setQuery} />
}
```

Both versions render the same three users at the start. Use a separate container component when you want a clear page-level boundary or need to pass the same logic to several different views. Use a hook when you just want the logic out of the way. A Server Component that loads data and passes it as props to a client component is the same split in spirit (see [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md)). The [Kanban exercise](../practice-app/exercises/react/25-kanban-board/README.md) asks for this style: logic in a reducer, screen in small components that only show data and call functions.

**Common mistake:** a "presentational" component that secretly fetches data or reads global state.

```jsx
// Wrong: UserList now needs a server, so it cannot be tested or reused with plain props
function UserList() {
  const users = useFetchUsers()
  /* ... */
}

// Fixed: data comes in through props
function UserList({ users }) {
  /* ... */
}
```

## 10. Headless components and props getters

A **headless** component (or hook) gives you the **behaviour** of a widget (state, keyboard handling, accessibility attributes) but **no markup and no styles**. "Headless" means it has no visible head. You bring your own HTML and CSS. This is how design systems stay in control of how things look while reusing hard-to-get-right logic. React Aria, Headless UI, Downshift and TanStack Table work this way, and Radix UI offers unstyled primitives.

How does the hook reach your markup? It returns the props you must spread on your element. A function that returns those props is called a **props getter**.

```jsx
import { useState } from 'react'

function callAll(...fns) {
  return (...args) => fns.forEach((fn) => fn?.(...args))
}

function useToggle({ initialOn = false } = {}) {
  const [on, setOn] = useState(initialOn)

  function toggle() {
    setOn((current) => !current)
  }

  function getTogglerProps({ onClick, ...rest } = {}) {
    return {
      'aria-pressed': on,
      onClick: callAll(onClick, toggle),
      ...rest,
    }
  }

  return { on, toggle, getTogglerProps }
}

export default function App() {
  const { on, getTogglerProps } = useToggle()

  return (
    <button type="button" {...getTogglerProps({ onClick: () => console.log('my handler ran') })}>
      {on ? 'On' : 'Off'}
    </button>
  )
}
```

**What happens, step by step:**
1. On the first render `on` is `false`. `getTogglerProps` returns `{ 'aria-pressed': false, onClick: <combined function> }`. The page shows `<button type="button" aria-pressed="false">Off</button>`.
2. `{...getTogglerProps(...)}` spreads those props on the button. The hook never created the `button`. You did.
3. You passed your own `onClick`. The getter combines it with its own `toggle` using `callAll`, so **both** run on a click: first yours, then the toggle.
4. After a click, the console prints `my handler ran`, `on` becomes `true`, and the button reads `On` with `aria-pressed="true"`.

Why a **getter** and not a plain object? A plain object (a "prop collection") would be overwritten if the caller also wrote `onClick={...}`. A getter lets the caller hand over their handlers so the hook can merge them.

A headless piece can be a hook (above) or a component that uses a render prop (`<Toggle>{({ on, getTogglerProps }) => ...}</Toggle>`). This is the place where render props are still alive.

**Drawbacks:** the caller does more work (markup, styles, wiring), and it is possible to spread the props on the wrong element and break accessibility. Good headless libraries document which element each getter belongs on. The advanced patterns lesson (planned) shows larger headless widgets.

**Common mistake:** spreading the getter's result and then writing your own `onClick` after it.

```jsx
// Wrong: the second onClick replaces the toggle, so the button never toggles
<button type="button" {...getTogglerProps()} onClick={() => console.log('hi')}>Toggle</button>

// Fixed: give your handler to the getter so it can merge
<button type="button" {...getTogglerProps({ onClick: () => console.log('hi') })}>Toggle</button>
```

## 11. The state reducer pattern

Sometimes users of your component need to change **how its state changes**, not only watch it. For example: "this toggle may be switched at most 4 times", or "this counter must stay between 0 and 10". You cannot add a prop for every rule. The **state reducer pattern** lets the caller **pass in a reducer** that decides the next state. Your component or hook uses it instead of its own. (If reducers are new to you, read [useReducer](../02-hooks/06-usereducer.md).)

The hook offers a default reducer and its action types, and accepts an override:

```jsx
import { useReducer } from 'react'

const actionTypes = { toggle: 'toggle', reset: 'reset' }

function toggleReducer(state, action) {
  switch (action.type) {
    case actionTypes.toggle:
      return { on: !state.on, count: state.count + 1 }
    case actionTypes.reset:
      return action.initialState
    default:
      throw new Error(`Unknown action type: ${action.type}`)
  }
}

function useToggle({ initialOn = false, reducer = toggleReducer } = {}) {
  const initialState = { on: initialOn, count: 0 }
  const [state, dispatch] = useReducer(reducer, initialState)

  function toggle() {
    dispatch({ type: actionTypes.toggle })
  }
  function reset() {
    dispatch({ type: actionTypes.reset, initialState })
  }

  return { on: state.on, count: state.count, toggle, reset }
}
```

A caller who wants a limit passes a reducer that calls the default one and then **intercepts**:

```jsx
export default function LimitedToggle() {
  const { on, count, toggle, reset } = useToggle({
    reducer(state, action) {
      if (action.type === actionTypes.toggle && state.count >= 4) {
        return state // refuse: keep the old state
      }
      return toggleReducer(state, action)
    },
  })

  return (
    <div>
      <button type="button" onClick={toggle}>{on ? 'On' : 'Off'}</button>
      <p>Toggled {count} times</p>
      <button type="button" onClick={reset}>Reset</button>
    </div>
  )
}
```

**What happens, step by step:**
1. The default reducer flips `on` and counts every toggle.
2. `LimitedToggle` passes its own reducer. React calls it for every dispatched action, with the current `state` and the `action`.
3. For a `toggle` action with `count` already at 4, the custom reducer returns the same `state`, so nothing changes.
4. For everything else it calls the default `toggleReducer`, so normal behaviour stays.
5. We clicked the toggle button six times. The button read `On`, `Off`, `On`, `Off`, and then stayed `Off` for the fifth and sixth click, with `Toggled 4 times` shown. Clicking Reset gave `Off` and `Toggled 0 times`.

**Trade-offs:** it is very flexible, but the action types and the shape of the state are now **public API**. If you rename an action or move a field, you break every caller's reducer. Keep the custom reducer pure and based only on `state` and `action`. Use this pattern for hooks and components with many users and many opinions; a simple `onChange` and controlled props (section 8, sometimes called "control props") is lighter when you only need to react to changes.

**Common mistake:** returning a new object when you meant to refuse.

```jsx
// Wrong: always creates a new state object, so React treats it as a change
function limitedReducer(state, action) {
  if (action.type === actionTypes.toggle && state.count >= 4) return { ...state }
  return toggleReducer(state, action)
}

// Fixed: return the very same state object to say "no change"
function limitedReducer(state, action) {
  if (action.type === actionTypes.toggle && state.count >= 4) return state
  return toggleReducer(state, action)
}
```

React skips the update when the reducer returns the exact same state object.

## 12. Polymorphic components: the `as` prop

A **polymorphic** component can render as different HTML elements or components, chosen by the caller, while keeping its own style and behaviour. The usual prop is `as`.

```jsx
function Text({ as: Tag = 'p', children, ...rest }) {
  return <Tag {...rest}>{children}</Tag>
}

function Link({ to, children }) {
  return <a href={`/app${to}`}>{children}</a>
}

export default function App() {
  return (
    <>
      <Text>Hello</Text>
      <Text as="h1">Title</Text>
      <Text as="a" href="/docs">Docs</Text>
      <Text as={Link} to="/docs">Router docs</Text>
    </>
  )
}
```

The page renders `<p>Hello</p><h1>Title</h1><a href="/docs">Docs</a><a href="/app/docs">Router docs</a>`.

**What happens, step by step:**
1. `as: Tag = 'p'` renames the prop to `Tag` while destructuring and gives it a default. Without `as`, the element is a `p`.
2. `<Tag {...rest}>` renders whatever `Tag` is. If it is a string like `"h1"`, React creates that HTML element. If it is a component like `Link`, React renders that component.
3. `{...rest}` forwards every other prop. So `href` reaches the `a`, and `to` reaches `Link`.

The reason for the capital letter: JSX treats a lowercase tag name as a built-in HTML element. `<tag>` is the literal HTML tag `tag`, not the variable.

**Why use it?** The right HTML element matters for accessibility and SEO, but the look is separate. A `Heading` can look the same as `h2` and be an `h1` where the page needs one. A `Button` can render a real link when it navigates. A design system can render its `Button` as the router's `Link`.

**Drawbacks:**
- **TypeScript is hard.** `<Text as="a" href="/x">` should be allowed and `<Text as="p" href="/x">` should be an error. The type has to depend on the `as` value. The typed version below works (we compiled it with TypeScript 7.0.2). See [TypeScript with React](08-typescript-with-react.md).
- **It is easy to pick a bad element**, such as a `div` with an `onClick`, which is not keyboard accessible.
- Different libraries use different names for the same idea (`as`, `component`, or an `asChild` prop that merges your props into the single child element you pass). Know the idea, not one spelling.
- When the options for the element are known and few, a **lookup object** is simpler and fully typed:

```jsx
const fieldTypes = { text: TextField, checkbox: CheckboxField }

function Field({ type, ...props }) {
  const Component = fieldTypes[type]
  if (!Component) return <p>Unknown field type: {type}</p>
  return <Component {...props} />
}
```

This "component map" is how schema-driven forms choose a component per field type. The [Dynamic form builder exercise](../practice-app/exercises/react/30-dynamic-form-builder/README.md) uses exactly this idea.

The typed polymorphic component:

```tsx
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

type TextProps<T extends ElementType> = {
  as?: T
  children?: ReactNode
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children'>

export function Text<T extends ElementType = 'p'>({ as, children, ...rest }: TextProps<T>) {
  const Tag: ElementType = as ?? 'p'
  return <Tag {...rest}>{children}</Tag>
}

// OK:    <Text as="a" href="/docs">Docs</Text>
// Error: <Text href="/docs">Oops</Text>   (a p element has no href)
```

**Common mistake:** a lowercase variable for the tag.

```jsx
// Wrong: <tag> is the literal HTML element "tag"
function Text({ as: tag = 'p', children }) {
  return <tag>{children}</tag>
}

// Fixed: start the variable with a capital letter
function Text({ as: Tag = 'p', children }) {
  return <Tag>{children}</Tag>
}
```

With the wrong version and `as="h2"`, the page got `<tag>x</tag>` and the console said that the tag is unrecognized and a React component name must start with an uppercase letter.

## 13. Forwarding refs and spreading rest props

A **wrapper component** is a component that wraps a native element (`TextField` wraps `input`). A good wrapper should behave like the element it wraps: it accepts the same attributes, passes them on, and lets callers reach the real DOM node. Two tools do that: **rest props** and **refs**.

In React 19, `ref` is a normal prop on function components, so passing it on is easy:

```jsx
import { useId } from 'react'

function TextField({ label, id, ref, ...rest }) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} ref={ref} {...rest} />
    </div>
  )
}

// <TextField label="Name" ref={inputRef} placeholder="Your name" aria-describedby="hint" />
```

**What happens, step by step:**
1. `{ label, id, ref, ...rest }` takes out the props the component handles itself. `rest` holds everything else (`placeholder`, `aria-describedby`, `type`, `onChange` and so on).
2. `id ?? autoId` lets the caller choose the id, and falls back to a unique one from `useId`. The label's `htmlFor` and the input's `id` always match.
3. `ref={ref}` puts the caller's ref on the real `<input>`. The caller's `inputRef.current` is the DOM `input`, so `inputRef.current.focus()` works.
4. `{...rest}` forwards the rest. The rendered HTML was `<div class="field"><label for="_r_3_">Name</label><input id="_r_3_" placeholder="Your name" aria-describedby="hint"></div>`.

**Older code and `forwardRef`.** Before React 19, a function component did not receive `ref` as a prop. You wrapped it in `forwardRef`, which gave you `ref` as a second argument:

```jsx
import { forwardRef } from 'react'

const TextField = forwardRef(function TextField({ label, ...rest }, ref) {
  return (
    <label>
      {label}
      <input ref={ref} {...rest} />
    </label>
  )
})
```

It still works in React 19.3.1 (we ran it, and the ref reached the `input`), and you will find it in many libraries. React's docs say it will be deprecated in a future release. Write new code with `ref` as a prop. More in [useRef](../02-hooks/04-useref.md).

### Merge, do not overwrite

Spreading `rest` is easy to get wrong when your component also sets the same props. Look at a Button with its own class and its own behaviour:

```jsx
// Wrong: the caller's className and onClick REPLACE ours, because the spread comes last
function Button({ children, ...rest }) {
  return (
    <button type="button" className="btn" onClick={trackClick} {...rest}>
      {children}
    </button>
  )
}
```

We rendered `<Button className="mine" onClick={mine}>`: the HTML was `<button type="button" class="mine">`. Our `btn` class was gone, and `trackClick` never ran. The fix is to take those props out and **merge** them:

```jsx
function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  onClick,
  children,
  ref,
  ...rest
}) {
  function handleClick(event) {
    if (loading) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  return (
    <button
      type="button"
      {...rest}
      ref={ref}
      className={`btn btn-${variant} btn-${size} ${className}`.trim()}
      aria-busy={loading || undefined}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}
```

The rules in that code:
- **Safe defaults go before `{...rest}`** (`type="button"`), so callers can override them. We rendered `<Button type="submit">` and got a submit button.
- **Props you must control go after** (`className`, `onClick`, `ref`), and you merge the caller's value yourself.
- **`type="button"` by default** matters: a `button` inside a form submits the form unless it says otherwise.
- `aria-busy={loading || undefined}` adds the attribute only while loading. `undefined` removes it.

Results we saw: `<Button onClick={fn} className="mine">Save</Button>` gave `class="btn btn-primary btn-md mine"`, and clicking it called `fn` once. `<Button loading onClick={fn}>` had `aria-busy="true"` and clicking it did **not** call `fn`.

**Common mistake:** spreading props that the DOM does not know.

```jsx
// Wrong: isActive is not an HTML attribute; React warns and drops it
function Box({ children, ...rest }) {
  return <div {...rest}>{children}</div>
}

// Fixed: take your own props out first
function Box({ isActive, children, ...rest }) {
  return <div className={isActive ? 'on' : 'off'} {...rest}>{children}</div>
}
```

## 14. Prop drilling: the alternatives, in order

You met **prop drilling** (passing a prop through components that do not use it) in the [props lesson](../01-basics/04-components-and-props.md). The patterns of this lesson give you the full list of ways out. Try them from top to bottom:

1. **Do nothing.** One or two levels of drilling is explicit and easy to follow.
2. **Pass elements, not data (composition and slots).** Let the owner build the piece and pass the finished element down. The layers in the middle then know only about an empty slot:

```jsx
function Page({ avatar }) {
  return <Header avatar={avatar} />
}

function Header({ avatar }) {
  return <header>{avatar}</header>
}

function Avatar({ user }) {
  return <img src={user.photo} alt={user.name} />
}

export default function App() {
  const user = { name: 'Asha', photo: '/asha.png' }
  return <Page avatar={<Avatar user={user} />} />
}
```

The page gets `<header><img alt="Asha" src="/asha.png"></header>`. `Page` and `Header` never see `user`, so changing the shape of `user` touches only `App` and `Avatar`. With `children` instead of an `avatar` prop, the middle layers would not even need a prop.

3. **Move the state down.** If only one part needs a piece of state, keep it there (section 16).
4. **Context.** For data that many components across the tree read (theme, current user, language), a context lets a deep component read it directly. A compound component (section 7) is a local context. See [useContext](../02-hooks/05-usecontext.md).
5. **A state library** for large shared client state, or a **query library** for server data, or the **URL** for state that should survive a refresh. See [State management](06-state-management.md) and [Data fetching](02-data-fetching.md).

Reaching for step 4 or 5 first is the common mistake. Context and stores solve real problems, but they make data flow harder to follow.

## 15. Designing a good component API

The **API** of a component is its props: its name, what it accepts, and what it promises. Interviewers like the question "design a reusable Button, Modal or Select" because there is no single correct answer. They want to see how you think. These guidelines work for all three.

1. **Keep the surface small.** Every prop is something you must support forever. Start with what the first two users need. Adding a prop later is easy; removing one breaks people.
2. **Choose sensible defaults.** `<Button>Save</Button>` should work with no other props, and with `type="button"` so it never submits a form by accident.
3. **Be accessible by default.** Use the right element (`button`, not `div`). Give controls names. Support the keyboard. Manage focus. A caller should have to do extra work to make something inaccessible, not the other way round. See [Accessibility](../04-advanced/09-accessibility.md).
4. **Prefer a few named choices to many booleans.** Booleans multiply and contradict each other:

```jsx
// Hard to use: what does primary plus danger mean?
<Button primary danger small />

// Clear: one prop, a fixed set of values
<Button variant="danger" size="sm" />
```

5. **Prefer composition to configuration.** Take `children` and slots before you invent `title`, `subtitle`, `icon`, `iconPosition`, `showClose` and `closeLabel`. When the pieces grow past three or four, use a compound component.
6. **Pass through the rest.** Spread `...rest` on the root element, merge `className` and handlers, and forward `ref` (section 13). Callers can then add `aria-*`, `data-*` and test ids without a new prop.
7. **Support both controlled and uncontrolled** for any value-like state (`value`, `open`, `checked`) with `defaultValue`, `value` and `onChange` (section 8).
8. **Name things the usual way.** Callbacks start with `on` (`onClose`), render props with `render` (`renderItem`), initial values with `default` (`defaultOpen`). Use the same words as the platform: `disabled`, `required`, `name`, `value`.
9. **Keep instances independent.** No global variables or shared module state, so ten copies on one page work (that is why `Tabs` uses `useId`). Handle the empty state, a long list and a slow response too.
10. **Leave an escape hatch.** `className`, `style` and `...rest` mean you do not need to fork the component on day one.

The Button in section 13 follows these: small surface (`variant`, `size`, `loading`), safe defaults, merged `className` and `onClick`, forwarded `ref`.

### Modal and Select, using the same rules

These are sketches of how the finished components are *used*. They show decisions, not implementations. (A real Modal is the job of the [Modal exercise](../practice-app/exercises/react/14-modal-portal/README.md).)

```jsx
// Modal: controlled open state, a required title, slots for content and actions
<Modal
  open={isOpen}
  onClose={() => setOpen(false)}
  title="Delete file?"
  footer={<Button onClick={confirmDelete}>Delete</Button>}
>
  <p>This cannot be undone.</p>
</Modal>
```

Decisions for the Modal: `open` and `onClose` (controlled, because the parent usually knows why it opened); a required `title`, so the dialog always has an accessible name; render into a portal so it is not clipped by parent styles; move focus in, keep it inside, give it back to the opener on close; close on Escape; stop the page behind it scrolling.

```jsx
// Select: compound parts, both controlled and uncontrolled, works inside a form
<Select name="color" value={color} onValueChange={setColor} placeholder="Pick a color">
  <Select.Option value="red">Red</Select.Option>
  <Select.Option value="green" disabled>Green</Select.Option>
</Select>
```

Decisions for the Select: start from the native `<select>` and only build a custom one when options need rich content; compound `Option` parts so users can add groups and icons; `value` or `defaultValue`; a `name` so it submits with a form; the listbox role pattern with arrow keys, Home, End, typeahead and Escape; and a visible label connection.

## 16. When to split a component

Splitting is a judgement call. A component that is too big is hard to read and change. Many tiny components with no reason to exist are hard to follow too. These signals say "split":

- **It does two jobs.** If the name needs "and" (`CartAndCoupon`), there are two components.
- **A piece repeats.** The same markup written twice or three times is a component.
- **Only a small part needs some state.** Move the state, and the part that uses it, into its own component. That keeps the parent simpler and also limits what re-renders when the state changes.
- **You cannot read it at a glance.** Deep nesting, long `map` bodies or nested ternaries are hints.
- **You want to test or reuse a piece alone.**

A before and after:

```jsx
// Before: list rows, the coupon state and the total all live in one function
function Checkout({ items }) {
  const [coupon, setCoupon] = useState('')
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <main>
      <h1>Checkout</h1>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span> <span>x {item.qty}</span> <span>{item.price * item.qty} dollars</span>
          </li>
        ))}
      </ul>
      <label>
        Coupon
        <input value={coupon} onChange={(event) => setCoupon(event.target.value)} />
      </label>
      <p>Total: {total} dollars</p>
    </main>
  )
}
```

```jsx
// After: each piece has one job, and coupon state lives where it is used
function CartLine({ item }) {
  return (
    <li>
      <span>{item.name}</span> <span>x {item.qty}</span> <span>{item.price * item.qty} dollars</span>
    </li>
  )
}

function CouponField() {
  const [coupon, setCoupon] = useState('')
  return (
    <label>
      Coupon
      <input value={coupon} onChange={(event) => setCoupon(event.target.value)} />
    </label>
  )
}

function Checkout({ items }) {
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <main>
      <h1>Checkout</h1>
      <ul>
        {items.map((item) => (
          <CartLine key={item.id} item={item} />
        ))}
      </ul>
      <CouponField />
      <p>Total: {total} dollars</p>
    </main>
  )
}
```

**What happens, step by step:**
1. `CartLine` takes one item and draws one row. It is reusable and easy to test.
2. `CouponField` owns the coupon state. Typing in it no longer re-renders `Checkout` or the rows.
3. `Checkout` only arranges the pieces and calculates the total.
4. We rendered both versions with the same two items: the HTML was identical, and typing `SAVE` in the coupon field worked in the split version. Splitting changed the code, not the page.

**When not to split:**
- **Do not split just to make files short.** A piece with no good name and one use is better left inline.
- **Do not abstract on the first repeat.** Wait for the third copy, when you can see what really differs.
- **A hook, not a component, is the right split** when the piece is logic without markup. A **plain function** is right when it is a calculation.

**Common mistake:** splitting by defining the new component *inside* the old one.

```jsx
// Wrong: Row is a new component type on every render, so its state and DOM reset
function Table({ rows }) {
  function Row({ row }) {
    return <tr><td>{row.name}</td></tr>
  }
  return <table><tbody>{rows.map((row) => <Row key={row.id} row={row} />)}</tbody></table>
}

// Fixed: define it at the top level of the file
function Row({ row }) {
  return <tr><td>{row.name}</td></tr>
}
```

This is the same bug as the HOC created in render (section 5). The [Kanban exercise](../practice-app/exercises/react/25-kanban-board/README.md) is a good practice ground for splitting: board, column and card.

## 17. Recursion: components that render themselves

Some data is a **tree**: folders in folders, comments with replies, nested menus. You do not know how deep it goes. A component can render **itself** for each child. This is **recursion**, and every recursive function needs a **base case**, a situation where it stops.

```jsx
import { useState } from 'react'

const tree = {
  name: 'src',
  children: [
    { name: 'App.jsx' },
    {
      name: 'components',
      children: [{ name: 'Button.jsx' }, { name: 'Card.jsx' }, { name: 'forms', children: [{ name: 'Field.jsx' }] }],
    },
  ],
}

function TreeNode({ node }) {
  const [open, setOpen] = useState(true)
  const isFolder = Array.isArray(node.children)

  if (!isFolder) return <li>{node.name}</li>

  return (
    <li>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? '-' : '+'} {node.name}
      </button>
      {open && (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.name} node={child} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function App() {
  return (
    <ul>
      <TreeNode node={tree} />
    </ul>
  )
}
```

**What happens, step by step:**
1. `App` renders `TreeNode` for the root, `src`. It is a folder, because it has a `children` array.
2. A folder draws a button and, while it is open, a `ul` that holds one `TreeNode` per child. This is where the component uses itself. Writing `<TreeNode />` inside `TreeNode` is fine: JSX only creates an element, and React renders it later.
3. A file has no `children`. That is the **base case**: it returns a plain `li` and the recursion stops.
4. Each `TreeNode` is its own instance with its own `open` state. The initial page shows `src`, `App.jsx`, `components`, `Button.jsx`, `Card.jsx`, `forms` and `Field.jsx`, all open (`aria-expanded="true"`).
5. Closing a folder removes its subtree from the page. **That also discards the state of everything inside it.** We closed `forms`, then closed and reopened `components`: `forms` was open again, back at its default. If you need the open state to survive, keep it above the tree (one object keyed by id).

**Things to watch:**
- **Hooks come before the early return.** `useState` runs before `if (!isFolder) return ...`, so every render calls the same hooks in the same order.
- **Keys must be unique among siblings.** Here `name` works because sibling names differ. In real data use an `id`.
- **Data with a cycle never ends.** If a node can contain itself, the recursion never reaches a base case.
- **Big trees need virtualisation** (render only the visible rows). See [Performance optimization](../04-advanced/02-performance-optimization.md).
- To let callers customise a row, add a `renderNode` prop (section 4).

The full versions are two hard exercises: [29 - File explorer tree](../practice-app/exercises/react/29-file-explorer-tree/README.md) and [28 - Nested comments](../practice-app/exercises/react/28-nested-comments/README.md).

**Common mistake:** no base case.

```jsx
// Wrong: files have no children array, so .map throws a TypeError
function TreeNode({ node }) {
  return (
    <li>
      {node.name}
      <ul>{node.children.map((child) => <TreeNode key={child.name} node={child} />)}</ul>
    </li>
  )
}

// Fixed: check first and return early (see the full version above)
function TreeNode({ node }) {
  if (!Array.isArray(node.children)) return <li>{node.name}</li>
  /* ... render the folder and its children ... */
}
```

## 18. Choosing a pattern

Start with the simplest tool and move down this table only when the problem demands it.

| Problem | Pattern | Watch out for |
| --- | --- | --- |
| Reusable box or layout | `children`, then slots | Too many slots; JSX slots defeat `memo` |
| A specific version of a general component | Specialisation (wrap and fill props) | Spread order: forced props last |
| Share stateful logic | Custom hook | It shares logic, not state |
| Caller draws a part, you own the data | Render prop (`renderItem`) | Nesting; new function each render |
| Wrap many components the same way | HOC (mostly legacy) | Collisions, wrapper hell, never create in render |
| Several parts share hidden state | Compound components with context | Parts used outside the root; context re-renders |
| Parent may own the value | Controlled plus uncontrolled API | Do not switch modes |
| Behaviour without looks | Headless hook with props getters | Caller can wire it wrongly |
| Caller changes state transitions | State reducer | Action types become public API |
| Same component, different element | `as` prop or a component map | Typing; a11y of the chosen element |
| Tree-shaped data | Recursive component | Base case; state lost when closed |

A short rule of thumb: **children and slots for layout, hooks for logic, context for compound parts, `as` for the element, controlled plus uncontrolled for values.** Render props and HOCs are tools for the cases the others cannot reach.

## How interviewers test this

- **Scenarios, not definitions.** "Build a reusable Tabs, Modal, Dropdown or Select." They watch the API you choose: `children` or a config array, controlled or uncontrolled, and whether you think of keyboard use, labels and focus without being asked.
- **The three-way comparison.** HOC vs render props vs hooks is a favourite. A strong answer gives the history, names the real drawbacks (wrapper hell, props collisions, nesting, a new function per render) and says why hooks won and where the older patterns still fit. Red flag: "HOCs are deprecated" with no reasons (they are not removed; they are rarely the best choice).
- **Controlled vs uncontrolled.** Can you write the `value !== undefined` logic, and do you know why a component must not switch between the modes? Do you call `onChange` in both modes?
- **Composition over inheritance.** A good answer shows a wrapper instead of `extends`. Red flag: suggesting a class hierarchy for components.
- **Modern awareness.** `ref` is a normal prop in React 19, `<Context value>` is the provider form, `forwardRef` is on its way out, and compound components use context, not `cloneElement`.
- **Trade-offs and restraint.** They like "start simple, add a pattern when the pain shows up". Red flags: a render prop for something a hook does, mutating props, creating components in render, and spreading unknown props onto DOM elements.

## Interview questions and model answers

### Q1. What is a higher-order component (HOC)? (Easy)
A HOC is a function that takes a component and returns a new component. The new one wraps the original, adds something (data, a login check, a subscription, styling) and renders the original with extra props. It is named `withSomething` by convention, for example `withAuth`. Before hooks it was the main way to share logic between class components, and Redux `connect` is one. The drawbacks are wrapper hell (more layers in the tree), props collisions (the HOC and the caller may use the same prop name), hidden data flow, and the rule that you must call it once at module level, never inside render, or the component remounts every render. Hooks now do most of this job better.

```jsx
function withLoading(Component) {
  function WithLoading({ isLoading, ...props }) {
    if (isLoading) return <p>Loading...</p>
    return <Component {...props} />
  }
  WithLoading.displayName = `withLoading(${Component.displayName || Component.name || 'Component'})`
  return WithLoading
}
```

### Q2. Render props vs HOCs vs hooks: how do you share logic, and which do you choose? (Medium)
All three share logic between components. A **render prop** is a prop (often `children`) holding a function that the component calls with data, so the caller decides the markup. A **HOC** is a function that wraps a component and injects props. A **hook** is a function that calls other hooks and returns values. Hooks are the default today: no extra tree layers, no nesting, no name collisions, the source of the data is visible, they work in effects and handlers, and they type well. The older two still fit when you must control rendering (a guard, an error boundary), when you work with class components, when you maintain old code, or when a component must call back into the caller's markup with data (`renderItem` for lists, headless components). Hooks share logic, not UI and not state: each caller gets its own state.

### Q3. What is the difference between composition and inheritance in React? (Easy)
Composition means building components by putting other components inside them, through `children`, slot props and wrappers. Inheritance means one class extending another. React uses composition, and its guidance is not to build component inheritance trees. A different version of a component is just different props: a `DangerButton` is `<Button {...props} variant="danger" />`. Inheritance would tie the child to the parent's internals and gives you only one parent, while composition can combine many pieces freely. Logic reuse moved to custom hooks in the same spirit.

```jsx
function DangerButton(props) {
  return <Button {...props} variant="danger" />
}
```

### Q4. What are compound components, and how do you build one? (Medium)
Compound components are a group of components that work together and share implicit state, like `<select>` and `<option>`. The user writes `<Tabs><Tabs.List>...</Tabs.List><Tabs.Panel>...</Tabs.Panel></Tabs>` and does not pass state between the parts. You build it with context: the root component holds the state (the active tab) and provides it through a context, and each part reads the context with a small hook that throws a clear error if it is used outside the root. The benefit is a flexible, readable API where users can reorder, wrap and style the parts. The costs are more code, no enforcement of the right structure, and context re-renders. The old way, `Children.map` with `cloneElement`, is legacy and breaks when a part is wrapped in another component or a fragment.

### Q5. What is the difference between controlled and uncontrolled components, and how would you support both in one component? (Medium)
In a controlled component the parent owns the value: it passes `value` and `onChange`, and the component shows what it is given. In an uncontrolled component the component keeps its own state; the parent passes at most `defaultValue`. Controlled is better when the parent must validate, reset or sync the value. Uncontrolled needs less wiring. To support both, treat the component as controlled when `value !== undefined`, otherwise keep inner state with `useState(defaultValue)`, and call `onChange` in both modes. That logic fits in a `useControllableState` hook. The caller must not switch modes during the component's life, and `null` or `0` must count as real controlled values. A controlled `value` with no `onChange` freezes the component.

```jsx
const isControlled = value !== undefined
const current = isControlled ? value : innerValue
```

### Q6. What are container and presentational components, and is the split still useful? (Easy)
A presentational component draws UI from props and has little or no state. A container owns the state and logic and passes data and callbacks down. The split makes the UI easy to reuse, test and preview, and it separates "how it looks" from "how it works". With hooks, the logic usually moves into a custom hook, so you often do not need a separate container component, though a page-level component that wires data to a presentational tree is the same idea. A Server Component that loads data and passes props to a client component is similar in spirit. Keep presentational components free of hidden fetching or global state.

### Q7. How would you design a reusable Button? (Medium)
Keep the surface small: `variant` and `size` as strings (not many booleans), `loading`, `disabled`, `children`, plus `...rest`. Use a real `<button>` with `type="button"` by default so it never submits a form by accident, and let callers override `type`. Spread `...rest` for `aria-*`, `data-*` and events, merge `className` and `onClick` instead of overwriting them, and forward `ref` (a normal prop in React 19). Make it accessible by default: keyboard and focus styles come with the native element, a loading state sets `aria-busy` and blocks clicks. If it must act as a link, support an `as` or `href` option that renders an `<a>`. Keep the look in CSS classes so a design system can restyle it.

### Q8. How would you design a reusable Modal? (Medium)
API: `open` and `onClose` (controlled, since the parent knows why it opens), a required `title` for the accessible name, `children` for the body, and a `footer` or actions slot. Render it in a portal so parent styles cannot clip it. Behaviour: give it `role="dialog"` and `aria-modal`, tie the title with `aria-labelledby`, move focus into the dialog when it opens, keep focus inside while open, return focus to the opener on close, close on Escape and on a backdrop click (configurable), and stop the page behind from scrolling. Pass `...rest` and `className` through. Offer a compound form (`Modal.Header`, `Modal.Footer`) if layouts vary a lot. You could also build on the native `<dialog>` element, which supplies much of the focus and Escape behaviour.

### Q9. How would you design a reusable Select? (Hard)
First ask whether the native `<select>` is enough; it is accessible and works on mobile. For a custom one, I would build a compound component: `Select` (root, owns value and open state) with `Select.Option` (and maybe `Group`), so callers can add icons and groups. Support `value`, `defaultValue` and `onValueChange` (controlled and uncontrolled), `name` so it submits in a form, `disabled`, `placeholder` and a label link. For accessibility follow the listbox pattern: trigger with `aria-expanded` and `aria-haspopup`, options with `role="option"` and `aria-selected`, arrow keys, Home and End, typeahead, Escape to close, and focus handled correctly. Expose `...rest`, `className` and `ref`, and consider a headless core so styling stays separate. Handle empty lists, long lists (virtualise) and async options.

### Q10. What are the pros and cons of each component pattern? (Medium)
- **Children and slots:** simple and flexible, but many slots get unwieldy and JSX slot props defeat `memo`.
- **Render props:** the caller controls the markup, but they nest, the data is only inside the function, and the inline function is new each render.
- **HOCs:** reuse across many components and wrap rendering, but they cause wrapper hell, prop collisions, hidden data and must not be created in render.
- **Custom hooks:** the best default for logic, with no tree cost, but they cannot wrap UI and are not for classes.
- **Compound components:** a readable, flexible API for related parts, but more code and no structure enforcement.
- **Controlled/uncontrolled:** power versus convenience; supporting both costs a little code.
- **Headless:** maximum styling freedom and reused accessibility, but the caller does more work.
- **State reducer:** very customisable, but the actions and state shape become public API.
- **Polymorphic `as`:** one component, many elements, but hard to type and easy to misuse.

### Q11. Do you still need `forwardRef`? How do you pass a ref and extra props through a wrapper? (Medium)
In React 19, no. `ref` is a normal prop for function components, so you destructure it and put it on the element: `function TextField({ ref, ...rest }) { return <input ref={ref} {...rest} /> }`. `forwardRef` still works and appears in older code and libraries, but React's docs say it will be deprecated in a future release. Spread `...rest` to pass `placeholder`, `aria-*` and events. Put safe defaults (like `type="button"`) before the spread so callers can override, and merge `className` and handlers instead of letting the spread overwrite them. Do not spread props onto a DOM element that it does not understand.

### Q12. How do you decide when to split a component? (Easy)
I split when a component does more than one job, when a piece repeats, when only a small part uses some state (moving that state down also limits re-renders), when I cannot read it at a glance, or when I want to test a piece alone. I do not split only to make files short, and I wait for the third repeat before abstracting. If the piece is logic without markup, I extract a hook, not a component. Define the new component at the top level of the file, never inside another component, or it remounts on every render.

### Q13. What is a headless component, and what is a props getter? (Hard)
A headless component or hook provides behaviour (state, keyboard handling, ARIA attributes) without any markup or styling, so the caller renders their own elements. It hands back the props the caller needs, often through **props getters**: functions like `getTogglerProps({ onClick })` that return an object to spread on an element. A getter, unlike a plain object, can merge the caller's own handlers with the hook's (`callAll`), so neither is overwritten. This lets design systems keep full control of the look while reusing tested accessibility logic. React Aria, Headless UI, Downshift and TanStack Table follow this idea. The cost is more work for the caller, who must attach the props to the right element.

### Q14. What is the polymorphic `as` prop, and what are its drawbacks? (Medium)
A polymorphic component lets the caller choose what it renders: `<Text as="h1">` or `<Button as="a" href="/x">`. Inside, you rename the prop to a capitalised variable, `{ as: Tag = 'p', ...rest }`, and render `<Tag {...rest}>`. It lets one component keep its styles while using the right element for accessibility. The drawbacks: typing it correctly in TypeScript is hard (the allowed props depend on `as`), it is easy to choose a bad element (a `div` with `onClick`), and libraries disagree on the name (`as`, `component`, `asChild`). When the allowed options are few, a lookup object (a component map) is simpler.

### Q15. What is the state reducer pattern? (Hard)
It lets users of a component or hook customise how its state changes by passing their own reducer. The hook uses `useReducer` with a default reducer and accepts a `reducer` option, and it exports the default reducer and its action types. The caller wraps the default: for example, call `toggleReducer(state, action)` and refuse a `toggle` once `count >= 4` by returning the old `state`. It is a form of inversion of control, flexible without adding a prop for every rule. The trade-off is that action types and the state shape become public API, so changing them breaks callers. For simple needs, controlled props with `onChange` are lighter.

## Common mistakes and gotchas
- **Creating a HOC (or any component) inside a component's render:** it is a new type each time, so React remounts it and loses state. Create it once at module level, and define components at the top level of the file.
- **A HOC that injects a prop with the same name as one the caller passes:** one silently wins. Pick distinctive names, or use a hook so the caller names the value.
- **A HOC without `displayName` or without `{...props}`:** DevTools shows anonymous wrappers, and unrelated props vanish. Set `displayName` and pass props through.
- **Rendering `{children}` when it is a render-prop function:** React logs "Functions are not valid as a React child". Call it: `children(data)`.
- **Inline render props and JSX slots passed to a `memo` component:** they are new objects each render, so `memo` never skips. Keep them stable or do not rely on `memo` there.
- **A compound part used outside its root:** a bare `useContext` gives `null` and a confusing error. Use a `useX` hook that throws a clear message.
- **Building compound components with `Children.map` and `cloneElement`:** wrappers and fragments break it. Use context.
- **Putting `{...rest}` after your own `className` or `onClick`:** the caller's values replace yours, and your handler never runs. Take those props out and merge them by hand. Keep overridable defaults such as `type="button"` before the spread.
- **A controlled component with `value` but no `onChange`:** it never changes. Hold state in the parent or use `defaultValue`.
- **Switching between controlled and uncontrolled while mounted:** state jumps back to an old value. Decide once, and use `undefined` (not `null`) for "not provided".
- **Checking `if (value)` to detect controlled mode:** `0`, `''` and `false` are real values. Compare with `!== undefined`.
- **A lowercase variable for the `as` tag:** `<tag>` is a literal element. Name it `Tag`.
- **Boolean prop explosion (`primary danger small`):** use `variant` and `size` strings, or compose.
- **A recursive component with no base case, or data that contains a cycle:** it throws or never ends. Check for children first, and never let a node contain itself.
- **A "presentational" component that fetches or reads global state:** it loses its main benefit. Pass data in through props.
- **Reaching for context or a store before trying composition:** try `children`, slots and moving state down first.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Predict the HTML for the three tags.

```jsx
function Box({ tone = 'plain', children }) {
  return <div className={`box box-${tone}`}>{children}</div>
}

function Warning({ children }) {
  return (
    <Box tone="warning">
      <strong>Warning:</strong> {children}
    </Box>
  )
}

export default function App() {
  return (
    <>
      <Box>Hello</Box>
      <Warning>Disk almost full</Warning>
      <Warning />
    </>
  )
}
```

<details>
<summary>Show answer</summary>

```html
<div class="box box-plain">Hello</div>
<div class="box box-warning"><strong>Warning:</strong> Disk almost full</div>
<div class="box box-warning"><strong>Warning:</strong> </div>
```

(The three elements are written together on one line in the real page; they are split here to read them.) `Warning` is a specialisation of `Box`: it fills in `tone` and adds a bold label, then puts its own `children` after it. `Box` receives the `strong`, the space and `children` as its `children`. In the third case `children` is `undefined`, which renders nothing, so only the label and the space remain. We rendered this and got exactly this output.

</details>

2. **(Easy)** Write an `Alert` component with `role="alert"`. It renders `children` as the message. It accepts an optional `icon` slot (shown before the message) and an optional `action` slot (shown after it). When a slot is not given, its wrapper element must not appear.

<details>
<summary>Show answer</summary>

```jsx
function Alert({ icon, action, children }) {
  return (
    <div role="alert" className="alert">
      {icon && <span className="alert-icon">{icon}</span>}
      <div className="alert-message">{children}</div>
      {action && <div className="alert-action">{action}</div>}
    </div>
  )
}

// <Alert icon="!" action={<button type="button">Undo</button>}>Saved</Alert>
// <Alert>Plain</Alert>
```

The first alert renders `<div role="alert" class="alert"><span class="alert-icon">!</span><div class="alert-message">Saved</div><div class="alert-action"><button type="button">Undo</button></div></div>`. The second renders only the `alert-message` div. Each slot is a prop, and `slot && <wrapper>` skips the wrapper when the slot is missing. If a slot could be `0`, test with a real boolean instead.

</details>

3. **(Medium)** Predict the text each of the two lines renders. Then say what changes if you swap the order of the two props inside `WithUser`, and how you would avoid the problem.

```jsx
function withUser(Component) {
  return function WithUser(props) {
    return <Component {...props} user="Asha" />
  }
}

function Greeting({ user, greeting = 'Hello' }) {
  return <p>{greeting}, {user}!</p>
}

const GreetingWithUser = withUser(Greeting)

// <GreetingWithUser user="Ben" greeting="Hi" />
// <GreetingWithUser />
```

<details>
<summary>Show answer</summary>

The first line renders `Hi, Asha!`. The second renders `Hello, Asha!`. The HOC writes `user="Asha"` after `{...props}`, so its value replaces the caller's `user="Ben"`, and nothing warns you. If you write `<Component user="Asha" {...props} />` instead, the caller wins: the first line becomes `Hi, Ben!`, and the second still says `Hello, Asha!`. Either way, one side loses silently. This is the props-collision problem of HOCs.

To avoid it: inject the value under a more specific name (`currentUser`), or document that the HOC owns that prop, or, better, use a hook inside the component (`const user = useCurrentUser()`), where the caller names the variable and nothing can collide. We ran the code and saw `Hi, Asha!`. The component's DevTools name is `WithUser`, because the returned function has no `displayName` set.

</details>

4. **(Medium)** This render-prop component tracks the mouse. Turn the logic into a hook `useMousePosition()`, rewrite `Mouse` so it still works using the hook, and write a small `Cursor` component that uses the hook directly.

```jsx
import { useEffect, useState } from 'react'

function Mouse({ children }) {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    function handleMove(event) {
      setPosition({ x: event.clientX, y: event.clientY })
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  return children(position)
}
```

<details>
<summary>Show answer</summary>

```jsx
import { useEffect, useState } from 'react'

function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    function handleMove(event) {
      setPosition({ x: event.clientX, y: event.clientY })
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  return position
}

// The render prop stays, as a thin wrapper
function Mouse({ children }) {
  return children(useMousePosition())
}

// The hook used directly
function Cursor() {
  const { x, y } = useMousePosition()
  return <p>Mouse at {x}, {y}</p>
}
```

After a `mousemove` with `clientX: 10` and `clientY: 20`, `<Mouse>{({ x, y }) => <p>RP {x},{y}</p>}</Mouse>` showed `RP 10,20` and `<Cursor />` showed `Mouse at 10, 20`. The hook moved the state and the listener (with its cleanup) out of the component. `Mouse` is now one line, kept only so old callers still work. Each caller gets its own state and its own listener.

</details>

5. **(Medium)** `Counter` has a button that shows `Count: N` and adds 1 when clicked. `withLoading` is the HOC from section 5. What does the Count button show after you click it twice and then click "Rerender parent"? What does an effect that logs `mount` on mount and `unmount` on cleanup print? How do you fix it?

```jsx
function Parent() {
  const [n, setN] = useState(0)
  const EnhancedCounter = withLoading(Counter)

  return (
    <>
      <button type="button" onClick={() => setN(n + 1)}>Rerender parent ({n})</button>
      <EnhancedCounter isLoading={false} />
    </>
  )
}
```

<details>
<summary>Show answer</summary>

The Count button shows `Count: 0`, and the log is `mount`, `unmount`, `mount`. `withLoading(Counter)` is called during every render of `Parent`, so each render creates a new `WithLoading` function. React compares component types by identity, sees a different type, unmounts the old `EnhancedCounter` subtree (running the cleanup, which logs `unmount`), and mounts a fresh one (a new state and another `mount`). We ran it to confirm. (Without `StrictMode`, as in this test. In development with `StrictMode` you would also see its extra mount and unmount.)

Fix: create the enhanced component once at module level, outside `Parent`:

```jsx
const EnhancedCounter = withLoading(Counter)

function Parent() {
  /* same JSX */
}
```

With that change the same steps leave `Count: 2` on screen and only one `mount` in the log.

</details>

6. **(Medium)** Here is the `Stepper` from section 8. What does the page show, and what does `onChange` receive, after the user clicks `+` twice?

```jsx
function App() {
  const onChange = (value) => console.log('onChange', value)
  return <Stepper value={5} onChange={onChange} />
}
```

<details>
<summary>Show answer</summary>

The display stays `5`, and `onChange` is called twice, both times with `6`. `value={5}` makes the stepper controlled, so it always shows what the parent passes. A click computes `5 + 1 = 6`, calls `onChange(6)` and does **not** change any inner state. Nobody feeds `6` back as the new `value`, so the second click starts from 5 again and also reports 6. The fix is a parent that holds the state: `const [qty, setQty] = useState(5)` and `<Stepper value={qty} onChange={setQty} />`. Or drop `value` and use `defaultValue={5}`. We ran this and saw `5` and `[[6],[6]]`.

</details>

7. **(Medium)** Build a compound `Accordion` where only one item can be open at a time. The parts are `Accordion` (takes an optional `defaultValue`), `Accordion.Item` (takes `value`), `Accordion.Trigger` (a button with `aria-expanded`) and `Accordion.Panel` (rendered only when open). Clicking the open trigger closes it. Use context, and throw clear errors when a part is misused. See also the [Accordion exercise](../practice-app/exercises/react/02-accordion-single/README.md).

<details>
<summary>Show answer</summary>

Two contexts: one for the whole accordion (which item is open) and one for the current item (its `value`), so `Trigger` and `Panel` do not need a `value` prop.

```jsx
import { createContext, useContext, useId, useState } from 'react'

const AccordionContext = createContext(null)
const ItemContext = createContext(null)

function useAccordion() {
  const context = useContext(AccordionContext)
  if (context === null) throw new Error('Accordion parts must be used inside <Accordion>')
  return context
}

function useItemValue() {
  const value = useContext(ItemContext)
  if (value === null) throw new Error('Accordion.Trigger and Accordion.Panel must be used inside <Accordion.Item>')
  return value
}

export function Accordion({ defaultValue = null, children }) {
  const [openValue, setOpenValue] = useState(defaultValue)
  const baseId = useId()

  function toggle(value) {
    setOpenValue((current) => (current === value ? null : value))
  }

  return (
    <AccordionContext value={{ openValue, toggle, baseId }}>
      <div className="accordion">{children}</div>
    </AccordionContext>
  )
}

function AccordionItem({ value, children }) {
  return (
    <ItemContext value={value}>
      <div className="accordion-item">{children}</div>
    </ItemContext>
  )
}

function AccordionTrigger({ children }) {
  const { openValue, toggle, baseId } = useAccordion()
  const value = useItemValue()
  const open = openValue === value

  return (
    <h3>
      <button
        type="button"
        id={`${baseId}-trigger-${value}`}
        aria-expanded={open}
        aria-controls={`${baseId}-panel-${value}`}
        onClick={() => toggle(value)}
      >
        {children}
      </button>
    </h3>
  )
}

function AccordionPanel({ children }) {
  const { openValue, baseId } = useAccordion()
  const value = useItemValue()
  if (openValue !== value) return null

  return (
    <div role="region" id={`${baseId}-panel-${value}`} aria-labelledby={`${baseId}-trigger-${value}`}>
      {children}
    </div>
  )
}

Accordion.Item = AccordionItem
Accordion.Trigger = AccordionTrigger
Accordion.Panel = AccordionPanel
```

Usage:

```jsx
<Accordion defaultValue="a">
  <Accordion.Item value="a">
    <Accordion.Trigger>First</Accordion.Trigger>
    <Accordion.Panel>First text</Accordion.Panel>
  </Accordion.Item>
  <Accordion.Item value="b">
    <Accordion.Trigger>Second</Accordion.Trigger>
    <Accordion.Panel>Second text</Accordion.Panel>
  </Accordion.Item>
</Accordion>
```

We ran it: it starts with "First text" open. Clicking Second shows "Second text" instead (Second has `aria-expanded="true"`). Clicking Second again leaves no panel open. `toggle` uses an updater, `(current) => (current === value ? null : value)`, so it always works from the latest state.

</details>

8. **(Medium)** Write a `LinkButton` that renders a real `<a>` when it gets an `href`, and a `<button type="button">` otherwise. Both must pass through all other props. Say one thing that does not carry over from buttons to links.

<details>
<summary>Show answer</summary>

```jsx
function LinkButton({ href, children, ...rest }) {
  if (href) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" {...rest}>
      {children}
    </button>
  )
}

// <LinkButton href="/docs" className="x">Docs</LinkButton>  ->  <a href="/docs" class="x">Docs</a>
// <LinkButton onClick={save}>Save</LinkButton>             ->  <button type="button">Save</button>
```

The choice is made by a prop, so a navigation looks like a button but behaves like a link: it is announced as a link, supports "open in new tab" and works without JavaScript. What does **not** carry over: a link has no `disabled` attribute and no `type`. A disabled "link button" needs `aria-disabled="true"`, a `tabIndex={-1}` or no `href`, and a click guard. A more general version is the `as` prop from section 12.

</details>

9. **(Hard)** Write `useCounter({ initial = 0, step = 1, reducer })` with the state reducer pattern. Export `counterReducer` and the action names. Then write a `ClampedCounter` component that starts at 5 and uses a custom reducer to keep the count between 0 and 10.

<details>
<summary>Show answer</summary>

```jsx
import { useReducer } from 'react'

const counterActions = { increment: 'increment', decrement: 'decrement', reset: 'reset' }

function counterReducer(state, action) {
  switch (action.type) {
    case counterActions.increment:
      return { count: state.count + action.step }
    case counterActions.decrement:
      return { count: state.count - action.step }
    case counterActions.reset:
      return { count: action.initial }
    default:
      throw new Error(`Unknown action type: ${action.type}`)
  }
}

function useCounter({ initial = 0, step = 1, reducer = counterReducer } = {}) {
  const [state, dispatch] = useReducer(reducer, { count: initial })

  return {
    count: state.count,
    increment: () => dispatch({ type: counterActions.increment, step }),
    decrement: () => dispatch({ type: counterActions.decrement, step }),
    reset: () => dispatch({ type: counterActions.reset, initial }),
  }
}

function ClampedCounter() {
  const { count, increment, decrement, reset } = useCounter({
    initial: 5,
    reducer(state, action) {
      const next = counterReducer(state, action)
      return { count: Math.min(10, Math.max(0, next.count)) }
    },
  })

  return (
    <div>
      <button type="button" onClick={decrement}>Down</button>
      <output>{count}</output>
      <button type="button" onClick={increment}>Up</button>
      <button type="button" onClick={reset}>Reset</button>
    </div>
  )
}
```

The custom reducer calls the default one for the normal result and then clamps it. We clicked Up seven times from 5: the display stopped at 10. After Reset and seven clicks on Down, it stopped at 0. Callers who do not pass a reducer get the plain counter. Note that `counterActions` and the `{ count }` shape are now part of the hook's public API.

</details>

10. **(Hard)** This `Toggle` is meant to work both controlled (`on`) and uncontrolled (`defaultOn`). Find three bugs. Say what the user sees for `<Toggle on={false} onChange={fn} />` after one click, and for `<Toggle />` after one click. Then fix it.

```jsx
import { useState } from 'react'

function Toggle({ on, defaultOn = false, onChange }) {
  const [inner, setInner] = useState(defaultOn)
  const current = on ? on : inner

  function flip() {
    setInner(!current)
    onChange(!current)
  }

  return (
    <button type="button" aria-pressed={current} onClick={flip}>
      {current ? 'On' : 'Off'}
    </button>
  )
}
```

<details>
<summary>Show answer</summary>

Three bugs:

1. **Truthiness check for controlled mode.** `on ? on : inner` treats `on={false}` as "not provided". A controlled toggle that is off falls back to the inner state, so it flips by itself. We clicked `<Toggle on={false} onChange={fn} />` once: the button read `On` (although the parent still says `false`), and `fn` was called with `true`. Controlled mode must be detected with `on !== undefined`.
2. **`onChange` is called without a check.** `<Toggle />` has no `onChange`, so the click handler throws `TypeError: onChange is not a function`. React reports it as an uncaught error. (The button still flipped to `On`, because `setInner` ran first.) Use `onChange?.(...)`.
3. **The inner state is updated while controlled.** `setInner` runs even when the parent owns the value. That is wasted work, and the hidden state drifts away from the parent's value.

The fix is the `useControllableState` hook from section 8, which handles all three:

```jsx
function Toggle({ on, defaultOn = false, onChange }) {
  const [current, setCurrent] = useControllableState({
    value: on,
    defaultValue: defaultOn,
    onChange,
  })

  return (
    <button type="button" aria-pressed={current} onClick={() => setCurrent(!current)}>
      {current ? 'On' : 'Off'}
    </button>
  )
}
```

We ran the fixed version: `<Toggle on={false} onChange={fn} />` stays `Off` after a click and `fn` receives `true`; `<Toggle />` flips to `On` and does not throw.

</details>

11. **(Hard)** Write a recursive `NestedList` component. Its `items` prop is an array of `{ label, items? }`. Items with children show a button that opens and closes the nested list (with `aria-expanded`), and start closed. Items without children are plain list items. The full versions of this idea are [29 - File explorer tree](../practice-app/exercises/react/29-file-explorer-tree/README.md) and [28 - Nested comments](../practice-app/exercises/react/28-nested-comments/README.md).

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

function NestedList({ items }) {
  return (
    <ul>
      {items.map((item) => (
        <NestedItem key={item.label} item={item} />
      ))}
    </ul>
  )
}

function NestedItem({ item }) {
  const [open, setOpen] = useState(false)
  const hasChildren = Array.isArray(item.items) && item.items.length > 0

  if (!hasChildren) return <li>{item.label}</li>

  return (
    <li>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {item.label}
      </button>
      {open && <NestedList items={item.items} />}
    </li>
  )
}
```

`NestedList` and `NestedItem` call each other, so the recursion is split in two. The base case is an item with no children, which renders a plain `li`. We rendered `[{ label: 'Fruit', items: [{ label: 'Apple' }, { label: 'Citrus', items: [{ label: 'Lemon' }] }] }, { label: 'Water' }]`: at first only `Fruit` (a closed button) and `Water` were shown. After clicking `Fruit` and then `Citrus`, the page showed Fruit, Apple, Citrus, Lemon and Water. Each `NestedItem` has its own `open` state. Closing a parent throws away the open state of its descendants. Use a real `id` for keys when labels can repeat.

</details>

## Recap
- **Composition over inheritance.** Boxes take `children`; extra holes are named slots; a specialised component wraps a general one. Put forced props after the spread.
- **Share logic with custom hooks.** Render props and HOCs still exist, but they nest, collide and hide data flow. A HOC must never be created inside render.
- **Compound components** use a root that owns state and a context that its parts read. Do not use `cloneElement`, and throw a clear error when a part is used outside the root.
- **Controlled vs uncontrolled:** controlled means `value !== undefined`. Support `value`, `defaultValue` and `onChange` through a `useControllableState` hook, call `onChange` in both modes, and never switch modes.
- **Headless hooks and props getters** give behaviour without markup; the **state reducer** pattern lets callers change transitions, at the price of public action types.
- **Wrappers must forward.** In React 19 `ref` is a normal prop. Spread `...rest`, put defaults before it, and merge `className` and handlers. Use a capitalised `Tag` for the `as` prop.
- **Design small APIs:** few props, strings over booleans, safe defaults, accessible by default, and an escape hatch.
- **Split by responsibility**, move state down to where it is used, define components at the top level, and give recursive components a base case.

## Where to go next
- Next lesson: [Data fetching](02-data-fetching.md).
- The hooks these patterns lean on: [Custom hooks](../02-hooks/08-custom-hooks.md), [useContext](../02-hooks/05-usecontext.md), [useReducer](../02-hooks/06-usereducer.md), [useRef](../02-hooks/04-useref.md).
- Deeper material: Advanced patterns (planned) (headless UI, polymorphic components, `useControllableState`), [Accessibility](../04-advanced/09-accessibility.md), [Error boundaries, portals and friends](05-error-boundaries-portals-and-friends.md), Legacy React and Redux connect (planned).
- Practice app exercises: [05 - Tabs](../practice-app/exercises/react/05-tabs/README.md), [02 - Accordion](../practice-app/exercises/react/02-accordion-single/README.md), [25 - Kanban board](../practice-app/exercises/react/25-kanban-board/README.md), [30 - Dynamic form builder](../practice-app/exercises/react/30-dynamic-form-builder/README.md), [29 - File explorer tree](../practice-app/exercises/react/29-file-explorer-tree/README.md), [14 - Modal with portal](../practice-app/exercises/react/14-modal-portal/README.md), [33 - Accessible combobox](../practice-app/exercises/react/33-accessible-combobox/README.md).
- Interview rounds: Round 2, architecture questions (planned) and [Round 6, code review and refactoring](../05-interview-rounds/round-6-code-review-and-refactoring/README.md).
- One-page revision: Patterns and syntax cheatsheet (planned).
