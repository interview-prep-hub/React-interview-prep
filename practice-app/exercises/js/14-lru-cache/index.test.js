import { LRUCache } from './index.js'

// Everything in this exercise is synchronous, so no timers are needed.

// Builds a cache and fills it in the given order: [[key, value], ...].
function fillCache(capacity, entries) {
  const cache = new LRUCache(capacity)
  for (const [key, value] of entries) {
    cache.put(key, value)
  }
  return cache
}

describe('14 LRUCache: creating a cache', () => {
  it('starts empty', () => {
    const cache = new LRUCache(3)

    expect(cache.size).toBe(0)
    expect(cache.keys()).toEqual([])
    expect(cache.get('a')).toBeUndefined()
    expect(cache.has('a')).toBe(false)
  })

  it.each([0, 1, 5, 1000])('accepts the capacity %s', (capacity) => {
    expect(() => new LRUCache(capacity)).not.toThrow()
    expect(new LRUCache(capacity).size).toBe(0)
  })

  it.each([-1, -0.5, 1.5, NaN, Infinity, -Infinity, '3', null, undefined, {}])(
    'throws a RangeError for the capacity %s',
    (capacity) => {
      expect(() => new LRUCache(capacity)).toThrow(RangeError)
    },
  )

  it('throws a RangeError when the capacity is missing', () => {
    expect(() => new LRUCache()).toThrow(RangeError)
  })
})

describe('14 LRUCache: get and put', () => {
  it('returns what was stored and counts the entries', () => {
    const cache = new LRUCache(3)
    cache.put('a', 1)
    cache.put('b', 2)

    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBe(2)
    expect(cache.size).toBe(2)
    expect(cache.has('a')).toBe(true)
  })

  it('returns undefined for a missing key and changes nothing', () => {
    const cache = fillCache(2, [
      ['a', 1],
      ['b', 2],
    ])

    expect(cache.get('missing')).toBeUndefined()
    expect(cache.size).toBe(2)
    expect(cache.keys()).toEqual(['a', 'b'])

    // 'a' is still the least recently used, so it is the one to go.
    cache.put('c', 3)
    expect(cache.keys()).toEqual(['b', 'c'])
  })

  it('updates the value of an existing key without growing', () => {
    const cache = fillCache(2, [
      ['a', 1],
      ['b', 2],
    ])

    cache.put('a', 100)

    expect(cache.get('a')).toBe(100)
    expect(cache.size).toBe(2)
    expect(cache.has('b')).toBe(true)
  })

  it('stores every kind of value, including falsy ones', () => {
    const cache = new LRUCache(10)
    const object = { id: 1 }
    cache.put('zero', 0)
    cache.put('empty', '')
    cache.put('no', false)
    cache.put('nothing', null)
    cache.put('object', object)

    expect(cache.get('zero')).toBe(0)
    expect(cache.get('empty')).toBe('')
    expect(cache.get('no')).toBe(false)
    expect(cache.get('nothing')).toBeNull()
    expect(cache.get('object')).toBe(object)
    expect(cache.size).toBe(5)
  })

  it('treats a stored undefined value as present, and a read still refreshes it', () => {
    const cache = new LRUCache(2)
    cache.put('a', undefined)
    cache.put('b', 2)

    expect(cache.has('a')).toBe(true)
    expect(cache.size).toBe(2)

    expect(cache.get('a')).toBeUndefined()
    cache.put('c', 3)

    // 'a' was read, so 'b' was the least recently used and was evicted.
    expect(cache.keys()).toEqual(['a', 'c'])
  })

  it('compares keys the way a Map does: objects by identity', () => {
    const first = { id: 1 }
    const lookalike = { id: 1 }
    const cache = new LRUCache(5)
    cache.put(first, 'first')
    cache.put(lookalike, 'lookalike')
    cache.put(1, 'number')
    cache.put('1', 'string')

    expect(cache.size).toBe(4)
    expect(cache.get(first)).toBe('first')
    expect(cache.get(lookalike)).toBe('lookalike')
    expect(cache.get(1)).toBe('number')
    expect(cache.get('1')).toBe('string')
    expect(cache.keys()[0]).toBe(first)
  })

  it('treats NaN as equal to NaN, like a Map does', () => {
    const cache = new LRUCache(2)
    cache.put(NaN, 'first')
    cache.put(NaN, 'second')

    expect(cache.size).toBe(1)
    expect(cache.has(NaN)).toBe(true)
    expect(cache.get(NaN)).toBe('second')
  })

  it('treats 0 and -0 as the same key, like a Map does', () => {
    const cache = new LRUCache(2)
    cache.put(0, 'zero')
    cache.put(-0, 'negative zero')

    expect(cache.size).toBe(1)
    expect(cache.has(-0)).toBe(true)
    expect(cache.get(0)).toBe('negative zero')
  })
})

