import { deepEqual } from './index.js'

describe('09 deepEqual: primitives (Object.is rules)', () => {
  const sharedSymbol = Symbol('id')

  it.each([
    ['numbers', 42, 42],
    ['strings', 'react', 'react'],
    ['booleans', true, true],
    ['null', null, null],
    ['undefined', undefined, undefined],
    ['bigints', 10n, 10n],
    ['the same symbol', sharedSymbol, sharedSymbol],
  ])('treats equal %s as equal', (_name, a, b) => {
    expect(deepEqual(a, b)).toBe(true)
  })

  it.each([
    ['different numbers', 1, 2],
    ['a number and its string', 1, '1'],
    ['zero and false', 0, false],
    ['an empty string and zero', '', 0],
    ['null and undefined', null, undefined],
    ['null and zero', null, 0],
    ['different strings', 'a', 'b'],
    ['true and false', true, false],
    ['a bigint and a number', 1n, 1],
    ['two different symbols with the same description', Symbol('x'), Symbol('x')],
  ])('treats %s as different', (_name, a, b) => {
    expect(deepEqual(a, b)).toBe(false)
  })

  it('treats NaN as equal to NaN', () => {
    expect(deepEqual(NaN, NaN)).toBe(true)
    expect(deepEqual(NaN, 'NaN')).toBe(false)
    expect(deepEqual(NaN, undefined)).toBe(false)
  })

  it('treats +0 and -0 as different', () => {
    expect(deepEqual(0, -0)).toBe(false)
    expect(deepEqual(-0, 0)).toBe(false)
    expect(deepEqual(0, 0)).toBe(true)
    expect(deepEqual(-0, -0)).toBe(true)
  })

  it('applies the same Object.is rules inside objects and arrays', () => {
    expect(deepEqual({ n: NaN }, { n: NaN })).toBe(true)
    expect(deepEqual([NaN], [NaN])).toBe(true)
    expect(deepEqual({ n: 0 }, { n: -0 })).toBe(false)
    expect(deepEqual([0], [-0])).toBe(false)
  })

  it('never equates an object with a primitive or with null', () => {
    expect(deepEqual({}, null)).toBe(false)
    expect(deepEqual(null, {})).toBe(false)
    expect(deepEqual([], 0)).toBe(false)
    expect(deepEqual({}, 'x')).toBe(false)
    expect(deepEqual(undefined, {})).toBe(false)
  })
})

describe('09 deepEqual: plain objects', () => {
  it('compares nested objects by value', () => {
    const a = { user: { name: 'Ada', address: { city: 'London', zip: 'N1' } }, active: true }
    const b = { user: { name: 'Ada', address: { city: 'London', zip: 'N1' } }, active: true }
    expect(a).not.toBe(b)
    expect(deepEqual(a, b)).toBe(true)
  })

  it('does not care about key order, at any depth', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
    expect(deepEqual({ x: { a: 1, b: 2 }, y: 3 }, { y: 3, x: { b: 2, a: 1 } })).toBe(true)
  })

  it('treats two empty objects as equal', () => {
    expect(deepEqual({}, {})).toBe(true)
  })

  it('finds a different value deep inside', () => {
    const a = { l1: { l2: { l3: { value: 1 } } } }
    const b = { l1: { l2: { l3: { value: 2 } } } }
    expect(deepEqual(a, b)).toBe(false)
  })

  it('treats an object with an extra key as different (in both directions)', () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false)
  })

  it('treats a key holding undefined as different from a missing key', () => {
    expect(deepEqual({ a: undefined }, {})).toBe(false)
    expect(deepEqual({}, { a: undefined })).toBe(false)
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(false)
  })

  it('treats the same number of keys with different names as different', () => {
    expect(deepEqual({ a: undefined }, { b: undefined })).toBe(false)
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false)
  })

  it('treats a key holding undefined as equal to the same key holding undefined', () => {
    expect(deepEqual({ a: undefined }, { a: undefined })).toBe(true)
  })
})

