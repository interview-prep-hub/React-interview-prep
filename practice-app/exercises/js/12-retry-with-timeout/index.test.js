import { retry, withTimeout, TimeoutError } from './index.js'

// Fake timers: nothing here waits for real time, so the tests are instant and
// never flaky. The fake clock also controls Date.now(), which the tests use to
// see exactly WHEN each attempt started.
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Moves the fake clock forward and lets the promise callbacks run on the way.
const advance = (ms) => vi.advanceTimersByTimeAsync(ms)

// A promise that fulfills / rejects after `ms` ms of (fake) time.
const delay = (ms, value) => new Promise((resolve) => setTimeout(resolve, ms, value))
const rawFailAfter = (ms, reason) => new Promise((_, reject) => setTimeout(reject, ms, reason))
function failAfter(ms, reason) {
  const promise = rawFailAfter(ms, reason)
  promise.catch(() => {}) // the test's own inputs never count as "unhandled"
  return promise
}

// A promise that never settles.
const never = () => new Promise(() => {})

// Watches a promise and records how it ended. Use it when you need to ask
// "is it still pending?" (awaiting a pending promise would hang the test).
function track(promise) {
  expect(promise, 'the function must return a Promise').toBeInstanceOf(Promise)
  const state = { status: 'pending', value: undefined, reason: undefined }
  promise.then(
    (value) => {
      state.status = 'fulfilled'
      state.value = value
    },
    (reason) => {
      state.status = 'rejected'
      state.reason = reason
    },
  )
  return state
}

// Checks how a tracked promise ended. When it rejected although the test did not
// expect that, the failure message shows the reason, which helps you debug.
function expectStatus(state, expected) {
  const reason = state.status === 'rejected' && expected !== 'rejected' ? ` (reason: ${String(state.reason)})` : ''
  expect(state.status, `the promise is ${state.status}${reason}, expected ${expected}`).toBe(expected)
}

// Makes a mock function for retry(). It also records WHEN (in fake ms since the
// test started) each attempt began, so a test can check the waiting times.
function recorder(behaviour) {
  const startedAt = []
  const t0 = Date.now()
  const fn = vi.fn((attempt) => {
    startedAt.push(Date.now() - t0)
    return behaviour(attempt)
  })
  return { fn, startedAt }
}

const alwaysFail = (attempt) => Promise.reject(new Error(`fail ${attempt}`))

// Runs `run`, then returns every "unhandled rejection" that Node reported.
// A rejected promise that nobody handles is a bug. We take over the listeners
// for a moment, so a leak becomes a clear test failure instead of crashing the run.
async function collectUnhandledRejections(run) {
  const seen = []
  const saved = process.listeners('unhandledRejection')
  process.removeAllListeners('unhandledRejection')
  process.on('unhandledRejection', (reason) => seen.push(reason))
  try {
    await run()
    await advance(0)
    await advance(0)
  } finally {
    process.removeAllListeners('unhandledRejection')
    for (const listener of saved) process.on('unhandledRejection', listener)
  }
  return seen
}

// ---------------------------------------------------------------------------
// retry: the basics
// ---------------------------------------------------------------------------

