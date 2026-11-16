// Reference solution for JS exercise 07: compose, pipe, pipeAsync and tap.
//
// Key ideas:
// - `pipe` and `compose` are the same machine with the list in a different order.
//   So we write the machine once (`pipe`) and build `compose` on top of it.
// - Only the FIRST function to run may take many arguments. Every later function
//   gets exactly one argument: the result of the step before it.
// - `reduce` carries the "value so far" from step to step.
// - An `async` function turns a synchronous throw into a rejected promise for free,
//   and `await` works for both plain values and promises. That is all `pipeAsync` needs.

const identity = (value) => value

// Check the whole list when the chain is BUILT, so a typo fails early and loudly
// instead of later, in the middle of a call.
function assertFunctions(name, fns) {
  fns.forEach((fn, index) => {
    if (typeof fn !== 'function') {
      throw new TypeError(`${name}: argument ${index} is not a function`)
    }
  })
}

export function pipe(...fns) {
  assertFunctions('pipe', fns)
  if (fns.length === 0) return identity

  const [first, ...rest] = fns
  // `first` gets every argument. Each function in `rest` gets one value.
  return (...args) => rest.reduce((value, fn) => fn(value), first(...args))
}

export function compose(...fns) {
  assertFunctions('compose', fns)
  // compose(f, g, h)(x) is f(g(h(x))): the same as running h, then g, then f.
  // Copy before reversing, because reverse() changes an array in place.
  return pipe(...[...fns].reverse())
}

export function pipeAsync(...fns) {
  assertFunctions('pipeAsync', fns)

  // `async` means this function ALWAYS returns a promise, and that any error
  // thrown inside it (even a synchronous one) becomes a rejection.
  return async (...args) => {
    // With no functions, `identity` is the first (and only) step: it returns args[0].
    const [first = identity, ...rest] = fns

    // `await` also accepts plain values, so sync and async steps mix freely.
    let value = await first(...args)
    for (const fn of rest) {
      // A loop (not Promise.all) because each step needs the result of the one before.
      value = await fn(value)
    }
    return value
  }
}

export function tap(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('tap: the argument must be a function')
  }

  return (value) => {
    fn(value) // the side effect (logging, saving, ...). Its result is thrown away.
    return value // the value goes on, untouched
  }
}
