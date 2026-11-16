# 06 - Flatten arrays and objects

**Level:** Easy | **Time:** 25 minutes | **Topics:** recursion, iteration with an explicit stack, `Array.isArray`, string paths, regular expressions, prototype safety

## The task

Write four small functions in [`index.js`](./index.js). Do not edit [`index.test.js`](./index.test.js).

1. `flatten(arr, depth = 1)` works like `Array.prototype.flat`, but you may not use `flat` or `flatMap`.
2. `flattenDeep(arr)` flattens every level using a **loop and an explicit stack**. No recursion.
3. `flattenObject(obj)` turns a nested object into a one-level object whose keys are paths, like `"a.d[0]"`.
4. `unflattenObject(flat)` is the inverse: it rebuilds the nested object from the paths.

Flattening is everywhere in real work: nested API pages (`pages.flat()`), form field names such as `address.city` and `phones[0]`, error maps keyed by field path, query strings, translation keys, analytics event properties and CSV columns. It is also a classic interview question because it tests recursion, iteration, edge cases and, in the last function, security.

**Complexity target:** each function does O(n) work, where n is the number of items (for the object functions: the size of the output, that is the number of leaf values times the length of their keys). `flattenDeep` keeps its stack on the heap, so the call stack stays flat no matter how deep the input is.

## Examples

```js
// 1. flatten: depth 1 by default, Infinity means "all levels"
flatten([1, [2, [3, [4]]]]) // [1, 2, [3, [4]]]
flatten([1, [2, [3, [4]]]], 2) // [1, 2, 3, [4]]
flatten([1, [2, [3, [4]]]], Infinity) // [1, 2, 3, 4]

// 2. flattenDeep: all levels, order kept, holes skipped
flattenDeep([[1, 2], [3, [4, [5]]], , 6]) // [1, 2, 3, 4, 5, 6]

// 3. flattenObject: dots for object keys, [index] for arrays
flattenObject({ a: { b: { c: 1 }, d: [2] } })
// { 'a.b.c': 1, 'a.d[0]': 2 }

// 4. flattenObject with arrays of objects, and empty containers kept as values
flattenObject({ users: [{ name: 'Ada' }, { name: 'Linus' }], tags: [] })
// { 'users[0].name': 'Ada', 'users[1].name': 'Linus', tags: [] }

// 5. unflattenObject: the inverse
unflattenObject({ 'a.b.c': 1, 'a.d[0]': 2 })
// { a: { b: { c: 1 }, d: [2] } }
```

## Requirements

### flatten(arr, depth = 1)

1. Throw a `TypeError` when `arr` is not an array (use `Array.isArray`). `null`, `undefined`, strings, numbers, Sets and array-like objects are all rejected.
2. Return a **new** array and never change the input. Nested arrays that are not flattened (because the depth ran out) are kept as the same objects, not copied.
3. `depth` is `1` when you leave it out (or pass `undefined`). `Infinity` flattens everything. A depth of `0`, a negative depth or `NaN` flattens nothing, but you still return a new array.
4. Only real arrays are flattened. Strings, objects, Sets and typed arrays are plain values.
5. Keep the order. Keep `undefined`, `null`, `0`, `''` and `false`. **Skip holes** (empty slots such as the gap in `[1, , 3]`), as the native `flat` does. Do not turn holes into `undefined`.
6. Do not use `Array.prototype.flat` or `flatMap`. The tests check that they are never called.
7. It must work for long arrays (500,000 items). Do not spread a big array into function arguments (`result.push(...big)` throws a `RangeError`).

### flattenDeep(arr)

8. Everything from rules 1, 2, 4, 5, 6 and 7 applies here too. It flattens **all** levels.
9. Use an explicit stack (an array you push to and pop from) and a loop. No recursion, not even through a helper. The test builds an array nested 100,000 levels deep, and a recursive version overflows the call stack.
10. Do not change the input, at any level. (Do not `pop` from the array the caller gave you.)

### flattenObject(obj)

