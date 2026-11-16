// Exercise 32, part B: the React bindings (a mini react-redux).
// Read README.md in this folder for the full requirements.
//
// You will need these three imports from 'react' (add them yourself):
//   createContext, useContext, useSyncExternalStore
//
// Right now every export is a stub, so the tests fail.

// TODO 1: create the context here, outside any component.
// What should it carry: the store object, or the state? (Think about which one
// changes over time, and what happens to context consumers when it does.)

export function Provider({ store, children }) {
  // TODO 2: make `store` available to everything below with the context.
  return children
}

// TODO 3: a small internal helper (not exported) that reads the store from the
// context and throws an Error when there is none. The message must contain the
// word "Provider".

export function useSelector(selector) {
  // TODO 4: subscribe this component to the store with useSyncExternalStore.
  //   - the first argument is `subscribe`: it must keep the same identity
  //     between renders (so React does not re-subscribe on every render)
  //   - the second argument is `getSnapshot`: it returns the selected value
  // The component then re-renders only when that value changes (Object.is).
  return undefined
}

export function useDispatch() {
  // TODO 5: return the store's dispatch function. It must not subscribe.
  return () => {}
}
