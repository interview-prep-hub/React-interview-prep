# Round 6 - Code Review and Refactoring: Code Review Scenarios

**How to use this file:** Each scenario is a pull request (a proposed code change) from a teammate. Give yourself 8 to 12 minutes per scenario (15 for the Hard ones). The task is always the same: **list the problems in priority order, then refactor.** Read the code once, then say out loud: the problems with a severity (Blocker, Major, Minor or Nit), why each one matters to a user or to the team, and how you would fix it. Then write the refactored code and the review comment you would leave. Self-score with the rubric in the [round README](../README.md). Do not open the answers until you have tried.
**Answers:** [answers/01-code-review.md](../answers/01-code-review.md)  (do not open until you have tried)
**Learn first:** [Hooks overview and rules](../../../02-hooks/01-hooks-overview-and-rules.md), [useState in depth](../../../02-hooks/02-usestate-in-depth.md), [useEffect](../../../02-hooks/03-useeffect.md), [Memoization](../../../02-hooks/07-memoization.md), [Conditional rendering and lists](../../../01-basics/06-conditional-rendering-and-lists.md), [Data fetching](../../../03-intermediate/02-data-fetching.md), [TypeScript with React](../../../03-intermediate/08-typescript-with-react.md), [Accessibility](../../../04-advanced/09-accessibility.md), [Security and i18n](../../../04-advanced/10-security-and-i18n.md)

## State and lists

**R6-CR-001 (Easy)** Feature: a small todo list. Users can add, tick and remove todos. Review this pull request. List the problems in priority order, then refactor.

```jsx
import { useState } from 'react';

export function TodoList({ initialTodos }) {
  const [todos, setTodos] = useState(initialTodos);
  const [text, setText] = useState('');

  function addTodo() {
    todos.push({ id: Date.now(), text, done: false });
    setTodos(todos);
    setText('');
  }

  function toggleTodo(index) {
    todos[index].done = !todos[index].done;
    setTodos(todos);
  }

  function removeTodo(index) {
    todos.splice(index, 1);
    setTodos(todos);
  }

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={addTodo}>Add</button>
      <ul>
        {todos.map((todo, index) => (
          <li key={todo.id}>
            <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(index)} />
            {todo.text}
            <button onClick={() => removeTodo(index)}>x</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**R6-CR-002 (Easy)** Feature: a shortlist of candidates. Each row has a private note box. Users can remove a row or sort the list by name. List the problems in priority order, then refactor.

```jsx
import { useState } from 'react';

function Row({ item, onRemove }) {
  const [note, setNote] = useState('');
  return (
    <li>
      {item.name}
      <input
        aria-label={`Note for ${item.name}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button onClick={onRemove}>Remove {item.name}</button>
    </li>
  );
}

export function Shortlist({ initial }) {
  const [items, setItems] = useState(initial);

  function sortByName() {
    setItems([...items].sort((a, b) => a.name.localeCompare(b.name)));
  }

  return (
    <div>
      <button onClick={sortByName}>Sort A-Z</button>
      <ul>
        {items.map((item, index) => (
          <Row
            key={index}
            item={item}
            onRemove={() => setItems(items.filter((_, i) => i !== index))}
          />
        ))}
      </ul>
    </div>
  );
}
```

**R6-CR-003 (Easy)** Feature: a shopping cart summary. `items` and `taxRate` come from the parent. The user can hide out-of-stock items. The subtotal covers all items. List the problems in priority order, then refactor.

```jsx
import { useEffect, useState } from 'react';

export function Cart({ items, taxRate }) {
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [visible, setVisible] = useState(items);

  useEffect(() => {
    setSubtotal(items.reduce((sum, item) => sum + item.price * item.qty, 0));
  }, [items]);

  useEffect(() => {
    setTotal(subtotal * (1 + taxRate));
  }, [subtotal, taxRate]);

  useEffect(() => {
    setVisible(onlyInStock ? items.filter((item) => item.inStock) : items);
  }, [items, onlyInStock]);

  return (
    <section>
      <label>
        <input type="checkbox" checked={onlyInStock} onChange={(e) => setOnlyInStock(e.target.checked)} />
        Only in stock
      </label>
      <ul>
        {visible.map((item) => (
          <li key={item.id}>
            {item.name} x {item.qty}
          </li>
        ))}
      </ul>
      <p>Subtotal: {subtotal.toFixed(2)}</p>
      <p>Total: {total.toFixed(2)}</p>
    </section>
  );
}
```

## Effects and data fetching

**R6-CR-004 (Medium)** Feature: a contact form. It posts to the server and tells the parent (through `onSent`) when the message has been sent. List the problems in priority order, then refactor.

```jsx
import { useEffect, useState } from 'react';

export function ContactForm({ onSent }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!submitted) return;
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, message }),
    }).then(() => setSent(true));
  }, [submitted, email, message]);

  useEffect(() => {
    if (!sent) return;
    onSent();
    setEmail('');
    setMessage('');
    setSubmitted(false);
    setSent(false);
  }, [sent, onSent]);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>Email <input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Message <textarea value={message} onChange={(e) => setMessage(e.target.value)} /></label>
      <button disabled={submitted}>Send</button>
    </form>
  );
}
```

**R6-CR-005 (Medium)** Feature: a countdown that calls `onDone` when it reaches zero, and also shows the window width. The author says: "I added the eslint-disable because the linter was wrong." List the problems in priority order, then refactor.

```jsx
import { useEffect, useState } from 'react';

export function Countdown({ seconds, onDone }) {
  const [left, setLeft] = useState(seconds);
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const id = setInterval(() => {
      setLeft(left - 1);
      if (left - 1 <= 0) {
        clearInterval(id);
        onDone();
      }
    }, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.addEventListener('resize', () => setWidth(window.innerWidth));
  }, []);

  return (
    <p>
      {left} seconds left (window is {width}px wide)
    </p>
  );
}
```

**R6-CR-006 (Hard)** Feature: search-as-you-type for users. The API is `GET /api/users?q=...` and returns a JSON array. List the problems in priority order, then refactor. Pay attention to what happens when the user types fast and when the network is bad.

```jsx
import { useEffect, useState } from 'react';

export function UserSearch() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/users?q=${query}`)
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setIsLoading(false);
      });
  }, [query]);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {isLoading && <p>Loading...</p>}
      {isError && <p>Something went wrong</p>}
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Hooks and components

