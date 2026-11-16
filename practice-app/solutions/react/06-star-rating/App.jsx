import { useState } from 'react'

// Reference solution for exercise 06.
// Key ideas:
// - only TWO pieces of state: the saved rating and the star under the pointer
// - everything else is DERIVED while rendering (which stars look filled, the
//   label text, the list of star numbers), so there is nothing to keep in sync
// - the hover preview never touches the saved rating

const starStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '2rem',
  padding: 0,
}

export default function App({ max = 5, onChange }) {
  const [rating, setRating] = useState(0) // 0 means "not rated yet"
  const [hovered, setHovered] = useState(0) // 0 means "pointer is not on a star"

  // Derived value: while the pointer is on a star, the preview wins.
  const shown = hovered || rating

  // Star numbers 1..max, for example [1, 2, 3, 4, 5].
  const stars = Array.from({ length: max }, (_, index) => index + 1)

  const handleClick = (value) => {
    // Clicking the star that is already selected clears the rating.
    const next = value === rating ? 0 : value
    setRating(next)
    // Tell the parent from the event handler, not from inside a state updater
    // function (updaters must stay pure, React may run them twice).
    onChange?.(next)
  }

  return (
    <div>
      <h2>Star rating</h2>

      {/* Leaving the whole group ends the preview. Moving from one star to the
          next stays inside the group, so the preview does not flicker. */}
      <div role="group" aria-label="Star rating" onMouseLeave={() => setHovered(0)}>
        {stars.map((value) => {
          const filled = value <= shown
          return (
            <button
              key={value}
              type="button"
              aria-label={value === 1 ? '1 star' : `${value} stars`}
              data-filled={filled ? 'true' : 'false'}
              style={{ ...starStyle, color: filled ? '#f5a623' : '#999' }}
              onMouseEnter={() => setHovered(value)}
              onClick={() => handleClick(value)}
            >
              {filled ? '★' : '☆'}
            </button>
          )
        })}
      </div>

      {/* The text shows the SAVED rating, never the hover preview. */}
      <p>{rating === 0 ? 'Not rated yet' : `Rated ${rating} out of ${max}`}</p>
    </div>
  )
}
