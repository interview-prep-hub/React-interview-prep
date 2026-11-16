import { useEffect, useState } from 'react'
import { SLIDES } from './slides.js'

// Reference solution for exercise 22.
// Key ideas:
// - ONE piece of state decides what is on screen: the index of the current slide.
//   The picture, the caption and the active dot are all derived from it.
// - Wrapping around is the remainder operator (%), plus a small fix for negatives.
// - The auto play timer lives in an effect. The effect re-runs when autoPlay or
//   hovering changes, so its cleanup stops the old timer before a new one starts.
// - The timer callback uses a functional update, so it never reads a stale index.

const AUTO_PLAY_MS = 3000

// Keep an index inside 0..count-1. In JavaScript -1 % 4 is -1 (not 3),
// so we add count before the last remainder.
const wrap = (i, count) => ((i % count) + count) % count

export default function App({ slides = SLIDES, autoPlay = false }) {
  const [index, setIndex] = useState(0)
  const [hovering, setHovering] = useState(false)

  const count = slides.length
  const slide = slides[index]

  const goNext = () => setIndex((i) => wrap(i + 1, count))
  const goPrev = () => setIndex((i) => wrap(i - 1, count))

  useEffect(() => {
    // No timer at all when auto play is off or the mouse is over the carousel.
    if (!autoPlay || hovering) return

    const id = setInterval(() => {
      setIndex((i) => wrap(i + 1, count))
    }, AUTO_PLAY_MS)

    // Runs before the effect re-runs and when the component unmounts.
    return () => clearInterval(id)
  }, [autoPlay, hovering, count])

  return (
    <section
      aria-label="Image carousel"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{ width: 320, fontFamily: 'system-ui, sans-serif' }}
    >
      {/* Only the current slide exists in the page. */}
      <div
        role="img"
        aria-label={slide.alt}
        style={{ background: slide.color, height: 180, borderRadius: 8 }}
      />

      {/* A polite live region: screen readers announce the change when they are idle. */}
      <p aria-live="polite">
        Slide {index + 1} of {count}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button type="button" onClick={goPrev}>
          Prev
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              // undefined removes the attribute, so only the active dot has it.
              aria-current={i === index ? 'true' : undefined}
              onClick={() => setIndex(i)}
              style={{
                width: 12,
                height: 12,
                padding: 0,
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                background: i === index ? '#222' : '#bbb',
              }}
            />
          ))}
        </div>

        <button type="button" onClick={goNext}>
          Next
        </button>
      </div>
    </section>
  )
}
