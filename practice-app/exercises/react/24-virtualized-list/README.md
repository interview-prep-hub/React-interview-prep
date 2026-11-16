# 24 - Virtualized list

**Level:** Hard | **Time:** 60 minutes | **Topics:** windowing (virtualization), scroll events, performance, refs

## The task

Build a list that can show **10,000 rows** and still stays fast. A normal list would put 10,000 elements in the page, and the browser would be slow to start, slow to scroll and heavy on memory. A **virtualized** list (also called a **windowed** list) fixes this with one trick: only the rows the user can actually see, plus a few extra rows around them, exist in the DOM. When the user scrolls, you swap which rows exist. To the user it looks like one huge list.

You write two files, in this order:

1. [`VirtualList.jsx`](./VirtualList.jsx): a reusable `VirtualList` component. This is the real work.
2. [`App.jsx`](./App.jsx): uses `VirtualList` to show 10,000 rows (`Row 1` to `Row 10000`) in a container that is 300px tall.

Do not edit the test file.

**How the tests fake the browser.** The test environment (jsdom) has no layout engine: every element is 0px tall, and reading `clientHeight` always gives `0`. So your component must **not** measure the container. It gets the viewport height from the `height` prop. To simulate a user scrolling, the tests set `list.scrollTop = 3000` and then fire a `scroll` event on the list. Your `onScroll` handler must read `scrollTop` from the element that got the event.

### The picture in your head

This is the list scrolled to `scrollTop` 3000 (30px rows, 10,000 items):

```text
 list (height 300px, overflow-y: auto)         <- the window the user looks through
 +-----------------------------------+
 | spacer (height 300000px)          |         <- as tall as ALL rows, so the scrollbar is honest
 |   row 97   (top: 2910px)          |
 |   row 98   (top: 2940px)          |
 |   ...                             |
 |   row 112  (top: 3360px)          |         <- only ~16 rows exist, each placed with top: index * 30
 |                                   |
 +-----------------------------------+
```

## Requirements

### The `VirtualList` component

`VirtualList.jsx` has a **default export**. Props:

| Prop | Meaning |
| --- | --- |
| `items` | The full array of data. |
| `itemHeight` | Height of one row in pixels (a number). |
| `height` | Height of the scrolling container in pixels (a number). |
| `overscan` | Extra rows to render above and below the viewport. Default `3`. |
| `renderItem` | `renderItem(item, index)` returns what to show inside one row. |

1. **The container.** `VirtualList` renders one outer element with `role="list"` and `tabIndex={0}` (so the keyboard can reach it with Tab). Its inline style gives it a height of `height` pixels and `overflow-y: auto` (React: `overflowY: 'auto'`). Use the `style` prop, the tests read inline styles.
2. **The spacer.** Inside the container, render one element with `data-testid="spacer"`. Its inline height is `items.length * itemHeight` pixels, so the scrollbar is as long as the full list would be. It does not change while scrolling. For an empty `items` array its height is `0`. Give it `position: relative`, so the rows can be placed inside it.
3. **The rows are inside the spacer.** Each rendered row is one element with `role="listitem"` and a `data-index` attribute holding its **real index in `items`** (0-based; not its position among the rendered rows).
4. **Rows are placed with inline styles:** `position: absolute`, `top` = `index * itemHeight` pixels, `height` = `itemHeight` pixels (also `left: 0` and `right: 0` so the row is as wide as the list; that part is not tested). Rows are in the DOM in ascending index order.
5. **A row shows what `renderItem` returns.** The content of the row is `renderItem(items[index], index)` and nothing else. `renderItem` is called **only** for rows that are rendered, never for the whole array.
6. **Which rows are rendered.** The component keeps the scroll position in state. Whenever the container's `onScroll` fires, it reads `event.currentTarget.scrollTop` and stores it. The rendered rows are then calculated like this (the same formula for every test):

   ```text
   firstVisible = floor(scrollTop / itemHeight)
   endVisible   = ceil((scrollTop + height) / itemHeight)   (one past the last visible row)
   start        = max(0, firstVisible - overscan)
   end          = min(items.length, endVisible + overscan)   (one past the last rendered row)
   rendered rows = the indexes from start up to end - 1
   ```

   A row that is only half visible counts as visible (that is why one uses `floor` for the top and `ceil` for the bottom). The list never renders an index below `0` or `items.length` or above `items.length - 1`.
