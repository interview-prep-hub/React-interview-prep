# Accessibility (a11y)

> **Level:** Advanced   **Time:** about 60 minutes   **Read first:** HTML, CSS and browser basics (planned), [Forms](../01-basics/07-forms.md), [useRef](../02-hooks/04-useref.md)

## What you will learn
- Explain why accessibility matters and what WCAG 2.2 levels A, AA and AAA mean.
- Choose semantic HTML first, and use ARIA only to fill real gaps.
- Give every control an accessible name, and write correct alt text.
- Build keyboard support and focus management in React (modal, route change, delete).
- Make forms, errors and live updates work with a screen reader.
- Fix an inaccessible custom dropdown step by step, and test accessibility with axe, a keyboard walkthrough and a screen reader.

## 1. Why accessibility matters, and what WCAG says
**Accessibility** (written **a11y**: "a", then 11 letters, then "y") means people with different abilities can use your product. That includes people who are blind (they use a **screen reader**, software that reads the page aloud), have low vision (zoom, high contrast), cannot use a mouse (keyboard, switch or voice control), are deaf (captions), or have cognitive needs (clear text, no time pressure). It also helps people who are temporarily limited: a broken arm, bright sun, a noisy train.

Four reasons to care:
- **Users:** a large share of people have some disability, and many more have a temporary one.
- **Law and contracts:** many countries and buyers require WCAG-level accessibility (for example the ADA and Section 508 in the US, the European Accessibility Act in the EU). Check the rules for your market.
- **SEO and quality:** semantic HTML is easier for search engines and tools to understand, and keyboard-friendly UI is better for power users too.
- **Cost:** fixing accessibility late is much more expensive than building it in.

**WCAG** (Web Content Accessibility Guidelines, by the W3C) is the standard. It has four principles, often called **POUR**: Perceivable, Operable, Understandable, Robust. Each rule is a **success criterion** with a conformance level:

| Level | Meaning | In practice |
|---|---|---|
| A | The bare minimum. Without it, some people cannot use the page at all. | Required, never optional |
| AA | The normal target. | What laws and contracts usually ask for |
| AAA | Enhanced. | Not expected for a whole site |

WCAG 2.2 became a W3C Recommendation on 5 October 2023. It adds 9 criteria and does not make 2.1 obsolete, so say "2.2 is the latest". Three AA additions interviewers like: **target size** (clickable targets at least 24 by 24 CSS pixels, with exceptions), **focus not obscured** (a sticky header must not completely hide the focused element) and **dragging alternatives** (anything you can drag must also work with simple clicks).

## 2. Semantic HTML first
**Semantic HTML** means using the element that matches the meaning. A native element comes with a **role** (what it is), a **name**, **state**, **focusability** and **keyboard behaviour**, all for free.

```jsx
// Bad: looks like a button, is not one
<div className="btn" onClick={onSave}>Save</div>

// Good
<button type="button" onClick={onSave}>Save</button>
```

**What happens, step by step** (checked by running both in a test):
1. Pressing Tab with the `div` on the page focuses nothing. The focus stays on the page body.
2. A role query for "button" finds zero elements for the `div`, so a screen reader does not announce a button either.
3. With the real `<button>`, one Tab press focuses it.
4. Pressing Enter and then Space on the focused button called `onSave` twice, with no extra code.

**Common mistake:** adding `onClick` to a `div` or `span`.
```jsx
<span onClick={() => setOpen(true)}>Open menu</span>        // mouse only
<button type="button" onClick={() => setOpen(true)}>Open menu</button>
```
Why: a mouse-only control locks out keyboard and screen reader users.

The rest of the semantic toolbox:
- **Headings** (`h1` to `h6`) form an outline. One `h1` per page, no skipped levels, and choose the level by structure, not by font size (use CSS for size). Screen reader users jump from heading to heading.
- **Landmarks** are page regions: `header` (banner), `nav`, `main`, `aside`, `footer`, plus `section` or `form` when they have an accessible name. Use one `main`. If you have two `nav` elements, name each with `aria-label`.
- **Lists:** use `ul`, `ol`, `li` for lists. A screen reader says "list, 3 items".
- **Tables** are for data, never for layout. Use `th` with `scope`, and a `caption`.
- **Links vs buttons:** a link (`a` with `href`) goes somewhere. A button does something.
- **Forms:** every input needs a label, groups of radios or checkboxes need `fieldset` and `legend`.

```jsx
function Page() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header><nav aria-label="Main"><a href="/">Home</a></nav></header>
      <main id="main" tabIndex={-1}>
        <h1>Orders</h1>
        <ul>{/* one li per order */}</ul>
      </main>
      <footer>Contact us</footer>
    </>
  );
}
```

## 3. The first rule of ARIA
**ARIA** (Accessible Rich Internet Applications) is a set of attributes that give extra information to assistive technology (AT, such as screen readers). There are three kinds:
- **Roles** say what something is: `role="dialog"`, `role="tab"`.
- **States** change over time: `aria-expanded`, `aria-selected`, `aria-checked`, `aria-invalid`.
- **Properties** describe: `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-controls`.

