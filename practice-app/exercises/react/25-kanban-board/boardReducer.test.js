import { boardReducer } from './boardReducer.js'

// These tests build their own board, so they do not depend on initialBoard.
// The board is deep-frozen: if your reducer tries to change it in place,
// JavaScript throws a TypeError and the test fails. That is how we check that
// the reducer is pure and immutable.

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

function makeBoard() {
  return deepFreeze({
    nextId: 100,
    columns: [
      {
        id: 'todo',
        title: 'To do',
        cards: [
          { id: 'a', text: 'Card A' },
          { id: 'b', text: 'Card B' },
        ],
      },
      { id: 'doing', title: 'Doing', limit: 3, cards: [{ id: 'c', text: 'Card C' }] },
      { id: 'done', title: 'Done', cards: [{ id: 'd', text: 'Card D' }] },
    ],
  })
}

const column = (state, id) => state.columns.find((c) => c.id === id)
const ids = (state, columnId) => column(state, columnId).cards.map((c) => c.id)
const texts = (state, columnId) => column(state, columnId).cards.map((c) => c.text)
const allIds = (state) => state.columns.flatMap((c) => c.cards.map((card) => card.id))

const add = (columnId, text) => ({ type: 'add_card', columnId, text })
const del = (cardId) => ({ type: 'delete_card', cardId })
const move = (cardId, direction) => ({ type: 'move_card', cardId, direction })