7. **Overscan.** The default is `3`. With `overscan={0}` only rows that touch the viewport are rendered. A bigger overscan renders more rows on both sides.
8. **Props drive the layout.** `itemHeight`, `height` and `overscan` can be any numbers (not only 30, 300 and 3), and when a prop changes (`items`, `itemHeight`, `height`, `overscan` or `renderItem`), the next render uses the new value for the spacer height and for the rows, even if the user has scrolled before. Do not copy props into state, and do not change the `items` array you receive (do not `push`, `splice` or `sort` it).
9. **Short lists.** A list with fewer rows than fit in the viewport renders all of its rows. An empty list renders no rows.
10. **Keep the row elements.** Give each row a `key` that is stable for that row (its index works). A row that stays in the window while the user scrolls must keep the **same DOM element**, so the browser does not rebuild rows that did not change.

### The `App` component

11. `App.jsx` has a default export, needs no props, and renders `VirtualList` with:
    - `items`: 10,000 strings, `Row 1`, `Row 2`, ... `Row 10000` (the text of the row at index `i` is `Row ` followed by `i + 1`),
    - `itemHeight` of `30` and `height` of `300`,
    - a `renderItem` that shows the text of the item, so each row's text is exactly `Row 1`, `Row 2`, and so on.
12. Build the 10,000 items **once**, outside the component function, so they are not created again on every render. (The tests cannot see where you build them. This one is about good practice, so check it yourself.)

## Acceptance criteria (what the tests check)

Most tests use 10,000 rows, `itemHeight` 30, `height` 300 and the default overscan of 3. In that setup 10 rows fit in the viewport.

| `scrollTop` | Rows touching the viewport | Rows that must be rendered | Count |
| --- | --- | --- | --- |
| 0 | 0 to 9 | 0 to 12 | 13 |
| 45 | 1 to 11 (two are half visible) | 0 to 14 | 15 |
| 3000 | 100 to 109 | 97 to 112 | 16 |
| 299700 (the very bottom) | 9990 to 9999 | 9987 to 9999 | 13 |

- At the start the list shows `Row 1` to `Row 13` (indexes 0 to 12). `Row 14` and `Row 10000` are not in the page.
- The container has `tabindex="0"`, an inline height of `300px` and `overflow-y: auto`, and the Tab key puts focus on it.
- The spacer is inside the list, is `300000px` tall, has `position: relative`, and contains every row.
- Every row is `position: absolute` with `top` equal to `index * 30` pixels and a height of `30px`.
- Every row has the `listitem` role, and there are 13 of them at the start.
- After scrolling to `3000`, the rows are indexes 97 to 112 (`Row 98` to `Row 113`). `Row 97`, `Row 114` and `Row 1` are not in the page. The spacer is still `300000px`.
- A `scrollTop` that is not a multiple of the row height (`45`, `1005`) gives the window from the formula, clamped at the start of the list.
- A row that shows even a few pixels is rendered. With `overscan={0}`, `scrollTop` `10` and `29` give rows 0 to 10, and `31` gives rows 1 to 11.
- Scrolling back to `0` shows `Row 1` again.
- At `scrollTop` `299700` the last row `Row 10000` is shown and nothing past it.
- At many different scroll positions (0, 1, 29, 30, 31, 100, 1234, 50000, 150015, 299670, 299700) **fewer than 30 rows** are rendered, and every row inside the viewport is among them.
- With `overscan={0}`: rows 0 to 9 at the top and rows 1 to 11 at `scrollTop` 45. With `overscan={10}`: rows 0 to 19 at the top and rows 90 to 119 at `scrollTop` 3000.
- With `itemHeight={50}`, `height={200}`, `overscan={1}` and 100 items: the spacer is `5000px`, rows 0 to 4 are rendered, the row with index 2 has `top: 100px`; after scrolling to `500` rows 9 to 14 are rendered.
- `renderItem` is called with `('Row 4', 3)` for the fourth row and with `('Row 101', 100)` after scrolling to 3000. Before any scrolling it is never called with an index above 12.
- A row that stays in the window after a small scroll (`3000` to `3030`) is the very same DOM element as before.
- A list of 5 items renders 5 rows and a `150px` spacer. An empty list renders no rows and a `0px` spacer.
- Replacing `items` with `['Apple', 'Banana', 'Cherry']` shows exactly those three rows and a `90px` spacer.
- After scrolling to `3000`, changing the props gives the window from the formula with the new values: `height` 600 gives rows 97 to 122; `height` 600 and `itemHeight` 60 give rows 47 to 62 and a `600000px` spacer; adding `overscan={0}` gives rows 50 to 59; a new `renderItem` is used for the rows on screen.
- A frozen `items` array (one that throws when you try to change it) still works, and it is not changed.
- `App` shows rows 0 to 12 of a `300px` tall list with a `300000px` spacer, the text of every row is exactly `Row ` followed by the number (the first row is `Row 1`), it keeps fewer than 30 rows in the page after scrolling to `3000` and to `299700`, and its list can be focused with Tab.

