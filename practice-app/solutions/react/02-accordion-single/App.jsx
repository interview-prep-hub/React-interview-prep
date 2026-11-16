import { useState } from 'react'

// Reference solution for exercise 02.
// Key ideas:
// - The Accordion keeps ONE value in state: the id of the open item, or null
//   when everything is closed. One value means "only one open at a time"
//   needs no extra code.
// - Whether an item is open is not stored. We work it out while rendering:
//   isOpen = (item.id === openId).
// - `items` comes from props and is only read: never copied into state, never
//   changed. So a new `items` array simply shows up on the next render.
// - A real <button> gives us Tab, Enter and Space for free.
// - aria-expanded tells screen readers if the panel is open or closed.

// Defined outside the component so it is created once, not on every render.
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

export function Accordion({ items }) {
  // null means "nothing is open".
  const [openId, setOpenId] = useState(null)

  const toggle = (id) => {
    // Clicking the open item closes it. Clicking any other item opens that one,
    // which closes the previous one because there is only a single value.
    setOpenId((current) => (current === id ? null : id))
  }

  return (
    <div>
      {items.map((item) => {
        const isOpen = item.id === openId

        return (
          <div key={item.id}>
            <button type="button" aria-expanded={isOpen} onClick={() => toggle(item.id)}>
              {item.title}
            </button>
            {/* Conditional rendering: a closed panel is not in the DOM at all. */}
            {isOpen && <div>{item.content}</div>}
          </div>
        )
      })}
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
