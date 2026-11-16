# SSR, Hydration and Server Components

> **Level:** Advanced   **Time:** about 80 minutes   **Read first:** [How React renders](01-how-react-renders.md), [Concurrent React and Suspense](03-concurrent-react-and-suspense.md), [React 19 and newer](04-react-19-and-newer.md)

## What you will learn
- Compare CSR, SSR, SSG, ISR, streaming SSR, islands and partial prerendering, and pick one for a given page.
- Explain hydration, name the common causes of a hydration mismatch and fix each one.
- Choose between `renderToString`, `renderToPipeableStream`, `renderToReadableStream` and `prerender`.
- Explain what React Server Components are, what `"use client"` really marks, and what can cross the boundary.
- Write a Server Action that is safe, because you know it is a public endpoint.
- Summarise the 2025 and 2026 Server Components security advisories and the lesson they teach.

## 1. Where does the HTML come from?
A browser always starts with HTML. The question is who builds that HTML and when.

In a plain Vite app (client-side rendering, **CSR**) the server sends an almost empty page. The browser downloads JavaScript, React runs, and only then does the content appear.

```html
<!doctype html>
<html>
  <head><title>My shop</title></head>
  <body>
    <div id="root"></div>              <!-- empty until JavaScript runs -->
    <script type="module" src="/assets/index-a1b2c3.js"></script>
  </body>
</html>
```

**What happens, step by step:**
1. The browser gets the HTML above. It shows nothing yet.
2. It downloads and runs the JavaScript bundle.
3. React renders the components and fills `#root`.
4. The components fetch data from an API, then render again with real content.

That works well for apps behind a login. It has two costs. First, the user waits on a blank page. Second, anything that reads only the HTML (many link-preview bots, some crawlers) sees an empty `div`. Search engines such as Google can run JavaScript, but it is slower and less reliable than reading ready HTML.

**Common mistake:** setting page metadata in an effect.

```jsx
// Wrong: the HTML a bot downloads still has the default title
useEffect(() => {
  document.title = product.name
}, [product.name])
```

```jsx
// Better: in an app that renders on the server, React 19 puts <title> into the HTML
function ProductPage({ product }) {
  return (
    <>
      <title>{product.name}</title>
      <h1>{product.name}</h1>
    </>
  )
}
```
Why: the effect only runs in a browser. The `<title>` element is part of the rendered output, so a server render includes it.

## 2. Rendering strategies side by side
Think of a restaurant. **CSR** is a meal kit: you get the ingredients (JavaScript) and cook at home. **SSR** is a cooked meal made when you order. **SSG** is a meal cooked in the morning and kept on the counter. **ISR** is the same counter meal, but the kitchen replaces it every hour.

| Strategy | HTML is made | Data freshness | Good for | Weak spot |
|---|---|---|---|---|
| CSR | In the browser, after JS runs | Always live (fetched in the browser) | Dashboards and apps behind a login | Blank first paint, poor for link previews |
| SSR | On the server, per request | Fresh per request | Personalised or SEO pages | Server cost, slower first byte, needs hydration |
| SSG | At build time | As old as the last build | Docs, blogs, marketing pages | Stale until you rebuild, no per-user content |
| ISR | At build time, rebuilt in the background later | Stale for at most the revalidate window | Product or news pages | A framework feature, not a React feature |
| Streaming SSR | On the server, in pieces | Fresh per request | Pages with one slow part | More moving parts |
| Islands | Mostly static HTML, JS only for marked parts | Like SSG or SSR | Content sites (Astro uses this idea) | Not the normal React app model |
| Partial prerendering (PPR) | Static shell at build, dynamic holes at request time | Shell static, holes fresh | Static speed plus live data | Newer, framework specific |

**Status of the newer ideas, honestly (November 2026):**
- ISR is offered by frameworks such as Next.js. React itself has no concept of ISR.
- PPR is a framework feature. In Next.js 16 the old `experimental.ppr` flag was removed and PPR became the behaviour of Cache Components (`cacheComponents: true`, App Router). React 19.2 added the low-level pieces: `prerender` returns a `postponed` state that `resume` can finish later. See [Next.js essentials](06-nextjs-essentials.md).
- Islands means "ship JavaScript only for the interactive parts". Astro is the well-known example. React Server Components reach a similar goal in a different way.

Illustrative timelines (the numbers are made up, the order is what matters):

```text
CSR
  0 ms    tiny HTML arrives (fast TTFB), screen is blank
 300 ms   JavaScript arrives and runs
 900 ms   data arrives, content appears (late FCP and LCP), page is interactive

SSR
  0 ms    request; server fetches data and builds HTML (slower TTFB)
 400 ms   HTML arrives, user SEES the page (early FCP and LCP), clicks do nothing yet
 800 ms   JavaScript arrives, React hydrates, page is interactive (TTI)

Streaming SSR
  0 ms    server sends the shell (layout and Suspense fallbacks) at once
 100 ms   user sees the shell
 600 ms   slow data is ready, server streams it into the SAME response
          React swaps each fallback for the real content
```

The four numbers interviewers like:
- **TTFB** (time to first byte): how long until the first byte of HTML arrives.
- **FCP** (first contentful paint): when the first text or image is painted.
- **LCP** (largest contentful paint): when the biggest element is painted. Under 2.5 seconds counts as good.
- **TTI** (time to interactive): when the page reliably reacts to clicks. Google's field metric for this today is INP.

SSG has the best TTFB (a file from a CDN). SSR has a worse TTFB than SSG but a much better FCP and LCP than CSR. SSR does not fix TTI by itself, because the page still waits for JavaScript. Streaming improves the "slow part blocks everything" problem.

**Common mistake:** "SSR is always faster."

