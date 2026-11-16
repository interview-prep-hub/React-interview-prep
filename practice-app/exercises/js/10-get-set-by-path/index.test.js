import { get, has, set, setIn, unset } from './index.js'

// Safety net: if a faulty solution pollutes or damages Object.prototype, undo it
// here so that one bug does not break every other test in this file.
const originalToString = Object.prototype.toString

afterEach(() => {
  delete Object.prototype.polluted
  delete Object.prototype.toString.polluted
  if (Object.prototype.toString !== originalToString) {
    Object.defineProperty(Object.prototype, 'toString', {
      value: originalToString,
      writable: true,
      configurable: true,
      enumerable: false,
    })
  }
})

// Freezing makes every accidental write throw a TypeError (these files are ES modules).
function deepFreeze(value) {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

describe('10 get: reading a value', () => {
  const data = {
    user: { name: 'Ada', address: { city: 'London' }, emails: ['ada@a.com', 'ada@b.com'] },
    matrix: [[1, 2], [3, 4]],
    items: [{ id: 1, tags: ['x'] }, { id: 2, tags: [] }],
  }

  it('reads top-level and nested values with a string path', () => {
    expect(get(data, 'user')).toBe(data.user)
    expect(get(data, 'user.name')).toBe('Ada')
    expect(get(data, 'user.address.city')).toBe('London')
  })

  it('reads array elements with bracket notation', () => {
    expect(get(data, 'user.emails[1]')).toBe('ada@b.com')
    expect(get(data, 'items[0].tags[0]')).toBe('x')
    expect(get(data, 'matrix[1][0]')).toBe(3)
  })

  it('accepts a string path that starts with a bracket when the root is an array', () => {
    expect(get(data.items, '[1].id')).toBe(2)
    expect(get([10, 20, 30], '[2]')).toBe(30)
  })

  it('accepts an array path with strings and numbers', () => {
    expect(get(data, ['user', 'emails', 0])).toBe('ada@a.com')
    expect(get(data, ['items', 1, 'id'])).toBe(2)
    expect(get(data, ['items', '1', 'id'])).toBe(2)
    expect(get([10, 20, 30], [1])).toBe(20)
  })

  it('gives the same answer for the string form and the array form', () => {
    expect(get(data, 'items[0].tags[0]')).toBe('x')
    expect(get(data, ['items', 0, 'tags', 0])).toBe('x')
    expect(get(data, 'user.address.city')).toBe('London')
    expect(get(data, ['user', 'address', 'city'])).toBe('London')
  })

  it('splits a string path at dots, but uses an array path key exactly as written', () => {
    const odd = { 'a.b': 'literal', a: { b: 'nested' } }
    expect(get(odd, 'a.b')).toBe('nested')
    expect(get(odd, ['a.b'])).toBe('literal')
    expect(get({ 'a.b': 'only literal' }, 'a.b')).toBeUndefined()
  })

  it('returns the very same nested object, not a copy', () => {
    expect(get(data, 'user.address')).toBe(data.user.address)
    expect(get(data, 'items[1].tags')).toBe(data.items[1].tags)
  })

  it('returns undefined for a missing path when no default is given', () => {
    expect(get(data, 'user.phone')).toBeUndefined()
    expect(get(data, 'nope.a.b')).toBeUndefined()
  })

  it('returns the default for a missing key, a missing index, or a path that goes too deep', () => {
    expect(get(data, 'user.phone', 'n/a')).toBe('n/a')
    expect(get(data, 'items[5].id', 'n/a')).toBe('n/a')
    expect(get(data, 'nope.a.b', 'n/a')).toBe('n/a')
    expect(get(data, 'user.name.first', 'n/a')).toBe('n/a')
  })

  it('returns the default when the stored value is undefined', () => {
    expect(get({ a: undefined }, 'a', 'fallback')).toBe('fallback')
  })

  it('returns null (not the default) when the stored value is null', () => {
    expect(get({ a: null }, 'a', 'fallback')).toBeNull()
  })

  it.each([
    ['zero', 0],
    ['an empty string', ''],
    ['false', false],
    ['NaN', NaN],
  ])('returns %s (not the default) when that is the stored value', (_name, stored) => {
    expect(get({ v: stored }, 'v', 'fallback')).toBe(stored)
  })

  it('returns the default when a value on the way is null or undefined', () => {
    expect(get({ a: null }, 'a.b', 'fallback')).toBe('fallback')
    expect(get({ a: undefined }, 'a.b.c', 'fallback')).toBe('fallback')
  })

  it('returns the default when the object itself is null or undefined', () => {
    expect(get(null, 'a', 'fallback')).toBe('fallback')
    expect(get(undefined, 'a.b', 'fallback')).toBe('fallback')
    expect(get(undefined, ['a'])).toBeUndefined()
  })

  it('can return a falsy default', () => {
    expect(get({}, 'a', 0)).toBe(0)
    expect(get({}, 'a', null)).toBeNull()
    expect(get({}, 'a', false)).toBe(false)
  })

  it('returns the default for an empty path', () => {
    expect(get(data, '', 'fallback')).toBe('fallback')
    expect(get(data, [], 'fallback')).toBe('fallback')
  })

  it('does not change the path array it receives', () => {
    const path = ['user', 'address', 'city']
    expect(get(data, path)).toBe('London')
    expect(path).toEqual(['user', 'address', 'city'])
  })
})

describe('10 has: checking that a path exists', () => {
  const data = { user: { name: 'Ada', emails: ['a@x.com'] }, flag: false, nothing: null, count: 0 }

  it('is true for existing paths, in string and array form', () => {
    expect(has(data, 'user')).toBe(true)
    expect(has(data, 'user.name')).toBe(true)
    expect(has(data, 'user.emails[0]')).toBe(true)
    expect(has(data, ['user', 'emails', 0])).toBe(true)
  })

  it('is false for missing keys, also deep in the path', () => {
    expect(has(data, 'age')).toBe(false)
    expect(has(data, 'user.age')).toBe(false)
    expect(has(data, 'user.emails[1]')).toBe(false)
    expect(has(data, 'nope.a.b')).toBe(false)
    expect(has(data, ['user', 'emails', 1])).toBe(false)
  })

  it('is true when the key exists but the value is undefined, null, 0 or false', () => {
    expect(has({ a: undefined }, 'a')).toBe(true)
    expect(has(data, 'nothing')).toBe(true)
    expect(has(data, 'count')).toBe(true)
    expect(has(data, 'flag')).toBe(true)
  })

  it('tells apart what get cannot: an undefined value versus a missing key', () => {
    const obj = { present: undefined }
    expect(get(obj, 'present', 'fallback')).toBe('fallback')
    expect(get(obj, 'absent', 'fallback')).toBe('fallback')
    expect(has(obj, 'present')).toBe(true)
    expect(has(obj, 'absent')).toBe(false)
  })

  it('is false when a value on the way is null or a primitive without that key', () => {
    expect(has({ a: null }, 'a.b')).toBe(false)
    expect(has({ a: 5 }, 'a.b')).toBe(false)
    expect(has({ a: undefined }, 'a.b')).toBe(false)
  })

  it('works with an array as the root', () => {
    expect(has([1, 2], 0)).toBe(true)
    expect(has([1, 2], '[1]')).toBe(true)
    expect(has([1, 2], '[2]')).toBe(false)
  })

  it('counts only own properties, never inherited ones', () => {
    expect(has({}, 'toString')).toBe(false)
    expect(has({}, 'constructor')).toBe(false)
    expect(has({}, '__proto__')).toBe(false)
    expect(has({ a: {} }, 'a.toString')).toBe(false)
  })

  it('is false for a null or undefined object and for an empty path', () => {
    expect(has(null, 'a')).toBe(false)
    expect(has(undefined, 'a')).toBe(false)
    expect(has(data, '')).toBe(false)
    expect(has(data, [])).toBe(false)
  })

  it('does not change the path array it receives', () => {
    const path = ['user', 'name']
    expect(has(data, path)).toBe(true)
    expect(path).toEqual(['user', 'name'])
  })
})

describe('10 set: changing an object in place', () => {
  it('sets a top-level value and overwrites an existing nested value', () => {
    const obj = { a: 1, b: { c: 2 } }
    set(obj, 'a', 10)
    set(obj, 'b.c', 20)
    expect(obj).toEqual({ a: 10, b: { c: 20 } })
  })

  it('mutates the object it receives and returns that same object', () => {
    const obj = {}
    const result = set(obj, 'a', 1)
    expect(result).toBe(obj)
    expect(obj).toEqual({ a: 1 })
  })

  it('keeps the existing nested objects (same identity) and the other keys', () => {
    const obj = { user: { name: 'Ada', address: { city: 'London' } }, other: 1 }
    const user = obj.user
    const address = obj.user.address
    set(obj, 'user.address.city', 'Paris')
    expect(obj.user).toBe(user)
    expect(obj.user.address).toBe(address)
    expect(obj).toEqual({ user: { name: 'Ada', address: { city: 'Paris' } }, other: 1 })
  })

  it('creates the missing objects along the way', () => {
    expect(set({}, 'a.b.c', 1)).toEqual({ a: { b: { c: 1 } } })
    expect(set({ a: { x: 1 } }, 'a.b.c', 2)).toEqual({ a: { x: 1, b: { c: 2 } } })
  })

  it('creates an array when the next key is a bracket index', () => {
    const obj = set({}, 'list[0]', 'x')
    expect(Array.isArray(obj.list)).toBe(true)
    expect(obj).toEqual({ list: ['x'] })
  })

  it('creates arrays and objects in the right places for a mixed path', () => {
    const obj = set({}, 'a.b[0].c', 1)
    expect(obj).toEqual({ a: { b: [{ c: 1 }] } })
    expect(Array.isArray(obj.a.b)).toBe(true)
    expect(Array.isArray(obj.a)).toBe(false)
    expect(Array.isArray(obj.a.b[0])).toBe(false)

    const grid = set({}, 'rows[1][2]', 'x')
    expect(Array.isArray(grid.rows)).toBe(true)
    expect(Array.isArray(grid.rows[1])).toBe(true)
    expect(grid.rows[1]).toHaveLength(3)
    expect(grid.rows[1][2]).toBe('x')
  })

  it('treats a number (or a string of digits) in an array path as an index', () => {
    expect(set({}, ['a', 0, 'b'], 1)).toEqual({ a: [{ b: 1 }] })
    const fromDigits = set({}, ['a', '0'], 'x')
    expect(Array.isArray(fromDigits.a)).toBe(true)
    expect(fromDigits.a[0]).toBe('x')
  })

  it('creates an object, not an array, when the next key is not a non-negative integer', () => {
    const named = set({}, 'a.b', 1)
    expect(Array.isArray(named.a)).toBe(false)

    const negative = set({}, ['a', -1], 'x')
    expect(negative).toEqual({ a: { '-1': 'x' } })
    expect(Array.isArray(negative.a)).toBe(false)

    const fraction = set({}, ['a', 1.5], 'x')
    expect(fraction).toEqual({ a: { '1.5': 'x' } })
    expect(Array.isArray(fraction.a)).toBe(false)
  })

  it('uses an array path key exactly as written, even with dots in it', () => {
    expect(set({}, ['a.b'], 1)).toEqual({ 'a.b': 1 })
    expect(set({}, 'a.b', 1)).toEqual({ a: { b: 1 } })
  })

  it('stores the new value as it is, without copying it', () => {
    const value = { k: 1 }
    const obj = set({}, 'a.b', value)
    expect(obj).toEqual({ a: { b: { k: 1 } } })
    expect(obj.a.b).toBe(value)
  })

  it('sets array elements, also beyond the current end', () => {
    const obj = { list: [1, 2, 3] }
    set(obj, 'list[1]', 9)
    expect(obj.list).toEqual([1, 9, 3])

    const empty = { list: [] }
    set(empty, 'list[2]', 'x')
    expect(empty.list).toHaveLength(3)
    expect(empty.list[2]).toBe('x')
  })

  it('works when the root is an array', () => {
    const arr = [{ id: 1 }]
    set(arr, '[0].id', 5)
    set(arr, '[1].id', 6)
    expect(arr).toEqual([{ id: 5 }, { id: 6 }])
  })

  it('replaces a null, undefined or primitive value on the way with a new container', () => {
    expect(set({ a: null }, 'a.b', 1)).toEqual({ a: { b: 1 } })
    expect(set({ a: undefined }, 'a.b', 1)).toEqual({ a: { b: 1 } })
    expect(set({ a: 5 }, 'a.b', 1)).toEqual({ a: { b: 1 } })

    const text = set({ a: 'text' }, 'a[0]', 'x')
    expect(Array.isArray(text.a)).toBe(true)
    expect(text.a).toEqual(['x'])
  })

  it('can replace a whole branch at the end of the path', () => {
    expect(set({ a: { b: 1 } }, 'a', 5)).toEqual({ a: 5 })
  })

  it('can store undefined, null and other falsy values (the key then exists)', () => {
    const obj = {}
    set(obj, 'a', undefined)
    set(obj, 'b.c', null)
    set(obj, 'd', 0)
    expect(has(obj, 'a')).toBe(true)
    expect(obj.b.c).toBeNull()
    expect(obj.d).toBe(0)
  })

  it('does not change the path array it receives', () => {
    const path = ['a', 'b', 0, 'c']
    expect(set({}, path, 1)).toEqual({ a: { b: [{ c: 1 }] } })
    expect(path).toEqual(['a', 'b', 0, 'c'])
  })
})

describe('10 set: invalid input', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a number', 5],
    ['a string', 'text'],
    ['a boolean', true],
  ])('throws a TypeError when the target is %s', (_name, target) => {
    expect(() => set(target, 'a', 1)).toThrow(TypeError)
  })

  it('throws a TypeError for an empty path, as a string or as an array', () => {
    const obj = { a: 1 }
    expect(() => set(obj, '', 1)).toThrow(TypeError)
    expect(() => set(obj, [], 1)).toThrow(TypeError)
    expect(obj).toEqual({ a: 1 })
  })
})

