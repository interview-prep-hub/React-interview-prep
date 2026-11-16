import { deepClone } from './index.js'

// Runs `fn` while the given methods are spied on, restores them, and returns
// how many times each one was called. (Restoring BEFORE any expect() keeps
// the test runner's own code away from the spies.)
function countCalls(targets, fn) {
  const spies = targets.map(([object, name]) => vi.spyOn(object, name))
  try {
    fn()
    return spies.map((spy) => spy.mock.calls.length)
  } finally {
    spies.forEach((spy) => spy.mockRestore())
  }
}

describe('05 deepClone: primitives and functions', () => {
  it.each([
    ['a number', 42],
    ['zero', 0],
    ['a string', 'text'],
    ['an empty string', ''],
    ['true', true],
    ['false', false],
    ['null', null],
    ['undefined', undefined],
    ['a bigint', 10n],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['negative zero', -0],
  ])('returns %s as it is', (_label, value) => {
    expect(Object.is(deepClone(value), value)).toBe(true)
  })

  it('returns a symbol as it is', () => {
    const id = Symbol('id')
    expect(deepClone(id)).toBe(id)
  })

  it('returns undefined when called without an argument', () => {
    expect(deepClone()).toBeUndefined()
  })

  it('keeps a function by reference', () => {
    const greet = () => 'hi'
    expect(deepClone(greet)).toBe(greet)
  })

  it('keeps a function inside an object by reference, and it still works', () => {
    const add = (a, b) => a + b
    const original = { add, nested: { add } }
    const clone = deepClone(original)

    expect(clone.add).toBe(add)
    expect(clone.nested.add).toBe(add)
    expect(clone.add(2, 3)).toBe(5)
    expect(clone.nested).not.toBe(original.nested)
  })
})

