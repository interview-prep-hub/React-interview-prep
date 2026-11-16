# 22 - Observable store

**Level:** Medium | **Time:** 35 minutes | **Topics:** closures, `Set`, publish/subscribe (pub/sub), immutable updates, selectors, `Object.is`, the idea behind `useSyncExternalStore` and Zustand

## The task

Build `createStore(initialState)`. A store holds one state object that lives **outside** React. Anyone can read it, change it, and **subscribe** to be told when it changes. Subscribers can also say which part of the state they care about (a "selector"), so they are only told about changes to that part.

This is the core idea of Zustand, and a smaller cousin of Redux. A React component connects to such a store with `useSyncExternalStore` (see the follow-ups below).

Work in [`index.js`](./index.js). Do not edit the test file.

A note on names. In Zustand, the plain `subscribe(listener)` has no selector. The selector and equality parts come from its `subscribeWithSelector` middleware and from its React hook, and there the listener receives the selected slices. In this exercise the listener always receives the **whole** new state and the **whole** previous state, and the selector only decides **whether** to call it.

## Requirements

1. `createStore(initialState)` returns an object `{ getState, setState, subscribe, destroy }`. The four functions must not depend on `this` (so `const { getState } = store` and `useSyncExternalStore(store.subscribe, ...)` work). `initialState` must be an object, otherwise throw a `TypeError`. (`null` is not an object here.)
2. `getState()` returns the current state. It returns the **same object** every time until the state changes.
3. `setState(partialOrUpdater, replace = false)` first finds the **value**: if the first argument is a function (an "updater"), call it **once** with the current state and use what it returns. Otherwise the argument itself is the value. The value must be an object, otherwise throw a `TypeError` and change nothing (this includes an updater that forgets to return something). If the updater throws, the error goes through and nothing changes.
4. **Merge** (the default): the new state is a **new object** that has the keys of the old state with the keys of the value copied on top. The merge is shallow: a nested object in the value replaces the old nested object, it is not merged into it. The old state object is never changed. A new object is made even when the value changes nothing (`setState({ count: 1 })` when `count` is already `1`).
5. **Replace** (`replace` is `true`): the new state is the value itself. Keys that are not in the value are gone.
6. If the value is the very same object as the current state (`Object.is`), nothing happens: no new state and no notification. For example `setState((s) => s)` is a harmless no-op.
7. `subscribe(listener, selector = (s) => s, equalityFn = Object.is)` adds a subscription and returns an `unsubscribe` function. If `listener` is not a function, throw a `TypeError`. The listener is **not** called when you subscribe. Calling `unsubscribe` again does nothing. Subscribing the same function twice makes two independent subscriptions, and each `unsubscribe` removes only its own.
8. **Notifications.** After the state changed, the store goes through the subscriptions **in the order they subscribed**. The state is already updated at that moment (`getState()` inside a listener returns the new state). For each subscription:
   - compute `slice = selector(newState)`;
   - compare it with the **last slice of this subscription**, which is the slice at the time of subscribing, or the slice at the last time this listener was called;
   - if `equalityFn(lastSlice, slice)` is `false`, remember the new slice and call `listener(state, prevState)`: exactly two arguments, the whole new state and the whole state before this update.
9. **Changes while the listeners run.**
   - A listener that was unsubscribed by an earlier listener in the same round is not called in that round.
   - A listener that subscribes during a round is not called in that round (it starts with the slice of the newest state).
   - A listener that unsubscribes itself (or another one) must never make a different listener get skipped.
10. A listener may call `setState`. When everything has settled, the **last** call every listener got must carry the newest state. No listener may be called with an older state after it has seen a newer one.
11. **Errors.** If a listener throws, the other listeners still run. After all of them have run, `setState` rethrows the **first** error (later errors are dropped). The state is already updated.
12. `destroy()` removes every subscription, also those that are still waiting in a round that is running. The store itself keeps working: `getState` and `setState` work as before, and `subscribe` after `destroy` works as usual. Old `unsubscribe` functions are harmless.

## Examples

```js
const store = createStore({ count: 0, name: 'Ada' })

store.setState({ count: 1 })
store.getState() // { count: 1, name: 'Ada' }   (merged)

store.setState((s) => ({ count: s.count + 1 }))
store.getState() // { count: 2, name: 'Ada' }

store.setState({ only: true }, true)
store.getState() // { only: true }             (replaced)
```

