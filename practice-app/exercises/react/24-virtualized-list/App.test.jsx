import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import VirtualList from './VirtualList.jsx'

// Numbers used by most tests: rows are 30px tall and the list is 300px tall,
// so 10 rows fit in the viewport. The default overscan is 3 rows on each side.
const ROW_HEIGHT = 30
const LIST_HEIGHT = 300

const makeItems = (count) => Array.from({ length: count }, (_, i) => `Row ${i + 1}`)

// range(2, 5) -> [2, 3, 4, 5] (both ends included)
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

function listElement(props = {}) {
  return (
    <VirtualList
      items={makeItems(10000)}
      itemHeight={ROW_HEIGHT}
      height={LIST_HEIGHT}
      renderItem={(item) => <span>{item}</span>}
      {...props}
    />
  )
}

const getList = () => screen.getByRole('list')
function getSpacer() {
  const spacer = screen.queryByTestId('spacer')
  expect(spacer).toBeInTheDocument()
  return spacer
}

// Reading the rows with querySelectorAll keeps the helpers fast and the failure
// messages short, even when a list renders far too many rows.
const getRows = () => {
  const rows = Array.from(getList().querySelectorAll('[role="listitem"]'))
  // Fail early with a short message instead of a diff that is thousands of lines long.
  expect(rows.length, 'only the rows near the viewport may be rendered, not all 10,000').toBeLessThan(500)
  return rows
}
const renderedIndexes = () => getRows().map((row) => Number(row.getAttribute('data-index')))
const textOfRow = (index) =>
  getRows().find((row) => row.getAttribute('data-index') === String(index))?.textContent

// What a browser does when the user scrolls: scrollTop changes, then a scroll event fires.
function scrollTo(top) {
  const list = getList()
  list.scrollTop = top
  fireEvent.scroll(list)
}

