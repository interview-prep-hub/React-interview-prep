# 03 - Todo list (basic)

**Level:** Easy | **Time:** 20 minutes | **Topics:** lists, keys, controlled input, immutable updates

## The task

Build a small todo list. The user types a task and adds it. Each task can be ticked off as done, and it can be deleted. A line at the bottom tells the user how many tasks are still open.

This is the classic "list" exercise. It looks simple, but it checks four things that interviewers love: rendering a list with `map`, giving every item a good `key`, controlling an input with state, and updating state without changing the old data.

Work in [`App.jsx`](./App.jsx). The file [`styles.css`](./styles.css) is already written for you (it draws the line through finished tasks when an element has the class `done`). Do not edit the test file.

## Requirements

1. **The form.** Use a real `<form>` that contains:
   - a text input with a `<label>` whose text is exactly **New todo** (so the input's accessible name is `New todo`)
   - a button with the text **Add** and `type="submit"`

   Because it is a form, pressing Enter in the input adds the todo, the same as clicking Add. Your submit handler must call `event.preventDefault()` so the browser does not reload the page. Call it first, before any other check, so it also runs when the input is empty.
2. **Start empty.** When the app first appears there are no todos and the input is empty.
3. **Adding.** A new todo goes to the end of the list and is not done. The text is stored without the spaces at its start and end (`"  Buy milk  "` becomes `"Buy milk"`). Two todos may have the same text.
4. **Blank text is ignored.** If the text is empty, or contains only spaces, nothing is added. (The tests do not check what the input shows afterwards in this case.)
5. **The input clears** after a todo is added, so it is ready for the next one.
6. **The list.** Put the todos in a `<ul>`, one `<li>` per todo, in the order they were added. The list never sorts or reorders itself. Inside the `<li>`, show the todo text in its own element (for example a `<span>`), exactly once.
7. **Done checkbox.** Each `<li>` has a checkbox (`<input type="checkbox">`) whose accessible name is the todo text. The easiest way is to wrap the checkbox and the text in a `<label>`. The checkbox is checked when the todo is done. Clicking it toggles that one todo (done becomes not done, and back) and the todo stays in its place in the list. Make it a controlled checkbox: `checked={todo.done}`.
8. **Done style.** While a todo is done, the element that holds its text has the CSS class `done`. When it is not done, that element must not have the class.
9. **Delete.** Each `<li>` has a `<button>` whose accessible name contains the word "Delete" (any letter case). It removes that one todo, whether the todo is done or not. Tip: keep the visible text `Delete` and add an `aria-label` such as ``aria-label={`Delete ${todo.text}`}``, so a screen reader user hears which todo the button belongs to.
10. **Items left.** An element with `data-testid="items-left"` shows how many todos are **not** done, written as `N items left` (for example `0 items left`, `3 items left`). For exactly one todo, `1 item left` is the correct English and `1 items left` is also accepted by the tests. Put the number and the words in the same element. Work the number out while rendering. Do not store it in state.
11. **Keys.** Give every todo a unique `id` when it is created, and use that id as the `key` of its `<li>`. Do not use the array index. Do not use the text (two todos can have the same text). An id is never shared: a todo added after another one was deleted must not get the id of a todo that is still on the screen (so do not build the id from the length of the list).
12. **Immutable updates.** Never change state in place. To add, return a new array. To toggle, build a new object for the one todo that changes. To delete, return a new array without it. The tests render your app inside `<StrictMode>`, which calls state updater functions twice in development and so exposes many in-place changes. It cannot catch every one, so also check your own code: no `push`, no `todo.done = ...` on something that came from state.

## Acceptance criteria (what the tests check)

- At the start there are no list items, the input is empty and the screen says `0 items left`.
- Submitting the form is not left to the browser: the submit event is cancelled, even when the input is empty.
- Typing `Buy milk` and clicking Add shows one unchecked todo named `Buy milk` and `1 item left`.
- Typing text and pressing Enter adds the todo and empties the input.
- The input is empty after clicking Add.
- The todos are inside a `<ul>`, one `<li>` each.
- Todos appear in the order they were added (the test uses texts that are not in alphabetical order, so a list that sorts itself fails).
- Spaces typed before and after the text are not kept.
- Clicking Add or pressing Enter with an empty input adds nothing (checked after a real todo exists, so a broken Add cannot sneak through).
- Text made only of spaces adds nothing.
- Clicking a checkbox makes the todo done (checkbox checked and text has the class `done`). Clicking again undoes it.
- Only the todo whose checkbox was clicked changes.
- Ticking and unticking never moves a todo to another place in the list.
- `items left` goes down when a todo is ticked and up when it is unticked.
- Delete removes only the chosen todo and keeps the order of the others.
- `items left` stays the same when a done todo is deleted and goes down when a not-done todo is deleted.
- After deleting a todo, the other todos keep their own done state.
- Two todos with the same text are separate todos (ticking one does not tick the other), and React prints no warning about keys.
- A todo added after another one was deleted gets its own id: ticking it does not tick another todo, deleting another todo does not delete it, the todos that were already there keep their done state, and React prints no warning about keys.
- After deleting the first todo, the other `<li>` elements on the screen are the very same DOM elements as before. React can only keep them if each item has a stable key. With index keys, React reuses the wrong elements and this check fails.

## How to run

Run these commands from the `practice-app` folder:

```bash
npm test -- exercises/react/03-todo-basic
```

To see your component in the browser, run `npm run dev` and pick `03-todo-basic` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/03-todo-basic
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. You need two pieces of state: the array of todos (each one is an object like `{ id, text, done }`) and the text in the input. The "items left" number is not state. Calculate it from the array with `filter` and `.length` every time you render.
2. A controlled input stores its value in state and updates it in `onChange`. Give the input `value={text}` and `onChange={(e) => setText(e.target.value)}`.
3. Put `onSubmit` on the `<form>` (not `onClick` on the button). That one handler then covers both the Add button and the Enter key. The handler gets the event, so you can call `event.preventDefault()`.
4. Use `text.trim()` for both jobs: deciding whether the text is blank and the value you store.
5. To add: `setTodos((prev) => [...prev, newTodo])`. The spread creates a new array. Calling `push` on the old array would change state in place.
6. To toggle: `prev.map(...)` returns a new array. For the matching todo return a copy with the flipped value (`{ ...todo, done: !todo.done }`), and return all the other todos unchanged.
7. To delete: `prev.filter((todo) => todo.id !== id)`.
8. Make the id inside the submit handler, not inside the function you pass to `setTodos`. React may run an updater function twice in StrictMode, and that function should always give the same result. A simple source is a counter outside the component: `let nextId = 1`, then `const id = nextId++`. (`todos.length + 1` looks tempting, but after a delete it gives the new todo the id of one that is still there.)
9. The `key` goes on the outermost element that `map` returns (the `<li>`), not on the checkbox or the text.
10. `className={todo.done ? 'done' : undefined}` adds the class only when needed.

</details>

## Stretch goals

- Write the count correctly for one item: `1 item left`, but `0 items left` and `2 items left`.
- Add a **Clear completed** button that removes every done todo with one `filter`.
- Show a friendly message such as "Nothing to do" when the list is empty.
- Put the cursor back in the input after each add (hint: a ref to the input and its `focus()` method).
- Add three filter buttons, All, Active and Done. Keep only the chosen filter in state and work out the visible list while rendering.

## Interview follow-ups to prepare for

- **Why should you not use the array index as the key?** Explain what React does with keys when it compares the old list with the new one. Describe a real bug: delete the first row of a list where each row holds its own state (for example a text box that the user already typed in) and watch the state stay behind on the wrong row. Say when an index key is acceptable (a fixed list that never changes order and has no state in its rows). Say why `Math.random()` as a key is even worse.
- **How would you add editing?** Double-click on the text turns it into an input, Enter saves, Escape cancels. Where does the "which todo is being edited" state live (in `App`, or inside a small `TodoItem` component)? How do you change the text of one todo without changing the others or the old array? How do you move the focus into the new input?
- **How would you persist the todos to `localStorage`?** Where do you read the saved value (lazy initial state) and where do you write it (an effect that runs when `todos` changes)? What happens if the saved text is not valid JSON, or if the key does not exist yet? What happens to your id counter after a page reload? How would you turn this into a reusable `useLocalStorage` hook?

## Learn the concepts first

- [State and events](../../../../01-basics/05-state-and-events.md)
- [Conditional rendering and lists](../../../../01-basics/06-conditional-rendering-and-lists.md)
- [Forms](../../../../01-basics/07-forms.md)
