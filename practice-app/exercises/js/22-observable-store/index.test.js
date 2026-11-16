import { createStore } from './index.js'

// Everything in this exercise is synchronous, so no timers are needed.

// Freezes an object and everything inside it. Writing to a frozen object
// throws in strict mode (ES modules are strict), so code that changes the
// state in place fails the test.
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

// Compares two plain objects one level deep (what Zustand calls "shallow").
function shallowEqual(a, b) {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  return (
    keysA.length === keysB.length &&
    keysA.every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]))
  )
}

describe('22 store: creating a store and reading the state', () => {
  it('starts with the initial state', () => {
    const store = createStore({ count: 0, name: 'Ada' })

    expect(store.getState()).toEqual({ count: 0, name: 'Ada' })
  })

  it('returns the very same object until the state changes', () => {
    const store = createStore({ count: 0 })

    expect(store.getState()).toEqual({ count: 0 })
    expect(store.getState()).toBe(store.getState())

    const before = store.getState()
    store.setState({ count: 1 })
    expect(store.getState()).not.toBe(before)
    expect(store.getState()).toBe(store.getState())
  })

  it('keeps stores independent of each other', () => {
    const a = createStore({ count: 1 })
    const b = createStore({ count: 1 })
    const listenerA = vi.fn()
    const listenerB = vi.fn()
    a.subscribe(listenerA)
    b.subscribe(listenerB)

    a.setState({ count: 2 })

    expect(a.getState()).toEqual({ count: 2 })
    expect(b.getState()).toEqual({ count: 1 })
    expect(listenerA).toHaveBeenCalledTimes(1)
    expect(listenerB).not.toHaveBeenCalled()
  })

  it.each([undefined, null, 42, 'text', true])(
    'throws a TypeError when the initial state is %s',
    (initialState) => {
      expect(() => createStore(initialState)).toThrow(TypeError)
    },
  )
})

