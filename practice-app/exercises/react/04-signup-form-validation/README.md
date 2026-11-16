# 04 - Signup form with validation

**Level:** Easy | **Time:** 25 minutes | **Topics:** controlled forms, validation, accessibility of errors

## The task

Build a signup form with four fields: Name, Email, Password and Confirm password. When the user presses **Create account**, check every field. If something is wrong, show a short message under each wrong field and do not create the account. If everything is fine, show a success message and empty the form.

The error messages must be accessible. A screen reader user should hear the message when it appears, and should hear it again when they move to the field. That is what `role="alert"` and `aria-describedby` are for.

Work in [`App.jsx`](./App.jsx). Do not edit the test file.

## Requirements

1. **The form.** Render a `<form>` that has the `noValidate` attribute (so the browser does not show its own error bubbles). It contains four inputs, each connected to a `<label>` (use `htmlFor` and `id`). The label text must be exactly:

   | Label text | Input `type` |
   | --- | --- |
   | `Name` | `text` |
   | `Email` | `email` |
   | `Password` | `password` |
   | `Confirm password` | `password` |

   After the inputs, add a button with `type="submit"` and the text **Create account**. All four inputs start empty and are controlled by React state.

2. **When validation runs.** Validate when the form is submitted (clicking the button or pressing Enter inside a field). Do not validate while the user types, and do not validate when a field loses focus.

3. **The rules and the exact messages.** Check all four fields on every submit, so several errors can show at the same time.

   | Field | Valid when | Error message |
   | --- | --- | --- |
   | Name | it has at least one character that is not a space (a name made only of spaces counts as empty) | `Name is required` |
   | Email | it looks like `text@text.text`: exactly one `@`, something before it, something after it, then a dot with something after the dot, and no spaces | `Enter a valid email address` |
   | Password | it has at least 8 characters (spaces count as characters) | `Password must be at least 8 characters` |
   | Confirm password | it is exactly equal to Password (upper and lower case and spaces all matter) | `Passwords do not match` |

   Two empty fields are equal. So when both password fields are empty, only the Password field shows an error and Confirm password shows none.

   The browser already removes spaces at the very start and end of an `email` input's value, so for the email rule only spaces inside the text matter (for example `ada lovelace@example.com` is invalid).

4. **How an error is shown.** For each invalid field, render the message in its own element, shown under the input, with:
   - `role="alert"`
   - an `id`, and the input's `aria-describedby` set to that id
   - the input also gets `aria-invalid="true"`

   Render the error element only while the error exists. A field without an error has no `aria-describedby` attribute and no `aria-invalid="true"`.

5. **Invalid submit.** If at least one field is invalid, do not create the account: show no success message, and keep everything the user typed in all four fields.

6. **Editing removes the error.** As soon as the user edits a field (one typed character is enough, even if the value is still invalid), the error of that field disappears. Only editing counts: clicking into a field or tabbing through it leaves its error in place. Errors of the other fields stay until they are edited too or until the next submit. Do not re-validate until the next submit.

7. **Valid submit.** If all four fields are valid, show the text `Account created for {name}` (for example `Account created for Ada Lovelace`) in an element with `role="status"`, empty all four inputs, and show no errors at all. This also removes errors that were still on screen from a previous attempt. Until a valid submit happens, no `Account created` text is on the page.

8. **The success message lives until the next submit.** It stays while the user types in or leaves the fields, and it does not disappear by itself after some time. Pressing **Create account** again removes the old success message first. After that, the form behaves normally: it shows errors if the form is invalid, or a new success message if it is valid.

9. **No page reload.** A submit must never reload the page. In the submit handler, cancel the browser's default action (`event.preventDefault()`), for both valid and invalid forms.

## Acceptance criteria (what the tests check)

