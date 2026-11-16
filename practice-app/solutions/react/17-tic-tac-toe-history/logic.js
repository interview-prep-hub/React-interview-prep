// Pure game logic for exercise 17. No React in this file, so it is easy to test.

// All 8 winning lines, as indexes into a board of 9 squares:
//   0 1 2
//   3 4 5
//   6 7 8
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6], // diagonals
]

// squares: an array of 9 items, each 'X', 'O' or null.
// Returns the mark that has three in a row ('X' or 'O'), or null.
// A full board with no line (a draw) also returns null.
export function calculateWinner(squares) {
  for (const [a, b, c] of LINES) {
    // The first check also rules out three empty (null) squares.
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a]
    }
  }
  return null
}
