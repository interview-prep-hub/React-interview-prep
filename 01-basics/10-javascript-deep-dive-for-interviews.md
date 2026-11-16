# JavaScript Deep Dive for Interviews

> **Level:** Intermediate   **Time:** about 90 minutes   **Read first:** [JavaScript for React](01-javascript-for-react.md)

Interviewers for React roles ask a lot of plain JavaScript. The basics (let/const, arrow functions, destructuring, array methods) live in the first lesson. This lesson covers the depth that comes after: how objects inherit, what `this` really is, why code runs in a surprising order, and how memory leaks happen. Every output shown below was produced by really running the code with Node 24 (the React cleanup example in section 15 was run with Vitest and fake timers).

## What you will learn
- Explain the prototype chain, what `new` does, and why `class` is syntax over prototypes.
- Predict the value of `this` in every call style, and write `bind` from scratch.
- Explain hoisting, the temporal dead zone (TDZ) and closures, and read the call stack as a mental model.
- Predict the result of coercion puzzles and the output order of code that mixes promises and timers.
- Explain promise states, chaining, error propagation, `Promise.all/allSettled/race/any`, and how `async/await` maps to promises.
- Use iterators, generators, `Map`, `Set` and `WeakMap`, find memory leaks in JavaScript and React, and handle errors well.

## 1. Prototypes and the prototype chain
Every object has a hidden link to another object called its **prototype**. When you read `obj.key` and `obj` has no own `key`, JavaScript follows the link and looks on the prototype, then on the prototype's prototype, until it reaches `null`. That path is the **prototype chain**.

```js
const animal = { eats: true };
const dog = Object.create(animal); // new object whose prototype is `animal`
dog.barks = true;

console.log(dog.eats);                        // true  (found on the prototype)
console.log(Object.hasOwn(dog, "eats"));      // false (not an own property)
console.log(Object.hasOwn(dog, "barks"));     // true
console.log(Object.getPrototypeOf(dog) === animal); // true
```

**What happens, step by step:**
1. `Object.create(animal)` makes an empty object and links it to `animal`.
2. `dog.barks = true` writes an **own** property on `dog`. Writes never go to the prototype.
3. `dog.eats` is not on `dog`, so the engine checks `animal` and finds it.
4. `Object.hasOwn(obj, key)` asks "is it on this object itself?" (use it instead of `obj.hasOwnProperty`).

### `__proto__` vs `prototype` (the classic confusion)
- `prototype` is a property of **functions** (used as constructors). It is the object that becomes the link of instances made with `new`.
- `__proto__` is a property of **instances**. It is the actual link. Prefer `Object.getPrototypeOf(obj)` in real code.

```js
function Person(name) { this.name = name; }
Person.prototype.greet = function () { return "Hi " + this.name; };

const p = new Person("Ann");
console.log(p.greet());                                   // Hi Ann
console.log(p.__proto__ === Person.prototype);            // true
console.log(p instanceof Person);                         // true
console.log(Person.prototype.constructor === Person);     // true
console.log(Object.getPrototypeOf(Person.prototype) === Object.prototype); // true
console.log(Object.getPrototypeOf(Object.prototype));     // null (end of the chain)
console.log(Object.keys(p), "greet" in p, p.hasOwnProperty("greet")); // [ 'name' ] true false
```

**What `new Person("Ann")` does, step by step:**
1. Creates an empty object.
2. Links its prototype to `Person.prototype`.
3. Runs `Person` with `this` set to that object (so `this.name = name` writes an own property).
4. Returns that object, unless the function returns another **object** (returning a number or string is ignored).

The chain for `p` is: `p` then `Person.prototype` then `Object.prototype` then `null`. `instanceof` simply walks this chain and checks whether `Person.prototype` appears in it. `in` checks the whole chain, `hasOwn` checks only the object.

**Common mistake:** putting methods inside the constructor, so every instance gets its own copy.

```js
// Wasteful: a new function object for every instance
function Bad(name) { this.name = name; this.greet = function () { return this.name; }; }
// Better: one shared function on the prototype
function Good(name) { this.name = name; }
Good.prototype.greet = function () { return this.name; };
```

## 2. Classes are syntax over prototypes
`class` does not add a new object model. It is a cleaner way to write constructor functions and prototype methods, plus a few safety rules.

```js
class Animal {
  #energy = 10;                 // private field: only code inside the class can touch it
  static count = 0;             // belongs to the class itself, not to instances
  constructor(name) { this.name = name; Animal.count++; }
  get energy() { return this.#energy; }       // getter: read like a property
  speak() { return `${this.name} makes a sound`; }
  static create(name) { return new this(name); }
}
class Dog extends Animal {
  speak() { return super.speak() + " (woof)"; }
}

const d = Dog.create("Rex");
console.log(d.speak());                     // Rex makes a sound (woof)
console.log(d.energy, Dog.count);           // 10 1
console.log(Object.keys(d));                // [ 'name' ]
console.log(d instanceof Animal);           // true
console.log(typeof Animal);                 // function
console.log(Object.getPrototypeOf(Dog) === Animal);                  // true
console.log(Object.getPrototypeOf(Dog.prototype) === Animal.prototype); // true
```

**What happens, step by step:**
1. `Animal` is still a function. Its methods (`speak`, the `energy` getter) sit on `Animal.prototype` and are not enumerable, so `Object.keys` does not list them.
2. `extends` sets two links: `Dog.prototype` inherits from `Animal.prototype` (instance methods), and `Dog` itself inherits from `Animal` (static members, which is why `Dog.count` works).
3. `super.speak()` calls the parent's method with the current `this`.
4. `#energy` is truly private. Writing `d.#energy` outside the class is a `SyntaxError`, not just `undefined`. Inside the class, `#energy in obj` tests for it.
5. `static create` uses `new this(name)`, so calling `Dog.create` builds a `Dog`.

Two safety rules that plain functions do not have:
```js
try { Animal("x"); } catch (e) { console.log(e.name + ": " + e.message); }
// TypeError: Class constructor Animal cannot be invoked without 'new'
class Bad extends Animal { constructor() { this.x = 1; super(); } }
try { new Bad(); } catch (e) { console.log(e.name + ": " + e.message); }
// ReferenceError: Must call super constructor in derived class before accessing 'this' or returning from derived constructor
```
**Common mistake:** touching `this` in a subclass constructor before calling `super(...)`. Fix: call `super(...)` first.

Why this matters for React: modern React uses function components, so you rarely write classes. Classes still appear in error boundaries and older code (see legacy class components (planned)), and interviewers use them to test prototype knowledge.

## 3. `this` in depth
`this` is not decided where a function is written. It is decided by **how the function is called**. There are five rules; check them in this order:

1. **`new`**: `this` is the brand new object.
2. **Explicit**: `fn.call(obj, ...)`, `fn.apply(obj, [...])` or `fn.bind(obj)` set `this` to `obj`.
3. **Implicit**: `obj.method()` sets `this` to `obj` (the thing left of the dot at call time).
4. **Default**: a plain call `fn()` gives `undefined` in strict mode (modules and classes are always strict) or the global object in old sloppy scripts.
5. **Arrow functions** have no `this` of their own. They use the `this` of the code around them, fixed forever.

