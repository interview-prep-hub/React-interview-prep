# 32 - Mini Redux store

**Level:** Hard | **Time:** 50 minutes | **Topics:** `useSyncExternalStore`, selectors, context, Redux internals

## The task

Build a tiny version of Redux and react-redux from scratch. Then use it in a small app to prove one big idea:

> A component re-renders only when the value it selected from the store changes.

So when the user clicks **Increment**, the todo list must not render again. You will see this with a small "renders: N" badge on every component.

You work in three files, in this order:

1. [`store.js`](./store.js): `createStore` and `combineReducers`. Plain JavaScript, no React.
2. [`react-redux.jsx`](./react-redux.jsx): `Provider`, `useSelector` and `useDispatch`.
3. [`App.jsx`](./App.jsx): an app with two independent slices (a counter and todos) and five components.

Do not edit the test files. There is one test file per part: `store.test.js`, `react-redux.test.jsx` and `App.test.jsx`.

How the pieces work together:

```text
click -> dispatch(action) -> reducer(state, action) -> new state -> every listener is called
      -> each useSelector compares its selected value with the old one (Object.is)
      -> only the components whose value changed render again
```

## Requirements

### Part A: `store.js` (no React)

1. `createStore(reducer, preloadedState)` returns an object with three functions: `getState`, `dispatch` and `subscribe`. They must also work on their own, detached from the object (for example `const { dispatch } = store`), so do not use `this`.
2. When the store is created it calls `reducer(preloadedState, initAction)` once. `initAction` is an object whose `type` is a string. The result is the first state. If there is no `preloadedState`, the reducer receives `undefined`, so its default parameter gives the starting state.
3. `dispatch(action)` calls the reducer with the current state and the action, saves the result as the new state, and then calls every subscribed listener (with no arguments), in the order they subscribed. Inside a listener, `getState()` already returns the new state. `dispatch` returns the action it received.
4. Listeners are called after every dispatch, even when the reducer returned the same state object. (Deciding "did anything change for me?" is the job of the React bindings, not of the store.)
5. `dispatch` throws an `Error` when the action is not an object with a `type` property (for example `undefined`, `null`, a string, or `{}`). Then the state stays the same and no listener is called.
6. `subscribe(listener)` returns an `unsubscribe` function. After you call it, that listener is not called any more. Calling it a second time does nothing. Other listeners are not affected.
7. Notifying must be safe while it is running:
   - a listener that unsubscribes itself must not make the store skip the next listeners;
   - a listener that is subscribed during a dispatch is first called on the next dispatch, not in the current one.
8. `combineReducers(reducers)` takes an object of slice reducers, such as `{ counter: counterReducer, todos: todosReducer }`, and returns one reducer `(state = {}, action) => newState`:
   - each slice reducer receives only its own slice (`state.counter`) and the action;
   - the new state has one key for each slice reducer;
   - called with `undefined` state, it builds the first state from the default state of every slice;
   - if no slice changed (every slice reducer returned what it was given), it returns the same state object. "Changed" means a different reference (`!==`), even when the new object looks equal;
   - otherwise it returns a new object. Slices that did not change keep the same reference, and the old state object is not modified (the tests freeze it).

### Part B: `react-redux.jsx`

9. `Provider` takes a `store` prop and `children`. It makes the store available to every component below it through React context. The context carries the store object, never the state. Two `Provider`s with two different stores next to each other do not affect each other.
10. `useSelector(selector)` returns `selector(store.getState())` and is built with `useSyncExternalStore`. A component that uses it must:
    - show the new value after the selected value changes, and render once for each change (values are compared with `Object.is`);
    - not run its function again at all when the store notifies but its selected value is the same (for example a different slice changed, or the reducer returned the same state);
    - use the selector from its latest render, so a selector that reads props works and follows prop changes;
    - show the latest state even if the store changed after the component's first render but before it subscribed (for example a child component dispatches in an effect while mounting);
    - subscribe once when it mounts (not on every render) and unsubscribe when it unmounts.
11. A selector must give the same result for the same state. If it builds a new array or object on every call (for example `state.todos.filter(...)`), React sees a "different" value each time and loops. Select an existing reference, or return a primitive such as a number. (The tests do not check this rule, but it is the most common bug with this hook.)
12. `useDispatch()` returns the dispatch function of the store, so calling it returns the action. It returns the same function on every render. It does not subscribe: a component that only uses `useDispatch` never renders again because the store changed.
13. If a `Provider` later receives a different `store`, the hooks below it switch to the new store and stop listening to the old one.
14. Using `useSelector` or `useDispatch` outside a `Provider` throws an `Error` whose message contains the word `Provider`.

