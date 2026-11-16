# Forms with React Hook Form and Zod

> **Level:** Intermediate   **Time:** about 55 minutes   **Read first:** [Forms](../01-basics/07-forms.md), [useRef](../02-hooks/04-useref.md)

## What you will learn
- Explain why a form library helps, and why React Hook Form (RHF) re-renders so little.
- Build a form with `register`, `handleSubmit`, `formState`, `defaultValues` and `reset`, and choose a validation mode.
- Describe valid data with a Zod schema, use `safeParse`, and connect the schema to a form with `zodResolver`.
- Show accessible errors, show server errors with `setError`, and stop a double submit.
- Use `useWatch`, `Controller` and `useFieldArray`, and build async-checked, multi-step and file-upload forms.
- Compare RHF with React 19 form actions and `useActionState`, and test a form with Testing Library.

## 1. Why use a form library?

The [Forms lesson](../01-basics/07-forms.md) showed how to build a form with plain React. That is the right start, and it is enough for a login box. But when a form grows, the same four pains appear:

1. **Boilerplate.** Every field needs a value, a change handler, a "touched" flag and an error.
2. **Re-renders.** A controlled input re-renders the whole form component on every keystroke.
3. **Scattered rules.** Validation ends up spread over handlers, effects and JSX.
4. **Bookkeeping.** "Did the user change anything?" (**dirty**), "did they visit this field?" (**touched**), "are we sending right now?", "put back the saved values". You write all of it by hand.

A form library does this bookkeeping for you. Here is the same three-field form, by hand and with **React Hook Form**:

```jsx
// By hand: one state object, one handler, a render for every keystroke
const [values, setValues] = useState({ name: '', email: '', city: '' })
const handleChange = (event) =>
  setValues((current) => ({ ...current, [event.target.name]: event.target.value }))

<input name="name" value={values.name} onChange={handleChange} />
```

```jsx
// With React Hook Form: register hands the input what it needs
const { register } = useForm({ defaultValues: { name: '', email: '', city: '' } })

<input {...register('name')} />
```

We ran both with three text inputs and typed `abc` into one of them. The hand-written form rendered once on mount and 3 more times while typing (4 in total). The RHF form rendered 2 times on mount (it does one extra render while it starts up) and **0 more times** while typing.

You need three packages. Each has one job:

- **react-hook-form** keeps the form state (values, errors, dirty, touched, submitting).
- **zod** describes what valid data looks like (a **schema**).
- **@hookform/resolvers** is the glue between the two.

```bash
npm install react-hook-form zod @hookform/resolvers
```

Versions this lesson uses (checked in November 2026): React Hook Form 7.91, Zod 4.6, @hookform/resolvers 7. React Hook Form 8 is still in beta, so do not use it for real work, and treat tutorials that show it as current with care. `import { z } from 'zod'` gives you Zod 4. Many older tutorials show Zod 3 spelling such as `z.string().email()`. It still runs, but it is the old way (section 6 lists the changes).

A library is not always needed. For a search box or a two-field form, plain React or a form action (section 16) is simpler. Use a library when the form has many fields, shared rules, repeatable rows, or when you need dirty, touched and good error handling.

**Common mistake:** keeping the value in `useState` as well as in RHF.

```jsx
// Wrong: two owners. React controls the value, and your onChange (written after
// the spread) replaces the onChange from register, so RHF never hears about typing.
const [email, setEmail] = useState('')
<input {...register('email')} value={email} onChange={(e) => setEmail(e.target.value)} />

// Right: let RHF own the field
<input {...register('email')} />
```

Why: one input, one owner. If you need to run your own code on change, pass it as a register option: `register('email', { onChange: (e) => track(e.target.value) })`.

## 2. Your first form: register and handleSubmit

```jsx
// Login.jsx
import { useForm } from 'react-hook-form'

export default function LoginForm({ onLogin }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  return (
    <form onSubmit={handleSubmit(onLogin)} noValidate>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        {...register('email', { required: 'Email is required' })}
      />
      {errors.email && <p role="alert">{errors.email.message}</p>}

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        {...register('password', {
          required: 'Password is required',
          minLength: { value: 8, message: 'Use at least 8 characters' },
        })}
      />
      {errors.password && <p role="alert">{errors.password.message}</p>}

      <button type="submit">Log in</button>
    </form>
  )
}
```

**What happens, step by step:**
1. `useForm()` creates the form engine and returns tools: `register`, `handleSubmit`, `formState` and more.
2. `register('email', rules)` returns four props: `name`, `onChange`, `onBlur` and `ref` (we printed the keys: `name,onChange,onBlur,ref`). The `{...}` spread puts all four on the input.
3. The `ref` gives RHF the real DOM input. From now on RHF can read `input.value` at any time and can call `input.focus()`.
4. The user types. React does not re-render and nothing is in state. The browser keeps the text, as in an uncontrolled input.
5. On submit, `handleSubmit(onLogin)` runs. It calls `event.preventDefault()` for you, reads every registered field, and checks the rules.
6. If a rule fails, RHF fills `formState.errors`, re-renders, **focuses the first invalid field**, and does not call `onLogin`. We submitted an empty form: two alerts appeared (`Email is required`, `Password is required`), `onLogin` had 0 calls, and focus was on the email input.
7. If all rules pass, RHF calls `onLogin(data, event)`. Here `data` is `{ email, password }`. We submitted `ada@example.com` and a long password and got exactly that object, and the second argument was the `submit` event.
8. After a failed submit, RHF re-checks a field every time it changes. Typing a longer password removed its error with no second submit.

The built-in rules are `required`, `minLength`, `maxLength`, `min`, `max`, `pattern` and `validate` (your own function, which may be async). Each takes a value, or `{ value, message }`. `required` takes the message text directly. `noValidate` on the form switches off the browser's own error bubbles, so only your messages show (see the [Forms lesson](../01-basics/07-forms.md)).

`handleSubmit` can take a second function that runs when validation fails. It receives the errors object, keyed by field name. For a failed `required` rule we saw an entry with `type: 'required'` and the `message` we wrote:

```jsx
<form onSubmit={handleSubmit(onValid, onInvalid)}>
```

**Common mistake:** creating the handler and throwing it away.

```jsx
// Wrong: this arrow function builds a handler and never runs it. Nothing is submitted.
<form onSubmit={() => handleSubmit(onValid)}>

// Right: handleSubmit(onValid) already returns the function React should call
<form onSubmit={handleSubmit(onValid)}>
```

Why: `handleSubmit(fn)` is a function that returns another function (the real event handler).

## 3. Why React Hook Form re-renders so little

Remember the guest book in the Forms lesson? A controlled input is a receptionist who writes down every letter. An uncontrolled input hands the guest the pen and reads the page later. RHF takes the second way. The text stays in the DOM, and RHF reads it through the `ref` only when it needs it: on submit, on blur, or when validating.

Typing three letters into one of three fields, we counted how many extra times the form component rendered:

| Setup | Extra renders after typing `abc` |
| --- | --- |
| Hand-written controlled form (`useState`) | 3 |
| RHF, nothing read from `formState` | 0 |
| RHF, `formState.isDirty` read in render | 1 (only the first letter changes `isDirty`) |
| RHF, `watch('name')` in the same component | 3 |

The third row shows the other half of the trick: **RHF only tracks the parts of `formState` that you read while rendering.** `formState` is a special object (a Proxy). When your render code reads `formState.isDirty`, RHF notes "this component cares about dirty" and re-renders it when dirty changes. If you never read it during render, RHF does not keep it up to date.

```jsx
const {
  register,
  formState: { isDirty }, // reading it here, while rendering, subscribes this component
} = useForm({ defaultValues: { name: '', email: '', city: '' } })
```

**Common mistake:** reading `formState` only inside a handler.

```jsx
// Wrong: formState.isDirty is never read while rendering, so RHF does not track it.
// We typed "abc" and the handler logged false.
const { register, formState } = useForm()
<button onClick={() => console.log(formState.isDirty)}>Check</button>

// Right: destructure what you need at the top of the component
const { register, formState: { isDirty } } = useForm()
<button onClick={() => console.log(isDirty)}>Check</button>
```

Why: reading `formState` during render is how you subscribe to it.

Honest note: for a normal form, 3 extra renders are invisible to the user. RHF's real wins are less code and built-in dirty, touched, reset and validation. The speed matters most for big forms, heavy child components and slow devices.

## 4. defaultValues, formState, reset and setValue

`defaultValues` is the "clean" state of the form. RHF compares the current values with it to know what is **dirty**. Always give it, so that fields start as `''` and not `undefined`.

`formState` has many fields. The common ones:

| Field | Meaning |
| --- | --- |
| `errors` | Current errors, by field name |
| `isSubmitting` | `true` while the promise returned by your submit handler is pending |
| `isSubmitted`, `isSubmitSuccessful`, `submitCount` | What happened on submit |
| `isDirty`, `dirtyFields` | Differs from the default values (whole form, or per field) |
| `touchedFields` | Fields the user focused and left |
| `isValid` | The whole form is valid right now |
| `isValidating` | A validation (maybe async) is running |
| `isLoading` | An async `defaultValues` function is still loading |

Here is a profile editor that uses `isDirty`, `isSubmitting` and `reset`:

```jsx
// Profile.jsx
import { useForm } from 'react-hook-form'

export default function ProfileForm({ initial, onSave }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm({ defaultValues: initial })

  async function save(data) {
    await onSave(data)
    reset(data) // the saved values become the new "clean" values
  }

  return (
    <form onSubmit={handleSubmit(save)}>
      <label htmlFor="name">Name</label>
      <input id="name" {...register('name')} />

      <label htmlFor="bio">Bio</label>
      <textarea id="bio" {...register('bio')} />

      <button type="submit" disabled={!isDirty || isSubmitting}>
        Save
      </button>
      <button type="button" onClick={() => reset()} disabled={!isDirty}>
        Undo changes
      </button>
    </form>
  )
}
```

**What happens, step by step** (we rendered it with `{ name: 'Ada', bio: 'First programmer' }`):
1. At the start nothing differs from `defaultValues`, so `isDirty` is `false` and Save is disabled.
2. The user types ` L` after the name. The value differs, so `isDirty` becomes `true` and Save is enabled.
3. "Undo changes" calls `reset()` with no argument. The form goes back to the default values: the name is `Ada` again and Save is disabled.
4. The user types ` Lovelace` and clicks Save. `save` receives `{ name: 'Ada Lovelace', bio: 'First programmer' }`, waits for `onSave`, and then calls `reset(data)`.
5. `reset(data)` makes the saved values the **new baseline**. Save is disabled again. If the user types more and clicks "Undo changes", the name goes back to `Ada Lovelace`, not to the original `Ada`.

More tools for values:

- **`setValue(name, value, options)`** changes a field from code. By default it only updates the input. We saw `isDirty` stay `false` after a plain `setValue`. Add `{ shouldDirty: true }` to mark it dirty, `{ shouldValidate: true }` to run validation (an empty value then showed an error), and `{ shouldTouch: true }` to mark it touched.
- **`getValues()`** reads the current values without subscribing to anything. Use it inside handlers.
- **`reset()`** returns to the defaults and clears errors. **`reset(newValues)`** sets a new baseline.

