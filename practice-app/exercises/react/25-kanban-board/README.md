# 25 - Kanban board

**Level:** Hard | **Time:** 60 minutes | **Topics:** `useReducer`, pure reducers, immutable nested updates, component composition

## The task

Build a small kanban board with three columns: **To do**, **Doing** and **Done**. Cards can be added, deleted and moved one column to the left or right. The **Doing** column has a work-in-progress (WIP) limit: it may hold at most 3 cards.

All board data lives in ONE `useReducer`. The reducer is a pure function in its own file, `boardReducer.js`, with its own unit tests. The screen is built from small components that only show data and call functions they receive as props.

You work in two files:

- [`boardReducer.js`](./boardReducer.js) : the pure logic (start here)
- [`App.jsx`](./App.jsx) : the screen

Do not edit the test files ([`boardReducer.test.js`](./boardReducer.test.js), [`App.test.jsx`](./App.test.jsx) and [`App.customBoard.test.jsx`](./App.customBoard.test.jsx)).

## Requirements

### Part A: the reducer (`boardReducer.js`)

1. The state has exactly this shape (the tests build their boards in this shape):

   ```js
   {
     nextId: 6, // a counter, used to create unique card ids
     columns: [
       { id: 'todo', title: 'To do', cards: [{ id: 'card-1', text: 'Write project brief' }] },
       { id: 'doing', title: 'Doing', limit: 3, cards: [] },
       { id: 'done', title: 'Done', cards: [] },
     ],
   }
   ```

   `limit` is optional. A column without a `limit` can hold any number of cards. `initialBoard` (the starter data) and the helper `isColumnFull(column)` are already written for you in the starter file. Do not change them.

2. `boardReducer(state, action)` handles three actions. Every action is a plain object.

   | Action | Meaning |
   | --- | --- |
   | `{ type: 'add_card', columnId, text }` | Add a card to the end of that column |
   | `{ type: 'delete_card', cardId }` | Remove that card (it can be in any column) |
   | `{ type: 'move_card', cardId, direction }` | Move the card one column to `'left'` or `'right'` |

3. `add_card`:
   - The text is trimmed (`'  Ship it  '` becomes `'Ship it'`).
   - Blank text (empty or only spaces), an unknown `columnId`, or a column that is full: nothing changes.
   - Otherwise a new card `{ id, text }` is appended to the END of the column. The `id` must be a string that is unique among all cards, also after cards were deleted. Build it from `state.nextId` (for example `` `card-${state.nextId}` ``) and increase `nextId` by 1. Do not use `Date.now()`, `Math.random()` or the number of cards, because a reducer must be pure.

4. `delete_card`: removes the card from whichever column holds it. An unknown id changes nothing.

5. `move_card`:
   - The card leaves its column and is appended to the END of the neighbour column in that direction.
   - Nothing changes when there is no neighbour (a card in the first column cannot go left, a card in the last column cannot go right), when the card does not exist, or when the neighbour column is full.
   - Moving OUT of a full column is always allowed.

6. The reducer must be pure and immutable:
   - Never change the old state, a column, a cards array or a card in place. The tests pass in a deeply frozen state, so any in-place change throws an error.
   - When nothing changes, return the SAME `state` object (the same reference, not a copy).
   - When something changes, only copy what is on the path to the change. Columns that were not involved must stay the very same objects (`next.columns[2] === state.columns[2]`).
   - Everything an action does not change stays as it was: only `add_card` changes `nextId`, and every column keeps its `id`, `title` and `limit`.
   - The same state and the same action always give the same result (no clock, no randomness).
   - An action with an unknown `type` throws an `Error`.

### Part B: the screen (`App.jsx`)

7. `App` is the default export and takes no props. It keeps the board in one `useReducer(boardReducer, initialBoard)` and renders one column for each entry in `board.columns`, in order. Import `initialBoard` from `./boardReducer.js`: one of the test files swaps it for a different board (other titles, four columns, other limits) to check that nothing is hard-coded. So in the logic of `App.jsx` never hard-code the names `To do`, `Doing` or `Done`, the limit `3`, the column ids or the number of columns: read them from the data.

