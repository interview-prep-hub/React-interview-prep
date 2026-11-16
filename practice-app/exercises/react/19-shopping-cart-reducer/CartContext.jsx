import { createContext, useContext, useMemo, useReducer } from 'react'
import { cartReducer, initialState, getItemCount, getTotals } from './cartReducer.js'

// Exercise 19, step 2: share the cart with the whole component tree.
// Read README.md for the exact shape that useCart() must return.

const CartContext = createContext(null)

export function CartProvider({ children }) {
  // TODO 1: keep the cart in useReducer(cartReducer, initialState)

  // TODO 2: build the helper functions add, increment, decrement, remove and clear.
  //         Each one calls dispatch with the matching action from cartReducer.js.

  // TODO 3: build the context value: items, itemCount, subtotal, tax, total and the
  //         five helpers. Compute itemCount and the totals from the state (do not
  //         store them). Memoise the value with useMemo so consumers only re-render
  //         when the cart really changes.

  // TODO 4: provide the value. In React 19 you can render <CartContext value={...}>.
  return children
}

export function useCart() {
  // TODO 5: read the value with useContext(CartContext). If it is null (no
  //         provider above), throw an Error whose message mentions CartProvider.

  // Placeholder with the right shape so the rest of the app can run.
  // Replace all of it.
  return {
    items: [],
    itemCount: 0,
    subtotal: 0,
    tax: 0,
    total: 0,
    add() {},
    increment() {},
    decrement() {},
    remove() {},
    clear() {},
  }
}
