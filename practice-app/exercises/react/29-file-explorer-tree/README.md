# 29 - File explorer tree

**Level:** Hard | **Time:** 50 minutes | **Topics:** recursive components, immutable tree updates, accessibility roles (`tree`, `treeitem`, `group`)

## The task

Build a small file explorer, like the side panel of a code editor. It shows a nested list of folders and files. The user can open and close folders, add files and folders, rename them and delete them.

This exercise has two parts:

1. **Pure helper functions** in [`treeOps.js`](./treeOps.js) that read and update the tree without changing it. They have their own unit tests in `treeOps.test.js`.
2. **The React component** in [`App.jsx`](./App.jsx) that draws the tree and handles the clicks. It calls the helpers.

[`data.js`](./data.js) holds sample data. You do not need to edit it. Do not edit the test files.

### The data

The whole tree is one nested object. Every node has the same shape:

```json
{
  "id": "root",
  "name": "my-app",
  "type": "folder",
  "children": [
    { "id": "readme", "name": "README.md", "type": "file" },
    { "id": "src", "name": "src", "type": "folder", "children": [] }
  ]
}
```

- `type` is `"file"` or `"folder"`.
- Only folders have `children`. Files have no `children` property.
- Every `id` is unique in the whole tree.
- The top-level object is the **root**. It is always a folder.

### The markup the tests expect

This is the shape of the page. The rows contain the name and the buttons (see the requirements for the exact labels).

```html
<ul role="tree" aria-label="File explorer">
  <li role="treeitem" aria-label="project" aria-expanded="true">
    <div><!-- row: name, buttons --></div>
    <ul role="group">
      <li role="treeitem" aria-label="docs" aria-expanded="false">...</li>
      <li role="treeitem" aria-label="README.md">...</li>
    </ul>
  </li>
</ul>
```

Why `aria-label` on every `treeitem`? Without it the accessible name of an item is built from ALL the text inside it: its buttons and every nested child. A screen reader user would hear a very long name. The label gives each item a short, exact name: the node name.

To keep this exercise manageable the tree is not fully keyboard-navigable with arrow keys (that is a stretch goal). Tab moves between the buttons.

## Requirements

### Rendering and roles

1. `App` takes one optional prop, `initialTree` (the root node). When it is missing, use `sampleTree` from `data.js`. Never change (mutate) the object you receive.
2. Render a list with `role="tree"` and `aria-label="File explorer"`. The root node is its only item.
3. Every node is an element with `role="treeitem"` and an `aria-label` equal to the node's name. Folders also have `aria-expanded` set to `"true"` or `"false"`. Files must not have an `aria-expanded` attribute at all.
4. The children of an open folder are inside that folder's `treeitem`, wrapped in an element with `role="group"`. The children of a closed folder are **not rendered** (they are not in the DOM). Every list of items you render has a stable `key` (use the node's `id`). The tests fail if React prints a "unique key" warning in the console.
5. At the start, only the root folder is open. Every other folder is closed.
6. Show folders first, then files. Each group is sorted A to Z, ignoring upper and lower case. This applies at every level, and also after a node is added or renamed. The order on screen must not depend on the order in the data.

### Opening and closing

7. The name of a folder is a `<button>` whose accessible name is exactly the folder name. Clicking it opens a closed folder and closes an open one. This works for the root too. The name of a file is plain text, not a button. (If you add an icon, hide it with `aria-hidden="true"` and keep it outside the name.)
8. Every folder remembers on its own whether it is open, even while one of its ancestors is closed. Example: open `src`, open `utils` inside it, close `src`, open `src` again. `utils` is still open.

### Buttons

9. Every folder has two buttons with these accessible names (use `aria-label`): `Add file to {name}` and `Add folder to {name}`. Every node **except the root** also has `Rename {name}` and `Delete {name}`. The root cannot be renamed or deleted. Files have no "Add" buttons. The visible text is up to you (for example "Add file", "Add folder", "Rename", "Delete"). Example for a folder called `src`: `Add file to src`, `Add folder to src`, `Rename src`, `Delete src`.

