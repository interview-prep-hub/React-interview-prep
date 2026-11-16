# State Management

> **Level:** Intermediate   **Time:** about 75 minutes   **Read first:** [Thinking in React](../01-basics/08-thinking-in-react.md), [useState in depth](../02-hooks/02-usestate-in-depth.md), [useContext](../02-hooks/05-usecontext.md), [useReducer](../02-hooks/06-usereducer.md)

## What you will learn
- Sort the state of any app into five kinds (local UI, shared client, server cache, URL, form) and say where each kind should live.
- Climb the ladder of solutions in order: `useState`, lifting state up, composition, Context with `useReducer`, then an external store.
- Build a complete counter and todo app with Redux Toolkit, and explain stores, actions, reducers, middleware, thunks and Immer in plain words.
- Write the same ideas with Zustand and Jotai, and say what Valtio, MobX and Recoil are (Recoil is no longer maintained).
- Explain why TanStack Query removes most Redux code, and keep filters and page numbers in the URL.
- Use selectors, memoized selectors and normalised data, then choose a tool with a decision table and talk about the choice in an interview.

## 1. Not all state is the same

**State** is data that can change while your app runs, and that changes what the user sees. Beginners often treat all of it the same way. Some put everything in `useState`. Others put everything in one big global store. Both lead to messy apps.

The fix is to notice that state comes in **kinds**, and each kind has a best home.

| Kind | What it is | Examples | Best home |
|---|---|---|---|
| Local UI state | Belongs to one component or a small group | A modal is open, a tab is selected, a hover state | `useState` or `useReducer` in that component |
| Shared client state | Exists only in the browser, but many far-apart components need it | Cart, theme, sidebar open, signed-in user | Lift it up, Context, or a store (Zustand, Redux Toolkit, Jotai) |
| Server cache state | A copy of data that a server owns | Product list, user profile, search results | A data library (TanStack Query, RTK Query, SWR) |
| URL state | Part of the address bar | Page number, filters, sort order, selected item id | The URL (path params and search params) |
| Form state | A draft while the user is typing | Input values, touched fields, error messages | `useState`, FormData, or a form library |

Before you pick a tool for a new piece of state, ask four questions:
1. **Who owns it?** If a server owns it, you only hold a copy. A copy can be out of date.
2. **Who needs it?** One component, a few close ones, or many far apart?
3. **How long does it live?** Until the component unmounts, until the tab closes, or across visits?
4. **Should a link or the back button restore it?** If yes, it belongs in the URL.

Here is a product listing page. Each piece of state gets a kind and a home.

| Piece of state | Kind | Best home |
|---|---|---|
| The list of products | Server cache | `useQuery` |
| Selected category and page number | URL | Search params |
| Is the filter drawer open? | Local UI | `useState` in the drawer's parent |
| The text of a half-written review | Form | `useState` or a form library |
| Items in the cart | Shared client | A store (or Context) |
| Dark mode | Shared client, saved between visits | A small store, saved in `localStorage` |

Now the big idea of this lesson: **most apps need less global state than people think.** Look at the table. Server data goes to a data library. Filters go to the URL. Drafts stay in their form. Open and closed flags stay in their component. What is left for a global store is often a short list: the cart, the theme, the user, a few app-wide flags.

A second rule keeps state small: **store the minimum and derive the rest.** If a value can be computed from other state, compute it while rendering. Do not keep a second copy.

```jsx
import { useState } from 'react'

function Cart() {
  const [items, setItems] = useState([{ id: 1, name: 'Pen', price: 2, quantity: 3 }])

  // Derived: computed on every render, so it can never be out of date
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div>
      <p>Total: {total}</p>
      <button onClick={() => setItems([])}>Empty cart</button>
    </div>
  )
}
```

**What happens, step by step:**
1. `items` is the only state. It holds the facts: what is in the cart.
2. On every render, `total` is calculated from `items`. The first render shows `Total: 6`.
3. Click "Empty cart": `items` becomes `[]`, React re-renders, and `total` is `0`. There was no second variable to forget to update.

**Common mistake:** copying server data into client state by hand.

```jsx
// Wrong: a hand-made copy of server data
const [products, setProducts] = useState([])
useEffect(() => {
  fetch('/api/products')
    .then((response) => response.json())
    .then(setProducts)
}, [])

// Fixed: let a data library own the cache (see section 13)
const { data: products } = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
```

Why: the hand-made copy has no cache, no retry, no refetching, no loading or error state, and it goes stale. The server is the owner, so use a tool that is built to manage a copy of server data.

## 2. The ladder of solutions

Think of a ladder. Start on the lowest rung. Climb one rung only when the rung you stand on starts to hurt.

1. **`useState` (or `useReducer`) in the component that uses the state.** Most state ends here.
2. **Lift state up.** Move the state to the nearest parent of the components that need it, and pass it down as props.
3. **Composition.** Pass finished elements or `children` down, so the layers in between do not need to carry the data.
4. **Context, often with `useReducer`.** A value that many far-apart components read and that changes rarely.
5. **An external store.** Redux Toolkit, Zustand, Jotai. For large state, fast-changing state, state read in small slices by many components, or when you want tools like DevTools and middleware.

### Rung 2: lift state up

Two siblings need the same value, so the parent owns it.

```jsx
import { useState } from 'react'

function SearchBox({ query, onChange }) {
  return (
    <label>
      Search
      <input value={query} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Results({ query }) {
  const names = ['Asha', 'Ben', 'Carla'].filter((name) =>
    name.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <ul>
      {names.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </ul>
  )
}

export default function App() {
  const [query, setQuery] = useState('')
  return (
    <>
      <SearchBox query={query} onChange={setQuery} />
      <Results query={query} />
    </>
  )
}
```

**What happens, step by step:**
1. `App` owns `query`. It passes the value down and a way to change it (`setQuery`).
2. You type `a`. `SearchBox` calls `onChange('a')`, which is `setQuery('a')`.
3. `App` re-renders and passes `query="a"` to `Results`.
4. `Results` keeps the names that contain "a" (ignoring case) and shows `Asha` and `Carla`.

This is the pattern from [Thinking in React](../01-basics/08-thinking-in-react.md). It is the right answer far more often than a store.

### Rung 3: composition

If the problem is that props pass through components that do not care, try passing finished elements instead of data.

```jsx
import { useState } from 'react'

function UserMenu({ user }) {
  return <p>Signed in as {user.name}</p>
}

function Dashboard({ user }) {
  return <h1>Welcome back, {user.name}</h1>
}

function Layout({ sidebar, children }) {
  return (
    <div>
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  )
}

export default function App() {
  const [user] = useState({ name: 'Asha' })
  return (
    <Layout sidebar={<UserMenu user={user} />}>
      <Dashboard user={user} />
    </Layout>
  )
}
```

**What happens, step by step:**
1. `App` creates the `UserMenu` and `Dashboard` elements itself, with `user` already inside them.
2. `Layout` receives them as `sidebar` and `children`. It only decides where to place them.
3. `Layout` never sees `user`, so it needs no `user` prop. There is no drilling.

More on this in [Component patterns](01-component-patterns.md) and the [useContext lesson](../02-hooks/05-usecontext.md).

### Rung 4: Context with useReducer

When a value is needed by many far-apart components and changes rarely, put it in Context. If it has several kinds of updates, manage it with `useReducer` and share the state and the `dispatch` function through two contexts.

```jsx
import { createContext, useContext, useReducer } from 'react'

const TodosContext = createContext(null)
const TodosDispatchContext = createContext(null)

function todosReducer(todos, action) {
  switch (action.type) {
    case 'added':
      return [...todos, { id: action.id, text: action.text, done: false }]
    case 'toggled':
      return todos.map((todo) =>
        todo.id === action.id ? { ...todo, done: !todo.done } : todo,
      )
    default:
      return todos
  }
}

export function TodosProvider({ children }) {
  const [todos, dispatch] = useReducer(todosReducer, [])
  return (
    <TodosContext value={todos}>
      <TodosDispatchContext value={dispatch}>{children}</TodosDispatchContext>
    </TodosContext>
  )
}

export const useTodos = () => useContext(TodosContext)
export const useTodosDispatch = () => useContext(TodosDispatchContext)
```

**What happens, step by step:**
1. `TodosProvider` owns the todos with `useReducer`.
2. It shares the list through `TodosContext` and the `dispatch` function through `TodosDispatchContext`.
3. Any component below can call `useTodos()` to read the list, or `useTodosDispatch()` to change it, for example `dispatch({ type: 'added', id: crypto.randomUUID(), text: 'Buy milk' })`.
4. A component that only dispatches reads just the second context. `dispatch` never changes, so that component is not re-rendered when the list changes.

The full story (guard hooks, memoizing, testing) is in [useContext](../02-hooks/05-usecontext.md) and [useReducer](../02-hooks/06-usereducer.md). You can practise this pattern in the [shopping cart reducer exercise](../practice-app/exercises/react/19-shopping-cart-reducer/README.md).

### Rung 5: an external store

A store keeps state **outside** React and lets components subscribe to the exact slice they need. The rest of this lesson is about this rung, and about the other kinds of state that should not be on it.

**Common mistake:** putting a flag that one component uses into a global store.

```jsx
// Wrong: a global action, a reducer case and a selector for one local flag
dispatch(settingsModalOpened(true))

// Fixed: local state
const [isOpen, setIsOpen] = useState(false)
```

Why: global state is harder to read, test and reset. Use the lowest rung that solves the problem.

## 3. Where Context stops being enough

Context has one big limit: **no selectors**. When the value changes, every component that reads the context re-renders. Even `memo` does not stop it. You can see this with two components, `ShowA` and `ShowB`, that each read one field of a shared object.

```jsx
import { createContext, memo, useContext, useState } from 'react'

const AppContext = createContext(null)

function AppProvider({ children }) {
  const [state, setState] = useState({ a: 0, b: 0 })
  return <AppContext value={{ state, setState }}>{children}</AppContext>
}

const ShowA = memo(function ShowA() {
  const { state } = useContext(AppContext)
  console.log('render A')
  return <p>A: {state.a}</p>
})

const ShowB = memo(function ShowB() {
  const { state } = useContext(AppContext)
  console.log('render B')
  return <p>B: {state.b}</p>
})

function Controls() {
  const { setState } = useContext(AppContext)
  return (
    <button onClick={() => setState((s) => ({ ...s, a: s.a + 1 }))}>Increase A</button>
  )
}

export default function App() {
  return (
    <AppProvider>
      <ShowA />
      <ShowB />
      <Controls />
    </AppProvider>
  )
}
```

We ran this on React 19.3.1 (without StrictMode, which would print every line twice in development). On mount it prints `render A`, `render B`. After one click on "Increase A" it prints again:

```text
render A
render B
```

