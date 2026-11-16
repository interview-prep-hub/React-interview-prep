# 18 - Array utils: groupBy, chunk, sortBy and friends

**Level:** Easy | **Time:** 30 minutes | **Topics:** arrays, `Set`, stable sorting, immutability, Fisher-Yates shuffle, time complexity

## The task

Every project grows a little "utils" file. This exercise builds the twelve array helpers that show up most often, both in real code and in interviews (the "write `groupBy`" or "write `chunk`" question):

- `groupBy`, `countBy`, `uniqBy` and `partition` sort items into piles.
- `chunk`, `zip`, `unzip` and `range` build arrays of a given shape.
- `sortBy` sorts by one or more keys, without changing the original.
- `intersection` and `difference` compare two lists using a `Set`.
- `shuffle` mixes a list with the Fisher-Yates algorithm. You can pass in your own random number generator, which makes it testable.

The big rule: **input arrays are never changed.** Each function builds and returns a new array or object. This is the same rule React puts on your state. The tests hand you frozen arrays, so a stray `push` or `sort` on the input throws an error.

Work in [`index.js`](./index.js). Do not edit the test file.

## Requirements

**Rules for every function**

1. Never change an input array. The items inside are not copied: a result holds the same object references as the input.
2. If an argument that must be an array is not one, throw a `TypeError`. For `zip`, `intersection` and `difference` this covers every array argument. `unzip` checks its argument and every group inside it.
3. **The `keyFnOrProp` argument** (used by `groupBy`, `countBy`, `uniqBy`, and by every key of `sortBy`) is either a function `(item, index) => key`, or a string property name: `'age'` means `item.age`. Anything else is a `TypeError`, and this is checked even when the array is empty.

**The functions**

4. `groupBy(arr, keyFnOrProp)` returns an object that maps each key to an array of the items with that key. Inside a group the items keep their original order.
    - Keys become strings, like all object keys: grouping by `Math.floor` gives the keys `"1"`, `"2"`, and so on.
    - An item without the property goes under the key `"undefined"`.
    - Names like `"constructor"`, `"toString"` and `"hasOwnProperty"` are ordinary group names and must work.
    - An empty array gives `{}`.
5. `countBy(arr, keyFnOrProp)` is the same, but each value is the number of items with that key. The same key rules apply.
6. `chunk(arr, size)` returns an array of new arrays, each with `size` items. The last one may be shorter. An empty array gives `[]`. A `size` bigger than the array gives one chunk. If `size` is not a positive integer (`0`, `-1`, `1.5`, `NaN`, `undefined`), throw a `RangeError`.
7. `uniqBy(arr, keyFnOrProp)` keeps the **first** item for each key and keeps the original order. Keys are compared the way a `Set` compares values: `1` and `"1"` are different keys, and `NaN` equals `NaN`. (This is different from `groupBy`, which turns keys into strings.)
8. `partition(arr, predicate)` returns `[passing, failing]`: the items for which `predicate(item, index)` is truthy, and the rest. Both keep the original order. A `predicate` that is not a function is a `TypeError`.
9. `zip(...arrays)` returns an array in which item `i` is an array holding item `i` of every argument, in argument order. The result is as long as the **longest** argument. Where an array is too short, the value is a real `undefined` (not a hole). `zip()` with no arguments gives `[]`.
10. `unzip(groups)` is the opposite. It takes **one** argument, an array of groups, and returns an array in which item `i` holds item `i` of every group. The same padding rule applies, and `unzip([])` is `[]`. So `unzip(zip(a, b))` gives `[a, b]` when `a` and `b` have the same length.
11. `sortBy(arr, ...keysOrFns)` returns a new, sorted array.
    - The keys are used in order: the first key decides, the next key only breaks ties, and so on.
    - Each key is a `keyFnOrProp` (rule 3). The function gets `(item, index)` where `index` is the position in the original array.
    - A string key that starts with `"-"` sorts that property from the biggest to the smallest: `'-age'` means property `age`, descending.
    - Values are compared with `<` and `>` (so numbers, strings, booleans and dates work). You may assume that the values of one key all have the same type.
    - The sort is **stable**: items that tie on every key stay in their original order.
    - With no key at all, the items themselves are compared, smallest first.
