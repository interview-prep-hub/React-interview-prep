import { useRef } from 'react'
// TODO 1: you will also need useState, combineReducers, createStore, Provider,
// useDispatch and useSelector. Import them from 'react', './store.js' and
// './react-redux.jsx'.

// Exercise 32, part C: the demo app with two independent slices.
// Read README.md in this folder for the full requirements.

// ---- GIVEN: the render counter (you do not need to change it) ---------------
// It counts how often React calls the component it is placed in. It writes to a
// ref while rendering, which normal components should never do. Here it is the
// whole point. (In development, StrictMode renders twice, so compare numbers
// instead of trusting the absolute value.)
function RenderBadge({ name }) {
  const renders = useRef(0)
  renders.current += 1
  return <small data-testid={`${name}-renders`}>renders: {renders.current}</small>
}

// ---- Slice 1: counter (its state is a number, it starts at 0) ---------------
// TODO 2: write two action creators (plain functions that return an action
// object) for increment and decrement, and the reducer. Reducers are pure:
// return a new value, never change the input, and return `state` for actions
// you do not know.
function counterReducer(state = 0, action) {
  return state
}

// ---- Slice 2: todos (its state is an array of { id, text, done }) -----------
// TODO 3: action creators for "add a todo" and "toggle a todo", and the reducer.
// A reducer must be pure, so it cannot invent an id: create the id before the
// action is dispatched (for example inside the action creator).
function todosReducer(state = [], action) {
  return state
}

// TODO 4: combine the two slices: counter -> state.counter, todos -> state.todos
const rootReducer = (state = {}, action) => state

// ---- Selectors (small functions: state in, one value out) -------------------
// TODO 5: write selectors for the count, the todos array, and the NUMBER of
// completed todos. Return an existing reference or a primitive, never a brand
// new array or object (the same state must give the same result).

// ---- Components --------------------------------------------------------------
function CounterValue() {
  // TODO 6: read the count from the store with useSelector.
  return (
    <p>
      Count: <span data-testid="count">0</span> <RenderBadge name="counter-value" />
    </p>
  )
}

function CounterButtons() {
  // TODO 7: this component only SENDS actions, it shows nothing from the store.
  // So it needs useDispatch and nothing else.
  return (
    <div>
      <button>Decrement</button>
      <button>Increment</button>
      <RenderBadge name="counter-buttons" />
    </div>
  )
}

function TodoForm() {
  // TODO 8: keep the text being typed in local state (it is UI state, it does
  // not belong in the store). On submit: ignore empty or whitespace-only text,
  // dispatch "add todo", then clear the input. Pressing Enter must work too.
  // The onSubmit below only stops the browser from reloading the page. Replace
  // it with your own handler.
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <label htmlFor="new-todo">New todo</label>
      <input id="new-todo" />
      <button type="submit">Add todo</button>
      <RenderBadge name="todo-form" />
    </form>
  )
}

function TodoList() {
  // TODO 9: read the todos with useSelector and render one <li> per todo.
  // Each item has a checkbox that is named by the todo text (wrap both in a
  // <label>) and dispatches "toggle todo" when clicked.
  return (
    <div>
      <ul aria-label="Todo list"></ul>
      <RenderBadge name="todo-list" />
    </div>
  )
}

function TodoStats() {
  // TODO 10: select the NUMBER of completed todos. A number is a primitive, so
  // this component does not re-render when you add a todo that is not done.
  return (
    <p>
      Completed: <span data-testid="done-count">0</span> <RenderBadge name="todo-stats" />
    </p>
  )
}

export default function App() {
  // TODO 11: create the store here, ONCE per mounted App (not at module level,
  // or the state would leak between mounts). Hint: useState with an initializer.

  // TODO 12: wrap the content below in <Provider store={store}>.
  return (
    <div>
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
    </div>
  )
}
