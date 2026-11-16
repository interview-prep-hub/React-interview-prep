# 06 - Star rating

**Level:** Easy | **Time:** 20 minutes | **Topics:** `useState`, hover state, derived values, accessible buttons

## The task

Build a star rating widget, like the one you see under a product or a movie. The user clicks a star to give a rating. While the mouse is over a star, the stars up to it light up as a preview. Clicking the same star twice removes the rating.

Work in [`App.jsx`](./App.jsx). Do not edit the test file.

`App` takes two optional props, `max` and `onChange`. The tests render it with no props, with only `max` (for example `<App max={10} />`), and with only `onChange` (also inside `<StrictMode>`). The playground renders it with no props.

## Requirements

1. **Group.** Put all the stars inside one wrapper element with `role="group"` and `aria-label="Star rating"`.
2. **One button per star.** Inside the group, render `max` real `<button>` elements, star 1 first. The prop `max` is optional and defaults to `5`.
3. **Labels.** Star `n` has the attribute `aria-label` set to `n stars`, except star 1, which is singular. So the labels are exactly `1 star`, `2 stars`, `3 stars`, and so on (lowercase, one space). The tests find the stars by these names.
4. **Filled flag.** Every star button has a `data-filled` attribute. Its value is the text `true` when the star looks filled and the text `false` when it looks empty. What you draw inside the button (the characters `★` and `☆`, an SVG, a colour) is up to you. The tests only read `data-filled`.
5. **Start.** There is no rating yet, so every star has `data-filled="false"`.
6. **Click to rate.** Clicking star `n` saves the rating `n`. Clicking a different star later replaces the rating, whether the new star is higher or lower.
7. **Click again to clear.** Clicking the star that is already the saved rating clears the rating back to `0`.
8. **Text.** Show the saved rating as plain text inside one element (for example a `<p>`, with no other tags inside it):
   - `Rated N out of M`, where `N` is the saved rating and `M` is `max`. Examples: `Rated 3 out of 5`, `Rated 7 out of 10`.
   - `Not rated yet` when the saved rating is `0`.
   - This text always shows the SAVED rating. It never shows the hover preview.
9. **No hover.** When the pointer is not on a star, stars `1` to the saved rating have `data-filled="true"` and the rest have `"false"`.
10. **Hover preview.** While the pointer is over star `n`, stars `1` to `n` have `data-filled="true"` and the rest have `"false"`. This is true whatever the saved rating is. For example, with a saved rating of 3, hovering star 1 shows only one filled star, and hovering star 5 shows five.
    - The preview changes nothing else: the saved rating, the text and `onChange` stay as they were.
    - Moving the pointer from one star to another moves the preview.
    - When the pointer leaves the stars, the stars show the saved rating again (requirement 9).
    - What the stars show right after a click, while the pointer is still resting on that star, is up to you. Both choices are fine. The tests move the pointer away before they check the saved stars.
11. **`onChange`.** It is an optional function prop. After every click, call it exactly once with the new saved rating (`0` when the click cleared the rating). Hovering never calls it. The component must work, and must not throw, when `onChange` is not passed.
    - "Exactly once" also holds inside `<StrictMode>`, which in development runs state updater functions twice. So call `onChange` from the click handler, not from inside a state updater function.
12. **Keyboard.** Because the stars are real buttons, a user can press Tab to focus a star and Enter or Space to choose it. You get this for free as long as you use `<button>`, so do not replace the buttons with `<div>` or `<span>`. The tests check that every star is a `<button>` element. The stars are the first thing you can tab to on the page, so do not put another button or input before them.

## Acceptance criteria (what the tests check)

