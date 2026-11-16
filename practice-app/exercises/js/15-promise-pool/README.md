# 15 - Promise pool (limit concurrency)

**Level:** Medium | **Time:** 40 minutes | **Topics:** promises, `async`/`await`, concurrency limits, closures, error handling

## The task

Write `promisePool(tasks, limit, options)`. It runs a list of async tasks, but never more than `limit` of them at the same time. As soon as one task finishes, the next one starts.

Think of a bank with `limit` cashiers. The tasks are the customers in the queue. A customer goes to a cashier as soon as one is free. Nobody waits for the whole row of cashiers to finish, and nobody gets ahead of the queue.

Why do we need this? Imagine you must upload 500 photos. If you start all 500 uploads at once (`Promise.all(files.map(upload))`), the browser, the network and the server all struggle, and many requests fail. With a pool of 3 you always have 3 uploads in progress and the rest wait their turn.

Work in [`index.js`](./index.js). Do not edit the test file.

Words used below:

- A **task** is a function that returns a promise (or a plain value). It does NOT receive anything. The task starts doing its work only when you call it.
- A task is **running** from the moment you call it until its promise settles (fulfills or rejects).
- To **settle** means to end, either with a value (fulfilled) or with an error (rejected).

Why are tasks functions and not promises? A promise starts working the moment it is created. If you pass already-created promises, everything is already running and nothing can be limited. A function is a recipe, it runs only when you call it, so the pool decides when.

```js
const tasks = [
  () => uploadFile(fileA), // a function: nothing happens yet
  () => uploadFile(fileB),
]
// WRONG: [uploadFile(fileA), uploadFile(fileB)] has already started both uploads
```

## Requirements

1. `index.js` has a named export `promisePool(tasks, limit, { continueOnError = false } = {})`. It always returns a promise. It never throws synchronously: bad input makes the returned promise reject.
2. `tasks` is an array of functions. Each task is called exactly once, with no arguments, in input order. A task may return a promise or a plain value (a plain value counts as an already fulfilled promise). A task that throws before it returns anything counts as a rejected task.
3. `limit` must be a whole number that is 1 or more. Anything else (`0`, `-1`, `1.5`, `NaN`, `Infinity`, `'2'`, `null`, `undefined`) makes the promise reject with a `RangeError`. A `limit` bigger than the number of tasks is fine.
4. If `tasks` is not an array, or one of its items is not a function, the promise rejects with a `TypeError`.
5. The input is checked before anything runs. When the input is bad, no task is started. The `limit` is checked even when `tasks` is empty.
6. At most `limit` tasks are running at the same time.
7. The first `limit` tasks (or all of them, when there are fewer) start during the call, before `promisePool` returns.
8. As soon as a running task settles, the next waiting task starts. The pool never waits for other running tasks first (so no batches), and it never stays idle while tasks are waiting.
9. The promise resolves with an array of results in INPUT order: `results[i]` belongs to `tasks[i]`, even when tasks finish in a different order. Falsy results (`0`, `''`, `false`, `undefined`, `null`) are kept in place. With no tasks the result is `[]`.
10. Default mode, first failure: the promise rejects with the reason of the FIRST task that fails. "First" means first in time, not first in the array. It rejects as soon as that failure happens and does not wait for tasks that are still running.
11. After a failure, no new task starts, not even when a running task later finishes and frees a slot. Running tasks cannot be cancelled, so they keep going, but their results are ignored. If they fail later, it must not produce an "unhandled promise rejection".
12. With `{ continueOnError: true }` a failure does not stop anything. Every task is called, and the promise resolves (it does not reject because of a task) with an array of objects in input order, like `Promise.allSettled`: `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }`. The limit rules still apply.
13. Separate calls do not share any state. Two pools can run at the same time, each with its own limit.

## Examples

Below, `wait(ms, name)` is a task that finishes after `ms` milliseconds with the value `name`, and `t` is the time in ms.

```js
const wait = (ms, name) => () =>
  new Promise((resolve) => setTimeout(() => resolve(name), ms))
```

```text
1. Order and concurrency   promisePool([wait(30,'A'), wait(10,'B'), wait(20,'C'), wait(10,'D')], 2)
   t=0   A and B start
   t=10  B ends, C starts          (A is still running, we do not wait for it)
   t=30  A and C end, D starts
   t=40  D ends
   result: ['A', 'B', 'C', 'D']    input order, not finish order (B finished first)

2. First failure          tasks: A takes 50 ms, B fails after 10 ms, C takes 20 ms, D takes 10 ms     limit 2
   t=0   A and B start
   t=10  B fails -> the promise rejects with B's error right now
         C and D never start. A keeps running, but its result is ignored.

3. continueOnError        the same tasks as example 2, with { continueOnError: true }
   t=10  B fails, its slot is used by C
   t=30  C ends, D starts
   t=40  D ends
   t=50  A ends -> resolves with
         [ { status: 'fulfilled', value: 'A' },
           { status: 'rejected', reason: <B's error> },
           { status: 'fulfilled', value: 'C' },
           { status: 'fulfilled', value: 'D' } ]

4. Bad limit              promisePool([wait(10,'A')], 0)         -> rejects with a RangeError
   No tasks                promisePool([], 3)                     -> resolves with []

5. Promises, not tasks    promisePool([Promise.resolve(1)], 2)   -> rejects with a TypeError
```

