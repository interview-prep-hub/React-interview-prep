import {
  twoSum,
  isValidParentheses,
  groupAnagrams,
  maxSubarray,
  mergeIntervals,
  firstNonRepeatingChar,
  lengthOfLongestSubstring,
  isPalindromeNumber,
} from './index.js'

// Every function here is pure and synchronous, so no timers are needed.
// The "large input" tests at the bottom use a very generous time limit: a
// correct solution finishes in a few milliseconds, a slow O(n^2) solution
// needs many seconds.

// ---------------------------------------------------------------------------
// twoSum
// ---------------------------------------------------------------------------

// There can be several valid pairs, and any of them is accepted. So the tests
// check that the answer is a valid pair instead of one exact pair.
function expectValidPair(nums, target, result) {
  expect(Array.isArray(result)).toBe(true)
  expect(result).toHaveLength(2)
  const [i, j] = result
  expect(Number.isInteger(i)).toBe(true)
  expect(Number.isInteger(j)).toBe(true)
  expect(i).toBeGreaterThanOrEqual(0)
  expect(i).toBeLessThan(j)
  expect(j).toBeLessThan(nums.length)
  expect(nums[i] + nums[j]).toBe(target)
}

describe('19 twoSum', () => {
  it('finds the classic pair', () => {
    expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1])
  })

  it('finds a pair that is not at the start', () => {
    expect(twoSum([3, 2, 4], 6)).toEqual([1, 2])
    expect(twoSum([1, 2, 3, 9], 12)).toEqual([2, 3])
  })

  it('returns the indices in ascending order, whichever number comes first', () => {
    expectValidPair([15, 11, 7, 2], 9, twoSum([15, 11, 7, 2], 9))
    expect(twoSum([15, 11, 7, 2], 9)).toEqual([2, 3])
  })

  it('never uses the same element twice', () => {
    expect(twoSum([3], 6)).toBeNull()
    expect(twoSum([3, 2, 4], 6)).toEqual([1, 2]) // not [0, 0]
    expect(twoSum([5, 1], 10)).toBeNull()
  })

  it('handles duplicate values', () => {
    expect(twoSum([3, 3], 6)).toEqual([0, 1])
    expect(twoSum([1, 5, 5, 8], 10)).toEqual([1, 2])
    const nums = [7, 7, 7, 7]
    expectValidPair(nums, 14, twoSum(nums, 14))
  })

  it('handles negative numbers', () => {
    expect(twoSum([-1, -2, -3, -4, -5], -8)).toEqual([2, 4])
    expect(twoSum([-3, 4, 3, 90], 0)).toEqual([0, 2])
    expect(twoSum([10, -4, 6], 2)).toEqual([1, 2])
  })

  it('handles zeros', () => {
    expect(twoSum([0, 4, 3, 0], 0)).toEqual([0, 3])
    expect(twoSum([0, 5], 5)).toEqual([0, 1])
  })

  it('returns one valid pair when several pairs exist', () => {
    const nums = [1, 2, 3, 4, 5, 6]
    expectValidPair(nums, 7, twoSum(nums, 7))
    const nums2 = [2, 3, 7, 1, 1, 8]
    expectValidPair(nums2, 10, twoSum(nums2, 10))
  })

  it('returns null when no pair adds up to the target', () => {
    expect(twoSum([1, 2, 3], 100)).toBeNull()
    expect(twoSum([1, 2, 3], 0)).toBeNull()
  })

  it('returns null for empty and single-element arrays', () => {
    expect(twoSum([], 0)).toBeNull()
    expect(twoSum([], 5)).toBeNull()
    expect(twoSum([5], 5)).toBeNull()
  })

  it('does not change the input array', () => {
    const nums = [8, 3, 5, 1]
    const result = twoSum(nums, 6)
    expectValidPair(nums, 6, result)
    expect(nums).toEqual([8, 3, 5, 1])
  })

  it('throws a TypeError for the wrong argument types', () => {
    expect(() => twoSum('abc', 3)).toThrow(TypeError)
    expect(() => twoSum(null, 3)).toThrow(TypeError)
    expect(() => twoSum(undefined, 3)).toThrow(TypeError)
    expect(() => twoSum([1, 2], '3')).toThrow(TypeError)
    expect(() => twoSum([1, 2])).toThrow(TypeError)
  })
})

