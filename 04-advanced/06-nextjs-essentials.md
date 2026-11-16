# Next.js Essentials

> **Level:** Advanced   **Time:** about 70 minutes   **Read first:** [SSR and Server Components](05-ssr-and-server-components.md), [React Router](../03-intermediate/03-react-router.md), [React 19 and newer](04-react-19-and-newer.md)

## What you will learn
- Explain what Next.js adds on top of React, and choose between Next.js, a Vite SPA and React Router framework mode.
- Build routes with the App Router file conventions: layout, page, loading, error, not-found, dynamic segments and route groups.
- Fetch data in async Server Components and decide which small parts need `"use client"`.
- Explain caching and revalidation in Next 15 and Next 16: default fetch behaviour, Cache Components, `"use cache"`, `revalidateTag`, `updateTag` and `refresh`.
- Write a Server Action with a form, a Route Handler and a `proxy.ts` file, and keep them secure.
- Use the metadata API, `next/image`, `next/font`, environment variables, and pick a deployment option.

Versions: this lesson was checked against Next.js 16.4 (latest stable 16.4.6 on 2026-11-09) with React 19.3. The code is TypeScript for a project made with `npx create-next-app@latest`. Next.js cannot run inside the practice app, so the parts that are plain React or plain Web APIs (an async page, a route handler function, a form validator, a form using `useActionState`) were run with Vitest and Testing Library, and the outputs shown are real. Next-only behaviour (routing, caching, proxy) comes from the official docs.

## 1. What Next.js is, and which version you are reading about

React is a **library**: it draws UI. It gives you no router, no server, no build setup and no way to load data before the page shows. **Next.js** is a **framework** built around React that adds all of these:

- **File-based routing:** folders become URLs.
- **Rendering on the server:** the first HTML arrives ready to read, which helps speed and search engines.
- **Server Components, Server Actions and data fetching** on the server (see [SSR and Server Components](05-ssr-and-server-components.md) for the theory).
- **Tooling and built-ins:** the Turbopack bundler, image, font and script helpers, API endpoints (Route Handlers), and several ways to deploy.

Next.js has two routers. The **App Router** (the `app/` folder) is the default and the one to learn. The **Pages Router** (the `pages/` folder, with `getServerSideProps` and `getStaticProps`) is **legacy**: still supported, still in many old codebases, not for new work. Both can live in one project.

Next.js changed a lot in two years, so tutorials disagree. Use this table to map old code to current behaviour.

| Topic | Next 14 and older | Next 15 (Oct 2024) | Next 16 (Oct 2025, now 16.4) |
|---|---|---|---|
| `params`, `searchParams`, `cookies()`, `headers()` | read directly | Promises (direct reads still worked, with a warning) | Promises only, direct reads removed |
| `fetch` and `GET` Route Handlers | cached by default | **not** cached by default | not cached; opt in with `"use cache"` or `fetch` options |
| Opt-in caching tools | `fetch` options, `unstable_cache` | same | adds `"use cache"`, `cacheLife`, `cacheTag` (`cacheComponents: true`) |
| Invalidate by tag | `revalidateTag('x')` | `revalidateTag('x')` | `revalidateTag('x', 'max')`, plus `updateTag('x')` and `refresh()` (Server Actions only) |
| Request interception file | `middleware.ts` | `middleware.ts` (Node runtime stable in 15.5) | `proxy.ts` (Node); `middleware.ts` deprecated, Edge only |
| Bundler | webpack (Turbopack dev not stable) | Turbopack stable for dev | Turbopack default for dev and build; `--webpack` opts out |
| Partial Prerendering | experimental flags | experimental flags | part of `cacheComponents: true`; old `ppr` and `dynamicIO` flags removed |
| `next lint` | yes | yes (deprecated in 15.5) | removed |

The 16.4 release post says Cache Components "will become the default in Next.js 17". Next.js 17 does not exist yet.

**Common mistake:** following a Next 13/14 tutorial in a Next 16 project.

```tsx
// Wrong (old tutorial): params is a Promise now, so slug is undefined
export default function Page({ params }: { params: { slug: string } }) {
  return <h1>{params.slug}</h1>
}

// Fixed: type it as a Promise and await it
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <h1>{slug}</h1>
}
```

Why: since Next 15 request data is async so Next can start rendering the static parts before it knows the request. Running the destructuring on a Promise gave `slug === undefined` in my test.

## 2. Files become pages: the app directory

In the App Router a **folder is a URL segment**, and special file names say what to show. A folder is a route only if it contains `page.tsx` (or `route.ts`).

```text
my-app/
  app/
    layout.tsx           root layout (required): has <html> and <body>
    page.tsx             URL /
    not-found.tsx        shown when notFound() is called or nothing matches
    posts/
      page.tsx           URL /posts
      loading.tsx        shown while /posts loads
      error.tsx          shown if /posts throws
      [slug]/
        page.tsx         URL /posts/hello-world  (slug = "hello-world")
    (marketing)/         route group: name is NOT in the URL
      about/page.tsx     URL /about
  public/                static files, served from /
  proxy.ts               runs before matching requests
  next.config.ts
```

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'My Blog' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">Home</Link> <Link href="/posts">Posts</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
```

**What happens, step by step:**
1. You open `/posts/hello-world`. Next matches `app/posts/[slug]/page.tsx` and takes `slug = "hello-world"` from the URL.
2. It renders the layouts from the outside in: root layout, then any layout in `posts/`, then the page. Each layout receives the next level as `children`.
3. When you click a `Link` to `/posts/other`, the layouts stay mounted and keep their state. Only the page part changes.

The special files:
- `layout.tsx` wraps pages below it and does not remount on navigation. `template.tsx` is the same but remounts each time.
- `loading.tsx`, `error.tsx` and `not-found.tsx` give loading, error and 404 UI for a segment (section 6).
- `route.ts` is an API endpoint (section 10). It cannot sit in the same folder as `page.tsx`.

Folder name tricks, as one-liners:
- `[slug]` is a **dynamic segment**. `[...slug]` is a **catch-all** (matches `/a`, `/a/b`, `/a/b/c`, but not `/`). `[[...slug]]` is an **optional catch-all** (also matches the parent URL).
- `(group)` is a **route group**: organise files or share a layout without changing the URL. `_folder` is private and never a route.
- `@slot` is a **parallel route**: render two pages side by side in one layout (each slot needs a `default.tsx` in Next 16). `(.)photo` is an **intercepting route**: show another route inside the current page, for example a photo modal that is a full page on refresh.

**Common mistake:** the file is not named like a special file, so no route exists.

```text
app/posts/[slug]/post.tsx      <- wrong: no URL, nothing is rendered
app/posts/[slug]/page.tsx      <- fixed: this creates /posts/anything
```

## 3. Moving around: Link, hooks and redirect

- `Link` (from `next/link`) navigates in the browser without a full reload and, in production, **prefetches** the target in the background. Static routes are prefetched fully. Dynamic routes are prefetched down to the nearest `loading.tsx`.
- The navigation hooks come from `next/navigation` and need a Client Component: `useRouter()` (`push`, `replace`, `refresh`, `back`, `forward`, `prefetch`), `usePathname()` and `useSearchParams()` (read-only).
- `redirect('/login')` and `notFound()` also come from `next/navigation`. They work in Server Components, Server Actions and Route Handlers.

```tsx
// app/posts/sort-bar.tsx
'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