`call` and `apply` run the function now (`apply` takes an array). `bind` returns a new function with `this` (and optionally the first arguments) fixed.

```js
"use strict";
const user = {
  name: "Ann",
  hello() { return this === undefined ? "lost this" : this.name; },
  later() { return [1, 2].map(() => this.name); },                       // arrow: uses later's this
  laterBad() { return [1, 2].map(function () { return this === undefined; }); }, // normal function: default rule
};

const f = user.hello;
console.log(f());                               // lost this
console.log(user.hello());                      // Ann
console.log((0, user.hello)());                 // lost this
console.log((user.hello)());                    // Ann
console.log(user.hello.call({ name: "Bob" }));  // Bob
const bound = user.hello.bind({ name: "Bob" });
console.log(bound(), bound.call({ name: "Cy" })); // Bob Bob
console.log(user.later(), user.laterBad());     // [ 'Ann', 'Ann' ] [ true, true ]
```

**What happens, step by step:**
1. `f()` copies the function out of the object. The call has nothing left of the dot, so the default rule applies: `this` is `undefined`.
2. `user.hello()` has `user` left of the dot, so `this` is `user`.
3. `(0, user.hello)()` uses the comma operator, which returns the bare function value and drops the object link, so `this` is lost again. Plain parentheses `(user.hello)()` keep the link.
4. `call` replaces `this` for one call. `bind` makes a permanent copy: a later `.call` cannot override it (an explicit `bind` wins).
5. In `later`, the arrow function takes `this` from `later`, which was called as `user.later()`. In `laterBad`, the callback is a plain function called by `map`, so the default rule gives `undefined`.

An arrow function used as an object method does not get the object: `{ hi: () => this }` uses the `this` of the code that wrote the object literal.

**Why React cares:** passing `this.handleClick` as a callback in a class component loses `this` (the rule 4 case), which is why old code had `this.handleClick = this.handleClick.bind(this)` in constructors. Function components avoid the problem.

### Write `bind` from scratch
This is a very common interview task. First the idea, then the code that also handles `new`.

```js
Function.prototype.myBind = function (thisArg, ...preset) {
  const target = this;                       // the function we are binding
  if (typeof target !== "function") throw new TypeError("myBind must be called on a function");
  function bound(...rest) {
    // when used with `new`, `this` is the new object and thisArg must be ignored
    const self = this instanceof bound ? this : thisArg;
    return target.apply(self, [...preset, ...rest]);
  }
  bound.prototype = Object.create(target.prototype); // so `new bound()` still passes instanceof target
  return bound;
};

function show(greeting, punct) { return `${greeting}, ${this.name}${punct}`; }
console.log(show.myBind({ name: "Dee" }, "Hello")("!"));  // Hello, Dee!

function Pt(x, y) { this.x = x; this.y = y; }
const BoundPt = Pt.myBind({ ignored: true }, 1);
const pt = new BoundPt(2);
console.log(pt, pt instanceof Pt);                        // Pt { x: 1, y: 2 } true
```
Steps: remember the target function (`this` inside `myBind` is the function you called `.myBind` on), return a closure that merges the preset arguments with the new ones, and call the target with `apply`. The simple version without the `new` lines is enough in most interviews; mention `new` to score extra. Practice it in [function polyfills](../practice-app/exercises/js/16-function-polyfills/README.md).

## 4. Hoisting and the temporal dead zone
Before running a scope, JavaScript scans it and creates every declaration. This is called **hoisting**. What differs is the state each kind of declaration starts in.

| Declaration | Hoisted? | Before its line you get |
|---|---|---|
| `var` | yes | `undefined` |
| `function f() {}` | yes, whole function | the working function |
| `let`, `const`, `class` | yes, but not initialized | `ReferenceError` (the TDZ) |
| `var f = function () {}` | variable only | `TypeError: f is not a function` |

```js
console.log(a);                       // undefined
var a = 1;
console.log(typeof sayHi, sayHi());   // function hi
function sayHi() { return "hi"; }

try { console.log(b); } catch (e) { console.log(e.name + ": " + e.message); }
let b = 2;   // ReferenceError: Cannot access 'b' before initialization

try { notFn(); } catch (e) { console.log(e.name + ": " + e.message); }
var notFn = function () {};   // TypeError: notFn is not a function

try { new K(); } catch (e) { console.log(e.name + ": " + e.message); }
class K {}   // ReferenceError: Cannot access 'K' before initialization
```

**What happens, step by step:**
1. Scan phase: `a` and `notFn` are created and set to `undefined`; `sayHi` is created with its body; `b` and `K` are created but **uninitialized**.
2. Run phase: line 1 reads `a` and gets `undefined`. `sayHi()` works because the whole function was hoisted.
3. The time between the start of the scope and the line `let b = 2` is the **temporal dead zone**. Touching `b` there throws.
4. `notFn` exists but is `undefined`, so calling it is a `TypeError`.

The TDZ is also why shadowing surprises people:
```js
let x = 1;
{ console.log(x); let x = 2; }   // ReferenceError: Cannot access 'x' before initialization
```
The inner `let x` is hoisted to the top of its block, so `console.log(x)` refers to the inner, uninitialized `x`, not the outer one. Also note `typeof undeclared` gives `"undefined"`, but `typeof z` for a `let z` in its TDZ throws.

**Common mistake:** defining a function expression below the code that calls it. Fix: use a function declaration, or define it first.

## 5. Scope chain, closures in depth, and the call stack
**Scope** decides which variables a piece of code can see. Each function call creates a new scope that points to the scope where the function was **written** (lexical scoping). Looking up a name walks outward along that **scope chain**: local, then outer function, then module/global.

A **closure** is a function plus the scope it was created in. The scope stays alive as long as the function can still be called.

```js
function createCounter() {
  let count = 0;                                  // private: nothing outside can reach it
  return { inc: () => ++count, get value() { return count; }, reset() { count = 0; } };
}
const c = createCounter();
c.inc(); c.inc();
console.log(c.value, c.count);   // 2 undefined
```
This is the **module pattern**: a function runs once, keeps private state in local variables, and returns only the public methods. ES modules (section 14) replace most of its uses, but factories like this still appear everywhere (hooks, event emitters, memoize).

The classic loop puzzle:
```js
const withVar = []; for (var i = 0; i < 3; i++) withVar.push(() => i);
const withLet = []; for (let j = 0; j < 3; j++) withLet.push(() => j);
console.log(withVar.map((f) => f()), withLet.map((f) => f())); // [ 3, 3, 3 ] [ 0, 1, 2 ]
```
`var` has one `i` for the whole function, so every closure sees the final value 3. `let` in a `for` header creates a fresh binding per iteration.

**Memory implication:** a closure keeps the variables it uses alive, as long as the closure itself is reachable (stored in a listener, a timer, a cache or a React ref). Engines try to keep only the variables that inner functions use, but all inner functions created in one call share that kept scope, so one long-lived closure can keep a big array alive. Section 15 shows the fix.

### The call stack in one minute
The **call stack** is a pile of "frames". Calling a function pushes a frame (its variables, its `this`, a link to its outer scope). Returning pops it. Only the top frame runs. The very first frame is the global code.

