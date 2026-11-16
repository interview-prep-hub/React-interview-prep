import { CartProvider, useCart } from './CartContext.jsx'
import { PRODUCTS } from './products.js'
import { formatPrice } from './formatPrice.js'

// Reference solution for exercise 19.
// Key ideas:
// - the UI only READS from useCart() and CALLS its helpers, it holds no cart state
// - the header badge and the cart list share one cart through the context
// - nothing about the totals is stored: they arrive already derived

function Header() {
  const { itemCount } = useCart()
  return (
    <header>
      <h2>Corner Shop</h2>
      <p>
        Items in cart: <strong data-testid="cart-count">{itemCount}</strong>
      </p>
    </header>
  )
}

function ProductList() {
  const { add } = useCart()
  return (
    <section aria-labelledby="products-heading">
      <h3 id="products-heading">Products</h3>
      <ul>
        {PRODUCTS.map((product) => (
          <li key={product.id}>
            <span>{product.name}</span> <span>{formatPrice(product.price)}</span>{' '}
            <button aria-label={`Add ${product.name} to cart`} onClick={() => add(product)}>
              Add
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Cart() {
  const { items, subtotal, tax, total, increment, decrement, remove, clear } = useCart()
  return (
    <section aria-labelledby="cart-heading">
      <h3 id="cart-heading">Cart</h3>

      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <ul aria-label="Cart items">
          {items.map((item) => (
            <li key={item.id}>
              <span>{item.name}</span>{' '}
              <button aria-label={`Decrease ${item.name}`} onClick={() => decrement(item.id)}>
                -
              </button>{' '}
              <span data-testid={`quantity-${item.id}`}>{item.quantity}</span>{' '}
              <button aria-label={`Increase ${item.name}`} onClick={() => increment(item.id)}>
                +
              </button>{' '}
              <button aria-label={`Remove ${item.name}`} onClick={() => remove(item.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <dl>
        <dt>Subtotal</dt>
        <dd data-testid="subtotal">{formatPrice(subtotal)}</dd>
        <dt>Tax (10%)</dt>
        <dd data-testid="tax">{formatPrice(tax)}</dd>
        <dt>Total</dt>
        <dd data-testid="total">{formatPrice(total)}</dd>
      </dl>

      <button onClick={clear} disabled={items.length === 0}>
        Clear cart
      </button>
    </section>
  )
}

export default function App() {
  return (
    <CartProvider>
      <Header />
      <ProductList />
      <Cart />
    </CartProvider>
  )
}
