import {
  walk,
  getDepth,
  getElementsByClassName,
  findByText,
  getDomPath,
  h,
} from './index.js'

// ---------------------------------------------------------------------------
// Test helpers (the tests run in jsdom, so `document` and `Node` are global)
// ---------------------------------------------------------------------------

// This exercise is about writing the traversal yourself. So the built-in DOM
// search methods are switched off while each test runs: calling one of them
// from your code throws an error. (These two constants keep the REAL methods,
// so the tests themselves can still use them to double-check your answers.)
const realQuerySelector = Document.prototype.querySelector
const BLOCKED_METHODS = [
  'querySelector',
  'querySelectorAll',
  'getElementsByClassName',
  'getElementsByTagName',
]

beforeEach(() => {
  for (const proto of [Element.prototype, Document.prototype, DocumentFragment.prototype]) {
    for (const name of BLOCKED_METHODS) {
      if (Object.prototype.hasOwnProperty.call(proto, name)) {
        vi.spyOn(proto, name).mockImplementation(() => {
          throw new Error(`${name} is off limits in this exercise: write the traversal yourself`)
        })
      }
    }
  }
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

// Put HTML into the page. Whitespace between tags is removed, so the tests do
// not have to care about invisible text nodes made by indentation.
function mount(html) {
  document.body.innerHTML = html.replace(/>\s+</g, '><').trim()
}

const $ = (id) => document.getElementById(id)

// A short readable name for any node.
function label(node) {
  if (node.nodeType === Node.ELEMENT_NODE) return node.id || node.localName
  if (node.nodeType === Node.TEXT_NODE) return `#text(${node.data})`
  if (node.nodeType === Node.COMMENT_NODE) return '#comment'
  return `#type${node.nodeType}`
}

// Collect [name, depth] for every visit of walk().
function collectWalk(start) {
  const visits = []
  walk(start, (node, depth) => {
    visits.push([label(node), depth])
  })
  return visits
}

// Ids of a result list. A missing implementation shows up as a clean assertion
// failure instead of a crash.
const ids = (list) => (Array.isArray(list) ? list.map((el) => el.id) : list)

// HTML of an element, or a description of what was returned instead.
const html = (node) => (node instanceof Element ? node.outerHTML : `not an element: ${String(node)}`)

// Calls h() and checks that a real element came back. A missing implementation
// then fails here with a clear message, before the test reads from the result.
function build(...args) {
  const el = h(...args)
  expect(el).toBeInstanceOf(Element)
  return el
}

// Every element below (and including) a node, found without the blocked methods.
function allElements(root) {
  const found = []
  const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  for (let node = treeWalker.currentNode; node; node = treeWalker.nextNode()) {
    if (node.nodeType === Node.ELEMENT_NODE) found.push(node)
  }
  return found
}

// A page used by several groups of tests.
const SHOP = `
  <div id="app" class="app">
    <header id="top" class="bar dark">
      <h1 id="title" class="title">Shop</h1>
    </header>
    <main id="main" class="content">
      <section id="s1" class="card featured">
        <h2 id="s1-title" class="title">Shoes</h2>
        <p id="s1-text" class="text">Comfortable shoes</p>
      </section>
      <section id="s2" class="card">
        <h2 id="s2-title" class="title">Hats</h2>
        <p id="s2-text" class="text featured">Warm hats</p>
      </section>
    </main>
    <footer id="foot" class="bar">
      <span id="foot-note" class="text">Thanks</span>
    </footer>
  </div>
`

// ---------------------------------------------------------------------------

describe('24 DOM traversal: walk', () => {
  beforeEach(() => {
    mount(`
      <div id="a">
        <div id="b"><p id="c"></p><p id="d"></p></div>
        <div id="e"><span id="f"></span></div>
      </div>
    `)
  })

  it('visits nodes depth-first, parent before children, with the depth', () => {
    expect(collectWalk($('a'))).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
      ['d', 2],
      ['e', 1],
      ['f', 2],
    ])
  })

  it('counts the depth from the node you start at', () => {
    expect(collectWalk($('b'))).toEqual([
      ['b', 0],
      ['c', 1],
      ['d', 1],
    ])
  })

  it('skips the children of a node when visit returns false, but not its siblings', () => {
    const visits = []
    walk($('a'), (node, depth) => {
      visits.push([label(node), depth])
      if (node.id === 'b') return false
    })
    expect(visits).toEqual([
      ['a', 0],
      ['b', 1],
      ['e', 1],
      ['f', 2],
    ])
  })

  it('stops at once when visit returns false for the start node', () => {
    const visit = vi.fn(() => false)
    walk($('a'), visit)
    expect(visit).toHaveBeenCalledTimes(1)
    expect(visit.mock.calls[0][0]).toBe($('a'))
    expect(visit.mock.calls[0][1]).toBe(0)
  })

  it('only a real false skips: undefined, null, 0, empty string and true do not', () => {
    for (const result of [undefined, null, 0, '', true]) {
      const visit = vi.fn(() => result)
      walk($('a'), visit)
      expect(visit).toHaveBeenCalledTimes(6)
    }
  })

  it('also visits text and comment nodes (it follows childNodes, not children)', () => {
    mount('<p id="p">Hi<b id="b">x</b><!-- note --></p>')
    expect(collectWalk($('p'))).toEqual([
      ['p', 0],
      ['#text(Hi)', 1],
      ['b', 1],
      ['#text(x)', 2],
      ['#comment', 1],
    ])
  })

  it('visits a node with no children exactly once', () => {
    expect(collectWalk($('f'))).toEqual([['f', 0]])
  })

  it('can start from a text node', () => {
    mount('<p id="p">Hello</p>')
    expect(collectWalk($('p').firstChild)).toEqual([['#text(Hello)', 0]])
  })

  it('can start from the document', () => {
    const depthOf = new Map()
    walk(document, (node, depth) => {
      depthOf.set(node, depth)
    })
    expect(depthOf.get(document)).toBe(0)
    expect(depthOf.get(document.documentElement)).toBe(1)
    expect(depthOf.get(document.body)).toBe(2)
    expect(depthOf.get($('f'))).toBe(2 + 3)
  })

  it('visits every node of a bigger tree exactly once', () => {
    // 4 children on each of 3 levels: 1 + 4 + 16 + 64 = 85 elements.
    const build = (level) => {
      const el = document.createElement('div')
      if (level < 3) {
        for (let i = 0; i < 4; i++) el.appendChild(build(level + 1))
      }
      return el
    }
    const root = build(0)
    const seen = new Set()
    let calls = 0
    walk(root, (node) => {
      calls += 1
      seen.add(node)
    })
    expect(calls).toBe(85)
    expect(seen.size).toBe(85)
  })

  it('throws a TypeError when visit is not a function', () => {
    expect(() => walk($('a'), undefined)).toThrow(TypeError)
    expect(() => walk($('a'), 'nope')).toThrow(TypeError)
  })

  it('throws a TypeError when the start is not a DOM node', () => {
    const visit = vi.fn()
    expect(() => walk(null, visit)).toThrow(TypeError)
    expect(() => walk({}, visit)).toThrow(TypeError)
    expect(() => walk('div', visit)).toThrow(TypeError)
    expect(visit).not.toHaveBeenCalled()
  })
})

