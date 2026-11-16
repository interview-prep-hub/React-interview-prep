# Round 2 - Concepts and Theory: Rendering, State and Modern React - Answers

**Questions:** [../questions/02-rendering-state-and-modern-react.md](../questions/02-rendering-state-and-modern-react.md)

## Rendering and performance
### R2-RP-001 (Easy) What causes a re-render?
**Answer:** A component re-renders in three cases. First, its own state changed (a setter was called with a different value). Second, its parent re-rendered, because by default React re-renders all children a component returns, even if their props are the same. Third, a context it reads changed. A subscription through `useSyncExternalStore` can also trigger one. Props changing is not a separate trigger: props only change because the parent rendered. Re-rendering means React calls your function again, and it does not mean the DOM changes. If you set state to the same value, React bails out: it may call your component one more time, but it does not update the children or run effects.
**Why it matters / follow-up:** Follow-up: "how do you stop a child from re-rendering?" (R2-RP-005).
**Learn more:** [How React renders](../../../04-advanced/01-how-react-renders.md)

### R2-RP-002 (Medium) Trigger, render, commit
**Answer:** Updating the screen has three steps. Trigger: the first render of the root, or a state update, schedules work. Render: React calls your components to work out what the UI should look like now. This step must be pure, it touches no DOM, and in concurrent rendering React may pause or throw the work away. Commit: React applies the smallest set of DOM changes, runs layout effects, the browser paints, and then passive effects (`useEffect`) run. If the render produced the same output as before, React does not touch the DOM. So a component "rendering" is not the same as a DOM update. Think of a restaurant: the order is taken (trigger), the kitchen prepares it (render), and the waiter delivers it (commit).
**Why it matters / follow-up:** This is why the Profiler's "rendered" and the browser's "repainted" are different things.
**Learn more:** [How React renders](../../../04-advanced/01-how-react-renders.md)

### R2-RP-003 (Medium) Reconciliation and keys
**Answer:** After rendering, React compares the new element tree with the previous one. It uses two simple rules instead of a full tree comparison, which would be too slow. Rule one: if the element at a position has a different type (for example `<div>` became `<span>`, or component A became component B), React removes the old subtree and builds a new one, and the state inside is lost. If the type is the same, React keeps the existing instance and DOM node and just updates the props. Rule two: for lists, the `key` identifies each child among its siblings, so React can move items instead of rebuilding them. Changing a component's `key` on purpose forces a fresh instance, which is the standard way to reset its state.
**Why it matters / follow-up:** The follow-up is usually the next question: a component defined inside another component (R2-RP-004).
**Learn more:** [How React renders](../../../04-advanced/01-how-react-renders.md)

### R2-RP-004 (Medium) Component defined inside a component
**Answer:** `Panel` is declared inside `Page`, so every render of `Page` creates a brand new function. React sees a different component type at that position, so by the reconciliation rules it unmounts the old `Panel` and mounts a new one. The input is a new DOM node, and the typed text, focus and any state are lost. It is also slow, because the whole subtree is rebuilt every time. The fix is to define `Panel` at module level, outside `Page`, and pass any data through props. Never nest component definitions. Rendering a plain function result such as `{renderPanel()}` avoids the identity problem, but then it is not a component and cannot use hooks.
**Why it matters / follow-up:** It is a common code-review finding, and it shows you understand component identity.
**Learn more:** [How React renders](../../../04-advanced/01-how-react-renders.md)

### R2-RP-005 (Medium) Parent re-renders and how to cut them
**Answer:** Yes, by default. When a parent renders, React renders every child it returns, all the way down, even if the props did not change. The exception is an element that is exactly the same object as last time, such as `children` passed in from higher up. Ways to cut the work: colocate state so it lives in a small component close to where it is used; use composition so slow parts are passed as `children` and keep their identity; wrap a component in `React.memo` with stable props; and let the React Compiler do it for you. Only optimise something that is actually slow. To find out why something rendered, use React DevTools: "Highlight updates when components render" shows what renders, and the Profiler records each commit and says which props or state changed.
```jsx
function ColorBox({ children }) {
  const [color, setColor] = useState("tomato");
  return (
    <div style={{ background: color }}>
      <input value={color} onChange={(e) => setColor(e.target.value)} />
      {children} {/* same element object, so it does not re-render on typing */}
    </div>
  );
}
```
**Why it matters / follow-up:** The red flag is "wrap everything in memo". The strong answer is "measure first, then move state down or use composition".
**Learn more:** [Memoization](../../../02-hooks/07-memoization.md)

