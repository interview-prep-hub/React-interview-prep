import { myCall, myApply, myBind, myNew, myInstanceOf } from './index.js'

// A few tests use setTimeout, so the clock is fake: nothing waits for real time.
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Runs `run()` while Function.prototype.call, apply, bind, Reflect.apply and
// Reflect.construct are watched. Returns the names that were used. The callback
// must be synchronous and must not use these helpers itself.
function usedNativeHelpers(run) {
  const reflectApply = Reflect.apply // keep the real one for the watchers below
  const watched = [
    [Function.prototype, 'call', 'Function.prototype.call'],
    [Function.prototype, 'apply', 'Function.prototype.apply'],
    [Function.prototype, 'bind', 'Function.prototype.bind'],
    [Reflect, 'apply', 'Reflect.apply'],
    [Reflect, 'construct', 'Reflect.construct'],
  ]
  const originals = watched.map(([target, name]) => target[name])
  const used = []

  watched.forEach(([target, name, label], index) => {
    target[name] = function watcher(...args) {
      used.push(label)
      return reflectApply(originals[index], this, args)
    }
  })

  try {
    run()
  } finally {
    watched.forEach(([target, name], index) => {
      target[name] = originals[index]
    })
  }
  return used
}

// Returns whatever `run` throws (or undefined when it does not throw).
function thrownBy(run) {
  try {
    run()
  } catch (error) {
    return error
  }
  return undefined
}

// A classic constructor function, written in the old (ES5) way on purpose.
function Point(x, y) {
  this.x = x
  this.y = y
}
Point.prototype.sum = function sum() {
  return this.x + this.y
}

// ---------------------------------------------------------------------------
// myApply
// ---------------------------------------------------------------------------

describe('16 myApply', () => {
  it('runs fn with `this` set to ctx and the array items as arguments', () => {
    function greet(greeting, punctuation) {
      return `${greeting}, ${this.name}${punctuation}`
    }
    expect(myApply(greet, { name: 'Ann' }, ['Hello', '!'])).toBe('Hello, Ann!')
  })

  it('uses the very same ctx object (changes made through `this` stay visible)', () => {
    const ctx = { count: 0 }
    function increment(by) {
      this.count += by
      return this
    }
    expect(myApply(increment, ctx, [5])).toBe(ctx)
    expect(ctx.count).toBe(5)
  })

  it('returns whatever fn returns, including undefined', () => {
    expect(myApply(() => 42, {}, [])).toBe(42)
    expect(myApply(() => {}, {}, [])).toBeUndefined()
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty array', []],
  ])('passes no arguments when argsArray is %s', (_label, argsArray) => {
    function countArguments() {
      return arguments.length
    }
    expect(myApply(countArguments, {}, argsArray)).toBe(0)
  })

  it('accepts an array-like argsArray, such as `arguments`', () => {
    function maxOfArguments() {
      return myApply(Math.max, null, arguments)
    }
    expect(maxOfArguments(3, 9, 4)).toBe(9)

    function joinAll(...parts) {
      return parts.join('-')
    }
    expect(myApply(joinAll, null, { length: 3, 0: 'a', 1: 'b', 2: 'c' })).toBe('a-b-c')
  })

  it('does not change the argsArray it is given', () => {
    const args = [1, 2, 3]
    expect(myApply((...all) => all.reverse(), null, args)).toEqual([3, 2, 1])
    expect(args).toEqual([1, 2, 3])
  })

  it.each([
    ['a number', 5],
    ['a string', 'abc'],
    ['a boolean', true],
  ])('throws a TypeError when argsArray is %s', (_label, argsArray) => {
    expect(() => myApply(() => {}, {}, argsArray)).toThrow(TypeError)
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an object', {}],
    ['a string', 'fn'],
    ['a number', 5],
  ])('throws a TypeError when fn is %s', (_label, fn) => {
    expect(() => myApply(fn, {}, [])).toThrow(TypeError)
  })

  it('works for the classic uses: Math.max with an array, and borrowing an array method', () => {
    expect(myApply(Math.max, null, [3, 9, 4])).toBe(9)
    expect(myApply(Math.min, null, [3, 9, 4])).toBe(3)

    const arrayLike = { 0: 'a', 1: 'b', 2: 'c', length: 3 }
    expect(myApply(Array.prototype.slice, arrayLike, [1])).toEqual(['b', 'c'])
  })
})

