import { useMemo, useState } from 'react'
import { EMPLOYEES } from './employees.js'

// Reference solution for exercise 23.
// Key ideas:
// - Only THREE things are real state: the filter text, the sort and the page.
//   The rows on screen, the number of pages and every aria-sort value are
//   DERIVED from those three plus the data, during render. Nothing is copied
//   into state, so nothing can get out of sync.
// - The order of work is: filter -> sort -> cut out one page.
// - Array.prototype.sort changes the array it is called on. We use toSorted(),
//   which returns a new array, so the data we were given is never touched.

const PAGE_SIZE = 5

// One collator, created once. It compares text the way people expect:
// "bob" sits between "Alice" and "carol" (case is ignored) and "Émile" sits
// between "David" and "Zoe" (accents are understood, not sorted after "z").
const collator = new Intl.Collator(undefined, { sensitivity: 'accent' })

// Everything that differs per column lives in one table: the label, how to
// compare two employees and how to show one cell. The render code stays short.
const COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    compare: (a, b) => collator.compare(a.name, b.name),
    cell: (e) => e.name,
  },
  {
    key: 'role',
    label: 'Role',
    compare: (a, b) => collator.compare(a.role, b.role),
    cell: (e) => e.role,
  },
  {
    key: 'salary',
    label: 'Salary',
    // Numbers are compared as numbers (as text, "105000" would come before "69000").
    compare: (a, b) => a.salary - b.salary,
    cell: (e) => `$${e.salary.toLocaleString('en-US')}`,
  },
  {
    key: 'startDate',
    label: 'Start date',
    // Dates are compared as moments in time, not as text.
    compare: (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    cell: (e) => new Date(e.startDate).toISOString().slice(0, 10),
  },
]

export default function App({ employees = EMPLOYEES }) {
  // The only state. `sort.key` is null until the user clicks a header.
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: null, direction: 'asc' })
  const [page, setPage] = useState(1)

  // Derived: every row that matches the filter, in the chosen order.
  // useMemo is OPTIONAL here: the app behaves the same without it. We use it
  // because this block only depends on employees, query and sort, so clicking
  // Prev or Next (which changes `page` only) can skip the filter and the sort.
  // For 23 rows that does not matter, for 50,000 rows it does.
  const sortedRows = useMemo(() => {
    const text = query.trim().toLowerCase()
    // includes('') is true, so an empty filter keeps every row.
    const filtered = employees.filter(
      (e) => e.name.toLowerCase().includes(text) || e.role.toLowerCase().includes(text),
    )
    if (sort.key === null) return filtered

    const { compare } = COLUMNS.find((c) => c.key === sort.key)
    // Descending flips the sign of the result instead of reversing the array,
    // so rows that are equal keep their original order in both directions.
    const sign = sort.direction === 'asc' ? 1 : -1
    return filtered.toSorted((a, b) => sign * compare(a, b))
  }, [employees, query, sort])

  // Derived: paging numbers and the rows of the current page.
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const pageRows = sortedRows.slice(start, start + PAGE_SIZE)

  function handleQueryChange(event) {
    setQuery(event.target.value)
    // A new filter means a new list, so go back to the top. Doing it in the
    // handler (not in an effect) means there is no render with a stale page.
    setPage(1)
  }

  function handleSort(key) {
    setSort((prev) =>
      prev.key === key && prev.direction === 'asc'
        ? { key, direction: 'desc' }
        : { key, direction: 'asc' },
    )
  }

  function ariaSortFor(key) {
    if (sort.key !== key) return 'none'
    return sort.direction === 'asc' ? 'ascending' : 'descending'
  }

  return (
    <div>
      <h2>Employees</h2>

      <div>
        <label htmlFor="employee-filter">Filter</label>{' '}
        <input
          id="employee-filter"
          type="text"
          value={query}
          onChange={handleQueryChange}
        />
      </div>

      <table aria-label="Employees">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key} aria-sort={ariaSortFor(col.key)}>
                <button type="button" onClick={() => handleSort(col.key)}>
                  {col.label}
                  {/* Decorative: hidden from screen readers so the button name stays the label. */}
                  {sort.key === col.key && (
                    <span aria-hidden="true">{sort.direction === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((employee) => (
            <tr key={employee.id}>
              {COLUMNS.map((col) => (
                <td key={col.key}>{col.cell(employee)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {pageRows.length === 0 && <p>No matching employees</p>}

      <div>
        <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
          Prev
        </button>{' '}
        <span>
          Page {page} of {totalPages}
        </span>{' '}
        <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
          Next
        </button>
      </div>
    </div>
  )
}