```text
Wrong:  every page uses SSR, even a logged-in settings screen nobody indexes.
Fixed:  SSG or ISR for public content, SSR for personalised content, CSR where a server adds nothing.
```
Why: SSR moves work to a server you pay for, and adds a wait before the first byte.

## 3. Server rendering APIs
`react-dom/server` turns elements into HTML. Pick by what you need:

| Need | Node.js | Web Streams (edge, Deno, browsers) |
|---|---|---|
| Stream HTML as it becomes ready | `renderToPipeableStream` | `renderToReadableStream` |
| Build static HTML, wait for all data (SSG) | `prerenderToNodeStream` | `prerender` |
| Finish a prerender later (PPR style) | `resumeToPipeableStream` | `resume` |
| Old all-at-once string | `renderToString` | `renderToString` |

`renderToString` is the legacy API. It cannot stream, and it does not wait for suspended data. `renderToNodeStream` and `renderToStaticNodeStream` were removed in React 19. In Node, the docs prefer the Node stream versions because they are much faster than Web Streams.

Here is what `renderToString` does with a component that has state, an effect and a click handler. I ran it:

```jsx
import { useEffect, useState } from 'react'
import { renderToString } from 'react-dom/server'

function Counter() {
  const [n] = useState(0)
  useEffect(() => { console.log('effect ran') }, [])
  return <button onClick={() => alert('hi')}>Count {n}</button>
}

console.log(renderToString(<Counter />))
```

```text
<button>Count <!-- -->0</button>
```

**What happens, step by step:**
1. React renders `Counter` once with the initial state.
2. The HTML string has the text, but no `onClick`. A string cannot hold a function.
3. The effect never runs. Effects run only in a browser, after React attaches to the DOM.
4. The `<!-- -->` comment separates two text pieces so the browser keeps them as two text nodes.

A minimal Node server with streaming looks like this. Frameworks write it for you. The `App` component renders the whole `<html>` document.

```jsx
import { createServer } from 'node:http'
import { renderToPipeableStream } from 'react-dom/server'
import App from './App.jsx'

createServer((req, res) => {
  const { pipe, abort } = renderToPipeableStream(<App url={req.url} />, {
    bootstrapScripts: ['/client.js'],      // the script that will hydrate
    onShellReady() {                        // the shell (outside Suspense) is ready
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html')
      pipe(res)
    },
    onShellError() {                        // the shell itself failed
      res.statusCode = 500
      res.end('<h1>Something went wrong</h1>')
    },
    onError(error) { console.error(error) },
  })
  setTimeout(abort, 10_000)                 // stop waiting for slow data
}).listen(3000)
```

**What streaming sends.** I rendered a page with a heading and a Suspense boundary around a component that waits for a promise. The server wrote two chunks (trimmed):

```text
chunk 1: <main><h1>Title</h1><!--$?--><template id="B:0"></template><p>Loading</p><!--/$--></main>
chunk 2: <div hidden id="S:0"><p>Loaded</p></div><script>...a tiny script that swaps S:0 into B:0...</script>
```

**What happens, step by step:**
1. The shell is ready as soon as everything outside the pending boundary can render. `onShellReady` fires and the first chunk goes out. It holds the fallback.
2. The browser paints the heading and "Loading" right away.
3. When the data resolves, the server appends a hidden block with the real content plus a small script.
4. The script moves the content into place. No React JavaScript is needed for this swap.

Use `onAllReady` instead of `onShellReady` when you want the complete page in one go, for example for crawlers.

**Common mistake:** using `renderToString` and expecting streaming.

```jsx
// Wrong: waits for nothing, streams nothing, a pending boundary becomes a client-render marker
const html = renderToString(<App />)
```

```jsx
// Fixed: stream, and wait for everything only when you need to
const { pipe } = renderToPipeableStream(<App />, { onShellReady() { pipe(res) } })
```
Why: with `renderToString`, a Suspense boundary that is still pending is left for the browser to render.

## 4. Hydration
**Hydration** means: React takes HTML that already exists and makes it interactive. It walks the existing DOM, reuses the nodes, and attaches event handlers and state. It does not rebuild the DOM.

```jsx
import { hydrateRoot } from 'react-dom/client'
import App from './App.jsx'

hydrateRoot(document.getElementById('root'), <App />)   // not createRoot
```

**What happens, step by step:**
1. The server sent HTML. The user already sees the page.
2. The JavaScript loads and `hydrateRoot` runs `App` in the browser.
3. React compares what it just rendered with the existing DOM, node by node.
4. If they match, React keeps the DOM and attaches handlers. The page is now interactive.
5. If they do not match, React reports an error and falls back to client rendering for the affected part.

The golden rule: **the first client render must produce exactly the same output as the server render.** Anything that differs between the two (time, random numbers, window size, user locale) breaks the rule.

**Selective hydration.** Since React 18, each Suspense boundary can hydrate on its own. Heavy parts do not block light parts. If the user clicks inside a part that is not hydrated yet, React hydrates that part first. Together with streaming this means: show HTML early, hydrate in the order the user needs. Wrap slow or code-split parts in `<Suspense>` to benefit.

**Common mistake:** calling `createRoot` on a server-rendered container.

```jsx
// Wrong: throws away the server HTML and renders everything again
createRoot(document.getElementById('root')).render(<App />)
```

```jsx
// Fixed
hydrateRoot(document.getElementById('root'), <App />)
```
Why: `createRoot` clears the container and builds the DOM from scratch, so the server work is wasted.

## 5. Hydration mismatches: causes and fixes
A **hydration mismatch** is a difference between server output and the first client render.

