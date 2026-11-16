// Exercise 18: array utilities (groupBy, chunk, sortBy and friends).
// Read README.md in this folder for the full requirements.
//
// Golden rule: never change the arrays you receive. Build and return new ones.
// (The tests pass in frozen arrays, so a push or a sort on the input will throw.)

// TODO 0 (optional but handy): write two small helpers and use them everywhere.
//   - assertArray(value): throw a TypeError if `value` is not an array.
//   - toKeyFn(keyFnOrProp): return a function. If you got a function, return it.
//     If you got a string, return a function that reads that property.
//     Anything else is a TypeError.

/**
 * Groups the items by a key. The key is a function (item, index) => key,
 * or a property name.
 * groupBy([1.2, 1.5, 2.1], Math.floor)  // { 1: [1.2, 1.5], 2: [2.1] }
 * groupBy(users, 'role')                // { admin: [...], user: [...] }
 *
 * @param {Array} arr
 * @param {Function|string} keyFnOrProp
 * @returns {Object<string, Array>}
 */
export function groupBy(arr, keyFnOrProp) {
  // TODO 1: validate the arguments (before looking at the items).
  // TODO 2: loop over the items; create the group the first time you see a key.
  //         Watch out for keys such as "constructor" (a plain {} already has it).
  throw new Error('Not implemented')
}

/**
 * Like groupBy, but the values are counts.
 * countBy(['a', 'b', 'a'], (x) => x)  // { a: 2, b: 1 }
 */
export function countBy(arr, keyFnOrProp) {
  // TODO 3: same idea as groupBy, count instead of collect.
  throw new Error('Not implemented')
}

/**
 * Splits an array into pieces of `size` (the last piece may be shorter).
 * chunk([1, 2, 3, 4, 5], 2)  // [[1, 2], [3, 4], [5]]
 *
 * @param {Array} arr
 * @param {number} size a positive integer, otherwise throw a RangeError
 * @returns {Array[]}
 */
export function chunk(arr, size) {
  // TODO 4: validate `arr` (TypeError) and `size` (RangeError).
  // TODO 5: step through the array `size` items at a time.
  throw new Error('Not implemented')
}

/**
 * Keeps the first item for every key.
 * uniqBy([{ id: 1 }, { id: 2 }, { id: 1 }], 'id')  // [{ id: 1 }, { id: 2 }]
 */
export function uniqBy(arr, keyFnOrProp) {
  // TODO 6: remember the keys you have already seen (a Set is a good fit).
  throw new Error('Not implemented')
}

/**
 * Splits an array in two: the items that pass the test and the items that do not.
 * partition([1, 2, 3, 4], (n) => n % 2 === 0)  // [[2, 4], [1, 3]]
 *
 * @param {Array} arr
 * @param {(item: any, index: number) => boolean} predicate
 * @returns {[Array, Array]}
 */
export function partition(arr, predicate) {
  // TODO 7: validate, then fill two arrays in one pass.
  throw new Error('Not implemented')
}

/**
 * Pairs up the items that have the same index.
 * zip([1, 2], ['a', 'b'])  // [[1, 'a'], [2, 'b']]
 * Uses the LONGEST array; missing values are undefined (real undefined, not holes).
 *
 * @param {...Array} arrays
 * @returns {Array[]}
 */
export function zip(...arrays) {
  // TODO 8: every argument must be an array. Find the longest length first.
  //         Tip: unzip below is the same operation, so you can share the code.
  throw new Error('Not implemented')
}

/**
 * The opposite of zip. Takes ONE argument: an array of groups.
 * unzip([[1, 'a'], [2, 'b']])  // [[1, 2], ['a', 'b']]
 *
 * @param {Array[]} groups
 * @returns {Array[]}
 */
export function unzip(groups) {
  // TODO 9: rows become columns.
  throw new Error('Not implemented')
}

/**
 * Returns a sorted COPY. Stable. Several keys; a string key that starts with
 * "-" sorts that property from the biggest to the smallest.
 * sortBy(users, 'team', '-age')   // by team, then oldest first inside a team
 * sortBy(words, (w) => w.length)  // by a function
 * sortBy([3, 1, 2])               // no key: compare the items themselves
 *
 * @param {Array} arr
 * @param {...(Function|string)} keysOrFns
 * @returns {Array}
 */
export function sortBy(arr, ...keysOrFns) {
  // TODO 10: validate every key. With no key at all, use the item itself.
  // TODO 11: turn each key into { function to read the value, direction }.
  // TODO 12: copy the array BEFORE sorting (sort changes the array it is called on).
  // TODO 13: in the comparator, go through the keys; the first key where the two
  //          values differ decides. Compare with < and >, not with subtraction.
  throw new Error('Not implemented')
}

/**
 * Values that appear in the first array AND in every other array.
 * No duplicates, in the order of the first array. Use Sets.
 * intersection([1, 2, 3], [2, 3, 4])  // [2, 3]
 *
 * @param {Array} first
 * @param {...Array} others
 * @returns {Array}
 */
export function intersection(first, ...others) {
  // TODO 14: build a Set from each of the other arrays, then filter the first array.
  throw new Error('Not implemented')
}

/**
 * Values of the first array that appear in none of the other arrays.
 * No duplicates, in the order of the first array. Use a Set.
 * difference([1, 2, 3], [2])  // [1, 3]
 *
 * @param {Array} first
 * @param {...Array} others
 * @returns {Array}
 */
export function difference(first, ...others) {
  // TODO 15: put everything from the other arrays in one Set, then filter.
  throw new Error('Not implemented')
}

/**
 * A list of numbers from `start` up to, but not including, `end`.
 * range(3)         // [0, 1, 2]
 * range(2, 5)      // [2, 3, 4]
 * range(5, 0, -2)  // [5, 3, 1]
 *
 * @param {number} start (or the end, when it is the only argument)
 * @param {number} [end]
 * @param {number} [step=1]
 * @returns {number[]}
 */
export function range(start, end, step = 1) {
  // TODO 16: with one argument, the start is 0.
  // TODO 17: every argument must be a finite number (TypeError). A step of 0 is a RangeError.
  // TODO 18: work out how many numbers there are, never less than 0, then build them.
  throw new Error('Not implemented')
}

/**
 * Fisher-Yates shuffle. Returns a shuffled COPY.
 * `rng` returns a number from 0 up to (not including) 1. Tests pass their own.
 *
 * @param {Array} arr
 * @param {() => number} [rng=Math.random]
 * @returns {Array}
 */
export function shuffle(arr, rng = Math.random) {
  // TODO 19: validate `arr` and `rng`.
  // TODO 20: copy the array, then walk i from the last index down to 1.
  //          Pick j = Math.floor(rng() * (i + 1)) and swap items i and j.
  throw new Error('Not implemented')
}
