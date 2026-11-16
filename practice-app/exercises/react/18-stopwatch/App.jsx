import { useEffect, useRef, useState } from 'react'

// Exercise 18: Stopwatch.
// Read README.md in this folder for the full requirements.

// TODO 1: turn a number of milliseconds into 'mm:ss.cc'
// (minutes, seconds, centiseconds, each padded to two digits).
// Example: 83450 -> '01:23.45'. Cut the centiseconds off, do not round.
function formatTime(ms) {
  return ''
}

export default function App() {
  // TODO 2: state for the milliseconds to show, for "is it running?" and for the laps.

  // TODO 3: keep the timestamp of the start in a ref (a ref, not state:
  // changing it must not cause a render).

  // TODO 4: an effect that runs a setInterval (every 10 ms or faster) ONLY while
  // running. Each tick must READ the clock (Date.now()), not add 10 to a counter.
  // Return a cleanup function that clears the interval.

  // TODO 5: handlers for Start/Stop (resume must keep the accumulated time, and
  // Stop must show the exact time of the click), Lap and Reset.

  return (
    <div>
      <h2>Stopwatch</h2>
      <p data-testid="display">{formatTime(0)}</p>

      {/* TODO 6: Start becomes Stop while running. Lap is disabled unless running. */}
      <button>Start</button>
      <button>Lap</button>
      <button>Reset</button>

      {/* TODO 7: an ordered list with one row per lap: "Lap 1 00:01.23".
          Every row needs a key. */}
      <ol></ol>
    </div>
  )
}
