# Frontend System Design

> **Level:** Advanced   **Time:** about 90 minutes   **Read first:** [State management](../03-intermediate/06-state-management.md), [Performance optimisation](./02-performance-optimization.md), [SSR and Server Components](./05-ssr-and-server-components.md)

## What you will learn
- Run a frontend system design interview with a repeatable framework (RADIO) and ask the right requirement questions.
- Choose between rendering strategies, state locations, cache layers and real-time transports, and defend the trade-off.
- Compare pagination, infinite scroll and virtualization, optimistic UI, offline support, monorepos and micro-frontends honestly.
- Plan performance budgets, observability, accessibility, i18n, security and safe delivery for a large React app.
- Design three features end to end: an autocomplete, a news feed with infinite scroll, and a streaming chat UI.

## 1. What the interview is
A frontend system design interview is a 45 to 60 minute conversation with a whiteboard (or a drawing tool). You do **not** build the whole app. You show how you would structure it: what the pieces are, where data lives, how the browser talks to the server, and what can go wrong.

It differs from backend design. You care about the browser (slow phones, bad networks, many tabs), the user (loading states, keyboard, screen readers) and the team (many people shipping one app).

The interviewer checks four things: you ask before you build, you structure the answer, you name trade-offs (not just one "best" choice), and you can change your mind when a new requirement arrives. Some companies add requirements halfway on purpose, to see whether you revise your choices.

## 2. The RADIO framework
RADIO is a checklist that keeps you from jumping into code. Say the letters out loud so the interviewer can follow.

| Step | The question you answer | What goes on the board |
|---|---|---|
| **R**equirements | What are we building, for whom, how well? | Functional list, non-functional list, out of scope |
| **A**rchitecture | What are the parts and how does data flow? | Component tree, boxes and arrows (client, API, cache, CDN) |
| **D**ata model | What state exists and where does it live? | State shape, entity types, which state is local, global, server or URL |
| **I**nterface (API) | How do the parts talk? | Endpoint list, request and response shape, component props |
| **O**ptimisations | What makes it fast, accessible, safe, observable? | Performance, a11y, i18n, security, monitoring, rollout |

A good first minute sounds like this:

```text
Before I draw anything, let me check scope. Who uses this and on which devices?
Which features are must-have, and which can wait? How many items, how many users?
Do we need SEO, offline support, several languages, accessibility targets?
```

**What happens, step by step:**
1. You spend the first 5 to 10 minutes on R and agree on a short list. The interviewer now owns the scope, not you.
2. You draw A and D together: the boxes, then the state inside them.
3. You write the API (I) as a few lines. This proves the UI and server fit together.
4. You keep the last quarter of the time for O and for "what would break at 10 times the traffic".

**Common mistake:** starting with `create-react-app`-style code or a library choice. Fix: finish R and A first. A library name without a reason scores nothing.

## 3. Requirements: functional and non-functional
**Functional** means what the user can do ("type, see suggestions, pick one"). **Non-functional** means how well it must work. Candidates forget the second group, and that is where seniors are judged.

| Ask about | Example question | What it changes |
|---|---|---|
| Scale | How many items in a list? How many users? | Pagination, virtualization, caching |
| Devices and network | Low-end phones? Slow 3G? | Bundle budget, offline, image strategy |
| SEO and first paint | Must a crawler see the content? | Rendering strategy |
| Freshness | Seconds, minutes or daily? | Cache times, polling vs push |
| Accessibility | Keyboard and screen reader needed? | Markup, focus, ARIA, testing |
| Languages | Several locales, right-to-left? | i18n, layout, text length |
| Security and privacy | Logged-in data? Third-party scripts? | Token storage, CSP, what the client may know |
| Team and release | How many teams? How often do we ship? | Monorepo, micro-frontends, feature flags |

Then write what is **out of scope** ("no editing, no offline for v1"). That protects your time.

## 4. Building block: rendering strategy
Rendering strategy means **where and when the HTML is produced**.

| Strategy | HTML is made... | Strengths | Costs | Fits |
|---|---|---|---|---|
| CSR (client-side rendering) | In the browser, after JS loads | Simple hosting, rich interactivity | Blank first paint, weak SEO without help | Logged-in dashboards, tools |
| SSR (server-side rendering) | On the server, per request | Fast first content, good SEO, personal data | Server cost, hydration work | Product pages, feeds with SEO |
| SSG (static site generation) | At build time | Fastest, cheapest, CDN friendly | Stale until rebuilt | Docs, marketing, blogs |
| ISR (incremental static regeneration) | Static, rebuilt in the background after a time or on demand | Static speed with fresher data | Framework needed, short staleness | Catalogues, news articles |
| RSC (React Server Components) | Components run only on the server | Less JS shipped, data next to the component | Needs a framework, a new mental model | Data-heavy pages with small interactive islands |

Choose with two questions: **how fresh and how personal is the data**, and **does first paint or SEO matter**. Public and rarely changing means SSG or ISR. Public and changing or personal means SSR or RSC. Private and highly interactive means CSR is often enough. Real apps mix them per route. See [SSR and Server Components](./05-ssr-and-server-components.md) and [Next.js essentials](./06-nextjs-essentials.md).

**What happens, step by step** (an online shop):
1. Home page and product pages: ISR. They are public, SEO matters, and a one-minute delay in price is fine.
2. Cart and checkout: CSR or SSR with no shared cache. Data is personal, so a CDN must never serve it to someone else.
3. Account dashboard: CSR. No SEO, heavy interaction.
4. Blog: SSG. It changes only when someone publishes.

**Common mistake:** "SSR is always better than CSR". Fix: SSR moves work to your server and still needs hydration (React attaching to the HTML). Say what you gain and what you pay.

## 5. Building block: state architecture
Put each piece of state in the **cheapest place that works**.

| Kind | Lives in | Tools | Example |
|---|---|---|---|
| Local UI state | One component | `useState`, `useReducer` | Is the dropdown open |
| Shared client state | A store or context | Context, Zustand, Redux Toolkit | Theme, cart, auth user |
| Server state (a cache of server data) | A query cache | TanStack Query, SWR | Product list, profile |
| URL state | The address bar | Router search params | Filters, page, sort, selected tab |
| Persisted state | Browser storage | localStorage, IndexedDB | Draft text, dark mode choice |

**What happens, step by step** (a product listing page):
1. Filters, sort and page number go in the **URL**. The page can be shared, bookmarked and reloaded, and the back button works.
2. The list of products is **server state**. The query cache fetches, caches and refreshes it.
3. "Is the filter panel open" is **local state**.
4. The cart is **global client state** (many pages read it) and may also be saved on the server.

