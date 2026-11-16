import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App, { Accordion } from './App.jsx'

// The four FAQ entries that App must show, in this order (see README).
const FAQ = [
  {
    title: 'What is React?',
    text: 'React is a JavaScript library for building user interfaces out of components.',
  },
  {
    title: 'What is JSX?',
    text: 'JSX is a syntax that lets you write markup inside JavaScript.',
  },
  {
    title: 'What is state?',
    text: 'State is data that a component remembers between renders.',
  },
  {
    title: 'What are props?',
    text: 'Props are inputs that a parent component passes to a child component.',
  },
]
const [reactQ, jsxQ, stateQ, propsQ] = FAQ

// A header is found by its exact accessible name: the title, with no extra text.
const headerByTitle = (title) => screen.getByRole('button', { name: title })
const header = (entry) => headerByTitle(entry.title)

// A panel is "closed" when it is not in the DOM, or when it is in the DOM but
// not visible (for example it has the `hidden` attribute).
function expectPanel(text, shouldBeOpen) {
  if (shouldBeOpen) {
    expect(screen.getByText(text)).toBeVisible()
  } else {
    const panel = screen.queryByText(text)
    if (panel) expect(panel).not.toBeVisible()
  }
}

// One item: its header (aria-expanded) and its panel must both agree with `isOpen`.
function expectItem(title, text, isOpen) {
  expect(headerByTitle(title)).toHaveAttribute('aria-expanded', String(isOpen))
  expectPanel(text, isOpen)
}

// Checks every FAQ entry: the listed ones are open, all the others are closed.
function expectOnlyOpen(...openEntries) {
  for (const entry of FAQ) {
    expectItem(entry.title, entry.text, openEntries.includes(entry))
  }
}

describe('02 Accordion (one panel open at a time)', () => {
  it('shows the four FAQ headers as real buttons, in order', () => {
    render(<App />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
    FAQ.forEach((entry, index) => {
      expect(buttons[index]).toHaveAccessibleName(entry.title)
      expect(buttons[index].tagName).toBe('BUTTON')
    })
  })

  it('starts with every panel closed', () => {
    render(<App />)
    expectOnlyOpen()
  })

  it('opens a panel when its header is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(header(jsxQ))
    expectOnlyOpen(jsxQ)
  })

  it('closes the open panel when another header is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(header(reactQ))
    expectOnlyOpen(reactQ)
    await user.click(header(stateQ))
    expectOnlyOpen(stateQ)
  })

  it('closes the open panel when its own header is clicked again', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(header(propsQ))
    expectOnlyOpen(propsQ)
    await user.click(header(propsQ))
    expectOnlyOpen()
  })

  it('never has more than one panel open during a longer sequence of clicks', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(header(jsxQ))
    expectOnlyOpen(jsxQ)
    await user.click(header(propsQ))
    expectOnlyOpen(propsQ)
    await user.click(header(propsQ))
    expectOnlyOpen()
    await user.click(header(reactQ))
    expectOnlyOpen(reactQ)
    await user.click(header(reactQ))
    expectOnlyOpen()
    await user.click(header(reactQ))
    expectOnlyOpen(reactQ)
    await user.click(header(jsxQ))
    expectOnlyOpen(jsxQ)
  })

  it('works with the keyboard (Tab, Enter and Space)', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.tab()
    expect(header(reactQ)).toHaveFocus()
    await user.keyboard('{Enter}')
    expectOnlyOpen(reactQ)

    await user.tab()
    expect(header(jsxQ)).toHaveFocus()
    await user.keyboard(' ')
    expectOnlyOpen(jsxQ)

    await user.keyboard(' ')
    expectOnlyOpen()
  })

  it('Accordion shows whatever items it receives, and does not change them', async () => {
    const user = userEvent.setup()
    // Frozen on purpose: props are read-only, so changing them throws an error.
    const items = Object.freeze(
      [
        { id: 'one', title: 'Alpha question', content: 'Alpha answer' },
        { id: 'two', title: 'Beta question', content: 'Beta answer' },
        { id: 'three', title: 'Gamma question', content: 'Gamma answer' },
        { id: 'four', title: 'Delta question', content: 'Delta answer' },
      ].map((item) => Object.freeze(item)),
    )
    render(<Accordion items={items} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
    buttons.forEach((button) => expect(button).toHaveAttribute('aria-expanded', 'false'))
    expectItem('Alpha question', 'Alpha answer', false)

    await user.click(headerByTitle('Beta question'))
    expectItem('Alpha question', 'Alpha answer', false)
    expectItem('Beta question', 'Beta answer', true)
    expectItem('Gamma question', 'Gamma answer', false)

    await user.click(headerByTitle('Gamma question'))
    expectItem('Beta question', 'Beta answer', false)
    expectItem('Gamma question', 'Gamma answer', true)
    expectItem('Delta question', 'Delta answer', false)
  })

  it('Accordion always shows the items it currently receives', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <Accordion items={[{ id: 'one', title: 'Alpha question', content: 'Alpha answer' }]} />,
    )
    expect(headerByTitle('Alpha question')).toBeInTheDocument()

    // The parent passes a completely different list.
    rerender(
      <Accordion
        items={[
          { id: 'five', title: 'Epsilon question', content: 'Epsilon answer' },
          { id: 'six', title: 'Zeta question', content: 'Zeta answer' },
        ]}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Alpha question' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)

    await user.click(headerByTitle('Zeta question'))
    expectItem('Epsilon question', 'Epsilon answer', false)
    expectItem('Zeta question', 'Zeta answer', true)
  })

  it('each Accordion keeps its own open item', async () => {
    const user = userEvent.setup()
    const first = [
      { id: 'a1', title: 'First A', content: 'Answer A1' },
      { id: 'a2', title: 'Second A', content: 'Answer A2' },
    ]
    const second = [
      { id: 'b1', title: 'First B', content: 'Answer B1' },
      { id: 'b2', title: 'Second B', content: 'Answer B2' },
    ]
    // A function, so that every call creates fresh elements for rerender().
    const twoAccordions = () => (
      <>
        <Accordion items={first} />
        <Accordion items={second} />
      </>
    )
    const { rerender } = render(twoAccordions())

    await user.click(headerByTitle('First A'))
    await user.click(headerByTitle('Second B'))
    expectItem('First A', 'Answer A1', true)
    expectItem('Second B', 'Answer B2', true)

    // Opening another item in the first accordion must not touch the second one.
    await user.click(headerByTitle('Second A'))
    expectItem('First A', 'Answer A1', false)
    expectItem('Second A', 'Answer A2', true)
    expectItem('First B', 'Answer B1', false)
    expectItem('Second B', 'Answer B2', true)

    // Rendering both again (as a parent re-render would) must keep the same picture.
    rerender(twoAccordions())
    expectItem('First A', 'Answer A1', false)
    expectItem('Second A', 'Answer A2', true)
    expectItem('First B', 'Answer B1', false)
    expectItem('Second B', 'Answer B2', true)
  })
})
