# 12 - Retry with timeout

**Level:** Medium | **Time:** 40 minutes | **Topics:** async/await, `setTimeout`, exponential backoff, error handling, custom error classes, timers

## The task

Networks are unreliable. A request can fail once and work the second time, or it can hang for ever. You will write two small helpers that every real app needs:

- `retry(fn, options)` runs an async function again when it fails, and waits a little longer after each failure. This is called **exponential backoff**.
- `withTimeout(promise, ms, message)` stops waiting for a promise after `ms` milliseconds and rejects with a `TimeoutError`.

They also work well together: `retry(() => withTimeout(fetchData(), 5000))` retries a request that fails OR hangs.

Work in [`index.js`](./index.js). Do not edit the test file.

Words used below:

- An **attempt** is one call of `fn`. The first attempt is number 1.
- **Retries** are the EXTRA attempts after the first one. `retries: 3` means up to 4 attempts in total.
- **Backoff** is the waiting time between two attempts. It grows after every failure, so a struggling server gets more and more room to recover.

## Requirements

### TimeoutError

1. `index.js` exports a class `TimeoutError` that extends `Error`. `new TimeoutError('text')` has `message === 'text'` and `name === 'TimeoutError'`, so `error instanceof TimeoutError` and `error.name === 'TimeoutError'` both work.

### retry

2. `index.js` exports `retry(fn, { retries = 3, delay = 100, factor = 2, shouldRetry = () => true } = {})`. It returns a `Promise`, and it never throws synchronously. Options you leave out use their default.
3. An attempt is a call `fn(attempt)` with exactly ONE argument: the attempt number, starting at 1. `fn` can return a promise, return a plain value (that counts as a success) or throw synchronously (that counts as a failed attempt).
4. The first attempt starts at once, with no waiting.
5. When an attempt succeeds, `retry` fulfills with its value. It does not call `fn` again and leaves no timer behind.
6. When an attempt fails and another attempt is still allowed (total attempts = `retries + 1`), and `shouldRetry(error)` returns a truthy value, wait `delay * factor ** (attempt - 1)` milliseconds and call `fn(attempt + 1)`. Here `attempt` is the number of the attempt that just failed. With the defaults the waits are 100, 200, 400 ms. The wait starts when the attempt FAILS.
7. When no attempt is left, reject with the error of the last attempt. Do not wait first. The rejection reason is the exact value that was thrown (same object, any type), not a copy and not a wrapper.
8. `shouldRetry` is called with ONE argument, the error that was just thrown. It is only called when another attempt is still allowed (not after the last attempt, and not after a success). When it returns a falsy value, `retry` rejects at once with that error, without waiting.
9. `retries: 0` means one attempt and no waiting. `factor: 1` means the same wait every time. `delay: 0` means retry right away.

### withTimeout

10. `index.js` exports ``withTimeout(promise, ms, message = `Timed out after ${ms}ms`)``. It returns a `Promise` that settles like `promise`, if `promise` settles before `ms` milliseconds have passed. A fulfillment value or a rejection reason is passed on unchanged.
11. If `promise` is still pending after `ms` milliseconds, the returned promise rejects with `new TimeoutError(message)`. When `message` is not given, the text is `Timed out after <ms>ms`, for example `Timed out after 50ms`. The timer starts when `withTimeout` is called.
12. As soon as `promise` settles, the timer is cleared. After that nothing is left scheduled.
13. What `promise` does after the timeout is ignored. In particular, if it rejects later, that must not cause an unhandled rejection.
14. `promise` may also be a plain value or a thenable (an object with a `then` method).
15. `withTimeout` does NOT cancel the underlying work. It only stops waiting for it.

## Examples

`after(ms, value)` is a promise that fulfills with `value` after `ms` milliseconds. `t` is the time in ms.

```text
retry(fn) where fn fails twice and then returns 'ok'
  t=0    fn(1) fails
  t=100  fn(2) fails              (waited 100 * 2^0)
  t=300  fn(3) returns 'ok'       (waited 100 * 2^1)
  -> fulfills 'ok', fn was called 3 times

retry(fn, { retries: 2, delay: 10, factor: 3 }) where fn always fails
  t=0    fn(1) fails
  t=10   fn(2) fails              (waited 10)
  t=40   fn(3) fails              (waited 30)
  -> rejects with the error of fn(3). It does not wait after the last failure.

retry(fn, { shouldRetry: (e) => e.status >= 500 }) where fn(1) throws { status: 404 }
  -> rejects at once with { status: 404 }. fn was called once.

withTimeout(after(30, 'data'), 50)
  -> fulfills 'data' at t=30, and the 50 ms timer is cleared

withTimeout(new Promise(() => {}), 50)
  -> rejects at t=50 with a TimeoutError whose message is 'Timed out after 50ms'
```

