# Components and Props

> **Level:** Beginner   **Time:** about 50 minutes   **Read first:** [JSX](03-jsx.md), [JavaScript for React](01-javascript-for-react.md)

## What you will learn
- Write function components, name them correctly, and use them like HTML tags.
- Pass data into a component with props: destructuring, default values, and values of any type.
- Explain why props are read-only and why data flows one way, from parent to child.
- Build flexible wrappers with `children`, and let a child talk to its parent through a function prop.
- Spot prop drilling, fix it, and know what replaced `defaultProps` and `PropTypes` in React 19.
- Recognise a class component, and build a ProfileCard list from scratch.

## 1. A component is a function that returns UI

A **component** is a JavaScript function that returns **JSX**, a description of what should appear on the screen. You write the piece once and use it as many times as you like.

The best way to think about it: a component is a normal function. Data goes in, and a piece of UI comes out. The data that goes in is called **props** (you meet them in section 4).

```jsx
function Greeting() {
  return <h1>Hello, React!</h1>
}

export default function App() {
  return (
    <div>
      <Greeting />
      <Greeting />
    </div>
  )
}
```

**What happens, step by step:**
1. React **renders** `App`. "Render" means React calls your function to find out what should be on screen.
2. `App` returns a `div` that holds two `<Greeting />` tags.
3. React sees that `Greeting` is a function, so it calls it. It does this once for each tag.
4. Each call returns an `h1`. The page ends up with this HTML:

```html
<div><h1>Hello, React!</h1><h1>Hello, React!</h1></div>
```

5. The two headings are independent copies. Nothing is shared between them.

You can also write a component as an arrow function: `const Greeting = () => <h1>Hello, React!</h1>`. Both styles work the same. This book uses the `function` keyword because it is easy to spot.

**Common mistake:** forgetting `return`. With curly braces, a function needs an explicit `return`.

```jsx
// Wrong: the JSX is written but never returned
function Greeting() {
  <h1>Hello, React!</h1>
}

// Fixed
function Greeting() {
  return <h1>Hello, React!</h1>
}
```

The wrong version shows nothing on the page. In React 19.3.1 it does not even log an error, so the bug is easy to miss. Always check that your component returns something.

## 2. The naming rule: a capital first letter

A component name must start with a **capital letter**: `Greeting`, `ProfileCard`. A name that starts with a lowercase letter is treated as a built-in HTML tag.

**Why?** JSX has to decide, for every tag, whether you mean an HTML element or one of your functions. It uses the first letter as the signal. This is what the compiler does (simplified):

```js
// <div />       is turned into a call with a STRING: a built-in HTML tag
jsx('div', {})

// <Greeting />  is turned into a call with a VARIABLE: your function
jsx(Greeting, {})
```

A lowercase name becomes a string, so React looks for an HTML element with that name. A capital name becomes a variable, so React looks up your function. (The [JSX lesson](03-jsx.md) covers how JSX is compiled.)

**Common mistake:** a lowercase component name.

```jsx
function greeting() {
  return <h1>Hello!</h1>
}

export default function App() {
  return <greeting />
}
```

React does not call `greeting`. It puts an unknown HTML element in the page:

```html
<greeting></greeting>
```

The console shows an error that says the tag is unrecognized and tells you to start the name with an uppercase letter. The fix is to rename the function to `Greeting`.

### Component, element, and the call you never make

These two words are easy to mix up.

- A **component** is the function: `Greeting`.
- An **element** is a small plain object that describes one thing to show. Writing `<Greeting name="Asha" />` creates an element. It does **not** run the function yet.

```jsx
function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>
}

const element = <Greeting name="Asha" />

console.log(typeof Greeting)           // "function"  (the component)
console.log(typeof element)            // "object"    (the element)
console.log(element.type === Greeting) // true
console.log(element.props)             // { name: 'Asha' }
```

Think of the element as an order slip ("one Greeting, with name Asha") and the component as the kitchen that cooks it. React reads the slips and calls the right functions at the right time.

This is also why you never call a component yourself, as in `Greeting({ name: 'Asha' })`. Always write `<Greeting name="Asha" />`. Only then can React give the component its own place in the tree, its own state, and the right moment to run.

## 3. Using a component like a tag, and splitting a UI

Once a component exists, you use it like an HTML tag. Real pages are built by splitting the screen into pieces, each with one job.

```jsx
function SiteHeader() {
  return (
    <header>
      <h1>Pocket Recipes</h1>
      <nav>
        <a href="/">Home</a> <a href="/about">About</a>
      </nav>
    </header>
  )
}

function RecipeCard() {
  return (
    <article>
      <h2>Tomato soup</h2>
      <p>Ready in 20 minutes.</p>
    </article>
  )
}

function SiteFooter() {
  return <footer>Made with React</footer>
}

export default function App() {
  return (
    <>
      <SiteHeader />
      <main>
        <RecipeCard />
        <RecipeCard />
      </main>
      <SiteFooter />
    </>
  )
}
```

**What happens, step by step:**
1. `App` returns a fragment (`<>...</>`, an invisible wrapper, see the [JSX lesson](03-jsx.md)) with three parts.
2. React calls `SiteHeader`, then the two `RecipeCard` calls, then `SiteFooter`.
3. The output is a header, a `main` with two articles, and a footer.
4. Both cards say "Tomato soup", because the card has the text written inside it. We need a way to give each card its own data. That is the job of **props**.

**How to decide where to split:**
- Split out anything that **repeats** (a card, a list row, a button).
- Split out anything with **its own job** (a header, a search box, a footer).
- Draw boxes around parts of a design mockup. Each box that you can give a clear name is a candidate. The [Thinking in React lesson](08-thinking-in-react.md) does this in detail.
- Do not split too early. If you cannot find a good name for a piece, it probably does not need its own component yet.

## 4. Props: the argument of the function

**Props** (short for "properties") are the inputs of a component. You write them like HTML attributes. React collects all of them into **one object** and passes that object as the function's first and only argument.

```jsx
function Greeting(props) {
  return <h1>Hello, {props.name}!</h1>
}

export default function App() {
  return <Greeting name="Asha" />
}
```

**What happens, step by step:**
1. The tag `<Greeting name="Asha" />` becomes an element whose props object is `{ name: 'Asha' }`.
2. When React renders that element, it calls `Greeting({ name: 'Asha' })`.
3. Inside the function, `props.name` is `'Asha'`.
4. The function returns `<h1>Hello, {props.name}!</h1>`, which becomes this HTML:

```html
<h1>Hello, Asha!</h1>
```

Now we can fix the recipe cards from section 3. Each card gets its own data:

```jsx
function RecipeCard(props) {
  return (
    <article>
      <h2>{props.title}</h2>
      <p>Ready in {props.minutes} minutes.</p>
    </article>
  )
}

// Used like this:
// <RecipeCard title="Tomato soup" minutes={20} />
// <RecipeCard title="Pancakes" minutes={15} />
```

The two cards now show different text: "Tomato soup, 20 minutes" and "Pancakes, 15 minutes".

**Common mistake:** treating the parameter as the value instead of the whole object.

```jsx
// Wrong: `name` is the whole props object, { name: 'Asha' }
function Greeting(name) {
  return <h1>Hello, {name}!</h1>
}
```

React stops with the error `Objects are not valid as a React child (found: object with keys {name})`. Either write `props.name`, or destructure (next section).

## 5. Destructuring props

Writing `props.` everywhere gets noisy. JavaScript **destructuring** pulls values out of an object into variables. Do it right in the parameter list. (If destructuring is new to you, read [JavaScript for React](01-javascript-for-react.md) first.)

```jsx
function RecipeCard({ title, minutes }) {
  return (
    <article>
      <h2>{title}</h2>
      <p>Ready in {minutes} minutes.</p>
    </article>
  )
}
```

This is exactly the same as:

```jsx
function RecipeCard(props) {
  const { title, minutes } = props
  // ...
}
```

**What happens, step by step:**
1. React calls `RecipeCard({ title: 'Pancakes', minutes: 15 })`.
2. The `{ title, minutes }` in the parameter list takes the object apart.
3. `title` is `'Pancakes'` and `minutes` is `15`, ready to use in the JSX.

A bonus: the parameter list now documents which props the component uses. A reader sees the inputs at a glance.

**Common mistake:** a misspelled prop name. Nothing warns you.

