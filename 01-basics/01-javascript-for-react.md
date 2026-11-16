# JavaScript You Need for React

> **Level:** Beginner   **Time:** about 60 minutes   **Read first:** [How to use this repo](../00-start-here/01-how-to-use-this-repo.md), [Set up your playground](../00-start-here/02-setup-your-playground.md)

## What you will learn
- Write modern JavaScript the way React code does every day: `const` and `let`, arrow functions, template literals, destructuring, spread and rest.
- Use array methods (`map`, `filter`, `find`, `reduce`, `toSorted` and friends) to build new data without changing the old data.
- Explain value versus reference, and why changing state "in place" breaks React.
- Explain closures, `this`, hoisting and the event loop with small examples you can run yourself.
- Write asynchronous code with Promises, `async`/`await`, `try`/`catch` and `fetch`.
- Use the browser basics that React sits on: the DOM, events (bubbling, `preventDefault`), `localStorage`, `Date` and `Intl`.

React has no template language and no special loops. When you read a component, almost everything you see is plain JavaScript. If your JavaScript is rusty, React feels hard for the wrong reasons. This lesson is a refresher of only the parts that React code uses all the time, taught from simple to deep.

**How each section works:** the idea in plain words, a short example with its output in a comment, what happens step by step, a **Why React cares** note, and a common mistake.

**How to run the examples:** paste them into the browser console (press F12), or save a file called `example.mjs` and run `node example.mjs`, or use the practice app (see [Set up your playground](../00-start-here/02-setup-your-playground.md)). The outputs in this lesson come from real runs: plain JavaScript in Node 24, the DOM and storage examples in a browser-like DOM (jsdom), and the React examples with React 19.3.1, Vitest and Testing Library.

## 1. Variables: const, let, var and block scope

A **variable** is a name for a value. `const` makes a name that cannot be pointed at a different value. `let` makes a name you can reassign. `var` is the old way, and you should not use it in new code.

A **block** is any code between `{` and `}` (an `if`, a loop, a function body). Variables made with `let` and `const` only live inside their block. This is called **block scope**.

```js
const price = 10
let count = 0
count = count + 1        // fine: let can be reassigned
// price = 20            // TypeError: Assignment to constant variable.

if (true) {
  let inside = 'only in this block'
  var leaky = 'escapes the block'
}
console.log(leaky)       // escapes the block
// console.log(inside)   // ReferenceError: inside is not defined
```

**What happens, step by step:**
1. `const price = 10` ties the name `price` to the value 10. Assigning to `price` again throws a `TypeError`.
2. `let count` can be reassigned, so `count = count + 1` works.
3. `inside` is born in the `if` block and disappears at the closing `}`. Outside the block the name does not exist.
4. `var` ignores blocks. It belongs to the whole function (or file), so `leaky` is still visible. This is how old code leaks variables by accident.

`const` protects the **name**, not the contents:

```js
const user = { name: 'Asha' }
user.name = 'Ravi'       // allowed: the object changed, but `user` still points to it
console.log(user.name)   // Ravi
```

**Rule of thumb:** use `const` by default, use `let` only when you really reassign, and never use `var`.

### Hoisting and the temporal dead zone

Before JavaScript runs a scope, it scans it and registers every declaration. This is called **hoisting**. What you can do with a hoisted name early depends on how it was declared:

```js
console.log(a)      // undefined: var is hoisted and starts as undefined
var a = 1

sayHi()             // hi: a function declaration is hoisted with its whole body
function sayHi() { console.log('hi') }

// sayBye()         // ReferenceError: Cannot access 'sayBye' before initialization
const sayBye = () => console.log('bye')
```

`let` and `const` are hoisted too, but they cannot be touched until the line that declares them runs. The gap between the start of the scope and that line is the **temporal dead zone** (TDZ). Reading the name inside it throws a `ReferenceError`.

| Declared with | Before its line runs |
|---|---|
| `var` | exists, value is `undefined` |
| `let`, `const` | in the TDZ, reading it throws `ReferenceError` |
| `function name() {}` | fully usable |
| `const name = () => {}` | in the TDZ (it is a `const`) |

**Why React cares:** `const [count, setCount] = useState(0)` makes brand new `const` variables on every render. You never reassign `count`; you call `setCount` and React runs your component again with a new `count`. Hoisting is also the reason `function App() {}` can be used above its definition in a file, but `const App = () => {}` cannot ("Cannot access 'App' before initialization").

**Common mistake:** assigning to a state variable.

```js
const [count, setCount] = useState(0)
count = count + 1          // wrong: TypeError, and React would not know anyway
setCount(count + 1)        // right: ask React to re-render with a new value
```

## 2. Template literals

A **template literal** is a string written with backticks. Inside it, `${...}` inserts the value of any expression.

```js
const name = 'Asha'
const items = 3
const message = `Hello ${name}, you have ${items} item${items === 1 ? '' : 's'}.`
console.log(message)   // Hello Asha, you have 3 items.

const poem = `line one
line two`              // backticks can also span several lines
```

**What happens, step by step:**
1. The backticks tell JavaScript "this string may contain expressions".
2. For each `${...}`, JavaScript runs the expression (a variable, math, a function call, a ternary) and turns the result into text.
3. The pieces are joined into one string. Normal quotes (`'` and `"`) never do this: `'Hello ${name}'` prints the characters `${name}` as they are.

**Why React cares:** you build class names, URLs and labels all the time.

```jsx
<button className={`btn ${isActive ? 'btn-active' : ''}`}>Save</button>
```

```js
fetch(`/api/users/${userId}/posts`)
```

**Common mistake:** letting `false` or `undefined` leak into the text.

```js
const isActive = false
console.log(`btn ${isActive && 'active'}`)       // 'btn false'
console.log(`btn ${isActive ? 'active' : ''}`)   // 'btn '
```

The fix is a ternary with an empty string, as in the second line.

## 3. Functions: arrow functions, default parameters, callbacks

A **function** is a reusable block of code. The **arrow function** is a short way to write one. React code uses arrow functions for almost every small function.

```js
function add(a, b) { return a + b }                   // function declaration
const addArrow = (a, b) => a + b                      // arrow: the expression is returned
const square = n => n * n                             // one parameter: no parentheses needed
const makeUser = (name) => ({ name, active: true })   // returning an object: wrap it in ( )

console.log(add(2, 3), addArrow(2, 3), square(4))     // 5 5 16
console.log(makeUser('Asha'))                         // { name: 'Asha', active: true }
```

A **default parameter** fills in a value when the caller passes nothing:

```js
const greet = (name = 'friend') => `Hi ${name}`
console.log(greet())            // Hi friend
console.log(greet(undefined))   // Hi friend
console.log(greet(null))        // Hi null  (a default only replaces undefined)
```

A **callback** is a function you hand to another function so that it can be called later:

```js
function runTwice(fn) { fn(); fn() }
runTwice(() => console.log('hi'))           // hi, then hi again
setTimeout(() => console.log('later'), 1000) // prints "later" after one second
```

**What happens, step by step:**
1. `a + b` after `=>` (with no braces) is an **implicit return**: the value of the expression is returned for you.
2. With braces you must write `return` yourself.
3. `({ name, active: true })` has parentheses because `{` right after `=>` would start a function body, not an object.
4. `runTwice` receives the arrow function as the value of `fn` and calls it twice. Passing a function around like any other value is the idea behind every React event handler.

**Why React cares:** a component is a function. `onClick`, `onChange` and `.map(...)` all take callbacks. The most common beginner bug is mixing up **passing** a function with **calling** it:

```jsx
<button onClick={save}>Save</button>             // passes the function: React calls it on click
<button onClick={() => save(id)}>Save</button>   // passes a new function that calls save(id) on click
<button onClick={save(id)}>Save</button>         // wrong: calls save(id) while rendering
```

We ran this: with `onClick={handle('now')}`, `handle` was called once while the component rendered, before anyone clicked.

**Common mistake:** an arrow function that should return an object but returns nothing.

```js
const broken = (name) => { name: name }     // braces start a function body; returns undefined
const fixed = (name) => ({ name: name })    // parentheses make it an object: { name: 'A' }
```

## 4. Destructuring

**Destructuring** pulls values out of an object or array into variables, in one line.

```js
const user = { name: 'Asha', age: 30, address: { city: 'Pune' } }

const { name, age } = user                // by key
const { name: userName } = user           // rename: the new variable is userName
const { role = 'guest' } = user           // default, used when the key is missing
const { address: { city } } = user        // nested
console.log(name, age, userName, role, city)   // Asha 30 Asha guest Pune
```

Arrays are destructured by position:

```js
const [first, , third = 'z'] = ['a', 'b']   // an empty slot skips an item
console.log(first, third)                    // a z

let x = 1, y = 2
;[x, y] = [y, x]                             // swap two variables
console.log(x, y)                            // 2 1

const [head, ...tail] = [1, 2, 3]            // ...tail collects the rest
console.log(head, tail)                      // 1 [ 2, 3 ]
```

You can also destructure in the parameter list, and collect "everything else" with `...rest`:

```js
function Card({ title, subtitle = '' }) {
  return `${title}|${subtitle}`
}
console.log(Card({ title: 'Hello' }))        // Hello|

const { id, ...others } = { id: 7, a: 1, b: 2 }
console.log(others)                          // { a: 1, b: 2 }
```

**What happens, step by step:**
1. For objects, JavaScript looks up each key on the right and creates a variable with that name. `name: userName` means "read `name`, store it in `userName`".
2. For arrays it uses the position, not a name. You choose any names you like.
3. A default (`= 'guest'`) is used only when the value is `undefined`. It is not used for `null`:

```js
const { role = 'guest' } = { role: null }
console.log(role)   // null
```

**Why React cares:** props are one object, and components almost always destructure it: `function Card({ title, subtitle })`. `useState` returns an array of two items, so you can name them freely: `const [count, setCount] = useState(0)`.

**Common mistake:** destructuring something that is `undefined` throws.

```js
const { name } = undefined
// TypeError: Cannot destructure property 'name' of 'undefined' as it is undefined.
```

Give the parameter a default so the function survives a missing argument:

```js
const getName = ({ name } = {}) => name
console.log(getName())   // undefined (no crash)
```

## 5. Spread and rest

The three dots `...` do two opposite jobs. **Spread** unpacks a collection into separate items. **Rest** gathers separate items into one collection. Where the dots appear tells you which one it is.

```js
// SPREAD: unpack
const a = [1, 2]
const b = [3]
console.log([...a, ...b])             // [ 1, 2, 3 ]
console.log([0, ...a])                // [ 0, 1, 2 ]
console.log(Math.max(...[4, 9, 2]))   // 9

const user = { name: 'Asha', age: 30 }
console.log({ ...user, age: 31 })     // { name: 'Asha', age: 31 }

// REST: gather
function sum(...nums) { return nums.reduce((total, n) => total + n, 0) }
console.log(sum(1, 2, 3))             // 6
```

