# Round 3 - Output Prediction and Debugging: Bug Hunt

**How to use this file:** Each item has a short component, a symptom (what the user or the developer sees) and one task: find the bug and fix it. Give each one 5 to 10 minutes. Say your thinking out loud: first reproduce the symptom in your head, then name the cause, then write the smallest fix. Score yourself with the rubric in the round [README](../README.md). The answers were checked by running both the buggy and the fixed component with React 19.3.1.
**Answers:** [answers/02-bug-hunt.md](../answers/02-bug-hunt.md)  (do not open until you have tried)
**Learn first:** [useState in depth](../../../02-hooks/02-usestate-in-depth.md), [useEffect](../../../02-hooks/03-useeffect.md), [hooks overview and rules](../../../02-hooks/01-hooks-overview-and-rules.md), [useContext](../../../02-hooks/05-usecontext.md), [lists and keys](../../../01-basics/06-conditional-rendering-and-lists.md), [how React renders](../../../04-advanced/01-how-react-renders.md)

## Bugs
**R3-BG-001 (Medium)** A game page shows a score. The player presses the ArrowUp key. Symptom: the first press gives `Score: 10`, but after that the score stays at 10 however often the key is pressed. Find and fix the bug.

```jsx
import { useEffect, useState } from 'react'

function Scoreboard() {
  const [score, setScore] = useState(0)

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'ArrowUp') {
        setScore(score + 10)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return <p>Score: {score}</p>
}
```

**R3-BG-002 (Easy)** A profile card loads a user by id. Symptom: the parent switches from user 1 to user 2, the props change, but the card keeps showing the name of user 1. Find and fix the bug.

```jsx
import { useEffect, useState } from 'react'

// fetchUser(id) returns a promise of { name }
function UserCard({ userId }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetchUser(userId).then(setUser)
  }, [])

  return <p>{user ? user.name : 'Loading...'}</p>
}
```

**R3-BG-003 (Easy)** A todo list with checkboxes. Symptom: when you click a checkbox it does not get checked. There is no error in the console. Find and fix the bug.

```jsx
import { useState } from 'react'

function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Walk dog', done: false },
  ])

  function toggle(id) {
    const todo = todos.find((t) => t.id === id)
    todo.done = !todo.done
    setTodos(todos)
  }

  return (
    <ul>
      {todos.map((t) => (
        <li key={t.id}>
          <label>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
            {t.text}
          </label>
        </li>
      ))}
    </ul>
  )
}
```

**R3-BG-004 (Medium)** A notes list with the newest note on top. Each note can be opened to show its body. Symptom: you open `Groceries`, then add a new note. The new note appears already open, and `Groceries` has closed itself. Find and fix the bug.

```jsx
import { useState } from 'react'

function NoteRow({ note }) {
  const [open, setOpen] = useState(false)
  return (
    <li>
      <button onClick={() => setOpen(!open)}>{note.title}</button>
      {open && <p>{note.body}</p>}
    </li>
  )
}

function NoteList() {
  const [notes, setNotes] = useState([{ id: 1, title: 'Groceries', body: 'milk, eggs' }])

  function addNote() {
    const next = { id: notes.length + 1, title: 'New note', body: 'write here' }
    setNotes([next, ...notes])
  }

  return (
    <>
      <button onClick={addNote}>Add note</button>
      <ul>
        {notes.map((note, index) => (
          <NoteRow key={index} note={note} />
        ))}
      </ul>
    </>
  )
}
```

**R3-BG-005 (Hard)** A product list. Symptom: the network tab shows an endless stream of requests to the products endpoint as soon as the page opens, and the CPU stays busy. There is no user action involved. Find and fix the bug.

```jsx
import { useEffect, useState } from 'react'

// fetchProducts(filters) calls the server and returns a promise of an array
function Products({ category }) {
  const [products, setProducts] = useState([])
  const filters = { category, inStock: true }

  useEffect(() => {
    fetchProducts(filters).then(setProducts)
  }, [filters])

  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  )
}
```

**R3-BG-006 (Hard)** A search box. Symptom: if you type `a` and then quickly add `b`, the box says `ab`, but sometimes the result under it belongs to `a`. It only happens when the server answers the first request later than the second. Find and fix the bug.