Common causes:
- **Values that change between renders:** `Date.now()`, `new Date()`, `Math.random()`, `crypto.randomUUID()`.
- **Timezone and locale:** the server formats a date in UTC and the browser in the user's timezone.
- **Browser-only reads during render:** `window`, `localStorage`, `matchMedia`. A `typeof window` check makes the two sides take different branches.
- **Invalid HTML nesting:** `<p><div>...</div></p>`, a link inside a link, a `<tr>` directly inside `<table>` in handwritten HTML. The browser's parser repairs the HTML, so the DOM no longer matches React's tree.
- **Different data** on the server and the client (for example a stale cached response).
- **Browser extensions** and third-party scripts that change the HTML. React 19 repairs content injected into `<head>` and `<body>` by re-rendering on the client instead of failing hard. Extensions that rewrite markup inside your own tree can still trigger warnings, so test in a clean browser profile before you hunt for a bug.

I ran a mismatch where the server HTML was `<p>server</p>` and the client rendered `<p>client</p>`. React reported to `onRecoverableError`: "Hydration failed because the server rendered text didn't match the client. As a result this tree will be regenerated on the client." The final DOM showed `client`. For a text mismatch, React repairs the page but pays for it with a full client render of that tree. For an attribute mismatch it only logs a dev error and keeps the server value.

I also ran invalid nesting (`<p><div>hi</div></p>`). The server printed the string as written, the browser parser closed the `<p>` early, and React reported "Hydration failed because the server rendered HTML didn't match the client". The fix is valid HTML: use `<div><div>hi</div></div>` or a `<span>`.

### Fix 1: client-only values go in an effect
Render something stable first, then set the real value after hydration.

```jsx
import { useEffect, useState } from 'react'

function Clock() {
  const [time, setTime] = useState(null)        // same on the server and on the first client render
  useEffect(() => {
    setTime(new Date().toLocaleTimeString())    // effects never run on the server
  }, [])
  return <p>{time ?? 'Loading time...'}</p>
}
```

**What happens, step by step:**
1. The server renders `<p>Loading time...</p>`.
2. The first client render also gives `Loading time...`, so hydration matches.
3. After hydration the effect runs and sets the real time, and React re-renders. I ran this: no errors, and the DOM went from `loading` to the client value.

### Fix 2: `suppressHydrationWarning` (a last resort)
For one unavoidable difference, such as a timestamp, you can silence the warning on that element.

```jsx
<time suppressHydrationWarning>{new Date().toLocaleString()}</time>
```
I ran this with server text `server` and client text `client`: no error was logged, and the DOM **kept the server text**. So the flag hides the warning, it does not fix the value. It works one level deep only. Use it for rare cases, never as a blanket fix.

### Fix 3: `useSyncExternalStore` with `getServerSnapshot`
When the value comes from the browser (online status, media query, `localStorage`), tell React what to use on the server and during hydration.

```jsx
import { useSyncExternalStore } from 'react'

function subscribe(callback) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,   // client snapshot
    () => true,               // server snapshot: used on the server and while hydrating
  )
}
```
I ran the same shape with `'server-value'` and `'client-value'`: the server HTML had `server-value`, hydration produced no errors, and React then moved to `client-value`. See [Other hooks](../02-hooks/09-other-hooks.md) for the hook itself.

### Fix 4: other tools
- **`useId`** gives ids that match on both sides. Do not make ids with `Math.random()`.
- **`use(browser())`** (new in React 19.3) marks a Client Component subtree as browser-only. On the server it stops rendering that component and leaves the nearest Suspense fallback in the HTML. It must sit inside a `<Suspense>`.

```jsx
import { Suspense, use } from 'react'
import { browser } from 'react-dom'

function MapView() {
  use(browser('needs window'))      // optional reason, shown to onBrowserBailout on the server
  return <canvas id="map" />
}

export default function Page() {
  return <Suspense fallback={<p>Loading map...</p>}><MapView /></Suspense>
}
```

**Common mistake:** reading `window` while rendering.

```jsx
// Wrong: window does not exist on the server, and the branches differ
const isMobile = typeof window !== 'undefined' && window.innerWidth < 600
return isMobile ? <MobileMenu /> : <DesktopMenu />
```

```jsx
// Fixed: a hook with a server snapshot (here a fixed default of false)
const isMobile = useSyncExternalStore(subscribeToResize, () => window.innerWidth < 600, () => false)
```
Why: the server and the first client render must agree, and `window` is not there on the server.

One more thing: from React 19.3, StrictMode in development also runs effect setup, cleanup, setup during hydration (verified on 19.3.1). If an effect breaks when it runs twice, you will now see it earlier.

## 6. React Server Components: the idea
In classic SSR every component is rendered on the server and then **also shipped to the browser and run again** to hydrate. So the browser downloads the code for everything, even for parts that never change, and data still comes through an API.

**React Server Components (RSC)** add a second kind of component. A Server Component runs only on the server (at build time or per request). Its code is never sent to the browser. It can be `async`, so it can read a database or a file directly. Only its output goes to the browser.

Benefits:
- **Zero client JavaScript for server-only code.** A markdown parser or date library used only in a Server Component adds nothing to the bundle.
- **Direct data access.** No API layer between the component and the data, and no client-side waterfall.
- **Secrets stay on the server.** Keys and database code never ship.
- **Smaller bundles**, so faster loads on slow phones.

Server Components, Server Functions and the directives `"use client"` and `"use server"` are stable in React 19. They need a framework or bundler that implements them. A plain Vite SPA has no server, so it has no Server Components.

```jsx
// app/posts/page.jsx  (a Server Component, the default in Next.js App Router)
import { db } from '@/lib/db'              // your own database helper
import LikeButton from './LikeButton'

export default async function PostsPage() {
  const posts = await db.post.findMany({ orderBy: { createdAt: 'desc' } })
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>
          <h2>{post.title}</h2>
          <LikeButton initialLikes={post.likes} />
        </li>
      ))}
    </ul>
  )
}
```

