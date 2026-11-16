import { cartReducer, initialState, getItemCount, getTotals } from './cartReducer.js'

// Small fixtures. Prices are in cents.
const notebook = { id: 'p1', name: 'Notebook', price: 450 }
const pen = { id: 'p2', name: 'Pen', price: 125 }
const backpack = { id: 'p3', name: 'Backpack', price: 3999 }

// A cart line is a product plus a quantity.
const line = (product, quantity) => ({ ...product, quantity })
const cartOf = (...items) => ({ items })

// Freeze an object and everything inside it. Writing to a frozen object throws,
// so a reducer that mutates its input fails loudly.
function deepFreeze(value) {
  Object.values(value).forEach((inner) => {
    if (typeof inner === 'object' && inner !== null) deepFreeze(inner)
  })
  return Object.freeze(value)
}

describe('19 cartReducer (pure function)', () => {
  describe('add', () => {
    it('puts a new product in the cart with quantity 1', () => {
      const next = cartReducer(initialState, { type: 'add', product: notebook })
      expect(next).toEqual(cartOf(line(notebook, 1)))
    })

    it('puts new products after the lines that are already there', () => {
      const state = cartOf(line(notebook, 2))
      const next = cartReducer(state, { type: 'add', product: pen })
      expect(next).toEqual(cartOf(line(notebook, 2), line(pen, 1)))
    })

    it('adds one to the quantity when the product is already in the cart', () => {
      const state = cartOf(line(notebook, 2), line(pen, 1))
      const next = cartReducer(state, { type: 'add', product: notebook })
      expect(next).toEqual(cartOf(line(notebook, 3), line(pen, 1)))
    })

    it('tells products apart by id, not by name', () => {
      const first = { id: 'a1', name: 'Mug', price: 800 }
      const second = { id: 'a2', name: 'Mug', price: 950 }
      const state = cartReducer(cartOf(line(first, 1)), { type: 'add', product: second })
      expect(state).toEqual(cartOf(line(first, 1), line(second, 1)))
    })
  })

  describe('increment', () => {
    it('adds one to that line and leaves the others alone', () => {
      const state = cartOf(line(notebook, 1), line(pen, 4), line(backpack, 2))
      const next = cartReducer(state, { type: 'increment', id: 'p2' })
      expect(next).toEqual(cartOf(line(notebook, 1), line(pen, 5), line(backpack, 2)))
    })

    it('ignores an id that is not in the cart', () => {
      const state = cartOf(line(notebook, 1))
      expect(cartReducer(state, { type: 'increment', id: 'nope' })).toEqual(state)
    })
  })

  describe('decrement', () => {
    it('subtracts one from that line and leaves the others alone', () => {
      const state = cartOf(line(notebook, 3), line(pen, 2), line(backpack, 4))
      const next = cartReducer(state, { type: 'decrement', id: 'p2' })
      expect(next).toEqual(cartOf(line(notebook, 3), line(pen, 1), line(backpack, 4)))
    })

    it('removes the line when the quantity would reach 0', () => {
      const state = cartOf(line(notebook, 1), line(pen, 2))
      const next = cartReducer(state, { type: 'decrement', id: 'p1' })
      expect(next).toEqual(cartOf(line(pen, 2)))
    })

    it('ignores an id that is not in the cart', () => {
      const state = cartOf(line(notebook, 1))
      expect(cartReducer(state, { type: 'decrement', id: 'nope' })).toEqual(state)
    })
  })

  describe('remove', () => {
    it('removes the line whatever its quantity and keeps the order of the rest', () => {
      const state = cartOf(line(notebook, 1), line(pen, 7), line(backpack, 2))
      const next = cartReducer(state, { type: 'remove', id: 'p2' })
      expect(next).toEqual(cartOf(line(notebook, 1), line(backpack, 2)))
    })

    it('ignores an id that is not in the cart', () => {
      const state = cartOf(line(notebook, 1))
      expect(cartReducer(state, { type: 'remove', id: 'nope' })).toEqual(state)
    })
  })

  describe('clear', () => {
    it('empties the cart', () => {
      const state = cartOf(line(notebook, 2), line(pen, 1))
      expect(cartReducer(state, { type: 'clear' })).toEqual({ items: [] })
    })
  })

  describe('unknown actions', () => {
    it('throws an Error instead of silently ignoring a typo', () => {
      expect(() => cartReducer(initialState, { type: 'addd', product: notebook })).toThrow(Error)
    })
  })

  describe('purity: the previous state and the action are never changed', () => {
    const previous = () => cartOf(line(notebook, 2), line(pen, 1))

    it.each([
      ['add (new product)', { type: 'add', product: backpack }],
      ['add (product already in the cart)', { type: 'add', product: pen }],
      ['increment', { type: 'increment', id: 'p1' }],
      ['decrement', { type: 'decrement', id: 'p1' }],
      ['decrement (down to zero)', { type: 'decrement', id: 'p2' }],
      ['remove', { type: 'remove', id: 'p1' }],
      ['clear', { type: 'clear' }],
    ])('%s returns a new state and leaves the old one as it was', (_name, action) => {
      const old = previous()
      // The action is frozen too (a frozen copy, so the shared fixtures stay as they are).
      const frozenAction = deepFreeze(JSON.parse(JSON.stringify(action)))
      const next = cartReducer(deepFreeze(old), frozenAction)
      expect(next).not.toBe(old)
      expect(next.items).not.toBe(old.items)
      expect(old).toEqual(previous())
    })
  })
})