```jsx
<RecipeCard titel="Typo" minutes={5} />
```

The component reads `title`, finds nothing, and gets `undefined`. React renders `undefined` as nothing, so you get an empty `<h2></h2>` and no error. Typos like this are one of the reasons teams use TypeScript (section 19).

## 6. Passing any value as a prop

A prop can hold any JavaScript value. The rule for the syntax is simple:

- A **string** can go in quotes: `title="Pancakes"`.
- **Everything else** goes in curly braces: `minutes={15}`, `tags={['a', 'b']}`, `onPing={handlePing}`.

Here is a component that reports the type of each prop it receives, and the tag that feeds it:

```jsx
function TypeReport({ text, count, countAsText, active, tags, user, onPing, icon }) {
  return (
    <ul>
      <li>text: {typeof text}</li>
      <li>count: {typeof count}</li>
      <li>countAsText: {typeof countAsText}</li>
      <li>active: {typeof active}</li>
      <li>tags: {Array.isArray(tags) ? 'array' : typeof tags}</li>
      <li>user: {typeof user}</li>
      <li>onPing: {typeof onPing}</li>
      <li>icon: {typeof icon}</li>
    </ul>
  )
}

export default function App() {
  return (
    <TypeReport
      text="hello"
      count={42}
      countAsText="42"
      active
      tags={['a', 'b']}
      user={{ name: 'Asha' }}
      onPing={() => {}}
      icon={<span>*</span>}
    />
  )
}
```

The list on the page reads:

```text
text: string
count: number
countAsText: string
active: boolean
tags: array
user: object
onPing: function
icon: object
```

**What happens, step by step:**
1. `text="hello"` is a string. `count={42}` is a number. The braces let you pass real JavaScript values.
2. `countAsText="42"` is a **string** that looks like a number. Quotes always make a string.
3. `active` with no value is shorthand for `active={true}`. It arrives as the boolean `true`.
4. `tags` is an array and `user` is an object. Objects and arrays need braces, and an object literal needs a second pair: `user={{ name: 'Asha' }}`. The outer braces mean "JavaScript value here". The inner braces are the object itself. There is no special "double brace" syntax.
5. `onPing` is a function. You can pass functions down (section 10).
6. `icon={<span>*</span>}` is **JSX itself**. An element is a value like any other, so you can pass it as a prop.

**Common mistake:** quotes around a number.

```jsx
// Wrong: start is the string "5", so start + 1 is "51"
<Counter start="5" />

// Fixed: start is the number 5, so start + 1 is 6
<Counter start={5} />
```

## 7. Default values

Sometimes a prop is optional. Give it a default with a normal **default parameter** in the destructuring:

```jsx
function Button({ label = 'Click me', variant = 'primary' }) {
  return <button className={`btn btn-${variant}`}>{label}</button>
}
```

Here is what each tag produces:

```jsx
<Button />                        // <button class="btn btn-primary">Click me</button>
<Button label="Save" variant="danger" />
                                  // <button class="btn btn-danger">Save</button>
<Button label={undefined} />      // <button class="btn btn-primary">Click me</button>
<Button label={null} />           // <button class="btn btn-primary"></button>
<Button label="" />               // <button class="btn btn-primary"></button>
<Button label={0} />              // <button class="btn btn-primary">0</button>
```

**What happens, step by step:**
1. A default parameter is plain JavaScript. It applies **only when the value is `undefined`**.
2. If the prop is left out, its value is `undefined`, so the default is used.
3. `null`, an empty string and `0` are real values. They do **not** trigger the default.

### defaultProps is gone for function components

Older tutorials set defaults with a property on the function:

```jsx
// Old style. Do not write this in React 19.
function Badge({ text }) {
  return <span>[{text}]</span>
}

Badge.defaultProps = { text: 'new' }
```

In React 19 this is **silently ignored** for function components. The code above renders `[]`, not `[new]`, and there is no warning. React 18.3 printed a warning to help people migrate; React 19 removed the feature. Use default parameters instead. Class components still support `static defaultProps` (section 20).

## 8. Props are read-only

A component must **never change its own props**. They belong to the parent. The child may only read them.

```jsx
// Wrong: changing a prop
function Shout(props) {
  props.name = props.name.toUpperCase()
  return <h1>{props.name}</h1>
}
```

In development, React freezes the props object, so this fails at once:

```text
TypeError: Cannot assign to read only property 'name' of object '#<Object>'
```

The fix is to leave the prop alone and compute a new value:

```jsx
function Shout({ name }) {
  const loud = name.toUpperCase()
  return <h1>{loud}</h1>
}
```

**Why is this a rule?**
- **The data is not yours.** The parent passed it in. If the child changes it, the parent's data changes behind its back.
- **The screen goes out of date.** React only redraws when something tells it to (state changing, section 14). A silent change does not tell React anything.
- **Predictability.** If only the owner can change a value, then to find a bug you look in one place.
- **Purity.** React expects a component to be a pure function of its inputs (section 12).

The freeze is shallow. React freezes the props object, but not the objects inside it. Here is what happens when a child mutates a nested object:

```jsx
const user = { name: 'Asha' }

function Rename({ user }) {
  user.name = 'Ben' // wrong: changes the parent's object
  return <p>Child sees {user.name}</p>
}

function App() {
  return (
    <>
      <p>Parent sees {user.name}</p>
      <Rename user={user} />
    </>
  )
}
```

```html
<p>Parent sees Asha</p><p>Child sees Ben</p>
```

There is no error. The page shows two different names for one object, and `user.name` is now `'Ben'` everywhere else in your code. That is a nasty bug. The rule holds for nested values too: **never mutate anything you received as a prop.**

If a child needs the data changed, it asks the owner to change it, through a function prop (section 10). If it needs a changed copy for display, it makes a copy: `const renamed = { ...user, name: 'Ben' }`.

## 9. children and composition

Some props are not simple values. Sometimes you want to put content **between** the opening and closing tags of your component, the way you write `<div>content</div>`. React hands that content to the component in a special prop called **`children`**.

```jsx
function Card({ title, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="card-body">{children}</div>
    </section>
  )
}

export default function App() {
  return (
    <Card title="Welcome">
      <p>Thanks for joining.</p>
      <button>Get started</button>
    </Card>
  )
}
```

The result:

```html
<section class="card">
  <h2>Welcome</h2>
  <div class="card-body">
    <p>Thanks for joining.</p>
    <button>Get started</button>
  </div>
</section>
```

**What happens, step by step:**
1. `App` writes a paragraph and a button between `<Card>` and `</Card>`.
2. React packs them into `props.children`. The props object is `{ title: 'Welcome', children: [...] }`.
3. `Card` draws its own frame (the `section`, the title) and places `{children}` where the content should go.
4. `Card` knows nothing about what is inside. It could hold a form, a chart or plain text.

This idea is called **composition**: building bigger pieces by putting smaller pieces inside them. `Card` is a reusable shell, and the parent decides what goes in it.

### What can children be?

`children` takes the shape of whatever you wrote. This is what a component sees:

| What you write between the tags | `typeof` (or array) of `children` |
| --- | --- |
| nothing, `<ShowChildren />` | `undefined` |
| text, `hi` | `string` |
| one element, `<b>hi</b>` | `object` (an element) |
| two or more, `<b>a</b><b>b</b>` | an array |
| `{() => 'x'}` | `function` |

You almost never check this. You just write `{children}` and React renders it. (A function as children is the "render prop" pattern, covered in [Component patterns](../03-intermediate/01-component-patterns.md).)

### Several slots

`children` is one slot. When a layout needs more places to fill, use extra props. JSX is a normal value, so a prop can hold it:

```jsx
function PageLayout({ header, sidebar, children }) {
  return (
    <div className="page">
      <header>{header}</header>
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <PageLayout header={<h1>Dashboard</h1>} sidebar={<nav>Menu</nav>}>
      <p>Main content</p>
    </PageLayout>
  )
}
```

```html
<div class="page">
  <header><h1>Dashboard</h1></header>
  <aside><nav>Menu</nav></aside>
  <main><p>Main content</p></main>
</div>
```

`header` and `sidebar` are named slots. The paragraph goes into the default slot, `children`. React prefers this composition style over class inheritance for sharing UI.

**Common mistake:** forgetting to render `{children}`.

```jsx
// Wrong: children arrive but are never placed
function Card({ title }) {
  return (
    <section>
      <h2>{title}</h2>
    </section>
  )
}
```

