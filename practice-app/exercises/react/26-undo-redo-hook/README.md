# 26 - Undo/redo hook

**Level:** Hard | **Time:** 45 minutes | **Topics:** custom hook design, `useReducer`, history stack

## The task

Build a reusable hook, `useHistory`, that adds undo and redo to any piece of state. Then use it in a small demo: a text area and a color picker that share ONE history, so Undo walks back through typing and color changes in the order they happened.

You work in two files. Do not edit the test files.

- [`useHistory.js`](./useHistory.js): the hook. Tests: [`useHistory.test.js`](./useHistory.test.js).
- [`App.jsx`](./App.jsx): the demo. Tests: [`App.test.jsx`](./App.test.jsx).

Do the hook first. The App tests need a working hook.

### How the hook is used

```jsx
const { state, set, undo, redo, canUndo, canRedo, reset, history } = useHistory(0)

set(1)             // state is 1, history.past is [0]
set((n) => n + 1)  // state is 2, history.past is [0, 1]
undo()             // state is 1, history.future is [2]
redo()             // state is 2 again
```

### The mental model

The hook keeps three things: the states that came before, the current state, and the states you can redo.

```text
                        past (oldest first)   present   future (nearest first)
start                   [ a, b ]              c         [ d, e ]
undo, from the start    [ a ]                 b         [ c, d, e ]
redo, from the start    [ a, b, c ]           d         [ e ]
```

Each of the last two rows starts again from the first row. They are not applied one after the other.

## Requirements

### Part 1: the hook (`useHistory.js`)

1. Export a named function `useHistory(initialValue, options)` from `useHistory.js`. The second argument is optional. `options.limit` defaults to `100` and is a whole number, `0` or more.
2. It returns an object with these properties: `state`, `set`, `undo`, `redo`, `canUndo`, `canRedo`, `reset`, `history`.
3. `state` starts as `initialValue`. The hook reads `initialValue` on the first render only. A different value on a later render is ignored (the same rule as `useState`).
4. `set(valueOrUpdater)` changes the state:
   - If you pass a function, it is an updater: the hook calls it with the current state and uses the result as the next value. A function is always treated as an updater, so functions cannot be stored as state.
   - If the next value is equal to the current state according to `Object.is`, `set` does nothing at all. The past and the redo stack stay exactly as they were. (`Object.is` compares objects by identity: the same object is equal, an equal-looking copy is not. `NaN` equals `NaN`. `0` and `-0` are different.)
   - Otherwise the current state is added to the end of the past, the next value becomes the state, and the redo stack is cleared.
   - Calling `set` several times in the same event applies all of the calls in order. Each call works on the result of the call before it: an updater sees that result, and the "is it equal to the current state?" check compares with that result too (so `set(1)` followed by `set(0)` in one event, starting from `0`, ends at `0` with `[0, 1]` as the past).
5. `undo()` goes one step back: the current state is added to the FRONT of the redo stack, and the most recent past state becomes the state. If there is nothing to undo, it does nothing.
6. `redo()` is the mirror image: the current state is added to the END of the past, and the first item of the redo stack becomes the state. If there is nothing to redo, it does nothing. Like `set`, the functions `undo`, `redo` and `reset` can be called several times in the same event, and each call works on the result of the call before it (for example `set('b')` followed by `undo()` in one event ends where it started, with `'b'` in the redo stack).
7. `canUndo` is `true` when the past has at least one item. `canRedo` is `true` when the redo stack has at least one item.
8. `history` is an object `{ past, future }`:
   - `past` is an array of earlier states, oldest first. The last item is what `undo` restores next.
   - `future` is an array of states that `redo` can bring back, nearest first. The first item is what `redo` restores next.
   - The current state is in neither array.
   - Never change an array you already handed out (not in `set`, not in `undo`, not in `redo`, and not when you drop old states because of the limit): build new arrays.
   - Store values exactly as they were given. Do not copy or clone them. After `undo`, `state` is the very same object you passed to `set` earlier.
