import { createContext, useContext, useMemo, useReducer } from 'react'
import { cartReducer, initialState, getItemCount, getTotals } from './cartReducer.js'

// Reference solution: the context that shares the cart with the whole tree.
// Key ideas:
// - useReducer holds the state, the reducer holds the rules
// - components get small helper functions (add, remove, ...) instead of raw dispatch
// - the context value is memoised, so consumers re-render only when the cart changes

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // dispatch is stable (it never changes), so these helpers are created once.
  const actions = useMemo(
    () => ({
      add: (product) => dispatch({ type: 'add', product }),
      increment: (id) => dispatch({ type: 'increment', id }),
      decrement: (id) => dispatch({ type: 'decrement', id }),
      remove: (id) => dispatch({ type: 'remove', id }),
      clear: () => dispatch({ type: 'clear' }),
    }),
    [],
  )

  // Totals are derived from the state on each change, never stored.
  // Without useMemo this object would be new on every render of the provider,
  // and every consumer would re-render even when the cart did not change.
  const value = useMemo(
    () => ({
      items: state.items,
      itemCount: getItemCount(state),
      ...getTotals(state),
      ...actions,
    }),
    [state, actions],
  )

  // React 19: the context itself can be used as the provider.
  return <CartContext value={value}>{children}</CartContext>
}

export function useCart() {
  const cart = useContext(CartContext)
  if (cart === null) {
    // Fail with a clear message instead of "cannot read properties of null".
    throw new Error('useCart must be used inside a <CartProvider>')
  }
  return cart
}