```js
function rec() { rec(); }
try { rec(); } catch (e) { console.log(e instanceof RangeError, e.message); }
// true Maximum call stack size exceeded
```
Each call to `rec` pushes a frame and never pops, until the engine's limit throws a `RangeError`. JavaScript has one call stack, so one thread runs one piece of code at a time. That is why a slow loop freezes the page, and why section 7 matters.

## 6. Type coercion and equality
**Coercion** means JavaScript converting a value to another type on its own. It happens in three places: `+`, comparisons and conditions. (The first lesson has the `==` vs `===` basics; here is the machinery.)

**Rules to remember:**
- To **string**: `+` with a string on either side concatenates. Arrays become `"1,2"`, plain objects become `"[object Object]"`, `null` becomes `"null"`.
- To **number**: `-`, `*`, `/`, unary `+` and comparisons convert to numbers. `""` becomes 0, `" 12 "` becomes 12, `"12px"` becomes `NaN`, `null` becomes 0, `undefined` becomes `NaN`, `true` becomes 1, `[]` becomes 0, `[5]` becomes 5.
- To **boolean**: only eight values are falsy: `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`. Everything else is truthy, including `"0"`, `"false"`, `[]`, `{}` and `new Boolean(false)`.
- Objects turn into primitives with `Symbol.toPrimitive`, otherwise `valueOf()` then `toString()` (the order flips to `toString()` first for string contexts such as template literals).

**The `==` algorithm in plain words:**
1. Same type? Compare like `===`.
2. `null` and `undefined` are equal to each other and to nothing else.
3. Number vs string: convert the string to a number.
4. A boolean is converted to a number first (`true` becomes 1), then the comparison restarts.
5. Object vs primitive: convert the object to a primitive, then restart.

```js
console.log([] + {}, [] + [], [1, 2] + [3], "5" + 2, "5" - 2, true + true, null + 1, undefined + 1);
// "[object Object]" "" "1,23" "52" 3 2 1 NaN
console.log([] == ![], [] == false, "0" == false, null == false, null == undefined, null == 0, null >= 0);
// true true true false true false true
console.log(NaN == NaN, Object.is(NaN, NaN), 0 === -0, Object.is(0, -0), [NaN].includes(NaN), [NaN].indexOf(NaN));
// false true true false true -1
console.log(typeof null, typeof NaN, typeof [], typeof function () {}, typeof 10n);
// object number object function bigint
console.log("b" + "a" + +"a" + "a", [1, 2, 3].map(parseInt), 0.1 + 0.2 === 0.3, 1 < 2 < 3, 3 > 2 > 1);
// baNaNa [ 1, NaN, NaN ] false true false
```

**Why a few of these happen, step by step:**
1. `[] == ![]`: `![]` is `false` (arrays are truthy), so it is `[] == false`. The boolean becomes 0, the array becomes `""` then 0, and `0 == 0` is true.
2. `null == 0` is false (rule 2), but `null >= 0` is true because `>=` converts `null` to 0 and does not use the `==` rules.
3. `NaN` is the only value not equal to itself. Use `Number.isNaN(x)` or `Object.is`. `Object.is` is `===` except `NaN` equals `NaN` and `0` differs from `-0`.
4. `typeof null` is `"object"`, a bug from the first version of JavaScript that can never be fixed. Check null with `x === null`.
5. `+"a"` is `NaN`, so the string ends up as `"baNaNa"`.
6. `map(parseInt)` calls `parseInt(value, index, array)`, so the index is used as the radix: `parseInt("2", 1)` is `NaN`.
7. `3 > 2 > 1` is `true > 1`, which is `1 > 1`, false.

**Common mistake:** `if (count)` when `0` is valid. Fix: `if (count !== undefined)` or `count ?? fallback`. React also renders `{0 && <X />}` as a literal 0.

## 7. The event loop: microtasks vs macrotasks
JavaScript has one call stack, yet it does many things "at once" because the host (browser or Node) keeps **queues** of waiting callbacks, and the **event loop** moves them onto the stack one at a time. There are two queues that matter:

- **Macrotask queue** (also called the task queue): `setTimeout`, `setInterval`, user events such as clicks, `MessageChannel`, network callbacks. The whole script is the first macrotask.
- **Microtask queue**: promise callbacks (`then`, `catch`, `finally`), the code after an `await`, `queueMicrotask`, `MutationObserver`.

```text
One turn of the loop:
1. Run ONE macrotask until the call stack is empty.
2. Run ALL microtasks until the microtask queue is empty (including ones added while draining).
3. The browser may render: requestAnimationFrame callbacks run first, then style, layout, paint.
4. Pick the next macrotask. Repeat.
```
Two consequences: a promise callback always runs before the next timer, and a microtask that keeps adding microtasks starves timers and painting (the page freezes). `requestAnimationFrame` runs right before the next paint; its order against `setTimeout(fn, 0)` is not guaranteed, so interviewers who ask about it expect "before paint, after microtasks". `setTimeout(fn, 0)` is never instant: it runs after the current task and all microtasks. (Node also has `process.nextTick` and `setImmediate`; their order against `setTimeout(0)` is not fixed, so the puzzles below avoid them.) More on the browser side in browser and web platform (planned).

**Rule of thumb for output puzzles:** write down sync code first, then the microtask queue in order, then each timer in order of delay.

## 8. Ten event loop output puzzles
Cover the output, predict, then read the reason. All outputs were produced by running the code.

**Puzzle 1**
```js
console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
console.log("D");
```
Output: `A D C B`. Sync code (A, D) first, then the microtask (C), then the timer (B).

**Puzzle 2**
```js
setTimeout(() => console.log("timeout"), 0);
queueMicrotask(() => console.log("micro 1"));
Promise.resolve().then(() => console.log("promise"));
queueMicrotask(() => console.log("micro 2"));
console.log("sync");
```
Output: `sync, micro 1, promise, micro 2, timeout`. `queueMicrotask` and promise callbacks share one queue, in the order they were queued.

**Puzzle 3**
```js
setTimeout(() => console.log("timeout"), 0);
Promise.resolve()
  .then(() => { console.log("then 1"); Promise.resolve().then(() => console.log("nested")); })
  .then(() => console.log("then 2"));
```
Output: `then 1, nested, then 2, timeout`. While `then 1` runs, "nested" joins the queue. "then 2" is queued only after `then 1` finishes, so it is behind "nested". All of it runs before the timer.

**Puzzle 4**
```js
async function a() { console.log("a1"); await b(); console.log("a2"); }
async function b() { console.log("b"); }
console.log("start"); a(); console.log("end");
```
Output: `start, a1, b, end, a2`. An async function runs synchronously until its first `await`. `await` pauses `a`, and the rest (`a2`) continues as a microtask after the current code ends.

**Puzzle 5**
```js
console.log(1);
setTimeout(() => console.log(2), 0);
(async () => { console.log(3); await null; console.log(4); })();
new Promise((res) => { console.log(5); res(); }).then(() => console.log(6));
console.log(7);
```
Output: `1 3 5 7 4 6 2`. The promise executor (5) runs synchronously. The `await null` continuation (4) was queued before the `.then` (6), so it runs first. The timer (2) is last.

