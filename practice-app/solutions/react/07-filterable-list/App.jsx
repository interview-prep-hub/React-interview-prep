import { useState } from 'react'
import { PRODUCTS } from './products.js'

// Reference solution for exercise 07.
// Key ideas:
// - Only what the USER controls is state: the search text and the category.
// - The category list and the filtered list are DERIVED during render.
//   They are plain values computed from props + state, so they can never
//   be out of date and there is nothing to keep in sync.
// - Both inputs are controlled (value + onChange), so "Clear filters" is
//   just two setter calls.

const ALL = 'All'

// A plain function: easy to read and easy to unit test on its own.
function filterProducts(products, search, category) {
  // Trim only for matching. The input still shows exactly what was typed.
  const query = search.trim().toLowerCase()

  return products.filter((product) => {
    // An empty query is contained in every name, so it matches everything.
    const matchesName = product.name.toLowerCase().includes(query)
    const matchesCategory = category === ALL || product.category === category
    return matchesName && matchesCategory
  })
}

// 24.99 -> "$24.99", 12 -> "$12.00"
function formatPrice(price) {
  return `$${price.toFixed(2)}`
}

export default function App({ products = PRODUCTS }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL)

  // Derived values. No useState, no useEffect, no useMemo needed here:
  // filtering a dozen items is cheap, and plain code is the simplest thing.
  const categories = [...new Set(products.map((product) => product.category))]
  const visibleProducts = filterProducts(products, search, category)

  const clearFilters = () => {
    setSearch('')
    setCategory(ALL)
  }

  return (
    <div>
      <h2>Products</h2>

      <div>
        <label htmlFor="search">Search</label>
        <input
          id="search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="category">Category</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value={ALL}>{ALL}</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <button onClick={clearFilters}>Clear filters</button>

      <p role="status">
        Showing {visibleProducts.length} of {products.length} products
      </p>

      {visibleProducts.length === 0 ? (
        <p>No products found</p>
      ) : (
        <ul>
          {visibleProducts.map((product) => (
            // The id follows the product around, so React keeps the same <li>
            // for it when other products are filtered out (an index would not).
            <li key={product.id}>
              <strong>{product.name}</strong> ({product.category}) -{' '}
              {formatPrice(product.price)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
