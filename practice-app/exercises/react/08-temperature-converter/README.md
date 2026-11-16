# 08 - Temperature converter

**Level:** Easy | **Time:** 15 minutes | **Topics:** lifting state up, child components, controlled inputs

## The task

Build a small converter with two inputs: one for **Celsius** and one for **Fahrenheit**. When the user types in one of them, the other one updates at once. Under the inputs, a sentence tells the user whether water at that temperature would boil.

The two inputs look and behave the same, so build them from one reusable child component, `TemperatureInput`. The child does not remember anything. The parent component owns the only piece of state and tells each child what to show. This pattern is called **lifting state up**.

Work in [`App.jsx`](./App.jsx). Do not edit the test file.

## Requirements

**The child component**

1. `App.jsx` has two exports: a **named** export `TemperatureInput` (the reusable child) and the **default** export `App` (the page).
2. `TemperatureInput` takes three props:
   - `scale`: the string `"c"` or the string `"f"`.
   - `value`: a string, the text to show in the input.
   - `onChange`: a function. Call it with the new text **as a plain string** (not the event object) every time the user types.
3. `TemperatureInput` renders a `<label>` and a text input (`<input type="text">`) that are connected, so that `getByLabelText` works. The label text is exactly `Celsius` for scale `"c"` and exactly `Fahrenheit` for scale `"f"` (no extra words, no colon). It must be visible text inside the `<label>`, not only an `aria-label`.
4. `TemperatureInput` has **no state of its own**. The input always shows the `value` it receives. If the parent does not change `value`, what the user typed does not appear.
5. Two copies of `TemperatureInput` on the same page must not mix up their labels (each label points to its own input).

**The page**

6. `App` renders, in this order: a heading with the text `Temperature converter`, the Celsius input, the Fahrenheit input, and a paragraph `<p data-testid="verdict">`.
7. Both inputs start empty.
8. `App` keeps **one** piece of state: the text the user typed and which input it was typed in. The text of the other input is **calculated while rendering**. Do not store both temperatures. (The tests cannot see this, but an interviewer will.)
9. Typing in one input updates the other one:
   - Fahrenheit = Celsius x 9 / 5 + 32
   - Celsius = (Fahrenheit - 32) x 5 / 9
10. The input the user is typing in shows **exactly the text typed**, never a reformatted version. So `36.` stays `36.` and `10.50` stays `10.50`.
11. The other input shows the converted number **rounded to at most 2 decimals, with no trailing zeros** and no padding. For example:

    | Typed | Other input shows |
    | --- | --- |
    | 37 in Celsius | `98.6` (not `98.60`) |
    | 20 in Celsius | `68` (not `68.00`) |
    | 36.6 in Celsius | `97.88` |
    | 100 in Fahrenheit | `37.78` |

12. Text counts as **a number** when it is not blank (spaces only is blank) and `Number(text)` is a finite number. So `36.`, `.5`, `1e1` and ` 10 ` (with spaces around it) are numbers. When the typed text is blank or not a number (for example `abc`, `-`, `.`, `12abc`, `1.2.3`, `Infinity`, or only spaces), the **other** input is empty. The typed text stays visible in the input the user is using.
13. The sentence in `<p data-testid="verdict">` is exactly one of these three texts (including the final dot where shown):
    - `The water would boil.` when the Celsius value is 100 or more.
    - `The water would not boil.` when the Celsius value is a number below 100.
    - `Enter a temperature` when there is no usable number (blank or not a number).

    "The Celsius value" means the number shown in the Celsius input. If the user typed in Celsius, that is the typed number exactly as typed (`99.999` is below 100). If the user typed in Fahrenheit, that is the rounded converted value (`211.999` Fahrenheit shows `100` in the Celsius input, so the water would boil).

## Acceptance criteria (what the tests check)

