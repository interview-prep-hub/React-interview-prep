# Styling React Apps

> **Level:** Intermediate   **Time:** about 45 minutes   **Read first:** [JSX](../01-basics/03-jsx.md), HTML, CSS and browser basics (planned), [useContext](../02-hooks/05-usecontext.md)

## What you will learn
- Explain the main ways to style a React app (plain CSS, CSS Modules, inline styles, Tailwind, CSS-in-JS, UI kits) and the trade-offs of each.
- Write conditional and dynamic styles with class toggling, data attributes and CSS variables set from props.
- Build theming and dark mode with CSS variables, a `data-theme` attribute, `prefers-color-scheme`, `localStorage` and a context toggle, without a flash of the wrong theme.
- Explain Tailwind CSS v4, why `clsx`, `tailwind-merge` and `cva` are used with it, and list its pros and cons.
- Explain why runtime CSS-in-JS is declining, what zero-runtime options exist, and how to choose a UI library.
- Make responsive, animated and accessible interfaces: media and container queries, `prefers-reduced-motion`, colour contrast.

## 1. The big picture: what problem does a styling approach solve?

React does not come with a styling system. React only puts a `className` and a `style` on DOM elements. The browser does the real styling with CSS. So you choose how to write and ship your CSS, and there are many choices.

CSS was designed for documents, not for components. In a component app, three problems show up again and again:

1. **Scope.** CSS is global. A rule for `.title` in one file affects every `.title` on the page.
2. **State.** The look must change with props and state (active, disabled, error, dark mode).
3. **Delivery.** The CSS has to reach the browser: in a `.css` file, in `<style>` tags added at runtime, or inline. Each has a cost.

Every approach in this lesson is a different answer to these three questions.

| Approach | Scope | Dynamic values | Runtime cost | Server Components |
|---|---|---|---|---|
| Plain CSS file | global, you manage names | toggle classes, CSS variables | none | yes |
| CSS Modules | automatic (renamed classes) | toggle classes, CSS variables | none | yes |
| Inline `style` object | one element | any JavaScript value | small | yes |
| Tailwind CSS | fixed set of utility classes | toggle classes | none in the browser | yes |
| Runtime CSS-in-JS | automatic | any JavaScript value | work on every render | only in Client Components |
| Zero-runtime CSS-in-JS | automatic | variants and CSS variables | none in the browser | check each library |

A sensible default for a new app in 2026 is **CSS Modules or Tailwind, plus CSS variables for themes**. The rest of this lesson explains why, and when to pick something else.

## 2. Plain CSS files and `className`

The simplest approach is the one the web always had: write a `.css` file, import it, and put class names on your elements.

```css
/* src/Card.css */
.card {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 16px;
}

.card-title {
  margin: 0 0 8px;
  font-size: 1.25rem;
}
```

```jsx
// src/Card.jsx
import './Card.css'

export function Card({ title, children }) {
  return (
    <section className="card">
      <h2 className="card-title">{title}</h2>
      {children}
    </section>
  )
}
```

**What happens, step by step:**
1. `import './Card.css'` is a side-effect import. Vite sees it and handles the file. In development it adds the CSS to the page in a `<style>` tag (so edits show instantly). In a production build it collects all CSS into one `.css` file that `index.html` links to.
2. React renders `<section class="card">` (the JSX name is `className`, the DOM attribute is `class`, see the [JSX lesson](../01-basics/03-jsx.md)).
3. The browser matches `.card` and `.card-title` against the elements and applies the rules.
4. Important: the import does **not** attach the CSS to `Card`. Once the file is loaded, `.card` applies to every element on the page that has that class.

**Common mistake:** two components that pick the same class name.

```css
/* Card.css */
.title { color: crimson; }

/* Modal.css */
.title { color: navy; }
```

Both rules have the same specificity (one class), so the one that comes later in the final stylesheet wins for every `.title` on the page. "Later" depends on import order, which is fragile. The fix is a naming rule (`card-title`, `modal-title`, see section 7) or CSS Modules (section 3).

**Trade-offs.** Plain CSS needs no extra tools, uses every modern CSS feature (nesting, variables, container queries, cascade layers), and is easy to debug. The price is global scope: you manage names yourself, and it is hard to know when a rule is dead (unused) and safe to delete.

## 3. CSS Modules: scoped class names

A **CSS Module** is a CSS file whose name ends in `.module.css`. The build tool renames every class in it to a unique name, and gives your JavaScript an object that maps your original names to the new ones. Because the names are unique, files cannot clash.

```css
/* src/Button.module.css */
.button {
  padding: 8px 16px;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.primary {
  background: royalblue;
  color: white;
}

.danger {
  background: crimson;
  color: white;
}
```

```jsx
// src/Button.jsx
import styles from './Button.module.css'

export function Button({ variant = 'primary', children }) {
  return (
    <button type="button" className={`${styles.button} ${styles[variant]}`}>
      {children}
    </button>
  )
}
```

**What happens, step by step:**
1. At build time Vite reads `Button.module.css` and renames each class. A real production build of a similar file (`Badge.module.css`) produced rules like `._badge_zf6o3_1` and `._success_zf6o3_8`. In that build the pattern was `_name_hash_line`: your class name, a hash of the file, and the line number. The exact pattern can differ between tools and versions, so never depend on it.
2. The `import styles` line gives you the mapping object, for example `{ badge: '_badge_zf6o3_1', success: '_success_zf6o3_8', ... }`.
3. `styles.button` is the unique name for `.button`, and `styles[variant]` picks `.primary` or `.danger`.
4. Another file can also have a `.button` class. It gets a different hash, so there is no clash.

Useful facts:
- Use **camelCase** class names (`.primaryButton`). Then `styles.primaryButton` works. A name like `.primary-button` needs `styles['primary-button']`.
- Only class names (and keyframe names) are renamed. A bare element selector such as `h2 { }` stays global. Attach element selectors to a class: `.card h2 { }`.
- To opt out for one selector, write `:global(.some-library-class) { }`.
- A name that is not in the file is simply `undefined`. There is no error.
- With TypeScript you can type the module so typos are caught (see [TypeScript with React](08-typescript-with-react.md)).
- In tests, the practice app's Vitest setup returns names like `_btn_5f48a9` for **any** key you read, even a key that is not in the file. So tests should not check exact class names. Check roles, text, ARIA attributes or data attributes instead (section 15).

**Common mistake:** a typo or an unknown variant puts the word `undefined` into the class list.

```jsx
// Wrong: styles.warning does not exist in Button.module.css
<button className={`${styles.button} ${styles.warning}`}>Save</button>
// Renders class="_button_x undefined"
```

```jsx
// Fixed: a small helper that drops missing values (section 5)
<button className={cx(styles.button, styles.warning)}>Save</button>
// Renders class="_button_x" (and you should still add the missing .warning class)
```