describe('05 deepClone: plain objects and arrays', () => {
  it('returns a new object with the same content', () => {
    const original = { name: 'Ada', age: 36 }
    const clone = deepClone(original)

    expect(clone).toEqual({ name: 'Ada', age: 36 })
    expect(clone).not.toBe(original)
  })

  it('clones nested objects and arrays at every level', () => {
    const original = {
      user: { name: 'Ada', tags: ['a', 'b'], address: { city: 'London' } },
      list: [{ id: 1 }, { id: 2 }],
    }
    const clone = deepClone(original)

    expect(clone).toEqual(original)
    expect(clone.user).not.toBe(original.user)
    expect(clone.user.tags).not.toBe(original.user.tags)
    expect(clone.user.address).not.toBe(original.user.address)
    expect(clone.list).not.toBe(original.list)
    expect(clone.list[0]).not.toBe(original.list[0])
    expect(clone.list[1]).not.toBe(original.list[1])
  })

  it('does not change the original when the clone is changed', () => {
    const original = { user: { name: 'Ada', tags: ['a'] }, list: [{ id: 1 }] }
    const clone = deepClone(original)

    clone.user.name = 'Grace'
    clone.user.tags.push('b')
    clone.list[0].id = 99
    clone.extra = true

    expect(original).toEqual({ user: { name: 'Ada', tags: ['a'] }, list: [{ id: 1 }] })
  })

  it('does not change the clone when the original is changed later', () => {
    const original = { user: { name: 'Ada' }, list: [1, 2] }
    const clone = deepClone(original)

    original.user.name = 'Grace'
    original.list.push(3)

    expect(clone).toEqual({ user: { name: 'Ada' }, list: [1, 2] })
  })

  it('copies arrays into real arrays of the same length, including nested arrays', () => {
    const original = [1, [2, [3, [4]]], 'x']
    const clone = deepClone(original)

    expect(Array.isArray(clone)).toBe(true)
    expect(clone).toHaveLength(3)
    expect(clone).toEqual([1, [2, [3, [4]]], 'x'])
    expect(clone).not.toBe(original)
    expect(clone[1]).not.toBe(original[1])
    expect(clone[1][1]).not.toBe(original[1][1])
    expect(clone[1][1][1]).not.toBe(original[1][1][1])
  })

  it('handles empty objects and empty arrays', () => {
    const emptyObject = {}
    const emptyArray = []

    expect(deepClone(emptyObject)).toEqual({})
    expect(deepClone(emptyObject)).not.toBe(emptyObject)
    expect(deepClone(emptyArray)).toEqual([])
    expect(deepClone(emptyArray)).not.toBe(emptyArray)
    expect(Array.isArray(deepClone(emptyArray))).toBe(true)
  })

  it('keeps properties whose value is undefined', () => {
    const clone = deepClone({ a: undefined, b: 1, nested: { c: undefined } })

    expect(Object.keys(clone)).toEqual(['a', 'b', 'nested'])
    expect('a' in clone).toBe(true)
    expect('c' in clone.nested).toBe(true)
    expect(clone).toStrictEqual({ a: undefined, b: 1, nested: { c: undefined } })
  })

  it('keeps undefined, null and falsy values inside arrays', () => {
    const clone = deepClone([undefined, null, 0, '', false, NaN])

    expect(clone).toHaveLength(6)
    expect(0 in clone).toBe(true) // the slot exists, it is not a hole
    expect(clone[0]).toBeUndefined()
    expect(clone[1]).toBeNull()
    expect(clone[2]).toBe(0)
    expect(clone[3]).toBe('')
    expect(clone[4]).toBe(false)
    expect(clone[5]).toBeNaN()
  })

  it('keeps the order of the keys', () => {
    const original = { z: 1, a: { y: 2, b: 3 }, m: 4 }
    const clone = deepClone(original)

    expect(Object.keys(clone)).toEqual(['z', 'a', 'm'])
    expect(Object.keys(clone.a)).toEqual(['y', 'b'])
  })

  it('copies symbol keys, and clones the values stored under them', () => {
    const secret = Symbol('secret')
    const hidden = Symbol('hidden')
    const original = { visible: 1, [secret]: { level: 3 }, [hidden]: 'x' }
    const clone = deepClone(original)

    expect(Object.getOwnPropertySymbols(clone)).toEqual([secret, hidden])
    expect(clone[secret]).toEqual({ level: 3 })
    expect(clone[secret]).not.toBe(original[secret])
    expect(clone[hidden]).toBe('x')
    expect(clone.visible).toBe(1)
  })

  it('keeps a symbol used as a value (the symbol itself is not copied)', () => {
    const tag = Symbol('tag')
    const clone = deepClone({ tag, list: [tag] })

    expect(clone.tag).toBe(tag)
    expect(clone.list[0]).toBe(tag)
  })

  it('keeps the prototype: a class instance is still an instance of its class', () => {
    class Point {
      constructor(x, y) {
        this.x = x
        this.y = y
      }
      sum() {
        return this.x + this.y
      }
    }
    const original = new Point(1, 2)
    const clone = deepClone(original)

    expect(clone).not.toBe(original)
    expect(clone).toBeInstanceOf(Point)
    expect(clone.sum()).toBe(3)
    expect(Object.keys(clone)).toEqual(['x', 'y'])
  })

  it('keeps an object without a prototype without a prototype', () => {
    const original = Object.create(null)
    original.key = { deep: true }
    const clone = deepClone(original)

    expect(Object.getPrototypeOf(clone)).toBeNull()
    expect(clone.key).toEqual({ deep: true })
    expect(clone.key).not.toBe(original.key)
  })

  it('works on a frozen original and returns a modifiable clone', () => {
    const original = Object.freeze({
      list: Object.freeze([1, 2]),
      inner: Object.freeze({ n: 1 }),
    })
    const clone = deepClone(original)

    expect(clone).toEqual({ list: [1, 2], inner: { n: 1 } })
    expect(Object.isFrozen(clone)).toBe(false)
    expect(() => {
      clone.list.push(3)
      clone.inner.n = 2
      clone.added = true
    }).not.toThrow()
  })

  it('copies an own key named "__proto__" as an ordinary key (no prototype change)', () => {
    // JSON.parse creates a real own property called "__proto__".
    const original = JSON.parse('{"__proto__": {"polluted": true}, "a": 1}')
    const clone = deepClone(original)

    expect(Object.getPrototypeOf(clone)).toBe(Object.prototype)
    expect(clone.polluted).toBeUndefined()
    expect(Object.keys(clone)).toEqual(['__proto__', 'a'])
    expect(Object.getOwnPropertyDescriptor(clone, '__proto__').value).toEqual({ polluted: true })
    expect(({}).polluted).toBeUndefined()
  })

  it('clones a long array of objects', () => {
    const original = Array.from({ length: 50_000 }, (_, i) => ({ i }))
    const clone = deepClone(original)

    expect(clone).toHaveLength(50_000)
    expect(clone[0]).not.toBe(original[0])
    expect(clone[49_999]).toEqual({ i: 49_999 })
    expect(clone.every((item, i) => item.i === i && item !== original[i])).toBe(true)
  })
})

