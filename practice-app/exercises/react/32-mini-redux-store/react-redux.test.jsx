import { Component, useEffect } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider, useDispatch, useSelector } from './react-redux.jsx'

// Part B: the React bindings.
//
// These tests do NOT use your store.js. They use a tiny store that lives in
// this file, so the hooks are checked on their own. Any object with
// getState, dispatch and subscribe must work with your Provider and hooks.

function reducer(state, action) {
  switch (action.type) {
    case 'a/inc':
      return { ...state, a: state.a + 1 }
    case 'b/inc':
      return { ...state, b: state.b + 1 }
    case 'user/rename':
      return { ...state, user: { ...state.user, name: action.name } }
    default:
      return state // for example { type: 'noop' }: same state object
  }
}

function makeStore(initialState = { a: 0, b: 0, user: { name: 'Ada' } }) {
  let state = initialState
  const listeners = new Set()
  return {
    getState: () => state,
    dispatch: (action) => {
      state = reducer(state, action)
      for (const listener of [...listeners]) listener()
      return action
    },
    subscribe: vi.fn((listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }),
    listenerCount: () => listeners.size,
  }
}

// Changes the store the way real code would (from outside React): wrapped in
// act() so React may process the update.
function dispatchOutside(store, action) {
  act(() => {
    store.dispatch(action)
  })
}

// Catches the error thrown while rendering, so a test can read its message.
class Boundary extends Component {
  state = { message: null }
  static getDerivedStateFromError(error) {
    return { message: error.message }
  }
  render() {
    return this.state.message === null ? this.props.children : <p role="alert">{this.state.message}</p>
  }
}

describe('Provider', () => {
  it('gives the store to components anywhere below it', () => {
    const store = makeStore({ a: 5, b: 0, user: { name: 'Ada' } })
    function Deep() {
      return <p data-testid="a">{useSelector((s) => s.a)}</p>
    }

    render(
      <Provider store={store}>
        <div>
          <section>
            <Deep />
          </section>
        </div>
      </Provider>,
    )

    expect(screen.getByTestId('a')).toHaveTextContent('5')
  })

  it('keeps two Providers with two different stores independent', () => {
    const left = makeStore({ a: 1, b: 0, user: { name: 'L' } })
    const right = makeStore({ a: 100, b: 0, user: { name: 'R' } })
    function Show({ id }) {
      return <p data-testid={id}>{useSelector((s) => s.a)}</p>
    }

    render(
      <>
        <Provider store={left}>
          <Show id="left" />
        </Provider>
        <Provider store={right}>
          <Show id="right" />
        </Provider>
      </>,
    )
    dispatchOutside(left, { type: 'a/inc' })

    expect(screen.getByTestId('left')).toHaveTextContent('2')
    expect(screen.getByTestId('right')).toHaveTextContent('100')
  })

  it('switches to a new store when the store prop changes, and stops listening to the old one', () => {
    const first = makeStore({ a: 1, b: 0, user: { name: 'one' } })
    const second = makeStore({ a: 2, b: 0, user: { name: 'two' } })
    function Show() {
      return <p data-testid="a">{useSelector((s) => s.a)}</p>
    }

    const { rerender } = render(
      <Provider store={first}>
        <Show />
      </Provider>,
    )
    expect(screen.getByTestId('a')).toHaveTextContent('1')
    expect(first.listenerCount()).toBe(1)

    rerender(
      <Provider store={second}>
        <Show />
      </Provider>,
    )

    expect(screen.getByTestId('a')).toHaveTextContent('2')
    expect(first.listenerCount()).toBe(0)
    expect(second.listenerCount()).toBe(1)

    dispatchOutside(second, { type: 'a/inc' })
    expect(screen.getByTestId('a')).toHaveTextContent('3')
  })
})

