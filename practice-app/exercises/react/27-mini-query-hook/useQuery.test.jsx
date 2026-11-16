import { StrictMode, useState } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clearQueryCache, invalidateQueries, useQuery } from './useQuery.js'

// ---- test helpers ----------------------------------------------------------

// Only the clock is fake. Time moves ONLY when a test calls passTime(), so the
// staleTime tests are exact. Your code must read the clock with Date.now().
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  clearQueryCache() // the cache is module-level, so every test starts from empty
})

afterEach(() => {
  vi.useRealTimers()
})

const passTime = (ms) => vi.setSystemTime(Date.now() + ms)

// A fetcher that the TEST controls. Every call returns a promise that stays
// pending until the test calls resolve() or reject() (oldest request first).
// No network, no timers, no flakiness.
function makeFetcher() {
  const pending = []
  const fetcher = vi.fn(
    () =>
      new Promise((resolve, reject) => {
        pending.push({ resolve, reject })
      }),
  )
  const next = () => {
    expect(pending.length, 'there is no request waiting: the fetcher was not called').toBeGreaterThan(0)
    return pending.shift()
  }
  // act() lets React process the updates caused by the settled promise.
  return {
    fetcher,
    resolve: (value) =>
      act(async () => {
        next().resolve(value)
      }),
    reject: (message) =>
      act(async () => {
        next().reject(new Error(message))
      }),
  }
}

// Shows everything useQuery returns, as JSON, so tests can compare it at once.
// `onRender` (optional) receives what the hook returned on every render.
function Probe({ name, queryKey, fetcher, options, onRender }) {
  const { data, error, status, isFetching, refetch } = useQuery(queryKey, fetcher, options)
  const shown = { status, isFetching, data, error: error ? error.message : null }
  onRender?.(shown)
  return (
    <section aria-label={name}>
      <pre data-testid="state">{JSON.stringify(shown)}</pre>
      <button onClick={() => refetch()}>Refetch</button>
    </section>
  )
}

const box = (name) => within(screen.getByRole('region', { name }))
const stateOf = (name) => JSON.parse(box(name).getByTestId('state').textContent)

const PENDING = { status: 'pending', isFetching: true, data: undefined, error: null }
const success = (data) => ({ status: 'success', isFetching: false, data, error: null })

// ---- tests -----------------------------------------------------------------