describe('05 deepClone: Date', () => {
  it('creates a new Date with the same time', () => {
    const original = new Date('2026-11-10T12:30:00.000Z')
    const clone = deepClone(original)

    expect(clone).toBeInstanceOf(Date)
    expect(clone).not.toBe(original)
    expect(clone.getTime()).toBe(original.getTime())
  })

  it('does not share state with the original Date', () => {
    const original = new Date('2026-11-10T12:30:00.000Z')
    const clone = deepClone(original)

    clone.setUTCFullYear(2000)

    expect(original.toISOString()).toBe('2026-11-10T12:30:00.000Z')
    expect(clone.getUTCFullYear()).toBe(2000)
  })

  it('keeps an invalid Date invalid', () => {
    const clone = deepClone(new Date('not a date'))

    expect(clone).toBeInstanceOf(Date)
    expect(Number.isNaN(clone.getTime())).toBe(true)
  })

  it('clones Dates found inside objects and arrays', () => {
    const when = new Date(0)
    const clone = deepClone({ when, history: [new Date(1000)] })

    expect(clone.when).toEqual(when)
    expect(clone.when).not.toBe(when)
    expect(clone.history[0].getTime()).toBe(1000)
  })
})

describe('05 deepClone: RegExp', () => {
  it('creates a new RegExp with the same source and flags', () => {
    const original = /a.b+c/gimsuy
    const clone = deepClone(original)

    expect(clone).toBeInstanceOf(RegExp)
    expect(clone).not.toBe(original)
    expect(clone.source).toBe(original.source)
    expect(clone.flags).toBe(original.flags)
  })

  it('copies lastIndex too', () => {
    const original = /a/g
    original.lastIndex = 2
    const clone = deepClone(original)

    expect(clone.lastIndex).toBe(2)
  })

  it('works like the original, and the two do not share lastIndex', () => {
    const original = /o/g
    const clone = deepClone(original)

    expect(clone.test('foo')).toBe(true)
    expect(clone.lastIndex).toBe(2)
    expect(original.lastIndex).toBe(0)
  })

  it('clones a RegExp found inside an object', () => {
    const pattern = /^\d+$/
    const clone = deepClone({ pattern })

    expect(clone.pattern).not.toBe(pattern)
    expect(clone.pattern.test('123')).toBe(true)
    expect(clone.pattern.test('12a')).toBe(false)
  })
})

