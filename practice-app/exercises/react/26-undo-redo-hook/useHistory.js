import { useCallback, useReducer, useState } from 'react'

// Exercise 26: a generic undo/redo hook.
// Read README.md in this folder for the full requirements.
// Its tests are in useHistory.test.js (the App tests are in App.test.jsx).
//
// Suggested plan (only the behaviour is tested, so you may design it differently):
//   - keep ONE state object { past, present, future } so the three parts always change together
//   - write a pure reducer for four actions: set, undo, redo, reset
//   - give the caller small functions that dispatch those actions

// TODO 1: write the reducer. It must never change the old state, it returns a new one.
function reducer(state, action) {
  switch (action.type) {
    case 'set':
      // TODO 2: work out the next value (the action may carry a plain value OR an updater function).
      //         If it is Object.is-equal to the present, return `state` itself (nothing changes).
      //         Otherwise: push the present onto `past`, keep only the newest `limit` past states,
      //         make the next value the present, and empty `future`.
      return state
    case 'undo':
      // TODO 3: nothing to undo? return `state`. Otherwise move the present to the FRONT of
      //         `future` and take the last item of `past` as the new present.
      return state
    case 'redo':
      // TODO 4: the mirror image of undo.
      return state
    case 'reset':
      // TODO 5: past and future become empty; the present becomes the value in the action.
      return state
    default:
      return state
  }
}

export function useHistory(initialValue, { limit = 100 } = {}) {
  // TODO 6: store the history with useReducer. Also remember the FIRST initialValue,
  //         so reset() with no argument can go back to it.

  // TODO 7: create set, undo, redo and reset. They should keep the same identity between renders.

  // TODO 8: return the real values. This placeholder only has the right shape.
  return {
    state: initialValue,
    set: () => {},
    undo: () => {},
    redo: () => {},
    canUndo: false,
    canRedo: false,
    reset: () => {},
    history: { past: [], future: [] },
  }
}
