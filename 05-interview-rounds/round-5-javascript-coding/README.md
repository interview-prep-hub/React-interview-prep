# Round 5 - JavaScript Coding

In this round you write plain JavaScript functions, with no React: utilities such as debounce, polyfills such as `Promise.all`, small data structures and string or array helpers. Interviewers use it to check that you understand closures, `this`, promises, recursion and edge cases. There are no question files: the questions are the **24 exercises** in the practice app, each with a README, a starter, tests and a reference solution.

## How to practise

1. Open an exercise README under `practice-app/exercises/js/` and read the task.
2. Set a timer for the suggested time shown in the exercise README and in the table below.
3. Write your answer in `index.js` and run the tests from the `practice-app` folder:

```bash
npm test -- exercises/js/01-debounce
```

4. Think out loud: state the inputs and outputs, give two or three examples, mention the edge cases (empty input, `null`, very large input) before you code.
5. Compare with the reference solution:

```bash
npm run test:solutions -- exercises/js/01-debounce
```

## What interviewers watch

- You ask about edge cases and the expected return value before coding.
- You choose a simple correct solution first, then improve it.
- You can state the time and space cost (for example "one pass, O(n) time, O(n) extra space").
- You test with your own examples before saying you are done.

## The exercises

| # | Exercise | Level | Time | Topics |
| --- | --- | --- | --- | --- |
| 01 | [Debounce](../../practice-app/exercises/js/01-debounce/README.md) | Easy | 20 minutes | closures, timers (`setTimeout`), `this` and arguments, higher-order functions |
| 02 | [Throttle](../../practice-app/exercises/js/02-throttle/README.md) | Easy | 20 minutes | closures, timers (`setTimeout`), `this` and arguments, rate limiting |
| 03 | [memoize](../../practice-app/exercises/js/03-memoize/README.md) | Easy | 20 minutes | closures, `Map`, caching, `this`, promises |
| 04 | [curry and partial](../../practice-app/exercises/js/04-curry/README.md) | Easy | 20 minutes | closures, rest and spread, `fn.length`, higher-order functions |
| 05 | [Deep clone](../../practice-app/exercises/js/05-deep-clone/README.md) | Medium | 30 minutes | recursion, `Map` and `WeakMap`, circular references, built-in object types, immutability |
| 06 | [Flatten arrays and objects](../../practice-app/exercises/js/06-flatten-array/README.md) | Easy | 25 minutes | recursion, iteration with an explicit stack, `Array.isArray`, string paths, regular expressions, prototype safety |
| 07 | [compose, pipe, pipeAsync and tap](../../practice-app/exercises/js/07-compose-pipe/README.md) | Easy | 20 minutes | higher-order functions, function composition, `reduce`, `async`/`await`, closures |
| 08 | [once, before and after](../../practice-app/exercises/js/08-once/README.md) | Easy | 15 minutes | closures, higher-order functions, `this`, error handling |
| 09 | [Deep equal](../../practice-app/exercises/js/09-deep-equal/README.md) | Medium | 30 minutes | recursion, `Object.is`, type checks, `Map` and `Set`, circular references |
| 10 | [Get and set by path](../../practice-app/exercises/js/10-get-set-by-path/README.md) | Medium | 30 minutes | string parsing, recursion, mutation vs immutability, structural sharing, prototype pollution |
| 11 | [Promise combinators](../../practice-app/exercises/js/11-promise-combinators/README.md) | Medium | 40 minutes | promises, `Promise.all` / `allSettled` / `race` / `any`, fail-fast vs collect-all, iterables, `AggregateError`, unhandled rejections |
| 12 | [Retry with timeout](../../practice-app/exercises/js/12-retry-with-timeout/README.md) | Medium | 40 minutes | async/await, `setTimeout`, exponential backoff, error handling, custom error classes, timers |
| 13 | [Event emitter](../../practice-app/exercises/js/13-event-emitter/README.md) | Easy | 25 minutes | classes, `Map`, closures, publish/subscribe (pub/sub), cleanup functions |
| 14 | [LRU cache](../../practice-app/exercises/js/14-lru-cache/README.md) | Medium | 30 minutes | classes, `Map` insertion order, getters, caching and eviction, Big-O |
| 15 | [Promise pool (limit concurrency)](../../practice-app/exercises/js/15-promise-pool/README.md) | Medium | 40 minutes | promises, `async`/`await`, concurrency limits, closures, error handling |
| 16 | [Function polyfills (call, apply, bind, new, instanceof)](../../practice-app/exercises/js/16-function-polyfills/README.md) | Medium | 40 minutes | `this`, prototypes, closures, `Symbol`, constructor functions |
| 17 | [Array polyfills](../../practice-app/exercises/js/17-array-polyfills/README.md) | Easy | 30 minutes | loops, callbacks, `this`, sparse arrays (holes), `Array.prototype`, recursion |
| 18 | [Array utils: groupBy, chunk, sortBy and friends](../../practice-app/exercises/js/18-array-utils-groupby-chunk/README.md) | Easy | 30 minutes | arrays, `Set`, stable sorting, immutability, Fisher-Yates shuffle, time complexity |
| 19 | [Two Sum and friends](../../practice-app/exercises/js/19-two-sum-and-friends/README.md) | Medium | 45 minutes | `Map` (hash table), stack, sliding window, sorting, one-pass algorithms, Big-O |
| 20 | [String utilities](../../practice-app/exercises/js/20-string-utils/README.md) | Easy | 30 minutes | string methods, regular expressions, loops vs regex, `Map`, immutability, Unicode basics |
| 21 | [classNames and cva](../../practice-app/exercises/js/21-classnames/README.md) | Easy | 20 minutes | recursion, `Array` and `Object` helpers, truthy and falsy values, string joining, API design for component styles |
| 22 | [Observable store](../../practice-app/exercises/js/22-observable-store/README.md) | Medium | 35 minutes | closures, `Set`, publish/subscribe (pub/sub), immutable updates, selectors, `Object.is`, the idea behind `useSyncExternalStore` and Zustand |
| 23 | [Query string parse and stringify](../../practice-app/exercises/js/23-query-string/README.md) | Easy | 25 minutes | string processing, `encodeURIComponent`, `decodeURIComponent`, edge cases, URL as state |
| 24 | [DOM traversal and a tiny hyperscript builder](../../practice-app/exercises/js/24-dom-traversal/README.md) | Medium | 40 minutes | the DOM tree, depth-first traversal, recursion, `childNodes` vs `children`, `createElement`, event listeners |

## Learn the concepts first

- [JavaScript for React](../../01-basics/01-javascript-for-react.md)
- [Custom hooks](../../02-hooks/08-custom-hooks.md) (debounce and throttle appear there too)

## Where to go next

- [Round 6: Code review and refactoring](../round-6-code-review-and-refactoring/README.md)
- [Round 4: Machine coding](../round-4-machine-coding/README.md)
