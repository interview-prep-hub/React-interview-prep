# 07 - compose, pipe, pipeAsync and tap

**Level:** Easy | **Time:** 20 minutes | **Topics:** higher-order functions, function composition, `reduce`, `async`/`await`, closures

## The task

Small functions are easy to read and easy to test. **Function composition** is the trick of gluing small functions into one bigger function: the output of one becomes the input of the next.

You will build four helpers:

- `pipe(...fns)` glues functions together and runs them **left to right**.
- `compose(...fns)` does the same but runs them **right to left**, like the maths notation `f(g(x))`.
- `pipeAsync(...fns)` is `pipe` for steps that can be sync or async. It always returns a promise.
- `tap(fn)` makes a "peek" step: it lets you look at a value (for example to log it) and then passes the value on untouched.

Work in [`index.js`](./index.js). Do not edit the test file.

## Requirements

**`pipe(...fns)`**

1. Returns a new function. When you call it, the functions run **from left to right**. The return value of each function is the only argument of the next one. The return value of the last function is the result.
2. The first function to run receives **all** the arguments of the call, so it may take several parameters. Every later function receives exactly **one** argument.
3. With a single function, the result behaves like that function (it gets all the arguments).
4. With no functions, `pipe()` returns the **identity function**: it returns its first argument and ignores the others. Calling it with no arguments returns `undefined`.
5. Nothing runs while you build the chain. The functions run only when you call the result. The result can be called many times, can be nested inside another chain, and can be used as a callback such as `[1, 2, 3].map(pipe(a, b))`.
6. `undefined` is an ordinary value: if a step returns `undefined`, the next step receives `undefined`.

**`compose(...fns)`**

7. Exactly like `pipe`, but the functions run **from right to left**: `compose(f, g, h)(x)` is `f(g(h(x)))`. The **last** function in the list is the first one to run, so it is the one that may take several arguments. `compose()` with no functions is also the identity function.

**Errors (`pipe`, `compose`, `pipeAsync` and `tap`)**

8. If any argument is not a function, throw a `TypeError` **straight away, when the chain is built** (not later, when it is called). `tap` does the same for its single argument.
9. If a function throws while the chain runs (`pipe` and `compose`), the error goes to the caller unchanged and the functions after it do not run.

**`pipeAsync(...fns)`**

10. Returns a function that **always returns a promise**, even when every step is synchronous. It runs the steps left to right like `pipe`.
11. Each step can be sync or async. Wait for a step to finish before you start the next one, and give the next step the **resolved value**, not the promise.
12. The first step may take several arguments. With no functions, the promise resolves to the first argument.
13. If a step throws or returns a rejected promise, the returned promise **rejects** with that same error and the steps after it do not run. A synchronous `throw` must also become a rejection: calling the chain must never throw by itself.
14. The returned function can be called again, also while an earlier call is still running. The calls do not affect each other.

**`tap(fn)`**

15. Returns a function that takes one value `x`, calls `fn(x)` once with exactly that one argument, and then returns `x` itself (the same reference, not a copy).
16. Whatever `fn` returns is ignored, even a promise. `tap` does not wait for it.
17. If `fn` throws, the error is not swallowed: it goes to the caller.

**Complexity target:** building a chain of `n` functions is O(n) (one pass to check them). Running it calls each function exactly once, so O(n) calls and no copying of the data between steps. `tap` is O(1).

## Examples

```js
const inc = (x) => x + 1
const double = (x) => x * 2

pipe(inc, double)(3)                    // 8   (3 + 1 = 4, then 4 * 2 = 8)
compose(inc, double)(3)                 // 7   (3 * 2 = 6, then 6 + 1 = 7)
pipe((a, b) => a + b, double)(2, 3)     // 10  (only the first step takes two arguments)
pipe()(5)                               // 5   (no functions: identity)

const loadUser = async (id) => ({ id, name: 'Ada' })
const getName = (user) => user.name

await pipeAsync(loadUser, tap(console.log), getName)(7)
// logs { id: 7, name: 'Ada' } and then returns 'Ada'
```

## Acceptance criteria (what the tests check)

- `pipe` runs left to right and `compose` runs right to left, checked with numbers, with three string steps, and by recording the real call order.
- Each function gets the return value of the previous one.
- The first function to run can take several arguments. Later functions get exactly one.
- No functions gives the identity function. One function is forwarded all arguments.
- Nothing runs while building. The result is reusable, nestable, and works as an `Array.map` callback.
- A non-function argument throws a `TypeError` when you build (`pipe`, `compose`, `pipeAsync`, `tap`). An error inside a step passes through and stops the chain.
- `tap` returns the same value, calls `fn` once with one argument, ignores what `fn` returns, and does not hide errors.
- `pipeAsync` always returns a promise, mixes sync and async steps, handles several arguments in the first step, and rejects (never throws) on a sync throw or a rejected step.
- With fake timers, `pipeAsync` waits for each async step: the total time is the sum of the steps.