**Common mistake and fix:**

```jsx
// Wrong: a second copy of server data that nobody keeps fresh
const [products, setProducts] = useState([]);
useEffect(() => { fetchProducts().then(setProducts); }, []);

// Better: the cache owns it (loading, errors, refetching, sharing between components)
const { data: products } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
```

More in [State management](../03-intermediate/06-state-management.md) and [Data fetching](../03-intermediate/02-data-fetching.md).

## 6. Building block: data fetching and caching layers
A request can be answered at several layers. The closer to the user, the faster.

```text
Component
  -> in-memory query cache   (TanStack Query / SWR, lives while the tab is open)
  -> browser HTTP cache      (Cache-Control, ETag)
  -> CDN edge cache          (shared by many users, only for public data)
  -> server cache -> database
```

**Stale-while-revalidate** means: show the cached copy now, then refresh it in the background. It works in the query cache and in HTTP:

```text
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

For 60 seconds the response is fresh. For the next 300 seconds a cache may serve the old copy while it fetches a new one.

```jsx
const { data } = useQuery({
  queryKey: ['products', { category, page }],
  queryFn: ({ signal }) => fetchProducts({ category, page, signal }),
  staleTime: 60_000,
});
```

**What happens, step by step:**
1. The key `['products', { category, page }]` names this data. A different category or page is a different cache entry.
2. `staleTime: 60_000` says the data counts as fresh for 60 seconds, so a remount inside that time does not refetch. (The default `staleTime` is 0: data is stale at once and refetches when a component mounts, the window refocuses or the network returns.)
3. After a mutation, `queryClient.invalidateQueries({ queryKey: ['products'] })` marks matching entries stale so they refetch.

Two cache styles come up in interviews. A **key-based cache** (TanStack Query, SWR) stores each response under its key. A **normalised cache** (Apollo Client, Relay for GraphQL) splits responses into entities by id, so one update to user 7 shows everywhere. Normalising gives consistency but costs complexity. For REST apps, key-based caching plus invalidation is usually enough.

Also mention **waterfalls** (request B waits for A when it need not: fetch in parallel) and **prefetching** (start loading the next page or route on hover or when idle).

## 7. Building block: pagination, infinite scroll, virtualization
These solve different problems, and people mix them up.

| Option | Good for | Cost |
|---|---|---|
| Pagination (page buttons) | Search results, tables, anything users jump around in; shareable URL | More clicks |
| Infinite scroll | Browsing feeds | Hard to reach the footer, lose position, needs care for a11y and memory |
| "Load more" button | Middle ground: user controls loading, footer stays reachable | One click per page |
| Virtualization (windowing) | Thousands of rows already in memory | Complexity: fixed or measured row heights, find-in-page and a11y limits |

Key points:
- **Cursor pagination** (`?cursor=abc`) is steadier than **offset pagination** (`?page=3`) for live feeds. With offset, a new item at the top shifts everything and you see duplicates or miss items. A cursor says "after this item".
- Infinite scroll is about **when to fetch**. Virtualization is about **how many DOM nodes exist**. A feed of 5,000 posts needs both: fetch lazily and render only what is on screen. See [Performance optimisation](./02-performance-optimization.md).
- Practice: [infinite scroll](../practice-app/exercises/react/16-infinite-scroll/README.md), [virtualized list](../practice-app/exercises/react/24-virtualized-list/README.md).

## 8. Building block: real-time updates
Pick the simplest transport that meets the freshness requirement.

| Transport | How it works | Direction | Notes |
|---|---|---|---|
| Polling | Ask every N seconds | Client to server | Simplest, wasteful, delay up to N seconds |
| Long polling | Server holds the request until it has news | Client to server | Works anywhere, many reconnects |
| SSE (Server-Sent Events, `EventSource`) | One open HTTP response streams events | Server to client only | Browser reconnects by itself and sends the last event id; plain HTTP |
| WebSocket | One open two-way connection | Both | Chat, games, collaboration; you write reconnect yourself; needs sticky routing or a message broker when you run many servers |

Choose: dashboards and notifications often need only SSE or polling. Chat and collaborative editing need WebSocket. If updates are rare, polling every 30 seconds is a fine answer.

**Reconnect strategy** (say all four): (1) wait longer after each failure (**exponential backoff**), (2) add **jitter** (a random part) so a thousand clients do not reconnect at the same instant after an outage, (3) after reconnecting, **ask for what you missed** using the last seen id, (4) pause when the tab is hidden or the device is offline.

```js
export function backoffDelay(attempt, { base = 1000, max = 30000, random = Math.random } = {}) {
  const cap = Math.min(max, base * 2 ** attempt);
  return random() * cap;
}

