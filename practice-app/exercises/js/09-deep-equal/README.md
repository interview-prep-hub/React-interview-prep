# 09 - Deep equal

**Level:** Medium | **Time:** 30 minutes | **Topics:** recursion, `Object.is`, type checks, `Map` and `Set`, circular references

## The task

`===` compares objects by reference, so `{ a: 1 } === { a: 1 }` is `false`, even though both hold the same data. Write `deepEqual(a, b)`: it returns `true` when two values have the same content, however deeply they are nested, and `false` otherwise.

This is a classic interview question because it looks easy (a few `if` lines and a loop) and then hides a dozen small traps: `NaN`, `-0`, `undefined` keys, dates, sets, class instances, and objects that point to themselves.

Work in [`index.js`](./index.js). Do not edit the test file.

## Requirements

1. Export a function `deepEqual(a, b)`. It returns exactly `true` or `false`, and it never changes `a` or `b`.
2. **Primitives** follow the rules of `Object.is`:
   - `NaN` equals `NaN`.
   - `0` and `-0` are different.
   - `1` and `'1'` are different, `null` and `undefined` are different, `1n` and `1` are different.
   - Two different Symbols are different, even when their descriptions match.
3. **Arrays** are equal when they have the same length and the items at the same index are deeply equal. Order matters.
4. **Plain objects** are equal when they have the same own keys and each value is deeply equal. The order of the keys does not matter. A key that holds `undefined` is different from a missing key: `{ a: undefined }` is not equal to `{}`.
5. **`Date`** values are equal when they hold the same time. **`RegExp`** values are equal when `source` and `flags` are both the same.
6. **`Map`** values are equal when they have the same size and every key of one exists in the other (keys are matched the way `Map` matches them, so by identity for objects) and the values for that key are deeply equal. Insertion order does not matter.
7. **`Set`** values are equal when they have the same size and the members can be paired one-to-one: every member of one set has its own, deeply equal partner in the other set. Order does not matter, and object members are compared by content.
8. **Different kinds are never equal.** Two objects must have the same prototype to be equal:
   - an instance of a class is not equal to a plain object with the same fields
   - instances of two different classes are not equal, and neither are a subclass instance and a parent class instance
   - an array is not equal to a plain object, a `Date` is not equal to a `Map`, and so on
   - an object created with `Object.create(null)` is not equal to `{}` (but two such objects with the same content are equal)
9. **Functions** are equal only when they are the same function (same reference). Two functions with identical code are different.
10. **Circular references** must not crash or hang. Two structures that contain cycles of the same shape are equal, and a difference inside a cycle is still found.
11. An object is never equal to a primitive or to `null`.

You do **not** need to support: typed arrays, `ArrayBuffer`, `Error` objects, boxed primitives such as `new Number(1)`, `WeakMap` and `WeakSet`, Symbol keys, non-enumerable properties, getters, invalid Dates, or extra properties stored on an array.

## Examples

```js
deepEqual({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 }) // true  (key order is ignored)
deepEqual({ a: undefined }, {})                     // false (key present vs key missing)
deepEqual(NaN, NaN)                                 // true
deepEqual(0, -0)                                    // false
deepEqual(new Set([{ id: 1 }]), new Set([{ id: 1 }])) // true  (members are compared by content)
deepEqual(new Map([['a', 1]]), new Map([['a', 2]])) // false (different value for the same key)

class Point { constructor() { this.x = 1 } }
deepEqual(new Point(), { x: 1 })                    // false (different prototypes)

const a = { name: 'node' }
a.self = a
const b = { name: 'node' }
b.self = b
deepEqual(a, b)                                     // true  (and no stack overflow)
```

## Complexity target

- **Time:** O(n), where n is the total number of values inside both inputs. Each pair of values is visited once. (Comparing a `Set` of objects can cost O(m squared) for m members. That is acceptable here.)
- **Extra space:** O(depth) for the recursion, plus the pairs of objects you are comparing at this moment (for the cycle check).

## Acceptance criteria (what the tests check)