describe('24 Virtualized list: VirtualList component', () => {
  it('renders only the rows in view plus the overscan when it starts at the top', () => {
    render(listElement())
    // Rows 0 to 9 are in view, overscan 3 adds rows 10, 11 and 12 below them.
    expect(renderedIndexes()).toEqual(range(0, 12))
    expect(screen.queryByText('Row 1')).toBeInTheDocument()
    expect(screen.queryByText('Row 13')).toBeInTheDocument()
    expect(screen.queryByText('Row 14')).not.toBeInTheDocument()
    expect(screen.queryByText('Row 10000')).not.toBeInTheDocument()
  })

  it('is a focusable, scrollable list with the height it was given', async () => {
    const user = userEvent.setup()
    render(listElement())
    const list = getList()
    expect(list).toHaveAttribute('tabindex', '0')
    expect(list).toHaveStyle({ height: '300px', overflowY: 'auto' })
    await user.tab()
    expect(list).toHaveFocus()
  })

  it('has an inner spacer as tall as the whole list, with the rows inside it', () => {
    render(listElement())
    const spacer = getSpacer()
    expect(getList()).toContainElement(spacer)
    expect(spacer).toHaveStyle({ height: '300000px' })
    // position: relative makes the spacer the box that the absolute rows are placed in.
    expect(spacer.style.position).toBe('relative')
    expect(getRows().length).toBeGreaterThan(0)
    getRows().forEach((row) => expect(spacer).toContainElement(row))
  })

  it('positions every row absolutely at index * itemHeight', () => {
    render(listElement())
    const rows = getRows()
    expect(rows.length).toBeGreaterThan(0)
    rows.forEach((row) => {
      const index = Number(row.getAttribute('data-index'))
      expect(row.style.position).toBe('absolute')
      expect(row.style.top).toBe(`${index * ROW_HEIGHT}px`)
      expect(row.style.height).toBe('30px')
    })
  })

  it('gives every row the listitem role', () => {
    render(listElement())
    // Guard first: a list that renders thousands of rows would make the role query very slow.
    expect(getRows().length).toBeLessThan(30)
    const items = screen.queryAllByRole('listitem')
    expect(items).toHaveLength(13)
    expect(items[0]).toHaveTextContent('Row 1')
  })

  it('updates the window when the list is scrolled', () => {
    render(listElement())
    scrollTo(3000)
    // scrollTop 3000 = row 100 at the top edge. Rows 100 to 109 are in view,
    // overscan 3 adds rows 97 to 99 above and rows 110 to 112 below.
    expect(renderedIndexes()).toEqual(range(97, 112))
    expect(screen.queryByText('Row 98')).toBeInTheDocument()
    expect(screen.queryByText('Row 113')).toBeInTheDocument()
    expect(screen.queryByText('Row 97')).not.toBeInTheDocument()
    expect(screen.queryByText('Row 114')).not.toBeInTheDocument()
    expect(screen.queryByText('Row 1')).not.toBeInTheDocument()
    // The spacer never changes, so the scrollbar keeps its size.
    expect(getSpacer()).toHaveStyle({ height: '300000px' })
  })

  it('counts a half visible row as visible', () => {
    render(listElement())
    scrollTo(45)
    // Row 1 (30px to 60px) is cut at the top, row 11 (330px to 360px) is cut at the bottom.
    // First visible row is 1, so overscan would start at -2: the list is clamped to 0.
    // The end is ceil(345 / 30) = 12, plus 3 = 15, so rows 0 to 14.
    expect(renderedIndexes()).toEqual(range(0, 14))

    scrollTo(1005)
    // floor(1005 / 30) = 33, minus 3 = 30. ceil(1305 / 30) = 44, plus 3 = 47, so rows 30 to 46.
    expect(renderedIndexes()).toEqual(range(30, 46))
  })

  it('shows the first rows again after scrolling back to the top', () => {
    render(listElement())
    scrollTo(3000)
    expect(screen.queryByText('Row 1')).not.toBeInTheDocument()
    scrollTo(0)
    expect(renderedIndexes()).toEqual(range(0, 12))
    expect(screen.queryByText('Row 1')).toBeInTheDocument()
  })

  it('reaches the last row and never renders past the end of the list', () => {
    render(listElement())
    // The largest scrollTop is 300000 - 300 = 299700 (row 9990 at the top edge).
    scrollTo(299700)
    expect(renderedIndexes()).toEqual(range(9987, 9999))
    expect(screen.queryByText('Row 10000')).toBeInTheDocument()
    expect(screen.queryByText('Row 10001')).not.toBeInTheDocument()
  })

  it('never renders 30 rows or more and always renders every row in view', () => {
    render(listElement())
    const positions = [0, 1, 29, 30, 31, 100, 1234, 50000, 150015, 299670, 299700]
    positions.forEach((top) => {
      scrollTo(top)
      const rendered = renderedIndexes()
      expect(rendered.length).toBeLessThan(30)

      const firstInView = Math.floor(top / ROW_HEIGHT)
      const lastInView = Math.min(9999, Math.ceil((top + LIST_HEIGHT) / ROW_HEIGHT) - 1)
      range(firstInView, lastInView).forEach((index) => {
        expect(rendered).toContain(index)
      })
    })
  })

  it('renders only the rows that touch the viewport when overscan is 0', () => {
    render(listElement({ overscan: 0 }))
    expect(renderedIndexes()).toEqual(range(0, 9))
    scrollTo(45)
    expect(renderedIndexes()).toEqual(range(1, 11))
  })

  it('rounds the visible rows outwards: a row that is only a few pixels in view is rendered', () => {
    render(listElement({ overscan: 0 }))
    // The viewport is 10 to 310 px. Row 0 (0 to 30) and row 10 (300 to 330) are cut,
    // but both show a little, so both are rendered.
    scrollTo(10)
    expect(renderedIndexes()).toEqual(range(0, 10))
    // The viewport is 29 to 329 px: row 0 shows 1px at the top, row 10 shows 29px at the bottom.
    scrollTo(29)
    expect(renderedIndexes()).toEqual(range(0, 10))
    // The viewport is 31 to 331 px: row 1 shows 29px at the top, row 11 shows 1px at the bottom.
    scrollTo(31)
    expect(renderedIndexes()).toEqual(range(1, 11))
  })

  it('renders more rows above and below when overscan is bigger', () => {
    render(listElement({ overscan: 10 }))
    expect(renderedIndexes()).toEqual(range(0, 19))
    scrollTo(3000)
    expect(renderedIndexes()).toEqual(range(90, 119))
  })

  it('uses the itemHeight and height props for the layout', () => {
    render(listElement({ items: makeItems(100), itemHeight: 50, height: 200, overscan: 1 }))
    expect(getList()).toHaveStyle({ height: '200px' })
    expect(getSpacer()).toHaveStyle({ height: '5000px' })
    // 200 / 50 = 4 rows in view (0 to 3), overscan 1 adds row 4.
    expect(renderedIndexes()).toEqual(range(0, 4))
    expect(getRows()[2].style.top).toBe('100px')

    scrollTo(500)
    // Row 10 is at the top edge, rows 10 to 13 are in view, overscan 1 adds rows 9 and 14.
    expect(renderedIndexes()).toEqual(range(9, 14))
    expect(getRows()[0].style.top).toBe('450px')
  })

  it('calls renderItem with the item and its index, only for rows it renders', () => {
    const items = makeItems(10000)
    const renderItem = vi.fn((item, index) => (
      <span>
        {index}:{item}
      </span>
    ))
    render(listElement({ items, renderItem }))

    expect(textOfRow(3)).toBe('3:Row 4')
    expect(renderItem).toHaveBeenCalledWith('Row 4', 3)
    // Nothing below row index 12 was ever asked for.
    expect(renderItem.mock.calls.every(([, index]) => index <= 12)).toBe(true)

    scrollTo(3000)
    expect(renderItem).toHaveBeenCalledWith('Row 101', 100)
    expect(textOfRow(100)).toBe('100:Row 101')
  })

  it('keeps the DOM node of a row that stays in the window while scrolling', () => {
    render(listElement())
    scrollTo(3000)
    const rowNode = getRows().find((row) => row.getAttribute('data-index') === '100')
    expect(rowNode).toBeDefined()

    scrollTo(3030)
    expect(renderedIndexes()).toEqual(range(98, 113))
    const sameRow = getRows().find((row) => row.getAttribute('data-index') === '100')
    // Same element, not a new copy: React reused it because the key did not change.
    expect(sameRow).toBe(rowNode)
  })

  it('renders a short list completely', () => {
    render(listElement({ items: makeItems(5) }))
    expect(renderedIndexes()).toEqual(range(0, 4))
    expect(getSpacer()).toHaveStyle({ height: '150px' })
    scrollTo(60)
    expect(renderedIndexes()).toEqual(range(0, 4))
  })

  it('renders no rows and an empty spacer for an empty list', () => {
    render(listElement({ items: [] }))
    expect(getRows()).toHaveLength(0)
    expect(getSpacer()).toHaveStyle({ height: '0px' })
  })

  it('does not change the items array it receives', () => {
    // A frozen array throws if the component tries to push, splice or sort it.
    const items = Object.freeze(makeItems(10000))
    render(listElement({ items }))
    scrollTo(3000)
    expect(renderedIndexes()).toEqual(range(97, 112))
    expect(items).toHaveLength(10000)
    expect(items[0]).toBe('Row 1')
  })

  it('recalculates the window when props change after the user has scrolled', () => {
    const { rerender } = render(listElement())
    scrollTo(3000)
    expect(renderedIndexes()).toEqual(range(97, 112))

    // Same scroll position, taller list: ceil(3600 / 30) = 120, plus 3 = 123, so rows 97 to 122.
    rerender(listElement({ height: 600 }))
    expect(getList()).toHaveStyle({ height: '600px' })
    expect(renderedIndexes()).toEqual(range(97, 122))

    // Taller rows: scrollTop 3000 is now row 50 at the top edge.
    // Rows 50 to 59 are in view, overscan 3 gives rows 47 to 62.
    rerender(listElement({ height: 600, itemHeight: 60 }))
    expect(getSpacer()).toHaveStyle({ height: '600000px' })
    expect(renderedIndexes()).toEqual(range(47, 62))
    expect(getRows()[0].style.top).toBe('2820px')

    // A different overscan applies at once.
    rerender(listElement({ height: 600, itemHeight: 60, overscan: 0 }))
    expect(renderedIndexes()).toEqual(range(50, 59))

    // A different renderItem is used for the rows that are already on screen.
    const renderItem = (item) => <b>{item.toUpperCase()}</b>
    rerender(listElement({ height: 600, itemHeight: 60, overscan: 0, renderItem }))
    expect(textOfRow(50)).toBe('ROW 51')
  })

  it('shows the new items when the items prop changes', () => {
    const { rerender } = render(listElement({ items: makeItems(100) }))
    expect(getSpacer()).toHaveStyle({ height: '3000px' })

    rerender(listElement({ items: ['Apple', 'Banana', 'Cherry'] }))
    expect(renderedIndexes()).toEqual([0, 1, 2])
    expect(getRows().map((row) => row.textContent)).toEqual(['Apple', 'Banana', 'Cherry'])
    expect(getSpacer()).toHaveStyle({ height: '90px' })
  })
})