## How to run

Run the commands from the `practice-app` folder. This is plain JavaScript, so there is nothing to see in the browser. The tests are the feedback.

```bash
npm test -- exercises/js/07-compose-pipe
```

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/07-compose-pipe
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Use a rest parameter, `function pipe(...fns)`, to collect the functions into an array. Do the same for the arguments of the function you return.
2. `reduce` carries a "value so far" from step to step: `[f, g, h].reduce((value, fn) => fn(value), start)` gives `h(g(f(start)))`.
3. The first function is special. Call it with `first(...args)` to get the start value, then reduce over the rest of the list.
4. `compose` is `pipe` with the list in the opposite order. Remember that `reverse()` changes an array in place, so copy it first (`[...fns]`) if you do not own it.
5. For `pipeAsync`, an `async` function always returns a promise and turns a synchronous `throw` into a rejection. `await` also works on plain values, so one loop covers sync and async steps. Do not use `Promise.all`: each step needs the result of the one before.
6. With no functions you do not need a special case in `pipeAsync` if your first step defaults to the identity function.
7. `tap` is two lines: call `fn(value)`, then return `value`.

</details>

## Stretch goals

- Write `compose` as one `reduce` that builds nested functions, the way Redux does: `(...fns) => fns.reduce((f, g) => (...args) => f(g(...args)))`. Handle the "no functions" case. Which version is easier to read?
- Write `pipeAsync` again using only `.then` chains (no `async`/`await`). Why is it harder to make a synchronous `throw` become a rejection?
- Add `pipeMaybe`: stop and return `null` as soon as a step returns `null` or `undefined`.
- Add an `AbortSignal` option to `pipeAsync` so the chain stops between steps once the signal is aborted.
- Combine this with [exercise 04 (curry)](../04-curry/README.md): curried functions are what makes `pipe(map(inc), filter(isEven))` possible.

## Interview follow-ups to prepare for

1. **Function composition in React (HOCs, middleware).** You have three higher-order components, `withAuth`, `withTheme` and `withLogging`. How do you apply them all to one `Page` component without writing `withAuth(withTheme(withLogging(Page)))` by hand?
   - A strong answer: a HOC is a function from component to component, so `compose(withAuth, withTheme, withLogging)(Page)` works. The leftmost HOC becomes the outermost wrapper, so the order changes behaviour. Mention the costs (wrapper layers in DevTools, lost refs or static properties, prop name clashes) and that custom hooks and `children` composition replaced most HOCs in modern React.
2. **Redux middleware compose.** Redux's `applyMiddleware` calls a `compose` function. What does it compose, and why does the order of the middleware list matter?
   - A strong answer: each middleware looks like `store => next => action => ...`. `applyMiddleware` builds a chain and runs `compose(...chain)(store.dispatch)`, so every middleware wraps the next one and the first in the list sees the action first. Redux's own `compose` returns an identity function for no arguments and the function itself for one: the same two edge cases you handled here.
3. **Point-free style trade-offs.** Is `const slugify = pipe(trim, toLowerCase, replaceSpaces)` better than `const slugify = (s) => replaceSpaces(toLowerCase(trim(s)))`? When would you prefer each?
   - A strong answer: point-free (not naming the data) is short, declarative and every step is tested alone. The costs are harder debugging (no place for a breakpoint or a `console.log`, which is why `tap` exists), stack traces that point inside `pipe`, and arity traps: `['1', '2', '3'].map(parseInt)` returns `[1, NaN, NaN]` because `map` also passes the index, and `map(pipe(a, b))` passes the index and array to `a` too. Long variadic chains are also awkward to type in TypeScript.

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md): closures, rest and spread, array methods like `reduce`, and `async`/`await`.
- [Component patterns](../../../../03-intermediate/01-component-patterns.md): higher-order components and composition.
- [Custom hooks](../../../../02-hooks/08-custom-hooks.md): the modern way to share logic that HOCs used to cover.
- [State management](../../../../03-intermediate/06-state-management.md): Redux and its middleware.
- [Round 5: JavaScript coding](../../../../05-interview-rounds/round-5-javascript-coding/README.md): how this kind of exercise shows up in interviews.