### R2-RP-006 (Medium) Code splitting
**Answer:** Code splitting breaks your JavaScript into several chunks that load on demand, so the first page load downloads less. You write `const Settings = lazy(() => import("./Settings"))`. The dynamic `import()` makes the bundler produce a separate chunk, and `lazy` loads it the first time the component renders. While it loads, the nearest `<Suspense fallback={...}>` shows a placeholder. Split first at the route level, because users rarely visit every page. Then split heavy pieces that are rarely used, such as chart libraries, rich text editors and modals. A lazy component needs a default export, and a failed chunk load throws, so wrap it with an error boundary. You can preload a chunk on hover to hide the delay. Do not split tiny components, because many small requests cost more than they save.
```jsx
const Settings = lazy(() => import("./Settings"));

<Suspense fallback={<Spinner />}>
  <Settings />
</Suspense>
```
**Why it matters / follow-up:** "How do you decide what to split?" Look at a bundle analyser report first.
**Learn more:** [Error boundaries, portals and friends](../../../03-intermediate/05-error-boundaries-portals-and-friends.md)

### R2-RP-007 (Easy) Virtualising long lists
**Answer:** Rendering 10,000 rows creates tens of thousands of DOM nodes. The first render is slow, scrolling janks and memory use grows. Virtualisation (also called windowing) renders only the rows that are visible in the viewport plus a few extra rows above and below. The scroll container still gets the full height (row count times row height) so the scrollbar looks right, and rows are positioned as you scroll. Libraries such as TanStack Virtual, react-window and react-virtuoso do this. Trade-offs: variable row heights are harder, the browser's find-in-page cannot see rows that are not rendered, and you must take care with keyboard focus and accessibility. Try simpler options first: pagination, "load more", or CSS `content-visibility: auto`.
**Why it matters / follow-up:** "Why not just memoise the rows?" Memo avoids re-rendering, but the DOM nodes still exist and cost memory and layout time.
**Learn more:** [Performance optimization](../../../04-advanced/02-performance-optimization.md). The `useMemo` and rendering ideas are in [Memoization](../../../02-hooks/07-memoization.md).

### R2-RP-008 (Hard) useTransition versus useDeferredValue
**Answer:** Both mark some updates as non-urgent so urgent ones, such as typing, stay responsive. React renders the non-urgent update in the background and can interrupt it if new urgent input arrives. With `useTransition` you wrap the state update yourself, `startTransition(() => setQuery(text))`, and you also get `isPending`. Use it when you own the setter. With `useDeferredValue(value)` you get a lagging copy of a value you do not control, for example a prop. React first renders with the old value, then re-renders in the background with the new one. Neither is a debounce: there is no fixed delay and they do not cancel network requests. They also cannot speed up one very slow component, because React can only pause between components. In React 19, `startTransition` accepts async functions (Actions), but state updates after an `await` need their own `startTransition`. They help INP (Interaction to Next Paint, which replaced FID as a Core Web Vital in March 2024) because the main thread stays free for the next input.
**Why it matters / follow-up:** Follow-up: "debounce versus transition in a search box?" Debounce limits requests, a transition keeps the UI responsive, and you often want both.
**Learn more:** [Concurrent React and Suspense](../../../04-advanced/03-concurrent-react-and-suspense.md)

### R2-RP-009 (Medium) The React Compiler
**Answer:** The React Compiler is a build-time tool (a Babel plugin that you hook into your bundler) that analyses your components and hooks and adds memoisation automatically. You get the effect of `useMemo`, `useCallback` and `memo` without writing them. Version 1.0 became stable in October 2025. It only works safely when your code follows the Rules of React: pure render, no mutating props or state, hooks used correctly. If it cannot prove a component is safe it skips it, and the `eslint-plugin-react-hooks` rules report violations. You can adopt it gradually with `compilationMode: "annotation"` and the `"use memo"` directive, and opt out of one function with `"use no memo"`. You still write manual memoisation as an escape hatch, for example to keep a value stable when it is an effect dependency. It does not fix design problems such as state that lives too high or huge lists.
**Why it matters / follow-up:** Follow-up: "so should new code use `useMemo`?" Not by default. Write clear code, measure, then add it only where needed.
**Learn more:** [Memoization](../../../02-hooks/07-memoization.md)

## State management, data and routing
### R2-ST-001 (Medium) Kinds of state
**Answer:** Local UI state, such as a dropdown being open or a draft input, lives in the component with `useState`. Shared client state, such as theme, cart or the current user, is lifted to a common parent, put in Context, or put in a small store like Zustand or Redux Toolkit. Server state is data owned by the backend and cached in the browser, such as products or a user list. It has loading, error, staleness and refetching concerns, so use TanStack Query, SWR, RTK Query or framework loaders for it. URL state, such as filters, page number and selected tab, belongs in the URL (search params) so links can be shared and the back button works. Form state is its own kind and can use a form library. The rule is to keep each piece in the lowest, simplest place that works.
**Why it matters / follow-up:** The classic mistake is copying server data into Redux or `useState` by hand and then writing code to keep it fresh.
**Learn more:** [State management](../../../03-intermediate/06-state-management.md)

