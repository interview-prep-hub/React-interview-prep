# 28 - Nested comments (threaded replies)

**Level:** Hard | **Time:** 45 minutes | **Topics:** recursion, tree state, immutable nested updates

## The task

Build a threaded comments widget, like the ones on Reddit or Hacker News. A comment can have replies, those replies can have replies, and so on, as deep as the users want.

The data is a **tree**, so the UI is a tree too: a `Comment` component renders more `Comment` components. The hard part is changing a comment that sits deep inside the tree **without mutating** the state.

You work in two files:

1. [`tree.js`](./tree.js): small pure functions that return a new tree (`updateComment`, `addReply`, `removeComment`, `countReplies`). Do this first. It has its own unit tests.
2. [`App.jsx`](./App.jsx): the widget, built on top of those functions.

Do not edit the test files. Do not edit [`comments.js`](./comments.js) (the sample data).

### The sample data

`comments.js` exports `initialComments`, `FIRST_NEW_ID` (which is `7`) and nothing else. A comment is `{ id, author, text, votes, replies }`, and `replies` is an array of comments.

| id | Author | Text | Votes | Reply to |
| --- | --- | --- | --- | --- |
| 1 | Asha | Recursion is the key to threaded comments. | 5 | (top level) |
| 2 | Ben | Each reply is a smaller comment tree. | 2 | 1 |
| 3 | Cleo | So a Comment renders more Comments. | 1 | 2 |
| 4 | Dev | Do not forget the key prop. | 0 | 1 |
| 5 | Eve | How do you delete a whole branch? | 3 | (top level) |
| 6 | Finn | Filter it out of the parent list. | 1 | 5 |

The sample tree is **deep-frozen** on purpose. If your code changes a comment in place (`comment.votes++`, `replies.push(...)`), JavaScript throws a `TypeError` immediately. That error means "you mutated state", so build a new object instead.

## Requirements

### Part A: the helpers in `tree.js`

A "tree" is an array of top-level comments. All four functions are **pure**: same input, same output, no changes to the input.

1. `updateComment(comments, id, updater)` returns a new tree in which the comment with that `id` (at any depth) is replaced by `updater(comment)`. The updater receives the current comment (its `replies` included) and returns the new comment. It is called exactly once, and only for the matching comment.
2. `addReply(comments, parentId, reply)` returns a new tree in which `reply` is added at the **end** of the `replies` of the comment with id `parentId` (at any depth).
3. `removeComment(comments, id)` returns a new tree without the comment that has that `id`. Its whole subtree (all its replies, at every level) goes with it. The order of the remaining siblings does not change. A parent that loses its last reply keeps `replies: []`.
4. `countReplies(comment)` returns how many comments are below `comment` at **every** level. The comment itself is not counted. A comment without replies gives `0`.
5. If the `id` is not found, the returned tree must be equal to the input tree.
6. **Nothing is mutated.** The tests pass deep-frozen trees.
7. **Copy only the path.** Only the comments on the way from the top of the tree down to the changed comment are copied. Every other comment and branch must be returned as the **same object** (`===`). This is called structural sharing. It is what allows `React.memo` to skip unchanged branches later.

### Part B: the widget in `App.jsx`

**Structure (the tests rely on this markup)**

8. Show an `<h2>` with the text `Comments`. The whole tree lives in one `useState`, started from `initialComments`.
9. The top-level comments are `<li>` elements inside a `<ul>`.
10. Every comment is one `<li>`. It contains one `<article>` (the comment itself) and, after the article, a nested `<ul>` with one `<li>` per reply. Each of those `<li>` has exactly the same shape. That nesting is the recursion. A comment without replies gets no nested `<ul>` at all (not even an empty one).
11. The replies of a comment are **never inside that comment's `<article>`**. Use `<article>` for comments only, nowhere else on the page.
12. Inside a comment's `<article>`:
    - the author name is in its own element, with nothing else in it (for example `<p>Asha</p>`),
    - the comment text is in its own element, with nothing else in it,
    - the vote count is in an element with `data-testid="votes"` whose text is only the number (for example `5`).
13. Indent each level of replies a little more than the one above (for example `padding-left: 24px` on the nested `<ul>`). The tests do not measure the indentation, but the widget needs it.

**Buttons.** Inside each comment's `<article>`, with exactly these accessible names (case-sensitive): **Upvote**, **Reply**, **Delete**, and the collapse button (see requirement 17).

