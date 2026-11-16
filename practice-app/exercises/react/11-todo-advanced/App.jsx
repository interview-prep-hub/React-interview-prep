import { useEffect, useRef, useState } from 'react'

// Exercise 11: Todo list with filters, inline editing and localStorage.
// Read README.md in this folder for the full requirements.
//
// A todo looks like this: { id, text, completed }

const STORAGE_KEY = 'todos'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
]

// TODO 1: read the saved todos from localStorage and return them.
// Return an empty list when nothing is saved, when the JSON is broken,
// or when the saved value is not an array. This function must never throw.
function loadTodos() {
  return []
}

export default function App() {
  // TODO 2: initialise todos from loadTodos with LAZY initialisation,
  // so localStorage is read only once, on the first render.
  const [todos, setTodos] = useState([])
  const [filter, setFilter] = useState('all') // 'all' | 'active' | 'completed'
  const [newText, setNewText] = useState('')

  // TODO 3: save todos to localStorage in an effect, whenever they change.

  // TODO 4: derive these during render (do NOT put them in state):
  // the todos to show for the current filter, how many are active,
  // how many are completed, and whether every todo is completed.

  // TODO 5: write the handlers. Always create new arrays and objects:
  // addTodo, toggleTodo, deleteTodo, saveTodo (new text), toggleAll, clearCompleted.

  return (
    <div>
      <h2>Todos</h2>

      {/* TODO 6: make this form add a todo (trim the text, ignore empty text) */}
      <form>
        <input aria-label="New todo" placeholder="What needs to be done?" />
        <button type="submit">Add</button>
      </form>

      {/* TODO 7: the "Toggle all todos" checkbox (only when there is at least one todo) */}

      <ul>
        {/* TODO 8: render one <TodoItem /> per visible todo (give each a stable key) */}
      </ul>

      {/* TODO 9: footer, only when there is at least one todo:
          "N items left" text, the three filter buttons (aria-pressed),
          and the "Clear completed" button (only when something is completed) */}
    </div>
  )
}

function TodoItem({ todo }) {
  // TODO 10: local state for "am I being edited?" and for the draft text.
  // A ref can remember that the edit is already finished (see the README hints).
  const [editing, setEditing] = useState(false)

  // TODO 11: finish editing:
  //   Enter  -> save the trimmed text, or delete the todo when the text is empty
  //   Escape -> throw the draft away
  //   blur   -> same as Enter

  return (
    <li>
      {/* TODO 12: checkbox with aria-label "Complete <text>" */}

      {/* TODO 13: when editing show an input with aria-label "Edit todo",
          otherwise show the text in a <span> that starts editing on double click */}
      <span>{todo.text}</span>

      {/* TODO 14: Delete button with aria-label "Delete <text>" */}
    </li>
  )
}
