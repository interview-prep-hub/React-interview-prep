// Exercise 08: once, before and after.
// Read README.md in this folder for the full requirements.

// TODO 0 (optional): write two small helpers, one that throws a TypeError when a
// value is not a function, and one that throws a RangeError when n is not a whole
// number that is 0 or more. All three functions below need both checks.

export function once(fn) {
  // TODO 1: throw a TypeError when fn is not a function.
  // TODO 2: keep the state that survives between calls in variables here.
  //         You need to remember: "did fn already finish?" and "what did it return?"
  //         Warning: do NOT test the result itself (`if (!result)`). A result like
  //         0, '' or undefined is a real result.

  // Use a normal `function` (not an arrow function), so `this` belongs to the caller.
  return function onced(...args) {
    // TODO 3: first call: run fn with the same `this` and arguments, save the result.
    // TODO 4: later calls: return the saved result without calling fn.
    // TODO 5: think about WHEN you mark "finished". What should happen on the next
    //         call if fn threw? (The README says what the tests expect.)
    return undefined
  }
}

export function before(n, fn) {
  // TODO 6: throw a TypeError for a bad fn, and a RangeError for a bad n.
  // TODO 7: remember how many real calls are left, and the last result.
  return function limited(...args) {
    // TODO 8: while real calls are left, call fn (with `this` and args) and save its result.
    // TODO 9: always return the last saved result.
    return undefined
  }
}

export function after(n, fn) {
  // TODO 10: same two checks as before().
  // TODO 11: remember how many calls are still to be ignored.
  return function delayed(...args) {
    // TODO 12: ignore the early calls (return undefined).
    //          From the n-th call on, call fn and return what it returns.
    return undefined
  }
}
