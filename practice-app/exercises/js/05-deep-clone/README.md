# 05 - Deep clone

**Level:** Medium | **Time:** 30 minutes | **Topics:** recursion, `Map` and `WeakMap`, circular references, built-in object types, immutability

## The task

Write `deepClone(value)`. It returns a **deep copy** of `value`: a new structure that shares no objects with the original, so changing the copy can never change the original (and the other way round).

A shallow copy such as `{ ...obj }` only copies the first level. Everything nested is still shared. In React you update state by making new objects, so you must know exactly what a copy does and does not protect you from. This is also a favourite interview exercise because the easy version takes five minutes and the details (circular references, shared references, `Date`, `Map`) are where candidates get stuck.

Work in [`index.js`](./index.js). Do not edit [`index.test.js`](./index.test.js).

**Complexity target:** O(n) time and O(n) extra space, where n is the number of values (objects, arrays, Maps ...) in the structure. Every object is cloned exactly once, even when it can be reached through many paths.

## Examples

```js
// 1. Nested data is copied, not shared
const a = { user: { name: 'Ada' }, tags: ['x'] }
const b = deepClone(a)
b.user.name = 'Grace'
a.user.name // 'Ada'  (the original did not change)
a.user === b.user // false

// 2. Special objects get their own copy
const c = deepClone({ when: new Date(0), pattern: /a/gi, set: new Set([{ n: 1 }]) })
// c.when is a new Date, c.pattern is a new RegExp,
// c.set is a new Set that holds a COPY of { n: 1 }

// 3. Circular reference: the copy has the same shape
const node = { name: 'loop' }
node.self = node
const copy = deepClone(node)
copy.self === copy // true  (the cycle is inside the copy)
copy.self === node // false (it does not leak back to the original)

// 4. Shared reference: cloned once, used twice
const shared = { n: 1 }
const d = deepClone({ a: shared, b: shared })
d.a === d.b // true
d.a === shared // false

// 5. Functions are kept, undefined values are kept
const fn = () => 1
const e = deepClone({ fn, missing: undefined })
e.fn === fn // true
'missing' in e // true
```

## Requirements

1. **Primitives** (number, string, boolean, `null`, `undefined`, bigint, symbol) are returned as they are. `NaN`, `Infinity` and `-0` stay exactly the same.
2. **Functions** are returned by reference (the clone holds the very same function).
3. **Arrays**: return a new array with the same length. Every item is cloned deeply.
4. **Plain objects**: return a new object. Copy the own enumerable **string keys and symbol keys**, in the same order. Every value is cloned deeply. A key whose value is `undefined` is kept (`'key' in clone` is `true`).
5. The clone has the **same prototype** as the original. An object made with `Object.create(null)` stays prototype-less, and an instance of a class is still an `instanceof` that class (its methods live on the prototype, so they keep working).
6. **Date**: a new `Date` with the same time. An invalid date stays invalid.
7. **RegExp**: a new `RegExp` with the same `source` and `flags`. Also copy `lastIndex`.
8. **Map**: a new `Map`. Both the **keys and the values** are cloned deeply. The order of the entries is kept.
9. **Set**: a new `Set`. The values are cloned deeply. The order is kept.
10. **Circular references** work for objects, arrays, Maps and Sets. The clone has the same cycle shape: if `original.self === original`, then `clone.self === clone`.
11. **Shared references** stay shared. An object that can be reached through more than one path is cloned **once**, and all those paths lead to the same clone. Two different objects that only look the same stay two different objects.
12. The original is never changed. The clone shares no object with the original (only functions and symbols are shared). It also works when the original is frozen, and the clone is a normal, changeable structure.
13. An own key literally named `__proto__` (you get one from `JSON.parse('{"__proto__": {}}')`) is copied as an ordinary key. It must not change the prototype of the clone.
14. Do not use `JSON.stringify`, `JSON.parse`, `structuredClone` or a library. The tests check that `JSON.stringify` and `structuredClone` are not called.

**Not needed** (the tests do not check these): typed arrays, `Error`, `Promise`, `WeakMap`, DOM nodes, getters and setters (just read the value), non-enumerable properties, private class fields, holes in sparse arrays, and nesting that is 100,000 levels deep (see the stretch goals).

## Acceptance criteria (what the tests check)

- Primitives (including `NaN`, `-0`, bigint, symbols), and functions by reference, also inside objects.
- Nested objects and arrays are cloned at every level, and changes to the clone (or later to the original) never show up on the other side.
- `undefined`, `null` and other falsy values survive, in objects and in arrays. Key order is kept.
- Symbol keys are copied and their values are cloned. A symbol used as a value is kept.
- Class instances keep their prototype. A null-prototype object stays null-prototype.
- A frozen original gives a clone that can be changed.
- An own `__proto__` key stays an ordinary key.
- A 50,000-item array of objects is cloned.
- `Date` (also invalid and nested), `RegExp` (source, flags, `lastIndex`), `Map` (keys and values) and `Set` are cloned and independent from the originals.
- Circular references through objects, arrays, Maps, Sets and symbol keys.
- Shared references: in objects, arrays, a diamond shape, Dates, Maps, Sets, Map keys, Set members, and a 20-level chain with 2^20 paths that must finish quickly.
- A mixed realistic structure is equal to the original and shares no object with it.
- `JSON.stringify` and `structuredClone` are never called, and circular input does not overflow the stack.

