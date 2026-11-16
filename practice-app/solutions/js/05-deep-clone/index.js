// Reference solution for exercise 05: deepClone.
//
// Key ideas:
// - primitives and functions are returned as they are (nothing to copy)
// - `seen` maps every original object to its clone. It is the single trick
//   behind both circular references and shared references: if we meet an
//   object we have already cloned, we return that clone instead of a new one
// - the EMPTY clone is stored in `seen` BEFORE its children are cloned, so a
//   child that points back to its parent finds the clone and the recursion stops

/**
 * Returns a deep copy of `value`.
 *
 * @param {*} value the value to copy
 * @returns {*} the copy
 */
export function deepClone(value) {
  // A WeakMap is a good fit: the keys are objects, and it holds no memory
  // longer than the call needs.
  return cloneValue(value, new WeakMap())
}

function cloneValue(value, seen) {
  // typeof null is 'object', so null must be checked first.
  // Functions have typeof 'function', so they are returned by reference here.
  if (value === null || typeof value !== 'object') return value

  if (seen.has(value)) return seen.get(value)

  if (value instanceof Date) {
    return remember(seen, value, new Date(value.getTime()))
  }

  if (value instanceof RegExp) {
    const copy = new RegExp(value.source, value.flags)
    copy.lastIndex = value.lastIndex
    return remember(seen, value, copy)
  }

  if (value instanceof Map) {
    const copy = remember(seen, value, new Map())
    // Keys are cloned too (like structuredClone does).
    value.forEach((v, k) => copy.set(cloneValue(k, seen), cloneValue(v, seen)))
    return copy
  }

  if (value instanceof Set) {
    const copy = remember(seen, value, new Set())
    value.forEach((v) => copy.add(cloneValue(v, seen)))
    return copy
  }

  if (Array.isArray(value)) {
    const copy = remember(seen, value, new Array(value.length))
    // forEach skips holes, so a sparse array stays sparse.
    value.forEach((item, index) => {
      copy[index] = cloneValue(item, seen)
    })
    return copy
  }

  // Plain objects and class instances: keep the prototype, copy own
  // enumerable keys (strings AND symbols).
  const copy = remember(seen, value, Object.create(Object.getPrototypeOf(value)))
  for (const key of Reflect.ownKeys(value)) {
    if (!Object.prototype.propertyIsEnumerable.call(value, key)) continue
    // defineProperty (not `copy[key] = ...`) so that an own key named
    // "__proto__" becomes an ordinary property and does not change the prototype.
    Object.defineProperty(copy, key, {
      value: cloneValue(value[key], seen),
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  return copy
}

function remember(seen, original, copy) {
  seen.set(original, copy)
  return copy
}
