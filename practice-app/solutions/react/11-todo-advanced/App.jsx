import { useEffect, useRef, useState } from 'react'

// Reference solution for exercise 11.
// Key ideas:
// - lazy state initialisation: useState(loadTodos) passes the FUNCTION, so React
//   calls it once, on the first render only. useState(loadTodos()) would read
//   localStorage again on every render, and throw the result away.
// - an effect keeps localStorage in sync: "whenever todos change, save them"
// - the visible list, the counts and "all done" are DERIVED from todos and filter
//   during render. They are never stored in state, so they cannot go out of sync.
// - each TodoItem owns its own editing state. The app only hears the final result.
// - the todo id is the React key, so React can match each <li> to its todo even
//   when todos are removed or filtered out (an array index would not stay the same).

const STORAGE_KEY = 'todos'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
]

const matchesFilter = {
  all: () => true,
  active: (todo) => !todo.completed,
  completed: (todo) => todo.completed,
}

// Anything unexpected in storage (nothing saved, broken JSON, wrong shape)
// means "start with an empty list". Never let bad storage crash the app.
function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveTodos(todos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  } catch {
    // Storage can be full or blocked. The app keeps working in memory.
  }
}

export default function App() {
  const [todos, setTodos] = useState(loadTodos) // lazy init: note, no ()
  const [filter, setFilter] = useState('all')
  const [newText, setNewText] = useState('')

  // Effect: synchronise the outside world (localStorage) with our state.
  useEffect(() => {
    saveTodos(todos)
  }, [todos])

  // Derived values.
  const visibleTodos = todos.filter(matchesFilter[filter])
  const completedCount = todos.filter((todo) => todo.completed).length
  const activeCount = todos.length - completedCount
  const allDone = todos.length > 0 && activeCount === 0

  // All updates use the functional form and return NEW arrays and objects.
  function addTodo(event) {
    event.preventDefault()
    const text = newText.trim()
    if (text === '') return
    // Create the todo (and its random id) before calling setTodos, so the updater
    // function stays pure: React may run an updater twice in StrictMode.
    const todo = { id: crypto.randomUUID(), text, completed: false }
    setTodos((prev) => [...prev, todo])
    setNewText('')
  }

  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)),
    )
  }

  function deleteTodo(id) {
    setTodos((prev) => prev.filter((todo) => todo.id !== id))
  }

  function saveTodo(id, text) {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, text } : todo)))
  }

  function toggleAll(completed) {
    setTodos((prev) => prev.map((todo) => ({ ...todo, completed })))
  }

  function clearCompleted() {
    setTodos((prev) => prev.filter((todo) => !todo.completed))
  }

  return (
    <div>
      <h2>Todos</h2>

      <form onSubmit={addTodo}>
        <input
          aria-label="New todo"
          placeholder="What needs to be done?"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      {todos.length > 0 && (
        <label>
          <input
            type="checkbox"
            checked={allDone}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          Toggle all todos
        </label>
      )}

      <ul>
        {visibleTodos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onSave={saveTodo}
          />
        ))}
      </ul>

      {todos.length > 0 && (
        <footer>
          <span>{`${activeCount} ${activeCount === 1 ? 'item' : 'items'} left`}</span>

          <div role="group" aria-label="Filter todos">
            {FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {completedCount > 0 && (
            <button type="button" onClick={clearCompleted}>
              Clear completed
            </button>
          )}
        </footer>
      )}
    </div>
  )
}

function TodoItem({ todo, onToggle, onDelete, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.text)
  // A browser may fire "blur" while the input is being removed after Enter or
  // Escape. This flag makes sure we finish an edit only once, so a cancelled
  // edit can never be saved by that late blur.
  const finished = useRef(false)

  function startEditing() {
    setDraft(todo.text)
    finished.current = false
    setEditing(true)
  }

  function finishEditing(shouldSave) {
    if (finished.current) return
    finished.current = true
    if (shouldSave) {
      const text = draft.trim()
      if (text === '') onDelete(todo.id) // clearing the text means "delete it"
      else onSave(todo.id, text)
    }
    setEditing(false)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') finishEditing(true)
    else if (event.key === 'Escape') finishEditing(false)
  }

  return (
    <li>
      <input
        type="checkbox"
        aria-label={`Complete ${todo.text}`}
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />

      {editing ? (
        <input
          aria-label="Edit todo"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => finishEditing(true)}
        />
      ) : (
        <span
          onDoubleClick={startEditing}
          style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
        >
          {todo.text}
        </span>
      )}

      <button type="button" aria-label={`Delete ${todo.text}`} onClick={() => onDelete(todo.id)}>
        Delete
      </button>
    </li>
  )
}
