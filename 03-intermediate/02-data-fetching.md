# Data Fetching

> **Level:** Intermediate   **Time:** about 70 minutes   **Read first:** [useEffect](../02-hooks/03-useeffect.md), [Custom hooks](../02-hooks/08-custom-hooks.md)

## What you will learn
- Explain what server state is and why it needs different tools than UI state.
- Fetch data with `fetch`: check `response.ok`, parse JSON, send a POST, and show loading, error and empty states.
- Describe a race condition and fix it with `AbortController`.
- Write a `useFetch` hook, then list what it cannot do and why real apps use a data library.
- Use TanStack Query v5: queries, keys, `staleTime` and `gcTime`, mutations, optimistic updates, pagination and infinite lists.
- Use Suspense and `use()` with a cached promise, and avoid request waterfalls.
- Build the everyday patterns: debounced search, polling, retry with backoff, auth tokens and 401, CORS, HTTP caching and validated responses.

## 1. Server state: why data fetching is its own topic

Most real apps show data that lives somewhere else: products, a profile, a feed. That data is **server state**. The state you create inside the app (is the menu open, what is typed in this input) is **client state**.

They behave very differently:

| | Client state | Server state |
|---|---|---|
| Who owns it | Your app | The server. You only hold a copy |
| How you read it | Instantly | Asynchronously. It can be slow or fail |
| Can it be out of date | No, you are the only writer | Yes, anyone can change it at any time |
| Who needs it | Usually one part of the screen | Many components, many tabs, many users |

`useState` is perfect for the left column. For the right column you also need loading and error handling, caching, refreshing, retries and more. That is why a whole family of tools exists. Think of server state as a photocopy of someone else's document: useful, but you must decide when the copy is too old.

This lesson climbs a ladder. Each rung automates the pain of the rung below:

1. `fetch` by hand inside an effect (sections 2 to 4).
2. Your own `useFetch` hook (section 5).
3. A server-state library such as TanStack Query (sections 6 to 14).
4. Suspense and the `use()` hook (section 15).
5. Framework data loading and Server Components (section 16).

Interviewers ask about every rung. Learn the low ones so you understand what the high ones do for you.

**Common mistake:** copying server data into your own state.

```jsx
// Wrong: the copy is made once and never follows the fresh data
function Profile({ user }) {
  const [name] = useState(user.name)
  return <h2>{name}</h2>
}
```

```jsx
// Right: read the value where you need it
function Profile({ user }) {
  return <h2>{user.name}</h2>
}
```

Why: `useState(user.name)` only uses the value on the first render. When the data is refreshed later, the copy stays old. Copy server data into state only when the user is editing a draft of it.

## 2. `fetch` basics

`fetch` is built into every browser (and into Node 18 and newer). It sends an HTTP request and returns a **promise** of a `Response`. A promise is an object that will hold a result later. `await` waits for it.

```js
async function loadTodo() {
  const res = await fetch('https://jsonplaceholder.typicode.com/todos/1')
  const todo = await res.json()
  console.log(todo.title)
}
```

**What happens, step by step:**
1. `fetch(url)` sends a GET request. GET is the default method.
2. The first promise resolves as soon as the response **headers** arrive. The body may still be coming. You now hold a `Response` object.
3. `res.json()` reads the whole body and parses it as JSON. It returns a second promise.
4. Two `await`s, because there are two waits: first for the headers, then for the body.

### The big trap: HTTP errors are not exceptions

Beginners expect `fetch` to throw on a 404 or 500. It does not. I ran each case against a small local server:

```js
const res = await fetch('/missing') // the server answers 404
console.log(res.ok, res.status)     // false 404
```

| What happened | The promise | What you check |
|---|---|---|
| Server answered 200 to 299 | resolves | `res.ok` is `true` |
| Server answered 404, 500, ... | **resolves** | `res.ok` is `false`, read `res.status` |
| No network, DNS failure, blocked by CORS | **rejects** with a `TypeError` | use `try/catch` |
| You cancelled it (section 4) | rejects with an `AbortError` | ignore it, it was on purpose |

