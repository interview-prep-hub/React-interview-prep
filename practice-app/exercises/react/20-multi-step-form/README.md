# 20 - Multi-step form (wizard)

**Level:** Medium | **Time:** 45 minutes | **Topics:** wizard state, validation per step, data preservation

## The task

Build a sign-up wizard with three steps: **Account** (email and password), **Profile** (full name and age) and **Review**. A progress label tells the user where they are ("Step 2 of 3"). The user cannot leave a step while its data is invalid: **Next** shows inline error messages instead. **Back** never loses anything the user typed. The Review step lists all the values, has **Edit** buttons that jump back to the matching step, and has a **Submit** button that finishes the wizard.

The key design decision is where the data lives. Only one step is on screen at a time, and a step is removed from the page when the user leaves it. So the steps cannot own the data. All the form data lives in **one state object in the parent wizard** (`App`), and the steps just show it and change it.

This exercise reuses the error markup you met in [exercise 04](../04-signup-form-validation/README.md), so look at it again if you need a reminder.

Work in [`App.jsx`](./App.jsx). Do not edit the test file.

## Requirements

1. **The component and its prop.** `App` is the wizard. It accepts one optional prop, `onSubmit` (a function). When the prop is missing, submitting still works and simply calls nothing (the playground renders `App` without props). Keep the `<h2>Sign up</h2>` from the starter.

2. **One form.** The whole wizard is a single `<form>` with the `noValidate` attribute (so the browser does not show its own error bubbles). Pressing **Enter** inside a field does the same as clicking the main button of the step (**Next**, or **Submit** on the Review step). Every submit, on every step, valid or not, must cancel the browser's default action (`event.preventDefault()`), or the page reloads and the user loses everything.

3. **One state object.** Keep the four values in ONE state object in `App`: `{ email, password, fullName, age }`. All four are strings and all start as `''`. The step components hold no state of their own.

4. **Progress label.** Render `<p data-testid="progress">` with the text exactly `Step 1 of 3`, `Step 2 of 3` or `Step 3 of 3`, matching the current step.

5. **Only the current step is on the page.** The fields and buttons of the other steps are not rendered at all (not just hidden). Each step starts with a heading (any level, the starter uses `<h3>`) whose text is exactly `Account`, `Profile` or `Review`.

6. **The inputs.** Every input has a `<label>` connected with `htmlFor` and `id`, is controlled by React state, and starts empty. The label text is exact:

   | Step | Label text | Input `type` |
   | --- | --- | --- |
   | 1 Account | `Email` | `email` |
   | 1 Account | `Password` | `password` |
   | 2 Profile | `Full name` | `text` |
   | 2 Profile | `Age` | `text` (add `inputMode="numeric"`) |

   The age input is `type="text"` on purpose: a `type="number"` input hides text that is not a number, so you could never show an error for it.

7. **The buttons.** The accessible name of each button is exactly its text:

   | Step | Buttons |
   | --- | --- |
   | 1 Account | `Next` (no Back button on the first step) |
   | 2 Profile | `Back` and `Next` |
   | 3 Review | `Back`, `Submit`, `Edit account` and `Edit profile` (no Next button) |

   `Next` and `Submit` are the submit button of the form. `Back`, `Edit account` and `Edit profile` must have `type="button"`, because a button inside a form is a submit button by default, and these three must never submit the form.

8. **The rules and the exact messages.** Each step checks its own fields. Check all the fields of the step every time, so two errors can show at once.

   | Field | Valid when | Error message |
   | --- | --- | --- |
   | Email | it looks like `text@text.text`: exactly one `@`, something before it, something after it, then a dot with something after the dot, and no spaces | `Enter a valid email address` |
   | Password | it has at least 8 characters (spaces count as characters) | `Password must be at least 8 characters` |
   | Full name | it has at least one character that is not a space (spaces only counts as empty) | `Full name is required` |
   | Age | it is a whole number from 18 to 120 written with digits only (so `18.5`, `-20`, `+30`, `1e2` and `abc` are all rejected). Spaces at the start or end are ignored | `Age must be a whole number from 18 to 120` |

   The browser already removes spaces at the very start and end of an `email` input's value, so for the email rule only spaces inside the text matter (for example `ada lovelace@example.com` is invalid). The age input is `type="text"`, so spaces around the age do reach your code: ignore them when you check it, but keep the age as typed in the state.

9. **When validation runs.** Only when the user presses **Next** (by click or by Enter). Do not validate while the user types, and do not validate when a field loses focus. **Back** and the **Edit** buttons never validate.

10. **How an error is shown.** For each invalid field, render the message in its own element, shown under the input, with:
    - `role="alert"`
    - an `id`, and the input's `aria-describedby` set to that id
    - the input also gets `aria-invalid="true"`

    Render the error element only while the error exists. A field without an error has no `aria-describedby` and no `aria-invalid="true"`.

