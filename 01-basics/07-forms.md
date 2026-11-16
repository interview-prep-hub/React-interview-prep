# Forms

> **Level:** Beginner   **Time:** about 55 minutes   **Read first:** [State and events](./05-state-and-events.md), [Conditional rendering and lists](./06-conditional-rendering-and-lists.md)

## What you will learn
- Explain the difference between a controlled and an uncontrolled input, and say which one owns the value.
- Build controlled text, number, checkbox, radio, select and textarea inputs.
- Handle many fields with one change handler, using the `name` attribute and a computed key.
- Submit a form with `onSubmit` and `event.preventDefault()`, and validate it on submit, on blur and on change.
- Read values without state (`defaultValue`, refs, `FormData`) and handle a file input.
- Choose between controlled and uncontrolled inputs, and build a complete signup form step by step.

## 1. The big idea: who owns the value?

Every HTML input remembers what the user typed. That memory lives inside the input element in the browser (the DOM). React gives you two ways to deal with it:

- **Controlled input.** React state owns the value. The input only shows what the state says. You listen to `onChange` and update the state.
- **Uncontrolled input.** The DOM owns the value, like in plain HTML. You leave the input alone and ask for its value when you need it, for example when the form is submitted.

Think of a guest book. In the controlled version, a receptionist writes down every letter the guest says, and the guest only sees what the receptionist wrote. In the uncontrolled version, you hand the guest the pen and read the page when they are done.

```text
Controlled:    state --value--> <input>
                 ^                 |
                 +---- onChange ---+

Uncontrolled:  <input> keeps its own text. You read it when you need it.
```

"Single source of truth" means there is exactly one place that holds the real value. For a controlled input, that place is your state. The input on screen is only a picture of it.

Most tutorials and interviews start with controlled inputs, so we do too.

**How this lesson is laid out:** sections 2 to 8 use the controlled style. Sections 9 and 10 use the uncontrolled style. Section 11 helps you choose, and sections 12 to 14 add debouncing, a full signup form and a look at React 19.

**Common mistake:** giving an input both a `value` (controlled) and a `defaultValue` (uncontrolled).

```jsx
// Wrong: React warns that an input must be either controlled or uncontrolled
<input value={name} defaultValue="Ada" onChange={handleChange} />

// Right: pick one. Put the starting text in the initial state instead.
const [name, setName] = useState('Ada')
<input value={name} onChange={handleChange} />
```

Why: one input cannot have two owners.

## 2. Your first controlled input

An input becomes controlled when you give it a `value` prop. Two props work as a pair: `value` says what to show, and `onChange` runs when the user changes the text.

```jsx
import { useState } from 'react'

export default function NameInput() {
  const [name, setName] = useState('')

  return (
    <div>
      <label htmlFor="name">Your name</label>
      <input
        id="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <p>Hello, {name || 'stranger'}!</p>
    </div>
  )
}
```

**What happens, step by step:**
1. First render: `name` is `''`. React draws the input with an empty value and the text "Hello, stranger!".
2. The user presses `A`. The browser puts "A" in the input and fires an event.
3. React calls your `onChange` function. `event.target` is the input element. `event.target.value` is its text now: `"A"`.
4. `setName("A")` asks React to render again with the new state.
5. React renders again: the input gets `value="A"` and the text becomes "Hello, A!".
6. Every new key repeats steps 2 to 5. Typing `Ada` leaves the input showing `Ada` and the greeting "Hello, Ada!".

Two small things in this example:

- `htmlFor` is the JSX name of the HTML `for` attribute. It must match the input's `id`. A connected label makes the click target bigger and lets screen readers read the label out. (See [JSX](./03-jsx.md) for `htmlFor` and `className`.)
- React's `onChange` fires on **every keystroke**. In plain HTML the `change` event fires only when the user leaves the field. This is a favourite interview question (Q10 below).

### State is the boss

Because every character goes through your code, you can change it before it is shown:

```jsx
import { useState } from 'react'

export default function CouponInput() {
  const [code, setCode] = useState('')

  return (
    <label>
      Coupon code
      <input
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
      />
    </label>
  )
}
```

**What happens, step by step:**
1. The user types `s`. The browser's text is now "s".
2. Your handler stores `"S"` in state.
3. React renders `value="S"` and writes it into the input. The user sees `S`.
4. Typing `save10` ends with `SAVE10` on screen (checked by running it).

This is the real power of a controlled input: formatting, limits and blocking characters are one line in the handler (Practice item 2 uses it for a phone number).

**Common mistake:** reading the state variable right after `setName`.

```jsx
// Wrong: `name` is the OLD text. State is a snapshot of this render.
function handleChange(event) {
  setName(event.target.value)
  checkName(name)
}

// Right: use the new text you already have.
function handleChange(event) {
  const next = event.target.value
  setName(next)
  checkName(next)
}
```

Why: `setName` schedules the next render. The `name` variable does not change inside the current call. (Typing `ab` and logging `name` inside the handler printed an empty string, then `a`.)

## 3. Why typing does nothing without onChange

What happens if you give `value` but forget `onChange`?

```jsx
export default function Frozen() {
  return <input value="Ada" />
}
```

You see "Ada". You click in the box and type `xyz`. Nothing changes: the box still says "Ada". React also logs a warning:

```text
You provided a `value` prop to a form field without an `onChange` handler.
This will render a read-only field. If the field should be mutable use
`defaultValue`. Otherwise, set either `onChange` or `readOnly`.
```

**What happens, step by step:**
1. `value="Ada"` makes the input controlled. React is now in charge of the text.
2. The user types `x`. The browser briefly shows "Adax" and tells React.
3. React renders the component again. The `value` prop is still `"Ada"`, because nothing changed any state.
4. React writes `"Ada"` back into the input. The `x` disappears.

A controlled input never keeps text that your state did not approve. The same thing happens when `onChange` exists but ignores the new text (`onChange={() => {}}`): the box snaps back every time.

There are three correct fixes. Pick the one that matches your goal:

```jsx
// 1. The user must be able to edit: add state and onChange (section 2)
<input value={name} onChange={(e) => setName(e.target.value)} />

// 2. Display only, no editing:
<input value="Ada" readOnly />

// 3. A starting text that the user may edit, with no state (section 9):
<input defaultValue="Ada" />
```

Two more warnings you will meet:

- **"A component is changing an uncontrolled input to be controlled."** The `value` was `undefined` on the first render and a string later. The usual cause is `useState()` with no initial value.
- **"`value` prop on `input` should not be null."** A `null` value is not allowed. Use `''` for empty.

**Common mistake:** a state variable with no starting value.

```jsx
// Wrong: value is undefined at first (uncontrolled), then a string (controlled)
const [email, setEmail] = useState()

// Right: an empty string is a valid starting value
const [email, setEmail] = useState('')
```

Why: an input must stay controlled, or stay uncontrolled, for its whole life.

## 4. The other input types

All inputs follow the same idea. Only two things change: which prop holds the value, and which property of `event.target` you read.

| Input | Prop that holds the value | Read from the event |
| --- | --- | --- |
| text, textarea, select | `value` | `event.target.value` |
| number | `value` (a **string**) | `event.target.value` |
| checkbox | `checked` | `event.target.checked` |
| radio | `checked` on each radio | `event.target.value` of the clicked one |

### 4.1 Number inputs: the value is a string

`<input type="number">` limits what the user can type, but the value you get in JavaScript is still a string.

```jsx
import { useState } from 'react'

const PRICE = 5

export default function Quantity() {
  const [qty, setQty] = useState('1') // keep the raw text from the input

  const total = Number(qty) * PRICE // convert only when you need a number

  return (
    <div>
      <label htmlFor="qty">Quantity</label>
      <input
        id="qty"
        type="number"
        min="0"
        value={qty}
        onChange={(event) => setQty(event.target.value)}
      />
      <p>typeof qty: {typeof qty}</p>
      <p>Total: {total}</p>
    </div>
  )
}
```

**What happens, step by step:**
1. Start: `qty` is `'1'`. The screen shows `typeof qty: string` and `Total: 5`.
2. The user clears the box and types `3`. After the last key `event.target.value` is `"3"`, a string. State becomes `'3'`.
3. `Number('3') * 5` is `15`, so the screen shows `Total: 15`.
4. If the box is empty, `event.target.value` is `""` and `Number("")` is `0`, so the total is `0`.

Keep the raw string in state and convert where you use it. If you store `Number(event.target.value)` instead, an empty box becomes `0` and the input shows a `0` right away, so the user cannot clear the field (checked by running it). Two other tools: `event.target.valueAsNumber` gives a real number, and it is `NaN` for an empty box.

**Common mistake:** doing maths with the string.

```jsx
// Wrong: "3" + 1 is the text "31"
const next = qty + 1

// Right
const next = Number(qty) + 1
```

Why: `+` joins strings. Convert first.

