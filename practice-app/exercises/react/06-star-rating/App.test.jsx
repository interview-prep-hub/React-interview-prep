import { StrictMode } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

// Helpers -------------------------------------------------------------------

const label = (n) => (n === 1 ? '1 star' : `${n} stars`)

// The wrapper that holds the stars.
const group = () => screen.getByRole('group', { name: 'Star rating' })

// Every star button, in order. Only buttons inside the group count as stars.
const stars = () => within(group()).getAllByRole('button')

// The star button for star number n (1-based).
const star = (n) => within(group()).getByRole('button', { name: label(n) })

// The data-filled value of every star button, in order: ['true', 'false', ...].
const flags = () => stars().map((b) => b.getAttribute('data-filled'))

// What flags() should return when the first `count` stars are filled.
const filled = (count, total = 5) =>
  Array.from({ length: total }, (_, i) => (i < count ? 'true' : 'false'))

// Click a star, then move the pointer away. Right after a click the pointer is
// still over the star, so a hover preview may still be showing. Moving away lets
// us look at the SAVED rating only.
async function pick(user, n) {
  await user.click(star(n))
  await user.unhover(star(n))
}

// Tests ---------------------------------------------------------------------

describe('06 Star rating', () => {
  it('renders a group with five star buttons that start empty', () => {
    render(<App />)
    expect(group()).toBeInTheDocument()
    expect(stars()).toHaveLength(5)
    // Real <button> elements (not a <div> or <span> with a role).
    stars().forEach((b) => expect(b).toBeInstanceOf(HTMLButtonElement))
    expect(flags()).toEqual(filled(0))
    expect(screen.getByText('Not rated yet')).toBeInTheDocument()
  })

  it('labels the stars "1 star", "2 stars", ... in order', () => {
    render(<App />)
    const names = stars().map((b) => b.getAttribute('aria-label'))
    expect(names).toEqual(['1 star', '2 stars', '3 stars', '4 stars', '5 stars'])
  })

  it('clicking a star saves that rating and fills the stars up to it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pick(user, 3)
    expect(screen.getByText('Rated 3 out of 5')).toBeInTheDocument()
    expect(screen.queryByText('Not rated yet')).not.toBeInTheDocument()
    expect(flags()).toEqual(filled(3))
  })

  it('clicking a different star replaces the rating, higher or lower', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pick(user, 2)
    await pick(user, 5)
    expect(screen.getByText('Rated 5 out of 5')).toBeInTheDocument()
    expect(flags()).toEqual(filled(5))

    await pick(user, 1)
    expect(screen.getByText('Rated 1 out of 5')).toBeInTheDocument()
    expect(flags()).toEqual(filled(1))
  })

  it('clicking the selected star again clears the rating', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pick(user, 4)
    expect(screen.getByText('Rated 4 out of 5')).toBeInTheDocument()

    await pick(user, 4)
    expect(screen.getByText('Not rated yet')).toBeInTheDocument()
    expect(flags()).toEqual(filled(0))

    // After clearing, a click works as a normal "set" again.
    await pick(user, 4)
    expect(screen.getByText('Rated 4 out of 5')).toBeInTheDocument()
  })

  it('hovering a star previews the fill without saving it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.hover(star(4))
    expect(flags()).toEqual(filled(4))
    // The saved rating did not change.
    expect(screen.getByText('Not rated yet')).toBeInTheDocument()

    await user.unhover(star(4))
    expect(flags()).toEqual(filled(0))
    expect(screen.getByText('Not rated yet')).toBeInTheDocument()
  })

  it('moving the pointer from star to star moves the preview', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.hover(star(2))
    expect(flags()).toEqual(filled(2))
    await user.hover(star(5))
    expect(flags()).toEqual(filled(5))
    await user.hover(star(1))
    expect(flags()).toEqual(filled(1))
  })

  it('the preview wins over the saved rating while hovering, then the saved rating returns', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pick(user, 3)

    // Hover a higher star: more stars fill.
    await user.hover(star(5))
    expect(flags()).toEqual(filled(5))
    expect(screen.getByText('Rated 3 out of 5')).toBeInTheDocument()

    // Hover a lower star: fewer stars fill.
    await user.hover(star(1))
    expect(flags()).toEqual(filled(1))
    expect(screen.getByText('Rated 3 out of 5')).toBeInTheDocument()

    // Pointer leaves: back to the saved rating.
    await user.unhover(star(1))
    expect(flags()).toEqual(filled(3))
    expect(screen.getByText('Rated 3 out of 5')).toBeInTheDocument()
  })

  it('calls onChange once per click with the new rating, and 0 when cleared', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<App onChange={onChange} />)

    await pick(user, 3)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(3)

    await pick(user, 5)
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith(5)

    await pick(user, 5)
    expect(onChange).toHaveBeenCalledTimes(3)
    expect(onChange).toHaveBeenLastCalledWith(0)
  })

  it('calls onChange only once per click, also inside StrictMode', async () => {
    // StrictMode runs state updater functions twice in development. If onChange
    // is called from inside one, the parent would hear about each click twice.
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <StrictMode>
        <App onChange={onChange} />
      </StrictMode>,
    )

    await pick(user, 2)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(2)

    await pick(user, 2)
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith(0)
  })

  it('does not call onChange when only hovering', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<App onChange={onChange} />)
    await user.hover(star(2))
    await user.hover(star(4))
    await user.unhover(star(4))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('works without an onChange prop', async () => {
    const user = userEvent.setup()
    // React does not rethrow an error from a click handler into the test. It
    // reports it on window, so we listen for it here and check that there is none.
    const errors = []
    const onError = (event) => {
      event.preventDefault()
      errors.push(event.error)
    }
    window.addEventListener('error', onError)
    try {
      render(<App />)
      await pick(user, 2)
      expect(screen.getByText('Rated 2 out of 5')).toBeInTheDocument()
      await pick(user, 2)
      expect(screen.getByText('Not rated yet')).toBeInTheDocument()
    } finally {
      window.removeEventListener('error', onError)
    }
    expect(errors).toEqual([])
  })

  it('supports a custom max', async () => {
    const user = userEvent.setup()
    render(<App max={10} />)
    expect(stars()).toHaveLength(10)
    expect(star(10)).toBeInTheDocument()

    await pick(user, 7)
    expect(screen.getByText('Rated 7 out of 10')).toBeInTheDocument()
    expect(flags()).toEqual(filled(7, 10))

    await user.hover(star(9))
    expect(flags()).toEqual(filled(9, 10))
  })

  it('supports a smaller max', () => {
    render(<App max={3} />)
    expect(stars()).toHaveLength(3)
    expect(within(group()).queryByRole('button', { name: '4 stars' })).not.toBeInTheDocument()
  })

  it('can be used with the keyboard (Tab to focus, Enter or Space to choose)', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.tab()
    expect(star(1)).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Rated 1 out of 5')).toBeInTheDocument()

    await user.tab()
    expect(star(2)).toHaveFocus()
    await user.keyboard(' ')
    expect(screen.getByText('Rated 2 out of 5')).toBeInTheDocument()
  })
})
