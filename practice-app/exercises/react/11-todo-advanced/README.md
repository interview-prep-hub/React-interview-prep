# 11 - Todo list with filters, editing and storage

**Level:** Medium | **Time:** 45 minutes | **Topics:** lazy state initialisation, `useEffect`, `localStorage`, filtering, inline editing

## The task

Build a todo list that remembers itself. The user can add todos, complete them, filter the list (All, Active, Completed), edit a todo in place by double-clicking it, clear all completed todos, and complete everything with one checkbox. The list is saved in `localStorage`, so it is still there after a page reload, and a broken value in storage must never crash the app.

Work in [`App.jsx`](./App.jsx). Do not edit the test file. The starter has `TODO` comments that show the structure, but you are free to organise the code your own way, as long as the behaviour below is correct.

A todo is a plain object with exactly these three properties:

```js
{ id: 1, text: 'Buy milk', completed: false }
```

The tests put objects of this shape into `localStorage`, and they read them back from it, so use these exact property names. The `id` can be a number or a string, it only has to be unique.

## Requirements

All names below are the exact text that the tests use to find things. A name given as an "accessible name" can come from `aria-label` or from a `<label>`.

**Adding todos**

1. A `<form>` with a text input whose accessible name is **New todo** and a submit button labelled **Add**. Submitting the form (Enter in the input, or a click on Add) appends a new todo at the END of the list, with the trimmed text and `completed: false`, and then clears the input.
2. If the trimmed text is empty, nothing is added.
3. Every new todo gets its own unique `id`, and it stays unique after other todos were deleted (so the array length is not a safe id). For example `crypto.randomUUID()`.

**The list**

4. Show the todos for the current filter in one `<ul>`, with one `<li>` per todo. Do not use `<li>` or `<ul>` for anything else on the page (the filter buttons and the footer must not be inside a list).
5. Every `<li>` contains:
   - A checkbox with the accessible name `Complete <text>`, for example `Complete Buy milk`. It is checked when the todo is completed, and clicking it flips `completed`.
   - The todo text, in an element of its own (a `<span>` is fine), so that `screen.getByText('Buy milk')` finds exactly that element. Completed todos should look finished (for example a line-through), but the tests do not check the style.
   - A button with the accessible name `Delete <text>`, for example `Delete Buy milk`. Its visible text can simply be "Delete". Clicking it removes the todo.

   The checkbox, the Delete button and editing must act on the right todo also while the Active or Completed filter is on (a todo can be the 2nd one you see and the 3rd one in the full list).

   Use the todo `id` as the React `key` of its `<li>`, not the array index. A test deletes the first todo and checks that the other `<li>` elements are still the very same DOM elements.

**Toggle all**

6. A checkbox with the accessible name **Toggle all todos**. It is checked when the list has at least one todo and every todo is completed, otherwise it is unchecked.
7. Clicking it sets `completed` on EVERY todo (also the ones that the current filter hides) to the new checked state of the box. So if some todos are active, one click completes all of them. If all are completed, one click makes all of them active again.

**Footer: counter, filters, Clear completed**

8. The toggle-all checkbox and the whole footer (counter, filter buttons, Clear completed) are shown only when the full list has at least one todo. With an empty list, none of them is on the screen.
9. The counter is ONE element whose whole text is `N items left`, where `N` is the number of active (not completed) todos in the full list, whatever the current filter is. The word is singular only for exactly one: `1 item left`. Zero and every other number use the plural: `0 items left`, `2 items left`.
10. Three `<button type="button">` elements named **All**, **Active** and **Completed**. The selected one has `aria-pressed="true"`, the other two have `aria-pressed="false"`. **All** is selected when the app starts.
    - All shows every todo.
    - Active shows only the todos that are not completed.
    - Completed shows only the completed todos.
    - The selected filter is plain state. It is not saved in `localStorage`.
11. A button named **Clear completed**. It is rendered only while at least one todo in the full list is completed (even if the current filter hides that todo). Clicking it removes every completed todo.

