# 23 - Data table

**Level:** Medium | **Time:** 45 minutes | **Topics:** sorting, filtering, pagination, derived state, `useMemo`

## The task

Build an employee table. It shows 23 employees, 5 per page. The user can click a column header to sort, type in a box to filter, and use **Prev** and **Next** to move between pages.

This is a classic interview task because it looks big but is really one idea: **derived state**. Only three things are real state: the filter text, the sort and the page number. Everything else (the rows on screen, the number of pages, the `aria-sort` of each header) is calculated from those three plus the data, during render. If you store the rows in state as well, you must keep two copies in sync, and that is where the bugs come from.

What the screen looks like:

```text
Filter: [                 ]

  Name        Role                 Salary     Start date
  Ava Thompson   Frontend Engineer   $98,000    2019-03-11
  Liam Chen      Backend Engineer    $105,000   2018-07-23
  ... (5 rows)

[Prev]  Page 1 of 5  [Next]
```

You are given two files:

| File | What it is |
| --- | --- |
| [`employees.js`](./employees.js) | The data: `EMPLOYEES`, an array of 23 employee objects. Do not edit it. |
| [`App.jsx`](./App.jsx) | Your work. It already renders the table skeleton and has numbered comments that tell you where each piece goes. |

Do not edit the test file. A good order to work in:

1. Show the cells in the right format (requirement 4).
2. Pagination (requirements 5 and 19 to 21).
3. Sorting (requirements 6 to 13).
4. Filtering and the empty message (requirements 14 to 18).

An employee looks like this:

```js
{ id: 1, name: 'Ava Thompson', role: 'Frontend Engineer', salary: 98000, startDate: '2019-03-11' }
```

## Requirements

### A. The table

1. `App` is the default export. It takes one **optional** prop, `employees` (an array of employee objects), and uses `EMPLOYEES` from `./employees.js` when the prop is not given. Every employee has `id`, `name`, `role`, `salary` (a number) and `startDate` (an ISO 8601 string such as `'2019-03-11'`). Use the `id` as the React `key` of each row (not the array index), and do not show it.
2. Render `<table aria-label="Employees">` with one header row inside `<thead>` and the data rows inside `<tbody>`. There are four columns, in this order: **Name**, **Role**, **Salary**, **Start date**.
3. Every header cell is a `<th>` that contains a `<button type="button">`. The text of the button is the column label exactly as written above. A sort arrow is welcome, but put it in an element with `aria-hidden="true"` so the accessible name of the button stays the label.
4. Every data row is a `<tr>` with four `<td>` cells, in column order:
   - Name and Role: the text as it is.
   - Salary: a dollar sign and thousands separators, for example `$98,000` and `$105,000`. Use `` `$${salary.toLocaleString('en-US')}` ``. It must work for any whole number, so `950` shows `$950` and `1234567` shows `$1,234,567`.
   - Start date: the calendar date as `YYYY-MM-DD`, in UTC. Use `new Date(startDate).toISOString().slice(0, 10)`. Do not use the local time zone of the computer: `'2021-03-04T23:30:00Z'` is always shown as `2021-03-04`, and `'2021-03-05T00:30:00Z'` as `2021-03-05`.
5. The table shows at most **5 rows** at a time (one page). With the 23 given employees that is 5 pages, and the last page has 3 rows.

### B. Sorting

6. At the start nothing is sorted. The rows appear in the order of the `employees` array, and every `<th>` has `aria-sort="none"`.
7. Clicking a header button sorts by that column, **ascending**. Its `<th>` gets `aria-sort="ascending"`, and the other three `<th>` keep `aria-sort="none"`. Only one column is sorted at a time.
8. Clicking the button of the column that is already sorted flips the direction: ascending becomes descending (`aria-sort="descending"`), and descending becomes ascending again. It keeps toggling between these two. Clicking never takes the table back to unsorted.
9. Clicking a **different** column always starts that column at ascending, even if it was descending the last time you used it.
10. How values are compared:
    - **Name and Role:** as text, ignoring upper and lower case, in a locale-aware way. So `"bob"` sits between `"Alice"` and `"carol"`, and `"Émile"` sits between `"David"` and `"Zoe"` (not after `"Zoe"`). `Intl.Collator` and `localeCompare` do this. The `<` operator does not.
    - **Salary:** as numbers. `69000` comes before `105000`. (As text it would not.)
    - **Start date:** as moments in time, with `new Date(value).getTime()`. Two ISO strings can be in a different order as moments than as text (for example when one has a `+05:00` offset), so comparing the text is wrong.