function SortLinks() {
  const pathname = usePathname() // "/posts"
  const sort = useSearchParams().get('sort') ?? 'new'
  const router = useRouter()
  return (
    <div>
      <Link href={`${pathname}?sort=old`}>Oldest first</Link>
      <button onClick={() => router.push(`${pathname}?sort=new`)}>Newest first</button>
      <p>Current: {sort}</p>
    </div>
  )
}

export default function SortBar() {
  return (
    <Suspense fallback={null}>
      <SortLinks />
    </Suspense>
  )
}
```

**What happens, step by step:**
1. `usePathname` gives the path without the query string. `useSearchParams` gives a read-only `URLSearchParams`.
2. Clicking the `Link` changes the URL to `?sort=old`. Next re-renders the page for the new search params. The layouts do not remount.
3. The button does the same through code with `router.push`. Prefer `Link` for anything that is really a link: it is crawlable, accessible and prefetched.
4. `Suspense` is there because in a prerendered route `useSearchParams` renders on the client up to the nearest Suspense boundary. Without a boundary the whole page would fall back to client rendering.

`redirect()` works by throwing a special error. Never call it inside a `try/catch` that swallows errors.

**Common mistake:** importing the router hook from the Pages Router.

```tsx
import { useRouter } from 'next/router'      // Wrong: Pages Router, fails in app/
import { useRouter } from 'next/navigation'  // Fixed: App Router
```

## 4. Server and Client Components in Next

In the App Router **every component is a Server Component by default**. It runs only on the server, can be `async`, can read a database or a secret, and sends no JavaScript for itself. Add `'use client'` at the top of a file when you need state, effects, event handlers or browser APIs. The directive marks a **boundary**: that file and everything it imports join the browser bundle.

| | Server Component (default) | Client Component (`'use client'`) |
|---|---|---|
| `async`/`await`, DB, secrets | yes | no |
| `useState`, `useEffect`, `onClick`, `window` | no | yes |
| JS sent to the browser | none for itself | yes |

```tsx
// app/posts/[slug]/like-button.tsx
'use client'
import { useState } from 'react'

export function LikeButton({ initial }: { initial: number }) {
  const [likes, setLikes] = useState(initial)
  return <button onClick={() => setLikes(likes + 1)}>Like ({likes})</button>
}
```

```tsx
// used inside a Server Component page
<LikeButton initial={post.likes} />
```

**What happens, step by step:**
1. The page (server) reads `post.likes` from the database and renders `<LikeButton initial={12} />`.
2. The server sends HTML for the button plus the number 12 in the payload. The button's JavaScript goes to the browser.
3. React hydrates the button, so clicks now update `likes` in the browser. The page around it stays server-only.

Rules to remember: props that cross from server to client must be **serializable** (strings, numbers, plain objects, Dates, and so on; functions cannot cross, except Server Actions). A Client Component can render Server Components passed to it as `children`. Put `'use client'` on small interactive leaves, not on whole pages. Full theory: [SSR and Server Components](05-ssr-and-server-components.md).

**Common mistake:** adding `'use client'` to `layout.tsx` or `page.tsx` to silence an error about `useState`. The whole tree below becomes client code. Fix: move the interactive part into its own small file and mark only that file.

## 5. Fetching data in Server Components

A Server Component can be `async`, so you simply `await` data in it. No `useEffect`, no loading state variable, no API route in between.

```ts
// lib/posts.ts
import { cache } from 'react'
import { db } from '@/lib/db' // your database client; "@/" is the default import alias

// cache() makes repeated calls in ONE request run once (Server Components only)
export const getPost = cache(async (slug: string) => {
  return db.post.findUnique({ where: { slug } })
})
```

```tsx
// app/posts/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { getPost } from '@/lib/posts'

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  )
}
```

**What happens, step by step:** (I ran this page logic with `params` as a resolved Promise and a fake `getPost`.)
1. Next calls `PostPage` with `params` as a Promise. An async component returns a Promise too (`true` in my test), and React waits for it.
2. `await params` gives `{ slug: 'hello' }`. `getPost('hello')` returns the post, and the page renders `<h1>Hello</h1>`.
3. For an unknown slug `getPost` returns `null`, so `notFound()` stops the render and Next shows `not-found.tsx` with a 404 status.

More rules:
- To call an external API, use `fetch`: `const res = await fetch('https://api.example.com/posts'); const posts = await res.json()`. Since Next 15 it is **not cached** unless you opt in (section 8).
- `cookies()` and `headers()` (from `next/headers`) are async too: `const store = await cookies()`. Using them makes the route dynamic.
- Independent requests should start together, otherwise they form a **waterfall** (one waits for the other): `const [user, posts] = await Promise.all([getUser(id), getPosts(id)])`.
- Client Components cannot be `async`. If they need server data, fetch it in a parent Server Component and pass it as props. For client-side fetching tools see [Data fetching](../03-intermediate/02-data-fetching.md).

**Common mistake:** loading server data from a Client Component with an effect.

```tsx
'use client' // Wrong here: extra round trip, loading flicker, no server HTML for crawlers
export function Posts() {
  const [posts, setPosts] = useState<Post[]>([])
  useEffect(() => { fetch('/api/posts').then((r) => r.json()).then(setPosts) }, [])
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
}

