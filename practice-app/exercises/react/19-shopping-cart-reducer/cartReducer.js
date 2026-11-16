// Exercise 19, step 1: the pure cart logic. There is no React in this file.
// Its tests are in cartReducer.test.js (run them with the command in README.md).
//
// State:   { items: [{ id, name, price, quantity }] }   (price is in cents)
// Actions: { type: 'add', product }   product is { id, name, price }
//          { type: 'increment', id }
//          { type: 'decrement', id }
//          { type: 'remove', id }
//          { type: 'clear' }

export const initialState = { items: [] }

// A reducer takes the current state and an action and RETURNS the next state.
// It must be pure: never change `state` or anything inside it (no push, no
// quantity++, no item.quantity = ...). Build new arrays and new objects instead.
export function cartReducer(state, action) {
  switch (action.type) {
    // TODO 1: 'add'. If the product is already in the cart, add one to that
    //         line's quantity. If not, append a new line with quantity 1.
    // TODO 2: 'increment'. Add one to the line with action.id.
    // TODO 3: 'decrement'. Subtract one. A line that reaches 0 disappears.
    // TODO 4: 'remove'. Delete the line with action.id, whatever its quantity.
    // TODO 5: 'clear'. Return an empty cart.
    default:
      // TODO 6: an action type you do not know should throw an Error
      return state
  }
}

// Derived data: do not store it in the state, compute it from the items.

// TODO 7: the total number of units in the cart (add up the quantities).
export function getItemCount(state) {
  // write the return statement here
}

// TODO 8: subtotal = sum of price * quantity (in cents).
//         tax = 10% of the subtotal, rounded to the nearest cent.
//         total = subtotal + tax.
export function getTotals(state) {
  // write the return statement here: an object { subtotal, tax, total }
}
