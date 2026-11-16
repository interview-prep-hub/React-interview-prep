# 02 - FAQ accordion (one panel open at a time)

**Level:** Easy | **Time:** 15 minutes | **Topics:** `useState`, conditional rendering, `aria-expanded`

## The task

Build a small FAQ accordion. It shows four questions. Each question is a header you can click. Clicking a header opens the answer below it. Only one answer can be open at a time: opening a new one closes the one that was open. Clicking the open header closes it again.

You will build a reusable `Accordion` component that receives its data through an `items` prop. `App` just passes it the four FAQ items.

Work in [`App.jsx`](./App.jsx). Do not edit the test file.

## Requirements

1. `App.jsx` defines the FAQ data as a constant: an array of four items, in exactly this order. The starter already contains it. Each item is an object `{ id, title, content }`:

   | id | title | content |
   | --- | --- | --- |
   | `what-is-react` | What is React? | React is a JavaScript library for building user interfaces out of components. |
   | `what-is-jsx` | What is JSX? | JSX is a syntax that lets you write markup inside JavaScript. |
   | `what-is-state` | What is state? | State is data that a component remembers between renders. |
   | `what-are-props` | What are props? | Props are inputs that a parent component passes to a child component. |

2. `App.jsx` contains a component named `Accordion` that receives one prop, `items` (an array of objects shaped like the ones above). It is also a **named export** (`export function Accordion`), so the tests can render it with other data. `App` (the default export) renders `<Accordion items={...} />` with the four FAQ items.
   - `Accordion` shows the items it receives right now. If the parent later passes a different array, the new headers and panels appear (so do not copy `items` into state).
   - `Accordion` treats its props as read-only. It never changes the `items` array or the objects inside it (the tests pass frozen data).
3. For every item, `Accordion` renders a header and a panel:
   - The header is a real `<button>` (not a `<div role="button">`) whose accessible name is exactly the item's `title`, with no extra words. Do not put the panel content inside the button.
   - The panel shows the item's `content`, as the only text inside its element.
4. Every header button has an `aria-expanded` attribute. It is `"true"` when its panel is open and `"false"` when it is closed. It must never be missing. (In React, `aria-expanded={isOpen}` with a boolean renders exactly these strings.)
5. At the start, every panel is closed (all four buttons have `aria-expanded="false"`).
6. Clicking the header of a closed panel opens that panel and closes any other panel that was open. At most one panel is open at any time.
7. Clicking the header of the open panel closes it. Zero panels open is allowed.
8. A closed panel must not be visible. Either do not render it at all, or render it with the `hidden` attribute. (CSS is switched off in the tests, so hiding it only with a CSS class is not detected.)
9. The open item belongs to the `Accordion`. If two `Accordion` components are on the same page, each one keeps its own open item and they do not affect each other.
10. Keyboard users must be able to use it. A real `<button>` already gives you this: Tab moves focus to the next header, and Enter or Space toggles it. The page must contain no other buttons than the four headers.

## Acceptance criteria (what the tests check)

- `App` shows exactly four real `<button>` elements, named exactly after the four titles, in the order of the table above.
- At the start every button has `aria-expanded="false"` and no answer text is visible.
- Clicking "What is JSX?" sets its `aria-expanded` to `"true"` and shows its answer. The other three stay closed.
- With "What is React?" open, clicking "What is state?" closes the first and opens the second.
- Clicking the open header closes it and leaves everything closed.
- Through a longer series of clicks (open, switch, close, reopen, switch) there is never more than one open panel, and the `aria-expanded` values always match what is visible.
- Using only the keyboard: Tab focuses the first header, Enter opens it, Tab then Space on the second header opens that one and closes the first, Space again closes it.
- Rendering `Accordion` directly with four custom (frozen, read-only) items shows four buttons and the same open/close behaviour.
- Rendering `Accordion` again with a different `items` array shows the new items and none of the old ones.
- Two `Accordion` components on one page keep separate open items, also after both are rendered again by their parent.

## How to run

```bash
npm test -- exercises/react/02-accordion-single
```

To see your component in the browser, run `npm run dev` and pick `02-accordion-single` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/02-accordion-single
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. You only need **one** piece of state in `Accordion`: which item is open. Do not keep one boolean per item. With one value, "only one open at a time" comes for free.
2. Think about what value means "nothing is open". The id of an item is a good thing to store when something is open.
3. Do not store `isOpen` anywhere. Work it out while rendering: an item is open when its id equals the id in state.
4. In the click handler there are two cases. Either the clicked item is already the open one (then nothing should be open afterwards), or it is not (then it becomes the open one). When the new state depends on the old state, use the functional form of the setter.
5. `aria-expanded={isOpen}` is enough. React turns `true` and `false` into the strings `"true"` and `"false"`.
6. For the panel, use `{isOpen && <div>...</div>}`. Use `item.id` as the `key` when you map over the items.
7. Define `Accordion` at the top level of the file, not inside `App`. A component defined inside another component is a new component on every render and loses its state.

</details>

## Stretch goals

- Add `aria-controls` to each button and an `id` on its panel (use the `useId` hook so ids stay unique), and give the panel `role="region"` with `aria-labelledby` pointing at the button.
- Add an optional `allowMultiple` prop (default `false`). When it is `true`, several panels can be open at once. Which shape of state do you need now?
- Add an optional `defaultOpenId` prop so the accordion can start with one panel open.
- Make the Arrow Up, Arrow Down, Home and End keys move focus between the headers.
- Show a small `+` or `-` marker in each header without changing the accessible name of the button (hint: hide the marker from screen readers with `aria-hidden`).
- Wrap each header button in a heading element (for example `<h3>`), as the WAI-ARIA accordion pattern recommends, so screen reader users can jump between the questions.

## Interview follow-ups to prepare for

- How would you allow multiple panels to be open at once? What would the state look like (one id, a list of ids, a `Set`), and how would you add an `allowMultiple` prop while keeping "only one open" as the default?
- How do you make an accordion keyboard accessible? What do you get for free from a native `<button>`, and what do `aria-expanded`, `aria-controls` and Arrow, Home and End key support add on top?
- Should the state store the open id or the open index? Think about what happens when items are reordered, filtered or inserted while a panel is open, and what you would use as the `key`.

## Learn the concepts first

- [State and events](../../../../01-basics/05-state-and-events.md)
- [Conditional rendering and lists](../../../../01-basics/06-conditional-rendering-and-lists.md)
- [Accessibility](../../../../04-advanced/09-accessibility.md)