**What happens, step by step:**
1. `[...a, ...b]` builds a **new** array and copies the items of `a` and `b` into it. The old arrays are not touched.
2. `{ ...user, age: 31 }` builds a **new** object, copies every key of `user`, then sets `age` to 31. Later keys win, so order matters.
3. In `sum(...nums)` the dots are in the parameter list, so they gather all the arguments into one real array.

Order matters when keys repeat:

```js
const user = { name: 'Asha', age: 30 }
console.log({ ...user, age: 31 })   // { name: 'Asha', age: 31 }  your value wins
console.log({ age: 31, ...user })   // { age: 30, name: 'Asha' }  user.age overwrote it
```

**Why React cares:** spread is how you make updated copies of state without changing the old state (section 10), and how you pass props along:

```jsx
function Button({ label, ...rest }) {
  return <button {...rest}>{label}</button>
}
// <Button label="Save" type="submit" disabled />
// renders a disabled submit button with the text "Save"
```

`...rest` collects every prop except `label`, and `{...rest}` hands them to the real `<button>`.

**Common mistake:** thinking spread makes a deep copy. It copies one level only.

```js
const original = { n: { v: 1 } }
const copy = { ...original }
copy.n.v = 2
console.log(original.n.v)   // 2: the inner object is shared (see section 10)
```

## 6. Object shorthand and computed keys

When the variable name and the key name are the same, write the name once. When a key is only known at run time, put the expression in square brackets.

```js
const name = 'Asha'
const age = 30
const user = { name, age }                // same as { name: name, age: age }
console.log(user)                         // { name: 'Asha', age: 30 }

const field = 'email'
console.log({ [field]: 'a@b.com' })       // { email: 'a@b.com' }
console.log({ field: 'a@b.com' })         // { field: 'a@b.com' }  no brackets: the key is the word "field"

const api = { load() { return 'loaded' } }   // method shorthand
console.log(api.load())                       // loaded
```

**What happens, step by step:**
1. `{ name, age }` reads the variables `name` and `age` and uses their names as keys.
2. `[field]` means "evaluate `field` first, and use the result as the key". Without brackets the key is the literal word.

**Why React cares:** this is the standard trick for a form with many inputs and one state object. Each input has a `name`, and one handler updates the matching key:

```jsx
import { useState } from 'react'

function SignUp() {
  const [form, setForm] = useState({ name: '', email: '' })

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  return (
    <form>
      <input name="name" value={form.name} onChange={handleChange} aria-label="Name" />
      <input name="email" value={form.email} onChange={handleChange} aria-label="Email" />
      <p>{form.name} / {form.email}</p>
    </form>
  )
}
```

After typing `Asha` and `a@b.co`, the paragraph shows `Asha / a@b.co`. Spread copies the old fields, then the computed key replaces just the one that changed.

**Common mistake:** forgetting the brackets. Without them, the text before the colon is taken as the key's name, not as something to evaluate.

```js
setForm({ ...form, e.target.name: e.target.value })     // SyntaxError: a dotted expression cannot be a key
setForm({ ...form, [e.target.name]: e.target.value })   // right: the value of e.target.name is the key
```

A plain name has the same problem in a quieter form: `{ field: value }` always uses the word "field", while `{ [field]: value }` uses what `field` holds.

## 7. Array methods

Arrays hold the lists in your app: todos, products, users. Array methods fall into two groups. Some **return a new value and leave the array alone** (safe). Others **change the array in place** (called **mutating**, and dangerous for React state).

### Find, check and transform (all safe)

```js
const nums = [1, 2, 3, 4, 5]

nums.map((n) => n * 2)              // [ 2, 4, 6, 8, 10 ]  new array, same length
nums.filter((n) => n % 2 === 0)     // [ 2, 4 ]            keep the items that pass the test
nums.find((n) => n > 3)             // 4                   first match, or undefined
nums.findIndex((n) => n > 3)        // 3                   index of first match, or -1
nums.some((n) => n > 4)             // true                at least one passes?
nums.every((n) => n > 0)            // true                all pass?
nums.includes(3)                    // true                is this value in the array?
nums.reduce((total, n) => total + n, 0)   // 15           boil down to one value
```

Most of these callbacks receive `(item, index, array)`. The `reduce` callback receives `(accumulator, item, index, array)`.

**`reduce` step by step:** it keeps a running value called the **accumulator**. It starts at the second argument (`0`). For each item the callback returns the new accumulator: `0 + 1`, then `1 + 2`, then `3 + 3`, and so on, ending at `15`. Always pass the starting value. Without it, `[].reduce((a, b) => a + b)` throws `TypeError: Reduce of empty array with no initial value`.

`reduce` can build objects too:

```js
const words = ['a', 'b', 'a']
const counts = words.reduce((acc, w) => ({ ...acc, [w]: (acc[w] || 0) + 1 }), {})
console.log(counts)   // { a: 2, b: 1 }
```

### slice vs splice, and sort

```js
const letters = ['a', 'b', 'c', 'd']
console.log(letters.slice(1, 3))    // [ 'b', 'c' ]  a copy of a range; letters is unchanged
console.log(letters.splice(1, 2))   // [ 'b', 'c' ]  REMOVES those items from letters
console.log(letters)                // [ 'a', 'd' ]
```

`slice(start, end)` copies a range (the end index is not included). `splice(start, count, ...itemsToInsert)` edits the original array and returns what it removed.

`sort` also mutates, and by default it sorts items **as text**:

```js
const nums2 = [10, 9, 1]
const sorted = nums2.sort()
console.log(sorted)               // [ 1, 10, 9 ]  text order: "1" < "10" < "9"
console.log(sorted === nums2)     // true: same array, now changed
console.log([10, 9, 1].toSorted((a, b) => a - b))   // [ 1, 9, 10 ] new array, numeric order
```

The function `(a, b) => a - b` is a **comparator**: a negative result puts `a` first, a positive one puts `b` first.

**What happens, step by step:**
1. `letters.slice(1, 3)` copies the items at index 1 and 2 into a new array. `letters` still has four items.
2. `letters.splice(1, 2)` cuts two items out of `letters` itself, starting at index 1, and returns them. Now `letters` is `['a', 'd']`.
3. `nums2.sort()` has no comparator, so it turns the numbers into text and sorts the text. It rearranges `nums2` itself and returns that same array, which is why `sorted === nums2` is `true`.
4. `toSorted` with a comparator leaves the original alone and returns a new, correctly ordered array.

| Mutate the array (avoid on state) | Return a new array (safe) |
|---|---|
| `push`, `pop`, `shift`, `unshift` | `map`, `filter`, `slice`, `concat` |
| `splice`, `sort`, `reverse`, `fill` | `flat`, `flatMap`, `[...arr]` |
| `arr[i] = x`, `arr.length = 0` | `toSorted`, `toReversed`, `toSpliced`, `with` |

### The newer "copy" methods: toSorted, toReversed, toSpliced, with, at

```js
const arr = ['a', 'b', 'c']
arr.with(1, 'B')           // [ 'a', 'B', 'c' ]       replace the item at index 1
arr.toSpliced(1, 1)        // [ 'a', 'c' ]            remove one item at index 1
arr.toSpliced(1, 0, 'x')   // [ 'a', 'x', 'b', 'c' ]  insert at index 1
arr.toReversed()           // [ 'c', 'b', 'a' ]
arr.at(-1)                 // 'c'                     negative index counts from the end
console.log(arr)           // [ 'a', 'b', 'c' ]       never changed
```

**Browser support** (from the MDN compatibility data, checked November 2026): `toSorted`, `toReversed`, `toSpliced` and `with` work in Chrome and Edge 110, Firefox 115, Safari 16 and Node 20. `at` works in Chrome 92, Firefox 90, Safari 15.4. If you must support much older browsers, use `[...arr].sort(compare)` instead.

### flat, flatMap and Object.groupBy

```js
console.log([[1, 2], [3, [4]]].flat())      // [ 1, 2, 3, [ 4 ] ]  one level by default
console.log([[1, 2], [3, [4]]].flat(2))     // [ 1, 2, 3, 4 ]
console.log(['a b', 'c'].flatMap((s) => s.split(' ')))   // [ 'a', 'b', 'c' ]  map, then flat(1)

const people = [{ n: 'A', team: 'dev' }, { n: 'B', team: 'qa' }, { n: 'C', team: 'dev' }]
const byTeam = Object.groupBy(people, (p) => p.team)
console.log(Object.keys(byTeam))            // [ 'dev', 'qa' ]
console.log(byTeam.dev.map((p) => p.n))     // [ 'A', 'C' ]
```

`Object.groupBy` is new. It works in Chrome and Edge 117, Firefox 119, Safari 17.4 and Node 21 (MDN compatibility data, November 2026). It returns an object **with no prototype**, so `byTeam.hasOwnProperty` does not exist. `Map.groupBy` is the same idea with any value as key. If you support older browsers, build the groups with `reduce` (practice item 9).

**Why React cares:** `map` turns data into elements, `filter` removes items without mutating, `map` plus spread updates one item, `toSorted` sorts for display without touching state, and `find` looks up the selected item by id.

```jsx
<ul>
  {todos.filter((t) => !t.done).map((t) => <li key={t.id}>{t.text}</li>)}
</ul>
```

Lists and keys are covered in [Conditional rendering and lists](06-conditional-rendering-and-lists.md).

**Common mistake:** sorting an array that belongs to state or props.

```js
const bad = items.sort((a, b) => a.price - b.price)       // mutates items
const good = items.toSorted((a, b) => a.price - b.price)  // new array (or [...items].sort(...))
```

Another classic: `['1', '2', '3'].map(parseInt)` gives `[ 1, NaN, NaN ]`, because `map` passes the index as a second argument and `parseInt` reads it as the number base. Use `.map(Number)` or `.map((s) => parseInt(s, 10))`.

## 8. Truthy, falsy, short-circuiting, ?? and ?.

When JavaScript needs a yes or no (in `if`, `&&`, `||`, `?:`), it converts the value. Exactly eight values become `false`. They are called **falsy**. Everything else is **truthy**.

```js
console.log([false, 0, -0, 0n, '', null, undefined, NaN].map(Boolean))   // eight times false
console.log(['0', 'false', [], {}, ' ', -1].map(Boolean))                 // six times true (surprising!)
```

The operators `&&`, `||` and `??` do not return `true` or `false`. They **return one of their two sides**:

```js
console.log(0 && 'x')            // 0          && stops at the first falsy value
console.log(1 && 'x')            // 'x'        ...otherwise it returns the last value
console.log(0 || 'default')      // 'default'  || returns the first truthy value
console.log(0 ?? 'default')      // 0          ?? only replaces null or undefined
console.log(null ?? 'default')   // 'default'
console.log('' ?? 'default')     // ''
```

