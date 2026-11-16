import { debounce } from './index.js'

// All timing is controlled by fake timers, so these tests are instant and never flaky.
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('01 debounce: default behaviour (trailing only)', () => {
  it('does not call fn before wait ms have passed, then calls it once', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('turns a burst of calls into one call with the arguments of the LAST call', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('a', 1)
    debounced('b', 2)
    debounced('c', 3)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c', 3)
  })

  it('restarts the waiting time on every call', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('first') // would fire at t=100
    vi.advanceTimersByTime(60)
    debounced('second') // restarts: now fires at t=160

    vi.advanceTimersByTime(60) // t=120
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(40) // t=160
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')
  })

  it('keeps postponing while calls keep arriving less than wait ms apart', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    for (let i = 0; i < 10; i++) {
      debounced(i)
      vi.advanceTimersByTime(90)
    }
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(10)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(9)
  })

  it('treats calls that are far apart as separate bursts', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('a')
    vi.advanceTimersByTime(100)
    debounced('b')
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenNthCalledWith(1, 'a')
    expect(fn).toHaveBeenNthCalledWith(2, 'b')
  })

  it('passes every argument through, including none at all', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 50)

    debounced()
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenLastCalledWith()

    debounced(1, 'two', { three: 3 }, [4])
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenLastCalledWith(1, 'two', { three: 3 }, [4])
  })

  it('calls fn with the `this` of the LAST call', () => {
    const seen = []
    function record() {
      seen.push(this)
    }
    const debounced = debounce(record, 100)
    const a = { name: 'a' }
    const b = { name: 'b' }

    debounced.call(a)
    debounced.call(b)
    vi.advanceTimersByTime(100)

    expect(seen).toHaveLength(1)
    expect(seen[0]).toBe(b)
  })

  it('works as an object method (this points to the object)', () => {
    const counter = {
      total: 0,
      add: debounce(function (n) {
        this.total += n
      }, 50),
    }

    counter.add(1)
    counter.add(2)
    vi.advanceTimersByTime(50)

    expect(counter.total).toBe(2)
  })

  it('works with a wait of 0 (the call is still postponed to the next timer tick)', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 0)

    debounced('x')
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(0)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('x')
  })

  it('uses a wait of 0 when no wait is given', () => {
    const fn = vi.fn()
    const debounced = debounce(fn)

    debounced('x')
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(0)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('x')
  })

  it('returns a new function and leaves fn itself unchanged', () => {
    function plain() {}
    const debounced = debounce(plain, 100)

    expect(debounced).not.toBe(plain)
    expect(Object.keys(plain)).toEqual([])
  })
})

describe('01 debounce: leading and trailing options', () => {
  it('leading only: runs on the first call of a burst and ignores the rest of it', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, { leading: true, trailing: false })

    debounced('a')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('a')

    debounced('b')
    debounced('c')
    vi.advanceTimersByTime(500)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('leading only: a new burst runs immediately again once calls have been quiet for wait ms', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, { leading: true, trailing: false })

    debounced('a')
    vi.advanceTimersByTime(60)
    debounced('b') // still the same burst, and it restarts the quiet time (until t=160)
    vi.advanceTimersByTime(99) // t=159
    debounced('c') // still the same burst
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100) // quiet for 100 ms
    debounced('d')
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('d')
  })

  it('the leading run uses the `this` and the arguments of the call that started the burst', () => {
    const seen = []
    function record(value) {
      seen.push({ self: this, value })
    }
    const debounced = debounce(record, 100, { leading: true, trailing: false })
    const owner = { id: 1 }

    debounced.call(owner, 'first')

    expect(seen).toHaveLength(1)
    expect(seen[0].self).toBe(owner)
    expect(seen[0].value).toBe('first')
  })

  it('leading and trailing: first call runs now, last call runs after the burst', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, { leading: true })

    debounced('a')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenLastCalledWith('a')

    debounced('b')
    debounced('c')
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('c')
  })

  it('leading and trailing: a burst with a single call fires only once', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, { leading: true, trailing: true })

    debounced('only')
    vi.advanceTimersByTime(1000)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('only')
  })

  it('leading and trailing: every burst gets its own leading call', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, { leading: true })

    debounced('a1')
    debounced('a2')
    vi.advanceTimersByTime(100) // trailing run for a2
    debounced('b1') // new burst: runs now
    expect(fn.mock.calls).toEqual([['a1'], ['a2'], ['b1']])

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(3) // b1 was the only call of its burst
  })

  it('trailing false and leading false: fn never runs', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, { leading: false, trailing: false })

    debounced('a')
    debounced('b')
    vi.advanceTimersByTime(1000)
    debounced.flush()

    expect(fn).not.toHaveBeenCalled()
  })

  it('leading defaults to false: { trailing: false } alone never runs fn', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, { trailing: false })

    debounced('a')
    vi.advanceTimersByTime(1000)

    expect(fn).not.toHaveBeenCalled()
  })
})

