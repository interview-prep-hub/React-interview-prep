// Exercise 06: flatten arrays and objects.
// Read README.md in this folder for the full requirements.

/**
 * Same result as `arr.flat(depth)`, but you may NOT use `flat` or `flatMap`.
 *
 * @param {Array} arr the array to flatten
 * @param {number} [depth=1] how many levels to flatten (Infinity is allowed)
 * @returns {Array} a new array
 */
export function flatten(arr, depth = 1) {
  // TODO 1: throw a TypeError when `arr` is not an array.
  // TODO 2: build a new array. For each item: if it is an array and there is
  //         still depth left, flatten it with one level less; otherwise add it.
  // TODO 3: holes (empty slots) must be skipped, not turned into undefined.
  //         Which array method skips holes by itself?
  throw new Error('Not implemented')
}

/**
 * Flattens every level. Use an explicit stack (an array you push to and pop
 * from) and a loop. No recursion, no `flat`, no `flatMap`.
 *
 * @param {Array} arr the array to flatten
 * @returns {Array} a new array
 */
export function flattenDeep(arr) {
  // TODO 1: throw a TypeError when `arr` is not an array.
  // TODO 2: put the items of `arr` on a stack. Pop one item at a time:
  //         an array gets its own items pushed on the stack, anything else
  //         goes to the result.
  // TODO 3: the order of the result must match the original order.
  //         What happens to the order when you pop from the end of a stack?
  // TODO 4: do not change the input array, and keep holes out of the result.
  //         (`[...arr]` turns holes into undefined, careful.)
  throw new Error('Not implemented')
}

/**
 * { a: { b: { c: 1 }, d: [2] } }  ->  { 'a.b.c': 1, 'a.d[0]': 2 }
 *
 * @param {object} obj a plain object
 * @returns {object} a new object with only one level
 */
export function flattenObject(obj) {
  // TODO 1: throw a TypeError when `obj` is not a plain object
  //         (null, arrays and primitives are rejected).
  // TODO 2: walk the object. Build the path as you go: "." before an object
  //         key (but not at the top), "[index]" for an array item.
  // TODO 3: only plain objects and arrays are walked into. Everything else is
  //         a value (null, Date, Map, functions, class instances ...).
  // TODO 4: an EMPTY object or array is a value too, so it is not lost.
  throw new Error('Not implemented')
}

/**
 * The inverse of flattenObject:
 * { 'a.b.c': 1, 'a.d[0]': 2 }  ->  { a: { b: { c: 1 }, d: [2] } }
 *
 * @param {object} flat an object whose keys are paths
 * @returns {object} a new nested object
 */
export function unflattenObject(flat) {
  // TODO 1: throw a TypeError when `flat` is not a plain object.
  // TODO 2: turn each key into steps. A step is a name ("a") or an index
  //         ("[0]"). A regular expression with two groups can tell them apart.
  // TODO 3: walk the steps, creating the containers that are missing.
  //         Look at the NEXT step: an index means an array, a name means an object.
  // TODO 4: safety. Throw a TypeError when a step is "__proto__",
  //         "constructor" or "prototype". And only walk into a container that
  //         the current object OWNS (what is wrong with "toString.x"?).
  throw new Error('Not implemented')
}
