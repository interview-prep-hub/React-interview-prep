import { useState } from 'react'
import './styles.css'

// Exercise 03: Todo list (basic).
// Read README.md in this folder for the full requirements.
// styles.css is already written for you. It styles the CSS class "done".

export default function App() {
  // TODO 1: state for the list of todos. Each todo is an object:
  //         { id, text, done }
  // TODO 2: state for the text typed in the input (a controlled input)
  // TODO 3: a way to make a unique id for every new todo. This id will be the
  //         React key, so do not use the array index (or the text) for it.

  // TODO 4: addTodo(event)
  //         - stop the browser from reloading the page
  //         - trim the text and do nothing if nothing is left
  //         - add { id, text, done: false } WITHOUT changing the old array
  //         - clear the input
  const addTodo = (event) => {}

  // TODO 5: toggleTodo(id): flip "done" for ONE todo. Build a new object for
  //         it, never change the old one.

  // TODO 6: deleteTodo(id): remove ONE todo. Return a new array.

  // TODO 7: how many todos are not done? Work it out while rendering.
  //         Do not keep it in state.

  return (
    <div className="todo-app">
      <h2>Todos</h2>

      {/* TODO 8: make the input controlled (value + onChange) */}
      <form onSubmit={addTodo}>
        <label htmlFor="new-todo">New todo</label>
        <input id="new-todo" type="text" />
        <button type="submit">Add</button>
      </form>

      <ul>
        {/* TODO 9: render one <li> per todo, with a key.
            Each <li> needs a checkbox (named by the todo text), the text in
            its own element (class "done" when finished) and a Delete button. */}
      </ul>

      {/* TODO 10: show "N items left" in an element with
          data-testid="items-left" */}
    </div>
  )
}