// ---------------------------------------------------------------------------
// isValidParentheses
// ---------------------------------------------------------------------------

describe('19 isValidParentheses', () => {
  it.each(['()', '[]', '{}', '()[]{}', '{[]}', '([{}])', '(())()', '{[()()]}[]'])(
    'accepts the valid string %j',
    (str) => {
      expect(isValidParentheses(str)).toBe(true)
    },
  )

  it.each(['(', ')', '(]', '([)]', '{[}]', '((', '))', '(()', '())', '}{', ')(', '{[(])}'])(
    'rejects the invalid string %j',
    (str) => {
      expect(isValidParentheses(str)).toBe(false)
    },
  )

  it('treats the empty string as valid', () => {
    expect(isValidParentheses('')).toBe(true)
  })

  it('rejects a closer that comes before any opener', () => {
    expect(isValidParentheses(']')).toBe(false)
    expect(isValidParentheses('])[(')).toBe(false)
  })

  it('ignores characters that are not brackets', () => {
    expect(isValidParentheses('a(b)c')).toBe(true)
    expect(isValidParentheses('function f(a, [b]) { return a; }')).toBe(true)
    expect(isValidParentheses('(a]')).toBe(false)
    expect(isValidParentheses('no brackets at all')).toBe(true)
  })

  it('throws a TypeError when the input is not a string', () => {
    expect(() => isValidParentheses(123)).toThrow(TypeError)
    expect(() => isValidParentheses(null)).toThrow(TypeError)
    expect(() => isValidParentheses(['(', ')'])).toThrow(TypeError)
  })
})

// ---------------------------------------------------------------------------
// groupAnagrams
// ---------------------------------------------------------------------------

describe('19 groupAnagrams', () => {
  it('groups the classic example, in order of first appearance', () => {
    expect(groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat'])).toEqual([
      ['eat', 'tea', 'ate'],
      ['tan', 'nat'],
      ['bat'],
    ])
  })

  it('keeps the input order inside each group', () => {
    expect(groupAnagrams(['listen', 'google', 'silent', 'gogole', 'enlist'])).toEqual([
      ['listen', 'silent', 'enlist'],
      ['google', 'gogole'],
    ])
  })

  it('returns an empty array for an empty array', () => {
    expect(groupAnagrams([])).toEqual([])
  })

  it('groups empty strings together', () => {
    expect(groupAnagrams([''])).toEqual([['']])
    expect(groupAnagrams(['', 'a', ''])).toEqual([['', ''], ['a']])
  })

  it('keeps duplicates', () => {
    expect(groupAnagrams(['abc', 'bca', 'abc'])).toEqual([['abc', 'bca', 'abc']])
    expect(groupAnagrams(['a', 'a'])).toEqual([['a', 'a']])
  })

  it('does not group words that only share the same set of letters', () => {
    expect(groupAnagrams(['aab', 'abb', 'baa'])).toEqual([['aab', 'baa'], ['abb']])
  })

  it('does not group words of different lengths', () => {
    expect(groupAnagrams(['ab', 'abb', 'b'])).toEqual([['ab'], ['abb'], ['b']])
  })

  it('is case sensitive', () => {
    expect(groupAnagrams(['Ab', 'bA', 'ab'])).toEqual([['Ab', 'bA'], ['ab']])
  })

  it('works with digits and symbols', () => {
    expect(groupAnagrams(['a1', '1a', 'a-', '-a'])).toEqual([
      ['a1', '1a'],
      ['a-', '-a'],
    ])
  })

  it('does not change the input array', () => {
    const words = ['b', 'a', 'ab', 'ba']
    expect(groupAnagrams(words)).toEqual([['b'], ['a'], ['ab', 'ba']])
    expect(words).toEqual(['b', 'a', 'ab', 'ba'])
  })

  it('throws a TypeError for a non-array or for non-string words', () => {
    expect(() => groupAnagrams('eat')).toThrow(TypeError)
    expect(() => groupAnagrams(null)).toThrow(TypeError)
    expect(() => groupAnagrams(['a', 1])).toThrow(TypeError)
    expect(() => groupAnagrams([null])).toThrow(TypeError)
  })
})

