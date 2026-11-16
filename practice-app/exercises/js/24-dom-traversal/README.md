# 24 - DOM traversal and a tiny hyperscript builder

**Level:** Medium | **Time:** 40 minutes | **Topics:** the DOM tree, depth-first traversal, recursion, `childNodes` vs `children`, `createElement`, event listeners

## The task

The page you see in a browser is a tree of objects called the DOM (Document Object Model). Every tag is an element node, every piece of text is a text node. Many interview questions are really "walk this tree and do something", and React itself is a machine that builds and compares trees.

Write six small functions that work on real DOM nodes:

- `walk(node, visit)`: visit every node below a starting node, depth first.
- `getDepth(node)`: how deep a node sits in the tree.
- `getElementsByClassName(root, classNames)`: your own version of the built-in search.
- `findByText(root, text)`: the first element that holds a given text.
- `getDomPath(el)`: a readable path like `html > body > div:nth-of-type(2) > span`.
- `h(tag, props, ...children)`: a tiny "hyperscript" builder that creates elements. It is a small cousin of `React.createElement`.

Work in [`index.js`](./index.js). Do not edit the test file.

The tests run in **jsdom**, a pretend browser that runs inside Node, so the global `document`, `Node` and `Element` exist. While the tests run, the built-in search methods `querySelector`, `querySelectorAll`, `getElementsByClassName` and `getElementsByTagName` are switched off: calling one of them from your code throws an error. You must write the traversal yourself.

A good order is the order below. Later functions can reuse `walk`.

## Requirements

### 1. `walk(node, visit)`

1. Call `visit(node, depth)` for the starting node and for every node below it. The visit order is depth first: a parent comes BEFORE its children, and children come in document order. The starting node has depth `0`, its children `1`, and so on.
2. Follow `node.childNodes`, so text nodes and comment nodes are visited too (`node.children` would give elements only).
3. If `visit` returns exactly `false`, skip the children of that node. Its siblings are still visited. Any other return value (`undefined`, `null`, `0`, `""`, `true`) does NOT skip anything. If `visit` returns `false` for the starting node, only that one node is visited.
4. Throw a `TypeError` if `node` is not a DOM node (`instanceof Node`) or if `visit` is not a function. In that case `visit` is never called.

### 2. `getDepth(node)`

5. Return the number of ancestor ELEMENTS of the node. `<html>` is `0`, `<body>` is `1`, a `<div>` directly inside `<body>` is `2`. A text node is one deeper than the element that holds it.
6. A node with no parent element has depth `0`: a detached element (made with `document.createElement`, not yet added to the page) and the `document` itself. The depth always reflects the current tree, so moving a node changes its depth.
7. Throw a `TypeError` if the value is not a DOM node.

### 3. `getElementsByClassName(root, classNames)`

8. Return a new plain array with every element that has ALL the given class names, in document order (parents before their children).
9. `classNames` is a string of class names separated by any whitespace (`"card featured"`). Extra spaces, tabs and new lines are ignored, the order does not matter, and repeating a name is fine.
10. Unlike the built-in method, the `root` itself is included when it matches. Elements outside `root` are never included. `root` may also be the `document`.
11. Class names are compared as whole names and are case sensitive: `"card"` does not match an element with the class `"cardboard"`, and `"Card"` is not `"card"`.
12. If `classNames` has no class names (empty or only spaces) or is not a string, return `[]`. If `root` is not a DOM node, throw a `TypeError`.

### 4. `findByText(root, text)`

13. Return the first element, in document order, whose OWN text equals `text`. The `root` itself can be returned. If nothing matches, return `null`.
14. The own text of an element is the text of its direct child text nodes joined together (not the text of its descendants, and not comments), then `trim()`med. For `<p>Hello <b>big</b>world</p>` the own text of the `<p>` is `"Hello world"` and the own text of the `<b>` is `"big"`. Because of this, a wrapper `<div>` around `<span>Save</span>` does not match `"Save"`, only the `<span>` does.
15. `text` is compared exactly as given: case sensitive, not trimmed, spaces inside are kept (`"a  b"` with two spaces is not `"a b"`). The whole text must match, not a part of it.
16. If `text` is an empty string (or not a string), return `null`. If `root` is not a DOM node, throw a `TypeError`. `root` may also be the `document`.

