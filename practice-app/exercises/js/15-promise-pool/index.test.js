import { promisePool } from './index.js'

// Every task here is a fake async task that "takes" some milliseconds on a fake clock.
// Fake timers make the tests instant and never flaky: nothing waits for real time.
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// Moves the fake clock forward and lets all the promise callbacks run in between.
const tick = (ms) => vi.advanceTimersByTimeAsync(ms)

// Records how a promise ends, so a test can ask "is it settled yet?" at any moment.
function watch(promise) {
  const outcome = { status: 'pending', value: undefined, reason: undefined }
  Promise.resolve(promise).then(
    (value) => {
      outcome.status = 'fulfilled'
      outcome.value = value
    },
    (reason) => {
      outcome.status = 'rejected'
      outcome.reason = reason
    },
  )
  return outcome
}

// A little lab that builds fake tasks and records what they do.
function createLab() {
  const lab = {
    running: 0, // how many tasks are running right now
    maxRunning: 0, // the highest value `running` ever had
    started: [], // task ids, in the order the tasks were started
    finished: [], // task ids, in the order the tasks finished
  }

  // task(id, ms) resolves with `result-<id>` after `ms` fake milliseconds.
  // task(id, ms, error) rejects with `error` instead.
  lab.task = (id, ms, error) => () => {
    lab.started.push(id)
    lab.running += 1
    lab.maxRunning = Math.max(lab.maxRunning, lab.running)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        lab.running -= 1
        lab.finished.push(id)
        if (error) reject(error)
        else resolve(`result-${id}`)
      }, ms)
    })
  }

  return lab
}

describe('15 promisePool: results', () => {
  it('resolves with the results in INPUT order, even when the tasks finish in another order', async () => {
    const lab = createLab()
    const tasks = [lab.task(0, 30), lab.task(1, 10), lab.task(2, 20)]
    const outcome = watch(promisePool(tasks, 3))

    await tick(30)

    expect(lab.finished).toEqual([1, 2, 0]) // they really did finish in this order
    expect(outcome.status).toBe('fulfilled')
    expect(outcome.value).toEqual(['result-0', 'result-1', 'result-2'])
  })

  it('resolves with an empty array when there are no tasks', async () => {
    await expect(promisePool([], 3)).resolves.toEqual([])
  })

  it('accepts tasks that return a plain value, a promise, or come from an async function', async () => {
    const tasks = [() => 'plain', () => Promise.resolve('promise'), async () => 'async']
    await expect(promisePool(tasks, 2)).resolves.toEqual(['plain', 'promise', 'async'])
  })

  it('keeps falsy results (0, empty string, false, undefined, null) in their own place', async () => {
    const values = [0, '', false, undefined, null]
    const tasks = values.map((value) => () => Promise.resolve(value))
    await expect(promisePool(tasks, 2)).resolves.toStrictEqual(values)
  })

  it('calls every task exactly once, in input order', async () => {
    const lab = createLab()
    const tasks = [0, 1, 2, 3, 4].map((id) => lab.task(id, 10))
    const outcome = watch(promisePool(tasks, 2))

    await tick(100)

    expect(outcome.status).toBe('fulfilled')
    expect(lab.started).toEqual([0, 1, 2, 3, 4])
  })

  it('starts the first `limit` tasks synchronously, before the call returns', () => {
    const lab = createLab()
    const tasks = [0, 1, 2, 3].map((id) => lab.task(id, 10))

    promisePool(tasks, 2) // the promise is ignored on purpose, we only look at what started

    expect(lab.started).toEqual([0, 1])
  })
})