describe('24 Virtualized list: App', () => {
  it('shows the first rows of a 10,000 row list inside a 300px tall container', () => {
    render(<App />)
    expect(getList()).toHaveStyle({ height: '300px' })
    expect(getSpacer()).toHaveStyle({ height: '300000px' })
    expect(renderedIndexes()).toEqual(range(0, 12))
    expect(screen.queryByText('Row 1')).toBeInTheDocument()
    expect(screen.queryByText('Row 13')).toBeInTheDocument()
    expect(screen.queryByText('Row 14')).not.toBeInTheDocument()
    // The text of the row at index i is exactly "Row " followed by i + 1.
    expect(textOfRow(0)).toBe('Row 1')
    expect(textOfRow(12)).toBe('Row 13')
  })

  it('keeps fewer than 30 rows in the DOM while scrolling through all 10,000', () => {
    render(<App />)
    scrollTo(3000)
    expect(getRows().length).toBeLessThan(30)
    expect(textOfRow(100)).toBe('Row 101')
    expect(screen.queryByText('Row 101')).toBeInTheDocument()
    expect(screen.queryByText('Row 1')).not.toBeInTheDocument()

    scrollTo(299700)
    expect(getRows().length).toBeLessThan(30)
    expect(screen.queryByText('Row 10000')).toBeInTheDocument()
    expect(screen.queryByText('Row 101')).not.toBeInTheDocument()
  })

  it('can be reached with the Tab key', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.tab()
    expect(getList()).toHaveFocus()
  })
})
