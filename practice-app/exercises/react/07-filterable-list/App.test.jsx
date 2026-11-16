import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import App from './App.jsx'

// Small helpers so each test reads like the README.
const searchBox = () => screen.getByLabelText(/search/i)
const categorySelect = () => screen.getByLabelText(/category/i)
const clearButton = () => screen.getByRole('button', { name: /clear filters/i })
const items = () => screen.queryAllByRole('listitem')

// The list must show exactly these products, in exactly this order.
function expectNames(names) {
  const shown = items()
  expect(shown).toHaveLength(names.length)
  names.forEach((name, index) => {
    expect(shown[index]).toHaveTextContent(name)
  })
}

// Same, but each item must also show ITS OWN category and price.
function expectRows(rows) {
  const shown = items()
  expect(shown).toHaveLength(rows.length)
  rows.forEach(([name, category, price], index) => {
    expect(shown[index]).toHaveTextContent(name)
    expect(shown[index]).toHaveTextContent(category)
    expect(shown[index]).toHaveTextContent(price)
  })
}

function expectCount(shown, total) {
  expect(screen.getByRole('status')).toHaveTextContent(
    new RegExp(`^Showing ${shown} of ${total} products$`),
  )
}

// [name, category, price as it must be displayed], in the original order.
const ALL_ROWS = [
  ['Wireless Mouse', 'Electronics', '$24.99'],
  ['Mechanical Keyboard', 'Electronics', '$89.50'],
  ['USB-C Hub', 'Electronics', '$45.00'],
  ['Noise Cancelling Headphones', 'Electronics', '$199.00'],
  ['Learning React', 'Books', '$34.90'],
  ['Clean Code', 'Books', '$29.99'],
  ['Eloquent JavaScript', 'Books', '$27.50'],
  ['Cotton T-Shirt', 'Clothing', '$14.99'],
  ['Denim Jacket', 'Clothing', '$69.00'],
  ['Running Shoes', 'Clothing', '$59.95'],
  ['Desk Lamp', 'Home', '$31.50'],
  ['Coffee Mug', 'Home', '$12.00'],
]
const ALL_NAMES = ALL_ROWS.map(([name]) => name)
const rowsOf = (category) => ALL_ROWS.filter((row) => row[1] === category)

