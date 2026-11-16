import { getPageNumbers } from './pagination.js'

// Reference solution for exercise 13: a reusable, CONTROLLED component.
// Key ideas:
// - it owns no state: the parent passes `page` and hears about changes
//   through `onPageChange`
// - totalPages is DERIVED from total and pageSize on every render, so it can
//   never get out of sync (no useState, no useEffect)
// - the page number is the React key (not the array index), so when the window
//   slides React keeps the same button for the same number, and focus stays on it

const MAX_VISIBLE = 5

export default function Pagination({ total, pageSize, page, onPageChange }) {
  const totalPages = Math.ceil(total / pageSize)
  const numbers = getPageNumbers(page, totalPages, MAX_VISIBLE)

  return (
    <nav aria-label="Pagination">
      <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        Previous
      </button>

      {numbers.map((n) => (
        <button
          key={n}
          onClick={() => onPageChange(n)}
          // aria-current tells screen readers which button is the current page.
          // `undefined` removes the attribute from every other button.
          aria-current={n === page ? 'page' : undefined}
          // a visual cue for sighted users (aria-current is for screen readers)
          style={{ fontWeight: n === page ? 'bold' : 'normal' }}
        >
          {n}
        </button>
      ))}

      <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
        Next
      </button>
    </nav>
  )
}
