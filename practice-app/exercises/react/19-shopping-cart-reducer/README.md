# 19 - Shopping cart with a reducer and context

**Level:** Medium | **Time:** 45 minutes | **Topics:** `useReducer`, context, pure reducers, derived totals

## The task

Build a small shop. A visitor can add products to a cart, change quantities, remove lines, and see the subtotal, the tax and the total. The same cart is shown in two places (a counter in the header and the cart list), so you share it through a context.

You write three pieces, in this order:

1. [`cartReducer.js`](./cartReducer.js): the pure cart logic. There is no React in this file.
2. [`CartContext.jsx`](./CartContext.jsx): a `CartProvider` component and a `useCart()` hook.
3. [`App.jsx`](./App.jsx): the screen.

Two files are given and you should not edit them: [`products.js`](./products.js) (the four products) and [`formatPrice.js`](./formatPrice.js) (turns cents into text, so `formatPrice(1250)` is `"$12.50"`). Do not edit the test files either.

Money is stored in whole cents: a price of `450` means $4.50. Integers never give float errors such as `0.1 + 0.2 = 0.30000000000000004`. You only turn cents into dollars when you show them on screen, with `formatPrice`.

What the finished screen looks like (the text is only a sketch):

```text
Corner Shop                        Items in cart: 3

Products
  Notebook    $4.50    [Add]
  Pen         $1.25    [Add]
  Backpack    $39.99   [Add]
  Desk Lamp   $24.00   [Add]

Cart
  Notebook   [-] 2 [+]   [Remove]
  Pen        [-] 1 [+]   [Remove]

  Subtotal    $10.25
  Tax (10%)   $1.03
  Total       $11.28
  [Clear cart]
```

## Requirements

### Part 1: the reducer in `cartReducer.js`

The cart state is an object with one array: `{ items: [...] }`. Each item (a "line") is `{ id, name, price, quantity }`.

1. `initialState` is `{ items: [] }`. It is already exported for you.
2. `cartReducer(state, action)` returns the next state for these actions:

   | Action | What it does |
   | --- | --- |
   | `{ type: 'add', product }` | `product` is `{ id, name, price }`. If a line with that `id` already exists (lines are matched by `id`, never by name), add 1 to its quantity. Otherwise append a new line `{ id, name, price, quantity: 1 }` at the end of `items`. |
   | `{ type: 'increment', id }` | Add 1 to the quantity of the line with that `id`. |
   | `{ type: 'decrement', id }` | Subtract 1 from the quantity of the line with that `id`. A line whose quantity reaches 0 is removed. |
   | `{ type: 'remove', id }` | Remove the line with that `id`, whatever its quantity. The other lines keep their order. |
   | `{ type: 'clear' }` | Return an empty cart: `{ items: [] }`. |

3. For `increment`, `decrement` and `remove`, an `id` that is not in the cart is not an error. The cart simply stays equal to what it was.
4. An action with a `type` you do not know makes the reducer throw an `Error`.
5. The reducer is **pure**. It never changes the `state` it receives, nor the `action`, nor anything inside them (no `push`, no `quantity++`, no `item.quantity = ...`, no `product.quantity = ...`). It builds new objects and arrays. The tests freeze the old state and the action, and check that the old state is untouched afterwards.
6. `getItemCount(state)` returns the total number of units in the cart: the sum of all quantities (not the number of lines).
7. `getTotals(state)` returns `{ subtotal, tax, total }`, all in whole cents:
   - `subtotal` is the sum of `price * quantity` over all lines;
   - `tax` is 10% of the subtotal, rounded to the nearest cent (a half cent rounds up, so 12.5 cents becomes 13);
   - `total` is `subtotal + tax`.
8. The item count and the totals are **derived data**. Do not store them in the state. Compute them from `items` whenever you need them. `getItemCount` and `getTotals` only read the state, they never change it.

### Part 2: the context in `CartContext.jsx`