**Puzzle 6**
```js
setTimeout(() => { console.log("t1"); Promise.resolve().then(() => console.log("p inside t1")); }, 0);
setTimeout(() => console.log("t2"), 0);
```
Output: `t1, p inside t1, t2`. Microtasks are drained after every macrotask, so the promise callback created inside `t1` runs before the second timer.

**Puzzle 7**
```js
Promise.resolve().then(() => { console.log(1); return Promise.resolve(); }).then(() => console.log(2));
Promise.resolve().then(() => console.log(3)).then(() => console.log(4)).then(() => console.log(5));
```
Output: `1 3 4 5 2`. Returning a promise from `then` is not free: the outer promise has to follow the returned one, which takes extra microtask turns, so `2` arrives after `5`. Returning a plain value would give `1 3 2 4 5`.

**Puzzle 8**
```js
const p = new Promise((resolve, reject) => {
  console.log("executor");
  resolve("first");
  resolve("second");
  reject(new Error("no"));
  console.log("after resolve");
});
p.then((v) => console.log(v));
console.log("end");
```
Output: `executor, after resolve, end, first`. The executor runs synchronously and keeps running after `resolve`. A promise settles only once, so the second `resolve` and the `reject` do nothing.

**Puzzle 9**
```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log("var", i), 0);
for (let j = 0; j < 3; j++) setTimeout(() => console.log("let", j), 0);
```
Output: `var 3, var 3, var 3, let 0, let 1, let 2`. The timers run after the loops finish. One shared `i` ended at 3; each `let` iteration had its own `j`.

**Puzzle 10**
```js
Promise.reject(new Error("x"))
  .then(() => console.log("then"))
  .catch(() => console.log("catch"))
  .then(() => console.log("after catch"))
  .finally(() => console.log("finally"));
```
Output: `catch, after catch, finally`. The rejection skips `then` (no rejection handler there), reaches `catch`, which handles it and returns normally, so the chain is fulfilled again and continues.

More practice of this kind is in [round 3: output and debugging](../05-interview-rounds/round-3-output-and-debugging/README.md).

## 9. Promises from the inside
A **promise** is an object that stands for a value that is not ready yet. It has one of three states: **pending**, **fulfilled** (has a value) or **rejected** (has a reason). It leaves "pending" at most once, and then it never changes.

```js
const p = Promise.resolve(1);
p.then(() => console.log("then ran"));
console.log("sync line");
// sync line, then then ran
```
Handlers are always called asynchronously, even on an already-settled promise. This gives code a predictable order.

**The rules of chaining:**
1. `then(onFulfilled, onRejected)` returns a **new** promise. That is why you can chain.
2. Whatever the handler **returns** fulfills the new promise. If it returns a promise (or any object with a `then` method), the new promise follows it.
3. If the handler **throws**, the new promise is rejected.
4. If a handler is missing, the value or error passes through to the next link. So one `.catch` at the end handles any failure above it.
5. `catch(f)` is `then(undefined, f)`. `finally(f)` runs `f` with no arguments and passes the original value or error through (unless `f` throws).

```js
Promise.resolve(1)
  .then((v) => v + 1)
  .then((v) => { throw new Error("oops " + v); })
  .catch((e) => e.message)
  .then((m) => console.log(m + "!"));   // oops 2!
```

### The four combinators
```js
const ok = (v, ms) => new Promise((r) => setTimeout(() => r(v), ms));
const bad = (m, ms) => new Promise((_, rej) => setTimeout(() => rej(new Error(m)), ms));

await Promise.all([ok("a", 10), ok("b", 20)]);          // [ 'a', 'b' ]
await Promise.all([ok("a", 10), bad("boom", 5)]);       // rejects: boom
await Promise.allSettled([ok("a", 10), bad("boom", 5)]);
// [ { status: 'fulfilled', value: 'a' }, { status: 'rejected', reason: Error: boom } ]
await Promise.race([ok("slow", 30), bad("fast fail", 5)]); // rejects: fast fail
await Promise.any([bad("x", 5), ok("win", 10)]);        // 'win'
await Promise.any([bad("x", 5), bad("y", 6)]);          // rejects: AggregateError "All promises were rejected"
```

| Combinator | Fulfills with | Rejects when |
|---|---|---|
| `Promise.all` | array of all values, in input order | the first input rejects (fail fast) |
| `Promise.allSettled` | array of `{ status, value or reason }`, never rejects | never |
| `Promise.race` | the first input to settle | the first to settle is a rejection |
| `Promise.any` | the first input to fulfil | all reject (`AggregateError` with an `errors` array) |

`Promise.all([])` fulfills with `[]` immediately. Write `all` yourself in [promise combinators](../practice-app/exercises/js/11-promise-combinators/README.md).

### Unhandled rejections
A rejected promise with no handler by the time the microtask queue drains is an **unhandled rejection**. Browsers fire an `unhandledrejection` event on `window` and log an error. Node (since version 15) crashes the process by default. Always end a chain with `catch`, or `await` inside `try/catch`.

## 10. async/await: what it really is
`async/await` is syntax over promises. An `async` function always returns a promise; `await` pauses that function (not the whole program) until the awaited promise settles.

```js
async function getName(id) {
  const res = await fetch(`/api/users/${id}`);
  const user = await res.json();
  return user.name;
}
// Roughly the same as:
function getNameWithThen(id) {
  return fetch(`/api/users/${id}`)
    .then((res) => res.json())
    .then((user) => user.name);
}
```

**What happens, step by step:**
1. Calling `getName(1)` runs the body synchronously up to the first `await` (puzzle 4).
2. `await x` wraps `x` in a promise, suspends the function, and lets the rest of the program run.
3. When the promise fulfills, the function resumes in a microtask with the value. If it rejects, the `await` line **throws**, so `try/catch` works.
4. `return value` fulfills the returned promise; `throw` rejects it.

### `await` in loops vs `Promise.all`
```js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const n of [1, 2, 3]) await sleep(100);           // sequential: about 3 x 100 ms
await Promise.all([1, 2, 3].map(() => sleep(100)));    // parallel: about 100 ms
```
In a run on Windows, the sequential loop took about 320 ms and the parallel version about 110 ms (timers have a little slack; your numbers will vary, the ratio is about 3 to 1). Use a sequential `await` loop only when each step needs the previous result. **Common mistake:** `array.forEach(async (x) => { await work(x) })` does not wait. `forEach` ignores the returned promises, so the code after it runs first (the log "after forEach" printed before both "inside forEach" lines). Fix: `for...of` with `await`, or `await Promise.all(array.map(...))`. And never pass an `async` function directly to `useEffect`; see [useEffect](../02-hooks/03-useeffect.md).

## 11. Iterators, generators and Symbol
An **iterable** is any object with a method at the key `Symbol.iterator` that returns an **iterator**: an object with `next()` returning `{ value, done }`. `for...of`, spread (`[...x]`), destructuring, `Array.from`, `Map` and `Set` all use this protocol.