### 4.2 Checkbox

A checkbox is on or off, so its state is a boolean. Use `checked`, and read `event.target.checked`.

```jsx
import { useState } from 'react'

export default function TermsCheckbox() {
  const [accepted, setAccepted] = useState(false)

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
        />
        I accept the terms
      </label>
      <button type="button" disabled={!accepted}>
        Continue
      </button>
    </div>
  )
}
```

**What happens, step by step:**
1. `accepted` is `false`. The box is empty and the button is disabled.
2. The user clicks the box. `onChange` runs and `event.target.checked` is `true`.
3. `setAccepted(true)` re-renders. The box is ticked and the button is enabled.

**Common mistake:** reading `value` from a checkbox.

```jsx
// Wrong: value is the fixed text "on", it never changes
onChange={(event) => setAccepted(event.target.value)}

// Right
onChange={(event) => setAccepted(event.target.checked)}
```

Why: a checkbox reports its on/off state in `checked`.

A **group of checkboxes** is usually an array of the selected items:

```jsx
import { useState } from 'react'

const options = ['React', 'Vue', 'Svelte']

export default function InterestPicker() {
  const [selected, setSelected] = useState([])

  function toggle(option) {
    setSelected((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option]
    )
  }

  return (
    <fieldset>
      <legend>Pick your frameworks</legend>
      {options.map((option) => (
        <label key={option}>
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => toggle(option)}
          />
          {option}
        </label>
      ))}
      <p>Selected: {selected.join(', ') || 'none'}</p>
    </fieldset>
  )
}
```

**What happens, step by step:**
1. `selected` is `[]`. Every box is empty and the text says "Selected: none".
2. The user ticks Vue, then React. `toggle` sees the name is not in the array, so it makes a **new** array with the name added. The text reads "Selected: Vue, React".
3. The user ticks Vue again. The name is in the array, so `filter` builds a new array without it. The text reads "Selected: React".
4. `checked={selected.includes(option)}` asks each box "are you in the array?", so the boxes always match the state.

Never `push` into the state array. Always create a new one (see [State and events](./05-state-and-events.md)).

### 4.3 Radio buttons

Radios work as a group: only one can be on. The state is **one value**, not one boolean per radio.

```jsx
import { useState } from 'react'

const plans = ['free', 'pro', 'team']

export default function PlanPicker() {
  const [plan, setPlan] = useState('free')

  return (
    <fieldset>
      <legend>Choose a plan</legend>
      {plans.map((value) => (
        <label key={value}>
          <input
            type="radio"
            name="plan"
            value={value}
            checked={plan === value}
            onChange={(event) => setPlan(event.target.value)}
          />
          {value}
        </label>
      ))}
      <p>You chose: {plan}</p>
    </fieldset>
  )
}
```

**What happens, step by step:**
1. `plan` is `'free'`. For each radio, `plan === value` decides if it is on. Only "free" is on.
2. The user clicks "pro". `onChange` runs for that radio. `event.target.value` is `"pro"`.
3. `setPlan('pro')` re-renders. Now `plan === 'pro'` is true for one radio only. "free" turns off by itself.
4. The shared `name="plan"` tells the browser the radios belong together. It also makes the arrow keys move between them.

**Common mistake:** a separate boolean state for each radio.

```jsx
// Wrong: two sources of truth that can disagree
const [isFree, setIsFree] = useState(true)
const [isPro, setIsPro] = useState(false)

// Right: one state holds the chosen value
const [plan, setPlan] = useState('free')
```

Why: a group has exactly one answer, so it needs exactly one state.

### 4.4 Select

In HTML you mark the chosen option with `selected`. In React you put `value` on the `<select>` itself.

```jsx
import { useState } from 'react'

export default function ColorSelect() {
  const [color, setColor] = useState('green')

  return (
    <div>
      <label htmlFor="color">Favourite colour</label>
      <select
        id="color"
        value={color}
        onChange={(event) => setColor(event.target.value)}
      >
        <option value="red">Red</option>
        <option value="green">Green</option>
        <option value="blue">Blue</option>
      </select>
      <p>You picked {color}</p>
    </div>
  )
}
```

**What happens, step by step:**
1. `color` is `'green'`, so the dropdown shows "Green".
2. The user picks Blue. `event.target.value` is the `value` of that option: `"blue"`.
3. `setColor('blue')` re-renders. The dropdown shows Blue and the text says "You picked blue".

For a **multiple** select (the user can choose several options), `value` is an array. Read the chosen options with `selectedOptions`:

```jsx
import { useState } from 'react'

export default function MultiSelect() {
  const [tags, setTags] = useState(['b'])

  function handleChange(event) {
    const chosen = Array.from(event.target.selectedOptions, (option) => option.value)
    setTags(chosen)
  }

  return (
    <div>
      <label htmlFor="tags">Tags</label>
      <select id="tags" multiple value={tags} onChange={handleChange}>
        <option value="a">Alpha</option>
        <option value="b">Beta</option>
        <option value="c">Gamma</option>
      </select>
      <p>Chosen: {tags.join(', ')}</p>
    </div>
  )
}
```

**What happens, step by step:**
1. `tags` is `['b']`, so only Beta is highlighted.
2. The user also picks Alpha and Gamma. `event.target.selectedOptions` is a list of the highlighted `<option>` elements. It is not a real array.
3. `Array.from(list, mapFn)` turns it into an array and maps each option to its value, in page order. Here you get `['a', 'b', 'c']`.
4. `setTags(chosen)` stores the new array, and the text says "Chosen: a, b, c".

**Common mistake:** using `selected` on an option.

```jsx
// Wrong: React warns "Use the `defaultValue` or `value` props on <select>
// instead of setting `selected` on <option>."
<option value="b" selected>Beta</option>

// Right: put value on the select
<select value={color} onChange={handleChange}>
```

Why: React wants one place (the `<select>`) to decide what is chosen.

### 4.5 Textarea

In HTML the starting text of a `<textarea>` goes between the tags. In React a textarea works like an input: use `value` and `onChange`.

```jsx
import { useState } from 'react'

export default function Bio() {
  const [bio, setBio] = useState('')

  return (
    <div>
      <label htmlFor="bio">Short bio</label>
      <textarea
        id="bio"
        rows={4}
        value={bio}
        onChange={(event) => setBio(event.target.value)}
      />
      <p>{bio.length} characters</p>
    </div>
  )
}
```

**What happens, step by step:**
1. `bio` is `''`, so the box is empty and the text says "0 characters".
2. The user types `hi`, presses Enter, and types `there`. The value is `"hi\nthere"`: a line break is one character, so the counter says "8 characters".
3. Each keystroke goes through `onChange` and `setBio`, exactly like a text input.

**Common mistake:** putting the starting text between the tags.

```jsx
// Wrong: React warns "Use the `defaultValue` or `value` props instead of
// setting children on <textarea>."
<textarea>Start here</textarea>

// Right
<textarea defaultValue="Start here" />
```

Why: React treats a textarea like any other input, and children would be a second source of truth.

For a live counter with a limit, try the [character counter exercise](../practice-app/exercises/react/09-character-counter/README.md).

## 5. One handler for many fields

A form with ten fields should not need ten `useState` calls and ten handlers. Keep **one object** in state, give every input a `name` that matches a key, and write **one** handler.

First, a small piece of JavaScript called a **computed property name**. Square brackets in an object literal use the variable's value as the key:

```js
const name = 'email'
const a = { [name]: 'ada@example.com' } // { email: 'ada@example.com' }
const b = { name: 'ada@example.com' }   // { name: 'ada@example.com' }
```

Now the form:

```jsx
import { useState } from 'react'

export default function ProfileForm() {
  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    country: 'in',
    newsletter: false,
  })

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  return (
    <form>
      <label htmlFor="firstName">First name</label>
      <input id="firstName" name="firstName" value={values.firstName} onChange={handleChange} />

      <label htmlFor="lastName">Last name</label>
      <input id="lastName" name="lastName" value={values.lastName} onChange={handleChange} />

      <label htmlFor="country">Country</label>
      <select id="country" name="country" value={values.country} onChange={handleChange}>
        <option value="in">India</option>
        <option value="us">United States</option>
        <option value="de">Germany</option>
      </select>

      <label>
        <input
          type="checkbox"
          name="newsletter"
          checked={values.newsletter}
          onChange={handleChange}
        />
        Send me the newsletter
      </label>

      <pre>{JSON.stringify(values, null, 2)}</pre>
    </form>
  )
}
```

