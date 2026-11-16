import { useHistory } from './useHistory.js'

// Reference solution for exercise 26.
// Key ideas:
// - text AND color live in ONE history object, so Undo walks back through both
// - set() receives an updater, so we never rely on a stale copy of the state
// - when nothing changes we return the SAME object (prev), and useHistory ignores it

const INITIAL = { text: '', color: 'red' }

const COLORS = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'orange', label: 'Orange' },
]

export default function App() {
  const { state, set, undo, redo, canUndo, canRedo, reset, history } = useHistory(INITIAL)

  function handleTextChange(event) {
    // Read the value NOW. The updater below may run later, after the event is over.
    const text = event.target.value
    set((prev) => (prev.text === text ? prev : { ...prev, text }))
  }

  function chooseColor(color) {
    // Clicking the selected color returns the same object, so no history step is added.
    set((prev) => (prev.color === color ? prev : { ...prev, color }))
  }

  return (
    <div>
      <h2>Undo / redo demo</h2>

      <div>
        <label htmlFor="note">Text</label>
        <textarea id="note" value={state.text} onChange={handleTextChange} rows={4} />
      </div>

      <div role="group" aria-label="Color">
        {COLORS.map(({ value, label }) => (
          <button
            key={value}
            aria-pressed={state.color === value}
            onClick={() => chooseColor(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        data-testid="swatch"
        style={{ width: 64, height: 64, margin: '8px 0', backgroundColor: state.color }}
      />

      <div>
        <button onClick={undo} disabled={!canUndo}>
          Undo
        </button>
        <button onClick={redo} disabled={!canRedo}>
          Redo
        </button>
        <button onClick={() => reset()}>Reset</button>
      </div>

      <p data-testid="history-info">
        Undo steps: {history.past.length}, Redo steps: {history.future.length}
      </p>
    </div>
  )
}