```js
const range = {
  from: 1, to: 3,
  [Symbol.iterator]() {
    let n = this.from; const to = this.to;
    return { next: () => (n <= to ? { value: n++, done: false } : { value: undefined, done: true }) };
  },
};
console.log([...range], Math.max(...range));   // [ 1, 2, 3 ] 3
for (const x of range) console.log(x);          // 1, 2, 3
const [first, ...others] = range;               // first = 1, others = [ 2, 3 ]
```

A **generator function** (`function*`) writes an iterator for you. Each `yield` pauses the function and hands out a value; the next `next()` call resumes from that exact spot, with its local variables intact.

```js
function* idGen() {
  let id = 1;
  while (true) {
    const reset = yield id++;      // the value passed to next(...) becomes the result of yield
    if (reset) id = 1;
  }
}
const g = idGen();
console.log(g.next(), g.next(), g.next(true), g.next());
// { value: 1, done: false } { value: 2, done: false } { value: 1, done: false } { value: 2, done: false }

function* naturals() { let n = 1; while (true) yield n++; }
function* take(it, k) { let i = 0; for (const v of it) { if (i++ >= k) return; yield v; } }
console.log([...take(naturals(), 4)]);   // [ 1, 2, 3, 4 ]
```
Generators are **lazy**: `naturals()` describes an endless list but computes one value per `next()`. `yield*` hands control to another iterable. `async function*` with `for await...of` does the same for values that arrive over time (streams, paged APIs). Redux-saga is built on generators, and old `async/await` polyfills used them.

**Symbol** is a primitive that is always unique: `Symbol("a") === Symbol("a")` is false (`Symbol.for("a")` shares one through a global registry). Symbols make hidden-ish property keys that `Object.keys`, `for...in` and `JSON.stringify` skip. The "well-known" symbols (`Symbol.iterator`, `Symbol.asyncIterator`, `Symbol.toPrimitive`, `Symbol.hasInstance`) are the hooks the language uses.

## 12. Map, Set, WeakMap, WeakSet
```js
const m = new Map(); const key = { id: 1 };
m.set(key, "obj").set("1", "str").set(1, "num");
console.log(m.get(key), m.get({ id: 1 }), m.get(1), m.get("1"), m.size); // obj undefined num str 3
const o = {}; o[key] = "x"; o[{}] = "y";
console.log(Object.keys(o));                                // [ '[object Object]' ]
console.log([...new Set([3, 1, 3, 2, 1])], new Set([NaN, NaN]).size); // [ 3, 1, 2 ] 1
```
- **`Map`**: key-value pairs where keys can be any type, order is insertion order, and `.size` is built in. A plain object turns every key into a string, so object keys collide. Use `Map` for dictionaries with unknown or non-string keys and frequent adds and removes.
- **`Set`**: unique values. `[...new Set(arr)]` removes duplicates (it treats `NaN` as equal to itself).
- **`WeakMap`**: keys must be objects, and the map holds them **weakly**: if nothing else references the key object, it can be garbage collected and its entry disappears. It cannot be iterated and has no `.size`, on purpose, because its contents can change whenever the collector runs.
- **`WeakSet`**: the same idea for a set of objects.

```js
const meta = new WeakMap();
function getMeta(el) { if (!meta.has(el)) meta.set(el, { clicks: 0 }); return meta.get(el); }
const el = {}; getMeta(el).clicks++; getMeta(el).clicks++;
console.log(getMeta(el));   // { clicks: 2 }
try { meta.set("str", 1); } catch (e) { console.log(e.name + ": " + e.message); }
// TypeError: Invalid value used as weak map key
```
Use `WeakMap` for data **about** an object that must not keep the object alive: caches and metadata keyed by DOM nodes or component objects, truly private data, and a "seen" `WeakSet` while walking cyclic structures (a deep clone). A normal `Map` here would be a memory leak (section 15).

## 13. Getters, setters, Proxy and Reflect
A **getter/setter** runs code when a property is read or written, while looking like a plain property.

```js
const temp = {
  c: 25,
  get f() { return this.c * 9 / 5 + 32; },
  set f(v) { this.c = (v - 32) * 5 / 9; },
};
console.log(temp.f);   // 77
temp.f = 212;
console.log(temp.c);   // 100
```

A **Proxy** wraps an object and lets you intercept operations (read, write, delete, `in`, calls). **Reflect** has the default behaviour of each operation as a function, so a trap can do its extra work and then forward.

```js
const target = { name: "Ann" };
const logged = new Proxy(target, {
  get(t, key, receiver) { console.log("read", String(key)); return Reflect.get(t, key, receiver); },
  set(t, key, value, receiver) { console.log("write", key, value); return Reflect.set(t, key, value, receiver); },
});
logged.name;          // read name
logged.age = 30;      // write age 30
console.log(target);  // { name: 'Ann', age: 30 }
```
Proxies power Vue 3 reactivity and the drafts in Immer (used by Redux Toolkit). React state is not observed through proxies: you give React a new value and it re-renders. Keep this to a short answer in interviews: "Proxy intercepts operations on an object; Reflect forwards them".

## 14. ES modules vs CommonJS, and tagged templates
| | ES modules (ESM) | CommonJS (CJS) |
|---|---|---|
| Syntax | `import` / `export` | `require()` / `module.exports` |
| Loaded | statically analysed before running | at runtime, synchronously |
| Exports are | **live bindings** (a view of the variable) | a copy of the value at require time |
| Strict mode | always | opt in |
| Top-level `await` | yes | no |
| Tree shaking | possible (static structure) | hard |
| `__dirname`, `require` | not available | available |

```js
// counter.mjs
export let count = 0;
export function inc() { count++; }
// main.mjs
import { count, inc } from "./counter.mjs";
console.log(count);   // 0
inc();
console.log(count);   // 1 (live binding: the import sees the change)
// count = 5;         // TypeError: Assignment to constant variable (imports are read-only)
const lazy = await import("./counter.mjs"); // dynamic import() returns a promise: used for code splitting
```
In a CommonJS version, `const { count } = require("./counter.cjs")` copies `0` and stays `0` after `inc()`. Vite, bundlers and React all use ESM; `import()` with `React.lazy` splits code. Details of import/export syntax are in the first lesson.

**Tagged templates** are a function placed before a template literal. The function receives the literal text pieces and the `${}` values separately, so it can transform them. `styled-components` and `gql` use this.
```js
const tag = (strings, ...values) =>
  strings.reduce((out, s, i) => out + s + (i < values.length ? String(values[i]).toUpperCase() : ""), "");
console.log(tag`Hi ${"ann"}, you are ${30}!`);   // Hi ANN, you are 30!
```

## 15. Memory: garbage collection and leaks
JavaScript frees memory for you. The **garbage collector** starts from the "roots" (global variables, the call stack, active closures, running timers, registered listeners), marks everything reachable from them, and frees the rest. This is a tracing (mark and sweep) approach, so two objects that point at each other but are unreachable from the roots are still freed.

A **memory leak** is memory you no longer need that is still **reachable**, so it can never be freed. Memory grows, the tab slows down, and eventually it crashes.

