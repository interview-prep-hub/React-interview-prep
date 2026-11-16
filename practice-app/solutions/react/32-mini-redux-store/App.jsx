import { useRef, useState } from 'react'
import { combineReducers, createStore } from './store.js'
import { Provider, useDispatch, useSelector } from './react-redux.jsx'

// Reference solution for exercise 32: two independent slices (counter and todos)
// and a render-count badge on every component.
//
// Key ideas:
// - Reducers are pure: they return NEW values and never change their input.
// - Each component selects only what it needs, so it re-renders only when that
//   value changes.
// - A component that only dispatches selects nothing, so it never re-renders
//   because of the store.

// ---- Render counter (a demo tool) -------------------------------------------
// It writes to a ref while rendering, which normal components should never do.
// Here it is the whole point: it counts how often React calls this component.
// (In development StrictMode renders twice, so compare numbers, do not trust
// the absolute value.)
function RenderBadge({ name }) {
  const renders = useRef(0)
  renders.current += 1
  return <small data-testid={`${name}-renders`}>renders: {renders.current}</small>
}

// ---- Slice 1: counter (state is a number) ------------------------------------
const increment = () => ({ type: 'counter/increment' })
const decrement = () => ({ type: 'counter/decrement' })

function counterReducer(state = 0, action) {
  switch (action.type) {
    case 'counter/increment':
      return state + 1
    case 'counter/decrement':
      return state - 1
    default:
      return state
  }
}

// ---- Slice 2: todos (state is an array of { id, text, done }) ---------------
let nextTodoId = 1

// The id is made here and not in the reducer: a reducer must give the same
// result for the same input, so it cannot invent ids.
const addTodo = (text) => ({ type: 'todos/added', payload: { id: nextTodoId++, text } })
const toggleTodo = (id) => ({ type: 'todos/toggled', payload: id })

function todosReducer(state = [], action) {
  switch (action.type) {
    case 'todos/added':
      return [...state, { ...action.payload, done: false }]
    case 'todos/toggled':
      return state.map((todo) => (todo.id === action.payload ? { ...todo, done: !todo.done } : todo))
    default:
      return state
  }
}

const rootReducer = combineReducers({ counter: counterReducer, todos: todosReducer })

// ---- Selectors ----------------------------------------------------------------
// They return an existing reference or a primitive, so the same state always
// gives the same result (what useSyncExternalStore needs).
const selectCount = (state) => state.counter
const selectTodos = (state) => state.todos
// A number is a primitive: adding an unfinished todo leaves it unchanged, so
// the component that uses it does not re-render.
const selectDoneCount = (state) => state.todos.filter((todo) => todo.done).length

// ---- Components -----------------------------------------------------------------
function CounterValue() {
  const count = useSelector(selectCount)
  return (
    <p>
      Count: <span data-testid="count">{count}</span> <RenderBadge name="counter-value" />
    </p>
  )
}

function CounterButtons() {
  // Only dispatch: no subscription, so this never re-renders from the store.
  const dispatch = useDispatch()
  return (
    <div>
      <button onClick={() => dispatch(decrement())}>Decrement</button>
      <button onClick={() => dispatch(increment())}>Increment</button>
      <RenderBadge name="counter-buttons" />
    </div>
  )
}

function TodoForm() {
  const dispatch = useDispatch()
  // The text being typed is local UI state. It does not belong in the store.
  const [text, setText] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = text.trim()
    if (trimmed === '') return
    dispatch(addTodo(trimmed))
    setText('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="new-todo">New todo</label>
      <input id="new-todo" value={text} onChange={(event) => setText(event.target.value)} />
      <button type="submit">Add todo</button>
      <RenderBadge name="todo-form" />
    </form>
  )
}

function TodoList() {
  const todos = useSelector(selectTodos)
  const dispatch = useDispatch()
  return (
    <div>
      <ul aria-label="Todo list">
        {todos.map((todo) => (
          <li key={todo.id}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => dispatch(toggleTodo(todo.id))}
              />
              <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>{todo.text}</span>
            </label>
          </li>
        ))}
      </ul>
      <RenderBadge name="todo-list" />
    </div>
  )
}

function TodoStats() {
  const doneCount = useSelector(selectDoneCount)
  return (
    <p>
      Completed: <span data-testid="done-count">{doneCount}</span> <RenderBadge name="todo-stats" />
    </p>
  )
}

export default function App() {
  // One store per mounted App, created once (the initializer runs on the first
  // render only). A module-level store would leak state between mounts.
  const [store] = useState(() => createStore(rootReducer))

  return (
    <Provider store={store}>
      <h2>Mini Redux</h2>

      <section>
        <h3>Counter</h3>
        <CounterValue />
        <CounterButtons />
      </section>

      <section>
        <h3>Todos</h3>
        <TodoForm />
        <TodoList />
        <TodoStats />
      </section>
    </Provider>
  )
}