## How to run

```bash
npm test -- exercises/react/24-virtualized-list
```

To see your component in the browser, run `npm run dev` and pick `24-virtualized-list` in the sidebar. A good experiment: open the browser developer tools (F12), go to the Elements panel, expand the list and scroll. You will see rows appear and disappear, while the number of rows stays around 16.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/24-virtualized-list
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. You need exactly one piece of state: `scrollTop`, starting at `0`. Do not store the rendered rows in state. They can be calculated from `scrollTop` and the props on every render. Storing something you can calculate is a classic source of bugs.
2. Put `onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}` on the container, the element that scrolls. Not on the rows.
3. Do the math with numbers on paper first. With `itemHeight` 30, `height` 300 and `scrollTop` 3000: the first visible row is `3000 / 30 = 100` and the end of the visible rows is `3300 / 30 = 110`. Overscan 3 gives `97` and `113`, so you render the indexes 97 up to 112.
4. Use `Math.floor` for the first row and `Math.ceil` for the end. Then clamp: `Math.max(0, ...)` for the start and `Math.min(items.length, ...)` for the end. Without the clamps you ask for `items[-3]` at the top of the list.
5. A plain `for (let index = start; index < end; index++)` loop that pushes elements into an array is fine. You do not need `useMemo`, the loop runs about 15 times.
6. Why does `top: index * itemHeight` work? An absolutely positioned element is placed relative to its closest ancestor that has a `position` other than `static`. That is why the spacer gets `position: relative`. The spacer scrolls together with the content, so the row stays at the right place.
7. Why a spacer? The rows are absolutely positioned, so they take no space in the layout. Without a tall spacer the container would have nothing to scroll. The spacer is what makes the scrollbar the size of the full list.
8. `key={index}` is what keeps the DOM element of a row alive while it stays in the window. If you used the position inside the rendered slice as the key (0, 1, 2, ...), React would reuse the same elements for different data, which defeats part of the purpose.
9. Do not measure the container with `clientHeight` or `getBoundingClientRect()`. In the test environment they return `0`. Use the `height` prop. (In a real app you often measure, and pass the result in as `height`.)
10. In `App.jsx`, write `Array.from({ length: 10000 }, (_, i) => ...)` at the top of the file, outside the component, and pass that array in.
11. If your test run is very slow or tests time out, you are probably rendering all 10,000 rows. Check that your loop uses `start` and `end`.

</details>

## Stretch goals

The tests expect the window to change right after the scroll event, in the same render. Some stretch goals (the `requestAnimationFrame` one in particular) delay the update, so they can make the tests fail. Keep a copy of your working version before you try them.

