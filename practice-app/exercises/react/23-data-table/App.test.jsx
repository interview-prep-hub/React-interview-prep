import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { EMPLOYEES } from './employees.js'

// Many of these tests click and type a lot, and role queries are slow in jsdom.
// A generous limit keeps a slow computer from failing a correct solution.
vi.setConfig({ testTimeout: 30000 })

// ---------------------------------------------------------------------------
// Small helpers so each test reads like the README.
// ---------------------------------------------------------------------------
const LABELS = ['Name', 'Role', 'Salary', 'Start date']

// Row 0 is the header row, everything after it is a data row.
const dataRows = () => screen.getAllByRole('row').slice(1)
const cellTexts = (row) => within(row).getAllByRole('cell').map((cell) => cell.textContent)
const column = (index) => dataRows().map((row) => cellTexts(row)[index])
const shownNames = () => column(0)

const columnHeader = (label) =>
  screen.getByRole('columnheader', { name: new RegExp(`^${label}`, 'i') })
const sortButton = (label) => screen.getByRole('button', { name: new RegExp(`^${label}`, 'i') })
const filterBox = () => screen.getByLabelText(/filter/i)
const prevButton = () => screen.getByRole('button', { name: 'Prev' })
const nextButton = () => screen.getByRole('button', { name: 'Next' })

const expectPage = (page, total) =>
  expect(screen.getByText(`Page ${page} of ${total}`)).toBeInTheDocument()

// A complete employee with sensible defaults, for small custom data sets.
const make = (id, fields) => ({
  id,
  name: `Person ${id}`,
  role: 'Developer',
  salary: 50000,
  startDate: '2020-01-01',
  ...fields,
})

// `count` employees named "Emp 1", "Emp 2", ... in that (original) order.
const makeMany = (count) =>
  Array.from({ length: count }, (_, index) => make(index + 1, { name: `Emp ${index + 1}` }))

// True when `later` comes after `earlier` in the document.
const isAfter = (earlier, later) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING)

function setup(props) {
  // delay: null skips the pause between key presses and clicks (no real waiting).
  const user = userEvent.setup({ delay: null })
  const utils = render(<App {...props} />)
  return { user, ...utils }
}

