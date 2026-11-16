# 03 - memoize

**Level:** Easy | **Time:** 20 minutes | **Topics:** closures, `Map`, caching, `this`, promises

## The task

Memoizing a function means remembering its answers. The first time you call it with some arguments, it does the work and stores the result. Every later call with the same arguments returns the stored result instead of doing the work again. This is safe for a **pure function**, a function whose result depends only on its arguments and which has no side effects.

Write `memoize(fn, resolver)`. It takes a function and returns a new, caching version of it.

Work in [`index.js`](./index.js). Do not edit the test file.

## Requirements

1. `memoize(fn, resolver)` returns a new function. Calling it returns what `fn` returns for the same arguments.
2. **Default key.** When no `resolver` is given, the cache key is `JSON.stringify(args)`, where `args` is the array of all the arguments of the call. This means:
   - `(1, 2)`, `(12)` and `("1,2")` are three different calls.
   - `(1)` and `("1")` are different calls.
   - `(1, 2)` and `(2, 1)` are different calls.
   - Objects and arrays are compared by content: two different `{ id: 7 }` objects count as the same argument.
3. **Custom resolver.** The second argument is optional. When it is given, call `resolver(...args)` on every call. Whatever it returns is the key, used exactly as it is (do not turn it into a string, so an object can be a key). Falsy keys such as `0`, `""`, `null` and `undefined` are normal keys too, so do not fall back to the default key when the resolver returns one.
4. **The cache.** `memoized.cache` is a `Map` from key to result. It starts empty and gets one entry per distinct key. There is no size limit: an entry stays until it is deleted or `clear()` is called. The tests read it, and they also add and delete entries by hand, so your function must really use this `Map`.
5. `memoized.clear()` empties the cache. It empties the **same** `Map`, so `memoized.cache` is still the same object afterwards.
6. A key counts as cached when it is in the `Map`, even if its result is `undefined`, `0`, `null`, `""` or `false`. A cached `undefined` must not run `fn` again.
7. **`this` is kept.** `fn` is called with the same `this` as the memoized call, so memoizing a method works.
8. **Promises.** If `fn` returns a promise, cache that promise itself. No special code is needed: two calls with the same arguments return the very same promise.
9. **Errors.** If `fn` throws, the error reaches the caller and nothing is cached. If `resolver` throws, the error reaches the caller and `fn` is not called.
10. **Validation.** Throw a `TypeError` if `fn` is not a function, or if `resolver` is given (anything except `undefined`) and is not a function. So `null`, `0` and `""` as a resolver are errors too.

## Examples

```js
const square = memoize((n) => n * n)

square(4) // 16 (computed)
square(4) // 16 (taken from the cache)
square.cache.size // 1
square.clear()
square.cache.size // 0
```

```js
const count = memoize((...args) => args.length)

count(1, 2) // 2
count(12) // 1
count('1,2') // 1
count.cache.size // 3 (three different keys)
```

```js
// A resolver chooses which part of the input matters.
const getName = memoize(
  (user) => user.name,
  (user) => user.id,
)

getName({ id: 1, name: 'Ada' }) // 'Ada'
getName({ id: 1, name: 'Grace' }) // 'Ada' (same id, so the cached answer is returned)
getName({ id: 2, name: 'Linus' }) // 'Linus'
```

```js
// A cached undefined is still a cached answer.
const noResult = memoize(() => undefined)
noResult('a')
noResult('a') // the original function ran only once
```

```js
// Methods keep their this.
const wallet = { base: 100, add: memoize(function (n) { return this.base + n }) }
wallet.add(5) // 105
```

## Complexity target

- Time: after the key is built, one `Map` lookup per call, which is O(1) on average. Building the default key costs time proportional to the size of the arguments.
- Memory: O(number of distinct keys). The cache only grows until you call `clear()` (see the follow-ups).

## Acceptance criteria (what the tests check)

- Same arguments call the original function once; different arguments call it again.
- `(1, 2)`, `(12)`, `("1,2")`, `(1)` vs `("1")` and `(1, 2)` vs `(2, 1)` are all kept apart.
- Objects and arrays with the same content hit the cache, with different content they do not; the very same result object is returned on a hit.
- A resolver supplies the key, receives all the arguments, runs on every call and its result is not stringified. A falsy key (`0`, `""`, `null`, `undefined`, `false`) works like any other key.
- `cache` is a `Map` with one entry per key (500 different keys give 500 entries, nothing is evicted); entries can be removed with `cache.delete` and added with `cache.set`.
- `clear()` empties the same `Map`, and the next call computes again. Each memoized function has its own cache.
- `undefined`, `0`, `null`, `""` and `false` results are cached.
- `this` reaches the original function.
- Promises are stored: the same promise comes back, and a still-pending request is shared (checked with fake timers, no real waiting).
- Errors from `fn` and from the resolver reach the caller; a failed call is not cached.
- A `TypeError` for a bad `fn` or a bad `resolver`.
- A memoized recursive `fib(50)` runs the original function exactly 51 times.