### Part C: `App.jsx`

15. `App` is the default export and takes no props. It creates its own store when it mounts, once (not at module level), from `combineReducers({ counter, todos })`. Mounting `App` a second time starts from a fresh state.
16. The counter slice holds a number and starts at `0`. The todos slice holds an array of `{ id, text, done }` and starts empty. Every todo has its own `id`, so two todos with the same text are still two different todos. The reducers are pure: they never change their input. (The tests check this: in `App.test.jsx` every state your store holds is frozen, so a reducer that changes its input makes the test fail with a `TypeError` such as "Cannot add property".)
17. The screen is made of five components. Each one shows a render badge: an element with the test id from the table, whose text contains the number of times that component has rendered (the first number in the text is the one the tests read). `App.jsx` already contains a `RenderBadge` component that does this. Use it as `<RenderBadge name="counter-value" />` and do not change it.

    | Component | What it shows or does | What it reads from the store | Badge test id |
    | --- | --- | --- | --- |
    | `CounterValue` | the count, inside an element with `data-testid="count"` (the element contains only the number) | the count | `counter-value-renders` |
    | `CounterButtons` | two buttons named **Decrement** and **Increment** | nothing, it only dispatches | `counter-buttons-renders` |
    | `TodoForm` | a text input labelled **New todo** and a submit button named **Add todo** | nothing, it only dispatches | `todo-form-renders` |
    | `TodoList` | a `<ul aria-label="Todo list">` with one `<li>` per todo. Each item has a checkbox named by the todo text | the todos array | `todo-list-renders` |
    | `TodoStats` | the text "Completed:" and the number of completed todos inside `data-testid="done-count"` (only the number) | the number of completed todos | `todo-stats-renders` |

18. Behaviour of the app:
    - **Increment** adds `1` to the count and **Decrement** subtracts `1` (the count may go below `0`).
    - **Add todo** (by clicking the button, or by pressing Enter in the input) appends a new todo that is not done, and clears the input. Empty or whitespace-only text is ignored.
    - Clicking a todo's checkbox toggles its `done` flag, and only that todo's flag, even when another todo has the same text. `done-count` always shows how many todos are done.
19. Render isolation (this is the point of the exercise). Compare the badges before and after each action:

    | When the user... | These badges go up | These badges stay the same |
    | --- | --- | --- |
    | clicks Increment or Decrement | `counter-value` | `counter-buttons`, `todo-form`, `todo-list`, `todo-stats` |
    | adds a todo | `todo-list` | `counter-value`, `counter-buttons`, `todo-stats` (the completed number did not change) |
    | toggles a todo | `todo-list`, `todo-stats` | `counter-value`, `counter-buttons` |

    `counter-buttons` never goes up, whatever the user does, because that component only dispatches and reads nothing. `TodoForm` renders again while the user types, because the text being typed is its own local state. That is fine and is not tested.

## Acceptance criteria (what the tests check)

`store.test.js` (Part A):

- Initial state comes from the reducer default or from `preloadedState`; the reducer gets an init action with a string type.
- `dispatch` runs the reducer, updates `getState`, returns the action, and throws for `undefined`, `null`, a string, and an object without `type`.
- `getState` returns the very same object until a dispatch changes the state (never a copy).
- The methods work when detached from the store object.
- Listeners run after each dispatch (new state already saved, no arguments), in order, even when the state is unchanged.
- `unsubscribe` stops only that listener (also when other listeners were removed before it) and is safe to call twice. Self-unsubscribing and subscribing during a dispatch behave as in requirement 7.
- `combineReducers` builds the initial state, gives each reducer its own slice, keeps the references of unchanged slices, returns the same object when nothing changed, treats a new object with equal content as a change, does not mutate a frozen previous state, and works inside `createStore` with and without preloaded state.
- Stretch (last three tests, see below): `applyMiddleware` with a logger, with two middlewares in order, and with a thunk that dispatches another thunk.

`react-redux.test.jsx` (Part B, uses a small store written inside the test file, not yours):

- `Provider` serves deep components, keeps two stores independent, and switches stores.
- `useSelector` shows updates, renders only for its own value (counted per component), ignores unchanged values, uses `Object.is` (a new object with equal content is a change), follows props, catches a store change that happens before it subscribes, and subscribes once and cleans up.
- `useDispatch` updates the store, returns the action, is stable, follows a store switch, and does not subscribe.
- Both hooks throw a helpful error outside a `Provider`.

`App.test.jsx` (Part C):

