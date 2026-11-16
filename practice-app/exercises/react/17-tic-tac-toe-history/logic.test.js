import { calculateWinner } from './logic.js'

// Build a board from a picture. Rows are separated by "/" and "." is an empty square.
// Example: fromText('XO./.X./...') is [X, O, null, null, X, null, null, null, null]
function fromText(text) {
  return text
    .replaceAll('/', '')
    .split('')
    .map((char) => (char === '.' ? null : char))
}

describe('17 calculateWinner (pure function)', () => {
  it('returns null for an empty board', () => {
    expect(calculateWinner(fromText('.../.../...'))).toBeNull()
  })

  it('returns null while nobody has three in a row', () => {
    expect(calculateWinner(fromText('XO./.X./O..'))).toBeNull()
  })

  it.each([
    ['top row', 'XXX/OO./...', 'X'],
    ['middle row', '.../OOO/XX.', 'O'],
    ['bottom row', 'OO./.../XXX', 'X'],
    ['left column', 'XO./XO./X..', 'X'],
    ['middle column', 'XO./XO./.OX', 'O'],
    ['right column', 'OOX/.OX/..X', 'X'],
    ['main diagonal', 'XO./OX./..X', 'X'],
    ['anti-diagonal', 'XXO/XO./O..', 'O'],
  ])('finds the winner in the %s', (_name, picture, expected) => {
    expect(calculateWinner(fromText(picture))).toBe(expected)
  })

  // The 8 winning lines as indexes: 0 1 2 / 3 4 5 / 6 7 8
  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6], // diagonals
  ]

  // A board with only the given squares filled with `mark`.
  function boardWith(mark, indexes) {
    const squares = Array(9).fill(null)
    indexes.forEach((i) => {
      squares[i] = mark
    })
    return squares
  }

  it.each(LINES)('finds the line %i-%i-%i for X and for O', (a, b, c) => {
    expect(calculateWinner(boardWith('X', [a, b, c]))).toBe('X')
    expect(calculateWinner(boardWith('O', [a, b, c]))).toBe('O')
  })

  it('does not count two matching squares in a line as a win', () => {
    for (const line of LINES) {
      for (const gap of line) {
        const pair = line.filter((i) => i !== gap)
        const gapEmpty = boardWith('X', pair)
        const gapTaken = boardWith('X', pair)
        gapTaken[gap] = 'O'
        expect(calculateWinner(gapEmpty), `line ${line} with an empty gap at ${gap}`).toBeNull()
        expect(calculateWinner(gapTaken), `line ${line} with an O in the gap at ${gap}`).toBeNull()
      }
    }
  })

  it('still returns the winner when the board is full', () => {
    expect(calculateWinner(fromText('XOO/OXX/XOX'))).toBe('X')
  })

  it('returns null for a full board with no line (a draw)', () => {
    expect(calculateWinner(fromText('XOX/XOO/OXX'))).toBeNull()
  })

  it('does not change the board it receives', () => {
    const squares = Object.freeze(fromText('XXX/OO./...'))
    expect(calculateWinner(squares)).toBe('X')
    expect(squares).toEqual(fromText('XXX/OO./...'))
  })
})
