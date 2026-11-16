import { useState } from 'react'

// Reference solution for exercise 24: a windowed ("virtualized") list.
//
// Key ideas:
// 1. The only state is `scrollTop`. Everything else (which rows to show) is
//    DERIVED from the props and that one number, so it can never get out of sync.
// 2. A "spacer" div is as tall as the whole list (items.length * itemHeight).
//    It makes the scrollbar behave as if every row existed.
// 3. Only the rows near the viewport are rendered. Each one is absolutely
//    positioned inside the spacer at top = index * itemHeight, so it sits exactly
//    where it would be in a full list.
// 4. The key is the item index, so a row that stays in the window keeps its
//    DOM node while you scroll. Only rows that enter or leave are created or removed.

export default function VirtualList({ items, itemHeight, height, overscan = 3, renderItem }) {
  const [scrollTop, setScrollTop] = useState(0)

  // First row that touches the viewport (a half visible row counts).
  const firstVisible = Math.floor(scrollTop / itemHeight)
  // One past the last row that touches the viewport (exclusive end).
  const endVisible = Math.ceil((scrollTop + height) / itemHeight)

  // Add the overscan rows on both sides, but stay inside the list.
  const start = Math.max(0, firstVisible - overscan)
  const end = Math.min(items.length, endVisible + overscan)

  // At most a couple of dozen iterations, so there is no need for useMemo.
  const rows = []
  for (let index = start; index < end; index++) {
    rows.push(
      <div
        key={index}
        role="listitem"
        data-index={index}
        style={{
          position: 'absolute',
          top: index * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        }}
      >
        {renderItem(items[index], index)}
      </div>,
    )
  }

  return (
    <div
      role="list"
      // A scrollable area must be reachable with the keyboard (Tab, then arrow keys).
      tabIndex={0}
      // currentTarget is the list itself, even if the event came from a child.
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{ height, overflowY: 'auto' }}
    >
      {/* position: relative makes this the reference box for the absolute rows. */}
      <div
        data-testid="spacer"
        style={{ height: items.length * itemHeight, position: 'relative' }}
      >
        {rows}
      </div>
    </div>
  )
}
