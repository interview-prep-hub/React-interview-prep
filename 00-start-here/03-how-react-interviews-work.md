# How React Interviews Work

> **Level:** Beginner   **Time:** about 25 minutes   **Read first:** [How to use this repo](./01-how-to-use-this-repo.md), [Set up your playground](./02-setup-your-playground.md)

A React interview is not one test. It is a series of short conversations, and each one checks a different skill. If you know what each stage looks like, you can practise for it on purpose instead of "studying React" in general. This page is the map. The rest of the book is the territory.

## What you will learn
- Describe the usual stages of a React or frontend interview loop, in order.
- Explain what each of the nine rounds tests, how long it lasts, which tools it uses, how it is scored and where to practise it in this book.
- Compare what junior, mid, senior and staff candidates are expected to show.
- Follow a repeatable routine in a live coding round (clarify, plan, build, test, explain), and handle being stuck, trade-offs and hints without losing points.
- Choose where to spend your prep time for each type of company, and prepare for take-home tasks, pair programming and interviews where AI coding tools are allowed.
- Replace outdated advice with what changed in React interviews between 2024 and 2026.

## 1. The big picture: what is an interview loop?

An **interview loop** is the full list of conversations between "we liked your CV" and "here is an offer". Each conversation is a **round**. Companies pick their own mix. Here is a loop you might meet at a mid-sized product company:

```text
1. Recruiter call            20-30 min   about you, pay, timeline, the process
2. Screening quiz            30-60 min   short JavaScript and React questions
3. Build a UI                45-90 min   "machine coding" in a browser editor
4. JavaScript coding         45-60 min   write a helper such as debounce
5. Frontend system design    45-60 min   design a feature on a whiteboard
6. Hiring manager            30-45 min   your past work and your goals
```

A big company may run all of these and add more. A small startup may run two or three, or swap them for a take-home task.

**A note on the numbers in this guide.** Lengths and formats come from company hiring pages, prep guides and candidate reports. Companies change them often, and no public dataset counts how often each question is asked. When this page says "commonly", it means "it shows up in many sources", not "someone measured it". What your recruiter tells you about your own loop beats anything written here.

### How the stages map to this book

This book has nine rounds. Each one has a folder with a README, question files and model answers.

| Stage in a real loop | Typical length | Round in this book |
|---|---|---|
| Screening quiz or phone screen | 30-60 min | [Round 1: Screening quiz](../05-interview-rounds/round-1-screening-quiz/README.md) |
| Concepts and theory discussion | 45-60 min | [Round 2: Concepts and theory](../05-interview-rounds/round-2-concepts-and-theory/README.md) |
| Output prediction and debugging | 30-45 min | [Round 3: Output and debugging](../05-interview-rounds/round-3-output-and-debugging/README.md) |
| Machine coding (build a UI) | 45-90 min | [Round 4: Machine coding](../05-interview-rounds/round-4-machine-coding/README.md) |
| JavaScript coding | 45-60 min | [Round 5: JavaScript coding](../05-interview-rounds/round-5-javascript-coding/README.md) |
| Code review and refactoring | 30-60 min | [Round 6: Code review and refactoring](../05-interview-rounds/round-6-code-review-and-refactoring/README.md) |
| Performance and testing | 45-60 min | [Round 7: Performance and testing](../05-interview-rounds/round-7-performance-and-testing/README.md) |
| Frontend system design | 45-60 min | [Round 8: Frontend system design](../05-interview-rounds/round-8-frontend-system-design/README.md) |
| Behavioral and project discussion | 30-45 min | [Round 9: Behavioral and project](../05-interview-rounds/round-9-behavioral-and-project/README.md) |

The recruiter call is not a round, but prepare for it: see questions to ask and HR topics (planned). For all nine rounds side by side, how to run a mock round and how to score yourself, open the [interview rounds overview](../05-interview-rounds/README.md).

**Scope note:** this book covers React for the web, so React Native (mobile apps) is out of scope. If your job is React Native, ask your recruiter which round formats apply.

### Ask before you prepare

Send your recruiter these questions early. The answers decide what you practise.

1. Which rounds are there, in what order, and how long is each?
2. For coding rounds, which tool: a browser editor with a live preview, an editor without a preview, a shared document, or my own laptop with screen sharing?
3. Which language: React with JavaScript, React with TypeScript, or plain JavaScript?
4. Is any round a take-home task? How many hours are expected, and when is it due?
5. May I search the web, and may I use AI coding tools in each round?
6. Which level am I being interviewed for?

**Example.** A recruiter writes: "Step 1: 45-minute JavaScript and React quiz. Step 2: 60-minute build a component in CodeSandbox. Step 3: 45-minute design discussion. Step 4: 30 minutes with the hiring manager."

**What happens, step by step:**
1. Steps 1 and 2 are a quiz and a machine coding round, so you use Rounds 1, 4 and 5 and time yourself on the practice app exercises.
2. Step 3 is frontend system design, so you use Round 8 and the [frontend system design lesson](../04-advanced/11-frontend-system-design.md).
3. Step 4 is a behavioral round, so you use Round 9. Rounds 3, 6 and 7 are not in this loop, so they come last.

## 2. The nine rounds, one by one

Every round below uses the same labels, so you can compare them. Most companies do not publish their scoring forms. In general, interviewers take notes on a few themes (correct answers, quality of reasoning, code quality, communication) and give a recommendation such as "strong yes" or "no". The themes below come up again and again in hiring pages and prep guides.

### Round 1: Screening quiz

Many short questions, answered fast.

- **What is tested:** breadth. JSX, props versus state, keys, the rules of hooks, events, controlled inputs, basic JavaScript, sometimes HTML and CSS.
- **Length:** commonly 30-60 minutes on a call, or a timed online test.
- **Tools:** phone or video call, a shared document or editor, or a quiz platform.
- **How it is scored:** usually against a checklist of key points per question, with a pass mark. Short and correct beats long and vague.
- **A strong performance:** two or three sentences per answer, the rule named, one tiny example. When you do not know, you say so and reason from what you do know.
- **Typical mistakes:** rambling, reciting definitions, and repeating old tutorial claims such as "`setState` is asynchronous".
- **Practise it:** [Round 1 README](../05-interview-rounds/round-1-screening-quiz/README.md).

**Example: "What is the difference between props and state?"**

Weak answer:

```text
Props are data you pass in. State is data inside the component. State can change.
```

Strong answer:

```text
Props are the inputs a parent gives to a component. The component must treat them as
read-only. State is memory that the component owns. When the component calls the setter
function, React renders it again with the new value. A parent's state often becomes a
child's props. For example, a Counter owns count as state and passes it to a Display
child as a prop.
```