export function connect(url, onMessage) {
  let attempt = 0;
  let socket;
  let timer;
  let stopped = false;

  function open() {
    socket = new WebSocket(url);
    socket.onopen = () => { attempt = 0; };
    socket.onmessage = (e) => onMessage(JSON.parse(e.data));
    socket.onclose = () => {
      if (stopped) return;
      timer = setTimeout(open, backoffDelay(attempt++));
    };
  }

  open();
  return () => {
    stopped = true;
    clearTimeout(timer);
    socket.close();
  };
}
```

**What happens, step by step:**
1. `backoffDelay(attempt)` doubles the wait cap each time (1 s, 2 s, 4 s, 8 s, 16 s) and stops at 30 s. We ran it with `random` fixed at 1 and got `[1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]` for attempts 0 to 7. With the real `Math.random` the result is a random value between 0 and that cap.
2. When the socket closes unexpectedly, `onclose` schedules `open` after that delay and counts one more attempt.
3. A successful `onopen` resets `attempt` to 0.
4. The returned function sets `stopped` first, so closing on purpose (for example when a React effect cleans up) does not trigger a reconnect.

With SSE it is shorter, because the browser retries for you:

```js
const source = new EventSource('/api/notifications');
source.onmessage = (e) => handle(JSON.parse(e.data));
// call source.close() in the effect cleanup
```

**Common mistake:** keeping the socket in a component that re-mounts often, so the app opens and closes connections all day. Fix: open it once in a provider or a store, and let components subscribe.

## 9. Building block: optimistic UI and conflicts
**Optimistic UI** means you show the result of an action at once and send the request in the background. If it fails, you undo. It makes an app feel instant. React 19 has `useOptimistic` for this (see [React 19 and newer](./04-react-19-and-newer.md)); a reducer works too:

```js
async function likePost(id) {
  dispatch({ type: 'toggle-like', id });   // 1. update the screen now
  try {
    await api.like(id);                    // 2. tell the server
  } catch {
    dispatch({ type: 'toggle-like', id }); // 3. roll back: the same action undoes it
    showToast('Could not save your like');
  }
}
```

**Conflicts** happen when two people change the same thing. Options, from simple to heavy: last write wins; send a version number or `ETag` and let the server answer `409 Conflict` so the client can refetch and ask the user; field-level merge; for shared text editing, CRDTs or operational transforms (name them, do not derive them). For retries on flaky networks, send an **idempotency key** so the server applies a repeated request once.

## 10. Building block: offline and PWA
A **PWA** (progressive web app) is a web app with a manifest and a **service worker**: a script that sits between your page and the network and can answer requests from a cache. Service workers need HTTPS (localhost is allowed).

| Resource | Strategy | Meaning |
|---|---|---|
| App shell (HTML, JS, CSS with hashed names) | Cache first | Serve from cache, update on a new release |
| API reads | Network first, or stale-while-revalidate | Prefer fresh, fall back to cache |
| Images | Cache first with a size limit | Save bandwidth |
| Writes while offline | Queue (an "outbox" in IndexedDB), replay with idempotency keys | Never lose user input |

Decide first whether offline is a real requirement. It adds update, storage and conflict problems. Details: Browser and web platform (planned).

## 11. Building block: performance budgets and bundling
A **performance budget** is a number your team agrees not to exceed, checked in CI. The user-focused numbers are the Core Web Vitals, judged at the 75th percentile of real visits:

| Metric | Measures | Good |
|---|---|---|
| LCP (Largest Contentful Paint) | When the main content appears | 2.5 s or less |
| INP (Interaction to Next Paint) | How fast the page reacts to clicks and keys | 200 ms or less |
| CLS (Cumulative Layout Shift) | How much content jumps | 0.1 or less |

Add team budgets such as "first route JS under N KB gzipped" (pick N from your audience's devices). **Lab data** (Lighthouse in CI) is repeatable and good for catching regressions. **Field data** (real users) is the truth, and Core Web Vitals use it.

**Bundling strategy:**
- Split by **route** first, then split heavy widgets (editor, charts, maps) that few users open.
- Keep one shared vendor chunk stable so browsers keep it cached between releases.
- **Prefetch on intent** (hover, focus, idle) so navigation feels instant.
- Look at a bundle visualiser before guessing.

In React, `const Chart = lazy(() => import('./Chart.jsx'))` wrapped in `<Suspense fallback={<p>Loading chart...</p>}>` downloads the chart code only when it first renders (see [Performance optimisation](./02-performance-optimization.md)). Give images `width` and `height` to prevent layout shift, lazy-load images below the fold, and never lazy-load the LCP image (give it `fetchPriority="high"`).

## 12. Building block: monorepos and micro-frontends
A **monorepo** keeps several apps and packages in one repository:

```text
repo/
  apps/web  apps/admin
  packages/ui  packages/api-client  packages/config
```

Workspaces (npm or pnpm) link the packages. A task runner (Turborepo, Nx) runs builds and tests in the right order and caches the results. Pros: shared code, one change across many packages, one set of tools. Cons: slow CI without caching, unclear ownership, big checkouts.

**Micro-frontends** split one product into separately built and deployed frontends, each owned by a team.

| Integration | How | Notes |
|---|---|---|
| Build-time packages | Teams publish npm packages, a shell installs them | Simple, but you redeploy the shell for every change |
| Module Federation | A host loads remote modules at runtime | Independent deploys; share React as a **singleton** (two copies of React break hooks) |
| iframes | Each part in its own frame | Strong isolation, hard to size, share state and style, and make accessible |
| Web components | Custom elements as the contract | Framework neutral, awkward with React props and events |
| Server composition | Server stitches HTML fragments | Good for content sites |

Honest pros: independent deploys, team autonomy, gradual migration of an old app. Honest cons: duplicated dependencies and bigger bundles, inconsistent look and behaviour, hard shared state, harder testing and debugging, extra infrastructure, and slower pages if loads chain. Rule: use micro-frontends for an **organisation problem** (many teams blocking each other), never for a **code problem** a monorepo and clear module boundaries would solve.

## 13. Building block: design systems
A **design system** is shared building blocks plus the rules for using them. Think in layers:

1. **Tokens**: named design values (colours, spacing, type scale, radius), the single source of truth.
2. **Primitives**: unstyled or lightly styled behaviour (dialog, popover, listbox) with accessibility done once.
3. **Components**: Button, Input, Select, Modal, built from tokens and primitives.
4. **Patterns**: forms, empty states, page layouts.

```css
:root { --color-bg: #ffffff; --color-text: #1a1a1a; --space-2: 0.5rem; }
[data-theme='dark'] { --color-bg: #121212; --color-text: #f2f2f2; }
.card { background: var(--color-bg); color: var(--color-text); padding: var(--space-2); }
```

Components read variables, so theming (dark mode, brands) swaps values without changing components. Other decisions: composable APIs (children and slots over dozens of props, see [Component patterns](../03-intermediate/01-component-patterns.md)); controlled and uncontrolled support; **versioning** with semantic versions, deprecation warnings and codemods; documentation and visual tests in **Storybook**; accessibility tests per component; ESM output that tree-shakes; and **governance** (who accepts changes, how teams contribute, how adoption is measured).

**Common mistake:** building a big design system before two products need it, or giving components endless props. Fix: extract after the second or third use, keep the API small.

## 14. Accessibility, i18n and security at scale
At scale you cannot rely on every developer remembering. Make the safe path the default:
- **Accessibility**: correct semantics live in shared components; lint rules and axe checks run in CI (colour contrast needs a real browser, not jsdom); manual keyboard and screen reader passes on key flows. See [Accessibility](./09-accessibility.md).
- **i18n** (internationalisation): no hard-coded strings or string concatenation; use message files with plural rules and the `Intl` APIs for dates, numbers and currency; use CSS logical properties (`margin-inline-start`) for right-to-left; expect some languages to need much more room than English; load locale files on demand.
- **Security**: React escapes text by default; sanitise any HTML you must inject; keep tokens in `HttpOnly`, `Secure`, `SameSite` cookies instead of localStorage; set a Content Security Policy; audit dependencies and third-party scripts; never ship secrets in the bundle. Server Functions are public endpoints, so validate input and check permissions in each. See [Security and i18n](./10-security-and-i18n.md).

## 15. Observability, experiments and delivery
You cannot fix what you cannot see. Cover these in the O step.

**Error monitoring.** A Sentry-style service collects errors with release version, user (hashed) and breadcrumbs. React 19 lets you report errors from three root options:

```jsx
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root'), {
  onUncaughtError: (error, info) => report(error, info.componentStack),
  onCaughtError: (error, info) => report(error, info.componentStack),   // caught by an error boundary
  onRecoverableError: (error, info) => report(error, info.componentStack), // React recovered, for example a hydration mismatch
}).render(<App />);
```

`report` is your function that calls the tracker's SDK. See [Error boundaries](../03-intermediate/05-error-boundaries-portals-and-friends.md).

**Source maps.** Production code is minified, so stack traces read `a.js:1:20931`. A source map translates them back. Build maps, upload them to the tracker, and do not serve them publicly by accident:

```js
// vite.config.js
import { defineConfig } from 'vite';
export default defineConfig({ build: { sourcemap: 'hidden' } });
```

`'hidden'` writes the `.map` files but does not link them from the bundle, so browsers do not download them. See Tooling (planned).

**Performance monitoring (real user monitoring).** Send Web Vitals from real visits and chart them by route and device:

```js
import { onCLS, onINP, onLCP } from 'web-vitals';