**Data that arrives later.** `defaultValues` is read once, on the first render. If the user's profile comes from the server a moment later, there are two correct ways:

```jsx
// 1. The values option: the form updates whenever this value changes
const { register } = useForm({ defaultValues: { name: '' }, values: user })

// 2. An async defaultValues function (formState.isLoading is true until it resolves)
const { register, formState: { isLoading } } = useForm({
  defaultValues: async () => {
    const response = await fetch('/api/me')
    return response.json()
  },
})
```

We tested both: with `values`, the input changed from empty to `Loaded Ada` when the data arrived. With the async function, the input started empty with `isLoading` true and then showed `From server`. A third option is `reset(user)` inside an effect or a data callback.

**Common mistake:** passing late data as `defaultValues`.

```jsx
// Wrong: user is undefined on the first render, and defaultValues is never read again
const { register } = useForm({ defaultValues: user })

// Right
const { register } = useForm({ defaultValues: { name: '' }, values: user })
```

Why: `defaultValues` is cached on first render. When we passed data one render too late, the input stayed empty.

## 5. When validation runs: mode

The `mode` option says when RHF checks a field **before the first submit**. The default is `onSubmit`.

```jsx
useForm({ mode: 'onTouched' })
```

We typed `ada` in an email field (rule: must look like an email), pressed Tab, and then typed `@x.io` to make it valid. This table shows whether the error was visible at each moment:

| `mode` | Error shown after typing `ada`? | After leaving the field? | While typing the fix? |
| --- | --- | --- | --- |
| `onSubmit` (default) | no | no | no |
| `onBlur` | no | **yes** | **still shown** until the field is left again |
| `onChange` | **yes** | yes | gone at once |
| `onTouched` | no | **yes** | gone at once |

Two more facts:

- `onTouched` means "first check when the user leaves the field, then check on every change". That matches the rule "show errors late, remove them early" from the Forms lesson, so it is a good choice for most forms.
- After the first submit, every mode re-checks a field on each change. This is `reValidateMode`, and its default is `'onChange'`. In our test, with all four modes, typing the fix after a failed submit removed the error.

`mode: 'all'` runs on both blur and change. Use `onChange` for things that need instant feedback, such as a password strength hint. Avoid it for slow async checks (section 13).

**Common mistake:** expecting errors before the first submit.

```jsx
// Surprise: with the default mode nothing shows until the user presses submit
useForm()

// Show an error when the user leaves a bad field
useForm({ mode: 'onTouched' })
```

Why: the default `onSubmit` mode is the quietest one. Choose a mode on purpose.

## 6. Describe your data with Zod

`register` rules are fine for a small form. When rules multiply, or when the server needs the same rules, write them once as a **schema**: a description of what valid data looks like. Zod is the most popular schema library for TypeScript and JavaScript.

```js
import { z } from 'zod'

const userSchema = z.object({
  email: z.email('Enter a valid email address'),
  age: z.number().min(18, 'Adults only'),
})

const good = userSchema.safeParse({ email: 'ada@example.com', age: 36 })
// { success: true, data: { email: 'ada@example.com', age: 36 } }

const bad = userSchema.safeParse({ email: 'nope', age: 12 })
console.log(bad.success) // false
console.log(bad.error.issues.map(({ path, message }) => ({ path, message })))
// [
//   { path: ['email'], message: 'Enter a valid email address' },
//   { path: ['age'], message: 'Adults only' },
// ]
```

**What happens, step by step:**
1. `z.object({...})` builds a schema for an object. Each key has its own schema: `z.email(...)` for a string that must look like an email, `z.number().min(18, ...)` for a number of at least 18. The text you pass is the error message.
2. `safeParse(input)` checks the input and **never throws**. It returns an object with `success`.
3. When `success` is `true`, `data` holds the checked (and possibly changed) value.
4. When `success` is `false`, `error.issues` is a list. Each issue has a `path` (where the problem is) and a `message`.
5. `parse(input)` does the same check but **returns the data directly and throws a `ZodError`** when it is invalid. We checked that `error instanceof z.ZodError` is `true`. Use `parse` when invalid data is a bug (for example, your own config). Use `safeParse` for user input, where invalid data is normal.

You can turn issues into one message list per field with `z.flattenError(error)`. For the `bad` example above it gives `{ formErrors: [], fieldErrors: { email: ['Enter a valid email address'], age: ['Adults only'] } }`.

### Schemas for form fields

Browser inputs always give **strings**. That changes how you write a form schema:

| Field | Schema |
| --- | --- |
| Required text | `z.string().trim().min(1, 'Name is required')` |
| Email | `z.email('Enter a valid email address')` |
| Number from an input | `z.coerce.number().min(18, 'You must be 18 or older')` |
| Checkbox that must be ticked | `z.literal(true, { error: 'You must accept the terms' })` |
| Radio or select | `z.enum(['free', 'pro'], { error: 'Pick a plan' })` |
| Optional text | `z.string().max(200).optional()` |

Facts to remember:

- **An empty text input gives `''`, not `undefined`.** `z.string()` accepts `''`, so say `.min(1, 'Required')` for required text. `.trim()` makes a name of only spaces count as empty (we checked: `'   '` fails with `Name is required`).
- **Write your own messages.** The default for an empty required string is `Too small: expected string to have >=1 characters`, and for a missing value `Invalid input: expected string, received undefined`. Users should never see those.
- **`z.coerce.number()` turns text into a number, but it also turns `''` into `0`.** We ran `z.coerce.number().safeParse('')` and got `success: true` with `data: 0`. Add a `.min(...)`, as in the table. Another way is to read the number in RHF with `register('age', { valueAsNumber: true })` (an empty box becomes `NaN`) and use `z.number({ error: 'Enter your age' })`. We tested that: an empty field showed `Enter your age`, and `20` arrived as the number `20`.
- **A checkbox gives `true` or `false`**, so `z.literal(true, ...)` means "must be ticked".
- **`.refine(fn, { error, path })` checks several fields together.** `path` chooses which field shows the message:

```js
const passwords = z
  .object({ password: z.string().min(8, 'Use at least 8 characters'), confirm: z.string() })
  .refine((data) => data.password === data.confirm, {
    error: 'Passwords do not match',
    path: ['confirm'],
  })
```

In Zod 4 an object-level `refine` still runs when a field failed a simple rule such as `min`, so a short password that also differs from the confirmation gives both messages. It does not run when a field has the wrong type (for example a missing value).

### Zod 3 spelling you may still see

| Old (Zod 3 tutorials) | Current (Zod 4) |
| --- | --- |
| `z.string().email()` | `z.email()` |
| `{ message: '...' }`, `invalid_type_error`, `required_error` | `{ error: '...' }` |
| `error.format()`, `error.flatten()` | `z.treeifyError(error)`, `z.flattenError(error)` |
| `.strict()`, `.merge()`, `z.nativeEnum()` | `z.strictObject()`, `.extend()`, `z.enum()` |
| `z.record(z.string())` | `z.record(z.string(), z.string())` (two arguments) |

Many of the old forms still run in 4.6 but are deprecated, and the one-argument `z.record(z.string())` is a TypeScript error. A plain string is still fine as a short message: `.min(8, 'Use at least 8 characters')`.

### Types from a schema (TypeScript)

If you use TypeScript, you do not write the form type by hand. You ask the schema:

```ts
const schema = z.object({
  email: z.email('Enter a valid email address'),
  age: z.coerce.number().min(18, 'You must be 18 or older'),
})

type FormInput = z.input<typeof schema> // what goes in: age is unknown (text from the input)
type FormOutput = z.output<typeof schema> // what comes out: age is a number
type Same = z.infer<typeof schema> // z.infer is the same as z.output
```

We type-checked this with `tsc`. Input and output differ when a schema coerces or transforms, which is why Zod gives you both.

**Common mistake:** `z.string()` for required text.

```js
// Wrong: '' is a string, so an empty name is valid
name: z.string()

// Right
name: z.string().trim().min(1, 'Name is required')
```

Why: a cleared input gives an empty string, not a missing value.

## 7. Connect Zod to the form: zodResolver

A **resolver** is a function that lets RHF use an outside validator. `zodResolver` turns a Zod schema into one. First, the schema in its own file, so a server can import it too:

```js
// signupSchema.js
import { z } from 'zod'

export const signupSchema = z
  .object({
    email: z.email('Enter a valid email address'),
    age: z.coerce.number().int('Age must be a whole number').min(18, 'You must be 18 or older'),
    password: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string(),
    terms: z.literal(true, { error: 'You must accept the terms' }),
  })
  .refine((data) => data.password === data.confirm, {
    error: 'Passwords do not match',
    path: ['confirm'],
  })
```

Now the wiring. This is the whole change to `useForm`:

```jsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signupSchema } from './signupSchema.js'

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(signupSchema),
  defaultValues: { email: '', age: '', password: '', confirm: '', terms: false },
})
```

**What happens, step by step:**
1. The user submits. RHF reads every registered field from the DOM into one object. Every value is still text: `{ email: 'ada@example.com', age: '30', ... }`.
2. RHF gives that object to the resolver.
3. `zodResolver` runs the schema. It uses `parseAsync` by default, so async rules work too.
4. If there are issues, the resolver turns each one into RHF's error shape under the issue's `path`. `errors.confirm.message` is `Passwords do not match`. If a field has several issues, the first one wins.
5. If everything is valid, `handleSubmit` calls your function with the **parsed output**, not the raw text. We submitted `age` as the text `30` and received this object:

```json
{ "email": "ada@example.com", "age": 30, "password": "longenough", "confirm": "longenough", "terms": true }
```

`age` is the number `30` because the schema coerced it. Trimmed and transformed values arrive in the same way.

**TypeScript.** With `@hookform/resolvers` 7 the types flow from the schema. `useForm({ resolver: zodResolver(schema) })` is enough, and `data` inside `handleSubmit` has the output type (we checked that `data.age` is a `number` and that using it as a string is a compile error). When you want to name the types, pass them in the order input, context, output:

```tsx
const form = useForm<FormInput, unknown, FormOutput>({ resolver: zodResolver(schema) })
```

Other schema libraries such as Valibot or ArkType also work, through `standardSchemaResolver` from `@hookform/resolvers/standard-schema`.

**Common mistake:** adding `register` rules next to a resolver.

```jsx
// Wrong: the resolver is in charge, so this required rule is ignored
const { register } = useForm({ resolver: zodResolver(schema) })
<input {...register('name', { required: 'Name is required' })} />

// Right: put the rule in the schema
name: z.string().trim().min(1, 'Name is required')
```

Why: with a resolver, RHF asks the resolver, not the `register` rules. We submitted an empty name with a `required` rule and a resolver: `onValid` was called and no error showed.

## 8. Accessible errors