**Trade-offs.** CSS Modules keep real CSS and real tooling (the browser's own features, no runtime), solve scope, and work with Server Components. The costs: you jump between two files, sharing values between CSS and JavaScript needs CSS variables, and dynamic styling still needs class toggling.

## 4. Inline style objects

The `style` prop takes an **object**, not a string. Keys are camelCase.

```jsx
export function Notice() {
  return (
    <p
      style={{
        fontSize: 20,
        lineHeight: 1.5,
        opacity: 0.5,
        zIndex: 2,
        width: '50%',
        backgroundColor: 'tomato',
      }}
    >
      Heads up
    </p>
  )
}
```

**What happens, step by step:**
1. The keys become CSS properties: `fontSize` is `font-size`, `backgroundColor` is `background-color`.
2. A plain number gets `px` added, except for properties that take plain numbers (`lineHeight`, `opacity`, `zIndex`, `flex`...).
3. Rendered in the practice app, the element gets exactly: `font-size: 20px; line-height: 1.5; opacity: 0.5; z-index: 2; width: 50%; background-color: tomato;`.
4. Strings are used as they are (`'50%'`). To use a unit other than `px`, write a string (`'2rem'`).

**What inline styles cannot do.** An inline style is one list of declarations for one element. There is no place to put:
- pseudo-classes (`:hover`, `:focus-visible`, `:disabled`) and pseudo-elements (`::before`)
- media queries and container queries
- `@keyframes` animations
- selectors for children or siblings

**Common mistake 1:** trying to write `:hover` inside the object.

```jsx
// Wrong: no error, and no hover effect. The rendered output is only
// <button style="background: royalblue;">, the ':hover' key is dropped.
<button style={{ background: 'royalblue', ':hover': { background: 'navy' } }}>Save</button>
```

```jsx
// Fixed: put the rule in CSS, where :hover exists
<button className={styles.save}>Save</button>
```

```css
.save { background: royalblue; }
.save:hover { background: navy; }
```

**Common mistake 2:** passing a string, as in HTML.

```jsx
// Wrong: React throws "The `style` prop expects a mapping from style properties to values, not a string."
<div style="color: red" />

// Fixed
<div style={{ color: 'red' }} />
```

**Other costs.** An inline style beats every normal stylesheet rule (only `!important` wins over it), so it is hard to override later. It repeats in the HTML for every element. It cannot be themed from CSS.

**When inline styles are the right tool.** For values that are truly dynamic and not from a small set: a width from a percentage, a position while dragging, a colour the user picked. Even then, there is a cleaner way (section 5.3): pass the value as a CSS variable, and keep all the rules in CSS.

## 5. Conditional and dynamic styling

Most styling work in React is "make it look different when something is true". There are three clean tools.

### 5.1 Toggle class names

A class name is just a string. The trap is building that string by hand.

```jsx
const active = false
let size // undefined

<div className={`btn ${active ? 'btn-active' : ''} ${size}`} />
// Renders class="btn  undefined"
```

When you render this, the class attribute is `"btn  undefined"`. There is a double space and the word `undefined`. The fix is a helper that keeps only truthy parts:

```js
// src/cx.js
export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}
```

```js
cx('a', false, null, undefined, 0, '', 'b') // 'a b'
cx('btn', true && 'active', false && 'x')   // 'btn active'
```

This is a tiny version of the popular `clsx` package (`npm install clsx`). `clsx` also accepts objects and arrays: `clsx('btn', { 'btn-active': isActive }, size && `btn-${size}`)`. In an object, a key is included when its value is truthy.

Here is a full example with a CSS Module and a lookup object for the variants:

```css
/* src/Badge.module.css */
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.875rem; }
.info { background: #dbeafe; color: #1e3a8a; }
.success { background: #dcfce7; color: #14532d; }
.danger { background: #fee2e2; color: #7f1d1d; }
.outlined { background: transparent; border: 1px solid currentColor; }
```

```jsx
// src/Badge.jsx
import styles from './Badge.module.css'
import { cx } from './cx.js'

const variantClass = {
  info: styles.info,
  success: styles.success,
  danger: styles.danger,
}

export function Badge({ variant = 'info', outlined = false, children }) {
  return (
    <span className={cx(styles.badge, variantClass[variant], outlined && styles.outlined)}>
      {children}
    </span>
  )
}
```

**What happens, step by step:**
1. `variantClass` is a plain object that maps a variant name to a class from the module. Unlike `styles[variant]`, every possible class is written out, so it is easy to search for and easy to type.
2. `<Badge variant="success" outlined>` renders three classes: `badge`, `success` and `outlined`, in that order.
3. `<Badge>` with no props renders `badge` and `info`.
4. `<Badge variant="nope">` is not a known variant, so `variantClass[variant]` is `undefined`, `cx` drops it, and you get only the base `badge` class. No crash and no `undefined` in the class string.

### 5.2 Style from data attributes and ARIA attributes

Instead of inventing a class for every state, put the state on the element as an attribute, and select it in CSS. Use `aria-*` attributes when the state has an accessibility meaning (expanded, selected, pressed, current page) and `data-*` attributes for the rest.

```jsx
import { useState } from 'react'
import './Collapsible.css'

export function Collapsible({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="collapsible" data-state={open ? 'open' : 'closed'}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {title}
      </button>
      <div className="collapsible-body" hidden={!open}>
        {children}
      </div>
    </section>
  )
}
```

```css
/* src/Collapsible.css */
.collapsible[data-state='open'] {
  border-color: royalblue;
}
.collapsible button[aria-expanded='true'] {
  font-weight: 700;
}
```

**What happens, step by step:**
1. `open` is `false` at first, so React renders `data-state="closed"` and `aria-expanded="false"`, and the body has the `hidden` attribute.
2. A click sets `open` to `true`. React updates the three attributes.
3. The CSS selectors `[data-state='open']` and `[aria-expanded='true']` now match, so the border and the bold weight apply. No class logic in JavaScript at all.
4. Bonus: the same attribute that styles the button also tells screen readers whether it is expanded. The look and the meaning cannot get out of sync.

How React writes these attributes (checked by rendering each one):

| JSX | Rendered HTML |
|---|---|
| `data-active={true}` | `data-active="true"` |
| `data-active={false}` | `data-active="false"` |
| `data-active={undefined}` or `{null}` | no attribute |
| `aria-expanded={false}` | `aria-expanded="false"` |
| `hidden={false}` | no attribute |
| `hidden={true}` | `hidden=""` |

**Common mistake:** `data-active={false}` still renders `data-active="false"`. The selector `[data-active]` (no value) matches **any** value, including `"false"`. Write `[data-active='true']`, or pass `undefined` when the state is off.

Tailwind has variants for this pattern, such as `data-[state=open]:border-blue-600` and `aria-expanded:font-bold`. UI primitives like Radix set `data-state` for you.

### 5.3 Pass dynamic values as CSS variables

When a value comes from JavaScript (a percentage, a colour, a size), set a **CSS variable** with the `style` prop and use it in your stylesheet. The component stays in charge of the value, and the stylesheet stays in charge of the look.

```jsx
// src/ProgressBar.jsx
import './ProgressBar.css'

export function ProgressBar({ value, label }) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      style={{ '--value': `${clamped}%` }}
    >
      <div className="progress-fill" />
    </div>
  )
}
```

```css
/* src/ProgressBar.css */
.progress { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
.progress-fill {
  height: 100%;
  width: var(--value);
  background: #2563eb;
  transition: width 200ms ease;
}
```

**What happens, step by step:**
1. `<ProgressBar value={40} label="Upload" />` renders `style="--value: 40%;"` on the outer div. (A key that starts with `--` is a custom property, so it must be a quoted string key.)
2. Custom properties are **inherited**. The inner `.progress-fill` div reads the same `--value` through `var(--value)`.
3. When `value` changes, React changes one attribute. The browser animates the width because the CSS has a `transition`.
4. With `value={140}` the component clamps the number, and the element gets `--value: 100%` with `aria-valuenow="100"`.

With TypeScript, a custom property key is not in the `CSSProperties` type, so you write `{ '--value': '40%' } as React.CSSProperties` (see [TypeScript with React](08-typescript-with-react.md)).

**Common mistake:** building a class name from arbitrary data.

```jsx
// Wrong: there is no CSS for color-#e11d48, and you cannot write one for every colour
<span className={`tag color-${userColor}`}>New</span>

// Fixed: one class, one variable
<span className="tag" style={{ '--tag-color': userColor }}>New</span>
```

## 6. CSS variables and design tokens

A **CSS custom property** (usually called a CSS variable) is a name that starts with two hyphens. You read it with `var()`. Unlike Sass variables, which disappear at build time, CSS variables live in the browser, follow the cascade, and can change at runtime. The HTML, CSS and browser basics lesson (planned) covers the syntax. Here is why they matter for React:

```css
:root {
  --space-4: 16px;
  --radius: 8px;
  --color-action: #2563eb;
}

.button {
  padding: var(--space-4);
  border-radius: var(--radius);
  background: var(--button-bg, var(--color-action)); /* second value is a fallback */
  color: white;
}

.danger-zone {
  --button-bg: crimson; /* every .button inside now uses crimson */
}
```

**What happens, step by step:**
1. `:root` is the `<html>` element, so these variables are available everywhere.
2. `.button` reads `--button-bg`. If it is not defined, the fallback `var(--color-action)` is used.
3. Inside `.danger-zone`, `--button-bg` is defined, and variables inherit down the tree, so every `.button` in that area turns red. You styled a whole subtree without touching the buttons.

**Design tokens** are the named design decisions of a product: colours, spacing, font sizes, radii, shadows, animation durations. You store them once and use them everywhere, so a redesign is a change in one place. A common structure has two layers:

```css
/* src/tokens.css */
:root {
  /* primitive tokens: the raw palette */
  --gray-50: #f9fafb;
  --gray-900: #111827;
  --blue-600: #2563eb;
  --blue-400: #60a5fa;

  /* semantic tokens: what each value is FOR */
  --color-surface: var(--gray-50);
  --color-text: var(--gray-900);
  --color-action: var(--blue-600);
}
```

Components use only the **semantic** names (`var(--color-surface)`). A theme then changes only the semantic layer, which is exactly what dark mode does in section 8. Tailwind v4 works the same way: its `@theme` block defines tokens as CSS variables (section 9). When JavaScript needs a token (for a chart library, say), read it with `getComputedStyle(document.documentElement).getPropertyValue('--color-action')`.

**Common mistake:** components that use raw colours.

```css
/* Wrong: a hard-coded hex value in a component, impossible to theme */
.card { background: #f9fafb; }

/* Fixed: the semantic token */
.card { background: var(--color-surface); }
```

## 7. Naming: BEM and friends

When you use plain CSS files, names are your only protection from clashes. **BEM** (Block, Element, Modifier) is a simple naming rule:

- **Block**: a standalone component: `.card`
- **Element**: a part of a block: `.card__title`
- **Modifier**: a variation: `.card--featured`

```jsx
<section className="card card--featured">
  <h2 className="card__title">Pro plan</h2>
</section>
```

```css
.card { padding: 16px; }
.card--featured { border: 2px solid royalblue; }
.card__title { margin: 0; }
```

**What happens:** every selector is a single class, so specificity stays low and any rule is easy to override. Names say which component owns them, so two components rarely collide.

Two more rules that matter: name classes by **purpose, not looks** (`.btn-primary`, not `.blue-button`, because the colour will change), and avoid deep selectors like `.card .header .title span`. They are strong (high specificity) and break when the markup changes.

With CSS Modules or Tailwind you do not need BEM, because scope is already handled. You will still meet it in older code and in interviews.

## 8. Theming and dark mode

A **theme** is a set of token values. Dark mode is a second theme. The plan:

1. Define semantic tokens as CSS variables. Override them under `[data-theme='dark']`.
2. Decide the starting theme: the user's saved choice, else the operating system's preference (`prefers-color-scheme`), else light.
3. Apply the theme by setting `data-theme` on the `<html>` element.
4. Run that logic **before the first paint** so the page does not flash the wrong colours.
5. Use a React context for the toggle button and for any JavaScript that needs to know the theme.

**Step 1: tokens.** These are the semantic tokens from section 6, with the light values written out and a dark override added. (Use these in place of the `:root` semantic tokens in `tokens.css`.)

```css
/* src/index.css */
:root {
  color-scheme: light;
  --color-surface: #f9fafb;
  --color-text: #111827;
  --color-action: #2563eb;
}

:root[data-theme='dark'] {
  color-scheme: dark;
  --color-surface: #111827;
  --color-text: #f9fafb;
  --color-action: #60a5fa;
}

body {
  background: var(--color-surface);
  color: var(--color-text);
}
```

`color-scheme` tells the browser to draw its own parts (scrollbars, form controls, default text colours) in the matching style. Without it, you get a dark page with a bright white scrollbar and inputs.

**Step 2 to 4: the head script.** Put this in `index.html`, inside `<head>`:

```html
<script>
  (function () {
    try {
      var saved = localStorage.getItem('theme')
      var dark = saved === 'dark' || (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    } catch (e) {}
  })()
</script>
```

**Step 5: the React side.**

```jsx
// src/ThemeContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'theme'

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage can be blocked (private mode, strict browser settings)
  }
  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore: the choice still works for this visit
    }
  }

  return <ThemeContext value={{ theme, toggleTheme }}>{children}</ThemeContext>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (value === null) throw new Error('useTheme must be used inside <ThemeProvider>')
  return value
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button type="button" onClick={toggleTheme} aria-pressed={theme === 'dark'}>
      Dark mode
    </button>
  )
}
```

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
```

**What happens, step by step** (each case was run in the practice app with Testing Library):
1. First visit, nothing saved, the operating system is in dark mode: `getInitialTheme` returns `'dark'`, the effect sets `<html data-theme="dark">`, and the toggle has `aria-pressed="true"`. `localStorage` is still empty, because the user has not chosen anything yet. That matters: we do not want to turn a system default into a permanent choice.
2. A saved `'light'` beats a system preference for dark. The page is light.
3. If `window.matchMedia` does not exist (jsdom, the test environment, has no `matchMedia`), the code falls back to light instead of crashing.
4. The user clicks the toggle: the state changes, the effect sets the attribute, and the choice is saved. Two clicks went `light -> dark -> light`, and `localStorage` held `dark`, then `light`.
5. The CSS variables switch the instant the attribute changes. No styled component re-renders. Only components that read the context (the toggle) re-render. This is a big reason to prefer variables over passing a `theme` object into every component.
6. `useTheme` throws a clear error if you forget the provider. See the [useContext lesson](../02-hooks/05-usecontext.md) for the pattern and for context performance.

**The flash of the wrong theme.** The browser paints the first frame from your HTML and CSS, before the React bundle has downloaded and run. If React sets `data-theme` in an effect, a dark-mode user sees a bright page for a moment, then it flips. That is the flash. The head script fixes it because:
- A classic inline `<script>` in the head runs **immediately** while the HTML is parsed, before the first paint.
- Your app's `<script type="module">` is **deferred**, so it runs later.
- Both the script and `getInitialTheme` follow the same rules, so React starts with the value the page already shows.

If your site sets a strict Content Security Policy, an inline script needs a nonce or a hash.

In server-rendered apps the server cannot read `localStorage`, so the same idea applies with two extra points. The head script still does the work. And the server HTML does not contain the attribute that the script adds before React hydrates, so theme libraries for Next.js (for example `next-themes`) tell you to put `suppressHydrationWarning` on the `<html>` tag. Another option is to store the choice in a cookie, so the server can render the right attribute. See [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md).

**Common mistake:** reading `localStorage` while rendering in a server-rendered app.

```jsx
// Wrong in SSR: the server has no localStorage (it crashes), and the client's first render
// would not match the server HTML
const [theme] = useState(localStorage.getItem('theme') ?? 'light')

// Fixed: guard the browser API and keep the head script as the source of truth
const [theme, setTheme] = useState(getInitialTheme) // has try/catch and a matchMedia check
```

Two other traps: do not save the system default as if it were the user's choice (step 1 above), and do not forget `color-scheme`.

Dark mode needs its own contrast check (section 14). The token values above are chosen so that text and button colours pass the AA minimum in both themes.

## 9. Tailwind CSS

**Tailwind CSS** is a "utility-first" framework. Instead of writing CSS rules with your own names, you put small, single-purpose classes straight on the element: `p-4` is padding, `flex` is `display: flex`, `text-lg` is a font size. You build a design by combining them.

Tailwind is at version 4 (v4.0 came out in January 2025, and 4.3.x is current as of November 2026). Setup for a Vite app:

```bash
npm install tailwindcss @tailwindcss/vite
```

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

```css
/* src/index.css */
@import "tailwindcss";
```

That one CSS line is the whole setup. There is no `tailwind.config.js` and no content list: Tailwind v4 finds your source files by itself.

```jsx
export function Button({ children }) {
  return (
    <button
      type="button"
      className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:px-6"
    >
      {children}
    </button>
  )
}
```

**What happens, step by step:**
1. Each class means one declaration (or a small group): `px-4` is horizontal padding, `rounded-lg` is a border radius, `bg-blue-600` is a colour from the default palette.
2. A prefix before a colon is a **variant**: `hover:` applies on hover, `focus-visible:` on keyboard focus, `md:` from the medium breakpoint upward. Without a prefix, a class applies at all sizes. This is mobile-first (section 12).
3. At build time Tailwind scans your source files as **plain text**, finds the class names, and creates CSS for only those. The final CSS file is small, and a class you delete from the markup disappears from the CSS.
4. The design values (spacing steps, colours, sizes) come from one scale, so the UI stays consistent.

**Make your own tokens with `@theme`.** In v4 you configure Tailwind in CSS:

```css
@import "tailwindcss";

@theme {
  --color-brand: #2563eb;
  --font-display: "Satoshi", sans-serif;
  --breakpoint-3xl: 1920px;
}
```

`--color-brand` creates `bg-brand`, `text-brand`, `border-brand` and so on (the `--color-*` namespace decides which utilities exist). Theme values are also real CSS variables on `:root`, so `style={{ background: 'var(--color-brand)' }}` works too.

**Dark mode in Tailwind.** By default the `dark:` variant follows the system setting (`prefers-color-scheme`). To follow your own toggle from section 8, tell Tailwind which selector means "dark":

```css
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

Now `bg-white dark:bg-black` follows `<html data-theme="dark">`. You can also skip `dark:` everywhere by defining semantic colour variables (section 6) and switching those, which is the approach the shadcn/ui kit takes.

**Common mistake: building class names from variables.** Tailwind reads your files as text. It does not run your code, so it never sees the finished class name.

```jsx
// Wrong: the text "bg-red-500" never appears in the source, so no CSS is created for it
<div className={`bg-${color}-500`} />

// Fixed: write complete class names and look them up
const colorClass = {
  red: 'bg-red-500',
  green: 'bg-green-500',
}
<div className={colorClass[color]} />
```

### Conditional classes: `clsx`, `tailwind-merge` and `cn`

Utility class lists get long, and components usually let the parent add or override classes. Two small packages solve the two problems:

- `clsx` builds a class string from conditions (section 5.1).
- `tailwind-merge` removes **conflicting** Tailwind classes, so the last one wins.

Most Tailwind projects combine them in one helper (shadcn/ui ships the same helper, named `cn`):

```js
// src/lib/cn.js
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
```

```jsx
import { cn } from './lib/cn.js'

export function Button({ className, ...props }) {
  return (
    <button
      className={cn('rounded bg-blue-600 px-4 py-2 text-white', className)}
      {...props}
    />
  )
}

// <Button className="px-8 bg-red-600">Delete</Button>
// class becomes: "rounded py-2 text-white px-8 bg-red-600"
```

**Why is `tailwind-merge` needed?** If both `px-4` and `px-8` are in the class list, which one wins is **not** decided by their order in the `class` attribute. The browser decides by the order of the rules in the stylesheet, and you do not control that. So "put the override last" does not work. `twMerge` knows which Tailwind classes conflict, drops the earlier one, and keeps the override. Use a version of `tailwind-merge` that supports your Tailwind version (its 3.x line is for Tailwind v4; 2.x is for Tailwind v3, see its readme).

### Variants with `cva`

When a component has several variants, `cva` (class-variance-authority) keeps them in one object:

```js
import { cva } from 'class-variance-authority'

const button = cva('rounded px-4 py-2 font-medium', {
  variants: {
    intent: {
      primary: 'bg-blue-600 text-white',
      danger: 'bg-red-600 text-white',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
    },
  },
  defaultVariants: { intent: 'primary', size: 'md' },
})

button()                                // base + primary + md
button({ intent: 'danger', size: 'sm' }) // base + danger + sm
```

```jsx
export function Button({ intent, size, className, ...props }) {
  return <button className={cn(button({ intent, size }), className)} {...props} />
}
```

**What happens:** `button(...)` returns one class string. Omitted variants fall back to `defaultVariants`. Passing the result through `cn` lets the caller still override a class. `cva` also supports `compoundVariants` for rules like "primary and small together". Its TypeScript helper `VariantProps` gives you prop types for free.

### Tailwind: pros and cons

Pros:
- No naming and no switching files. Styles sit next to the markup.
- A fixed design scale (spacing, colours, sizes) keeps the UI consistent.
- The final CSS stays small, and deleting markup deletes its styles.
- No runtime cost, and it works in Server Components because it is plain CSS.
- Very fast to prototype with.

Cons:
- Long class lists are hard to read. You must extract components to avoid copy and paste.
- You need to learn the class vocabulary.
- Overriding needs a merge helper (`cn`).
- Class names must be complete strings in the source (the dynamic class trap).
- v4 needs modern browsers (Safari 16.4+, Chrome 111+, Firefox 128+ per the upgrade guide), and upgrades rename things.

**Old code you may meet (Tailwind v3).** Many tutorials still show v3. Signs: `@tailwind base; @tailwind components; @tailwind utilities;` in the CSS, a `tailwind.config.js` with a `content` array, and `postcss` plus `autoprefixer` setup. Some utilities were renamed in v4: `shadow-sm` became `shadow-xs`, `outline-none` became `outline-hidden`, `bg-gradient-to-r` became `bg-linear-to-r`, and `ring` is now 1px wide (use `ring-3` for the old size). If a class from a tutorial looks wrong, check the version.

## 10. CSS-in-JS and zero-runtime alternatives

**CSS-in-JS** means writing your CSS inside JavaScript files. The most famous libraries are **styled-components** and **Emotion**. You create components that carry their own styles, and the styles can use props.

```jsx
import styled from 'styled-components'

const Button = styled.button`
  padding: 8px 16px;
  border: 0;
  border-radius: 6px;
  color: white;
  background: ${(props) => (props.$danger ? 'crimson' : 'royalblue')};

  &:hover {
    opacity: 0.9;
  }
`

export function Demo() {
  return (
    <>
      <Button>Save</Button>
      <Button $danger>Delete</Button>
    </>
  )
}
```

**What happens, step by step:**
1. `styled.button` returns a React component that renders a `<button>`.
2. Every time it renders, the library calls your function with the props, and builds the final CSS text.
3. It makes a short hash of that text to use as a class name, and adds the rule to a `<style>` tag in the document head (if that rule is not there yet).
4. It renders `<button class="...">` with the new class.
5. The `$` in `$danger` marks a **transient prop**: it is used for styling and is not passed down to the DOM element, so React does not warn about an unknown attribute.

This is why it is called **runtime** CSS-in-JS: the CSS is built and inserted in the browser while your app runs.

**What you get:** styles next to the component, automatic scoping, and any JavaScript value inside a style. That feels great in a small app.

**What it costs:**
- **Work on every render.** The library builds CSS strings and may insert rules, on the main thread, while the user waits.
- **Extra JavaScript** in the bundle (the library itself).
- **Awkward timing with React.** Inserting style rules during render can make the browser recalculate styles more often. React added the `useInsertionEffect` hook for CSS-in-JS library authors to insert rules at the right moment (see [Other hooks](../02-hooks/09-other-hooks.md)).
- **Server rendering needs setup.** The server must collect the generated rules into the HTML, usually through a "registry" component.
- **Server Components.** A Server Component cannot use the hooks and context that runtime libraries depend on. Components that use them must be Client Components (`'use client'`). The Next.js docs list styled-components, MUI, Chakra UI, Ant Design and others as supported in Client Components, and say that Emotion support was still being worked on. Plain CSS, CSS Modules and Tailwind have no such limit. See [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md).

**State of the libraries (checked November 2026):**
- The maintainer of styled-components announced "maintenance mode": only occasional fixes, no big API changes, and advice not to start new projects with it. It still ships releases (6.6.0 in October 2026).
- Emotion's latest releases are `@emotion/react` 11.14.0 (December 2024) and `@emotion/styled` 11.14.1 (June 2025). MUI still uses Emotion as its default styling engine.
- MUI's own zero-runtime library, Pigment CSS, is still at version 0.0.x.

**Zero-runtime alternatives.** These keep the "write styles in JavaScript or TypeScript" idea but do the work at **build time**. The output is a normal CSS file, so there is no style building in the browser. Values that depend on props are passed as CSS variables or chosen from a fixed set of variants.

- **vanilla-extract**: type-safe stylesheets in `.css.ts` files.
- **Panda CSS**: a build-time styled system with tokens and recipes.
- **StyleX**: a compiler from Meta that makes small atomic CSS classes.

```ts
// button.css.ts  (vanilla-extract)
import { style } from '@vanilla-extract/css'

export const button = style({
  padding: '8px 16px',
  borderRadius: 6,
  ':hover': { opacity: 0.9 },
})
```

```tsx
// Button.tsx
import type { ReactNode } from 'react'
import { button } from './button.css'

export function Button({ children }: { children: ReactNode }) {
  return <button className={button}>{children}</button>
}
```

The Next.js docs list vanilla-extract, Panda CSS and StyleX as working in Client Components of the App Router. Do not assume more than that without testing, because "zero-runtime" does not by itself promise Server Component support.

**Verdict.** For a new project, prefer CSS Modules, Tailwind, or a zero-runtime tool. Runtime CSS-in-JS is not dead: huge existing codebases and some UI kits depend on it, and you must be able to read and maintain it.

## 11. UI libraries and component kits

Buttons are easy. Dialogs, menus, tabs, comboboxes and date pickers are hard: they need keyboard support, focus handling and correct ARIA (see [Accessibility](../04-advanced/09-accessibility.md)). Many teams use a library for them. There are two kinds:

- **Styled kits** give you finished, themed components. You ship fast, and you customise through the kit's theme. Examples: MUI, Chakra UI, Ant Design, Mantine.
- **Headless primitives** give you behaviour and accessibility with **no look**. You style them yourself with CSS Modules, Tailwind or anything else. Examples: Radix UI, Base UI, React Aria Components, Headless UI. (The pattern behind them is in [Component patterns](01-component-patterns.md).)

**shadcn/ui** sits in between and works differently: it is not an installed package of components. A command copies the component source into **your** repository, styled with Tailwind, built on a headless primitive library. You own the code and can edit it freely.

```bash
npx shadcn@latest init
npx shadcn@latest add button
```

```jsx
import { Button } from '@/components/ui/button'

export function Toolbar() {
  return <Button variant="outline">Save</Button>
}
```

(`@/` is a path alias for `src/`. The setup command and guide for Vite tell you how to add it; see Tooling (planned).)

Facts as of November 2026:

| Library | Kind | Notes |
|---|---|---|
| MUI (`@mui/material`) | styled kit | version 9.x (v9.0.0 came out in April 2026); Emotion by default; old tutorials show v5 to v7 |
| Chakra UI | styled kit | version 3.x; listed in the Next.js docs as working in Client Components |
| Ant Design | styled kit | large set of business components; listed in the Next.js docs as working in Client Components |
| Mantine | styled kit | version 9.x |
| shadcn/ui | copied-in components | Tailwind styling; since July 2026 new projects default to Base UI primitives, and Radix or React Aria can be chosen instead |
| Radix UI | headless | one package, `radix-ui`; `import { Dialog } from "radix-ui"` |
| Base UI | headless | package `@base-ui/react`, 1.0 in December 2025 |
| React Aria Components | headless | from Adobe, `react-aria-components` |
| Headless UI | headless | built to pair with Tailwind |

**How to choose.** Ask these questions:
1. **How custom is the look?** An internal admin tool can wear a styled kit as it is. A product with a strong brand needs headless parts and your own styles.
2. **How much time do you have?** A kit saves weeks.
3. **Accessibility.** Hand-made dialogs and comboboxes are usually wrong. Use tested primitives.
4. **Bundle size and performance.** Check what you import and what it adds.
5. **Server rendering.** Does it work with your framework and Server Components?
6. **Control and lock-in.** shadcn/ui gives you the source. A kit gives you updates but also its rules.
7. **Team skills.** A Tailwind team will like shadcn/ui. A team without CSS strength will move faster with a kit.

**Common mistake:** customising a styled kit by fighting it with `!important` and deep selectors. Use its theme, its slots or class hooks, or its CSS variables. If you fight it all day, you picked the wrong kit.

## 12. Responsive design

Responsive design means the layout adapts to the screen. Do it in CSS first. The HTML, CSS and browser basics lesson (planned) covers flexbox and grid. Here is the React-relevant part.

**Mobile first.** Write the small-screen layout as the default, then add rules for larger screens with `min-width` queries.

```css
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

Often you need no media query at all: `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` makes as many columns as fit.

**Container queries.** A media query looks at the **screen** width. A reusable component should care about the width of the space it is **given**, which can be a narrow sidebar or a wide main area on the same screen. That is a container query.

```css
.card-slot {
  container-type: inline-size; /* this element becomes a size container */
}

.card {
  display: block;
}

@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 16px;
  }
}
```

```jsx
<div className="card-slot">
  <article className="card">
    <img src="/cover.jpg" alt="" />
    <div>Card text</div>
  </article>