describe('15 promisePool: concurrency', () => {
  it.each([1, 2, 3, 4])('limit %i: never runs more tasks than the limit at once, and uses every slot', async (limit) => {
    const lab = createLab()
    const durations = [50, 10, 30, 20, 40, 10, 10, 30, 20, 10]
    const tasks = durations.map((ms, id) => lab.task(id, ms))
    const outcome = watch(promisePool(tasks, limit))

    await tick(1000)

    expect(outcome.status).toBe('fulfilled')
    expect(outcome.value).toHaveLength(durations.length)
    expect(lab.maxRunning).toBe(limit)
  })

  it('limit 1 runs the tasks strictly one after the other', async () => {
    const lab = createLab()
    const tasks = [lab.task(0, 30), lab.task(1, 10), lab.task(2, 20)]
    const outcome = watch(promisePool(tasks, 1))

    expect(lab.started).toEqual([0])
    await tick(30)
    expect(lab.started).toEqual([0, 1])
    await tick(10)
    expect(lab.started).toEqual([0, 1, 2])
    await tick(20)

    expect(outcome.status).toBe('fulfilled')
    expect(lab.maxRunning).toBe(1)
    expect(lab.finished).toEqual([0, 1, 2])
  })

  it('starts the next task as soon as one finishes, it does not wait for the others (no batches)', async () => {
    const lab = createLab()
    const tasks = [lab.task(0, 100), lab.task(1, 10), lab.task(2, 10), lab.task(3, 10)]
    const outcome = watch(promisePool(tasks, 2))

    expect(lab.started).toEqual([0, 1])

    await tick(10) // task 1 is done, so task 2 starts while task 0 is still running
    expect(lab.started).toEqual([0, 1, 2])

    await tick(10) // task 2 is done, so task 3 starts
    expect(lab.started).toEqual([0, 1, 2, 3])
    expect(outcome.status).toBe('pending') // task 0 is still running

    await tick(80)
    expect(outcome.status).toBe('fulfilled')
  })

  it('wastes no time: 4 tasks of 30 ms with limit 2 take exactly 60 ms', async () => {
    const lab = createLab()
    const tasks = [0, 1, 2, 3].map((id) => lab.task(id, 30))
    const outcome = watch(promisePool(tasks, 2))

    await tick(59)
    expect(outcome.status).toBe('pending')

    await tick(1)
    expect(outcome.status).toBe('fulfilled')
  })

  it('starts all tasks at once when the limit is bigger than the number of tasks', async () => {
    const lab = createLab()
    const tasks = [0, 1, 2].map((id) => lab.task(id, 10))
    const outcome = watch(promisePool(tasks, 10))

    expect(lab.started).toEqual([0, 1, 2])
    await tick(10)

    expect(outcome.status).toBe('fulfilled')
    expect(lab.maxRunning).toBe(3)
  })

  it('keeps separate state for separate pools that run at the same time', async () => {
    const lab = createLab()
    const poolA = [0, 1, 2, 3].map((id) => lab.task(`a${id}`, 10))
    const poolB = [0, 1, 2, 3].map((id) => lab.task(`b${id}`, 10))
    const outcomeA = watch(promisePool(poolA, 1))
    const outcomeB = watch(promisePool(poolB, 3))

    await tick(100)

    expect(lab.maxRunning).toBe(4) // 1 slot of pool A plus 3 slots of pool B
    expect(outcomeA.value).toEqual(['result-a0', 'result-a1', 'result-a2', 'result-a3'])
    expect(outcomeB.value).toEqual(['result-b0', 'result-b1', 'result-b2', 'result-b3'])
  })
})

describe('15 promisePool: the first failure stops the pool', () => {
  it('rejects with the error of the FIRST task that fails (first in time, not first in the array)', async () => {
    const lab = createLab()
    const early = new Error('early')
    const late = new Error('late')
    const tasks = [lab.task(0, 30, late), lab.task(1, 10, early), lab.task(2, 50)]
    const outcome = watch(promisePool(tasks, 3))

    await tick(100)

    expect(outcome.status).toBe('rejected')
    expect(outcome.reason).toBe(early)
  })

  it('rejects at once when a task fails, without waiting for slower tasks that are still running', async () => {
    const lab = createLab()
    const boom = new Error('boom')
    const tasks = [lab.task(0, 10, boom), lab.task(1, 1000)]
    const outcome = watch(promisePool(tasks, 2))

    await tick(10)

    expect(outcome.status).toBe('rejected')
    expect(outcome.reason).toBe(boom)
    expect(lab.running).toBe(1) // task 1 is still running, the pool just stopped waiting for it
  })

  it('starts no new task after a failure, not even when a slot becomes free later', async () => {
    const lab = createLab()
    const tasks = [
      lab.task(0, 10, new Error('boom')),
      lab.task(1, 50),
      lab.task(2, 5),
      lab.task(3, 5),
      lab.task(4, 5),
    ]
    const outcome = watch(promisePool(tasks, 2))

    await tick(10)
    expect(outcome.status).toBe('rejected')
    expect(lab.started).toEqual([0, 1])

    await tick(200) // task 1 finishes at t=50, which frees a slot, but nothing may start
    expect(lab.started).toEqual([0, 1])
  })

  it('treats a task that throws synchronously like a rejected task, and still returns a promise', async () => {
    const lab = createLab()
    const boom = new Error('sync boom')
    const tasks = [
      lab.task(0, 10),
      () => {
        throw boom
      },
      lab.task(2, 10),
    ]

    let promise
    expect(() => {
      promise = promisePool(tasks, 2)
    }).not.toThrow()
    const outcome = watch(promise)

    await tick(0)
    expect(outcome.status).toBe('rejected')
    expect(outcome.reason).toBe(boom)

    await tick(100)
    expect(lab.started).toEqual([0]) // task 2 never started
  })

  it('does not create unhandled rejections when running tasks fail after the pool has already rejected', async () => {
    const unhandled = []
    const onUnhandled = (reason) => unhandled.push(reason)
    process.on('unhandledRejection', onUnhandled)

    try {
      const lab = createLab()
      const first = new Error('first')
      const tasks = [
        lab.task(0, 10, first),
        lab.task(1, 20, new Error('second')),
        lab.task(2, 30, new Error('third')),
      ]
      const outcome = watch(promisePool(tasks, 3))

      await tick(200)
      await tick(0) // one more turn, so Node has time to report anything that was not handled

      expect(outcome.status).toBe('rejected')
      expect(outcome.reason).toBe(first) // later failures do not change the outcome
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }

    expect(unhandled).toEqual([])
  })
})