**What happens, step by step:**
1. The click calls `setState`. Only `a` changes, from 0 to 1.
2. `AppProvider` re-renders and builds a new context value object.
3. React sees a new value, so every component that reads `AppContext` re-renders. That includes `ShowB`, even though `b` did not change and `ShowB` is wrapped in `memo`.
4. `memo` only compares props. `ShowB` has no props. The context is a separate channel that `memo` does not guard.

For a small value like a theme, this does not matter. For a big object that changes often, it does. There are fixes inside Context (split it into several contexts, memoize the value, keep the provider small; see sections 9 to 11 of the [useContext lesson](../02-hooks/05-usecontext.md)). The other fix is a store with selectors, where each component subscribes to just the field it uses. We will run the same two components with Zustand in section 11 and compare.

**Common mistake:** one big context for everything.

```jsx
// Wrong: every reader re-renders when any of these change
<AppContext value={{ user, theme, cart, notifications, mousePosition }}>

// Fixed: one context per concern, and hot state kept local or in a store
<ThemeProvider>
  <AuthProvider>
    <CartProvider>{children}</CartProvider>
  </AuthProvider>
</ThemeProvider>
```

Why: a change in any field wakes up every reader of the big context.

## 4. Redux: the ideas

**Redux** is a way to keep shared state in one place, outside your components, and to change it in one predictable way. It grew out of an earlier pattern called **Flux**, which also moved data in a single direction. Redux is older than hooks, but it is still common in large codebases, and interviewers still ask about it.

Redux has three principles:
1. **One store.** All the shared state lives in one object tree, inside one store. One source of truth.
2. **State is read-only.** You never change it directly. The only way is to send an **action**, a plain object that says what happened.
3. **Changes are made by pure functions.** A **reducer** takes the current state and an action and returns the next state. It never changes its inputs and never does side effects.

The words you need:
- **Action**: a plain object with a `type` string and, usually, a `payload`. It describes an event: `{ type: 'todos/todoAdded', payload: ... }`. Name actions for what happened (`todoAdded`), not for what to do (`setTodos`).
- **Action creator**: a function that returns an action object.
- **Reducer**: a pure function `(state, action) => nextState`.
- **Store**: the object that holds the state. It has three main methods: `getState()`, `dispatch(action)` and `subscribe(listener)`.
- **Dispatch**: sending an action to the store.
- **Selector**: a function that reads a piece of state.
- **Middleware**: code that sits between `dispatch` and the reducer (section 8).

Data moves in one direction, in a loop:

```text
  +------+   dispatch(action)   +------------+   (state, action)   +---------+
  | View | -------------------> | Middleware | ------------------> | Reducer |
  +------+                      +------------+                     +---------+
     ^                                                                  |
     |  "state changed" (subscribers re-read with selectors)            | returns
     |                              +-------+                           | new state
     +----------------------------- | Store | <-------------------------+
                                    +-------+
```

**Life of one click, step by step:**
1. The user clicks a button. The handler calls `dispatch(action)`.
2. The action passes through the middleware (if there is any).
3. The store calls the reducer with the current state and the action.
4. The reducer returns the next state. The store saves it.
5. The store tells its subscribers. The components read the state again with their selectors and re-render if their slice changed.

You do not need a library to see the idea. A reducer is just a function:

```js
function counterReducer(state = { value: 0 }, action) {
  switch (action.type) {
    case 'counter/incremented':
      return { value: state.value + 1 }
    case 'counter/incrementedByAmount':
      return { value: state.value + action.payload }
    default:
      return state
  }
}

const s0 = { value: 0 }
const s1 = counterReducer(s0, { type: 'counter/incremented' })
const s2 = counterReducer(s1, { type: 'counter/incrementedByAmount', payload: 5 })

console.log(s0, s1, s2) // { value: 0 } { value: 1 } { value: 6 }
console.log(counterReducer(s2, { type: 'something/else' }) === s2) // true
console.log(counterReducer(undefined, { type: 'init' })) // { value: 0 }
```

**What happens, step by step:**
1. Each call returns a **new** object. `s0` is never changed, which is why it still prints `{ value: 0 }` at the end.
2. For an action the reducer does not know (the `default` case), it returns the **same** state object. That is how React-Redux knows nothing changed, and it is why every reducer must have a `default` branch.
3. When the state is `undefined` (the very first call), the default parameter gives the initial state.

If you want to build the store itself, see section 15 of the [useReducer lesson](../02-hooks/06-usereducer.md) and the [mini Redux store exercise](../practice-app/exercises/react/32-mini-redux-store/README.md).

**Common mistake:** changing the old state object inside a reducer.

```js
// Wrong: the old object is changed and the same reference is returned
function counterReducer(state = { value: 0 }, action) {
  if (action.type === 'counter/incremented') {
    state.value += 1
    return state
  }
  return state
}

// Fixed: return a new object
function counterReducer(state = { value: 0 }, action) {
  if (action.type === 'counter/incremented') {
    return { value: state.value + 1 }
  }
  return state
}
```

Why: Redux and React-Redux detect changes by comparing references. The same reference means "nothing changed", so the screen would not update. In development, Redux Toolkit's store even throws: `A state mutation was detected inside a dispatch, in the path: value.`

## 5. Redux Toolkit: the modern way to write Redux

Writing Redux by hand needs a lot of boilerplate: string constants, `switch` statements, careful copying of nested objects. **Redux Toolkit (RTK)** is the official toolset that removes it. The Redux team recommends RTK for all new Redux code. It gives you `configureStore`, `createSlice`, `createAsyncThunk`, Immer (easy updates), Reselect (memoized selectors) and RTK Query (server data). This lesson uses RTK 2 with React-Redux 9.

```bash
npm install @reduxjs/toolkit react-redux
```

If you meet code with `createStore`, `connect(mapStateToProps)` and long `switch` reducers, that is the older style. It still works, but it is legacy. See Legacy class components and Redux connect (planned) for how to read and migrate it.

We will build one small app, a counter and a todo list, in five files:

```text
src/
  main.jsx          (creates the root and wraps the app in Provider)
  App.jsx           (the components)
  store.js          (configureStore)
  counterSlice.js   (counter state and actions)
  todosSlice.js     (todos state and actions)
```

### 5.1 createSlice: state, reducers and actions together

A **slice** is one piece of the state tree, with the reducer and the actions that belong to it.

```js
// src/counterSlice.js
import { createSlice } from '@reduxjs/toolkit'

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    incremented(state) {
      state.value += 1
    },
    decremented(state) {
      state.value -= 1
    },
    incrementedByAmount(state, action) {
      state.value += action.payload
    },
  },
})

export const { incremented, decremented, incrementedByAmount } = counterSlice.actions
export default counterSlice.reducer
```

**What happens, step by step:**
1. `name: 'counter'` becomes the prefix of every action type. The action creator `incremented` makes `{ type: 'counter/incremented', payload: undefined }`.
2. `initialState` is the state before any action.
3. Each function in `reducers` handles one kind of event. It receives the current `state` and the `action`. The value you pass to the action creator, such as `incrementedByAmount(5)`, arrives as `action.payload`.
4. Inside, you write `state.value += 1`. That looks like mutation, but Immer (section 6) turns it into a safe immutable update.
5. `counterSlice.actions` holds an action creator for each reducer function. `counterSlice.reducer` is the single reducer for the store.

The todos slice has one extra feature, `prepare`:

```js
// src/todosSlice.js
import { createSlice, nanoid } from '@reduxjs/toolkit'

const todosSlice = createSlice({
  name: 'todos',
  initialState: { items: [] },
  reducers: {
    todoAdded: {
      // The reducer stays pure. Random values are created in "prepare".
      prepare(text) {
        return { payload: { id: nanoid(), text, done: false } }
      },
      reducer(state, action) {
        state.items.push(action.payload)
      },
    },
    todoToggled(state, action) {
      const todo = state.items.find((item) => item.id === action.payload)
      if (todo) {
        todo.done = !todo.done
      }
    },
    todoRemoved(state, action) {
      state.items = state.items.filter((item) => item.id !== action.payload)
    },
  },
})

export const { todoAdded, todoToggled, todoRemoved } = todosSlice.actions
export default todosSlice.reducer
```

**What happens, step by step:**
1. `todoAdded('Buy milk')` first runs `prepare`. It builds the payload `{ id, text, done: false }`, with a random id from `nanoid`.
2. The action then goes to the store as `{ type: 'todos/todoAdded', payload: { id, text, done: false } }`.
3. The reducer only pushes the ready-made payload. It does no random work.
4. Why the split? A reducer must be pure. Random ids, dates and network calls make it impure. `prepare` runs before dispatch, outside the reducer.
5. `todoToggled` finds the item and flips it. `todoRemoved` replaces the array with a filtered copy. Both styles ("mutate" or "return a new value") are allowed. Section 6 explains the one rule.

### 5.2 configureStore: put the slices together

```js
// src/store.js
import { configureStore } from '@reduxjs/toolkit'
import counterReducer from './counterSlice'
import todosReducer from './todosSlice'

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    todos: todosReducer,
  },
})
```

**What happens, step by step:**
1. Each key of the `reducer` object becomes a key of the state tree. The whole state is `{ counter: { value: 0 }, todos: { items: [] } }`.
2. `configureStore` combines the reducers for you and creates the store.
3. It also adds good defaults: the thunk middleware (section 7), development-only checks that catch mistakes (section 8), and the connection to Redux DevTools.

### 5.3 Provider: give React access to the store

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
```

`Provider` puts the store into React Context, so any component below it can use the hooks. It is the only place where Context is involved. The store is a normal JavaScript object that lives outside React.

### 5.4 useSelector and useDispatch: use the store in components

```jsx
// src/App.jsx
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { decremented, incremented, incrementedByAmount } from './counterSlice'
import { todoAdded, todoRemoved, todoToggled } from './todosSlice'

function Counter() {
  const value = useSelector((state) => state.counter.value)
  const dispatch = useDispatch()

  return (
    <section>
      <h2>Counter</h2>
      <p>Count: {value}</p>
      <button onClick={() => dispatch(decremented())}>-1</button>
      <button onClick={() => dispatch(incremented())}>+1</button>
      <button onClick={() => dispatch(incrementedByAmount(5))}>+5</button>
    </section>
  )
}

