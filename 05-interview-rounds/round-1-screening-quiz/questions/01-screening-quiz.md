# Round 1 - Screening Quiz: 90 Quick Questions

**How to use this file:** Spend about 30 seconds on each question. Say your answer out loud, then give yourself 1 point for a correct core idea, half a point for a partly correct answer, and 0 for a wrong or skipped answer. Do not open the answers until you have tried the whole set (or at least the whole section).  
**Answers:** [answers/01-screening-quiz.md](../answers/01-screening-quiz.md)  (do not open until you have tried)  
**Learn first:** [What is React](../../../01-basics/02-what-is-react.md), [JSX](../../../01-basics/03-jsx.md), [Components and props](../../../01-basics/04-components-and-props.md), [State and events](../../../01-basics/05-state-and-events.md), [Conditional rendering and lists](../../../01-basics/06-conditional-rendering-and-lists.md), [Forms](../../../01-basics/07-forms.md), [Hooks overview and rules](../../../02-hooks/01-hooks-overview-and-rules.md), [useState in depth](../../../02-hooks/02-usestate-in-depth.md), [useEffect](../../../02-hooks/03-useeffect.md), [useRef](../../../02-hooks/04-useref.md), [useContext](../../../02-hooks/05-usecontext.md), [Memoization](../../../02-hooks/07-memoization.md), [How React renders](../../../04-advanced/01-how-react-renders.md), [Performance optimization](../../../04-advanced/02-performance-optimization.md), [SSR and Server Components](../../../04-advanced/05-ssr-and-server-components.md), [React 19 and newer](../../../04-advanced/04-react-19-and-newer.md), [Testing React](../../../04-advanced/08-testing-react.md), [Accessibility](../../../04-advanced/09-accessibility.md), [Security and i18n](../../../04-advanced/10-security-and-i18n.md), [JavaScript deep dive for interviews](../../../01-basics/10-javascript-deep-dive-for-interviews.md), HTML, CSS and browser basics (planned)

## Basics: React fundamentals

**R1-BS-001 (Easy)** In one sentence, what is React?

**R1-BS-002 (Easy)** True or false, with a reason: React is a full framework that includes routing and data fetching.

**R1-BS-003 (Easy)** Is React declarative or imperative, and what does that mean in one line?

**R1-BS-004 (Medium)** True or false: the virtual DOM is the reason React is fast.

**R1-BS-005 (Easy)** Do you write function components or class components today, and is there anything only a class can do?

## Basics: JSX and lists

**R1-BS-006 (Easy)** What does JSX compile to, and do you still need `import React` at the top of every file?

**R1-BS-007 (Easy)** Which two HTML attribute names change in JSX, and what do they become?

**R1-BS-008 (Easy)** True or false: a component can return two sibling elements with no wrapper at all.

**R1-BS-009 (Easy)** What can you put inside curly braces in JSX?

**R1-BS-010 (Easy)** With `count = 0`, what does `{count && <Badge />}` render?

**R1-BS-011 (Easy)** What is the bug here?

```jsx
<button onClick={handleSave()}>Save</button>
```

**R1-BS-012 (Easy)** True or false: `{false}` shows the text "false" on the screen.

**R1-BS-013 (Easy)** Why does each item in a rendered list need a `key`?

**R1-BS-014 (Medium)** Why is using the array index as a key risky, and when is it fine?

## Basics: props, state and forms

**R1-BS-015 (Easy)** What is the difference between props and state?

**R1-BS-016 (Easy)** True or false: a child component may change the props it receives.

**R1-BS-017 (Easy)** What is prop drilling, and name one way to avoid it.

**R1-BS-018 (Easy)** What is the `children` prop?

**R1-BS-019 (Easy)** What is the difference between a controlled and an uncontrolled input?

**R1-BS-020 (Medium)** What happens with `<input value={name} />` and no `onChange`?

**R1-BS-021 (Easy)** What does "lifting state up" mean?