**Optional chaining** `?.` stops and gives `undefined` if the thing on its left is `null` or `undefined`, instead of throwing:

```js
const user = { address: null, list: [7] }
console.log(user.address?.city)               // undefined (no error)
console.log(user.list?.[0])                   // 7
console.log(user.save?.())                    // undefined: only calls save if it exists
console.log(user.address?.city ?? 'Unknown')  // Unknown
// user.address.city  ->  TypeError: Cannot read properties of null (reading 'city')
```

The **ternary** `condition ? a : b` picks one of two values: `const label = isLoggedIn ? 'Log out' : 'Log in'`.

**What happens, step by step:**
1. `0 && 'x'`: `0` is falsy, so `&&` stops and returns `0`. It never looks at `'x'`.
2. `0 || 'default'`: `0` is falsy, so `||` moves on and returns `'default'`.
3. `0 ?? 'default'`: `??` asks a narrower question ("is it `null` or `undefined`?"). `0` is neither, so it stays `0`.
4. `user.address?.city`: `address` is `null`, so the chain stops right there and the whole expression is `undefined`.

`??` cannot be mixed with `||` or `&&` without parentheses. `a ?? b || c` is a `SyntaxError`.

**Why React cares:** this is how conditional rendering works. `false`, `null`, `undefined` and `true` render nothing, but `0` and `NaN` render as text:

```jsx
{isLoading && <Spinner />}                      // fine: false shows nothing
{items.length && <List items={items} />}        // BUG: with an empty array this shows "0"
{items.length > 0 && <List items={items} />}    // fixed: the left side is a real boolean
{user ? <Profile user={user} /> : <Login />}    // ternary when there are two outcomes
```

We ran the buggy version with an empty array: the page text was `0`. Use `??` for default props so `0` survives, and `?.` for data that has not loaded yet: `data?.user?.name`. More in [Conditional rendering and lists](06-conditional-rendering-and-lists.md).

**Common mistake:** using `||` for a default when `0` or `''` is a valid value.

```js
const qty = input.qty || 1    // a quantity of 0 becomes 1: bug
const qty2 = input.qty ?? 1   // 0 stays 0, only a missing value becomes 1
```

## 9. Equality: ==, === and Object.is

`===` (**strict equality**) checks type and value with no conversion. `==` (**loose equality**) converts the types first using complicated rules. `Object.is` is almost the same as `===`, with two differences for rare values.

```js
console.log(1 === '1')            // false  different types
console.log(1 == '1')             // true   '1' is converted to a number first
console.log(null == undefined)    // true   (a special rule)
console.log(null === undefined)   // false
console.log(0 == '')              // true   surprising
console.log(NaN === NaN)          // false  NaN is not equal to itself
console.log(Object.is(NaN, NaN))  // true
console.log(0 === -0)             // true
console.log(Object.is(0, -0))     // false
```

Objects and arrays are compared by **reference** (are they the very same object in memory?), never by contents:

```js
console.log([] === [])      // false: two different arrays
const a = {}
const b = a
console.log(a === b)        // true: b points to the same object as a
console.log({} === {})      // false
```

**What happens, step by step:**
1. `1 == '1'`: the types differ, so JavaScript converts `'1'` to the number `1`, then compares. That is why `==` is hard to predict.
2. `[] === []`: each `[]` creates a new array. Two new arrays are two different things, so the result is `false`, even though both are empty.
3. `Object.is` follows `===` except that `NaN` equals `NaN`, and `+0` and `-0` are different.

**Rule:** always write `===` and `!==`. Some teams allow `value == null` as a short way to check "`null` or `undefined`", and nothing else.

**Why React cares:** React uses `Object.is` to compare things. If you call a state setter with a value that is `Object.is`-equal to the current one, React skips the render. The dependency array of `useEffect` and `useMemo`, and the props that `React.memo` compares, are also checked one by one with `Object.is`. A new object or array created during render is therefore "different" every time, even when its contents are the same. See [useState in depth](../02-hooks/02-usestate-in-depth.md) and [Memoization](../02-hooks/07-memoization.md).

**Common mistake:** comparing contents with `===`.

```js
if (selected === { id: 1 }) {}               // always false: a new object each time
if (selected.id === 1) {}                    // right: compare the field
```

For two objects with many fields, write a deep-equal function (see the exercise [09 - deep equal](../practice-app/exercises/js/09-deep-equal/README.md)).

## 10. Value vs reference, copies and immutability

This is the most important section for React.

JavaScript has two kinds of values. **Primitives** (numbers, strings, booleans, `null`, `undefined`, `bigint`, `symbol`) are copied **by value**: each variable holds its own copy. **Objects** (including arrays and functions) are copied **by reference**: the variable holds an address that points to the object, and copying the variable copies only the address.

```js
let a = 5
let b = a          // b gets its own copy of 5
b = 6
console.log(a, b)  // 5 6

const p = { x: 1 }
const q = p        // q gets the same address, not a new object
q.x = 99
console.log(p.x)   // 99
console.log(p === q)   // true
```

### Shallow copy vs deep copy

A **shallow copy** copies the top level only. Inner objects are still shared. A **deep copy** copies every level, so nothing is shared.

```js
const original = { name: 'Asha', address: { city: 'Pune' } }

const shallow = { ...original }
shallow.name = 'Ravi'
shallow.address.city = 'Delhi'
console.log(original.name)           // Asha   the top level was copied
console.log(original.address.city)   // Delhi  the inner object is shared

const deep = structuredClone(original)
deep.address.city = 'Goa'
console.log(original.address.city)   // Delhi  untouched this time
```

**What happens, step by step:**
1. `{ ...original }` creates a new outer object. Its `name` is a copy of a string. Its `address` is a copy of the **address** of the inner object, so both objects point at the same inner object.
2. Changing `shallow.address.city` changes the one shared inner object, so `original` "changes" too.
3. `structuredClone` walks the whole structure and copies every level, including `Date`, `Map`, `Set` and arrays. The result shares nothing with the original.

`structuredClone` is built into browsers (Chrome and Edge 98, Firefox 94, Safari 15.4) and Node 17 and later. Limits: it throws a `DataCloneError` for functions, and a class instance comes back as a plain object without its methods. The older trick `JSON.parse(JSON.stringify(x))` is worse: it drops `undefined` and functions, turns `NaN` into `null`, and turns a `Date` into a string.

`Object.freeze(obj)` makes an object read-only, but only at the top level (it is shallow too).

### Why mutating state breaks React

React decides whether something changed by comparing the old and new value with `Object.is` (section 9). If you change an object **in place** and hand React the same object, the comparison says "same", and React skips the update.

```jsx
import { useState } from 'react'

function BrokenList() {
  const [items, setItems] = useState(['a'])

  function addItem() {
    items.push('b')    // changes the array React already holds
    setItems(items)    // the same reference as before
  }

  return (
    <div>
      <button onClick={addItem}>Add</button>
      <p>{items.join(',')}</p>
    </div>
  )
}
```

We ran this. After clicking **Add**, the screen still shows `a`. The array in memory is now `['a', 'b']`, but React saw the same array and did nothing. The bug is confusing because the next unrelated render makes the screen show `a,b`. The fix is to hand React a new array:

```jsx
setItems([...items, 'b'])   // new array: the screen shows a,b
```

### Immutable update recipes

**Immutable** means "never changed after it is created". Instead of editing a value, you build a new one. These recipes cover almost every state update you will write:

| Task | Do not (mutates) | Do (builds a new value) |
|---|---|---|
| Add to an array | `arr.push(x)` | `[...arr, x]` |
| Remove from an array | `arr.splice(i, 1)` | `arr.filter((x) => x.id !== id)` |
| Update one item | `arr[i].done = true` | `arr.map((x) => (x.id === id ? { ...x, done: true } : x))` |
| Insert at an index | `arr.splice(i, 0, x)` | `arr.toSpliced(i, 0, x)` |
| Sort or reverse | `arr.sort()`, `arr.reverse()` | `arr.toSorted()`, `arr.toReversed()` |
| Change an object field | `obj.name = 'x'` | `{ ...obj, name: 'x' }` |
| Change a nested field | `obj.user.name = 'x'` | `{ ...obj, user: { ...obj.user, name: 'x' } }` |

For a nested change, copy every object on the path to the value, and leave the rest alone:

```js
const state = { user: { name: 'A', address: { city: 'X' } }, count: 1 }
const next = {
  ...state,
  user: { ...state.user, address: { ...state.user.address, city: 'Y' } },
}
console.log(state.user.address.city)     // X  the old state is untouched
console.log(next.user.address.city)      // Y
console.log(next.count === state.count)  // true  parts that did not change are shared, not copied
```

You almost never need a deep copy in React. You copy only the path you change. When nesting gets very deep, a library called Immer lets you write code that looks like mutation and produces new objects, which you can read about in [useState in depth](../02-hooks/02-usestate-in-depth.md).

**Common mistake:** believing a copy made with spread is fully independent.

```js
const copy = { ...state }
copy.user.name = 'Z'       // also changes state.user.name: user is shared
```

The fix is to copy each level you change: `{ ...state, user: { ...state.user, name: 'Z' } }`.

## 11. Closures

A **closure** is a function that remembers the variables from the place where it was created, even after that place has finished running.

```js
function makeCounter() {
  let count = 0
  return function increment() {
    count = count + 1
    return count
  }
}

const c1 = makeCounter()
const c2 = makeCounter()
console.log(c1(), c1(), c1())   // 1 2 3
console.log(c2())               // 1  a separate counter with its own count
```

**What happens, step by step:**
1. `makeCounter()` runs. It creates a variable `count` and returns the inner function `increment`. Normally `count` would disappear when `makeCounter` finishes.
2. But `increment` uses `count`, so JavaScript keeps `count` alive for as long as `increment` exists. That link is the closure.
3. Each call to `makeCounter()` makes a fresh `count` and a fresh `increment`, so `c1` and `c2` do not affect each other.
4. Nothing else can reach `count`. The closure gives you private data.

### The loop puzzle: var vs let

```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i), 0)   // 3 3 3
for (let j = 0; j < 3; j++) setTimeout(() => console.log(j), 0)   // 0 1 2
```

With `var` there is only **one** `i` for the whole loop. The timeouts run after the loop has finished, when `i` is 3. With `let`, each pass through the loop gets its **own** `j`, and each arrow function closes over its own copy.

### Closures and React: stale values

Every time React renders a component, it calls your function again. Each call has its own `count`, and the functions created during that call close over that `count`. A function made in an old render keeps seeing the old value. This is called a **stale closure**.

