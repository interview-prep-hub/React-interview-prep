import { useEffect, useRef, useState } from 'react'

// Reference solution for exercise 18.
// Key ideas:
// - We never count ticks. A tick only means "look at the clock again".
//   The elapsed time is always Date.now() minus a start timestamp, so a late
//   or skipped tick (for example in a background tab) cannot make us drift.
// - The start timestamp lives in a ref: changing it must NOT cause a render.
// - The interval exists only while the watch runs. The effect cleanup clears
//   it on stop, on reset and on unmount.

const TICK_MS = 10

const pad = (n) => String(n).padStart(2, '0')

// 83450 ms -> "01:23.45". Centiseconds are truncated, never rounded.
function formatTime(ms) {
  const totalCentiseconds = Math.floor(ms / 10)
  const minutes = Math.floor(totalCentiseconds / 6000)
  const seconds = Math.floor(totalCentiseconds / 100) % 60
  const centiseconds = totalCentiseconds % 100
  return `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`
}

// Milliseconds that have passed since `origin` (a Date.now() value).
const since = (origin) => Date.now() - origin

export default function App() {
  const [elapsed, setElapsed] = useState(0) // milliseconds shown on the display
  const [running, setRunning] = useState(false)
  const [laps, setLaps] = useState([]) // elapsed milliseconds at each Lap press

  // The Date.now() value at which the watch would read 0 if it had been
  // running without a pause. Start and resume set it; ticks only read it.
  const originRef = useRef(0)

  useEffect(() => {
    if (!running) return

    const id = setInterval(() => setElapsed(since(originRef.current)), TICK_MS)
    // Runs when `running` turns false and when the component unmounts.
    return () => clearInterval(id)
  }, [running])

  const toggle = () => {
    if (running) {
      // Take one last exact reading, so the display shows the moment of the click.
      setElapsed(since(originRef.current))
    } else {
      // Resume: pretend the watch started `elapsed` milliseconds ago.
      originRef.current = Date.now() - elapsed
    }
    setRunning(!running)
  }

  const lap = () => {
    // Read the clock here, in the handler. Updater functions must stay pure.
    const time = since(originRef.current)
    setLaps((previous) => [...previous, time])
  }

  const reset = () => {
    setRunning(false)
    setElapsed(0)
    setLaps([])
  }

  return (
    <div>
      <h2>Stopwatch</h2>
      <p data-testid="display">{formatTime(elapsed)}</p>

      <button onClick={toggle}>{running ? 'Stop' : 'Start'}</button>
      <button onClick={lap} disabled={!running}>
        Lap
      </button>
      <button onClick={reset}>Reset</button>

      <ol>
        {laps.map((time, index) => (
          // Laps are only appended or cleared all at once, and two laps can have
          // the same time, so the index is the right key here (not the time).
          <li key={index}>
            Lap {index + 1} {formatTime(time)}
          </li>
        ))}
      </ol>
    </div>
  )
}