- `TemperatureInput` alone: the exact label text for each scale (visible, inside a `<label>`), shows its `value`, calls `onChange` with the new text as a string, stays controlled (does not change by itself), follows a new `value` from the parent, and two copies keep separate labels.
- First render: two empty text inputs (Celsius first, then Fahrenheit) and the sentence `Enter a temperature`. The page order is the heading, the Celsius input, the Fahrenheit input, then the sentence.
- Typing in Celsius updates Fahrenheit, typing in Fahrenheit updates Celsius, and it keeps working when you switch from one input to the other.
- Several characters can be typed in a row (the input must keep focus, so the child must not be re-created on every render).
- Results are rounded to at most 2 decimals with no trailing zeros.
- The field being edited keeps exactly what the user typed (`36.`, `10.50`, `100.1`), so there is no rounding feedback loop.
- Clearing an input clears the other one. Text that is not a number (or only spaces) leaves the other input empty and the sentence back at `Enter a temperature`. Text that `Number()` accepts (`.5`, `1e1`, ` 10 `) counts as a number. A leading `-` can be typed before the digits.
- The boil sentence is right for Celsius and Fahrenheit input, including the edge value 100 C, uses the Celsius value as shown on screen (typed text as typed, converted text after rounding), and shows `Enter a temperature` when there is nothing usable.

## How to run

```bash
npm test -- exercises/react/08-temperature-converter
```

To see your component in the browser, run `npm run dev` and pick `08-temperature-converter` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/08-temperature-converter
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Start with the child. Make it controlled: `value={value}` and `onChange={(e) => onChange(e.target.value)}`. Pick the label text from the `scale`.
2. The child is used twice on the page, so a fixed `id` for the label and input would clash. React has a hook that gives every component copy its own unique id: `useId`.
3. For the parent, one `useState` holding an object such as `{ scale: 'c', text: '' }` is enough. When the Celsius input changes, call `setInput({ scale: 'c', text })`.
4. While rendering, ask "is this the input the user typed in?" If yes, show `input.text`. If no, show the converted text.
5. Why `type="text"` and not `type="number"`? A number input hides invalid text from you (its value becomes an empty string), so you could not tell "empty" from "typed rubbish", and it drops things like a lone `-`.
6. `Number('')` and `Number('   ')` are both `0`, so check for blank text first with `text.trim() === ''`. After that, `Number.isFinite(Number(text))` tells you if it is a real number.
7. Round with `Math.round(value * 100) / 100`, then turn it into text with `String(...)`. `String(98.6)` is `"98.6"`, so you get no trailing zeros for free.
8. Write one small helper that returns a number or `null` for a piece of text, and reuse it for the conversion and for the boil sentence.
9. Do not define `TemperatureInput` inside `App`. A component defined inside another component is a new component on every render, so React throws the input away and it loses focus after each key press.

</details>

## Stretch goals

- Add a third input for **Kelvin** (Kelvin = Celsius + 273.15). Try to do it by adding one entry to a small table of scales and one more `<TemperatureInput>`, without touching the sync logic.
- Make the sentence a live region (`role="status"`) so a screen reader announces it when it changes.
- Mark an input with `aria-invalid="true"` when its text is not a number.
- Accept a comma as the decimal separator (`36,6`).

## Interview follow-ups to prepare for

- **Where should the state live and why?** Be ready to name the rule (the closest parent above every component that needs the data) and to describe what goes wrong if each input keeps its own state and an effect copies it to the other.
- **What if there were 3 scales (Celsius, Fahrenheit, Kelvin)?** Be ready to explain how many conversion functions you would need if every scale converted directly to every other one, and a design that needs only two functions per scale.
- **How do you avoid the rounding feedback loop?** Be ready to describe the bug (typing `100.1` in Fahrenheit becomes `100.09` because the rounded Celsius value was converted back), and which data you must store, and which data you must never write back into state, to prevent it.

## Learn the concepts first

- [Thinking in React](../../../../01-basics/08-thinking-in-react.md) (lifting state up, single source of truth)
- [Components and props](../../../../01-basics/04-components-and-props.md)
- [Forms](../../../../01-basics/07-forms.md) (controlled inputs)
