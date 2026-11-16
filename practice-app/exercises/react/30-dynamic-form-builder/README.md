# 30 - Dynamic form builder

**Level:** Hard | **Time:** 60 minutes | **Topics:** schema-driven UI, conditional fields, validation, composition

## The task

Many products draw their forms from data instead of hand-written JSX. A server or a CMS sends a small JSON description of the form (a **schema**), and the front end turns it into inputs, labels and error messages. Admin tools, surveys and onboarding flows work like this.

Build that. You write two things:

1. `DynamicForm` in [`DynamicForm.jsx`](./DynamicForm.jsx). It takes a `schema` and an `onSubmit` function and renders the whole form. It validates on submit, hides and shows fields with `showIf`, and passes clean values to `onSubmit`.
2. `App` in [`App.jsx`](./App.jsx). It renders `DynamicForm` with the sample schema and shows the submitted values as JSON.

`DynamicForm` must be generic: its code must never mention a field by name (no `if (field.name === 'email')`). All knowledge about the form lives in the schema. Each field type is drawn by its own small component, and a lookup object picks the right one.

Files in this folder:

| File | What to do |
| --- | --- |
| [`schema.js`](./schema.js) | The sample schema. Given. Do not edit it (the tests of `App` rely on it). |
| [`DynamicForm.jsx`](./DynamicForm.jsx) | Starter. You write the component here. |
| [`App.jsx`](./App.jsx) | Starter. You write the page here. |
| `DynamicForm.test.jsx`, `App.test.jsx` | Tests. Do not edit them. |

## The schema format

A schema is an array of field objects, in the order they appear on screen. It is plain data, so it could come from JSON.

| Property | Applies to | Meaning |
| --- | --- | --- |
| `name` | all | Unique key. It is the key in the submitted values. |
| `label` | all | Text of the `<label>`. |
| `type` | all | One of `'text'`, `'number'`, `'select'`, `'checkbox'`. |
| `required` | all (optional) | `true` means the field must be filled in (a checkbox must be checked). |
| `min`, `max` | number (optional) | Smallest and largest allowed number. |
| `minLength` | text (optional) | Smallest allowed number of characters. |
| `pattern` | text (optional) | A regular expression written as a string, for example `'^[A-Z]{3}-\\d{2}$'`. It includes its own `^` and `$`. |
| `patternMessage` | text (optional) | The error message to show when `pattern` does not match. |
| `options` | select | Array of strings. |
| `showIf` | all (optional) | `{ field: 'otherName', equals: someValue }`. Show this field only while the field called `otherName` has the value `someValue`. |

The properties that do not apply to a type are ignored (for example `min` on a text field).

Two words used below:

- **Raw value**: what the input holds right now. A string for text, number and select inputs (a number input also gives a string), and a boolean for a checkbox.
- **Typed value**: the raw value turned into the value we compare, validate and submit. Text is trimmed (spaces removed at both ends). A number input becomes a real number, or `null` when it is empty. A select stays a string. A checkbox stays a boolean.

## Requirements

### Rendering

1. `DynamicForm.jsx` has a **default export**, `DynamicForm`, with the props `schema` and `onSubmit`. It renders a `<form>` with the attribute `noValidate` (so the browser shows no error bubbles of its own). Inside are one control per visible field, in schema order, and then a `<button type="submit">` with the text **Submit**.
2. Each type uses this control:

   | `type` | Control |
   | --- | --- |
   | `text` | `<input type="text">` |
   | `number` | `<input type="number">` |
   | `select` | `<select>`. The first `<option>` has `value=""` and the text `Select...` (three dots). Then one `<option>` for each string in `options`, where the value and the text are that string. |
   | `checkbox` | `<input type="checkbox">` |

3. Every control has a `<label>` connected to it with `htmlFor` and `id` (use `useId`, so ids stay unique). The label text is exactly the schema `label`: do not add a `*` or any other text to it. For a checkbox, put the label after the box.
4. Every field is drawn by its own small component, found with a lookup object keyed by type (for example `FIELD_COMPONENTS[field.type]`). The tests cannot check this, but it is the main design idea of the exercise: adding a new field type should mean one new component and one new line in the lookup object. Give every rendered field a stable React `key`: the field `name`, never the list index. The tests check the effect: when a field appears above another one, that other field keeps its place and its focus.
5. At the start: text inputs and number inputs are empty, a select shows its `Select...` option, a checkbox is unchecked.
6. A field with `required: true` has `aria-required="true"` on its control. Other fields have no `aria-required` attribute.