11. The sort is **stable**: employees that compare as equal (the same role, the same salary) stay in their original relative order in **both** directions. So descending is not "sort ascending, then reverse". It is "compare the other way round".
12. The `employees` array you receive is never changed. The tests pass a frozen array, so an in-place `sort` on it throws an error.
13. Changing the sort does **not** change the page number. If you are on page 2 and click **Salary**, you stay on page 2 (it now shows rows 6 to 10 of the new order).

### C. Filtering

14. Above the table there is a text input with a `<label>` whose text is **Filter** (connect them with `htmlFor` and `id`). It is a controlled input and it starts empty. It always shows exactly what the user typed, including spaces.
15. A row matches when the filter text appears **anywhere inside** the employee's **name or role**, not only at the start of a word (`hom` finds `Thompson`, and `ava t` finds `Ava Thompson`). Ignore upper and lower case. Spaces at the start and end of the filter text are ignored, spaces inside it count. The name and the role are searched one by one, not joined into one text (`chen back` finds nothing, even though Liam Chen is a Backend Engineer). An empty filter matches every row. Salary and start date are **not** searched (typing `98000` finds nothing).
16. The order of work is: filter first, then sort the matching rows, then cut out the current page. The chosen sort stays active while the filter text changes.
17. Every change of the filter text, including clearing the box, goes back to page 1.
18. When no row is left (nothing matches, or the `employees` array is empty), the header row stays, there are no data rows, and a paragraph with exactly the text `No matching employees` is shown below the table. When there are rows, that text is not on the page.

### D. Pagination

19. Below the table (and below the message, if it is shown) there is a button labelled **Prev**, the text `Page X of Y` (for example `Page 1 of 5`) in a single element, and a button labelled **Next**.
20. `Y` is the number of pages for the rows that match the filter: `Math.ceil(matchingRows / 5)`, but never less than 1. So when nothing matches, the text is `Page 1 of 1`. Pages that fill up exactly do not get an empty page after them: 5 rows make 1 page, 6 rows make 2, 10 rows make 2, 11 rows make 3.
21. **Prev** is `disabled` on page 1. **Next** is `disabled` on the last page. Otherwise each one moves exactly one page.

### E. State

22. Keep as little state as possible. The filter text, the sort and the current page are real state. The visible rows, the number of pages and the `aria-sort` values must be **calculated during render**. Do not store the rows, the sorted array or the page count in state. (A test renders the table again with a different `employees` prop and expects the table to follow it.)
23. `useMemo` is optional. If you use it for the filter and sort step, add a short comment that says why. If you do not use it, add a comment that says why not. The tests cannot check this one, but an interviewer will ask.

## Acceptance criteria (what the tests check)

- The table is named `Employees`, with one header row in `<thead>`, the rows in `<tbody>`, and the four column headers in order. Each header holds a `type="button"` button whose accessible name is the label.
- The filter box is above the table and starts empty. The paging controls are below the table (and below the empty message).
- The first page shows the first 5 employees in the original order, with cells like `$98,000` and `2019-03-11`. Any salary gets separators (`$1,234,567`), and the start date is the UTC calendar date whatever the time zone of the computer.
- The page text starts as `Page 1 of 5`, **Prev** is disabled and **Next** is enabled. **Next** and **Prev** move one page. The last page has 3 rows and **Next** is disabled.
- The number of pages is right at the edges: 1, 5, 6, 10 and 11 rows give 1, 1, 2, 2 and 3 pages, and the last page has the right rows.
- Rows are keyed by `id`: when the order changes, React moves the existing `<tr>` elements instead of rewriting them in place.
- All four `aria-sort` values start as `none`. Click once: `ascending`. Click twice: `descending`. Click three times: `ascending`. A different column starts at `ascending` and the old one goes back to `none`.
- Salary is sorted as numbers. Names and roles are sorted ignoring case and with accents handled (`"Émile"` before `"Zoe"`). Start dates are sorted by moment in time, including ISO strings with a time zone offset.
- Equal rows keep their original order in both directions.
- Sorting never changes the array passed in (the test passes a frozen array).
- Sorting keeps the current page number.
- The sort buttons work with the keyboard (**Enter** and **Space**). While a column is sorted, its button is still named exactly by its label (the arrow is `aria-hidden`).
- The filter finds names and roles, ignores case and surrounding spaces, finds text in the middle of a word and across a space inside one field (but not across the name and the role), and does not look at salary or start date. The box keeps showing exactly what was typed.
- The page count is based on the matching rows only. Changing or clearing the filter goes back to page 1, even when the old page number would still exist. The sort stays active while you type.
- `No matching employees` appears when nothing matches (and for an empty `employees` array), the paging buttons are disabled and the text says `Page 1 of 1`. It disappears when rows come back.
- A new `employees` prop changes the table, and the chosen sort still applies to the new data.

