import { useEffect, useState } from 'react'
import { fetchUsers } from './api.js'

// Exercise 15: User list with paging, loading, error and Retry.
// Read README.md in this folder for the full requirements.
//
// fetchUsers(page) comes from api.js (a fake API, do not edit it). It returns a
// Promise that resolves to an array of { id, name } or rejects with an Error.
// In the tests it is replaced by a mock that answers when the test says so.

export default function App() {
  // TODO 1: state for the current page (starts at 1)
  // TODO 2: state for the request: a status ('loading', 'success' or 'error'),
  //         the users, and the error. Keeping them together avoids impossible
  //         combinations such as "success" plus an old error.
  // TODO 3: a piece of state you can change to run the request again (for Retry)

  // TODO 4: an effect that calls fetchUsers(page) and stores the outcome.
  //   - when a request starts, show the loading state
  //   - on success store the users, on failure store the error
  //   - the answer of an OLD request must never be stored: the user may have
  //     switched page, or the component may be gone. Use the cleanup function.
  //   - StrictMode runs effect, cleanup, effect again in development, so
  //     running the effect twice must be harmless.

  return (
    <div>
      <h2>Users</h2>

      {/* TODO 5: buttons "Page 1" and "Page 2" (aria-pressed marks the current one) */}
      {/* TODO 6: loading view, error view (message + Retry button), list view */}
    </div>
  )
}
