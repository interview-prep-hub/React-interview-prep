import { StrictMode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import App from './App.jsx'

// The timeline from the README: each light and how long it stays on (ms).
const CYCLE = [
  ['red', 3000],
  ['green', 2000],
  ['yellow', 1000],
]

// Move the fake clock forward. Each call must cross AT MOST ONE change of
// light, so React gets a chance to re-run your effect before the next timer.
function advance(ms) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

// Several separate clock jumps, one after the other.
function advanceInSteps(...steps) {
  steps.forEach(advance)
}

// The text and exactly one lamp must agree on the active light.
function expectLight(name) {
  expect(screen.getByTestId('active-light')).toHaveTextContent(new RegExp(`^${name}$`))
  for (const [lamp] of CYCLE) {
    const el = screen.getByLabelText(`${lamp} lamp`)
    if (lamp === name) {
      expect(el).toHaveAttribute('data-on', 'true')
    } else {
      expect(el).not.toHaveAttribute('data-on', 'true')
    }
  }
}

describe('10 Traffic light', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    // Unmount while the fake timers are still installed, then go back to real ones.
    cleanup()
    vi.useRealTimers()
  })

  it('starts at red, with only the red lamp on', () => {
    render(<App />)
    expectLight('red')
  })

  it('renders three lamps labelled red, green and yellow', () => {
    render(<App />)
    expect(screen.getAllByLabelText(/ lamp$/i)).toHaveLength(3)
    expect(screen.getByLabelText('red lamp')).toBeInTheDocument()
    expect(screen.getByLabelText('green lamp')).toBeInTheDocument()
    expect(screen.getByLabelText('yellow lamp')).toBeInTheDocument()
  })

  it('stays red for 3000 ms, then turns green', () => {
    render(<App />)
    advance(2999)
    expectLight('red')
    advance(1)
    expectLight('green')
  })

  it('stays green for 2000 ms, then turns yellow', () => {
    render(<App />)
    advance(3000)
    expectLight('green')
    advance(1999)
    expectLight('green')
    advance(1)
    expectLight('yellow')
  })

  it('stays yellow for 1000 ms, then turns red again', () => {
    render(<App />)
    advanceInSteps(3000, 2000)
    expectLight('yellow')
    advance(999)
    expectLight('yellow')
    advance(1)
    expectLight('red')
  })

  it('does not restart the current light when the component re-renders', () => {
    const { rerender } = render(<App />)
    // A re-render from outside (for example the parent re-renders) in the
    // middle of red must not give red a fresh 3000 ms.
    advance(1500)
    rerender(<App />)
    advance(1499)
    expectLight('red')
    advance(1)
    expectLight('green')

    // The same in the middle of green.
    advance(1000)
    rerender(<App />)
    advance(999)
    expectLight('green')
    advance(1)
    expectLight('yellow')
  })

  it('repeats the cycle forever (checked over three full cycles)', () => {
    render(<App />)
    for (let round = 0; round < 3; round++) {
      for (const [light, duration] of CYCLE) {
        expectLight(light)
        advance(duration - 1)
        expectLight(light)
        advance(1)
      }
    }
    // After exactly three full cycles we are back at the start.
    expectLight('red')
  })

  it('keeps cycling long after the first few rounds (50 rounds)', () => {
    render(<App />)
    for (let round = 0; round < 50; round++) {
      advanceInSteps(3000, 2000, 1000)
    }
    expectLight('red')
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    advance(3000)
    expectLight('green')
  })

  it('keeps the same timing in StrictMode (no doubled timers)', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    for (const [light, duration] of [...CYCLE, ...CYCLE]) {
      expectLight(light)
      advance(duration - 1)
      expectLight(light)
      advance(1)
    }
    expectLight('red')
  })

  it('clears its timer on unmount', () => {
    const { unmount } = render(<App />)
    // While mounted, something is scheduled.
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('leaves no timer behind in StrictMode either', () => {
    const { unmount } = render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([
    ['red', [1500]],
    ['green', [3000, 500]],
    ['yellow', [3000, 2000, 500]],
  ])('leaves no timer behind when unmounted while %s is on', (light, steps) => {
    const { unmount } = render(<App />)
    advanceInSteps(...steps)
    expectLight(light)
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    // Time can pass after unmount without anything firing or crashing.
    advance(10000)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('starts again at red, with a full 3000 ms, after a new mount', () => {
    const first = render(<App />)
    advanceInSteps(3000, 500)
    expectLight('green')
    first.unmount()

    render(<App />)
    expectLight('red')
    advance(2999)
    expectLight('red')
    advance(1)
    expectLight('green')
  })
})
