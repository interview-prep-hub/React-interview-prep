import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { SLIDES } from './slides.js'

const TOTAL = SLIDES.length // 4 slides

// Role queries are slow in jsdom. On a busy or slow computer the first test can
// take longer than the default 5 seconds, so allow more time (this is not a delay).
vi.setConfig({ testTimeout: 15000 })

// ---------- small helpers ----------

const carousel = () => screen.getByRole('region', { name: 'Image carousel' })
const prevButton = () => screen.getByRole('button', { name: 'Prev' })
const nextButton = () => screen.getByRole('button', { name: 'Next' })
const dot = (n) => screen.getByRole('button', { name: `Go to slide ${n}` })

// Every picture in the page, including ones hidden with CSS or `hidden`.
// (By default Testing Library skips hidden elements, and we want to prove that
// the other slides are not rendered at all.)
const allPictures = () => screen.queryAllByRole('img', { hidden: true })

// The one and only picture (fails with a clear message if there are none or several).
function onlyPicture() {
  const found = allPictures()
  expect(found).toHaveLength(1)
  return found[0]
}

// Check that slide number n (1-based) is what the user sees:
// exactly one picture, the matching caption, and only the matching dot is active.
function expectSlide(n, total = TOTAL, slides = SLIDES) {
  const found = allPictures()
  expect(found).toHaveLength(1)
  expect(found[0]).toHaveAccessibleName(slides[n - 1].alt)
  expect(screen.getByText(`Slide ${n} of ${total}`)).toBeInTheDocument()
  for (let i = 1; i <= total; i++) {
    if (i === n) {
      expect(dot(i)).toHaveAttribute('aria-current', 'true')
    } else {
      expect(dot(i)).not.toHaveAttribute('aria-current', 'true')
    }
  }
}

