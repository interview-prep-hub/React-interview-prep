// Exercise 24: DOM traversal and a tiny hyperscript builder.
// Read README.md in this folder for the full requirements.
//
// Rules of this exercise:
// - The tests run in jsdom, so `document`, `Node` and `Element` are available.
// - Write the traversal yourself. While the tests run, querySelector,
//   querySelectorAll, getElementsByClassName and getElementsByTagName are
//   switched off: calling one of them throws an error.
// - A good order: walk, getDepth, getElementsByClassName, findByText,
//   getDomPath, h. Later functions can reuse earlier ones.
//
// Run the tests with:  npm test -- exercises/js/24-dom-traversal

// Depth-first walk over `node` and everything below it.
// visit(node, depth) is called for every node, parent BEFORE its children,
// children in document order. The node you start at has depth 0.
// If visit returns exactly `false`, skip the children of that node.
export function walk(node, visit) {
  // TODO 1: throw a TypeError if node is not a DOM node (instanceof Node)
  //         or if visit is not a function.
  // TODO 2: write a small inner function step(current, depth) that calls visit,
  //         then goes into current.childNodes (this includes text nodes).
  // TODO 3: only skip the children when visit(...) === false.
}

// Number of ancestor ELEMENTS of a node. <html> is 0, <body> is 1.
export function getDepth(node) {
  // TODO 4: throw a TypeError if node is not a DOM node.
  // TODO 5: go up with parentElement and count the steps.
  return undefined
}

// Array of all elements below (and including) root that have EVERY class
// in classNames (a string with class names separated by spaces).
export function getElementsByClassName(root, classNames) {
  // TODO 6: throw a TypeError if root is not a DOM node.
  // TODO 7: split classNames on whitespace and drop empty pieces.
  //         No class names (or not a string) means return [].
  // TODO 8: use walk() to visit the tree. For element nodes (nodeType === 1)
  //         check every wanted class, for example with element.classList.
  return undefined
}

// First element (document order) whose OWN text equals `text` after trim().
// "Own text" means the text nodes that are direct children of the element,
// not the text of its descendants.
export function findByText(root, text) {
  // TODO 9: throw a TypeError if root is not a DOM node.
  // TODO 10: return null when text is not a string or is an empty string.
  // TODO 11: write a helper that joins the direct text nodes (nodeType === 3)
  //          of an element and trims the result.
  // TODO 12: search depth-first and return the first match, or null.
  return undefined
}

// Path from the top of the tree down to el, for example
// "html > body > div:nth-of-type(2) > span".
export function getDomPath(el) {
  // TODO 13: throw a TypeError if el is not an Element.
  // TODO 14: for each element going up (parentElement) describe one step:
  //          the lower case tag name (localName), plus ":nth-of-type(n)" ONLY
  //          when a sibling has the same tag. n starts at 1.
  // TODO 15: join the steps from the top down with " > ".
  return undefined
}

// h(tag, props, ...children): build a real DOM element.
//   h("ul", { className: "list" }, h("li", null, "one"), h("li", null, "two"))
export function h(tag, props, ...children) {
  // TODO 16: throw a TypeError if tag is not a non-empty string, or if props is
  //          a string, number, array or DOM node (the second argument is
  //          always props, use null when there are none).
  // TODO 17: create the element with document.createElement(tag).
  // TODO 18: apply props: className, style object, on* handlers
  //          (onClick -> "click" listener), everything else as an attribute.
  //          Read the README for the exact rules about true, false and null.
  // TODO 19: append the children: strings and numbers as TEXT nodes, nodes as
  //          they are, arrays flattened, null/undefined/true/false skipped.
  return undefined
}