### The inline input

10. There is at most **one** inline input on the page at any time. Opening an input somewhere else (in another folder, on another node, or in the other mode) closes the old one and throws away its text and its error. An input that is opened after the previous one was closed (by Escape, by a successful save, or because another input took its place) always starts fresh: an empty box for Add, the current name for Rename, and no error. Deleting a node also closes the open input.
11. **Add:** clicking `Add file to {name}` or `Add folder to {name}` shows a text input as the first thing inside that folder's `group`. Its `aria-label` is `New file name` or `New folder name`. It starts empty and has keyboard focus. If the folder was closed, it opens.
12. **Rename:** clicking `Rename {name}` replaces the name in that row with a text input. Its `aria-label` is `New name for {name}` (using the current name). It is prefilled with the current name and has keyboard focus. While it is open, the name itself (the folder button or the file text) is not shown in that row.
13. **Enter** submits the input. **Escape** closes it and changes nothing. Clicking somewhere else does nothing special (the input stays open).
14. **Validation** happens on Enter:
    - The name is trimmed first (spaces at both ends are removed).
    - If nothing is left, show an error that contains the word `empty` (for example `Name cannot be empty.`).
    - If another child of the **same folder** already has exactly that name, show an error that contains the words `already exists` (for example `"main.js" already exists in this folder.`). Files and folders share the same namespace, so a file cannot have the name of a folder in the same folder. Names are compared exactly, so `Readme.md` and `readme.md` are different names. The same name in a different folder is fine. When renaming, an item may keep its own name.
    - The error is shown in an element with `role="alert"` next to the input. Render that element only while there is an error: when there is no error, there is no `role="alert"` element on the page.
    - When there is an error, the input stays open and keeps exactly what the user typed (spaces included). The error disappears as soon as the user changes the text.
15. **After a successful add:** the new node is added to that folder, the input closes and the folder is open. A new file is `{ id, name, type: "file" }`. A new folder is `{ id, name, type: "folder", children: [] }`: it starts closed, and it can receive files and folders of its own. The stored name is the trimmed name. Give every new node an `id` that is unique in the tree: never the name, never an id that was used before (also not after a delete), and never one that can clash with the ids already in the data (they can be any strings, for example `"1"`, `"2"`).
16. **After a successful rename:** the name changes (the stored name is the trimmed name) and the input closes. The node keeps its `id`, its children and its open or closed state. The list is sorted again.
17. **Delete:** clicking `Delete {name}` removes that node and everything inside it at once (no confirmation question).

### Tree helpers in `treeOps.js`

18. Export these functions. They are pure: they never change their arguments.

    | Function | What it returns |
    | --- | --- |
    | `sortNodes(nodes)` | A new array: folders first, then files, each group A to Z ignoring case. |
    | `findNode(tree, id)` | The node (the very same object) or `null`. The root can be found too. |
    | `findParent(tree, id)` | The folder that directly contains the node, or `null` (for the root and for unknown ids). |
    | `getNameError(siblings, name, ignoreId = null)` | `'empty'`, `'duplicate'` or `null`. Same rules as requirement 14. `siblings` is the array of nodes in the folder. The sibling whose id is `ignoreId` does not count. |
    | `createNode(id, name, type)` | A new node. Folders get `children: []`. Files have no `children` property. |
    | `addChild(tree, parentId, child)` | A new tree with `child` added at the end of that folder's `children`. Unknown id, or an id of a file: the same tree. |
    | `renameNode(tree, id, name)` | A new tree where that node has the new name (same id, same children). Unknown id: the same tree. |
    | `removeNode(tree, id)` | A new tree without that node and everything below it. Unknown id, or the root's id: the same tree. |

19. Every helper that returns a tree follows three rules (the tests check them):
    - It never changes the tree it receives. The tests freeze the tree, so a change throws an error.
    - Only the nodes on the path from the root to the change are new objects. Every other node is the **same object** as before (`===`).
    - When there is nothing to change, it returns the **same tree object**.

## Acceptance criteria (what the tests check)

There are 98 tests in two files.