describe('22 Image carousel', () => {
  // ---------- manual navigation (real timers, awaited user-event) ----------

  describe('manual navigation', () => {
    it('starts on slide 1 and shows only that slide', () => {
      render(<App />)
      expectSlide(1)
      // The other slides are not in the page at all (not just hidden).
      for (const other of SLIDES.slice(1)) {
        expect(screen.queryByRole('img', { name: other.alt, hidden: true })).not.toBeInTheDocument()
      }
    })

    it('paints the current slide with its own color', async () => {
      const user = userEvent.setup()
      render(<App />)
      expect(onlyPicture()).toHaveStyle({ backgroundColor: SLIDES[0].color })
      await user.click(nextButton())
      expect(onlyPicture()).toHaveStyle({ backgroundColor: SLIDES[1].color })
      await user.click(dot(4))
      expect(onlyPicture()).toHaveStyle({ backgroundColor: SLIDES[3].color })
    })

    it('shows whatever slides it is given (alt text and color come from the data)', async () => {
      const user = userEvent.setup()
      const custom = [
        { id: 'a', alt: 'Purple slide', color: '#8e24aa' },
        { id: 'b', alt: 'Teal slide', color: '#00897b' },
        { id: 'c', alt: 'Brown slide', color: '#6d4c41' },
      ]
      render(<App slides={custom} />)
      expectSlide(1, 3, custom)
      expect(onlyPicture()).toHaveStyle({ backgroundColor: '#8e24aa' })
      await user.click(nextButton())
      expectSlide(2, 3, custom)
      expect(onlyPicture()).toHaveStyle({ backgroundColor: '#00897b' })
      await user.click(dot(3))
      expectSlide(3, 3, custom)
      expect(onlyPicture()).toHaveStyle({ backgroundColor: '#6d4c41' })
    })

    it('renders a Prev button, a Next button and one "Go to slide N" dot per slide', () => {
      render(<App />)
      expect(carousel()).toBeInTheDocument()
      expect(prevButton()).toBeEnabled()
      expect(nextButton()).toBeEnabled()
      const dots = screen.getAllByRole('button', { name: /^Go to slide \d+$/ })
      expect(dots.map((d) => d.getAttribute('aria-label'))).toEqual([
        'Go to slide 1',
        'Go to slide 2',
        'Go to slide 3',
        'Go to slide 4',
      ])
    })

    it('shows the caption "Slide N of M" in an aria-live="polite" region that stays in the page', async () => {
      const user = userEvent.setup()
      render(<App />)
      const caption = screen.getByText('Slide 1 of 4')
      const region = caption.closest('[aria-live]')
      expect(region).not.toBeNull()
      expect(region).toHaveAttribute('aria-live', 'polite')
      // Only the caption is announced, not the whole carousel with its buttons.
      expect(region).not.toContainElement(nextButton())

      await user.click(nextButton())
      // The same element is updated (a live region that is replaced is not announced).
      expect(screen.getByText('Slide 2 of 4')).toBe(caption)
      expect(caption.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite')
    })

    it('Next goes to the following slide', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(nextButton())
      expectSlide(2)
      await user.click(nextButton())
      expectSlide(3)
    })

    it('Next wraps around from the last slide to the first', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(nextButton())
      await user.click(nextButton())
      await user.click(nextButton())
      expectSlide(4)
      await user.click(nextButton())
      expectSlide(1)
    })

    it('Prev wraps around from the first slide to the last', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(prevButton())
      expectSlide(4)
      await user.click(prevButton())
      expectSlide(3)
    })

    it('Prev goes back one slide', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(nextButton())
      await user.click(nextButton())
      expectSlide(3)
      await user.click(prevButton())
      expectSlide(2)
    })

    it('a dot jumps straight to its slide and becomes the active dot', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(dot(3))
      expectSlide(3)
      await user.click(dot(4))
      expectSlide(4)
      await user.click(dot(1))
      expectSlide(1)
    })

    it('Prev and Next continue from the slide a dot jumped to', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(dot(3))
      await user.click(nextButton())
      expectSlide(4)
      await user.click(dot(2))
      await user.click(prevButton())
      expectSlide(1)
    })

    it('keeps exactly one slide in the page while navigating', async () => {
      const user = userEvent.setup()
      render(<App />)
      for (let step = 0; step < 6; step++) {
        await user.click(nextButton())
        expect(allPictures()).toHaveLength(1)
      }
      await user.click(prevButton())
      expect(allPictures()).toHaveLength(1)
    })

    it('works with any number of slides, not just 4', async () => {
      const user = userEvent.setup()
      const three = SLIDES.slice(0, 3)
      render(<App slides={three} />)
      expectSlide(1, 3, three)
      expect(screen.getAllByRole('button', { name: /^Go to slide \d+$/ })).toHaveLength(3)
      expect(screen.queryByRole('button', { name: 'Go to slide 4' })).not.toBeInTheDocument()

      await user.click(prevButton())
      expectSlide(3, 3, three)
      await user.click(nextButton())
      expectSlide(1, 3, three)
    })

    it('works with a single slide (Prev and Next stay on it)', async () => {
      const user = userEvent.setup()
      const one = SLIDES.slice(0, 1)
      render(<App slides={one} />)
      expectSlide(1, 1, one)
      await user.click(nextButton())
      expectSlide(1, 1, one)
      await user.click(prevButton())
      expectSlide(1, 1, one)
    })

    it('every control is a real button that works with the keyboard', async () => {
      const user = userEvent.setup()
      render(<App />)

      nextButton().focus()
      await user.keyboard('{Enter}')
      expectSlide(2)
      await user.keyboard(' ')
      expectSlide(3)

      dot(1).focus()
      await user.keyboard('{Enter}')
      expectSlide(1)

      prevButton().focus()
      await user.keyboard('{Enter}')
      expectSlide(4)
    })
  })

  // ---------- autoPlay (fake timers, nothing waits for real time) ----------

  describe('autoPlay', () => {
    // Move the fake clock forward inside act(), so React can apply the state
    // updates that your timer callback makes. Each call below moves the clock
    // by at most ONE interval (3000 ms), so an effect that re-creates its timer
    // after every change still gets the chance to do so.
    const advance = (ms) => {
      act(() => {
        vi.advanceTimersByTime(ms)
      })
    }
    const hover = () => fireEvent.mouseEnter(carousel())
    const unhover = () => fireEvent.mouseLeave(carousel())

    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      // Unmount while the fake timers are still installed, then go back to real ones.
      cleanup()
      vi.useRealTimers()
    })

    it('does not advance by itself when autoPlay is not set', () => {
      render(<App />)
      advance(3000)
      advance(3000)
      advance(3000)
      advance(3000)
      expectSlide(1)
    })

    it('advances to the next slide after 3000 ms, and not before', () => {
      render(<App autoPlay />)
      advance(2999)
      expectSlide(1)
      advance(1)
      expectSlide(2)
    })

    it('keeps advancing every 3000 ms and wraps from the last slide to the first', () => {
      render(<App autoPlay />)
      advance(3000)
      expectSlide(2)
      advance(3000)
      expectSlide(3)
      advance(3000)
      expectSlide(4)
      advance(3000)
      expectSlide(1)
      advance(3000)
      expectSlide(2)
    })

    it('wraps using the number of slides it was given', () => {
      const two = SLIDES.slice(0, 2)
      render(<App autoPlay slides={two} />)
      advance(3000)
      expectSlide(2, 2, two)
      advance(3000)
      expectSlide(1, 2, two)
    })

    it('continues from the slide the user picked, not from where it started', () => {
      render(<App autoPlay />)
      fireEvent.click(dot(3))
      expectSlide(3)
      advance(3000)
      expectSlide(4)
      advance(3000)
      expectSlide(1)
    })

    it('pauses while the mouse is over the carousel', () => {
      render(<App autoPlay />)
      advance(1000)
      hover()
      advance(3000)
      advance(3000)
      advance(3000)
      expectSlide(1)
    })

    it('resumes when the mouse leaves, with a fresh 3000 ms countdown', () => {
      render(<App autoPlay />)
      advance(3000)
      expectSlide(2)
      advance(1000)
      hover()
      advance(3000)
      advance(3000)
      expectSlide(2)

      // The slide the user was on is kept, and a full new countdown starts now.
      unhover()
      advance(2999)
      expectSlide(2)
      advance(1)
      expectSlide(3)
      advance(3000)
      expectSlide(4)
    })

    it('does not stack timers after the mouse enters and leaves several times', () => {
      render(<App autoPlay />)
      for (let i = 0; i < 3; i++) {
        hover()
        unhover()
      }
      // At most one timer may be waiting, however often the mouse came and went.
      expect(vi.getTimerCount()).toBeLessThanOrEqual(1)
      advance(3000)
      expectSlide(2)
      advance(3000)
      expectSlide(3)
    })

    it('pauses when the mouse moves onto a button inside the carousel', () => {
      // Being over a child element (here the Next button) also counts as
      // being over the carousel, because the button is inside the section.
      render(<App autoPlay />)
      fireEvent.mouseEnter(nextButton())
      advance(3000)
      advance(3000)
      expectSlide(1)

      fireEvent.mouseLeave(nextButton())
      advance(2999)
      expectSlide(1)
      advance(1)
      expectSlide(2)
    })

    it('Prev, Next and the dots still work while the carousel is paused', () => {
      render(<App autoPlay />)
      hover()
      fireEvent.click(nextButton())
      expectSlide(2)
      fireEvent.click(dot(4))
      expectSlide(4)
      fireEvent.click(prevButton())
      expectSlide(3)
      advance(3000)
      advance(3000)
      expectSlide(3)
    })

    it('advances exactly one slide per interval in StrictMode (its timer is cleaned up)', () => {
      // StrictMode runs every effect twice on mount: set up, clean up, set up again.
      // Without a cleanup function there would be two timers and two steps per tick.
      render(
        <StrictMode>
          <App autoPlay />
        </StrictMode>,
      )
      advance(3000)
      expectSlide(2)
      advance(3000)
      expectSlide(3)
    })

    it('clears its timer when the component unmounts', () => {
      const { unmount } = render(<App autoPlay />)
      // While it is mounted, a timer is waiting to change the slide.
      expect(vi.getTimerCount()).toBeGreaterThan(0)
      unmount()
      expect(vi.getTimerCount()).toBe(0)
    })

    it('starts and stops when the autoPlay prop changes', () => {
      const { rerender } = render(<App autoPlay />)
      advance(3000)
      expectSlide(2)

      rerender(<App autoPlay={false} />)
      advance(3000)
      advance(3000)
      expectSlide(2)

      rerender(<App autoPlay />)
      advance(3000)
      expectSlide(3)
    })
  })
})
