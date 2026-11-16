# 09 - Character counter

**Level:** Easy | **Time:** 15 minutes | **Topics:** controlled textarea, derived values, disabled state

## The task

Build a small message box, like the compose field of a chat app or a post with a length limit.

The user types in a textarea. Under it they see a live character counter (`N/140`) and a live word count (`N words`). If the text gets longer than 140 characters, a warning tells them how many characters they must remove, and the **Send** button is switched off. Clicking **Send** hands the message to a callback, clears the box and confirms.

The big idea of this exercise: **the counters are not state**. You store only the text. The numbers are calculated from it on every render.

Work in [`App.jsx`](./App.jsx). Do not edit the test file.

## Requirements

1. `App` is the default export. It accepts one optional prop, `onSend`, a function. `<App />` with no props must work.
2. Render a `<textarea>` with a visible `<label>` whose text is exactly **Message**. Connect them (`htmlFor` and `id`) so that `getByLabelText('Message')` finds the textarea. The textarea is controlled and starts empty. Do **not** use the `maxLength` attribute: the user must be able to type past 140 characters. Pressing Enter in the textarea adds a line break, as usual. Only the **Send** button sends.
3. Character counter: render an element whose text is exactly `N/140`, where `N` is the length of the text (`text.length`). Spaces and line breaks count. It starts as `0/140` and changes on every keystroke. The `/140` part stays, even when `N` is bigger than 140 (for example `145/140`).
4. Word counter: render an element whose text is exactly `N words`, for example `0 words` and `3 words`. Count words by splitting the text on whitespace (spaces, tabs, line breaks) and ignoring the empty strings. Extra spaces never create extra words, and whitespace-only text is `0 words`. Only whitespace separates words: punctuation does not, so `Don't stop-now, ok?` is 3 words. When `N` is exactly 1, both `1 word` and `1 words` are accepted by the tests (making it singular is a stretch goal).
5. Over the limit: when the text is longer than 140 characters, also render a separate element with `role="alert"` whose text is exactly `X characters over the limit`, where `X` is `N - 140` (for example `5 characters over the limit`). When `X` is exactly 1, both `1 character over the limit` and `1 characters over the limit` are accepted. At 140 characters or fewer, there is no alert in the page. Exactly 140 is allowed. The limit uses the same length as the counter, so spaces count: 139 letters followed by 3 spaces is 142 characters, which is 2 over.
6. A `<button>` labelled **Send**. It is disabled when the text is empty after trimming (so whitespace-only text counts as empty), or when the text is over the limit. Otherwise it is enabled.
7. Clicking **Send** (when enabled) does all of this:
   - calls `onSend(text)` once, if `onSend` was given. The text is passed exactly as typed (do not trim it). If `onSend` was not given, nothing crashes.
   - clears the textarea, so the counter goes back to `0/140` and the word count to `0 words` (and Send becomes disabled again).
   - shows the text `Message sent!` inside an element with `role="status"`.
8. `Message sent!` is not shown at the start, and it disappears as soon as the user changes the textarea again.

## Acceptance criteria (what the tests check)

- The first screen has an empty textarea, `0/140`, `0 words`, a disabled Send button, no alert and no confirmation.
- Typing updates the character counter and the word count after every keystroke.
- Extra spaces, tabs and line breaks do not change the word count (each kind is checked on its own). Punctuation does not split words. Spaces and line breaks do count as characters.
- Pressing Enter in the textarea adds a line break (it counts as one character) and does not send.
- Whitespace-only text keeps Send disabled but is still counted in the character counter.
- With exactly 140 characters there is no alert and Send is enabled.
- With 141 or more characters the counter shows `N/140`, the alert shows the right number, and Send is disabled. The textarea still accepts the extra characters, whether they are pasted or typed one by one.
- Trailing spaces count towards the limit (the text is never trimmed before it is measured).
- Deleting characters until the text is back to 140 removes the alert and enables Send.
- A disabled Send button never calls `onSend`.
- Send calls `onSend` once with the exact text, clears the box, shows `Message sent!`, and a second click does nothing.
- After a send, the user can type a second message and send it too.
- Send works without an `onSend` prop.
- `Message sent!` goes away when the user types again.

