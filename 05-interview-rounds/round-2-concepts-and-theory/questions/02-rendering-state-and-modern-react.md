# Round 2 - Concepts and Theory: Rendering, State and Modern React

**How to use this file:** Give yourself 3 to 5 minutes per question. Say the answer out loud, with a small code or drawing example when it helps, then compare with the answers file. Score 2 for a complete and correct answer, 1 for partly right, 0 for missed. These questions are "explain it to me" questions, so practise saying why, not just what.
**Answers:** [answers/02-rendering-state-and-modern-react.md](../answers/02-rendering-state-and-modern-react.md)  (do not open until you have tried)
**Learn first:** [How React renders](../../../04-advanced/01-how-react-renders.md), [Concurrent React and Suspense](../../../04-advanced/03-concurrent-react-and-suspense.md), [Memoization](../../../02-hooks/07-memoization.md), [Component patterns](../../../03-intermediate/01-component-patterns.md), [Data fetching](../../../03-intermediate/02-data-fetching.md), [React Router](../../../03-intermediate/03-react-router.md), [Forms with libraries](../../../03-intermediate/04-forms-with-libraries.md), [Error boundaries, portals and friends](../../../03-intermediate/05-error-boundaries-portals-and-friends.md), [State management](../../../03-intermediate/06-state-management.md)

## Rendering and performance
**R2-RP-001 (Easy)** What causes a component to re-render?

**R2-RP-002 (Medium)** Explain the three steps React goes through to show an update (trigger, render, commit). Is a "render" the same as a DOM update?

**R2-RP-003 (Medium)** How does React decide between updating the existing DOM and tearing it down? Explain reconciliation and the role of keys.

**R2-RP-004 (Medium)** A user types in the input, then clicks the button. The text they typed disappears. Why?

```jsx
function Page() {
  const [n, setN] = useState(0);

  function Panel() {
    return <input placeholder="Type here" />;
  }

  return (
    <>
      <button onClick={() => setN(n + 1)}>Clicked {n}</button>
      <Panel />
    </>
  );
}
```

**R2-RP-005 (Medium)** When a parent re-renders, do all its children re-render? How would you cut unnecessary re-renders, and how do you find out why something re-rendered?

**R2-RP-006 (Medium)** What is code splitting, and how do `React.lazy` and `Suspense` implement it? Where do you split first?

**R2-RP-007 (Easy)** A page has to show 10,000 rows. What is the problem, and what is list virtualisation?

**R2-RP-008 (Hard)** Compare `useTransition` and `useDeferredValue`. When do you use each, and how do they relate to the Core Web Vital INP?

**R2-RP-009 (Medium)** What does the React Compiler do? What must your code look like for it to work, and when do you still write `useMemo` by hand?

## State management, data and routing
**R2-ST-001 (Medium)** Name the kinds of state in a React app (local, shared client, server, URL) and say where each one should live.

**R2-ST-002 (Medium)** Context versus Redux Toolkit versus Zustand: how do you choose? Why do many apps no longer need Redux?

**R2-ST-003 (Medium)** Why use TanStack Query instead of fetching in `useEffect`? Explain stale-while-revalidate and cache invalidation.

**R2-ST-004 (Hard)** What is a request waterfall, what causes it in a React app, and how do you remove it?

```jsx
function Profile({ id }) {
  const { data: user } = useQuery({ queryKey: ["user", id], queryFn: () => getUser(id) });
  return user ? <Posts userId={user.id} /> : <Spinner />;
}
// Posts then runs its own useQuery for the posts of that user
```

**R2-ST-005 (Hard)** What is an optimistic update? How does `useOptimistic` revert on failure, and how would you do it with TanStack Query?

**R2-ST-006 (Easy)** How does client-side routing work without a full page reload? What does the server have to do for deep links?

**R2-ST-007 (Medium)** How do you protect routes in a React app? Is hiding a route enough? What do loaders and actions add?

**R2-ST-008 (Medium)** Compare controlled forms with React Hook Form. When do you validate (blur, change, submit), and how do you make errors accessible?

## Server rendering and modern React
**R2-MR-001 (Easy)** Compare CSR, SSR, SSG and ISR. When would you pick each?

**R2-MR-002 (Medium)** What is hydration, and what causes a hydration mismatch?

**R2-MR-003 (Medium)** What is a React Server Component, and why is it not the same thing as server-side rendering?

**R2-MR-004 (Medium)** What does `"use client"` actually do? Which props can cross from a Server Component to a Client Component?

**R2-MR-005 (Hard)** What is a Server Action (Server Function), and why must you treat it like a public API endpoint?

**R2-MR-006 (Hard)** How does streaming SSR with Suspense work, and what does the user gain?

**R2-MR-007 (Easy)** List the headline features of React 19, and the main additions in 19.1, 19.2 and 19.3.

**R2-MR-008 (Medium)** How do form Actions, `useActionState` and `useFormStatus` work together?

```jsx
function Signup() {
  const [state, formAction, isPending] = useActionState(signupAction, null);
  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <button disabled={isPending}>Sign up</button>
      {state?.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

**R2-MR-009 (Hard)** What does the `use` API do? How is it different from a hook, and why can you not create the promise inside a Client Component's render?

**R2-MR-010 (Easy)** Which APIs were removed in React 19, and how do you upgrade safely?

## Testing, types, architecture, accessibility and security
**R2-MS-001 (Medium)** What is the testing philosophy behind React Testing Library? In what order should you pick queries, and why?

**R2-MS-002 (Medium)** How do you test async UI? Why mock the network with MSW instead of mocking `fetch`?

**R2-MS-003 (Medium)** How do you type props, state, events, refs and context in TypeScript with React?

**R2-MS-004 (Hard)** What is a discriminated union, and how does it make a reducer's actions type-safe? How do you write a generic component?

**R2-MS-005 (Easy)** Compare higher-order components, render props and custom hooks. Which do you reach for today?

**R2-MS-006 (Medium)** What do error boundaries catch and not catch? How would you use them in a real app and report errors?

**R2-MS-007 (Medium)** What are the basics of accessibility in React: semantic HTML, the rules of ARIA, forms, and focus management in a modal?

**R2-MS-008 (Medium)** How does React protect against XSS, and where can you still be vulnerable? Where should you store auth tokens, and what must never go into the client bundle?
