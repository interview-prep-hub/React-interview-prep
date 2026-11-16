// Exercise 13: the pure helper. No React in this file.
// Read README.md in this folder for the full rules and examples.

/**
 * Which page numbers should the buttons show?
 *
 * @param {number} page        the current page (1-based)
 * @param {number} totalPages  how many pages exist
 * @param {number} maxVisible  the most numbers to show (default 5)
 * @returns {number[]}         consecutive page numbers that include `page`
 */
export function getPageNumbers(page, totalPages, maxVisible = 5) {
  // TODO 1: return [] when there are no pages (or maxVisible is less than 1)
  // TODO 2: never show more numbers than there are pages
  // TODO 3: find where the window STARTS so the current page is in the middle
  // TODO 4: slide the window back inside 1..totalPages near the two ends
  // TODO 5: build and return the array of consecutive numbers
  return []
}
