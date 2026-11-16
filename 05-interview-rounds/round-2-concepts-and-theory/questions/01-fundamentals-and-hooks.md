# Round 2 - Concepts and Theory: Fundamentals and Hooks

**How to use this file:** Give yourself 3 to 5 minutes per question. Say the answer out loud as if an interviewer were sitting across from you, then write down the key points you hit. Only then open the answers file and score yourself: 2 points for a complete and correct answer, 1 point for partly right, 0 for missed. Mark anything under 2 and redo it tomorrow.
**Answers:** [answers/01-fundamentals-and-hooks.md](../answers/01-fundamentals-and-hooks.md)  (do not open until you have tried)
**Learn first:** [What is React](../../../01-basics/02-what-is-react.md), [JSX](../../../01-basics/03-jsx.md), [Components and props](../../../01-basics/04-components-and-props.md), [State and events](../../../01-basics/05-state-and-events.md), [Conditional rendering and lists](../../../01-basics/06-conditional-rendering-and-lists.md), [Forms](../../../01-basics/07-forms.md), [Thinking in React](../../../01-basics/08-thinking-in-react.md), [Hooks overview and rules](../../../02-hooks/01-hooks-overview-and-rules.md), [useState in depth](../../../02-hooks/02-usestate-in-depth.md), [useEffect](../../../02-hooks/03-useeffect.md), [useRef](../../../02-hooks/04-useref.md), [useContext](../../../02-hooks/05-usecontext.md), [useReducer](../../../02-hooks/06-usereducer.md), [Memoization](../../../02-hooks/07-memoization.md), [Custom hooks](../../../02-hooks/08-custom-hooks.md)

## What React is and how it thinks
**R2-FN-001 (Easy)** What is React, and what problem does it solve compared with writing DOM code by hand?

**R2-FN-002 (Easy)** Is React a library or a framework? Name three things React does not give you out of the box.

**R2-FN-003 (Easy)** Explain "declarative" versus "imperative" UI. Show the difference with a tiny example.

**R2-FN-004 (Medium)** What is the virtual DOM? Is it the reason React is fast?

**R2-FN-005 (Medium)** What is the difference between a component, an element and an instance?

## Components, JSX and lists
**R2-FN-006 (Easy)** Function components versus class components: why did function components win, and what can only classes still do?

**R2-FN-007 (Medium)** What makes a component "pure"? What counts as a side effect, and where should side effects go?

**R2-FN-008 (Easy)** Props are read-only and data flows one way. What does that mean, why is it a good thing, and what is prop drilling?

**R2-FN-009 (Easy)** What does JSX compile to? Do you still need `import React from "react"` in every file?

**R2-FN-010 (Medium)** What can you put inside `{}` in JSX, and what does React render for `null`, `false`, `undefined` and `0`? What is wrong with this line?

```jsx
{items.length && <List items={items} />}
```

**R2-FN-011 (Medium)** Why does React need `key` on list items? Why are array indexes risky as keys, and when are they fine?

```jsx
{todos.map((todo, index) => (
  <TodoRow key={index} todo={todo} />
))}
```

## Props, state and forms
**R2-FN-012 (Easy)** Controlled versus uncontrolled components: what is the difference and when would you choose each?

**R2-FN-013 (Easy)** What is the difference between props and state?

**R2-FN-014 (Easy)** What does "lifting state up" mean, and what is a "single source of truth"?

**R2-FN-015 (Medium)** You click the button once. What does the console show, and why?

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
    console.log(count);
  }

  return <button onClick={handleClick}>Clicked {count} times</button>;
}
```

**R2-FN-016 (Medium)** What is the final count after one click in each version, and why? What is batching?

```jsx
// Version A
function handleClickA() {
  setCount(count + 1);
  setCount(count + 1);
}

// Version B
function handleClickB() {
  setCount((c) => c + 1);
  setCount((c) => c + 1);
}
```

**R2-FN-017 (Easy)** Why must you not mutate state objects and arrays directly? How do you update them correctly?

```jsx
function addTodo(text) {
  todos.push({ id: nextId++, text });
  setTodos(todos);
}
```

**R2-FN-018 (Medium)** Why is copying a prop into state (or storing computed values in state) a common bug? What are the fixes, including resetting state with a `key`?

```jsx
function Profile({ user }) {
  const [name, setName] = useState(user.name);
  const [fullName, setFullName] = useState(user.first + " " + user.last);
  // ...
}
```

## Hooks: basics and effects
**R2-HK-001 (Easy)** What are hooks, and why were they introduced?

**R2-HK-002 (Medium)** State the rules of hooks. Why does call order matter?

**R2-HK-003 (Medium)** What is `useEffect` for, and what is it not for?

**R2-HK-004 (Easy)** Explain the dependency array: what happens with no array, with `[]`, and with `[a, b]`?

**R2-HK-005 (Easy)** What is the cleanup function of an effect, when does it run, and what is it for?

**R2-HK-006 (Hard)** This timer gets stuck at 1. Why, and how do you fix it?

```jsx
function Timer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return <p>{count}</p>;
}
```

**R2-HK-007 (Hard)** Why should you not silence the `exhaustive-deps` lint rule? What can you do instead, and where does `useEffectEvent` fit?

**R2-HK-008 (Medium)** Why do effects run twice in development? Should you work around it?

**R2-HK-009 (Medium)** "You might not need an effect." Give the common cases where an effect is the wrong tool and what to do instead.

**R2-HK-010 (Hard)** What race condition can happen when you fetch data in an effect, and how do you prevent it?

```jsx
useEffect(() => {
  fetch(`/api/users/${id}`)
    .then((res) => res.json())
    .then(setUser);
}, [id]);
```

**R2-HK-011 (Medium)** What is the difference between `useEffect` and `useLayoutEffect`? When do you really need the second one?

## Hooks: refs, context, reducers, memoization and custom hooks
**R2-HK-012 (Easy)** What are the main uses of `useRef`, and why does changing `ref.current` not re-render?

**R2-HK-013 (Medium)** How do refs reach a child component in React 19? What happened to `forwardRef`?

**R2-HK-014 (Medium)** How does context cause re-renders? How do you avoid unnecessary ones?

**R2-HK-015 (Medium)** When would you choose `useReducer` over `useState`?

**R2-HK-016 (Hard)** What do `useMemo`, `useCallback` and `React.memo` each do? Why can `React.memo` silently fail to help? Does the React Compiler change this?

```jsx
const Row = memo(function Row({ item, onSelect }) {
  return <li onClick={() => onSelect(item.id)}>{item.name}</li>;
});

function List({ items }) {
  return items.map((item) => (
    <Row key={item.id} item={item} onSelect={(id) => console.log(id)} />
  ));
}
```

**R2-HK-017 (Easy)** What is a custom hook, and when do you extract one? If two components call the same custom hook, do they share state?
