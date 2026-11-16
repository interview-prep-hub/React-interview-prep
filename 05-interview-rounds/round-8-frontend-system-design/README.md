# Round 8 - Frontend System Design

> **Level:** Mid to Staff   **Time:** 45 minutes per prompt   **Files:** [questions](questions/01-prompts.md), [answers](answers/01-prompts.md)

## What this round tests
You get a vague request ("design a news feed") and no code editor. The interviewer checks if you can ask good questions, break the problem into parts, choose between options and explain the cost of each choice. They also listen for performance, accessibility, error handling and how you talk about trade-offs.

## Typical format and timing
- Reported length is 45 to 60 minutes. Ask your recruiter, because it differs by company.
- You talk and draw (a whiteboard, a drawing tool or a shared document). Little or no code is expected.
- Expectations grow with level: juniors are rarely asked, mid level gets a small component design (autocomplete, carousel), senior gets a full feature with trade-offs, staff gets platform topics (design systems, migrations, micro-frontends).

## Files in this round
- [questions/01-prompts.md](questions/01-prompts.md): 24 prompts in three groups (UI components, product features, platform topics), each with a scope line and three follow-up probes.
- [answers/01-prompts.md](answers/01-prompts.md): a reusable framework (RADIO steps and a 45-minute plan), ten full worked answers and a five-line outline for the other fourteen.

## How to practise
1. Pick a prompt. Set a timer. Do not open the answers.
2. Speak out loud and draw. Start with questions, write the requirements, then the component tree, data model, API and optimizations.
3. Answer the three probes in your own words.
4. Open the answer. Compare, then score yourself with the rubric below. Write down the gaps and repeat the prompt a week later.
5. Build a small part of it in the practice app: [autocomplete](../../practice-app/exercises/react/12-autocomplete-debounce/README.md), [image carousel](../../practice-app/exercises/react/22-image-carousel/README.md), [data table](../../practice-app/exercises/react/23-data-table/README.md), [Kanban board](../../practice-app/exercises/react/25-kanban-board/README.md).

## How to run a mock round (with a friend)
- The interviewer reads only the prompt title and scope line, and answers questions about requirements (invent sensible answers).
- After the requirements step, the interviewer lets the candidate lead for about 25 minutes, then asks the probes as deep dives.
- The last 5 minutes: the candidate summarises the design, the main trade-offs and what they would do with more time. The interviewer scores with the rubric and gives two things to keep and two to fix.

## Scoring rubric
Score each row from 0 (missing) to 3 (strong). Total 24 points.

| Area | 0 | 3 |
|---|---|---|
| Requirements and scope | Starts drawing at once | Asks questions, states assumptions, cuts scope |
| Architecture and components | One big box | Clear parts, owners of state, where code runs |
| Data model and API | Vague "call the backend" | Entities, endpoints, pagination, error shape |
| State and rendering | Everything in one store | Server, UI and URL state separated, rendering choice justified |
| Performance | "Use memo" | Budgets, loading plan, lists, images, measurement |
| Accessibility | Not mentioned | Semantics, keyboard, focus, live regions, motion |
| Edge cases and errors | Only the happy path | Loading, empty, error, offline, races |
| Trade-offs and communication | Single answer, no cost | Options, costs, a clear choice, calm summary |

Bands: 0 to 8 needs work, 9 to 16 solid, 17 to 21 strong, 22 to 24 excellent.

## Common mistakes
- Drawing before asking questions, or never stating assumptions.
- Naming tools instead of explaining choices ("I would use X" without why).
- Ignoring accessibility, errors and slow networks until the interviewer asks.
- Putting all state in one global store, or fetching in every component.
- Designing the backend in detail instead of the client and its API needs.
- Going deep in one corner and running out of time before the end summary.
- Claiming facts you are unsure about. Say "I would check that" instead.

## Lessons to read first
[Frontend system design](../../04-advanced/11-frontend-system-design.md), [Performance optimization](../../04-advanced/02-performance-optimization.md), [Accessibility](../../04-advanced/09-accessibility.md), [SSR and Server Components](../../04-advanced/05-ssr-and-server-components.md), [State management](../../03-intermediate/06-state-management.md), [Data fetching](../../03-intermediate/02-data-fetching.md), APIs, HTTP and auth (planned), Browser and web platform (planned), [Security and i18n](../../04-advanced/10-security-and-i18n.md).

## Status and remaining work
The framework, ten worked answers and fourteen outlines are done. Not yet written, in priority order: full worked answers for the outline prompts (micro-frontends, migration strategy, offline support, infinite scroll list, real-time dashboard), extra prompts from the common lists (photo sharing, calendar app, drawing tool, form builder, maps UI, file upload with resume), diagrams as images, and a second "mock round script" file with timed interviewer cue cards. The 5, 5, 10, 10 and 15 minute split is reported by one prep guide only, so it is shown as a starting point.
