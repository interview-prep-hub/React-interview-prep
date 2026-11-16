// Exercise 01: debounce.
// Read README.md in this folder for the full requirements.

export function debounce(fn, wait = 0, { leading = false, trailing = true } = {}) {
  // TODO 1: throw a TypeError when fn is not a function.

  // TODO 2: keep the state that survives between calls in variables here.
  // You need to remember:
  //   - the id of the running timer (nothing running means "no burst in progress")
  //   - the arguments and the `this` of the latest call that is still waiting to run
  //   - the value fn returned the last time it ran

  // Use a normal `function` (not an arrow function), so `this` belongs to the caller.
  function debounced(...args) {
    // TODO 3: restart the timer on every call.
    // TODO 4: decide what this call does. Run fn now (leading edge),
    //         or remember this call so it can run later (trailing edge).
    // TODO 5: return the value fn returned the last time it ran.
    return undefined
  }

  debounced.cancel = function cancel() {
    // TODO 6: stop the timer and forget the pending call.
  }

  debounced.flush = function flush() {
    // TODO 7: if a trailing call is pending, run it now and return its result.
    return undefined
  }

  return debounced
}
