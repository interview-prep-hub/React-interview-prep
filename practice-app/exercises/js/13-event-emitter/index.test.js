import { EventEmitter } from './index.js'

// Everything in this exercise is synchronous, so no timers are needed.

describe('13 EventEmitter: on and emit', () => {
  it('calls a listener with every argument given to emit', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()
    emitter.on('save', listener)

    emitter.emit('save', 1, 'two', { three: 3 })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(1, 'two', { three: 3 })
  })

  it('calls listeners in the order they were added', () => {
    const emitter = new EventEmitter()
    const calls = []
    emitter.on('go', () => calls.push('first'))
    emitter.on('go', () => calls.push('second'))
    emitter.on('go', () => calls.push('third'))

    emitter.emit('go')

    expect(calls).toEqual(['first', 'second', 'third'])
  })

  it('only calls the listeners of the event that was emitted', () => {
    const emitter = new EventEmitter()
    const onA = vi.fn()
    const onB = vi.fn()
    emitter.on('a', onA)
    emitter.on('b', onB)

    emitter.emit('a', 'payload')

    expect(onA).toHaveBeenCalledWith('payload')
    expect(onB).not.toHaveBeenCalled()
  })

  it('returns true when at least one listener ran and false when there was none', () => {
    const emitter = new EventEmitter()
    expect(emitter.emit('nobody')).toBe(false)

    const unsubscribe = emitter.on('someone', () => {})
    expect(emitter.emit('someone')).toBe(true)

    unsubscribe()
    expect(emitter.emit('someone')).toBe(false)
  })

  it('calls a listener that was added twice two times', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()
    emitter.on('ping', listener)
    emitter.on('ping', listener)

    emitter.emit('ping')

    expect(listener).toHaveBeenCalledTimes(2)
    expect(emitter.listenerCount('ping')).toBe(2)
  })

  it('accepts symbols as event names', () => {
    const emitter = new EventEmitter()
    const secret = Symbol('secret')
    const listener = vi.fn()
    emitter.on(secret, listener)

    expect(emitter.emit(secret, 42)).toBe(true)
    expect(listener).toHaveBeenCalledWith(42)
    expect(emitter.emit('secret')).toBe(false)

    // Another symbol with the same description is another event, and so is
    // the string that looks like the symbol.
    expect(emitter.emit(Symbol('secret'))).toBe(false)
    expect(emitter.emit('Symbol(secret)')).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it.each(['constructor', 'toString', 'hasOwnProperty', '__proto__', ''])(
    'accepts the string "%s" as an event name',
    (name) => {
      const emitter = new EventEmitter()
      const listener = vi.fn()

      // Nobody listens yet, so nothing may be found under this name.
      expect(emitter.listenerCount(name)).toBe(0)
      expect(emitter.emit(name)).toBe(false)

      const unsubscribe = emitter.on(name, listener)
      expect(emitter.listenerCount(name)).toBe(1)
      expect(emitter.emit(name, 'data')).toBe(true)
      expect(listener).toHaveBeenCalledWith('data')

      unsubscribe()
      expect(emitter.listenerCount(name)).toBe(0)
      expect(emitter.emit(name)).toBe(false)
    },
  )
})

describe('13 EventEmitter: unsubscribe and off', () => {
  it('on returns an unsubscribe function that stops the listener', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()
    const unsubscribe = emitter.on('tick', listener)
    expect(unsubscribe).toBeTypeOf('function')

    emitter.emit('tick')
    unsubscribe()
    emitter.emit('tick')

    expect(listener).toHaveBeenCalledTimes(1)
    expect(emitter.listenerCount('tick')).toBe(0)
  })

  it('calling an unsubscribe function twice is harmless and removes only its own registration', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()
    const unsubscribeFirst = emitter.on('tick', listener)
    emitter.on('tick', listener)
    expect(unsubscribeFirst).toBeTypeOf('function')

    unsubscribeFirst()
    unsubscribeFirst()

    expect(emitter.listenerCount('tick')).toBe(1)
    emitter.emit('tick')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['first', 0, ['g', 'f']],
    ['last', 2, ['f', 'g']],
  ])(
    'the unsubscribe function of the %s of three registrations removes exactly that registration',
    (_name, which, expectedOrder) => {
      const emitter = new EventEmitter()
      const calls = []
      const f = () => calls.push('f')
      const g = () => calls.push('g')
      const unsubscribers = [emitter.on('x', f), emitter.on('x', g), emitter.on('x', f)]

      unsubscribers[which]()
      emitter.emit('x')

      // The same function f is registered at the start and at the end.
      // Which of the two is gone shows in the order of the calls.
      expect(calls).toEqual(expectedOrder)
    },
  )

  it('off removes the given listener and leaves the others alone', () => {
    const emitter = new EventEmitter()
    const keep = vi.fn()
    const drop = vi.fn()
    emitter.on('x', keep)
    emitter.on('x', drop)

    emitter.off('x', drop)
    emitter.emit('x')

    expect(drop).not.toHaveBeenCalled()
    expect(keep).toHaveBeenCalledTimes(1)
  })

  it('off removes only one registration when the same listener was added twice', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()
    emitter.on('x', listener)
    emitter.on('x', listener)

    emitter.off('x', listener)
    expect(emitter.listenerCount('x')).toBe(1)

    emitter.emit('x')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('off does nothing for an unknown event or an unknown listener', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()
    emitter.on('known', listener)

    expect(() => emitter.off('unknown', listener)).not.toThrow()
    expect(() => emitter.off('known', () => {})).not.toThrow()

    emitter.emit('known')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(emitter.listenerCount('known')).toBe(1)
  })
})