The paragraph that the parent wrote inside `<Card>` never appears, and nothing complains. The output is just `<section><h2>Welcome</h2></section>`. The fix is to add `{children}` in the JSX.

## 10. Passing functions as props: child to parent

Data flows **down**, from parent to child. But a child often needs to tell its parent something: "the user clicked me", "the user picked blue". The answer is to pass a **function** down as a prop. The child calls it when something happens.

An analogy: the parent hands the child a phone number. The child can call it whenever it wants, but the parent decides who answers and what happens next.

```jsx
import { useState } from 'react'

function LikeButton({ onLike }) {
  return <button onClick={onLike}>Like</button>
}

export default function Post() {
  const [likes, setLikes] = useState(0)

  return (
    <div>
      <p>Likes: {likes}</p>
      <LikeButton onLike={() => setLikes(likes + 1)} />
    </div>
  )
}
```

A word about `useState`: it gives a component a memory. `likes` is the current value, and `setLikes` replaces it and asks React to redraw. The [next lesson](05-state-and-events.md) explains it fully. For now, only the function passing matters.

**What happens, step by step:**
1. `Post` creates the function `() => setLikes(likes + 1)` and passes it to `LikeButton` as the prop `onLike`.
2. `LikeButton` attaches it to the button: `onClick={onLike}`. (`onClick` is itself just a prop on a built-in element.)
3. The user clicks. React calls the function.
4. The function runs inside `Post`'s scope, so it can use `likes` and `setLikes`. (JavaScript calls this a closure.)
5. `setLikes` changes the state, so `Post` renders again and shows `Likes: 1`. After a second click it shows `Likes: 2`.

`LikeButton` never learns what `onLike` does. It just calls it. That keeps the button reusable.

**Naming habit:** name the prop `onSomething` (`onLike`, `onPick`, `onSubmit`). Name the function that handles it `handleSomething`. Then `onLike={handleLike}` reads naturally.

### Sending data up

The child can pass data as an argument when it calls the function:

```jsx
import { useState } from 'react'

function ColorPicker({ colors, onPick }) {
  return (
    <ul>
      {colors.map((color) => (
        <li key={color}>
          <button onClick={() => onPick(color)}>{color}</button>
        </li>
      ))}
    </ul>
  )
}

export default function App() {
  const [picked, setPicked] = useState('none')

  return (
    <>
      <p>Picked: {picked}</p>
      <ColorPicker colors={['red', 'green', 'blue']} onPick={setPicked} />
    </>
  )
}
```

**What happens, step by step:**
1. The page starts with `Picked: none` and three buttons.
2. Each button's click handler calls `onPick(color)` with its own color.
3. The parent passed `setPicked` itself as `onPick`, so the call is `setPicked('green')`.
4. State changes, `App` renders again, and the page shows `Picked: green`.

(The `key` on each `li` and the `map` call are explained in [Conditional rendering and lists](06-conditional-rendering-and-lists.md).)

**Common mistake:** calling the function while rendering instead of passing it.

```jsx
// Wrong: onPick(color) RUNS during render and passes its result to onClick
<button onClick={onPick(color)}>{color}</button>

// Fixed: pass a function that will call onPick later, on click
<button onClick={() => onPick(color)}>{color}</button>
```

With the wrong version, `onPick` is called three times (once per color) before anybody clicks anything, and React gives no warning. With state involved it often causes an endless render loop. Remember: `onClick={fn}` passes the function, while `onClick={fn()}` calls it right now.

## 11. One-way data flow

Put the last three sections together and you get React's data rule:

- **Data goes down** through props.
- **Events go up** through function props (callbacks).

```text
App                          owns the data (state)
 |   props go down
 v
ProfileList
 |   props go down
 v
ProfileCard   ---- onToggleFollow() ---->  App changes its state
                   (event goes up)         and renders again, new props go down
```

This is called **one-way data flow** (or "unidirectional data flow"). A child never reaches up and edits its parent's data. It asks, and the owner decides.

**Why it helps:**
- To find where a value comes from, you walk **up** the tree to the component that owns it. There is exactly one owner.
- Only the owner can change the value, so a bug has one place to hide.
- The UI is a function of the data: change the data, and React updates what depends on it.

Some other frameworks offer two-way binding, where an input and a variable stay in sync automatically. React does not. When you build forms in the [Forms lesson](07-forms.md), you will wire the value down and the change event up by hand. When two siblings must share data, you move the state to their closest common parent. That move is called "lifting state up" and is covered in [Thinking in React](08-thinking-in-react.md).

## 12. Pure components: same props, same output

React expects every component to be **pure**, like a maths function. This is the rule:

> Given the same props (and the same state and context), a component returns the same JSX. It does nothing else while rendering.

A recipe is a fair comparison: the same ingredients give the same dish, and cooking does not rearrange your kitchen.

Things that break purity during render:
- changing a variable that was created **before** the render started (a module-level variable, a prop, an object from outside);
- reading hidden changing inputs such as `Math.random()` or `Date.now()`;
- sending network requests or touching the DOM directly.

Changing a variable you created **inside** the component during that same render is fine. It is private to this render.

Here is a component that breaks the rule:

```jsx
let guestCount = 0

function Cup() {
  guestCount = guestCount + 1 // changes something outside the function
  return <h2>Cup for guest #{guestCount}</h2>
}

export default function Table() {
  return (
    <>
      <Cup />
      <Cup />
      <Cup />
    </>
  )
}
```

Rendered once without `StrictMode`, you see guests 1, 2 and 3, and it looks fine. A Vite project wraps the app in `<StrictMode>` in `main.jsx`. In development, `StrictMode` calls every component twice to flush out impure code. Now the page shows:

```text
Cup for guest #2
Cup for guest #4
Cup for guest #6
```

**What happens, step by step:**
1. `guestCount` lives outside the component, so each call to `Cup` changes shared data.
2. `StrictMode` calls each `Cup` twice. The counter goes up twice for every cup.
3. The screen shows the result of the second call: 2, 4, 6.
4. Even without `StrictMode`, any re-render would continue counting (4, 5, 6) because the same variable is reused. The component is wrong in every mode. `StrictMode` just makes the problem visible.

**The fix:** make the component depend only on its props.

```jsx
function Cup({ guest }) {
  return <h2>Cup for guest #{guest}</h2>
}

// <Cup guest={1} /> <Cup guest={2} /> <Cup guest={3} />
```

Now the output is always guests 1, 2 and 3, in `StrictMode` or not. Where do side effects go instead? In **event handlers** (reacting to a click) or in `useEffect` (syncing with the outside world). See [useEffect](../02-hooks/03-useeffect.md) and [How React renders](../04-advanced/01-how-react-renders.md).

Pure rendering is what lets React safely skip work, and pause, repeat or throw away a render.

## 13. Spreading props

When a component wraps another one and should pass on "everything else", use the **rest** syntax in the destructuring and **spread** in the JSX:

```jsx
function PrimaryButton({ children, ...rest }) {
  return (
    <button className="btn-primary" {...rest}>
      {children}
    </button>
  )
}

// <PrimaryButton type="submit" disabled className="mine">Save</PrimaryButton>
```

**What happens, step by step:**
1. `{ children, ...rest }` takes out `children`. `rest` is an object with all the other props: `{ type: 'submit', disabled: true, className: 'mine' }`.
2. `{...rest}` in the JSX turns that object back into attributes on the `button`.
3. **Order matters.** A later attribute wins over an earlier one. Above, `rest` comes after `className="btn-primary"`, so the caller's `className="mine"` wins and the button gets `class="mine"`.
4. If you swap the order, `<button {...rest} className="btn-primary">`, your own class wins, and the button gets `class="btn-primary"`.

Spreading an object you own is also handy:

```jsx
const user = { name: 'Asha', role: 'Developer' }

<ProfileLine {...user} />
// same as <ProfileLine name="Asha" role="Developer" />
```

**Common mistake:** spreading everything onto a DOM element, including props the element does not understand.

```jsx
function Box({ children, ...rest }) {
  return <div {...rest}>{children}</div>
}

// <Box isActive>Hi</Box>
```

React shows a console warning that it does not recognize the `isActive` prop on a DOM element, and the attribute is dropped. Pick the props you pass on, or take out your own props before spreading the rest: `function Box({ isActive, children, ...rest })`.

