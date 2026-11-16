import { StrictMode } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

// Many tests click up to nine squares and look elements up by role, which is slow on a busy or
// old machine. Give every test more room than the default 5 seconds so they never time out.
vi.setConfig({ testTimeout: 15000 })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const square = (n) => screen.getByRole('button', { name: `square ${n}` })

// The board as a picture: rows separated by "/", empty squares shown as ".".
// Example: "XO./.X./..." means X on squares 1 and 5, O on square 2.
// The squares are read in page order (the first test checks that this is square 1 to 9).
function board() {
  const marks = screen
    .getAllByRole('button', { name: /^square \d$/ })
    .map((button) => button.textContent.trim() || '.')
  const rows = [marks.slice(0, 3), marks.slice(3, 6), marks.slice(6, 9)]
  return rows.map((row) => row.join('')).join('/')
}

const status = () => screen.getByTestId('status')

// The texts of the buttons inside the history list, in order.
function historyLabels() {
  return within(screen.getByRole('list', { name: 'History' }))
    .getAllByRole('button')
    .map((button) => button.textContent)
}

// Click the given squares in order (numbers 1 to 9).
async function play(user, ...squares) {
  for (const n of squares) {
    await user.click(square(n))
  }
}

const goTo = (user, label) => user.click(screen.getByRole('button', { name: label }))

