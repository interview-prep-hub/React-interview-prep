import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

const LABELS = ['About', 'Pricing', 'Contact']

const CONTENT = {
  About: 'Acme builds small, friendly tools for busy teams.',
  Pricing: 'Plans start at 9 dollars per month.',
  Contact: 'Write to hello@acme.test and we reply within a day.',
}

const getTab = (name) => screen.getByRole('tab', { name })

// Asserts the whole visible state: which tab is selected and which panel shows.
function expectActive(name) {
  LABELS.forEach((label) => {
    expect(getTab(label)).toHaveAttribute('aria-selected', String(label === name))
  })
  // hidden: true also counts panels that are only hidden, not removed from the DOM.
  expect(screen.getAllByRole('tabpanel', { hidden: true })).toHaveLength(1)
  const panel = screen.getByRole('tabpanel', { name })
  expect(panel).toHaveTextContent(CONTENT[name])
}

// Puts keyboard focus on the first tab the way a keyboard user does: with Tab.
async function focusFirstTab(user) {
  await user.tab()
  expect(getTab('About')).toHaveFocus()
}

describe('05 Tabs (ARIA tabs pattern)', () => {
  it('renders a labelled tablist with the three tabs in order', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Tabs' })).toBeInTheDocument()
    const list = screen.getByRole('tablist', { name: 'Product information' })
    const tabs = within(list).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(LABELS)
  })

  it('uses a <button type="button"> for every tab', () => {
    render(<App />)
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab.tagName).toBe('BUTTON')
      expect(tab).toHaveAttribute('type', 'button')
    }
  })

  it('starts on the first tab, renders only its panel and does not take focus', () => {
    render(<App />)
    expectActive('About')
    // Rendering must not move keyboard focus (document.body is the "nothing focused" state).
    expect(document.body).toHaveFocus()
    expect(screen.queryByText(CONTENT.Pricing)).not.toBeInTheDocument()
    expect(screen.queryByText(CONTENT.Contact)).not.toBeInTheDocument()
  })

  it('clicking a tab selects it and swaps the panel', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(getTab('Pricing'))
    expectActive('Pricing')
    expect(screen.queryByText(CONTENT.About)).not.toBeInTheDocument()

    await user.click(getTab('Contact'))
    expectActive('Contact')
    expect(screen.queryByText(CONTENT.Pricing)).not.toBeInTheDocument()

    await user.click(getTab('About'))
    expectActive('About')

    // Clicking the tab that is already active changes nothing.
    await user.click(getTab('About'))
    expectActive('About')
  })

  it('links the active tab and its panel with aria-controls and aria-labelledby', async () => {
    const user = userEvent.setup()
    render(<App />)

    for (const label of LABELS) {
      await user.click(getTab(label))
      const tab = getTab(label)
      const panel = screen.getByRole('tabpanel')
      expect(tab.id).not.toBe('')
      expect(panel.id).not.toBe('')
      expect(tab).toHaveAttribute('aria-controls', panel.id)
      expect(panel).toHaveAttribute('aria-labelledby', tab.id)
    }
  })

  it('gives every tab its own id and its own aria-controls value', () => {
    render(<App />)
    const tabs = screen.getAllByRole('tab')
    const ids = tabs.map((t) => t.id)
    const controls = tabs.map((t) => t.getAttribute('aria-controls'))
    expect(ids.every(Boolean)).toBe(true)
    expect(controls.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(3)
    expect(new Set(controls).size).toBe(3)
  })

  it('keeps the same ids when the active tab changes', async () => {
    const user = userEvent.setup()
    render(<App />)
    const tabIds = () => LABELS.map((label) => getTab(label).id)
    const controls = () => LABELS.map((label) => getTab(label).getAttribute('aria-controls'))
    const idsAtStart = tabIds()
    const controlsAtStart = controls()

    await user.click(getTab('Pricing'))
    await user.click(getTab('Contact'))
    await user.click(getTab('About'))

    expect(tabIds()).toEqual(idsAtStart)
    expect(controls()).toEqual(controlsAtStart)
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', controlsAtStart[0])
  })

  it('keeps ids unique when two tab sets are on the same page', () => {
    const first = render(<App />)
    const second = render(<App />)

    for (const { container } of [first, second]) {
      const scope = within(container)
      const tab = scope.getByRole('tab', { name: 'About' })
      const panel = scope.getByRole('tabpanel')
      // document.getElementById returns the FIRST match, so clashing ids would
      // point the second set at the first set's elements.
      expect(document.getElementById(tab.getAttribute('aria-controls'))).toBe(panel)
      expect(document.getElementById(panel.getAttribute('aria-labelledby'))).toBe(tab)
    }
  })

  it('keeps two tab sets on the same page independent', async () => {
    const user = userEvent.setup()
    const first = within(render(<App />).container)
    const second = within(render(<App />).container)

    // Use the keyboard in the FIRST set: it moves, and focus stays inside it.
    await user.click(first.getByRole('tab', { name: 'About' }))
    await user.keyboard('{ArrowRight}')
    expect(first.getByRole('tab', { name: 'Pricing' })).toHaveAttribute('aria-selected', 'true')
    expect(first.getByRole('tab', { name: 'Pricing' })).toHaveFocus()
    expect(first.getByRole('tabpanel')).toHaveTextContent(CONTENT.Pricing)
    // The second set did not notice anything.
    expect(second.getByRole('tab', { name: 'About' })).toHaveAttribute('aria-selected', 'true')
    expect(second.getByRole('tabpanel')).toHaveTextContent(CONTENT.About)

    // Now the same in the SECOND set.
    await user.click(second.getByRole('tab', { name: 'About' }))
    await user.keyboard('{End}')
    expect(second.getByRole('tab', { name: 'Contact' })).toHaveAttribute('aria-selected', 'true')
    expect(second.getByRole('tab', { name: 'Contact' })).toHaveFocus()
    expect(second.getByRole('tabpanel')).toHaveTextContent(CONTENT.Contact)
    expect(first.getByRole('tab', { name: 'Pricing' })).toHaveAttribute('aria-selected', 'true')
    expect(first.getByRole('tabpanel')).toHaveTextContent(CONTENT.Pricing)
  })

  it('uses a roving tabindex: only the active tab has tabindex 0', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(getTab('About')).toHaveAttribute('tabindex', '0')
    expect(getTab('Pricing')).toHaveAttribute('tabindex', '-1')
    expect(getTab('Contact')).toHaveAttribute('tabindex', '-1')

    await user.click(getTab('Pricing'))
    expect(getTab('Pricing')).toHaveAttribute('tabindex', '0')
    expect(getTab('About')).toHaveAttribute('tabindex', '-1')
    expect(getTab('Contact')).toHaveAttribute('tabindex', '-1')
  })

  it('the Tab key stops only on the active tab and can leave the tab row', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button>before</button>
        <App />
        <button>after</button>
      </>,
    )
    const before = screen.getByRole('button', { name: 'before' })
    const after = screen.getByRole('button', { name: 'after' })
    await user.click(getTab('Pricing'))

    // Forward with Tab: the only tab we land on is the active one, and focus is not trapped.
    await user.click(before)
    const forward = []
    for (let i = 0; i < 4; i++) {
      await user.tab()
      forward.push(document.activeElement)
    }
    const forwardTabs = forward.filter((el) => el.getAttribute('role') === 'tab')
    expect(new Set(forwardTabs)).toEqual(new Set([getTab('Pricing')]))
    expect(forward).toContain(after)

    // Backward with Shift+Tab: the same rules.
    await user.click(after)
    const backward = []
    for (let i = 0; i < 4; i++) {
      await user.tab({ shift: true })
      backward.push(document.activeElement)
    }
    const backwardTabs = backward.filter((el) => el.getAttribute('role') === 'tab')
    expect(new Set(backwardTabs)).toEqual(new Set([getTab('Pricing')]))
    expect(backward).toContain(before)
  })

  it('ArrowRight selects and focuses the next tab', async () => {
    const user = userEvent.setup()
    render(<App />)
    await focusFirstTab(user)

    await user.keyboard('{ArrowRight}')
    expectActive('Pricing')
    expect(getTab('Pricing')).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expectActive('Contact')
    expect(getTab('Contact')).toHaveFocus()
  })

  it('ArrowRight on the last tab wraps around to the first', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(getTab('Contact'))

    await user.keyboard('{ArrowRight}')
    expectActive('About')
    expect(getTab('About')).toHaveFocus()
  })

  it('ArrowLeft selects and focuses the previous tab', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(getTab('Contact'))

    await user.keyboard('{ArrowLeft}')
    expectActive('Pricing')
    expect(getTab('Pricing')).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expectActive('About')
    expect(getTab('About')).toHaveFocus()
  })

  it('ArrowLeft on the first tab wraps around to the last', async () => {
    const user = userEvent.setup()
    render(<App />)
    await focusFirstTab(user)

    await user.keyboard('{ArrowLeft}')
    expectActive('Contact')
    expect(getTab('Contact')).toHaveFocus()
  })

  it('Home jumps to the first tab and End jumps to the last tab', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(getTab('Pricing'))

    await user.keyboard('{End}')
    expectActive('Contact')
    expect(getTab('Contact')).toHaveFocus()

    await user.keyboard('{Home}')
    expectActive('About')
    expect(getTab('About')).toHaveFocus()

    // Already on the edge: nothing changes.
    await user.keyboard('{Home}')
    expectActive('About')
    expect(getTab('About')).toHaveFocus()
  })

  it('keeps moving from the latest tab when keys are pressed quickly', async () => {
    const user = userEvent.setup()
    render(<App />)
    await focusFirstTab(user)

    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')
    expectActive('About')
    expect(getTab('About')).toHaveFocus()

    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expectActive('Pricing')
    expect(getTab('Pricing')).toHaveFocus()
  })

  it('moves the roving tabindex along with the keyboard selection', async () => {
    const user = userEvent.setup()
    render(<App />)
    await focusFirstTab(user)

    await user.keyboard('{ArrowRight}')
    expect(getTab('Pricing')).toHaveAttribute('tabindex', '0')
    expect(getTab('About')).toHaveAttribute('tabindex', '-1')
    expect(getTab('Contact')).toHaveAttribute('tabindex', '-1')

    await user.keyboard('{End}')
    expect(getTab('Contact')).toHaveAttribute('tabindex', '0')
    expect(getTab('Pricing')).toHaveAttribute('tabindex', '-1')
  })

  it('ignores keys it does not handle', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(getTab('Pricing'))

    await user.keyboard('{ArrowDown}{ArrowUp}x')
    expectActive('Pricing')
    expect(getTab('Pricing')).toHaveFocus()
  })

  it('cancels the default action of the keys it handles, and of no other key', () => {
    render(<App />)
    const activeTab = () => screen.getByRole('tab', { selected: true })

    // fireEvent returns false when the event was cancelled with preventDefault().
    // A cancelled ArrowRight, ArrowLeft, Home or End means the page does not scroll.
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
      expect(fireEvent.keyDown(activeTab(), { key }), key).toBe(false)
    }
    // Every other key keeps its normal browser behaviour. Tab in particular
    // must stay free to move focus out of the tab row.
    for (const key of ['ArrowDown', 'ArrowUp', 'Tab', 'x']) {
      expect(fireEvent.keyDown(activeTab(), { key }), key).toBe(true)
    }
  })
})
