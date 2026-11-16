import { useState } from 'react'

// Exercise 20: Multi-step form (a 3-step wizard).
// Read README.md in this folder for the full requirements.

// The three steps, in order. Handy for the "Step 1 of 3" label.
const STEP_TITLES = ['Account', 'Profile', 'Review']

// TODO 1: write validateStep(stepIndex, values).
// It must be a PURE function: values in, errors out. No state, no side effects.
// - Step 0 checks `email` and `password`. Step 1 checks `fullName` and `age`.
// - Return an object with ONE message per invalid field, for example
//   { email: 'Enter a valid email address' }. Use the exact messages from the README.
// - Return {} when the step is valid. The Review step (2) has nothing to check.
function validateStep(stepIndex, values) {
  return {}
}

// `onSubmit` is optional. When the parent does not pass it, nothing happens.
export default function App({ onSubmit = () => {} }) {
  // TODO 2: ONE state object for ALL the form data: { email, password, fullName, age }.
  //         Every value is a string. Steps will unmount, so the data must live up here.
  // TODO 3: state for the current step as a number (0, 1 or 2).
  // TODO 4: state for the errors of the current step, e.g. { email: '...' }.
  // TODO 5: state that remembers the form was submitted (and the name to greet),
  //         so you can show the final message.

  // TODO 6: one change handler for every input. The input's `name` attribute can be
  //         the key in your values object.

  // TODO 7: one submit handler for the whole form.
  //         - call event.preventDefault()
  //         - on the Review step: call onSubmit with the values, then show the final message
  //         - on the other steps: run validateStep. Errors? Show them and stay.
  //           No errors? Clear the errors and go to the next step.

  return (
    <div>
      <h2>Sign up</h2>

      {/* TODO 8: make this label follow the current step: "Step 2 of 3", "Step 3 of 3" ... */}
      <p data-testid="progress">Step 1 of 3</p>

      {/* TODO 9: connect the submit handler here, so the Enter key works too */}
      <form noValidate>
        {/* TODO 10: show ONE step at a time. Write a small component per step
            (Account, Profile, Review) that gets values, errors and the change handler
            as props and holds NO state of its own. */}
        <h3>Account</h3>
        {/* TODO 11: labelled inputs with their error messages
            (role="alert", aria-describedby, aria-invalid) */}

        {/* TODO 12: the Review step shows every value, with Edit buttons. */}

        {/* TODO 13: Back (not on step 1) and Next / Submit.
            Remember: only the main button may have type="submit". */}
        <button type="submit">Next</button>
      </form>

      {/* TODO 14: after Submit, show <p role="status">All done, {name}!</p> and remove the wizard. */}
    </div>
  )
}
