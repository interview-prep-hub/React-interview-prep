# Round 4 - Machine Coding

Machine coding means building a small, working UI from a written spec in 45 to 90 minutes, in an editor or a shared sandbox, while someone watches. It is the centre of many product-company loops. You are scored on a working result first, then on code quality, handling of edge cases, accessibility and how you explain your choices.

There are no question files for this round. The questions are the **33 exercises** in the practice app. Each one has a written spec, a starter file, a test file that checks your work and a reference solution.

## How to practise

1. Pick an exercise and read its README. Set a timer for the suggested time shown in the README and in the tables below (shorter for Easy, longer for Hard).
2. Open the starter file `App.jsx` and build it. Do not look at the hints or the solution yet.
3. Run the tests from the `practice-app` folder:

```bash
npm test -- exercises/react/05-tabs
```

4. Say your plan out loud as you work, as you would in a real round: clarify requirements, name the state, then build the simplest version first.
5. When the tests pass or the timer ends, compare with the reference solution:

```bash
npm run test:solutions -- exercises/react/05-tabs
```

6. Read the "Interview follow-ups" in the README and answer them out loud.

## Scoring yourself

| Area | What a strong result looks like |
| --- | --- |
| Working result | All required behaviour works; the happy path first, then edge cases |
| Code quality | Small components, clear names, state kept in one place, no mutation |
| Edge cases | Empty states, errors, rapid clicks, unmount cleanup |
| Accessibility | Real buttons and labels, keyboard support, roles where needed |
| Communication | You explained the plan, trade-offs and what you would do with more time |

## Order to work through

Do Easy 01 to 10 in your first week, Medium 11 to 23 in the second and third week, then Hard 24 to 33. Repeat the ones you could not finish without help after three days.

## The exercises

### Easy

| # | Exercise | Level | Time | Topics |
| --- | --- | --- | --- | --- |
| 01 | [Counter with step and reset](../../practice-app/exercises/react/01-counter/README.md) | Easy | 15 minutes | `useState`, event handlers, controlled input |
| 02 | [FAQ accordion (one panel open at a time)](../../practice-app/exercises/react/02-accordion-single/README.md) | Easy | 15 minutes | `useState`, conditional rendering, `aria-expanded` |
| 03 | [Todo list (basic)](../../practice-app/exercises/react/03-todo-basic/README.md) | Easy | 20 minutes | lists, keys, controlled input, immutable updates |
| 04 | [Signup form with validation](../../practice-app/exercises/react/04-signup-form-validation/README.md) | Easy | 25 minutes | controlled forms, validation, accessibility of errors |
| 05 | [Tabs (ARIA tabs pattern)](../../practice-app/exercises/react/05-tabs/README.md) | Easy | 30 minutes | `useState`, ARIA tabs pattern, keyboard handling, roving tabindex |
| 06 | [Star rating](../../practice-app/exercises/react/06-star-rating/README.md) | Easy | 20 minutes | `useState`, hover state, derived values, accessible buttons |
| 07 | [Filterable product list](../../practice-app/exercises/react/07-filterable-list/README.md) | Easy | 20 minutes | derived state, filtering, controlled inputs |
| 09 | [Character counter](../../practice-app/exercises/react/09-character-counter/README.md) | Easy | 15 minutes | controlled textarea, derived values, disabled state |
| 10 | [Traffic light](../../practice-app/exercises/react/10-traffic-light/README.md) | Easy | 25 minutes | `useEffect` with timers, cleanup, state machine |

### Medium