```jsx
// app/posts/LikeButton.jsx  (a Client Component)
'use client'

import { useState } from 'react'

export default function LikeButton({ initialLikes }) {
  const [likes, setLikes] = useState(initialLikes)
  return <button onClick={() => setLikes(likes + 1)}>Like ({likes})</button>
}
```

**What happens, step by step:**
1. A request comes in. The server runs `PostsPage`, which awaits the database.
2. It renders the list. When it reaches `LikeButton`, it does not run it for the client. It writes a reference ("client component in this file") plus the props (`initialLikes`).
3. The server also renders the HTML for the first view (this is SSR of the whole tree, Client Components included).
4. The browser receives the HTML, so the user sees the page at once.
5. The browser loads JavaScript for `LikeButton` and its imports only. `PostsPage` and `db` are never downloaded.
6. React hydrates the buttons. Clicking one updates its own state in the browser.

**Common mistake:** marking the whole page as a Client Component to use one hook.

```jsx
// Wrong: the whole page, and everything it imports, now ships to the browser
'use client'
export default function PostsPage() { /* useState for one toggle, fetch in useEffect */ }
```

```jsx
// Fixed: keep the page on the server, move only the interactive piece into its own file
export default async function PostsPage() { /* fetch on the server, render <LikeButton /> */ }
```
Why: `"use client"` moves a whole module graph to the browser. Push it down to the smallest interactive leaf.

## 7. The "use client" boundary and what crosses it
`"use client"` goes at the very top of a file. It does not mean "this runs only in the browser". It means: **this file is the entry point of the client part of the module tree.** The file and everything it imports belong to the client bundle.

```text
Page (server)
 |- Header (server)
 |- ProductList (server, async, reads the database)
 |    |- LikeButton   <- file starts with "use client": the boundary
 |         |- Icon    <- no directive, but imported by a client file, so it is client code too
 |- Footer (server)
```

Three consequences:
- **The boundary spreads to imports.** You mark a file once. Its imports follow without their own directive.
- **Client Components are still server-rendered.** On the first load a framework renders them to HTML too, then hydrates them. "Client" means "also runs in the browser", not "skips the server".
- **The same component can be used both ways.** A file with no directive that is imported by a Server Component runs as a Server Component. Imported by a client file, it runs as a Client Component.

What a Server Component **cannot** do: `useState`, `useReducer`, `useEffect`, event handlers such as `onClick`, browser APIs such as `window` and `localStorage`, and reading context with `useContext` or `use(Context)`. What it **can** do: be `async`, read data and secrets, render Client Components, and use `cache()`. A Client Component cannot be `async`.

**What can cross the boundary as a prop?** Only values React can serialize (turn into text to send): strings, numbers, booleans, `null`, `undefined`, `bigint`, plain objects and arrays of those, `Date`, `Map`, `Set`, Promises (React 19), JSX elements (so `children` works), and Server Functions. **Not** ordinary functions, class instances or DOM nodes. Check your framework's docs for the exact list.

```jsx
// Server Component
import Toolbar from './Toolbar'   // client

export default function Page() {
  return <Toolbar onSave={() => save()} user={new UserModel()} />   // both props fail
}
```

```jsx
// Fixed: send plain data, and let the client component own its handler
export default function Page({ user }) {
  return <Toolbar userName={user.name} savedAt={user.savedAt} />
}
```
Why: a function or class instance cannot be written into the payload. The error appears at build or render time.

## 8. Composition: Server Components inside Client Components
A Client Component cannot `import` a Server Component (the import would pull it into the client bundle). But it can **receive one as `children`** (or any prop). The Server Component renders on the server, and the client sees only the result.

```jsx
// ThemePanel.jsx
'use client'
import { useState } from 'react'

export default function ThemePanel({ children }) {
  const [open, setOpen] = useState(true)
  return (
    <aside>
      <button onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Show'}</button>
      {open && children}
    </aside>
  )
}
```

```jsx
// page.jsx (a Server Component)
import ThemePanel from './ThemePanel'
import Recommendations from './Recommendations'   // an async Server Component

export default function Page() {
  return (
    <ThemePanel>
      <Recommendations />
    </ThemePanel>
  )
}
```

**What happens, step by step:**
1. `Page` runs on the server. It creates the `<Recommendations />` element and passes it as `children`.
2. The server renders `Recommendations` itself, awaits its data and puts the result into the payload.
3. The browser's `ThemePanel` receives that finished output as `children`.
4. Clicking the button flips `open` in the browser. `Recommendations` is not re-run and its code is not in the bundle.

**Common mistake:** importing the Server Component inside the client file.

```jsx
// Wrong (inside ThemePanel.jsx): the import makes Recommendations client code, and async is not allowed there
import Recommendations from './Recommendations'
```

```jsx
// Fixed: receive it through children, as above
```
Why: the module graph decides where code runs, and a client file's imports are client code.

React 19.3 also lets a Server Component render a Context object that is exported from a `"use client"` file, without a wrapper provider component. That is from the release notes and needs an RSC-capable bundler, so I did not run it.

## 9. Server Functions and Server Actions
A **Server Function** is an `async` function that runs on the server but can be called from the browser. You mark it with `"use server"`. A **Server Action** is a Server Function used as a form `action` or inside a transition. In casual talk people say "Server Action" for both.

`"use server"` is **not** the opposite of `"use client"`. It does not mark Server Components (those need no directive). It marks functions the client may call.