- Primitives: equal and different pairs, `NaN`, `+0` versus `-0`, also when they sit inside objects and arrays.
- Plain objects: nested values, key order, extra keys in both directions, `undefined` versus missing key.
- Arrays: order, length, nesting, array versus object.
- `Date` and `RegExp`: same and different values, and not equal to other kinds of values.
- `Map` and `Set`: order independence, different size, deep values and members, one-to-one pairing of set members, `NaN` as a member.
- Prototypes: same class, different classes, subclass, plain object, `Object.create(null)`.
- Functions: only the same reference is equal.
- Circular references: self references, parent and child pointing at each other, arrays, `Map` and `Set` that contain themselves, one-sided cycles, and the rule that a failed comparison is never remembered as a match.
- Shared (not circular) references behave like copies, the answer is the same in both directions, and frozen input is not modified.

## How to run

```bash
npm test -- exercises/js/09-deep-equal
```

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/09-deep-equal
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Start with `Object.is(a, b)`. If it is `true`, you are done. If either value is not an object (`typeof value === 'object' && value !== null`), the answer is `false`, because `Object.is` already said they are different. Functions end here too.
2. Both are objects now. Compare `Object.getPrototypeOf(a)` and `Object.getPrototypeOf(b)`. Different prototypes means different kinds.
3. `Object.prototype.toString.call(value)` returns a tag such as `'[object Date]'`, `'[object Map]'` or `'[object Array]'`. A `switch` on the tag is a tidy way to pick the right comparison.
4. For plain objects compare `Object.keys(a).length` with `Object.keys(b).length`, then check every key of `a` with `Object.hasOwn(b, key)` before you compare the values. The `hasOwn` check is what separates `{ a: undefined }` from `{}`.
5. For `Set` members that are objects you cannot use `b.has(item)`. Copy the members of `b` into an array of "unmatched" members. For each member of `a`, find the first unmatched member that is deeply equal, and remove it from the array.
6. For cycles, write an inner helper `equal(a, b, inProgress)` so the public function keeps only two parameters. `inProgress` is a `Map` from an object of `a` to a `Set` of objects of `b` that are being compared right now. If the pair is already there, return `true`. Add the pair before you look inside, and remove it when you are done. Removing it matters: a pair that failed must not be treated as a match later.

</details>

## Stretch goals

- Support typed arrays, `Error` objects (compare `name` and `message`) and boxed primitives.
- Compare `Map` keys deeply too, so that two maps with equal-looking object keys are equal.
- Make `Set` comparison fast for primitives: use `b.has(item)` for them and only do the slow search for object members.
- Accept an optional third argument, a customizer function `(a, b) => boolean | undefined`, that can override the result for any pair of values (this is how lodash's `isEqualWith` works).
- Rewrite it with an explicit stack instead of recursion, so a structure nested 100 000 levels deep does not overflow the call stack.
- Write `shallowEqual(a, b)` next to it (see the follow-up questions below).

## Interview follow-ups to prepare for

- How do `React.memo`, `useMemo`, `useCallback` and the `useEffect` dependency array decide that "nothing changed"? Why do they use a shallow `Object.is` comparison and not a deep one? What happens when a parent passes `options={{ a: 1 }}` or `onSelect={() => {}}` to a memoized child on every render?
- Implement `shallowEqual(a, b)`: it compares two objects one level deep, key by key, with `Object.is`. How is it different from `deepEqual` in result and in cost? Where is it used in practice (for example the default comparison of `React.memo`, or the equality function you can give to a selector hook)?
- What does a deep comparison cost, and when is it a bad idea? Think about running it on every render with a big list. What do you do instead (immutable updates and reference checks, comparing an `id` or `version`, `useMemo` to keep an object's identity stable)? Name a case where `deepEqual` is still a good choice (tests, a "has the form changed?" check on a small object).

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md)
- [Memoization (React.memo, useMemo, useCallback)](../../../../02-hooks/07-memoization.md)
- [How React renders](../../../../04-advanced/01-how-react-renders.md)
- [Performance optimization](../../../../04-advanced/02-performance-optimization.md)