**R6-CR-007 (Medium)** Feature: a settings form. The `settings` prop is `undefined` while the data loads, then becomes `{ name, bio }`. Users type in the two fields. List the problems in priority order, then refactor.

```jsx
import { useState } from 'react';

export function SettingsForm({ settings }) {
  const [name, setName] = useState(settings?.name ?? '');

  if (!settings) {
    return <p>Loading settings...</p>;
  }

  const [bio, setBio] = useState(settings.bio);

  function Field({ label, value, onChange }) {
    return (
      <label>
        {label}
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }

  return (
    <form>
      <Field label="Name" value={name} onChange={setName} />
      <Field label="Bio" value={bio} onChange={setBio} />
    </form>
  );
}
```

## Accessibility, security and types

**R6-CR-008 (Medium)** Feature: a signup form with an email check and a Terms section that opens and closes. Keep the behaviour. List the problems in priority order, then refactor.

```jsx
import { useState } from 'react';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);

  function submit() {
    if (!email.includes('@')) setError('Invalid email');
    else setError('');
  }

  return (
    <div className="signup">
      <img src="/logo.png" />
      <span>Email</span>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      {error && <span style={{ color: 'red' }}>{error}</span>}
      <div className="button" onClick={submit}>
        Sign up
      </div>
      <div className="link" onClick={() => setShowTerms(!showTerms)}>
        Terms
      </div>
      {showTerms && (
        <div className="terms">
          <p>By signing up you agree to be kind to other users.</p>
          <i className="icon-close" onClick={() => setShowTerms(false)} />
        </div>
      )}
    </div>
  );
}
```

**R6-CR-009 (Medium)** Feature: the comments under a blog post. Comments are written by other users. The API needs a logged-in user. List the problems in priority order, then refactor.

```jsx
import { useEffect, useState } from 'react';

function Comment({ comment }) {
  return (
    <article>
      <h4>{comment.author}</h4>
      <div dangerouslySetInnerHTML={{ __html: comment.body }} />
      <a href={comment.website} target="_blank">
        Website of {comment.author}
      </a>
    </article>
  );
}

export function CommentList({ postId }) {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    fetch(`/api/posts/${postId}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setComments);
  }, [postId]);

  return comments.map((comment) => (
    <Comment key={comment.id} comment={comment} />
  ));
}
```

**R6-CR-010 (Medium)** Feature (TypeScript, strict mode): an editor for a user record. It can reload the record from the server, and it calls `onSave` with the edited user. The age field must stay a number in the saved data. List the problems in priority order, then refactor.

```tsx
import { useRef, useState } from 'react';

type User = { id: number; name: string; age: number };

type Props = {
  user: any;
  onSave: Function;
};