11. Throw a `TypeError` when `obj` is not a **plain object**: that is an object whose prototype is `Object.prototype` or `null`. `null`, `undefined`, numbers, strings and arrays are rejected.
12. Build the key like this: object keys are joined with a dot, array indexes are written as `[index]` straight after the previous part. Top-level keys have no prefix. Examples: `a.b`, `list[0]`, `users[1].name`, `grid[0][1]`.
13. Only plain objects and arrays are walked into. Everything else is a **value** and is kept by reference: `null`, `undefined`, numbers, strings, `Date`, `Map`, `Set`, `RegExp`, functions and class instances.
14. An **empty** object or array is a value too, so no information is lost: `{ a: {} }` gives `{ a: {} }`.
15. Keep values such as `undefined`, `null`, `0`, `''` and `false`. The key must still exist.
16. List the keys depth-first in the original order. Return a new plain object and never change the input.
17. Not needed: keys that contain `.`, `[` or `]`, empty keys, and circular objects.

### unflattenObject(flat)

18. Throw a `TypeError` when `flat` is not a plain object (same rule as 11).
19. It is the inverse of `flattenObject`. For any input made of plain objects, arrays and values, `unflattenObject(flattenObject(x))` equals `x`, and `flattenObject(unflattenObject(f))` equals `f`.
20. A step written in brackets (`[0]`) means an **array**, a name means an **object**. So `'a[0]'` gives `{ a: ['x'] }` but `'a.0'` gives `{ a: { 0: 'x' } }`. Each array item goes to the index in the brackets, whatever the order of the keys.
21. Values are put in as they are. Return a new plain object and never change the input.
22. **Safety rule.** `unflattenObject` must never change `Object.prototype` or any other shared object.
    - A key with a step named `__proto__`, `constructor` or `prototype` (anywhere in the path) makes it throw a `TypeError`. Example: `'__proto__.polluted'` and `'a[0].constructor.prototype.x'`.
    - Keys that merely look like built-in methods are normal keys: `{ 'toString.x': 1 }` gives `{ toString: { x: 1 } }`. So only walk into a container that the current object **owns**.

## Acceptance criteria (what the tests check)

- `flatten`: default depth, explicit depths 1 to 4, `Infinity`, depth larger than the nesting, depth `0`, `-1`, `-Infinity` and `NaN`; order; empty arrays removed; falsy values kept; holes skipped and never returned; strings, objects, Sets and typed arrays not flattened; same results as the native `flat` for many inputs; new array and untouched input; a 500,000 item inner array; `TypeError` for non-arrays; native `flat` and `flatMap` never called.
- `flattenDeep`: all levels, order with a branching structure, empty arrays, falsy values, holes, non-array values, same results as `flat(Infinity)`, input untouched even after two calls, 100,000 levels of nesting (two shapes), a 500,000 item array, `TypeError`, no native `flat`.
- `flattenObject`: dots and brackets, arrays of objects, arrays of arrays, numeric keys, 50 levels deep, key order, `null` / `undefined` / falsy values, empty containers, `Date` / `Map` / `Set` / `RegExp` / function / class instance kept as values, null-prototype input, input untouched, plain object result, `TypeError`.
- `unflattenObject`: the same shapes in reverse, merging of shared parents, arrays by index in any key order, `a.0` against `a[0]`, values kept, input untouched, `TypeError`, five prototype pollution attempts that must throw, and `toString.hacked` that must be an ordinary key.
- Round trips in both directions for nine sample objects.

## How to run

```bash
npm test -- exercises/js/06-flatten-array
```

At the start every test fails with `Not implemented` or a wrong error type. That is normal, it is your to-do list.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/06-flatten-array
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. `Array.isArray(x)` is the right "is it an array" check. `typeof` says `'object'` for arrays, objects and `null`.
2. For `flatten`, a small recursive helper with a `depth` parameter is enough. Each time you go one level down, use `depth - 1`. Stop flattening when `depth` is not above `0`. Note that `Infinity - 1` is still `Infinity`.
3. `arr.forEach(...)` skips holes by itself. A `for` loop with `i in arr` also does. The spread `[...arr]` does not: it turns holes into `undefined`.
4. For `flattenDeep`: `stack.pop()` takes the **last** item. To read the items in their original order, push them onto the stack in reverse.
5. Popping an array item and pushing its children is the whole loop. Anything that is not an array goes to the result.
6. For `flattenObject`, write one helper that gets the current node and the path so far. When the node is an array, the child path is the path plus `[index]`. When it is an object, it is the path plus `.` plus the key (without the dot at the very top).
7. `Object.keys(x)` works for both objects and arrays (for arrays it lists the indexes as strings and skips holes).
8. For `unflattenObject`, first split each key into steps. A regular expression with two capture groups (a name, or digits inside brackets) and `String.prototype.matchAll` does it in a few lines. Turn the digits into a number so you can tell them apart from names later.
9. While walking the steps, look at the **next** step to decide what to create: a number means `[]`, a name means `{}`.
10. `Object.hasOwn(obj, key)` is `true` only for the object's own properties, not for inherited ones such as `toString`.

