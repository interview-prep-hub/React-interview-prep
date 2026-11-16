// Reference solution for exercise 03: memoize.
//
// Key ideas:
// - A Map is the cache. It accepts any value as a key, so a custom resolver
//   can return an object, a number, a string, anything.
// - We ask cache.has(key) instead of checking cache.get(key) !== undefined.
//   That way a cached `undefined` (or 0, null, false, '') still counts as a hit.
// - The default key is JSON.stringify(args). The brackets, quotes and commas
//   keep (1, 2), (12) and ("1,2") apart. Its limits: undefined and null look
//   the same, and circular objects or BigInt values make it throw. A custom
//   resolver is the escape hatch for those cases.
// - If fn throws, we never reach cache.set, so errors are not cached.
// - For async functions fn returns a promise. We cache that promise itself,
//   so two calls made while the work is still pending share one request.

export function memoize(fn, resolver) {
  if (typeof fn !== 'function') {
    throw new TypeError('memoize: fn must be a function')
  }
  if (resolver !== undefined && typeof resolver !== 'function') {
    throw new TypeError('memoize: resolver must be a function when it is given')
  }

  const cache = new Map()

  // A regular function (not an arrow) so `this` is whatever the caller used,
  // for example `obj` in `obj.method()`.
  function memoized(...args) {
    const key = resolver ? resolver(...args) : JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)
    }

    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }

  memoized.cache = cache
  // Empty the SAME Map, so anyone holding a reference to it sees the change.
  memoized.clear = () => cache.clear()

  return memoized
}
