# 17 - Array polyfills

**Level:** Easy | **Time:** 30 minutes | **Topics:** loops, callbacks, `this`, sparse arrays (holes), `Array.prototype`, recursion

## The task

A **polyfill** is code that adds a built-in feature to an environment that does not have it yet. "Write your own `map`" is one of the most common warm-up questions in a JavaScript round, because it checks whether you know what the built-in really does: which arguments the callback gets, what happens with `thisArg`, and what happens with empty slots.

In this exercise you rebuild nine array methods as **standalone functions** that take the array as the first argument:

| Built-in | Yours |
| --- | --- |
| `arr.map(cb, thisArg)` | `myMap(arr, cb, thisArg)` |
| `arr.filter(cb, thisArg)` | `myFilter(arr, cb, thisArg)` |
| `arr.reduce(cb, initial)` | `myReduce(arr, cb, initial)` |
| `arr.forEach(cb, thisArg)` | `myForEach(arr, cb, thisArg)` |
| `arr.find(cb, thisArg)` | `myFind(arr, cb, thisArg)` |
| `arr.findLast(cb, thisArg)` | `myFindLast(arr, cb, thisArg)` |
| `arr.every(cb, thisArg)` | `myEvery(arr, cb, thisArg)` |
| `arr.some(cb, thisArg)` | `mySome(arr, cb, thisArg)` |
| `arr.flat(depth)` | `myFlat(arr, depth)` |

Then you write `installPolyfills()`, which attaches the same functions to `Array.prototype` (with the `my` prefix, so the real methods are never touched) so that `[1, 2, 3].myMap(fn)` works.

Work in [`index.js`](./index.js). Do not edit the test file. Do not use the built-in versions of these methods inside your code. Plain `for` loops are what we practise here.

## Requirements

**Rules shared by `myMap`, `myFilter`, `myForEach`, `myReduce`, `myFind`, `myFindLast`, `myEvery` and `mySome`**

1. The callback is called with the arguments `(value, index, array)`. `array` is the very same array object that was passed in, not a copy. (`myReduce` adds the accumulator in front, see requirement 14.)
2. `thisArg` is the value of `this` inside the callback. (`myReduce` has no `thisArg`.)
3. If the callback is not a function, throw a `TypeError`. Check this first, even when the array is empty.
4. Read the array length **once**, before the loop. Items that the callback appends while the loop runs are never visited.
5. The loop looks at the live array. If the callback changes a later item, the loop sees the new value. If the callback deletes a later item (`delete array[2]`), that slot becomes a hole, and the methods that skip holes (rule 6) do not visit it.
6. **Holes.** A sparse array has empty slots, for example `[1, , 3]` has no index `1` at all. `myMap`, `myFilter`, `myForEach`, `myReduce`, `myEvery` and `mySome` **skip** holes: the callback is not called for them. `myFind` and `myFindLast` are different: they do **not** skip holes, they visit every index from `0` to `length - 1` and a hole is seen as `undefined`.

**The functions**

7. `myMap` returns a **new** array with the same length. Item `i` is the result of the callback for item `i`. A hole in the input stays a hole at the same index in the result.
8. `myFilter` returns a **new** array with the original items (the same references, not copies) for which the callback returns a truthy value. The result never contains holes.
9. `myForEach` calls the callback for each item and returns `undefined`.
10. `myFind` returns the first item for which the callback returns a truthy value (the item, not its index), or `undefined` if there is none. It stops at the first match.
11. `myFindLast` does the same but walks from the last index down to `0`. The callback still gets the original index of each item.
12. `myEvery` returns `true` if the callback returns a truthy value for every item that exists, and `true` for an empty array. It stops at the first falsy result and returns `false`. It always returns a real boolean, not the callback result.
13. `mySome` returns `true` as soon as the callback returns a truthy value, otherwise `false` (so `false` for an empty array). It always returns a real boolean.
14. `myReduce(arr, callback, initialValue)` calls `callback(accumulator, value, index, array)` and returns the final accumulator.
    - If an initial value is given, it is the first accumulator and every existing item is visited, starting at index `0`. An initial value of `undefined` still counts as given (`myReduce(arr, fn, undefined)` is not the same as `myReduce(arr, fn)`).
    - If no initial value is given, the first item that exists is the first accumulator and the callback is first called with the next item. With one item the callback is never called and that item is returned.
    - If there is no initial value and no item exists (an empty array or only holes), throw a `TypeError`.
    - With an initial value and an empty array, return the initial value and never call the callback.