**What happens, step by step:**
1. The user types `A` in "First name". `event.target` is that input.
2. The handler reads four things from it at once: `name` is `"firstName"`, `value` is `"A"`, `type` is `"text"`, `checked` is `false`.
3. `setValues` gets an **updater function**. React calls it with the latest state as `current`.
4. `{ ...current }` copies all four fields into a new object. Then `[name]: ...` replaces only the `firstName` key. The other fields stay as they were.
5. For the checkbox, `type === 'checkbox'` is true, so the handler stores `checked` (a boolean). For every other input it stores `value`.
6. After typing "Ada Lovelace", choosing Germany and ticking the box, the object is `{"firstName":"Ada","lastName":"Lovelace","country":"de","newsletter":true}` (the `<pre>` shows it).

Read what you need from `event.target` first, then use it inside the updater. That keeps the code clear and safe.

The spread copies only one level. If a field holds an object, copy that level too. ([useState in depth](../02-hooks/02-usestate-in-depth.md) covers nested updates.)

**Common mistake:** changing the old object.

```jsx
// Wrong: same object, React sees "no change" and does not re-render
function handleChange(event) {
  values[event.target.name] = event.target.value
  setValues(values)
}

// Right: build a new object
function handleChange(event) {
  const { name, value } = event.target
  setValues((current) => ({ ...current, [name]: value }))
}
```

Why: React compares the old and new state by reference. With the wrong version, typing `abc` left the input empty and the component rendered only once (checked by running it). Another common slip is a missing `name` attribute: the handler then saves your text under the key `""`, and the field never updates.

## 6. Submitting a form

A `<form>` groups inputs. A user can submit it in three ways: click a submit button, press Enter inside a text field, or your code can call `form.requestSubmit()`. All three fire one event, `submit`. React calls it `onSubmit`, and you put it on the `<form>` element. That is why `onSubmit` is better than `onClick` on the button: it covers every way to submit.

By default the browser then sends the form to a URL and loads a new page. In a React app you handle the data yourself, so you cancel that with `event.preventDefault()`. ([State and events](./05-state-and-events.md) explains the event object and `preventDefault` in general. Here we use them for forms.)

```jsx
import { useState } from 'react'

export default function ContactForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(null)

  function handleSubmit(event) {
    event.preventDefault() // stop the browser from reloading the page
    setSent({ email, message })
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <label htmlFor="message">Message</label>
      <textarea
        id="message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />

      <button type="submit">Send</button>

      {sent && <p role="status">Thanks! We will write to {sent.email}.</p>}
    </form>
  )
}
```

**What happens, step by step:**
1. While the user types, each keystroke updates `email` or `message` (sections 2 and 4.5).
2. The user presses Enter inside the email field. The browser fires `submit` on the form. (Clicking "Send" does the same.)
3. React calls `handleSubmit` with the event.
4. `event.preventDefault()` cancels the default action. Without it the page would reload and all state would be lost.
5. The values are already in state, so `setSent` keeps a copy and the page shows "Thanks! We will write to ada@example.com." In a real app you would send `{ email, message }` to a server here, for example with `fetch`.

We can prove step 4 by running it. With `preventDefault()`, dispatching a submit event returns `false` (cancelled). Without it, it returns `true`, which means the browser would go on and navigate.

Three facts about buttons and checks:

- A `<button>` inside a form is a **submit button by default**. Give other buttons (Reset, Add row, Show password) `type="button"`, or they will submit the form. We checked: a button without a `type` triggered `onSubmit`.
- The browser has its own checks: `required`, `minLength`, `pattern`, and `type="email"`. They run **before** the `submit` event. If a check fails, the browser shows its own bubble and your `onSubmit` never runs (we saw 0 calls with an empty `required` field, and 1 call when the form had `noValidate`).
- Add `noValidate` to the `<form>` if you want to show your own error messages. This lesson does that from section 7 on.

**Common mistake:** forgetting `preventDefault`.

```jsx
// Wrong: the page reloads, the typed data is gone
<form onSubmit={() => save(values)}>

// Right
<form
  onSubmit={(event) => {
    event.preventDefault()
    save(values)
  }}
>
```

Why: the browser's default submit leaves your single-page app.

## 7. Validation: when to check and how to show errors

**Validation** means checking that the values follow rules (an email looks like an email, a password is long enough) and telling the user when they do not.

### Errors are derived, so do not store them

You already keep the values in state. The errors can be **calculated from the values** on every render. Write a **pure function** (same input, same output, no side effects) that returns the problems:

```js
function validateEmail(email) {
  if (!email.trim()) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address'
  return '' // an empty string means "no error"
}
```

Why not store errors in state? Two states that describe the same truth can disagree. A calculated error is always in sync. It is also easy to test.

### When to show the error

| Check on | The user sees | Good for |
| --- | --- | --- |
| Submit | Errors after pressing the button | The simplest and safest start |
| Blur (leaving the field) | Feedback field by field, not while typing | Most forms |
| Change (every key) | Instant feedback, even before they finish | Password strength, "username is taken" hints |

A friendly rule: **show errors late, remove them early.** Do not show red text while the user is still typing their email. But as soon as the value becomes valid, make the error disappear at once. Because the error is calculated on every render, you get the second half for free. You only need a flag that says "this field has been visited" for the first half.

```jsx
import { useState } from 'react'

function validateEmail(email) {
  if (!email.trim()) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address'
  return '' // an empty string means "no error"
}

export default function EmailOnBlur() {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)

  const error = validateEmail(email) // derived on every render, not stored
  const showError = touched && error !== ''

  return (
    <div>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={showError ? 'true' : undefined}
        aria-describedby={showError ? 'email-error' : undefined}
      />
      {showError && (
        <p id="email-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
```

**What happens, step by step:**
1. At the start `email` is `''` and `touched` is `false`. `error` is "Email is required", but `showError` is `false`, so nothing shows. The empty form is not shouting at the user.
2. The user types `ada`. The error is "Enter a valid email address" after every key, but `touched` is still `false`, so nothing shows while typing.
3. The user presses Tab. The input loses focus, `onBlur` runs, and `setTouched(true)` re-renders. Now `showError` is `true`: the message appears.
4. The user clicks back and adds `@example.com`. The error becomes `''`, so the message disappears immediately.

`onBlur` runs when the field loses focus. The extra attributes help assistive technology: `role="alert"` makes a screen reader announce the message when it appears, `aria-invalid` marks the field as wrong, and `aria-describedby` connects the field to its message. The [accessibility lesson](../04-advanced/09-accessibility.md) explains them.

For **validation on submit**, the same idea works: add a flag (or mark every field as touched) when the user presses submit. Section 13 does exactly that.

Two more rules:

- Client-side checks help users. They do not protect you, because anyone can skip them. **The server must validate again.**
- Show the message next to the field, in words that say how to fix it ("Use at least 8 characters"), not only "Invalid".

### The disabled submit button

There are two schools:

```jsx
// A: disable the button while the form has errors
<button type="submit" disabled={Object.keys(errors).length > 0}>Create account</button>

// B: keep it enabled, and show every error when the user presses it (section 13)
<button type="submit">Create account</button>
```

Option A stops bad submits, but the user cannot tell why the button is grey, and a disabled button cannot be reached with the Tab key. Option B explains the problem. Whatever you choose, **do disable the button while a request is in flight**, so a double click cannot send the form twice.

**Common mistake:** storing the error in state next to the value.

```jsx
// Wrong: easy to forget to update, and the two can disagree
const [email, setEmail] = useState('')
const [emailError, setEmailError] = useState('')

// Right: calculate it
const emailError = validateEmail(email)
```

Why: derived data should be derived.

## 8. Resetting a form

For a controlled form, resetting is just putting the state back to its starting values.

```jsx
import { useState } from 'react'

const initialValues = { name: '', city: '' }

export default function ResettableForm() {
  const [values, setValues] = useState(initialValues)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
  }

  function handleReset() {
    setValues(initialValues) // one line puts every field back
  }

  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <label htmlFor="name">Name</label>
      <input id="name" name="name" value={values.name} onChange={handleChange} />

      <label htmlFor="city">City</label>
      <input id="city" name="city" value={values.city} onChange={handleChange} />

      <button type="submit">Save</button>
      <button type="button" onClick={handleReset}>
        Reset
      </button>
    </form>
  )
}
```

**What happens, step by step:**
1. The user types "Ada" and "London". State is `{ name: 'Ada', city: 'London' }`.
2. They click Reset. The button has `type="button"`, so it does not submit the form. `handleReset` runs.
3. `setValues(initialValues)` puts the starting object back. Both inputs are empty again.
4. `initialValues` lives outside the component and is never changed, so it is safe to reuse.

Other ways to reset:

- **Change a `key`.** Give the form component a `key` and change it to throw away the old instance and start with fresh state. Typing in a form, then changing the key, left the fields empty. See "reset with key" in [useState in depth](../02-hooks/02-usestate-in-depth.md).
- **Uncontrolled forms:** call `form.reset()`. It puts every field back to its default (Practice item 6).

**Common mistake:** using a native reset button with controlled inputs.

