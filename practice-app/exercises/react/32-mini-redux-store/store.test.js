import { applyMiddleware, combineReducers, createStore } from './store.js'

// Part A: the store itself. No React in this file.

// Small reducers used by the tests below.
function counter(state = 0, action) {
  switch (action.type) {
    case 'inc':
      return state + 1
    case 'add':
      return state + action.amount
    default:
      return state
  }
}

function todos(state = [], action) {
  return action.type === 'todo/add' ? [...state, action.text] : state
}

const INC = { type: 'inc' }
const UNKNOWN = { type: 'something-nobody-handles' }

describe('createStore: state and dispatch', () => {
  it('starts from the default state of the reducer when there is no preloaded state', () => {
    const store = createStore(counter)
    expect(store.getState()).toBe(0)
  })

  it('starts from the preloaded state when one is given', () => {
    const store = createStore(counter, 41)
    expect(store.getState()).toBe(41)
    store.dispatch(INC)
    expect(store.getState()).toBe(42)
  })

  it('calls the reducer once at creation with the preloaded state and an action that has a string type', () => {
    const reducer = vi.fn((state = 'default') => state)
    createStore(reducer)
    expect(reducer).toHaveBeenCalledTimes(1)
    const [state, action] = reducer.mock.calls[0]
    expect(state).toBeUndefined()
    expect(typeof action.type).toBe('string')

    const reducer2 = vi.fn((state) => state)
    createStore(reducer2, 'saved')
    expect(reducer2.mock.calls[0][0]).toBe('saved')
  })

  it('dispatch runs the reducer with the current state and the action, and getState returns the result', () => {
    const reducer = vi.fn((state = { n: 0 }, action) => (action.type === 'inc' ? { n: state.n + 1 } : state))
    const store = createStore(reducer)
    const before = store.getState()
    const action = { type: 'inc' }

    store.dispatch(action)

    expect(reducer).toHaveBeenLastCalledWith(before, action)
    expect(store.getState()).toEqual({ n: 1 })
    expect(store.getState()).not.toBe(before)
  })

  it('dispatch returns the very action it was given', () => {
    const store = createStore(counter)
    const action = { type: 'add', amount: 5 }
    expect(store.dispatch(action)).toBe(action)
    expect(store.getState()).toBe(5)
  })

  it('getState hands out the very same state object until a dispatch really changes it', () => {
    // The React bindings compare states with Object.is, so a store must never
    // return a copy.
    const preloaded = { n: 5 }
    const reducer = (state = { n: 0 }, action) => (action.type === 'inc' ? { n: state.n + 1 } : state)

    const fromPreloaded = createStore(reducer, preloaded)
    expect(fromPreloaded.getState()).toBe(preloaded)

    const store = createStore(reducer)
    const first = store.getState()
    expect(store.getState()).toBe(first)

    store.dispatch(UNKNOWN)
    expect(store.getState()).toBe(first)

    store.dispatch(INC)
    expect(store.getState()).not.toBe(first)
    expect(store.getState()).toEqual({ n: 1 })
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a string', 'inc'],
    ['an object without a type', {}],
  ])('dispatch throws an Error for %s and changes nothing', (_label, badAction) => {
    const store = createStore(counter, 7)
    const listener = vi.fn()
    store.subscribe(listener)

    expect(() => store.dispatch(badAction)).toThrow(Error)
    expect(store.getState()).toBe(7)
    expect(listener).not.toHaveBeenCalled()
  })

  it('its methods work when they are used detached from the store object', () => {
    const { getState, dispatch, subscribe } = createStore(counter)
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)

    dispatch(INC)

    expect(getState()).toBe(1)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(typeof unsubscribe).toBe('function')
  })
})

