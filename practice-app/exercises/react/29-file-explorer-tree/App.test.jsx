import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

// What the screen looks like at the start (root open, everything else closed):
//
//   project
//     docs            (empty folder)
//     src             (closed)
//     package.json
//     README.md
//
// What `src` contains once it is open (the order below is the SORTED order):
//
//   utils             (folder, closed, holds math.js)
//   app.js
//   Beta.js
//   main.js

function makeTree() {
  return {
    id: 'root',
    name: 'project',
    type: 'folder',
    children: [
      { id: 'f-readme', name: 'README.md', type: 'file' },
      {
        id: 'd-src',
        name: 'src',
        type: 'folder',
        children: [
          { id: 'f-main', name: 'main.js', type: 'file' },
          {
            id: 'd-utils',
            name: 'utils',
            type: 'folder',
            children: [{ id: 'f-math', name: 'math.js', type: 'file' }],
          },
          { id: 'f-app', name: 'app.js', type: 'file' },
          { id: 'f-beta', name: 'Beta.js', type: 'file' },
        ],
      },
      { id: 'd-docs', name: 'docs', type: 'folder', children: [] },
      { id: 'f-pkg', name: 'package.json', type: 'file' },
    ],
  }
}

const START = ['project', 'docs', 'src', 'package.json', 'README.md']

function setup(tree = makeTree()) {
  const user = userEvent.setup()
  render(<App initialTree={tree} />)
  return user
}

const item = (name) => screen.getByRole('treeitem', { name })
const labels = (elements) => elements.map((el) => el.getAttribute('aria-label'))
// Names of all visible tree items, in the order they appear on the page.
const visibleNames = () => labels(screen.queryAllByRole('treeitem'))
const button = (name) => screen.getByRole('button', { name })
const textbox = (name) => screen.getByRole('textbox', { name })

// Clicks an "Add ..." button, types a name and presses Enter.
async function create(user, addButtonName, inputName, text) {
  await user.click(button(addButtonName))
  await user.type(textbox(inputName), `${text}{Enter}`)
}

// React prints a console error when list items have no key (or a repeated key).
// There is no visible difference on screen, so we watch the console instead.
// The spy is called through, so you still see every message in the terminal.
let consoleError
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error')
})
afterEach(() => {
  const keyWarnings = consoleError.mock.calls.filter((args) =>
    /unique "key"|same key/.test(String(args[0])),
  )
  consoleError.mockRestore()
  expect(keyWarnings, 'React reported list items without a unique key prop').toEqual([])
})

