# 22 - Image carousel

**Level:** Medium | **Time:** 30 minutes | **Topics:** state, wrap-around, timers, aria-live

## The task

Build an image carousel (a slideshow). It shows one slide at a time. The user can go to the previous slide, the next slide, or jump to any slide with a row of dots. A caption such as "Slide 2 of 4" is announced to screen reader users. Optionally, the carousel can change slides by itself, and it pauses while the mouse is over it.

There are no real images and no network calls. Each slide is a colored box. The data lives in [`slides.js`](./slides.js) (you do not need to edit it):

```js
export const SLIDES = [
  { id: 1, alt: 'Red slide', color: '#e53935' },
  { id: 2, alt: 'Green slide', color: '#43a047' },
  { id: 3, alt: 'Blue slide', color: '#1e88e5' },
  { id: 4, alt: 'Orange slide', color: '#fb8c00' },
]
```

Work in [`App.jsx`](./App.jsx). Do not edit the test file.

The component has two **optional** props, so it can be rendered with no props at all:

- `slides`: an array of `{ id, alt, color }`. It defaults to `SLIDES` (the 4 slides above). You can assume it has at least one slide.
- `autoPlay`: a boolean. It defaults to `false`.

## Requirements

**The carousel and its slide**

1. Wrap everything in one `<section aria-label="Image carousel">`. A section with a label has the ARIA role `region`, so the tests find it as the region named "Image carousel".
2. Show **only the current slide**, as `<div role="img" aria-label={slide.alt}>` whose inline style sets the background color to `slide.color` (`background` or `backgroundColor`, both work). Give it a height (for example 180px) so the color is visible. At any moment the page contains exactly one element with `role="img"`. The other slides are not rendered at all (do not render every slide and hide the others with CSS).
3. The carousel starts on the first slide.

**The caption**

4. Show the text `Slide N of M`, where `N` is the current slide number counting from 1 and `M` is the number of slides (for example `Slide 2 of 4`). Put `aria-live="polite"` on the element that holds this text (the caption, not the whole `<section>` with its buttons). Keep that element in the page all the time and only change its text. Do not add a changing `key` to it and do not render it conditionally, because a live region that is replaced is not announced reliably.

**Buttons and dots**

5. A button whose accessible name is exactly **Prev** goes to the previous slide. On the first slide it wraps around to the last slide.
6. A button whose accessible name is exactly **Next** goes to the next slide. On the last slide it wraps around to the first slide. Neither button is ever disabled.
7. A row of dot buttons, one per slide, in slide order. Dot number `N` has `aria-label="Go to slide N"` (counting from 1, so `Go to slide 1`, `Go to slide 2`, and so on). Clicking a dot shows that slide.
8. The dot of the current slide has `aria-current="true"`. The other dots must **not** have `aria-current="true"` (the simplest way is to leave the attribute off).
9. Prev, Next and the dots are real `<button>` elements, so they work with the keyboard (Enter and Space) without extra code.
10. Nothing is hard-coded to 4. With a `slides` prop of 3 items you get `Slide 1 of 3`, three dots, and wrap-around between slide 3 and slide 1. The alt text and color always come from the `slides` data. With a single slide you get `Slide 1 of 1`, and Prev and Next stay on that slide.

**Auto play**

11. When `autoPlay` is `false` (the default), the slide never changes by itself.
12. When `autoPlay` is `true`, the carousel moves to the next slide every **3000 ms**. After the last slide it wraps to the first. Use `setInterval` or `setTimeout`. The timer always continues from the slide the user is on: if the user jumps to slide 3, the next automatic change shows slide 4.
13. **Pause on hover.** While the mouse is over the carousel (the whole `<section>`), no automatic change happens. Use `onMouseEnter` and `onMouseLeave` on the section. Prev, Next and the dots keep working while it is paused.
14. **Resume on leave.** When the mouse leaves, the next automatic change happens 3000 ms after the mouse left. The countdown starts again from the full 3000 ms.
15. **Clean up.** There must never be more than one running timer. Moving the mouse in and out many times, or React StrictMode running your effect twice on mount, must not make the carousel faster. The timer is stopped when the component unmounts. If the `autoPlay` prop changes while the component is mounted, auto play starts or stops accordingly.

Not tested, so either choice is fine: whether clicking Prev, Next or a dot restarts the 3000 ms countdown.

## Acceptance criteria (what the tests check)

- On first render: one `img` named "Red slide", the caption `Slide 1 of 4`, dot 1 has `aria-current="true"`, the other three dots do not, and the other slides are not in the page.
- Prev, Next and the four "Go to slide N" dot buttons exist, and the buttons are enabled.
- The picture is painted with the color of the current slide.
- The caption sits inside an element with `aria-live="polite"` that does not contain the buttons, and that same element is updated when the slide changes.
- Next moves forward and wraps from slide 4 to slide 1. Prev moves back and wraps from slide 1 to slide 4.
- A dot jumps to its slide and becomes the only active dot. Prev and Next continue from there.
- There is exactly one picture in the page after every click.
- With `slides` set to 3 items, everything uses 3 (caption, dots, wrap-around). With 2 items, auto play wraps after 2 slides. With 1 item, Prev and Next stay on it. With your own slide objects, the alt text and color you pass in are what is shown.
- The controls work with the keyboard (Enter and Space on a focused button).
- Without `autoPlay`, the slide never changes, however much time passes.
- With `autoPlay`, nothing changes at 2999 ms, the slide changes at 3000 ms, and it keeps changing every 3000 ms, wrapping from slide 4 to slide 1.
- After the user jumps to a slide, auto play continues from that slide.
- Hovering the carousel (or any button inside it) stops auto play. Leaving starts a fresh 3000 ms countdown from the slide the user is on. Repeated hover and leave does not stack timers (at most one timer is pending). Prev, Next and the dots still work while hovering.
- In StrictMode the carousel still advances exactly one slide per 3000 ms.
- Unmounting clears the timer (no timer is left pending).
- Switching the `autoPlay` prop from `true` to `false` and back stops and restarts auto play.

