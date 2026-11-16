// Pure helpers for a tree of { id, name, type: 'file' | 'folder', children? } nodes.
// Read README.md in this folder for the full contract of each function.
// The unit tests are in treeOps.test.js. Run them first, they are the fastest feedback.
//
// Rules every function here must follow:
// - never change (mutate) the arguments
// - copy only the nodes on the path to the change; every other branch must
//   stay the SAME object (so `next.children[1] === tree.children[1]` is true)
// - when there is nothing to change (unknown id, ...) return the SAME tree object

// TODO 1: return a NEW array: folders first, then files.
// Each group is sorted A to Z, ignoring upper and lower case.
// Do not change the array you receive.
export function sortNodes(nodes) {}

// TODO 2: return the node with this id (it can be the root itself), or null.
export function findNode(tree, id) {}

// TODO 3: return the folder that directly contains the node with this id.
// Return null for the root and for an unknown id.
export function findParent(tree, id) {}

// TODO 4: check a name against the nodes (files AND folders) that share a folder with it.
// - trim the name first
// - return 'empty' if nothing is left after trimming
// - return 'duplicate' if a sibling already has exactly that name (case-sensitive)
//   (the sibling whose id is `ignoreId` does not count, so a node may keep its own name)
// - otherwise return null
export function getNameError(siblings, name, ignoreId = null) {}

// TODO 5: build a node. Folders get `children: []`, files have no `children` property.
export function createNode(id, name, type) {}

// TODO 6: add `child` at the END of the children of the folder `parentId`.
// If `parentId` is unknown or is a file, return the same tree.
// Hint: addChild, renameNode and removeNode all need the same thing: "find the node with
// this id, change it, and rebuild only its ancestors". Write that once as a private
// recursive helper (not exported) and build the three functions on top of it.
export function addChild(tree, parentId, child) {}

// TODO 7: give the node a new name. Keep its id and its children.
export function renameNode(tree, id, name) {}

// TODO 8: remove the node and everything below it.
// The root can not be removed: return the same tree.
export function removeNode(tree, id) {}
