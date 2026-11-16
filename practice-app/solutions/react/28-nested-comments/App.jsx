import { useId, useRef, useState } from 'react'
import { FIRST_NEW_ID, initialComments } from './comments.js'
import { addReply, countReplies, removeComment, updateComment } from './tree.js'

// Reference solution for exercise 28.
// Key ideas:
// - The whole tree lives in ONE useState at the top. Every change goes through the
//   pure helpers in tree.js, so we never mutate state.
// - Recursion in the UI: CommentList renders Comment, and Comment renders a
//   CommentList for its replies. The data is a tree, so the components are too.
// - Things that only matter to one comment (collapsed, reply form open) are local
//   state inside that Comment. The key={comment.id} keeps that state with the right
//   comment, even when siblings are added or deleted.

export default function App() {
  const [comments, setComments] = useState(initialComments)

  // A ref is the right home for an id counter: it must survive re-renders,
  // but changing it must not cause one.
  const nextId = useRef(FIRST_NEW_ID)

  // Take the id here, in the event handler, never inside a state updater.
  // React may run an updater twice (StrictMode), and the counter would skip a number.
  const createComment = (text) => ({
    id: nextId.current++,
    author: 'You',
    text,
    votes: 0,
    replies: [],
  })

  const handleAddRoot = (text) => {
    const comment = createComment(text)
    setComments((current) => [...current, comment])
  }

  const handleReply = (parentId, text) => {
    const reply = createComment(text)
    setComments((current) => addReply(current, parentId, reply))
  }

  const handleUpvote = (id) => {
    setComments((current) =>
      updateComment(current, id, (comment) => ({ ...comment, votes: comment.votes + 1 })),
    )
  }

  const handleDelete = (id) => {
    setComments((current) => removeComment(current, id))
  }

  return (
    <div style={styles.page}>
      <h2>Comments</h2>

      <CommentForm label="New comment" submitLabel="Add comment" onSubmit={handleAddRoot} />

      {comments.length === 0 ? (
        <p>No comments yet.</p>
      ) : (
        <CommentList
          comments={comments}
          onReply={handleReply}
          onUpvote={handleUpvote}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

// Renders one level of the tree. Comment calls it again for the next level down.
function CommentList({ comments, nested = false, ...handlers }) {
  return (
    <ul style={nested ? styles.nestedList : styles.list}>
      {comments.map((comment) => (
        <Comment key={comment.id} comment={comment} {...handlers} />
      ))}
    </ul>
  )
}

function Comment({ comment, onReply, onUpvote, onDelete }) {
  const [collapsed, setCollapsed] = useState(false)
  const [replying, setReplying] = useState(false)

  const hasReplies = comment.replies.length > 0

  const handlePost = (text) => {
    onReply(comment.id, text)
    setReplying(false)
    setCollapsed(false) // make sure the new reply can be seen
  }

  let toggleLabel = 'Collapse'
  if (collapsed) {
    // Count every level, not just the direct replies.
    const hidden = countReplies(comment)
    toggleLabel = `Show ${hidden} ${hidden === 1 ? 'reply' : 'replies'}`
  }

  return (
    <li>
      {/* The replies are NOT inside this article, so queries and styles for
          "this comment" never leak into the comments below it. */}
      <article style={styles.article}>
        <p style={styles.author}>{comment.author}</p>
        <p style={styles.text}>{comment.text}</p>

        <div style={styles.actions}>
          <button type="button" onClick={() => onUpvote(comment.id)}>
            Upvote
          </button>
          <span data-testid="votes">{comment.votes}</span>
          <button type="button" onClick={() => setReplying(true)}>
            Reply
          </button>
          {hasReplies && (
            <button
              type="button"
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((value) => !value)}
            >
              {toggleLabel}
            </button>
          )}
          <button type="button" onClick={() => onDelete(comment.id)}>
            Delete
          </button>
        </div>

        {replying && (
          <CommentForm
            label="Your reply"
            submitLabel="Post"
            onSubmit={handlePost}
            onCancel={() => setReplying(false)}
          />
        )}
      </article>

      {hasReplies && !collapsed && (
        <CommentList
          comments={comment.replies}
          nested
          onReply={onReply}
          onUpvote={onUpvote}
          onDelete={onDelete}
        />
      )}
    </li>
  )
}

// Used for the top-level form and for every inline reply form.
// The draft text lives here. When a reply form closes it unmounts, so its
// draft is thrown away for free.
function CommentForm({ label, submitLabel, onSubmit, onCancel }) {
  const [text, setText] = useState('')
  const textareaId = useId()
  const trimmed = text.trim()

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!trimmed) return
    onSubmit(trimmed)
    setText('')
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <label htmlFor={textareaId}>{label}</label>
      <textarea
        id={textareaId}
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div style={styles.actions}>
        <button type="submit" disabled={!trimmed}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

const styles = {
  page: { maxWidth: 640, fontFamily: 'system-ui, sans-serif' },
  list: { listStyle: 'none', margin: 0, padding: 0 },
  // The indentation: every level of replies is pushed right a little more.
  nestedList: {
    listStyle: 'none',
    margin: 0,
    padding: '0 0 0 24px',
    borderLeft: '2px solid #ddd',
  },
  article: { margin: '8px 0', padding: 8, background: '#f6f6f8', borderRadius: 6 },
  author: { margin: 0, fontWeight: 600 },
  text: { margin: '4px 0' },
  actions: { display: 'flex', alignItems: 'center', gap: 8 },
  form: { display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0' },
}