The usual causes:
1. **Forgotten timers**: a `setInterval` that is never cleared keeps its callback, and everything the callback closes over, alive.
2. **Forgotten listeners**: `window.addEventListener` or a subscription (WebSocket, store) never removed.
3. **Closures holding big data**: a long-lived callback captures a big array.
4. **Detached DOM nodes**: an element removed from the page but still stored in a variable or array.
5. **Ever-growing caches**: a `Map` or array that only gets `set`/`push`. Use `WeakMap`, an LRU cache or a size cap.
6. **Accidental globals**: assigning to an undeclared name in sloppy mode.

```js
function attachBigLog() {
  const bigList = new Array(1_000_000).fill("row");
  window.addEventListener("click", () => console.log(bigList.length)); // listener keeps bigList alive
}
// Fix: keep only what you need, and remove the listener when done
function attachSmallLog() {
  const count = new Array(1_000_000).fill("row").length;
  const onClick = () => console.log(count);
  window.addEventListener("click", onClick);
  return () => window.removeEventListener("click", onClick);
}
```

### Leaks in React
The most common React leak is an effect that sets something up and never tears it down.

```jsx
import { useEffect } from "react";

export function Leaky({ onTick }) {
  useEffect(() => {
    setInterval(() => onTick(), 1000);   // never cleared
  }, []);
  return <p>leaky</p>;
}

export function Clean({ onTick }) {
  useEffect(() => {
    const id = setInterval(() => onTick(), 1000);
    return () => clearInterval(id);       // cleanup runs on unmount
  }, []);
  return <p>clean</p>;
}
```
I rendered both with fake timers, advanced 2 seconds, unmounted, then advanced 3 more seconds. `onTick` was called 5 times for `Leaky` (the timer kept running after the component was gone) but only 2 times for `Clean`. A listener added with `window.addEventListener("resize", fn)` and removed in the cleanup stopped calling `fn` after unmount (1 call in total). The same goes for subscriptions, `AbortController` for fetches, and `ResizeObserver`/`IntersectionObserver` (call `disconnect`). Details are in [useEffect](../02-hooks/03-useeffect.md).

**How to find a leak:** open DevTools, Memory tab, take a heap snapshot, repeat the suspect action several times, take another snapshot, and compare. Growing counts of the same object, or nodes marked "Detached", point to the leak.

## 16. Error handling
JavaScript throws `Error` objects. The built-in types you should recognise: `TypeError` (wrong type, `null.x`), `ReferenceError` (name not defined, TDZ), `SyntaxError` (bad code or bad `JSON.parse`), `RangeError` (bad length, stack overflow), `URIError`, `EvalError` (rare) and `AggregateError` (`Promise.any`). You can throw anything, but throw `Error` objects: they carry a `stack`.

```js
class HttpError extends Error {
  constructor(status, message, options) {
    super(message, options);
    this.name = "HttpError";
    this.status = status;
  }
}
try {
  throw new HttpError(404, "Not found", { cause: new Error("db miss") });
} catch (e) {
  console.log(e.name, e.status, e.message, e.cause.message, e instanceof HttpError, e instanceof Error);
  // HttpError 404 Not found db miss true true
}
```
- Custom errors let callers use `instanceof` to decide what to do. The `cause` option keeps the original error.
- `finally` always runs. A `return` inside `try` still runs `finally` first, and a `return` inside `finally` overrides everything (avoid it).

```js
function g() { try { return "try"; } finally { return "finally wins"; } }
console.log(g());   // finally wins
```
- `try/catch` catches only errors thrown synchronously inside it. A `setTimeout` callback that throws escapes it. Errors from promises need `.catch` or `await` inside the `try`.
- `fetch` resolves even for HTTP 404 and 500. Only network failures reject, so check `res.ok` and throw yourself.
- Outside your code: the browser fires `error` and `unhandledrejection` events on `window`, which error-reporting tools listen to. React error boundaries catch errors thrown while rendering, but not errors in event handlers or async code. See [error boundaries](../03-intermediate/05-error-boundaries-portals-and-friends.md).

## 17. Utilities interviewers ask you to write
These are closure exercises in disguise. The idea in one line each, with the practice files that own them:
- **Debounce**: wait until calls stop for N ms, then run once (search boxes). Keeps a `timer` variable in a closure. See [debounce](../practice-app/exercises/js/01-debounce/README.md).
- **Throttle**: run at most once per N ms (scroll handlers). See [throttle](../practice-app/exercises/js/02-throttle/README.md).
- **Curry**: collect arguments until there are enough, then call. See [curry](../practice-app/exercises/js/04-curry/README.md).

```js
function curry(fn) {
  return function curried(...args) {
    return args.length >= fn.length
      ? fn.apply(this, args)
      : (...more) => curried.apply(this, [...args, ...more]);
  };
}
const add3 = curry((a, b, c) => a + b + c);
console.log(add3(1)(2)(3), add3(1, 2)(3), add3(1)(2, 3));   // 6 6 6
```
`fn.length` is the number of declared parameters. More utilities are listed in [round 5: JavaScript coding](../05-interview-rounds/round-5-javascript-coding/README.md).

## How interviewers test this
- **Output prediction**: a snippet mixing `setTimeout`, promises and `await`, or `var` in a loop. They want the order and a reason in terms of the call stack and the two queues.
- **Write it from scratch**: `bind`, `call`, `Promise.all`, `new`, `instanceof`, deep clone. A strong answer states edge cases (empty input, rejection, `new`) before coding.
- **Explain, do not recite**: "`this` is decided by how a function is called" beats a list of rules with no model. Name the rule that applies.
- **Connect to React**: stale closures in handlers, lost `this` in class callbacks, cleanup of timers and listeners, objects compared by reference.
- Red flags: saying "JavaScript is multi-threaded", "hoisting moves code to the top", "`let` is not hoisted", "objects are passed by reference", or "`const` makes a value immutable".

## Interview questions and model answers

### Q1. What is a closure, and where do you use one? (Easy)
A closure is a function bundled with the variables of the scope where it was created. The function can keep reading and changing those variables even after the outer function has returned. Use it for private state (`createCounter`), factories, callbacks, memoization, debounce and throttle. In React, each render's event handlers and effects close over that render's props and state, which is the source of "stale closure" bugs. The cost is memory: the captured variables live as long as the closure is reachable.

### Q2. Explain hoisting. How do `var`, `let` and `const` differ? (Easy)
All declarations are created at the start of their scope. `var` is function-scoped and starts as `undefined`, so reading it early gives `undefined`. `let` and `const` are block-scoped and hoisted too, but stay uninitialized until their line runs; reading them early throws a `ReferenceError` (the temporal dead zone). Function declarations are hoisted with their body; function expressions behave like the variable that holds them. `const` also forbids reassignment, but not mutation of the object it holds. Default to `const`, use `let` when you reassign, avoid `var`.

### Q3. How is `this` decided? What do `call`, `apply` and `bind` do? (Medium)
By how the function is called: `new` gives a fresh object; `call/apply/bind` set it explicitly; `obj.method()` sets it to `obj`; a plain call gives `undefined` in strict mode; arrow functions ignore all of this and use the `this` of the surrounding code. `call(thisArg, a, b)` and `apply(thisArg, [a, b])` call the function immediately. `bind(thisArg, a)` returns a new function with `this` and the first arguments fixed, and a bound function cannot be re-bound. A detached method (`const f = obj.method; f()`) loses `this`. To implement `bind`, return a closure that calls the original with `apply`, merging the preset and new arguments (section 3).