describe('09 deepEqual: arrays', () => {
  it('compares arrays element by element', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEqual([], [])).toBe(true)
  })

  it('cares about order', () => {
    expect(deepEqual([1, 2, 3], [3, 2, 1])).toBe(false)
  })

  it('treats arrays of different length as different', () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(deepEqual([1, 2, 3], [1, 2])).toBe(false)
    expect(deepEqual([undefined], [])).toBe(false)
  })

  it('compares nested arrays and arrays of objects', () => {
    expect(deepEqual([[1, 2], [3, [4]]], [[1, 2], [3, [4]]])).toBe(true)
    expect(deepEqual([[1, 2], [3, [4]]], [[1, 2], [3, [5]]])).toBe(false)
    expect(deepEqual([{ id: 1 }, { id: 2 }], [{ id: 1 }, { id: 2 }])).toBe(true)
    expect(deepEqual([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 1 }])).toBe(false)
  })

  it('does not mix up arrays with plain objects', () => {
    expect(deepEqual([], {})).toBe(false)
    expect(deepEqual({}, [])).toBe(false)
    expect(deepEqual([1], { 0: 1, length: 1 })).toBe(false)
    expect(deepEqual({ 0: 'a', 1: 'b' }, ['a', 'b'])).toBe(false)
  })
})

describe('09 deepEqual: Date and RegExp', () => {
  it('compares dates by time, not by reference', () => {
    expect(deepEqual(new Date(2026, 0, 15), new Date(2026, 0, 15))).toBe(true)
    expect(deepEqual(new Date(1000), new Date(1000))).toBe(true)
  })

  it('treats dates with different times as different', () => {
    expect(deepEqual(new Date(1000), new Date(1001))).toBe(false)
  })

  it('does not equate a date with a number, a string or a plain object', () => {
    expect(deepEqual(new Date(0), 0)).toBe(false)
    expect(deepEqual(new Date(0), '1970-01-01T00:00:00.000Z')).toBe(false)
    expect(deepEqual(new Date(0), {})).toBe(false)
    expect(deepEqual({}, new Date(0))).toBe(false)
  })

  it('compares dates that sit inside other values', () => {
    const a = { createdAt: new Date(5000), history: [new Date(1), new Date(2)] }
    const b = { createdAt: new Date(5000), history: [new Date(1), new Date(2)] }
    const c = { createdAt: new Date(5000), history: [new Date(1), new Date(3)] }
    expect(deepEqual(a, b)).toBe(true)
    expect(deepEqual(a, c)).toBe(false)
  })

  it('compares regular expressions by source and flags', () => {
    expect(deepEqual(/ab+c/gi, /ab+c/gi)).toBe(true)
    expect(deepEqual(/ab+c/g, /ab+d/g)).toBe(false)
    expect(deepEqual(/abc/g, /abc/i)).toBe(false)
    expect(deepEqual(/abc/, /abc/g)).toBe(false)
  })

  it('does not equate a regular expression with a string or a plain object', () => {
    expect(deepEqual(/abc/, '/abc/')).toBe(false)
    expect(deepEqual(/abc/, {})).toBe(false)
  })
})

