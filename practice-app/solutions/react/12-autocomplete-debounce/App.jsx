import { useEffect, useState } from 'react'
import { searchCountries } from './api.js'

// Reference solution for exercise 12.
// Key ideas:
// - Debounce: the effect starts a 300 ms timer. Its cleanup clears that timer,
//   so every new keystroke cancels the search that has not started yet.
// - Race condition: the same cleanup sets `ignore = true`, so a response that
//   belongs to an older query is thrown away when it finally arrives.
// - We store the answer TOGETHER with the query it belongs to. "Am I loading?"
//   is then just "does the stored answer match what is in the box?", so there
//   is no extra loading state to keep in sync.
// - Picking a suggestion changes the input text, but it must not start a new
//   search. A `picked` flag switches searching off until the user types again.
//   (A "skip the next run" ref would break when the picked name equals the text.)
// - A failing request is not handled here, to keep the main ideas easy to see.
//   It is the first stretch goal in the README.

const DEBOUNCE_MS = 300

export default function App() {
  const [text, setText] = useState('')
  const [picked, setPicked] = useState(false)
  const [answer, setAnswer] = useState({ query: '', names: [] })

  const query = text.trim()
  const isSearching = query !== '' && !picked

  useEffect(() => {
    if (!isSearching) return

    let ignore = false
    const timer = setTimeout(async () => {
      const names = await searchCountries(query)
      // Stale response: the user typed again (or picked something) meanwhile.
      if (!ignore) setAnswer({ query, names })
    }, DEBOUNCE_MS)

    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [isSearching, query])

  const handleChange = (event) => {
    setText(event.target.value)
    setPicked(false)
  }

  const handlePick = (name) => {
    setText(name)
    setPicked(true)
  }

  // The answer is only valid when it was made for the text that is in the box.
  const isLoading = isSearching && answer.query !== query
  const showAnswer = isSearching && !isLoading

  return (
    <div>
      <h2>Country search</h2>

      <label htmlFor="country-search">Search countries</label>
      <input
        id="country-search"
        type="text"
        autoComplete="off"
        value={text}
        onChange={handleChange}
      />

      {isLoading && <p>Loading...</p>}

      {showAnswer && answer.names.length === 0 && <p>No results</p>}

      {showAnswer && answer.names.length > 0 && (
        <ul>
          {answer.names.map((name) => (
            <li key={name}>
              <button type="button" onClick={() => handlePick(name)}>
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
