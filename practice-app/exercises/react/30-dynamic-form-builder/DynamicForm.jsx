import { useId, useState } from 'react'

// Exercise 30: Dynamic form builder (the generic form component).
// Read README.md in this folder for the full requirements.
// You may add helper functions and small components in this file.

// ---------- pure helpers (no React in here) ----------

// TODO 1: write small pure functions. A good set:
//   - the empty starting value of a field (checkbox: false, all other types: '')
//   - toTypedValue(field, raw): the value you validate, compare and submit
//       text: trimmed string, number: a number (or null when empty), select/checkbox: unchanged
//   - validateField(field, typed): returns an error message string, or null when the value is fine
//       order of the rules: required, then min/max or minLength, then pattern
//   - isVisible(field, schema, values): follows the showIf rule
//       (remember: a field is also hidden when the field that controls it is hidden)

// ---------- field components: one small component per type ----------

// TODO 2: write one small component for each type: text, number, select, checkbox.
//   Each receives { field, value, error, onChange }.
//   - connect the <label> and the control (htmlFor + id from useId)
//   - when there is an error: aria-invalid, aria-describedby and a <p role="alert">
//   Text and number can share most of their markup.
//
// Then build the lookup object that maps a type to its component:
// const FIELD_COMPONENTS = { text: ..., number: ..., select: ..., checkbox: ... }

// ---------- the form ----------

export default function DynamicForm({ schema, onSubmit }) {
  // TODO 3: state for the raw values (one entry per field name) and state for the errors
  // TODO 4: work out which fields are visible right now (derive it, do not store it)

  function handleChange(name, raw) {
    // TODO 5: store the new raw value, clear this field's error,
    //         and drop the errors of any field that just became hidden
  }

  function handleSubmit(event) {
    event.preventDefault()
    // TODO 6: validate only the visible fields and collect the typed values.
    //         If there are errors, show them. If there are none, call onSubmit(values).
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      {/* TODO 7: render every visible field through FIELD_COMPONENTS[field.type] */}
      <button type="submit">Submit</button>
    </form>
  )
}
