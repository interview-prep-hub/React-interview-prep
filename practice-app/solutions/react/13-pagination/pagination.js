// Reference solution for exercise 13: a pure helper, no React in here.
//
// Key ideas:
// - "pure" means the same inputs always give the same output and nothing else
//   is touched, so it is trivial to unit test
// - we do not loop and special-case each situation. We pick where the window
//   STARTS (centred on the current page), then slide it back inside 1..totalPages

export function getPageNumbers(page, totalPages, maxVisible = 5) {
  if (totalPages < 1 || maxVisible < 1) return []

  // Never show more buttons than there are pages.
  const count = Math.min(maxVisible, totalPages)

  // Ideal start: put the current page in the middle of the window.
  const centred = page - Math.floor(count / 2)

  // Slide the window so it stays inside 1..totalPages. A page outside the
  // range (0, 99, ...) is handled by this same clamp.
  const lastPossibleStart = totalPages - count + 1
  const start = Math.min(Math.max(centred, 1), lastPossibleStart)

  return Array.from({ length: count }, (_, i) => start + i)
}
