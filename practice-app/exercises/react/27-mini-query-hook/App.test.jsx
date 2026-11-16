import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { fetchUser } from './api.js'
import { clearQueryCache } from './useQuery.js'

// The real api.js is replaced by a mock: no network and no timers.
// Every call to fetchUser returns a promise that THIS TEST settles by hand.
vi.mock('./api.js', () => ({ fetchUser: vi.fn() }))

const ADA = { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', request: 1 }
const ADA_V2 = { id: 1, name: 'Ada King', email: 'ada.king@example.com', request: 2 }

// One entry per fetchUser call, in call order: { resolve, reject }.
let requests

beforeEach(() => {
  clearQueryCache() // the cache is module-level: start every test from empty
  requests = []
  fetchUser.mockReset()
  fetchUser.mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        requests.push({ resolve, reject })
      }),
  )
})

// ---- helpers ---------------------------------------------------------------

function request(index) {
  expect(requests.length, `fetchUser call number ${index + 1} was never made`).toBeGreaterThan(index)
  return requests[index]
}

const succeed = (index, user) =>
  act(async () => {
    request(index).resolve(user)
  })
const fail = (index, message) =>
  act(async () => {
    request(index).reject(new Error(message))
  })

const card = () => within(screen.getByRole('region', { name: 'User card' }))
const badge = () => within(screen.getByRole('region', { name: 'User badge' }))

// ---- tests -----------------------------------------------------------------

describe('27 Mini query hook: demo app', () => {
  it('asks the API for user 1 only ONCE even though two components show it', () => {
    render(<App />)
    expect(fetchUser).toHaveBeenCalledTimes(1)
    expect(fetchUser).toHaveBeenCalledWith(1)
    expect(badge().getByText('Loading...')).toBeInTheDocument()
    expect(card().getByText('Loading...')).toBeInTheDocument()
    // The very first load is "Loading...", not "Updating...", and Refetch is always there.
    expect(screen.queryByText('Updating...')).not.toBeInTheDocument()
    expect(card().getByRole('button', { name: 'Refetch' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mini query' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invalidate user' })).toBeInTheDocument()
  })

  it('shows the user in both components when the data arrives', async () => {
    render(<App />)
    await succeed(0, ADA)
    expect(badge().getByText('Ada Lovelace')).toBeInTheDocument()
    expect(card().getByText('Name: Ada Lovelace')).toBeInTheDocument()
    expect(card().getByText('Email: ada@example.com')).toBeInTheDocument()
    expect(card().getByText('Request #1')).toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.queryByText('Updating...')).not.toBeInTheDocument()
  })

  it('Refetch updates both components and keeps the old data on screen meanwhile', async () => {
    const user = userEvent.setup()
    render(<App />)
    await succeed(0, ADA)

    await user.click(card().getByRole('button', { name: 'Refetch' }))
    expect(fetchUser).toHaveBeenCalledTimes(2)
    expect(badge().getByText('Updating...')).toBeInTheDocument()
    expect(card().getByText('Updating...')).toBeInTheDocument()
    expect(badge().getByText('Ada Lovelace')).toBeInTheDocument() // old data still there
    expect(card().getByText('Name: Ada Lovelace')).toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument() // only the first load says Loading
    expect(card().getByRole('button', { name: 'Refetch' })).toBeInTheDocument()

    await succeed(1, ADA_V2)
    expect(badge().getByText('Ada King')).toBeInTheDocument()
    expect(card().getByText('Name: Ada King')).toBeInTheDocument()
    expect(card().getByText('Email: ada.king@example.com')).toBeInTheDocument()
    expect(card().getByText('Request #2')).toBeInTheDocument()
    expect(screen.queryByText('Updating...')).not.toBeInTheDocument()
  })

  it('the "Invalidate user" button refetches the user', async () => {
    const user = userEvent.setup()
    render(<App />)
    await succeed(0, ADA)

    await user.click(screen.getByRole('button', { name: 'Invalidate user' }))
    expect(fetchUser).toHaveBeenCalledTimes(2)
    expect(badge().getByText('Updating...')).toBeInTheDocument()
    await succeed(1, ADA_V2)
    expect(badge().getByText('Ada King')).toBeInTheDocument()
    expect(card().getByText('Name: Ada King')).toBeInTheDocument()
  })

  it('shows an error alert in the card and "Unavailable" in the badge when loading fails', async () => {
    render(<App />)
    await fail(0, 'Server down')
    expect(card().getByRole('alert')).toHaveTextContent('Error: Server down')
    expect(badge().getByText('Unavailable')).toBeInTheDocument()
    expect(badge().queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('a failed refetch keeps the old data and shows the alert, a later success removes it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await succeed(0, ADA)

    await user.click(card().getByRole('button', { name: 'Refetch' }))
    await fail(1, 'Server down')
    expect(card().getByRole('alert')).toHaveTextContent('Error: Server down')
    expect(card().getByText('Name: Ada Lovelace')).toBeInTheDocument()
    expect(badge().getByText('Ada Lovelace')).toBeInTheDocument()
    expect(badge().queryByText('Unavailable')).not.toBeInTheDocument() // there is data to show
    expect(screen.queryByText('Updating...')).not.toBeInTheDocument()

    await user.click(card().getByRole('button', { name: 'Refetch' }))
    await succeed(2, ADA_V2)
    expect(card().queryByRole('alert')).not.toBeInTheDocument()
    expect(card().getByText('Name: Ada King')).toBeInTheDocument()
  })

  it('Refetch after a failed first load tries again, and the error stays visible while it runs', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fail(0, 'Server down')

    await user.click(card().getByRole('button', { name: 'Refetch' }))
    expect(fetchUser).toHaveBeenCalledTimes(2)
    // The status only changes when a request settles, so the error is still shown.
    expect(card().getByRole('alert')).toHaveTextContent('Error: Server down')
    expect(badge().getByText('Unavailable')).toBeInTheDocument()
    expect(screen.queryByText('Updating...')).not.toBeInTheDocument() // there is no data to update
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()

    await succeed(1, ADA)
    expect(card().queryByRole('alert')).not.toBeInTheDocument()
    expect(badge().queryByText('Unavailable')).not.toBeInTheDocument()
    expect(badge().getByText('Ada Lovelace')).toBeInTheDocument()
    expect(card().getByText('Name: Ada Lovelace')).toBeInTheDocument()
  })
})