## How to run

```bash
npm test -- exercises/js/05-deep-clone
```

At the start every test fails with `Not implemented`. That is normal, it is your to-do list.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/05-deep-clone
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Start with the easy part: if the value is `null` or its `typeof` is not `'object'`, return it. That covers primitives and functions.
2. Make a small helper that takes a second argument, `seen`. Your public `deepClone(value)` just calls `helper(value, new WeakMap())`. A `WeakMap` accepts objects as keys.
3. Right after the "primitive" check, ask `seen`: "did I already clone this object?" If yes, return that clone. This one idea gives you both circular references and shared references.
4. Create the new empty container first, **store it in `seen`**, and only then fill it. If you store it after filling, a cycle never finds it and you recurse forever.
5. Check the kinds of object one by one: `Date`, `RegExp`, `Map`, `Set`, `Array.isArray`, and then everything else.
6. For the "everything else" case, `Reflect.ownKeys(obj)` lists string keys and symbol keys together. `Object.prototype.propertyIsEnumerable.call(obj, key)` tells you if a key is enumerable.
7. `Object.create(Object.getPrototypeOf(original))` makes an empty object with the same prototype.
8. `copy[key] = value` with `key === '__proto__'` changes the prototype instead of making a property. `Object.defineProperty(copy, key, { value, enumerable: true, writable: true, configurable: true })` always makes a property.

</details>

## Stretch goals

- Make it **iterative** with your own stack, so that it survives an object nested 100,000 levels deep (a recursive version overflows the call stack). The [flatten exercise](../06-flatten-array/README.md) shows the stack technique.
- Support typed arrays, `ArrayBuffer`, `Error` (copy `name`, `message` and `stack`) and boxed primitives such as `new Number(1)`.
- Copy property descriptors with `Object.getOwnPropertyDescriptors`, so getters, setters, read-only and non-enumerable properties are kept.
- Add a second argument, `customizer(value)`, that can return its own clone for a value (return `undefined` to use the default).
- Use your own [deepEqual](../09-deep-equal/README.md) to test that your clone equals the original.

## Interview follow-ups to prepare for

**1. `structuredClone` is built into modern browsers and Node. What can it not copy, and when would you still write your own `deepClone`?**

<details>
<summary>Show answer</summary>

`structuredClone` copies plain data well: primitives, arrays, plain objects, `Date`, `RegExp`, `Map`, `Set`, `Error`, typed arrays, circular references and shared references, and it keeps `undefined` values.

It cannot copy:

- **Functions**: it throws a `DataCloneError`. The same happens for DOM nodes, `Promise`, `WeakMap` and `WeakSet`.
- **Symbols as values**: it throws too.
- **Prototypes**: a class instance comes back as a plain object, without its methods and no longer `instanceof` the class.
- **Symbol keys**: they are dropped silently.
- **Getters and setters**: the getter is called and the result is stored as a plain value.
- **`RegExp.lastIndex`**: it is reset to `0`.

Use `structuredClone` for JSON-like data (it is fast, native and handles cycles). Write your own when the data holds functions, class instances or symbol keys, or when you need custom rules. For updating React state, you usually need neither (see the next two questions).

</details>

**2. In React, why is `setState({ ...state })` not enough when you change a nested value, and why not call `deepClone` on every update instead?**

<details>
<summary>Show answer</summary>

Spread is a **shallow** copy. It makes a new top-level object, but every nested object is still the same object as in the old state.

```js
// BUG: next.user is the SAME object as state.user
const next = { ...state }
next.user.name = 'Grace' // this also changes the old state
setState(next)
```

React sees a new top-level object, so it re-renders, but the old state was changed behind its back. Anything that holds the old snapshot (an undo history, a memoized child that received `state.user` as a prop) now sees the new data, or sees "the same prop" and skips the update, so the screen can be stale.

Calling `deepClone` on every update fixes the correctness, but it gives **every** nested object a new reference. Then `React.memo`, `useMemo` and dependency arrays can never tell what really changed, so everything re-renders, and the copy costs time proportional to the whole state.

</details>

**3. How do you update `state.user.address.city` immutably without deep cloning?**

<details>
<summary>Show answer</summary>

Copy only the **path** from the root to the changed value, and reuse everything else. This is called structural sharing.

```js
setState((s) => ({
  ...s,
  user: {
    ...s.user,
    address: { ...s.user.address, city: 'Paris' },
  },
}))
```

Only `s`, `s.user` and `s.user.address` get new references. `s.user.orders` and every other branch keep the same reference, so memoized children that only use those branches do not re-render.

For arrays use methods that return a new array: `map`, `filter`, `slice`, `toSpliced`, `toSorted` and `with` (not `push`, `splice` or `sort`). For deep paths, a library such as Immer lets you write code that looks like mutation on a draft and still produces new objects only along the changed path. A deep clone is still the right tool for a form draft or a snapshot of data that something else may mutate.

</details>

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (spread, closures, immutability)
- [State and events](../../../../01-basics/05-state-and-events.md) (immutable updates, state as a snapshot)
- [useState in depth](../../../../02-hooks/02-usestate-in-depth.md) (objects and arrays in state)
- [Memoization](../../../../02-hooks/07-memoization.md) (why new references defeat `React.memo`)
- Related exercises: [deep equal](../09-deep-equal/README.md) and [get and set by path](../10-get-set-by-path/README.md)