**What makes the second answer strong, step by step:**
1. It says who owns each one, and states the rule that props are read-only.
2. It says what happens when state changes (a new render).
3. It ties the two ideas together with one small example, in about 20 seconds.

### Round 2: Concepts and theory

A conversation where each answer leads to a deeper "why".

- **What is tested:** depth and honesty. Rendering and reconciliation, effects and cleanup, context, memoisation, state management choices, data fetching, Server Components versus server-side rendering, and trade-offs.
- **Length:** commonly 45-60 minutes.
- **Tools:** a video call, sometimes a shared document for a quick sketch. Little or no code.
- **How it is scored:** accuracy, depth, and whether you can explain a trade-off. The interviewer keeps asking "why" until they reach the edge of your knowledge. Reaching the edge is normal. Pretending there is no edge is the problem.
- **A strong performance:** definition, then example, then reason, then cost or limit, and you connect ideas.
- **Typical mistakes:** silencing a lint rule without understanding it, saying "the virtual DOM is why React is fast" with no nuance, and mixing up Server Components and server-side rendering.
- **Practise it:** [Round 2 README](../05-interview-rounds/round-2-concepts-and-theory/README.md).

**Example: the depth ladder.**

```text
Q1: What does useEffect do?
A1: It lets a component synchronise with something outside React, such as a timer,
    a subscription or a network request, after React has updated the screen.

Q2: When does the cleanup function run?
A2: Before the effect runs again with new values, and when the component is removed.

Q3: Why does my effect run twice in development?
A3: StrictMode runs setup, cleanup, then setup again on purpose, to check that my
    cleanup really undoes my setup. It only happens in development.
```

**What happens, step by step:**
1. Q1 checks that you know the purpose of the hook, Q2 checks the lifecycle of one effect, and Q3 checks that you can explain a behaviour you have seen in a real project.
2. Each good answer opens the door to the next question. If you mention StrictMode in A2, you steer the interview towards something you know.

### Round 3: Output prediction and debugging

The interviewer shows code. You say what it prints, what the screen shows, or why it is broken.

- **What is tested:** your mental model. State as a snapshot, batching, closures, effect order, keys, the event loop.
- **Length:** commonly 30-45 minutes, or a section inside a longer round.
- **Tools:** screen sharing, a shared editor, or code on slides. Ask whether you may run the code.
- **How it is scored:** the right answer and the right reason. A lucky guess scores lower than sound reasoning with one small slip. In debugging, the root cause counts more than the symptom.
- **A strong performance:** read the code once in silence, say what you see, trace it in order, commit to an answer, then say how you would check it.
- **Typical mistakes:** answering from a feeling, believing state changes immediately, and forgetting that StrictMode can render a component twice.
- **Practise it:** [Round 3 README](../05-interview-rounds/round-3-output-and-debugging/README.md).

**Example 1: state is a snapshot.** After one click on **Add twice** on a fresh page, what does the page show and what does the console print?

```jsx
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  function addTwice() {
    setCount(count + 1)
    setCount(count + 1)
    console.log('inside handler, count is', count)
  }

  function addTwiceSafely() {
    setCount((c) => c + 1)
    setCount((c) => c + 1)
  }

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={addTwice}>Add twice</button>
      <button onClick={addTwiceSafely}>Add twice safely</button>
    </div>
  )
}
```

**Answer (checked by running it):** the console prints `inside handler, count is 0` and the page shows `Count: 1`. On a fresh page, one click on **Add twice safely** shows `Count: 2`.

**What happens, step by step:**
1. On the first render, `count` is `0`. Inside that render it is a fixed number, like a photo. It does not change until the next render.
2. `setCount(count + 1)` means "set the count to 0 + 1", so React queues "set to 1". The second call queues "set to 1" again. The `console.log` prints `0`, because `count` is still the photo from render 1.
3. When the handler ends, React applies the queue: set to 1, set to 1. The result is 1, in one render.
4. In `addTwiceSafely`, each call queues a function that means "take the latest value and add 1". React runs them in order: 0 becomes 1, then 1 becomes 2.

Say in the interview: "State is a snapshot per render. When the next value depends on the previous one, I use the updater form."

**Example 2: the zero on the page.** What is on the page when `messages` is an empty array?

```jsx
export default function Inbox({ messages }) {
  return (
    <div>
      <h2>Inbox</h2>
      {messages.length && (
        <ul>
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

**Answer (checked by running it):** the page text is `Inbox0`. A `0` appears right after the heading.

**What happens, step by step:**
1. `messages.length` is `0`. In JavaScript, `0 && something` gives back `0`, because `&&` returns the first falsy value.
2. React renders numbers, including `0`. It skips `false`, `null` and `undefined`, but not `0`.
3. The fix is `messages.length > 0 && (...)`. The left side is now `false`, which renders nothing, and the page text is just `Inbox`.

### Round 4: Machine coding

You build a small, working UI in a fixed time. "Machine coding" means you code on a real machine, not on a whiteboard.

- **What is tested:** can you turn a short spec into a working component. State modelling, events, edge cases (empty, loading, error, rapid clicks), accessibility, structure, communication. Typical tasks: tabs, accordion, star rating, todo list, autocomplete, modal, data table, file explorer.
- **Length:** commonly 45 to 90 minutes.
- **Tools:** an online editor such as CodeSandbox, StackBlitz or CodePen, or your own laptop with screen sharing. A widely used frontend interview handbook lists four formats: an editor with preview, an editor without preview, your own environment, and a whiteboard.
- **How it is scored:** a working core first, then edge cases, then code quality, accessibility and how you explained your choices. Visual polish matters least.
- **A strong performance:** you ask questions, plan for a few minutes, get a plain working version early, then improve it, and end with what you would add for production.
- **Typical mistakes:** starting with CSS, writing everything before running anything, over-engineering, forgetting empty and error states, staying silent.
- **Practise it:** [Round 4 README](../05-interview-rounds/round-4-machine-coding/README.md), the take-home guide (planned) and the 33 exercises in the practice app.

**Example: model the state first.** A star rating needs two pieces of state: the saved rating and a temporary hover preview. The number of filled stars is not a third piece of state. It is worked out from the other two.

```jsx
import { useState } from 'react'

