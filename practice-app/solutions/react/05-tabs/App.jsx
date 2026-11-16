import { useId, useRef, useState } from 'react'

// Reference solution for exercise 05: accessible tabs.
// Key ideas:
// - ONE piece of state: the index of the active tab
// - "roving tabindex": only the active tab is in the Tab order (tabIndex 0),
//   the other tabs are reachable with the arrow keys only (tabIndex -1)
// - arrow keys move focus AND selection ("automatic activation")
// - ids come from useId, so two Tabs on one page never share an id
// - only the active panel is rendered

const TABS = [
  { key: 'about', label: 'About', content: 'Acme builds small, friendly tools for busy teams.' },
  { key: 'pricing', label: 'Pricing', content: 'Plans start at 9 dollars per month.' },
  { key: 'contact', label: 'Contact', content: 'Write to hello@acme.test and we reply within a day.' },
]

// Pure helper: which tab should become active after this key?
// Returns null for keys the tabs do not handle.
function getNextIndex(key, index, count) {
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count // the last tab wraps to the first
    case 'ArrowLeft':
      return (index - 1 + count) % count // the first tab wraps to the last
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

function Tabs({ tabs, label }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const baseId = useId()
  // One DOM node per tab, so we can move focus from an event handler.
  const tabRefs = useRef([])

  const tabId = (index) => `${baseId}-tab-${tabs[index].key}`
  const panelId = (index) => `${baseId}-panel-${tabs[index].key}`

  const handleKeyDown = (event, index) => {
    const next = getNextIndex(event.key, index, tabs.length)
    if (next === null) return
    // Only for handled keys: this stops the page from scrolling, and leaves Tab free.
    event.preventDefault()
    setActiveIndex(next)
    tabRefs.current[next].focus()
  }

  const activeTab = tabs[activeIndex]

  return (
    <div>
      <div role="tablist" aria-label={label}>
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex
          return (
            <button
              key={tab.key}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              type="button"
              role="tab"
              id={tabId(index)}
              aria-selected={isActive}
              aria-controls={panelId(index)}
              tabIndex={isActive ? 0 : -1}
              style={{ fontWeight: isActive ? 'bold' : 'normal' }}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Only the active panel exists in the DOM. */}
      <div role="tabpanel" id={panelId(activeIndex)} aria-labelledby={tabId(activeIndex)}>
        <p>{activeTab.content}</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div>
      <h2>Tabs</h2>
      <Tabs tabs={TABS} label="Product information" />
    </div>
  )
}
