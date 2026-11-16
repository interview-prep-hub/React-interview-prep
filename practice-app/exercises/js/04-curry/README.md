# 04 - curry and partial

**Level:** Easy | **Time:** 20 minutes | **Topics:** closures, rest and spread, `fn.length`, higher-order functions

## The task

Two ideas, one exercise:

- **Currying** turns a function that wants several arguments into one that can be called a few arguments at a time. `add(1, 2, 3)` becomes `add(1)(2)(3)`, and also `add(1, 2)(3)` and `add(1)(2, 3)`. Nothing runs until all the arguments have arrived.
- **Partial application** fixes the first few arguments now and gives you a new function that takes the rest. `partial(add, 1, 2)` is a function that waits for the third argument and then runs.

Write `curry(fn)` and `partial(fn, ...preset)`. Work in [`index.js`](./index.js). Do not edit the test file.

## Requirements

**`curry(fn)`**

1. `curry(fn)` returns a curried function. It uses `fn.length`, the number of parameters `fn` declares, to know how many arguments are needed.
2. The curried function can be called with any number of arguments at a time. As soon as the total number of arguments received so far is at least `fn.length`, call `fn` with all of them, in the order received, and return the result.
3. Until then, the call returns a function that remembers the arguments received so far. This README calls it a **waiting function**.
4. Extra arguments are passed through: `fn` receives every argument the caller gave, even if that is more than `fn.length`.
5. Calling a curried function, or any waiting function that `curry` hands back (like `add(1)`), with **no arguments** returns **the same function** (the identical object). It adds nothing and loses nothing. The one exception is a function with `fn.length === 0`: it has nothing to wait for, so any call, even with no arguments, runs `fn`. (This rule is only about `curry`. The `partial` function from requirement 10 does something different, see below.)
6. An explicit `undefined` counts as an argument. `pair(undefined)(2)` has received two arguments.
7. The waiting functions are reusable. Calling one never changes it, so `const addTo1 = add(1)` can be used again and again, and branches made from it do not disturb each other.
8. `fn.length` is taken as it is. A parameter with a default value, and every parameter after it, is not counted. A rest parameter is not counted. So `(a, b = 10) => ...` has length `1` and `(...numbers) => ...` has length `0`, and `curry` treats them that way.
9. Throw a `TypeError` if `fn` is not a function.

**`partial(fn, ...preset)`**

10. `partial(fn, ...preset)` returns a function. Every call to it, with or without arguments, calls `fn(...preset, ...laterArgs)` right away and returns the result. It never looks at `fn.length` and never waits for more arguments, so it also works with functions that take any number of arguments, like `Math.max`. Each call starts again from the same `preset`.
11. Throw a `TypeError` if `fn` is not a function.

## Examples

```js
const add3 = (a, b, c) => a + b + c
const add = curry(add3)

add(1)(2)(3) // 6
add(1, 2)(3) // 6
add(1)(2, 3) // 6
add(1, 2, 3) // 6
```

```js
const addTo1 = add(1) // a waiting function, add3 has not run yet
addTo1(2)(3) // 6
addTo1(10)(20) // 31 (the same waiting function can be reused)
```

```js
add() === add // true (no arguments: the same function comes back)
add(1)(2, 3, 4) // add3 is called as add3(1, 2, 3, 4), extra arguments are passed through
```

```js
// fn.length stops at the first default value, so one argument is enough here.
const addWithDefault = curry((a, b = 10) => a + b)
addWithDefault(1) // 11
```

```js
const atLeast5 = partial(Math.max, 5)
atLeast5(3, 9) // 9, same as Math.max(5, 3, 9)
atLeast5(3) // 5, partial does not wait for more arguments
```

## Complexity target

- Each call to a curried function copies the arguments collected so far, so it costs O(k) for k arguments. For n arguments given one at a time that is O(n squared) in total, which is fine because the number of parameters of a function is small.
- `partial` costs O(preset + later arguments) per call.
- Memory: only the arguments collected so far are kept.

## Acceptance criteria (what the tests check)

- `curried(1)(2)(3)`, `curried(1, 2)(3)`, `curried(1)(2, 3)` and `curried(1, 2, 3)` all return `6` for a three-parameter function.
- The original function is not called before enough arguments have arrived, and is called exactly once with them when they have.
- Extra arguments are passed through, from the first call or a later one.
- A call with no arguments returns the identical function, at every step, and does not lose earlier arguments.
- A waiting function (like `add(1)`) can be reused many times, and each complete set of arguments calls the original function again.
- `undefined`, `0`, `""`, `null` and `false` are normal arguments.
- A function with zero parameters runs at once; one with one parameter runs on the first argument.
- Default parameters and rest parameters follow the `fn.length` rule.
- `partial` puts the preset arguments first, calls `fn` on every call, and works with variadic functions and with `curry`.
- A `TypeError` for a non-function in both `curry` and `partial`.

