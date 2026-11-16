// Sample data for the file explorer. Every node looks like this:
//   { id, name, type: 'file' | 'folder', children?: [...] }
// Only folders have `children`. The ids are unique across the whole tree.
//
// The order below is NOT the order shown on screen: the explorer sorts
// folders first, then files, A to Z.
//
// You do not need to edit this file.

export const sampleTree = {
  id: 'root',
  name: 'my-app',
  type: 'folder',
  children: [
    { id: 'readme', name: 'README.md', type: 'file' },
    {
      id: 'src',
      name: 'src',
      type: 'folder',
      children: [
        { id: 'main', name: 'main.jsx', type: 'file' },
        {
          id: 'components',
          name: 'components',
          type: 'folder',
          children: [
            { id: 'modal', name: 'Modal.jsx', type: 'file' },
            { id: 'button', name: 'Button.jsx', type: 'file' },
          ],
        },
        { id: 'app', name: 'App.jsx', type: 'file' },
      ],
    },
    { id: 'package', name: 'package.json', type: 'file' },
    {
      id: 'public',
      name: 'public',
      type: 'folder',
      children: [{ id: 'favicon', name: 'favicon.ico', type: 'file' }],
    },
  ],
}