## How to run

```bash
npm test -- exercises/react/23-data-table
```

To see your component in the browser, run `npm run dev` and pick `23-data-table` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/23-data-table
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. You need exactly three `useState` calls: the filter text (a string), the sort (for example `{ key: null, direction: 'asc' }`) and the page (a number that starts at 1).
2. Think of the visible rows as a pipeline of plain array steps: `employees` then `filter` then `sort` then `slice`. Each step returns a new array. No step needs state.
3. `Array.prototype.sort` changes the array it is called on. Copy first (`[...rows]`) or use `rows.toSorted(compare)`, which returns a copy. Remember that when the filter is empty, a sloppy `if` can hand you the original array itself.
4. For descending order, do not reverse the result. Multiply the comparison by `-1` (`direction === 'asc' ? 1 : -1`). Equal rows then stay in their original order.
5. A comparison function returns a negative number, zero or a positive number. For numbers it is `a.salary - b.salary`. For dates, compare `new Date(a.startDate).getTime()` with the same for `b`.
6. For text, make one collator and reuse it: `const collator = new Intl.Collator(undefined, { sensitivity: 'accent' })`, then `collator.compare(a.name, b.name)`. `'accent'` means "ignore case, but accents matter".
7. A small table that describes each column (key, label, how to compare, how to show a cell) lets you render the header and the rows with one `map` each.
8. `aria-sort` is a small function of the sort state: if this column is not the sorted one, `"none"`. Otherwise `"ascending"` or `"descending"` from the direction.
9. To go back to page 1 when the filter changes, call `setPage(1)` in the same `onChange` handler that calls `setQuery(...)`. You do not need an effect for this (see "You might not need an effect" in the hooks lessons).
10. Page numbers: `totalPages = Math.max(1, Math.ceil(rows.length / 5))` and the current rows are `rows.slice((page - 1) * 5, page * 5)`.
11. If you use `useMemo`, the dependencies are the data, the filter text and the sort. The page is **not** one of them: moving to the next page does not need a new filter or a new sort.

</details>

## Stretch goals

- Also go back to page 1 when the sort changes. Which behaviour is better for a user? Be ready to defend your choice (and update the matching test in your own copy).
- Add a third click that clears the sort (`aria-sort` goes back to `none`).
- Add a page-size `<select>` (5, 10, 20) and keep the page number valid when the size changes.
- Highlight the part of the name or role that matched the filter with `<mark>`.
- Keep the filter, sort and page in the URL query string, so a reload or a shared link shows the same table.
- Make the page number safe if the `employees` prop shrinks: show the last page instead of an empty one, without an effect.

## Interview follow-ups to prepare for

- **Server-side data.** Your table filters and sorts in the browser. What changes when there are 2 million rows? Where do server-side sorting, filtering and pagination fit, which state is sent to the API (filter text, sort, page), how do you avoid a request on every keystroke, and how do you handle a slow response arriving after a newer one?
- **Stable sort.** What is a stable sort, and why did requirement 11 matter here? Which JavaScript engines guarantee it today? What visible bug do you get if you build descending order with `.reverse()`, and why does sorting by "last name" then by "first name" depend on stability?
- **A bigger grid.** How would you add column resizing, sticky headers and a virtualized body (render only the visible rows)? What does each one change in the DOM and in the state, and when would you stop building it yourself and use a headless table library?

## Learn the concepts first

- [Conditional rendering and lists](../../../../01-basics/06-conditional-rendering-and-lists.md)
- [Memoization](../../../../02-hooks/07-memoization.md)
- [Thinking in React](../../../../01-basics/08-thinking-in-react.md)
