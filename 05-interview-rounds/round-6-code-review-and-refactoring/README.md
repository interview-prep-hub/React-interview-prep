# Round 6 - Code Review and Refactoring

> **Goal:** read someone else's React code, find what is wrong, rank the problems, explain why they matter, and fix them. **Time to prepare:** about 4 hours for all 14 scenarios.

## What this round tests
- Whether you can **spot** real problems: bugs, data loss, security holes, accessibility gaps, then performance and style.
- Whether you can **prioritise**. A candidate who lists 15 nits and misses the one crash fails this round.
- Whether you can **explain the why** in plain words ("React skips the render because the state is the same object").
- Whether you can **fix** the code cleanly, without over-engineering.
- Whether you can **talk like a good teammate**: clear, kind, specific, with a suggested fix.

## Typical format and timing
- 45 to 60 minutes. Either one pull request (a proposed change) of 50 to 150 lines, or 2 to 4 short snippets like the ones in this folder.
- Often screen-shared. You may be asked to leave review comments, then to rewrite one part live.
- Expect follow-ups: "How would you test it?", "What would you do with more time?", "Would you block the merge?"

## How a code review round works
1. **Read once without commenting.** Ask what the code should do. Ask what the inputs are.
2. **Walk through it as the browser would:** first render, a user action, a slow or failed network, an unmount.
3. **Say the problems in priority order:** Blocker, Major, Minor, Nit (defined below). Name the severity out loud.
4. **Explain the why** for each one: what the user sees, or what the team pays later.
5. **Fix the top problems first.** Show the refactored code. Keep the behaviour the same unless it was the bug.
6. **Close:** say whether you would merge, what you praised, and what you would do with more time.

Severity words: **Blocker** (bug, data loss, security: do not merge), **Major** (likely bug or real cost: fix before merge), **Minor** (fix soon, may be a follow-up), **Nit** (taste: start the comment with "nit:").

## Review checklist (in this order)
1. **Correctness:** state mutation, index keys, stale closures, hooks called conditionally, components defined inside components.
2. **Data and effects:** derived state, effects used for events, missing cleanup, wrong dependencies (and `eslint-disable`), fetch without `res.ok`, abort, error and empty states.
3. **Security:** unsafe HTML, user-controlled URLs, tokens in `localStorage`, secrets in the bundle, server actions without auth and validation.
4. **Accessibility:** real buttons and links, labels, alt text, keyboard use, errors announced.
5. **Types:** `any`, wrong event types, casts, non-null assertions.
6. **Performance:** only with evidence. Unstable props breaking `memo`, big lists, needless `useMemo`.
7. **Structure:** component size, prop drilling, naming, duplicated code, magic numbers.
8. **Tests:** do they check what the user sees, or implementation details?

## Scoring rubric (score each scenario, 0 to 3 per row, 15 points)
| Skill | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Find | Missed the top bug | Found it by luck | Found the main bugs | Found all Blockers and Majors |
| Prioritise | No order | Order is mixed up | Mostly right order | Right order with severity words |
| Explain | No reason given | Rule only ("never mutate") | Cause and effect | Cause, effect and what the user sees |
| Fix | No fix or wrong fix | Fix with new bugs | Correct fix | Correct, small, complete code |
| Communicate | Harsh or vague | Vague but polite | Clear | Clear, kind, with a suggestion and a verdict |

13 to 15 is interview-ready. 9 to 12: redo the scenario in two days. Below 9: read the linked lesson first.

## Common mistakes in this round
- Starting to rewrite before you understand the goal.
- Flagging style first and missing the bug (for example, a missing dependency or an unreset page number).
- Flagging correct code: `users.filter(...).sort(...)` does not mutate state, because `filter` makes a copy.
- Saying "this is bad" without saying what breaks.
- Adding `useMemo` and `useCallback` everywhere "to be safe".
- Fixing a missing `key` with `Math.random()` or silencing a lint rule instead of fixing the cause.
- Forgetting to praise something and to say whether you would merge.

## How to practise with these files
1. Open [questions/01-code-review.md](questions/01-code-review.md). Set a timer (8 to 12 minutes per scenario).
2. Say your review out loud, then write the refactored code in a scratch file in the [practice app](../../practice-app/README.md). Paste the broken code, run it, and watch the bug.
3. Open [answers/01-code-review.md](answers/01-code-review.md) and compare. Score yourself with the rubric.
4. Redo any scenario below 13 points after two days, without looking.

## Lessons to read first
- [useState in depth](../../02-hooks/02-usestate-in-depth.md), [useEffect](../../02-hooks/03-useeffect.md), [Hooks overview and rules](../../02-hooks/01-hooks-overview-and-rules.md)
- [Memoization](../../02-hooks/07-memoization.md), [Performance optimization](../../04-advanced/02-performance-optimization.md)
- [Data fetching](../../03-intermediate/02-data-fetching.md), [TypeScript with React](../../03-intermediate/08-typescript-with-react.md)
- [Accessibility](../../04-advanced/09-accessibility.md), [Security and i18n](../../04-advanced/10-security-and-i18n.md)
- [Conditional rendering and lists](../../01-basics/06-conditional-rendering-and-lists.md), [Component patterns](../../03-intermediate/01-component-patterns.md)
