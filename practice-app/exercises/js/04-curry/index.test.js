import { curry, partial } from './index.js'

// A function that takes three arguments, adds them, and remembers every call.
// (A plain function is used on purpose: the tests rely on add3.length === 3.)
function makeAdd3() {
  const calls = []
  function add3(a, b, c) {
    calls.push([...arguments])
    return a + b + c
  }
  return { add3, calls }
}

describe('04 curry: supplying the arguments', () => {
  it.each([
    ['curried(1)(2)(3)', (curried) => curried(1)(2)(3)],
    ['curried(1, 2)(3)', (curried) => curried(1, 2)(3)],
    ['curried(1)(2, 3)', (curried) => curried(1)(2, 3)],
    ['curried(1, 2, 3)', (curried) => curried(1, 2, 3)],
  ])('%s gives the same answer as add3(1, 2, 3)', (_label, callIt) => {
    const { add3 } = makeAdd3()

    expect(callIt(curry(add3))).toBe(6)
  })

  it('keeps the order of the arguments', () => {
    const curried = curry((a, b, c) => `${a}-${b}-${c}`)

    expect(curried('x')('y')('z')).toBe('x-y-z')
    expect(curried('x', 'y')('z')).toBe('x-y-z')
  })

  it('returns a function until it has enough arguments', () => {
    const { add3 } = makeAdd3()
    const curried = curry(add3)

    expect(typeof curried).toBe('function')
    expect(typeof curried(1)).toBe('function')
    expect(typeof curried(1, 2)).toBe('function')
    expect(typeof curried(1)(2)).toBe('function')
    expect(typeof curried(1, 2, 3)).toBe('number')
  })

  it('does not call the original function before all arguments are there', () => {
    const { add3, calls } = makeAdd3()
    const curried = curry(add3)

    curried(1)
    curried(1, 2)
    curried(1)(2)
    expect(calls).toHaveLength(0)

    curried(1)(2)(3)
    expect(calls).toEqual([[1, 2, 3]])
  })

  it('works for a function with five parameters', () => {
    const curried = curry((a, b, c, d, e) => a + b + c + d + e)

    expect(curried(1)(2)(3)(4)(5)).toBe(15)
    expect(curried(1, 2)(3)(4, 5)).toBe(15)
    expect(curried(1, 2, 3, 4, 5)).toBe(15)
  })

  it('returns exactly what the original function returns', () => {
    const makePoint = curry((x, y) => ({ x, y }))

    expect(makePoint(1)(2)).toEqual({ x: 1, y: 2 })
    expect(curry((a, b) => `${a}${b}`)('a')('b')).toBe('ab')
  })
})

describe('04 curry: extra arguments', () => {
  it('passes extra arguments through to the original function', () => {
    const calls = []
    function three(a, b, c) {
      calls.push([...arguments])
    }
    const curried = curry(three)

    curried(1, 2, 3, 4)
    curried(1)(2, 3, 4)
    curried(1, 2)(3, 4)
    curried(1)(2)(3, 4)

    expect(calls).toEqual([
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
    ])
  })

  it('passes extra arguments that come with the first call too', () => {
    const calls = []
    function one(a) {
      calls.push([...arguments])
    }

    curry(one)('a', 'b', 'c')

    expect(calls).toEqual([['a', 'b', 'c']])
  })
})

describe('04 curry: calling with no arguments', () => {
  it('returns the very same function', () => {
    const { add3, calls } = makeAdd3()
    const curried = curry(add3)

    expect(curried()).toBe(curried)

    const afterOne = curried(1)
    expect(afterOne()).toBe(afterOne)

    const afterTwo = afterOne(2)
    expect(afterTwo()).toBe(afterTwo)

    expect(calls).toHaveLength(0)
  })

  it('does not lose the arguments collected so far', () => {
    const { add3 } = makeAdd3()
    const curried = curry(add3)

    expect(curried()(1)()(2)()(3)).toBe(6)
    expect(curried(1)()(2, 3)).toBe(6)
  })
})

describe('04 curry: reusing waiting functions', () => {
  it('lets one waiting function be called many times without the calls affecting each other', () => {
    const { add3 } = makeAdd3()
    const add = curry(add3)

    const addTo1 = add(1)
    const addTo1And2 = addTo1(2)

    expect(addTo1And2(3)).toBe(6)
    expect(addTo1And2(10)).toBe(13)
    expect(addTo1(5)(5)).toBe(11)
    expect(add(100)(200)(300)).toBe(600)
    // After all of that, the first waiting functions still behave the same.
    expect(addTo1(2)(3)).toBe(6)
    expect(add(1)(2)(3)).toBe(6)
  })

  it('calls the original function again every time a complete set of arguments arrives', () => {
    const { add3, calls } = makeAdd3()
    const addTo1And2 = curry(add3)(1, 2)

    addTo1And2(3)
    addTo1And2(4)

    expect(calls).toEqual([
      [1, 2, 3],
      [1, 2, 4],
    ])
  })

  it('builds specialised helpers from a general function', () => {
    const greet = curry((greeting, punctuation, name) => `${greeting}, ${name}${punctuation}`)
    const hello = greet('Hello')('!')

    expect(hello('Ada')).toBe('Hello, Ada!')
    expect(hello('Linus')).toBe('Hello, Linus!')
    expect(greet('Bye', '.', 'Grace')).toBe('Bye, Grace.')
  })
})