```jsx
import { useEffect, useState } from 'react'

// searchApi(query) returns a promise of a string. Slow queries can finish late.
function Search() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState('')

  useEffect(() => {
    if (!query) return
    searchApi(query).then(setResult)
  }, [query])

  return (
    <>
      <input aria-label="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p>Result: {result}</p>
    </>
  )
}
```

**R3-BG-007 (Easy)** A buy button that sends an analytics event. Symptom: the analytics dashboard shows a `buy_click` event for every product as soon as the page loads, and no new event when a real user clicks. Find and fix the bug.

```jsx
function track(name, id) {
  console.log('track', name, id)
}

function BuyButton({ productId }) {
  return <button onClick={track('buy_click', productId)}>Buy</button>
}
```

**R3-BG-008 (Medium)** An app with a login context. `Header` takes no props and is wrapped in `memo`. Symptom: every time the user toggles the theme button, the console shows `Header render`, although the user did not change. Find and fix the bug.

```jsx
import { createContext, memo, useContext, useState } from 'react'

const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const [user, setUser] = useState({ name: 'Ann' })
  return <AuthContext value={{ user, setUser }}>{children}</AuthContext>
}

const Header = memo(function Header() {
  const { user } = useContext(AuthContext)
  console.log('Header render')
  return <p>Hello {user.name}</p>
})

function AppShell() {
  const [dark, setDark] = useState(false)
  return (
    <AuthProvider>
      <button onClick={() => setDark(!dark)}>theme: {dark ? 'dark' : 'light'}</button>
      <Header />
    </AuthProvider>
  )
}
```

**R3-BG-009 (Medium)** A widget that shows the window width. Symptom: the user opens and closes the panel that contains it a few times. After that, every window resize logs `resize handler` several times, and the page slowly gets heavier. Find and fix the bug. Which StrictMode behaviour would have shown the bug during development?

```jsx
import { useEffect, useState } from 'react'

function WindowSize() {
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    function onResize() {
      console.log('resize handler')
      setWidth(window.innerWidth)
    }
    window.addEventListener('resize', onResize)
  }, [])

  return <p>width: {width}</p>
}

function Toggle() {
  const [show, setShow] = useState(true)
  return (
    <>
      <button onClick={() => setShow(!show)}>toggle</button>
      {show && <WindowSize />}
    </>
  )
}
```

**R3-BG-010 (Medium)** A profile editor. The parent has a `Next user` button. Symptom: you click it, the editor receives the new user (Bob), but the input still says `Ann`. Find and fix the bug, using the smallest change.

```jsx
import { useState } from 'react'

const users = {
  1: { id: 1, name: 'Ann' },
  2: { id: 2, name: 'Bob' },
}

function ProfileEditor({ user }) {
  const [name, setName] = useState(user.name)
  return (
    <label>
      Name
      <input value={name} onChange={(e) => setName(e.target.value)} />
    </label>
  )
}

function ProfilePage() {
  const [id, setId] = useState(1)
  return (
    <>
      <button onClick={() => setId(2)}>Next user</button>
      <ProfileEditor user={users[id]} />
    </>
  )
}
```

**R3-BG-011 (Medium)** A profile button. Symptom: the page works while the user is signed out. When the user signs in, the page crashes with `Rendered more hooks than during the previous render.` Find and fix the bug.

```jsx
import { useEffect, useState } from 'react'

function Profile({ user }) {
  const [open, setOpen] = useState(false)

  if (!user) {
    return <p>Please sign in</p>
  }

  useEffect(() => {
    document.title = user.name
  }, [user])

  return <button onClick={() => setOpen(!open)}>{open ? user.name : 'Show name'}</button>
}
```

**R3-BG-012 (Easy)** A signup form. Symptom: you type `Ann` in the name box, then type an email. The greeting below says `Hello , we will write to a@b.c`, the name is lost, and the console shows a warning about controlled and uncontrolled inputs. Find and fix the bug.

```jsx
import { useState } from 'react'

function SignupForm() {
  const [form, setForm] = useState({ name: '', email: '' })

  return (
    <form>
      <input
        aria-label="Name"
        value={form.name}
        onChange={(e) => setForm({ name: e.target.value })}
      />
      <input
        aria-label="Email"
        value={form.email}
        onChange={(e) => setForm({ email: e.target.value })}
      />
      <p>
        Hello {form.name}, we will write to {form.email}
      </p>
    </form>
  )
}
```
