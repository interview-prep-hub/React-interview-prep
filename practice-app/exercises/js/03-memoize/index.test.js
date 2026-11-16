import { memoize } from './index.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('03 memoize: default key (built from all arguments)', () => {
  it('returns what the original function returns and calls it once for the same arguments', () => {
    const square = vi.fn((n) => n * n)
    const memoSquare = memoize(square)

    expect(memoSquare(4)).toBe(16)
    expect(memoSquare(4)).toBe(16)
    expect(memoSquare(4)).toBe(16)
    expect(square).toHaveBeenCalledTimes(1)
  })

  it('passes every argument through to the original function', () => {
    const add = vi.fn((a, b, c) => a + b + c)
    const memoAdd = memoize(add)

    expect(memoAdd(1, 2, 3)).toBe(6)
    expect(add).toHaveBeenCalledWith(1, 2, 3)
  })

  it('computes each different argument once', () => {
    const double = vi.fn((n) => n * 2)
    const memoDouble = memoize(double)

    expect(memoDouble(1)).toBe(2)
    expect(memoDouble(2)).toBe(4)
    expect(memoDouble(1)).toBe(2)
    expect(memoDouble(2)).toBe(4)
    expect(double).toHaveBeenCalledTimes(2)
  })

  it('uses all arguments, not only the first one', () => {
    const add = vi.fn((a, b) => a + b)
    const memoAdd = memoize(add)

    expect(memoAdd(1, 2)).toBe(3)
    expect(memoAdd(1, 3)).toBe(4)
    expect(add).toHaveBeenCalledTimes(2)
  })

  it('treats a different argument order as a different call', () => {
    const subtract = vi.fn((a, b) => a - b)
    const memoSubtract = memoize(subtract)

    expect(memoSubtract(5, 2)).toBe(3)
    expect(memoSubtract(2, 5)).toBe(-3)
    expect(subtract).toHaveBeenCalledTimes(2)
  })

  it('keeps (1, 2), (12) and ("1,2") apart', () => {
    const describeArgs = vi.fn((...args) => `${args.length} args: ${args.join('|')}`)
    const memo = memoize(describeArgs)

    expect(memo(1, 2)).toBe('2 args: 1|2')
    expect(memo(12)).toBe('1 args: 12')
    expect(memo('1,2')).toBe('1 args: 1,2')
    expect(describeArgs).toHaveBeenCalledTimes(3)

    // All three are now cached, each under its own key.
    expect(memo(1, 2)).toBe('2 args: 1|2')
    expect(memo(12)).toBe('1 args: 12')
    expect(memo('1,2')).toBe('1 args: 1,2')
    expect(describeArgs).toHaveBeenCalledTimes(3)
  })

  it('keeps the number 1 and the string "1" apart', () => {
    const typeName = vi.fn((value) => typeof value)
    const memo = memoize(typeName)

    expect(memo(1)).toBe('number')
    expect(memo('1')).toBe('string')
    expect(typeName).toHaveBeenCalledTimes(2)
  })

  it('works with no arguments at all', () => {
    let counter = 0
    const next = vi.fn(() => ++counter)
    const memoNext = memoize(next)

    expect(memoNext()).toBe(1)
    expect(memoNext()).toBe(1)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('treats objects and arrays with the same content as the same arguments', () => {
    const getId = vi.fn((user) => user.id)
    const memoGetId = memoize(getId)

    expect(memoGetId({ id: 7 })).toBe(7)
    expect(memoGetId({ id: 7 })).toBe(7) // a brand new object with the same content
    expect(getId).toHaveBeenCalledTimes(1)

    const total = vi.fn((list) => list.reduce((sum, n) => sum + n, 0))
    const memoTotal = memoize(total)

    expect(memoTotal([1, 2, 3])).toBe(6)
    expect(memoTotal([1, 2, 3])).toBe(6)
    expect(total).toHaveBeenCalledTimes(1)
  })

  it('keeps objects and arrays with different content apart', () => {
    const getId = vi.fn((user) => user.id)
    const memoGetId = memoize(getId)

    expect(memoGetId({ id: 7 })).toBe(7)
    expect(memoGetId({ id: 8 })).toBe(8)
    expect(getId).toHaveBeenCalledTimes(2)

    const total = vi.fn((list) => list.reduce((sum, n) => sum + n, 0))
    const memoTotal = memoize(total)

    expect(memoTotal([1, 2, 3])).toBe(6)
    expect(memoTotal([1, 2, 4])).toBe(7)
    expect(total).toHaveBeenCalledTimes(2)
  })

  it('returns the very same object on a cache hit', () => {
    const makeBox = vi.fn((size) => ({ size }))
    const memoMakeBox = memoize(makeBox)

    const first = memoMakeBox(3)
    const second = memoMakeBox(3)

    expect(second).toBe(first)
    expect(makeBox).toHaveBeenCalledTimes(1)
  })
})