describe('04 curry: edge cases', () => {
  it('counts an explicit undefined as an argument', () => {
    const pair = curry((a, b) => [a, b])

    expect(pair(undefined)(2)).toEqual([undefined, 2])
    expect(pair(undefined, undefined)).toEqual([undefined, undefined])
  })

  it('accepts falsy values as normal arguments', () => {
    const pair = curry((a, b) => [a, b])

    expect(pair(0)('')).toEqual([0, ''])
    expect(pair(null)(false)).toEqual([null, false])
  })

  it('calls a function with no parameters immediately', () => {
    let timesCalled = 0
    const curried = curry(function () {
      timesCalled += 1
      return 42
    })

    expect(curried()).toBe(42)
    expect(timesCalled).toBe(1)
  })

  it('calls a function with one parameter as soon as it gets an argument', () => {
    const double = curry((n) => n * 2)

    expect(double(4)).toBe(8)
    expect(double()).toBe(double) // nothing to work with yet
  })
})

describe('04 curry: fn.length decides how many arguments are needed', () => {
  it('stops counting at the first parameter that has a default value', () => {
    // (a, b = 10) has length 1, so one argument is already "enough".
    const addWithDefault = curry((a, b = 10) => a + b)

    expect(addWithDefault(1)).toBe(11)
    expect(addWithDefault(1, 2)).toBe(3)
  })

  it('does not count a rest parameter', () => {
    const sum = (...numbers) => numbers.reduce((total, n) => total + n, 0)
    const curriedSum = curry(sum) // sum.length is 0

    expect(curriedSum(1, 2, 3)).toBe(6)
    expect(curriedSum()).toBe(0)

    const countRest = curry((first, ...rest) => rest.length) // length is 1
    expect(countRest(1, 2, 3)).toBe(2)
  })
})

describe('04 curry: errors', () => {
  it.each([
    ['undefined', undefined],
    ['a string', 'add'],
    ['a number', 42],
    ['an object', {}],
    ['null', null],
  ])('throws a TypeError when fn is %s', (_label, bad) => {
    expect(() => curry(bad)).toThrow(TypeError)
  })

  it('lets an error from the original function through', () => {
    const curried = curry(function failing(a, b) {
      throw new Error(`bad input ${a} ${b}`)
    })

    expect(() => curried(1)(2)).toThrow('bad input 1 2')
  })
})

describe('04 partial', () => {
  it('puts the preset arguments in front of the later ones', () => {
    const { add3, calls } = makeAdd3()

    expect(partial(add3, 1, 2)(3)).toBe(6)
    expect(partial(add3, 1)(2, 3)).toBe(6)
    expect(calls).toEqual([
      [1, 2, 3],
      [1, 2, 3],
    ])
  })

  it('works with no preset arguments', () => {
    const { add3, calls } = makeAdd3()

    expect(partial(add3)(1, 2, 3)).toBe(6)
    expect(calls).toEqual([[1, 2, 3]])
  })

  it('calls the original function on every call, even with too few arguments', () => {
    const { add3, calls } = makeAdd3()
    const addTo1 = partial(add3, 1)

    addTo1(2) // add3 would like three arguments, partial does not wait
    expect(calls).toEqual([[1, 2]])
  })

  it('does not call anything until the returned function is called', () => {
    const { add3, calls } = makeAdd3()

    partial(add3, 1, 2)
    expect(calls).toHaveLength(0)
  })

  it('can be called many times, each call starting from the same preset arguments', () => {
    const { add3, calls } = makeAdd3()
    const addTo1And2 = partial(add3, 1, 2)

    expect(addTo1And2(3)).toBe(6)
    expect(addTo1And2(4)).toBe(7)
    expect(addTo1And2(5)).toBe(8)
    expect(calls).toEqual([
      [1, 2, 3],
      [1, 2, 4],
      [1, 2, 5],
    ])
  })

  it('works with functions that take any number of arguments', () => {
    const atLeastFive = partial(Math.max, 5)

    expect(atLeastFive(3, 9)).toBe(9)
    expect(atLeastFive(3)).toBe(5)
    expect(atLeastFive()).toBe(5)
  })

  it('works together with curry', () => {
    const { add3 } = makeAdd3()
    const curried = curry(add3)

    expect(partial(curried, 1, 2)(3)).toBe(6)
    expect(partial(curried, 1)(2)(3)).toBe(6)
  })

  it.each([
    ['undefined', undefined],
    ['a string', 'add'],
    ['null', null],
  ])('throws a TypeError when fn is %s', (_label, bad) => {
    expect(() => partial(bad, 1)).toThrow(TypeError)
  })
})
