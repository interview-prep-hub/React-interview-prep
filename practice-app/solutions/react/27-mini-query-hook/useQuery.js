import { useCallback, useEffect, useEffectEvent, useSyncExternalStore } from 'react'

// Reference solution for exercise 27: a tiny data-fetching library.
//
// Key ideas:
// - The cache lives OUTSIDE React, in a module-level Map. That makes it an
//   "external store", and useSyncExternalStore is the hook made for those.
// - Each key has one entry. The entry holds an immutable SNAPSHOT (what the
//   components show) plus bookkeeping that components never see.
// - Request deduping: if entry.promise is set, a request is already running,
//   so nobody starts another one.
// - Stale-while-revalidate: old data stays in the snapshot while a new request
//   runs, so the screen never goes blank.

// The snapshot of a key that has never been fetched.
const IDLE = { data: undefined, error: null, status: 'pending', isFetching: false }

const entries = new Map() // key -> entry

function getEntry(key) {
  let entry = entries.get(key)
  if (!entry) {
    entry = {
      snapshot: IDLE, // what useQuery returns. Replaced on change, never mutated.
      updatedAt: 0, // Date.now() of the last success. 0 means "stale for any staleTime".
      promise: null, // the request in flight, if any
      fetcher: null, // newest fetcher passed to useQuery for this key (used by invalidateQueries)
      listeners: new Set(), // one callback per mounted component
    }
    entries.set(key, entry)
  }
  return entry
}

// Replace the snapshot with a NEW object and tell every subscriber.
function update(entry, patch) {
  entry.snapshot = { ...entry.snapshot, ...patch }
  entry.listeners.forEach((listener) => listener())
}

function isStale(entry, staleTime) {
  // Never loaded, or the last attempt failed: always worth another try.
  if (entry.snapshot.status !== 'success') return true
  return Date.now() - entry.updatedAt >= staleTime
}

// Runs one request and records the outcome. It never rejects: a failing
// fetcher becomes status "error" in the cache instead.
async function runFetch(key, entry, fetcher) {
  let patch
  try {
    const data = await fetcher()
    entry.updatedAt = Date.now()
    patch = { data, error: null, status: 'success' }
  } catch (error) {
    patch = { error, status: 'error' } // no `data` here: the old data is kept
  }

  // clearQueryCache() may have run while we waited. Do not bring the entry back.
  if (entries.get(key) !== entry) return

  entry.promise = null
  update(entry, { ...patch, isFetching: false })
}

function startFetch(key, fetcher) {
  const entry = getEntry(key)

  // Request deduping: join the request that is already running.
  if (entry.promise) return entry.promise

  update(entry, { isFetching: true })
  entry.promise = runFetch(key, entry, fetcher)
  return entry.promise
}

export function useQuery(key, fetcher, { staleTime = 0 } = {}) {
  // Keep the same function while `key` is the same. A new function on every
  // render would make React unsubscribe and subscribe again every time.
  const subscribe = useCallback(
    (onStoreChange) => {
      const { listeners } = getEntry(key)
      listeners.add(onStoreChange)
      return () => {
        listeners.delete(onStoreChange)
      }
    },
    [key],
  )

  // getSnapshot must return the SAME object until the entry really changes.
  const snapshot = useSyncExternalStore(subscribe, () => entries.get(key)?.snapshot ?? IDLE)

  // An Effect Event always sees the latest `fetcher` and `staleTime`, but it is
  // not a dependency of the effect. So a new inline fetcher on every render does
  // NOT cause a refetch.
  const loadIfNeeded = useEffectEvent(() => {
    if (isStale(getEntry(key), staleTime)) startFetch(key, fetcher)
  })

  // No dependency array: runs after EVERY render, so the entry always holds the
  // newest fetcher. invalidateQueries only gets a key, so it needs this.
  useEffect(() => {
    getEntry(key).fetcher = fetcher
  })

  // Runs on mount and whenever the key changes (never on a plain re-render).
  useEffect(() => {
    loadIfNeeded()
  }, [key])

  return { ...snapshot, refetch: () => startFetch(key, fetcher) }
}

export function invalidateQueries(key) {
  const entry = entries.get(key)
  if (!entry) return

  entry.updatedAt = 0 // stale from now on, even for components that mount later

  // Only refetch right away if somebody is on screen using this key.
  if (entry.listeners.size > 0) startFetch(key, entry.fetcher)
}

export function clearQueryCache() {
  entries.clear()
}