// Move sequences (square numbers). X always moves first.
const X_WINS_TOP_ROW = [1, 4, 2, 5, 3] // X: 1 2 3, O: 4 5
const O_WINS_MIDDLE_ROW = [1, 4, 2, 5, 9, 6] // X: 1 2 9, O: 4 5 6
const DRAW = [1, 2, 3, 5, 4, 6, 8, 7, 9] // full board, nobody has a line
const X_WINS_ON_LAST_MOVE = [1, 2, 5, 3, 6, 4, 7, 8, 9] // X completes 1-5-9 with the 9th move

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('17 Tic-tac-toe with history', () => {
  describe('playing the game', () => {
    it('starts with an empty board, X to move and only the start entry in the history', () => {
      render(<App />)
      const squares = screen.getAllByRole('button', { name: /^square \d$/ })
      expect(squares).toHaveLength(9)
      // The buttons are in reading order: square 1 first (top-left), square 9 last (bottom-right).
      squares.forEach((button, i) => expect(button).toHaveAccessibleName(`square ${i + 1}`))
      expect(board()).toBe('.../.../...')
      expect(status()).toHaveTextContent(/^Next player: X$/)
      expect(historyLabels()).toEqual(['Go to game start'])
    })

    it('places X first, then O, and updates the status after every move', async () => {
      const user = userEvent.setup()
      render(<App />)

      await play(user, 5)
      expect(board()).toBe('.../.X./...')
      expect(status()).toHaveTextContent(/^Next player: O$/)

      await play(user, 1)
      expect(board()).toBe('O../.X./...')
      expect(status()).toHaveTextContent(/^Next player: X$/)
    })

    it('ignores a click on an occupied square (no overwrite, no turn change, no history entry)', async () => {
      const user = userEvent.setup()
      render(<App />)

      await play(user, 1, 1)

      expect(board()).toBe('X../.../...')
      expect(status()).toHaveTextContent(/^Next player: O$/)
      expect(historyLabels()).toEqual(['Go to game start', 'Go to move #1'])
    })

    it('keeps both X and O squares when they are clicked again', async () => {
      const user = userEvent.setup()
      render(<App />)

      await play(user, 1, 2) // X on 1, O on 2
      await play(user, 2, 1) // click the O square and the X square again

      expect(board()).toBe('XO./.../...')
      expect(status()).toHaveTextContent(/^Next player: X$/)
      expect(historyLabels()).toEqual(['Go to game start', 'Go to move #1', 'Go to move #2'])
    })

    it('announces X as the winner when X gets three in a row', async () => {
      const user = userEvent.setup()
      render(<App />)

      await play(user, ...X_WINS_TOP_ROW)

      expect(board()).toBe('XXX/OO./...')
      expect(status()).toHaveTextContent(/^Winner: X$/)
    })

    it('announces O as the winner when O gets three in a row', async () => {
      const user = userEvent.setup()
      render(<App />)

      await play(user, ...O_WINS_MIDDLE_ROW)

      expect(board()).toBe('XX./OOO/..X')
      expect(status()).toHaveTextContent(/^Winner: O$/)
    })

    it.each([
      ['a column', [3, 1, 6, 2, 9]],
      ['the main diagonal', [1, 2, 5, 3, 9]],
      ['the anti-diagonal', [3, 1, 5, 2, 7]],
    ])('detects a win on %s', async (_name, moves) => {
      const user = userEvent.setup()
      render(<App />)

      await play(user, ...moves)

      expect(status()).toHaveTextContent(/^Winner: X$/)
    })

    it('ignores every click after the game is won', async () => {
      const user = userEvent.setup()
      render(<App />)
      await play(user, ...X_WINS_TOP_ROW)

      await play(user, 9, 6)

      expect(board()).toBe('XXX/OO./...')
      expect(status()).toHaveTextContent(/^Winner: X$/)
      expect(historyLabels()).toHaveLength(6) // start + 5 moves, nothing added
    })

    it('announces a draw when the board is full and nobody has won', async () => {
      const user = userEvent.setup()
      render(<App />)

      await play(user, ...DRAW)

      expect(board()).toBe('XOX/XOO/OXX')
      expect(status()).toHaveTextContent(/^Draw$/)
    })

    it('shows the draw only on the full board and follows time travel', async () => {
      const user = userEvent.setup()
      render(<App />)
      await play(user, ...DRAW)

      await goTo(user, 'Go to move #8') // one square is still empty here
      expect(board()).toBe('XOX/XOO/OX.')
      expect(status()).toHaveTextContent(/^Next player: X$/)

      await goTo(user, 'Go to move #9')
      expect(board()).toBe('XOX/XOO/OXX')
      expect(status()).toHaveTextContent(/^Draw$/)
    })

    it('shows the winner, not a draw, when the last move completes a line', async () => {
      const user = userEvent.setup()
      render(<App />)

      await play(user, ...X_WINS_ON_LAST_MOVE)

      expect(board()).toBe('XOO/OXX/XOX')
      expect(status()).toHaveTextContent(/^Winner: X$/)
    })
  })

  describe('history and time travel', () => {
    it('adds one history entry per move, labelled by move number', async () => {
      const user = userEvent.setup()
      render(<App />)

      await play(user, 5, 1, 9)

      expect(historyLabels()).toEqual([
        'Go to game start',
        'Go to move #1',
        'Go to move #2',
        'Go to move #3',
      ])
    })

    it('jumps back to an earlier position and shows the right player to move', async () => {
      const user = userEvent.setup()
      render(<App />)
      await play(user, 1, 2, 3)

      await goTo(user, 'Go to move #1')
      expect(board()).toBe('X../.../...')
      expect(status()).toHaveTextContent(/^Next player: O$/)

      await goTo(user, 'Go to game start')
      expect(board()).toBe('.../.../...')
      expect(status()).toHaveTextContent(/^Next player: X$/)
    })

    it('keeps the future in the list after jumping back, so you can jump forward again', async () => {
      const user = userEvent.setup()
      render(<App />)
      await play(user, 1, 2, 3)

      await goTo(user, 'Go to move #1')
      expect(historyLabels()).toHaveLength(4)

      await goTo(user, 'Go to move #3')
      expect(board()).toBe('XOX/.../...')
      expect(status()).toHaveTextContent(/^Next player: O$/)
    })

    it('does not discard the future when you click an occupied square of an earlier position', async () => {
      const user = userEvent.setup()
      render(<App />)
      await play(user, 1, 2, 3)
      await goTo(user, 'Go to move #1')

      await play(user, 1)

      expect(board()).toBe('X../.../...')
      expect(historyLabels()).toHaveLength(4)
    })

    it('playing from an earlier position discards the future', async () => {
      const user = userEvent.setup()
      render(<App />)
      await play(user, 1, 2, 3)
      await goTo(user, 'Go to move #1')

      // Square 3 is empty at move 1 (it only held an X in the discarded future).
      await play(user, 3)

      expect(board()).toBe('X.O/.../...')
      expect(status()).toHaveTextContent(/^Next player: X$/)
      expect(historyLabels()).toEqual(['Go to game start', 'Go to move #1', 'Go to move #2'])
    })

    // Four moves are played first (X on 1, O on 2, X on 3, O on 4). Then we jump to a position
    // and click square 9. The mark must depend on the position we jumped to, not on the last move.
    it.each([
      ['Go to game start', '.../.../..X', 'O', 2],
      ['Go to move #1', 'X../.../..O', 'X', 3],
      ['Go to move #2', 'XO./.../..X', 'O', 4],
      ['Go to move #3', 'XOX/.../..O', 'X', 5],
      ['Go to move #4', 'XOX/O../..X', 'O', 6],
    ])(
      'decides the player from the position you jumped to (%s)',
      async (label, expectedBoard, expectedNext, expectedEntries) => {
        const user = userEvent.setup()
        render(<App />)
        await play(user, 1, 2, 3, 4)

        await goTo(user, label)
        await play(user, 9)

        expect(board()).toBe(expectedBoard)
        expect(status()).toHaveTextContent(new RegExp(`^Next player: ${expectedNext}$`))
        expect(historyLabels()).toHaveLength(expectedEntries)
      },
    )

    it('keeps the earlier boards unchanged after playing from the past', async () => {
      const user = userEvent.setup()
      render(<App />)
      await play(user, 1, 2, 3)
      await goTo(user, 'Go to move #1')
      await play(user, 3) // a new line of play: O on square 3

      await goTo(user, 'Go to move #1')
      expect(board()).toBe('X../.../...')
      await goTo(user, 'Go to game start')
      expect(board()).toBe('.../.../...')
      await goTo(user, 'Go to move #2')
      expect(board()).toBe('X.O/.../...')
    })

    it('lets you play again after jumping back from a finished game', async () => {
      const user = userEvent.setup()
      render(<App />)
      await play(user, ...X_WINS_TOP_ROW)

      await goTo(user, 'Go to move #3') // X on 1 and 2, O on 4
      expect(board()).toBe('XX./O../...')
      expect(status()).toHaveTextContent(/^Next player: O$/)

      await play(user, 5)

      expect(board()).toBe('XX./OO./...')
      expect(status()).toHaveTextContent(/^Next player: X$/)
      expect(historyLabels()).toHaveLength(5) // start + 4 moves, the old win is gone
    })

    it('shows the winner again when you jump back to the winning move', async () => {
      const user = userEvent.setup()
      render(<App />)
      await play(user, ...X_WINS_TOP_ROW)
      await goTo(user, 'Go to move #3')

      await goTo(user, 'Go to move #5')

      expect(board()).toBe('XXX/OO./...')
      expect(status()).toHaveTextContent(/^Winner: X$/)

      await play(user, 9) // the board is frozen again at the winning position
      expect(board()).toBe('XXX/OO./...')
      expect(historyLabels()).toHaveLength(6)
    })

    it('works inside StrictMode (state updates must be pure)', async () => {
      const user = userEvent.setup()
      render(
        <StrictMode>
          <App />
        </StrictMode>,
      )

      await play(user, 1, 2, 3)
      expect(board()).toBe('XOX/.../...')
      expect(historyLabels()).toHaveLength(4)

      await goTo(user, 'Go to move #1')
      await play(user, 3)
      expect(board()).toBe('X.O/.../...')
      expect(historyLabels()).toEqual(['Go to game start', 'Go to move #1', 'Go to move #2'])
    })

    it('can start a new line of play from the game start', async () => {
      const user = userEvent.setup()
      render(<App />)
      await play(user, 1, 2, 3)

      await goTo(user, 'Go to game start')
      await play(user, 5)

      expect(board()).toBe('.../.X./...')
      expect(status()).toHaveTextContent(/^Next player: O$/)
      expect(historyLabels()).toEqual(['Go to game start', 'Go to move #1'])
    })
  })
})
