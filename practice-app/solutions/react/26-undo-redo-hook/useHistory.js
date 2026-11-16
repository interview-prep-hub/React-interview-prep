import { useCallback, useReducer, useState } from 'react'

// Reference solution for exercise 26: a generic undo/redo hook.
//
// Key ideas:
// - The state is ONE object: { past, present, future }.
//   Three separate useState calls could get out of sync. One reducer cannot.
// - The reducer is a pure function. It never changes the old state, it returns a new one.
//   Returning the SAME state object means "nothing changed", and React skips the render.
// - Updater functions are run INSIDE the reducer, so they always see the latest state.
//   That is why calling set() twice in one event works (each call builds on the last).
// - The wrappers around dispatch are stable, so they are safe in dependency arrays.

function createHistory(value) {
  return { past: [], present: value, future: [] }
}

function reducer(state, action) {
  switch (action.type) {
    case 'set': {
      const next =
        typeof action.value === 'function' ? action.value(state.present) : action.value

      // Same value (Object.is): do nothing at all. The redo stack is kept too.
      if (Object.is(next, state.present)) return state

      // Keep only the newest `limit` past states. Math.max(0, ...) matters:
      // slice(-0) would copy everything, but we want an empty array when limit is 0.
      const past = [...state.past, state.present]
      return {
        past: past.slice(Math.max(0, past.length - action.limit)),
        present: next,
        future: [], // a new change makes the old "redo" branch impossible
      }
    }

    case 'undo': {
      if (state.past.length === 0) return state
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      }
    }

    case 'redo': {
      if (state.future.length === 0) return state
      const [next, ...rest] = state.future
      return {
        past: [...state.past, state.present],
        present: next,
        future: rest,
      }
    }

    case 'reset':
      return createHistory(action.value)

    default:
      return state
  }
}

export function useHistory(initialValue, { limit = 100 } = {}) {
  // Remember the FIRST initialValue, so reset() can go back to it.
  // Later values are ignored, exactly like useState ignores its argument after mount.
  const [initial] = useState(initialValue)

  const [state, dispatch] = useReducer(reducer, initial, createHistory)

  const set = useCallback(
    (valueOrUpdater) => dispatch({ type: 'set', value: valueOrUpdater, limit }),
    [limit],
  )
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])
  const reset = useCallback(
    (value) => dispatch({ type: 'reset', value: value === undefined ? initial : value }),
    [initial],
  )

  return {
    state: state.present,
    set,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    reset,
    history: { past: state.past, future: state.future },
  }
}