export default function StarRating({ max = 5 }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const shown = hover || rating

  return (
    <div role="group" aria-label="Rating" onMouseLeave={() => setHover(0)}>
      {Array.from({ length: max }, (_, index) => {
        const value = index + 1
        return (
          <button
            key={value}
            type="button"
            aria-label={`${value} star${value === 1 ? '' : 's'}`}
            aria-pressed={rating === value}
            onMouseEnter={() => setHover(value)}
            onClick={() => setRating(value)}
          >
            {value <= shown ? '★' : '☆'}
          </button>
        )
      })}
      <p>Your rating: {rating}</p>
    </div>
  )
}
```

**What happens, step by step (checked by running it):**
1. On load, `rating` and `hover` are `0`, so `shown` is `0` and the row reads `☆☆☆☆☆`.
2. The pointer moves onto star 4. `setHover(4)` runs, `shown` becomes `4` and the row reads `★★★★☆`. The saved rating is still `0`.
3. The pointer leaves the row. `onMouseLeave` sets `hover` to `0`, `shown` falls back to `rating`, and the row is empty again.
4. A click on star 3 calls `setRating(3)`. The row reads `★★★☆☆` and the text shows `Your rating: 3`.
5. After the pointer leaves, the row stays `★★★☆☆`, and the star 3 button has `aria-pressed="true"`.

This is a good first version: the buttons work with the keyboard, each one has a text label, and `shown` is derived, so the two states can never disagree. In the closing remarks you would say that a native radio group is a stronger final choice. The full task is [06 Star rating](../practice-app/exercises/react/06-star-rating/README.md).

### Round 5: JavaScript coding

You write plain JavaScript, with no React and often no preview. A **polyfill** is your own version of a built-in function, for example your own `Promise.all`.

- **What is tested:** closures, `this`, asynchronous code, data structures, edge cases. Common tasks: `debounce`, `throttle`, `Promise.all`, `bind`, `curry`, deep clone, flatten, an event emitter, an LRU cache. Some loops add easy "DSA-lite" questions on arrays, strings and hash maps.
- **Length:** commonly 45-60 minutes, one or two problems.
- **Tools:** a shared editor such as CoderPad, a browser editor or a document. You usually get a console, not a live preview.
- **How it is scored:** basic cases and edge cases pass (hidden tests are common), you explain time and memory cost, and the code is readable.
- **A strong performance:** you restate the signature, ask about odd input, write two or three example calls first, code, then run your examples out loud.
- **Typical mistakes:** coding before asking what odd input should do, losing `this` or the arguments, forgetting to return, never testing.
- **Practise it:** [Round 5 README](../05-interview-rounds/round-5-javascript-coding/README.md) and the 24 JavaScript exercises in the practice app.

**Example: `once(fn)`** returns a function that calls `fn` the first time only. Every later call returns the first result.

```js
export function once(fn) {
  let called = false
  let result

  return function (...args) {
    if (!called) {
      called = true
      result = fn.apply(this, args)
    }
    return result
  }
}
```

**What happens, step by step (checked by running it):**
1. `once(add)` creates two private variables, `called` and `result`. They live in a **closure**: the returned function remembers them between calls.
2. The first call, `wrapped(1, 2)`, sees `called` is `false`. It sets `called`, calls `add` with the same `this` and arguments, stores `3` and returns `3`.
3. The second call, `wrapped(10, 20)`, sees `called` is `true`. It skips `add` and returns the stored `3`. In a test, `add` ran exactly once.
4. A good follow-up is "What if `fn` throws?" Here `called` is already `true`, so later calls return `undefined` (checked by running it). Say whether you want that. Setting `called` only after success is an equally fine choice.

The matching exercise is [08 once](../practice-app/exercises/js/08-once/README.md).

### Round 6: Code review and refactoring

You get a component, a pull request or a deliberately messy app. You find problems, rank them and suggest fixes. Some companies also ask you to fix bugs in an existing app.

- **What is tested:** reading code like a teammate. Bugs, hooks mistakes, keys, missing cleanup, accessibility, security, naming, structure.
- **Length:** commonly 30-60 minutes.
- **Tools:** a pull request diff in the browser, a shared editor, or a small repo you can run.
- **How it is scored:** do you find the important problems first, explain why they matter, propose specific fixes and stay kind. Finding every nitpick is not the goal.
- **A strong performance:** read everything first, then go in order of severity: correctness and security, accessibility, maintainability, style.
- **Typical mistakes:** listing only style issues, rewriting everything, missing a missing-cleanup bug, being harsh.
- **Practise it:** [Round 6 README](../05-interview-rounds/round-6-code-review-and-refactoring/README.md).

**Example: review this component.**

```jsx
import { useEffect, useState } from 'react'

export default function UserList({ users, onSelect }) {
  const [query, setQuery] = useState('')
  const [filtered, setFiltered] = useState([])

  useEffect(() => {
    setFiltered(users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())))
  }, [users, query])

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
      {filtered.map((u, i) => (
        <div key={i} onClick={() => onSelect(u)}>
          {u.name}
        </div>
      ))}
    </div>
  )
}
```

**What a strong review says, step by step:**
1. **Derived state in an effect.** `filtered` can be worked out from `users` and `query` during render. Copying it into state adds an extra render. In a test with React 19.3, mounting this component caused 2 commits and typing one character caused 2 commits.
2. **Index as key.** `key={i}` breaks when items are removed or reordered: React reuses the wrong DOM nodes and state. Use a stable id.
3. **Clickable `div`, and no label.** A `div` with `onClick` has no keyboard support and no role, so use a `button`. A placeholder is not a label for screen readers.
4. **Rank them.** Say which you would fix first. Here the `div` hurts users most, and the effect hurts maintainers most.

A cleaned-up version (it assumes each user has a unique `id`):

```jsx
import { useState } from 'react'