### Conditional fields (`showIf`)

7. A field **without** `showIf` is always visible.
8. A field **with** `showIf` is visible only when both are true: the field named in `showIf.field` is itself visible, and the **typed value** of that field is strictly equal (`===`) to `showIf.equals`. This means:
   - `equals: true` matches a checked checkbox, and `equals: false` matches an unchecked one (so such a field is visible at the start).
   - `equals: 'Phone'` matches a select that has `Phone` chosen.
   - `equals: 1` matches a number input that holds `1`. It does not match `12`, and a string `'1'` would not match either.
9. Chains work: if field B depends on A and C depends on B, then C is hidden whenever B is hidden, even if B still holds the value C is waiting for.
10. If `showIf.field` names a field that does not exist in the schema, the field is hidden. The controlling field may stand before or after the field that depends on it. You may assume that `showIf` never forms a loop (A depends on B and B depends on A).
11. A hidden field is **not rendered at all** (not just hidden with CSS), is **not validated**, and is **not in the submitted values**.
12. A hidden field keeps what the user typed. If it becomes visible again, the old value is there.

### Validation

13. Validate **only when the form is submitted** (clicking the button, or pressing Enter inside a field). Never validate while the user types or when a field loses focus, not even after a first failed submit. The submit handler must call `event.preventDefault()`, so the browser does not reload the page.
14. A submit validates **all visible fields** and shows all their errors at once. Hidden fields are skipped.
15. Use the typed value. A field is **empty** when it is: a text value that is `''` after trimming (so spaces only counts as empty), a number input with no value (`null`), a select with the `Select...` option chosen, or an unchecked checkbox. The number `0` is **not** empty.
16. The rules, in this order. Only the first rule that fails is reported for a field.

    | Order | Rule | Applies to | Error message |
    | --- | --- | --- | --- |
    | 1 | The field is empty and `required` is true | all | `{label} is required` |
    | - | The field is empty and not required | all | no error, and the rules below are skipped |
    | 2 | The number is smaller than `min` | number | `{label} must be at least {min}` |
    | 3 | The number is larger than `max` | number | `{label} must be at most {max}` |
    | 4 | The text is shorter than `minLength` (after trimming) | text | `{label} must be at least {minLength} characters` |
    | 5 | `new RegExp(pattern).test(value)` is false, where `value` is the trimmed text | text | `patternMessage` from the schema, or `{label} is invalid` when the schema has no `patternMessage` |

    For example, a required `Age` field with `min: 18` shows `Age is required` when empty and `Age must be at least 18` when it holds `17`. The label is used exactly as it is written, so a required checkbox labelled `I accept the terms` gives `I accept the terms is required`. A `min` of `0` is a valid limit (check for `undefined`, not for a falsy value).
17. **How an error is shown.** For every field with an error, render its message in an element (a `<p>` is the usual choice) inside the same field wrapper as the control. It comes after the control (for a checkbox, after the box and its label) and before the next field. The message element has:
    - `role="alert"`
    - an `id`

    The control gets `aria-describedby` set to that id, and also `aria-invalid="true"`.

    A field without an error has no error element, no `aria-describedby` and no `aria-invalid="true"`.
18. If there is at least one error, `onSubmit` is **not** called and everything the user typed stays in the form.
19. **Errors clear when the field changes.** As soon as the user changes a field (one typed character, choosing another option, toggling a checkbox), the error of that field disappears, even if the new value is still invalid. The errors of other fields stay. Nothing is validated again until the next submit.
20. **Errors of hidden fields disappear.** If changing a field hides another field that had an error, that error is gone. When the hidden field is shown again it starts without an error.

### Submitting

21. If there are no errors, call `onSubmit` **once** with **one argument**: a plain object with one entry for each visible field, using the field `name` as the key and the **typed value** as the value:
    - text: the trimmed string (`'  ada  '` is submitted as `'ada'`)
    - number: a number (`30`, `12.5`, `0`), never a string
    - select: the chosen option string
    - checkbox: `true` or `false`