// Fixed: a Server Component, no directive, no effect
export default async function Posts() {
  const posts = await getPosts()
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
}
```

## 6. Loading, streaming and errors

**Streaming** means the server sends the page in pieces. Fast parts appear at once, slow parts show a placeholder and arrive later. It is built on React `Suspense` (see [Concurrent React and Suspense](03-concurrent-react-and-suspense.md)).

```tsx
// app/posts/loading.tsx: wraps the page of this segment in Suspense automatically
export default function Loading() {
  return <p>Loading posts...</p>
}
```

```tsx
// app/posts/error.tsx: must be a Client Component
'use client'

export default function PostsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert">
      <p>Could not load posts.</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

```tsx
// inside app/posts/[slug]/page.tsx: stream only the slow part
import { Suspense } from 'react'

<article>...</article>
<Suspense fallback={<p>Loading comments...</p>}>
  <Comments slug={slug} /> {/* an async Server Component */}
</Suspense>
```

**What happens, step by step:**
1. Navigating to `/posts` shows `loading.tsx` immediately, in the same layout. Data is still loading on the server.
2. When the data is ready, the page replaces the loading UI without a full reload.
3. On the post page the article is sent first. `Comments` is slow, so its placeholder shows and the real comments stream in later.
4. If `getPosts()` throws, `error.tsx` shows for that segment only. `reset()` only clears the error state so the segment renders again (Next 16.3 also has `retry()`, which refetches the data and re-renders the children).

`error.tsx` catches errors in the page and in layouts below it, but not in the `layout.tsx` of its own segment. That error goes to the parent boundary. `global-error.tsx` replaces the root layout, so it must render its own `<html>` and `<body>`. In production, server error messages are hidden from the browser; match them to logs with `error.digest`.

**Common mistake:** `error.tsx` without `'use client'`. Error boundaries need client features, so the file must start with `'use client'`.

## 7. Static vs dynamic rendering, generateStaticParams, ISR and runtimes

- **Static rendering (SSG):** HTML is built once at `next build` and served like a file. Fastest.
- **Dynamic rendering (SSR):** HTML is built on every request. Needed when the page depends on the request: `cookies()`, `headers()`, `searchParams`, or data that must be fresh.
- **ISR (incremental static regeneration):** a static page that Next rebuilds in the background after a time or on demand.

Next chooses for you. A route is prerendered at build time unless it reads request-time data. With Cache Components (section 8) the idea is sharper: Next prerenders everything it can into a **static shell**, and parts that need request data sit under `<Suspense>` and stream in per request (this is **Partial Prerendering**, now the default behaviour of that flag).

For dynamic segments, `generateStaticParams` tells Next which pages to build ahead of time:

```tsx
// app/posts/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}
```

**What happens, step by step:**
1. At `next build`, Next calls `generateStaticParams`, gets `[{ slug: 'a' }, { slug: 'b' }]`, and renders `/posts/a` and `/posts/b` to static HTML.
2. A request for `/posts/a` is served from that prebuilt output, with no server rendering.
3. A slug that was not listed is rendered on its first request. In the previous caching model, `export const dynamicParams = false` makes unlisted slugs return 404 instead.

ISR in the previous model is one line, `export const revalidate = 60` (serve the saved page, rebuild in the background at most once per 60 seconds). With Cache Components you use `"use cache"` and `cacheLife` instead (next section).

**Runtimes.** The default **Node.js runtime** has all Node APIs and works with most database drivers. The **Edge runtime** (`export const runtime = 'edge'` on a route) is a small Web-API-only environment that starts fast and can run close to users, but many Node libraries do not work in it. Cache Components requires Node and rejects the `runtime` setting. `proxy.ts` runs on Node. Choose Node unless you have a clear reason for Edge.

**Common mistake:** reading `cookies()` in the root layout "to get the user". Every page under that layout now needs request data, so it is rendered per request. Read cookies only in the components that need them, under `Suspense`.

## 8. Caching and revalidation, the confusing part

**Caching** saves a result so you do not compute it again. **Revalidation** refreshes or throws away a saved result. Two models exist today, so know both.

**Model A, the previous model (no `cacheComponents`).** Since Next 15 nothing is cached by default. You opt in per request:

```ts
// cached until you revalidate
await fetch('https://api.example.com/posts', { cache: 'force-cache' })
// refreshed at most every 60 s, and tagged so you can refresh it on demand
await fetch('https://api.example.com/posts', { next: { revalidate: 60, tags: ['posts'] } })
```

For non-`fetch` work such as database calls, use `unstable_cache(fn, keyParts, { tags, revalidate })`.

**Model B, Cache Components (Next 16).** Everything is **dynamic by default**, and you opt in to caching with the `"use cache"` directive. Next 16.4 recommends it for every app, new `create-next-app` projects have it on, and it becomes the default in Next 17.

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = { cacheComponents: true }
export default nextConfig
```

(The docs also ask for `partialPrefetching: true`; if it is unset Next logs a warning.)

```ts
// lib/posts.ts
import { cacheLife, cacheTag } from 'next/cache'

