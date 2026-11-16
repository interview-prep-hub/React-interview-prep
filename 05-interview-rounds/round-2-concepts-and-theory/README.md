# Round 2 - Concepts and Theory

> **Questions:** 70 (35 per file)   **Time:** about 4 to 6 hours to work through once   **Level:** Beginner to Advanced

This is the "explain it to me" round. The interviewer asks how and why React works the way it does, and listens for clear, correct reasoning. There is little or no coding. You win by giving a short answer first, then the reason, then a tiny example.

## What the round tests
- Whether you understand ideas, not just syntax: rendering, state, effects, keys, context, memoisation.
- Whether your knowledge is current: React 19, Actions, Server Components, the React Compiler, and what was removed.
- Whether you can explain trade-offs (Context or a store, CSR or SSR) instead of naming one "best" tool.
- Whether you can speak simply. Clear beats clever.

## Typical format and timing
- 30 to 60 minutes, usually on video, often with a shared editor or whiteboard for small snippets.
- Roughly 8 to 15 questions. Interviewers start easy and go deeper where you are strong, or where you slip.
- Expect follow-ups such as "why?", "what breaks if you change this?" and "when would you not do that?".
- Service companies lean on fundamentals and legacy React. Product companies push on hooks, rendering and performance. Senior roles add architecture, server rendering and security.

## How to practise with these files
1. Pick one questions file. Cover the screen, read one question, and answer out loud in 2 to 3 minutes. Recording yourself helps.
2. Write the 3 to 4 key points you made. Then open the matching answers file and compare.
3. Score yourself with the rubric below. Put every item under 2 in a "redo" list and retry it the next day.
4. For code questions, type the snippet into the [practice app](../../practice-app/) or a sandbox and check the result yourself.
5. Do a full mock: ask a friend to pick 10 random IDs and interview you for 40 minutes.

Question files:
- [Fundamentals and hooks](questions/01-fundamentals-and-hooks.md) (answers: [here](answers/01-fundamentals-and-hooks.md))
- [Rendering, state and modern React](questions/02-rendering-state-and-modern-react.md) (answers: [here](answers/02-rendering-state-and-modern-react.md))

## Scoring rubric (per question)
| Score | What it sounds like |
| --- | --- |
| 2 | Correct, in plain words, with the reason and a small example. You could handle the follow-up. |
| 1 | Mostly right but vague, missing the why, or one detail is wrong. |
| 0 | Wrong, or you could only recite a term without explaining it. |

Totals for a file of 35 questions: 60 or more is interview-ready, 45 to 59 means revise the weak areas, below 45 means reread the lessons first.

## Common mistakes in this round
- Saying "the virtual DOM makes React fast" or "setState is asynchronous" without the careful version.
- Teaching old facts: `componentDidMount` equals `useEffect(..., [])`, `defaultProps` on function components, `ReactDOM.render`, `react-router-dom` imports.
- Giving a list of terms with no reason. Always add "because".
- Answering "it depends" with no follow-through. Name the factors, then pick one for the case given.
- Claiming that `"use client"` means browser only, or that a Server Action is a private function. Both are common traps.
- Memoising everything. Say "measure first" and mention the React Compiler.
- Talking for five minutes. Aim for 60 to 90 seconds, then offer to go deeper.

## Study these lessons first
- Basics: [What is React](../../01-basics/02-what-is-react.md), [JSX](../../01-basics/03-jsx.md), [Components and props](../../01-basics/04-components-and-props.md), [State and events](../../01-basics/05-state-and-events.md), [Lists and conditions](../../01-basics/06-conditional-rendering-and-lists.md), [Forms](../../01-basics/07-forms.md), [Thinking in React](../../01-basics/08-thinking-in-react.md)
- Hooks: [Overview and rules](../../02-hooks/01-hooks-overview-and-rules.md), [useState](../../02-hooks/02-usestate-in-depth.md), [useEffect](../../02-hooks/03-useeffect.md), [useRef](../../02-hooks/04-useref.md), [useContext](../../02-hooks/05-usecontext.md), [useReducer](../../02-hooks/06-usereducer.md), [Memoization](../../02-hooks/07-memoization.md), [Custom hooks](../../02-hooks/08-custom-hooks.md), [Other hooks](../../02-hooks/09-other-hooks.md)
- Intermediate: [Component patterns](../../03-intermediate/01-component-patterns.md), [Data fetching](../../03-intermediate/02-data-fetching.md), [React Router](../../03-intermediate/03-react-router.md), [Forms with libraries](../../03-intermediate/04-forms-with-libraries.md), [Error boundaries and portals](../../03-intermediate/05-error-boundaries-portals-and-friends.md), [State management](../../03-intermediate/06-state-management.md)
- Advanced: [How React renders](../../04-advanced/01-how-react-renders.md), [Concurrent React and Suspense](../../04-advanced/03-concurrent-react-and-suspense.md)

Some topics in part 2 (performance deep dive, React 19 details, server rendering, testing, TypeScript, accessibility, security) do not have their own lesson yet. Each affected answer says so and points to [REMAINING.md](../../REMAINING.md).

## Next steps
Once you can score 2 on most questions here, move on to the output-prediction and debugging round, then to timed machine-coding practice.
