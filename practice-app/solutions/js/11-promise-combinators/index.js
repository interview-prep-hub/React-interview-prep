// Reference solution for JS exercise 11: promise combinators.
//
// Key ideas:
// - Every input goes through Promise.resolve(item). It turns plain values and
//   thenables into real promises, so the rest of the code treats them all alike.
// - There is no `await` in the loops. All inputs must be watched at the same
//   time. Awaiting them one by one would lose the early rejection (no fail-fast)
//   and could leave a later rejection unhandled.
// - Each input remembers its INDEX. That is how the results keep input order,
//   whichever promise settles first.
// - A promise settles only once. Calling resolve or reject again later does
//   nothing, so `race` and the fail-fast of `all` need no extra code.
// - We use .then(onFulfilled, onRejected) with BOTH callbacks. The promise that
//   .then returns then always fulfills, so no rejection is ever left unhandled.
// - Promise callbacks always run later, after the synchronous `for...of` loop is
//   finished. So `count` is already final when a callback compares it with
//   `settled`. (An empty input has no callbacks, so it is handled after the loop.)
// - `for...of` throws a TypeError for a value that is not iterable. Because it
//   runs inside the Promise executor, the throw becomes a rejection, exactly
//   like the built-ins (they never throw synchronously).

/**
 * Resolves with an array of all the values, in input order.
 * Rejects at once with the reason of the first rejection (fail-fast).
 */
export function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const results = []
    let count = 0 // how many inputs we have seen
    let settled = 0 // how many of them have fulfilled

    for (const item of iterable) {
      const index = count++
      Promise.resolve(item).then((value) => {
        results[index] = value
        settled++
        if (settled === count) resolve(results)
      }, reject)
    }

    if (count === 0) resolve(results)
  })
}

/**
 * Waits for every input to settle. Never rejects because of an input.
 * Resolves with { status: 'fulfilled', value } or { status: 'rejected', reason }
 * objects, in input order.
 */
export function promiseAllSettled(iterable) {
  return new Promise((resolve) => {
    const results = []
    let count = 0
    let settled = 0

    const record = (index, outcome) => {
      results[index] = outcome
      settled++
      if (settled === count) resolve(results)
    }

    for (const item of iterable) {
      const index = count++
      Promise.resolve(item).then(
        (value) => record(index, { status: 'fulfilled', value }),
        (reason) => record(index, { status: 'rejected', reason }),
      )
    }

    if (count === 0) resolve(results)
  })
}

/**
 * Settles the same way as the first input that settles.
 * An empty input never settles (there is nobody to win).
 */
export function promiseRace(iterable) {
  return new Promise((resolve, reject) => {
    for (const item of iterable) {
      // The first settlement wins. Later calls to resolve or reject do nothing.
      Promise.resolve(item).then(resolve, reject)
    }
  })
}

/**
 * Resolves with the first value that fulfills.
 * If every input rejects (or there are none), rejects with an AggregateError
 * whose `errors` array holds the reasons in input order.
 */
export function promiseAny(iterable) {
  return new Promise((resolve, reject) => {
    const errors = []
    let count = 0
    let failed = 0

    const rejectAll = () => reject(new AggregateError(errors, 'All promises were rejected'))

    for (const item of iterable) {
      const index = count++
      Promise.resolve(item).then(resolve, (reason) => {
        errors[index] = reason
        failed++
        if (failed === count) rejectAll()
      })
    }

    if (count === 0) rejectAll()
  })
}
