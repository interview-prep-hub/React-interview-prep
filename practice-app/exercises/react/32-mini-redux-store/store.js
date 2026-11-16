// Exercise 32, part A: a mini Redux store. Plain JavaScript, no React here.
// Read README.md in this folder for the full requirements.
//
// The three exports below are what the tests and the other files import.
// Right now they are stubs, so the tests fail. Replace the stubs with real code.

export function createStore(reducer, preloadedState, enhancer) {
  // TODO 1: keep the current state in a variable. Its first value is what the
  // reducer returns when it is called with `preloadedState` and an "init"
  // action (an object whose `type` is a string nobody else uses).

  // TODO 2: keep the list of listeners in a variable too.
  // Think about what happens if a listener subscribes or unsubscribes WHILE the
  // store is looping over the listeners. How do you make that safe?

  function getState() {
    // TODO 3: return the current state.
    return undefined
  }

  function subscribe(listener) {
    // TODO 4: remember the listener and return a function that forgets it.
    return function unsubscribe() {}
  }

  function dispatch(action) {
    // TODO 5: reject actions that are not objects with a `type`.
    // TODO 6: run the reducer, save the result as the new state, THEN call
    // every listener (with no arguments). Return the action.
    return undefined
  }

  // TODO 7 (stretch, together with applyMiddleware below): if `enhancer` is a
  // function, let it build the store: enhancer(createStore)(reducer, preloadedState).

  // Do not use `this` inside the three functions: the React bindings will hand
  // out `store.dispatch` on its own, detached from the store object.
  return { getState, dispatch, subscribe }
}

export function combineReducers(reducers) {
  // TODO 8: return a reducer `(state = {}, action) => newState`.
  // - call every slice reducer with ITS slice of the state, and the action
  // - if no slice changed, return the previous state object itself
  // - otherwise return a NEW object (never change the old one)
  return function combined(state = {}, action) {
    return state
  }
}

// Stretch goal. A middleware looks like ({ getState, dispatch }) => next => action => result.
export function applyMiddleware(...middlewares) {
  // TODO 9 (stretch): return an enhancer, which is a function that receives
  // createStore and returns a new createStore function. Build the store, then
  // replace its dispatch with the middleware chain (the FIRST middleware listed
  // is the outermost one).
  return (createStoreFn) => createStoreFn
}