export async function getPosts() {
  'use cache'
  cacheLife('hours')
  cacheTag('posts')
  return db.post.findMany({ orderBy: { createdAt: 'desc' } })
}
```

**What happens, step by step:**
1. `'use cache'` marks the function as cached. It must be `async`. The cache key comes from the function, its serializable arguments and any outer variables it uses.
2. The first call runs the query and stores the result. Later calls return the stored result.
3. `cacheLife('hours')` picks a lifetime profile. For `hours`: the browser may keep it 5 minutes, the server revalidates after 1 hour, and it expires after 1 day. Other presets: `seconds`, `minutes`, `days`, `weeks`, `max`. With no `cacheLife` the `default` profile (5 min, 15 min, never expires) applies.
4. `cacheTag('posts')` gives the entry a name so a mutation can refresh it.
5. Runtime data (`cookies()`, `headers()`, `searchParams`) cannot be read inside a cached scope. Read it outside and pass the values as arguments. Uncached or request-time parts must sit under `<Suspense>`, otherwise dev shows a "blocking route" warning and the build can fail.

**Refreshing after a change:**

| Function | Where | What it does |
|---|---|---|
| `revalidateTag('posts', 'max')` | Server Actions, Route Handlers | Marks the tag stale. Visitors keep getting the old copy while a new one builds in the background (stale-while-revalidate). The one-argument form is deprecated. |
| `updateTag('posts')` | Server Actions only | Expires the tag immediately, so the same request sees fresh data (read-your-own-writes). |
| `refresh()` | Server Actions only | Refreshes only **uncached** data on the page. It does not touch the cache. On the client use `router.refresh()`. |

The older `revalidatePath('/posts')` invalidates by URL instead of by tag. Neither tag function can be called from a Client Component or from `proxy.ts`.

**Common mistake:** believing "Next caches `fetch` by default". That was Next 13/14. In 15 and 16 you must opt in. The mirror mistake is calling `revalidateTag('posts')` with one argument in Next 16: pass `'max'` for stale-while-revalidate, or use `updateTag` after a user's own write.

## 9. Server Actions and forms

A **Server Action** (also called a Server Function) is an async function marked `'use server'` that runs on the server but can be called from a form or a handler in the browser. Under the hood the browser sends a POST request. This means **a Server Action is a public endpoint**: anyone can call it directly.

```ts
// app/posts/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { updateTag } from 'next/cache'
import { auth } from '@/lib/auth'
import { createPostInDb } from '@/lib/posts'

export type FormState = { error: string }

export async function createPost(prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await auth() // 1. who is calling?
  if (!session) return { error: 'You must be signed in' }

  const title = String(formData.get('title') ?? '').trim() // 2. never trust input
  const body = String(formData.get('body') ?? '').trim()
  if (title.length < 3) return { error: 'Title must be at least 3 characters' }

  const post = await createPostInDb({ title, body, authorId: session.userId })
  updateTag('posts') // 3. refresh cached lists
  redirect(`/posts/${post.slug}`) // 4. outside try/catch
}
```

```tsx
// app/posts/new/new-post-form.tsx
'use client'
import { useActionState } from 'react'
import { createPost, type FormState } from '../actions'

const initialState: FormState = { error: '' }

export function NewPostForm() {
  const [state, formAction, pending] = useActionState(createPost, initialState)
  return (
    <form action={formAction}>
      <label>Title <input name="title" required /></label>
      <label>Body <textarea name="body" /></label>
      <button disabled={pending}>{pending ? 'Saving...' : 'Save'}</button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  )
}
```

**What happens, step by step:** (I ran the same form and validator with a local action in Vitest.)
1. The user types "ab" and presses Save. React calls `formAction`, which sends the form data to `createPost` together with the previous state.
2. While the action runs, `pending` is `true`: the button is disabled and shows "Saving..." (observed: `Saving... true`).
3. The validator fails: the action returns `{ error: 'Title must be at least 3 characters' }`. The alert shows and the button is enabled again (observed: `Save false`).
4. With a valid title, the action saves, calls `updateTag('posts')` so cached lists refresh in the same request, and `redirect` sends the user to the new post.
5. If JavaScript has not loaded yet, a form that posts to a Server Action still works (progressive enhancement).

Security checklist (details in [Security and i18n](10-security-and-i18n.md)):
- Check authentication **and** permission inside every action, and validate all input on the server. In December 2025 a critical remote code execution bug (CVE-2025-55182) hit the Server Components protocol. Keep Next.js and React patched.
- Next compares the `Origin` and `Host` headers as CSRF protection. Behind a reverse proxy, set `serverActions.allowedOrigins`. The default body limit is 1 MB.
- The client sends actions one after another, so use actions for **writes**, not for reading data.
- For a form that only navigates (a search box), use `<Form>` from `next/form` instead.

**Common mistake:** a Server Action with no permission check.

```ts
// Wrong: anyone who can send a POST can delete any post
export async function deletePost(id: string) { await db.post.delete({ where: { id } }) }

// Fixed: check the caller, then refresh the cache
export async function deletePost(id: string) {
  const session = await auth()
  if (!session?.isAdmin) throw new Error('Forbidden')
  await db.post.delete({ where: { id } })
  updateTag('posts')
}
```

## 10. Route Handlers and proxy.ts

A **Route Handler** is an API endpoint: a `route.ts` file that exports functions named after HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`). They use the standard Web `Request` and `Response`. Use them for things other than your own UI: a public API, webhooks, a mobile app, file downloads. For writes from your own forms, a Server Action is simpler.

```ts
// app/api/posts/route.ts
import { getPosts, createPostInDb } from '@/lib/posts'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit') ?? 10)
  const posts = await getPosts()
  return Response.json(posts.slice(0, limit))
}

export async function POST(request: Request) {
  // check the session here too: a route handler is also public
  const body = await request.json()
  if (!body.title) {
    return Response.json({ error: 'title is required' }, { status: 400 })
  }
  const created = await createPostInDb(body)
  return Response.json(created, { status: 201 })
}
```

For a dynamic route such as `app/api/posts/[id]/route.ts`, the second argument carries `params` as a Promise: `{ params }: { params: Promise<{ id: string }> }`, then `const { id } = await params`.

