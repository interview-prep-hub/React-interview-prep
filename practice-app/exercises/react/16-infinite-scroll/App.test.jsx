import { StrictMode } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import App from './App.jsx'
import { fetchPage } from './api.js'

// The real api.js waits 500 ms per page. Here the whole module is replaced by
// a mock, and the tests decide exactly when each page "arrives".
vi.mock('./api.js', () => ({ fetchPage: vi.fn() }))

// ---------------------------------------------------------------------------
// A fake IntersectionObserver (jsdom does not have one).
// It never reports anything on its own. A test calls reportVisibility() to say
// "the sentinel is now on screen / off screen".
// An observer counts as "live" while it is observing at least one element,
// so both disconnect() and unobserve() make it stop being live.
// ---------------------------------------------------------------------------
const observers = []

class FakeIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback
    this.options = options
    this.targets = new Set()
    observers.push(this)
  }

  observe(target) {
    this.targets.add(target)
  }

  unobserve(target) {
    this.targets.delete(target)
  }

  disconnect() {
    this.targets.clear()
  }

  takeRecords() {
    return []
  }
}

const liveObservers = () => observers.filter((observer) => observer.targets.size > 0)

// Report the same visibility to every live observer, `times` times in a row,
// all inside ONE act() call (so React does not re-render in between).
function reportVisibility(isIntersecting, times = 1) {
  act(() => {
    for (let i = 0; i < times; i += 1) {
      for (const observer of liveObservers()) {
        const entries = [...observer.targets].map((target) => ({
          target,
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
        }))
        observer.callback(entries, observer)
      }
    }
  })
}

// ---------------------------------------------------------------------------
// A controllable fetchPage: every call is recorded and stays pending until the
// test answers it with respond().
// ---------------------------------------------------------------------------
const requests = []

function makePage(page, hasMore) {
  const items = Array.from({ length: 10 }, (_, index) => {
    const n = (page - 1) * 10 + index + 1
    return { id: n, title: `Item ${n}` }
  })
  return { items, hasMore }
}

async function respond(page, hasMore = true) {
  const request = requests.find((r) => r.page === page && !r.answered)
  expect(request, `fetchPage(${page}) should have been called before it can be answered`).toBeDefined()
  request.answered = true
  await act(async () => {
    request.resolve(makePage(page, hasMore))
  })
}

const pagesRequested = () => fetchPage.mock.calls.map(([page]) => page)
const timesRequested = (page) => pagesRequested().filter((p) => p === page).length

// Titles of the items currently in the list, in DOM order.
const titles = () =>
  screen.queryAllByRole('listitem').map((item) => item.textContent)

// 'Item 1' ... 'Item 20' and so on.
const expectedTitles = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, index) => `Item ${from + index}`)

