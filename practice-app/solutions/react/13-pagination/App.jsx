import { useState } from 'react'
import Pagination from './Pagination.jsx'

// Reference solution for exercise 13.
// Key ideas:
// - only TWO things are real state: the current page and the page size
// - everything else (which items to show, the "Showing 11-20 of 53" text)
//   is DERIVED from those two during render
// - changing the page size also resets the page, in the same event handler

const ITEMS = Array.from({ length: 53 }, (_, i) => `Item ${i + 1}`)
const PAGE_SIZES = [5, 10, 20]
const DEFAULT_PAGE_SIZE = 10

export default function App() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // Derived values: plain variables, recalculated on every render.
  const startIndex = (page - 1) * pageSize
  const visibleItems = ITEMS.slice(startIndex, startIndex + pageSize)
  const first = startIndex + 1
  const last = Math.min(startIndex + pageSize, ITEMS.length)

  const changePageSize = (e) => {
    setPageSize(Number(e.target.value)) // option values are strings
    setPage(1) // always start again at page 1 (page 6 may not exist with a bigger size)
  }

  return (
    <div>
      <h2>Pagination</h2>

      <div>
        <label htmlFor="page-size">Page size</label>
        <select id="page-size" value={pageSize} onChange={changePageSize}>
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <p>
        Showing {first}-{last} of {ITEMS.length}
      </p>

      <ul aria-label="Items">
        {visibleItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <Pagination
        total={ITEMS.length}
        pageSize={pageSize}
        page={page}
        onPageChange={setPage}
      />
    </div>
  )
}
