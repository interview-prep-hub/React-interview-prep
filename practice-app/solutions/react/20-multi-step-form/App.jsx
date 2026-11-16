import { useId, useState } from 'react'

// Reference solution for exercise 20.
// Key ideas:
// - ONE state object (`values`) lives in the parent wizard. The steps are
//   plain controlled forms that unmount when you leave them, so going Back
//   (or jumping with Edit) never loses what the user typed.
// - validation is a PURE function per step: (stepIndex, values) -> errors.
//   Next runs it, and a step with any error is a step you cannot leave.
// - the whole wizard is ONE <form>: Enter in a field behaves like the main
//   button (Next, or Submit on the last step). Every other button inside the
//   form must be type="button", or it would submit the form too.
// - moving to another step clears the errors, and editing a field clears
//   only that field's error.

const noop = () => {}

const STEP_TITLES = ['Account', 'Profile', 'Review']
const LAST_STEP = STEP_TITLES.length - 1

const INITIAL_VALUES = { email: '', password: '', fullName: '', age: '' }

const MIN_PASSWORD_LENGTH = 8
const MIN_AGE = 18
const MAX_AGE = 120
// Text, one "@", text, a dot, text. No spaces anywhere.
// (The browser already trims the ends of a type="email" value, so only inner spaces can reach us.)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DIGITS_ONLY = /^\d+$/

// One rule per field. A rule returns an error message, or '' when the value is fine.
const RULES = {
  email: ({ email }) => (EMAIL_PATTERN.test(email) ? '' : 'Enter a valid email address'),
  password: ({ password }) =>
    password.length >= MIN_PASSWORD_LENGTH
      ? ''
      : `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  fullName: ({ fullName }) => (fullName.trim() === '' ? 'Full name is required' : ''),
  age: ({ age }) => {
    const text = age.trim()
    const ok = DIGITS_ONLY.test(text) && Number(text) >= MIN_AGE && Number(text) <= MAX_AGE
    return ok ? '' : `Age must be a whole number from ${MIN_AGE} to ${MAX_AGE}`
  },
}

// Which fields each step owns. The Review step has no fields to check.
const STEP_FIELDS = [['email', 'password'], ['fullName', 'age'], []]

// Pure function: values in, errors out. An empty object means "this step is valid".
function validateStep(stepIndex, values) {
  const errors = {}
  for (const name of STEP_FIELDS[stepIndex]) {
    const message = RULES[name](values)
    if (message) errors[name] = message
  }
  return errors
}

// One labelled input with its optional error message. The four fields share
// the same markup, so we write it once.
function Field({ label, name, type = 'text', inputMode, autoComplete, value, error, onChange }) {
  // useId gives every field its own unique id.
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: 'block' }}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
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

// The steps hold NO state of their own. They get the values and a change
// handler from the wizard, so unmounting a step loses nothing.
function AccountStep({ values, errors, onChange }) {
  return (
    <>
      <h3>Account</h3>
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={values.email}
        error={errors.email}
        onChange={onChange}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={values.password}
        error={errors.password}
        onChange={onChange}
      />
    </>
  )
}

function ProfileStep({ values, errors, onChange }) {
  return (
    <>
      <h3>Profile</h3>
      <Field
        label="Full name"
        name="fullName"
        autoComplete="name"
        value={values.fullName}
        error={errors.fullName}
        onChange={onChange}
      />
      {/* type="text" on purpose: a type="number" input hides text that is not a number,
          so we could never show an error for it. */}
      <Field
        label="Age"
        name="age"
        inputMode="numeric"
        value={values.age}
        error={errors.age}
        onChange={onChange}
      />
    </>
  )
}

function ReviewStep({ values, onEdit }) {
  return (
    <>
      <h3>Review</h3>

      <dl>
        <dt>Email</dt>
        <dd data-testid="review-email">{values.email}</dd>
        <dt>Password</dt>
        {/* Never show a password in clear text: one asterisk per character. */}
        <dd data-testid="review-password">{'*'.repeat(values.password.length)}</dd>
      </dl>
      {/* type="button": these are not allowed to submit the form. */}
      <button type="button" onClick={() => onEdit(0)}>
        Edit account
      </button>

      <dl>
        <dt>Full name</dt>
        <dd data-testid="review-fullName">{values.fullName}</dd>
        <dt>Age</dt>
        <dd data-testid="review-age">{values.age}</dd>
      </dl>
      <button type="button" onClick={() => onEdit(1)}>
        Edit profile
      </button>
    </>
  )
}

export default function App({ onSubmit = noop }) {
  // ONE object for all the form data. Steps come and go, this stays.
  const [values, setValues] = useState(INITIAL_VALUES)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})
  // null while the user is still filling the form, the name after Submit.
  const [doneName, setDoneName] = useState(null)

  // Every move between steps starts with a clean slate of errors.
  function goTo(nextStep) {
    setStep(nextStep)
    setErrors({})
  }

  // One handler for every input: the `name` attribute is the key in `values`.
  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    // Editing a field clears ONLY that field's error. No re-validation yet.
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  // Next and Submit are the same <form> submit, so Enter works for free.
  function handleSubmit(event) {
    // Without this the browser would reload the page.
    event.preventDefault()

    if (step === LAST_STEP) {
      // A side effect like this belongs in the event handler, never inside a state
      // updater function (StrictMode runs updaters twice). Hand out a copy, so the
      // parent can never mutate our state object.
      onSubmit({ ...values })
      setDoneName(values.fullName.trim())
      return
    }

    const stepErrors = validateStep(step, values)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    goTo(step + 1)
  }

  if (doneName !== null) {
    return (
      <div>
        <h2>Sign up</h2>
        <p role="status">All done, {doneName}!</p>
      </div>
    )
  }

  return (
    <div>
      <h2>Sign up</h2>
      <p data-testid="progress">
        Step {step + 1} of {STEP_TITLES.length}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {step === 0 && <AccountStep values={values} errors={errors} onChange={handleChange} />}
        {step === 1 && <ProfileStep values={values} errors={errors} onChange={handleChange} />}
        {step === LAST_STEP && <ReviewStep values={values} onEdit={goTo} />}

        <div style={{ marginTop: 16 }}>
          {step > 0 && (
            <button type="button" onClick={() => goTo(step - 1)}>
              Back
            </button>
          )}{' '}
          <button type="submit">{step === LAST_STEP ? 'Submit' : 'Next'}</button>
        </div>
      </form>
    </div>
  )
}