describe('useSelector', () => {
  it('returns the selected part of the state and shows the new value after the state changes', () => {
    const store = makeStore()
    function Show() {
      return <p data-testid="a">{useSelector((s) => s.a)}</p>
    }
    render(
      <Provider store={store}>
        <Show />
      </Provider>,
    )
    expect(screen.getByTestId('a')).toHaveTextContent('0')

    dispatchOutside(store, { type: 'a/inc' })
    dispatchOutside(store, { type: 'a/inc' })

    expect(screen.getByTestId('a')).toHaveTextContent('2')
  })

  it('re-renders a component once per change of its own value, and not for changes it did not select', () => {
    const store = makeStore()
    const rendersA = vi.fn()
    const rendersB = vi.fn()
    function ShowA() {
      rendersA()
      return <p data-testid="a">{useSelector((s) => s.a)}</p>
    }
    function ShowB() {
      rendersB()
      return <p data-testid="b">{useSelector((s) => s.b)}</p>
    }
    render(
      <Provider store={store}>
        <ShowA />
        <ShowB />
      </Provider>,
    )
    const a0 = rendersA.mock.calls.length
    const b0 = rendersB.mock.calls.length

    dispatchOutside(store, { type: 'a/inc' })
    expect(screen.getByTestId('a')).toHaveTextContent('1')
    expect(rendersA).toHaveBeenCalledTimes(a0 + 1)
    expect(rendersB).toHaveBeenCalledTimes(b0)

    dispatchOutside(store, { type: 'b/inc' })
    expect(screen.getByTestId('b')).toHaveTextContent('1')
    expect(rendersA).toHaveBeenCalledTimes(a0 + 1)
    expect(rendersB).toHaveBeenCalledTimes(b0 + 1)
  })

  it('does not re-render when the store notifies but the selected value is the same', () => {
    const store = makeStore()
    const renders = vi.fn()
    function Show() {
      renders()
      return <p data-testid="a">{useSelector((s) => s.a)}</p>
    }
    render(
      <Provider store={store}>
        <Show />
      </Provider>,
    )
    // Prove the component is subscribed first, otherwise "no re-render" proves nothing.
    expect(store.listenerCount()).toBe(1)
    const before = renders.mock.calls.length

    dispatchOutside(store, { type: 'noop' })
    dispatchOutside(store, { type: 'noop' })

    expect(renders).toHaveBeenCalledTimes(before)
  })

  it('compares the selected value with Object.is: a new object re-renders (even with equal content), the same object does not', () => {
    const store = makeStore()
    const renders = vi.fn()
    function Name() {
      renders()
      const user = useSelector((s) => s.user)
      return <p data-testid="name">{user?.name}</p>
    }
    render(
      <Provider store={store}>
        <Name />
      </Provider>,
    )
    const before = renders.mock.calls.length

    // `user` is not touched by this action, so it is the same object.
    dispatchOutside(store, { type: 'b/inc' })
    expect(renders).toHaveBeenCalledTimes(before)

    // The reducer builds a new `user` object here.
    dispatchOutside(store, { type: 'user/rename', name: 'Grace' })
    expect(screen.getByTestId('name')).toHaveTextContent('Grace')
    expect(renders).toHaveBeenCalledTimes(before + 1)

    // Another new `user` object, this time with exactly the same content.
    // Object.is says "different", so the component renders again. (The hook
    // must not look inside the object, or compare it in any smarter way.)
    dispatchOutside(store, { type: 'user/rename', name: 'Grace' })
    expect(renders).toHaveBeenCalledTimes(before + 2)
  })

  it('uses the latest selector: a selector that depends on props follows the props', () => {
    const store = makeStore({ a: 10, b: 20, user: { name: 'Ada' } })
    function Show({ field }) {
      return <p data-testid="value">{useSelector((s) => s[field])}</p>
    }
    const { rerender } = render(
      <Provider store={store}>
        <Show field="a" />
      </Provider>,
    )
    expect(screen.getByTestId('value')).toHaveTextContent('10')

    rerender(
      <Provider store={store}>
        <Show field="b" />
      </Provider>,
    )
    expect(screen.getByTestId('value')).toHaveTextContent('20')

    dispatchOutside(store, { type: 'b/inc' })
    expect(screen.getByTestId('value')).toHaveTextContent('21')
  })

  it('shows the latest state even when the store changed after the first render but before the subscription', () => {
    const store = makeStore()
    // Effects of a child run BEFORE the effects of its parent. So this child
    // changes the store before the parent has had a chance to subscribe.
    function Child() {
      const dispatch = useDispatch()
      useEffect(() => {
        dispatch({ type: 'a/inc' })
      }, [dispatch])
      return null
    }
    function Parent() {
      return (
        <div>
          <p data-testid="a">{useSelector((s) => s.a)}</p>
          <Child />
        </div>
      )
    }

    render(
      <Provider store={store}>
        <Parent />
      </Provider>,
    )

    expect(store.getState().a).toBe(1)
    expect(screen.getByTestId('a')).toHaveTextContent('1')
  })

  it('subscribes once (not on every render) and unsubscribes when the component unmounts', () => {
    const store = makeStore()
    function Show() {
      return <p data-testid="a">{useSelector((s) => s.a)}</p>
    }
    const { unmount } = render(
      <Provider store={store}>
        <Show />
      </Provider>,
    )
    expect(store.subscribe).toHaveBeenCalledTimes(1)
    expect(store.listenerCount()).toBe(1)

    dispatchOutside(store, { type: 'a/inc' })
    dispatchOutside(store, { type: 'a/inc' })
    dispatchOutside(store, { type: 'a/inc' })
    expect(screen.getByTestId('a')).toHaveTextContent('3')
    expect(store.subscribe).toHaveBeenCalledTimes(1)

    unmount()
    expect(store.listenerCount()).toBe(0)
  })
})

