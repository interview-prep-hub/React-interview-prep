// Exercise 09: deepEqual.
// Read README.md in this folder for the full requirements.

/**
 * Returns true when `a` and `b` have the same content, however deeply nested.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function deepEqual(a, b) {
  // TODO 1: decide every case that needs no digging with ONE call to Object.is
  //         (it already treats NaN as equal to NaN and +0 as different from -0).
  //         Same value => true. If either side is not an object (functions too)
  //         => false.
  // TODO 2: both are objects, so check that they are the SAME KIND:
  //         the same prototype (Object.getPrototypeOf) and the same type tag
  //         (Object.prototype.toString.call). Different kind => false.
  // TODO 3: compare the content, depending on the kind:
  //         Date (by time), RegExp (source and flags), Array (length, then each
  //         index), Map (size, then key and value), Set (size, then one-to-one
  //         matching of members) and plain objects (own keys, then each value).
  //         Remember: { a: undefined } is NOT equal to {}.
  // TODO 4: circular references. Keep a record of the (a, b) pairs that are
  //         being compared right now. If you meet a pair again, assume it is
  //         equal. Remove the pair when you finish with it.
  return undefined
}
