import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

// Some tests type a lot. Give slow machines more than the default 5 seconds.
vi.setConfig({ testTimeout: 15000 })

const KEY = 'todos'

const seed = (todos) => localStorage.setItem(KEY, JSON.stringify(todos))
// The saved list as an array (an empty array when nothing is saved yet).
const stored = () => JSON.parse(localStorage.getItem(KEY) ?? '[]')

// Buy milk (active), Walk dog (completed), Read book (active)
const threeTodos = () => [
  { id: 1, text: 'Buy milk', completed: false },
  { id: 2, text: 'Walk dog', completed: true },
  { id: 3, text: 'Read book', completed: false },
]

const items = () => screen.queryAllByRole('listitem')
const todoCheckbox = (text) => screen.getByRole('checkbox', { name: `Complete ${text}` })
const toggleAllBox = () => screen.getByRole('checkbox', { name: 'Toggle all todos' })
const filterButton = (name) => screen.getByRole('button', { name })
const newTodoInput = () => screen.getByRole('textbox', { name: 'New todo' })

function setup() {
  const user = userEvent.setup()
  render(<App />)
  return user
}

async function addTodo(user, text) {
  await user.type(newTodoInput(), `${text}{Enter}`)
}

async function startEditing(user, text) {
  await user.dblClick(screen.getByText(text))
  return screen.getByRole('textbox', { name: 'Edit todo' })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('11 Todo advanced: adding todos', () => {
  it('adds a todo when you press Enter and clears the input', async () => {
    const user = setup()
    await user.type(newTodoInput(), 'Buy milk{Enter}')
    expect(items()).toHaveLength(1)
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(todoCheckbox('Buy milk')).not.toBeChecked()
    expect(newTodoInput()).toHaveValue('')
  })

  it('adds a todo with the Add button, and new todos go to the end', async () => {
    const user = setup()
    await user.type(newTodoInput(), 'Buy milk')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await addTodo(user, 'Walk dog')
    expect(items()).toHaveLength(2)
    expect(items()[0]).toHaveTextContent('Buy milk')
    expect(items()[1]).toHaveTextContent('Walk dog')
  })

  it('trims the text and ignores empty or whitespace-only input', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.type(newTodoInput(), '   {Enter}')
    expect(items()).toHaveLength(0)

    await user.type(newTodoInput(), '  Trim me  {Enter}')
    expect(items()).toHaveLength(1)
    expect(screen.getByText('Trim me')).toBeInTheDocument()
    expect(stored()[0].text).toBe('Trim me')
  })
})