**What happens, step by step:** (I ran this logic with plain `Request` objects.)
1. `GET /api/posts?limit=2` reads `limit` from the URL and returns the first two posts. Observed: status 200, content type `application/json`, body `[{"id":1},{"id":2}]`.
2. `POST` with an empty body object returns status 400 and `{"error":"title required"}`.
3. `POST` with a title returns status 201 and the created item.
4. `GET` handlers are not cached by default since Next 15. Other methods are never cached.

**`proxy.ts`** (called `middleware.ts` before Next 16) is code that runs **before a request reaches your routes**. It sits in the project root (or in `src/`, next to `app/`).

```ts
// proxy.ts
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (!request.cookies.has('session')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'],
}
```

How it works and what to remember:
- For requests matching `matcher` it runs first and can redirect, rewrite, set headers or cookies. Good uses: quick redirects, locale routing, A/B rewrites, and an **optimistic** "no session cookie, go to login" check.
- Without a `matcher` it runs on every request, including `_next/static` and images. Always set one.
- It runs on the Node.js runtime and the `runtime` option throws if set. The old `middleware.ts` is deprecated and kept only for Edge needs. Codemod: `npx @next/codemod@canary middleware-to-proxy .`.
- It is not for slow data fetching and is **not a full authorization layer**. A Server Action is a POST to the page where it is used, so a matcher that skips that path also skips the check. Authenticate again inside each page, action and handler.
- It is not supported with static export.

**Common mistake:** `export function middleware(...)` in a file named `middleware.ts` in a Next 16 tutorial. Rename to `proxy.ts` and export `proxy` (or a default export).

## 11. Metadata, images, fonts, scripts and environment variables

**Metadata and SEO.** Export a `metadata` object for fixed values, or an async `generateMetadata` when the title depends on data. Both work only in Server Components.

```tsx
// app/posts/[slug]/page.tsx
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Post not found' }
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: 'article' },
  }
}
```

Next puts these tags in the `<head>` of the server-sent HTML, so crawlers and link previews see them without running JavaScript. File conventions cover the rest: `opengraph-image`, `sitemap.ts`, `robots.ts` and icons. SEO checklist: unique title and description per page, real HTML content from the server, `sitemap.ts` and `robots.ts`, correct status codes (`notFound()` gives 404), and good Web Vitals.

**`next/image`** resizes images, serves modern formats, lazy-loads by default and reserves space so the layout does not jump. `preload` is for the main above-the-fold image (it replaced the deprecated `priority` prop in Next 16). Remote hosts must be allowed in config (`domains` is deprecated, use `remotePatterns`).

```tsx
import Image from 'next/image'

<Image src="/hero.jpg" alt="A laptop on a desk" width={1200} height={600} preload />
```

```ts
// next.config.ts (inside the config object)
images: { remotePatterns: [{ protocol: 'https', hostname: 'images.example.com' }] },
```

**`next/font`** downloads a font at build time and serves it from your own domain: no request to Google at runtime and no layout shift.

```tsx
import { Inter } from 'next/font/google' // or 'next/font/local' for your own files

const inter = Inter({ subsets: ['latin'] })
// in the root layout: <body className={inter.className}>
```

**`next/script`** loads third-party scripts without blocking the page. `strategy="afterInteractive"` is the default. `lazyOnload` waits until the browser is idle.

```tsx
import Script from 'next/script'

<Script src="https://example.com/analytics.js" strategy="lazyOnload" />
```

**Environment variables.** Put them in `.env.local` in the project root (not in `src/`), and never commit it.

```text
DATABASE_URL=postgres://user:pass@localhost/blog
NEXT_PUBLIC_SITE_NAME=My Blog
```

- A variable **without** a prefix is server-only. Read in browser code, it is `undefined`.
- A variable that starts with `NEXT_PUBLIC_` is copied into the browser bundle **at build time** and then frozen. Changing it later needs a rebuild, and dynamic reads like `process.env[name]` are not inlined. To read a value at request time, do it on the server after `await connection()` (from `next/server`).
- Never put secrets in `NEXT_PUBLIC_` variables. Everyone can read them.

**Common mistake:** `NEXT_PUBLIC_STRIPE_SECRET_KEY=...`. The prefix publishes the key to every visitor. Remove the prefix and read the key only in server code.

## 12. Build, deploy and choose your stack

**Turbopack** is the default bundler for `next dev` and `next build` in Next 16 (opt out with `--webpack`). It is much faster than webpack. Do not write `--turbo`, that is Next 14/15 advice. The React Compiler is stable but opt-in (`reactCompiler: true`). `next lint` is gone: run ESLint yourself.

```bash
npm run dev      # next dev
npm run build    # next build
npm run start    # next start (production Node server)
```

| Deploy option | How | Good for | Limits |
|---|---|---|---|
| Vercel | connect a Git repo | easiest, all features work | cost, platform tie-in |
| Self-host with Node | `next build`, then `next start` (Node 20.9+) | any VM or container host | you run scaling, CDN and cache sharing |
| Docker | set `output: 'standalone'`, copy `.next/standalone`, `.next/static` and `public` into the image, run `node server.js` | Kubernetes, Cloud Run, ECS | check how your platform shares the cache between instances |
| Static export | set `output: 'export'`, upload the `out/` folder | S3, GitHub Pages, any static host | no server features: no Server Actions, no per-request rendering, no proxy; the built-in image optimizer is unavailable |
| Other platforms | Build Adapters API (stable in 16.2) | Netlify, Cloudflare and similar through adapters | depends on the adapter |

**Which tool for which job?**

| | Vite SPA (+ React Router) | React Router framework mode | Next.js |
|---|---|---|---|
| First load and SEO for public pages | weak: browser renders everything | good: SSR or prerender | good: SSR, SSG, ISR, streaming |
| Server code in the same repo | no, build a separate API | loaders and actions | Server Components, Actions, Route Handlers |
| Server Components | no | experimental in v8 | yes, the core model |
| Hosting | any static host | Node server or static prerender | Vercel, Node, Docker, static export |
| Learning curve and churn | lowest | medium, close to web standards | highest, many conventions that changed between versions |
| Good fit | dashboards behind login, internal tools, widgets | apps that want SSR with plain web standards | content sites, shops, big products with many teams |