describe('05 deepClone: Map', () => {
  it('creates a new Map with the same entries in the same order', () => {
    const original = new Map([
      ['b', 1],
      ['a', 2],
      [3, 'three'],
    ])
    const clone = deepClone(original)

    expect(clone).toBeInstanceOf(Map)
    expect(clone).not.toBe(original)
    expect([...clone.entries()]).toEqual([
      ['b', 1],
      ['a', 2],
      [3, 'three'],
    ])
  })

  it('clones the values deeply', () => {
    const original = new Map([['user', { name: 'Ada', tags: ['x'] }]])
    const clone = deepClone(original)

    expect(clone.get('user')).toEqual({ name: 'Ada', tags: ['x'] })
    expect(clone.get('user')).not.toBe(original.get('user'))
    expect(clone.get('user').tags).not.toBe(original.get('user').tags)
  })

  it('clones object keys too', () => {
    const key = { id: 1 }
    const original = new Map([[key, 'value']])
    const clone = deepClone(original)

    const [clonedKey] = [...clone.keys()]
    expect(clonedKey).toEqual({ id: 1 })
    expect(clonedKey).not.toBe(key)
    expect(clone.get(key)).toBeUndefined()
    expect(clone.get(clonedKey)).toBe('value')
  })

  it('does not share state with the original Map', () => {
    const original = new Map([['a', { n: 1 }]])
    const clone = deepClone(original)

    clone.set('b', 2)
    clone.get('a').n = 99

    expect(original.size).toBe(1)
    expect(original.get('a')).toEqual({ n: 1 })
  })

  it('handles an empty Map and nested Maps', () => {
    const inner = new Map([['x', new Map([['y', 1]])]])
    const clone = deepClone({ empty: new Map(), inner })

    expect(clone.empty).toBeInstanceOf(Map)
    expect(clone.empty.size).toBe(0)
    expect(clone.inner.get('x')).toBeInstanceOf(Map)
    expect(clone.inner.get('x')).not.toBe(inner.get('x'))
    expect(clone.inner.get('x').get('y')).toBe(1)
  })
})

describe('05 deepClone: Set', () => {
  it('creates a new Set with the same values in the same order', () => {
    const original = new Set([3, 1, 'two'])
    const clone = deepClone(original)

    expect(clone).toBeInstanceOf(Set)
    expect(clone).not.toBe(original)
    expect([...clone]).toEqual([3, 1, 'two'])
  })

  it('clones object values deeply', () => {
    const member = { name: 'Ada', roles: ['admin'] }
    const original = new Set([member, 5])
    const clone = deepClone(original)

    const [clonedMember] = [...clone]
    expect(clonedMember).toEqual({ name: 'Ada', roles: ['admin'] })
    expect(clonedMember).not.toBe(member)
    expect(clonedMember.roles).not.toBe(member.roles)
    expect(clone.has(member)).toBe(false)
    expect(clone.has(5)).toBe(true)
    expect(clone.size).toBe(2)
  })

  it('does not share state with the original Set', () => {
    const original = new Set([1, 2])
    const clone = deepClone(original)

    clone.add(3)
    clone.delete(1)

    expect([...original]).toEqual([1, 2])
  })

  it('handles an empty Set and a Set inside a Map', () => {
    const clone = deepClone({ empty: new Set(), map: new Map([['s', new Set([{ a: 1 }])]]) })

    expect(clone.empty).toBeInstanceOf(Set)
    expect(clone.empty.size).toBe(0)
    expect([...clone.map.get('s')]).toEqual([{ a: 1 }])
  })
})

