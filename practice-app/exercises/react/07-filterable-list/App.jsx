import { useState } from 'react'
import { PRODUCTS } from './products.js'

// Exercise 07: Filterable product list.
// Read README.md in this folder for the full requirements.
// `products` is optional: when it is not passed, use the 12 PRODUCTS.

export default function App({ products = PRODUCTS }) {
  // TODO 1: state for the search text (a string, starts empty)
  // TODO 2: state for the selected category (starts as 'All')
  //
  // IMPORTANT: do NOT create state for the categories or for the filtered
  // list. Both can be calculated from `products` + the two states above,
  // with plain code, on every render.
  //
  // TODO 3: calculate the list of category names from `products`
  //         (each category once, in order of first appearance)
  // TODO 4: calculate the visible products from `products`, the search text
  //         and the category (trim + case-insensitive name match,
  //         and the category must match unless it is 'All')

  return (
    <div>
      <h2>Products</h2>

      <div>
        <label htmlFor="search">Search</label>
        {/* TODO 5: make this a controlled input (value + onChange) */}
        <input id="search" type="text" />
      </div>

      <div>
        <label htmlFor="category">Category</label>
        {/* TODO 6: controlled select: 'All' plus one option per category */}
        <select id="category">
          <option value="All">All</option>
        </select>
      </div>

      {/* TODO 7: make this button reset BOTH filters */}
      <button>Clear filters</button>

      {/* TODO 8: show the real numbers: visible count and total count */}
      <p role="status">Showing 0 of 0 products</p>

      {/* TODO 9: when nothing is visible show <p>No products found</p> and
          NO list. Otherwise render one <li> per visible product:
          name, category and the price like $24.99 (use a stable key). */}
      <ul></ul>
    </div>
  )
}
