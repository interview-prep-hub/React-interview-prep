# 07 - Filterable product list

**Level:** Easy | **Time:** 20 minutes | **Topics:** derived state, filtering, controlled inputs

## The task

Build a small product list with two filters: a search box and a category dropdown. The list shows only the products that match **both** filters. The user can see how many products are shown, and can reset everything with one button.

The main lesson of this exercise: the filtered list is **derived state**. You do not store it with `useState`. You calculate it from the data and the two filter values every time the component renders.

Work in [`App.jsx`](./App.jsx). The sample data lives in [`products.js`](./products.js). Do not edit the test file or `products.js`.

The 12 sample products (in this order):

| id | Name | Category | Price |
| --- | --- | --- | --- |
| 1 | Wireless Mouse | Electronics | 24.99 |
| 2 | Mechanical Keyboard | Electronics | 89.5 |
| 3 | USB-C Hub | Electronics | 45 |
| 4 | Noise Cancelling Headphones | Electronics | 199 |
| 5 | Learning React | Books | 34.9 |
| 6 | Clean Code | Books | 29.99 |
| 7 | Eloquent JavaScript | Books | 27.5 |
| 8 | Cotton T-Shirt | Clothing | 14.99 |
| 9 | Denim Jacket | Clothing | 69 |
| 10 | Running Shoes | Clothing | 59.95 |
| 11 | Desk Lamp | Home | 31.5 |
| 12 | Coffee Mug | Home | 12 |

## Requirements

1. `App` accepts an **optional** prop `products`: an array of objects shaped like `{ id, name, category, price }`. When it is not passed, use the 12 products from `products.js`. (The starter already has this line.) Everything below is calculated from this `products` array, never from a second hard-coded copy.
2. Show a heading `Products` (an `<h2>`). The starter already has it.
3. **Search input.** A text input with a `<label>` whose text is **Search** (connect them with `htmlFor` and `id`). It is a controlled input, starts empty, and always shows exactly what the user typed, including spaces.
4. **How the search matches.** A product matches when its **name** contains the search text:
   - letter case is ignored (`MOUSE` finds `Wireless Mouse`)
   - spaces at the start and the end of the search text are ignored (`  mouse  ` finds `Wireless Mouse`)
   - the text can be anywhere in the name (`board` finds `Mechanical Keyboard`)
   - only the name is searched, never the category or the price
   - the search text is plain text, not a pattern (a search for `.` finds nothing, because no name contains a dot, and a search for `(` must not crash)
   - an empty search, or a search made only of spaces, matches every product
5. **Category select.** A `<select>` with a `<label>` whose text is **Category**. It starts on **All**. The options are **All** first, then every category that appears in `products`, each one **once**, in the order they first appear (for the sample data: `Electronics`, `Books`, `Clothing`, `Home`). Choosing a category shows only products of that category. Choosing **All** shows every category. The category list is calculated from `products`, not typed by hand.
6. **Both filters combine.** A product is shown only if it matches the search **and** the category.
7. **The list.** Render a `<ul>` with one `<li>` per visible product, in the same order as in `products`. Each `<li>` shows the product name, its category, and its price with a dollar sign and exactly two decimals (`24.99` shows as `$24.99`, `12` shows as `$12.00`, `89.5` shows as `$89.50`). Give each item a stable `key`: use the product `id`, not the array index (the index changes when the list is filtered).
8. **The count line.** A `<p role="status">` with exactly this text: `Showing X of Y products`. `X` is the number of visible products and `Y` is the total number in `products`. The word is always `products`, even when `X` is 1 (`Showing 1 of 12 products`). This is the only element with `role="status"`.
9. **Empty result.** When no product matches, show a `<p>` with exactly the text `No products found` (no full stop) and do **not** render the `<ul>` at all (an empty list is bad for screen readers). The count line is still shown (`Showing 0 of 12 products`). The same rules apply when `products` itself is an empty array. When at least one product matches, `No products found` must not be on the screen.
10. **Clear filters.** A button with the text **Clear filters** sets the search text back to empty and the category back to **All**. It is always visible and always enabled (even when no filter is active).
11. **Derived, not stored.** The only state in this component is the search text and the selected category. The visible products and the category list are plain values calculated during render. Do not copy them into `useState`, and do not sync them with `useEffect`.

## Acceptance criteria (what the tests check)

