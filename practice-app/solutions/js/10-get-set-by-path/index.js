// Reference solution for exercise 10: get / has / set / setIn / unset by path.
// Key ideas:
// - every function first turns the path into an array of keys (toPath),
//   so a string path and an array path behave the same
// - get and has only READ; set and unset change the object IN PLACE;
//   setIn copies only the objects on the way down (structural sharing)
// - set and setIn refuse the keys that make prototype pollution possible,
//   and they only walk into OWN properties, never into inherited ones

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const isObject = (value) => typeof value === 'object' && value !== null

// An array index is a whole number written without a sign or leading zeros.
const isIndexKey = (key) => /^(0|[1-9]\d*)$/.test(key)

// The container to create when the NEXT key is `nextKey`.
const newContainerFor = (nextKey) => (isIndexKey(nextKey) ? [] : {})

// Reads an own property; anything inherited (like toString) counts as missing.
const readOwn = (container, key) => (Object.hasOwn(container, key) ? container[key] : undefined)

// "a.b[0].c" -> ["a", "b", "0", "c"]. An array path is used as it is, so a key
// may contain dots. We always return a NEW array: the caller's path is never changed.
function toPath(path) {
  if (Array.isArray(path)) return path.map(String)
  return String(path).match(/[^.[\]]+/g) ?? []
}

// Shared checks of set and setIn. They run BEFORE anything is changed,
// so a rejected call leaves the object untouched.
function toWritablePath(target, path) {
  if (!isObject(target)) throw new TypeError('The target must be an object or an array')
  const keys = toPath(path)
  if (keys.length === 0) throw new TypeError('The path must not be empty')
  const unsafe = keys.find((key) => UNSAFE_KEYS.has(key))
  if (unsafe !== undefined) throw new TypeError(`The path contains the unsafe key "${unsafe}"`)
  return keys
}

export function get(obj, path, defaultValue) {
  const keys = toPath(path)
  if (keys.length === 0) return defaultValue

  let current = obj
  for (const key of keys) {
    if (current == null) return defaultValue
    current = current[key]
  }
  // Only undefined triggers the default: null, 0, '' and false are real values.
  return current === undefined ? defaultValue : current
}

export function has(obj, path) {
  const keys = toPath(path)
  if (keys.length === 0) return false

  let current = obj
  for (const key of keys) {
    if (current == null || !Object.hasOwn(current, key)) return false
    current = current[key]
  }
  // Every key exists, even if the last value is undefined.
  return true
}

export function set(obj, path, value) {
  const keys = toWritablePath(obj, path)

  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    // Missing, null or a primitive: replace it with a fresh container.
    if (!isObject(readOwn(current, key))) {
      current[key] = newContainerFor(keys[i + 1])
    }
    current = current[key]
  }
  current[keys.at(-1)] = value
  return obj
}

export function setIn(obj, path, value) {
  const keys = toWritablePath(obj, path)
  return updateAt(obj, keys, 0, value)
}

// Returns a copy of `node` in which keys[depth] points to the updated child.
// Every other property of the copy is the SAME object as before (shared).
function updateAt(node, keys, depth, value) {
  const key = keys[depth]
  let child = value

  if (depth < keys.length - 1) {
    const existing = readOwn(node, key)
    const next = isObject(existing) ? existing : newContainerFor(keys[depth + 1])
    child = updateAt(next, keys, depth + 1, value)
  }

  // Shallow copy: only plain objects and arrays are supported here.
  const copy = Array.isArray(node) ? node.slice() : { ...node }
  copy[key] = child
  return copy
}

export function unset(obj, path) {
  const keys = toPath(path)
  // has() only follows own properties, so inherited things such as
  // __proto__ or constructor.prototype are never reached or deleted.
  if (!has(obj, keys)) return false

  const parent = keys.length === 1 ? obj : get(obj, keys.slice(0, -1))
  return delete parent[keys.at(-1)]
}