describe('24 DOM traversal: getDepth', () => {
  it('is 0 for <html> and 1 for <body>', () => {
    expect(getDepth(document.documentElement)).toBe(0)
    expect(getDepth(document.body)).toBe(1)
  })

  it('counts the ancestor elements of a nested element', () => {
    mount('<div id="a"><div id="b"><span id="c"></span></div></div>')
    expect(getDepth($('a'))).toBe(2)
    expect(getDepth($('b'))).toBe(3)
    expect(getDepth($('c'))).toBe(4)
  })

  it('is 0 for an element that is not in any tree', () => {
    expect(getDepth(document.createElement('div'))).toBe(0)
  })

  it('works inside a tree that is not attached to the document', () => {
    const outer = document.createElement('section')
    const middle = document.createElement('div')
    const inner = document.createElement('span')
    outer.appendChild(middle)
    middle.appendChild(inner)
    expect(getDepth(outer)).toBe(0)
    expect(getDepth(middle)).toBe(1)
    expect(getDepth(inner)).toBe(2)
  })

  it('works for text nodes too (one deeper than their element)', () => {
    mount('<p id="p">Hello</p>')
    expect(getDepth($('p'))).toBe(2)
    expect(getDepth($('p').firstChild)).toBe(3)
  })

  it('is 0 for the document itself', () => {
    expect(getDepth(document)).toBe(0)
  })

  it('always reads the current tree (moving a node changes its depth)', () => {
    mount('<div id="a"><div id="b"><span id="c"></span></div></div>')
    expect(getDepth($('c'))).toBe(4)
    $('a').appendChild($('c'))
    expect(getDepth($('c'))).toBe(3)
  })

  it('throws a TypeError when the value is not a DOM node', () => {
    expect(() => getDepth(null)).toThrow(TypeError)
    expect(() => getDepth(undefined)).toThrow(TypeError)
    expect(() => getDepth({})).toThrow(TypeError)
    expect(() => getDepth('div')).toThrow(TypeError)
  })
})