describe('14 LRUCache: eviction', () => {
  it('evicts the least recently used entry when it grows over capacity', () => {
    const cache = new LRUCache(2)
    cache.put('a', 1)
    cache.put('b', 2)
    cache.put('c', 3)

    expect(cache.size).toBe(2)
    expect(cache.has('a')).toBe(false)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })

  it('get marks the entry as most recently used', () => {
    const cache = fillCache(2, [
      ['a', 1],
      ['b', 2],
    ])

    expect(cache.get('a')).toBe(1)
    cache.put('c', 3)

    // 'b' is now the least recently used.
    expect(cache.has('b')).toBe(false)
    expect(cache.keys()).toEqual(['a', 'c'])
  })

  it('updating a key with put marks it as most recently used', () => {
    const cache = fillCache(2, [
      ['a', 1],
      ['b', 2],
    ])

    cache.put('a', 10)
    expect(cache.keys()).toEqual(['b', 'a'])

    cache.put('c', 3)
    expect(cache.has('b')).toBe(false)
    expect(cache.get('a')).toBe(10)
  })

  it('has does NOT change the recency order', () => {
    const cache = fillCache(2, [
      ['a', 1],
      ['b', 2],
    ])

    expect(cache.has('a')).toBe(true)
    expect(cache.has('missing')).toBe(false)
    expect(cache.keys()).toEqual(['a', 'b'])

    cache.put('c', 3)

    // 'a' was only checked with has, so it is still the oldest and is evicted.
    expect(cache.has('a')).toBe(false)
    expect(cache.keys()).toEqual(['b', 'c'])
  })

  it('follows the classic sequence from the README', () => {
    const cache = new LRUCache(2)

    cache.put(1, 'one')
    cache.put(2, 'two')
    expect(cache.get(1)).toBe('one')

    cache.put(3, 'three') // evicts 2
    expect(cache.get(2)).toBeUndefined()

    cache.put(4, 'four') // evicts 1
    expect(cache.get(1)).toBeUndefined()
    expect(cache.get(3)).toBe('three')
    expect(cache.get(4)).toBe('four')
  })

  it('works with a capacity of 1', () => {
    const cache = new LRUCache(1)

    cache.put('a', 1)
    expect(cache.get('a')).toBe(1)

    cache.put('b', 2)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)

    cache.put('b', 3)
    expect(cache.get('b')).toBe(3)
    expect(cache.size).toBe(1)
  })

  it('stores nothing when the capacity is 0', () => {
    const cache = new LRUCache(0)

    cache.put('a', 1)
    cache.put('b', 2)

    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.has('a')).toBe(false)
    expect(cache.keys()).toEqual([])
  })

  it('lets an evicted key come back as the newest entry', () => {
    const cache = fillCache(2, [
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ])
    expect(cache.has('a')).toBe(false)

    cache.put('a', 'again')

    expect(cache.get('a')).toBe('again')
    expect(cache.keys()).toEqual(['c', 'a'])
  })
})