## How to run

```bash
npm test -- exercises/js/04-curry
```

JavaScript exercises have no browser page. You only need the tests.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/04-curry
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Read `fn.length` once, at the start. That is your target number of arguments.
2. A rest parameter, `(...args)`, gives you the arguments of a call as a real array. The spread syntax joins arrays: `[...received, ...args]`.
3. A helper function that takes the arguments received so far and returns the next function works well. The returned function remembers `received` through a closure. This is the same idea as a counter that remembers its count.
4. Build a **new** array on every call. If you push into one shared array, two branches made from the same waiting function will see each other's arguments.
5. Decide "do we have enough?" with `all.length >= arity`. Do not look at the values, because `undefined` is a legal argument.
6. A function expression can have a name, and inside its body that name refers to itself: `return function curried(...args) { ... return curried }`. That is how you return "the same function".
7. `partial` is one line once you have the validation: return a function that calls `fn(...preset, ...later)`.

</details>

## Stretch goals

- **Explicit arity.** Add an optional second argument, `curry(fn, arity)`, that replaces `fn.length`. This fixes functions with default or rest parameters, for example `curry(sum, 3)`.
- **The classic variant.** A very common interview question: `sum(1)(2)(3)()` returns `6`, where the empty call at the end means "I am done". It is a different function from `curry`, because it does not know how many arguments are coming.
- **Placeholders.** Let the caller skip an argument with a placeholder value, so `curried(_, 2)(1)` fills the second parameter first (this is what lodash does).
- **Keep `this`.** Make a curried method work when it is called as `obj.method(1)(2)`.

## Interview follow-ups to prepare for

**1. Currying vs partial application**

- State the difference in one sentence each. Currying changes the shape of a function so it takes its arguments step by step. Partial application fixes some arguments of a function and gives you a function for the rest. Which one calls `fn` as soon as it is called, and which one waits for `fn.length` arguments?
- Strictly speaking, currying means one argument per call: `f(a)(b)(c)`. Your `curry` is more relaxed. Can you explain why the relaxed version is often handier?
- `fn.bind(null, 1, 2)` is partial application built into the language. What else does `bind` do (it also fixes `this`), and how does it differ from your `partial`?
- Can you write `curry` using `partial`? (If there are not enough arguments, return a partial application of the curried function.)

**2. Practical uses (event handlers, selectors)**

- In React: `const handleChange = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }))`, used as `onChange={handleChange('email')}`. One handler factory serves every field.
- What is the catch? Every render creates a new function, so a child wrapped in `React.memo` re-renders anyway. When does that matter and when is it fine?
- Selectors and small utilities: `const prop = curry((key, obj) => obj[key])` lets you write `users.map(prop('name'))`. `const byId = curry((id, item) => item.id === id)` lets you write `items.find(byId(7))`.
- Why do curried utility libraries put the **data last**? (So the early arguments configure the function and the last one is the thing you pipe through it. Compare with exercise [07-compose-pipe](../07-compose-pipe/README.md).)

**3. Why `fn.length` is unreliable with default and rest parameters**

- Predict these lengths before checking: `(a, b) => {}`, `(a, b = 2) => {}`, `(a, ...rest) => {}`, `(...args) => {}`. (They are 2, 1, 1 and 0.)
- What happens if you curry a function that is really `(...args) => original(...args)`, such as one produced by a decorator or a wrapper? Its length is `0`, so the curried version calls it immediately. The wrapper hides how many arguments the real function needs.
- What does `bind` do to the length of a function? (It lowers it by the number of preset arguments.)
- How do libraries cope? lodash `_.curry(fn, arity)` and Ramda `curryN(n, fn)` let the caller say how many arguments are needed. If you were designing the API, which would you choose and why?

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (closures, rest and spread, `this`)
- [State and events](../../../../01-basics/05-state-and-events.md) (event handlers, the factory pattern)
- [Memoization in React](../../../../02-hooks/07-memoization.md) (why a new function on every render can matter)
- [Round 5 - JavaScript coding](../../../../05-interview-rounds/round-5-javascript-coding/README.md) (how this kind of question is asked)
