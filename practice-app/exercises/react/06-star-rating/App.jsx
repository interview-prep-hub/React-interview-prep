import { useState } from 'react'

// Exercise 06: Star rating.
// Read README.md in this folder for the full requirements.

export default function App({ max = 5, onChange }) {
  // TODO 1: state for the saved rating (0 means "not rated yet")
  // TODO 2: state for the star the pointer is over (0 means "none")
  // TODO 3: work out how many stars should LOOK filled right now.
  //         This is a derived value, do not store it in state.
  //         (The preview wins while the pointer is on a star.)

  // Star numbers 1..max, for example [1, 2, 3, 4, 5] when max is 5.
  const stars = Array.from({ length: max }, (_, index) => index + 1)

  return (
    <div>
      <h2>Star rating</h2>

      {/* TODO 4: a wrapper with role="group" and aria-label="Star rating".
          Inside it, render one <button> for every number in `stars`:
            - aria-label: "1 star", "2 stars", "3 stars", ...
            - data-filled: the string "true" or "false"
            - onClick: save the rating (clicking the saved star again clears it)
            - onMouseEnter: remember which star the pointer is on
          Leaving the wrapper must end the preview.
          TODO 5: call onChange (if it was passed) with the new rating. */}

      {/* TODO 6: show "Rated N out of <max>" or "Not rated yet" (saved rating only) */}
      <p>Not rated yet</p>
    </div>
  )
}
