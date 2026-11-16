import { StrictMode } from 'react'
import { renderHook, act } from '@testing-library/react'
import { useHistory } from './useHistory.js'

// Small helpers so each test reads like a story.
function setup(initialValue, options) {
  return renderHook(() => useHistory(initialValue, options))
}

// Call set() once per value, each call in its own act() block (its own "event").
function setEach(result, values) {
  for (const value of values) {
    act(() => {
      result.current.set(value)
    })
  }
}

function undo(result) {
  act(() => {
    result.current.undo()
  })
}

function redo(result) {
  act(() => {
    result.current.redo()
  })
}

describe('26 useHistory: basics', () => {
  it('starts with the initial value and an empty history', () => {
    const { result } = setup('start')
    expect(result.current.state).toBe('start')
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
    expect(result.current.history).toEqual({ past: [], future: [] })
    expect(typeof result.current.set).toBe('function')
    expect(typeof result.current.undo).toBe('function')
    expect(typeof result.current.redo).toBe('function')
    expect(typeof result.current.reset).toBe('function')
  })

  it('set(value) replaces the state and remembers the old one', () => {
    const { result } = setup(0)
    setEach(result, [5])
    expect(result.current.state).toBe(5)
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
    expect(result.current.history).toEqual({ past: [0], future: [] })
  })

  it('set(updater) calls the function with the current state', () => {
    const { result } = setup(10)
    act(() => {
      result.current.set((n) => n + 5)
    })
    expect(result.current.state).toBe(15)
    act(() => {
      result.current.set((n) => n * 2)
    })
    expect(result.current.state).toBe(30)
    expect(result.current.history.past).toEqual([10, 15])
  })

  it('applies several set calls from the same event one after the other', () => {
    const { result } = setup(0)
    act(() => {
      result.current.set((n) => n + 1)
      result.current.set((n) => n + 1)
      result.current.set((n) => n + 1)
    })
    expect(result.current.state).toBe(3)
    expect(result.current.history.past).toEqual([0, 1, 2])

    // A plain value followed by an updater in the same event also works.
    act(() => {
      result.current.set(10)
      result.current.set((n) => n + 1)
    })
    expect(result.current.state).toBe(11)
    expect(result.current.history.past).toEqual([0, 1, 2, 3, 10])
  })

  it('keeps the exact values you set (no copying) and gives the same one back on undo', () => {
    const initial = { items: ['a'] }
    const next = { items: ['a', 'b'] }
    const { result } = setup(initial)
    setEach(result, [next])
    expect(result.current.state).toBe(next)
    expect(result.current.history.past[0]).toBe(initial)
    expect(initial).toEqual({ items: ['a'] })
    undo(result)
    expect(result.current.state).toBe(initial)
    expect(result.current.history.future[0]).toBe(next)
  })

  it('never changes a history array it handed out earlier', () => {
    const { result } = setup('a')
    setEach(result, ['b'])
    const pastAfterB = result.current.history.past
    setEach(result, ['c'])
    expect(pastAfterB).toEqual(['a'])

    undo(result)
    const futureAfterOneUndo = result.current.history.future
    undo(result)
    expect(futureAfterOneUndo).toEqual(['c'])
    expect(result.current.history.future).toEqual(['b', 'c'])
  })

  it('undo, redo and set never change arrays that were handed out before them', () => {
    const { result } = setup('a')
    setEach(result, ['b', 'c', 'd'])

    const beforeUndo = result.current.history
    undo(result)
    expect(beforeUndo.past).toEqual(['a', 'b', 'c'])
    expect(beforeUndo.future).toEqual([])

    const beforeRedo = result.current.history
    redo(result)
    expect(beforeRedo.past).toEqual(['a', 'b'])
    expect(beforeRedo.future).toEqual(['d'])

    undo(result)
    const beforeSet = result.current.history
    setEach(result, ['z'])
    expect(beforeSet.past).toEqual(['a', 'b'])
    expect(beforeSet.future).toEqual(['d'])
  })

  it('does not change an older past array when it drops states because of the limit', () => {
    const { result } = setup(0, { limit: 2 })
    setEach(result, [1, 2])
    const pastBefore = result.current.history.past
    setEach(result, [3])
    expect(pastBefore).toEqual([0, 1])
    expect(result.current.history.past).toEqual([1, 2])
  })
})