describe('07 Filterable product list', () => {
  describe('first render', () => {
    it('shows all 12 products in the original order', () => {
      render(<App />)
      expectNames(ALL_NAMES)
    })

    it('shows the category and the price (two decimals) for each product', () => {
      render(<App />)
      expectRows(ALL_ROWS)
    })

    it('has a "Products" heading (h2)', () => {
      render(<App />)
      expect(screen.getByRole('heading', { level: 2, name: 'Products' })).toBeInTheDocument()
    })

    it('shows "Showing 12 of 12 products" and no empty message', () => {
      render(<App />)
      expectCount(12, 12)
      expect(screen.queryByText('No products found')).not.toBeInTheDocument()
    })

    it('has an empty search box and a category select set to All', () => {
      render(<App />)
      expect(searchBox()).toHaveValue('')
      expect(categorySelect()).toHaveDisplayValue('All')
    })

    it('offers All plus each category once, in order of first appearance', () => {
      render(<App />)
      const options = within(categorySelect()).getAllByRole('option')
      expect(options.map((option) => option.textContent)).toEqual([
        'All',
        'Electronics',
        'Books',
        'Clothing',
        'Home',
      ])
    })
  })

  describe('search by name', () => {
    it('matches part of a name, anywhere in the name', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(searchBox(), 'board')
      expectNames(['Mechanical Keyboard'])
      expectCount(1, 12)
    })

    it('ignores letter case', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(searchBox(), 'MoUsE')
      expectNames(['Wireless Mouse'])
    })

    it('ignores spaces around the text but still shows what the user typed', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(searchBox(), '  mouse  ')
      expectNames(['Wireless Mouse'])
      expect(searchBox()).toHaveValue('  mouse  ')
    })

    it('treats a search made only of spaces as no search', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(searchBox(), '   ')
      expectNames(ALL_NAMES)
      expectCount(12, 12)
      expect(screen.queryByText('No products found')).not.toBeInTheDocument()
    })

    it('searches the name only, not the category or the price', async () => {
      const user = userEvent.setup()
      render(<App />)

      await user.type(searchBox(), 'electronics')
      expect(screen.getByText('No products found')).toBeInTheDocument()

      // 24.99, 29.99, 14.99 and 199 all contain "99", but no name does.
      await user.clear(searchBox())
      await user.type(searchBox(), '99')
      expect(screen.getByText('No products found')).toBeInTheDocument()
      expectCount(0, 12)
    })

    it('takes the search text literally, it is not a pattern', async () => {
      const user = userEvent.setup()
      render(<App />)

      // As a regular expression "." would match every name. Literally, no name has a dot.
      await user.type(searchBox(), '.')
      expect(screen.getByText('No products found')).toBeInTheDocument()

      // As a regular expression "(" would throw an error. Literally, it just finds nothing.
      await user.clear(searchBox())
      await user.type(searchBox(), '(')
      expect(screen.getByText('No products found')).toBeInTheDocument()

      // A character that appears in names still works: USB-C Hub and Cotton T-Shirt.
      await user.clear(searchBox())
      await user.type(searchBox(), '-')
      expectNames(['USB-C Hub', 'Cotton T-Shirt'])
    })

    it('shows everything again when the search text is deleted', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(searchBox(), 'mouse')
      expect(items()).toHaveLength(1)
      await user.clear(searchBox())
      expectNames(ALL_NAMES)
      expectCount(12, 12)
    })
  })

  describe('filter by category', () => {
    it('shows only the products of the chosen category', async () => {
      const user = userEvent.setup()
      render(<App />)

      await user.selectOptions(categorySelect(), 'Books')
      expectNames(['Learning React', 'Clean Code', 'Eloquent JavaScript'])
      expectCount(3, 12)

      await user.selectOptions(categorySelect(), 'Electronics')
      expect(items()).toHaveLength(4)
      expectCount(4, 12)
    })

    it('keeps showing the right category and price for each item that is left', async () => {
      const user = userEvent.setup()
      render(<App />)

      await user.selectOptions(categorySelect(), 'Books')
      expectRows(rowsOf('Books'))

      await user.selectOptions(categorySelect(), 'Home')
      expectRows(rowsOf('Home'))
    })

    it('keeps the same list item for a product while other products come and go', async () => {
      const user = userEvent.setup()
      render(<App />)

      await user.type(searchBox(), 'co')
      expectNames(['Clean Code', 'Cotton T-Shirt', 'Coffee Mug'])
      const mug = items()[2]

      await user.selectOptions(categorySelect(), 'Home')
      expectNames(['Coffee Mug'])

      // A stable key (the product id) lets React reuse the very same <li>.
      // A key built from the array index would hand this <li> to another product.
      expect(items()[0]).toBe(mug)
    })

    it('shows every product again when All is chosen', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.selectOptions(categorySelect(), 'Home')
      expectNames(['Desk Lamp', 'Coffee Mug'])
      await user.selectOptions(categorySelect(), 'All')
      expectNames(ALL_NAMES)
      expectCount(12, 12)
    })
  })

  describe('both filters together', () => {
    it('applies the search text and the category at the same time', async () => {
      const user = userEvent.setup()
      render(<App />)

      // "co" appears in a Books, a Clothing and a Home product.
      await user.type(searchBox(), 'co')
      expectNames(['Clean Code', 'Cotton T-Shirt', 'Coffee Mug'])
      expectCount(3, 12)

      await user.selectOptions(categorySelect(), 'Books')
      expectNames(['Clean Code'])
      expectCount(1, 12)

      await user.selectOptions(categorySelect(), 'Home')
      expectNames(['Coffee Mug'])

      await user.selectOptions(categorySelect(), 'All')
      expectNames(['Clean Code', 'Cotton T-Shirt', 'Coffee Mug'])
    })

    it('works the same when the category is chosen before typing', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.selectOptions(categorySelect(), 'Clothing')
      await user.type(searchBox(), 'o')
      expectNames(['Cotton T-Shirt', 'Running Shoes'])
      expectCount(2, 12)
    })
  })

  describe('empty result', () => {
    it('shows "No products found", hides the list and counts 0', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(searchBox(), 'zzz')

      expect(screen.getByText('No products found')).toBeInTheDocument()
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
      expect(items()).toHaveLength(0)
      expectCount(0, 12)
    })

    it('shows "No products found" when the two filters have nothing in common', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.selectOptions(categorySelect(), 'Electronics')
      await user.type(searchBox(), 'clean')
      expect(screen.getByText('No products found')).toBeInTheDocument()
      expectCount(0, 12)
    })

    it('also handles a products array that is empty from the start', () => {
      render(<App products={[]} />)
      expect(screen.getByText('No products found')).toBeInTheDocument()
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
      expectCount(0, 0)
      const options = within(categorySelect()).getAllByRole('option')
      expect(options.map((option) => option.textContent)).toEqual(['All'])
    })

    it('removes the message as soon as something matches again', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(searchBox(), 'zzz')
      expect(screen.getByText('No products found')).toBeInTheDocument()
      await user.clear(searchBox())
      await user.type(searchBox(), 'lamp')
      expect(screen.queryByText('No products found')).not.toBeInTheDocument()
      expectNames(['Desk Lamp'])
    })
  })

  describe('Clear filters', () => {
    it('resets the search box, the category and the list', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(searchBox(), 'co')
      await user.selectOptions(categorySelect(), 'Books')
      expectNames(['Clean Code'])

      await user.click(clearButton())

      expect(searchBox()).toHaveValue('')
      expect(categorySelect()).toHaveDisplayValue('All')
      expectNames(ALL_NAMES)
      expectCount(12, 12)
    })

    it('brings the list back after an empty result', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(searchBox(), 'zzz')
      expect(screen.getByText('No products found')).toBeInTheDocument()

      await user.click(clearButton())

      expect(screen.queryByText('No products found')).not.toBeInTheDocument()
      expectNames(ALL_NAMES)
    })

    it('is available even when no filter is active', async () => {
      const user = userEvent.setup()
      render(<App />)
      expect(clearButton()).toBeEnabled()
      await user.click(clearButton())
      expectNames(ALL_NAMES)
      expectCount(12, 12)
    })
  })

  describe('derived from props and state', () => {
    // Rendering on the server runs NO effects. So this shows exactly what the very
    // first render produces. A list that is filled by useEffect would be missing here.
    it('has the whole list and all category options in the very first render', () => {
      const html = renderToString(<App />)
      expect((html.match(/<li[ >]/g) ?? []).length).toBe(12)
      expect((html.match(/<option[ >]/g) ?? []).length).toBe(5)
      expect(html).toContain('Wireless Mouse')
      expect(html).toContain('Coffee Mug')
      expect(html).not.toContain('No products found')
    })

    // If the filtered list were copied into state once, it would still show the
    // OLD products after the `products` prop changes. A derived list cannot.
    it('recomputes the list, the count and the categories when the products prop changes', async () => {
      const user = userEvent.setup()
      const first = [
        { id: 1, name: 'Apple', category: 'Fruit', price: 1 },
        { id: 2, name: 'Carrot', category: 'Veg', price: 2 },
      ]
      const second = [
        ...first,
        { id: 3, name: 'Banana', category: 'Fruit', price: 3 },
        { id: 4, name: 'Cherry', category: 'Fruit', price: 4 },
        { id: 5, name: 'Milk', category: 'Dairy', price: 5 },
      ]

      const { rerender } = render(<App products={first} />)
      expectCount(2, 2)
      await user.type(searchBox(), 'a')
      expectNames(['Apple', 'Carrot'])

      rerender(<App products={second} />)

      // The search text "a" is still there, so Cherry and Milk stay hidden.
      expect(searchBox()).toHaveValue('a')
      expectNames(['Apple', 'Carrot', 'Banana'])
      expectCount(3, 5)
      const options = within(categorySelect()).getAllByRole('option')
      expect(options.map((option) => option.textContent)).toEqual([
        'All',
        'Fruit',
        'Veg',
        'Dairy',
      ])
    })
  })
})