```jsx
// Wrong: the browser tries to reset, but React puts the state's text back
<button type="reset">Reset</button>

// Right
<button type="button" onClick={handleReset}>Reset</button>
```

Why: with controlled inputs the state is the truth. When we clicked a native reset button, the typed text stayed on screen.

## 9. Uncontrolled inputs: defaultValue, ref and FormData

In an uncontrolled input you do **not** pass `value`. The browser keeps the text, so typing never causes a React render. You use:

- `defaultValue` (or `defaultChecked` for checkboxes and radios) for the **starting** value.
- A **ref** or `FormData` to **read** the value when you need it.

```jsx
export default function Note() {
  return <input aria-label="Note" defaultValue="Draft" />
}
```

The user can edit "Draft" freely and React does not warn. `defaultValue` is only the start. If you change the prop later, the text on screen does not change (we changed it from `one` to `two`, and the box still showed `one`).

### 9.1 Reading with a ref

A ref is a box that can hold a DOM element. (See [useRef](../02-hooks/04-useref.md).)

```jsx
import { useRef, useState } from 'react'

export default function SearchOnSubmit() {
  const inputRef = useRef(null)
  const [searched, setSearched] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    setSearched(inputRef.current.value) // read the DOM value only when needed
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="q">Search</label>
      <input id="q" ref={inputRef} defaultValue="react" />
      <button type="submit">Go</button>
      <p>Last search: {searched || 'none yet'}</p>
    </form>
  )
}
```

**What happens, step by step:**
1. After the first render, React sets `inputRef.current` to the real `<input>` element.
2. The user types. The browser updates the text. React does not render at all (the parent component rendered 0 extra times while we typed).
3. The user presses Enter. `handleSubmit` runs and reads `inputRef.current.value`, the text right now.
4. `setSearched` stores it, and the page shows "Last search: ...".

Only read `ref.current` inside event handlers or effects, never while rendering.

### 9.2 Reading everything with FormData

With many fields, a ref per field is tedious. The browser's `FormData` collects every field of a form at once.

```jsx
import { useState } from 'react'

export default function SubscribeForm() {
  const [submitted, setSubmitted] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget) // the <form> element
    setSubmitted(Object.fromEntries(formData))
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" />

      <label htmlFor="topic">Topic</label>
      <select id="topic" name="topic" defaultValue="react">
        <option value="react">React</option>
        <option value="css">CSS</option>
      </select>

      <label>
        <input name="updates" type="checkbox" />
        Send me updates
      </label>

      <button type="submit">Subscribe</button>

      {submitted && <pre>{JSON.stringify(submitted, null, 2)}</pre>}
    </form>
  )
}
```

**What happens, step by step:**
1. The user types an email, leaves the topic on React, and does not tick the checkbox. They press Subscribe.
2. `event.currentTarget` is the `<form>` element (the element the handler is attached to).
3. `new FormData(form)` reads every field that has a `name`.
4. `Object.fromEntries(formData)` turns it into a plain object. Here: `{"email":"ada@example.com","topic":"react"}`. The unticked checkbox is **missing**.
5. If the user had ticked the box, the object would also contain `"updates": "on"`.

The rules of `FormData`, all checked by running a test form:

- Only fields with a `name` are included. A field without `name` is skipped, and so is a `disabled` field.
- An unticked checkbox is left out. A ticked one with no `value` attribute gives `"on"`.
- For radios, only the chosen one is included, under the shared name.
- If two fields share a name (a checkbox group), `Object.fromEntries` keeps only the **last**. Use `formData.getAll('tag')` to get an array of all of them.
- A file input gives a `File` object (section 10).

**Common mistake:** expecting a value for an unticked checkbox.

```jsx
// Wrong: formData.get('updates') is null when the box is not ticked,
// and the text "on" when it is. This is never true or false.
const updates = formData.get('updates')

// Right
const updates = formData.get('updates') === 'on'
```

Why: browsers send only the checked boxes.

## 10. File input

`<input type="file">` is **always uncontrolled**. A web page may not choose a file on the user's disk, so you cannot set its `value`. (Setting it to any text except an empty string throws an error. Setting `''` is allowed, and it clears the choice.)

```jsx
import { useState } from 'react'

export default function FilePicker() {
  const [file, setFile] = useState(null)

  function handleChange(event) {
    setFile(event.target.files[0] ?? null) // files is a FileList, never a string
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!file) return

    const body = new FormData()
    body.append('avatar', file)
    // Do not set a Content-Type header: the browser adds it, with the boundary.
    await fetch('/api/avatar', { method: 'POST', body })
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="avatar">Avatar</label>
      <input id="avatar" type="file" accept="image/*" onChange={handleChange} />

      {file && (
        <p>
          {file.name} ({file.size} bytes)
        </p>
      )}

      <button type="submit" disabled={!file}>
        Upload
      </button>
    </form>
  )
}
```

**What happens, step by step:**
1. At first `file` is `null`, so the Upload button is disabled.
2. The user picks `me.png`. `onChange` runs. `event.target.files` is a `FileList`, a list-like object of `File` objects. `files[0]` is the first one, or `undefined` if the user cancelled (`?? null` handles that).
3. `setFile(file)` re-renders. The page shows "me.png (5 bytes)" and the button is enabled.
4. On submit, we put the file in a new `FormData` and send it with `fetch`. In our test, `fetch` received a `FormData` that held the file, and no `Content-Type` header.

Facts to remember:

- The file input's `value` is a fake path such as `C:\fakepath\me.png`. Use `file.name` instead.
- Add the `multiple` attribute to allow many files, then use `Array.from(event.target.files)`.
- `accept="image/*"` is only a **hint** for the file picker. It does not stop other files. Check `file.type` and `file.size` in your code, and check again on the server (Practice item 10).
- Do not set `Content-Type: multipart/form-data` yourself. The browser must add the boundary text, and your header would remove it.
- `fetch` does not report upload progress. To show a progress bar, use `XMLHttpRequest` and its `upload.onprogress` event (libraries wrap this).
- To clear the choice, set `input.value = ''` through a ref, or change the input's `key`.

**Common mistake:** trying to control a file input.

```jsx
// Wrong: the value of a file input cannot be set to a file name
<input type="file" value={fileName} onChange={handleChange} />

// Right: leave it uncontrolled and keep the File object in state
<input type="file" onChange={(e) => setFile(e.target.files[0] ?? null)} />
```

Why: the browser protects the user's files.

## 11. Controlled or uncontrolled? How to choose

| Question | Controlled | Uncontrolled |
| --- | --- | --- |
| Who holds the value? | React state | The DOM |
| When can you read it? | Any time, from state | When you ask (ref or `FormData`) |
| React to every keystroke (live validation, formatting, counters, enabling a button)? | Easy | Awkward |
| Set or clear the value from code? | Change the state | `form.reset()` or a ref |
| Renders while typing | One per keystroke | None |
| Amount of code | More (state and handler per field) | Less |
| File input | Not possible | The only way |

A simple rule:

- **Controlled** when the screen depends on the value while the user types: live validation, formatting, a character counter, a disabled button, fields that depend on each other, search-as-you-type.
- **Uncontrolled** when you only need the values at submit and the fields are independent: a simple login or search form, a very large form, a file input, or code that talks to a non-React library.

About speed: a controlled input renders its component on each keystroke. We counted: 1 render on mount and 4 after typing 3 characters. That is cheap for a normal form. It only matters when the form is huge or its children are heavy. Then you can move each field's state into its own small component, use uncontrolled inputs, or use a form library (section 14).

You may mix both styles in one form. You must not switch **one** input between the two (the warning from section 3).

**Common mistake:** a controlled input for everything, by habit.

```jsx
// Wrong (too much code): we only need the text on submit
const [query, setQuery] = useState('')
<input value={query} onChange={(e) => setQuery(e.target.value)} />

// Right (enough): uncontrolled, read with FormData or a ref on submit
<input name="query" />
```

Why: do not pay for control you do not use.

## 12. Debounced input

When a user types `react`, that is five keystrokes. A search box that sends five requests wastes work and can show answers in the wrong order. **Debouncing** means "wait until the user pauses for N milliseconds, then act once". Think of a lift door that waits a moment after the last person steps in before it closes.

The trick is to keep **two values**: the live text that the input shows, and a delayed copy that your search uses.

```jsx
import { useEffect, useState } from 'react'

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer) // a new keystroke cancels the old timer
  }, [value, delay])

  return debounced
}

export default function SearchBox() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)

  return (
    <div>
      <label htmlFor="q">Search</label>
      <input id="q" value={query} onChange={(event) => setQuery(event.target.value)} />
      <p>Typed: {query}</p>
      <p>Searching for: {debouncedQuery}</p>
    </div>
  )
}
```

