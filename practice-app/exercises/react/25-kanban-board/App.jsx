import { useReducer, useState } from 'react'
import { boardReducer, initialBoard, isColumnFull } from './boardReducer.js'

// Exercise 25: Kanban board.
// Read README.md in this folder for the full requirements.
// Suggested order:
//   1. boardReducer.js  (pure logic, has its own tests in boardReducer.test.js)
//   2. Card             (one card and its three buttons)
//   3. AddCardForm      (the draft text and the submit)
//   4. Column           (header, full message, the cards, the form)
//   5. App              (useReducer, one Column for every column in the state)
// Keep all board data in the reducer. The components below only show data and
// call the functions they get as props.

function Card({ card }) {
  // TODO 1: also receive canMoveLeft, canMoveRight, onMove and onDelete as props
  return (
    <li>
      {/* TODO 2: show card.text, then the buttons "Move left", "Move right" and "Delete".
          Move left / Move right are disabled when canMoveLeft / canMoveRight is false. */}
    </li>
  )
}

function AddCardForm() {
  // TODO 3: the text typed so far is a UI draft: keep it in local state here.
  //         Receive "disabled" and "onAdd" as props.
  //         On submit: prevent the page reload, ignore blank text, call onAdd(text), clear the input.
  return (
    <form style={{ display: 'flex', gap: 6 }}>
      <input aria-label="Add card" placeholder="New card" />
      <button type="submit">Add card</button>
    </form>
  )
}

function Column({ column }) {
  // TODO 4: also receive canMoveLeft, canMoveRight and dispatch as props.
  //         Is this column full? (see isColumnFull in boardReducer.js)
  return (
    <section aria-label={column.title} style={{ flex: 1, minWidth: 260 }}>
      <header style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <h3 style={{ margin: 0 }}>{column.title}</h3>
        {/* TODO 5: show the real number of cards */}
        <span data-testid="count">0</span>
      </header>

      {/* TODO 6: when the column is full, show <p role="status"> with the text
          "<title> is full (max <limit>)", for example "Doing is full (max 3)" */}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {/* TODO 7: one <Card> for every card in the column (use card.id as the key).
            onMove and onDelete should dispatch actions to the reducer. */}
      </ul>

      {/* TODO 8: pass disabled (when the column is full) and onAdd (dispatch add_card) */}
      <AddCardForm />
    </section>
  )
}

export default function App() {
  // TODO 9: const [board, dispatch] = useReducer(boardReducer, initialBoard)
  //         and use board.columns below instead of initialBoard.columns.
  //         Keep importing initialBoard from './boardReducer.js': one test file
  //         replaces it with other data, so do not hard-code names or limits here.
  const columns = initialBoard.columns

  return (
    <div>
      <h2>Kanban board</h2>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {columns.map((column) => (
          // TODO 10: tell each Column if a card in it may move left or right.
          //          It may only if that neighbour column exists and is not full.
          <Column key={column.id} column={column} />
        ))}
      </div>
    </div>
  )
}