A red message is not enough. People who use a screen reader or only a keyboard need four things:

1. A **label** tied to the input (`htmlFor` and `id`).
2. **`aria-invalid="true"`** on a wrong field, so assistive technology knows it is wrong.
3. **`aria-describedby`** pointing at the error's `id`, so the message is read when the field gets focus.
4. **`role="alert"`** on the message, so it is announced when it appears.

Plus one more for everyone: **move focus to the first invalid field** after a failed submit. RHF does this by default (`shouldFocusError` is `true`), but only if it has the field's `ref`. That is why the component below passes `ref` to the `<input>`. In React 19, `ref` is a normal prop, so a function component can take it without `forwardRef` (see [useRef](../02-hooks/04-useref.md)).

Put it all in one small component so you write it once:

```jsx
// TextField.jsx
import { useId } from 'react'

export function TextField({ label, error, ref, ...inputProps }) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        ref={ref}
        aria-invalid={error ? 'true' : 'false'}
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
```

`useId` makes a unique id for each field, so the label and the error always find their input, even if the component is used many times. Now the complete signup form from the schema in section 7:

```jsx
// Signup.jsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signupSchema } from './signupSchema.js'
import { TextField } from './TextField.jsx'

export default function SignupForm({ onSignup }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', age: '', password: '', confirm: '', terms: false },
  })

  return (
    <form onSubmit={handleSubmit(onSignup)} noValidate>
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <TextField label="Age" type="number" error={errors.age?.message} {...register('age')} />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <TextField
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirm?.message}
        {...register('confirm')}
      />

      <label>
        <input
          type="checkbox"
          aria-invalid={errors.terms ? 'true' : 'false'}
          aria-describedby={errors.terms ? 'terms-error' : undefined}
          {...register('terms')}
        />
        I accept the terms
      </label>
      {errors.terms && (
        <p id="terms-error" role="alert">
          {errors.terms.message}
        </p>
      )}

      <button type="submit" disabled={isSubmitting}>
        Create account
      </button>
    </form>
  )
}
```

**What happens, step by step (we ran each of these):**
1. Click "Create account" on the empty form. Four alerts appear: `Enter a valid email address`, `You must be 18 or older` (an empty age becomes `0`), `Use at least 8 characters` and `You must accept the terms`. There is no error under Confirm password, because the two empty passwords are equal.
2. Focus jumps to the Email input. Its attributes are now `aria-invalid="true"` and `aria-describedby` pointing at the message. A valid field such as Confirm password has `aria-invalid="false"`. `onSignup` was called 0 times.
3. Fill in everything, but type a different text in Confirm password, and submit. Only `Passwords do not match` shows, and focus goes to Confirm password.
4. Retype the confirmation correctly. The error disappears while typing, with no new submit (re-validation, section 5).
5. Submit again. `onSignup` is called once with the parsed object from section 7. While the promise from `onSignup` is pending, `isSubmitting` is `true` and the button is disabled.

With many errors at once, many `role="alert"` messages may be read out together. Focusing the first bad field and linking its message with `aria-describedby` is usually enough. On a long form, also add an error summary at the top with links to the fields. The [accessibility lesson](../04-advanced/09-accessibility.md) goes deeper.

**Common mistake:** an error that is not connected to its field.

```jsx
// Wrong: a screen reader user never hears this, and the field is not marked invalid
<input {...register('email')} />
{errors.email && <span style={{ color: 'red' }}>{errors.email.message}</span>}

// Right: use the TextField above (aria-invalid, aria-describedby and role="alert")
<TextField label="Email" error={errors.email?.message} {...register('email')} />
```

Why: colour alone tells nothing to a screen reader. The message must be linked to the input.

## 9. Reading values: watch, useWatch and getValues

Sometimes the screen must react to a field: show a "preview", show a coupon box, change the list of cities. RHF has three ways to read values:

| Tool | Re-renders | Use it for |
| --- | --- | --- |
| `getValues('name')` | Nothing | Reading inside handlers |
| `watch('name')` | The component that called `useForm` | Quick reads in small forms |
| `useWatch({ control, name: 'name' })` | Only the component that calls it | A child that reacts to one field |

We counted renders after typing `abc` in the Name field:

- `watch('name')` in the form component: the form rendered **3 more times**. Typing in an unwatched field rendered it **0 more times**. `watch()` with no name watches everything, so typing in any field rendered it 3 more times.
- `useWatch` in a child component: the form rendered **0 more times** and only the child rendered, 3 more times.

So when a small part of the screen depends on a field, put it in its own component with `useWatch`:

```jsx
import { useWatch } from 'react-hook-form'

function Preview({ control }) {
  const name = useWatch({ control, name: 'name' })
  return <p>Hello {name}</p>
}

// in the form: <Preview control={control} />
```

### Dependent fields

A field whose options depend on another field. When the country changes, the old city may be wrong, so clear it:

```jsx
import { useForm, useWatch } from 'react-hook-form'

const cities = { in: ['Delhi', 'Pune'], de: ['Berlin', 'Munich'] }

export default function AddressForm({ onSave }) {
  const { register, handleSubmit, control, setValue } = useForm({
    defaultValues: { country: 'in', city: '' },
  })
  const country = useWatch({ control, name: 'country' })

  return (
    <form onSubmit={handleSubmit(onSave)}>
      <label htmlFor="country">Country</label>
      <select id="country" {...register('country', { onChange: () => setValue('city', '') })}>
        <option value="in">India</option>
        <option value="de">Germany</option>
      </select>

      <label htmlFor="city">City</label>
      <select id="city" {...register('city')}>
        <option value="">Choose a city</option>
        {cities[country].map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>

      <button type="submit">Save</button>
    </form>
  )
}
```

