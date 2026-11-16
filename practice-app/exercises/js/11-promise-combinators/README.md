# 11 - Promise combinators

**Level:** Medium | **Time:** 40 minutes | **Topics:** promises, `Promise.all` / `allSettled` / `race` / `any`, fail-fast vs collect-all, iterables, `AggregateError`, unhandled rejections

## The task

JavaScript gives you four helpers that take MANY promises and give you back ONE promise. They are called **combinators**:

- `Promise.all`: "give me everything, or fail as soon as one fails".
- `Promise.allSettled`: "wait until every one is done and tell me how each one went".
- `Promise.race`: "give me whoever finishes first, good or bad".
- `Promise.any`: "give me the first one that succeeds".

Rebuild them yourself, as `promiseAll`, `promiseAllSettled`, `promiseRace` and `promiseAny`, without using the four built-ins. This is a classic interview question, and it is also the best way to really understand how promises settle.

Work in [`index.js`](./index.js). Do not edit the test file.

Words used below:

- A promise is **pending** until it **settles**. It then becomes **fulfilled** (it has a value) or **rejected** (it has a reason). A promise settles only once.
- An **input** is one item of the iterable you receive.
- A **thenable** is any object with a `then` method. `Promise.resolve(thenable)` turns it into a real promise.
- An **unhandled rejection** is a rejected promise that has no rejection handler. Node reports it (and by default crashes), a browser logs "Uncaught (in promise)".

## Requirements

1. `index.js` has four named exports: `promiseAll`, `promiseAllSettled`, `promiseRace` and `promiseAny`. Each takes ONE argument (an iterable) and returns a new native `Promise`.
2. Do not call `Promise.all`, `Promise.allSettled`, `Promise.race` or `Promise.any`. Everything else is allowed, including `Promise.resolve`, `new Promise` and `.then`.
3. The argument can be any iterable: an array, a `Set`, a generator, a string... Each input can be a plain value, a promise or a thenable. A plain value counts as an already fulfilled promise.
4. If the argument is not iterable (`42`, `null`, `undefined`, `{ length: 1 }`...), the returned promise rejects with a `TypeError`. The function itself never throws.
5. **`promiseAll`** fulfills with an array of the values, in INPUT order (not in the order they settled). It rejects as soon as one input rejects, with that reason (fail-fast). Empty input fulfills with `[]`.
6. **`promiseAllSettled`** waits for every input to settle and then fulfills with an array in input order. A fulfilled input becomes `{ status: 'fulfilled', value }`. A rejected input becomes `{ status: 'rejected', reason }`. These objects have exactly those two keys (the keys exist even when the value or reason is `undefined`). Empty input fulfills with `[]`. It never rejects because of an input.
7. **`promiseRace`** settles in the same way as the first input that settles (fulfilled or rejected). If several inputs are already settled, the one that comes first in the iteration order wins. Empty input never settles.
8. **`promiseAny`** fulfills with the value of the first input that FULFILLS. Rejections do not count until all of them have rejected. Then it rejects with an `AggregateError` whose `errors` array holds the reasons in INPUT order. Empty input rejects with an `AggregateError` whose `errors` is `[]`. (The message text is up to you. The built-in uses `'All promises were rejected'`.)
9. After a combinator has settled, everything that happens later is ignored. But every input must still be watched: no rejection of any input may stay unhandled.

## Examples

`delay(ms, value)` is a promise that fulfills with `value` after `ms` milliseconds.

```text
promiseAll([1, Promise.resolve(2), delay(10, 3)])
  -> fulfills [1, 2, 3]

promiseAll([delay(50, 'a'), Promise.reject('x')])
  -> rejects 'x' at once (it does not wait the 50 ms)

promiseAllSettled([Promise.resolve(1), Promise.reject('no')])
  -> fulfills [{ status: 'fulfilled', value: 1 }, { status: 'rejected', reason: 'no' }]

promiseRace([delay(50, 'slow'), delay(10, 'fast')])
  -> fulfills 'fast'

promiseAny([Promise.reject('a'), delay(10, 'b')])      -> fulfills 'b'
promiseAny([Promise.reject('a'), Promise.reject('b')]) -> rejects AggregateError, errors: ['a', 'b']

Empty input:
  promiseAll([]) and promiseAllSettled([]) fulfill []
  promiseRace([]) never settles
  promiseAny([]) rejects with an AggregateError (errors: [])
```

## Complexity target