11. **Next on an invalid step.** The user stays on the same step, the errors show, and everything typed stays in the fields. Only the step's own fields are checked: Next on step 1 never shows errors for Full name or Age.

12. **Next on a valid step.** Go to the next step. No error messages are on screen after the move.

13. **Editing removes the error.** As soon as the user edits a field (one typed character is enough, even if the value is still invalid), the error of that field disappears. Errors of the other fields stay until they are edited too or until the next press of Next. Do not re-validate until the next press of Next.

14. **Back.** Go to the previous step without any validation, even if the current step is empty or invalid. Everything the user typed stays in the state, including invalid text: coming back to a step shows exactly what was typed there. Coming back shows no error messages until Next is pressed again.

15. **Every move clears the errors.** After Next, Back or an Edit button, no error message is on screen.

16. **The Review step.** It has no inputs. It shows the four values, each one in an element with a `data-testid` and with a visible text label next to it:

    | Label text | `data-testid` | What it shows |
    | --- | --- | --- |
    | `Email` | `review-email` | the email |
    | `Password` | `review-password` | one asterisk (`*`) per character of the password, never the password itself |
    | `Full name` | `review-fullName` | the full name |
    | `Age` | `review-age` | the age |

    A good fit is a `<dl>` with `<dt>` for the label and `<dd>` for the value.

17. **The Edit buttons.** **Edit account** jumps to step 1. **Edit profile** jumps to step 2. The values are kept in the fields. The user does not skip anything: to come back to the Review step, they press **Next** again, and the step is validated again. So an edited value that is invalid blocks the way to the Review step.

18. **Submit.** The **Submit** button exists only on the Review step. When it is pressed, call `onSubmit` exactly once with an object that has exactly these four keys, with the values as the user typed them: `{ email, password, fullName, age }` (all strings). `onSubmit` is never called before that moment. Then replace the whole wizard (the form, the progress label and all the buttons) with `<p role="status">All done, {name}!</p>`, where `{name}` is the full name without the spaces at the start and end. For example `All done, Ada Lovelace!`. Keep the `<h2>Sign up</h2>`.

## Acceptance criteria (what the tests check)

- The initial screen shows `Step 1 of 3`, the `Account` heading, empty Email and Password fields with the right types, a Next button and no Back button.
- The `<h2>Sign up</h2>` heading is there, and the page has exactly one `<form>`, with the `novalidate` attribute.
- Step 2 shows `Step 2 of 3`, the `Profile` heading, empty Full name and Age fields (both `type="text"`, and Age has `inputmode="numeric"`), and Back and Next buttons. The step 1 fields are gone.
- Next on an empty step shows exactly two alerts, each input points to its alert with `aria-describedby`, and each has `aria-invalid="true"`. The user stays on the step.
- When only one field is invalid, only that field shows error markup.
- A blocked Next keeps everything that was typed in the fields.
- These emails are rejected: `ada`, `ada@`, `ada@example`, `@example.com`, `ada@example.`, `ada@@example.com`, `ada lovelace@example.com`. These are accepted: `ada@example.com`, `ada.lovelace+test@mail.example.co.uk`.
- A 7 character password is rejected, an 8 character password is accepted, and spaces count as characters.
- A full name made only of spaces is rejected, and a one character name is accepted.
- These ages are rejected: empty, `abc`, `0`, `17`, `121`, `18.5`, `-20`, `1e2`, `+30`. These are accepted: `18`, `36`, `120` and `36` with spaces around it.
- Typing or tabbing away from a field never shows an error.
- Typing one character in a field removes only that field's error, and the next Next press validates again.
- Back keeps everything typed on both steps, even invalid text, and works on an empty step without errors.
- Error messages do not follow the user to another step.
- Going Back, changing an earlier step to something invalid and pressing Next is blocked with an error.
- The Review step shows `Step 3 of 3`, the `Review` heading, the four values (password as one asterisk per character, spaces included, never in clear text), their labels, no inputs, and the buttons Back, Submit, Edit account and Edit profile (no Next).
- Edit account and Edit profile jump to the right step with the values kept, and changed values show up on the Review step after going forward again. Edited values are validated again.
- Submit calls `onSubmit` once with the four values (also after edits, also in `StrictMode`), exactly as the user typed them (spaces included), and never before.
- After Submit the screen shows `All done, Ada Lovelace!` in a `role="status"` element and the wizard is gone but the `Sign up` heading stays. Spaces around the name are left out of the message.
- Submit works when no `onSubmit` prop is given.
- Enter in a field works like Next, also on an invalid step. The Back button does not submit the form.
- A submit event on any step (valid or not) is cancelled with `preventDefault`, so the page never reloads.