**What happens, step by step:**
1. The user types `a`. `query` is `'a'`. The effect starts a 300 ms timer.
2. 100 ms later they type `b`. `query` changes, so React first runs the **cleanup** of the old effect (`clearTimeout`, the old timer dies), then starts a new 300 ms timer.
3. They type `c` after another 100 ms. Same thing again: one live timer, for `'abc'`.
4. They stop. We measured: 299 ms after the last key the "Searching for" line is still empty. At 300 ms it changes to `abc`.
5. In a real app, an effect or a query hook would depend on `debouncedQuery` and fetch from there (see [Data fetching](../03-intermediate/02-data-fetching.md)).

The input stays instant because it is bound to `query`. Only the work you do with the text is delayed. [Custom hooks](../02-hooks/08-custom-hooks.md) builds `useDebounce` properly, and the [autocomplete exercise](../practice-app/exercises/react/12-autocomplete-debounce/README.md) puts it to work. `useDeferredValue` is another tool for keeping typing smooth (see [Other hooks](../02-hooks/09-other-hooks.md)).

**Common mistake:** delaying the input's own state.

```jsx
// Wrong: a controlled input must update at once, or the typed letters snap back
onChange={(event) => setTimeout(() => setQuery(event.target.value), 300)}

// Right: update the state now, debounce the work that uses it
onChange={(event) => setQuery(event.target.value)}
```

Why: section 3 showed that a controlled input shows only what its state says.

## 13. Build a signup form step by step

We will build a signup form with Email, Password, Confirm password and a terms checkbox. (The [signup exercise](../practice-app/exercises/react/04-signup-form-validation/README.md) uses different fields and exact messages, so you can practise this again afterwards.)

**Step 1: the values and one handler (section 5).**

```jsx
const initialValues = { email: '', password: '', confirm: '', terms: false }

const [values, setValues] = useState(initialValues)

function handleChange(event) {
  const { name, value, type, checked } = event.target
  setValues((current) => ({
    ...current,
    [name]: type === 'checkbox' ? checked : value,
  }))
}
```

Four fields, one state, one handler.

**Step 2: the rules, as a pure function outside the component (section 7).**

```jsx
function validate(values) {
  const errors = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address'
  }
  if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }
  if (values.confirm !== values.password) {
    errors.confirm = 'Passwords do not match'
  }
  if (!values.terms) {
    errors.terms = 'You must accept the terms'
  }
  return errors
}

// inside the component:
const errors = validate(values) // derived on every render, never stored
```

An empty object means the form is valid.

**Step 3: decide when to show an error.** A `touched` object remembers which fields the user has left.

```jsx
const [touched, setTouched] = useState({})
const visibleError = (name) => (touched[name] ? errors[name] : undefined)

function handleBlur(event) {
  const { name } = event.target
  setTouched((current) => ({ ...current, [name]: true }))
}
```

**Step 4: the submit handler (sections 6 and 8).** It marks every field as touched, so that all errors show, and only continues when there are none.

```jsx
async function handleSubmit(event) {
  event.preventDefault()
  setTouched({ email: true, password: true, confirm: true, terms: true })
  if (Object.keys(errors).length > 0) return

  setStatus('sending')
  await onSignup({ email: values.email, password: values.password })
  setValues(initialValues)
  setTouched({})
  setStatus('done')
}
```

**Step 5: a small `Field` component** so that label, input and error are not repeated four times. It must be defined **outside** the form component (see the gotchas below).

Here is the complete file. Read it from top to bottom once, then run it.

```jsx
import { useState } from 'react'

const initialValues = { email: '', password: '', confirm: '', terms: false }

function validate(values) {
  const errors = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address'
  }
  if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }
  if (values.confirm !== values.password) {
    errors.confirm = 'Passwords do not match'
  }
  if (!values.terms) {
    errors.terms = 'You must accept the terms'
  }
  return errors
}

// Defined OUTSIDE SignupForm, so React sees the same component on every render.
function Field({ id, label, error, ...inputProps }) {
  const errorId = `${id}-error`
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <p id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default function SignupForm({ onSignup = async () => {} }) {
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState('idle') // 'idle' | 'sending' | 'done'

  const errors = validate(values) // derived on every render, never stored
  const visibleError = (name) => (touched[name] ? errors[name] : undefined)

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setStatus('idle') // typing again hides the old success message
  }

  function handleBlur(event) {
    const { name } = event.target
    setTouched((current) => ({ ...current, [name]: true }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    // Show every error, even for fields the user never visited.
    setTouched({ email: true, password: true, confirm: true, terms: true })
    if (Object.keys(errors).length > 0) return

    setStatus('sending')
    await onSignup({ email: values.email, password: values.password })
    setValues(initialValues)
    setTouched({})
    setStatus('done')
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Field
        id="email" name="email" type="email" label="Email"
        value={values.email} onChange={handleChange} onBlur={handleBlur}
        error={visibleError('email')}
      />
      <Field
        id="password" name="password" type="password" label="Password"
        value={values.password} onChange={handleChange} onBlur={handleBlur}
        error={visibleError('password')}
      />
      <Field
        id="confirm" name="confirm" type="password" label="Confirm password"
        value={values.confirm} onChange={handleChange} onBlur={handleBlur}
        error={visibleError('confirm')}
      />

      <label>
        <input
          type="checkbox"
          name="terms"
          checked={values.terms}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        I accept the terms
      </label>
      {visibleError('terms') && <p role="alert">{errors.terms}</p>}

      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Creating...' : 'Create account'}
      </button>

      {status === 'done' && <p role="status">Account created. Welcome!</p>}
    </form>
  )
}
```

**What happens, step by step (we ran each of these):**
1. Open the page: no errors, even though every field is invalid. Nothing has been visited.
2. Type `ada` in Email. While the field has focus, no error shows. Press Tab: "Enter a valid email address" appears under it, and the input gets `aria-invalid` and `aria-describedby`.
3. Click "Create account" with the other fields empty. `handleSubmit` marks every field as touched. The email, password and terms errors show (Confirm password is empty, and so equal to the empty Password, so it has no error yet). `onSignup` is **not** called.
4. Fill everything correctly, with matching passwords, and tick the box. The errors disappear as each field becomes valid.
5. Click "Create account", or press Enter in a field. `onSignup` is called once with `{ email, password }`.
6. While the promise is pending, the button says "Creating..." and is disabled, so a double click cannot submit twice.
7. When it finishes, the values and `touched` are reset, no errors show, and the page says "Account created. Welcome!". Typing in a field hides that message again.

What this form leaves out, on purpose: showing a server error (wrap the `await` in `try/catch` and keep an error message in state), moving focus to the first wrong field, and a "show password" toggle. The [signup exercise](../practice-app/exercises/react/04-signup-form-validation/README.md) and the [multi-step form exercise](../practice-app/exercises/react/20-multi-step-form/README.md) are good next steps.

**Small things that make a form good:**
- Use the right `type` (`email`, `password`, `tel`, `number`). It gives the right mobile keyboard and browser help.
- Add `autoComplete` hints such as `email`, `current-password` and `new-password`, so password managers can help.
- Every input needs a visible `<label>`. A placeholder is not a label: it disappears when the user types.
- Give every field a `name`. You need it for the one-handler pattern and for `FormData`.

**Common mistake:** defining a component inside another component.

```jsx
// Wrong: EmailField is a NEW component on every render of Signup
function Signup() {
  const [email, setEmail] = useState('')
  function EmailField() {
    return <input aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
  }
  return <EmailField />
}

// Right: define it outside and pass props
function EmailField({ value, onChange }) {
  return <input aria-label="Email" value={value} onChange={onChange} />
}
```

Why: React sees a different component type each render, so it throws the old input away and makes a new one. In our run, the first key typed `a`, focus jumped to the page body, and the next key was lost.

## 14. React 19 form actions and form libraries

**Form actions.** React 19 lets you pass a **function** to the form's `action` prop instead of using `onSubmit`:

```jsx
import { useState } from 'react'

export default function Newsletter() {
  const [last, setLast] = useState('')

  function subscribe(formData) {
    setLast(formData.get('email')) // no event, no preventDefault
  }

  return (
    <form action={subscribe}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" />
      <button type="submit">Subscribe</button>
      <p>Last subscribed: {last || 'nobody yet'}</p>
    </form>
  )
}
```

**What happens, step by step:**
1. The user types an email and submits.
2. React calls `subscribe` with a `FormData` object of the form. You do not call `preventDefault`, and you do not read an event.
3. React runs the function as an **Action**: inside a transition, so pending state and errors can be tracked by hooks such as `useFormStatus` and `useActionState`.
4. When the function finishes without throwing, React **resets the uncontrolled fields** to their default values. In our test the page showed "Last subscribed: ada@example.com" and the input was empty. A controlled input in the same form kept its text.

`onSubmit` with `preventDefault` is still fully valid, and everything you learned above still applies. The new hooks (`useFormStatus`, `useActionState`, `useOptimistic`) and server actions are covered in [React 19 and newer](../04-advanced/04-react-19-and-newer.md).

