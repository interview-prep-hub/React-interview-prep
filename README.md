# React Interview Prep

A complete self-study kit for the React part of a software interview. It starts from zero (the JavaScript that React needs, what JSX is) and goes up to advanced topics (rendering internals, performance, Server Components, testing, system design). Every lesson uses short sentences and small examples, and ends with interview questions that have model answers, plus practice items you can try on your own.

Facts were checked against the React 19.3 line, Next.js 16, React Router 8, Vite 8 and Vitest 5 as of November 2026.

## How to use it

1. **Learn:** read the lessons in order. Each one tells you what to read first and where to go next. The [study plans](00-start-here/01-how-to-use-this-repo.md) (2, 4, 8 and 12 weeks) tell you what to read each week.
2. **Code:** do the exercises in the [practice app](practice-app/README.md). Each has a spec, a starter file, tests that tell you when you are done, and a reference solution.
3. **Quiz:** use the [interview rounds](05-interview-rounds/README.md). Questions and answers are in separate files, so you can try first and check later.
4. **Revise:** the lessons end with a recap, and every lesson has a short list of common mistakes.

Start with [How to use this repo](00-start-here/01-how-to-use-this-repo.md) and [Set up your playground](00-start-here/02-setup-your-playground.md).

## Roadmap

| Level | Folder | What you can do afterwards |
| --- | --- | --- |
| Start | [00-start-here](00-start-here/01-how-to-use-this-repo.md) | Set up your tools and understand what the interviews test |
| 1 | [01-basics](01-basics/01-javascript-for-react.md) | Build small components with props, state, lists and forms |
| 2 | [02-hooks](02-hooks/01-hooks-overview-and-rules.md) | Use every built-in hook correctly and write your own |
| 3 | [03-intermediate](03-intermediate/01-component-patterns.md) | Structure real apps: patterns, data fetching, routing, state libraries, TypeScript |
| 4 | [04-advanced](04-advanced/01-how-react-renders.md) | Explain rendering, optimise, use Suspense and Server Components, test, design systems |
| Practice | [05-interview-rounds](05-interview-rounds/README.md) | Rehearse each type of interview round |
| Practice | [practice-app](practice-app/README.md) | 33 React and 24 JavaScript coding exercises with tests |

## Lessons

### Start here

| Lesson | Level | Time |
| --- | --- | --- |
| [How to Use This Repo](00-start-here/01-how-to-use-this-repo.md) | Beginner | 15 minutes |
| [Set Up Your Playground](00-start-here/02-setup-your-playground.md) | Beginner | 20 minutes |
| [How React Interviews Work](00-start-here/03-how-react-interviews-work.md) | Beginner | 25 minutes |

### Level 1: Basics

| Lesson | Level | Time |
| --- | --- | --- |
| [JavaScript You Need for React](01-basics/01-javascript-for-react.md) | Beginner | 60 minutes |
| [What Is React and Why Use It](01-basics/02-what-is-react.md) | Beginner | 40 minutes |
| [JSX](01-basics/03-jsx.md) | Beginner | 40 minutes |
| [Components and Props](01-basics/04-components-and-props.md) | Beginner | 50 minutes |
| [State and Events](01-basics/05-state-and-events.md) | Beginner | 55 minutes |
| [Conditional Rendering and Lists](01-basics/06-conditional-rendering-and-lists.md) | Beginner | 45 minutes |
| [Forms](01-basics/07-forms.md) | Beginner | 55 minutes |
| [Thinking in React](01-basics/08-thinking-in-react.md) | Beginner | 50 minutes |
| [JavaScript Deep Dive for Interviews](01-basics/10-javascript-deep-dive-for-interviews.md) | Intermediate | 90 minutes |

### Level 2: Hooks

| Lesson | Level | Time |
| --- | --- | --- |
| [Hooks Overview and the Rules of Hooks](02-hooks/01-hooks-overview-and-rules.md) | Beginner | 40 minutes |
| [useState in Depth](02-hooks/02-usestate-in-depth.md) | Beginner | 55 minutes |
| [useEffect](02-hooks/03-useeffect.md) | Intermediate | 75 minutes |
| [useRef and Refs](02-hooks/04-useref.md) | Intermediate | 45 minutes |
| [useContext and the Context API](02-hooks/05-usecontext.md) | Intermediate | 50 minutes |
| [useReducer](02-hooks/06-usereducer.md) | Intermediate | 45 minutes |
| [React.memo, useMemo and useCallback](02-hooks/07-memoization.md) | Intermediate | 55 minutes |
| [Custom Hooks](02-hooks/08-custom-hooks.md) | Intermediate | 65 minutes |
| [The Other Hooks](02-hooks/09-other-hooks.md) | Advanced | 60 minutes |

### Level 3: Intermediate

