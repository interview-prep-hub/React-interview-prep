import { useState } from 'react'

// Exercise 02: FAQ accordion, one panel open at a time.
// Read README.md in this folder for the full requirements.

// The data is already here so you can focus on the component.
// Each item has an id, a title (the header) and content (the panel text).
const FAQ_ITEMS = [
  {
    id: 'what-is-react',
    title: 'What is React?',
    content: 'React is a JavaScript library for building user interfaces out of components.',
  },
  {
    id: 'what-is-jsx',
    title: 'What is JSX?',
    content: 'JSX is a syntax that lets you write markup inside JavaScript.',
  },
  {
    id: 'what-is-state',
    title: 'What is state?',
    content: 'State is data that a component remembers between renders.',
  },
  {
    id: 'what-are-props',
    title: 'What are props?',
    content: 'Props are inputs that a parent component passes to a child component.',
  },
]

// The tests import this named export, so keep the word `export` here.
export function Accordion({ items }) {
  // TODO 1: create state that remembers which item is open.
  //         Hint: you only need ONE value. What value means "nothing is open"?
  //         Read `items` from props on every render. Do not copy it into state
  //         and do not change it (it is read-only).

  return (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          {/* TODO 2: a real <button> that shows item.title.
                      Give it aria-expanded (true when open, false when closed)
                      and an onClick. */}

          {/* TODO 3: show item.content ONLY when this item is the open one. */}

          {/* TODO 4: write the click handler. Two cases:
                      the item is already open, or another item is open (or none). */}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  return (
    <div>
      <h2>Frequently asked questions</h2>
      <Accordion items={FAQ_ITEMS} />
    </div>
  )
}
