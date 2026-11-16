# JSX

> **Level:** Beginner   **Time:** about 40 minutes   **Read first:** [JavaScript for React](01-javascript-for-react.md), [What is React?](02-what-is-react.md)

## What you will learn
- Explain what JSX is, and why it is not HTML and not a string.
- Write valid JSX: one root, closed tags, camelCase attributes, and JavaScript inside curly braces.
- Predict what React shows for strings, numbers, `null`, `undefined`, booleans and arrays, including the `0` pitfall.
- Use `className`, the `style` object, comments, spread props, Fragments, dotted component names and dynamic tags correctly.
- Describe what JSX compiles to, and what the element object returned by `jsx()` contains.
- Explain why React output is safe from XSS by default, and when `dangerouslySetInnerHTML` removes that safety.

**How to run the examples:** every example here is plain JSX that you can paste into a Vite React app (see [Set up your playground](../00-start-here/02-setup-your-playground.md)). The page output and the compiled code shown were produced by really running the examples (React 19.3.1, Vitest, Testing Library, and the Oxc transform that Vite 8 uses), so they are real, not guessed.

## 1. What JSX is, in plain words

A React component describes a piece of the screen. "Describe" means you write down what you want to see: a heading, a paragraph, a button. JSX is the notation you use to write that description. It lets you put markup that looks like HTML directly inside JavaScript.

```jsx
function Welcome() {
  const name = 'Ana'
  return <h1 className="title">Hello, {name}</h1>
}
```

The key facts, most important first:

- **JSX stands for JavaScript XML.** It is a *syntax extension* to JavaScript. That means extra grammar that plain JavaScript does not have, so a tool must translate it before it can run (section 2).
- **It is not HTML.** It only looks like HTML. It has its own rules, and the next sections list them.
- **It is not a string.** `<h1>Hi</h1>` has no quotes around it. It is a JavaScript expression that produces an object (section 16).
- **It is not a template language.** There are no special `if` or `for` tags to learn. You use JavaScript itself for logic.
- **It is optional.** React works without it. Almost nobody skips it, because the alternative is long and hard to read.

Why mix markup and JavaScript at all? What a button looks like and what happens when you click it change together. Keeping both in one component is easier to maintain than splitting them across an HTML file and a JavaScript file.

**What happens, step by step:**
1. React calls `Welcome()`.
2. The function sets `name` to `'Ana'`.
3. The JSX is evaluated. `{name}` is replaced by its value.
4. The function returns a description: "an `h1` with the class `title` and the text `Hello, Ana`".
5. React DOM turns that description into a real `<h1 class="title">Hello, Ana</h1>` in the page.

**Common mistake:** writing markup inside a string.

```jsx
// Wrong: quotes make it text, so the tags are shown on the screen
function Title() {
  return <p>{'<h1>Hello</h1>'}</p>
}

// Right: this is JSX
function Title() {
  return <h1>Hello</h1>
}
```

The wrong version puts the characters `<h1>Hello</h1>` on the page as text (the page source is `<p>&lt;h1&gt;Hello&lt;/h1&gt;</p>`). Anything in quotes is a string, never markup.

## 2. A first look under the hood: JSX is a function call

Browsers do not understand JSX. Before your code runs, a build tool rewrites every piece of JSX into an ordinary JavaScript function call (section 15 names the tools). Seeing this once makes every rule in this lesson feel logical instead of random.

You write:

```jsx
<h1 className="title">Hello, {name}</h1>
```

The tool produces (shortened):

```js
_jsxs("h1", { className: "title", children: ["Hello, ", name] })
```

The mapping is always the same:
- The tag name becomes the first argument (`"h1"`).
- The attributes become keys of an object. That object is called the **props** (short for properties).
- Whatever sits between the opening and closing tag becomes a `children` entry in that object.

`_jsxs` and its sibling `_jsx` are functions that React provides. They return a plain JavaScript object that describes the element. Section 16 opens that object and shows what is inside.

Three facts about this call explain most of the rules that follow:

| Fact about the call | Rule it explains |
|---|---|
| A function call returns one value | A component returns one root element (section 3) |
| The arguments of a call are expressions | Only expressions fit inside `{ }` (section 5) |
| The first argument is a string for `h1` but a variable for `Greeting` | Components start with a capital letter (section 11) |

**What happens, step by step:**
1. You save `Welcome.jsx`.
2. The build tool (in a Vite app it runs inside the dev server and in the production build) reads the file and finds each JSX tag.
3. It replaces each tag with a `jsx` call, like the one above.
4. The browser receives plain JavaScript. There is no `<h1>` syntax left in it.

**Common mistake:** expecting JSX to run without a build step.

```html
<!-- Wrong: a browser cannot run the JSX inside App.jsx -->
<script type="module" src="/App.jsx"></script>
```

Without a build tool the browser either rejects the file or stops at the first `<` with a syntax error (typically `Unexpected token '<'`). Fix: work inside a project that has a build tool, such as a Vite app.

## 3. Rule 1: return one root element (and Fragments)

From section 2, a JSX tag is a function call, and a function can return only one value. So a component must return one element.

```jsx
// Wrong: two elements side by side
function Intro() {
  return (
    <h1>React</h1>
    <p>A library for building user interfaces.</p>
  )
}
```

The compiler stops with the message "Adjacent JSX elements must be wrapped in an enclosing tag."

You can wrap the two elements in a `<div>`. That works, but the `<div>` ends up in the page. Extra elements can break CSS layouts (a flex or grid container only styles its direct children) and can create invalid HTML (a `<div>` is not allowed directly inside a `<tr>`). A **Fragment** groups elements and adds nothing to the page:

```jsx
function Intro() {
  return (
    <>
      <h1>React</h1>
      <p>A library for building user interfaces.</p>
    </>
  )
}
```

The page receives `<h1>React</h1><p>A library for building user interfaces.</p>` with no wrapper around them.

`<>...</>` is the short form. It has no place for attributes. When you need a `key` (you do inside `.map()`, see the [lists lesson](06-conditional-rendering-and-lists.md)), write the long form `<Fragment>`, which you import from React:

```jsx
import { Fragment } from 'react'

function Glossary({ items }) {
  return (
    <dl>
      {items.map((item) => (
        <Fragment key={item.id}>
          <dt>{item.term}</dt>
          <dd>{item.meaning}</dd>
        </Fragment>
      ))}
    </dl>
  )
}
```

With two items the page gets `<dl><dt>JSX</dt><dd>markup in JS</dd><dt>Props</dt><dd>inputs</dd></dl>`. Since React 19.3 the long form can also take a `ref` (rare, see [React 19 and newer](../04-advanced/04-react-19-and-newer.md)).

Why do multi-line returns use parentheses? JavaScript has a rule that a `return` followed directly by a new line returns `undefined`. The `(` on the same line as `return` prevents that.

**What happens, step by step:**
1. The compiler sees `<>...</>` and writes a call like `_jsxs(_Fragment, { children: [h1 call, p call] })`.
2. `Fragment` is a special value from React, not an HTML tag.
3. React shows the children, and creates no element for the Fragment itself.

**Common mistake:** a new line right after `return`.

```jsx
// Wrong: returns undefined, so the component shows nothing
function Hello() {
  return
    <h1>Hi</h1>
}

// Right: the opening parenthesis is on the same line as return
function Hello() {
  return (
    <h1>Hi</h1>
  )
}
```

Also watch for the short form inside `.map()`: `<>` cannot hold a `key`, so React logs the warning `Each child in a list should have a unique "key" prop`. Use `<Fragment key={...}>`.

## 4. Rules 2 and 3: close every tag, write attributes in camelCase

**Close every tag.** HTML forgives `<br>`, `<img src="a.png">`, `<input>` and a missing `</li>`. JSX does not. Every tag must be closed. An element with nothing inside is written as a **self-closing tag**: `<br />`, `<img ... />`, `<input ... />`. The same works for components (`<Avatar />`) and for any element (`<div />`). An unclosed tag stops the compiler with an error such as "Expected corresponding JSX closing tag".

