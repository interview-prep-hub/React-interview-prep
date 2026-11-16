import { getPageNumbers } from './pagination.js'

// Small helper so the expected arrays are easy to read: range(2, 6) -> [2, 3, 4, 5, 6]
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

// Checks one call against the rules in the README. Returns a short message
// naming the first rule that is broken, or null when everything is fine.
function brokenRule(page, totalPages, maxVisible) {
  const numbers = getPageNumbers(page, totalPages, maxVisible)
  const count = Math.min(maxVisible, totalPages)
  const current = Math.min(Math.max(page, 1), totalPages) // nearest valid page
  const before = Math.floor(count / 2) // numbers shown before the page
  const after = count - 1 - before // numbers shown after the page
  const first = numbers[0]
  const last = numbers.at(-1)

  if (numbers.length !== count) return `expected ${count} numbers, got [${numbers}]`
  if (numbers.some((n, i) => n !== first + i)) return `not consecutive: [${numbers}]`
  if (first < 1 || last > totalPages) return `outside 1..${totalPages}: [${numbers}]`
  if (!numbers.includes(current)) return `does not contain ${current}: [${numbers}]`
  if (current - before < 1) {
    return first === 1 ? null : `should slide to the start: [${numbers}]`
  }
  if (current + after > totalPages) {
    return last === totalPages ? null : `should slide to the end: [${numbers}]`
  }
  return numbers.indexOf(current) === before ? null : `should be centred: [${numbers}]`
}

describe('13 Pagination: getPageNumbers(page, totalPages, maxVisible)', () => {
  it('returns every page when there are no more pages than maxVisible', () => {
    expect(getPageNumbers(1, 3, 5)).toEqual([1, 2, 3])
    expect(getPageNumbers(3, 3, 5)).toEqual([1, 2, 3])
    expect(getPageNumbers(2, 5, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('returns [1] for a single page and [] for no pages at all', () => {
    expect(getPageNumbers(1, 1, 5)).toEqual([1])
    expect(getPageNumbers(1, 0, 5)).toEqual([])
  })

  it('keeps the window at the start for the first pages', () => {
    expect(getPageNumbers(1, 10, 5)).toEqual([1, 2, 3, 4, 5])
    expect(getPageNumbers(2, 10, 5)).toEqual([1, 2, 3, 4, 5])
    expect(getPageNumbers(3, 10, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('centres the window on the current page in the middle', () => {
    expect(getPageNumbers(4, 10, 5)).toEqual([2, 3, 4, 5, 6])
    expect(getPageNumbers(5, 10, 5)).toEqual([3, 4, 5, 6, 7])
    expect(getPageNumbers(6, 10, 5)).toEqual([4, 5, 6, 7, 8])
    expect(getPageNumbers(7, 10, 5)).toEqual([5, 6, 7, 8, 9])
  })

  it('keeps the window at the end for the last pages', () => {
    expect(getPageNumbers(8, 10, 5)).toEqual([6, 7, 8, 9, 10])
    expect(getPageNumbers(9, 10, 5)).toEqual([6, 7, 8, 9, 10])
    expect(getPageNumbers(10, 10, 5)).toEqual([6, 7, 8, 9, 10])
  })

  it('always returns maxVisible consecutive numbers that include the current page', () => {
    const totalPages = 20
    for (let page = 1; page <= totalPages; page++) {
      const numbers = getPageNumbers(page, totalPages, 5)
      expect(numbers).toHaveLength(5)
      expect(numbers).toContain(page)
      expect(numbers).toEqual(range(numbers[0], numbers[0] + 4))
      expect(numbers[0]).toBeGreaterThanOrEqual(1)
      expect(numbers.at(-1)).toBeLessThanOrEqual(totalPages)
    }
  })

  it('uses 5 as the default for maxVisible', () => {
    expect(getPageNumbers(6, 10)).toEqual([4, 5, 6, 7, 8])
    expect(getPageNumbers(1, 3)).toEqual([1, 2, 3])
  })

  it('works with an odd maxVisible other than 5', () => {
    expect(getPageNumbers(5, 10, 3)).toEqual([4, 5, 6])
    expect(getPageNumbers(1, 10, 3)).toEqual([1, 2, 3])
    expect(getPageNumbers(10, 10, 3)).toEqual([8, 9, 10])
    expect(getPageNumbers(4, 10, 1)).toEqual([4])
  })

  it('starts floor(maxVisible / 2) pages before the current page when maxVisible is even', () => {
    expect(getPageNumbers(5, 10, 4)).toEqual([3, 4, 5, 6])
    expect(getPageNumbers(1, 10, 4)).toEqual([1, 2, 3, 4])
    expect(getPageNumbers(10, 10, 4)).toEqual([7, 8, 9, 10])
  })

  it('treats a page outside 1..totalPages as the nearest valid page', () => {
    expect(getPageNumbers(0, 10, 5)).toEqual(getPageNumbers(1, 10, 5))
    expect(getPageNumbers(-4, 10, 5)).toEqual([1, 2, 3, 4, 5])
    expect(getPageNumbers(99, 10, 5)).toEqual([6, 7, 8, 9, 10])
  })

  it('returns [] when maxVisible or totalPages is less than 1', () => {
    expect(getPageNumbers(1, 10, 1)).toEqual([1]) // the smallest window still works
    expect(getPageNumbers(1, 10, 0)).toEqual([])
    expect(getPageNumbers(1, 10, -2)).toEqual([])
    expect(getPageNumbers(1, -3, 5)).toEqual([])
  })

  it('returns a new array on every call and does not depend on earlier calls', () => {
    const first = getPageNumbers(1, 10, 5)
    const second = getPageNumbers(6, 10, 5)
    expect(first).not.toBe(second)
    expect(first).toEqual([1, 2, 3, 4, 5])
    expect(second).toEqual([4, 5, 6, 7, 8])

    first.push(999)
    expect(getPageNumbers(1, 10, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('follows the rules for every combination of page, totalPages and maxVisible', () => {
    // Plain loops, one assertion at the end: fast, and the message lists the first problems.
    const problems = []
    for (let totalPages = 1; totalPages <= 12; totalPages++) {
      for (let maxVisible = 1; maxVisible <= 8; maxVisible++) {
        for (let page = -1; page <= totalPages + 2; page++) {
          const problem = brokenRule(page, totalPages, maxVisible)
          if (problem) {
            problems.push(`page=${page}, totalPages=${totalPages}, maxVisible=${maxVisible}: ${problem}`)
          }
        }
      }
    }
    expect(problems.slice(0, 5)).toEqual([])
  })
})
