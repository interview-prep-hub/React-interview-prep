import { useEffect, useRef, useState } from 'react'
import { fetchPage } from './api.js'

// Exercise 16: Infinite scroll feed.
// Read README.md in this folder for the full requirements.

// Just some looks so the list is tall enough to scroll in the browser.
const listStyle = { listStyle: 'none', padding: 0, margin: 0 }
const itemStyle = { padding: '16px 12px', borderBottom: '1px solid #ddd' }

export default function App() {
  // TODO 1: state for the loaded items (an array), for hasMore (starts true)
  //         and for loading (is a request running right now?)
  // TODO 2: a ref for the sentinel DOM node. Also decide where to keep the next
  //         page number and the "a request is already running" flag: in state
  //         or in a ref? Think about what must be true when the observer calls
  //         you twice before React has re-rendered. (Stuck? See the Hints in
  //         README.md.)

  // TODO 3: write loadNext(). It should
  //         - do nothing if a request is already running
  //         - call fetchPage with the next page number
  //         - append the new items to the old ones (do not replace them)
  //         - store hasMore from the response
  //         - always switch "loading" off at the end, even if something throws

  // TODO 4: useEffect that loads the first page when the component mounts.
  //         Careful: React.StrictMode runs effects twice in development.

  // TODO 5: useEffect that creates a new IntersectionObserver, observes the
  //         sentinel node, and loads the next page when the sentinel is
  //         visible (but only if we are allowed to). Return a cleanup function
  //         that disconnects the observer.

  return (
    <div>
      <h2>Feed</h2>
      <ul aria-label="Feed" style={listStyle}>
        {/* TODO 6: one <li style={itemStyle}> per item, key = item.id, text = item.title */}
      </ul>

      {/* TODO 7: <p>Loading more...</p> while a request is running */}
      {/* TODO 8: <p>You reached the end</p> when there are no more pages */}

      {/* TODO 9: attach your sentinel ref to this div */}
      <div data-testid="sentinel" style={{ height: 1 }} />
    </div>
  )
}
