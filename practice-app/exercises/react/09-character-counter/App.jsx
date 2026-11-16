import { useState } from 'react'

// Exercise 09: Character counter.
// Read README.md in this folder for the full requirements.

const MAX_LENGTH = 140

export default function App({ onSend }) {
  // TODO 1: create state for the text in the box (starts as an empty string)
  // TODO 2: create state for "was a message just sent?" (starts as false)
  // TODO 3: work out the character count, the word count, "over the limit"
  //         and "can send" as plain variables. Do NOT put them in state.

  return (
    <div>
      <h2>Message box</h2>

      <label htmlFor="message">Message</label>
      {/* TODO 4: make this textarea controlled (value + onChange). No maxLength! */}
      <textarea id="message" rows={4} />

      {/* TODO 5: show the real numbers, for example "12/140" and "3 words" */}
      <p>0/{MAX_LENGTH}</p>
      <p>0 words</p>

      {/* TODO 6: when over the limit, show "X characters over the limit" with role="alert" */}

      {/* TODO 7: disable the button when sending is not allowed, and handle the click */}
      <button type="button">Send</button>

      {/* TODO 8: after a send, show "Message sent!" in an element with role="status" */}
    </div>
  )
}