describe('05 deepClone: circular references', () => {
  it('copies an object that points to itself', () => {
    const original = { name: 'loop' }
    original.self = original
    const clone = deepClone(original)

    expect(clone).not.toBe(original)
    expect(clone.name).toBe('loop')
    expect(clone.self).toBe(clone) // same cycle shape
    expect(clone.self).not.toBe(original)
  })

  it('copies a parent and child that point to each other', () => {
    const parent = { name: 'parent', children: [] }
    const child = { name: 'child', parent }
    parent.children.push(child)

    const clone = deepClone(parent)

    expect(clone).not.toBe(parent)
    expect(clone.children[0]).not.toBe(child)
    expect(clone.children[0].parent).toBe(clone)
    expect(clone.children).toHaveLength(1)
  })

  it('copies two objects that reference each other', () => {
    const a = { name: 'a' }
    const b = { name: 'b', a }
    a.b = b

    const clone = deepClone(a)

    expect(clone.b.a).toBe(clone)
    expect(clone.b).not.toBe(b)
    expect(clone.b.name).toBe('b')
  })

  it('copies an array that contains itself', () => {
    const original = [1, 2]
    original.push(original)
    const clone = deepClone(original)

    expect(Array.isArray(clone)).toBe(true)
    expect(clone).toHaveLength(3)
    expect(clone[2]).toBe(clone)
    expect(clone).not.toBe(original)
  })

  it('copies a Map that contains itself', () => {
    const original = new Map()
    original.set('self', original)
    const clone = deepClone(original)

    expect(clone).not.toBe(original)
    expect(clone.get('self')).toBe(clone)
  })

  it('copies a Set that contains itself', () => {
    const original = new Set()
    original.add(original)
    const clone = deepClone(original)

    expect(clone).not.toBe(original)
    expect(clone.size).toBe(1)
    expect(clone.has(clone)).toBe(true)
    expect(clone.has(original)).toBe(false)
  })

  it('copies a cycle that runs through a Map value deep inside the structure', () => {
    const root = { registry: new Map() }
    root.registry.set('root', root)
    const clone = deepClone(root)

    expect(clone.registry.get('root')).toBe(clone)
    expect(clone.registry).not.toBe(root.registry)
  })

  it('copies a cycle that has symbol keys on it', () => {
    const link = Symbol('link')
    const original = {}
    original[link] = original
    const clone = deepClone(original)

    expect(clone[link]).toBe(clone)
  })
})

describe('05 deepClone: shared references', () => {
  it('clones an object used twice only once', () => {
    const shared = { n: 1 }
    const original = { a: shared, b: shared }
    const clone = deepClone(original)

    expect(clone.a).toBe(clone.b)
    expect(clone.a).not.toBe(shared)
    expect(clone.a).toEqual({ n: 1 })
  })

  it('keeps sharing between an object property and an array item', () => {
    const shared = { n: 1 }
    const original = { main: shared, list: [shared, shared] }
    const clone = deepClone(original)

    expect(clone.list[0]).toBe(clone.list[1])
    expect(clone.list[0]).toBe(clone.main)
    expect(clone.main).not.toBe(shared)
  })

  it('a change made through one path is visible through the other, as in the original', () => {
    const shared = { count: 0 }
    const clone = deepClone({ a: shared, b: shared })

    clone.a.count = 5

    expect(clone.b.count).toBe(5)
    expect(shared.count).toBe(0)
  })

  it('keeps sharing in a diamond shape', () => {
    const bottom = { id: 'bottom' }
    const original = { left: { bottom }, right: { bottom } }
    const clone = deepClone(original)

    expect(clone.left).not.toBe(clone.right)
    expect(clone.left.bottom).toBe(clone.right.bottom)
    expect(clone.left.bottom).not.toBe(bottom)
  })

  it('does not merge two different objects that only look the same', () => {
    const original = { a: { n: 1 }, b: { n: 1 } }
    const clone = deepClone(original)

    expect(clone.a).toEqual(clone.b)
    expect(clone.a).not.toBe(clone.b)
  })

  it('keeps a shared Date, Map, Set and RegExp shared', () => {
    const when = new Date(0)
    const table = new Map([['k', 1]])
    const members = new Set([1])
    const pattern = /x/g
    const original = {
      first: { when, table, members, pattern },
      second: { when, table, members, pattern },
    }
    const clone = deepClone(original)

    expect(clone.first.when).toBe(clone.second.when)
    expect(clone.first.table).toBe(clone.second.table)
    expect(clone.first.members).toBe(clone.second.members)
    expect(clone.first.pattern).toBe(clone.second.pattern)
    expect(clone.first.when).not.toBe(when)
    expect(clone.first.table).not.toBe(table)
  })

  it('keeps an object that is both a Map key and a property shared', () => {
    const key = { id: 1 }
    const original = { key, map: new Map([[key, 'value']]) }
    const clone = deepClone(original)

    const [clonedKey] = [...clone.map.keys()]
    expect(clonedKey).toBe(clone.key)
    expect(clonedKey).not.toBe(key)
    expect(clone.map.get(clone.key)).toBe('value')
  })

  it('keeps an object that is both a Set member and a property shared', () => {
    const member = { id: 1 }
    const original = { member, set: new Set([member]) }
    const clone = deepClone(original)

    expect(clone.set.has(clone.member)).toBe(true)
    expect(clone.member).not.toBe(member)
  })

  it('clones a structure with about a million paths in linear time (20 shared levels)', () => {
    // Each level points to the level below TWICE: 2^20 paths, but only 21 objects.
    let node = { leaf: true }
    for (let level = 0; level < 20; level++) {
      node = { left: node, right: node }
    }
    const clone = deepClone(node)

    // Walk the clone iteratively and count the distinct objects.
    const distinct = new Set()
    const pending = [clone]
    while (pending.length > 0) {
      const current = pending.pop()
      if (distinct.has(current)) continue
      distinct.add(current)
      if (!current.leaf) {
        expect(current.left).toBe(current.right)
        pending.push(current.left, current.right)
      }
    }

    expect(distinct.size).toBe(21)
    expect(distinct.has(node)).toBe(false)
  })
})

