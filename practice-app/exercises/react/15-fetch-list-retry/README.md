# 15 - Fetch list with retry and race protection

**Level:** Medium | **Time:** 40 minutes | **Topics:** data fetching, loading/error states, race conditions, cleanup

## The task

Build a small user list that loads its data from an API. Two buttons choose the page. While a request is running you show a loading message. If the request fails you show the error and a **Retry** button.

The hard part is the race condition. Network answers do not always arrive in the order you asked for them. If the user clicks "Page 1" and then quickly clicks "Page 2", the answer for page 2 may come back first, and the late answer for page 1 must NOT replace it. The screen must always match the page the user chose last.

Work in [`App.jsx`](./App.jsx). Do not edit the test file or [`api.js`](./api.js).

### The API you get

[`api.js`](./api.js) is a fake server that already exists. You only call it:

```js
import { fetchUsers } from './api.js'

// Resolves to an array of users for page 1 or page 2:
// [{ id: 5, name: 'Margaret Hamilton' }, { id: 6, name: 'Dennis Ritchie' }, ...]
// Rejects with an Error (for example new Error('Network down')) when it fails.
const users = await fetchUsers(2)
```

- `fetchUsers(page)` returns a Promise.
- It optionally accepts a second argument `{ signal }` (an `AbortSignal`) to cancel the request. You do not need it, see the stretch goals.
- In the tests, `api.js` is replaced by a mock whose promises are settled by hand, so the tests decide when and in which order the answers arrive. No real network and no real waiting.

## Requirements