describe('24 DOM traversal: getElementsByClassName', () => {
  beforeEach(() => mount(SHOP))

  it('finds elements in document order', () => {
    expect(ids(getElementsByClassName($('app'), 'title'))).toEqual(['title', 's1-title', 's2-title'])
    expect(ids(getElementsByClassName($('app'), 'text'))).toEqual(['s1-text', 's2-text', 'foot-note'])
  })

  it('requires every given class, in any order', () => {
    expect(ids(getElementsByClassName($('app'), 'card featured'))).toEqual(['s1'])
    expect(ids(getElementsByClassName($('app'), 'featured card'))).toEqual(['s1'])
    expect(ids(getElementsByClassName($('app'), 'text featured'))).toEqual(['s2-text'])
    expect(ids(getElementsByClassName($('app'), 'card text'))).toEqual([])
  })

  it('ignores extra spaces, tabs and new lines between class names', () => {
    expect(ids(getElementsByClassName($('app'), '  card \t featured\n'))).toEqual(['s1'])
  })

  it('accepts the same class twice', () => {
    expect(ids(getElementsByClassName($('app'), 'card card'))).toEqual(['s1', 's2'])
  })

  it('includes the root itself when the root matches', () => {
    expect(ids(getElementsByClassName($('s1'), 'card'))).toEqual(['s1'])
    expect(ids(getElementsByClassName($('app'), 'app'))).toEqual(['app'])
  })

  it('does not include the root when it does not match', () => {
    expect(ids(getElementsByClassName($('main'), 'card'))).toEqual(['s1', 's2'])
    expect(ids(getElementsByClassName($('main'), 'content'))).toEqual(['main'])
    expect(ids(getElementsByClassName($('s2'), 'content'))).toEqual([])
  })

  it('looks only inside the root', () => {
    expect(ids(getElementsByClassName($('main'), 'bar'))).toEqual([])
    expect(ids(getElementsByClassName($('s1'), 'text'))).toEqual(['s1-text'])
  })

  it('returns parent and child when both match, parent first', () => {
    mount('<div id="outer" class="box"><div id="inner" class="box"><i id="leaf" class="box"></i></div></div>')
    expect(ids(getElementsByClassName($('outer'), 'box'))).toEqual(['outer', 'inner', 'leaf'])
  })

  it('compares whole class names, and is case sensitive', () => {
    mount('<div id="x" class="cardboard"></div><div id="y" class="card-title"></div><div id="z" class="Card"></div>')
    expect(ids(getElementsByClassName(document.body, 'card'))).toEqual([])
    expect(ids(getElementsByClassName(document.body, 'Card'))).toEqual(['z'])
  })

  it('returns a plain array, a new one on every call, with elements only', () => {
    const first = getElementsByClassName($('app'), 'card')
    const second = getElementsByClassName($('app'), 'card')
    expect(Array.isArray(first)).toBe(true)
    expect(first).not.toBe(second)
    expect(first.every((node) => node.nodeType === Node.ELEMENT_NODE)).toBe(true)
  })

  it('returns an empty array when nothing matches', () => {
    expect(getElementsByClassName($('app'), 'nope')).toEqual([])
  })

  it('returns an empty array when there is no class name to look for', () => {
    expect(getElementsByClassName($('app'), '')).toEqual([])
    expect(getElementsByClassName($('app'), '   ')).toEqual([])
    expect(getElementsByClassName($('app'), undefined)).toEqual([])
    expect(getElementsByClassName($('app'), 42)).toEqual([])
  })

  it('works when the root is the document', () => {
    document.documentElement.classList.add('theme')
    const themed = getElementsByClassName(document, 'theme')
    expect(themed).toHaveLength(1)
    expect(themed[0]).toBe(document.documentElement)
    expect(ids(getElementsByClassName(document, 'bar'))).toEqual(['top', 'foot'])
  })

  it('throws a TypeError when the root is not a DOM node', () => {
    expect(() => getElementsByClassName(null, 'card')).toThrow(TypeError)
    expect(() => getElementsByClassName({}, 'card')).toThrow(TypeError)
    expect(() => getElementsByClassName('app', 'card')).toThrow(TypeError)
  })
})