describe('10 setIn: immutable update with structural sharing', () => {
  const makeState = () =>
    deepFreeze({
      user: {
        name: 'Ada',
        profile: { bio: 'maths' },
        address: { city: 'London', zip: 'N1' },
      },
      settings: { theme: 'dark' },
      tags: ['a', 'b'],
      todos: [
        { id: 1, done: false },
        { id: 2, done: false },
        { id: 3, done: true },
      ],
    })

  it('returns a new object with the change and leaves the original untouched', () => {
    const state = makeState() // frozen: any write to it would throw
    const next = setIn(state, 'user.address.city', 'Paris')
    expect(next).not.toBe(state)
    expect(next.user.address.city).toBe('Paris')
    expect(state.user.address.city).toBe('London')
  })

  it('copies every object on the way down to the change', () => {
    const state = makeState()
    const next = setIn(state, 'user.address.city', 'Paris')
    expect(next).not.toBe(state)
    expect(next.user).not.toBe(state.user)
    expect(next.user.address).not.toBe(state.user.address)
  })

  it('keeps the identity of every branch that is not on the path', () => {
    const state = makeState()
    const next = setIn(state, 'user.address.city', 'Paris')
    expect(next.user.address.city).toBe('Paris')
    expect(next.settings).toBe(state.settings)
    expect(next.tags).toBe(state.tags)
    expect(next.todos).toBe(state.todos)
  })

  it('keeps the identity of siblings inside a copied object', () => {
    const state = makeState()
    const next = setIn(state, 'user.address.city', 'Paris')
    expect(next.user).not.toBe(state.user)
    expect(next.user.profile).toBe(state.user.profile)
    expect(next.user.name).toBe('Ada')
    expect(next.user.address.zip).toBe('N1')
  })

  it('updates one array element and shares all the other elements', () => {
    const state = makeState()
    const next = setIn(state, 'todos[1].done', true)
    expect(Array.isArray(next.todos)).toBe(true)
    expect(next.todos).not.toBe(state.todos)
    expect(next.todos[1]).not.toBe(state.todos[1])
    expect(next.todos[0]).toBe(state.todos[0])
    expect(next.todos[2]).toBe(state.todos[2])
    expect(next.todos[1]).toEqual({ id: 2, done: true })
    expect(state.todos[1].done).toBe(false)
  })

  it('accepts an array path', () => {
    const state = makeState()
    const next = setIn(state, ['todos', 0, 'done'], true)
    expect(next.todos[0]).toEqual({ id: 1, done: true })
    expect(next.todos[1]).toBe(state.todos[1])
  })

  it('replaces a value at the top level and adds a new key', () => {
    const state = deepFreeze({ a: 1, nested: { x: 1 } })
    const replaced = setIn(state, 'a', 2)
    const added = setIn(state, 'b', 3)
    expect(replaced).toEqual({ a: 2, nested: { x: 1 } })
    expect(replaced.nested).toBe(state.nested)
    expect(added).toEqual({ a: 1, nested: { x: 1 }, b: 3 })
    expect(state).toEqual({ a: 1, nested: { x: 1 } })
  })

  it('creates the missing containers (arrays for indexes, objects otherwise)', () => {
    const state = deepFreeze({ keep: { x: 1 } })
    const next = setIn(state, 'a.b[0].c', 1)
    expect(next).toEqual({ keep: { x: 1 }, a: { b: [{ c: 1 }] } })
    expect(Array.isArray(next.a.b)).toBe(true)
    expect(Array.isArray(next.a)).toBe(false)
    expect(next.keep).toBe(state.keep)
    expect(state).toEqual({ keep: { x: 1 } })
  })

  it('replaces a null or primitive value on the way with a new container', () => {
    expect(setIn({ a: null }, 'a.b', 1)).toEqual({ a: { b: 1 } })
    expect(setIn({ a: 5 }, 'a.b', 1)).toEqual({ a: { b: 1 } })
  })

  it('works when the root is an array', () => {
    const list = deepFreeze([{ id: 1 }, { id: 2 }])
    const next = setIn(list, '[1].id', 9)
    expect(Array.isArray(next)).toBe(true)
    expect(next).not.toBe(list)
    expect(next[0]).toBe(list[0])
    expect(next[1]).toEqual({ id: 9 })
    expect(list[1]).toEqual({ id: 2 })
  })

  it('keeps older versions intact when updates are chained', () => {
    const base = deepFreeze({ a: {} })
    const v1 = setIn(base, 'a.x', 1)
    const v2 = setIn(v1, 'a.y', 2)
    expect(base).toEqual({ a: {} })
    expect(v1).toEqual({ a: { x: 1 } })
    expect(v2).toEqual({ a: { x: 1, y: 2 } })
  })

  it('stores the new value as it is, without copying it', () => {
    const value = { k: 1 }
    expect(setIn({}, 'a', value).a).toBe(value)
  })

  it('can store undefined (the key then exists)', () => {
    const next = setIn({ a: 1 }, 'a', undefined)
    expect(has(next, 'a')).toBe(true)
    expect(next.a).toBeUndefined()
  })

  it('does not change the path array it receives', () => {
    const path = ['a', 'b', 0]
    expect(setIn({}, path, 1)).toEqual({ a: { b: [1] } })
    expect(path).toEqual(['a', 'b', 0])
  })

  it('throws a TypeError for a target that is not an object or an array', () => {
    expect(() => setIn(null, 'a', 1)).toThrow(TypeError)
    expect(() => setIn(undefined, 'a', 1)).toThrow(TypeError)
    expect(() => setIn(5, 'a', 1)).toThrow(TypeError)
    expect(() => setIn('text', 'a', 1)).toThrow(TypeError)
  })

  it('throws a TypeError for an empty path, as a string or as an array', () => {
    const state = deepFreeze({ a: 1 })
    expect(() => setIn(state, '', 1)).toThrow(TypeError)
    expect(() => setIn(state, [], 1)).toThrow(TypeError)
  })
})

