import { addReply, countReplies, removeComment, updateComment } from './tree.js'

// Every tree below is deep-frozen. If your function changes anything in place
// (push, assignment, splice, sort, ...), JavaScript throws a TypeError and the
// test fails. That is how these tests check that your code is immutable.

function deepFreeze(value) {
  Object.values(value).forEach((child) => {
    if (typeof child === 'object' && child !== null) deepFreeze(child)
  })
  return Object.freeze(value)
}

const comment = (id, replies = []) => ({
  id,
  author: `user${id}`,
  text: `text ${id}`,
  votes: 0,
  replies,
})

// The tree used by most tests (the number is the comment id):
//
//   1
//   |- 2
//   |  `- 3
//   `- 4
//   5
//   `- 6
const makeTree = () => [comment(1, [comment(2, [comment(3)]), comment(4)]), comment(5, [comment(6)])]
const frozenTree = () => deepFreeze(makeTree())

describe('updateComment(comments, id, updater)', () => {
  const addVote = (c) => ({ ...c, votes: c.votes + 1 })

  it('updates a top-level comment and keeps its replies', () => {
    const expected = makeTree()
    expected[0].votes = 1
    expect(updateComment(frozenTree(), 1, addVote)).toEqual(expected)
  })

  it('updates a comment in the middle of the tree', () => {
    const expected = makeTree()
    expected[0].replies[0].votes = 1
    expect(updateComment(frozenTree(), 2, addVote)).toEqual(expected)
  })

  it('updates a deeply nested comment', () => {
    const expected = makeTree()
    expected[0].replies[0].replies[0].votes = 1
    expect(updateComment(frozenTree(), 3, addVote)).toEqual(expected)
  })

  it('calls the updater exactly once, with the matching comment', () => {
    const tree = frozenTree()
    const updater = vi.fn(addVote)
    updateComment(tree, 6, updater)
    expect(updater).toHaveBeenCalledTimes(1)
    expect(updater).toHaveBeenCalledWith(tree[1].replies[0])
  })

  it('returns an unchanged tree for an unknown id', () => {
    const updater = vi.fn(addVote)
    expect(updateComment(frozenTree(), 999, updater)).toEqual(makeTree())
    expect(updater).not.toHaveBeenCalled()
  })

  it('returns a new tree and leaves the original alone', () => {
    const tree = frozenTree()
    const result = updateComment(tree, 3, addVote)
    expect(result).not.toBe(tree)
    expect(tree).toEqual(makeTree())
  })

  it('copies only the path to the changed comment and reuses every other branch', () => {
    const tree = frozenTree()
    const result = updateComment(tree, 3, addVote)
    // The path 1 -> 2 -> 3 is rebuilt...
    expect(result[0]).not.toBe(tree[0])
    expect(result[0].replies[0]).not.toBe(tree[0].replies[0])
    // ...but all the other branches are the very same objects.
    expect(result[0].replies[1]).toBe(tree[0].replies[1])
    expect(result[1]).toBe(tree[1])
  })

  it('also reuses the siblings of the changed comment and the replies below it', () => {
    const tree = frozenTree()
    const result = updateComment(tree, 2, addVote)
    expect(result[0].replies[0]).not.toBe(tree[0].replies[0]) // comment 2 itself is new
    expect(result[0].replies[1]).toBe(tree[0].replies[1]) // its sibling, comment 4
    expect(result[0].replies[0].replies[0]).toBe(tree[0].replies[0].replies[0]) // its child, comment 3
    expect(result[1]).toBe(tree[1])
  })
})

