// Exercise 25: the pure reducer for the kanban board.
// Read README.md in this folder for the full requirements.
// Test this file on its own first:
//   npm test -- exercises/react/25-kanban-board/boardReducer
//
// State shape (the tests build their boards in exactly this shape):
//   {
//     nextId: number,            // counter used to build unique card ids
//     columns: [
//       { id, title, limit?, cards: [{ id, text }] }
//     ]
//   }

// Starter data for the app. Already done for you. Do not change it.
export const initialBoard = {
  nextId: 6,
  columns: [
    {
      id: 'todo',
      title: 'To do',
      cards: [
        { id: 'card-1', text: 'Write project brief' },
        { id: 'card-2', text: 'Design login page' },
        { id: 'card-3', text: 'Set up CI' },
      ],
    },
    {
      id: 'doing',
      title: 'Doing',
      limit: 3,
      cards: [{ id: 'card-4', text: 'Build API client' }],
    },
    {
      id: 'done',
      title: 'Done',
      cards: [{ id: 'card-5', text: 'Create repository' }],
    },
  ],
}

// Already done for you: a column with a `limit` is full when it holds that many cards.
// Use it in the reducer AND in the components.
export function isColumnFull(column) {
  return column.limit !== undefined && column.cards.length >= column.limit
}

export function boardReducer(state, action) {
  // The reducer must be PURE: never change `state` in place, return a new object.
  // When there is nothing to do, return the SAME `state` object.
  switch (action.type) {
    case 'add_card': {
      // TODO 1: { type: 'add_card', columnId, text }
      //   - trim the text; ignore blank text, an unknown column or a full column
      //   - build the card id from state.nextId (for example `card-${state.nextId}`)
      //   - append the card to the END of that column and increase nextId by 1
      return state
    }

    case 'delete_card': {
      // TODO 2: { type: 'delete_card', cardId }
      //   - the card can be in any column, find it
      //   - remove it; an unknown id changes nothing
      return state
    }

    case 'move_card': {
      // TODO 3: { type: 'move_card', cardId, direction } where direction is 'left' or 'right'
      //   - find the column that holds the card and the neighbour in that direction
      //   - no neighbour (edge of the board) or a full neighbour: change nothing
      //   - otherwise remove the card from its column and append it to the END
      //     of the neighbour column
      return state
    }

    // TODO 4: throw an Error for an action type you do not know
    default:
      return state
  }
}