**`treeOps.test.js` (40 tests, no React)**

- `sortNodes`: folders before files, A to Z ignoring case, returns a new array, handles an empty list.
- `findNode` and `findParent`: nested nodes in every branch, the root, unknown ids.
- `getNameError`: fresh name, empty and blank names, duplicate file and folder names, trimming, exact (case-sensitive) comparison, `ignoreId`.
- `createNode`: file without `children`, folder with `children: []` (a separate array for each folder).
- `addChild`, `renameNode`, `removeNode`: correct result at any depth and in any branch (the root can be renamed too), the original tree is not changed, untouched branches are the same objects, unknown ids return the same tree.
- Ids versus names: every helper works with ids, never with names.

**`App.test.jsx` (58 tests)**

- Roles and names: the `tree`, the `treeitem`s, `aria-expanded` only on folders, children inside a `group`, the default sample data.
- Start state and order: only the root is open (whatever its id is), folders first, A to Z ignoring case at every level.
- Opening and closing: the folder name toggles it, files are not buttons, the root can be closed, open nested folders are remembered.
- Buttons: the exact accessible names, no Rename or Delete on the root, no Add buttons on files.
- Add: focused empty input as the first thing in the right folder's group, a closed folder opens, Enter creates the node at its sorted place, Escape cancels, empty names (the typed spaces stay in the box), duplicate names (also file versus folder, also with spaces around them), exact case comparison, the error goes away when you type and no empty alert element is rendered, same name in another folder is fine, names are trimmed, new folders can receive children, an input reopened after Escape or a save is empty.
- Ids of new nodes: same-named folders in two places open independently, an id is never reused after a delete, ids never clash with numeric ids already in the tree.
- Rename: prefilled and focused input that replaces the name, saving re-sorts and trims, a renamed folder keeps its children and open state, Escape cancels, duplicates (also a folder next to the item) and empty names are rejected, the error goes away when you type, an item may keep its own name.
- Delete: removes a file, removes a folder with its descendants, closes an open input.
- Only one input at a time (add after rename, rename after rename, add in another folder), a new input starts empty and without the old error, and clicking somewhere else keeps the input open.
- The tree object passed in `initialTree` is never changed.
- React prints no "unique key" warning.

## How to run

Run everything for this exercise (from the `practice-app` folder):

```bash
npm test -- exercises/react/29-file-explorer-tree
```

At the start all tests fail. That is expected. Run the two files separately while you work:

```bash
npm test -- exercises/react/29-file-explorer-tree/treeOps
npm test -- exercises/react/29-file-explorer-tree/App
```

