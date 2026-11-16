// Exercise 05: deepClone.
// Read README.md in this folder for the full requirements.

/**
 * Returns a deep copy of `value`.
 *
 * Handles: primitives, plain objects, arrays, Date, RegExp, Map and Set.
 * Functions are kept by reference. Circular references and shared
 * references are kept (as circular and shared) in the copy.
 *
 * @param {*} value the value to copy
 * @returns {*} the copy
 */
export function deepClone(value) {
  // TODO 1: return primitives and functions unchanged.
  //         Careful: typeof null is 'object'.
  // TODO 2: keep a memory of every object you have already cloned, from
  //         "original object" to "its clone". Which built-in collection can
  //         use objects as keys? Look in this memory first, and reuse the clone.
  // TODO 3: handle each kind of object on its own: Date, RegExp, Map, Set,
  //         array, and everything else (plain objects and class instances).
  //         Put the new, still EMPTY container into your memory BEFORE you
  //         fill it, otherwise a circular reference never finds it.
  // TODO 4: for plain objects copy the string keys AND the symbol keys
  //         (which helpers list symbol keys?) and keep the prototype
  //         (what does Object.create accept?).
  // TODO 5: check "__proto__": an own key with that name must stay an
  //         ordinary key. How do you create a property without the
  //         assignment operator?
  throw new Error('Not implemented')
}
