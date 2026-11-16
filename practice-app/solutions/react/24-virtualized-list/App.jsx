import VirtualList from './VirtualList.jsx'

// Reference solution for exercise 24.
// Key ideas:
// - the 10,000 items are built ONCE, at module level, so App re-renders never
//   rebuild them and the array keeps the same identity
// - App only decides WHAT to show (data and row look); VirtualList decides
//   WHICH rows are in the DOM

const ROW_COUNT = 10000
const ITEM_HEIGHT = 30
const LIST_HEIGHT = 300

const ITEMS = Array.from({ length: ROW_COUNT }, (_, i) => `Row ${i + 1}`)

const rowStyle = {
  height: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  padding: '0 12px',
  borderBottom: '1px solid #ddd',
}

function renderRow(item) {
  return <div style={rowStyle}>{item}</div>
}

export default function App() {
  return (
    <div>
      <h2>Virtualized list</h2>
      <div style={{ width: 320, border: '1px solid #bbb' }}>
        <VirtualList
          items={ITEMS}
          itemHeight={ITEM_HEIGHT}
          height={LIST_HEIGHT}
          overscan={3}
          renderItem={renderRow}
        />
      </div>
    </div>
  )
}
