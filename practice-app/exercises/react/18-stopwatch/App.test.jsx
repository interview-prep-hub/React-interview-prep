import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App.jsx'

// All timing in these tests uses fake timers. vi.useFakeTimers() replaces
// setInterval, clearInterval AND Date, so Date.now() only moves when the test
// moves the clock. Nothing here waits for real time.

// Move the fake clock forward. Fake timers fire inside act(), so React can
// apply the state updates your interval callback makes.
function advance(ms) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

// Move ONLY the clock (Date.now()), without running any timer. This is what
// happens when the browser throttles timers in a background tab: the clock
// keeps going, but your interval callback runs late or rarely.
function jumpClock(ms) {
  vi.setSystemTime(Date.now() + ms)
}

const click = (name) => fireEvent.click(screen.getByRole('button', { name }))

const display = () => screen.getByTestId('display').textContent.trim()

// The text of every lap row, with runs of spaces collapsed to a single space.
function laps() {
  return screen
    .queryAllByRole('listitem')
    .map((li) => li.textContent.replace(/\s+/g, ' ').trim())
}

describe('18 Stopwatch', () => {
  let consoleError

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0, 0))
    // React reports mistakes such as a missing or duplicate list key with
    // console.error. Collect those calls quietly and check them after each test.
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Unmount while the fake timers are still installed, then use real ones again.
    cleanup()
    vi.useRealTimers()
    const reported = consoleError.mock.calls.map((args) => String(args[0]).slice(0, 160))
    consoleError.mockRestore()
    expect(reported, 'React logged errors or warnings (for example a missing list key)').toEqual([])
  })

  it('starts at 00:00.00 with Start, Reset and a disabled Lap button, and does not run by itself', () => {
    render(<App />)
    expect(display()).toBe('00:00.00')
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Lap' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument()
    expect(laps()).toEqual([])
    expect(vi.getTimerCount()).toBe(0)

    advance(2000)
    expect(display()).toBe('00:00.00')
  })

  it('Start begins counting, updates every 10 ms, and the button becomes Stop', () => {
    render(<App />)
    click('Start')
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument()

    for (let cs = 1; cs <= 5; cs++) {
      advance(10)
      expect(display()).toBe(`00:00.0${cs}`)
    }
    advance(1000)
    expect(display()).toBe('00:01.05')
  })

  it('formats minutes, seconds and centiseconds with leading zeros', () => {
    render(<App />)
    click('Start')

    advance(990)
    expect(display()).toBe('00:00.99')
    advance(10)
    expect(display()).toBe('00:01.00')
    advance(8970) // total 9.97 s
    expect(display()).toBe('00:09.97')
    advance(50) // total 10.02 s
    expect(display()).toBe('00:10.02')
    advance(49_980) // total 60.00 s
    expect(display()).toBe('01:00.00')
    advance(5_070) // total 65.07 s
    expect(display()).toBe('01:05.07')
  })

  it('keeps counting minutes past 99 instead of wrapping', () => {
    render(<App />)
    click('Start')
    // 100 minutes, 5 seconds and 40 centiseconds. The clock jumps, then the next
    // tick reads it. (Advancing 6 million ms one tick at a time would be slow.)
    jumpClock(6_005_390)
    advance(10)
    expect(display()).toBe('100:05.40')
  })

  it('Stop freezes the display, shows the time of the click, and clears the interval', () => {
    render(<App />)
    click('Start')
    advance(1239)
    click('Stop')

    // Truncated to centiseconds, not rounded: 1.239 s is 01.23.
    expect(display()).toBe('00:01.23')
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(0)

    advance(5000)
    expect(display()).toBe('00:01.23')
  })

  it('resumes from the accumulated time after a pause', () => {
    render(<App />)
    click('Start')
    advance(1000)
    click('Stop')
    expect(display()).toBe('00:01.00')

    advance(5000) // time passes while the watch is stopped
    expect(display()).toBe('00:01.00')

    click('Start')
    advance(500)
    expect(display()).toBe('00:01.50')

    click('Stop')
    advance(3000)
    click('Start')
    advance(250)
    expect(display()).toBe('00:01.75')
    click('Stop')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('Stop reads the clock itself, so the stopped time is exact even when the last tick was late', () => {
    render(<App />)
    click('Start')
    advance(1000)
    expect(display()).toBe('00:01.00')

    // 5 s pass on the clock, no tick runs, and the user clicks Stop right away.
    jumpClock(5000)
    click('Stop')
    expect(display()).toBe('00:06.00')
    expect(vi.getTimerCount()).toBe(0)

    // The exact time was kept, so the next run continues from it.
    click('Start')
    advance(10)
    expect(display()).toBe('00:06.01')
  })

  it('computes time from timestamps, so late ticks do not make it drift', () => {
    render(<App />)
    click('Start')
    advance(1000)
    expect(display()).toBe('00:01.00')

    // The clock moves 5 s while no tick runs, then one tick finally arrives.
    // Adding 10 ms per tick would show 00:01.01. Reading the clock shows 6.01 s.
    jumpClock(5000)
    advance(10)
    expect(display()).toBe('00:06.01')
  })

  it('Lap is enabled only while the watch is running', () => {
    render(<App />)
    const lapButton = screen.getByRole('button', { name: 'Lap' })
    expect(lapButton).toBeDisabled()

    click('Start')
    expect(lapButton).toBeEnabled()

    click('Stop')
    expect(lapButton).toBeDisabled()

    click('Start')
    expect(lapButton).toBeEnabled()
  })

  it('Lap appends the current time to a numbered list and the watch keeps running', () => {
    render(<App />)
    click('Start')

    advance(1230)
    click('Lap')
    expect(laps()).toEqual(['Lap 1 00:01.23'])
    expect(display()).toBe('00:01.23')

    advance(2270)
    click('Lap')
    expect(laps()).toEqual(['Lap 1 00:01.23', 'Lap 2 00:03.50'])

    advance(100)
    expect(display()).toBe('00:03.60')
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()
  })

  it('keeps two laps taken at the same instant as two separate rows', () => {
    render(<App />)
    click('Start')
    advance(1000)
    click('Lap')
    click('Lap') // same time again, nothing has moved
    expect(laps()).toEqual(['Lap 1 00:01.00', 'Lap 2 00:01.00'])

    advance(500)
    click('Lap')
    click('Stop')
    click('Start')
    click('Lap')
    expect(laps()).toEqual(['Lap 1 00:01.00', 'Lap 2 00:01.00', 'Lap 3 00:01.50', 'Lap 4 00:01.50'])
    // A lap time is not a unique key: React would log a duplicate key error here.
  })

  it('renders the laps in an ordered list, oldest first', () => {
    const { container } = render(<App />)
    click('Start')
    advance(100)
    click('Lap')
    advance(100)
    click('Lap')
    advance(100)
    click('Lap')

    const list = container.querySelector('ol')
    expect(list).not.toBeNull()
    const rows = [...list.querySelectorAll(':scope > li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim())
    expect(rows).toEqual(['Lap 1 00:00.10', 'Lap 2 00:00.20', 'Lap 3 00:00.30'])
  })

  it('keeps laps across Stop and Start, and counts on from the accumulated time', () => {
    render(<App />)
    click('Start')
    advance(500)
    click('Lap')
    click('Stop')
    expect(laps()).toEqual(['Lap 1 00:00.50'])

    advance(4000)
    click('Start')
    advance(500)
    click('Lap')
    expect(laps()).toEqual(['Lap 1 00:00.50', 'Lap 2 00:01.00'])
  })

  it('Reset stops a running watch, zeroes the display, clears the laps and clears the interval', () => {
    render(<App />)
    click('Start')
    advance(1500)
    click('Lap')
    expect(display()).toBe('00:01.50')
    expect(laps()).toHaveLength(1)

    click('Reset')
    expect(display()).toBe('00:00.00')
    expect(laps()).toEqual([])
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lap' })).toBeDisabled()
    expect(vi.getTimerCount()).toBe(0)

    advance(1000)
    expect(display()).toBe('00:00.00')

    // After a reset the watch starts again from zero.
    click('Start')
    advance(200)
    expect(display()).toBe('00:00.20')
  })

  it('Reset also works while the watch is stopped, and the next Lap is Lap 1 again', () => {
    render(<App />)
    click('Start')
    advance(700)
    click('Lap')
    click('Stop')
    expect(display()).toBe('00:00.70')

    click('Reset')
    expect(display()).toBe('00:00.00')
    expect(laps()).toEqual([])

    click('Start')
    advance(300)
    click('Lap')
    expect(laps()).toEqual(['Lap 1 00:00.30'])
  })

  it('clears the interval when the component unmounts', () => {
    const { unmount } = render(<App />)
    click('Start')
    advance(100)
    expect(display()).toBe('00:00.10')

    unmount()
    expect(vi.getTimerCount()).toBe(0)

    // Nothing is left to fire, so nothing can touch the removed component.
    expect(() => advance(1000)).not.toThrow()
  })

  it('works inside StrictMode (effects run twice in development) without leaving timers behind', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    click('Start')
    advance(1000)
    expect(display()).toBe('00:01.00')

    // StrictMode also runs state updater functions twice, so a Lap handler
    // that changes the old array in place would add the lap two times.
    click('Lap')
    expect(laps()).toEqual(['Lap 1 00:01.00'])

    click('Stop')
    expect(vi.getTimerCount()).toBe(0)
    advance(1000)
    expect(display()).toBe('00:01.00')
  })
})
