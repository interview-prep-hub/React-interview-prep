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

// Unit tests for the pure tree helpers. No React here.
//
// The test tree is deeply frozen: if a helper tries to change (mutate) it,
// JavaScript throws and the test fails. That is how we check "pure".

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

//   root
//   +-- a
//   |   +-- a1.txt
//   |   +-- inner
//   |       +-- deep.txt
//   +-- b
//   |   +-- b1.txt
//   +-- c.txt
function makeTree() {
  return deepFreeze({
    id: 'root',
    name: 'root',
    type: 'folder',
    children: [
      {
        id: 'a',
        name: 'a',
        type: 'folder',
        children: [
          { id: 'a1', name: 'a1.txt', type: 'file' },
          {
            id: 'inner',
            name: 'inner',
            type: 'folder',
            children: [{ id: 'deep', name: 'deep.txt', type: 'file' }],
          },
        ],
      },
      {
        id: 'b',
        name: 'b',
        type: 'folder',
        children: [{ id: 'b1', name: 'b1.txt', type: 'file' }],
      },
      { id: 'c', name: 'c.txt', type: 'file' },
    ],
  })
}

const ORIGINAL = 'root(a(a1.txt,inner(deep.txt)),b(b1.txt),c.txt)'

// Turns a tree into a short string such as "root(a(a1.txt),c.txt)" so the
// tests are easy to read. Folders show their children in parentheses.
function outline(node) {
  if (!node) return String(node)
  if (node.type === 'file') return node.name
  return `${node.name}(${node.children.map(outline).join(',')})`
}

const file = (id, name) => ({ id, name, type: 'file' })
const folder = (id, name) => ({ id, name, type: 'folder', children: [] })

describe('sortNodes', () => {
  it('puts folders before files', () => {
    const z = file('1', 'z.txt')
    const docs = folder('2', 'docs')
    const a = file('3', 'a.txt')
    const src = folder('4', 'src')
    expect(sortNodes([z, docs, a, src])).toEqual([docs, src, a, z])
  })

  it('sorts each group A to Z and ignores upper and lower case', () => {
    const banana = file('1', 'banana.txt')
    const cherry = file('2', 'Cherry.txt')
    const apple = file('3', 'apple.txt')
    const zeta = folder('4', 'Zeta')
    const alpha = folder('5', 'alpha')
    expect(sortNodes([banana, zeta, cherry, apple, alpha])).toEqual([
      alpha,
      zeta,
      apple,
      banana,
      cherry,
    ])
  })

  it('returns a new array and leaves the input as it was', () => {
    const a = file('1', 'a.txt')
    const b = file('2', 'b.txt')
    const input = Object.freeze([b, a])
    const result = sortNodes(input)
    expect(result).toEqual([a, b])
    expect(result).not.toBe(input)
    expect(input).toEqual([b, a])
  })

  it('handles an empty list', () => {
    expect(sortNodes([])).toEqual([])
  })
})

describe('findNode', () => {
  it('finds a deeply nested node and returns that very object', () => {
    const tree = makeTree()
    expect(findNode(tree, 'deep')).toBe(tree.children[0].children[1].children[0])
  })

  it('finds nodes in every branch, not only in the first one', () => {
    const tree = makeTree()
    expect(findNode(tree, 'b')).toBe(tree.children[1])
    expect(findNode(tree, 'b1')).toBe(tree.children[1].children[0])
    expect(findNode(tree, 'c')).toBe(tree.children[2])
  })

  it('finds the root itself', () => {
    const tree = makeTree()
    expect(findNode(tree, 'root')).toBe(tree)
  })

  it('returns null for an unknown id', () => {
    expect(findNode(makeTree(), 'nope')).toBeNull()
  })
})

describe('findParent', () => {
  it('returns the root for a direct child of the root', () => {
    const tree = makeTree()
    expect(findParent(tree, 'c')).toBe(tree)
  })

  it('returns the folder that holds a nested node', () => {
    const tree = makeTree()
    expect(findParent(tree, 'deep')).toBe(tree.children[0].children[1])
  })

  it('looks in every branch, not only in the first one', () => {
    const tree = makeTree()
    expect(findParent(tree, 'a1')).toBe(tree.children[0])
    expect(findParent(tree, 'b1')).toBe(tree.children[1])
    expect(findParent(tree, 'b')).toBe(tree)
  })

  it('returns null for the root and for an unknown id', () => {
    const tree = makeTree()
    expect(findParent(tree, 'root')).toBeNull()
    expect(findParent(tree, 'nope')).toBeNull()
  })
})

