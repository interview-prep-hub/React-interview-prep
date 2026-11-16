# 10 - Get and set by path

**Level:** Medium | **Time:** 30 minutes | **Topics:** string parsing, recursion, mutation vs immutability, structural sharing, prototype pollution

## The task

Real data is nested: `user.address.city`, `orders[0].items[2].price`. Writing `user?.address?.city` by hand works for one fixed path, but not when the path is a value you receive at run time (a form field name, a config key, a table column). Build a small toolbox, in the style of lodash, that reads and writes a value by its path:

- `get(obj, path, defaultValue)` reads a value.
- `has(obj, path)` checks that a path exists.
- `set(obj, path, value)` writes a value and **changes the object in place**.
- `setIn(obj, path, value)` writes a value and returns a **new** object, without changing the old one. This is the one you need for React state.
- `unset(obj, path)` removes a value, in place.

Work in [`index.js`](./index.js). Do not edit the test file. Suggested order: `get`, `has`, `set`, `unset`, `setIn`, then the safety rules (requirement 10).

## Requirements

1. Export five functions: `get`, `has`, `set`, `setIn`, `unset`.
2. A **path** is either a string such as `"a.b[0].c"` or an array such as `["a", "b", 0, "c"]`.
   - A string path is split at dots and square brackets: `"a.b[0].c"` means the keys `a`, `b`, `0`, `c`. You may assume string paths are well formed. A string path is always split, so use an array path for a key that contains a dot: `get({ 'a.b': 1 }, ['a.b'])` is `1`.
   - An array path is used key by key, exactly as written. Its items can be strings or numbers.
   - No function may change the path array it receives.
3. `get(obj, path, defaultValue)` returns the value found at the path.
   - It returns `defaultValue` **only when the result is `undefined`**: the key is missing, a value on the way is `null` or `undefined`, or `undefined` is stored there.
   - `null`, `0`, `''`, `false` and `NaN` are real values and are returned as they are.
   - If `defaultValue` is not given, the default is `undefined`.
   - It returns the very same nested object, not a copy.
   - A `null` or `undefined` `obj`, or an empty path (`''` or `[]`), gives `defaultValue`.
4. `has(obj, path)` returns `true` when **every** key of the path exists as an **own** property, even if the stored value is `undefined` or `null`. Inherited properties such as `toString` or `__proto__` do not count. A `null` or `undefined` `obj`, or an empty path, gives `false`.
5. `set(obj, path, value)` **mutates** `obj` and returns that same `obj`. Existing nested objects and arrays are kept (same identity), only the last key changes. The value is stored as it is (not copied).
6. `set` **creates the missing containers** on the way down. A container is missing when the key does not exist, or its value is `null`, `undefined` or any other non-object (a number, a string...), which is then replaced.
   - It creates an **array** when the next key is a non-negative integer: a number such as `0`, `1`, `25`, or a string of digits such as `'0'`, `'12'`. So `set({}, 'list[0]', 'x')` gives `{ list: ['x'] }`.
   - It creates a plain **object** for every other next key: `'name'`, `-1`, `1.5`.
7. `setIn(obj, path, value)` follows the same rules as `set` but **never changes** `obj` or anything inside it (the tests pass deeply frozen input). It returns a new root with **structural sharing**:
   - every object or array on the path to the change is copied (arrays stay arrays, objects stay objects)
   - every other branch is the same object as before (same identity, `===`)
   - You only need to support plain objects and arrays.
8. `unset(obj, path)` **mutates** `obj` with the `delete` operator.
   - It returns `true` when a property was removed, and `false` when the path did not exist. In that case nothing is created and nothing changes.
   - Removing an array element leaves an empty slot, like `delete` does: the array length stays the same.
   - A `null` or `undefined` `obj`, or an empty path, gives `false`.
   - It only follows and removes own properties. `unset({}, '__proto__.toString')` returns `false` and leaves `Object.prototype` alone.
9. **Invalid input:** `set` and `setIn` throw a `TypeError` when `obj` is not an object or an array (`null`, `undefined`, a number, a string, a boolean), and when the path is empty.
10. **Prototype pollution guard:** `set` and `setIn` throw a `TypeError` when any key in the path is exactly `__proto__`, `constructor` or `prototype` (in a string path, in brackets, or in an array path).
    - The check happens **before** anything is changed, so a rejected call leaves the object untouched.
    - Keys that only contain those words (`my__proto__`, `constructorName`) are fine.
    - `set` and `setIn` only walk into **own** properties. An object that is only inherited (for example from a prototype object) counts as missing: a new own container is created and the shared prototype object is never modified.

## Examples

```js
const user = { name: 'Ada', tags: ['math', 'code'], address: { city: 'London' }, nick: null }

get(user, 'address.city')        // 'London'
get(user, 'tags[1]')             // 'code'
get(user, ['tags', 0])           // 'math'
get(user, 'address.zip', 'n/a')  // 'n/a'
get(user, 'nick', 'none')        // null (null is a real value, so no default)

has({ a: undefined }, 'a')       // true  (the key exists)
has({}, 'a')                     // false

set({}, 'a.b[0].c', 1)           // { a: { b: [{ c: 1 }] } }  (changes and returns the object you pass)

const state = { user: { name: 'Ada', address: { city: 'London' } }, settings: { theme: 'dark' } }
const next = setIn(state, 'user.address.city', 'Paris')
next.user.address.city           // 'Paris'
state.user.address.city          // 'London' (the old state is untouched)
next.settings === state.settings // true (the untouched branch is shared)

const data = { a: { b: 1, c: 2 }, list: [1, 2, 3] }
unset(data, 'a.b')               // true,  data.a is now { c: 2 }
unset(data, 'a.zzz')             // false
set({}, '__proto__.polluted', true) // throws TypeError
```

