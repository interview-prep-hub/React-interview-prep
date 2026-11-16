# 13 - Pagination

**Level:** Medium | **Time:** 30 minutes | **Topics:** derived state, props, edge cases

## The task

Show a list of 53 items ("Item 1" to "Item 53") one page at a time. The user can pick how many items fit on a page, jump to a page number, or step with Previous and Next buttons. A line of text tells them where they are, for example `Showing 11-20 of 53`.

The key idea of this exercise: **keep as little state as possible**. Only two things are real state (the current page and the page size). Everything else, such as the items on screen, the "11-20" text and the number of pages, is calculated from those two during render. This is called derived state.

You will build three small pieces, from the inside out:

| File | What it is |
| --- | --- |
| [`pagination.js`](./pagination.js) | A pure helper function `getPageNumbers`. No React inside. |
| [`Pagination.jsx`](./Pagination.jsx) | A reusable, controlled component. It knows nothing about "items". |
| [`App.jsx`](./App.jsx) | Owns the state, slices the list, renders the select, the summary, the list and `<Pagination />`. |

Note the spelling: `pagination.js` (lower case, the helper) and `Pagination.jsx` (capital P, the component) are two different files.

Work in those three files. Do not edit the test files. A good order is: helper first, then the component, then the App.

## Requirements

### A. The helper `getPageNumbers(page, totalPages, maxVisible = 5)` in `pagination.js`

It decides which page numbers get a button. It is a named export and a pure function (same inputs, same output, nothing else touched).

1. It returns an array of whole numbers in ascending order, each one bigger than the last by exactly 1 (for example `[4, 5, 6, 7, 8]`).
2. The array is never longer than `maxVisible`, and never longer than `totalPages`. When `totalPages` is not more than `maxVisible`, it returns every page: `1` to `totalPages`.
3. The array always contains `page`. When there is room, `page` sits in the middle: the window starts `Math.floor(maxVisible / 2)` pages before `page`.
4. Near the first or last page the window slides so that it stays inside `1` to `totalPages`, and it keeps its full length.
5. `maxVisible` defaults to `5`.
6. Edge cases:
   - If `totalPages` is less than 1 or `maxVisible` is less than 1, return `[]`.
   - If `page` is outside `1` to `totalPages`, treat it as the nearest valid page (`0` and `-4` behave like `1`, `99` behaves like the last page).
   - An even `maxVisible` works with the same rule from point 3. For example `getPageNumbers(5, 10, 4)` returns `[3, 4, 5, 6]`.

Examples with 10 pages and `maxVisible` 5:

| page | result |
| --- | --- |
| 1, 2 or 3 | `[1, 2, 3, 4, 5]` |
| 4 | `[2, 3, 4, 5, 6]` |
| 6 | `[4, 5, 6, 7, 8]` |
| 8, 9 or 10 | `[6, 7, 8, 9, 10]` |

### B. The component `Pagination` in `Pagination.jsx`

It is the default export. Props: `total` (how many items in all), `pageSize` (items per page), `page` (the current page, starting at 1) and `onPageChange` (a function that receives the new page number).

7. The root element is `<nav aria-label="Pagination">`. Inside it there are only buttons, in this order: **Previous**, the numbered page buttons, **Next**. No "first" or "last" buttons and no "..." gaps.
8. The number of pages is `Math.ceil(total / pageSize)`. Calculate it on every render. It is not state.
9. The numbered buttons come from `getPageNumbers(page, totalPages, 5)`, so at most 5 are shown. The text of each button is just the number, and its accessible name must be exactly that number (`"3"`), so do not add an `aria-label` to them. Use the page number as the React `key` of each button, not the array index. When the window slides (for example from `1 2 3 4 5` to `2 3 4 5 6` after a click on `4`), React then keeps the same button element for the same number, so keyboard focus stays on the button the user just pressed.
10. The button for the current page has `aria-current="page"`. No other button has an `aria-current` attribute at all.
11. The accessible name of the first arrow is exactly `Previous` and of the last arrow exactly `Next`. Previous is `disabled` when `page` is 1 or less. Next is `disabled` when `page` is the last page or more.
12. Clicking a numbered button calls `onPageChange(n)` with that number (also for the button of the current page: the parent decides what to do). Previous calls `onPageChange(page - 1)` and Next calls `onPageChange(page + 1)`. The value is a number, not a string. Disabled buttons never call it.
13. The component is **controlled**: it has no state of its own. It shows exactly the `page` it is given. If the parent ignores `onPageChange`, the highlighted page does not move.
14. Edge cases: with `total` 0 there are no numbered buttons and both arrows are disabled. With a single page there is one button, `1`, and both arrows are disabled.