14. **Upvote** adds `1` to the votes of that comment only. Every click adds one more. The new number is shown in the `votes` element.
15. **Delete** removes that comment and its whole subtree. No confirmation dialog.
16. **Reply** opens an inline form **inside the same `<article>`**, below the buttons, with:
    - a `<textarea>` whose accessible name is exactly `Your reply`,
    - a **Post** button (a submit button),
    - a **Cancel** button.

    Details:
    - **Post** is disabled while the text is empty or only spaces.
    - Posting adds a new comment at the **end** of that comment's replies, with `author: 'You'`, `votes: 0`, `replies: []`, and the **trimmed** text. The form then closes.
    - If the comment was collapsed, posting expands it, so the new reply is visible.
    - **Cancel** closes the form and throws the draft away. Opening the form again shows an empty textarea.
    - Every comment manages its own form. Opening a form on one comment does not close, or change the draft of, a form that is open on another comment.
    - You can reply to your own replies, at any depth.
17. **Collapse / Expand.** A comment that has at least one reply shows a toggle button (a comment without replies shows none).
    - Expanded: the button is named `Collapse`, has `aria-expanded="true"`, and the replies are visible.
    - Collapsed: the replies are not rendered at all. The same button is now named `Show N replies`, with `aria-expanded="false"`. `N` is the number of comments hidden, **counting every level** (use `countReplies`). For `N` equal to 1 the text is `Show 1 reply`.
    - Clicking it again shows the replies again.
    - Collapsing one comment affects only that comment. Its parent, siblings and other threads stay as they are.
    - **Reply**, **Upvote** and **Delete** keep working on a collapsed comment.
18. **Top-level form**, above the list: a `<textarea>` with the accessible name `New comment` (a visible `<label>` is best) and a button named `Add comment`.
    - The button is disabled while the text is empty or only spaces.
    - Submitting adds a new top-level comment at the **end** of the top-level list (`author: 'You'`, `votes: 0`, trimmed text) and clears the textarea.
19. When there are no comments at all, show a paragraph with the text `No comments yet.` instead of the list. The top-level form stays visible, so the user can start again.

**Ids, keys and state updates**

20. New comments (replies and top-level ones) get numeric ids from **one incrementing counter** that starts at `FIRST_NEW_ID` and goes up by one for every new comment. An id is never used twice, even after comments were deleted. (Do not compute ids from the number of comments in the tree.)
21. Use `comment.id` as the `key` when you render a list of comments. Not the array index. The tests delete a comment and check that the comments below it (at the top level and among replies) keep their own local state: a collapsed comment stays collapsed, and an open reply form keeps its draft.
22. The code must behave the same inside `<StrictMode>`, where React runs state updater functions twice. A pure update gives the same result both times. A mutating one does not.
23. Every change to the tree starts from the **latest** tree: use the functional form `setComments(current => ...)`. One test fires several clicks inside a single `act()` call (so React batches them into one render) and expects every one of them to count. A handler that reads `comments` from the render it was created in loses all but the last change.

## Acceptance criteria (what the tests check)

`tree.test.js` (pure functions, frozen input):

- `updateComment` updates a top-level, a middle and a deeply nested comment, keeps their replies, calls the updater once, and leaves the tree unchanged for an unknown id.
- `addReply` appends a reply to a top-level comment, to a comment without replies and to a nested comment that already has replies, always at the end.
- `removeComment` removes a top-level comment, a nested comment (with subtree) and a leaf, keeps the order of siblings and leaves `replies: []` behind.
- For all three: the original tree is untouched, the result is a new array, and branches off the changed path are the same objects (`===`). That includes the siblings of the changed comment and, for `updateComment` and `addReply`, the replies below it.
- `countReplies` is `0` for a leaf, counts direct replies, counts all levels, and does not count the comment itself.

`App.test.jsx` (what the user sees and does):

- The `Comments` heading is an `<h2>`. All six sample comments render with the right author and votes, nested at the right depth, with replies outside the parent's `<article>`. The markup is `ul > li > article`, followed by a nested `ul` for the replies (and no nested `ul` for a comment without replies).
- Upvote adds one vote per click, only to that comment, at any depth.
- Delete removes a leaf, a nested comment with its replies, or a top-level comment with its whole thread. When everything is gone, the paragraph `No comments yet.` appears instead of the list (the form stays), and it disappears when you add a comment.
- Reply opens a form with `Your reply`, a disabled **Post** and **Cancel**. Posting adds a trimmed reply by `You` with `0` votes, nested one level deeper, after the existing replies. Cancel throws the draft away. Each comment has its own form and draft. Whitespace-only text cannot be posted. You can reply to replies.
- New comments get distinct ids: voting on or deleting one never touches another, also after deletes.
- Collapse hides the replies and shows `Show N replies` (nested comments counted, `Show 1 reply` for one), Expand brings them back, leaf comments have no toggle, **Upvote**, **Reply** and **Delete** still work on a collapsed comment, and posting a reply to a collapsed comment expands it.
- Keys: when a comment above is deleted, a collapsed comment stays collapsed and an open reply form keeps its draft, at the top level and among replies.
- The top-level form sits above the list, works the same way as the reply form, adds at the end of the list, and clears itself.
- Several changes made in the same React batch (two upvotes, a delete, two posted replies and a new top-level comment in one `act()`) all take effect: no change is lost to a stale `comments` variable.
- Inside `<StrictMode>`, one click still means one vote, one reply or one new comment.