**What happens, step by step:**
1. `useWatch` reads `country`. It starts as `in`, so the city list is Delhi and Pune.
2. The user picks Pune. Then they change the country to Germany.
3. The `onChange` in the register options runs (RHF's own handling still runs too) and calls `setValue('city', '')`. The city select goes back to "Choose a city" (we saw the value `""`).
4. `useWatch` reports `de`, the component re-renders, and the options become Berlin and Munich.
5. The user picks Berlin and saves. `onSave` receives `{ country: 'de', city: 'Berlin' }`.

### Conditional fields and the stale value

Showing a field only when a box is ticked is easy: `{hasCoupon && <input {...register('coupon')} />}`. The trap is in the data.

```jsx
function CouponForm({ onOrder }) {
  const { register, handleSubmit, control } = useForm({
    defaultValues: { hasCoupon: false, coupon: '' },
  })
  const hasCoupon = useWatch({ control, name: 'hasCoupon' })

  return (
    <form onSubmit={handleSubmit(onOrder)}>
      <label>
        <input type="checkbox" {...register('hasCoupon')} /> I have a coupon
      </label>
      {hasCoupon && (
        <>
          <label htmlFor="coupon">Coupon</label>
          <input id="coupon" {...register('coupon')} />
        </>
      )}
      <button type="submit">Order</button>
    </form>
  )
}
```

We ticked the box, typed `SAVE10`, **unticked** the box (the coupon input disappeared) and clicked Order. `onOrder` received:

```json
{ "hasCoupon": false, "coupon": "SAVE10" }
```

The hidden field's old value is still in the data. By default RHF keeps the value of a field after its input unmounts (`shouldUnregister: false`). You have three fixes:

- `useForm({ shouldUnregister: true })`: the value of an unmounted field is removed. We got `{ "hasCoupon": false }`. Be careful: this applies to every field, which is bad for multi-step forms (section 14).
- Call `unregister('coupon')` when the box is unticked. Same result, but only for that field.
- Ignore the hidden field when you build the request, for example `hasCoupon ? data.coupon : undefined`.

**Common mistake:** assuming a hidden field leaves the data.

```jsx
// Wrong: sends the old coupon even though the user switched it off
await api.order(data)

// Right: remove it in RHF (shouldUnregister, unregister) or clean the data first
await api.order(data.hasCoupon ? data : { ...data, coupon: undefined })
```

Why: RHF keeps values by default, so that they survive when a field is hidden and shown again.

## 10. Server errors, submitting state and double submit

Client checks help the user. They do not protect you, because anyone can skip them. **The server must check again**, and it will find things the browser cannot know ("this email is already registered"). The clean way: one schema file used on both sides.

```js
// accountSchema.js (imported by the form AND by the server)
import { z } from 'zod'

export const accountSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
})
```

```js
// server.js (Node, an Express route, a Next.js Server Action, and so on)
import { z } from 'zod'
import { accountSchema } from './accountSchema.js'

const registered = new Set(['ada@example.com']) // stands in for a database

export async function createAccountOnServer(input) {
  const result = accountSchema.safeParse(input) // the same rules, run again

  if (!result.success) {
    const fieldErrors = z.flattenError(result.error).fieldErrors // { email: ['...'] }
    const errors = Object.fromEntries(
      Object.entries(fieldErrors).map(([field, messages]) => [field, messages[0]]),
    )
    return { ok: false, errors }
  }

  if (registered.has(result.data.email)) {
    return { ok: false, errors: { email: 'That email is already registered' } }
  }

  registered.add(result.data.email)
  return { ok: true }
}
```

We ran this function: `{ email: 'x', password: 'y' }` gave both field messages, a known email gave `That email is already registered`, and a new valid account gave `{ ok: true }`. In a real app the browser calls the server with `fetch`, and a small wrapper turns an error response (for example HTTP 422) into this same `{ ok, errors }` shape. A body that is not even an object ends up in `formErrors`, and a real handler should answer it with HTTP 400.

Now the form that shows those errors. `setError` puts a message on a field by hand:

```jsx
// Server.jsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { accountSchema } from './accountSchema.js'
import { TextField } from './TextField.jsx'

export default function SignupWithServer({ createAccount }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onValid(data) {
    try {
      const result = await createAccount(data)
      if (!result.ok) {
        // The server said no. Show its messages next to the right fields.
        Object.entries(result.errors).forEach(([field, message], index) => {
          setError(field, { type: 'server', message }, { shouldFocus: index === 0 })
        })
        return
      }
      // success: redirect, show a message, and so on
    } catch {
      setError('root.serverError', {
        type: 'network',
        message: 'Could not reach the server. Please try again.',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      {errors.root?.serverError && <p role="alert">{errors.root.serverError.message}</p>}

      <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
      <TextField
        label="Password"
        type="password"
        error={errors.password?.message}
        {...register('password')}
      />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create account'}
      </button>
    </form>
  )
}
```

**What happens, step by step:**
1. The user submits valid text. The schema passes, so RHF calls `onValid`. Because `onValid` is `async` and awaits `createAccount`, `isSubmitting` is `true` until it finishes. The button shows `Creating...` and is disabled.
2. The server answers `{ ok: false, errors: { email: 'That email is already registered' } }`.
3. `setError('email', { type: 'server', message }, { shouldFocus: true })` puts the message on the email field. The error appears under it with `aria-invalid="true"`, and focus moves to it. Only the first error asks for focus, so focus does not jump around.
4. `isSubmitting` goes back to `false` and the button is enabled.
5. The user edits the email. The server error disappears, because RHF re-validates that field on change. But if the user edits the password instead, the email error **stays** (we tested both).
6. If the network fails, `createAccount` throws. The `catch` calls `setError('root.serverError', ...)`. The `root` name is for form-level errors that belong to no field. This message is cleared by the next submit (we saw it vanish after a successful second submit).

Rules to remember:

- **`isSubmitting` follows the promise your handler returns.** The handler must be `async` or must return the promise. If it starts the request and does not return it, `isSubmitting` is `false` at once. We checked: a handler that did not return its pending promise left the button enabled, and one that returned it left the button disabled.
- **Catch errors yourself.** If your handler throws, the promise from `handleSubmit` rejects (we saw `boom` arrive as a rejection), so you get an unhandled error in the console. `isSubmitting` does go back to `false`, and `isSubmitSuccessful` stays `false`.
- **Disabling the button is not a full guard.** We fired a second `submit` event while the first request was pending, and RHF called the handler a second time (2 calls). Pressing Enter, a slow double click, or a script can do the same. Ignore submits while `isSubmitting` is true:

```jsx
const { handleSubmit, formState: { isSubmitting } } = useForm()
const submit = handleSubmit(onValid)

<form
  onSubmit={(event) => {
    if (isSubmitting) {
      event.preventDefault()
      return // a request is already running
    }
    submit(event)
  }}
>
```

With this guard, the same test made 1 call. For payments and orders, also make the server **idempotent** (the same request twice has the same effect as once), for example with an idempotency key.

**Common mistake:** not returning the promise.

```jsx
// Wrong: isSubmitting is false straight away, so the button is never disabled
function onValid(data) {
  createAccount(data)
}

// Right
async function onValid(data) {
  await createAccount(data)
}
```

Why: RHF waits for whatever your handler returns.

## 11. Controller: custom controlled components

`register` works with native inputs because RHF can read `input.value` and call `input.focus()` through the `ref`. Many components do not give RHF a DOM element: a star rating, a date picker, a select from a UI library. They usually offer only `value` and `onChange` props. For those, use **`Controller`** (or the `useController` hook). It is a small bridge that holds the field's value and passes it to your component.

```jsx
// Rating.jsx
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// A custom controlled component: it only knows value and onChange.
function StarRating({ value, onChange, onBlur, ref }) {
  return (
    <div role="radiogroup" aria-label="Rating" onBlur={onBlur}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          ref={n === 1 ? ref : undefined}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
        >
          {n <= value ? '*' : '-'}
        </button>
      ))}
    </div>
  )
}

const schema = z.object({
  rating: z.number().min(1, 'Pick a rating'),
})

export default function ReviewForm({ onReview }) {
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { rating: 0 },
  })

  return (
    <form onSubmit={handleSubmit(onReview)} noValidate>
      <Controller
        name="rating"
        control={control}
        render={({ field, fieldState }) => (
          <div>
            <StarRating {...field} />
            {fieldState.error && <p role="alert">{fieldState.error.message}</p>}
          </div>
        )}
      />
      <button type="submit">Send review</button>
    </form>
  )
}
```

**What happens, step by step:**
1. `useForm` returns `control`. You pass it to `Controller` with the field `name`.
2. `Controller` calls your `render` function with `field` and `fieldState`. `field` holds `value`, `onChange`, `onBlur`, `name`, `ref` and `disabled`. `fieldState` holds `error`, `invalid`, `isDirty`, `isTouched` and `isValidating`.
3. `<StarRating {...field} />` hands the component its `value` and `onChange`. Clicking a star calls `onChange(4)`, so RHF stores the number `4`.
4. The user submits without choosing. The schema fails, `fieldState.error` is set, and the message `Pick a rating` appears. Because the component put `field.ref` on the first button, **focus went to the first star** (we checked).
5. The user clicks "4 stars". The error disappears and `aria-checked` is `true` on that star. On submit, `onReview` receives `{ rating: 4 }`.

`Controller` re-renders only itself when its value changes, not the whole form. Use `register` for native inputs wherever you can, and `Controller` only for components that need it. For deep trees, `FormProvider` and `useFormContext` pass `control` and `register` down without prop drilling (used in section 14).

**Common mistake:** using `register` on a component that does not expose a DOM input.

```jsx
// Wrong: the component may ignore the ref and name, so RHF has nothing to read
<FancySelect {...register('country')} />

// Right
<Controller name="country" control={control} render={({ field }) => <FancySelect {...field} />} />
```

Why: `register` needs a real input to read. `Controller` works with just `value` and `onChange`.

## 12. Repeatable groups with useFieldArray

Sometimes the user adds and removes rows: team members, phone numbers, invoice lines. `useFieldArray` manages such a list.

```jsx
// Members.jsx
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  members: z
    .array(z.object({ email: z.email('Enter a valid email address') }))
    .min(1, 'Add at least one member')
    .max(3, 'You can invite at most 3 people'),
})

export default function InviteForm({ onInvite }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { members: [{ email: '' }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'members' })

  return (
    <form onSubmit={handleSubmit(onInvite)} noValidate>
      <ul>
        {fields.map((field, index) => (
          <li key={field.id}>
            <label htmlFor={`member-${field.id}`}>Email {index + 1}</label>
            <input id={`member-${field.id}`} {...register(`members.${index}.email`)} />
            {errors.members?.[index]?.email && (
              <p role="alert">{errors.members[index].email.message}</p>
            )}
            <button type="button" onClick={() => remove(index)}>
              Remove {index + 1}
            </button>
          </li>
        ))}
      </ul>

      {errors.members?.root && <p role="alert">{errors.members.root.message}</p>}

      <button type="button" onClick={() => append({ email: '' })}>
        Add member
      </button>
      <button type="submit">Send invites</button>
    </form>
  )
}
```

**What happens, step by step:**
1. `useFieldArray({ control, name: 'members' })` returns `fields` (the rows) and helpers: `append`, `remove`, `insert`, `move`, `swap`, `update` and `replace`.
2. Each item in `fields` has an `id` that RHF generates. Use `field.id` as the React `key`, **not the index**, so that React keeps each row's DOM input attached to the right row when rows are added or removed.
3. Each input is registered with a path that includes the index: `members.0.email`, `members.1.email`.
4. We added a second row, typed `a@x.io` and `b@x.io`, and removed row 1. The remaining input held `b@x.io` and its label became `Email 1`. The right row was removed.
5. Submit gave `{ "members": [{ "email": "b@x.io" }] }`. The generated `id` is **not** in the submitted data.
6. Errors have two places. A problem inside a row is `errors.members[index].email`. A problem with the list itself, such as "at least one" or "at most 3", is `errors.members.root`. We saw `Add at least one member` after removing every row, and `You can invite at most 3 people` with four rows.

Each array item must be an **object** (`{ email: '' }`), not a bare string. In RHF 7, an array of primitive values is not supported, so wrap each value in an object.

**Common mistake:** using the index as the key.

```jsx
// Wrong: after removing the first row, React reuses the first DOM input for the next row
{fields.map((field, index) => <li key={index}>...</li>)}

// Right
{fields.map((field, index) => <li key={field.id}>...</li>)}
```

Why: keys must identify the row, not its position (see [Conditional rendering and lists](../01-basics/06-conditional-rendering-and-lists.md)).

## 13. Async validation: "is this username free?"

Some checks need the server. Put them in the schema as an **async refinement**. `zodResolver` already runs the schema with `parseAsync`, so async rules just work.

```js
// api.js (a fake server call, so the example runs without a backend)
const taken = new Set(['ada', 'admin'])

export async function isUsernameFree(name) {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return !taken.has(name.toLowerCase())
}
```

```jsx
// Username.jsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isUsernameFree } from './api.js'
import { TextField } from './TextField.jsx'

const schema = z.object({
  username: z
    .string()
    .min(3, { error: 'Use at least 3 characters', abort: true })
    .refine((name) => isUsernameFree(name), { error: 'That username is taken' }),
})

export default function UsernameForm({ onSave }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValidating },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onBlur', // check when the user leaves the field, not on every key
    defaultValues: { username: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate>
      <TextField label="Username" error={errors.username?.message} {...register('username')} />
      {isValidating && <p role="status">Checking...</p>}
      <button type="submit">Save</button>
    </form>
  )
}
```

**What happens, step by step (we counted the calls to `isUsernameFree`):**
1. The user types `ab`. With `mode: 'onBlur'` nothing is checked while typing: 0 calls.
2. They leave the field. The `min(3)` rule fails and shows `Use at least 3 characters`. Because of `abort: true`, Zod stops there and the server check is **not run**: still 0 calls.
3. They change it to `ada` and leave the field. `isValidating` is `true`, so `Checking...` shows. The server answers "taken", and the error is `That username is taken` (1 call).
4. They change it to `grace` and leave the field. The check passes (2 calls in total) and the error disappears.
5. On submit, RHF runs the whole schema again, so the check runs once more. We typed `grace`, left the field and clicked Save: `isUsernameFree` had 2 calls, and `onSave` received `{ username: 'grace' }`. That is a good last safety net.

Rules for async checks:

- **Do not check on every key.** Use `mode: 'onBlur'` (or `onTouched`), or debounce. See [Forms](../01-basics/07-forms.md) for a debounce hook.
- **Use `abort: true` on the cheap rule before the costly one.** Without it, Zod runs the async check even for a value that already failed `min(3)`. We saw 1 call for `ab` without `abort` and 0 with it.
- **Still check on the server when you save.** Another user can take the name between your check and your submit. If the save fails, show the answer with `setError` (section 10).
- **Without a resolver**, the built-in way is `register('username', { validate: async (value) => (await isUsernameFree(value)) || 'That username is taken' })`.

**Common mistake:** a slow check in `onChange` mode.

```jsx
// Wrong: one server call per key press
useForm({ resolver: zodResolver(schema), mode: 'onChange' })

// Right: check when the user leaves the field
useForm({ resolver: zodResolver(schema), mode: 'onBlur' })
```

Why: a request on every key wastes the server and shows answers for text the user has already changed.

## 14. Multi-step forms with shared state

A wizard splits one long form into steps. The key question is: **where does the data live between steps?** The simplest answer is one `useForm` above all the steps. Each step is a component that reads the shared form with `useFormContext`, and a `step` number in `useState` decides which one is shown.

```jsx
// Wizard.jsx
import { useState } from 'react'
import { FormProvider, useForm, useFormContext } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextField } from './TextField.jsx'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.email('Enter a valid email address'),
  plan: z.enum(['free', 'pro'], { error: 'Pick a plan' }),
})

const steps = [
  { title: 'About you', fields: ['name', 'email'] },
  { title: 'Your plan', fields: ['plan'] },
]

function AboutStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext()
  return (
    <>
      <TextField label="Name" error={errors.name?.message} {...register('name')} />
      <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
    </>
  )
}

function PlanStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext()
  return (
    <fieldset>
      <legend>Choose a plan</legend>
      <label>
        <input type="radio" value="free" {...register('plan')} /> Free
      </label>
      <label>
        <input type="radio" value="pro" {...register('plan')} /> Pro
      </label>
      {errors.plan && <p role="alert">{errors.plan.message}</p>}
    </fieldset>
  )
}

export default function Wizard({ onFinish }) {
  const [step, setStep] = useState(0)
  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', plan: '' },
  })
  const isLast = step === steps.length - 1

  async function next() {
    const ok = await methods.trigger(steps[step].fields) // validate this step only
    if (ok) setStep(step + 1)
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onFinish)} noValidate>
        <h2>
          Step {step + 1} of {steps.length}: {steps[step].title}
        </h2>

        {step === 0 && <AboutStep />}
        {step === 1 && <PlanStep />}

        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        {isLast ? (
          <button key="finish" type="submit">
            Finish
          </button>
        ) : (
          <button key="next" type="button" onClick={next}>
            Next
          </button>
        )}
      </form>
    </FormProvider>
  )
}
```

**What happens, step by step (we ran the whole path):**
1. `FormProvider` shares the form methods with every component below it. `useFormContext()` in a step returns the same `register` and `formState`. One schema describes all steps.
2. On step 1 the user clicks Next with empty fields. `trigger(['name', 'email'])` validates **only those two fields**. It returns `false` and shows `Name is required` and `Enter a valid email address`. The step does not change. (We checked that only `name` got an error when we triggered only `name`.)
3. The user fills both and clicks Next. `trigger` returns `true`, so `setStep(1)` shows step 2. No alerts are on screen when it opens.
4. On step 2 the user clicks Finish without a plan. The submit runs the **whole** schema. `Pick a plan` shows and `onFinish` is not called.
5. The user clicks Back. Step 1 returns with `Ada` and `ada@example.com` still typed. By default RHF keeps the values of fields that have unmounted, so a step you leave does not lose its data.
6. The user goes forward again, picks Pro and clicks Finish. `onFinish` receives `{ "name": "Ada", "email": "ada@example.com", "plan": "pro" }`.

Notes:

- The two buttons have different `key`s, so React treats them as two separate buttons: one that only changes the step, and one that submits.
- Do **not** set `shouldUnregister: true` on a wizard. We tried it: after going from step 1 to step 2 and finishing, the data was only `{ "plan": "pro" }`. The name was gone, because its input had unmounted.
- Call `trigger()` with the step's field names, not with no arguments. With no arguments it validates every field, including steps the user has not seen yet.

**Another design:** give each step its own small form with its own schema, and keep the combined data in a parent (`useState`, a reducer, context or a store; see [State management](./06-state-management.md)). Each step's submit merges its data into the parent and moves on. This fits when steps are separate routes, when steps are very different, or when later steps depend on server answers. The cost is more wiring and one more place for state. For the exercise version, see the [multi-step form exercise](../practice-app/exercises/react/20-multi-step-form/README.md).

**Common mistake:** validating the whole form on Next.

```jsx
// Wrong: shows errors for fields on steps the user has not reached
const ok = await methods.trigger()

// Right: only this step's fields
const ok = await methods.trigger(steps[step].fields)
```

Why: the user should only see problems with the step in front of them.

## 15. File upload basics

The [Forms lesson](../01-basics/07-forms.md) explained that a file input is always uncontrolled and that you send files with `FormData`. With RHF there is one more detail. If you use `register` on a file input, RHF gives you the browser's `FileList` (and options like `setValueAs` are not applied to file inputs). It is easier to keep a single `File` in the form. Use `Controller` and call `onChange` with `files[0]`, and validate it with Zod's `z.file()`:

```jsx
// Avatar.jsx
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextField } from './TextField.jsx'

const schema = z.object({
  avatar: z
    .file('Choose a file')
    .max(1_000_000, 'The file must be 1 MB or smaller')
    .mime(['image/png', 'image/jpeg'], 'Use a PNG or JPEG image'),
})

export default function AvatarForm() {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  async function onValid({ avatar }) {
    const body = new FormData()
    body.append('avatar', avatar)
    // Do not set a Content-Type header: the browser adds it, with the boundary.
    await fetch('/api/avatar', { method: 'POST', body })
  }

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <Controller
        name="avatar"
        control={control}
        render={({ field: { name, ref, onBlur, onChange }, fieldState }) => (
          <TextField
            label="Avatar"
            type="file"
            accept="image/png,image/jpeg"
            name={name}
            ref={ref}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.files?.[0])} // keep the File, not the FileList
            error={fieldState.error?.message}
          />
        )}
      />
      <button type="submit" disabled={isSubmitting}>
        Upload
      </button>
    </form>
  )
}
```

**What happens, step by step:**
1. We do not pass `value` to the file input (the browser forbids setting it). We only pass `name`, `ref`, `onBlur` and our own `onChange`.
2. When the user picks a file, `onChange(event.target.files?.[0])` stores the first `File` in the form. If they cancel the dialog, the value becomes `undefined`.
3. With no file, submit shows `Choose a file`. A 1,000,001-byte PNG shows `The file must be 1 MB or smaller`. A `.txt` file shows `Use a PNG or JPEG image`. All three appeared in our run.
4. With `me.png` (10 bytes), `onValid` runs. It builds a `FormData` with the file and calls `fetch` with `POST`. The request body was a `FormData` that held `me.png`, and we set no headers.

Remember: `accept` is only a hint for the file picker, `z.file()` checks in the browser, and **the server must check again**. `fetch` cannot report upload progress. For a progress bar use `XMLHttpRequest` (`upload.onprogress`) or a library.

**Common mistake:** setting the content type by hand.

```js
// Wrong: the boundary text is missing, so the server cannot read the parts
await fetch('/api/avatar', { method: 'POST', body, headers: { 'Content-Type': 'multipart/form-data' } })

// Right: let the browser set it
await fetch('/api/avatar', { method: 'POST', body })
```

Why: a multipart request needs a boundary that only the browser can generate.

## 16. React 19 form actions and useActionState

React 19 added **form actions**. You give a function to `<form action={fn}>`. React calls it with the form's `FormData` and tracks the pending state for you. `useActionState` keeps the result of the action as state. This is the style frameworks use (Next.js Server Actions, React Router actions). The full story is in [React 19 and newer](../04-advanced/04-react-19-and-newer.md). Here is the same idea with Zod and no form library:

```jsx
// Contact.jsx
import { useActionState } from 'react'
import { z } from 'zod'

// This schema can live in a shared file and also run on the server.
const contactSchema = z.object({
  email: z.email('Enter a valid email address'),
  message: z.string().trim().min(1, 'Write a message'),
})

const initialState = { status: 'idle', values: {}, errors: {} }

// An action gets the previous state and the FormData. It returns the next state.
export async function sendMessage(previousState, formData) {
  const values = Object.fromEntries(formData)
  const result = contactSchema.safeParse(values)

  if (!result.success) {
    return { status: 'invalid', values, errors: z.flattenError(result.error).fieldErrors }
  }

  await new Promise((resolve) => setTimeout(resolve, 100)) // pretend to call the server
  return { status: 'sent', values: {}, errors: {} }
}

export default function ContactForm() {
  const [state, formAction, isPending] = useActionState(sendMessage, initialState)

  return (
    <form action={formAction} noValidate>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        defaultValue={state.values.email}
        aria-invalid={state.errors.email ? 'true' : 'false'}
        aria-describedby={state.errors.email ? 'email-error' : undefined}
      />
      {state.errors.email && (
        <p id="email-error" role="alert">
          {state.errors.email[0]}
        </p>
      )}

      <label htmlFor="message">Message</label>
      <textarea
        id="message"
        name="message"
        defaultValue={state.values.message}
        aria-invalid={state.errors.message ? 'true' : 'false'}
        aria-describedby={state.errors.message ? 'message-error' : undefined}
      />
      {state.errors.message && (
        <p id="message-error" role="alert">
          {state.errors.message[0]}
        </p>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Sending...' : 'Send'}
      </button>
      {state.status === 'sent' && <p role="status">Thanks, we got your message.</p>}
    </form>
  )
}
```

**What happens, step by step:**
1. `useActionState(sendMessage, initialState)` returns the current `state`, a `formAction` to give to the form, and `isPending`.
2. The user types `nope` as the email, leaves the message empty and submits. React calls `sendMessage(previousState, formData)`.
3. The action turns the `FormData` into an object and runs `safeParse`. It fails, so the action returns `{ status: 'invalid', values, errors }`. That becomes the new `state`. The page shows `Enter a valid email address` and `Write a message`.
4. After an action, React **resets uncontrolled fields** to their `defaultValue`. That is why the action returns the typed `values` and the inputs use `defaultValue={state.values.email}`. We checked that `nope` was still in the email box after the failed submit.
5. The user fixes the fields and submits. While the action runs, `isPending` is `true`: the button says `Sending...` and is disabled.
6. The action returns `{ status: 'sent', values: {}, errors: {} }`. The thank-you text shows and both fields are empty, because the new default values are empty.

A button deeper in the form can read the pending state by itself with `useFormStatus`. It must be rendered inside the `<form>` (a sibling outside the form never sees it). The [React 19 lesson](../04-advanced/04-react-19-and-newer.md) covers it, together with `useOptimistic`.

Compare the two styles:

| | React Hook Form + Zod | `<form action>` + `useActionState` |
| --- | --- | --- |
| Where validation shows up | In the browser, as the user types or leaves a field | When the form is submitted (browser or server) |
| Pending state | `formState.isSubmitting` | `isPending` |
| Values after submit | They stay. You decide when to `reset` | Uncontrolled fields reset. Return the values to keep them |
| Dirty, touched, field arrays, per-field modes | Built in | You build them yourself |
| Works with server-only code and without JavaScript | No (client code) | Yes, in a framework (progressive enhancement) |

**Do actions replace form libraries?** No. Actions handle submitting, pending state and the result. They do not give you validation timing, dirty and touched tracking, or field arrays. Use plain actions for small and server-centred forms, especially in a framework. Use RHF when the form needs rich client behaviour. You can combine them: validate on the client with RHF, then call the action. There is no built-in integration, so you connect them yourself. Either way, run the **same Zod schema on the server**.

**Other libraries, one sentence each.** **Formik** is the older form library. It keeps values in React state, has had no release since November 2025 (2.4.9), and most new projects choose RHF. **TanStack Form** is a newer, headless and strongly typed library (1.0 came out in March 2025). Know their names for interviews, and be able to say why you picked RHF.

**Common mistake:** being surprised that the text vanished after the action.

```jsx
// Surprise: after a failed action the input is emptied
<input name="email" />

// Keep it: return the values from the action and use them as the default
<input name="email" defaultValue={state.values.email} />
```

Why: React resets uncontrolled fields after an action finishes.

## 17. Testing forms

Test a form the way a user uses it. Find fields by their **label**, buttons by their **role**, type with `userEvent`, and check what the user sees and what your `onSubmit` receives. Do not test React Hook Form itself.

```jsx
// Login.test.jsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import LoginForm from './Login.jsx'

test('shows an error for each empty field and does not call onLogin', async () => {
  const user = userEvent.setup()
  const onLogin = vi.fn()
  render(<LoginForm onLogin={onLogin} />)

  await user.click(screen.getByRole('button', { name: 'Log in' }))

  // Validation is async, so wait for the message with a findBy query.
  expect(await screen.findByText('Email is required')).toBeInTheDocument()
  expect(screen.getByText('Password is required')).toBeInTheDocument()
  expect(onLogin).not.toHaveBeenCalled()
})

test('calls onLogin with the typed values', async () => {
  const user = userEvent.setup()
  const onLogin = vi.fn()
  render(<LoginForm onLogin={onLogin} />)

  await user.type(screen.getByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Password'), 'correct horse')
  await user.click(screen.getByRole('button', { name: 'Log in' }))

  await waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1))
  expect(onLogin).toHaveBeenCalledWith(
    { email: 'ada@example.com', password: 'correct horse' },
    expect.anything(), // the second argument is the submit event
  )
})
```

**What happens, step by step:**
1. `getByLabelText('Email')` works only because the input has a real `<label>`. A test like this is also an accessibility check.
2. `userEvent.setup()` creates a user. `await user.type(...)` and `await user.click(...)` act like a real person: focus, key presses, blur.
3. RHF validates **asynchronously**, so the error appears a moment after the click. `findByText` waits for it. `waitFor` waits for the submit handler.
4. The second test checks the object that `onLogin` received. `handleSubmit` passes the event as a second argument, so the test accepts it with `expect.anything()`.
5. Fake the server with `vi.fn()`. Never call a real network in a unit test. To test a pending request, return a promise you resolve yourself (practice item 11).

All of these tests passed in the practice app, which loads `@testing-library/jest-dom` in its setup file (that is where `toBeInTheDocument` comes from). Test files live next to the component. See [Testing React](../04-advanced/08-testing-react.md) for more.

Two tips: in a test for a file input, use `user.upload(input, file)`. By default `user-event` ignores files that do not match the `accept` attribute, so to test your own "wrong type" message create the user with `userEvent.setup({ applyAccept: false })`.

**Common mistake:** checking for the error without waiting.

```jsx
// Wrong: fireEvent does not wait for async validation, so the error is not there yet
fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
expect(screen.getByText('Email is required')).toBeInTheDocument()

// Right
await user.click(screen.getByRole('button', { name: 'Log in' }))
expect(await screen.findByText('Email is required')).toBeInTheDocument()
```

Why: with `fireEvent.click`, the query ran before the error existed (it found nothing in our run). `findBy` retries until the element shows up.

## How interviewers test this
- **Why a form library, and why RHF is fast.** A strong answer says: inputs are uncontrolled, values live in the DOM and are read through refs, and `formState` is a subscription, so typing does not re-render the form. It also names the honest limit (small forms do not notice).
- **`register` versus `Controller`.** They want to hear which one you use for native inputs and which for custom components, and why you never give one input two owners.
- **Schema validation.** `zodResolver`, what the submit handler receives (the parsed output), `safeParse` versus `parse`, `z.infer`, and running the same schema on the server. A red flag is "client validation is enough".
- **Server errors and submit state.** `setError`, `root` errors, `isSubmitting` with an async handler, and a real answer to double submit.
- **Dynamic and multi-step forms.** `useFieldArray` with `field.id` as the key, and `trigger` per step with shared state.
- **Accessibility and tests.** Labels, `aria-invalid`, `aria-describedby`, `role="alert"`, focus on the first error, and tests that use labels and roles. Red flags: placeholder-only inputs, errors that are only red text, `getByTestId` for everything.

## Interview questions and model answers

### Q1. Why is React Hook Form fast? (Medium)
RHF keeps field values in the DOM instead of in React state. `register` gives each input a `ref`, so RHF reads the value only when it needs it: on submit, on blur or when validating. Typing does not call `setState`, so the form does not re-render on each keystroke. RHF also re-renders only for the parts of `formState` that you read during render, and `useWatch` and `Controller` keep re-renders local to the component that needs them. In our test, typing three letters re-rendered a hand-written controlled form 3 times and an RHF form 0 times. For a small form the user will not notice. The lasting benefits are less code and built-in dirty, touched, reset and validation.

### Q2. Controlled vs uncontrolled with RHF: when do you use `register` and when `Controller`? (Medium)
RHF is uncontrolled by default. `register('email')` returns `name`, `onChange`, `onBlur` and `ref`, and RHF reads `input.value` through the ref. That works for native inputs (text, checkbox, radio, select). Custom components, such as a UI-library select, a date picker or a star rating, often expose only `value` and `onChange` and no DOM input. For those use `Controller` or `useController`. It holds the value and passes `field.value` and `field.onChange` to your component, and re-renders only that field. Do not use both on one field, and do not keep your own `useState` copy next to RHF.

```jsx
<Controller name="rating" control={control} render={({ field }) => <StarRating {...field} />} />
```

### Q3. How do you validate a form with a schema? (Medium)
Describe the data with a Zod schema, then pass `resolver: zodResolver(schema)` to `useForm`. On submit RHF gives the raw values (all text) to the resolver. The resolver runs the schema, turns each issue into `errors.fieldName.message`, and on success `handleSubmit` calls your function with the **parsed output**, so `z.coerce.number()` gives you a real number and `.trim()` gives you trimmed text. Do not also put `required` or `minLength` in `register`, because a resolver makes RHF ignore them. The benefits are one place for rules, types with `z.infer`, and the same schema running on the server.

### Q4. How do you show server errors in an RHF form? (Medium)
Make the submit handler `async`, wrap the request in `try/catch`, and use `setError`. For a field message: `setError('email', { type: 'server', message }, { shouldFocus: true })`. For a message that belongs to the whole form: `setError('root.serverError', { message })`. Read it from `errors.root?.serverError`. A field error disappears when the user edits that field (RHF re-validates it). A `root` error is cleared by the next submit. Disable the button with `isSubmitting`, which is true while the handler's promise is pending, so the handler must return or await the promise.

### Q5. How do you build dynamic fields, such as add and remove rows? (Medium)
Use `useFieldArray({ control, name: 'items' })`. It returns `fields` plus `append`, `remove`, `insert`, `move`, `swap`, `update` and `replace`. Render `fields.map((field, index) => ...)` with `key={field.id}` (the id RHF generates, not the index), and register each input with `items.${index}.name`. Give `defaultValues` an array of objects. Errors for a row are at `errors.items[index].name` and errors for the list itself (for example `.min(1)`) are at `errors.items.root`. The submitted data has the rows without the generated `id`.

### Q6. How do you test a form built with RHF? (Medium)
Test behaviour, as a user. Render the component, find fields with `getByLabelText` and buttons with `getByRole`, type and click with `userEvent`, and check what is on screen and what the submit callback received. Validation is async, so wait with `findBy...` or `waitFor` instead of checking at once. Replace the server call with `vi.fn()` (return a promise you control to test the pending state). Check accessibility details too, such as `aria-invalid` and focus on the first bad field. Do not test RHF's internals.

### Q7. What is the difference between `watch`, `useWatch` and `getValues`? (Medium)
`getValues()` reads the current values once and subscribes to nothing, so use it in event handlers. `watch('name')` subscribes the component that called `useForm`, so that whole form component re-renders when the field changes. `useWatch({ control, name })` subscribes only the component that calls it. In our test, watching in the form re-rendered the form 3 times for 3 letters, while `useWatch` in a child re-rendered only the child. Prefer `useWatch` in a small child component when only a part of the screen depends on a field.

### Q8. How do you make form errors accessible? (Medium)
Give every input a real `<label>` (`htmlFor` and `id`). On an invalid field set `aria-invalid="true"` and `aria-describedby` pointing at the error element's `id`, and give the message `role="alert"` so it is announced. Move focus to the first invalid field after a failed submit (RHF does this by default if it has the field's `ref`). Do not rely on colour alone, and do not use a placeholder as a label. Wrap this in one reusable `TextField` component so that every field is accessible by default.