describe('23 Data table', () => {
  describe('layout and data', () => {
    it('renders a table named Employees with the four column headers in order', () => {
      setup()
      const table = screen.getByRole('table', { name: 'Employees' })
      // One header row inside <thead>, the data rows inside one <tbody>.
      expect(table.tHead.rows).toHaveLength(1)
      expect(table.tBodies).toHaveLength(1)

      const headers = screen.getAllByRole('columnheader')
      expect(headers).toHaveLength(4)
      LABELS.forEach((label, index) => {
        expect(headers[index]).toHaveTextContent(label)
        // Every header cell holds a real button (type="button") named by the label.
        const button = within(headers[index]).getByRole('button', { name: label })
        expect(button).toHaveAttribute('type', 'button')
      })
    })

    it('puts the filter above the table and the paging controls below it', async () => {
      const { user } = setup()
      const table = screen.getByRole('table', { name: 'Employees' })

      expect(filterBox()).toHaveValue('')
      expect(isAfter(filterBox(), table)).toBe(true)
      expect(isAfter(table, prevButton())).toBe(true)
      expect(isAfter(prevButton(), nextButton())).toBe(true)

      // The empty message sits between the table and the paging controls.
      await user.type(filterBox(), 'zzz')
      const message = screen.getByText('No matching employees')
      expect(isAfter(table, message)).toBe(true)
      expect(isAfter(message, prevButton())).toBe(true)
    })

    it('shows the first 5 employees in the original order, with formatted cells', () => {
      setup()
      expect(screen.getByRole('table', { name: 'Employees' }).tBodies[0].rows).toHaveLength(5)
      expect(shownNames()).toEqual([
        'Ava Thompson',
        'Liam Chen',
        'Noah Patel',
        'Emma Rossi',
        'Olivia Brown',
      ])
      expect(cellTexts(dataRows()[0])).toEqual([
        'Ava Thompson',
        'Frontend Engineer',
        '$98,000',
        '2019-03-11',
      ])
      expect(cellTexts(dataRows()[1])).toEqual([
        'Liam Chen',
        'Backend Engineer',
        '$105,000',
        '2018-07-23',
      ])
    })

    it('formats any salary with thousands separators and shows the start date as a UTC calendar date', () => {
      setup({
        employees: [
          make(1, { name: 'A', salary: 950, startDate: '2021-03-04T23:30:00Z' }),
          make(2, { name: 'B', salary: 1234567, startDate: '2021-03-05T00:30:00Z' }),
          make(3, { name: 'C', salary: 100000, startDate: '2020-02-29' }),
        ],
      })
      expect(column(2)).toEqual(['$950', '$1,234,567', '$100,000'])
      // 23:30Z and 00:30Z are on different UTC days, whatever the time zone of the computer.
      expect(column(3)).toEqual(['2021-03-04', '2021-03-05', '2020-02-29'])
    })

    it('shows "Page 1 of 5" with Prev disabled and Next enabled', () => {
      setup()
      expectPage(1, 5)
      expect(prevButton()).toBeDisabled()
      expect(nextButton()).toBeEnabled()
    })

    it('follows a new employees prop (rows are derived, not copied into state)', async () => {
      const listA = [make(1, { name: 'Zed' }), make(2, { name: 'Yan' }), make(3, { name: 'Xia' })]
      const listB = 'LKJIHGFEDCBA'
        .split('')
        .map((letter, index) => make(10 + index, { name: `Emp ${letter}` }))

      const { user, rerender } = setup({ employees: listA })
      expect(shownNames()).toEqual(['Zed', 'Yan', 'Xia'])
      expectPage(1, 1)

      await user.click(sortButton('Name'))
      expect(shownNames()).toEqual(['Xia', 'Yan', 'Zed'])

      rerender(<App employees={listB} />)
      // The sort is still "Name ascending" and the page count follows the new data.
      expect(columnHeader('Name')).toHaveAttribute('aria-sort', 'ascending')
      expect(shownNames()).toEqual(['Emp A', 'Emp B', 'Emp C', 'Emp D', 'Emp E'])
      expectPage(1, 3)
    })

    it('moves the same row elements when the order changes (rows are keyed by id, not by position)', async () => {
      const people = [make(1, { name: 'Zed' }), make(2, { name: 'Yan' }), make(3, { name: 'Xia' })]
      const { user } = setup({ employees: people })
      const rowOf = (name) => screen.getByText(name).closest('tr')
      const before = { Zed: rowOf('Zed'), Yan: rowOf('Yan'), Xia: rowOf('Xia') }

      await user.click(sortButton('Name'))
      expect(shownNames()).toEqual(['Xia', 'Yan', 'Zed'])
      // With key={index}, React would reuse the first <tr> for "Xia" and rewrite its text.
      expect(rowOf('Zed')).toBe(before.Zed)
      expect(rowOf('Yan')).toBe(before.Yan)
      expect(rowOf('Xia')).toBe(before.Xia)
    })
  })

  describe('pagination', () => {
    it('Next and Prev move one page at a time', async () => {
      const { user } = setup()

      await user.click(nextButton())
      expectPage(2, 5)
      expect(shownNames()).toEqual([
        'Mia Johnson',
        'Lucas Silva',
        'Sophia Martin',
        'Ethan Walker',
        'Isabella Garcia',
      ])
      expect(prevButton()).toBeEnabled()
      expect(nextButton()).toBeEnabled()

      await user.click(prevButton())
      expectPage(1, 5)
      expect(shownNames()[0]).toBe('Ava Thompson')
      expect(prevButton()).toBeDisabled()
    })

    it('the last page shows the 3 remaining rows and Next is disabled', async () => {
      const { user } = setup()
      for (let i = 0; i < 4; i += 1) await user.click(nextButton())

      expectPage(5, 5)
      expect(shownNames()).toEqual(['Jack Clark', 'Ella Lewis', 'Daniel Young'])
      expect(nextButton()).toBeDisabled()
      expect(prevButton()).toBeEnabled()
    })

    // [rows, pages, rows on the last page]. 5 and 10 fill their pages exactly: no empty extra page.
    it.each([
      [1, 1, 1],
      [5, 1, 5],
      [6, 2, 1],
      [10, 2, 5],
      [11, 3, 1],
    ])('%i rows make %i page(s), and the last page has %i row(s)', async (count, pages, lastRows) => {
      const { user } = setup({ employees: makeMany(count) })
      expectPage(1, pages)
      for (let i = 1; i < pages; i += 1) await user.click(nextButton())

      expectPage(pages, pages)
      expect(dataRows()).toHaveLength(lastRows)
      expect(shownNames().at(-1)).toBe(`Emp ${count}`)
      expect(nextButton()).toBeDisabled()
    })
  })

  describe('sorting', () => {
    it('starts unsorted: every column header has aria-sort="none"', () => {
      setup()
      LABELS.forEach((label) => {
        expect(columnHeader(label)).toHaveAttribute('aria-sort', 'none')
      })
    })

    it('sorts ascending on the first click, descending on the second, ascending on the third', async () => {
      const { user } = setup()

      await user.click(sortButton('Name'))
      expect(columnHeader('Name')).toHaveAttribute('aria-sort', 'ascending')
      expect(shownNames()).toEqual([
        'Abigail Harris',
        'Amelia Davis',
        'Ava Thompson',
        'Benjamin Thomas',
        'Charlotte Jackson',
      ])

      await user.click(sortButton('Name'))
      expect(columnHeader('Name')).toHaveAttribute('aria-sort', 'descending')
      expect(shownNames()).toEqual([
        'Sophia Martin',
        'Olivia Brown',
        'Noah Patel',
        'Mia Johnson',
        'Mason Lee',
      ])

      await user.click(sortButton('Name'))
      expect(columnHeader('Name')).toHaveAttribute('aria-sort', 'ascending')
      expect(shownNames()[0]).toBe('Abigail Harris')
    })

    it('keeps every sort button named exactly by its label while sorted (the arrow is aria-hidden)', async () => {
      const { user } = setup()

      // A visible arrow that is not aria-hidden would make the name "Name ▲".
      await user.click(sortButton('Name'))
      expect(columnHeader('Name')).toHaveAttribute('aria-sort', 'ascending')
      expect(screen.getByRole('button', { name: 'Name' })).toBeInTheDocument()
      await user.click(sortButton('Name'))
      expect(columnHeader('Name')).toHaveAttribute('aria-sort', 'descending')
      expect(screen.getByRole('button', { name: 'Name' })).toBeInTheDocument()

      for (const label of LABELS) {
        await user.click(sortButton(label))
        LABELS.forEach((other) => {
          expect(screen.getByRole('button', { name: other })).toBeInTheDocument()
        })
      }
    })

    it('sorts by one column at a time and starts a new column ascending', async () => {
      const { user } = setup()

      await user.click(sortButton('Name'))
      await user.click(sortButton('Name'))
      expect(columnHeader('Name')).toHaveAttribute('aria-sort', 'descending')

      await user.click(sortButton('Role'))
      expect(columnHeader('Role')).toHaveAttribute('aria-sort', 'ascending')
      expect(columnHeader('Name')).toHaveAttribute('aria-sort', 'none')
      expect(columnHeader('Salary')).toHaveAttribute('aria-sort', 'none')
      expect(columnHeader('Start date')).toHaveAttribute('aria-sort', 'none')

      // Name was descending before, but coming back to it starts at ascending.
      await user.click(sortButton('Name'))
      expect(columnHeader('Name')).toHaveAttribute('aria-sort', 'ascending')
      expect(columnHeader('Role')).toHaveAttribute('aria-sort', 'none')
    })

    it('sorts salary as numbers, not as text', async () => {
      const { user } = setup()

      await user.click(sortButton('Salary'))
      // As text, "104000" would come before "69000". As numbers, 69000 is first.
      expect(column(2)).toEqual(['$69,000', '$72,000', '$74,000', '$76,000', '$78,000'])

      await user.click(sortButton('Salary'))
      expect(column(2)).toEqual(['$135,000', '$128,000', '$118,000', '$118,000', '$112,000'])
    })

    it('sorts text without caring about upper and lower case', async () => {
      const people = [
        make(1, { name: 'carol', role: 'manager' }),
        make(2, { name: 'Alice', role: 'Designer' }),
        make(3, { name: 'Dave', role: 'analyst' }),
        make(4, { name: 'bob', role: 'Engineer' }),
      ]
      const { user } = setup({ employees: people })

      await user.click(sortButton('Name'))
      expect(shownNames()).toEqual(['Alice', 'bob', 'carol', 'Dave'])
      await user.click(sortButton('Name'))
      expect(shownNames()).toEqual(['Dave', 'carol', 'bob', 'Alice'])

      await user.click(sortButton('Role'))
      expect(shownNames()).toEqual(['Dave', 'Alice', 'bob', 'carol'])
    })

    it('sorts accented letters the way a person expects (locale-aware)', async () => {
      const people = ['Zoe', 'Émile', 'David', 'Anna'].map((name, i) => make(i + 1, { name }))
      const { user } = setup({ employees: people })

      await user.click(sortButton('Name'))
      // A plain "<" comparison would put the accented name after "Zoe".
      expect(shownNames()).toEqual(['Anna', 'David', 'Émile', 'Zoe'])
    })

    it('sorts start dates by the moment in time, not by the text', async () => {
      // Written as text, "Second" looks like the LAST date (it starts with 05).
      // As a moment it is 2021-03-04T20:00:00Z, between First and Third.
      const people = [
        make(1, { name: 'Third', startDate: '2021-03-04T22:00:00Z' }),
        make(2, { name: 'First', startDate: '2021-03-04T10:00:00Z' }),
        make(3, { name: 'Second', startDate: '2021-03-05T01:00:00+05:00' }),
      ]
      const { user } = setup({ employees: people })

      await user.click(sortButton('Start date'))
      expect(columnHeader('Start date')).toHaveAttribute('aria-sort', 'ascending')
      expect(shownNames()).toEqual(['First', 'Second', 'Third'])
      // The cell shows the UTC calendar date.
      expect(column(3)).toEqual(['2021-03-04', '2021-03-04', '2021-03-04'])

      await user.click(sortButton('Start date'))
      expect(shownNames()).toEqual(['Third', 'Second', 'First'])
    })

    it('sorts the real start dates oldest first, then newest first', async () => {
      const { user } = setup()

      await user.click(sortButton('Start date'))
      expect(column(3)).toEqual([
        '2015-06-22',
        '2016-02-15',
        '2016-04-18',
        '2016-09-12',
        '2017-01-09',
      ])

      await user.click(sortButton('Start date'))
      expect(column(3)).toEqual([
        '2023-08-21',
        '2023-03-13',
        '2022-10-31',
        '2022-07-04',
        '2022-02-28',
      ])
    })

    it('keeps equal rows in their original order, in both directions (stable sort)', async () => {
      const people = [
        make(1, { name: 'Dev One', role: 'Developer' }),
        make(2, { name: 'Dev Two', role: 'Developer' }),
        make(3, { name: 'Designer One', role: 'Designer' }),
        make(4, { name: 'Dev Three', role: 'Developer' }),
        make(5, { name: 'Designer Two', role: 'Designer' }),
      ]
      const { user } = setup({ employees: people })

      await user.click(sortButton('Role'))
      expect(shownNames()).toEqual([
        'Designer One',
        'Designer Two',
        'Dev One',
        'Dev Two',
        'Dev Three',
      ])

      await user.click(sortButton('Role'))
      // Descending: the groups swap, but inside a group the order is NOT reversed.
      expect(shownNames()).toEqual([
        'Dev One',
        'Dev Two',
        'Dev Three',
        'Designer One',
        'Designer Two',
      ])

      // Every salary is the same, so neither direction may move any row.
      await user.click(sortButton('Salary'))
      expect(shownNames()).toEqual(people.map((p) => p.name))
      await user.click(sortButton('Salary'))
      expect(shownNames()).toEqual(people.map((p) => p.name))
    })

    it('never changes the array it was given', async () => {
      const frozen = Object.freeze([...EMPLOYEES])
      const { user } = setup({ employees: frozen })

      // Sorting a frozen array in place throws a TypeError, so any in-place sort fails here.
      for (const label of LABELS) {
        await user.click(sortButton(label))
        await user.click(sortButton(label))
      }
      await user.type(filterBox(), 'e')
      await user.click(sortButton('Name'))

      expect(frozen.map((e) => e.id)).toEqual(EMPLOYEES.map((e) => e.id))
      expect(shownNames()[0]).toBe('Abigail Harris')
    })

    it('keeps the current page number when the sort changes', async () => {
      const { user } = setup()
      await user.click(nextButton())
      expectPage(2, 5)

      await user.click(sortButton('Salary'))
      expectPage(2, 5)
      expect(shownNames()).toEqual([
        'Harper Moore',
        'Emma Rossi',
        'Isabella Garcia',
        'James Taylor',
        'Mia Johnson',
      ])
    })

    it('can be used with the keyboard (the header control is a real button)', async () => {
      const { user } = setup()
      sortButton('Salary').focus()
      await user.keyboard('{Enter}')
      expect(columnHeader('Salary')).toHaveAttribute('aria-sort', 'ascending')
      await user.keyboard(' ')
      expect(columnHeader('Salary')).toHaveAttribute('aria-sort', 'descending')
    })
  })

  describe('filtering', () => {
    it('matches names, ignoring case', async () => {
      const { user } = setup()
      await user.type(filterBox(), 'AVA')
      expect(shownNames()).toEqual(['Ava Thompson'])
      expectPage(1, 1)
    })

    it('matches roles, ignoring case', async () => {
      const { user } = setup()
      await user.type(filterBox(), 'DeSiGnEr')
      expect(shownNames()).toEqual(['Emma Rossi', 'Isabella Garcia', 'Evelyn Anderson'])
    })

    it('looks at the name and the role only, not at salary or start date', async () => {
      const { user } = setup()
      const box = filterBox()

      await user.type(box, 'lee') // only inside a name
      expect(shownNames()).toEqual(['Mason Lee'])

      await user.clear(box)
      await user.type(box, 'qa') // only inside a role
      expect(shownNames()).toEqual(['Olivia Brown', 'Logan Wilson', 'Jack Clark'])

      await user.clear(box)
      await user.type(box, '98000') // a salary
      expect(screen.getByText('No matching employees')).toBeInTheDocument()

      await user.clear(box)
      await user.type(box, '2019') // a start year
      expect(screen.getByText('No matching employees')).toBeInTheDocument()

      // The name and the role are searched one by one, not as one long text:
      // "Liam Chen" is a Backend Engineer, but "chen back" is in neither field.
      await user.clear(box)
      await user.type(box, 'chen back')
      expect(screen.getByText('No matching employees')).toBeInTheDocument()
    })

    it('finds the text anywhere inside a name or role, and keeps spaces inside the text', async () => {
      const { user } = setup()
      const box = filterBox()

      await user.type(box, 'hom') // the middle of "Thompson" and "Thomas"
      expect(shownNames()).toEqual(['Ava Thompson', 'Benjamin Thomas'])

      await user.clear(box)
      await user.type(box, 'ava t') // crosses the space between first and last name
      expect(shownNames()).toEqual(['Ava Thompson'])
    })

    it('ignores spaces before and after the text, but the box still shows what was typed', async () => {
      const { user } = setup()
      await user.type(filterBox(), '  lee  ')
      expect(shownNames()).toEqual(['Mason Lee'])
      expect(filterBox()).toHaveValue('  lee  ')
    })

    it('counts pages from the matching rows only', async () => {
      const { user } = setup()
      await user.type(filterBox(), 'engineer') // 14 matches, including "Engineering Manager"
      expectPage(1, 3)

      await user.click(nextButton())
      await user.click(nextButton())
      expectPage(3, 3)
      expect(shownNames()).toEqual(['Charlotte Jackson', 'Abigail Harris', 'Jack Clark', 'Ella Lewis'])
      expect(nextButton()).toBeDisabled()
    })

    it('goes back to page 1 when the filter text changes', async () => {
      const { user } = setup()
      await user.click(nextButton())
      await user.click(nextButton())
      expectPage(3, 5)

      await user.type(filterBox(), 'qa')
      expectPage(1, 1)
      expect(shownNames()).toEqual(['Olivia Brown', 'Logan Wilson', 'Jack Clark'])
    })

    it('goes back to page 1 even when the old page number would still exist', async () => {
      const { user } = setup()
      await user.click(nextButton())
      expectPage(2, 5)

      await user.type(filterBox(), 'e') // 22 matches: still 5 pages, so page 2 would be valid
      expectPage(1, 5)
      expect(shownNames()[0]).toBe('Ava Thompson')
    })

    it('goes back to page 1 when the filter is cleared too', async () => {
      const { user } = setup()
      const box = filterBox()
      await user.type(box, 'engineer')
      await user.click(nextButton())
      await user.click(nextButton())
      expectPage(3, 3)

      await user.clear(box)
      expectPage(1, 5)
      expect(shownNames()[0]).toBe('Ava Thompson')
    })

    it('filters first and sorts the matches, and keeps the sort while you type', async () => {
      const { user } = setup()
      await user.type(filterBox(), 'engineer')
      await user.click(sortButton('Salary'))
      await user.click(sortButton('Salary'))

      expect(shownNames()).toEqual([
        'Sophia Martin',
        'Abigail Harris',
        'Charlotte Jackson',
        'Benjamin Thomas',
        'Mason Lee',
      ])

      // Typing a new filter keeps the sort that was chosen before.
      await user.clear(filterBox())
      await user.type(filterBox(), 'manager')
      expect(columnHeader('Salary')).toHaveAttribute('aria-sort', 'descending')
      expect(shownNames()).toEqual([
        'Sophia Martin',
        'Abigail Harris',
        'Amelia Davis',
        'Noah Patel',
        'Daniel Young',
      ])
    })

    it('shows "No matching employees" when nothing matches, and hides it again', async () => {
      const { user } = setup()
      expect(screen.queryByText('No matching employees')).not.toBeInTheDocument()

      await user.type(filterBox(), 'zzz')
      expect(screen.getByText('No matching employees')).toBeInTheDocument()
      // The header row stays, there are no data rows, and paging is switched off.
      expect(screen.getAllByRole('row')).toHaveLength(1)
      expect(screen.getAllByRole('columnheader')).toHaveLength(4)
      expectPage(1, 1)
      expect(prevButton()).toBeDisabled()
      expect(nextButton()).toBeDisabled()

      await user.clear(filterBox())
      expect(screen.queryByText('No matching employees')).not.toBeInTheDocument()
      expect(dataRows()).toHaveLength(5)
      expectPage(1, 5)
    })

    it('shows the empty message for an empty employees array', () => {
      setup({ employees: [] })
      expect(screen.getByText('No matching employees')).toBeInTheDocument()
      expect(dataRows()).toHaveLength(0)
      expectPage(1, 1)
    })
  })
})