describe('getNameError', () => {
  const siblings = makeTree().children // a, b, c.txt

  it('returns null for a fresh name', () => {
    expect(getNameError(siblings, 'new.txt')).toBeNull()
  })

  it("returns 'empty' for an empty or blank name", () => {
    expect(getNameError(siblings, '')).toBe('empty')
    expect(getNameError(siblings, '   ')).toBe('empty')
  })

  it("returns 'duplicate' when a file or a folder already has the name", () => {
    expect(getNameError(siblings, 'c.txt')).toBe('duplicate')
    expect(getNameError(siblings, 'a')).toBe('duplicate')
  })

  it('trims the name before comparing', () => {
    expect(getNameError(siblings, '  c.txt  ')).toBe('duplicate')
  })

  it('compares exactly: upper and lower case are different names', () => {
    expect(getNameError(siblings, 'C.TXT')).toBeNull()
  })

  it('lets the node that is being renamed keep its own name (ignoreId)', () => {
    expect(getNameError(siblings, 'c.txt', 'c')).toBeNull()
    expect(getNameError(siblings, 'a', 'c')).toBe('duplicate')
  })
})

describe('createNode', () => {
  it('creates a file without a children property', () => {
    const node = createNode('x1', 'notes.txt', 'file')
    expect(node).toEqual({ id: 'x1', name: 'notes.txt', type: 'file' })
    expect(node).not.toHaveProperty('children')
  })

  it('creates an empty folder', () => {
    expect(createNode('x2', 'docs', 'folder')).toEqual({
      id: 'x2',
      name: 'docs',
      type: 'folder',
      children: [],
    })
  })

  it('gives every folder its own children array', () => {
    const first = createNode('x3', 'one', 'folder')
    const second = createNode('x4', 'two', 'folder')
    expect(first).toMatchObject({ children: [] })
    expect(second).toMatchObject({ children: [] })
    expect(first.children).not.toBe(second.children)
  })
})

describe('addChild', () => {
  it('appends the node to a nested folder', () => {
    const tree = makeTree()
    const next = addChild(tree, 'inner', file('n1', 'new.txt'))
    expect(outline(next)).toBe('root(a(a1.txt,inner(deep.txt,new.txt)),b(b1.txt),c.txt)')
  })

  it('appends the node to the root', () => {
    const next = addChild(makeTree(), 'root', file('n1', 'new.txt'))
    expect(outline(next)).toBe('root(a(a1.txt,inner(deep.txt)),b(b1.txt),c.txt,new.txt)')
  })

  it('does not change the original and keeps untouched branches as the same objects', () => {
    const tree = makeTree()
    const next = addChild(tree, 'inner', file('n1', 'new.txt'))
    expect(outline(next)).toBe('root(a(a1.txt,inner(deep.txt,new.txt)),b(b1.txt),c.txt)')
    expect(outline(tree)).toBe(ORIGINAL)
    // The nodes on the path to the change are new objects ...
    expect(next).not.toBe(tree)
    expect(next.children[0]).not.toBe(tree.children[0])
    // ... everything else is shared with the old tree.
    expect(next.children[1]).toBe(tree.children[1])
    expect(next.children[2]).toBe(tree.children[2])
    expect(next.children[0].children[0]).toBe(tree.children[0].children[0])
  })

  it('appends the node to a folder in a later branch', () => {
    const tree = makeTree()
    const next = addChild(tree, 'b', file('n1', 'new.txt'))
    expect(outline(next)).toBe('root(a(a1.txt,inner(deep.txt)),b(b1.txt,new.txt),c.txt)')
    expect(next.children[0]).toBe(tree.children[0])
  })

  it('returns the same tree when the parent is unknown or is a file', () => {
    const tree = makeTree()
    expect(addChild(tree, 'nope', file('n1', 'new.txt'))).toBe(tree)
    expect(addChild(tree, 'c', file('n1', 'new.txt'))).toBe(tree)
  })

  it('works with a folder made by createNode, which can then receive children', () => {
    const tree = makeTree()
    const withFolder = addChild(tree, 'b', createNode('n1', 'sub', 'folder'))
    const next = addChild(withFolder, 'n1', file('n2', 'f.txt'))
    expect(outline(next)).toBe('root(a(a1.txt,inner(deep.txt)),b(b1.txt,sub(f.txt)),c.txt)')
  })
})