describe('05 deepClone: a realistic mixed structure', () => {
  const format = (n) => `#${n}`
  const brand = Symbol('brand')

  const makeOriginal = () => ({
    id: 7,
    title: 'Report',
    format,
    missing: undefined,
    createdAt: new Date('2026-01-02T03:04:05.000Z'),
    matcher: /^r(\d+)$/i,
    tags: new Set(['a', 'b']),
    scores: new Map([['ada', [1, 2, 3]]]),
    items: [{ id: 1, meta: { done: false } }, { id: 2, meta: { done: true } }],
    [brand]: { owner: 'ada' },
  })

  it('produces a structure that is deeply equal to the original', () => {
    const original = makeOriginal()
    const clone = deepClone(original)

    expect(clone).toStrictEqual(makeOriginal())
    expect(clone.format).toBe(format)
    expect(clone[brand]).toEqual({ owner: 'ada' })
  })

  it('leaves the original untouched, even after the clone was changed deeply', () => {
    const original = makeOriginal()
    const clone = deepClone(original)

    clone.items[0].meta.done = true
    clone.scores.get('ada').push(4)
    clone.tags.add('c')
    clone.createdAt.setUTCFullYear(1999)
    clone[brand].owner = 'grace'

    expect(original).toStrictEqual(makeOriginal())
  })

  it('shares no object with the original (only functions and symbols are shared)', () => {
    const original = makeOriginal()
    const clone = deepClone(original)

    // Collect every object reachable from `value` into a Set.
    const collect = (value, found = new Set()) => {
      if (value === null || typeof value !== 'object' || found.has(value)) return found
      found.add(value)
      if (value instanceof Map) {
        value.forEach((v, k) => {
          collect(k, found)
          collect(v, found)
        })
      } else if (value instanceof Set) {
        value.forEach((v) => collect(v, found))
      } else {
        Reflect.ownKeys(value).forEach((key) => collect(value[key], found))
      }
      return found
    }

    const originalObjects = collect(original)
    const cloneObjects = collect(clone)

    expect(cloneObjects.size).toBe(originalObjects.size)
    expect([...cloneObjects].some((object) => originalObjects.has(object))).toBe(false)
  })
})

describe('05 deepClone: the rules', () => {
  it('does not use JSON.stringify or structuredClone', () => {
    const sample = {
      list: [1, { a: 2 }],
      when: new Date(0),
      map: new Map([['k', { v: 1 }]]),
      fn() {},
    }
    const targets = [[JSON, 'stringify']]
    if (typeof globalThis.structuredClone === 'function') {
      targets.push([globalThis, 'structuredClone'])
    }

    const calls = countCalls(targets, () => deepClone(sample))

    expect(calls).toEqual(targets.map(() => 0))
  })

  it('does not run into a stack overflow or an endless loop on circular input', () => {
    const a = { name: 'a', list: [] }
    const b = { name: 'b', a }
    a.b = b
    a.list.push(a, b, a.list)

    expect(() => deepClone(a)).not.toThrow()
  })
})