describe('11 Todo advanced: list, counter and footer', () => {
  it('shows the saved todos with their completed state', () => {
    seed(threeTodos())
    setup()
    expect(items()).toHaveLength(3)
    expect(todoCheckbox('Buy milk')).not.toBeChecked()
    expect(todoCheckbox('Walk dog')).toBeChecked()
    expect(todoCheckbox('Read book')).not.toBeChecked()
  })

  it('hides toggle-all, counter and filters while the list is empty', async () => {
    const user = setup()
    expect(screen.queryByRole('checkbox', { name: 'Toggle all todos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument()
    expect(screen.queryByText(/items? left/)).not.toBeInTheDocument()

    await addTodo(user, 'Buy milk')
    expect(toggleAllBox()).toBeInTheDocument()
    expect(filterButton('All')).toBeInTheDocument()
    expect(screen.getByText('1 item left')).toBeInTheDocument()
  })

  it('writes "item" for one and "items" for any other number', async () => {
    seed(threeTodos())
    const user = setup()
    expect(screen.getByText('2 items left')).toBeInTheDocument()

    await user.click(todoCheckbox('Buy milk'))
    expect(screen.getByText('1 item left')).toBeInTheDocument()

    await user.click(todoCheckbox('Read book'))
    expect(screen.getByText('0 items left')).toBeInTheDocument()
  })

  it('deletes just the todo whose Delete button you click', async () => {
    seed(threeTodos())
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Delete Read book' }))
    expect(items()).toHaveLength(2)
    expect(screen.queryByText('Read book')).not.toBeInTheDocument()
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(stored().map((t) => t.text)).toEqual(['Buy milk', 'Walk dog'])
  })

  it('uses the todo id as the key: the other <li> elements stay the same when one todo is deleted', async () => {
    seed(threeTodos())
    const user = setup()
    const [, walkDogItem, readBookItem] = items()
    await user.click(screen.getByRole('button', { name: 'Delete Buy milk' }))
    // With an array index as the key, React would reuse the first <li> for "Walk dog".
    expect(items()).toHaveLength(2)
    expect(items()[0]).toBe(walkDogItem)
    expect(items()[1]).toBe(readBookItem)
  })
})

describe('11 Todo advanced: filters', () => {
  it('starts on All and marks the selected filter with aria-pressed', async () => {
    seed(threeTodos())
    const user = setup()
    expect(filterButton('All')).toHaveAttribute('aria-pressed', 'true')
    expect(filterButton('Active')).toHaveAttribute('aria-pressed', 'false')
    expect(filterButton('Completed')).toHaveAttribute('aria-pressed', 'false')

    await user.click(filterButton('Completed'))
    expect(filterButton('All')).toHaveAttribute('aria-pressed', 'false')
    expect(filterButton('Active')).toHaveAttribute('aria-pressed', 'false')
    expect(filterButton('Completed')).toHaveAttribute('aria-pressed', 'true')
  })

  it('Active shows unfinished todos, Completed shows finished ones, All shows everything', async () => {
    seed(threeTodos())
    const user = setup()

    await user.click(filterButton('Active'))
    expect(items()).toHaveLength(2)
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.getByText('Read book')).toBeInTheDocument()
    expect(screen.queryByText('Walk dog')).not.toBeInTheDocument()

    await user.click(filterButton('Completed'))
    expect(items()).toHaveLength(1)
    expect(screen.getByText('Walk dog')).toBeInTheDocument()

    await user.click(filterButton('All'))
    expect(items()).toHaveLength(3)
  })

  it('counts the active todos of the whole list, not only the visible ones', async () => {
    seed(threeTodos())
    const user = setup()
    await user.click(filterButton('Completed'))
    expect(items()).toHaveLength(1)
    expect(screen.getByText('2 items left')).toBeInTheDocument()
  })

  it('a todo leaves the Active view as soon as you complete it', async () => {
    seed(threeTodos())
    const user = setup()
    await user.click(filterButton('Active'))
    await user.click(todoCheckbox('Buy milk'))
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
    expect(items()).toHaveLength(1)
    expect(screen.getByText('1 item left')).toBeInTheDocument()
  })
})

describe('11 Todo advanced: acting on a todo while a filter is on', () => {
  // With the Active filter on, "Read book" is the 2nd visible todo but the 3rd in the full list.
  // A solution that confuses the two positions changes the wrong todo.
  it('completes the right todo and still saves the whole list', async () => {
    seed(threeTodos())
    const user = setup()
    await user.click(filterButton('Active'))
    await user.click(todoCheckbox('Read book'))

    expect(items()).toHaveLength(1)
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(stored()).toEqual([
      expect.objectContaining({ text: 'Buy milk', completed: false }),
      expect.objectContaining({ text: 'Walk dog', completed: true }),
      expect.objectContaining({ text: 'Read book', completed: true }),
    ])
  })

  it('deletes the right todo and still saves the whole list', async () => {
    seed(threeTodos())
    const user = setup()
    await user.click(filterButton('Active'))
    await user.click(screen.getByRole('button', { name: 'Delete Read book' }))

    expect(items()).toHaveLength(1)
    expect(stored().map((t) => t.text)).toEqual(['Buy milk', 'Walk dog'])

    await user.click(filterButton('All'))
    expect(items()).toHaveLength(2)
    expect(todoCheckbox('Walk dog')).toBeChecked()
  })

  it('edits the right todo and still saves the whole list', async () => {
    seed(threeTodos())
    const user = setup()
    await user.click(filterButton('Active'))
    const input = await startEditing(user, 'Read book')
    await user.clear(input)
    await user.type(input, 'Read two books{Enter}')

    expect(screen.getByText('Read two books')).toBeInTheDocument()
    expect(stored().map((t) => t.text)).toEqual(['Buy milk', 'Walk dog', 'Read two books'])
    expect(stored().map((t) => t.completed)).toEqual([false, true, false])
  })
})

describe('11 Todo advanced: completing todos', () => {
  it('toggling a checkbox completes and un-completes a todo, and saves it', async () => {
    seed(threeTodos())
    const user = setup()
    await user.click(todoCheckbox('Buy milk'))
    expect(todoCheckbox('Buy milk')).toBeChecked()
    expect(stored().find((t) => t.text === 'Buy milk').completed).toBe(true)

    await user.click(todoCheckbox('Buy milk'))
    expect(todoCheckbox('Buy milk')).not.toBeChecked()
    expect(stored().find((t) => t.text === 'Buy milk').completed).toBe(false)
  })

  it('toggle-all completes every todo, and a second click makes them all active again', async () => {
    seed(threeTodos())
    const user = setup()
    expect(toggleAllBox()).not.toBeChecked()

    await user.click(toggleAllBox())
    expect(todoCheckbox('Buy milk')).toBeChecked()
    expect(todoCheckbox('Walk dog')).toBeChecked()
    expect(todoCheckbox('Read book')).toBeChecked()
    expect(toggleAllBox()).toBeChecked()
    expect(screen.getByText('0 items left')).toBeInTheDocument()

    await user.click(toggleAllBox())
    expect(todoCheckbox('Buy milk')).not.toBeChecked()
    expect(todoCheckbox('Walk dog')).not.toBeChecked()
    expect(todoCheckbox('Read book')).not.toBeChecked()
    expect(toggleAllBox()).not.toBeChecked()
    expect(screen.getByText('3 items left')).toBeInTheDocument()
  })

  it('toggle-all is checked only while every todo is completed', async () => {
    seed(threeTodos().map((t) => ({ ...t, completed: true })))
    const user = setup()
    expect(toggleAllBox()).toBeChecked()

    await user.click(todoCheckbox('Buy milk'))
    expect(toggleAllBox()).not.toBeChecked()

    await user.click(todoCheckbox('Buy milk'))
    expect(toggleAllBox()).toBeChecked()
  })

  it('toggle-all also changes the todos that the current filter hides', async () => {
    seed(threeTodos())
    const user = setup()
    await user.click(filterButton('Completed'))
    expect(items()).toHaveLength(1)
    // The only visible todo is completed, but the full list is not, so the box is unchecked.
    expect(toggleAllBox()).not.toBeChecked()

    await user.click(toggleAllBox())
    expect(items()).toHaveLength(3)
    expect(stored().every((t) => t.completed)).toBe(true)

    await user.click(filterButton('Active'))
    expect(items()).toHaveLength(0)
  })
})

describe('11 Todo advanced: Clear completed', () => {
  it('shows Clear completed only while at least one todo is completed', async () => {
    seed([
      { id: 1, text: 'Buy milk', completed: false },
      { id: 2, text: 'Read book', completed: false },
    ])
    const user = setup()
    expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument()

    await user.click(todoCheckbox('Buy milk'))
    expect(screen.getByRole('button', { name: 'Clear completed' })).toBeInTheDocument()

    await user.click(todoCheckbox('Buy milk'))
    expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument()
  })

  it('removes every completed todo and then hides itself', async () => {
    seed(threeTodos())
    const user = setup()
    await user.click(todoCheckbox('Read book'))
    await user.click(screen.getByRole('button', { name: 'Clear completed' }))

    expect(items()).toHaveLength(1)
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.queryByText('Walk dog')).not.toBeInTheDocument()
    expect(screen.queryByText('Read book')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument()
    expect(screen.getByText('1 item left')).toBeInTheDocument()
    expect(stored().map((t) => t.text)).toEqual(['Buy milk'])
  })

  it('still clears completed todos that the Active filter is hiding', async () => {
    seed(threeTodos())
    const user = setup()
    await user.click(filterButton('Active'))
    expect(screen.queryByText('Walk dog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear completed' }))
    expect(stored().map((t) => t.text)).toEqual(['Buy milk', 'Read book'])
    expect(items()).toHaveLength(2)
  })
})

describe('11 Todo advanced: inline editing', () => {
  it('double-clicking the text shows a focused input that holds the current text', async () => {
    seed(threeTodos())
    const user = setup()
    const input = await startEditing(user, 'Buy milk')
    expect(input).toHaveValue('Buy milk')
    expect(input).toHaveFocus()
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
    expect(screen.getAllByRole('textbox', { name: 'Edit todo' })).toHaveLength(1)
  })

  it('a single click does not start editing', async () => {
    seed(threeTodos())
    const user = setup()
    await user.click(screen.getByText('Buy milk'))
    expect(screen.queryByRole('textbox', { name: 'Edit todo' })).not.toBeInTheDocument()
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
  })

  it('Enter saves the new text (trimmed) and leaves edit mode', async () => {
    seed(threeTodos())
    const user = setup()
    const input = await startEditing(user, 'Buy milk')
    await user.clear(input)
    await user.type(input, '  Buy oat milk  {Enter}')

    expect(screen.queryByRole('textbox', { name: 'Edit todo' })).not.toBeInTheDocument()
    expect(screen.getByText('Buy oat milk')).toBeInTheDocument()
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
    expect(stored().find((t) => t.id === 1).text).toBe('Buy oat milk')
  })

  it('editing keeps the position and the completed state of the todo', async () => {
    seed(threeTodos())
    const user = setup()
    const input = await startEditing(user, 'Walk dog')
    await user.clear(input)
    await user.type(input, 'Walk the dog{Enter}')

    expect(items()).toHaveLength(3)
    expect(items()[1]).toHaveTextContent('Walk the dog')
    expect(todoCheckbox('Walk the dog')).toBeChecked()
    expect(stored().map((t) => t.text)).toEqual(['Buy milk', 'Walk the dog', 'Read book'])
  })

  it('Escape throws the change away', async () => {
    seed(threeTodos())
    const user = setup()
    const input = await startEditing(user, 'Buy milk')
    await user.clear(input)
    await user.type(input, 'Something else')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('textbox', { name: 'Edit todo' })).not.toBeInTheDocument()
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.queryByText('Something else')).not.toBeInTheDocument()
    expect(stored().find((t) => t.id === 1).text).toBe('Buy milk')
  })

  it('a blur that arrives right after Escape does not save the discarded text', async () => {
    seed(threeTodos())
    const user = setup()
    const input = await startEditing(user, 'Buy milk')
    await user.clear(input)
    await user.type(input, 'Discarded')

    // A browser can fire "blur" while it removes the focused input after Escape.
    // jsdom does not, so we send Escape and that late blur inside one batch.
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' })
      fireEvent.blur(input)
    })

    expect(screen.queryByRole('textbox', { name: 'Edit todo' })).not.toBeInTheDocument()
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(stored().find((t) => t.id === 1).text).toBe('Buy milk')
  })

  it('starting a new edit after a cancelled one shows the saved text again', async () => {
    seed(threeTodos())
    const user = setup()
    const first = await startEditing(user, 'Buy milk')
    await user.type(first, ' and eggs')
    await user.keyboard('{Escape}')

    const second = await startEditing(user, 'Buy milk')
    expect(second).toHaveValue('Buy milk')
  })

  it.each([
    ['nothing', ''],
    ['only spaces', '   '],
  ])('Enter with %s in the input deletes the todo', async (_label, replacement) => {
    seed(threeTodos())
    const user = setup()
    const input = await startEditing(user, 'Buy milk')
    await user.clear(input)
    if (replacement) await user.type(input, replacement)
    await user.keyboard('{Enter}')

    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
    expect(items()).toHaveLength(2)
    expect(stored().map((t) => t.text)).toEqual(['Walk dog', 'Read book'])
  })

  it('moving focus away (blur) saves the edit', async () => {
    seed(threeTodos())
    const user = setup()
    const input = await startEditing(user, 'Buy milk')
    await user.clear(input)
    await user.type(input, 'Buy bread')
    await user.tab()

    expect(screen.queryByRole('textbox', { name: 'Edit todo' })).not.toBeInTheDocument()
    expect(screen.getByText('Buy bread')).toBeInTheDocument()
    expect(stored().find((t) => t.id === 1).text).toBe('Buy bread')
  })

  it('blur with an empty input deletes the todo', async () => {
    seed(threeTodos())
    const user = setup()
    const input = await startEditing(user, 'Read book')
    await user.clear(input)
    await user.tab()

    expect(screen.queryByText('Read book')).not.toBeInTheDocument()
    expect(items()).toHaveLength(2)
    expect(stored().map((t) => t.text)).toEqual(['Buy milk', 'Walk dog'])
  })
})