describe('24 DOM traversal: findByText', () => {
  it('finds an element by its own text', () => {
    mount('<div id="card"><h2 id="title">Title</h2><button id="btn">Save</button></div>')
    expect(findByText($('card'), 'Save')).toBe($('btn'))
    expect(findByText($('card'), 'Title')).toBe($('title'))
  })

  it('returns the element that owns the text, not its ancestors', () => {
    mount('<div id="outer"><div id="mid"><span id="inner">Save</span></div></div>')
    // outer.textContent is also "Save", but outer has no text of its own.
    expect(findByText($('outer'), 'Save')).toBe($('inner'))
  })

  it('ignores spaces and new lines around the text of the element', () => {
    mount('<button id="btn">\n   Save   \n</button>')
    expect(findByText(document.body, 'Save')).toBe($('btn'))
  })

  it('returns the first match in document order', () => {
    mount('<ul id="list"><li id="one">Item</li><li id="two">Other</li><li id="three">Item</li></ul>')
    expect(findByText($('list'), 'Item')).toBe($('one'))
  })

  it('finds a deep match before a later shallow one when it comes first in the document', () => {
    mount('<div id="root"><div><div><p id="deep">Hit</p></div></div><p id="late">Hit</p></div>')
    expect(findByText($('root'), 'Hit')).toBe($('deep'))
  })

  it('uses only the direct text nodes of mixed content', () => {
    mount('<p id="p">Hello <b id="b">big</b>world</p>')
    expect(findByText($('p'), 'Hello world')).toBe($('p'))
    expect(findByText($('p'), 'big')).toBe($('b'))
    expect(findByText($('p'), 'Hello bigworld')).toBeNull()
    expect(findByText($('p'), 'Hello big world')).toBeNull()
  })

  it('needs the whole text to match, with the same letter case', () => {
    mount('<button id="btn">Save</button>')
    expect(findByText(document.body, 'Sav')).toBeNull()
    expect(findByText(document.body, 'ave')).toBeNull()
    expect(findByText(document.body, 'save')).toBeNull()
    expect(findByText(document.body, 'Save')).toBe($('btn'))
  })

  it('does not change the spaces inside the text, and does not trim the search text', () => {
    mount('<p id="p">a  b</p>')
    expect(findByText(document.body, 'a b')).toBeNull()
    expect(findByText(document.body, 'a  b')).toBe($('p'))
    expect(findByText(document.body, ' a  b ')).toBeNull()
  })

  it('does not count comments as text', () => {
    mount('<p id="p">Hi<!-- hidden --></p>')
    expect(findByText(document.body, 'Hi')).toBe($('p'))
    expect(findByText(document.body, 'Hi hidden')).toBeNull()
    expect(findByText(document.body, 'hidden')).toBeNull()
  })

  it('can return the root itself', () => {
    mount('<button id="btn">Save</button>')
    expect(findByText($('btn'), 'Save')).toBe($('btn'))
  })

  it('searches only inside the root', () => {
    mount('<div id="a"><p>Inside</p></div><div id="b"><p id="out">Outside</p></div>')
    expect(findByText($('a'), 'Outside')).toBeNull()
    expect(findByText($('b'), 'Outside')).toBe($('out'))
  })

  it('returns null (not undefined) when nothing matches', () => {
    mount('<p>Hello</p>')
    expect(findByText(document.body, 'Goodbye')).toBeNull()
  })

  it('returns null for an empty search text, even if some elements have no own text', () => {
    mount('<div id="wrap"><span>x</span></div>')
    expect(findByText(document.body, '')).toBeNull()
  })

  it('works when the root is the document', () => {
    mount('<h1 id="h">Welcome</h1>')
    expect(findByText(document, 'Welcome')).toBe($('h'))
  })

  it('throws a TypeError when the root is not a DOM node', () => {
    expect(() => findByText(null, 'x')).toThrow(TypeError)
    expect(() => findByText({}, 'x')).toThrow(TypeError)
  })
})