## Complexity target

O(n) time for `n` tasks, and O(n) memory for the results. Picking the next task must be O(1), so use an index counter. Do not call `tasks.shift()` for every task, and do not scan the list again and again.

## Acceptance criteria (what the tests check)

- Results come back in input order, also for an empty list, for plain values and for falsy values. Every task is called once, in input order, and the first `limit` tasks start before the call returns.
- Concurrency never goes above the limit, and it reaches the limit. A task starts as soon as a slot is free (no batches, no idle time: 4 tasks of 30 ms with limit 2 take exactly 60 ms). `limit` 1 is strictly sequential. A big limit starts everything at once. Separate pools do not interfere.
- The first failure in time rejects at once with that same error object. No new task starts after it. A task that throws synchronously counts as a failure and does not make the call throw. Later failures cause no unhandled rejection.
- `continueOnError` gives `{ status, value | reason }` objects in input order, runs every task, keeps the limit, handles synchronous throws, and never rejects because of a task.
- Bad `limit` gives a `RangeError`, bad `tasks` gives a `TypeError`, both as a rejected promise and with no task started.

## How to run

```bash
npm test -- exercises/js/15-promise-pool
```

The tests use fake timers and fake async tasks, so they finish instantly and never depend on real waiting.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/15-promise-pool
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Think in "workers". A worker is a loop: take the next task, wait for it, then take another one. If you start `limit` workers side by side, you have the concurrency limit for free, and a worker takes a new task the moment its old one ends.
2. The workers share a counter such as `nextIndex`. Each worker does `const index = nextIndex++`. This is safe, because JavaScript runs only one piece of code at a time.
3. Write the results by index (`results[index] = value`). Do not `push`, or the order would follow the finish times.
4. Make `promisePool` an `async` function. A `throw` inside it becomes a rejected promise, which is exactly what the validation rules want. An `async` function also runs synchronously up to its first `await`, so the first workers start during the call.
5. Put the task call inside `try`/`catch` in the worker: `const value = await tasks[index]()`. `await` accepts a plain value as well as a promise, and a task that throws synchronously is caught by the same `try`.
6. Without `continueOnError`: set a flag such as `stopped = true`, then rethrow the error. Every worker checks the flag before it takes a new task. `Promise.all(workers)` rejects with the first worker that throws, and it also listens to the other workers, so their later failures are not "unhandled".
7. With `continueOnError`: catch the error inside the worker, store `{ status: 'rejected', reason }` and keep looping. Do not rethrow.
8. Do not run the tasks in batches with `Promise.all(chunk)`. A batch waits for its slowest task, so slots sit idle.

</details>

## Stretch goals

- Add an `onProgress(done, total)` option that is called after every settled task. Use it to drive a progress bar in React.
- Pass the task index as the first argument to every task. Then pass an `AbortSignal` as well (see follow-up 3).
- Combine this with [12 - Retry with timeout](../12-retry-with-timeout/README.md): retry each failing task up to 2 times before it counts as failed.
- Turn the function into a small class `PromisePool` with `add(task)` and `onIdle()`, for tasks that arrive over time (see follow-up 2).

## Interview follow-ups to prepare for

**1. Where would you use a promise pool in a real app? (uploads, API rate limits)**

<details>
<summary>Show answer</summary>

Use it whenever you have many async jobs and starting all of them at once would hurt:

- **Bulk uploads or downloads.** Browsers allow only a handful of parallel connections to one host (about 6 with HTTP/1.1), phones have weak networks, and servers have limited memory. A pool of 3 to 5 keeps the pipe busy without flooding it.
- **Calling an API with a rate limit.** A pool caps how many requests are in flight at once. That is a concurrency limit, not a rate limit ("100 requests per minute"). For a rate limit you also need a delay or a token bucket, and you must handle `429 Too Many Requests` and the `Retry-After` header. A pool plus retry is the usual first step.
- **Batch work on a server.** Resizing 10,000 images, sending emails, scraping pages politely, or running many database queries without exhausting the connection pool.
- **Preloading.** Fetching thumbnails or route chunks in the background without blocking the important requests.

The mistake to avoid is `await Promise.all(items.map(doSomething))` on a big list. It starts every job at once.

In React, call the pool from an event handler or an effect, and keep progress in state. `continueOnError: true` fits a bulk action, because the user wants a report ("47 uploaded, 3 failed") and not a stop at the first error:

```jsx
import { useState } from 'react'
import { promisePool } from './index.js'

function UploadButton({ files, uploadFile }) {
  const [report, setReport] = useState(null)

  async function handleClick() {
    const tasks = files.map((file) => () => uploadFile(file)) // functions: nothing starts yet
    const results = await promisePool(tasks, 3, { continueOnError: true })
    setReport({
      uploaded: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
    })
  }

  return (
    <div>
      <button onClick={handleClick}>Upload {files.length} files</button>
      {report && (
        <p>
          {report.uploaded} uploaded, {report.failed} failed
        </p>
      )}
    </div>
  )
}
```