**Attributes use camelCase.** Attributes become keys of the props object (section 2), so they follow JavaScript naming: the first word is lowercase and the next words start with a capital letter. `class` becomes `className`, `for` becomes `htmlFor`, `tabindex` becomes `tabIndex`, `onclick` becomes `onClick`. Two families keep their hyphens: `aria-*` and `data-*`.

```jsx
function EmailField() {
  return (
    <div>
      <label htmlFor="email" className="label">Email</label>
      <input id="email" tabIndex={0} readOnly maxLength={30} defaultValue="a@b.c" />
      <br />
      <img src="/logo.png" alt="Logo" />
    </div>
  )
}
```

The browser receives normal HTML: `<label for="email" class="label">`, `<input id="email" tabindex="0" readonly="" maxlength="30" value="a@b.c">`, `<br>` and `<img>`. The full list of renamed attributes is in the table in section 14. (`defaultValue` sets the starting value of an input; the [forms lesson](07-forms.md) explains it.)

Why `className` and not `class`? Two reasons that go together: `class` and `for` are reserved words in JavaScript, and the DOM itself names these properties `element.className` and `label.htmlFor`. React follows the DOM names.

**What happens, step by step:**
1. The compiler turns the attributes into a props object, for example `{ htmlFor: "email", className: "label" }`.
2. `<br />` becomes a call with an empty props object: `_jsx("br", {})`.
3. React DOM reads each prop and sets the matching real attribute (`htmlFor` becomes `for`, `tabIndex` becomes `tabindex`).

**Common mistake:** HTML spelling.

```jsx
// Wrong
<label class="label" for="email">Email</label>

// Right
<label className="label" htmlFor="email">Email</label>
```

In React 19.3.1 the wrong spelling still reaches the page, but the console logs a warning that starts with `Invalid DOM property` and asks `Did you mean className?` Treat it as an error: TypeScript rejects it and tools that read `className` will miss it. The same goes for `tabindex`, and for string handlers like `onclick="save()"`, which React reports with `Invalid event handler property` and `Did you mean onClick?`

## 5. Curly braces: JavaScript inside JSX

Curly braces `{ }` open a window into JavaScript. You can use them in two places:

```jsx
<p>{name}</p>            // as content, between the tags
<img src={photoUrl} />   // as the value of an attribute
```

You cannot use them for the tag name or the attribute name. Dynamic tag names are covered in section 11.

Inside the braces you can put any JavaScript **expression**. An expression is code that produces a value. A quick test: if you can write `const x =` in front of it, it is an expression.

- Expressions (allowed): `name`, `price * 2`, `user.name.toUpperCase()`, `` `Hi ${name}` ``, `isOn ? 'On' : 'Off'`, `items.map(...)`, `format(date)`, even JSX itself.
- Statements (not allowed): `if`, `for`, `while`, `switch`, `const x = 1`, `return`. A statement does something but does not produce a value.

```jsx
function CartSummary() {
  const owner = 'Ana'
  const prices = [4, 6, 10]
  const total = prices.reduce((sum, price) => sum + price, 0)
  return (
    <p title={`Cart of ${owner}`}>
      {owner.toUpperCase()} has {prices.length} items, total: {total} USD. Free shipping: {total > 15 ? 'yes' : 'no'}
    </p>
  )
}
```

The page shows `<p title="Cart of Ana">ANA has 3 items, total: 20 USD. Free shipping: yes</p>`.

Why only expressions? Because the braces become arguments of the function call from section 2. Something like `{if (ok) 'Yes'}` would turn into `_jsx("p", { children: if (ok) 'Yes' })`, which is not valid JavaScript. The compiler reports "Unexpected token".

When you need an `if`, do it before the `return`, or use an expression form (a ternary `a ? b : c`, or `a && b`):

```jsx
function Status({ online }) {
  let label
  if (online) {
    label = 'Online'
  } else {
    label = 'Offline'
  }
  return <p>{label}</p>
}
```

**What happens, step by step (CartSummary):**
1. React runs the function top to bottom. `total` becomes 20.
2. The compiler had turned the paragraph into one call whose `children` array holds the text pieces and the four expressions. The `title` attribute is a separate template literal.
3. Each expression is evaluated when the call runs: `'ANA'`, `3`, `20`, `'yes'`, and the title becomes `'Cart of Ana'`.
4. The text pieces and values are joined into the final text.

**Common mistake:** putting an object in the braces.

```jsx
// Wrong: React cannot turn an object into text
function ShowUser() {
  const user = { name: 'Ana', age: 31 }
  return <p>{user}</p>
}

// Right: pick the values you want to show
function ShowUser() {
  const user = { name: 'Ana', age: 31 }
  return <p>{user.name} is {user.age}</p>
}
```

The wrong version throws `Objects are not valid as a React child (found: object with keys {name, age}). If you meant to render a collection of children, use an array instead.` A `Date` object gives the same error. Convert it first, for example `{date.toLocaleDateString()}`. The right version renders `Ana is 31`.

## 6. What shows on screen (and what shows nothing)

A JSX expression can produce many kinds of values. React decides what to draw for each:

| Value in braces | What React shows |
|---|---|
| `'hi'`, `42`, `0` | the text `hi`, `42`, `0` |
| `null`, `undefined` | nothing |
| `true`, `false` | nothing |
| `''` (empty string) | nothing visible |
| `[1, 2, 3]` | `123` (each item in order, nothing between them) |
| `['a', null, 'b', false]` | `ab` (the empty items are skipped) |
| `<b>x</b>` (an element) | a bold `x` |
| `NaN` | the text `NaN`, plus a console warning |
| `10n` (a BigInt) | the text `10` |
| `{ a: 1 }` or a `Date` | an error: "Objects are not valid as a React child" |
| `() => 1` (a function) | nothing, plus the console warning "Functions are not valid as a React child" |

Remember two groups: **strings and numbers become text. `null`, `undefined`, `true` and `false` become nothing.** That second group is what makes conditional rendering work. `{isLoggedIn && <Menu />}` shows the menu when `isLoggedIn` is `true`, and nothing when it is `false`. The [conditional rendering lesson](06-conditional-rendering-and-lists.md) covers all the patterns. Here is the one trap you must know today.

**The `0` pitfall.** Zero is a number, and numbers are drawn:

```jsx
function Inbox({ messages }) {
  return <div>{messages.length && <p>You have mail</p>}</div>
}
```

- With `messages = ['hello']`, the page shows `You have mail`.
- With `messages = []`, the page shows `0`.

Why? `&&` returns its left side when that side is falsy. `0 && something` evaluates to `0`, and React draws a `0`. The fix is to make the left side a real boolean:

```jsx
function Inbox({ messages }) {
  return <div>{messages.length > 0 && <p>You have mail</p>}</div>
}
```

With `[]` this shows nothing, because `0 > 0` is `false`. A ternary also works: `{messages.length ? <p>You have mail</p> : null}`. (An empty string on the left, as in `'' && x`, is falsy too, but an empty string draws nothing, so only the number case bites.)

Booleans are never shown as text. If you want to see `true` or `false` on the screen, convert it:

```jsx
<p>{isOn}</p>               // shows nothing, even when isOn is true
<p>{String(isOn)}</p>       // shows true or false
<p>{isOn ? 'on' : 'off'}</p> // shows on or off
```

**What happens, step by step (the `0` pitfall):**
1. React evaluates `messages.length && <p>...</p>` with `messages = []`.
2. `messages.length` is `0`. `0` is falsy, so `&&` stops and returns `0`.
3. The `children` of the `div` is the number `0`.
4. React draws numbers as text, so the page shows `0`.

**Common mistake:** `{count && <Badge />}` where `count` can be zero. Fix: `{count > 0 && <Badge />}`.

One more preview. When you put an array of elements in braces, every element needs a `key` prop, or React logs a warning. Lists and keys are the subject of the [lists lesson](06-conditional-rendering-and-lists.md).

## 7. Attributes: strings, expressions, booleans and spread

**Quotes make a string. Braces make any JavaScript value.**

```jsx
function Show(props) {
  return <p>{typeof props.count}</p>
}

<Show count="5" />   // shows: string
<Show count={5} />   // shows: number
```

You cannot mix the two. Inside quotes, braces are just characters:

```jsx
// Wrong: the class is the literal text "btn {size}"
<div className="btn {size}" />

// Right: use braces and a template literal
<div className={`btn ${size}`} />
```

**Boolean attributes.** Writing the name alone means `true`. These two lines are the same:

```jsx
<button disabled>Save</button>
<button disabled={true}>Save</button>
```

Passing `false`, `null` or `undefined` leaves the attribute out. Careful with the string `"false"`: any non-empty string is truthy, so `<button disabled="false">` is still disabled. React even warns about it: "Received the string `false` for the boolean attribute `disabled`. The browser will interpret it as a truthy value. Did you mean disabled={false}?" Use `disabled={false}`. The same shorthand works on your own components: `<Modal open />` passes `open: true`.

`aria-*` and `data-*` attributes are special: booleans become the strings `"true"` and `"false"`, and the attribute stays. `aria-expanded={true}` gives `aria-expanded="true"`, and `data-active={false}` gives `data-active="false"`. `null` and `undefined` still remove the attribute.

**Spread.** `{...props}` copies every key of an object into the props. It is common for wrapper components:

```jsx
function SubmitButton(props) {
  return <button type="submit" {...props} />
}
```

Order matters: later wins. With `<SubmitButton type="button" />`, the button gets `type="button"`, because the spread comes after `type="submit"`. If you write `<button {...props} type="submit" />` instead, the button is always `submit`, whatever the caller passed.

**What happens, step by step (the spread):**
1. The compiler writes `_jsx("button", { type: "submit", ...props })`.
2. JavaScript builds the object left to right: first `type: "submit"`, then the keys of `props`.
3. A key that appears twice keeps its last value, so `props.type` replaces `"submit"`.

**Common mistake:** `disabled="false"`. Fix: `disabled={false}`, braces and a real boolean. Also be careful with what you spread: never spread an object that comes from a user or a server onto an element (see section 13).

## 8. The style prop and className

The `style` prop does not take a string like HTML does. It takes an **object**. That is why you see double braces: the outer pair opens the JavaScript window (section 5), the inner pair is the object literal.

```jsx
function Box() {
  return (
    <div style={{ backgroundColor: 'tomato', fontSize: 20, lineHeight: 1.5, width: '50%' }}>
      Hi
    </div>
  )
}
```

The page receives `style="background-color: tomato; font-size: 20px; line-height: 1.5; width: 50%;"`.

The rules:
- Keys are camelCase: `backgroundColor`, not `background-color`.
- A plain number becomes pixels for length properties: `fontSize: 20` is `20px`.
- Some properties are unitless and keep the number as it is, such as `lineHeight`, `opacity` and `zIndex`.
- A string is used as written, so give it a unit: `width: '50%'`, `height: '10rem'`. A bare `'100'` is not valid CSS and is ignored.
- CSS custom properties keep their name and go in quotes: `{ '--gap': '8px' }`.

When should you use `style`? For values that are only known while the app runs, like the width of a progress bar:

```jsx
function Progress({ percent }) {
  return <div className="bar" style={{ width: `${percent}%` }} />
}
```

For everything else, prefer `className` with a CSS file. Inline styles cannot express hover states, media queries or pseudo-elements, and they are hard to reuse. [Styling](../03-intermediate/07-styling.md) compares the options. `className` takes a plain string; build it with a template literal such as `` `btn ${isBig ? 'btn-big' : ''}` ``.

**What happens, step by step (Progress with `percent = 40`):**
1. The template literal makes the string `"40%"`.
2. The compiler had made the prop object `{ className: "bar", style: { width: "40%" } }`.
3. React DOM copies each key of the `style` object to the element's inline style, so the page gets `<div class="bar" style="width: 40%;"></div>`.

**Common mistake:** a CSS string.

```jsx
// Wrong: throws an error
<div style="color: red">Hi</div>

// Right: an object with a camelCase key
<div style={{ color: 'red' }}>Hi</div>
```

React throws `The style prop expects a mapping from style properties to values, not a string.` If you write a hyphenated key, such as `{ 'background-color': 'red' }`, React still applies it but warns `Unsupported style property background-color. Did you mean backgroundColor?`

## 9. Comments and whitespace

**Comments.** Outside JSX, comments are normal: `//` and `/* */`. Inside JSX, the content area is not JavaScript, so `//` there is plain text. Open a JavaScript window with braces and put a block comment in it:

```jsx
function Card() {
  // a normal comment, outside the JSX
  return (
    <div>
      {/* this comment is removed */}
      // this line is TEXT and appears on the page
      <span /* inline comment */ className="s">x</span>
    </div>
  )
}
```

The page receives `<div>// this line is TEXT and appears on the page<span class="s">x</span></div>`. The `{/* ... */}` comment is gone. Between attributes inside a tag, an ordinary `/* */` comment is allowed. HTML comments (`<!-- -->`) are a syntax error in JSX.

**Whitespace.** JSX does not keep line breaks the way HTML shows them. The rules are: spaces at the start and end of a line are removed, lines are joined with a single space, and a line break between text and an element is dropped. The result can surprise you:

```jsx
<p>
  Hello,
  <b>Ana</b>
</p>
```

This shows `Hello,Ana` with no space. To get a space, add `{' '}` or put the pieces on one line:

```jsx
<p>
  Hello,{' '}
  <b>Ana</b>
</p>

<p>Hello, <b>Ana</b></p>
```

Both show `Hello, Ana`. Text that spans lines, with no element in between, is joined with one space: `Hello, Ana` followed by `and Bob` on the next line becomes `Hello, Ana and Bob`.

**HTML entities** such as `&nbsp;`, `&copy;` and `&lt;` work in JSX *text*, because the compiler decodes them. They do not work inside a JavaScript string in braces: `{'&lt;'}` shows the six characters `&lt;`. In a string, type the character itself, or write the text outside the braces so the entity is decoded.

**What happens, step by step (the comment example):**
1. The compiler drops `{/* ... */}`: the braces hold only a comment, so there is no expression and no child.
2. The line starting with `//` is plain JSX text, so it becomes a string child.
3. The `/* inline comment */` between the tag name and the attribute is stripped like a comment in any JavaScript code.

**Common mistake:** a `//` comment between elements.

```jsx
// Wrong: this prints the words "// check this later" on the page
<div>
  // check this later
  <span>x</span>
</div>

// Right
<div>
  {/* check this later */}
  <span>x</span>
</div>
```

## 10. Children: what goes between the tags

Everything between an opening and a closing tag is the **children** of that element. Children can be text, other elements, expressions, or a mix.

```jsx
function CardBox({ children }) {
  return <section className="card">{children}</section>
}

function App() {
  return (
    <CardBox>
      <h2>Title</h2>
      <p>Body</p>
    </CardBox>
  )
}
```

The page receives `<section class="card"><h2>Title</h2><p>Body</p></section>`.

The compiler stores the children in a prop named `children`. One child is stored as the value itself. Two or more are stored as an array. No children means there is no `children` key at all:

```js
_jsx("p", { children: "only" })                  // one child: the value
_jsxs("p", { children: ["a", "b"] })             // many: an array
_jsx("br", {})                                   // none: no children key
```

**What happens, step by step (`App`):**
1. The compiler turns the two tags between `<CardBox>` and `</CardBox>` into two element objects and puts them in an array.
2. That array becomes `props.children` of the `CardBox` element, so `props.children.length` is 2.
3. When React runs `CardBox`, the function receives `{ children }` and puts it inside the `section`.

How your own components use `children` is the job of the [components and props lesson](04-components-and-props.md). For now, remember that tags between tags are just a prop.

**Common mistake:** expecting `children` to be text only. It can be elements, arrays, even nothing. Do not call string methods on it without checking its type. Fix: render it with `{children}` and let React handle all the cases.

## 11. Components, capital letters, dot notation and dynamic tags

JSX has to decide whether `<x />` means "an HTML tag called x" or "the component stored in a variable called x". The rule: **a lowercase first letter means an HTML tag. A capital first letter means a variable.**

You can see why in the compiled calls:

```jsx
<div />        // _jsx("div", {})            first argument is the string "div"
<Greeting />   // _jsx(Greeting, {})         first argument is the variable Greeting
<greeting />   // _jsx("greeting", {})       a string again: an unknown HTML tag
```