describe('11 Todo advanced: localStorage', () => {
  it('saves the list under the "todos" key after every kind of change', async () => {
    const user = setup()
    await addTodo(user, 'Buy milk')
    await addTodo(user, 'Walk dog')
    expect(stored()).toEqual([
      expect.objectContaining({ text: 'Buy milk', completed: false }),
      expect.objectContaining({ text: 'Walk dog', completed: false }),
    ])

    await user.click(todoCheckbox('Walk dog'))
    expect(stored()[1]).toEqual(expect.objectContaining({ text: 'Walk dog', completed: true }))

    const input = await startEditing(user, 'Buy milk')
    await user.clear(input)
    await user.type(input, 'Buy tea{Enter}')
    expect(stored()[0]).toEqual(expect.objectContaining({ text: 'Buy tea' }))

    await user.click(screen.getByRole('button', { name: 'Delete Buy tea' }))
    expect(stored()).toEqual([expect.objectContaining({ text: 'Walk dog', completed: true })])
  })

  it('saves each todo with exactly the properties id, text and completed', async () => {
    const user = setup()
    await addTodo(user, 'Buy milk')
    await addTodo(user, 'Walk dog')
    await user.click(todoCheckbox('Buy milk'))
    expect(stored()).toHaveLength(2)
    for (const todo of stored()) {
      expect(Object.keys(todo).sort()).toEqual(['completed', 'id', 'text'])
    }
  })

  it('gives every saved todo an id that is different from the others', async () => {
    const user = setup()
    await addTodo(user, 'One')
    await addTodo(user, 'Two')
    await addTodo(user, 'Three')
    const ids = stored().map((t) => t.id)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
  })

  it('keeps ids different after a delete, so the new todo never shares an id with an old one', async () => {
    seed(threeTodos())
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Delete Walk dog' }))
    await addTodo(user, 'Fourth')
    expect(new Set(stored().map((t) => t.id)).size).toBe(3)

    // Acting on the new todo must not touch the old ones.
    await user.click(todoCheckbox('Fourth'))
    expect(stored().map((t) => t.completed)).toEqual([false, false, true])
    await user.click(screen.getByRole('button', { name: 'Delete Fourth' }))
    expect(stored().map((t) => t.text)).toEqual(['Buy milk', 'Read book'])
  })

  it('restores the list, including completed state, when the app is mounted again', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    await addTodo(user, 'Buy milk')
    await addTodo(user, 'Walk dog')
    await user.click(todoCheckbox('Walk dog'))
    first.unmount()

    render(<App />)
    expect(items()).toHaveLength(2)
    expect(todoCheckbox('Buy milk')).not.toBeChecked()
    expect(todoCheckbox('Walk dog')).toBeChecked()
    expect(screen.getByText('1 item left')).toBeInTheDocument()
  })

  it('already has the saved todos in the very first render, before any effect runs', () => {
    seed(threeTodos())
    // renderToString renders once and runs no effects, so a list that is loaded
    // later inside useEffect would be missing here (and flash empty in the browser).
    const html = renderToString(<App />)
    expect(html).toContain('Buy milk')
    expect(html).toContain('Walk dog')
    expect(html).toContain('Read book')
  })

  it('reads localStorage only once, when the component first mounts', async () => {
    seed(threeTodos())
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const user = setup()
    await addTodo(user, 'Fourth')
    await user.click(todoCheckbox('Buy milk'))
    await user.click(filterButton('Active'))

    const reads = getItem.mock.calls.filter(([key]) => key === KEY)
    expect(reads).toHaveLength(1)
  })

  it.each([
    ['broken JSON', '{not json'],
    ['an object instead of a list', '{"a":1}'],
    ['the text null', 'null'],
    ['a plain string', '"hello"'],
  ])('starts with an empty list when storage holds %s', async (_label, raw) => {
    localStorage.setItem(KEY, raw)
    const user = setup()
    expect(items()).toHaveLength(0)

    await addTodo(user, 'Fresh start')
    expect(items()).toHaveLength(1)
    expect(stored()).toEqual([expect.objectContaining({ text: 'Fresh start', completed: false })])
  })
})