**Inline editing**

12. Double-clicking the text of a todo replaces that text with a text input whose accessible name is **Edit todo**. The input holds the current text and has keyboard focus right away. A single click does nothing.
13. **Enter** saves: the trimmed text becomes the new text of the todo and the input disappears. If the trimmed text is empty, the todo is deleted instead.
14. **Escape** cancels: the input disappears and the todo keeps its old text. If the user starts editing the same todo again, the input shows the saved text, not the discarded draft. A `blur` event that arrives right after Escape (a browser can fire one while it removes the focused input) must not save the discarded draft.
15. **Blur** (focus moves somewhere else) does the same as Enter.
16. Editing changes only `text`. The todo keeps its position in the list and its `completed` state.

**Persistence**

17. The list is stored in `localStorage` under the key `"todos"`, as a JSON array of todo objects. It is always the FULL list, also while a filter hides some of the todos.
18. Read `localStorage` only ONCE, when the component first mounts, using lazy state initialisation. It must not be read again on later renders. The saved todos must already be part of the very first render (do not load them later in an effect, that would flash an empty list).
19. Write to `localStorage` in a `useEffect`, every time the list changes.
20. If the stored value is missing, is not valid JSON, or is valid JSON that is not an array (for example `{"a":1}`, `null` or `"hello"`), start with an empty list. The app must not crash, and the next change must store a valid array.

**Pure updates**

21. The app must behave the same inside `<StrictMode>` (the playground uses it), which runs every state updater function twice in development. So never change an old todo or array in place inside an updater: always return new arrays and new objects.

## Acceptance criteria (what the tests check)

- Enter and the Add button both add a todo at the end of the list, the input is cleared, and empty or whitespace-only text adds nothing. The saved text is trimmed.
- Saved todos from `localStorage` appear with the right checked state.
- Toggle-all, the counter and the filter buttons are not on the screen for an empty list, and they appear after the first todo is added.
- The counter says `2 items left`, `1 item left`, `0 items left`, and it counts the whole list even while the Completed filter is selected.
- All, Active and Completed show the right todos and set `aria-pressed` correctly. Completing a todo while Active is selected makes it leave the view.
- The checkbox of a todo, the Delete button and toggle-all change the list and the saved data. Toggle-all is checked only when every todo is completed (of the full list, also while a filter is on), and it also changes todos that the current filter hides.
- While Active is selected, completing, deleting and editing the 2nd visible todo changes the right todo, and the saved list still holds every todo.
- After a delete, the `<li>` elements of the other todos are the same DOM elements as before (the todo `id` is the key).
- Clear completed appears only when something is completed, removes all completed todos (also hidden ones) and then disappears.
- Double-click opens a focused input with the current text, a single click does not. Enter saves (trimmed), Escape cancels (also when a late `blur` follows it), Enter or blur with empty text (or only spaces) deletes the todo, blur saves. Position and `completed` do not change.
- After every kind of change the array under the key `todos` is up to date, each saved todo has exactly the properties `id`, `text` and `completed`, every saved todo has a different `id` (also after a delete and a new add), and mounting the app again restores the list.
- A first render that runs no effects (`renderToString`) already contains the saved todos.
- `localStorage.getItem('todos')` is called exactly once, no matter how much the user does.
- Inside `<StrictMode>`, adding, completing, editing, toggle-all, Clear completed and Delete still give the right list.
- Broken JSON, an object, `null` and a plain string in storage all give an empty list, and adding a todo afterwards saves a valid array.

## How to run

```bash
npm test -- exercises/react/11-todo-advanced
```