## How to run

```bash
npm test -- exercises/react/22-image-carousel
```

To see your component in the browser, run `npm run dev` and pick `22-image-carousel` in the sidebar. The playground renders `<App />` with no props, so `autoPlay` is off. To watch auto play, temporarily change the default in the function signature to `autoPlay = true`. Change it back to `false` before running the tests, because the tests expect the default to be off.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/22-image-carousel
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. You need two pieces of state: the index of the current slide (a number) and whether the mouse is over the carousel (a boolean). Do not store the slide object. Look it up with `slides[index]`. The caption and the active dot are also derived from the index.
2. Going forward: `(index + 1) % count`. Going back needs care, because in JavaScript `-1 % 4` is `-1`, not `3`. Add `count` before the remainder: `(index - 1 + count) % count`.
3. Update the index with the functional form, `setIndex((i) => ...)`. A timer callback keeps the values from the render that created it, so reading `index` directly inside it gives a stale number.
4. The timer belongs in `useEffect`. Inside the effect: if `autoPlay` is off or the mouse is over the carousel, return early (no timer). Otherwise start the timer and return a cleanup function that stops it.
5. List everything the effect reads in its dependency array (`autoPlay`, the hover state, the number of slides). When one of them changes, React runs your cleanup first and then the effect again. That is exactly what pausing and resuming need, and it also gives you the fresh 3000 ms countdown for free.
6. StrictMode runs effects as set up, clean up, set up again on mount. If your tests show the carousel moving two slides at a time in StrictMode, your cleanup function is missing or wrong.
7. For the dots, `aria-current={i === index ? 'true' : undefined}`. Returning `undefined` removes the attribute.
8. Use the slide `id` as the `key` when you render the dots.

</details>

## Stretch goals

- Arrow keys: when focus is inside the carousel, ArrowLeft goes to the previous slide and ArrowRight goes to the next.
- Also pause while a control inside the carousel has keyboard focus, not only while the mouse is over it (focus events bubble in React, so `onFocus` and `onBlur` on the section work).
- Add a Pause/Play button. People must be able to stop content that moves by itself.
- Do not start auto play when the user prefers reduced motion (`window.matchMedia('(prefers-reduced-motion: reduce)')`).
- Announcing every automatic change can be noisy. The W3C carousel pattern sets `aria-live="off"` while the carousel rotates by itself and `aria-live="polite"` otherwise. Try it, and keep `polite` whenever `autoPlay` is off.
- Add `aria-roledescription="carousel"` to the section, and fade between slides with a CSS transition.

## Interview follow-ups to prepare for

- **How would you add touch and swipe support?** Think about pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`) because they cover mouse, touch and pen with one code path. Remember the start position, compare the horizontal distance when the pointer is released, and only change slide past a threshold (for example 50px). Ignore mostly vertical moves so page scrolling still works (`touch-action: pan-y`). Keep the buttons and dots: swipe is an extra, never the only way. A no-JavaScript option is a horizontally scrolling list with CSS `scroll-snap`.
- **CSS transitions or JavaScript animations for the slide change?** CSS transitions on `transform` and `opacity` are declarative, run on the compositor (the browser's GPU layer) and are usually smooth and cheap, so they are the default choice. JavaScript animation (`requestAnimationFrame`, the Web Animations API, or a library) is better when the motion follows the finger, needs physics, or must be interrupted and reversed. Notice the catch in this exercise: to animate, the old slide must stay in the page until the animation ends, which conflicts with "only the current slide is rendered". Also respect `prefers-reduced-motion`.
- **How would you lazy-load the images?** In this design only the current slide is in the page, so the other images are not requested until they are shown. That saves bandwidth but can cause a flash while the next image loads, so preload the next slide (and maybe the previous one) with `new Image().src = url` or `<link rel="preload">`. Load the first slide eagerly (it is often the largest paint on the page, so consider `fetchPriority="high"` on the JSX `<img>`). If all slides were rendered instead, you would use `loading="lazy"` on the off-screen ones. Always set `width` and `height` (or an aspect ratio) so the page does not jump, and use `srcset` and `sizes` to serve the right image size.

## Learn the concepts first

- [useEffect](../../../../02-hooks/03-useeffect.md) (timers, cleanup, dependency array, StrictMode)
- [useRef](../../../../02-hooks/04-useref.md) (a ref can keep a timer id between renders, although a variable inside the effect is enough here)
- [Accessibility](../../../../04-advanced/09-accessibility.md) (live regions, `aria-current`, keyboard support)