export default function UserList({ users, onSelect }) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const visible = users.filter((u) => u.name.toLowerCase().includes(needle))

  return (
    <div>
      <label>
        Search users
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <ul>
        {visible.map((u) => (
          <li key={u.id}>
            <button type="button" onClick={() => onSelect(u)}>
              {u.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

**What changed (checked by running it):** mounting causes 1 commit, and each typed character causes 1 commit. Typing "an" into a list of Ana, Ben and Anya leaves two buttons, and clicking "Anya" calls `onSelect` with that user.

### Round 7: Performance and testing

You diagnose a slow screen, or you write tests for a component.

- **What is tested:** a measure-first habit for performance (React DevTools Profiler, the browser Performance panel, Web Vitals) and a behaviour-first habit for tests (what the user sees, not how the code is built).
- **Length:** commonly 45-60 minutes.
- **Tools:** browser DevTools, and a React project with a test runner (Vitest or Jest) and Testing Library.
- **How it is scored:** for performance, a clear method: reproduce, measure, find the cause, make the smallest fix, measure again. For testing, tests that find elements the way a user would and survive a harmless refactor.
- **A strong performance:** you say "I would measure first" and name the cheap fixes (move state down, split components) before the heavy ones (memoisation, virtualisation).
- **Typical mistakes:** wrapping everything in `useMemo`, testing implementation details, snapshot tests nobody reads, fixing without measuring.
- **Practise it:** [Round 7 README](../05-interview-rounds/round-7-performance-and-testing/README.md), the [performance lesson](../04-advanced/02-performance-optimization.md) and the [testing lesson](../04-advanced/08-testing-react.md).

**Example: a performance scenario.** "Typing in the search box above a list of 5,000 rows feels slow. What do you do?"

**A strong answer, step by step:**
1. **Reproduce and measure.** Record a Profiler session while typing. See which components render on each key.
2. **Find the cause.** Suppose the whole list re-renders on every key because the query state lives in a parent of the list.
3. **Make the smallest fix first.** Move the input and its state into its own component. Only then think about `memo` on the row, `useDeferredValue`, or virtualising the list.
4. **Measure again.** If nothing improved, undo the change.

**Example: a behaviour test** for the `Counter` from Round 3. It needs Vitest, Testing Library and `@testing-library/jest-dom` (see the [playground setup](./02-setup-your-playground.md)).

```jsx
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import Counter from './Counter.jsx'

test('adds two when the safe button is clicked once', async () => {
  const user = userEvent.setup()
  render(<Counter />)

  await user.click(screen.getByRole('button', { name: 'Add twice safely' }))

  expect(screen.getByText('Count: 2')).toBeInTheDocument()
})
```

**What happens, step by step (this test passes when run):**
1. `userEvent.setup()` creates a simulated user, and `render` draws the component into a fake browser (jsdom).
2. `getByRole('button', { name: ... })` finds the button the way a person or screen reader would, by role and visible name. If the button became a `div`, this test would fail, which is good, because the real page would be worse too.
3. `await user.click(...)` performs the click and waits for React to update. The last line checks what the user sees. The test says nothing about `useState`, so you can switch the component to `useReducer` and the test still passes.

### Round 8: Frontend system design

You design a feature or a front-end architecture on a whiteboard or in a document. There is usually little or no code.

- **What is tested:** can you structure a vague problem. Requirements, components, data and state, the network API, caching, real-time updates, performance, accessibility, monitoring. Typical prompts: news feed, autocomplete, chat app, carousel, e-commerce checkout, design system, and in recent reports a streaming AI chat UI.
- **Length:** commonly 45-60 minutes.
- **Tools:** a whiteboard, a drawing canvas (Excalidraw style) or a shared document.
- **How it is scored:** structure, trade-offs, depth where it matters, and how you react when a requirement changes. At least one company (Plain) says the interviewer adds new requirements mid-way to see whether you revise your choices.
- **A strong performance:** you follow a framework, state your assumptions, compare two options at each key decision, and go deep on the one or two parts that matter most.
- **Typical mistakes:** starting with component names, ignoring the network and the data model, skipping accessibility and performance, presenting one option as the only option.
- **Practise it:** [Round 8 README](../05-interview-rounds/round-8-frontend-system-design/README.md) and the [frontend system design lesson](../04-advanced/11-frontend-system-design.md).

A commonly taught framework is **RADIO**: **R**equirements, **A**rchitecture, **D**ata model, **I**nterface (the API), **O**ptimisations. One prep site suggests about 5, 5, 10, 10 and 15 minutes for a 45-minute round. Treat that as a starting point, not a rule.

**Example: "Design an autocomplete" in RADIO form.**

```text
R  Requirements   Search box with suggestions. Keyboard and mobile. Up to 10 results.
                  Needs loading, empty and error states. Must be accessible.
A  Architecture   SearchInput and SuggestionList, plus a small data layer between them
                  that debounces input, cancels old requests and caches results.
D  Data model     query, suggestions[], highlightedIndex, status (idle, loading,
                  success, error), cache: Map of query to suggestions.
I  Interface      GET /suggest?q=react&limit=10 returns [{ id, label }].
                  Component props: onSelect, minChars, fetchSuggestions.
O  Optimisations  Debounce, cancel stale requests (AbortController), cache recent
                  queries, ARIA combobox pattern with arrow keys, highlight matches,
                  virtualise only if results can be very long.
```

**What happens, step by step:**
1. **R** turns "autocomplete" into a list you agree on. **A** names the pieces and their jobs before any detail.
2. **D** lists the state. `status` is one value, not three booleans, so impossible states cannot happen. **I** fixes the contract with the server and of your own component.
3. **O** is where senior candidates earn points: stale responses, keyboard use, caching. At every step you say "option A or option B, and why". That habit is what the interviewer scores.

### Round 9: Behavioral and project

You talk about your past work, how you work with people and why you want this job.

- **What is tested:** ownership, communication, learning from mistakes, working with designers and backend engineers, and whether you really did the work on your CV.
- **Length:** commonly 30-45 minutes. Amazon's prep page says every interviewer in its final loop is mapped to the company's leadership principles.
- **Tools:** a video call.
- **How it is scored:** specific stories with your own role, decisions and results. Interviewers compare your story with your CV and ask for details.
- **A strong performance:** two or three prepared stories in the **STAR** shape: **S**ituation, **T**ask, **A**ction, **R**esult. You say "I", give a result and say what you learned.
- **Typical mistakes:** only saying "we", skipping the result, blaming others, not remembering the technology of your own project, having no questions for the interviewer.
- **Practise it:** [Round 9 README](../05-interview-rounds/round-9-behavioral-and-project/README.md).

**Example: a STAR story (the numbers are invented for practice).** The question is "Tell me about a performance win."

```text
Situation  Our product list page took about 4 seconds to become usable on mid-range phones.
Task       I had to get it under 2 seconds before a sale launch in three weeks.
Action     I recorded a profile and found two causes: one large image bundle, and a list
           that re-rendered on every keystroke in the filter box. I lazy-loaded the
           gallery, moved the filter state into its own component and set explicit
           image sizes. I checked the result with the Profiler and with Web Vitals on a
           throttled phone profile.
Result     The page became usable in about 1.5 seconds. I wrote a short doc so the next
           team could repeat the method.
```

**What happens, step by step:**
1. **Situation** sets the scene in one sentence, with a number. **Task** says what you owned, so the interviewer knows what is "I" and what is "we".
2. **Action** is the longest part. It shows a method (measure, find, fix, check), not luck.
3. **Result** gives an outcome and a lesson. If you do not remember exact numbers, say so and give a rough range. Never invent numbers in a real interview, because follow-up questions will test them.

## 3. What is expected at each level

Levels are rough. Junior is often 0-2 years of experience, mid 2-5, senior 5 or more, and staff is a step above senior that leads work across teams. Companies decide the level from the job description, not from years alone. No hiring company publishes a full rubric, so this table is a common pattern from prep essays and company posts, not an official standard.

| Area | Junior | Mid | Senior | Staff |
|---|---|---|---|---|
| Core React | Explain components, props, state, keys, controlled inputs. Build small widgets (counter, todo, tabs) alone | Explain render versus commit and reconciliation. Spot stale closures. Build medium widgets (autocomplete, modal) with edge cases | Explain batching, transitions, StrictMode rules, hydration, Server Components and their trade-offs | Set team conventions and lint rules for a whole codebase |
| Hooks and state | Rules of hooks, `useState`, `useEffect` with cleanup | Custom hooks, `useReducer`, effect pitfalls. Choose local, context, store or server state | Design hook APIs. Review other people's hook bugs. Justify state libraries or avoid them | Data-layer strategy across teams |
| Performance | Know what causes re-renders. Lazy loading | Profile, fix re-render problems, virtualise lists, read Web Vitals | Set budgets, monitor INP, LCP and CLS, plan bundle and streaming strategy | Performance governance, migration plans |
| Testing | A simple Testing Library test | Integration and async tests, mock the network | Test strategy, end-to-end tests, flaky tests | Quality gates, CI design |
| System design | Usually not asked | Small designs (autocomplete, carousel) with API and state | Whole features: data, API, caching, real-time, accessibility, monitoring | Multi-team platforms: design systems, micro-frontends, migrations |
| Communication | Think aloud, ask a clarifying question | Explain trade-offs, use hints well | Drive the discussion, state assumptions, mentor | Influence across teams, write strategy |
| Rounds that commonly weigh most | 1, 2, 3, 4, 5 | 2, 3, 4, 5, 6, 7 | 4, 6, 7, 8, 9 | 8 and 9, plus a review of systems you built (reported) |

**Example: one question at three depths.** The question is "How do you load data in a component?"

```text
Junior   I call fetch in useEffect, store the result in state, and show loading and
         error messages while I wait.
Mid      I also guard against out-of-order responses with a cleanup flag or an
         AbortController. In a larger app I would use TanStack Query for caching.
Senior   I ask where the data is used. For a page that needs SEO or a fast first paint
         I fetch on the server. On the client I use a cache with invalidation, avoid
         request waterfalls, handle retries, show errors with an error boundary, and
         say what I would monitor.
```

**What happens, step by step:**
1. The junior answer is correct for a small task. The mid answer adds a failure real apps hit: two requests finishing in the wrong order.
2. The senior answer widens the scope: where the code runs, how data is cached, how failures are shown and watched. The vocabulary barely changes. What changes is how far ahead you think.

Read your own column and the one to its right. Interviewers sometimes test one level up to find your ceiling, so a few questions you cannot answer there are normal.

## 4. How to behave in a live round

Most people lose points in live rounds because of habits, not missing knowledge. Habits can be trained. Practise them with a timer in the [practice app](../practice-app/README.md).

### 4.1 Think aloud

Interviewers cannot see your thoughts. If you are silent, they cannot give you credit for good reasoning, and they cannot help when you drift. **Thinking aloud** means saying your reasoning as you work. Use four kinds of sentences:

- **Intent:** "I will start with static markup so I can see something."
- **Observation:** "That renders `0` because `0 &&` returns `0`."
- **Decision:** "I will keep one `status` value instead of three booleans, because they cannot disagree."
- **Doubt:** "I am not sure whether this fires twice in StrictMode. I would check by logging. For now I will assume it does."

Narrate decisions and surprises, not every keystroke. It is fine to say "give me 30 seconds to think" and then be quiet.

**Example: narrating the star rating.**

```text
"Let me repeat the task: five stars, hover previews a rating, click saves it.
I will keep two pieces of state: the saved rating and the hover value.
The filled count is the hover value if there is one, otherwise the saved rating,
so I will calculate it instead of storing it.
I will start with static markup, then state, then events.
Now I hover the last star and all five fill. That matches what I expected.
Next I will check that leaving the row goes back to the saved rating."
```

**What happens, step by step:**
1. Repeating the task proves you understood it and lets the interviewer correct you early.
2. Naming the state shows your design before you type it, and "calculate instead of store" is a decision with a reason, which is what gets scored. Checking each small step shows that you debug on purpose.

### 4.2 Clarify requirements

Prompts are short and vague on purpose. Spend the first three to five minutes asking about five things: **data** (where from, what shape, how big), **behaviour** (empty, loading and error states), **users** (keyboard, mobile, screen readers), **scope** (what is in and out) and **constraints** (libraries, TypeScript, time).

**Example: "Build an autocomplete."**

```text
You:         Do suggestions come from a local array or an API?
Interviewer: A fake async function that answers after about 300 ms.
You:         Can an older request finish after a newer one?
Interviewer: Yes, please handle that.
You:         Do I need arrow keys and Enter?
Interviewer: Yes, if you have time.
You:         What should show if nothing matches, or the request fails?
Interviewer: A short message in both cases.
```

**What happens, step by step:**
1. Question 1 fixes the data source, so you know you need a loading state.
2. Question 2 uncovers the hardest hidden requirement, a race between requests, before you write code that ignores it.
3. Question 3 sets the order of work (mouse first, keyboard second), and question 4 lists two more states to build.
4. Finish with a one-sentence summary: "So: debounced search, ignore stale responses, empty and error messages, then keyboard support." If the interviewer says yes, you now have a checklist for the rest of the hour.

### 4.3 Plan before you type

Take two to five minutes to write a plan, in the editor as comments. A plan has four parts: the **component tree**, the **state** (and what is derived from it), the **events** that change state, and the **edge cases**. Then say the order you will build in.

**Example: a plan for the star rating.**

```text
Components:  StarRating (one component is enough for now)
State:       rating (saved), hover (preview). shown = hover || rating  (derived)
Events:      onClick sets rating; onMouseEnter sets hover; onMouseLeave clears it
Edge cases:  max prop, clicking the same star again (clear?), keyboard, labels
Order:       1) static markup  2) state and click  3) hover  4) keyboard and labels
```

**What happens, step by step:**
1. The plan fits on five lines, so it costs little time.
2. It separates stored state from derived values before you write code, which prevents a whole class of bugs.
3. The build order puts the visible result first, so a half-finished solution still works.

### 4.4 Manage the clock in a 45-minute coding round

This plan is a starting point:

| Minutes | What you do |
|---|---|
| 0-5 | Read the prompt. Ask questions. Repeat the requirements back |
| 5-10 | Plan: components, state, events, edge cases. Say the plan out loud |
| 10-30 | Build the core: static markup, then state, then events. Run it often |
| 30-38 | Add edge cases: empty, error, keyboard, fast repeated clicks |
| 38-43 | Test by hand (or write one test). Fix bugs |
| 43-45 | Closing remarks: what you would do with more time |

For a 90-minute round, keep the shape and double the build and edge case time. For a JavaScript round use: 5 minutes of questions, 5 for examples and a plan, 20 to write, 10 to test edge cases, 5 for time and memory cost.

Three rules: **get something working by the halfway point** (a plain working version beats a beautiful unfinished one), **run the code early and often**, and **skip CSS polish** unless the task is about layout.

### 4.5 When you are stuck

Everyone gets stuck. A calm routine is itself a strong signal.

1. **Say it out loud.** "I am stuck on why the list does not update."
2. **Make the problem smaller.** Hard-code a value, add a `console.log`, or remove code until it works.
3. **Re-read the prompt** for a detail you skipped, and **try a simpler version** first.
4. **Time-box it.** After five minutes, leave a stub with a comment, tell the interviewer and move on.
5. **Ask for a hint** (see 4.7).

**Example: the list that does not update.** You click **Add** and nothing changes on screen.

```jsx
import { useState } from 'react'

export default function Items() {
  const [items, setItems] = useState(['a'])

  function addItem() {
    items.push('b')
    setItems(items)
  }

  return (
    <div>
      <p>Items: {items.join(',')}</p>
      <button onClick={addItem}>Add</button>
    </div>
  )
}
```

**What happens, step by step (checked by running it):**
1. You say: "Either my handler is not running, or React does not see a change." You add `console.log(items)` after the `push`. It prints `['a', 'b']`, so the handler runs and the data changed.
2. So React did not notice. `push` changed the same array, and `setItems(items)` passed the same reference. React sees the same array and skips the render. The page still shows `Items: a`.
3. The bug stays hidden until some other update renders the component. In my run, a second button that did `setItems([...items, 'c'])` suddenly showed `Items: a,b,c`, because the hidden `b` was already in the array. That confusing symptom is typical of mutation.
4. The fix is a new array: `setItems([...items, 'b'])`.

### 4.6 Talk about trade-offs

Most design questions have no single right answer. Interviewers want to hear that you know the options and their costs. Use this shape:

```text
"Option A gives me X but costs Y. Option B gives me Z but costs W.
I pick A because X matters most here. If Y becomes a problem, I would switch to B."
```

**Example: where should the search filter live?**

```text
"I can keep the filter in component state, or in the URL.
Component state is the simplest, but the filter is lost on refresh and cannot be shared.
The URL keeps the filter on refresh and makes the page shareable, but it needs parsing,
and every keystroke becomes a navigation unless I debounce it.
For an internal page used once, I pick component state. For a public product list,
I pick the URL, because sharing and the back button matter to users."
```

**What happens, step by step:**
1. It names two real options, not one real option and one weak one, with one benefit and one cost each.
2. It makes a decision and ties it to a reason ("sharing matters to users"). It also shows the answer depends on the situation, which is what "senior" means in practice.

### 4.7 Ask for hints well

Asking for a hint is not failing. In real work you ask colleagues all the time, and many interviewers would rather give a hint than watch you struggle in silence. Ask after you have tried, and be specific.

- Weak: "I do not know what to do."
- Better: "I think the bug is in how I update the list. Am I looking in the right place?"
- Better: "I have two ideas, a ref or a derived value. Which is closer to what you have in mind?"

When you get a hint, repeat it in your own words, apply it and keep going. Do not apologise three times.

### 4.8 Finish with closing remarks

In the last two minutes, say what you would add to make the work production-ready. A widely used frontend interview handbook lists these themes. Use this checklist as a prompt:

- **Tests:** unit tests for logic, a few Testing Library tests for behaviour, one end-to-end test for the main flow.
- **Tooling:** TypeScript, ESLint with the hooks rules, Prettier, a CI pipeline.
- **Accessibility:** keyboard use, visible focus, labels, roles, contrast, reduced motion.
- **Internationalisation (i18n):** text from translation files, right-to-left layouts, date and number formats with `Intl`.
- **Security:** no raw HTML from users, escape values placed in URLs, validate on the server, no secrets in the browser bundle.
- **Browser support:** which browsers and devices you would test, and what happens when a feature is missing.
- **Performance and failure states:** long lists, large images, measuring before optimising, and what the user sees when something fails.
- **With more time:** the next two features and one thing you would refactor.

**Example closing (about 30 seconds):**

```text
"With more time I would add arrow-key support and switch to a native radio group for
better accessibility, add a test for the hover preview and the click, and add a
controlled mode so a parent can set the value. I would also check it in a right-to-left
layout. The one thing I would refactor is the inline handlers, if the component grows."
```

## 5. Company types and what differs

Loops change with the type of company. The shapes below are common patterns from hiring posts, prep guides and candidate reports. Candidate reports are anecdotes, so treat them as hints and check with your recruiter.

| Type | Typical shape | What they value most |
|---|---|---|
| Startup | Two to four steps: intro call, a practical React task or pairing, sometimes a take-home or paid trial, then a chat with a founder or manager. Little algorithm work. "Extend or fix our code" is common | Getting things done, working in an existing codebase, product sense, breadth |
| Product company | A JavaScript and React quiz, a machine coding round, a JavaScript fundamentals round, system design at mid and senior levels, then a hiring manager | Clean working UIs under time pressure, solid JavaScript, trade-off thinking |
| Big tech | Recruiter screen, one or two phone rounds, then several onsite rounds: JavaScript and UI coding, frontend system design, behavioral, sometimes easy to medium algorithm questions. Amazon's own prep page describes a 90-minute online assessment, a 60-minute phone screen and a loop of four 55-minute interviews | Structured problem solving, communication, scale, behavioral evidence |
| Service company or agency | One or two technical rounds plus an HR round. Fundamentals heavy: class versus function components, lifecycle, JSX, props and state, Redux flow, a form with validation. Agencies often add a portfolio review and a small build task | Fundamentals, working on varied client projects, communication with clients |

Two real examples of non-standard shapes:
- SingleStore describes a first stage of two back-to-back one-hour live sessions: one where you explore an existing codebase and improve it, and one where you build UIs with React and JavaScript.
- Counting Up described (in a 2022 post, so check that it is still current) a pair programming session of about three hours in total. You use your own editor, you may search the web, and the tasks check how you break down a problem and work with others, not what you memorised.

### Which rounds matter most for each company type

Use this table to decide what to practise first. It is a guide based on the patterns above, not a promise.

| Company type | Start with | Then | Usually lighter |
|---|---|---|---|
| Early startup | Round 4 as a take-home or live build, and Round 6 style work in an existing codebase | Round 9 (founder or manager chat), Round 2 | Heavy algorithm practice, long system design |
| Indian product firms (candidate reports) | Round 4: machine coding is the centre of the loop | Round 5 and deep JavaScript (closures, promises, event loop), Round 8 at mid and senior levels, Round 9 | Hard algorithm questions (at least one report said none at all) |
| Big tech | Round 5 with DSA-lite, and Round 8 system design for senior roles | Round 4 (UI coding), Round 9, Round 2 | Framework trivia |
| Service company | Rounds 1 and 2, and legacy class components and Redux connect (planned) | A form-with-validation build (Round 4 easy tier), Round 9 for HR questions | System design, performance deep dives |
| Agency or freelance | A small build task (Round 4) and a portfolio walkthrough (Round 9) | Client communication, stack-specific questions | Algorithms, large-scale design |

For agencies, reliable public information is thin, so ask the recruiter what the task will be.

## 6. Newer formats: take-home, pairing and AI-allowed rounds

Three formats have grown in recent years. You may meet them at companies of any size.

### 6.1 Take-home assignments

You get a small project to build on your own time. Hours are suggested, but the work tends to grow, so decide your scope early. A 2026 survey of 400 engineering leaders by the interview vendor Karat reported that 45% of US companies use take-homes, against 20% in China. It is a vendor survey, so read it as a rough signal.

**How they are scored:** the app works first. Then correctness and edge cases, code quality, UX and a README that explains your choices. Senior candidates are also judged on architecture, meaningful tests and explained trade-offs.

**A plan for a three-hour take-home, step by step:**
1. **15 minutes:** read the brief twice. List requirements and assumptions. Email questions if anything is unclear.
2. **2 hours:** build the main path. Commit often and run it often.
3. **30 minutes:** add edge cases (empty, loading, error) and a few focused tests.
4. **15 minutes:** write the README and test a clean clone, so the app starts with `npm install` and `npm run dev`.

**Example: a README skeleton.**

```text
# Project name

How to run: npm install, then npm run dev (app) or npm test (tests).

What I built: two or three lines. What works, what does not.

Decisions and trade-offs: why this state approach, what the alternative was,
which libraries I used and which I deliberately did not.

Assumptions: things the brief did not say, and what I assumed.

With more time: the next two features, one refactor, one risk.
```

**What happens, step by step:**
1. "How to run" lets the reviewer start the app in a minute. A reviewer who cannot run it may stop reading.
2. "What I built" is honest about gaps ("search works, pagination does not"). "Decisions" carries the thinking a live interview would have heard, and "With more time" is the closing remark written down.

See the full take-home guide (planned).

### 6.2 Pair programming and "extend an existing codebase"

Instead of a blank page you get a real project, alone or with an interviewer, and you add a feature or fix a bug. It tests reading skills as much as writing skills.

**Example: "Add a clear button to the search box" in an unfamiliar repo.**

**What happens, step by step:**
1. **Read the README and run the app and its tests.** See what works before you change anything.
2. **Find the entry point.** Search the code for the placeholder text of the search box. You land in `SearchBar.jsx`.
3. **Read the nearest tests and the data flow.** The value is `useState('')` in a parent, passed down as props. The `SearchBar` test shows the intended behaviour.
4. **Make the smallest change.** Add a button that calls the existing `onChange` with an empty string. Add no new state.
5. **Run the tests, click through the app, and narrate** what you did and what you would do with more time (focus the input after clearing, a visible label for screen readers).

### 6.3 Interviews where AI coding tools are allowed

Policy differs by company and sometimes by round. The 2026 Karat survey reported that 62% of companies overall prohibit AI tools in technical interviews, and leaders estimated that more than half of candidates use them anyway. In June 2025, Canva told backend and frontend candidates that they could use AI coding tools in a new interview format (a pilot) that replaced its fundamentals screen. It scored breaking down ambiguous problems, judging and fixing the code the tool produces, and taking ownership. Some companies report piloting similar rounds, but details differ between reports, so treat them as signals, not rules.

What to do:
1. **Ask about the policy** before the interview and again at the start of each round. If AI tools are banned, do not use them, not even on a second screen.
2. **If allowed, narrate what you ask and what you check.** The interviewer scores your judgement, not the tool.
3. **Verify everything.** Read the code, run it, try edge cases, and write or run a test.
4. **Explain every line.** Never paste code you cannot explain. You own what you submit. If the result is wrong, say why before you change your request.

**Example: the tool suggests a timer.**

```jsx
import { useEffect, useState } from 'react'

export default function Seconds() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setSeconds(seconds + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return <p>Seconds: {seconds}</p>
}
```

**What happens, step by step (checked by running it):**
1. You read it and say: "It clears the interval on cleanup, which is good. But the dependency array is empty and the effect reads `seconds`."
2. You predict the bug: the interval callback closes over the first render, where `seconds` is `0`, so every tick calls `setSeconds(0 + 1)`.
3. You run it with fake timers. After 10 ticks the page shows `Seconds: 1`, not 10. Your prediction was right.
4. You fix it with the updater form, `setSeconds((s) => s + 1)`. After 10 ticks the page shows `Seconds: 10`.
5. You tell the interviewer what you checked: the cleanup, the dependency list and a run. That sequence is what the "verify" score looks for.

## 7. What changed recently

If you learned React before 2024, parts of your mental model are out of date. These dated facts (checked in November 2026) are the ones interviews touch most. The current React version is 19.3.1.

| Date | What happened |
|---|---|
| 2024-03-12 | INP (Interaction to Next Paint) replaced FID as a Core Web Vital |
| 2024-12-05 | React 19 became stable: Actions, `use`, `ref` as a normal prop, document metadata |
| 2025-02-14 | Create React App was sunset; react.dev now recommends a framework, or a build tool such as Vite |
| 2025-10-01 | React 19.2: `Activity`, `useEffectEvent` |
| 2025-10-07 | React Compiler 1.0: automatic memoisation |
| 2025-10-21 | Next.js 16: Cache Components with `"use cache"`, `proxy.ts` replaces `middleware.ts` |
| 2025-12 | Security advisories for React Server Components, including CVE-2025-55182 |
| 2026-06-17 | React Router 8: the `react-router-dom` package is removed, import from `react-router` |
| 2026-09-09 | React 19.3: stable `<ViewTransition>` |

### What this does to interviews

Prep sites widely report these shifts, so treat the direction as likely, not measured:
- **React 19 is the baseline.** Expect Actions, `useActionState`, `useOptimistic`, `use` and `ref` as a prop. See the [React 19 lesson](../04-advanced/04-react-19-and-newer.md).
- **Server Components and Next.js are common.** Expect "what is a Server Component, and how is it different from server-side rendering?" and "what does `"use client"` mean?" See [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md) and [Next.js essentials](../04-advanced/06-nextjs-essentials.md).
- **TypeScript is commonly expected.** Be ready to type props, state, events and hooks. See [TypeScript with React](../03-intermediate/08-typescript-with-react.md).
- **Accessibility and performance questions are rising**: a modal that traps focus, a labelled form, LCP, INP and CLS. See [accessibility](../04-advanced/09-accessibility.md) and [performance](../04-advanced/02-performance-optimization.md).
- **Memoisation questions changed.** "When would you use `useMemo`?" is now often followed by "What does React Compiler do?"
- **Verification and communication count more** where AI tools are allowed, because typing speed no longer separates candidates.

### Old answers and better answers

Some advice from older tutorials is now wrong. Do not repeat it in an interview.

| If you say this | Say this instead |
|---|---|
| "Start a project with create-react-app." | It was sunset in February 2025. Use a framework such as Next.js or React Router, or Vite for a plain single-page app |
| "Use `useMemo` and `useCallback` everywhere for speed." | Measure first. React Compiler 1.0 memoises automatically, and manual memoisation is an escape hatch |
| "You must wrap components in `forwardRef`." | In React 19, `ref` is a normal prop on function components. `forwardRef` still exists |
| "`useEffect` with `[]` is `componentDidMount`." | Effects synchronise with something outside React, and in development StrictMode runs setup, cleanup, setup |
| "`setState` is asynchronous." | Updates are queued and batched, and a handler sees a snapshot of state from its render |
| "FID is a Core Web Vital." | INP replaced FID in March 2024 |
| "Server Components are server-side rendering." | They are different. Server-side rendering makes HTML for any component. Server Components change where component code runs and what ships to the browser |
| "`"use client"` means browser only." | It marks a module boundary. Client Components can also render on the server for the first HTML |
| "Server Actions are private functions." | They are public endpoints. Validate input and check permissions |
| "Import from `react-router-dom`." | With React Router 8, import from `react-router` |

## 8. Check yourself

Try each item before you open the answer.

1. **(Easy)** A recruiter says the loop is "a 60-minute UI build, then a 45-minute design round". Which two rounds of this book do you prepare first?

<details>
<summary>Show answer</summary>

Round 4 (machine coding) for the UI build and Round 8 (frontend system design) for the design round. Also practise the routine from section 4: clarify, plan, build, test, closing remarks.

</details>

2. **(Medium)** In a 45-minute coding round, what should you have by minute 25, and what should you not do in the first 10 minutes?

<details>
<summary>Show answer</summary>

By around minute 25 you should have a plain working version of the core feature, and you should have run it at least once. In the first 10 minutes you should not write code or CSS. Ask questions, repeat the requirements and write a short plan: components, state, events and edge cases.

</details>

3. **(Hard)** Your interviewer says "You may use AI coding tools". Write down three things you will do, and say what the interviewer is really scoring.

<details>
<summary>Show answer</summary>

Any three of these: confirm what is allowed in this round; say out loud what you ask the tool and why; read and run what it returns, including edge cases; explain every line you keep and never paste what you cannot explain; state that you own the final result. The interviewer is scoring your judgement: breaking down the problem, spotting and fixing wrong output, and taking ownership. The tool's output is not what is scored.

</details>

## Common mistakes across all rounds
- **Coding before you understand the task.** Ask questions first, then repeat the requirements back.
- **Staying silent.** Narrate decisions and surprises, not keystrokes.
- **Reciting definitions.** Add one example and one trade-off to every answer.
- **Over-engineering, or polishing CSS first.** Get a plain working version first, then improve it.
- **Never running the code.** Run early and often, and test one edge case before you finish.
- **Defending a wrong answer.** Say "good catch", fix it and keep going.
- **Repeating outdated advice, or not asking about the format.** Use the table in section 7 and the recruiter questions in section 1.

## Recap
- A loop is a series of rounds. Companies mix them differently, so ask your recruiter and prepare for what you will really meet.
- This book has nine rounds: screening quiz, concepts, output and debugging, machine coding, JavaScript coding, code review, performance and testing, system design, and behavioral.
- Levels differ in scope more than in vocabulary. Read your column and the next one.
- In live rounds: clarify, plan, build the core first, test, and finish with closing remarks (tests, tooling, accessibility, i18n, security, browser support, what you would do with more time).
- Think aloud, state trade-offs as "A gives X but costs Y", and ask for a hint after you have tried and said where you are stuck.
- Machine coding is the centre of many product-company loops. Big tech adds algorithm-lite and system design. Startups lean on take-homes and pairing. Service companies lean on fundamentals and legacy React.
- If AI tools are allowed: ask the policy, narrate what you check, verify by running, and explain every line.
- Update old answers: React 19 is the baseline, Create React App is retired, React Compiler changes memoisation advice, Server Components are not server-side rendering, and Server Actions are public endpoints.

## Where to go next
- Read [How to use this repo](./01-how-to-use-this-repo.md) to pick a study plan, then set up the [playground](./02-setup-your-playground.md).
- Start the lessons with [JavaScript for React](../01-basics/01-javascript-for-react.md), then [What is React](../01-basics/02-what-is-react.md).
- Skim the [interview rounds overview](../05-interview-rounds/README.md) to see how to run a mock round and score yourself.
- For HTML, CSS and deeper JavaScript questions, see HTML, CSS and browser basics (planned) and [JavaScript deep dive for interviews](../01-basics/10-javascript-deep-dive-for-interviews.md).
- Try your first timed exercise: [01 Counter](../practice-app/exercises/react/01-counter/README.md).
- The night before an interview, open the interview day checklist (planned) and the quickfire revision (planned).