// ---------------------------------------------------------------------------
// maxSubarray (Kadane)
// ---------------------------------------------------------------------------

describe('19 maxSubarray', () => {
  it('solves the classic example', () => {
    expect(maxSubarray([-2, 1, -3, 4, -1, 2, 1, -5, 4])).toBe(6) // [4, -1, 2, 1]
  })

  it('works when the best subarray is the whole array', () => {
    expect(maxSubarray([5, 4, -1, 7, 8])).toBe(23)
    expect(maxSubarray([1, 2, 3])).toBe(6)
  })

  it('works for a single element', () => {
    expect(maxSubarray([1])).toBe(1)
    expect(maxSubarray([-1])).toBe(-1)
    expect(maxSubarray([0])).toBe(0)
  })

  it('returns the largest element when every number is negative', () => {
    expect(maxSubarray([-3, -1, -2])).toBe(-1)
    expect(maxSubarray([-8, -3, -6, -2, -5, -4])).toBe(-2)
  })

  it('handles zeros', () => {
    expect(maxSubarray([0, 0, 0])).toBe(0)
    expect(maxSubarray([-1, 0, -2])).toBe(0)
  })

  it('handles duplicates', () => {
    expect(maxSubarray([2, 2, 2])).toBe(6)
    expect(maxSubarray([-2, -2, -2])).toBe(-2)
  })

  it('knows when to start over after a bad stretch', () => {
    expect(maxSubarray([3, -10, 4])).toBe(4)
    expect(maxSubarray([3, -2, 4])).toBe(5)
    expect(maxSubarray([1, -1, 1, -1, 1])).toBe(1)
  })

  it('returns 0 for an empty array', () => {
    expect(maxSubarray([])).toBe(0)
  })

  it('does not change the input array', () => {
    const nums = [4, -1, 2, -7, 3]
    expect(maxSubarray(nums)).toBe(5)
    expect(nums).toEqual([4, -1, 2, -7, 3])
  })

  it('throws a TypeError when the input is not an array', () => {
    expect(() => maxSubarray('123')).toThrow(TypeError)
    expect(() => maxSubarray(null)).toThrow(TypeError)
    expect(() => maxSubarray(undefined)).toThrow(TypeError)
  })
})

// ---------------------------------------------------------------------------
// mergeIntervals
// ---------------------------------------------------------------------------