### R2-ST-002 (Medium) Context versus Redux versus Zustand
**Answer:** Context is a way to deliver a value to many components, not a full store. It suits values that change rarely, such as theme, locale or the signed-in user. It has no selectors, so every consumer re-renders when the value changes. Redux Toolkit gives one store with actions, reducers (written with Immer), good devtools, middleware and strong conventions, which helps large teams and complex client state, at the cost of more code. Zustand and Jotai are small and hook-based, and components subscribe to only the slice they select, so fewer components re-render. A sensible order: local and lifted state first, server data in TanStack Query, Context for rare global values, and a store only when many distant components share fast-changing client state. Many apps no longer need Redux because most of what they kept in it was server data, which a query library handles better.
**Why it matters / follow-up:** Follow-up: "what is wrong with createStore?" It is obsolete. Redux Toolkit is the standard way to write Redux.
**Learn more:** [State management](../../../03-intermediate/06-state-management.md)

### R2-ST-003 (Medium) TanStack Query and caching
**Answer:** Hand-written effects give you no cache, no deduplication, no retries and easy race conditions. TanStack Query manages server state: each query has a `queryKey`, and results are cached by key. Stale-while-revalidate means it shows cached data immediately and refetches in the background, then updates the screen if the data changed. Identical requests made at the same time are deduplicated. It retries failures (three times by default), and refetches on window focus and reconnect. By default, data is considered stale immediately (`staleTime: 0`), and unused cache entries are kept for 5 minutes (`gcTime`). After a mutation you invalidate related queries, `queryClient.invalidateQueries({ queryKey: ["todos"] })`, and they refetch. In v5, `isPending` means no data yet, and `isLoading` means pending and fetching.
```jsx
const { data, isPending, error } = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
});
```
**Why it matters / follow-up:** Follow-up: "what is the difference between `staleTime` and `gcTime`?" Stale time is how long data counts as fresh. GC time is how long unused data stays in memory.
**Learn more:** [Data fetching](../../../03-intermediate/02-data-fetching.md)

### R2-ST-004 (Hard) Request waterfalls
**Answer:** A waterfall is when request B only starts after request A finishes, so the delays add up. In the code from the question, `Posts` does not even mount until the user has loaded, and only then does its own query start. Common causes are nested components that each fetch after they render, and sequential `await` calls for independent data. Fixes: start independent requests together (`Promise.all`, several `useQuery` calls at the same level, or `useQueries`); fetch at the route level with a loader so requests start before the components render; prefetch on hover or intent; on the server, start promises early and stream with Suspense. If the second request truly needs the first result (the posts need the user id), it stays sequential, so shape the API to return what the screen needs, for example `/users/:id/posts`, if that id is known from the URL.
```jsx
// Parallel: neither depends on the other
const [user, posts] = await Promise.all([getUser(id), getPosts(id)]);
```
**Why it matters / follow-up:** Interviewers like this because it shows you think about latency, not only code structure.
**Learn more:** [Data fetching](../../../03-intermediate/02-data-fetching.md)

### R2-ST-005 (Hard) Optimistic updates
**Answer:** An optimistic update shows the expected result immediately, before the server confirms, and reverts if the request fails. This makes the app feel fast. `useOptimistic(state, updateFn)` returns `[optimisticState, addOptimistic]`. You call `addOptimistic` inside an Action (a form `action` or a `startTransition`). While the Action is pending, the UI shows the optimistic value. When the Action finishes, React switches back to the real `state`. If the save worked, you have updated the real state meanwhile, so nothing visibly changes. If it failed, the real state never changed, so the screen reverts automatically. With TanStack Query you do it by hand: in `onMutate` cancel queries, save a snapshot of the cache and write the optimistic value with `setQueryData`; in `onError` restore the snapshot; in `onSettled` invalidate the query to sync with the server. Also show an error message, because a silent revert confuses users.
```jsx
const [optimisticTodos, addOptimisticTodo] = useOptimistic(
  todos,
  (current, newTodo) => [...current, { ...newTodo, sending: true }]
);

async function formAction(formData) {
  addOptimisticTodo({ id: crypto.randomUUID(), title: formData.get("title") });
  await saveTodo(formData.get("title")); // then the parent updates `todos`
}
```
**Why it matters / follow-up:** Follow-up: "what if two optimistic updates are in flight?" Order and rollback get tricky, so keep the snapshot logic careful or refetch at the end.
**Learn more:** [Data fetching](../../../03-intermediate/02-data-fetching.md)