- Initial screen, Increment and Decrement, adding todos (button and Enter), ignoring blank text, toggling (also with two todos that have the same text) and the completed count.
- Render isolation as in the table in requirement 19, including that `TodoStats` renders again only when the number of completed todos changes.
- Pure reducers: every state in the store is frozen during these tests.
- A fresh store for each mount, and the same store when `App` renders again.

## How to run

Run everything:

```bash
npm test -- exercises/react/32-mini-redux-store
```

Or one part at a time (a good way to work):

```bash
npm test -- exercises/react/32-mini-redux-store/store
npm test -- exercises/react/32-mini-redux-store/react-redux
npm test -- exercises/react/32-mini-redux-store/App
```

To see your component in the browser, run `npm run dev` and pick `32-mini-redux-store` in the sidebar. Click around and watch the badges. (In development the page uses StrictMode, which renders components twice, so look at how the numbers change instead of their exact value.)

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/32-mini-redux-store
```

The last three tests in `store.test.js` (the group named "stretch: applyMiddleware") are optional. They stay red until you build the stretch goal below. The exercise is complete when all the other tests pass.

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Part A: a store is a closure. Two variables (`state` and the list of listeners) and three functions. Nothing else.
2. In `dispatch`, do three things in this order: check the action, run the reducer and save the result, call the listeners.
3. Do not change the listeners array while you loop over it. Instead of `push` and `splice`, replace the array with a new one when someone subscribes or unsubscribes, and loop over the array you had when `dispatch` started.
4. `combineReducers`: loop over the keys, call each slice reducer with `state[key]`, build a new object, and remember if any result is different from the old slice (`!==`). If nothing is different, return the old state.
5. Part B: `Provider` is one line of JSX. The context value is the `store`.
6. `useSyncExternalStore(subscribe, getSnapshot)` needs a `subscribe` function that keeps the same identity (the store's own `subscribe` already does) and a `getSnapshot` that returns the selected value: `() => selector(store.getState())`.
7. The "store changed before it subscribed" test passes for free when you use `useSyncExternalStore`: React checks the value again right after subscribing. A hand-written `useState` plus `useEffect` version would miss that update unless you add the check yourself.
8. Part C: write each reducer with `switch (action.type)`. Use spread (`[...state, item]`) and `map` to build new values. Create the todo id in the action creator, because a reducer must be pure.
9. To create the store once per mount: `const [store] = useState(() => createStore(rootReducer))`.
10. A warning such as "The result of getSnapshot should be cached", or an endless loop, means a selector creates a new array or object on each call (requirement 11).
11. A badge goes up when it should not? Look for a component that selects more than it needs (for example the whole state), or a `Provider` that puts the state, and not the store, into context.
12. A `TypeError` such as "Cannot add property 0, object is not extensible" or "Cannot assign to read only property" in `App.test.jsx`? One of your reducers changes its input (`push`, `splice`, `todo.done = ...`). Build a new array or object instead.

</details>

## Stretch goals

- **Middleware.** Make `createStore(reducer, preloadedState, enhancer)` accept an enhancer and write `applyMiddleware(...middlewares)`. A middleware has the shape `({ getState, dispatch }) => next => action => result`. Then write a `logger` middleware that prints each action and the state after it, and use it in `App`. The first two "stretch" tests in `store.test.js` check this. The `dispatch` that a middleware receives must run the whole chain again, not only the real store dispatch.
- **Thunks.** Write a middleware that lets you dispatch a function `(dispatch, getState) => ...`. Use it for an "add todo after one second" button. The third "stretch" test in `store.test.js` checks the core of it.
- **Custom comparison.** Give `useSelector` a second argument `equalityFn` and write `shallowEqual`, so a selector that returns `{ done, total }` does not render on every change.
- **More app.** Add a "Clear completed" button and a "Remove" button for each todo. Predict which badges move before you click.
- **Time travel.** Keep every past state in a logger middleware and add an **Undo** button to the app.

## Interview follow-ups to prepare for

- Why use `useSyncExternalStore` instead of `useState` plus `useEffect` to read an external store? Think about the update that can happen between the first render and the effect, and about what React can do while it renders.
- What is tearing? Describe two components that read the same store while React pauses in the middle of a render, and explain how `useSyncExternalStore` prevents it.
- How does Redux Toolkit differ from the store you just wrote (`configureStore`, `createSlice` with Immer, thunks, DevTools, RTK Query)? When would you pick Context, Zustand or TanStack Query instead?

## Learn the concepts first

- [Other hooks (includes useSyncExternalStore)](../../../../02-hooks/09-other-hooks.md)
- [State management](../../../../03-intermediate/06-state-management.md)
- React internals deep dive (planned)
