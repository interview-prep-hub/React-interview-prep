import { useState } from 'react'

// Exercise 08: Temperature converter.
// Read README.md in this folder for the full requirements.

// A reusable child component. It must have NO state of its own:
// everything it shows comes from props, and it reports changes to its parent.
export function TemperatureInput({ scale, value, onChange }) {
  // TODO 1: choose the label text from the scale: 'c' -> "Celsius", 'f' -> "Fahrenheit"
  // TODO 2: connect the label to the input. This component is rendered twice on
  //         the page, so a fixed id would be used twice (look at the useId hook).
  // TODO 3: make the input controlled: show `value`, and call onChange with the
  //         new TEXT (a string) every time the user types.
  return (
    <div>
      <label>Temperature</label>
      <input type="text" />
    </div>
  )
}

export default function App() {
  // TODO 4: keep ONE piece of state: the text the user typed, and which input
  //         (scale) it was typed in. Do not store both temperatures.
  // TODO 5: write the conversion helpers (Celsius <-> Fahrenheit, rounded to at
  //         most 2 decimals) and calculate the text of the OTHER input while rendering.
  // TODO 6: calculate the sentence for the <p> below from the Celsius value.

  return (
    <div>
      <h2>Temperature converter</h2>

      {/* TODO 7: pass the right scale, value and onChange to each input */}
      <TemperatureInput scale="c" value="" onChange={() => {}} />
      <TemperatureInput scale="f" value="" onChange={() => {}} />

      <p data-testid="verdict"></p>
    </div>
  )
}