### Q4. Explain prototypes and the prototype chain. (Medium)
Every object has a hidden link to a prototype. Reading a property walks that chain until it finds the key or reaches `null`. Functions have a `prototype` property; `new F()` creates an object whose link is `F.prototype`, which is how methods are shared by all instances. `__proto__` is the link on an instance (read it with `Object.getPrototypeOf`), `prototype` is the object a constructor hands to its instances. `class` is syntax over this: methods go on `Class.prototype`, and `extends` links the two prototypes and the two constructors. `instanceof` checks whether `F.prototype` is on the chain, and `Object.hasOwn(obj, key)` checks only the object itself.

### Q5. What is the output order of code that mixes `setTimeout`, promises and `await`? Why? (Medium)
Run all synchronous code first. Then drain the microtask queue completely (promise callbacks, code after `await`, `queueMicrotask`). Then take the next macrotask (a timer or event), and drain microtasks again after it. So for `console.log("A"); setTimeout(() => console.log("B")); Promise.resolve().then(() => console.log("C")); console.log("D");` the order is A, D, C, B. An async function runs synchronously up to its first `await`. Rendering happens between tasks, after microtasks.

### Q6. What is the difference between `==` and `===`? (Easy)
`===` compares type and value with no conversion. `==` converts types first by a fixed algorithm (strings to numbers, booleans to numbers, objects to primitives, and `null == undefined` only). That gives surprises such as `[] == false` (true) and `null == 0` (false). Use `===`, and `x == null` as the one accepted shortcut for "null or undefined". For `NaN` use `Number.isNaN` or `Object.is`, because `NaN === NaN` is false.

### Q7. How do promises and `async/await` relate? When use `Promise.all`? (Medium)
`async/await` is syntax over promises: an async function returns a promise, `await` unwraps one (and throws on rejection), and the code after `await` runs as a microtask. Both give the same behaviour; `await` just reads like sync code and works with `try/catch`. For independent tasks use `Promise.all` so they run at the same time (it fails fast on the first rejection); use `allSettled` when you want every result, `race` for the first to settle (timeouts), and `any` for the first success. Awaiting one after another in a loop makes the total time the sum of all.

### Q8. Is JavaScript pass by value or by reference? Shallow vs deep copy? `Object.freeze` vs `const`? (Medium)
Always by value; for objects, the value is a reference, so a function can mutate the caller's object, but reassigning the parameter does not affect the caller. A shallow copy (`{ ...obj }`, `Object.assign`, `slice`) copies the top level and shares nested objects. A deep copy duplicates everything: `structuredClone` handles dates, maps, sets and cycles but throws on functions and drops class prototypes; `JSON.parse(JSON.stringify(x))` loses `undefined`, functions and dates. `const` prevents rebinding the variable. `Object.freeze` prevents changing the object's own properties (silently in sloppy mode, a `TypeError` in strict mode) but only one level deep. Details of copying are in the first lesson.

### Q9. How do memory leaks happen in JavaScript and React? How do you find them? (Medium)
A leak is memory that is still reachable but no longer needed. Causes: uncleared timers, listeners and subscriptions, closures holding large data, detached DOM nodes, and caches that only grow. In React the typical bug is an effect with no cleanup, so the interval or listener outlives the component; I measured 5 interval calls for a leaky component against 2 for a clean one after unmount. Fixes: return a cleanup from `useEffect`, abort fetches, `disconnect` observers, cap caches. To find one, compare heap snapshots in the DevTools Memory tab.

### Q10. When would you use a `WeakMap`, and what is a generator good for? (Hard)
A `WeakMap` stores data keyed by objects without keeping those objects alive. When the key object is no longer referenced anywhere else, the entry is collected too. So it suits metadata or caches tied to DOM nodes or other objects, and private data, where a `Map` would leak. It is not iterable and has no `size`. A generator is a function you can pause with `yield` and resume with `next()`, and it returns an iterator. It is good for lazy sequences (an endless id generator), custom iteration (`[Symbol.iterator]`), and as the base of async flows such as `for await...of` streams.

## Common mistakes and gotchas
- Calling `obj.method` detached (callbacks, destructuring) and losing `this`. Fix: arrow function, `bind`, or call it through the object.
- Putting methods in the constructor instead of on the prototype or class body. Fix: use class methods.
- Using `for...in` on arrays or objects with inherited keys. Fix: `Object.keys`, `Object.entries` or `for...of`.
- Using `var` in loops with async callbacks. Fix: `let` or `const`.
- Expecting `setTimeout(fn, 0)` to run before pending promise callbacks. Fix: microtasks always go first.
- `array.forEach(async ...)` and expecting it to wait. Fix: `for...of` with `await`, or `Promise.all(map(...))`.
- `await` in a loop for independent calls. Fix: `Promise.all`.
- A promise chain with no `catch`. Fix: end every chain with `catch`, or use `try/catch` with `await`.
- Comparing objects or arrays with `===` and expecting equal contents. Fix: compare fields, or the same reference.
- Starting a timer, listener or subscription without cleanup. Fix: return a cleanup function from the effect.
- Assuming `{ ...obj }` or `.slice()` makes a deep copy. Fix: `structuredClone` when you really need one.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Predict the output (explain each line):
   ```js
   "use strict";
   const team = {
     name: "Core",
     members: ["Ann", "Bo"],
     list() { return this.members.map((m) => `${m}@${this.name}`); },
     listBad() { return this.members.map(function (m) { return `${m}@${this?.name}`; }); },
   };
   const { list } = team;
   console.log(team.list());
   console.log(team.listBad());
   try { list(); } catch (e) { console.log(e.name); }
   ```
<details>
<summary>Show answer</summary>

Output: `[ 'Ann@Core', 'Bo@Core' ]`, then `[ 'Ann@undefined', 'Bo@undefined' ]`, then `TypeError`.

`team.list()` has `team` left of the dot, and its arrow callback inherits that `this`. In `listBad` the callback is a normal function called by `map`, so `this` is `undefined` (strict mode) and `this?.name` is `undefined`. `list` was pulled out of the object, so the plain call has `this === undefined`, and `this.members` throws a `TypeError`.

</details>

2. **(Easy)** Predict the result of each expression: `[] + []`, `[1] == 1`, `"2" * "3"`, `null == undefined`, `typeof typeof 1`, `0.1 + 0.2 === 0.3`, `1 < 2 < 3`, `3 > 2 > 1`.
<details>
<summary>Show answer</summary>

`""` (both arrays become empty strings), `true` (`[1]` becomes `"1"` then 1), `6`, `true`, `"string"` (`typeof 1` is `"number"`, a string), `false` (floating point: the sum is `0.30000000000000004`), `true` (`true < 3`, and `true` is 1), `false` (`true > 1` is `1 > 1`).

</details>

3. **(Medium)** What does this print, and why?
   ```js
   var x = "global";
   function outer() {
     console.log(x);
     var x = "outer";
     function inner() { return x; }
     return inner;
   }
   console.log(outer()());
   ```