8. Compose the screen from components: `App` renders `Column`, `Column` renders `Card` and a small form. Components below `App` receive data and callbacks as props. They do not read the reducer themselves. The only extra state allowed is the text typed in an Add input (a small UI draft, it can be local state in the form component).

9. Each column is a `<section>` with an `aria-label` equal to the column title (`To do`, `Doing`, `Done`), so it is a region that tests can find by name. The header contains the title in a heading (for example `<h3>`) and the number of cards in the column in an element with `data-testid="count"`. That element contains only the number, for example `3`.

10. The cards of a column are `<li>` elements in a `<ul>`. A card shows its text and has three buttons with exactly these names: **Move left**, **Move right** and **Delete**.

11. **Move left** is disabled when there is no column to the left, or when the column to the left is full. **Move right** is disabled when there is no column to the right, or when the column to the right is full. Clicking an enabled button dispatches `move_card`. **Delete** dispatches `delete_card`.

12. Each column has a `<form>` with:
    - a text input whose accessible name is **Add card** (use `aria-label="Add card"`), and
    - a submit button whose text is **Add card**.

    Submitting the form (clicking the button, or pressing Enter in the input) adds a card with that text to THAT column. After a card was added, the input is empty again. Blank text adds nothing. Every column keeps its own draft text. Submitting must not reload the page (call `event.preventDefault()` in the submit handler).

13. WIP limit. The starter data gives **Doing** a `limit` of 3. While a column is full:
    - the column shows a message in a `<p role="status">` with the text `<title> is full (max <limit>)`, so for Doing exactly: `Doing is full (max 3)`. Build the text from the column data, do not hard-code "Doing";
    - the **Add card** button of that column is disabled;
    - because of requirement 11, **Move right** on the cards of To do and **Move left** on the cards of Done are disabled.

    Cards can still leave a full column (move, or delete). As soon as the column is no longer full, the message disappears and the buttons are enabled again. When the column is not full, no `role="status"` element is shown.

14. The starter data is: To do has *Write project brief*, *Design login page*, *Set up CI*. Doing has *Build API client*. Done has *Create repository*.

## Acceptance criteria (what the tests check)

`boardReducer.test.js` (unit tests, no React):

- `add_card` appends a trimmed card to the right column, keeps ids unique (also after a delete), ignores blank text and unknown columns, and refuses a full column.
- `delete_card` removes only the right card and ignores unknown ids.
- `move_card` moves a card left or right to the end of the neighbour column, does nothing at the edges, blocks a move into a full column, and allows a move out of a full column.
- The limit of each column is used (not a fixed number), and a column without a `limit` is never full.
- The old state is never changed, untouched columns keep their identity, and no-op actions return the same state object.
- `nextId` grows by 1 on `add_card` only, columns keep their `id`, `title` and `limit`, and the same state and action always give the same result.
- An unknown action type throws.

`App.test.jsx` (user behaviour, with the starter board):

- Three regions named To do, Doing and Done, in that order, each with a heading, a list, the starter cards and the right count.
- Every card has Move left, Move right and Delete. Move left is disabled in To do, Move right is disabled in Done.
- Moving a card to the right or left puts it at the end of the other column and updates both counts. A card can travel across all columns and back.
- Delete removes a card and lowers the count.
- Add card works with the button and with Enter, clears the input, ignores blank text, does not reload the page, and each column has its own draft text.
- When Doing has 3 cards, the message `Doing is full (max 3)` shows, moves into Doing and adding to Doing are disabled, and moving out or deleting a card re-opens the column (and the `role="status"` element is gone).

`App.customBoard.test.jsx` (the same screen, with a different board):