9. Export a `CartProvider` component. It takes `children` and keeps the cart with `useReducer(cartReducer, initialState)`.
10. Export a `useCart()` hook. Inside a provider it returns an object with these members:

    | Member | Value |
    | --- | --- |
    | `items` | the array of lines |
    | `itemCount` | the same number `getItemCount` gives |
    | `subtotal`, `tax`, `total` | the three numbers `getTotals` gives (cents) |
    | `add(product)` | adds one unit of `product` (an object `{ id, name, price }`) |
    | `increment(id)` | adds one to a line |
    | `decrement(id)` | takes one off a line (a line at 0 disappears) |
    | `remove(id)` | removes a line |
    | `clear()` | empties the cart |

11. Calling `useCart()` outside a `CartProvider` throws an `Error` whose message contains the word `CartProvider`.
12. Every component under one `CartProvider` sees the same cart.
13. Several helper calls in the same event handler all count. For example, a click handler that calls `add(notebook)` twice leaves a quantity of 2. (This is what a reducer gives you for free: each action is applied to the result of the previous one. Code that computes the next cart from the cart of the current render would lose one of the two.)
14. While the cart does not change, the value from `useCart()` stays the same, so a re-render of the parent of `CartProvider` does not re-render the components that call `useCart()`. (Build the context value with `useMemo`.)

### Part 3: the screen in `App.jsx`

15. The default export `App` takes no props and renders everything inside a `CartProvider`.
16. **Header.** An element with `data-testid="cart-count"` shows the total number of items in the cart (the sum of the quantities, not the number of lines). It shows `0` when the cart is empty. The element contains only the number.
17. **Products.** The `<section>` named **Products** (the starter already has it, keep its heading and `aria-labelledby`) contains a list with one `<li>` for each product in `PRODUCTS`, in the given order. Each item shows the product name and its price formatted with `formatPrice` (for example `$4.50`).
18. Each product has a button whose **accessible name** is exactly `Add <product name> to cart`, for example `Add Desk Lamp to cart`. The visible text can be shorter, such as `Add`: put the full name in `aria-label`.
19. Adding a product that is already in the cart raises its quantity. It does not create a second line.
20. **Cart.** The `<section>` named **Cart** (again, already in the starter) shows the paragraph `Your cart is empty.` when there are no lines. In that case the list named `Cart items` is not rendered at all.
21. Otherwise it shows a `<ul aria-label="Cart items">` with one `<li>` per line, in the order the products were first added. A line shows:
    - the product name;
    - the quantity in an element with `data-testid="quantity-<id>"` (for example `quantity-p1`), containing only the number;
    - a button with accessible name `Decrease <name>` (visible text `-`);
    - a button with accessible name `Increase <name>` (visible text `+`);
    - a button with accessible name `Remove <name>` (visible text `Remove`).
22. **Totals.** The Cart section always shows three labelled values, even when the cart is empty. Each label is its own element with exactly this text: `Subtotal`, `Tax (10%)`, `Total`. Each value is formatted with `formatPrice` and sits in an element with `data-testid` `subtotal`, `tax` and `total`. An empty cart shows `$0.00` for all three.
23. A button with accessible name `Clear cart` empties the cart. It is disabled while the cart is empty.
24. Design rule (the point of the exercise, even if no test can check it): the components do not keep their own copy of the cart or the totals. They read everything from `useCart()` and call its functions.

## Acceptance criteria (what the tests check)

`cartReducer.test.js` (pure functions, no React):

- Each of the five actions gives the right next state, including the edge cases: adding a product that is already there (matched by id), decrementing from 1 to 0, an unknown id, an empty result. Increment, decrement and remove change only the line with that id.
- An unknown action type throws an `Error`.
- For every action the old state and the action are frozen, the old state is untouched afterwards, and the reducer returns a new state object with a new `items` array.
- `getItemCount` adds up quantities. `getTotals` gives correct whole-cent numbers, including a tax that rounds down (333 cents) and one that is exactly half a cent (125 cents).

`CartContext.test.jsx` (a tiny test component calls `useCart()`):

- The cart starts empty with zero totals, `add` fills it, and the derived values follow.
- `increment`, `decrement`, `remove` and `clear` all work through the hook.
- Two helper calls in the same click handler both count.
- While the cart does not change, a re-render of the parent does not re-render a component that calls `useCart()`.
- Two components under one provider see the same cart.
- `useCart()` outside a provider throws an error that mentions `CartProvider`.

`App.test.jsx` (what a user sees and clicks):

