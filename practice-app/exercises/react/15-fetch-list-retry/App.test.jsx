import { StrictMode } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { fetchUsers } from './api.js'

// The real api.js is replaced by a mock: no network and no timers.
// Every call to fetchUsers returns a promise that THIS TEST settles by hand,
// so we decide exactly when (and in which order) the answers arrive.
vi.mock('./api.js', () => ({ fetchUsers: vi.fn() }))

// The users are NOT sorted by id or by name on purpose: the list must show them
// in the order the API sent them.
const PAGE_1 = [
  { id: 3, name: 'Grace Hopper' },
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' },
]
const PAGE_2 = [
  { id: 9, name: 'Linus Torvalds' },
  { id: 4, name: 'Barbara Liskov' },
  { id: 7, name: 'Dennis Ritchie' },
]
const PAGE_1_NAMES = ['Grace Hopper', 'Ada Lovelace', 'Alan Turing']
const PAGE_2_NAMES = ['Linus Torvalds', 'Barbara Liskov', 'Dennis Ritchie']
// An answer that must never be shown (it belongs to an old request).
const STALE = [{ id: 99, name: 'Stale Ada' }]

// One entry per fetchUsers call, in call order: { page, resolve, reject }.
let requests

// Promise rejections that nobody handled. A test fails if it leaves one behind.
let unhandled
const onUnhandled = (reason) => {
  unhandled.push(reason)
}

beforeEach(() => {
  unhandled = []
  process.on('unhandledRejection', onUnhandled)
  requests = []
  fetchUsers.mockReset()
  fetchUsers.mockImplementation((page, options) => {
    let resolve
    let reject
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    // A real fetch rejects with an AbortError when its signal is aborted.
    // Do the same, so a solution that uses AbortController works here too.
    options?.signal?.addEventListener('abort', () =>
      reject(new DOMException('Aborted', 'AbortError')),
    )
    requests.push({ page, resolve, reject })
    return promise
  })
})

afterEach(async () => {
  // Node reports an unhandled rejection only after the current microtasks are
  // done, so give it one turn of the event loop (no real waiting involved).
  await new Promise((resolve) => setTimeout(resolve, 0))
  process.off('unhandledRejection', onUnhandled)
  expect(unhandled, 'a rejected promise was never handled (add a catch)').toEqual([])
})

// ---- helpers ---------------------------------------------------------------

function request(index) {
  expect(requests.length, `fetchUsers call number ${index + 1} was never made`).toBeGreaterThan(
    index,
  )
  return requests[index]
}

// act() lets React process the state updates caused by the settled promise.
const succeed = (req, users) =>
  act(async () => {
    req.resolve(users)
  })
const fail = (req, message) =>
  act(async () => {
    req.reject(new Error(message))
  })