describe('renameNode', () => {
  it('renames a nested file', () => {
    const next = renameNode(makeTree(), 'deep', 'deeper.txt')
    expect(outline(next)).toBe('root(a(a1.txt,inner(deeper.txt)),b(b1.txt),c.txt)')
  })

  it('renames a folder and keeps its id and its children', () => {
    const next = renameNode(makeTree(), 'inner', 'core')
    expect(outline(next)).toBe('root(a(a1.txt,core(deep.txt)),b(b1.txt),c.txt)')
    expect(next.children[0].children[1].id).toBe('inner')
  })

  it('does not change the original and keeps untouched branches as the same objects', () => {
    const tree = makeTree()
    const next = renameNode(tree, 'deep', 'deeper.txt')
    expect(outline(next)).toBe('root(a(a1.txt,inner(deeper.txt)),b(b1.txt),c.txt)')
    expect(outline(tree)).toBe(ORIGINAL)
    expect(next).not.toBe(tree)
    expect(next.children[1]).toBe(tree.children[1])
    expect(next.children[2]).toBe(tree.children[2])
    expect(next.children[0].children[0]).toBe(tree.children[0].children[0])
  })

  it('renames the root too, and shares its untouched children', () => {
    const tree = makeTree()
    const next = renameNode(tree, 'root', 'top')
    expect(outline(next)).toBe('top(a(a1.txt,inner(deep.txt)),b(b1.txt),c.txt)')
    expect(next.id).toBe('root')
    expect(next).not.toBe(tree)
    expect(next.children[0]).toBe(tree.children[0])
    expect(next.children[1]).toBe(tree.children[1])
  })

  it('renames a node in a later branch', () => {
    const next = renameNode(makeTree(), 'b1', 'b-one.txt')
    expect(outline(next)).toBe('root(a(a1.txt,inner(deep.txt)),b(b-one.txt),c.txt)')
  })

  it('returns the same tree when the id is unknown', () => {
    const tree = makeTree()
    expect(renameNode(tree, 'nope', 'x')).toBe(tree)
  })
})

describe('removeNode', () => {
  it('removes a file', () => {
    const next = removeNode(makeTree(), 'a1')
    expect(outline(next)).toBe('root(a(inner(deep.txt)),b(b1.txt),c.txt)')
  })

  it('removes a folder together with everything inside it', () => {
    const next = removeNode(makeTree(), 'a')
    expect(outline(next)).toBe('root(b(b1.txt),c.txt)')
  })

  it('does not change the original and keeps untouched branches as the same objects', () => {
    const tree = makeTree()
    const next = removeNode(tree, 'deep')
    expect(outline(next)).toBe('root(a(a1.txt,inner()),b(b1.txt),c.txt)')
    expect(outline(tree)).toBe(ORIGINAL)
    expect(next).not.toBe(tree)
    expect(next.children[1]).toBe(tree.children[1])
    expect(next.children[2]).toBe(tree.children[2])
    expect(next.children[0].children[0]).toBe(tree.children[0].children[0])
  })

  it('removes a file that sits directly in the root, and a node in a later branch', () => {
    expect(outline(removeNode(makeTree(), 'c'))).toBe('root(a(a1.txt,inner(deep.txt)),b(b1.txt))')
    expect(outline(removeNode(makeTree(), 'b1'))).toBe('root(a(a1.txt,inner(deep.txt)),b(),c.txt)')
  })

  it('returns the same tree for an unknown id and for the root', () => {
    const tree = makeTree()
    expect(removeNode(tree, 'nope')).toBe(tree)
    expect(removeNode(tree, 'root')).toBe(tree)
  })
})

// An id and a name are different things. In this tree two files have swapped them:
// the file with id "one" is called "two", and the file with id "two" is called "one".
describe('ids versus names', () => {
  const tricky = () =>
    deepFreeze({
      id: 'root',
      name: 'root',
      type: 'folder',
      children: [
        { id: 'one', name: 'two', type: 'file' },
        { id: 'two', name: 'one', type: 'file' },
      ],
    })

  it('finds, renames and removes by id, never by name', () => {
    const tree = tricky()
    expect(findNode(tree, 'two')).toBe(tree.children[1])
    expect(findParent(tree, 'two')).toBe(tree)
    expect(outline(renameNode(tree, 'two', 'z'))).toBe('root(two,z)')
    expect(outline(removeNode(tree, 'two'))).toBe('root(two)')
  })

  it('judges ignoreId by id: a node may keep its own name, but not take the name of another', () => {
    const { children } = tricky()
    expect(getNameError(children, 'two', 'one')).toBeNull() // node "one" is called "two"
    expect(getNameError(children, 'one', 'one')).toBe('duplicate') // the other file is called "one"
  })
})