### Q9. React Hook Form vs Formik vs TanStack Form? (Easy)
RHF uses uncontrolled inputs and refs, is small, and is the most common choice for new React projects. Formik keeps values in React state; it is older, its latest release is 2.4.9 from November 2025, and there is no official deprecation notice, but most new projects pick RHF. TanStack Form is newer (1.0 in March 2025), headless and strongly typed. All three can use a schema library for validation. For an interview, say what you would pick and why, and be ready to explain the model of the one you use.

### Q10. What are the validation modes, and which would you choose? (Easy)
`mode` decides when a field is first checked: `onSubmit` (default), `onBlur`, `onChange`, `onTouched` or `all`. After the first submit, `reValidateMode` (default `onChange`) re-checks fields on each change. I usually pick `onTouched`: check when the user leaves the field, then re-check on every change, so errors show late and go away early. I use `onChange` only for instant hints and avoid it for slow async checks.

### Q11. What is the difference between `parse` and `safeParse`, and why validate on the server too? (Easy)
`parse` returns the data or throws a `ZodError`. `safeParse` never throws; it returns `{ success: true, data }` or `{ success: false, error }`, which is better for user input where invalid data is normal. Client validation is only for the user's comfort, because anyone can skip it with dev tools or a script. The server must run the same schema (`accountSchema.safeParse(body)`) and answer with field errors that the form shows with `setError`. Sharing one schema file keeps both sides in step, and `z.infer` gives TypeScript types from it.