describe('11 Todo advanced: StrictMode', () => {
  // StrictMode (used by the playground) runs every state updater function twice.
  // An updater that changes the old todo or array in place gives the wrong result.
  it('behaves correctly when every state updater runs twice', async () => {
    const user = userEvent.setup()
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    await addTodo(user, 'Buy milk')
    await addTodo(user, 'Walk dog')
    await addTodo(user, 'Read book')
    expect(items()).toHaveLength(3)

    await user.click(todoCheckbox('Buy milk'))
    expect(todoCheckbox('Buy milk')).toBeChecked()
    expect(screen.getByText('2 items left')).toBeInTheDocument()

    const input = await startEditing(user, 'Walk dog')
    await user.clear(input)
    await user.type(input, 'Walk the dog{Enter}')
    expect(screen.getByText('Walk the dog')).toBeInTheDocument()

    await user.click(toggleAllBox())
    expect(stored().map((t) => t.completed)).toEqual([true, true, true])
    await user.click(toggleAllBox())
    expect(stored().map((t) => t.completed)).toEqual([false, false, false])

    await user.click(todoCheckbox('Read book'))
    await user.click(screen.getByRole('button', { name: 'Clear completed' }))
    expect(stored().map((t) => t.text)).toEqual(['Buy milk', 'Walk the dog'])

    await user.click(screen.getByRole('button', { name: 'Delete Buy milk' }))
    expect(stored().map((t) => t.text)).toEqual(['Walk the dog'])
    expect(items()).toHaveLength(1)
  })
})
