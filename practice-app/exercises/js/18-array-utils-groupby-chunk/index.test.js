import {
  groupBy,
  countBy,
  chunk,
  uniqBy,
  partition,
  zip,
  unzip,
  sortBy,
  intersection,
  difference,
  range,
  shuffle,
} from './index.js'

// Input arrays are frozen. If a function tries to change its input
// (push, sort, splice, reverse...), JavaScript throws and the test fails.
const frozen = (items) => Object.freeze([...items])

const makePeople = () =>
  frozen([
    { name: 'Ana', team: 'blue', age: 30 },
    { name: 'Ben', team: 'red', age: 25 },
    { name: 'Cleo', team: 'blue', age: 41 },
    { name: 'Dan', team: 'red', age: 25 },
    { name: 'Eve', team: 'blue', age: 30 },
  ])

// A small seeded random number generator, so "random" tests give the same
// numbers on every run (mulberry32). Returns numbers from 0 up to (not including) 1.
function seededRng(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('18 Array utils: groupBy, chunk and friends', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('argument checks', () => {
    it.each([
      ['groupBy', () => groupBy(null, 'a')],
      ['countBy', () => countBy('abc', 'a')],
      ['chunk', () => chunk({ length: 2 }, 1)],
      ['uniqBy', () => uniqBy(undefined, 'a')],
      ['partition', () => partition(42, () => true)],
      ['sortBy', () => sortBy('abc', 'a')],
      ['intersection', () => intersection(null, [1])],
      ['difference', () => difference('abc', [1])],
      ['shuffle', () => shuffle(null)],
      ['unzip', () => unzip(null)],
      ['zip', () => zip([1, 2], 'ab')],
    ])('%s throws a TypeError when it gets something that is not an array', (_name, call) => {
      expect(call).toThrow(TypeError)
    })

    it.each([
      ['groupBy', groupBy],
      ['countBy', countBy],
      ['uniqBy', uniqBy],
      ['sortBy', sortBy],
    ])('%s throws a TypeError when the key is not a function or a string', (_name, fn) => {
      expect(() => fn([1, 2], undefined)).toThrow(TypeError)
      expect(() => fn([1, 2], 42)).toThrow(TypeError)
      expect(() => fn([], {})).toThrow(TypeError)
    })
  })

  describe('groupBy', () => {
    it('groups by a property name and keeps the original order inside each group', () => {
      const people = makePeople()
      const result = groupBy(people, 'team')
      expect(Object.keys(result).sort()).toEqual(['blue', 'red'])
      expect(result.blue.map((p) => p.name)).toEqual(['Ana', 'Cleo', 'Eve'])
      expect(result.red.map((p) => p.name)).toEqual(['Ben', 'Dan'])
    })

    it('groups by the result of a function', () => {
      const result = groupBy([1, 2, 3, 4, 5, 6], (n) => (n % 2 === 0 ? 'even' : 'odd'))
      expect(result).toEqual({ odd: [1, 3, 5], even: [2, 4, 6] })
    })

    it('passes (item, index) to the key function', () => {
      const result = groupBy(['a', 'b', 'c', 'd', 'e'], (item, index) => index % 2)
      expect(result).toEqual({ 0: ['a', 'c', 'e'], 1: ['b', 'd'] })
    })

    it('turns keys into strings, like any object key', () => {
      const result = groupBy([1.2, 1.5, 2.1, 3.9, 3.1], Math.floor)
      expect(Object.keys(result).sort()).toEqual(['1', '2', '3'])
      expect(result).toEqual({ 1: [1.2, 1.5], 2: [2.1], 3: [3.9, 3.1] })
    })

    it('puts items without the property under the key "undefined"', () => {
      const a = { id: 1 }
      const b = {}
      const result = groupBy([a, b], 'id')
      expect(result).toEqual({ 1: [a], undefined: [b] })
    })

    it('returns an empty object for an empty array', () => {
      expect(groupBy([], 'team')).toEqual({})
    })

    it('keeps the same item references (no copies)', () => {
      const people = makePeople()
      const result = groupBy(people, 'team')
      expect(result.red[0]).toBe(people[1])
    })

    it('treats names like "constructor" and "toString" as normal keys', () => {
      const result = groupBy(['constructor', 'toString', 'a', 'constructor', 'hasOwnProperty'], (word) => word)
      expect(result).toEqual({
        constructor: ['constructor', 'constructor'],
        toString: ['toString'],
        a: ['a'],
        hasOwnProperty: ['hasOwnProperty'],
      })
    })
  })

  describe('countBy', () => {
    it('counts the items per key (function)', () => {
      expect(countBy([6.1, 4.2, 6.3], Math.floor)).toEqual({ 4: 1, 6: 2 })
    })

    it('counts the items per key (property name)', () => {
      expect(countBy(makePeople(), 'team')).toEqual({ blue: 3, red: 2 })
    })

    it('passes (item, index) to the key function', () => {
      expect(countBy(['x', 'y', 'z'], (item, index) => (index === 0 ? 'first' : 'rest'))).toEqual({
        first: 1,
        rest: 2,
      })
    })

    it('returns an empty object for an empty array', () => {
      expect(countBy([], (x) => x)).toEqual({})
    })

    it('treats names like "constructor" and "toString" as normal keys', () => {
      const result = countBy(['constructor', 'toString', 'constructor'], (word) => word)
      expect(result).toEqual({ constructor: 2, toString: 1 })
    })
  })

  describe('chunk', () => {
    it('splits into pieces of the given size, the last one may be shorter', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
      expect(chunk([1, 2, 3, 4, 5, 6], 3)).toEqual([
        [1, 2, 3],
        [4, 5, 6],
      ])
    })

    it('returns one chunk when the size is bigger than the array', () => {
      expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]])
    })

    it('works with size 1', () => {
      expect(chunk(['a', 'b', 'c'], 1)).toEqual([['a'], ['b'], ['c']])
    })

    it('returns an empty array for an empty array', () => {
      expect(chunk([], 3)).toEqual([])
    })

    it('does not change the input and returns new arrays', () => {
      const input = frozen([1, 2, 3, 4])
      const result = chunk(input, 4)
      expect(result).toEqual([[1, 2, 3, 4]])
      expect(result[0]).not.toBe(input)
      expect(input).toEqual([1, 2, 3, 4])
    })

    it.each([[0], [-1], [1.5], [NaN], [undefined]])('throws a RangeError for the size %s', (size) => {
      expect(() => chunk([1, 2, 3], size)).toThrow(RangeError)
    })
  })

  describe('uniqBy', () => {
    it('keeps the first item for each key (property name)', () => {
      const users = frozen([
        { id: 1, name: 'first' },
        { id: 2, name: 'two' },
        { id: 1, name: 'second' },
        { id: 3, name: 'three' },
        { id: 2, name: 'again' },
      ])
      const result = uniqBy(users, 'id')
      expect(result.map((u) => u.name)).toEqual(['first', 'two', 'three'])
      expect(result[0]).toBe(users[0])
    })

    it('keeps the first item for each key (function)', () => {
      expect(uniqBy([2.3, 1.1, 2.9, 1.8, 3.5], Math.floor)).toEqual([2.3, 1.1, 3.5])
    })

    it('passes (item, index) to the key function', () => {
      expect(uniqBy(['a', 'b', 'c', 'd'], (item, index) => index % 2)).toEqual(['a', 'b'])
    })

    it('does not mix up 1 and "1", but treats NaN as one key', () => {
      expect(uniqBy([1, '1', 1, '1'], (x) => x)).toEqual([1, '1'])
      expect(uniqBy([NaN, NaN, 0], (x) => x)).toEqual([NaN, 0])
    })

    it('returns an empty array for an empty array', () => {
      expect(uniqBy([], 'id')).toEqual([])
    })
  })

  describe('partition', () => {
    it('splits into [passing, failing] and keeps the order', () => {
      const [even, odd] = partition(frozen([1, 2, 3, 4, 5, 6]), (n) => n % 2 === 0)
      expect(even).toEqual([2, 4, 6])
      expect(odd).toEqual([1, 3, 5])
    })

    it('passes (item, index) to the predicate', () => {
      expect(partition(['a', 'b', 'c', 'd'], (item, index) => index % 2 === 0)).toEqual([
        ['a', 'c'],
        ['b', 'd'],
      ])
    })

    it('uses truthy and falsy values', () => {
      expect(partition([0, 'a', '', null, 5], (x) => x)).toEqual([
        ['a', 5],
        [0, '', null],
      ])
    })

    it('handles the extreme cases', () => {
      expect(partition([1, 2], () => true)).toEqual([[1, 2], []])
      expect(partition([1, 2], () => false)).toEqual([[], [1, 2]])
      expect(partition([], () => true)).toEqual([[], []])
    })

    it('keeps the same item references', () => {
      const a = { ok: true }
      const b = { ok: false }
      const [passing, failing] = partition([a, b], (item) => item.ok)
      expect(passing[0]).toBe(a)
      expect(failing[0]).toBe(b)
    })

    it('throws a TypeError when the predicate is not a function', () => {
      expect(() => partition([1, 2], 'ok')).toThrow(TypeError)
      expect(() => partition([], undefined)).toThrow(TypeError)
    })
  })

  describe('zip and unzip', () => {
    it('zip pairs up items with the same index', () => {
      expect(zip([1, 2, 3], ['a', 'b', 'c'])).toEqual([
        [1, 'a'],
        [2, 'b'],
        [3, 'c'],
      ])
    })

    it('zip accepts any number of arrays', () => {
      expect(zip([1, 2], ['a', 'b'], [true, false])).toEqual([
        [1, 'a', true],
        [2, 'b', false],
      ])
      expect(zip([1, 2])).toEqual([[1], [2]])
    })

    it('zip uses the longest array and fills the gaps with undefined (not holes)', () => {
      const result = zip([1, 2, 3], ['a'])
      expect(result).toStrictEqual([
        [1, 'a'],
        [2, undefined],
        [3, undefined],
      ])
    })

    it('zip returns an empty array when there is nothing to zip', () => {
      expect(zip()).toEqual([])
      expect(zip([], [])).toEqual([])
    })

    it('zip does not change its inputs', () => {
      const a = frozen([1, 2])
      const b = frozen(['x', 'y'])
      expect(zip(a, b)).toEqual([
        [1, 'x'],
        [2, 'y'],
      ])
      expect(a).toEqual([1, 2])
    })

    it('unzip turns groups back into separate arrays', () => {
      expect(
        unzip([
          [1, 'a'],
          [2, 'b'],
          [3, 'c'],
        ]),
      ).toEqual([
        [1, 2, 3],
        ['a', 'b', 'c'],
      ])
    })

    it('unzip undoes zip', () => {
      const letters = ['a', 'b', 'c']
      const numbers = [1, 2, 3]
      expect(unzip(zip(letters, numbers))).toEqual([letters, numbers])
    })

    it('unzip fills the gaps of short groups with undefined (not holes)', () => {
      expect(unzip([[1, 'a'], [2], [3, 'c']])).toStrictEqual([
        [1, 2, 3],
        ['a', undefined, 'c'],
      ])
    })

    it('unzip of an empty array is an empty array and the input is not changed', () => {
      expect(unzip([])).toEqual([])
      const groups = frozen([[1, 'a']])
      expect(unzip(groups)).toEqual([[1], ['a']])
      expect(groups).toEqual([[1, 'a']])
    })

    it('unzip throws a TypeError when a group is not an array', () => {
      expect(() => unzip([[1, 2], 'ab'])).toThrow(TypeError)
    })
  })

  describe('sortBy', () => {
    it('sorts by a property name, smallest first', () => {
      const result = sortBy(makePeople(), 'age')
      expect(result.map((p) => p.name)).toEqual(['Ben', 'Dan', 'Ana', 'Eve', 'Cleo'])
    })

    it('sorts by a function', () => {
      expect(sortBy(['ccc', 'a', 'bb'], (word) => word.length)).toEqual(['a', 'bb', 'ccc'])
    })

    it('sorts strings by property', () => {
      const result = sortBy(makePeople(), 'name')
      expect(result.map((p) => p.name)).toEqual(['Ana', 'Ben', 'Cleo', 'Dan', 'Eve'])
    })

    it('compares numbers as numbers, not as text', () => {
      expect(sortBy([10, 9, 1, 100], (n) => n)).toEqual([1, 9, 10, 100])
    })

    it('puts the biggest first when the key starts with "-"', () => {
      const result = sortBy(makePeople(), '-age')
      expect(result.map((p) => p.name)).toEqual(['Cleo', 'Ana', 'Eve', 'Ben', 'Dan'])
    })

    it('uses the next key to break ties', () => {
      const result = sortBy(makePeople(), 'team', 'age')
      expect(result.map((p) => p.name)).toEqual(['Ana', 'Eve', 'Cleo', 'Ben', 'Dan'])
    })

    it('mixes ascending and descending keys, and strings and functions', () => {
      const byTeamThenOldest = sortBy(makePeople(), 'team', '-age')
      expect(byTeamThenOldest.map((p) => p.name)).toEqual(['Cleo', 'Ana', 'Eve', 'Ben', 'Dan'])

      const byFunctionThenName = sortBy(makePeople(), (p) => p.age > 28, '-name')
      expect(byFunctionThenName.map((p) => p.name)).toEqual(['Dan', 'Ben', 'Eve', 'Cleo', 'Ana'])
    })

    it.each([
      ['group', 'even', 'odd'],
      ['-group', 'odd', 'even'],
    ])('is stable for the key "%s": items that tie keep their original order', (key, firstGroup, secondGroup) => {
      const items = frozen(
        Array.from({ length: 30 }, (_, i) => ({ id: i, group: i % 2 === 0 ? 'even' : 'odd' })),
      )
      const result = sortBy(items, key)
      const idsOf = (group) => result.filter((item) => item.group === group).map((item) => item.id)
      const originalIdsOf = (group) => items.filter((item) => item.group === group).map((item) => item.id)
      // Inside each group the ids are still in their original order...
      expect(idsOf('even')).toEqual(originalIdsOf('even'))
      expect(idsOf('odd')).toEqual(originalIdsOf('odd'))
      // ...and the groups themselves are in the order the key asks for.
      expect(result.slice(0, 15).every((item) => item.group === firstGroup)).toBe(true)
      expect(result.slice(15).every((item) => item.group === secondGroup)).toBe(true)
    })

    it('passes (item, index) to key functions', () => {
      expect(sortBy(['x', 'y', 'z'], (item, index) => -index)).toEqual(['z', 'y', 'x'])
    })

    it('compares the items themselves when no key is given', () => {
      expect(sortBy([3, 1, 2])).toEqual([1, 2, 3])
      expect(sortBy(['pear', 'apple', 'fig'])).toEqual(['apple', 'fig', 'pear'])
    })

    it('returns a new array and never changes the input', () => {
      const sortedAlready = frozen([1, 2, 3])
      const result = sortBy(sortedAlready, (n) => n)
      expect(result).toEqual([1, 2, 3])
      expect(result).not.toBe(sortedAlready)

      const people = makePeople()
      sortBy(people, '-age')
      expect(people.map((p) => p.name)).toEqual(['Ana', 'Ben', 'Cleo', 'Dan', 'Eve'])
    })

    it('returns an empty array for an empty array', () => {
      expect(sortBy([], 'age')).toEqual([])
    })
  })

  describe('intersection', () => {
    it('keeps the values that are in both arrays, in the order of the first', () => {
      expect(intersection(frozen([5, 1, 3, 2]), frozen([2, 3, 4, 5]))).toEqual([5, 3, 2])
    })

    it('removes duplicates', () => {
      expect(intersection([1, 1, 2, 2, 3], [2, 2, 1])).toEqual([1, 2])
    })

    it('accepts more than two arrays', () => {
      expect(intersection([1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 6])).toEqual([3, 4])
    })

    it('returns an empty array when nothing is shared', () => {
      expect(intersection([1, 2], [3, 4])).toEqual([])
      expect(intersection([], [1])).toEqual([])
      expect(intersection([1], [])).toEqual([])
    })

    it('with only one array returns its unique values', () => {
      expect(intersection([1, 1, 2])).toEqual([1, 2])
    })

    it('finds NaN, and does not mix up 1 and "1"', () => {
      expect(intersection([NaN, 1, '2'], [NaN, '1', 2])).toEqual([NaN])
    })

    it('compares objects by reference, not by content', () => {
      const shared = { id: 1 }
      expect(intersection([shared, { id: 2 }], [shared, { id: 2 }])).toEqual([shared])
      expect(intersection([{ id: 1 }], [{ id: 1 }])).toEqual([])
    })

    it('returns a new array', () => {
      const input = frozen([1, 2])
      const result = intersection(input, input)
      expect(result).toEqual([1, 2])
      expect(result).not.toBe(input)
    })
  })

  describe('difference', () => {
    it('keeps the values of the first array that are not in the other', () => {
      expect(difference(frozen([5, 1, 3, 2]), frozen([2, 3]))).toEqual([5, 1])
    })

    it('removes duplicates', () => {
      expect(difference([1, 1, 2, 3, 3], [2])).toEqual([1, 3])
    })

    it('removes everything that appears in any of the other arrays', () => {
      expect(difference([1, 2, 3, 4, 5], [2], [4, 5])).toEqual([1, 3])
    })

    it('handles empty arrays', () => {
      expect(difference([], [1])).toEqual([])
      expect(difference([1, 2], [])).toEqual([1, 2])
      expect(difference([1, 2], [1, 2])).toEqual([])
    })

    it('with only one array returns its unique values', () => {
      expect(difference([3, 3, 4])).toEqual([3, 4])
    })

    it('treats NaN as equal to NaN, and 1 as different from "1"', () => {
      expect(difference([NaN, 1, '1'], [NaN, 1])).toEqual(['1'])
    })

    it('compares objects by reference', () => {
      const a = { id: 1 }
      const b = { id: 1 }
      expect(difference([a, b], [a])).toEqual([b])
      expect(difference([a, b], [a])[0]).toBe(b)
    })
  })

  describe('range', () => {
    it('counts from start up to, but not including, end', () => {
      expect(range(0, 5)).toEqual([0, 1, 2, 3, 4])
      expect(range(2, 5)).toEqual([2, 3, 4])
      expect(range(-2, 2)).toEqual([-2, -1, 0, 1])
    })

    it('with one argument counts from 0', () => {
      expect(range(3)).toEqual([0, 1, 2])
      expect(range(0)).toEqual([])
    })

    it('uses the step', () => {
      expect(range(0, 10, 3)).toEqual([0, 3, 6, 9])
      expect(range(1, 6, 2)).toEqual([1, 3, 5])
    })

    it('counts down with a negative step', () => {
      expect(range(5, 0, -1)).toEqual([5, 4, 3, 2, 1])
      expect(range(5, 0, -2)).toEqual([5, 3, 1])
      expect(range(0, -3, -1)).toEqual([0, -1, -2])
    })

    it('returns an empty array when the step walks away from the end', () => {
      expect(range(5, 0)).toEqual([])
      expect(range(0, 5, -1)).toEqual([])
      expect(range(3, 3)).toEqual([])
    })

    it('supports decimal steps', () => {
      expect(range(0, 1, 0.25)).toEqual([0, 0.25, 0.5, 0.75])
      expect(range(1, 3, 0.5)).toEqual([1, 1.5, 2, 2.5])
    })

    it('can make a long range', () => {
      const big = range(0, 100000)
      expect(big).toHaveLength(100000)
      expect(big[99999]).toBe(99999)
    })

    it('throws a RangeError for a step of 0, whatever start and end are', () => {
      expect(() => range(0, 5, 0)).toThrow(RangeError)
      expect(() => range(3, 3, 0)).toThrow(RangeError)
    })

    it.each([[NaN, 5], [0, Infinity], ['0', 5], [0, '5'], [undefined, undefined]])(
      'throws a TypeError for the arguments (%s, %s)',
      (start, end) => {
        expect(() => range(start, end)).toThrow(TypeError)
      },
    )

    it('throws a TypeError for a step that is not a finite number', () => {
      expect(() => range(0, 5, NaN)).toThrow(TypeError)
      expect(() => range(0, 5, '1')).toThrow(TypeError)
    })
  })

  describe('shuffle', () => {
    it('returns a new array with the same items', () => {
      const input = frozen([1, 2, 3, 4, 5, 6])
      const result = shuffle(input, seededRng(7))
      expect(result).not.toBe(input)
      expect(result).toHaveLength(6)
      expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6])
    })

    it('does not change the input', () => {
      const input = [1, 2, 3, 4, 5]
      shuffle(input, seededRng(3))
      expect(input).toEqual([1, 2, 3, 4, 5])
    })

    it('keeps duplicates', () => {
      const result = shuffle(['a', 'a', 'b', 'b', 'b'], seededRng(1))
      expect([...result].sort()).toEqual(['a', 'a', 'b', 'b', 'b'])
    })

    it('follows Fisher-Yates exactly: from the last index down, j = floor(rng() * (i + 1))', () => {
      // rng is always 0: every position swaps with index 0.
      expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1])
      // rng is just below 1: j equals i every time, so nothing moves.
      expect(shuffle([1, 2, 3, 4], () => 0.999999)).toEqual([1, 2, 3, 4])
      // A scripted sequence: i=3 uses 0.5 (j=2), i=2 uses 0.2 (j=0), i=1 uses 0.9 (j=1).
      const values = [0.5, 0.2, 0.9]
      let call = 0
      expect(shuffle([1, 2, 3, 4], () => values[call++])).toEqual([4, 2, 1, 3])
    })

    it('calls rng exactly length - 1 times', () => {
      const rng = vi.fn(() => 0.3)
      shuffle([1, 2, 3, 4, 5], rng)
      expect(rng).toHaveBeenCalledTimes(4)
    })

    it('handles empty and one-item arrays without calling rng', () => {
      const rng = vi.fn(() => 0.3)
      expect(shuffle([], rng)).toEqual([])
      const one = [42]
      const result = shuffle(one, rng)
      expect(result).toEqual([42])
      expect(result).not.toBe(one)
      expect(rng).not.toHaveBeenCalled()
    })

    it('uses Math.random when no rng is given', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0)
      expect(shuffle([1, 2, 3, 4])).toEqual([2, 3, 4, 1])
      expect(spy).toHaveBeenCalledTimes(3)
    })

    it('gives every ordering about the same chance (no bias)', () => {
      const rng = seededRng(12345)
      const counts = {}
      for (let run = 0; run < 6000; run++) {
        const key = shuffle([1, 2, 3], rng).join()
        counts[key] = (counts[key] || 0) + 1
      }
      // 3 items have 6 orderings, so each should show up about 1000 times.
      expect(Object.keys(counts)).toHaveLength(6)
      for (const count of Object.values(counts)) {
        expect(count).toBeGreaterThan(850)
        expect(count).toBeLessThan(1150)
      }
    })

    it('throws a TypeError when rng is not a function', () => {
      expect(() => shuffle([1, 2], 'random')).toThrow(TypeError)
      expect(() => shuffle([1, 2], null)).toThrow(TypeError)
    })
  })
})