The five rules, short version:
1. **No ARIA is better than bad ARIA.** If a native element does the job, use it.
2. Do not change native meaning (do not write `<h2 role="tab">`; put a `button` inside or around it).
3. Every interactive ARIA control must work with the keyboard.
4. Never put `aria-hidden="true"` or `role="presentation"` on something focusable.
5. Every interactive element needs an accessible name.

The key idea: **ARIA changes what is announced. It never changes what the element does.**

```jsx
// Announces "button" but gives no focus, no Enter, no Space
<div role="button" onClick={onSave}>Save</div>
```
**What happens, step by step:**
1. A screen reader announces "Save, button". Looks fixed.
2. A keyboard user still cannot Tab to it, and Enter does nothing.
3. You would now need `tabIndex={0}` and key handlers. That is a worse copy of `<button>`.

**Common mistake:** `<button role="button">`. The role is already there. Delete the attribute.

## 4. Accessible names: labels and alt text
The **accessible name** is the text a screen reader says for a control ("Email, edit text"). Roughly, the browser takes it from `aria-labelledby` first, then `aria-label`, then native sources: the `label` element, the button's text, the image's `alt`.

```jsx
import { useId } from 'react';

function Examples({ onClose }) {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>Email</label>
      <input id={id} type="email" />

      <button type="button" aria-label="Close" onClick={onClose}>
        <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16">
          <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" />
        </svg>
      </button>
    </>
  );
}
```
**What happens, step by step:**
1. `htmlFor` (the JSX name of the HTML `for` attribute) links the label to the input by id. The input's name is "Email", and clicking the label focuses the input.
2. The icon-only button has no text, so `aria-label="Close"` gives it a name.
3. The SVG is decoration, so `aria-hidden="true"` stops it being announced.
4. Testing Library finds these by name: `getByRole('button', { name: 'Close' })`. If that query fails, a screen reader has the same problem.

Prefer **visible text** over `aria-label`: it can be translated by browser tools and works for voice control users, who say what they see (WCAG "Label in Name": the accessible name should contain the visible text). Use `aria-labelledby="someId"` to name something from existing text, for example a dialog from its heading.

**Alt text rules** (for `img`):
- **Informative image:** describe the meaning in a short phrase. Skip "image of".
- **Decorative image:** `alt=""` (empty, but present). A missing `alt` can make screen readers read the file name.
- **Image inside a link or button:** describe where it goes or what it does ("Home"), not how it looks.
- **Chart or diagram:** short alt plus a longer text or table nearby.
- **Text in an image:** repeat the text in the alt.

**Common mistake:**
```jsx
<img src="/divider.png" />                              // no alt at all
<img src="/divider.png" alt="" />                       // decorative: skipped
<img src="/team.jpg" alt="image of team.jpg" />         // noisy and useless
<img src="/team.jpg" alt="The five-person support team at the 2026 offsite" />
```

## 5. Keyboard access
Many people never use a mouse. The basic keys:
- **Tab / Shift+Tab** move to the next / previous control.
- **Enter** activates links and buttons, **Space** activates buttons and checks boxes.
- **Escape** closes popups. **Arrow keys** move inside one widget (tabs, menus, radio groups).

Rules:
- **Tab order follows the DOM order.** Fix a wrong order by changing the HTML order, not with `tabindex` or CSS `order`.
- **`tabIndex` values** (details in Q8): `0` joins the Tab order, `-1` can be focused by code (`el.focus()`) but is skipped by Tab, positive numbers jump the queue and should never be used.
- **Focus must be visible.** Never write `outline: none` without a replacement.
- **Roving tabindex:** in a widget with many items (tabs, toolbar), only one item has `tabIndex={0}`, the others have `-1`, and the arrow keys move the zero. The whole widget is one Tab stop. You will see it in the Tabs code in section 10.
- **Skip link:** the first link on the page jumps past the navigation to `main`, so keyboard users do not Tab through 40 links every page.

```css
:focus-visible { outline: 3px solid #1a56db; outline-offset: 2px; }

.skip-link { position: absolute; left: -9999px; }
.skip-link:focus { left: 8px; top: 8px; background: #fff; padding: 8px; }

html { scroll-padding-top: 80px; } /* sticky header must not hide the focused element */
```
**What happens:** `:focus-visible` shows the ring for keyboard focus (browsers usually skip it for mouse clicks on buttons). The skip link sits off screen until it receives focus. `scroll-padding-top` keeps focused items below a sticky header (WCAG 2.2 "focus not obscured").

**Common mistake:**
```css
button:focus { outline: none; }                  /* keyboard users are now lost */
button:focus-visible { outline: 3px solid #1a56db; }
```

## 6. Focus management in React
The browser keeps one **focused element**. When React removes the focused element (a modal closes, an item is deleted, a page changes), focus falls back to the page body and a keyboard user loses their place. Your job is to move focus on purpose. The tools are refs (`ref.current.focus()`), `useEffect`, and `tabIndex={-1}` for things that are not normally focusable, like headings.

### 6.1 Modals: move focus in, trap it, restore it
A modal needs four things: a role and name (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`), focus moved **into** it on open, focus **trapped** inside while open (Tab wraps around), and focus **restored** to the opener on close. Escape must close it.

```jsx
import { useEffect, useId, useRef, useState } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ title, onClose, children }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const opener = document.activeElement;
    dialogRef.current.focus();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = dialogRef.current.querySelectorAll(FOCUSABLE);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === dialogRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      ref={dialogRef}
      onKeyDown={handleKeyDown}
    >
      <h2 id={titleId}>{title}</h2>
      {children}
      <button type="button" onClick={onClose}>Close</button>
    </div>
  );
}