</div>
```

**What happens, step by step:**
1. `container-type: inline-size` makes `.card-slot` something that other rules can measure.
2. The `@container` rule applies to **descendants** of the container (not the container itself) and checks the container's width.
3. In a narrow slot the card stays stacked. In a wide slot (400px or more) it becomes two columns. The same `Card` component works in both places with no JavaScript. Tailwind v4 has this built in: add the `@container` class to the parent and use variants like `@md:grid-cols-2` on the children.

**When to use JavaScript.** A hook like `useMediaQuery` (built in the [custom hooks lesson](../02-hooks/08-custom-hooks.md)) is for when you must render **different components or behaviour**, not just different styles. For pure styling prefer CSS, because the CSS version needs no extra render, and on the server there is no screen to measure, so the JavaScript version can flash the wrong layout or cause a hydration mismatch. In tests, jsdom has no `window.matchMedia` at all (I checked: `typeof window.matchMedia` is `'undefined'`), so a component that calls it needs a stub in the test.

Also remember: the `<meta name="viewport" content="width=device-width, initial-scale=1" />` tag (the Vite template has it), `rem` for font sizes so user settings are respected, and `clamp(1rem, 2.5vw, 1.5rem)` for fluid sizes.

## 13. Animations

Animate with CSS first. A **transition** animates a change between two states. Here is an accessible switch whose look follows its ARIA state:

```jsx
// src/Switch.jsx
import './Switch.css'

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" />
    </button>
  )
}
```

```css
/* src/Switch.css */
.switch {
  position: relative;
  width: 44px;
  height: 24px;
  border: 0;
  border-radius: 999px;
  background: #6b7280;
  cursor: pointer;
  transition: background-color 200ms ease;
}

.switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  transition: transform 200ms ease;
}

.switch[aria-checked='true'] {
  background: #2563eb;
}

.switch[aria-checked='true'] .switch-knob {
  transform: translateX(20px);
}

@media (prefers-reduced-motion: reduce) {
  .switch,
  .switch-knob {
    transition: none;
  }
}
```

**What happens, step by step:**
1. The parent keeps `checked` in state. React renders `aria-checked="false"`. (In a Testing Library run, `aria-checked` was `"false"` before the click and `"true"` after it.)
2. On click, the attribute changes. The CSS selector `.switch[aria-checked='true']` now matches, so the target background and the knob position change.
3. Because the elements have `transition`, the browser animates between the old and new values over 200 ms. React does not animate anything. It only changes an attribute.
4. Users who turned on "reduce motion" in their operating system match `prefers-reduced-motion: reduce`, and the transitions are switched off. They get the same result, instantly.

The off-state track colour is `#6b7280`, not a lighter grey, because interface parts need at least 3:1 contrast against the page (section 14).

**Keyframe animations** run on their own, with no state change:

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 800ms linear infinite;
}
```

**Animate `transform` and `opacity`.** Changing `width`, `height`, `top` or `left` makes the browser recalculate layout on every frame. Changing `transform` and `opacity` can be handled without that work, so they stay smooth. (More in the browser lesson (planned) on the rendering pipeline.)

**The exit animation problem.** When React removes an element, it is gone at once, so there is nothing left to animate out. Options: keep it mounted and set a `data-state="closed"` first, then unmount when the animation ends; use a library; or use newer CSS features such as `@starting-style` (for enter animations) and `transition-behavior: allow-discrete`. Check browser support before relying on them.

**Libraries and platform features:**
- **Motion** (previously called Framer Motion) is the most used React animation library. It handles gestures, layout animations and exit animations (`AnimatePresence`).
- The browser's **View Transitions API** (`document.startViewTransition`) animates between two page states, and React 19.3 has a `<ViewTransition>` component built on it. See [React 19 and newer](../04-advanced/04-react-19-and-newer.md) and [Concurrent React and Suspense](../04-advanced/03-concurrent-react-and-suspense.md). It does not run in jsdom tests.

## 14. Accessible colour contrast

Colours must be readable for people with low vision, in sunlight, on cheap screens. The measure is the **contrast ratio** between two colours, from 1:1 (same colour) to 21:1 (black on white). The WCAG 2.2 guidelines, whose AA level is the usual target, ask for:

- **4.5:1** for normal text
- **3:1** for large text (at least 24px, or 18.66px and bold)
- **3:1** for interface parts and graphics (input borders, icons, a switch track, focus rings)

You do not have to guess. Browser DevTools show the ratio in the colour picker. You can also compute it:

```js
// src/contrast.js
function channel(value) {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function luminance(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(channel)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

export function meetsAA(foreground, background, { largeText = false } = {}) {
  return contrastRatio(foreground, background) >= (largeText ? 3 : 4.5)
}
```

**What happens, step by step:**
1. `channel` turns one 0-255 colour channel into a linear light value. This undoes the gamma curve that screens use.
2. `luminance` combines red, green and blue with weights that match how the eye sees them (green counts most). The result is 0 for black and 1 for white.
3. `contrastRatio` divides the lighter luminance by the darker one, with 0.05 added to both (a small allowance for screen glare, which also avoids dividing by zero for black). The order is sorted for you, so the arguments can be in either order.
4. `meetsAA` compares the ratio to 4.5, or to 3 for large text.

Results of running the function:

| Foreground on background | Ratio | AA normal text | AA large text |
|---|---|---|---|
| `#000000` on `#ffffff` | 21.00 | pass | pass |
| `#767676` on `#ffffff` | 4.54 | pass | pass |
| `#777777` on `#ffffff` | 4.48 | fail (just) | pass |
| `#2563eb` on `#ffffff` | 5.17 | pass | pass |
| `#3b82f6` on `#ffffff` | 3.68 | fail | pass |
| `#9ca3af` on `#ffffff` | 2.54 | fail | fail |
| `#6b7280` on `#ffffff` | 4.83 | pass | pass |

The tokens from section 8 pass too: `#2563eb` on `#f9fafb` is 4.95, and in dark mode `#60a5fa` on `#111827` is 6.98. Body text on the surface is 16.98 in both themes.

More rules:
- **Do not use colour alone** to show meaning. An error field needs text or an icon as well as red.
- **Never remove the focus outline** (`outline: none`) without a visible replacement. Use `:focus-visible` to style keyboard focus.
- **Check both themes.** Dark mode is not "invert the colours".
- Disabled controls are exempt from the contrast rule, but do not make everything look disabled.

More in the [Accessibility lesson](../04-advanced/09-accessibility.md).

## 15. Two practical notes: stylesheets in React 19 and testing styles

**React 19 can manage stylesheets.** A component can render a `<link rel="stylesheet">` with a `precedence` prop. React moves it into `<head>`, orders it by precedence, and removes duplicates.

```jsx
function Page() {
  return (
    <>
      <link rel="stylesheet" href="/card.css" precedence="default" />
      <p>Card</p>
    </>
  )
}
```

Rendered in the practice app, the `<p>` stays in the container, and `document.head` gets `<link rel="stylesheet" href="/card.css" data-precedence="default">`. Rendering `<Page />` twice still gives a single link. In a Vite app you normally just `import './x.css'`. This feature matters more for frameworks and streaming server rendering (see [React 19 and newer](../04-advanced/04-react-19-and-newer.md)).

**Test behaviour, not pixels.** jsdom (the fake browser in tests) does not do layout and does not really run the cascade. So:
- Test what the user can see and do: text, roles, ARIA state. For example `getByRole('switch', { name: 'Notifications' })` and check `aria-checked`.
- Use `toHaveClass('btn')` for plain class names, `toHaveAttribute('data-state', 'open')` for data attributes, and `toHaveStyle({ width: '40%' })` for inline styles. All three assertions pass in the practice app.
- Do not assert exact CSS Module class names (they are hashed, section 3).
- Stub `window.matchMedia` when code calls it (section 12).
- For "does it look right", use visual regression tests with a real browser (see [Testing React](../04-advanced/08-testing-react.md)).

## 16. How to choose: a short decision guide

- **New app, small team, no strong opinions:** Tailwind, or CSS Modules with CSS variables. Both are fast, have no runtime cost, and work with Server Components.
- **Strong custom brand, a design system for many apps:** design tokens as CSS variables, headless primitives, and CSS Modules or a zero-runtime tool.
- **Internal tool or dashboard on a deadline:** a styled kit (MUI, Ant Design, Mantine, Chakra), used through its theme.
- **Tailwind team that wants owned components:** shadcn/ui.
- **Existing app with styled-components or Emotion:** keep it, avoid rewriting without a reason, and do not add it to new Server Component code.
- **One-off dynamic values everywhere:** CSS variables set with the `style` prop.

## How interviewers test this
- They check that you can name **several** options and give a real trade-off for each, not only your favourite. "It depends on the team and the app" followed by concrete criteria is a strong answer.
- They check that you understand **scope**: CSS is global, and each approach (Modules, Tailwind, CSS-in-JS, BEM) solves it differently.
- They test whether you **follow the ecosystem**. Knowing the runtime cost of CSS-in-JS and its Server Components limits is a strong signal. Red flags: "styled-components is the standard", "Emotion works in Server Components", "Tailwind is the same as inline styles" (it has variants, a design scale and no cascade problems from inline style specificity).
- For **dark mode**, a strong answer has CSS variables, a `data-theme` attribute, system preference, `localStorage`, and how to avoid the flash. A red flag is passing a theme object through props to restyle every component in JavaScript.
- They look for **accessibility habits**: contrast, visible focus, `prefers-reduced-motion`, ARIA state as a styling hook.
- Machine coding rounds often ask for a **theme switcher** or a toggle, so practise one until you can write it in ten minutes (see [Round 4](../05-interview-rounds/round-4-machine-coding/README.md)).

## Interview questions and model answers

### Q1. How do you style components in React, and what are the trade-offs? (Easy)
React has no built-in system, so there are several options. **Plain CSS** with `className` is simple and powerful, but global. **CSS Modules** rename classes at build time, so styles are scoped, with no runtime cost. **Inline `style` objects** are good for truly dynamic values but cannot do `:hover`, media queries or animations. **Tailwind** puts utility classes in the markup: consistent and small output, but long class lists. **CSS-in-JS** keeps styles in components and uses props easily, but runtime libraries add cost and do not work in Server Components. **UI kits** give finished components fast, with less control over the look. I would choose CSS Modules or Tailwind for a new app, plus CSS variables for theming.

### Q2. Inline styles vs CSS classes: when do you use each? (Easy)
Use classes for almost everything: they support pseudo-classes, media queries, animations, reuse and theming, and they keep markup small. Use inline styles only for values that are truly dynamic, like a width from a percentage or a position while dragging. Even then, I prefer to set a **CSS variable** with the `style` prop (`style={{ '--value': '40%' }}`) and use `width: var(--value)` in the stylesheet, so the rules stay in CSS. Inline styles also win over stylesheet rules, which makes them hard to override.

### Q3. CSS Modules vs CSS-in-JS? (Medium)
Both give scoped styles. CSS Modules are real CSS files whose class names are renamed at build time. The output is a static `.css` file, there is no runtime work, and they work in Server Components. CSS-in-JS (runtime) builds CSS strings from JavaScript while the app renders and inserts them into the page. That makes dynamic props and co-location easy, but it costs render time and bundle size, needs server-rendering setup, and only works in Client Components. Dynamic values in CSS Modules go through class toggling and CSS variables. For new projects I choose CSS Modules, or a zero-runtime CSS-in-JS tool if I want styles in TypeScript.

### Q4. Why is CSS-in-JS declining? (Medium)
Several reasons together. Runtime libraries do styling work in the browser on every render and add JavaScript. Injecting rules while React renders is awkward, which is why React added `useInsertionEffect` for library authors. Server rendering needs extra setup, and Server Components cannot run the hooks and context these libraries need, so they work only in Client Components. Better options appeared: CSS Modules, Tailwind, and zero-runtime tools that do the work at build time. There is also a signal from the maintainers: the styled-components maintainer announced maintenance mode and advises against starting new projects with it, and the latest `@emotion/react` and `@emotion/styled` releases date from December 2024 and June 2025. It is declining for **new** projects, not gone: many codebases and UI kits (MUI uses Emotion by default) still rely on it.

### Q5. How do you avoid style conflicts? (Medium)
First understand the cause: CSS is global, and when two rules tie on specificity, the later one wins. Then pick a scoping strategy. **CSS Modules** rename classes to unique names. **Tailwind** uses a fixed set of utility classes, so you do not invent colliding names. **BEM** is a naming convention (`.card__title--active`) for plain CSS. **Runtime CSS-in-JS** generates unique class names. Also keep specificity low (single classes, no deep selectors, no `!important`), and use **cascade layers** (`@layer`) to order third-party CSS below your own, because styles outside any layer beat styles inside layers.

### Q6. What are the pros and cons of Tailwind? (Medium)
Pros: no naming and no file switching, a fixed design scale for consistency, small CSS output because only used classes are created, no runtime cost, and it works with Server Components. Cons: long class lists hurt readability, you must extract components to avoid repetition, there is a vocabulary to learn, overriding needs `tailwind-merge`, class names must be complete strings in the source (`bg-${color}-500` fails), and major versions rename utilities (v4 needs modern browsers). It is not the same as inline styles: it has hover, focus and responsive variants, uses a shared scale, and has no inline specificity problem.

### Q7. How would you implement dark mode? (Medium)
Define semantic design tokens as CSS variables on `:root`, and override them under `:root[data-theme='dark']`. Set `color-scheme` too, so built-in controls match. Choose the starting theme in this order: the saved choice from `localStorage`, then `prefers-color-scheme`, then light. Apply it by setting `data-theme` on `<html>`. A context provider holds the current theme for the toggle button and any JavaScript that needs it; the toggle updates the attribute and saves the choice. Because the colours come from CSS variables, switching does not re-render the styled components. I run the same logic in a small inline script in `<head>` to avoid a flash. Last, I check contrast in both themes.

### Q8. How do you apply conditional or dynamic styles? (Easy)
Three tools. **Class toggling** with a helper like `clsx` or a small `cx` function, so false values drop out (a template literal can print `undefined`). **Data and ARIA attributes** (`data-state="open"`, `aria-expanded`) with attribute selectors in CSS, which keeps state visible in the markup and in sync with accessibility. **CSS variables** set from props (`style={{ '--progress': '40%' }}`) for arbitrary values. Avoid creating a class for every possible value, and avoid long inline style objects.

### Q9. What is the flash of the wrong theme, and how do you avoid it? (Hard)
The browser paints from HTML and CSS before the JavaScript bundle runs. If the theme is applied in a React effect, a dark-mode user sees the light theme first, then it flips. The fix is to apply the theme before the first paint: a small **classic inline script** in `<head>` reads `localStorage` and `matchMedia` and sets `data-theme` on `<html>`. Classic scripts run while the page is parsed, but module scripts are deferred, so this runs first. React then starts from the same value. In server-rendered apps the server cannot read `localStorage`, so theme libraries add the script and use `suppressHydrationWarning` on `<html>` (the attribute changes before hydration), or you store the choice in a cookie that the server can read.

### Q10. Why do Tailwind projects use `clsx` and `tailwind-merge` together? (Medium)
They solve two different problems. `clsx` builds a class string from conditions and drops false values. `tailwind-merge` resolves **conflicts**: if a base has `px-4` and the caller passes `px-8`, which wins is decided by the stylesheet order, not the order in the class attribute, so the override can silently fail. `twMerge` knows that both set horizontal padding, removes the earlier one, and keeps the override. A helper `cn = (...inputs) => twMerge(clsx(inputs))` is the common pattern, and shadcn/ui ships it. Match the `tailwind-merge` version to your Tailwind version.

### Q11. How do you build a responsive layout in React? (Medium)
Mostly in CSS, not in JavaScript. Use mobile-first media queries with `min-width`, flexbox and grid (`repeat(auto-fill, minmax(240px, 1fr))` needs no query), and relative units. For reusable components use **container queries** (`container-type: inline-size` and `@container`), so a component reacts to the space it is given instead of the screen. Use a JavaScript hook like `useMediaQuery` only when you must render different components or behaviour, because it adds renders, has no value on the server and can flash the wrong layout. In tests, stub `window.matchMedia`, because jsdom does not have it.

### Q12. How do you choose a UI library? (Medium)
I compare how custom the design must be, the time available, accessibility needs, bundle size, server rendering support, lock-in and team skills. A styled kit (MUI, Chakra, Ant Design, Mantine) is fastest for dashboards and internal tools, but is harder to make look unique. Headless primitives (Radix, Base UI, React Aria, Headless UI) give accessible behaviour with no look, so I style them myself. shadcn/ui copies Tailwind-styled components into my repo, so I own the code. I would not build dialogs, menus or comboboxes from scratch, because focus management and keyboard support are easy to get wrong.

### Q13. How do you handle animations, and what about users who dislike motion? (Medium)
Prefer CSS transitions and keyframes, driven by a state change on a class, a data attribute or an ARIA attribute. Animate `transform` and `opacity`, which are cheap, and avoid `width`, `height`, `top` and `left`. Wrap motion in `@media (prefers-reduced-motion: reduce)` to turn it off or reduce it. React removes elements immediately, so exit animations need extra work: keep the element mounted until the animation ends, use newer CSS such as `@starting-style`, or use a library such as Motion (`AnimatePresence`). The View Transitions API and React 19.3's `<ViewTransition>` can animate between page states.

### Q14. What are design tokens, and how do CSS variables help? (Medium)
Design tokens are the named design decisions: colours, spacing, type sizes, radii, shadows, durations. You keep them in one place, so a redesign or a new theme is one change. In the browser the natural home for them is CSS custom properties. I use two layers: **primitive** tokens (`--blue-600`) and **semantic** tokens (`--color-action`). Components use only semantic names. A theme such as dark mode overrides only the semantic layer. Because variables are live in the browser and inherit, I can also override them for one subtree. Tailwind v4's `@theme` defines tokens the same way.

### Q15. How do you check colour contrast, and what are the numbers? (Easy)
Use the browser DevTools colour picker, or an automated checker such as axe in tests, and check both light and dark themes. WCAG 2.2 AA asks for 4.5:1 for normal text, 3:1 for large text, and 3:1 for interface components like input borders, icons and focus rings. For example `#777777` on white is 4.48:1 and fails by a hair, while `#767676` is 4.54:1 and passes. Also do not use colour as the only signal, and keep a visible focus indicator (use `:focus-visible` instead of removing the outline).

## Common mistakes and gotchas
- **`className={`btn ${x}`}` prints `undefined` or stray spaces.** Use `clsx` or a `cx` helper that drops false values.
- **Inline style as a string.** React throws. Use an object with camelCase keys.
- **`:hover` or `@media` inside a `style` object.** It does nothing. Move the rule to CSS.
- **Importing a plain CSS file and expecting it to be scoped.** It is global. Use CSS Modules or a naming rule.
- **Element selectors in a CSS Module** (`h2 { }`) stay global. Attach them to a class.
- **`[data-active]` matches `data-active="false"`.** Select `[data-active='true']` or pass `undefined` when off.
- **Building Tailwind classes from variables** (`bg-${color}-500`). Map values to complete class strings.
- **Putting an override last and expecting it to win in Tailwind.** Use `tailwind-merge`.
- **Applying the theme in an effect only.** A dark-mode user sees a flash. Add the head script.
- **Saving the system theme as the user's choice.** Save only on an explicit click.
- **Reading `localStorage` or `matchMedia` while rendering on the server.** Guard the calls and keep the head script as the source of truth.
- **Forgetting `color-scheme`.** The page is dark but scrollbars and inputs are bright.
- **Hard-coded colours in components.** Use semantic tokens so themes work.
- **`outline: none` with no replacement.** Keyboard users lose focus. Style `:focus-visible`.
- **Using `useMediaQuery` for plain styling.** Use CSS media or container queries.
- **Starting a new project on runtime CSS-in-JS and then using it in Server Components.** Choose CSS Modules, Tailwind or a zero-runtime tool.
- **Following old tutorials** for Tailwind v3 or MUI v5. Check the version before copying.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** What `class` attribute does this render? Explain each part of the result, then fix the code.
   ```jsx
   const active = false
   let size
   <div className={`btn ${active ? 'btn-active' : ''} ${size}`} />
   ```

<details>
<summary>Show answer</summary>

It renders `class="btn  undefined"`. There are two spaces and the word `undefined`: `btn` + space + `''` (empty string from the false branch) + space + `undefined` (a template literal turns `undefined` into the text "undefined"). Fix it with a helper that drops falsy values:

```jsx
const cx = (...parts) => parts.filter(Boolean).join(' ')

<div className={cx('btn', active && 'btn-active', size)} />
// class="btn"
```

</details>

2. **(Easy)** What does the browser receive as the `style` attribute? Why is `lineHeight: 1.5` not `1.5px`?
   ```jsx
   <div style={{ fontSize: 20, lineHeight: 1.5, opacity: 0.5, zIndex: 2, width: '50%' }} />
   ```

<details>
<summary>Show answer</summary>

`style="font-size: 20px; line-height: 1.5; opacity: 0.5; z-index: 2; width: 50%;"`. React adds `px` to plain numbers, but not for properties that take unitless numbers: `lineHeight`, `opacity`, `zIndex` and a few more. A `line-height: 1.5px` would be a tiny, wrong line height, while `1.5` means "1.5 times the font size". Strings such as `'50%'` are used as they are.

</details>

3. **(Easy)** Coding: write a `Tag` component that takes a `color` prop that can be **any** hex colour chosen by a user (for example `#e11d48`) and shows the text in that colour with a matching border. Do it without building class names from the colour.

<details>
<summary>Show answer</summary>

Set one CSS variable with the `style` prop and read it in CSS.

```jsx
// Tag.jsx
import './Tag.css'

export function Tag({ color, children }) {
  return (
    <span className="tag" style={{ '--tag-color': color }}>
      {children}
    </span>
  )
}
```

```css
/* Tag.css */
.tag {
  color: var(--tag-color);
  border: 1px solid var(--tag-color);
  padding: 2px 8px;
  border-radius: 999px;
}
```

`<Tag color="#e11d48">New</Tag>` renders `<span class="tag" style="--tag-color: #e11d48;">New</span>`. A class per colour is impossible because you cannot know every colour in advance. Note: user-chosen colours can have low contrast, so for real products also check the ratio (task 7).

</details>

4. **(Medium)** Coding: write `cx(...args)`, a small version of `clsx`. It must accept strings and numbers, arrays (nested), and objects (include the key when the value is truthy), and ignore falsy values. For example `cx('a', ['b', false, ['c']], { d: true, e: false }, 0, null, 7)` returns `'a b c d 7'`. (The practice app also has a JavaScript exercise for this: [classnames](../practice-app/exercises/js/21-classnames/README.md).)

<details>
<summary>Show answer</summary>

```js
export function cx(...args) {
  const out = []
  for (const arg of args) {
    if (!arg) continue
    if (typeof arg === 'string' || typeof arg === 'number') {
      out.push(String(arg))
    } else if (Array.isArray(arg)) {
      const inner = cx(...arg)
      if (inner) out.push(inner)
    } else if (typeof arg === 'object') {
      for (const [name, on] of Object.entries(arg)) {
        if (on) out.push(name)
      }
    }
  }
  return out.join(' ')
}
```

The example returns `a b c d 7`. Falsy values (`false`, `null`, `undefined`, `0`, `''`) are skipped first. Arrays are handled by calling `cx` again on their items (recursion), and an empty inner result is not pushed, so no stray spaces appear.

</details>

5. **(Medium)** What HTML does React render for this element? Then say whether the CSS selector `[data-active]` matches it.
   ```jsx
   <div data-active={false} data-open={undefined} aria-expanded={false} hidden={false} />
   ```

<details>
<summary>Show answer</summary>

`<div data-active="false" aria-expanded="false"></div>`. `data-*` and `aria-*` attributes turn booleans into the strings `"true"` and `"false"`. `undefined` removes the attribute, and `hidden={false}` also removes the attribute (it is a real boolean attribute). The selector `[data-active]` **does match**, because it only checks that the attribute exists. Use `[data-active='true']`, or pass `undefined` instead of `false`.

</details>

6. **(Medium)** A teammate wrote this Tailwind component. The `red` and `green` badges have no background. Explain why and fix it.
   ```jsx
   function Dot({ color }) {
     return <span className={`inline-block size-3 rounded-full bg-${color}-500`} />
   }
   ```

<details>
<summary>Show answer</summary>

Tailwind reads your source files as plain text and creates CSS for class names it finds there. It does not run your code. The text `bg-red-500` never appears in the file (only `bg-${color}-500` does), so no CSS is created for it. Write complete class names and look them up:

```jsx
const dotColor = {
  red: 'bg-red-500',
  green: 'bg-green-500',
}

function Dot({ color }) {
  return <span className={`inline-block size-3 rounded-full ${dotColor[color]}`} />
}
```

If the colour is arbitrary data (not a fixed set), pass it as a CSS variable instead, for example `style={{ '--dot': color }}`, and read it in a normal CSS class with `background: var(--dot)`.

</details>

7. **(Medium)** Coding: write `contrastRatio(foreground, background)` for hex colours like `'#767676'`, and `meetsAA(foreground, background, { largeText })`. Then check that `#777777` on white fails normal text and passes large text.

<details>
<summary>Show answer</summary>

```js
function channel(value) {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function luminance(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(channel)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

export function meetsAA(foreground, background, { largeText = false } = {}) {
  return contrastRatio(foreground, background) >= (largeText ? 3 : 4.5)
}
```

Results: `#000000` on white is 21.00, `#767676` on white is 4.54 (passes), and `#777777` on white is 4.48. So `meetsAA('#777777', '#ffffff')` is `false` and `meetsAA('#777777', '#ffffff', { largeText: true })` is `true`. Three-digit shorthand hex such as `#fff` is not handled; extend the function if you need it.

</details>

8. **(Medium)** Explain what the user sees, and why, when `Button` is used like this. Then say what changes if `cn` uses `twMerge`.
   ```jsx
   function Button({ className, ...props }) {
     return <button className={`bg-blue-600 px-4 text-white ${className}`} {...props} />
   }
   <Button className="bg-red-600 px-8">Delete</Button>
   ```

<details>
<summary>Show answer</summary>

The element gets both `bg-blue-600` and `bg-red-600`, and both `px-4` and `px-8`. The browser does not pick the "last class in the attribute". It picks the rule that comes later **in the stylesheet**, and the order of Tailwind's rules is not the order you wrote the classes in. So the button might be blue or red, and you cannot rely on it. With `className={twMerge('bg-blue-600 px-4 text-white', className)}` the conflicting earlier classes are removed and the result is `text-white bg-red-600 px-8`, so only the override remains. (If you use `clsx` too, wrap it: `twMerge(clsx(...))`.)

</details>

9. **(Hard)** Users with dark mode report a white flash when the site loads. The code sets `document.documentElement.dataset.theme` inside `useEffect`. Explain the timeline that causes the flash, and fix it. What extra problem appears with server rendering?

<details>
<summary>Show answer</summary>

Timeline: (1) the browser gets the HTML and CSS and paints the first frame with the default (light) tokens; (2) the JavaScript bundle downloads and runs; (3) React renders and the effect sets `data-theme="dark"`; (4) the page repaints in dark. Steps 1 to 4 are visible as a flash, because effects run after paint.

Fix: apply the theme before the first paint with a classic inline script in `<head>` (module scripts are deferred, classic inline scripts run during parsing):

```html
<script>
  (function () {
    try {
      var saved = localStorage.getItem('theme')
      var dark = saved === 'dark' || (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    } catch (e) {}
  })()
</script>
```

Keep React's initial state consistent with the script (same rules). With server rendering, the server has no `localStorage`, so the HTML it sends has no `data-theme`, but the script adds it before hydration. Theme libraries for Next.js handle this by putting `suppressHydrationWarning` on `<html>`. A cookie that the server can read is the other solution. A strict Content Security Policy needs a nonce or hash for the inline script.

</details>

10. **(Hard)** Coding: extend the theme provider so the user can pick **system**, **light** or **dark**. In `system` mode the page must follow the operating system **live** (when the OS flips, the page flips). Save the choice. Show three buttons with `aria-pressed`.

<details>
<summary>Show answer</summary>

The OS setting is an external store, so subscribe with `useSyncExternalStore` (see [Other hooks](../02-hooks/09-other-hooks.md)).

```jsx
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'

const KEY = 'theme-preference'
const QUERY = '(prefers-color-scheme: dark)'
const ThemeContext = createContext(null)

function readPreference() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // storage blocked: fall back to following the system
  }
  return 'system'
}

function subscribeToSystem(callback) {
  const query = window.matchMedia?.(QUERY)
  if (!query) return () => {}
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

function getSystemTheme() {
  return window.matchMedia?.(QUERY).matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readPreference)
  const system = useSyncExternalStore(subscribeToSystem, getSystemTheme, () => 'light')
  const theme = preference === 'system' ? system : preference

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  function choose(next) {
    setPreference(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // ignore
    }
  }

  return <ThemeContext value={{ preference, theme, choose }}>{children}</ThemeContext>
}

export function ThemePicker() {
  const { preference, choose } = useContext(ThemeContext)
  return (
    <div role="group" aria-label="Theme">
      {['system', 'light', 'dark'].map((option) => (
        <button key={option} type="button" aria-pressed={preference === option} onClick={() => choose(option)}>
          {option}
        </button>
      ))}
    </div>
  )
}
```

I tested it with a fake `matchMedia` that can flip: with the OS in dark, the page starts `dark` and `system` is pressed; when the OS flips to light, the page becomes `light`; choosing `dark` gives `dark` and saves it; flipping the OS now changes nothing; choosing `system` again follows the OS (`light`), and there is one listener registered. Without `matchMedia` the code falls back to `light` instead of crashing. Remember to update the head script from section 8 so it reads the same key and understands `system`.

</details>

11. **(Hard)** Design question: you are asked to pick the styling approach for (a) a design system used by five product teams, some on Next.js with Server Components, (b) a two-week internal admin dashboard. Which approaches do you choose, and what do you say about the trade-offs?

<details>
<summary>Show answer</summary>

**(a) Design system.** Use design tokens as CSS variables (primitive and semantic layers) so each product can theme it, and dark mode is just another token set. Build components on headless primitives for accessibility (Radix, Base UI or React Aria). Style with CSS Modules, or a zero-runtime tool such as vanilla-extract or Panda CSS, and ship plain CSS. Avoid runtime CSS-in-JS, because teams on Server Components could not use those components without turning them into Client Components, and runtime cost multiplies across five apps. Publish versioned packages, document variants (a `cva`-style or lookup-object approach), and test contrast in each theme.

**(b) Admin dashboard.** Speed matters more than a unique look, so use a styled kit (MUI, Ant Design, Mantine or Chakra), customised through its theme and kept to the components it provides. Say what you give up: a distinct brand and some bundle size. If the team already uses Tailwind, shadcn/ui is an alternative that gives owned code.

In both answers, name the criteria (time, brand, accessibility, Server Components, team skills) and say that the choice would change if they changed.

</details>

## Recap
- React has no styling system. The real choice is how you solve scope, state-based changes and delivery.
- Default picks for new apps: CSS Modules or Tailwind, plus CSS variables. Both have no runtime cost and work with Server Components.
- Inline `style` is an object with camelCase keys. It cannot do `:hover`, media queries or keyframes. Use it for dynamic values, ideally as CSS variables.
- Conditional styling: a `cx`/`clsx` helper for classes, `data-*` and `aria-*` attributes for states, CSS variables for values. `data-x={false}` renders `"false"`.
- Dark mode: semantic tokens as CSS variables, `data-theme` on `<html>`, saved choice then system preference, a head script to avoid the flash, a context for the toggle, `color-scheme`.
- Tailwind v4: `@import "tailwindcss"`, `@theme` for tokens, complete class names only, `cn = twMerge(clsx())`, `cva` for variants. Know its pros and cons.
- Runtime CSS-in-JS costs render time and does not run in Server Components; styled-components is in maintenance mode. Zero-runtime tools do the work at build time.
- Use headless primitives or a kit for complex widgets. Check contrast (4.5:1 text, 3:1 large text and UI parts), keep focus visible, and respect `prefers-reduced-motion`.

## Where to go next
- Next lesson: [TypeScript with React](08-typescript-with-react.md) (typing props, `style` with CSS variables, and CSS Module imports).
- Related lessons: HTML, CSS and browser basics (planned), [useContext](../02-hooks/05-usecontext.md), [Custom hooks](../02-hooks/08-custom-hooks.md), Tooling with Vite (planned), [Accessibility](../04-advanced/09-accessibility.md), [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md).
- Practice: the JavaScript exercise [classnames](../practice-app/exercises/js/21-classnames/README.md), and the machine-coding round [README](../05-interview-rounds/round-4-machine-coding/README.md) for the theme switcher task.
- Revise the styling questions with Round 2, part 6 (planned).