### 5. `getDomPath(el)`

17. Return the path from the top of the tree down to `el`: one step per element, joined with `" > "`.
18. A step is the lower case tag name (use `element.localName`). Add `:nth-of-type(n)` to a step ONLY when at least one sibling element has the same tag name. `n` starts at `1` and counts only siblings with that tag, in document order. Text nodes and comments are not siblings that count.
19. An element with no parent element (`<html>`, or the top of a detached tree) is just its tag name.
20. The result must be a valid CSS selector that selects exactly that element: `document.querySelector(getDomPath(el))` returns `el`. The tests check this for every element of a page.
21. Throw a `TypeError` if `el` is not an element (a text node, the `document`, `null`).

### 6. `h(tag, props, ...children)`

22. `tag` must be a non-empty string, otherwise throw a `TypeError`. Create the element with `document.createElement(tag)`. Do not add it to the page. Return it.
23. The second argument is always `props`. Use `null` (or `undefined`) when there are none. If the second argument is a string, number, array or DOM node, throw a `TypeError` (it is a sign that you forgot the `null`).
24. `className`: set the `class` attribute. An empty string, `false`, `null` or `undefined` adds no class attribute.
25. `style`: an object. Keys are camelCase CSS names (`backgroundColor`, `fontSize`) or custom properties that start with `--` (`"--gap"`). Values are strings. A value that is `null`, `undefined` or `false` is skipped.
26. Event handlers: a prop whose name is `on` followed by a capital letter (`onClick`, `onMouseDown`). The event name is the rest of the prop name in lower case (`click`, `mousedown`). Add the function with `addEventListener`, do not write it as an attribute. If the value is not a function (`undefined`, `null`, `false`), ignore the prop without an error. Names like `only` or `one` are not handlers: they are normal attributes.
27. Every other prop is an attribute: `setAttribute(name, String(value))`, so `"data-id": 7` gives `data-id="7"` and `tabindex: 0` gives `tabindex="0"`. The value `true` gives an empty attribute (`disabled=""`). The values `false`, `null` and `undefined` give no attribute at all.
28. Children are added in order:
    - strings and numbers become TEXT nodes (the number `0` is shown). A string is never parsed as HTML, so `"<b>x</b>"` stays visible text.
    - DOM nodes are added as they are.
    - arrays are flattened at any depth (so the result of `.map()` works).
    - `null`, `undefined`, `true` and `false` are skipped (so `cond && h("b")` works).

**Complexity target:** `walk`, `getElementsByClassName` and `findByText` visit each node at most once: O(n) time for n nodes, and O(height of the tree) extra space for the recursion (plus the result array). `getDepth` is O(depth). `getDomPath` is O(depth x number of siblings).

## Examples

For these examples the page is `<body><div id="app" class="card"><p class="note card">Hi <b>there</b></p></div></body>`, written without spaces between the tags, and `app` is the `<div>`.

```js
getElementsByClassName(app, "card")
// [ <div#app>, <p.note.card> ]   (the root counts when it matches)
// and getElementsByClassName(app, "note card") gives only [ <p.note.card> ]

walk(app, (node, depth) => console.log(depth, node.nodeName))
// 0 DIV
// 1 P
// 2 #text      ("Hi ")
// 2 B
// 3 #text      ("there")

findByText(app, "Hi")
// the <p>   (its own text "Hi " trimmed is "Hi")
// but findByText(app, "Hi there") is null: no element owns that whole text

getDomPath(boldElement)
// "html > body > div > p > b"   (no element on the way has a same-tag sibling)
// and getDepth(app) is 2 (the ancestors are html and body)

h("ul", { className: "list" }, h("li", null, "one"), [2, 3].map((n) => h("li", null, n)))
// <ul class="list"><li>one</li><li>2</li><li>3</li></ul>
```

