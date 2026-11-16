// Reference solution: the pure cart logic. There is no React in this file.
//
// State:   { items: [{ id, name, price, quantity }] }   (price is in cents)
// Actions: { type: 'add', product }   product is { id, name, price }
//          { type: 'increment', id }
//          { type: 'decrement', id }
//          { type: 'remove', id }
//          { type: 'clear' }
//
// Key ideas:
// - a reducer is a pure function: (state, action) => new state. It never
//   changes the state it receives, it builds copies with map, filter and spread
// - totals are NOT stored in the state. They are derived from the items
//   (see getItemCount and getTotals), so they can never get out of sync

export const initialState = { items: [] }

const TAX_RATE = 0.1

// Change one line's quantity by `delta` and drop any line that reaches 0.
// map() builds a new array and `{ ...item }` a new line, so nothing is mutated.
function changeQuantity(items, id, delta) {
  return items
    .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
    .filter((item) => item.quantity > 0)
}

export function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const { product } = action
      const inCart = state.items.some((item) => item.id === product.id)
      const items = inCart
        ? changeQuantity(state.items, product.id, 1)
        : [...state.items, { id: product.id, name: product.name, price: product.price, quantity: 1 }]
      return { ...state, items }
    }
    case 'increment':
      return { ...state, items: changeQuantity(state.items, action.id, 1) }
    case 'decrement':
      // Going from 1 to 0 removes the line (changeQuantity drops it).
      return { ...state, items: changeQuantity(state.items, action.id, -1) }
    case 'remove':
      return { ...state, items: state.items.filter((item) => item.id !== action.id) }
    case 'clear':
      return { ...state, items: [] }
    default:
      // A typo in an action type should fail loudly, not be ignored.
      throw new Error(`Unknown cart action: ${action.type}`)
  }
}

// Derived data: total number of units in the cart (not the number of lines).
export function getItemCount(state) {
  return state.items.reduce((sum, item) => sum + item.quantity, 0)
}

// Derived data: all amounts are whole cents. Tax is 10% of the subtotal,
// rounded to the nearest cent (Math.round rounds a half cent up).
export function getTotals(state) {
  const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = Math.round(subtotal * TAX_RATE)
  return { subtotal, tax, total: subtotal + tax }
}