**Form libraries.** For small forms, plain React is enough. When a form has many fields, shared or schema-based rules (for example with Zod), dynamic rows, or performance worries, a library saves a lot of code. React Hook Form is the common choice, and it is built around uncontrolled inputs. See [Forms with libraries](../03-intermediate/04-forms-with-libraries.md).

**Common mistake:** being surprised that the typed text vanished after switching to `action`.

```jsx
// Surprise: after the action finishes, this uncontrolled input is emptied
<form action={subscribe}>
  <input name="email" />
</form>

// Keep the text: make the field controlled
<form action={subscribe}>
  <input name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
</form>
```

Why: React resets uncontrolled fields after an Action, and a controlled field gets its text from state. You can also use `onSubmit` with `preventDefault` instead of `action`. Practice item 12 explores this.

## How interviewers test this
- **Controlled vs uncontrolled** is one of the most commonly listed React form questions. A strong answer says who owns the value, names the props (`value`/`onChange` vs `defaultValue`/ref), and gives a real reason to choose each one.
- They check that you know the warnings and their causes: `value` without `onChange`, and an input that switches from uncontrolled to controlled.
- Many-field forms: one state object, one handler, `name` and a computed key, and an immutable update. One `useState` per field for ten fields is a mild red flag.
- Submit handling: `preventDefault`, the Enter key, `type="button"` for non-submit buttons, and when you show errors (submit, blur or change). A signup or login form with validation is commonly reported as a machine-coding task.
- Strong candidates also mention: labels and `aria-invalid`/`role="alert"`, validating again on the server, disabling the button while sending, and that `FormData` or a library is an option for big forms.
- Red flags: mutating state, storing derived errors in state, number inputs treated as numbers, defining components inside components, and "validation on the client is enough".

## Interview questions and model answers

### Q1. What is the difference between a controlled and an uncontrolled component? (Easy)
In a controlled input, React state is the single source of truth. You pass `value` (or `checked`) and an `onChange` handler that updates the state, so the input only displays what state says. In an uncontrolled input, the DOM keeps the value. You give a starting value with `defaultValue`, and read the current value only when needed, with a ref or `FormData`. Choose controlled when the UI reacts to each keystroke (live validation, formatting, disabling a button). Choose uncontrolled for simple forms where you only need the values on submit, and for file inputs. Do not switch one input between the two.

```jsx
<input value={name} onChange={(e) => setName(e.target.value)} /> {/* controlled */}
<input defaultValue="Ada" ref={inputRef} />                      {/* uncontrolled */}
```

### Q2. Why does an input with `value` but no `onChange` not accept typing? (Easy)
A `value` prop makes the input controlled, so React decides what it shows. After each keystroke React renders again with the same `value` prop, because no state changed, and it writes the old text back. The field looks frozen and React logs a warning about a read-only field. Fix it by adding state and an `onChange` that updates it, or use `readOnly` for display only, or `defaultValue` for an uncontrolled input. The related warning "changing an uncontrolled input to be controlled" means `value` was `undefined` first and a string later, usually from `useState()` with no initial value. Use `useState('')`.

### Q3. How do you handle many inputs without one `useState` per field? (Easy)
Keep one object in state, give each input a `name` equal to its key, and write one handler that uses a computed property name:

```jsx
function handleChange(event) {
  const { name, value, type, checked } = event.target
  setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
}
```

The spread copies the old fields into a new object and `[name]` replaces just the changed one. Never mutate the old object. Without a new object, React sees no change and does not render.

### Q4. What does `event.preventDefault()` do in a form's `onSubmit`, and why do you need it? (Easy)
The browser's default action for a submitted form is to send a request to the form's URL and load the result, which reloads the page and wipes your React state. `event.preventDefault()` cancels that default action so your JavaScript can handle the data itself. You put the handler on the form's `onSubmit` (not on the button's `onClick`), because `onSubmit` fires for every way of submitting: clicking the button, pressing Enter, or `form.requestSubmit()`.

### Q5. How do you validate a form, and when should validation run? (Medium)
Write a pure `validate(values)` function that returns an errors object, and call it during render so the errors are derived from the values and never stored. Decide when to show them: on submit is the simplest, on blur gives feedback field by field, and on change is instant but can feel pushy. A good pattern is to show errors late (after the field was touched or after submit) and remove them early (as soon as the value is valid). Connect each message to its field with `aria-describedby`, mark the field with `aria-invalid`, and announce it with `role="alert"`. Always validate again on the server, because client checks can be skipped.

### Q6. How do you get form values without using state? (Medium)
Use uncontrolled inputs. With a ref you read `inputRef.current.value` inside the handler. For a whole form, give each field a `name` and build `new FormData(event.currentTarget)`, then `formData.get('email')` or `Object.fromEntries(formData)`. Only named, enabled fields are included, and unticked checkboxes are left out. Use `formData.getAll(name)` when several fields share a name. This avoids a render per keystroke, but you cannot react to each keystroke.

### Q7. How do you reset a form? (Easy)
For a controlled form, set the state back to a constant `initialValues` object. For an uncontrolled form, call `form.reset()`. You can also change the `key` of the form component to remount it with fresh state. A native `<button type="reset">` does not work for controlled inputs, because React puts the state's text back. Give your own Reset button `type="button"`, otherwise it submits the form.

### Q8. How do you handle checkbox, radio, select and textarea in React? (Easy)
They all use the controlled pattern with small differences. A checkbox uses `checked` and reads `event.target.checked`. A radio group shares one state value: each radio has `checked={choice === value}` and a shared `name`. A select takes `value` on the `<select>`, not `selected` on the option, and a multiple select takes an array and reads `selectedOptions`. A textarea uses `value`/`onChange` like an input, not children. A group of checkboxes is usually an array state, updated with `filter` and spread.

### Q9. How do you handle file uploads? (Medium)
A file input is always uncontrolled, because you cannot set its value. Read `event.target.files` (a `FileList`) in `onChange`, keep the `File` object in state, and check `file.type` and `file.size` yourself, because `accept` is only a hint. To upload, build a `FormData`, `append('avatar', file)`, and send it with `fetch(url, { method: 'POST', body })`. Do not set the `Content-Type` header, since the browser adds the correct multipart boundary. `fetch` has no upload progress events, so use `XMLHttpRequest` (`upload.onprogress`) or a library for a progress bar. Validate again on the server.

### Q10. What is the difference between React's `onChange` and the DOM `change` event? (Medium)
The native `change` event for a text input fires only when the user commits the value, usually when the field loses focus. React's `onChange` fires on every keystroke, like the native `input` event. In our test, typing `abc` called React's `onChange` three times while the native `change` event had not fired yet; it fired once after blur. This is why a controlled React input can update state on every character.

### Q11. Why is the value of `<input type="number">` a string, and how do you handle it? (Easy)
All DOM input values are strings, even for `type="number"`. If you add `1` to the string `"3"` you get `"31"`. Keep the raw string in state and convert where you use it with `Number(qty)`, or read `event.target.valueAsNumber` (it is `NaN` when the box is empty). Do not store `Number(value)` in state for a controlled field: clearing the box gives `0`, and the user can never empty the field.

### Q12. How would you build a debounced search input? (Medium)
Keep the live text in state so the input stays instant. Create a second, delayed value with a `useDebouncedValue` hook that starts a `setTimeout` in an effect and clears it in the cleanup, so each new keystroke cancels the previous timer. Run the search (an effect or a query hook) with the debounced value. Do not delay the input's own `onChange`, or the typed letters will snap back. Debounce waits for a pause. Throttling, in contrast, limits how often something may run.

### Q13. Do controlled inputs make forms slow? When would you use uncontrolled inputs or a library? (Medium)
A controlled input renders its component on each keystroke (1 render on mount plus 1 per character in our test). For normal forms this is cheap. It becomes a problem with very large forms or heavy children. Then you can keep each field's state in its own small component, use uncontrolled inputs and read `FormData` on submit, or use a library such as React Hook Form, which is built around uncontrolled inputs. Measure first with the React Profiler before changing the design.

### Q14. What are React 19 form actions, and how do they compare with `onSubmit`? (Hard)
You pass a function to `<form action={fn}>`. React calls `fn(formData)` when the form is submitted, with no `preventDefault` and no event. React runs it as an Action inside a transition, so the pending state and errors fit with `useFormStatus` (which must be used by a component inside the form), `useActionState` and `useOptimistic`. When the function finishes, React resets the uncontrolled fields to their default values (a controlled field keeps its state). `onSubmit` with `preventDefault` still works and keeps the typed text. See [React 19 and newer](../04-advanced/04-react-19-and-newer.md).