describe('24 DOM traversal: getDomPath', () => {
  it('describes <html> and <body>', () => {
    expect(getDomPath(document.documentElement)).toBe('html')
    expect(getDomPath(document.body)).toBe('html > body')
  })

  it('builds the example from the README', () => {
    mount('<div><p>one</p></div><div><span id="target">two</span></div>')
    expect(getDomPath($('target'))).toBe('html > body > div:nth-of-type(2) > span')
  })

  it('adds no position when the element is the only one of its tag', () => {
    mount('<div id="a"><p id="b"><span id="c">x</span></p></div>')
    expect(getDomPath($('c'))).toBe('html > body > div > p > span')
  })

  it('adds a position, starting at 1, as soon as a sibling has the same tag', () => {
    mount('<ul><li id="first">a</li><li id="second">b</li><li id="third">c</li></ul>')
    expect(getDomPath($('first'))).toBe('html > body > ul > li:nth-of-type(1)')
    expect(getDomPath($('second'))).toBe('html > body > ul > li:nth-of-type(2)')
    expect(getDomPath($('third'))).toBe('html > body > ul > li:nth-of-type(3)')
  })

  it('counts only siblings with the same tag', () => {
    mount('<p id="p1"></p><div id="d1"></div><p id="p2"></p><span id="s1"></span><div id="d2"></div>')
    expect(getDomPath($('p1'))).toBe('html > body > p:nth-of-type(1)')
    expect(getDomPath($('p2'))).toBe('html > body > p:nth-of-type(2)')
    expect(getDomPath($('d1'))).toBe('html > body > div:nth-of-type(1)')
    expect(getDomPath($('d2'))).toBe('html > body > div:nth-of-type(2)')
    // The only <span> among its siblings needs no position.
    expect(getDomPath($('s1'))).toBe('html > body > span')
  })

  it('puts a position on several levels of the same path', () => {
    mount(
      '<div><section><p>a</p></section></div>' +
        '<div><section><p>b</p></section><section><p>c</p><p id="deep">d</p></section></div>',
    )
    expect(getDomPath($('deep'))).toBe(
      'html > body > div:nth-of-type(2) > section:nth-of-type(2) > p:nth-of-type(2)',
    )
  })

  it('does not count text nodes or comments as siblings', () => {
    mount('<div id="box">text<span>a</span><!-- c -->more<span id="two">b</span></div>')
    expect(getDomPath($('two'))).toBe('html > body > div > span:nth-of-type(2)')
  })

  it('writes tag names in lower case', () => {
    mount('<MAIN id="m"><ARTICLE id="a"></ARTICLE></MAIN>')
    expect(getDomPath($('a'))).toBe('html > body > main > article')
  })

  it('ends the path at the top of a tree that is not attached to the document', () => {
    const box = document.createElement('div')
    box.appendChild(document.createElement('span'))
    const second = document.createElement('span')
    box.appendChild(second)
    expect(getDomPath(box)).toBe('div')
    expect(getDomPath(second)).toBe('div > span:nth-of-type(2)')
  })

  it('gives a path that selects exactly that element (checked for every element)', () => {
    mount(SHOP + '<ul id="list"><li>a</li><li>b</li><li><b>c</b><b>d</b></li></ul><p>x</p><p>y</p>')
    const elements = allElements(document.documentElement)
    expect(elements.length).toBeGreaterThan(20)
    for (const el of elements) {
      const path = getDomPath(el)
      expect(realQuerySelector.call(document, path)).toBe(el)
    }
  })

  it('follows the page when elements are moved', () => {
    mount('<div id="a"></div><div id="b"><span id="s"></span></div>')
    expect(getDomPath($('s'))).toBe('html > body > div:nth-of-type(2) > span')
    $('a').appendChild($('s'))
    expect(getDomPath($('s'))).toBe('html > body > div:nth-of-type(1) > span')
  })

  it('throws a TypeError when the value is not an element', () => {
    mount('<p id="p">text</p>')
    expect(() => getDomPath($('p').firstChild)).toThrow(TypeError)
    expect(() => getDomPath(document)).toThrow(TypeError)
    expect(() => getDomPath(null)).toThrow(TypeError)
    expect(() => getDomPath('p')).toThrow(TypeError)
  })
})