describe('01 debounce: return value', () => {
  it('returns undefined until fn has run for the first time', () => {
    const debounced = debounce(() => 'done', 100)

    expect(debounced()).toBeUndefined()
  })

  it('returns the result of the most recent run of fn', () => {
    const fn = vi.fn((x) => x * 2)
    const debounced = debounce(fn, 100)

    expect(debounced(1)).toBeUndefined() // fn has not run yet
    vi.advanceTimersByTime(100) // fn(1) runs, result 2
    expect(debounced(5)).toBe(2) // still waiting, so we get the previous result
    vi.advanceTimersByTime(100) // fn(5) runs, result 10
    expect(debounced(7)).toBe(10)
  })

  it('with leading, the first call of a burst returns its own fresh result', () => {
    const fn = vi.fn((x) => x * 2)
    const debounced = debounce(fn, 100, { leading: true })

    expect(debounced(1)).toBe(2)
    expect(debounced(2)).toBe(2) // fn did not run for this call, so the old result
    vi.advanceTimersByTime(100) // trailing run: fn(2) = 4
    expect(debounced(10)).toBe(20) // new burst, leading run
  })
})

describe('01 debounce: cancel()', () => {
  it('drops the pending call but keeps what already ran', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)

    debounced('second')
    debounced.cancel()
    vi.advanceTimersByTime(1000)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenLastCalledWith('first')
  })

  it('the debounced function keeps working after cancel()', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('a')
    debounced.cancel()
    debounced('b')
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
  })

  it('ends the current burst, so the next call is a new leading call', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, { leading: true })

    debounced('a') // leading run
    debounced('b') // pending trailing
    debounced.cancel()
    expect(fn).toHaveBeenCalledTimes(1)

    debounced('c') // new burst: leading run right away
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('c')

    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(2) // 'b' never runs
  })

  it('stops the old timer, so it cannot end a newer burst too early', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('a') // t=0, its timer would fire at t=100
    debounced.cancel()
    vi.advanceTimersByTime(50)
    debounced('b') // t=50, a new burst that ends at t=150

    vi.advanceTimersByTime(50) // t=100: the old timer must be gone
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50) // t=150
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
  })

  it('a flush() after cancel() has nothing to run', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('a')
    debounced.cancel()
    debounced.flush()

    expect(fn).not.toHaveBeenCalled()
  })

  it('is harmless when nothing is pending', () => {
    const debounced = debounce(vi.fn(), 100)

    expect(() => debounced.cancel()).not.toThrow()
    expect(() => {
      debounced.cancel()
      debounced.cancel()
    }).not.toThrow()
  })
})

