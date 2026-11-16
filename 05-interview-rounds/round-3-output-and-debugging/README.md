# Round 3 - Output Prediction and Debugging

> **Level:** Intermediate to Advanced   **Time:** about 4 hours for all 42 questions   **Read first:** [useState in depth](../../02-hooks/02-usestate-in-depth.md), [useEffect](../../02-hooks/03-useeffect.md), [how React renders](../../04-advanced/01-how-react-renders.md)

## What this round tests
The interviewer shows a short piece of code and asks "what does this print?" or "this has a bug, find it". They are not checking whether you remember an API. They check your mental model: state is a snapshot, a render is a function call, effects run after the commit, and keys decide identity. A strong answer predicts the output, then names the rule behind it.

## Typical format and timing
- 45 to 60 minutes, on a shared screen or in a shared editor.
- 3 to 6 output-prediction snippets (3 to 5 minutes each), then 1 or 2 bug hunts (10 to 15 minutes each). Some companies replace this with "extend a small repository and make a failing test pass".
- You are often asked to predict before running anything. Say your prediction, then run if allowed.
- Juniors get snapshots, keys and the `&&` trap. Seniors get effects, StrictMode, context and race conditions.

## How to practise
1. Read the question. Do not run anything yet.
2. Write down the exact log lines in order, or the exact text on the screen. "It updates" is not a prediction.
3. Say the rule in one sentence, out loud.
4. Verify: paste the code into your playground, or use a scratch test (below), and compare line by line.
5. Open the answer. If you were wrong, write the rule on a card and redo the question two days later.

```jsx
// practice-app/scratch/try/try.test.jsx (delete the folder when you are done)
import { fireEvent, render, screen } from '@testing-library/react'
import { test } from 'vitest'
import Counter from './Counter.jsx' // paste the question component here

test('try it', () => {
  render(<Counter />) // wrap in <StrictMode> to see development behaviour
  fireEvent.click(screen.getByText('plain'))
  console.log(screen.getByText(/Count:/).textContent)
})
```

Run it from `practice-app` with `npm test -- scratch/try`. Setup help: [set up your playground](../../00-start-here/02-setup-your-playground.md).

## Drill: an unfamiliar repository (30 minutes)
1. Read the README and the `scripts` in `package.json`. Do not open source files yet.
2. Run the tests. Read the failing test names and messages first: the tests are the spec.
3. Find the entry point: `index.html`, then `main.jsx`, then `App.jsx`, then the component the failing test renders.
4. Reproduce the failure by hand, then find the smallest piece of code that explains it.
5. Make the smallest change that fixes it (no refactoring, no reformatting). Run the tests again, then repeat the original steps by hand.
6. Explain out loud: the cause, the change, and how you would prevent it.

## Scoring rubric
| Item | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Prediction | wrong | right values, wrong order | right output | right output and order |
| Reason | none | vague ("async") | correct rule | rule plus when it breaks (StrictMode, batching) |

Bug hunt, one point each (4 total): reproduced the symptom, named the root cause, made a minimal correct fix, said how to prevent it. Aim for an average of 2.5 on predictions and 3 of 4 on bug hunts before a real interview.

## Common mistakes
- Guessing from habit instead of tracing each render on its own. Write "render 1: count = 0" for every render.
- Forgetting StrictMode: in development, render logs appear twice and mount effects run setup, cleanup, setup.
- Explaining with "setState is async" or "React re-renders everything". Say "the update is queued and the state is a snapshot".
- Fixing the symptom: copying a prop into state with an effect, or silencing the lint rule, instead of fixing the cause.
- Stopping at the fix without checking it: rerun the exact steps from the symptom.

## Question files and lessons
- [Output prediction (30 questions)](questions/01-output-prediction.md) and [answers](answers/01-output-prediction.md)
- [Bug hunt (12 questions)](questions/02-bug-hunt.md) and [answers](answers/02-bug-hunt.md)

- Lessons: [hooks rules](../../02-hooks/01-hooks-overview-and-rules.md), [useRef](../../02-hooks/04-useref.md), [useContext](../../02-hooks/05-usecontext.md), [memoization](../../02-hooks/07-memoization.md), [lists and keys](../../01-basics/06-conditional-rendering-and-lists.md), [JavaScript deep dive](../../01-basics/10-javascript-deep-dive-for-interviews.md).

## Not covered yet (planned additions)
These checked traps are not in the question files yet. Add them when you have time:
- Click order (parent capture, child, parent bubble), `flushSync`, and error boundaries (render errors yes, event-handler errors no).
- Form actions: uncontrolled fields reset after a `<form action>` finishes; `useFormStatus` works only in children of the form.
- `use(promise)` with a promise created during render, `useOptimistic` snapshots, and `Activity` (hidden content keeps state, cleans up effects).
- `arr.sort()` mutation versus `toSorted`, and the JavaScript one-liners (`parseInt` in `map`, coercion, `forEach(async ...)`).
