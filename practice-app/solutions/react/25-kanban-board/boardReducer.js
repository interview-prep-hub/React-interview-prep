// Reference solution for exercise 25: the pure reducer for the kanban board.
//
// State shape:
//   {
//     nextId: number,            // counter used to build unique card ids
//     columns: [
//       { id, title, limit?, cards: [{ id, text }] }
//     ]
//   }
//
// Key ideas:
// - The reducer is PURE: it never changes the old state, it returns a new
//   object. Only the pieces on the path to the change are copied; every other
//   column keeps its old object (this is called structural sharing).
// - "Nothing to do" cases return the SAME state object. React sees the same
//   reference and skips the re-render.
// - Card ids come from `nextId` (kept in the state) instead of Date.now() or
//   Math.random(), so the same state and action always give the same result.

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

// A column with a `limit` is full when it holds that many cards.
export function isColumnFull(column) {
  return column.limit !== undefined && column.cards.length >= column.limit
}

// Index of the column that holds the card, or -1.
function findColumnIndexOfCard(state, cardId) {
  return state.columns.findIndex((column) => column.cards.some((card) => card.id === cardId))
}

const DIRECTION_STEP = { left: -1, right: 1 }

export function boardReducer(state, action) {
  switch (action.type) {
    case 'add_card': {
      const text = action.text.trim()
      const column = state.columns.find((c) => c.id === action.columnId)
      if (!text || !column || isColumnFull(column)) return state

      const card = { id: `card-${state.nextId}`, text }
      return {
        ...state,
        nextId: state.nextId + 1,
        // Copy only the column that changes, reuse the others as they are.
        columns: state.columns.map((c) =>
          c === column ? { ...c, cards: [...c.cards, card] } : c,
        ),
      }
    }

    case 'delete_card': {
      const index = findColumnIndexOfCard(state, action.cardId)
      if (index === -1) return state

      return {
        ...state,
        columns: state.columns.map((c, i) =>
          i === index ? { ...c, cards: c.cards.filter((card) => card.id !== action.cardId) } : c,
        ),
      }
    }

    case 'move_card': {
      const from = findColumnIndexOfCard(state, action.cardId)
      const step = DIRECTION_STEP[action.direction]
      if (from === -1 || step === undefined) return state

      const to = from + step
      const target = state.columns[to]
      // Off the board, or the target column is at its limit: refuse the move.
      if (!target || isColumnFull(target)) return state

      const card = state.columns[from].cards.find((c) => c.id === action.cardId)
      return {
        ...state,
        columns: state.columns.map((c, i) => {
          if (i === from) return { ...c, cards: c.cards.filter((x) => x.id !== action.cardId) }
          if (i === to) return { ...c, cards: [...c.cards, card] }
          return c
        }),
      }
    }

    default:
      throw new Error(`Unknown action type: ${action.type}`)
  }
}