**R1-BS-022 (Medium)** You click the button once. What does `console.log` print, and what does the screen show afterwards?

```jsx
function Counter() {
  const [n, setN] = useState(0)
  function handleClick() {
    setN(n + 1)
    console.log(n)
  }
  return <button onClick={handleClick}>Clicked {n}</button>
}
```

**R1-BS-023 (Medium)** Does this update the screen? Why or why not?

```jsx
function addItem() {
  items.push('new')
  setItems(items)
}
```

**R1-BS-024 (Easy)** Name three things that make a component re-render.

**R1-BS-025 (Medium)** True or false: when a parent re-renders, all of its children re-render too.

**R1-BS-026 (Easy)** What makes a component "pure", and what counts as a side effect?

## Hooks: state and rules

**R1-HK-001 (Easy)** What is a hook?

**R1-HK-002 (Easy)** What are the two rules of hooks, and why do they exist?

**R1-HK-003 (Easy)** True or false: it is fine to call `useState` inside an `if` block if the condition rarely changes.

**R1-HK-004 (Easy)** What does `useState(0)` return?

**R1-HK-005 (Medium)** After one click on each button, what are the values of `a` and `b`?

```jsx
const [a, setA] = useState(0)
const [b, setB] = useState(0)

// click handler of button A
setA(a + 1); setA(a + 1); setA(a + 1)

// click handler of button B
setB(x => x + 1); setB(x => x + 1); setB(x => x + 1)
```

**R1-HK-006 (Medium)** What is lazy initial state, and why use it?

## Hooks: effects and refs

**R1-HK-007 (Easy)** What is `useEffect` for?

**R1-HK-008 (Easy)** What do the three forms of the dependency array do: none, `[]`, and `[a, b]`?

**R1-HK-009 (Easy)** When does an effect's cleanup function run?

**R1-HK-010 (Medium)** True or false: you can write `useEffect(async () => { ... })`.

**R1-HK-011 (Medium)** Why does my effect run twice in development?

**R1-HK-012 (Medium)** Why does this loop forever, and how do you fix it?

```jsx
useEffect(() => {
  setCount(count + 1)
})
```

**R1-HK-013 (Medium)** Why should you not silence the `exhaustive-deps` lint warning?

**R1-HK-014 (Hard)** After 5 seconds, what number is on the screen, and why?

```jsx
function Timer() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setN(n + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return <p>{n}</p>
}
```

**R1-HK-015 (Easy)** Does changing `ref.current` re-render the component?

**R1-HK-016 (Medium)** When do you use state, a ref, or a plain variable inside a component?

**R1-HK-017 (Medium)** What is the difference between `useEffect` and `useLayoutEffect`?

## Hooks: memoization, context and more

**R1-HK-018 (Easy)** What is the difference between `useMemo` and `useCallback`?

**R1-HK-019 (Medium)** You wrapped a child in `React.memo`, but it still re-renders every time. Name one cause.

**R1-HK-020 (Medium)** When should you not use `useMemo` or `React.memo`?

**R1-HK-021 (Medium)** What happens to components that read a context when the Provider's value changes?

**R1-HK-022 (Medium)** When would you choose `useReducer` over `useState`?

**R1-HK-023 (Easy)** If two components call the same custom hook, do they share state?

**R1-HK-024 (Medium)** What is `useId` for, and can you use it as a list key?

**R1-HK-025 (Hard)** In one line each, how do `useTransition` and `useDeferredValue` differ?

## Advanced: rendering and performance

**R1-AD-001 (Medium)** What are the three steps from a state change to the screen?

**R1-AD-002 (Hard)** Why is this a problem? What happens each time the button is clicked?

```jsx
function Page() {
  const [n, setN] = useState(0)
  function Panel() {
    return <input aria-label="note" />
  }
  return (
    <>
      <button onClick={() => setN(n + 1)}>Clicked {n}</button>
      <Panel />
    </>
  )
}
```

