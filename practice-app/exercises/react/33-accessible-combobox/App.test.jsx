import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

const ALL_FRUITS = [
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

// The extra button gives focus somewhere to go when the test moves away from the input.
function setup() {
  const user = userEvent.setup()
  render(
    <>
      <App />
      <button>Elsewhere</button>
    </>,
  )
  const input = screen.getByRole('combobox', { name: 'Fruit' })
  return { user, input }
}

const optionNames = () => screen.queryAllByRole('option').map((option) => option.textContent)
const highlightedOptions = () => screen.queryAllByRole('option', { selected: true })
// Name of the highlighted option, or null. It also checks that aria-activedescendant
// always agrees with the highlight, so every call below verifies that link as well.
const highlightedName = () => {
  const input = screen.getByRole('combobox', { name: 'Fruit' })
  const found = highlightedOptions()
  expect(found.length).toBeLessThanOrEqual(1) // never two highlights at once
  if (found.length === 0) {
    expect(input).not.toHaveAttribute('aria-activedescendant')
    return null
  }
  expect(input).toHaveAttribute('aria-activedescendant', found[0].id)
  return found[0].textContent
}
// The listbox must not be rendered at all (not merely hidden) while the list is closed.
const noListbox = () => {
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(document.querySelector('[role="listbox"], [role="option"]')).toBeNull()
}

describe('33 Accessible combobox', () => {
  it('starts closed and empty, with the ARIA 1.2 attributes on the input', async () => {
    const { user, input } = setup()
    expect(input).toBeInstanceOf(HTMLInputElement)
    expect(screen.getByLabelText('Fruit')).toBe(input)
    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveAttribute('aria-autocomplete', 'list')
    expect(input).not.toHaveAttribute('aria-activedescendant')
    const controls = input.getAttribute('aria-controls')
    expect(controls).toBeTruthy()
    noListbox()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    // Focusing or clicking the input does not open the list by itself.
    await user.click(input)
    expect(input).toHaveFocus()
    expect(input).toHaveAttribute('aria-expanded', 'false')
    noListbox()

    // When the list opens, aria-controls is unchanged and points at the listbox.
    await user.keyboard('{ArrowDown}')
    const listbox = screen.getByRole('listbox', { name: 'Fruit' })
    expect(listbox).toHaveAttribute('id', controls)
    expect(input).toHaveAttribute('aria-controls', controls)
    expect(input).toHaveAttribute('aria-expanded', 'true')
  })

  it('typing opens the list and filters it with a case-insensitive "contains"', async () => {
    const { user, input } = setup()
    await user.type(input, 'ap')
    expect(input).toHaveValue('ap')
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(optionNames()).toEqual(['Apple', 'Apricot', 'Grape', 'Grapefruit', 'Pineapple'])

    // Matches in the middle of a word count, and upper case typing works too.
    await user.clear(input)
    await user.type(input, 'RR')
    expect(input).toHaveValue('RR') // the text is kept exactly as typed
    expect(optionNames()).toEqual(['Blueberry', 'Cherry'])
  })

  it('shows every fruit again when the text is deleted', async () => {
    const { user, input } = setup()
    await user.type(input, 'ki')
    expect(optionNames()).toEqual(['Kiwi'])
    await user.keyboard('{Backspace}{Backspace}')
    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(optionNames()).toEqual(ALL_FRUITS)
  })

  it('ArrowDown opens a closed list and highlights the first option', async () => {
    const { user, input } = setup()
    await user.click(input)
    await user.keyboard('{ArrowDown}')

    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(optionNames()).toEqual(ALL_FRUITS)

    const options = screen.getAllByRole('option')
    const listbox = screen.getByRole('listbox')
    // Every option lives inside the listbox and has its own non-empty id.
    options.forEach((option) => expect(listbox).toContainElement(option))
    expect(options.every((option) => option.id)).toBe(true)
    expect(new Set(options.map((option) => option.id)).size).toBe(12)

    // Only the first option is highlighted, and aria-selected says so explicitly.
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    options.slice(1).forEach((option) => expect(option).toHaveAttribute('aria-selected', 'false'))
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id)
    expect(document.getElementById(options[0].id)).toBe(options[0])
    expect(input).toHaveFocus()
  })

  it('ArrowDown and ArrowUp move the highlight and wrap around', async () => {
    const { user, input } = setup()
    await user.type(input, 'ap') // Apple, Apricot, Grape, Grapefruit, Pineapple
    expect(highlightedName()).toBeNull()

    await user.keyboard('{ArrowDown}')
    expect(highlightedName()).toBe('Apple')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(highlightedName()).toBe('Grape')
    await user.keyboard('{ArrowUp}')
    expect(highlightedName()).toBe('Apricot')
    await user.keyboard('{ArrowUp}{ArrowUp}') // Apple, then wrap to the last one
    expect(highlightedName()).toBe('Pineapple')
    await user.keyboard('{ArrowDown}') // wrap to the first one
    expect(highlightedName()).toBe('Apple')

    // aria-activedescendant always follows the highlight.
    expect(input).toHaveAttribute('aria-activedescendant', highlightedOptions()[0].id)
    expect(input).toHaveFocus()
  })

  it('ArrowUp does nothing while closed, and jumps to the last option when nothing is highlighted', async () => {
    const { user, input } = setup()
    await user.click(input)
    await user.keyboard('{ArrowUp}')
    noListbox()
    expect(input).toHaveAttribute('aria-expanded', 'false')

    await user.type(input, 'an') // Banana, Mango, Orange
    expect(highlightedName()).toBeNull()
    await user.keyboard('{ArrowUp}')
    expect(highlightedName()).toBe('Orange')
  })

  it('Home and End jump to the first and last option, but only while the list is open', async () => {
    const { user, input } = setup()
    await user.click(input)
    await user.keyboard('{End}{Home}')
    noListbox() // they must not open a closed list

    await user.keyboard('ap') // Apple, Apricot, Grape, Grapefruit, Pineapple
    expect(highlightedName()).toBeNull()
    await user.keyboard('{End}')
    expect(highlightedName()).toBe('Pineapple')
    await user.keyboard('{Home}')
    expect(highlightedName()).toBe('Apple')

    // Arrow keys carry on from where Home/End left the highlight.
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(highlightedName()).toBe('Grape')
    await user.keyboard('{End}{ArrowUp}')
    expect(highlightedName()).toBe('Grapefruit')
    expect(input).toHaveFocus()
  })

  it('Enter selects the highlighted option: it fills the input and closes the list', async () => {
    const { user, input } = setup()
    await user.type(input, 'ap')
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(input).toHaveValue('Apricot')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).not.toHaveAttribute('aria-activedescendant')
    noListbox()
    expect(input).toHaveFocus()
  })

  it('Enter does nothing when no option is highlighted', async () => {
    const { user, input } = setup()
    await user.type(input, 'ap')
    await user.keyboard('{Enter}')

    expect(input).toHaveValue('ap')
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(optionNames()).toEqual(['Apple', 'Apricot', 'Grape', 'Grapefruit', 'Pineapple'])
  })

  it('Escape closes the list and keeps the text; a second Escape clears the input', async () => {
    const { user, input } = setup()
    await user.type(input, 'ki')
    await user.keyboard('{ArrowDown}')
    expect(highlightedName()).toBe('Kiwi')

    await user.keyboard('{Escape}')
    noListbox()
    expect(input).toHaveValue('ki')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).not.toHaveAttribute('aria-activedescendant')

    await user.keyboard('{Escape}')
    expect(input).toHaveValue('')
    noListbox()
    expect(input).toHaveFocus()

    // The list can be opened again, and it starts fresh.
    await user.keyboard('{ArrowDown}')
    expect(optionNames()).toEqual(ALL_FRUITS)
    expect(highlightedName()).toBe('Apple')
  })

  it('clicking an option selects it and keeps focus in the input', async () => {
    const { user, input } = setup()
    await user.type(input, 'gra') // Grape, Grapefruit
    expect(optionNames()).toEqual(['Grape', 'Grapefruit'])

    await user.click(screen.getByRole('option', { name: 'Grapefruit' }))

    expect(input).toHaveValue('Grapefruit')
    expect(input).toHaveFocus()
    expect(input).toHaveAttribute('aria-expanded', 'false')
    noListbox()
  })

  it('blur closes the list and keeps the typed text', async () => {
    const { user, input } = setup()
    await user.type(input, 'ap')
    expect(input).toHaveAttribute('aria-expanded', 'true')

    await user.tab()
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus()
    noListbox()
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveValue('ap')

    // Clicking somewhere else closes it too, and drops the highlight.
    await user.click(input)
    await user.keyboard('{ArrowDown}')
    expect(highlightedName()).toBe('Apple')
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }))
    noListbox()
    expect(input).not.toHaveAttribute('aria-activedescendant')
    expect(input).toHaveValue('ap')

    // Tabbing away with an option highlighted does not select it: the typed text stays.
    await user.click(input)
    await user.keyboard('{ArrowDown}')
    expect(highlightedName()).toBe('Apple')
    await user.tab()
    noListbox()
    expect(input).toHaveValue('ap')
    expect(screen.getByTestId('live-region').textContent).toBe('')
  })

  it('shows a "No results" status when nothing matches, and nothing else is selectable', async () => {
    const { user, input } = setup()
    await user.type(input, 'zzz')

    expect(screen.getByRole('status')).toHaveTextContent('No results')
    noListbox()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(input).toHaveAttribute('aria-expanded', 'false')

    // Navigation and Enter have nothing to work with and must not break anything.
    await user.keyboard('{ArrowDown}{ArrowUp}{Home}{End}{Enter}')
    expect(input).toHaveValue('zzz')
    expect(input).not.toHaveAttribute('aria-activedescendant')
    expect(screen.getByRole('status')).toHaveTextContent('No results')

    // Deleting the text brings the full list back and removes the message.
    await user.keyboard('{Backspace}{Backspace}{Backspace}')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(optionNames()).toEqual(ALL_FRUITS)

    // Escape hides the message as well.
    await user.keyboard('q')
    expect(screen.getByRole('status')).toHaveTextContent('No results')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(input).toHaveValue('q')

    // ArrowDown on a closed list with no matches opens it, but there is nothing to highlight.
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('status')).toHaveTextContent('No results')
    noListbox()
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).not.toHaveAttribute('aria-activedescendant')
    expect(screen.getByTestId('live-region').textContent).toBe('')

    // Leaving the field hides the message too.
    await user.tab()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(input).toHaveValue('q')
  })

  it('does not trim the text: spaces take part in the search', async () => {
    const { user, input } = setup()
    await user.type(input, ' ')
    expect(screen.getByRole('status')).toHaveTextContent('No results')
    noListbox()

    await user.keyboard('{Backspace}')
    expect(optionNames()).toEqual(ALL_FRUITS)

    await user.keyboard('Apple ') // "Apple" matches, "Apple " (with a trailing space) does not
    expect(input).toHaveValue('Apple ')
    expect(screen.getByRole('status')).toHaveTextContent('No results')
    noListbox()
  })

  it('announces the number of results in a polite live region', async () => {
    const { user, input } = setup()
    const region = screen.getByTestId('live-region')

    // The region is in the page from the start, so later changes get announced.
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveAttribute('aria-atomic', 'true')
    expect(region.textContent).toBe('')

    await user.type(input, 'ap')
    expect(region).toHaveTextContent('5 results available')
    await user.keyboard('p') // "app": Apple, Pineapple
    expect(region).toHaveTextContent('2 results available')

    await user.keyboard('x') // nothing matches: the status speaks, the region goes quiet
    expect(region.textContent).toBe('')
    expect(screen.getByRole('status')).toHaveTextContent('No results')
    await user.keyboard('{Backspace}')
    expect(region).toHaveTextContent('2 results available')

    await user.keyboard('{Backspace}{Backspace}{Backspace}')
    expect(region).toHaveTextContent('12 results available')
    await user.keyboard('k')
    expect(region).toHaveTextContent('1 result available')
    expect(region.textContent).not.toMatch(/1 results/)

    await user.keyboard('{Escape}')
    expect(region.textContent).toBe('')

    // The region stays quiet while closed, and is the very same element all the time.
    await user.keyboard('{ArrowDown}')
    expect(region).toHaveTextContent('1 result available') // the text is still "k"
    await user.tab()
    expect(region.textContent).toBe('')
    expect(screen.getByTestId('live-region')).toBe(region)
  })

  it('typing again clears the highlight instead of keeping a stale position', async () => {
    const { user, input } = setup()
    await user.type(input, 'ap')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(highlightedName()).toBe('Apricot')

    await user.keyboard('p') // "app": Apple, Pineapple
    expect(optionNames()).toEqual(['Apple', 'Pineapple'])
    expect(highlightedName()).toBeNull()
    expect(input).not.toHaveAttribute('aria-activedescendant')
  })

  it('after a selection the list is still filtered by the text in the input', async () => {
    const { user, input } = setup()
    await user.type(input, 'ki')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(input).toHaveValue('Kiwi')
    noListbox()

    await user.keyboard('{ArrowDown}')
    expect(optionNames()).toEqual(['Kiwi'])
    expect(highlightedName()).toBe('Kiwi')
  })

  it('keeps DOM focus in the input during every interaction', async () => {
    const { user, input } = setup()
    await user.type(input, 'a')
    expect(input).toHaveFocus()

    for (const keys of ['{ArrowDown}', '{ArrowDown}', '{End}', '{Home}', '{ArrowUp}']) {
      await user.keyboard(keys)
      expect(document.activeElement).toBe(input)
    }

    // Options are never focusable and never tab stops: no tabindex, and Tab leaves
    // the whole widget in one step.
    screen.getAllByRole('option').forEach((option) => expect(option).not.toHaveAttribute('tabindex'))
    await user.tab()
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus()

    await user.click(input)
    await user.keyboard('{ArrowDown}')
    await user.click(screen.getAllByRole('option')[0])
    expect(document.activeElement).toBe(input)
  })

  it('only cancels the default action of keys it handles, so the caret keeps working', async () => {
    const { user, input } = setup()
    await user.type(input, 'ap')
    await user.keyboard('{Escape}')
    noListbox()

    // Closed: ArrowUp, Home and End are not handled, so the browser keeps its default for them.
    expect(fireEvent.keyDown(input, { key: 'ArrowUp' })).toBe(true)
    expect(fireEvent.keyDown(input, { key: 'Home' })).toBe(true)
    expect(fireEvent.keyDown(input, { key: 'End' })).toBe(true)
    await user.keyboard('{Home}')
    expect(input.selectionStart).toBe(0)
    await user.keyboard('{End}')
    expect(input.selectionStart).toBe(2)
    noListbox()

    // ArrowDown is handled even on a closed list (it opens it).
    expect(fireEvent.keyDown(input, { key: 'ArrowDown' })).toBe(false)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    // Open: the keys that move the highlight are handled.
    expect(fireEvent.keyDown(input, { key: 'ArrowDown' })).toBe(false)
    expect(fireEvent.keyDown(input, { key: 'ArrowUp' })).toBe(false)
    expect(fireEvent.keyDown(input, { key: 'Home' })).toBe(false)
    expect(fireEvent.keyDown(input, { key: 'End' })).toBe(false)

    // Enter is handled only when an option is highlighted.
    await user.keyboard('{Home}')
    expect(highlightedName()).toBe('Apple')
    expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false)
    expect(input).toHaveValue('Apple')
    await user.keyboard('{Backspace}')
    expect(highlightedName()).toBeNull()
    expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(true)
  })

  it('keeps ids unique when the component is rendered twice', async () => {
    const user = userEvent.setup()
    render(
      <>
        <App />
        <App />
      </>,
    )
    const [first, second] = screen.getAllByRole('combobox', { name: 'Fruit' })
    expect(first).not.toBe(second)

    await user.click(first)
    await user.keyboard('{ArrowDown}')
    const firstControls = first.getAttribute('aria-controls')
    const firstOptionIds = screen.getAllByRole('option').map((option) => option.id)
    expect(document.getElementById(firstControls)).toBe(screen.getByRole('listbox'))

    // Clicking the second field closes the first list; then open the second one.
    await user.click(second)
    await user.keyboard('{ArrowDown}')
    const secondControls = second.getAttribute('aria-controls')
    const secondOptionIds = screen.getAllByRole('option').map((option) => option.id)
    expect(document.getElementById(secondControls)).toBe(screen.getByRole('listbox'))

    expect(secondControls).not.toBe(firstControls)
    expect(secondOptionIds.filter((id) => firstOptionIds.includes(id))).toEqual([])

    // No id appears twice anywhere on the page (inputs, labels, listbox, options).
    const allIds = [...document.querySelectorAll('[id]')].map((element) => element.id)
    expect(new Set(allIds).size).toBe(allIds.length)
  })
})