O(n) time and O(n) memory for n inputs: one pass over the iterable, one handler per input, one slot per input in the result. Do not search the results array (`includes`, `indexOf`) to decide whether you are done. A counter is enough.

## Acceptance criteria (what the tests check)

- `promiseAll`: input order even when inputs fulfill in a different order (including the last one first), plain values and thenables, empty input, fail-fast with the first reason, later events ignored, still pending while any input is pending, any iterable, a big input.
- `promiseAllSettled`: the exact `{ status, value }` / `{ status, reason }` shape, never rejects, does not fail fast, input order, falsy values and reasons, empty input, any iterable.
- `promiseRace`: the first fulfillment or the first rejection wins, later events are ignored, a plain value beats a pending promise, ties go to the first input, empty input stays pending, any iterable and thenables.
- `promiseAny`: the first fulfillment wins, rejections are skipped, `AggregateError` with `errors` in input order after the last rejection, any kind of reason is kept, empty input, plain values, any iterable and thenables.
- All four: a non-iterable argument gives a rejected promise with a `TypeError` (no synchronous throw), none of the four built-ins is called, and no rejection is left unhandled.

The tests use fake timers and promises that the test settles by hand, so they are instant and never flaky.

## How to run

```bash
npm test -- exercises/js/11-promise-combinators
```

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/11-promise-combinators
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Start with `promiseRace`. It is three lines: `new Promise((resolve, reject) => { ... })`, loop over the inputs, and give each one the same `resolve` and `reject`. A promise settles only once, so the first call wins and the rest do nothing.
2. Use `Promise.resolve(item)` on every input. It turns plain values, promises and thenables into real promises, so you can always call `.then` on the result.
3. Do not use `await` inside the loop. That watches the inputs one by one: a rejection that happens early is missed (not fail-fast), and a later rejection can be left unhandled. Start watching ALL inputs in the loop, with `.then(onFulfilled, onRejected)`.
4. For the order of the results, remember the index of each input: `const index = count++`, then `results[index] = value`. Never use `results.push(value)`: that gives the order of settling.
5. To know when everything is done, count the fulfilled inputs and compare with the number of inputs. Do NOT use `results.length`: if the last input fulfills first, `results.length` is already equal to the number of inputs.
6. The callbacks you pass to `.then` always run later, after your synchronous loop has finished, so the total count is final when they run. The empty input has no callbacks at all, so check it right after the loop.
7. `for (const item of iterable)` already throws a `TypeError` for something that is not iterable. Inside the `new Promise` executor, a thrown error turns into a rejection. That gives you rule 4 for free.
8. `promiseAny` is `promiseAll` turned inside out: the first FULFILLMENT resolves, and the rejections are collected by index. Create the error with `new AggregateError(errors, 'All promises were rejected')`.
9. Always pass BOTH callbacks in one call: `.then(onFulfilled, onRejected)`. The two-step `p.then(f); p.catch(g)` creates a second promise from the first call that inherits the rejection and nobody handles it.

</details>

## Stretch goals

- Write `promiseAny` using only your own `promiseAll`: "flip" every promise (a rejection becomes a fulfillment and the other way round), call `promiseAll`, then flip the result back.
- Write `partition(results)` that splits the output of `promiseAllSettled` into `{ values, errors }`.
- Support async iterables with `for await (const item of iterable)` and think about what changes (the loop is no longer synchronous, so the counting trick of hint 6 needs another way to know "the loop is finished").
- Write `promiseMap(items, mapper, { concurrency })`, a combinator that runs at most `concurrency` tasks at the same time. This is [exercise 15](../15-promise-pool/README.md).

## Interview follow-ups to prepare for

**1. When do you pick `Promise.all` and when `Promise.allSettled` for data fetching? Show an example.**

<details>
<summary>Show answer</summary>

Ask one question: "Is the screen useless if one of these requests fails?"

- If yes, use `Promise.all`. A profile page that needs the user AND their permissions cannot render with only one of them. You want ONE error and you want it early.
- If no, use `Promise.allSettled`. A dashboard with independent widgets should still show the working widgets when one request fails. You inspect each result and render each widget on its own.

```js
async function fetchJson(url) {
  const response = await fetch(url)
  // fetch only rejects on network errors. HTTP 404 or 500 are "successful" responses.
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

async function loadDashboard() {
  const [sales, orders, alerts] = await Promise.allSettled([
    fetchJson('/api/sales'),
    fetchJson('/api/orders'),
    fetchJson('/api/alerts'),
  ])
  return { sales, orders, alerts } // each one is { status, value } or { status, reason }
}
```

