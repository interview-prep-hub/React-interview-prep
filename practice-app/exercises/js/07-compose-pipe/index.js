// Exercise 07: compose, pipe, pipeAsync and tap.
// Read README.md in this folder for the full requirements.

// TODO 0 (optional): write a small helper that checks a list of values and throws
// a TypeError for the first one that is not a function. Four functions below
// need the same check, so a helper saves repeated code.

export function pipe(...fns) {
  // TODO 1: throw a TypeError when any argument is not a function.
  // TODO 2: with no functions, the result must act as the identity function.
  // TODO 3: the FIRST function receives all the arguments of the call.
  //         Every function after it receives one value: the result of the one before.
  //         Tip: Array.prototype.reduce can carry "the value so far".
  return function piped() {
    return undefined
  }
}

export function compose(...fns) {
  // TODO 4: same checks as pipe. The only difference is the ORDER:
  //         the last function in the list runs first.
  //         Can you build it from pipe, without repeating the loop?
  return function composed() {
    return undefined
  }
}

export function pipeAsync(...fns) {
  // TODO 5: same bad-argument check as pipe (it happens when you build the chain).
  // TODO 6: return a function that ALWAYS returns a promise.
  //         Each step may be sync or async: wait for a step before you start the next.
  //         A step that throws or rejects must make the returned promise reject,
  //         and the steps after it must not run.
  return async function pipedAsync() {
    return undefined
  }
}

export function tap(fn) {
  // TODO 7: throw a TypeError when fn is not a function.
  // TODO 8: return a function that takes one value x, calls fn(x) only for its
  //         side effect, and then returns x itself (not what fn returned).
  return function tapped() {
    return undefined
  }
}
