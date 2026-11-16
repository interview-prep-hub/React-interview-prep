import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

// Starter data (see initialBoard in boardReducer.js):
//   To do : Write project brief, Design login page, Set up CI
//   Doing : Build API client            (limit 3)
//   Done  : Create repository

const FULL_MESSAGE = 'Doing is full (max 3)'

const region = (name) => screen.getByRole('region', { name })
const inColumn = (name) => within(region(name))
const count = (name) => inColumn(name).getByTestId('count')
const cardItems = (name) => inColumn(name).queryAllByRole('listitem')
// Every card is an <li>. This returns queries scoped to the card with that text.
const card = (text) => within(screen.getByText(text).closest('li'))
const button = (text, name) => card(text).getByRole('button', { name })
const addInput = (name) => inColumn(name).getByRole('textbox', { name: 'Add card' })
const addButton = (name) => inColumn(name).getByRole('button', { name: 'Add card' })

// Moves two cards from To do into Doing, so Doing holds 3 cards (its limit).
async function fillDoing(user) {
  await user.click(button('Write project brief', 'Move right'))
  await user.click(button('Design login page', 'Move right'))
}

describe('25 Kanban board: layout', () => {
  it('shows the columns To do, Doing and Done in that order with the starter cards', () => {
    render(<App />)

    const regions = screen.getAllByRole('region')
    expect(regions.map((r) => r.getAttribute('aria-label'))).toEqual(['To do', 'Doing', 'Done'])

    const todo = cardItems('To do')
    expect(todo).toHaveLength(3)
    expect(todo[0]).toHaveTextContent('Write project brief')
    expect(todo[1]).toHaveTextContent('Design login page')
    expect(todo[2]).toHaveTextContent('Set up CI')

    const doing = cardItems('Doing')
    expect(doing).toHaveLength(1)
    expect(doing[0]).toHaveTextContent('Build API client')

    const done = cardItems('Done')
    expect(done).toHaveLength(1)
    expect(done[0]).toHaveTextContent('Create repository')
  })

  it('gives every column a heading with its title and a list that holds its cards', () => {
    render(<App />)

    for (const name of ['To do', 'Doing', 'Done']) {
      expect(inColumn(name).getByRole('heading', { name: new RegExp(`^${name}`) })).toBeInTheDocument()
      expect(inColumn(name).getByRole('list')).toBeInTheDocument()
    }
    const todoList = inColumn('To do').getByRole('list')
    expect(within(todoList).getAllByRole('listitem')).toHaveLength(3)
  })

  it('shows the number of cards in every column header', () => {
    render(<App />)
    expect(count('To do')).toHaveTextContent(/^3$/)
    expect(count('Doing')).toHaveTextContent(/^1$/)
    expect(count('Done')).toHaveTextContent(/^1$/)
  })

  it('gives every card Move left, Move right and Delete buttons', () => {
    render(<App />)
    const texts = [
      'Write project brief',
      'Design login page',
      'Set up CI',
      'Build API client',
      'Create repository',
    ]
    for (const text of texts) {
      expect(button(text, 'Move left')).toBeInTheDocument()
      expect(button(text, 'Move right')).toBeInTheDocument()
      expect(button(text, 'Delete')).toBeInTheDocument()
    }
  })

  it('disables Move left in the first column and Move right in the last column', () => {
    render(<App />)

    expect(button('Write project brief', 'Move left')).toBeDisabled()
    expect(button('Write project brief', 'Move right')).toBeEnabled()

    expect(button('Build API client', 'Move left')).toBeEnabled()
    expect(button('Build API client', 'Move right')).toBeEnabled()

    expect(button('Create repository', 'Move right')).toBeDisabled()
    expect(button('Create repository', 'Move left')).toBeEnabled()
  })
})

