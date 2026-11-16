// Reference solution for JS exercise 15: promise pool.
//
// Key ideas:
// - A "worker" is an async loop: take the next task, wait for it, take another.
//   `limit` workers running side by side means at most `limit` tasks run at the
//   same time, and a worker grabs a new task the moment its current one ends
//   (no batches, no idle gaps).
// - The workers share two variables: `nextIndex` (which task is next) and
//   `stopped` (true after the first failure). JavaScript runs one piece of code
//   at a time, so `nextIndex++` is safe without any lock.
// - Results are stored by task index, so the output order is the input order,
//   whatever order the tasks finish in.
// - Promise.all(workers) rejects with the first worker that throws. It also
//   listens to every other worker, so a LATER failure of a task that is still
//   running is handled and never becomes an "unhandled rejection".
// - The function is `async`, so a bad argument becomes a rejected promise and
//   the caller always gets a promise back. The body still runs synchronously
//   up to the first `await`, so the first `limit` tasks start during the call.

export async function promisePool(tasks, limit, { continueOnError = false } = {}) {
  if (!Array.isArray(tasks) || tasks.some((task) => typeof task !== 'function')) {
    throw new TypeError('promisePool: tasks must be an array of functions')
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('promisePool: limit must be a whole number, 1 or more')
  }

  const results = new Array(tasks.length)
  let nextIndex = 0
  let stopped = false

  async function worker() {
    while (!stopped && nextIndex < tasks.length) {
      const index = nextIndex++
      try {
        // `await` accepts a promise or a plain value. Because the call is inside
        // `try`, a task that throws before returning a promise is caught too.
        const value = await tasks[index]()
        results[index] = continueOnError ? { status: 'fulfilled', value } : value
      } catch (reason) {
        if (!continueOnError) {
          stopped = true // no worker takes a new task from now on
          throw reason // makes Promise.all below reject with the FIRST failure
        }
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  const workerCount = Math.min(limit, tasks.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}
