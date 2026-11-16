# 27 - Mini query hook

**Level:** Hard | **Time:** 60 minutes | **Topics:** external store, `useSyncExternalStore`, caching, request deduping

## The task

Libraries such as TanStack Query and SWR fetch data for your components and keep a **cache**, so the components do not have to. In this exercise you build a tiny version of such a library, in one file.

```jsx
function UserName() {
  // Same key + same fetcher in ten components = ONE request.
  const { data, status } = useQuery('user:1', () => fetchUser(1), { staleTime: 5000 })

  if (status === 'pending') return <p>Loading...</p>
  return <p>{data.name}</p>
}
```

Words you will see in this exercise:

- **Query key**: a string that names a piece of data, for example `'user:1'`. Same key means same data.
- **Fetcher**: a function that takes no arguments and returns a promise of the data.
- **Cache**: a module-level `Map` that lives outside React. Every component shares it, and it survives when components unmount.
- **External store**: any data that lives outside React. `useSyncExternalStore` is the hook that lets a component read such data and re-render when it changes.
- **Fresh and stale**: data younger than `staleTime` milliseconds is fresh (still trusted). Older data is stale (shown, but worth checking again).
- **Stale-while-revalidate**: when data is stale, show the old data immediately and fetch new data in the background.
- **Request deduping**: if a request for a key is already running, nobody starts a second one. Everybody waits for the same request.

You work in two files:

| File | Your job |
| --- | --- |
| [`useQuery.js`](./useQuery.js) | Build `useQuery`, `invalidateQueries` and `clearQueryCache` (most of the work) |
| [`App.jsx`](./App.jsx) | A small demo: two components that use the same key |

[`api.js`](./api.js) is a fake API for the demo. Do not edit it, and do not edit the test files.

## Requirements

### Part A: `useQuery.js`

1. Export three named functions from `useQuery.js`: `useQuery`, `invalidateQueries` and `clearQueryCache`.
2. `useQuery(key, fetcher, options)`. `key` is a string. `fetcher` takes no arguments and returns a promise. `options` is optional, and `options.staleTime` is a number of milliseconds that defaults to `0`. Call the fetcher straight away inside your mount effect, not after an `await`: the tests check right after the first render. If the fetcher throws instead of returning a rejected promise, treat that as a failed request.
3. `useQuery` returns an object with these fields:
   - `data`: the result of the latest successful request. It is `undefined` until the first success, and it is **kept** when a later request fails.
   - `error`: the rejection value (the error) of the latest request if it failed, otherwise `null`.
   - `status`: `'pending'` (nothing has settled yet), `'success'` (the latest settled request succeeded) or `'error'` (the latest settled request failed). The status changes **only when a request settles**. While a refetch runs, it keeps its old value.
   - `isFetching`: `true` while a request for this key is running (the first load and background refetches), otherwise `false`.
   - `refetch`: a function that starts a request for this key now (see requirement 11).
4. All components share one **module-level cache**, keyed by `key`. It survives when components unmount. For every key it remembers the data, the error, the status, whether a request is running, and the time of the last success. Read the clock with `Date.now()` (the tests move the clock by replacing the system time; `performance.now()` would not follow it).
5. Use `useSyncExternalStore` to subscribe each component to the cache entry of its key. Do not copy the cache into `useState`: the point of the exercise is to read an external store the way React intends.
6. **When a component mounts, and when its `key` changes**, decide what to do with the entry for that key:
   - There is no successful result yet, or the latest request failed (status is not `'success'`): fetch.
   - The data is **fresh**, meaning its age (`Date.now()` minus the time of the last success) is **less than** `staleTime`: do not fetch. The component shows the cached data on its very first render.
   - The data is **stale**, meaning its age is **greater than or equal to** `staleTime`: show the cached data immediately (status `'success'`) **and** fetch in the background, so `isFetching` is `true`. With the default `staleTime` of `0`, data is always stale.
   - A plain re-render never starts a fetch. This must also hold when the caller passes a brand new inline function as `fetcher` on every render.