15. `myFlat(arr, depth = 1)` returns a **new** array in which nested arrays are flattened up to `depth` levels.
    - `depth` of `1` (the default) flattens one level, `Infinity` flattens everything.
    - A `depth` of `0` or less returns a shallow copy of the array (nothing is flattened).
    - Only real arrays (`Array.isArray`) are flattened. Strings, objects, sets and other values stay as they are.
    - Holes are dropped, at every level. Empty arrays disappear when they get flattened.
    - The input and the arrays nested inside it are not changed.

**`installPolyfills()`**

16. It adds nine methods to `Array.prototype`, with the names `myMap`, `myFilter`, `myReduce`, `myForEach`, `myFind`, `myFindLast`, `myEvery`, `mySome` and `myFlat`. Inside a method, `this` is the array it was called on: `[1, 2, 3].myMap((n) => n * 2)` is `myMap([1, 2, 3], (n) => n * 2)`.
17. All arguments are passed on. In particular `thisArg` works, and `[].myReduce(fn)` (no initial value) throws while `[].myReduce(fn, undefined)` returns `undefined`.
18. A method is added **only if** `Array.prototype` does not already have something with that name. Never overwrite.
19. The new methods must not be enumerable, so `for (const key in [10, 20])` still only gives `"0"` and `"1"`.
20. It returns an array with the names of the methods it really added. Calling it a second time adds nothing and returns `[]`.
21. Importing the module must not change `Array.prototype`. Only calling `installPolyfills()` does.

## Examples

```js
myMap([1, 2, 3], (n) => n * 2) // [2, 4, 6]
myMap(['1', '2', '3'], parseInt) // [1, NaN, NaN]  (parseInt receives the index as its radix)
```

```js
myReduce([1, 2, 3, 4], (sum, n) => sum + n, 0) // 10
myReduce([1, 2, 3, 4], (sum, n) => sum + n) // 10 (starts from the first item, callback runs 3 times)
myReduce([], (sum, n) => sum + n) // throws TypeError
myReduce([], (sum, n) => sum + n, 0) // 0
```

```js
const sparse = [1, , 3] // no item at index 1
myMap(sparse, (n) => n * 2) // [2, <1 empty item>, 6]  (the hole stays a hole)
myFilter(sparse, () => true) // [1, 3]
myFind(sparse, (n) => n === undefined) // undefined (the hole was visited as undefined, and it matched)
```

```js
myFlat([1, [2, [3, [4]]]]) // [1, 2, [3, [4]]]
myFlat([1, [2, [3, [4]]]], 2) // [1, 2, 3, [4]]
myFlat([1, [2, [3, [4]]]], Infinity) // [1, 2, 3, 4]
```

```js
installPolyfills() // ['myMap', 'myFilter', ...], the names that were added
;[1, 2, 3].myMap((n) => n + 1) // [2, 3, 4]
installPolyfills() // [] (everything already exists)
```

## Complexity target

- `myMap`, `myFilter`, `myForEach`, `myReduce`, `myEvery`, `mySome`, `myFind` and `myFindLast`: O(n) time, where n is the array length. `myEvery`, `mySome`, `myFind` and `myFindLast` stop early, so the best case is O(1).
- Extra space: O(n) for `myMap` and `myFilter` (the result), O(1) for the others (`myReduce` only holds the accumulator).
- `myFlat`: O(total number of items, including the nested ones). The recursion is as deep as the nesting, not as long as the array.

## Acceptance criteria (what the tests check)

