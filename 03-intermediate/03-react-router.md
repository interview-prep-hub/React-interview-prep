# Routing with React Router

> **Level:** Intermediate   **Time:** about 65 minutes   **Read first:** [Components and props](../01-basics/04-components-and-props.md), [useEffect](../02-hooks/03-useeffect.md), [useContext](../02-hooks/05-usecontext.md)

## What you will learn
- Explain how client-side routing works (History API, no page reload) and why a deep link needs a server fallback to `index.html`.
- Install React Router 8 and import from the right places (`react-router`, plus `react-router/dom` for `RouterProvider`).
- Build routes with links, URL params, search params, nested routes, layouts, index routes and a 404 page.
- Navigate from code and build a protected route that sends the user back where they came from, while knowing why it is not real security.
- Use a data router: loaders, actions, `Form`, pending UI, `useFetcher`, error boundaries and lazy routes.
- Choose between library mode and framework mode, and compare React Router with Next.js and TanStack Router.

Where this lesson says "we ran it" or "we saw", the output comes from a real test run (React Router 8.5.1, React 19.3.1, Vitest and jsdom), not from memory.

## 1. How client-side routing works

A **route** is a rule that connects a URL to a piece of UI: "when the URL is `/about`, show the About page".

On an old-style website, every URL is a separate request. You click a link, the browser asks the server for that page, and a whole new HTML document arrives. The old page is thrown away. This is a **full page load**.

A React app is usually a **single-page app** (SPA). The server sends one HTML file and one JavaScript bundle, and React draws everything. If every link did a full page load, you would lose all your React state on every click and download the bundle again. **Client-side routing** fixes this. JavaScript changes the address bar and the screen by itself, and the browser never asks the server for a new page.

The browser gives you two tools for this. Both belong to the **History API**:

- `history.pushState(state, '', url)` changes the address bar and adds an entry to the history list. It sends **no request** and does **not** reload the page.
- The `popstate` event fires on `window` when the user presses Back or Forward. (Calling `pushState` yourself does not fire it.)

A router is a small loop built on those two tools: catch link clicks and call `pushState`, listen for `popstate`, read the location, and decide what to render. Here is a tiny one. It is only for learning the idea.

```jsx
import { useEffect, useState } from 'react'

export default function MiniRouter() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function go(event, to) {
    event.preventDefault() // stop the browser's normal full page load
    window.history.pushState({}, '', to) // change the URL, no request
    setPath(to) // tell React to re-render
  }

  return (
    <div>
      <nav>
        <a href="/" onClick={(e) => go(e, '/')}>Home</a>{' '}
        <a href="/about" onClick={(e) => go(e, '/about')}>About</a>
      </nav>
      <h1>{path === '/about' ? 'About' : 'Home'}</h1>
    </div>
  )
}
```

**What happens, step by step:**
1. On the first render, `path` is read from `window.location.pathname`. The heading shows "Home".
2. The effect adds a `popstate` listener. The cleanup removes it.
3. The user clicks "About". `go` runs. `preventDefault()` stops the browser from loading a new page.
4. `pushState` changes the address bar to `/about` and adds a history entry.
5. `setPath('/about')` makes React render again, and the heading becomes "About".
6. The user presses Back. The browser changes the URL itself and fires `popstate`. The listener reads the new pathname, calls `setPath`, and the heading goes back to "Home".

We ran this in a test. Before the click: URL `/`, heading Home, `history.length` was 1. After the click: URL `/about`, heading About, `history.length` was 2, and `popstate` had fired 0 times. A marker element we had added to the page was still there, so nothing reloaded. After `history.back()`, the heading was Home again and `popstate` had fired once.

**Common mistake:** changing the URL without telling React.

```jsx
// Wrong: the address bar changes, the screen does not
<a href="/about" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/about') }}>About</a>
```

```jsx
// Right: also update state, so React renders the new page
<a href="/about" onClick={(e) => go(e, '/about')}>About</a>
```

Why: React does not watch the address bar. Keeping the URL and the screen in sync is exactly the job of a router library.

### Deep links and the server fallback

A **deep link** is a URL that points inside your app, like `https://shop.example/products/2`. A user can bookmark it, share it, or press refresh while on it. In all three cases the browser asks the **server** for `/products/2`. The server has no such file, because that page only exists inside your JavaScript. A plain static host answers "404 Not Found", and your app never starts.

The fix is a **history fallback** (also called SPA fallback). Tell the server: "for any path that is not a real file, send `index.html`". The browser then loads your bundle, React Router reads `/products/2` from the address bar, and it shows the product page.

```text
# nginx: try the real file first, otherwise send index.html
location / {
  try_files $uri /index.html;
}
```

```text
# Netlify style _redirects file: same idea, status 200 so the URL stays
/*    /index.html   200
```

Vite's dev server already does this for you, which is why the problem often shows up only after the first deploy. If you cannot change the server, a hash router avoids the problem (section 21).

## 2. Install React Router 8 and pick a mode

React Router is the most used routing library for React. In November 2026 the current major version is **8** (8.5.x). Install one package:

```bash
npm install react-router
```

What to know about version 8:
- It needs **Node 22.22 or newer** and **React and React DOM 19.2.7 or newer**. This book uses React 19.3. The packages are ESM-only (use `import`, not `require`).
- **Import everything from `react-router`.** The one exception is `RouterProvider` (and `HydratedRouter` in framework mode): import those from `react-router/dom`.
- The separate `react-router-dom` package no longer exists in v8. Its last release was 7.18.5. Old tutorials import from it. In new code, change that import to `react-router`.

A short history, because interviewers like it:
- **v6** replaced `Switch` with `Routes`, `component` with `element`, and `useHistory` with `useNavigate`.
- **v6.4** added data routers (loaders and actions).
- **v7** (November 2024) merged the Remix framework into React Router and moved the browser-only parts into `react-router`. The `react-router-dom` package stayed as a thin copy of the exports.
- **v8** (June 2026) removed `react-router-dom`, became ESM-only, and raised the Node and React minimums.

React Router has **three modes**. Each mode adds to the one before it.

| Mode | What you write | What you get |
|---|---|---|
| Declarative | `<BrowserRouter>`, `<Routes>`, `<Route>` | URL matching, links, params, navigation |
| Data | Route objects, `createBrowserRouter`, `<RouterProvider>` | All of the above plus loaders, actions, `Form`, fetchers, pending state, error boundaries |
| Framework | A Vite plugin, `app/routes.ts`, route modules | All of the above plus generated types, server rendering options, automatic code splitting |

"Library mode" means declarative or data mode: you use React Router as a library inside your own Vite app. "Framework mode" means React Router also controls your build and (optionally) your server.

Sections 3 to 11 use declarative mode because it is the simplest. From section 12 we switch to data mode, which is what you would choose today for a new single-page app that loads data. Links, params, nested routes and navigation work the same in both.

**Common mistake:** importing `RouterProvider` from the wrong place.

```jsx
// Wrong: this is the core version, without the react-dom hookup
import { createBrowserRouter, RouterProvider } from 'react-router'
```

```jsx
// Right
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
```

Why: `react-router/dom` exports the same component with `flushSync` from `react-dom` already passed in. The core package stays free of `react-dom`, so the browser build needs the `/dom` one.

## 3. Your first routes: BrowserRouter, Routes, Route and Link

Create a project and add the router:

```bash
npm create vite@latest shop -- --template react
cd shop
npm install
npm install react-router
```

Wrap the app in `BrowserRouter`. It is the router that uses the History API.

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

Now describe your pages.

```jsx
// src/App.jsx
import { Link, Route, Routes } from 'react-router'

function Home() {
  return <h1>Home</h1>
}

function About() {
  return <h1>About</h1>
}

export default function App() {
  return (
    <>
      <nav>
        <Link to="/">Home</Link> <Link to="/about">About</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </>
  )
}
```

**What happens, step by step:**
1. `BrowserRouter` reads the current URL and puts it in context. It listens for Back and Forward.
2. `Routes` looks at the URL and finds the best matching `Route`. At `/about` that is the second one.
3. It renders that route's `element`. Only one page shows at a time.
4. `Link` renders a real `<a href="/about">`. On a normal left click it prevents the full page load and tells the router to navigate. The router calls `pushState`, the context changes, and `Routes` renders the new match.
5. Because `Link` is a real anchor, "open in a new tab", middle click and right click still work.

The best match wins, not the first one. If you have `products/:id` and `products/new`, the URL `/products/new` goes to the second route even if you list it last. We ran that: the static path beats the dynamic one, whatever the order. A trailing slash is ignored: `/products/` matches `products`.

**Common mistake:** using a plain anchor for an internal page.

```jsx
// Wrong: the browser asks the server for /about and reloads everything
<a href="/about">About</a>
```

```jsx
// Right: client-side navigation, React state survives
<Link to="/about">About</Link>
```

Why: a plain `<a>` starts a full page load. Keep `<a href>` for other websites.

## 4. NavLink and the active state

A navigation bar usually shows which page you are on. `NavLink` is a `Link` that knows if its target is the current page.

```jsx
import { NavLink } from 'react-router'

function Nav() {
  return (
    <nav>
      <NavLink to="/" end>Home</NavLink>
      <NavLink to="/blog">Blog</NavLink>
      <NavLink
        to="/about"
        className={({ isActive }) => (isActive ? 'on' : 'off')}
      >
        About
      </NavLink>
    </nav>
  )
}
```

```css
a.active {
  font-weight: bold;
}
```

**What happens, step by step:**
1. A `NavLink` compares its `to` with the current URL.
2. When it matches, it adds the class `active` and the attribute `aria-current="page"` (screen readers announce "current page").
3. `className`, `style` and `children` can also be functions. They receive `{ isActive, isPending }`, so you can build your own classes. `isPending` is true while the target page is loading (data routers only).

We ran a nav at the URL `/blog/42`. The `Blog` link got `class="active"` and `aria-current="page"`. A second `Blog` link with `end` got neither. A link to `/` was not active on `/blog/42`, even without `end`, but the official examples still write `end` on the home link, and it never hurts.

By default a `NavLink` is active for its own path **and anything deeper**. The `end` prop makes it match only the exact path.

**Common mistake:** a parent tab that stays lit on the child pages.

```jsx
// Wrong: "Overview" is also highlighted on /dashboard/settings
<NavLink to="/dashboard">Overview</NavLink>
<NavLink to="/dashboard/settings">Settings</NavLink>
```

```jsx
// Right: only highlight Overview on exactly /dashboard
<NavLink to="/dashboard" end>Overview</NavLink>
<NavLink to="/dashboard/settings">Settings</NavLink>
```

Why: without `end`, `/dashboard/settings` counts as "inside /dashboard".

## 5. URL params with useParams

Many pages show one item out of many: a product, a user, a post. You do not write a route per item. You write one route with a **dynamic segment**, a path part that starts with `:`.

```jsx
import { Route, Routes, useParams } from 'react-router'

function User() {
  const { id } = useParams()
  return <h1>User number {id}</h1>
}

export default function App() {
  return (
    <Routes>
      <Route path="/users/:id" element={<User />} />
    </Routes>
  )
}
```

**What happens, step by step:**
1. The URL is `/users/42`. The pattern `/users/:id` matches, and `:id` captures `42`.
2. `useParams()` returns an object of all captured values: `{ id: '42' }`.
3. You can have several: `/c/:categoryId/p/:productId` gives `{ categoryId, productId }`.
4. Add `?` to make a segment optional (`:lang?/about`). A pattern that ends in `/*` is a **splat**: it matches the rest of the path, and you read it as `params['*']`.