describe('09 deepEqual: Map', () => {
  it('compares maps by their entries', () => {
    const a = new Map([['a', 1], ['b', 2]])
    const b = new Map([['a', 1], ['b', 2]])
    expect(deepEqual(a, b)).toBe(true)
    expect(deepEqual(new Map(), new Map())).toBe(true)
  })

  it('ignores insertion order', () => {
    const a = new Map([['a', 1], ['b', 2]])
    const b = new Map([['b', 2], ['a', 1]])
    expect(deepEqual(a, b)).toBe(true)
  })

  it('treats maps with a different value, a different key or a different size as different', () => {
    const base = new Map([['a', 1], ['b', 2]])
    expect(deepEqual(base, new Map([['a', 1], ['b', 3]]))).toBe(false)
    expect(deepEqual(base, new Map([['a', 1], ['c', 2]]))).toBe(false)
    expect(deepEqual(base, new Map([['a', 1]]))).toBe(false)
    expect(deepEqual(new Map([['a', 1]]), base)).toBe(false)
  })

  it('compares map values deeply', () => {
    const a = new Map([['user', { name: 'Ada', tags: ['x', 'y'] }]])
    const b = new Map([['user', { name: 'Ada', tags: ['x', 'y'] }]])
    const c = new Map([['user', { name: 'Ada', tags: ['x', 'z'] }]])
    expect(deepEqual(a, b)).toBe(true)
    expect(deepEqual(a, c)).toBe(false)
  })

  it('matches object keys by identity, like Map itself', () => {
    const key = { id: 1 }
    expect(deepEqual(new Map([[key, 'v']]), new Map([[key, 'v']]))).toBe(true)
  })

  it('does not equate a map with a set, an array or a plain object', () => {
    expect(deepEqual(new Map(), new Set())).toBe(false)
    expect(deepEqual(new Map(), {})).toBe(false)
    expect(deepEqual(new Map([['a', 1]]), [['a', 1]])).toBe(false)
    expect(deepEqual(new Map([['a', 1]]), { a: 1 })).toBe(false)
  })
})