- Initial screen: a group named `Star rating` with five `<button>` elements inside it, all `data-filled="false"`, and the text `Not rated yet`. The tests only count the buttons inside the group.
- The button labels are `1 star`, `2 stars`, `3 stars`, `4 stars`, `5 stars`, in that order.
- Clicking `3 stars` shows `Rated 3 out of 5` and fills stars 1 to 3 only.
- Clicking another star replaces the rating (2, then 5, then 1).
- Clicking the selected star again shows `Not rated yet` and empties every star. Clicking it once more rates it again.
- Hovering `4 stars` fills stars 1 to 4 while the text still says `Not rated yet`. Moving the pointer away empties them.
- Moving the pointer from star 2 to star 5 to star 1 moves the preview each time.
- With a saved rating of 3, hovering star 5 fills five, hovering star 1 fills one, the text stays `Rated 3 out of 5`, and leaving brings back three filled stars.
- `onChange` is called once per click with `3`, then `5`, then `0` (when the selected star is clicked again). It is not called by hovering.
- Inside `<StrictMode>`, `onChange` is still called only once per click.
- The component works with no `onChange`: clicking sets and clears the rating and no error is thrown.
- `max={10}` gives ten buttons (the last one is `10 stars`) and text like `Rated 7 out of 10`. `max={3}` gives three buttons.
- Tab focuses the first star, Enter chooses it, Tab moves to the next star, Space chooses it.

## How to run

```bash
npm test -- exercises/react/06-star-rating
```

To see your component in the browser, run `npm run dev` and pick `06-star-rating` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/06-star-rating
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. You need two pieces of state: the saved rating and the star under the pointer. Use `0` to mean "nothing" in both.
2. "How many stars look filled right now?" is not a third piece of state. Work it out while rendering from the other two. Ask yourself: when the pointer is on a star, which of the two numbers should win?
3. Star `n` is filled when `n` is less than or equal to that count.
4. The starter already builds the list of star numbers `[1, 2, 3, 4, 5]` for you. Use `.map()` on it and give every button a `key`.
5. For the singular label, a small conditional is enough: one string for `1`, a template string for the rest.
6. To clear on a second click, compare the clicked star with the current rating before you save anything.
7. Put `onMouseEnter` on each star and `onMouseLeave` on the wrapper. Leaving the wrapper (not each star) means the preview does not drop when the pointer crosses the small gap between two stars.
8. Call `onChange?.(newRating)` from the click handler. Do not call it inside a state updater function: updater functions must stay pure, and React may run them twice.
9. Write `data-filled` as an explicit string (`'true'` or `'false'`). It makes the intent clear.
10. Add `type="button"` to every star. Then the stars never submit a form they happen to be placed in.

</details>

## Stretch goals

- Give filled stars a gold colour and empty stars a grey one with inline `style`.
- Add an optional `defaultValue` prop that sets the starting rating. What should the text say then?
- Add an optional `readOnly` prop that shows the rating but ignores clicks and hover.
- Show the same preview when a star gets keyboard focus (`onFocus` and `onBlur`), so keyboard users get it too.
- Put the text in an element with `role="status"` so a screen reader announces each change.

## Interview follow-ups to prepare for

- **How would you support half stars?** Be ready to explain how the saved value changes (steps of 0.5), how you tell the left half of a star from the right half (two click areas, or the click position compared with `getBoundingClientRect()`), how you draw a half-filled star (clipping or a gradient), and what `data-filled` and the label (`3.5 stars`) become.
- **Controlled vs uncontrolled rating component?** Today the component owns the rating and the parent only listens through `onChange`. Be ready to describe the controlled version (`value` plus `onChange`, the parent owns the state), when each is better (forms, resetting from outside, a value that comes from the server), how one component can support both, and why the hover state stays inside the component either way.
- **Keyboard support?** Real buttons already give Tab, Enter and Space. Be ready to describe the better pattern for a rating: `role="radiogroup"` with `role="radio"` and `aria-checked` on each star, only the selected star in the tab order (roving `tabIndex`), and Left and Right arrow keys to move. Also say how a keyboard user would clear the rating, and what a screen reader announces for each approach.

## Learn the concepts first

- [State and events](../../../../01-basics/05-state-and-events.md)
- [Components and props](../../../../01-basics/04-components-and-props.md)