Use a param to say **which thing** the page is about. Use search params (next section) for optional extras like a filter.

Params are **always strings**. We ran a component that shows `{id + 1} {Number(id) + 1} {typeof id}` at `/users/42`. It printed `421 43 string`.

**Common mistake:** doing math on a param.

```jsx
// Wrong: "42" + 1 is the string "421"
const nextId = id + 1
```

```jsx
// Right: convert first, and check the result
const numericId = Number(id)
const nextId = Number.isNaN(numericId) ? null : numericId + 1
```

Why: a URL is text. Anything you read from it is text until you convert it.

## 6. Search params with useSearchParams

**Search params** (also called the query string) are the part after `?`: `/search?q=react&page=2`. They are great for state that should survive a refresh, be shareable and work with the Back button: a search text, a filter, a sort order, a page number.

`useSearchParams` works like `useState`. It returns the current values and a setter. The values come as a standard `URLSearchParams` object.

```jsx
import { useSearchParams } from 'react-router'

const FRUIT = ['apple', 'apricot', 'banana', 'cherry']

export default function FruitSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const shown = FRUIT.filter((name) => name.includes(q.toLowerCase()))

  return (
    <div>
      <label>
        Search{' '}
        <input
          value={q}
          onChange={(event) => {
            const value = event.target.value
            setSearchParams(value ? { q: value } : {}, { replace: true })
          }}
        />
      </label>
      <ul>
        {shown.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  )
}
```

Use it in a route (`<Route path="/fruit" element={<FruitSearch />} />`) and open `/fruit?q=ap`.

**What happens, step by step:**
1. The URL is `/fruit?q=ap`. `searchParams.get('q')` returns `'ap'`, and the input shows it. The list shows `apple` and `apricot`.
2. The user types `b`. The handler calls `setSearchParams({ q: 'apb' })`. The router changes the URL and every component using the hook renders again.
3. `{ replace: true }` replaces the current history entry instead of adding one. Without it, every key press would add a Back-button step.
4. There is **no `useState` for the text**. The URL is the single source of truth, and we read it on every render. That is why a refresh keeps the filter.

What we saw when we ran it: `get('q')` gives a string, or `null` when the key is missing. `getAll('tag')` gives an array for repeated keys (`?tag=a&tag=b`). Clearing the input with `setSearchParams({}, ...)` left the URL as `/fruit`.

**Common mistake:** replacing all params when you wanted to change one.

```jsx
// Wrong: this wipes q (and every other param)
setSearchParams({ page: '2' })
```

```jsx
// Right: copy the old params, change one
setSearchParams((previous) => {
  const next = new URLSearchParams(previous)
  next.set('page', '2')
  return next
})
```

Why: the object form means "this is the whole query string now". We ran both: the first one removed `q` from the URL. Note that the function form does not queue like `setState`: two calls in the same tick do not build on each other.

## 7. Nested routes, Outlet, index routes and layout routes

Most apps have shared UI around the pages: a header, a sidebar, tabs. **Nested routes** let a parent route draw the shared part and the child draw the changing part. The parent says where the child goes with `<Outlet />` (an Outlet is a placeholder that React Router fills with the matching child).

```jsx
import { Outlet, Route, Routes, useParams } from 'react-router'

function Layout() {
  return (
    <div>
      <header>My shop</header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

function ProductsLayout() {
  return (
    <section>
      <h2>Products</h2>
      <Outlet />
    </section>
  )
}

function ProductDetail() {
  const { id } = useParams()
  return <p>Product {id}</p>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<p>Home</p>} />
        <Route path="products" element={<ProductsLayout />}>
          <Route index element={<p>Pick a product</p>} />
          <Route path=":id" element={<ProductDetail />} />
        </Route>
      </Route>
    </Routes>
  )
}
```

**What happens, step by step:**
1. A child's path is **relative to its parent**. `products` inside `/` is `/products`. `:id` inside that is `/products/:id`. Do not repeat the parent path.
2. At `/`: `Layout` renders, and its `Outlet` shows the index route, "Home".
3. At `/products`: `Layout` renders, then `ProductsLayout` in its Outlet, then "Pick a product" in the inner Outlet.
4. At `/products/7`: the same chain, ending with "Product 7". The header and the "Products" heading never re-mount when you move between products.

Three kinds of route you should be able to name:
- **Index route**: a child with `index` and no path. It is the default child, shown in the parent's Outlet at the parent's own URL. It cannot have children.
- **Layout route**: a route with an `element` but **no `path`**. It wraps its children in shared UI without adding a URL segment. Example: one layout for `/login` and `/register`.
- **Prefix route**: a route with a `path` but **no `element`**. It only adds a URL prefix to its children.

A parent can also hand data to its children with `<Outlet context={value} />`, and a child reads it with `useOutletContext()`.

**Common mistake:** forgetting the `Outlet`.

```jsx
// Wrong: the child route matches, but it has nowhere to render
function ProductsLayout() {
  return <h2>Products</h2>
}
```

```jsx
// Right
function ProductsLayout() {
  return (
    <>
      <h2>Products</h2>
      <Outlet />
    </>
  )
}
```

Why: a child route only appears where its parent renders an `Outlet`. We ran the wrong version at `/a/b` and only the parent's text was on the screen.

## 8. 404 pages and catch-all routes

A route with `path="*"` matches any URL that no other route matched. Put it inside your layout so the header stays.

```jsx
<Route path="/" element={<Layout />}>
  <Route index element={<p>Home</p>} />
  <Route path="products" element={<ProductsLayout />}>
    <Route index element={<p>Pick a product</p>} />
    <Route path=":id" element={<ProductDetail />} />
  </Route>
  <Route path="*" element={<p>Page not found</p>} />
</Route>
```

We ran this tree at several URLs. `/nope` and `/products/7/extra` both showed "Page not found" inside the layout. `/products/` showed the products index.

**What happens if you have no catch-all?**
- In declarative mode nothing renders for the unknown URL, and the console warns `No routes matched location "/zzz"`.
- In a data router (section 12) React Router shows its built-in error screen, which starts with "Unexpected Application Error! 404 Not Found". That screen is meant for developers, not users.

A single-page app has one more catch: the server usually answers `index.html` with status **200** even for an unknown URL, so search engines do not see a real 404. Server rendering (framework mode, Next.js) can send a real 404 status.

**Common mistake:** no catch-all in a data router.

```jsx
// Wrong: /oops shows the developer error screen
createBrowserRouter([{ path: '/', Component: Layout, children: [] }])
```

```jsx
// Right: a friendly page for every unknown URL
createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [{ path: '*', Component: NotFound }],
  },
])
```

Why: `*` is the only thing that matches "everything else". A missing record (product 99 does not exist) is a different problem. A loader handles that case (sections 13 and 17).

## 9. Navigating from code: useNavigate, Navigate and state

Links are for things the user clicks. Sometimes you must navigate **in code**: after a save, after a login, after a timer. React Router gives you three tools.

| Tool | What it is | Use it |
|---|---|---|
| `useNavigate()` | A hook that returns a function | In event handlers, effects or after an `await` |
| `<Navigate to="..." />` | A component | In JSX, to redirect when something is rendered |
| `redirect("...")` | A function that returns a response | In loaders, actions and middleware (data routers) |

```jsx
import { Navigate, useNavigate } from 'react-router'

const saveDraft = () => new Promise((resolve) => setTimeout(resolve, 300)) // pretend API

function SaveButton() {
  const navigate = useNavigate()

  async function handleSave() {
    await saveDraft()
    navigate('/drafts', { replace: true, state: { saved: true } })
  }

  return <button onClick={handleSave}>Save</button>
}

function Account({ user }) {
  if (!user) return <Navigate to="/login" replace />
  return <h1>Hello {user.name}</h1>
}
```

**What happens, step by step:**
1. `navigate('/drafts')` pushes a new history entry, like a link click.
2. `replace: true` **replaces** the current entry instead. After that, Back skips the page you just left. Use it for redirects.
3. `state` is any data you attach to this history entry. The next page reads it with `useLocation().state`. It does not appear in the URL.
4. `navigate(-1)` goes back one step, like the Back button. A positive number goes forward.
5. `<Navigate>` does the same as `navigate` when it renders.

We ran push, replace and back and printed `useNavigationType()` each time: `PUSH` after `navigate('/a')`, `REPLACE` after the replace (with the state `{"why":"x"}` visible in `useLocation().state`), and `POP` after `navigate(-1)`, which landed on `/` because the replaced entry had taken the place of `/a`.

`<Link>` can carry state too: `<Link to="/inbox" state={{ from: 'home' }}>`. The location object has `pathname`, `search`, `hash`, `state` and `key`. State lives in the history entry, so it survives a refresh, but it is lost if the user opens the URL in a new tab.

**Common mistake:** calling `navigate` while rendering.

```jsx
// Wrong: side effect during render
function Account({ user }) {
  const navigate = useNavigate()
  if (!user) navigate('/login')
  return <h1>Hello</h1>
}
```

```jsx
// Right: return a Navigate element (or call navigate in an effect or handler)
function Account({ user }) {
  if (!user) return <Navigate to="/login" replace />
  return <h1>Hello</h1>
}
```

Why: a render must stay pure. React Router even warns: "You should call navigate() in a React.useEffect(), not when your component is first rendered."

## 10. Relative links

A link whose `to` does **not** start with `/` is **relative**. In React Router it is relative to the **route** that renders the link, not to the whole URL. This is handy because a component keeps working when you mount its routes somewhere else.

```jsx
import { Link, Outlet, Route, Routes } from 'react-router'

function Team() {
  return (
    <div>
      <Link to="edit">edit</Link>
      <Link to="..">up one route</Link>
      <Link to=".." relative="path">up one URL segment</Link>
      <Link to="/abs">absolute</Link>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Outlet />}>
        <Route path="teams/:teamId" element={<Team />} />
      </Route>
    </Routes>
  )
}
```

The URL is `/teams/42`. We read the `href` of each link:

```text
edit               -> /teams/42/edit
up one route       -> /
up one URL segment -> /teams
absolute           -> /abs
```

**What happens, step by step:**
1. `to="edit"` is added to the current route's URL, `/teams/42`.
2. `to=".."` goes up one **route level**. `teams/:teamId` is one route that spans two URL segments, so one level up is its parent, the `/` route.
3. `relative="path"` changes the rule to "remove one URL segment", so you get `/teams`.
4. If you had nested routes instead (`teams` with a child `:teamId`), then `..` from the child gives `/teams`. We ran that too.

In the full example (section 23) the product list uses `<Link to={product.id}>` and the detail page uses `<Link to="..">`. They resolve to `/products/1` and `/products`.

**Common mistake:** thinking `..` works like a folder path.

```jsx
// Wrong guess: this goes to /teams (it goes to / here)
<Link to="..">Back to teams</Link>
```

```jsx
// Right: say what you mean
<Link to=".." relative="path">Back to teams</Link>
{/* or simply: */}
<Link to="/teams">Back to teams</Link>
```

Why: `..` counts route levels. When one route has several URL segments, the two counts differ.

## 11. Protected routes (declarative version)

A **protected route** (private route) is a page only some users may see. The pattern:

1. If the user is not logged in, redirect to `/login`.
2. Remember the page they wanted.
3. After login, send them back there.

We use a **layout route** that renders `<Outlet />` when allowed and `<Navigate>` when not. All pages under it are protected with one component.