Here `boldElement` stands for the `<b>` element of that page.

## Acceptance criteria (what the tests check)

- `walk` gives the right order and depths, honours only a real `false`, visits text and comment nodes, works from any node (including the `document`), visits each node of a bigger tree exactly once, and rejects wrong arguments with a `TypeError`.
- `getDepth` is `0` for `<html>`, counts ancestor elements, works for detached trees, text nodes and the `document`, and follows moves.
- `getElementsByClassName` needs all classes, ignores extra whitespace, includes a matching root, never looks outside the root, compares whole class names, and returns a fresh array.
- `findByText` uses own text only, trims it, returns the first match in document order, does not trim the search text, ignores comments, never leaves the root, and returns `null` for no match and for an empty search text.
- `getDomPath` adds `:nth-of-type` only when needed, counts only same-tag siblings, uses lower case, stops at the top of detached trees, and gives a selector that finds the element again.
- `h` sets class, style (including `--custom`), data and other attributes (`true`, `false`, `null`, `0`), adds real event listeners (that bubble), flattens children, skips empty children, keeps text as text, and throws a `TypeError` for a bad tag or bad props.
- The built-in search methods are never called.

## How to run

```bash
npm test -- exercises/js/24-dom-traversal
```

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/24-dom-traversal
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. For `walk`, write an inner function `step(current, depth)`. It calls `visit(current, depth)`, and unless the result is `false` it loops over `current.childNodes` and calls `step(child, depth + 1)`. A `NodeList` works with `for...of`.
2. Node kinds are numbers: `node.nodeType === Node.ELEMENT_NODE` (1) and `Node.TEXT_NODE` (3). Only element nodes have `classList`.
3. `getDepth` is a loop: start at `node.parentElement`, count, move to that element's `parentElement`, stop at `null`.
4. `getElementsByClassName` can use `walk`. For each element, `wanted.every((name) => element.classList.contains(name))`. Split the wanted names with `classNames.split(/\s+/)` and remove the empty pieces with `.filter(Boolean)`.
5. For `findByText`, first write `ownText(element)` that loops over `element.childNodes`, adds the `data` of text nodes, and trims. `walk` cannot stop early, so either remember the first match and ignore the rest (simple), or write a small recursive search that returns as soon as it has a match (faster).
6. For `getDomPath`, collect the steps while you go UP with `parentElement`, then `reverse()` the array. To find the siblings with the same tag: `Array.from(parent.children).filter((s) => s.localName === el.localName)`, then `indexOf(el) + 1`.
7. For `h`, split the work into small helpers: one to apply a single prop, one to append a single child (it calls itself for arrays). `document.createTextNode(String(child))` makes safe text. `child instanceof Node` tells nodes from text. `/^on[A-Z]/` matches handler names and `name.slice(2).toLowerCase()` gives the event name.
8. Styles: `element.style[name] = value` works for camelCase names, but custom properties need `element.style.setProperty(name, value)`.

</details>

## Stretch goals

- Make `walk` iterative with your own stack, so that a tree 10 000 levels deep does not overflow the call stack.
- Let `visit` stop the whole walk (for example by returning the string `"stop"`), then write `findByText` with `walk` and make it stop at the first match.
- Let `h` accept a function as the tag: `h(Card, { title: "x" }, "child")` calls `Card({ title: "x", children: ["child"] })` and returns what it returns. This is how React treats components.
- Add `#id` shortcuts to `getDomPath` (`#app > p`) when an element has an id that is unique in the document.
- Change `h` so it returns a plain object `{ type, props, children }` and write `render(vnode)` that turns that object into real DOM. Then write `patch(oldVnode, newVnode, domNode)` that updates only what changed. You have just written a tiny virtual DOM.

