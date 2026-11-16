import { useHistory } from './useHistory.js'

// Exercise 26: undo/redo demo. First finish the hook in useHistory.js,
// then wire it up here. Read README.md in this folder for the full requirements.

// The text and the color live together in ONE state object, so they share one history.
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
    // TODO 1: read event.target.value first, then call set with an UPDATER function
    //         that returns a copy of the previous state with the new text.
  }

  function chooseColor(color) {
    // TODO 2: same idea for the color. If the color is already selected, return the
    //         previous state itself, so the hook sees "no change" and adds no history step.
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
          // TODO 3: mark the selected color with aria-pressed (true or false)
          <button key={value} onClick={() => chooseColor(value)}>
            {label}
          </button>
        ))}
      </div>

      {/* TODO 4: the swatch must get the current color as its background color */}
      <div data-testid="swatch" style={{ width: 64, height: 64, margin: '8px 0' }} />

      <div>
        {/* TODO 5: wire up Undo, Redo and Reset. Undo and Redo are disabled when they cannot act. */}
        <button>Undo</button>
        <button>Redo</button>
        <button>Reset</button>
      </div>

      {/* TODO 6: show the real numbers, see the README for the exact text */}
      <p data-testid="history-info">Undo steps: ?, Redo steps: ?</p>
    </div>
  )
}
