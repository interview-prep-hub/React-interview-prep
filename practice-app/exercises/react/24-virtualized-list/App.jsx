import VirtualList from './VirtualList.jsx'

// Exercise 24: Virtualized list.
// Read README.md in this folder for the full requirements.
// The main work is in VirtualList.jsx. This file only uses it.

// TODO 1: build the 10,000 items here, OUTSIDE the component, so they are
//         created once and not on every render: "Row 1", "Row 2", ... "Row 10000".

export default function App() {
  return (
    <div>
      <h2>Virtualized list</h2>

      {/* TODO 2: render <VirtualList /> with your items, itemHeight 30, height 300,
                  and a renderItem function that shows the item's text. */}
      <VirtualList items={[]} itemHeight={30} height={300} renderItem={() => null} />
    </div>
  )
}