## Complexity target

O(1) extra memory: only one timer is pending at any moment, and you do not keep a list of the errors (only the latest one matters). The total waiting time in the worst case is the sum of the waits: with the defaults 100 + 200 + 400 = 700 ms.

## Acceptance criteria (what the tests check)

- `retry` success: the first success is returned, the attempt number is passed to `fn` (and nothing else), no more calls after a success, no timers left, a synchronous throw is a failed attempt, a plain return value is a success.
- `retry` waiting: the exact start times of the attempts for the defaults (0, 100, 300, 700), for a custom `delay` and `factor`, for `factor: 1`, for `delay: 0`, for a partial options object, and when the attempts themselves take time.
- `retry` giving up: `retries + 1` attempts, the last error is rethrown as it is, no wait after the last failure, `retries: 0` and `retries: 1`, any kind of thrown value.
- `shouldRetry`: stops at once without waiting, receives the error (one argument), is only asked while another attempt is allowed, can accept some errors and refuse others, is not called after a success.
- `TimeoutError`: it is an `Error`, its name and message.
- `withTimeout`: value and reason are passed on, a `TimeoutError` exactly at `ms` (default and custom message), the timer is cleared on a fulfillment and on a rejection, a late result is ignored, no unhandled rejection after the timeout, plain values and thenables, `ms = 0`.
- Together: a hanging attempt is retried, `shouldRetry` can retry only timeouts, and a `TimeoutError` is rethrown when all the attempts hang.

The tests use fake timers. Time only moves when the test says so, and `Date.now()` is faked as well, so the tests are instant and never flaky.

## How to run

```bash
npm test -- exercises/js/12-retry-with-timeout
```

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/12-retry-with-timeout
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. `retry` is a loop. Make it an `async` function with a `for` loop, a counter `attempt` that starts at 1, and a `try/catch` inside the loop.
2. Write `return await fn(attempt)` inside the `try`. The `await` matters: with a plain `return fn(attempt)` the promise is handed out of the `try` block before it has settled, so a rejection that comes later happens outside the `try` and the `catch` never sees it. (A synchronous throw of `fn` is caught either way.)
3. In the `catch`, the attempt number `attempt` has just failed. Another attempt is allowed when `attempt <= retries` (with `retries = 3`, attempts 1, 2 and 3 can be followed by another one, attempt 4 cannot).
4. Decide in this order: is another attempt allowed? Then does `shouldRetry(error)` agree? If either answer is no, `throw error`. Throw the same `error` value, do not wrap it.
5. A tiny helper makes the waiting easy to read: `const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))`, then `await sleep(delay * factor ** (attempt - 1))`.
6. `withTimeout` is a `new Promise((resolve, reject) => { ... })` with two parts: a `setTimeout` that rejects with a `TimeoutError`, and `Promise.resolve(promise).then(onFulfilled, onRejected)` where both callbacks first call `clearTimeout` and then `resolve` or `reject`.
7. Pass BOTH callbacks to the same `.then(...)`. If you use `.finally(...)` to clear the timer on a promise you keep, remember that `.finally` returns a new promise that rejects too, and nobody handles it.
8. The class needs a constructor: call `super(message)`, then set `this.name = 'TimeoutError'`. Without the name, the error says `Error`.
9. A default parameter can use an earlier parameter: ``function withTimeout(promise, ms, message = `Timed out after ${ms}ms`)``.

</details>

## Stretch goals

- Add a `maxDelay` option that caps the waiting time. Without a cap, attempt 10 with the defaults waits 51 seconds.
- Add random jitter (see follow-up 1) and test it with `vi.spyOn(Math, 'random')`.
- Add an `onRetry(error, attempt, waitMs)` callback for logging.
- Allow `shouldRetry` to be an `async` function.
- Add a `signal` option (an `AbortSignal`): when it aborts, stop waiting and reject with `signal.reason`, and pass the signal to `fn` so the real request can be cancelled.
- Build a small `useFetchWithRetry(url)` hook on top of `retry`, or compare your work with [React exercise 15](../../react/15-fetch-list-retry/README.md).

## Interview follow-ups to prepare for

**1. What is jitter in exponential backoff, and why add it?**

<details>
<summary>Show answer</summary>

Exponential backoff gives a struggling server more room after every failure. But imagine 1000 clients that all failed at the same moment, for example when the server restarted. They all wait exactly 100 ms and retry together, then all wait 200 ms and retry together, and so on. The server gets hit by synchronized waves (a "thundering herd") and may keep falling over.

