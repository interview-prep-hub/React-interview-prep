// Reference solution for exercise 04: curry and partial.
//
// Key ideas for curry:
// - fn.length is the number of parameters fn declares (before any default
//   value or rest parameter). That is how we know when we have "enough".
// - Every waiting function (what curry returns until enough arguments have
//   arrived) remembers the arguments collected so far in `received`. We never
//   change that array: each call builds a NEW one, so a waiting function can
//   be reused many times without the calls disturbing each other.
// - We count `args.length`, not "is the value undefined", so an explicit
//   `undefined` argument still counts as an argument.
// - Calling with no arguments adds nothing, so we return the same function.

export function curry(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('curry: fn must be a function')
  }

  const arity = fn.length

  function collect(received) {
    return function curried(...args) {
      const all = [...received, ...args]

      // Enough arguments: run fn. Extra arguments are passed through as well.
      if (all.length >= arity) {
        return fn(...all)
      }

      // Not enough yet. No new arguments means nothing changed.
      return args.length === 0 ? curried : collect(all)
    }
  }

  return collect([])
}

// partial fixes the first arguments now and takes the rest later, all at once.
// Unlike curry, it does not look at fn.length and never waits for more:
// every call to the returned function calls fn right away.
export function partial(fn, ...preset) {
  if (typeof fn !== 'function') {
    throw new TypeError('partial: fn must be a function')
  }

  return (...later) => fn(...preset, ...later)
}