- The four products are listed with their formatted prices and each has an Add button.
- The empty cart shows the message (and no `Cart items` list), a `0` counter, `$0.00` totals and a disabled Clear cart button.
- Adding creates a line; adding again raises the quantity; lines keep the order of first adding.
- `+`, `-` and Remove change only their own line (the tests use the middle line of three); `-` at quantity 1 removes the line.
- The header counter shows the sum of quantities.
- Subtotal, tax and total are correct, update after every change, and round the tax to the nearest cent.
- Clear cart empties everything, and you can shop again afterwards.
- In `StrictMode` (which runs reducers twice in development) each click still counts exactly once.

## How to run

```bash
npm test -- exercises/react/19-shopping-cart-reducer
```

While you work on one step, run only its tests:

```bash
npm test -- exercises/react/19-shopping-cart-reducer/cartReducer
npm test -- exercises/react/19-shopping-cart-reducer/CartContext
npm test -- exercises/react/19-shopping-cart-reducer/App
```

To see your shop in the browser, run `npm run dev` and pick `19-shopping-cart-reducer` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/19-shopping-cart-reducer
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Start with the reducer and its tests. Do not touch the screen until `cartReducer.test.js` is green. A pure function is the easiest thing to get right.
2. Every case returns a new object, for example `{ ...state, items: newItems }`. To change one line, use `items.map((item) => item.id === id ? { ...item, quantity: item.quantity + 1 } : item)`. To drop lines, use `filter`. Never use `push`, `splice` or `item.quantity++` on the old data.
3. `decrement` is "subtract one, then keep only the lines with a quantity above 0". One small helper function can serve `add`, `increment` and `decrement`.
4. Do not put `itemCount` or the totals in the state. If you store them, you must remember to update them in five different cases. If you compute them, they are always right.
5. For the tax, `Math.round` rounds a half up. Because the amounts are whole cents, the sum of the parts is always exactly the total.
6. In the provider, `const [state, dispatch] = useReducer(cartReducer, initialState)`. The `dispatch` function never changes between renders, so a small helper such as `(product) => dispatch({ type: 'add', product })` can be created once.
7. Build the context value with `useMemo` so it is a new object only when the cart changes. Otherwise every consumer re-renders each time the provider re-renders.
8. If you create the context with `createContext(null)`, then `useContext` returns `null` when there is no provider above. That is your signal to throw.
9. The playground and one test run in `StrictMode`, which calls your reducer twice with the same input in development. If one click adds 2 instead of 1, something in your reducer changes the old state.
10. `aria-label` on a button replaces its visible text as the accessible name. Testing Library finds buttons by that name.
11. If two helper calls in the same click handler only count once, the next cart was computed from the cart of the current render, which is a stale value. `dispatch` avoids this, because React applies each action to the latest state.

</details>

## Stretch goals

- Show the price of each line (price times quantity) next to its quantity. It is derived data, so do not store it.
- Split the context in two: one for the cart state and one for the actions. Check with a `console.log` that `ProductList` no longer re-renders when the cart changes.
- Save the cart in `localStorage` and load it on start. Use the lazy initialiser of `useReducer` and an effect that saves. Store only ids and quantities, and rebuild names and prices from `PRODUCTS`.
- Add a `{ type: 'setQuantity', id, quantity }` action and a number input per line (quantity 0 or less removes the line).
- Add a discount code: keep the code in the state and apply the discount inside `getTotals`.

## Interview follow-ups to prepare for

1. **Why a reducer rather than several `useState` calls?** Think about: how many places change the cart, how you would test those rules without rendering anything, what an action name tells a reader, and when plain `useState` is still the better choice.
2. **How would you stop all consumers re-rendering on every change?** Think about: what makes a context consumer re-render, why `ProductList` only needs `add`, what splitting the context does, what `useMemo` on the value does and does not fix, and when you would reach for a store library instead.
3. **How would you persist the cart?** Think about: where to keep it (`localStorage`, a cookie, the server for logged-in users), how to load it without a flash of an empty cart, what to store (ids and quantities, or whole lines with old prices?), what to do with invalid saved data, and what changes with server rendering.

## Learn the concepts first

- [useReducer](../../../../02-hooks/06-usereducer.md)
- [useContext](../../../../02-hooks/05-usecontext.md)
- [State management](../../../../03-intermediate/06-state-management.md)
