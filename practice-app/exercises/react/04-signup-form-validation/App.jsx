import { useState } from 'react'

// Exercise 04: Signup form with validation.
// Read README.md in this folder for the full requirements.

// TODO 1: write a pure function validate(values) that returns an object with
//         one message per invalid field, for example { email: '...' }.
//         An empty object means the form is valid. (The exact messages are in the README.)

export default function App() {
  // TODO 2: state for the four field values (name, email, password, confirm).
  //         Make the inputs controlled: value + onChange.
  // TODO 3: state for the errors object.
  // TODO 4: state for the success message.

  // TODO 5: handleChange: store the new value AND remove that field's error.
  // TODO 6: handleSubmit: stop the page reload, run validate, then either
  //         show the errors or show the success message and clear the form.

  return (
    <div>
      <h2>Sign up</h2>

      {/* TODO 7: make the form call handleSubmit and add noValidate */}
      <form>
        <div>
          <label htmlFor="name">Name</label>
          <br />
          <input id="name" name="name" type="text" />
          {/* TODO 8: when this field has an error, render the message here with
              role="alert" and an id, and point aria-describedby at that id. */}
        </div>

        {/* TODO 9: Email, Password and Confirm password fields, same pattern.
            Tip: four fields with the same markup is a good reason for a small Field component. */}

        {/* TODO 10: a submit button labelled "Create account" */}
      </form>

      {/* TODO 11: after a valid submit show "Account created for {name}" (role="status") */}
    </div>
  )
}
