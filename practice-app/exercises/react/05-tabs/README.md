# 05 - Tabs (ARIA tabs pattern)

**Level:** Easy | **Time:** 30 minutes | **Topics:** `useState`, ARIA tabs pattern, keyboard handling, roving tabindex

## The task

Build a small tab set with three tabs: **About**, **Pricing** and **Contact**. Only the panel of the active tab is shown. The tabs must work with a mouse and with the keyboard, and screen readers must be able to understand them.

Work in [`App.jsx`](./App.jsx). The `TABS` data and the `App` component are already written for you. You fill in the `Tabs` component. Do not edit the test file.

The ARIA tabs pattern in plain words (ARIA is a set of HTML attributes that describe widgets to assistive technology such as screen readers):

- The row of tabs is a **tablist**. Each tab is a **tab**. The content area is a **tabpanel**.
- A tab says "I am the selected one" with `aria-selected="true"`, and says "this panel belongs to me" with `aria-controls`.
- A panel says "this tab gives me my name" with `aria-labelledby`.
- With the keyboard, you press Tab once to reach the tab row, then use the arrow keys to move inside it. This is called a **roving tabindex**: only the active tab is in the normal Tab order (`tabindex="0"`), the other tabs have `tabindex="-1"`.

## Requirements

1. `App` stays the default export of `App.jsx` and takes no props. It renders a heading `Tabs` and the tab set.
2. There are three tabs, in this order, with this text. Each tab has one panel with the text shown here:

   | Tab text | Panel text |
   | --- | --- |
   | `About` | `Acme builds small, friendly tools for busy teams.` |
   | `Pricing` | `Plans start at 9 dollars per month.` |
   | `Contact` | `Write to hello@acme.test and we reply within a day.` |

3. The element that wraps the tabs has `role="tablist"` and `aria-label="Product information"`.
4. Each tab has `role="tab"`. Its accessible name is its text (About, Pricing, Contact). Use a `<button type="button">` for each tab. The active tab has `aria-selected="true"`, the other two have `aria-selected="false"`.
5. Each tab has a non-empty `id` and a non-empty `aria-controls`. The three `id` values are different from each other, and so are the three `aria-controls` values. `aria-controls` holds the `id` that the tab's panel has when that tab is active. These ids are stable: switching tabs never changes the `id` or `aria-controls` of any tab, and the panel of a tab always gets the same `id` whenever that tab is active.
6. Only the active panel is rendered. The other two panels are not in the DOM at all (do not just hide them with CSS or the `hidden` attribute). There is always exactly one element with `role="tabpanel"`. The rendered panel:
   - has `role="tabpanel"`
   - has an `id` equal to the `aria-controls` of the active tab
   - has `aria-labelledby` equal to the `id` of the active tab (so its accessible name is the tab text)
   - shows the panel text from the table above
7. The first tab (About) is active when the component first renders. Rendering does not move keyboard focus: nothing is focused until the user clicks or presses a key.
8. Clicking a tab makes it the active tab. Clicking the tab that is already active changes nothing.
9. Roving tabindex: the active tab has `tabindex="0"`. The two inactive tabs have `tabindex="-1"`. This must stay true after every change of the active tab.
10. Keyboard support. When a tab has focus:
    - `ArrowRight` goes to the next tab. On the last tab it wraps around to the first tab.
    - `ArrowLeft` goes to the previous tab. On the first tab it wraps around to the last tab.
    - `Home` goes to the first tab. `End` goes to the last tab.
    - "Goes to" means two things at once: the target tab becomes the active tab (its panel shows) AND the target tab receives keyboard focus.
    - Any other key (for example `ArrowDown`, `ArrowUp` or a letter) does nothing.
    - For the four keys that are handled (`ArrowRight`, `ArrowLeft`, `Home`, `End`), call `event.preventDefault()` so the page does not scroll. For every other key, do NOT call it. In particular the Tab key must keep working: it moves focus out of the tab row, and `Shift+Tab` moves it back.
11. If the component is rendered twice on the same page, no `id` is used twice. The `aria-controls` and `aria-labelledby` links of each copy must point to elements of the same copy. Each copy works on its own: clicking or pressing keys in one copy never changes the other copy, and focus always moves to a tab of the copy you are using.

Styling is optional. A common touch is to make the active tab bold so you can see it in the browser.

## Acceptance criteria (what the tests check)

The tests find elements by role and name (`tablist`, `tab`, `tabpanel`), the way a screen reader user would.