So a lowercase component name does not work:

```jsx
function greeting() {
  return <p>hi</p>
}

// renders <greeting></greeting> and logs a warning
<greeting />
```

The page gets an empty `<greeting></greeting>` element, and React warns `The tag <greeting> is unrecognized in this browser. If you meant to render a React component, start its name with an uppercase letter.`

**Dot notation.** A name with a dot is read as a reference to a property, so it works as a component:

```jsx
const UI = {
  Button: ({ children }) => <button>{children}</button>,
}

<UI.Button>go</UI.Button>   // the page gets <button>go</button>
```

This is handy for groups of related components such as `<Form.Input />` or `<Menu.Item />`.

**Dynamic tag names.** Put the tag name, or a component, in a variable that starts with a capital letter:

```jsx
function Heading({ level, children }) {
  const Tag = `h${level}`
  return <Tag>{children}</Tag>
}

<Heading level={3}>Hi</Heading>   // the page gets <h3>Hi</h3>
```

You can also choose between components at runtime:

```jsx
const Icons = {
  success: () => <span>OK</span>,
  error: () => <span>ERR</span>,
}

function Notice({ type }) {
  const Icon = Icons[type]
  return <Icon />
}
```

`<Notice type="success" />` shows `OK` and `<Notice type="error" />` shows `ERR`.

**What happens, step by step (`Heading level={3}`):**
1. The template literal builds the string `"h3"` and `Tag` holds it.
2. The compiler had turned `<Tag>` into `_jsx(Tag, { children })`, because `Tag` starts with a capital letter, so it passes the variable.
3. At run time the variable holds a string, so React treats it as a built-in tag name and renders `<h3>`.

**Common mistake:** a lowercase variable for the tag.

```jsx
// Wrong: renders a literal <tag> element, not a section
const tag = 'section'
<tag>one</tag>

// Right: capitalise the variable
const Tag = 'section'
<Tag>one</Tag>
```

Creating and using your own components is explained in the [components and props lesson](04-components-and-props.md).

## 12. JSX is an expression

Because JSX compiles to a function call, it produces a value. That value is an object, so you can use JSX anywhere a value can go: in a variable, an array, an object, a function argument, a ternary, or a return statement.

```jsx
function UserBadge({ user }) {
  const badge = user.admin ? <b>admin</b> : null
  const tags = user.tags.map((tag) => <li key={tag}>{tag}</li>)

  return (
    <section>
      <h2>{user.name} {badge}</h2>
      <ul>{tags}</ul>
    </section>
  )
}
```

With `user = { name: 'Ana', admin: true, tags: ['a', 'b'] }` the page gets `<section><h2>Ana <b>admin</b></h2><ul><li>a</li><li>b</li></ul></section>`. With `{ name: 'Bo', admin: false, tags: [] }` the badge is `null` and the list is empty, so the page gets `<section><h2>Bo </h2><ul></ul></section>`.

This is a *preview* of two big topics. The ternary is a conditional, and `.map()` makes a list. Both are covered in the [conditional rendering and lists lesson](06-conditional-rendering-and-lists.md). What matters here is the idea: no templating language is needed, because JSX values are ordinary values.

**What happens, step by step (`UserBadge` for Ana):**
1. `user.admin` is `true`, so `badge` holds the element object for `<b>admin</b>`.
2. `.map()` runs once per tag (here twice) and returns an array of two `li` element objects.
3. The `section` element is built. `{badge}` and `{tags}` sit in its tree as ordinary children.
4. React draws the element, the array and the text in order.

**Common mistake:** calling a component as a plain function.

```jsx
// Wrong: Price runs as an ordinary function inside this component
<div>{Price({ value: 3 })}</div>

// Right: use it as a tag, so React runs it in its own place in the tree
<div><Price value={3} /></div>
```

A component that is called by hand gets no place of its own in React's tree, so it cannot have its own state. Helper functions that only return JSX and use no state are fine to call, but a tag is almost always the better choice.

Another trap is running a handler while rendering. `onClick={save()}` calls `save` immediately, during render, and gives React its return value. Pass the function itself: `onClick={save}` or `onClick={() => save(id)}`. Events are covered in the [state and events lesson](05-state-and-events.md).

## 13. Safety: React escapes values, and where it cannot

**XSS** (cross-site scripting) means an attacker gets their text to run as code on someone else's page. The classic cause is building HTML by gluing strings together and inserting the result with `innerHTML`.

JSX avoids this by default. Anything you put in `{ }` is treated as data, never as markup. On the client React puts text into the page through DOM text APIs (text nodes or `textContent`) and sets attributes with `setAttribute`. None of those ever parses HTML. When React renders on the server, it escapes the characters `<`, `>`, `&` and quotes.

```jsx
function Comment({ text }) {
  return <p>{text}</p>
}

// text = '<img src=x onerror="alert(1)">'
```

The page gets `<p>&lt;img src=x onerror="alert(1)"&gt;</p>`. The attacker's tag is shown as harmless text, and no `img` element exists.

React does not protect you in these places:

1. **`dangerouslySetInnerHTML`.** It sets `innerHTML` on purpose. The long name is a warning label.

   ```jsx
   function RichComment({ html }) {
     return <p dangerouslySetInnerHTML={{ __html: html }} />
   }
   ```

   With the same attacker text, the page gets `<p><img src="x" onerror="alert(1)"></p>`: a real `img` element with a live `onerror` handler. In a browser that script runs. Use this prop only for HTML you trust or that you have cleaned with a sanitizer library such as DOMPurify, and never for raw user input. The prop must be an object of the form `{ __html: string }`, and an element cannot have both this prop and children (React throws `Can only set one of children or props.dangerouslySetInnerHTML`).

2. **URLs from users.** `<a href={userUrl}>` with `javascript:alert(1)` is a classic attack. React 19.3.1 replaces such a URL with a stub that throws `React has blocked a javascript: URL as a security precaution.` Do not rely on that alone: allow only `http:`, `https:` and `mailto:` addresses before you render a link.

3. **Spreading untrusted objects.** `<div {...userObject} />` copies every key, including `dangerouslySetInnerHTML`. Parsing `{"dangerouslySetInnerHTML":{"__html":"<img src=x>"}}` and spreading it onto a `div` creates a real `img` element. Spread only objects whose keys you control.

The deeper treatment (sanitizing, CSP, tokens) is in [Security and i18n](../04-advanced/10-security-and-i18n.md).

**What happens, step by step (the safe `Comment`):**
1. React receives the string `'<img src=x onerror="alert(1)">'` as the child of the `p`.
2. It inserts the string as text (a text node, or the `textContent` of the `p`). Text holds characters, it never parses tags.
3. The browser shows the characters. No `img` element is created, so `onerror` never exists.

**Common mistake:** using `dangerouslySetInnerHTML` to "fix" a display problem.

```jsx
// Wrong: the user's text can now run as HTML
<p dangerouslySetInnerHTML={{ __html: userComment }} />

// Right: let React escape it
<p>{userComment}</p>
```

If users really need bold and links, convert their markup to elements yourself, or sanitize it first.

## 14. JSX versus HTML: the whole table

| Topic | HTML | JSX |
|---|---|---|
| CSS class | `class="card"` | `className="card"` |
| Label target | `for="email"` | `htmlFor="email"` |
| Multi-word attributes | `tabindex`, `readonly`, `maxlength`, `colspan`, `autofocus` | `tabIndex`, `readOnly`, `maxLength`, `colSpan`, `autoFocus` |
| `aria-*` and `data-*` | `aria-label`, `data-id` | the same, with hyphens |
| SVG attributes | `stroke-width`, `fill-opacity` | `strokeWidth`, `fillOpacity` |
| Event handlers | a string: `onclick="save()"` | a function: `onClick={save}` |
| Change events | `change` fires when the value is committed, usually on blur | `onChange` fires on every keystroke |
| Inline style | a string: `style="color: red"` | an object: `style={{ color: 'red' }}` |
| Closing tags | `<br>`, `<img>`, optional `</li>` | `<br />`, `<img />`, always closed |
| Comments | `<!-- note -->` | `{/* note */}` |
| Top level | many siblings are fine | one root, or a Fragment |
| Dynamic values | none | `{expression}` |
| `false` for a boolean attribute | `disabled="false"` is still disabled | `disabled={false}` removes it |
| Tag name case | not case sensitive | a capital letter means a component |