export function App() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Delete account</button>
      {open && (
        <Modal title="Delete account?" onClose={() => setOpen(false)}>
          <p>This cannot be undone.</p>
          <button type="button">Delete</button>
        </Modal>
      )}
    </>
  );
}
```
**What happens, step by step** (checked with Testing Library and user-event):
1. Click "Delete account". `Modal` mounts. The effect saves the opener (`document.activeElement`) and focuses the dialog container. `tabIndex={-1}` is what makes a `div` focusable by code. The dialog's name is "Delete account?", taken from the heading through `aria-labelledby`.
2. Tab goes to "Delete", then "Close". A third Tab wraps back to "Delete": that is the **focus trap**. Shift+Tab from "Delete" wraps to "Close".
3. Shift+Tab from the container itself also lands on "Close".
4. Escape calls `onClose`, `Modal` unmounts, the effect cleanup runs, and focus returns to the "Delete account" button.

Notes:
- In StrictMode the effect runs, cleans up and runs again in development. The code above still ends in the right place.
- `aria-modal="true"` tells assistive technology the rest of the page is out of play, but do not rely on it alone. Also stop keyboard and pointer access to the background.
- **Modern alternatives.** The native `<dialog>` element opened with `showModal()` gives you the focus trap, background blocking, Escape and focus restore in real browsers. jsdom (the test DOM) has no `showModal` (it was `undefined` in jsdom 31 when checked), so test native dialogs in a real browser, for example with Playwright. The `inert` attribute also works: React 19 renders `<main inert={open}>` as `<main inert="">` and removes it when `false`. Render the modal as a sibling of that `main` (usually through a portal, see [portals](../03-intermediate/05-error-boundaries-portals-and-friends.md)), or it would be inert too.

**Common mistake:** opening a modal and leaving focus on the button behind it.
```jsx
// Bug: the container has no tabIndex, so focus() does nothing
<div role="dialog" ref={dialogRef}>...</div>
// Fix
<div role="dialog" tabIndex={-1} ref={dialogRef}>...</div>
```

### 6.2 Route changes in a single-page app
A normal page load makes the screen reader read the new page. A client-side route change replaces the DOM silently, so nothing is announced. After navigation: update the document title, then move focus to the new page heading (or announce the change in a live region).

```jsx
import { useEffect, useRef } from 'react';

export function Page({ title, children }) {
  const headingRef = useRef(null);
  useEffect(() => {
    headingRef.current.focus();
  }, [title]);
  return (
    <>
      <title>{title}</title>
      <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
      {children}
    </>
  );
}
```
The `<title>` rendered in a component is hoisted into the document head by React 19. See [React Router](../03-intermediate/03-react-router.md) for where to put this in a route layout.

### 6.3 After adding or deleting items
If the focused "Delete" button disappears with its row, focus is lost. Move focus first to a stable element, such as the list heading (`tabIndex={-1}`), or to the next row, and tell screen readers what happened with a live region (next section). After adding an item, move focus to the new item's field, or announce "Item added".

## 7. Forms and errors
Goals: every field has a label, hints and errors are tied to the field, the invalid state is exposed, and a failed submit tells the user where to look.

```jsx
import { useId, useRef, useState } from 'react';

export function EmailForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const inputRef = useRef(null);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Enter an email address that contains @.');
      inputRef.current.focus();
      return;
    }
    setError('');
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor={inputId}>Email</label>
      <input
        id={inputId}
        ref={inputRef}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
      />
      <p id={hintId}>We only use it to send your receipt.</p>
      {error && <p id={errorId}>{error}</p>}
      <button type="submit">Send</button>
      <p role="status">{sent ? 'Receipt sent.' : ''}</p>
    </form>
  );
}
```
**What happens, step by step** (checked by running it):
1. At first the input is named "Email" and its description is "We only use it to send your receipt." (from `aria-describedby`, the **accessible description**, read after the name). React renders `aria-invalid={false}` as `aria-invalid="false"`.
2. Submit with an empty field. `error` is set, `aria-invalid` becomes `"true"`, the description becomes "We only use it to send your receipt. Enter an email address that contains @." and focus moves to the input.
3. A screen reader now reads the label, the invalid state and the description together, right where the user is.
4. Type a valid email and submit: `aria-invalid` returns to `"false"` and the `role="status"` paragraph (already in the page) gets the text "Receipt sent."

More rules:
- Use `aria-describedby` for hints and errors. Several ids are separated by spaces.
- If you do **not** move focus (for example an error that appears on blur), give the message `role="alert"` so it is announced. If focus moves to the field, do not also add `role="alert"`, or it may be read twice.
- **Multiple errors:** show an **error summary** at the top and focus it on submit. Each item is a link to its field.
```jsx
<div role="alert" tabIndex={-1} ref={summaryRef}>
  <h2>There are 2 problems</h2>
  <ul>
    <li><a href="#email">Email must contain @</a></li>
    <li><a href="#name">Name is required</a></li>
  </ul>