- The four labelled fields exist with the right `type`, they start empty, and no message is on screen yet.
- The form has the `novalidate` attribute.
- Submitting an empty form shows exactly three errors: Name, Email and Password (not Confirm password).
- A name made only of spaces is rejected.
- These emails are rejected: `ada`, `ada@`, `ada@example`, `@example.com`, `ada@example.`, `ada@@example.com`, `ada lovelace@example.com`, `ada@exam ple.com`. These are accepted: `ada@example.com`, `ada.lovelace+test@mail.example.co.uk`.
- A 7 character password is rejected, an 8 character password is accepted, and spaces count as characters.
- A confirm password that differs from the password (including only by upper or lower case, or by one extra space) is rejected.
- With four invalid fields, four alerts show at once. Each input points to its alert with `aria-describedby`, and has `aria-invalid="true"`.
- A field without an error has no `aria-describedby` and no `aria-invalid="true"`.
- An invalid submit shows no success message and keeps the typed values.
- Typing invalid values in all four fields and tabbing away from each one shows no error until the first submit.
- Submitting (valid or invalid) cancels the browser's default action, so the page never reloads.
- Typing one character in a field removes only that field's error.
- Clicking into a field or tabbing through it, without typing, keeps its error.
- A valid submit shows the success message in a `role="status"` element, clears all inputs and leaves no alert behind.
- The success message stays while the user types in or leaves a field, and it is still there after a long time.
- The Enter key submits the form.
- A second submit removes the success message, and the user can sign up again with new values.

## How to run

```bash
npm test -- exercises/react/04-signup-form-validation
```

To see your component in the browser, run `npm run dev` and pick `04-signup-form-validation` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/04-signup-form-validation
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Keep one `values` object in state: `{ name, email, password, confirm }`. Give every input a `name` attribute that matches a key. Then one `handleChange` can serve all four inputs: `setValues(v => ({ ...v, [e.target.name]: e.target.value }))`.
2. Keep a second state for errors, an object such as `{ email: 'Enter a valid email address' }`. A missing key means "no error for this field".
3. Write `validate(values)` as a pure function outside the component. It takes the values and returns the errors object. An empty object means the form is valid. A pure function is easy to read and easy to test.
4. A simple email check is a regular expression: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Read it as "no spaces or `@`, then `@`, then no spaces or `@`, then a dot, then no spaces or `@`".
5. In the submit handler call `event.preventDefault()` first. Without it the browser reloads the page.
6. To remove one error without touching the others: `setErrors(current => ({ ...current, [name]: undefined }))`.
7. The four fields share the same markup, so write a small `Field` component. Use the `useId` hook from React to get a unique id, and build the error id from it, for example `` `${id}-error` ``.
8. Set `aria-describedby={error ? errorId : undefined}`. Passing `undefined` makes React leave the attribute out, so it never points to an element that does not exist.

</details>

## Stretch goals

- After a failed submit, move keyboard focus to the first invalid field (use a ref or `form.elements`).
- Add `autoComplete` attributes: `name`, `email` and `new-password`.
- Add a "Show passwords" checkbox that switches both password inputs between `type="password"` and `type="text"`.
- Extract the logic into a custom hook, `useSignupForm`, and keep `App` almost free of logic.
- Rewrite the submit step with a React 19 form action and `useActionState` instead of `onSubmit`.

## Interview follow-ups to prepare for

- When should validation run: on change, on blur or on submit? Think about the user who sees a red error while they are still typing their email, and about the cost of validating a whole form on every keystroke. Which would you choose for this form, and would you mix them (for example, validate on submit first, then re-validate a field on change once it has had an error)?
- How would React Hook Form change this? Think about `register`, `handleSubmit` and `formState.errors`, about controlled versus uncontrolled inputs and re-renders, and about moving the rules into a schema with Zod.
- How do you show a server-side error, for example "This email is already registered"? Think about where that message is stored, which field it belongs to, how it becomes accessible in the same way as the client-side errors, and when it should disappear.

## Learn the concepts first

- [Forms](../../../../01-basics/07-forms.md)
- [Forms with libraries](../../../../03-intermediate/04-forms-with-libraries.md)
- [Accessibility](../../../../04-advanced/09-accessibility.md)
