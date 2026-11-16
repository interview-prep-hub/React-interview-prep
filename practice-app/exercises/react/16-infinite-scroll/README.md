# 16 - Infinite scroll feed

**Level:** Medium | **Time:** 40 minutes | **Topics:** `IntersectionObserver`, refs, effects, pagination

## The task

Build a feed that loads more items by itself when the user scrolls to the bottom. Items come from a fake server, 10 per page. A small invisible element at the end of the list, called the **sentinel**, tells you when the user has reached the bottom: you watch it with the browser's `IntersectionObserver`, and when it becomes visible you load the next page.

Work in [`App.jsx`](./App.jsx). Do not edit the test file or [`api.js`](./api.js).

The fake server in `api.js` exports one function:

```js
fetchPage(page) // page starts at 1
// returns a promise of: { items: [{ id, title }, ...], hasMore: boolean }
```

The tests replace `api.js` with a mock, so the component must import only `fetchPage` from it.

**How the tests fake the browser.** The test environment (jsdom) has no `IntersectionObserver`, so the test file installs a fake one. The fake never reports anything on its own. The test calls it by hand to say "the sentinel is now visible" or "the sentinel is not visible". It also controls when each page "arrives" from the server. This makes the tests fast and not flaky, but it means your code must really use `new IntersectionObserver(callback)` and `observer.observe(element)`.

## Requirements

1. Import `fetchPage` from `./api.js` (only that name). A page is a promise of `{ items, hasMore }`. Each item is an object `{ id, title }`.
2. The first page (`fetchPage(1)`) is requested automatically when the component mounts, without waiting for any scroll. It is requested **exactly once**, also when the app runs inside `<React.StrictMode>`.
3. Render the items in a `<ul aria-label="Feed">`. The list is always on screen (empty before the first page arrives). Each item is one `<li>` that shows `item.title` as its text. Items stay in the order they arrived.
4. New pages are **appended** to the list. Items that are already loaded never disappear while the next page loads.
5. Render a `<div data-testid="sentinel">` **after** the list (next to it, not inside the `<ul>`). It is present from the first render and stays in the DOM, also after the last page.
6. Create an `IntersectionObserver` inside an effect and observe the sentinel element with it. The observer callback receives an array of entries. An entry with `isIntersecting` set to `true` means the sentinel is visible.
7. When the sentinel becomes visible **and** no page is loading **and** `hasMore` is `true`, request the next page: page 2 after page 1, page 3 after page 2, and so on, always one at a time. When the sentinel is reported as not visible, do nothing.
8. While a request is running (including the very first one), show the text `Loading more...` (exactly this text, with three dots, in its own element such as a `<p>`). When no request is running, this text is not on the page.
9. When a response has `hasMore: false`, show the text `You reached the end` (exactly this text, in its own element) and never call `fetchPage` again, even if the sentinel is reported visible again. Before that moment this text is not on the page.
10. **Never request the same page twice.** This must hold when the observer reports the sentinel several times in a row before React re-renders, and when the component runs in `<React.StrictMode>` (which runs effects twice in development).
11. Clean up: disconnect the observer in the effect cleanup. After the component unmounts there must be no observer left watching the sentinel. While the feed is running there must never be more than one observer watching at the same time (do not leave old observers behind when the effect runs again).

## Acceptance criteria (what the tests check)

- On mount `fetchPage(1)` is called once, `Loading more...` is shown, the list `Feed` is empty, the sentinel is already on the page and there is no end message.
- Reporting the sentinel as visible while page 1 is still loading requests nothing extra.
- When page 1 arrives, the list shows `Item 1` to `Item 10` in order and `Loading more...` disappears.
- The sentinel comes after the list in the DOM and is not a child of it.
- Once the first page is shown, an observer is watching the sentinel.
- When the sentinel becomes visible, `fetchPage(2)` is called; when it arrives, the list shows `Item 1` to `Item 20`.
- `Loading more...` shows while page 2 loads (and the 10 old items stay on screen) and hides when it arrives.
- A "not visible" report does not load anything. A later "visible" report does.
- Reporting the sentinel as visible three times in one go, and once more while the page is still loading, requests page 2 exactly once and shows no duplicate items.
- Pages are requested in the order 1, 2, 3, 4 and the list shows `Item 1` to `Item 40`.
- When page 2 answers with `hasMore: false`, `You reached the end` is shown, `Loading more...` is not, and further "visible" reports request nothing.
- When page 1 itself answers with `hasMore: false`, the end message shows at once and nothing else is requested.
- Unmounting leaves no observer watching.
- While pages keep loading there is never more than one observer watching.
- In `<React.StrictMode>`, page 1 is requested once, page 2 is requested once, and the list has no duplicates.

