# Thinking in React

> **Level:** Beginner   **Time:** about 50 minutes   **Read first:** [Components and props](04-components-and-props.md), [State and events](05-state-and-events.md), [Forms](07-forms.md)

## What you will learn
- Follow the five-step method that turns a design into a React UI, and say it out loud in an interview.
- Split a mockup into a component hierarchy where every component has one job.
- Decide for every value whether it is props, state, or derived data that you calculate.
- Choose where state lives: the closest common parent, or lower down when only one component needs it.
- Build a searchable product table in five stages, and a two-input temperature converter by lifting state up.
- Explain composition over inheritance, single source of truth, inverse data flow, and the ways to avoid prop drilling.

## 1. The big picture: five steps and two arrows

A blank file is the hardest part of building a UI. You know what the screen should look like, but you do not know where to start. **Thinking in React** is a repeatable method for exactly this moment. It has five steps, and it works for a task list, a dashboard or a checkout page.

1. **Break the UI into a component hierarchy.** Draw a box around every piece of the mockup. One box becomes one component.
2. **Build a static version.** Write the components with props only. No state yet. Data flows down.
3. **Find the minimal state.** List the smallest set of values that can describe everything the user sees. Calculate the rest.
4. **Decide where the state lives.** Put it in the closest common parent of the components that use it.
5. **Add inverse data flow.** Give children functions to call, so they can ask the parent to change its state.

Two ideas sit under all five steps. You met both in the [components and props lesson](04-components-and-props.md). Here they become a design tool.

```text
            +---------------------------+
            |          Parent           |
            |     owns the state        |
            +---------------------------+
               |                     ^
   props go    |                     |   function calls
   DOWN (data) |                     |   go UP (requests)
               v                     |
            +---------------------------+
            |           Child           |
            |   shows the data, tells   |
            |   the parent what the     |
            |   user did                |
            +---------------------------+
```

- **Data flows down.** A parent passes values to its children as props. Props are read-only.
- **Events flow up.** A child cannot change the parent's data. It calls a function that the parent gave it, and the parent decides what to do.

An analogy: the parent owns a document, and the children are readers with view-only access. A reader who wants a change asks the owner. The owner edits the document, and every reader then sees the new version. Almost everything in this lesson is a variation on that story.

The rest of the lesson builds one app with the five steps. After that we look at the questions the steps raise: where state should live, why React prefers composition to inheritance, and how to avoid passing props through many layers.

## 2. The example we will build

A designer gives you a mockup, and the back end gives you some data. Your job is a **searchable product table**.

```text
+---------------------------------------------+
| [ Search...                               ] |
| [ ] Only show products in stock             |
|                                             |
| Name                 Price                  |
| ------------------------------------------- |
| Stationery                                  |
| Notebook             $4.50                  |
| Pen                  $1.20                  |
| Highlighter          $2.80    (name in red) |
| Electronics                                 |
| Keyboard             $39.00                 |
| Mouse                $19.00   (name in red) |
| Monitor              $129.00                |
+---------------------------------------------+
```

How it should behave:
- Typing in the search box shows only products whose name contains the text. Capital letters do not matter.
- Ticking the checkbox hides products that are out of stock.
- Products sit under category rows. A category with no matching products does not appear.
- The name of an out-of-stock product is red.

The data is a list of products, already sorted by category. One record looks like this:

```js
{ id: 4, category: 'Electronics', name: 'Keyboard', price: 39, stocked: true }
```

The full list of six products is in the code of stage 2. In a real app this array would come from an API (see [Data fetching](../03-intermediate/02-data-fetching.md)). Here it is a constant, so we can focus on the structure.

## 3. Step 1: break the UI into a component hierarchy

Look at the mockup and draw a box around every piece that has its own job. Give each box a name. Each box becomes a component. Boxes inside boxes become children.

How do you decide where one box ends and the next begins? Use these tests:

- **One job.** Can you describe the component in one short sentence without the word "and"? "Shows one product row" passes. "Draws the search box and filters the data and draws the rows" does not, so split it.
- **Match the data.** Your data and your UI usually have the same shape. We have a list of products, so we get a list of rows: one product is one `ProductRow`. Splitting along the data keeps props small and obvious.
- **Match the design.** The layers and groups in a designer's file often line up with components.
- **Reuse.** Anything that appears many times (a row, a card, a button) is a component.

Here are the boxes for our mockup:

```text
+-- FilterableProductTable ----------------------+
| +-- SearchBar -------------------------------+ |
| | [ Search...       ] [ ] In stock only      | |
| +--------------------------------------------+ |
| +-- ProductTable ----------------------------+ |
| | Name                               Price   | |
| | +-- ProductCategoryRow ------------------+ | |
| | | Stationery                             | | |
| | +----------------------------------------+ | |
| | +-- ProductRow --------------------------+ | |
| | | Notebook                         $4.50 | | |
| | +----------------------------------------+ | |
| +--------------------------------------------+ |
+------------------------------------------------+
```

And the same thing as a tree. A parent is above its children:

```text
FilterableProductTable
  |-- SearchBar
  |-- ProductTable
        |-- ProductCategoryRow   (one per category)
        |-- ProductRow           (one per product)
```

Five components, one tree. The tree is your map for the next four steps. Whenever you ask "who needs this data?", you look at the tree.

The output of step 1 is a set of empty shells with the right names and the right nesting:

```jsx
function FilterableProductTable() {
  return (
    <div>
      <SearchBar />
      <ProductTable />
    </div>
  )
}

function SearchBar() {
  return <div>search box and checkbox go here</div>
}

function ProductTable() {
  return (
    <div>
      <ProductCategoryRow />
      <ProductRow />
    </div>
  )
}

function ProductCategoryRow() {
  return <div>category name</div>
}

function ProductRow() {
  return <div>product name and price</div>
}

export default FilterableProductTable
```

**What happens, step by step:**
1. Each function is one box from the drawing. The name says what the box is.
2. The nesting in the JSX copies the tree: `FilterableProductTable` renders `SearchBar` and `ProductTable`, and `ProductTable` renders the two row components.
3. The text inside is a placeholder. The rows appear once here, but later they repeat once per category or product.
4. Nothing is real yet. The goal is only to agree on the pieces and their names. In an interview, writing these shells (or just saying the tree) takes two minutes and shows the interviewer your plan.

**Common mistake:** putting everything into one component.

```jsx
// Wrong: one component with five jobs
function App() {
  const [text, setText] = useState('')
  // ...filter the data, group by category, draw the search box, draw every row...
  return (/* 90 lines of JSX */)
}

// Fixed: each box has one job
function App() {
  return <FilterableProductTable products={PRODUCTS} />
}
```

A giant component is hard to read, hard to test, and hard to change without breaking something else. The opposite mistake also exists: a component for every single table cell. Split where a piece has a name and a job, not at every tag.

## 4. Step 2: build a static version

Now write the components again, this time with real markup and **props only**. No `useState`. The data goes in at the top and flows down.

Why not add behaviour right away? Because the two jobs are different. A static version needs a lot of typing and almost no thinking. Interactivity needs a lot of thinking and almost no typing. If you do them together, you do neither well. In an interview, a static version also gives you something working on the screen early.

A note on order. For a small app like this one, start at the top (`FilterableProductTable`) and work down. For a big app, many teams start at the bottom (the small leaf components) and build up, because the leaves are easy to test alone.

Here is the whole static version. It is one file you can paste into `src/App.jsx` of a Vite React app (see [Set up your playground](../00-start-here/02-setup-your-playground.md)).

```jsx
const PRODUCTS = [
  { id: 1, category: 'Stationery', name: 'Notebook', price: 4.5, stocked: true },
  { id: 2, category: 'Stationery', name: 'Pen', price: 1.2, stocked: true },
  { id: 3, category: 'Stationery', name: 'Highlighter', price: 2.8, stocked: false },
  { id: 4, category: 'Electronics', name: 'Keyboard', price: 39, stocked: true },
  { id: 5, category: 'Electronics', name: 'Mouse', price: 19, stocked: false },
  { id: 6, category: 'Electronics', name: 'Monitor', price: 129, stocked: true },
]

function ProductCategoryRow({ category }) {
  return (
    <tr>
      <th colSpan={2}>{category}</th>
    </tr>
  )
}

function ProductRow({ product }) {
  const name = product.stocked ? (
    product.name
  ) : (
    <span style={{ color: 'crimson' }}>{product.name}</span>
  )

  return (
    <tr>
      <td>{name}</td>
      <td>${product.price.toFixed(2)}</td>
    </tr>
  )
}

function ProductTable({ products }) {
  const rows = []
  let lastCategory = null

  products.forEach((product) => {
    if (product.category !== lastCategory) {
      rows.push(
        <ProductCategoryRow key={`category-${product.category}`} category={product.category} />,
      )
    }
    rows.push(<ProductRow key={product.id} product={product} />)
    lastCategory = product.category
  })

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  )
}

function SearchBar() {
  return (
    <div role="search">
      <input type="text" placeholder="Search..." aria-label="Search products" />
      <label>
        <input type="checkbox" /> Only show products in stock
      </label>
    </div>
  )
}

function FilterableProductTable({ products }) {
  return (
    <div>
      <SearchBar />
      <ProductTable products={products} />
    </div>
  )
}

export default function App() {
  return <FilterableProductTable products={PRODUCTS} />
}
```

