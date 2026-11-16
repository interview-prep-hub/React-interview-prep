// Reference solution for exercise 06: flatten arrays and objects.
//
// Key ideas:
// - flatten: a small recursive helper that counts the depth down
// - flattenDeep: the same job with an explicit stack on the heap, so a
//   100,000-level nesting cannot overflow the call stack
// - flattenObject / unflattenObject: build the path string ("a.d[0]") while
//   walking, and parse it back into steps when rebuilding
// - unflattenObject must be safe: never walk into inherited properties

/**
 * Same as `arr.flat(depth)`, without using `flat`.
 *
 * @param {Array} arr
 * @param {number} [depth=1]
 * @returns {Array} a new array
 */
export function flatten(arr, depth = 1) {
  assertArray(arr, 'flatten')
  const result = []
  flattenInto(result, arr, depth)
  return result
}

function flattenInto(result, arr, depth) {
  // forEach skips holes (empty slots), exactly like Array.prototype.flat does.
  arr.forEach((item) => {
    if (depth > 0 && Array.isArray(item)) {
      flattenInto(result, item, depth - 1)
    } else {
      result.push(item)
    }
  })
}

/**
 * Flattens every level, without recursion.
 *
 * @param {Array} arr
 * @returns {Array} a new array
 */
export function flattenDeep(arr) {
  assertArray(arr, 'flattenDeep')
  const result = []
  const stack = []
  pushReversed(stack, arr)

  while (stack.length > 0) {
    const item = stack.pop()
    if (Array.isArray(item)) {
      // Put the children on the stack. They are pushed in reverse, so that
      // the FIRST child is the next one to be popped (order is preserved).
      pushReversed(stack, item)
    } else {
      result.push(item)
    }
  }
  return result
}

function pushReversed(stack, arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    // `i in arr` is false for a hole. (Spreading would turn holes into undefined.)
    if (i in arr) stack.push(arr[i])
  }
}

/**
 * { a: { b: { c: 1 }, d: [2] } }  ->  { 'a.b.c': 1, 'a.d[0]': 2 }
 *
 * @param {object} obj a plain object
 * @returns {object} a new, flat object
 */
export function flattenObject(obj) {
  if (!isPlainObject(obj)) {
    throw new TypeError('flattenObject expects a plain object')
  }
  const result = {}
  walk(obj, '', result)
  return result
}

function walk(node, path, result) {
  const inArray = Array.isArray(node)
  for (const key of Object.keys(node)) {
    const child = node[key]
    const childPath = inArray ? `${path}[${key}]` : path ? `${path}.${key}` : key

    if (isContainer(child) && Object.keys(child).length > 0) {
      walk(child, childPath, result)
    } else {
      // A leaf. Empty {} and [] are leaves too, so no information is lost.
      result[childPath] = child
    }
  }
}

function isContainer(value) {
  return Array.isArray(value) || isPlainObject(value)
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

// One match is either a name ("a", "d") or an index in brackets ("[0]").
const STEP = /([^.[\]]+)|\[(\d+)\]/g
const UNSAFE_STEPS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * The inverse of flattenObject.
 *
 * @param {object} flat
 * @returns {object} a new nested object
 */
export function unflattenObject(flat) {
  if (!isPlainObject(flat)) {
    throw new TypeError('unflattenObject expects a plain object')
  }

  const result = {}
  for (const [key, value] of Object.entries(flat)) {
    const steps = parseKey(key)
    let node = result

    // Walk (and create) every container except the last step.
    for (let i = 0; i < steps.length - 1; i++) {
      const step = steps[i]
      // Own properties only: "toString" must not lead us into Object.prototype.
      if (!Object.hasOwn(node, step)) {
        // The NEXT step tells us what to create: a number means an array.
        node[step] = typeof steps[i + 1] === 'number' ? [] : {}
      }
      node = node[step]
    }
    node[steps[steps.length - 1]] = value
  }
  return result
}

function parseKey(key) {
  const steps = [...key.matchAll(STEP)].map((match) =>
    match[1] !== undefined ? match[1] : Number(match[2]),
  )
  if (steps.length === 0) {
    throw new TypeError(`Invalid key: "${key}"`)
  }
  if (steps.some((step) => UNSAFE_STEPS.has(step))) {
    throw new TypeError(`Unsafe key: ${key}`)
  }
  return steps
}

function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} expects an array`)
  }
}