### R2-ST-006 (Easy) Client-side routing
**Answer:** In a single-page app, the router listens for link clicks, calls `history.pushState` to change the URL without a page reload, and renders the component that matches the new URL. The back and forward buttons fire the `popstate` event, which the router also handles. That is why you use `<Link to="/users">` and not `<a href>`, which would reload the whole page. For deep links and page refresh to work, the server must return the same `index.html` for all app paths. Dynamic parts are read with `useParams` (`/users/:id`) and `useSearchParams`. With React Router 8 you import from `react-router` (the `react-router-dom` package is gone), and `RouterProvider` comes from `react-router/dom`.
```jsx
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

const router = createBrowserRouter([
  { path: "/", Component: Layout, children: [
    { index: true, Component: Home },
    { path: "users/:id", Component: User },
  ] },
]);
// root.render(<RouterProvider router={router} />);
```
**Why it matters / follow-up:** Follow-up: "how does this differ from Next.js?" Next.js derives routes from the file system, React Router uses config or components.
**Learn more:** [React Router](../../../03-intermediate/03-react-router.md)

### R2-ST-007 (Medium) Protected routes
**Answer:** A common pattern is a layout route that checks authentication. If the user is not signed in, it renders `<Navigate to="/login" replace />`, otherwise it renders `<Outlet />` for the child routes. Remember the check while the session is still loading, or the user sees a flash of the login page. Hiding a route is only a user-experience feature. Client code can be changed by anyone, so the server must check authentication and permissions on every API request. With data routers, a `loader` runs before the route renders, loaders of nested routes run in parallel (which avoids waterfalls), and a loader can `redirect()` unauthenticated users. An `action` handles a form submission or mutation and then revalidates the loaders so the screen shows fresh data.
```jsx
function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
```
**Why it matters / follow-up:** The red flag is saying a client-side guard secures data. Say "the API is the real gate".
**Learn more:** [React Router](../../../03-intermediate/03-react-router.md)

### R2-ST-008 (Medium) Forms, validation and accessible errors
**Answer:** With controlled inputs, each value lives in state. This is simple and gives instant validation, but it re-renders on each keystroke, which is fine for small forms. React Hook Form registers inputs as uncontrolled fields and tracks values outside React state, so large forms re-render much less. It has built-in validation and works with schema libraries such as Zod through a resolver. For timing: validate on submit first, validate a field on blur so you do not nag while typing, and after the first error re-validate on change for live feedback. Always validate on the server too, because client checks are only a convenience. For accessibility, give every input a label, set `aria-invalid` on a bad field, link the error message with `aria-describedby`, and move focus to the first invalid field after a failed submit. React 19 adds `<form action={fn}>`, `useActionState` and `useFormStatus` for submit handling.
**Why it matters / follow-up:** Follow-up: "how would you build a multi-step form?" Keep all step data in one parent state or form instance, and validate each step before moving on.
**Learn more:** [Forms with libraries](../../../03-intermediate/04-forms-with-libraries.md)

## Server rendering and modern React
### R2-MR-001 (Easy) CSR, SSR, SSG and ISR
**Answer:** With client-side rendering (CSR), the server sends an almost empty HTML page plus JavaScript, and the browser builds the UI. Hosting is easy, but the first paint is slower and search engines and link previews see less. With server-side rendering (SSR), the server renders HTML on each request, so users see content sooner and SEO is better, but it costs server time and the page needs hydration to become interactive. With static site generation (SSG), HTML is built once at build time and served from a CDN. It is the fastest and cheapest, and good for content that changes rarely. Incremental static regeneration (ISR) is SSG plus background re-generation after a time or on demand, so big sites do not rebuild everything. Frameworks like Next.js let you choose per route.
**Why it matters / follow-up:** Follow-up: "what is hydration?" (R2-MR-002).
**Learn more:** [SSR and Server Components](../../../04-advanced/05-ssr-and-server-components.md). The react.dev guide to server rendering APIs is the source.

### R2-MR-002 (Medium) Hydration and mismatches
**Answer:** With SSR the browser shows the server-made HTML immediately, but the page is not interactive yet. Hydration, done by `hydrateRoot`, is the step where React runs your components in the browser against that existing HTML and attaches event handlers, instead of creating the DOM from scratch. If the first client render produces different output than the server HTML, you get a hydration mismatch. Typical causes: `Date.now()`, `Math.random()`, `typeof window` checks, time zone or locale formatting that differs between server and browser, reading `localStorage` during render, invalid HTML nesting such as a `<div>` inside a `<p>`, and browser extensions that change the DOM. Fixes: render the same stable value first and update it in an effect, use `useId` for ids, and use `suppressHydrationWarning` for one unavoidable text difference. React 19 improved the error message by showing a diff. When a mismatch happens, React may fall back to client rendering for that part, which costs performance.
**Why it matters / follow-up:** Follow-up: "what is selective hydration?" With Suspense boundaries, React can hydrate parts independently and first the part the user interacts with.
**Learn more:** [SSR and Server Components](../../../04-advanced/05-ssr-and-server-components.md). The `hydrateRoot` page on react.dev is the source.