describe('09 deepEqual: Set', () => {
  it('compares sets by their members and ignores order', () => {
    expect(deepEqual(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBe(true)
    expect(deepEqual(new Set([1, 2, 3]), new Set([3, 1, 2]))).toBe(true)
    expect(deepEqual(new Set(), new Set())).toBe(true)
  })

  it('treats sets with different members or a different size as different', () => {
    expect(deepEqual(new Set([1, 2]), new Set([1, 3]))).toBe(false)
    expect(deepEqual(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false)
    expect(deepEqual(new Set([1, 2, 3]), new Set([1, 2]))).toBe(false)
  })

  it('compares object members by value, whatever their order', () => {
    const a = new Set([{ id: 1 }, { id: 2 }])
    const b = new Set([{ id: 2 }, { id: 1 }])
    const c = new Set([{ id: 1 }, { id: 3 }])
    expect(deepEqual(a, b)).toBe(true)
    expect(deepEqual(a, c)).toBe(false)
  })

  it('pairs members one-to-one (a member of one set can match only one member of the other)', () => {
    const twoOnes = new Set([{ n: 1 }, { n: 1 }])
    const oneAndTwo = new Set([{ n: 1 }, { n: 2 }])
    expect(deepEqual(twoOnes, oneAndTwo)).toBe(false)
    expect(deepEqual(oneAndTwo, twoOnes)).toBe(false)
    expect(deepEqual(twoOnes, new Set([{ n: 1 }, { n: 1 }]))).toBe(true)
  })

  it('handles NaN as a member', () => {
    expect(deepEqual(new Set([NaN]), new Set([NaN]))).toBe(true)
    expect(deepEqual(new Set([NaN]), new Set([1]))).toBe(false)
  })

  it('does not equate a set with an array', () => {
    expect(deepEqual(new Set([1, 2]), [1, 2])).toBe(false)
    expect(deepEqual([1, 2], new Set([1, 2]))).toBe(false)
  })
})

describe('09 deepEqual: prototypes and constructors', () => {
  class Point {
    constructor(x, y) {
      this.x = x
      this.y = y
    }
  }
  class Vector {
    constructor(x, y) {
      this.x = x
      this.y = y
    }
  }
  class Point3D extends Point {}

  it('treats instances of the same class with equal fields as equal', () => {
    expect(deepEqual(new Point(1, 2), new Point(1, 2))).toBe(true)
    expect(deepEqual(new Point(1, 2), new Point(1, 3))).toBe(false)
  })

  it('treats instances of different classes as different, even with equal fields', () => {
    expect(deepEqual(new Point(1, 2), new Vector(1, 2))).toBe(false)
  })

  it('treats a subclass instance as different from a parent class instance', () => {
    expect(deepEqual(new Point(1, 2), new Point3D(1, 2))).toBe(false)
  })

  it('treats a class instance as different from a plain object with the same fields', () => {
    expect(deepEqual(new Point(1, 2), { x: 1, y: 2 })).toBe(false)
    expect(deepEqual({ x: 1, y: 2 }, new Point(1, 2))).toBe(false)
  })

  it('treats an object without a prototype as different from a plain object', () => {
    const bare = Object.create(null)
    bare.a = 1
    expect(deepEqual(bare, { a: 1 })).toBe(false)
    expect(deepEqual({ a: 1 }, bare)).toBe(false)
  })

  it('treats two objects without a prototype and with equal content as equal', () => {
    const one = Object.create(null)
    one.a = 1
    const two = Object.create(null)
    two.a = 1
    expect(deepEqual(one, two)).toBe(true)
  })

  it('compares class instances found inside other values', () => {
    expect(deepEqual([new Point(1, 2)], [new Point(1, 2)])).toBe(true)
    expect(deepEqual([new Point(1, 2)], [new Vector(1, 2)])).toBe(false)
  })
})

describe('09 deepEqual: functions', () => {
  it('treats the same function as equal', () => {
    const fn = () => 1
    expect(deepEqual(fn, fn)).toBe(true)
  })

  it('treats two different functions as different, even with the same source', () => {
    expect(deepEqual(() => 1, () => 1)).toBe(false)
    function one() {}
    function two() {}
    expect(deepEqual(one, two)).toBe(false)
  })

  it('compares function properties by reference', () => {
    const onClick = () => {}
    expect(deepEqual({ onClick }, { onClick })).toBe(true)
    expect(deepEqual({ onClick: () => {} }, { onClick: () => {} })).toBe(false)
    expect(deepEqual([onClick], [onClick])).toBe(true)
  })

  it('does not equate a function with an object', () => {
    expect(deepEqual(() => {}, {})).toBe(false)
  })
})

describe('09 deepEqual: circular references', () => {
  it('treats two similar self-referencing objects as equal', () => {
    const a = { name: 'node' }
    a.self = a
    const b = { name: 'node' }
    b.self = b
    expect(deepEqual(a, b)).toBe(true)
  })

  it('finds a difference inside a self-referencing object', () => {
    const a = { name: 'x' }
    a.self = a
    const b = { name: 'y' }
    b.self = b
    expect(deepEqual(a, b)).toBe(false)
  })

  it('handles a parent and child that point to each other', () => {
    const makeFamily = (childName) => {
      const parent = { name: 'parent', children: [] }
      parent.children.push({ name: childName, parent })
      return parent
    }
    expect(deepEqual(makeFamily('kid'), makeFamily('kid'))).toBe(true)
    expect(deepEqual(makeFamily('kid'), makeFamily('other'))).toBe(false)
  })

  it('handles an array that contains itself', () => {
    const a = [1]
    a.push(a)
    const b = [1]
    b.push(b)
    expect(deepEqual(a, b)).toBe(true)
  })

  it('handles a Map and a Set that contain themselves', () => {
    const mapA = new Map()
    mapA.set('me', mapA)
    const mapB = new Map()
    mapB.set('me', mapB)
    expect(deepEqual(mapA, mapB)).toBe(true)

    const setA = new Set()
    setA.add(setA)
    const setB = new Set()
    setB.add(setB)
    expect(deepEqual(setA, setB)).toBe(true)
  })

  it('returns false (and does not overflow the stack) when only one side is circular', () => {
    const circular = {}
    circular.self = circular
    const finite = { self: { self: {} } }
    expect(() => deepEqual(circular, finite)).not.toThrow()
    expect(deepEqual(circular, finite)).toBe(false)
    expect(deepEqual(finite, circular)).toBe(false)
  })

  it('does not remember a failed comparison as a match', () => {
    // p1 does not equal q2. The first Set tries p1 against q2 (fails) and
    // later p2 against q3 needs the very same pair (p1, q2) again.
    // The correct answer is false, and a "seen pairs" memory that is never
    // cleaned up would wrongly answer true.
    const p1 = { v: 1 }
    const p2 = { w: p1 }
    const p4 = { v: 2 }
    const q1 = { v: 1 }
    const q2 = { v: 2 }
    const q3 = { w: q2 }
    expect(deepEqual(new Set([p1, p2, p4]), new Set([q2, q1, q3]))).toBe(false)
  })

  it('treats shared (non-circular) references like separate copies', () => {
    const shared = { n: 1 }
    const withSharing = { first: shared, second: shared }
    const withCopies = { first: { n: 1 }, second: { n: 1 } }
    expect(deepEqual(withSharing, withCopies)).toBe(true)
    expect(deepEqual(withCopies, withSharing)).toBe(true)
  })
})

describe('09 deepEqual: whole-value checks', () => {
  const makeOrder = () => ({
    id: 'ord-1',
    total: 59.9,
    createdAt: new Date(Date.UTC(2026, 10, 10)),
    pattern: /^ord-\d+$/i,
    lines: [
      { sku: 'a1', qty: 2, tags: new Set(['new', 'sale']) },
      { sku: 'b2', qty: 1, tags: new Set() },
    ],
    meta: new Map([['source', { channel: 'web', retries: [0, 1] }]]),
    note: null,
    gift: undefined,
  })

  it('treats two separately built copies of a rich value as equal', () => {
    expect(deepEqual(makeOrder(), makeOrder())).toBe(true)
  })

  it.each([
    ['a number deep in an array', (o) => { o.meta.get('source').retries[1] = 2 }],
    ['a string in a nested object', (o) => { o.meta.get('source').channel = 'app' }],
    ['a date', (o) => { o.createdAt = new Date(Date.UTC(2026, 10, 11)) }],
    ['a regexp flag', (o) => { o.pattern = /^ord-\d+$/ }],
    ['a set member', (o) => { o.lines[0].tags.add('extra') }],
    ['a map value', (o) => { o.meta.set('source', 'web') }],
    ['an extra key', (o) => { o.extra = true }],
    ['a null turned into undefined', (o) => { o.note = undefined }],
    ['a removed key that held undefined', (o) => { delete o.gift }],
  ])('notices a change in %s', (_name, change) => {
    const changed = makeOrder()
    change(changed)
    expect(deepEqual(makeOrder(), changed)).toBe(false)
    expect(deepEqual(changed, makeOrder())).toBe(false)
  })

  it.each([
    ['equal objects with different key order', { a: 1, b: { c: 2 } }, { b: { c: 2 }, a: 1 }, true],
    ['an object with an extra key', { a: 1 }, { a: 1, b: 2 }, false],
    ['an undefined key and a missing key', { a: undefined }, {}, false],
    ['arrays in a different order', [1, 2], [2, 1], false],
    ['sets with different members', new Set([1]), new Set([1, 2]), false],
    ['maps with different values', new Map([[1, { x: 1 }]]), new Map([[1, { x: 2 }]]), false],
    ['a Date and a plain object', new Date(0), {}, false],
    ['a class instance and a plain object', new (class A { constructor() { this.a = 1 } })(), { a: 1 }, false],
  ])('gives the same answer in both directions for %s', (_name, a, b, expected) => {
    expect(deepEqual(a, b)).toBe(expected)
    expect(deepEqual(b, a)).toBe(expected)
  })

  it('works on deeply frozen input and leaves it unchanged', () => {
    const deepFreeze = (value) => {
      if (typeof value === 'object' && value !== null) {
        Object.values(value).forEach(deepFreeze)
        Object.freeze(value)
      }
      return value
    }
    const a = deepFreeze({ list: [1, { x: 2 }], nested: { y: [3] } })
    const b = deepFreeze({ list: [1, { x: 2 }], nested: { y: [3] } })
    expect(deepEqual(a, b)).toBe(true)
    expect(a).toEqual({ list: [1, { x: 2 }], nested: { y: [3] } })
  })
})
