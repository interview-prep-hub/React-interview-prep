// Reference solution for JS exercise 01: debounce.
//
// Key ideas:
// - A "burst" is a group of calls where each call comes less than `wait` ms
//   after the one before it. While a burst is going on, one timer is running.
// - Every call throws the old timer away and starts a new one. That is the
//   whole "debounce" trick: the timer can only finish when calls stop.
// - The state lives in a closure (variables inside `debounce`), so every
//   debounced function has its own private timer, pending call and result.
// - `this` and the arguments are saved with the call, so the trailing run
//   behaves as if the caller had called `fn` directly.

export function debounce(fn, wait = 0, { leading = false, trailing = true } = {}) {
  if (typeof fn !== 'function') {
    throw new TypeError('debounce: the first argument must be a function')
  }

  let timerId // undefined means "no burst in progress"
  let pendingArgs // arguments of the latest call that still waits for a trailing run
  let pendingThis // the `this` of that same call
  let result // what fn returned the last time it ran

  // Run the remembered call. The pending state is cleared BEFORE calling fn,
  // so a fn that throws can never leave a stale call behind.
  function runPending() {
    const args = pendingArgs
    const context = pendingThis
    pendingArgs = pendingThis = undefined
    result = fn.apply(context, args)
    return result
  }

  // The timer fired: calls stopped for `wait` ms, so the burst is over.
  function endBurst() {
    timerId = undefined
    if (pendingArgs) runPending()
  }

  // A normal `function` (not an arrow) so `this` is whatever the caller used.
  function debounced(...args) {
    const startsBurst = timerId === undefined

    // The timer is restarted BEFORE fn can run, so a leading fn that throws
    // still leaves its burst open.
    clearTimeout(timerId)
    timerId = setTimeout(endBurst, wait)

    if (startsBurst && leading) {
      // Run now. Nothing is left pending, so a burst made of one single call
      // fires exactly once, even when trailing is also on.
      result = fn.apply(this, args)
    } else if (trailing) {
      // Remember only the latest call: it is the one that will run later.
      pendingArgs = args
      pendingThis = this
    }

    return result
  }

  debounced.cancel = () => {
    clearTimeout(timerId)
    timerId = undefined
    pendingArgs = pendingThis = undefined
  }

  debounced.flush = () => {
    // Flushing ends the burst: stop the timer, then run the pending call (if any).
    clearTimeout(timerId)
    timerId = undefined
    return pendingArgs ? runPending() : result
  }

  return debounced
}
