// Exercise 10: get / has / set / setIn / unset by path.
// Read README.md in this folder for the full requirements.

// A path is either a string such as "a.b[0].c" or an array such as ["a", "b", 0, "c"].
// Tip: write ONE helper that turns either form into an array of keys, and use it
// in every function below. Never change the path array that the caller passes in.

/**
 * Reads the value at `path`. Returns `defaultValue` only when the result is undefined.
 *
 * @param {object | unknown[] | null | undefined} obj
 * @param {string | Array<string | number>} path
 * @param {unknown} [defaultValue]
 * @returns {unknown}
 */
export function get(obj, path, defaultValue) {
  // TODO 1: turn `path` into an array of keys (an empty path => return defaultValue).
  // TODO 2: walk down the keys. If you meet null or undefined on the way,
  //         stop and return defaultValue.
  // TODO 3: return defaultValue only if the final value is undefined
  //         (null, 0, '', false and NaN are real values and must be returned).
  return undefined
}

/**
 * True when every key of `path` exists as an OWN property (even if the value is undefined).
 *
 * @returns {boolean}
 */
export function has(obj, path) {
  // TODO 4: same walk as get, but ask "does this key exist?" with Object.hasOwn.
  //         Inherited keys such as "toString" do not count. Empty path => false.
  return undefined
}

/**
 * MUTATES `obj`: sets `value` at `path`, creating the missing containers.
 * Returns `obj`.
 *
 * @returns {object}
 */
export function set(obj, path, value) {
  // TODO 5: validate FIRST, before changing anything:
  //         - `obj` must be an object or an array, else throw a TypeError
  //         - the path must not be empty, else throw a TypeError
  //         - the keys "__proto__", "constructor" and "prototype" are not allowed,
  //           else throw a TypeError
  // TODO 6: walk down the path. When the next container is missing (or is null or a
  //         primitive, or only inherited), create one: an array if the NEXT key is
  //         a non-negative integer, otherwise an object.
  // TODO 7: assign `value` at the last key and return `obj`.
  return obj // placeholder: replace with your implementation
}

/**
 * Returns a NEW object with `value` set at `path`. Never mutates `obj`.
 * Only the objects on the path are copied; every other branch keeps its identity.
 *
 * @returns {object}
 */
export function setIn(obj, path, value) {
  // TODO 8: the same validation as in `set`. Share it in one helper.
  // TODO 9: a recursive helper works well: copy the current node (array => slice(),
  //         object => spread), set the key to the updated child, return the copy.
  //         The child is `value` at the last key, otherwise the result of the
  //         recursive call on the existing child (or on a new empty container).
  return obj // placeholder: replace with your implementation
}

/**
 * MUTATES `obj`: deletes the property at `path`.
 * Returns true when something was removed, false when the path did not exist.
 *
 * @returns {boolean}
 */
export function unset(obj, path) {
  // TODO 10: if the path does not exist (use your `has`), return false.
  //          Otherwise find the parent object and use the `delete` operator.
  return undefined
}