</details>

## Stretch goals

- Make `flatten` accept a fractional depth like the native one does (`flatten(x, 1.9)` behaves like `flatten(x, 1)`).
- Give `flattenObject` and `unflattenObject` an optional `separator` argument (default `'.'`).
- Detect circular arrays and objects and throw a `TypeError` with a clear message, instead of looping or overflowing.
- Write a lazy version, `function* flattenIter(arr)`, that yields one item at a time.
- Make `flattenObject` iterative too, and compare it with the recursive one on a very deep object.
- Support keys that contain dots by escaping them (`'a\\.b'`), in both directions.

## Interview follow-ups to prepare for

**1. Recursion against iteration: when does a recursive `flatten` become a problem, and how does the explicit stack fix it?**

<details>
<summary>Show answer</summary>

Every function call takes space on the **call stack**, and that stack is small: roughly ten thousand frames in Node and Chrome (the exact number depends on the engine and on the size of each frame). An array nested 100,000 levels deep makes a recursive version throw a `RangeError: Maximum call stack size exceeded`. Real data is rarely that deep, but input that comes from users or from an API can be built on purpose to crash you.

An explicit stack is just an array on the **heap**. It is limited by memory, not by the call stack size, so the same loop handles the deep input. You cannot rely on tail-call optimisation in JavaScript to save you, because most engines do not implement it.

Recursion is shorter and easier to read, and it is fine when the depth is naturally small (a UI tree, a menu). Choose iteration when the depth is not under your control. React itself did this move: the old reconciler was recursive and could not be paused halfway, so React 16 rewrote it as a loop over a linked list of fibers (see the internals lesson).

</details>

**2. Where would you flatten data in a React app, and how is that different from normalising API data?**

<details>
<summary>Show answer</summary>

Typical flattening:

- **Arrays**: an infinite list built with TanStack Query's `useInfiniteQuery` gives `data.pages`, an array of pages. `data.pages.flat()` gives one list to render.
- **Objects**: form values and validation errors keyed by field path (`errors['address.city']`), query strings, translation keys, analytics event properties, CSV columns, and comparing two objects field by field.

**Normalising** is a different idea. A nested response such as `posts[]`, each with an `author` and `comments[]`, is split into tables by id: `{ users: { 1: {...} }, posts: { 10: {...} } }`, where posts refer to authors by id. Each entity then exists once, so a change is made in one place and every screen shows it, lookups by id are O(1), and immutable updates touch a small part of the state. Redux Toolkit has `createEntityAdapter` for this, and the `normalizr` library does it for arbitrary shapes. Flattening changes the **shape** of the data (a path for every leaf). Normalising removes **duplicates** and replaces nesting by references.

</details>

**3. What is the time and space complexity of these functions? Why is `arr.reduce((acc, x) => [...acc, ...x], [])` slow?**

<details>
<summary>Show answer</summary>

`flatten` and `flattenDeep` visit every item once and `push` is O(1) amortised, so the time is **O(n)**, where n counts every item, including the nested arrays. The result needs O(n) space. A recursive version also uses call stack space equal to the nesting depth. `flattenDeep` uses a stack that can grow to O(n) in the worst case (one very wide array), on the heap.

The `reduce` with spread creates a **new array at every step** and copies everything collected so far into it. With k top-level items the first items are copied about k times, so the total is **O(n squared)**. The same is true for `reduce` with `concat`. A loop that pushes into one result array avoids it.

`flattenObject` and `unflattenObject` are O(size of the output): every leaf costs the length of its key, because the key string is built from the path above it. A very deep object has long keys, so depth shows up in the cost.

</details>

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (array methods, destructuring, spread, closures)
- [Data fetching](../../../../03-intermediate/02-data-fetching.md) (paginated and infinite lists)
- [State management](../../../../03-intermediate/06-state-management.md) (normalised state)
- React internals deep dive (planned) (why Fiber replaced a recursive reconciler)
- Related exercises: [get and set by path](../10-get-set-by-path/README.md) and [deep clone](../05-deep-clone/README.md)
