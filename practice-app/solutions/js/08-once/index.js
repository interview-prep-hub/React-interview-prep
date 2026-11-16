// Reference solution for JS exercise 08: once, before and after.
//
// Key ideas:
// - All three functions are "a counter in a closure". The counter (or flag) lives
//   in variables inside the outer function, so every wrapper has its own private
//   state and nothing leaks between wrappers.
// - We use a normal `function` (not an arrow function) for the wrapper, so `this`
//   is whatever the caller used, and we pass it on with `fn.apply(this, args)`.
// - `once` uses a flag and NOT `if (!result)`, because a result like 0, '' or
//   undefined is a real result that must be remembered.
// - The "did it run?" state is updated only AFTER fn returned. That is the choice
//   that makes a failed first call retryable (see the README).

function assertFunction(name, fn) {
  if (typeof fn !== 'function') {
    throw new TypeError(`${name}: the function argument must be a function`)
  }
}

function assertCount(name, n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`${name}: n must be a whole number, 0 or more`)
  }
}

export function once(fn) {
  assertFunction('once', fn)

  let called = false
  let result

  return function onced(...args) {
    if (called) return result

    // If fn throws, we never reach the next two lines: `called` stays false,
    // the error goes to the caller, and the next call will try again.
    result = fn.apply(this, args)
    called = true
    return result
  }
}

export function before(n, fn) {
  assertFunction('before', fn)
  assertCount('before', n)

  // before(3, fn) lets fn run for call 1 and call 2, so 2 real calls are left.
  let remaining = n - 1
  let result

  return function limited(...args) {
    if (remaining > 0) {
      // Count first, then call: a call where fn throws still uses up one slot.
      remaining -= 1
      result = fn.apply(this, args)
    }
    // After the limit we hand back the LAST result, without calling fn.
    return result
  }
}

export function after(n, fn) {
  assertFunction('after', fn)
  assertCount('after', n)

  // after(3, fn) ignores call 1 and call 2, so 2 calls are left to ignore.
  let toIgnore = n - 1

  return function delayed(...args) {
    if (toIgnore > 0) {
      toIgnore -= 1
      return undefined
    }
    return fn.apply(this, args)
  }
}
