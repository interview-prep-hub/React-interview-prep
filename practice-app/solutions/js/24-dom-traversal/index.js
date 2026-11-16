// Reference solution for exercise 24: DOM traversal and a tiny hyperscript builder.
//
// The DOM is a tree of nodes. Element nodes can have children, and
// `node.childNodes` lists ALL children (elements, text, comments) in order.
// Almost every function here is "walk the tree and do something".
// (`node.children` would list elements only.)

// One shared guard, so every function reports a wrong argument the same way.
function assertNode(value, name) {
  if (!(value instanceof Node)) {
    throw new TypeError(`${name} must be a DOM node`)
  }
}

// Depth-first walk. A node is visited BEFORE its children (pre-order),
// and children are visited in document order.
export function walk(node, visit) {
  assertNode(node, 'node')
  if (typeof visit !== 'function') {
    throw new TypeError('visit must be a function')
  }

  // The depth lives in an inner function, so it is not part of the public API.
  const step = (current, depth) => {
    // Only a real `false` skips the subtree. undefined, null and 0 do not.
    if (visit(current, depth) === false) return
    for (const child of current.childNodes) {
      step(child, depth + 1)
    }
  }

  step(node, 0)
}

// Number of ancestor ELEMENTS. <html> is 0, <body> is 1.
// Going up with parentElement stops at <html> (its parent is the document,
// which is not an element), and it also works for detached trees.
export function getDepth(node) {
  assertNode(node, 'node')
  let depth = 0
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    depth += 1
  }
  return depth
}

// All elements (root included) that have EVERY class in `classNames`.
// The native root.getElementsByClassName does the same job, but it never
// includes the root itself and returns a live collection.
export function getElementsByClassName(root, classNames) {
  assertNode(root, 'root')
  const wanted = typeof classNames === 'string' ? classNames.split(/\s+/).filter(Boolean) : []
  if (wanted.length === 0) return []

  const found = []
  walk(root, (node) => {
    // classList.contains compares whole class names, so "cardboard" is not "card".
    if (node.nodeType === Node.ELEMENT_NODE && wanted.every((name) => node.classList.contains(name))) {
      found.push(node)
    }
  })
  return found
}

// The text that belongs to the element itself: its direct text nodes only.
// For <p>Hello <b>big</b> world</p> that is "Hello  world", not "Hello big world".
function ownText(element) {
  let text = ''
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) text += child.data
  }
  return text.trim()
}

// First element (document order) whose own text equals `text`.
// walk() cannot stop early, so this uses a small recursive search that
// returns as soon as it has a match.
export function findByText(root, text) {
  assertNode(root, 'root')
  if (typeof text !== 'string' || text === '') return null

  const search = (node) => {
    if (node.nodeType === Node.ELEMENT_NODE && ownText(node) === text) return node
    for (const child of node.childNodes) {
      const hit = search(child)
      if (hit) return hit
    }
    return null
  }

  return search(root)
}

// One step of the path: "div" or "div:nth-of-type(2)".
// The position is only added when the element has a sibling of the same tag,
// because otherwise the tag name alone already points at it.
function describeStep(element) {
  const tag = element.localName // already lower case for HTML elements
  const parent = element.parentElement
  if (!parent) return tag

  const sameTag = Array.from(parent.children).filter((sibling) => sibling.localName === tag)
  if (sameTag.length === 1) return tag
  return `${tag}:nth-of-type(${sameTag.indexOf(element) + 1})`
}

// Build the path while going UP to the top, then reverse it.
// The result is also a valid CSS selector for the element.
export function getDomPath(el) {
  if (!(el instanceof Element)) {
    throw new TypeError('el must be an element')
  }

  const steps = []
  for (let current = el; current; current = current.parentElement) {
    steps.push(describeStep(current))
  }
  return steps.reverse().join(' > ')
}

// ---------------------------------------------------------------------------
// h(): a tiny version of what React.createElement and JSX do, but it builds
// REAL DOM elements immediately instead of plain objects.
// ---------------------------------------------------------------------------

// "onClick" and "onMouseDown" are event handlers. "one" or "only" are not:
// after "on" there must be a capital letter.
const HANDLER_NAME = /^on[A-Z]/

function applyStyle(element, style) {
  if (style === null || typeof style !== 'object') return
  for (const [name, value] of Object.entries(style)) {
    if (value === null || value === undefined || value === false) continue
    if (name.startsWith('--')) {
      element.style.setProperty(name, String(value)) // custom properties need setProperty
    } else {
      element.style[name] = value // camelCase names such as backgroundColor
    }
  }
}

function applyProp(element, name, value) {
  if (HANDLER_NAME.test(name)) {
    // onClick -> "click", onMouseDown -> "mousedown"
    if (typeof value === 'function') {
      element.addEventListener(name.slice(2).toLowerCase(), value)
    }
    return
  }
  if (name === 'className') {
    if (value) element.className = value
    return
  }
  if (name === 'style') {
    applyStyle(element, value)
    return
  }
  // Everything else is an attribute. false, null and undefined mean "not set".
  if (value === false || value === null || value === undefined) return
  element.setAttribute(name, value === true ? '' : String(value))
}

function appendChild(parent, child) {
  if (Array.isArray(child)) {
    // Arrays (from .map) can be nested, so flatten them recursively.
    for (const item of child) appendChild(parent, item)
    return
  }
  // Same rule as React: these render nothing. (0 and "" are NOT in this list.)
  if (child === null || child === undefined || typeof child === 'boolean') return

  if (child instanceof Node) {
    parent.appendChild(child)
  } else {
    // A text node never parses HTML, so "<b>" stays plain text.
    // That is why this is safe against injected markup, unlike innerHTML.
    parent.appendChild(document.createTextNode(String(child)))
  }
}

function isPropsObject(props) {
  return (
    props === null ||
    props === undefined ||
    (typeof props === 'object' && !Array.isArray(props) && !(props instanceof Node))
  )
}

export function h(tag, props, ...children) {
  if (typeof tag !== 'string' || tag === '') {
    throw new TypeError('tag must be a non-empty string')
  }
  if (!isPropsObject(props)) {
    throw new TypeError('props must be an object or null (pass null when there are none)')
  }

  const element = document.createElement(tag)
  for (const [name, value] of Object.entries(props ?? {})) {
    applyProp(element, name, value)
  }
  appendChild(element, children)
  return element
}