**What happens, step by step:**
1. `App` renders `FilterableProductTable` and gives it the whole `PRODUCTS` array as the prop `products`.
2. `FilterableProductTable` renders `SearchBar` and passes `products` on to `ProductTable`. Data flows down.
3. `ProductTable` walks through the products in order. When a product's category differs from the previous one, it first adds a `ProductCategoryRow`. Then it adds the `ProductRow` for the product. This trick works because the data is **sorted by category**. If your data is not sorted, sort a copy of it first.
4. `ProductRow` chooses how to show the name: plain text when the product is in stock, a red `span` when it is not. It formats the price with `toFixed(2)`, so `39` becomes `$39.00`.
5. Each element in the `rows` list has a `key`, so React can tell the rows apart. See [Conditional rendering and lists](06-conditional-rendering-and-lists.md).

We ran this. The page shows these rows, and typing in the box or ticking the checkbox changes nothing in the table:

```text
Stationery
Notebook      $4.50
Pen           $1.20
Highlighter   $2.80      (name in red)
Electronics
Keyboard      $39.00
Mouse         $19.00     (name in red)
Monitor       $129.00
```

Two small details in the code are worth knowing:
- The search area is a `div` with `role="search"`, not a `<form>`. A form can submit and reload the page when the user presses Enter. A live filter does not need a submit at all.
- `style={{ color: 'crimson' }}` has two pairs of braces: the outer pair opens a JavaScript expression in JSX, the inner pair is the style object.

**Common mistake:** adding state in the static stage.

```jsx
// Wrong: ProductTable keeps its own copy of the data
function ProductTable({ products }) {
  const [rows, setRows] = useState(products)
  // ...
}

// Fixed: read the prop directly
function ProductTable({ products }) {
  // use products here
}
```

At this stage nothing should remember anything. The table must always show what its props say. A copy in state is a second place for the data to live, and it will not follow the prop when the prop changes (section 9 shows this with real output).

## 5. Step 3: find the minimal state

Now the thinking starts. **State** is data that changes over time and that the UI has to remember. Before you write any `useState`, ask three questions about every value, in this order:

1. **Does it stay the same over time?** Then it is not state. It is a constant.
2. **Is it passed in from a parent as props?** Then it is not state. The parent owns it.
3. **Can you calculate it from other state or props?** Then it is not state. It is **derived data**.

Whatever survives all three questions is state.

Let us check every value in our app:

| Value | Stays the same? | From a parent? | Can be calculated? | Verdict |
| --- | --- | --- | --- | --- |
| The list of products | yes in this demo | yes, props | - | props |
| The search text | no | no | no | **state** |
| The checkbox value | no | no | no | **state** |
| The filtered list of rows | no | no | yes, from the list + the text + the checkbox | derived |

Two pieces of state. The filtered list is not state, even though it changes when the user types. It changes *because* the state changed, and you can calculate it again from scratch at any time.