12. `intersection(first, ...others)` returns the values that are in `first` **and** in every one of `others`. No duplicates, in the order they first appear in `first`. Values are compared like a `Set` does it (`NaN` is found, `1` and `"1"` differ, objects are compared by reference, so two different objects with the same content do not match). With no `others`, it returns the unique values of `first`.
13. `difference(first, ...others)` returns the values of `first` that are in **none** of `others`. No duplicates, in the order they first appear in `first`, compared like a `Set` compares. With no `others`, it returns the unique values of `first`.
14. `range(start, end, step = 1)` returns `start`, `start + step`, `start + 2 * step`, and so on, stopping **before** `end`.
    - With one argument, `range(n)` means `range(0, n)`.
    - A negative `step` counts down: `range(5, 0, -1)` is `[5, 4, 3, 2, 1]`.
    - If the step walks away from `end`, or `start` equals `end`, the result is `[]`.
    - Decimal steps work (`range(0, 1, 0.25)`).
    - Every argument must be a finite number, otherwise throw a `TypeError` (so `'5'`, `NaN` and `Infinity` are rejected). A `step` of `0` is a `RangeError`.
15. `shuffle(arr, rng = Math.random)` returns a new array with the same items in a random order. `rng()` returns a number from `0` up to, but not including, `1`. Write it as the classic **Fisher-Yates** shuffle, exactly like this:
    - Copy the array.
    - For `i` from the last index down to `1`: pick `j = Math.floor(rng() * (i + 1))` and swap the items at `i` and `j`.
    - So `rng` is called exactly `length - 1` times (never for an array with fewer than 2 items).
    - If `rng` is not a function, throw a `TypeError`. When no `rng` is given, `Math.random` is used.

## Examples

```js
const people = [
  { name: 'Ana', team: 'blue', age: 30 },
  { name: 'Ben', team: 'red', age: 25 },
  { name: 'Cleo', team: 'blue', age: 41 },
]

groupBy(people, 'team') // { blue: [Ana, Cleo], red: [Ben] }  (the original objects)
countBy(people, (p) => (p.age >= 30 ? 'senior' : 'junior')) // { senior: 2, junior: 1 }
groupBy([1.2, 1.5, 2.1], Math.floor) // { 1: [1.2, 1.5], 2: [2.1] }
```

```js
chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
partition([1, 2, 3, 4], (n) => n % 2 === 0) // [[2, 4], [1, 3]]
uniqBy([{ id: 1 }, { id: 2 }, { id: 1, extra: true }], 'id') // [{ id: 1 }, { id: 2 }]
```

```js
zip([1, 2, 3], ['a', 'b']) // [[1, 'a'], [2, 'b'], [3, undefined]]
unzip([[1, 'a'], [2, 'b']]) // [[1, 2], ['a', 'b']]
```

```js
sortBy(people, 'team', '-age') // Cleo (blue, 41), Ana (blue, 30), Ben (red, 25)
sortBy(['ccc', 'a', 'bb'], (word) => word.length) // ['a', 'bb', 'ccc']
sortBy([10, 9, 1]) // [1, 9, 10]   (a plain .sort() would give [1, 10, 9])
```

```js
intersection([1, 2, 3, 2], [2, 3, 4]) // [2, 3]
difference([1, 2, 3, 2], [2]) // [1, 3]
range(4) // [0, 1, 2, 3]
range(10, 0, -5) // [10, 5]
shuffle([1, 2, 3, 4], () => 0) // [2, 3, 4, 1]  (a fake rng that always answers 0)
```

## Complexity target

Let n be the length of the array, m the length of the other array, and k the number of sort keys.

- `groupBy`, `countBy`, `uniqBy`, `partition`, `chunk`, `shuffle`: O(n) time. `uniqBy` needs O(n) extra space for its `Set`, `groupBy` needs O(n) for the result, `countBy` only O(number of keys).
- `zip` and `unzip`: O(total number of items, padding included).
- `sortBy`: O(n log n) comparisons, and the keys are worked out **once per item** (O(n * k)), not once per comparison. O(n) extra space, because it sorts a copy.
- `intersection` and `difference`: O(n + m) with a `Set`. The version with `includes` inside `filter` is O(n * m).
- `range`: O(length of the result).

## Acceptance criteria (what the tests check)

- Every function returns the right result for normal input and leaves its (frozen) input alone.
- Wrong argument types give a `TypeError` (not an array, key that is not a function or string, predicate or `rng` that is not a function), also for empty arrays.
- `groupBy` and `countBy`: property name and function keys, `(item, index)` is passed to the function, keys are strings, missing property goes under `"undefined"`, `"constructor"` and `"toString"` work as keys.
- `chunk`: even and uneven splits, empty array, size 1, size bigger than the array, and `RangeError` for bad sizes.
- `uniqBy`: first item wins, order kept, `1` versus `"1"`, `NaN`.
- `partition`: order kept, `index` passed, truthy and falsy values, empty array.
- `zip` and `unzip`: any number of arrays, uneven lengths padded with real `undefined`, empty input, round trip.
- `sortBy`: ascending, descending with `"-"`, several keys, mixed string and function keys, stability, numbers compared as numbers, no keys, the original left untouched.
- `intersection` and `difference`: order, no duplicates, several arrays, `NaN`, `1` versus `"1"`, objects by reference.
- `range`: counting up and down, one argument, steps, decimals, empty results, `RangeError` for step `0`, `TypeError` for non-finite or non-number arguments.
- `shuffle`: same items, new array, exact Fisher-Yates behaviour with a scripted `rng`, `length - 1` calls, default `Math.random`, and no bias over many runs (with a seeded generator, so the test is repeatable).