| Lesson | Level | Time |
| --- | --- | --- |
| [Component Patterns](03-intermediate/01-component-patterns.md) | Intermediate | 65 minutes |
| [Data Fetching](03-intermediate/02-data-fetching.md) | Intermediate | 70 minutes |
| [Routing with React Router](03-intermediate/03-react-router.md) | Intermediate | 65 minutes |
| [Forms with React Hook Form and Zod](03-intermediate/04-forms-with-libraries.md) | Intermediate | 55 minutes |
| [Error Boundaries, Portals, Fragments and Friends](03-intermediate/05-error-boundaries-portals-and-friends.md) | Intermediate | 55 minutes |
| [State Management](03-intermediate/06-state-management.md) | Intermediate | 75 minutes |
| [Styling React Apps](03-intermediate/07-styling.md) | Intermediate | 45 minutes |
| [TypeScript with React](03-intermediate/08-typescript-with-react.md) | Intermediate | 70 minutes |

### Level 4: Advanced

| Lesson | Level | Time |
| --- | --- | --- |
| [How React Renders](04-advanced/01-how-react-renders.md) | Advanced | 75 minutes |
| [Performance Optimization](04-advanced/02-performance-optimization.md) | Advanced | 80 minutes |
| [Concurrent React and Suspense](04-advanced/03-concurrent-react-and-suspense.md) | Advanced | 65 minutes |
| [React 19 and Newer](04-advanced/04-react-19-and-newer.md) | Advanced | 70 minutes |
| [SSR, Hydration and Server Components](04-advanced/05-ssr-and-server-components.md) | Advanced | 80 minutes |
| [Next.js Essentials](04-advanced/06-nextjs-essentials.md) | Advanced | 70 minutes |
| [Testing React Apps](04-advanced/08-testing-react.md) | Advanced | 80 minutes |
| [Accessibility (a11y)](04-advanced/09-accessibility.md) | Advanced | 60 minutes |
| [Security and Internationalisation](04-advanced/10-security-and-i18n.md) | Advanced | 60 minutes |
| [Frontend System Design](04-advanced/11-frontend-system-design.md) | Advanced | 90 minutes |

## Interview rounds

| Round | Questions | Answers |
| --- | --- | --- |
| [Round 1: screening quiz](05-interview-rounds/round-1-screening-quiz/README.md) | [screening quiz](05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md) | [screening quiz](05-interview-rounds/round-1-screening-quiz/answers/01-screening-quiz.md) |
| [Round 2: concepts and theory](05-interview-rounds/round-2-concepts-and-theory/README.md) | [fundamentals and hooks](05-interview-rounds/round-2-concepts-and-theory/questions/01-fundamentals-and-hooks.md), [rendering state and modern react](05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md) | [fundamentals and hooks](05-interview-rounds/round-2-concepts-and-theory/answers/01-fundamentals-and-hooks.md), [rendering state and modern react](05-interview-rounds/round-2-concepts-and-theory/answers/02-rendering-state-and-modern-react.md) |
| [Round 3: output and debugging](05-interview-rounds/round-3-output-and-debugging/README.md) | [output prediction](05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md), [bug hunt](05-interview-rounds/round-3-output-and-debugging/questions/02-bug-hunt.md) | [output prediction](05-interview-rounds/round-3-output-and-debugging/answers/01-output-prediction.md), [bug hunt](05-interview-rounds/round-3-output-and-debugging/answers/02-bug-hunt.md) |
| [Round 4: machine coding](05-interview-rounds/round-4-machine-coding/README.md) | practice app exercises | tests and reference solutions |
| [Round 5: javascript coding](05-interview-rounds/round-5-javascript-coding/README.md) | practice app exercises | tests and reference solutions |
| [Round 6: code review and refactoring](05-interview-rounds/round-6-code-review-and-refactoring/README.md) | [code review](05-interview-rounds/round-6-code-review-and-refactoring/questions/01-code-review.md) | [code review](05-interview-rounds/round-6-code-review-and-refactoring/answers/01-code-review.md) |
| [Round 7: performance and testing](05-interview-rounds/round-7-performance-and-testing/README.md) | [performance scenarios](05-interview-rounds/round-7-performance-and-testing/questions/01-performance-scenarios.md), [testing exercises](05-interview-rounds/round-7-performance-and-testing/questions/02-testing-exercises.md) | [performance scenarios](05-interview-rounds/round-7-performance-and-testing/answers/01-performance-scenarios.md), [testing exercises](05-interview-rounds/round-7-performance-and-testing/answers/02-testing-exercises.md) |
| [Round 8: frontend system design](05-interview-rounds/round-8-frontend-system-design/README.md) | [prompts](05-interview-rounds/round-8-frontend-system-design/questions/01-prompts.md) | [prompts](05-interview-rounds/round-8-frontend-system-design/answers/01-prompts.md) |
| [Round 9: behavioral and project](05-interview-rounds/round-9-behavioral-and-project/README.md) | [behavioral and project](05-interview-rounds/round-9-behavioral-and-project/questions/01-behavioral-and-project.md) | [behavioral and project](05-interview-rounds/round-9-behavioral-and-project/answers/01-behavioral-and-project.md) |

## Practice app

The [practice app](practice-app/README.md) is a Vite and React 19 project with Vitest tests. From the `practice-app` folder:

```bash
npm install
npm run dev
```

```bash
npm test -- exercises/react/01-counter
```

```bash
npm run test:solutions -- exercises/react/01-counter
```

The first command opens a playground with every exercise, the second runs your code against the tests, and the third runs the reference solution against the same tests.

## What is not finished

See [REMAINING.md](REMAINING.md) for the lessons, cheatsheets and extras that are still to be written.