describe('19 mergeIntervals', () => {
  it('merges the classic example', () => {
    expect(
      mergeIntervals([
        [1, 3],
        [2, 6],
        [8, 10],
        [15, 18],
      ]),
    ).toEqual([
      [1, 6],
      [8, 10],
      [15, 18],
    ])
  })

  it('merges intervals that only touch', () => {
    expect(
      mergeIntervals([
        [1, 4],
        [4, 5],
      ]),
    ).toEqual([[1, 5]])
    expect(
      mergeIntervals([
        [1, 2],
        [2, 3],
        [3, 4],
      ]),
    ).toEqual([[1, 4]])
  })

  it('keeps intervals that have a gap between them', () => {
    expect(
      mergeIntervals([
        [1, 2],
        [3, 4],
      ]),
    ).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('sorts unsorted input', () => {
    expect(
      mergeIntervals([
        [8, 10],
        [1, 3],
        [2, 6],
      ]),
    ).toEqual([
      [1, 6],
      [8, 10],
    ])
    expect(
      mergeIntervals([
        [5, 6],
        [1, 2],
        [3, 4],
      ]),
    ).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ])
  })

  it('handles an interval that contains others', () => {
    expect(
      mergeIntervals([
        [1, 10],
        [2, 3],
        [4, 5],
      ]),
    ).toEqual([[1, 10]])
    expect(
      mergeIntervals([
        [2, 3],
        [1, 10],
      ]),
    ).toEqual([[1, 10]])
  })

  it('uses the biggest end when starts are equal', () => {
    expect(
      mergeIntervals([
        [1, 4],
        [1, 2],
      ]),
    ).toEqual([[1, 4]])
    expect(
      mergeIntervals([
        [1, 2],
        [1, 4],
      ]),
    ).toEqual([[1, 4]])
  })

  it('handles duplicates and single-point intervals', () => {
    expect(
      mergeIntervals([
        [1, 2],
        [1, 2],
      ]),
    ).toEqual([[1, 2]])
    expect(
      mergeIntervals([
        [2, 2],
        [2, 2],
      ]),
    ).toEqual([[2, 2]])
    expect(
      mergeIntervals([
        [1, 2],
        [2, 2],
        [5, 5],
      ]),
    ).toEqual([
      [1, 2],
      [5, 5],
    ])
  })

  it('handles negative numbers', () => {
    expect(
      mergeIntervals([
        [-5, -2],
        [-3, 1],
        [4, 6],
      ]),
    ).toEqual([
      [-5, 1],
      [4, 6],
    ])
  })

  it('handles empty input and a single interval', () => {
    expect(mergeIntervals([])).toEqual([])
    expect(mergeIntervals([[1, 2]])).toEqual([[1, 2]])
  })

  it('does not change the input, and the result shares no arrays with it', () => {
    const input = [
      [5, 8],
      [1, 3],
      [2, 4],
    ]
    const snapshot = structuredClone(input)
    const result = mergeIntervals(input)
    expect(result).toEqual([
      [1, 4],
      [5, 8],
    ])
    expect(input).toEqual(snapshot)

    result[0][0] = 999
    result[1][1] = -999
    expect(input).toEqual(snapshot)

    const single = [[1, 2]]
    const singleResult = mergeIntervals(single)
    expect(singleResult).toEqual([[1, 2]])
    singleResult[0][1] = 50
    expect(single).toEqual([[1, 2]])
  })

  it.each([
    ['a string', 'abc'],
    ['null', null],
    ['an array of numbers', [1, 2]],
    ['an interval with one number', [[1]]],
    ['an interval with three numbers', [[1, 2, 3]]],
    ['an interval with non-numbers', [['a', 'b']]],
    ['an interval whose start is bigger than its end', [[5, 1]]],
    ['a valid interval followed by an invalid one', [[1, 2], [3]]],
  ])('throws a TypeError for %s', (_label, input) => {
    expect(() => mergeIntervals(input)).toThrow(TypeError)
  })
})

// ---------------------------------------------------------------------------
// firstNonRepeatingChar
// ---------------------------------------------------------------------------