### R2-MR-003 (Medium) Server Components versus SSR
**Answer:** A Server Component runs only on the server, at build time or per request, and its code is never sent to the browser. It can be `async`, so it can read a database, files or secrets directly. Its output is a serialised description of the UI that React streams to the client. SSR is different: it renders any component, including Client Components, to HTML for a fast first paint, and then those components hydrate and run in the browser. SSR is about first-load speed, and Server Components are about shipping less JavaScript and getting data close to the source. They combine: the Server Component output can itself be turned into HTML by SSR. Server Components cannot use state, effects, event handlers or browser APIs, but they can render Client Components. You need a framework or bundler support, for example the Next.js App Router.
```jsx
// A Server Component (the default in the Next.js App Router)
export default async function Page() {
  const posts = await db.posts.findMany();
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;
}
```
**Why it matters / follow-up:** The red flag is "Server Components are just SSR". Say they are different and complementary.
**Learn more:** [SSR and Server Components](../../../04-advanced/05-ssr-and-server-components.md). The react.dev Server Components reference is the source.

### R2-MR-004 (Medium) What "use client" means
**Answer:** `"use client"` at the top of a file marks a module boundary. That file, and the modules it imports that are not already on the client side, become part of the client bundle, and its exports can be used as Client Components from Server Components. It does not mean "runs only in the browser": in typical frameworks Client Components are also pre-rendered to HTML on the server. You do not need it on every file, only at the entry of an interactive part. Add it when you need state, effects, event handlers, browser APIs or a context provider. Keep the boundary as low in the tree as you can, so most of the app stays on the server. Props that cross from server to client must be serialisable: strings, numbers, booleans, plain objects, arrays, `Date`, `Map`, `Set`, promises and Server Functions. Ordinary functions and class instances cannot cross.
**Why it matters / follow-up:** Follow-up: "can a Client Component import a Server Component?" Not directly. Pass the Server Component as `children` or another prop instead.
**Learn more:** [SSR and Server Components](../../../04-advanced/05-ssr-and-server-components.md). The react.dev `use client` reference is the source.

### R2-MR-005 (Hard) Server Actions are public endpoints
**Answer:** A function marked `"use server"` is a Server Function: the client can call it, and React turns the call into an HTTP request to an endpoint on your server. When a Server Function is passed to a form `action` or used inside an Action, people call it a Server Action. Anyone can send a request to that endpoint directly with any input, skipping your UI. So treat each one like a public API route. Check who is calling (authentication), check that they may do this to this record (authorisation, for example ownership), validate every input with a schema, never trust hidden fields or values taken from the client, and return only safe data. In December 2025 the React team patched a critical remote code execution flaw (CVE-2025-55182, CVSS 10.0) in how Server Function payloads were decoded, and it affected apps that support Server Components even if they defined no Server Functions. The lesson is to keep React and your framework patched.
```ts
"use server";
export async function deletePost(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const id = z.string().uuid().parse(formData.get("id"));
  await deletePostIfOwner(id, session.userId); // checks ownership in the query
}
```
**Why it matters / follow-up:** Follow-up: "is a Server Action safer than a REST endpoint?" No. It is the same trust boundary.
**Learn more:** [SSR and Server Components](../../../04-advanced/05-ssr-and-server-components.md). The react.dev `use server` reference and security advisory are the source.

### R2-MR-006 (Hard) Streaming SSR with Suspense
**Answer:** Classic SSR is all or nothing: the server waits for all the data before it sends any HTML. With streaming SSR the server sends the page shell immediately, which is the HTML outside Suspense boundaries plus the fallbacks. As the slow parts finish, it streams their HTML in later chunks, and a small script swaps each fallback for the real content. Each Suspense boundary can then hydrate on its own, and React can hydrate first the part the user is interacting with. The user sees content sooner (better time to first byte and first paint), and a slow widget no longer blocks the whole page. You get this through `renderToPipeableStream` or `renderToReadableStream`, or automatically in a framework (in the Next.js App Router, `loading.js` creates a Suspense boundary). Limits: the HTTP status and headers are sent before the stream, so an error after the shell cannot change the status code. Put boundaries around slow data, not around everything.
**Why it matters / follow-up:** Follow-up: "how does this relate to Server Components?" Both use Suspense boundaries as the units that can be streamed.
**Learn more:** [Concurrent React and Suspense](../../../04-advanced/03-concurrent-react-and-suspense.md)