```jsx
// src/App.jsx
import { createContext, useContext, useState } from 'react'
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router'

const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const value = {
    user,
    login: (name) => setUser({ name }),
    logout: () => setUser(null),
  }
  return <AuthContext value={value}>{children}</AuthContext>
}

function useAuth() {
  return useContext(AuthContext)
}

function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from ?? { pathname: '/' }

  function handleClick() {
    login('Ada')
    navigate(from, { replace: true })
  }

  return (
    <>
      <p>Please log in to see {from.pathname}.</p>
      <button onClick={handleClick}>Log in</button>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<p>Dashboard</p>} />
          <Route path="/settings" element={<p>Settings</p>} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
```

(The context idea is explained in [useContext](../02-hooks/05-usecontext.md).)

**What happens, step by step:**
1. A logged-out user opens `/settings?tab=billing`. The `RequireAuth` route matches first.
2. `user` is `null`, so it renders `<Navigate to="/login" replace state={{ from: location }} />`. The whole location object (path, search and hash) goes into the state.
3. The login page shows "Please log in to see /settings".
4. The user clicks "Log in". `login` sets the user, and `navigate(from, { replace: true })` goes back to the saved location.
5. This time `RequireAuth` finds a user and renders the `Outlet`, which shows Settings.

We ran this from `/settings?tab=billing#card`. After login the URL was `/settings?tab=billing#card`. Query and hash survived because we passed the whole `from` object, not just `from.pathname`.

Two limits to remember:
- If you restore the session asynchronously (from a cookie, with a request), `user` is `null` for a moment. Add a `loading` state and render a spinner, otherwise a logged-in user is bounced to the login page on every refresh.
- This guard only controls what the **browser shows**. Anyone can read your JavaScript. Real protection happens on the server (section 18).

**Common mistake:** redirecting without `replace`.

```jsx
// Wrong: Back returns to /dashboard, which redirects to /login again: a trap
<Navigate to="/login" state={{ from: location }} />
```

```jsx
// Right: the redirect replaces the page the user could not see
<Navigate to="/login" replace state={{ from: location }} />
```

Why: without `replace`, history holds both entries. We ran it: after a redirect and one Back press, the user was still on `/login`. With `replace`, Back went to the page before.

## 12. Data routers: createBrowserRouter and RouterProvider

`<BrowserRouter>` lives inside React. It learns the URL only while React is rendering, so it cannot start loading data for the next page before that page renders. A **data router** is different. You create it **outside React**, from a list of route objects. It owns the navigation, so it can look at the URL, run what each route needs, wait for the answers, and only then render. That unlocks loaders, actions, pending state and error handling.

Here are the routes from section 7 as route objects.

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { Home, Layout, NotFound, ProductDetail, ProductList, ProductsLayout } from './pages.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Home },
      {
        path: 'products',
        Component: ProductsLayout,
        children: [
          { index: true, Component: ProductList },
          { path: ':id', Component: ProductDetail },
        ],
      },
      { path: '*', Component: NotFound },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

How the JSX style maps to route objects:

| Declarative JSX | Route object |
|---|---|
| `<Route path="x" element={<X />}>` | `{ path: 'x', Component: X }` (or `element: <X />`) |
| Nested `<Route>` | `children: [ ... ]` |
| `<Route index element={<X />} />` | `{ index: true, Component: X }` |
| `<Route path="*" ... />` | `{ path: '*', ... }` |

`Component: X` passes the component itself, and React Router creates the element. Use `element: <X prop={1} />` if you need to pass props. You may still write JSX routes and convert them with `createRoutesFromElements(...)`.

Everything else you learned (`Link`, `NavLink`, `Outlet`, `useParams`, `useSearchParams`, `useNavigate`, `Navigate`) works unchanged. If your app is served from a sub-path (for example `/my-app/`), pass `{ basename: '/my-app' }` as the second argument. We checked that links then get `/app/search?...` style hrefs.

**What happens, step by step:**
1. `createBrowserRouter(routes)` runs **once**, when the module loads. It creates the router object and reads the current URL.
2. `RouterProvider` connects that router to React. When the router state changes, React renders again.
3. A click on a `Link` goes to the router, not to React state. The router decides what to run and when to update the screen.

**Common mistake:** creating the router inside a component.

```jsx
// Wrong: a new router is created on every render, and its state is lost
function App() {
  const router = createBrowserRouter(routes)
  return <RouterProvider router={router} />
}
```

```jsx
// Right: create it once, at module level
const router = createBrowserRouter(routes)

function App() {
  return <RouterProvider router={router} />
}
```

Why: the router holds the navigation state. The docs say: do not keep a data router in React state, create it once outside the tree.

## 13. Loaders: get the data before the page renders

A **loader** is a function on a route object. React Router calls it **before** it renders the route, and the component reads the result with `useLoaderData()`.

Compare with the usual "fetch in an effect" approach from [useEffect](../02-hooks/03-useeffect.md). There the page renders first (empty), then the effect starts the request, then the page renders again with data, and you manage loading and error state yourself. With a loader, the component runs only when its data is ready.

```jsx
// routes (in main.jsx or routes.jsx)
import { data } from 'react-router'
import { getProduct } from './api.js'

const routes = [
  {
    path: '/products/:id',
    loader: async ({ params, request }) => {
      const product = await getProduct(params.id, { signal: request.signal })
      if (!product) throw data('Product not found', { status: 404 })
      return { product }
    },
    Component: ProductDetail,
  },
]
```

```jsx
// the component
import { useLoaderData } from 'react-router'

function ProductDetail() {
  const { product } = useLoaderData()
  return <h1>{product.name}</h1>
}
```

Here `getProduct` is any function that returns a promise (a `fetch` call in a real app). The complete version with fake data is in section 23.

**What happens, step by step:**
1. The user clicks `<Link to="/products/2">`.
2. The router matches the routes and calls the `loader` of every matched route **at the same time**, not one after another. No waterfall.
3. While it waits, the router stays on the **old** page and the old URL. The new location shows up as `useNavigation().location` (next section).
4. When all loaders finish, the router commits: the URL changes and the component renders. `useLoaderData()` already has the product.
5. If a loader throws, the nearest error boundary renders instead (section 17). `throw data(body, { status })` makes a thrown "HTTP-like" error with a status code. `redirect(...)` sends the user elsewhere.
6. If the user clicks another link before the loader finishes, React Router cancels the old navigation. `request.signal` is an `AbortSignal` that becomes aborted. Pass it to `fetch` to cancel the network request. We ran this: the interrupted loader saw `signal.aborted === true`.

A loader receives `{ params, request, url, context }`. `request` is a standard Fetch `Request`. Read search params with `new URL(request.url).searchParams`. In v8 the `url` argument is a ready-made `URL`, so `url.searchParams.get('q')` also works. We ran both in a data router.

**When does a loader run again?** (revalidation)
- when its own route params change (`/products/1` to `/products/2` re-runs the product loader),
- when **any** search param changes (this re-runs every loader on the page),
- after an action finishes without an error (section 15),
- when you call `useRevalidator().revalidate()`.

We counted calls with a root loader and a product loader. Going from `/products/1` to `/products/2` ran only the product loader (root stayed at 1 call). Going to `/products/2?x=1` ran both again. You can opt out with a `shouldRevalidate` function on the route.

Two things to keep in mind:
- In library mode, loaders and actions run **in the browser**. They are normal client code. Never put secrets in them. (In framework mode, a `loader` runs on the server.)
- A loader does not cache. For caching, background refresh and shared data across pages, combine loaders with a library such as TanStack Query (see [Data fetching](02-data-fetching.md)).

### Streaming slow data with Await

Sometimes one part of the page is slow. Return the **promise itself** (do not `await` it) and show it with `Await` inside `Suspense`. The page renders without waiting for that part.

```jsx
import { Suspense } from 'react'
import { Await, useLoaderData } from 'react-router'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function loader() {
  const title = 'Post title'
  const comments = sleep(1000).then(() => ['nice', 'thanks']) // not awaited
  return { title, comments }
}

export function Post() {
  const { title, comments } = useLoaderData()
  return (
    <>
      <h1>{title}</h1>
      <Suspense fallback={<p>Loading comments...</p>}>
        <Await resolve={comments} errorElement={<p>Could not load comments</p>}>
          {(list) => (
            <ul>
              {list.map((comment) => (
                <li key={comment}>{comment}</li>
              ))}
            </ul>
          )}
        </Await>
      </Suspense>
    </>
  )
}
```

We saw the title and "Loading comments..." first, then the list. (Old code used `defer()` for this. It was removed in v7. A plain object with a promise inside does the same job.)

**Common mistake:** returning `null` for "not found" and crashing in the component.

```jsx
// Wrong: the component crashes on product.name
loader: async ({ params }) => ({ product: await getProduct(params.id) }),
```

```jsx
// Right: say "not found" in the loader
loader: async ({ params }) => {
  const product = await getProduct(params.id)
  if (!product) throw data('Product not found', { status: 404 })
  return { product }
},
```

Why: when `getProduct` finds nothing it returns `null`, and `product.name` then throws a `TypeError`. A thrown 404 goes to an error boundary that can show a friendly page.

## 14. Pending UI with useNavigation

Because the router waits for loaders, the user clicks a link and sees nothing change for a moment. You must show that something is happening. `useNavigation()` tells you.

```jsx
import { Outlet, useNavigation } from 'react-router'

function Layout() {
  const navigation = useNavigation()
  const isLoading = navigation.state === 'loading'

  return (
    <div>
      <header>{isLoading && <p role="status">Loading...</p>}</header>
      <main style={{ opacity: isLoading ? 0.6 : 1 }}>
        <Outlet />
      </main>
    </div>
  )
}
```

**What happens, step by step:**
1. `navigation.state` is one of `'idle'`, `'loading'` or `'submitting'`.
2. A click on a link whose route has a loader goes `idle`, `loading`, `idle`. We logged this: `idle > loading:/products/1 > idle`. While loading, `navigation.location` is where the user is going.
3. A form submission goes `idle`, `submitting`, `loading`, `idle` when the action redirects. We logged `idle > submitting > loading > idle`.
4. `navigation.formMethod` and `navigation.formData` describe the submission while it is in flight.
5. The old page stays on the screen while loading. Dimming it (as above) is a nice touch.

Per-link pending state is available too. `NavLink`'s `className`, `style` and `children` functions get `isPending`. We saw the class `pending` while a slow route loaded, and `active` after.

### The first load: HydrateFallback

On the very first visit there is no old page to keep. If the first URL has a loader, the router shows **nothing** until the loader finishes (we saw an empty page), and in development it prints the warning "No `HydrateFallback` element provided to render during initial hydration". Give the root route a `HydrateFallback` to show something.

```jsx
{
  path: '/',
  Component: Layout,
  HydrateFallback: () => <p>Loading app...</p>,
  loader: rootLoader,
  children: [ /* ... */ ],
}
```

In our test the fallback text showed first, then the real page.

**Common mistake:** using the wrong state for a submit button.

```jsx
// Wrong: during a form submit the state is 'submitting', so this never shows
{navigation.state === 'loading' ? 'Saving...' : 'Save'}
```

```jsx
// Right
{navigation.state === 'submitting' ? 'Saving...' : 'Save'}
```

Why: `loading` means "running loaders". A form first spends time in `submitting` (running the action).

## 15. Actions and Form: writing data

A **loader** reads data. An **action** writes it. An action is a function on a route object, called when a `<Form>` posts to that route. Its job: read the form, change something (usually with an API call), and return a result or redirect.

