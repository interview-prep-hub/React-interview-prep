import { useId, useState } from 'react'

// Exercise 33: Accessible combobox (ARIA 1.2 pattern).
// Read README.md in this folder for the full requirements.

// The data. Keep this order: the list always shows matches in this order.
const FRUITS = [
  'Apple',
  'Apricot',
  'Banana',
  'Blueberry',
  'Cherry',
  'Grape',
  'Grapefruit',
  'Kiwi',
  'Lemon',
  'Mango',
  'Orange',
  'Pineapple',
]

// Hidden on screen, but still read by screen readers (use it on the live region).
const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

export default function App() {
  // One unique prefix for all ids on this component. Build every id from it.
  const baseId = useId()
  const labelId = `${baseId}-label`
  const inputId = `${baseId}-input`
  const listboxId = `${baseId}-listbox`
  // TODO 1: write a small function that returns a unique id for option number `index`

  // TODO 2: state. You need exactly three pieces:
  //   - the text in the input
  //   - whether the popup is open
  //   - the index of the highlighted option (use -1 for "none")

  // TODO 3: derive (do not store) these from the state above:
  //   - results: the fruits that contain the text, ignoring case
  //   - isExpanded: is the listbox actually on screen?
  //   - whether to show "No results"
  //   - the id of the highlighted option, or undefined when there is none

  // TODO 4: handlers: onChange, onKeyDown (ArrowDown, ArrowUp, Home, End, Enter, Escape),
  //   onBlur, and selecting an option. Reset the highlight whenever the list changes or closes.
  //   Call event.preventDefault() only for keys you really act on (README item 20).

  return (
    <div style={{ maxWidth: 320, position: 'relative' }}>
      <h2>Pick a fruit</h2>

      <label id={labelId} htmlFor={inputId}>
        Fruit
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
        // TODO 5: make it controlled and add aria-expanded, aria-controls,
        //   aria-autocomplete and aria-activedescendant, plus the handlers
      />

      {/* TODO 6: the popup. role="listbox", labelled by the label above, with one
          role="option" per result. Clicking an option must select it and must not
          take focus away from the input (see hint 7 in the README if you get stuck). */}

      {/* TODO 7: the "No results" message with role="status" */}

      {/* TODO 8: announce "N results available". Keep this element mounted all the time. */}
      <div
        aria-live="polite"
        aria-atomic="true"
        data-testid="live-region"
        style={visuallyHidden}
      />
    </div>
  )
}