```jsx
import { useState } from 'react'

function SlowCounter() {
  const [count, setCount] = useState(0)

  function addStale() {
    setTimeout(() => setCount(count + 1), 1000)      // count is frozen at this render's value
  }
  function addSafe() {
    setTimeout(() => setCount((c) => c + 1), 1000)   // asks React for the latest value
  }

  return (
    <div>
      <button onClick={addStale}>Stale +1</button>
      <button onClick={addSafe}>Safe +1</button>
      <p>Count: {count}</p>
    </div>
  )
}
```

We clicked **Stale +1** three times quickly and waited one second: the screen showed `Count: 1`, because all three timeouts had captured `count` as `0` and each one set it to `0 + 1`. Clicking **Safe +1** three times gave `Count: 3`, because `(c) => c + 1` is called by React with the newest value. This is not a React bug. It is how closures work. More in [useState in depth](../02-hooks/02-usestate-in-depth.md) and [useEffect](../02-hooks/03-useeffect.md).

**Common mistake:** using `var` in a loop that creates callbacks.

```js
for (var k = 0; k < 3; k++) buttons[k].onclick = () => alert(k)   // every button alerts 3
for (let k = 0; k < 3; k++) buttons[k].onclick = () => alert(k)   // 0, 1, 2 as expected
```

## 12. this

`this` is a special value that a function gets when it is called. Its value depends on **how the function is called**, not where it is written. There are four rules:

1. **Method call** `obj.fn()`: `this` is `obj`.
2. **Plain call** `fn()`: `this` is `undefined` in modules and classes (they run in strict mode). In old non-strict scripts it was the global object.
3. **Constructor call** `new Fn()`: `this` is the new object being built.
4. **Explicit** `fn.call(obj)`, `fn.apply(obj)` or `fn.bind(obj)`: `this` is the `obj` you pass.

```js
const user = {
  name: 'Asha',
  sayName() { return this.name },
}
console.log(user.sayName())              // Asha  rule 1: called as a method
const detached = user.sayName
// detached()                            // TypeError: Cannot read properties of undefined (reading 'name')
const bound = user.sayName.bind(user)
console.log(bound())                     // Asha  rule 4: bind fixed this to user
console.log(user.sayName.call({ name: 'Other' }))   // Other
```

**What happens, step by step:**
1. `user.sayName()` has `user.` in front of the call, so `this` is `user`.
2. `const detached = user.sayName` copies the function out of the object. Calling `detached()` has nothing in front of it (rule 2), so `this` is `undefined` and `this.name` throws.
3. `bind(user)` returns a new function whose `this` is permanently `user`.

**Arrow functions have no `this` of their own.** They use the `this` of the place where they were written. That is why an arrow function is the fix when a callback inside a method loses `this`.

```js
class Counter {
  count = 0
  incrementBroken() { this.count++ }
  incrementArrow = () => { this.count++ }   // an arrow stored on the instance
}
const c = new Counter()
const { incrementBroken, incrementArrow } = c   // detach both from c, like passing them as props
incrementArrow()
console.log(c.count)     // 1  the arrow remembered this
// incrementBroken()     // TypeError: Cannot read properties of undefined (reading 'count')
```

**Why React cares:** in **function components** (what you write today) there is almost no `this`, which is one reason they replaced classes. In legacy **class components**, `onClick={this.handleClick}` hands over a detached method, so `this` is lost. The two classic fixes are `this.handleClick = this.handleClick.bind(this)` in the constructor or an arrow-function class field like `incrementArrow` above. You only need this for old code and for interviews: see Legacy class components (planned) and, for more depth, [JavaScript deep dive for interviews](10-javascript-deep-dive-for-interviews.md).

**Common mistake:** using an arrow function as an object method and expecting `this` to be the object.

```js
const timer = { seconds: 0, tick: () => this.seconds++ }   // this is NOT timer here
const timer2 = { seconds: 0, tick() { this.seconds++ } }   // right: a method shorthand
```

## 13. ES modules: import, export, barrel files

A **module** is a file with its own private scope. Nothing leaves the file unless you `export` it, and other files `import` what they need.

```js
// math.js
export const PI = 3.14                               // named export
export function double(n) { return n * 2 }           // named export
export default function add(a, b) { return a + b }   // default export: at most one per file

// main.js
import add, { PI, double } from './math.js'   // default has no braces, named has braces
import { double as twice } from './math.js'   // rename while importing
import * as math from './math.js'             // everything, as one object
console.log(add(1, 2), PI, double(4), twice(5))   // 3 3.14 8 10
console.log(Object.keys(math))                    // [ 'PI', 'default', 'double' ]
```

**Named vs default exports:**
- A file can have **many named exports**. The importer must use the exact name (or rename it with `as`). Editors can auto-import and rename them safely, and a typo is an error. Many teams prefer them for this reason.
- A file can have **one default export**. The importer picks any name for it (`import Anything from './math.js'`). `React.lazy(() => import('./Chart.jsx'))` expects the loaded module to have a default export that is the component.

A **barrel file** is an `index.js` that re-exports things from several files, so the importer needs only one path:

```js
// components/index.js
export { Button } from './Button.jsx'
export { default as Card } from './Card.jsx'
export * from './helpers.js'

// anywhere else
import { Button, Card, clamp } from './components'   // Vite finds components/index.js for you
```

Barrels are tidy, but they hide where code really lives, make circular imports easier to create, and in a big folder they can make the dev server and bundler load many files that you do not use. Use them for small folders, not for the whole app.

A **dynamic import** loads a module later, when the line runs, and gives you a Promise of the module object:

```js
const mod = await import('./math.js')
console.log(mod.default(2, 2), mod.PI)   // 4 3.14
```

### Modules in the browser

```html
<script type="module" src="/src/main.jsx"></script>
```

- A module script runs after the HTML is parsed, in strict mode, with its own scope. A top-level `var` does not become a property of `window`, and top-level `this` is `undefined`.
- A module is loaded and run **once**, even if ten files import it. Every importer shares the same instance.
- All `import` lines are hoisted: they are resolved before the rest of the file runs.
- A plain browser needs a real relative path with the extension (`./math.js`). A bare name like `'react'` only works through a bundler (Vite rewrites it for you) or an import map.
- Module scripts must be served over HTTP. Opening `index.html` by double-click (a `file://` address) fails in most browsers, which is why you run `npm run dev`.

**What happens, step by step:** when the browser meets `<script type="module">`, it downloads the file, finds its `import` lines, downloads those files too, runs the deepest dependencies first, and then runs your file. Vite does the same job during development and then bundles everything for production.

**Why React cares:** every component file is a module. You write `import { useState } from 'react'` (named) and `export default function App()` (default). With the modern JSX transform, which React 19 requires, you do not need `import React from 'react'` just to write JSX.

**Common mistake:** importing a default export with braces (or the other way round).

```js
import { App } from './App.jsx'   // error: the module does not provide an export named 'App'
import App from './App.jsx'       // right, when App.jsx has `export default`
```

## 14. Asynchronous JavaScript: Promises, async/await, fetch, JSON

Some work takes time: network requests, timers, reading files. JavaScript does not stop and wait, because that would freeze the page. It starts the work, carries on, and comes back when the result is ready.

The oldest style is the **callback**: "call this function when you are done".

```js
setTimeout(() => console.log('one second later'), 1000)
console.log('this prints first')
```

A **Promise** is an object that stands for a value that will arrive later. It is always in one of three states: **pending**, **fulfilled** (it has a value) or **rejected** (it has an error). Once it settles, it never changes again.

```js
const wait = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms))

wait(100, 'done')
  .then((value) => value.toUpperCase())      // the returned value goes to the next .then
  .then((upper) => console.log(upper))       // DONE
  .catch((error) => console.log('failed', error))   // runs if any step above threw or rejected
  .finally(() => console.log('cleanup'))     // runs either way, after DONE
```

**`async`/`await`** is a nicer way to write the same Promises. It reads top to bottom, like normal code.

```js
async function showUpper() {
  const value = await wait(100, 'done')   // pauses THIS function, not the whole program
  console.log(value.toUpperCase())        // DONE
}
```

**What happens, step by step:**
1. `wait(100, 'done')` returns a pending Promise and starts a timer.
2. `.then(...)` registers "when you fulfil, run this". It returns a **new** Promise, which is why you can chain.
3. After 100 ms the timer calls `resolve('done')`. The Promise is fulfilled and the `.then` callbacks run one after another, each as a microtask (section 15).
4. In the `async` version, `await` pauses `showUpper` until the Promise settles. Other code keeps running meanwhile. An `async` function always returns a Promise, so a `return 5` becomes a Promise that fulfils with 5.

### Errors: try, catch, finally

When an awaited Promise rejects, `await` throws, so ordinary `try`/`catch` works:

```js
async function load() {
  try {
    const value = await Promise.reject(new Error('boom'))
    console.log(value)           // never runs
  } catch (error) {
    console.log(error.message)   // boom
  } finally {
    console.log('always runs')   // always runs
  }
}
load()
```

### Several Promises at once

```js
const [a, b] = await Promise.all([wait(20, 'a'), wait(10, 'b')])
console.log(a, b)    // a b  (results come back in input order)
```

- `Promise.all([...])`: waits for **all**; rejects as soon as **one** rejects.
- `Promise.allSettled([...])`: waits for all and never rejects; gives `{ status, value }` or `{ status, reason }` for each.
- `Promise.race([...])`: settles with the **first** one to settle (fulfil or reject).
- `Promise.any([...])`: fulfils with the first one to **fulfil**.

Two awaits in a row run one after the other (50 ms + 50 ms = about 100 ms). The same two inside `Promise.all` run together (about 50 ms). Use `Promise.all` when the calls do not depend on each other.

### fetch and JSON

`fetch(url)` makes an HTTP request and returns a Promise of a `Response`. **JSON** is the text format APIs use to send data. `JSON.stringify` turns a value into JSON text, and `JSON.parse` turns text back into a value.

```js
async function getUsers() {
  const response = await fetch('https://jsonplaceholder.typicode.com/users')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)   // see the warning below
  return response.json()      // reads the body and parses it; also returns a Promise
}

await fetch('/api/todos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Learn promises' }),
})
```

```js
JSON.stringify({ name: 'A', tags: ['x'], skip: undefined })   // '{"name":"A","tags":["x"]}'
JSON.parse('{"a":[1,2,{"b":null}]}')                          // { a: [ 1, 2, { b: null } ] }
JSON.parse('{oops')                                           // throws a SyntaxError
```

Three facts that catch people out (we checked the first two against a real local server and the third in Node):
1. **`fetch` does not reject on 404 or 500.** The Promise rejects only when the request itself fails (offline, blocked, DNS error). For an error status you get a normal `Response` with `response.ok === false`, so you must check `ok` yourself.
2. **The body can be read once.** A second `response.json()` throws `TypeError: Body is unusable`.
3. `JSON.stringify` drops `undefined` and function values inside objects, turns them (and `NaN`) into `null` inside arrays, and turns a `Date` into an ISO string.