**Converting HTML into JSX, step by step.** Paste the HTML, then walk down this checklist:
1. Wrap siblings in one parent or a Fragment.
2. Rename `class` and `for`, and the other multi-word attributes.
3. Close every tag, including `<img>`, `<input>` and `<br>`.
4. Turn `style="..."` into an object with camelCase keys.
5. Turn `onclick="..."` strings into functions.
6. Turn `<!-- -->` into `{/* */}`.
7. Replace dynamic parts with `{expressions}`.

**Common mistake:** pasting a snippet from a design tool and fixing only the error that the compiler reports first. The compiler stops at the first syntax error, while the warnings (like `class`) only show in the console. Fix: run the whole checklist, then open the browser console and fix every warning.

## 15. The automatic JSX runtime and the tools that compile JSX

Browsers cannot run JSX, so a **transform** step is needed. Many tools can do it: Oxc, Babel, SWC, esbuild, and the TypeScript compiler. In a current Vite 8 app, `@vitejs/plugin-react` does it with Oxc, so you never configure it by hand. Other libraries, such as Preact and Solid, also use JSX; they compile it to their own functions, not React's.

There are two **modes**, and you will meet both in real code. This is the same `<h1>` as before, compiled three ways:

```jsx
<h1 className="title">Hello, {name}</h1>
```

| Mode | What the tool writes |
|---|---|
| Classic (old) | `React.createElement("h1", { className: "title" }, "Hello, ", name)` |
| Automatic, production | `_jsxs("h1", { className: "title", children: ["Hello, ", name] })` |
| Automatic, development | `_jsxDEV("h1", { className: "title", children: ["Hello, ", name] }, void 0, true, { fileName, lineNumber, columnNumber }, this)` |

**Classic.** The tool writes `React.createElement`, so `React` must be in scope. That is why old files start with `import React from 'react'`. Without it you get `ReferenceError: React is not defined`.

**Automatic.** The tool adds the import by itself: `import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime"`. You write no `React` import. In development, it imports from `react/jsx-dev-runtime` and passes extra details (file name, line number) that power error messages and DevTools. React 19 no longer supports the old transform, so projects must use the automatic one. It is the default in Vite, and in TypeScript it is the setting `"jsx": "react-jsx"`.

Other details of the automatic output:
- `jsx` is used for zero or one child, and `jsxs` when several children are written out. React knows the array from `jsxs` has a fixed shape, so it does not ask for keys on it. A dynamic array (from `.map()`) goes through `jsx`, and then keys are checked.
- A `key` is not part of the props. It is passed as the third argument: `<li key={id}>x</li>` becomes `_jsx("li", { children: "x" }, id)`.
- A Fragment compiles to `_jsxs(_Fragment, { children: [...] })`.
- Attributes with a hyphen, like `data-id`, become quoted keys: `{ "data-id": "1" }`.

`React.createElement` is still exported by React 19. The docs list it as a legacy API, and it renders without warnings, but you will rarely call it yourself. It remains useful when you build elements from data and cannot write tags, and you will see it in old code and in explanations of how JSX works.

**What happens, step by step (opening a Vite app in the browser):**
1. You run `npm run dev`. Vite serves `App.jsx` through its transform step.
2. The transform adds the `react/jsx-dev-runtime` import and rewrites each tag into a `jsxDEV` call.
3. The browser downloads plain JavaScript and runs it.
4. At run time each `jsxDEV` call returns an element object, and React DOM draws the tree.

**Common mistake:** adding `import React from 'react'` to every file out of habit, or the opposite, deleting it in a project that is still set to the classic transform.

```jsx
// Old style, still works, but the import is unused with the automatic runtime
import React from 'react'

export default function App() {
  return <h1>Hi</h1>
}
```

If you see `React is not defined`, the project uses the classic transform. Fix the configuration (automatic runtime) instead of adding the import to every file. Keep imports for things you actually use, such as hooks or `Fragment`. The short form `<>` needs no import.

## 16. What jsx() returns: the element object

Now you can open the object that the call returns. This is the answer to "what does `createElement` return?". You can run this in a project to see it:

```js
import { jsxs } from 'react/jsx-runtime'

const element = jsxs('h1', { className: 'title', children: ['Hello, ', 'Ana'] })
console.log(element)
```

React 19.3.1 (development build) shows these fields:

```text
{
  $$typeof: Symbol(react.transitional.element),
  type: 'h1',
  key: null,
  props: { className: 'title', children: ['Hello, ', 'Ana'] },
  _owner: null,
  _store: {}
}
```

`React.createElement('h1', { className: 'title' }, 'Hello, ', 'Ana')` returns the same shape. The fields:

- **`$$typeof`**: a tag that tells React "this object is a real React element". Its value is a Symbol (see Q15 for why).
- **`type`**: what to draw. A string for a built-in tag (`'h1'`), the function itself for a component (`Welcome`), or a special Symbol for a Fragment.
- **`key`**: `null` unless you gave one (section 15).
- **`props`**: every attribute you wrote, plus `children`. In React 19, `ref` is an ordinary prop, so it lives inside `props` and is not a separate field on the element.
- **`_owner`, `_store`**: internal fields. They exist for React's own bookkeeping and debugging, so ignore them.

Elements nest. `<ul id="list"><li>One</li></ul>` is an element whose `props.children` is another element:

```text
{ type: 'ul', props: { id: 'list', children: { type: 'li', props: { children: 'One' } } } }
```

(Shortened: only `type` and `props` are shown.) The whole screen is a tree of these small objects.

Three things to know about elements:

1. **An element is a description, not the thing itself.** It is like an order ticket: "one `h1`, class `title`, text `Hello, Ana`". It is not a DOM node. Creating `<Welcome />` does not even run `Welcome`. It only records that you want `Welcome` there, and React runs the function later.
2. **Elements are immutable.** In development React freezes them. Changing `element.props.className = 'x'` throws a `TypeError` in strict mode (which includes all ES modules). If you want something different, create a new element.
3. **Elements are cheap.** Every render creates new ones. React compares the new tree of elements with the previous one and changes only what differs in the real page. That comparison is explained in [How React renders](../04-advanced/01-how-react-renders.md).

Four words that people mix up:

| Word | What it is | Example |
|---|---|---|
| DOM node | a real object in the browser's page | the `<h1>` you see in the Elements panel |
| React element | a plain object that describes what to show | the result of `<Welcome />` |
| Component | a function that returns elements | `function Welcome() { ... }` |
| Instance | React's internal record of a component that is on screen; it holds the state | you never create or touch it |

**What happens, step by step (`jsxs` call above):**
1. `jsxs` receives the type `'h1'` and the props object (with `children`).
2. It builds a new object with `$$typeof`, `type`, `key`, and `props`.
3. In development it freezes the object, so nobody can change it.
4. It returns the object. Nothing has touched the page yet. Only when this value is passed to React DOM does anything appear.

**Common mistake:** changing an element after it was created.

```jsx
const el = <h1 className="a">Hi</h1>

// Wrong: throws TypeError ("Cannot assign to read only property")
el.props.className = 'b'

// Right: make a new element, usually by changing the data that builds it
const el2 = <h1 className="b">Hi</h1>
```

Elements are snapshots. To change what the user sees, change state or props and let the component return new elements. That is the idea of the [state lesson](05-state-and-events.md).

## How interviewers test this