## Complexity target

- `get`, `has`, `set` and `unset`: O(k) for a path with k keys.
- `setIn`: O(k times w), where w is the number of keys in each container you copy. Only the containers on the path are copied, so the cost does not grow with the size of the branches you did not touch (this is what "structural sharing" buys you).

## Acceptance criteria (what the tests check)

- `get`: string and array paths, brackets, a leading bracket on an array root, number keys, a dotted key via an array path, the default rules (`undefined` only), `null`/`undefined` roots, empty paths, the same nested object is returned.
- `has`: existing and missing paths, keys holding `undefined`/`null`/`0`/`false`, own properties only, `null` roots, empty paths.
- `set`: in-place mutation and the returned object, kept identities, container creation (objects and arrays, mixed paths, `-1` and `1.5` are object keys), replacing `null` and primitives on the way, array roots, storing `undefined`.
- `setIn`: a frozen input is never changed, copies along the path, shared identity of every other branch and sibling, array element updates, creating containers, array roots, chained updates that keep older versions intact.
- `unset`: removed or not (`true`/`false`), nothing created, array holes, inherited properties are never touched.
- Errors and safety: `TypeError` for a bad target or an empty path, the pollution guard for `set` and `setIn`, and no changes when a call is rejected.
- None of the functions change the path array they receive.

## How to run

```bash
npm test -- exercises/js/10-get-set-by-path
```

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/10-get-set-by-path
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Write one helper, `toPath(path)`, that returns an array of keys, and use it in every function. For an array path return `path.map(String)` (a new array, so the caller's array is safe). For a string path, `String(path).match(/[^.[\]]+/g) ?? []` finds every run of characters that is not `.`, `[` or `]`, so `"a.b[0].c"` becomes `["a", "b", "0", "c"]`.
2. `get`: loop over the keys and stop with the default as soon as `current == null`. At the end use `current === undefined ? defaultValue : current`. Do not use `||` (it also replaces `0` and `''`) and do not use `??` (it also replaces `null`).
3. `has`: before you read a key, check `current == null` first (`Object.hasOwn(null, 'a')` throws), then `Object.hasOwn(current, key)`.
4. To decide between an array and an object for a new container, test the next key with `/^(0|[1-9]\d*)$/.test(String(key))`.
5. `set`: loop over every key except the last. If the current child is an own property and is an object, step into it. Otherwise assign a new `[]` or `{}` first, then step into it. Finally assign the value to the last key and return `obj`.
6. Put the checks of requirements 9 and 10 in one helper that both `set` and `setIn` call before they touch anything. It also returns the key array.
7. `setIn`: a recursive helper `updateAt(node, keys, depth, value)` is the clearest. Compute the child (the value itself at the last key, otherwise `updateAt` on the existing child or on a fresh container), then return a shallow copy of `node` with that key replaced: `Array.isArray(node) ? node.slice() : { ...node }`. Nothing else needs copying.
8. `unset`: call your own `has` first and return `false` if it says no. Then find the parent object with `get` on all keys except the last, and `delete parent[lastKey]`.

</details>

## Stretch goals

- Make `setIn` return the original object when the new value is the same as the old one (`Object.is`). React then sees the same reference and can skip a re-render.
- Support quoted keys in brackets, such as `a["b.c"]` and `a['b.c']`.
- Add `update(obj, path, fn)` and `updateIn(obj, path, fn)`: they pass the old value to a function, like `setState(prev => ...)`.
- Add `unsetIn(obj, path)`: an immutable `unset` with structural sharing.
- Make `setIn` keep the prototype of class instances it has to copy.
- Add `getMany(obj, paths)` and use it to pick several fields into a flat object.

## Interview follow-ups to prepare for

- **Immutable nested updates in React state.** Why is `state.user.address.city = 'Paris'; setState(state)` a bug (think about what React compares, and what `React.memo` children see)? Write the spread version for three levels, `{ ...s, user: { ...s.user, address: { ...s.user.address, city } } }`, and say which objects are new and which are shared afterwards. How would you update one item of an array by `id` without mutating? What does `setIn` save you, and where does it still fall short (long paths, Maps and Sets, class instances)?
- **Immer: how does it work conceptually?** You write `produce(state, draft => { draft.user.address.city = 'Paris' })`. What is the `draft`? Explain, in plain words, copy-on-write with proxies: the draft records which nodes you touch, only those nodes are copied, and untouched branches are shared with the old state. What happens when you change nothing? How is this different from `setIn` (many changes in one go, readable "mutating" code, automatic freezing in development)? What does it cost?
- **Prototype pollution (`__proto__` keys) and how to guard.** What is it? Explain how `set(target, userControlledPath, value)` with the path `'__proto__.isAdmin'` can end up changing `Object.prototype`, so that every object in the program suddenly has `isAdmin`. Why are recursive `merge` and `set` helpers the classic victims? List the guards: reject the keys `__proto__`, `constructor` and `prototype`; walk own properties only; use `Object.create(null)` objects or a `Map` for dictionaries; validate input with a schema; `Object.freeze(Object.prototype)`; Node's `--disable-proto` flag. Which of them does your solution use?

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (spread, optional chaining, immutability)
- [State and events](../../../../01-basics/05-state-and-events.md) (immutable updates)
- [useState in depth](../../../../02-hooks/02-usestate-in-depth.md) (objects and arrays in state)
- [useReducer](../../../../02-hooks/06-usereducer.md) (immutable updates in reducers)
- [Memoization](../../../../02-hooks/07-memoization.md) (why keeping object identity matters)
