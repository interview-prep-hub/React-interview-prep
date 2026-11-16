import { promiseAll, promiseAllSettled, promiseRace, promiseAny } from './index.js'

// Fake timers: nothing here waits for real time, so the tests are instant and
// never flaky. Advancing the fake clock also lets pending promise callbacks run.
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Lets every pending promise callback run (and fires timers due right now).
const flush = () => vi.advanceTimersByTimeAsync(0)

// A promise you settle by hand: call resolve(...) or reject(...) when you want.
function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  promise.catch(() => {}) // the test's own inputs never count as "unhandled"
  return { promise, resolve, reject }
}

// A promise that fulfills / rejects after `ms` ms of (fake) time.
const delay = (ms, value) => new Promise((resolve) => setTimeout(resolve, ms, value))
const rawFailAfter = (ms, reason) => new Promise((_, reject) => setTimeout(reject, ms, reason))
function failAfter(ms, reason) {
  const promise = rawFailAfter(ms, reason)
  promise.catch(() => {}) // the test's own inputs never count as "unhandled"
  return promise
}

// An already rejected promise that the test has marked as handled.
function rejected(reason) {
  const promise = Promise.reject(reason)
  promise.catch(() => {})
  return promise
}

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

// Track a promise, let all the microtasks run, and report how it ended.
async function outcome(promise) {
  const state = track(promise)
  await flush()
  return state
}

// Checks how a tracked promise ended. When it rejected although the test did not
// expect that, the failure message shows the reason, which helps you debug.
function expectStatus(state, expected) {
  const reason = state.status === 'rejected' && expected !== 'rejected' ? ` (reason: ${String(state.reason)})` : ''
  expect(state.status, `the promise is ${state.status}${reason}, expected ${expected}`).toBe(expected)
}

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
    await flush()
    await flush()
  } finally {
    process.removeAllListeners('unhandledRejection')
    for (const listener of saved) process.on('unhandledRejection', listener)
  }
  return seen
}

const all = [
  ['promiseAll', promiseAll],
  ['promiseAllSettled', promiseAllSettled],
  ['promiseRace', promiseRace],
  ['promiseAny', promiseAny],
]

// ---------------------------------------------------------------------------
// promiseAll
// ---------------------------------------------------------------------------

describe('11 promiseAll', () => {
  it('resolves with the values in input order', async () => {
    const state = await outcome(promiseAll([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]))
    expectStatus(state, 'fulfilled')
    expect(state.value).toEqual([1, 2, 3])
    expect(Array.isArray(state.value)).toBe(true)
  })

  it('keeps input order even when the promises fulfill in a different order', async () => {
    const a = deferred()
    const b = deferred()
    const c = deferred()
    const state = track(promiseAll([a.promise, b.promise, c.promise]))

    c.resolve('c') // the LAST input fulfills first
    await flush()
    expectStatus(state, 'pending')

    a.resolve('a')
    await flush()
    expectStatus(state, 'pending') // b is still missing

    b.resolve('b')
    await flush()
    expectStatus(state, 'fulfilled')
    expect(state.value).toEqual(['a', 'b', 'c'])
  })

  it('accepts plain values and promises mixed together', async () => {
    const state = track(promiseAll([1, 'two', Promise.resolve(3), delay(10, 4)]))
    await flush()
    expectStatus(state, 'pending') // the timer based promise is not done yet

    await vi.advanceTimersByTimeAsync(10)
    expectStatus(state, 'fulfilled')
    expect(state.value).toEqual([1, 'two', 3, 4])
  })

  it('resolves with an empty array when the input is empty', async () => {
    const state = await outcome(promiseAll([]))
    expectStatus(state, 'fulfilled')
    expect(state.value).toEqual([])
  })

  it('rejects at once with the reason of the first rejection (fail-fast)', async () => {
    const slow = deferred() // never settles in this test
    const bad = deferred()
    const boom = new Error('boom')
    const state = track(promiseAll([slow.promise, bad.promise]))

    bad.reject(boom)
    await flush()

    expectStatus(state, 'rejected') // did not wait for `slow`
    expect(state.reason).toBe(boom)
  })

  it('ignores everything that happens after the first rejection', async () => {
    const a = deferred()
    const b = deferred()
    const c = deferred()
    const state = track(promiseAll([a.promise, b.promise, c.promise]))

    b.reject('first failure')
    await flush()
    a.reject('second failure')
    c.resolve('late success')
    await flush()

    expectStatus(state, 'rejected')
    expect(state.reason).toBe('first failure')
  })

  it('stays pending while any input is still pending', async () => {
    const waiting = deferred()
    const state = track(promiseAll([1, Promise.resolve(2), waiting.promise]))

    await vi.advanceTimersByTimeAsync(60_000)
    expectStatus(state, 'pending')

    waiting.resolve(3)
    await flush()
    expect(state.value).toEqual([1, 2, 3])
  })

  it('accepts any iterable, not only arrays', async () => {
    function* numbers() {
      yield 1
      yield Promise.resolve(2)
      yield 3
    }

    expect((await outcome(promiseAll(new Set([1, 2, 3])))).value).toEqual([1, 2, 3])
    expect((await outcome(promiseAll(numbers()))).value).toEqual([1, 2, 3])
    expect((await outcome(promiseAll('abc'))).value).toEqual(['a', 'b', 'c'])
  })

  it('waits for thenables (objects with a then method)', async () => {
    const thenable = {
      then(resolve) {
        resolve('from thenable')
      },
    }
    const state = await outcome(promiseAll([thenable, 'plain']))
    expect(state.value).toEqual(['from thenable', 'plain'])
  })

  it('handles a big input', async () => {
    const input = Array.from({ length: 5000 }, (_, i) => (i % 2 === 0 ? i : Promise.resolve(i)))
    const state = await outcome(promiseAll(input))
    expectStatus(state, 'fulfilled')
    expect(state.value).toHaveLength(5000)
    expect(state.value[0]).toBe(0)
    expect(state.value[4999]).toBe(4999)
  })
})

