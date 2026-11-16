import { compose, pipe, pipeAsync, tap } from './index.js'

// Small helper functions used by many tests.
const add = (a, b) => a + b
const inc = (x) => x + 1
const double = (x) => x * 2
const square = (x) => x * x

// Runs fn and returns whatever it threw (fails the test when nothing is thrown).
// Used to check that an error arrives as the very same object, not a wrapped copy.
function thrownBy(fn) {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('expected the function to throw, but it did not')
}

// Values that are "falsy" in JavaScript. A step may return any of them.
const FALSY_VALUES = [0, '', false, null, NaN]

describe('07 pipe and compose: order of execution', () => {
  it('pipe runs the functions from left to right', () => {
    expect(pipe(inc, double)(3)).toBe(8) // (3 + 1) * 2
    expect(pipe(double, inc)(3)).toBe(7) // (3 * 2) + 1
  })

  it('compose runs the functions from right to left', () => {
    expect(compose(inc, double)(3)).toBe(7) // inc(double(3))
    expect(compose(double, inc)(3)).toBe(8) // double(inc(3))
  })

  it('shows the difference clearly with three string steps', () => {
    const addA = (s) => `${s}a`
    const addB = (s) => `${s}b`
    const addC = (s) => `${s}c`

    expect(pipe(addA, addB, addC)('')).toBe('abc')
    expect(compose(addA, addB, addC)('')).toBe('cba')
  })

  it('records the real call order of the functions', () => {
    const calls = []
    const step = (name) => (x) => {
      calls.push(name)
      return x
    }

    pipe(step('a'), step('b'), step('c'))(0)
    expect(calls).toEqual(['a', 'b', 'c'])

    calls.length = 0
    compose(step('a'), step('b'), step('c'))(0)
    expect(calls).toEqual(['c', 'b', 'a'])
  })

  it('handles longer chains, not just two or three functions', () => {
    const steps = [inc, double, inc, double, inc, square]

    // pipe: 2 -> 3 -> 6 -> 7 -> 14 -> 15 -> 225
    expect(pipe(...steps)(2)).toBe(225)
    // compose runs the same list from the end: 2 -> 4 -> 5 -> 10 -> 11 -> 22 -> 23
    expect(compose(...steps)(2)).toBe(23)
  })

  it('records the call order of a long chain', () => {
    const calls = []
    const step = (name) => (x) => {
      calls.push(name)
      return x
    }
    const names = ['a', 'b', 'c', 'd', 'e', 'f']

    pipe(...names.map(step))(0)
    expect(calls).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])

    calls.length = 0
    compose(...names.map(step))(0)
    expect(calls).toEqual(['f', 'e', 'd', 'c', 'b', 'a'])
  })

  it('gives each function the return value of the previous one', () => {
    const plusOne = vi.fn((x) => x + 1)
    const timesTen = vi.fn((x) => x * 10)

    expect(pipe(plusOne, timesTen)(1)).toBe(20)
    expect(plusOne).toHaveBeenCalledWith(1)
    expect(timesTen).toHaveBeenCalledWith(2)
  })

  it('compose(...fns) gives the same result as pipe(...fns reversed)', () => {
    const fns = [inc, double, square]
    expect(pipe(...fns)(2)).toBe(36) // square(double(inc(2)))
    expect(compose(...[...fns].reverse())(2)).toBe(36)
  })
})

describe('07 pipe and compose: arguments', () => {
  it('lets the first function to run take several arguments (pipe)', () => {
    expect(pipe(add, double)(2, 3)).toBe(10)
  })

  it('lets the first function to run take several arguments (compose)', () => {
    // In compose the LAST function is the first one to run.
    expect(compose(double, add)(2, 3)).toBe(10)
  })

  it('gives later functions exactly one argument', () => {
    const spy = vi.fn((x) => x)

    pipe(add, spy)(2, 3)
    expect(spy).toHaveBeenCalledWith(5)

    spy.mockClear()
    compose(spy, add)(2, 3)
    expect(spy).toHaveBeenCalledWith(5)
  })

  it('with a single function, forwards all arguments to it', () => {
    expect(pipe(add)(2, 3)).toBe(5)
    expect(compose(add)(2, 3)).toBe(5)
  })

  it('passes undefined along like any other value', () => {
    const returnsNothing = () => undefined
    const isUndefined = (x) => x === undefined

    expect(pipe(returnsNothing, isUndefined)(1)).toBe(true)
    expect(compose(isUndefined, returnsNothing)(1)).toBe(true)
  })

  it.each(FALSY_VALUES)('passes the falsy value %s along: it never stops the chain', (value) => {
    const wrap = (x) => ({ got: x })
    const makeValue = () => value

    expect(pipe(makeValue, wrap)(1)).toEqual({ got: value })
    expect(compose(wrap, makeValue)(1)).toEqual({ got: value })
  })
})

