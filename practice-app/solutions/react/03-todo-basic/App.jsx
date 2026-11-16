import { useState } from 'react'
import './styles.css'

// Reference solution for exercise 03.
// Key ideas:
// - each todo gets a stable, unique id when it is CREATED, and that id is the
//   React key (an array index changes when you delete from the middle)
// - state is never changed in place: we return NEW arrays and objects using
//   spread, map and filter
// - "items left" is derived from the list while rendering, so it is never
//   stored in state and can never get out of sync

// A simple id source. (crypto.randomUUID() would also work in a browser.)
let nextId = 1

export default function App() {
  const [todos, setTodos] = useState([]) // [{ id, text, done }]
  const [text, setText] = useState('') // what is typed in the input

  // Derived value: computed on every render from the single source of truth.
  const itemsLeft = todos.filter((todo) => !todo.done).length

  const addTodo = (event) => {
    event.preventDefault() // a form submit would reload the page otherwise
    const trimmed = text.trim()
    if (trimmed === '') return // empty or whitespace-only: ignore

    // Make the id here, not inside the updater function below.
    // Updater functions must stay pure (StrictMode runs them twice).
    const id = nextId++
    setTodos((prev) => [...prev, { id, text: trimmed, done: false }])
    setText('')
  }

  const toggleTodo = (id) => {
    setTodos((prev) =>
      // Copy the one todo that changes; reuse all the others as they are.
      prev.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)),
    )
  }

  const deleteTodo = (id) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id))
  }

  return (
    <div className="todo-app">
      <h2>Todos</h2>

      <form onSubmit={addTodo}>
        <label htmlFor="new-todo">New todo</label>
        <input
          id="new-todo"
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            {/* The label around the checkbox gives it the todo text as its name */}
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
              />{' '}
              <span className={todo.done ? 'done' : undefined}>{todo.text}</span>
            </label>
            <button
              type="button"
              aria-label={`Delete ${todo.text}`}
              onClick={() => deleteTodo(todo.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <p data-testid="items-left">
        {itemsLeft} {itemsLeft === 1 ? 'item' : 'items'} left
      </p>
    </div>
  )
}