## Common mistakes and gotchas
- **`value` without `onChange`:** the field is frozen. Add `onChange`, or use `readOnly` or `defaultValue`.
- **`useState()` with no argument:** the input switches from uncontrolled to controlled. Use `useState('')`.
- **`value={null}`:** React warns. Use `''`.
- **Both `value` and `defaultValue`:** pick one owner.
- **Reading `event.target.value` of a checkbox:** use `event.target.checked`.
- **Doing maths with a number input's value:** it is a string. Use `Number(value)`.
- **Mutating the state object and calling the setter with it:** no re-render. Spread into a new object.
- **Missing `name` attribute with the one-handler pattern:** the value is saved under the key `""`. Add a matching `name`.
- **Forgetting `preventDefault` in `onSubmit`:** the page reloads. Call it first.
- **A `<button>` with no `type` inside a form:** it submits. Use `type="button"` for other buttons.
- **`<option selected>` or `<textarea>text</textarea>`:** React warns. Use `value`/`defaultValue`.
- **Native reset button on controlled inputs:** the text stays. Reset the state yourself.
- **A component defined inside another component:** the input is rebuilt on each keystroke and loses focus. Define it outside.
- **Storing errors in state:** they go stale. Derive them from the values.
- **Showing errors on an untouched empty form:** it feels hostile. Use a `touched` flag or show errors after submit.
- **Trusting `accept` or client validation:** both are only hints. Check in code and on the server.
- **Setting `Content-Type: multipart/form-data` for `FormData`:** it breaks the boundary. Let the browser set it.
- **Delaying the input's `setState` to "debounce":** letters snap back. Debounce the work, not the input.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Explain: `<input value="hello" />` is rendered. A user types `x`. What do they see, what does the console show, and what are three ways to fix it, depending on what you want?

<details>
<summary>Show answer</summary>

The box still shows `hello`. React logs the warning that a `value` prop was given without an `onChange` handler, so the field is read-only. A `value` prop makes the input controlled, and React re-applies `hello` after the keystroke, because no state changed.

Fixes:
- Editable: keep state and add `onChange`: `<input value={text} onChange={(e) => setText(e.target.value)} />`.
- Display only: `<input value="hello" readOnly />`.
- A starting text the user can change, with no state: `<input defaultValue="hello" />`.

</details>

2. **(Easy)** Code: build a `PhoneInput` that only accepts digits and at most 10 of them. Typing letters or symbols must have no effect. Show a counter like `3/10 digits` under the input.

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

export default function PhoneInput() {
  const [phone, setPhone] = useState('')

  function handleChange(event) {
    const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(digitsOnly)
  }

  return (
    <div>
      <label htmlFor="phone">Phone</label>
      <input id="phone" inputMode="numeric" value={phone} onChange={handleChange} />
      <p>{phone.length}/10 digits</p>
    </div>
  )
}
```

`\D` matches any character that is not a digit, so `replace(/\D/g, '')` removes it. `slice(0, 10)` keeps the first ten. Because the input is controlled, the state decides what is shown, so wrong characters never appear. Typing `98a76-54321 99` gives `9876543219` and `10/10 digits` (checked by running it). `inputMode="numeric"` asks phones for a number keypad.

</details>

3. **(Easy)** Predict: the user changes the box from `1` to `5`. What does the paragraph say at the start, and after the change? Why? How do you fix it?

```jsx
import { useState } from 'react'

export default function Cart() {
  const [qty, setQty] = useState(1)

  return (
    <div>
      <label htmlFor="qty">Quantity</label>
      <input
        id="qty"
        type="number"
        value={qty}
        onChange={(event) => setQty(event.target.value)}
      />
      <p>Next: {qty + 1}</p>
    </div>
  )
}
```

<details>
<summary>Show answer</summary>

At the start: `Next: 2`. After the user enters 5: `Next: 51` (checked by running it).

`event.target.value` is always a string. After the change, `qty` is the string `"5"`, and `"5" + 1` joins the text to make `"51"`. At the start `qty` was the number `1`, so `1 + 1` was `2`. That is why it looked fine at first.

Fix: keep a string in state and convert when you calculate: `useState('1')` and `Number(qty) + 1`. Do not store `Number(event.target.value)` in state, because an empty box would become `0` and could never be cleared.

</details>

4. **(Medium)** Code: build an `OrderForm` with one `useState` object and one `handleChange`. Fields: size as radios (small, medium, large), topping as a select (mushroom, olives, onion) and an "Extra cheese" checkbox. Show a live summary such as `large pizza with olives and extra cheese`.

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

const sizes = ['small', 'medium', 'large']

export default function OrderForm() {
  const [order, setOrder] = useState({
    size: 'medium',
    topping: 'mushroom',
    extraCheese: false,
  })

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setOrder((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  return (
    <form>
      <fieldset>
        <legend>Size</legend>
        {sizes.map((size) => (
          <label key={size}>
            <input
              type="radio"
              name="size"
              value={size}
              checked={order.size === size}
              onChange={handleChange}
            />
            {size}
          </label>
        ))}
      </fieldset>

      <label htmlFor="topping">Topping</label>
      <select id="topping" name="topping" value={order.topping} onChange={handleChange}>
        <option value="mushroom">Mushroom</option>
        <option value="olives">Olives</option>
        <option value="onion">Onion</option>
      </select>

      <label>
        <input
          type="checkbox"
          name="extraCheese"
          checked={order.extraCheese}
          onChange={handleChange}
        />
        Extra cheese
      </label>

      <p>
        {order.size} pizza with {order.topping}
        {order.extraCheese ? ' and extra cheese' : ''}
      </p>
    </form>
  )
}
```

The radios share `name="size"`, which is also the state key, so the single handler works for them. The checkbox is the only field that stores `checked`. Choosing large, olives and extra cheese shows `large pizza with olives and extra cheese`.

</details>

5. **(Medium)** Predict: the user types `abc` into the box. What do they see in the input and in the paragraph? How many times does the component render? What is the bug and the fix?

```jsx
import { useState } from 'react'

export default function Mutation() {
  const [values, setValues] = useState({ name: '' })

  function handleChange(event) {
    values[event.target.name] = event.target.value
    setValues(values)
  }

  return (
    <div>
      <label htmlFor="name">Name</label>
      <input id="name" name="name" value={values.name} onChange={handleChange} />
      <p>You typed: {values.name}</p>
    </div>
  )
}
```

<details>
<summary>Show answer</summary>

The input stays empty, the paragraph stays at `You typed: `, and the component renders only once (checked by running it). Typing seems to do nothing.

The handler changes the old object and then passes **the same object** to `setValues`. React compares by reference, sees the same object, and skips the re-render. The controlled input then gets its old `value` back.

Fix: create a new object.

```jsx
function handleChange(event) {
  const { name, value } = event.target
  setValues((current) => ({ ...current, [name]: value }))
}
```

</details>

6. **(Medium)** Code: build a `FeedbackForm` with **no state for the fields**. Fields: Name (text), Rating (select 1 to 5, default 3) and a "Please reply to me" checkbox. On submit, read the values with `FormData`, show `Thanks Ada, rating 4, reply: yes`, and reset the form.

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

export default function FeedbackForm() {
  const [message, setMessage] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    const name = data.get('name')
    const rating = data.get('rating')
    const wantsReply = data.get('wantsReply') === 'on'

    setMessage(`Thanks ${name}, rating ${rating}, reply: ${wantsReply ? 'yes' : 'no'}`)
    form.reset() // puts every uncontrolled field back to its default
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="name">Name</label>
      <input id="name" name="name" />

      <label htmlFor="rating">Rating</label>
      <select id="rating" name="rating" defaultValue="3">
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <label>
        <input name="wantsReply" type="checkbox" />
        Please reply to me
      </label>

      <button type="submit">Send feedback</button>
      <p>{message}</p>
    </form>
  )
}
```

The only state is the message. An unticked checkbox is missing from `FormData`, so `data.get('wantsReply')` is `null`, and comparing with `'on'` turns it into a boolean. After `form.reset()`, the name is empty, the rating is back to 3 and the box is unticked (checked by running it).

</details>

7. **(Medium)** Predict: the user presses **Go** without touching anything. What does the `<output>` show?

```jsx
import { useState } from 'react'

