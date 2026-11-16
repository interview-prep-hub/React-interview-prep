import { once, before, after } from './index.js'

describe('08 once: the basics', () => {
  it('calls fn on the first call and returns its result', () => {
    const fn = vi.fn(() => 'ready')
    const init = once(fn)

    expect(init()).toBe('ready')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does not call fn when it only wraps it', () => {
    const fn = vi.fn()
    const init = once(fn)
    expect(fn).not.toHaveBeenCalled()

    init()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('calls fn only once, and every later call returns the first result', () => {
    let counter = 0
    const fn = vi.fn(() => ++counter) // would return 1, 2, 3 if it ran again
    const next = once(fn)

    expect(next()).toBe(1)
    expect(next()).toBe(1)
    expect(next()).toBe(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('returns the very same object every time, not a copy', () => {
    const config = { debug: true }
    const load = once(() => config)

    expect(load()).toBe(config)
    expect(load()).toBe(config)
  })

  it('passes the arguments of the first call to fn and ignores later arguments', () => {
    const fn = vi.fn((a, b) => a + b)
    const sum = once(fn)

    expect(sum(1, 2)).toBe(3)
    expect(sum(10, 20)).toBe(3) // still the first result
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1, 2)
  })

  it.each([0, '', false, null, undefined, NaN])(
    'remembers the falsy result %s: fn still runs only once',
    (value) => {
      const fn = vi.fn(() => value)
      const wrapped = once(fn)

      expect(wrapped()).toBe(value)
      expect(wrapped()).toBe(value)
      expect(wrapped()).toBe(value)
      expect(fn).toHaveBeenCalledTimes(1)
    },
  )

  it('gives every wrapper its own state, even when they wrap the same function', () => {
    const fn = vi.fn(() => 'done')
    const a = once(fn)
    const b = once(fn)

    a()
    a()
    expect(fn).toHaveBeenCalledTimes(1)

    b()
    expect(fn).toHaveBeenCalledTimes(2) // b had not run yet
  })

  it('throws a TypeError when fn is not a function', () => {
    expect(() => once()).toThrow(TypeError)
    expect(() => once('init')).toThrow(TypeError)
    expect(() => once(null)).toThrow(TypeError)
  })
})

describe('08 once: this', () => {
  it('keeps `this`, so it works on object methods', () => {
    const counter = {
      name: 'clicks',
      label: once(function () {
        return `counter: ${this.name}`
      }),
    }

    expect(counter.label()).toBe('counter: clicks')
    expect(counter.label()).toBe('counter: clicks')
  })

  it('uses the `this` of the first call, and the later `this` makes no difference', () => {
    const whoAmI = once(function () {
      return this.name
    })

    expect(whoAmI.call({ name: 'first' })).toBe('first')
    expect(whoAmI.call({ name: 'second' })).toBe('first')
  })
})

describe('08 once: when fn throws (the retry choice)', () => {
  // The choice made in this exercise: a call that THROWS is not a successful call.
  // So `once` lets the error through and does not "use up" its single run.
  // The next call tries again. After the first success, the result is final.
  it('rethrows the error of the first call', () => {
    const init = once(() => {
      throw new Error('network down')
    })
    expect(() => init()).toThrow('network down')
  })

  it('retries on the next call when the first call threw, then remembers the success', () => {
    const fn = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('first try failed')
      })
      .mockReturnValue('connected')
    const connect = once(fn)

    expect(() => connect()).toThrow('first try failed')
    expect(fn).toHaveBeenCalledTimes(1)

    expect(connect()).toBe('connected') // the retry
    expect(fn).toHaveBeenCalledTimes(2)

    expect(connect()).toBe('connected') // now it is final: no third call
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('keeps retrying while fn keeps throwing', () => {
    const fn = vi.fn(() => {
      throw new Error('still failing')
    })
    const flaky = once(fn)

    expect(() => flaky()).toThrow('still failing')
    expect(() => flaky()).toThrow('still failing')
    expect(() => flaky()).toThrow('still failing')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('retries with the arguments of the new call', () => {
    const fn = vi.fn((value) => {
      if (value === 'bad') throw new Error('bad input')
      return value.toUpperCase()
    })
    const shout = once(fn)

    expect(() => shout('bad')).toThrow('bad input')
    expect(shout('ok')).toBe('OK')
    expect(shout('later')).toBe('OK')
  })
})

describe('08 once: promises and real uses', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('gives every caller the same promise, so one slow job is shared', async () => {
    const load = vi.fn(
      () => new Promise((resolve) => setTimeout(() => resolve('data'), 100)),
    )
    const loadOnce = once(load)

    const p1 = loadOnce()
    const p2 = loadOnce()
    expect(p2).toBe(p1)
    expect(load).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(100)
    await expect(p1).resolves.toBe('data')
    await expect(loadOnce()).resolves.toBe('data')
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('runs a timer callback only the first time the timer fires', () => {
    const fn = vi.fn()
    const onceCallback = once(fn)

    setTimeout(onceCallback, 100)
    setTimeout(onceCallback, 200)
    setTimeout(onceCallback, 300)

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('works as an event listener that must react only to the first event', () => {
    const button = document.createElement('button')
    const seenTargets = []
    button.addEventListener(
      'click',
      once(function (event) {
        seenTargets.push(this, event.type)
      }),
    )

    button.click()
    button.click()
    button.click()

    // Called once, with `this` set to the button (as the browser does for listeners).
    expect(seenTargets).toEqual([button, 'click'])
  })
})

describe('08 before', () => {
  it('calls fn for the first n - 1 calls, then returns the last result', () => {
    const fn = vi.fn((x) => x * 10)
    const limited = before(3, fn)

    expect(limited(1)).toBe(10) // call 1: runs
    expect(limited(2)).toBe(20) // call 2: runs
    expect(limited(3)).toBe(20) // call 3: no run, the last result
    expect(limited(4)).toBe(20) // call 4: no run, the last result
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenNthCalledWith(1, 1)
    expect(fn).toHaveBeenNthCalledWith(2, 2)
  })

  it('before(2, fn) lets fn run exactly once', () => {
    const fn = vi.fn(() => 'first')
    const limited = before(2, fn)

    expect(limited()).toBe('first')
    expect(limited()).toBe('first')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it.each([1, 0])('before(%i, fn) never calls fn and returns undefined', (n) => {
    const fn = vi.fn(() => 'never')
    const limited = before(n, fn)

    expect(limited()).toBeUndefined()
    expect(limited()).toBeUndefined()
    expect(fn).not.toHaveBeenCalled()
  })

  it('passes all arguments and `this` to fn', () => {
    const fn = vi.fn(function (a, b) {
      return `${this.name}:${a + b}`
    })
    const user = { name: 'Ada', limited: before(3, fn) }

    expect(user.limited(1, 2)).toBe('Ada:3')
    expect(fn).toHaveBeenCalledWith(1, 2)
  })

  it('returns undefined as the remembered result when the last run returned undefined', () => {
    const limited = before(3, (x) => (x === 'a' ? 'got a' : undefined))

    expect(limited('a')).toBe('got a')
    expect(limited('b')).toBeUndefined()
    expect(limited('a')).toBeUndefined() // limit reached: the LAST result, which was undefined
  })

  it('lets an error from fn out, and the failed call still counts', () => {
    const fn = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('first call failed')
      })
      .mockReturnValue('ok')
    const limited = before(3, fn)

    expect(() => limited()).toThrow('first call failed') // call 1 (counts)
    expect(limited()).toBe('ok') // call 2 (counts)
    expect(limited()).toBe('ok') // call 3: limit reached, fn is not called again
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it.each([-1, 1.5, NaN, Infinity, '2', undefined])(
    'throws a RangeError when n is %s (not a whole number, 0 or more)',
    (n) => {
      expect(() => before(n, () => {})).toThrow(RangeError)
    },
  )

  it('throws a TypeError when fn is not a function', () => {
    expect(() => before(3)).toThrow(TypeError)
    expect(() => before(3, 'fn')).toThrow(TypeError)
  })
})

describe('08 after', () => {
  it('ignores the first n - 1 calls, then calls fn on every call from the n-th', () => {
    const fn = vi.fn((x) => x * 10)
    const delayed = after(3, fn)

    expect(delayed(1)).toBeUndefined() // call 1: ignored
    expect(delayed(2)).toBeUndefined() // call 2: ignored
    expect(fn).not.toHaveBeenCalled()

    expect(delayed(3)).toBe(30) // call 3: runs
    expect(delayed(4)).toBe(40) // call 4: runs again
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenNthCalledWith(1, 3)
    expect(fn).toHaveBeenNthCalledWith(2, 4)
  })

  it.each([1, 0])('after(%i, fn) calls fn on every call, from the first one', (n) => {
    const fn = vi.fn((x) => x + 1)
    const delayed = after(n, fn)

    expect(delayed(1)).toBe(2)
    expect(delayed(2)).toBe(3)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('passes all arguments and `this` to fn', () => {
    const fn = vi.fn(function (a, b) {
      return `${this.name}:${a * b}`
    })
    const user = { name: 'Ada', delayed: after(2, fn) }

    user.delayed(0, 0) // ignored
    expect(user.delayed(3, 4)).toBe('Ada:12')
    expect(fn).toHaveBeenCalledWith(3, 4)
  })

  it('lets an error from fn out to the caller', () => {
    const delayed = after(2, () => {
      throw new Error('too late')
    })

    expect(delayed()).toBeUndefined() // ignored, so nothing is thrown
    expect(() => delayed()).toThrow('too late')
  })

  it.each([-1, 1.5, NaN, Infinity, '2', undefined])(
    'throws a RangeError when n is %s (not a whole number, 0 or more)',
    (n) => {
      expect(() => after(n, () => {})).toThrow(RangeError)
    },
  )

  it('throws a TypeError when fn is not a function', () => {
    expect(() => after(3)).toThrow(TypeError)
    expect(() => after(3, 'fn')).toThrow(TypeError)
  })
})

describe('08 after: a real use, "run when all the jobs are done"', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs the callback only when the third job has finished', () => {
    const allDone = vi.fn()
    const jobFinished = after(3, allDone)

    setTimeout(jobFinished, 100)
    setTimeout(jobFinished, 200)
    setTimeout(jobFinished, 300)

    vi.advanceTimersByTime(250)
    expect(allDone).not.toHaveBeenCalled() // only 2 of 3 jobs finished

    vi.advanceTimersByTime(50) // 300 ms
    expect(allDone).toHaveBeenCalledTimes(1)
  })
})

describe('08 before: a real use, "accept only the first few attempts"', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stops reacting after the limit, and keeps the last answer', () => {
    const sendSpy = vi.fn((attempt) => `sent #${attempt}`)
    const send = before(3, sendSpy) // only 2 real sends

    const replies = []
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      setTimeout(() => replies.push(send(attempt)), attempt * 100)
    }
    vi.advanceTimersByTime(400)

    expect(sendSpy).toHaveBeenCalledTimes(2)
    expect(replies).toEqual(['sent #1', 'sent #2', 'sent #2', 'sent #2'])
  })
})
