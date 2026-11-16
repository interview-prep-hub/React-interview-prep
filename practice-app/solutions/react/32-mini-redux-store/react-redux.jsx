import { createContext, useContext, useSyncExternalStore } from 'react'

// Reference solution for exercise 32: the React bindings (a mini react-redux).
//
// Key ideas:
// - Context carries the STORE OBJECT, which never changes. It does not carry the
//   state. If the state lived in context, every change would re-render every
//   consumer. That is the problem this exercise is about.
// - useSelector subscribes each component to the store on its own, using
//   useSyncExternalStore. React re-renders the component only when the value
//   returned by getSnapshot is different (compared with Object.is).

const StoreContext = createContext(null)

export function Provider({ store, children }) {
  return <StoreContext value={store}>{children}</StoreContext>
}

function useStore() {
  const store = useContext(StoreContext)
  if (store === null) {
    throw new Error('Could not find the store. Wrap your app in <Provider store={store}>.')
  }
  return store
}

export function useSelector(selector) {
  const store = useStore()

  // - store.subscribe keeps the same identity for the life of the store, so React
  //   subscribes once instead of on every render.
  // - getSnapshot is called during render and again after every store change.
  //   The selector closes over the latest props because we pass a new function
  //   on each render.
  // - The result must be stable: the same state must give the same value.
  //   Returning a new object or array on each call would loop forever.
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()))
}

export function useDispatch() {
  // Reading dispatch does not subscribe to anything, so a component that only
  // dispatches never re-renders because of store changes.
  return useStore().dispatch
}