Use spread for real "pass the rest through" wrappers. Do not use it to hide what a component needs. A long list of explicit props is easier to read and review.

## 14. Props vs state

Props and state both hold data, and both are read when a component renders. They answer different questions.

| Question | Props | State |
| --- | --- | --- |
| Who owns it? | The parent, which passes it in | The component itself |
| Can this component change it? | No, read-only | Yes, through its setter function |
| Where does it start? | From the parent's JSX | From `useState(initialValue)` |
| Like what in plain JavaScript? | Function arguments | Variables the function remembers between calls |

One more link between them: one component's **state is very often a child's props**. In the ColorPicker above, `picked` is state in `App`. If `App` passed `picked` to a child, it would be a prop there. The [next lesson](05-state-and-events.md) teaches state in detail.

## 15. A component renders again when its parent renders

When a parent renders, React calls its children again. This happens **even if the child's props are exactly the same**.

```jsx
import { useState } from 'react'

function Child({ label }) {
  console.log('Child render')
  return <p>{label}</p>
}

export default function Parent() {
  const [n, setN] = useState(0)
  console.log('Parent render')

  return (
    <>
      <button onClick={() => setN(n + 1)}>Count {n}</button>
      <Child label="Static" />
    </>
  )
}
```

The console after the first render and then two clicks (without `StrictMode`):

```text
Parent render
Child render
Parent render
Child render
Parent render
Child render
```

**What happens, step by step:**
1. The first render calls `Parent`, which creates `<Child />`, so `Child` is called too.
2. A click changes `Parent`'s state, so `Parent` renders again.
3. React calls `Child` again. `label` is still `"Static"`, but React does not compare it first. By default it simply re-runs the function.
4. Rendering is not the same as changing the page. React compares the new output with the old one and only touches the real DOM where something differs. Re-running a small component is cheap, so do not worry about it early on.

With `StrictMode` in development, each line is logged twice (the double call from section 12).

There is a neat trick: content passed **from above** does not re-render when the wrapper's own state changes.

```jsx
import { useState } from 'react'

function Child() {
  console.log('Child render')
  return <p>child</p>
}

function Wrapper({ children }) {
  const [n, setN] = useState(0)
  console.log('Wrapper render')

  return (
    <div>
      <button onClick={() => setN(n + 1)}>Count {n}</button>
      {children}
    </div>
  )
}

export default function App() {
  return (
    <Wrapper>
      <Child />
    </Wrapper>
  )
}
```