function Todos() {
  const items = useSelector((state) => state.todos.items)
  const dispatch = useDispatch()
  const [text, setText] = useState('') // draft text is local UI state

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    dispatch(todoAdded(trimmed))
    setText('')
  }

  const doneCount = items.filter((item) => item.done).length

  return (
    <section>
      <h2>Todos</h2>
      <form onSubmit={handleSubmit}>
        <label>
          New todo
          <input value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        <button type="submit">Add</button>
      </form>
      <p>
        {doneCount} of {items.length} done
      </p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => dispatch(todoToggled(item.id))}
              />
              {item.text}
            </label>
            <button onClick={() => dispatch(todoRemoved(item.id))}>
              Delete {item.text}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function App() {
  return (
    <main>
      <Counter />
      <Todos />
    </main>
  )
}
```

- `useSelector(selector)` runs your selector on the store's state, subscribes the component to the store, and re-renders the component when the selector's result changes. "Changes" means a different value by strict equality (`===`).
- `useDispatch()` returns the store's `dispatch` function. It is stable, so it never causes a re-render.
- The text being typed lives in plain `useState`. Only the finished todo goes to the store. That is the "local UI state stays local" rule from section 1.

We ran this app in a test. After clicking `+1`, `+1` and `+5` the screen showed `Count: 7`. After adding "Buy milk" and "Walk dog" it showed `0 of 2 done`, and the input was empty again. After ticking "Buy milk" it showed `1 of 2 done`, and after deleting "Walk dog" it showed `1 of 1 done`.

**What happens, step by step (a click on `+5`):**
1. The click handler calls `incrementedByAmount(5)`. That makes the action `{ type: 'counter/incrementedByAmount', payload: 5 }`.
2. `dispatch` hands the action to the store.
3. The store runs the root reducer. The `counter` part runs the matching case reducer: `state.value += 5`. Immer produces a new `counter` object. The `todos` part is untouched and keeps the same object.
4. The store notifies its subscribers. Every `useSelector` runs its selector again.
5. The `Counter` selector now returns `5` instead of `0`, so `Counter` re-renders. The `Todos` selector returns the same `items` array as before, so `Todos` does not re-render.
6. The screen shows `Count: 5`.

### 5.5 The store works without React

Because the store is a plain object, you can use it anywhere, for example in a test or a script.

```js
import { configureStore } from '@reduxjs/toolkit'
import counterReducer, { incremented, incrementedByAmount } from './counterSlice'

const store = configureStore({ reducer: { counter: counterReducer } })

console.log(store.getState()) // { counter: { value: 0 } }

const unsubscribe = store.subscribe(() => {
  console.log('changed:', store.getState().counter.value)
})

store.dispatch(incremented()) // prints: changed: 1
store.dispatch(incrementedByAmount(5)) // prints: changed: 6
unsubscribe()
store.dispatch(incremented()) // prints nothing

console.log(store.getState()) // { counter: { value: 7 } }
```

**What happens, step by step:**
1. `getState()` returns the current state tree.
2. `subscribe` registers a listener. It returns a function that removes the listener.
3. Each `dispatch` runs the reducer and then calls the listeners, so you see `changed: 1` and `changed: 6`.
4. After `unsubscribe()`, the third dispatch still changes the state (it ends at 7) but nobody is listening.

This is exactly what `useSelector` does for you: it subscribes, and it re-reads the state when the store changes.

### 5.6 Test a slice like any pure function

A reducer is a pure function, so it needs no React and no mocks.

```js
import { expect, test } from 'vitest'
import todosReducer, { todoToggled } from './todosSlice'

test('toggles a todo without changing the old state', () => {
  const before = { items: [{ id: 'a', text: 'Buy milk', done: false }] }

  const after = todosReducer(before, todoToggled('a'))

  expect(after.items[0].done).toBe(true)
  expect(before.items[0].done).toBe(false) // the old state is untouched
  expect(todosReducer(after, { type: 'unknown/action' })).toBe(after) // same reference
})
```

**Common mistake:** passing the action creator instead of calling it.

```jsx
// Wrong: dispatches the function itself, not an action object
<button onClick={() => dispatch(incremented)}>+1</button>

// Fixed: call it
<button onClick={() => dispatch(incremented())}>+1</button>
```

Why: `dispatch` needs an action object. The wrong version does nothing silently (we checked: the state stayed the same). In development, RTK prints a warning that says to call the action creator before dispatching.

## 6. Immer: why "mutating" code is safe here

Updating nested state by hand means copying every level:

```js
// Without Immer: copy each level that changes
return {
  ...state,
  user: {
    ...state.user,
    address: { ...state.user.address, city: 'Delhi' },
  },
}

// With Immer: write the change you mean
state.user.address.city = 'Delhi'
```

**Immer** is a small library that lets you write the second version and still get an immutable update. Redux Toolkit uses it inside `createSlice`. You can also use it on its own:

```js
import { produce } from 'immer' // npm install immer

const base = {
  user: { name: 'Asha' },
  todos: [
    { id: 1, done: false },
    { id: 2, done: false },
  ],
}

const next = produce(base, (draft) => {
  draft.todos[0].done = true
})

console.log(base.todos[0].done) // false (the original is not changed)
console.log(next.todos[0].done) // true
console.log(next === base) // false
console.log(next.user === base.user) // true (unchanged parts are shared)
console.log(next.todos[1] === base.todos[1]) // true
console.log(next.todos === base.todos) // false (the changed path is copied)
console.log(produce(base, () => {}) === base) // true (no change, same object)
console.log(Object.isFrozen(next)) // true
```

**What happens, step by step:**
1. `produce` gives your function a **draft**. The draft is a special object (a Proxy) that records every write you make to it.
2. Your function writes `draft.todos[0].done = true`. Nothing is changed in `base`.
3. When your function ends, Immer builds the result. It copies only the objects on the path you changed: the root, the `todos` array and the first todo. Everything else is reused from the original. This is called **structural sharing**. It is why `next.user === base.user`.
4. If you changed nothing, you get the original object back.
5. Immer freezes the result by default. So mutating it later, outside a producer, throws a `TypeError`.

Rules to remember in a `createSlice` reducer:
- **Mutate the draft, or return a new value. Never both in one reducer.** Returning a new value is useful to replace everything, for example `return initialState`.
- **The state in the store is frozen.** Code like `store.getState().counter.value = 99` throws `TypeError: Cannot assign to read only property 'value'`.
- **A draft is a Proxy, so `console.log(state)` is hard to read** in the browser console. Use `current(state)` from `@reduxjs/toolkit` to print a plain snapshot. `isDraft(state)` tells you whether you hold a draft.
- **Immer only works inside `produce` or a reducer made by RTK.** A hand-written reducer used with `useReducer` gets no Immer.

Immer is not only for Redux:
- `use-immer` gives you `useImmer`, a `useState` where you can write the change as a mutation:

```jsx
import { useImmer } from 'use-immer' // npm install immer use-immer

function Profile() {
  const [person, updatePerson] = useImmer({ name: 'Asha', address: { city: 'Pune' } })

  return (
    <button
      onClick={() =>
        updatePerson((draft) => {
          draft.address.city = 'Delhi'
        })
      }
    >
      {person.name} lives in {person.address.city}
    </button>
  )
}
```

The button first reads `Asha lives in Pune`. After a click it reads `Asha lives in Delhi` (we ran it to check).
- Zustand has an optional `immer` middleware (`zustand/middleware/immer`) for the same style.
- See also the immutable updates section of [useState in depth](../02-hooks/02-usestate-in-depth.md).

**Common mistake:** changing the draft and also returning a new object.

```js
// Wrong
bump(state) {
  state.n += 1
  return { n: 100 }
},

// Fixed: pick one style
bump(state) {
  state.n += 1
},
```

Why: Immer cannot tell which result you mean, so it throws `[Immer] An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.`

## 7. Async work: createAsyncThunk (and RTK Query)

A reducer must be pure, so it cannot call an API. Async work goes in a **thunk**: a function that receives `dispatch` and `getState` and can do async work, dispatching actions as it goes. RTK's thunk middleware is on by default.

The usual pattern for loading data has three moments: *pending*, *fulfilled* (success) and *rejected* (failure). `createAsyncThunk` creates all three actions for you.

```js
// src/userSlice.js
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

export const fetchUser = createAsyncThunk(
  'user/fetchById',
  async (userId, { rejectWithValue }) => {
    const response = await fetch(`/api/users/${userId}`)
    if (!response.ok) {
      return rejectWithValue(`Server said ${response.status}`)
    }
    return await response.json()
  },
)

const userSlice = createSlice({
  name: 'user',
  initialState: { entity: null, status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.entity = action.payload
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? action.error.message
      })
  },
})

export default userSlice.reducer
```

```jsx
// A component that uses it
import { useDispatch, useSelector } from 'react-redux'
import { fetchUser } from './userSlice'

function UserCard({ userId }) {
  const dispatch = useDispatch()
  const { entity, status, error } = useSelector((state) => state.user)

  return (
    <div>
      <button onClick={() => dispatch(fetchUser(userId))}>Load user</button>
      {status === 'loading' && <p>Loading...</p>}
      {status === 'failed' && <p role="alert">{error}</p>}
      {entity && <p>Name: {entity.name}</p>}
    </div>
  )
}
```

**What happens, step by step:**
1. The click dispatches `fetchUser(userId)`. `createAsyncThunk` dispatches `user/fetchById/pending` first. The reducer sets `status` to `'loading'` and the screen shows `Loading...`.
2. The payload function runs. It calls the API.
3. If the response is fine, the thunk returns the JSON. RTK dispatches `user/fetchById/fulfilled` with that data as `action.payload`. The reducer sets `status: 'succeeded'` and `entity`.
4. If the response is not fine, `rejectWithValue('Server said 404')` makes RTK dispatch `user/fetchById/rejected`, with your message as `action.payload`. The reducer sets `status: 'failed'` and `error`.
5. Any error thrown inside the payload function also becomes a `rejected` action, with `action.error.message`.

We ran this with a fake `fetch`. The statuses went `loading`, then `succeeded` (and the screen showed `Name: Asha`). Asking for a missing user went `loading`, then `failed` (the alert showed `Server said 404`). Notice that the old `entity` was still in the state, so `Name: Asha` stayed on screen next to the error. Decide on purpose whether a failure should clear old data.

Useful details:
- `dispatch(fetchUser(1))` returns a promise. Add `.unwrap()` to get the payload or a thrown error: `const user = await dispatch(fetchUser(1)).unwrap()`.
- `extraReducers` takes a **builder callback**, as above. The old object form (`extraReducers: { [fetchUser.pending]: ... }`) was removed in RTK 2 and throws.
- In development, StrictMode runs effects twice, so a thunk dispatched from `useEffect` sends two requests. `createAsyncThunk` accepts a `condition` function to skip a request you do not need, but a data library handles this for you.

Look at the amount of code: a thunk, three reducer cases, a status field, an error field, and still no caching, no retry, no refetching and no shared loading state between components. This is the pain that data libraries remove. Redux Toolkit has one built in, **RTK Query**:

```js
// src/todosApi.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const todosApi = createApi({
  reducerPath: 'todosApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Todo'],
  endpoints: (build) => ({
    getTodos: build.query({
      query: () => 'todos',
      providesTags: ['Todo'],
    }),
    addTodo: build.mutation({
      query: (text) => ({ url: 'todos', method: 'POST', body: { text } }),
      invalidatesTags: ['Todo'],
    }),
  }),
})

