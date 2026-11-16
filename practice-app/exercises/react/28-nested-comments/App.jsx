import { useState } from 'react'
import { FIRST_NEW_ID, initialComments } from './comments.js'
import { addReply, countReplies, removeComment, updateComment } from './tree.js'

// Exercise 28: Nested comments.
// Read README.md in this folder for the full requirements.
// Do the helpers in tree.js first (npm test -- exercises/react/28-nested-comments/tree),
// then come back here and build the UI on top of them.

export default function App() {
  const [comments, setComments] = useState(initialComments)

  // TODO 1: keep an id counter that survives re-renders without causing one.
  //         The first new id is FIRST_NEW_ID, then FIRST_NEW_ID + 1, and so on.
  //         Take the next id inside the event handler, not inside a state updater.

  // TODO 2: write the handlers that change the tree. Each one uses a helper from tree.js
  //         and the functional form of setComments:
  //         add a root comment, reply to a comment, upvote a comment, delete a comment.

  return (
    <div>
      <h2>Comments</h2>

      {/* TODO 3: the top-level form: a textarea labelled "New comment" and an "Add comment" button */}

      {/* TODO 4: when there are no comments, show "No comments yet." instead of the list */}
      <ul>
        {comments.map((comment) => (
          <Comment key={comment.id} comment={comment} />
        ))}
      </ul>
    </div>
  )
}

function Comment({ comment }) {
  // TODO 5: local state for this comment only: is it collapsed? is its reply form open?

  return (
    <li>
      <article>
        <p>{comment.author}</p>
        <p>{comment.text}</p>

        {/* TODO 6: Upvote, Reply, Collapse / "Show N replies" and Delete buttons,
                    plus the vote count with data-testid="votes" */}

        {/* TODO 7: the inline reply form (textarea "Your reply", Post, Cancel) */}
      </article>

      {/* TODO 8: render the replies. A comment inside a comment: this is where the recursion happens.
                  Put them in a nested <ul> inside this <li>, but outside the <article>. */}
    </li>
  )
}