See [React Router](../03-intermediate/03-react-router.md) for framework mode. The React docs advise starting new projects with a framework or a build tool such as Vite; a login-only admin panel rarely needs the server features of Next.js.

## 13. A small app outline: blog with list, post page and form

```text
app/
  layout.tsx                 root layout, nav, fonts
  page.tsx                   home
  posts/
    page.tsx                 list of posts (async Server Component)
    loading.tsx              list loading UI
    actions.ts               'use server': createPost
    new/
      page.tsx               renders <NewPostForm />
      new-post-form.tsx      'use client': useActionState form
    [slug]/
      page.tsx               one post, generateStaticParams, generateMetadata
      like-button.tsx        'use client' leaf
lib/
  posts.ts                   getPosts ('use cache' + cacheTag), getPost
```

```tsx
// app/posts/page.tsx
import Link from 'next/link'
import { getPosts } from '@/lib/posts'

export default async function PostsPage() {
  const posts = await getPosts() // cached with the 'posts' tag
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>
          <Link href={`/posts/${post.slug}`}>{post.title}</Link>
        </li>
      ))}
    </ul>
  )
}
```

**What happens, step by step:**
1. Visiting `/posts` renders `PostsPage` on the server. `getPosts()` returns the cached list (first call hits the database).
2. Clicking a title navigates to `/posts/[slug]`. The page from section 5 renders, with metadata from section 11 and `LikeButton` as the only client JavaScript.
3. On `/posts/new`, submitting the form runs `createPost` (section 9). It validates, saves, calls `updateTag('posts')`, and redirects.
4. Back on `/posts` the new post is listed, because the tag was expired in the same request.

## How interviewers test this
- They check the mental model: Server Components by default, `'use client'` as a small boundary, data fetched on the server. Red flag: "Next.js is just React with routing".
- They ask about caching to see if you are current. Strong answers say fetch is not cached by default since 15 and describe `"use cache"`, `cacheLife`, `cacheTag` and the three refresh functions. Red flag: "Next caches fetch by default".
- They probe rendering choices: when static, when dynamic, what `generateStaticParams` and ISR do, and why `cookies()` makes a route dynamic.
- They test security thinking: Server Actions and Route Handlers are public, proxy is not full auth, `NEXT_PUBLIC_` is public.
- They look for version awareness: async `params`, `proxy.ts`, Turbopack default. Say which version you mean.
- They sometimes ask for a decision: when not to use Next.js (a login-only dashboard, a tiny widget) is as important as when to use it.

## Interview questions and model answers

### Q1. What is Next.js and why would you use it? (Easy)
Next.js is a React framework. React only draws UI. Next.js adds file-based routing, server rendering (SSR, static generation, ISR, streaming), Server Components, Server Actions, Route Handlers for APIs, a fast bundler (Turbopack), and built-ins for images, fonts, metadata and scripts. You use it when you want good first-load speed and SEO, server code next to UI code, and a production-ready setup without wiring tools yourself.

### Q2. What is the difference between SSR, SSG and ISR in Next.js? (Easy)
SSG builds HTML once at `next build` and serves it as a file (use `generateStaticParams` for dynamic routes). SSR builds HTML on every request, which is needed when the page uses request data such as cookies or must always be fresh. ISR is SSG that refreshes in the background after a time or on demand (`revalidate = 60` in the previous model, `"use cache"` with `cacheLife` plus tags in Cache Components). In the App Router you do not pick one globally: Next decides per route from what the code reads. With Cache Components a page can be both: a static shell with dynamic parts streamed in (Partial Prerendering).

### Q3. App Router vs Pages Router? (Easy)
The App Router (`app/`) is the default for new projects. It uses nested layouts, Server Components by default, `loading`/`error` files, Server Actions and Route Handlers. The Pages Router (`pages/`) uses one component per file and the `getStaticProps`, `getServerSideProps` and `getStaticPaths` functions, plus API Routes. It is still supported and common in old code, but new features target the App Router. Both can coexist during a migration. Import `useRouter` from `next/navigation` in `app/` and from `next/router` in `pages/`.

### Q4. Server Components vs Client Components in Next.js? (Medium)
Every component in `app/` is a Server Component unless its file starts with `'use client'`. Server Components run only on the server, can be async, can reach the database and secrets, and ship no JavaScript. Client Components can use state, effects, events and browser APIs, and they are hydrated in the browser. The directive marks a boundary: everything the file imports becomes client code. Keep the boundary at small interactive leaves, pass server data down as serializable props, and pass Server Components into Client Components as `children`.

### Q5. How does caching work in Next.js today? (Hard)
Since Next 15 nothing is cached by default: not `fetch`, not `GET` Route Handlers, and the browser keeps page segments with a stale time of 0. In the previous model you opt in with `fetch` options (`cache: 'force-cache'`, `next: { revalidate, tags }`), `unstable_cache` and `export const revalidate`. In Next 16 you can turn on Cache Components (`cacheComponents: true`): code is dynamic by default and you opt in with `"use cache"`, set a lifetime with `cacheLife` and a name with `cacheTag`. Static parts become a prerendered shell and dynamic parts stream under `Suspense`. To refresh, use `revalidateTag(tag, 'max')` (stale-while-revalidate), `updateTag(tag)` in a Server Action (read-your-own-writes), or `refresh()` (uncached data only). The 16.4 post says Cache Components becomes the default in Next 17.

### Q6. How do you fetch data in the App Router? (Easy)
In a Server Component, make it `async` and `await` the data: a `fetch` call, an ORM query or any server code. No effect is needed. Read `params` and `searchParams` with `await` because they are Promises in Next 15 and 16. Start independent requests together with `Promise.all` to avoid waterfalls, wrap slow parts in `Suspense` or add `loading.tsx` so the page streams, and use React `cache()` to share a call between a layout and a page. In Client Components, fetch with a library such as TanStack Query, or pass data down from a Server Component.