### C. The `App` in `App.jsx`

15. The data is the 53 strings `Item 1` to `Item 53`. The starter already creates them.
16. A `<select>` with the label **Page size** (use a `<label>`). Its options are `5`, `10` and `20`, in that order, and the text of each option is the number. It starts on `10`.
17. The current page starts at `1`.
18. A paragraph with the text `Showing {first}-{last} of {total}`, for example `Showing 1-10 of 53`. On the last page `last` is the last real item, not the end of a full page: with 10 per page, page 6 says `Showing 51-53 of 53`.
19. The visible items are rendered in a `<ul aria-label="Items">`, one `<li>` per item, with the text `Item N`.
20. Render `<Pagination />` with `total` (53), the current `pageSize` and `page`, and an `onPageChange` that sets the page.
21. Changing the page size sets the page back to `1`. This is true even when the old page would still exist with the new size (page 2 with size 20 still goes to page 1).
22. Only `page` and `pageSize` are state. The visible items, `first`, `last` and the page count are derived. The tests cannot check this, but it is the whole point of the exercise.

## Acceptance criteria (what the tests check)

`getPageNumbers.test.js` (the helper):

- All pages are returned when there are few pages, `[1]` for one page, `[]` for none.
- The window is at the start for pages 1 to 3, centred in the middle (for example `4 5 6 7 8` around page 6), and at the end for the last pages.
- For every page of a 20-page list the result has 5 consecutive numbers that include the page.
- The default `maxVisible` is 5, odd values like 3 and 1 work, even values like 4 follow the rule in point 3.
- Pages outside the range, `maxVisible` below 1 and `totalPages` below 1 are handled as described.
- Every call returns a fresh array.
- A sweep over many combinations of `page`, `totalPages` and `maxVisible` (1 to 12 pages, windows of 1 to 8, pages from -1 to 2 past the end) checks the rules: right length, consecutive, inside `1` to `totalPages`, contains the page, centred when there is room and slid to the start or end when there is not.

`Pagination.test.jsx` (the component, driven with a mock `onPageChange`):

