import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

// Part C: the demo app. It uses YOUR store.js and YOUR react-redux.jsx.

// Reducers must be pure (README requirement 16). To check that, every state the
// store ever holds is deep-frozen here. A reducer that changes its input, for
// example state.push(item) or todo.done = true, then throws a TypeError such as
// "Cannot add property 1, object is not extensible". Your own code is not
// changed: this only wraps createStore for the tests of this file.
vi.mock('./store.js', async (importOriginal) => {
  const actual = await importOriginal()
  const deepFreeze = (value) => {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value)
      Object.values(value).forEach(deepFreeze)
    }
    return value
  }
  return {
    ...actual,
    createStore: (reducer, preloadedState, enhancer) =>
      actual.createStore((state, action) => deepFreeze(reducer(state, action)), preloadedState, enhancer),
  }
})

// ---- helpers -------------------------------------------------------------------

// The number shown by the badge `data-testid="<name>-renders"`.
function renders(name) {
  const text = screen.getByTestId(`${name}-renders`).textContent
  const match = /\d+/.exec(text)
  expect(match, `the badge "${name}-renders" must show a number, it shows "${text}"`).not.toBeNull()
  return Number(match[0])
}

// All five badges at once, so a test can compare "before" and "after".
const BADGES = ['counter-value', 'counter-buttons', 'todo-form', 'todo-list', 'todo-stats']
function allRenders() {
  return Object.fromEntries(BADGES.map((name) => [name, renders(name)]))
}

const count = () => screen.getByTestId('count').textContent
const doneCount = () => screen.getByTestId('done-count').textContent
const todoItems = () => within(screen.getByRole('list', { name: 'Todo list' })).queryAllByRole('listitem')

async function addTodo(user, text) {
  await user.type(screen.getByLabelText('New todo'), text)
  await user.click(screen.getByRole('button', { name: 'Add todo' }))
}

// ---- tests ---------------------------------------------------------------------

