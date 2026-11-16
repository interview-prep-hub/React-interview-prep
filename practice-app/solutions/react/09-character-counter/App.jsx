import { useState } from 'react'

// Reference solution for exercise 09.
// Key ideas:
// - only the text (and a "just sent" flag) lives in state
// - everything else (length, words, over-limit, can-send) is DERIVED from the
//   text during render, so it can never get out of sync with it
// - no maxLength attribute: the user may type past the limit and sees how far over they are

const MAX_LENGTH = 140

// Split on any whitespace and ignore the empty strings that
// leading, trailing or empty text produce.
function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length
}

export default function App({ onSend }) {
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)

  // Derived values: plain variables, recalculated on every render.
  const length = text.length
  const isOverLimit = length > MAX_LENGTH
  const overBy = length - MAX_LENGTH
  const words = countWords(text)
  const canSend = text.trim() !== '' && !isOverLimit

  const handleChange = (e) => {
    setText(e.target.value)
    setSent(false) // typing again hides the old confirmation
  }

  const handleSend = () => {
    if (!canSend) return // safe even if called from somewhere other than the button
    onSend?.(text) // onSend is optional
    setText('')
    setSent(true)
  }

  return (
    <div>
      <h2>Message box</h2>

      <label htmlFor="message">Message</label>
      <textarea id="message" rows={4} value={text} onChange={handleChange} />

      <p>{`${length}/${MAX_LENGTH}`}</p>
      <p>{`${words} words`}</p>

      {isOverLimit && <p role="alert">{`${overBy} characters over the limit`}</p>}

      <button type="button" disabled={!canSend} onClick={handleSend}>
        Send
      </button>

      {/* A live region works best when it is always in the page and only its text changes. */}
      <p role="status">{sent ? 'Message sent!' : ''}</p>
    </div>
  )
}