**Why React cares:** loading data is async, so components fetch inside `useEffect` and keep `loading`, `error` and `data` in state. The function you pass to `useEffect` must not be `async` itself (an async function returns a Promise, but React expects nothing or a cleanup function), so you define an async function inside and call it. The `ignore` flag below stops an old request from overwriting newer state. In development, StrictMode runs effects twice on purpose, and this pattern survives it.

```jsx
import { useEffect, useState } from 'react'

export default function Users() {
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const res = await fetch('https://jsonplaceholder.typicode.com/users')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!ignore) setUsers(data)
      } catch (err) {
        if (!ignore) setError(err.message)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  if (loading) return <p>Loading...</p>
  if (error) return <p role="alert">Failed: {error}</p>
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  )
}
```

We ran this with a fake `fetch`. It shows `Loading...` first, then the names. With a 404 response it shows `Failed: HTTP 404`, and with a network failure it shows `Failed: Failed to fetch`. Inside StrictMode, `fetch` was called twice but the list was rendered once. For the full story (aborting requests, caching, TanStack Query) read [Data fetching](../03-intermediate/02-data-fetching.md).

**Common mistake:** `forEach` with an async callback. `forEach` ignores the Promises its callback returns, so it does not wait.

```js
items.forEach(async (item) => { await save(item) })
console.log('done')                         // prints BEFORE any save has finished

await Promise.all(items.map((item) => save(item)))   // right: wait for all, in parallel
for (const item of items) { await save(item) }       // right: one after another
```

## 15. The event loop in 10 lines

JavaScript can do only one thing at a time, yet it handles timers, clicks and network replies without freezing. The **event loop** is the reason. Here it is in ten lines:

1. JavaScript runs one piece of code at a time on a single **call stack** (the list of functions currently running).
2. Slow jobs (timers, network, user input) are done by the browser, outside your code.
3. When a job finishes, its callback is put in a queue.
4. There are two queues. The **microtask queue** holds Promise callbacks (`.then`, `await` continuations) and `queueMicrotask`. The **macrotask queue** (also called the task queue) holds `setTimeout` and `setInterval` callbacks and events such as clicks.
5. First, your current synchronous code runs until the call stack is empty.
6. Then the loop runs **every** microtask, including new ones added while it runs, until the microtask queue is empty.
7. Then the browser may repaint the screen.
8. Then the loop takes **one** macrotask and runs it.
9. Then it goes back to step 6.
10. So Promise callbacks always run before the next `setTimeout` callback, and `setTimeout(fn, 0)` means "after everything else that is ready", not "now".

Try to predict the output before you read it:

```js
console.log('1 start')
setTimeout(() => console.log('2 timeout'), 0)
Promise.resolve().then(() => console.log('3 promise'))
queueMicrotask(() => console.log('4 microtask'))
console.log('5 end')
```

```text
1 start
5 end
3 promise
4 microtask
2 timeout
```

**What happens, step by step:**
1. `'1 start'` prints (synchronous).
2. `setTimeout` hands the callback to the timer. It will land in the macrotask queue.
3. `.then` and `queueMicrotask` put their callbacks in the microtask queue, in that order.
4. `'5 end'` prints. The synchronous code is now finished.
5. The loop empties the microtask queue: `'3 promise'`, then `'4 microtask'`.
6. Only now does it take the macrotask: `'2 timeout'`.

A second puzzle with `async`/`await`. An async function runs **synchronously until its first `await`**, and the rest of it is queued as a microtask:

```js
async function a() {
  console.log('a start')
  await null
  console.log('a after await')
}
console.log('script start')
a()
console.log('script end')
setTimeout(() => console.log('timeout'), 0)
```

```text
script start
a start
script end
a after await
timeout
```

This is the same in browsers and in Node for these examples. Node also has `process.nextTick` and `setImmediate`, which browsers do not have.

**Why React cares:** React runs your event handler as ordinary synchronous code and applies all the state updates made in it **after** the handler finishes, in one batch. If your code runs a long synchronous loop, the browser cannot handle clicks or repaint until it ends, so the page freezes. Data you fetch always arrives later, in a Promise callback, which is why you hold it in state. The browser side of the loop (rendering, frames) is in Browser and web platform (planned), and the deep interview version is in [JavaScript deep dive for interviews](10-javascript-deep-dive-for-interviews.md).

**Common mistake:** blocking the loop.

```js
const end = Date.now() + 3000
while (Date.now() < end) {}      // freezes the tab for 3 seconds: no clicks, no repaint
```

The fix is to avoid long synchronous work: split it into small chunks, or move it to a Web Worker.

## 16. DOM basics: selecting, events, bubbling, preventDefault

The **DOM** (Document Object Model) is the live tree of elements that the browser builds from your HTML. React creates and updates DOM elements for you, but you still meet the DOM in refs, in third-party libraries, and because React's events are modelled on DOM events.

```html
<div id="outer">
  <ul id="list">
    <li class="item" data-id="1"><span>One</span></li>
    <li class="item" data-id="2"><span>Two</span></li>
  </ul>
  <button id="save">Save</button>
</div>
```

```js
const button = document.querySelector('#save')       // first match, or null if none
const items = document.querySelectorAll('.item')     // all matches, as a NodeList (not an array)

button.textContent = 'Saved'
button.classList.add('done')
button.setAttribute('disabled', '')
console.log(button.outerHTML)    // <button id="save" class="done" disabled="">Saved</button>
console.log([...items].length)   // 2  spread the NodeList to get a real array

button.addEventListener('click', (event) => {
  console.log('clicked', event.target.id)    // clicked save
})
```

### Bubbling and capturing

When you click the `<span>` inside an `<li>`, the click does not stay on the span. The event travels in three phases:
1. **Capture:** from the top (`window`, `document`) down to the clicked element.
2. **Target:** the clicked element itself.
3. **Bubble:** back up from the clicked element to the top.

By default `addEventListener` listens in the **bubble** phase. Pass `{ capture: true }` to listen while the event is going down. We ran this in a browser-like DOM:

```js
const outer = document.querySelector('#outer')
const list = document.querySelector('#list')
const li = document.querySelector('.item')
const log = (name) => console.log(name)

outer.addEventListener('click', () => log('outer (capture)'), { capture: true })
outer.addEventListener('click', () => log('outer (bubble)'))
list.addEventListener('click', () => log('list (bubble)'))
li.addEventListener('click', () => log('li (bubble)'))
// the user clicks the <span> inside the first <li>:
// outer (capture), li (bubble), list (bubble), outer (bubble)
```

- `event.stopPropagation()` stops the event from travelling any further. We confirmed that a listener on the list that calls it stops the `outer` listener from running.
- `event.preventDefault()` cancels the browser's own action for the event (following a link, submitting a form) but the event keeps travelling. They do different jobs.

**Event delegation** uses bubbling: put one listener on the parent and check what was clicked. It also works for items added later.

```js
list.addEventListener('click', (event) => {
  const li = event.target.closest('li')   // the nearest ancestor (or itself) that is an <li>
  if (!li) return
  console.log('item', li.dataset.id)      // click "Two": item 2. A new <li> added later also works.
})
```

**What happens, step by step:**
1. You click the text "Two", which is inside a `<span>`. `event.target` is the span.
2. The event bubbles up to the `<ul>` where your listener is.
3. `event.target.closest('li')` walks up from the span and finds the `<li>`, so you know which item was clicked.

**Why React cares:** `onClick`, `onChange` and the others are React's version of these events. Bubbling works the same way, there is `onClickCapture` for the capture phase, and your handler receives an event with `preventDefault()` and `stopPropagation()`. We ran this and got the order `parent capture`, `child`, `parent bubble`:

```jsx
<div onClickCapture={() => log('parent capture')} onClick={() => log('parent bubble')}>
  <button onClick={() => log('child')}>Go</button>
</div>
```

With `e.stopPropagation()` in the button's handler, only `child` is logged. In a form you almost always write `onSubmit={(e) => { e.preventDefault(); ... }}`, otherwise the browser reloads the page. You rarely call `addEventListener` yourself in a component, except for events on `window` or `document`, and then you do it inside an Effect and remove the listener in the cleanup.

**Common mistake:** trying to remove a listener with a different function.

```js
button.addEventListener('click', () => save())
button.removeEventListener('click', () => save())   // does nothing: a new function is a different function

const onClick = () => save()
button.addEventListener('click', onClick)
button.removeEventListener('click', onClick)        // right: the same function object
```

## 17. localStorage and sessionStorage

The browser has two small key-value stores for each website (each **origin**).
- `localStorage` keeps data until your code or the user clears it. It survives closing the tab and the browser.
- `sessionStorage` keeps data for one tab. It is gone when the tab closes.

Both store **strings only**, are **synchronous** (they block the page while they work, so keep the data small), and hold a few megabytes at most.

```js
localStorage.setItem('theme', 'dark')
console.log(localStorage.getItem('theme'))     // dark
console.log(localStorage.getItem('missing'))   // null  (not undefined)

localStorage.setItem('n', 5)
console.log(typeof localStorage.getItem('n'))  // string  (the number became the text "5")

localStorage.setItem('user', JSON.stringify({ name: 'Asha' }))
console.log(JSON.parse(localStorage.getItem('user')).name)   // Asha

localStorage.removeItem('theme')               // delete one key
sessionStorage.setItem('tab', '1')             // same methods, different lifetime
```

**What happens, step by step:**
1. `setItem` converts the value to a string. An object you forgot to `JSON.stringify` is stored as the useless text `[object Object]`.
2. `getItem` returns that string, or `null` when the key does not exist.
3. To store objects, `JSON.stringify` on the way in and `JSON.parse` on the way out.

Reading can fail. Storage can be blocked by privacy settings or full, and a stored text may not be valid JSON. A safe reader looks like this:

```js
function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback    // storage blocked, or the text is not valid JSON
  }
}
```

**Why React cares:** saving a theme, a draft or a cart is a classic task. Read once when the component starts, using a **lazy initializer** (a function passed to `useState`, run only on the first render), and write when the value changes:

```jsx
const [theme, setTheme] = useState(() => readJson('theme', 'light'))
```

You will wrap this into a reusable `useLocalStorage` hook in [Custom hooks](../02-hooks/08-custom-hooks.md). On a server there is no `localStorage`, so code that reads it while rendering on the server throws; frameworks that render on the server need extra care. Anything in storage can be read by any script on your page, so never keep secrets there: see [Security and i18n](../04-advanced/10-security-and-i18n.md).

**Common mistake:** `JSON.parse(localStorage.getItem('user'))` without a plan for a missing key. `JSON.parse(null)` happens to return `null`, but `JSON.parse(undefined)` throws a `SyntaxError`, and corrupt text throws too. Use a safe reader like `readJson`.

## 18. Date and Intl basics

A `Date` is a single moment in time, stored as the number of milliseconds since 1 January 1970 UTC.

