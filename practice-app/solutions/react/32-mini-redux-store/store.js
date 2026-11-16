// Reference solution for exercise 32: a mini Redux store (no React in this file).
//
// Key ideas:
// - A store is a closure: the current state plus a list of listeners.
// - dispatch = run the reducer, save the result, then tell every listener.
// - The list of listeners is replaced (never edited in place), so a listener
//   that (un)subscribes while we are notifying cannot break the loop.
// - combineReducers hands the OLD state object back when nothing changed, so
//   "did anything change?" becomes a cheap reference comparison.

// The reducer is called once with this action so every slice can return its
// default state. Real Redux uses a random type here so nobody can rely on it.
const INIT_ACTION = { type: '@@mini-redux/INIT' }

export function createStore(reducer, preloadedState, enhancer) {
  // Stretch goal: an enhancer (for example applyMiddleware(...)) takes over the
  // creation of the store and may wrap it.
  if (typeof enhancer === 'function') {
    return enhancer(createStore)(reducer, preloadedState)
  }

  let state = reducer(preloadedState, INIT_ACTION)
  let listeners = []

  function getState() {
    return state
  }

  function subscribe(listener) {
    // Copy on write: a dispatch that is running keeps looping over the OLD
    // array, so a listener added now is first called on the next dispatch.
    listeners = [...listeners, listener]

    return function unsubscribe() {
      // Filtering twice is harmless, so calling unsubscribe twice is fine.
      listeners = listeners.filter((l) => l !== listener)
    }
  }

  function dispatch(action) {
    if (typeof action !== 'object' || action === null || action.type === undefined) {
      throw new Error('Actions must be objects with a "type" property.')
    }

    state = reducer(state, action)

    // `listeners` is read once here. Changes made by listeners create a new
    // array and do not affect this loop.
    for (const listener of listeners) {
      listener()
    }

    return action
  }

  // Plain closures, no `this`: `const { dispatch } = store` works.
  return { getState, dispatch, subscribe }
}

export function combineReducers(reducers) {
  const keys = Object.keys(reducers)

  return function combined(state = {}, action) {
    const nextState = {}
    let changed = false

    for (const key of keys) {
      const previousSlice = state[key]
      const nextSlice = reducers[key](previousSlice, action)
      nextState[key] = nextSlice
      if (nextSlice !== previousSlice) changed = true
    }

    // Same reference in, same reference out, when nothing changed.
    return changed ? nextState : state
  }
}

// Stretch goal. A middleware has the shape ({ getState, dispatch }) => next => action => result.
// applyMiddleware returns an enhancer: a function that receives createStore
// and returns a new createStore.
export function applyMiddleware(...middlewares) {
  return (createStoreFn) => (reducer, preloadedState) => {
    const store = createStoreFn(reducer, preloadedState)

    // The `dispatch` a middleware receives goes through the WHOLE chain. It is
    // only called later (never while the chain is being built), so using the
    // `dispatch` constant that is declared below is safe.
    const api = {
      getState: store.getState,
      dispatch: (action) => dispatch(action),
    }

    const chain = middlewares.map((middleware) => middleware(api))

    // Wrap from the last middleware to the first, so the FIRST one listed is
    // the outermost: it sees the action first and the result last.
    const dispatch = chain.reduceRight((next, middleware) => middleware(next), store.dispatch)

    return { ...store, dispatch }
  }
}