- Each function returns the right result for normal input, and `myMap`, `myFilter` and `myFlat` return new arrays and leave the input alone.
- The callback gets `(value, index, array)` with the original array object, and `thisArg` becomes `this`.
- A non-function callback throws a `TypeError`, also for an empty array.
- Holes are skipped by `myMap`, `myFilter`, `myForEach`, `myReduce`, `myEvery`, `mySome`, and visited as `undefined` by `myFind` and `myFindLast`. `myMap` keeps holes, `myFilter` and `myFlat` drop them.
- Items appended during the loop are not visited, deleted items are skipped, changed items are seen with the new value.
- `myReduce`: with and without an initial value, a single item, an empty array, an array of only holes, and an explicit `undefined` initial value.
- `myEvery` and `mySome` stop early, return real booleans, and handle the empty array.
- `myFlat`: default depth, a number depth, `Infinity`, depth `0` and negative, holes, empty arrays, non-array values left alone.
- Results agree with the built-in methods on a few sample arrays.
- `installPolyfills`: adds the nine methods, uses `this`, forwards `thisArg` and the reduce initial value, never overwrites, is safe to call twice, adds non-enumerable methods, and nothing is installed just by importing the file.

## How to run

```bash
npm test -- exercises/js/17-array-polyfills
```

JavaScript exercises have no browser page. You only need the tests.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/17-array-polyfills
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Start with `myForEach`. Every other function is a small variation of the same loop, so once it works you can copy the skeleton.
2. Save the length first: `const len = arr.length`, then `for (let i = 0; i < len; i++)`. That one line gives you the "appended items are not visited" rule for free.
3. To tell a hole from a real `undefined`, use the `in` operator: `1 in [10, , 30]` is `false`, `1 in [10, undefined, 30]` is `true`. Reading `arr[1]` gives `undefined` in both cases, so it cannot tell them apart. Run `console.log([1, , 3])` to see how Node prints a hole.
4. `callback.call(thisArg, value, index, arr)` calls the callback with a chosen `this`. Arrow functions ignore it, normal functions use it.
5. `new Array(5)` makes an array of length 5 with no items at all (five holes). That is a good starting point for `myMap`, because a skipped index then stays a hole.
6. For `myReduce`, take the optional initial value with a rest parameter: `function myReduce(arr, callback, ...rest)`. Then `rest.length > 0` tells you whether a value was given, even when that value is `undefined`. (A default parameter such as `initial = undefined` cannot tell the two cases apart.)
7. Without an initial value, first move a pointer to the first index where `i in arr` is true. If you run off the end, throw. Otherwise that item is the accumulator and the real loop starts at the next index.
8. `myEvery` and `mySome` are mirror images. Return from inside the loop, and put the plain `true` or `false` after it.
9. `myFlat`: write a helper `flattenInto(target, source, depth)` that pushes into one shared result array. When the item is an array and `depth > 0`, call the helper again with `depth - 1`. `Infinity - 1` is still `Infinity`, so `Infinity` needs no special case.
10. `installPolyfills`: keep the nine functions in one object. `Object.defineProperty(Array.prototype, name, descriptor)` takes a descriptor object with `value`, `writable`, `configurable` and `enumerable`. Plain assignment (`Array.prototype.x = ...`) makes the property enumerable, which is the thing we want to avoid.
11. Inside the prototype methods write a normal `function (...) { return myMap(this, ...) }`. An arrow function would not get the array as `this`.

</details>

## Stretch goals

- **Array-likes.** Make the functions work on array-like objects such as `'abc'`, `arguments` and `{ length: 2, 0: 'a', 1: 'b' }`, and throw a `TypeError` for `null` and `undefined` (the built-ins do both, try `Array.prototype.map.call('abc', (c) => c + c)`).
- Add `myReduceRight`, `myFlatMap`, `myIncludes` (it must find `NaN`, which `indexOf` cannot) and `myAt` (negative indexes count from the end).
- Write `myFlat` without recursion, using an explicit stack, so a very deeply nested array cannot overflow the call stack.
- Add `myToSorted` and `myToSpliced` that return copies instead of changing the original.

