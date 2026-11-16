// Exercise 17: array polyfills.
// Read README.md in this folder for the full requirements.
//
// Do NOT use the built-in array methods (map, filter, reduce, forEach, find,
// findLast, every, some, flat) to build these. Use plain loops. That is the
// whole point of the exercise.

// TODO 0 (optional but handy): write a small helper that throws a TypeError
// when the callback is not a function, and call it first in every function
// below (even when the array is empty).

/**
 * Like Array.prototype.map. Returns a NEW array of the callback results.
 * myMap([1, 2, 3], (n) => n * 2)  // [2, 4, 6]
 *
 * @param {Array} arr
 * @param {(value: any, index: number, array: Array) => any} callback
 * @param {any} [thisArg] value of `this` inside the callback
 * @returns {Array}
 */
export function myMap(arr, callback, thisArg) {
  // TODO 1: validate the callback.
  // TODO 2: read arr.length ONCE, before the loop.
  // TODO 3: loop over the indexes. Skip holes (indexes that do not exist),
  //         and keep a hole in the result at the same place.
  // TODO 4: call the callback with (value, index, array) and thisArg as `this`.
  throw new Error('Not implemented')
}

/**
 * Like Array.prototype.filter. Keeps the items whose callback result is truthy.
 * myFilter([1, 2, 3, 4], (n) => n % 2 === 0)  // [2, 4]
 */
export function myFilter(arr, callback, thisArg) {
  // TODO 5: same skeleton as myMap, but collect the ORIGINAL items that pass.
  throw new Error('Not implemented')
}

/**
 * Like Array.prototype.forEach. Returns undefined.
 */
export function myForEach(arr, callback, thisArg) {
  // TODO 6: same skeleton again, nothing to collect.
  throw new Error('Not implemented')
}

/**
 * Like Array.prototype.reduce. The callback receives
 * (accumulator, value, index, array).
 * myReduce([1, 2, 3], (sum, n) => sum + n, 0)  // 6
 * myReduce([1, 2, 3], (sum, n) => sum + n)     // 6 (starts from the first item)
 *
 * @param {Array} arr
 * @param {Function} callback
 * @param {...any} rest the optional initial value (see TODO 8)
 */
export function myReduce(arr, callback, ...rest) {
  // TODO 7: validate the callback.
  // TODO 8: was an initial value given? `rest.length` tells you, even when the
  //         value itself is undefined.
  // TODO 9: no initial value: the first item that really exists is the start,
  //         and the loop continues after it. If there is no such item, throw a TypeError.
  // TODO 10: skip holes inside the loop.
  throw new Error('Not implemented')
}

/**
 * Like Array.prototype.find. Returns the first item the callback accepts,
 * or undefined. Careful: find does NOT skip holes (see the README).
 */
export function myFind(arr, callback, thisArg) {
  // TODO 11: loop from the start, return the item (not the index) on the first match.
  throw new Error('Not implemented')
}

/**
 * Like Array.prototype.findLast. Same as myFind, but walks from the end.
 * The callback still gets the ORIGINAL index of each item.
 */
export function myFindLast(arr, callback, thisArg) {
  // TODO 12: loop backwards from the last index.
  throw new Error('Not implemented')
}

/**
 * Like Array.prototype.every. true if the callback accepts every item
 * (true for an empty array). Stops at the first failure.
 */
export function myEvery(arr, callback, thisArg) {
  // TODO 13: return false as soon as one item fails. Return a real boolean.
  throw new Error('Not implemented')
}

/**
 * Like Array.prototype.some. true if the callback accepts at least one item
 * (false for an empty array). Stops at the first success.
 */
export function mySome(arr, callback, thisArg) {
  // TODO 14: return true as soon as one item passes. Return a real boolean.
  throw new Error('Not implemented')
}

/**
 * Like Array.prototype.flat. Returns a NEW array with nested arrays
 * flattened up to `depth` levels. Holes are dropped.
 * myFlat([1, [2, [3]]])            // [1, 2, [3]]
 * myFlat([1, [2, [3]]], Infinity)  // [1, 2, 3]
 *
 * @param {Array} arr
 * @param {number} [depth=1]
 */
export function myFlat(arr, depth = 1) {
  // TODO 15: a helper that calls itself for nested arrays (with depth - 1)
  //          is the simplest way. Only real arrays (Array.isArray) are flattened.
  throw new Error('Not implemented')
}

/**
 * Adds myMap, myFilter, myReduce, myForEach, myFind, myFindLast, myEvery,
 * mySome and myFlat to Array.prototype, so [1, 2, 3].myMap(fn) works.
 * - Never overwrite a method that already exists.
 * - The new methods must not show up in `for (const i in array)`.
 * - Return the names of the methods that were really added.
 *
 * Do NOT call this at the top level of this file. The tests call it themselves.
 *
 * @returns {string[]}
 */
export function installPolyfills() {
  // TODO 16: for each name, skip it when `name in Array.prototype`.
  // TODO 17: add the method with Object.defineProperty (so you can control
  //          `enumerable`). Inside the method, `this` is the array.
  //          Use a normal `function`, not an arrow function.
  // TODO 18: collect and return the names you added.
  throw new Error('Not implemented')
}