describe('useDispatch', () => {
  it('returns a function that changes the store, so a selecting component updates', async () => {
    const user = userEvent.setup()
    const store = makeStore()
    function Counter() {
      const dispatch = useDispatch()
      const a = useSelector((s) => s.a)
      return (
        <>
          <p data-testid="a">{a}</p>
          <button onClick={() => dispatch({ type: 'a/inc' })}>plus</button>
        </>
      )
    }
    render(
      <Provider store={store}>
        <Counter />
      </Provider>,
    )

    await user.click(screen.getByRole('button', { name: 'plus' }))
    await user.click(screen.getByRole('button', { name: 'plus' }))

    expect(store.getState().a).toBe(2)
    expect(screen.getByTestId('a')).toHaveTextContent('2')
  })

  it('hands back the dispatch of the store, so the action comes back', () => {
    const store = makeStore()
    let dispatch
    function Grab() {
      dispatch = useDispatch()
      return null
    }
    render(
      <Provider store={store}>
        <Grab />
      </Provider>,
    )

    const action = { type: 'noop' }
    let returned
    act(() => {
      returned = dispatch(action)
    })

    expect(returned).toBe(action)
  })

  it('returns the same function on every render', () => {
    const store = makeStore()
    const seen = new Set()
    function Grab() {
      seen.add(useDispatch())
      return <p data-testid="a">{useSelector((s) => s.a)}</p> // re-renders when "a" changes
    }
    render(
      <Provider store={store}>
        <Grab />
      </Provider>,
    )
    dispatchOutside(store, { type: 'a/inc' })
    dispatchOutside(store, { type: 'a/inc' })

    // The component really did render three times (first render and two updates).
    expect(screen.getByTestId('a')).toHaveTextContent('2')
    expect(seen.size).toBe(1)
  })

  it('follows the store when the Provider receives a different store', () => {
    const first = makeStore()
    const second = makeStore()
    let dispatch
    function Grab() {
      dispatch = useDispatch()
      return null
    }
    const { rerender } = render(
      <Provider store={first}>
        <Grab />
      </Provider>,
    )

    rerender(
      <Provider store={second}>
        <Grab />
      </Provider>,
    )
    act(() => {
      dispatch({ type: 'a/inc' })
    })

    expect(second.getState().a).toBe(1)
    expect(first.getState().a).toBe(0)
  })

  it('does not subscribe: a component that only dispatches never re-renders for store changes', () => {
    const store = makeStore()
    const renders = vi.fn()
    function OnlyDispatch() {
      renders()
      useDispatch()
      return <p>buttons live here</p>
    }
    function Watcher() {
      return <p data-testid="a">{useSelector((s) => s.a)}</p>
    }
    render(
      <Provider store={store}>
        <OnlyDispatch />
        <Watcher />
      </Provider>,
    )
    const before = renders.mock.calls.length

    dispatchOutside(store, { type: 'a/inc' })

    expect(screen.getByTestId('a')).toHaveTextContent('1')
    expect(store.listenerCount()).toBe(1) // only the Watcher
    expect(renders).toHaveBeenCalledTimes(before)
  })
})

describe('using the hooks without a Provider', () => {
  let errorSpy
  beforeEach(() => {
    // React logs errors that an error boundary catches. Keep the output clean.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('useSelector throws an Error that mentions the Provider', () => {
    function Lonely() {
      return <p>{useSelector((s) => s.a)}</p>
    }
    render(
      <Boundary>
        <Lonely />
      </Boundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/provider/i)
  })

  it('useDispatch throws an Error that mentions the Provider', () => {
    function Lonely() {
      useDispatch()
      return <p>never shown</p>
    }
    render(
      <Boundary>
        <Lonely />
      </Boundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/provider/i)
  })
})
