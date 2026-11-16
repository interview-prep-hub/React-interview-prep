# 12 - Autocomplete with debounce

**Level:** Medium | **Time:** 45 minutes | **Topics:** debounce, async effects, race conditions, loading states

## The task

Build a country search box. As the user types, wait until they pause for 300 ms, then ask a (fake) server for the countries that match. Show "Loading..." while you wait for the answer, then show the matching names as clickable suggestions. Clicking a suggestion puts the name in the input and closes the list.

The hard part is not the UI. It is timing:

- **Debounce** means "do not react to every keystroke, react once the user has stopped typing". Without it, typing "india" would send 5 requests instead of 1.
- A **race condition** happens when two requests are in flight and the OLDER one finishes LAST. If you show every response as it arrives, the screen can show results for text that is no longer in the box.

Work in [`App.jsx`](./App.jsx). Do not edit the test file.

The folder also has [`api.js`](./api.js), the fake server. It exports `searchCountries(query)`, which returns a promise that resolves after 100 ms with an array of names (for example `["India", "Indonesia"]`). `App.jsx` already imports it:

```js
import { searchCountries } from './api.js'
```

The tests replace `api.js` with a **mock** (a stand-in function the test controls). That lets a test decide what the server answers and exactly when the answer arrives, so the tests never wait for real time.

## Requirements

1. Render a text `<input>` with a `<label>` whose text is **Search countries**. The input starts empty and shows exactly what the user typed, spaces included (never trim the text that is shown in the input, only the query you send, see rule 4).
2. At the start (empty input) nothing else is on screen: no list, no `Loading...`, no `No results`. `searchCountries` is not called.
3. **Debounce.** Call `searchCountries(query)` exactly 300 ms after the user's LAST change of the text. Every new change restarts the 300 ms wait. At 299 ms the API must not have been called yet; at 300 ms it must have been called once, with the final text only. After the answer has arrived, the API is not called again until the text changes. (If the user only adds or removes spaces at the start or end, the query does not change. The tests do not check what you do with the wait in that case.)
4. **Trim.** The `query` you pass is the input text with spaces removed from both ends (`"  in  "` becomes `"in"`). A text that is empty or only spaces counts as an empty query: nothing is shown and the API is not called.
5. **Empty input hides everything.** As soon as the input becomes empty (for example the user selects all and deletes), the list and any `Loading...` or `No results` message disappear, no new API call is made (also when the 300 ms of an earlier text were still running: that wait is cancelled), and an answer that arrives later is ignored.
6. **Loading.** From the moment you have called the API until its answer arrives, show the text `Loading...` (exactly these characters, with three dots). While it is shown there is no list and no `No results`. It is gone once the answer for the current text has arrived. You may show it even earlier (as soon as typing starts); the tests only check it after the API has been called.
7. **Suggestions.** When the answer is a non-empty array, show a plain `<ul>` with one plain `<li>` per name (do not give them a custom `role`), in exactly the order given (do not sort). Each name can be clicked (a `<button>` inside the `<li>` is the accessible choice). The `<li>` elements contain only the name.
8. **No results.** When the answer is an empty array, show exactly the text `No results` (no extra words, no full stop) and no `<ul>`.
9. **Stale responses.** Only the answer for the text that is CURRENTLY in the input may be shown. An answer is stale as soon as the text has changed after the request was sent, even if the next request has not been sent yet (the 300 ms are still running). A stale answer must never appear on screen, in any order of arrival: older answer after the newer one, older answer before the newer one, or older answer when no newer request exists yet. This also holds for a list that is already on screen: when the user types more, that list is stale at once, so remove it immediately. Do not keep it visible while you wait for the new answer.
10. **Picking a suggestion.** Clicking a suggestion sets the input to that exact name and hides the list (and any message). It must NOT start another search: the API is not called again and the list does not come back. This also holds when the name is exactly what the user had already typed (typing `India`, then clicking `India`): the text does not change, but the list must still close. If the user then edits the text, searching works again as normal (rules 3 to 9).
11. **Cleanup.** If the component unmounts while the 300 ms are running, the API is not called. Everything must also work inside `<StrictMode>` (one API call per search).

## Acceptance criteria (what the tests check)

