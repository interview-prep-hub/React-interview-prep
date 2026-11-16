# 16 - Function polyfills (call, apply, bind, new, instanceof)

**Level:** Medium | **Time:** 40 minutes | **Topics:** `this`, prototypes, closures, `Symbol`, constructor functions

## The task

Re-build five built-in features of JavaScript with your own code:

| You write | It must behave like |
| --- | --- |
| `myCall(fn, ctx, ...args)` | `fn.call(ctx, ...args)` |
| `myApply(fn, ctx, argsArray)` | `fn.apply(ctx, argsArray)` |
| `myBind(fn, ctx, ...preset)` | `fn.bind(ctx, ...preset)` |
| `myNew(Constructor, ...args)` | `new Constructor(...args)` |
| `myInstanceOf(obj, Constructor)` | `obj instanceof Constructor` |

A **polyfill** is code that re-creates a built-in feature. Interviewers love these questions, because you cannot write them without really understanding `this` and prototypes.

The one idea that makes `call` and `apply` possible: **`this` is decided by HOW a function is called.** When you write `obj.method()`, `this` inside `method` is `obj`. So, to run `fn` with a `this` of your choice, put `fn` on that object under a temporary key and call it as a method. The key must be a fresh `Symbol`, so it can never clash with a real property.

Work in [`index.js`](./index.js). Do not edit the test file.

The rule of the exercise: inside `index.js` you may NOT use the native `call`, `apply` or `bind`, and also not `Reflect.apply` or `Reflect.construct` (they do the same job). The tests watch these functions and fail if your code touches them. Do not use the `new` operator to build the result of `myNew` either. The tests cannot see that, but it would defeat the whole point. Everything else is allowed: `Object.create`, `Object.getPrototypeOf`, `Symbol`, `Object(value)`, `Array.from`, spread, rest parameters.

## Requirements

**`myApply(fn, ctx, argsArray)`**

1. Runs `fn` with `this` set to `ctx` and the items of `argsArray` as arguments. It returns what `fn` returns. An error thrown by `fn` comes out unchanged.
2. `argsArray` can be an array, an array-like object (such as `arguments` or `{ length: 2, 0: 'a', 1: 'b' }`), `null` or `undefined` (no arguments). Anything else (a number, a string, a boolean) throws a `TypeError`. The array you pass in is never changed.
3. If `fn` is not a function, throw a `TypeError`.
4. If `ctx` is `null` or `undefined`, `this` is the global object (`globalThis`). If `ctx` is a primitive (a number, string or boolean), it is wrapped into an object first (`Object(ctx)`), because you cannot add a property to a primitive. In every other case `this` is exactly the `ctx` object that was passed in, not a copy.
5. Use a fresh `Symbol` as the temporary key, created for each call. The context object must be left exactly as it was: no extra property of any kind remains afterwards, even when `fn` throws. While `fn` runs, the temporary key must not show up in `Object.keys`, `for...in` or `JSON.stringify`. The real properties of `ctx` (even one named `fn`) are never changed or deleted.
6. A call may start another call on the same object (`myCall(inner, this)` inside `fn`), and both work.

**`myCall(fn, ctx, ...args)`**

7. Same as `myApply`, but the arguments come one by one (any number of them, also none). The same rules about `fn`, `ctx`, the return value and the cleanup apply. Arrow functions work too: they receive the arguments and keep their own `this`, so `ctx` is ignored.

**`myBind(fn, ctx, ...preset)`**

8. Throws a `TypeError` if `fn` is not a function. Otherwise it returns a NEW function and does not call `fn` yet.
9. Calling `bound(...later)` runs `fn` with `this` set to the saved `ctx` and the arguments `preset` first, then `later`. It returns what `fn` returns, and errors pass through. Every call is independent, `preset` is never changed.
10. The saved `ctx` cannot be changed afterwards: not by calling the bound function as a method of another object, not by `bound.call(other)`, and not by binding the bound function a second time (the first bind wins). Arrow functions can be bound as well.
11. `new bound(...later)` works. The saved `ctx` is IGNORED, a new object is created, and `fn` runs with `this` set to that new object and the arguments `preset` + `later`. The new object is an instance of `fn` AND of `bound` (`obj instanceof fn`, `obj instanceof bound`), it can use methods that are added to `fn.prototype` later, and the usual `new` rule about return values applies (see requirement 14).
12. `myNew(bound, ...)` behaves the same as `new bound(...)`.