export default function FormDataQuiz() {
  const [result, setResult] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    setResult(JSON.stringify(data))
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="user" defaultValue="ada" />
      <input defaultValue="ignored" />
      <input name="nick" defaultValue="countess" disabled />
      <input name="news" type="checkbox" />
      <input name="terms" type="checkbox" defaultChecked />
      <input name="color" type="radio" value="red" />
      <input name="color" type="radio" value="blue" defaultChecked />
      <select name="lang" defaultValue="js">
        <option value="js">JS</option>
        <option value="ts">TS</option>
      </select>
      <button type="submit">Go</button>
      <output>{result}</output>
    </form>
  )
}
```

<details>
<summary>Show answer</summary>

`{"user":"ada","terms":"on","color":"blue","lang":"js"}` (checked by running it).

- `user` is included.
- The second input has no `name`, so it is skipped.
- `nick` is `disabled`, so it is skipped.
- `news` is an unticked checkbox, so it is skipped.
- `terms` is ticked and has no `value`, so it is `"on"`.
- For the radios, only the checked one counts: `color` is `"blue"`.
- `lang` is the selected option's value, `"js"`.

</details>

8. **(Medium)** Code: build a `UsernameForm` with one field. Rules: 3 to 12 characters, and only letters, digits and underscores. Show the error **only after the user leaves the field**, and hide it as soon as the value is valid. The Save button is disabled while the value is invalid. Pressing Save calls an `onSave(username)` prop.

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

function validateUsername(username) {
  if (username.length < 3 || username.length > 12) return 'Use 3 to 12 characters'
  if (!/^\w+$/.test(username)) return 'Use only letters, digits and underscores'
  return ''
}

export default function UsernameForm({ onSave = () => {} }) {
  const [username, setUsername] = useState('')
  const [touched, setTouched] = useState(false)

  const error = validateUsername(username)

  function handleSubmit(event) {
    event.preventDefault()
    onSave(username)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="username">Username</label>
      <input
        id="username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={touched && error ? 'true' : undefined}
        aria-describedby={touched && error ? 'username-error' : undefined}
      />
      {touched && error && (
        <p id="username-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={error !== ''}>
        Save
      </button>
    </form>
  )
}
```

The error is derived from the value on every render, and `touched` decides if it is visible. We ran it: typing `ab` shows nothing; after Tab the message "Use 3 to 12 characters" appears; adding `!` changes it to "Use only letters, digits and underscores"; `ada_99` clears it and enables Save; pressing Save calls `onSave` with `ada_99`. `\w` means a letter, digit or underscore.

</details>

9. **(Medium)** Explain: users report that in this form the focus jumps out of the input after every key, and the second letter is lost. Why? Fix it.

```jsx
import { useState } from 'react'

export default function Signup() {
  const [email, setEmail] = useState('')

  function EmailField() {
    return (
      <input
        aria-label="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
    )
  }

  return <EmailField />
}
```

<details>
<summary>Show answer</summary>

`EmailField` is created inside `Signup`, so it is a **new function, and so a new component type, on every render**. After the first key, `Signup` re-renders. React sees a different type at the same place, removes the old `<input>` (which had focus) and mounts a new one. Focus falls back to the page body, so the next key goes nowhere. In our run, after typing `a` then `b`, the value was only `"a"` and the active element was `BODY`.

Fix: define the component outside, and pass what it needs as props (or write the `<input>` directly in `Signup`).

```jsx
function EmailField({ value, onChange }) {
  return <input aria-label="Email" value={value} onChange={onChange} />
}

export default function Signup() {
  const [email, setEmail] = useState('')
  return <EmailField value={email} onChange={(event) => setEmail(event.target.value)} />
}
```

</details>

10. **(Hard)** Code: build an `ImagePicker` for up to 3 photos. Use a file input with `multiple`. Accept only files whose `type` starts with `image/` and whose size is at most 1 MB. List the accepted names. List the problems for rejected files (wrong type, too big, or more than 3 files). Add a Clear button that empties everything, including the file input.

<details>
<summary>Show answer</summary>

```jsx
import { useRef, useState } from 'react'

const MAX_SIZE = 1024 * 1024 // 1 MB
const MAX_FILES = 3

export default function ImagePicker() {
  const inputRef = useRef(null)
  const [accepted, setAccepted] = useState([])
  const [problems, setProblems] = useState([])

  function handleChange(event) {
    const good = []
    const bad = []
    for (const file of Array.from(event.target.files)) {
      if (!file.type.startsWith('image/')) {
        bad.push(`${file.name}: not an image`)
      } else if (file.size > MAX_SIZE) {
        bad.push(`${file.name}: larger than 1 MB`)
      } else if (good.length >= MAX_FILES) {
        bad.push(`${file.name}: only ${MAX_FILES} files allowed`)
      } else {
        good.push(file)
      }
    }
    setAccepted(good)
    setProblems(bad)
  }

  function handleClear() {
    inputRef.current.value = '' // the only value you may set on a file input
    setAccepted([])
    setProblems([])
  }

  return (
    <div>
      <label htmlFor="photos">Photos</label>
      <input
        id="photos"
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
      />

      <ul aria-label="Accepted files">
        {accepted.map((file) => (
          <li key={file.name}>{file.name}</li>
        ))}
      </ul>

      {problems.length > 0 && (
        <ul aria-label="Problems" role="alert">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      <button type="button" onClick={handleClear}>
        Clear
      </button>
    </div>
  )
}
```

We ran it with six files: three small images were accepted; a text file, a 1 MB + 1 byte image and a fourth image were each rejected with the right message. Clear emptied both lists and the input (`input.files.length` was 0). The `accept` attribute alone would not be enough: a user can usually still choose any file, so the code checks `type` and `size` itself. The server must check again.

</details>

11. **(Hard)** Code: build a `DebouncedSearch`. The input updates instantly. 400 ms after the last keystroke, show `Results for: <text>`. While the text is waiting, show `Searching...` instead. Do not store the "waiting" flag in state.

<details>
<summary>Show answer</summary>

```jsx
import { useEffect, useState } from 'react'

export default function DebouncedSearch() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400)
    return () => clearTimeout(timer)
  }, [query])

  const isPending = query !== debouncedQuery // derived, not stored

  return (
    <div>
      <label htmlFor="q">Search</label>
      <input id="q" value={query} onChange={(event) => setQuery(event.target.value)} />
      {isPending && <p>Searching...</p>}
      {!isPending && debouncedQuery && <p>Results for: {debouncedQuery}</p>}
    </div>
  )
}
```

"Waiting" simply means the live text differs from the delayed copy, so it is calculated with one comparison. In a test with fake timers, `Searching...` stayed on screen 399 ms after the last key, and at 400 ms it changed to `Results for: rea`. The cleanup `clearTimeout` makes each new keystroke cancel the previous timer.

</details>

12. **(Hard)** Explain: you change the `Newsletter` form from section 14 so it uses `<form action={subscribe}>`. A tester complains that after a successful submit the email box is emptied, and they want to keep it. Why does it happen? Give three ways to keep the text.

<details>
<summary>Show answer</summary>

When an Action function finishes without throwing, React resets the form's **uncontrolled** fields to their default values. The email input has no `value` prop and no `defaultValue`, so its default is empty, and the typed text is wiped.

Ways to keep it (each was checked by running it):
1. Make the input **controlled**: `value={email}` with `onChange`. A controlled input keeps its text because its value comes from state.
2. Save the submitted text in state inside the action, and feed it back with `defaultValue={saved}`. The "default" after the reset is then the saved text.
3. Use `onSubmit` with `event.preventDefault()` instead of `action`. No automatic reset happens, so the input keeps its text.

You can also decide to keep the reset, since for many forms an empty box after success is exactly what you want.

</details>

## Recap
- A controlled input gets `value` (or `checked`) from state and updates it in `onChange`. State is the single source of truth.
- `value` without `onChange` freezes the field. Start every state with a real value (`''`), never `undefined` or `null`.
- Checkbox uses `checked`, radio uses one shared state with `checked={choice === value}`, select and textarea take `value`, and number inputs give strings.
- For many fields: one state object, a `name` on each input, and one handler with `[name]: value`. Always create a new object.
- Submit with `onSubmit` on the form, call `event.preventDefault()`, and give non-submit buttons `type="button"`.
- Derive errors from the values with a pure function, show them late (blur or submit), remove them early, and validate again on the server.
- Uncontrolled inputs use `defaultValue`, a ref, or `new FormData(form)`. A file input is always uncontrolled, and `accept` is only a hint.
- Use controlled for live UI, uncontrolled for simple submit-only forms. Debounce the work you do with typed text, never the input itself.

## Where to go next
- Next lesson: [Thinking in React](./08-thinking-in-react.md), where you lift state up and see how forms fit into a whole app.
- Practice: [Signup form with validation](../practice-app/exercises/react/04-signup-form-validation/README.md), [Character counter](../practice-app/exercises/react/09-character-counter/README.md), [Autocomplete with debounce](../practice-app/exercises/react/12-autocomplete-debounce/README.md) and [Multi-step form](../practice-app/exercises/react/20-multi-step-form/README.md).
- Deeper: [Forms with libraries](../03-intermediate/04-forms-with-libraries.md), [React 19 and newer](../04-advanced/04-react-19-and-newer.md) for form actions, and [Accessibility](../04-advanced/09-accessibility.md) for accessible errors.
- Interview rounds: Round 2, state, data and routing questions (planned) and Round 4, easy machine coding (planned).
- Gotchas list: Common bugs and fixes (planned).
