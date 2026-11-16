import { useState } from 'react'
import { sampleTree } from './data.js'
// TODO 0: import the helpers you need from './treeOps.js' (finish that file first!)

// Exercise 29: File explorer tree.
// Read README.md in this folder for the full requirements.
//
// The TODOs are numbered in the order you should do them (not in the order they
// appear in this file). Run the tests after every step:
//   npm test -- exercises/react/29-file-explorer-tree

// The small text box used for "Add file", "Add folder" and "Rename".
// TODO 9: keep the typed text in state (start from initialValue).
//   - Enter calls onSubmit(text), Escape calls onCancel()
//   - every change calls onEdit() so the parent can hide an old error
//   - show `error` in an element with role="alert", but only while there IS an error
//     (when there is none, no role="alert" element may be on the page)
//   - the input gets aria-label={label} and must have focus when it appears
function NameInput({ label, initialValue = '', error, onSubmit, onCancel, onEdit }) {
  return null
}

// One row of the tree, plus (when the folder is open) the rows of its children.
// `expanded` is the set of open folder ids, `editor` describes the open input
// (or is null), and `actions` is an object of functions that live in App.
function TreeNode({ node, isRoot = false, expanded, editor, actions }) {
  // TODO 3: return <li role="treeitem" aria-label={node.name}>.
  //   Folders also get aria-expanded ("true" or "false"), files must not have it.
  //   Show the node name (plain text for a file).
  // TODO 4: when the folder is open, render its children inside <ul role="group">:
  //   sorted, and one <TreeNode /> per child (the component calls itself).
//   Every item in a list needs a stable key: use the node id (not the index).
  // TODO 5: the folder name is a <button> that calls actions.toggle(node.id).
  // TODO 6: buttons with the aria-labels from the README:
  //   folders: "Add file to X" and "Add folder to X"
  //   every node except the root: "Rename X" and "Delete X"
  // TODO 8: when this node is being renamed, show <NameInput /> instead of its name.
  //   When this folder is the target of "add", show <NameInput /> as the first
  //   thing inside its group (wrap it in <li role="none">).
  return null
}

export default function App({ initialTree = sampleTree }) {
  // TODO 1: state for the tree itself (start from initialTree).
  // TODO 2: state for the open folders (only the root is open at the start).
  //   Store ids, not nodes. Keep this state HERE, not inside TreeNode. Why?
  //   (Hint: what happens to a TreeNode when its parent is closed?)
  // TODO 7: a function that deletes a node (use removeNode from treeOps.js).
  // TODO 8: state for the single open input (or null): what it does (add a file,
  //   add a folder or rename), which node it belongs to, and its error message.
  //   Functions to open it, to cancel it and to clear its error.
  // TODO 10: a submit function: validate with getNameError, show the error or
  //   create / rename the node, then close the input.

  return (
    <div>
      <h2>File explorer</h2>
      {/* TODO 3: <ul role="tree" aria-label="File explorer"> with the root <TreeNode /> inside */}
      <p>Build the tree here.</p>
    </div>
  )
}