To see your component in the browser, run `npm run dev` and pick `29-file-explorer-tree` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/29-file-explorer-tree
```

<details>
<summary>Hints (open only if you are stuck)</summary>

**A good order (the TODOs in `App.jsx` are numbered like this)**

1. Finish `treeOps.js` first and get its 40 tests green (about 15 minutes). The component is much easier when the helpers work.
2. Draw the tree without any buttons: state for the tree, state for the open folders, `TreeNode` with roles, sorted children and recursion.
3. Make the folder names toggle.
4. Add the four buttons and make Delete work.
5. Add the single inline input: `NameInput`, then Add, then Rename, then validation.

**For `treeOps.js`**

- `addChild`, `renameNode` and `removeNode` all need "find the node with this id, change it, and rebuild only its ancestors". Write one private recursive helper for that.
- Inside the helper: if this node is the one, return the changed node. If it is a file, return it as it is. Otherwise run the helper on each child. Only if at least one child came back as a different object, return a copy of this node with the new children. If none changed, return the same node. That one comparison (`next !== child`) gives you the "untouched branches stay the same object" rule for free.
- `removeNode` can be built from `findParent` plus your helper: change the parent so that its `children` no longer contain the id.
- Sorting: `[...nodes].sort(...)` copies first, because `sort` changes the array it is called on. For names, `a.name.localeCompare(b.name, 'en')` compares the letters first and the case last, so `app.js` comes before `Beta.js` (a plain `<` on the strings would put `Beta.js` first). Comparing `a.name.toLowerCase()` with `b.name.toLowerCase()` works too.
- Files do not have `children`, so check `type === 'folder'` before you touch `children`.

**For the component**

- Keep the open folders in `App` as a `Set` of ids. React only sees a change when you create a **new** Set (`new Set(previous)`), so never call `add` on the Set in state.
- Why not keep "is open" inside each `TreeNode`? A closed parent does not render its children, so their state is thrown away. State stored by id in `App` survives.
- Keep the single open input as one value in `App`: for example `{ mode, id, error }` or `null`. One value means two inputs can never be open at once.
- To validate, you need the siblings. When adding, they are the children of the target folder (`findNode`). When renaming, they are the children of the parent (`findParent`), and you pass the renamed node's id as `ignoreId`.
- `aria-expanded={true}` is printed by React as `"true"`. For a file pass `undefined`, and React leaves the attribute out.
- React keeps the state of a component that stays in the same place with the same type. If "Add file" changes to "Add folder" in the same folder, the typed text would stay. Give the input a `key` that changes with the mode to start fresh.
- Use `onKeyDown` on the input and check `event.key === 'Enter'` or `'Escape'`. The `autoFocus` prop gives the input focus when it appears.
- New ids: a counter in `useRef` with a prefix (`new-1`, `new-2`, ...) is enough. A bare number could clash with ids already in the data. Increase the counter inside the event handler, not while rendering, and never lower it.
- Give the `TreeNode` elements in the list a `key` that is the node's `id`. Do not use the array index: the order changes when you add, rename or sort.
- The input belongs in the folder's group, so the folder must be open. Open it when the user clicks "Add".

</details>

## Stretch goals

- Full keyboard support from the WAI-ARIA tree pattern: Up and Down move between visible items, Right opens a folder or moves to its first child, Left closes a folder or moves to its parent, Home and End jump to the first and last item. Use a roving `tabindex` so the whole tree is one Tab stop.
- Add `aria-level`, `aria-setsize` and `aria-posinset` to every `treeitem`.
- Move a node with drag and drop. Write a pure `moveNode(tree, id, newParentId)` first. Do not allow a folder to be moved into itself or into one of its own descendants.
- Reject names that contain a `/`.
- Add "Expand all" and "Collapse all" buttons, and a search box that opens every folder with a match.
- Save the tree and the open folders in `localStorage`. Wrap the reads and writes in `try/catch`.
- Add undo and redo for tree changes (see [exercise 26](../26-undo-redo-hook/README.md)).

## Interview follow-ups to prepare for

- **How would you add keyboard navigation (arrow keys) to the tree?** Cover: what the WAI-ARIA tree pattern asks for (Up, Down, Left, Right, Home, End, Enter), the roving `tabindex` idea versus `aria-activedescendant`, where the "focused item id" state lives, and why a flat list of the currently visible nodes makes "next" and "previous" easy to compute.
- **How would you load the children of a folder lazily, when the folder opens?** Cover: how a node says "not loaded yet" (for example a missing `children` array plus a status such as idle, loading, loaded, error), fetching on the first open, showing a loading state with `aria-busy`, handling errors with a retry, ignoring a response that arrives after the folder was closed, and which pure helper you would add to put the loaded children into the tree.
- **What is the difference between updating the tree by path and by id?** A path is a list of indexes such as `[1, 0, 2]`. Cover: a path needs no search but breaks as soon as items are sorted, inserted or deleted, and it is a poor React `key`. An id stays stable but needs a lookup (a walk of the tree, or a `Map` from id to node). Also cover the flat "normalized" alternative (`byId` plus a list of child ids per folder) and how structural sharing (unchanged branches keep the same object) helps `React.memo`.

## Learn the concepts first

- [Thinking in React](../../../../01-basics/08-thinking-in-react.md)
- [Component patterns](../../../../03-intermediate/01-component-patterns.md)
- [Accessibility](../../../../04-advanced/09-accessibility.md)
- Recursion warm-up: [28 - Nested comments](../28-nested-comments/README.md)