- **Do you know that JSX is syntax for function calls?** A strong answer shows `jsx("h1", { ... })` or `createElement`, says it returns a plain object, and says the object only describes the UI. A red flag is "JSX is HTML inside JavaScript".
- **Can you recall the rules and give the reason for each?** One root (a function returns one value), `className` (reserved word and DOM naming), braces hold expressions (they become arguments), capital letter means component (string versus variable).
- **Can you predict output?** Expect small snippets with `0 &&`, `null`, `false`, an object in braces, whitespace between lines, or a lowercase component name. Say what renders and why.
- **Do you know the modern setup?** "Do I need to import React?" is a standard question. The answer is no with the automatic runtime. Mention that a build tool does the transform.
- **Do you think about security?** Say that `{value}` is escaped, that `dangerouslySetInnerHTML` and unvalidated URLs are the risks, and that you would sanitize. A red flag is using `dangerouslySetInnerHTML` to render user text.
- **Can you convert HTML to JSX quickly?** Live-coding rounds often start by pasting a snippet. Work down the checklist in section 14.

## Interview questions and model answers

### Q1. What is JSX? (Easy)
JSX is a syntax extension for JavaScript that lets you write markup that looks like HTML inside JavaScript files. It is not HTML and not a string. A build tool compiles each JSX tag into a function call (`jsx(...)`) that returns a plain object called a React element. The object describes what should be on the screen. JSX is optional, but almost all React code uses it, because the markup and the logic that drives it live together in one component.

### Q2. Can the browser read JSX? (Easy)
No. Browsers only run JavaScript. A compiler rewrites JSX into function calls at build time. In a Vite 8 app that is Oxc, wired in by `@vitejs/plugin-react`. Babel, SWC, esbuild and TypeScript can do the same job. That is why a JSX file needs a build step, and why JSX adds no work in the browser beyond the function calls it turns into.

### Q3. Why do we write `className` and `htmlFor` instead of `class` and `for`? (Easy)
JSX attributes become keys of a JavaScript props object, and `class` and `for` are reserved words in JavaScript. React also follows the names of the DOM properties, which are `element.className` and `label.htmlFor`. For the same reason other multi-word attributes are camelCase: `tabIndex`, `readOnly`, `onClick`. Only `aria-*` and `data-*` keep their hyphens. In React 19 the HTML spelling still reaches the DOM, but React logs a warning, so treat it as a bug.

### Q4. Why must a component return a single root element? (Easy)
Each JSX tag compiles to a function call, and a function can return only one value. Two sibling tags would be two values, so the compiler refuses with "Adjacent JSX elements must be wrapped in an enclosing tag". The fix is a parent element or a Fragment. A Fragment is better when an extra DOM node would break the layout (flex or grid children) or the HTML rules (table rows).

### Q5. What is a Fragment, and when do you write `<Fragment>` instead of `<>`? (Easy)
A Fragment groups children without adding a node to the DOM. `<>...</>` is the short form of `<Fragment>...</Fragment>`. The short form takes no attributes, so use the long form, imported from `react`, when you need a `key`, for example when each item of a `.map()` returns a `<dt>` and a `<dd>`. From React 19.3 the long form can also take a `ref`.

### Q6. What can you put inside curly braces in JSX? (Easy)
Any JavaScript expression: a variable, arithmetic, a function call, a ternary, a template literal, a `.map()` call, or JSX itself. Statements such as `if`, `for` and `switch`, and declarations like `const`, are not allowed. The reason is that the braces become arguments of the compiled function call, and an argument must be an expression. For branching, use a ternary or `&&`, or compute a variable before the `return`. Also remember that plain objects cannot be rendered: `{user}` throws "Objects are not valid as a React child".

### Q7. What does JSX compile to? (Easy)
To function calls. With the automatic runtime, `<h1 className="title">Hi</h1>` becomes `jsx("h1", { className: "title", children: "Hi" })`. The older transform produced `React.createElement("h1", { className: "title" }, "Hi")`. The tag name is the first argument, the attributes become the props object, and the content between the tags becomes `children`. A name that starts with a capital letter is passed as a variable, not as a string.

### Q8. Do you still need `import React from 'react'` in every file? (Easy)
No. With the automatic JSX runtime (the default in current tools, and required by React 19), the compiler adds an import from `react/jsx-runtime` for you. Import from `react` only what you use, such as hooks or `Fragment`. Old files with the unused import still work. If you see `React is not defined`, the project is still set to the classic transform and its configuration needs fixing.

### Q9. What does `React.createElement` (or `jsx()`) return? (Medium)
A plain JavaScript object called a React element. It is not a DOM node. Its main fields are `$$typeof` (a Symbol that marks it as a React element), `type` (a tag name string, a component function, or the Fragment symbol), `key` (`null` unless given) and `props` (the attributes plus `children`). In development the object is frozen. Creating an element does not run the component, it only describes what to render. React compares the new tree of elements with the old one to decide which DOM changes to make.

### Q10. What does it mean that "JSX is an expression"? (Medium)
A JSX tag evaluates to a value, the element object. That means you can use it wherever a value fits: assign it to a variable, pass it as an argument, return it from a function, put it in an array or object, or choose between two of them with a ternary. For example, `const badge = admin ? <b>admin</b> : null` is valid. It is also why you need no template language for logic, because plain JavaScript decides which elements to build. The related rule: use components as tags (`<Price />`), do not call them as functions.

### Q11. What does React render for `null`, `undefined`, `true`, `false`, `0` and `''`? (Medium)
Nothing for `null`, `undefined`, `true` and `false`. An empty string draws nothing visible. Numbers are drawn as text, including `0` and `NaN`. That gives the common bug `{items.length && <List />}`, which prints `0` for an empty array, because `0 && x` evaluates to `0`. Fix it with `items.length > 0 && ...` or a ternary. Booleans are never printed as text, so use `String(flag)` or a ternary if you want to see them.

### Q12. How do you write a comment in JSX? (Easy)
Inside the children of an element, use `{/* comment */}`. The braces open a JavaScript window and the comment leaves nothing behind. A `//` comment written directly between the tags is just text and appears on the page. Between attributes inside a tag, a normal `/* */` comment works. HTML comments (`<!-- -->`) are a syntax error. Outside JSX, normal `//` comments are fine.

### Q13. Why do component names have to start with a capital letter? (Medium)
The compiler uses the first letter to decide what to pass as the first argument of the call. A lowercase name becomes a string, which means a built-in HTML tag. A capital letter (or a dotted name like `UI.Button`) becomes a variable reference, which means a component. So `<greeting />` compiles to `jsx("greeting", {})`, renders an unknown HTML element, and React warns "The tag greeting is unrecognized in this browser. If you meant to render a React component, start its name with an uppercase letter". For a dynamic tag, store the name in a capitalised variable: `const Tag = 'h2'`.

### Q14. Is JSX safe from XSS? When is `dangerouslySetInnerHTML` acceptable? (Medium)
Values in braces are escaped. On the client React sets text and attributes through DOM APIs that never parse HTML, so `<script>` text in a variable stays text. The risks are the places where you step around that: `dangerouslySetInnerHTML` (which sets `innerHTML`), URLs from users (`javascript:`; React 19 blocks them, but you should still allow only `http`, `https` and `mailto`), and spreading untrusted objects into props. Use `dangerouslySetInnerHTML` only for HTML you trust or have run through a sanitizer such as DOMPurify. Never use it for raw user input. The full picture is in [Security and i18n](../04-advanced/10-security-and-i18n.md).

### Q15. What is `$$typeof` on a React element, and why is it a Symbol? (Hard)
`$$typeof` is the field React checks to decide whether an object really is a React element. In React 19 its value is `Symbol.for('react.transitional.element')` (older versions used the name `react.element`). A Symbol cannot be written in JSON, so JSON coming from a server or a user can never contain it. Without the check, an attacker who could store JSON such as `{ "type": "div", "props": { "dangerouslySetInnerHTML": ... } }` in your data might get React to treat it as an element. With the check, React rejects such an object with "Objects are not valid as a React child". This is defence in depth. It does not replace validating input.

