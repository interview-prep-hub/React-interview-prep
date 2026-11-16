import { throttle } from './index.js'

// All timing is controlled by fake timers, so these tests are instant and never flaky.
// Fake timers also freeze Date.now(), which one test below uses to record WHEN fn ran.
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('02 throttle: default behaviour (leading and trailing)', () => {
  it('runs the first call immediately', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a', 1)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('a', 1)
  })

  it('holds back calls that arrive inside the window', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a')
    throttled('b')
    throttled('c')
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(99)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('runs ONE trailing call with the arguments of the LAST call when the window closes', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a', 1) // t=0, runs now
    vi.advanceTimersByTime(20)
    throttled('b', 2) // t=20, held back
    vi.advanceTimersByTime(20)
    throttled('c', 3) // t=40, replaces 'b'
    vi.advanceTimersByTime(59) // t=99
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1) // t=100, window closes
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenNthCalledWith(1, 'a', 1)
    expect(fn).toHaveBeenNthCalledWith(2, 'c', 3)
  })

  it('does not repeat the leading call as a trailing call when there was only one call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('only')
    vi.advanceTimersByTime(1000)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('only')
  })

  it('a call 99 ms after the first one is still inside the window', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a')
    vi.advanceTimersByTime(99)
    throttled('b')

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('a call exactly wait ms after the first one opens a new window and runs immediately', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a')
    vi.advanceTimersByTime(100)
    throttled('b')

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('b')
  })

  it('goes idle after a window with no calls, so the next call runs immediately again', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a') // t=0, runs
    throttled('b') // held
    vi.advanceTimersByTime(100) // t=100, trailing run of 'b', a new window opens
    expect(fn).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(100) // t=200, nobody called: idle
    throttled('c')
    expect(fn).toHaveBeenCalledTimes(3)
    expect(fn).toHaveBeenLastCalledWith('c')
  })

  it('the trailing run opens a new window, so two runs are never closer than wait ms', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a') // t=0, runs
    vi.advanceTimersByTime(50)
    throttled('b') // t=50, held
    vi.advanceTimersByTime(50) // t=100, 'b' runs, new window until t=200
    expect(fn).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(10)
    throttled('c') // t=110, inside the new window: must wait
    expect(fn).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(89) // t=199
    expect(fn).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(1) // t=200
    expect(fn).toHaveBeenCalledTimes(3)
    expect(fn).toHaveBeenLastCalledWith('c')
  })

  it('does not stretch the window when more calls arrive (unlike debounce)', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a') // t=0, runs
    vi.advanceTimersByTime(90)
    throttled('b') // t=90, held
    vi.advanceTimersByTime(10) // t=100: a debounce would still be waiting until t=190

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('b')
  })

  it('lets at most one call through per window for a steady stream of calls', () => {
    const start = Date.now()
    const runs = []
    const throttled = throttle((i) => {
      runs.push({ at: Date.now() - start, i })
    }, 100)

    // One call every 10 ms for 500 ms.
    for (let t = 0; t < 500; t += 10) {
      throttled(t)
      vi.advanceTimersByTime(10)
    }
    vi.advanceTimersByTime(1000)

    expect(runs).toEqual([
      { at: 0, i: 0 }, // leading call
      { at: 100, i: 90 }, // last call of the first window
      { at: 200, i: 190 },
      { at: 300, i: 290 },
      { at: 400, i: 390 },
      { at: 500, i: 490 },
    ])
  })

  it('passes every argument through, including none at all', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 50)

    throttled()
    expect(fn).toHaveBeenLastCalledWith()

    throttled(1, 'two', { three: 3 }, [4])
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenLastCalledWith(1, 'two', { three: 3 }, [4])
  })

  it('keeps `this` for the leading call and uses the `this` of the LAST held back call for the trailing one', () => {
    const seen = []
    function record() {
      seen.push(this)
    }
    const throttled = throttle(record, 100)
    const a = { name: 'a' }
    const b = { name: 'b' }
    const c = { name: 'c' }

    throttled.call(a) // leading
    throttled.call(b) // held back
    throttled.call(c) // replaces b
    vi.advanceTimersByTime(100)

    expect(seen).toHaveLength(2)
    expect(seen[0]).toBe(a)
    expect(seen[1]).toBe(c)
  })

  it('works as an object method (this points to the object)', () => {
    const counter = {
      total: 0,
      add: throttle(function (n) {
        this.total += n
      }, 50),
    }

    counter.add(1) // leading: total 1
    counter.add(2) // held back
    counter.add(3) // replaces the call with 2
    vi.advanceTimersByTime(50)

    expect(counter.total).toBe(4)
  })

  it('uses a wait of 0 when no wait is given', () => {
    const fn = vi.fn()
    const throttled = throttle(fn)

    throttled('a') // runs now
    throttled('b') // held back
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(0)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('b')
  })

  it('returns a new function and leaves fn itself unchanged', () => {
    function plain() {}
    const throttled = throttle(plain, 100)

    expect(throttled).not.toBe(plain)
    expect(Object.keys(plain)).toEqual([])
  })
})