describe('15 promisePool: continueOnError', () => {
  it('resolves with {status, value} or {status, reason} objects, in input order', async () => {
    const lab = createLab()
    const err1 = new Error('one')
    const err3 = new Error('three')
    const tasks = [lab.task(0, 30), lab.task(1, 10, err1), lab.task(2, 20), lab.task(3, 5, err3)]
    const outcome = watch(promisePool(tasks, 2, { continueOnError: true }))

    await tick(200)

    expect(outcome.status).toBe('fulfilled')
    expect(outcome.value).toEqual([
      { status: 'fulfilled', value: 'result-0' },
      { status: 'rejected', reason: err1 },
      { status: 'fulfilled', value: 'result-2' },
      { status: 'rejected', reason: err3 },
    ])
    expect(outcome.value[1].reason).toBe(err1) // the same error object, not a copy
  })

  it('still runs every task after some of them fail', async () => {
    const lab = createLab()
    const tasks = [0, 1, 2, 3, 4, 5].map((id) => lab.task(id, 10, new Error(`fail ${id}`)))
    const outcome = watch(promisePool(tasks, 2, { continueOnError: true }))

    await tick(100)

    expect(outcome.status).toBe('fulfilled') // never rejects, even when every task fails
    expect(lab.started).toEqual([0, 1, 2, 3, 4, 5])
    expect(outcome.value.map((entry) => entry.status)).toEqual(Array(6).fill('rejected'))
  })

  it('still respects the limit', async () => {
    const lab = createLab()
    const tasks = [0, 1, 2, 3, 4, 5, 6, 7].map((id) =>
      lab.task(id, 10 + id, id % 2 === 0 ? new Error(`fail ${id}`) : undefined),
    )
    const outcome = watch(promisePool(tasks, 3, { continueOnError: true }))

    await tick(200)

    expect(outcome.status).toBe('fulfilled')
    expect(outcome.value).toHaveLength(8)
    expect(lab.maxRunning).toBe(3)
  })

  it('records a task that throws synchronously as a rejected entry', async () => {
    const boom = new Error('sync boom')
    const tasks = [
      () => 'ok',
      () => {
        throw boom
      },
      async () => 'also ok',
    ]

    const results = await promisePool(tasks, 2, { continueOnError: true })

    expect(results).toEqual([
      { status: 'fulfilled', value: 'ok' },
      { status: 'rejected', reason: boom },
      { status: 'fulfilled', value: 'also ok' },
    ])
  })

  it('resolves with an empty array when there are no tasks', async () => {
    await expect(promisePool([], 2, { continueOnError: true })).resolves.toEqual([])
  })

  it('continueOnError: false, or an empty options object, behaves like the default (first failure rejects)', async () => {
    const boom = new Error('boom')
    const makeTasks = () => [() => Promise.reject(boom), () => Promise.resolve('fine')]

    await expect(promisePool(makeTasks(), 1, { continueOnError: false })).rejects.toBe(boom)
    await expect(promisePool(makeTasks(), 1, {})).rejects.toBe(boom)
  })
})

describe('15 promisePool: validation', () => {
  it.each([0, -1, 1.5, NaN, Infinity, '2', null, undefined])(
    'rejects with a RangeError when limit is %s, and starts no task',
    async (limit) => {
      const lab = createLab()
      const promise = promisePool([lab.task(0, 10), lab.task(1, 10)], limit)

      await expect(promise).rejects.toBeInstanceOf(RangeError)
      expect(lab.started).toEqual([])
    },
  )

  it('checks the limit even when there are no tasks', async () => {
    await expect(promisePool([], 0)).rejects.toBeInstanceOf(RangeError)
  })

  it.each([undefined, null, {}, 'abc', 42, new Set()])(
    'rejects with a TypeError when tasks is %s instead of an array',
    async (tasks) => {
      await expect(promisePool(tasks, 2)).rejects.toBeInstanceOf(TypeError)
    },
  )

  it('rejects with a TypeError, and starts nothing, when an item in tasks is not a function', async () => {
    const lab = createLab()
    const promise = promisePool([lab.task(0, 10), 'not a function', lab.task(2, 10)], 3)

    await expect(promise).rejects.toBeInstanceOf(TypeError)
    expect(lab.started).toEqual([])
  })

  it('rejects the returned promise for bad input, it never throws synchronously', async () => {
    let promise
    expect(() => {
      promise = promisePool('nope', 0)
    }).not.toThrow()

    expect(promise).toBeInstanceOf(Promise)
    await expect(promise).rejects.toThrow() // any error will do here, the other tests check which one
  })
})
