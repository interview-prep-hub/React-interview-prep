import { useState } from 'react'
import { calculateWinner } from './logic.js'

// Reference solution for exercise 17.
// Key ideas:
// - ONE source of truth: `history` (an array of boards) and `step` (which board we look at)
// - everything else is DERIVED while rendering: current board, winner, draw, next player
// - a move never changes an old board, it adds a new copy (so time travel is free)

const boardStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 3rem)', gap: 4 }
const squareStyle = { width: '3rem', height: '3rem', fontSize: '1.5rem' }

function Square({ index, value, onClick }) {
  return (
    <button aria-label={`square ${index + 1}`} onClick={onClick} style={squareStyle}>
      {value}
    </button>
  )
}

export default function App() {
  // State: the only two values we store.
  const [history, setHistory] = useState([Array(9).fill(null)])
  const [step, setStep] = useState(0)

  // Derived values: computed on every render, so they can never get out of sync.
  const squares = history[step]
  const winner = calculateWinner(squares)
  const isDraw = !winner && squares.every(Boolean)
  const nextPlayer = step % 2 === 0 ? 'X' : 'O' // X plays on even steps

  function handleSquareClick(index) {
    if (squares[index] || winner) return // taken square or finished game: do nothing

    // Never mutate the old board: copy it, then change the copy.
    const nextSquares = squares.slice()
    nextSquares[index] = nextPlayer

    // Playing from the past: keep boards up to the current step, drop the rest.
    const nextHistory = [...history.slice(0, step + 1), nextSquares]
    setHistory(nextHistory)
    setStep(nextHistory.length - 1)
  }

  let status
  if (winner) status = `Winner: ${winner}`
  else if (isDraw) status = 'Draw'
  else status = `Next player: ${nextPlayer}`

  return (
    <div>
      <h2>Tic-tac-toe</h2>
      <p data-testid="status">{status}</p>

      <div role="group" aria-label="Board" style={boardStyle}>
        {squares.map((value, index) => (
          <Square
            key={index}
            index={index}
            value={value}
            onClick={() => handleSquareClick(index)}
          />
        ))}
      </div>

      <h3>History</h3>
      {/* start={0} makes the list numbers match the move numbers */}
      <ol aria-label="History" start={0}>
        {history.map((_board, move) => (
          // The index is a safe key here: the list only grows or is cut at the end.
          <li key={move}>
            {/* Jumping only changes `step`. The history itself is untouched. */}
            <button onClick={() => setStep(move)}>
              {move === 0 ? 'Go to game start' : `Go to move #${move}`}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
