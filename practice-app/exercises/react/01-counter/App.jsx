import { useState } from 'react'

// Exercise 01: Counter with step and reset.
// Read README.md in this folder for the full requirements.

export default function App() {
  // TODO 1: create state for the count (starts at 0)
  // TODO 2: create state for the step (starts at 1). Keep it as a string.

  return (
    <div>
      <h2>Counter</h2>
      {/* TODO 3: show the count with data-testid="count" */}
      <p data-testid="count">0</p>

      {/* TODO 4: Increment, Decrement and Reset buttons */}
      {/* TODO 5: a labelled number input for the step */}
    </div>
  )
}