So a correct request has two checks: `try/catch` for the network, and `if (!res.ok)` for the server's answer. The text of the network error differs by browser ("Failed to fetch" in Chrome, "Load failed" in Safari). Never compare the message. Check `error.name` or `error instanceof TypeError`.

Reading the body has traps too. All of these were observed:
- `res.json()` rejects with a `SyntaxError` if the body is not JSON. A server error page is often HTML.
- A `204 No Content` answer has an empty body, so `res.json()` rejects with a `SyntaxError` too.
- A body can be read only once. A second `res.json()` throws a `TypeError`. Use `res.clone()` if you need two reads.

Put the checks in one small helper and use it everywhere:

```js
// fetchJson.js
export class HttpError extends Error {
  constructor(status, body) {
    super(`Request failed with status ${status}`)
    this.name = 'HttpError'
    this.status = status
    this.body = body
  }
}

export async function fetchJson(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.json().catch(() => null) // the error body may not be JSON
    throw new HttpError(res.status, body)
  }
  if (res.status === 204) return null // "No Content": there is nothing to parse
  return res.json()
}
```

**What happens, step by step** (checked with a mock `fetch`):
1. A 200 answer with `{ a: 1 }` returns `{ a: 1 }`.
2. A 204 answer returns `null`.
3. A 404 answer with the JSON body `{ "message": "No such todo" }` throws an `HttpError`. Its `status` is `404` and its `body` holds the message, so the screen can show it.
4. A 500 answer with an HTML body throws an `HttpError` with `body` set to `null`, because the `.catch` swallowed the failed JSON parse.
5. A network failure throws the original `TypeError`, which is not an `HttpError`. That difference is useful later for retries.

**Common mistake:** trusting `fetch` to throw.

```js
// Wrong: a 404 or 500 page is parsed as if it were data
const data = await fetch(url).then((res) => res.json())
```

```js
// Right: look at the status first
const res = await fetch(url)
if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
const data = await res.json()
```

Why: `fetch` only rejects when the request could not be made. Any answer from the server, good or bad, is a resolved promise.

### Sending data: POST with JSON

```js
const res = await fetch('/api/todos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Buy milk' }),
})
const created = await res.json()
```

**What happens, step by step:**
1. `method: 'POST'` says we want to create something.
2. The `Content-Type` header tells the server the body is JSON. Without it many servers will not parse the body.
3. `JSON.stringify` turns the object into text. A body must be a string, a `FormData`, a `Blob` and so on, not a plain object.
4. The server answers (often `201 Created`) with the new item, which we read with `res.json()`.

**Common mistake:** passing an object as the body.

```js
// Wrong: the server receives the text "[object Object]"
fetch('/api/todos', { method: 'POST', body: { title: 'Buy milk' } })
```

```js
// Right
fetch('/api/todos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Buy milk' }),
})
```

Why: I sent the wrong version to a local server and it received exactly `[object Object]`. There is no error on your side, so the bug is easy to miss. The other methods work the same way: `PUT` replaces, `PATCH` changes part, `DELETE` removes. The `headers` option also carries `Authorization` (section 20).

`fetch` has no built-in timeout. Add one with a signal: `fetch(url, { signal: AbortSignal.timeout(5000) })`. After 5 seconds the request is cancelled and the promise rejects with a `TimeoutError`.

### axios vs fetch in two lines

`fetch` is built in, small, and leaves the `ok` check and the `.json()` call to you. `axios` is a library that rejects on 4xx and 5xx by default, parses JSON for you (`response.data`), and has interceptors and timeouts. A 20-line wrapper like `fetchJson` gives you most of the same, which is why many modern apps use plain `fetch`.

## 3. Fetching in a component: four states

Every request has four faces: **loading**, **error**, **empty** (the request worked but there is nothing to show) and **data**. A component that handles only the happy path looks broken in the other three.

