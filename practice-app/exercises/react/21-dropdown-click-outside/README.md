# 21 - Dropdown with click outside

**Level:** Medium | **Time:** 30 minutes | **Topics:** refs, document event listeners, custom hook, accessibility

## The task

Build a custom dropdown (not a native `<select>`). A button shows the selected label. Clicking it opens a list of options. The list closes when the user picks an option, clicks anywhere outside the dropdown, or presses Escape.

You will write two things:

1. A custom hook, `useClickOutside(ref, handler)`, in [`useClickOutside.js`](./useClickOutside.js). It calls `handler` whenever the user clicks outside the element held by `ref`.
2. A `Dropdown` component in [`App.jsx`](./App.jsx) that uses the hook, plus a small `App` that shows it.

The starter already contains the fruit data, some ready-made styles and a few `TODO` hints. Do not edit the test file.

## Requirements

Names to keep exactly: in `App.jsx` the named exports `FRUITS` (given) and `Dropdown`, and the default export `App`. In `useClickOutside.js` the named export `useClickOutside`.

### The hook: `useClickOutside(ref, handler)`

1. `ref` is a ref object, so `ref.current` is a DOM element (or `null`). It must also work with a plain object such as `{ current: someElement }`. `handler` is a function.
2. The hook adds a listener on `document`. When the user presses the mouse on something that is **not** `ref.current` or one of its descendants, it calls `handler(event)` once, passing the DOM event (so `event.target` is the element that was clicked). It does this for every outside click, not only the first one. A click on `ref.current` itself or inside it never calls `handler`. The hook looks at `ref.current` at the moment of the click (not when the effect runs, because the element may be mounted later). If `ref.current` is `null` at that moment, do nothing and do not throw. You may listen for `mousedown` or for `click`: the tests use real clicks, which fire both.
3. It always calls the **newest** `handler` that was passed in, even after a re-render.
4. It **removes its document listener on cleanup**. After the component unmounts, `handler` is never called again. In `StrictMode` (which runs effects twice in development) one click still gives exactly one call.

### The component: `Dropdown`

5. `Dropdown` takes three props: `options` (an array of `{ value, label }` objects), `onChange` (optional function) and `placeholder` (optional string, default `"Select a fruit"`). It keeps the selected value in its own state (it is uncontrolled).
6. It renders a `<button type="button">` (so it never submits a surrounding form). The button text is the selected option's `label`, or the `placeholder` while nothing is selected. (A decorative arrow is fine if you hide it from screen readers with `aria-hidden`.)
7. The button has `aria-haspopup="listbox"` and an `aria-expanded` attribute that is `"true"` while the list is open and `"false"` while it is closed.
8. The list starts closed. Clicking the button toggles it open and closed.
9. While open, render a `<ul role="listbox">` with one `<li role="option">` per option, in the same order as `options`. The text of each option is exactly its `label`. When the list is closed, the `<ul>` is not rendered at all (hiding it with CSS is not enough).
10. Every option has an `aria-selected` attribute: `"true"` on the selected option and `"false"` on all the others (so all `"false"` before anything is chosen). Every option also has `tabIndex={-1}`, so it can receive focus from code and from a click.
11. Clicking an option does all of this: the option becomes selected (the button now shows its label), the list closes, `onChange(option.value)` is called exactly once if `onChange` was given (everything else must still happen when it was not given), and focus moves to the button.
12. A mouse press anywhere outside the dropdown (the button, the list and the options all count as "inside") closes the list. It must not change the selection, must not call `onChange`, and must not move focus to the button (focus stays where the user clicked). As a result, opening a second dropdown closes the first one. A press outside while the list is already closed does nothing: it must not open the list.
13. Pressing **Escape** while the list is open closes it and puts focus on the button. This must work when focus is on the button and also when focus is on one of the options. It does not change the selection, and other keys (such as ArrowDown or a letter) do not close the list.
14. The outside-click logic must come from your `useClickOutside` hook, not be written inline inside `Dropdown`. (The tests cannot check this, but it is the point of the exercise.)

### The page: `App`

15. `App` renders `<h2>Fruit picker</h2>`, then `<Dropdown options={FRUITS} ... />`, then a paragraph `Chosen value: <span data-testid="chosen">...</span>`.
16. The span with `data-testid="chosen"` shows the `value` (not the label) of the last option picked, for example `banana`. Before anything is picked it shows `none`.

## Acceptance criteria (what the tests check)

