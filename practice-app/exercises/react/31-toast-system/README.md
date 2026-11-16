# 31 - Toast system

**Level:** Hard | **Time:** 50 minutes | **Topics:** context, portals, timers, cleanup, ids

## The task

A toast is a small message that appears in a corner of the screen ("Saved successfully") and goes away by itself after a few seconds. Build a toast system with three parts:

- `ToastProvider` keeps the list of toasts and draws them.
- `useToast()` is a hook that any component can call to show or dismiss a toast.
- `App` is a small demo page with buttons that show toasts.

Here is how a component will use it:

```jsx
function SaveButton() {
  const { show } = useToast()
  return <button onClick={() => show('Saved!', { type: 'success' })}>Save</button>
}
```

Most of the work is in [`ToastContext.jsx`](./ToastContext.jsx). The demo page is [`App.jsx`](./App.jsx). Do not edit the test file.

The tests use fake timers, so they never wait for real time and finish in a few seconds.

## Requirements

1. **Exports.** `ToastContext.jsx` exports exactly two names: `ToastProvider` and `useToast`. Nothing else is exported, and nothing is added to `window` or any other global.
2. **ToastProvider.** `<ToastProvider>{children}</ToastProvider>` renders its children. Every component inside it can call `useToast()`.
3. **useToast.** It returns an object with exactly two functions: `show(message, options)` and `dismiss(id)`. When it is used outside a `ToastProvider` it throws an `Error` whose message contains the word `ToastProvider`.
4. **show(message, options).**
   - `message` is a string and is shown as plain text.
   - `options` is optional, and so is every field in it. `type` is `"info"`, `"success"` or `"error"` (default `"info"`). `duration` is the number of milliseconds before the toast removes itself (default `3000`). A duration of `0` means **sticky**: the toast never removes itself.
   - It returns the id of the new toast. The id is a string or a number, and it is unique. An id is never reused, not even after its toast is gone.
   - Showing the same message twice creates two separate toasts.
   - Calling `show` several times in a row (for example five times in one click handler) must add every toast.
5. **dismiss(id).** It removes the toast with that id immediately. If the id is unknown, already removed, or belongs to a toast that was dropped (see requirement 9), nothing happens and nothing throws. Several calls in a row (for example `dismiss` twice, or `dismiss` right after `show` in the same click handler) all take effect.
6. **The Notifications region.** `ToastProvider` renders, with a portal into `document.body`, one element with `role="region"` and `aria-label="Notifications"`.
   - It is always rendered, also when there are no toasts. When there are none it is empty. It contains only the toasts.
   - It is a direct child of `document.body`, so it is outside the element where the app is mounted.
   - It is removed when the provider unmounts.
7. **One toast.** Inside the region, every toast is one element with:
   - `data-testid="toast"` and `data-type` set to its type (`"info"`, `"success"` or `"error"`)
   - `role="alert"` when the type is `"error"`, and `role="status"` for `"info"` and `"success"`
   - the message text, and a `<button>` whose accessible name is exactly `Close`. Apart from the text of that button, the message is the only text in the toast.
   - A click on `Close` removes that toast and no other.
8. **Order.** Toasts appear in the order they were created: the oldest first in the DOM, the newest last.
9. **At most 3 visible.** When a 4th toast arrives, the oldest one is dropped. The new toast always appears. The oldest is dropped even if it is sticky. When fewer than 3 toasts are showing nothing is dropped, so a free slot is reused.
10. **Auto-dismiss.** Every toast removes itself after its own `duration`, counted from the moment it appears. A timer is never restarted because another toast arrived, was closed or was dropped. A toast keeps its place in the DOM (the same element) while other toasts come and go.
11. **Cleanup.** When a toast leaves the screen for any reason (Close button, `dismiss(id)`, being dropped, or timing out), no timer of that toast keeps running. When the provider unmounts, all timers are cleared. The tests check this with `vi.getTimerCount()`.
12. **A stable API.** `show` and `dismiss` keep the same identity from one render to the next. A component that only calls `useToast()` does not re-render when toasts are added or removed.
13. **StrictMode and a quiet console.** Everything works inside `<StrictMode>` (one toast per call, ids that match, timers that fire once). React must not report any problem through `console.error` (the tests fail if it does).
14. **The demo App.** `App.jsx` has a default export and needs no props. It renders its content inside a `ToastProvider` and shows four buttons:

| Button label | Message | Options |
| --- | --- | --- |
| `Show info` | `Here is some information` | `{ type: 'info' }` |
| `Show success` | `Saved successfully` | `{ type: 'success' }` |
| `Show error` | `Something went wrong` | `{ type: 'error' }` |
| `Show sticky` | `I stay until you close me` | `{ type: 'info', duration: 0 }` |

## Acceptance criteria (what the tests check)