After the first render and two clicks, the console shows `Wrapper render`, `Child render`, `Wrapper render`, `Wrapper render`. `Child` logs only once. The `<Child />` element was created by `App`. `App` did not render again (only `Wrapper`'s state changed), so React receives the very same element object as before and skips it. Composition can therefore remove needless renders without any special tools. For the full story, see [Memoization](../02-hooks/07-memoization.md) and [How React renders](../04-advanced/01-how-react-renders.md).

## 16. key and ref are special

Two attribute names look like props but are handled by React itself.

**`key`** tells React which item in a list is which, so it can track items when the list changes. React uses it and does **not** pass it on to your component.

```jsx
function Row(props) {
  return <li>{String(props.key)}</li>
}

// <ul><Row key="a" /></ul>
```

```html
<ul><li>undefined</li></ul>
```

`props.key` is `undefined`, and the console says that `key` is not a prop and suggests passing the value under a different name. If the child needs the id, pass it twice: `<Row key={item.id} id={item.id} />`. How to choose good keys is covered in [Conditional rendering and lists](06-conditional-rendering-and-lists.md).

**`ref`** gives you direct access to a DOM element or a value that survives renders. In React 19, `ref` is a **normal prop** for function components. You can destructure it and pass it on:

```jsx
import { useEffect, useRef } from 'react'

function TextInput({ ref, ...rest }) {
  return <input ref={ref} {...rest} />
}

export default function Form() {
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current.focus()
  }, [])

  return <TextInput ref={inputRef} placeholder="Name" />
}
```

**What happens, step by step:**
1. `Form` creates a ref with `useRef` and passes it to `TextInput` as the prop `ref`.
2. `TextInput` takes it out of its props and attaches it to the real `<input>`.
3. After the first render, React sets `inputRef.current` to the input element.
4. The effect calls `focus()`, and the input gets the cursor.

Before React 19 you had to wrap such a component in `forwardRef`. It still works and you will meet it in older code, but React's own documentation says it will be deprecated in a future release. New code should just take `ref` as a prop. More in [useRef](../02-hooks/04-useref.md).

## 17. Export default vs named exports, and file organization

Each component usually lives in its own file and is exported so other files can import it. There are two ways to export.

```jsx
// Default export: ONE per file
// Card.jsx
export default function Card({ children }) {
  return <div className="card">{children}</div>
}
// elsewhere: import Card from './Card.jsx'

// Named export: as many as you like per file
// Card.jsx
export function Card({ children }) {
  return <div className="card">{children}</div>
}
// elsewhere: import { Card } from './Card.jsx'
```

| | Default export | Named export |
| --- | --- | --- |
| Per file | Only one | Any number |
| Import name | The importer chooses any name | Must match (or rename with `as`) |
| Typo or rename safety | Weaker: `import Crd from ...` still works | Stronger: a wrong name is an error, and editors auto-import it |
| `lazy()` code splitting | Works directly | Needs a small wrapper, because `lazy` expects a default export |

Neither is wrong. React's documentation says to do what works best for your team. Many teams choose one style and stick with it. This book uses one default export per component file, which matches the Vite template, and a named export for plain data.

A tidy layout for a small app:

```text
src/
  main.jsx            starts the app (Vite creates this)
  App.jsx             the top component
  data.js             plain data, not a component
  components/
    Card.jsx
    ProfileCard.jsx
    ProfileList.jsx
```

**Habits that work well:**
- **One main component per file**, and the file has the same name in PascalCase (`ProfileCard.jsx`).
- A tiny helper component that only one file uses may live in that same file.
- Keep helper functions and constants in their own files. Vite's hot reload works best when a file exports only components.
- As the app grows, group by feature (`profile/`, `cart/`) instead of one large `components/` folder.

## 18. Prop drilling

A prop that has to pass through components that do not need it, just to reach a deep child, is called **prop drilling**. Here is a three-level example:

```jsx
export default function App() {
  const user = { name: 'Asha' }
  return <Page user={user} />
}

function Page({ user }) {
  return <Header user={user} />
}

function Header({ user }) {
  return <UserBadge user={user} />
}

function UserBadge({ user }) {
  return <span>Signed in as {user.name}</span>
}
```

**What happens, step by step:**
1. `App` owns `user`. Only `UserBadge`, three levels down, really uses it.
2. `Page` and `Header` do not use `user`. They only receive it and pass it on.
3. The page shows `Signed in as Asha`, so it works.

**Why it hurts as the app grows:**
- Adding a field, or renaming `user`, means editing every component on the path.
- `Page` and `Header` now depend on data they do not care about, so they are harder to reuse.
- With many props and many levels, the code gets noisy.

Drilling through one or two levels is perfectly fine. It is explicit and easy to follow. Reach for a fix when it starts to hurt. The options, in the order to try them:

**1. Restructure with composition.** Often the real problem is that the middle components build the child themselves. Let the owner build it and pass it in as `children`:

```jsx
export default function App() {
  const user = { name: 'Asha' }
  return (
    <Page>
      <Header>
        <UserBadge user={user} />
      </Header>
    </Page>
  )
}

function Page({ children }) {
  return <div className="page">{children}</div>
}

function Header({ children }) {
  return <header>{children}</header>
}

function UserBadge({ user }) {
  return <span>Signed in as {user.name}</span>
}
```

The output is `<div class="page"><header><span>Signed in as Asha</span></header></div>`. `App` hands `user` straight to `UserBadge`, and `Page` and `Header` know nothing about it.

**2. Use context.** For data that many components across the tree need (the current user, theme, language), context lets a deep child read it directly:

```jsx
import { createContext, useContext } from 'react'

const UserContext = createContext(null)

export default function App() {
  const user = { name: 'Asha' }
  return (
    <UserContext value={user}>
      <Page />
    </UserContext>
  )
}

function Page() {
  return <Header />
}

function Header() {
  return <UserBadge />
}

function UserBadge() {
  const user = useContext(UserContext)
  return <span>Signed in as {user.name}</span>
}
```

`<UserContext value={user}>` is the React 19 way to provide a value (older code writes `<UserContext.Provider value={user}>`). Context has its own costs, such as extra re-renders when the value changes, so use it for shared data and not as a replacement for every prop. Full details are in [useContext](../02-hooks/05-usecontext.md).

**3. Keep state close to where it is used.** If only one small part of the page needs some state, put the state in that part and not at the top.

**4. A state library** (Redux Toolkit, Zustand and others) for large apps with a lot of shared client state. See [State management](../03-intermediate/06-state-management.md).

## 19. Checking props: PropTypes vs TypeScript

React used to check props at run time with the `prop-types` package:

```jsx
// Old style
import PropTypes from 'prop-types'

function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>
}

Greeting.propTypes = {
  name: PropTypes.string.isRequired,
}
```

React 19 **removed these built-in checks**. A `propTypes` property on a function component is silently ignored: the validators never run and nothing is logged. (The separate `prop-types` package still exists and you can call it yourself, but nothing in React calls it for you.)

The modern answer is **TypeScript**. You describe the props once, and your editor and build tell you about mistakes before the app runs:

```tsx
import type { ReactNode } from 'react'

type ProfileCardProps = {
  name: string
  role?: string // the ? means optional
  skills?: string[]
  onFollow?: () => void
  children?: ReactNode
}

export default function ProfileCard({
  name,
  role = 'Team member',
  skills = [],
  onFollow,
  children,
}: ProfileCardProps) {
  return (
    <article>
      <h2>{name}</h2>
      <p>{role}</p>
      <p>{skills.join(', ')}</p>
      <button onClick={onFollow}>Follow</button>
      {children}
    </article>
  )
}
```

**What this gives you:**
- `<ProfileCard role="Designer" />` is underlined: the required property `name` is missing.
- `<ProfileCard name={42} />` is underlined: a number is not a string.
- A misspelled prop name (section 5) is caught immediately.
- The types disappear at build time, so they cost nothing at run time.

TypeScript only knows what is in your code. Data from outside, such as an API response, can still be anything, so it needs a run-time check with a schema library. The [TypeScript lesson](../03-intermediate/08-typescript-with-react.md) goes deeper.

## 20. Class components (legacy)

Before 2019, components with state had to be written as classes. Hooks arrived in React 16.8 and made function components able to do everything that matters. Classes still work and still appear in old code, in interview questions, and in a few special cases. Do not write new ones. Here is the same component both ways. First the class:

```jsx
import { Component } from 'react'

class Counter extends Component {
  static defaultProps = { label: 'Clicked' }
  state = { count: 0 }

  handleClick = () => {
    this.setState({ count: this.state.count + 1 })
  }

  render() {
    return (
      <button onClick={this.handleClick}>
        {this.props.label} {this.state.count} times
      </button>
    )
  }
}
```

And the function component:

```jsx
import { useState } from 'react'

function Counter({ label = 'Clicked' }) {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount(count + 1)
  }

  return (
    <button onClick={handleClick}>
      {label} {count} times
    </button>
  )
}
```

Both render `<button>Clicked 0 times</button>`, then `Clicked 1 times` after one click, and `Taps 0 times` when you pass `label="Taps"`.

**Side by side:**

| | Class | Function |
| --- | --- | --- |
| Props | `this.props.label` | the parameter, `{ label }` |
| Defaults | `static defaultProps` (still works for classes) | default parameters |
| State | `this.state` and `this.setState(...)` | `useState` |
| What you return | `render()` method | the function itself |
| Side effects | lifecycle methods like `componentDidMount` | `useEffect` |
| Reusing logic | HOCs and render props | custom hooks |
| `this` | you must bind handlers or use arrow fields | no `this` at all |

Function components are shorter, avoid `this`, and keep related logic together. That is why they won.

**What only classes can still do:** write an **error boundary** (a component that catches errors thrown by its children), and use the rare `getSnapshotBeforeUpdate` method. There is no function-component version of an error boundary yet, so React's documentation points to the `react-error-boundary` package for convenience. See [Error boundaries](../03-intermediate/05-error-boundaries-portals-and-friends.md). For how to read and migrate old class code, see Legacy React (planned).

## 21. Mini project: a ProfileCard list

Time to use everything. We will build a small team page: a list of profile cards with a Follow button on each, and a line that says how many people you follow.

Set up a project (see the [setup guide](../00-start-here/02-setup-your-playground.md) if you need help):

```bash
npm create vite@latest profile-cards -- --template react
cd profile-cards
npm install
npm run dev
```

Keep `src/main.jsx` as it is. You will replace `src/App.jsx` and add some files.

### Step 1: one static card

```jsx
// src/App.jsx
function ProfileCard({ name, role }) {
  return (
    <article className="profile-card">
      <h2>{name}</h2>
      <p>{role}</p>
    </article>
  )
}

export default function App() {
  return <ProfileCard name="Asha Rao" role="Frontend developer" />
}
```

Two props, destructured. The page shows a heading "Asha Rao" and a line "Frontend developer".

### Step 2: defaults, initials and a list of skills

```jsx
function ProfileCard({ name, role = 'Team member', skills = [] }) {
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .join('')

  return (
    <article className="profile-card">
      <div className="avatar" aria-hidden="true">
        {initials}
      </div>
      <h2>{name}</h2>
      <p>{role}</p>
      <ul>
        {skills.map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
    </article>
  )
}
```

- `role` and `skills` are optional, thanks to default parameters. `<ProfileCard name="Chen Li" skills={['Node.js']} />` shows the role "Team member".
- `initials` is a local variable computed during render. That keeps the component pure: "Chen Li" always gives "CL".
- `skills.map(...)` turns an array of strings into `li` elements. More on that in the [lists lesson](06-conditional-rendering-and-lists.md).

### Step 3: a reusable Card shell with children

Create `src/components/Card.jsx`:

```jsx
export default function Card({ children }) {
  return <div className="card">{children}</div>
}
```

Then wrap the contents of `ProfileCard` in `<Card>...</Card>` instead of `<article>`. `Card` is pure layout and can now frame anything else in your app.

### Step 4: data and a list

Create `src/data.js`:

```js
export const profiles = [
  { id: 1, name: 'Asha Rao', role: 'Frontend developer', skills: ['React', 'CSS', 'Testing'] },
  { id: 2, name: 'Ben Carter', role: 'Designer', skills: ['Figma', 'Accessibility'] },
  { id: 3, name: 'Chen Li', skills: ['Node.js'] },
]
```

Chen has no `role`, which will show the default. Next, `src/components/ProfileList.jsx` maps each profile to a card and gives every card a `key`:

```jsx
<ProfileCard key={person.id} {...person} />
```

The spread passes `name`, `role`, `skills` and also `id`. The card does not read `id`, so it is ignored. `key` is written first and separately, because React reads it for itself (section 16).

### Step 5: the Follow button (a function prop going up)

The card should not decide who is followed. It only shows a `following` flag and calls `onToggleFollow` when the button is clicked. The parent `App` owns the list of followed ids. This is one-way data flow in action: `following` goes down as a prop, and the click comes up through a callback.

### The finished code

`src/components/Card.jsx` is the shell from step 3. The other files:

```jsx
// src/components/ProfileCard.jsx
import Card from './Card.jsx'

export default function ProfileCard({
  name,
  role = 'Team member',
  skills = [],
  following = false,
  onToggleFollow,
}) {
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .join('')

  return (
    <Card>
      <div className="avatar" aria-hidden="true">
        {initials}
      </div>
      <h2>{name}</h2>
      <p>{role}</p>
      <ul className="skills">
        {skills.map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
      <button type="button" onClick={onToggleFollow}>
        {following ? 'Unfollow' : 'Follow'}
      </button>
    </Card>
  )
}
```

```jsx
// src/components/ProfileList.jsx
import ProfileCard from './ProfileCard.jsx'

export default function ProfileList({ profiles, followedIds, onToggleFollow }) {
  return (
    <div className="profile-list">
      {profiles.map((person) => (
        <ProfileCard
          key={person.id}
          {...person}
          following={followedIds.includes(person.id)}
          onToggleFollow={() => onToggleFollow(person.id)}
        />
      ))}
    </div>
  )
}
```

```jsx
// src/App.jsx
import { useState } from 'react'
import ProfileList from './components/ProfileList.jsx'
import { profiles } from './data.js'
import './profile.css'

export default function App() {
  const [followedIds, setFollowedIds] = useState([])

  function toggleFollow(id) {
    if (followedIds.includes(id)) {
      setFollowedIds(followedIds.filter((followedId) => followedId !== id))
    } else {
      setFollowedIds([...followedIds, id])
    }
  }

  return (
    <main>
      <h1>Team</h1>
      <p>
        Following {followedIds.length} of {profiles.length}
      </p>
      <ProfileList
        profiles={profiles}
        followedIds={followedIds}
        onToggleFollow={toggleFollow}
      />
    </main>
  )
}
```

```css
/* src/profile.css */
.profile-list { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); }
.card { border: 1px solid rgba(127, 127, 127, 0.5); border-radius: 0.5rem; padding: 1rem; }
.avatar { display: grid; place-items: center; width: 3rem; height: 3rem; border-radius: 50%; background: #4f46e5; color: white; font-weight: bold; }
.skills { display: flex; flex-wrap: wrap; gap: 0.25rem; padding: 0; list-style: none; }
.skills li { padding: 0.1rem 0.5rem; border-radius: 0.25rem; background: rgba(127, 127, 127, 0.2); font-size: 0.85rem; }
```

The Vite template also ships its own styles in `src/index.css`. If the page looks squeezed to one side, empty that file.

**What happens, step by step:**
1. `App` owns the only state, `followedIds`, which starts as an empty array. It shows `Following 0 of 3`.
2. `App` passes `profiles`, `followedIds` and the function `toggleFollow` down to `ProfileList`.
3. `ProfileList` makes one `ProfileCard` per profile. For each one it works out `following` (is this id in the list?) and wraps `toggleFollow` so the card does not need to know about ids: `() => onToggleFollow(person.id)`.
4. `ProfileCard` is a presentational component. It shows the data it was given and calls `onToggleFollow` on click. It has no state at all.
5. The user clicks Follow on Asha. The wrapper calls `toggleFollow(1)`. `App` sets `followedIds` to `[1]`.
6. `App` renders again and passes new props down. The summary reads `Following 1 of 3`, and Asha's button now reads `Unfollow`. A second click on the same button removes her again.
7. Chen's card shows the role "Team member" because `role` was missing and the default parameter filled it in.

**Stretch goals:**
- Add a `Badge` component and show a "New" badge on one card, passed as a prop.
- Add a `Card` `title` slot, using the `header` pattern from section 9.
- Move the follow count into its own `FollowSummary` component that receives `count` and `total`.

For more practice with props, children and callbacks, try [06 - Star rating](../practice-app/exercises/react/06-star-rating/README.md) (optional props, a callback going up) and [08 - Temperature converter](../practice-app/exercises/react/08-temperature-converter/README.md) (a child with no state, controlled by its parent).

## How interviewers test this

- **Definitions first.** Props, props vs state, children and "can a child change props" are common warm-ups. A strong answer is short and exact: props are read-only inputs owned by the parent, state is the component's own memory.
- **Data flow.** They want to hear "data down, events up" and see you pass a callback to send information to a parent. Red flag: saying a child can modify the parent's data directly.
- **Prop drilling.** A strong answer names the problem, tries composition and moving state first, then context, and only then a state library. Red flag: "just use Redux for everything".
- **Purity and mutation.** They may show code that mutates a prop, or reads `Math.random()` while rendering, and ask what is wrong. Red flag: mutating props or state objects in place.
- **Current knowledge.** `defaultProps` and `propTypes` no longer work on function components in React 19, `ref` is a normal prop, and classes are legacy. Red flag: teaching `defaultProps` for functions, or saying classes are the main way to write components.
- **Live coding.** You get a mockup and must split it into components, name them well, pass props, and wire a callback. They watch for stable keys, small components, and no state where props would do.

## Interview questions and model answers

### Q1. What are props, and how does a component receive them? (Easy)
Props (short for properties) are the inputs of a component. You write them like HTML attributes. React gathers them into a single object and passes it as the first argument of the function, so you usually destructure it: `function Greeting({ name })`. Props flow from parent to child, can be any JavaScript value (strings, numbers, objects, arrays, functions, even JSX), and are read-only for the component that receives them.

### Q2. What is the difference between props and state? (Easy)
Props are passed in by the parent and are read-only for the child. State is memory owned by the component itself, created with `useState`, and changed only through its setter. Changing either one leads to a re-render. A helpful way to remember it: props are like function arguments, and state is like variables that the function remembers between calls. A parent's state is often passed down as a child's props.

### Q3. What is the difference between function and class components? (Easy)
Both return UI from props. A class uses `this.props`, `this.state`, `setState` and lifecycle methods. A function is a plain function that uses hooks (`useState`, `useEffect`) for state and effects. Since hooks arrived in React 16.8, function components do everything that matters, with less code, no `this`, and logic reuse through custom hooks. Classes still work and appear in older code. The main thing only classes can still do is be an error boundary. New code should use functions.

### Q4. What is one-way data flow, and why does React use it? (Easy)
Data moves in one direction, from parent to child, through props. A child cannot reach up and edit its parent's data. To send information up, the parent passes a callback down and the child calls it. This makes the app predictable: every value has one owner, so to find a bug you walk up the tree to that owner. It also means the UI is simply a function of the current data.

### Q5. What is prop drilling, and how do you avoid it? (Medium)
Prop drilling means passing a prop through several components that do not use it, only so a deep child can read it. It makes code noisy and hard to change, because every component on the path must be edited. First, look at the structure: pass the finished element down as `children` or a named slot, or move the state closer to where it is used. For data many components need, such as theme or current user, use context. For large, shared client state, use a state library. A level or two of drilling is fine.

### Q6. Can a child component change the props it receives? Why are props read-only? (Easy)
No. A component must treat its props as read-only. The data belongs to the parent, and a silent change in the child would change the parent's data without React knowing, so the screen would go out of date. React also expects components to be pure, so that it can render them more than once, or skip them. In development React freezes the props object, so `props.name = 'x'` throws a `TypeError`. The freeze is shallow, so mutating a nested object does not throw, but it is still wrong. To change data, call a function prop and let the owner update its state.

### Q7. How does a child send data to its parent? (Easy)
The parent passes a function down as a prop (for example `onPick`). The child calls that function when something happens and passes the data as arguments, such as `onPick(color)`. The function runs in the parent, which updates its state, and then new props flow back down. Be careful to pass `() => onPick(color)` to `onClick`, not `onPick(color)`, which would run during render.

```jsx
<button onClick={() => onPick(color)}>{color}</button>
```

### Q8. What is the `children` prop? (Easy)
`children` is a special prop holding whatever you write between a component's opening and closing tags. It lets a component wrap content it knows nothing about, as in `<Card><p>Hi</p></Card>`. The component renders it with `{children}`. It can be text, an element, an array of elements, or nothing (`undefined`). This is composition, and React prefers it over inheritance. For several slots, use named props that hold JSX, such as `header` and `sidebar`.

### Q9. How do you set default prop values today? What about `propTypes`? (Medium)
Use normal default parameters: `function Button({ label = 'Click me' })`. The default applies only when the value is `undefined`, not for `null`, `""` or `0`. `defaultProps` on function components is ignored in React 19 (it was removed, after React 18.3 warned about it). Class components can still use `static defaultProps`. The built-in `propTypes` check is also removed and is silently ignored. Use TypeScript to describe and check props, and a schema library for data from outside your code.

### Q10. Why must component names start with a capital letter? (Easy)
JSX uses the first letter to decide what a tag means. A lowercase name such as `<div>` is compiled to a string, a built-in HTML tag. A capitalised name such as `<Greeting />` is compiled to a variable reference, your component. If you write `<greeting />`, React creates an unknown HTML element named `greeting` and logs a warning, and your function never runs.

### Q11. What is the difference between a React element and a component? (Medium)
A component is a function that takes props and returns UI. An element is a small plain object that describes what to show: it has a `type` and `props`. Writing `<Greeting name="Asha" />` creates an element whose `type` is the `Greeting` function. It does not call the function. React reads elements and calls the components at render time. A DOM element in the browser is a third thing again. React elements are only descriptions.

```jsx
const element = <Greeting name="Asha" />
element.type === Greeting // true
element.props             // { name: 'Asha' }
```

### Q12. What does it mean for a component to be pure? (Medium)
A pure component returns the same JSX for the same props, state and context, and has no side effects during render. It does not change variables created outside it, does not mutate its props, and does not read changing values like `Math.random()` or `Date.now()` while rendering. React relies on this to render components more than once, skip them, or pause and restart. `StrictMode` calls components twice in development to expose impurity. Side effects belong in event handlers or `useEffect`. (Do not mix this up with `React.PureComponent`, a legacy class feature about skipping re-renders.)

### Q13. When a parent re-renders, do its children re-render too? (Hard)
By default, yes. React calls the child again even when its props are identical, because it does not compare props first. That is usually cheap, and React only updates the real DOM where the output differs. Two ways to avoid the extra work: pass the child in as `children` or another prop from a component that is not re-rendering, so React gets the same element object and skips it; or wrap the child in `React.memo`. Measure before optimising. The React Compiler can also add this skipping automatically.

### Q14. What is the difference between controlled and presentational components? (Medium)
These are two different ideas. A **presentational** component is about how things look: it gets data and callbacks through props, usually has no state of its own, and is easy to reuse and test (`Card`, `Avatar`). Its counterpart, the **container** (or "smart") component, is about how things work: it owns state, fetches data and passes it down. The strict split is an older pattern, and custom hooks now carry most of the logic. A **controlled** component, usually a form field, gets its current value from props and reports changes through a callback, so the parent holds the single source of truth. Its counterpart is the **uncontrolled** component, which keeps its own value.

### Q15. Are `key` and `ref` normal props? (Hard)
`key` is not a prop. React uses it to track list items and does not pass it to the component, so reading `props.key` gives `undefined` and a console message. If the child needs the value, pass it under another name too. `ref` is different in React 19: for function components it is a normal prop, so you can destructure it and attach it to an element. Before 19 you needed `forwardRef` for this. `forwardRef` still works but is on its way out.

## Common mistakes and gotchas
- **Lowercase component name** (`<profileCard />`): React treats it as an HTML tag. Start the name with a capital letter.
- **Forgetting `return`** (curly braces, no `return`): the component renders nothing and gives no error. Return the JSX.
- **Mutating props**, including nested objects and arrays: copy first (`{ ...user, name: 'Ben' }`), and ask the owner to change data through a function prop.
- **Calling a handler during render** (`onClick={handle(id)}`): wrap it, as in `onClick={() => handle(id)}`.
- **Forgetting `{children}`**: the content passed between the tags silently disappears. Render `{children}`.
- **Numbers in quotes** (`count="5"`): that is the string `"5"`. Use `count={5}`.
- **A misspelled prop name** (`titel`): you silently get `undefined`. Use TypeScript or lint rules, and check props in the browser.
- **Reading `props.key`**: it is always `undefined`. Pass the id as a second prop, such as `id`.
- **`defaultProps` or `propTypes` on a function component**: ignored in React 19. Use default parameters and TypeScript.
- **Defining a component inside another component**: each render creates a brand-new function, so React sees a different component type, throws away the old subtree and loses its state. Define components at the top level of the file.
- **Copying a prop into state** (`useState(props.value)`): the state ignores later changes to the prop. Use the prop directly, derive from it during render, or reset with a `key` (see [useState in depth](../02-hooks/02-usestate-in-depth.md)).
- **Spreading everything onto DOM elements** (`<div {...props} />`): unknown props cause warnings. Take out your own props first.
- **Calling a component like a function** (`Greeting()`): use `<Greeting />` so React can manage it.
- **Rendering an object** (`<p>{user}</p>`): React throws `Objects are not valid as a React child`. Render a field: `{user.name}`.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Predict the HTML for each of the four tags. Which ones show `friend`?

```jsx
function Hello({ name = 'friend' }) {
  return <p>Hello, {name}!</p>
}

// A: <Hello />
// B: <Hello name={null} />
// C: <Hello name="" />
// D: <Hello name={0} />
```

<details>
<summary>Show answer</summary>

```html
A: <p>Hello, friend!</p>
B: <p>Hello, !</p>
C: <p>Hello, !</p>
D: <p>Hello, 0!</p>
```

Only A shows `friend`. A default parameter applies only when the value is `undefined`, and a missing prop is `undefined`. `null` renders as nothing, `""` is an empty string, and `0` is a real number that React prints.

</details>

2. **(Easy)** Write a `Badge` component with a required `label` prop and an optional `color` prop that defaults to `"gray"`. It should render `<span className="badge badge-gray">New</span>` for the default color. Render three badges in `App`: "New" (default), "Sale" (red), "Beta" (blue).

<details>
<summary>Show answer</summary>

```jsx
function Badge({ label, color = 'gray' }) {
  return <span className={`badge badge-${color}`}>{label}</span>
}

export default function App() {
  return (
    <>
      <Badge label="New" />
      <Badge label="Sale" color="red" />
      <Badge label="Beta" color="blue" />
    </>
  )
}
```

Output:

```html
<span class="badge badge-gray">New</span><span class="badge badge-red">Sale</span><span class="badge badge-blue">Beta</span>
```

The default comes from the default parameter, the template string builds the class name, and the label is read from props.

</details>

3. **(Easy)** Nothing shows on the screen where the card should be, and the console has a warning. Explain what React does and fix it.

```jsx
function profileCard({ name }) {
  return <h2>{name}</h2>
}

export default function App() {
  return <profileCard name="Asha" />
}
```

<details>
<summary>Show answer</summary>

The component name starts with a lowercase letter, so JSX treats `<profileCard>` as a built-in HTML tag, not as your function. React never calls `profileCard`. It puts an unknown element in the page, `<profilecard name="Asha"></profilecard>`, which shows no text, and the console warns that the tag is unrecognized and that a component name must start with an uppercase letter.

Fix: rename the function and the tag to `ProfileCard`.

</details>

4. **(Easy)** Write an `Alert` component that takes a `type` prop (default `"info"`) and `children`. It renders a `div` with `role="alert"` and the class `alert alert-<type>`. Use it twice: once with the text "Saved.", and once with the type `error` and the content "Could not <b>save</b>." (with the word save in bold).

<details>
<summary>Show answer</summary>

```jsx
function Alert({ type = 'info', children }) {
  return (
    <div role="alert" className={`alert alert-${type}`}>
      {children}
    </div>
  )
}

export default function App() {
  return (
    <>
      <Alert>Saved.</Alert>
      <Alert type="error">
        Could not <b>save</b>.
      </Alert>
    </>
  )
}
```

Output:

```html
<div role="alert" class="alert alert-info">Saved.</div><div role="alert" class="alert alert-error">Could not <b>save</b>.</div>
```

`children` can be a plain string or a mix of text and elements. The component renders it with `{children}` and does not care which.

</details>

5. **(Medium)** This component is supposed to show a price with 20% tax. What goes wrong, and how do you fix it?

```jsx
function PriceTag(props) {
  props.price = props.price * 1.2
  return <p>Price: {props.price}</p>
}

// <PriceTag price={100} />
```

<details>
<summary>Show answer</summary>

It assigns to a prop. Props are read-only, and in development React freezes the props object, so rendering fails with:

```text
TypeError: Cannot assign to read only property 'price' of object '#<Object>'
```

Even if it did not throw, the component would be wrong, because the price belongs to the parent.

Fix: compute a new local value and leave the prop alone.

```jsx
function PriceTag({ price }) {
  const withTax = price * 1.2
  return <p>Price: {withTax}</p>
}
```

`<PriceTag price={100} />` now renders `<p>Price: 120</p>`.

</details>

6. **(Medium)** Build a `Stepper`. A `StepButton` child takes an `amount` and an `onStep` function prop, shows `+5` or `-1` as its label, and calls `onStep(amount)` when clicked. The parent `Stepper` keeps the total in state and shows `Total: N`. Render a `+5` button and a `-1` button. After clicking `+5` twice and `-1` once, the total should read 9.

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

function StepButton({ amount, onStep }) {
  return (
    <button onClick={() => onStep(amount)}>
      {amount > 0 ? `+${amount}` : amount}
    </button>
  )
}

export default function Stepper() {
  const [total, setTotal] = useState(0)

  return (
    <div>
      <p>Total: {total}</p>
      <StepButton amount={5} onStep={(amount) => setTotal(total + amount)} />
      <StepButton amount={-1} onStep={(amount) => setTotal(total + amount)} />
    </div>
  )
}
```

Data goes down (`amount`, the callback), and the event goes up (`onStep(amount)`). `StepButton` has no state and does not know what the total is. After `+5`, `+5`, `-1` the page shows `Total: 9`.

</details>

7. **(Medium)** After the page loads and you click the button twice, what does the console print? (Assume no `StrictMode`.) What changes with `StrictMode`?

```jsx
import { useState } from 'react'

function Child() {
  console.log('Child')
  return <p>child</p>
}

export default function Parent() {
  const [n, setN] = useState(0)
  console.log('Parent')

  return (
    <>
      <button onClick={() => setN(n + 1)}>+</button>
      <Child />
    </>
  )
}
```

<details>
<summary>Show answer</summary>

```text
Parent
Child
Parent
Child
Parent
Child
```

The first pair is the first render. Each click changes `Parent`'s state, so `Parent` renders again, and React calls `Child` again too, even though `Child` receives no props that changed (it has none at all). Re-rendering a parent re-renders its children by default.

With `StrictMode` in development, React calls each component twice per render, so every line appears twice (the initial log is `Parent`, `Parent`, `Child`, `Child`, and so on). This is a development check and does not happen in production.

</details>

8. **(Medium)** Without clicking anything, how many times is `onPick` called when this component first renders, and with what arguments? Then fix the code.

```jsx
function Picker({ colors, onPick }) {
  return (
    <ul>
      {colors.map((color) => (
        <li key={color}>
          <button onClick={onPick(color)}>{color}</button>
        </li>
      ))}
    </ul>
  )
}

// <Picker colors={['red', 'green', 'blue']} onPick={onPick} />
```

<details>
<summary>Show answer</summary>

Three times, with `'red'`, `'green'` and `'blue'`, before any click. `onPick(color)` is a function call, so it runs during render, and its return value (usually `undefined`) is what gets passed to `onClick`. Clicking then does nothing at all.

Fix: pass a function that calls `onPick` later.

```jsx
<button onClick={() => onPick(color)}>{color}</button>
```

Now there are no calls during render, and clicking the `green` button calls `onPick('green')` once.

</details>

9. **(Medium)** Refactor this prop-drilling example so that `Dashboard` and `Sidebar` no longer receive or pass `username`, but the page still shows `Welcome back, Asha!`.

```jsx
function Dashboard({ username }) {
  return <Sidebar username={username} />
}

function Sidebar({ username }) {
  return <Welcome username={username} />
}

function Welcome({ username }) {
  return <p>Welcome back, {username}!</p>
}

// <Dashboard username="Asha" />
```

<details>
<summary>Show answer</summary>

Let the owner build `Welcome` and pass it in as `children`:

```jsx
function Dashboard({ children }) {
  return <div className="dashboard">{children}</div>
}

function Sidebar({ children }) {
  return <aside>{children}</aside>
}

function Welcome({ username }) {
  return <p>Welcome back, {username}!</p>
}

export default function App() {
  const username = 'Asha'
  return (
    <Dashboard>
      <Sidebar>
        <Welcome username={username} />
      </Sidebar>
    </Dashboard>
  )
}
```

Output: `<div class="dashboard"><aside><p>Welcome back, Asha!</p></aside></div>`. `username` goes straight from `App` to `Welcome`. If many components across the app needed the username, context would be the next option.

</details>

10. **(Hard)** A teammate writes this. The list items are empty. Explain why, and fix it without losing the `key`.

```jsx
function Row(props) {
  return <li>{props.key}</li>
}

export default function List({ items }) {
  return (
    <ul>
      {items.map((item) => (
        <Row key={item.id} />
      ))}
    </ul>
  )
}
```

<details>
<summary>Show answer</summary>

`key` is reserved for React. It identifies list items and is not passed to the component, so `props.key` is `undefined` (and React logs a message saying `key` is not a prop). Also, the code never passes any text to `Row`.

Fix: keep `key` for React, and pass the data as normal props with their own names.

```jsx
function Row({ id, label }) {
  return <li data-id={id}>{label}</li>
}

export default function List({ items }) {
  return (
    <ul>
      {items.map((item) => (
        <Row key={item.id} id={item.id} label={item.label} />
      ))}
    </ul>
  )
}
```

</details>

11. **(Hard)** The page below shows guests in a strange order when the app runs inside `<StrictMode>` (the default in a Vite project). What does it show, why, and how do you fix it?

```jsx
let guestCount = 0

function Cup() {
  guestCount = guestCount + 1
  return <h2>Cup for guest #{guestCount}</h2>
}

export default function Table() {
  return (
    <>
      <Cup />
      <Cup />
      <Cup />
    </>
  )
}
```

<details>
<summary>Show answer</summary>

It shows guests 2, 4 and 6 (not 1, 2 and 3):

```text
Cup for guest #2
Cup for guest #4
Cup for guest #6
```

`Cup` is impure: it changes `guestCount`, a variable outside the function. In development `StrictMode` calls every component twice to expose exactly this, so the counter goes up twice per cup, and the page shows the result of the second call. Without `StrictMode` it only looks right on the very first render; a re-render would show 4, 5, 6.

Fix: make the output depend only on props.

```jsx
function Cup({ guest }) {
  return <h2>Cup for guest #{guest}</h2>
}

// <Cup guest={1} /> <Cup guest={2} /> <Cup guest={3} />
```

This shows guests 1, 2 and 3 in every mode.

</details>

12. **(Hard)** Convert this class component to a function component. Keep the behaviour: a default greeting of `Hello`, and a click counter. For `<Welcome name="Asha" />`, after one click the button must read `Hello, Asha! Clicks: 1`.

```jsx
import { Component } from 'react'

class Welcome extends Component {
  static defaultProps = { greeting: 'Hello' }
  state = { clicks: 0 }

  handleClick = () => {
    this.setState({ clicks: this.state.clicks + 1 })
  }

  render() {
    return (
      <button onClick={this.handleClick}>
        {this.props.greeting}, {this.props.name}! Clicks: {this.state.clicks}
      </button>
    )
  }
}
```

<details>
<summary>Show answer</summary>

```jsx
import { useState } from 'react'

function Welcome({ name, greeting = 'Hello' }) {
  const [clicks, setClicks] = useState(0)

  return (
    <button onClick={() => setClicks(clicks + 1)}>
      {greeting}, {name}! Clicks: {clicks}
    </button>
  )
}
```

Steps: `this.props.x` becomes the destructured parameter. `static defaultProps` becomes a default parameter (`greeting = 'Hello'`). `state` and `setState` become `useState`. The `render` method becomes the function body that returns the JSX, and there is no `this` to bind. After one click the button reads `Hello, Asha! Clicks: 1`.

</details>

## Recap
- A component is a function that returns JSX. Its name starts with a capital letter, and you use it as a tag (`<Greeting />`), never by calling it.
- Props are the single object passed to the function. Destructure them, and give optional ones a default parameter (`defaultProps` and `propTypes` no longer work on function components in React 19).
- Strings go in quotes, and everything else goes in braces. Props can be numbers, objects, arrays, functions or JSX.
- Props are read-only. Never mutate them or anything inside them; compute a new value, or ask the owner to change it.
- `children` is whatever sits between the tags, and it is the basis of composition (Card, Layout, slots).
- Data flows down through props, and events flow up through function props. A pure component gives the same output for the same props.
- A parent render re-runs its children. `key` is never passed on, while `ref` is a normal prop in React 19.
- Prop drilling: restructure with composition first, then context. Use TypeScript for prop checking. Know class components as legacy.

## Where to go next
- Next lesson: [State and events](05-state-and-events.md), where components get memory and respond to clicks.
- Then [Conditional rendering and lists](06-conditional-rendering-and-lists.md) for `map`, keys and empty states, and [Thinking in React](08-thinking-in-react.md) for splitting a design into components and lifting state up.
- Go deeper on composition in [Component patterns](../03-intermediate/01-component-patterns.md), and on context in [useContext](../02-hooks/05-usecontext.md).
- Practice in the app: [06 - Star rating](../practice-app/exercises/react/06-star-rating/README.md) and [08 - Temperature converter](../practice-app/exercises/react/08-temperature-converter/README.md).
- Test yourself: Round 1 basics quiz (planned) and Round 2 fundamentals (planned).
- Revise on one page: Patterns and syntax cheatsheet (planned).
