# 17 - Tic-tac-toe with history

**Level:** Medium | **Time:** 40 minutes | **Topics:** state design, derived state, time travel

## The task

Build a game of tic-tac-toe with a move history. Players take turns, X first. Under the board there is a list of buttons, one per position in the game. Clicking a button jumps back (or forward) to that position, like a time machine. If you make a new move from an old position, the moves that came after it are thrown away.

The main lesson is **state design**. Store as little as possible: a list of boards and a number that says which board is on screen. Everything else (the winner, whose turn it is, a draw) is worked out while rendering.

You have two files to complete:

- [`App.jsx`](./App.jsx): the component. The default export is what gets rendered.
- [`logic.js`](./logic.js): the pure function `calculateWinner`. It has its own unit tests.

Do not edit the test files ([`App.test.jsx`](./App.test.jsx) and [`logic.test.js`](./logic.test.js)).

## Requirements

### The board and the status

1. Show a 3x3 board made of **nine `<button>` elements**. Their accessible names (set with `aria-label`) are `square 1` to `square 9`, numbered from the top-left, row by row:

   ```text
   square 1 | square 2 | square 3
   square 4 | square 5 | square 6
   square 7 | square 8 | square 9
   ```

   The buttons must appear in the page in this order (square 1 first, square 9 last), so that the board reads row by row. An empty square shows nothing. A taken square shows its mark, the text `X` or `O`.
2. **X always plays first**, then O, then X, and so on.
3. Clicking an **empty** square puts the current player's mark in it.
4. Clicking a **taken** square (one that holds an `X` or an `O`) does nothing: the mark is not replaced, the turn does not change, and no history entry is added.
5. Show a status line in an element with `data-testid="status"`. Its text is exactly one of these:
   - `Next player: X` or `Next player: O` while the game is still going.
   - `Winner: X` or `Winner: O` as soon as a player has three marks in a row (any of the 3 rows, 3 columns or 2 diagonals).
   - `Draw` when all nine squares are full and nobody has three in a row. It is only shown for a full board: if you jump back to a position with an empty square, the status is `Next player: ...` again.
6. If the move that fills the last square also makes three in a row, the status is `Winner: ...`, not `Draw`.
7. After someone has won, clicking any square does nothing (the board is frozen).

### The history

8. Render the history as an ordered list: `<ol aria-label="History">`. Each item holds one `<button>`.
9. The list has one button for every position in the game, in order:
   - the first button is labelled exactly `Go to game start` (the empty board),
   - then `Go to move #1`, `Go to move #2`, and so on.
   - After three moves the list shows 4 buttons: `Go to game start`, `Go to move #1`, `Go to move #2`, `Go to move #3`.
