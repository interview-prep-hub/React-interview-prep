import { useId, useState } from 'react'

// Reference solution for exercise 30.
// Key ideas:
// - The schema is plain data. This component never mentions a field by name.
// - State holds the RAW input values (strings, and booleans for checkboxes).
//   One function, toTypedValue, turns a raw value into the value we compare,
//   validate and submit (a number, trimmed text, ...). Everything uses it.
// - Visibility is DERIVED from the values on every render. Hidden fields are
//   filtered out, so they are not rendered, not validated and not submitted.
// - A lookup object maps each field type to a small component (composition).

// ---------- pure helpers (no React in here) ----------

function emptyRawValue(field) {
  return field.type === 'checkbox' ? false : ''
}

function initialValues(schema) {
  return Object.fromEntries(schema.map((field) => [field.name, emptyRawValue(field)]))
}

// raw value (what the input holds) -> typed value (what we validate and submit)
function toTypedValue(field, raw) {
  switch (field.type) {
    case 'number': {
      const n = Number(raw)
      return raw === '' || Number.isNaN(n) ? null : n
    }
    case 'text':
      return raw.trim()
    default:
      // select (a string) and checkbox (a boolean) are already fine
      return raw
  }
}

// Careful: 0 is a real number, so we must not use a "falsy" check here.
function isEmpty(typed) {
  return typed === '' || typed === null || typed === false
}

// Returns an error message, or null when the value is fine.
// Only the FIRST broken rule is reported.
function validateField(field, typed) {
  if (isEmpty(typed)) {
    return field.required ? `${field.label} is required` : null
  }

  if (field.type === 'number') {
    if (field.min !== undefined && typed < field.min) {
      return `${field.label} must be at least ${field.min}`
    }
    if (field.max !== undefined && typed > field.max) {
      return `${field.label} must be at most ${field.max}`
    }
  }

  if (field.type === 'text') {
    if (field.minLength !== undefined && typed.length < field.minLength) {
      return `${field.label} must be at least ${field.minLength} characters`
    }
    if (field.pattern !== undefined && !new RegExp(field.pattern).test(typed)) {
      return field.patternMessage ?? `${field.label} is invalid`
    }
  }

  return null
}

// A field is visible when it has no showIf, or when its controlling field is
// visible itself AND has the expected typed value. Checking the controller's
// own visibility makes chains work (A shows B, B shows C).
// (A showIf loop, A depends on B and B on A, is a schema bug and not handled.)
function isVisible(field, schema, values) {
  if (!field.showIf) return true
  const controller = schema.find((f) => f.name === field.showIf.field)
  if (!controller || !isVisible(controller, schema, values)) return false
  return toTypedValue(controller, values[controller.name]) === field.showIf.equals
}

function getVisibleFields(schema, values) {
  return schema.filter((field) => isVisible(field, schema, values))
}

// ---------- field components: one small component per type ----------

// Shared accessibility wiring: an id for the label and one for the error text.
function useFieldIds(field, error) {
  const id = useId()
  const errorId = `${id}-error`
  const controlProps = {
    id,
    name: field.name,
    'aria-required': field.required ? true : undefined,
    'aria-invalid': error ? true : undefined,
    // Only point at the error element while it exists in the page.
    'aria-describedby': error ? errorId : undefined,
  }
  return { id, errorId, controlProps }
}

function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} role="alert" style={{ color: 'crimson', margin: '4px 0 0' }}>
      {message}
    </p>
  )
}

// Every field component receives the same props: { field, value, error, onChange }.
// onChange gets the new RAW value, so the parent never cares about the input kind.
function InputField({ type, field, value, error, onChange }) {
  const { id, errorId, controlProps } = useFieldIds(field, error)
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: 'block' }}>
        {field.label}
      </label>
      <input
        {...controlProps}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <FieldError id={errorId} message={error} />
    </div>
  )
}

const TextField = (props) => <InputField type="text" {...props} />
const NumberField = (props) => <InputField type="number" {...props} />

function SelectField({ field, value, error, onChange }) {
  const { id, errorId, controlProps } = useFieldIds(field, error)
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: 'block' }}>
        {field.label}
      </label>
      <select {...controlProps} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select...</option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <FieldError id={errorId} message={error} />
    </div>
  )
}

function CheckboxField({ field, value, error, onChange }) {
  const { id, errorId, controlProps } = useFieldIds(field, error)
  return (
    <div style={{ marginBottom: 12 }}>
      <input
        {...controlProps}
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id}>{field.label}</label>
      <FieldError id={errorId} message={error} />
    </div>
  )
}

// The "map from type to component". Adding a new field type means adding
// one component and one line here. DynamicForm itself does not change.
const FIELD_COMPONENTS = {
  text: TextField,
  number: NumberField,
  select: SelectField,
  checkbox: CheckboxField,
}

// ---------- the form ----------

// If the schema can change while the form is on screen, give DynamicForm a new
// `key` so it starts again with fresh state (see "reset state with a key").
export default function DynamicForm({ schema, onSubmit }) {
  const [values, setValues] = useState(() => initialValues(schema))
  const [errors, setErrors] = useState({})

  const visibleFields = getVisibleFields(schema, values)

  function handleChange(name, raw) {
    const nextValues = { ...values, [name]: raw }
    setValues(nextValues)
    // Editing a field clears ITS error (no re-validation yet). Changing a value
    // can also hide other fields, and hidden fields must not keep an old error
    // that would pop up again when they are shown later. So we keep only the
    // errors of fields that are still visible.
    const stillVisible = getVisibleFields(schema, nextValues)
    setErrors((current) => {
      const kept = {}
      for (const field of stillVisible) {
        if (field.name !== name && current[field.name]) kept[field.name] = current[field.name]
      }
      return kept
    })
  }

  function handleSubmit(event) {
    event.preventDefault()

    // Only visible fields are validated and submitted.
    const nextErrors = {}
    const output = {}
    for (const field of visibleFields) {
      const typed = toTypedValue(field, values[field.name])
      const message = validateField(field, typed)
      if (message) nextErrors[field.name] = message
      else output[field.name] = typed
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) onSubmit(output)
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      {visibleFields.map((field) => {
        const Field = FIELD_COMPONENTS[field.type]
        return (
          <Field
            key={field.name}
            field={field}
            value={values[field.name]}
            error={errors[field.name]}
            onChange={(raw) => handleChange(field.name, raw)}
          />
        )
      })}
      <button type="submit">Submit</button>
    </form>
  )
}
