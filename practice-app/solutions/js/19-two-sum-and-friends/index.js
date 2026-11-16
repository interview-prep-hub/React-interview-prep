// Reference solution for exercise 19: two sum and friends.
//
// Key ideas:
// - A Map (hash table) turns "search the rest of the array" (O(n)) into a
//   lookup (O(1)). That is how twoSum drops from O(n^2) to O(n).
// - A stack answers "what was the most recent unfinished thing?" (brackets).
// - Kadane, the sliding window and the "sort first, then one pass" merge all
//   keep a tiny amount of running state instead of re-scanning the input.

function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array`)
  }
}

function assertString(value, name) {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a string`)
  }
}

// ---------------------------------------------------------------------------
// 1. twoSum: one pass with a Map of "value -> index where we saw it".
// ---------------------------------------------------------------------------
export function twoSum(nums, target) {
  assertArray(nums, 'nums')
  if (typeof target !== 'number') {
    throw new TypeError('target must be a number')
  }

  const seen = new Map()
  for (let j = 0; j < nums.length; j++) {
    // Which earlier number would complete the pair?
    const i = seen.get(target - nums[j])
    if (i !== undefined) return [i, j]
    // Remember this number AFTER the lookup, so an element is never paired
    // with itself.
    seen.set(nums[j], j)
  }
  return null
}

// ---------------------------------------------------------------------------
// 2. isValidParentheses: a stack of the openers that are still waiting.
// ---------------------------------------------------------------------------
const OPENER_FOR = new Map([
  [')', '('],
  [']', '['],
  ['}', '{'],
])
const OPENERS = new Set(OPENER_FOR.values())

export function isValidParentheses(str) {
  assertString(str, 'str')

  const stack = []
  for (const ch of str) {
    if (OPENERS.has(ch)) {
      stack.push(ch)
    } else if (OPENER_FOR.has(ch)) {
      // pop() on an empty stack gives undefined, which never matches.
      if (stack.pop() !== OPENER_FOR.get(ch)) return false
    }
    // Any other character is ignored.
  }
  return stack.length === 0 // leftover openers were never closed
}

// ---------------------------------------------------------------------------
// 3. groupAnagrams: words with the same sorted letters share a Map key.
//    A Map remembers insertion order, so groups come out in order of first
//    appearance and each group keeps the input order.
// ---------------------------------------------------------------------------
export function groupAnagrams(words) {
  assertArray(words, 'words')

  const groups = new Map()
  for (const word of words) {
    assertString(word, 'every word')
    const key = [...word].sort().join('')
    const group = groups.get(key)
    if (group) group.push(word)
    else groups.set(key, [word])
  }
  return [...groups.values()]
}

// ---------------------------------------------------------------------------
// 4. maxSubarray: Kadane's algorithm.
//    At each number, either extend the best subarray that ends at the previous
//    number, or start fresh here. Whichever is bigger wins.
// ---------------------------------------------------------------------------
export function maxSubarray(nums) {
  assertArray(nums, 'nums')
  if (nums.length === 0) return 0

  let endingHere = nums[0]
  let best = nums[0]
  for (let i = 1; i < nums.length; i++) {
    endingHere = Math.max(nums[i], endingHere + nums[i])
    best = Math.max(best, endingHere)
  }
  return best
}

// ---------------------------------------------------------------------------
// 5. mergeIntervals: sort by start, then one pass. Because of the sorting, an
//    interval can only overlap the LAST interval we kept.
// ---------------------------------------------------------------------------
function isInterval(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] <= value[1]
  )
}

export function mergeIntervals(intervals) {
  assertArray(intervals, 'intervals')
  if (!intervals.every(isInterval)) {
    throw new TypeError('every interval must be [start, end] with start <= end')
  }

  // Copy first: sort() changes the array it is called on, and we must not
  // change the input (or share its inner arrays with the result).
  const sorted = intervals.map(([start, end]) => [start, end]).sort((a, b) => a[0] - b[0])

  const merged = []
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1]
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end) // overlap or touch: extend the last one
    } else {
      merged.push([start, end])
    }
  }
  return merged
}

// ---------------------------------------------------------------------------
// 6. firstNonRepeatingChar: count everything, then find the first count of 1.
// ---------------------------------------------------------------------------
export function firstNonRepeatingChar(str) {
  assertString(str, 'str')

  const counts = new Map()
  for (const ch of str) counts.set(ch, (counts.get(ch) ?? 0) + 1)
  for (const ch of str) {
    if (counts.get(ch) === 1) return ch
  }
  return null
}

// ---------------------------------------------------------------------------
// 7. lengthOfLongestSubstring: sliding window [start, end].
//    The window never contains a repeated character. When `end` meets a
//    character that is already inside the window, `start` jumps to just after
//    its previous position. `start` only ever moves forward.
// ---------------------------------------------------------------------------
export function lengthOfLongestSubstring(str) {
  assertString(str, 'str')

  const chars = [...str]
  const lastIndex = new Map() // char -> index of its latest occurrence
  let start = 0
  let best = 0
  for (let end = 0; end < chars.length; end++) {
    const previous = lastIndex.get(chars[end])
    if (previous !== undefined && previous >= start) {
      start = previous + 1
    }
    lastIndex.set(chars[end], end)
    best = Math.max(best, end - start + 1)
  }
  return best
}

// ---------------------------------------------------------------------------
// 8. isPalindromeNumber: reverse only the second half of the digits using
//    maths (% 10 reads the last digit, / 10 drops it). No strings.
// ---------------------------------------------------------------------------
export function isPalindromeNumber(n) {
  if (!Number.isSafeInteger(n)) {
    throw new TypeError('n must be a safe integer')
  }
  if (n < 0) return false // the minus sign has no mirror
  if (n !== 0 && n % 10 === 0) return false // would need a leading zero

  let rest = n // the first half, shrinking
  let reversedHalf = 0 // the second half, reversed, growing
  while (rest > reversedHalf) {
    const digit = rest % 10
    reversedHalf = reversedHalf * 10 + digit
    rest = (rest - digit) / 10
  }
  // Even digit count: both halves are equal.
  // Odd digit count: reversedHalf has one extra middle digit, drop it first.
  return rest === reversedHalf || rest === (reversedHalf - (reversedHalf % 10)) / 10
}