describe('24 DOM traversal: h (hyperscript builder)', () => {
  describe('elements and props', () => {
    it('creates a real element with the given tag', () => {
      const el = build('section', null)
      expect(html(el)).toBe('<section></section>')
      expect(el.ownerDocument).toBe(document)
      expect(el.parentNode).toBeNull()
    })

    it('props can be null or undefined, and children are optional', () => {
      expect(html(h('div'))).toBe('<div></div>')
      expect(html(h('div', undefined))).toBe('<div></div>')
      expect(html(h('div', null))).toBe('<div></div>')
      expect(html(h('div', {}))).toBe('<div></div>')
    })

    it('className sets the class attribute', () => {
      const el = build('div', { className: 'card featured' })
      expect(el.getAttribute('class')).toBe('card featured')
      expect(el.classList.contains('featured')).toBe(true)
    })

    it('an empty, false or missing className adds no class attribute', () => {
      expect(html(h('div', { className: '' }))).toBe('<div></div>')
      expect(html(h('div', { className: false }))).toBe('<div></div>')
      expect(html(h('div', { className: undefined }))).toBe('<div></div>')
    })

    it('style takes an object with camelCase names', () => {
      const el = build('div', { style: { backgroundColor: 'red', fontSize: '12px' } })
      expect(el.style.backgroundColor).toBe('red')
      expect(el.style.fontSize).toBe('12px')
    })

    it('style supports custom properties and skips null, undefined and false values', () => {
      const el = build('div', {
        style: { '--gap': '4px', color: 'blue', width: undefined, height: null, margin: false },
      })
      expect(el.style.getPropertyValue('--gap')).toBe('4px')
      expect(el.style.color).toBe('blue')
      expect(el.style.width).toBe('')
      expect(el.style.height).toBe('')
      expect(el.style.margin).toBe('')
    })

    it('data-* props become data attributes (numbers are turned into text)', () => {
      const el = build('li', { 'data-id': 7, 'data-user-name': 'ada' })
      expect(el.getAttribute('data-id')).toBe('7')
      expect(el.dataset.id).toBe('7')
      expect(el.dataset.userName).toBe('ada')
    })

    it('other props become attributes', () => {
      const el = build('a', { href: '/home', id: 'link', 'aria-label': 'Go home', tabindex: 0 })
      expect(el.getAttribute('href')).toBe('/home')
      expect(el.id).toBe('link')
      expect(el.getAttribute('aria-label')).toBe('Go home')
      expect(el.getAttribute('tabindex')).toBe('0')
    })

    it('true gives an empty attribute; false, null and undefined give no attribute', () => {
      const el = build('input', {
        type: 'text',
        disabled: true,
        readonly: false,
        placeholder: null,
        title: undefined,
      })
      expect(el.hasAttribute('disabled')).toBe(true)
      expect(el.getAttribute('disabled')).toBe('')
      expect(el.disabled).toBe(true)
      expect(el.getAttribute('type')).toBe('text')
      expect(el.hasAttribute('readonly')).toBe(false)
      expect(el.hasAttribute('placeholder')).toBe(false)
      expect(el.hasAttribute('title')).toBe(false)
    })
  })

  describe('event handlers', () => {
    it('onClick adds a real click listener', () => {
      const onClick = vi.fn()
      const button = build('button', { onClick }, 'Go')
      expect(onClick).not.toHaveBeenCalled()
      button.click()
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onClick.mock.calls[0][0]).toBeInstanceOf(Event)
      expect(onClick.mock.calls[0][0].type).toBe('click')
      expect(onClick.mock.calls[0][0].target).toBe(button)
    })

    it('the event name is the rest of the prop name in lower case', () => {
      const onMouseDown = vi.fn()
      const onKeyUp = vi.fn()
      const el = build('div', { onMouseDown, onKeyUp })
      el.dispatchEvent(new MouseEvent('mousedown'))
      expect(onMouseDown).toHaveBeenCalledTimes(1)
      expect(onKeyUp).not.toHaveBeenCalled()
      el.dispatchEvent(new KeyboardEvent('keyup'))
      expect(onKeyUp).toHaveBeenCalledTimes(1)
    })

    it('handlers are not written as attributes', () => {
      const el = build('button', { onClick: () => {} })
      expect(el.hasAttribute('onclick')).toBe(false)
      expect(el.attributes.length).toBe(0)
    })

    it('a handler that is not a function is ignored without an error', () => {
      for (const value of [undefined, null, false]) {
        const el = build('button', { onClick: value })
        expect(el.attributes.length).toBe(0)
        expect(() => el.click()).not.toThrow()
      }
    })

    it('"on" must be followed by a capital letter to count as a handler', () => {
      const el = build('div', { only: 'yes', one: 1 })
      expect(el.getAttribute('only')).toBe('yes')
      expect(el.getAttribute('one')).toBe('1')
    })

    it('events bubble to a handler on the parent', () => {
      const onClick = vi.fn()
      const child = build('button', null, 'Child')
      const parent = build('div', { onClick }, child)
      document.body.appendChild(parent)
      child.click()
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onClick.mock.calls[0][0].target).toBe(child)
    })
  })

  describe('children', () => {
    it('strings become text', () => {
      expect(html(h('p', null, 'Hello'))).toBe('<p>Hello</p>')
      expect(html(h('p', null, 'Hello ', 'world'))).toBe('<p>Hello world</p>')
    })

    it('numbers become text, and 0 is kept', () => {
      expect(html(h('p', null, 'Total: ', 42))).toBe('<p>Total: 42</p>')
      expect(html(h('p', null, 0))).toBe('<p>0</p>')
    })

    it('nodes are added as they are, in order', () => {
      const first = document.createElement('b')
      const second = document.createElement('i')
      const el = build('p', null, first, 'and', second)
      expect(html(el)).toBe('<p><b></b>and<i></i></p>')
      expect(el.firstChild).toBe(first)
      expect(el.lastChild).toBe(second)
    })

    it('builds trees from nested calls', () => {
      const tree = h('ul', { className: 'list' }, h('li', null, 'a'), h('li', null, h('b', null, 'b')))
      expect(html(tree)).toBe('<ul class="list"><li>a</li><li><b>b</b></li></ul>')
    })

    it('arrays are flattened, at any depth, so .map() results work', () => {
      const items = ['x', 'y', 'z']
      const list = h('ul', null, items.map((item) => h('li', null, item)))
      expect(html(list)).toBe('<ul><li>x</li><li>y</li><li>z</li></ul>')

      const nested = h('p', null, ['a', ['b', ['c', [h('i', null, 'd')]]]], 'e')
      expect(html(nested)).toBe('<p>abc<i>d</i>e</p>')
    })

    it('null, undefined, true and false are skipped', () => {
      expect(html(h('p', null, null, undefined, false, true, 'x'))).toBe('<p>x</p>')
      const show = false
      expect(html(h('p', null, show && h('b', null, 'hidden'), 'ok'))).toBe('<p>ok</p>')
      expect(html(h('p', null, [null, [false, 'in array']]))).toBe('<p>in array</p>')
    })

    it('strings are text, never HTML', () => {
      const el = build('p', null, '<b>bold</b> & more')
      expect(el.children.length).toBe(0)
      expect(el.textContent).toBe('<b>bold</b> & more')
      expect(html(el)).toBe('<p>&lt;b&gt;bold&lt;/b&gt; &amp; more</p>')
    })

    it('builds a larger tree in one expression', () => {
      const todos = [
        { id: 1, text: 'Write tests', done: true },
        { id: 2, text: 'Ship it', done: false },
      ]
      const tree = build(
        'section',
        { id: 'todos' },
        h('h2', null, 'Todos (', todos.length, ')'),
        h(
          'ul',
          null,
          todos.map((todo) =>
            h('li', { 'data-id': todo.id, className: todo.done ? 'done' : null }, todo.text),
          ),
        ),
      )
      expect(tree.id).toBe('todos')
      expect(tree.firstChild.textContent).toBe('Todos (2)')
      const items = tree.lastChild.childNodes
      expect(items.length).toBe(2)
      expect(items[0].className).toBe('done')
      expect(items[0].dataset.id).toBe('1')
      expect(items[1].hasAttribute('class')).toBe(false)
      expect(items[1].textContent).toBe('Ship it')
    })
  })

  describe('wrong arguments', () => {
    it('throws a TypeError when the tag is not a non-empty string', () => {
      expect(() => h()).toThrow(TypeError)
      expect(() => h('')).toThrow(TypeError)
      expect(() => h(null)).toThrow(TypeError)
      expect(() => h(42)).toThrow(TypeError)
      expect(() => h(() => {})).toThrow(TypeError)
    })

    it('throws a TypeError when children are passed in the props place', () => {
      expect(() => h('p', 'hello')).toThrow(TypeError)
      expect(() => h('p', 42)).toThrow(TypeError)
      expect(() => h('ul', [h('li')])).toThrow(TypeError)
      expect(() => h('div', document.createElement('span'))).toThrow(TypeError)
    })
  })

  describe('results can be walked by the other functions', () => {
    it('works together with walk, findByText and getDomPath', () => {
      const tree = build('div', { className: 'card' }, h('h2', null, 'Title'), h('p', null, 'Body'))
      document.body.appendChild(tree)

      expect(collectWalk(tree)).toEqual([
        ['div', 0],
        ['h2', 1],
        ['#text(Title)', 2],
        ['p', 1],
        ['#text(Body)', 2],
      ])
      expect(findByText(tree, 'Body')).toBe(tree.lastChild)
      expect(getDomPath(tree.lastChild)).toBe('html > body > div > p')
      const cards = getElementsByClassName(document.body, 'card')
      expect(cards).toHaveLength(1)
      expect(cards[0]).toBe(tree)
    })
  })
})