## How to run

From the `practice-app` folder:

```bash
npm test -- exercises/react/09-character-counter
```

To see your component in the browser, run `npm run dev` and pick `09-character-counter` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/09-character-counter
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. You need only two pieces of state: the text, and a flag for "a message was just sent". The character count, the word count, "is it over the limit" and "can the user send" are all **derived**: plain `const` variables computed from `text` in the body of the component.
2. A controlled textarea gets `value={text}` and `onChange={(e) => setText(e.target.value)}`.
3. `'  a  b '.split(/\s+/)` gives `['', 'a', 'b', '']`. Remove the empty strings with `.filter(...)` before you take the length. Put this in a small helper function.
4. A button is switched off with the `disabled` attribute: `disabled={!canSend}`. Remember `text.trim()`.
5. Show the alert with `{isOverLimit && <p role="alert">...</p>}`. Make sure the value in front of `&&` is a real boolean (`length > 140`), not a number.
6. `onSend?.(text)` calls the function only if it exists.
7. After sending: clear the text and set the "sent" flag to `true`. In `onChange`, set the flag back to `false`.

</details>

## Stretch goals

- Use the singular forms `1 word` and `1 character over the limit` (the tests accept both, so you will not break them).
- Add `aria-invalid` to the textarea when it is over the limit, and link the textarea to the counter with `aria-describedby`.
- Make the limit a prop (`limit`, default `140`) and show the counter in red when fewer than 20 characters remain.
- Move the counting logic into pure functions (`countWords`, `getStats`) or a custom hook and write unit tests for them.
- Count characters the way the user sees them (code points or graphemes, see the Unicode follow-up) and compare the results with `text.length`.

## Interview follow-ups to prepare for

- Why derive the counts from the text instead of keeping them in their own state? What can go wrong if you store them?
- How would you use the `maxLength` attribute instead of the over-limit message, and what is the difference for the user?
- What happens with emoji and other Unicode characters? Why does `'👍'.length` give `2`, and does the user see 2 characters?

<details>
<summary>Short model answers (try to answer out loud first)</summary>

**1. Derive, do not store.** The count is a pure function of the text: same text, same count. If you keep it in its own `useState`, you have two sources of truth and must update both in every place that changes the text (typing, sending, clearing). Forget one place and the screen shows a wrong number. Updating the count inside an effect is worse: it renders twice, and the screen can show the old number for a moment. The rule: if you can calculate a value from props or state during render, calculate it there. Counting characters costs almost nothing, so there is no need for `useMemo` either.

**2. `maxLength`.** Writing `<textarea maxLength={140} />` makes the browser refuse extra characters. You need no over-limit logic, and the text can never be too long. The UX cost: keystrokes are dropped with no explanation, and a long pasted text is silently cut at 140 characters, so the user loses the end of it without being told. With a soft limit (this exercise) the user can paste a long text, sees "N characters over the limit" and decides what to cut. Either way, the server must check the length too, because browser attributes are not a security measure.

**3. Unicode.** JavaScript strings are UTF-16, and `.length` counts 16-bit code units. Characters outside the basic range, such as `'👍'`, use two units, so `.length` is `2`. `[...text].length` counts code points (`'👍'` is 1). But many emoji are several code points glued together by invisible joiner characters (ZWJ, `‍`). A family emoji made of three people is 3 emoji plus 2 joiners: `.length` is 8, code points are 5, and the user sees 1 (a family of four gives 11, 7 and 1). `Intl.Segmenter` with `granularity: 'grapheme'` counts what the user sees. Which one is right depends on what the server enforces: if the client says "ok" and the server counts differently, the message gets rejected. Also, `text.slice(0, 140)` can cut a pair in half.

</details>

## Learn the concepts first

- [Forms](../../../../01-basics/07-forms.md)
- [useState in depth](../../../../02-hooks/02-usestate-in-depth.md)