function send(metric) {
  navigator.sendBeacon('/rum', JSON.stringify({
    name: metric.name, value: metric.value, rating: metric.rating, page: location.pathname,
  }));
}
onCLS(send); onINP(send); onLCP(send);
```

**Logging.** Log events, not noise: structured fields (route, release, request id), sampling for high-volume logs, and no personal data.

**Feature flags** switch code on or off at runtime without a deploy. Uses: gradual rollout (1 percent, 10 percent, everyone), kill switch, per-customer features. Clean old flags up.

```jsx
const FlagsContext = createContext({});
export const useFlag = (name) => Boolean(useContext(FlagsContext)[name]);

function Checkout() {
  const newPayment = useFlag('new-payment-form');
  return newPayment ? <NewPaymentForm /> : <OldPaymentForm />;
}
```

**A/B tests.** Assign each user to a variant by hashing user id plus experiment name, so the assignment is stable. Log an **exposure event** when the user actually sees the variant, and compare one primary metric. Beware of flicker (render the variant before first paint) and of stopping a test early.

**Analytics events.** Define a small schema (event name, properties, user and session id), send events in batches, respect consent, and keep names consistent.

**CI/CD and the testing pyramid.** Many fast unit tests at the bottom, fewer component tests (Testing Library with a mocked network) in the middle, a handful of end-to-end tests for critical flows (Playwright) on top, plus visual tests on the design system. Each pull request gets lint, type check, tests, a bundle-size check and a preview deployment. Ship behind flags, roll out gradually, watch error rate and Web Vitals, and keep rollback one click away. See [Testing React](./08-testing-react.md).

## 16. Worked design 1: autocomplete (typeahead)
**Requirements.** Functional: type in a box, see up to 8 suggestions, pick one by mouse or keyboard. Non-functional: feels instant on slow networks, accessible (screen reader and keyboard), does not flood the server, never shows results for an old query. Out of scope: search history, fuzzy ranking (the server does that).

**Component tree and data flow.**

```text
<Typeahead search={fn}>
  |- <input role="combobox">     (query, keyboard events)
  |- <ul role="listbox">         (items, highlighted option)
  |    `- <li role="option"> x N
  `- <p role="status">           (announces "Searching..." or "N results")
useTypeahead(query, search): debounce -> request -> result state
```

**State shape.**

```text
query    : string                       what is in the box (local)
open     : boolean                      is the list shown (local)
active   : number                       highlighted index, -1 for none (local)
result   : { items, status, error }     status is idle | loading | done | error
cache    : Map<query, items>            optional, per session
```

**API.** `GET /api/suggest?q=rea&limit=8` returns `{ "items": ["read", "real"] }`, with a short `Cache-Control` so repeated queries hit the HTTP cache or CDN. The client sends an abort signal.

```jsx
import { useEffect, useId, useState } from 'react';

const EMPTY = { items: [], status: 'idle', error: null };

export function useTypeahead(query, search, delay = 300) {
  const q = query.trim();
  const [state, setState] = useState(EMPTY);

  useEffect(() => {
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        const items = await search(q, controller.signal);
        if (controller.signal.aborted) return;
        setState({ items, status: 'done', error: null });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({ items: [], status: 'error', error });
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, search, delay]);

  return q.length < 2 ? EMPTY : state;
}

export function Typeahead({ search }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const { items, status } = useTypeahead(query, search);
  const listId = useId();
  const showList = open && items.length > 0;

  function choose(item) {
    setQuery(item);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && showList && active >= 0) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div>
      <input
        role="combobox"
        aria-label="Search"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
      />
      <ul id={listId} role="listbox" hidden={!showList}>
        {items.map((item, i) => (
          <li key={item} id={`${listId}-${i}`} role="option" aria-selected={i === active} onMouseDown={() => choose(item)}>
            {item}
          </li>
        ))}
      </ul>
      <p role="status">{status === 'loading' ? 'Searching...' : `${items.length} results`}</p>
    </div>
  );
}
```

Use it with a real `search`, for example `(q, signal) => fetch('/api/suggest?q=' + encodeURIComponent(q), { signal }).then((r) => r.json()).then((d) => d.items)`. Pass a stable function (defined outside the component or wrapped in `useCallback`), or the effect restarts on every render.

**What happens, step by step** (we ran these in tests):
1. The user types `r`, `re`, `rea` quickly. Every keystroke restarts the effect: cleanup clears the previous timer. After 300 ms of silence, `search` is called **once**, with `"rea"`. At 299 ms it had not been called yet.
2. A query shorter than 2 characters never calls `search`, and the hook returns the empty state.
3. Suppose `"re"` was sent, the user typed on, and `"rea"` was sent. The cleanup for `"re"` aborted its signal (`aborted` was `true`). If the slow `"re"` answer arrives **after** the `"rea"` answer, the `aborted` check drops it, and the list still shows `read` and `real`. This is the stale response guard.
4. With results shown, ArrowDown twice highlights the second option (`aria-activedescendant` points to it). Enter fills the box with `real`, and the list closes (`aria-expanded` becomes `false`). Focus stays in the input the whole time.

**Edge cases:** empty results (show "No results" in the status line), request error (show a retry, keep the typed text), Escape closes, clicking outside closes, `onMouseDown` on options so the input does not blur before the click registers, IME composition (do not search mid-composition), pasting text, very long strings, and right-to-left layouts.

**Optimisations:** a per-session cache (practice item 5), ignore results for queries the user has already replaced, cancel requests, highlight the matching part of each suggestion safely as elements (not as raw HTML), prefetch popular queries, cache at the CDN, and virtualize only if the list can be very long. For a production-grade ARIA combobox see the [accessible combobox exercise](../practice-app/exercises/react/33-accessible-combobox/README.md) and the [autocomplete exercise](../practice-app/exercises/react/12-autocomplete-debounce/README.md).

## 17. Worked design 2: news feed with infinite scroll
**Requirements.** Functional: scroll an endless list of posts, like a post, see new posts on request. Non-functional: first screen fast, smooth scrolling on mid-range phones, no duplicate or missing posts, works with a keyboard and screen reader, survives flaky networks. Out of scope: composing posts, comments.

**Component tree and data flow.**

```text
<Feed>
  |- <ol>  <PostCard> x N          (each: text, like button)
  |- <button>Retry</button>        (only after an error)
  |- <div ref={sentinel}/>         (invisible, 400px before the end)
  `- <p>You are all caught up</p>  (when no next cursor)
useInfiniteFeed -> fetchPage(cursor) -> reducer
useSentinel     -> IntersectionObserver calls loadMore
```