export const { useGetTodosQuery, useAddTodoMutation } = todosApi
```

```js
// src/store.js (the RTK Query parts)
import { configureStore } from '@reduxjs/toolkit'
import { todosApi } from './todosApi'

export const store = configureStore({
  reducer: { [todosApi.reducerPath]: todosApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(todosApi.middleware),
})
```

```jsx
import { useAddTodoMutation, useGetTodosQuery } from './todosApi'

function Todos() {
  const { data: items = [], isLoading, isError } = useGetTodosQuery()
  const [addTodo, { isLoading: isAdding }] = useAddTodoMutation()

  if (isLoading) return <p>Loading...</p>
  if (isError) return <p role="alert">Could not load todos</p>
  return (
    <div>
      <ul>
        {items.map((todo) => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
      <button disabled={isAdding} onClick={() => addTodo('Another one')}>
        Add
      </button>
    </div>
  )
}
```

**What happens, step by step:**
1. `useGetTodosQuery()` starts a request on mount. `isLoading` is `true` until the first answer arrives. The data is cached by endpoint and arguments.
2. `getTodos` **provides** the tag `'Todo'`. `addTodo` **invalidates** that tag.
3. When you click "Add", the POST runs. When it succeeds, the cached `'Todo'` data is marked out of date, and the library refetches `getTodos` by itself. The list shows the new item.
4. We checked this with a fake server: the list went from `one` to `one, two`, with one extra GET request after the POST.

RTK Query does the same job as TanStack Query (section 13). If you already use Redux, RTK Query fits well. If you do not, TanStack Query is the common choice.

**Common mistake:** the old object form of `extraReducers`.

```js
// Wrong in RTK 2: this object form throws
extraReducers: {
  [fetchUser.pending]: (state) => {
    state.status = 'loading'
  },
},

// Fixed: the builder callback
extraReducers: (builder) => {
  builder.addCase(fetchUser.pending, (state) => {
    state.status = 'loading'
  })
},
```

Why: RTK 2 removed the object notation. Many older tutorials still show it.

## 8. Middleware, thunk vs saga, and DevTools

### 8.1 Middleware

**Middleware** is code that sits between `dispatch` and the reducer. Every action passes through it on the way. It can log, delay, change or block actions, and it can start side effects. Its shape is three nested functions:

```js
const logger = (storeApi) => (next) => (action) => {
  console.log('before:', action.type, storeApi.getState())
  const result = next(action) // pass the action on (the reducer runs inside this call)
  console.log('after: ', action.type, storeApi.getState())
  return result
}
```

Add it with a callback. The callback receives `getDefaultMiddleware`, so you keep the defaults:

```js
import { configureStore } from '@reduxjs/toolkit'
import counterReducer, { incremented } from './counterSlice'

const store = configureStore({
  reducer: { counter: counterReducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
})

store.dispatch(incremented())
// before: counter/incremented { counter: { value: 0 } }
// after:  counter/incremented { counter: { value: 1 } }
```

**What happens, step by step:**
1. `dispatch(incremented())` sends the action into the middleware chain.
2. `logger` logs the state **before**. It calls `next(action)`, which hands the action to the next middleware, and finally to the reducer.
3. The reducer runs and the state changes. `next` returns.
4. `logger` logs the state **after**, then returns the result to the caller of `dispatch`.

What `configureStore` gives you by default:
- The **thunk** middleware, so you can dispatch functions (section 7).
- In development only, three checkers: one **throws if state is mutated** (you saw its message in section 4), one **warns about non-serializable values** in actions and state, and one **warns when you dispatch an action creator without calling it** (section 5). We saw all three print in tests. In a production build they are removed.
- Serializable means plain data: strings, numbers, booleans, `null`, plain objects and arrays. Class instances, `Map`, `Set`, functions and `Date` objects are flagged, because they break time travel and persistence. Store a date as an ISO string.

In RTK 2 the `middleware` option must be a callback. An array such as `middleware: [logger]` throws: `` `middleware` field must be a callback ``.

### 8.2 Thunk vs saga

A **thunk** is a function you dispatch. It can read state, do async work, and dispatch more actions. It is simple, built into RTK, and enough for most apps. A **saga** (the `redux-saga` library) is a generator function that runs in a middleware and *listens* for actions, using effects like `take`, `call` and `put`. Sagas can express long flows, races and cancellation in a very testable way, but they add concepts and code. Today most teams use thunks, RTK Query or TanStack Query, and the `createListenerMiddleware` helper that ships with RTK for "when action X happens, do Y". Know what sagas are, and that you will meet them in older large codebases. You rarely need to choose them for a new project.

### 8.3 Redux DevTools

**Redux DevTools** is a browser extension. It shows every action that was dispatched, the state after each one, and a diff of what changed. You can jump back to an earlier state ("time travel") and replay actions. This is possible because every change is a plain action and every reducer is pure.

`configureStore` connects to the extension automatically when it is installed (its `devTools` option is `true` by default). Teams that do not want it in production can write `devTools: import.meta.env.DEV` in a Vite app. Zustand has a `devtools` middleware that talks to the same extension (section 11).

**Common mistake:** putting a side effect or a non-plain value in the store.

```js
// Wrong: a Map in an action payload (and in state) fails the serializable check
dispatch(filtersChanged(new Map([['color', 'red']])))

// Fixed: plain data
dispatch(filtersChanged({ color: 'red' }))
```

Why: plain data can be logged, replayed, saved and sent over the wire. Class instances and Maps cannot.

## 9. Selectors: reading state well

A **selector** is a function that takes the state and returns the piece you need. `(state) => state.counter.value` is a selector. Why give selectors names and keep them next to the slice?
- Components do not need to know the shape of the state. If you move `counter.value`, you change one function, not twenty components.
- You can reuse a selector and test it.
- A selector is the right place for derived data (a filtered list, a total) and for memoizing it.

```js
// in counterSlice.js
export const selectCount = (state) => state.counter.value

// in a component
const count = useSelector(selectCount)
```

### 9.1 How useSelector decides to re-render

After every store change, `useSelector` runs your selector and compares the result with the previous result using `===`. The same value means "skip". A different value means "re-render this component".

So the golden rule is: **select the smallest piece you need, and return something stable**, a primitive or a reference that already lives in the state.

The classic trap is a selector that builds a new array or object every time:

```jsx
function OpenTodosBad() {
  // Wrong: .filter() returns a brand-new array on every call
  const open = useSelector((state) => state.todos.items.filter((item) => !item.done))
  return <p>Open: {open.length}</p>
}
```

A new array is never `===` the old one, so this component re-renders after **every** store update, even for actions that have nothing to do with todos. We tested it with a render counter. After mount, and then after one action that only changed the counter slice:

| Selector | Renders after mount | After an unrelated action |
|---|---|---|
| `state.todos.items.filter(...)` (new array each time) | 1 | 2 |
| `state.todos.items`, filter inside the component | 1 | 1 |
| A memoized selector made with `createSelector` | 1 | 1 |

In development, React-Redux 9 also warns about this on the first render: `Selector unknown returned a different result when called with the same parameters.` ("unknown" is just the name of an anonymous function.)

Three ways to fix it:
1. **Select the stable base, derive in the component.** `const items = useSelector((state) => state.todos.items)` and then `items.filter(...)` in the body. Cheap work needs nothing more. Add `useMemo` if the work is heavy.
2. **A memoized selector** (next part).
3. **Compare shallowly** when you must return a new object or array of picked values: `useSelector(selector, shallowEqual)` (import `shallowEqual` from `react-redux`). In our test, a component that picked `{ value, total }` this way re-rendered only when one of those two values changed.

### 9.2 Memoized selectors with createSelector

**Memoizing** means remembering the last result for the same inputs, and returning it instead of computing again. `createSelector` (from Reselect, re-exported by Redux Toolkit) takes **input selectors** and a **result function**. The result function runs only when an input changes.

```js
import { createSelector } from '@reduxjs/toolkit'

let computeCount = 0
const selectItems = (state) => state.items
const selectFilter = (state) => state.filter

const selectVisible = createSelector([selectItems, selectFilter], (items, filter) => {
  computeCount += 1
  return items.filter((item) => filter === 'all' || (filter === 'done') === item.done)
})

const items = [
  { id: 1, done: false },
  { id: 2, done: true },
]
const state1 = { items, filter: 'all', other: 1 }

const a = selectVisible(state1)
const b = selectVisible(state1)
console.log(a === b, computeCount) // true 1

const state2 = { ...state1, other: 2 } // an unrelated field changed
console.log(selectVisible(state2) === a, computeCount) // true 1

const done = selectVisible({ ...state2, filter: 'done' })
console.log(done, computeCount) // [ { id: 2, done: true } ] 2
```

**What happens, step by step:**
1. The first call runs both input selectors, then the result function. `computeCount` becomes 1.
2. The second call with the same state: the inputs (`items` and `filter`) are the same references, so Reselect returns the cached array. `a === b` is `true` and the result function does not run.
3. `state2` is a new object, but the two inputs did not change (only `other` did). Still cached.
4. A different `filter` is a changed input, so the result function runs again (`computeCount` is 2) and returns a new array.

Good to know:
- Reselect 5 (the version inside RTK 2) remembers several earlier inputs, not only the last one. We tested a selector that takes an extra argument and called it with 1, 2, 1, 2: the result function ran only twice.
- Do not wrap everything in `createSelector`. A selector like `state.counter.value` returns an existing value and needs no memoizing. Use `createSelector` when the selector **creates** a new array or object, or does real work.
- The same idea exists in the other libraries. Zustand: `useStore(useShallow(...))` (section 11). Jotai: derived atoms (section 12). Context has no selectors at all (section 3).

**Common mistake:** selecting the whole state.

```jsx
// Wrong: re-renders on every change anywhere in the store
const state = useSelector((state) => state)

// Fixed: select only what this component shows
const count = useSelector((state) => state.counter.value)
```

Why: the component depends on the whole store, so any action wakes it up.

## 10. Normalising data

**Normalising** means storing each kind of item once, in a table keyed by id, and linking items by id instead of nesting them. It is the same idea as tables in a database.

APIs often send nested data:

```js
const posts = [
  {
    id: 'p1',
    title: 'Hello',
    author: { id: 'u1', name: 'Asha' },
    comments: [
      { id: 'c1', text: 'Nice', author: { id: 'u2', name: 'Ben' } },
      { id: 'c2', text: 'Thanks', author: { id: 'u1', name: 'Asha' } },
    ],
  },
  { id: 'p2', title: 'Again', author: { id: 'u1', name: 'Asha' }, comments: [] },
]
```

Asha now appears three times. If she renames herself, you must find and update three copies, and miss one and the screen disagrees with itself. Finding comment `c2` means searching inside every post. Updating it means copying a deep path.

The normalised shape stores each user, comment and post once. The common naming is `byId` (a lookup object) and `allIds` (an array that keeps the order):

```js
{
  users: {
    byId: { u1: { id: 'u1', name: 'Asha' }, u2: { id: 'u2', name: 'Ben' } },
    allIds: ['u1', 'u2'],
  },
  comments: {
    byId: {
      c1: { id: 'c1', text: 'Nice', authorId: 'u2' },
      c2: { id: 'c2', text: 'Thanks', authorId: 'u1' },
    },
    allIds: ['c1', 'c2'],
  },
  posts: {
    byId: {
      p1: { id: 'p1', title: 'Hello', authorId: 'u1', commentIds: ['c1', 'c2'] },
      p2: { id: 'p2', title: 'Again', authorId: 'u1', commentIds: [] },
    },
    allIds: ['p1', 'p2'],
  },
}
```

(We produced exactly this from the nested data with a small function. You will write it yourself in the practice section.)

**What you gain, step by step:**
1. **One copy.** Renaming Asha is one line: `state.users.byId.u1.name = 'Asha K'`. Every post and comment that points to `u1` shows the new name.
2. **Fast lookup.** `state.comments.byId.c2` is direct. No searching.
3. **Simple updates.** To toggle one comment you touch one small object, not a deep tree.
4. **Stable references.** Only the changed item gets a new object, so components that read other items do not re-render.

Components then join the pieces with small selectors:

```jsx
function PostHeader({ postId }) {
  const post = useSelector((state) => state.posts.byId[postId])
  const author = useSelector((state) => state.users.byId[post.authorId])
  return (
    <h2>
      {post.title} by {author.name}
    </h2>
  )
}
```

Redux Toolkit has a helper for this shape, `createEntityAdapter`. It calls the two parts `ids` and `entities`, and it gives you ready-made reducers and selectors:

```js
import { createEntityAdapter, createSlice } from '@reduxjs/toolkit'

const todosAdapter = createEntityAdapter() // uses the "id" field as the key

const todosSlice = createSlice({
  name: 'todos',
  initialState: todosAdapter.getInitialState(), // { ids: [], entities: {} }
  reducers: {
    todoAdded: todosAdapter.addOne,
    todoUpdated: todosAdapter.updateOne,
    todoRemoved: todosAdapter.removeOne,
  },
})

export const { selectAll: selectAllTodos, selectById: selectTodoById } =
  todosAdapter.getSelectors((state) => state.todos)
```

We dispatched `todoAdded` twice (ids `a` and `b`), then `todoUpdated({ id: 'b', changes: { done: true } })` and `todoRemoved('a')`. The state ended as `{ ids: ['b'], entities: { b: { id: 'b', text: 'B', done: true } } }`, and `selectAllTodos` returned `[ { id: 'b', ... } ]`.

When should you normalise? When the same item shows up in several lists or places, when items are updated often, or when you look things up by id. You do not need it for a small list that is only displayed. TanStack Query stores each query result under its key and does not normalise; for most apps that is enough. GraphQL clients such as Apollo Client normalise for you. Senior interviews and frontend system design rounds (a news feed, a chat app) may ask how you would store such data.

**Common mistake:** keeping the same entity in several places.

```js
// Wrong: the author is copied into every post and comment
state.posts[0].author.name = 'Asha K' // the other copies are now out of date

// Fixed: one copy in a table, everything else keeps only the id
state.users.byId.u1.name = 'Asha K'
```

Why: two copies of one fact can disagree. One copy cannot.

## 11. Zustand: a small store with no ceremony

**Zustand** (German for "state") is a small store library. There is no `Provider`, no reducer, no action type and no `dispatch`. You call `create` and get a hook back.

```bash
npm install zustand
```

Here is the same todo list as in section 5, written with Zustand.

```js
// src/todoStore.js
import { create } from 'zustand'

export const useTodoStore = create((set) => ({
  items: [],
  addTodo: (text) =>
    set((state) => ({
      items: [...state.items, { id: crypto.randomUUID(), text, done: false }],
    })),
  toggleTodo: (id) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    })),
  removeTodo: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}))
```

```jsx
// src/App.jsx
import { useState } from 'react'
import { useTodoStore } from './todoStore'

function AddTodo() {
  const addTodo = useTodoStore((state) => state.addTodo)
  const [text, setText] = useState('')

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!text.trim()) return
        addTodo(text.trim())
        setText('')
      }}
    >
      <label>
        New todo
        <input value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <button type="submit">Add</button>
    </form>
  )
}