</div>
```
- Mark required fields with the `required` attribute and say so in text. Use `autoComplete` tokens (`email`, `given-name`) so browsers and password managers can help (WCAG "identify input purpose").
- A placeholder is not a label: it vanishes while typing and is often low contrast.
- Group radios with `<fieldset><legend>Delivery speed</legend>...</fieldset>`.

See [Forms](../01-basics/07-forms.md) and [forms with libraries](../03-intermediate/04-forms-with-libraries.md) for validation and React Hook Form.

## 8. Live regions
Screen reader users cannot see a toast, a result count or a "saved" message appear. A **live region** is an element whose changes are announced without moving focus.

```jsx
function Results({ items }) {
  return (
    <>
      <p role="status">{items.length} results found</p>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </>
  );
}
```
**What happens, step by step:**
1. `role="status"` is a built-in live region (same as `aria-live="polite"` plus `aria-atomic="true"`). It waits until the user is idle, then reads the whole text.
2. When `items` changes, only the text inside the region changes, and the screen reader reads "3 results found".
3. `role="alert"` is the loud version (`aria-live="assertive"`): it interrupts. Use it only for urgent errors.

Rules:
- **The region must already exist in the DOM before its text changes.** A region that is inserted together with its text is often not announced.
- Keep messages short. Do not make a whole list live. Do not announce on every keystroke.
- Use `polite` by default, `assertive` only for things that need immediate action.

**Common mistake:**
```jsx
{saved && <div role="status">Saved</div>}            // inserted with its text: may stay silent
<div role="status">{saved ? 'Saved' : ''}</div>      // region stays, text changes
```
A toast system follows the same rule: render the container always, add messages inside. See [exercise 31, toast system](../practice-app/exercises/react/31-toast-system/README.md).

## 9. Colour, contrast and motion
- **Contrast (AA):** text needs a contrast ratio of at least **4.5:1** against its background. Large text (about 24px, or 18.66px bold) needs **3:1**. UI parts such as input borders, icons and focus rings need **3:1**. AAA asks for 7:1 for normal text. Check in browser DevTools or a contrast checker. jsdom cannot measure real colour, so axe's contrast rule does not work in unit tests.
- **Do not rely on colour alone.** A red border for an error is invisible to a colour-blind user. Add text ("Error: ...") or an icon. Underline links inside text.
- **Zoom:** use relative units (`rem`), never disable zoom with `user-scalable=no`, and check that the page still works at 200% zoom.
- **Target size:** buttons and links should be at least 24 by 24 CSS pixels (bigger is better on touch).
- **Reduced motion:** some users get dizzy or ill from animation. They turn on a system setting, which CSS can read.

```css
.card { transition: none; }
@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform 0.3s ease; }
}
```
**What happens:** motion is opt-in. Users who asked for reduced motion get no transition. For JavaScript animations, check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` (the same idea as a `useMediaQuery` hook, see [custom hooks](../02-hooks/08-custom-hooks.md)). Auto-playing carousels and videos also need a pause control.

## 10. Accessible patterns (short)
Interviews ask for the **contract** of each widget: the roles, states and keys. Complex widgets are best taken from a headless library (Radix UI, React Aria, Headless UI) that already implements them. Know the contract anyway.

**Tabs** (roving tabindex, built in [exercise 05](../practice-app/exercises/react/05-tabs/README.md)). Roles `tablist`, `tab`, `tabpanel`. `aria-selected` on the active tab, `aria-controls` from tab to panel, `aria-labelledby` from panel to tab. Keys: Left/Right move between tabs, Home/End jump, Tab goes into the panel.

