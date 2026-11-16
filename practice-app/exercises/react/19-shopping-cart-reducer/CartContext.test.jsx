import { Component, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CartProvider, useCart } from './CartContext.jsx'

// Some tests click several buttons. On a slow or busy computer that can pass the
// default limit of 5 seconds, so give every test in this file more time.
vi.setConfig({ testTimeout: 20000 })

const notebook = { id: 'p1', name: 'Notebook', price: 450 }
const pen = { id: 'p2', name: 'Pen', price: 125 }

// A tiny consumer. It prints what useCart() returns and has one button per action.
function Probe() {
  const cart = useCart()
  return (
    <div>
      <p data-testid="count">{cart.itemCount}</p>
      <p data-testid="lines">{cart.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}</p>
      <p data-testid="totals">{`${cart.subtotal}/${cart.tax}/${cart.total}`}</p>
      <button onClick={() => cart.add(notebook)}>add notebook</button>
      <button onClick={() => cart.add(pen)}>add pen</button>
      <button
        onClick={() => {
          cart.add(notebook)
          cart.add(notebook)
        }}
      >
        add notebook twice
      </button>
      <button onClick={() => cart.increment('p1')}>increment notebook</button>
      <button onClick={() => cart.decrement('p2')}>decrement pen</button>
      <button onClick={() => cart.remove('p1')}>remove notebook</button>
      <button onClick={() => cart.clear()}>clear</button>
    </div>
  )
}

// A second consumer that can only read. It is used to prove the cart is shared.
function Reader() {
  const { itemCount } = useCart()
  return <p data-testid="reader-count">{itemCount}</p>
}

// A consumer that reports the value of every render it makes, so a test can count renders.
function RenderSpy({ onRender }) {
  const cart = useCart()
  onRender(cart)
  return <button onClick={() => cart.add(notebook)}>spy add</button>
}

// A parent that re-renders on demand and renders the provider. Its `children` come
// from the test, so they are the same element on every render of the parent.
function Shell({ children }) {
  const [clicks, setClicks] = useState(0)
  return (
    <>
      <button onClick={() => setClicks((n) => n + 1)}>{`rerender parent (${clicks})`}</button>
      <CartProvider>{children}</CartProvider>
    </>
  )
}

// A minimal error boundary so we can look at the error useCart throws.
class Catcher extends Component {
  state = { message: null }
  static getDerivedStateFromError(error) {
    return { message: error.message }
  }
  render() {
    return this.state.message === null ? this.props.children : <p role="alert">{this.state.message}</p>
  }
}

describe('19 CartProvider and useCart', () => {
  it('starts empty, then add puts products in the cart and the derived values follow', async () => {
    const user = userEvent.setup()
    render(
      <CartProvider>
        <Probe />
      </CartProvider>,
    )
    expect(screen.getByTestId('count')).toHaveTextContent(/^0$/)
    expect(screen.getByTestId('lines')).toBeEmptyDOMElement()
    expect(screen.getByTestId('totals')).toHaveTextContent('0/0/0')

    await user.click(screen.getByRole('button', { name: 'add notebook' }))
    await user.click(screen.getByRole('button', { name: 'add notebook' }))
    await user.click(screen.getByRole('button', { name: 'add pen' }))
    expect(screen.getByTestId('lines')).toHaveTextContent('Notebook x2, Pen x1')
    expect(screen.getByTestId('count')).toHaveTextContent(/^3$/)
    // subtotal 2 x 450 + 125 = 1025 cents, tax 102.5 rounds to 103, total 1128
    expect(screen.getByTestId('totals')).toHaveTextContent('1025/103/1128')
  })

  it('increment, decrement, remove and clear all work through the hook', async () => {
    const user = userEvent.setup()
    render(
      <CartProvider>
        <Probe />
      </CartProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'add notebook' }))
    await user.click(screen.getByRole('button', { name: 'add pen' }))

    await user.click(screen.getByRole('button', { name: 'increment notebook' }))
    expect(screen.getByTestId('lines')).toHaveTextContent('Notebook x2, Pen x1')

    await user.click(screen.getByRole('button', { name: 'decrement pen' }))
    expect(screen.getByTestId('lines')).toHaveTextContent(/^Notebook x2$/)

    await user.click(screen.getByRole('button', { name: 'remove notebook' }))
    expect(screen.getByTestId('lines')).toBeEmptyDOMElement()

    await user.click(screen.getByRole('button', { name: 'add pen' }))
    await user.click(screen.getByRole('button', { name: 'clear' }))
    expect(screen.getByTestId('count')).toHaveTextContent(/^0$/)
    expect(screen.getByTestId('totals')).toHaveTextContent('0/0/0')
  })

  it('two calls in the same event handler both count (each action builds on the previous one)', async () => {
    const user = userEvent.setup()
    render(
      <CartProvider>
        <Probe />
      </CartProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'add notebook twice' }))
    expect(screen.getByTestId('lines')).toHaveTextContent(/^Notebook x2$/)
    expect(screen.getByTestId('count')).toHaveTextContent(/^2$/)
    expect(screen.getByTestId('totals')).toHaveTextContent('900/90/990')
  })

  it('consumers do not re-render when the parent re-renders but the cart did not change', async () => {
    const user = userEvent.setup()
    const seen = []
    render(
      <Shell>
        <RenderSpy onRender={(cart) => seen.push(cart)} />
      </Shell>,
    )
    expect(seen).toHaveLength(1)

    // A real change of the cart renders the consumer once more.
    await user.click(screen.getByRole('button', { name: 'spy add' }))
    expect(seen).toHaveLength(2)
    expect(seen[1].itemCount).toBe(1)

    await user.click(screen.getByRole('button', { name: 'rerender parent (0)' }))
    // The parent did render again (its button text changed) ...
    expect(screen.getByRole('button', { name: 'rerender parent (1)' })).toBeInTheDocument()
    // ... but the cart did not change, so the consumer was not rendered again.
    expect(seen).toHaveLength(2)
  })

  it('every consumer under one provider sees the same cart', async () => {
    const user = userEvent.setup()
    render(
      <CartProvider>
        <Probe />
        <Reader />
      </CartProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'add pen' }))
    await user.click(screen.getByRole('button', { name: 'add pen' }))
    expect(screen.getByTestId('reader-count')).toHaveTextContent(/^2$/)
  })

  it('useCart throws an Error that mentions CartProvider when there is no provider', () => {
    // React logs errors that reach a boundary. Keep the test output clean.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      render(
        <Catcher>
          <Reader />
        </Catcher>,
      )
      expect(screen.getByRole('alert')).toHaveTextContent(/CartProvider/)
    } finally {
      spy.mockRestore()
    }
  })
})
