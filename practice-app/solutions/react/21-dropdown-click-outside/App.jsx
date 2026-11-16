import { useRef, useState } from 'react'
import { useClickOutside } from './useClickOutside.js'

// Reference solution for exercise 21.
// Key ideas:
// - ONE wrapper element holds both the button and the list, and the outside-click
//   hook watches that wrapper. A click on the button therefore counts as "inside"
//   and the button's own onClick can toggle the list without a fight.
// - We store only the selected VALUE in state. The label is derived from it.
// - Closing with Escape or after a choice moves focus back to the button, because
//   the focused option is about to disappear from the page.

export const FRUITS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'mango', label: 'Mango' },
]

const styles = {
  wrapper: { position: 'relative', display: 'inline-block' },
  button: { minWidth: 160, padding: '6px 10px', textAlign: 'left' },
  list: {
    position: 'absolute',
    top: '100%',
    left: 0,
    minWidth: '100%',
    margin: 0,
    padding: 0,
    listStyle: 'none',
    background: '#fff',
    border: '1px solid #ccc',
    zIndex: 1,
  },
  option: { padding: '6px 10px', cursor: 'pointer' },
}

export function Dropdown({ options, onChange, placeholder = 'Select a fruit' }) {
  const [open, setOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState(null)
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)

  const selected = options.find((option) => option.value === selectedValue)

  // A click anywhere outside the wrapper closes the list.
  useClickOutside(wrapperRef, () => setOpen(false))

  const closeAndFocusButton = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  const choose = (option) => {
    setSelectedValue(option.value)
    onChange?.(option.value) // onChange is optional
    closeAndFocusButton()
  }

  const handleKeyDown = (event) => {
    // The key event bubbles up from the button or from a focused option.
    if (event.key === 'Escape' && open) closeAndFocusButton()
  }

  return (
    <div ref={wrapperRef} onKeyDown={handleKeyDown} style={styles.wrapper}>
      <button
        ref={buttonRef}
        type="button"
        style={styles.button}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {selected ? selected.label : placeholder}
      </button>

      {open && (
        <ul role="listbox" style={styles.list}>
          {options.map((option) => {
            const isSelected = option.value === selectedValue
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                tabIndex={-1} // focusable by code and by click, but not part of the Tab order
                style={{ ...styles.option, fontWeight: isSelected ? 'bold' : 'normal' }}
                onClick={() => choose(option)}
              >
                {option.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function App() {
  const [chosen, setChosen] = useState(null)

  return (
    <div>
      <h2>Fruit picker</h2>
      <Dropdown options={FRUITS} onChange={setChosen} />
      <p>
        Chosen value: <span data-testid="chosen">{chosen ?? 'none'}</span>
      </p>
    </div>
  )
}