describe('10 unset: deleting a path', () => {
  it('removes an existing key and returns true', () => {
    const obj = { a: { b: 1, c: 2 } }
    expect(unset(obj, 'a.b')).toBe(true)
    expect(obj).toEqual({ a: { c: 2 } })
    expect('b' in obj.a).toBe(false)
  })

  it('removes a top-level key', () => {
    const obj = { a: 1, b: 2 }
    expect(unset(obj, 'a')).toBe(true)
    expect(obj).toEqual({ b: 2 })
  })

  it('accepts bracket and array paths', () => {
    const obj = { list: [{ id: 1, name: 'x' }, { id: 2, name: 'y' }] }
    expect(unset(obj, 'list[0].id')).toBe(true)
    expect(unset(obj, ['list', 1, 'name'])).toBe(true)
    expect(obj).toEqual({ list: [{ name: 'x' }, { id: 2 }] })
  })

  it('removes a key whose value is undefined', () => {
    const obj = { a: undefined, b: 1 }
    expect(unset(obj, 'a')).toBe(true)
    expect('a' in obj).toBe(false)
  })

  it('returns false and changes nothing when the path does not exist', () => {
    const obj = { a: { b: 1 } }
    expect(unset(obj, 'a.c')).toBe(false)
    expect(unset(obj, 'x.y.z')).toBe(false)
    expect(unset(obj, 'a.b.c')).toBe(false)
    expect(obj).toEqual({ a: { b: 1 } })
  })

  it('does not create anything while looking for the path', () => {
    const obj = {}
    expect(unset(obj, 'a.b.c')).toBe(false)
    expect(obj).toEqual({})
    expect('a' in obj).toBe(false)
  })

  it('leaves a hole when it removes an array element (the length stays, like the delete operator)', () => {
    const obj = { list: [1, 2, 3] }
    expect(unset(obj, 'list[1]')).toBe(true)
    expect(obj.list).toHaveLength(3)
    expect(1 in obj.list).toBe(false)
    expect(obj.list[2]).toBe(3)
  })

  it('returns false for a null or undefined object and for an empty path', () => {
    expect(unset(null, 'a')).toBe(false)
    expect(unset(undefined, 'a')).toBe(false)
    const obj = { a: 1 }
    expect(unset(obj, '')).toBe(false)
    expect(unset(obj, [])).toBe(false)
    expect(obj).toEqual({ a: 1 })
  })

  it('ignores inherited properties and never touches Object.prototype', () => {
    const obj = {}
    expect(unset(obj, 'toString')).toBe(false)
    expect(unset(obj, '__proto__.toString')).toBe(false)
    expect(unset(obj, 'constructor.prototype.toString')).toBe(false)
    expect(typeof Object.prototype.toString).toBe('function')
    expect(typeof obj.toString).toBe('function')
  })

  it('does not change the path array it receives', () => {
    const path = ['a', 'b']
    expect(unset({ a: { b: 1 } }, path)).toBe(true)
    expect(path).toEqual(['a', 'b'])
  })
})