## How to run

```bash
npm test -- exercises/js/18-array-utils-groupby-chunk
```

JavaScript exercises have no browser page. You only need the tests.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/18-array-utils-groupby-chunk
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Write two helpers first and reuse them: one that throws when a value is not an array, and one that turns "a function or a property name" into a single function. Then the rest of the code only ever deals with functions: `typeof x === 'function' ? x : (item) => item[x]`.
2. `groupBy`: loop once. If `groups[key]` does not exist yet, create it as `[]`, then push. The `??=` operator ("assign if null or undefined") does that in one line. Watch out for the key `"constructor"`: a plain `{}` already has a property with that name, so `groups['constructor']` is not `undefined`. Either create the object with `Object.create(null)` (no inherited names at all) or check with `Object.hasOwn(groups, key)`.
3. `chunk`: a loop with `i += size` and `arr.slice(i, i + size)`. `slice` copies, so the input is safe. Do not use `splice`: it changes the array and shifts everything left on every call.
4. `uniqBy`: keep a `Set` of keys you have seen. Add the item to the result only if its key is new.
5. `zip` and `unzip` are the same operation, a transpose (rows become columns). Write one helper that takes a list of arrays: find the longest length with `Math.max`, then build each row with `Array.from({ length }, (_, i) => lists.map((list) => list[i]))`. Reading past the end of an array gives a real `undefined`, which is exactly the padding you need.
6. `sortBy`: `Array.prototype.sort` changes the array it is called on, so sort a copy. First turn every key into a small object like `{ getKey, direction }` where `direction` is `1` or `-1`. In the comparator go through the keys: if `a < b` return `-direction`, if `a > b` return `direction`, and only if all keys tie return `0`. Do not subtract values (`a - b` is `NaN` for strings). Sorting in the browser and in Node is stable since 2019, so you get stability for free. To avoid calling key functions many times, compute the key values once per item before sorting.
7. `intersection`: `new Set(first)` removes duplicates and keeps first-seen order. Make a `Set` for each other array and keep a value if every set has it. `difference`: put all values of the other arrays into one `Set`, keep the values of `first` that are not in it.
8. `range`: the number of items is `Math.ceil((end - start) / step)`, but never less than `0`. Build the items with `Array.from({ length }, (_, i) => start + i * step)`. Multiplying is better than adding the step again and again, because decimal rounding errors would pile up. Handle the one-argument form first. `Number.isFinite('5')` is `false`, which is just what you want.
9. `shuffle`: copy with `[...arr]`, then `for (let i = copy.length - 1; i > 0; i--)`. Swap two items without a temporary variable: `[copy[i], copy[j]] = [copy[j], copy[i]]` (put a `;` before that line if the line above has no semicolon).

</details>

## Stretch goals

- **Dotted paths.** Let a string key be a path such as `'user.address.city'`, using the `get` function from [10-get-set-by-path](../10-get-set-by-path/README.md).
- **Explicit order.** Let `sortBy` take `{ by: 'age', order: 'desc' }` objects as well, so a property that really starts with `"-"` can be sorted.
- **Locale-aware text.** Sort strings with `Intl.Collator` so that `"a"`, `"B"` and `"e"` with an accent sort the way people expect (the `<` operator puts every capital letter before every small letter).
- Write `groupByMap`, which returns a `Map` instead of an object (so keys keep their type and their order), then `countByMap`.
- Add `sample(arr, n)` (n random items without repeats, using the first `n` steps of a Fisher-Yates), `windows(arr, size)` (`windows([1, 2, 3], 2)` gives `[[1, 2], [2, 3]]`) and `zipWith(fn, ...arrays)`.
- Write a seeded random number generator and use it to shuffle a list on the server and on the client in the same way.

## Interview follow-ups to prepare for

**1. `Object.groupBy` / `Map.groupBy`**

