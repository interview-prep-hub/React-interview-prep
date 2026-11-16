import { useId, useState } from 'react'

// Reference solution for exercise 08.
// Key ideas:
// - TemperatureInput has NO state. It shows the `value` it is given and tells
//   its parent about every change (a "controlled" component).
// - The parent (App) owns ONE piece of state: the text the user typed and the
//   scale it was typed in. The text of the OTHER input is calculated while
//   rendering, so the two inputs can never disagree.
// - We never store the converted (rounded) value, so there is no rounding
//   feedback loop: the field you type in always keeps your exact text.

// Every scale only needs to know how to go to Celsius and back. To add Kelvin
// you add one more entry here and one more <TemperatureInput> below.
const SCALES = {
  c: {
    label: 'Celsius',
    toCelsius: (c) => c,
    fromCelsius: (c) => c,
  },
  f: {
    label: 'Fahrenheit',
    toCelsius: (f) => ((f - 32) * 5) / 9,
    fromCelsius: (c) => (c * 9) / 5 + 32,
  },
}

// Text -> number, or null when the text is blank or not a number.
// Number('') and Number('  ') are 0, so we must check for blank text first.
function parseTemperature(text) {
  if (text.trim() === '') return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

// Number -> text with at most 2 decimals and no trailing zeros (98.6, not 98.60).
// String(98.6) is "98.6", so we get the missing zeros for free. A huge input can
// overflow to Infinity when converted, and that has no sensible text, so use ''.
function format(n) {
  const rounded = Math.round(n * 100) / 100
  return Number.isFinite(rounded) ? String(rounded) : ''
}

function convert(text, from, to) {
  const n = parseTemperature(text)
  if (n === null) return ''
  return format(SCALES[to].fromCelsius(SCALES[from].toCelsius(n)))
}

function boilMessage(celsiusText) {
  const celsius = parseTemperature(celsiusText)
  if (celsius === null) return 'Enter a temperature'
  return celsius >= 100 ? 'The water would boil.' : 'The water would not boil.'
}

export function TemperatureInput({ scale, value, onChange }) {
  // useId gives each copy of this component its own id, so the two labels
  // point to the right inputs (a fixed id would be used twice).
  const id = useId()

  return (
    <div>
      <label htmlFor={id}>{SCALES[scale].label}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default function App() {
  // The ONE piece of state: what was typed, and in which input.
  const [input, setInput] = useState({ scale: 'c', text: '' })

  // The input being edited shows the raw text. The other one shows a conversion.
  const valueFor = (scale) =>
    input.scale === scale ? input.text : convert(input.text, input.scale, scale)

  const celsiusText = valueFor('c')

  return (
    <div>
      <h2>Temperature converter</h2>

      <TemperatureInput
        scale="c"
        value={celsiusText}
        onChange={(text) => setInput({ scale: 'c', text })}
      />
      <TemperatureInput
        scale="f"
        value={valueFor('f')}
        onChange={(text) => setInput({ scale: 'f', text })}
      />

      <p data-testid="verdict">{boilMessage(celsiusText)}</p>
    </div>
  )
}
