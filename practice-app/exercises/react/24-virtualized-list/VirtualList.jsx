import { useState } from 'react'

// Exercise 24: a windowed ("virtualized") list.
// Read README.md in this folder for the full requirements.
//
// Props:
//   items       the full array of data (can be 10,000 long)
//   itemHeight  the height of one row in pixels
//   height      the height of the scrolling container in pixels
//   overscan    extra rows to render above and below the viewport (default 3)
//   renderItem  (item, index) => node, what to show inside one row

export default function VirtualList({ items, itemHeight, height, overscan = 3, renderItem }) {
  // TODO 1: state for how far the user has scrolled (scrollTop, starts at 0).
  //         This is the ONLY state you need. Everything below is calculated from it.

  // TODO 2: work out which rows touch the viewport.
  //         - first visible row: scrollTop / itemHeight, rounded DOWN
  //         - end of the visible rows (exclusive): (scrollTop + height) / itemHeight, rounded UP
  //         Then add the overscan on both sides, and keep the result inside
  //         0 and items.length (you cannot render row -2 or row 10,001).

  // TODO 3: build the rows for that range only. Each row is a <div> with
  //         role="listitem", data-index={index}, a key, and an absolute position:
  //         top = index * itemHeight, height = itemHeight, left = 0, right = 0.
  //         The content of the row is renderItem(items[index], index).

  return (
    <div role="list">
      {/* TODO 4: give this container tabIndex 0, the given height, overflow-y auto,
                  and an onScroll handler that stores event.currentTarget.scrollTop. */}

      {/* TODO 5: inside it, a spacer <div data-testid="spacer"> that is
                  items.length * itemHeight tall and position: relative.
                  Your rows go inside the spacer. */}
    </div>
  )
}
