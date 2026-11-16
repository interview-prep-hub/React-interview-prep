import { useState } from 'react'
import DynamicForm from './DynamicForm.jsx'
import { sampleSchema } from './schema.js'

// Reference solution for exercise 30.
// App only wires things together: the schema goes in, the submitted values
// come out through onSubmit and are shown as JSON.

export default function App() {
  // null means "nothing has been submitted yet"
  const [submitted, setSubmitted] = useState(null)

  return (
    <div>
      <h2>Dynamic form builder</h2>
      <DynamicForm schema={sampleSchema} onSubmit={setSubmitted} />

      {submitted && (
        <section>
          <h3>Submitted values</h3>
          <pre data-testid="submitted-json">{JSON.stringify(submitted, null, 2)}</pre>
        </section>
      )}
    </div>
  )
}
