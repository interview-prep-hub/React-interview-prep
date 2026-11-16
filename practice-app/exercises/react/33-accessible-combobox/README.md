# 33 - Accessible combobox

**Level:** Hard | **Time:** 60 minutes | **Topics:** ARIA combobox pattern, keyboard navigation, focus, filtering

## The task

Build a **fruit picker** as an accessible *combobox*. A combobox is a text input with a popup list of suggestions. Mouse users can click a suggestion. Keyboard and screen reader users must be able to do everything too, without ever leaving the text field.

You will follow the ARIA 1.2 "list autocomplete" pattern:

- The `<input>` has `role="combobox"` and a few `aria-*` attributes that describe the popup.
- The popup is a `role="listbox"` that contains `role="option"` items.
- **DOM focus never leaves the input.** The "current" option is only highlighted, and `aria-activedescendant` tells assistive technology which one it is.

Work in [`App.jsx`](./App.jsx). Do not edit the test file. Do not use `<datalist>`, `<select>` or any library.

## Requirements

**Data and filtering**

1. The data is the array `FRUITS` already in the starter, in this exact order: Apple, Apricot, Banana, Blueberry, Cherry, Grape, Grapefruit, Kiwi, Lemon, Mango, Orange, Pineapple (12 fruits).
2. A fruit matches when its name **contains** the input text, ignoring upper and lower case. The text is not trimmed, and the input keeps showing exactly what the user typed (upper and lower case included). An empty text matches all 12 fruits. Matches always stay in the order of the array.
3. The list is always filtered by the text that is in the input right now, including after a fruit was selected. (Selecting "Kiwi" and then opening the list shows only Kiwi.)

**Structure and ARIA**

4. A `<label>` with the text **Fruit** is linked to the input, so the input's accessible name is `Fruit`.
5. The input has `role="combobox"` and these attributes:
   - `aria-expanded`: `"true"` while the listbox is on screen, otherwise `"false"`.
   - `aria-controls`: the `id` of the listbox. It has the same value whether the list is open or closed.
   - `aria-autocomplete="list"`.
   - `aria-activedescendant`: the `id` of the highlighted option. When no option is highlighted the attribute must be **absent** (not an empty string).
6. The popup has `role="listbox"`. It is rendered **only** while it is open **and** has at least one result. Its `id` equals the input's `aria-controls`, and its accessible name is `Fruit` (use `aria-labelledby` pointing at the label).
7. Each result is an element with `role="option"` inside the listbox. Its text is the fruit name, and it has its own unique, non-empty `id`. The highlighted option has `aria-selected="true"`. Every other option has `aria-selected="false"`. At most one option is highlighted at any time. Ids must also stay unique when the component is rendered twice on the same page (this is what `useId` is for).

**Opening and closing**

8. At the start the input is empty, the list is closed and nothing is highlighted. Focusing or clicking the input does **not** open the list.
9. Typing opens the list. Any change of the text counts as typing, including deleting characters. After every change the highlight is cleared (nothing is highlighted until the user presses an arrow key).
10. If the list is open but nothing matches: do not render the listbox (so `aria-expanded` is `"false"`) and show `<p role="status">No results</p>` instead. The message is not in the page at any other time.
11. Add a live region that is **always** in the page: an element with `aria-live="polite"`, `aria-atomic="true"` and `data-testid="live-region"`. The starter already contains it. It must **not** use `role="status"` (only the "No results" message does). While the listbox is on screen its text is `N results available` (for example `5 results available`, but exactly `1 result available` for one). In every other case (list closed, or no results) it is empty.

**Keyboard**

12. **ArrowDown**: if the list is closed, open it and highlight the first option. If it is open, highlight the next option. From the last option, wrap to the first. When nothing is highlighted, the next option is the first. With no results nothing can be highlighted: a closed list still opens (so "No results" appears, see item 10), and an open one stays as it is.
13. **ArrowUp**: while the list is open, highlight the previous option. From the first option, wrap to the last. When nothing is highlighted, go to the last option. While the list is closed it does nothing.
14. **Home** and **End** (only while the listbox is on screen): highlight the first or the last option. While the list is closed they do nothing special (they must not open it).
15. **Enter**: if an option is highlighted, select it. Selecting means: the input text becomes the option's text, the list closes and the highlight is cleared. If nothing is highlighted, Enter does nothing.
16. **Escape**: if the list is open, close it, keep the text and clear the highlight. If the list is already closed, clear the input text. ("Open" also covers the state where "No results" is showing, so the first Escape there hides the message and keeps the text.)
17. **Blur** (focus leaves the input, by Tab or by clicking elsewhere): close the list, clear the highlight, keep the text.

**Mouse and focus**

18. Clicking an option selects it, exactly like Enter.
19. Focus stays in the input at all times. Options must not be focusable or tab stops (no `tabindex` on them), and clicking an option must not move focus out of the input.

**Default browser actions**

20. Call `event.preventDefault()` only for a key press that your code acts on: ArrowDown (it opens a closed list), ArrowUp, Home and End while the listbox is on screen, and Enter while an option is highlighted. A key press that your code ignores must keep its normal browser behaviour: ArrowUp, Home and End while the list is closed, and Enter with nothing highlighted. So in a closed combobox Home and End still move the text caret.