9. The past never has more than `limit` items. When a `set` would go over the limit, the oldest past states are dropped. `limit: 0` means no history at all: `state` still changes, but `canUndo` is always `false`.
10. `reset(value)` clears both the past and the redo stack, and `value` becomes the state. When you call `reset()` with no argument (or with `undefined`), the state goes back to the ORIGINAL `initialValue` from the first render, even if you used `reset(someValue)` before. `reset` takes a plain value, not an updater. Any value other than `undefined` is a real value, including `0`, `''`, `false` and `null`.
11. `set`, `undo`, `redo` and `reset` keep the same identity between renders (as long as `limit` does not change), so people can safely put them in dependency arrays. This holds even when the caller passes a brand new object as `initialValue` on every render (for example `useHistory({ n: 0 })`), and `reset()` still goes back to the object from the first render.
12. The hook works inside `<StrictMode>`, where React runs reducers and updater functions twice on purpose. Your code must be pure: no side effects, and never change existing state.

### Part 2: the demo (`App.jsx`)

1. Call `useHistory` once, with the initial value `{ text: '', color: 'red' }`. Text and color live in this ONE object, so they share one history.
2. A `<textarea>` with a `<label>` whose text is **Text**. Its value comes from the state. Every change of the text is one history step (one step per typed character). Do not group keystrokes together; that is a stretch goal.
3. The color picker is an element with `role="group"` and `aria-label="Color"`. It contains exactly four buttons, in this order, with these labels: **Red**, **Green**, **Blue**, **Orange**. Their colors are `red`, `green`, `blue` and `orange`. Clicking a button selects that color (one history step). The button of the selected color has `aria-pressed="true"`, the other three have `aria-pressed="false"`. Red is selected at the start.
4. Clicking the color that is ALREADY selected adds nothing to the history. The redo steps stay as they were, too.
5. A swatch: an element with `data-testid="swatch"` whose inline `background-color` is the selected color.
6. Two buttons labelled **Undo** and **Redo**. Each one is `disabled` exactly when it cannot do anything (`canUndo` and `canRedo`).
7. A button labelled **Reset**. It puts the text back to empty and the color back to red, and clears the history, so both Undo and Redo become disabled.
8. A paragraph with `data-testid="history-info"` that shows the number of undo and redo steps in exactly this form: `Undo steps: 2, Redo steps: 1`. The first number is the length of `history.past`, the second is the length of `history.future`.

## Acceptance criteria (what the tests check)

The hook (in `useHistory.test.js`, using `renderHook`):

- Initial state, and an empty history `{ past: [], future: [] }`.
- `set` with a value and with an updater; several `set` calls in one event all apply in order.
- Values are stored by reference, and history arrays handed out earlier are never changed (by `set`, `undo`, `redo` or the limit).
- Equal values (by `Object.is`) are ignored, also when an updater returns the current state, and an ignored `set` does not clear the redo stack. In one event, each `set` is compared with the result of the call before it.
- `undo` and `redo` move along the history, give the right `canUndo`, `canRedo` and `history`, and do nothing at the ends.
- Several `set`, `undo`, `redo` and `reset` calls in the same event each work on the result of the call before.
- A real `set` after `undo` clears the redo stack.
- The default limit is 100, small limits (including 0) drop the oldest states, and undo/redo stay correct at the limit.
- `reset()` and `reset(value)` clear the history, falsy values such as `0` and `null` are accepted, and `reset()` goes to the original initial value.
- A new `initialValue` on a later render is ignored; the four functions keep their identity (also with a fresh object as `initialValue` on every render); everything works in StrictMode.

The demo (in `App.test.jsx`, using Testing Library):

- First screen: empty text, Red selected, red swatch, Undo and Redo disabled, `Undo steps: 0, Redo steps: 0`.
- Typing, and Undo/Redo one character at a time, with the buttons enabling and disabling at the right moments.
- Color buttons change the swatch and `aria-pressed`, and Undo/Redo move between colors.
- Text and color share one history and are undone in the order they were made.
- Clicking the selected color adds no step and keeps the redo steps. A new change after Undo clears Redo.
- The info line updates. Reset restores everything and starts a fresh history.
- The whole demo also works inside `<StrictMode>`.