```js
const d = new Date(Date.UTC(2026, 10, 10, 15, 30))   // months start at 0, so 10 is November
console.log(d.toISOString())       // 2026-11-10T15:30:00.000Z
console.log(d.getTime())           // 1794324600000  milliseconds since 1970-01-01 UTC
console.log(typeof Date.now())     // number  the current moment, in the same unit
```

**What happens, step by step:**
1. `Date.UTC(2026, 10, 10, 15, 30)` computes the moment 15:30 UTC on 10 November 2026 and returns it as a number of milliseconds. `new Date(number)` wraps that number in a `Date` object.
2. `toISOString()` writes the moment as text in UTC (the `Z` at the end means UTC). `getTime()` gives back the number.
3. A `Date` is just that number plus methods. It has no time zone of its own: the zone only matters when you format it or call local methods such as `getDate()`.

Three traps:
1. **Months are 0-based** (January is 0), but days are 1-based.
2. **Parsing a date-only string uses UTC; a date with a time and no zone uses local time.** `new Date('2026-11-10')` is midnight UTC. In a time zone behind UTC, such as New York, `getDate()` on it gives 9. `new Date('2026-11-10T00:00:00')` is midnight in the user's own zone.
3. **`Date` objects are mutable.** `setDate`, `setMonth` and friends change the object itself. Copy first: `const next = new Date(d); next.setDate(next.getDate() + 1)`.

`Intl` is the built-in toolkit for formatting dates, numbers and relative times for a locale (a language and region, such as `en-US` or `en-IN`):

```js
const d = new Date(Date.UTC(2026, 10, 10, 15, 30))
new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(d)   // 'Nov 10, 2026'
new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(d)     // '10 November 2026'
new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(1234567.5)   // '₹12,34,567.50'
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(1234567.5)   // '$1,234,567.50'
new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-1, 'day')   // 'yesterday'
d.toLocaleDateString('en-US', { timeZone: 'UTC' })   // '11/10/2026'  a shortcut for the same idea
```

`timeZone: 'UTC'` is used here so the output is the same on every machine. Without it, the output depends on the user's time zone. A newer API called `Temporal` is meant to replace `Date`, but in the MDN compatibility data for November 2026 it was not yet available in every major browser (Safari was still in preview), so `Date` and `Intl` are what you will meet.

**Why React cares:** you cannot render a `Date` object directly. React throws `Objects are not valid as a React child (found: [object Date])`. Format it into a string first: `{new Date(ts).toLocaleDateString('en-US')}`. Calling `new Date()` or `Date.now()` while rendering also makes the component impure (a different result for the same props), so take the current time in an event handler or an Effect. A server and a browser in different time zones can format the same date differently, which causes a hydration warning (see the SSR lesson).

**Common mistake:** doing date math by adding to the day of the month on the original object.

```js
const due = new Date(2026, 0, 31)
due.setMonth(due.getMonth() + 1)    // mutates due, and Jan 31 + 1 month overflows to 3 March
```

Copy the date first, and when the calendar matters (month ends, time zones, daylight saving), use a tested library or `Temporal` where you can.

## 19. Putting it together

Here is one small component that uses most of this lesson. Read it line by line and name the feature on each line.

```jsx
import { useState } from 'react'

const initialTodos = [
  { id: 1, text: 'Learn closures', done: true },
  { id: 2, text: 'Practice array methods', done: false },
]

export default function TodoSummary() {
  const [todos, setTodos] = useState(initialTodos)

  const toggle = (id) =>
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))

  const remaining = todos.filter((t) => !t.done).length
  const next = todos.find((t) => !t.done)

  return (
    <section>
      <h2>{`${remaining} of ${todos.length} left`}</h2>
      <p>Next: {next?.text ?? 'nothing, all done'}</p>
      <ul>
        {todos
          .toSorted((a, b) => a.text.localeCompare(b.text))
          .map(({ id, text, done }) => (
            <li key={id} className={`item ${done ? 'item-done' : ''}`}>
              <label>
                <input type="checkbox" checked={done} onChange={() => toggle(id)} /> {text}
              </label>
            </li>
          ))}
      </ul>
    </section>
  )
}
```

**What happens, step by step** (we ran it):
1. The first render shows `1 of 2 left` and `Next: Practice array methods`. The list is sorted alphabetically: "Learn closures" first, and only that row has the class `item-done`.
2. You tick "Practice array methods". The `onChange` arrow function calls `toggle(2)`.
3. `toggle` builds a **new** array with `map`. Item 2 becomes a **new** object (`{ ...t, done: !t.done }`), and item 1 is reused as it is. Nothing is mutated.
4. `setTodos` gets a new array, `Object.is` says it changed, and React renders again: `0 of 2 left` and `Next: nothing, all done`.

**Features used:** `const`, arrow functions, template literals (twice), destructuring in the `.map` callback, spread for the copy, `filter`, `find`, `map`, `toSorted`, optional chaining `?.`, nullish coalescing `??`, a ternary, and a closure (`toggle` remembers `todos`). It is plain JavaScript inside a function.

**Common mistake:** assuming `find` always finds something.

```jsx
<p>Next: {next.text}</p>                          // TypeError when every item is done: next is undefined
<p>Next: {next?.text ?? 'nothing, all done'}</p>  // right: handle the "not found" case
```

## How interviewers test this

- **Quick-fire fundamentals.** Closures, `var`/`let`/`const`, `==` vs `===`, hoisting, `this`, the event loop, and `map` vs `forEach` come up in nearly every screening. A strong answer gives a one-sentence definition, a tiny example, and the React consequence (stale closures, mutated state, lost `this`).
- **Output prediction.** Expect a `setTimeout` in a loop, a Promise against a `setTimeout`, or a method that loses `this`. A strong candidate talks through the call stack, the microtask queue and the macrotask queue out loud, and does not guess.
- **Immutability.** They check whether you copy instead of mutate (spread, `map`, `filter`, `toSorted`) and whether you can explain why React needs a new reference, using `Object.is`.
- **Small coding tasks.** Utilities such as `groupBy`, `flatten`, deep clone, `debounce` and `Promise.all` test closures, `reduce`, recursion and Promises. See [Round 5: JavaScript coding](../05-interview-rounds/round-5-javascript-coding/README.md).
- **Async handling.** Good answers check `response.ok`, handle errors with `try`/`catch`, run independent calls with `Promise.all`, and clean up in effects.
- **Red flags.** Saying `const` makes a value immutable, that `setTimeout(fn, 0)` runs immediately, that `==` is fine, using `forEach(async ...)`, sorting or pushing into state directly, and using `JSON.parse(JSON.stringify(x))` as the answer to every copy question.

## Interview questions and model answers

### Q1. What is a closure? Give an example. (Medium)
A closure is a function together with the variables from the place where it was created. The function keeps access to those variables even after the outer function has finished.

```js
function makeCounter() {
  let count = 0
  return () => ++count
}
const next = makeCounter()
console.log(next(), next())   // 1 2
```

`count` lives on because the returned function still uses it, and nothing outside can touch it, so closures give you private state. In React, every render calls your component again, and the handlers made in that render close over that render's props and state. A timeout started in an old render still sees the old values (a **stale closure**). The fixes are a functional update such as `setCount((c) => c + 1)`, or a ref when you need the latest value. Expect a follow-up about `var` in a loop printing `3 3 3`.

### Q2. What is the difference between var, let and const? (Easy)
`var` is function-scoped, is hoisted and starts as `undefined`, and can be redeclared. `let` and `const` are block-scoped and sit in the temporal dead zone until their declaration line runs. `let` can be reassigned; `const` cannot, but the contents of a `const` object can still change. Use `const` by default, `let` when you must reassign, and never `var`. The classic proof:

```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i))   // 3 3 3  one shared i
for (let j = 0; j < 3; j++) setTimeout(() => console.log(j))   // 0 1 2  a new j per loop pass
```

### Q3. What is the difference between == and ===? (Easy)
`===` compares type and value with no conversion. `==` converts the types first by a long list of rules, which gives surprises such as `0 == ''` (true), `null == undefined` (true) and `[] == false` (true). Always use `===`; the one common exception is `x == null` to catch both `null` and `undefined`. `Object.is` is like `===` except that `NaN` equals `NaN` and `+0` differs from `-0`; React uses `Object.is` for state, dependency arrays and props comparison. Objects and arrays are compared by reference, so `[] === []` is `false`.

### Q4. Explain the event loop. In what order do synchronous code, promises and setTimeout run? (Hard)
JavaScript runs on one thread with one call stack. Timers, network and user events are handled by the browser, and their callbacks wait in queues. When the stack is empty, the loop first runs **all microtasks** (Promise `.then`, `await` continuations, `queueMicrotask`), then the browser may repaint, then the loop takes **one macrotask** (`setTimeout`, `setInterval`, a click) and repeats. So the order is: synchronous code, then microtasks, then macrotasks.

```js
console.log('A')
setTimeout(() => console.log('B'), 0)
Promise.resolve().then(() => console.log('C'))
console.log('D')
// A D C B
```

`setTimeout(fn, 0)` means "as soon as the stack and microtasks are clear", not "now". In React, a long synchronous task blocks painting and clicks, and state updates in a handler are batched and applied after the handler returns.

### Q5. What is hoisting? What is the temporal dead zone? (Medium)
Hoisting means declarations are registered before the code in their scope runs. A `var` is hoisted and starts as `undefined`. A function declaration is hoisted with its whole body, so you can call it before its line. `let` and `const` are hoisted too, but cannot be read until their line has run; the gap is the temporal dead zone, and reading in it throws `ReferenceError: Cannot access 'x' before initialization`. A function expression or arrow function follows the rule of the variable that holds it: with `var` you get `TypeError: x is not a function`, with `const` you get the `ReferenceError`.

### Q6. What is `this` in JavaScript? How do arrow functions differ? (Medium)
`this` is set by **how a function is called**. `obj.fn()` makes `this` the `obj`. A plain call `fn()` gives `undefined` in modules and classes. `new Fn()` makes `this` the new object. `call`, `apply` and `bind` set it explicitly. An arrow function has no `this` of its own, it uses the `this` of the surrounding code, so it cannot be re-bound and is the usual fix for callbacks that lose `this`.

```js
const user = { name: 'Asha', sayName() { return this.name } }
const detached = user.sayName
// detached()  -> TypeError, `this` is undefined
user.sayName.bind(user)()   // 'Asha'
```

In React, function components barely use `this`. It matters for legacy class components: `onClick={this.handleClick}` loses `this` unless the method is bound or defined as an arrow function class field.

