import { useRef, useState } from 'react'
import { useClickOutside } from './useClickOutside.js'

// Exercise 21: Dropdown with click outside.
// Read README.md in this folder for the full requirements.
// Finish useClickOutside.js too: the hook is tested on its own as well.

export const FRUITS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'mango', label: 'Mango' },
]

// Ready-made styles so the playground looks right. Use them as you like.
const styles = {
  wrapper: { position: 'relative', display: 'inline-block' },
  button: { minWidth: 160, padding: '6px 10px', textAlign: 'left' },
  list: {
    position: 'absolute',
    top: '100%',
    left: 0,
    minWidth: '100%',
    margin: 0,
    padding: 0,
    listStyle: 'none',
    background: '#fff',
    border: '1px solid #ccc',
    zIndex: 1,
  },
  option: { padding: '6px 10px', cursor: 'pointer' },
}

export function Dropdown({ options, onChange, placeholder = 'Select a fruit' }) {
  // TODO 1: state for "is the list open?" and state for the selected value
  // TODO 2: one ref for the wrapper <div> (it holds the button AND the list)
  //         and one ref for the button
  // TODO 3: call useClickOutside(wrapperRef, ...) so an outside click closes the list
  // TODO 4: on the wrapper, handle the Escape key: close the list and focus the button

  return (
    <div style={styles.wrapper}>
      {/* TODO 5: the button toggles the list. It needs aria-haspopup="listbox",
          aria-expanded, and its text is the selected label (or the placeholder). */}
      <button type="button" style={styles.button}>
        {placeholder}
      </button>

      {/* TODO 6: while open, render <ul role="listbox"> with one
          <li role="option"> per option (aria-selected, tabIndex -1).
          Clicking an option selects it, calls onChange (if given), closes the
          list and focuses the button. */}
    </div>
  )
}

export default function App() {
  // TODO 7: remember the value passed to onChange and show it below.
  return (
    <div>
      <h2>Fruit picker</h2>
      <Dropdown options={FRUITS} />
      <p>
        Chosen value: <span data-testid="chosen">none</span>
      </p>
    </div>
  )
}