7. **Request deduping**: there is at most one running request per key. While one is running, a second mount, `refetch()` or `invalidateQueries()` for the same key must not call the fetcher again. Two components with the same key that mount together call the fetcher **once**. This also holds under `<StrictMode>`, which runs effects twice in development.
8. All components that use the same key always show the same state. When a request starts or settles, every one of them updates. Different keys are completely independent.
9. **Errors**: if the fetcher rejects (or throws), set status to `'error'`, set `error` to the reason, set `isFetching` to `false` and keep the previous `data`. A failed request must never cause an unhandled promise rejection: it is recorded in the cache instead. A later successful request sets status `'success'`, `error` back to `null` and replaces `data`.
10. A request is not cancelled when its component unmounts. If the response arrives after the unmount, store it in the cache anyway.
11. `refetch()` starts a request for the key now, even when the data is fresh (unless one is already running, see requirement 7). It uses the `key` and the `fetcher` of the latest render of the component it came from. The old data stays visible and `isFetching` is `true` until the request settles. You may return a promise from `refetch`, the tests do not look at the return value.
12. `invalidateQueries(key)` does two things. First, it marks the entry as stale, so the next mount refetches even if the data would still be fresh. Second, if at least one mounted component currently uses the key, it refetches right away. If nothing is mounted for the key, it must **not** call the fetcher now. Other keys are not touched. A key that was never used is ignored without an error. The function only receives a key, so it has to run a fetcher that the components passed in earlier. Remember the **newest** fetcher for each key: the one from the latest render of any component that uses the key, even a render that did not start a request. Once the refetch has succeeded, the data counts as fresh again (invalidating is a one-time mark, not a permanent state).
13. `clearQueryCache()` removes every entry, so the next mount of any key behaves like a first load. The tests call it between tests, while nothing is mounted. A request that was started before the cache was cleared may still be running: when it settles, its result must not appear in the new cache.

### Part B: `App.jsx` (the demo)

14. `App` renders an `<h2>` with the text `Mini query`, then the user badge, then the user card, then a button.
15. The badge and the card are **two separate components** that both call `useQuery` with the **same key** `'user:1'` and a fetcher that calls `fetchUser(1)` (imported from `./api.js`). Because they share the key, the page makes **one** request. `fetchUser(1)` resolves with an object like `{ id: 1, name: 'Ada Lovelace', email: 'ada@example.com', request: 1 }`.
16. The badge is a `<section aria-label="User badge">`. Inside it:
    - while the status is `'pending'`: the text `Loading...`
    - when there is data: the user's name (for example `Ada Lovelace`)
    - when the status is `'error'` and there is no data: the text `Unavailable`
    - when there is data and `isFetching` is `true`: also the text `Updating...`
17. The card is a `<section aria-label="User card">`. Inside it:
    - while the status is `'pending'`: the text `Loading...`
    - when there is data, three lines: `Name: Ada Lovelace`, `Email: ada@example.com` and `Request #1` (the `request` field of the data)
    - when there is data and `isFetching` is `true`: also the text `Updating...`
    - when the status is `'error'`: an element with `role="alert"` and the text `Error: ` followed by the error message. Old data, if there is any, stays visible.
    - a button labelled **Refetch** that calls `refetch()`. It is always visible.
18. Below the two sections, a button labelled **Invalidate user** calls `invalidateQueries('user:1')`.

Each text in requirements 16 and 17 must sit in its own element (for example a `<strong>`, `<small>` or `<p>`), because the tests find them by their exact text. `Loading...` and `Updating...` use three plain dots.

## Acceptance criteria (what the tests check)

`useQuery.test.jsx` tests your hook with a small test component. The fetcher is controlled by the test, so there is no network and no real waiting. Only the clock (`Date`) is faked.

- First load: the fetcher is called once on mount, status is `'pending'` with `isFetching` true, then `'success'` with the data, or `'error'` with the message (also when the fetcher throws immediately).
- Re-rendering a component, even with a new inline fetcher each time, does not fetch again.
- Deduping: two components with one key make one request, a late joiner shares it (also after the first component unmounted), `<StrictMode>` still makes one request, `refetch()` or `invalidateQueries()` during a running request does nothing, different keys are separate.
- Caching: the cache outlives components, and cached data is there on the very first render of a new component. Fresh data (999 ms old with `staleTime` 1000) is shown at once without a request. Stale data (1000 ms old) is shown at once and refetched in the background. The age counts from the moment of the last success (not from when the request started, and not from the last mount). The default `staleTime` of 0 always refetches. A background refetch updates every component with the key. A response that arrives after unmount is stored. Changing `key` switches entries, remembers the old one and stops using it.
- Errors: a failed refetch keeps the old data. The status stays `'error'` while retrying and success clears the error. A new mount retries after a failure, even if the old data is still young. `error` is the exact rejection value.
- `refetch()` shows the old data with `isFetching` true, then the new data. It refreshes the key and uses the fetcher of the latest render.
- `invalidateQueries`: refetches mounted keys even when fresh, one request for many components, runs the newest fetcher, no request when nothing is mounted (but the next mount refetches), refreshed data is fresh again, other keys untouched, unknown key is harmless.
- `clearQueryCache()` forgets everything, and a response to a request from before the clear is ignored.

