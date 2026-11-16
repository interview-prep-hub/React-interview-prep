# Remaining Work and Known Limits

This file lists what is not done yet, so you can decide what to add next. It was written on 2026-11-10 when the work was wound down to save effort. Everything not listed here is finished and usable. The main [README](README.md) has the full list of what exists.

## What is finished and checked

- **Practice app** (`practice-app/`): 33 React exercises and 24 JavaScript exercises. Each has a README, a starter file, tests and a reference solution. On 2026-11-10 every reference solution passed every test (71 test files, 2969 tests), and the starters failed their tests as intended. `npm run build` for the playground also works.
- **39 lessons** in `00-start-here` to `04-advanced`, all passing the book linter (no broken links, no banned characters, template headings present).
- **Interview rounds 1 to 9**: question and answer files for rounds 1, 2, 3, 6, 7, 8 and 9 (question counts: 90, 70, 42, 14, 20, 24 prompts, about 58), and index pages for rounds 4 and 5 that point to the exercises. The output-prediction answers in round 3 and the testing answers in round 7 were run with Vitest before being written down.

## Not written yet

### Lessons

Links to these are shown as "(planned)" in the other lessons.

| Planned file | Topic |
| --- | --- |
| `01-basics/09-html-css-and-browser-basics.md` | Semantic HTML, box model, specificity, flexbox, grid, centering, stacking context, responsive design |
| `03-intermediate/09-tooling-vite-eslint-build.md` | Vite, ESLint, Prettier, environment variables, source maps, build output |
| `03-intermediate/10-apis-http-and-auth-for-frontend.md` | HTTP, REST, GraphQL, auth flows, token storage, WebSocket and SSE |
| `03-intermediate/11-legacy-react-class-components-and-redux-connect.md` | Class components, lifecycle, PropTypes, HOCs, Redux `connect`, migrating to hooks |
| `04-advanced/07-advanced-patterns.md` | State machines, optimistic updates, headless UI, polymorphic components |
| `04-advanced/12-react-internals-deep-dive.md` | Fiber, lanes, how hooks are stored, a tiny React from scratch |
| `04-advanced/13-browser-and-web-platform.md` | What happens when you type a URL, rendering pipeline, caching, storage, workers |

### Cheatsheets (`06-cheatsheets/`, folder not created)

Hooks cheatsheet, patterns and syntax cheatsheet, 120 quick-fire answers, glossary, the 40 most common bugs, interview-day checklist, and a short sheet on legacy class components and Redux `connect`. The guide in `00-start-here/01-how-to-use-this-repo.md` mentions these as "(planned)".

### Round extras

- **Round 4**: a take-home assignment guide (how to scope, structure and finish a take-home in about three hours).
- **Round 5**: a short "DSA-lite" section (arrays, strings, hash maps, two pointers, sliding window, stack, tree traversal).
- **Round 3**: more output and debugging topics were planned but cut: click order (capture and bubble) and `flushSync`, errors in event handlers versus error boundaries, form actions and `useFormStatus`, `use(promise)`, `useOptimistic`, `Activity`, `sort` versus `toSorted`, and JavaScript one-liner traps (`parseInt` in `map`, `forEach(async)`).
- **Round 6**: 14 scenarios in one file. A second file of harder, senior-level scenarios was planned.
- **Round 8**: 10 prompts have full worked answers and the rest have short outlines. More worked answers can be added.
- **Round 9**: the answers are templates with placeholders for your own stories on purpose. Fill them in.

### More exercises suggested by the research

OTP input, chat UI with streaming replies, optimistic like button, theme switcher with context, protected route with a fake login, drag-and-drop sortable list, Wordle, and one take-home sized project.

## Known limits (read before trusting a fact)

- **Review passes were not completed.** The plan was for every lesson to get a second pass that runs every code sample and a third pass that reads it as a beginner. Those passes were stopped, so the lessons are first drafts. Authors ran code where behaviour was surprising, but not every sample. Check version-specific claims (React 19.x, Next.js 16, React Router 8) against the official docs before an interview.
- **Lesson length varies.** Lessons written in the last pass are long (about 800 to 1000 lines). The older ones are shorter.
- **Exercises**: the tests were reviewed by trying wrong implementations, but only for part of the exercises before the work was stopped. If a test passes a solution that is clearly wrong, or fails a correct one, treat it as a bug in the test.
- **Study plans** in `00-start-here/01-how-to-use-this-repo.md` were written before the round files were merged into fewer, larger files, so some rows say "R3 rendering" or "R2 hooks" and link to the larger file that now holds them.
- **Interview-format content** about take-home, pairing and rounds that allow coding assistants rests on reported surveys and company policies that were not independently verified. The lesson says "reported" for those. Remove that section if you prefer to keep the book strictly about React.

## How to continue

Ask for any item above by name (for example "write the cheatsheets" or "write the browser and web platform lesson"). New lessons should follow the existing template: Level line, What you will learn, numbered concepts, How interviewers test this, Interview questions with answers, Common mistakes, Practice yourself with hidden answers, Recap, Where to go next. New question files use IDs like `R2-HK-014` that match between `questions/` and `answers/`.