### Q7. What is the difference between Promises and async/await? (Medium)
They are the same thing. `async`/`await` is syntax built on top of Promises. A Promise is an object for a future value, with the states pending, fulfilled and rejected, handled with `.then`, `.catch` and `.finally`. An `async` function always returns a Promise, and `await` pauses that function (not the program) until the Promise settles, throwing if it rejects, so you use `try`/`catch`. `async`/`await` reads like normal code, which makes sequences and error handling easier. Watch out for: awaiting in a loop runs calls one after another (use `Promise.all` for independent calls), `forEach(async ...)` does not wait, and `fetch` does not reject on a 404 or 500, so check `response.ok`. `Promise.all` rejects on the first failure, `allSettled` never rejects, `race` takes the first to settle, and `any` takes the first to fulfil.

### Q8. What is the difference between a shallow and a deep copy? How do you deep clone an object? (Hard)
A shallow copy (`{ ...obj }`, `[...arr]`, `Object.assign`) copies the top level only; nested objects are still shared with the original. A deep copy copies every level. Use `structuredClone(obj)`: it handles nested objects, arrays, `Date`, `Map`, `Set` and even circular references, but it throws for functions and drops class prototypes. `JSON.parse(JSON.stringify(obj))` is the old trick, with real downsides: it loses `undefined` and functions, turns `NaN` into `null`, turns a `Date` into a string, and throws on circular structures. In React you rarely need a deep clone: you copy only the objects along the path you change. Writing your own `deepClone` is a common coding question (see the exercise [05 - deep clone](../practice-app/exercises/js/05-deep-clone/README.md)).

### Q9. What is the difference between map and forEach? (Easy)
`map` returns a **new array** made of the callback's return values, with the same length as the original. `forEach` returns `undefined`; it only runs a function for each item, for side effects. In React you use `map` to turn data into JSX, because the JSX has to be a value. `map` can be chained (`.filter().map()`), `forEach` cannot. Neither can be stopped early with `break` (use `for...of`, `some`, `every` or `find`), and `forEach` ignores any Promise its callback returns, so it does not wait for async work.

### Q10. Why should you not mutate state in React? Which array methods mutate? (Medium)
React decides whether to re-render by comparing the old and new value with `Object.is`. If you change an array or object in place and pass the same reference to the setter, React sees "no change" and skips the update, so the screen goes stale. It also breaks `React.memo`, `useMemo` and dependency arrays, which rely on a new reference meaning "new data". The mutating array methods are `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse` and `fill`. Use `[...arr, x]`, `filter`, `map` with spread, `toSpliced`, `toSorted`, `toReversed` and `with` instead, and `{ ...obj, key: value }` for objects.

### Q11. What is the difference between ||, ?? and &&? What is optional chaining? (Easy)
`a || b` returns `b` when `a` is any falsy value (`0`, `''`, `false`, `null`, `undefined`, `NaN`). `a ?? b` returns `b` only when `a` is `null` or `undefined`, so `0` and `''` survive. `a && b` returns `a` if it is falsy, otherwise `b`. In JSX, `{count && <X />}` shows `0` when `count` is `0`, so write `{count > 0 && <X />}`. Optional chaining `user?.address?.city` returns `undefined` instead of throwing when something on the way is `null` or `undefined`; it also works for calls (`fn?.()`) and indexes (`list?.[0]`).

### Q12. What is the difference between the spread and rest operators? (Easy)
Both use `...`. **Spread** unpacks: `[...a, ...b]`, `{ ...obj, key: 1 }`, `fn(...args)`. **Rest** gathers: `function f(...args)`, `const [first, ...others] = list`, `const { id, ...rest } = props`. You use spread to copy and merge arrays and objects without mutating them, and to pass props along (`<Button {...props} />`). Spread is shallow, and for objects the later key wins: `{ ...defaults, ...overrides }`.

### Q13. Explain event bubbling and capturing. What do preventDefault and stopPropagation do? (Medium)
An event travels from the top of the document down to the clicked element (capture phase), fires on the element (target), then travels back up (bubble phase). Listeners run in the bubble phase by default, and `{ capture: true }` (or `onClickCapture` in React) listens on the way down. `stopPropagation()` stops the event travelling further. `preventDefault()` cancels the browser's default action, such as following a link or submitting a form, but does not stop propagation. **Event delegation** puts one listener on a parent and uses `event.target.closest(...)` to find the item, which also covers items added later.

### Q14. What is the difference between default and named exports? What is a barrel file? (Easy)
A module can have many **named** exports (`export const x`), imported with braces and the same name (`import { x }`, or `import { x as y }`). It can have one **default** export (`export default`), imported without braces under any name. Named exports are easier to refactor and auto-import, and `React.lazy` needs a default export. A **barrel file** is an `index.js` that re-exports other files so imports are short. It is handy for small folders, but it hides where code lives, can cause circular imports, and can slow the bundler in a big folder.

### Q15. What is the difference between localStorage, sessionStorage and cookies? (Easy)
`localStorage` keeps strings until they are cleared and is shared by all tabs of an origin. `sessionStorage` is the same API but lives only as long as one tab. Both hold a few megabytes, are synchronous, and are never sent to the server by themselves. Cookies are small (about 4 KB), are sent to the server with every request to that site, and can be marked `HttpOnly` (hidden from JavaScript), `Secure` and `SameSite`. Use web storage for client-only preferences and drafts. Use cookies when the server needs the value, for example a session id. Do not store secrets in web storage, because any script on the page can read it.

## Common mistakes and gotchas

- **`{count && <X />}` renders `0`.** Compare to get a real boolean: `{count > 0 && <X />}`, or use a ternary.
- **Mutating state** (`push`, `splice`, `sort`, `obj.x = 1`, then `setState(sameThing)`). Build a new value: spread, `filter`, `map`, `toSorted`.
- **`onClick={handle()}`.** This calls the function during render. Write `onClick={handle}` or `onClick={() => handle(id)}`.
- **`||` for defaults when `0` or `''` is valid.** Use `??`.
- **Using `==`.** Use `===` and `!==` everywhere.
- **Forgetting `response.ok` after `fetch`.** A 404 or 500 does not reject. Check `ok` and throw.
- **`forEach(async ...)`.** It does not wait. Use `await Promise.all(items.map(...))` or a `for...of` loop with `await`.
- **`sort()` without a comparator on numbers.** The default order is text order (`[10, 9, 1]` becomes `[1, 10, 9]`). Pass `(a, b) => a - b`, and use `toSorted` on shared data.
- **`['1', '2'].map(parseInt)`.** The index becomes the radix. Use `.map(Number)`.
- **`JSON.parse(JSON.stringify(x))` as a universal deep copy.** Use `structuredClone`, and know its limits.
- **An arrow function that returns an object literal without parentheses.** Write `() => ({ a: 1 })`.
- **`var` inside loops with callbacks.** Use `let` or `const`.
- **Destructuring a value that may be `undefined`.** Give it a default: `({ user } = {})`.
- **Reading `localStorage` JSON without a try/catch or a fallback.** Use a safe reader.
- **Rendering a `Date` or a plain object as a child.** Format it to a string first.
- **Making the `useEffect` callback `async`.** Define an async function inside and call it.
- **Date-only strings and time zones.** `new Date('2026-11-10')` is UTC midnight. Add a time, or format with an explicit `timeZone`.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard. Run the code in the browser console, in Node (`node file.mjs`) or in the [practice app](../practice-app/README.md).

1. **(Easy)** Predict the output (do not run it yet):
   ```js
   console.log(0 || 'a', 0 ?? 'a', '' && 'b', null?.x, [] ? 'yes' : 'no')
   ```
   <details>
   <summary>Show answer</summary>

   It prints `a 0  undefined yes` (there are two spaces after the `0`, because the third value is an empty string).
   - `0 || 'a'`: `0` is falsy, so `||` returns the right side, `'a'`.
   - `0 ?? 'a'`: `0` is not `null` or `undefined`, so `??` keeps `0`.
   - `'' && 'b'`: `''` is falsy, so `&&` stops and returns `''` (an empty string).
   - `null?.x`: optional chaining on `null` gives `undefined`.
   - `[] ? 'yes' : 'no'`: an empty array is truthy, so `'yes'`.

   </details>

2. **(Easy)** Predict: `console.log(typeof null, [] == false, NaN === NaN, Object.is(NaN, NaN), 0.1 + 0.2 === 0.3)`
   <details>
   <summary>Show answer</summary>

   It prints `object true false true false`.
   - `typeof null` is `'object'`, an old mistake in the language that cannot be fixed now.
   - `[] == false`: `==` converts the array to the empty string `''`, then to `0`, and `false` to `0`, so `true`. This is why you use `===`.
   - `NaN === NaN` is `false`: `NaN` is never equal to anything, even itself. `Object.is(NaN, NaN)` is `true`.
   - `0.1 + 0.2` is `0.30000000000000004` because of binary floating point, so the comparison is `false`.

   </details>

3. **(Easy)** Write three pure functions that never mutate their input: `addTodo(todos, text)` (gives the new item the next free `id`, with `done: false`), `removeTodo(todos, id)` and `toggleTodo(todos, id)`. Todos look like `{ id, text, done }`.
   <details>
   <summary>Show answer</summary>

   ```js
   const addTodo = (todos, text) => [
     ...todos,
     { id: Math.max(0, ...todos.map((t) => t.id)) + 1, text, done: false },
   ]
   const removeTodo = (todos, id) => todos.filter((t) => t.id !== id)
   const toggleTodo = (todos, id) =>
     todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t))

   const t0 = [{ id: 1, text: 'a', done: false }]
   const t1 = addTodo(t0, 'b')        // [{ id: 1, ... }, { id: 2, text: 'b', done: false }]
   const t2 = toggleTodo(t1, 1)       // item 1 is now done: true
   const t3 = removeTodo(t2, 2)       // only item 1 is left
   console.log(t0.length, t1.length, t3.length)   // 1 2 1  the original t0 was never changed
   console.log(t2[1] === t1[1])                   // true  the untouched item is shared, not copied
   ```

   Each function returns a new array. Only the changed item gets a new object, which is exactly the shape React state updates need.

   </details>

4. **(Medium)** This component has a **Sort** button, but clicking it does nothing visible. Why? How do you fix it?
   ```jsx
   function Names() {
     const [names, setNames] = useState(['Zed', 'Amy', 'Bob'])
     return (
       <>
         <button onClick={() => setNames(names.sort())}>Sort</button>
         <ul>{names.map((n) => <li key={n}>{n}</li>)}</ul>
       </>
     )
   }
   ```
   <details>
   <summary>Show answer</summary>

   `names.sort()` sorts the existing array **in place** and returns that same array. `setNames` is given the same reference that React already has, `Object.is` says "no change", and React skips the render. We ran it: after the click the list still reads Zed, Amy, Bob. Hand React a new array instead:

   ```jsx
   <button onClick={() => setNames(names.toSorted())}>Sort</button>
   ```

   We ran this too: the list became Amy, Bob, Zed. `setNames([...names].sort())` works as well and also runs in older browsers.

   </details>