## How to run

Work in this order. First the helpers:

```bash
npm test -- exercises/react/28-nested-comments/tree
```

Then the widget:

```bash
npm test -- exercises/react/28-nested-comments/App
```

Or everything in this exercise at once:

```bash
npm test -- exercises/react/28-nested-comments
```

To see your component in the browser, run `npm run dev` and pick `28-nested-comments` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/28-nested-comments
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Start with `updateComment`. Walk the array with `map`. If `comment.id === id`, use `updater(comment)`. Otherwise call `updateComment(comment.replies, id, updater)` on the replies. That call is the recursion.
2. After that call, ask: did anything change? If the returned replies array is the same one you passed in (`===`), return the original `comment` untouched. Only when it is different, return `{ ...comment, replies: newReplies }`.
3. A plain `map` always creates a new array, so for the "same array when nothing changed" idea you need a way to remember that a change happened (a `changed` flag works) and return the input array when no change was made.
4. `addReply` is just an `updateComment` whose updater returns `{ ...parent, replies: [...parent.replies, reply] }`.
5. `removeComment` uses the same walk, but a matching comment is left out instead of replaced. Do not recurse into the comment you drop: its whole subtree goes with it.
6. `countReplies` is a one-line `reduce`: for each reply add `1` plus `countReplies(reply)`.
7. In the UI, one component `Comment` is enough, if it renders a `<ul>` of `Comment`s for its replies. Keep the three handlers (reply, upvote, delete) in `App` and pass them down. Every handler calls `setComments(current => helper(current, ...))`.
8. Things that belong to one comment only (collapsed, reply form open) are local state inside `Comment`. The draft text can live inside a small `CommentForm` component, so it disappears when the form closes.
9. The id counter: `useRef(FIRST_NEW_ID)`. Read and increase `ref.current` inside the click handler, then pass the new object into `setComments`. If you increase the counter inside the updater function, StrictMode will run it twice.
10. Recursion in JSX does not need anything special: `Comment` simply renders `<Comment />` inside itself, for each reply, as long as there are replies left to show.

</details>

## Stretch goals

- Focus the textarea automatically when the reply form opens, and let **Ctrl+Enter** post.
- Add a "Sort by" select (Newest, Top) for the replies of every level. Sort a copy; never call `.sort()` on state.
- Confirm before deleting a comment that has replies, and say how many comments will disappear (`countReplies` again).
- Stop offering **Reply** at depth 5 and deeper, as many sites do, so threads do not get too narrow.
- Wrap `Comment` in `React.memo`, make the handlers stable with `useCallback`, and use the React DevTools Profiler to prove that upvoting one comment re-renders only the path to it (this is why requirement 7 matters).
- Keep the collapsed state in the tree data instead of in the component, so a collapsed thread stays collapsed when its parent is collapsed and expanded again.

## Interview follow-ups to prepare for

- **Normalised state vs nested?** Your state is a nested tree. What if it were two flat maps instead, `byId` (id to comment) and `childIds` (id to array of child ids)? Compare the cost of an upvote, of deleting a whole thread, of finding a comment by id, and of rendering. Which shape would an API usually send, and where would you convert?
- **Performance with thousands of comments?** Walk through what re-renders when you upvote one deep comment. How do structural sharing, `React.memo` and stable handlers cut that down? What else helps: collapsing deep threads by default, "load more replies", flattening the visible tree into one list and virtualizing it? What about very deep recursion?
- **Optimistic posting with rollback?** Show the reply instantly, before the server answers. What does the temporary comment look like (a temporary id, a `pending` flag)? What happens when the request succeeds (swap in the server id) and when it fails (remove it or mark it failed with a retry)? How would `useOptimistic` change your code, and what happens to your id counter when the server owns the ids?

## Learn the concepts first

- [Thinking in React](../../../../01-basics/08-thinking-in-react.md)
- [useState in depth](../../../../02-hooks/02-usestate-in-depth.md)
- [Component patterns](../../../../03-intermediate/01-component-patterns.md)