describe('13 EventEmitter: once', () => {
  it('runs a once listener a single time', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()
    emitter.once('ready', listener)

    expect(emitter.emit('ready', 'a')).toBe(true)
    expect(emitter.emit('ready', 'b')).toBe(false)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith('a')
    expect(emitter.listenerCount('ready')).toBe(0)
  })

  it('keeps registration order when on and once are mixed', () => {
    const emitter = new EventEmitter()
    const calls = []
    emitter.on('mix', () => calls.push('on-1'))
    emitter.once('mix', () => calls.push('once-2'))
    emitter.on('mix', () => calls.push('on-3'))

    emitter.emit('mix')
    emitter.emit('mix')

    expect(calls).toEqual(['on-1', 'once-2', 'on-3', 'on-1', 'on-3'])
  })

  it('can be cancelled with the returned unsubscribe function before it ever runs', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()
    const unsubscribe = emitter.once('ready', listener)
    expect(unsubscribe).toBeTypeOf('function')

    unsubscribe()
    emitter.emit('ready')

    expect(listener).not.toHaveBeenCalled()
    expect(emitter.listenerCount('ready')).toBe(0)
  })

  it('can be removed with off by passing the original function', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()
    emitter.once('ready', listener)
    expect(emitter.listenerCount('ready')).toBe(1)

    emitter.off('ready', listener)
    emitter.emit('ready')

    expect(listener).not.toHaveBeenCalled()
    expect(emitter.listenerCount('ready')).toBe(0)
  })

  it('runs at most once even when a listener emits the same event again', () => {
    const emitter = new EventEmitter()
    const calls = []
    let nested = false
    emitter.on('x', () => {
      if (!nested) {
        nested = true
        emitter.emit('x')
      }
    })
    emitter.once('x', () => calls.push('once'))

    emitter.emit('x')

    expect(calls).toEqual(['once'])
  })
})