`App.test.jsx` tests the demo with a mocked `fetchUser`:

- One call to `fetchUser(1)` even though two components show the user.
- Both components show `Loading...`, then the data.
- **Refetch** and **Invalidate user** both trigger a second request, both components show `Updating...` and the old data until the new data arrives.
- A failed load shows the alert in the card and `Unavailable` in the badge. A failed refetch keeps the old data and a later success removes the alert.

## How to run

```bash
npm test -- exercises/react/27-mini-query-hook
```

To see your work in the browser, run `npm run dev` and pick `27-mini-query-hook` in the sidebar. The fake API takes 600 ms to answer and every third request fails, so you can click **Refetch** and watch loading, background refetching and the error behaviour. The "Request #" line shows which request produced the data you see.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/27-mini-query-hook
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Start with the data. For each key you need one object (an "entry") that holds the snapshot (`data`, `error`, `status`, `isFetching`), the time of the last success, the running request (a promise or `null`), the latest fetcher, and a `Set` of subscriber callbacks.
2. `useSyncExternalStore(subscribe, getSnapshot)` calls `getSnapshot` on every render and compares the result with `===`. It must return the **same object** until something really changed. So never build a new object inside `getSnapshot`. Instead, when the entry changes, replace the snapshot with a new object (`{ ...old, ...changes }`) and then call every subscriber.
3. `subscribe(callback)` adds the callback to the entry's `Set` and returns a function that removes it. If `subscribe` is a new function on every render, React unsubscribes and subscribes again every time, so wrap it in `useCallback` with `[key]`.
4. Put the fetch decision in an effect that depends only on `key`. The effect needs the latest `fetcher` and `staleTime`, but must not re-run when they change. Two ways: keep the fetcher in a ref, or use `useEffectEvent` (stable since React 19.2). Read the `useEffectEvent` section in the "other hooks" lesson.
5. Deduping is one `if`: when the entry already has a running promise, return it instead of starting a new request. Set the promise when you start, and clear it when the request settles.
6. Wrap the `await fetcher()` in `try/catch` inside an `async` function. Then the promise you store never rejects, and a failure just becomes a cache update (`status: 'error'`, `error`, and **no** change to `data`). An `async` function runs its code up to the first `await` immediately, so the fetcher is still called synchronously.
7. For `invalidateQueries`, set the "time of the last success" back to `0` (so the age is huge and the entry is stale for any `staleTime`). Then, if the entry has at least one subscriber, start a request with the fetcher you remembered. To keep that fetcher up to date, store it in an effect that has no dependency array, so it runs after every render.
8. When a request settles after `clearQueryCache()` ran, do not write into the old entry. A check like "is this entry still the one in the Map?" handles it.
9. In the browser the playground uses `<StrictMode>`, so effects run twice. If you see two requests, your deduping has a gap.

</details>

## Stretch goals

- Accept array keys such as `['user', 1]` by turning them into a string (for example with `JSON.stringify`).
- Add garbage collection: delete an entry some time (`gcTime`) after its last subscriber left, and cancel the deletion if a component subscribes again.
- Add `retry`: when the fetcher fails, try up to 3 more times with growing delays before setting status `'error'`.
- Refetch every stale key with mounted components when the browser tab becomes visible again (the `visibilitychange` event).
- Make `invalidateQueries` safe while a request is already running: the running request may carry old data, so refetch once more after it settles.
- Add `setQueryData(key, data)` to write into the cache by hand, and an `enabled: false` option that skips the automatic fetch.

## Interview follow-ups to prepare for

- **How is this different from TanStack Query?** Name at least five things a production library has that yours does not. Think about retries, cancelling requests, garbage collection, structural sharing (keeping the same object when the data did not change), key hashing, mutations, devtools and server rendering.
- **How would you add garbage collection (`gcTime`)?** Today every entry stays in memory forever. When exactly is an entry unused? Where would the timer start and stop, and what happens when a component mounts again just before the timer fires?
- **How would you add retry and refetch on window focus?** Where would the code for each live? Why does request deduping matter when ten components all react to the same focus event?

## Learn the concepts first

- [Other hooks, including useSyncExternalStore and useEffectEvent](../../../../02-hooks/09-other-hooks.md)
- [Data fetching](../../../../03-intermediate/02-data-fetching.md)
- React internals deep dive (planned)