```js
// app/actions.js
'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser, canComment } from '@/lib/auth'   // your own helpers
import { db } from '@/lib/db'

export async function addComment(prevState, formData) {
  const user = await getCurrentUser()                      // 1. authenticate
  if (!user) return { error: 'Please sign in.' }

  const postId = Number(formData.get('postId'))            // 2. validate input
  const text = String(formData.get('text') ?? '').trim()
  if (!Number.isInteger(postId) || text.length < 1 || text.length > 500) {
    return { error: 'The comment must be 1 to 500 characters.' }
  }

  const post = await db.post.findUnique({ where: { id: postId } })
  if (!post || !(await canComment(user, post))) {          // 3. authorise
    return { error: 'You cannot comment here.' }
  }

  await db.comment.create({ data: { postId, text, authorId: user.id } })
  revalidatePath(`/posts/${postId}`)                       // refresh cached pages (Next.js)
  return { error: null }
}
```

```jsx
// app/CommentForm.jsx
'use client'
import { useActionState } from 'react'
import { addComment } from './actions'

export default function CommentForm({ postId }) {
  const [state, formAction, pending] = useActionState(addComment, { error: null })
  return (
    <form action={formAction}>
      <input type="hidden" name="postId" value={postId} />
      <textarea name="text" required />
      <button disabled={pending}>{pending ? 'Posting...' : 'Post'}</button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  )
}
```

**What happens, step by step:**
1. The user submits the form. React calls `formAction`, which sends a POST request to the server with the form data.
2. The framework finds `addComment` and runs it on the server. The browser never sees its code.
3. The function checks who the user is, validates the input and checks permission, then writes to the database.
4. It returns `{ error: null }` or an error message. `useActionState` stores that as `state`, and `pending` is true while it runs.
5. Frameworks can send the refreshed UI back in the same round trip.

**Progressive enhancement.** `<form action={...}>` is a real HTML form. When the form is server-rendered and the action is a Server Function, it can submit even before the JavaScript has loaded, and the framework handles the response. This is why forms are the natural home for Server Actions. See [React 19 and newer](04-react-19-and-newer.md) for `useActionState`, and [Forms with libraries](../03-intermediate/04-forms-with-libraries.md).

Calling a Server Function from a click handler or `useEffect` also works, but then it needs JavaScript and you handle pending and error states yourself.

**Common mistake:** trusting the client.

```js
// Wrong: any caller can post any userId, and nothing checks who they are
export async function deletePost(formData) {
  'use server'
  await db.post.delete({ where: { id: Number(formData.get('id')) } })
}
```

```js
// Fixed: identity from the session, input validated, ownership checked
export async function deletePost(formData) {
  'use server'
  const user = await getCurrentUser()
  if (!user) throw new Error('Not signed in')
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) throw new Error('Bad id')
  const post = await db.post.findUnique({ where: { id } })
  if (!post || post.authorId !== user.id) throw new Error('Forbidden')
  await db.post.delete({ where: { id } })
}
```
Why: the UI hides the delete button, but a hidden button is not security.

## 10. Security of Server Functions and the 2025-2026 advisories
**Every Server Function is a public HTTP endpoint.** Anyone can send a POST to it with any data, with or without your UI. Frameworks hide the URL and rotate action ids (Next.js removes unused actions from the build and uses unguessable ids), but that is not access control. For every function:
1. **Authenticate:** who is calling? Read the session on the server.
2. **Authorise:** may this user do this to this record?
3. **Validate:** check types, lengths and ranges of every field. Never trust hidden inputs.
4. **Return only what the caller may see.** Do not send back whole database rows.

Read the full picture in [Security and i18n](10-security-and-i18n.md).

**The December 2025 advisories.** These show a different kind of risk: a flaw in React's own code that decodes the requests sent to Server Function endpoints.

| Date | What | Details |
|---|---|---|
| 2025-12-03 | CVE-2025-55182, remote code execution, CVSS 10.0 | Unauthenticated. Affected `react-server-dom-webpack`, `-parcel` and `-turbopack` in 19.0, 19.1.0, 19.1.1 and 19.2.0. Fixed in 19.0.1, 19.1.2, 19.2.1. Apps without RSC support were not affected. Nicknamed "React2Shell". Next.js tracked it as CVE-2025-66478: Next 15.x and 16.x App Router were affected, Next 13, Next 14 stable and Pages Router apps were not. |
| 2025-12-11 | Denial of service (CVE-2025-55184, CVE-2025-67779) and source code exposure (CVE-2025-55183) | The first fixes were reported incomplete, so more patches followed. |
| 2026-01-26 | CVE-2026-23864, denial of service | Minimum safe versions per the advisory: 19.0.4, 19.1.5, 19.2.4. |

More RSC hardening patches followed through 2026. As of 2026-10-14 the newest patches are 19.3.1, 19.2.9, 19.1.10 and 19.0.9 (19.3.1 improves the transport protocol). Use the newest patch of your line, not a remembered version number.

Lessons:
- **Supporting RSC is enough to be exposed.** Apps could be affected even if they defined no Server Functions of their own.
- **Patch React and the framework together.** Watch advisories, keep a lockfile, and automate dependency updates.
- **The request decoder is an attack surface.** A framework patch does not fix your missing auth checks, and your auth checks do not fix a framework flaw. You need both.
- **After a critical flaw, rotate secrets** that a server might have exposed.

## 11. The payload, caching, frameworks and common mix-ups
**The RSC payload (also called "Flight").** The server does not send a finished page for Server Components. It streams a compact description of the rendered tree: elements and text, references to Client Components (which file to load, with which props), and slots for data that is still pending. The browser's React merges it into the page. Here is an invented sketch of the idea (the real format is an internal detail and changes between versions):

