# Round 1 - Screening Quiz

> **Time:** 45 minutes for the full mock, about 30 seconds per question   **Questions:** 90   **Level:** all levels

**Files:** [questions/01-screening-quiz.md](questions/01-screening-quiz.md) and [answers/01-screening-quiz.md](answers/01-screening-quiz.md). The two files use the same IDs in the same order.

## What this round tests
A screening quiz is the first filter. A recruiter, an engineer, or an online test checks whether you know the basics well enough to be worth a longer interview. They want quick, correct, plain answers, not essays.

- **Vocabulary:** can you name things correctly (props, state, hook, key, hydration)?
- **Core ideas:** do you know why, not only what (why keys, why hooks have rules)?
- **Small traps:** can you spot the `0 &&` pitfall, a stale closure, or a mutated state array in a few seconds?

## Typical format
- 20 to 90 short questions in 20 to 45 minutes, on a web form, a phone call, or a live call.
- Three kinds of items: one-line questions, true or false with a reason, and "what does this print" one-liners.

## What is in the question file
| Area | IDs | Count | Topics |
|---|---|---|---|
| Basics | R1-BS-001 to 026 | 26 | React idea, JSX, lists and keys, props, state, forms |
| Hooks | R1-HK-001 to 025 | 25 | Rules, useState, useEffect, refs, memoization, context |
| Advanced and ecosystem | R1-AD-001 to 029 | 29 | Rendering, performance, state tools, routing, testing, TypeScript, SSR, React 19, accessibility, security |
| JavaScript and CSS | R1-JS-001 to 010 | 10 | Equality, closures, event loop, box model, flexbox |

About half the questions are Easy, a third are Medium, and the rest are Hard.

## How to run a 45-minute mock
1. Read the lessons in "Learn first" at the top of the questions file. Do not skip this on your first pass.
2. Set a 45-minute timer. Open only the questions file.
3. For each question, answer out loud in about 30 seconds. If you are stuck after 30 seconds, say "skip" and move on.
4. Write your own score for each question on paper as you go: 1, 0.5 or 0.
5. After the timer ends, open the answers file and check each one. Change a 1 to 0.5 or 0 if your answer missed the core idea. You can also split the mock into two 22-minute halves on two days.

## Scoring rubric
- **1 point:** the core idea is correct and you gave the reason (for true or false, say why).
- **0.5 points:** partly right, or right but with no reason.
- **0 points:** wrong, skipped, or a guess you cannot explain.

| Score out of 90 | Meaning | What to do |
|---|---|---|
| 72 or more (80 percent) | Ready | Move on to the concepts round and the coding rounds |
| 54 to 71 (60 to 79 percent) | Nearly there | Revise hooks and rendering, then retake the missed questions |
| Below 54 | Not yet | Go back to the lessons, then repeat the whole quiz after a week |

## Track your weak areas
Score each area on its own. If an area is below its mark, it is a weak area.

| Area | Max | Weak if below |
|---|---|---|
| Basics (BS) | 26 | 19 |
| Hooks (HK) | 25 | 18 |
| Advanced (AD) | 29 | 21 |
| JavaScript and CSS (JS) | 10 | 7 |

Keep a list of the IDs you missed and, for each one, the lesson from its **Learn more** line. Re-read that lesson, close it, and answer the question again after two days. Remove an ID from the list only when you get it right twice.

## Common mistakes
- Talking for two minutes. A screening answer is one or two sentences with the key word and the reason.
- Saying "it depends" and stopping. Pick the default, then name the exception.
- Mixing up a re-render with a DOM update. React re-runs your component; it changes the DOM only if the output differs.
- Guessing "what does this print" without tracing the snapshot. Read the code line by line as one render.
- Learning wording by heart. Interviewers rephrase, so understand the idea.

## Lessons behind these questions
- Basics: [What is React](../../01-basics/02-what-is-react.md), [JSX](../../01-basics/03-jsx.md), [Components and props](../../01-basics/04-components-and-props.md), [State and events](../../01-basics/05-state-and-events.md), [Lists](../../01-basics/06-conditional-rendering-and-lists.md), [Forms](../../01-basics/07-forms.md)
- Hooks: [Rules of hooks](../../02-hooks/01-hooks-overview-and-rules.md), [useState](../../02-hooks/02-usestate-in-depth.md), [useEffect](../../02-hooks/03-useeffect.md), [useRef](../../02-hooks/04-useref.md), [Memoization](../../02-hooks/07-memoization.md)
- Advanced: [How React renders](../../04-advanced/01-how-react-renders.md), [Performance](../../04-advanced/02-performance-optimization.md), [React 19](../../04-advanced/04-react-19-and-newer.md), [SSR and Server Components](../../04-advanced/05-ssr-and-server-components.md), [Testing](../../04-advanced/08-testing-react.md), [Accessibility](../../04-advanced/09-accessibility.md), [Security](../../04-advanced/10-security-and-i18n.md)
- JavaScript and CSS: [JavaScript deep dive](../../01-basics/10-javascript-deep-dive-for-interviews.md), HTML and CSS basics (planned)