## Common mistakes and gotchas
- **Using `class` and `for`.** Fix: `className` and `htmlFor`.
- **Returning two siblings.** Fix: wrap them in a parent or a Fragment `<>...</>`.
- **Leaving tags unclosed (`<br>`, `<input>`, `<img>`).** Fix: `<br />`, `<input />`, `<img />`.
- **Putting `if`, `for` or `const` inside braces.** Fix: use a ternary, `&&` or `.map()`, or compute a variable before the `return`.
- **Rendering an object or a `Date` with `{value}`.** Fix: render a field of it, such as `{user.name}` or `{date.toLocaleDateString()}`.
- **`{count && <Badge />}` printing `0`.** Fix: `{count > 0 && <Badge />}` or a ternary.
- **Expecting `{isOn}` to show `true`.** Fix: `{String(isOn)}` or `{isOn ? 'on' : 'off'}`.
- **`style="color: red"`.** Fix: `style={{ color: 'red' }}`. Keys are camelCase and numbers mean pixels.
- **`disabled="false"`.** Fix: `disabled={false}`. Any non-empty string is truthy.
- **`className="btn {size}"`.** Fix: ``className={`btn ${size}`}``. Braces inside quotes are plain text.
- **A `//` comment between elements.** Fix: `{/* comment */}`.
- **Text and an element on different lines with no space.** Fix: add `{' '}` or keep them on one line.
- **A lowercase component name (`<greeting />`).** Fix: `<Greeting />`. The same goes for a lowercase variable used as a tag.
- **`return` followed by a new line.** Fix: put `(` on the same line as `return`.
- **`onClick={save()}`.** Fix: pass the function, `onClick={save}`, or wrap it, `onClick={() => save(id)}`.
- **Using `dangerouslySetInnerHTML` or spreading an untrusted object.** Fix: render with `{value}`; sanitize rich HTML; spread only objects you control.
- **Adding `import React` everywhere out of habit.** Fix: use the automatic runtime and import only what you use.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard. For the coding tasks, use the practice app (see [Set up your playground](../00-start-here/02-setup-your-playground.md)) or any Vite React sandbox.

1. **(Easy)** Predict: what text does each `<li>` show?

   ```jsx
   function Demo() {
     return (
       <ul>
         <li>{0}</li>
         <li>{null}</li>
         <li>{'false'}</li>
         <li>{false}</li>
         <li>{[1, 'a', null]}</li>
         <li>{NaN}</li>
         <li>{true && 'yes'}</li>
       </ul>
     )
   }
   ```

   <details>
   <summary>Show answer</summary>

   The seven items show: `0`, nothing (empty), `false`, nothing (empty), `1a`, `NaN`, `yes`.

   - `0` is a number, so it is drawn.
   - `null` and the boolean `false` draw nothing. The string `'false'` is text, so it is drawn.
   - An array draws each item in order. `1` and `'a'` are drawn, `null` is skipped, so the text is `1a`.
   - `NaN` is a number, so it is drawn as `NaN` (React also logs a console warning).
   - `true && 'yes'` evaluates to `'yes'`.

   </details>

2. **(Easy)** Coding: this snippet has nine problems. Find and fix them all so it compiles and has no console warnings.

   ```jsx
   function Signup() {
     return (
       <h1 class="title">Sign up</h1>
       <label for="email">Email</label>
       <input id="email" tabindex="1" style="width: 200px">
       <button disabled="false" onclick="send()">Go</button>
       <!-- submit button -->
     )
   }
   ```

   <details>
   <summary>Show answer</summary>

   The problems: (1) several roots, (2) `class`, (3) `for`, (4) `tabindex`, (5) `style` as a string, (6) `<input>` is not closed, (7) `disabled="false"` is a truthy string, (8) `onclick` as a string, (9) an HTML comment.

   ```jsx
   function Signup() {
     function send() {
       // send the form
     }

     return (
       <>
         <h1 className="title">Sign up</h1>
         <label htmlFor="email">Email</label>
         <input id="email" tabIndex={1} style={{ width: 200 }} />
         <button disabled={false} onClick={send}>Go</button>
         {/* submit button */}
       </>
     )
   }
   ```

   This renders `<h1 class="title">Sign up</h1><label for="email">Email</label><input id="email" tabindex="1" style="width: 200px;"><button>Go</button>`. The `disabled={false}` can also be removed completely.

   </details>

3. **(Easy)** Explain: why does `<p>{if (ok) 'Yes'}</p>` fail to compile? Give two ways to fix it.

   <details>
   <summary>Show answer</summary>

   The braces become an argument of the compiled call (`_jsx("p", { children: ... })`), and an argument has to be an expression. `if` is a statement, so the compiler reports "Unexpected token".

   Fixes:
   - A ternary: `<p>{ok ? 'Yes' : null}</p>` (or `ok && 'Yes'`, which also draws nothing when `ok` is `false`).
   - Compute the value before the `return`: `let text = ''; if (ok) text = 'Yes'; return <p>{text}</p>`.

   </details>

4. **(Easy)** Coding: write a component `ProfileCard({ name, role, avatarUrl, accent })`. It must return one `article` with the class `profile-card` and an inline left border of `4px solid` in the `accent` color. Inside: an `img` (with a meaningful `alt` text built from the name), the name in an `h2`, and the role in uppercase in a `p`.

   <details>
   <summary>Show answer</summary>

   ```jsx
   function ProfileCard({ name, role, avatarUrl, accent }) {
     return (
       <article className="profile-card" style={{ borderLeft: `4px solid ${accent}` }}>
         <img src={avatarUrl} alt={`${name} avatar`} />
         <h2>{name}</h2>
         <p>{role.toUpperCase()}</p>
       </article>
     )
   }
   ```

   With `name="Ana"`, `role="engineer"`, `avatarUrl="/a.png"`, `accent="tomato"` the page gets `<article class="profile-card" style="border-left: 4px solid tomato;"><img alt="Ana avatar" src="/a.png"><h2>Ana</h2><p>ENGINEER</p></article>`. Points to check: `className`, a style object with a camelCase key, a template literal in braces, a self-closed `img`, and an expression (`role.toUpperCase()`) in content.

   </details>

5. **(Medium)** Predict: write the automatic-runtime call (`jsx` or `jsxs`) that the compiler produces for each line.

   ```jsx
   <Button kind="primary" disabled>Save</Button>
   <p>Hi, {name}!</p>
   ```

   <details>
   <summary>Show answer</summary>

   ```js
   jsx(Button, { kind: "primary", disabled: true, children: "Save" })
   jsxs("p", { children: ["Hi, ", name, "!"] })
   ```

   - `Button` starts with a capital letter, so it is passed as a variable, not as the string `"Button"`.
   - `disabled` with no value becomes `disabled: true`.
   - One child (`Save`) is stored as the value itself and uses `jsx`.
   - Three children (text, `name`, text) are stored as an array and use `jsxs`.

   </details>

6. **(Medium)** Predict: what text does this paragraph show when `total` is `5`? Then rewrite it so it shows `Total: 5 items`.

   ```jsx
   <p>
     Total:
     <strong>{total}</strong>
     items
   </p>
   ```

   <details>
   <summary>Show answer</summary>

   It shows `Total:5items`. JSX removes the line breaks and the spaces around them between text and elements, so no space survives.

   Fix: put the pieces on one line, or add `{' '}` where a space is needed:

   ```jsx
   <p>
     Total: <strong>{total}</strong> items
   </p>
   ```

   This shows `Total: 5 items`.

   </details>

7. **(Medium)** Coding: write `Heading({ level = 2, children })` that renders `h1` to `h6`. Levels below 1 must give `h1`, levels above 6 must give `h6`, and a missing level gives `h2`.

   <details>
   <summary>Show answer</summary>

   ```jsx
   function Heading({ level = 2, children }) {
     const Tag = `h${Math.min(Math.max(level, 1), 6)}`
     return <Tag>{children}</Tag>
   }
   ```

   `<Heading level={1}>a</Heading><Heading>b</Heading><Heading level={9}>c</Heading><Heading level={0}>d</Heading>` renders `<h1>a</h1><h2>b</h2><h6>c</h6><h1>d</h1>`. The variable `Tag` has a capital letter, so the compiler passes the variable, and its value (a string such as `"h6"`) selects the built-in tag.

   </details>