describe('14 LRUCache: keys and size', () => {
  it('lists keys from least to most recently used after a mix of operations', () => {
    const cache = fillCache(4, [
      ['a', 1],
      ['b', 2],
      ['c', 3],
      ['d', 4],
    ])
    expect(cache.keys()).toEqual(['a', 'b', 'c', 'd'])

    cache.get('b') // a c d b
    cache.put('a', 10) // c d b a
    cache.has('d') // no change
    cache.put('e', 5) // evicts c: d b a e

    expect(cache.keys()).toEqual(['d', 'b', 'a', 'e'])
    expect(cache.size).toBe(4)
  })

  it('returns a copy of the keys, so changing it does not change the cache', () => {
    const cache = fillCache(3, [
      ['a', 1],
      ['b', 2],
    ])

    const keys = cache.keys()
    expect(keys).toEqual(['a', 'b'])
    keys.push('hacked')
    keys.reverse()

    expect(cache.keys()).toEqual(['a', 'b'])
    expect(cache.size).toBe(2)
    expect(cache.has('hacked')).toBe(false)
  })

  it('size is a number property (a getter), not a method', () => {
    const cache = new LRUCache(3)
    cache.put('a', 1)

    expect(typeof cache.size).toBe('number')
    expect(cache.size).toBe(1)
  })
})

describe('14 LRUCache: many operations', () => {
  it('never holds more than its capacity and keeps the newest entries', () => {
    const capacity = 100
    const cache = new LRUCache(capacity)
    let largestSize = 0

    for (let i = 0; i < 100000; i++) {
      cache.put(i % 250, i)
      if (cache.size > largestSize) largestSize = cache.size
    }

    expect(largestSize).toBe(capacity)
    expect(cache.size).toBe(capacity)
    // The last 100 puts were for the keys (99900 % 250) up to (99999 % 250).
    const expectedKeys = Array.from({ length: capacity }, (_, j) => (99900 + j) % 250)
    expect(cache.keys()).toEqual(expectedKeys)
    expect(cache.get(expectedKeys[0])).toBe(99900)
  })

  it('behaves like a simple reference implementation on 3000 pseudo-random operations', () => {
    // A very simple (slow) LRU: an array of [key, value], oldest first.
    function createModel(capacity) {
      const entries = []
      const indexOf = (key) => entries.findIndex(([k]) => k === key)
      return {
        get(key) {
          const i = indexOf(key)
          if (i === -1) return undefined
          const [entry] = entries.splice(i, 1)
          entries.push(entry)
          return entry[1]
        },
        put(key, value) {
          if (capacity === 0) return
          const i = indexOf(key)
          if (i !== -1) entries.splice(i, 1)
          entries.push([key, value])
          if (entries.length > capacity) entries.shift()
        },
        has: (key) => indexOf(key) !== -1,
        keys: () => entries.map(([k]) => k),
        size: () => entries.length,
      }
    }

    // A tiny seeded random generator, so the test is the same on every run.
    let seed = 12345
    const random = (limit) => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return Math.floor((seed / 4294967296) * limit)
    }

    let firstMismatch = null
    const check = (label, actual, expected) => {
      if (firstMismatch === null && JSON.stringify(actual) !== JSON.stringify(expected)) {
        firstMismatch = `${label}: expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`
      }
    }

    for (const capacity of [0, 1, 2, 3, 5]) {
      const cache = new LRUCache(capacity)
      const model = createModel(capacity)

      for (let step = 0; step < 3000; step++) {
        const key = random(8)
        const operation = random(3)
        const label = `capacity ${capacity}, step ${step}`

        if (operation === 0) {
          cache.put(key, step)
          model.put(key, step)
        } else if (operation === 1) {
          check(`${label}, get(${key})`, cache.get(key), model.get(key))
        } else {
          check(`${label}, has(${key})`, cache.has(key), model.has(key))
        }

        check(`${label}, keys()`, cache.keys(), model.keys())
        check(`${label}, size`, cache.size, model.size())
      }
    }

    expect(firstMismatch).toBeNull()
  })
})
