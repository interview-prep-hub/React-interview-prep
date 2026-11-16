// Pure helpers for a tree of { id, name, type: 'file' | 'folder', children? } nodes.
//
// Rules every function here follows:
// - It never changes (mutates) its arguments.
// - Only the nodes on the path to the change are copied. Every other branch
//   keeps the SAME object reference. That is cheap, and it lets React.memo
//   skip branches that did not change.
// - When there is nothing to change (unknown id, ...) the SAME tree object
//   is returned.

// Folders first, then files. Each group is sorted A to Z, ignoring case.
// Returns a new array (sort() alone would change the original).
export function sortNodes(nodes) {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name, 'en')
  })
}

// Depth-first search by id. Returns the node itself or null.
export function findNode(tree, id) {
  if (tree.id === id) return tree
  if (tree.type !== 'folder') return null
  for (const child of tree.children) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

// The folder that directly contains the node with this id (null for the root
// or for an unknown id).
export function findParent(tree, id) {
  if (tree.type !== 'folder') return null
  for (const child of tree.children) {
    if (child.id === id) return tree
    const found = findParent(child, id)
    if (found) return found
  }
  return null
}

// Validates a name against the nodes that share a folder with it.
// Returns 'empty', 'duplicate' or null (the name is fine).
// `ignoreId` is the node being renamed: it may keep its own name.
export function getNameError(siblings, name, ignoreId = null) {
  const trimmed = name.trim()
  if (trimmed === '') return 'empty'
  const taken = siblings.some((s) => s.id !== ignoreId && s.name === trimmed)
  return taken ? 'duplicate' : null
}

// Only folders get a `children` array.
export function createNode(id, name, type) {
  return type === 'folder' ? { id, name, type, children: [] } : { id, name, type }
}

// The one recursive workhorse: apply `change` to the node with this id and
// rebuild only the ancestors of that node. If the id is not found, nothing
// changes and the very same node comes back.
function updateNode(node, id, change) {
  if (node.id === id) return change(node)
  if (node.type !== 'folder') return node

  let touched = false
  const children = node.children.map((child) => {
    const next = updateNode(child, id, change)
    if (next !== child) touched = true
    return next
  })
  return touched ? { ...node, children } : node
}

// Appends `child` to the folder `parentId`. A file (or unknown id) is ignored.
export function addChild(tree, parentId, child) {
  return updateNode(tree, parentId, (node) =>
    node.type === 'folder' ? { ...node, children: [...node.children, child] } : node,
  )
}

export function renameNode(tree, id, name) {
  return updateNode(tree, id, (node) => ({ ...node, name }))
}

// Removes the node and everything below it. The root cannot be removed.
export function removeNode(tree, id) {
  const parent = findParent(tree, id)
  if (!parent) return tree
  return updateNode(tree, parent.id, (folder) => ({
    ...folder,
    children: folder.children.filter((child) => child.id !== id),
  }))
}