## How to run

```bash
npm test -- exercises/react/20-multi-step-form
```

To see your component in the browser, run `npm run dev` and pick `20-multi-step-form` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/20-multi-step-form
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Start with the data. One `useState` with an object: `useState({ email: '', password: '', fullName: '', age: '' })`. Give every input a `name` attribute that matches a key, and one `handleChange` can serve all four inputs: `setValues(v => ({ ...v, [e.target.name]: e.target.value }))`.
2. The current step is just a number: `0`, `1` or `2`. The label is `Step {step + 1} of 3`. Show a step with `{step === 0 && <AccountStep ... />}`. Make each step a small component that receives `values`, `errors` and `onChange` as props and has no state of its own.
3. Write `validateStep(stepIndex, values)` as a pure function outside the component. A neat way: a list of the field names of each step, and one small rule per field that returns a message or an empty string. The function returns an object such as `{ email: 'Enter a valid email address' }`, and `{}` means "valid".
4. A simple email check is a regular expression: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. For the age, trim the text first, check that it only has digits with `/^\d+$/`, and only then call `Number(text)` and compare it with 18 and 120. Checking the digits first matters: `Number('1e2')` is `100` and `Number('18.5')` is not a whole number.
5. Put `onSubmit={handleSubmit}` on the `<form>`, and call `event.preventDefault()` first, or the browser reloads the page. One handler serves both Next and Submit: if `step` is the last one, call the `onSubmit` prop and show the final message, otherwise validate and move on. Call `onSubmit` straight from the event handler, not from inside a state updater function: React `StrictMode` calls updater functions twice in development to catch impure code, and one test renders the wizard in `StrictMode`.
6. Write a small `goTo(nextStep)` function that does `setStep(nextStep)` and `setErrors({})`. Next, Back and the two Edit buttons can all use it, and it guarantees that errors never follow the user to another step.
7. If clicking **Back** seems to "validate" or jump forward, check its `type`. A button inside a form is `type="submit"` by default. Back and the Edit buttons need `type="button"`.
8. To remove the error of one field without touching the others: `setErrors(current => ({ ...current, [name]: undefined }))`, inside `handleChange`.
9. The inputs share the same markup, so write a small `Field` component like in exercise 04. Use the `useId` hook for the ids, and build the error id from it, for example `` `${id}-error` ``. Set `aria-describedby={error ? errorId : undefined}`.
10. For the masked password: `'*'.repeat(values.password.length)`.
11. For the final message, keep the name in state (`null` while the user is filling the form). When it is not `null`, return only the heading and the `<p role="status">`.

</details>

## Stretch goals

- After a step change, move keyboard focus to the step heading (give it `tabIndex={-1}`, keep a ref, focus it in an effect). Screen reader users then hear where they are.
- Replace the three `useState` calls with one `useReducer` and actions such as `changed`, `next`, `back`, `edit` and `submitted`. Is the component easier to read? Is the reducer easy to test without rendering?
- Draw a step indicator: an ordered list `<ol>` of the three titles, with `aria-current="step"` on the current one. Keep the `Step 2 of 3` label.
- After an Edit jump, add a **Back to review** button on that step that goes straight to the Review step (only when the step is valid). The tests do not cover this, so make sure the normal flow still works.
- Save a draft in `sessionStorage` while the user types, restore it when the page loads, and clear it after Submit. Never store the password.
- Pass `age` to `onSubmit` as a number. Which code has to change, and what do the tests tell you?

## Interview follow-ups to prepare for

- Where should the state live so that the steps can unmount? Think about what would happen to the typed text if every step had its own `useState`. Think about the alternatives: keeping every step mounted and hiding the inactive ones, a context or a reducer shared by the steps, or one form instance shared by all steps in a form library. What does each choice cost (DOM size, tab order, hidden fields, re-renders, testing)?
- Should each step have its own URL, such as `/signup/account`, `/signup/profile` and `/signup/review`? Think about the browser Back button, a page refresh, deep links, and analytics per step. Where does the step live then (the router, not `useState`), and where does the form data live so it survives a route change? What should happen when someone opens `/signup/review` directly with an empty form?
- How would you save a draft? Think about what to store and where (`localStorage`, `sessionStorage`, or the server for a draft that follows the user to another device), when to save (every keystroke is too often, so debounce), how to restore it with a lazy initial state, what to do with data that cannot be parsed or that comes from an older version of the form, what must never be saved (the password), and when to delete the draft.

## Learn the concepts first

- [Forms](../../../../01-basics/07-forms.md)
- [useReducer](../../../../02-hooks/06-usereducer.md)
- [Forms with libraries](../../../../03-intermediate/04-forms-with-libraries.md)
