import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Pagination from './Pagination.jsx'

// Rendering and many clicks can be slow on a busy or old machine: allow more time.
vi.setConfig({ testTimeout: 20000 })

// The numbered buttons are every button inside the nav except Previous and Next.
function pageNumberLabels() {
  const nav = screen.getByRole('navigation', { name: 'Pagination' })
  return within(nav)
    .getAllByRole('button')
    .map((button) => button.textContent)
    .filter((text) => text !== 'Previous' && text !== 'Next')
}

function renderPagination(props = {}) {
  const onPageChange = vi.fn()
  const utils = render(
    <Pagination total={53} pageSize={10} page={1} onPageChange={onPageChange} {...props} />,
  )
  return { onPageChange, ...utils }
}

describe('13 Pagination: <Pagination /> component', () => {
  it('renders a Pagination navigation with Previous, the page numbers and Next', () => {
    renderPagination()
    const nav = screen.getByRole('navigation', { name: 'Pagination' })
    const names = within(nav)
      .getAllByRole('button')
      .map((button) => button.textContent)
    // 53 items with 10 per page is 6 pages, but only 5 numbers are shown.
    expect(names).toEqual(['Previous', '1', '2', '3', '4', '5', 'Next'])
  })

  it('contains nothing but those buttons: no "first", "last" or "..." extras', () => {
    renderPagination({ pageSize: 5, page: 6 })
    const nav = screen.getByRole('navigation', { name: 'Pagination' })
    expect(nav.textContent.replace(/\s/g, '')).toBe('Previous45678Next')
  })

  it('marks only the current page with aria-current="page"', () => {
    renderPagination({ page: 3 })
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page')
    for (const other of ['1', '2', '4', '5']) {
      expect(screen.getByRole('button', { name: other })).not.toHaveAttribute('aria-current')
    }
  })

  it('never puts aria-current on Previous, Next or any other button', () => {
    // Text of every button in the nav that has an aria-current attribute.
    const markedButtons = () => {
      const nav = screen.getByRole('navigation', { name: 'Pagination' })
      return within(nav)
        .getAllByRole('button')
        .filter((button) => button.hasAttribute('aria-current'))
        .map((button) => button.textContent)
    }
    const { rerender, onPageChange } = renderPagination({ page: 1 })
    expect(markedButtons()).toEqual(['1'])

    rerender(<Pagination total={53} pageSize={10} page={3} onPageChange={onPageChange} />)
    expect(markedButtons()).toEqual(['3'])

    rerender(<Pagination total={53} pageSize={10} page={6} onPageChange={onPageChange} />)
    expect(markedButtons()).toEqual(['6'])
  })

  it('disables Previous on the first page and keeps Next enabled', () => {
    renderPagination({ page: 1 })
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('disables Next on the last page and keeps Previous enabled', () => {
    renderPagination({ page: 6 })
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
  })

  it('enables both Previous and Next on a middle page', () => {
    renderPagination({ page: 3 })
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('shows at most 5 numbers and slides the window around the current page', () => {
    // 53 items with 5 per page is 11 pages.
    const { rerender, onPageChange } = renderPagination({ pageSize: 5, page: 1 })
    expect(pageNumberLabels()).toEqual(['1', '2', '3', '4', '5'])

    rerender(<Pagination total={53} pageSize={5} page={6} onPageChange={onPageChange} />)
    expect(pageNumberLabels()).toEqual(['4', '5', '6', '7', '8'])

    rerender(<Pagination total={53} pageSize={5} page={11} onPageChange={onPageChange} />)
    expect(pageNumberLabels()).toEqual(['7', '8', '9', '10', '11'])
    expect(screen.getByRole('button', { name: '11' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows fewer numbers when there are fewer than 5 pages', () => {
    renderPagination({ total: 12, pageSize: 5 })
    expect(pageNumberLabels()).toEqual(['1', '2', '3'])
  })

  it('treats a page outside the range like the nearest end when disabling the arrows', () => {
    // Previous is disabled for page 1 or less, Next for the last page or more.
    const { rerender, onPageChange } = renderPagination({ page: 0 })
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()

    rerender(<Pagination total={53} pageSize={10} page={99} onPageChange={onPageChange} />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('handles a single page: one number, both arrows disabled', () => {
    renderPagination({ total: 7, pageSize: 10, page: 1 })
    expect(pageNumberLabels()).toEqual(['1'])
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('handles zero items: no numbers, both arrows disabled', () => {
    renderPagination({ total: 0, page: 1 })
    expect(pageNumberLabels()).toEqual([])
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('derives the page count from total and pageSize when the props change', () => {
    const { rerender, onPageChange } = renderPagination({ pageSize: 10 })
    expect(pageNumberLabels()).toEqual(['1', '2', '3', '4', '5'])

    rerender(<Pagination total={53} pageSize={20} page={1} onPageChange={onPageChange} />)
    expect(pageNumberLabels()).toEqual(['1', '2', '3'])
  })

  it('calls onPageChange with the number of the clicked page button', async () => {
    const user = userEvent.setup()
    const { onPageChange } = renderPagination({ page: 1 })
    await user.click(screen.getByRole('button', { name: '4' }))
    expect(onPageChange).toHaveBeenCalledTimes(1)
    expect(onPageChange).toHaveBeenCalledWith(4)

    // The button of the current page is a numbered button too, so it reports as well.
    await user.click(screen.getByRole('button', { name: '1' }))
    expect(onPageChange).toHaveBeenCalledTimes(2)
    expect(onPageChange).toHaveBeenLastCalledWith(1)
  })

  it('calls onPageChange with page + 1 for Next and page - 1 for Previous', async () => {
    const user = userEvent.setup()
    const { onPageChange } = renderPagination({ page: 3 })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPageChange).toHaveBeenLastCalledWith(4)
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPageChange).toHaveBeenLastCalledWith(2)
  })

  it('does not call onPageChange when a disabled button is clicked', async () => {
    const user = userEvent.setup()
    const { onPageChange } = renderPagination({ page: 1 })
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('is controlled: it only shows the page it is given, even after a click', async () => {
    const user = userEvent.setup()
    renderPagination({ page: 1 })
    await user.click(screen.getByRole('button', { name: '3' }))
    // The parent did not change the page prop, so nothing moves.
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '3' })).not.toHaveAttribute('aria-current')
  })

  it('keeps keyboard focus on the clicked number while the window slides (key = page number)', async () => {
    // A tiny parent that really applies the change, like the App does.
    function Parent() {
      const [page, setPage] = useState(1)
      return <Pagination total={53} pageSize={10} page={page} onPageChange={setPage} />
    }
    const user = userEvent.setup()
    render(<Parent />)

    await user.click(screen.getByRole('button', { name: '4' }))
    expect(pageNumberLabels()).toEqual(['2', '3', '4', '5', '6'])
    // With key={index} React would reuse the old buttons by position, so the
    // focus would stay on a button that now shows another number.
    expect(screen.getByRole('button', { name: '4' })).toHaveFocus()
  })
})