describe('01 debounce: flush()', () => {
  it('runs the pending call right now with the last arguments and `this`, and returns its result', () => {
    const seen = []
    const fn = vi.fn(function (value) {
      seen.push(this)
      return `result:${value}`
    })
    const debounced = debounce(fn, 100)
    const owner = { id: 1 }

    debounced.call({ id: 0 }, 'a')
    debounced.call(owner, 'b')
    const returned = debounced.flush()

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
    expect(seen[0]).toBe(owner)
    expect(returned).toBe('result:b')
  })

  it('does not run the call a second time when the timer would have fired', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('a')
    debounced.flush()
    vi.advanceTimersByTime(1000)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('runs the pending call only once, even when flush() is called again', () => {
    const fn = vi.fn((x) => x)
    const debounced = debounce(fn, 100)

    debounced('a')
    expect(debounced.flush()).toBe('a')
    expect(debounced.flush()).toBe('a') // nothing is pending now: the last result
    vi.advanceTimersByTime(1000)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('returns the last result and does not call fn when nothing is pending', () => {
    const fn = vi.fn(() => 'value')
    const debounced = debounce(fn, 100)

    debounced()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)

    expect(debounced.flush()).toBe('value')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('returns undefined when fn has never run', () => {
    const debounced = debounce(vi.fn(), 100)

    expect(debounced.flush()).toBeUndefined()
  })

  it('does nothing extra for a leading-only burst (no trailing call is pending)', () => {
    const fn = vi.fn((x) => x)
    const debounced = debounce(fn, 100, { leading: true, trailing: false })

    debounced('a')
    debounced('b')
    expect(debounced.flush()).toBe('a')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('ends the burst, so the next call is a new leading call', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, { leading: true })

    debounced('a') // leading run
    debounced('b') // pending
    debounced.flush() // runs 'b'
    expect(fn).toHaveBeenCalledTimes(2)

    debounced('c') // new burst: leading run right away
    expect(fn).toHaveBeenCalledTimes(3)
    expect(fn).toHaveBeenLastCalledWith('c')
  })

  it('ends the burst even when no trailing call was pending', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, { leading: true, trailing: false })

    debounced('a') // leading run
    debounced.flush() // nothing to run, but the burst is over
    debounced('b') // a new burst: runs right away

    expect(fn.mock.calls).toEqual([['a'], ['b']])
  })
})

describe('01 debounce: errors and independence', () => {
  it.each([undefined, null, 'not a function', 42, {}])('throws a TypeError when fn is %j', (bad) => {
    expect(() => debounce(bad, 100)).toThrow(TypeError)
  })

  it('does not swallow an error thrown by fn (leading call) and keeps working afterwards', () => {
    const fn = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('boom')
      })
      .mockReturnValue('ok')
    const debounced = debounce(fn, 100, { leading: true })

    expect(() => debounced('a')).toThrow('boom')

    vi.advanceTimersByTime(100)
    expect(debounced('b')).toBe('ok')
  })

  it('a leading call that throws still counts as a call: its burst is open', () => {
    const fn = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('boom')
      })
      .mockReturnValue('ok')
    const debounced = debounce(fn, 100, { leading: true })

    expect(() => debounced('a')).toThrow('boom')
    debounced('b') // t=0, same burst: held back, not a new leading run
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('b')
  })

  it('lets an error thrown by fn come out of flush()', () => {
    const fn = vi.fn(() => {
      throw new Error('boom')
    })
    const debounced = debounce(fn, 100)

    debounced('a')
    expect(() => debounced.flush()).toThrow('boom')

    // The failed call is gone: neither a second flush() nor the old timer may retry it.
    expect(() => debounced.flush()).not.toThrow()
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('keeps separate state for every debounced function', () => {
    const fnA = vi.fn()
    const fnB = vi.fn()
    const debouncedA = debounce(fnA, 100)
    const debouncedB = debounce(fnB, 100)

    debouncedA('a')
    debouncedB('b')
    debouncedA.cancel()
    vi.advanceTimersByTime(100)

    expect(fnA).not.toHaveBeenCalled()
    expect(fnB).toHaveBeenCalledTimes(1)
    expect(fnB).toHaveBeenCalledWith('b')
  })

  it('keeps a separate last result for every debounced function', () => {
    const debouncedA = debounce(() => 'A', 100)
    const debouncedB = debounce(() => 'B', 100)

    debouncedA()
    vi.advanceTimersByTime(100) // A has run, B has not run yet

    expect(debouncedA()).toBe('A')
    expect(debouncedB()).toBeUndefined()
  })
})
