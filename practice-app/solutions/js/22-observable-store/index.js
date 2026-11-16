// Reference solution for exercise 22: a tiny observable store (the core of Zustand).
//
// Key ideas:
// - The state is never changed in place. Every update builds a NEW object, so
//   "did it change?" is a cheap reference check (Object.is).
// - Every subscription remembers the last slice it was told about. After an
//   update we run the selector again and call the listener only when the
//   slice is different according to equalityFn.
// - Subscriptions live in a Set. A Set keeps the order of insertion, makes
//   unsubscribe O(1), and lets us ask "is this subscription still active?".

function assertObject(value, message) {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError(message)
  }
}

export function createStore(initialState) {
  assertObject(initialState, 'createStore expects an object as the initial state')

  let state = initialState
  // Each entry is { listener, selector, equalityFn, slice }.
  const subscriptions = new Set()

  function getState() {
    return state
  }

  function setState(partialOrUpdater, replace = false) {
    const value =
      typeof partialOrUpdater === 'function' ? partialOrUpdater(state) : partialOrUpdater
    assertObject(value, 'setState expects an object, or a function that returns an object')

    // The very same object: nothing changed, so nobody needs to hear about it.
    if (Object.is(value, state)) return

    const prevState = state
    // Always a new object: merge into a copy, or take the value as it is.
    state = replace ? value : { ...state, ...value }
    notify(prevState)
  }

  function notify(prevState) {
    let failed = false
    let firstError

    // Loop over a copy, so listeners may subscribe or unsubscribe while we loop.
    for (const subscription of [...subscriptions]) {
      // Unsubscribed (or destroyed) by an earlier listener in this round.
      if (!subscriptions.has(subscription)) continue

      try {
        // Read the CURRENT state, not a copy taken before the loop. If a
        // listener called setState, later listeners must see the newest state
        // and never receive an older one after a newer one.
        const slice = subscription.selector(state)
        if (subscription.equalityFn(subscription.slice, slice)) continue

        subscription.slice = slice
        subscription.listener(state, prevState)
      } catch (error) {
        // One broken listener must not stop the others. Keep the first error.
        if (!failed) {
          failed = true
          firstError = error
        }
      }
    }

    if (failed) throw firstError
  }

  function subscribe(listener, selector = (s) => s, equalityFn = Object.is) {
    if (typeof listener !== 'function') {
      throw new TypeError('subscribe expects a function as the listener')
    }

    // A fresh object per call: the same listener can be subscribed twice
    // (maybe with different selectors) and each one is removed on its own.
    const subscription = { listener, selector, equalityFn, slice: selector(state) }
    subscriptions.add(subscription)

    return function unsubscribe() {
      subscriptions.delete(subscription)
    }
  }

  function destroy() {
    subscriptions.clear()
  }

  return { getState, setState, subscribe, destroy }
}