### R2-MR-007 (Easy) What is new in React 19 and later
**Answer:** React 19.0 (December 2024) added Actions (async functions in transitions with automatic pending and error handling), `<form action>`, `useActionState`, `useFormStatus` (in `react-dom`), `useOptimistic`, and the `use` API. It also made `ref` a normal prop with ref cleanup functions, allowed `<Context value>` without `.Provider`, and rendering `<title>`, `<meta>` and `<link>` anywhere in the tree. It added stylesheet and script support, resource preloading APIs, better error reporting with new root options (`onCaughtError`, `onUncaughtError`, `onRecoverableError`), custom element support, and stable Server Components and Server Functions. 19.1 added owner stacks for debugging. 19.2 (October 2025) added `<Activity>` (hide parts of the UI while keeping their state), `useEffectEvent`, Chrome performance tracks and partial pre-rendering APIs. 19.3 (September 2026) added `<ViewTransition>` and Fragment refs.
**Why it matters / follow-up:** Follow-up: "what was removed?" (R2-MR-010).
**Learn more:** [React 19 and newer](../../../04-advanced/04-react-19-and-newer.md). The react.dev blog posts for each release are the source. [Concurrent React and Suspense](../../../04-advanced/03-concurrent-react-and-suspense.md) covers transitions and Suspense.

### R2-MR-008 (Medium) Form Actions, useActionState and useFormStatus
**Answer:** When you pass a function to `<form action={...}>`, React calls it with the form's `FormData` when the form is submitted, inside a transition. After the function finishes without error, React resets uncontrolled fields. `useActionState(action, initialState)` wraps such a function and returns `[state, formAction, isPending]`. Your action receives the previous state and the `FormData` and returns the next state, for example `{ error: "Email taken" }`, which you render. `isPending` lets you disable the button. In the example, `signupAction(prevState, formData)` would call the API and return an error object or a success object. `useFormStatus` is for a child component, such as a reusable submit button, to read `pending` and `data` of its parent form. It only sees the form that contains it, so it must be rendered inside the `<form>`, not in the same component that renders the form. `useFormState` is the old name of `useActionState`.
**Why it matters / follow-up:** With Server Functions, this also works before JavaScript loads (progressive enhancement).
**Learn more:** [Forms with libraries](../../../03-intermediate/04-forms-with-libraries.md)

### R2-MR-009 (Hard) The use API
**Answer:** `use(promise)` reads the value of a promise during render. If the promise is not settled, the component suspends and the nearest `Suspense` fallback shows. If it rejects, the nearest error boundary handles it. `use(context)` reads context like `useContext`. Unlike hooks, `use` can be called conditionally, in loops and after early returns, but it cannot be used inside `try/catch`. The promise must be stable across renders: if you write `use(fetch(...))` inside a Client Component's render, every render creates a new promise, which suspends again and again. React does not support that. Create the promise outside the render, in a Server Component, in a cache, or through a Suspense-aware library. A common pattern is that a Server Component starts the fetch and passes the promise as a prop to a Client Component that calls `use(promise)`.
**Why it matters / follow-up:** Follow-up: "how do you test it?" Rendering with plain `render()` may not recover from suspending, so wrap the render in `await act(async () => ...)`.
**Learn more:** [Concurrent React and Suspense](../../../04-advanced/03-concurrent-react-and-suspense.md)

### R2-MR-010 (Easy) Removed APIs in React 19
**Answer:** React 19 removed or ignores several old APIs. `propTypes` checks are silently ignored, so use TypeScript. `defaultProps` on function components is ignored, so use default parameters (classes still support `defaultProps`). `ReactDOM.render` and `ReactDOM.hydrate` are gone in favour of `createRoot` and `hydrateRoot`. `unmountComponentAtNode` is replaced by `root.unmount()`, and `findDOMNode` by refs. String refs, legacy context (`contextTypes`) and `React.createFactory` are gone. `react-dom/test-utils` is gone except a deprecated `act`, so import `act` from `react`. `forwardRef` still works, and `useFormState` was renamed to `useActionState`. To upgrade safely, first move to 18.3.1 and fix every warning, then update to 19 and run the official codemods.
**Why it matters / follow-up:** This is a quick check on whether your knowledge is current or from old tutorials.
**Learn more:** [React 19 and newer](../../../04-advanced/04-react-19-and-newer.md). The React 19 upgrade guide on react.dev is the source.