function TodoList() {
  const items = useTodoStore((state) => state.items)
  const toggleTodo = useTodoStore((state) => state.toggleTodo)

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          <label>
            <input type="checkbox" checked={item.done} onChange={() => toggleTodo(item.id)} />
            {item.text}
          </label>
        </li>
      ))}
    </ul>
  )
}

function OpenCount() {
  // A number is a primitive, so this is safe even though it filters
  const open = useTodoStore((state) => state.items.filter((item) => !item.done).length)
  return <p>{open} left</p>
}

export default function App() {
  return (
    <>
      <AddTodo />
      <TodoList />
      <OpenCount />
    </>
  )
}
```

(`crypto.randomUUID()` works on `https` pages and on `localhost`.)

**What happens, step by step:**
1. `create` receives a function. It gets `set` and returns the initial state, with the data **and** the actions in one object.
2. `useTodoStore((state) => state.items)` is a hook. The function you pass is a **selector**. The component subscribes to that slice only.
3. There is no Provider. The store lives in a module, and any component can import the hook.
4. You type "Buy milk" and press Add. `addTodo('Buy milk')` calls `set` with a function. Zustand merges the returned object into the state and tells its subscribers.
5. `TodoList` re-runs its selector and gets a new `items` array, so it re-renders. `AddTodo` selects only `addTodo`, which never changes, so this store update does not re-render it.
6. `OpenCount` selects a number. Filtering inside the selector is fine, because the result is a primitive that is compared by value.

We ran this app in a test. After adding "Buy milk" and "Walk dog" it showed `2 left` and two list items. After ticking "Buy milk" it showed `1 left`.

### 11.1 Selectors in action: the same two components as in section 3

Section 3 showed that with Context a change to `a` also re-rendered `ShowB`. Here is the same pair with Zustand:

```jsx
import { memo } from 'react'
import { create } from 'zustand'

const useStore = create((set) => ({
  a: 0,
  b: 0,
  increaseA: () => set((state) => ({ a: state.a + 1 })),
}))

const ShowA = memo(function ShowA() {
  const a = useStore((state) => state.a)
  console.log('render A')
  return <p>A: {a}</p>
})

const ShowB = memo(function ShowB() {
  const b = useStore((state) => state.b)
  console.log('render B')
  return <p>B: {b}</p>
})

function Controls() {
  const increaseA = useStore((state) => state.increaseA)
  return <button onClick={increaseA}>Increase A</button>
}

export default function App() {
  return (
    <>
      <ShowA />
      <ShowB />
      <Controls />
    </>
  )
}
```

On mount it prints `render A`, `render B`. After one click on "Increase A" it prints only:

```text
render A
```

`ShowB` selected `b`, `b` did not change, so Zustand did not wake it up. This is what "fine-grained subscriptions" means, and it is the main reason to move hot state out of Context.

### 11.2 Things to know about Zustand

- **`set` merges at the top level only.** `set({ user: { name: 'Ben' } })` replaces the whole `user` object. We tested a user `{ name: 'Asha', age: 30 }` and `age` was gone afterwards. For nested changes, spread the old object, or use the optional `immer` middleware.
- **Actions can be async.** An action is just a function. It can `await` something and call `set` when the data arrives. No thunk is needed.
- **You can use the store outside React:**

```js
import { create } from 'zustand'

const useCounter = create((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
}))

useCounter.getState().inc()
console.log(useCounter.getState().count) // 1

const unsubscribe = useCounter.subscribe((state, prevState) => {
  console.log(prevState.count, '->', state.count)
})
useCounter.setState({ count: 10 }) // prints: 1 -> 10
unsubscribe()
useCounter.setState({ count: 11 }) // prints nothing
```

- **Middleware** wraps the store creator. `devtools` connects to the Redux DevTools extension (it does not fail when the extension is missing), and `persist` saves to storage (section 15):

```js
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

const useStore = create(
  devtools((set) => ({
    n: 0,
    inc: () => set((s) => ({ n: s.n + 1 }), undefined, 'inc'), // 'inc' is the label shown in DevTools
  })),
)
```

- **Reset the store between tests.** A store lives in a module, so state leaks from one test to the next. Reset it in `beforeEach`: `useStore.setState(useStore.getInitialState(), true)`. The `true` means "replace" instead of "merge", and the actions survive because they are part of the initial state.
- **Version 5 changed one thing that breaks old habits.** A selector that returns a new array or object on every call causes an infinite render loop:

```jsx
// Wrong in Zustand 5: new array on every call
const [a, b] = useStore((s) => [s.a, s.b])
// React logs "The result of getSnapshot should be cached to avoid an infinite loop"
// and then throws "Maximum update depth exceeded".

// Fixed: useShallow compares the picked values one by one
import { useShallow } from 'zustand/react/shallow'
const [a, b] = useStore(useShallow((s) => [s.a, s.b]))
```

We ran both. With `useShallow`, the component rendered once on mount, did not re-render when an unrelated field changed, and re-rendered once when `a` changed. You can also select the two values with two separate `useStore` calls.

How does Zustand compare with Redux Toolkit?

| | Redux Toolkit | Zustand |
|---|---|---|
| Setup | Slices, `configureStore`, `Provider` | One `create` call, no Provider |
| Changing state | Dispatch an action to a reducer | Call a function that calls `set` |
| Structure | The library enforces actions and reducers | Up to you |
| Async | Thunks or RTK Query | Plain async functions |
| Debugging | DevTools and action log are built in | DevTools through a middleware |
| Fits | Large teams that want strict patterns | Small and medium shared state with little ceremony |

**Common mistake:** Zustand 4 habits.

```js
// Wrong (Zustand 4 style): default import, and shallow as a second argument
import create from 'zustand'
const [a, b] = useStore((s) => [s.a, s.b], shallow)

// Fixed (Zustand 5)
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
const [a, b] = useStore(useShallow((s) => [s.a, s.b]))
```

Why: version 5 has no default export, and passing `shallow` as a second argument no longer fixes the loop.

## 12. Jotai, and a quick tour of the rest

**Jotai** (Japanese for "state") builds state from small pieces called **atoms**. You do not cut one big store into slices. You create tiny atoms and combine them. It is a "bottom-up" style.

```bash
npm install jotai
```

```jsx
import { atom, useAtomValue, useSetAtom } from 'jotai'