- Initial screen: empty input, no list, no messages, no API call, even after time passes.
- Typing `  in  ` leaves exactly `  in  ` in the input, also after the search ran.
- Typing `ind`: no call at 299 ms, one call `searchCountries('ind')` at 300 ms.
- Typing `a`, then `al` after 200 ms, then `ali` after another 200 ms: no call yet; one call with `'ali'` only, exactly 300 ms after the last change.
- After the answer arrived, waiting 5 more seconds changes nothing: still one call, same list.
- While a request is pending, `Loading...` is visible and there is no list. After it resolves with `['India', 'Indonesia']`, `Loading...` is gone and exactly those two `<li>` are shown.
- The names appear in the order the API gave them (`['Spain', 'Chile', 'Brazil']` stays in that order).
- An empty array shows `No results` and no `<ul>`.
- `"   "` (only spaces) never calls the API; `"  in  "` calls it with `'in'`.
- Clearing the input immediately hides the list, makes no new call, and a response arriving after clearing is not shown.
- Typing `ind`, waiting 200 ms and then clearing the input: the API is never called.
- A list for `ind` is on screen, the user types `indo`: the old list disappears at once (no new call yet). After 300 ms `Loading...` shows with no list, and then the list for `indo`.
- Two requests in flight (for `a` and for `al`): the visible list is always the one for `al`, whichever response arrives first. A response for `a` that arrives after the user typed `al` (before `al` was even sent) is not shown.
- Clicking a suggestion fills the input with that name and hides the list. After 1000 more milliseconds there was still only one API call and the list is still hidden.
- Typing `India` and clicking the suggestion `India` closes the list, and the next edit (`Indi`) searches again.
- Editing the text after picking triggers a new search.
- No API call after unmount; exactly one call per search in `StrictMode`.

## How to run

```bash
npm test -- exercises/react/12-autocomplete-debounce
```

To see your component in the browser, run `npm run dev` and pick `12-autocomplete-debounce` in the sidebar. In the browser the real `api.js` is used, so type `ind` and wait about 400 ms.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/12-autocomplete-debounce
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. A debounce is a timer that you restart. Put it in an effect that depends on the trimmed text, and let the cleanup function cancel it:

   ```jsx
   useEffect(() => {
     const timer = setTimeout(() => {
       // call the API here
     }, 300)
     return () => clearTimeout(timer)
   }, [query])
   ```

   React runs the cleanup of the previous effect run BEFORE it runs the effect again, so every new keystroke cancels the timer of the previous one.

2. For the race condition, make a flag inside the same effect. The cleanup sets it, so it tells you "this run is outdated":

   ```jsx
   let ignore = false
   // ... after `await searchCountries(query)`:
   if (!ignore) { /* save the answer */ }
   return () => { ignore = true; clearTimeout(timer) }
   ```

3. You need to know when to show `Loading...`. Two good options: keep a `loading` boolean, or save the answer TOGETHER with the query it belongs to (`{ query, names }`) and say "loading means the saved query is not the current query". The second option has less state to keep in sync.
4. Do not clear state with `setState` at the top of the effect just to hide things. It is simpler to decide what to render from the current values (for example "only show the list when the query is not empty").
5. When you click a suggestion you call `setText(name)`. That changes the text, so your effect would run again and search for the name you just picked. Remember that the text came from a click (a boolean in state works), turn it off when the user types, and skip searching while it is on. Be careful with a "skip the next run" flag in a ref: if the picked name is the same as the text that was already typed, no new run happens, so the skip would stay armed and swallow the user's next edit.
6. If a test seems stuck, remember the tests use a fake clock. A response can only arrive when the test resolves it, so never rely on real time in your component.

</details>

## Stretch goals

- Handle a failing request: if the promise rejects, show `Something went wrong` instead of crashing (the tests do not check this).
- Replace the `ignore` flag with an `AbortController`: make `searchCountries(query, { signal })` pass the signal to `fetch`, and abort in the effect cleanup. Handle the `AbortError` quietly. (The tests only look at the first argument you pass, so the extra `{ signal }` is fine. Their mock never rejects when you abort, so also check `signal.aborted` after the `await` before you save the answer.)
- Move the debounce into a custom hook, `useDebounce(value, delay)`, and make your effect depend on the debounced value.
- Cache answers in a `Map` so that going back to a query you already searched shows its list immediately.
- Only start searching from 2 characters.
- Keyboard support: ArrowDown and ArrowUp move through the suggestions, Enter picks, Escape closes (the full accessible version is exercise `33-accessible-combobox`).
- To SEE a race in the browser, make the delay in `api.js` longer for short queries (the tests mock `api.js`, so they still pass), then type quickly. Undo the change afterwards.

## Interview follow-ups to prepare for

- **Debounce vs throttle?** Explain both with a timeline of events. Which would you use for a search box, for a scroll handler, for a window resize handler, and for a "Save" button that users double-click? What do "leading" and "trailing" mean?
- **How would AbortController help?** What does it fix that the `ignore` flag does not (the browser stops the request, so no bandwidth is wasted and slow responses do not pile up)? What does it not fix (the server may still do the work)? Where do you call `abort()`, and how do you avoid treating `AbortError` as a real error?
- **Extract `useDebounce`.** Write `useDebounce(value, delay)` and rebuild this component with it. Which values go in the dependency arrays now? Why does the component render one extra time compared with the version that has the timer inside the search effect?

## Learn the concepts first

- [useEffect](../../../../02-hooks/03-useeffect.md)
- [Custom hooks](../../../../02-hooks/08-custom-hooks.md)
- [Data fetching](../../../../03-intermediate/02-data-fetching.md)
