import { useEffect, useState } from 'react'
import { SLIDES } from './slides.js'

// Exercise 22: Image carousel.
// Read README.md in this folder for the full requirements.
// The slide data lives in slides.js (you do not need to edit it).

const AUTO_PLAY_MS = 3000

// The component takes two OPTIONAL props, so the playground can render it as is:
//   slides   - an array of { id, alt, color } (defaults to the 4 slides in slides.js)
//   autoPlay - true makes the carousel change slides by itself (defaults to false)
export default function App({ slides = SLIDES, autoPlay = false }) {
  // TODO 1: state for the index of the current slide (starts at 0).
  //         Do not store the slide itself, you can look it up from the index.
  // TODO 2: state for "is the mouse over the carousel?" (starts as false)
  // TODO 3: functions for Prev and Next that wrap around at both ends.
  //         Hint: the remainder operator % helps, but be careful with negative numbers.
  // TODO 4: an effect for autoPlay. Only when autoPlay is on and the mouse is NOT over
  //         the carousel, start a timer that moves to the next slide every AUTO_PLAY_MS.
  //         Return a cleanup function that stops the timer.

  const slide = slides[0] // TODO 5: use the current index instead of 0

  return (
    // TODO 6: add onMouseEnter and onMouseLeave to this element
    <section aria-label="Image carousel" style={{ width: 320, fontFamily: 'system-ui, sans-serif' }}>
      {/* TODO 7: make this the only slide that is rendered. It must be a role="img" with aria-label. */}
      <div style={{ background: slide.color, height: 180, borderRadius: 8 }} />

      {/* TODO 8: the caption "Slide N of M" inside an element with aria-live="polite" */}

      {/* TODO 9: a "Prev" button, one "Go to slide N" dot button per slide, and a "Next" button.
                  The active dot needs aria-current="true". */}
    </section>
  )
}
