import { StrictMode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

// The playground runs your app inside <StrictMode>, so these tests do too.
// In development StrictMode calls state updater functions twice. That exposes
// updates which change the old state in place instead of returning new state.
function setup() {
  const user = userEvent.setup()
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  return user
}

// Small helpers so each test reads like a user story.
const newTodoInput = () => screen.getByRole('textbox', { name: 'New todo' })
const addButton = () => screen.getByRole('button', { name: 'Add' })
const allItems = () => screen.queryAllByRole('listitem')
const itemFor = (text) => screen.getByText(text).closest('li')
const checkboxFor = (text) => screen.getByRole('checkbox', { name: text })
const deleteButtonFor = (text) =>
  within(itemFor(text)).getByRole('button', { name: /delete/i })

async function addTodo(user, text) {
  await user.type(newTodoInput(), text)
  await user.click(addButton())
}

// "1 item left" and "1 items left" are both accepted. Every other count must
// be written as "N items left".
function expectItemsLeft(n) {
  const pattern = n === 1 ? /^1 items? left$/ : new RegExp(`^${n} items left$`)
  expect(screen.getByTestId('items-left')).toHaveTextContent(pattern)
}

describe('03 Todo list (basic)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with an empty list and "0 items left"', () => {
    setup()
    expect(newTodoInput()).toHaveValue('')
    expect(addButton()).toBeInTheDocument()
    expect(allItems()).toHaveLength(0)
    expectItemsLeft(0)
  })

  it('stops the browser from reloading the page when the form is submitted', () => {
    setup()
    const form = newTodoInput().closest('form')
    expect(form).not.toBeNull()

    // fireEvent returns false when a handler called event.preventDefault().
    // The input is empty here, so this also checks that you call
    // preventDefault before the "ignore blank text" check.
    expect(fireEvent.submit(form)).toBe(false)
  })

  it('adds a todo when the Add button is clicked', async () => {
    const user = setup()
    await addTodo(user, 'Buy milk')

    expect(allItems()).toHaveLength(1)
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(checkboxFor('Buy milk')).not.toBeChecked()
    expectItemsLeft(1)
  })

  it('adds a todo when Enter is pressed in the input', async () => {
    const user = setup()
    await user.type(newTodoInput(), 'Walk the dog{Enter}')

    expect(allItems()).toHaveLength(1)
    expect(screen.getByText('Walk the dog')).toBeInTheDocument()
    expect(newTodoInput()).toHaveValue('')
  })

  it('clears the input after a todo is added', async () => {
    const user = setup()
    await user.type(newTodoInput(), 'Buy milk')
    expect(newTodoInput()).toHaveValue('Buy milk')

    await user.click(addButton())
    expect(newTodoInput()).toHaveValue('')
  })

  it('shows the todos in the order they were added', async () => {
    const user = setup()
    // Not in alphabetical order on purpose: the list must follow the order of
    // adding, not sort itself.
    await addTodo(user, 'Walk the dog')
    await addTodo(user, 'Buy milk')
    await addTodo(user, 'Call mom')

    const items = allItems()
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Walk the dog')
    expect(items[1]).toHaveTextContent('Buy milk')
    expect(items[2]).toHaveTextContent('Call mom')
    expectItemsLeft(3)
  })

  it('removes spaces from the start and end of the text', async () => {
    const user = setup()
    await addTodo(user, '   Buy milk   ')

    // textContent is not normalised, so this fails if the typed spaces were
    // kept. (One layout space next to the checkbox is fine.)
    expect(screen.getByText('Buy milk').textContent).toMatch(/^\s?Buy milk\s?$/)
  })

  it('ignores empty text', async () => {
    const user = setup()
    await addTodo(user, 'Real todo')

    await user.click(addButton()) // the input is empty here
    await user.type(newTodoInput(), '{Enter}') // Enter on an empty input

    expect(allItems()).toHaveLength(1)
    expectItemsLeft(1)
  })

  it('ignores text that has only spaces', async () => {
    const user = setup()
    await addTodo(user, 'Real todo')

    await user.type(newTodoInput(), '     ')
    await user.click(addButton())
    await user.type(newTodoInput(), '{Enter}')

    expect(allItems()).toHaveLength(1)
    expectItemsLeft(1)
  })

  it('puts the todos in a <ul>, one <li> per todo', async () => {
    const user = setup()
    await addTodo(user, 'Buy milk')
    await addTodo(user, 'Walk the dog')

    const list = screen.getByRole('list')
    expect(list.tagName).toBe('UL')
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
  })

  it('marks a todo as done and back again with its checkbox', async () => {
    const user = setup()
    await addTodo(user, 'Buy milk')
    expect(screen.getByText('Buy milk')).not.toHaveClass('done')

    await user.click(checkboxFor('Buy milk'))
    expect(checkboxFor('Buy milk')).toBeChecked()
    expect(screen.getByText('Buy milk')).toHaveClass('done')

    await user.click(checkboxFor('Buy milk'))
    expect(checkboxFor('Buy milk')).not.toBeChecked()
    expect(screen.getByText('Buy milk')).not.toHaveClass('done')
  })

  it('changes only the todo whose checkbox was clicked', async () => {
    const user = setup()
    await addTodo(user, 'A')
    await addTodo(user, 'B')
    await addTodo(user, 'C')

    await user.click(checkboxFor('B'))

    expect(checkboxFor('A')).not.toBeChecked()
    expect(checkboxFor('B')).toBeChecked()
    expect(checkboxFor('C')).not.toBeChecked()
    expect(screen.getByText('A')).not.toHaveClass('done')
    expect(screen.getByText('B')).toHaveClass('done')
    expect(screen.getByText('C')).not.toHaveClass('done')
  })

  it('keeps every todo in its place when a checkbox is ticked or unticked', async () => {
    const user = setup()
    await addTodo(user, 'Walk the dog')
    await addTodo(user, 'Buy milk')
    await addTodo(user, 'Call mom')

    const expectOrder = () => {
      const items = allItems()
      expect(items).toHaveLength(3)
      expect(items[0]).toHaveTextContent('Walk the dog')
      expect(items[1]).toHaveTextContent('Buy milk')
      expect(items[2]).toHaveTextContent('Call mom')
    }

    await user.click(checkboxFor('Buy milk'))
    expectOrder()
    await user.click(checkboxFor('Walk the dog'))
    expectOrder()
    await user.click(checkboxFor('Buy milk')) // untick
    expectOrder()
  })

  it('counts only the todos that are not done', async () => {
    const user = setup()
    await addTodo(user, 'One')
    await addTodo(user, 'Two')
    await addTodo(user, 'Three')
    expectItemsLeft(3)

    await user.click(checkboxFor('One'))
    expectItemsLeft(2)
    await user.click(checkboxFor('Two'))
    expectItemsLeft(1)
    await user.click(checkboxFor('Three'))
    expectItemsLeft(0)

    await user.click(checkboxFor('One')) // back to not done
    expectItemsLeft(1)
  })

  it('deletes only the todo whose Delete button was clicked', async () => {
    const user = setup()
    await addTodo(user, 'A')
    await addTodo(user, 'B')
    await addTodo(user, 'C')

    await user.click(deleteButtonFor('B'))

    expect(screen.queryByText('B')).not.toBeInTheDocument()
    const items = allItems()
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('A')
    expect(items[1]).toHaveTextContent('C')
    expectItemsLeft(2)
  })

  it('updates "items left" correctly when a done or a not-done todo is deleted', async () => {
    const user = setup()
    await addTodo(user, 'A')
    await addTodo(user, 'B')
    await user.click(checkboxFor('A'))
    expectItemsLeft(1)

    await user.click(deleteButtonFor('A')) // A was done: the count stays the same
    expect(allItems()).toHaveLength(1)
    expectItemsLeft(1)

    await user.click(deleteButtonFor('B')) // B was not done: the count goes down
    expect(allItems()).toHaveLength(0)
    expectItemsLeft(0)
  })

  it('keeps the done state with the right todo after another todo is deleted', async () => {
    const user = setup()
    await addTodo(user, 'A')
    await addTodo(user, 'B')
    await addTodo(user, 'C')
    await user.click(checkboxFor('B'))

    await user.click(deleteButtonFor('A'))

    expect(checkboxFor('B')).toBeChecked()
    expect(screen.getByText('B')).toHaveClass('done')
    expect(checkboxFor('C')).not.toBeChecked()
    expect(screen.getByText('C')).not.toHaveClass('done')
    expectItemsLeft(1)
  })

  it('treats two todos with the same text as two separate todos', async () => {
    // React logs a console error when two siblings share a key.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = setup()
    await addTodo(user, 'Milk')
    await addTodo(user, 'Milk')

    const boxes = screen.getAllByRole('checkbox', { name: 'Milk' })
    expect(boxes).toHaveLength(2)

    await user.click(boxes[0])
    expect(screen.getAllByRole('checkbox', { name: 'Milk' })[0]).toBeChecked()
    expect(screen.getAllByRole('checkbox', { name: 'Milk' })[1]).not.toBeChecked()
    expectItemsLeft(1)

    await user.click(screen.getAllByRole('button', { name: /delete/i })[0])
    expect(allItems()).toHaveLength(1)
    expect(screen.getByRole('checkbox', { name: 'Milk' })).not.toBeChecked()
    expectItemsLeft(1)

    const keyWarnings = errorSpy.mock.calls.filter((args) => String(args[0]).includes('key'))
    expect(keyWarnings).toHaveLength(0)
  })

  it('gives a new todo its own id even after another todo was deleted', async () => {
    // An id made from the length of the list gives "D" the same id as "C" here.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = setup()
    await addTodo(user, 'A')
    await addTodo(user, 'B')
    await addTodo(user, 'C')
    await user.click(checkboxFor('A'))
    await user.click(deleteButtonFor('B'))
    await addTodo(user, 'D')

    // Adding keeps the done state of the others, and the new todo is not done.
    expect(allItems()).toHaveLength(3)
    expect(checkboxFor('A')).toBeChecked()
    expect(checkboxFor('C')).not.toBeChecked()
    expect(checkboxFor('D')).not.toBeChecked()
    expectItemsLeft(2)

    // Ticking D must not tick C.
    await user.click(checkboxFor('D'))
    expect(checkboxFor('C')).not.toBeChecked()
    expect(checkboxFor('D')).toBeChecked()
    expectItemsLeft(1)

    // Deleting C must not delete D.
    await user.click(deleteButtonFor('C'))
    const items = allItems()
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('A')
    expect(items[1]).toHaveTextContent('D')
    expectItemsLeft(0)

    const keyWarnings = errorSpy.mock.calls.filter((args) => String(args[0]).includes('key'))
    expect(keyWarnings).toHaveLength(0)
  })

  it('gives every todo a stable key, so deleting one keeps the DOM of the others', async () => {
    const user = setup()
    await addTodo(user, 'A')
    await addTodo(user, 'B')
    await addTodo(user, 'C')

    const itemB = itemFor('B')
    const itemC = itemFor('C')

    await user.click(deleteButtonFor('A'))

    // With the array index as key, React would reuse A's element for B
    // and B's element for C. With a stable id as key, these are the same nodes.
    expect(allItems()).toHaveLength(2)
    expect(itemFor('B')).toBe(itemB)
    expect(itemFor('C')).toBe(itemC)
  })
})
