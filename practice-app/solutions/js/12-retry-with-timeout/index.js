// Reference solution for JS exercise 12: retry with backoff, and withTimeout.
//
// Key ideas for `retry`:
// - A loop plus try/catch is the simplest shape. `attempt` counts from 1.
// - `return await fn(attempt)` needs the `await`. Without it the promise would
//   be returned straight out of the `try` block, and a later rejection would
//   happen outside the `try`, so the `catch` below would never see it.
//   (A synchronous throw of `fn` lands in the `catch` either way.)
// - After a failure we ask two questions: "is another attempt allowed?" and
//   "does shouldRetry accept this error?". If either answer is no, we rethrow
//   the SAME error value (no wrapping, so callers can still inspect it).
// - Exponential backoff: the wait is delay * factor^(attempt - 1), so with the
//   defaults it is 100, 200, 400... Each failure makes us back off more.
// - There is no wait after the last failed attempt. We rethrow at once.
//
// Key ideas for `withTimeout`:
// - We race the work against a timer, but we build the race by hand, because we
//   must also CLEAR the timer when the work finishes first. A forgotten timer
//   keeps a Node process alive and can fire much later for nothing.
// - We pass both callbacks to the same `.then(onFulfilled, onRejected)`. That
//   handles the original promise even after the timeout has already won, so a
//   late rejection can never become an unhandled rejection.
// - The timeout does NOT cancel the work. It only stops waiting for it.

/** Thrown by withTimeout when the promise did not settle in time. */
export class TimeoutError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TimeoutError'
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Calls `fn(attempt)` until it succeeds or the attempts run out.
 * Total attempts = retries + 1.
 */
export async function retry(
  fn,
  { retries = 3, delay = 100, factor = 2, shouldRetry = () => true } = {},
) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt)
    } catch (error) {
      const attemptsLeft = attempt <= retries // attempt 1 of (retries + 1) still leaves one
      if (!attemptsLeft || !shouldRetry(error)) throw error

      await sleep(delay * factor ** (attempt - 1))
    }
  }
}

/**
 * Settles like `promise`, unless it takes longer than `ms` milliseconds.
 * Then it rejects with a TimeoutError.
 */
export function withTimeout(promise, ms, message = `Timed out after ${ms}ms`) {
  return new Promise((resolve, reject) => {
    const timerId = setTimeout(() => reject(new TimeoutError(message)), ms)

    // Promise.resolve lets `promise` be a plain value or a thenable too.
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timerId)
        resolve(value)
      },
      (reason) => {
        clearTimeout(timerId)
        reject(reason)
      },
    )
  })
}
