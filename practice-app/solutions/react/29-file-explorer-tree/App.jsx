import { useRef, useState } from 'react'
import { sampleTree } from './data.js'
import {
  addChild,
  createNode,
  findNode,
  findParent,
  getNameError,
  removeNode,
  renameNode,
  sortNodes,
} from './treeOps.js'

// Reference solution for exercise 29.
// Key ideas:
// - ONE source of truth. The tree (plain data), the set of open folders and the
//   single open "editor" all live in App. Every node on screen is just a view
//   of that data.
// - TreeNode renders its children by rendering TreeNode again. The recursion
//   mirrors the shape of the data.
// - Every change to the tree goes through the pure functions in treeOps.js.
// - "Is this folder open?" is stored by node id in App, not inside TreeNode.
//   A closed parent unmounts its children, so state kept inside them would be lost.

const ERROR_MESSAGES = {
  empty: () => 'Name cannot be empty.',
  duplicate: (name) => `"${name}" already exists in this folder.`,
}

const listStyle = { listStyle: 'none', margin: 0, paddingLeft: 20 }
const rowStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }

// The little text box used for "Add file", "Add folder" and "Rename".
// It keeps what the user typed; the parent decides what Enter and Escape do.
function NameInput({ label, initialValue = '', error, onSubmit, onCancel, onEdit }) {
  const [value, setValue] = useState(initialValue)

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') onSubmit(value)
    if (event.key === 'Escape') onCancel()
  }

  return (
    <span>
      <input
        aria-label={label}
        aria-invalid={error ? 'true' : undefined}
        autoFocus
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          onEdit() // typing again dismisses the error
        }}
        onKeyDown={handleKeyDown}
      />
      {error && <span role="alert">{error}</span>}
    </span>
  )
}

function TreeNode({ node, isRoot = false, expanded, editor, actions }) {
  const isFolder = node.type === 'folder'
  const isOpen = isFolder && expanded.has(node.id)
  const isRenaming = editor?.mode === 'rename' && editor.id === node.id
  const isAdding = isFolder && editor?.id === node.id && editor.mode !== 'rename'

  let label
  if (isRenaming) {
    label = (
      <NameInput
        label={`New name for ${node.name}`}
        initialValue={node.name}
        error={editor.error}
        onSubmit={actions.submit}
        onCancel={actions.cancel}
        onEdit={actions.clearError}
      />
    )
  } else if (isFolder) {
    label = <button onClick={() => actions.toggle(node.id)}>{node.name}</button>
  } else {
    label = <span>{node.name}</span>
  }

  return (
    <li
      role="treeitem"
      aria-label={node.name}
      // Files get `undefined`, so React leaves the attribute out completely.
      aria-expanded={isFolder ? isOpen : undefined}
    >
      <div style={rowStyle}>
        {isFolder && <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>}
        {label}

        {isFolder && (
          <>
            <button
              aria-label={`Add file to ${node.name}`}
              onClick={() => actions.startAdd(node.id, 'add-file')}
            >
              Add file
            </button>
            <button
              aria-label={`Add folder to ${node.name}`}
              onClick={() => actions.startAdd(node.id, 'add-folder')}
            >
              Add folder
            </button>
          </>
        )}

        {!isRoot && (
          <>
            <button aria-label={`Rename ${node.name}`} onClick={() => actions.startRename(node.id)}>
              Rename
            </button>
            <button aria-label={`Delete ${node.name}`} onClick={() => actions.remove(node.id)}>
              Delete
            </button>
          </>
        )}
      </div>

      {isOpen && (
        <ul role="group" style={listStyle}>
          {isAdding && (
            <li role="none">
              {/* The key makes "Add file" -> "Add folder" start with a fresh input. */}
              <NameInput
                key={editor.mode}
                label={editor.mode === 'add-file' ? 'New file name' : 'New folder name'}
                error={editor.error}
                onSubmit={actions.submit}
                onCancel={actions.cancel}
                onEdit={actions.clearError}
              />
            </li>
          )}
          {sortNodes(node.children).map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              expanded={expanded}
              editor={editor}
              actions={actions}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function App({ initialTree = sampleTree }) {
  const [tree, setTree] = useState(initialTree)
  // Ids of the open folders. Only the root is open at the start.
  const [expanded, setExpanded] = useState(() => new Set([initialTree.id]))
  // The one open inline input, or null: { mode: 'add-file' | 'add-folder' | 'rename', id, error }
  // For the add modes, `id` is the folder that gets the new node.
  // For 'rename', `id` is the node being renamed.
  const [editor, setEditor] = useState(null)
  // Counter for the ids of new nodes. The "new-" prefix keeps them away from the
  // ids in the data, and the counter only goes up, so an id is never used twice.
  const nextId = useRef(1)

  const open = (id) => setExpanded((prev) => new Set(prev).add(id))

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Open the folder first, otherwise the new input would be hidden.
  const startAdd = (folderId, mode) => {
    open(folderId)
    setEditor({ mode, id: folderId, error: null })
  }

  const startRename = (id) => setEditor({ mode: 'rename', id, error: null })

  const cancel = () => setEditor(null)

  const clearError = () =>
    setEditor((current) => (current?.error ? { ...current, error: null } : current))

  const remove = (id) => {
    setTree((current) => removeNode(current, id))
    setEditor(null) // the open input might belong to the deleted branch
  }

  const submit = (rawName) => {
    const isRename = editor.mode === 'rename'
    // The siblings are the children of the folder that will hold the node.
    const folder = isRename ? findParent(tree, editor.id) : findNode(tree, editor.id)

    const reason = getNameError(folder.children, rawName, isRename ? editor.id : null)
    const name = rawName.trim()
    if (reason) {
      setEditor({ ...editor, error: ERROR_MESSAGES[reason](name) })
      return
    }

    if (isRename) {
      setTree(renameNode(tree, editor.id, name))
    } else {
      const type = editor.mode === 'add-file' ? 'file' : 'folder'
      const node = createNode(`new-${nextId.current++}`, name, type)
      setTree(addChild(tree, folder.id, node))
    }
    setEditor(null)
  }

  const actions = { toggle, startAdd, startRename, cancel, clearError, remove, submit }

  return (
    <div>
      <h2>File explorer</h2>
      <ul role="tree" aria-label="File explorer" style={{ ...listStyle, paddingLeft: 0 }}>
        <TreeNode node={tree} isRoot expanded={expanded} editor={editor} actions={actions} />
      </ul>
    </div>
  )
}