## How to run

```bash
npm test -- exercises/js/03-memoize
```

JavaScript exercises have no browser page. You only need the tests.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/03-memoize
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. The cache lives in a closure: create the `Map` in `memoize`, outside the function you return, so all calls share it.
2. Collect the arguments with a rest parameter: `function memoized(...args)`. Then `args` is a real array you can pass to `JSON.stringify`.
3. Check `cache.has(key)`, not `cache.get(key) !== undefined`. Think about why.
4. Use a regular `function` for the wrapper, not an arrow function. An arrow function has no `this` of its own. Call the original with `fn.apply(this, args)`.
5. Functions are objects, so you can attach properties to them: `memoized.cache = cache`.
6. For `clear`, call `cache.clear()`. Do not replace the `Map` with a new one.
7. Store the result only after `fn` returned. If `fn` throws, you never reach that line, which is exactly what you want.
8. Choose between the resolver and the default key by asking whether a resolver exists, not by looking at the key it returned. A resolver is allowed to return `0` or `""`.

</details>

## Stretch goals

- **Rejected promises.** Today a promise that rejects stays in the cache forever, so every later call gets the same failure. Change it so a rejected promise is removed from the cache and the next call tries again.
- **Size limit.** Add an option for a maximum number of entries and drop the oldest entry when the limit is reached (a `Map` remembers insertion order). Then look at [14-lru-cache](../14-lru-cache/README.md) for the "least recently used" version.
- **Time to live.** Add an option so an entry expires after some milliseconds. Test it with `vi.useFakeTimers()` instead of waiting.
- **A better default key.** `JSON.stringify` cannot tell `undefined` from `null`, turns `NaN` into `null` and throws on circular objects and `BigInt`. Write a key function that does better, and pass it as the resolver.

## Interview follow-ups to prepare for

**1. Cache invalidation and memory leaks (`WeakMap`)**

- Your cache never forgets anything. What happens in an app that stays open for days and calls the function with millions of different arguments? How would you limit the size (maximum entries, least recently used) or the age (time to live) of the entries?
- When is a cached result wrong? Think about functions that are not pure, or data that changes behind the function's back. How do you invalidate: `clear()`, `cache.delete(key)`, or a version number inside the key?
- A `WeakMap` accepts only objects as keys and does not stop the garbage collector from freeing a key object. When nothing else uses the object, its entry disappears on its own. When is that the right tool (for example, extra data computed per DOM node or per user object)? Why can it not replace the `Map` in this exercise? (Think: primitive keys, `size`, `clear()`, iteration.)

**2. Relation to `useMemo` and `React.memo`**

- Both are memoization. How is your `memoize` different from `useMemo`? Key facts to cover: `useMemo` remembers only the latest result for one component instance, it compares its dependency array with `Object.is`, and React is allowed to throw the cached value away.
- What does `React.memo` cache, and what does it compare? (The last render output of a component, compared by a shallow check of the props.)
- Why would `JSON.stringify` be a poor way to compare props? (Functions, elements in `children`, large data, and the cost of doing it on every render.)
- Why is "memoize everything" not a good strategy? (The cache itself costs memory and comparison time.)

**3. Memoizing a recursive Fibonacci**

- Why does `const fib = memoize((n) => n < 2 ? n : fib(n - 1) + fib(n - 2))` work, and what goes wrong if the inner calls use a different, non-memoized function?
- How many calls does plain recursive `fib(n)` make, and how many does the memoized version make? (Exponential before, linear after.)
- What happens with `fib(100000)`? (Think about the call stack.) Compare with a loop that keeps only the last two numbers: same answer, constant memory. When is top-down memoization still the better choice? (Problems where it is hard to know the order in which sub-answers are needed.)
- `fib(79)` and above cannot be stored exactly in a normal JavaScript number (it is larger than `Number.MAX_SAFE_INTEGER`). What would you use instead, and what happens if you pass such a value through `JSON.stringify`?

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (closures, `this`, rest and spread)
- [Memoization in React](../../../../02-hooks/07-memoization.md) (`React.memo`, `useMemo`, `useCallback`)
- [Performance optimization](../../../../04-advanced/02-performance-optimization.md)
- [Round 5 - JavaScript coding](../../../../05-interview-rounds/round-5-javascript-coding/README.md) (how this kind of question is asked)