export function UserEditor({ user, onSave }: Props) {
  const [data, setData] = useState<any>(user);
  const nameRef = useRef<HTMLInputElement>(null!);

  const handleChange = (e: any) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  async function reload() {
    const res = await fetch(`/api/users/${data.id}`);
    const json = await res.json();
    setData(json as User);
  }

  return (
    <form
      onSubmit={(e: any) => {
        e.preventDefault();
        onSave(data);
      }}
    >
      <input ref={nameRef} name="name" value={data.name} onChange={handleChange} />
      <input name="age" value={data.age} onChange={handleChange} />
      <button type="button" onClick={reload}>Reload</button>
      <button type="button" onClick={() => nameRef.current!.focus()}>Focus name</button>
      <button type="submit">Save</button>
    </form>
  );
}
```

## Performance and structure

**R6-CR-011 (Hard)** Feature: a trading dashboard. `Chart` is a slow third-party component imported from `./Chart` (about 200 ms to draw 5,000 points). The author wrapped it in `memo` so that toggling the theme or clicking a point stays fast. The Profiler still shows the chart re-rendering on every click. `trades` is a stable array from the parent. Explain why, then refactor.

```jsx
import { memo, useState } from 'react';
import { Chart } from './Chart';

const PriceChart = memo(function PriceChart({ data, options, onSelect }) {
  return <Chart data={data} options={options} onSelect={onSelect} />;
});

export function Dashboard({ trades }) {
  const [theme, setTheme] = useState('light');
  const [selected, setSelected] = useState(null);

  const data = trades
    .filter((trade) => trade.valid)
    .map((trade) => ({ x: trade.time, y: trade.price }));

  return (
    <div className={theme}>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle theme
      </button>
      <PriceChart
        data={data}
        options={{ animate: false, color: theme === 'dark' ? '#fff' : '#000' }}
        onSelect={(point) => setSelected(point)}
      />
      <p>{selected ? `Selected price: ${selected.y}` : 'Nothing selected'}</p>
    </div>
  );
}
```

**R6-CR-012 (Medium)** Feature: a profile card. The author says: "I memoized everything, so it is as fast as it can be." List the problems in priority order, then refactor.

```jsx
import { memo, useCallback, useMemo } from 'react';

const Badge = memo(function Badge({ label }) {
  return <span className="badge">{label}</span>;
});

export function ProfileCard({ user, onFollow }) {
  const fullName = useMemo(() => `${user.first} ${user.last}`, [user.first, user.last]);
  const initials = useMemo(() => `${user.first[0]}${user.last[0]}`, [user.first, user.last]);
  const isAdmin = useMemo(() => user.role === 'admin', [user.role]);
  const tagCount = useMemo(() => user.tags.length, []);
  const cardStyle = useMemo(() => ({ padding: 8 }), []);
  const handleFollow = useCallback(() => onFollow(user.id), [onFollow, user.id]);
  const badges = useMemo(
    () => user.tags.map((tag) => <Badge key={tag} label={tag} />),
    [user.tags]
  );

  return (
    <div style={cardStyle}>
      <h3>
        {fullName} ({initials}){isAdmin && ' - admin'}
      </h3>
      <p>{tagCount} tags</p>
      {badges}
      <button onClick={handleFollow}>Follow</button>
    </div>
  );
}
```

**R6-CR-013 (Medium)** Feature: an app shell. Only `Avatar` and the name in `UserMenu` need the user. A teammate suggests "just put everything in one global context". Review the structure, say what you think of that suggestion, then refactor.

```jsx
import { useState } from 'react';

export function App() {
  const [user] = useState({ name: 'Asha', avatarUrl: '/asha.png' });
  return <Layout user={user} />;
}

function Layout({ user }) {
  return (
    <div>
      <Header user={user} />
      <main>Page content</main>
    </div>
  );
}

function Header({ user }) {
  return (
    <header>
      <Logo />
      <UserMenu user={user} />
    </header>
  );
}

function Logo() {
  return <strong>Acme</strong>;
}

function UserMenu({ user }) {
  return (
    <div>
      <Avatar user={user} />
      <span>{user.name}</span>
    </div>
  );
}

function Avatar({ user }) {
  return <img src={user.avatarUrl} alt={user.name} />;
}
```

**R6-CR-014 (Hard)** Feature: a users page with search, 10 users per page and a details panel. The API is `GET /api/users` and returns an array of `{ id, name, email }`. List the problems in priority order (there is at least one real bug hidden among the style issues), then refactor into smaller pieces.

```jsx
import { useEffect, useState } from 'react';

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((d) => { setUsers(d); setLoading(false); })
      .catch((e) => { setError(e); setLoading(false); });
  }, []);

  const filtered = users
    .filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.name > b.name ? 1 : -1));
  const pageItems = filtered.slice(page * 10, page * 10 + 10);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error</p>;

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <table><tbody>
        {pageItems.map((u) => (
          <tr key={u.id} onClick={() => setSelected(u)}><td>{u.name}</td><td>{u.email}</td></tr>
        ))}
      </tbody></table>
      <button onClick={() => setPage(page - 1)} disabled={page === 0}>Prev</button>
      <button onClick={() => setPage(page + 1)} disabled={(page + 1) * 10 >= filtered.length}>Next</button>
      {selected && (
        <div className="modal">
          <h2>{selected.name}</h2>
          <button onClick={() => setSelected(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
```
