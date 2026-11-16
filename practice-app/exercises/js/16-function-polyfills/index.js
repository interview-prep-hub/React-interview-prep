// Exercise 16: polyfills for call, apply, bind, new and instanceof.
// Read README.md in this folder for the full requirements.
//
// The rule: inside this file do NOT use the native call, apply or bind
// (also not Reflect.apply or Reflect.construct), and do not use the `new`
// operator to build the result of myNew. You may use anything else.

// myApply(fn, ctx, argsArray): same as fn.apply(ctx, argsArray)
export function myApply(fn, ctx, argsArray) {
  // TODO 1: throw a TypeError when fn is not a function, or when argsArray is
  //   something other than an array, an array-like object, null or undefined.

  // TODO 2: decide what `this` will be. null/undefined mean the global object
  //   (globalThis). A primitive such as 5 or 'abc' needs to be wrapped in an object.
  //   Hint: Object(value) does the wrapping.

  // TODO 3: the trick. A function gets `this === obj` when it is called as obj.method().
  //   So: put fn on the context under a unique Symbol key, call it through that key
  //   with the arguments spread, and ALWAYS remove the key again (even if fn throws).

  return undefined
}

// myCall(fn, ctx, ...args): same as fn.call(ctx, ...args)
export function myCall(fn, ctx, ...args) {
  // TODO 4: this is a one-liner once myApply works.
  return undefined
}

// myBind(fn, ctx, ...preset): same as fn.bind(ctx, ...preset)
export function myBind(fn, ctx, ...preset) {
  // TODO 5: throw a TypeError when fn is not a function.

  // Use a normal `function` here (not an arrow function), because a bound function
  // can be used with `new`, and arrow functions cannot.
  function bound(...later) {
    // TODO 6: when bound is used as a constructor, `this` is a brand new object and
    //   the saved ctx must be ignored. Otherwise use the saved ctx.
    //   Run fn with the preset arguments followed by the later arguments.
    return undefined
  }

  // TODO 7: keep the prototype chain, so objects made with `new bound()` are still
  //   instances of fn (and can use the methods on fn.prototype).
  //   Careful: arrow functions have no prototype.

  return bound
}

// myNew(Constructor, ...args): same as `new Constructor(...args)`
export function myNew(Constructor, ...args) {
  // TODO 8: throw a TypeError when Constructor is not a function, or has no prototype.
  // TODO 9: create an empty object that inherits from Constructor.prototype.
  // TODO 10: run Constructor with `this` set to that object (use your myApply).
  // TODO 11: if the constructor returned an object (or function), return that.
  //   Otherwise return the new object. A primitive or null result is ignored.
  return undefined
}

// myInstanceOf(obj, Constructor): same as `obj instanceof Constructor`
export function myInstanceOf(obj, Constructor) {
  // TODO 12: throw a TypeError when Constructor is not a function.
  // TODO 13: primitives and null are never instances: return false.
  // TODO 14: if Constructor.prototype is not an object, throw a TypeError.
  // TODO 15: walk up the prototype chain of obj (Object.getPrototypeOf) until you find
  //   Constructor.prototype (true) or reach null (false).
  return undefined
}
