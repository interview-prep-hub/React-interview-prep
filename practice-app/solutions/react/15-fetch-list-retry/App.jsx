import { useEffect, useState } from 'react'
import { fetchUsers } from './api.js'

// Reference solution for exercise 15.
// Key ideas:
// - ONE state object holds status, users and error, so they can never disagree
//   (for example "success" together with an old error message)
// - the effect depends on [page, attempt]. Changing the page OR bumping
//   `attempt` (the Retry button) starts a new request
// - every run of the effect gets its OWN `ignore` flag. The cleanup function
//   flips it, so an answer to an old request is thrown away. This fixes the
//   race condition AND the "answer arrives after unmount" case in one place
// - the flag belongs to one run, not to a page number, so it also works for
//   Page 1, Page 2, Page 1 (two requests for page 1) and for StrictMode, which
//   runs the effect, its cleanup and the effect again in development

const PAGES = [1, 2]

export default function App() {
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [request, setRequest] = useState({ status: 'loading', users: [], error: null })

  useEffect(() => {
    let ignore = false

    async function load() {
      // A new request starts: hide the old list or error right away.
      setRequest({ status: 'loading', users: [], error: null })
      try {
        const users = await fetchUsers(page)
        if (!ignore) setRequest({ status: 'success', users, error: null })
      } catch (error) {
        if (!ignore) setRequest({ status: 'error', users: [], error })
      }
    }

    load()

    // Runs before the next effect and on unmount: whatever this request
    // brings back later is no longer wanted.
    return () => {
      ignore = true
    }
  }, [page, attempt])

  return (
    <div>
      <h2>Users</h2>

      <div>
        {PAGES.map((p) => (
          <button key={p} type="button" aria-pressed={p === page} onClick={() => setPage(p)}>
            Page {p}
          </button>
        ))}
      </div>

      {request.status === 'loading' && <p role="status">Loading...</p>}

      {request.status === 'error' && (
        <div>
          <p role="alert">Could not load users: {request.error.message}</p>
          <button type="button" onClick={() => setAttempt((a) => a + 1)}>
            Retry
          </button>
        </div>
      )}

      {request.status === 'success' && (
        <ul aria-label="Users">
          {request.users.map((user) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
