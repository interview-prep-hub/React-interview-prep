import { useEffect, useSyncExternalStore } from 'react'

// Exercise 27: a tiny data-fetching library (a mini TanStack Query).
// Read README.md in this folder for the full requirements.
//
// The three exports below are what the tests and App.jsx import.
// Right now they are stubs, so the tests fail. Replace the stubs with real code.

// TODO 1: create the module-level cache here, OUTSIDE any component.
// A Map from key to "entry" is a good start. Think about what one entry
// must remember:
//   - what components show: data, error, status, isFetching
//   - when the data was last fetched successfully (a Date.now() number)
//   - the request that is running right now, if there is one
//   - the newest fetcher passed for this key (invalidateQueries gets only a key)
//   - the components that want to hear about changes (subscribers)

// TODO 2: write small helpers, for example:
//   - get (or create) the entry for a key
//   - change an entry and notify its subscribers
//   - start a request (and decide what to do when one is already running)

export function useQuery(key, fetcher, { staleTime = 0 } = {}) {
  // TODO 3: subscribe this component to the entry of `key` with
  // useSyncExternalStore(subscribe, getSnapshot) and return its snapshot.

  // TODO 4: in an effect that runs on mount and when `key` changes (and NOT on
  // every re-render), decide: fetch, or use what is in the cache?

  // TODO 5: return a working refetch function.

  return {
    data: undefined,
    error: null,
    status: 'pending',
    isFetching: false,
    refetch: () => {},
  }
}

export function invalidateQueries(key) {
  // TODO 6: mark the entry stale and, if a component is using it, refetch now.
}

export function clearQueryCache() {
  // TODO 7: forget every entry.
}
