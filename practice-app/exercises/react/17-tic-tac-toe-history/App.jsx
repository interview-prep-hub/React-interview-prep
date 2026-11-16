import { useState } from 'react'
import { calculateWinner } from './logic.js'

// Exercise 17: Tic-tac-toe with history (time travel).
// Read README.md in this folder for the full requirements.
// Also finish calculateWinner in logic.js (its tests are in logic.test.js).

const boardStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 3rem)', gap: 4 }
const squareStyle = { width: '3rem', height: '3rem', fontSize: '1.5rem' }

// One square. It only shows the value it is given and reports clicks.
function Square({ index, value, onClick }) {
  return (
    <button aria-label={`square ${index + 1}`} onClick={onClick} style={squareStyle}>
      {value}
    </button>
  )
}

export default function App() {
  // TODO 1: keep the whole game in state. Two pieces are enough:
  //   - history: an array of boards (a board is an array of 9 items: null, 'X' or 'O')
  //   - step: the index in history of the board that is on screen

  // TODO 2: compute these DURING RENDER from the state above. Do not store them:
  //   - squares: the board at the current step
  //   - winner (use calculateWinner), draw or not, and who plays next
  const squares = Array(9).fill(null) // placeholder: replace with the board at the current step

  function handleSquareClick(index) {
    // TODO 3: do nothing if this square is taken or the game is already won
    // TODO 4: make a NEW board (never change the old one), drop any boards after the
    //         current step, add the new board, and move the step to it
  }

  function jumpTo(move) {
    // TODO 5: show the board at step `move`. Do not delete anything from history.
  }

  return (
    <div>
      <h2>Tic-tac-toe</h2>
      {/* TODO 6: replace this placeholder with the real status text (see README) */}
      <p data-testid="status">Status goes here</p>

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
      <ol aria-label="History">
        {/* TODO 7: one <li> with one button per board in history, wired to jumpTo */}
      </ol>
    </div>
  )
}
