import { useEffect } from 'react'

// Exercise 21, part 1: the useClickOutside hook.
// Read README.md in this folder for the full requirements.
//
// Usage (you will write this call in App.jsx):
//   useClickOutside(wrapperRef, () => setOpen(false))

export function useClickOutside(ref, handler) {
  // TODO 1: inside a useEffect, add a listener on `document` for a mouse event
  //         (mousedown or click, see the interview follow-ups in the README).
  // TODO 2: in the listener, work out whether the click landed inside the element
  //         held by `ref`. Careful: the ref can be empty, and its element can change
  //         over time. Only a click OUTSIDE should call handler, with the event.
  // TODO 3: return a cleanup function that removes the same listener.
  // TODO 4: decide what the effect depends on, so the newest handler is always used.
}