```text
tree:  <ul>
         <li><h2>First post</h2> [client ref: LikeButton, props: { initialLikes: 3 }] </li>
         <li> ... pending, will arrive later ... </li>
       </ul>
```
Because the payload is data, not HTML, the framework can also fetch it on a client-side navigation and update the page while **keeping client state** (an open menu, a typed input) in the parts that did not change.

**Caching in one minute.** Calling the same function from several Server Components in one request would hit the database several times. React's `cache()` memoizes a function for the length of one server request (it works only in Server Components).

```js
import { cache } from 'react'
import { db } from '@/lib/db'

export const getUser = cache(async (id) => db.user.findUnique({ where: { id } }))
// Header and Sidebar can both call getUser(1): one query per request
```
Longer-lived caching belongs to the framework. In Next.js 15 `fetch` stopped caching by default, and in Next.js 16 caching is opt-in through `"use cache"`. Details are in [Next.js essentials](06-nextjs-essentials.md). Never cache or statically render content that is specific to one user.

**Which frameworks implement it (November 2026):**
- **Next.js App Router:** the main, stable implementation.
- **React Router:** RSC and Server Actions support is still marked `unstable_` in v8 (framework mode is the full-stack way to use it; see [React Router](../03-intermediate/03-react-router.md)).
- **TanStack Start:** reached its stable 1.0 milestone on 2026-10-13. RSC is an optional, experimental piece and does not change its app model.
- **Waku** and **Parcel** (via `react-server-dom-parcel`) also support RSC. Check each project's docs before you pick one, because the bundler-facing APIs do not follow semver.

**Common mix-ups:**
- **RSC is not SSR.** SSR renders any component (client ones too) to HTML. RSC decides where component code runs and what ships. A page can use either, both or neither.
- **`"use client"` is not "browser only".** It marks a module boundary, and the file is still server-rendered.
- **`"use server"` is not "this is a Server Component".** It marks callable Server Functions.
- **Server Components are not experimental.** They are stable in React 19. Only the bundler integration APIs are unstable.

## How interviewers test this
- Whether you can define the words precisely: CSR, SSR, SSG, ISR, hydration, Server Component, Server Action. Vague "SSR is for SEO" is a weak answer.
- Whether you know that RSC and SSR are different things, and that Client Components are still server-rendered.
- Whether you can explain a hydration mismatch from a symptom (a console error, flicker) and name two fixes.
- Whether you see Server Actions as public endpoints and mention authentication, authorisation and validation without being asked.
- Red flags: "use client means it runs only in the browser", "Server Components are just SSR", "the hidden button protects the action", "put it all in a Client Component to be safe".
- A strong senior answer picks a rendering strategy per page and names the trade-off (TTFB against freshness against cost).

## Interview questions and model answers

### Q1. What is the difference between CSR, SSR, SSG and ISR? (Easy)
**CSR** builds the page in the browser from JavaScript, so the first HTML is nearly empty. **SSR** builds the HTML on the server for each request, so users and crawlers get content early, at the cost of server work and a slower first byte. **SSG** builds the HTML once at build time and serves files from a CDN: fastest, but stale until the next build. **ISR** is SSG that is rebuilt in the background after a set time or on demand, so pages stay fast and mostly fresh. I choose by how personal and how fresh the page must be: public and rarely changing means SSG or ISR, personalised means SSR or CSR.

### Q2. What is hydration? (Easy)
Hydration is how React turns server-rendered HTML into a live app. The browser already shows the HTML. `hydrateRoot` renders the same components in the browser, matches them to the existing DOM nodes, and attaches event handlers and state instead of creating new DOM. Until it finishes, the page looks ready but does not respond. The first client render must match the server output, or React reports a mismatch.

### Q3. What causes hydration mismatches, and how do you fix them? (Medium)
Anything that differs between the server render and the first client render: `Date.now()` or `Math.random()` in render, timezone and locale differences, reading `window` or `localStorage` while rendering, invalid HTML nesting such as a `div` inside a `p`, different data, and extensions that edit the page. Fixes: put client-only values in `useEffect` after a stable first render, use `useSyncExternalStore` with a `getServerSnapshot`, generate ids with `useId`, correct the HTML, and use `suppressHydrationWarning` only for a single unavoidable difference, because it hides the warning but keeps the server value. A text mismatch makes React re-render that tree on the client, which costs performance.

### Q4. What are React Server Components and why do they exist? (Medium)
They are components that run only on the server, at build time or per request. They can be `async`, read databases and secrets directly, and their code is never sent to the browser. The result is smaller bundles, no client-side data waterfalls for server-owned data, and secrets that stay private. Interactive parts stay Client Components. The server sends the output of Server Components as a payload, and the browser merges it with the Client Components.

### Q5. What is the difference between Server and Client Components, and what can't a Server Component do? (Medium)
A Server Component runs once on the server and has no state or lifecycle. It cannot use `useState`, `useReducer`, `useEffect`, event handlers, browser APIs, or read context. A Client Component also runs in the browser: it can hold state, use effects and handle events, but it cannot be `async`, and its code ships in the bundle. Both kinds are rendered to HTML on the first load. I keep as much as possible on the server and add `"use client"` only to small interactive leaves.

### Q6. What does `"use client"` do? (Medium)
It marks a file as the entry point of the client part of the module graph. The file and everything it imports are bundled for the browser, so you do not repeat the directive in each child file. It does not mean "browser only": Client Components are still rendered to HTML on the server, then hydrated. It also does not stop you from passing Server Components in as `children`. Put it as low in the tree as you can so less code ships.

### Q7. Are Server Components the same as SSR? (Medium)
No. SSR renders components (any component, Client Components included) to an HTML string on the server so the first view arrives early; afterwards the same code runs again in the browser to hydrate. Server Components change where code runs: they never run in the browser, never hydrate, and are not in the bundle. They solve different problems (first paint against bundle size and data access), and they work together. In a typical Next.js page, Server Components are rendered to the payload, and the first load is also SSR'd to HTML.

