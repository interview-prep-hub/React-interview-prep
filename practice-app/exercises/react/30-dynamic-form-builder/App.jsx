import { useState } from 'react'
import DynamicForm from './DynamicForm.jsx'
import { sampleSchema } from './schema.js'

// Exercise 30: Dynamic form builder (the page that uses DynamicForm).
// Read README.md in this folder for the full requirements.
// Build DynamicForm.jsx first, then come back here.

export default function App() {
  // TODO 1: state for the last submitted values (null until the first valid submit)

  return (
    <div>
      {/* TODO 2: a heading */}
      {/* TODO 3: <DynamicForm schema={sampleSchema} onSubmit={...} /> */}
      {/* TODO 4: after a valid submit, show the values as formatted JSON */}
    </div>
  )
}
