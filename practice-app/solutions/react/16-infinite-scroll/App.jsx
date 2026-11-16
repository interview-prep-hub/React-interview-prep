import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPage } from './api.js'

// Reference solution for exercise 16.
// Key ideas:
// - A sentinel <div> sits after the list. An IntersectionObserver tells us when
//   it scrolls into view, so we never listen to scroll events ourselves.
// - The "request in flight" lock is a REF, not state. State updates are not
//   instant: if the observer fires twice before React re-renders, both calls
//   would still see loading === false. A ref changes immediately.
// - The next page number is a ref too. It is bookkeeping, nothing on screen
//   depends on it, and it only moves forward after a page arrived successfully.
// - The observer is created in an effect and disconnected in the cleanup. The
//   effect runs again after every load, and a fresh observer reports the
//   sentinel's position straight away. So if a page does not fill the screen,
//   the next one loads without any scrolling.
// - Errors are out of scope here (see the stretch goals in README.md). A real
//   feed would catch them and show a Retry button instead of retrying forever.

const listStyle = { listStyle: 'none', padding: 0, margin: 0 }
const itemStyle = { padding: '16px 12px', borderBottom: '1px solid #ddd' }

export default function App() {
  const [items, setItems] = useState([])
  const [hasMore, setHasMore] = useState(true)
  // Page 1 is requested on mount, so we start in the loading state.
  const [loading, setLoading] = useState(true)

  const sentinelRef = useRef(null)
  const nextPageRef = useRef(1)
  const inFlightRef = useRef(false)

  const loadNext = useCallback(async () => {
    // Also protects the first page from React.StrictMode, which runs
    // effects twice in development.
    if (inFlightRef.current) return
    inFlightRef.current = true
    setLoading(true)

    try {
      const page = await fetchPage(nextPageRef.current)
      nextPageRef.current += 1
      // Functional update: append to whatever is there now.
      setItems((current) => [...current, ...page.items])
      setHasMore(page.hasMore)
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }, [])

  // Load the first page when the component mounts.
  useEffect(() => {
    loadNext()
  }, [loadNext])

  // Watch the sentinel, but only while we are able to load something.
  useEffect(() => {
    if (!hasMore || loading) return

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadNext()
    })
    observer.observe(sentinelRef.current)

    // Cleanup: runs before the effect runs again and when the component unmounts.
    return () => observer.disconnect()
  }, [hasMore, loading, loadNext])

  return (
    <div>
      <h2>Feed</h2>
      <ul aria-label="Feed" style={listStyle}>
        {items.map((item) => (
          <li key={item.id} style={itemStyle}>
            {item.title}
          </li>
        ))}
      </ul>

      {loading && <p>Loading more...</p>}
      {!hasMore && <p>You reached the end</p>}

      <div data-testid="sentinel" ref={sentinelRef} style={{ height: 1 }} />
    </div>
  )
}
