// Exercise 12: retry with exponential backoff, and withTimeout.
// Read README.md in this folder for the full requirements.
//
// Until you implement them, retry and withTimeout return a promise that rejects
// with "Not implemented", so the tests fail.

/** Thrown by withTimeout when the promise did not settle in time. */
export class TimeoutError extends Error {
  // TODO 1: add a constructor(message) that passes the message to super(...)
  //         and sets this.name to 'TimeoutError'.
}

/**
 * Calls `fn(attempt)` until it succeeds or the attempts run out.
 * Total attempts = retries + 1. Waits delay * factor^(attempt - 1) ms between
 * attempts. Rethrows the last error.
 */
export function retry(fn, { retries = 3, delay = 100, factor = 2, shouldRetry = () => true } = {}) {
  // TODO 2: loop over the attempts (the attempt number starts at 1).
  // TODO 3: call fn(attempt) inside try/catch. Remember to `await` the result
  //         INSIDE the try block, otherwise a rejection skips the catch.
  // TODO 4: in the catch, rethrow the error when no attempt is left,
  //         or when shouldRetry(error) says no.
  // TODO 5: otherwise wait delay * factor ** (attempt - 1) ms
  //         (a promise around setTimeout is the usual way), then loop again.
  return Promise.reject(new Error('Not implemented'))
}

/**
 * Settles like `promise`, unless it takes longer than `ms` milliseconds.
 * Then it rejects with a TimeoutError.
 */
export function withTimeout(promise, ms, message = `Timed out after ${ms}ms`) {
  // TODO 6: return new Promise((resolve, reject) => { ... }).
  // TODO 7: start a timer with setTimeout that rejects with new TimeoutError(message).
  // TODO 8: when `promise` settles first, clear the timer and pass its value
  //         (or its reason) on. Use .then(onFulfilled, onRejected).
  return Promise.reject(new Error('Not implemented'))
}