1. **First load.** When the component first appears, it calls `fetchUsers(1)` once. (In development, React's `StrictMode` runs effects twice, so inside the playground you will see two calls. Requirement 10 covers that.)
2. **Page buttons.** Show two buttons with exactly these labels: **Page 1** and **Page 2**. The button of the current page has `aria-pressed="true"` and the other has `aria-pressed="false"`. Page 1 is current at the start. The attribute changes the moment the user clicks, not when the data arrives.
3. **Loading.** While the request for the current page is running, show the text `Loading...` (three dots) inside an element with `role="status"`. While it shows, there is no user list, no error and no Retry button on screen.
4. **Success.** When the request succeeds, show a `<ul>` with the attribute `aria-label="Users"` and one `<li>` per user, in the same order as the array the API returned (do not sort it). The text of each `<li>` is the user's `name` and nothing else. The loading text, the error and the Retry button are gone.
5. **Error.** When the request fails, show an element with `role="alert"` that contains the `message` of the error (for example `Could not load users: Network down`) and a button labelled **Retry**. There is no list and no loading text. The alert contains the message of the current error only.
6. **Retry.** Clicking **Retry** calls `fetchUsers` again for the **current** page (if the user is on page 2, it asks for page 2 again). The screen shows `Loading...` again, with the old error removed. The new request can succeed or fail again, and both are handled as in requirements 4 and 5. The Retry button exists only in the error state. Retry works every time it is shown, not only the first time.
7. **Switching pages.** Clicking the button of a different page calls `fetchUsers` with that page number and shows `Loading...` (the list of the old page disappears at once). Clicking the button of the page that is already current does nothing in every state (list shown, loading, or error): no new request and nothing on the screen changes. There is no cache: every time the user switches to a page, even one seen before, the page is requested again.
8. **No race conditions.** Only the answer to the request the user is waiting for may appear. If the user switches page while a request is still running, the answer (or the error) of the earlier request must be ignored, even when it arrives later than the newer one, and even when it arrives while the new page is still loading. This also holds for two requests for the SAME page: after Page 1, Page 2, Page 1 there are two requests for page 1, and only the last one is wanted. And it holds for a request started by Retry: if the user switches page before the retried request answers, that answer is ignored.
9. **Unmount.** If the component is removed while a request is running, the answer or error that comes back later must change nothing, print nothing to `console.error`, and must not turn into an unhandled promise rejection.
10. **StrictMode.** In development, `StrictMode` mounts the component, unmounts it and mounts it again, so the first request may be made twice. The screen must still end on the data of the newest request, and the answer of the first (abandoned) request must not be shown.

## Acceptance criteria (what the tests check)

- On first render: `fetchUsers` was called once with `1`, `Loading...` is shown, there is no list and no alert, and the Page 1 button has `aria-pressed="true"` (Page 2 has `"false"`).
- After the first request succeeds, the list named "Users" shows the names in the order the API sent them (not sorted) and nothing else (no loading, no alert, no Retry).
- After the first request fails, the alert shows the error message, the Retry button is there, and there is no list and no loading text.
- Retry calls `fetchUsers(1)` again, shows `Loading...`, removes the alert and the Retry button, and then shows the list on success. If the retry fails too, the alert shows the NEW message.
- Retry works twice in a row (fail, Retry, fail, Retry, success: the calls are 1, 1, 1).
- Retry on page 2 asks for page 2 (the calls are 1, 2, 2).
- Choosing another page while an error is shown removes the error and loads the new page.
- Clicking "Page 2" after page 1 has loaded: `fetchUsers(2)` is called, `aria-pressed` moves to Page 2 at once, `Loading...` shows, the old list is gone, then the page 2 names appear.
- Clicking the current page button makes no new request: with the list shown, while loading, and while an error is shown (the screen stays as it was).
- Going Page 1, Page 2, Page 1 requests page 1 twice (the calls are 1, 2, 1).
- Out-of-order answers: the page 2 answer arrives first, the page 1 answer arrives later, and the screen still shows page 2.
- An answer for the old page that arrives while the new page is loading does not show anything: `Loading...` stays.
- An error for the old page, arriving before or after the new page loaded, shows no alert and no Retry button.
- Page 1, Page 2, Page 1: the late answer (or error) of the FIRST request, which was also for page 1, shows nothing. `Loading...` stays until the third request answers.
- Retry, then switch to page 2 before the retried request answers: the late answer of the retried request shows nothing.
- In `StrictMode`, the screen ends on the data of the newest request.
- After unmount, a late success and a late failure both produce no `console.error` call. Every test also checks that no promise rejection was left unhandled.

## How to run

```bash
npm test -- exercises/react/15-fetch-list-retry
```

To see your component in the browser, run `npm run dev` and pick `15-fetch-list-retry` in the sidebar. The fake API makes page 1 slow (about 1.5 seconds) and page 2 fast (about 0.4 seconds), and about one request in four fails. Click "Page 1" and then "Page 2" straight away to see answers arrive out of order. If your code ignores old answers correctly, you will end on page 2.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/15-fetch-list-retry
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. You need state for the current page. For the request itself, one object such as `{ status, users, error }` is easier than three separate pieces of state, because they can never disagree with each other.
2. Fetch inside `useEffect`, and put the page in the dependency array. When the page changes, React runs the cleanup of the old effect and then runs the effect again.
3. You cannot make the effect callback itself `async` (it must return nothing or a cleanup function). Define an `async function load()` inside the effect and call it.
4. For the race: at the top of the effect create a variable that belongs to this run of the effect (for example `let ignore = false`). Return a cleanup function that sets it to `true`. Before you store an answer or an error, check that the variable is still `false`. Every run of the effect has its own copy, so the cleanup of run 1 only silences run 1.
5. Retry does not change the page, so the effect would not run again. Add one more piece of state (a counter you increase on every Retry) and put it in the dependency array too.
6. Handle both outcomes of the Promise (`try`/`catch` around `await`, or `.then` plus `.catch`). A rejection nobody handles is an unhandled rejection, and the tests fail on it.
7. A boolean passed to `aria-pressed` is rendered as the text `"true"` or `"false"`, which is what the tests expect.
8. React 18 and later no longer print the old "state update on an unmounted component" warning. Ignoring late answers is still the right design (the screen stays correct and you do no pointless work). The unmount tests check that nothing is printed and nothing is left unhandled, but they cannot see whether you skipped the state update, so the race tests are the ones that prove your flag works.
9. Do not try to avoid the double request in `StrictMode` with a "did I already fetch?" flag. The first run is cleaned up, so its answer is ignored, and if the second run never fetches, the screen would stay on `Loading...` forever. Write the effect so that running, cleaning up and running again is harmless.
10. Comparing page numbers (for example `if (page === latestPage)`) cannot tell two requests for the same page apart. A flag, a request counter or an `AbortController` that belongs to one run of the effect can.

</details>

## Stretch goals

- Cancel the request instead of only ignoring it. Create an `AbortController` in the effect, pass `{ signal: controller.signal }` as the second argument of `fetchUsers`, and call `controller.abort()` in the cleanup. An aborted request rejects with an error whose `name` is `'AbortError'`: that is not a real failure, so do not show it. The tests pass for this approach too.
- Show `No users on this page.` when the list is empty.
- Extract the logic into a custom hook, `useUsers(page)`, that returns `{ status, users, error, retry }`. `App` then only renders.
- Explain in your own words why the tests for Page 1, Page 2, Page 1 fail when you compare page numbers, and why a flag per effect run fixes it.
- Retry automatically up to 2 times, waiting a little longer each time, before you show the error. Do this in a copy of your file after the tests are green: the tests expect the error to appear right after the first failure. Test the new behaviour with fake timers.

## Interview follow-ups to prepare for

1. **AbortController or an ignore flag: what is the difference, and when would you use each (or both)?**
   Think about: the flag only throws the answer away, the request still runs to the end; `abort()` really cancels the request and saves bandwidth, but it makes the promise reject with an `AbortError` that you must not show as a failure; the flag also works when the thing you wait for cannot be cancelled.
2. **How does TanStack Query remove this boilerplate, and what does it give you that this component still lacks?**
   Think about: a query key per page (`['users', page]`) means answers can never land in the wrong place; a shared cache, request de-duplication, stale-while-revalidate, automatic retry with backoff, refetch on window focus, and ready-made `isPending`, `isError` and `refetch`; and the trade-off of adding a dependency and learning its cache rules.
3. **Where would you put error boundaries in an app like this, and which errors would they NOT catch?**
   Think about: boundaries catch errors thrown while rendering, not errors inside event handlers or inside async code such as a rejected promise in an effect, which is why this component keeps the error in state; you can rethrow a stored error during render to hand it to the nearest boundary; put boundaries around independent parts of the page (a route or a widget) so one failure does not blank the whole screen, and give the fallback a way to reset.

## Learn the concepts first

- [Data fetching](../../../../03-intermediate/02-data-fetching.md)
- [useEffect](../../../../02-hooks/03-useeffect.md)
