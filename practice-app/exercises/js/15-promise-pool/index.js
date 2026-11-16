// Exercise 15: promise pool (run async tasks with a concurrency limit).
// Read README.md in this folder for the full requirements.

// tasks: an array of FUNCTIONS, each returns a promise (or a plain value)
// limit: how many tasks may run at the same time
// options.continueOnError: see the README
//
// The function is `async` on purpose: it always gives back a promise, and a `throw`
// inside it becomes a rejected promise.
export async function promisePool(tasks, limit, { continueOnError = false } = {}) {
  // TODO 1: validate the input. Reject (do not throw outside the promise) with:
  //   - a TypeError when tasks is not an array of functions
  //   - a RangeError when limit is not a whole number >= 1
  //   Nothing may start when the input is bad.

  // TODO 2: decide where to keep the state that all the running tasks share.
  //   For example: which task comes next, the results (stored by INDEX, so the
  //   output order is the input order), and whether the pool has failed.

  // TODO 3: start up to `limit` tasks right away. Whenever one of them finishes,
  //   the next waiting task must start at once (no waiting for the others).
  //   Think: what small piece of repeating logic can you start `limit` times?
  //   (The Hints in the README describe one way, open them if you are stuck.)

  // TODO 4: failures.
  //   Default: the first failure rejects the pool right away, and no new task starts.
  //   With continueOnError: never stop, and store { status, value } or
  //   { status, reason } for every task.

  // TODO 5: resolve with the results in INPUT order.
  return undefined
}