describe('02 throttle: leading false', () => {
  it('delays the first call to the end of the window and uses the last arguments', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100, { leading: false })

    throttled('a')
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(40)
    throttled('b')
    vi.advanceTimersByTime(59) // t=99
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1) // t=100
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
  })

  it('a single call runs once, at the end of the window', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100, { leading: false })

    throttled('a')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('a')

    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('returns undefined for a call that did not run yet', () => {
    const throttled = throttle(() => 'value', 100, { leading: false })

    expect(throttled()).toBeUndefined()
  })

  it('the trailing run still opens a new window, so two runs are never closer than wait ms', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100, { leading: false })

    throttled('a') // t=0, held back
    vi.advanceTimersByTime(100) // t=100, 'a' runs and a new window opens until t=200
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(10)
    throttled('b') // t=110, inside the new window
    vi.advanceTimersByTime(89) // t=199
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1) // t=200
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('b')
  })
})

describe('02 throttle: trailing false', () => {
  it('drops the calls made inside the window; a call after the window runs immediately', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100, { trailing: false })

    throttled('a') // t=0, runs
    vi.advanceTimersByTime(40)
    throttled('b') // t=40, dropped
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(80) // t=120, the window closed at t=100 and nothing ran
    expect(fn).toHaveBeenCalledTimes(1)

    throttled('c') // t=120, a new window: runs now
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn.mock.calls).toEqual([['a'], ['c']])
  })
})

describe('02 throttle: leading false and trailing false', () => {
  it('never runs fn', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100, { leading: false, trailing: false })

    throttled('a')
    throttled('b')
    vi.advanceTimersByTime(1000)
    throttled('c')
    vi.advanceTimersByTime(1000)

    expect(fn).not.toHaveBeenCalled()
  })
})

describe('02 throttle: return value', () => {
  it('returns the result of the most recent run of fn', () => {
    const fn = vi.fn((x) => x * 2)
    const throttled = throttle(fn, 100)

    expect(throttled(1)).toBe(2) // leading run
    expect(throttled(2)).toBe(2) // held back: the previous result
    vi.advanceTimersByTime(100) // trailing run: fn(2) = 4
    expect(throttled(10)).toBe(4) // inside the new window: the previous result
  })
})

describe('02 throttle: cancel()', () => {
  it('drops the held back call but keeps what already ran', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a') // runs
    throttled('b') // held back
    throttled.cancel()
    vi.advanceTimersByTime(1000)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenLastCalledWith('a')
  })

  it('closes the window, so the next call runs immediately like a first call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a')
    throttled.cancel()
    throttled('b') // still t=0, but the window was cancelled

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('b')
  })

  it('the throttled function keeps working normally after cancel()', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a')
    throttled.cancel()
    throttled('b') // runs now and opens a new window
    throttled('c') // held back
    vi.advanceTimersByTime(100)

    expect(fn.mock.calls).toEqual([['a'], ['b'], ['c']])
  })

  it('a cancelled held back call never comes back in a later window', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a') // runs
    throttled('b') // held back
    throttled.cancel()
    throttled('c') // a new window: runs now
    vi.advanceTimersByTime(1000)

    expect(fn.mock.calls).toEqual([['a'], ['c']])
  })

  it('stops the old timer, so it cannot close a window that was opened later', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a') // t=0, the window would close at t=100
    throttled.cancel()
    vi.advanceTimersByTime(50)
    throttled('b') // t=50, runs and opens a new window until t=150

    vi.advanceTimersByTime(50) // t=100: the old window must not close the new one
    throttled('c') // t=100, inside the new window: held back
    expect(fn.mock.calls).toEqual([['a'], ['b']])

    vi.advanceTimersByTime(50) // t=150
    expect(fn.mock.calls).toEqual([['a'], ['b'], ['c']])
  })

  it('is harmless when nothing is pending', () => {
    const throttled = throttle(vi.fn(), 100)

    expect(() => {
      throttled.cancel()
      throttled.cancel()
    }).not.toThrow()
  })
})

describe('02 throttle: errors and independence', () => {
  it.each([undefined, null, 'not a function', 42, {}])('throws a TypeError when fn is %j', (bad) => {
    expect(() => throttle(bad, 100)).toThrow(TypeError)
  })

  it('does not swallow an error thrown by fn and keeps working afterwards', () => {
    const fn = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('boom')
      })
      .mockReturnValue('ok')
    const throttled = throttle(fn, 100)

    expect(() => throttled('a')).toThrow('boom')

    vi.advanceTimersByTime(100)
    expect(throttled('b')).toBe('ok')
  })

  it('a leading call that throws still opens its window', () => {
    const fn = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('boom')
      })
      .mockReturnValue('ok')
    const throttled = throttle(fn, 100)

    expect(() => throttled('a')).toThrow('boom')
    throttled('b') // t=0, inside the window: held back, not a new leading run
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('b')
  })

  it('keeps a separate last result for every throttled function', () => {
    const throttledA = throttle(() => 'A', 100)
    const throttledB = throttle(() => 'B', 100, { leading: false })

    throttledA() // runs, result 'A'

    expect(throttledB()).toBeUndefined() // B has not run yet
  })

  it('keeps separate state for every throttled function', () => {
    const fnA = vi.fn()
    const fnB = vi.fn()
    const throttledA = throttle(fnA, 100)
    const throttledB = throttle(fnB, 100)

    throttledA('a1') // runs, opens the window of A only
    throttledB('b1') // B has its own window, so this runs too
    throttledA('a2') // held back
    throttledA.cancel()
    throttledB('b2') // held back
    vi.advanceTimersByTime(100)

    expect(fnA.mock.calls).toEqual([['a1']])
    expect(fnB.mock.calls).toEqual([['b1'], ['b2']])
  })
})