**State shape** (normalised: each post stored once by id):

```text
{ ids: [1, 2, 3], byId: { 1: {...post}, ... }, nextCursor: 'c2' | null,
  status: 'idle' | 'loading' | 'error' | 'done' }
```

**API.** `GET /api/feed?cursor=c2&limit=20` returns `{ "items": [{ "id": 3, "text": "...", "likes": 4, "liked": false }], "nextCursor": "c3" }`. `nextCursor` is `null` on the last page. `POST /api/posts/3/like` toggles a like (send an idempotency key).

```jsx
import { useCallback, useEffect, useEffectEvent, useReducer, useRef } from 'react';

export const initialFeed = { ids: [], byId: {}, nextCursor: null, status: 'idle' };

export function feedReducer(state, action) {
  switch (action.type) {
    case 'load-start':
      return { ...state, status: 'loading' };
    case 'load-success': {
      const ids = [...state.ids];
      const byId = { ...state.byId };
      for (const post of action.items) {
        if (!byId[post.id]) ids.push(post.id);
        byId[post.id] = post;
      }
      return { ids, byId, nextCursor: action.nextCursor, status: action.nextCursor ? 'idle' : 'done' };
    }
    case 'load-error':
      return { ...state, status: 'error' };
    case 'toggle-like': {
      const post = state.byId[action.id];
      const liked = !post.liked;
      const updated = { ...post, liked, likes: post.likes + (liked ? 1 : -1) };
      return { ...state, byId: { ...state.byId, [action.id]: updated } };
    }
    default:
      return state;
  }
}

function useInfiniteFeed(fetchPage) {
  const [feed, dispatch] = useReducer(feedReducer, initialFeed);
  const busy = useRef(false);

  const loadMore = useCallback(async () => {
    if (busy.current || feed.status === 'done') return;
    busy.current = true;
    dispatch({ type: 'load-start' });
    try {
      const page = await fetchPage(feed.nextCursor);
      dispatch({ type: 'load-success', items: page.items, nextCursor: page.nextCursor });
    } catch {
      dispatch({ type: 'load-error' });
    } finally {
      busy.current = false;
    }
  }, [fetchPage, feed.nextCursor, feed.status]);

  return { feed, dispatch, loadMore };
}

function useSentinel(onVisible, watch) {
  const ref = useRef(null);
  const handleVisible = useEffectEvent(onVisible);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) handleVisible();
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [watch]);

  return ref;
}

export default function Feed({ fetchPage }) {
  const { feed, dispatch, loadMore } = useInfiniteFeed(fetchPage);
  const sentinel = useSentinel(loadMore, feed.ids.length);

  return (
    <main aria-busy={feed.status === 'loading'}>
      <ol>
        {feed.ids.map((id) => {
          const post = feed.byId[id];
          return (
            <li key={id}>
              {post.text}{' '}
              <button onClick={() => dispatch({ type: 'toggle-like', id })}>
                {post.liked ? 'Unlike' : 'Like'} ({post.likes})
              </button>
            </li>
          );
        })}
      </ol>
      {feed.status === 'error' && <button onClick={loadMore}>Retry</button>}
      {feed.status !== 'done' && <div ref={sentinel} aria-hidden="true" />}
      {feed.status === 'done' && <p>You are all caught up</p>}
    </main>
  );
}
```

`IntersectionObserver` is a browser API that tells you when an element enters the viewport. `useEffectEvent` (React 19.2) lets the observer call the latest `loadMore` without recreating the observer when `loadMore` changes.

**What happens, step by step** (tested with a fake observer):
1. On mount the feed is empty and the sentinel is visible, so the observer fires and `loadMore` fetches the first page (cursor `null`).
2. If the observer fires twice before the response arrives, `busy.current` makes the second call return at once: `fetchPage` ran **once**.
3. `load-success` appends the posts. The list length changed, so the effect cleans up (the old observer is disconnected) and creates a new observer (our test saw the old one disconnected and a second one created). Real browsers report the current visibility as soon as you call `observe`, so if the sentinel is still on screen after a short page, the next page loads without any scrolling. A fake observer in a test cannot show that part.
4. The next page contains post 2 again (an overlap, which can happen when posts are added while you scroll). The reducer checks `byId`, so the list shows posts 1, 2, 3, not 1, 2, 2, 3.
5. When `nextCursor` is `null`, the status becomes `done`: the sentinel is removed and "You are all caught up" appears. If a request fails, the status is `error`; a Retry button appears, and because the list length did not change, no new observer is created, so there is no error loop.
6. Clicking Like runs `toggle-like` at once (an optimistic update): `Like (5)` becomes `Unlike (6)`. Dispatching the same action again restores `Like (5)`, which is the rollback from section 9.

**Edge cases:** pull-to-refresh and a "N new posts" pill instead of inserting on top while the user reads; restoring the scroll position when coming back (keep the list in the query cache or store); deleted posts (remove from `ids` and `byId`); empty feed; offline; very long text and large images (reserve space with width and height to avoid layout shift); keyboard users who cannot reach the footer (offer "Load more" or a skip link); screen reader announcements for new content (`aria-busy` while loading, a polite status message).