describe('19 firstNonRepeatingChar', () => {
  it.each([
    ['leetcode', 'l'],
    ['loveleetcode', 'v'],
    ['swiss', 'w'],
    ['stress', 't'],
    ['aabbc', 'c'],
    ['aabcc', 'b'],
    ['abc', 'a'],
    ['a', 'a'],
  ])('finds the first unique character of %j', (str, expected) => {
    expect(firstNonRepeatingChar(str)).toBe(expected)
  })

  it('returns null when every character repeats', () => {
    expect(firstNonRepeatingChar('aabb')).toBeNull()
    expect(firstNonRepeatingChar('abcabc')).toBeNull()
    expect(firstNonRepeatingChar('zzzz')).toBeNull()
  })

  it('returns null for the empty string', () => {
    expect(firstNonRepeatingChar('')).toBeNull()
  })

  it('is case sensitive', () => {
    expect(firstNonRepeatingChar('aA')).toBe('a')
    expect(firstNonRepeatingChar('aAa')).toBe('A')
    expect(firstNonRepeatingChar('AaAa')).toBeNull()
  })

  it('counts spaces, digits and punctuation as characters', () => {
    expect(firstNonRepeatingChar('a a b')).toBe('b')
    expect(firstNonRepeatingChar('1122 3')).toBe(' ')
    expect(firstNonRepeatingChar('!!??.')).toBe('.')
  })

  it('throws a TypeError when the input is not a string', () => {
    expect(() => firstNonRepeatingChar(123)).toThrow(TypeError)
    expect(() => firstNonRepeatingChar(null)).toThrow(TypeError)
    expect(() => firstNonRepeatingChar(['a'])).toThrow(TypeError)
  })
})

// ---------------------------------------------------------------------------
// lengthOfLongestSubstring
// ---------------------------------------------------------------------------

describe('19 lengthOfLongestSubstring', () => {
  it.each([
    ['abcabcbb', 3],
    ['bbbbb', 1],
    ['pwwkew', 3],
    ['abcdef', 6],
    ['au', 2],
    ['abc123abc', 6],
  ])('returns the right length for %j', (str, expected) => {
    expect(lengthOfLongestSubstring(str)).toBe(expected)
  })

  it('handles the empty string and a single character', () => {
    expect(lengthOfLongestSubstring('')).toBe(0)
    expect(lengthOfLongestSubstring('a')).toBe(1)
    expect(lengthOfLongestSubstring(' ')).toBe(1)
  })

  it('does not simply restart at the repeated character ("dvdf")', () => {
    expect(lengthOfLongestSubstring('dvdf')).toBe(3) // "vdf"
    expect(lengthOfLongestSubstring('anviaj')).toBe(5) // "nviaj"
  })

  it('never moves the window start backwards ("abba")', () => {
    expect(lengthOfLongestSubstring('abba')).toBe(2)
    expect(lengthOfLongestSubstring('tmmzuxt')).toBe(5) // "mzuxt"
  })

  it('is case sensitive and counts spaces', () => {
    expect(lengthOfLongestSubstring('aA')).toBe(2)
    expect(lengthOfLongestSubstring('a b a')).toBe(3)
    expect(lengthOfLongestSubstring('aAaA')).toBe(2)
  })

  it('throws a TypeError when the input is not a string', () => {
    expect(() => lengthOfLongestSubstring(123)).toThrow(TypeError)
    expect(() => lengthOfLongestSubstring(undefined)).toThrow(TypeError)
    expect(() => lengthOfLongestSubstring(['a', 'b'])).toThrow(TypeError)
  })
})

// ---------------------------------------------------------------------------
// isPalindromeNumber
// ---------------------------------------------------------------------------