```jsx
import { useId, useRef, useState } from 'react';

export function Tabs({ tabs }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef([]);

  function handleKeyDown(e) {
    let next;
    if (e.key === 'ArrowRight') next = (active + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (active - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next].focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="Account settings" onKeyDown={handleKeyDown}>
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${i}`}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            aria-selected={i === active}
            aria-controls={`${baseId}-panel-${i}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${i}`}
          aria-labelledby={`${baseId}-tab-${i}`}
          hidden={i !== active}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```
**What happens (checked by running it with three tabs):** the tabindex values start as `0,-1,-1`. One Tab press focuses the first tab. ArrowRight moves focus and selection to the second tab (`aria-selected` becomes `false,true,false`) and shows its panel. End jumps to the last tab, ArrowRight from the last wraps to the first, and the next Tab press moves focus to the panel.

**Accordion** ([exercise 02](../practice-app/exercises/react/02-accordion-single/README.md)). Each header is a heading that contains a real `button`. The button has `aria-expanded` and `aria-controls` pointing to the panel. Enter and Space toggle. Hide closed panels with `hidden`.

**Dialog.** Section 6.1. Name it, focus in, trap, Escape, restore.

**Menu** (an app-style action menu like "File", not site navigation; site navigation is a `nav` with a list of links). The trigger button has `aria-haspopup="menu"` and `aria-expanded`. Items have `role="menuitem"`. Keys: Enter, Space or ArrowDown opens, Up/Down move, Home/End jump, Escape closes and returns focus to the trigger.

**Combobox** (an input with a popup list, built in [exercise 33](../practice-app/exercises/react/33-accessible-combobox/README.md)). The input has `role="combobox"`, `aria-expanded`, `aria-controls` (the listbox id) and `aria-activedescendant` (the id of the highlighted option). The list is `role="listbox"` with `role="option"` children. Focus stays in the input, and the highlight moves virtually. Keys: Down/Up move the highlight, Enter picks it, Escape closes. Announce the number of results in a `role="status"` region.

## 11. React specifics
- **JSX names:** `htmlFor` (not `for`), `className`, `tabIndex`. ARIA attributes keep their dash: `aria-label`, and `role` is plain.
- **`useId`** gives a unique, stable id per component instance, safe on server and client. Use it for `htmlFor`, `aria-describedby` and `aria-controls`. A hard-coded `id="email"` breaks when the component renders twice. Never use it for list keys, and never depend on the format of the string (it changed between React versions).
- **Fragments** (`<>...</>`) avoid wrapper `div`s that would break structure, such as a `div` inside a `ul`, `tr` or `dl`.
- **Refs** are how you focus. In React 19 a function component receives `ref` as a normal prop (see [useRef](../02-hooks/04-useref.md)), so a reusable `Input` can pass it down.
- **Lint rules.** The rules come from `eslint-plugin-jsx-a11y`, for example `alt-text`, `anchor-is-valid`, `click-events-have-key-events` and `no-static-element-interactions`. As of 2026-11-10, jsx-a11y 6.10.2 declares ESLint support only up to version 9 and ESLint 10 support is not released, so installing it next to ESLint 10 fails with a peer dependency error. Oxlint (the default linter in create-vite templates) includes a jsx-a11y plugin built in:

```json
{
  "plugins": ["react", "jsx-a11y"],
  "categories": { "correctness": "error" },
  "rules": { "react/rules-of-hooks": "error" }
}
```
Lint catches the static mistakes (missing alt, `div` with `onClick`). It cannot judge whether a label makes sense.

## 12. Worked example: fix an inaccessible dropdown
Here is a "Sort by" dropdown as many projects first write it.

```jsx
import { useState } from 'react';

const OPTIONS = ['Newest', 'Oldest', 'Price'];

