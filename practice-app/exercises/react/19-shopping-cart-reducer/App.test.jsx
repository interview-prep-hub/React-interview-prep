import { StrictMode } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

// Some tests click many buttons. On a slow or busy computer that can pass the
// default limit of 5 seconds, so give every test in this file more time.
vi.setConfig({ testTimeout: 20000 })

// Helpers that read the screen the way a user would.
const productsRegion = () => within(screen.getByRole('region', { name: 'Products' }))
const cartRegion = () => within(screen.getByRole('region', { name: 'Cart' }))
// The list of cart lines is the list named "Cart items". It is missing when the cart is empty.
const linesList = () => cartRegion().queryByRole('list', { name: 'Cart items' })
const lines = () => {
  const list = linesList()
  return list ? within(list).getAllByRole('listitem') : []
}
const quantity = (id) => screen.getByTestId(`quantity-${id}`)

const add = (user, productName) =>
  user.click(screen.getByRole('button', { name: `Add ${productName} to cart` }))

describe('19 Shopping cart with a reducer and context', () => {
  describe('products', () => {
    it('lists the four products with their formatted prices', () => {
      render(<App />)
      const items = productsRegion().getAllByRole('listitem')
      expect(items).toHaveLength(4)
      expect(items[0]).toHaveTextContent('Notebook')
      expect(items[0]).toHaveTextContent('$4.50')
      expect(items[1]).toHaveTextContent('Pen')
      expect(items[1]).toHaveTextContent('$1.25')
      expect(items[2]).toHaveTextContent('Backpack')
      expect(items[2]).toHaveTextContent('$39.99')
      expect(items[3]).toHaveTextContent('Desk Lamp')
      expect(items[3]).toHaveTextContent('$24.00')
    })

    it('has an Add button for every product', () => {
      render(<App />)
      for (const name of ['Notebook', 'Pen', 'Backpack', 'Desk Lamp']) {
        expect(screen.getByRole('button', { name: `Add ${name} to cart` })).toBeInTheDocument()
      }
    })
  })

  describe('empty cart', () => {
    it('starts empty: message, zero badge, zero totals and a disabled Clear cart', () => {
      render(<App />)
      expect(cartRegion().getByText('Your cart is empty.')).toBeInTheDocument()
      expect(linesList()).not.toBeInTheDocument()
      expect(screen.getByTestId('cart-count')).toHaveTextContent(/^0$/)
      expect(cartRegion().getByText('Subtotal')).toBeInTheDocument()
      expect(cartRegion().getByText('Tax (10%)')).toBeInTheDocument()
      expect(cartRegion().getByText('Total')).toBeInTheDocument()
      expect(screen.getByTestId('subtotal')).toHaveTextContent('$0.00')
      expect(screen.getByTestId('tax')).toHaveTextContent('$0.00')
      expect(screen.getByTestId('total')).toHaveTextContent('$0.00')
      expect(screen.getByRole('button', { name: 'Clear cart' })).toBeDisabled()
    })
  })

  describe('adding', () => {
    it('adds a product as a line with quantity 1', async () => {
      const user = userEvent.setup()
      render(<App />)
      await add(user, 'Notebook')
      expect(lines()).toHaveLength(1)
      expect(lines()[0]).toHaveTextContent('Notebook')
      expect(quantity('p1')).toHaveTextContent(/^1$/)
      expect(cartRegion().queryByText('Your cart is empty.')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Clear cart' })).toBeEnabled()
    })

    it('adding the same product again raises its quantity instead of adding a second line', async () => {
      const user = userEvent.setup()
      render(<App />)
      await add(user, 'Notebook')
      await add(user, 'Notebook')
      await add(user, 'Notebook')
      expect(lines()).toHaveLength(1)
      expect(quantity('p1')).toHaveTextContent(/^3$/)
    })

    it('keeps lines in the order the products were first added', async () => {
      const user = userEvent.setup()
      render(<App />)
      await add(user, 'Pen')
      await add(user, 'Notebook')
      await add(user, 'Pen')
      expect(lines()).toHaveLength(2)
      expect(lines()[0]).toHaveTextContent('Pen')
      expect(lines()[1]).toHaveTextContent('Notebook')
      expect(quantity('p2')).toHaveTextContent(/^2$/)
      expect(quantity('p1')).toHaveTextContent(/^1$/)
    })
  })

  describe('changing quantities', () => {
    it('+ adds one to that line only', async () => {
      const user = userEvent.setup()
      render(<App />)
      await add(user, 'Notebook')
      await add(user, 'Pen')
      await add(user, 'Backpack')
      // Pen is the middle line: a button wired to the first or the last line would fail.
      await user.click(screen.getByRole('button', { name: 'Increase Pen' }))
      expect(quantity('p1')).toHaveTextContent(/^1$/)
      expect(quantity('p2')).toHaveTextContent(/^2$/)
      expect(quantity('p3')).toHaveTextContent(/^1$/)
    })

    it('- takes one off that line only', async () => {
      const user = userEvent.setup()
      render(<App />)
      for (const name of ['Notebook', 'Notebook', 'Pen', 'Pen', 'Backpack', 'Backpack']) {
        await add(user, name)
      }
      await user.click(screen.getByRole('button', { name: 'Decrease Pen' }))
      expect(quantity('p1')).toHaveTextContent(/^2$/)
      expect(quantity('p2')).toHaveTextContent(/^1$/)
      expect(quantity('p3')).toHaveTextContent(/^2$/)
    })

    it('- on a quantity of 1 removes the line', async () => {
      const user = userEvent.setup()
      render(<App />)
      await add(user, 'Notebook')
      await add(user, 'Pen')
      await user.click(screen.getByRole('button', { name: 'Decrease Notebook' }))
      expect(lines()).toHaveLength(1)
      expect(lines()[0]).toHaveTextContent('Pen')
      expect(screen.queryByTestId('quantity-p1')).not.toBeInTheDocument()
    })

    it('Remove deletes the line whatever its quantity', async () => {
      const user = userEvent.setup()
      render(<App />)
      await add(user, 'Notebook')
      await add(user, 'Backpack')
      await add(user, 'Backpack')
      await add(user, 'Backpack')
      await add(user, 'Pen')
      // Backpack is the middle line, with a quantity of 3.
      await user.click(screen.getByRole('button', { name: 'Remove Backpack' }))
      expect(lines()).toHaveLength(2)
      expect(lines()[0]).toHaveTextContent('Notebook')
      expect(lines()[1]).toHaveTextContent('Pen')
      expect(screen.queryByTestId('quantity-p3')).not.toBeInTheDocument()
      expect(screen.getByTestId('cart-count')).toHaveTextContent(/^2$/)
    })

    it('shows the empty message again after the last line is removed', async () => {
      const user = userEvent.setup()
      render(<App />)
      await add(user, 'Pen')
      await user.click(screen.getByRole('button', { name: 'Remove Pen' }))
      expect(cartRegion().getByText('Your cart is empty.')).toBeInTheDocument()
      expect(linesList()).not.toBeInTheDocument()
      expect(screen.getByTestId('total')).toHaveTextContent('$0.00')
    })
  })

  describe('header badge', () => {
    it('shows the total number of items (sum of quantities), not the number of lines', async () => {
      const user = userEvent.setup()
      render(<App />)
      await add(user, 'Notebook')
      await add(user, 'Notebook')
      await add(user, 'Pen')
      expect(screen.getByTestId('cart-count')).toHaveTextContent(/^3$/)
      await user.click(screen.getByRole('button', { name: 'Increase Pen' }))
      expect(screen.getByTestId('cart-count')).toHaveTextContent(/^4$/)
      await user.click(screen.getByRole('button', { name: 'Remove Notebook' }))
      expect(screen.getByTestId('cart-count')).toHaveTextContent(/^2$/)
    })
  })

  describe('totals', () => {
    it('shows subtotal, 10% tax and total formatted as dollars', async () => {
      const user = userEvent.setup()
      render(<App />)
      await add(user, 'Notebook')
      await add(user, 'Notebook')
      await add(user, 'Backpack')
      // subtotal 2 x 4.50 + 39.99 = 48.99, tax 4.899 rounds to 4.90, total 53.89
      expect(screen.getByTestId('subtotal')).toHaveTextContent(/^\$48\.99$/)
      expect(screen.getByTestId('tax')).toHaveTextContent(/^\$4\.90$/)
      expect(screen.getByTestId('total')).toHaveTextContent(/^\$53\.89$/)
    })

    it('updates the totals when quantities change', async () => {
      const user = userEvent.setup()
      render(<App />)
      await add(user, 'Notebook')
      expect(screen.getByTestId('subtotal')).toHaveTextContent(/^\$4\.50$/)
      expect(screen.getByTestId('tax')).toHaveTextContent(/^\$0\.45$/)
      expect(screen.getByTestId('total')).toHaveTextContent(/^\$4\.95$/)

      await user.click(screen.getByRole('button', { name: 'Increase Notebook' }))
      expect(screen.getByTestId('subtotal')).toHaveTextContent(/^\$9\.00$/)
      expect(screen.getByTestId('tax')).toHaveTextContent(/^\$0\.90$/)
      expect(screen.getByTestId('total')).toHaveTextContent(/^\$9\.90$/)

      await user.click(screen.getByRole('button', { name: 'Remove Notebook' }))
      expect(screen.getByTestId('total')).toHaveTextContent(/^\$0\.00$/)
    })

    it('rounds the tax to the nearest cent, and a half cent goes up', async () => {
      const user = userEvent.setup()
      render(<App />)
      await add(user, 'Pen')
      // $1.25 -> tax is exactly 12.5 cents, which rounds up to 13 cents
      expect(screen.getByTestId('subtotal')).toHaveTextContent(/^\$1\.25$/)
      expect(screen.getByTestId('tax')).toHaveTextContent(/^\$0\.13$/)
      expect(screen.getByTestId('total')).toHaveTextContent(/^\$1\.38$/)
    })
  })

  describe('clearing', () => {
    it('Clear cart empties the cart, the badge and the totals', async () => {
      const user = userEvent.setup()
      render(<App />)
      await add(user, 'Desk Lamp')
      await add(user, 'Pen')
      await add(user, 'Pen')
      await user.click(screen.getByRole('button', { name: 'Clear cart' }))
      expect(linesList()).not.toBeInTheDocument()
      expect(cartRegion().getByText('Your cart is empty.')).toBeInTheDocument()
      expect(screen.getByTestId('cart-count')).toHaveTextContent(/^0$/)
      expect(screen.getByTestId('subtotal')).toHaveTextContent('$0.00')
      expect(screen.getByRole('button', { name: 'Clear cart' })).toBeDisabled()
    })

    it('lets you start shopping again after clearing', async () => {
      const user = userEvent.setup()
      render(<App />)
      await add(user, 'Pen')
      await user.click(screen.getByRole('button', { name: 'Clear cart' }))
      await add(user, 'Pen')
      expect(quantity('p2')).toHaveTextContent(/^1$/)
      expect(screen.getByTestId('cart-count')).toHaveTextContent(/^1$/)
    })
  })

  describe('purity under StrictMode', () => {
    // In development, StrictMode calls every reducer twice with the same input.
    // A reducer that mutates its state ends up counting each click twice.
    it('counts each click exactly once even though React calls the reducer twice', async () => {
      const user = userEvent.setup()
      render(<App />, { wrapper: StrictMode })
      await add(user, 'Notebook')
      expect(quantity('p1')).toHaveTextContent(/^1$/)
      await add(user, 'Notebook')
      expect(quantity('p1')).toHaveTextContent(/^2$/)
      await user.click(screen.getByRole('button', { name: 'Increase Notebook' }))
      expect(quantity('p1')).toHaveTextContent(/^3$/)
      await user.click(screen.getByRole('button', { name: 'Decrease Notebook' }))
      expect(quantity('p1')).toHaveTextContent(/^2$/)
      expect(screen.getByTestId('cart-count')).toHaveTextContent(/^2$/)
    })
  })
})