## How to run

Run the commands from the `practice-app` folder.

```bash
npm test -- exercises/react/26-undo-redo-hook
```

To run only one of the two test files while you work:

```bash
npm test -- exercises/react/26-undo-redo-hook/useHistory.test.js
npm test -- exercises/react/26-undo-redo-hook/App.test.jsx
```

To see your component in the browser, run `npm run dev` and pick `26-undo-redo-hook` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/26-undo-redo-hook
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Think of the history as three parts: `past`, `present`, `future`. Keep them in ONE state object. Then every change updates all three together and they can never get out of sync.
2. `useReducer` is a good fit. Write the reducer first, as a plain function with four actions: set, undo, redo, reset. Check it by hand with a small example (`a`, `b`, `c`, then undo twice) before you think about React.
3. Run the updater function INSIDE the reducer (`action.value(state.present)`), not inside `set`. The reducer always receives the latest state, so two `set` calls in one event both apply. If `set` reads the state from its closure instead, the second call works with a stale value.
4. To ignore an equal value, return the same `state` object from the reducer. React sees "same state", skips the render, and the redo stack is untouched.
5. To keep the newest `limit` items of an array, use `slice`. Be careful: `array.slice(-0)` is the same as `array.slice(0)`, which keeps everything. Work out the start index instead: `Math.max(0, array.length - limit)`.
6. `dispatch` from `useReducer` already has a stable identity. Wrap your small functions (`set`, `undo`, `redo`, `reset`) in `useCallback` so they are stable too. `set` needs `limit`, so `limit` belongs in its dependency list.
7. For `reset()` with no argument you need the FIRST `initialValue`. `useState(initialValue)` or `useRef(initialValue)` remembers it and ignores later values. Use the remembered value inside `reset` (and in its dependency list), not the `initialValue` argument: the caller may pass a new object on every render.
8. In `App`: read `event.target.value` BEFORE you call `set`, because the updater function runs later. Also, `onClick={reset}` would pass the click event to `reset` as the new value. Write `onClick={() => reset()}`.
9. In `App`: for the color, an updater like `(prev) => (prev.color === color ? prev : { ...prev, color })` returns the same object when nothing changed, and the hook then ignores it.

</details>

## Stretch goals

- Add keyboard shortcuts: Ctrl+Z undoes, Ctrl+Shift+Z (and Ctrl+Y) redoes. Use an effect with a cleanup.
- Group fast typing into ONE undo step. For example, changes that arrive less than 500 ms apart share a step. Decide what the hook API for this looks like, and test it with fake timers.
- Add `jumpTo(index)` to go straight to any state in the history.
- Let `limit` change while the component is mounted. If the new limit is smaller, drop the oldest states at once.
- Rewrite the hook in TypeScript as a generic `useHistory<T>`.

## Interview follow-ups to prepare for

- **Command pattern vs snapshot history?** This hook saves a snapshot of the whole state at every step. The command pattern saves what was DONE instead, as a pair of actions: "insert 'a' at position 5" and "delete 1 character at position 5". Be ready to compare memory use, how easy each one is to write, how each copes with big or hard-to-copy state, and which one you need for collaborative editing or macros.
- **Memory implications for large state?** Each history entry keeps a reference to a state. When updates are immutable, the unchanged parts are shared between snapshots, so a new step only costs the parts that changed. A deep clone on every step would multiply the memory. Talk about the `limit`, about storing patches instead of full snapshots (for example with Immer patches), and about what should never go into history (huge blobs, DOM nodes).
- **Grouping rapid changes (typing) into one undo step?** Right now every keystroke is a step, which feels bad to a user. Describe your options: close the step after a pause with a timer, commit on blur or Enter, or an API such as `set(value, { group: 'typing' })` where a repeated group key replaces the latest entry instead of adding one. What are the edge cases (the first keystroke, undo while the timer is running, the redo stack)?

## Learn the concepts first

- [Custom hooks](../../../../02-hooks/08-custom-hooks.md)
- [useReducer](../../../../02-hooks/06-usereducer.md)
- Advanced patterns (planned)