</details>

**2. How would you build an async queue with priorities?**

<details>
<summary>Show answer</summary>

A pool works on a list that you already know. A queue accepts jobs over time, so the "next job" is chosen when a slot frees up. The change is small: keep the waiting jobs in a list, and when a slot is free take the best job, not the next index.

```js
export function createQueue({ concurrency = 1 } = {}) {
  const waiting = [] // jobs that have not started yet
  let running = 0
  let arrivalCounter = 0

  function startNext() {
    while (running < concurrency && waiting.length > 0) {
      // Highest priority first. For equal priority, the job that arrived first.
      waiting.sort((a, b) => b.priority - a.priority || a.arrival - b.arrival)
      run(waiting.shift())
    }
  }

  async function run(job) {
    running += 1
    try {
      job.resolve(await job.task())
    } catch (error) {
      job.reject(error) // a failing job only rejects its own promise
    } finally {
      running -= 1
      startNext() // a slot is free: take the next job
    }
  }

  return {
    add(task, { priority = 0 } = {}) {
      return new Promise((resolve, reject) => {
        waiting.push({ task, priority, arrival: arrivalCounter++, resolve, reject })
        startNext()
      })
    },
  }
}
```

How it behaves with `concurrency: 1`: you add job A (it starts at once), then B (priority 0), C and D (priority 5), E (priority 1). The run order is A, C, D, E, B. C comes before D because it arrived first, which is why we keep an arrival counter.

`add` returns a promise for that one job's result, so the caller can `await` it. Sorting on every pick costs O(n log n). For large queues use a binary heap, which gives O(log n) per job. Other things to mention: a way to cancel a waiting job, a `pause()`/`resume()`, and an `onIdle()` promise that resolves when nothing is running or waiting.

</details>

**3. How would you add `AbortController` support, so the work can be cancelled?**

<details>
<summary>Show answer</summary>

A promise cannot be cancelled, so cancellation must be built into the tasks. The pool gives every task an `AbortSignal`, and the task passes it to whatever it calls (`fetch(url, { signal })` understands it). When the signal aborts, the pool stops taking new tasks and rejects with the abort reason.

The pool needs two ideas. First, it makes its OWN `AbortController`, and the tasks receive its signal. That way the pool can also cancel the siblings when one task fails. Second, it forwards the caller's signal into its own controller.

```js
export async function promisePool(tasks, limit, { signal } = {}) {
  signal?.throwIfAborted() // already cancelled: start nothing

  const inner = new AbortController() // its signal goes to every task
  const cancelFromOutside = () => inner.abort(signal.reason)
  signal?.addEventListener('abort', cancelFromOutside, { once: true })

  const results = new Array(tasks.length)
  let nextIndex = 0

  async function worker() {
    while (!inner.signal.aborted && nextIndex < tasks.length) {
      const index = nextIndex++
      try {
        results[index] = await tasks[index](inner.signal) // the task passes it to fetch
      } catch (error) {
        inner.abort(error) // cancel the running tasks and stop taking new ones
        throw error
      }
    }
  }

  // Rejects as soon as the signal aborts, even if a running task ignores the signal.
  const aborted = new Promise((_, reject) => {
    inner.signal.addEventListener('abort', () => reject(inner.signal.reason), { once: true })
  })

  try {
    await Promise.race([
      Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker())),
      aborted,
    ])
    return results
  } finally {
    signal?.removeEventListener('abort', cancelFromOutside) // no listener is left behind
  }
}
```

(The input checks from your solution are left out to keep this short.) In React, this is what makes unmounting safe:

```jsx
useEffect(() => {
  const controller = new AbortController()

  promisePool(tasks, 3, { signal: controller.signal }).catch((error) => {
    if (error.name !== 'AbortError') setError(error) // an abort is not a real error
  })

  return () => controller.abort() // leaving the page cancels the pending work
}, [tasks])
```

Good points to say out loud: the signal is passed to each task because only the task knows how to stop its own work; the first failure cancels the siblings so they do not waste bandwidth; listeners are removed when the pool ends; and an aborted run rejects with `signal.reason`, which is an `AbortError` by default.

</details>

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (closures, `async`/`await`, promises)
- [useEffect](../../../../02-hooks/03-useeffect.md) (cleanup functions, cancelling work when a component unmounts)
- [Data fetching](../../../../03-intermediate/02-data-fetching.md) (aborting requests, loading and error states)
- Related exercises: [11 - Promise combinators](../11-promise-combinators/README.md), [12 - Retry with timeout](../12-retry-with-timeout/README.md) and [15 - Fetch list with retry (React)](../../react/15-fetch-list-retry/README.md)
- Interview round: [Round 5 - JavaScript coding](../../../../05-interview-rounds/round-5-javascript-coding/README.md)
