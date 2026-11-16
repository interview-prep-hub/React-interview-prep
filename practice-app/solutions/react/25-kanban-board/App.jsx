import { useReducer, useState } from 'react'
import { boardReducer, initialBoard, isColumnFull } from './boardReducer.js'

// Reference solution for exercise 25: Kanban board.
// Key ideas:
// - ALL board data lives in one useReducer at the top (App). The children are
//   plain presentational components: they get data and callbacks as props.
// - Components are composed in layers: App -> Column -> Card, plus AddCardForm.
//   Each layer has one job.
// - The Add input text is a small UI draft, so it is local state inside
//   AddCardForm. It does not belong in the board reducer.
// - A card can move only if the neighbour column exists and is not full. App
//   works that out (it sees all columns) and passes plain booleans down.

function Card({ card, canMoveLeft, canMoveRight, onMove, onDelete }) {
  return (
    <li style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
      <span style={{ flex: 1 }}>{card.text}</span>
      <button type="button" disabled={!canMoveLeft} onClick={() => onMove(card.id, 'left')}>
        Move left
      </button>
      <button type="button" disabled={!canMoveRight} onClick={() => onMove(card.id, 'right')}>
        Move right
      </button>
      <button type="button" onClick={() => onDelete(card.id)}>
        Delete
      </button>
    </li>
  )
}

function AddCardForm({ disabled, onAdd }) {
  const [text, setText] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (disabled || !text.trim()) return
    onAdd(text)
    setText('')
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6 }}>
      <input
        aria-label="Add card"
        placeholder="New card"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <button type="submit" disabled={disabled}>
        Add card
      </button>
    </form>
  )
}

function Column({ column, canMoveLeft, canMoveRight, dispatch }) {
  const full = isColumnFull(column)

  return (
    <section aria-label={column.title} style={{ flex: 1, minWidth: 260 }}>
      <header style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <h3 style={{ margin: 0 }}>{column.title}</h3>
        <span data-testid="count">{column.cards.length}</span>
      </header>

      {full && <p role="status">{`${column.title} is full (max ${column.limit})`}</p>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {column.cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            canMoveLeft={canMoveLeft}
            canMoveRight={canMoveRight}
            onMove={(cardId, direction) => dispatch({ type: 'move_card', cardId, direction })}
            onDelete={(cardId) => dispatch({ type: 'delete_card', cardId })}
          />
        ))}
      </ul>

      <AddCardForm
        disabled={full}
        onAdd={(text) => dispatch({ type: 'add_card', columnId: column.id, text })}
      />
    </section>
  )
}

export default function App() {
  const [board, dispatch] = useReducer(boardReducer, initialBoard)
  const { columns } = board

  return (
    <div>
      <h2>Kanban board</h2>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {columns.map((column, index) => {
          const left = columns[index - 1]
          const right = columns[index + 1]
          return (
            <Column
              key={column.id}
              column={column}
              // A neighbour must exist and must have room.
              canMoveLeft={left !== undefined && !isColumnFull(left)}
              canMoveRight={right !== undefined && !isColumnFull(right)}
              dispatch={dispatch}
            />
          )
        })}
      </div>
    </div>
  )
}