const countAtom = atom(0) // a primitive atom: holds a value
const doubledAtom = atom((get) => get(countAtom) * 2) // derived: computed from other atoms
const incrementAtom = atom(null, (get, set) => set(countAtom, get(countAtom) + 1)) // write-only
const messageAtom = atom('hello')

function Count() {
  const count = useAtomValue(countAtom)
  console.log('render Count')
  return <p>count: {count}</p>
}

function Doubled() {
  const doubled = useAtomValue(doubledAtom)
  console.log('render Doubled')
  return <p>doubled: {doubled}</p>
}

function Message() {
  const message = useAtomValue(messageAtom)
  console.log('render Message')
  return <p>message: {message}</p>
}

function IncrementButton() {
  const increment = useSetAtom(incrementAtom)
  console.log('render IncrementButton')
  return <button onClick={increment}>+1</button>
}

export default function App() {
  return (
    <>
      <Count />
      <Doubled />
      <Message />
      <IncrementButton />
    </>
  )
}
```

**What happens, step by step:**
1. `atom(0)` describes a piece of state with the initial value 0. The atom is only a description. The value lives in a store that Jotai manages for you.
2. `atom((get) => get(countAtom) * 2)` is a **derived atom**. It depends on `countAtom` and updates when it changes.
3. `atom(null, (get, set) => ...)` is a **write-only atom**: a named action. `useSetAtom` gives you its function, and the component does not subscribe to any value.
4. On mount all four components render once. After one click, only `Count` and `Doubled` render again (we ran it: `render Count`, `render Doubled`). `Message` and `IncrementButton` do not.
5. `useAtomValue` reads, `useSetAtom` writes, and `useAtom` returns both, like `useState`: `const [count, setCount] = useAtom(countAtom)`.

Notes:
- No `Provider` is needed. Jotai uses a default store. A `Provider` with `createStore()` gives an isolated store, which is useful for tests and for server rendering.
- `jotai/utils` has helpers, for example `atomWithStorage('theme', 'light')` for state saved in `localStorage`.
- In Jotai 3, `atomFamily` moved out of `jotai/utils` into the separate `jotai-family` package. Older tutorials that import it from `jotai/utils` no longer work.
- Create atoms **outside** components. An atom created inside a component is a new atom on every render. We tried it: the button kept showing `count 0` because the state was thrown away on each render.

A quick tour of other tools you will hear about:
- **Valtio**: you mutate a proxy object (`state.count++`) and read it in components with `useSnapshot`. A component re-renders only for the properties it actually reads.
- **MobX**: observable state plus `observer` components. It tracks which observables a component reads and updates it automatically. Common in older and object-oriented codebases.
- **XState**: state machines, for flows with strict states and transitions, such as checkout steps. See Advanced patterns (planned).
- **Recoil**: an atom library from Meta. It is **no longer maintained**: its GitHub repository is archived, and the last npm release (0.7.7) is from March 2023. Do not start a new project with it. Jotai is the closest replacement in spirit.
- **`useSyncExternalStore`**: the React hook that lets a component subscribe to any outside store safely. Libraries such as React-Redux and Zustand are built on it, and you can build your own store with it (see [Other hooks](../02-hooks/09-other-hooks.md)).

**Common mistake:** creating an atom inside a component.

```jsx
// Wrong: a new atom, and a fresh value of 0, on every render
function Counter() {
  const countAtom = atom(0)
  const [count, setCount] = useAtom(countAtom)
  return <button onClick={() => setCount(count + 1)}>count {count}</button>
}

// Fixed: create the atom once, at module level
const countAtom = atom(0)

function Counter() {
  const [count, setCount] = useAtom(countAtom)
  return <button onClick={() => setCount(count + 1)}>count {count}</button>
}
```

Why: the atom is the identity of the state. A new atom means new state.

## 13. Server state: TanStack Query

**Server state** is data that lives on a server, and that your app borrows for a while. It is different from client state in four ways:
- You do not own it. Someone else can change it, so your copy can become **stale** (out of date).
- Getting it is asynchronous, and it can fail.
- Many components may want the same data at the same time.
- After you change it (a POST or a PUT), you must refresh your copy.

If you handle this with `useState` or Redux, you write the same things again and again: loading flags, error flags, caching, de-duplicating requests, retrying, refetching, invalidating. **TanStack Query** (also called React Query) does all of this for you. You say *what* data you want (a key and a function that fetches it), and the library manages the rest.

```bash
npm install @tanstack/react-query
```

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

const queryClient = new QueryClient() // create it once, outside any component

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
```

```jsx
// src/App.jsx
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

async function fetchTodos() {
  const response = await fetch('/api/todos')
  if (!response.ok) throw new Error('Could not load todos')
  return response.json()
}

async function addTodo(text) {
  const response = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!response.ok) throw new Error('Could not add the todo')
  return response.json()
}

function useTodos() {
  return useQuery({ queryKey: ['todos'], queryFn: fetchTodos })
}

function TodoList() {
  const { data, isPending, isError, error } = useTodos()

  if (isPending) return <p>Loading...</p>
  if (isError) return <p role="alert">{error.message}</p>
  return (
    <ul>
      {data.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  )
}

function TodoCount() {
  const { data } = useTodos()
  return <p>{data ? data.length : 0} todos</p>
}

function AddTodo() {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const mutation = useMutation({
    mutationFn: addTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate(text)
        setText('')
      }}
    >
      <label>
        New todo
        <input value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Add'}
      </button>
    </form>
  )
}

export default function App() {
  return (
    <>
      <TodoList />
      <TodoCount />
      <AddTodo />
    </>
  )
}
```

**What happens, step by step:**
1. On the first render, `TodoList` and `TodoCount` both call `useTodos()` with the key `['todos']`. There is nothing in the cache yet, so `isPending` is `true` and the screen shows `Loading...` and `0 todos`.
2. The library calls `fetchTodos` **once**, not twice. Two components with the same key share one request. (We checked with a fake server: one GET call.)
3. The answer arrives and is stored in the cache under `['todos']`. Both components re-render with the data: the list and `1 todos`.
4. You type "Ship it" and press Add. `mutation.mutate(text)` calls `addTodo`. While it runs, `isPending` is `true` and the button reads `Saving...`.
5. On success, `invalidateQueries` marks everything under `['todos']` as stale and refetches the queries that are on screen. Returning that promise keeps the mutation "pending" until the refetch is done.
6. The cache updates, and both components show the new data: the list has two items and the count says `2 todos`. The fake server saw exactly two GET calls in total.

The words to know:
- **Query key**: an array that names the data in the cache. The same key means the same entry. Put variables in it: `['todo', id]`.
- **Query function**: returns a promise of the data. It must **throw** on failure. `fetch` does not throw on a 404 or 500, so check `response.ok` yourself, as above.
- **Stale**: possibly out of date. By default data is stale immediately (`staleTime` is 0). Query still shows the cached data at once, and refetches in the background when a new component mounts, when the window regains focus, and when the network reconnects. Raise `staleTime` for data that rarely changes.
- **Retries and garbage collection**: a failed query is retried 3 times by default. Data that no component uses is removed after `gcTime`, 5 minutes by default.
- **Mutation**: a write. After it, **invalidate** the queries it affects.
- **Status words in version 5**: `isPending` means "no data yet", `isFetching` means "a request is running right now", and `isLoading` is both together. Old v4 names are gone: `cacheTime` is now `gcTime`, and `onSuccess` and `onError` no longer exist on `useQuery`.
- **Imperative fetching**: `queryClient.query({ queryKey, queryFn, staleTime })` returns the data, from the cache if it is still fresh. We checked that with `staleTime: 60_000` no new request was sent. Older tutorials use `fetchQuery`, `prefetchQuery` and `ensureQueryData`. They still work in version 5 but are marked as deprecated.

**Why this removes most Redux code.** Compare this with section 7. There is no thunk, no `status` and `error` fields in the state, no reducer cases for "loaded", no manual refetch and no flag shared between components. In many Redux apps, most of the store was a copy of server data. Move that to a data library and what is left is small. Often Context or a small store is enough. Redux Toolkit has its own version of this idea, RTK Query (section 7). The rules that matter:
- Do not keep the same server data in Query **and** in Redux or Zustand. Two copies will disagree.
- Query is for server data only. UI-only state (is the drawer open) does not belong in it.

Pagination, optimistic updates, Suspense and more are in [Data fetching](02-data-fetching.md).

**Common mistake:** copying query data into `useState`.

```jsx
// Wrong: the copy is made once, on the first render, when data is still undefined
const { data } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos })
const [todos] = useState(data ?? [])

// Fixed: use the data directly, and derive from it
const { data: todos = [] } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos })
```

Why: `useState` keeps only its first value. We tested the wrong version: the copy had 0 items while `data` had 3.

## 14. The URL as state

The address bar is state too. Page number, search text, sort order, selected tab and the id of the open item are all good candidates. The big benefits:
- A link to the page restores the same view, so people can share and bookmark it.
- The back and forward buttons work for free.
- A refresh does not lose the state.
- The server can read it too (for server rendering).

With React Router 8, search params are read and written with `useSearchParams`. Import everything from `react-router` (the separate `react-router-dom` package is not used any more).

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import ProductList from './ProductList'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ProductList />
    </BrowserRouter>
  </StrictMode>,
)
```

```jsx
// src/ProductList.jsx
import { useSearchParams } from 'react-router'

