import { useEffect, useState } from 'react'

// Exercise 10: Traffic light.
// Read README.md in this folder for the full requirements.

// TODO 1: describe the whole cycle as DATA (a config object), so the
// durations and the order are written down in one place and the component
// logic never hard-codes them. For each light you need two facts: how long
// it stays on, and which light comes after it.
const LIGHTS = {}

export default function App() {
  // TODO 2: state for the active light. It starts at 'red'.

  // TODO 3: a useEffect that runs whenever the active light changes.
  //   - start ONE timer for the current light (use its duration)
  //   - when the timer fires, move to the next light
  //   - return a cleanup function that clears the timer
  // Then check: is anything left running after the component unmounts?

  return (
    <div>
      <h2>Traffic light</h2>
      {/* TODO 4: show the REAL active light here (this is a fixed text for now) */}
      <p>
        Active light: <strong data-testid="active-light">red</strong>
      </p>

      {/* TODO 5: the lamps are fixed markup for now. Make the one that matches
          the active light have data-on="true" (and the others data-on="false"),
          and pass the same fact to lampStyle so the lamp really lights up on screen.
          Bonus: render them with .map() over your config instead of copy-paste. */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div role="img" aria-label="red lamp" data-on="false" style={lampStyle('red', false)} />
        <div role="img" aria-label="green lamp" data-on="false" style={lampStyle('green', false)} />
        <div role="img" aria-label="yellow lamp" data-on="false" style={lampStyle('yellow', false)} />
      </div>
    </div>
  )
}

// Small styling helper, nothing to change here. A lamp that is on is fully
// bright, a lamp that is off is dimmed.
function lampStyle(color, isOn) {
  return { width: 48, height: 48, borderRadius: '50%', background: color, opacity: isOn ? 1 : 0.2 }
}