```jsx
function Widget({ result, title, children }) {
  return (
    <section>
      <h2>{title}</h2>
      {result.status === 'rejected' ? (
        <p role="alert">Could not load {title}.</p>
      ) : (
        children(result.value)
      )}
    </section>
  )
}
```

Two more points interviewers like: `Promise.all` does not cancel the other requests when one fails (they keep running, use an `AbortController` to really stop them), and both run the requests in parallel. Writing `await a; await b` runs them one after the other, which is slower when they do not depend on each other.

</details>

**2. What is the difference between fail-fast and collecting all errors? Which combinator does which?**

<details>
<summary>Show answer</summary>

A **fail-fast** combinator settles as soon as the final outcome is known and does not wait for the rest:

- `all` settles on the first rejection (or when all fulfill).
- `race` settles on the first settlement of any kind.
- `any` settles on the first fulfillment (or when all reject).

A **collect-all** combinator, `allSettled`, always waits for every input and gives you the full picture.

The cost of fail-fast: you only see one error. The other inputs keep running, and if they fail later their errors are quietly dropped (they are handled, so no "unhandled rejection", but the information is lost). Nothing is cancelled either. The cost of collect-all: you wait for the slowest input, so one hanging request blocks the result. That is why it is often combined with a timeout (see [exercise 12](../12-retry-with-timeout/README.md)).

```js
// Collect everything, then split it
const results = await Promise.allSettled(tasks)
const values = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
const errors = results.filter((r) => r.status === 'rejected').map((r) => r.reason)

// "Fastest working mirror wins" and a readable error when all of them fail
try {
  const data = await Promise.any(mirrors.map((url) => fetchJson(url)))
} catch (error) {
  // error is an AggregateError, error.errors has one reason per mirror, in input order
}
```

Rule of thumb: pick the combinator that matches the question you are asking. "Do I need all of them?" is `all`. "Tell me about each one" is `allSettled`. "Who is first?" is `race`. "Is any of them OK?" is `any`.

</details>

**3. What are the common ways to create an unhandled rejection?**

<details>
<summary>Show answer</summary>

A promise is unhandled when it rejects and nobody has attached a rejection handler by the time the microtask queue is empty. Node (version 15 and later) then terminates the process by default. A browser prints "Uncaught (in promise)" and fires an `unhandledrejection` event on `window`. The usual causes:

1. **Fire and forget**: calling an async function and ignoring the result. `saveDraft()` with no `await` and no `.catch()`.
2. **Forking a chain**: `p.then(a); p.catch(b)`. The call `p.then(a)` returns a new promise that inherits the rejection, and nobody handles THAT promise. Fix: `p.then(a, b)` or `p.then(a).catch(b)`.
3. **Awaiting too late**: starting several promises and then awaiting them one by one.

   ```js
   const a = fetchA()
   const b = fetchB()
   const x = await a // if b rejects while we wait for a, nobody is watching b yet
   const y = await b
   ```

   Fix: `await Promise.all([a, b])` attaches a handler to both at once.
4. **`finally` alone**: `p.finally(cleanup)` returns a new promise with the same outcome, so a rejection of `p` is still unhandled. Add a `.catch()` after it.
5. **Async callbacks**: `items.forEach(async (item) => { ... })`, an `async` event handler, an `async` function given to `setTimeout`. A `try/catch` around the call cannot catch their errors, because the callback returns a promise and the call is already over.
6. **React effects**: `useEffect(() => { loadData() }, [])` where `loadData` can reject and has no `try/catch`.

In this exercise one test catches the most common version of mistake 2 inside a combinator. A global listener (`window.addEventListener('unhandledrejection', ...)`) is a good safety net to REPORT such bugs, but it is not a replacement for handling errors where they happen.

</details>

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (async/await, closures, arrow functions)
- [Data fetching](../../../../03-intermediate/02-data-fetching.md) (loading and error states, parallel requests, aborting)
- [useEffect](../../../../02-hooks/03-useeffect.md) (fetching inside effects, race conditions)
- Related exercises: [12 - Retry with timeout](../12-retry-with-timeout/README.md), [15 - Promise pool](../15-promise-pool/README.md) and [React 15 - Fetch list with retry](../../react/15-fetch-list-retry/README.md)
- Interview round: [Round 5 - JavaScript coding](../../../../05-interview-rounds/round-5-javascript-coding/README.md)
