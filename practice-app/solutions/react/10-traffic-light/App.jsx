import { useEffect, useState } from 'react'

// Reference solution for exercise 10.
// Key ideas:
// - The cycle is DATA. Each light says how long it stays on and which light
//   comes next. This is a tiny state machine (a transition table), so adding
//   or changing a light never means touching the component logic.
// - ONE effect depends on the active light. Every time the light changes,
//   React runs the cleanup (clears the old timer) and then the effect again
//   (starts a new timer). So at most one timer exists, nothing keeps running
//   after unmount, and StrictMode's extra mount/unmount in development is safe.
// - We chain setTimeout instead of using setInterval, because every light has
//   a different duration.

const LIGHTS = {
  red: { duration: 3000, next: 'green' },
  green: { duration: 2000, next: 'yellow' },
  yellow: { duration: 1000, next: 'red' },
}

const START_LIGHT = 'red'

export default function App() {
  const [active, setActive] = useState(START_LIGHT)

  useEffect(() => {
    const { duration, next } = LIGHTS[active]
    const id = setTimeout(() => setActive(next), duration)
    // Cleanup: runs before the next effect and when the component unmounts.
    return () => clearTimeout(id)
  }, [active])

  return (
    <div>
      <h2>Traffic light</h2>
      <p>
        Active light: <strong data-testid="active-light">{active}</strong>
      </p>

      <div style={{ display: 'flex', gap: 12 }}>
        {/* The lamps are derived from the config and from the one piece of state. */}
        {Object.keys(LIGHTS).map((name) => {
          const isOn = name === active
          return (
            <div
              key={name}
              role="img"
              aria-label={`${name} lamp`}
              // React writes a boolean on a data-* attribute as "true" or "false".
              data-on={isOn}
              style={lampStyle(name, isOn)}
            />
          )
        })}
      </div>
    </div>
  )
}

// A lamp that is on is fully bright, a lamp that is off is dimmed.
function lampStyle(color, isOn) {
  return { width: 48, height: 48, borderRadius: '50%', background: color, opacity: isOn ? 1 : 0.2 }
}