8. **(Medium)** Explain: a teammate writes the component below because users want bold text in comments. What do you say in the review?

   ```jsx
   function Comment({ text }) {
     return <p dangerouslySetInnerHTML={{ __html: text }} />
   }
   ```

   <details>
   <summary>Show answer</summary>

   This is an XSS hole. Whatever a user types is inserted as HTML. A comment like `<img src=x onerror="alert(1)">` creates a real `img` element, and its `onerror` script runs when the image fails to load. The safe version is `<p>{text}</p>`, because React escapes values in braces.

   If users need formatting, choose one of: run the HTML through a sanitizer (DOMPurify) with a short allow-list of tags before using `dangerouslySetInnerHTML`; or accept a small markup language such as Markdown and convert it to React elements instead of HTML; or give a toolbar that stores structured data (for example, a list of text pieces with a `bold` flag) and render that with JSX.

   </details>

9. **(Medium)** Predict and fix: what does this render for `items = []` and for `items = [1]`?

   ```jsx
   function Cart({ items }) {
     return <div>{items.length && <p>{items.length} items</p>}</div>
   }
   ```

   <details>
   <summary>Show answer</summary>

   For `[]` the `div` contains the text `0`. For `[1]` it contains `<p>1 items</p>`.

   `items.length` is `0` for the empty array. `0 && x` returns `0`, and React draws numbers. Fix with a real boolean: `{items.length > 0 && <p>{items.length} items</p>}`, or a ternary with `null` as the other branch. (The `1 items` grammar is a separate bug, left for you.)

   </details>

10. **(Hard)** Predict: what does this component put on the page, and what does the console say? How would you fix it?

    ```jsx
    function App() {
      const tag = 'section'
      const Wrapper = 'section'
      return (
        <>
          <tag>one</tag>
          <Wrapper>two</Wrapper>
        </>
      )
    }
    ```

    <details>
    <summary>Show answer</summary>

    The page gets `<tag>one</tag><section>two</section>`. The console shows a warning: "The tag <tag> is unrecognized in this browser. If you meant to render a React component, start its name with an uppercase letter."

    `<tag>` starts with a lowercase letter, so the compiler passes the string `"tag"`, which is an unknown HTML element. It never looks at your variable. `<Wrapper>` starts with a capital letter, so the compiler passes the variable, whose value is `'section'`. Fix: rename the variable to `Tag`.

    </details>

11. **(Hard)** Coding: build a tiny version of the two ends of JSX. Write `h(type, props, ...children)`, which returns `{ type, key, props }`, and `toHtml(node)`, which turns that tree into an HTML string.

    Requirements for `h`: `key` is taken out of the props (default `null`); `children` is set only if there are children, as the value itself for one child and an array for many.

    Requirements for `toHtml`: strings and numbers become escaped text (`&`, `<`, `>` and `"`); `null`, `undefined` and booleans become an empty string; arrays are joined; a function `type` is called with the props and its result is rendered; `className` becomes `class` and `htmlFor` becomes `for`; `true` attributes print as just the name; `false`, `null` and `undefined` attributes are skipped; the tags `br`, `hr`, `img` and `input` print without a closing tag.

    Check it with:

    ```js
    function Item({ n }) { return h('li', null, n) }

    toHtml(
      h('div', { className: 'box', id: 'a"b' },
        h('h1', null, 'Fish & Chips'),
        h('input', { disabled: true, readOnly: false }),
        h('ul', null, [1, 2].map((n) => h(Item, { key: n, n }))),
        false,
        null,
      ),
    )
    ```

    <details>
    <summary>Show answer</summary>

    ```js
    const VOID_TAGS = new Set(['br', 'hr', 'img', 'input'])
    const ATTR_NAMES = { className: 'class', htmlFor: 'for' }

    function h(type, props, ...children) {
      const { key = null, ...rest } = props ?? {}
      if (children.length === 1) rest.children = children[0]
      else if (children.length > 1) rest.children = children
      return { type, key, props: rest }
    }

    function escapeHtml(text) {
      return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
    }

    function toHtml(node) {
      if (node === null || node === undefined || typeof node === 'boolean') return ''
      if (typeof node === 'string' || typeof node === 'number') return escapeHtml(node)
      if (Array.isArray(node)) return node.map(toHtml).join('')
      if (typeof node.type === 'function') return toHtml(node.type(node.props))

      const { children, ...attrs } = node.props
      const attrText = Object.entries(attrs)
        .filter(([, value]) => value !== false && value !== null && value !== undefined)
        .map(([name, value]) => {
          const htmlName = ATTR_NAMES[name] ?? name
          return value === true ? ` ${htmlName}` : ` ${htmlName}="${escapeHtml(value)}"`
        })
        .join('')
      if (VOID_TAGS.has(node.type)) return `<${node.type}${attrText}>`
      return `<${node.type}${attrText}>${toHtml(children)}</${node.type}>`
    }
    ```

    The check prints `<div class="box" id="a&quot;b"><h1>Fish &amp; Chips</h1><input disabled><ul><li>1</li><li>2</li></ul></div>`. Also `h('br', null)` returns `{ type: 'br', key: null, props: {} }`, and `toHtml(h('p', null, '<script>alert(1)</script>'))` returns `<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>`.

    This is the same idea as React: `h` is `createElement`, the tree is the element tree, and escaping every text value is why `{value}` in JSX is safe. (Real React is more complex: it keeps the tree and updates the DOM instead of building a string.)

    </details>

12. **(Hard)** Explain: why does a React element have a `$$typeof` field whose value is a Symbol? What attack does it stop, and what happens to a fake element that arrives as JSON?

    <details>
    <summary>Show answer</summary>

    React uses `$$typeof` to confirm that an object was really made by `jsx` or `createElement`. In React 19 it is `Symbol.for('react.transitional.element')`.

    A Symbol cannot be represented in JSON. So if your server returns attacker-controlled JSON and your app puts it where children go, the object cannot carry the secret field. Without the check, a fake `{ type, props }` object (for example one with `dangerouslySetInnerHTML`) could be treated like a real element.

    With the check, `render(<div>{JSON.parse('{"type":"b","props":{"children":"x"},"key":null}')}</div>)` throws "Objects are not valid as a React child (found: object with keys {type, props, key})". Code that already runs in your page could still call `Symbol.for` itself, so this only closes the JSON route. It is defence in depth, not a reason to skip input validation.

    </details>

## Recap
- JSX is a syntax extension for JavaScript. It is not HTML and not a string. A build tool compiles it away before the browser sees it.
- Each tag becomes a `jsx(type, props)` call that returns a plain, frozen element object: `$$typeof`, `type`, `key`, `props`.
- The call explains the rules: one root (or a Fragment), braces hold expressions only, a capital letter means a variable (a component), lowercase means an HTML tag.
- Close every tag, use camelCase (`className`, `htmlFor`, `tabIndex`, `onClick`), keep `aria-*` and `data-*` with hyphens, and use `{/* comments */}`.
- Strings and numbers draw text. `null`, `undefined`, `true` and `false` draw nothing. `0` and `NaN` are drawn, which causes the `0 &&` bug. Objects throw an error.
- `style` takes an object with camelCase keys (numbers mean pixels). `disabled="false"` is still disabled. Spread order matters: later wins.
- The automatic runtime means no `import React`. React 19 expects it, and Vite sets it up for you.
- `{value}` is escaped, so it is safe from XSS. The risks are `dangerouslySetInnerHTML`, user-supplied URLs and spreading untrusted objects.

## Where to go next
- Next lesson: [Components and props](04-components-and-props.md), where function components, `children` and one-way data flow build on what you just learned.
- [State and events](05-state-and-events.md) covers `onClick` and friends. [Conditional rendering and lists](06-conditional-rendering-and-lists.md) covers the `0` pitfall in depth, `map` and keys. [Forms](07-forms.md) covers `value`, `defaultValue` and `onChange`.
- Related deep dives: [Styling](../03-intermediate/07-styling.md), Tooling with Vite and ESLint (planned), [How React renders](../04-advanced/01-how-react-renders.md), [Security and i18n](../04-advanced/10-security-and-i18n.md).
- Revise: the JSX section of the patterns and syntax cheatsheet (planned) and the gotchas list (planned).
- Test yourself: Round 1, basics questions (planned) and Round 2, fundamentals questions (planned).
- Practice app: start with [01 Counter](../practice-app/exercises/react/01-counter/README.md) and [09 Character counter](../practice-app/exercises/react/09-character-counter/README.md); both are plain JSX with a little state.