- **Jump to a row.** Add a number input and a **Go** button in `App`. Pressing it scrolls the list so that the chosen row is at the top. For this, `VirtualList` has to give `App` access to the scrolling element: accept a `ref` prop and put it on the container (in React 19 `ref` is a normal prop for function components, no `forwardRef` needed). Then `listRef.current.scrollTop = (row - 1) * itemHeight`. The browser fires a scroll event by itself, so your normal handler updates the window.
- **Fewer renders.** Right now every scroll event sets state, even when the rendered window did not change (for example, scrolling from 3000 to 3001). Store only `start` and `end` in state, or compare before you set, and count renders with a counter in a ref or the React Profiler to prove the difference.
- **Throttle with `requestAnimationFrame`.** Collect the latest `scrollTop` and update state at most once per frame.
- **Accessibility for screen readers.** The rows that do not exist cannot be announced. Add `aria-setsize={items.length}` and `aria-posinset={index + 1}` to each row so assistive technology knows the full size and the position of each row.
- **Measure the gain.** Temporarily render all 10,000 rows without windowing and compare the start-up time and scroll smoothness in the browser's Performance panel.
- **Variable row heights.** Let `itemHeight` also be a function `(index) => number`. You will need the top offset of every row (a running total of the heights) and a way to find the first visible row quickly, for example with binary search.

## Interview follow-ups to prepare for

- **How do you handle variable-height rows?** Be ready to explain why the fixed-height version is so simple: the position of any row is `index * itemHeight`, and the first visible row is one division away. With variable heights you do not know a row's `top` until you know the heights of all rows above it. The usual answer has four parts: (1) keep an array of **offsets** (a running total of the heights), with an **estimated** height for rows you have not seen yet; (2) find the first visible row with **binary search** over the offsets instead of a division; (3) after a row renders, **measure** it (a ref and `ResizeObserver`, or `useLayoutEffect` so the user does not see a jump), store the real height, and recalculate the offsets below it; (4) when a row above the viewport changes size, adjust `scrollTop` by the difference so the content under the user's eyes does not jump (scroll anchoring). Total height changes while measuring, which is why the scrollbar can wobble a little. Mention the trade-off: more code, more bugs, so use a library when heights vary.
- **react-window and TanStack Virtual: what do they add over your component?** They are the same idea, tested on many browsers and edge cases. Between them they add variable and dynamic sizes with measuring, horizontal lists and 2D grids, scrolling to an index or an offset from code, using the **page** (the window) as the scroller instead of an inner container, sticky headers, scroll restoration, an `isScrolling` flag to show cheap placeholders during fast scrolling, and care for rendering and re-render cost. Know the difference in style: react-window gives you ready-made list and grid components, while TanStack Virtual is **headless**: its `useVirtualizer` hook only tells you which items to render and how tall the total is, and you write the markup and styles yourself. Also say when you would not add a library: a few hundred simple rows do not need virtualization, and the cost of the extra complexity can be larger than the gain.
- **Why overscan?** Scrolling happens in the browser first and React hears about it afterwards (the `scroll` event, then a render, then a commit). If you rendered only the exact visible rows, a fast scroll would show empty space for a moment before the new rows appear, because they are not there yet. Overscan renders a small buffer above and below, so rows are already in the page when they scroll into view. The trade-off: a bigger overscan means more elements and more work on each update, a smaller one means more flicker. Small numbers like 3 to 10 rows are typical. Related drawbacks of virtualization that a strong candidate also mentions: Ctrl+F (find in page) cannot find rows that are not in the DOM, screen readers only know about the rendered rows unless you add `aria-setsize` and `aria-posinset`, and a focused row that scrolls out of the window is removed from the DOM and loses focus.

## Learn the concepts first

- [Performance optimization](../../../../04-advanced/02-performance-optimization.md)
- Advanced patterns (planned)
- [useRef](../../../../02-hooks/04-useref.md)

Related exercises: [16 - Infinite scroll feed](../16-infinite-scroll/README.md) (loading cost vs rendering cost) and [23 - Data table](../23-data-table/README.md).