describe('32 Mini Redux store: the demo app', () => {
  it('starts with count 0, no todos, and a render badge on each of the five components', () => {
    render(<App />)

    expect(count()).toBe('0')
    expect(doneCount()).toBe('0')
    expect(todoItems()).toHaveLength(0)
    for (const name of BADGES) {
      expect(renders(name)).toBeGreaterThanOrEqual(1)
    }
  })

  it('Increment and Decrement change the count', async () => {
    const user = userEvent.setup()
    render(<App />)
    const increment = screen.getByRole('button', { name: 'Increment' })
    const decrement = screen.getByRole('button', { name: 'Decrement' })

    await user.click(increment)
    await user.click(increment)
    expect(count()).toBe('2')

    await user.click(decrement)
    expect(count()).toBe('1')

    await user.click(decrement)
    await user.click(decrement)
    expect(count()).toBe('-1')
  })

  it('adds todos in order with the button, and clears the input after each one', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addTodo(user, 'Buy milk')
    expect(screen.getByLabelText('New todo')).toHaveValue('')
    await addTodo(user, 'Walk the dog')

    const items = todoItems()
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Buy milk')
    expect(items[1]).toHaveTextContent('Walk the dog')
    expect(screen.getByRole('checkbox', { name: 'Buy milk' })).not.toBeChecked()
  })

  it('adds a todo when the user presses Enter in the input', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('New todo'), 'Pay rent{Enter}')

    expect(todoItems()).toHaveLength(1)
    expect(screen.getByRole('checkbox', { name: 'Pay rent' })).toBeInTheDocument()
    expect(screen.getByLabelText('New todo')).toHaveValue('')
  })

  it('ignores empty and whitespace-only todos', async () => {
    const user = userEvent.setup()
    render(<App />)
    const add = screen.getByRole('button', { name: 'Add todo' })

    await user.click(add)
    await user.type(screen.getByLabelText('New todo'), '   ')
    await user.click(add)
    expect(todoItems()).toHaveLength(0)

    // A real todo still works afterwards.
    await user.clear(screen.getByLabelText('New todo'))
    await addTodo(user, 'Real one')
    expect(todoItems()).toHaveLength(1)
  })

  it('toggles a todo with its checkbox and shows how many are completed', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, 'Read')
    await addTodo(user, 'Write')
    const read = screen.getByRole('checkbox', { name: 'Read' })
    const write = screen.getByRole('checkbox', { name: 'Write' })

    await user.click(read)
    expect(read).toBeChecked()
    expect(write).not.toBeChecked()
    expect(doneCount()).toBe('1')

    await user.click(write)
    expect(doneCount()).toBe('2')

    await user.click(read)
    expect(read).not.toBeChecked()
    expect(write).toBeChecked()
    expect(doneCount()).toBe('1')
  })

  it('toggles only the todo that was clicked, even when two todos have the same text', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, 'Same')
    await addTodo(user, 'Same')
    const [first, second] = screen.getAllByRole('checkbox', { name: 'Same' })

    await user.click(second)

    expect(second).toBeChecked()
    expect(first).not.toBeChecked()
    expect(doneCount()).toBe('1')
  })

  it('keeps the two slices independent: todo actions do not touch the count and the other way round', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Increment' }))
    await user.click(screen.getByRole('button', { name: 'Increment' }))
    await addTodo(user, 'First')
    await user.click(screen.getByRole('checkbox', { name: 'First' }))

    expect(count()).toBe('2')
    expect(todoItems()).toHaveLength(1)
    expect(doneCount()).toBe('1')

    await user.click(screen.getByRole('button', { name: 'Decrement' }))
    expect(count()).toBe('1')
    expect(todoItems()).toHaveLength(1)
    expect(screen.getByRole('checkbox', { name: 'First' })).toBeChecked()
  })

  it('incrementing the counter re-renders the counter value and nothing in the todo area', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, 'Existing todo')
    const before = allRenders()

    await user.click(screen.getByRole('button', { name: 'Increment' }))
    await user.click(screen.getByRole('button', { name: 'Increment' }))
    await user.click(screen.getByRole('button', { name: 'Increment' }))

    const after = allRenders()
    expect(count()).toBe('3')
    expect(after['counter-value']).toBeGreaterThan(before['counter-value'])
    expect(after['todo-list']).toBe(before['todo-list'])
    expect(after['todo-stats']).toBe(before['todo-stats'])
    expect(after['todo-form']).toBe(before['todo-form'])
  })

  it('adding or toggling a todo re-renders the todo list and nothing in the counter area', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Increment' }))
    const before = allRenders()

    await addTodo(user, 'Plan the day')
    await user.click(screen.getByRole('checkbox', { name: 'Plan the day' }))

    const after = allRenders()
    expect(after['todo-list']).toBeGreaterThan(before['todo-list'])
    expect(after['counter-value']).toBe(before['counter-value'])
    expect(after['counter-buttons']).toBe(before['counter-buttons'])
  })

  it('a component that only dispatches (the counter buttons) never re-renders because of the store', async () => {
    const user = userEvent.setup()
    render(<App />)
    const before = renders('counter-buttons')

    await user.click(screen.getByRole('button', { name: 'Increment' }))
    await user.click(screen.getByRole('button', { name: 'Decrement' }))
    await user.click(screen.getByRole('button', { name: 'Increment' }))
    await addTodo(user, 'Anything')
    await user.click(screen.getByRole('checkbox', { name: 'Anything' }))

    expect(count()).toBe('1')
    expect(renders('counter-buttons')).toBe(before)
  })

  it('re-renders the Completed counter only when the number of completed todos changes', async () => {
    const user = userEvent.setup()
    render(<App />)
    const start = renders('todo-stats')

    // New, unfinished todos: the store changes, but "completed" is still 0.
    await addTodo(user, 'One')
    await addTodo(user, 'Two')
    expect(todoItems()).toHaveLength(2)
    expect(doneCount()).toBe('0')
    expect(renders('todo-stats')).toBe(start)

    // Completing a todo changes the number, so now it re-renders.
    await user.click(screen.getByRole('checkbox', { name: 'One' }))
    expect(doneCount()).toBe('1')
    expect(renders('todo-stats')).toBe(start + 1)

    // Adding another unfinished todo changes nothing it selected.
    await addTodo(user, 'Three')
    expect(renders('todo-stats')).toBe(start + 1)
  })

  it('keeps its store when App itself renders again (the store is created once per mount)', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Increment' }))
    await addTodo(user, 'Still here')

    rerender(<App />)

    expect(count()).toBe('1')
    expect(todoItems()).toHaveLength(1)
    expect(screen.getByRole('checkbox', { name: 'Still here' })).toBeInTheDocument()
  })

  it('creates a new, empty store each time the App mounts', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Increment' }))
    await addTodo(user, 'Left over?')
    expect(count()).toBe('1')
    first.unmount()

    render(<App />)

    expect(count()).toBe('0')
    expect(todoItems()).toHaveLength(0)
  })
})