**R1-AD-003 (Medium)** When does React keep a component's state, and when does it reset it?

**R1-AD-004 (Easy)** How do you find out why a component re-renders or why the app is slow?

**R1-AD-005 (Medium)** What do `React.lazy` and `Suspense` do, and where do you usually split code?

**R1-AD-006 (Easy)** What is list virtualization (windowing), and when do you need it?

**R1-AD-007 (Medium)** Name the three Core Web Vitals and what each measures.

## Advanced: ecosystem, state, routing and forms

**R1-AD-008 (Easy)** How should you start a new React app today?

**R1-AD-009 (Medium)** What are the main kinds of state in a React app, and what do you use for each?

**R1-AD-010 (Medium)** Why use TanStack Query instead of fetching inside `useEffect`?

**R1-AD-011 (Easy)** How does client-side routing change the page without a full reload?

**R1-AD-012 (Easy)** How do you make a route available only to logged-in users?

**R1-AD-013 (Easy)** Should you validate a form on the client, on the server, or both?

## Advanced: testing and TypeScript

**R1-AD-014 (Easy)** What is the main idea of React Testing Library, and which query do you try first?

**R1-AD-015 (Medium)** What is the difference between `getBy`, `queryBy` and `findBy` queries?

**R1-AD-016 (Easy)** How do you type a component's props in TypeScript?

**R1-AD-017 (Medium)** How do you type an input's `onChange` handler, and a ref to a DOM element?

## Advanced: SSR, Server Components and React 19

**R1-AD-018 (Medium)** In one line each, what are CSR, SSR and SSG?

**R1-AD-019 (Hard)** What is a hydration mismatch, and what usually causes it?

**R1-AD-020 (Hard)** What is a Server Component, how is it different from SSR, and what does `"use client"` do?

**R1-AD-021 (Medium)** Name the headline new things in React 19.

**R1-AD-022 (Easy)** In React 19, how do you pass a ref to a function component, and how do you provide a context value?

**R1-AD-023 (Hard)** What does the `use` API do, and how is it different from other hooks?

**R1-AD-024 (Hard)** How does `useOptimistic` behave when the request fails?

## Advanced: accessibility and security

**R1-AD-025 (Easy)** Why use semantic HTML before ARIA?

**R1-AD-026 (Medium)** What must a modal dialog do for keyboard and screen reader users?

**R1-AD-027 (Easy)** Does React protect you from XSS, and which API is the risky one?

**R1-AD-028 (Medium)** Where should you store an auth token: localStorage or a cookie?

**R1-AD-029 (Hard)** Why must a Server Action (server function) validate its input and check permissions?

## JavaScript and CSS quick checks

**R1-JS-001 (Easy)** What does this print?

```js
console.log(typeof null)
```

**R1-JS-002 (Easy)** What does this print?

```js
console.log(0.1 + 0.2 === 0.3)
```

**R1-JS-003 (Easy)** What does this print?

```js
console.log('5' == 5, '5' === 5, null == undefined)
```

**R1-JS-004 (Medium)** What does this print?

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)
}
```

**R1-JS-005 (Medium)** In what order does this print?

```js
console.log('A')
setTimeout(() => console.log('B'), 0)
Promise.resolve().then(() => console.log('C'))
console.log('D')
```

**R1-JS-006 (Easy)** What do `forEach` and `map` return, and which one do you use to turn data into a list of JSX elements?

**R1-JS-007 (Easy)** What does this print?

```js
const a = [1, 2, 3]
const b = a
b.push(4)
console.log(a.length)
```

**R1-JS-008 (Medium)** What is a closure, and why does it matter in React?

**R1-JS-009 (Easy)** A box has `width: 200px; padding: 20px; border: 5px solid black;`. What is its total width with the default `box-sizing`, and with `box-sizing: border-box`?

**R1-JS-010 (Easy)** How do you center a child both horizontally and vertically with flexbox?