- The columns, their order, their titles and their counts come from the data (four columns: Backlog, Review, QA, Shipped).
- The full message is built from the title and the limit of the column (`Backlog is full (max 2)`, `QA is full (max 1)`), and only for columns that are full.
- Move and Add buttons depend on the neighbour columns and on the limit of the column itself, also for the first and the last column.

## How to run

```bash
npm test -- exercises/react/25-kanban-board
```

Work on the reducer first, with only its tests:

```bash
npm test -- exercises/react/25-kanban-board/boardReducer
```

To see your component in the browser, run `npm run dev` and pick `25-kanban-board` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/25-kanban-board
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Do the reducer first and get `boardReducer.test.js` green. The screen is much easier when the logic already works.
2. Write one small helper that returns the index of the column holding a card id: `state.columns.findIndex(c => c.cards.some(card => card.id === cardId))`. You need it in both `delete_card` and `move_card`.
3. A "nested update" means you copy every level on the way down: the state, the `columns` array, the one column that changes, and its `cards` array. Use `map` over `columns` and return the other columns untouched (`c`), so they keep their identity.
4. Use `filter` to remove a card, `[...cards, card]` to append one. Never use `push`, `splice` or assignment on state.
5. For `move_card`: compute the target index as `from + (direction === 'left' ? -1 : 1)`. Then `state.columns[target]` is `undefined` at the edges, and you can check `isColumnFull(target)`. Find the card object BEFORE you remove it.
6. In the screen, `App` can compute `canMoveLeft` and `canMoveRight` for each column from its neighbours (`columns[index - 1]` and `columns[index + 1]`) and pass plain booleans down.
7. For the form: `onSubmit` must call `event.preventDefault()`. Keep the input controlled (`value` and `onChange`) with local state, and clear it after you called `onAdd`.
8. A one-column version of the nested update, to adapt:

   ```js
   columns: state.columns.map((c) => (c.id === columnId ? { ...c, cards: [...c.cards, card] } : c))
   ```

</details>

## Stretch goals

- Drag and drop with the plain HTML5 API (not tested): set `draggable` on a card, store the card id in `onDragStart` (`event.dataTransfer.setData`), call `event.preventDefault()` in the column's `onDragOver`, and handle `onDrop`. You will need a new action such as `move_card_to` with a target column id, and it must respect the WIP limit too.
- Persist the board in `localStorage` (read it with a lazy initializer for `useReducer`, write it in an effect).
- Edit a card's text by double-clicking it (a new `edit_card` action).
- Show the limit next to the count, for example `2/3`, only for columns that have a `limit`.
- Make the button names unique for screen readers, for example "Move Set up CI right", using visually hidden text. Think about how that changes the way the tests find buttons.

## Interview follow-ups to prepare for

- **How would you add drag and drop, and would you use the HTML5 drag and drop API or a library?** A strong answer compares the built-in API (no dependency, but weak touch support, no keyboard support, clumsy drop-position and animation handling) with a library such as dnd-kit (sensors for mouse, touch and keyboard, accessibility announcements, sortable lists). It also says that the reducer stays the single source of truth: dragging only dispatches a `move_card_to` style action on drop.
- **How would you make this work with a server using optimistic updates?** A strong answer applies the change to local state immediately, sends the request in the background, and rolls back (or reconciles) when the request fails. Talk about keeping the previous state to revert to, temporary client ids that get replaced by server ids, requests that finish out of order, and the React 19 `useOptimistic` hook.
- **Why and how would you normalise this state (`byId` and `ids`)?** A strong answer shows the flat shape (`cardsById`, and each column holding an array of `cardIds`), explains that a move then only touches two small id arrays instead of rebuilding nested arrays, that lookups by id are cheap, and that duplicated data cannot get out of sync. It also names the cost: more bookkeeping when you read the data back into a tree.

## Learn the concepts first

- [useReducer](../../../../02-hooks/06-usereducer.md)
- [Component patterns](../../../../03-intermediate/01-component-patterns.md)