### Q12. How do you prevent a double submit? (Easy)
Show a pending state and block repeats. Make the handler `async` so `formState.isSubmitting` is true while the request runs, then disable the button with it. The button alone is not enough: RHF still called our handler a second time when a second `submit` event arrived while the first request was pending. So also ignore the submit while `isSubmitting` is true (`if (isSubmitting) return`), and for payments or orders make the server idempotent, for example with an idempotency key.

### Q13. How would you build a multi-step form? (Medium)
Keep one `useForm` above all steps with one schema, share it through `FormProvider` and `useFormContext`, and keep a `step` number in state. On Next, call `trigger(stepFields)` and move on only if it returns true, so only the current step's fields are validated. On the last step, `handleSubmit` runs the full schema. Keep the default `shouldUnregister: false`, so values from steps that have unmounted stay in the form. For steps that are separate routes or very different, give each step its own form and schema and merge the results in a parent.

### Q14. How would you check "is this username available" while the user types? (Hard)
Put the check in the schema as an async `refine`, or in `register` as an async `validate`. Do not run it on every key: use `mode: 'onBlur'` or debounce. Put the cheap rules first with `abort: true`, so the server is not called for a name that is too short. Show `isValidating` as "Checking...". Keep in mind the answer can be out of date by the time the user submits, so the server must enforce uniqueness again and the form must be able to show that error with `setError`.