// ---------------------------------------------------------------------------
// promiseAllSettled
// ---------------------------------------------------------------------------

describe('11 promiseAllSettled', () => {
  it('reports every outcome as { status, value } or { status, reason }, in input order', async () => {
    const error = new Error('nope')
    const state = await outcome(promiseAllSettled([Promise.resolve('ok'), rejected(error), 3]))

    expectStatus(state, 'fulfilled')
    expect(state.value).toStrictEqual([
      { status: 'fulfilled', value: 'ok' },
      { status: 'rejected', reason: error },
      { status: 'fulfilled', value: 3 },
    ])
  })

  it('never rejects, even when every input rejects', async () => {
    const state = await outcome(promiseAllSettled([rejected('a'), rejected('b')]))
    expectStatus(state, 'fulfilled')
    expect(state.value).toStrictEqual([
      { status: 'rejected', reason: 'a' },
      { status: 'rejected', reason: 'b' },
    ])
  })

  it('does not fail fast: it waits for the slowest input', async () => {
    const slow = deferred()
    const state = track(promiseAllSettled([rejected('early failure'), slow.promise]))

    await vi.advanceTimersByTimeAsync(60_000)
    expectStatus(state, 'pending')

    slow.resolve('finally')
    await flush()
    expectStatus(state, 'fulfilled')
    expect(state.value).toStrictEqual([
      { status: 'rejected', reason: 'early failure' },
      { status: 'fulfilled', value: 'finally' },
    ])
  })

  it('keeps input order when inputs settle in a different order', async () => {
    const state = track(
      promiseAllSettled([delay(30, 'slow'), failAfter(10, 'fast failure'), delay(20, 'middle')]),
    )
    await vi.advanceTimersByTimeAsync(30)
    expect(state.value).toStrictEqual([
      { status: 'fulfilled', value: 'slow' },
      { status: 'rejected', reason: 'fast failure' },
      { status: 'fulfilled', value: 'middle' },
    ])
  })

  it('treats plain values as fulfilled and resolves [] for empty input', async () => {
    expect((await outcome(promiseAllSettled([1, 'a']))).value).toStrictEqual([
      { status: 'fulfilled', value: 1 },
      { status: 'fulfilled', value: 'a' },
    ])
    const empty = await outcome(promiseAllSettled([]))
    expectStatus(empty, 'fulfilled')
    expect(empty.value).toEqual([])
  })

  it('keeps falsy values and reasons (the keys must still exist)', async () => {
    const state = await outcome(promiseAllSettled([undefined, 0, rejected(undefined), rejected(0)]))
    expect(state.value).toStrictEqual([
      { status: 'fulfilled', value: undefined },
      { status: 'fulfilled', value: 0 },
      { status: 'rejected', reason: undefined },
      { status: 'rejected', reason: 0 },
    ])
  })

  it('accepts any iterable', async () => {
    function* values() {
      yield 'x'
      yield rejected('y')
    }
    expect((await outcome(promiseAllSettled(new Set(['a'])))).value).toStrictEqual([
      { status: 'fulfilled', value: 'a' },
    ])
    expect((await outcome(promiseAllSettled(values()))).value).toStrictEqual([
      { status: 'fulfilled', value: 'x' },
      { status: 'rejected', reason: 'y' },
    ])
  })
})

