// Exercise 11: promise combinators.
// Read README.md in this folder for the full requirements.
//
// Write the four functions below WITHOUT using the built-in Promise.all,
// Promise.allSettled, Promise.race or Promise.any.
//
// Each function takes ANY iterable (an array, a Set, a generator...) of values
// and/or promises, and returns a new Promise. Until you implement them, they
// return a promise that rejects with "Not implemented", so the tests fail.

/**
 * Resolves with an array of all the values, in input order.
 * Rejects at once with the reason of the first rejection.
 */
export function promiseAll(iterable) {
  // TODO 1: return new Promise((resolve, reject) => { ... }).
  // TODO 2: loop over the iterable with `for (const item of iterable)`.
  //         Remember the INDEX of each item, so results keep input order.
  // TODO 3: turn each item into a real promise first (plain values and
  //         thenables are allowed), then react to it with .then(onFulfilled, onRejected).
  // TODO 4: resolve when every item has fulfilled. Do not forget the empty input.
  // TODO 5: reject with the first rejection reason.
  return Promise.reject(new Error('Not implemented'))
}

/**
 * Waits for every input to settle. Resolves with objects
 * { status: 'fulfilled', value } or { status: 'rejected', reason }, in input order.
 */
export function promiseAllSettled(iterable) {
  // TODO 6: like promiseAll, but a rejection is NOT an error here:
  //         record it as { status: 'rejected', reason } and keep waiting.
  return Promise.reject(new Error('Not implemented'))
}

/**
 * Settles in the same way as the first input that settles.
 * An empty input never settles.
 */
export function promiseRace(iterable) {
  // TODO 7: pass the same resolve and reject to every input.
  //         A promise settles only once, so the first one wins.
  return Promise.reject(new Error('Not implemented'))
}

/**
 * Resolves with the first value that fulfills. If every input rejects (or there
 * are none), rejects with an AggregateError whose `errors` array has the
 * rejection reasons in input order.
 */
export function promiseAny(iterable) {
  // TODO 8: the mirror image of promiseAll: the first FULFILLMENT wins,
  //         and you collect the REJECTIONS (by index) until all have failed.
  //         Build the error with: new AggregateError(errors, 'All promises were rejected')
  return Promise.reject(new Error('Not implemented'))
}
