import { useEffect, useState } from 'react'
import { searchCountries } from './api.js'

// Exercise 12: Autocomplete with debounce.
// Read README.md in this folder for the full requirements.
// api.js (same folder) is the fake server. You do not need to edit it.

const DEBOUNCE_MS = 300

export default function App() {
  // TODO 1: state for the text in the input (make the input controlled).
  // TODO 2: state for the answer from the API. Think about how you will know
  //         which text an answer belongs to, and whether the list is loading.
  // TODO 3: a way to remember that the user just picked a suggestion, so that
  //         filling the input does not start another search.

  // TODO 4: an effect that waits DEBOUNCE_MS after the LAST change of the text,
  //         then calls searchCountries(...) with the trimmed text.
  //         - nothing happens for an empty (or spaces-only) text
  //         - its cleanup must cancel the timer
  //         - its cleanup must also make sure an old response can never be shown

  // TODO 5: a click handler for a suggestion (fill the input, hide the list).

  return (
    <div>
      <h2>Country search</h2>

      <label htmlFor="country-search">Search countries</label>
      <input id="country-search" type="text" autoComplete="off" />

      {/* TODO 6: show "Loading...", "No results", or the <ul> of suggestions.
          Each suggestion is an <li> that the user can click. */}
    </div>
  )
}