describe('25 Kanban board: moving and deleting', () => {
  it('moves a card to the right, to the end of the next column', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(button('Design login page', 'Move right'))

    expect(inColumn('To do').queryByText('Design login page')).not.toBeInTheDocument()
    const doing = cardItems('Doing')
    expect(doing).toHaveLength(2)
    expect(doing[0]).toHaveTextContent('Build API client')
    expect(doing[1]).toHaveTextContent('Design login page')
    expect(count('To do')).toHaveTextContent(/^2$/)
    expect(count('Doing')).toHaveTextContent(/^2$/)
    expect(count('Done')).toHaveTextContent(/^1$/)
  })

  it('moves a card to the left, to the end of the previous column', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(button('Create repository', 'Move left'))
    await user.click(button('Build API client', 'Move left'))

    const doing = cardItems('Doing')
    expect(doing).toHaveLength(1)
    expect(doing[0]).toHaveTextContent('Create repository')

    const todo = cardItems('To do')
    expect(todo).toHaveLength(4)
    expect(todo[3]).toHaveTextContent('Build API client')
    expect(count('Done')).toHaveTextContent(/^0$/)
  })

  it('lets a card travel across all three columns and back', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(button('Set up CI', 'Move right'))
    await user.click(button('Set up CI', 'Move right'))
    expect(inColumn('Done').getByText('Set up CI')).toBeInTheDocument()
    expect(button('Set up CI', 'Move right')).toBeDisabled()

    await user.click(button('Set up CI', 'Move left'))
    await user.click(button('Set up CI', 'Move left'))
    expect(inColumn('To do').getByText('Set up CI')).toBeInTheDocument()
    expect(button('Set up CI', 'Move left')).toBeDisabled()
    expect(count('To do')).toHaveTextContent(/^3$/)
  })

  it('deletes a card and lowers the count', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(button('Build API client', 'Delete'))

    expect(screen.queryByText('Build API client')).not.toBeInTheDocument()
    expect(count('Doing')).toHaveTextContent(/^0$/)
    expect(cardItems('Doing')).toHaveLength(0)
    // The other columns are untouched.
    expect(count('To do')).toHaveTextContent(/^3$/)
    expect(count('Done')).toHaveTextContent(/^1$/)
  })
})

describe('25 Kanban board: adding cards', () => {
  it('adds a card to the column whose form was used and clears the input', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(addInput('Done'), 'Celebrate')
    await user.click(addButton('Done'))

    const done = cardItems('Done')
    expect(done).toHaveLength(2)
    expect(done[1]).toHaveTextContent('Celebrate')
    expect(count('Done')).toHaveTextContent(/^2$/)
    expect(addInput('Done')).toHaveValue('')
    // Nothing leaked into the other columns.
    expect(count('To do')).toHaveTextContent(/^3$/)
    expect(count('Doing')).toHaveTextContent(/^1$/)
  })

  it('adds a card when the user presses Enter in the input', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(addInput('To do'), 'Plan the demo{Enter}')

    const todo = cardItems('To do')
    expect(todo).toHaveLength(4)
    expect(todo[3]).toHaveTextContent('Plan the demo')
    expect(addInput('To do')).toHaveValue('')
  })

  it('does not add a card when the text is empty or only spaces', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(addButton('To do'))
    await user.type(addInput('To do'), '   ')
    await user.click(addButton('To do'))

    expect(cardItems('To do')).toHaveLength(3)
    expect(count('To do')).toHaveTextContent(/^3$/)
    expect(count('Doing')).toHaveTextContent(/^1$/)
    expect(count('Done')).toHaveTextContent(/^1$/)
  })

  it('does not let the browser reload the page when a form is submitted', async () => {
    const user = userEvent.setup()
    render(<App />)

    // A submit event that nobody cancels would reload the page in a real browser.
    // React handles the event first, so by the time it bubbles up to the
    // document, defaultPrevented tells us if the form handler cancelled it.
    const submits = []
    const record = (event) => submits.push(event)
    document.addEventListener('submit', record)
    try {
      await user.type(addInput('To do'), 'First{Enter}')
      await user.type(addInput('Done'), 'Second')
      await user.click(addButton('Done'))
    } finally {
      document.removeEventListener('submit', record)
    }

    expect(submits).toHaveLength(2)
    submits.forEach((event) => expect(event.defaultPrevented).toBe(true))
  })

  it('keeps a separate draft text for every column', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(addInput('To do'), 'half typed')
    await user.type(addInput('Done'), 'Celebrate')
    await user.click(addButton('Done'))

    expect(inColumn('Done').getByText('Celebrate')).toBeInTheDocument()
    expect(addInput('Done')).toHaveValue('')
    expect(addInput('To do')).toHaveValue('half typed')
    expect(cardItems('To do')).toHaveLength(3)
  })

  it('deletes the right card when two cards have the same text', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(addInput('To do'), 'Review{Enter}')
    await user.type(addInput('Done'), 'Review{Enter}')
    await user.type(addInput('Done'), 'Review{Enter}')

    expect(screen.getAllByText('Review')).toHaveLength(3)
    expect(count('Done')).toHaveTextContent(/^3$/)
    // Delete the first of the two cards in Done.
    const doneReview = within(cardItems('Done')[1])
    await user.click(doneReview.getByRole('button', { name: 'Delete' }))

    // The other Review in Done and the one in To do are still there.
    expect(inColumn('Done').getAllByText('Review')).toHaveLength(1)
    expect(count('Done')).toHaveTextContent(/^2$/)
    expect(inColumn('To do').getByText('Review')).toBeInTheDocument()
    // Only one card was deleted: the three starter cards and the new Review remain in To do.
    expect(count('To do')).toHaveTextContent(/^4$/)
  })
})