// ---------------------------------------------------------------------------
// promiseRace
// ---------------------------------------------------------------------------

describe('11 promiseRace', () => {
  it('fulfills with the value of the first input to fulfill', async () => {
    const state = track(promiseRace([delay(30, 'slow'), delay(10, 'fast'), delay(20, 'middle')]))

    await vi.advanceTimersByTimeAsync(9)
    expectStatus(state, 'pending')

    await vi.advanceTimersByTimeAsync(1)
    expectStatus(state, 'fulfilled')
    expect(state.value).toBe('fast')

    await vi.advanceTimersByTimeAsync(100) // later finishers change nothing
    expect(state.value).toBe('fast')
  })

  it('rejects when the first input to settle rejects, even if others would fulfill later', async () => {
    const state = track(promiseRace([delay(20, 'late success'), failAfter(10, 'early failure')]))
    await vi.advanceTimersByTimeAsync(10)
    expectStatus(state, 'rejected')
    expect(state.reason).toBe('early failure')

    await vi.advanceTimersByTimeAsync(100)
    expectStatus(state, 'rejected')
    expect(state.reason).toBe('early failure')
  })

  it('ignores a rejection that comes after the winner', async () => {
    const state = track(promiseRace([delay(10, 'winner'), failAfter(20, 'too late')]))
    await vi.advanceTimersByTimeAsync(50)
    expectStatus(state, 'fulfilled')
    expect(state.value).toBe('winner')
  })

  it('lets a plain value beat a promise that is still pending', async () => {
    const never = new Promise(() => {})
    const state = await outcome(promiseRace([never, 'plain']))
    expectStatus(state, 'fulfilled')
    expect(state.value).toBe('plain')
  })

  it('gives ties to the input that comes first', async () => {
    expect((await outcome(promiseRace([1, 2, 3]))).value).toBe(1)
    expect((await outcome(promiseRace([Promise.resolve('a'), 'b']))).value).toBe('a')
  })

  it('never settles when the input is empty', async () => {
    const state = track(promiseRace([]))
    await vi.advanceTimersByTimeAsync(60_000)
    expectStatus(state, 'pending')
  })

  it('accepts any iterable and thenables', async () => {
    function* inputs() {
      yield new Promise(() => {})
      yield { then: (resolve) => resolve('thenable wins') }
    }
    expect((await outcome(promiseRace(new Set(['only'])))).value).toBe('only')
    expect((await outcome(promiseRace(inputs()))).value).toBe('thenable wins')
  })
})

// ---------------------------------------------------------------------------
// promiseAny
// ---------------------------------------------------------------------------