describe('26 useHistory: ignoring equal values', () => {
  it('ignores set(value) when the value is the same as the current state', () => {
    const { result } = setup(1)
    setEach(result, [2, 2, 2])
    expect(result.current.state).toBe(2)
    expect(result.current.history).toEqual({ past: [1], future: [] })
  })

  it('ignores an updater that returns the current state', () => {
    const { result } = setup(1)
    setEach(result, [2])
    act(() => {
      result.current.set((n) => n)
    })
    expect(result.current.history).toEqual({ past: [1], future: [] })
  })

  it('compares with Object.is (same object ignored, a copy is a change, NaN equals NaN, 0 differs from -0)', () => {
    const obj = { a: 1 }
    const objects = setup(obj)
    setEach(objects.result, [obj])
    expect(objects.result.current.canUndo).toBe(false)
    setEach(objects.result, [{ a: 1 }])
    expect(objects.result.current.history.past).toEqual([{ a: 1 }])
    expect(objects.result.current.history.past[0]).toBe(obj)

    const nan = setup(NaN)
    setEach(nan.result, [1, NaN, NaN])
    expect(nan.result.current.history.past).toEqual([NaN, 1])

    const zero = setup(0)
    setEach(zero.result, [-0])
    expect(zero.result.current.canUndo).toBe(true)
  })

  it('an ignored set does not clear the redo stack', () => {
    const { result } = setup(0)
    setEach(result, [1, 2])
    undo(result)
    expect(result.current.state).toBe(1)

    setEach(result, [1]) // same as the current state: ignored
    expect(result.current.canRedo).toBe(true)
    expect(result.current.history.future).toEqual([2])

    // An updater that returns the current state is ignored in the same way.
    act(() => {
      result.current.set((n) => n)
    })
    expect(result.current.canRedo).toBe(true)
    expect(result.current.history).toEqual({ past: [0], future: [2] })

    redo(result)
    expect(result.current.state).toBe(2)
  })

  it('compares each set call with the result of the call before it, not with an older render', () => {
    const { result } = setup(0)
    act(() => {
      result.current.set(1)
      result.current.set(0) // different from 1, even though it equals the state of the last render
    })
    expect(result.current.state).toBe(0)
    expect(result.current.history.past).toEqual([0, 1])

    act(() => {
      result.current.set(5)
      result.current.set(5) // the same as the call before it: ignored
    })
    expect(result.current.state).toBe(5)
    expect(result.current.history.past).toEqual([0, 1, 0])
  })
})