describe('25 boardReducer: add_card', () => {
  it('appends a card with the trimmed text to the end of the right column', () => {
    const state = makeBoard()
    const next = boardReducer(state, add('done', '  Ship it  '))

    expect(texts(next, 'done')).toEqual(['Card D', 'Ship it'])
    expect(texts(next, 'todo')).toEqual(['Card A', 'Card B'])
    expect(texts(next, 'doing')).toEqual(['Card C'])
  })

  it('gives every card a unique string id, even after a delete', () => {
    let state = makeBoard()
    state = boardReducer(state, add('todo', 'First'))
    state = boardReducer(state, add('todo', 'Second'))
    const first = column(state, 'todo').cards.find((c) => c.text === 'First')
    state = boardReducer(state, del(first?.id))
    state = boardReducer(state, add('done', 'Third'))

    const all = allIds(state)
    expect(all).toHaveLength(6) // a, b, c, d, Second, Third
    expect(new Set(all).size).toBe(all.length)
    all.forEach((id) => expect(typeof id).toBe('string'))
  })

  it('keeps ids unique over many additions into different columns', () => {
    let state = makeBoard()
    const columnIds = ['todo', 'done', 'todo', 'done']
    for (let i = 0; i < 20; i++) {
      state = boardReducer(state, add(columnIds[i % columnIds.length], `Extra ${i}`))
    }
    const all = allIds(state)
    expect(all).toHaveLength(24) // a, b, c, d and 20 new cards
    expect(new Set(all).size).toBe(24)
  })

  it('increases nextId by 1 for every card it adds', () => {
    const state = makeBoard()
    const once = boardReducer(state, add('todo', 'One'))
    const twice = boardReducer(once, add('done', 'Two'))

    expect(once.nextId).toBe(state.nextId + 1)
    expect(twice.nextId).toBe(state.nextId + 2)
    expect(column(once, 'todo').cards[2].id).not.toBe(column(twice, 'done').cards[1].id)
  })

  it('is pure: the same state and action give the same result at any time', () => {
    // A reducer that builds ids from Date.now() or Math.random() fails here.
    vi.useFakeTimers()
    try {
      const state = makeBoard()
      vi.setSystemTime(new Date('2030-01-01T10:00:00Z'))
      const first = boardReducer(state, add('todo', 'Same'))
      vi.setSystemTime(new Date('2030-06-01T10:00:00Z'))
      const second = boardReducer(state, add('todo', 'Same'))
      expect(texts(first, 'todo')).toEqual(['Card A', 'Card B', 'Same'])
      expect(second).toEqual(first)
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignores blank text and unknown columns', () => {
    const state = makeBoard()
    const added = boardReducer(state, add('todo', 'Real card'))
    expect(texts(added, 'todo')).toEqual(['Card A', 'Card B', 'Real card'])

    expect(boardReducer(added, add('todo', ''))).toBe(added)
    expect(boardReducer(added, add('todo', '   '))).toBe(added)
    expect(boardReducer(added, add('nope', 'Lost card'))).toBe(added)
  })

  it('refuses to add to a column that is at its limit', () => {
    let state = makeBoard()
    state = boardReducer(state, add('doing', 'Second in doing'))
    state = boardReducer(state, add('doing', 'Third in doing'))
    expect(ids(state, 'doing')).toHaveLength(3)

    expect(boardReducer(state, add('doing', 'Fourth in doing'))).toBe(state)
    // Columns without a limit are never full.
    expect(boardReducer(state, add('todo', 'More work'))).not.toBe(state)
  })

  it('does not change the old state and reuses the columns it did not touch', () => {
    const state = makeBoard()
    const next = boardReducer(state, add('todo', 'New'))

    expect(next).not.toBe(state)
    expect(ids(state, 'todo')).toEqual(['a', 'b']) // old state is intact
    expect(ids(next, 'todo')).toHaveLength(3)
    expect(next.columns[1]).toBe(state.columns[1]) // Doing: same object
    expect(next.columns[2]).toBe(state.columns[2]) // Done: same object
    expect(next.columns[0]).not.toBe(state.columns[0]) // To do: new object
  })
})

describe('25 boardReducer: delete_card', () => {
  it('removes only the card with that id, whichever column it is in', () => {
    const state = makeBoard()
    const next = boardReducer(state, del('c'))

    expect(ids(next, 'doing')).toEqual([])
    expect(ids(next, 'todo')).toEqual(['a', 'b'])
    expect(ids(next, 'done')).toEqual(['d'])

    const next2 = boardReducer(next, del('a'))
    expect(ids(next2, 'todo')).toEqual(['b'])
  })

  it('removes only the card with that id when another card has the same text', () => {
    let state = makeBoard()
    state = boardReducer(state, add('todo', 'Twin'))
    state = boardReducer(state, add('todo', 'Twin'))
    expect(texts(state, 'todo')).toEqual(['Card A', 'Card B', 'Twin', 'Twin'])
    const [first, second] = column(state, 'todo').cards.filter((c) => c.text === 'Twin')

    const next = boardReducer(state, del(first.id))

    expect(ids(next, 'todo')).toEqual(['a', 'b', second.id])
  })

  it('returns the same state when the id does not exist', () => {
    const state = makeBoard()
    const next = boardReducer(state, del('a'))
    expect(ids(next, 'todo')).toEqual(['b'])

    expect(boardReducer(next, del('missing'))).toBe(next)
  })

  it('does not change the old state and reuses the columns it did not touch', () => {
    const state = makeBoard()
    const next = boardReducer(state, del('b'))

    expect(next).not.toBe(state)
    expect(ids(state, 'todo')).toEqual(['a', 'b'])
    expect(ids(next, 'todo')).toEqual(['a'])
    expect(next.columns[1]).toBe(state.columns[1])
    expect(next.columns[2]).toBe(state.columns[2])
  })
})

describe('25 boardReducer: move_card', () => {
  it('moves a card one column to the right, to the end of that column', () => {
    const state = makeBoard()
    const next = boardReducer(state, move('a', 'right'))

    expect(ids(next, 'todo')).toEqual(['b'])
    expect(ids(next, 'doing')).toEqual(['c', 'a'])
    expect(ids(next, 'done')).toEqual(['d'])
  })

  it('moves a card one column to the left, to the end of that column', () => {
    const state = makeBoard()
    const next = boardReducer(state, move('d', 'left'))

    expect(ids(next, 'done')).toEqual([])
    expect(ids(next, 'doing')).toEqual(['c', 'd'])
    expect(ids(next, 'todo')).toEqual(['a', 'b'])
  })

  it('keeps the card text and id when it moves', () => {
    const state = makeBoard()
    const next = boardReducer(boardReducer(state, move('b', 'right')), move('b', 'right'))

    expect(column(next, 'done').cards).toContainEqual({ id: 'b', text: 'Card B' })
    expect(allIds(next).sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('does nothing at the edges of the board', () => {
    const state = makeBoard()
    const moved = boardReducer(state, move('a', 'right'))
    expect(ids(moved, 'doing')).toEqual(['c', 'a'])

    expect(boardReducer(moved, move('d', 'right'))).toBe(moved) // Done is the last column
    expect(boardReducer(moved, move('b', 'left'))).toBe(moved) // To do is the first column
    expect(boardReducer(moved, move('missing', 'right'))).toBe(moved) // unknown card
  })

  it('blocks a move into a full column but allows moves out of it', () => {
    let state = makeBoard()
    state = boardReducer(state, move('a', 'right')) // Doing: c, a
    state = boardReducer(state, move('b', 'right')) // Doing: c, a, b (full)
    expect(ids(state, 'doing')).toEqual(['c', 'a', 'b'])

    // Done -> Doing is blocked.
    expect(boardReducer(state, move('d', 'left'))).toBe(state)

    // Doing -> Done and Doing -> To do are fine.
    const out = boardReducer(state, move('a', 'right'))
    expect(ids(out, 'doing')).toEqual(['c', 'b'])
    expect(ids(out, 'done')).toEqual(['d', 'a'])
    const back = boardReducer(state, move('c', 'left'))
    expect(ids(back, 'todo')).toEqual(['c'])
  })

  it('blocks moving a fourth card into Doing from To do', () => {
    let state = makeBoard()
    state = boardReducer(state, add('todo', 'Card E'))
    state = boardReducer(state, move('a', 'right'))
    state = boardReducer(state, move('b', 'right'))
    expect(ids(state, 'doing')).toHaveLength(3)

    const eId = column(state, 'todo').cards[0].id
    expect(boardReducer(state, move(eId, 'right'))).toBe(state)
  })

  it('does not change the old state and reuses the column it did not touch', () => {
    const state = makeBoard()
    const next = boardReducer(state, move('a', 'right'))

    expect(next).not.toBe(state)
    expect(ids(state, 'todo')).toEqual(['a', 'b'])
    expect(ids(state, 'doing')).toEqual(['c'])
    expect(next.columns[2]).toBe(state.columns[2]) // Done was not involved
    expect(next.columns[0]).not.toBe(state.columns[0])
    expect(next.columns[1]).not.toBe(state.columns[1])
  })
})

describe('25 boardReducer: limits of different sizes', () => {
  // One has limit 1 (full), Many has no limit but holds 4 cards, Two has limit 2.
  function makeLimitBoard() {
    return deepFreeze({
      nextId: 50,
      columns: [
        { id: 'one', title: 'One', limit: 1, cards: [{ id: 'p', text: 'P' }] },
        {
          id: 'many',
          title: 'Many',
          cards: [
            { id: 'q1', text: 'Q1' },
            { id: 'q2', text: 'Q2' },
            { id: 'q3', text: 'Q3' },
            { id: 'q4', text: 'Q4' },
          ],
        },
        { id: 'two', title: 'Two', limit: 2, cards: [{ id: 'r', text: 'R' }] },
      ],
    })
  }

  it('adds with the limit of each column; a column without a limit is never full', () => {
    const state = makeLimitBoard()

    expect(boardReducer(state, add('one', 'No room'))).toBe(state)
    expect(ids(boardReducer(state, add('many', 'Fifth')), 'many')).toHaveLength(5)

    const filled = boardReducer(state, add('two', 'Second'))
    expect(ids(filled, 'two')).toHaveLength(2)
    expect(boardReducer(filled, add('two', 'Third'))).toBe(filled)
  })

  it('moves into a column without a limit even when it already holds many cards', () => {
    const next = boardReducer(makeLimitBoard(), move('p', 'right'))

    expect(ids(next, 'many')).toEqual(['q1', 'q2', 'q3', 'q4', 'p'])
    expect(ids(next, 'one')).toEqual([])
  })

  it('blocks a move into a column that holds as many cards as its limit', () => {
    const state = makeLimitBoard()

    // One (limit 1) is full: nothing can move left into it.
    expect(boardReducer(state, move('q1', 'left'))).toBe(state)

    // Two (limit 2) has one free slot: the first move works, the second does not.
    const once = boardReducer(state, move('q1', 'right'))
    expect(ids(once, 'two')).toEqual(['r', 'q1'])
    expect(boardReducer(once, move('q2', 'right'))).toBe(once)
  })
})

describe('25 boardReducer: general', () => {
  it('throws on an unknown action type', () => {
    expect(() => boardReducer(makeBoard(), { type: 'explode' })).toThrow()
  })

  it('keeps the rest of the state: nextId only grows on add, columns keep id, title and limit', () => {
    const state = makeBoard()
    const heads = (s) => s.columns.map((c) => ({ id: c.id, title: c.title, limit: c.limit }))

    const added = boardReducer(state, add('doing', 'More'))
    const deleted = boardReducer(state, del('a'))
    const movedRight = boardReducer(state, move('a', 'right'))
    const movedLeft = boardReducer(state, move('d', 'left'))

    expect(added.nextId).toBe(state.nextId + 1)
    expect(deleted.nextId).toBe(state.nextId)
    expect(movedRight.nextId).toBe(state.nextId)
    expect(movedLeft.nextId).toBe(state.nextId)
    for (const next of [added, deleted, movedRight, movedLeft]) {
      expect(heads(next)).toEqual(heads(state))
    }
  })

  it('works through a longer sequence of actions', () => {
    let state = makeBoard()
    state = boardReducer(state, add('todo', 'Write docs'))
    state = boardReducer(state, move('a', 'right'))
    state = boardReducer(state, move('a', 'right'))
    state = boardReducer(state, del('d'))
    state = boardReducer(state, move('c', 'left'))

    expect(texts(state, 'todo')).toEqual(['Card B', 'Write docs', 'Card C'])
    expect(texts(state, 'doing')).toEqual([])
    expect(texts(state, 'done')).toEqual(['Card A'])
  })
})