describe('createStore: subscribe', () => {
  it('calls a listener after every dispatch, when the new state is already saved', () => {
    const store = createStore(counter)
    const seen = []
    store.subscribe(() => seen.push(store.getState()))

    store.dispatch(INC)
    store.dispatch(INC)
    store.dispatch({ type: 'add', amount: 10 })

    expect(seen).toEqual([1, 2, 12])
  })

  it('calls every listener, in the order they subscribed', () => {
    const store = createStore(counter)
    const calls = []
    store.subscribe(() => calls.push('first'))
    store.subscribe(() => calls.push('second'))
    store.subscribe(() => calls.push('third'))

    store.dispatch(INC)

    expect(calls).toEqual(['first', 'second', 'third'])
  })

  it('calls listeners with no arguments (they read the state with getState)', () => {
    const store = createStore(counter)
    const listener = vi.fn()
    store.subscribe(listener)

    store.dispatch(INC)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith()
  })

  it('calls listeners even when the reducer returned the same state', () => {
    const store = createStore(counter)
    const listener = vi.fn()
    store.subscribe(listener)

    store.dispatch(UNKNOWN)

    expect(store.getState()).toBe(0)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('returns an unsubscribe function that stops only that listener (and is safe to call twice)', () => {
    const store = createStore(counter)
    const stays = vi.fn()
    const leaves = vi.fn()
    store.subscribe(stays)
    const unsubscribe = store.subscribe(leaves)

    store.dispatch(INC)
    expect(leaves).toHaveBeenCalledTimes(1)

    unsubscribe()
    unsubscribe()
    store.dispatch(INC)

    expect(leaves).toHaveBeenCalledTimes(1)
    expect(stays).toHaveBeenCalledTimes(2)
  })

  it('removes the right listener even when other listeners were removed before it', () => {
    const store = createStore(counter)
    const a = vi.fn()
    const b = vi.fn()
    const c = vi.fn()
    const unsubscribeA = store.subscribe(a)
    store.subscribe(b)
    const unsubscribeC = store.subscribe(c)

    unsubscribeA()
    unsubscribeC()
    store.dispatch(INC)

    expect(a).not.toHaveBeenCalled()
    expect(c).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('does not skip other listeners when a listener unsubscribes itself while being notified', () => {
    const store = createStore(counter)
    const calls = []
    const unsubscribeA = store.subscribe(() => {
      calls.push('a')
      unsubscribeA()
    })
    store.subscribe(() => calls.push('b'))
    store.subscribe(() => calls.push('c'))

    store.dispatch(INC)
    expect(calls).toEqual(['a', 'b', 'c'])

    store.dispatch(INC)
    expect(calls).toEqual(['a', 'b', 'c', 'b', 'c'])
  })

  it('calls a listener that was added during a dispatch only from the next dispatch on', () => {
    const store = createStore(counter)
    const late = vi.fn()
    let added = false
    store.subscribe(() => {
      if (!added) {
        added = true
        store.subscribe(late)
      }
    })

    store.dispatch(INC)
    expect(late).not.toHaveBeenCalled()

    store.dispatch(INC)
    expect(late).toHaveBeenCalledTimes(1)
  })
})

describe('combineReducers', () => {
  const rootReducer = combineReducers({ count: counter, todos })
  const initialState = () => rootReducer(undefined, UNKNOWN)

  it('builds the initial state from the default state of every slice', () => {
    expect(initialState()).toEqual({ count: 0, todos: [] })
  })

  it('gives each slice reducer only its own slice of the state, plus the action', () => {
    const a = vi.fn((state = 'a0') => state)
    const b = vi.fn((state = 'b0') => state)
    const reducer = combineReducers({ a, b })
    const action = { type: 'anything' }

    reducer({ a: 'a1', b: 'b1' }, action)

    expect(a).toHaveBeenCalledWith('a1', action)
    expect(b).toHaveBeenCalledWith('b1', action)
  })

  it('changes only the slice that handles the action, and keeps the reference of the others', () => {
    const state = initialState()

    const next = rootReducer(state, INC)

    expect(next).toEqual({ count: 1, todos: [] })
    expect(next).not.toBe(state)
    expect(next.todos).toBe(state.todos)
  })

  it('returns the very same state object when no slice changed', () => {
    const state = initialState()
    expect(state).toEqual({ count: 0, todos: [] })

    expect(rootReducer(state, UNKNOWN)).toBe(state)
  })

  it('compares slices by reference: a slice reducer that returns a new object counts as a change', () => {
    // Same content, different object. combineReducers must not look inside.
    const copier = (state = { n: 0 }) => ({ ...state })
    const reducer = combineReducers({ copier })
    const state = reducer(undefined, UNKNOWN)

    const next = reducer(state, UNKNOWN)

    expect(next).not.toBe(state)
    expect(next).toEqual(state)
    expect(next.copier).not.toBe(state.copier)
  })

  it('does not mutate the previous state', () => {
    const previous = Object.freeze({ count: 1, todos: Object.freeze(['a']) })

    const next = rootReducer(previous, { type: 'todo/add', text: 'b' })

    expect(previous).toEqual({ count: 1, todos: ['a'] })
    expect(next).toEqual({ count: 1, todos: ['a', 'b'] })
  })

  it('works as the reducer of a store, with or without preloaded state', () => {
    const fresh = createStore(rootReducer)
    fresh.dispatch(INC)
    fresh.dispatch({ type: 'todo/add', text: 'write tests' })
    expect(fresh.getState()).toEqual({ count: 1, todos: ['write tests'] })

    const resumed = createStore(rootReducer, { count: 10, todos: ['old'] })
    resumed.dispatch(INC)
    expect(resumed.getState()).toEqual({ count: 11, todos: ['old'] })
  })
})

// Stretch goal. The exercise is complete when everything ABOVE passes.
// These three tests check applyMiddleware, the enhancer behind a logger middleware
// and behind thunks.
describe('stretch: applyMiddleware', () => {
  it('lets a logger middleware see every action and the state after it, while dispatch still works', () => {
    const log = []
    const logger = (api) => (next) => (action) => {
      const result = next(action)
      log.push(`${action.type} -> ${api.getState()}`)
      return result
    }
    const store = createStore(counter, undefined, applyMiddleware(logger))
    const listener = vi.fn()
    store.subscribe(listener)

    const action = { type: 'inc' }
    expect(store.dispatch(action)).toBe(action)
    store.dispatch({ type: 'add', amount: 2 })

    expect(store.getState()).toBe(3)
    expect(log).toEqual(['inc -> 1', 'add -> 3'])
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('runs middlewares in the order they are listed: the first one is the outermost', () => {
    const order = []
    const tag = (name) => () => (next) => (action) => {
      order.push(`${name} in`)
      const result = next(action)
      order.push(`${name} out`)
      return result
    }
    const store = createStore(counter, undefined, applyMiddleware(tag('A'), tag('B')))

    store.dispatch(INC)

    expect(order).toEqual(['A in', 'B in', 'B out', 'A out'])
    expect(store.getState()).toBe(1)
  })

  it('gives middlewares a dispatch that runs the whole chain again, so a thunk can dispatch another thunk', () => {
    const thunk = ({ dispatch, getState }) => (next) => (action) =>
      typeof action === 'function' ? action(dispatch, getState) : next(action)
    const store = createStore(counter, undefined, applyMiddleware(thunk))

    store.dispatch((dispatch, getState) => {
      dispatch(INC) // 1
      dispatch((innerDispatch) => innerDispatch({ type: 'add', amount: 10 })) // 11
      dispatch({ type: 'add', amount: getState() }) // 11 + 11
    })

    expect(store.getState()).toBe(22)
  })
})
