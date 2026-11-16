import { CartProvider, useCart } from './CartContext.jsx'
import { PRODUCTS } from './products.js'
import { formatPrice } from './formatPrice.js'

// Exercise 19: Shopping cart with a reducer and context.
// Read README.md in this folder for the full requirements.
// Suggested order:
//   1. cartReducer.js   (pure logic, has its own tests)
//   2. CartContext.jsx  (CartProvider and useCart)
//   3. this file        (the screen: it only reads from useCart() and calls its helpers)

function Header() {
  // TODO 1: read itemCount from useCart()
  return (
    <header>
      <h2>Corner Shop</h2>
      {/* TODO 2: show "Items in cart:" and the total number of items inside
          an element with data-testid="cart-count" */}
    </header>
  )
}

function ProductList() {
  // TODO 3: read the add function from useCart()
  return (
    <section aria-labelledby="products-heading">
      <h3 id="products-heading">Products</h3>
      <ul>
        {/* TODO 4: one <li> for each product in PRODUCTS, showing its name, its price
            formatted with formatPrice, and an Add button. See README.md for the
            accessible name the button needs. */}
      </ul>
    </section>
  )
}

function Cart() {
  // TODO 5: read items, subtotal, tax, total, increment, decrement, remove and clear
  //         from useCart()
  return (
    <section aria-labelledby="cart-heading">
      <h3 id="cart-heading">Cart</h3>

      {/* TODO 6: when the cart is empty show "Your cart is empty."
          Otherwise show a <ul aria-label="Cart items"> with one <li> per line:
          the name, a - button, the quantity, a + button and a Remove button.
          See README.md for the test ids and button names. */}

      {/* TODO 7: show Subtotal, Tax (10%) and Total, each formatted with formatPrice,
          in elements with data-testid "subtotal", "tax" and "total". They are
          shown even when the cart is empty. */}

      {/* TODO 8: a "Clear cart" button, disabled when the cart is empty */}
    </section>
  )
}

export default function App() {
  // TODO 9: every component above reads the cart through useCart(), so they all
  //         must be rendered inside <CartProvider>.
  return (
    <>
      <Header />
      <ProductList />
      <Cart />
    </>
  )
}
