import { useId, useState } from 'react'

// Reference solution for exercise 04.
// Key ideas:
// - controlled inputs: one `values` object in state, one handler for all fields
// - validation is a PURE function (values in, errors out) that runs only on submit
// - errors live in their own state object; editing a field removes only its error
// - each error is role="alert" and linked to its input with aria-describedby
// - noValidate switches off the browser's own bubbles, so ours are the only ones

const EMPTY_VALUES = { name: '', email: '', password: '', confirm: '' }
const MIN_PASSWORD_LENGTH = 8
// Text, one "@", text, a dot, text. No spaces anywhere.
// (The browser already trims the ends of a type="email" value, so only inner spaces can reach us.)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Returns one message per invalid field. An empty object means "valid".
function validate(values) {
  const errors = {}

  if (values.name.trim() === '') {
    errors.name = 'Name is required'
  }
  if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = 'Enter a valid email address'
  }
  if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }
  if (values.confirm !== values.password) {
    errors.confirm = 'Passwords do not match'
  }

  return errors
}

// One labelled input with its optional error message. The four fields share
// the same markup, so we write it once.
function Field({ label, name, type = 'text', value, error, onChange }) {
  // useId gives every field its own unique id (safe even if the form is rendered twice).
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id}>{label}</label>
      <br />
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        // Only point at the error element while it exists in the page.
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert" style={{ color: 'crimson', margin: '4px 0 0' }}>
          {error}
        </p>
      )}
    </div>
  )
}

export default function App() {
  const [values, setValues] = useState(EMPTY_VALUES)
  const [errors, setErrors] = useState({})
  const [createdFor, setCreatedFor] = useState(null)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    // Editing a field clears ONLY that field's error. No re-validation yet.
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function handleSubmit(event) {
    // Without this the browser would reload the page.
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)
    setCreatedFor(null)

    if (Object.keys(nextErrors).length > 0) return

    setCreatedFor(values.name.trim())
    setValues(EMPTY_VALUES)
  }

  return (
    <div>
      <h2>Sign up</h2>

      <form onSubmit={handleSubmit} noValidate>
        <Field label="Name" name="name" value={values.name} error={errors.name} onChange={handleChange} />
        <Field
          label="Email"
          name="email"
          type="email"
          value={values.email}
          error={errors.email}
          onChange={handleChange}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          value={values.password}
          error={errors.password}
          onChange={handleChange}
        />
        <Field
          label="Confirm password"
          name="confirm"
          type="password"
          value={values.confirm}
          error={errors.confirm}
          onChange={handleChange}
        />

        <button type="submit">Create account</button>
      </form>

      {createdFor && <p role="status">Account created for {createdFor}</p>}
    </div>
  )
}
