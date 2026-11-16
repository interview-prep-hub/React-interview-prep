// Reference solution for exercise 09: deepEqual.
// Key ideas:
// - Object.is already gives the primitive rules (NaN equals NaN, +0 and -0 differ)
// - only two OBJECTS of the same kind are worth opening up; everything else is
//   decided by the first checks
// - to survive circular references we remember the pairs we are comparing
//   RIGHT NOW (and forget them when we are done with them)

const toTag = (value) => Object.prototype.toString.call(value)

const isObject = (value) => typeof value === 'object' && value !== null

export function deepEqual(a, b) {
  return equal(a, b, new Map())
}

function equal(a, b, inProgress) {
  // Primitives, the same reference, NaN vs NaN. Functions end here too:
  // two functions are equal only when they are the same function.
  if (Object.is(a, b)) return true
  if (!isObject(a) || !isObject(b)) return false

  // Same kind of object? This rejects class instance vs plain object,
  // Object.create(null) vs {}, array vs object, Date vs Map, and so on.
  // (The tag check is a safety net: it also catches fakes such as
  // Object.create(Date.prototype), which would crash on a.getTime()).
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false
  if (toTag(a) !== toTag(b)) return false

  // Circular references: if this exact pair is already being compared further
  // up the call stack, assume it is equal. Any real difference will be found
  // by the comparison that is still running up there.
  let partners = inProgress.get(a)
  if (partners?.has(b)) return true
  if (!partners) inProgress.set(a, (partners = new Set()))
  partners.add(b)

  const result = compareContents(a, b, inProgress)

  // Forget the pair, so a failed comparison is never mistaken for a match later.
  partners.delete(b)
  return result
}

function compareContents(a, b, inProgress) {
  switch (toTag(a)) {
    case '[object Date]':
      // Object.is, so two invalid dates (NaN time) count as equal.
      return Object.is(a.getTime(), b.getTime())
    case '[object RegExp]':
      return a.source === b.source && a.flags === b.flags
    case '[object Array]':
      return arraysEqual(a, b, inProgress)
    case '[object Map]':
      return mapsEqual(a, b, inProgress)
    case '[object Set]':
      return setsEqual(a, b, inProgress)
    default:
      return objectsEqual(a, b, inProgress)
  }
}

function arraysEqual(a, b, inProgress) {
  if (a.length !== b.length) return false
  // A plain loop (not .every) so that holes in sparse arrays are not skipped.
  for (let i = 0; i < a.length; i++) {
    if (!equal(a[i], b[i], inProgress)) return false
  }
  return true
}

function objectsEqual(a, b, inProgress) {
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  // hasOwn is what tells { x: undefined } apart from {}.
  return keys.every((key) => Object.hasOwn(b, key) && equal(a[key], b[key], inProgress))
}

function mapsEqual(a, b, inProgress) {
  if (a.size !== b.size) return false
  // Keys are matched the way Map itself matches them (same value); values are compared deeply.
  for (const [key, value] of a) {
    if (!b.has(key) || !equal(value, b.get(key), inProgress)) return false
  }
  return true
}

function setsEqual(a, b, inProgress) {
  if (a.size !== b.size) return false
  // Members of `b` that are not yet paired with a member of `a`.
  const unmatched = [...b]
  for (const item of a) {
    const index = unmatched.findIndex((other) => equal(item, other, inProgress))
    if (index === -1) return false
    unmatched.splice(index, 1) // one-to-one: a member of `b` can be used only once
  }
  return true
}
