import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

// This file checks that the screen is built from the board DATA and not from
// hard-coded names. The test replaces `initialBoard` (exported by
// boardReducer.js) with a different board: other column names, four columns,
// and limits on the first and on the third column.
//
//   Backlog (limit 2): Alpha, Beta     <- full from the start
//   Review            : Gamma
//   QA (limit 1)      : (empty)
//   Shipped           : (empty)
//
// So import `initialBoard` from './boardReducer.js' in App.jsx, and take the
// titles, the limits and the number of columns from it.
vi.mock('./boardReducer.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    initialBoard: {
      nextId: 20,
      columns: [
        {
          id: 'backlog',
          title: 'Backlog',
          limit: 2,
          cards: [
            { id: 'card-1', text: 'Alpha' },
            { id: 'card-2', text: 'Beta' },
          ],
        },
        { id: 'review', title: 'Review', cards: [{ id: 'card-3', text: 'Gamma' }] },
        { id: 'qa', title: 'QA', limit: 1, cards: [] },
        { id: 'shipped', title: 'Shipped', cards: [] },
      ],
    },
  }
})

const region = (name) => screen.getByRole('region', { name })
const inColumn = (name) => within(region(name))
const count = (name) => inColumn(name).getByTestId('count')
const cardItems = (name) => inColumn(name).queryAllByRole('listitem')
const button = (text, name) => within(screen.getByText(text).closest('li')).getByRole('button', { name })
const addInput = (name) => inColumn(name).getByRole('textbox', { name: 'Add card' })
const addButton = (name) => inColumn(name).getByRole('button', { name: 'Add card' })

describe('25 Kanban board: built from the board data', () => {
  it('renders one column per entry of the data, in order, with its cards and count', () => {
    render(<App />)

    const names = screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))
    expect(names).toEqual(['Backlog', 'Review', 'QA', 'Shipped'])

    expect(count('Backlog')).toHaveTextContent(/^2$/)
    expect(count('Review')).toHaveTextContent(/^1$/)
    expect(count('QA')).toHaveTextContent(/^0$/)
    expect(count('Shipped')).toHaveTextContent(/^0$/)
    expect(cardItems('Backlog')[0]).toHaveTextContent('Alpha')
    expect(cardItems('Backlog')[1]).toHaveTextContent('Beta')
    expect(cardItems('Review')[0]).toHaveTextContent('Gamma')
  })

  it('builds the full message from the title and the limit of the column', () => {
    render(<App />)

    // Only Backlog is full. QA has a limit too, but it is empty.
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(inColumn('Backlog').getByRole('status')).toHaveTextContent(/^Backlog is full \(max 2\)$/)
    expect(inColumn('QA').queryByRole('status')).not.toBeInTheDocument()
  })

  it('works out the move buttons from the neighbour columns, also at the edges', () => {
    render(<App />)

    // Backlog is the first column: no left. Review (right neighbour) has no limit.
    expect(button('Alpha', 'Move left')).toBeDisabled()
    expect(button('Alpha', 'Move right')).toBeEnabled()

    // Gamma: Backlog on the left is full, QA on the right has room.
    expect(button('Gamma', 'Move left')).toBeDisabled()
    expect(button('Gamma', 'Move right')).toBeEnabled()
  })

  it('fills a column up to its own limit, then blocks Add and moves into it', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(addButton('Backlog')).toBeDisabled()
    expect(addButton('QA')).toBeEnabled()

    await user.click(button('Gamma', 'Move right')) // Review -> QA (limit 1)

    expect(count('QA')).toHaveTextContent(/^1$/)
    expect(count('Review')).toHaveTextContent(/^0$/)
    expect(inColumn('QA').getByRole('status')).toHaveTextContent(/^QA is full \(max 1\)$/)
    expect(addButton('QA')).toBeDisabled()
    expect(button('Gamma', 'Move right')).toBeEnabled() // Shipped has no limit
    expect(screen.getAllByRole('status')).toHaveLength(2)

    // A new card in Review cannot move into the full QA column.
    await user.type(addInput('Review'), 'Delta{Enter}')
    expect(button('Delta', 'Move right')).toBeDisabled()
    expect(button('Delta', 'Move left')).toBeDisabled() // Backlog is full too
  })

  it('frees a column when a card leaves it, using the column that owns the card', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(button('Alpha', 'Delete'))

    expect(inColumn('Backlog').queryByRole('status')).not.toBeInTheDocument()
    expect(count('Backlog')).toHaveTextContent(/^1$/)
    expect(addButton('Backlog')).toBeEnabled()
    expect(button('Gamma', 'Move left')).toBeEnabled()

    await user.click(button('Gamma', 'Move left'))
    expect(cardItems('Backlog')).toHaveLength(2)
    expect(inColumn('Backlog').getByRole('status')).toBeInTheDocument()
  })

  it('adds a card to the column whose form was used, whatever the column ids are', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(addInput('Shipped'), 'Release notes{Enter}')
    await user.type(addInput('Review'), 'Another{Enter}')

    expect(cardItems('Shipped')).toHaveLength(1)
    expect(cardItems('Shipped')[0]).toHaveTextContent('Release notes')
    expect(cardItems('Review')).toHaveLength(2)
    expect(cardItems('Review')[1]).toHaveTextContent('Another')
    expect(count('Backlog')).toHaveTextContent(/^2$/)
    expect(count('QA')).toHaveTextContent(/^0$/)
  })
})
