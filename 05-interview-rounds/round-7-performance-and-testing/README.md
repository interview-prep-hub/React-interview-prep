# Round 7 - Performance and Testing

This round checks that you can make a slow React app fast with evidence, and that you can prove your code works with good tests. It is the round where "I would add `useMemo`" is not enough: interviewers want to hear how you measure, what you change first, and when you leave the code alone.

## What the round tests
- **Diagnosis:** you use the React DevTools Profiler, the Chrome Performance panel and the Network tab before changing code.
- **React performance tools:** state colocation, composition with `children`, `memo`, `useMemo`, `useCallback`, `useDeferredValue`, `useTransition`, code splitting, virtualization, and React Compiler as an option.
- **Web metrics:** Core Web Vitals (LCP, INP, CLS) and which levers move each one.
- **Testing skill:** Vitest and Testing Library, queries by role and label, user-event, async code, fake timers, mocked network, context and router wrappers, `renderHook`, error boundaries and accessibility.
- **Judgement:** knowing when not to optimize and what not to test.

## Typical format and timing
- **Length:** 45 to 60 minutes, often as a discussion about a real or invented problem, with a small live-coding part.
- **Performance part (about 20 to 25 minutes):** "this page is slow, what do you do?" You may get a code sample and a screen share of DevTools.
- **Testing part (about 20 to 30 minutes):** "write a test for this component or hook". Expect Vitest or Jest with Testing Library. Some companies ask for a short test plan instead of code.

## How to practise with these files
1. Read the lessons listed at the bottom, then do one file at a time.
2. Open a questions file, set a timer (8 to 10 minutes per performance scenario, 10 to 15 per testing exercise) and answer out loud, with a notebook for the order of your steps.
3. For the testing exercises, create `practice-app/scratch/r7-practice/`, save the component, write the test and run `npm test -- scratch/r7-practice`. Exercise 9 needs `npm install react-router`.
4. Only then open the answers file. Score yourself with the rubric below. Redo the items where you scored 2 or less, two days later.
5. Try the matching machine-coding tasks in the practice app, for example `practice-app/exercises/react/12-autocomplete-debounce` and `practice-app/exercises/react/24-virtualized-list`.

## Scoring rubric (per item, 0 to 4)
| Points | What it means |
|---|---|
| 1 | You name the right tool to find the problem (Profiler, Performance panel, Network tab, heap snapshot) and what you would look for. |
| 2 | You explain the real cause in plain words (why React re-rendered, what blocked the main thread, what was left running). |
| 3 | Your fix is correct, in a sensible order (cheapest and clearest first), with working code. |
| 4 | You say how you would check the fix worked, and when you would not optimize at all. |

For testing exercises: 1 point for behaviour-focused tests, 1 for good queries (role, label), 1 for failure and edge cases, 1 for fast and independent tests (no real network, no real waiting). A total of 30 or more out of 40 in a file means you are ready for this round.

## Common mistakes
- Optimizing by guesswork: adding `memo` and `useCallback` everywhere without a profile, or measuring in a development build.
- Using `memo` while passing new objects or functions as props, so it never skips.
- Calling `useDeferredValue` or a transition a speed-up: they keep the page responsive, they do not make the work smaller.
- Debouncing to fix a render problem, or forgetting to cancel old requests.
- Testing implementation details (state, class names, test ids first) instead of what the user sees.
- Real timers and real network in tests, `waitFor` with side effects, and tests that depend on each other.
- Forgetting the "not found", error and empty states in tests.

## Question files
| File | Items | Topics |
|---|---|---|
| [questions/01-performance-scenarios.md](questions/01-performance-scenarios.md) | 10 (PF) | typing lag, context re-renders, state colocation, INP, expensive calculations, debounce, virtualization, bundle size, LCP and CLS, memory leaks |
| [questions/02-testing-exercises.md](questions/02-testing-exercises.md) | 10 (TS) | forms, accessible queries, mocked fetch, fake timers, context wrapper, `renderHook`, reducers, error boundary, router, modal focus |

Answers: [answers/01-performance-scenarios.md](answers/01-performance-scenarios.md) and [answers/02-testing-exercises.md](answers/02-testing-exercises.md).

## Lessons to read first
- [Performance optimization](../../04-advanced/02-performance-optimization.md), [Memoization](../../02-hooks/07-memoization.md), [How React renders](../../04-advanced/01-how-react-renders.md)
- [Concurrent React and Suspense](../../04-advanced/03-concurrent-react-and-suspense.md), [Other hooks](../../02-hooks/09-other-hooks.md)
- [Testing React](../../04-advanced/08-testing-react.md), [Custom hooks](../../02-hooks/08-custom-hooks.md), [Accessibility](../../04-advanced/09-accessibility.md)
- Tooling: Vite, ESLint, build (planned), Browser and web platform (planned)