**Optimisations:** virtualize or limit the DOM to roughly what fits on screen plus a buffer, once the list has hundreds of posts; fetch the next page before the user reaches the end (the sentinel's `rootMargin` does this); responsive, lazy images; memoize `PostCard` so a like re-renders one card; cache pages in the query cache (`useInfiniteQuery` in TanStack Query does the cursor and page bookkeeping for you); stream the first page with SSR if SEO matters; send analytics for impressions with the same observer, batched.

## 18. Worked design 3: streaming chat UI
**Requirements.** Functional: send a message, watch the answer appear token by token, stop it, regenerate it, retry after an error, keep the history. Non-functional: smooth rendering while text streams, correct scroll behaviour, accessible, and **the model provider's API key never reaches the browser**. Out of scope: file uploads, multiple users in one thread.

**Architecture.**

```text
Browser <Chat>  --POST /api/chat-->  Your server  --(secret key)-->  Model provider
   ^                                    |  checks login, rate limit, input size
   `------ streamed response body <-----'  (forwarded chunk by chunk, SSE or plain stream)
<Chat>
  |- <MessageList>  <Message> x N   (memoized: only the streaming one re-renders)
  |- <JumpToLatest/>                (shown when the user scrolled up)
  `- <Composer>                     (textarea, Send, Stop, Regenerate)
```

**State shape.**

```text
messages: [{ id, role: 'user' | 'assistant', text, status: 'streaming' | 'done' | 'stopped' | 'error' }]
stickToBottom: boolean     (is the user near the bottom)
controller: AbortController (in a ref, for Stop)
```

**API.** `POST /api/chat` with `{ "prompt": "..." }` (a real app sends the conversation id). The response body is a stream of text. Errors use normal status codes (401, 429, 500) before the stream starts. The server adds the key, enforces rate limits and size limits, and never trusts the client.

```js
export async function streamReply(prompt, onToken, signal) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Chat failed with status ${res.status}`);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    onToken(value);
  }
}
```

```jsx
import { useCallback, useEffect, useRef, useState } from 'react';

