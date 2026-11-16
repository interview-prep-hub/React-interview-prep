import {
  myMap,
  myFilter,
  myReduce,
  myForEach,
  myFind,
  myFindLast,
  myEvery,
  mySome,
  myFlat,
  installPolyfills,
} from './index.js'

const PROTOTYPE_NAMES = [
  'myMap',
  'myFilter',
  'myReduce',
  'myForEach',
  'myFind',
  'myFindLast',
  'myEvery',
  'mySome',
  'myFlat',
]

// Taken right after the module was imported, before any test runs.
const presentAtImport = PROTOTYPE_NAMES.filter((name) => name in Array.prototype)

// Sparse arrays (arrays with holes) are built with `new Array` plus an
// assignment, so the intent is obvious: index 1 does not exist.
function sparse() {
  const arr = [1, 2, 3]
  delete arr[1]
  return arr
}

describe('17 Array polyfills', () => {
  describe('all callback methods', () => {
    const withCallback = [
      ['myMap', myMap],
      ['myFilter', myFilter],
      ['myReduce', myReduce],
      ['myForEach', myForEach],
      ['myFind', myFind],
      ['myFindLast', myFindLast],
      ['myEvery', myEvery],
      ['mySome', mySome],
    ]

    it.each(withCallback)('%s throws a TypeError when the callback is not a function', (_name, fn) => {
      expect(() => fn([1, 2, 3], undefined)).toThrow(TypeError)
      expect(() => fn([1, 2, 3], 'not a function')).toThrow(TypeError)
      expect(() => fn([1, 2, 3], {})).toThrow(TypeError)
    })

    it.each(withCallback)('%s checks the callback even when the array is empty', (_name, fn) => {
      expect(() => fn([], null)).toThrow(TypeError)
      expect(() => fn([], 'not a function')).toThrow(TypeError)
      expect(() => fn([], {})).toThrow(TypeError)
      expect(() => fn([], 42)).toThrow(TypeError)
    })

    // The callbacks of these methods all get (value, index, array) with the
    // array as the LAST argument. The last column is an answer that keeps every
    // loop going until the end.
    const visitEverything = [
      ['myMap', myMap, 0],
      ['myFilter', myFilter, 0],
      ['myForEach', myForEach, 0],
      ['myFind', myFind, false],
      ['myFindLast', myFindLast, false],
      ['myEvery', myEvery, true],
      ['mySome', mySome, false],
    ]

    it.each(visitEverything)('%s gives the callback the very same array object, not a copy', (_name, fn, answer) => {
      const input = [10, 20, 30]
      const seen = []
      fn(input, (value, index, array) => {
        seen.push(array)
        return answer
      })
      expect(seen).toHaveLength(3)
      for (const array of seen) expect(array).toBe(input)
    })

    // Methods that skip holes: a deleted item is not visited, a changed item is
    // seen with its new value.
    const skipHoles = visitEverything.filter(([name]) => !name.startsWith('myFind'))

    it.each(skipHoles)('%s skips an item deleted by the callback and sees a changed item', (_name, fn, answer) => {
      const input = ['a', 'b', 'c', 'd']
      const seen = []
      fn(input, (value, index, array) => {
        seen.push(value)
        if (index === 0) {
          delete array[1]
          array[2] = 'C'
        }
        return answer
      })
      expect(seen).toEqual(['a', 'C', 'd'])
    })

    it('myReduce skips an item deleted by the callback and sees a changed item', () => {
      const input = ['a', 'b', 'c', 'd']
      const seen = []
      myReduce(
        input,
        (acc, value, index, array) => {
          seen.push(value)
          if (index === 0) {
            delete array[1]
            array[2] = 'C'
          }
          return acc
        },
        '',
      )
      expect(seen).toEqual(['a', 'C', 'd'])
    })

    it('myFind sees a deleted item as undefined and a changed item with its new value', () => {
      const input = ['a', 'b', 'c', 'd']
      const seen = []
      myFind(input, (value, index, array) => {
        seen.push(value)
        if (index === 0) {
          delete array[1]
          array[2] = 'C'
        }
        return false
      })
      expect(seen).toEqual(['a', undefined, 'C', 'd'])
    })

    it('myFindLast sees a deleted item as undefined and a changed item with its new value', () => {
      const input = ['a', 'b', 'c', 'd']
      const seen = []
      myFindLast(input, (value, index, array) => {
        seen.push(value)
        if (index === 3) {
          delete array[1]
          array[0] = 'A'
        }
        return false
      })
      expect(seen).toEqual(['d', 'c', undefined, 'A'])
    })
  })

  describe('no built-in array methods', () => {
    const BUILT_INS = ['map', 'filter', 'reduce', 'forEach', 'find', 'findLast', 'every', 'some', 'flat']

    // Runs `run` while the built-in methods are wrapped, and returns the names
    // of the ones that were called. The wrappers are always put back.
    function builtInsUsedBy(run) {
      const used = []
      const originals = {}
      for (const name of BUILT_INS) {
        originals[name] = Array.prototype[name]
        Object.defineProperty(Array.prototype, name, {
          value: function (...args) {
            used.push(name)
            return originals[name].apply(this, args)
          },
          writable: true,
          configurable: true,
          enumerable: false,
        })
      }
      try {
        run()
      } finally {
        for (const name of BUILT_INS) {
          Object.defineProperty(Array.prototype, name, {
            value: originals[name],
            writable: true,
            configurable: true,
            enumerable: false,
          })
        }
      }
      return used
    }

    it.each([
      ['myMap', () => myMap([1, 2], (n) => n)],
      ['myFilter', () => myFilter([1, 2], () => true)],
      ['myForEach', () => myForEach([1, 2], () => {})],
      ['myReduce with an initial value', () => myReduce([1, 2], (a, b) => a + b, 0)],
      ['myReduce without an initial value', () => myReduce([1, 2], (a, b) => a + b)],
      ['myFind', () => myFind([1, 2], () => false)],
      ['myFindLast', () => myFindLast([1, 2], () => false)],
      ['myEvery', () => myEvery([1, 2], () => true)],
      ['mySome', () => mySome([1, 2], () => false)],
      ['myFlat', () => myFlat([1, [2, [3]]], Infinity)],
    ])('%s does not call a built-in version of the methods it rebuilds', (_name, run) => {
      expect(builtInsUsedBy(run)).toEqual([])
    })
  })

  describe('myMap', () => {
    it('returns a new array of the callback results', () => {
      const input = [1, 2, 3]
      const result = myMap(input, (n) => n * 2)
      expect(result).toEqual([2, 4, 6])
      expect(result).not.toBe(input)
      expect(input).toEqual([1, 2, 3])
    })

    it('returns an empty array for an empty array', () => {
      expect(myMap([], (n) => n)).toEqual([])
    })

    it('calls the callback with (value, index, array)', () => {
      const input = ['a', 'b']
      const callback = vi.fn((value) => value)
      myMap(input, callback)
      expect(callback).toHaveBeenCalledTimes(2)
      expect(callback).toHaveBeenNthCalledWith(1, 'a', 0, input)
      expect(callback).toHaveBeenNthCalledWith(2, 'b', 1, input)
      expect(callback.mock.calls[0][2]).toBe(input)
    })

    it('uses thisArg as this inside the callback', () => {
      const context = { factor: 10 }
      const result = myMap(
        [1, 2],
        function (n) {
          return n * this.factor
        },
        context,
      )
      expect(result).toEqual([10, 20])
    })

    it('passes the index along (the parseInt surprise)', () => {
      // parseInt(value, index) reads the index as the radix.
      expect(myMap(['1', '2', '3'], parseInt)).toEqual([1, NaN, NaN])
    })

    it('keeps holes in the result and does not call the callback for them', () => {
      const callback = vi.fn((n) => n * 2)
      const result = myMap(sparse(), callback)
      expect(callback).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(3)
      expect(1 in result).toBe(false)
      expect(result).toStrictEqual([2, , 6])
    })

    it('does not call the callback for items appended during the loop', () => {
      const input = [1, 2, 3]
      const callback = vi.fn((value, index, array) => {
        if (index === 0) array.push(99)
        return value
      })
      const result = myMap(input, callback)
      expect(callback).toHaveBeenCalledTimes(3)
      expect(result).toEqual([1, 2, 3])
      expect(input).toEqual([1, 2, 3, 99])
    })
  })

  describe('myFilter', () => {
    it('keeps the items for which the callback returns a truthy value', () => {
      const input = [1, 2, 3, 4, 5]
      const result = myFilter(input, (n) => n % 2 === 1)
      expect(result).toEqual([1, 3, 5])
      expect(result).not.toBe(input)
      expect(input).toEqual([1, 2, 3, 4, 5])
    })

    it('accepts truthy and falsy values, not only booleans', () => {
      const result = myFilter(['a', '', 'b', 0, null], (value) => value)
      expect(result).toEqual(['a', 'b'])
    })

    it('returns a new array even when every item passes', () => {
      const input = [1, 2]
      const result = myFilter(input, () => true)
      expect(result).toEqual([1, 2])
      expect(result).not.toBe(input)
    })

    it('keeps the same object references (no copies)', () => {
      const a = { id: 1 }
      const b = { id: 2 }
      const result = myFilter([a, b], (item) => item.id === 2)
      expect(result[0]).toBe(b)
    })

    it('calls the callback with (value, index, array) and thisArg', () => {
      const input = ['x', 'y']
      const callback = vi.fn(function () {
        return this.keep
      })
      const context = { keep: true }
      myFilter(input, callback, context)
      expect(callback).toHaveBeenNthCalledWith(2, 'y', 1, input)
      expect(callback.mock.contexts[0]).toBe(context)
    })

    it('skips holes and returns a dense array', () => {
      const callback = vi.fn(() => true)
      const result = myFilter(sparse(), callback)
      expect(callback).toHaveBeenCalledTimes(2)
      expect(result).toStrictEqual([1, 3])
    })

    it('ignores items appended during the loop', () => {
      const callback = vi.fn((value, index, array) => {
        if (index === 0) array.push(99)
        return true
      })
      expect(myFilter([1, 2], callback)).toEqual([1, 2])
      expect(callback).toHaveBeenCalledTimes(2)
    })
  })

  describe('myForEach', () => {
    it('visits every item in order and returns undefined', () => {
      const seen = []
      const result = myForEach(['a', 'b', 'c'], (value, index) => {
        seen.push([value, index])
      })
      expect(result).toBeUndefined()
      expect(seen).toEqual([
        ['a', 0],
        ['b', 1],
        ['c', 2],
      ])
    })

    it('passes the array as the third argument and honours thisArg', () => {
      const input = [5]
      const collected = []
      myForEach(
        input,
        function (value, index, array) {
          collected.push(this.tag, value, index, array)
        },
        { tag: 'ctx' },
      )
      expect(collected[0]).toBe('ctx')
      expect(collected.slice(1, 3)).toEqual([5, 0])
      expect(collected[3]).toBe(input)
    })

    it('skips holes', () => {
      const seen = []
      myForEach(sparse(), (value, index) => seen.push(index))
      expect(seen).toEqual([0, 2])
    })

    it('ignores items appended during the loop', () => {
      const seen = []
      myForEach([1, 2], (value, index, array) => {
        seen.push(value)
        if (index === 0) array.push(3)
      })
      expect(seen).toEqual([1, 2])
    })
  })

  describe('myReduce', () => {
    it('folds the array into one value using the initial value', () => {
      expect(myReduce([1, 2, 3, 4], (sum, n) => sum + n, 0)).toBe(10)
      expect(myReduce([1, 2, 3], (text, n) => text + n, 'x')).toBe('x123')
    })

    it('calls the callback with (accumulator, value, index, array)', () => {
      const input = ['a', 'b']
      const callback = vi.fn((acc, value) => acc + value)
      myReduce(input, callback, '>')
      expect(callback).toHaveBeenNthCalledWith(1, '>', 'a', 0, input)
      expect(callback).toHaveBeenNthCalledWith(2, '>a', 'b', 1, input)
    })

    it('uses the first item as the start when there is no initial value', () => {
      const input = [1, 2, 3, 4]
      const callback = vi.fn((sum, n) => sum + n)
      expect(myReduce(input, callback)).toBe(10)
      expect(callback).toHaveBeenCalledTimes(3)
      expect(callback).toHaveBeenNthCalledWith(1, 1, 2, 1, input)
    })

    it('returns the only item without calling the callback', () => {
      const callback = vi.fn()
      expect(myReduce([42], callback)).toBe(42)
      expect(callback).not.toHaveBeenCalled()
    })

    it('returns the initial value for an empty array', () => {
      const callback = vi.fn()
      expect(myReduce([], callback, 'start')).toBe('start')
      expect(callback).not.toHaveBeenCalled()
    })

    it('throws a TypeError for an empty array without an initial value', () => {
      expect(() => myReduce([], (a, b) => a + b)).toThrow(TypeError)
    })

    it('throws a TypeError for an array of only holes without an initial value', () => {
      expect(() => myReduce(new Array(3), (a, b) => a + b)).toThrow(TypeError)
    })

    it.each([[0], [''], [null], [false], [NaN]])('treats the falsy initial value %p as given', (initial) => {
      const input = [1, 2, 3]
      const callback = vi.fn((acc) => acc)
      expect(myReduce(input, callback, initial)).toBe(initial)
      expect(callback).toHaveBeenCalledTimes(3)
      expect(callback).toHaveBeenNthCalledWith(1, initial, 1, 0, input)
    })

    it('treats an explicit undefined initial value as a real initial value', () => {
      const callback = vi.fn((acc, value) => value)
      expect(myReduce([5], callback, undefined)).toBe(5)
      expect(callback).toHaveBeenCalledWith(undefined, 5, 0, [5])
      expect(myReduce([], callback, undefined)).toBeUndefined()
    })

    it('skips holes', () => {
      const indexes = []
      const total = myReduce(
        sparse(),
        (sum, n, index) => {
          indexes.push(index)
          return sum + n
        },
        0,
      )
      expect(total).toBe(4)
      expect(indexes).toEqual([0, 2])
    })

    it('starts at the first existing item when the array begins with a hole', () => {
      const input = [undefined, 2, 3]
      delete input[0]
      const indexes = []
      const total = myReduce(input, (sum, n, index) => {
        indexes.push(index)
        return sum + n
      })
      expect(total).toBe(5)
      expect(indexes).toEqual([2])
    })

    it('ignores items appended during the loop', () => {
      const total = myReduce(
        [1, 2],
        (sum, n, index, array) => {
          if (index === 0) array.push(100)
          return sum + n
        },
        0,
      )
      expect(total).toBe(3)
    })

    it('can build an object (word counts)', () => {
      const words = ['a', 'b', 'a', 'c', 'a', 'b']
      const counts = myReduce(
        words,
        (acc, word) => {
          acc[word] = (acc[word] || 0) + 1
          return acc
        },
        {},
      )
      expect(counts).toEqual({ a: 3, b: 2, c: 1 })
    })
  })

  describe('myFind', () => {
    it('returns the first matching item, not its index', () => {
      const users = [{ id: 1 }, { id: 2 }, { id: 3 }]
      expect(myFind(users, (user) => user.id > 1)).toBe(users[1])
    })

    it('returns undefined when nothing matches', () => {
      expect(myFind([1, 2, 3], (n) => n > 5)).toBeUndefined()
      expect(myFind([], () => true)).toBeUndefined()
    })

    it('stops at the first match', () => {
      const callback = vi.fn((n) => n === 2)
      myFind([1, 2, 3, 4], callback)
      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('calls the callback with (value, index, array) and thisArg', () => {
      const input = ['p', 'q']
      const callback = vi.fn(function () {
        return false
      })
      const context = { name: 'ctx' }
      myFind(input, callback, context)
      expect(callback).toHaveBeenNthCalledWith(2, 'q', 1, input)
      expect(callback.mock.contexts[1]).toBe(context)
    })

    it('does NOT skip holes: it visits them as undefined', () => {
      const seen = []
      myFind(sparse(), (value) => {
        seen.push(value)
        return false
      })
      expect(seen).toEqual([1, undefined, 3])
    })

    it('ignores items appended during the loop', () => {
      const callback = vi.fn((value, index, array) => {
        if (index === 0) array.push(99)
        return false
      })
      myFind([1, 2], callback)
      expect(callback).toHaveBeenCalledTimes(2)
    })
  })

  describe('myFindLast', () => {
    it('returns the last matching item', () => {
      expect(myFindLast([1, 2, 3, 4, 5], (n) => n % 2 === 0)).toBe(4)
    })

    it('returns undefined when nothing matches', () => {
      expect(myFindLast([1, 2, 3], (n) => n > 5)).toBeUndefined()
      expect(myFindLast([], () => true)).toBeUndefined()
    })

    it('walks from the end, passes the original index and stops at the first match', () => {
      const input = ['a', 'b', 'c', 'd']
      const callback = vi.fn((value) => value === 'c')
      expect(myFindLast(input, callback)).toBe('c')
      expect(callback).toHaveBeenCalledTimes(2)
      expect(callback).toHaveBeenNthCalledWith(1, 'd', 3, input)
      expect(callback).toHaveBeenNthCalledWith(2, 'c', 2, input)
    })

    it('honours thisArg', () => {
      const result = myFindLast(
        [1, 2, 3],
        function (n) {
          return n < this.limit
        },
        { limit: 3 },
      )
      expect(result).toBe(2)
    })

    it('does NOT skip holes: it visits them as undefined', () => {
      const seen = []
      myFindLast(sparse(), (value) => {
        seen.push(value)
        return false
      })
      expect(seen).toEqual([3, undefined, 1])
    })

    it('ignores items appended during the loop', () => {
      const input = [1, 2, 3]
      const seen = []
      myFindLast(input, (value) => {
        seen.push(value)
        input.push(99)
        return false
      })
      expect(seen).toEqual([3, 2, 1])
    })
  })

  describe('myEvery', () => {
    it('is true when every item passes and false when one fails', () => {
      expect(myEvery([2, 4, 6], (n) => n % 2 === 0)).toBe(true)
      expect(myEvery([2, 3, 6], (n) => n % 2 === 0)).toBe(false)
    })

    it('is true for an empty array and does not call the callback', () => {
      const callback = vi.fn()
      expect(myEvery([], callback)).toBe(true)
      expect(callback).not.toHaveBeenCalled()
    })

    it('stops at the first failure', () => {
      const callback = vi.fn((n) => n < 3)
      expect(myEvery([1, 2, 3, 4, 5], callback)).toBe(false)
      expect(callback).toHaveBeenCalledTimes(3)
    })

    it('returns a real boolean, not the callback result', () => {
      expect(myEvery([1, 2], () => 'yes')).toBe(true)
      expect(myEvery([1, 2], () => 0)).toBe(false)
    })

    it('calls the callback with (value, index, array) and thisArg', () => {
      const input = [7, 8]
      const callback = vi.fn(function () {
        return true
      })
      const context = {}
      myEvery(input, callback, context)
      expect(callback).toHaveBeenNthCalledWith(2, 8, 1, input)
      expect(callback.mock.contexts[0]).toBe(context)
    })

    it('skips holes', () => {
      const callback = vi.fn((value) => value !== undefined)
      expect(myEvery(sparse(), callback)).toBe(true)
      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('ignores items appended during the loop', () => {
      const callback = vi.fn((value, index, array) => {
        if (index === 0) array.push(-1)
        return value > 0
      })
      expect(myEvery([1, 2], callback)).toBe(true)
      expect(callback).toHaveBeenCalledTimes(2)
    })
  })

  describe('mySome', () => {
    it('is true when at least one item passes and false when none does', () => {
      expect(mySome([1, 3, 4], (n) => n % 2 === 0)).toBe(true)
      expect(mySome([1, 3, 5], (n) => n % 2 === 0)).toBe(false)
    })

    it('is false for an empty array and does not call the callback', () => {
      const callback = vi.fn()
      expect(mySome([], callback)).toBe(false)
      expect(callback).not.toHaveBeenCalled()
    })

    it('stops at the first success', () => {
      const callback = vi.fn((n) => n === 2)
      expect(mySome([1, 2, 3, 4], callback)).toBe(true)
      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('returns a real boolean, not the callback result', () => {
      expect(mySome([1], () => 'yes')).toBe(true)
      expect(mySome([1], () => '')).toBe(false)
    })

    it('calls the callback with (value, index, array) and thisArg', () => {
      const input = [7, 8]
      const callback = vi.fn(function () {
        return false
      })
      const context = {}
      mySome(input, callback, context)
      expect(callback).toHaveBeenNthCalledWith(2, 8, 1, input)
      expect(callback.mock.contexts[1]).toBe(context)
    })

    it('skips holes', () => {
      const callback = vi.fn((value) => value === undefined)
      expect(mySome(sparse(), callback)).toBe(false)
      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('ignores items appended during the loop', () => {
      const callback = vi.fn((value, index, array) => {
        if (index === 0) array.push(100)
        return value > 50
      })
      expect(mySome([1, 2], callback)).toBe(false)
      expect(callback).toHaveBeenCalledTimes(2)
    })
  })

  describe('myFlat', () => {
    it('flattens one level by default', () => {
      expect(myFlat([1, [2, [3, [4]]]])).toEqual([1, 2, [3, [4]]])
    })

    it('flattens as many levels as the depth says', () => {
      const input = [1, [2, [3, [4]]]]
      expect(myFlat(input, 2)).toEqual([1, 2, 3, [4]])
      expect(myFlat(input, 3)).toEqual([1, 2, 3, 4])
    })

    it('flattens everything for Infinity', () => {
      expect(myFlat([1, [2, [3, [4, [5, [6]]]]]], Infinity)).toEqual([1, 2, 3, 4, 5, 6])
    })

    it('returns a shallow copy for depth 0 or a negative depth', () => {
      const input = [1, [2]]
      const zero = myFlat(input, 0)
      expect(zero).toEqual([1, [2]])
      expect(zero).not.toBe(input)
      expect(zero[1]).toBe(input[1])
      expect(myFlat(input, -3)).toEqual([1, [2]])
    })

    it('does not change the input or its nested arrays', () => {
      const inner = [2, [3]]
      const input = [1, inner]
      myFlat(input, Infinity)
      expect(input).toEqual([1, [2, [3]]])
      expect(input[1]).toBe(inner)
      expect(inner).toEqual([2, [3]])
    })

    it('drops holes at every level', () => {
      const inner = [2, 'gone', 4]
      delete inner[1]
      const input = [1, 'gone', [], inner]
      delete input[1]
      expect(myFlat(input)).toStrictEqual([1, 2, 4])
    })

    it('only flattens real arrays, not strings, objects, array-likes or other iterables', () => {
      const object = { a: [1] }
      const set = new Set([1, 2])
      const arrayLike = { length: 2, 0: 'x', 1: 'y' }
      const typed = new Uint8Array([1, 2])
      const result = myFlat(['ab', object, set, ['cd'], arrayLike, typed], Infinity)
      expect(result).toHaveLength(6)
      expect(result[0]).toBe('ab')
      expect(result[1]).toBe(object)
      expect(result[2]).toBe(set)
      expect(result[3]).toBe('cd')
      expect(result[4]).toBe(arrayLike)
      expect(result[5]).toBe(typed)
    })

    it('removes empty arrays when they get flattened', () => {
      expect(myFlat([1, [], [[]]], Infinity)).toEqual([1])
      expect(myFlat([1, [], [[]]])).toEqual([1, []])
    })

    it('keeps falsy items such as 0, null and undefined', () => {
      expect(myFlat([0, [null, undefined, '', false]])).toStrictEqual([0, null, undefined, '', false])
    })

    it('returns an empty array for an empty array', () => {
      expect(myFlat([])).toEqual([])
    })
  })

  describe('same results as the built-in methods', () => {
    const samples = [[], [1], [3, 1, 2], [0, '', null, 'x', 7], [1, 2, 3, 4, 5, 6, 7, 8]]
    const isOdd = (n) => Boolean(n) && n % 2 === 1

    // Each row is [sample], so the whole sample array arrives as one argument.
    it.each(samples.map((sample) => [sample]))('agrees on %j', (sample) => {
      const arr = [...sample]
      expect(myMap(arr, (v, i) => [v, i])).toEqual(arr.map((v, i) => [v, i]))
      expect(myFilter(arr, isOdd)).toEqual(arr.filter(isOdd))
      expect(myFind(arr, isOdd)).toEqual(arr.find(isOdd))
      expect(myFindLast(arr, isOdd)).toEqual(arr.findLast(isOdd))
      expect(myEvery(arr, isOdd)).toBe(arr.every(isOdd))
      expect(mySome(arr, isOdd)).toBe(arr.some(isOdd))
      expect(myReduce(arr, (a, v) => `${a}|${v}`, '')).toBe(arr.reduce((a, v) => `${a}|${v}`, ''))
    })
  })

  describe('installPolyfills', () => {
    const remove = () => {
      for (const name of PROTOTYPE_NAMES) delete Array.prototype[name]
    }

    beforeEach(remove)
    afterEach(remove)

    it('adds the nine methods to Array.prototype and returns their names', () => {
      // Importing the module must not have installed anything by itself.
      expect(presentAtImport).toEqual([])
      PROTOTYPE_NAMES.forEach((name) => expect(name in Array.prototype).toBe(false))
      const installed = installPolyfills()
      expect([...installed].sort()).toEqual([...PROTOTYPE_NAMES].sort())
      PROTOTYPE_NAMES.forEach((name) => expect(typeof Array.prototype[name]).toBe('function'))
    })

    it('installs methods that use the array they are called on', () => {
      installPolyfills()
      expect([1, 2, 3].myMap((n) => n * 2)).toEqual([2, 4, 6])
      expect([1, 2, 3, 4].myFilter((n) => n > 2)).toEqual([3, 4])
      expect([1, 2, 3].myReduce((a, b) => a + b, 10)).toBe(16)
      expect([1, 2, 3].myReduce((a, b) => a + b)).toBe(6)
      expect([1, 2, 3].myFind((n) => n > 1)).toBe(2)
      expect([1, 2, 3].myFindLast((n) => n < 3)).toBe(2)
      expect([1, 2, 3].myEvery((n) => n > 0)).toBe(true)
      expect([1, 2, 3].mySome((n) => n > 2)).toBe(true)
      expect([1, [2, [3]]].myFlat()).toEqual([1, 2, [3]])
      expect([1, [2, [3]]].myFlat(Infinity)).toEqual([1, 2, 3])
    })

    it('forwards thisArg and the extra callback arguments', () => {
      installPolyfills()
      const seen = []
      const result = [10, 20].myMap(
        function (value, index, array) {
          seen.push([value, index, array.length])
          return this.offset + value
        },
        { offset: 1 },
      )
      expect(result).toEqual([11, 21])
      expect(seen).toEqual([
        [10, 0, 2],
        [20, 1, 2],
      ])
      const visited = []
      ;[5, 6].myForEach((value) => visited.push(value))
      expect(visited).toEqual([5, 6])
    })

    it.each(['myMap', 'myFilter', 'myForEach', 'myFind', 'myFindLast', 'myEvery', 'mySome'])(
      '%s forwards thisArg to the callback',
      (name) => {
        installPolyfills()
        const context = { tag: 'ctx' }
        let seenThis
        ;[1, 2][name](function () {
          seenThis = this
        }, context)
        expect(seenThis).toBe(context)
      },
    )

    it('keeps "no initial value" and "initial value undefined" apart in myReduce', () => {
      installPolyfills()
      expect(() => [].myReduce((a, b) => a + b)).toThrow(TypeError)
      expect([].myReduce((a) => a, undefined)).toBeUndefined()
    })

    it('does not overwrite a method that already exists', () => {
      const existing = function existing() {
        return 'mine'
      }
      Array.prototype.myMap = existing
      const installed = installPolyfills()
      expect(installed).not.toContain('myMap')
      expect(installed).toHaveLength(PROTOTYPE_NAMES.length - 1)
      expect(Array.prototype.myMap).toBe(existing)
      expect([1].myMap()).toBe('mine')
    })

    it('can be called twice: the second call installs nothing and changes nothing', () => {
      installPolyfills()
      const before = PROTOTYPE_NAMES.map((name) => Array.prototype[name])
      expect(installPolyfills()).toEqual([])
      const after = PROTOTYPE_NAMES.map((name) => Array.prototype[name])
      expect(after).toEqual(before)
    })

    it('adds non-enumerable methods, so for...in over an array only sees indexes', () => {
      installPolyfills()
      const keys = []
      for (const key in [10, 20]) keys.push(key)
      expect(keys).toEqual(['0', '1'])
    })
  })
})
