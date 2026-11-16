import { fetchUser } from './api.js'
import { invalidateQueries, useQuery } from './useQuery.js'

// Reference solution for exercise 27 (the demo app).
// Key idea: UserBadge and UserCard both ask for the SAME key. They never talk
// to each other, yet the page makes ONE request and both update together,
// because both read the same cache entry.

const USER_KEY = 'user:1'

// One small custom hook, so both components are guaranteed to use the same key.
function useUser() {
  return useQuery(USER_KEY, () => fetchUser(1))
}

function UserBadge() {
  const { data, status, isFetching } = useUser()

  let content = 'Loading...'
  if (data) content = <strong>{data.name}</strong>
  else if (status === 'error') content = 'Unavailable'

  return (
    <section aria-label="User badge">
      {content}
      {data && isFetching && <small> Updating...</small>}
    </section>
  )
}

function UserCard() {
  const { data, error, status, isFetching, refetch } = useUser()

  return (
    <section aria-label="User card">
      {status === 'pending' && <p>Loading...</p>}
      {data && (
        <>
          <p>Name: {data.name}</p>
          <p>Email: {data.email}</p>
          <p>Request #{data.request}</p>
        </>
      )}
      {data && isFetching && <p>Updating...</p>}
      {status === 'error' && <p role="alert">Error: {error.message}</p>}
      <button onClick={() => refetch()}>Refetch</button>
    </section>
  )
}

export default function App() {
  return (
    <div>
      <h2>Mini query</h2>
      <UserBadge />
      <UserCard />
      <button onClick={() => invalidateQueries(USER_KEY)}>Invalidate user</button>
    </div>
  )
}