describe('25 Kanban board: WIP limit on Doing', () => {
  it('shows no warning while Doing has room', () => {
    render(<App />)
    expect(screen.queryByText(FULL_MESSAGE)).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(button('Set up CI', 'Move right')).toBeEnabled()
  })

  it('blocks a fourth card: shows the message and disables the moves into Doing', async () => {
    const user = userEvent.setup()
    render(<App />)

    await fillDoing(user)

    expect(count('Doing')).toHaveTextContent(/^3$/)
    // The message is a status message inside the Doing column.
    expect(inColumn('Doing').getByRole('status')).toHaveTextContent(/^Doing is full \(max 3\)$/)
    expect(screen.getByText(FULL_MESSAGE)).toBeInTheDocument()

    // To do -> Doing and Done -> Doing are both blocked.
    expect(button('Set up CI', 'Move right')).toBeDisabled()
    expect(button('Create repository', 'Move left')).toBeDisabled()

    // Clicking a disabled button changes nothing.
    await user.click(button('Set up CI', 'Move right'))
    expect(count('Doing')).toHaveTextContent(/^3$/)
    expect(count('To do')).toHaveTextContent(/^1$/)
  })

  it('still lets cards leave a full Doing column', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fillDoing(user)

    expect(button('Build API client', 'Move left')).toBeEnabled()
    expect(button('Build API client', 'Move right')).toBeEnabled()
    expect(button('Write project brief', 'Move left')).toBeEnabled()
    expect(button('Design login page', 'Move right')).toBeEnabled()
  })

  it('blocks adding a card to a full Doing column but not to other columns', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fillDoing(user)

    expect(addButton('Doing')).toBeDisabled()
    expect(addButton('To do')).toBeEnabled()
    expect(addButton('Done')).toBeEnabled()

    await user.type(addInput('Done'), 'Still works')
    await user.click(addButton('Done'))
    expect(inColumn('Done').getByText('Still works')).toBeInTheDocument()
    expect(count('Doing')).toHaveTextContent(/^3$/)
  })

  it('frees the slot when a card leaves Doing, and fills it again', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fillDoing(user)

    // Doing -> Done frees a slot.
    await user.click(button('Build API client', 'Move right'))
    expect(screen.queryByText(FULL_MESSAGE)).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(count('Doing')).toHaveTextContent(/^2$/)
    expect(button('Set up CI', 'Move right')).toBeEnabled()
    expect(addButton('Doing')).toBeEnabled()

    // The freed slot can be used again.
    await user.click(button('Set up CI', 'Move right'))
    expect(count('Doing')).toHaveTextContent(/^3$/)
    expect(screen.getByText(FULL_MESSAGE)).toBeInTheDocument()
  })

  it('also frees the slot when a card in Doing is deleted', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fillDoing(user)
    expect(screen.getByText(FULL_MESSAGE)).toBeInTheDocument()

    await user.click(button('Design login page', 'Delete'))

    expect(screen.queryByText(FULL_MESSAGE)).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(count('Doing')).toHaveTextContent(/^2$/)
    expect(button('Set up CI', 'Move right')).toBeEnabled()
    expect(button('Create repository', 'Move left')).toBeEnabled()
  })

  it('can fill Doing by adding cards directly, up to the limit', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(addInput('Doing'), 'Second{Enter}')
    await user.type(addInput('Doing'), 'Third{Enter}')

    expect(count('Doing')).toHaveTextContent(/^3$/)
    expect(screen.getByText(FULL_MESSAGE)).toBeInTheDocument()
    expect(button('Set up CI', 'Move right')).toBeDisabled()
  })
})