### Q8. What are Server Actions, and are they secure? (Medium)
A Server Action is an `async` function marked `"use server"` that runs on the server and can be used as a form `action` or called from the client. It is convenient because forms can work before JavaScript loads, and mutations need no hand-written API route. But it is a public POST endpoint. Anyone can call it directly, so each action must authenticate the user, authorise access to the specific record, and validate every input, exactly as a REST handler would. The 2025 React2Shell flaw (CVE-2025-55182) was a separate lesson: keep React and the framework patched, because the request decoder is an attack surface too.

### Q9. How do you pass data from a Server Component to a Client Component? (Medium)
Through props. Props must be serializable: primitives, plain objects and arrays, `Date`, `Map`, `Set`, Promises, JSX and Server Functions. Ordinary functions, class instances and DOM nodes cannot cross. Fetch in the Server Component and pass only the fields the client needs. You can also pass a Server Component as `children` to a Client Component. The server renders it, and the client component shows the result without importing it. The other direction does not work: a Client Component cannot import a Server Component.

### Q10. How does streaming SSR work, and what do Suspense boundaries do? (Hard)
With `renderToPipeableStream` or `renderToReadableStream`, the server sends the shell as soon as everything outside pending Suspense boundaries is ready, with fallbacks in the boundaries. When a boundary's data resolves, the server appends the real HTML and a tiny script that swaps it in. This improves TTFB and FCP when one slow part exists. On the client, each boundary hydrates independently (selective hydration), and a boundary the user interacts with gets priority. For crawlers you can wait for `onAllReady` so that they receive the full page.

## Common mistakes and gotchas
- Using `Date.now()`, `Math.random()` or `window` while rendering. Fix: stable first render plus `useEffect`, or `useSyncExternalStore` with a server snapshot.
- Using `suppressHydrationWarning` everywhere. Fix: use it on one element, and know it keeps the server value.
- Invalid HTML nesting (`div` in `p`). Fix: use valid structure, and read the dev error, which shows a diff.
- Putting `"use client"` at the top of a page or layout. Fix: move it to the smallest interactive leaf.
- Importing a Server Component into a Client Component. Fix: pass it as `children`.
- Passing functions or class instances as props from server to client. Fix: pass plain data, or a Server Function.
- Treating a Server Action as internal code. Fix: authenticate, authorise and validate in every action.
- Trusting a hidden form field such as `userId`. Fix: read identity from the server session.
- Using `createRoot` on server-rendered HTML. Fix: use `hydrateRoot`.
- Using `renderToString` when you need streaming. Fix: use `renderToPipeableStream` or `renderToReadableStream`.
- Staying on an old React or Next.js version that has RSC advisories. Fix: upgrade to the latest patch of your line.
- Statically rendering or caching pages that contain per-user data. Fix: keep personal content dynamic.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** For each page, choose CSR, SSR, SSG or ISR and give one reason: (a) a company blog, (b) a logged-in analytics dashboard, (c) a product page whose price changes a few times a day, (d) a social feed that differs per user.
<details>
<summary>Show answer</summary>

(a) SSG: public, rarely changes, best speed and SEO. (b) CSR: behind a login, no SEO need, very interactive; SSR would add server cost for little gain. (c) ISR: static speed with a short revalidate window (or on-demand revalidation when the price changes). (d) SSR (streaming, with the feed in a Suspense boundary): the content is personal, so it cannot be built ahead of time, and early HTML helps.

</details>

2. **(Easy)** This component causes a hydration warning when server rendered. Fix it so server and client match, and the time still appears.
```jsx
function Greeting() {
  return <p>Rendered at {new Date().toLocaleTimeString()}</p>
}
```
<details>
<summary>Show answer</summary>

The time differs between the server render and the first client render. Render a stable placeholder first and set the real time in an effect:

```jsx
import { useEffect, useState } from 'react'

function Greeting() {
  const [time, setTime] = useState(null)
  useEffect(() => {
    setTime(new Date().toLocaleTimeString())
  }, [])
  return <p>Rendered at {time ?? '...'}</p>
}
```
The server and the first client render both give `...`, so hydration matches. After hydration the effect runs and fills in the time. `suppressHydrationWarning` on the `<p>` would hide the warning but leave the server's time on screen.

</details>

3. **(Medium)** Explain: file `Card.jsx` starts with `'use client'` and imports `Badge.jsx` (no directive) and `format.js`. `Page.jsx` (no directive) imports `Card` and `Footer.jsx` (no directive). Which files end up in the browser bundle, and which stay on the server?
<details>
<summary>Show answer</summary>

In the browser bundle: `Card.jsx`, `Badge.jsx` and `format.js`. The `"use client"` directive makes `Card.jsx` the boundary, and everything it imports comes with it, with no directive needed in the imported files. On the server only: `Page.jsx` and `Footer.jsx`, because only Server Components import them. If a Client Component also imported `Footer.jsx`, then `Footer` would be used as client code in that place too.

</details>

4. **(Medium)** Write a hook `useMediaQuery(query)` that is safe to use in a server-rendered app. It returns a boolean, updates when the match changes, and returns `false` on the server.
<details>
<summary>Show answer</summary>

```jsx
import { useSyncExternalStore } from 'react'

export function useMediaQuery(query) {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', notify)
      return () => mql.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,   // client snapshot
    () => false,                              // server snapshot, also used while hydrating
  )
}
```
The server snapshot makes the server HTML and the first client render agree. After hydration React switches to the real value without a mismatch error. A `useState` plus `useEffect` version also works, but `useSyncExternalStore` avoids tearing under concurrent rendering.