describe('13 EventEmitter: listenerCount and removeAllListeners', () => {
  it('counts on and once registrations, and gives 0 for an unknown event', () => {
    const emitter = new EventEmitter()
    expect(emitter.listenerCount('nothing')).toBe(0)

    emitter.on('a', () => {})
    emitter.on('a', () => {})
    emitter.once('a', () => {})
    emitter.on('b', () => {})

    expect(emitter.listenerCount('a')).toBe(3)
    expect(emitter.listenerCount('b')).toBe(1)
  })

  it('removeAllListeners(event) clears only that event', () => {
    const emitter = new EventEmitter()
    const onA = vi.fn()
    const onB = vi.fn()
    emitter.on('a', onA)
    emitter.once('a', onA)
    emitter.on('b', onB)

    emitter.removeAllListeners('a')

    expect(emitter.listenerCount('a')).toBe(0)
    expect(emitter.listenerCount('b')).toBe(1)
    expect(emitter.emit('a')).toBe(false)
    emitter.emit('b')
    expect(onA).not.toHaveBeenCalled()
    expect(onB).toHaveBeenCalledTimes(1)
  })

  it('removeAllListeners() with no argument clears every event', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()
    emitter.on('a', listener)
    emitter.on('b', listener)
    emitter.once('c', listener)

    emitter.removeAllListeners()

    expect(emitter.listenerCount('a')).toBe(0)
    expect(emitter.listenerCount('b')).toBe(0)
    expect(emitter.listenerCount('c')).toBe(0)
    expect(emitter.emit('a')).toBe(false)
    expect(listener).not.toHaveBeenCalled()
  })

  it('removeAllListeners with an empty string clears only the event with that name', () => {
    const emitter = new EventEmitter()
    emitter.on('', () => {})
    emitter.on('other', () => {})

    emitter.removeAllListeners('')

    expect(emitter.listenerCount('')).toBe(0)
    expect(emitter.listenerCount('other')).toBe(1)
  })

  it('an old unsubscribe function does not touch listeners added after removeAllListeners', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()
    const oldUnsubscribe = emitter.on('a', listener)
    expect(oldUnsubscribe).toBeTypeOf('function')
    emitter.removeAllListeners('a')

    emitter.on('a', listener)
    oldUnsubscribe()

    expect(emitter.listenerCount('a')).toBe(1)
    emitter.emit('a')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('13 EventEmitter: changing listeners while emitting', () => {
  it('a listener that unsubscribes itself does not make the next listener get skipped', () => {
    const emitter = new EventEmitter()
    const calls = []
    const unsubscribeFirst = emitter.on('x', () => {
      calls.push('first')
      unsubscribeFirst()
    })
    emitter.on('x', () => calls.push('second'))
    emitter.on('x', () => calls.push('third'))

    emitter.emit('x')
    expect(calls).toEqual(['first', 'second', 'third'])

    emitter.emit('x')
    expect(calls).toEqual(['first', 'second', 'third', 'second', 'third'])
  })

  it('works on a snapshot: a listener removed during emit still runs in that emit, but not in the next', () => {
    const emitter = new EventEmitter()
    const calls = []
    const second = () => calls.push('second')
    emitter.on('x', () => {
      calls.push('first')
      emitter.off('x', second)
    })
    emitter.on('x', second)

    emitter.emit('x')
    expect(calls).toEqual(['first', 'second'])

    emitter.emit('x')
    expect(calls).toEqual(['first', 'second', 'first'])
  })

  it('a once listener that is cancelled during emit still runs in that emit, but never again', () => {
    const emitter = new EventEmitter()
    const calls = []
    let cancelOnce
    emitter.on('x', () => {
      calls.push('first')
      cancelOnce()
    })
    cancelOnce = emitter.once('x', () => calls.push('once'))

    emitter.emit('x')
    expect(calls).toEqual(['first', 'once'])

    emitter.emit('x')
    expect(calls).toEqual(['first', 'once', 'first'])
  })

  it('removeAllListeners during emit does not stop the current emit, but the next emit finds nothing', () => {
    const emitter = new EventEmitter()
    const calls = []
    emitter.on('x', () => {
      calls.push('first')
      emitter.removeAllListeners('x')
    })
    emitter.on('x', () => calls.push('second'))
    emitter.once('x', () => calls.push('third'))

    expect(emitter.emit('x')).toBe(true)
    expect(calls).toEqual(['first', 'second', 'third'])

    expect(emitter.emit('x')).toBe(false)
    expect(calls).toEqual(['first', 'second', 'third'])
  })

  it('a listener added during emit is not called until the next emit', () => {
    const emitter = new EventEmitter()
    const calls = []
    const late = () => calls.push('late')
    emitter.once('x', () => {
      calls.push('early')
      emitter.on('x', late)
    })

    emitter.emit('x')
    expect(calls).toEqual(['early'])

    emitter.emit('x')
    expect(calls).toEqual(['early', 'late'])
  })
})

describe('13 EventEmitter: errors', () => {
  it('runs every listener even if one throws, then rethrows the FIRST error', () => {
    const emitter = new EventEmitter()
    const calls = []
    const firstError = new Error('first')
    const secondError = new Error('second')
    emitter.on('x', () => calls.push('a'))
    emitter.on('x', () => {
      calls.push('b')
      throw firstError
    })
    emitter.on('x', () => {
      calls.push('c')
      throw secondError
    })
    emitter.on('x', () => calls.push('d'))

    let caught
    try {
      emitter.emit('x')
    } catch (error) {
      caught = error
    }

    expect(calls).toEqual(['a', 'b', 'c', 'd'])
    expect(caught).toBe(firstError)
  })

  it.each([0, '', null, undefined, false])(
    'rethrows the first thrown value unchanged, even when it is falsy (%s)',
    (thrown) => {
      const emitter = new EventEmitter()
      const calls = []
      emitter.on('x', () => {
        calls.push('a')
        throw thrown
      })
      emitter.on('x', () => {
        calls.push('b')
        throw new Error('later error')
      })
      emitter.on('x', () => calls.push('c'))

      let threw = false
      let caught
      try {
        emitter.emit('x')
      } catch (error) {
        threw = true
        caught = error
      }

      expect(calls).toEqual(['a', 'b', 'c'])
      expect(threw).toBe(true)
      expect(caught).toBe(thrown)
    },
  )

  it('a throwing once listener does not stop the listeners after it', () => {
    const emitter = new EventEmitter()
    const calls = []
    const boom = new Error('boom')
    emitter.once('x', () => {
      calls.push('once')
      throw boom
    })
    emitter.on('x', () => calls.push('after'))

    let caught
    try {
      emitter.emit('x')
    } catch (error) {
      caught = error
    }

    expect(calls).toEqual(['once', 'after'])
    expect(caught).toBe(boom)
  })

  it('removes a once listener even when it throws', () => {
    const emitter = new EventEmitter()
    const boom = new Error('boom')
    const listener = vi.fn(() => {
      throw boom
    })
    emitter.once('x', listener)

    let caught
    try {
      emitter.emit('x')
    } catch (error) {
      caught = error
    }
    expect(caught).toBe(boom)
    expect(emitter.listenerCount('x')).toBe(0)

    expect(emitter.emit('x')).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it.each([undefined, null, 'nope', 42, {}])(
    'on and once throw a TypeError when the listener is %s',
    (notAFunction) => {
      const emitter = new EventEmitter()

      expect(() => emitter.on('x', notAFunction)).toThrow(TypeError)
      expect(() => emitter.once('x', notAFunction)).toThrow(TypeError)
      expect(emitter.listenerCount('x')).toBe(0)
    },
  )
})