export function useStreamedText(flushMs = 50) {
  const [text, setText] = useState('');
  const buffer = useRef('');
  const timer = useRef(null);

  const push = useCallback((chunk) => {
    buffer.current += chunk;
    timer.current ??= setTimeout(() => {
      timer.current = null;
      const next = buffer.current;
      buffer.current = '';
      setText((t) => t + next);
    }, flushMs);
  }, [flushMs]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [text, push];
}
```

Stop and regenerate:

```jsx
const controller = useRef(null);

async function send(prompt) {
  controller.current = new AbortController();
  try {
    await streamReply(prompt, push, controller.current.signal);
  } catch (e) {
    if (e.name !== 'AbortError') setError(e);   // a real failure: show Retry
  }
}
const stop = () => controller.current?.abort();  // regenerate = send the last prompt again
```

**What happens, step by step** (tested):
1. `streamReply` reads the body as a stream. We fed it a response in two chunks that split a 3-byte character (the euro sign) in the middle. `TextDecoderStream` held the partial bytes and the tokens came out as `"Hi "` and `"€!"`, joined to `Hi €!`, with no broken character.
2. A non-OK status (for example 500) makes `streamReply` reject with `Chat failed with status 500`, which the UI turns into an error state with a Retry button.
3. Each token goes to `push`, which only appends to a ref buffer and starts a 50 ms timer if none is running. When the timer fires, one `setText` renders all buffered text. We pushed 100 tokens, one every 5 ms: the component rendered **10 times**, not 100, and the final text had all 100 characters.
4. Unmounting clears the pending timer, so no state update happens after the component is gone.
5. Stop calls `abort()`: `fetch` and the reader reject with `AbortError`, which you treat as a normal stop, not an error. Mark the message `stopped` and keep the partial text.

**Edge cases and details:**
- **Scroll anchoring**: auto-scroll to the bottom only while the user is near the bottom (track it with an `IntersectionObserver` on a bottom sentinel). If they scroll up to read, stop following and show "Jump to latest".
- **Markdown**: render with a library that does not allow raw HTML (or sanitise the output). Re-parsing a growing string is costly, so memoize finished messages and only re-render the streaming one.
- **Accessibility**: do not put the streaming text in a live region (a screen reader would read every flush). Announce "Answer ready" in a polite live region when the status becomes `done`, and keep focus on the Composer.
- **Failure modes**: dropped connection mid-answer (keep partial text, offer Retry or Continue), double click on Send (disable while streaming), 429 rate limit (show the wait time), long conversations (virtualize and trim what you send).
- **Security**: the key and any system prompt stay on the server; treat model output as untrusted text (never `dangerouslySetInnerHTML` without sanitising); do not let the browser call the provider directly.

## 19. Interview checklist
- [ ] I asked about users, devices, scale, freshness, SEO, a11y, i18n and offline before drawing.
- [ ] I wrote functional, non-functional and out-of-scope lists.
- [ ] I drew the component tree and the data flow (client, cache, API, CDN).
- [ ] I said where each piece of state lives: local, global, server cache or URL.
- [ ] I wrote the API: endpoints, request and response, pagination style, errors.
- [ ] For every big choice (rendering, transport, cache) I named an alternative and a trade-off.
- [ ] I covered loading, empty, error and offline states.
- [ ] I covered performance (budget, splitting, images), accessibility, i18n, security and observability.
- [ ] I explained how it ships: tests, flags, rollout, rollback.
- [ ] I said what I would do with more time.

## How interviewers test this
- **Structure**: do you follow a clear path (RADIO) and keep the interviewer in the loop, or ramble and jump to code?
- **Requirements first**: strong candidates ask non-functional questions (scale, SEO, devices, freshness) and let the answers drive the design.
- **Trade-offs**: "I would use WebSocket" is weak; "polling is enough for 30-second freshness, WebSocket only if we need two-way messages" is strong.
- **Depth on demand**: they pick one box (the cache, the list, the reconnect logic) and ask you to go deep; you need real hands-on knowledge there.
- **Adaptation**: they add a requirement ("now it must work offline") and watch you revise calmly.
- **Red flags**: drawing nothing, naming tools without reasons, ignoring accessibility and failure states, treating the client as trusted.

## Interview questions and model answers
### Q1. How do you approach a frontend system design question? (Easy)
I use RADIO. First **requirements**: I clarify functional and non-functional needs and what is out of scope. Then **architecture**: a component tree and the data flow between client, cache, API and CDN. Then the **data model**: the state shape and where each piece lives. Then the **interface**: API endpoints and component props. Last, **optimisations**: performance, accessibility, i18n, security, observability and rollout. I think aloud and check with the interviewer after each step.

### Q2. Which non-functional requirements do you ask about first? (Easy)
Scale (how many items and users), devices and network quality, SEO and first-paint needs, how fresh the data must be, accessibility targets, languages, offline needs, security and privacy, and team size and release rhythm. Each answer changes a decision: SEO changes the rendering strategy, freshness changes polling vs push, scale changes pagination and virtualization.

### Q3. How do you choose a rendering strategy? (Medium)
I ask how fresh and how personal the data is, and whether SEO and first paint matter. Public, rarely changing pages use SSG, or ISR if data changes slowly. Public, frequently changing or personalised pages that need SEO use SSR or Server Components. Private, highly interactive apps (dashboards, editors) can be plain CSR. In practice I choose per route, in a framework that supports mixing, and I note the costs: SSR needs server capacity and hydration, SSG goes stale, CSR has a blank first paint.

### Q4. Where does each kind of state live in a large React app? (Medium)
Local UI state in `useState` or `useReducer` inside the component. State shared by distant components in context or a small store (Zustand, Redux Toolkit). Server data in a query cache (TanStack Query or SWR) instead of copying it into a store, so there is one source of truth with caching and refetching. Anything users should share, bookmark or navigate back to (filters, page, tab) in the URL. Drafts and preferences in browser storage. The rule is the cheapest place that works.

### Q5. How would you structure a large React app? (Medium)
By feature, not by file type: `features/feed`, `features/checkout`, each with its own components, hooks, API calls and tests, and a small public entry file. A shared layer (`ui`, `lib`) sits underneath and features never import each other's internals; a lint rule enforces the direction (app, then features, then shared). Routes map to features and are code-split. Server state sits in the query cache, and TypeScript types the API boundary. If several apps share code, I move shared parts into packages in a monorepo with a task runner and caching.

### Q6. How do you handle real-time data? (Medium)
I start from the freshness requirement. If seconds of delay are fine, polling is enough. For one-way updates (notifications, scores, dashboards) I use SSE, which runs over plain HTTP and reconnects by itself. For two-way, low-latency needs (chat, collaboration) I use WebSocket. I add reconnect with exponential backoff and jitter, resync after reconnecting using the last seen id, pause when the tab is hidden, and keep one connection in a provider or store. I also decide how updates merge into the cache and how conflicts resolve.

### Q7. Pagination, infinite scroll or virtualization? (Medium)
They solve different problems. Pagination suits searchable, shareable result sets. Infinite scroll suits browsing feeds but hurts footer access and accessibility, so a "Load more" button is a good compromise. Virtualization reduces DOM nodes for long lists already in memory. Feeds often need cursor-based fetching plus virtualization. I prefer cursor pagination for live data because offsets shift when new items arrive and cause duplicates.

### Q8. How do you design a design system? (Hard)
Layers: design tokens, accessible primitives, components, then patterns. Tokens are variables (CSS custom properties), so themes swap values without editing components. Component APIs stay small and composable, support controlled and uncontrolled use, and forward refs and class names. Accessibility is built in and tested per component. Documentation and visual tests live in Storybook. Releases follow semantic versioning with deprecation warnings and codemods for breaking changes. Governance covers who approves changes and how adoption is measured. I extract components after real repeated use, not before.

### Q9. What are the pros and cons of micro-frontends? (Hard)
Pros: teams deploy independently, own their area, and can migrate an old app piece by piece. Cons: duplicated dependencies and bigger bundles, inconsistent UX, hard shared state and routing, harder testing and debugging, more infrastructure, and runtime loading that can slow the page. Integration options are build-time packages, Module Federation (share React as a singleton), iframes, web components or server composition. I recommend them to fix an organisation problem with many teams blocking each other, not a code-organisation problem, which a monorepo with module boundaries solves more cheaply.

### Q10. How do you measure performance in production? (Hard)
With field data, not just lab data. I collect Core Web Vitals (LCP, INP, CLS) from real users with the `web-vitals` library, send them to an analytics endpoint, and break them down by route, device and country at the 75th percentile. Lighthouse in CI is the lab check that catches regressions before release. I add a bundle-size budget in CI, error and slow-request monitoring with release tags, and React Profiler or the browser Performance panel to find the cause when a metric is bad. Then I verify the fix in the next field data.

## Common mistakes and gotchas
- **Jumping to code or libraries**: finish requirements and the box diagram first, then name tools with reasons.
- **Ignoring non-functional requirements**: ask about scale, SEO, devices and freshness before choosing.
- **One answer, no trade-offs**: name at least one alternative for each big choice and when it wins.
- **Duplicating server data in a global store**: keep it in the query cache; the store holds only client state.
- **Offset pagination on a live feed**: use cursors to avoid duplicates and gaps.
- **Treating infinite scroll as virtualization**: fetching lazily does not reduce DOM size; add windowing for very long lists.
- **Reconnecting without backoff or jitter**: an outage turns into a stampede. Add both, and resync missed events.
- **Forgetting loading, empty, error and offline states**: list them for every screen.
- **Micro-frontends for a small team**: choose a monorepo and clear boundaries first.
- **Trusting the client**: validate on the server, keep secrets and API keys on the server, and treat Server Functions as public endpoints.
- **Source maps served publicly**: use `sourcemap: 'hidden'` and upload the maps to the error tracker.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** A product listing page has these pieces of state: the selected category, the list of products, whether the filter panel is open, the cart, and the user's dark mode choice. Say where each one should live and why.

<details>
<summary>Show answer</summary>

- Selected category: the **URL** (search params), so the page can be shared, bookmarked and used with the back button.
- List of products: **server state** in a query cache (TanStack Query or SWR), keyed by category (and page), with a `staleTime`.
- Filter panel open: **local state** (`useState`) in the component.
- Cart: **global client state** (store or context), and also saved on the server for logged-in users.
- Dark mode: a **persisted preference** (localStorage, or a cookie if the server needs it to avoid a flash), exposed through context or the `data-theme` attribute.

Each choice is the cheapest place that still works for how many components read the value and whether it must survive a reload.

</details>

2. **(Easy)** Pick a rendering strategy (CSR, SSR, SSG, ISR) for: a documentation site, a news article page, a logged-in analytics dashboard, a shopping cart page. Give one reason each.

<details>
<summary>Show answer</summary>

- Documentation site: **SSG**. It changes only when someone publishes, so build once and serve from a CDN.
- News article page: **ISR** (or SSR). It is public and needs SEO, and a short delay after an edit is acceptable, so regenerate in the background.
- Analytics dashboard: **CSR**. It is private, has no SEO need, and is highly interactive, so a static shell plus client fetching is enough.
- Shopping cart: **SSR without shared caching, or CSR**. The data is personal, so a CDN must never serve one user's cart to another.

</details>

3. **(Medium)** Write `backoffDelay(attempt, options)` that returns a reconnect delay in milliseconds. It should double each attempt starting from `base` (default 1000), never exceed `max` (default 30000), and apply "full jitter" with a `random` function you can replace in tests. What does it return for attempts 0 to 6 when `random` always returns 1?

<details>
<summary>Show answer</summary>

```js
export function backoffDelay(attempt, { base = 1000, max = 30000, random = Math.random } = {}) {
  const cap = Math.min(max, base * 2 ** attempt);
  return random() * cap;
}
```

With `random = () => 1`: `[1000, 2000, 4000, 8000, 16000, 30000, 30000]` (we ran it). Attempt 5 would be 32000, so the cap applies. With `random = () => 0.5` and attempt 2 the result is 2000. Full jitter means the delay is a random number between 0 and the cap, which spreads reconnects out after an outage. Injecting `random` makes the function easy to test.

</details>

4. **(Medium)** In the `Typeahead` from section 16, the user types `re`, waits 300 ms, then types `a` and waits 300 ms again. The request for `re` is slow. The response for `rea` (`['read', 'real']`) arrives first, then the response for `re` (`['red']`). What does the list show at the end, and which lines of the hook cause that?

<details>
<summary>Show answer</summary>

It shows `read` and `real` (we ran this). When the query changed to `rea`, the effect cleanup ran for the `re` effect: it called `clearTimeout` and `controller.abort()`, so that request's `controller.signal.aborted` became `true`. When the late `['red']` answer resolves, the line `if (controller.signal.aborted) return;` stops it from calling `setState`. Without this guard (or an ignore flag), the slow old answer would overwrite the newer one, a classic race condition.

</details>

5. **(Medium)** Add a per-session cache to `useTypeahead` so that typing `re`, then `rea`, then `re` again calls `search` only twice. Keep the stale-response guard.

<details>
<summary>Show answer</summary>

```jsx
// 0. import useRef from 'react' next to useEffect and useState
const cache = useRef(new Map()); // 1. a ref: changing it does not cause a render

// 2. inside the setTimeout callback, before calling search:
if (cache.current.has(q)) {
  setState({ items: cache.current.get(q), status: 'done', error: null });
  return;
}

// 3. after the aborted check, once the request succeeded:
cache.current.set(q, items);
```

We ran the sequence `re`, `rea`, `re`: `search` was called with `re` and `rea` only, and the last step showed the cached result. The cache lives in a ref, so changing it does not cause a render. Only successful results are stored, so errors are retried. In a real app you would also limit the cache size or use a query library with `staleTime`.

</details>

6. **(Medium)** A team of 8 engineers builds one product and wants micro-frontends "to move faster". What do you recommend and why?

<details>
<summary>Show answer</summary>

Do not adopt micro-frontends yet. Eight people on one product is not an organisation problem. The costs (duplicated dependencies, runtime integration, shared state and routing, harder testing, extra infrastructure) outweigh the benefit of independent deploys. If they are slow, find the real cause: slow CI, unclear boundaries, long reviews. Use a monorepo with feature folders or packages, lint rules that forbid deep imports, task caching in CI, and feature flags for safe releases. Revisit micro-frontends if several teams start blocking each other's releases or the company needs to migrate a legacy app gradually.

</details>

7. **(Hard)** Outline the design of a comments section with live updates and optimistic posting: transport, state, what happens on reconnect, and what happens when a post fails.

<details>
<summary>Show answer</summary>

- **Requirements**: list comments, post one, see other people's comments within a few seconds, works on flaky networks.
- **Transport**: SSE or WebSocket for new comments (one-way is enough for reading; the post itself is a normal `POST`). Polling every 10 to 30 seconds is an acceptable first version.
- **State**: server state in a query cache keyed by thread id; normalised by comment id so duplicates are impossible. Pending comments carry a temporary client id and `status: 'sending'`.
- **Posting**: add the comment immediately with the temporary id (optimistic), send the request with an idempotency key, then replace the temporary id with the real one. If the real comment also arrives through the live channel, match by id or key so it is shown once.
- **Failure**: mark the comment `failed`, keep the text, show "Retry" and "Delete". Do not silently remove the user's words.
- **Reconnect**: backoff with jitter, then ask the API for comments after the last seen id, and merge by id.
- **Optimisations and details**: cursor pagination for old comments, a "N new comments" pill when the user is reading, accessible announcements in a polite live region, rate limiting and server-side validation, and sanitising any rich text.

</details>

8. **(Hard)** A chat component receives 100 tokens, one every 5 ms. Version A calls `setText((t) => t + token)` for every token. Version B uses the buffer hook from section 18 with a 50 ms flush. Roughly how many renders does each cause? What happens if the component unmounts while a flush is pending?

<details>
<summary>Show answer</summary>

Version A causes about 100 renders, one per token (each update lands in a separate task, so React cannot batch them together). Version B caused **10** renders in our test, because one flush renders all text that arrived in that 50 ms window. If the component unmounts with a pending flush, the effect cleanup (`clearTimeout(timer.current)`) cancels the timer, so no state update runs afterwards. The trade-off is up to 50 ms of delay before text appears, which users cannot notice. Pick the interval from the render cost: heavy markdown rendering justifies a longer interval.

</details>

## Recap
- Use RADIO: Requirements, Architecture, Data model, Interface (API), Optimisations. Ask non-functional questions before you draw.
- Choose rendering per route: SSG/ISR for public stable pages, SSR or Server Components for public dynamic pages, CSR for private interactive apps.
- State lives in the cheapest place that works: local, global store, server cache, URL, or browser storage. Do not copy server data into a store.
- Cache in layers (query cache, HTTP cache, CDN) and use stale-while-revalidate and cursor pagination for live data.
- Pick the simplest real-time transport that meets the freshness need (polling, SSE, WebSocket) and always add backoff, jitter and resync.
- Guard against races (abort and ignore stale responses), duplicate loads (busy flag) and render floods (buffer and flush).
- Micro-frontends fix organisation problems, not code problems; a monorepo with boundaries is the cheaper first step.
- Close with performance budgets, accessibility, i18n, security, error monitoring with source maps, Web Vitals field data, feature flags and safe rollout.

## Where to go next
- Practise full prompts in [Round 8: Frontend system design](../05-interview-rounds/round-8-frontend-system-design/README.md).
- Go deeper into the engine behind these choices: React internals deep dive (planned) and Browser and web platform (planned).
- Build the pieces yourself: [autocomplete](../practice-app/exercises/react/12-autocomplete-debounce/README.md), [infinite scroll](../practice-app/exercises/react/16-infinite-scroll/README.md), [virtualized list](../practice-app/exercises/react/24-virtualized-list/README.md).