const pageButton = (n) => screen.getByRole('button', { name: `Page ${n}` })
const retryButton = () => screen.queryByRole('button', { name: 'Retry' })
const userList = () => screen.queryByRole('list', { name: 'Users' })
const names = () =>
  within(screen.getByRole('list', { name: 'Users' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent)
const expectLoading = () => expect(screen.getByRole('status')).toHaveTextContent('Loading...')
const expectNotLoading = () => expect(screen.queryByText('Loading...')).not.toBeInTheDocument()

// ---- tests -----------------------------------------------------------------

describe('15 Fetch list with retry and race protection', () => {
  describe('loading and success', () => {
    it('requests page 1 once and shows Loading... at first', () => {
      render(<App />)
      expect(requests.map((r) => r.page)).toEqual([1])
      expectLoading()
      expect(userList()).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('marks Page 1 as the current page at first', () => {
      render(<App />)
      expect(pageButton(1)).toHaveAttribute('aria-pressed', 'true')
      expect(pageButton(2)).toHaveAttribute('aria-pressed', 'false')
    })

    it('shows the names as a list when the request succeeds', async () => {
      render(<App />)
      await succeed(request(0), PAGE_1)
      expectNotLoading()
      expect(names()).toEqual(PAGE_1_NAMES)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(retryButton()).not.toBeInTheDocument()
    })
  })

  describe('errors and retry', () => {
    it('shows the error message and a Retry button when the request fails', async () => {
      render(<App />)
      await fail(request(0), 'Network down')
      expect(screen.getByRole('alert')).toHaveTextContent('Network down')
      expect(retryButton()).toBeInTheDocument()
      expectNotLoading()
      expect(userList()).not.toBeInTheDocument()
    })

    it('Retry asks for the same page again and shows the data when it works', async () => {
      const user = userEvent.setup()
      render(<App />)
      await fail(request(0), 'Network down')

      await user.click(screen.getByRole('button', { name: 'Retry' }))
      expect(requests.map((r) => r.page)).toEqual([1, 1])
      expectLoading()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(retryButton()).not.toBeInTheDocument()

      await succeed(request(1), PAGE_1)
      expect(names()).toEqual(PAGE_1_NAMES)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(retryButton()).not.toBeInTheDocument()
    })

    it('shows the new error and a Retry button again when the retry also fails', async () => {
      const user = userEvent.setup()
      render(<App />)
      await fail(request(0), 'Network down')

      await user.click(screen.getByRole('button', { name: 'Retry' }))
      await fail(request(1), 'Still down')

      expect(screen.getByRole('alert')).toHaveTextContent('Still down')
      expect(screen.getByRole('alert')).not.toHaveTextContent('Network down')
      expect(retryButton()).toBeInTheDocument()
      expect(requests).toHaveLength(2)
    })

    it('Retry works every time it is needed, not only the first time', async () => {
      const user = userEvent.setup()
      render(<App />)
      await fail(request(0), 'First failure')
      await user.click(screen.getByRole('button', { name: 'Retry' }))
      await fail(request(1), 'Second failure')

      await user.click(screen.getByRole('button', { name: 'Retry' }))
      expect(requests.map((r) => r.page)).toEqual([1, 1, 1])
      expectLoading()

      await succeed(request(2), PAGE_1)
      expect(names()).toEqual(PAGE_1_NAMES)
    })

    it('Retry reloads the CURRENT page (page 2), not page 1', async () => {
      const user = userEvent.setup()
      render(<App />)
      await succeed(request(0), PAGE_1)

      await user.click(pageButton(2))
      await fail(request(1), 'Boom')
      await user.click(screen.getByRole('button', { name: 'Retry' }))
      expect(requests.map((r) => r.page)).toEqual([1, 2, 2])

      await succeed(request(2), PAGE_2)
      expect(names()).toEqual(PAGE_2_NAMES)
    })

    it('removes the error when another page is chosen', async () => {
      const user = userEvent.setup()
      render(<App />)
      await fail(request(0), 'Network down')

      await user.click(pageButton(2))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(retryButton()).not.toBeInTheDocument()
      expectLoading()

      await succeed(request(1), PAGE_2)
      expect(names()).toEqual(PAGE_2_NAMES)
    })
  })

  describe('switching pages', () => {
    it('loads page 2 when Page 2 is clicked and hides the old list while loading', async () => {
      const user = userEvent.setup()
      render(<App />)
      await succeed(request(0), PAGE_1)

      await user.click(pageButton(2))
      expect(requests.map((r) => r.page)).toEqual([1, 2])
      // The page indicator changes at once, before any data arrives.
      expect(pageButton(2)).toHaveAttribute('aria-pressed', 'true')
      expect(pageButton(1)).toHaveAttribute('aria-pressed', 'false')
      expectLoading()
      expect(userList()).not.toBeInTheDocument()

      await succeed(request(1), PAGE_2)
      expectNotLoading()
      expect(names()).toEqual(PAGE_2_NAMES)
    })

    it('does not request anything when the current page button is clicked', async () => {
      const user = userEvent.setup()
      render(<App />)
      await succeed(request(0), PAGE_1)

      await user.click(pageButton(1))
      expect(requests).toHaveLength(1)
      expect(names()).toEqual(PAGE_1_NAMES)
      expectNotLoading()
    })

    it('does not request anything when the current page button is clicked while loading', async () => {
      const user = userEvent.setup()
      render(<App />)

      await user.click(pageButton(1))
      expect(requests).toHaveLength(1)
      expectLoading()

      await succeed(request(0), PAGE_1)
      expect(names()).toEqual(PAGE_1_NAMES)
    })

    it('does not request anything when the current page button is clicked after an error', async () => {
      const user = userEvent.setup()
      render(<App />)
      await fail(request(0), 'Network down')

      await user.click(pageButton(1))
      expect(requests).toHaveLength(1)
      expect(screen.getByRole('alert')).toHaveTextContent('Network down')
      expect(retryButton()).toBeInTheDocument()
      expectNotLoading()
    })

    it('requests a page again every time you come back to it (no cache)', async () => {
      const user = userEvent.setup()
      render(<App />)
      await succeed(request(0), PAGE_1)
      await user.click(pageButton(2))
      await succeed(request(1), PAGE_2)

      await user.click(pageButton(1))
      expect(requests.map((r) => r.page)).toEqual([1, 2, 1])
      expectLoading()

      await succeed(request(2), PAGE_1)
      expect(names()).toEqual(PAGE_1_NAMES)
    })
  })

  describe('race conditions', () => {
    it('ignores the late answer of the previous page when answers arrive out of order', async () => {
      const user = userEvent.setup()
      render(<App />)
      // Page 1 is still loading when the user switches to page 2.
      await user.click(pageButton(2))

      await succeed(request(1), PAGE_2) // the newer request answers first
      await succeed(request(0), PAGE_1) // the older request answers last

      expect(names()).toEqual(PAGE_2_NAMES)
      expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
      expect(pageButton(2)).toHaveAttribute('aria-pressed', 'true')
    })

    it('does not show the previous page while the new page is still loading', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(pageButton(2))

      await succeed(request(0), PAGE_1) // answer for the page we already left
      expectLoading()
      expect(userList()).not.toBeInTheDocument()
      expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()

      await succeed(request(1), PAGE_2)
      expect(names()).toEqual(PAGE_2_NAMES)
    })

    it('ignores an error from the previous page while the new page is loading', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(pageButton(2))

      await fail(request(0), 'Old failure')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(retryButton()).not.toBeInTheDocument()
      expectLoading()

      await succeed(request(1), PAGE_2)
      expect(names()).toEqual(PAGE_2_NAMES)
    })

    it('ignores an error from the previous page that arrives after the new page loaded', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(pageButton(2))
      await succeed(request(1), PAGE_2)

      await fail(request(0), 'Old failure')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(retryButton()).not.toBeInTheDocument()
      expect(names()).toEqual(PAGE_2_NAMES)
    })

    // Page 1, then page 2, then page 1 again: request 0 and request 2 are both
    // for page 1. Comparing page numbers cannot tell them apart, so only the
    // answer of the LAST request may be shown.
    it('ignores the answer of an earlier request for the SAME page (page 1, 2, 1)', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(pageButton(2))
      await user.click(pageButton(1))
      expect(requests.map((r) => r.page)).toEqual([1, 2, 1])

      await succeed(request(0), STALE)
      expectLoading()
      expect(userList()).not.toBeInTheDocument()
      expect(screen.queryByText('Stale Ada')).not.toBeInTheDocument()

      await succeed(request(1), PAGE_2)
      expectLoading()
      expect(userList()).not.toBeInTheDocument()

      await succeed(request(2), PAGE_1)
      expect(names()).toEqual(PAGE_1_NAMES)
    })

    it('ignores an error from an earlier request for the SAME page (page 1, 2, 1)', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(pageButton(2))
      await user.click(pageButton(1))

      await fail(request(0), 'Old failure')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(retryButton()).not.toBeInTheDocument()
      expectLoading()

      await succeed(request(2), PAGE_1)
      expect(names()).toEqual(PAGE_1_NAMES)
    })

    it('ignores the answer of a retried request when the user switched page meanwhile', async () => {
      const user = userEvent.setup()
      render(<App />)
      await fail(request(0), 'Network down')
      await user.click(screen.getByRole('button', { name: 'Retry' }))
      await user.click(pageButton(2))
      expect(requests.map((r) => r.page)).toEqual([1, 1, 2])

      await succeed(request(1), PAGE_1) // the retry for page 1 answers late
      expectLoading()
      expect(userList()).not.toBeInTheDocument()

      await succeed(request(2), PAGE_2)
      expect(names()).toEqual(PAGE_2_NAMES)
    })
  })

  describe('StrictMode (the dev playground uses it)', () => {
    it('ends on the data of the newest request when the effect runs twice', async () => {
      render(
        <StrictMode>
          <App />
        </StrictMode>,
      )
      // In development, StrictMode runs the effect, its cleanup, and the effect
      // again, so page 1 may be requested twice. Only the newest request counts.
      request(0)
      const last = requests.length - 1
      for (const req of requests.slice(0, last)) await succeed(req, STALE)
      expectLoading()
      expect(screen.queryByText('Stale Ada')).not.toBeInTheDocument()

      await succeed(request(last), PAGE_1)
      expect(names()).toEqual(PAGE_1_NAMES)
    })
  })

  describe('unmount', () => {
    let consoleError

    beforeEach(() => {
      consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleError.mockRestore()
    })

    it('does nothing and logs no error when the answer arrives after unmount', async () => {
      const { unmount } = render(<App />)
      expect(requests).toHaveLength(1)
      unmount()

      await succeed(request(0), PAGE_1)
      expect(consoleError).not.toHaveBeenCalled()
    })

    it('does nothing and logs no error when the request fails after unmount', async () => {
      const { unmount } = render(<App />)
      expect(requests).toHaveLength(1)
      unmount()

      // An error nobody handles is an unhandled rejection: the afterEach hook
      // at the top of this file fails the test when that happens.
      await fail(request(0), 'Network down')
      expect(consoleError).not.toHaveBeenCalled()
    })
  })
})