describe('26 useHistory: undo and redo', () => {
  it('undo walks back and redo walks forward through the states', () => {
    const { result } = setup('a')
    setEach(result, ['b', 'c', 'd'])
    expect(result.current.state).toBe('d')
    expect(result.current.history.past).toEqual(['a', 'b', 'c'])

    undo(result)
    expect(result.current.state).toBe('c')
    expect(result.current.history).toEqual({ past: ['a', 'b'], future: ['d'] })
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(true)

    undo(result)
    undo(result)
    expect(result.current.state).toBe('a')
    expect(result.current.history).toEqual({ past: [], future: ['b', 'c', 'd'] })
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)

    redo(result)
    expect(result.current.state).toBe('b')
    expect(result.current.history).toEqual({ past: ['a'], future: ['c', 'd'] })

    redo(result)
    redo(result)
    expect(result.current.state).toBe('d')
    expect(result.current.history).toEqual({ past: ['a', 'b', 'c'], future: [] })
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('undo does nothing when there is nothing to undo', () => {
    const { result } = setup(0)
    setEach(result, [1])
    undo(result)
    expect(result.current.state).toBe(0)

    undo(result)
    undo(result)
    expect(result.current.state).toBe(0)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.history).toEqual({ past: [], future: [1] })
  })

  it('redo does nothing when there is nothing to redo', () => {
    const { result } = setup(0)
    setEach(result, [1, 2])
    redo(result)
    redo(result)
    expect(result.current.state).toBe(2)
    expect(result.current.canRedo).toBe(false)
    expect(result.current.history).toEqual({ past: [0, 1], future: [] })
  })

  it('a real change after undo clears the redo stack', () => {
    const { result } = setup(0)
    setEach(result, [1, 2, 3])
    undo(result)
    undo(result)
    expect(result.current.history.future).toEqual([2, 3])

    setEach(result, [9])
    expect(result.current.state).toBe(9)
    expect(result.current.canRedo).toBe(false)
    expect(result.current.history).toEqual({ past: [0, 1], future: [] })

    redo(result)
    expect(result.current.state).toBe(9)
    undo(result)
    expect(result.current.state).toBe(1)
  })

  it('undo and redo can be called several times in the same event', () => {
    const { result } = setup(0)
    setEach(result, [1, 2, 3])

    act(() => {
      result.current.undo()
      result.current.undo()
    })
    expect(result.current.state).toBe(1)
    expect(result.current.history.future).toEqual([2, 3])

    act(() => {
      result.current.redo()
      result.current.redo()
    })
    expect(result.current.state).toBe(3)

    act(() => {
      result.current.set(4)
      result.current.undo()
    })
    expect(result.current.state).toBe(3)
    expect(result.current.history.future).toEqual([4])
  })

  it('every call in the same event works on the result of the call before it, even from a fresh start', () => {
    const { result } = setup('a')
    act(() => {
      result.current.set('b')
      result.current.undo() // there was nothing to undo in the last render, but there is now
    })
    expect(result.current.state).toBe('a')
    expect(result.current.history).toEqual({ past: [], future: ['b'] })

    act(() => {
      result.current.redo()
      result.current.undo()
      result.current.redo()
    })
    expect(result.current.state).toBe('b')
    expect(result.current.history).toEqual({ past: ['a'], future: [] })

    act(() => {
      result.current.set('c')
      result.current.reset()
    })
    expect(result.current.state).toBe('a')
    expect(result.current.history).toEqual({ past: [], future: [] })
  })
})

describe('26 useHistory: limit', () => {
  it('keeps 100 past states by default and drops the oldest', () => {
    const { result } = renderHook(() => useHistory(0))
    act(() => {
      for (let i = 1; i <= 150; i += 1) result.current.set(i)
    })
    const { past } = result.current.history
    expect(result.current.state).toBe(150)
    expect(past).toHaveLength(100)
    expect(past[0]).toBe(50)
    expect(past[99]).toBe(149)
  })

  it('works when the options object is empty', () => {
    const { result } = setup(0, {})
    setEach(result, [1, 2])
    expect(result.current.history.past).toEqual([0, 1])
  })

  const zeroToNine = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  it.each([
    [0, []],
    [1, [9]],
    [3, [7, 8, 9]],
    [10, zeroToNine],
    [20, zeroToNine],
  ])('with limit %i it keeps only the newest past states', (limit, expectedPast) => {
    const { result } = setup(0, { limit })
    setEach(result, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(result.current.state).toBe(10)
    expect(result.current.history.past).toEqual(expectedPast)
    expect(result.current.canUndo).toBe(expectedPast.length > 0)
  })

  it('can only undo as far as the limit allows', () => {
    const { result } = setup(0, { limit: 3 })
    setEach(result, [1, 2, 3, 4, 5])
    for (let i = 0; i < 6; i += 1) undo(result)
    expect(result.current.state).toBe(2)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.history.future).toEqual([3, 4, 5])
  })

  it('keeps undo and redo correct right at the limit', () => {
    const { result } = setup(0, { limit: 2 })
    setEach(result, [1, 2, 3])
    expect(result.current.history.past).toEqual([1, 2])

    undo(result)
    redo(result)
    expect(result.current.state).toBe(3)
    expect(result.current.history.past).toEqual([1, 2])

    setEach(result, [4])
    expect(result.current.history.past).toEqual([2, 3])

    undo(result)
    setEach(result, [10])
    expect(result.current.history).toEqual({ past: [2, 3], future: [] })
  })

  it('limit 0 means no history at all', () => {
    const { result } = setup('a', { limit: 0 })
    setEach(result, ['b', 'c'])
    expect(result.current.state).toBe('c')
    expect(result.current.canUndo).toBe(false)
    undo(result)
    expect(result.current.state).toBe('c')
  })
})