## Interview follow-ups to prepare for

**1. Why keys matter when mapping in React**

- In React you use `map` to turn an array of data into an array of elements: `todos.map((todo) => <li key={todo.id}>{todo.text}</li>)`. What does `key` do? (It tells React which item is which between renders, so it can reuse, move or remove the right element instead of guessing by position.)
- Why is the array index a bad key when the list can be reordered, filtered or have items inserted? Give a concrete bug: a list of inputs, the user types in the first one, then you delete the first item. Which input keeps the text, and why?
- Why must a key be unique only among siblings, not across the whole page? Why is `key={Math.random()}` the worst choice? (A new key on every render means every element is thrown away and created again, and any state inside it is lost.)
- Your `myMap` passes `(value, index, array)`. Where does that index come from in `items.map((item, index) => ...)`, and why is "I have the index, so I will use it as the key" a trap?
- A common slip: `items.map((item) => { <li>...</li> })` with braces and no `return`. What does the page show, and why?
- Keys are not only for lists. Changing the `key` of a single component resets its state. When is that useful?

**2. Mutating vs non-mutating array methods (`toSorted`, `toSpliced`)**

- Sort these into two groups: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, `map`, `filter`, `slice`, `concat`, `flat`. (The first eight change the array in place. The rest return a new array.)
- Why does this matter in React? State must be replaced, not changed in place. `items.sort()` sorts the same array object that is in state, so `setItems(items.sort())` hands React the same reference and React may skip the re-render, and you have also changed state behind its back.
- The classic fix is to copy first: `[...items].sort(compare)` or `items.slice().sort(compare)`. The modern fix is the "change by copy" methods: `toSorted`, `toReversed`, `toSpliced` and `with`, for example `items.with(2, 'x')` or `items.toSpliced(1, 1)` to remove the item at index 1. Which version of the language added them? (ES2023, available in all current browsers and in Node 20 and newer.)
- A copy of an array is **shallow**. `const copy = [...todos]; copy[0].done = true` still changes the object that state holds. How do you update one object inside an array without mutating it? (`todos.map((t) => (t.id === id ? { ...t, done: true } : t))`.)
- Is `myMap` mutating? What about `myForEach` with a callback that does `item.count++`? Where does the "pure function" rule apply?

**3. `reduce` to build objects**

- `reduce` is not only for sums. It can build anything: an object keyed by id (`users.reduce((acc, u) => { acc[u.id] = u; return acc }, {})`), a count of words, a grouped structure. Write a word counter with it.
- Why should you almost always pass the initial value? (Without it the first item is the accumulator, so an empty array throws and an array of objects starts from an object that is not your accumulator.)
- What is the problem with `reduce((acc, x) => ({ ...acc, [x.id]: x }), {})`? (It copies the whole object on every step, so it is O(n squared). Mutating `acc` inside the callback is fine, because it is a brand new object that only `reduce` can see. Or use `Object.fromEntries(users.map((u) => [u.id, u]))`.)
- What happens if you forget to `return acc`? (The next call gets `undefined` as the accumulator.)
- When is `reduce` the wrong tool? (When a `map` plus `filter` is easier to read, or when `Object.groupBy` or a `Map` says exactly what you mean. You will build `groupBy` and `countBy` yourself in [18-array-utils-groupby-chunk](../18-array-utils-groupby-chunk/README.md).)

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (array methods, `this`, immutability)
- [Conditional rendering and lists](../../../../01-basics/06-conditional-rendering-and-lists.md) (`map`, keys, `filter`, `sort`)
- [State and events](../../../../01-basics/05-state-and-events.md) (immutable updates of arrays and objects)
- [How React renders](../../../../04-advanced/01-how-react-renders.md) (what keys do during reconciliation)
- [Round 5 - JavaScript coding](../../../../05-interview-rounds/round-5-javascript-coding/README.md) (how this kind of question is asked)
