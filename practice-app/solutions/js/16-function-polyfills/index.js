// Reference solution for JS exercise 16: polyfills for call, apply, bind, new and instanceof.
//
// Key ideas:
// - `this` inside a function is decided by HOW the function is called. The
//   rule "obj.method()" gives `this === obj`. So to run `fn` with a chosen
//   `this`, we temporarily make `fn` a method of that object and call it that way.
// - The temporary property key is a fresh Symbol. A Symbol can never clash with
//   a real property of the object, and it is invisible to Object.keys,
//   for...in and JSON.stringify. We delete it in `finally`, so the object is
//   left clean even when `fn` throws.
// - myCall and myBind are small layers on top of myApply, and myApply is the
//   only place that knows the Symbol trick.
// - Known limit of the trick: it must write a property on the context, so it
//   cannot work with a frozen object (the native `call` has no such limit).

const isObjectLike = (value) =>
  (typeof value === 'object' && value !== null) || typeof value === 'function'

export function myApply(fn, ctx, argsArray) {
  if (typeof fn !== 'function') {
    throw new TypeError('myApply: fn must be a function')
  }
  if (argsArray != null && !isObjectLike(argsArray)) {
    throw new TypeError('myApply: argsArray must be an array, an array-like object, null or undefined')
  }

  // null and undefined fall back to the global object. A primitive (5, 'abc')
  // is wrapped in an object, because we cannot add a property to a primitive.
  const context = Object(ctx ?? globalThis)
  const args = Array.from(argsArray ?? []) // also accepts array-likes such as `arguments`

  const key = Symbol('fn')
  context[key] = fn
  try {
    // A method call: inside fn, `this` is `context`.
    return context[key](...args)
  } finally {
    delete context[key]
  }
}

export function myCall(fn, ctx, ...args) {
  return myApply(fn, ctx, args)
}

export function myBind(fn, ctx, ...preset) {
  if (typeof fn !== 'function') {
    throw new TypeError('myBind: fn must be a function')
  }

  // A normal `function` (not an arrow), because it must work with `new`.
  function bound(...later) {
    // Called with `new` (or through myNew), `this` is a fresh object that inherits
    // from bound.prototype. In that case the saved ctx is ignored.
    // We check `this instanceof bound` and not `new.target`, because myNew does
    // not use the real `new` operator, so `new.target` would be undefined there.
    const isConstructCall = this instanceof bound
    return myApply(fn, isConstructCall ? this : ctx, [...preset, ...later])
  }

  // Keep the prototype chain: instances made with `new bound()` must still
  // inherit from fn.prototype. (Arrow functions have no prototype.)
  if (fn.prototype) {
    bound.prototype = Object.create(fn.prototype)
  }

  return bound
}

export function myNew(Constructor, ...args) {
  if (typeof Constructor !== 'function' || !Constructor.prototype) {
    throw new TypeError(`myNew: ${String(Constructor)} is not a constructor`)
  }

  // Step 1: an empty object that inherits from Constructor.prototype.
  const instance = Object.create(Constructor.prototype)
  // Step 2: run the constructor with `this` set to that object.
  const result = myApply(Constructor, instance, args)
  // Step 3: if the constructor returned an object, that object wins.
  // Primitives (and null) are ignored, and we return the new instance.
  return isObjectLike(result) ? result : instance
}

export function myInstanceOf(obj, Constructor) {
  if (typeof Constructor !== 'function') {
    throw new TypeError('myInstanceOf: the right-hand side must be a function')
  }
  // Primitives and null are never instances of anything.
  if (!isObjectLike(obj)) return false

  const target = Constructor.prototype
  if (!isObjectLike(target)) {
    throw new TypeError('myInstanceOf: the function has no usable prototype')
  }

  // Walk up the prototype chain: obj -> its prototype -> that one's prototype ... -> null.
  let proto = Object.getPrototypeOf(obj)
  while (proto !== null) {
    if (proto === target) return true
    proto = Object.getPrototypeOf(proto)
  }
  return false
}