describe('27 Mini query hook: useQuery', () => {
  describe('first load', () => {
    it('fetches on mount and reports pending while the request runs', () => {
      const { fetcher } = makeFetcher()
      render(<Probe name="A" queryKey="user" fetcher={fetcher} />)
      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(stateOf('A')).toEqual(PENDING)
    })

    it('reports success with the data when the request resolves', async () => {
      const f = makeFetcher()
      render(<Probe name="A" queryKey="user" fetcher={f.fetcher} />)
      await f.resolve({ name: 'Ada' })
      expect(stateOf('A')).toEqual(success({ name: 'Ada' }))
    })

    it('reports error (no data) when the first request fails', async () => {
      const f = makeFetcher()
      render(<Probe name="A" queryKey="user" fetcher={f.fetcher} />)
      await f.reject('boom')
      expect(stateOf('A')).toEqual({
        status: 'error',
        isFetching: false,
        data: undefined,
        error: 'boom',
      })
    })

    it('never fetches again just because the component re-renders, even with a new inline fetcher', async () => {
      const user = userEvent.setup()
      const f = makeFetcher()
      function InlineFetcher() {
        const [renders, setRenders] = useState(0)
        // A brand new function on EVERY render, like most real code.
        useQuery('inline', () => f.fetcher())
        return (
          <>
            <p data-testid="renders">{renders}</p>
            <button onClick={() => setRenders((n) => n + 1)}>Re-render</button>
          </>
        )
      }
      render(<InlineFetcher />)
      await f.resolve('data')
      await user.click(screen.getByRole('button', { name: 'Re-render' }))
      await user.click(screen.getByRole('button', { name: 'Re-render' }))
      expect(screen.getByTestId('renders')).toHaveTextContent('2')
      expect(f.fetcher).toHaveBeenCalledTimes(1)
    })
  })

  describe('request deduping', () => {
    it('two components with the same key trigger ONE fetch and both get the data', async () => {
      const f = makeFetcher()
      render(
        <>
          <Probe name="A" queryKey="user" fetcher={f.fetcher} />
          <Probe name="B" queryKey="user" fetcher={f.fetcher} />
        </>,
      )
      expect(f.fetcher).toHaveBeenCalledTimes(1)
      expect(stateOf('A')).toEqual(PENDING)
      expect(stateOf('B')).toEqual(PENDING)
      await f.resolve('shared')
      expect(stateOf('A')).toEqual(success('shared'))
      expect(stateOf('B')).toEqual(success('shared'))
      expect(f.fetcher).toHaveBeenCalledTimes(1)
    })

    it('a component that mounts while the request is still running joins it', async () => {
      const f = makeFetcher()
      const { rerender } = render(<Probe name="A" queryKey="user" fetcher={f.fetcher} />)
      rerender(
        <>
          <Probe name="A" queryKey="user" fetcher={f.fetcher} />
          <Probe name="B" queryKey="user" fetcher={f.fetcher} />
        </>,
      )
      expect(f.fetcher).toHaveBeenCalledTimes(1)
      expect(stateOf('B')).toEqual(PENDING)
      await f.resolve('late joiner')
      expect(stateOf('A')).toEqual(success('late joiner'))
      expect(stateOf('B')).toEqual(success('late joiner'))
    })

    it('still makes only one request under StrictMode (effects run twice)', () => {
      const { fetcher } = makeFetcher()
      render(
        <StrictMode>
          <Probe name="A" queryKey="user" fetcher={fetcher} />
        </StrictMode>,
      )
      expect(fetcher).toHaveBeenCalledTimes(1)
    })

    it('different keys are fetched and cached separately', async () => {
      const users = makeFetcher()
      const posts = makeFetcher()
      render(
        <>
          <Probe name="Users" queryKey="users" fetcher={users.fetcher} />
          <Probe name="Posts" queryKey="posts" fetcher={posts.fetcher} />
        </>,
      )
      expect(users.fetcher).toHaveBeenCalledTimes(1)
      expect(posts.fetcher).toHaveBeenCalledTimes(1)
      await posts.resolve(['p1'])
      expect(stateOf('Posts')).toEqual(success(['p1']))
      expect(stateOf('Users')).toEqual(PENDING)
    })

    it('refetch() while a request is already running does not start another one', async () => {
      const user = userEvent.setup()
      const f = makeFetcher()
      render(<Probe name="A" queryKey="user" fetcher={f.fetcher} />)
      await user.click(box('A').getByRole('button', { name: 'Refetch' }))
      await user.click(box('A').getByRole('button', { name: 'Refetch' }))
      expect(f.fetcher).toHaveBeenCalledTimes(1)
      await f.resolve('one')
      expect(stateOf('A')).toEqual(success('one'))
      // Once the request has finished, refetch() works again.
      await user.click(box('A').getByRole('button', { name: 'Refetch' }))
      expect(f.fetcher).toHaveBeenCalledTimes(2)
    })

    it('a request keeps running when its component unmounts, and a new component can join it', async () => {
      const f = makeFetcher()
      const { rerender } = render(<Probe name="A" queryKey="user" fetcher={f.fetcher} />)
      rerender(<p>nothing here</p>)
      rerender(<Probe name="B" queryKey="user" fetcher={f.fetcher} />)
      expect(f.fetcher).toHaveBeenCalledTimes(1) // B joins the request that A started
      expect(stateOf('B')).toEqual(PENDING)
      await f.resolve('shared')
      expect(stateOf('B')).toEqual(success('shared'))
    })

    it('invalidateQueries() while a request is already running does not start another one', async () => {
      const f = makeFetcher()
      render(<Probe name="A" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 60000 }} />)
      // First load is still running.
      act(() => {
        invalidateQueries('user')
      })
      expect(f.fetcher).toHaveBeenCalledTimes(1)
      await f.resolve('v1')

      // Now a refetch caused by invalidateQueries is running.
      act(() => {
        invalidateQueries('user')
      })
      expect(f.fetcher).toHaveBeenCalledTimes(2)
      act(() => {
        invalidateQueries('user')
      })
      expect(f.fetcher).toHaveBeenCalledTimes(2)
      await f.resolve('v2')
      expect(stateOf('A')).toEqual(success('v2'))
    })
  })

  describe('caching and staleTime', () => {
    it('keeps data in the cache after the component unmounts', async () => {
      const f = makeFetcher()
      const { rerender } = render(
        <Probe name="A" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 1000 }} />,
      )
      await f.resolve('cached')
      rerender(<p>nothing here</p>)
      const renders = []
      rerender(
        <Probe
          name="B"
          queryKey="user"
          fetcher={f.fetcher}
          options={{ staleTime: 1000 }}
          onRender={(shown) => renders.push(shown)}
        />,
      )
      expect(stateOf('B')).toEqual(success('cached'))
      // The cached data is there on the very FIRST render: no flash of "pending".
      expect(renders[0]).toEqual(success('cached'))
    })

    it('does not refetch when the data is still fresh (age below staleTime)', async () => {
      const f = makeFetcher()
      const { rerender } = render(
        <Probe name="A" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 1000 }} />,
      )
      await f.resolve('fresh')
      rerender(<p>nothing here</p>)
      passTime(999)
      rerender(<Probe name="B" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 1000 }} />)
      expect(f.fetcher).toHaveBeenCalledTimes(1)
      expect(stateOf('B')).toEqual(success('fresh'))
    })

    it('shows cached data AND refetches in the background once the data is stale', async () => {
      const f = makeFetcher()
      const { rerender } = render(
        <Probe name="A" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 1000 }} />,
      )
      await f.resolve('old')
      rerender(<p>nothing here</p>)
      passTime(1000) // age is exactly staleTime: stale
      rerender(<Probe name="B" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 1000 }} />)
      expect(f.fetcher).toHaveBeenCalledTimes(2)
      // Stale-while-revalidate: old data stays visible and isFetching is true.
      expect(stateOf('B')).toEqual({ status: 'success', isFetching: true, data: 'old', error: null })
      await f.resolve('new')
      expect(stateOf('B')).toEqual(success('new'))
    })

    it('treats data as stale immediately when staleTime is not given (default 0)', async () => {
      const f = makeFetcher()
      const { rerender } = render(<Probe name="A" queryKey="user" fetcher={f.fetcher} />)
      await f.resolve('v1')
      rerender(<p>nothing here</p>)
      rerender(<Probe name="B" queryKey="user" fetcher={f.fetcher} />) // no time has passed
      expect(f.fetcher).toHaveBeenCalledTimes(2)
      expect(stateOf('B')).toEqual({ status: 'success', isFetching: true, data: 'v1', error: null })
    })

    it('measures the age of the data from the moment the request succeeded, not from when it started', async () => {
      const f = makeFetcher()
      const options = { staleTime: 1000 }
      const { rerender } = render(<Probe name="A" queryKey="user" fetcher={f.fetcher} options={options} />)
      passTime(800) // a slow request: it succeeds 800 ms after it started
      await f.resolve('slow')
      rerender(<p>nothing here</p>)
      passTime(500) // 500 ms after the success (1300 ms after the start)
      rerender(<Probe name="B" queryKey="user" fetcher={f.fetcher} options={options} />)
      expect(f.fetcher).toHaveBeenCalledTimes(1)
      expect(stateOf('B')).toEqual(success('slow'))
    })

    it('mounting a component does not make the cached data any younger', async () => {
      const f = makeFetcher()
      const options = { staleTime: 1000 }
      const { rerender } = render(<Probe name="A" queryKey="user" fetcher={f.fetcher} options={options} />)
      await f.resolve('v1') // success at t = 0
      rerender(<p>nothing here</p>)

      passTime(600)
      rerender(<Probe name="B" queryKey="user" fetcher={f.fetcher} options={options} />)
      expect(f.fetcher).toHaveBeenCalledTimes(1) // 600 ms old: fresh
      rerender(<p>nothing here</p>)

      passTime(600)
      rerender(<Probe name="C" queryKey="user" fetcher={f.fetcher} options={options} />)
      expect(f.fetcher).toHaveBeenCalledTimes(2) // 1200 ms after the success: stale
    })

    it('a background refetch triggered by one component updates every component with that key', async () => {
      const f = makeFetcher()
      const { rerender } = render(
        <Probe name="A" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 5000 }} />,
      )
      await f.resolve('old')
      passTime(5000)
      rerender(
        <>
          <Probe name="A" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 5000 }} />
          <Probe name="B" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 5000 }} />
        </>,
      )
      expect(f.fetcher).toHaveBeenCalledTimes(2)
      expect(stateOf('A')).toEqual({ status: 'success', isFetching: true, data: 'old', error: null })
      expect(stateOf('B')).toEqual({ status: 'success', isFetching: true, data: 'old', error: null })
      await f.resolve('new')
      expect(stateOf('A')).toEqual(success('new'))
      expect(stateOf('B')).toEqual(success('new'))
    })

    it('stores a response that arrives after the component has already unmounted', async () => {
      const f = makeFetcher()
      const { rerender } = render(
        <Probe name="A" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 1000 }} />,
      )
      rerender(<p>nothing here</p>)
      await f.resolve('arrived late')
      rerender(<Probe name="B" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 1000 }} />)
      expect(f.fetcher).toHaveBeenCalledTimes(1)
      expect(stateOf('B')).toEqual(success('arrived late'))
    })

    it('switches to the new key when the key prop changes, and remembers the old key', async () => {
      const a = makeFetcher()
      const b = makeFetcher()
      const options = { staleTime: 10000 }
      const { rerender } = render(<Probe name="Q" queryKey="a" fetcher={a.fetcher} options={options} />)
      await a.resolve('data of a')

      rerender(<Probe name="Q" queryKey="b" fetcher={b.fetcher} options={options} />)
      expect(b.fetcher).toHaveBeenCalledTimes(1)
      expect(stateOf('Q')).toEqual(PENDING) // nothing is known about "b" yet
      await b.resolve('data of b')
      expect(stateOf('Q')).toEqual(success('data of b'))

      rerender(<Probe name="Q" queryKey="a" fetcher={a.fetcher} options={options} />)
      expect(stateOf('Q')).toEqual(success('data of a'))
      expect(a.fetcher).toHaveBeenCalledTimes(1) // still fresh, no new request
    })

    it('stops using the old key once the key has changed', async () => {
      const a = makeFetcher()
      const b = makeFetcher()
      const options = { staleTime: 60000 }
      const { rerender } = render(<Probe name="Q" queryKey="a" fetcher={a.fetcher} options={options} />)
      await a.resolve('data of a')
      rerender(<Probe name="Q" queryKey="b" fetcher={b.fetcher} options={options} />)
      await b.resolve('data of b')

      act(() => {
        invalidateQueries('a') // nobody is using "a" any more: no request
      })
      expect(a.fetcher).toHaveBeenCalledTimes(1)

      act(() => {
        invalidateQueries('b') // the component shows "b": request
      })
      expect(b.fetcher).toHaveBeenCalledTimes(2)
    })
  })

  describe('errors', () => {
    it('keeps the previous data when a refetch fails', async () => {
      const user = userEvent.setup()
      const f = makeFetcher()
      render(<Probe name="A" queryKey="user" fetcher={f.fetcher} />)
      await f.resolve('good data')
      await user.click(box('A').getByRole('button', { name: 'Refetch' }))
      await f.reject('boom')
      expect(stateOf('A')).toEqual({
        status: 'error',
        isFetching: false,
        data: 'good data',
        error: 'boom',
      })
    })

    it('keeps status "error" while retrying, then clears the error on success', async () => {
      const user = userEvent.setup()
      const f = makeFetcher()
      render(<Probe name="A" queryKey="user" fetcher={f.fetcher} />)
      await f.reject('boom')
      await user.click(box('A').getByRole('button', { name: 'Refetch' }))
      // The status only changes when a request settles.
      expect(stateOf('A')).toEqual({
        status: 'error',
        isFetching: true,
        data: undefined,
        error: 'boom',
      })
      await f.resolve('recovered')
      expect(stateOf('A')).toEqual(success('recovered'))
    })

    it('a component that mounts after a failed first load tries again, even if staleTime is long', async () => {
      const f = makeFetcher()
      const options = { staleTime: 60000 }
      const { rerender } = render(<Probe name="A" queryKey="user" fetcher={f.fetcher} options={options} />)
      await f.reject('boom')
      rerender(<p>nothing here</p>)
      rerender(<Probe name="B" queryKey="user" fetcher={f.fetcher} options={options} />)
      expect(f.fetcher).toHaveBeenCalledTimes(2)
      await f.resolve('second try')
      expect(stateOf('B')).toEqual(success('second try'))
    })

    it('also tries again after a failed refetch, although the old data is still young', async () => {
      const user = userEvent.setup()
      const f = makeFetcher()
      const options = { staleTime: 60000 }
      const { rerender } = render(<Probe name="A" queryKey="user" fetcher={f.fetcher} options={options} />)
      await f.resolve('v1')
      await user.click(box('A').getByRole('button', { name: 'Refetch' }))
      await f.reject('boom')
      rerender(<p>nothing here</p>)
      rerender(<Probe name="B" queryKey="user" fetcher={f.fetcher} options={options} />)
      expect(f.fetcher).toHaveBeenCalledTimes(3)
      expect(stateOf('B')).toEqual({ status: 'error', isFetching: true, data: 'v1', error: 'boom' })
      await f.resolve('v2')
      expect(stateOf('B')).toEqual(success('v2'))
    })

    it('puts the exact rejection value into error', async () => {
      const reason = { code: 503 } // not even an Error object
      let result
      function Capture() {
        result = useQuery('user', () => Promise.reject(reason))
        return null
      }
      render(<Capture />)
      await act(async () => {})
      expect(result.status).toBe('error')
      expect(result.error).toBe(reason)
    })

    it('treats a fetcher that throws straight away as a failed request', async () => {
      const fetcher = vi.fn(() => {
        throw new Error('sync failure')
      })
      render(<Probe name="A" queryKey="user" fetcher={fetcher} />)
      await act(async () => {})
      expect(stateOf('A')).toEqual({
        status: 'error',
        isFetching: false,
        data: undefined,
        error: 'sync failure',
      })
    })
  })

  describe('refetch', () => {
    it('refetch() keeps showing the data, sets isFetching, then shows the new data', async () => {
      const user = userEvent.setup()
      const f = makeFetcher()
      render(<Probe name="A" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 60000 }} />)
      await f.resolve('v1')
      await user.click(box('A').getByRole('button', { name: 'Refetch' }))
      expect(f.fetcher).toHaveBeenCalledTimes(2) // staleTime does not matter for refetch
      expect(stateOf('A')).toEqual({ status: 'success', isFetching: true, data: 'v1', error: null })
      await f.resolve('v2')
      expect(stateOf('A')).toEqual(success('v2'))
    })

    it('refetch() refreshes the key that is shown now, with the fetcher of the latest render', async () => {
      const user = userEvent.setup()
      const a = makeFetcher()
      const b1 = makeFetcher()
      const b2 = makeFetcher()
      const { rerender } = render(<Probe name="Q" queryKey="a" fetcher={a.fetcher} />)
      await a.resolve('data of a')
      rerender(<Probe name="Q" queryKey="b" fetcher={b1.fetcher} />)
      await b1.resolve('data of b')
      rerender(<Probe name="Q" queryKey="b" fetcher={b2.fetcher} />) // same key, new fetcher

      await user.click(box('Q').getByRole('button', { name: 'Refetch' }))
      expect(a.fetcher).toHaveBeenCalledTimes(1)
      expect(b1.fetcher).toHaveBeenCalledTimes(1)
      expect(b2.fetcher).toHaveBeenCalledTimes(1)
      await b2.resolve('new data of b')
      expect(stateOf('Q')).toEqual(success('new data of b'))
    })
  })

  describe('invalidateQueries', () => {
    it('refetches a key that is on screen, even when its data is still fresh', async () => {
      const f = makeFetcher()
      render(<Probe name="A" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 60000 }} />)
      await f.resolve('v1')
      expect(f.fetcher).toHaveBeenCalledTimes(1)

      act(() => {
        invalidateQueries('user')
      })
      expect(f.fetcher).toHaveBeenCalledTimes(2)
      expect(stateOf('A')).toEqual({ status: 'success', isFetching: true, data: 'v1', error: null })
      await f.resolve('v2')
      expect(stateOf('A')).toEqual(success('v2'))
    })

    it('makes ONE request for all components that use the key, and updates all of them', async () => {
      const f = makeFetcher()
      render(
        <>
          <Probe name="A" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 60000 }} />
          <Probe name="B" queryKey="user" fetcher={f.fetcher} options={{ staleTime: 60000 }} />
        </>,
      )
      await f.resolve('v1')
      act(() => {
        invalidateQueries('user')
      })
      expect(f.fetcher).toHaveBeenCalledTimes(2)
      await f.resolve('v2')
      expect(stateOf('A')).toEqual(success('v2'))
      expect(stateOf('B')).toEqual(success('v2'))
    })

    it('does not fetch right now when nothing is using the key, but the next mount refetches', async () => {
      const f = makeFetcher()
      const options = { staleTime: 60000 }
      const { rerender } = render(<Probe name="A" queryKey="user" fetcher={f.fetcher} options={options} />)
      await f.resolve('v1')
      rerender(<p>nothing here</p>)

      act(() => {
        invalidateQueries('user')
      })
      expect(f.fetcher).toHaveBeenCalledTimes(1) // nobody is looking: no request yet

      rerender(<Probe name="B" queryKey="user" fetcher={f.fetcher} options={options} />)
      expect(f.fetcher).toHaveBeenCalledTimes(2)
      expect(stateOf('B')).toEqual({ status: 'success', isFetching: true, data: 'v1', error: null })
    })

    it('runs the newest fetcher that a component passed in, even from a render that did not fetch', async () => {
      const first = makeFetcher()
      const second = makeFetcher()
      const options = { staleTime: 60000 }
      const { rerender } = render(<Probe name="A" queryKey="user" fetcher={first.fetcher} options={options} />)
      await first.resolve('v1')

      // A plain re-render with a new fetcher: fresh data, so no request now.
      rerender(<Probe name="A" queryKey="user" fetcher={second.fetcher} options={options} />)
      expect(second.fetcher).not.toHaveBeenCalled()

      act(() => {
        invalidateQueries('user')
      })
      expect(first.fetcher).toHaveBeenCalledTimes(1)
      expect(second.fetcher).toHaveBeenCalledTimes(1)
      await second.resolve('v2')
      expect(stateOf('A')).toEqual(success('v2'))
    })

    it('is a one-time mark: once the data was refetched it counts as fresh again', async () => {
      const f = makeFetcher()
      const options = { staleTime: 60000 }
      const { rerender } = render(<Probe name="A" queryKey="user" fetcher={f.fetcher} options={options} />)
      await f.resolve('v1')
      act(() => {
        invalidateQueries('user')
      })
      await f.resolve('v2')
      expect(f.fetcher).toHaveBeenCalledTimes(2)

      rerender(<p>nothing here</p>)
      rerender(<Probe name="B" queryKey="user" fetcher={f.fetcher} options={options} />)
      expect(f.fetcher).toHaveBeenCalledTimes(2) // v2 is fresh: no new request
      expect(stateOf('B')).toEqual(success('v2'))
    })

    it('only affects the key you pass', async () => {
      const users = makeFetcher()
      const posts = makeFetcher()
      const options = { staleTime: 60000 }
      render(
        <>
          <Probe name="Users" queryKey="users" fetcher={users.fetcher} options={options} />
          <Probe name="Posts" queryKey="posts" fetcher={posts.fetcher} options={options} />
        </>,
      )
      await users.resolve(['u1'])
      await posts.resolve(['p1'])
      act(() => {
        invalidateQueries('users')
      })
      expect(users.fetcher).toHaveBeenCalledTimes(2)
      expect(posts.fetcher).toHaveBeenCalledTimes(1)
      expect(stateOf('Posts')).toEqual(success(['p1']))
    })

    it('does nothing and does not crash for a key that was never used', () => {
      expect(() => invalidateQueries('never-used')).not.toThrow()
    })
  })

  describe('clearQueryCache', () => {
    it('forgets everything, so the next mount loads from scratch', async () => {
      const f = makeFetcher()
      const options = { staleTime: 60000 }
      const { rerender } = render(<Probe name="A" queryKey="user" fetcher={f.fetcher} options={options} />)
      await f.resolve('v1')
      rerender(<p>nothing here</p>)

      clearQueryCache()

      rerender(<Probe name="B" queryKey="user" fetcher={f.fetcher} options={options} />)
      expect(f.fetcher).toHaveBeenCalledTimes(2)
      expect(stateOf('B')).toEqual(PENDING) // no cached data any more
    })

    it('ignores a response that was requested before the cache was cleared', async () => {
      const f = makeFetcher()
      const { rerender } = render(<Probe name="A" queryKey="user" fetcher={f.fetcher} />)
      rerender(<p>nothing here</p>) // the first request is still running
      clearQueryCache()
      rerender(<Probe name="B" queryKey="user" fetcher={f.fetcher} />)
      expect(f.fetcher).toHaveBeenCalledTimes(2) // a fresh request in the fresh cache

      await f.resolve('answer to the old request') // oldest request first
      expect(stateOf('B')).toEqual(PENDING) // not for the new cache
      await f.resolve('answer to the new request')
      expect(stateOf('B')).toEqual(success('answer to the new request'))
    })
  })
})
