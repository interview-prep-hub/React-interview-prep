import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App.jsx'
import { searchCountries } from './api.js'

// The real api.js waits 100 ms. Here it is replaced by a mock, so the tests
// decide what the "server" answers and exactly WHEN the answer arrives.
vi.mock('./api.js', () => ({ searchCountries: vi.fn() }))

// A promise that we resolve by hand. It lets a test keep a request "in flight"
// and then deliver the response at the exact moment we want.
function deferred() {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}

// Move the fake clock forward and let React and pending promises settle.
async function advance(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

// Deliver the response of a request that was kept in flight.
async function respond(request, names) {
  await act(async () => {
    request.resolve(names)
  })
}

function renderApp(ui = <App />) {
  return render(ui)
}

function input() {
  return screen.getByLabelText(/search countries/i)
}

// Simulate the user changing the text in the input to `value`.
function type(value) {
  fireEvent.change(input(), { target: { value } })
}

// The names currently shown as suggestions (the <li> elements).
function suggestions() {
  return screen.queryAllByRole('listitem').map((li) => li.textContent)
}

// The texts the component sent to the API, in order. Only the first argument
// counts, so passing extra options (for example an AbortSignal) is fine.
function queries() {
  return searchCountries.mock.calls.map((call) => call[0])
}

describe('12 Autocomplete with debounce', () => {
  beforeEach(() => {
    // Only fake the two timer functions the component needs.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    searchCountries.mockReset()
    searchCountries.mockResolvedValue([])
  })

  afterEach(() => {
    // Unmount while the fake timers are still installed, then use real ones again.
    cleanup()
    vi.useRealTimers()
  })

  it('starts with an empty input, no messages, no list and no API call', async () => {
    renderApp()
    expect(input()).toHaveValue('')
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.queryByText('No results')).not.toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    await advance(1000)
    expect(queries()).toEqual([])
  })

  it('shows exactly what the user types, spaces included', async () => {
    renderApp()
    type('  in  ')
    expect(input()).toHaveValue('  in  ')
    // Still the same after the search ran: only the query is trimmed, not the input.
    await advance(300)
    expect(input()).toHaveValue('  in  ')
  })

  it('waits 300 ms after typing before it calls the API', async () => {
    renderApp()
    type('ind')
    await advance(299)
    expect(queries()).toEqual([])
    await advance(1)
    expect(queries()).toEqual(['ind'])
  })

  it('restarts the 300 ms wait on every keystroke and sends only the last text', async () => {
    renderApp()
    type('a')
    await advance(200)
    type('al')
    await advance(200)
    // 400 ms since the first key, but only 200 ms since the last one.
    expect(queries()).toEqual([])
    type('ali')
    await advance(299)
    expect(queries()).toEqual([])
    await advance(1)
    expect(queries()).toEqual(['ali'])
  })

  it('searches once and does not search again after the answer arrived', async () => {
    searchCountries.mockResolvedValue(['India'])
    renderApp()
    type('ind')
    await advance(300)
    expect(queries()).toEqual(['ind'])
    expect(suggestions()).toEqual(['India'])

    // Nothing changed in the input, so nothing may happen, however long we wait.
    await advance(5000)
    expect(queries()).toEqual(['ind'])
    expect(suggestions()).toEqual(['India'])
  })

  it('shows Loading... while the request is in flight, then the names', async () => {
    const request = deferred()
    searchCountries.mockReturnValue(request.promise)
    renderApp()
    type('ind')
    await advance(300)
    expect(queries()).toEqual(['ind'])
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(suggestions()).toEqual([])
    expect(screen.queryByText('No results')).not.toBeInTheDocument()

    await respond(request, ['India', 'Indonesia'])
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(suggestions()).toEqual(['India', 'Indonesia'])
    expect(screen.queryByText('No results')).not.toBeInTheDocument()
  })

  it('shows the names in the order the API returned them', async () => {
    // Deliberately not alphabetical.
    searchCountries.mockResolvedValue(['Spain', 'Chile', 'Brazil'])
    renderApp()
    type('i')
    await advance(300)
    expect(suggestions()).toEqual(['Spain', 'Chile', 'Brazil'])
  })

  it('shows "No results" (and no list) when the API returns an empty array', async () => {
    searchCountries.mockResolvedValue([])
    renderApp()
    type('zzz')
    await advance(300)
    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('treats spaces-only text as empty and trims the text it sends', async () => {
    searchCountries.mockResolvedValue(['India'])
    renderApp()
    type('   ')
    await advance(1000)
    expect(queries()).toEqual([])
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.queryByText('No results')).not.toBeInTheDocument()

    type('  in  ')
    await advance(300)
    expect(queries()).toEqual(['in'])
    expect(suggestions()).toEqual(['India'])
  })

  it('hides everything when the input is cleared, and does not call the API', async () => {
    searchCountries.mockResolvedValue(['India', 'Indonesia'])
    renderApp()
    type('ind')
    await advance(300)
    expect(suggestions()).toEqual(['India', 'Indonesia'])

    type('')
    expect(suggestions()).toEqual([])
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.queryByText('No results')).not.toBeInTheDocument()
    await advance(1000)
    expect(queries()).toEqual(['ind'])
    expect(suggestions()).toEqual([])
  })

  it('does not call the API when the input is cleared during the 300 ms wait', async () => {
    renderApp()
    type('ind')
    await advance(200)
    type('')
    await advance(1000)
    expect(queries()).toEqual([])
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.queryByText('No results')).not.toBeInTheDocument()
  })

  it('ignores a response that arrives after the input was cleared', async () => {
    const request = deferred()
    searchCountries.mockReturnValue(request.promise)
    renderApp()
    type('ind')
    await advance(300)
    expect(queries()).toEqual(['ind'])
    type('')
    await respond(request, ['India'])
    expect(suggestions()).toEqual([])
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.queryByText('No results')).not.toBeInTheDocument()
  })

  it('removes the list of the old text as soon as the text changes', async () => {
    const second = deferred()
    searchCountries.mockResolvedValueOnce(['India', 'Indonesia']).mockReturnValueOnce(second.promise)
    renderApp()
    type('ind')
    await advance(300)
    expect(suggestions()).toEqual(['India', 'Indonesia'])

    // The list belongs to "ind". With "indo" in the box it is stale, even
    // though the search for "indo" has not started yet.
    type('indo')
    expect(suggestions()).toEqual([])
    expect(screen.queryByText('No results')).not.toBeInTheDocument()

    await advance(300)
    expect(queries()).toEqual(['ind', 'indo'])
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(suggestions()).toEqual([])

    await respond(second, ['Indonesia'])
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(suggestions()).toEqual(['Indonesia'])
  })

  describe('stale responses (race conditions)', () => {
    // Two requests in flight: first for "a", then for "al".
    async function twoRequestsInFlight() {
      const first = deferred()
      const second = deferred()
      searchCountries.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      renderApp()
      type('a')
      await advance(300)
      type('al')
      await advance(300)
      expect(queries()).toEqual(['a', 'al'])
      return { first, second }
    }

    it('ignores an older response that arrives AFTER the newer one', async () => {
      const { first, second } = await twoRequestsInFlight()
      await respond(second, ['Albania', 'Algeria'])
      expect(suggestions()).toEqual(['Albania', 'Algeria'])

      await respond(first, ['Austria', 'Australia'])
      expect(suggestions()).toEqual(['Albania', 'Algeria'])
      expect(screen.queryByText('Austria')).not.toBeInTheDocument()
    })

    it('ignores an older response that arrives BEFORE the newer one', async () => {
      const { first, second } = await twoRequestsInFlight()
      await respond(first, ['Austria', 'Australia'])
      expect(suggestions()).toEqual([])
      expect(screen.queryByText('No results')).not.toBeInTheDocument()

      await respond(second, ['Albania', 'Algeria'])
      expect(suggestions()).toEqual(['Albania', 'Algeria'])
    })

    it('ignores a response for text that changed before the next search even started', async () => {
      const first = deferred()
      searchCountries.mockReturnValueOnce(first.promise).mockResolvedValue(['Albania'])
      renderApp()
      type('a')
      await advance(300)
      expect(queries()).toEqual(['a'])

      // The user types again, but the 300 ms for "al" have not passed yet.
      type('al')
      await respond(first, ['Austria', 'Australia'])
      expect(suggestions()).toEqual([])
      expect(screen.queryByText('No results')).not.toBeInTheDocument()

      await advance(300)
      expect(queries()).toEqual(['a', 'al'])
      expect(suggestions()).toEqual(['Albania'])
    })
  })

  describe('picking a suggestion', () => {
    beforeEach(() => {
      searchCountries.mockImplementation(async (query) =>
        query === 'ind' ? ['India', 'Indonesia'] : ['India'],
      )
    })

    it('fills the input and hides the list', async () => {
      renderApp()
      type('ind')
      await advance(300)
      expect(suggestions()).toEqual(['India', 'Indonesia'])

      fireEvent.click(screen.getByText('Indonesia'))
      expect(input()).toHaveValue('Indonesia')
      expect(suggestions()).toEqual([])
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      expect(screen.queryByText('No results')).not.toBeInTheDocument()
    })

    it('does not start another search, so the list stays hidden', async () => {
      renderApp()
      type('ind')
      await advance(300)
      fireEvent.click(screen.getByText('India'))

      await advance(1000)
      expect(queries()).toEqual(['ind'])
      expect(suggestions()).toEqual([])
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      expect(screen.queryByText('No results')).not.toBeInTheDocument()
    })

    it('searches again when the user edits the text after picking', async () => {
      renderApp()
      type('ind')
      await advance(300)
      fireEvent.click(screen.getByText('India'))

      type('Indi')
      await advance(300)
      expect(queries()).toEqual(['ind', 'Indi'])
      expect(suggestions()).toEqual(['India'])
    })

    it('also works when the picked name is exactly the text that was already typed', async () => {
      renderApp()
      type('India')
      await advance(300)
      expect(queries()).toEqual(['India'])
      expect(suggestions()).toEqual(['India'])

      // The text does not change here ("India" becomes "India"), but the list must close.
      fireEvent.click(screen.getByText('India'))
      expect(input()).toHaveValue('India')
      expect(suggestions()).toEqual([])
      await advance(1000)
      expect(queries()).toEqual(['India'])
      expect(suggestions()).toEqual([])

      // And the next edit must still start a search.
      type('Indi')
      await advance(300)
      expect(queries()).toEqual(['India', 'Indi'])
      expect(suggestions()).toEqual(['India'])
    })
  })

  describe('cleanup', () => {
    it('does not call the API after the component is unmounted', async () => {
      const { unmount } = renderApp()
      // Control: the search works while the component is mounted.
      type('a')
      await advance(300)
      expect(queries()).toEqual(['a'])

      type('al')
      unmount()
      await advance(1000)
      expect(queries()).toEqual(['a'])
    })

    it('calls the API once per search in StrictMode', async () => {
      searchCountries.mockResolvedValue(['India'])
      renderApp(
        <StrictMode>
          <App />
        </StrictMode>,
      )
      type('ind')
      await advance(300)
      expect(queries()).toEqual(['ind'])
      expect(suggestions()).toEqual(['India'])
      await advance(1000)
      expect(queries()).toEqual(['ind'])
    })
  })
})