- **First render:** a `Products` heading (`<h2>`). All 12 products in the original order, each with its own category and price in the `$24.99` style. The count line reads `Showing 12 of 12 products`. The search box is empty. The select shows **All** and has the options All, Electronics, Books, Clothing, Home (in this order).
- **Search:** a partial match anywhere in the name works (`board`). Case is ignored (`MoUsE`). Spaces around the text are ignored, but the box still shows what was typed. Only spaces means no filter. The words `electronics` and `99` find nothing, because only names are searched (not categories, not prices). The text is taken literally: `.` and `(` find nothing and do not crash, while `-` finds USB-C Hub and Cotton T-Shirt. Deleting the text brings every product back.
- **Category:** Books shows 3 products, Electronics shows 4, Home shows 2, and All shows 12 again. After filtering, every item that is left still shows its own category and price.
- **Stable keys:** when other products are filtered out, a product that stays on the screen keeps the very same `<li>` element (this is what a key built from `product.id` gives you, and a key built from the array index does not).
- **Both filters:** the search `co` matches Clean Code, Cotton T-Shirt and Coffee Mug. Adding the category Books leaves only Clean Code. The category Clothing plus the search `o` leaves Cotton T-Shirt and Running Shoes. The order of choosing does not matter.
- **Empty result:** the search `zzz` shows `No products found`, no list, and `Showing 0 of 12 products`. The same happens for Electronics plus `clean`. The message disappears when something matches again. An empty `products` array (`<App products={[]} />`) shows `No products found`, no list, `Showing 0 of 0 products`, and a select with only **All**.
- **Clear filters:** empties the search box, sets the select to All, and shows all 12 products. It also recovers from an empty result. The button is enabled even when no filter is active.
- **Derived values:** the very first render already contains all 12 products and all 5 select options. (The test renders the component on the server, where effects never run, so a list that is filled by `useEffect` fails.) If the parent passes a different `products` array, the list, the count and the category options update at once, while the search text stays. (A list copied into state would still show the old products.) The tests can only see these symptoms, so follow requirement 11 on purpose.

## How to run

```bash
npm test -- exercises/react/07-filterable-list
```

At the start most tests fail. That is expected. Your goal is to make them all pass.

To see your component in the browser, run `npm run dev` and pick `07-filterable-list` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/07-filterable-list
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. You need exactly two pieces of state: the search text (a string) and the selected category (a string, starting as `'All'`).
2. Calculate the visible list directly in the component body, with no hook: `const visible = products.filter(...)`. React runs the component again after every state change, so the list is always fresh.
3. Prepare the search text once: `const query = search.trim().toLowerCase()`. Then compare with `product.name.toLowerCase().includes(query)`. An empty string is "included" in every string, so an empty query matches everything for free.
4. A product passes the category test when the selected category is `'All'` or when `product.category` equals it.
5. Unique categories in order of first appearance: `[...new Set(products.map((p) => p.category))]`.
6. A controlled input or select needs two props: `value={state}` and `onChange={(e) => setState(e.target.value)}`.
7. For the empty case, use a ternary: `visible.length === 0 ? <p>No products found</p> : <ul>...</ul>`.
8. `price.toFixed(2)` turns `12` into `'12.00'`. Put the `$` in front of it.
9. "Clear filters" is just two setter calls.

</details>

## Stretch goals

- Add a **Sort** select (Name A to Z, Price low to high, Price high to low). Sorting is derived too. Remember that `.sort()` changes the array it is called on, so copy first: `[...visible].sort(...)` or use `toSorted`. Never mutate the `products` prop.
- Highlight the matching part of each name with a `<mark>` element.
- Add a maximum price filter (a number input) that combines with the other two.
- Keep the filters in the URL (`?q=mouse&category=Books`) with `URLSearchParams` and `history.replaceState`, so a page reload keeps them.
- Move the state and the derived values into a custom hook, `useProductFilters(products)`.

## Interview follow-ups to prepare for

1. **Why not store the filtered list in state?** A strong answer covers: the filtered list is a pure function of `products`, the search text and the category. Storing a copy creates a second source of truth that can drift out of sync. Every handler must remember to update it, and it goes stale when the `products` prop changes. Syncing it with `useEffect` adds an extra render and a flash of old content. The rule of thumb: if you can calculate a value from props and state during render, do not store it.
2. **When would `useMemo` help here?** A strong answer covers: with 12 products it would not help, because filtering costs almost nothing and `useMemo` has its own cost. It can help when the list is very large and filtering is measurably slow, when the component re-renders often for unrelated reasons, or when the filtered array is passed to a `React.memo` child that needs a stable reference. Measure with the Profiler first. Also mention that the React Compiler can add this memoization automatically. See [Memoization](../../../../02-hooks/07-memoization.md).
3. **How would you debounce the search?** A strong answer covers: keep two values. The input shows the raw text immediately (so typing never feels slow), and a second, debounced value drives the filtering. Build it with a small `useDebounce(value, delay)` hook: a `setTimeout` inside `useEffect`, with a cleanup that calls `clearTimeout`. Say that debouncing is mainly for network calls or very heavy work, and that for local filtering `useDeferredValue` is often a better fit because it adds no artificial delay. Mention that **Clear filters** should reset the text at once, not after the delay. See [Custom hooks](../../../../02-hooks/08-custom-hooks.md).

## Learn the concepts first

- [Conditional rendering and lists](../../../../01-basics/06-conditional-rendering-and-lists.md)
- [Thinking in React](../../../../01-basics/08-thinking-in-react.md)
- [useState in depth](../../../../02-hooks/02-usestate-in-depth.md)