This rule has a name: keep your state **DRY** (Don't Repeat Yourself). Store the smallest set of values that describes the screen. Calculate everything else while rendering. "Smallest" is not the whole rule, though. The state must also be **complete**: from these values alone you must be able to rebuild the whole screen.

The output of step 3 is just two lines. They go into a component in step 4:

```jsx
const [filterText, setFilterText] = useState('')
const [inStockOnly, setInStockOnly] = useState(false)
```

**Why not store the filtered list too?** Because a second copy has to be kept in sync by hand, and one forgotten place is a bug. Here is a small searchable list that stores `visibleItems` in state. The text box updates both values. The Clear button forgets to.

```jsx
import { useState } from 'react'

const ITEMS = ['Notebook', 'Pen', 'Highlighter', 'Keyboard']

export default function SearchableList({ items = ITEMS }) {
  const [filterText, setFilterText] = useState('')
  const [visibleItems, setVisibleItems] = useState(items) // a second copy of what filterText already says

  function handleChange(e) {
    const text = e.target.value
    setFilterText(text)
    setVisibleItems(items.filter((item) => item.toLowerCase().includes(text.toLowerCase())))
  }

  return (
    <>
      <input aria-label="Search" value={filterText} onChange={handleChange} />
      <button onClick={() => setFilterText('')}>Clear</button>
      <ul>
        {visibleItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  )
}
```

**What happens, step by step:**
1. The user types `pen`. `handleChange` runs on each key and updates both `filterText` and `visibleItems`. The list shows only `Pen`.
2. The user clicks Clear. The button calls `setFilterText('')`. It does not touch `visibleItems`.
3. React renders again. The input is empty, because `filterText` is `''`. The list still shows only `Pen`, because `visibleItems` was never reset.

We ran this: after typing `pen` and clicking Clear, the input is empty and the list is still `["Pen"]`. The two copies disagree. The fix is to delete the second copy and calculate it:

```jsx
export default function SearchableList({ items = ITEMS }) {
  const [filterText, setFilterText] = useState('')
  const visibleItems = items.filter((item) => item.toLowerCase().includes(filterText.toLowerCase()))

  return (
    <>
      <input aria-label="Search" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
      <button onClick={() => setFilterText('')}>Clear</button>
      <ul>
        {visibleItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  )
}
```

Now `visibleItems` is a normal variable. It is recalculated on every render from the one piece of state, so it cannot disagree with it. After Clear, the list shows all four items again. This is what [State and events](05-state-and-events.md) calls "do not store what you can calculate".

**Common mistake:** keeping a copy of an object in state when an id would do.

```jsx
// Risky: a copy of the product. If the list is updated later, this copy is stale.
const [selectedProduct, setSelectedProduct] = useState(null)

// Safer: remember the id, and look the product up on every render
const [selectedId, setSelectedId] = useState(null)
const selectedProduct = products.find((product) => product.id === selectedId)
```

Store the smallest thing that identifies the data (an id), not a second copy of the data.

## 6. Step 4: decide where state lives

You have the two state values. Which component should hold them? React has a clear method:

1. Find every component that **uses** the state. "Uses" means it shows it or changes it.
2. Find their **closest common parent**, the lowest component in the tree that contains all of them.
3. Put the state in that parent (or in a component above it).
4. If no sensible parent exists, make a new component just to hold the state, and put it above.

Apply it to our tree:
- `SearchBar` shows the search text and the checkbox, and it will change them. It uses both.
- `ProductTable` needs both to decide which rows to draw. It uses both.
- `ProductCategoryRow` and `ProductRow` use neither.

The closest common parent of `SearchBar` and `ProductTable` is `FilterableProductTable`. That is where the state goes.

```text
FilterableProductTable      <-- state: filterText, inStockOnly
  |-- SearchBar             uses both (shows and changes them)
  |-- ProductTable          uses both (decides which rows to draw)
        |-- ProductCategoryRow    uses neither
        |-- ProductRow            uses neither
```

Now we write stage 4. We put the state in the parent and pass it down as props. Start from the static file of stage 2 and add `import { useState } from 'react'` at the top. `ProductCategoryRow` and `ProductRow` do not change. Here are the parts that do (the complete file is at the end of step 5).

First, `ProductTable` needs the two values so it can work out which products are visible:

```jsx
function ProductTable({ products, filterText, inStockOnly }) {
  const visibleProducts = products.filter((product) => {
    const matchesText = product.name.toLowerCase().includes(filterText.toLowerCase())
    const matchesStock = !inStockOnly || product.stocked
    return matchesText && matchesStock
  })
```

The rest of `ProductTable` stays as in stage 2, with one change: the loop runs over `visibleProducts.forEach(...)` instead of `products.forEach(...)`. Then `SearchBar` shows the values, and `FilterableProductTable` owns them:

```jsx
function SearchBar({ filterText, inStockOnly }) {
  return (
    <div role="search">
      <input
        type="text"
        value={filterText}
        placeholder="Search..."
        aria-label="Search products"
      />
      <label>
        <input type="checkbox" checked={inStockOnly} /> Only show products in stock
      </label>
    </div>
  )
}

function FilterableProductTable({ products }) {
  const [filterText, setFilterText] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)

  return (
    <div>
      <SearchBar filterText={filterText} inStockOnly={inStockOnly} />
      <ProductTable products={products} filterText={filterText} inStockOnly={inStockOnly} />
    </div>
  )
}
```

**What happens, step by step:**
1. `FilterableProductTable` creates the two state values. It is the only component that owns them.
2. It passes `filterText` and `inStockOnly` down to `SearchBar` (to show) and to `ProductTable` (to filter). Data flows down, as in the static version.
3. `ProductTable` builds `visibleProducts` while rendering. This is the **derived data** from step 3. It is a plain variable, not state. The category rows come from `visibleProducts`, so a category with no visible products shows no heading.
4. `SearchBar` sets `value={filterText}` and `checked={inStockOnly}`. These are **controlled inputs**: the state decides what the input shows (see [Forms](07-forms.md)).

Run it. The page looks right, but the boxes are stuck: you can type and nothing appears, and clicking the checkbox does not tick it. The console shows these warnings (we ran this):

```text
You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field. ...
You provided a `checked` prop to a form field without an `onChange` handler. This will render a read-only field. ...
```

That is correct behaviour for this stage. The input always shows the state, and the state never changes, because nothing calls a setter. You can prove that the data flows down: change `useState('')` to `useState('o')` and reload. The box shows `o`, and the table shows only Notebook, Keyboard, Mouse and Monitor.

A design note: you could also filter in `FilterableProductTable` and hand `ProductTable` the finished list. Both are fine. The state lives in the same place either way. We let `ProductTable` filter, so it is clear which components use the state.

**Common mistake:** putting the state in a component that is not above all its users.

```jsx
// Wrong: the state lives in SearchBar, so ProductTable can never see it
function SearchBar() {
  const [filterText, setFilterText] = useState('')
  // ...
}

// Fixed: move it up to the closest common parent, and pass it down to both
function FilterableProductTable({ products }) {
  const [filterText, setFilterText] = useState('')
  // ...
}
```

Siblings cannot read each other's state. If two components need a value, it has to live in a component above both.

## 7. Step 5: add inverse data flow

The state lives in the parent, but the inputs live in the child. Data flows down, so `SearchBar` can see the state. It cannot change it. And it has to, because the user is typing into it.

The answer is **inverse data flow**: the parent passes a **function** down as a prop. The child calls that function from its event handler. The parent's function updates the parent's own state, and React renders again with new props.

We add two props to `SearchBar`, named after the *events*: `onFilterTextChange` and `onInStockOnlyChange`. The parent passes its setters. Here is the finished app, one file to paste into `src/App.jsx`:

```jsx
import { useState } from 'react'

const PRODUCTS = [
  { id: 1, category: 'Stationery', name: 'Notebook', price: 4.5, stocked: true },
  { id: 2, category: 'Stationery', name: 'Pen', price: 1.2, stocked: true },
  { id: 3, category: 'Stationery', name: 'Highlighter', price: 2.8, stocked: false },
  { id: 4, category: 'Electronics', name: 'Keyboard', price: 39, stocked: true },
  { id: 5, category: 'Electronics', name: 'Mouse', price: 19, stocked: false },
  { id: 6, category: 'Electronics', name: 'Monitor', price: 129, stocked: true },
]

function ProductCategoryRow({ category }) {
  return (
    <tr>
      <th colSpan={2}>{category}</th>
    </tr>
  )
}

function ProductRow({ product }) {
  const name = product.stocked ? (
    product.name
  ) : (
    <span style={{ color: 'crimson' }}>{product.name}</span>
  )

  return (
    <tr>
      <td>{name}</td>
      <td>${product.price.toFixed(2)}</td>
    </tr>
  )
}

function ProductTable({ products, filterText, inStockOnly }) {
  const visibleProducts = products.filter((product) => {
    const matchesText = product.name.toLowerCase().includes(filterText.toLowerCase())
    const matchesStock = !inStockOnly || product.stocked
    return matchesText && matchesStock
  })

  const rows = []
  let lastCategory = null

  visibleProducts.forEach((product) => {
    if (product.category !== lastCategory) {
      rows.push(
        <ProductCategoryRow key={`category-${product.category}`} category={product.category} />,
      )
    }
    rows.push(<ProductRow key={product.id} product={product} />)
    lastCategory = product.category
  })

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  )
}

function SearchBar({ filterText, inStockOnly, onFilterTextChange, onInStockOnlyChange }) {
  return (
    <div role="search">
      <input
        type="text"
        value={filterText}
        placeholder="Search..."
        aria-label="Search products"
        onChange={(e) => onFilterTextChange(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => onInStockOnlyChange(e.target.checked)}
        />{' '}
        Only show products in stock
      </label>
    </div>
  )
}

function FilterableProductTable({ products }) {
  const [filterText, setFilterText] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)

  return (
    <div>
      <SearchBar
        filterText={filterText}
        inStockOnly={inStockOnly}
        onFilterTextChange={setFilterText}
        onInStockOnlyChange={setInStockOnly}
      />
      <ProductTable products={products} filterText={filterText} inStockOnly={inStockOnly} />
    </div>
  )
}

export default function App() {
  return <FilterableProductTable products={PRODUCTS} />
}
```

Compared with stage 4, only two things changed: `SearchBar` got two callback props and calls them in `onChange`, and the parent passes `setFilterText` and `setInStockOnly` as those props.

Here is the whole flow in one picture:

```text
FilterableProductTable        state: filterText, inStockOnly
  |
  |  props DOWN: filterText, inStockOnly, onFilterTextChange, onInStockOnlyChange
  v
SearchBar -- user types --> onChange handler --> onFilterTextChange('o')
                                                      |
  ^                                                   | this is setFilterText
  +---------------------------------------------------+ (state changes in the PARENT)
  |
  |  props DOWN: products, filterText, inStockOnly
  v
ProductTable --> calculates visibleProducts --> ProductCategoryRow / ProductRow
```

**What happens, step by step** when the user types `o` into the search box:
1. The browser reports a change. React calls the `onChange` handler in `SearchBar` with the event.
2. The handler reads `e.target.value` (`'o'`) and calls `onFilterTextChange('o')`. That function is `setFilterText` from the parent.
3. `setFilterText('o')` tells React that the parent's state changed. React schedules a new render of `FilterableProductTable`.
4. `FilterableProductTable` runs again with `filterText = 'o'`. It passes the new value to its children, and they render again too (a parent's render renders its children).
5. `SearchBar` shows `o` in the box (controlled input). `ProductTable` recalculates `visibleProducts`: Pen and Highlighter do not contain an `o`, so they are gone.
6. React compares the new output with the old one and changes only the DOM that differs: it removes two rows.

We ran this, using the six products above. The rows after each action:

| Action | Rows shown |
| --- | --- |
| Start | All 6 products, 2 category rows |
| Type `o` | Notebook, Keyboard, Mouse, Monitor |
| Then tick the checkbox | Notebook, Keyboard, Monitor |
| Clear the text (checkbox still on) | Notebook, Pen, Keyboard, Monitor |
| Type `MOU` (checkbox on) | No rows at all (Mouse is out of stock) |
| Untick the checkbox | Mouse, under its Electronics heading |

The names `onFilterTextChange` and `setFilterText` are different on purpose. The prop name describes **what happened** (the filter text changed). The function behind it decides **what to do about it**. Today it is `setFilterText`. Tomorrow the parent could pass `(text) => setFilterText(text.trim())`, and `SearchBar` would not need to change.

**Common mistake:** reading the wrong property from a checkbox.

```jsx
// Wrong: a checkbox's value is the string "on", and "on" is always truthy
onChange={(e) => onInStockOnlyChange(e.target.value)}

// Fixed: read the boolean
onChange={(e) => onInStockOnlyChange(e.target.checked)}
```

We ran the wrong version: the first click hides the out-of-stock rows, and the checkbox gets stuck on. It cannot be unticked, because the state is the string `"on"` after every click. Text inputs use `e.target.value`. Checkboxes use `e.target.checked`.

### The five stages at a glance

| Stage | Step | What you add | Result |
| --- | --- | --- | --- |
| 1 | Component hierarchy | Empty components with the right names and nesting | A map |
| 2 | Static version | Real markup, props only | Correct picture, no behaviour |
| 3 | Minimal state | Decide `filterText` and `inStockOnly` are state | Two `useState` lines on paper |
| 4 | Where state lives | `useState` in `FilterableProductTable`, props down | Right data, read-only inputs |
| 5 | Inverse data flow | Callback props, called in `onChange` | A working app |

## 8. Lifting state up: the temperature converter

**Lifting state up** means moving state from a child to the closest common parent, so that sibling components can share it. You just did it: the search text could have lived in `SearchBar`, but `ProductTable` needed it too, so it moved up. Let us see it as its own idea with a classic example: two inputs, Celsius and Fahrenheit. Typing in one must update the other.

Here is the first attempt. Each input owns its own state:

```jsx
import { useState } from 'react'

function TemperatureInput({ label }) {
  const [text, setText] = useState('')

  return (
    <label>
      {label}{' '}
      <input value={text} onChange={(e) => setText(e.target.value)} />
    </label>
  )
}

export default function Converter() {
  return (
    <>
      <TemperatureInput label="Celsius" />
      <TemperatureInput label="Fahrenheit" />
    </>
  )
}
```

**What happens, step by step:**
1. Each `TemperatureInput` has its own `text` state. State belongs to one component instance. The two boxes cannot see each other's state.
2. The user types `100` into Celsius. Only the Celsius box's state changes.
3. The Fahrenheit box has no way to know. Its state is still `''`.

We ran this: after typing `100` in Celsius the two boxes show `["100", ""]`. Siblings cannot talk to each other directly. They can only share something that lives in a **parent**.

The recipe for lifting state up has three moves:
1. **Remove** the state from the children. They become "controlled": they show what they are told.
2. **Pass the data down** from the closest common parent, as props.
3. **Pass the change handlers down** too, so children can report what the user did (inverse data flow).

Here is the lifted version:

```jsx
import { useState } from 'react'

function toFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32
}

function toCelsius(fahrenheit) {
  return ((fahrenheit - 32) * 5) / 9
}

// Converts the typed text and rounds to 2 decimals. Returns '' if the text is not a number.
function convert(text, convertFn) {
  const number = parseFloat(text)
  if (Number.isNaN(number)) return ''
  return String(Math.round(convertFn(number) * 100) / 100)
}

function TemperatureInput({ label, value, onChange }) {
  return (
    <label>
      {label}{' '}
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

export default function Converter() {
  // The single source of truth: what was typed, and in which box.
  const [typed, setTyped] = useState({ scale: 'c', text: '' })

  // Everything else is calculated during render.
  const celsius = typed.scale === 'c' ? typed.text : convert(typed.text, toCelsius)
  const fahrenheit = typed.scale === 'f' ? typed.text : convert(typed.text, toFahrenheit)

  return (
    <>
      <TemperatureInput
        label="Celsius"
        value={celsius}
        onChange={(text) => setTyped({ scale: 'c', text })}
      />
      <TemperatureInput
        label="Fahrenheit"
        value={fahrenheit}
        onChange={(text) => setTyped({ scale: 'f', text })}
      />
    </>
  )
}
```

**What happens, step by step:**
1. `Converter` owns one state value: `typed`. It records the text and the scale of the box the user is typing in.
2. The user types `100` into the Celsius box. `TemperatureInput` calls `onChange('100')`. The parent runs `setTyped({ scale: 'c', text: '100' })`.
3. `Converter` renders again. The typed scale is `c`, so `celsius` is exactly the typed text, `'100'`. The Fahrenheit value is calculated: `convert('100', toFahrenheit)` gives `'212'`.
4. Both `TemperatureInput` components get new `value` props and show them.
5. If the user now types in the Fahrenheit box, `typed.scale` becomes `f`. The Fahrenheit box shows the typed text and the Celsius value is calculated from it.

We ran this. The two boxes show `["100", "212"]` after typing `100` in Celsius, `["0", "32"]` after typing `32` in Fahrenheit, and `["37", "98.6"]` after typing `37` in Celsius. If you type `abc` in Celsius, you get `["abc", ""]`: the box you are typing in keeps your text, and the other box stays empty.

Why store the typed text and a scale, rather than a number? The box you type in must show *exactly* what you typed, including half-finished input like `36.` or `abc`. A number would lose that. The other box is always calculated. (The practice-app exercise [08 Temperature converter](../practice-app/exercises/react/08-temperature-converter/README.md) has stricter rules for rounding and invalid input than this simple version. Try it after this lesson.)

**Common mistake:** storing both temperatures in the parent.

```jsx
// Wrong: two numbers that must always agree
const [celsius, setCelsius] = useState('')
const [fahrenheit, setFahrenheit] = useState('')
// every handler must remember to update the other one

// Fixed: one source of truth (see the lifted version above)
const [typed, setTyped] = useState({ scale: 'c', text: '' })
```

With two values, every place that changes one must also change the other, with the right formula. That is the same bug as the `visibleItems` copy in section 5.

## 9. Single source of truth and derived data

A **single source of truth** means that each piece of data has exactly one owner: one component whose state holds it. Everybody else either gets it through props or calculates it. When you ask "where is this value set?", there is one answer.

The rules that follow from it:
- **One owner per value.** If two components both keep a copy, they will disagree sooner or later.
- **Derive, do not copy.** If you can compute it, compute it during render. Do not store it, and do not use an effect to copy one state into another.
- **Cheap calculations need no special tools.** Filtering a list of hundreds of items on every render is fine. If a calculation is truly slow, measure first and then use `useMemo` (see [Memoization](../02-hooks/07-memoization.md)). Do not reach for state.
- **Props are not yours to keep.** Copying a prop into state creates a second owner.

Here is the last rule in action:

```jsx
import { useState } from 'react'

function Price({ amount }) {
  const [copy] = useState(amount) // copies the prop once, on the first render

  return (
    <p>
      prop: {amount}, copy in state: {copy}
    </p>
  )
}

export default function App() {
  const [amount, setAmount] = useState(10)

  return (
    <>
      <Price amount={amount} />
      <button onClick={() => setAmount(amount + 5)}>Add 5</button>
    </>
  )
}
```

**What happens, step by step:**
1. On the first render `amount` is `10`. `useState(amount)` uses `10` as the **initial** value and stores it.
2. The user clicks Add 5. The parent's state becomes `15` and `Price` renders again with `amount = 15`.
3. `useState` ignores its argument after the first render. `copy` is still `10`.

We ran this: before the click the text is `prop: 10, copy in state: 10`. After the click it is `prop: 15, copy in state: 10`. The copy is stale.

Copying a prop is fine only when you really want a *starting value* that the user then edits on their own, for example a draft in an edit form. Name it so that this is clear (`initialName`, not `name`), and use a `key` to reset it when a different record is shown (practice item 4 below, and [useState in depth](../02-hooks/02-usestate-in-depth.md)).

**Common mistake:** syncing state with an effect.

```jsx
// Wrong: state that follows a prop, kept in sync by an effect
const [fullName, setFullName] = useState('')
useEffect(() => {
  setFullName(firstName + ' ' + lastName)
}, [firstName, lastName])

// Fixed: calculate it
const fullName = firstName + ' ' + lastName
```

The effect version renders once with the old `fullName`, then again with the new one. It is slower and easier to get wrong. See [useEffect](../02-hooks/03-useeffect.md) ("you might not need an effect").

## 10. Colocate state, or lift it?

Lifting state is not always good. The rule of thumb:

> Put state as **low** in the tree as you can, and as **high** as you must.

Think of it as a ladder. Start at the bottom rung and climb only when you have to:

1. **Only one component uses it.** Keep it in that component. This is called **colocating** state: the state sits next to the code that uses it.
2. **A component and its children use it.** Keep it in that component and pass it down.
3. **Siblings need to share it.** Lift it to the closest common parent (what you did in this lesson).
4. **Distant components all need it** (the logged-in user, the theme, the language). Use context, or a state library. See [useContext](../02-hooks/05-usecontext.md) and [State management](../03-intermediate/06-state-management.md).
5. **It comes from the server** (a list loaded from an API). Use a data-fetching tool, not hand-made state. See [Data fetching](../03-intermediate/02-data-fetching.md).

Why not lift everything "to be safe"? Because of one fact: **when a component renders, its children render too.** State that sits high in the tree makes a large part of the tree work on every change. Here is the same page twice. A big `Table` does not use the search text.

```jsx
import { useState } from 'react'

function Table() {
  console.log('Table rendered')
  return <p>I am a big table that does not use the search text.</p>
}

// Version 1: the state lives in the parent, next to the table
export function PageV1() {
  const [text, setText] = useState('')

  return (
    <>
      <input aria-label="Search" value={text} onChange={(e) => setText(e.target.value)} />
      <Table />
    </>
  )
}

// Version 2: the state lives in the only component that needs it
function SearchBox() {
  const [text, setText] = useState('')

  return <input aria-label="Search" value={text} onChange={(e) => setText(e.target.value)} />
}

export function PageV2() {
  return (
    <>
      <SearchBox />
      <Table />
    </>
  )
}

export default function App() {
  return <PageV2 /> // swap for <PageV1 /> to compare
}
```

**What happens, step by step:**
1. In `PageV1`, the state belongs to `PageV1`. Each keystroke changes that state, so React renders `PageV1`. Rendering `PageV1` renders its children: the `input` and `Table`.
2. In `PageV2`, the state belongs to `SearchBox`. A keystroke renders only `SearchBox`. `PageV2` and `Table` are not touched.

We ran both and typed `abc`. `Table rendered` was logged 4 times for `PageV1` (once on mount, once per keystroke) and only 1 time for `PageV2` (mount only). In your own Vite app, `main.jsx` wraps the app in `StrictMode`, which renders each component twice in development to catch mistakes, so you may see each line twice. Compare the two versions, not the exact numbers.

The extra work in this tiny example is nothing. In a real page with a big table, it can make typing feel slow. Colocating is the first and cheapest fix. It also makes the code easier to read, because the state sits next to the one component that cares. (More tools, such as `memo`, are in [Performance optimization](../04-advanced/02-performance-optimization.md).)

So the choice is not "always lift" or "never lift". Ask: *who uses this value?* Then put it at the lowest component that contains all of them.

**Common mistake:** putting all state in `App`.

```jsx
// Wrong: App owns things that only one small component needs
function App() {
  const [searchText, setSearchText] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  // ...passes them through five layers...
}

// Fixed: each piece of state lives in the component that uses it
function Menu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  // ...
}
```

Everything in `App` means every change renders everything, and every component needs a long list of props.

## 11. Composition over inheritance

If you know object-oriented programming, you may expect to reuse a component by writing `class WarningCard extends Card`. React does not work that way. React builds big components from small ones by **composition**: putting components inside other components and configuring them with props.

Composition has three everyday tools:
- **Containment.** A component does not know its content ahead of time. It draws `children` where the content goes.
- **Slots.** A component takes JSX as props (`sidebar`, `content`) and puts them in the right places.
- **Specialisation.** A "special case" of a component is another component that renders the general one with some props filled in.

```jsx
function Card({ title, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Layout({ sidebar, content }) {
  return (
    <div className="layout">
      <aside>{sidebar}</aside>
      <main>{content}</main>
    </div>
  )
}

// A special case of Card: configure it, do not extend it
function WarningCard({ children }) {
  return <Card title="Warning">{children}</Card>
}

export default function App() {
  return (
    <Layout
      sidebar={<nav>Menu</nav>}
      content={
        <WarningCard>
          <p>Disk is almost full.</p>
        </WarningCard>
      }
    />
  )
}
```

**What happens, step by step:**
1. `App` renders `Layout` and passes two JSX elements as props: `sidebar` and `content`.
2. `Layout` puts `sidebar` inside an `aside` and `content` inside a `main`. It has no idea what they contain.
3. The `content` is a `WarningCard`. It renders a `Card` with the title `Warning` and passes its own `children` down.
4. `Card` draws the title and then `{children}`, which is the paragraph.

We ran this. The HTML is:

```html
<div class="layout"><aside><nav>Menu</nav></aside><main><section class="card"><h2>Warning</h2><p>Disk is almost full.</p></section></main></div>
```

Every piece is small, and each piece knows only about its own props. To change the look of the warning, you change `WarningCard`. To change the page structure, you change `Layout`.

**Why not inheritance?** Here is how it looks in the old class style, for recognition only:

```jsx
import { Component } from 'react'

// Legacy style, for recognition only: inheritance between class components
export class BaseCard extends Component {
  render() {
    return <section>{this.props.children}</section>
  }
}

export class WarningCard extends BaseCard {
  render() {
    // To change one small thing we have to rewrite the whole render method
    return <section className="warning">{this.props.children}</section>
  }
}
```

The problems:
- **Props already do the job.** Anything that differs between two uses can be passed in as a prop or as children. There is nothing left for a subclass to customise.
- **Tight coupling.** A subclass depends on the internals of its parent class. Change the base class and every subclass may break. To change one detail, the subclass often has to override a whole method (see `render` above).
- **Hidden data flow.** With inheritance, behaviour comes from "somewhere up the class chain". With composition, everything a component uses is in its props, so you can read it in one place.
- **Function components and hooks have no inheritance.** Shared *logic* (not UI) goes into plain functions or custom hooks, which you call. See [Custom hooks](../02-hooks/08-custom-hooks.md).

React's own guidance is to use composition for reuse. The only inheritance you will meet is in old class components, where `extends React.Component` inherits from React's base class, not from your own components. Other composition patterns (render props, compound components) are in [Component patterns](../03-intermediate/01-component-patterns.md).

**Common mistake:** accepting `children` and not drawing them.

```jsx
// Wrong: children are accepted but never drawn
function Card({ title, children }) {
  return (
    <section>
      <h2>{title}</h2>
    </section>
  )
}

// Fixed: draw {children} where the content should go
function Card({ title, children }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  )
}
```

We ran the wrong version with a `<p>` inside the card: the output is `<section><h2>T</h2></section>`. The paragraph is silently dropped. No error appears.

## 12. Avoiding prop drilling

**Prop drilling** means passing a prop through several components that do not use it, only to get it to a deep child. One or two layers of this is normal and honest. Many layers is a pain: every middle component needs the prop, and renaming it means editing all of them.

```jsx
function Avatar({ user }) {
  return <span>{user.name}</span>
}

function Header({ user }) {
  return (
    <header>
      <Avatar user={user} />
    </header>
  )
}

function Page({ user }) {
  return (
    <div className="page">
      <Header user={user} />
    </div>
  )
}

export default function App() {
  const user = { name: 'Asha' }
  return <Page user={user} />
}
```

`Page` and `Header` never use `user`. They only forward it. Here are the fixes, in the order you should try them.

**Fix 1: rethink and colocate.** Does the deep component really need the data from so far away? Sometimes the state can move down, closer to where it is used (section 10).

**Fix 2: composition.** Build the deep element high up, where the data is, and pass the finished element down as `children` or a slot. The middle components no longer need to know about `user`.

```jsx
function Avatar({ user }) {
  return <span>{user.name}</span>
}

function Header({ children }) {
  return <header>{children}</header>
}

function Page({ children }) {
  return <div className="page">{children}</div>
}

export default function App() {
  const user = { name: 'Asha' }

  return (
    <Page>
      <Header>
        <Avatar user={user} />
      </Header>
    </Page>
  )
}
```

**What happens, step by step:**
1. `App` has the data, so `App` creates `<Avatar user={user} />` itself.
2. It puts the finished element inside `Header`, and `Header` inside `Page`, as children.
3. `Page` and `Header` just draw their `children`. They do not know a user exists.

We ran all three versions in this section and they produce the same HTML: `<div class="page"><header><span>Asha</span></header></div>`. Composition keeps the explicit data flow and removes the middlemen.

**Fix 3: context.** For data that many far-apart components need (the current user, the theme, the language), put it in a **context**. Any component below the provider can read it directly.

```jsx
import { createContext, useContext } from 'react'

const UserContext = createContext(null)

function Avatar() {
  const user = useContext(UserContext)
  return <span>{user.name}</span>
}

function Header() {
  return (
    <header>
      <Avatar />
    </header>
  )
}

function Page() {
  return (
    <div className="page">
      <Header />
    </div>
  )
}

const user = { name: 'Asha' }

export default function App() {
  return (
    <UserContext value={user}>
      <Page />
    </UserContext>
  )
}
```

In React 19 you write the context itself as the provider: `<UserContext value={user}>`. The older `<UserContext.Provider value={user}>` still works. Context has costs: every component that reads it renders again when its value changes, and it hides where data comes from. The full story is in [useContext](../02-hooks/05-usecontext.md).

**Fix 4: a state library.** For large amounts of shared client state, a library such as Redux Toolkit, Zustand or Jotai may be right. For data from a server, use a data-fetching library. See [State management](../03-intermediate/06-state-management.md).

A good order: **composition first, context second, a library third**. Do not use context just because three layers feel long.

**Common mistake:** one giant context for everything.

```jsx
// Wrong: user, theme, cart and search text in one value
<AppContext value={{ user, theme, cart, searchText }}>

// Fixed: separate contexts for separate concerns, and local state for local things
<UserContext value={user}>
  <ThemeContext value={theme}>
```

With one big value, a change to `searchText` makes every consumer of the context render again, even those that only wanted `theme`.

## 13. How big should a component be? Naming and files

There is no magic number of lines. Use judgement with these guidelines.

**When to split a component:**
- It has more than one job (the "and" test from section 3).
- A part is repeated, or could be reused.
- A part has its own state that nobody else needs (colocate it, section 10).
- Giving a chunk of JSX a name makes the parent easier to read.
- The file is longer than you can hold in your head (a rough warning sign is more than two screens), or the component takes many props (six or seven is a signal to look closer).

**When not to split:**
- The new component would take eight props just to pass things along. You moved code, not complexity.
- A piece is used once, is three lines long, and has no clear name.

**Keep most components simple.** Leaf components (the rows, the buttons) should be pure: props in, JSX out. Keep state in a few components higher up. When a component mixes a lot of logic with markup, move the logic into a custom hook ([Custom hooks](../02-hooks/08-custom-hooks.md)).

**Naming conventions:**
- **Components:** `PascalCase` nouns that say what the thing *is*: `ProductRow`, `SearchBar`. Not `LeftThing` or `Row2`.
- **Props:** name them from the component's own point of view, not the parent's. `user`, not `sidebarUser`. Callback props start with `on` and name an event: `onFilterTextChange`. Booleans read like a sentence: `isOpen`, `hasError`, `inStockOnly`.
- **Handlers:** functions defined inside a component start with `handle`: `handleSubmit`.
- **State:** a noun and its setter: `[filterText, setFilterText]`.
- **Files:** one main component per file, named like the component: `ProductRow.jsx`. When a feature grows, give it a folder:

```text
src/features/products/
  ProductsPage.jsx          (stateful parent: owns filterText and inStockOnly)
  SearchBar.jsx
  ProductTable.jsx
  ProductRow.jsx
  ProductCategoryRow.jsx
  products.js               (the data, or the code that fetches it)
```

**Common mistake:** defining a component inside another component.

```jsx
import { useState } from 'react'

export default function SignupForm() {
  const [name, setName] = useState('')

  // Wrong: a new function, so a new component type, is created on every render
  function NameInput() {
    return <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
  }

  return (
    <form>
      <NameInput />
      <p>Hello, {name}</p>
    </form>
  )
}
```

**What happens, step by step:**
1. `SignupForm` renders and creates a `NameInput` function. React shows its input.
2. The user types `a`. State changes, and `SignupForm` renders again. That creates a **new** `NameInput` function.
3. React compares the old element type with the new one. They are different functions, so React sees a different component. It removes the old input and creates a new one.
4. The new input has no focus, so the user cannot keep typing. They must click it again for every letter.

We ran this and typed `abc` with a real keyboard simulation. Only `a` arrived (`Hello, a`), and the original input was gone from the page. Fix it by defining the component once, outside, and passing what it needs as props:

```jsx
import { useState } from 'react'

// Fixed: defined once, outside. The data it needs comes in through props.
function NameInput({ name, onNameChange }) {
  return <input aria-label="Name" value={name} onChange={(e) => onNameChange(e.target.value)} />
}

export default function SignupForm() {
  const [name, setName] = useState('')

  return (
    <form>
      <NameInput name={name} onNameChange={setName} />
      <p>Hello, {name}</p>
    </form>
  )
}
```

The same test now ends with `abc` in the input and `Hello, abc`, and it is the same DOM node the whole time. Rule: **never define a component inside another component.** Define it at the top level of the file, even if it is only used once.

## 14. How to say it out loud in an interview

In a machine-coding or design round, the five steps are also your script. The interviewer cannot read your mind, so say each step as you do it. Many prompts ("build a filterable list", "build an autocomplete", "build tabs", "build a task list with filters") are this lesson in disguise.

Here is what a strong narration sounds like for the product table:

> "Let me repeat the requirement to check I understood it. I need a product table with a search box and an in-stock checkbox. The table filters as you type, and products are grouped by category.
>
> First I will split the UI into components. I see a SearchBar, and a ProductTable that contains category rows and product rows. One parent, FilterableProductTable, holds the two.
>
> Next I will build a static version that only takes props and has no state. I want to see the right layout before I add behaviour.
>
> Now the state. The search text and the checkbox change over time and I cannot calculate them, so they are state. The product list comes in as props. The filtered list can be calculated from those three, so I will not store it.
>
> The SearchBar shows both values and the ProductTable uses both, so the state lives in their closest common parent, FilterableProductTable.
>
> Last, SearchBar has to change that state. The parent will pass callbacks down, and SearchBar will call them from onChange. That makes the inputs controlled.
>
> With more time I would add an empty state, label the inputs for accessibility, and write a test with Testing Library that types in the box and checks the rows."

Tips for the live round:
- **Say the step names.** "First the hierarchy, then a static version, then state." It shows that you have a method.
- **Say why, in one sentence.** "I am not storing the filtered list because I can calculate it." Reasons are what interviewers listen for.
- **Keep to the plan.** A rough split for a 45-minute round: about 5 minutes to clarify and draw the tree, 10 to 12 for the static version, 5 to decide the state and where it lives, 10 to wire the behaviour, and the rest for edge cases and closing remarks. This is a suggestion, not a rule.
- **Get unstuck with the steps.** If something feels tangled, go back: "Which values are state? Who uses them? Where is their common parent?"
- **Finish with closing remarks.** Name what you would do with more time: empty and loading states, keyboard and screen reader support, tests, and what you would do if the list had thousands of rows. See Interview day checklist (planned).

## How interviewers test this
- **A method, spoken out loud.** They want to hear that you plan before you type. A strong answer names the steps in order and applies them to the prompt. A red flag is writing JSX immediately, with `useState` in every component.
- **State judgement.** They give you a feature and ask what is state. A strong answer separates state, props and derived data, and says "I will calculate that". A red flag is storing the filtered list, a count, or a copy of a prop in state, or syncing state with `useEffect`.
- **State placement.** The correct answer is "the closest common parent", with trade-offs (colocate when only one component uses it, lift when siblings share it). Red flags are "put everything in App" or "put it in a global store" for a checkbox.
- **Data-flow vocabulary.** Props down, callbacks up, controlled components, single source of truth. They check that you know a child cannot change a prop.
- **Composition thinking.** They may ask "how would you share UI between two components?" The expected answer is `children`, slots and props, not inheritance.
- **Follow-up questions.** Typical ones: "What if typing is slow?", "How do you avoid prop drilling?", "How would you test it?", "What changes if the data comes from an API?"

## Interview questions and model answers

### Q1. What is "Thinking in React"? What are the steps? (Easy)
It is the method from the React docs for building a UI from a mockup. Step 1: break the UI into a component hierarchy, one component per job. Step 2: build a static version with props only and no state. Step 3: find the minimal state, the smallest set of values that describes the UI, and calculate everything else. Step 4: decide where the state lives, which is the closest common parent of the components that use it. Step 5: add inverse data flow, so children can change the parent's state through callbacks. The idea underneath: data flows down as props, and events flow up as function calls.

### Q2. What is lifting state up? (Easy)
It means moving state from a child component up to the closest common parent, so that sibling components can share it. The parent holds the state and passes the value down as a prop, plus a callback so the children can request changes. Example: two temperature inputs. If each owns its own state they cannot stay in sync. If the parent owns one value and calculates the other, they always agree. The children become controlled components: they show what they are given and report what the user did.

### Q3. How do you decide where state should live? (Medium)
Find every component that uses the state, meaning it reads it or changes it. Then take their closest common parent, and put the state there. If only one component uses it, keep it inside that component (colocation). If siblings share it, lift it to the parent. If it is needed by many far-apart components, think about context or a state library. If it is server data, use a data-fetching tool. The guide: as low as possible, as high as necessary.

### Q4. How do you decide what is state and what is not? (Easy)
Ask three questions. Does it stay the same over time? Then it is not state. Is it passed in as a prop? Then it is not state. Can I calculate it from other state or props? Then it is not state, it is derived data. What is left is state. Example: in a filterable list, the search text is state, but the filtered list is derived, so you compute it during render instead of storing it. The state should be minimal, and also complete enough to rebuild the whole screen.

### Q5. What is inverse data flow? (Medium)
React data flows down: a parent gives props to a child, and the child cannot change them. Inverse data flow is how a child still changes the parent's data. The parent passes a function (for example `setFilterText`, wrapped as `onFilterTextChange`) as a prop. The child calls it from an event handler. The parent's state updates, React renders again, and new props flow down. So the child asks, and the parent decides. This is also how controlled inputs work: `value` comes down and `onChange` goes up.

### Q6. What is a single source of truth, and why does it matter? (Easy)
It means that each piece of data has exactly one owner, one place where it is stored. Other components receive it through props or calculate it. It matters because copies drift apart. If two components keep their own copy of the same value, one update will forget the other, and the screen will show two different answers. With a single source, there is one place to read, one place to change, and one place to debug. Derived values (a filtered list, a total) are calculated from the source, not stored.

```jsx
const visibleItems = items.filter((item) => item.name.includes(filterText)) // derived, not state
```

### Q7. Composition vs inheritance: which does React use, and why? (Medium)
React uses composition. You reuse and customise a component by putting other components inside it (`children`), passing JSX as props (slots), and passing configuration as props. A "special case" is just another component that renders the general one with some props set, like `WarningCard` rendering `<Card title="Warning">`. Inheritance is avoided because props already cover customisation, a subclass becomes tightly coupled to its parent's internals, and data flow gets harder to follow. Function components and hooks do not inherit at all. Shared logic goes into plain functions and custom hooks.

### Q8. What is prop drilling, and how do you avoid it? (Medium)
Prop drilling is passing a prop through several components that do not use it, only to reach a deep child. One or two levels is fine. If it hurts, try these in order. First, reconsider whether the state can live closer to where it is used. Second, use composition: build the deep element high up and pass it down as `children` or a slot, so the middle components do not need the prop. Third, use context for data that many distant components need, such as the user, theme or language. Fourth, use a state library for large shared client state. Do not jump straight to context or a store.

### Q9. How would you structure components for a new feature? (Medium)
I would use the five steps. First, look at the mockup and name the components, one per job, and draw the tree. Second, build a static version with props. Third, list the state: what changes, what can be calculated. Fourth, put each piece of state in the lowest component that contains all its users. Fifth, pass callbacks down so children can change it. Then handle loading, empty and error states, name things clearly, and put the feature in its own folder with one component per file. Server data goes in a data-fetching layer, and logic that grows goes into a custom hook.

### Q10. When should you keep state local (colocate) instead of lifting it? (Medium)
Keep it local whenever only one component, or that component and its own children, use it: a dropdown being open, the text of a field that nobody else reads, a hover state. Lift only when a sibling needs the same value. Local state is easier to read because it sits next to the code that uses it, and it makes less of the tree render when it changes. Lifting "just in case" makes parents big and forces long prop lists. You can always lift later, and it is a small change.

### Q11. Why should you not store a filtered list, or a copy of a prop, in state? (Medium)
Because each copy is a second source of truth that you must keep in sync by hand. If you store the filtered list, every place that changes the filter must also update the list, and one forgotten place leaves the screen inconsistent. If you copy a prop into state with `useState(prop)`, React uses the prop only for the first render, so the state goes stale when the prop changes. The fix is to calculate during render: `const visible = items.filter(...)`. A copy of a prop is acceptable only as a deliberate starting value for an editable draft, named `initialValue`, with a `key` to reset it.

### Q12. How big should a component be, and when do you split it? (Easy)
There is no fixed size. Split when a component has more than one job, when a part repeats, when a part has its own state that others do not need, or when naming a chunk makes the code clearer. A rough warning sign is a component that is longer than a couple of screens or takes many props. Do not split just to make files smaller. If the new component needs eight props only to pass things along, you have moved code, not simplified it. Also never define a component inside another component, because it gets a new identity on every render and loses its state and focus.

### Q13. Lifting state makes more components re-render. How do you deal with that? (Hard)
First, remember that renders are not automatically a problem, and measure with the React DevTools Profiler before changing code. Then fix in order of cost. Move the state down so that fewer components sit below it (colocation). Pass slow parts as `children` or props, so they keep the same element reference and React can skip them when the stateful parent renders. Wrap an expensive child in `React.memo`, with stable props. If the project uses the React Compiler (opt-in), it can do much of this memoization for you. For long lists, virtualise. Design with the simplest structure first, then optimise what you measured.

## Common mistakes and gotchas
- **Adding state before the static version works.** Build the props-only version first, then add state.
- **Storing derived data** (a filtered list, a count, a full name) in state. Calculate it while rendering.
- **Copying a prop into state** and expecting it to follow the prop. Read the prop directly, or name it `initialX` and reset it with a `key`.
- **Two components keeping their own copy of the same data.** Lift it to the closest common parent.
- **Lifting too high** ("all state in `App`"). Keep state in the lowest component that contains all its users.
- **Passing `value` or `checked` without `onChange`.** The input is read-only. Pass a callback and call it.
- **Calling the callback while rendering**, as in `onChange={onFilterTextChange(e.target.value)}`. Pass a function: `onChange={(e) => onFilterTextChange(e.target.value)}`.
- **Reading `e.target.value` from a checkbox.** Use `e.target.checked`.
- **Mutating the array you got as a prop**, such as `products.sort(...)`, which changes the parent's data. Copy first: `[...products].sort(...)` or `products.toSorted(...)`.
- **Defining a component inside another component.** Define it at the top level of the file.
- **Forgetting to draw `{children}`.** The content is silently dropped.
- **Using inheritance to share UI.** Use `children`, slots and props. Share logic with functions and custom hooks.
- **One giant context for everything.** Split contexts by concern, and keep local state local.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Explain. A task app has these values: the array of tasks, the text in the "new task" box, the number of completed tasks, the selected filter (All, Active or Done), the list of tasks currently shown, and `user.name` passed in from the parent. Which are state, which are props, and which are derived?

<details>
<summary>Show answer</summary>

- **State:** the array of tasks, the text in the "new task" box, and the selected filter. They change over time and cannot be calculated from anything else.
- **Props:** `user.name`. The parent owns it.
- **Derived:** the number of completed tasks (`tasks.filter((t) => t.done).length`) and the list of tasks currently shown (`tasks` filtered by the selected filter). Calculate both during render. Do not store them.

One refinement: the text in the "new task" box is state, but if only the add-task form uses it, keep it inside that form component (colocation) and lift only the finished task when the user submits.

</details>

2. **(Easy)** Explain. A designer gives you a mockup of a social feed: a top bar with a search box and a user avatar, then a list of posts. Each post shows an avatar, a name, the text, and a like button with a count. Under the list there is a "write a post" box with a Post button. Draw the component tree.

<details>
<summary>Show answer</summary>

One reasonable tree:

```text
FeedPage
  |-- TopBar
  |     |-- SearchBox
  |     |-- Avatar
  |-- PostList
  |     |-- Post               (one per post)
  |           |-- Avatar
  |           |-- LikeButton
  |-- PostComposer             (the "write a post" box)
```

`Avatar` appears twice, so it is a reusable component. `Post` is one per item of data. Other trees can be right as well. What matters is that each component has one job and the nesting follows the layout. In an interview, say the names out loud and why you split there.

</details>

3. **(Easy)** Code. The page below has two buttons that each keep their own count. Change the code so that both buttons share one count: clicking either button increases the same number, and both buttons show it.

   ```jsx
   import { useState } from 'react'

   function ClickCounter() {
     const [count, setCount] = useState(0)

     return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
   }

   export default function App() {
     return (
       <>
         <ClickCounter />
         <ClickCounter />
       </>
     )
   }
   ```

<details>
<summary>Show answer</summary>

Lift the state to `App`, the closest common parent. `ClickCounter` loses its state and receives the count and a callback.

```jsx
import { useState } from 'react'

function ClickCounter({ count, onIncrement }) {
  return <button onClick={onIncrement}>Clicked {count} times</button>
}

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <ClickCounter count={count} onIncrement={() => setCount(count + 1)} />
      <ClickCounter count={count} onIncrement={() => setCount(count + 1)} />
    </>
  )
}
```

We ran both versions. In the starter, clicking the first button gives `["Clicked 1 times", "Clicked 0 times"]`. In the solution, clicking the first button gives `["Clicked 1 times", "Clicked 1 times"]`, and clicking the second one after that gives `["Clicked 2 times", "Clicked 2 times"]`.

</details>

4. **(Medium)** Predict, then fix. The user clicks "Next user". What does the input show? Why? Make it show `Ben`.

   ```jsx
   import { useState } from 'react'

   function NameEditor({ user }) {
     const [draft, setDraft] = useState(user.name)

     return <input aria-label="Name" value={draft} onChange={(e) => setDraft(e.target.value)} />
   }

   const USERS = [
     { id: 1, name: 'Asha' },
     { id: 2, name: 'Ben' },
   ]

   export default function App() {
     const [index, setIndex] = useState(0)

     return (
       <>
         <NameEditor user={USERS[index]} />
         <button onClick={() => setIndex(1)}>Next user</button>
       </>
     )
   }
   ```

<details>
<summary>Show answer</summary>

It still shows `Asha`. `useState(user.name)` uses the prop only on the first render. After the click, `NameEditor` gets a new `user` prop, but it is the same component in the same place, so React keeps its state and `draft` stays `'Asha'`. We ran this and the input value is `"Asha"` after the click.

The copy is deliberate here: `draft` is an editable starting value. The right fix is a `key`. A different key tells React that this is a different component instance, so it throws away the old state and starts again:

```jsx
export default function App() {
  const [index, setIndex] = useState(0)
  const user = USERS[index]

  return (
    <>
      <NameEditor key={user.id} user={user} />
      <button onClick={() => setIndex(1)}>Next user</button>
    </>
  )
}
```

We ran this version: after the click the input shows `"Ben"`. Do not fix it with an effect that copies the prop into state. The `key` is simpler and has no extra render.

</details>

5. **(Medium)** Code. Start from the finished product table (stage 5). Above the table, show the text `Showing X of Y products`, where X is the number of visible products and Y is the total. When no product matches, also show `No products match your search.` Do not add any new state.

<details>
<summary>Show answer</summary>

Both numbers are derived data. `ProductTable` already calculates `visibleProducts`, so it can use `visibleProducts.length` and `products.length`. Only the return statement of `ProductTable` changes:

```jsx
  return (
    <>
      <p>
        Showing {visibleProducts.length} of {products.length} products
      </p>
      {visibleProducts.length === 0 && <p>No products match your search.</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </>
  )
```

We ran it. At the start the first paragraph reads `Showing 6 of 6 products`. After typing `zzz` it reads `Showing 0 of 6 products` and the second paragraph appears. After typing `o` it reads `Showing 4 of 6 products` and there is no empty-state message.

Note `visibleProducts.length === 0 && ...`. The comparison gives a real boolean, so nothing odd is drawn. Writing `visibleProducts.length && ...` would draw a `0` on the screen (see [Conditional rendering and lists](06-conditional-rendering-and-lists.md)). The practice-app exercise [07 Filterable list](../practice-app/exercises/react/07-filterable-list/README.md) asks for similar counts and a reset button.

</details>

6. **(Medium)** Explain. A shop has a header with a cart badge showing the number of items, a product list where each product has an "Add to cart" button, and a cart page that lists the items. Where does the cart state live? What would you do if the header, the list and the cart page are far apart in the tree?

<details>
<summary>Show answer</summary>

Three components use the cart: the header (reads the count), the product list (adds), and the cart page (reads and removes). The state goes in their closest common parent. In a typical app that is the top of the app, so the cart state ends up in `App` (or in a layout component above all three).

The number in the badge is derived: `cart.length` or a sum of quantities. Do not store it. Store the cart once, as a list of `{ productId, quantity }`.

If the three components are far apart, passing the cart and its callbacks through every layer is prop drilling. Then I would move the cart into a context, with a `useReducer` for add and remove (see [useReducer](../02-hooks/06-usereducer.md)), or into a small store library. I would first try composition. Server-side carts (saved per user) would use a data-fetching library instead of local state. The practice-app exercise [19 Shopping cart with a reducer](../practice-app/exercises/react/19-shopping-cart-reducer/README.md) builds a cart like this.

</details>

7. **(Medium)** Code. In the code below, `onLogout` is passed through `Layout` and `Toolbar`, which do not use it. Fix the prop drilling with composition only. No context. The behaviour must stay the same: clicking "Log out" shows `Signed out`.

   ```jsx
   import { useState } from 'react'

   function LogoutButton({ onLogout }) {
     return <button onClick={onLogout}>Log out</button>
   }

   function Toolbar({ onLogout }) {
     return (
       <div role="toolbar">
         <LogoutButton onLogout={onLogout} />
       </div>
     )
   }

   function Layout({ onLogout }) {
     return (
       <div>
         <Toolbar onLogout={onLogout} />
         <main>Content</main>
       </div>
     )
   }

   export default function App() {
     const [loggedIn, setLoggedIn] = useState(true)

     if (!loggedIn) return <p>Signed out</p>
     return <Layout onLogout={() => setLoggedIn(false)} />
   }
   ```

<details>
<summary>Show answer</summary>

`App` owns the state, so `App` should create the button, and the middle components should just draw what they are given: `Toolbar` takes `children`, and `Layout` takes a `toolbar` slot plus `children`.

```jsx
import { useState } from 'react'

function LogoutButton({ onLogout }) {
  return <button onClick={onLogout}>Log out</button>
}

function Toolbar({ children }) {
  return <div role="toolbar">{children}</div>
}

function Layout({ toolbar, children }) {
  return (
    <div>
      {toolbar}
      <main>{children}</main>
    </div>
  )
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(true)

  if (!loggedIn) return <p>Signed out</p>
  return (
    <Layout
      toolbar={
        <Toolbar>
          <LogoutButton onLogout={() => setLoggedIn(false)} />
        </Toolbar>
      }
    >
      Content
    </Layout>
  )
}
```

We ran both versions: clicking "Log out" leads to the text `Signed out` in each. Now `Layout` and `Toolbar` know nothing about logging out, and the callback goes straight from the owner to the button.

</details>

8. **(Hard)** Predict, then fix. A user focuses the Name box and types `abc`. What ends up in the box and in the paragraph? Why? How do you fix it?

   ```jsx
   import { useState } from 'react'

   export default function SignupForm() {
     const [name, setName] = useState('')

     function NameInput() {
       return <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
     }

     return (
       <form>
         <NameInput />
         <p>Hello, {name}</p>
       </form>
     )
   }
   ```

<details>
<summary>Show answer</summary>

Only the first letter arrives: the box holds `a` and the paragraph reads `Hello, a`. The remaining keystrokes are lost because the input has lost focus.

`NameInput` is a new function on every render of `SignupForm`. React decides whether to keep or replace a component by comparing its type. A new function is a new type, so React removes the old input from the page and creates a fresh one on each render. A fresh input has no focus. We ran this: the value was `"a"`, the paragraph was `Hello, a`, the original input was no longer in the document, and nothing had focus.

Fix: define `NameInput` outside `SignupForm` and pass `name` and `onNameChange` as props (the fixed code is in section 13). The same test then gives `"abc"` and `Hello, abc`, on the same DOM node. Rule: never define a component inside another component.

</details>

9. **(Hard)** Predict. `SlowTable` logs a line each time it renders. The user types `abc` into the box (three keystrokes). How many `SlowTable rendered` lines are logged in total, counting the first render? Why? What would change if `<SlowTable />` were written inside `SearchSection` instead of being passed as `children`?

   ```jsx
   import { useState } from 'react'

   function SlowTable() {
     console.log('SlowTable rendered')
     return <p>A big table</p>
   }

   function SearchSection({ children }) {
     const [text, setText] = useState('')

     return (
       <>
         <input aria-label="Search" value={text} onChange={(e) => setText(e.target.value)} />
         <p>You typed: {text}</p>
         {children}
       </>
     )
   }

   export default function App() {
     return (
       <SearchSection>
         <SlowTable />
       </SearchSection>
     )
   }
   ```

<details>
<summary>Show answer</summary>

One line only, from the first render. We ran it (without StrictMode) and `SlowTable rendered` was logged once after typing `abc`.

The `<SlowTable />` element is created inside `App`, and `App` does not render again, because the state belongs to `SearchSection`. When `SearchSection` renders after a keystroke, `children` is the exact same element object as before. React sees that the element has not changed, so it skips `SlowTable`.

If `<SlowTable />` were written directly inside `SearchSection`, a new element would be created on every render of `SearchSection`, and the table would render every time. We ran that version too: 4 lines (mount plus three keystrokes). So passing expensive parts as `children` is a free way to keep state-holding components from re-rendering them. This is the "composition" trick for performance. With StrictMode in development you would see each count doubled.

</details>

10. **(Hard)** Explain. You are asked in an interview: "Build a task list with three tabs: All, Active and Done." Narrate the five steps for it, naming the components, the state and where it lives, and the callbacks.

<details>
<summary>Show answer</summary>

A model narration:

1. **Hierarchy.** `TaskApp` is the parent. Inside it: `AddTaskForm` (a text box and a button), `FilterTabs` (three buttons), and `TaskList`, which renders one `TaskItem` per task (checkbox, text, delete button).
2. **Static version.** Build it with props only: `TaskList` gets an array of tasks, `TaskItem` gets one task, `FilterTabs` gets the current filter. No `useState` yet.
3. **Minimal state.** The array of tasks (changes, not calculable) and the selected filter (`'all'`, `'active'` or `'done'`). The visible tasks and the counts are derived. The text in the add box is state too, but only `AddTaskForm` uses it, so it stays inside that component.
4. **Where state lives.** `TaskList`, `FilterTabs` and `AddTaskForm` all depend on the tasks or the filter, so the tasks and the filter live in `TaskApp`, their closest common parent.
5. **Inverse data flow.** `TaskApp` passes `onAdd(text)` to `AddTaskForm`, `onFilterChange(filter)` to `FilterTabs`, and `onToggle(id)` and `onDelete(id)` through `TaskList` to `TaskItem`. Each handler updates the tasks or the filter with a new array (no mutation), using ids so the right item changes.

Then add closing remarks: empty states per tab, `aria-pressed` or `role="tablist"` on the tabs, keyboard support, tests, and saving to `localStorage` if asked. Exercise 03 in the practice app (a basic task list) is a good drill for this.

</details>

11. **(Hard)** Code. Extend the lifted temperature converter to three boxes: Celsius, Fahrenheit and Kelvin (K = C + 273.15). Keep one piece of state. Make the code data-driven so that adding a fourth scale later means adding one entry to a table, not new components or new state.

<details>
<summary>Show answer</summary>

Describe each scale by how it converts to and from Celsius. Then converting from any scale to any other scale is two steps: to Celsius, then from Celsius. The state is still just the typed text and its scale.

```jsx
import { useState } from 'react'

const SCALES = {
  c: { label: 'Celsius', toCelsius: (v) => v, fromCelsius: (v) => v },
  f: {
    label: 'Fahrenheit',
    toCelsius: (v) => ((v - 32) * 5) / 9,
    fromCelsius: (v) => (v * 9) / 5 + 32,
  },
  k: { label: 'Kelvin', toCelsius: (v) => v - 273.15, fromCelsius: (v) => v + 273.15 },
}

function convert(text, from, to) {
  const number = parseFloat(text)
  if (Number.isNaN(number)) return ''
  const result = SCALES[to].fromCelsius(SCALES[from].toCelsius(number))
  return String(Math.round(result * 100) / 100)
}

function TemperatureInput({ label, value, onChange }) {
  return (
    <label>
      {label}{' '}
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

export default function Converter() {
  const [typed, setTyped] = useState({ scale: 'c', text: '' })

  return (
    <>
      {Object.entries(SCALES).map(([scale, { label }]) => (
        <TemperatureInput
          key={scale}
          label={label}
          value={scale === typed.scale ? typed.text : convert(typed.text, typed.scale, scale)}
          onChange={(text) => setTyped({ scale, text })}
        />
      ))}
    </>
  )
}
```

We ran it. Typing `100` in Celsius gives `["100", "212", "373.15"]` for Celsius, Fahrenheit and Kelvin. Then typing `0` in Kelvin gives `["-273.15", "-459.67", "0"]`.

The box being typed in shows the typed text, and every other box is calculated. The list of boxes is generated from the `SCALES` table, with the scale name as the `key`. Adding Rankine would mean one new entry in `SCALES`.

</details>

## Recap
- Thinking in React has five steps: component hierarchy, static version, minimal state, where state lives, inverse data flow.
- Data flows down as props and events flow up as callbacks. A child never edits a prop; it asks the parent through a function.
- State is only what changes, is not passed in, and cannot be calculated. Everything else is derived data, calculated while rendering.
- Put state in the closest common parent of the components that use it. As low as possible, as high as necessary. Colocate when only one component needs it.
- Lifting state up: remove state from the children, pass the value down, pass the change handlers down. Siblings can only share what a parent holds.
- Keep a single source of truth. Copies (a filtered list in state, a prop copied into state) go stale or out of sync.
- Prefer composition (`children`, slots, props) to inheritance. Avoid prop drilling with composition first, context second, a library third.
- In an interview, say the steps out loud: split the UI, build static, find the state, place it, wire the callbacks, then name what you would do with more time.

## Where to go next
- Next lesson: HTML, CSS and browser basics (planned). Then start the hooks track with [Hooks overview and rules](../02-hooks/01-hooks-overview-and-rules.md).
- Go deeper: [useState in depth](../02-hooks/02-usestate-in-depth.md) (derived state, reset with a key), [useContext](../02-hooks/05-usecontext.md), [Component patterns](../03-intermediate/01-component-patterns.md), [State management](../03-intermediate/06-state-management.md) and [How React renders](../04-advanced/01-how-react-renders.md).
- Practise: [07 Filterable list](../practice-app/exercises/react/07-filterable-list/README.md) and [08 Temperature converter](../practice-app/exercises/react/08-temperature-converter/README.md).
- Test yourself: [Round 4, machine coding](../05-interview-rounds/round-4-machine-coding/README.md) and Round 2, fundamentals (planned).
- Keep handy: Interview day checklist (planned).
