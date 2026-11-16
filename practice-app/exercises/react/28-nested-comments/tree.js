// Exercise 28, part 1: pure helpers for a comment tree.
// Read README.md in this folder for the full requirements.
//
// A comment looks like this:
//   { id, author, text, votes, replies: [ ...more comments ] }
// A "tree" is simply an array of top-level comments.
//
// Rules for every function in this file:
// - Never change the input. Return new objects and arrays instead.
// - Copy only the path from the top of the tree down to the changed comment.
//   All other branches must be returned as the very same objects.
// - The input trees in the tests are deep-frozen: changing them in place throws.
//
// Start here. The tests in tree.test.js check these functions on their own,
// before you build any UI.

// Returns a new tree where the comment with this id is replaced by updater(comment).
// The updater receives the current comment (replies included) and returns the new one.
export function updateComment(comments, id, updater) {
  // TODO 1: walk the tree. Where the id matches, use updater(comment).
  //         Otherwise look in comment.replies (recursion!).
  //         Think about when a comment really has to be copied.
  return comments
}

// Returns a new tree where `reply` is added at the END of the replies of the comment with id parentId.
export function addReply(comments, parentId, reply) {
  // TODO 2: this is one special kind of update. Can you reuse updateComment?
  return comments
}

// Returns a new tree without the comment that has this id. Its replies go with it.
export function removeComment(comments, id) {
  // TODO 3: same walk as above, but drop the matching comment instead of replacing it.
  return comments
}

// Returns how many comments are below this one, at every level (the comment itself is not counted).
export function countReplies(comment) {
  // TODO 4: count the comments below this one, at every level. Recursion again.
  return 0
}