```js
const store = createStore({ count: 0, name: 'Ada' })

const unsubscribe = store.subscribe(
  (state, prevState) => console.log('count:', prevState.count, '->', state.count),
  (state) => state.count, // only care about the count
)

store.setState({ name: 'Grace' }) // logs nothing: the selected slice (the count) is the same
store.setState({ count: 1 }) // logs "count: 0 -> 1"
unsubscribe()
store.setState({ count: 2 }) // logs nothing
```

```js
const store = createStore({ a: 1, b: 2, other: 0 })
const pick = (s) => ({ a: s.a, b: s.b }) // builds a NEW object on every call

store.subscribe(listenerOne, pick) // Object.is: a new object is never "equal", so every change calls it
store.subscribe(listenerTwo, pick, shallowEqual) // only when a or b really changed

store.setState({ other: 1 }) // listenerOne is called, listenerTwo is not
```

```js
const store = createStore({ x: 0 })
store.subscribe(listener, (s) => s.x, (a, b) => Math.abs(a - b) < 5) // "equal" = less than 5 apart

store.setState({ x: 3 }) // no call: 3 is close to 0, and the reference value stays 0
store.setState({ x: 6 }) // call: 6 is 6 away from 0 (the reference value is now 6)
store.setState({ x: 8 }) // no call: 8 is close to 6
```

## Complexity target

- `getState`, `subscribe` and `unsubscribe`: O(1).
- `setState`: O(n), where n is the number of subscriptions (each selector runs once per update). Subscriptions whose slice did not change cost one selector call and one comparison, nothing more.

## Acceptance criteria (what the tests check)

- `getState` returns the initial state, and the same reference until something changes. A non-object initial state gives a `TypeError`.
- Merge is shallow and never changes the old state (the tests freeze it). Replace drops old keys. Updaters get the latest state. Invalid values give a `TypeError` and change nothing. Setting the same object is a no-op.
- Listeners get `(state, prevState)` after each real change, in subscription order, never at subscribe time. Unsubscribe works and can be repeated. The same function twice is two subscriptions. A non-function listener gives a `TypeError`.
- With a selector the listener is called only when the slice changed; it still gets the whole states. The default comparison is `Object.is`, a custom `equalityFn` is used when given, and it compares with the slice of the last notification.
- Unsubscribing or subscribing while listeners run is safe, as described in requirement 9.
- A listener that throws does not stop the others, and the first error is rethrown. A listener that calls `setState` does not leave anyone with stale state.
- `destroy` removes all subscriptions (also in the middle of a round) and the store keeps working.

## How to run

```bash
npm test -- exercises/js/22-observable-store
```

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/22-observable-store
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Keep the state in a `let state` variable inside `createStore`. The functions you return are closures over it.
2. Keep the subscriptions in a `Set` of small objects: `{ listener, selector, equalityFn, slice }`. One object per `subscribe` call is what makes "the same function twice" work, and a `Set` keeps the order, removes in O(1), and answers `subscriptions.has(subscription)`.
3. In `setState`: get the value (call the updater if it is a function), check `typeof value === 'object' && value !== null`, return early when `Object.is(value, state)`, save `const prevState = state`, and then assign `state = replace ? value : { ...state, ...value }`.
4. In `subscribe`, run the selector right away and keep the result as `slice`. That is the reference value for the first comparison.
5. In the notify loop, go through a **copy** of the set (`[...subscriptions]`), and skip an entry when `subscriptions.has(entry)` is `false` (it was removed while you were looping).
6. Update `entry.slice` **before** you call the listener, and use the `state` variable inside the loop, not a copy of it that you made before the loop. Think about what a listener that calls `setState` does to the later listeners.
7. For errors, wrap the body of the loop in `try/catch`, remember the first error with a separate boolean such as `failed` (a thrown value can be falsy), and rethrow after the loop.
8. `unsubscribe` is `() => subscriptions.delete(entry)`. `destroy` is `subscriptions.clear()`.

</details>

## Stretch goals