describe('19 getItemCount (derived data)', () => {
  it('is 0 for an empty cart', () => {
    expect(getItemCount(initialState)).toBe(0)
  })

  it('adds up the quantities, not the number of lines', () => {
    const state = cartOf(line(notebook, 2), line(pen, 3))
    expect(getItemCount(state)).toBe(5)
  })
})

describe('19 getTotals (derived data)', () => {
  it('is all zeros for an empty cart', () => {
    expect(getTotals(initialState)).toEqual({ subtotal: 0, tax: 0, total: 0 })
  })

  it('multiplies price by quantity for every line and adds 10% tax', () => {
    // 2 x 450 + 1 x 3999 = 4899 cents. Tax: 489.9 rounds to 490. Total: 5389.
    const state = cartOf(line(notebook, 2), line(backpack, 1))
    expect(getTotals(state)).toEqual({ subtotal: 4899, tax: 490, total: 5389 })
  })

  it('rounds the tax down below half a cent', () => {
    // 333 cents: tax is 33.3, which rounds to 33.
    const state = cartOf(line({ id: 'x', name: 'Odd', price: 333 }, 1))
    expect(getTotals(state)).toEqual({ subtotal: 333, tax: 33, total: 366 })
  })

  it('rounds a half cent up', () => {
    // 125 cents: tax is exactly 12.5, which rounds to 13.
    const state = cartOf(line(pen, 1))
    expect(getTotals(state)).toEqual({ subtotal: 125, tax: 13, total: 138 })
  })

  it('works for a cart with several lines and always returns whole cents', () => {
    // 3 x 450 + 7 x 125 + 2 x 3999 = 10223. Tax: 1022.3 rounds to 1022. Total: 11245.
    const state = cartOf(line(notebook, 3), line(pen, 7), line(backpack, 2))
    const totals = getTotals(state)
    expect(totals).toEqual({ subtotal: 10223, tax: 1022, total: 11245 })
    expect(Object.values(totals).every(Number.isInteger)).toBe(true)
  })

  it('does not change the state it reads', () => {
    const state = deepFreeze(cartOf(line(notebook, 2)))
    expect(getTotals(state)).toEqual({ subtotal: 900, tax: 90, total: 990 })
    expect(getItemCount(state)).toBe(2)
  })
})