### Q15. Do React 19 form actions replace form libraries? (Hard)
No. `<form action={fn}>` and `useActionState` solve submitting: you get `FormData`, a pending flag, the result state, progressive enhancement, and a direct fit with server functions in a framework. They do not solve validation timing (blur, touched), dirty tracking, field arrays or typed form values, and after an action React resets uncontrolled fields. Use actions for small or server-centred forms. Use RHF when you need rich client-side behaviour. You can combine them, but there is no built-in integration. In both cases validate again on the server with the same schema.

## Common mistakes and gotchas
- **Giving one input two owners** (`register` plus `value`/`onChange` state): use only `register`, or only `Controller`.
- **`onSubmit={() => handleSubmit(fn)}`:** the handler is created and never run. Write `onSubmit={handleSubmit(fn)}`.
- **Reading `formState` only inside handlers:** it is not tracked. Destructure it while rendering.
- **Passing late server data as `defaultValues`:** they are cached on first render. Use `values` or `reset(data)`.
- **Missing `defaultValues`:** fields start as `undefined` and dirty tracking is wrong. Give every field a start value.
- **Rules in `register` plus a resolver:** the `register` rules are ignored. Put every rule in the schema.
- **`z.string()` for required text:** `''` is valid. Use `.trim().min(1, 'Required')`.
- **`z.coerce.number()` on an empty input:** `''` becomes `0`. Add a `.min(...)`, or use `valueAsNumber` with `z.number()`.
- **Zod 3 spelling from old tutorials** (`z.string().email()`, `{ message }`, `error.flatten()`): use `z.email()`, `{ error }`, `z.flattenError()`.
- **Showing default Zod messages:** `Invalid input: expected string, received undefined` helps nobody. Write every message.
- **An error that is not linked to its field:** add `aria-invalid`, `aria-describedby` and `role="alert"`. Use one `TextField` component.
- **A custom component without the `ref`:** RHF cannot focus it on error. Pass `field.ref` (or the register `ref`) to a real element.
- **Hidden fields still in the data:** RHF keeps unmounted values. Use `shouldUnregister` (not on wizards), `unregister`, or clean the data.
- **`key={index}` in `useFieldArray`:** use `field.id`.
- **A handler that does not return its promise:** `isSubmitting` is `false` at once. Use `async`/`await`.
- **Not catching errors in the submit handler:** a throw becomes an unhandled rejection. Use `try/catch` and `setError('root.serverError', ...)`.
- **Trusting the disabled button against double submit:** also ignore submits while `isSubmitting`, and make the server idempotent.
- **Async checks on every key (`mode: 'onChange'`):** use `onBlur` and `abort: true` on the cheap rule before the costly one.
- **`trigger()` with no arguments on a wizard step:** it shows errors for later steps. Pass the step's field names.
- **`shouldUnregister: true` on a wizard:** values of earlier steps are lost.
- **Setting `Content-Type: multipart/form-data` by hand:** the boundary is lost. Let the browser set it.
- **Testing with `fireEvent` and an immediate `getBy`:** async validation has not finished. Use `await user.click` and `findBy`.
- **Treating React Hook Form 8 as current:** 7.x is the stable line. 8 is still in beta.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Explain: what does `{...register('email')}` put on the input? Why is there no `value` prop and no `useState`?

<details>
<summary>Show answer</summary>

It puts four props on the input: `name`, `onChange`, `onBlur` and `ref` (we printed the keys: `name,onChange,onBlur,ref`). The `ref` gives RHF the real DOM element, so RHF can read `input.value` whenever it needs it (on submit, on blur, when validating) and can call `focus()` on an invalid field. The input is **uncontrolled**: the browser keeps the text, so there is no `value`, no state, and typing does not re-render the form.

</details>

2. **(Easy)** Predict: what do the two `console.log` lines print?

```js
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  age: z.coerce.number().min(18, 'Adults only'),
})

const a = schema.safeParse({ name: ' Ada ', age: '30' })
const b = schema.safeParse({ name: '  ', age: '' })

console.log(a.success, a.data)
console.log(b.success, z.flattenError(b.error).fieldErrors)
```

<details>
<summary>Show answer</summary>

```text
true { name: 'Ada', age: 30 }
false { name: [ 'Name is required' ], age: [ 'Adults only' ] }
```

(We ran it.) In `a`, `.trim()` removes the spaces around `Ada`, and `z.coerce.number()` turns the text `'30'` into the number `30`, so `data` holds the cleaned values. In `b`, `'  '` trims to an empty string, which fails `min(1)`. The empty age is coerced to `0` (not an error by itself), and `0` fails `min(18)`, so you get `Adults only`, not a "required" message. `flattenError` groups the messages by field name.

</details>

3. **(Easy)** Code: build a `ContactForm` with React Hook Form. Fields: Email and Message (a textarea). Both are required, with the messages `Email is required` and `Message is required`. Show each message in a `role="alert"` element linked with `aria-describedby`, mark the field with `aria-invalid`, and disable the button and show `Sending...` while `onSend` is running.

<details>
<summary>Show answer</summary>

```jsx
import { useForm } from 'react-hook-form'

export function ContactForm({ onSend }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '', message: '' } })

  return (
    <form onSubmit={handleSubmit(onSend)} noValidate>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        aria-invalid={errors.email ? 'true' : 'false'}
        aria-describedby={errors.email ? 'email-error' : undefined}
        {...register('email', { required: 'Email is required' })}
      />
      {errors.email && (
        <p id="email-error" role="alert">
          {errors.email.message}
        </p>
      )}

      <label htmlFor="message">Message</label>
      <textarea
        id="message"
        aria-invalid={errors.message ? 'true' : 'false'}
        aria-describedby={errors.message ? 'message-error' : undefined}
        {...register('message', { required: 'Message is required' })}
      />
      {errors.message && (
        <p id="message-error" role="alert">
          {errors.message.message}
        </p>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send'}
      </button>
    </form>
  )
}
```

We ran it: an empty submit showed both messages, focus went to the Email input, and `aria-describedby` was `email-error`. After filling both fields and submitting, `onSend` received `{ email: 'a@b.co', message: 'Hi' }` and, while its promise was pending, the button read `Sending...` and was disabled. `isSubmitting` only works because `handleSubmit` waits for the promise that `onSend` returns.

</details>

4. **(Medium)** Predict: the user types `abc` into the Name box. After mount, how many more times does the form component render in version A, and how many more times do the form and `Preview` render in version B?

```jsx
import { useForm, useWatch } from 'react-hook-form'

// A
function FormA() {
  const { register, watch } = useForm({ defaultValues: { name: '' } })
  const name = watch('name')
  return (
    <form>
      <input aria-label="Name" {...register('name')} />
      <p>Hello {name}</p>
    </form>
  )
}

// B
function Preview({ control }) {
  const name = useWatch({ control, name: 'name' })
  return <p>Hello {name}</p>
}

function FormB() {
  const { register, control } = useForm({ defaultValues: { name: '' } })
  return (
    <form>
      <input aria-label="Name" {...register('name')} />
      <Preview control={control} />
    </form>
  )
}
```

<details>
<summary>Show answer</summary>

A: `FormA` renders **3 more times** (one per letter), because `watch` subscribes the component that called `useForm`.
B: `FormB` renders **0 more times**, and `Preview` renders **3 more times**, because `useWatch` subscribes only `Preview`. We counted this by running both. Use `useWatch` in a small child when only part of the screen depends on a field.

</details>

5. **(Medium)** Code: write a Zod schema and a form for **changing a password**. Fields: Current password (required), New password (at least 8 characters), Confirm new password. The confirmation must equal the new password (message `Passwords do not match`, shown under Confirm). The new password must differ from the current one (message `The new password must be different`, shown under New password). Use `zodResolver`.

<details>
<summary>Show answer</summary>

```jsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, 'Enter your current password'),
    next: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string(),
  })
  .refine((data) => data.next === data.confirm, {
    error: 'Passwords do not match',
    path: ['confirm'],
  })
  .refine((data) => data.next !== data.current, {
    error: 'The new password must be different',
    path: ['next'],
  })

export function ChangePasswordForm({ onChange }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current: '', next: '', confirm: '' },
  })

  return (
    <form onSubmit={handleSubmit(onChange)} noValidate>
      <label htmlFor="current">Current password</label>
      <input id="current" type="password" {...register('current')} />
      {errors.current && <p role="alert">{errors.current.message}</p>}

      <label htmlFor="next">New password</label>
      <input id="next" type="password" {...register('next')} />
      {errors.next && <p role="alert">{errors.next.message}</p>}

      <label htmlFor="confirm">Confirm new password</label>
      <input id="confirm" type="password" {...register('confirm')} />
      {errors.confirm && <p role="alert">{errors.confirm.message}</p>}

      <button type="submit">Change password</button>
    </form>
  )
}
```

Each `refine` uses `path` to put its message under the right field. Both refines ran in our test: a new password equal to the old one, with a different confirmation, showed `The new password must be different` and `Passwords do not match` together. A valid input gave `onChange` the object `{ current: 'oldpassword', next: 'brandnewpass', confirm: 'brandnewpass' }`. Side effect: with two empty fields, the "must be different" refine also fires (empty equals empty). You can hide that by returning true when `data.next === ''`.

</details>

6. **(Medium)** Explain: a teammate wrote the code below. Submitting an empty form calls `onValid` and shows no error. Why, and what is the fix?

```jsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

function NameForm({ onValid }) {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(z.object({ name: z.string() })),
    defaultValues: { name: '' },
  })

  return (
    <form onSubmit={handleSubmit(onValid)}>
      <input aria-label="Name" {...register('name', { required: 'Name is required' })} />
      <button>Go</button>
    </form>
  )
}
```

<details>
<summary>Show answer</summary>

When a `resolver` is set, RHF asks the resolver to validate and **ignores the rules passed to `register`**. The schema says `name: z.string()`, and `''` is a valid string, so the form is valid and `onValid` runs (we ran it: 1 call, 0 alerts). Fix: put the rule in the schema and remove it from `register`: `name: z.string().trim().min(1, 'Name is required')`.

</details>

7. **(Medium)** Code: build an `OrderForm` with `useFieldArray`. Each line has an Item (required text) and a Quantity (a whole number of at least 1). The user can add and remove lines, at least one line is required, and a live text shows `Total items: N` (the sum of the quantities) without re-rendering the whole form for each key.

<details>
<summary>Show answer</summary>