### Q7. What is middleware, and what is `proxy.ts`? (Medium)
It is code that runs before a request reaches your routes, for requests that match a `matcher`. It can redirect, rewrite, and set headers or cookies, so it suits locale routing, A/B rewrites and an optimistic "no session, go to login" check. In Next 16 the file is `proxy.ts` and exports `proxy`; it runs on the Node.js runtime. `middleware.ts` is deprecated and kept for Edge-only needs. It is not a full auth layer and not for slow data work, so you still authorize in pages, actions and handlers.

### Q8. What is a Route Handler, and Route Handler vs Server Action? (Medium)
A Route Handler is a `route.ts` file exporting functions named after HTTP methods, built on the Web `Request` and `Response`. Use it for public APIs, webhooks, mobile clients or file responses. A Server Action is a function called from your own UI (usually a form) for a write, with built-in form handling, revalidation and progressive enhancement. Both are public endpoints, so both need authentication, authorization and input validation. `GET` handlers are not cached by default.

### Q9. How do you handle SEO in Next.js? (Medium)
Pages are rendered on the server, so crawlers get real HTML. Use the metadata API: a `metadata` object or `generateMetadata` for titles, descriptions, Open Graph and canonical data, plus `sitemap.ts`, `robots.ts` and `opengraph-image` files. Use semantic HTML, `next/image` and `next/font` for good Web Vitals, return proper status codes with `notFound()`, and prefer static or cached rendering for public pages.

### Q10. How do you deploy a Next.js app? (Medium)
Easiest is Vercel from a Git repo. To self-host, run `next build` then `next start` on a Node server (Node 20.9 or newer), or build a Docker image from `output: 'standalone'`. A static export (`output: 'export'`) gives plain files for any static host but loses server features. Other platforms use the Build Adapters API. In every case set environment variables correctly (`NEXT_PUBLIC_` values are fixed at build time) and check how the cache is shared between instances.

### Q11. Why are `params`, `cookies()` and `headers()` Promises now? (Medium)
Request data is only known when a request arrives. Making it async lets Next prerender the parts that do not depend on it first and wait for the rest. Next 15 introduced async versions (sync reads still worked with a warning). Next 16 removed sync reads. Server pages `await` them. Client Component pages can read a `params` Promise with React `use()`.

## Common mistakes and gotchas
- Reading `params.slug` directly: `await params` and type it as a Promise.
- Assuming `fetch` is cached by default: it is not since Next 15. Opt in with `"use cache"` or `fetch` options.
- `'use client'` on layouts or pages: extract a small interactive component instead.
- `useRouter` from `next/router` in `app/`: import from `next/navigation`.
- `useSearchParams` without `Suspense`: wrap it so the page is not forced to client-render.
- `error.tsx` without `'use client'`: add the directive.
- Server Action or Route Handler without an auth check or validation: check the caller and the input inside every one.
- `redirect()` inside `try/catch`: call it outside, because it works by throwing.
- Secrets in `NEXT_PUBLIC_` variables: remove the prefix and read them on the server only.
- `middleware.ts` and `--turbo` advice in Next 16: use `proxy.ts`, and Turbopack is already the default.
- Reading `cookies()` high in the tree: every route below becomes dynamic. Read it where needed, under `Suspense`.
- Using Next.js for a login-only admin panel by habit: a Vite SPA may be enough.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** This tree is given: `app/page.tsx`, `app/about/page.tsx`, `app/(shop)/cart/page.tsx`, `app/blog/[slug]/page.tsx`, `app/blog/[slug]/helpers.ts`, `app/docs/[...parts]/page.tsx`, `app/api/ping/route.ts`. Which URLs exist, and which file creates no route? Does `/docs` match?

<details>
<summary>Show answer</summary>

URLs: `/`, `/about`, `/cart` (the `(shop)` group name is not in the URL), `/blog/anything`, `/docs/a`, `/docs/a/b` and so on, and `/api/ping` (a GET endpoint from `route.ts`). `helpers.ts` creates no route because only special names such as `page` and `route` do. `/docs` does not match a catch-all `[...parts]`. Renaming the folder to `[[...parts]]` (optional catch-all) would match it.

</details>

2. **(Easy)** A tutorial shows `export default function Page({ params }) { return <h1>{params.slug}</h1> }`. What goes wrong in Next 16, and how do you fix it in TypeScript?

<details>
<summary>Show answer</summary>

`params` is a Promise, so `params.slug` is `undefined` (in my test, destructuring a Promise gave `undefined`). Sync access was removed in Next 16. Fix: make the component `async`, type the prop as `Promise<{ slug: string }>`, and `const { slug } = await params`. A Client Component page can use React `use(params)` instead.

</details>

3. **(Medium)** Write `app/posts/[slug]/page.tsx` with: an async page that shows the post title and body, a 404 for unknown slugs, and a `generateMetadata` that sets the title from the post. Assume `getPost(slug)` returns `{ title, body, excerpt } | null`.

<details>
<summary>Show answer</summary>

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPost } from '@/lib/posts'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  return post ? { title: post.title, description: post.excerpt } : { title: 'Post not found' }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  )
}
```

If `getPost` is wrapped in React `cache()`, the two calls share one database query per request.

</details>

4. **(Medium)** Decide for each: server or client component? (a) a product list read from a database, (b) a search box that filters the list as you type, (c) a "copy link" button using `navigator.clipboard`, (d) a footer with static text. Where does `'use client'` go?

<details>
<summary>Show answer</summary>

(a) Server: it only reads data. (b) Client: it needs state and `onChange`. Put it in its own small file with `'use client'`, and let the server page pass the list in as props, or keep the filter in the URL with `useSearchParams`. (c) Client: browser API and an event handler. (d) Server: no interactivity. The directive goes only on the files for (b) and (c), never on the page or layout that contains them.

</details>

5. **(Medium)** Write a Server Action `addComment(prevState, formData)` that requires a signed-in user, rejects comments shorter than 2 characters by returning `{ error }`, saves with `saveComment(postId, userId, text)`, and refreshes the cached tag `comments`. Then write the form component that shows the error and a pending label.

<details>
<summary>Show answer</summary>

```ts
// app/posts/[slug]/comment-actions.ts
'use server'
import { updateTag } from 'next/cache'
import { auth } from '@/lib/auth'
import { saveComment } from '@/lib/comments'