```jsx
import { useEffect, useState } from 'react'

export function UserList() {
  const [status, setStatus] = useState('loading') // 'loading' | 'error' | 'success'
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const res = await fetch('/api/users', { signal: controller.signal })
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
        const data = await res.json()
        setUsers(data)
        setStatus('success')
      } catch (err) {
        if (err.name === 'AbortError') return // we cancelled it on purpose
        setError(err)
        setStatus('error')
      }
    }

    load()
    return () => controller.abort()
  }, [])

  if (status === 'loading') return <p>Loading users...</p>
  if (status === 'error') return <p role="alert">Could not load users: {error.message}</p>
  if (users.length === 0) return <p>No users found.</p>

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

**What happens, step by step** (I ran this with a mock `fetch`):
1. First render: `status` is `'loading'`, so the screen says `Loading users...`.
2. After the commit the effect runs. It creates an `AbortController` and starts the request.
3. If the server answers 200 with two users, `setUsers` and `setStatus` run together (React batches them into one render) and the list appears.
4. If the server answers `[]`, the status is `success` but the list is empty, so the screen says `No users found.`
5. If the server answers 500, the `if (!res.ok)` line throws. The screen says `Could not load users: Request failed with status 500`.
6. If `fetch` itself rejects (network down), the same `catch` runs and shows `Failed to fetch`.
7. If the component unmounts before the answer arrives, the cleanup aborts the request. The `catch` sees an `AbortError` and returns without touching state.

Why one `status` string instead of three booleans (`loading`, `error`, `done`)? Booleans allow impossible mixes such as "loading and error at the same time". One string cannot be in two states.

**Common mistake:** no error state and no empty state.

```jsx
// Wrong: stays on "Loading..." forever if the request fails,
// and shows an empty page when the list is empty
if (!users) return <p>Loading...</p>
return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
```

```jsx
// Right: one branch per state (see the full component above)
if (status === 'loading') return <p>Loading users...</p>
if (status === 'error') return <p role="alert">Could not load users</p>
if (users.length === 0) return <p>No users found.</p>
```

Why: users judge an app by what it does when things go wrong. Also give the error `role="alert"` so screen readers announce it.

## 4. Race conditions and cancelling a request

A **race condition** is a bug where the result depends on which of two things finishes first. In data fetching it happens when two requests are in flight and the older one finishes last. Its stale answer then overwrites the newer one.

The effect lesson explains the pattern in detail ([Fetching data in an effect, done right](../02-hooks/03-useeffect.md#7-fetching-data-in-an-effect-done-right)). Here is the short version. A profile page shows user `id`. User 1 is slow (2000 ms), user 2 is fast (300 ms). The user clicks "Show user 2" at 500 ms.

```jsx
function UserProfile({ id }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const res = await fetch(`/api/users/${id}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
        setUser(await res.json())
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err) // show an error state in real code
      }
    }

    load()
    return () => controller.abort()
  }, [id])

  return <p>{user ? user.name : 'Loading...'}</p>
}
```

**What happens, step by step** (I ran it with fake timers, both with and without the abort):
1. `id` is 1. The effect starts request A (answer due at 2000 ms). The screen says `Loading...`.
2. At 500 ms the click sets `id` to 2. React runs the cleanup of the old effect first: `controller.abort()`. Request A is cancelled and its promise rejects with an `AbortError`, which the `catch` ignores.
3. The new effect starts request B (answer due at 800 ms).
4. At 800 ms B arrives. At 900 ms the screen says `User 2`.
5. At 2400 ms the screen still says `User 2`. A can never write, because it was cancelled.

Without the abort (the version in the mistake below) the same timeline ends differently: `User 2` at 900 ms, then **`User 1`** at 2400 ms. The screen shows the wrong user.

**Common mistake:** no cleanup.

```jsx
// Wrong: an old answer can arrive late and overwrite the new one
useEffect(() => {
  fetch(`/api/users/${id}`)
    .then((res) => res.json())
    .then(setUser)
}, [id])
```

```jsx
// Right: abort the old request when id changes or the component unmounts
useEffect(() => {
  const controller = new AbortController()
  fetch(`/api/users/${id}`, { signal: controller.signal })
    .then((res) => res.json())
    .then(setUser)
    .catch((err) => {
      if (err.name !== 'AbortError') console.error(err)
    })
  return () => controller.abort()
}, [id])
```

Why: each effect run gets its own controller. The cleanup of the previous run cancels the previous request, so only the newest request may set state.

Facts to remember:
- **How to cancel:** create `new AbortController()`, pass `controller.signal` to `fetch`, call `controller.abort()`. The `fetch` promise rejects with an error whose `name` is `AbortError`.
- **Abort cancels the waiting, not the work.** The browser stops listening. The server may still process the request. Aborting a POST does not undo it.
- **The ignore flag** is the alternative for things you cannot cancel, such as a promise from a library: `let ignore = false`, set it to `true` in the cleanup, and write `if (!ignore) setUser(data)`.
- **StrictMode** (development only) runs the effect, the cleanup, then the effect again. You will see two requests and the first one is aborted. In my run of the `UserList` above the screen showed the list once and no error. The double request is React checking your cleanup.

## 5. Writing your own `useFetch` (and why you should stop there)

When several components fetch, you move the effect into a custom hook. This is the version I use for teaching:

```jsx
import { useEffect, useState } from 'react'

export function useFetch(url) {
  const [result, setResult] = useState({ url: null, data: undefined, error: undefined })

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
        const data = await res.json()
        setResult({ url, data, error: undefined })
      } catch (error) {
        if (error.name === 'AbortError') return
        setResult({ url, data: undefined, error })
      }
    }

    load()
    return () => controller.abort()
  }, [url])

  // The stored result only counts if it belongs to the current url.
  if (result.url !== url) return { status: 'loading', data: undefined, error: undefined }
  if (result.error) return { status: 'error', data: undefined, error: result.error }
  return { status: 'success', data: result.data, error: undefined }
}
```

Use it like this:

```jsx
function Todos() {
  const { status, data, error } = useFetch('/api/todos')

  if (status === 'loading') return <p>Loading...</p>
  if (status === 'error') return <p role="alert">{error.message}</p>
  return (
    <ul>
      {data.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  )
}
```

**What happens, step by step:**
1. The hook stores each answer together with the `url` it belongs to.
2. When `url` changes, the stored answer no longer matches, so the hook returns `loading` in the very same render. Old data is never shown for a new URL. I logged every render while switching from `/a` to `/b`: `/a loading`, `/a success`, `/b loading`, `/b success`. No render mixed `/b` with the data of `/a`.
3. The cleanup aborts the old request, so a slow answer cannot overwrite a new one.
4. A 404 shows `Request failed with status 404` through the error branch.

This hook is fine for a demo or a tiny app. Now watch what it cannot do. In a test I rendered two `<Todos />` side by side, then unmounted and mounted `<Todos />` again:
- Two components with the same URL sent **2 requests** for the same data.
- After unmounting and mounting again, the first paint was `Loading...` and the request count went from 2 to 3. Everything was thrown away and fetched again.

A real app also needs:
- **Caching:** remember the answer and reuse it when you come back.
- **Deduping:** one request when ten components ask for the same data.
- **Retries:** try again after a flaky failure, with a delay that grows.
- **Stale-while-revalidate:** show the old answer instantly and refresh it quietly.
- **Background refetch:** refresh when the tab regains focus or the network returns.
- **Pagination and infinite lists:** keep the old page on screen while the next loads.
- **Mutations:** after a POST, refresh the lists that changed.
- **Optimistic updates:** show the result before the server confirms.
- **Cleanup of unused cache,** devtools, server rendering support.

Each item is days of work and a source of subtle bugs. TanStack Query has done all of it. The right move is to know how the hook works (interviewers ask you to write it), and to use a library in a real app. To build the cached version yourself as practice, do the exercise [mini query hook](../practice-app/exercises/react/27-mini-query-hook/README.md).

**Common mistake:** a new object in the dependency list.

```jsx
// Wrong: `options` is a new object on every render, so the effect re-runs forever
function useFetch(url, options) {
  useEffect(() => { /* fetch(url, options) */ }, [url, options])
}
useFetch('/api/todos', { headers: {} })
```

```jsx
// Right: depend on primitive values, or define the options outside the component
const options = { headers: {} }
function Todos() {
  useFetch('/api/todos', options)
}
```

Why: React compares dependencies with `Object.is`. A fresh `{}` is never equal to the previous one. See [useEffect](../02-hooks/03-useeffect.md) for the full story.

<!--PART2-->