// ---------------------------------------------------------------------------
// myCall
// ---------------------------------------------------------------------------

describe('16 myCall', () => {
  it('runs fn with `this` set to ctx and the extra arguments one by one', () => {
    function describeCar(year, color) {
      return `${this.brand} ${year} ${color}`
    }
    expect(myCall(describeCar, { brand: 'Fiat' }, 2020, 'red')).toBe('Fiat 2020 red')
  })

  it('passes any number of arguments, also none at all', () => {
    const collect = (...all) => all
    expect(myCall(collect, null)).toEqual([])
    expect(myCall(collect, null, 1, 2, 3, 4, 5, 6)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('returns the return value of fn and lets errors from fn pass through unchanged', () => {
    expect(myCall(function () { return this.value }, { value: 7 })).toBe(7)

    const boom = new Error('boom')
    const thrown = thrownBy(() =>
      myCall(() => {
        throw boom
      }, {}),
    )
    expect(thrown).toBe(boom)
  })

  it('uses the real ctx object, so `this` can be compared and changed', () => {
    const ctx = { items: [] }
    function add(item) {
      this.items.push(item)
      return this
    }
    expect(myCall(add, ctx, 'a')).toBe(ctx)
    expect(ctx.items).toEqual(['a'])
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('uses the global object as `this` when ctx is %s', (_label, ctx) => {
    function whoAmI() {
      return this
    }
    expect(myCall(whoAmI, ctx)).toBe(globalThis)
  })

  it('wraps a primitive ctx in an object, so numbers and strings work as `this`', () => {
    function doubled() {
      return this * 2
    }
    function shout() {
      return this.toUpperCase()
    }
    expect(myCall(doubled, 21)).toBe(42)
    expect(myCall(shout, 'abc')).toBe('ABC')
  })

  it('leaves the ctx object exactly as it was, with no extra keys (not even symbols)', () => {
    const ctx = { a: 1, b: 2 }
    const keysBefore = Reflect.ownKeys(ctx)
    expect(myCall(function () { return this.a }, ctx)).toBe(1)
    expect(Reflect.ownKeys(ctx)).toEqual(keysBefore)
    expect(ctx).toEqual({ a: 1, b: 2 })
  })

  it('also cleans up when fn throws', () => {
    const ctx = { a: 1 }
    expect(() =>
      myCall(function () {
        throw new Error('fail')
      }, ctx),
    ).toThrow('fail')
    expect(Reflect.ownKeys(ctx)).toEqual(['a'])
  })

  it('hides its helper property while fn runs (Object.keys, for...in and JSON.stringify do not see it)', () => {
    function inspect() {
      const forIn = []
      for (const key in this) forIn.push(key)
      return { keys: Object.keys(this), forIn, json: JSON.stringify(this) }
    }
    expect(myCall(inspect, { a: 1, b: 2 })).toEqual({
      keys: ['a', 'b'],
      forIn: ['a', 'b'],
      json: '{"a":1,"b":2}',
    })
  })

  it('never overwrites or deletes a real property of ctx, whatever its name', () => {
    const ctx = { fn: 'mine', __fn__: 'also mine', temp: 'still here', method: 'm' }
    expect(myCall(function () { return [this.fn, this.__fn__, this.temp, this.method] }, ctx)).toEqual([
      'mine',
      'also mine',
      'still here',
      'm',
    ])
    expect(ctx).toEqual({ fn: 'mine', __fn__: 'also mine', temp: 'still here', method: 'm' })
  })

  it('works when fn calls myCall again on the same object', () => {
    const ctx = { n: 1 }
    function inner() {
      return this.n + 1
    }
    function outer() {
      return myCall(inner, this) * 10
    }
    expect(myCall(outer, ctx)).toBe(20)
    expect(Reflect.ownKeys(ctx)).toEqual(['n'])
  })

  it('ignores ctx for arrow functions (their `this` comes from where they were written)', () => {
    const holder = {
      name: 'holder',
      makeArrow() {
        return (suffix) => `${this.name}${suffix}`
      },
    }
    const arrow = holder.makeArrow()
    expect(myCall(arrow, { name: 'other' }, '!')).toBe('holder!')
  })

  it('throws a TypeError when fn is not a function', () => {
    expect(() => myCall(undefined, {})).toThrow(TypeError)
    expect(() => myCall({}, {})).toThrow(TypeError)
    expect(() => myCall('fn', {})).toThrow(TypeError)
  })

  it('can borrow methods from other types', () => {
    const arrayLike = { 0: 'a', 1: 'b', 2: 'c', length: 3 }
    expect(myCall(Array.prototype.slice, arrayLike, 1)).toEqual(['b', 'c'])
    expect(myCall(Array.prototype.map, 'abc', (letter) => letter.toUpperCase())).toEqual(['A', 'B', 'C'])
  })
})

// ---------------------------------------------------------------------------
// myBind
// ---------------------------------------------------------------------------

describe('16 myBind: fixing this and partial application', () => {
  it('returns a NEW function that always runs fn with the saved `this`', () => {
    function greet(greeting) {
      return `${greeting}, ${this.name}`
    }
    const bound = myBind(greet, { name: 'Ann' })

    expect(typeof bound).toBe('function')
    expect(bound).not.toBe(greet)
    expect(bound('Hello')).toBe('Hello, Ann')
    expect(bound('Hi')).toBe('Hi, Ann')
  })

  it('does not run fn at bind time', () => {
    const fn = vi.fn()
    const bound = myBind(fn, {}, 1, 2)
    expect(fn).not.toHaveBeenCalled()

    bound(3)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1, 2, 3)
  })

  it('supports partial application: preset arguments come first, later arguments follow', () => {
    const collect = (...all) => all
    expect(myBind(collect, null, 1, 2)(3, 4)).toEqual([1, 2, 3, 4])
    expect(myBind(collect, null)(3)).toEqual([3])
    expect(myBind(collect, null, 'a')()).toEqual(['a'])

    const add3 = (a, b, c) => a + b + c
    expect(myBind(add3, null, 1, 2)(3)).toBe(6)
  })

  it('can be called many times, preset arguments are never changed or shared between calls', () => {
    const collect = (...all) => all
    const bound = myBind(collect, null, 'x')
    expect(bound(1)).toEqual(['x', 1])
    expect(bound(2, 3)).toEqual(['x', 2, 3])
    expect(bound()).toEqual(['x'])
  })

  it('returns the value of fn, and lets errors from fn pass through', () => {
    expect(myBind(function () { return this.value }, { value: 3 })()).toBe(3)

    const boom = new Error('boom')
    const failing = myBind(() => {
      throw boom
    }, {})
    expect(thrownBy(() => failing())).toBe(boom)
  })

  it('keeps the saved `this` even when the bound function is called as a method of another object', () => {
    function whoAmI() {
      return this.name
    }
    const other = { name: 'other', run: myBind(whoAmI, { name: 'saved' }) }
    expect(other.run()).toBe('saved')
  })

  it('binds only once: binding a bound function again cannot change `this`', () => {
    function whoAmI() {
      return this.name
    }
    const first = myBind(whoAmI, { name: 'first' })
    const second = myBind(first, { name: 'second' })
    expect(second()).toBe('first')
  })

  it('fixes the "lost this" problem of callbacks', () => {
    const counter = {
      count: 0,
      increment() {
        this.count += 1
      },
    }
    setTimeout(myBind(counter.increment, counter), 100)

    vi.advanceTimersByTime(100)
    expect(counter.count).toBe(1)
  })

  it('works with arrow functions: arguments are bound, `this` stays as written', () => {
    const holder = {
      name: 'holder',
      makeArrow() {
        return (greeting) => `${greeting} ${this.name}`
      },
    }
    const bound = myBind(holder.makeArrow(), { name: 'other' }, 'Hi')
    expect(bound()).toBe('Hi holder')
  })

  it('throws a TypeError when fn is not a function', () => {
    expect(() => myBind(undefined, {})).toThrow(TypeError)
    expect(() => myBind({}, {})).toThrow(TypeError)
    expect(() => myBind('fn', {})).toThrow(TypeError)
  })
})

describe('16 myBind: bound functions used with new', () => {
  it('ignores the saved `this` and builds a new instance, with preset and later arguments', () => {
    const saved = { untouched: true }
    const BoundPoint = myBind(Point, saved, 1)
    const point = new BoundPoint(2)

    expect(point.x).toBe(1)
    expect(point.y).toBe(2)
    expect(point.sum()).toBe(3)
    expect('untouched' in point).toBe(false)
    expect(saved).toEqual({ untouched: true }) // the saved ctx was not used as `this`
  })

  it('keeps the prototype chain: the instance is an instance of fn and of the bound function', () => {
    const BoundPoint = myBind(Point, null, 1)
    const point = new BoundPoint(2)

    expect(point instanceof Point).toBe(true)
    expect(point instanceof BoundPoint).toBe(true)
    expect(Point.prototype.isPrototypeOf(point)).toBe(true)
    expect(point.constructor).toBe(Point)
  })

  it('sees methods that are added to fn.prototype after the bind', () => {
    function Counter() {
      this.value = 0
    }
    const BoundCounter = myBind(Counter, null)
    Counter.prototype.increment = function increment() {
      this.value += 1
      return this.value
    }

    const counter = new BoundCounter()
    expect(counter instanceof Counter).toBe(true)
    expect(counter.increment()).toBe(1)
  })

  it('gives every `new` its own instance', () => {
    const BoundPoint = myBind(Point, null, 1)
    const first = new BoundPoint(2)
    const second = new BoundPoint(3)
    expect(first).not.toBe(second)
    expect([first.y, second.y]).toEqual([2, 3])
  })

  it('follows the same rules as new when the constructor returns something', () => {
    function ReturnsObject() {
      this.a = 1
      return { b: 2 }
    }
    function ReturnsPrimitive() {
      this.a = 1
      return 42
    }
    const BoundObject = myBind(ReturnsObject, null)
    const BoundPrimitive = myBind(ReturnsPrimitive, null)

    expect(new BoundObject()).toEqual({ b: 2 })
    expect(new BoundPrimitive()).toEqual({ a: 1 })
  })

  it('also works when the bound function is used with your own myNew', () => {
    const saved = { untouched: true }
    const BoundPoint = myBind(Point, saved, 1)
    const point = myNew(BoundPoint, 2)

    expect(point instanceof Point).toBe(true)
    expect(point.x).toBe(1)
    expect(point.y).toBe(2)
    expect(saved).toEqual({ untouched: true })
  })
})

// ---------------------------------------------------------------------------
// myNew
// ---------------------------------------------------------------------------

describe('16 myNew', () => {
  function Car(brand, year) {
    this.brand = brand
    this.year = year
  }
  Car.prototype.describe = function describe() {
    return `${this.year} ${this.brand}`
  }

  it('creates an object that inherits from Constructor.prototype and sets its properties', () => {
    const car = myNew(Car, 'Fiat', 2020)

    expect(car instanceof Car).toBe(true)
    expect(Object.getPrototypeOf(car)).toBe(Car.prototype)
    expect(car.brand).toBe('Fiat')
    expect(car.year).toBe(2020)
    expect(car.describe()).toBe('2020 Fiat')
    expect(car.constructor).toBe(Car)
  })

  it('gives the same result as the real new operator', () => {
    expect(myNew(Car, 'Fiat', 2020)).toStrictEqual(new Car('Fiat', 2020))
    expect(myNew(Point, 1, 2)).toStrictEqual(new Point(1, 2))
  })

  it('works without arguments', () => {
    function Empty() {}
    const empty = myNew(Empty)
    expect(empty instanceof Empty).toBe(true)
    expect(Object.keys(empty)).toEqual([])
  })

  it('creates a new object on every call', () => {
    const first = myNew(Car, 'A', 1)
    const second = myNew(Car, 'B', 2)
    expect(first).not.toBe(second)
    expect(first.brand).toBe('A')
    expect(second.brand).toBe('B')
  })

  it.each([
    ['an object', { custom: true }],
    ['an array', [1, 2, 3]],
    ['a function', function custom() {}],
  ])('returns what the constructor returns when it is %s', (_label, returned) => {
    function Returning() {
      this.ignored = true
      return returned
    }
    expect(myNew(Returning)).toBe(returned)
  })

  it.each([
    ['a number', 42],
    ['a string', 'text'],
    ['a boolean', false],
    ['null', null],
    ['undefined', undefined],
  ])('ignores the return value of the constructor when it is %s', (_label, returned) => {
    function Returning() {
      this.kept = true
      return returned
    }
    const result = myNew(Returning)
    expect(result).toEqual({ kept: true })
    expect(result instanceof Returning).toBe(true)
  })

  it('supports old-style inheritance between constructor functions', () => {
    function Animal(name) {
      this.name = name
    }
    Animal.prototype.speak = function speak() {
      return `${this.name} makes a sound`
    }
    function Dog(name) {
      Animal.call(this, name) // the constructors in a test may use the native call
      this.tricks = []
    }
    Dog.prototype = Object.create(Animal.prototype)
    Dog.prototype.constructor = Dog
    Dog.prototype.speak = function speak() {
      return `${this.name} barks`
    }

    const dog = myNew(Dog, 'Rex')
    expect(dog instanceof Dog).toBe(true)
    expect(dog instanceof Animal).toBe(true)
    expect(dog.speak()).toBe('Rex barks')
    expect(dog.tricks).toEqual([])
  })

  it.each([
    ['undefined', undefined],
    ['a number', 42],
    ['an object', {}],
    ['a string', 'Car'],
    ['an arrow function (it has no prototype)', () => {}],
    ['a method such as Math.max (it has no prototype)', Math.max],
  ])('throws a TypeError when Constructor is %s', (_label, notAConstructor) => {
    expect(() => myNew(notAConstructor)).toThrow(TypeError)
  })
})

// ---------------------------------------------------------------------------
// myInstanceOf
// ---------------------------------------------------------------------------

describe('16 myInstanceOf', () => {
  class Animal {}
  class Dog extends Animal {}
  class Cat extends Animal {}

  // [label, value, Constructor, expected]. Each row is also checked against the real `instanceof`.
  const table = [
    ['an array is an Array', [], Array, true],
    ['an array is an Object', [], Object, true],
    ['a plain object is not an Array', {}, Array, false],
    ['a plain object is an Object', {}, Object, true],
    ['a function is a Function', function () {}, Function, true],
    ['a function is an Object', function () {}, Object, true],
    ['a date is a Date', new Date(0), Date, true],
    ['a date is an Object', new Date(0), Object, true],
    ['a regexp is a RegExp', /x/, RegExp, true],
    ['a map is a Map', new Map(), Map, true],
    ['a map is not a Set', new Map(), Set, false],
    ['an error is an Error', new TypeError('x'), Error, true],
    ['a TypeError is not a RangeError', new TypeError('x'), RangeError, false],
    ['a wrapper object new Number(5) is a Number', new Number(5), Number, true],
    ['the primitive 5 is not a Number', 5, Number, false],
    ['the primitive "text" is not a String', 'text', String, false],
    ['the primitive true is not a Boolean', true, Boolean, false],
    ['null is not an Object', null, Object, false],
    ['undefined is not an Object', undefined, Object, false],
    ['an object without a prototype is not an Object', Object.create(null), Object, false],
  ]

  it.each(table)('%s', (_label, value, Constructor, expected) => {
    expect(value instanceof Constructor).toBe(expected) // checks the table itself
    expect(myInstanceOf(value, Constructor)).toBe(expected)
  })

  it('follows a class hierarchy up and down', () => {
    const dog = new Dog()
    expect(myInstanceOf(dog, Dog)).toBe(true)
    expect(myInstanceOf(dog, Animal)).toBe(true)
    expect(myInstanceOf(dog, Object)).toBe(true)
    expect(myInstanceOf(dog, Cat)).toBe(false)
    expect(myInstanceOf(new Animal(), Dog)).toBe(false) // a parent is not an instance of its child
  })

  it('works with objects built from constructor functions, with and without new', () => {
    function Shape() {}
    function Circle() {}
    Circle.prototype = Object.create(Shape.prototype)

    expect(myInstanceOf(new Circle(), Shape)).toBe(true)
    expect(myInstanceOf(new Shape(), Circle)).toBe(false)
    expect(myInstanceOf(myNew(Circle), Shape)).toBe(true)
    expect(myInstanceOf(Object.create(Circle.prototype), Circle)).toBe(true)
  })

  it('looks at the prototype chain as it is now: replacing Constructor.prototype changes the answer', () => {
    function Box() {}
    const box = new Box()
    expect(myInstanceOf(box, Box)).toBe(true)

    const oldPrototype = Box.prototype
    Box.prototype = {}
    expect(myInstanceOf(box, Box)).toBe(false)

    Object.setPrototypeOf(box, Box.prototype)
    expect(myInstanceOf(box, Box)).toBe(true)
    expect(myInstanceOf(new Box(), Box)).toBe(true)
    expect(myInstanceOf(Object.create(oldPrototype), Box)).toBe(false)
  })

  it('walks a long chain without trouble', () => {
    function Root() {}
    let obj = Object.create(Root.prototype)
    for (let level = 0; level < 200; level += 1) {
      obj = Object.create(obj)
    }
    expect(myInstanceOf(obj, Root)).toBe(true)
    expect(myInstanceOf(obj, Object)).toBe(true)
    expect(myInstanceOf(obj, Array)).toBe(false)
  })

  it('works with functions made by myBind', () => {
    const BoundPoint = myBind(Point, null, 1)
    const point = new BoundPoint(2)
    expect(myInstanceOf(point, BoundPoint)).toBe(true)
    expect(myInstanceOf(point, Point)).toBe(true)
  })

  it.each([
    ['an object', {}],
    ['a number', 5],
    ['a string', 'Array'],
    ['null', null],
    ['undefined', undefined],
  ])('throws a TypeError when the right side is %s, whatever the left side is', (_label, notCallable) => {
    expect(() => myInstanceOf({}, notCallable)).toThrow(TypeError)
    expect(() => myInstanceOf(5, notCallable)).toThrow(TypeError)
  })

  it('throws a TypeError for an object and an arrow function (no prototype), but a primitive is simply false', () => {
    const arrow = () => {}
    expect(() => myInstanceOf({}, arrow)).toThrow(TypeError)
    expect(myInstanceOf(5, arrow)).toBe(false)
    expect(myInstanceOf(null, arrow)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The rule of the exercise: no native call, apply or bind
// ---------------------------------------------------------------------------

describe('16 polyfills: no native call, apply or bind inside', () => {
  function sumWithBase(a, b) {
    return this.base + a + b
  }

  // Each scenario returns a value, so the test also proves that the polyfill really works.
  const scenarios = {
    myCall: { run: () => myCall(sumWithBase, { base: 1 }, 2, 3), expected: 6 },
    myApply: { run: () => myApply(sumWithBase, { base: 1 }, [2, 3]), expected: 6 },
    'myApply with an array-like': {
      run: () => myApply(sumWithBase, { base: 1 }, { length: 2, 0: 2, 1: 3 }),
      expected: 6,
    },
    'myBind and calling the bound function': {
      run: () => myBind(sumWithBase, { base: 1 }, 2)(3),
      expected: 6,
    },
    'myBind and using the bound function with new': {
      run: () => {
        const BoundPoint = myBind(Point, null, 1)
        const point = new BoundPoint(2)
        return [point.x, point.y]
      },
      expected: [1, 2],
    },
    myNew: {
      run: () => {
        const point = myNew(Point, 1, 2)
        return point && [point.x, point.y]
      },
      expected: [1, 2],
    },
    myInstanceOf: { run: () => myInstanceOf(new Point(1, 2), Point), expected: true },
  }

  it.each(Object.keys(scenarios))('%s does not use call, apply, bind, Reflect.apply or Reflect.construct', (name) => {
    const { run, expected } = scenarios[name]
    let result
    const used = usedNativeHelpers(() => {
      result = run()
    })

    expect(result).toEqual(expected)
    expect(used).toEqual([])
  })
})
