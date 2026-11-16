import { StrictMode, useState } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App, { Modal } from './App.jsx'

// Same idea as a keyboard user: things Tab can reach.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const focusablesIn = (element) => Array.from(element.querySelectorAll(FOCUSABLE))
const getTrigger = () => screen.getByRole('button', { name: /open modal/i })

// Clicks the trigger and returns the dialog element.
async function openModal(user) {
  await user.click(getTrigger())
  const dialog = screen.queryByRole('dialog')
  expect(dialog).toBeInTheDocument()
  return dialog
}

// A page with several buttons around the trigger, to prove that focus goes back to
// the element that really opened the dialog (not simply "the first button").
function Page() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button">Before</button>
      <button type="button" onClick={() => setOpen(true)}>
        Show dialog
      </button>
      <button type="button">After</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Page dialog">
        <button type="button">Inner</button>
      </Modal>
    </div>
  )
}

// A dialog whose content changes while it is open: the "last focusable element"
// is a different element after the click on "Add field". The state lives inside the
// content, so Modal itself is not re-rendered by its parent when this happens.
function AddFieldPanel() {
  const [extra, setExtra] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setExtra(true)}>
        Add field
      </button>
      {extra && <input aria-label="Extra field" />}
    </>
  )
}

const noop = () => {}

function GrowingDialog() {
  return (
    <>
      <button type="button">Outside</button>
      <Modal open onClose={noop} title="Growing dialog">
        <AddFieldPanel />
      </Modal>
    </>
  )
}

