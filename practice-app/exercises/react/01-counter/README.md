# 01 - Counter with step and reset

**Level:** Easy | **Time:** 15 minutes | **Topics:** `useState`, event handlers, controlled input

## The task

Build a small counter. The user can change the count, choose how big each change is (the "step"), and reset everything.

Work in [`App.jsx`](./App.jsx). Do not edit the test file.

## Requirements

1. Show the current count inside an element with `data-testid="count"`. It starts at `0`.
2. A button labelled **Increment** adds the current step to the count.
3. A button labelled **Decrement** subtracts the current step from the count.
4. A number input labelled **Step** (use a `<label>`) sets the step. It starts at `1`.
5. A button labelled **Reset** puts the count back to `0` and the step back to `1`.
6. If the step input is empty or not a valid number, treat the step as `1` when incrementing or decrementing (but let the user keep typing).

## Acceptance criteria (what the tests check)

- Initial screen shows count `0` and step `1`.
- Clicking Increment three times shows `3`.
- Changing the step to `5` and clicking Increment shows `5`; then Decrement shows `0`.
- Reset restores both count and step.
- Clearing the step input does not crash and increments by `1`.

## How to run

```bash
npm test -- exercises/react/01-counter
```

To see your component in the browser, run `npm run dev` and pick `01-counter` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/01-counter
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. You need two pieces of state: the count and the step.
2. For a controlled input the value is stored in state and updated in `onChange`. `e.target.value` is always a string.
3. Convert the step with `Number(step)` and fall back to `1` when the result is `NaN` or the string is empty.
4. When you update state based on the old state, prefer the functional form: `setCount(c => c + amount)`.

</details>

## Stretch goals

- Do not let the count go below `0`.
- Keep the step as a string in state while typing, but show a red hint when it is not a positive integer.

## Interview follow-ups to prepare for

- Why do we keep the step as a string while the user types?
- What is the difference between `setCount(count + 1)` and `setCount(c => c + 1)`? When does it matter?
- How would you move this logic into a custom hook, `useCounter`?

## Learn the concepts first

- [State and events](../../../../01-basics/05-state-and-events.md)
- [useState in depth](../../../../02-hooks/02-usestate-in-depth.md)
- [Forms](../../../../01-basics/07-forms.md)
