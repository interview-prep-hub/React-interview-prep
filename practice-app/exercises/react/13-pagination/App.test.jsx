import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

// Rendering and many clicks can be slow on a busy or old machine: allow more time.
vi.setConfig({ testTimeout: 20000 })

const pageSizeSelect = () => screen.getByRole('combobox', { name: 'Page size' })

// Text of every item currently shown in the list.
function shownItems() {
  const list = screen.getByRole('list', { name: 'Items' })
  return within(list)
    .getAllByRole('listitem')
    .map((li) => li.textContent)
}

// Text of the numbered page buttons (everything in the nav except Previous and Next).
function pageNumberLabels() {
  const nav = screen.getByRole('navigation', { name: 'Pagination' })
  return within(nav)
    .getAllByRole('button')
    .map((button) => button.textContent)
    .filter((text) => text !== 'Previous' && text !== 'Next')
}

const click = (user, name) => user.click(screen.getByRole('button', { name }))

describe('13 Pagination: the App', () => {
  it('starts on page 1 with 10 items per page', () => {
    render(<App />)
    expect(screen.getByText('Showing 1-10 of 53')).toBeInTheDocument()
    expect(shownItems()).toEqual([
      'Item 1',
      'Item 2',
      'Item 3',
      'Item 4',
      'Item 5',
      'Item 6',
      'Item 7',
      'Item 8',
      'Item 9',
      'Item 10',
    ])
    expect(pageSizeSelect()).toHaveValue('10')
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page')
  })

  it('offers the page sizes 5, 10 and 20', () => {
    render(<App />)
    const options = within(pageSizeSelect())
      .getAllByRole('option')
      .map((option) => option.textContent)
    expect(options).toEqual(['5', '10', '20'])
  })

  it('shows the first five page numbers at the start (53 items / 10 = 6 pages)', () => {
    render(<App />)
    expect(pageNumberLabels()).toEqual(['1', '2', '3', '4', '5'])
  })

  it('Next shows the following 10 items and updates the summary', async () => {
    const user = userEvent.setup()
    render(<App />)
    await click(user, 'Next')
    expect(screen.getByText('Showing 11-20 of 53')).toBeInTheDocument()
    expect(shownItems()).toHaveLength(10)
    expect(shownItems()[0]).toBe('Item 11')
    expect(shownItems()[9]).toBe('Item 20')
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
  })

  it('Previous goes back one page', async () => {
    const user = userEvent.setup()
    render(<App />)
    await click(user, 'Next')
    await click(user, 'Next')
    expect(screen.getByText('Showing 21-30 of 53')).toBeInTheDocument()
    await click(user, 'Previous')
    expect(screen.getByText('Showing 11-20 of 53')).toBeInTheDocument()
    expect(shownItems()[0]).toBe('Item 11')
  })

  it('clicking a page number jumps straight to that page', async () => {
    const user = userEvent.setup()
    render(<App />)
    await click(user, '4')
    expect(screen.getByText('Showing 31-40 of 53')).toBeInTheDocument()
    expect(shownItems()[0]).toBe('Item 31')
    expect(screen.getByRole('button', { name: '4' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '3' })).not.toHaveAttribute('aria-current')
  })

  it('disables Previous on the first page', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('shows the short last page "51-53" and disables Next there', async () => {
    const user = userEvent.setup()
    render(<App />)
    for (let i = 0; i < 5; i++) await click(user, 'Next')
    expect(screen.getByText('Showing 51-53 of 53')).toBeInTheDocument()
    expect(shownItems()).toEqual(['Item 51', 'Item 52', 'Item 53'])
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    expect(pageNumberLabels()).toEqual(['2', '3', '4', '5', '6'])
    expect(screen.getByRole('button', { name: '6' })).toHaveAttribute('aria-current', 'page')
  })

  it('page size 5 shows 5 items and 11 pages (only 5 numbers at a time)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(pageSizeSelect(), '5')
    expect(pageSizeSelect()).toHaveValue('5')
    expect(screen.getByText('Showing 1-5 of 53')).toBeInTheDocument()
    expect(shownItems()).toEqual(['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'])
    expect(pageNumberLabels()).toEqual(['1', '2', '3', '4', '5'])
  })

  it('page size 20 shows 20 items and 3 pages, the last one with 13 items', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(pageSizeSelect(), '20')
    expect(screen.getByText('Showing 1-20 of 53')).toBeInTheDocument()
    expect(shownItems()).toHaveLength(20)
    expect(pageNumberLabels()).toEqual(['1', '2', '3'])

    await click(user, 'Next')
    await click(user, 'Next')
    expect(screen.getByText('Showing 41-53 of 53')).toBeInTheDocument()
    expect(shownItems()).toHaveLength(13)
    expect(shownItems()[0]).toBe('Item 41')
    expect(shownItems()[12]).toBe('Item 53')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('slides the number window to 4 5 6 7 8 around page 6 (page size 5)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(pageSizeSelect(), '5')
    await click(user, '5')
    expect(pageNumberLabels()).toEqual(['3', '4', '5', '6', '7'])
    await click(user, '6')
    expect(screen.getByText('Showing 26-30 of 53')).toBeInTheDocument()
    expect(pageNumberLabels()).toEqual(['4', '5', '6', '7', '8'])
    expect(screen.getByRole('button', { name: '6' })).toHaveAttribute('aria-current', 'page')
  })

  it('changing the page size goes back to page 1', async () => {
    const user = userEvent.setup()
    render(<App />)
    await click(user, '3')
    expect(screen.getByText('Showing 21-30 of 53')).toBeInTheDocument()

    await user.selectOptions(pageSizeSelect(), '5')
    expect(screen.getByText('Showing 1-5 of 53')).toBeInTheDocument()
    expect(shownItems()[0]).toBe('Item 1')
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  })

  it('goes back to page 1 even when the old page would still exist', async () => {
    const user = userEvent.setup()
    render(<App />)
    await click(user, '2')
    await user.selectOptions(pageSizeSelect(), '20')
    // Page 2 would exist with 20 per page, but the rule is: always page 1.
    expect(screen.getByText('Showing 1-20 of 53')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page')
  })
})