</details>

5. **(Medium)** Explain what is wrong with each snippet in a framework with Server Components, and how to fix it.
```jsx
// A. Server Component
export default function Page() {
  const [open, setOpen] = useState(false)
  return <button onClick={() => setOpen(!open)}>Menu</button>
}
// B. in a file that starts with 'use client'
import Recommendations from './Recommendations'   // async Server Component
// C. Server Component passing a prop to a Client Component
<Chart format={(n) => n.toFixed(2)} />
```
<details>
<summary>Show answer</summary>

A. Server Components cannot use state or event handlers. Move the button and `useState` into a separate file that starts with `'use client'` and render that from the page.

B. Importing a Server Component into a client file turns it into client code, and a Client Component cannot be `async`. Receive it as `children` from a Server Component parent instead.

C. An ordinary function is not serializable and cannot cross the boundary. Pass plain data (for example the number) and define the format function inside the Client Component, or pass a Server Function if the logic must run on the server.

</details>

6. **(Medium)** Write a Server Action `renameTask(formData)` for a task app. It must check that the user is signed in, validate `id` and `title` (title 1 to 100 characters), and make sure the task belongs to the user. Use placeholders `getCurrentUser()` and `db`.
<details>
<summary>Show answer</summary>

```js
'use server'

import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function renameTask(formData) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not signed in')

  const id = Number(formData.get('id'))
  const title = String(formData.get('title') ?? '').trim()
  if (!Number.isInteger(id) || title.length < 1 || title.length > 100) {
    throw new Error('Invalid input')
  }

  const task = await db.task.findUnique({ where: { id } })
  if (!task || task.ownerId !== user.id) throw new Error('Forbidden')

  await db.task.update({ where: { id }, data: { title } })
}
```
The three checks are authentication (signed in), validation (shape and length) and authorisation (this user owns this task). Returning `{ error }` instead of throwing is nicer for form feedback with `useActionState`.

</details>

7. **(Hard)** Explain: your team uses Next.js 15 App Router with React 19.1.0 and defines no Server Actions. Someone says "we are not affected by CVE-2025-55182 because we have no Server Actions". Is that correct? What do you do?
<details>
<summary>Show answer</summary>

No. The advisory says apps that support React Server Components can be affected even if they define no Server Function endpoints, because the flaw is in how React decodes the payloads sent to those endpoints. React 19.1.0 is in the affected range (fixed in 19.1.2), and Next 15.x App Router was affected. Action: upgrade React and Next.js to the newest patched versions of your line (the advisory's minimum safe versions for later follow-up fixes are 19.1.5 or 19.2.4 and newer; newer patches exist), redeploy, and if the app was exposed unpatched around the disclosure, rotate secrets. Then add automated dependency updates so the next advisory is a routine bump.

</details>

8. **(Hard)** Refactor this page: it is a Client Component that fetches in an effect and renders a list with a search box. Split it so the list data is fetched on the server and only the search box is a Client Component. Keep the search simple: filter by a text field.
```jsx
'use client'
import { useEffect, useState } from 'react'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  useEffect(() => {
    fetch('/api/products').then((r) => r.json()).then(setProducts)
  }, [])
  const shown = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>{shown.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </>
  )
}
```
<details>
<summary>Show answer</summary>

The filter state and the list rendering depend on each other, so the simplest correct split is: the server fetches, and a small Client Component receives the data as a prop and owns the search.

```jsx
// app/products/page.jsx  (Server Component)
import { db } from '@/lib/db'
import ProductSearch from './ProductSearch'

export default async function ProductsPage() {
  const products = await db.product.findMany({ select: { id: true, name: true } })
  return <ProductSearch products={products} />
}
```

```jsx
// app/products/ProductSearch.jsx
'use client'
import { useState } from 'react'

export default function ProductSearch({ products }) {
  const [query, setQuery] = useState('')
  const shown = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search products" />
      <ul>{shown.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </>
  )
}
```
Gains: the list is in the first HTML, there is no fetch waterfall or loading flash, the database code is not shipped, and `select` sends only the fields the client needs. If the list were very large, you would keep filtering on the server through the URL search params and render the list in the Server Component.

</details>

## Recap
- CSR builds the page in the browser, SSR per request on the server, SSG at build time, ISR is SSG refreshed in the background, PPR is a static shell with dynamic holes (a framework feature).
- Choose by freshness, personalisation, SEO and cost. Learn the metrics: TTFB, FCP, LCP, TTI.
- Hydration attaches React to existing HTML. The first client render must match the server output.
- Fix mismatches with a stable first render plus `useEffect`, `useSyncExternalStore` with `getServerSnapshot`, valid HTML and `useId`. `suppressHydrationWarning` hides the warning but keeps the server value.
- Use `renderToPipeableStream` or `renderToReadableStream` for streaming, `prerender` for static output. `renderToString` is legacy.
- Server Components run only on the server and ship no JavaScript. `"use client"` marks a module boundary that spreads to imports, and Client Components are still server-rendered.
- Only serializable props cross the boundary. Pass Server Components to Client Components as `children`.
- Server Actions are public endpoints: authenticate, authorise and validate. Keep React and your framework patched (the December 2025 CVE-2025-55182 flaw was rated CVSS 10.0).

## Where to go next
- Next: [Next.js essentials](06-nextjs-essentials.md) for the App Router, caching and rendering strategies in a real framework.
- Security in depth: [Security and i18n](10-security-and-i18n.md).
- How hydration works inside React: React internals deep dive (planned).
- Choosing a rendering strategy in a design interview: [Frontend system design](11-frontend-system-design.md).
- Practise out loud: [Round 2, rendering, state and modern React](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md).
- Last-day revision: Quickfire revision (planned).