## Acceptance criteria (what the tests check)

- Initial state: labelled combobox, empty, `aria-expanded="false"`, `aria-autocomplete="list"`, no `aria-activedescendant`, a non-empty `aria-controls`, no listbox, no status message. Clicking the input does not open the list. After opening, the listbox `id` equals `aria-controls`.
- Typing `ap` shows Apple, Apricot, Grape, Grapefruit, Pineapple. Typing `RR` shows Blueberry and Cherry. Deleting all text shows all 12 fruits.
- ArrowDown on a closed list opens it with the first option highlighted. Options have unique ids, correct `aria-selected` values and live inside the listbox. `aria-activedescendant` matches the highlighted option.
- ArrowDown and ArrowUp move the highlight and wrap in both directions. ArrowUp does nothing when closed, and jumps to the last option when nothing is highlighted.
- Home and End jump to the first and last option only while the list is open, and arrow keys continue from there.
- Enter selects the highlighted option (value filled, list closed, no `aria-activedescendant`). Enter with no highlight does nothing.
- Escape closes and keeps the text, a second Escape clears the input, and the list can open again from scratch.
- Clicking an option selects it and the input keeps focus.
- Tabbing away or clicking elsewhere closes the list and keeps the text, even when an option was highlighted (Tab never selects it).
- Typing a text with no matches shows `No results` with `role="status"`, no listbox, and navigation keys do nothing harmful. The message disappears on delete, Escape or blur, and ArrowDown on the closed list brings it back.
- Spaces are part of the search text: a single space, or `Apple ` with a trailing space, matches nothing.
- The live region (always the same element, with `aria-live="polite"` and `aria-atomic="true"`) says `5 results available`, `2 results available`, `12 results available`, `1 result available` at the right moments, and is empty when closed or when nothing matches.
- Handled keys are default-prevented and ignored keys are not: Home and End still move the caret while the list is closed.
- Two copies of the component on one page never share an id.
- Typing after navigating clears the highlight (no stale position).
- Focus is on the input after every keyboard action and after a click on an option.

## How to run

```bash
npm test -- exercises/react/33-accessible-combobox
```

To see your component in the browser, run `npm run dev` and pick `33-accessible-combobox` in the sidebar. Try it with only the keyboard, and if you can, with a screen reader (NVDA on Windows is free).

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/33-accessible-combobox
```

Open `App.jsx` and follow the numbered hints in its comments.

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Only three pieces of state are needed: the text, an `open` flag and the highlighted index (use `-1` for "none"). The results, `aria-expanded`, the active option id and the "No results" message are all computed from those during render.
2. `useId()` gives one unique prefix. Build the listbox id and each option id from it (for example `${baseId}-option-${index}`), so ids stay unique even if the component is rendered twice.
3. "Expanded" is not the same as "open". The user can be in the open state while nothing matches, and then there is no listbox to point at.
4. Handle keys with one `onKeyDown` and a `switch` on `event.key`. Call `event.preventDefault()` only for keys you really handle, otherwise Home, End and the arrows would stop moving the text caret when the list is closed.
5. Wrapping: from `-1`, "next" is `0` and "previous" is the last index. A functional update such as `setIndex(i => ...)` keeps repeated key presses correct.
6. Any time the list changes (typing, closing, selecting), reset the highlight in the same handler. A leftover index can point at a different fruit after the list shrinks.
7. Clicking an option fails at first? A real click starts with `mousedown`, which moves focus away from the input. Then your blur handler closes the list before the `click` arrives. Think about which event you can cancel, and on which element.
8. A screen reader announces changes inside a live region that already existed. If you only render the region when it has text, nothing is announced. Keep the element mounted and change only its text.

</details>

## Stretch goals

- Give the listbox a `max-height` with scrolling and keep the highlighted option in view (a `useRef` to the list and `scrollIntoView({ block: 'nearest' })` in an effect).
- Highlight an option when the mouse moves over it, without changing the keyboard behaviour.
- Add a clear button (a real `<button>` with an accessible name) and decide whether it should be a tab stop.
- Bold the part of each option that matches the text, without breaking the option's accessible name.
- Extract the logic into a `useCombobox` hook that returns prop-getters (`getInputProps`, `getOptionProps`) so a different design can reuse it.

## Interview follow-ups to prepare for

- **Why `aria-activedescendant` instead of moving focus to each option?** Think about what happens to typing, the caret, the on-screen keyboard and the single tab stop if focus jumps into the list. Also name the price you pay: you must keep the visual highlight, the scrolling and the ids in sync yourself.
- **How would you load the options asynchronously?** Cover debouncing, cancelling or ignoring out-of-date responses (race conditions), loading and error states, what the live region should say while loading, whether to keep showing the previous results, and caching.
- **How would you turn it into a multi-select?** Think about `aria-multiselectable`, where the chosen values live (chips with remove buttons), what `aria-selected` means now versus the active descendant, whether the list stays open after a choice, Backspace on an empty input, and how a choice is announced.

## Learn the concepts first

- [Accessibility: ARIA, keyboard support, focus and live regions](../../../../04-advanced/09-accessibility.md)
- [useRef](../../../../02-hooks/04-useref.md)
- [Component patterns](../../../../03-intermediate/01-component-patterns.md)