## Testing, types, architecture, accessibility and security
### R2-MS-001 (Medium) Testing philosophy and queries
**Answer:** The idea behind React Testing Library is to test what the user sees and does, not how the component is built. You render the component, interact like a user, and check what is on the screen. Tests that check state variables or internal function calls break on harmless refactors and can still pass when the real behaviour is broken. Pick queries in this order: `getByRole` (with a `name`) first, because it matches how assistive technology sees the page and also checks accessibility; then `getByLabelText`, `getByPlaceholderText`, `getByText` and `getByDisplayValue`; then `getByAltText` and `getByTitle`; and `getByTestId` only as a last resort. `getBy` throws if nothing is found, `queryBy` returns `null` (use it to assert something is absent), and `findBy` waits. Use `userEvent.setup()` and `await user.click(...)`, which simulates a real user better than `fireEvent`.
```jsx
const user = userEvent.setup();
render(<Counter />);
await user.click(screen.getByRole("button", { name: /add/i }));
expect(screen.getByText("Count: 1")).toBeInTheDocument();
```
**Why it matters / follow-up:** Follow-up: "unit versus integration versus end-to-end?" Most value comes from integration-style component tests, with a few Playwright or Cypress tests for key user journeys.
**Learn more:** [Testing React](../../../04-advanced/08-testing-react.md). The Testing Library docs are the source.

### R2-MS-002 (Medium) Async tests and mocking the network
**Answer:** For UI that updates later, wait for it the way a user would: `await screen.findByText("Saved")`, which retries until the element appears or a timeout (1 second by default) passes, or use `waitFor` for a custom assertion. Do not use arbitrary sleeps. "Not wrapped in act" warnings mean a state update happened outside the test's control. The cure is to await the thing that causes the update, not to silence the warning. For network calls, use MSW (Mock Service Worker). It intercepts real `fetch` calls at the network layer, so your component and your data-fetching code run unchanged, and the same handlers can be reused in development and in the browser. Mocking `fetch` or axios modules ties the test to implementation details. Define handlers with `http.get(...)` and `HttpResponse.json(...)`, reset them after each test, and override them with `server.use(...)` to test error states.
**Why it matters / follow-up:** Follow-up: "how do you test a custom hook?" Use `renderHook`, and test only what the hook returns.
**Learn more:** [Testing React](../../../04-advanced/08-testing-react.md). The Testing Library and MSW docs are the source.

### R2-MS-003 (Medium) TypeScript with React
**Answer:** For props, write an interface or type for the props object and destructure it, with `children: ReactNode` when you accept children. Give optional props a default through default parameters. State is inferred from the initial value, but give a generic when the start value is `null` or empty: `useState<User | null>(null)`. For events, use types such as `ChangeEvent<HTMLInputElement>`, or let inference work by writing the handler inline. Recent `@types/react` versions type `onSubmit` with `SubmitEvent` and deprecate `FormEvent`. For refs, use `useRef<HTMLInputElement>(null)`; the React 19 types require an argument to `useRef`. For context, avoid the lie `createContext<Ctx>({} as Ctx)`. Use `createContext<Ctx | null>(null)` and a `useCtx` hook that throws if the value is `null`. Type data from an API as `unknown` and validate it (for example with Zod) instead of casting with `as`.
```tsx
type ButtonProps = { label: string; onClick?: () => void; children?: ReactNode };
const [user, setUser] = useState<User | null>(null);
const inputRef = useRef<HTMLInputElement>(null);
```
**Why it matters / follow-up:** Follow-up: "interface or type?" Either works for props. Pick one convention and keep it.
**Learn more:** [TypeScript with React](../../../03-intermediate/08-typescript-with-react.md). The React TypeScript page on react.dev is the source.

### R2-MS-004 (Hard) Discriminated unions and generic components
**Answer:** A discriminated union is a union of object types that share a literal field, such as `type`, which TypeScript uses to narrow the type. For a reducer, each action gets its own shape. Inside `case "added"` the compiler knows that `action.text` exists, and dispatching `{ type: "toggled" }` without an `id` is a compile error. A `never` check in the default branch gives exhaustiveness: adding a new action without handling it fails to compile. A generic component takes a type parameter that is inferred from its props, so it stays type-safe for any item type. Add a constraint (`T extends { id: string }`) when you need a field. In a `.tsx` file an arrow generic needs `<T,>` or `<T extends unknown>` to avoid a JSX parsing clash.
```ts
type Todo = { id: number; text: string; done: boolean };

type Action =
  | { type: "added"; id: number; text: string }
  | { type: "toggled"; id: number }
  | { type: "cleared" };

function reducer(state: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case "added": return [...state, { id: action.id, text: action.text, done: false }];
    case "toggled": return state.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t));
    case "cleared": return [];
  }
}

function List<T extends { id: string }>({ items, render }: {
  items: T[];
  render: (item: T) => ReactNode;
}) {
  return <ul>{items.map((item) => <li key={item.id}>{render(item)}</li>)}</ul>;
}
```
**Why it matters / follow-up:** Follow-up: "how do you type a polymorphic `as` prop?" It is an advanced pattern. Mention that it needs generics and `ComponentPropsWithoutRef`.
**Learn more:** [useReducer](../../../02-hooks/06-usereducer.md). No dedicated TypeScript lesson yet (see [REMAINING.md](../../../REMAINING.md)).