beforeEach(() => {
  observers.length = 0
  requests.length = 0
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  fetchPage.mockReset()
  fetchPage.mockImplementation(
    (page) =>
      new Promise((resolve) => {
        requests.push({ page, resolve, answered: false })
      }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('16 Infinite scroll feed', () => {
  it('requests page 1 on mount and shows "Loading more..." while it loads', () => {
    render(<App />)
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith(1)
    expect(screen.getByText('Loading more...')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Feed' })).toBeInTheDocument()
    expect(titles()).toEqual([])
    expect(screen.queryByText('You reached the end')).not.toBeInTheDocument()
    // The sentinel is part of the page from the very first render.
    expect(screen.getByTestId('sentinel')).toBeInTheDocument()
  })

  it('shows the 10 items of page 1 when it arrives and hides the loading text', async () => {
    render(<App />)
    await respond(1)
    expect(titles()).toEqual(expectedTitles(1, 10))
    expect(screen.queryByText('Loading more...')).not.toBeInTheDocument()
    expect(screen.queryByText('You reached the end')).not.toBeInTheDocument()
  })

  it('renders the sentinel after the list, not inside it', async () => {
    render(<App />)
    await respond(1)
    const list = screen.getByRole('list', { name: 'Feed' })
    const sentinel = screen.getByTestId('sentinel')
    expect(within(list).queryByTestId('sentinel')).not.toBeInTheDocument()
    expect(list.compareDocumentPosition(sentinel)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('observes the sentinel with an IntersectionObserver once the first page is shown', async () => {
    render(<App />)
    await respond(1)
    const sentinel = screen.getByTestId('sentinel')
    expect(liveObservers().some((observer) => observer.targets.has(sentinel))).toBe(true)
  })

  it('loads page 2 and appends it when the sentinel becomes visible', async () => {
    render(<App />)
    await respond(1)
    reportVisibility(true)
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(fetchPage).toHaveBeenLastCalledWith(2)
    await respond(2)
    // Page 1 is still there and page 2 comes after it.
    expect(titles()).toEqual(expectedTitles(1, 20))
  })

  it('shows "Loading more..." only while a page is being fetched', async () => {
    render(<App />)
    await respond(1)
    expect(screen.queryByText('Loading more...')).not.toBeInTheDocument()

    reportVisibility(true)
    expect(screen.getByText('Loading more...')).toBeInTheDocument()
    // The items that are already loaded stay on screen while the next page loads.
    expect(titles()).toEqual(expectedTitles(1, 10))

    await respond(2)
    expect(screen.queryByText('Loading more...')).not.toBeInTheDocument()
  })

  it('does nothing when the observer reports that the sentinel is not visible', async () => {
    render(<App />)
    await respond(1)
    reportVisibility(false)
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Loading more...')).not.toBeInTheDocument()

    reportVisibility(true)
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('never requests the same page twice while a request is in flight', async () => {
    render(<App />)
    await respond(1)

    // Three reports before React can re-render, then one more while page 2 is still loading.
    reportVisibility(true, 3)
    reportVisibility(true)

    expect(timesRequested(2)).toBe(1)
    expect(fetchPage).toHaveBeenCalledTimes(2)

    await respond(2)
    expect(titles()).toEqual(expectedTitles(1, 20))
  })

  it('does not start another request while the first page is still loading', async () => {
    render(<App />)
    // A real observer reports the sentinel right after it starts watching,
    // which can be before page 1 has arrived. That must not request anything.
    reportVisibility(true, 2)
    expect(pagesRequested()).toEqual([1])

    await respond(1)
    expect(pagesRequested()).toEqual([1])
    expect(titles()).toEqual(expectedTitles(1, 10))
  })

  it('loads the pages one at a time, in order', async () => {
    render(<App />)
    await respond(1)
    for (const page of [2, 3, 4]) {
      reportVisibility(true)
      await respond(page)
    }
    expect(pagesRequested()).toEqual([1, 2, 3, 4])
    expect(titles()).toEqual(expectedTitles(1, 40))
  })

  it('shows "You reached the end" when hasMore is false and never loads again', async () => {
    render(<App />)
    await respond(1)
    expect(screen.queryByText('You reached the end')).not.toBeInTheDocument()

    reportVisibility(true)
    await respond(2, false)

    expect(screen.getByText('You reached the end')).toBeInTheDocument()
    expect(screen.queryByText('Loading more...')).not.toBeInTheDocument()
    expect(titles()).toEqual(expectedTitles(1, 20))

    // Even if the sentinel is reported again, no new page is requested.
    reportVisibility(true, 2)
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('sentinel')).toBeInTheDocument()
  })

  it('shows the end message at once when page 1 already says there is nothing more', async () => {
    render(<App />)
    await respond(1, false)
    expect(titles()).toEqual(expectedTitles(1, 10))
    expect(screen.getByText('You reached the end')).toBeInTheDocument()

    reportVisibility(true)
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('disconnects its observer when the component unmounts', async () => {
    const { unmount } = render(<App />)
    await respond(1)
    expect(liveObservers().length).toBeGreaterThan(0)

    unmount()
    expect(liveObservers()).toHaveLength(0)
  })

  it('does not leave old observers behind while pages keep loading', async () => {
    render(<App />)
    await respond(1)
    expect(liveObservers().length).toBeLessThanOrEqual(1)

    for (const page of [2, 3]) {
      reportVisibility(true)
      await respond(page)
      expect(liveObservers().length).toBeLessThanOrEqual(1)
    }
  })

  it('requests each page only once even inside React.StrictMode', async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    // StrictMode runs effects twice in development, the first page must still be requested once.
    expect(fetchPage).toHaveBeenCalledTimes(1)
    await respond(1)
    expect(titles()).toEqual(expectedTitles(1, 10))
    expect(liveObservers().length).toBeLessThanOrEqual(1)

    reportVisibility(true)
    expect(timesRequested(2)).toBe(1)
    await respond(2)
    expect(titles()).toEqual(expectedTitles(1, 20))
  })
})