**Jitter** means adding randomness to the wait, so the clients spread out. The most common version is "full jitter": wait a random time between 0 and the normal backoff value.

```js
function backoffWithJitter(attempt, { delay = 100, factor = 2, maxDelay = 30_000 } = {}) {
  // The cap stops the wait from growing without limit.
  const ceiling = Math.min(maxDelay, delay * factor ** (attempt - 1))
  return Math.random() * ceiling // anywhere between 0 and the ceiling
}
```

Other points worth saying in an interview:

- Always cap the wait (`maxDelay`) and the number of retries.
- Only retry operations that are safe to repeat. A `GET` is fine. A `POST` that creates an order is not, unless the server supports an idempotency key.
- Do not retry errors that cannot get better, such as `400` or `404`. That is the job of `shouldRetry`.
- If the server sends a `Retry-After` header, respect it.
- In a unit test, make the randomness predictable with `vi.spyOn(Math, 'random').mockReturnValue(0.5)`.

</details>

**2. `withTimeout` stops waiting, but does the work stop? How do you cancel for real with `AbortController`?**

<details>
<summary>Show answer</summary>

No. A promise cannot be cancelled. After the timeout the request is still running: it still uses the network and the server, and its answer is simply thrown away. Real cancellation needs the work itself to listen to an `AbortSignal`. `fetch` supports that:

```js
const controller = new AbortController()
const timer = setTimeout(() => controller.abort(), 5000)
try {
  const response = await fetch(url, { signal: controller.signal })
  return await response.json()
} finally {
  clearTimeout(timer)
}
```

There are shortcuts. `AbortSignal.timeout(5000)` is a signal that aborts after 5 seconds (the `fetch` then rejects with a `DOMException` named `TimeoutError`). `AbortSignal.any([userSignal, AbortSignal.timeout(5000)])` aborts when either one fires, so you can combine a "cancel" button with a timeout.

In React, the effect cleanup is the place to abort, so a request for the old `url` does not update the state after the user has moved on:

```jsx
useEffect(() => {
  const controller = new AbortController()
  fetch(url, { signal: controller.signal })
    .then((response) => response.json())
    .then(setData)
    .catch((error) => {
      if (error.name !== 'AbortError') setError(error) // an abort is not an error to show
    })
  return () => controller.abort()
}, [url])
```

To make `retry` cancellable too, give it a `signal`: pass it on to `fn`, stop sleeping as soon as it aborts, and never start a new attempt after that.

</details>

**3. How does React Query (TanStack Query) retry failed requests?**

<details>
<summary>Show answer</summary>

It is the same idea as your `retry`, built in. When a `queryFn` throws, the library tries again by itself:

- `retry` defaults to `3` in the browser (and `0` on the server, so server rendering does not hang). It can be a number, `false`, `true` (retry for ever) or a function `(failureCount, error) => boolean`, which plays the role of `shouldRetry`. Mutations do not retry by default.
- `retryDelay` defaults to exponential backoff capped at 30 seconds: `attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)`, so 1 s, 2 s, 4 s... It can also be a number or your own function, where you could add jitter.
- While it retries, the query is still loading (`status: 'pending'`, `fetchStatus: 'fetching'`) and the fields `failureCount` and `failureReason` update. Only when every retry has failed does it switch to the `error` state.
- Retries pause while the browser is offline and continue when the connection comes back.

```jsx
const { data, error } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  // Retry server errors up to 3 times, but never a 4xx: repeating a bad request cannot fix it.
  retry: (failureCount, error) => failureCount < 3 && !(error.status >= 400 && error.status < 500),
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
})
```

A classic gotcha: in tests, set `retry: false` on the test `QueryClient`. Otherwise a test that expects an error waits through all the retries and delays.

</details>

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (async/await, closures, try/catch)
- [useEffect](../../../../02-hooks/03-useeffect.md) (cleanup, aborting a request, race conditions)
- [Data fetching](../../../../03-intermediate/02-data-fetching.md) (abort, loading and error states, TanStack Query)
- [State management](../../../../03-intermediate/06-state-management.md) (server state and TanStack Query)
- Related exercises: [01 - Debounce](../01-debounce/README.md) (timers and fake timers), [11 - Promise combinators](../11-promise-combinators/README.md), [15 - Promise pool](../15-promise-pool/README.md), [React 15 - Fetch list with retry](../../react/15-fetch-list-retry/README.md) and [React 27 - Mini query hook](../../react/27-mini-query-hook/README.md)
- Interview round: [Round 5 - JavaScript coding](../../../../05-interview-rounds/round-5-javascript-coding/README.md)