describe('11 promiseAny', () => {
  it('resolves with the first value that fulfills', async () => {
    const state = track(promiseAny([delay(30, 'slow'), delay(10, 'fast')]))
    await vi.advanceTimersByTimeAsync(10)
    expectStatus(state, 'fulfilled')
    expect(state.value).toBe('fast')
  })

  it('skips rejections: a later fulfillment still wins', async () => {
    const state = track(promiseAny([failAfter(10, 'early failure'), delay(20, 'success')]))

    await vi.advanceTimersByTimeAsync(10)
    expectStatus(state, 'pending') // one rejection is not the end

    await vi.advanceTimersByTimeAsync(10)
    expectStatus(state, 'fulfilled')
    expect(state.value).toBe('success')
  })

  it('rejects with an AggregateError when every input rejects, errors in INPUT order', async () => {
    const state = track(
      promiseAny([failAfter(30, 'first input'), failAfter(10, 'second input'), failAfter(20, 'third input')]),
    )

    await vi.advanceTimersByTimeAsync(29)
    expectStatus(state, 'pending') // waits for the last rejection

    await vi.advanceTimersByTimeAsync(1)
    expectStatus(state, 'rejected')
    expect(state.reason).toBeInstanceOf(AggregateError)
    expect(state.reason.errors).toEqual(['first input', 'second input', 'third input'])
  })

  it('keeps any kind of rejection reason as it is', async () => {
    const error = new Error('real error')
    const state = await outcome(promiseAny([rejected(error), rejected(undefined), rejected(0)]))
    expectStatus(state, 'rejected')
    expect(state.reason.errors).toEqual([error, undefined, 0])
  })

  it('rejects with an AggregateError with no errors when the input is empty', async () => {
    const state = await outcome(promiseAny([]))
    expectStatus(state, 'rejected')
    expect(state.reason).toBeInstanceOf(AggregateError)
    expect(state.reason.errors).toEqual([])
  })

  it('treats plain values as fulfilled', async () => {
    const state = await outcome(promiseAny([rejected('no'), 'plain', delay(10, 'later')]))
    expectStatus(state, 'fulfilled')
    expect(state.value).toBe('plain')
  })

  it('ignores rejections that arrive after the winner', async () => {
    const state = track(promiseAny([delay(10, 'winner'), failAfter(20, 'too late')]))
    await vi.advanceTimersByTimeAsync(50)
    expectStatus(state, 'fulfilled')
    expect(state.value).toBe('winner')
  })

  it('accepts any iterable and thenables', async () => {
    function* inputs() {
      yield rejected('x')
      yield { then: (resolve) => resolve('from thenable') }
    }
    expect((await outcome(promiseAny(new Set(['only'])))).value).toBe('only')
    expect((await outcome(promiseAny(inputs()))).value).toBe('from thenable')
  })
})

// ---------------------------------------------------------------------------
// Rules that apply to all four functions
// ---------------------------------------------------------------------------

describe('11 rules for all four functions', () => {
  it.each(all)('%s rejects with a TypeError (and does not throw) for input that is not iterable', async (name, combinator) => {
    for (const notIterable of [42, null, undefined, { length: 1 }]) {
      let promise
      expect(() => {
        promise = combinator(notIterable)
      }).not.toThrow()

      const state = await outcome(promise)
      expectStatus(state, 'rejected')
      expect(state.reason).toBeInstanceOf(TypeError)
    }
  })

  it.each(all)('%s does not use the built-in Promise combinators', async (name, combinator) => {
    // Spy on the four built-ins while the function runs. The spies still call
    // the real method, so a wrong solution is caught but nothing else breaks.
    const spies = ['all', 'allSettled', 'race', 'any'].map((method) => vi.spyOn(Promise, method))
    let promise
    let calls
    try {
      promise = combinator([1, Promise.resolve(2)])
      calls = spies.map((spy) => spy.mock.calls.length)
    } finally {
      spies.forEach((spy) => spy.mockRestore())
    }
    expect(calls).toEqual([0, 0, 0, 0])

    // The function must also really work for this input.
    expectStatus(await outcome(promise), 'fulfilled')
  })

  it.each(all)('%s leaves no rejection unhandled', async (name, combinator) => {
    // Three inputs that all reject, one after the other. Nobody but your code
    // handles them. Whichever one your function reacts to first, EVERY rejection
    // must be handled by it.
    const unhandled = await collectUnhandledRejections(async () => {
      const state = track(combinator([rawFailAfter(10, 'a'), rawFailAfter(20, 'b'), rawFailAfter(30, 'c')]))
      await vi.advanceTimersByTimeAsync(30)
      expect(state.status).not.toBe('pending') // all, allSettled, race and any all settle by now
    })
    expect(unhandled).toEqual([])
  })
})