- The module exports exactly `ToastProvider` and `useToast`. The hook returns exactly `show` and `dismiss`, throws a clear error without a provider, and no new global appears.
- `show` returns a unique id every time (also after the newest toast was closed or timed out), shows the message as plain text, and the same message twice makes two toasts.
- Without options a toast is `info` with `role="status"`. `success` has `role="status"`, `error` has `role="alert"`. Empty options or `undefined` fields fall back to the defaults.
- The Notifications region is always there, empty at first, directly in the page body, outside the app container, and gone after unmount.
- The newest toast is last. A 4th and a 5th toast drop the oldest ones (by creation order, whatever their durations), also when five are shown in one event, and also when the oldest is sticky. A free slot is reused. The DOM element of a toast survives while others change.
- `Close` and `dismiss(id)` remove exactly one toast, also when several calls happen in the same event. Unknown ids, repeated ids and ids of dropped toasts are harmless.
- The default duration is 3000 ms. Custom and per-toast durations work, and toasts that run out at the same moment all go. `duration: 0` stays for an hour. Timers are not restarted when other toasts arrive, are closed or are dropped (not even when a toast moves up one place in the list).
- After closing, dismissing, dropping, timing out and unmounting, no timer is left, and the console stays quiet.
- `show` and `dismiss` keep their identity, and a consumer component does not re-render when toasts change.
- Everything also works in StrictMode.
- In the demo App, each button shows the right message with the right type and role (the sticky one is an `info` toast), toasts disappear after 3 seconds, the sticky one stays, and at most three are visible.

## How to run

```bash
npm test -- exercises/react/31-toast-system
```

To see your component in the browser, run `npm run dev` and pick `31-toast-system` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/31-toast-system
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. A toast is a small object: `{ id, message, type, duration }`. Keep an array of them in state inside `ToastProvider`, newest at the end. Only the provider draws the toasts, so the list does not need to go into the context. The context value only needs `{ show, dismiss }`.
2. Use the functional form of the state setter in both functions: `setToasts((current) => ...)`. Then neither function reads the `toasts` variable, so `useCallback(..., [])` is enough and they keep the same identity. It also makes five calls in a row work.
3. To keep only the three newest toasts, add the new one at the end and then take the last three items with `slice(-3)`.
4. `show` must return the id right away, so create the id inside `show`, not inside the updater function (React may run an updater twice in StrictMode). A counter in a `useRef` works well. Think about why `Date.now()`, `toasts.length` and the array index are all bad ids.
5. Put the timer in the component that draws ONE toast. A `useEffect` can start a `setTimeout` and return a cleanup function that calls `clearTimeout`. React runs that cleanup whenever the toast leaves the screen for any reason, including the provider unmounting. Skip the timer when the duration is `0`.
6. Give each toast `key={toast.id}`. A stable key keeps the same component (and the same running timer) alive while other toasts change.
7. `createPortal(children, document.body)` comes from `react-dom`. A portal still belongs to the React tree, so it can use the same context and the same state. Only its DOM nodes live in `document.body`.
8. Wrap the object you pass as the context value in `useMemo`. If the value is a new object on every render, every consumer re-renders every time a toast is added.
9. Reading the context and throwing when it is missing is the usual way to catch a forgotten provider. A context created with `null` as its default makes that check easy.

</details>

## Stretch goals

- Pause the timer while the pointer is over a toast or while focus is inside it, and continue with the remaining time (not the full duration) afterwards.
- Add a short exit animation: keep a closing toast in the DOM for a moment with a CSS class before removing it.
- Give `ToastProvider` optional props `maxVisible` (default 3) and `position` (for example `"top-right"`).
- Allow an `action` option such as `{ label: 'Undo', onClick }` that renders one more button inside the toast.
- Make toasts callable from outside React, for example `toast.error('Network down')` in a plain API helper (see the third follow-up question).

## Interview follow-ups to prepare for

- **Pause on hover.** People need time to read, and accessibility guidelines ask that time limits can be paused or extended. How would you pause a toast's timer while the mouse is over it (or focus is inside it) and resume with the time that is left, not the full duration? What would you store, in state or in a ref, and what does the cleanup function do?
- **A stable context value.** The provider re-renders every time a toast is added. Why do the components that call `useToast()` not re-render in your solution? What changes if you pass `{ show, dismiss }` as a new object on each render, or put the `toasts` array in the same context? When would you split one context into two (actions and state)?
- **Calling toasts outside React.** How would you let a plain function, such as the error handler of an API client, call `toast.error('...')` without a hook? Compare a small store outside React that components subscribe to (with `useSyncExternalStore`) with saving the provider's `show` function in a module variable. Think about testing, several roots, server rendering and hidden global state.

## Learn the concepts first

- [useContext](../../../../02-hooks/05-usecontext.md)
- [Error boundaries, portals and friends](../../../../03-intermediate/05-error-boundaries-portals-and-friends.md)
- [useEffect](../../../../02-hooks/03-useeffect.md)
