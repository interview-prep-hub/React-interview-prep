// Exercise 03: memoize.
// Read README.md in this folder for the full requirements.

/**
 * Wraps `fn` so that results are cached.
 *
 * @param {Function} fn the function to wrap
 * @param {Function} [resolver] optional: (...args) => key
 * @returns {Function} the memoized function, with `.cache` (a Map) and `.clear()`
 */
export function memoize(fn, resolver) {
  // TODO 1: throw a TypeError if `fn` is not a function, or if `resolver`
  //         is given (not undefined) and is not a function.
  // TODO 2: create the cache. A Map is the right tool: any value can be a key.
  // TODO 3: return a function that
  //         - builds a key (from `resolver(...args)`, or from all the args)
  //         - returns the cached value if the key is already in the cache
  //           (careful: a cached `undefined` must count as "already cached")
  //         - otherwise calls `fn` with the same `this` and the same args,
  //           stores the result, and returns it
  // TODO 4: attach `cache` and a `clear()` method to that returned function.
  throw new Error('Not implemented')
}
