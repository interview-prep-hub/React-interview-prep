# 14 - Modal with portal, focus trap and scroll lock

**Level:** Medium | **Time:** 40 minutes | **Topics:** portals (`createPortal`), refs, focus management, effects and cleanup, accessibility (dialog role, keyboard)

## The task

Build an accessible modal dialog. It is drawn with `createPortal` straight into `document.body`, it closes in three ways (Escape, the dark overlay, a Close button), it keeps keyboard focus inside while it is open, it gives focus back to the button that opened it, and it stops the page behind it from scrolling.

Work in [`App.jsx`](./App.jsx). Do not edit the test file.

The `App` component at the bottom of `App.jsx` is the demo page and is already written. It holds a button, a `Modal`, and some content for the dialog. **Your job is the `Modal` component** (the numbered comments in the file walk you through it). Keep the visible texts of the demo as they are, because the tests look for them. Keep `Modal` as a named export (`export function Modal`), because some tests render it on its own, without the demo page.

The demo wraps the button and the `Modal` in a small dashed box that clips its children (`overflow: hidden` plus a CSS `transform`). That is on purpose. If your dialog is not in a portal, you will see it trapped inside that box when you run the page in the browser.

## Requirements

The `Modal` receives four props: `open` (boolean), `onClose` (function), `title` (string) and `children`. The demo uses `title="Edit profile"`.

