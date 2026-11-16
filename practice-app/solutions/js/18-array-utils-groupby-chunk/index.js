// Reference solution for exercise 18: array utilities.
//
// Key ideas:
// - Nothing here changes its input. Every function builds and returns a new array or object.
// - "A property name or a function" is turned into ONE function up front
//   (toKeyFn), so the rest of the code only deals with functions.
// - Sets give O(1) lookups, which turns O(n * m) work into O(n + m).
// - zip and unzip are the same operation (a transpose), so they share a helper.

function assertArray(value, label = 'The first argument') {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array`)
  }
}

// "name" becomes (item) => item.name. A function is used as it is.
// Anything else is a mistake, so fail early (even for an empty array).
function toKeyFn(keyFnOrProp) {
  if (typeof keyFnOrProp === 'function') return keyFnOrProp
  if (typeof keyFnOrProp === 'string') return (item) => item?.[keyFnOrProp]
  throw new TypeError('The key must be a function or a property name (a string)')
}

/**
 * groupBy(users, 'role') -> { admin: [...], user: [...] }
 * Keys become strings, as they always do for object keys.
 */
export function groupBy(arr, keyFnOrProp) {
  assertArray(arr)
  const getKey = toKeyFn(keyFnOrProp)
  // An object WITHOUT a prototype: names like "constructor" or "toString"
  // are then normal keys, exactly like in Object.groupBy.
  const groups = Object.create(null)
  for (let i = 0; i < arr.length; i++) {
    const key = getKey(arr[i], i)
    ;(groups[key] ??= []).push(arr[i])
  }
  return groups
}

export function countBy(arr, keyFnOrProp) {
  assertArray(arr)
  const getKey = toKeyFn(keyFnOrProp)
  const counts = Object.create(null)
  for (let i = 0; i < arr.length; i++) {
    const key = getKey(arr[i], i)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export function chunk(arr, size) {
  assertArray(arr)
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError('The chunk size must be a positive integer')
  }
  const chunks = []
  // slice copies a small piece each time, so the whole job is O(n).
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export function uniqBy(arr, keyFnOrProp) {
  assertArray(arr)
  const getKey = toKeyFn(keyFnOrProp)
  // A Set compares keys with SameValueZero: 1 and "1" differ, NaN equals NaN.
  const seen = new Set()
  const result = []
  for (let i = 0; i < arr.length; i++) {
    const key = getKey(arr[i], i)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(arr[i]) // the first item with this key wins
    }
  }
  return result
}

export function partition(arr, predicate) {
  assertArray(arr)
  if (typeof predicate !== 'function') {
    throw new TypeError('The predicate must be a function')
  }
  const passing = []
  const failing = []
  for (let i = 0; i < arr.length; i++) {
    const target = predicate(arr[i], i) ? passing : failing
    target.push(arr[i])
  }
  return [passing, failing]
}

// Rows become columns and columns become rows. Shorter lists are padded with
// explicit undefined values (not holes), so every row has the same length.
function transpose(lists) {
  lists.forEach((list) => assertArray(list, 'Every argument'))
  const length = lists.reduce((max, list) => Math.max(max, list.length), 0)
  return Array.from({ length }, (_, i) => lists.map((list) => list[i]))
}

export function zip(...arrays) {
  return transpose(arrays)
}

export function unzip(groups) {
  assertArray(groups)
  return transpose(groups)
}

// "-age" means: property "age", biggest first.
function toSortKey(keyOrFn) {
  if (typeof keyOrFn === 'function') {
    return { getKey: keyOrFn, direction: 1 }
  }
  if (typeof keyOrFn === 'string') {
    const descending = keyOrFn.startsWith('-')
    const prop = descending ? keyOrFn.slice(1) : keyOrFn
    return { getKey: (item) => item?.[prop], direction: descending ? -1 : 1 }
  }
  throw new TypeError('Every sort key must be a function or a property name (a string)')
}

const identity = (item) => item

export function sortBy(arr, ...keysOrFns) {
  assertArray(arr)
  const keys = (keysOrFns.length > 0 ? keysOrFns : [identity]).map(toSortKey)

  // Compute every key ONCE per item, then sort. Computing keys inside the
  // comparator would repeat that work about n * log(n) times.
  const decorated = Array.from(arr, (item, index) => ({
    item,
    values: keys.map((key) => key.getKey(item, index)),
  }))

  // Array.prototype.sort is stable (guaranteed since ES2019), so items that
  // tie on every key keep their original order. We sort our own decorated
  // copy, so the input array is never touched.
  decorated.sort((a, b) => {
    for (let k = 0; k < keys.length; k++) {
      // Compare with < and > (not subtraction) so strings and dates work too.
      if (a.values[k] < b.values[k]) return -keys[k].direction
      if (a.values[k] > b.values[k]) return keys[k].direction
    }
    return 0 // tied on every key: the stable sort keeps the original order
  })

  return decorated.map((entry) => entry.item)
}

export function intersection(first, ...others) {
  assertArray(first)
  others.forEach((other) => assertArray(other, 'Every argument'))
  const otherSets = others.map((other) => new Set(other))
  // new Set(first) removes duplicates and keeps first-appearance order.
  return [...new Set(first)].filter((value) => otherSets.every((set) => set.has(value)))
}

export function difference(first, ...others) {
  assertArray(first)
  others.forEach((other) => assertArray(other, 'Every argument'))
  const excluded = new Set(others.flat())
  return [...new Set(first)].filter((value) => !excluded.has(value))
}

/**
 * range(5)        -> [0, 1, 2, 3, 4]
 * range(2, 5)     -> [2, 3, 4]
 * range(5, 0, -2) -> [5, 3, 1]
 * The end is NOT included.
 */
export function range(start, end, step = 1) {
  // One argument means "count from 0 up to it".
  if (end === undefined) {
    end = start
    start = 0
  }
  if (![start, end, step].every(Number.isFinite)) {
    throw new TypeError('range needs finite numbers')
  }
  if (step === 0) {
    throw new RangeError('The step must not be 0')
  }
  // How many steps fit between start and end? Never fewer than 0
  // (a step that walks away from the end gives an empty list).
  const length = Math.max(0, Math.ceil((end - start) / step))
  // start + i * step, not repeated addition, so rounding errors do not pile up.
  return Array.from({ length }, (_, i) => start + i * step)
}

/**
 * Fisher-Yates shuffle on a copy. `rng` returns a number from 0 up to (not
 * including) 1, like Math.random. Tests pass in their own rng.
 */
export function shuffle(arr, rng = Math.random) {
  assertArray(arr)
  if (typeof rng !== 'function') {
    throw new TypeError('rng must be a function')
  }
  const result = [...arr]
  // From the end down to index 1: pick a random spot among the items not yet
  // fixed (0 to i) and swap it into position i. Position i is then final.
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
