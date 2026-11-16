import { getPageNumbers } from './pagination.js'

// Exercise 13: a reusable, controlled Pagination component.
// Read README.md in this folder for the full requirements.

const MAX_VISIBLE = 5

// Props:
//   total         how many items there are in total
//   pageSize      how many items fit on one page
//   page          the current page (1-based), owned by the PARENT
//   onPageChange  called with the new page number when the user picks one
export default function Pagination({ total, pageSize, page, onPageChange }) {
  // TODO 1: work out totalPages from total and pageSize (a plain variable, not state)
  // TODO 2: get the numbers to show with getPageNumbers(page, totalPages, MAX_VISIBLE)

  return (
    <nav aria-label="Pagination">
      {/* TODO 3: a "Previous" button, disabled on the first page */}
      {/* TODO 4: one button per page number (key = the page number, not the index),
          with aria-current="page" on the current one */}
      {/* TODO 5: a "Next" button, disabled on the last page */}
    </nav>
  )
}
