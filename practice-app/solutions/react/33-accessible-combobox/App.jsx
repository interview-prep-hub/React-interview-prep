import { useId, useState } from 'react'

// Reference solution for exercise 33: accessible combobox (ARIA 1.2 list pattern).
// Key ideas:
// - DOM focus NEVER leaves the <input>. The "current" option is only a visual
//   highlight, and screen readers learn about it through aria-activedescendant.
// - Only three pieces of state: the text, whether the popup is open, and the
//   index of the highlighted option. Results, ids and every ARIA value are derived.
// - The highlight is reset in the same event handler that changes the list, so
//   the index can never point at a stale option (no effect needed).
// - mousedown on the list is cancelled. Otherwise the input would blur before
//   the click lands, and the blur handler would close the list under the mouse.

const FRUITS = [
  'Apple',
  'Apricot',
  'Banana',
  'Blueberry',
  'Cherry',
  'Grape',
  'Grapefruit',
  'Kiwi',
  'Lemon',
  'Mango',
  'Orange',
  'Pineapple',
]

const NONE = -1 // "no option is highlighted"

// Case-insensitive "contains". An empty query matches every fruit.
function filterFruits(query) {
  const needle = query.toLowerCase()
  return FRUITS.filter((fruit) => fruit.toLowerCase().includes(needle))
}

function resultsMessage(count) {
  return count === 1 ? '1 result available' : `${count} results available`
}

// Hidden on screen, but still read by screen readers.
const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

export default function App() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(NONE)

  // useId gives one stable, unique prefix; every id we need is built from it.
  const baseId = useId()
  const labelId = `${baseId}-label`
  const inputId = `${baseId}-input`
  const listboxId = `${baseId}-listbox`
  const optionId = (index) => `${baseId}-option-${index}`

  // Derived values: no extra state to keep in sync.
  const results = filterFruits(query)
  const isExpanded = open && results.length > 0
  const showNoResults = open && results.length === 0
  const activeId = isExpanded && activeIndex !== NONE ? optionId(activeIndex) : undefined
  const last = results.length - 1

  const close = () => {
    setOpen(false)
    setActiveIndex(NONE)
  }

  const select = (fruit) => {
    setQuery(fruit)
    close()
  }

  const handleChange = (event) => {
    setQuery(event.target.value)
    setOpen(true)
    setActiveIndex(NONE) // the list changed, so the old index means nothing now
  }

  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault() // keep the caret where it is
        if (!open) {
          setOpen(true)
          setActiveIndex(last >= 0 ? 0 : NONE)
        } else if (last >= 0) {
          // From NONE (-1) the next index is 0; from the last option we wrap to 0.
          setActiveIndex((i) => (i >= last ? 0 : i + 1))
        }
        break
      case 'ArrowUp':
        if (isExpanded) {
          event.preventDefault()
          // From NONE or from the first option we wrap to the last one.
          setActiveIndex((i) => (i <= 0 ? last : i - 1))
        }
        break
      case 'Home':
        // Only steal Home/End while the list is showing; otherwise they move the caret.
        if (isExpanded) {
          event.preventDefault()
          setActiveIndex(0)
        }
        break
      case 'End':
        if (isExpanded) {
          event.preventDefault()
          setActiveIndex(last)
        }
        break
      case 'Enter':
        // activeId is set only while an option of the visible list is highlighted.
        if (activeId) {
          event.preventDefault()
          select(results[activeIndex])
        }
        break
      case 'Escape':
        // First Escape closes the popup, the next one clears the text.
        if (open) close()
        else setQuery('')
        break
      default:
        break
    }
  }

  return (
    <div style={{ maxWidth: 320, position: 'relative' }}>
      <h2>Pick a fruit</h2>

      <label id={labelId} htmlFor={inputId}>
        Fruit
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={isExpanded}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={close}
        style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
      />

      {isExpanded && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          // Keep focus in the input when the mouse goes down on the list.
          onMouseDown={(event) => event.preventDefault()}
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            border: '1px solid #999',
            background: 'white',
          }}
        >
          {results.map((fruit, index) => (
            <li
              key={fruit}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => select(fruit)}
              style={{
                padding: '4px 8px',
                cursor: 'pointer',
                background: index === activeIndex ? '#cfe3ff' : 'transparent',
              }}
            >
              {fruit}
            </li>
          ))}
        </ul>
      )}

      {showNoResults && <p role="status">No results</p>}

      {/* A live region must already be in the DOM before its text changes. */}
      <div aria-live="polite" aria-atomic="true" data-testid="live-region" style={visuallyHidden}>
        {isExpanded ? resultsMessage(results.length) : ''}
      </div>
    </div>
  )
}