const PRODUCTS = [
  { id: 1, name: 'Red shoe', price: 30 },
  { id: 2, name: 'Blue shoe', price: 40 },
  { id: 3, name: 'Green hat', price: 20 },
]

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const sort = searchParams.get('sort') ?? 'name'

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    setSearchParams(next)
  }

  function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    updateParam('q', String(formData.get('q')).trim())
  }

  const visible = PRODUCTS.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase()),
  ).sort((a, b) => (sort === 'price' ? a.price - b.price : a.name.localeCompare(b.name)))

  return (
    <div>
      {/* key: a new URL gives the input a fresh defaultValue (for example after "back") */}
      <form onSubmit={handleSubmit} key={query}>
        <label>
          Search
          <input name="q" defaultValue={query} />
        </label>
        <button type="submit">Go</button>
      </form>
      <label>
        Sort by
        <select value={sort} onChange={(event) => updateParam('sort', event.target.value)}>
          <option value="name">Name</option>
          <option value="price">Price</option>
        </select>
      </label>
      <ul>
        {visible.map((product) => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

We ran this at the address `/products?q=shoe&sort=price`:
- It showed `Red shoe`, `Blue shoe` (cheapest first).
- Choosing "Name" in the select changed the address to `/products?q=shoe&sort=name` and the list to `Blue shoe`, `Red shoe`.
- Typing `hat` and pressing Enter changed the address to `/products?q=hat&sort=name` and showed only `Green hat`.

**What happens, step by step:**
1. The page does not own `query` or `sort` in `useState`. It reads them from the URL on every render, with defaults when a param is missing.
2. A change goes the other way. `updateParam` copies the current params, sets or deletes one key, and calls `setSearchParams`. React Router changes the address and re-renders the component.
3. The list is then derived from the URL values. The address is the single source of truth.
4. If the user presses the back button, the address goes back, `searchParams` is different, and the page shows the earlier view. No extra code.

Rules for URL state:
- **Values are strings.** Convert numbers yourself: `Number(searchParams.get('page') ?? '1')`. And never trust the value: anyone can type anything in the address bar, so validate it and fall back to a default.
- **Keep defaults out of the URL.** Delete the param when it equals the default, so links stay short and clean.
- **Search as you type:** do not write to the URL on every key press. Keep the draft text in local state and update the URL after a short pause (debounce, see [Custom hooks](../02-hooks/08-custom-hooks.md)) or on submit, as above. If you do update on each change, use `setSearchParams(next, { replace: true })` so one search does not create 20 history entries.
- **Do not put these in the URL:** secrets or tokens (URLs end up in history, logs and referrer headers), large data, and short-lived UI such as hover or an open menu.
- Path params (`/products/42`) are URL state too. In Next.js the equivalent hook is `useSearchParams` from `next/navigation`, and on a prerendered page it must be wrapped in `<Suspense>`.

The router itself is covered in [React Router](03-react-router.md).

**Common mistake:** copying URL state into `useState`.

```jsx
// Wrong: two sources of truth. After "back", the URL says one thing and the state another.
const [searchParams] = useSearchParams()
const [sort, setSort] = useState(searchParams.get('sort') ?? 'name')

// Fixed: read it from the URL on every render
const sort = searchParams.get('sort') ?? 'name'
```

Why: the state is initialised once and never follows the URL again.

## 15. Persisting state

Sometimes state must survive a reload or a new visit. Pick the place by what you need:

| Where | Survives | Good for | Watch out |
|---|---|---|---|
| The URL | Reloads, sharing, bookmarks | Filters, page, selected tab | Strings only, and public |
| `localStorage` | Closing the tab and the browser, on the same device | Theme, UI preferences, small drafts | Strings only, a few MB at most, readable by any script on the page |
| `sessionStorage` | A reload, but not a new tab | Progress of a wizard in one tab | Same limits as `localStorage` |
| Cookies | Sent to the server with each request | A session id the server reads (use `httpOnly`) | Small, and security flags matter |
| The server | Everywhere, on every device | Anything important | Needs an API |

### 15.1 Zustand: the persist middleware

```js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCounter = create(
  persist(
    (set) => ({
      count: 0,
      draft: 'not saved',
      inc: () => set((state) => ({ count: state.count + 1 })),
    }),
    {
      name: 'counter-storage', // the key in localStorage
      partialize: (state) => ({ count: state.count }), // save only "count"
    },
  ),
)
```

We ran it in a browser-like test:
1. Right after creating the store, `localStorage.getItem('counter-storage')` was `null`. In version 5 nothing is written until the first change.
2. After two calls to `inc()` it held `{"state":{"count":2},"version":0}`. The functions are not saved (JSON cannot hold them), and `draft` is left out because of `partialize`.
3. Creating the same store again (what happens after a page reload) read the storage: `count` was `2` and `draft` was back to its default, `'not saved'`.

Useful options: `storage: createJSONStorage(() => sessionStorage)` to use `sessionStorage`, and `version` with `migrate` to upgrade saved data when its shape changes.

### 15.2 Redux Toolkit: by hand

There is no built-in persistence. Many teams write about ten lines. Read the saved state when you create the store (`preloadedState`), and write it when the store changes:

```js
import { configureStore } from '@reduxjs/toolkit'
import counterReducer from './counterSlice'

function loadState() {
  try {
    const raw = localStorage.getItem('app-state')
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined // storage blocked, or the saved text is broken
  }
}

export const store = configureStore({
  reducer: { counter: counterReducer },
  preloadedState: loadState(),
})

store.subscribe(() => {
  try {
    localStorage.setItem('app-state', JSON.stringify(store.getState()))
  } catch {
    // storage is full or blocked: ignore
  }
})
```

We dispatched `incremented()` twice. The storage held `{"counter":{"value":2}}`, and a second store made the same way (a "reload") started with `{ counter: { value: 2 } }`. For big state, save only the parts you need and not on every change (debounce it). There is also a community library called `redux-persist` if you want a ready-made solution.

### 15.3 Jotai, hooks and cautions

- Jotai: `const themeAtom = atomWithStorage('theme', 'light')` (from `jotai/utils`) creates an atom that is read from and written to `localStorage`.
- With plain React you can write a `useLocalStorage` hook. See [Custom hooks](../02-hooks/08-custom-hooks.md).
- **Do not persist server data by hand.** The server is the source of truth, and the data library caches it.
- **Never store secrets or tokens in `localStorage`.** Any script on the page can read it. See [Security](../04-advanced/10-security-and-i18n.md).
- **Storage can fail.** It throws in some private modes, when it is full, or when it is blocked. Wrap reads and writes in `try/catch`, as above.
- **Server rendering.** The server has no `localStorage`. If the first client render reads it, the HTML will not match and React reports a hydration mismatch. Read the saved value after mount. See [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md).
- **Saved data gets old.** Add a version number so a new app version can ignore or migrate old data.

**Common mistake:** persisting everything.

```js
// Wrong: saves functions' results, loading flags and temporary UI too
persist(store, { name: 'app' })

// Fixed: save only what should survive
persist(store, { name: 'app', partialize: (state) => ({ theme: state.theme }) })
```

Why: a saved "loading: true" or an open modal comes back after a reload, and old data can break a new version of the app.

## 16. A decision guide

Start from the problem, not from the library.

| The problem | Reach for | Why |
|---|---|---|
| One component needs it | `useState` or `useReducer` | The simplest thing, and it stays local |
| A few nearby components share it | Lift state up, or composition | The data flow stays explicit |
| Many far-apart components read a value that rarely changes (theme, locale, user) | Context | No new library |
| Shared client state that changes often, or is read in small slices | Zustand (or Jotai) | Selectors, small API |
| Many small pieces with derived values | Jotai | Atoms and derived atoms |
| Large app, many developers, strict patterns, DevTools, middleware | Redux Toolkit | Structure and tools |
| Data from an API | TanStack Query (or RTK Query if you use Redux) | Cache, refetch, retry, status |
| Filters, page, sort, selected item | The URL | Shareable, the back button works |
| Form values and errors | `useState`, FormData, or a form library | Local to the form. See [Forms with libraries](04-forms-with-libraries.md) |
| A flow with strict states | `useReducer` with a status field, or a state machine | No impossible states |

The same decision as a list of questions. Stop at the first "yes":
1. Does it come from a server? Use a data library.
2. Should a link or the back button restore it? Use the URL.
3. Does one component use it? Use `useState`.
4. Do a few close components use it? Lift it up.
5. Do many far-apart components read it, and does it change rarely? Use Context.
6. Otherwise use a store: Zustand for small and light, Redux Toolkit for big teams and strict structure, Jotai for atoms.

## 17. How to talk about Redux vs Context vs Zustand

Interviewers rarely want a library fan. They want to hear a way of thinking. A good 30-second answer to "Redux vs Context vs Zustand, how do you choose?":

> First I ask what kind of state it is. Server data goes to TanStack Query, filters and pages go to the URL, and local UI state stays in `useState`. For what is left, shared client state, I start with lifting state up and Context. Context only delivers a value, and it re-renders every reader when the value changes, so I use it for low-frequency things like theme and the current user. If many components read different slices of state that changes often, I use a store with selectors. Zustand if I want something small, Redux Toolkit if the team is large and wants strict structure, DevTools and middleware. I would not add Redux just in case.

Then be ready for the follow-ups:
- *"Is Redux dead?"* No. It is used a lot, especially in large existing codebases. But modern Redux means Redux Toolkit, and many new apps need less of it, because server state moved to a data library.
- *"Why not Context for everything?"* No selectors, so every reader re-renders, and no built-in tools for async work or debugging.
- *"Why Zustand over Redux?"* Less code and no Provider. You give up the enforced structure and some of the tooling.
- *"What would you change in a Redux app you inherit?"* Move server data to RTK Query or TanStack Query, migrate old `connect` code to hooks, and stop copying API data into slices.

Red flags: "Context replaces Redux", "put everything in Redux", "Redux is dead", mutating state outside Immer, copying API data into a store, and not knowing what a selector is.

## How interviewers test this
- **Do you separate the kinds of state?** A strong answer names local, shared client, server, URL and form state, and gives each its own tool. The red flag is "I put everything in Redux" or "everything in `useState`".
- **Can you explain Redux in plain words?** Store, action, reducer, dispatch, one-way flow, and *why* reducers are pure (predictable, testable, time travel). Bonus: what Redux Toolkit adds (slices, Immer, thunks, defaults) and that `createStore` and `connect` are legacy.
- **Redux vs Context.** Context delivers a value and has no selectors. A store has selectors, middleware and DevTools. "Context replaces Redux" and "Redux is dead" are both red flags.
- **Re-render control.** `useSelector` compares with `===`. A selector that returns a new array or object re-renders on every update. Fixes: select a stable value, `createSelector`, `shallowEqual`, or Zustand's `useShallow`.
- **Do you know current practice?** Redux Toolkit 2 (not `createStore`), TanStack Query 5 for server data, Zustand 5, Jotai, and that Recoil is no longer maintained.
- **Small coding tasks.** A mini store with `subscribe` and `useSyncExternalStore`, a reducer with immutable updates, normalising nested data, a theme switcher saved in `localStorage`.

## Interview questions and model answers

### Q1. What is the difference between Redux and the Context API? Does Context replace Redux? (Medium)
Context is a way to **deliver** a value to a whole subtree without passing props. It does not manage state: you still need `useState` or `useReducer`. When the context value changes, every component that reads it re-renders, because there are no selectors. Redux is a **state container** with a defined way to change state: one store outside React, actions, pure reducers, middleware, DevTools and selectors, so a component re-renders only when the slice it reads changes. Context fits low-frequency values like theme, locale and the current user. A store fits large or fast-changing state read in small slices. `useReducer` plus Context can replace Redux in a small app, but it is not a full replacement. (React-Redux even uses Context under the hood, only to hand the store to your components.)

### Q2. What kinds of state are there in a React app, and how do you manage each? (Easy)
Five kinds. **Local UI state** (a modal is open) lives in `useState` in that component. **Shared client state** (cart, theme) is lifted up, put in Context, or put in a store. **Server cache state** (a product list) belongs to a data library such as TanStack Query. **URL state** (page, filters) lives in the URL. **Form state** (drafts and errors) lives in the form, with `useState`, FormData or a form library. The key idea is that most apps need less global state than people think, because the other kinds have better homes.

### Q3. Explain Redux: store, action, reducer, dispatch and middleware. (Easy)
Redux keeps shared state in one **store** outside the components. State is read-only. To change it you **dispatch** an **action**, a plain object like `{ type: 'todos/todoAdded', payload: ... }`. The store passes the action to a **reducer**, a pure function `(state, action) => nextState` that returns a new state without changing the old one. **Middleware** sits between `dispatch` and the reducer and can log, handle async work or block actions. Components read state with selectors and re-render when their slice changes. Data flows in one direction, which makes changes predictable and debuggable.

```js
function counterReducer(state = { value: 0 }, action) {
  if (action.type === 'counter/incremented') {
    return { value: state.value + 1 }
  }
  return state
}
```

### Q4. Why Redux Toolkit? What problems does it solve? (Easy)
Hand-written Redux had a lot of boilerplate (action type constants, action creators, `switch` reducers) and it was easy to make mistakes, such as mutating state or forgetting the `default` case. Redux Toolkit is the official, recommended way to write Redux. `configureStore` sets up the store with good defaults (thunk, development checks, DevTools). `createSlice` writes the reducer and the actions together and uses Immer, so you can write `state.value += 1` safely. `createAsyncThunk` handles the pending, fulfilled and rejected pattern, and RTK Query handles server data. The result is much less code and fewer bugs.

### Q5. When should you not use Redux? (Medium)
Do not use it when a simpler rung of the ladder works. Local state belongs in `useState`. Server data belongs in TanStack Query or RTK Query, not copied into a store. Filters and pages belong in the URL. A theme or current user can live in Context. A small app with a little shared state may only need Zustand or even lifting state up. Redux is worth its weight when many developers share a large app, the update rules are complex, and you want strict structure, middleware and time-travel debugging. A good answer shows you pick the smallest tool that solves a real problem.

### Q6. What is the difference between server state and client state, and why do people use TanStack Query? (Medium)
Client state is owned by the browser: UI flags, a cart before checkout, the theme. Server state is owned by a server. You hold a borrowed copy that can be stale, that loads asynchronously, that can fail, and that many components may want at once. TanStack Query manages this: it caches by query key, shares one request between components, refetches stale data when a component mounts or the window regains focus, retries failures, tracks `isPending` and `isError`, and refreshes data after a mutation with `invalidateQueries`. Using it removes thunks, loading flags and reducers from the store, which is why many apps no longer need Redux for data. RTK Query does the same job inside Redux.

### Q7. What is Immer doing in Redux Toolkit? Can you mutate state in a reducer? (Medium)
Inside `createSlice` you may write code that looks like mutation, such as `state.items.push(item)`. Immer gives your function a **draft**, a Proxy that records the writes. When the function ends, Immer builds a new immutable state, copying only the objects on the changed path and reusing the rest (structural sharing). The old state is never changed, and the result is frozen. Two rules: either mutate the draft **or** return a new value, never both (Immer throws), and outside a reducer you must not mutate the store's state (it is frozen, so it throws a `TypeError`). Immer is also available alone (`produce`) and in React through `use-immer`.

### Q8. How do you handle async logic in Redux? What is a thunk, and thunk vs saga? (Medium)
Reducers must be pure, so async work lives outside them. A **thunk** is a function you dispatch. It receives `dispatch` and `getState`, does async work, and dispatches actions when it is done. In RTK, `createAsyncThunk('user/fetchById', async (id) => ...)` creates `pending`, `fulfilled` and `rejected` actions for you, and the slice handles them in `extraReducers`. A **saga** is a generator function run by the `redux-saga` middleware. It listens for actions and uses effects like `take`, `call` and `put`. Sagas handle complex flows, races and cancellation, but add concepts. Most teams use thunks, RTK Query or TanStack Query, and you meet sagas mostly in older codebases.

### Q9. What is middleware in Redux? Can you write one? (Medium)
Middleware is code between `dispatch` and the reducer. It sees every action, can do something before and after, and decides whether to pass the action on with `next(action)`. Its shape is `store => next => action => result`. A logger:

```js
const logger = (storeApi) => (next) => (action) => {
  console.log('before:', action.type, storeApi.getState())
  const result = next(action)
  console.log('after: ', action.type, storeApi.getState())
  return result
}
```

You add it with `configureStore({ reducer, middleware: (getDefault) => getDefault().concat(logger) })`. In RTK 2 the `middleware` option must be a callback. The default middleware are the thunk and, in development, checks for state mutation, non-serializable values and a forgotten action creator call.

### Q10. How do you avoid unnecessary re-renders with selectors? (Medium)
Select the smallest piece the component needs. `useSelector` compares the result with the previous one using `===`, so a primitive or an existing reference is safe. Avoid selectors that build a new array or object, because they re-render on every store update. Fix them by selecting the stable base and deriving in the component, by using a memoized selector from `createSelector`, or by passing `shallowEqual`. In Zustand, select one field at a time, or wrap an array or object selector in `useShallow` (otherwise version 5 loops). In Jotai, use small atoms. Plain Context has no selectors, which is why it re-renders all readers.

### Q11. Zustand vs Redux Toolkit vs Jotai: how do you choose? (Medium)
Redux Toolkit suits large apps and teams: enforced structure (actions and reducers), DevTools, middleware and RTK Query. Zustand suits small and medium shared state: one `create` call, no Provider, selectors, and a few lines per feature. Jotai suits state made of many small pieces with derived values: atoms are combined bottom-up, and a component re-renders only for the atoms it reads. All three give selector-like fine-grained updates, unlike Context. None of them should hold server data, which belongs in a data library. Recoil is not an option for new work because it is no longer maintained.

### Q12. How do you persist state? (Medium)
It depends on the kind of state. Filters and pages go in the **URL**, which survives reloads and can be shared. Preferences like theme go in **`localStorage`**, for example with Zustand's `persist` middleware (use `partialize` to save only what you need and `version` to migrate), or Jotai's `atomWithStorage`. In Redux you read saved state into `preloadedState` and write it from `store.subscribe`. Important data goes to the **server**. Cautions: wrap storage access in `try/catch`, never store secrets or tokens in `localStorage`, read it after mount in server-rendered apps to avoid a hydration mismatch, and do not persist server data by hand.

### Q13. What is state normalisation, and when do you need it? (Medium)
Normalising means storing each kind of item once in a table keyed by id (`byId` and `allIds`, or `entities` and `ids` in RTK) and linking items by id instead of nesting them. It avoids duplicate copies of the same entity, gives direct lookup by id, and makes updates a one-line change that cannot leave stale copies behind. Redux Toolkit provides `createEntityAdapter` for the shape, with ready-made reducers and selectors. You need it when the same entity appears in several places, when items change often, or when collections are large. A small read-only list does not need it.

### Q14. Why does `useSelector((state) => state.items.filter(...))` re-render too much, and how do you fix it? (Hard)
`useSelector` runs the selector after every store update and compares the result with `===`. `filter` returns a new array each time, so the comparison always fails, and the component re-renders after every action, even unrelated ones. In development React-Redux warns that the selector returned a different result for the same parameters. Fixes: select `state.items` and filter in the component (with `useMemo` if it is heavy), or use `createSelector([selectItems, selectFilter], (items, filter) => ...)`, which returns the cached array until `items` or `filter` change. `createSelector` takes input selectors and a result function. Reselect 5 remembers several earlier inputs, not only the last one. Use it when a selector creates new values or does real work, not for a plain property read.

### Q15. Design the client-side state for a small shop: product list, cart, filters, signed-in user and dark mode. (Hard)
Go kind by kind. The **product list** is server state, so `useQuery` with a key that includes the filters. The **filters, sort and page** are URL state in search params, so links work and the back button works. The **cart** is shared client state read by the header, the product cards and the checkout page, so a small Zustand store (or a Redux slice) with `addItem` and `removeItem`, a derived total as a selector, and `persist` with `partialize` so it survives a reload. The **signed-in user** comes from the server (a query) and is handed to the app through Context or the query cache. **Dark mode** is a preference in Context or a tiny store, saved in `localStorage`. Everything else, like open drawers and form drafts, stays in local `useState`. Server data is never copied into the cart store: the cart holds ids and quantities, and prices come from the query.

## Common mistakes and gotchas
- **Copying server data into `useState`, Zustand or Redux by hand.** Fix: use TanStack Query (or RTK Query) and read `data` directly.
- **One global store for everything, including a modal's open flag.** Fix: keep local UI state local and use the lowest rung of the ladder.
- **Storing derived data** (a total, a filtered list). Fix: store the minimum and compute the rest with a selector or in render.
- **Mutating state outside Immer** (in a `useReducer`, a Zustand `set`, or a plain Redux reducer). Fix: return new objects, or use `createSlice`, `produce` or the `immer` middleware.
- **Mutating the draft and returning a new value in one reducer.** Fix: pick one style.
- **`useSelector((state) => state)` or a selector that returns a new array or object.** Fix: select the smallest stable piece, `createSelector`, or `shallowEqual`.
- **`dispatch(incremented)` without the parentheses.** Fix: `dispatch(incremented())`.
- **Random ids, dates or API calls inside a reducer.** Fix: create them in `prepare`, in the event handler, or in a thunk.
- **Non-serializable values in Redux** (`Map`, `Set`, `Date`, class instances, functions). Fix: store plain data, such as an ISO string for a date.
- **Old Redux style in new code**: `createStore`, `connect`, hand-written `switch`, `extraReducers` as an object, `middleware` as an array. Fix: `configureStore`, `createSlice`, the builder callback and a middleware callback.
- **Zustand 4 habits**: a default import, `shallow` as a second argument, or a selector that returns an array. Fix: `import { create }` and `useShallow`.
- **Creating a Jotai atom inside a component.** Fix: create atoms at module level.
- **Starting a new project with Recoil.** Fix: it is no longer maintained, so use Jotai or Zustand.
- **Fast-changing state in Context** (mouse position, typing). Fix: keep it local or use a store with selectors.
- **Duplicating URL state in `useState`.** Fix: read it from the URL on every render.
- **Writing to the URL on every key press.** Fix: debounce, update on submit, or use `replace: true`.
- **Forgetting the `Provider`** (`could not find react-redux context value`). Fix: wrap the app in `<Provider store={store}>`.
- **Persisting everything, or tokens.** Fix: use `partialize`, add a version, and keep secrets out of `localStorage`.
- **A Zustand store shared between tests.** Fix: reset it in `beforeEach` with `setState(getInitialState(), true)`.

@@PART5@@