describe('03 memoize: custom resolver', () => {
  it('uses the key from the resolver instead of the arguments', () => {
    const loadName = vi.fn((user) => user.name)
    const memoLoadName = memoize(loadName, (user) => user.id)

    expect(memoLoadName({ id: 1, name: 'Ada' })).toBe('Ada')
    // Same id, different name: the cached answer wins.
    expect(memoLoadName({ id: 1, name: 'Grace' })).toBe('Ada')
    // Different id: computed again.
    expect(memoLoadName({ id: 2, name: 'Linus' })).toBe('Linus')
    expect(loadName).toHaveBeenCalledTimes(2)
  })

  it('calls the resolver with all the arguments, on every call', () => {
    const resolver = vi.fn((a, b) => `${a}-${b}`)
    const memo = memoize((a, b) => a + b, resolver)

    memo(1, 2)
    memo(1, 2)

    expect(resolver).toHaveBeenCalledTimes(2)
    expect(resolver).toHaveBeenNthCalledWith(1, 1, 2)
    expect(resolver).toHaveBeenNthCalledWith(2, 1, 2)
  })

  it('uses the resolver result as it is, without turning it into a string', () => {
    const fn = vi.fn((obj) => ({ copy: obj.value }))
    const memo = memoize(fn, (obj) => obj) // the key is the object itself

    const a = { value: 1 }
    const sameContentOtherObject = { value: 1 }

    const first = memo(a)
    expect(memo(a)).toBe(first) // same object reference: cache hit
    expect(fn).toHaveBeenCalledTimes(1)

    memo(sameContentOtherObject) // other reference: cache miss
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['0', 0],
    ['an empty string', ''],
    ['null', null],
    ['undefined', undefined],
    ['false', false],
  ])('accepts a falsy key from the resolver (%s) like any other key', (_label, key) => {
    const fn = vi.fn((n) => n * 2)
    const memo = memoize(fn, () => key) // every call gets the same key

    expect(memo(1)).toBe(2)
    expect(memo(2)).toBe(2) // different argument, same key: the cached answer wins
    expect(fn).toHaveBeenCalledTimes(1)
    expect(memo.cache.has(key)).toBe(true)
    expect(memo.cache.size).toBe(1)
  })

  it('lets the resolver ignore arguments that should not matter', () => {
    const fetchUser = vi.fn((id, options) => ({ id, verbose: options.verbose }))
    const memoFetchUser = memoize(fetchUser, (id) => id)

    memoFetchUser(1, { verbose: true })
    memoFetchUser(1, { verbose: false })

    expect(fetchUser).toHaveBeenCalledTimes(1)
  })
})