10. Clicking a history button shows the board as it was at that position. The status and the next player are then worked out from that position (for example, after jumping to move 2 it is X's turn again, even if O had played the move after it).
11. Jumping does **not** delete anything. After jumping back, the later buttons are still in the list, and you can jump forward again.
12. If you make a move while looking at an earlier position, the moves after that position are **discarded**: the new move becomes the next position, and the list ends with it. A click that does nothing (a taken square, or a finished game) must not discard anything either.
13. After jumping back from a finished game to an earlier position, the game is playable again. Jumping back to the winning position shows `Winner: ...` again.

### The pure function

14. In `logic.js`, export `calculateWinner(squares)`:
    - `squares` is an array of 9 items. Each item is `'X'`, `'O'` or `null` (empty).
    - It returns `'X'` or `'O'` if that mark fills one of the 8 winning lines, otherwise `null`. Two matching marks in a line are not a win, even if the third square of that line is empty.
    - A full board with no line (a draw) returns `null`. A full board where the last move made a line returns that mark.
    - It must not change the array it receives (the tests pass a frozen array).

### State design (not checked by the tests, but this is what an interviewer looks at)

15. Keep **one source of truth**: an array of boards (`history`) plus a number (`step`) that says which board is shown. Do not keep a separate `squares`, `winner`, `xIsNext` or `status` in state.
16. Compute the current board, the winner, the draw and the next player **during render** from `history` and `step`.

### Strict mode (checked by one test)

17. The component must work inside `<StrictMode>` (the playground wraps every exercise in it). In development React calls your state updater functions twice to catch impure code. So an updater such as `setHistory((h) => ...)` must only compute and return a new value. It must never change `h` or any other variable that lives outside the function.

## Acceptance criteria (what the tests check)

- At the start: nine empty squares in reading order (square 1 first, square 9 last), `Next player: X`, and a history with only `Go to game start`.
- X then O alternate, and the status follows. Clicking a taken square (an X or an O) changes nothing, including the history.
- X can win and O can win. Rows, columns and both diagonals are detected. After a win, clicks do nothing.
- A full board with no line shows `Draw`, but only the full board does (the position before it shows `Next player: X`). A winning last move shows `Winner: X`, not `Draw`.
- The history has one entry per move with the exact labels from requirement 9.
- Jumping back shows the earlier board and the right next player. The future entries stay in the list.
- Moving from an earlier position cuts off the future and uses the right player for that position, whether you jumped back an odd or an even number of moves. A square that was only filled in the discarded future is playable again.
- After playing from the past, the earlier positions still show their original boards.
- Clicking a taken square after jumping back does not discard the future.
- A finished game can be rewound and played on. Jumping to the winning move shows the winner again, and the board is frozen again there.
- The game plays correctly inside `<StrictMode>`.
- `calculateWinner` finds all 8 lines for X and O, does not treat two matching marks as a win, returns `null` for empty, unfinished and drawn boards, and does not change its input.

## How to run

```bash
npm test -- exercises/react/17-tic-tac-toe-history
```

To see your component in the browser, run `npm run dev` and pick `17-tic-tac-toe-history` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/17-tic-tac-toe-history
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Start with `logic.js`. It has no React in it, so it is the quickest win. Write the 8 winning lines as triples of indexes, for example `[0, 1, 2]` is the top row. A line wins when its three squares are equal and not empty.
2. In `App.jsx` you need two pieces of state: `history` (starts as `[Array(9).fill(null)]`, one empty board) and `step` (starts at `0`).
3. The board on screen is `history[step]`. It is **not** always the last board in the list, because the player may have jumped back.
4. Whose turn is it? X moves on even steps (0, 2, 4, ...) and O on odd steps. You do not need to store it.
5. Never change an old board. Copy it first (`squares.slice()` or `[...squares]`), then set the new mark on the copy.
6. To add a move from the current step: `history.slice(0, step + 1)` is "everything up to and including the board on screen". Add the new board after it, then set `step` to the index of the new board.
7. Jumping is just `setStep(move)`. Nothing is removed from `history` until the player makes a real move.
8. For the history buttons, map over `history`. The index of each board is the move number, and index `0` gets the special label.
9. The `status` is a normal variable built with `if / else if / else` before the `return`. It is not state.
10. If you use a functional update such as `setHistory((h) => ...)`, build a new array inside it (`slice`, spread) and never `push` into `h`. StrictMode runs the function twice, and a `push` would then add the move twice.

</details>

## Stretch goals

- Mark the button of the position you are looking at (for example bold text and `aria-current="step"`).
- Add a button that reverses the order of the history list. Keep the order in state, but do not reverse the data itself.
- Highlight the three winning squares. Let `calculateWinner` return the line as well, and update the unit tests.
- Show the row and column of each move next to its history button, for example `Go to move #3 (row 2, col 1)`.
- Add a "New game" button. Think about what the smallest state change is.
- Let the player choose a board size (3x3, 4x4) and the number in a row needed to win.

## Interview follow-ups to prepare for

- **Why is the winner not stored in state?** What bugs can appear when the same fact lives in two places? What would you have to do to keep a stored `winner` correct during time travel?
- **How would you add a computer opponent (a bot that plays O)?** Where does the computer's move happen: inside the click handler, or in an effect? How do you stop the human clicking while the computer "thinks"? How would you pick a move (random, then minimax) and keep that logic pure and testable?
- **Memoizing squares?** Would wrapping `Square` in `React.memo` help? What would break it (inline arrow functions as `onClick`)? How would you fix that, and how would you decide it is worth doing for only nine buttons?

## Learn the concepts first

- [Thinking in React](../../../../01-basics/08-thinking-in-react.md)
- [useState in depth](../../../../02-hooks/02-usestate-in-depth.md)