describe('26 useHistory: reset', () => {
  it('reset() goes back to the initial value and clears the whole history', () => {
    const { result } = setup('start')
    setEach(result, ['a', 'b'])
    undo(result)
    expect(result.current.history.future).toEqual(['b'])

    act(() => {
      result.current.reset()
    })
    expect(result.current.state).toBe('start')
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
    expect(result.current.history).toEqual({ past: [], future: [] })

    // reset(undefined) is the same as reset()
    setEach(result, ['again'])
    act(() => {
      result.current.reset(undefined)
    })
    expect(result.current.state).toBe('start')
  })

  it('reset(value) makes that value the state and clears the history', () => {
    const { result } = setup('start')
    setEach(result, ['a', 'b'])
    act(() => {
      result.current.reset('fresh')
    })
    expect(result.current.state).toBe('fresh')
    expect(result.current.history).toEqual({ past: [], future: [] })

    setEach(result, ['next'])
    undo(result)
    expect(result.current.state).toBe('fresh')
    expect(result.current.canUndo).toBe(false)
  })

  it('reset(value) accepts falsy values: 0, an empty string, false and null are real values', () => {
    const { result } = setup('start')
    for (const value of [0, '', false, null]) {
      act(() => {
        result.current.reset(value)
      })
      expect(result.current.state).toBe(value)
      expect(result.current.canUndo).toBe(false)
    }
  })

  it('reset() always goes to the ORIGINAL initial value, even after reset(value)', () => {
    const { result } = setup('start')
    act(() => {
      result.current.reset('fresh')
    })
    expect(result.current.state).toBe('fresh')
    act(() => {
      result.current.reset()
    })
    expect(result.current.state).toBe('start')
  })
})

describe('26 useHistory: hook contract', () => {
  it('ignores a different initialValue on later renders (like useState)', () => {
    const { result, rerender } = renderHook(({ initial }) => useHistory(initial), {
      initialProps: { initial: 'first' },
    })
    rerender({ initial: 'second' })
    expect(result.current.state).toBe('first')

    setEach(result, ['x'])
    act(() => {
      result.current.reset()
    })
    expect(result.current.state).toBe('first')
  })

  it('returns set, undo, redo and reset with the same identity on every render', () => {
    const { result, rerender } = setup(0)
    const first = {
      set: result.current.set,
      undo: result.current.undo,
      redo: result.current.redo,
      reset: result.current.reset,
    }

    setEach(result, [1, 2])
    undo(result)
    rerender()

    expect(result.current.state).toBe(1)
    expect(result.current.set).toBe(first.set)
    expect(result.current.undo).toBe(first.undo)
    expect(result.current.redo).toBe(first.redo)
    expect(result.current.reset).toBe(first.reset)
  })

  it('keeps the identities and the original initial value when the caller passes a new object on every render', () => {
    const { result, rerender } = renderHook(() => useHistory({ n: 0 }))
    const first = result.current

    rerender()
    rerender()
    expect(result.current.set).toBe(first.set)
    expect(result.current.undo).toBe(first.undo)
    expect(result.current.redo).toBe(first.redo)
    expect(result.current.reset).toBe(first.reset)

    setEach(result, [{ n: 1 }])
    rerender()
    act(() => {
      result.current.reset()
    })
    expect(result.current.state).toBe(first.state) // the very first object
  })

  it('works in StrictMode, where reducers and updaters run twice', () => {
    const { result } = renderHook(() => useHistory(0), { wrapper: StrictMode })
    act(() => {
      result.current.set((n) => n + 1)
      result.current.set((n) => n + 1)
    })
    expect(result.current.state).toBe(2)
    expect(result.current.history.past).toEqual([0, 1])

    undo(result)
    expect(result.current.state).toBe(1)
    expect(result.current.history).toEqual({ past: [0], future: [2] })

    redo(result)
    expect(result.current.state).toBe(2)
    expect(result.current.history).toEqual({ past: [0, 1], future: [] })
  })
})