describe('29 File explorer tree', () => {
  describe('structure and roles', () => {
    it('renders the sample data when no initialTree is given', () => {
      render(<App />)
      const tree = screen.getByRole('tree', { name: 'File explorer' })
      expect(within(tree).getByRole('treeitem', { name: 'my-app' })).toHaveAttribute(
        'aria-expanded',
        'true',
      )
    })

    it('renders a tree whose first item is the root folder', () => {
      setup()
      const tree = screen.getByRole('tree', { name: 'File explorer' })
      const root = within(tree).getAllByRole('treeitem')[0]
      expect(root).toHaveAttribute('aria-label', 'project')
      expect(root).toHaveAttribute('aria-expanded', 'true')
    })

    it('starts with only the root open', () => {
      setup()
      expect(visibleNames()).toEqual(START)
      expect(item('src')).toHaveAttribute('aria-expanded', 'false')
      expect(item('docs')).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByText('main.js')).not.toBeInTheDocument()
    })

    it('opens the root whatever its id is, and keeps the other folders closed', () => {
      setup({
        id: 'top-level',
        name: 'site',
        type: 'folder',
        children: [
          { id: 'x1', name: 'index.html', type: 'file' },
          {
            id: 'x2',
            name: 'css',
            type: 'folder',
            children: [{ id: 'x3', name: 'site.css', type: 'file' }],
          },
        ],
      })
      expect(visibleNames()).toEqual(['site', 'css', 'index.html'])
      expect(item('site')).toHaveAttribute('aria-expanded', 'true')
      expect(item('css')).toHaveAttribute('aria-expanded', 'false')
    })
    it('gives aria-expanded to folders only', () => {
      setup()
      expect(item('README.md')).not.toHaveAttribute('aria-expanded')
      expect(item('package.json')).not.toHaveAttribute('aria-expanded')
    })

    it('lists folders first, then files, each group A to Z ignoring case, at every level', async () => {
      const user = setup()
      // The data order is README.md, src, docs, package.json: the screen order differs.
      expect(visibleNames()).toEqual(START)
      await user.click(button('src'))
      expect(visibleNames()).toEqual([
        'project',
        'docs',
        'src',
        'utils',
        'app.js',
        'Beta.js',
        'main.js',
        'package.json',
        'README.md',
      ])
    })

    it('puts the children of an open folder in a group inside its treeitem', async () => {
      const user = setup()
      await user.click(button('src'))
      const group = within(item('src')).getByRole('group')
      expect(labels(within(group).getAllByRole('treeitem'))).toEqual([
        'utils',
        'app.js',
        'Beta.js',
        'main.js',
      ])
    })
  })

  describe('expand and collapse', () => {
    it('opens and closes a folder when its name is clicked', async () => {
      const user = setup()
      await user.click(button('src'))
      expect(item('src')).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText('main.js')).toBeInTheDocument()

      await user.click(button('src'))
      expect(item('src')).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByText('main.js')).not.toBeInTheDocument()
    })

    it('can close and reopen the root', async () => {
      const user = setup()
      await user.click(button('project'))
      expect(visibleNames()).toEqual(['project'])
      expect(item('project')).toHaveAttribute('aria-expanded', 'false')
      await user.click(button('project'))
      expect(visibleNames()).toEqual(START)
    })

    it('shows file names as plain text, not as buttons', () => {
      setup()
      expect(screen.getByText('README.md')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'README.md' })).not.toBeInTheDocument()
    })

    it('remembers which nested folders were open when a parent is closed and reopened', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('utils'))
      expect(screen.getByText('math.js')).toBeInTheDocument()

      await user.click(button('src')) // close the parent
      expect(screen.queryByText('math.js')).not.toBeInTheDocument()

      await user.click(button('src')) // open it again
      expect(item('utils')).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText('math.js')).toBeInTheDocument()
    })
  })

  describe('buttons', () => {
    it('gives every folder Add file and Add folder buttons, and files none', async () => {
      const user = setup()
      await user.click(button('src'))
      for (const folder of ['project', 'src', 'utils', 'docs']) {
        expect(button(`Add file to ${folder}`)).toBeInTheDocument()
        expect(button(`Add folder to ${folder}`)).toBeInTheDocument()
      }
      expect(screen.queryByRole('button', { name: 'Add file to main.js' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Add folder to README.md' })).not.toBeInTheDocument()
    })

    it('gives every node except the root Rename and Delete buttons', async () => {
      const user = setup()
      await user.click(button('src'))
      for (const name of ['docs', 'src', 'utils', 'main.js', 'README.md']) {
        expect(button(`Rename ${name}`)).toBeInTheDocument()
        expect(button(`Delete ${name}`)).toBeInTheDocument()
      }
      expect(screen.queryByRole('button', { name: 'Rename project' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Delete project' })).not.toBeInTheDocument()
    })
  })

  describe('adding files and folders', () => {
    it('shows an empty, focused input inside the folder and opens a closed folder', async () => {
      const user = setup()
      expect(item('src')).toHaveAttribute('aria-expanded', 'false')

      await user.click(button('Add file to src'))

      expect(item('src')).toHaveAttribute('aria-expanded', 'true')
      const input = within(item('src')).getByRole('textbox', { name: 'New file name' })
      expect(input).toHaveValue('')
      expect(input).toHaveFocus()
    })

    it('puts the input first inside the folder group, above the existing children', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('Add file to src'))

      const group = within(item('src')).getByRole('group')
      const input = within(group).getByRole('textbox', { name: 'New file name' })
      expect(group.firstElementChild).toContainElement(input)
    })

    it('labels the input "New folder name" when adding a folder', async () => {
      const user = setup()
      await user.click(button('Add folder to project'))
      expect(within(item('project')).getByRole('textbox', { name: 'New folder name' })).toHaveFocus()
    })

    it('Enter creates the file in that folder at its sorted position and closes the input', async () => {
      const user = setup()
      await user.click(button('Add file to src'))
      await user.type(textbox('New file name'), 'new.js{Enter}')

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(visibleNames()).toEqual([
        'project',
        'docs',
        'src',
        'utils',
        'app.js',
        'Beta.js',
        'main.js',
        'new.js',
        'package.json',
        'README.md',
      ])
      expect(within(item('src')).getByRole('treeitem', { name: 'new.js' })).not.toHaveAttribute(
        'aria-expanded',
      )
    })

    it('Enter creates a closed folder at the top of the folder list', async () => {
      const user = setup()
      await user.click(button('Add folder to project'))
      await user.type(textbox('New folder name'), 'assets{Enter}')

      expect(visibleNames()).toEqual(['project', 'assets', 'docs', 'src', 'package.json', 'README.md'])
      expect(item('assets')).toHaveAttribute('aria-expanded', 'false')
      expect(button('Add file to assets')).toBeInTheDocument()
    })

    it('a new folder can receive files of its own', async () => {
      const user = setup()
      await user.click(button('Add folder to project'))
      await user.type(textbox('New folder name'), 'assets{Enter}')

      await user.click(button('Add file to assets'))
      await user.type(textbox('New file name'), 'logo.svg{Enter}')

      expect(item('assets')).toHaveAttribute('aria-expanded', 'true')
      expect(within(item('assets')).getByRole('treeitem', { name: 'logo.svg' })).toBeInTheDocument()
    })

    it('leaves the folder open after a node was created in it', async () => {
      const user = setup()
      await user.click(button('Add file to docs'))
      await user.type(textbox('New file name'), 'guide.md{Enter}')

      expect(item('docs')).toHaveAttribute('aria-expanded', 'true')
      expect(within(item('docs')).getByRole('treeitem', { name: 'guide.md' })).toBeInTheDocument()
    })

    it('Escape closes the input and creates nothing', async () => {
      const user = setup()
      await user.click(button('Add file to src'))
      await user.type(textbox('New file name'), 'abc{Escape}')

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.queryByRole('treeitem', { name: 'abc' })).not.toBeInTheDocument()
      expect(visibleNames()).toEqual([
        'project',
        'docs',
        'src',
        'utils',
        'app.js',
        'Beta.js',
        'main.js',
        'package.json',
        'README.md',
      ])
    })

    it('shows an error and keeps the input open when the name is empty or blank', async () => {
      const user = setup()
      await user.click(button('Add file to docs'))
      await user.type(textbox('New file name'), '   {Enter}')

      expect(screen.getByRole('alert')).toHaveTextContent(/empty/i)
      expect(textbox('New file name')).toHaveValue('   ') // what the user typed is kept
      expect(within(item('docs')).queryAllByRole('treeitem')).toHaveLength(0)
    })

    it('shows no alert element while there is no error', async () => {
      const user = setup()
      await user.click(button('Add file to docs'))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      await user.type(textbox('New file name'), 'ok.txt')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('rejects a name that already exists in the same folder and keeps what was typed', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('Add file to src'))
      await user.type(textbox('New file name'), 'main.js{Enter}')

      expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i)
      expect(textbox('New file name')).toHaveValue('main.js')
      expect(screen.getAllByRole('treeitem', { name: 'main.js' })).toHaveLength(1)
    })

    it('hides the error as soon as the user edits the text, and then accepts a new name', async () => {
      const user = setup()
      await user.click(button('Add file to src'))
      await user.type(textbox('New file name'), 'main.js{Enter}')
      expect(screen.getByRole('alert')).toBeInTheDocument()

      await user.type(textbox('New file name'), '2')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()

      await user.type(textbox('New file name'), '{Enter}')
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByRole('treeitem', { name: 'main.js2' })).toBeInTheDocument()
    })

    it('treats a folder and a file with the same name as a duplicate', async () => {
      const user = setup()
      await user.click(button('Add file to src'))
      await user.type(textbox('New file name'), 'utils{Enter}') // "utils" is a folder in src
      expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i)
    })

    it('allows the same name in a different folder', async () => {
      const user = setup()
      await user.click(button('Add file to docs'))
      await user.type(textbox('New file name'), 'main.js{Enter}') // main.js lives in src, not docs
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(within(item('docs')).getByRole('treeitem', { name: 'main.js' })).toBeInTheDocument()
    })

    it('trims spaces around the name', async () => {
      const user = setup()
      await user.click(button('Add file to docs'))
      await user.type(textbox('New file name'), '  notes.txt  {Enter}')
      // visibleNames() reads the exact aria-label, so stray spaces would show up here.
      expect(visibleNames()).toContain('notes.txt')
    })

    it('compares the trimmed name, so a padded copy of an existing name is a duplicate', async () => {
      const user = setup()
      await user.click(button('Add file to src'))
      await user.type(textbox('New file name'), '  main.js  {Enter}')

      expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i)
      expect(textbox('New file name')).toHaveValue('  main.js  ')
      expect(screen.getAllByRole('treeitem', { name: 'main.js' })).toHaveLength(1)
    })

    it('compares names exactly, so readme.md may sit next to README.md', async () => {
      const user = setup()
      await create(user, 'Add file to project', 'New file name', 'readme.md')

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByRole('treeitem', { name: 'readme.md' })).toBeInTheDocument()
      expect(screen.getByRole('treeitem', { name: 'README.md' })).toBeInTheDocument()
    })

    it('starts with an empty input again after Escape and after a successful add', async () => {
      const user = setup()
      await user.click(button('Add file to docs'))
      await user.type(textbox('New file name'), 'abc{Escape}')

      await user.click(button('Add file to docs'))
      expect(textbox('New file name')).toHaveValue('')
      await user.type(textbox('New file name'), 'one.txt{Enter}')

      await user.click(button('Add file to docs'))
      expect(textbox('New file name')).toHaveValue('')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('gives every new node its own id: same-named folders in two places open independently', async () => {
      const user = setup()
      await create(user, 'Add folder to docs', 'New folder name', 'lib')
      await create(user, 'Add folder to project', 'New folder name', 'lib')
      // Document order: the "lib" inside docs comes before the "lib" in the root.
      const [inDocs, inRoot] = screen.getAllByRole('button', { name: 'lib' })
      expect(inRoot).not.toBe(inDocs)

      await user.click(inDocs)
      const states = screen
        .getAllByRole('treeitem', { name: 'lib' })
        .map((el) => el.getAttribute('aria-expanded'))
      expect(states).toEqual(['true', 'false'])
    })

    it('gives every new node its own id: an id is never reused after a delete', async () => {
      const user = setup()
      await create(user, 'Add file to docs', 'New file name', 'one.txt')
      await user.click(button('Delete package.json')) // the tree has fewer nodes now
      await create(user, 'Add file to docs', 'New file name', 'two.txt')

      await user.click(button('Delete two.txt'))
      expect(within(item('docs')).getByRole('treeitem', { name: 'one.txt' })).toBeInTheDocument()
      expect(screen.queryByRole('treeitem', { name: 'two.txt' })).not.toBeInTheDocument()
    })

    it('gives new nodes ids that do not clash with numeric ids already in the tree', async () => {
      const user = setup({
        id: '0',
        name: 'site',
        type: 'folder',
        children: [
          { id: '1', name: 'a.txt', type: 'file' },
          { id: '2', name: 'b.txt', type: 'file' },
          { id: '3', name: 'c.txt', type: 'file' },
        ],
      })
      await create(user, 'Add file to site', 'New file name', 'd.txt')
      await create(user, 'Add file to site', 'New file name', 'e.txt')

      await user.click(button('Delete d.txt'))
      expect(visibleNames()).toEqual(['site', 'a.txt', 'b.txt', 'c.txt', 'e.txt'])
      await user.click(button('Delete e.txt'))
      expect(visibleNames()).toEqual(['site', 'a.txt', 'b.txt', 'c.txt'])
    })
  })

  describe('renaming', () => {
    it('shows a focused input, prefilled with the current name, in place of the name', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('Rename Beta.js'))

      const input = within(item('Beta.js')).getByRole('textbox', { name: 'New name for Beta.js' })
      expect(input).toHaveValue('Beta.js')
      expect(input).toHaveFocus()
    })

    it('replaces the name in the row while renaming', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('Rename utils'))
      expect(textbox('New name for utils')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'utils' })).not.toBeInTheDocument()

      await user.click(button('Rename Beta.js'))
      expect(textbox('New name for Beta.js')).toBeInTheDocument()
      expect(screen.queryByText('Beta.js')).not.toBeInTheDocument()
      expect(button('utils')).toBeInTheDocument() // utils shows its name again
    })

    it('shows the current name again when a rename input is reopened after Escape', async () => {
      const user = setup()
      await user.click(button('Rename README.md'))
      await user.type(textbox('New name for README.md'), 'xyz{Escape}')

      await user.click(button('Rename README.md'))
      expect(textbox('New name for README.md')).toHaveValue('README.md')
    })

    it('Enter saves the new name and the list is sorted again', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('Rename Beta.js'))
      const input = textbox('New name for Beta.js')
      await user.clear(input)
      await user.type(input, 'zeta.js{Enter}')

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.queryByRole('treeitem', { name: 'Beta.js' })).not.toBeInTheDocument()
      expect(visibleNames()).toEqual([
        'project',
        'docs',
        'src',
        'utils',
        'app.js',
        'main.js',
        'zeta.js',
        'package.json',
        'README.md',
      ])
    })

    it('trims spaces around the new name', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('Rename Beta.js'))
      const input = textbox('New name for Beta.js')
      await user.clear(input)
      await user.type(input, '  gamma.js  {Enter}')
      // visibleNames() reads the exact aria-label, so stray spaces would show up here.
      expect(visibleNames()).toContain('gamma.js')
    })

    it('keeps the children and the open state of a renamed folder', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('utils'))
      await user.click(button('Rename utils'))
      const input = textbox('New name for utils')
      await user.clear(input)
      await user.type(input, 'lib{Enter}')

      expect(item('lib')).toHaveAttribute('aria-expanded', 'true')
      expect(within(item('lib')).getByRole('treeitem', { name: 'math.js' })).toBeInTheDocument()
      expect(button('Add file to lib')).toBeInTheDocument()
    })

    it('Escape cancels and keeps the old name', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('Rename Beta.js'))
      const input = textbox('New name for Beta.js')
      await user.clear(input)
      await user.type(input, 'other.js{Escape}')

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByRole('treeitem', { name: 'Beta.js' })).toBeInTheDocument()
      expect(screen.queryByRole('treeitem', { name: 'other.js' })).not.toBeInTheDocument()
    })

    it('rejects a name that another item in the same folder already has', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('Rename Beta.js'))
      const input = textbox('New name for Beta.js')
      await user.clear(input)
      await user.type(input, 'main.js{Enter}')

      expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i)
      expect(textbox('New name for Beta.js')).toHaveValue('main.js')

      await user.keyboard('{Escape}')
      expect(screen.getByRole('treeitem', { name: 'Beta.js' })).toBeInTheDocument()
      expect(screen.getAllByRole('treeitem', { name: 'main.js' })).toHaveLength(1)
    })

    it('treats a folder next to the item as a duplicate too', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('Rename Beta.js'))
      const input = textbox('New name for Beta.js')
      await user.clear(input)
      await user.type(input, ' utils {Enter}') // "utils" is a folder in src

      expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i)
      expect(textbox('New name for Beta.js')).toHaveValue(' utils ')
    })

    it('hides the error as soon as the user edits the text', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('Rename Beta.js'))
      const input = textbox('New name for Beta.js')
      await user.clear(input)
      await user.type(input, 'main.js{Enter}')
      expect(screen.getByRole('alert')).toBeInTheDocument()

      await user.keyboard('{Backspace}')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()

      await user.keyboard('{Enter}') // "main.j" is free
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByRole('treeitem', { name: 'main.j' })).toBeInTheDocument()
    })

    it('lets an item keep its own name', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('Rename Beta.js'))
      await user.type(textbox('New name for Beta.js'), '{Enter}')

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByRole('treeitem', { name: 'Beta.js' })).toBeInTheDocument()
    })

    it('allows a name that is used in a different folder', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('Rename Beta.js'))
      const input = textbox('New name for Beta.js')
      await user.clear(input)
      await user.type(input, 'README.md{Enter}') // README.md lives in the root, not in src

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getAllByRole('treeitem', { name: 'README.md' })).toHaveLength(2)
    })

    it('rejects an empty name', async () => {
      const user = setup()
      await user.click(button('Rename README.md'))
      await user.clear(textbox('New name for README.md'))
      await user.keyboard('{Enter}')

      expect(screen.getByRole('alert')).toHaveTextContent(/empty/i)
      expect(textbox('New name for README.md')).toBeInTheDocument()
    })
  })

  describe('deleting', () => {
    it('removes a file', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('Delete main.js'))
      expect(screen.queryByRole('treeitem', { name: 'main.js' })).not.toBeInTheDocument()
      expect(visibleNames()).toEqual([
        'project',
        'docs',
        'src',
        'utils',
        'app.js',
        'Beta.js',
        'package.json',
        'README.md',
      ])
    })

    it('removes a folder together with everything inside it', async () => {
      const user = setup()
      await user.click(button('src'))
      await user.click(button('utils'))
      expect(screen.getByText('math.js')).toBeInTheDocument()

      await user.click(button('Delete utils'))
      expect(screen.queryByRole('treeitem', { name: 'utils' })).not.toBeInTheDocument()
      expect(screen.queryByText('math.js')).not.toBeInTheDocument()

      await user.click(button('Delete src'))
      expect(visibleNames()).toEqual(['project', 'docs', 'package.json', 'README.md'])
    })

    it('closes an open input', async () => {
      const user = setup()
      await user.click(button('Add file to docs'))
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      await user.click(button('Delete README.md'))
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('one input at a time', () => {
    it('closes the first input when a second one is opened', async () => {
      const user = setup()
      await user.click(button('Add file to src')) // this also opens src
      await user.click(button('Rename Beta.js'))

      const boxes = screen.getAllByRole('textbox')
      expect(boxes).toHaveLength(1)
      expect(boxes[0]).toHaveAccessibleName('New name for Beta.js')
    })

    it('closes a rename input when an add input is opened', async () => {
      const user = setup()
      await user.click(button('Rename README.md'))
      await user.click(button('Add file to docs'))

      const boxes = screen.getAllByRole('textbox')
      expect(boxes).toHaveLength(1)
      expect(boxes[0]).toHaveAccessibleName('New file name')
      expect(screen.getByText('README.md')).toBeInTheDocument() // plain name again
    })

    it('closes a rename input when another item is renamed, and prefills the new one', async () => {
      const user = setup()
      await user.click(button('Rename README.md'))
      await user.type(textbox('New name for README.md'), 'xyz')
      await user.click(button('Rename package.json'))

      const boxes = screen.getAllByRole('textbox')
      expect(boxes).toHaveLength(1)
      expect(boxes[0]).toHaveAccessibleName('New name for package.json')
      expect(boxes[0]).toHaveValue('package.json')
    })

    it('moves an add input to another folder and starts empty', async () => {
      const user = setup()
      await user.click(button('Add file to docs'))
      await user.type(textbox('New file name'), 'abc')
      await user.click(button('Add file to project'))

      expect(screen.getAllByRole('textbox')).toHaveLength(1)
      expect(within(item('docs')).queryByRole('textbox')).not.toBeInTheDocument()
      expect(textbox('New file name')).toHaveValue('')
    })

    it('starts empty when you switch from Add file to Add folder on the same folder', async () => {
      const user = setup()
      await user.click(button('Add file to src'))
      await user.type(textbox('New file name'), 'abc')
      await user.click(button('Add folder to src'))

      expect(screen.queryByRole('textbox', { name: 'New file name' })).not.toBeInTheDocument()
      expect(textbox('New folder name')).toHaveValue('')
    })

    it('does not carry an old error over to the next input', async () => {
      const user = setup()
      await user.click(button('Add file to src'))
      await user.type(textbox('New file name'), 'main.js{Enter}')
      expect(screen.getByRole('alert')).toBeInTheDocument()

      await user.click(button('Add folder to docs'))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getAllByRole('textbox')).toHaveLength(1)
    })

    it('keeps an open input when the user clicks somewhere else', async () => {
      const user = setup()
      await user.click(button('Add file to docs'))
      await user.type(textbox('New file name'), 'abc')
      await user.click(document.body)
      await user.click(button('src')) // opening another folder is not a reason to close the input
      expect(textbox('New file name')).toHaveValue('abc')

      await user.click(button('Rename README.md'))
      await user.click(document.body)
      expect(textbox('New name for README.md')).toHaveValue('README.md')
      expect(screen.getAllByRole('textbox')).toHaveLength(1)
    })
  })

  describe('immutability', () => {
    it('never changes the tree object it was given', async () => {
      const tree = makeTree()
      const snapshot = structuredClone(tree)
      const user = setup(tree)

      await user.click(button('Add file to project'))
      await user.type(textbox('New file name'), 'new.txt{Enter}')
      await user.click(button('src'))
      await user.click(button('Rename Beta.js'))
      await user.type(textbox('New name for Beta.js'), 'x{Enter}')
      await user.click(button('Delete main.js'))

      expect(tree).toEqual(snapshot)
    })
  })
})