**`myNew(Constructor, ...args)`**

13. Throws a `TypeError` if `Constructor` is not a function, or if it has no `prototype` (arrow functions and methods such as `Math.max` have none).
14. The three steps of `new`: (1) create an empty object that inherits from `Constructor.prototype`, (2) run `Constructor` with `this` set to that object and the given arguments (use your `myApply`), (3) if the constructor returned an object (this includes arrays and functions), return THAT. If it returned anything else (a number, string, boolean, `null` or `undefined`), ignore it and return the new object. Each call creates a new object.
15. It only has to work with plain constructor functions, not with `class` (a class refuses to be called without `new`, because the engine creates its `this`).

**`myInstanceOf(obj, Constructor)`**

16. Throws a `TypeError` if `Constructor` is not a function, whatever `obj` is.
17. Returns `false` when `obj` is a primitive, `null` or `undefined`. This check comes before anything else about `Constructor.prototype`.
18. If `obj` is an object and `Constructor.prototype` is not an object (for example an arrow function), throw a `TypeError`.
19. Otherwise walk up the prototype chain of `obj` with `Object.getPrototypeOf`. Return `true` as soon as you meet `Constructor.prototype`, and `false` when you reach `null`. The chain is read when you call the function, so replacing `Constructor.prototype` afterwards changes the answer. You do not need to support `Symbol.hasInstance`.

## Examples

```js
function greet(greeting, mark) {
  return `${greeting}, ${this.name}${mark}`
}

myCall(greet, { name: 'Ann' }, 'Hello', '!')   // 'Hello, Ann!'
myApply(greet, { name: 'Bob' }, ['Hi', '?'])   // 'Hi, Bob?'
myApply(Math.max, null, [3, 9, 4])             // 9
```

```js
const hiAnn = myBind(greet, { name: 'Ann' }, 'Hi') // partial application
hiAnn('.')                                         // 'Hi, Ann.'
```

```js
function Point(x, y) {
  this.x = x
  this.y = y
}

myNew(Point, 1, 2)                 // Point { x: 1, y: 2 }, the same as new Point(1, 2)

const BoundPoint = myBind(Point, { ignored: true }, 1)
const p = new BoundPoint(2)        // Point { x: 1, y: 2 }, `{ ignored: true }` is not used
p instanceof Point                 // true
```

```js
myInstanceOf([], Array)            // true
myInstanceOf([], Object)           // true  (Array.prototype inherits from Object.prototype)
myInstanceOf({}, Array)            // false
myInstanceOf(5, Number)            // false (a primitive is never an instance)
```

## Complexity target

`myCall`, `myApply`, `myBind` and `myNew` take O(n) time in the number of arguments and O(1) extra memory. `myInstanceOf` takes O(d) time, where `d` is the length of the prototype chain.

## Acceptance criteria (what the tests check)

- `myApply` and `myCall`: correct `this` and arguments, return value, errors pass through, array-likes, `null`/`undefined`/primitive `ctx`, arrow functions, `TypeError` for a bad `fn` or `argsArray`, and the context object is left clean (also after an error, and with real properties that have unlucky names).
- `myBind`: fixed `this`, partial application in the right order, independent calls, the first bind wins, fixes the "lost `this`" problem for callbacks, and works with arrow functions.
- Bound functions with `new`: the saved `ctx` is ignored, instances inherit from `fn` and from the bound function, later prototype methods are visible, return values follow the `new` rules, and `myNew(bound)` works too.
- `myNew`: right prototype, arguments, same result as `new`, object results win, primitive results are ignored, old-style inheritance works, `TypeError` for things that are not constructors.
- `myInstanceOf`: a table of cases checked against the real `instanceof`, class hierarchies, constructor functions, a changed `prototype`, long chains, and the `TypeError` rules.
- None of your functions touch `Function.prototype.call`, `apply`, `bind`, `Reflect.apply` or `Reflect.construct`.

## How to run

