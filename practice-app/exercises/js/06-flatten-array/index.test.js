import { flatten, flattenDeep, flattenObject, unflattenObject } from './index.js'

// Runs `fn` while Array.prototype.flat and flatMap are spied on, restores
// them, and returns how many times each was called. (Restoring BEFORE any
// expect() keeps the test runner's own code away from the spies.)
function countNativeFlatCalls(fn) {
  const flatSpy = vi.spyOn(Array.prototype, 'flat')
  const flatMapSpy = vi.spyOn(Array.prototype, 'flatMap')
  try {
    fn()
    return { flat: flatSpy.mock.calls.length, flatMap: flatMapSpy.mock.calls.length }
  } finally {
    flatSpy.mockRestore()
    flatMapSpy.mockRestore()
  }
}

// Things that are NOT arrays and must be rejected with a TypeError.
const notArrays = [
  ['null', null],
  ['undefined', undefined],
  ['a string', 'abc'],
  ['a number', 42],
  ['a plain object', { 0: 'a', length: 1 }],
  ['a Set', new Set([1, 2])],
]

// Things that are NOT plain objects and must be rejected with a TypeError.
const notPlainObjects = [
  ['null', null],
  ['undefined', undefined],
  ['a number', 42],
  ['a string', 'a.b'],
  ['an array', [1, 2]],
]

// ---------------------------------------------------------------------------
// flatten
// ---------------------------------------------------------------------------

