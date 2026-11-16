// Exercise 02: throttle.
// Read README.md in this folder for the full requirements.

export function throttle(fn, wait = 0, { leading = true, trailing = true } = {}) {
  // TODO 1: throw a TypeError when fn is not a function.

  // TODO 2: keep the state that survives between calls in variables here.
  // You need to remember:
  //   - the id of the timer that marks the end of the current window
  //     (nothing running means "idle, no window is open")
  //   - the arguments and the `this` of the latest call that was held back
  //   - the value fn returned the last time it ran

  // Use a normal `function` (not an arrow function), so `this` belongs to the caller.
  function throttled(...args) {
    // TODO 3: if no window is open, this call opens one (start a timer for `wait` ms).
    // TODO 4: decide what this call does. Run fn now (leading edge),
    //         or hold it back so it can run when the window closes (trailing edge).
    // TODO 5: return the value fn returned the last time it ran.
    return undefined
  }

  throttled.cancel = function cancel() {
    // TODO 6: close the window (stop the timer) and forget the held back call.
  }

  return throttled
}
