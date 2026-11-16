import { useState } from 'react'

// Exercise 05: Accessible tabs (ARIA tabs pattern).
// Read README.md in this folder for the full requirements.

const TABS = [
  { key: 'about', label: 'About', content: 'Acme builds small, friendly tools for busy teams.' },
  { key: 'pricing', label: 'Pricing', content: 'Plans start at 9 dollars per month.' },
  { key: 'contact', label: 'Contact', content: 'Write to hello@acme.test and we reply within a day.' },
]

function Tabs({ tabs, label }) {
  // TODO 1: state for the active tab (an index is the easiest choice)
  // TODO 2: ids. Every tab and every panel needs an id that is unique on the page,
  //         even when two Tabs are rendered. (Hint: React has a hook for ids.)
  // TODO 3: refs to the tab buttons, so a key press can move focus to another tab
  // TODO 4: a keydown handler: ArrowRight, ArrowLeft (wrap around), Home, End.
  //         Think about what these keys do to the page by default, and about
  //         what must happen to every OTHER key (the Tab key especially).

  return (
    <div>
      {/* TODO 5: this wrapper is the tablist. Give it the role and the accessible name. */}
      <div>
        {tabs.map((tab) => (
          // TODO 6: each button is a tab: role, aria-selected, aria-controls,
          //         roving tabindex, click and keyboard handlers
          <button key={tab.key} type="button">
            {tab.label}
          </button>
        ))}
      </div>

      {/* TODO 7: render ONLY the active panel, wired to its tab with aria-labelledby */}
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