To see your component in the browser, run `npm run dev` and pick `11-todo-advanced` in the sidebar. The browser version uses your real `localStorage`. To start again from an empty list, open the browser console and run `localStorage.clear()`. The tests are not affected, because they clear storage before every test.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/11-todo-advanced
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. `useState(loadTodos)` is lazy: you pass the function and React calls it once, on the first render. `useState(loadTodos())` calls it on EVERY render and ignores the result after the first one. That is the bug the "reads once" test catches. Loading later inside a `useEffect` is wrong too, because the first render would show an empty list. The "very first render" test catches that.
2. In `loadTodos`, wrap `JSON.parse` in `try/catch`, and also check the result with `Array.isArray`. Valid JSON is not always a list.
3. The effect that saves is one line of work: `localStorage.setItem(KEY, JSON.stringify(todos))` with `[todos]` as the dependency array.
4. The visible list, the counts and the "all done" flag are derived values. Compute them while rendering, from `todos` and `filter`. Do not store them in state.
5. Update state with the functional form and return new arrays and new objects: `prev.map(...)`, `prev.filter(...)`, `{ ...todo, completed: true }`. Make the new todo (and its random id) BEFORE you call `setTodos`, so the updater function itself stays pure.
6. For the toggle-all checkbox, `e.target.checked` already tells you the state the user wants. You do not need to work out "should I complete or un-complete" yourself.
7. Build the whole counter text in one string, for example with a template literal. If you split it over several elements, the text cannot be found as one piece.
8. Put the editing state (`editing` and the draft text) inside the `TodoItem` component. Then each todo edits on its own, and the parent only hears the final result through a callback such as `onSave(id, text)` or `onDelete(id)`.
9. Enter, Escape and blur are three triggers for one small function, for example `finishEditing(shouldSave)`. A `useRef` flag that says "already finished" stops a late blur event (a browser can fire one while the input is being removed) from saving a draft that was just cancelled. The "late blur" test sends Escape and a blur in the same batch to check exactly this.
10. `autoFocus` on the edit input gives it focus as soon as it appears.

</details>

## Stretch goals

- Move the load and save code into a custom hook `useLocalStorage(key, initialValue)` that returns `[value, setValue]`, and use it like `useState`. The test file should still pass unchanged.
- Make the list follow changes made in another tab by listening to the `storage` event.
- Make editing possible from the keyboard too (for example an Edit button on every todo), because double-click alone is not reachable with a keyboard.
- Keep the selected filter in the URL hash (`#/active`) so a reload keeps it. (The hash survives between tests, so for this stretch goal add `window.location.hash = ''` to the `beforeEach` of your own copy of the tests.)
- When `setItem` throws (storage full or blocked), show a small "Could not save" message instead of failing silently.
- Replace the separate state setters with one `useReducer` and actions such as `added`, `toggled`, `edited`, `deleted`.

## Interview follow-ups to prepare for

1. **Extract `useLocalStorage`.** Turn the load-and-save code into a reusable hook.
   - What is its signature, and what does it return?
   - Why must the first read still be lazy, and where does the `JSON.parse` error handling belong?
   - How do you keep `setValue(prev => ...)` working like in `useState`?
   - How would you test the hook on its own?
2. **What breaks with two tabs open?** Both tabs read the same list when they start, and each keeps its own copy in state.
   - Walk through what happens when tab A adds a todo and tab B (which does not know about it) then adds another one. Which write wins, and what is lost?
   - The browser fires a `storage` event. In which tabs does it fire, and in which tab does it not?
   - How would you subscribe to it correctly (`useEffect` with cleanup, or `useSyncExternalStore`)? What else could you use (`BroadcastChannel`, a server as the single source of truth)?
3. **How would you add drag-and-drop ordering?**
   - What is the data model: the order of the array, or an `order` field? How do you reorder without mutating?
   - Would you use the HTML5 drag events, pointer events or a library such as dnd-kit? What would you gain or lose with each?
   - How does a keyboard user move a todo (for example Move up and Move down buttons)?
   - What should dragging do while the Active or Completed filter is on? Why do stable `id` keys matter here (and index keys are a bug)?

## Learn the concepts first

- [useState in depth](../../../../02-hooks/02-usestate-in-depth.md)
- [useEffect](../../../../02-hooks/03-useeffect.md)
- [Custom hooks](../../../../02-hooks/08-custom-hooks.md)
