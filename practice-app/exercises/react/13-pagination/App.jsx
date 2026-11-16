import { useState } from 'react'
import Pagination from './Pagination.jsx'

// Exercise 13: Pagination.
// Read README.md in this folder for the full requirements.

const ITEMS = Array.from({ length: 53 }, (_, i) => `Item ${i + 1}`)
const PAGE_SIZES = [5, 10, 20]

export default function App() {
  // TODO 1: state for the current page (starts at 1)
  // TODO 2: state for the page size (starts at 10)
  // TODO 3: DERIVE the visible items, and the "first" and "last" numbers for the
  //         summary, from page and pageSize. Plain variables, not more state.

  return (
    <div>
      <h2>Pagination</h2>

      {/* TODO 4: a labelled <select> for the page size (use PAGE_SIZES) */}
      {/* TODO 5: the summary text, for example "Showing 11-20 of 53" */}
      {/* TODO 6: the list of visible items */}
      {/* TODO 7: <Pagination total pageSize page onPageChange /> */}
    </div>
  )
}