5. **(Medium)** Given `const user = { name: 'Asha', address: { city: 'Pune', zip: '411001' } }`, write `updateCity(user, city)` that returns a new user with the new city, without changing `user`.
   <details>
   <summary>Show answer</summary>

   ```js
   const updateCity = (u, city) => ({ ...u, address: { ...u.address, city } })

   const moved = updateCity(user, 'Delhi')
   console.log(moved)   // { name: 'Asha', address: { city: 'Delhi', zip: '411001' } }
   console.log(user.address.city)                   // Pune  unchanged
   console.log(moved === user)                       // false
   console.log(moved.address === user.address)       // false  the changed path is new
   ```

   You copy the outer object and the `address` object, because both are on the path to the change. Everything else (here `name` and `zip`) is just reused. A single `{ ...u, city }` would be wrong: it would add a new top-level `city` key and leave `address` alone.

   </details>

6. **(Medium)** Predict the output, then fix it in two different ways so it prints `0 1 2`:
   ```js
   for (var i = 0; i < 3; i++) {
     setTimeout(() => console.log(i), i * 10)
   }
   ```
   <details>
   <summary>Show answer</summary>

   It prints `3 3 3`. There is one `i` for the whole loop, shared by all three callbacks. The timers fire after the loop has ended, when `i` is `3`.

   Fix 1: use `let`, which gives each pass its own `i`: `for (let i = 0; i < 3; i++) {...}`.

   Fix 2: pass the value in as an argument, which copies it at the right moment: `setTimeout((n) => console.log(n), i * 10, i)`. (An immediately-invoked function that captures `i` also works.) We ran all three versions and each printed `0 1 2`.

   </details>

7. **(Medium)** Write `makeCounter(start = 0, step = 1)` that returns an object with `increment()`, `decrement()`, `reset()` and a `value` getter. The current number must not be reachable from outside except through those.
   <details>
   <summary>Show answer</summary>

   ```js
   function makeCounter(start = 0, step = 1) {
     let value = start
     return {
       increment() { value += step; return value },
       decrement() { value -= step; return value },
       reset() { value = start; return value },
       get value() { return value },
     }
   }

   const c = makeCounter(10, 5)
   c.increment(); c.increment(); c.decrement()
   console.log(c.value)   // 15
   c.reset()
   console.log(c.value)   // 10
   ```

   The variable `value` is private: every method closes over it, and nothing else can reach it. When you want more closure practice, try the exercises [08 - once](../practice-app/exercises/js/08-once/README.md), [03 - memoize](../practice-app/exercises/js/03-memoize/README.md) and [01 - debounce](../practice-app/exercises/js/01-debounce/README.md).

   </details>

8. **(Medium)** Predict the exact output order:
   ```js
   console.log('A')
   setTimeout(() => console.log('B'), 0)
   Promise.resolve().then(() => console.log('C'))
   ;(async () => {
     console.log('D')
     await null
     console.log('E')
   })()
   console.log('F')
   ```
   <details>
   <summary>Show answer</summary>

   `A D F C E B`.
   1. `A` prints. The timer is handed to the browser. The `.then` callback `C` is queued as a microtask.
   2. The async function starts and runs synchronously up to its first `await`, so `D` prints. The rest of the function (`E`) is queued as a microtask, after `C`.
   3. `F` prints. The synchronous code is done.
   4. The microtask queue runs in order: `C`, then `E`.
   5. Only then does the timer's macrotask run: `B`.

   </details>

9. **(Medium)** Write `groupBy(array, keyFn)` using `reduce`. It should return an object whose keys are the results of `keyFn` and whose values are arrays of the matching items. Then compare it with `Object.groupBy`.
   <details>
   <summary>Show answer</summary>

   ```js
   const groupBy = (arr, keyFn) =>
     arr.reduce((acc, item) => {
       const key = keyFn(item)
       ;(acc[key] ??= []).push(item)
       return acc
     }, {})

   const people = [{ n: 'A', t: 'dev' }, { n: 'B', t: 'qa' }, { n: 'C', t: 'dev' }]
   console.log(groupBy(people, (p) => p.t))
   // { dev: [ { n: 'A', t: 'dev' }, { n: 'C', t: 'dev' } ], qa: [ { n: 'B', t: 'qa' } ] }
   ```

   `acc[key] ??= []` creates the array the first time a key is seen (the `??=` operator assigns only when the left side is `null` or `undefined`). Mutating `acc` is fine here because `acc` is a brand-new object created inside this function. The result has the same content as `Object.groupBy(people, (p) => p.t)`, except that `Object.groupBy` returns an object without a prototype. The purely functional version builds a new object each step: `({ ...acc, [key]: [...(acc[key] ?? []), item] })`. It is correct but slower for big arrays. Compare with the exercise [18 - array utils](../practice-app/exercises/js/18-array-utils-groupby-chunk/README.md).

   </details>

10. **(Medium)** Write `fetchJson(url, options)` that returns the parsed JSON, and throws an `Error` with the message `HTTP <status>` when the response is not OK. Then show how you would call it safely.
    <details>
    <summary>Show answer</summary>

    ```js
    async function fetchJson(url, options) {
      const response = await fetch(url, options)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    }

    try {
      const data = await fetchJson('/api/users')
      console.log(data)
    } catch (error) {
      console.log('Could not load users:', error.message)   // e.g. HTTP 500, or "Failed to fetch"
    }
    ```

    We checked it against a local server: a 200 returned the parsed body, and a 500 threw `HTTP 500`. Without the `response.ok` line, a 500 would not throw, and `response.json()` would try to parse an error page. A network failure rejects `fetch` itself, so the same `catch` handles both cases.

    </details>

11. **(Hard)** Run this file as an ES module (for example `example.mjs`). What does it print, and why?
    ```js
    const user = { name: 'Asha', regular() { return this.name }, arrow: () => this?.name }
    const { regular } = user
    console.log(user.regular(), user.arrow())
    try { regular() } catch (e) { console.log(e.constructor.name) }
    ```
    <details>
    <summary>Show answer</summary>

    It prints `Asha undefined`, then `TypeError`.
    - `user.regular()` is a method call, so `this` is `user` and the result is `Asha`.
    - `user.arrow()` is an arrow function written at the top level of the module. It has no `this` of its own and uses the module's `this`, which is `undefined` in an ES module. `this?.name` therefore gives `undefined`. It does not use `user`, even though it is called as `user.arrow()`.
    - `const { regular } = user` detaches the method. `regular()` is a plain call, `this` is `undefined`, and `this.name` throws a `TypeError`.

    </details>

12. **(Hard)** Why does this print `0`, and how do you change `run` so that it returns all three results?
    ```js
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))

    async function run() {
      const results = []
      ;[1, 2, 3].forEach(async (n) => {
        await wait(10)
        results.push(n)
      })
      console.log(results.length)   // prints 0
      return results
    }
    ```
    <details>
    <summary>Show answer</summary>

    `forEach` calls the async callback for each item, and each call returns a Promise at its first `await`. `forEach` ignores those Promises and returns immediately, so the code after it runs before any `push` has happened. The function even returns `results` while it is still empty. Make the work awaitable:

    ```js
    async function run() {
      const results = []
      await Promise.all(
        [1, 2, 3].map(async (n) => {
          await wait(10)
          results.push(n)
        }),
      )
      return results            // [ 1, 2, 3 ]
    }
    ```

    `map` returns the array of Promises and `Promise.all` waits for all of them, running the waits in parallel. If order of completion matters, return the value from the callback instead of pushing: `const results = await Promise.all([3, 1, 2].map(async (n) => { await wait(n * 5); return n * 10 }))` gives `[30, 10, 20]`, in input order. Use `for (const n of [1, 2, 3]) { await ... }` if the steps must run one after another.

    </details>

## Recap
- Use `const` by default, `let` when you must reassign, never `var`; know hoisting and the temporal dead zone.
- Destructuring, spread and rest are how you read props, copy state and pass things along; later keys in a spread win.
- `map`, `filter`, `find`, `reduce` and `toSorted` build new data; `push`, `splice`, `sort` and `reverse` mutate, so never use them on state.
- Objects are compared and copied by reference; spread is shallow, `structuredClone` is deep; React sees a change only when the reference changes (`Object.is`).
- A closure remembers the variables around it; in React every render has its own snapshot, so old callbacks see old values.
- `this` depends on the call, arrow functions have none of their own, and the event loop runs sync code, then all microtasks, then one macrotask.
- Promises and `async`/`await` are the same thing; `fetch` does not reject on 404, so check `response.ok`; use `Promise.all` for parallel work and never `forEach(async ...)`.
- `&&`, `||` and `??` return one of their sides (`{0 && <X />}` shows `0`); use `===`, `?.` and `??`; format `Date` values before rendering.

## Where to go next
- Next lesson: [What is React?](02-what-is-react.md), then [JSX](03-jsx.md) and [Components and props](04-components-and-props.md).
- Want the deeper interview version of closures, `this`, prototypes, coercion and the event loop? Read [JavaScript deep dive for interviews](10-javascript-deep-dive-for-interviews.md).
- See immutable updates in action: [State and events](05-state-and-events.md) and [useState in depth](../02-hooks/02-usestate-in-depth.md).
- Practice in the app. All 24 JavaScript exercises live in `practice-app/exercises/js/` (see the [practice app guide](../practice-app/README.md) for how to run them). The best matches for this lesson, by topic:
  - Closures and `this`: [01 - debounce](../practice-app/exercises/js/01-debounce/README.md), [03 - memoize](../practice-app/exercises/js/03-memoize/README.md), [04 - curry](../practice-app/exercises/js/04-curry/README.md), [08 - once](../practice-app/exercises/js/08-once/README.md), [16 - function polyfills](../practice-app/exercises/js/16-function-polyfills/README.md).
  - Arrays, objects and copies: [05 - deep clone](../practice-app/exercises/js/05-deep-clone/README.md), [06 - flatten array](../practice-app/exercises/js/06-flatten-array/README.md), [09 - deep equal](../practice-app/exercises/js/09-deep-equal/README.md), [17 - array polyfills](../practice-app/exercises/js/17-array-polyfills/README.md), [18 - array utils](../practice-app/exercises/js/18-array-utils-groupby-chunk/README.md).
  - Promises and async: [11 - promise combinators](../practice-app/exercises/js/11-promise-combinators/README.md), [12 - retry with timeout](../practice-app/exercises/js/12-retry-with-timeout/README.md), [15 - promise pool](../practice-app/exercises/js/15-promise-pool/README.md).
  - The DOM: [24 - DOM traversal](../practice-app/exercises/js/24-dom-traversal/README.md).
- Interview practice: [Round 5: JavaScript coding](../05-interview-rounds/round-5-javascript-coding/README.md) and [Round 3: output and debugging](../05-interview-rounds/round-3-output-and-debugging/README.md).
- Last-day revision: Gotchas and common mistakes (planned).