- At the start the button is named "Select a fruit", has `aria-haspopup="listbox"` and `aria-expanded="false"`, no listbox is on the page (not even a hidden one), and the chosen span shows `none`.
- Clicking the button shows a listbox with the options Apple, Banana, Cherry, Mango (in that order), all `aria-selected="false"`, and sets `aria-expanded="true"`. Clicking the button again closes it; a third click reopens it.
- Picking Banana closes the list, the button now reads "Banana", the button has focus, and the chosen span shows `banana`.
- After picking Cherry and reopening, only Cherry has `aria-selected="true"`. You can change the selection later.
- Used on its own with `options`, `onChange` is called once with the option value (for example `'b'`), and not when the list is merely opened. Without `onChange` the choice still works: the list closes and the button gets focus. A custom `placeholder` is shown until an option is picked. Inside a `<form>`, using the dropdown never submits the form.
- Clicking the heading (outside) closes the list and changes nothing, and an earlier selection survives it. Clicking the heading while the list is closed does not open it, and open-then-outside cycles keep working. Clicking the list itself (not an option) keeps it open. Clicking another input closes the list, leaves focus in that input and does not call `onChange`. Opening a second dropdown closes the first.
- Escape closes the list and leaves focus on the button, both when the button has focus and when an option has focus, and an earlier selection survives it. Other keys (ArrowDown, a letter) leave the list open. An option can take focus.
- The hook calls the handler with the event for an outside click (every time) and not for an inside click, uses the newest handler after a re-render, stops after unmount, and makes one call per click even in `StrictMode`. With `ref.current` set to `null` it does nothing and does not throw, and it notices an element that is assigned to `ref.current` after the hook ran.

## How to run

```bash
npm test -- exercises/react/21-dropdown-click-outside
```

To see your component in the browser, run `npm run dev` and pick `21-dropdown-click-outside` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/21-dropdown-click-outside
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Put the button and the list inside **one wrapper** `<div>` and attach the ref to that wrapper. If the ref were only on the list, a click on the button would count as "outside": the document listener would close the list, and then the button's own `onClick` would toggle it open again.
2. State: one boolean for `open`, and the selected `value` (not the whole option). Work out the label with `options.find(...)` while rendering instead of storing it.
3. The hook is a `useEffect`. Declare the listener function inside the effect, check `ref.current` (it can be `null`) and `ref.current.contains(event.target)` at the moment of the click, call `document.addEventListener(...)`, and **return** a function that calls `document.removeEventListener(...)` with the same function.
4. Which dependencies does that effect read? `ref` and `handler`. If you leave `handler` out, you keep calling an old version of it.
5. For Escape, put an `onKeyDown` on the wrapper. Key events bubble up from the button or from a focused option, so one handler covers both. Check `event.key === 'Escape'`.
6. To move focus, keep a second ref on the button and call `buttonRef.current.focus()`. Do it when you close from Escape and when you close after a choice (the focused option is about to disappear, so focus would otherwise fall back to the page body).
7. `aria-expanded={open}` is enough: React writes a boolean `aria-*` value as the text `"true"` or `"false"`.
8. Add `type="button"` so the button never submits a surrounding form. Use `onChange?.(value)` to call an optional function safely.

</details>

## Stretch goals

- Keyboard navigation inside the list: ArrowDown and ArrowUp move focus between options, Home and End jump to the ends, and Enter or Space picks the focused option. Options already have `tabIndex={-1}`, so you can call `.focus()` on them.
- Close the list when focus leaves the dropdown (for example with the Tab key).
- Give the list an `id` (with `useId`) and point to it from the button with `aria-controls`.
- Make the component controlled: accept `value` and call `onChange`, so the parent owns the selection.
- Make the hook work on touch screens too (for example by listening for `pointerdown` instead of `mousedown`).

## Interview follow-ups to prepare for

- Should an outside-click hook listen for `mousedown` or for `click`? Think about the order of the events, about text selection that starts inside and ends outside, and about what happens when React removes the clicked element from the page before the event reaches `document`. What about touch screens?
- What changes if the list is rendered in a portal (for example into `document.body`)? Is a click inside the list still "inside" for `ref.current.contains(...)`? How do you fix it, and how do React events bubble through portals compared with native DOM events?
- How would you add arrow key navigation? Compare moving real DOM focus between options (roving `tabIndex`) with keeping focus on the button and updating `aria-activedescendant`. Which keys should a listbox support?

## Learn the concepts first

- [useRef](../../../../02-hooks/04-useref.md)
- [Custom hooks](../../../../02-hooks/08-custom-hooks.md)
- [Accessibility](../../../../04-advanced/09-accessibility.md)