- The page has a heading `Tabs`. The tablist is named "Product information" and contains the tabs About, Pricing, Contact in that order. Every tab is a `<button type="button">`.
- At the start About is selected, only one tabpanel exists (not even a hidden one) and it shows the About text. The Pricing and Contact texts are not in the document. Nothing has keyboard focus after the first render.
- Clicking Pricing, then Contact, then About selects the clicked tab and swaps the panel each time.
- For every active tab, `aria-controls` equals the panel `id` and `aria-labelledby` equals the tab `id`.
- The three tabs have different ids and different `aria-controls` values, and they stay the same after you switch tabs.
- With two copies of the component on the page, ids are not shared, and keyboard use in one copy never changes or focuses the other.
- The active tab has `tabindex="0"`, the others `-1`, after clicks and after keyboard moves.
- Pressing the Tab key (and Shift+Tab) repeatedly never stops on an inactive tab, and focus can leave the tab row in both directions.
- `ArrowRight`, `ArrowLeft`, `Home` and `End` select the right tab, show its panel and move focus to it. Both wrap-around cases work. Several quick key presses in a row keep working from the latest tab.
- `ArrowDown`, `ArrowUp` and letter keys change nothing.
- The default action is cancelled for `ArrowRight`, `ArrowLeft`, `Home` and `End`, and for no other key (not `ArrowDown`, `ArrowUp`, a letter or Tab).

## How to run

```bash
npm test -- exercises/react/05-tabs
```

To see your component in the browser, run `npm run dev` and pick `05-tabs` in the sidebar. Try it with the keyboard only: press Tab once, then use the arrow keys, `Home` and `End`.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/05-tabs
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. You need one piece of state: the index of the active tab. Everything else (which panel to show, which tab is selected, which tab has `tabindex="0"`) can be worked out from that index during render.
2. React writes booleans on `aria-*` attributes as the strings `"true"` and `"false"`, so `aria-selected={isActive}` is enough.
3. `tabIndex={-1}` means "focusable with code or a click, but skipped by the Tab key". That is exactly what an inactive tab needs.
4. Call `useId()` once inside `Tabs`, then build every id from it, for example `` `${baseId}-tab-${tab.key}` `` and `` `${baseId}-panel-${tab.key}` ``. Do not use `Math.random()`: it changes on every render.
5. To move focus you need the DOM node of the target tab. Keep an array in a ref (`useRef([])`) and fill it with a callback ref: `ref={(node) => { tabRefs.current[index] = node }}`. All three tabs are always rendered, so the node always exists. In the key handler, set the new index in state and call `.focus()` on that node.
6. Wrap-around with the remainder operator: next is `(index + 1) % count`, previous is `(index - 1 + count) % count`. Adding `count` first keeps the result from going negative.
7. In the handler, use `event.key`. For keys you handle, call `event.preventDefault()` so the page does not scroll. For all other keys, return early without doing anything, so the Tab key keeps working.
8. The panel is just one `<div role="tabpanel">` for `tabs[activeIndex]`. There is no loop over panels and no CSS hiding.

</details>

## Stretch goals

- Make the panel focusable with `tabIndex={0}`. The ARIA guidance recommends this when a panel holds no focusable element, so keyboard users can Tab from the active tab into the content. The tests accept it.
- Build the "manual activation" variant: arrow keys only move focus, and `Enter` or `Space` selects the focused tab.
- Support a vertical tab list: `aria-orientation="vertical"` with `ArrowUp` and `ArrowDown`.
- Add a `defaultIndex` prop, then a controlled version with `activeIndex` and `onChange` props.
- Turn it into compound components: `<Tabs>`, `<Tabs.List>`, `<Tabs.Tab>` and `<Tabs.Panel>` that share state through context.

## Interview follow-ups to prepare for

- What is a roving tabindex? Say why only one tab is in the Tab order, what `tabindex="0"` and `tabindex="-1"` each do, and how this compares with simply giving every tab `tabindex="0"`.
- How would you make Tabs compound components (`Tabs.List`, `Tabs.Tab`, `Tabs.Panel`)? Say where the state lives, how the children find it, how each tab and panel get matching ids, and what you gain over a single component with a `tabs` array prop.
- Should hidden panels stay mounted? Compare rendering only the active panel with keeping every panel in the DOM (hidden with the `hidden` attribute or CSS). Think about form state and scroll position inside a panel, cost of the first render, data fetching in panels, and what screen readers and in-page search see.

## Learn the concepts first

- [State and events](../../../../01-basics/05-state-and-events.md)
- [Accessibility](../../../../04-advanced/09-accessibility.md)
- [Component patterns](../../../../03-intermediate/01-component-patterns.md)