```jsx
import { Form, redirect, useActionData, useNavigation } from 'react-router'
import { createNote } from './api.js'

export async function newNoteAction({ request }) {
  const formData = await request.formData()
  const title = String(formData.get('title') ?? '').trim()

  if (!title) {
    return { error: 'Title is required.' }
  }

  const note = await createNote({ title })
  return redirect(`/notes/${note.id}`)
}

export function NewNote() {
  const actionData = useActionData()
  const navigation = useNavigation()
  const saving = navigation.state === 'submitting'

  return (
    <Form method="post">
      <label>
        Title <input name="title" />
      </label>
      <button disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      {actionData?.error && <p role="alert">{actionData.error}</p>}
    </Form>
  )
}
```

Register it: `{ path: 'notes/new', action: newNoteAction, Component: NewNote }`. Here `createNote` is any function that saves a note and returns it with an `id`.

**What happens, step by step:**
1. The user submits. `Form` stops the browser's full-page submit, packs the fields into `FormData` and hands it to the router.
2. `navigation.state` becomes `'submitting'`. The button shows "Saving...".
3. The router calls the route's `action` with a standard `Request`. `await request.formData()` reads the fields.
4. Empty title: the action returns an object. `useActionData()` gives it to the component and the error shows. The user stays on the form.
5. Valid title: the action saves and returns `redirect('/notes/1')`. The router navigates there (state `'loading'` while that route's loaders run).
6. After an action that did not fail, the router **re-runs all loaders on the page**. A list on the screen refreshes without any code from you.

We ran this: the empty submit showed "Title is required.", and the valid one showed "Saving..." and then landed on `/notes/1`.

Good to know:
- **Post, redirect, get**: redirecting after a successful POST means a refresh does not submit the form again.
- A `<Form>` without `method` is a **GET**. It does not call an action. It just navigates to the same route with `?name=value`, which re-runs the loader. That is a search box. We ran one: typing `ap` and pressing Search moved the URL to `/search?q=ap` and the loader filtered the list.
- To say "this failed", return `data({ errors }, { status: 400 })`. Only 2xx results trigger re-running the loaders, so a 400 skips it. We saw the loader count stay at 1 after a 400.

**Common mistake:** a plain `<form>` instead of `Form`.

```jsx
// Wrong: the browser posts to the server and reloads the page
<form method="post">...</form>
```

```jsx
// Right: React Router handles it on the client
<Form method="post">...</Form>
```

Why: `Form` is what connects the submit to your `action`, the pending state and the automatic refresh.

## 16. useFetcher: change data without navigating

`Form` plus `redirect` is for changes where the URL should change (create a note, then show it). Many actions should **not** change the URL: a Like button, a checkbox, rename in place, deleting one row. For those, use `useFetcher`. A fetcher can submit to an action (or call a loader) and has its own state, but it adds **no history entry** and does not change the current page.

```jsx
import { useFetcher, useLoaderData } from 'react-router'

// route: { path: 'posts/:id', loader, action: postAction, Component: Post }
export async function postAction({ params }) {
  await likePost(params.id) // your API call
  return { ok: true }
}

export function Post() {
  const { post } = useLoaderData()
  const fetcher = useFetcher()
  const likes = fetcher.formData ? post.likes + 1 : post.likes // optimistic

  return (
    <>
      <h1>{post.title}</h1>
      <fetcher.Form method="post">
        <button>{likes} likes</button>
      </fetcher.Form>
    </>
  )
}
```

**What happens, step by step:**
1. `useFetcher()` returns an object with `Form`, `submit`, `load`, `state`, `data` and `formData`. Each call gives you an independent fetcher.
2. The user clicks Like. The fetcher's state goes `idle`, `submitting`, `idle`. The URL stays the same (we checked: still `/posts/1`).
3. While the request is in flight, `fetcher.formData` exists. We use it to show the **optimistic** count (`post.likes + 1`) at once. We saw the button change from "3 likes" to "4 likes" immediately.
4. When the action finishes, the router re-runs the loaders. `post.likes` is now 4 from the server, `fetcher.formData` is gone, and the number stays 4: no flicker.
5. The action's return value is in `fetcher.data`.

Use `fetcher.load('/some/route')` to fetch data for a popover or a search box without navigating. A rule of thumb from the docs: if the user should arrive somewhere new, use `Form` and `redirect`. If they should stay where they are, use a fetcher. (React 19 also has `useOptimistic`, see [React 19 and newer](../04-advanced/04-react-19-and-newer.md). This version needs no extra hook.)

**Common mistake:** using `Form` or `useNavigate` for an in-place action.

```jsx
// Wrong: a Like click starts a navigation: global pending state, a history entry
<Form method="post"><button>Like</button></Form>
```

```jsx
// Right: stays on the page, with its own pending state
<fetcher.Form method="post"><button>Like</button></fetcher.Form>
```

Why: a `Form` submission is a navigation. A fetcher submission is not.

## 17. Errors: ErrorBoundary and errorElement

When a loader, an action or a component throws, React Router catches it and renders the nearest **error boundary** instead of a blank screen. You add one with the `ErrorBoundary` property (or the older `errorElement: <X />`). Inside it, `useRouteError()` returns what was thrown.

```jsx
import { Link, isRouteErrorResponse, useRouteError } from 'react-router'

function ProductError() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <>
        <h1>Product not found</h1>
        <Link to="/products">See all products</Link>
      </>
    )
  }
  return <h1>Something went wrong</h1>
}

// on the route:
// { path: ':id', loader, Component: ProductDetail, ErrorBoundary: ProductError }
```

**What happens, step by step:**
1. The loader runs `throw data('Product not found', { status: 404 })`.
2. The router looks for the **closest** route (this one, then its parents) with an `ErrorBoundary`.
3. `isRouteErrorResponse(error)` is true for thrown `data(...)` or `Response` values. Then `error.status` is 404 and `error.data` is the text.
4. Any other thrown value (a `TypeError` from your own bug) is a normal `Error`, so the boundary shows the generic message.

Use boundaries for **surprises and 404s**. Use `useActionData` for form validation messages.

**Where you put the boundary matters.** The error replaces the UI of the route that owns the boundary, including its layout. We ran two cases. A root route with a layout and an `ErrorBoundary`, and a child that throws: only the boundary text was on the screen, and the layout was gone. Add an `ErrorBoundary` to the child, and the layout stayed. To protect the whole app and keep the layout, add a **pathless** route around your pages:

```jsx
{
  path: '/',
  Component: Layout,
  children: [
    {
      ErrorBoundary: PageError, // no path, no Component: it only adds a boundary
      children: [
        { index: true, Component: Home },
        { path: 'products/:id', Component: ProductDetail },
      ],
    },
  ],
}
```

This also differs from the React error boundary in [Error boundaries, portals and friends](05-error-boundaries-portals-and-friends.md): route boundaries catch loader and action errors, and they reset when the user navigates.

**Common mistake:** no boundary at all.

```jsx
// Wrong: users see the developer screen "Unexpected Application Error!"
createBrowserRouter([{ path: '/', Component: Layout, loader }])
```

```jsx
// Right: at least one friendly boundary, placed so the layout survives
createBrowserRouter([
  { path: '/', Component: Layout, loader, children: [{ ErrorBoundary: PageError, children: pages }] },
])
```

Why: the default screen is for developers and exposes the error message.

## 18. Protected routes the data-router way

In a data router you can guard a route **before anything renders**, with a loader that throws a `redirect`. There is no flash of protected content.

```jsx
import { redirect } from 'react-router'

function requireUser({ request }) {
  const user = auth.getUser() // your session check
  if (!user) {
    const url = new URL(request.url)
    throw redirect(`/login?from=${encodeURIComponent(url.pathname + url.search)}`)
  }
  return { user }
}

// { path: 'dashboard', loader: requireUser, Component: Dashboard, children: [...] }
```

**What happens, step by step:**
1. The user visits `/dashboard?tab=2`. The `dashboard` loader runs `requireUser`.
2. No user, so it throws a redirect to `/login?from=%2Fdashboard%3Ftab%3D2`. The dashboard never renders.
3. The login route's action logs the user in and returns `redirect(from)`.
4. The router lands on `/dashboard?tab=2` and the loader now passes.

We ran this full loop: the redirect URL was `/login?from=%2Fdashboard%3Ftab%3D2`, and after login the URL was `/dashboard?tab=2`.

**A trap: loaders run in parallel.** If `dashboard` has child routes with their own loaders, a redirect in the parent loader does **not** stop the child loaders from starting. We counted: the child loader ran once even though the parent redirected. If a child loader fetches private data, that is a problem. Use **route middleware**, which runs before the loaders of the routes below it:

```jsx
{
  path: 'dashboard',
  middleware: [
    () => {
      if (!auth.getUser()) throw redirect('/login')
    },
  ],
  Component: Dashboard,
  children: [{ index: true, loader: loadPrivateStats, Component: Overview }],
}
```

We ran this version and the child loader ran **zero** times. A middleware function receives `({ request, context }, next)`. If you do not call `next()`, React Router calls it for you. (Middleware is built into v8 for data and framework modes.)

**Never trust the `from` value.** The login action should only follow paths that stay inside your app:

```js
const target = from.startsWith('/') && !from.startsWith('//') ? from : '/dashboard'
return redirect(target)
```

A value like `//evil.example.com` would otherwise send users to another site (an **open redirect**). We ran that input: the user landed on `/dashboard`. More on this in [Security and i18n](../04-advanced/10-security-and-i18n.md).

**And the big rule:** a route guard is user-experience, not security. The data must also be protected on the **server**: check the session on every API request and every action. Anything in the browser can be bypassed.

**Common mistake:** relying on a parent loader to protect child loaders.

```jsx
// Wrong: the child loader still starts
{ path: 'admin', loader: requireUser, children: [{ index: true, loader: loadSecrets }] }
```

```jsx
// Right: middleware first (and the server checks the session too)
{ path: 'admin', middleware: [requireUserMiddleware], children: [{ index: true, loader: loadSecrets }] }
```

Why: loaders for all matched routes start together; middleware runs before them.

## 19. Lazy-loaded routes and code splitting

By default your bundler puts all routes in one JavaScript file. A user who only visits the home page still downloads the code of the admin area. **Code splitting** cuts the bundle into chunks, and **route-based** splitting loads a page's chunk only when someone visits that page. The tool is a dynamic `import()`, which returns a promise, and your bundler (Vite) turns it into a separate file.

**In a data router, use the route's `lazy` property.** It must return the route properties you want, such as `Component` and `loader`.

```jsx
{
  path: 'reports',
  lazy: async () => {
    const { default: Reports } = await import('./Reports.jsx')
    return { Component: Reports }
  },
}
```

If the lazy module itself exports named `Component` and `loader`, the short form works:

```jsx
// reports.jsx exports: export function Component() {...} and export async function loader() {...}
{ path: 'reports', lazy: () => import('./reports.jsx') }
```

Since v7.5 you can also lazy-load each property on its own, with `lazy: { Component: ..., loader: ... }`.

**In declarative mode, use `React.lazy` and `Suspense`.**

```jsx
import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'

const Reports = lazy(() => import('./Reports.jsx'))

export default function App() {
  return (
    <Suspense fallback={<p>Loading page...</p>}>
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Suspense>
  )
}
```

**What happens, step by step:**
1. At startup only the main bundle is downloaded. The `Reports` code is not.
2. The user navigates to `/reports`. The router (or `lazy`) starts the `import()`. The browser downloads the chunk.
3. We checked the timing: a counter in the lazy module's top level showed `0` before the visit and `1` after. The module is evaluated only when needed.
4. When the chunk arrives, the page renders. Run `npm run build` and look at the output: you will see a separate JS file for each lazy page.

About the loading screen: in our test, when we clicked a link to a lazy page, the old page stayed on screen until the new code arrived and the `Suspense` fallback did not appear. React Router wraps its updates in a React transition, which keeps the old UI (see [Concurrent React and Suspense](../04-advanced/03-concurrent-react-and-suspense.md)). The fallback shows when there is nothing old to keep, such as a direct visit to `/reports`. In framework mode, route splitting is automatic. For bundle analysis see [Performance optimization](../04-advanced/02-performance-optimization.md).

**Common mistake:** a `lazy` function that returns a module with only a default export.

```jsx
// Wrong: React Router looks for Component/loader, finds neither: blank page
{ path: 'reports', lazy: () => import('./Reports.jsx') } // Reports.jsx has only "export default"
```

```jsx
// Right: return the route properties
{
  path: 'reports',
  lazy: async () => ({ Component: (await import('./Reports.jsx')).default }),
}
```

Why: `lazy` expects route properties. We ran the wrong version and the page was empty.

## 20. Scroll restoration, leaving a form, and page titles

Three details that make a router feel finished.

**Scroll restoration.** After a normal browser navigation the page starts at the top, and Back returns you to where you were. A single-page app must copy that behaviour. In a data router, render `<ScrollRestoration />` once in your root layout. It saves each location's scroll position (in `sessionStorage`) and restores it on Back and Forward. It is not available in declarative mode, where you scroll yourself.

```jsx
import { Outlet, ScrollRestoration } from 'react-router'

function Layout() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
```

```jsx
// declarative mode: scroll to the top on every page change
import { useEffect } from 'react'
import { useLocation } from 'react-router'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
```

**Leaving a form with unsaved changes.** `useBlocker` (data routers) can stop a navigation until the user decides.

```jsx
import { useState } from 'react'
import { useBlocker } from 'react-router'

function EditPage() {
  const [dirty, setDirty] = useState(true)
  const blocker = useBlocker(dirty) // true means "block navigation"

  return (
    <div>
      <button onClick={() => setDirty(false)}>Mark as saved</button>
      {blocker.state === 'blocked' && (
        <div role="alertdialog">
          <p>Leave without saving?</p>
          <button onClick={() => blocker.proceed()}>Leave</button>
          <button onClick={() => blocker.reset()}>Stay</button>
        </div>
      )}
    </div>
  )
}
```

We ran it: clicking a link set `blocker.state` to `blocked` and the URL did not change. "Stay" reset it to `unblocked`. "Leave" completed the navigation. (The docs also list a `usePrompt` helper, but the package exports it only as `unstable_usePrompt` in 8.5.1, so prefer `useBlocker`.)

**Route-level metadata (page title, description).** React 19 moves a `<title>`, `<meta>` or `<link>` that you render anywhere into the document `<head>`. So each route component can set its own metadata. The React Router docs now recommend this over the older `meta` export.

```jsx
import { useLoaderData } from 'react-router'

function ProductDetail() {
  const { product } = useLoaderData()
  return (
    <>
      <title>{`${product.name} | My Shop`}</title>
      <meta name="description" content={`Buy ${product.name}`} />
      <h1>{product.name}</h1>
    </>
  )
}
```

We ran it: `document.title` became "Mouse | My Shop" and the description meta tag appeared in `<head>`. Use a template string for the title. When we gave `<title>` several children (`Plain {'x'} | My Shop`), the title came out empty. A pure client-side app only sets these after JavaScript runs, so a crawler that does not run JavaScript sees only `index.html`. Server rendering (framework mode, Next.js) fixes that. See [React 19 and newer](../04-advanced/04-react-19-and-newer.md).

For breadcrumbs, give routes a `handle` and read all matches with `useMatches()`:

```jsx
// route: { path: 'products/:id', loader, handle: { crumb: (match) => match.loaderData.name }, Component }
import { useMatches } from 'react-router'

function Breadcrumbs() {
  const matches = useMatches()
  return (
    <p>
      {matches
        .filter((match) => match.handle?.crumb)
        .map((match) => match.handle.crumb(match))
        .join(' / ')}
    </p>
  )
}
```

In v8 each match has `id`, `pathname`, `params`, `loaderData` and `handle`. (Older code reads `match.data`.) With a root crumb returning "Home" and a product crumb, we got `Home / Item 5`.

## 21. Browser, hash and memory routers, and testing

The router needs somewhere to keep the current location. Three choices:

| Router | Where the location lives | Use it for |
|---|---|---|
| Browser (`BrowserRouter`, `createBrowserRouter`) | The real URL path, with the History API | Normal apps. Needs the server fallback from section 1 |
| Hash (`HashRouter`, `createHashRouter`) | After a `#`: `/index.html#/about` | Static hosting where you cannot add a rewrite rule, or opening files directly |
| Memory (`MemoryRouter`, `createMemoryRouter`) | In memory, no URL at all | Tests, Storybook, embedded widgets |

The browser **never sends the part after `#` to the server**, so a hash router needs no server fallback. We checked: a link had the href `#/about`, and after the click `window.location.pathname` was still `/index.html` and `hash` was `#/about`. The costs: uglier URLs, and the hash can no longer be used for in-page anchors.

**Testing routes.** Use the memory router, so the test does not touch the real address bar. Export your `routes` array from its own file (as in the full example), and build a **fresh** router in each test.

```jsx
import { render, screen } from '@testing-library/react'
import { test } from 'vitest'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from './routes.jsx'

test('shows the product page', async () => {
  const router = createMemoryRouter(routes, { initialEntries: ['/products/2'] })
  render(<RouterProvider router={router} />)

  // findBy... waits for the loader, and throws if the heading never appears
  await screen.findByRole('heading', { name: 'Wireless mouse' })
})
```

Notes:
- Use `findBy...` or `waitFor`. Navigation and loaders are asynchronous.
- For declarative apps, wrap the component in `<MemoryRouter initialEntries={['/about']}>`.
- To unit test **one component** that uses `Link` or `useLoaderData`, use `createRoutesStub` with fake loaders:

```jsx
import { createRoutesStub } from 'react-router'

const Stub = createRoutesStub([
  { path: '/', Component: Greeting, loader: () => ({ name: 'Grace' }) },
])
render(<Stub initialEntries={['/']} />)
```

More about testing is in [Testing React](../04-advanced/08-testing-react.md).

## 22. Library mode vs framework mode, and other routers

**Framework mode** wraps data mode in a Vite plugin and adds features you would otherwise build yourself.

```bash
npx create-react-router@latest my-app
```

What it adds:
- **A route config file** (`app/routes.ts`) with helpers `route`, `index`, `layout` and `prefix`. Each route points to a **route module** file. A file-based convention is available with the `@react-router/fs-routes` package.
- **Generated types.** React Router writes `./+types/<route>` files so `params`, `loaderData` and `actionData` are typed for each route.
- **Rendering choices** in `react-router.config.ts`: `ssr: true` (server rendering), `ssr: false` (single-page app), and `prerender` (build static HTML for a list of URLs).
- **Automatic code splitting** per route, so you never write `lazy` by hand.
- Loaders and actions that run **on the server** by default. `clientLoader` and `clientAction` run in the browser.

It needs Vite 7 or newer. Here is the shape of the files (a sketch to read, not a full project):

```ts
// app/routes.ts
import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes'

export default [
  index('./home.tsx'),
  route('about', './about.tsx'),
  layout('./auth/layout.tsx', [route('login', './auth/login.tsx')]),
  ...prefix('products', [
    index('./products/list.tsx'),
    route(':id', './products/detail.tsx'),
  ]),
] satisfies RouteConfig
```

```tsx
// app/products/detail.tsx
import type { Route } from './+types/detail'

export async function loader({ params }: Route.LoaderArgs) {
  return { product: await getProduct(params.id) }
}

export default function ProductDetail({ loaderData }: Route.ComponentProps) {
  return <h1>{loaderData.product.name}</h1>
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <h1>Something went wrong: {String(error)}</h1>
}
```

Notice that the component receives `loaderData` as a **prop** and the error boundary receives `error` as a prop. In data mode you use the hooks `useLoaderData` and `useRouteError` instead. React Server Components support in React Router is still marked `unstable_` in v8.

The React Router docs give this advice. Choose **framework mode** if you are unsure, want server rendering, are comparing it with Next.js, or are migrating from Next. Choose **data mode** if you want loaders and actions but control your own bundler and server. Choose **declarative mode** for the simplest router (for example when moving off Create React App).

**Other names you will hear:**
- **Remix.** Remix v1 and v2 were frameworks built on React Router. Their ideas were merged back into React Router, and framework mode is the continuation. Remix v2 no longer gets security updates. "Remix 3" is a separate, newer framework that is not React-based by default. If an old tutorial says "Remix", it means the v2 style.
- **TanStack Router.** A router with full TypeScript inference: links, params and even search params are type-checked. Search params are treated as typed state. It supports file-based or code-based routes and has loaders with a built-in cache. **TanStack Start** is the full-stack framework built on it (it announced a stable 1.0 on 13 October 2026).
- **Next.js.** Routing follows the **folder structure**: `app/products/[id]/page.tsx` is `/products/:id`, `layout.tsx` is a layout route, `loading.tsx` and `error.tsx` are pending and error UI, `not-found.tsx` is the 404 page. Components are server components by default, and you use `Link` from `next/link` and `useRouter` from `next/navigation`. See [Next.js essentials](../04-advanced/06-nextjs-essentials.md) and [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md).

A good interview sentence: "React Router is a router first. Next.js is a full framework where the router is built in and tied to server rendering and caching. TanStack Router puts type safety first."

## 23. Full example: a small shop with five pages

Let us put it together. The app has a **layout**, **nested routes**, a **param**, **loaders**, an **action**, a **protected route** and a **404**. The pages are: Home, Products, one Product, Login and Dashboard (with Overview and Settings inside). Create a Vite React app (section 3), run `npm install react-router`, and add these files.

```js
// src/data.js
const PRODUCTS = [
  { id: '1', name: 'Mechanical keyboard', price: 89 },
  { id: '2', name: 'Wireless mouse', price: 39 },
  { id: '3', name: 'USB-C hub', price: 49 },
]

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Pretend these are network calls. In a real app you would use fetch().
export async function getProducts() {
  await wait(150)
  return PRODUCTS
}

export async function getProduct(id) {
  await wait(150)
  return PRODUCTS.find((product) => product.id === id) ?? null
}

// A fake session. A real app asks the server (cookie or token) who the user is.
let currentUser = null

export const auth = {
  getUser: () => currentUser,
  login: (name) => {
    currentUser = { name }
  },
  logout: () => {
    currentUser = null
  },
}
```

```jsx
// src/pages.jsx
import {
  Form,
  Link,
  NavLink,
  Outlet,
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useNavigation,
  useOutletContext,
  useRouteError,
  useSearchParams,
} from 'react-router'

export function Layout() {
  const { user } = useLoaderData()
  const navigation = useNavigation()

  return (
    <div>
      <header>
        <nav aria-label="Main">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
        </nav>
        {user ? (
          <Form method="post" action="/logout">
            <span>Hi, {user.name}</span> <button>Log out</button>
          </Form>
        ) : (
          <Link to="/login">Log in</Link>
        )}
        {navigation.state === 'loading' && <p role="status">Loading...</p>}
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export function Home() {
  return (
    <>
      <h1>Welcome</h1>
      <p>A tiny shop built with React Router.</p>
    </>
  )
}

export function ProductList() {
  const { products } = useLoaderData()

  return (
    <>
      <h1>Products</h1>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <Link to={product.id}>{product.name}</Link> (${product.price})
          </li>
        ))}
      </ul>
    </>
  )
}

export function ProductDetail() {
  const { product } = useLoaderData()

  return (
    <>
      <h1>{product.name}</h1>
      <p>Price: ${product.price}</p>
      <Link to="..">Back to products</Link>
    </>
  )
}

export function ProductError() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <>
        <h1>Product not found</h1>
        <Link to="/products">See all products</Link>
      </>
    )
  }
  return <h1>Something went wrong</h1>
}

export function Login() {
  const [searchParams] = useSearchParams()
  const actionData = useActionData()
  const from = searchParams.get('from') ?? '/dashboard'

  return (
    <>
      <h1>Log in</h1>
      <Form method="post">
        <input type="hidden" name="from" value={from} />
        <label>
          Name <input name="name" />
        </label>
        <button>Log in</button>
      </Form>
      {actionData?.error && <p role="alert">{actionData.error}</p>}
    </>
  )
}

export function Dashboard() {
  const { user } = useLoaderData()

  return (
    <>
      <h1>Dashboard</h1>
      <nav aria-label="Dashboard">
        <NavLink to="." end>Overview</NavLink>
        <NavLink to="settings">Settings</NavLink>
      </nav>
      <Outlet context={user} />
    </>
  )
}

export function DashboardHome() {
  const user = useOutletContext()
  return <p>Welcome back, {user.name}.</p>
}

export function Settings() {
  return <p>Settings go here.</p>
}

export function NotFound() {
  return (
    <>
      <h1>404</h1>
      <p>That page does not exist.</p>
      <Link to="/">Go home</Link>
    </>
  )
}
```

```jsx
// src/routes.jsx
import { data, redirect } from 'react-router'
import { auth, getProduct, getProducts } from './data.js'
import {
  Dashboard,
  DashboardHome,
  Home,
  Layout,
  Login,
  NotFound,
  ProductDetail,
  ProductError,
  ProductList,
  Settings,
} from './pages.jsx'

// Runs before the Dashboard renders. No user? Go to /login and remember where we were.
function requireUser({ request }) {
  const user = auth.getUser()
  if (!user) {
    const url = new URL(request.url)
    throw redirect(`/login?from=${encodeURIComponent(url.pathname + url.search)}`)
  }
  return { user }
}

async function loginAction({ request }) {
  const form = await request.formData()
  const name = String(form.get('name') ?? '').trim()
  if (!name) return { error: 'Please type your name.' }

  auth.login(name)

  // Only follow paths inside this app. A full URL here would be an open redirect.
  const from = String(form.get('from') ?? '')
  return redirect(from.startsWith('/') && !from.startsWith('//') ? from : '/dashboard')
}

function logoutAction() {
  auth.logout()
  return redirect('/')
}

export const routes = [
  {
    path: '/',
    Component: Layout,
    HydrateFallback: () => <p>Loading app...</p>,
    loader: () => ({ user: auth.getUser() }),
    children: [
      { index: true, Component: Home },
      {
        path: 'products',
        children: [
          {
            index: true,
            loader: async () => ({ products: await getProducts() }),
            Component: ProductList,
          },
          {
            path: ':id',
            loader: async ({ params }) => {
              const product = await getProduct(params.id)
              if (!product) throw data('Product not found', { status: 404 })
              return { product }
            },
            Component: ProductDetail,
            ErrorBoundary: ProductError,
          },
        ],
      },
      { path: 'login', Component: Login, action: loginAction },
      { path: 'logout', loader: () => redirect('/'), action: logoutAction },
      {
        path: 'dashboard',
        loader: requireUser,
        Component: Dashboard,
        children: [
          { index: true, Component: DashboardHome },
          { path: 'settings', Component: Settings },
        ],
      },
      { path: '*', Component: NotFound },
    ],
  },
]
```

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from './routes.jsx'

const router = createBrowserRouter(routes)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

Add `a.active { font-weight: bold; }` to `src/index.css` if you want to see the active link.

**What happens, step by step:**
1. `main.jsx` creates the router once from the `routes` array. `routes` lives in its own file so tests can reuse it (section 21).
2. The root route is the **layout**. Its loader returns the current user, so the header can show "Hi, Ada" or a login link. The pages render inside its `Outlet`.
3. `products` is a **prefix route** (path, no component). The list is its **index** child. `:id` is the detail page. The list links with `to={product.id}` and the detail goes back with `to=".."`: both are relative.
4. The `:id` loader throws `data(..., { status: 404 })` for an unknown product. Its own `ErrorBoundary` shows "Product not found" and the header stays.
5. `dashboard` is **protected** by the `requireUser` loader. Its two children (`index` and `settings`) are the **nested routes**. The parent passes the user down with `<Outlet context={user} />`.
6. The login action checks the name, logs in, and redirects to `from` (only if it is a path inside the app).
7. After the login action, the router re-runs all loaders. The root loader runs again, so the header changes to "Hi, Ada" without any extra code. Logout works the same way through `/logout`.
8. `*` catches unknown URLs. `HydrateFallback` covers the first load.

We ran the whole flow in a test and these things were true:
- At `/` only the Home link had the class `active`.
- Clicking Products showed "Loading..." while the 150 ms loader ran, then the list. The hrefs were `/products/1`, `/products/2`, `/products/3`.
- On a product page, "Back to products" had the href `/products` and led there.
- `/products/99` showed "Product not found" and the main nav was still there. `/whatever/else` showed the 404 page inside the layout.
- Logged out, opening `/dashboard/settings` landed on `/login?from=%2Fdashboard%2Fsettings`. Submitting an empty name showed "Please type your name." After typing a name, the URL was `/dashboard/settings` and the header said "Hi, Ada".
- On the dashboard nav, `Settings` was active at `/dashboard/settings` and `Overview` was active at `/dashboard`, never both.
- After "Log out" the URL was `/` and the login link was back. Clicking Dashboard again went to the login page.
- A login URL with `from=//evil.example.com` ended on `/dashboard`.

**Common mistake:** trusting the layout loader's user for security.

```jsx
// Wrong: the header knows the user, so the API must be fine (it is not)
loader: () => ({ user: auth.getUser() })
```

```jsx
// Right: the same idea in the UI, plus a server that checks the session on every call
fetch('/api/orders', { credentials: 'include' }) // the server answers 401 without a valid session
```

Why: the example's session is fake and lives in the browser. A real server must decide who may see what.

## 24. Old code you may meet

> **Old code you may meet (legacy, do not write this today).** React Router 5 and early 6 code is still all over old tutorials, Stack Overflow answers and legacy codebases. Recognise it so you can read it and migrate it. None of it belongs in a React Router 8 project.
>
> ```jsx
> // React Router 5 style (legacy)
> import { Switch, Route, Redirect, useHistory } from 'react-router-dom'
>
> function App() {
>   const history = useHistory()
>   return (
>     <Switch>
>       <Route exact path="/" component={Home} />
>       <Route path="/old" render={() => <Redirect to="/new" />} />
>       <Route path="/new">
>         <button onClick={() => history.push('/next')}>Next</button>
>       </Route>
>     </Switch>
>   )
> }
> ```
>
> How to translate it today:
>
> | Old | Today |
> |---|---|
> | `import ... from 'react-router-dom'` | `import ... from 'react-router'` (and `react-router/dom` for `RouterProvider`) |
> | `<Switch>` | `<Routes>` (or route objects) |
> | `component={Home}` or `render={...}` | `element={<Home />}`, or `Component: Home` in a route object |
> | `exact` | Not needed. Matching ranks routes, so the most specific wins |
> | `<Redirect to="/new" />` | `<Navigate to="/new" replace />`, or `redirect('/new')` in a loader or action |
> | `useHistory().push('/x')` | `useNavigate()` then `navigate('/x')` |
> | `useRouteMatch` | `useMatch` |
> | `withRouter` | the hooks (`useParams`, `useLocation`, `useNavigate`) |
> | `json()` and `defer()` in loaders (used in v6) | return plain objects, `data(...)` and raw promises (`json` and `defer` were removed in v7) |

## How interviewers test this
- **Do you know what a router really does?** A strong answer to "how does client-side routing work" names the History API (`pushState`, `popstate`), says the page does not reload, and mentions the server fallback for deep links. Naming only `<Route>` and `<Link>` is a weak answer.
- **Hook vocabulary:** `useParams` vs `useSearchParams`, `useNavigate` vs `<Navigate>` vs `redirect`, `Link` vs `NavLink` vs `<a>`. They often ask for a small example of each.
- **Protected routes** are a favourite machine-coding prompt ("login flow with a protected dashboard"). A strong answer redirects with `replace`, remembers the original location, returns the user there, and says plainly that the real check lives on the server.
- **Currency of knowledge:** React Router 8, imports from `react-router` and no `react-router-dom`, data routers and loaders instead of fetching in effects. Red flags: `Switch`, `useHistory`, `component=`, `exact`.
- **Trade-offs:** library mode vs framework mode, lazy routes and bundle size, loaders vs TanStack Query, React Router vs Next.js file routing.
- **Red flags in code:** `<a href>` for internal links, `navigate()` during render, `id + 1` on a param, creating the router inside a component, no error boundary and no catch-all route.

## Interview questions and model answers

### Q1. How does client-side routing work? (Easy)
The browser's History API lets JavaScript change the URL without a request: `history.pushState` adds an entry and changes the address bar, and the `popstate` event tells you when the user presses Back or Forward. A router library catches link clicks, calls `pushState`, keeps the current location in React state or context, matches it against a route table and renders the matching components. The page never reloads, so state survives and navigation is fast. The catch is that the first load and a refresh still go to the server, so the server must return `index.html` for unknown paths.

### Q2. What is the difference between `<Link>` and `<a>`? (Easy)
`Link` renders an `<a href>` but, on a normal left click, prevents the browser's full page load and calls the router's navigate function, so React state survives and only the matching routes re-render. A plain `<a href>` makes the browser request the page from the server and reload everything. `Link` keeps the benefits of a real anchor: right click, open in a new tab, keyboard focus. Use `<a>` for external sites. `NavLink` is a `Link` that adds an `active` class, `aria-current="page"` and an `isPending` flag, for navigation menus.

### Q3. How do you read URL params and query (search) params? (Easy)
Dynamic segments such as `/users/:id` are read with `useParams()`, which returns `{ id: '42' }`. The query string (`?q=react&page=2`) is read with `useSearchParams()`, which returns a `URLSearchParams` and a setter: `searchParams.get('q')`. In a loader you get `params` as an argument and read search params from `new URL(request.url).searchParams`. Everything is a string (or `null` when missing), so convert numbers yourself. Use params to identify the resource and search params for optional filters, sorting and paging. Remember that `setSearchParams({ page: '2' })` replaces the whole query string.

### Q4. Explain nested routes, `Outlet`, index routes and layout routes. (Easy)
Routes can be nested so a parent draws shared UI (header, sidebar, tabs) and a child draws the changing part. The parent places `<Outlet />` where the child should appear. A child path is relative to its parent. An index route (`index`, no path) is the default child shown at the parent's own URL. A layout route has an element but no path, so it wraps children without adding a URL segment. A route with a path but no element is a prefix route. The shared parent stays mounted while the child changes.

### Q5. `useNavigate` vs `<Navigate>` vs `redirect`: when do you use each? (Medium)
`useNavigate()` returns a function you call in event handlers, effects or after an `await`, for example after saving. `<Navigate to="/login" replace />` is a component that navigates when it renders, good for conditional redirects in JSX. `redirect()` returns a response and is used inside loaders, actions and middleware of a data router, so the navigation happens before anything renders. Never call `navigate()` while rendering. For things the user clicks, prefer a real `<Link>` for accessibility and "open in a new tab". Pass `replace: true` for redirects so Back does not return to the redirecting page.

### Q6. How do you implement protected routes? (Medium)
Declarative version: a layout route component that reads the auth state. If there is no user it returns `<Navigate to="/login" replace state={{ from: location }} />`, otherwise `<Outlet />`. The login page reads `location.state.from` and navigates back there with `replace`. Data-router version: a `loader` (or `middleware`) on the route throws `redirect('/login?from=...')`, so protected UI never renders. Middleware runs before child loaders, while a parent loader does not stop child loaders from starting. Always add that this is only user experience: the server must check the session on every request, and the `from` value must be validated to avoid an open redirect.

### Q7. What are loaders and actions, and why use them instead of `useEffect`? (Medium)
A loader is a function on a route that runs before the route renders and provides data through `useLoaderData()`. An action handles a `<Form>` submission (a write) and, when it succeeds, the router re-runs the page's loaders so the UI stays fresh. Compared with fetching in an effect, there is no empty first render, no hand-written loading state inside the page, loaders of all matched routes run in parallel (no waterfall), stale navigations are cancelled through `request.signal`, and errors go to route error boundaries. The costs: navigation waits for data (so you show pending UI with `useNavigation`), loaders do not cache by themselves, and loaders need a data router (not `BrowserRouter`).

### Q8. How do you lazy-load routes? (Medium)
Route-based code splitting loads a page's code only when the user visits it. In a data router use `lazy: async () => ({ Component: (await import('./Reports.jsx')).default })`, or a module that exports `Component` and `loader`. In declarative mode use `React.lazy(() => import('./Reports.jsx'))` with a `<Suspense fallback>` around the `Routes`. The bundler turns each dynamic `import()` into its own chunk. In framework mode, route splitting is automatic. A common mistake is returning a module that only has a default export from `lazy`, which renders nothing.

### Q9. What is the difference between `BrowserRouter`, `HashRouter` and `MemoryRouter`? (Medium)
`BrowserRouter` uses the History API and real paths (`/about`), which gives clean URLs but needs the server to fall back to `index.html`. `HashRouter` stores the location after a `#` (`/#/about`). The browser never sends the hash to the server, so it works on any static host without rewrite rules, at the cost of uglier URLs. `MemoryRouter` keeps the location in memory, with no URL, which is what you want for tests, Storybook and embedded widgets. Each has a data-router twin: `createBrowserRouter`, `createHashRouter`, `createMemoryRouter`.

### Q10. Why does refreshing a deep link give a 404 in production, and how do you fix it? (Medium)
On refresh the browser asks the server for `/products/2`. A static host looks for a file at that path, finds none and returns 404, because the route exists only inside your JavaScript. The fix is a history fallback: configure the server or host to answer any path that is not a real file with `index.html` (for example `try_files $uri /index.html;` in nginx, or `/*  /index.html  200` in a Netlify `_redirects` file). The dev server already does this, so the bug appears only after deploying. A hash router avoids the need.

### Q11. How do you show a loading state during navigation and form submission? (Medium)
Call `useNavigation()`. `navigation.state` is `idle`, `loading` or `submitting`. A link click to a route with a loader goes `idle`, `loading`, `idle`. A form post goes `idle`, `submitting`, `loading`, `idle`. Use it for a top-bar spinner or to dim the old page, and use `navigation.formData` to show the submitted values. `NavLink` also passes `isPending` for per-link indicators. For fetchers there is `fetcher.state`. On the very first visit there is no old page, so give the root route a `HydrateFallback`.

### Q12. How do you handle errors and 404s with React Router? (Medium)
Add an `ErrorBoundary` (or `errorElement`) to a route and read the thrown value with `useRouteError()`. Loaders and actions can `throw data('Not found', { status: 404 })`, and `isRouteErrorResponse(error)` tells you it was such a response. The closest boundary up the tree wins, so a boundary on the root route replaces the whole layout, while a boundary on a pathless child route keeps it. For unknown URLs add a catch-all route `{ path: '*' }` inside the layout. Without these, a data router shows its built-in developer error screen. Use `useActionData` for form validation messages, not error boundaries.

### Q13. What is `useFetcher` and when do you use it instead of `Form`? (Hard)
`useFetcher` lets you submit to an action or call a loader without navigating: no URL change, no history entry, and its own `state`, `data` and `formData`. Use `Form` plus `redirect` when the user should arrive on a new page (create a record, then show it). Use a fetcher for in-place changes such as a Like button, a checkbox, inline rename or deleting one row, and for loading data into a popover or combobox. Because `fetcher.formData` exists while the request is in flight, you can render an optimistic value instantly. After the action finishes the router re-runs the loaders, so the real data replaces the guess.

### Q14. What is the difference between library mode and framework mode, and what changed in React Router 7 and 8? (Hard)
Library mode means you use React Router inside your own app: declarative (`BrowserRouter`, `Routes`) or data (`createBrowserRouter` plus `RouterProvider`, with loaders and actions). Framework mode adds a Vite plugin, an `app/routes.ts` config, generated types, server rendering or prerendering options and automatic code splitting; its loaders run on the server by default. Version 7 (2024) merged Remix into React Router and moved the DOM exports into `react-router`. Version 8 (2026) removed the `react-router-dom` package, became ESM-only, requires Node 22.22 and React 19.2.7 or newer, and expects `RouterProvider` from `react-router/dom`. Middleware is built in. `json()` and `defer()` are gone (since 7): return objects, `data()` and raw promises.

### Q15. How does React Router compare with Next.js routing and TanStack Router? (Hard)
React Router is configured with code or a config file and works well as a plain client-side library or as a framework with loaders and actions. Next.js routing is file-system based: folders under `app/` become URLs, with special files such as `layout`, `page`, `loading`, `error` and `not-found`, and it is tied to server components, server rendering and caching. TanStack Router focuses on type safety: params and search params are fully typed, and routes can be file-based. TanStack Start is the full-stack framework on top of it. The choice depends on whether you want a library (React Router declarative or data mode), a full-stack framework (Next.js, React Router framework mode, TanStack Start) and how much type safety you need.

## Common mistakes and gotchas
- Importing from the old `react-router-dom` package in v8. Fix: install `react-router` and import from it; import `RouterProvider` from `react-router/dom`.
- Using `<a href>` for internal links, which reloads the page. Fix: `<Link to>` or `<NavLink to>`.
- Deploying without a history fallback, so refreshing `/products/2` gives a 404. Fix: send `index.html` for unknown paths, or use a hash router.
- Treating params as numbers (`id + 1` gives `"421"`). Fix: `Number(id)` and check for `NaN`.
- Calling `setSearchParams({ page: '2' })` and losing the other params. Fix: copy the previous `URLSearchParams` and change one key.
- Forgetting `<Outlet />` in a parent route, so children never show. Fix: render an `Outlet` where the child belongs.
- Expecting `..` to remove one URL segment. Fix: it goes up one route level; use `relative="path"` or an absolute path.
- Calling `navigate()` while rendering. Fix: return `<Navigate>` or call it in a handler or effect.
- Redirecting to the login page without `replace`, which traps the Back button. Fix: `replace`.
- Creating a data router inside a component. Fix: create it once at module level.
- No catch-all route and no error boundary in a data router, so users see the developer error screen. Fix: add `{ path: '*' }` and an `ErrorBoundary`.
- A root route `ErrorBoundary` that removes the whole layout on any error. Fix: a boundary on a pathless child route.
- Believing a parent loader redirect protects child loaders. Fix: use `middleware`, and check the session on the server too.
- Trusting a `from` or `redirectTo` parameter. Fix: allow only paths that start with a single `/` (avoid open redirects).
- A `lazy` function that returns a module with only a default export. Fix: return `{ Component }` (or export `Component` and `loader`).
- Using a plain `<form method="post">` in a data router. Fix: use `<Form>`.
- Using `useLoaderData`, `Form` or `useNavigation` under `BrowserRouter`. Fix: loaders, actions and fetchers need a data router (`createBrowserRouter` plus `RouterProvider`).
- Putting secrets in loaders and actions in library mode. Fix: they run in the browser; keep secrets on a server.
- Writing router tests without waiting. Fix: use `await screen.findBy...` and a fresh `createMemoryRouter` per test.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard. For the coding tasks, create a Vite React app (see [Setup your playground](../00-start-here/02-setup-your-playground.md)) and run `npm install react-router`.

1. **(Easy)** In your own words: why does clicking `<a href="/about">` reload the page while `<Link to="/about">` does not? What must the server do so that refreshing `/about` works in production?

<details>
<summary>Show answer</summary>

A plain anchor makes the browser request `/about` from the server and replace the whole page, so JavaScript state is lost. `Link` renders an anchor too, but on a normal left click it calls `preventDefault()` and asks the router to navigate. The router calls `history.pushState`, changes its location state, and React re-renders only the routes that changed. No request, no reload.

On refresh, though, the browser really does ask the server for `/about`, and the server has no such file. So the server (or host) must answer unknown paths with `index.html`. Then React Router starts, reads `/about` and shows the right page.

</details>

2. **(Easy)** Predict what is shown (this was run to check):

```jsx
function User() {
  const { id } = useParams()
  return <p>{id + 1} {Number(id) + 1} {typeof id}</p>
}

// <Route path="/users/:id" element={<User />} />, and the URL is /users/42
```

<details>
<summary>Show answer</summary>

`421 43 string`.

Route params are always strings. `id + 1` is string concatenation (`"42" + 1` is `"421"`). `Number(id) + 1` converts first, so it is `43`. `typeof id` is `"string"`.

</details>

3. **(Easy)** **Code.** Build a small app with three routes: `/` (Home), `/about` (About) and a catch-all that shows "Not found". Add a nav with `NavLink`s to Home and About. The link for the current page must be bold. Use declarative mode (`BrowserRouter` in `main.jsx`).

<details>
<summary>Show answer</summary>

```jsx
// src/App.jsx
import { NavLink, Route, Routes } from 'react-router'

const linkStyle = ({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })

export default function App() {
  return (
    <>
      <nav>
        <NavLink to="/" end style={linkStyle}>Home</NavLink>{' '}
        <NavLink to="/about" style={linkStyle}>About</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<h1>Home</h1>} />
        <Route path="/about" element={<h1>About</h1>} />
        <Route path="*" element={<h1>Not found</h1>} />
      </Routes>
    </>
  )
}
```

`main.jsx` wraps `<App />` in `<BrowserRouter>` (section 3). We ran this at `/about`: Home was `normal` and About was `bold`. The `style` prop of `NavLink` can be a function that receives `{ isActive }`.

</details>

4. **(Medium)** **Code.** Make a search page for the list `['apple', 'apricot', 'banana', 'cherry']`. An input filters the list. The text must live in the URL (`?q=...`), so a refresh keeps the filter, and typing must not fill the Back-button history. Do not use `useState` for the text.

<details>
<summary>Show answer</summary>

```jsx
import { useSearchParams } from 'react-router'

const FRUIT = ['apple', 'apricot', 'banana', 'cherry']

export default function FruitSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const shown = FRUIT.filter((name) => name.includes(q.toLowerCase()))

  return (
    <div>
      <label>
        Search{' '}
        <input
          value={q}
          onChange={(event) => {
            const value = event.target.value
            setSearchParams(value ? { q: value } : {}, { replace: true })
          }}
        />
      </label>
      <ul>
        {shown.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  )
}
```

We ran it at `/fruit?q=ap`: the input showed `ap` and the list was `apple, apricot`. After clearing the input the URL became `/fruit` and all four items showed. After typing `ban` the URL was `?q=ban` and only `banana` remained. `{ replace: true }` keeps the history clean. The URL is the single source of truth, so no state is needed.

</details>

5. **(Medium)** Predict the `href` of each link (this was run to check). The URL is `/teams/42`.

```jsx
function Team() {
  return (
    <div>
      <Link to="..">a</Link>
      <Link to=".." relative="path">b</Link>
      <Link to="edit">c</Link>
    </div>
  )
}

<Routes>
  <Route path="/" element={<Outlet />}>
    <Route path="teams/:teamId" element={<Team />} />
  </Route>
</Routes>
```

<details>
<summary>Show answer</summary>

`a` goes to `/`, `b` goes to `/teams`, and `c` goes to `/teams/42/edit`.

`..` means "one route level up". `teams/:teamId` is a single route (it spans two URL segments), so one level up is its parent, the `/` route. With `relative="path"` the rule becomes "drop one URL segment", which gives `/teams`. `edit` is added to the current route's URL.

</details>

6. **(Medium)** **Code.** In declarative mode, protect `/account` and `/billing` with one `RequireAuth` layout route. A logged-out visitor goes to `/login`. After logging in they return to the page they asked for, **including its query string** (for example `/billing?tab=invoices`). Pressing Back after the redirect must not trap them on the login page.

<details>
<summary>Show answer</summary>

The three key pieces (the auth context is the same as in section 11):

```jsx
function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

// in Login, after a successful login:
const from = location.state?.from ?? { pathname: '/' }
navigate(from, { replace: true })

// in the routes:
<Route element={<RequireAuth />}>
  <Route path="/account" element={<Account />} />
  <Route path="/billing" element={<Billing />} />
</Route>
```

Why it works: the whole `location` object (pathname, search, hash) is stored in the state, so `/billing?tab=invoices#card` comes back complete. If you used only `from.pathname` you would lose `?tab=invoices`. Both `replace` flags matter: the first stops Back from returning to a page that redirects again, and the second removes the login page from history after logging in. We ran this from `/settings?tab=billing#card` and it returned to exactly that URL.

</details>

7. **(Medium)** Predict the loader call counts. The router has a root loader (`root`) and a `products/:id` child loader (`detail`). The app starts at `/products/1`, then the user clicks a link to `/products/2`, then a link to `/products/2?x=1`. How many times has each loader run after the start, after the first click, and after the second click?

<details>
<summary>Show answer</summary>

After the start: root 1, detail 1. After the first click: root 1, detail 2. After the second click: root 2, detail 3.

A loader re-runs when its own params change, so only `detail` runs when `:id` changes from 1 to 2. The root loader's inputs did not change. A change in the **search params** re-runs every loader on the page, so the second click runs both (we counted exactly these numbers). After a successful action, all loaders re-run as well. You can customise this with `shouldRevalidate`.

</details>

8. **(Medium)** **Code.** This component fetches in an effect. Convert it to a data-router route with a loader. An unknown id (the API returns `null`) must show "Sorry, no such product." in an error boundary. Keep the component free of loading state.

```jsx
function Product() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)

  useEffect(() => {
    getProduct(id).then(setProduct)
  }, [id])

  if (!product) return <p>Loading...</p>
  return <h1>{product.name}</h1>
}
```

<details>
<summary>Show answer</summary>

```jsx
import { data, useLoaderData } from 'react-router'
import { getProduct } from './api.js'

function Product() {
  const { product } = useLoaderData()
  return <h1>{product.name}</h1>
}

export const productRoute = {
  path: '/products/:id',
  loader: async ({ params, request }) => {
    const product = await getProduct(params.id, { signal: request.signal })
    if (!product) throw data('Not found', { status: 404 })
    return { product }
  },
  Component: Product,
  ErrorBoundary: () => <p>Sorry, no such product.</p>,
}
```

Register `productRoute` in `createBrowserRouter([...])`. We ran it: `/products/1` showed the name and `/products/7` showed "Sorry, no such product.". The loading state moved out of the component: show a global pending indicator with `useNavigation`, and a `HydrateFallback` for the first load. The old effect version also had a race condition when `id` changed quickly; the loader version cancels the old request through `request.signal`.

</details>

9. **(Hard)** Predict `useNavigation().state` over time, as seen from a component in the root layout that stays mounted. Case A: the user clicks a `<Link>` to a route that has a loader. Case B: the user submits `<Form method="post">` whose action returns `redirect('/list')`, and `/list` has a loader. Also: what is `navigation.location` during case A?

<details>
<summary>Show answer</summary>

Case A: `idle`, then `loading`, then `idle`. Case B: `idle`, then `submitting` (the action runs), then `loading` (the loaders of `/list` run), then `idle`. We logged both sequences exactly like this.

During case A, `navigation.location` is the place the user is going to (for example `/products/1`), while the router still shows the old page at the old URL. The URL only changes when the loaders finish. When the state is `idle`, `navigation.location` is `undefined`.

A component that disappears during the navigation (such as the form page itself, after the redirect) cannot log the last states, so put the logging component in a layout that stays mounted.

</details>

10. **(Hard)** **Code.** A post page has a loader that returns `{ post: { title, likes } }` and an action that saves a like. Add a Like button that does **not** change the URL, shows the new count **immediately** (before the server answers), and shows the true count from the server afterwards.

<details>
<summary>Show answer</summary>

```jsx
import { useFetcher, useLoaderData } from 'react-router'

// route: { path: 'posts/:id', loader: postLoader, action: postAction, Component: Post }

export function Post() {
  const { post } = useLoaderData()
  const fetcher = useFetcher()
  const likes = fetcher.formData ? post.likes + 1 : post.likes

  return (
    <>
      <h1>{post.title}</h1>
      <fetcher.Form method="post">
        <button>{likes} likes</button>
      </fetcher.Form>
    </>
  )
}
```

We ran it with a starting count of 3. Right after the click the button said "4 likes" and the URL was still `/posts/1`. The action took 40 ms; afterwards the loader ran again (2 loader runs in total) and the button still said "4 likes", now from the server. While the request is in flight `fetcher.formData` is set, so we add one to the number. When it ends, `formData` is gone and the loader data takes over. A `Form` would have started a navigation instead, with a history entry and a global pending state.

</details>

11. **(Hard)** A layout route has `ErrorBoundary: RootError` and `Component: Layout`. A child page throws during render. The child has no boundary of its own. What does the user see? How do you change the setup so that the header from `Layout` stays visible, without adding a boundary to every page?

<details>
<summary>Show answer</summary>

The nearest boundary is the layout route's own `RootError`. It replaces the whole layout route, so the user sees only the error message, with no header (we saw exactly that).

Two fixes. Put an `ErrorBoundary` on the child route, so the child's error UI renders inside the layout's `Outlet`. For all pages at once, add a **pathless** route under the layout that carries the boundary and holds the pages:

```jsx
{
  path: '/',
  Component: Layout,
  children: [
    {
      ErrorBoundary: PageError,
      children: [ /* all pages */ ],
    },
  ],
}
```

We ran this: the error text showed and the layout was still visible. Errors thrown by the layout's own loader still go to a boundary above it, so keep `Layout` and its loader simple.

</details>

12. **(Hard)** A teammate says: "`/admin` is protected, because `loader: requireUser` redirects to the login page, so we do not need to check anything in the API." Explain what is wrong. What happens to the loaders of child routes under `admin` when the parent loader redirects? How would you fix it?

<details>
<summary>Show answer</summary>

Two problems.

1. **The browser is not a trust boundary.** A route guard only controls what the app shows. Anyone can open the dev tools, read the bundle, or call the API directly. The server must check the session (cookie or token) and the user's permissions on every request, for loaders' API calls and for actions alike. The guard is for user experience, not security.

2. **Loaders run in parallel.** When you navigate to `/admin`, the router starts the loaders of all matched routes together. Throwing a redirect in the parent does not stop the children from starting. We counted: the child loader ran once even though the parent redirected. If it fetches private data without the server checking the session, that data request still goes out.

Fix: use route `middleware`, which runs before the loaders below it and throws `redirect('/login')` when there is no user. We counted zero child loader runs with that version. And keep the server checks. Also validate any `from` value used for the return trip, to avoid an open redirect.

</details>

## Recap
- Client-side routing = History API (`pushState`, `popstate`) plus a router that matches the URL and renders. No page reload. Deep links need the server to fall back to `index.html` (or use a hash router).
- React Router 8: `npm install react-router`, import from `react-router`, and `RouterProvider` from `react-router/dom`. The `react-router-dom` package is gone. Needs Node 22.22+ and React 19.2.7+.
- Declarative mode (`BrowserRouter`, `Routes`, `Route`) gives matching, links and hooks. Data mode (`createBrowserRouter` plus `RouterProvider`, created once outside React) adds loaders, actions, `Form`, fetchers, pending state and error boundaries.
- `Link` and `NavLink` (active class, `aria-current`, `end`) for clicks; `useNavigate`, `<Navigate>` and `redirect` for code. Use `replace` for redirects.
- `useParams` gives strings for `:segments`. `useSearchParams` returns a `URLSearchParams` and a setter that replaces everything unless you copy first. Keep filters and pages in the URL.
- Nested routes render children through `<Outlet />`. Index = default child, layout = element without path, prefix = path without element, `*` = 404. `..` counts route levels.
- Protected routes: a layout that redirects with `replace` and `state.from` (declarative), or a `loader`/`middleware` that throws `redirect` (data). It is UX only. Enforce on the server. Loaders run in parallel; middleware runs first.
- Loaders read and actions write; loaders re-run when params or search params change and after successful actions. Use `useNavigation` for pending UI, `useFetcher` for no-navigation changes, `ErrorBoundary` for errors, `lazy` (or `React.lazy`) for code splitting. Framework mode adds typegen, SSR and automatic splitting.

## Where to go next
- Next lesson: [Forms with libraries](04-forms-with-libraries.md).
- Related lessons: [Data fetching](02-data-fetching.md) for caching with TanStack Query, [Error boundaries, portals and friends](05-error-boundaries-portals-and-friends.md), [State management](06-state-management.md) (URL state), Tooling: Vite, ESLint and the build (planned).
- Advanced: [Next.js essentials](../04-advanced/06-nextjs-essentials.md), [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md), [Testing React](../04-advanced/08-testing-react.md).
- Interview rounds: Round 2, state, data and routing: questions (planned) and answers (planned).
- Cheat sheet: Patterns and syntax cheatsheet (planned).
- Practice app: put the filter in the URL in [Filterable list](../practice-app/exercises/react/07-filterable-list/README.md), and keep the page number in a search param in [Pagination](../practice-app/exercises/react/13-pagination/README.md).
