import { fetchUser } from './api.js'
import { invalidateQueries, useQuery } from './useQuery.js'

// Exercise 27: the demo app for your mini query hook.
// Build useQuery.js first, then finish this file.
// Read README.md in this folder for the exact texts and labels.

// TODO 1: both components below must use the SAME key, so that they share one
// cache entry and the page makes one request. You can write a small helper hook
// that calls useQuery with that key and a fetcher that calls fetchUser(1).

function UserBadge() {
  // TODO 2: call your hook and show: "Loading..." while pending, the user's
  // name when there is data, "Unavailable" when it failed and there is no data,
  // and "Updating..." while a background refetch runs.
  return <section aria-label="User badge" />
}

function UserCard() {
  // TODO 3: show name, email and request number, "Loading...", "Updating...",
  // an error alert, and a "Refetch" button (see the README for exact texts).
  return <section aria-label="User card" />
}

export default function App() {
  return (
    <div>
      <h2>Mini query</h2>
      <UserBadge />
      <UserCard />
      {/* TODO 4: a button "Invalidate user" that calls invalidateQueries */}
    </div>
  )
}