function SortDropdown() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('Newest');
  return (
    <div className="dropdown">
      <div className="dropdown-trigger" onClick={() => setOpen(!open)}>
        Sort by: {value}
      </div>
      {open && (
        <div className="dropdown-list">
          {OPTIONS.map((o) => (
            <div key={o} className="dropdown-item" onClick={() => { setValue(o); setOpen(false); }}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```
**What is wrong:** nothing can be focused, so keyboard users cannot open it; no role, so a screen reader announces plain text; no state, so nobody knows if it is open; Escape does nothing; focus is not managed after a choice.

**Step 0: ask if you need it.** A native `<select>` gives all of this for free and is the best answer when the design allows it:
```jsx
<label htmlFor="sort">Sort by</label>
<select id="sort" value={value} onChange={(e) => setValue(e.target.value)}>
  {OPTIONS.map((o) => <option key={o}>{o}</option>)}
</select>
```
If you must build a custom one, fix it step by step:

1. **Real buttons.** Change the trigger and every option from `div` to `<button type="button">`. You get focus, Tab, Enter, Space and the button role.
2. **Expose state.** On the trigger add `aria-expanded={open}` and `aria-controls={listId}` (an id from `useId`). A screen reader says "Sort by: Newest, button, collapsed".
3. **Semantic list.** Put the options in `<ul>` and `<li>`. Always render the list and use `hidden={!open}`, so the `aria-controls` target always exists. Mark the chosen option with `aria-current="true"`.
4. **Keyboard and focus.** Escape closes and returns focus to the trigger. Up/Down move between options. After choosing an option, close and return focus to the trigger.

The result:
```jsx
import { useId, useRef, useState } from 'react';

const OPTIONS = ['Newest', 'Oldest', 'Price'];

export function SortDropdown() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('Newest');
  const listId = useId();
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  function close() {
    setOpen(false);
    triggerRef.current.focus();
  }

  function choose(option) {
    setValue(option);
    close();
  }

  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = [...listRef.current.querySelectorAll('button')];
      const index = items.indexOf(document.activeElement);
      const next = index + (e.key === 'ArrowDown' ? 1 : -1);
      items[Math.min(Math.max(next, 0), items.length - 1)].focus();
    }
  }

  return (
    <div onKeyDown={handleKeyDown}>
      <button
        type="button"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
      >
        Sort by: {value}
      </button>
      <ul id={listId} ref={listRef} hidden={!open}>
        {OPTIONS.map((option) => (
          <li key={option}>
            <button
              type="button"
              aria-current={option === value ? 'true' : undefined}
              onClick={() => choose(option)}
            >
              {option}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```
**What happens, step by step** (checked by running it):
1. Closed: the trigger has `aria-expanded="false"` and the options are not in the accessibility tree (a role query for the "Oldest" button finds none), because of `hidden`.
2. Click the trigger: `aria-expanded` becomes `"true"` and the options appear.
3. ArrowDown moves focus to "Newest", the first option, then to "Oldest". The clamp (`Math.min`/`Math.max`) stops at the ends instead of wrapping.
4. Escape: `aria-expanded` is `"false"` again and focus is back on the trigger.
5. Open again and click "Price": the trigger text becomes "Sort by: Price", the list closes, and focus is on the trigger. Reopened, "Price" has `aria-current="true"`.

Still missing, and worth saying in an interview: close on outside click (see [exercise 21](../practice-app/exercises/react/21-dropdown-click-outside/README.md)), type-ahead, and the full `listbox` or combobox pattern if it must behave like a form control.

## 13. Testing accessibility
No single tool is enough. Use layers:
1. **Lint** while you type: jsx-a11y (or Oxlint). Catches missing alt, `div` clicks.
2. **Component tests.** Testing Library's role queries are a built-in check: if `getByRole('button', { name: 'Close' })` fails, the control lacks a role or a name. Add **axe** with jest-axe, which works under Vitest:

```js
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { EmailForm } from './EmailForm.jsx';

expect.extend(toHaveNoViolations);

it('has no detectable accessibility violations', async () => {
  const { container } = render(<EmailForm />);
  expect(await axe(container)).toHaveNoViolations();
});
```
A page with an `img` without alt, an unlabelled input and an empty button reports the violation ids `image-alt`, `label` and `button-name`. Colour contrast is switched off in jest-axe because jsdom has no real layout. Do not use `@axe-core/react` with React 19 (its README says it does not support React 18 and later). `vitest-axe` has had no update since January 2025.
3. **Real browser:** Lighthouse (in Chrome DevTools) and the axe DevTools extension for quick audits, `@axe-core/playwright` in end-to-end tests, and the DevTools Accessibility tab to see names and roles. Automated tools find only part of the problems. They cannot tell whether alt text is meaningful, or whether the focus order makes sense. A Lighthouse score of 100 does not mean "accessible".
4. **Keyboard-only walkthrough** (5 minutes, unplug the mouse): Can you reach everything with Tab? Is the focus ring always visible? Is the order logical? Do Enter, Space and Escape work? Does a modal trap focus and give it back? Can you leave every widget?
5. **Screen reader quick start.** Listen for the name, role and state of each control.
   - **NVDA** (free, Windows): start it with Ctrl+Alt+N, quit with NVDA key+Q (the NVDA key is Insert or CapsLock). Press H for the next heading, D for the next landmark, F for the next form field, B for the next button, Tab for the next control, Ctrl to stop speech. Common pairing: NVDA with Firefox or Chrome.
   - **VoiceOver** (Mac, built in): toggle with Cmd+F5. The VO key is Control+Option. VO+Right Arrow reads the next item, VO+Space activates, VO+U opens the rotor (lists of headings, landmarks, links). Common pairing: VoiceOver with Safari.

For wider testing strategy see [Testing React](./08-testing-react.md).

## How interviewers test this
- They ask "why not `div onClick`?" to check you reach for semantic HTML before ARIA. Saying "ARIA fixes it" is a red flag.
- They ask you to make a modal, tabs or an autocomplete accessible: they want roles, keyboard keys, focus in, trap, restore, and Escape.
- They check form basics: label, error text tied with `aria-describedby`, `aria-invalid`, focus on the first error.
- They ask how you test: a strong answer mixes lint, axe, a keyboard pass and a screen reader pass, and admits automation catches only part.
- In machine coding and code review they look for a quiet baseline: `button`, `label`, `alt`, visible focus. Mentioning accessibility in your closing remarks scores points.

## Interview questions and model answers
### Q1. What is accessibility (a11y), and why does it matter? (Easy)
Accessibility means people with disabilities, and people in limiting situations, can perceive, operate and understand your UI, for example with a screen reader, only a keyboard, zoom or voice control. It matters for users, for legal and contract reasons, for SEO and for overall quality. The standard is WCAG (latest version 2.2), organised by four principles (perceivable, operable, understandable, robust) and three levels, A, AA and AAA. AA is the usual target.

### Q2. Why should you not use `<div onClick>` as a button? (Easy)
A `div` has no role, cannot be focused with Tab, and does not react to Enter or Space. A screen reader does not announce it as a button. A `<button>` gives all four for free: role, name, focus and keyboard activation. Fixing a `div` with `role="button"`, `tabIndex={0}` and key handlers rebuilds a worse `button`. Use the native element.
```jsx
<button type="button" onClick={onSave}>Save</button>
```

### Q3. What is ARIA, and what are roles, states and properties? (Easy)
ARIA is a set of attributes that give assistive technology extra information. **Roles** say what an element is (`dialog`, `tab`, `alert`). **States** change over time (`aria-expanded`, `aria-selected`, `aria-invalid`). **Properties** describe relationships and names (`aria-label`, `aria-labelledby`, `aria-describedby`, `aria-controls`). The first rule: use a native element if one exists, because no ARIA is better than bad ARIA. ARIA changes what is announced, never behaviour, so you still have to add focus and keyboard handling.

### Q4. How do you make a modal accessible? (Medium)
Give it `role="dialog"` (or use `<dialog>`), `aria-modal="true"` and a name through `aria-labelledby`. On open, move focus into it (the first control or the container with `tabIndex={-1}`). Trap Tab and Shift+Tab inside. Close on Escape. On close, restore focus to the element that opened it. Block the background from keyboard and screen reader access (`inert` or the native `showModal()`). Prefer a tested library or the native `dialog` over writing the trap yourself.

### Q5. How do you test accessibility? (Medium)
In layers. Lint with jsx-a11y or Oxlint. In component tests, use Testing Library role queries and jest-axe. In a browser, run Lighthouse or axe DevTools, and use `@axe-core/playwright` in end-to-end tests. Then do manual checks that tools cannot do: a keyboard-only walkthrough and a quick screen reader pass (NVDA on Windows, VoiceOver on Mac). Automated tools find only a part of the issues, and contrast checks need a real browser, not jsdom.

### Q6. How do you make form errors accessible? (Medium)
Each input has a `label` linked with `htmlFor` and `id` (from `useId`). Put the error text in an element with an id and reference it with `aria-describedby`. Set `aria-invalid="true"` while the field is invalid. On a failed submit, move focus to the first invalid field (or to an error summary with links). If an error appears without moving focus, give it `role="alert"` so it is announced. Do not rely on red colour alone.

### Q7. What are the rules for alt text? (Easy)
Informative images get a short description of the meaning, without "image of". Decorative images get `alt=""` (present but empty) so screen readers skip them. An image inside a link or button describes the destination or action. A chart gets a short alt plus a longer description or table nearby. An image of text repeats the text. Never leave `alt` out.

### Q8. What do the `tabindex` values 0, -1 and positive numbers do? (Easy)
`tabindex="0"` puts an element in the natural Tab order (DOM order) and makes a non-interactive element focusable. `tabindex="-1"` makes it focusable by script (`el.focus()`) or click, but Tab skips it: used for modal containers, headings after route changes, and roving tabindex. A positive value (1, 2, ...) makes the element jump ahead of all others in a separate ordering, which is confusing and fragile, so avoid it. In React the prop is `tabIndex`.

### Q9. What is `aria-live`? (Medium)
It marks a **live region**: when its content changes, assistive technology announces the change without moving focus. `polite` waits for a pause, `assertive` interrupts. `role="status"` is a polite region and `role="alert"` is an assertive one. The region must exist in the DOM before its text changes, so keep the container mounted and update the text inside. Use it for toasts, result counts and "saved" messages, and keep messages short.

### Q10. What is a focus trap, and when do you need it? (Medium)
A focus trap keeps keyboard focus inside a container while it is open: Tab on the last control goes to the first, and Shift+Tab on the first goes to the last. You need it for modal dialogs so users cannot wander into the page behind. It must come with a way out (Escape or a Close button) and with focus restore on close. The native `dialog` with `showModal()` and the `inert` attribute are modern ways to get the same result.

## Common mistakes and gotchas
- **`div` or `span` with `onClick`:** use `button` (or `a` with `href` for navigation).
- **Hiding the focus ring:** keep a clear `:focus-visible` style.
- **Placeholder as label:** add a real `label`.
- **Icon button with no name:** add `aria-label` and hide the icon with `aria-hidden="true"`.
- **Missing or noisy `alt`:** `alt=""` for decoration, a short real description otherwise.
- **Live region inserted with its text:** keep the container mounted and change the text.
- **Modal that leaves focus behind it:** move focus in, trap, restore.
- **Positive `tabIndex`:** remove it and fix the DOM order instead.
- **Trusting a 100 Lighthouse score:** automated tools cover only part of WCAG, so add a keyboard and screen reader pass.
- **`aria-label` on everything:** visible text is better, and a native element needs no ARIA.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Explain: list four things a `<div role="button" onClick={...}>` is missing compared to a real `<button>`.

<details>
<summary>Show answer</summary>

The role is announced, but it is missing: (1) focus, because Tab skips it unless you add `tabIndex={0}`; (2) Enter activation; (3) Space activation; (4) the disabled behaviour (`disabled` stops clicks and focus); also form submission behaviour and default styling hooks. ARIA only changes what is announced, not what the element does. Use `<button type="button">`.

</details>

2. **(Easy)** Fix the accessibility problems in this snippet.
```jsx
<button onClick={onClose}><svg width="16" height="16" /></button>
<img src="/divider.png" />
<input type="text" placeholder="Search" />
```

<details>
<summary>Show answer</summary>

```jsx
import { useId } from 'react';

function Fixed({ onClose }) {
  const searchId = useId();
  return (
    <>
      <button type="button" aria-label="Close" onClick={onClose}>
        <svg aria-hidden="true" focusable="false" width="16" height="16" />
      </button>
      <img src="/divider.png" alt="" />
      <label htmlFor={searchId}>Search</label>
      <input id={searchId} type="search" />
    </>
  );
}
```
The icon button gets a name, the decorative image gets an empty `alt`, and the input gets a real label instead of relying on the placeholder. (A visible label is best; if the design hides it, use a visually hidden label.)

</details>

3. **(Easy)** Predict: in what order does the Tab key visit these buttons, which one is skipped, and can it still be focused?
```jsx
<>
  <button id="a" tabIndex={0}>A</button>
  <button id="b" tabIndex={-1}>B</button>
  <button id="c" tabIndex={2}>C</button>
  <button id="d">D</button>
  <button id="e" tabIndex={1}>E</button>
</>
```

<details>
<summary>Show answer</summary>

Order: **E, C, A, D**. Positive values go first, in ascending order (1 then 2). Then `tabIndex={0}` and natively focusable elements in DOM order (A, then D). B is skipped by Tab, but `document.getElementById('b').focus()` still works, and so does clicking it. This is why positive `tabIndex` is discouraged: the order no longer matches the page.

</details>

4. **(Medium)** Write a reusable `TextField` component with props `label`, `hint`, `error` and any input props. It must link label, hint and error correctly.

<details>
<summary>Show answer</summary>

```jsx
import { useId } from 'react';

export function TextField({ label, hint, error, ...inputProps }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...inputProps} />
      {hint && <p id={hintId}>{hint}</p>}
      {error && <p id={errorId}>{error}</p>}
    </div>
  );
}
```
`useId` keeps ids unique when the component renders many times. `aria-describedby` lists only the ids that exist, so it never points at a missing element. `aria-invalid` follows the error.

</details>

5. **(Medium)** Explain: a user saves a form, the code `{saved && <div role="status">Saved</div>}` runs, and screen reader users report they hear nothing. Why, and what is the fix?

<details>
<summary>Show answer</summary>

The live region is created at the same moment as its text. Assistive technology watches for changes inside regions that already exist, so a freshly inserted region is often not announced. Fix: keep the region mounted and change only its text.

```jsx
<div role="status">{saved ? 'Saved' : ''}</div>
```

</details>

6. **(Medium)** Write a Testing Library test that proves: after opening the modal from section 6.1 and pressing Escape, the dialog is gone and focus is back on the opener.

<details>
<summary>Show answer</summary>

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App.jsx';

it('closes on Escape and restores focus', async () => {
  const user = userEvent.setup();
  render(<App />);
  const opener = screen.getByRole('button', { name: 'Delete account' });

  await user.click(opener);
  expect(screen.getByRole('dialog', { name: 'Delete account?' })).toBeInTheDocument();

  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});
```
This exact flow passes with the Modal in this lesson. Querying the dialog by role and name also proves it has a role and an accessible name.

</details>

7. **(Medium)** Predict: in the Modal, what happens on open if you delete `tabIndex={-1}` from the dialog container? How would a keyboard user be affected?

<details>
<summary>Show answer</summary>

A `div` without `tabindex` is not focusable, so `dialogRef.current.focus()` does nothing. Focus stays on the opener button behind the modal. The next Tab press goes to whatever follows the opener, and the Tab trap logic only wraps when focus is on the first or last control inside, so the user can wander in the page behind the dialog. Fix: keep `tabIndex={-1}`, or focus the first control inside the dialog instead.

</details>

8. **(Hard)** Write a `TaskList` where deleting a task does not lose keyboard focus. Move focus to the list heading and announce what was removed.

<details>
<summary>Show answer</summary>

```jsx
import { useRef, useState } from 'react';

export function TaskList({ initial }) {
  const [tasks, setTasks] = useState(initial);
  const [message, setMessage] = useState('');
  const headingRef = useRef(null);

  function remove(task) {
    setTasks((list) => list.filter((t) => t.id !== task.id));
    setMessage(`Removed ${task.text}`);
    headingRef.current.focus();
  }

  return (
    <section>
      <h2 ref={headingRef} tabIndex={-1}>Tasks ({tasks.length})</h2>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            {task.text}
            <button type="button" onClick={() => remove(task)} aria-label={`Delete ${task.text}`}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <p role="status">{message}</p>
    </section>
  );
}
```
The heading exists before and after the update, so focusing it right away is safe. The always-mounted `role="status"` paragraph announces the removal. The `aria-label` on each button makes the many "Delete" buttons distinguishable (its text "Delete" is contained in the label, so voice control still works).

</details>

## Recap
- Semantic HTML first: `button`, `a`, `label`, headings, landmarks, lists. A native element gives role, name, focus and keyboard for free.
- ARIA changes what is announced, never behaviour. No ARIA is better than bad ARIA.
- Every control needs an accessible name: `label htmlFor`, visible text, then `aria-label` or `aria-labelledby`. Decorative images get `alt=""`.
- Keep Tab order natural, keep `:focus-visible` styles, and use `tabIndex` only as 0 or -1 (roving tabindex for widgets).
- Modals: name them, move focus in, trap it, close on Escape, restore focus. Route changes and deletes also need deliberate focus.
- Forms: `aria-describedby` for hints and errors, `aria-invalid`, focus the first error. Live regions must exist before their text changes.
- Contrast 4.5:1 for text (3:1 for large text and UI parts), never colour alone, respect `prefers-reduced-motion`.
- Test in layers: lint, role queries plus jest-axe, Lighthouse or axe DevTools, a keyboard walkthrough, and a screen reader (NVDA, VoiceOver).

## Where to go next
- Next lesson: [Security and i18n](./10-security-and-i18n.md).
- Related lessons: [Testing React](./08-testing-react.md), [Forms with libraries](../03-intermediate/04-forms-with-libraries.md), [Portals and error boundaries](../03-intermediate/05-error-boundaries-portals-and-friends.md).
- Practice: [05 Tabs](../practice-app/exercises/react/05-tabs/README.md), [14 Modal with portal](../practice-app/exercises/react/14-modal-portal/README.md), [33 Accessible combobox](../practice-app/exercises/react/33-accessible-combobox/README.md).
