import { StrictMode } from 'react'
import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App, { Dropdown } from './App.jsx'
import { useClickOutside } from './useClickOutside.js'

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]

// `hidden: true` also finds a list that is only hidden with CSS, so this check
// makes sure the list is really not rendered while the dropdown is closed.
const queryListbox = () => screen.queryByRole('listbox', { hidden: true })

describe('21 Dropdown with click outside', () => {
  describe('Dropdown (inside App)', () => {
    it('starts closed, shows the default label and has the right ARIA on the button', () => {
      render(<App />)
      const button = screen.getByRole('button', { name: /select a fruit/i })
      expect(button).toHaveAttribute('aria-haspopup', 'listbox')
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(queryListbox()).not.toBeInTheDocument()
      expect(screen.getByTestId('chosen')).toHaveTextContent(/^none$/)
    })

    it('opens a listbox with the options when the button is clicked', async () => {
      const user = userEvent.setup()
      render(<App />)
      const button = screen.getByRole('button', { name: /select a fruit/i })
      await user.click(button)

      expect(button).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('listbox')).toBeInTheDocument()
      const options = screen.getAllByRole('option')
      expect(options.map((o) => o.textContent)).toEqual(['Apple', 'Banana', 'Cherry', 'Mango'])
      options.forEach((o) => expect(o).toHaveAttribute('aria-selected', 'false'))
    })

    it('toggles: clicking the button again closes the list, and a third click reopens it', async () => {
      const user = userEvent.setup()
      render(<App />)
      const button = screen.getByRole('button', { name: /select a fruit/i })

      await user.click(button)
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      await user.click(button)
      expect(queryListbox()).not.toBeInTheDocument()
      expect(button).toHaveAttribute('aria-expanded', 'false')

      await user.click(button)
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('choosing an option selects it, closes the list and moves focus to the button', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(screen.getByRole('button', { name: /select a fruit/i }))
      await user.click(screen.getByRole('option', { name: 'Banana' }))

      expect(queryListbox()).not.toBeInTheDocument()
      const button = screen.getByRole('button', { name: /banana/i })
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(button).toHaveFocus()
      expect(screen.getByTestId('chosen')).toHaveTextContent(/^banana$/)
    })

    it('marks only the selected option with aria-selected when reopened', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(screen.getByRole('button', { name: /select a fruit/i }))
      await user.click(screen.getByRole('option', { name: 'Cherry' }))
      await user.click(screen.getByRole('button', { name: /cherry/i }))

      expect(screen.getByRole('option', { name: 'Cherry' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByRole('option', { name: 'Banana' })).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByRole('option', { name: 'Mango' })).toHaveAttribute('aria-selected', 'false')
    })

    it('lets the user change the selection', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(screen.getByRole('button', { name: /select a fruit/i }))
      await user.click(screen.getByRole('option', { name: 'Apple' }))
      await user.click(screen.getByRole('button', { name: /apple/i }))
      await user.click(screen.getByRole('option', { name: 'Mango' }))

      expect(screen.getByRole('button', { name: /mango/i })).toBeInTheDocument()
      expect(screen.getByTestId('chosen')).toHaveTextContent(/^mango$/)
    })
  })

  describe('Dropdown (on its own)', () => {
    it('calls onChange once with the option value, and only when an option is chosen', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Dropdown options={OPTIONS} onChange={onChange} />)

      await user.click(screen.getByRole('button', { name: /select a fruit/i }))
      expect(onChange).not.toHaveBeenCalled()

      await user.click(screen.getByRole('option', { name: 'Beta' }))
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith('b')
    })

    it('works without an onChange prop', async () => {
      const user = userEvent.setup()
      render(<Dropdown options={OPTIONS} />)
      await user.click(screen.getByRole('button', { name: /select a fruit/i }))
      await user.click(screen.getByRole('option', { name: 'Alpha' }))

      // The whole "choose" flow must finish even though there is no onChange.
      expect(screen.getByRole('button', { name: /alpha/i })).toHaveFocus()
      expect(queryListbox()).not.toBeInTheDocument()
    })

    it('does not submit a surrounding form (the button has type="button")', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn((event) => event.preventDefault())
      render(
        <form onSubmit={onSubmit}>
          <Dropdown options={OPTIONS} />
        </form>,
      )
      await user.click(screen.getByRole('button', { name: /select a fruit/i }))
      await user.click(screen.getByRole('option', { name: 'Beta' }))
      await user.click(screen.getByRole('button', { name: /beta/i }))

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows a custom placeholder until something is chosen', async () => {
      const user = userEvent.setup()
      render(<Dropdown options={OPTIONS} placeholder="Pick one" />)
      expect(screen.getByRole('button', { name: /pick one/i })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /pick one/i }))
      await user.click(screen.getByRole('option', { name: 'Gamma' }))
      expect(screen.getByRole('button', { name: /gamma/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /pick one/i })).not.toBeInTheDocument()
    })
  })

  describe('closing by clicking outside', () => {
    it('closes the list on a click outside and does not change the selection', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(screen.getByRole('button', { name: /select a fruit/i }))
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      await user.click(screen.getByRole('heading', { name: /fruit picker/i }))

      expect(queryListbox()).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /select a fruit/i })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
      expect(screen.getByTestId('chosen')).toHaveTextContent(/^none$/)
    })

    it('ignores a click outside while the list is closed, and keeps working on later openings', async () => {
      const user = userEvent.setup()
      render(<App />)
      const button = screen.getByRole('button', { name: /select a fruit/i })
      const heading = screen.getByRole('heading', { name: /fruit picker/i })

      // Closed: a click outside must not open the list.
      await user.click(heading)
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(queryListbox()).not.toBeInTheDocument()

      // Open, close by clicking outside, then do it all again.
      await user.click(button)
      expect(screen.getByRole('listbox')).toBeInTheDocument()
      await user.click(heading)
      expect(queryListbox()).not.toBeInTheDocument()

      await user.click(button)
      expect(screen.getByRole('listbox')).toBeInTheDocument()
      await user.click(heading)
      expect(queryListbox()).not.toBeInTheDocument()
    })

    it('does not count a click on the list itself as outside', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(screen.getByRole('button', { name: /select a fruit/i }))
      await user.click(screen.getByRole('listbox'))
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('does not call onChange and does not steal focus when the click lands on another control', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <>
          <input aria-label="Other field" />
          <Dropdown options={OPTIONS} onChange={onChange} />
        </>,
      )
      await user.click(screen.getByRole('button', { name: /select a fruit/i }))
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      const input = screen.getByRole('textbox', { name: /other field/i })
      await user.click(input)

      expect(queryListbox()).not.toBeInTheDocument()
      expect(input).toHaveFocus()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('closes an open dropdown when another dropdown is opened', async () => {
      const user = userEvent.setup()
      render(
        <>
          <Dropdown options={OPTIONS} placeholder="First" />
          <Dropdown options={OPTIONS} placeholder="Second" />
        </>,
      )
      const first = screen.getByRole('button', { name: /first/i })
      const second = screen.getByRole('button', { name: /second/i })

      await user.click(first)
      expect(first).toHaveAttribute('aria-expanded', 'true')

      await user.click(second)
      expect(first).toHaveAttribute('aria-expanded', 'false')
      expect(second).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getAllByRole('listbox', { hidden: true })).toHaveLength(1)
    })
  })

  describe('closing with the Escape key', () => {
    it('closes the list and keeps focus on the button when Escape is pressed on the button', async () => {
      const user = userEvent.setup()
      render(<App />)
      const button = screen.getByRole('button', { name: /select a fruit/i })
      await user.click(button)
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      expect(queryListbox()).not.toBeInTheDocument()
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(button).toHaveFocus()
      expect(screen.getByTestId('chosen')).toHaveTextContent(/^none$/)
    })

    it('stays open when a key other than Escape is pressed', async () => {
      const user = userEvent.setup()
      render(<App />)
      const button = screen.getByRole('button', { name: /select a fruit/i })
      await user.click(button)

      await user.keyboard('{ArrowDown}x')

      expect(screen.getByRole('listbox')).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('keeps an earlier selection when the list is closed by an outside click or by Escape', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(screen.getByRole('button', { name: /select a fruit/i }))
      await user.click(screen.getByRole('option', { name: 'Banana' }))

      // Close by clicking outside.
      await user.click(screen.getByRole('button', { name: /banana/i }))
      await user.click(screen.getByRole('heading', { name: /fruit picker/i }))
      expect(queryListbox()).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /banana/i })).toBeInTheDocument()
      expect(screen.getByTestId('chosen')).toHaveTextContent(/^banana$/)

      // Close with Escape.
      await user.click(screen.getByRole('button', { name: /banana/i }))
      await user.keyboard('{Escape}')
      expect(queryListbox()).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /banana/i })).toBeInTheDocument()
      expect(screen.getByTestId('chosen')).toHaveTextContent(/^banana$/)

      // The choice is still marked when the list is opened again.
      await user.click(screen.getByRole('button', { name: /banana/i }))
      expect(screen.getByRole('option', { name: 'Banana' })).toHaveAttribute('aria-selected', 'true')
    })

    it('options can take focus (tabIndex of -1)', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(screen.getByRole('button', { name: /select a fruit/i }))
      const option = screen.getByRole('option', { name: 'Cherry' })
      option.focus()
      expect(option).toHaveFocus()
    })

    it('returns focus to the button when Escape is pressed while an option has focus', async () => {
      const user = userEvent.setup()
      render(<App />)
      const button = screen.getByRole('button', { name: /select a fruit/i })
      await user.click(button)
      const option = screen.getByRole('option', { name: 'Cherry' })
      option.focus()
      expect(option).toHaveFocus()

      await user.keyboard('{Escape}')

      expect(queryListbox()).not.toBeInTheDocument()
      expect(button).toHaveFocus()
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('useClickOutside hook', () => {
    let inside
    let child
    let outside

    beforeEach(() => {
      inside = document.createElement('div')
      child = document.createElement('span')
      outside = document.createElement('div')
      inside.appendChild(child)
      document.body.append(inside, outside)
    })

    afterEach(() => {
      inside.remove()
      outside.remove()
    })

    it('calls the handler with the event for a click outside, but not for a click inside', async () => {
      const user = userEvent.setup()
      const handler = vi.fn()
      const ref = { current: inside }
      renderHook(() => useClickOutside(ref, handler))

      await user.click(inside)
      await user.click(child)
      expect(handler).not.toHaveBeenCalled()

      await user.click(outside)
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].target).toBe(outside)

      // The hook keeps listening: every later outside click calls the handler again.
      await user.click(outside)
      expect(handler).toHaveBeenCalledTimes(2)
    })

    it('does nothing while ref.current is null, and works once the element exists', async () => {
      const user = userEvent.setup()
      const handler = vi.fn()
      const ref = { current: null }
      // A listener that throws would be reported on window. Collect those errors
      // here, so a missing null check fails this test with a clear message.
      const errors = []
      const onError = (event) => {
        event.preventDefault()
        errors.push(event.error)
      }
      window.addEventListener('error', onError)
      try {
        renderHook(() => useClickOutside(ref, handler))

        await user.click(outside)
        expect(errors).toEqual([])
        expect(handler).not.toHaveBeenCalled()

        // The element shows up after the hook ran (for example, it mounts later).
        // The hook must look at ref.current when the click happens.
        ref.current = inside
        await user.click(child)
        expect(handler).not.toHaveBeenCalled()
        await user.click(outside)
        expect(handler).toHaveBeenCalledTimes(1)
        expect(errors).toEqual([])
      } finally {
        window.removeEventListener('error', onError)
      }
    })

    it('uses the newest handler after a re-render', async () => {
      const user = userEvent.setup()
      const first = vi.fn()
      const second = vi.fn()
      const ref = { current: inside }
      const { rerender } = renderHook(({ handler }) => useClickOutside(ref, handler), {
        initialProps: { handler: first },
      })

      rerender({ handler: second })
      await user.click(outside)

      expect(second).toHaveBeenCalledTimes(1)
      expect(first).not.toHaveBeenCalled()
    })

    it('stops listening when the component unmounts', async () => {
      const user = userEvent.setup()
      const handler = vi.fn()
      const ref = { current: inside }
      const { unmount } = renderHook(() => useClickOutside(ref, handler))

      await user.click(outside)
      expect(handler).toHaveBeenCalledTimes(1)

      unmount()
      await user.click(outside)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('does not leave extra listeners behind (one call per click, even in StrictMode)', async () => {
      const user = userEvent.setup()
      const handler = vi.fn()
      const ref = { current: inside }
      // StrictMode runs every effect twice in development: setup, cleanup, setup.
      // Without a proper cleanup there would be two listeners and two calls.
      renderHook(() => useClickOutside(ref, handler), { wrapper: StrictMode })

      await user.click(outside)
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })
})