```bash
npm test -- exercises/js/16-function-polyfills
```

The one test that uses a timer runs on fake timers, so the whole file finishes instantly and never depends on real waiting.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/16-function-polyfills
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Start with `myApply`. `myCall` and `myBind` become tiny once it works.
2. Steps for `myApply`: check the arguments, choose the context object (`Object(ctx ?? globalThis)` does both the `null` case and the wrapping of primitives), make a key with `Symbol()`, store `fn` on the context under that key, call `contextkey (planned)`, and remove the key. Put the removal in a `finally` block so it also runs when `fn` throws.
3. `Array.from(argsArray ?? [])` turns an array, an array-like (`arguments`) or "nothing" into a real array.
4. For `myBind`, return a normal `function bound(...later)`, not an arrow function (arrow functions cannot be used with `new`). Inside it, join the arguments with `[...preset, ...later]`.
5. How does `bound` know it was used with `new`? When it is called with `new`, `this` is a new object that inherits from `bound.prototype`. So `this instanceof bound` is `true`. Careful: `new.target` also detects `new`, but it is `undefined` when your own `myNew` calls the function, and requirement 12 needs that to work too.
6. To keep the prototype chain, make `bound.prototype` inherit from `fn.prototype` (`Object.create(fn.prototype)`, or share it). Only do it when `fn.prototype` exists.
7. `myNew` is three lines once you have `myApply`: `Object.create(Constructor.prototype)`, call the constructor with that object as `this`, and pick the right thing to return.
8. `myInstanceOf` is a loop: `let proto = Object.getPrototypeOf(obj)`, compare, then move up with `proto = Object.getPrototypeOf(proto)` until `proto` is `null`.

</details>

## Stretch goals

- Give the bound function the same `name` (`'bound greet'`) and `length` (`Math.max(0, fn.length - preset.length)`) as the native one, using `Object.defineProperty`.
- Support `Symbol.hasInstance` in `myInstanceOf`: if `Constructor[Symbol.hasInstance]` exists, ask it first.
- Add the functions to `Function.prototype` as `myCall`, `myApply`, `myBind`, but only `if (!Function.prototype.myCall)`. This is how a real polyfill is written, so that `greet.myCall(ctx)` works.
- Think about why the Symbol trick fails for `Object.freeze(ctx)` and why the native `call` does not have this problem. What would you need to make it work? (Hint: look at why `Reflect.apply` exists.)
- Make `myNew` work for a `class`. Why is that impossible without `Reflect.construct` or the `new` operator?

## Interview follow-ups to prepare for

**1. How does `this` binding work? Explain the four rules.**

<details>
<summary>Show answer</summary>

The value of `this` is not decided where a function is written. It is decided where and how the function is CALLED. There are four rules:

```js
function whoAmI() {
  return this
}

// 1. Default binding: a plain call, nothing before the dot.
whoAmI() // undefined in strict mode (modules and classes are always strict)
         // globalThis (window in a browser) in old non-strict scripts

// 2. Implicit binding: called as obj.method(), so this is the object before the dot.
const user = { name: 'Ann', whoAmI }
user.whoAmI() // user
const loose = user.whoAmI
loose()       // undefined: the dot is gone, so we are back to rule 1

// 3. Explicit binding: you choose with call, apply or bind.
const other = { name: 'Bob' }
whoAmI.call(other)      // other
whoAmI.apply(other, []) // other
whoAmI.bind(other)()    // other

// 4. new binding: a brand new object.
function Person(name) {
  this.name = name
}
new Person('Ann').name // 'Ann'
```

When several rules could apply, the order of strength is: `new`, then `bind`, then `call`/`apply`, then the method call, then the plain call.

```js
function show() {
  return this.name
}
const bound = show.bind({ name: 'bound' })
const obj = { name: 'obj', bound }
obj.bound()                 // 'bound'  (bind beats the dot)
bound.call({ name: 'call' }) // 'bound'  (a bound function cannot be re-bound)

function Thing() {
  this.kind = 'thing'
}
const BoundThing = Thing.bind({ kind: 'ignored' })
new BoundThing().kind        // 'thing'  (new beats bind)
```

