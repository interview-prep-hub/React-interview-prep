import { useEffect } from 'react'

// Reference solution for exercise 21 (part 1: the hook).
// Key ideas:
// - the listener lives on `document`, so it sees every click on the page
// - we listen for `mousedown`, not `click`: it fires first, and it still works
//   when React has already removed the clicked element from the page
// - the effect returns a cleanup function that removes the listener, so
//   unmounting (or re-running the effect) never leaves old listeners behind

export function useClickOutside(ref, handler) {
  useEffect(() => {
    function onMouseDown(event) {
      const element = ref.current
      // Nothing mounted yet, or the click landed inside the element: ignore it.
      if (!element || element.contains(event.target)) return
      handler(event)
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
    // `handler` is a dependency so we never call a stale version of it.
    // If the caller passes a new function on every render, the listener is simply
    // re-attached on every render. That is cheap and correct.
  }, [ref, handler])
}