describe('22 store: setState', () => {
  it('merges an object into the state and keeps the other keys', () => {
    const store = createStore({ count: 0, name: 'Ada' })

    store.setState({ count: 5 })
    expect(store.getState()).toEqual({ count: 5, name: 'Ada' })

    store.setState({ role: 'admin' })
    expect(store.getState()).toEqual({ count: 5, name: 'Ada', role: 'admin' })
  })

  it('merges shallowly: a nested object is replaced, not merged', () => {
    const store = createStore({ user: { name: 'Ada', age: 36 }, count: 0 })

    store.setState({ user: { name: 'Grace' } })

    expect(store.getState()).toEqual({ user: { name: 'Grace' }, count: 0 })
  })

  it('never changes the old state object, and shares nested objects', () => {
    const initial = deepFreeze({ count: 0, user: { name: 'Ada' } })
    const store = createStore(initial)

    store.setState({ count: 1 })

    expect(initial).toEqual({ count: 0, user: { name: 'Ada' } })
    expect(store.getState()).toEqual({ count: 1, user: { name: 'Ada' } })
    expect(store.getState()).not.toBe(initial)
    expect(store.getState().user).toBe(initial.user)
  })

  it('passes the current state to an updater function and merges its result', () => {
    const store = createStore({ count: 1, name: 'Ada' })
    const updater = vi.fn((state) => ({ count: state.count + 1 }))

    store.setState(updater)

    expect(updater).toHaveBeenCalledTimes(1)
    expect(updater.mock.calls[0]).toHaveLength(1)
    expect(updater.mock.calls[0][0]).toEqual({ count: 1, name: 'Ada' })
    expect(store.getState()).toEqual({ count: 2, name: 'Ada' })
  })

  it('gives every updater the latest state when updates follow each other', () => {
    const store = createStore({ count: 0 })

    store.setState((s) => ({ count: s.count + 1 }))
    store.setState((s) => ({ count: s.count + 1 }))
    store.setState((s) => ({ count: s.count + 1 }))

    expect(store.getState()).toEqual({ count: 3 })
  })

  it('replaces the whole state when replace is true', () => {
    const store = createStore({ a: 1, b: 2 })

    store.setState({ c: 3 }, true)
    expect(store.getState()).toEqual({ c: 3 })

    store.setState((s) => ({ d: Object.keys(s).length }), true)
    expect(store.getState()).toEqual({ d: 1 })
  })

  it('merges again when replace is false or left out', () => {
    const store = createStore({ a: 1 })

    store.setState({ b: 2 }, false)
    store.setState({ c: 3 })

    expect(store.getState()).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('does nothing when the new state is the very same object', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    store.subscribe(listener)
    const before = store.getState()

    store.setState((s) => s)
    store.setState(before)
    store.setState(before, true)
    expect(listener).not.toHaveBeenCalled()
    expect(store.getState()).toBe(before)

    store.setState({ count: 1 })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it.each([undefined, null, 42, 'text', true])(
    'throws a TypeError for %s and leaves the store untouched',
    (value) => {
      const store = createStore({ count: 0 })
      const listener = vi.fn()
      store.subscribe(listener)

      expect(() => store.setState(value)).toThrow(TypeError)
      expect(() => store.setState(value, true)).toThrow(TypeError)
      expect(() => store.setState(() => value)).toThrow(TypeError)

      expect(store.getState()).toEqual({ count: 0 })
      expect(listener).not.toHaveBeenCalled()

      store.setState({ count: 1 })
      expect(listener).toHaveBeenCalledTimes(1)
    },
  )

  it('lets an error from an updater through and changes nothing', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    store.subscribe(listener)

    expect(() =>
      store.setState(() => {
        throw new Error('bad updater')
      }),
    ).toThrow('bad updater')

    expect(store.getState()).toEqual({ count: 0 })
    expect(listener).not.toHaveBeenCalled()

    store.setState({ count: 1 })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('22 store: subscribe and notifications', () => {
  it('calls the listener after a change with the new state and the previous state', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    store.subscribe(listener)
    expect(listener).not.toHaveBeenCalled()

    const before = store.getState()
    store.setState({ count: 1 })

    expect(listener).toHaveBeenCalledTimes(1)
    const args = listener.mock.calls[0]
    expect(args).toHaveLength(2)
    expect(args[0]).toBe(store.getState())
    expect(args[0]).toEqual({ count: 1 })
    expect(args[1]).toBe(before)
    expect(args[1]).toEqual({ count: 0 })
  })

  it('calls the listener once per change', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    store.subscribe(listener)

    store.setState({ count: 1 })
    store.setState({ count: 2 })
    store.setState((s) => ({ count: s.count + 1 }))

    expect(listener).toHaveBeenCalledTimes(3)
    expect(listener.mock.calls[2][0]).toEqual({ count: 3 })
    expect(listener.mock.calls[2][1]).toEqual({ count: 2 })
  })

  it('notifies after a replace too', () => {
    const store = createStore({ a: 1 })
    const listener = vi.fn()
    store.subscribe(listener)

    store.setState({ b: 2 }, true)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0]).toEqual({ b: 2 })
    expect(listener.mock.calls[0][1]).toEqual({ a: 1 })
  })

  it('updates the state before it calls the listeners', () => {
    const store = createStore({ count: 0 })
    const seen = []
    store.subscribe((state) => seen.push(store.getState() === state, store.getState().count))

    store.setState({ count: 7 })

    expect(seen).toEqual([true, 7])
  })

  it('calls the listeners in the order they subscribed', () => {
    const store = createStore({ count: 0 })
    const calls = []
    store.subscribe(() => calls.push('first'))
    const unsubscribeSecond = store.subscribe(() => calls.push('second'))
    store.subscribe(() => calls.push('third'))

    store.setState({ count: 1 })
    expect(calls).toEqual(['first', 'second', 'third'])

    // A listener that subscribes again goes to the end of the line.
    unsubscribeSecond()
    store.subscribe(() => calls.push('second again'))
    calls.length = 0
    store.setState({ count: 2 })
    expect(calls).toEqual(['first', 'third', 'second again'])
  })

  it('stops calling a listener after unsubscribe, and unsubscribe can be called twice', () => {
    const store = createStore({ count: 0 })
    const stays = vi.fn()
    const leaves = vi.fn()
    store.subscribe(stays)
    const unsubscribe = store.subscribe(leaves)

    store.setState({ count: 1 })
    expect(leaves).toHaveBeenCalledTimes(1)

    unsubscribe()
    unsubscribe()
    store.setState({ count: 2 })

    expect(leaves).toHaveBeenCalledTimes(1)
    expect(stays).toHaveBeenCalledTimes(2)
  })

  it('treats the same function subscribed twice as two subscriptions', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    const unsubscribeFirst = store.subscribe(listener)
    store.subscribe(listener)

    store.setState({ count: 1 })
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribeFirst()
    store.setState({ count: 2 })
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it.each([undefined, null, 'listener', 42, {}])(
    'throws a TypeError when the listener is %s',
    (listener) => {
      const store = createStore({ count: 0 })

      expect(() => store.subscribe(listener)).toThrow(TypeError)
    },
  )
})

describe('22 store: selectors and equality', () => {
  it('calls the listener only when the selected slice changed', () => {
    const store = createStore({ count: 0, name: 'Ada' })
    const listener = vi.fn()
    store.subscribe(listener, (s) => s.count)

    store.setState({ name: 'Grace' })
    expect(listener).not.toHaveBeenCalled()

    store.setState({ count: 1 })
    expect(listener).toHaveBeenCalledTimes(1)

    store.setState({ name: 'Linus' })
    expect(listener).toHaveBeenCalledTimes(1)

    store.setState({ count: 2, name: 'Ada' })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('still gives the listener the whole state and the whole previous state', () => {
    const store = createStore({ count: 0, name: 'Ada' })
    const listener = vi.fn()
    store.subscribe(listener, (s) => s.count)

    store.setState({ count: 1 })

    expect(listener).toHaveBeenCalledWith({ count: 1, name: 'Ada' }, { count: 0, name: 'Ada' })
  })

  it('compares with the slice at the moment of subscribing', () => {
    const store = createStore({ count: 0 })
    store.setState({ count: 5 })
    const listener = vi.fn()
    store.subscribe(listener, (s) => s.count)

    store.setState({ count: 5 })
    expect(listener).not.toHaveBeenCalled()

    store.setState({ count: 6 })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('treats a merge that changes no value as a new state, but not as a new slice', () => {
    const store = createStore({ count: 1, name: 'Ada' })
    const wholeState = vi.fn()
    const countOnly = vi.fn()
    store.subscribe(wholeState)
    store.subscribe(countOnly, (s) => s.count)

    // A merge always builds a new state object, so the default selector (the
    // whole state) sees a change. The count did not change, so countOnly does not.
    store.setState({ count: 1 })

    expect(wholeState).toHaveBeenCalledTimes(1)
    expect(countOnly).not.toHaveBeenCalled()
  })

  it('works with a selector that computes a value', () => {
    const store = createStore({ items: ['a', 'b'], filter: '' })
    const listener = vi.fn()
    store.subscribe(listener, (s) => s.items.length)

    store.setState({ filter: 'x' })
    store.setState({ items: ['c', 'd'] })
    expect(listener).not.toHaveBeenCalled()

    store.setState((s) => ({ items: [...s.items, 'e'] }))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].items).toEqual(['c', 'd', 'e'])
  })

  it('uses Object.is by default, so a selector that builds a new object always counts as changed', () => {
    const store = createStore({ a: 1, b: 2, other: 0 })
    const listener = vi.fn()
    store.subscribe(listener, (s) => ({ a: s.a, b: s.b }))

    store.setState({ other: 1 })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('uses the equalityFn you pass to decide what counts as changed', () => {
    const store = createStore({ a: 1, b: 2, other: 0 })
    const listener = vi.fn()
    store.subscribe(listener, (s) => ({ a: s.a, b: s.b }), shallowEqual)

    store.setState({ other: 1 })
    expect(listener).not.toHaveBeenCalled()

    store.setState({ b: 3 })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0]).toEqual({ a: 1, b: 3, other: 1 })

    store.setState({ other: 2 })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('compares with the slice of the last notification, not with the previous state', () => {
    const store = createStore({ x: 0 })
    const listener = vi.fn()
    const closeEnough = (a, b) => Math.abs(a - b) < 5
    store.subscribe(listener, (s) => s.x, closeEnough)

    // 3 is close to 0: no call, and the reference value stays 0.
    store.setState({ x: 3 })
    expect(listener).not.toHaveBeenCalled()

    // 6 is far from 0 (even though it is close to 3): call.
    store.setState({ x: 6 })
    expect(listener).toHaveBeenCalledTimes(1)

    // The reference value is now 6, and 8 is close to it: no call.
    store.setState({ x: 8 })
    expect(listener).toHaveBeenCalledTimes(1)

    store.setState({ x: 20 })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('lets every subscription have its own selector', () => {
    const store = createStore({ count: 0, name: 'Ada' })
    const onCount = vi.fn()
    const onName = vi.fn()
    store.subscribe(onCount, (s) => s.count)
    store.subscribe(onName, (s) => s.name)

    store.setState({ count: 1 })
    expect(onCount).toHaveBeenCalledTimes(1)
    expect(onName).not.toHaveBeenCalled()

    store.setState({ name: 'Grace' })
    expect(onCount).toHaveBeenCalledTimes(1)
    expect(onName).toHaveBeenCalledTimes(1)
  })
})

describe('22 store: changes while the listeners are running', () => {
  it('keeps calling the other listeners when a listener unsubscribes itself', () => {
    const store = createStore({ count: 0 })
    const calls = []
    store.subscribe(() => calls.push('a'))
    const unsubscribeB = store.subscribe(() => {
      calls.push('b')
      unsubscribeB()
    })
    store.subscribe(() => calls.push('c'))
    store.subscribe(() => calls.push('d'))

    store.setState({ count: 1 })
    expect(calls).toEqual(['a', 'b', 'c', 'd'])

    calls.length = 0
    store.setState({ count: 2 })
    expect(calls).toEqual(['a', 'c', 'd'])
  })

  it('does not call a listener that an earlier listener unsubscribed in the same round', () => {
    const store = createStore({ count: 0 })
    const calls = []
    store.subscribe(() => {
      calls.push('a')
      unsubscribeC()
    })
    store.subscribe(() => calls.push('b'))
    const unsubscribeC = store.subscribe(() => calls.push('c'))
    store.subscribe(() => calls.push('d'))

    store.setState({ count: 1 })

    expect(calls).toEqual(['a', 'b', 'd'])
  })

  it('does not call a listener that subscribes during a round until the next change', () => {
    const store = createStore({ count: 0 })
    const late = vi.fn()
    let added = false
    store.subscribe(() => {
      if (!added) {
        added = true
        store.subscribe(late)
      }
    })

    store.setState({ count: 1 })
    expect(added).toBe(true)
    expect(late).not.toHaveBeenCalled()

    store.setState({ count: 2 })
    expect(late).toHaveBeenCalledTimes(1)
    expect(late.mock.calls[0][0]).toEqual({ count: 2 })
  })

  it('runs every listener even when one throws, then rethrows the first error', () => {
    const store = createStore({ count: 0 })
    const calls = []
    store.subscribe(() => calls.push('first'))
    store.subscribe(() => {
      calls.push('second')
      throw new Error('boom 1')
    })
    store.subscribe(() => calls.push('third'))
    store.subscribe(() => {
      calls.push('fourth')
      throw new Error('boom 2')
    })

    expect(() => store.setState({ count: 1 })).toThrow('boom 1')

    expect(calls).toEqual(['first', 'second', 'third', 'fourth'])
    expect(store.getState()).toEqual({ count: 1 })
  })

  it('gives every listener the newest state when a listener calls setState', () => {
    const store = createStore({ count: 0 })
    const seen = { a: [], b: [], c: [] }
    store.subscribe((s) => {
      seen.a.push(s.count)
      if (s.count === 1) store.setState({ count: 2 })
    })
    store.subscribe((s) => seen.b.push(s.count))
    store.subscribe((s) => seen.c.push(s.count))

    store.setState({ count: 1 })

    expect(store.getState()).toEqual({ count: 2 })
    expect(seen.a.at(-1)).toBe(2)
    expect(seen.b.at(-1)).toBe(2)
    expect(seen.c.at(-1)).toBe(2)
  })
})

describe('22 store: destroy', () => {
  it('removes every subscription', () => {
    const store = createStore({ count: 0 })
    const first = vi.fn()
    const second = vi.fn()
    store.subscribe(first)
    store.subscribe(second, (s) => s.count)

    store.setState({ count: 1 })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)

    store.destroy()
    store.setState({ count: 2 })

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('keeps the state readable and writable, and unsubscribe functions stay harmless', () => {
    const store = createStore({ count: 0 })
    const unsubscribe = store.subscribe(vi.fn())

    store.destroy()
    store.destroy()

    expect(() => unsubscribe()).not.toThrow()
    store.setState({ count: 5 })
    expect(store.getState()).toEqual({ count: 5 })

    // Subscribing again after destroy works as usual.
    const again = vi.fn()
    store.subscribe(again)
    store.setState({ count: 6 })
    expect(again).toHaveBeenCalledTimes(1)
  })

  it('stops the round when a listener destroys the store', () => {
    const store = createStore({ count: 0 })
    const calls = []
    store.subscribe(() => calls.push('a'))
    store.subscribe(() => {
      calls.push('b')
      store.destroy()
    })
    store.subscribe(() => calls.push('c'))

    store.setState({ count: 1 })

    expect(calls).toEqual(['a', 'b'])
  })
})