- Write the hook `useStore(store, selector)` with `useSyncExternalStore` and use it in a small component. With Testing Library, check that a component re-renders only when its own slice changes.
- Accept an initializer like Zustand does: `createStore((set, get) => ({ count: 0, increment: () => set((s) => ({ count: s.count + 1 })) }))`.
- Add `subscribe(listener, selector, equalityFn, { fireImmediately: true })`, or a `getInitialState()` function.
- Batch updates: several `setState` calls in the same tick should send one notification (use `queueMicrotask`). What do `getState` and the updaters see in between?
- Write a `persist(store, key)` helper that saves the state to `localStorage` after every change and reads it back when the page loads.
- Compare with [13 - Event emitter](../13-event-emitter/README.md): there a listener that was removed during `emit` still runs in that same `emit`. Here it does not. Why is "never call a listener after it unsubscribed" the better rule for a store that feeds React components?

## Interview follow-ups to prepare for

1. **How would you connect this store to React (`useSyncExternalStore`)?**
   - The hook takes a `subscribe` function and a `getSnapshot` function. React calls `subscribe(callback)` and expects an unsubscribe function back. That is exactly the contract of the store's `subscribe` (the extra `(state, prevState)` arguments are simply ignored by React).

     ```jsx
     import { useSyncExternalStore } from 'react'

     export function useStore(store, selector = (state) => state) {
       return useSyncExternalStore(
         store.subscribe, // a stable function, so React does not resubscribe on every render
         () => selector(store.getState()),
       )
     }

     // In a component:
     // const count = useStore(counterStore, (state) => state.count)
     ```

   - React calls `getSnapshot` while rendering and after every notification, and re-renders when the result changes (compared with `Object.is`). So it must return the **same value when nothing changed**. That is why the state is immutable and `getState()` returns the same object until a change.
   - A selector that builds a new object on every call (`(s) => ({ count: s.count })`) breaks this rule. React logs "The result of getSnapshot should be cached to avoid an infinite loop" and the component can fail with "Maximum update depth exceeded". Select primitives or existing references, call the hook once per field, or use a library helper that compares shallowly (Zustand has `useShallow`).
   - Why not `useState` plus `useEffect` that subscribes? With concurrent rendering, the store can change in the middle of a render, and different components could show different versions of the data ("tearing"). `useSyncExternalStore` makes React check the snapshot again and render a consistent result. Its optional third argument, `getServerSnapshot`, is used for server rendering and hydration.

2. **Why selectors?**
   - A component that shows `count` should not re-render when `name` changes. With Context, React cannot know which part of the value a consumer uses, so every consumer re-renders when the value changes. With a store, a selector lets the comparison happen **before** React is involved.
   - Be ready to talk about the cost: every selector runs on every update, so keep them cheap. A selector that derives data (`(s) => s.items.filter(...)`) makes a new array each time, so it needs an `equalityFn` or memoization (Redux has `reselect` for this).
   - Compare the approaches: Redux `useSelector` (compares with `===` by default), Zustand selectors and `useShallow`, and Jotai, where state is split into small atoms so that no selector is needed.

3. **What are the immutability requirements, and why?**
   - Change detection is a **reference check** (`Object.is`). If you write `store.getState().count++`, the state object is still the same object: no notification, `prevState` equals `state`, and React sees nothing new. Always make a new object.
   - The merge in `setState` is shallow, so nested updates need a copy at every level: `setState((s) => ({ user: { ...s.user, name: 'Grace' } }))`. If you mutate `s.user.name` and then call `setState({})`, the `user` reference is unchanged, so `(s) => s.user` sees no change and the UI stays stale.
   - Be ready to explain structural sharing (the parts that did not change keep their old reference, which is what makes selectors cheap), Immer (write "mutating" code that produces a new immutable state), freezing the state in development to catch accidental mutation (the tests here do that), and the cost of copying very large arrays or objects.

## Learn the concepts first

- [JavaScript for React (closures, `Set`, spread)](../../../../01-basics/01-javascript-for-react.md)
- [Other hooks (`useSyncExternalStore`)](../../../../02-hooks/09-other-hooks.md)
- [useEffect and cleanup](../../../../02-hooks/03-useeffect.md)
- [useContext (and why it re-renders every consumer)](../../../../02-hooks/05-usecontext.md)
- [Custom hooks](../../../../02-hooks/08-custom-hooks.md)
- [State management (Redux, Zustand, Jotai)](../../../../03-intermediate/06-state-management.md)
- Advanced patterns (pub/sub, context selectors) (planned)

Related exercises: [13 - Event emitter](../13-event-emitter/README.md) and [32 - Mini Redux store](../../react/32-mini-redux-store/README.md).