22. Optional fields that are empty are still included: text as `''`, number as `null`, select as `''`, checkbox as `false`. Hidden fields have no key at all (not even one set to `undefined`). The order of the keys does not matter.
23. A valid submit does not reset the form: the values stay on screen. The user can change something and submit again.

### The page (`App`)

24. `App` renders an `<h2>` with the text `Dynamic form builder`, and a `DynamicForm` that uses `sampleSchema` from `schema.js`.
25. Before the first valid submit, nothing about submitted values is on screen.
26. After a valid submit, `App` shows an `<h3>` with the text `Submitted values` and a `<pre data-testid="submitted-json">` containing `JSON.stringify(values, null, 2)` of the object that `onSubmit` received.
27. A failed submit does not change what is shown. A later valid submit replaces it.

## The sample schema

`schema.js` holds this schema. The tests of `App` use it.

| name | label | type | Rules | `showIf` |
| --- | --- | --- | --- | --- |
| `fullName` | Full name | text | required, `minLength` 2 | none |
| `email` | Email | text | required, a pattern for `text@text.text`, `patternMessage` `Enter a valid email address` | none |
| `age` | Age | number | required, `min` 18, `max` 120 | none |
| `role` | Role | select | required, options `Developer`, `Designer`, `Manager` | none |
| `teamSize` | Team size | number | `min` 1 | `role` equals `'Manager'` |
| `hasCompany` | I work for a company | checkbox | none | none |
| `company` | Company name | text | required | `hasCompany` equals `true` |
| `terms` | I accept the terms | checkbox | required | none |

## Acceptance criteria (what the tests check)

`DynamicForm.test.jsx` uses its own small schemas (passed as props), so it tests `DynamicForm` on its own:

- Each type renders the right control (textbox, spinbutton, combobox, checkbox) with the exact label, in schema order. The label of a checkbox comes after the box. The form has `novalidate`. The select has the `Select...` placeholder and then its options.
- Required fields have `aria-required="true"`, optional ones do not.
- An empty submit shows one `role="alert"` message per empty required field, each linked with `aria-describedby` and `aria-invalid="true"`, placed after its own control and before the next field, and does not call `onSubmit`. Optional fields get no error markup. A failed submit keeps everything the user typed.
- The submit event is stopped from reloading the page (`preventDefault`), for a failed and for a valid submit.
- Typing or tabbing around does not show errors, before or after the first submit.
- Spaces only counts as empty. `minLength`, `pattern` with its custom message, the `is invalid` fallback, `min` and `max` all give the exact messages from the table. `minLength` and `pattern` look at the trimmed text. The number `0` is a value, not "empty", and `min: 0` and `max: 0` are real limits. Properties that do not fit the type of the field are ignored.
- Only the first broken rule is shown (required, then length, then pattern). Optional empty fields skip all other rules.
- Changing one field removes only its own error. Nothing is validated again until the next submit.
- A valid submit calls `onSubmit` once with one argument holding typed values (numbers as numbers, checkboxes as booleans, text trimmed, `12.5` stays `12.5`). Empty optional fields come out as `''`, `null`, `''`, `false`.
- Enter submits. The form keeps its values after a valid submit. A second submit validates the current values again.
- Hidden fields are not rendered, not validated and not submitted. They appear when their condition becomes true.
- Chains hide and restore together. A hidden field keeps its typed value. Errors of a field vanish when it is hidden and do not come back. A hidden invalid field does not block the submit.
- `equals: false` matches an unchecked checkbox, `equals: 1` matches the number 1 but not 12, and `equals: 0` or `equals: false` never match an empty number or an empty select (strict `===` on the typed value). A text field is compared after trimming. A controlling field may come later in the schema, and the field you just toggled keeps the focus when a new field appears above it (stable keys). A missing controlling field hides the field.

`App.test.jsx` tests the page with the sample schema:

- The `<h2>` heading, the visible fields at the start, and no submitted JSON yet.
- The exact errors for an empty submit and for wrong values (`Full name must be at least 2 characters`, `Enter a valid email address`, `Age must be at least 18`, `Age must be at most 120`).
- `Company name` shows only while the company checkbox is checked. `Team size` shows only for the role `Manager`.
- The `<h3>` heading `Submitted values` and the JSON (formatted with two spaces) show the typed values, without hidden fields. A failed submit keeps the old JSON, a later valid one replaces it.

## How to run

```bash
npm test -- exercises/react/30-dynamic-form-builder
```

To see your component in the browser, run `npm run dev` and pick `30-dynamic-form-builder` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/30-dynamic-form-builder
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Start with `DynamicForm` and a schema of two or three plain text fields. Get rendering and submitting right before you add `showIf` and the other types.
2. Keep the **raw values** in one state object: `{ [field.name]: rawValue }`. Create it with `useState(() => ...)` from the schema (checkbox starts as `false`, everything else as `''`). Keep a second state object for the errors, `{ [field.name]: message }`. A missing key means "no error".
3. Write one pure function that turns a raw value into a typed value, and use it everywhere: for `showIf` comparisons, for validation and for the object you submit. Then `equals: 1` and "is this number below `min`" work from the same number.
4. `0` is falsy in JavaScript. Do not write `if (!typed)` to test for empty. Compare with `''`, `null` and `false` one by one.
5. Do not store which fields are visible. Derive it on every render with `schema.filter(...)`. For the chain rule, write `isVisible(field, schema, values)` so that it calls itself for the controlling field.
6. In `handleSubmit`, loop over the **visible** fields only. For each one, compute the typed value, then the error message (or `null`). Fill an `errors` object and an `output` object in the same loop. If `errors` is empty, call `onSubmit(output)`.
7. In `handleChange`, compute `nextValues` first. Then keep only the errors of fields that are still visible in `nextValues` and are not the field being changed.
8. Each field component needs a label id and an error id. Make a tiny hook for it: `const id = useId()` and `` `${id}-error` ``. Pass `aria-describedby={error ? errorId : undefined}` so the attribute is left out when there is no error.
9. Text and number inputs differ only in `type`. Share one component and wrap it twice.
10. `new RegExp(field.pattern).test(value)` runs the pattern. Remember that a text field with an empty value never reaches the pattern rule.

</details>

## Stretch goals

- After a failed submit, move keyboard focus to the first field with an error.
- Add `min` and `max` attributes to number inputs, and `maxLength` support for text.
- Support `defaultValue` in the schema.
- Add a new type, `textarea`, by only writing one component and adding one line to the lookup object. If you had to touch anything else, find out why.
- After the first submit, re-validate a field when it loses focus (a common "reward early, punish late" pattern).
- Rewrite the state with `useReducer` (actions `change` and `submit`), or extract a `useDynamicForm(schema)` hook.
- Rebuild the same form with React Hook Form and a Zod schema, and compare the amount of code.

## Interview follow-ups to prepare for

- How would you add **async validation**, for example "is this username taken?" Think about when the request runs (on blur, or debounced while typing, or on submit), how to avoid out-of-date answers (race conditions: only the latest request may win, use `AbortController` or ignore old results), where the "checking..." state lives for one field, how the user can keep typing while it runs, and how a server-side error found at submit time is shown with the same `role="alert"` markup.
- How would you support **field arrays and repeatable groups**, such as a list of phone numbers with an "Add phone" button? Think about a schema type like `array` with its own `fields`, values shaped like `{ phones: [{ number: '...' }] }`, stable keys for list items (an id, never the index), add and remove, per-item validation, and how an error path such as `phones.1.number` finds its input.
- How would you get **type safety with TypeScript and Zod**? Think about a discriminated union for fields (`type: 'number'` allows `min`, `type: 'text'` allows `minLength`), building a Zod schema from the field schema, `z.infer` for the type of the submitted values, `safeParse` on submit with the issues mapped back to field errors, and the fact that a schema coming from a server is untyped at runtime and should be validated too.

## Learn the concepts first

- [Forms with libraries](../../../../03-intermediate/04-forms-with-libraries.md)
- [Component patterns](../../../../03-intermediate/01-component-patterns.md)
- [Forms](../../../../01-basics/07-forms.md)