describe('addReply(comments, parentId, reply)', () => {
  const reply = deepFreeze(comment(99))

  it('adds a reply to a top-level comment, after its existing replies', () => {
    const expected = makeTree()
    expected[1].replies.push(comment(99))
    expect(addReply(frozenTree(), 5, reply)).toEqual(expected)
  })

  it('adds a reply to a comment that has no replies yet', () => {
    const expected = makeTree()
    expected[0].replies[0].replies[0].replies = [comment(99)]
    expect(addReply(frozenTree(), 3, reply)).toEqual(expected)
  })

  it('adds a reply to a nested comment that already has replies, at the end', () => {
    const expected = makeTree()
    expected[0].replies[0].replies.push(comment(99))
    expect(addReply(frozenTree(), 2, reply)).toEqual(expected)
  })

  it('returns an unchanged tree for an unknown parent id', () => {
    expect(addReply(frozenTree(), 999, reply)).toEqual(makeTree())
  })

  it('returns a new tree and leaves the original alone', () => {
    const tree = frozenTree()
    const result = addReply(tree, 4, reply)
    expect(result).not.toBe(tree)
    expect(tree).toEqual(makeTree())
  })

  it('copies only the path to the parent and reuses every other branch', () => {
    const tree = frozenTree()
    const result = addReply(tree, 4, reply)
    // The path 1 -> 4 is rebuilt...
    expect(result[0]).not.toBe(tree[0])
    expect(result[0].replies[1]).not.toBe(tree[0].replies[1])
    // ...everything else is shared with the old tree.
    expect(result[0].replies[0]).toBe(tree[0].replies[0])
    expect(result[1]).toBe(tree[1])
  })

  it('also reuses the existing replies of the parent, whatever their depth', () => {
    const tree = frozenTree()
    const result = addReply(tree, 2, reply)
    expect(result[0].replies[0]).not.toBe(tree[0].replies[0]) // the parent is new
    expect(result[0].replies[0].replies[0]).toBe(tree[0].replies[0].replies[0]) // comment 3
    expect(result[0].replies[1]).toBe(tree[0].replies[1]) // the sibling of the parent
    expect(result[1]).toBe(tree[1])
  })
})

describe('removeComment(comments, id)', () => {
  it('removes a top-level comment together with its whole subtree', () => {
    expect(removeComment(frozenTree(), 1)).toEqual([comment(5, [comment(6)])])
  })

  it('removes a nested comment together with its replies', () => {
    const expected = makeTree()
    expected[0].replies = [comment(4)]
    expect(removeComment(frozenTree(), 2)).toEqual(expected)
  })

  it('removes a leaf and leaves an empty replies array behind', () => {
    const expected = makeTree()
    expected[1].replies = []
    expect(removeComment(frozenTree(), 6)).toEqual(expected)
  })

  it('keeps the order of the remaining siblings', () => {
    const tree = deepFreeze([comment(1), comment(2), comment(3), comment(4)])
    expect(removeComment(tree, 2).map((c) => c.id)).toEqual([1, 3, 4])
  })

  it('returns an unchanged tree for an unknown id', () => {
    expect(removeComment(frozenTree(), 999)).toEqual(makeTree())
  })

  it('returns a new tree and leaves the original alone', () => {
    const tree = frozenTree()
    const result = removeComment(tree, 3)
    expect(result).not.toBe(tree)
    expect(tree).toEqual(makeTree())
  })

  it('copies only the path to the removed comment and reuses every other branch', () => {
    const tree = frozenTree()
    const result = removeComment(tree, 3)
    // The path 1 -> 2 is rebuilt...
    expect(result[0]).not.toBe(tree[0])
    expect(result[0].replies[0]).not.toBe(tree[0].replies[0])
    // ...everything else is shared with the old tree.
    expect(result[0].replies[1]).toBe(tree[0].replies[1])
    expect(result[1]).toBe(tree[1])
  })

  it('also reuses the siblings of the removed comment, at every level', () => {
    const tree = frozenTree()

    const nested = removeComment(tree, 2) // sibling: comment 4
    expect(nested[0].replies).toHaveLength(1)
    expect(nested[0].replies[0]).toBe(tree[0].replies[1])
    expect(nested[1]).toBe(tree[1])

    const topLevel = removeComment(tree, 1) // sibling: comment 5
    expect(topLevel).toHaveLength(1)
    expect(topLevel[0]).toBe(tree[1])
  })
})

describe('countReplies(comment)', () => {
  const tree = makeTree()

  it('is 0 for a comment without replies', () => {
    expect(countReplies(tree[0].replies[0].replies[0])).toBe(0)
  })

  it('counts a single direct reply', () => {
    expect(countReplies(tree[1])).toBe(1)
  })

  it('counts replies at every level, not only the direct ones', () => {
    // Comment 1 has 2 and 4 directly, and 3 below 2.
    expect(countReplies(tree[0])).toBe(3)
  })

  it('does not count the comment itself', () => {
    expect(countReplies(tree[0].replies[0])).toBe(1)
  })
})