describe('19 isPalindromeNumber', () => {
  it.each([0, 1, 7, 9, 11, 22, 121, 1221, 12321, 100001, 1000000001, 2147447412, 1234567887654321])(
    'accepts the palindrome %i',
    (n) => {
      expect(isPalindromeNumber(n)).toBe(true)
    },
  )

  it.each([10, 12, 100, 120, 123, 1231, 12345, 1000021, 9007199254740991])(
    'rejects the non-palindrome %i',
    (n) => {
      expect(isPalindromeNumber(n)).toBe(false)
    },
  )

  it('rejects negative numbers, because of the minus sign', () => {
    expect(isPalindromeNumber(-1)).toBe(false)
    expect(isPalindromeNumber(-121)).toBe(false)
    expect(isPalindromeNumber(-10)).toBe(false)
  })

  it('rejects numbers that end in 0 (except 0 itself)', () => {
    expect(isPalindromeNumber(0)).toBe(true)
    expect(isPalindromeNumber(10)).toBe(false)
    expect(isPalindromeNumber(1010)).toBe(false)
    expect(isPalindromeNumber(5000)).toBe(false)
  })

  it.each([
    ['a decimal number', 1.5],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['an integer too big to be safe', 2 ** 53],
    ['a numeric string', '121'],
    ['null', null],
    ['undefined', undefined],
  ])('throws a TypeError for %s', (_label, input) => {
    expect(() => isPalindromeNumber(input)).toThrow(TypeError)
  })

  it('does not turn the number into a string (rule check on the source code)', () => {
    // Make sure the function really works first, so an empty function cannot pass.
    expect(isPalindromeNumber(12321)).toBe(true)
    expect(isPalindromeNumber(12345)).toBe(false)

    // This is a simple guard, not a proof. It reads the text of your function
    // (without comments) and looks for the usual ways to get digits from a string.
    const source = isPalindromeNumber
      .toString()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
    expect(source).not.toMatch(/\bString\s*\(/)
    expect(source).not.toMatch(/\.toString\b/)
    expect(source).not.toMatch(/\btoFixed\b|\btoLocaleString\b|\bJSON\b/)
    expect(source).not.toMatch(/\.split\s*\(|\.join\s*\(/)
    expect(source).not.toMatch(/\$\{/) // no template strings with ${...}
    expect(source).not.toMatch(/(?:''|"")\s*\+|\+\s*(?:''|"")/) // no "" + n
  })
})

// ---------------------------------------------------------------------------
// Large inputs: the complexity target
// ---------------------------------------------------------------------------

function timeIt(fn) {
  const start = performance.now()
  const result = fn()
  return { result, ms: performance.now() - start }
}

// A correct O(n) or O(n log n) solution needs only a few milliseconds for
// these inputs (the limit below is more than 15 times what it needs). A
// nested-loop solution needs several seconds or more.
const LIMIT_MS = 1500

describe('19 large inputs (complexity target)', () => {
  it('twoSum handles 100,000 numbers in linear time', () => {
    const n = 100_000
    const nums = Array.from({ length: n }, (_, i) => i)
    // Only the last two numbers add up to this target.
    const target = nums[n - 1] + nums[n - 2]

    const { result, ms } = timeIt(() => twoSum(nums, target))
    expect(result).toEqual([n - 2, n - 1])
    expect(ms).toBeLessThan(LIMIT_MS)
  })

  it('maxSubarray handles 60,000 numbers in linear time', () => {
    const nums = [-5, ...new Array(60_000).fill(1), -5]

    const { result, ms } = timeIt(() => maxSubarray(nums))
    expect(result).toBe(60_000)
    expect(ms).toBeLessThan(LIMIT_MS)
  })

  it('isValidParentheses handles 30,000 nested pairs in linear time', () => {
    const deep = '('.repeat(30_000) + ')'.repeat(30_000)
    const unclosed = '['.repeat(60_000)

    const valid = timeIt(() => isValidParentheses(deep))
    expect(valid.result).toBe(true)
    expect(valid.ms).toBeLessThan(LIMIT_MS)

    const invalid = timeIt(() => isValidParentheses(unclosed))
    expect(invalid.result).toBe(false)
    expect(invalid.ms).toBeLessThan(LIMIT_MS)
  })

  it('mergeIntervals handles 50,000 unsorted intervals', () => {
    const n = 50_000
    // Disjoint intervals [0,1], [4,5], [8,9], ... listed from last to first,
    // so the function has to sort them.
    const intervals = Array.from({ length: n }, (_, i) => [(n - 1 - i) * 4, (n - 1 - i) * 4 + 1])

    const { result, ms } = timeIt(() => mergeIntervals(intervals))
    expect(result).toHaveLength(n)
    expect(result[0]).toEqual([0, 1])
    expect(result[n - 1]).toEqual([(n - 1) * 4, (n - 1) * 4 + 1])
    expect(ms).toBeLessThan(LIMIT_MS)
  })
})