describe('12 retry: success', () => {
  it('resolves with the value of the first attempt when it succeeds', async () => {
    const { fn } = recorder(() => Promise.resolve('done'))
    const state = track(retry(fn))
    await advance(10_000)

    expectStatus(state, 'fulfilled')
    expect(state.value).toBe('done')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0) // nothing is left scheduled
  })

  it('calls fn with exactly one argument: the attempt number, starting at 1', async () => {
    const { fn } = recorder(alwaysFail)
    track(retry(fn))
    await advance(10_000)

    expect(fn.mock.calls).toEqual([[1], [2], [3], [4]])
  })

  it('retries after a failure and resolves with the value of the first success', async () => {
    const { fn } = recorder((attempt) =>
      attempt < 3 ? Promise.reject(new Error(`fail ${attempt}`)) : Promise.resolve('third time lucky'),
    )
    const state = track(retry(fn))
    await advance(10_000)

    expectStatus(state, 'fulfilled')
    expect(state.value).toBe('third time lucky')
    expect(fn).toHaveBeenCalledTimes(3) // it stops calling fn after a success
    expect(vi.getTimerCount()).toBe(0)
  })

  it('treats a synchronous throw as a failed attempt, and a plain return value as a success', async () => {
    const { fn } = recorder((attempt) => {
      if (attempt === 1) throw new Error('thrown synchronously')
      return 'plain value'
    })

    let promise
    expect(() => {
      promise = retry(fn)
    }).not.toThrow() // retry reports problems through the promise, never by throwing

    const state = track(promise)
    await advance(10_000)
    expectStatus(state, 'fulfilled')
    expect(state.value).toBe('plain value')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

// ---------------------------------------------------------------------------
// retry: waiting between attempts
// ---------------------------------------------------------------------------

describe('12 retry: waiting between attempts', () => {
  it('waits delay * factor^(attempt - 1): 100, 200, 400 ms with the defaults', async () => {
    const { fn, startedAt } = recorder(alwaysFail)
    track(retry(fn))
    await advance(10_000)

    // attempt 1 at 0, then +100, +200, +400
    expect(startedAt).toEqual([0, 100, 300, 700])
  })

  it('does not call fn again before the wait is over', async () => {
    const { fn } = recorder(alwaysFail)
    track(retry(fn))

    await advance(0)
    expect(fn).toHaveBeenCalledTimes(1) // the first attempt starts without waiting

    await advance(99) // t = 99
    expect(fn).toHaveBeenCalledTimes(1)
    await advance(1) // t = 100
    expect(fn).toHaveBeenCalledTimes(2)

    await advance(199) // t = 299
    expect(fn).toHaveBeenCalledTimes(2)
    await advance(1) // t = 300
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('uses a custom delay and factor', async () => {
    const { fn, startedAt } = recorder(alwaysFail)
    track(retry(fn, { retries: 3, delay: 10, factor: 3 }))
    await advance(10_000)

    // waits: 10, 30, 90
    expect(startedAt).toEqual([0, 10, 40, 130])
  })

  it('waits the same time every time when factor is 1', async () => {
    const { fn, startedAt } = recorder(alwaysFail)
    track(retry(fn, { retries: 3, delay: 50, factor: 1 }))
    await advance(10_000)

    expect(startedAt).toEqual([0, 50, 100, 150])
  })

  it('retries without waiting when delay is 0', async () => {
    const { fn, startedAt } = recorder(alwaysFail)
    const state = track(retry(fn, { retries: 2, delay: 0 }))
    await advance(10) // a timer with 0 ms may still need a tick or two of the fake clock

    expect(fn).toHaveBeenCalledTimes(3)
    expect(Math.max(...startedAt)).toBeLessThan(10) // all three attempts happened almost at once
    expectStatus(state, 'rejected')
  })

  it('keeps the default values for the options you leave out', async () => {
    const { fn, startedAt } = recorder(alwaysFail)
    track(retry(fn, { retries: 1 })) // delay is still 100
    await advance(10_000)

    expect(fn).toHaveBeenCalledTimes(2)
    expect(startedAt).toEqual([0, 100])
  })

  it('starts the wait when the attempt FAILS, not when it started', async () => {
    // Every attempt takes 50 ms to fail.
    const { fn, startedAt } = recorder((attempt) => failAfter(50, new Error(`fail ${attempt}`)))
    track(retry(fn, { retries: 2 }))
    await advance(10_000)

    // attempt 1: 0 -> fails at 50, wait 100 -> attempt 2 at 150, fails at 200, wait 200 -> attempt 3 at 400
    expect(startedAt).toEqual([0, 150, 400])
  })
})

// ---------------------------------------------------------------------------
// retry: giving up
// ---------------------------------------------------------------------------

describe('12 retry: giving up', () => {
  it('makes retries + 1 attempts (4 by default), then rejects with the LAST error', async () => {
    const errors = [1, 2, 3, 4].map((n) => new Error(`fail ${n}`))
    const { fn } = recorder((attempt) => Promise.reject(errors[attempt - 1]))
    const state = track(retry(fn))
    await advance(10_000)

    expect(fn).toHaveBeenCalledTimes(4)
    expectStatus(state, 'rejected')
    expect(state.reason).toBe(errors[3]) // the same object, not a copy or a wrapper
  })

  it('rejects right after the last failed attempt, without one more wait', async () => {
    const { fn } = recorder(alwaysFail)
    const state = track(retry(fn))

    await advance(699)
    expectStatus(state, 'pending')
    expect(fn).toHaveBeenCalledTimes(3)

    await advance(1) // t = 700: the 4th and last attempt runs and fails
    expect(fn).toHaveBeenCalledTimes(4)
    expectStatus(state, 'rejected')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('makes exactly one attempt when retries is 0', async () => {
    const { fn } = recorder(alwaysFail)
    const state = track(retry(fn, { retries: 0 }))
    await advance(0)

    expect(fn).toHaveBeenCalledTimes(1)
    expectStatus(state, 'rejected')
    expect(state.reason.message).toBe('fail 1')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('makes two attempts when retries is 1', async () => {
    const { fn } = recorder(alwaysFail)
    const state = track(retry(fn, { retries: 1 }))
    await advance(10_000)

    expect(fn).toHaveBeenCalledTimes(2)
    expect(state.reason.message).toBe('fail 2')
  })

  it('rethrows any kind of thrown value as it is', async () => {
    const weird = { code: 'E_WEIRD' }
    const { fn } = recorder(() => Promise.reject(weird))
    const state = track(retry(fn, { retries: 1 }))
    await advance(10_000)
    expect(state.reason).toBe(weird)

    const { fn: fn2 } = recorder(() => Promise.reject('just a string'))
    const state2 = track(retry(fn2, { retries: 1 }))
    await advance(10_000)
    expect(state2.reason).toBe('just a string')
  })
})

// ---------------------------------------------------------------------------
// retry: shouldRetry
// ---------------------------------------------------------------------------

describe('12 retry: shouldRetry', () => {
  it('stops at once, without waiting, when shouldRetry returns false', async () => {
    const { fn } = recorder(alwaysFail)
    const shouldRetry = vi.fn(() => false)
    const state = track(retry(fn, { shouldRetry }))
    await advance(0) // no time passes: it must already be over

    expect(fn).toHaveBeenCalledTimes(1)
    expectStatus(state, 'rejected')
    expect(state.reason.message).toBe('fail 1') // the error of the attempt that was refused
    expect(vi.getTimerCount()).toBe(0)
  })

  it('calls shouldRetry with the error that was just thrown (one argument)', async () => {
    const first = new Error('first')
    const second = new Error('second')
    const { fn } = recorder((attempt) => Promise.reject(attempt === 1 ? first : second))
    const shouldRetry = vi.fn(() => true)
    track(retry(fn, { retries: 2, shouldRetry }))
    await advance(10_000)

    expect(shouldRetry).toHaveBeenNthCalledWith(1, first)
    expect(shouldRetry).toHaveBeenNthCalledWith(2, second)
  })

  it('only asks shouldRetry while another attempt is still allowed', async () => {
    const { fn } = recorder(alwaysFail)
    const shouldRetry = vi.fn(() => true)
    track(retry(fn, { retries: 2, shouldRetry })) // 3 attempts in total
    await advance(10_000)

    expect(fn).toHaveBeenCalledTimes(3)
    expect(shouldRetry).toHaveBeenCalledTimes(2) // after attempt 1 and 2, not after the last one
  })

  it('can accept some errors and refuse others', async () => {
    const temporary = new Error('temporary')
    const fatal = new Error('fatal')
    const { fn, startedAt } = recorder((attempt) => Promise.reject(attempt < 3 ? temporary : fatal))
    const state = track(retry(fn, { retries: 10, shouldRetry: (error) => error === temporary }))
    await advance(10_000)

    expect(fn).toHaveBeenCalledTimes(3) // stopped at the fatal error, 7 retries were still left
    expect(startedAt).toEqual([0, 100, 300])
    expectStatus(state, 'rejected')
    expect(state.reason).toBe(fatal)
  })

  it('does not call shouldRetry when the attempt succeeds', async () => {
    const { fn } = recorder(() => Promise.resolve('ok'))
    const shouldRetry = vi.fn(() => true)
    const state = track(retry(fn, { shouldRetry }))
    await advance(10_000)

    expectStatus(state, 'fulfilled')
    expect(shouldRetry).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TimeoutError
// ---------------------------------------------------------------------------

describe('12 TimeoutError', () => {
  it('is an Error whose name is "TimeoutError" and which keeps its message', () => {
    const error = new TimeoutError('too slow')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(TimeoutError)
    expect(error.name).toBe('TimeoutError')
    expect(error.message).toBe('too slow')
    expect(String(error)).toBe('TimeoutError: too slow')
  })

  it('can be told apart from other errors, by class or by name', () => {
    const timeout = new TimeoutError('slow')
    const other = new Error('other')

    expect(timeout instanceof TimeoutError).toBe(true)
    expect(other instanceof TimeoutError).toBe(false)
    expect(timeout.name).not.toBe(other.name)
  })
})

// ---------------------------------------------------------------------------
// withTimeout
// ---------------------------------------------------------------------------

describe('12 withTimeout', () => {
  it('fulfills with the value when the promise fulfills in time', async () => {
    const state = track(withTimeout(delay(30, 'data'), 50))
    await advance(30)

    expectStatus(state, 'fulfilled')
    expect(state.value).toBe('data')
  })

  it('rejects with the same reason when the promise rejects in time', async () => {
    const boom = new Error('boom')
    const state = track(withTimeout(failAfter(10, boom), 50))
    await advance(10)

    expectStatus(state, 'rejected')
    expect(state.reason).toBe(boom) // not a TimeoutError, not wrapped
  })

  it('rejects with a TimeoutError exactly when ms have passed, with a default message', async () => {
    const state = track(withTimeout(never(), 50))

    await advance(49)
    expectStatus(state, 'pending')

    await advance(1)
    expectStatus(state, 'rejected')
    expect(state.reason).toBeInstanceOf(TimeoutError)
    expect(state.reason.name).toBe('TimeoutError')
    expect(state.reason.message).toBe('Timed out after 50ms')
  })

  it('uses your message when you pass one', async () => {
    const state = track(withTimeout(never(), 50, 'Request took too long'))
    await advance(50)

    expectStatus(state, 'rejected')
    expect(state.reason).toBeInstanceOf(TimeoutError)
    expect(state.reason.message).toBe('Request took too long')
  })

  it('clears its timer when the promise fulfills', async () => {
    const state = track(withTimeout(delay(10, 'x'), 1000))
    await advance(10)

    expectStatus(state, 'fulfilled')
    expect(vi.getTimerCount()).toBe(0) // the 1000 ms timer is gone

    await advance(5000)
    expectStatus(state, 'fulfilled')
  })

  it('clears its timer when the promise rejects', async () => {
    const state = track(withTimeout(failAfter(10, 'bad'), 1000))
    await advance(10)

    expectStatus(state, 'rejected')
    expect(state.reason).toBe('bad')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ignores the late result of a promise that finishes after the timeout', async () => {
    const state = track(withTimeout(delay(100, 'too late'), 50))
    await advance(1000)

    expectStatus(state, 'rejected')
    expect(state.reason).toBeInstanceOf(TimeoutError)
  })

  it('leaves no unhandled rejection when the promise rejects after the timeout', async () => {
    const unhandled = await collectUnhandledRejections(async () => {
      // Nobody else handles this promise. Your code must.
      const state = track(withTimeout(rawFailAfter(100, 'rejected too late'), 50))
      await advance(1000)
      expectStatus(state, 'rejected')
      expect(state.reason).toBeInstanceOf(TimeoutError)
    })
    expect(unhandled).toEqual([])
  })

  it('accepts a plain value or a thenable instead of a promise', async () => {
    const plain = track(withTimeout(42, 50))
    const thenable = track(withTimeout({ then: (resolve) => resolve('from thenable') }, 50))
    await advance(0)

    expect(plain.value).toBe(42)
    expect(thenable.value).toBe('from thenable')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('works with ms = 0: an already fulfilled promise wins, a pending one times out', async () => {
    const done = track(withTimeout(Promise.resolve('already done'), 0))
    await advance(0)
    expectStatus(done, 'fulfilled')
    expect(done.value).toBe('already done')

    const stuck = track(withTimeout(never(), 0))
    await advance(0)
    expectStatus(stuck, 'rejected')
    expect(stuck.reason).toBeInstanceOf(TimeoutError)
  })
})

// ---------------------------------------------------------------------------
// retry + withTimeout together
// ---------------------------------------------------------------------------

describe('12 retry and withTimeout together', () => {
  it('retries an attempt that hangs, because the timeout turns it into a failure', async () => {
    const { fn, startedAt } = recorder((attempt) =>
      withTimeout(attempt === 1 ? never() : delay(10, 'second attempt works'), 50),
    )
    const state = track(retry(fn))
    await advance(10_000)

    expectStatus(state, 'fulfilled')
    expect(state.value).toBe('second attempt works')
    // attempt 1 starts at 0 and times out at 50, wait 100, attempt 2 starts at 150
    expect(startedAt).toEqual([0, 150])
  })

  it('can retry only the timeouts and give up on other errors', async () => {
    const badRequest = new Error('400 bad request')
    const { fn } = recorder((attempt) => withTimeout(attempt === 1 ? never() : failAfter(5, badRequest), 50))
    const state = track(retry(fn, { retries: 5, shouldRetry: (error) => error instanceof TimeoutError }))
    await advance(10_000)

    expect(fn).toHaveBeenCalledTimes(2) // attempt 1 timed out (retried), attempt 2 got a real error (not retried)
    expectStatus(state, 'rejected')
    expect(state.reason).toBe(badRequest)
  })

  it('gives up with a TimeoutError when every attempt hangs', async () => {
    const { fn } = recorder(() => withTimeout(never(), 50, 'attempt timed out'))
    const state = track(retry(fn, { retries: 2, delay: 10 }))
    await advance(10_000)

    expect(fn).toHaveBeenCalledTimes(3)
    expectStatus(state, 'rejected')
    expect(state.reason).toBeInstanceOf(TimeoutError)
    expect(state.reason.message).toBe('attempt timed out')
  })
})