describe('03 memoize: the cache and clear()', () => {
  it('exposes the cache as a Map that grows with every new key', () => {
    const memo = memoize((n) => n * 2, (n) => `key-${n}`)

    expect(memo.cache).toBeInstanceOf(Map)
    expect(memo.cache.size).toBe(0)

    memo(1)
    memo(2)
    memo(1)

    expect(memo.cache.size).toBe(2)
    expect(memo.cache.get('key-1')).toBe(2)
    expect(memo.cache.get('key-2')).toBe(4)
  })

  it('keeps one entry for every distinct key, with no size limit', () => {
    const fn = vi.fn((n) => n * 2)
    const memo = memoize(fn)

    for (let n = 0; n < 500; n += 1) memo(n)
    expect(memo.cache.size).toBe(500)

    for (let n = 0; n < 500; n += 1) memo(n) // all of them are still cached
    expect(fn).toHaveBeenCalledTimes(500)
  })

  it('counts one entry per distinct call with the default key', () => {
    const memo = memoize((a, b) => a + b)

    memo(1, 2)
    memo(1, 2)
    memo(2, 1)

    expect(memo.cache.size).toBe(2)
  })

  it('clear() empties the same Map and the next call computes again', () => {
    const fn = vi.fn((n) => n + 1)
    const memo = memoize(fn)
    const cacheBefore = memo.cache

    memo(1)
    memo(2)
    expect(memo.cache.size).toBe(2)

    memo.clear()

    expect(memo.cache).toBe(cacheBefore)
    expect(memo.cache.size).toBe(0)

    expect(memo(1)).toBe(2)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('clear() on an empty cache does nothing and does not throw', () => {
    const memo = memoize((n) => n)

    expect(() => memo.clear()).not.toThrow()
    expect(memo.cache.size).toBe(0)
  })

  it('lets you delete one entry by hand so only that call is recomputed', () => {
    const fn = vi.fn((n) => n * 10)
    const memo = memoize(fn, (n) => `k${n}`)

    memo(1)
    memo(2)
    memo.cache.delete('k1')

    memo(1) // computed again
    memo(2) // still cached
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('returns a value that was put in the cache by hand', () => {
    const fn = vi.fn((n) => n * 10)
    const memo = memoize(fn, (n) => `k${n}`)

    memo.cache.set('k5', 'preset')

    expect(memo(5)).toBe('preset')
    expect(fn).not.toHaveBeenCalled()
  })

  it('gives every memoized function its own cache', () => {
    const fn = vi.fn((n) => n * 2)
    const first = memoize(fn)
    const second = memoize(fn)

    first(1)
    second(1)

    expect(first.cache).not.toBe(second.cache)
    expect(fn).toHaveBeenCalledTimes(2)

    first.clear()
    expect(second.cache.size).toBe(1)
  })
})

describe('03 memoize: edge cases', () => {
  it('caches undefined results too', () => {
    const fn = vi.fn(() => undefined)
    const memo = memoize(fn)

    expect(memo(1)).toBeUndefined()
    expect(memo(1)).toBeUndefined()
    expect(fn).toHaveBeenCalledTimes(1)
    expect(memo.cache.size).toBe(1)
  })

  it.each([
    ['zero', 0],
    ['null', null],
    ['an empty string', ''],
    ['false', false],
  ])('caches a falsy result (%s)', (_label, value) => {
    const fn = vi.fn(() => value)
    const memo = memoize(fn)

    expect(memo('x')).toBe(value)
    expect(memo('x')).toBe(value)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('keeps this, so it works as an object method', () => {
    const wallet = {
      base: 100,
      add: memoize(function (n) {
        return this.base + n
      }),
    }

    expect(wallet.add(5)).toBe(105)
    expect(wallet.add(5)).toBe(105)
  })

  it('hands the right this to the original function', () => {
    const original = vi.fn(function () {
      return this
    })
    const holder = { run: memoize(original) }

    expect(holder.run(1)).toBe(holder)
  })
})

describe('03 memoize: functions that return promises', () => {
  it('stores the promise itself and does not call the function again', async () => {
    const loadDouble = vi.fn(async (n) => n * 2)
    const memo = memoize(loadDouble)

    const first = memo(21)
    const second = memo(21)

    expect(second).toBe(first)
    expect(loadDouble).toHaveBeenCalledTimes(1)
    await expect(first).resolves.toBe(42)
    await expect(second).resolves.toBe(42)
  })

  it('shares one pending request between callers (fake timers)', async () => {
    vi.useFakeTimers()
    const slowDouble = vi.fn(
      (n) => new Promise((resolve) => setTimeout(() => resolve(n * 2), 1000)),
    )
    const memo = memoize(slowDouble)

    const first = memo(4)
    await vi.advanceTimersByTimeAsync(500) // still pending
    const second = memo(4) // asked again while the work is not finished
    expect(slowDouble).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(500)
    await expect(first).resolves.toBe(8)
    await expect(second).resolves.toBe(8)
    expect(slowDouble).toHaveBeenCalledTimes(1)
  })
})

describe('03 memoize: errors', () => {
  it('lets an error from the original function through and does not cache it', () => {
    let shouldFail = true
    const flaky = vi.fn((n) => {
      if (shouldFail) throw new Error('boom')
      return n * 2
    })
    const memo = memoize(flaky)

    expect(() => memo(2)).toThrow('boom')
    expect(memo.cache.size).toBe(0)

    shouldFail = false
    expect(memo(2)).toBe(4) // the earlier failure was not remembered
    expect(flaky).toHaveBeenCalledTimes(2)
  })

  it('lets an error from the resolver through and does not call the function', () => {
    const fn = vi.fn((n) => n)
    const memo = memoize(fn, () => {
      throw new Error('bad key')
    })

    expect(() => memo(1)).toThrow('bad key')
    expect(fn).not.toHaveBeenCalled()
  })

  it.each([
    ['undefined', undefined],
    ['a string', 'not a function'],
    ['an object', {}],
    ['null', null],
  ])('throws a TypeError when fn is %s', (_label, bad) => {
    expect(() => memoize(bad)).toThrow(TypeError)
  })

  it.each([
    ['a string', 'id'],
    ['a number', 42],
    ['zero', 0],
    ['an empty string', ''],
    ['an object', {}],
    ['null', null],
  ])('throws a TypeError when the resolver is %s', (_label, bad) => {
    expect(() => memoize((n) => n, bad)).toThrow(TypeError)
  })
})

describe('03 memoize: recursive fibonacci', () => {
  it('turns an exponential recursion into one call per number', () => {
    let computeCalls = 0
    // fib calls the MEMOIZED version of itself, that is the whole trick.
    const fib = memoize((n) => {
      computeCalls += 1
      // Safety net: without a working cache this recursion would run for
      // years, so fail fast with a clear message instead of freezing the tests.
      if (computeCalls > 200) {
        throw new Error('Too many calls: is the cache being used by the recursion?')
      }
      return n < 2 ? n : fib(n - 1) + fib(n - 2)
    })

    expect(fib(50)).toBe(12586269025)
    // Numbers 0, 1, ..., 50 are each computed exactly once.
    expect(computeCalls).toBe(51)

    // Already cached, so asking again (or for a smaller number) costs nothing.
    expect(fib(50)).toBe(12586269025)
    expect(fib(30)).toBe(832040)
    expect(computeCalls).toBe(51)
  })
})
