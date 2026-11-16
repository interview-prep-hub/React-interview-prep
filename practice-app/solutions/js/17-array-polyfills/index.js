// Reference solution for exercise 17: array polyfills.
//
// Key ideas:
// - Every method has the same skeleton: check the callback first, read the
//   length ONCE (so items appended later are never visited), then walk the
//   indexes.
// - A hole in a sparse array is an index that does not exist. `i in arr` is
//   false for it, so the "skipping" methods test that before each call.
// - The callback gets (value, index, array) and is called with `thisArg` as
//   `this`. `callback.call(thisArg, ...)` does that for us.

function assertFunction(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError(`The callback must be a function, received ${typeof callback}`)
  }
}

export function myMap(arr, callback, thisArg) {
  assertFunction(callback)
  const len = arr.length
  // `new Array(len)` is full of holes, so holes in the source stay holes here.
  const result = new Array(len)
  for (let i = 0; i < len; i++) {
    if (i in arr) result[i] = callback.call(thisArg, arr[i], i, arr)
  }
  return result
}

export function myFilter(arr, callback, thisArg) {
  assertFunction(callback)
  const len = arr.length
  const result = []
  for (let i = 0; i < len; i++) {
    if (i in arr) {
      const value = arr[i]
      if (callback.call(thisArg, value, i, arr)) result.push(value)
    }
  }
  return result
}

export function myForEach(arr, callback, thisArg) {
  assertFunction(callback)
  const len = arr.length
  for (let i = 0; i < len; i++) {
    if (i in arr) callback.call(thisArg, arr[i], i, arr)
  }
}

// The initial value is read from `rest` instead of a named parameter, because
// `myReduce(arr, fn, undefined)` (value given, and it is undefined) must be
// told apart from `myReduce(arr, fn)` (no value given).
export function myReduce(arr, callback, ...rest) {
  assertFunction(callback)
  const len = arr.length
  let i = 0
  let acc

  if (rest.length > 0) {
    acc = rest[0]
  } else {
    // No initial value: the first element that really exists is the start.
    while (i < len && !(i in arr)) i++
    if (i >= len) throw new TypeError('Reduce of empty array with no initial value')
    acc = arr[i]
    i++
  }

  for (; i < len; i++) {
    if (i in arr) acc = callback(acc, arr[i], i, arr)
  }
  return acc
}

// find and findLast do NOT skip holes: they treat a hole as `undefined`.
export function myFind(arr, callback, thisArg) {
  assertFunction(callback)
  const len = arr.length
  for (let i = 0; i < len; i++) {
    const value = arr[i]
    if (callback.call(thisArg, value, i, arr)) return value
  }
  return undefined
}

export function myFindLast(arr, callback, thisArg) {
  assertFunction(callback)
  // Start from the length at the time of the call: appended items are ignored.
  for (let i = arr.length - 1; i >= 0; i--) {
    const value = arr[i]
    if (callback.call(thisArg, value, i, arr)) return value
  }
  return undefined
}

export function myEvery(arr, callback, thisArg) {
  assertFunction(callback)
  const len = arr.length
  for (let i = 0; i < len; i++) {
    // Stop at the first failure.
    if (i in arr && !callback.call(thisArg, arr[i], i, arr)) return false
  }
  return true
}

export function mySome(arr, callback, thisArg) {
  assertFunction(callback)
  const len = arr.length
  for (let i = 0; i < len; i++) {
    // Stop at the first success.
    if (i in arr && callback.call(thisArg, arr[i], i, arr)) return true
  }
  return false
}

// Recursion fits flat well: an array inside the array is the same problem
// with one level less to go. `depth - 1` of Infinity is still Infinity.
function flattenInto(target, source, depth) {
  const len = source.length
  for (let i = 0; i < len; i++) {
    if (!(i in source)) continue // holes are dropped
    const item = source[i]
    if (depth > 0 && Array.isArray(item)) {
      flattenInto(target, item, depth - 1)
    } else {
      target.push(item)
    }
  }
}

export function myFlat(arr, depth = 1) {
  const result = []
  flattenInto(result, arr, depth)
  return result
}

// Inside these functions `this` is the array the method was called on, so they
// must be normal functions (an arrow function has no `this` of its own).
const methods = {
  myMap: function (callback, thisArg) {
    return myMap(this, callback, thisArg)
  },
  myFilter: function (callback, thisArg) {
    return myFilter(this, callback, thisArg)
  },
  myForEach: function (callback, thisArg) {
    return myForEach(this, callback, thisArg)
  },
  // `...rest` keeps "no initial value" different from "initial value undefined".
  myReduce: function (callback, ...rest) {
    return myReduce(this, callback, ...rest)
  },
  myFind: function (callback, thisArg) {
    return myFind(this, callback, thisArg)
  },
  myFindLast: function (callback, thisArg) {
    return myFindLast(this, callback, thisArg)
  },
  myEvery: function (callback, thisArg) {
    return myEvery(this, callback, thisArg)
  },
  mySome: function (callback, thisArg) {
    return mySome(this, callback, thisArg)
  },
  myFlat: function (depth) {
    // Passing `undefined` explicitly still triggers the default of 1.
    return myFlat(this, depth)
  },
}

export function installPolyfills() {
  const installed = []
  for (const [name, method] of Object.entries(methods)) {
    // Never overwrite something that is already there.
    if (name in Array.prototype) continue
    // defineProperty with enumerable: false keeps `for (const i in array)` clean.
    // Built-in methods are writable and configurable, so these are too.
    Object.defineProperty(Array.prototype, name, {
      value: method,
      writable: true,
      configurable: true,
      enumerable: false,
    })
    installed.push(name)
  }
  return installed
}