- The nav has the buttons Previous, `1` to `5`, Next for 53 items at 10 per page, and nothing else inside it (no "first", "last" or `...`).
- Only the current page has `aria-current="page"`. No other button has the attribute, the arrows included (checked on the first, a middle and the last page).
- Previous and Next are disabled at the two ends and enabled in the middle. A page outside the range counts as the nearest end (page 0 disables Previous, page 99 disables Next).
- The window slides (`4 5 6 7 8` on page 6 of 11) and is shorter when there are few pages.
- One page and zero items are handled (no crash, both arrows disabled).
- Page count follows `total` and `pageSize` when props change.
- `onPageChange` gets the right number (also when the current page's button is clicked), and is not called by a disabled button.
- The component is controlled (it ignores clicks that the parent does not apply).
- With a parent that applies the change, a click on `4` slides the window to `2 3 4 5 6` and keyboard focus stays on the button `4`.

`App.test.jsx` (the whole screen):

- Starts on page 1 with 10 items and `Showing 1-10 of 53`.
- The select offers 5, 10 and 20.
- Next, Previous and numbered buttons change the items and the summary.
- The last page shows `Showing 51-53 of 53` with three items and Next disabled.
- Page size 5 and 20 give the right items, summary and page numbers (page 3 of 20 per page holds 13 items).
- The number window slides to `4 5 6 7 8` on page 6 when the page size is 5.
- Changing the page size always returns to page 1.

## How to run

From the `practice-app` folder:

```bash
npm test -- exercises/react/13-pagination
```

You can run one file at a time, for example only the helper:

```bash
npm test -- exercises/react/13-pagination/getPageNumbers
```

To see your component in the browser, run `npm run dev` and pick `13-pagination` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/13-pagination
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Start with the pure helper. It needs no React, so the tests for it run fast and the error messages are easy to read.
2. For the helper, think of a window sliding along the numbers. Pick where the window starts. The ideal start puts `page` in the middle: `page - Math.floor(count / 2)`, where `count` is how many numbers you will show. Then push the start back inside the allowed range: not below `1`, and not above `totalPages - count + 1`. Then build `count` numbers from that start with `Array.from({ length: count }, (_, i) => start + i)`.
3. `Math.ceil(total / pageSize)` gives the page count: 53 items at 10 per page is `Math.ceil(5.3)`, which is 6.
4. For `aria-current`, a value of `undefined` makes React leave the attribute out: `aria-current={n === page ? 'page' : undefined}`. Give each numbered button `key={n}` (the page number itself), not the index from `map`.
5. In `App`, the index of the first item on the page is `(page - 1) * pageSize`. Then `ITEMS.slice(startIndex, startIndex + pageSize)` gives the visible items (`slice` simply stops at the end of the array).
6. The text "first" is `startIndex + 1`. The text "last" is `Math.min(startIndex + pageSize, ITEMS.length)`.
7. `e.target.value` of a `<select>` is always a string. Convert it with `Number(...)` before you store it.
8. Call both setters in the same change handler: `setPageSize(...)` and `setPage(1)`. React batches them into one re-render.
9. If `Pagination` tests pass but an `App` test fails on `Showing ...`, check that the whole sentence is inside one element (a single `<p>`).

</details>

## Stretch goals

- Move the page and page size logic into a custom hook, `usePagination(items, initialPageSize)`, that returns the visible items, the page, `setPage`, `pageSize`, `setPageSize` and the summary numbers.
- Add "first" and "last" buttons and `...` gaps, like many real sites do (for example `1 ... 4 5 6 ... 11`). Write the unit tests for the new helper first.
- Keep the page and the page size in the URL query string (`?page=3&size=10`) using `URLSearchParams` and `window.history.replaceState`, so a refresh keeps the user in place. What should happen with `?page=999`?
- Make `Pagination` accept a `maxVisible` prop (defaulting to 5) and test it.
- If `total` can shrink (a filter is applied), make sure `page` can never point past the last page.

## Interview follow-ups to prepare for

- **Server-side vs client-side pagination?** Client-side means you download everything and slice in the browser, as you did here. Server-side means the API returns one page at a time. Think about: data size, first-load time, sorting and filtering across all rows, caching, and what changes in this component (a loading state, the `total` now comes from the response, keeping the old page visible while the next one loads).
- **Should the URL be the source of truth for the page?** Think about: the back button, bookmarks and shared links, refresh, and server rendering. How do you read and write the query string, and what do you do with an invalid value such as `?page=-3` or `?page=abc`? When is local state enough (a small widget inside a dialog)?
- **Cursor pagination vs offset pagination?** Offset uses "skip N, take M" and supports jumping to page 7. Cursor pagination uses "give me the 10 items after this id" and is stable and fast on huge or changing data. Think about: duplicate or missing rows when items are inserted while the user pages, cost of large offsets in a database, why numbered page buttons need a total count, and what UI fits cursors best (Next and Previous only, or infinite scroll).

## Learn the concepts first

- [Conditional rendering and lists](../../../../01-basics/06-conditional-rendering-and-lists.md) (keys, empty states)
- [useState in depth](../../../../02-hooks/02-usestate-in-depth.md) (derived state, batching)
- [Component patterns](../../../../03-intermediate/01-component-patterns.md) (controlled components)
- [Custom hooks](../../../../02-hooks/08-custom-hooks.md) (for the stretch goal)