## Interview follow-ups to prepare for

**1. Virtual DOM vs real DOM trees.** Real DOM nodes are big browser objects: changing them can trigger style calculation, layout and paint. A virtual DOM is just a tree of plain JavaScript objects that describes what the screen should look like. Be ready to explain:
- Why React uses it: your component is a function of state, so after every state change React builds a NEW description tree, compares it with the old one (reconciliation, "diffing"), and applies only the differences to the real DOM.
- It is not "faster than the DOM". The honest answer: it makes declarative code fast enough, and it makes updates predictable. Hand-tuned direct DOM updates can be faster, and libraries such as Svelte and Solid avoid a virtual DOM on purpose.
- Why your `h` is not enough for a UI library: it builds real nodes immediately, so calling it again on every state change would throw away the whole subtree, including focus, scroll position and what the user typed. How would you change it? Return plain objects, compare old and new, reuse nodes of the same type, and use `key` to match list items.
- Typical rules of the diff: different type means replace the whole subtree; same type means update props and then compare children; list items are matched by `key`, not by position.

**2. How React builds elements (`createElement`).** JSX is not HTML and not a string. `<ul className="list"><li>one</li></ul>` is converted by the build tool into plain function calls. Be ready to explain:
- Old style: `React.createElement("ul", { className: "list" }, React.createElement("li", null, "one"))`. Since React 17 the compiler uses the "new JSX transform": it calls `jsx` and `jsxs` from `react/jsx-runtime`, so you no longer need to import React in every file.
- The result is a plain object, a "React element": it has a `type` (a string such as `"ul"`, or a component function), `props` (the children are inside `props.children`), a `key` and a special `$$typeof` marker. It describes UI, it is not the UI itself.
- Compare it with your `h`: the same shape `(type, props, ...children)`, the same rule that `null`, `undefined` and booleans render nothing, and the same rule that strings are text, never HTML (this is why React protects you from most XSS). The differences: React makes objects, not DOM nodes, and `type` can be a function.
- Why a component name must start with a capital letter: `<card />` means the DOM tag `"card"`, `<Card />` means the variable `Card`. That is exactly the difference between a string tag and a function tag in `h`.
- Question to practise: "What does `<Button onClick={save}>Save</Button>` compile to?" Answer: `jsx(Button, { onClick: save, children: "Save" })`.

**3. Event delegation.** Instead of adding a listener to each of 1000 list items, add ONE listener to their parent. Events bubble up from the clicked element through its ancestors, and the handler uses `event.target` to find out which item was hit. Be ready to explain:
- Benefits: fewer listeners (less memory), and it keeps working for items added later. Costs: events that do not bubble (`focus`, `blur`, `mouseenter`; use `focusin` and `focusout` instead) and handlers that call `stopPropagation()` can break it.
- `event.target` is the element that was really clicked (it may be an icon inside the button). `event.currentTarget` is the element that holds the listener. A common helper is `event.target.closest("li.item")`, then check that the result is inside the parent.
- The test "events bubble to a handler on the parent" in this exercise shows the mechanism with your own `h`.
- React does this for you: since React 17 it attaches its listeners once on the root container and finds the right handler by walking up its own component tree. Your `onClick` receives a wrapper called a synthetic event. Be ready for "what happens if you mix React handlers with native `addEventListener` and call `stopPropagation`?"
- Also know the three phases: capture (down from the window), target, bubble (back up). `addEventListener(type, fn, true)` listens in the capture phase.

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md)
- [What is React (the virtual DOM idea)](../../../../01-basics/02-what-is-react.md)
- [JSX (it compiles to function calls)](../../../../01-basics/03-jsx.md)
- [State and events (synthetic events)](../../../../01-basics/05-state-and-events.md)
- [How React renders (reconciliation and diffing)](../../../../04-advanced/01-how-react-renders.md)
- React internals deep dive (write a tiny React) (planned)