1. **Closed means nothing.** When `open` is `false`, `Modal` renders nothing: no dialog, no overlay, nothing left in `document.body`.
2. **Trigger.** The button labelled **Open modal** (already in `App`) sets `open` to `true`.
3. **Portal.** When open, render the overlay and the dialog with `createPortal(..., document.body)`. They must NOT be inside the element that `App` itself is rendered into.
4. **Overlay.** An element with `data-testid="modal-overlay"` that covers the whole screen with a dark, semi-transparent background (`position: fixed`, `inset: 0`). The dialog is shown on top of it. You may nest the dialog inside the overlay or place the two side by side, your choice. The starter already gives you `overlayStyle` and `dialogStyle`, so use them as they are. The tests do not check colours or sizes.
5. **Dialog semantics.** The dialog element has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` set to the `id` of the title heading. Create that id with `useId`. The dialog's accessible name must be the title text.
6. **Content.** Inside the dialog, in this order:
   - an `<h2>` that shows the `title` prop,
   - a button with the exact text **Close**, rendered by `Modal` itself,
   - the `children`.

   The demo children are: a paragraph "Change how other people see you.", a text input with the label **Nickname**, and a button **Save** (it calls `onClose`). Use a plain `<div>` for the dialog, not the native `<dialog>` element (that is a stretch goal).
7. **Ways to close.** Each of these calls `onClose`, exactly once per action:
   - the **Close** button,
   - the **Escape** key (while the modal is open, wherever focus is, even on `<body>`),
   - a click on the dark overlay itself.

   `Modal` never closes itself. It only calls `onClose`, and the parent decides what happens. If the parent passes a different `onClose` on a later render, Escape must call the newest one.
8. **Clicks inside do not close.** A click on the dialog box, the heading, the paragraph or the input must NOT close the modal. Other keys (letters, arrow keys) do nothing.
9. **Focus moves in.** When the modal opens, keyboard focus moves to an element inside the dialog. The usual choice is the first focusable element, which is the Close button. If the dialog had nothing focusable, you would focus the dialog itself (give it `tabIndex={-1}`).
10. **Focus comes back.** When the modal closes, focus returns to the element that had focus just before it opened (here, the **Open modal** button). This holds for every way of closing.
11. **Focus trap.**
    - Pressing **Tab** on the last focusable element inside the dialog moves focus to the first one.
    - Pressing **Shift+Tab** on the first focusable element moves focus to the last one.
    - Tab and Shift+Tab never move focus to the page behind the dialog.
    - If focus is somewhere outside the dialog when Tab is pressed (for example on `<body>` after the user clicked plain text), Tab moves focus to the first focusable element inside, and Shift+Tab to the last one.
    - Work out "first" and "last" at the moment Tab is pressed, not once when the modal opens. The content of a dialog can change while it is open (a field appears), and then the last element is a different one.
12. **Scroll lock.** While open, `document.body.style.overflow` is `"hidden"`. When the modal closes, or when the component unmounts while open, put back the exact value it had before. That value is not always an empty string, it could be `"scroll"` or `"auto"`.
13. **Clean up.** Every listener you add is removed when the modal closes or unmounts. While the modal is closed, or after it unmounted, Escape does not call `onClose` and Tab behaves like on any normal page. Everything must also work in `StrictMode`, where React runs effects twice in development (the playground uses `StrictMode`).
14. **Parent re-renders are harmless.** In the demo, every keystroke in the Nickname input re-renders `App`, and `App` passes a NEW `onClose` function to `Modal` each time. That must not move focus, restart the scroll lock (the code must not write to `document.body.style` again) or lose what the user is typing.

## Acceptance criteria (what the tests check)

Opening and closing:
- While closed there is no dialog, no overlay and no "Edit profile" text, and the body overflow is not `hidden`.
- Clicking **Open modal** shows the dialog with the heading "Edit profile", the paragraph, the **Nickname** field and the overlay.
- **Close**, **Save**, **Escape** (also when focus is on `<body>`) and a click on the overlay each close it.
- Clicks on the dialog box, the heading, the paragraph and the input leave it open. Pressing `x` or the down arrow leaves it open.
- After closing, it can be opened again.

Accessibility and portal:
- The dialog has `aria-modal="true"`, its `aria-labelledby` equals the `id` of the `<h2>`, and its accessible name is "Edit profile".
- The dialog and the overlay are inside `document.body` but not inside the render container of `App`. Nothing is left in `document.body` after closing.
- With another `title` and other children, `Modal` shows those: the `<h2>` first, then the **Close** button, then the children.
- Two open modals get two different title ids.

Focus:
- On open, focus is inside the dialog (and not on the trigger).
- After closing with **Close**, **Save**, **Escape** or an overlay click, the **Open modal** button has focus again. On a page with several buttons, focus returns to the one that opened the dialog.
- Typing `abc` into the Nickname input keeps focus in the input and the scroll lock stays on.

Focus trap:
- Tab on the last focusable element goes to the first. Shift+Tab on the first goes to the last.
- Pressing Tab (or Shift+Tab) repeatedly never leaves the dialog and visits every focusable element.
- When focus is on `<body>`, Tab brings it to the first focusable element inside, Shift+Tab to the last.
- When a new field appears inside the open dialog, the trap uses the new last element.

Calling `onClose` and cleaning up (the tests render `Modal` on its own with a spy):
- Close, overlay click and Escape each call `onClose` exactly once (also in `StrictMode`). Clicks inside the dialog and other keys do not.
- After the parent passes a new `onClose`, Escape calls the new one and not the old one.
- While closed, after closing and after unmounting, Escape does not call `onClose`, and Tab moves through the page normally.

Scroll lock and StrictMode:
- With `document.body.style.overflow = 'scroll'` before opening: it is `hidden` while open and `scroll` again after closing.
- With `'auto'` before opening and the app unmounted while open: it is `auto` afterwards.
- Typing in the Nickname input (parent re-renders) does not write to the style of `<body>` again.
- Under `StrictMode`, the scroll lock, the focus move and the focus return all still work.

## How to run

```bash
npm test -- exercises/react/14-modal-portal
```

To see your component in the browser, run `npm run dev` and pick `14-modal-portal` in the sidebar. Try it like a user: open the modal, press Tab many times, press Shift+Tab, press Escape, click the dark area, click on the text inside the dialog.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/14-modal-portal
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Hooks must run in the same order on every render. So call all your hooks first, and only then write `if (!open) return null`.
2. `createPortal(jsx, document.body)` takes the JSX first and the target DOM node second. It returns something you can `return` from the component.
3. Use three separate effects, one per job: scroll lock, focus, keyboard. Give the scroll lock and the focus effect the dependency list `[open]` only. If they also depended on `onClose`, they would re-run every time the parent re-renders (requirement 14). The keyboard effect calls `onClose`, so it lists `onClose` too: `[open, onClose]`.
4. Scroll lock: inside the effect, first read `const previous = document.body.style.overflow`, then set `'hidden'`, then return a cleanup function that sets it back to `previous`.
5. Focus: inside the effect, read `const opener = document.activeElement` BEFORE you move focus. In the cleanup, call `opener.focus()` (check that it is an `HTMLElement` first).
6. To find what can be focused, run `dialogRef.current.querySelectorAll(FOCUSABLE)` and turn the result into an array with `Array.from`. The first and last items are the edges of your trap. Run this inside the keydown handler, so the list is fresh on every key press.
7. Trap logic on a Tab keydown: if Shift is not held and `document.activeElement` is the last item, call `event.preventDefault()` and focus the first item. Do the mirror image for Shift+Tab on the first item. Without `preventDefault`, the browser moves focus on its own as well.
8. Put the keydown listener on `document`, not on the dialog. If the user clicks plain text, focus falls back to `<body>`, and a listener on the dialog would never hear the next Tab. In the handler, check `dialog.contains(document.activeElement)`.
9. Overlay click: a click inside the dialog bubbles up to the overlay. Compare `event.target` with `event.currentTarget` and only close when they are the same element.
10. Always remove what you added: `document.removeEventListener` with the same function in the cleanup.

</details>

## Stretch goals

- Add `aria-describedby` to the dialog, pointing at the paragraph.
- Close on an overlay click only if the mouse press also started on the overlay. In some browsers, selecting text in the input and releasing the mouse over the overlay closes the modal by mistake.
- Hide the rest of the page from assistive technology while the modal is open (the `inert` attribute, or `aria-hidden`, on the app root), and undo it on close.
- Extract two custom hooks, `useScrollLock(open)` and `useFocusTrap(ref, open)`, so `Modal` becomes short.
- Support two modals open at the same time. A simple counter for the scroll lock stops the inner modal from unlocking the page too early.
- Rebuild the modal with the native `<dialog>` element and `showModal()`. Compare how much code you can delete.
- Prove event bubbling: add an `onClick` that counts clicks to the dashed box in `App`, click inside the dialog, and watch the count change (see the second follow-up question).

## Interview follow-ups to prepare for

- Why does a modal use a portal? What goes wrong if you render it inline inside a card that has `overflow: hidden`, a `z-index`, or a CSS `transform`? (Think about: clipping, stacking contexts, how `position: fixed` behaves inside a transformed ancestor. The dashed box in the demo shows it.)
- A parent component has an `onClick` and renders `<Modal>` inside it, but the modal's DOM lives in `document.body`. Does a click inside the modal reach the parent's `onClick`? Why? When is that useful and when is it a bug? (Think about: React events follow the React component tree, native DOM events follow the DOM tree, and what `stopPropagation` does in each.)
- The browser has a native `<dialog>` element with `showModal()`. What do you get from it for free, and why might a team still build a custom modal? (Think about: focus handling, Escape, the top layer and `::backdrop`, browser support, animating the close, styling control, and how your tests would change.)

## Learn the concepts first

- [Error boundaries, portals and friends](../../../../03-intermediate/05-error-boundaries-portals-and-friends.md)
- [useRef](../../../../02-hooks/04-useref.md)
- [Accessibility](../../../../04-advanced/09-accessibility.md)
