// Exercise 22: an observable store (the core of Zustand).
// Read README.md in this folder for the full requirements.

/**
 * Creates a store that holds one state object and tells subscribers when it changes.
 *
 *   const store = createStore({ count: 0, name: 'Ada' })
 *   const unsubscribe = store.subscribe(
 *     (state, prevState) => console.log(state.count, prevState.count),
 *     (state) => state.count, // only call me when the count changes
 *   )
 *   store.setState({ count: 1 }) // logs "1 0"
 *   store.setState({ name: 'Grace' }) // logs nothing, the count did not change
 *   unsubscribe()
 */
export function createStore(initialState) {
  // TODO 1: check that the initial state is an object (throw a TypeError if
  //         not) and keep the current state in a variable.
  // TODO 2: decide where the subscriptions live. Each one must remember its
  //         listener, its selector, its equalityFn and the last slice it saw.
  //         Which data structure keeps the order of insertion, makes removal
  //         cheap and lets you ask "is it still subscribed?"

  function getState() {
    // TODO 3: return the current state (the same object until it changes).
    return undefined
  }

  /**
   * @param partialOrUpdater an object, or a function (state) => object
   * @param replace when true, the result replaces the state instead of being merged
   */
  function setState(partialOrUpdater, replace = false) {
    // TODO 4: if it is a function, call it with the current state.
    // TODO 5: the result must be an object, otherwise throw a TypeError.
    // TODO 6: if the result is the very same object as the current state,
    //         stop. Nothing changed.
    // TODO 7: build the NEW state (never change the old one): a shallow merge
    //         into a new object, or the value itself when replacing.
    // TODO 8: tell the subscribers (see notify below).
  }

  function notify(prevState) {
    // TODO 9: go through the subscriptions in the order they subscribed.
    //         For each one: run its selector on the current state, compare the
    //         result with the last slice it saw using its equalityFn, and call
    //         the listener (state, prevState) only when they differ.
    // TODO 10: loop over a copy, skip subscriptions that were removed while you
    //          loop, and make sure one listener that throws does not stop the
    //          others (rethrow the first error at the end).
  }

  function subscribe(listener, selector = (s) => s, equalityFn = Object.is) {
    // TODO 11: throw a TypeError if the listener is not a function.
    // TODO 12: remember the subscription, including the slice right now, and
    //          return a function that removes it (harmless to call twice).
    return () => {}
  }

  function destroy() {
    // TODO 13: remove every subscription.
  }

  return { getState, setState, subscribe, destroy }
}
