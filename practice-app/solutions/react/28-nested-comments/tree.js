// Pure helpers for a comment tree. A comment looks like this:
//   { id, author, text, votes, replies: [ ...more comments ] }
// A "tree" is simply an array of top-level comments.
//
// Rules that every function in this file follows:
// 1. Never change the input. Build new objects and arrays instead.
// 2. Copy only the PATH from the top of the tree down to the changed comment.
//    Every other branch is reused as the very same object. This is called
//    structural sharing, and it is what lets React.memo skip unchanged branches.
// 3. When nothing changes (for example an unknown id), return the array you were given.

export function updateComment(comments, id, updater) {
  let changed = false

  const next = comments.map((comment) => {
    let result = comment

    if (comment.id === id) {
      result = updater(comment)
    } else {
      // Look deeper. Only copy this comment if something below it changed.
      const replies = updateComment(comment.replies, id, updater)
      if (replies !== comment.replies) result = { ...comment, replies }
    }

    if (result !== comment) changed = true
    return result
  })

  return changed ? next : comments
}

// Adding a reply is just one kind of update: swap in a parent with a longer replies list.
export function addReply(comments, parentId, reply) {
  return updateComment(comments, parentId, (parent) => ({
    ...parent,
    replies: [...parent.replies, reply],
  }))
}

export function removeComment(comments, id) {
  let changed = false
  const next = []

  for (const comment of comments) {
    if (comment.id === id) {
      changed = true // skip it: its whole subtree goes away with it
      continue
    }

    const replies = removeComment(comment.replies, id)
    if (replies === comment.replies) {
      next.push(comment)
    } else {
      changed = true
      next.push({ ...comment, replies })
    }
  }

  return changed ? next : comments
}

// How many comments are below this one, at every level (not counting the comment itself).
export function countReplies(comment) {
  return comment.replies.reduce((total, reply) => total + 1 + countReplies(reply), 0)
}