describe('14 Modal with portal, focus management and accessibility', () => {
  // The scroll lock writes to document.body, which is shared between tests.
  beforeEach(() => {
    document.body.style.overflow = ''
  })
  afterEach(() => {
    document.body.style.overflow = ''
  })

  describe('opening and closing', () => {
    it('renders nothing for the modal while it is closed', () => {
      render(<App />)
      expect(getTrigger()).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument()
      expect(screen.queryByText('Edit profile')).not.toBeInTheDocument()
      expect(document.body.style.overflow).not.toBe('hidden')
    })

    it('opens when the Open modal button is clicked', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dialog = await openModal(user)
      expect(within(dialog).getByRole('heading', { level: 2, name: 'Edit profile' })).toBeInTheDocument()
      expect(within(dialog).getByText('Change how other people see you.')).toBeInTheDocument()
      expect(within(dialog).getByLabelText('Nickname')).toBeInTheDocument()
      expect(screen.getByTestId('modal-overlay')).toBeInTheDocument()
    })

    it('closes with the Close button', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dialog = await openModal(user)
      await user.click(within(dialog).getByRole('button', { name: 'Close' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument()
    })

    it('closes with the Save button', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dialog = await openModal(user)
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('closes when Escape is pressed', async () => {
      const user = userEvent.setup()
      render(<App />)
      await openModal(user)
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('closes on Escape even when focus is on the page body', async () => {
      const user = userEvent.setup()
      render(<App />)
      await openModal(user)

      // Simulate the user clicking plain text: focus falls back to <body>.
      act(() => document.activeElement.blur())
      expect(document.body).toHaveFocus()

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('ignores other keys', async () => {
      const user = userEvent.setup()
      render(<App />)
      await openModal(user)
      await user.keyboard('x')
      await user.keyboard('{ArrowDown}')
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('closes when the dark overlay is clicked', async () => {
      const user = userEvent.setup()
      render(<App />)
      await openModal(user)
      await user.click(screen.getByTestId('modal-overlay'))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('stays open when the click is inside the dialog content', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dialog = await openModal(user)
      await user.click(dialog)
      await user.click(within(dialog).getByRole('heading', { name: 'Edit profile' }))
      await user.click(within(dialog).getByText('Change how other people see you.'))
      await user.click(within(dialog).getByLabelText('Nickname'))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('can be opened again after it was closed', async () => {
      const user = userEvent.setup()
      render(<App />)
      await openModal(user)
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      const dialog = await openModal(user)
      expect(within(dialog).getByRole('heading', { name: 'Edit profile' })).toBeInTheDocument()
    })
  })

  describe('accessibility attributes', () => {
    it('has role dialog, aria-modal true, and is labelled by its title', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dialog = await openModal(user)
      expect(dialog).toHaveAttribute('aria-modal', 'true')

      const heading = within(dialog).getByRole('heading', { level: 2, name: 'Edit profile' })
      expect(heading.id).not.toBe('')
      expect(dialog).toHaveAttribute('aria-labelledby', heading.id)
      expect(dialog).toHaveAccessibleName('Edit profile')
    })
  })

  describe('portal', () => {
    it('renders the overlay and dialog in document.body, outside the app container', async () => {
      const user = userEvent.setup()
      const { container } = render(<App />)
      const dialog = await openModal(user)
      const overlay = screen.getByTestId('modal-overlay')

      expect(document.body).toContainElement(dialog)
      expect(container).not.toContainElement(dialog)
      expect(container).not.toContainElement(overlay)
    })

    it('leaves nothing behind in document.body after closing', async () => {
      const user = userEvent.setup()
      render(<App />)
      await openModal(user)
      await user.keyboard('{Escape}')
      expect(document.body.querySelector('[role="dialog"]')).toBeNull()
      expect(document.body.querySelector('[data-testid="modal-overlay"]')).toBeNull()
    })
  })

  describe('focus management', () => {
    it('moves focus inside the dialog when it opens', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dialog = await openModal(user)
      expect(dialog).toContainElement(document.activeElement)
      expect(getTrigger()).not.toHaveFocus()
    })

    it('keeps focus in the Nickname input while typing (a parent re-render must not steal focus)', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dialog = await openModal(user)
      const input = within(dialog).getByLabelText('Nickname')

      await user.click(input)
      await user.keyboard('abc')

      expect(input).toHaveValue('abc')
      expect(input).toHaveFocus()
      expect(document.body.style.overflow).toBe('hidden')
    })

    it.each([
      ['the Close button', (user, dialog) => user.click(within(dialog).getByRole('button', { name: 'Close' }))],
      ['the Save button', (user, dialog) => user.click(within(dialog).getByRole('button', { name: 'Save' }))],
      ['the Escape key', (user) => user.keyboard('{Escape}')],
      ['a click on the overlay', (user) => user.click(screen.getByTestId('modal-overlay'))],
    ])('returns focus to the Open modal button after closing with %s', async (_label, closeIt) => {
      const user = userEvent.setup()
      render(<App />)
      const trigger = getTrigger()
      const dialog = await openModal(user)
      await closeIt(user, dialog)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(trigger).toHaveFocus()
    })
  })

  describe('focus trap', () => {
    it('moves from the last focusable element to the first on Tab', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dialog = await openModal(user)
      const items = focusablesIn(dialog)
      expect(items.length).toBeGreaterThanOrEqual(3)

      act(() => items[items.length - 1].focus())
      await user.tab()
      expect(items[0]).toHaveFocus()
    })

    it('moves from the first focusable element to the last on Shift+Tab', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dialog = await openModal(user)
      const items = focusablesIn(dialog)

      act(() => items[0].focus())
      await user.tab({ shift: true })
      expect(items[items.length - 1]).toHaveFocus()
    })

    it('never lets Tab leave the dialog and reaches every focusable element', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dialog = await openModal(user)
      const items = focusablesIn(dialog)
      const visited = new Set()

      for (let i = 0; i < items.length * 2 + 1; i += 1) {
        await user.tab()
        expect(dialog).toContainElement(document.activeElement)
        visited.add(document.activeElement)
      }
      for (const item of items) expect(visited.has(item)).toBe(true)
    })

    it('never lets Shift+Tab leave the dialog and reaches every focusable element', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dialog = await openModal(user)
      const items = focusablesIn(dialog)
      const visited = new Set()

      for (let i = 0; i < items.length * 2 + 1; i += 1) {
        await user.tab({ shift: true })
        expect(dialog).toContainElement(document.activeElement)
        visited.add(document.activeElement)
      }
      for (const item of items) expect(visited.has(item)).toBe(true)
    })

    it('pulls focus back into the dialog when Tab is pressed while focus is outside it', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dialog = await openModal(user)
      const items = focusablesIn(dialog)

      // Simulate the user clicking plain text: focus falls back to <body>.
      act(() => document.activeElement.blur())
      expect(document.body).toHaveFocus()

      await user.tab()
      expect(items[0]).toHaveFocus()

      act(() => document.activeElement.blur())
      await user.tab({ shift: true })
      expect(items[items.length - 1]).toHaveFocus()
    })
  })

  describe('scroll lock', () => {
    it('hides body overflow while open and restores the previous value on close', async () => {
      const user = userEvent.setup()
      document.body.style.overflow = 'scroll'
      render(<App />)
      expect(document.body.style.overflow).toBe('scroll')

      await openModal(user)
      expect(document.body.style.overflow).toBe('hidden')

      await user.keyboard('{Escape}')
      expect(document.body.style.overflow).toBe('scroll')
    })

    it('restores the previous body overflow when the app unmounts while the modal is open', async () => {
      const user = userEvent.setup()
      document.body.style.overflow = 'auto'
      const { unmount } = render(<App />)
      await openModal(user)
      expect(document.body.style.overflow).toBe('hidden')

      unmount()
      expect(document.body.style.overflow).toBe('auto')
      expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    })
  })

  describe('StrictMode', () => {
    it('works when React runs effects twice (scroll lock and focus)', async () => {
      const user = userEvent.setup()
      document.body.style.overflow = 'scroll'
      render(
        <StrictMode>
          <App />
        </StrictMode>,
      )
      const trigger = getTrigger()

      const dialog = await openModal(user)
      expect(document.body.style.overflow).toBe('hidden')
      expect(dialog).toContainElement(document.activeElement)

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(document.body.style.overflow).toBe('scroll')
      expect(trigger).toHaveFocus()
    })
  })

  describe('the Modal component on its own', () => {
    it('shows the title and the children it is given: heading, then Close, then children', () => {
      render(
        <Modal open onClose={() => {}} title="Delete item">
          <p>This cannot be undone.</p>
        </Modal>,
      )
      const dialog = screen.getByRole('dialog', { name: 'Delete item' })
      const heading = within(dialog).getByRole('heading', { level: 2, name: 'Delete item' })
      const close = within(dialog).getByRole('button', { name: 'Close' })
      const text = within(dialog).getByText('This cannot be undone.')

      expect(heading.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(close.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('gives every modal its own title id', () => {
      render(
        <>
          <Modal open onClose={() => {}} title="First title">
            <p>one</p>
          </Modal>
          <Modal open onClose={() => {}} title="Second title">
            <p>two</p>
          </Modal>
        </>,
      )
      const first = screen.getByRole('dialog', { name: 'First title' })
      const second = screen.getByRole('dialog', { name: 'Second title' })
      expect(first.getAttribute('aria-labelledby')).not.toBe(second.getAttribute('aria-labelledby'))
    })

    it.each([
      ['normally', undefined],
      ['in StrictMode', StrictMode],
    ])('calls onClose exactly once per close action (%s)', async (_label, wrapper) => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(
        <Modal open onClose={onClose} title="Count me">
          <p>Some text</p>
        </Modal>,
        { wrapper },
      )
      const dialog = screen.getByRole('dialog')

      await user.click(within(dialog).getByRole('button', { name: 'Close' }))
      expect(onClose).toHaveBeenCalledTimes(1)

      await user.click(screen.getByTestId('modal-overlay'))
      expect(onClose).toHaveBeenCalledTimes(2)

      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(3)

      // Clicks inside and other keys do not call it.
      await user.click(dialog)
      await user.click(within(dialog).getByText('Some text'))
      await user.keyboard('x')
      expect(onClose).toHaveBeenCalledTimes(3)
    })

    it('calls the newest onClose when Escape is pressed', async () => {
      const user = userEvent.setup()
      const oldOnClose = vi.fn()
      const newOnClose = vi.fn()
      const { rerender } = render(
        <Modal open onClose={oldOnClose} title="Latest">
          <p>text</p>
        </Modal>,
      )
      rerender(
        <Modal open onClose={newOnClose} title="Latest">
          <p>text</p>
        </Modal>,
      )

      await user.keyboard('{Escape}')
      expect(newOnClose).toHaveBeenCalledTimes(1)
      expect(oldOnClose).not.toHaveBeenCalled()
    })

    it('ignores the keyboard while it is closed, after it was closed, and after it unmounted', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      const modal = (open) => (
        <Modal open={open} onClose={onClose} title="Listening">
          <p>text</p>
        </Modal>
      )
      const { rerender, unmount } = render(modal(false))

      await user.keyboard('{Escape}')
      expect(onClose).not.toHaveBeenCalled() // closed from the start

      rerender(modal(true))
      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(1) // open: listening

      rerender(modal(false))
      await user.keyboard('{Escape}')
      await user.tab()
      expect(onClose).toHaveBeenCalledTimes(1) // closed again: not listening

      rerender(modal(true))
      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(2)

      unmount()
      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(2) // unmounted: not listening
    })

    it('gives focus back to the element that opened it, whichever element that is', async () => {
      const user = userEvent.setup()
      render(<Page />)
      const opener = screen.getByRole('button', { name: 'Show dialog' })

      await user.click(opener)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      await user.keyboard('{Escape}')

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(opener).toHaveFocus()
    })

    it('leaves Tab alone once it has closed', async () => {
      const user = userEvent.setup()
      render(<Page />)
      await user.click(screen.getByRole('button', { name: 'Show dialog' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      // Normal page order again: Before, Show dialog, After.
      await user.tab()
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
      await user.tab({ shift: true })
      await user.tab({ shift: true })
      expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus()
    })

    it('keeps the focus trap correct when its content changes while it is open', async () => {
      const user = userEvent.setup()
      render(<GrowingDialog />)
      const dialog = screen.getByRole('dialog')
      const close = within(dialog).getByRole('button', { name: 'Close' })

      await user.click(within(dialog).getByRole('button', { name: 'Add field' }))
      const extra = within(dialog).getByLabelText('Extra field') // now the last focusable element

      await user.click(extra)
      await user.tab() // last -> first
      expect(close).toHaveFocus()

      await user.tab({ shift: true }) // first -> last
      expect(extra).toHaveFocus()
    })

    it('does not touch the scroll lock when the parent re-renders (typing in the demo)', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dialog = await openModal(user)
      await user.click(within(dialog).getByLabelText('Nickname'))

      // Record every write to the style attribute of <body> from now on.
      const writes = []
      const observer = new MutationObserver((records) => writes.push(...records))
      observer.observe(document.body, { attributes: true, attributeFilter: ['style'] })
      await user.keyboard('abc') // every key re-renders App and gives Modal a new onClose
      writes.push(...observer.takeRecords())
      observer.disconnect()

      expect(writes).toHaveLength(0)
      expect(document.body.style.overflow).toBe('hidden')
    })
  })
})