export type CommentState = { error: string }

export async function addComment(prev: CommentState, formData: FormData): Promise<CommentState> {
  const session = await auth()
  if (!session) return { error: 'Sign in to comment' }
  const text = String(formData.get('text') ?? '').trim()
  const postId = String(formData.get('postId') ?? '')
  if (text.length < 2) return { error: 'Comment is too short' }
  await saveComment(postId, session.userId, text)
  updateTag('comments')
  return { error: '' }
}
```

```tsx
'use client'
import { useActionState } from 'react'
import { addComment, type CommentState } from './comment-actions'

const initial: CommentState = { error: '' }

export function CommentForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState(addComment, initial)
  return (
    <form action={action}>
      <input type="hidden" name="postId" value={postId} />
      <textarea name="text" aria-label="Comment" />
      <button disabled={pending}>{pending ? 'Posting...' : 'Post comment'}</button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  )
}
```

The auth check and the validation live inside the action because it is a public endpoint. Never trust the hidden `postId` either: check on the server that the user may comment on that post.

</details>

6. **(Medium)** Write a `proxy.ts` that redirects requests to `/account` and everything below it to `/login` when there is no `session` cookie, and does nothing for other URLs. Then say why you still check the session inside the account page.

<details>
<summary>Show answer</summary>

```ts
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (!request.cookies.has('session')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/account', '/account/:path*'] }
```

The proxy only does an optimistic check: the cookie may be expired or forged. It is also easy to bypass by accident (a matcher that skips a path skips the check, and Server Actions are POSTs to the page where they are used). The real check, which verifies the session and the user's permissions, belongs in the page, the actions and the data layer.

</details>

7. **(Hard)** With Cache Components on, `getPosts()` uses `'use cache'`, `cacheLife('hours')` and `cacheTag('posts')`. A user submits a form whose Server Action creates a post. What does the user see after the action if it calls (a) nothing, (b) `revalidateTag('posts', 'max')`, (c) `updateTag('posts')`?

<details>
<summary>Show answer</summary>

(a) Nothing refreshes the cache, so the list can stay stale until the `hours` lifetime ends: the new post may be missing. (b) The tag is marked stale. The next visit still gets the old list once while a new one is built in the background, so the author may not see their own post immediately. Good for content where slight staleness is fine. (c) The entry expires immediately and the same request gets fresh data, so the author sees the new post (read-your-own-writes). Use `updateTag` after a user's own write. `refresh()` would not help here, because it only refreshes uncached data and does not touch the cache.

</details>

8. **(Hard)** Pick Vite SPA, React Router framework mode or Next.js, with one reason each, for: (1) an internal admin dashboard behind login, (2) a marketing site with a blog that must rank in search, (3) an online store with 50,000 product pages that change a few times a day. Name the rendering strategy for (3).

<details>
<summary>Show answer</summary>

(1) Vite SPA: no SEO need, simple static hosting, no server framework to maintain. (2) Next.js (React Router framework mode with prerendering is also valid): public content needs real HTML, so use static generation with metadata, sitemap and images. (3) Next.js: use `generateStaticParams` for the most visited products, cached rendering with `"use cache"`, `cacheLife` and a tag per product (or `revalidate` in the previous model) for the rest, plus tag invalidation when a price changes. Build only some pages ahead, render the others on demand, and keep the cart and user parts dynamic under `Suspense`. The answer should show you trade off needs, not that you always pick Next.js.

</details>

## Recap
- Next.js is a React framework: file routing, server rendering, Server Components and Actions, Route Handlers, Turbopack and built-in image, font and metadata tools.
- App Router (`app/`) is the default; Pages Router is legacy you will meet in old code. Folders are URLs; `page`, `layout`, `loading`, `error` and `not-found` are the special files.
- Components are Server Components by default. Add `'use client'` only on small interactive leaves; props crossing the boundary must be serializable.
- Fetch by making Server Components `async`. `params`, `searchParams`, `cookies()` and `headers()` are Promises (async since 15, sync removed in 16).
- Nothing is cached by default since Next 15. Cache Components adds `"use cache"`, `cacheLife` and `cacheTag`. Refresh with `revalidateTag(tag, 'max')`, `updateTag` (Server Actions, read-your-writes) or `refresh()` (uncached data).
- Server Actions and Route Handlers are public endpoints: authenticate, authorize and validate in each. `proxy.ts` (formerly `middleware.ts`) is for redirects and optimistic checks, not full auth.
- Rendering: static at build, dynamic per request, ISR in the background; `generateStaticParams` builds dynamic pages ahead; Node runtime by default.
- `NEXT_PUBLIC_` variables are public and fixed at build time. Deploy on Vercel, Node, Docker or static export, and choose Next.js only when you need its server features.

## Where to go next
- Theory behind this lesson: [SSR and Server Components](05-ssr-and-server-components.md). The new React APIs used by forms: [React 19 and newer](04-react-19-and-newer.md).
- Compare with the router-library world: [React Router](../03-intermediate/03-react-router.md). Related: [Data fetching](../03-intermediate/02-data-fetching.md), [Forms with libraries](../03-intermediate/04-forms-with-libraries.md).
- Security of Server Actions and cookies: [Security and i18n](10-security-and-i18n.md). Architecture choices: [Frontend system design](11-frontend-system-design.md).
- Next lesson: Advanced patterns (planned). Practise with the interview rounds in [Interview rounds overview](../05-interview-rounds/README.md).