<details>
<summary>Show answer</summary>

It prints `undefined` and then `outer`. The `var x` inside `outer` is hoisted to the top of `outer` and shadows the global one, but it is still `undefined` when the first `console.log` runs. Later `x` is assigned `"outer"`. `inner` is a closure over `outer`'s scope, so `outer()()` returns the current value `"outer"`. With `let x`, the first `console.log` would throw a `ReferenceError` (TDZ).

</details>

4. **(Medium)** Predict the order of the output:
   ```js
   console.log("1");
   setTimeout(() => console.log("2"), 0);
   Promise.resolve().then(() => console.log("3")).then(() => console.log("4"));
   (async () => { console.log("5"); await Promise.resolve(); console.log("6"); })();
   setTimeout(() => console.log("7"), 0);
   console.log("8");
   ```
<details>
<summary>Show answer</summary>

`1 5 8 3 6 4 2 7`. Sync code: 1, then the async function body up to its `await` (5), then 8. Microtask queue at that moment: the first `then` callback (3), then the async continuation (6). Running 3 queues 4 behind 6, so the order is 3, 6, 4. Only then do the two timers run: 2, 7.

</details>

5. **(Medium)** Without `class`, build `Animal` and `Dog` using constructor functions and prototypes. `Dog` must inherit from `Animal`, and `new Dog("Rex").speak()` must return `"Rex makes a sound (woof)"`.
<details>
<summary>Show answer</summary>

```js
function Animal(name) { this.name = name; }
Animal.prototype.speak = function () { return this.name + " makes a sound"; };

function Dog(name) { Animal.call(this, name); }          // run the parent constructor on the new object
Dog.prototype = Object.create(Animal.prototype);          // link the chains
Dog.prototype.constructor = Dog;                          // repair the constructor link
Dog.prototype.speak = function () { return Animal.prototype.speak.call(this) + " (woof)"; };

const d = new Dog("Rex");
console.log(d.speak(), d instanceof Animal, d instanceof Dog, d.constructor === Dog, Object.keys(d));
// Rex makes a sound (woof) true true true [ 'name' ]
```
`Object.create(Animal.prototype)` makes a new object linked to the parent prototype, without running the parent constructor. Assigning `Dog.prototype = Animal.prototype` directly would be wrong: adding a `Dog` method would change `Animal` too.

</details>

6. **(Medium)** Make a `Range` class so that `[...new Range(1, 5)]` gives `[1, 2, 3, 4, 5]` and `Math.max(...new Range(2, 4))` gives `4`.
<details>
<summary>Show answer</summary>

```js
class Range {
  constructor(from, to) { this.from = from; this.to = to; }
  *[Symbol.iterator]() {
    for (let n = this.from; n <= this.to; n++) yield n;
  }
}
console.log([...new Range(1, 5)], Math.max(...new Range(2, 4))); // [ 1, 2, 3, 4, 5 ] 4
```
A generator method named `[Symbol.iterator]` returns an iterator, so the object becomes iterable. Spread, `for...of` and `Array.from` all work.

</details>

7. **(Hard)** This component leaks. Explain why and fix it.
   ```jsx
   import { useEffect, useState } from "react";

   export function Size() {
     const [width, setWidth] = useState(window.innerWidth);
     useEffect(() => {
       window.addEventListener("resize", () => setWidth(window.innerWidth));
       const id = setInterval(() => console.log("polling"), 1000);
     }, []);
     return <p>{width}</p>;
   }
   ```
<details>
<summary>Show answer</summary>

Two things are registered on long-lived objects (`window` and the timer system) and never removed. After the component unmounts, the resize listener and the interval keep running, and they keep the callbacks (and everything they close over) alive. The anonymous listener cannot even be removed later because there is no reference to it. Fix:

```jsx
useEffect(() => {
  const onResize = () => setWidth(window.innerWidth);
  window.addEventListener("resize", onResize);
  const id = setInterval(() => console.log("polling"), 1000);
  return () => {
    window.removeEventListener("resize", onResize);
    clearInterval(id);
  };
}, []);
```
Keep the same function reference for add and remove, and return a cleanup that undoes every setup step.

</details>

8. **(Hard)** Write `myPromiseAll(items)`: it takes an iterable of values or promises and returns a promise of an array of results in input order. It rejects with the first rejection, and an empty input fulfills with `[]`.
<details>
<summary>Show answer</summary>

```js
function myPromiseAll(items) {
  return new Promise((resolve, reject) => {
    const list = [...items];
    const results = new Array(list.length);
    let left = list.length;
    if (left === 0) { resolve(results); return; }
    list.forEach((item, i) => {
      Promise.resolve(item).then((value) => {   // Promise.resolve lets plain values work too
        results[i] = value;                      // store by index to keep input order
        left -= 1;
        if (left === 0) resolve(results);
      }, reject);                                // the first rejection rejects the whole thing
    });
  });
}

const later = (v, ms) => new Promise((r) => setTimeout(() => r(v), ms));
myPromiseAll([later("a", 20), "plain", later("c", 5)]).then(console.log); // [ 'a', 'plain', 'c' ]
myPromiseAll([]).then(console.log);                                       // []
myPromiseAll([later(1, 20), Promise.reject(new Error("bad"))]).catch((e) => console.log(e.message)); // bad
```
Common bugs: pushing results in completion order instead of by index, forgetting the empty-input case, and not wrapping plain values with `Promise.resolve`. Compare with the full set of tests in [promise combinators](../practice-app/exercises/js/11-promise-combinators/README.md).

</details>

## Recap
- Objects inherit through the prototype chain; `new` links the instance to `F.prototype`; `class` is syntax over that.
- `this` depends on the call: `new`, then explicit (`call/apply/bind`), then `obj.method()`, then default; arrows keep the outer `this`.
- Hoisting creates all declarations first: `var` starts as `undefined`, `let/const/class` sit in the TDZ until their line.
- A closure keeps its scope alive: great for private state, but long-lived closures hold memory.
- `==` converts types by a fixed algorithm; use `===` and `Object.is`; only eight values are falsy.
- Event loop: sync code, then all microtasks (promises, `await`, `queueMicrotask`), then render, then the next macrotask (timers, events).
- Promises settle once, `then` returns a new promise, and `async/await` is syntax over them; use `Promise.all` for parallel work.
- Clean up timers, listeners and subscriptions; use `WeakMap` for object-keyed data; throw `Error` objects and always handle rejections.

## Where to go next
- Next lesson: [Hooks overview and rules](../02-hooks/01-hooks-overview-and-rules.md). Closures and the call order from this lesson explain why hooks work as they do.
- Practice the JavaScript coding tasks: [round 5: JavaScript coding](../05-interview-rounds/round-5-javascript-coding/README.md), especially [function polyfills](../practice-app/exercises/js/16-function-polyfills/README.md), [debounce](../practice-app/exercises/js/01-debounce/README.md) and [promise combinators](../practice-app/exercises/js/11-promise-combinators/README.md).
- Output prediction drills: [round 3: output and debugging](../05-interview-rounds/round-3-output-and-debugging/README.md).
- The browser side of the event loop and rendering: browser and web platform (planned).