describe('10 prototype pollution guard (set and setIn)', () => {
  const unsafePaths = [
    ['a __proto__ key', '__proto__.polluted'],
    ['a nested __proto__ key', 'a.__proto__.polluted'],
    ['a __proto__ key in brackets', 'a[__proto__].polluted'],
    ['a __proto__ key in an array path', ['__proto__', 'polluted']],
    ['constructor.prototype', 'constructor.prototype.polluted'],
    ['a nested constructor.prototype in an array path', ['a', 'constructor', 'prototype', 'polluted']],
    ['a prototype key', 'prototype.polluted'],
  ]

  it.each(unsafePaths)('set throws a TypeError for %s and nothing is changed', (_name, path) => {
    const target = {}
    expect(() => set(target, path, true)).toThrow(TypeError)
    expect(Object.prototype.polluted).toBeUndefined()
    expect({}.polluted).toBeUndefined()
    // The check happens before any change: no half-built branch is left behind.
    expect(target).toEqual({})
  })

  it.each(unsafePaths)('setIn throws a TypeError for %s and nothing is changed', (_name, path) => {
    const target = deepFreeze({})
    expect(() => setIn(target, path, true)).toThrow(TypeError)
    expect(Object.prototype.polluted).toBeUndefined()
    expect({}.polluted).toBeUndefined()
    expect(target).toEqual({})
  })

  it('blocks only the exact unsafe keys, not names that merely contain them', () => {
    expect(set({}, 'my__proto__.x', 1)).toEqual({ my__proto__: { x: 1 } })
    expect(set({}, 'constructorName', 'x')).toEqual({ constructorName: 'x' })
    expect(setIn({}, 'prototypes.list[0]', 'x')).toEqual({ prototypes: { list: ['x'] } })
  })

  it('treats an inherited property such as toString as missing and shadows it', () => {
    // A path through "toString" must not reach the shared built-in function.
    expect(set({}, 'toString.polluted', true)).toEqual({ toString: { polluted: true } })
    expect(setIn({}, 'toString.polluted', true)).toEqual({ toString: { polluted: true } })
    expect(Object.prototype.toString.polluted).toBeUndefined()
    expect(typeof ({}).toString).toBe('function')
  })

  it('never writes into an object that is only inherited through the prototype chain', () => {
    const shared = { count: 0 }
    const child = Object.create({ shared })

    set(child, 'shared.count', 5)
    expect(shared.count).toBe(0) // the shared object is untouched
    expect(Object.hasOwn(child, 'shared')).toBe(true) // child got its own copy of the branch
    expect(child.shared).toEqual({ count: 5 })

    const other = Object.create({ shared })
    setIn(other, 'shared.count', 7)
    expect(shared.count).toBe(0)
  })
})

describe('10 working together', () => {
  it('set, has, get and unset agree with each other', () => {
    const obj = {}
    set(obj, 'settings.theme.colors[1]', 'blue')
    expect(has(obj, 'settings.theme.colors[1]')).toBe(true)
    expect(get(obj, ['settings', 'theme', 'colors', 1])).toBe('blue')
    expect(get(obj, 'settings.theme.colors[0]', 'none')).toBe('none')
    expect(unset(obj, 'settings.theme.colors[1]')).toBe(true)
    expect(has(obj, 'settings.theme.colors[1]')).toBe(false)
    expect(get(obj, 'settings.theme.colors[1]', 'gone')).toBe('gone')
  })

  it('setIn gives the same result as set on a copy of the data', () => {
    const base = { a: { list: [{ id: 1 }] } }
    const viaSet = set(structuredClone(base), 'a.list[0].name', 'x')
    const viaSetIn = setIn(deepFreeze(structuredClone(base)), 'a.list[0].name', 'x')
    expect(viaSet).toEqual({ a: { list: [{ id: 1, name: 'x' }] } })
    expect(viaSetIn).toEqual(viaSet)
  })
})