### R2-MS-005 (Easy) HOCs, render props and custom hooks
**Answer:** A higher-order component (HOC) is a function that takes a component and returns an enhanced one, such as `withAuth(Page)`; Redux `connect` was a famous example. A render prop is a prop that is a function returning JSX, used to share behaviour, such as `<Mouse render={(pos) => ...} />`. A custom hook shares stateful logic as a plain function call. Hooks replaced most HOCs and render props because they do not add wrapper layers to the tree, have no prop-name collisions, make data flow easy to read and are easier to type. HOCs and render props still appear in older code and some library APIs (for example `renderItem` in virtualised lists). Related composition tools are `children` and slot props, and compound components such as `<Tabs><Tabs.List>` that share hidden state through context. React favours composition over inheritance: you never need class inheritance for UI.
**Why it matters / follow-up:** Follow-up: "how would you read or migrate a `connect(mapStateToProps)` component?" Replace it with `useSelector` and `useDispatch`.
**Learn more:** [Component patterns](../../../03-intermediate/01-component-patterns.md)

### R2-MS-006 (Medium) Error boundaries
**Answer:** An error boundary catches errors thrown while rendering its children, in their lifecycle methods and in constructors, and shows a fallback UI instead of a blank screen. It does not catch errors in event handlers (use `try/catch` there), in async code such as timeouts and promises, during server rendering, or in the boundary itself. Boundaries are still class components (`getDerivedStateFromError`, `componentDidCatch`), so in function-based code people use the `react-error-boundary` package. In a real app, place one at the top, one per route or major section, and one around risky widgets, and offer a "try again" action that resets the boundary (for example by changing a key). For reporting, send errors to your tracker from `componentDidCatch`, or use the React 19 root options: `onCaughtError` for errors a boundary caught, `onUncaughtError` for errors no boundary caught, and `onRecoverableError` for errors React recovered from.
**Why it matters / follow-up:** Follow-up: "how do you handle an error in an async event handler?" Catch it and set error state, then show it or rethrow it during render.
**Learn more:** [Error boundaries, portals and friends](../../../03-intermediate/05-error-boundaries-portals-and-friends.md)

### R2-MS-007 (Medium) Accessibility basics
**Answer:** Start with semantic HTML. A `<button>`, `<a>`, `<label>`, `<nav>` or heading gives you keyboard behaviour, focus and screen reader meaning for free, while `<div onClick>` gives you none. ARIA only changes what assistive technology announces, never the behaviour: `role="button"` on a `div` still needs `tabIndex` and Enter and Space key handlers. The first rule of ARIA is not to use it when a native element exists. For forms, every input needs a label, and errors should be linked with `aria-describedby` and `aria-invalid`. Images need meaningful `alt` text, or an empty `alt=""` when decorative. A modal dialog must move focus into itself on open, keep Tab inside, close on Escape and return focus to the button that opened it. The native `<dialog>` element with `showModal()` handles much of this. For toasts and async messages use a live region (`role="status"` or `aria-live="polite"`) that already exists in the DOM before its text changes. Test with an automated tool like axe, plus manual keyboard and screen reader checks, because tools find only part of the problems.
**Why it matters / follow-up:** Follow-up: "what changes on route change in a single-page app?" Move focus to the new page heading and update the document title.
**Learn more:** [Accessibility](../../../04-advanced/09-accessibility.md). The MDN accessibility guides are a good source.

### R2-MS-008 (Medium) XSS, tokens and secrets
**Answer:** React escapes values you put in JSX, so `<div>{userInput}</div>` is safe from script injection. You are still exposed when you use `dangerouslySetInnerHTML` (sanitise the HTML first, for example with DOMPurify), when you put user-controlled values in `href` or `src` (a `javascript:` URL can run code, so allow only `http`, `https` and `mailto`), or when you build HTML strings, use `eval`, or load untrusted third-party scripts. A Content Security Policy adds defence in depth. For tokens, anything in `localStorage` can be read by any script on the page, so one XSS bug can steal the session. An `HttpOnly`, `Secure` cookie with a `SameSite` setting cannot be read by JavaScript, but cookies are sent automatically, so you also need CSRF protection (`SameSite`, CSRF tokens). Never put secrets in the client bundle: environment variables with the `VITE_` or `NEXT_PUBLIC_` prefix are inlined into the code that every visitor downloads.
**Why it matters / follow-up:** Follow-up: "is `localStorage` always wrong for tokens?" It is a trade-off. Say clearly what risk you accept and how you reduce it (short-lived tokens, strict CSP).
**Learn more:** [Security and internationalisation](../../../04-advanced/10-security-and-i18n.md). The react.dev docs on `dangerouslySetInnerHTML` and the OWASP guides are good sources.