Arrow functions do not follow these rules at all, see the next question. A strong answer also names the classic trap (taking a method out of its object loses `this`) and the three usual fixes: `bind`, an arrow function, or calling it as `obj.method()`.

</details>

**2. What is different about arrow functions and `this`?**

<details>
<summary>Show answer</summary>

An arrow function has no `this` of its own. It uses the `this` of the place where it was written, like any other variable from an outer scope (this is called lexical `this`). It is fixed forever: `call`, `apply` and `bind` cannot change it.

```js
const team = {
  name: 'Team',
  makeGreeter() {
    return () => this.name // this belongs to makeGreeter, which was called as team.makeGreeter()
  },
}

const greet = team.makeGreeter()
greet()                         // 'Team'
greet.call({ name: 'Other' })   // 'Team'  (cannot be changed)
greet.bind({ name: 'Other' })() // 'Team'
```

This is why arrows are great for callbacks inside methods: the callback keeps the `this` of the method.

```js
const counter = {
  count: 0,
  incrementLater(schedule) {
    schedule(function () {
      this.count += 1 // plain function: called without a dot, so this is NOT the counter
    })
  },
  incrementLaterArrow(schedule) {
    schedule(() => {
      this.count += 1 // arrow: this is the counter
    })
  },
}
```

Other differences worth saying in an interview: an arrow function has no `prototype`, so it cannot be used with `new` (it throws a `TypeError`); it has no own `arguments` object (it sees the `arguments` of the outer function); and it is a bad choice for an object method or a prototype method, because `this` would not be the object. Write those as normal methods.

</details>

**3. Why did React class components need `bind`? Do function components have this problem?**

<details>
<summary>Show answer</summary>

Because of the "lost `this`" trap from question 1. In a class component you pass a method as an event handler:

```jsx
class Counter extends React.Component {
  state = { count: 0 }

  handleClick() {
    this.setState({ count: this.state.count + 1 }) // this must be the component
  }

  render() {
    // Bug: this.handleClick is just a function value, the dot is gone
    return <button onClick={this.handleClick}>{this.state.count}</button>
  }
}
```

`this.handleClick` is evaluated while rendering, and React stores the function. Later, when the user clicks, React calls it like `handler(event)`, a plain call. That is the default binding rule, and class bodies are always strict mode, so `this` is `undefined` and you get `TypeError: Cannot read properties of undefined`.

Three fixes:

```jsx
// 1. Bind once in the constructor (the classic fix)
constructor(props) {
  super(props)
  this.state = { count: 0 }
  this.handleClick = this.handleClick.bind(this)
}

// 2. A class field with an arrow function (the arrow takes this from the instance)
handleClick = () => {
  this.setState({ count: this.state.count + 1 })
}

// 3. An arrow in JSX (works, but makes a new function on every render)
<button onClick={() => this.handleClick()}>
```

The trade-off: with a class field arrow, every instance gets its own copy of the function, while normal methods are shared on the prototype. The arrow in JSX creates a new function on each render, which can defeat `React.memo` on child components.

Function components do not have this problem, because they do not use `this` at all. A handler is a closure over the props and state of its render:

```jsx
function Counter() {
  const [count, setCount] = useState(0)
  const handleClick = () => setCount((c) => c + 1) // no this, no bind
  return <button onClick={handleClick}>{count}</button>
}
```

The trap that replaces it in the hooks world is a stale closure (a handler that still sees old state), see [useState in depth](../../../../02-hooks/02-usestate-in-depth.md). Confusion about `this` was one of the reasons the React team introduced hooks.

</details>

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (`this`, arrow functions vs normal functions, closures)
- [State and events](../../../../01-basics/05-state-and-events.md) (event handlers)
- [Hooks overview and rules](../../../../02-hooks/01-hooks-overview-and-rules.md) (why hooks replaced class components)
- [Memoization](../../../../02-hooks/07-memoization.md) (new function on every render, `useCallback`)
- Related exercises: [17 - Array polyfills](../17-array-polyfills/README.md), [04 - Curry](../04-curry/README.md) and [03 - Memoize](../03-memoize/README.md)
- Interview round: [Round 5 - JavaScript coding](../../../../05-interview-rounds/round-5-javascript-coding/README.md)