| # | Exercise | Level | Time | Topics |
| --- | --- | --- | --- | --- |
| 11 | [Todo list with filters, editing and storage](../../practice-app/exercises/react/11-todo-advanced/README.md) | Medium | 45 minutes | lazy state initialisation, `useEffect`, `localStorage`, filtering, inline editing |
| 12 | [Autocomplete with debounce](../../practice-app/exercises/react/12-autocomplete-debounce/README.md) | Medium | 45 minutes | debounce, async effects, race conditions, loading states |
| 13 | [Pagination](../../practice-app/exercises/react/13-pagination/README.md) | Medium | 30 minutes | derived state, props, edge cases |
| 14 | [Modal with portal, focus trap and scroll lock](../../practice-app/exercises/react/14-modal-portal/README.md) | Medium | 40 minutes | portals (`createPortal`), refs, focus management, effects and cleanup, accessibility (dialog role, keyboard) |
| 15 | [Fetch list with retry and race protection](../../practice-app/exercises/react/15-fetch-list-retry/README.md) | Medium | 40 minutes | data fetching, loading/error states, race conditions, cleanup |
| 16 | [Infinite scroll feed](../../practice-app/exercises/react/16-infinite-scroll/README.md) | Medium | 40 minutes | `IntersectionObserver`, refs, effects, pagination |
| 17 | [Tic-tac-toe with history](../../practice-app/exercises/react/17-tic-tac-toe-history/README.md) | Medium | 40 minutes | state design, derived state, time travel |
| 18 | [Stopwatch with laps](../../practice-app/exercises/react/18-stopwatch/README.md) | Medium | 30 minutes | `useRef`, `setInterval`, effect cleanup, time formatting |
| 19 | [Shopping cart with a reducer and context](../../practice-app/exercises/react/19-shopping-cart-reducer/README.md) | Medium | 45 minutes | `useReducer`, context, pure reducers, derived totals |
| 20 | [Multi-step form (wizard)](../../practice-app/exercises/react/20-multi-step-form/README.md) | Medium | 45 minutes | wizard state, validation per step, data preservation |
| 21 | [Dropdown with click outside](../../practice-app/exercises/react/21-dropdown-click-outside/README.md) | Medium | 30 minutes | refs, document event listeners, custom hook, accessibility |
| 22 | [Image carousel](../../practice-app/exercises/react/22-image-carousel/README.md) | Medium | 30 minutes | state, wrap-around, timers, aria-live |
| 23 | [Data table](../../practice-app/exercises/react/23-data-table/README.md) | Medium | 45 minutes | sorting, filtering, pagination, derived state, `useMemo` |

### Hard

| # | Exercise | Level | Time | Topics |
| --- | --- | --- | --- | --- |
| 24 | [Virtualized list](../../practice-app/exercises/react/24-virtualized-list/README.md) | Hard | 60 minutes | windowing (virtualization), scroll events, performance, refs |
| 25 | [Kanban board](../../practice-app/exercises/react/25-kanban-board/README.md) | Hard | 60 minutes | `useReducer`, pure reducers, immutable nested updates, component composition |
| 26 | [Undo/redo hook](../../practice-app/exercises/react/26-undo-redo-hook/README.md) | Hard | 45 minutes | custom hook design, `useReducer`, history stack |
| 27 | [Mini query hook](../../practice-app/exercises/react/27-mini-query-hook/README.md) | Hard | 60 minutes | external store, `useSyncExternalStore`, caching, request deduping |
| 28 | [Nested comments (threaded replies)](../../practice-app/exercises/react/28-nested-comments/README.md) | Hard | 45 minutes | recursion, tree state, immutable nested updates |
| 29 | [File explorer tree](../../practice-app/exercises/react/29-file-explorer-tree/README.md) | Hard | 50 minutes | recursive components, immutable tree updates, accessibility roles (`tree`, `treeitem`, `group`) |
| 30 | [Dynamic form builder](../../practice-app/exercises/react/30-dynamic-form-builder/README.md) | Hard | 60 minutes | schema-driven UI, conditional fields, validation, composition |
| 31 | [Toast system](../../practice-app/exercises/react/31-toast-system/README.md) | Hard | 50 minutes | context, portals, timers, cleanup, ids |
| 32 | [Mini Redux store](../../practice-app/exercises/react/32-mini-redux-store/README.md) | Hard | 50 minutes | `useSyncExternalStore`, selectors, context, Redux internals |
| 33 | [Accessible combobox](../../practice-app/exercises/react/33-accessible-combobox/README.md) | Hard | 60 minutes | ARIA combobox pattern, keyboard navigation, focus, filtering |

## Learn the concepts first

- [State and events](../../01-basics/05-state-and-events.md)
- [Forms](../../01-basics/07-forms.md)
- [useEffect](../../02-hooks/03-useeffect.md)
- [Custom hooks](../../02-hooks/08-custom-hooks.md)
- [Component patterns](../../03-intermediate/01-component-patterns.md)

## Where to go next

- [Round 5: JavaScript coding](../round-5-javascript-coding/README.md)
- [Setup guide for the practice app](../../00-start-here/02-setup-your-playground.md)