```jsx
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const orderSchema = z.object({
  lines: z
    .array(
      z.object({
        item: z.string().trim().min(1, 'Item is required'),
        qty: z.coerce.number().int('Whole numbers only').min(1, 'At least 1'),
      }),
    )
    .min(1, 'Add at least one line'),
})

function Total({ control }) {
  const lines = useWatch({ control, name: 'lines' })
  const total = lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0)
  return <p>Total items: {total}</p>
}

export function OrderForm({ onOrder }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: { lines: [{ item: '', qty: 1 }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  return (
    <form onSubmit={handleSubmit(onOrder)} noValidate>
      {fields.map((field, index) => (
        <fieldset key={field.id}>
          <legend>Line {index + 1}</legend>
          <label htmlFor={`item-${field.id}`}>Item {index + 1}</label>
          <input id={`item-${field.id}`} {...register(`lines.${index}.item`)} />
          {errors.lines?.[index]?.item && <p role="alert">{errors.lines[index].item.message}</p>}

          <label htmlFor={`qty-${field.id}`}>Quantity {index + 1}</label>
          <input id={`qty-${field.id}`} type="number" {...register(`lines.${index}.qty`)} />
          {errors.lines?.[index]?.qty && <p role="alert">{errors.lines[index].qty.message}</p>}

          <button type="button" onClick={() => remove(index)}>
            Remove line {index + 1}
          </button>
        </fieldset>
      ))}
      {errors.lines?.root && <p role="alert">{errors.lines.root.message}</p>}

      <button type="button" onClick={() => append({ item: '', qty: 1 })}>
        Add line
      </button>
      <Total control={control} />
      <button type="submit">Place order</button>
    </form>
  )
}
```

We ran it. The total started at `Total items: 1`. After typing Pen with quantity 3 and adding Book with quantity 2 it read `Total items: 5`. Removing line 1 changed it to `Total items: 2`, and submit gave `{ lines: [{ item: 'Book', qty: 2 }] }` (the quantity is a number because of `z.coerce`). With every line removed, submit showed `Add at least one line`. `Total` uses `useWatch`, so only that small component re-renders when a quantity changes.

</details>

8. **(Medium)** Explain: a form shows a Coupon input only when "I have a coupon" is ticked. A user ticks the box, types `SAVE10`, unticks the box and submits. The request still contains `coupon: "SAVE10"`. Why does that happen, and what are three ways to fix it?

<details>
<summary>Show answer</summary>

By default (`shouldUnregister: false`) RHF keeps the value of a field after its input is removed from the screen, so the value survives if the field is shown again. The submitted data was `{ "hasCoupon": false, "coupon": "SAVE10" }` in our run.

Fixes:
- `useForm({ shouldUnregister: true })`: unmounted fields are dropped (we got `{ "hasCoupon": false }`). It applies to all fields, so do not use it on multi-step forms.
- Call `unregister('coupon')` when the box is unticked (for example from the checkbox's `register` option `onChange`). We got `{ "hasCoupon": false }` too.
- Clean the data before sending: `data.hasCoupon ? data : { ...data, coupon: undefined }`.

</details>

9. **(Medium)** Predict: a form uses `mode: 'onBlur'` with an email rule. The user types `ada`, presses Tab, comes back and types `@x.io` (now valid). When does the error appear, and when does it disappear? What changes with `mode: 'onTouched'`?

<details>
<summary>Show answer</summary>

With `onBlur`: no error while typing `ada`; the error **appears when the user presses Tab** (blur). While typing `@x.io` the error is **still shown**, and it disappears only when the field is left again (blur re-validates it). With `onTouched`: also no error while typing and the error appears on blur, but after that the field is re-checked on every change, so the error disappears **as soon as `@x.io` makes the value valid**. We ran both. (After a submit, every mode re-checks on change.)

</details>

10. **(Hard)** Code: build a `DynamicForm` component that renders a form from a config array. Each config item is like `{ name: 'age', label: 'Age', type: 'number', min: 18 }`, and may have `required`, `min` and `maxLength`; `type` can be `text`, `email`, `number` or `textarea`. Use RHF's built-in rules (no resolver) with these messages: `{label} is required`, `{label} must be at least {min}`, `{label} must be at most {maxLength} characters`. A number field must submit a number. Show accessible errors.

<details>
<summary>Show answer</summary>

```jsx
import { useForm } from 'react-hook-form'

function rulesFor(field) {
  const rules = {}
  if (field.required) rules.required = `${field.label} is required`
  if (field.min !== undefined) {
    rules.min = { value: field.min, message: `${field.label} must be at least ${field.min}` }
  }
  if (field.maxLength) {
    rules.maxLength = {
      value: field.maxLength,
      message: `${field.label} must be at most ${field.maxLength} characters`,
    }
  }
  if (field.type === 'number') rules.valueAsNumber = true
  return rules
}

export function DynamicForm({ fields, onSubmit }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {fields.map((field) => {
        const error = errors[field.name]?.message
        const props = {
          id: field.name,
          'aria-invalid': error ? 'true' : 'false',
          'aria-describedby': error ? `${field.name}-error` : undefined,
          ...register(field.name, rulesFor(field)),
        }
        return (
          <div key={field.name}>
            <label htmlFor={field.name}>{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea {...props} />
            ) : (
              <input type={field.type} {...props} />
            )}
            {error && (
              <p id={`${field.name}-error`} role="alert">
                {error}
              </p>
            )}
          </div>
        )
      })}
      <button type="submit">Submit</button>
    </form>
  )
}
```

The idea: one `rulesFor(config)` function turns each config item into RHF rules, and one `map` renders the fields. `valueAsNumber: true` makes a number field submit a number. We ran it with an email (required), an age (min 18) and a bio (max 10 characters): with an empty email, age `12` and a long bio we got `Email is required`, `Age must be at least 18` and `Bio must be at most 10 characters`. With valid input, `onSubmit` received `{ email: 'a@b.co', age: 20, bio: 'short' }`. Min and max rules are skipped for an empty optional field. One catch: an empty optional number field arrives as `NaN` (we got `age: null` after `JSON.stringify`), because of `valueAsNumber`. If your server wants `undefined` there, convert it in the submit handler. For a bigger version see the [dynamic form builder exercise](../practice-app/exercises/react/30-dynamic-form-builder/README.md).

</details>

11. **(Hard)** Code: write two tests for `SignupWithServer` from section 10. (a) When `createAccount` resolves `{ ok: false, errors: { email: 'That email is already registered' } }`, the message shows, the Email input is focused and has `aria-invalid="true"`. (b) While the request is pending the button reads `Creating...` and is disabled, and after it resolves the button is enabled again and `createAccount` was called once.

<details>
<summary>Show answer</summary>

```jsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import SignupWithServer from './Server.jsx'

async function fillAndSubmit(user) {
  await user.type(screen.getByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Password'), 'longenough')
  await user.click(screen.getByRole('button', { name: 'Create account' }))
}

test('shows the server message under the email field and focuses it', async () => {
  const user = userEvent.setup()
  const createAccount = vi
    .fn()
    .mockResolvedValue({ ok: false, errors: { email: 'That email is already registered' } })
  render(<SignupWithServer createAccount={createAccount} />)

  await fillAndSubmit(user)

  expect(await screen.findByText('That email is already registered')).toBeInTheDocument()
  expect(screen.getByLabelText('Email')).toHaveFocus()
  expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
})

test('disables the button while the request is pending', async () => {
  const user = userEvent.setup()
  let finish
  const createAccount = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  render(<SignupWithServer createAccount={createAccount} />)

  await fillAndSubmit(user)

  expect(await screen.findByRole('button', { name: 'Creating...' })).toBeDisabled()

  await act(async () => finish({ ok: true }))

  expect(await screen.findByRole('button', { name: 'Create account' })).toBeEnabled()
  expect(createAccount).toHaveBeenCalledTimes(1)
})
```

Both tests passed in the practice app. The trick for (b) is a promise that the test resolves itself (`finish`), so the pending state lasts as long as the test needs. Wrap the resolve in `act` so React processes the state updates before the next assertion.

</details>

12. **(Hard)** Explain: you build a checkout form in a Next.js app. A teammate says "React 19 form actions mean we do not need React Hook Form any more". How do you answer, and how would you decide for this form (address, card holder, a repeatable list of gift messages, live total, server-side stock checks)?

<details>
<summary>Show answer</summary>

Actions and RHF solve different parts. `<form action>` with `useActionState` gives you submission, a pending flag, a result state, progressive enhancement and a direct call to a Server Action. It does not give you validation timing (touched, blur), dirty tracking, typed values or field arrays, and React resets uncontrolled fields after an action, so you must return the values to keep them.

For this form I would use **both ideas**: one Zod schema in a shared file; RHF with `zodResolver` on the client for the address fields, the repeatable gift messages (`useFieldArray`) and the live total (`useWatch`); and a Server Action for the final submit that runs the **same schema again** and checks stock. The action returns field errors that the client shows with `setError`. In a Server Action, always check authentication and validate the input, because it is a public endpoint. For a small newsletter box with one field I would use a plain action and no library. There is no built-in integration between RHF and actions, so connect them yourself: validate with `handleSubmit`, then call the action.

</details>

## Recap
- A form library removes the bookkeeping: values, errors, dirty, touched, submitting and reset. Use one when a form has many fields, shared rules or repeatable rows.
- RHF is **uncontrolled**: `register` gives `name`, `onChange`, `onBlur` and `ref`, values stay in the DOM, and only the `formState` parts you read during render cause re-renders.
- Use `defaultValues` always. Late data goes in `values` or `reset(data)`. `handleSubmit(fn)` gives `fn` the data, `isSubmitting` follows the promise it returns.
- Pick `mode` on purpose: `onTouched` is a friendly default. After the first submit every mode re-checks on change.
- Zod describes valid data once: `safeParse` never throws, `parse` throws, `z.infer` gives types. Forms need `.trim().min(1)`, `z.coerce.number()` (watch the empty input), `.refine` with `path`, and your own messages. Zod 4 spelling: `z.email()`, `{ error }`, `z.flattenError()`.
- `zodResolver` makes RHF validate with the schema and pass the **parsed output** to your handler. With a resolver, `register` rules are ignored. Run the same schema on the server and show its answers with `setError`.
- Accessible errors: a label, `aria-invalid`, `aria-describedby`, `role="alert"` and focus on the first invalid field (needs the `ref`). Wrap it in one `TextField`.
- `useWatch` for local reads, `Controller` for custom components, `useFieldArray` with `field.id` keys, `trigger(stepFields)` for wizards, and `shouldUnregister` only when you mean it.
- React 19 actions handle submitting, not validation UX. They complement RHF, they do not replace it. Test forms with labels, roles, `userEvent` and `findBy`.

## Where to go next
- Next lesson: [Error boundaries, portals and friends](./05-error-boundaries-portals-and-friends.md).
- Form state in the bigger picture (local, server, URL and global state): [State management](./06-state-management.md).
- The new hooks and Server Actions in depth: [React 19 and newer](../04-advanced/04-react-19-and-newer.md).
- Labels, ARIA and live regions: [Accessibility](../04-advanced/09-accessibility.md). Testing in depth: [Testing React](../04-advanced/08-testing-react.md).
- Practice in the app: [04 - Signup form with validation](../practice-app/exercises/react/04-signup-form-validation/README.md), [20 - Multi-step form](../practice-app/exercises/react/20-multi-step-form/README.md), [30 - Dynamic form builder](../practice-app/exercises/react/30-dynamic-form-builder/README.md).
- Interview rounds: Round 2, state, data and routing questions (planned) and the machine coding questions (easy (planned), medium (planned), hard (planned)).