## How to run

```bash
npm test -- exercises/react/16-infinite-scroll
```

To see your component in the browser, run `npm run dev` and pick `16-infinite-scroll` in the sidebar. The real `api.js` answers after half a second and has 45 items (5 pages), so you can scroll down and watch the feed grow until you see the end message. The playground uses `<React.StrictMode>`, so a double request shows up there too.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/16-infinite-scroll
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. State: the loaded `items` (start with `[]`), `hasMore` (start with `true`) and `loading`. Refs: one for the sentinel DOM node (`useRef(null)` and `ref={...}` on the div).
2. Write one function, `loadNext`, that does all the loading: guard, call `fetchPage`, append, store `hasMore`, switch `loading` off. Append with the functional form `setItems((current) => [...current, ...page.items])`.
3. A state update is not instant. If the observer calls you twice before React re-renders, both calls still read the old `loading` value, so a `loading` check alone lets both through. Keep the "a request is running" flag in a **ref**: `ref.current = true` changes right away, so the second call sees it.
4. The next page number is bookkeeping that nothing on screen depends on, so a ref is enough for it too. Move it forward only after a page arrived successfully.
5. Load page 1 with an effect that calls `loadNext()` on mount. Wrap `loadNext` in `useCallback` with an empty dependency list so it keeps the same identity and can be a dependency of your effects.
6. Do not use the "ignore the result after cleanup" flag (`let ignore = false` ... `return () => { ignore = true }`) for this effect. In StrictMode the first run is cancelled by the cleanup, and the second run is blocked by your lock, so the first page would never be shown. Setting state after unmount is harmless in React 19, so there is nothing to cancel.
7. The observer effect: `const observer = new IntersectionObserver((entries) => { ... })`, then `observer.observe(sentinelRef.current)`, then `return () => observer.disconnect()`. Inside the callback check `entry.isIntersecting`.
8. Decide when the observer should exist. A simple rule that matches the requirements: only watch the sentinel while `hasMore` is true and nothing is loading, and list `hasMore`, `loading` and `loadNext` in the dependency array.
9. Optional, not tested: in a real browser a brand new observer reports the sentinel's position right after `observe()`. If your effect runs again after every load, a page that does not fill the screen makes the feed load the next page by itself. With a single observer that lives forever, this would not happen. Try it in the playground on a tall window.

</details>

## Stretch goals

- Add `rootMargin: '200px'` to the observer options so the next page starts loading **before** the user reaches the bottom.
- Handle failure: if `fetchPage` rejects, show an error message with a **Retry** button. Retry the **same** page number, and make sure a failing server does not cause an endless loop of automatic retries while the sentinel stays visible.
- Move the observer logic into a custom hook, for example `useInfiniteScroll({ enabled, onReach })`, that returns the ref for the sentinel.
- Make appending safe against a server that sends the same item twice (skip items whose `id` is already in the list).
- Add a **Load more** button as a keyboard-friendly fallback for people who cannot scroll easily.

## Interview follow-ups to prepare for

- **IntersectionObserver vs a scroll listener: which one and why?** Be ready to say that a `scroll` handler fires very often on the main thread, so you must throttle it and read layout values like `getBoundingClientRect()`, which can force the browser to recalculate layout. The observer is asynchronous, batched by the browser and does not need throttling. It also gives you `root` (a scroll container other than the page) and `rootMargin` (load early) for free. A scroll listener is still fine when you need the exact scroll position, for example for a progress bar.
- **Why virtualize after thousands of rows?** Infinite scroll solves the loading cost, not the rendering cost. Every page you append stays in the DOM, so after thousands of rows the browser spends memory and time on style calculation, layout and painting, and React has more elements to compare on each update. Virtualization (windowing) renders only the rows near the viewport and keeps a spacer for the rest. Try it yourself in [24 - Virtualized list](../24-virtualized-list/README.md).
- **How to handle errors and retry?** Be ready to describe: catch the rejection and keep an `error` state; stop watching the sentinel while the error is shown (otherwise a visible sentinel retries forever); show a Retry button that requests the same page again, which is why the page counter must move only on success; consider limiting retries with a growing delay (backoff); and abort or ignore the request when the component unmounts. See also [15 - Fetch list with retry](../15-fetch-list-retry/README.md).

## Learn the concepts first

- [useEffect](../../../../02-hooks/03-useeffect.md)
- [useRef](../../../../02-hooks/04-useref.md)
- [Data fetching](../../../../03-intermediate/02-data-fetching.md)
- [Performance optimization](../../../../04-advanced/02-performance-optimization.md)
