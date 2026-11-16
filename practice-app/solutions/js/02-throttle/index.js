// Reference solution for JS exercise 02: throttle.
//
// Key ideas:
// - Time is cut into "windows" of `wait` ms. A window opens on the first call
//   (when we are idle) and closes when its timer fires.
// - Unlike debounce, extra calls do NOT restart the timer. The window has a
//   fixed length, so a steady stream of calls still gets through regularly.
// - Calls that arrive while a window is open are not lost: with `trailing` on,
//   the latest one is remembered and runs when the window closes.
// - Running that trailing call opens a NEW window, so two runs are never closer
//   than `wait` ms to each other.
// - The state lives in a closure, so every throttled function has its own.

export function throttle(fn, wait = 0, { leading = true, trailing = true } = {}) {
  if (typeof fn !== 'function') {
    throw new TypeError('throttle: the first argument must be a function')
  }

  let timerId // undefined means "idle": no window is open
  let pendingArgs // arguments of the latest call that was held back
  let pendingThis // the `this` of that same call
  let result // what fn returned the last time it ran

  function openWindow() {
    timerId = setTimeout(closeWindow, wait)
  }

  function closeWindow() {
    timerId = undefined
    if (!pendingArgs) return // nobody called during the window: go idle

    const args = pendingArgs
    const context = pendingThis
    pendingArgs = pendingThis = undefined

    openWindow() // running fn starts a new window (and cannot be skipped if fn throws)
    result = fn.apply(context, args)
  }

  // A normal `function` (not an arrow) so `this` is whatever the caller used.
  function throttled(...args) {
    if (timerId === undefined) {
      // Idle: this call opens a window. It opens BEFORE fn can run, so a
      // leading fn that throws still leaves the window open.
      openWindow()
      if (leading) {
        result = fn.apply(this, args)
        return result
      }
    }

    // Inside a window (or a first call without leading): remember only the latest call.
    if (trailing) {
      pendingArgs = args
      pendingThis = this
    }
    return result
  }

  throttled.cancel = () => {
    clearTimeout(timerId)
    timerId = undefined
    pendingArgs = pendingThis = undefined
  }

  return throttled
}