describe('07 pipe and compose: zero functions', () => {
  it('returns the identity function when given no functions', () => {
    const value = { a: 1 }

    expect(typeof pipe()).toBe('function')
    expect(typeof compose()).toBe('function')
    expect(pipe()(5)).toBe(5)
    expect(compose()(5)).toBe(5)
    expect(pipe()(value)).toBe(value) // the same object, not a copy
    expect(compose()(value)).toBe(value)
  })

  it('returns only the first argument and ignores the rest', () => {
    expect(pipe()(1, 2, 3)).toBe(1)
    expect(compose()(1, 2, 3)).toBe(1)
    expect(pipe()()).toBeUndefined()
  })
})

describe('07 pipe and compose: building and reusing', () => {
  it('does not call any function until the composed function is called', () => {
    const spy = vi.fn((x) => x)

    const piped = pipe(spy)
    const composed = compose(spy)
    expect(spy).not.toHaveBeenCalled()

    piped(1)
    composed(2)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('can be called many times and keeps no state between calls', () => {
    const run = pipe(inc, double)
    expect(run(1)).toBe(4)
    expect(run(5)).toBe(12)
    expect(run(1)).toBe(4)
  })

  it('runs every function again on every call: nothing is cached', () => {
    const stepA = vi.fn((x) => x + 1)
    const stepB = vi.fn((x) => x * 2)
    const piped = pipe(stepA, stepB)

    piped(1)
    piped(1)
    expect(stepA).toHaveBeenCalledTimes(2)
    expect(stepB).toHaveBeenCalledTimes(2)

    stepA.mockClear()
    stepB.mockClear()
    const composed = compose(stepB, stepA)
    composed(1)
    composed(1)
    expect(stepA).toHaveBeenCalledTimes(2)
    expect(stepB).toHaveBeenCalledTimes(2)
  })

  it('compose keeps the same order when the same result is called again and again', () => {
    const run = compose(inc, double) // inc(double(x))
    expect([run(3), run(3), run(3), run(4)]).toEqual([7, 7, 7, 9])
  })

  it('returns a normal function: it can be nested in another chain', () => {
    const incThenDouble = pipe(inc, double)
    expect(pipe(incThenDouble, square)(1)).toBe(16) // ((1 + 1) * 2) squared
    expect(compose(square, incThenDouble)(1)).toBe(16)
  })

  it('works as an Array.map callback (map also passes index and array)', () => {
    expect([1, 2, 3].map(pipe(inc, double))).toEqual([4, 6, 8])
    expect([1, 2, 3].map(compose(double, inc))).toEqual([4, 6, 8])
  })
})

describe('07 pipe and compose: errors', () => {
  it.each([
    ['pipe', pipe],
    ['compose', compose],
    ['pipeAsync', pipeAsync],
  ])('%s throws a TypeError at build time when an argument is not a function', (_name, build) => {
    expect(() => build(inc, 'nope', double)).toThrow(TypeError)
    expect(() => build(undefined)).toThrow(TypeError)
    expect(() => build(null)).toThrow(TypeError)
    expect(() => build([inc, double])).toThrow(TypeError) // an array, not spread
  })

  it.each([
    ['pipe', pipe],
    ['compose', compose],
    ['pipeAsync', pipeAsync],
  ])('%s checks every argument, wherever the bad one is, and calls none of them', (_name, build) => {
    const spy = vi.fn((x) => x)

    expect(() => build('nope', spy, spy)).toThrow(TypeError) // first of several
    expect(() => build(spy, spy, 'nope')).toThrow(TypeError) // last of several
    expect(() => build(spy, 'nope')).toThrow(TypeError) // last of two
    expect(() => build(spy, {})).toThrow(TypeError) // an object is not a function
    expect(spy).not.toHaveBeenCalled()
  })

  it('passes the very same error object to the caller, not a wrapped copy', () => {
    const failure = new Error('boom')
    const plainValue = { code: 42 } // anything can be thrown, not only Error objects
    const failWith = (value) => () => {
      throw value
    }

    expect(thrownBy(() => pipe(inc, failWith(failure), double)(1))).toBe(failure)
    expect(thrownBy(() => compose(double, failWith(failure), inc)(1))).toBe(failure)
    expect(thrownBy(() => pipe(failWith(plainValue))(1))).toBe(plainValue)
    expect(thrownBy(() => compose(failWith(plainValue))(1))).toBe(plainValue)
  })

  it('can be called again after a step threw: the failed call leaves no damage behind', () => {
    const rejectNegative = (x) => {
      if (x < 0) throw new Error('negative')
      return x
    }
    const piped = pipe(inc, rejectNegative, double)
    const composed = compose(double, rejectNegative, inc)

    expect(() => piped(-5)).toThrow('negative')
    expect(piped(1)).toBe(4) // (1 + 1) * 2, all three steps still in place
    expect(() => composed(-5)).toThrow('negative')
    expect(composed(1)).toBe(4)
  })

  it('lets an error from a function pass through, and stops the chain (pipe)', () => {
    const before = vi.fn((x) => x)
    const boom = () => {
      throw new Error('boom')
    }
    const afterBoom = vi.fn((x) => x)
    const run = pipe(before, boom, afterBoom)

    expect(() => run(1)).toThrow('boom')
    expect(before).toHaveBeenCalledTimes(1)
    expect(afterBoom).not.toHaveBeenCalled()
  })

  it('lets an error from a function pass through, and stops the chain (compose)', () => {
    const first = vi.fn((x) => x) // runs first in compose
    const boom = () => {
      throw new Error('boom')
    }
    const last = vi.fn((x) => x) // would run last in compose
    const run = compose(last, boom, first)

    expect(() => run(1)).toThrow('boom')
    expect(first).toHaveBeenCalledTimes(1)
    expect(last).not.toHaveBeenCalled()
  })
})

describe('07 tap', () => {
  it('returns the value it receives, the very same reference', () => {
    const user = { name: 'Ada' }
    expect(tap(() => {})(user)).toBe(user)
    expect(tap(() => {})(42)).toBe(42)
  })

  it('calls fn once with the value', () => {
    const spy = vi.fn()
    const user = { name: 'Ada' }

    tap(spy)(user)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(user)
  })

  it('does not call fn until the returned function is called', () => {
    const spy = vi.fn()
    const tapped = tap(spy)
    expect(spy).not.toHaveBeenCalled()

    tapped('x')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('ignores what fn returns, even a promise', () => {
    expect(tap(() => 99)('a')).toBe('a')
    expect(tap(() => Promise.resolve('ignored'))(1)).toBe(1)
  })

  it('passes only the first argument to fn', () => {
    const spy = vi.fn()
    expect(tap(spy)(1, 2, 3)).toBe(1)
    expect(spy).toHaveBeenCalledWith(1)
  })

  it('lets a pipe continue unchanged and runs its side effect at the right moment', () => {
    const log = []
    const run = pipe(double, tap((x) => log.push(x)), inc)

    expect(run(2)).toBe(5)
    expect(log).toEqual([4]) // saw the value AFTER double and BEFORE inc
  })

  it('works inside compose too', () => {
    const log = []
    const run = compose(inc, tap((x) => log.push(x)), double)

    expect(run(2)).toBe(5)
    expect(log).toEqual([4])
  })

  it('does not swallow an error thrown by fn', () => {
    const noisy = tap(() => {
      throw new Error('log failed')
    })
    expect(() => noisy(1)).toThrow('log failed')
  })

  it('passes the very same error object to the caller, not a wrapped copy', () => {
    const failure = new Error('log failed')
    const noisy = tap(() => {
      throw failure
    })
    expect(thrownBy(() => noisy(1))).toBe(failure)
  })

  it('throws a TypeError when fn is not a function', () => {
    expect(() => tap()).toThrow(TypeError)
    expect(() => tap('log')).toThrow(TypeError)
    expect(() => tap(null)).toThrow(TypeError)
  })
})

describe('07 pipeAsync', () => {
  const asyncInc = async (x) => x + 1
  const asyncSquare = async (x) => x * x

  it('returns a function that always returns a promise, even for sync steps', async () => {
    const run = pipeAsync(inc)
    expect(typeof run).toBe('function')

    const result = run(1)
    expect(result).toBeInstanceOf(Promise)
    await expect(result).resolves.toBe(2)
  })

  it('works with only synchronous functions', async () => {
    await expect(pipeAsync(inc, double)(3)).resolves.toBe(8)
  })

  it('mixes sync and async functions, left to right', async () => {
    // asyncInc(2) = 3, double(3) = 6, asyncSquare(6) = 36
    await expect(pipeAsync(asyncInc, double, asyncSquare)(2)).resolves.toBe(36)
    // The other order would give a different number: proof that the order is left to right.
    await expect(pipeAsync(asyncSquare, double, asyncInc)(2)).resolves.toBe(9)
  })

  it('lets the first function take several arguments', async () => {
    await expect(pipeAsync(add, double)(2, 3)).resolves.toBe(10)
    await expect(pipeAsync(async (a, b) => a + b, double)(2, 3)).resolves.toBe(10)
  })

  it('gives later steps exactly one argument: the resolved value of the step before', async () => {
    const spy = vi.fn((x) => x)

    await pipeAsync(add, spy)(2, 3)
    expect(spy).toHaveBeenCalledWith(5)

    spy.mockClear()
    await pipeAsync(async (a, b) => a + b, spy)(2, 3)
    expect(spy).toHaveBeenCalledWith(5)
  })

  it('does not call any step until the returned function is called', async () => {
    const spy = vi.fn((x) => x)
    const run = pipeAsync(spy)
    expect(spy).not.toHaveBeenCalled()

    await run(1)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('runs every step again on every call: nothing is cached', async () => {
    const spy = vi.fn(async (x) => x + 1)
    const run = pipeAsync(spy, double)

    await run(1)
    await run(1)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it.each(FALSY_VALUES)('passes the falsy value %s along: it never stops the chain', async (value) => {
    const wrap = (x) => ({ got: x })

    await expect(pipeAsync(async () => value, wrap)(1)).resolves.toEqual({ got: value })
    await expect(pipeAsync(() => value, wrap)(1)).resolves.toEqual({ got: value })
  })

  it('passes undefined along like any other value', async () => {
    const isUndefined = (x) => x === undefined
    await expect(pipeAsync(async () => undefined, isUndefined)(1)).resolves.toBe(true)
  })

  it('with no functions, returns a promise of the first argument', async () => {
    const result = pipeAsync()(5, 6)
    expect(result).toBeInstanceOf(Promise)
    await expect(result).resolves.toBe(5)
  })

  it('works together with tap', async () => {
    const log = []
    const loadUser = async (id) => ({ id, name: 'Ada' })
    const run = pipeAsync(
      loadUser,
      tap((user) => log.push(user.name)),
      (user) => user.name.toUpperCase(),
    )

    await expect(run(7)).resolves.toBe('ADA')
    expect(log).toEqual(['Ada'])
  })

  it('can be reused, even for calls that overlap', async () => {
    const run = pipeAsync(asyncInc, double)
    await expect(run(1)).resolves.toBe(4)
    await expect(Promise.all([run(1), run(10)])).resolves.toEqual([4, 22])
  })

  it('rejects when an async step rejects, and does not run the steps after it', async () => {
    const failing = vi.fn(async () => {
      throw new Error('async boom')
    })
    const afterFailing = vi.fn((x) => x)

    await expect(pipeAsync(inc, failing, afterFailing)(1)).rejects.toThrow('async boom')
    expect(failing).toHaveBeenCalledTimes(1)
    expect(afterFailing).not.toHaveBeenCalled()
  })

  it('rejects when a step returns a rejected promise (not an async function)', async () => {
    const afterRejected = vi.fn((x) => x)
    const run = pipeAsync(inc, () => Promise.reject(new Error('rejected')), afterRejected)

    await expect(run(1)).rejects.toThrow('rejected')
    expect(afterRejected).not.toHaveBeenCalled()
  })

  it('rejects with the very same error object, not a wrapped copy', async () => {
    const failure = new Error('original')
    const plainValue = { code: 42 } // anything can be thrown or rejected

    await expect(pipeAsync(inc, async () => { throw failure })(1)).rejects.toBe(failure)
    await expect(pipeAsync(inc, () => { throw failure })(1)).rejects.toBe(failure)
    await expect(pipeAsync(() => Promise.reject(plainValue), inc)(1)).rejects.toBe(plainValue)
  })

  it('can be called again after a step failed: the failed call leaves no damage behind', async () => {
    const rejectNegative = async (x) => {
      if (x < 0) throw new Error('negative')
      return x
    }
    const run = pipeAsync(inc, rejectNegative, double)

    await expect(run(-5)).rejects.toThrow('negative')
    await expect(run(1)).resolves.toBe(4) // (1 + 1) * 2, all three steps still in place
  })

  it('turns a synchronous throw in a middle step into a rejection', async () => {
    const afterBoom = vi.fn((x) => x)
    const run = pipeAsync(inc, () => {
      throw new Error('sync boom')
    }, afterBoom)

    let promise
    expect(() => {
      promise = run(1)
    }).not.toThrow()
    await expect(promise).rejects.toThrow('sync boom')
    expect(afterBoom).not.toHaveBeenCalled()
  })

  it('turns a synchronous throw in the first step into a rejection', async () => {
    const run = pipeAsync(() => {
      throw new Error('first step failed')
    }, inc)

    let promise
    expect(() => {
      promise = run(1)
    }).not.toThrow()
    await expect(promise).rejects.toThrow('first step failed')
  })
})

describe('07 pipeAsync with timers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  it('waits for each async step to finish before it starts the next one', async () => {
    const first = vi.fn(async (x) => {
      await wait(100)
      return x + 1
    })
    const second = vi.fn(async (x) => {
      await wait(100)
      return x * 2
    })

    const promise = pipeAsync(first, second)(1)

    await vi.advanceTimersByTimeAsync(99)
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled() // the first step is still waiting

    await vi.advanceTimersByTimeAsync(1) // 100 ms: the first step finishes
    expect(second).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledWith(2) // it got the RESOLVED value, not a promise

    await vi.advanceTimersByTimeAsync(100) // 200 ms: the second step finishes
    await expect(promise).resolves.toBe(4)
  })

  it('runs steps one after the other, so the total time is the sum of the steps', async () => {
    const slow = (ms) => async (x) => {
      await wait(ms)
      return x + ms
    }
    const settled = vi.fn()

    pipeAsync(slow(100), slow(200))(0).then(settled)

    await vi.advanceTimersByTimeAsync(299)
    expect(settled).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(settled).toHaveBeenCalledWith(300)
  })

  it('keeps overlapping calls apart, even when they finish in a different order', async () => {
    // Each of the first two steps waits as many milliseconds as the number it gets.
    const run = pipeAsync(
      async (n) => {
        await wait(n)
        return n
      },
      async (n) => {
        await wait(n)
        return n * 10
      },
      (n) => n + 1,
    )

    const slow = run(50) // starts at 0 ms, waits 50 + 50, finishes at 100 ms
    await vi.advanceTimersByTimeAsync(60)
    const fast = run(10) // starts at 60 ms, waits 10 + 10, finishes at 80 ms, while slow is still busy
    await vi.advanceTimersByTimeAsync(40) // 100 ms

    await expect(fast).resolves.toBe(101)
    await expect(slow).resolves.toBe(501)
  })
})