- Modern JavaScript (ES2024) has this built in: `Object.groupBy(items, (item, index) => key)` returns an object, and `Map.groupBy(items, fn)` returns a `Map`. Which environments have them? (All current browsers and Node 21 and newer. Not Node 20, so older code still needs a helper like yours.)
- `Object.groupBy` returns an object with **no prototype** (`Object.getPrototypeOf(result)` is `null`). Why did the designers do that? (So a group named `"constructor"` or `"toString"` cannot clash with an inherited property. This is the bug the tests of this exercise try to catch.)
- Why would you pick `Map.groupBy`? Object keys are always strings (or symbols), and keys that look like integers are sorted first: `Object.keys(Object.groupBy([{ id: 10 }, { id: 2 }, { id: 33 }], (r) => r.id))` gives `['2', '10', '33']`. The `Map` version gives the keys `10, 2, 33`, still numbers, in the order they were first seen. A `Map` can also use an object as a key.
- In React, you often group data and then render sections: `Object.entries(grouped).map(([team, members]) => <Section key={team} ... />)`. What do you need to remember about the order of those sections, and about the `key`?
- How would you write `groupBy` with `reduce`? What is the trap with `{ ...acc, [key]: [...(acc[key] ?? []), item] }`? (It copies everything on every step, so it is O(n squared). See exercise [17-array-polyfills](../17-array-polyfills/README.md), follow-up 3.)

**2. Sorting in React lists (copy before sort)**

- `sort` changes the array in place **and** returns that same array. So `const sorted = items.sort(compare)` inside a component changes `items`, which may be props or state. Why is that a bug in React? (State and props must not be changed. Other components that read the same array see the new order. And `setItems(items.sort(compare))` hands React the same array reference, so React may see "nothing changed" and skip the re-render.)
- The fixes: copy first, `[...items].sort(compare)` or `items.slice().sort(compare)`; or use `items.toSorted(compare)` (ES2023); or use your `sortBy`, which copies by design.
- Where should the sorted list live? Do not store a second, sorted copy of the list in state (two sources of truth that drift apart). Store the *sort key* in state and compute the sorted list while rendering: `const visible = sortBy(items, sortKey)`. When is `useMemo` worth adding? (Only when the list is big and you measured a problem.)
- A table with sortable columns: the user clicks "Team", then "Age". Why does a **stable** sort give a nicer result than an unstable one? (Rows with the same age keep the team order from the first click.) Since when is `Array.prototype.sort` required to be stable? (ES2019.)
- `[10, 9, 1].sort()` gives `[1, 10, 9]`. Why? (With no comparator, items are compared as text.) For text with accents and mixed case, what is better than `<`? (`localeCompare` or `Intl.Collator`.)
- Sorted rows still need stable keys: a database id, not the index. See exercise [17-array-polyfills](../17-array-polyfills/README.md), follow-up 1.

**3. Complexity of each**

- Walk through the functions and say the time and the extra space of each, out loud. Most are O(n). Which ones are not, and why? (`sortBy` is O(n log n) because sorting needs about that many comparisons. `zip` is O(longest length times number of arrays).)
- Why is `intersection` O(n + m) with a `Set` but O(n * m) with `first.filter((x) => second.includes(x))`? (`includes` scans the whole second array for every item. A `Set` lookup takes constant time on average.) At what size does it start to matter?
- What is the cost of `uniqBy` written with two nested loops, or with `filter` and `indexOf`? Compare with the `Set` version.
- `chunk` written with `while (arr.length) result.push(arr.splice(0, size))` changes the input and shifts the rest of the array on every step. What does that cost? (O(n squared / size) for the shifting, and the input is destroyed.) The `slice` version is O(n).
- Why is the shuffle `arr.sort(() => Math.random() - 0.5)` wrong? (The comparator is not consistent, so the result is biased and depends on the sorting algorithm. It also costs O(n log n) where Fisher-Yates costs O(n).) Why does Fisher-Yates give every ordering the same chance?
- Space: which of your functions could work in place, and why did we choose to return new arrays instead? (Immutability: callers and React can trust that their data did not change. The price is O(n) extra memory.)
- If the key function itself costs O(c), what is the total for `groupBy`? For `sortBy`, why does computing each key once matter? (n * c instead of about n * log n * c.)

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (array methods, destructuring, immutability)
- [Conditional rendering and lists](../../../../01-basics/06-conditional-rendering-and-lists.md) (`filter`, `sort`, keys, empty states)
- [useState in depth](../../../../02-hooks/02-usestate-in-depth.md) (updating arrays in state, derived state)
- [Memoization in React](../../../../02-hooks/07-memoization.md) (`useMemo` for a sorted or grouped list)
- [Round 5 - JavaScript coding](../../../../05-interview-rounds/round-5-javascript-coding/README.md) (how this kind of question is asked)
