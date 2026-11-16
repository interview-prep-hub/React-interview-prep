import { StrictMode, Suspense, lazy, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

// Every React exercise has an App.jsx. The playground lists them all so you
// can SEE your component in the browser while you code (npm run dev).
const starters = import.meta.glob('/exercises/react/*/App.jsx')
const solutions = import.meta.glob('/solutions/react/*/App.jsx')

const nameOf = (path) => path.split('/').slice(-2)[0]
const names = Object.keys(starters).map(nameOf).sort()

function Playground() {
  const params = new URLSearchParams(window.location.search)
  const [name, setName] = useState(params.get('ex') || names[0])
  const [mode, setMode] = useState(params.get('mode') === 'solution' ? 'solution' : 'starter')

  const Component = useMemo(() => {
    const table = mode === 'solution' ? solutions : starters
    const folder = mode === 'solution' ? 'solutions' : 'exercises'
    const loader = table[`/${folder}/react/${name}/App.jsx`]
    return loader ? lazy(loader) : null
  }, [name, mode])

  const choose = (nextName, nextMode) => {
    setName(nextName)
    setMode(nextMode)
    const q = new URLSearchParams({ ex: nextName, mode: nextMode })
    window.history.replaceState(null, '', `?${q}`)
  }

  return (
    <div style={{ display: 'flex', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <nav style={{ width: 260, padding: 16, borderRight: '1px solid #ddd', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>Exercises</h3>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Show:{' '}
          <select value={mode} onChange={(e) => choose(name, e.target.value)}>
            <option value="starter">my starter code</option>
            <option value="solution">reference solution</option>
          </select>
        </label>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {names.map((n) => (
            <li key={n}>
              <button
                onClick={() => choose(n, mode)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 8px',
                  border: 'none',
                  background: n === name ? '#e8f0fe' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {n}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main style={{ flex: 1, padding: 24 }}>
        {Component ? (
          <Suspense fallback={<p>Loading...</p>}>
            <Component />
          </Suspense>
        ) : (
          <p>No {mode} found for {name}.</p>
        )}
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
)
