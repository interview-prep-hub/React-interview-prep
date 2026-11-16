// Exercise 04: curry and partial.
// Read README.md in this folder for the full requirements.

/**
 * Turns a function of several arguments into one that can be called a few
 * arguments at a time. It uses `fn.length` to know how many arguments are needed.
 *
 * curry((a, b, c) => a + b + c)(1)(2)(3)   // 6
 * curry((a, b, c) => a + b + c)(1, 2)(3)   // 6
 *
 * @param {Function} fn
 * @returns {Function}
 */
export function curry(fn) {
  // TODO 1: throw a TypeError if `fn` is not a function.
  // TODO 2: read how many arguments `fn` expects (`fn.length`).
  // TODO 3: return a function that collects arguments across calls.
  //         - once you have at least that many, call `fn` with ALL of them
  //           (extra arguments are passed through too) and return its result
  //         - otherwise return a new function that remembers what was collected
  //         - a call with no arguments returns the SAME function it was called on
  //         - never change an array that an earlier waiting function is holding
  throw new Error('Not implemented')
}

/**
 * Fixes the first arguments of `fn` now. The returned function takes the rest
 * and calls `fn` immediately.
 *
 * partial(Math.max, 10)(3, 4)   // Math.max(10, 3, 4) = 10
 *
 * @param {Function} fn
 * @param {...any} preset arguments to put in front
 * @returns {Function}
 */
export function partial(fn, ...preset) {
  // TODO 4: throw a TypeError if `fn` is not a function.
  // TODO 5: return a function that calls `fn(...preset, ...laterArgs)`.
  throw new Error('Not implemented')
}