describe('06 flatten: depth', () => {
  it('flattens one level by default', () => {
    expect(flatten([1, [2, [3, [4]]]])).toEqual([1, 2, [3, [4]]])
  })

  it('treats an undefined depth like the default of 1', () => {
    expect(flatten([1, [2, [3]]], undefined)).toEqual([1, 2, [3]])
  })

  it('flattens exactly `depth` levels', () => {
    const input = [1, [2, [3, [4, [5]]]]]

    expect(flatten(input, 1)).toEqual([1, 2, [3, [4, [5]]]])
    expect(flatten(input, 2)).toEqual([1, 2, 3, [4, [5]]])
    expect(flatten(input, 3)).toEqual([1, 2, 3, 4, [5]])
    expect(flatten(input, 4)).toEqual([1, 2, 3, 4, 5])
  })

  it('flattens everything when depth is Infinity', () => {
    expect(flatten([1, [2, [3, [4, [5, [6]]]]]], Infinity)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('is fine with a depth larger than the real nesting', () => {
    expect(flatten([1, [2, 3]], 100)).toEqual([1, 2, 3])
  })

  it.each([
    ['0', 0],
    ['-1', -1],
    ['-Infinity', -Infinity],
    ['NaN', NaN],
  ])('flattens nothing when depth is %s', (_label, depth) => {
    expect(flatten([1, [2, [3]]], depth)).toEqual([1, [2, [3]]])
  })

  it('does not clone the nested arrays it leaves alone', () => {
    const inner = [2]
    const result = flatten([1, inner], 0)

    expect(result[1]).toBe(inner)
  })
})

describe('06 flatten: what is flattened and what is not', () => {
  it('keeps the order of the items', () => {
    expect(flatten([[1, 2], 3, [4, [5]], 6], Infinity)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('removes empty arrays', () => {
    expect(flatten([1, [], 2, [[]], 3], Infinity)).toEqual([1, 2, 3])
    expect(flatten([[], [[]]], Infinity)).toEqual([])
    expect(flatten([])).toEqual([])
  })

  it('keeps undefined, null and other falsy values', () => {
    const result = flatten([[undefined, null], 0, [false, '', NaN]])

    expect(result).toHaveLength(6)
    expect(result[0]).toBeUndefined()
    expect(0 in result).toBe(true) // a real undefined, not a hole
    expect(result[1]).toBeNull()
    expect(result.slice(2)).toEqual([0, false, '', NaN])
  })

  it('skips holes (empty slots), like Array.prototype.flat does', () => {
    const sparse = [1, , 3, [4, , 5], , [, 6]]

    expect(flatten(sparse, Infinity)).toEqual([1, 3, 4, 5, 6])
    expect(flatten(sparse, 0)).toHaveLength(4) // 1, 3, [4, , 5] and [, 6]: the holes are dropped
  })

  it('never returns holes', () => {
    const result = flatten([1, , 3], 0)

    expect(result).toHaveLength(2)
    expect(0 in result && 1 in result).toBe(true)
    expect(result).toEqual([1, 3])
  })

  it('does not flatten strings, objects, Sets or typed arrays', () => {
    const object = { list: [1, 2] }
    const set = new Set([1, 2])
    const typed = new Uint8Array([1, 2])
    const result = flatten([['ab'], [object], [set], [typed]], Infinity)

    expect(result).toHaveLength(4)
    expect(result[0]).toBe('ab')
    expect(result[1]).toBe(object)
    expect(result[2]).toBe(set)
    expect(result[3]).toBe(typed)
  })

  it('keeps object items by reference', () => {
    const user = { id: 1 }
    const result = flatten([[user], [[user]]], Infinity)

    expect(result[0]).toBe(user)
    expect(result[1]).toBe(user)
  })

  it('matches Array.prototype.flat for many inputs and depths', () => {
    const inputs = [
      [],
      [1, 2, 3],
      [[1], [2], [3]],
      [1, [2, [3, [4, [5, [6, [7]]]]]]],
      [[[]], [[], []], []],
      [undefined, [null, [undefined]]],
      ['a', ['b', ['c']]],
      [[[[1]]], [[2]], 3],
      [1, , [2, , [3, , 4]]],
    ]
    const depths = [undefined, 0, 1, 2, 3, 10, Infinity, -5]

    for (const input of inputs) {
      for (const depth of depths) {
        expect(flatten(input, depth)).toEqual(input.flat(depth))
      }
    }
  })
})

describe('06 flatten: input and output', () => {
  it('returns a new array and does not change the input', () => {
    const input = [1, [2, [3]]]
    const result = flatten(input, Infinity)

    expect(result).not.toBe(input)
    expect(input).toEqual([1, [2, [3]]])
    expect(input[1]).toEqual([2, [3]])
  })

  it('returns a new array even when there is nothing to flatten', () => {
    const input = [1, 2, 3]
    const result = flatten(input)

    expect(result).toEqual([1, 2, 3])
    expect(result).not.toBe(input)
  })

  it('works with a very long inner array (do not spread it into arguments)', () => {
    const big = Array.from({ length: 500_000 }, (_, i) => i)
    const result = flatten([big, [-1]])

    expect(result).toHaveLength(500_001)
    expect(result[0]).toBe(0)
    expect(result[499_999]).toBe(499_999)
    expect(result[500_000]).toBe(-1)
  })

  it.each(notArrays)('throws a TypeError when the input is %s', (_label, value) => {
    expect(() => flatten(value)).toThrow(TypeError)
  })

  it('does not use Array.prototype.flat or flatMap', () => {
    const calls = countNativeFlatCalls(() => {
      flatten([1, [2, [3, [4]]]])
      flatten([1, [2, [3, [4]]]], Infinity)
    })

    expect(calls).toEqual({ flat: 0, flatMap: 0 })
  })
})

// ---------------------------------------------------------------------------
// flattenDeep
// ---------------------------------------------------------------------------

describe('06 flattenDeep: results', () => {
  it('flattens every level', () => {
    expect(flattenDeep([1, [2, [3, [4, [5]]]]])).toEqual([1, 2, 3, 4, 5])
  })

  it('keeps the original left-to-right order with a branching structure', () => {
    expect(flattenDeep([[1, 2], [3, [4, 5]], 6, [[[7]]], [[8, [9]], 10]])).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])
  })

  it('returns a copy of an already flat array', () => {
    const input = [1, 2, 3]
    const result = flattenDeep(input)

    expect(result).toEqual([1, 2, 3])
    expect(result).not.toBe(input)
  })

  it('handles empty input and empty nested arrays', () => {
    expect(flattenDeep([])).toEqual([])
    expect(flattenDeep([[], [[], [[]]]])).toEqual([])
    expect(flattenDeep([1, [], [[], 2], 3])).toEqual([1, 2, 3])
  })

  it('keeps undefined, null and other falsy values', () => {
    const result = flattenDeep([[undefined, [null]], 0, [[false], ['', NaN]]])

    expect(result).toHaveLength(6)
    expect(0 in result).toBe(true)
    expect(result[0]).toBeUndefined()
    expect(result[1]).toBeNull()
    expect(result.slice(2)).toEqual([0, false, '', NaN])
  })

  it('skips holes (empty slots)', () => {
    const sparse = [1, , [2, , [3, , 4]], , [, 5]]

    expect(flattenDeep(sparse)).toEqual([1, 2, 3, 4, 5])
  })

  it('does not flatten strings, objects, Sets or typed arrays', () => {
    const object = { list: [1, 2] }
    const set = new Set([1])
    const typed = new Uint8Array([1])
    const result = flattenDeep([['ab', [object]], [[set]], typed])

    expect(result).toHaveLength(4)
    expect(result[0]).toBe('ab')
    expect(result[1]).toBe(object)
    expect(result[2]).toBe(set)
    expect(result[3]).toBe(typed)
  })

  it('matches Array.prototype.flat(Infinity) for many inputs', () => {
    const inputs = [
      [],
      [1, 2, 3],
      [[1], [2], [3]],
      [1, [2, [3, [4, [5, [6, [7]]]]]]],
      [[[]], [[], []], []],
      [undefined, [null, [undefined]]],
      ['a', ['b', ['c']]],
      [[[[1]]], [[2]], 3],
      [1, , [2, , [3, , 4]]],
    ]

    for (const input of inputs) {
      expect(flattenDeep(input)).toEqual(input.flat(Infinity))
    }
  })
})

describe('06 flattenDeep: input and output', () => {
  it('does not change the input, at any level', () => {
    const makeInput = () => [1, [2, [3, [4]]], [[5]]]
    const input = makeInput()

    flattenDeep(input)

    expect(input).toEqual(makeInput())
  })

  it('does not change the input when it is called twice in a row', () => {
    const input = [1, [2, [3]]]

    expect(flattenDeep(input)).toEqual([1, 2, 3])
    expect(flattenDeep(input)).toEqual([1, 2, 3])
  })

  it('survives 100,000 levels of nesting (no recursion, no stack overflow)', () => {
    // Build [0, [1, [2, [ ... [99999, ['end']] ... ]]]] without recursion.
    let deep = ['end']
    for (let level = 99_999; level >= 0; level--) {
      deep = [level, deep]
    }

    const result = flattenDeep(deep)

    expect(result).toHaveLength(100_001)
    expect(result[0]).toBe(0)
    expect(result[50_000]).toBe(50_000)
    expect(result[99_999]).toBe(99_999)
    expect(result[100_000]).toBe('end')
    expect(result.every((value, index) => index === 100_000 || value === index)).toBe(true)
  })

  it('survives 100,000 levels where every level is the only item', () => {
    let deep = [1]
    for (let level = 0; level < 100_000; level++) {
      deep = [deep]
    }

    expect(flattenDeep(deep)).toEqual([1])
  })

  it('works with a very long array (do not spread it into arguments)', () => {
    const big = Array.from({ length: 500_000 }, (_, i) => i)
    const result = flattenDeep([big, [[-1]]])

    expect(result).toHaveLength(500_001)
    expect(result[0]).toBe(0)
    expect(result[499_999]).toBe(499_999)
    expect(result[500_000]).toBe(-1)
  })

  it.each(notArrays)('throws a TypeError when the input is %s', (_label, value) => {
    expect(() => flattenDeep(value)).toThrow(TypeError)
  })

  it('does not use Array.prototype.flat or flatMap', () => {
    const calls = countNativeFlatCalls(() => {
      flattenDeep([1, [2, [3, [4]]]])
    })

    expect(calls).toEqual({ flat: 0, flatMap: 0 })
  })
})

// ---------------------------------------------------------------------------
// flattenObject
// ---------------------------------------------------------------------------

describe('06 flattenObject: paths', () => {
  it('joins nested object keys with dots and array indexes with brackets', () => {
    const input = { a: { b: { c: 1 }, d: [2] } }

    expect(flattenObject(input)).toEqual({ 'a.b.c': 1, 'a.d[0]': 2 })
  })

  it('leaves a flat object as it is (as a new object)', () => {
    const input = { a: 1, b: 'two', c: true }
    const result = flattenObject(input)

    expect(result).toEqual({ a: 1, b: 'two', c: true })
    expect(result).not.toBe(input)
  })

  it('uses the key alone for top-level keys', () => {
    expect(flattenObject({ name: 'Ada' })).toEqual({ name: 'Ada' })
  })

  it('writes array items as [index] straight after the key', () => {
    expect(flattenObject({ list: ['x', 'y', 'z'] })).toEqual({
      'list[0]': 'x',
      'list[1]': 'y',
      'list[2]': 'z',
    })
  })

  it('handles objects inside arrays', () => {
    const input = { users: [{ name: 'Ada', langs: ['js', 'ts'] }, { name: 'Linus' }] }

    expect(flattenObject(input)).toEqual({
      'users[0].name': 'Ada',
      'users[0].langs[0]': 'js',
      'users[0].langs[1]': 'ts',
      'users[1].name': 'Linus',
    })
  })

  it('handles arrays inside arrays', () => {
    expect(flattenObject({ grid: [[1, 2], [3]] })).toEqual({
      'grid[0][0]': 1,
      'grid[0][1]': 2,
      'grid[1][0]': 3,
    })
  })

  it('handles numeric-looking object keys as normal keys', () => {
    expect(flattenObject({ 1: { 2: 'x' } })).toEqual({ '1.2': 'x' })
  })

  it('goes deep', () => {
    let nested = { value: 'end' }
    const expectedPath = []
    for (let level = 0; level < 50; level++) {
      nested = { [`k${level}`]: nested }
      expectedPath.unshift(`k${level}`)
    }

    expect(flattenObject(nested)).toEqual({ [`${expectedPath.join('.')}.value`]: 'end' })
  })

  it('lists the keys in depth-first order, the same order as the input', () => {
    const input = { z: 1, a: { y: 2, b: [3, 4] }, m: 5 }

    expect(Object.keys(flattenObject(input))).toEqual(['z', 'a.y', 'a.b[0]', 'a.b[1]', 'm'])
  })
})

describe('06 flattenObject: values', () => {
  it('keeps null, undefined and falsy values (the key must still exist)', () => {
    const result = flattenObject({ a: null, b: undefined, c: 0, d: '', e: false, f: { g: undefined } })

    expect(Object.keys(result)).toEqual(['a', 'b', 'c', 'd', 'e', 'f.g'])
    expect(result.a).toBeNull()
    expect(result.b).toBeUndefined()
    expect(result['f.g']).toBeUndefined()
    expect(result.c).toBe(0)
    expect(result.d).toBe('')
    expect(result.e).toBe(false)
  })

  it('keeps empty objects and empty arrays as values, so nothing is lost', () => {
    expect(flattenObject({ a: {}, b: [], c: { d: {}, e: [] }, f: [[]] })).toEqual({
      a: {},
      b: [],
      'c.d': {},
      'c.e': [],
      'f[0]': [],
    })
  })

  it('returns an empty object for an empty object', () => {
    expect(flattenObject({})).toEqual({})
  })

  it('does not go inside a Date, a Map, a Set, a RegExp or a function (they are values)', () => {
    const when = new Date(0)
    const table = new Map([['k', 1]])
    const members = new Set([1])
    const pattern = /x/g
    const fn = () => 1
    const result = flattenObject({ meta: { when, table, members, pattern, fn } })

    expect(Object.keys(result)).toEqual(['meta.when', 'meta.table', 'meta.members', 'meta.pattern', 'meta.fn'])
    expect(result['meta.when']).toBe(when)
    expect(result['meta.table']).toBe(table)
    expect(result['meta.members']).toBe(members)
    expect(result['meta.pattern']).toBe(pattern)
    expect(result['meta.fn']).toBe(fn)
  })

  it('does not go inside a class instance (it is a value)', () => {
    class Money {
      constructor(amount) {
        this.amount = amount
      }
    }
    const price = new Money(5)

    const result = flattenObject({ item: { price } })

    expect(Object.keys(result)).toEqual(['item.price'])
    expect(result['item.price']).toBe(price)
  })

  it('accepts an object without a prototype', () => {
    const input = Object.create(null)
    input.a = { b: 1 }

    expect(flattenObject(input)).toEqual({ 'a.b': 1 })
  })
})

describe('06 flattenObject: input and output', () => {
  it('does not change the input', () => {
    const makeInput = () => ({ a: { b: [1, { c: 2 }] }, d: {} })
    const input = makeInput()

    flattenObject(input)

    expect(input).toEqual(makeInput())
  })

  it('returns a plain object', () => {
    expect(Object.getPrototypeOf(flattenObject({ a: { b: 1 } }))).toBe(Object.prototype)
  })

  it.each(notPlainObjects)('throws a TypeError when the input is %s', (_label, value) => {
    expect(() => flattenObject(value)).toThrow(TypeError)
  })
})

// ---------------------------------------------------------------------------
// unflattenObject
// ---------------------------------------------------------------------------

describe('06 unflattenObject: paths', () => {
  it('rebuilds nested objects and arrays from dot and bracket paths', () => {
    const flat = { 'a.b.c': 1, 'a.d[0]': 2 }

    expect(unflattenObject(flat)).toStrictEqual({ a: { b: { c: 1 }, d: [2] } })
  })

  it('leaves simple keys as they are', () => {
    expect(unflattenObject({ a: 1, b: 'two' })).toStrictEqual({ a: 1, b: 'two' })
  })

  it('merges keys that share a parent', () => {
    expect(unflattenObject({ 'user.name': 'Ada', 'user.age': 36, 'user.address.city': 'London' })).toStrictEqual({
      user: { name: 'Ada', age: 36, address: { city: 'London' } },
    })
  })

  it('creates an array when the next step is an [index]', () => {
    const result = unflattenObject({ 'list[0]': 'x', 'list[1]': 'y', 'list[2]': 'z' })

    expect(Array.isArray(result.list)).toBe(true)
    expect(result).toStrictEqual({ list: ['x', 'y', 'z'] })
  })

  it('puts items at the index given in the brackets, whatever the key order', () => {
    expect(unflattenObject({ 'list[2]': 'c', 'list[0]': 'a', 'list[1]': 'b' })).toStrictEqual({
      list: ['a', 'b', 'c'],
    })
  })

  it('handles objects inside arrays', () => {
    const flat = {
      'users[0].name': 'Ada',
      'users[0].langs[0]': 'js',
      'users[0].langs[1]': 'ts',
      'users[1].name': 'Linus',
    }

    expect(unflattenObject(flat)).toStrictEqual({
      users: [{ name: 'Ada', langs: ['js', 'ts'] }, { name: 'Linus' }],
    })
  })

  it('handles arrays inside arrays', () => {
    expect(unflattenObject({ 'grid[0][0]': 1, 'grid[0][1]': 2, 'grid[1][0]': 3 })).toStrictEqual({
      grid: [[1, 2], [3]],
    })
  })

  it('makes an object for "a.0" and an array for "a[0]"', () => {
    const asObject = unflattenObject({ 'a.0': 'x' })
    const asArray = unflattenObject({ 'a[0]': 'x' })

    expect(Array.isArray(asObject.a)).toBe(false)
    expect(asObject).toStrictEqual({ a: { 0: 'x' } })
    expect(Array.isArray(asArray.a)).toBe(true)
    expect(asArray).toStrictEqual({ a: ['x'] })
  })

  it('returns an empty object for an empty object', () => {
    expect(unflattenObject({})).toStrictEqual({})
  })
})

describe('06 unflattenObject: values', () => {
  it('keeps null, undefined and falsy values (the key must still exist)', () => {
    const result = unflattenObject({ a: null, b: undefined, 'c.d': undefined, e: 0, f: '', g: false })

    expect(Object.keys(result)).toEqual(['a', 'b', 'c', 'e', 'f', 'g'])
    expect('d' in result.c).toBe(true)
    expect(result).toStrictEqual({ a: null, b: undefined, c: { d: undefined }, e: 0, f: '', g: false })
  })

  it('keeps empty objects and empty arrays that are stored as values', () => {
    expect(unflattenObject({ a: {}, b: [], 'c.d': {}, 'c.e': [], 'f[0]': [] })).toStrictEqual({
      a: {},
      b: [],
      c: { d: {}, e: [] },
      f: [[]],
    })
  })

  it('keeps Dates and functions by reference', () => {
    const when = new Date(0)
    const fn = () => 1
    const result = unflattenObject({ 'meta.when': when, 'meta.fn': fn })

    expect(result.meta.when).toBe(when)
    expect(result.meta.fn).toBe(fn)
  })
})

describe('06 unflattenObject: input and output', () => {
  it('does not change the input and returns a new object', () => {
    const makeInput = () => ({ 'a.b': 1, 'a.c[0]': 2 })
    const input = makeInput()
    const result = unflattenObject(input)

    expect(input).toEqual(makeInput())
    expect(result).not.toBe(input)
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
  })

  it.each(notPlainObjects)('throws a TypeError when the input is %s', (_label, value) => {
    expect(() => unflattenObject(value)).toThrow(TypeError)
  })
})

describe('06 unflattenObject: safety (prototype pollution)', () => {
  afterEach(() => {
    // If a wrong solution polluted the prototype, do not poison the other tests.
    delete Object.prototype.polluted
    delete Object.prototype.hacked
  })

  it.each([
    ['__proto__.polluted', { '__proto__.polluted': true }],
    ['constructor.prototype.polluted', { 'constructor.prototype.polluted': true }],
    ['a.__proto__.polluted', { 'a.__proto__.polluted': true }],
    ['a[0].constructor.prototype.polluted', { 'a[0].constructor.prototype.polluted': true }],
    ['prototype.polluted', { 'prototype.polluted': true }],
  ])('throws a TypeError for the key %s and does not touch Object.prototype', (_label, flat) => {
    expect(() => unflattenObject(flat)).toThrow(TypeError)
    expect({}.polluted).toBeUndefined()
    expect(Object.prototype.polluted).toBeUndefined()
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false)
  })

  it('treats keys that look like built-in method names as normal keys', () => {
    const result = unflattenObject({ 'toString.hacked': 1, 'hasOwnProperty.x': 2 })

    expect(result).toStrictEqual({ toString: { hacked: 1 }, hasOwnProperty: { x: 2 } })
    expect(Object.prototype.toString.hacked).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.x).toBeUndefined()
  })
})

describe('06 flattenObject and unflattenObject: round trip', () => {
  const samples = [
    ['a flat object', { a: 1, b: 'two' }],
    ['nested objects', { a: { b: { c: 1 }, d: 2 }, e: 3 }],
    ['arrays of primitives', { list: [1, 2, 3] }],
    ['arrays of objects', { users: [{ name: 'Ada', tags: ['x'] }, { name: 'Linus' }] }],
    ['arrays of arrays', { grid: [[1, 2], [3, 4, 5]] }],
    ['the example from the task', { a: { b: { c: 1 }, d: [2] } }],
    ['null and undefined values', { a: null, b: { c: undefined, d: [null, undefined] } }],
    ['empty containers', { a: {}, b: [], c: { d: [], e: {} }, f: [{}, []] }],
    ['an empty object', {}],
  ]

  it.each(samples)('unflatten(flatten(x)) gives back x for %s', (_label, original) => {
    expect(unflattenObject(flattenObject(original))).toStrictEqual(original)
  })

  it.each(samples)('flatten(unflatten(flat)) gives back flat for %s', (_label, original) => {
    const flat = flattenObject(original)

    expect(flattenObject(unflattenObject(flat))).toStrictEqual(flat)
  })
})
