import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App.jsx'
import * as toastModule from './ToastContext.jsx'
import { ToastProvider, useToast } from './ToastContext.jsx'

// All timing in these tests uses fake timers: nothing waits for real time.
// vi.useFakeTimers() replaces setTimeout and clearTimeout, so a toast only
// disappears when the test moves the clock forward.

// Taken before any import runs, so even a global created while ToastContext.jsx
// loads is noticed. (A test cannot do this: earlier tests may have created it.)
const globalsAtStart = vi.hoisted(() => new Set(Object.getOwnPropertyNames(globalThis)))

const INFO = 'Here is some information'
const SUCCESS = 'Saved successfully'
const ERROR = 'Something went wrong'
const STICKY = 'I stay until you close me'

const ONE_HOUR = 60 * 60 * 1000

// Move the fake clock forward. Timers fire inside act(), so React can apply
// the state updates they cause.
function advance(ms) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

// ---- Reading the screen -------------------------------------------------

const getRegion = () => screen.queryByRole('region', { name: 'Notifications' })

// Every toast inside the Notifications region, oldest first (document order).
function getToasts() {
  const region = getRegion()
  return region ? within(region).queryAllByTestId('toast') : []
}

// The text of a toast without the text of its buttons (so without "Close").
function messageOf(toast) {
  const copy = toast.cloneNode(true)
  copy.querySelectorAll('button').forEach((button) => button.remove())
  return copy.textContent.trim()
}

const messages = () => getToasts().map(messageOf)

const findToast = (message) => getToasts().find((toast) => messageOf(toast) === message)

const closeToast = (toast) => fireEvent.click(within(toast).getByRole('button', { name: 'Close' }))

const click = (name) => fireEvent.click(screen.getByRole('button', { name }))

// ---- A tiny harness that gives the tests direct access to the hook ------

// Renders <ToastProvider> around a component that stores what useToast()
// returns. show() and dismiss() call it inside act() and return its result.
function renderApi({ strict = false } = {}) {
  const api = { current: null }
  function Capture() {
    api.current = useToast()
    return null
  }
  const wrap = (node) => (strict ? <StrictMode>{node}</StrictMode> : node)
  const tree = () => wrap(
    <ToastProvider>
      <Capture />
    </ToastProvider>,
  )
  const utils = render(tree())
  return {
    ...utils,
    api,
    rerenderTree: () => utils.rerender(tree()),
    show(message, options) {
      let id
      act(() => {
        id = api.current.show(message, options)
      })
      return id
    },
    dismiss(id) {
      act(() => {
        api.current.dismiss(id)
      })
    },
  }
}

// ---- Global test setup --------------------------------------------------

let errorSpy

beforeEach(() => {
  vi.useFakeTimers()
  // React reports problems (missing keys, act warnings, ...) with console.error.
  // We silence the output here and assert in afterEach that nothing was reported.
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  // Unmount while the fake timers are still installed, then use real ones again.
  cleanup()
  vi.useRealTimers()
  const reported = [...errorSpy.mock.calls]
  errorSpy.mockRestore()
  expect(reported).toEqual([])
})

describe('31 Toast system', () => {
  describe('the provider and the hook', () => {
    it('exports exactly ToastProvider and useToast', () => {
      expect(Object.keys(toastModule).sort()).toEqual(['ToastProvider', 'useToast'])
    })

    it('useToast returns exactly two functions: show and dismiss', () => {
      const { api, show } = renderApi()
      expect(Object.keys(api.current).sort()).toEqual(['dismiss', 'show'])
      expect(typeof api.current.show).toBe('function')
      expect(typeof api.current.dismiss).toBe('function')
      show('Hello')
      expect(messages()).toEqual(['Hello'])
    })

    it('useToast throws a clear error when there is no ToastProvider', () => {
      function Orphan() {
        useToast()
        return null
      }
      expect(() => render(<Orphan />)).toThrow(/ToastProvider/)
      // React logs the error it could not recover from. That is expected here.
      errorSpy.mockClear()
    })

    it('ToastProvider renders its children next to an empty Notifications region', () => {
      render(
        <ToastProvider>
          <p>Page content</p>
        </ToastProvider>,
      )
      expect(screen.getByText('Page content')).toBeInTheDocument()
      expect(getRegion()).not.toBeNull()
      expect(getToasts()).toHaveLength(0)
    })

    it('does not add anything to the global object', () => {
      const { show, dismiss } = renderApi()
      const id = show('Global check', { duration: 1000 })
      show('Another one')
      expect(messages()).toEqual(['Global check', 'Another one'])
      advance(1000)
      dismiss(id)
      cleanup()
      // Testing Library itself switches on this flag in beforeAll.
      const added = Object.getOwnPropertyNames(globalThis).filter(
        (name) => !globalsAtStart.has(name) && name !== 'IS_REACT_ACT_ENVIRONMENT',
      )
      expect(added).toEqual([])
    })
  })

  describe('show() and ids', () => {
    it('returns an id and shows the message as plain text', () => {
      const { show } = renderApi()
      const id = show('<b>Not bold</b>')
      expect(['string', 'number']).toContain(typeof id)
      expect(messages()).toEqual(['<b>Not bold</b>'])
      expect(getRegion().querySelector('b')).toBeNull()
    })

    it('gives every toast its own id and never reuses one', () => {
      const { show, dismiss } = renderApi()
      const a = show('A')
      const b = show('B')
      dismiss(a)
      const c = show('C')
      const d = show('D')
      expect(messages()).toEqual(['B', 'C', 'D'])
      expect(new Set([a, b, c, d]).size).toBe(4)

      // The id must point at exactly the right toast.
      dismiss(c)
      expect(messages()).toEqual(['B', 'D'])
    })

    it('does not reuse the id of the newest toast after it was closed or timed out', () => {
      const { show, dismiss } = renderApi()
      const a = show('A')
      const b = show('B')
      dismiss(b)
      const c = show('C')
      const d = show('D', { duration: 1000 })
      advance(1000)
      const e = show('E')
      expect(messages()).toEqual(['A', 'C', 'E'])
      expect(new Set([a, b, c, d, e]).size).toBe(5)
    })

    it('shows the same message twice as two separate toasts', () => {
      const { show, dismiss } = renderApi()
      const first = show('Saved')
      const second = show('Saved')
      expect(first).not.toBe(second)
      expect(messages()).toEqual(['Saved', 'Saved'])

      closeToast(getToasts()[0])
      expect(messages()).toEqual(['Saved'])

      dismiss(second)
      expect(messages()).toEqual([])
    })

    it('uses type "info" with role "status" when no options are given', () => {
      const { show } = renderApi()
      show('Plain')
      expect(messages()).toEqual(['Plain'])
      const [toast] = getToasts()
      expect(toast).toHaveAttribute('data-type', 'info')
      expect(toast).toHaveAttribute('role', 'status')
    })

    it.each([
      ['info', 'status'],
      ['success', 'status'],
      ['error', 'alert'],
    ])('type "%s" renders a toast with role "%s"', (type, role) => {
      const { show } = renderApi()
      show(`Message of type ${type}`, { type })
      expect(messages()).toEqual([`Message of type ${type}`])
      const region = getRegion()
      const [toast] = getToasts()
      const otherRole = role === 'alert' ? 'status' : 'alert'

      expect(toast).toHaveAttribute('data-type', type)
      expect(toast).toHaveAttribute('role', role)
      expect(within(region).getAllByRole(role)).toEqual([toast])
      expect(within(region).queryAllByRole(otherRole)).toEqual([])
    })

    it('falls back to the defaults for an empty options object and for undefined fields', () => {
      const { show } = renderApi()
      show('Empty options', {})
      show('Undefined fields', { type: undefined, duration: undefined })
      expect(getToasts().map((toast) => toast.getAttribute('data-type'))).toEqual(['info', 'info'])

      advance(2999)
      expect(messages()).toEqual(['Empty options', 'Undefined fields'])
      advance(1)
      expect(messages()).toEqual([])
    })
  })

  describe('the Notifications region (portal)', () => {
    it('is always rendered, empty at first, directly in the page and outside the app container', () => {
      const { container } = renderApi()
      const region = getRegion()
      expect(region).not.toBeNull()
      expect(region).toBeEmptyDOMElement()
      expect(region.parentElement).toBe(document.body)
      expect(container).not.toContainElement(region)
    })

    it('holds the toasts, which are therefore also outside the app container', () => {
      const { container, show } = renderApi()
      show('Portal check')
      const toast = findToast('Portal check')
      expect(toast).toBeDefined()
      expect(getRegion()).toContainElement(toast)
      expect(container).not.toContainElement(toast)
      expect(document.body).toContainElement(toast)
    })

    it('is removed together with the provider', () => {
      const { show, unmount } = renderApi()
      show('Soon gone')
      expect(getRegion()).not.toBeNull()
      unmount()
      expect(getRegion()).toBeNull()
      expect(document.body.querySelector('[data-testid="toast"]')).toBeNull()
    })
  })

  describe('the stack (order and maximum of 3)', () => {
    it('lists toasts in the order they were created: oldest first, newest last', () => {
      const { show } = renderApi()
      show('First')
      show('Second')
      expect(messages()).toEqual(['First', 'Second'])
      show('Third')
      expect(messages()).toEqual(['First', 'Second', 'Third'])
    })

    it('drops the oldest toast when a 4th arrives, and again for a 5th', () => {
      const { show } = renderApi()
      show('One')
      show('Two')
      show('Three')
      expect(messages()).toEqual(['One', 'Two', 'Three'])

      show('Four')
      expect(messages()).toEqual(['Two', 'Three', 'Four'])

      show('Five')
      expect(messages()).toEqual(['Three', 'Four', 'Five'])
    })

    it('keeps the three newest when several toasts are shown in the same event', () => {
      const { api } = renderApi()
      act(() => {
        api.current.show('A')
        api.current.show('B')
        api.current.show('C')
        api.current.show('D')
        api.current.show('E')
      })
      expect(messages()).toEqual(['C', 'D', 'E'])
    })

    it('drops the oldest even when it is sticky', () => {
      const { show } = renderApi()
      show('Sticky one', { duration: 0 })
      show('B')
      show('C')
      show('D')
      expect(messages()).toEqual(['B', 'C', 'D'])

      advance(ONE_HOUR)
      expect(messages()).toEqual([])
    })

    it('does not drop anything while there is a free slot', () => {
      const { show, dismiss } = renderApi()
      show('A')
      const b = show('B')
      show('C')
      dismiss(b)
      show('D')
      expect(messages()).toEqual(['A', 'C', 'D'])
    })

    it('drops the oldest toast by creation order, whatever the durations are', () => {
      const { show } = renderApi()
      show('Long', { duration: 9000 })
      show('Short', { duration: 1000 })
      show('Medium', { duration: 2000 })
      show('New', { duration: 3000 })
      expect(messages()).toEqual(['Short', 'Medium', 'New'])
    })

    it('keeps the same DOM element for a toast while other toasts come and go (stable keys)', () => {
      const { show, dismiss } = renderApi()
      const a = show('A')
      show('B')
      const toastB = findToast('B')

      dismiss(a)
      expect(messages()).toEqual(['B'])
      expect(findToast('B')).toBe(toastB)

      show('C')
      expect(findToast('B')).toBe(toastB)
    })
  })

  describe('closing toasts', () => {
    it('each toast has a Close button, and it removes only its own toast', () => {
      const { show } = renderApi()
      show('A')
      show('B')
      show('C')
      expect(messages()).toEqual(['A', 'B', 'C'])
      expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(3)

      closeToast(findToast('B'))
      expect(messages()).toEqual(['A', 'C'])
      closeToast(findToast('A'))
      expect(messages()).toEqual(['C'])
      closeToast(findToast('C'))
      expect(messages()).toEqual([])
    })

    it('the Close button is also there on success and error toasts', () => {
      const { show } = renderApi()
      show('Good', { type: 'success' })
      show('Bad', { type: 'error' })
      expect(messages()).toEqual(['Good', 'Bad'])
      expect(within(findToast('Good')).getByRole('button', { name: 'Close' })).toBeInTheDocument()
      expect(within(findToast('Bad')).getByRole('button', { name: 'Close' })).toBeInTheDocument()
    })

    it('dismiss(id) removes only the toast with that id and keeps the order of the others', () => {
      const { show, dismiss } = renderApi()
      show('A')
      const b = show('B')
      show('C')
      dismiss(b)
      expect(messages()).toEqual(['A', 'C'])
    })

    it('dismiss does nothing for an unknown id or for an id that is already gone', () => {
      const { show, dismiss } = renderApi()
      const a = show('A')
      show('B')

      dismiss('no-such-id')
      dismiss(987654)
      dismiss(undefined)
      expect(messages()).toEqual(['A', 'B'])

      dismiss(a)
      dismiss(a)
      expect(messages()).toEqual(['B'])
    })

    it('several dismiss calls in the same event all take effect, also right after show', () => {
      const { api } = renderApi()
      act(() => {
        const a = api.current.show('A')
        const b = api.current.show('B')
        api.current.show('C')
        api.current.dismiss(a)
        api.current.dismiss(b)
        const flash = api.current.show('Flash')
        api.current.dismiss(flash)
      })
      expect(messages()).toEqual(['C'])

      advance(3000)
      expect(messages()).toEqual([])
      expect(vi.getTimerCount()).toBe(0)
    })

    it('dismiss does nothing for the id of a toast that was dropped from a full stack', () => {
      const { show, dismiss } = renderApi()
      const a = show('A')
      show('B')
      show('C')
      show('D')
      expect(messages()).toEqual(['B', 'C', 'D'])
      dismiss(a)
      expect(messages()).toEqual(['B', 'C', 'D'])
    })
  })

  describe('auto-dismiss timers', () => {
    it('a toast disappears after 3000 ms by default', () => {
      const { show } = renderApi()
      show('Default timing')
      advance(2999)
      expect(messages()).toEqual(['Default timing'])
      advance(1)
      expect(messages()).toEqual([])
    })

    it('uses a custom duration', () => {
      const { show } = renderApi()
      show('Quick', { duration: 500 })
      advance(499)
      expect(messages()).toEqual(['Quick'])
      advance(1)
      expect(messages()).toEqual([])
    })

    it('every toast uses its own duration', () => {
      const { show } = renderApi()
      show('Short', { duration: 1000 })
      show('Medium', { duration: 2000 })
      show('Long', { duration: 5000 })

      advance(999)
      expect(messages()).toEqual(['Short', 'Medium', 'Long'])
      advance(1)
      expect(messages()).toEqual(['Medium', 'Long'])
      advance(1000)
      expect(messages()).toEqual(['Long'])
      advance(2999)
      expect(messages()).toEqual(['Long'])
      advance(1)
      expect(messages()).toEqual([])
    })

    it('duration 0 makes a sticky toast that stays until it is closed', () => {
      const { show } = renderApi()
      show('Sticky', { duration: 0 })
      advance(ONE_HOUR)
      expect(messages()).toEqual(['Sticky'])

      closeToast(findToast('Sticky'))
      expect(messages()).toEqual([])
    })

    it('a sticky toast does not stop other toasts from timing out', () => {
      const { show } = renderApi()
      show('Sticky', { duration: 0 })
      show('Timed', { duration: 1000 })
      advance(1000)
      expect(messages()).toEqual(['Sticky'])
    })

    it('does not restart the timer of a toast when another toast arrives', () => {
      const { show } = renderApi()
      show('A', { duration: 3000 })
      advance(2000)
      show('B', { duration: 3000 })

      advance(999)
      expect(messages()).toEqual(['A', 'B'])
      advance(1)
      expect(messages()).toEqual(['B'])

      advance(1999)
      expect(messages()).toEqual(['B'])
      advance(1)
      expect(messages()).toEqual([])
    })

    it('removes several toasts that run out at the same moment', () => {
      const { show } = renderApi()
      show('A', { duration: 1000 })
      show('B', { duration: 1000 })
      show('C', { duration: 1000 })
      advance(999)
      expect(messages()).toEqual(['A', 'B', 'C'])
      advance(1)
      expect(messages()).toEqual([])
    })

    it('does not restart the timers of the other toasts when the oldest toast is closed', () => {
      const { show } = renderApi()
      show('A', { duration: 0 })
      show('B', { duration: 3000 })
      show('C', { duration: 3000 })
      advance(1000)
      expect(messages()).toEqual(['A', 'B', 'C'])

      // B and C move up one place in the list.
      closeToast(findToast('A'))
      expect(messages()).toEqual(['B', 'C'])
      advance(1999)
      expect(messages()).toEqual(['B', 'C'])
      advance(1)
      expect(messages()).toEqual([])
    })

    it('does not restart the timers of the other toasts when the oldest toast is dropped', () => {
      const { show } = renderApi()
      show('A', { duration: 0 })
      show('B', { duration: 3000 })
      show('C', { duration: 3000 })
      advance(1000)

      // A is dropped, B and C move up one place in the list.
      show('D', { duration: 3000 })
      expect(messages()).toEqual(['B', 'C', 'D'])
      advance(1999)
      expect(messages()).toEqual(['B', 'C', 'D'])
      advance(1)
      expect(messages()).toEqual(['D'])
      advance(1000)
      expect(messages()).toEqual([])
    })

    it('does not restart the timers of the other toasts when a toast is closed', () => {
      const { show, dismiss } = renderApi()
      show('A', { duration: 3000 })
      show('B', { duration: 3000 })
      advance(1000)

      const extra = show('Extra', { duration: 0 })
      dismiss(extra)
      expect(messages()).toEqual(['A', 'B'])

      advance(1999)
      expect(messages()).toEqual(['A', 'B'])
      advance(1)
      expect(messages()).toEqual([])
    })
  })

  describe('cleanup', () => {
    it('starts no timers just by rendering the provider', () => {
      renderApi()
      expect(vi.getTimerCount()).toBe(0)
    })

    it.each([
      ['the Close button', () => closeToast(findToast('Timed'))],
      ['dismiss(id)', (id, harness) => harness.dismiss(id)],
    ])('closing a toast with %s clears its timer', (_label, close) => {
      const harness = renderApi()
      const id = harness.show('Timed', { duration: 5000 })
      expect(messages()).toEqual(['Timed'])

      close(id, harness)
      expect(messages()).toEqual([])
      expect(vi.getTimerCount()).toBe(0)
    })

    it('clears the timer of a toast that was dropped from a full stack', () => {
      const { show, dismiss } = renderApi()
      const ids = ['A', 'B', 'C', 'D'].map((message) => show(message, { duration: 5000 }))
      expect(messages()).toEqual(['B', 'C', 'D'])

      // Remove everything that is still visible. If the dropped toast "A"
      // still had a running timer, it would show up here.
      ids.slice(1).forEach((id) => dismiss(id))
      expect(messages()).toEqual([])
      expect(vi.getTimerCount()).toBe(0)
    })

    it('leaves no timer behind after toasts time out', () => {
      const { show } = renderApi()
      show('A', { duration: 1000 })
      show('B', { duration: 2000 })
      expect(messages()).toEqual(['A', 'B'])
      advance(2000)
      expect(messages()).toEqual([])
      expect(vi.getTimerCount()).toBe(0)
    })

    it('clears every timer when the provider unmounts', () => {
      const { show, unmount } = renderApi()
      show('A', { duration: 1000 })
      show('B', { duration: 5000 })
      show('C', { duration: 0 })
      expect(messages()).toEqual(['A', 'B', 'C'])

      unmount()
      expect(vi.getTimerCount()).toBe(0)
      // Letting the clock run must be harmless (and silent: see afterEach).
      advance(ONE_HOUR)
      expect(getRegion()).toBeNull()
    })
  })

  describe('a stable API', () => {
    it('show and dismiss keep their identity while toasts change and the tree re-renders', () => {
      const { api, show, dismiss, rerenderTree } = renderApi()
      const { show: showBefore, dismiss: dismissBefore } = api.current

      const id = show('A', { duration: 1000 })
      show('B')
      expect(messages()).toEqual(['A', 'B'])
      rerenderTree()
      dismiss(id)
      advance(3000)
      expect(messages()).toEqual([])

      expect(api.current.show).toBe(showBefore)
      expect(api.current.dismiss).toBe(dismissBefore)
    })

    it('a component that only calls useToast does not re-render when toasts come and go', () => {
      let renders = 0
      const handle = { api: null }
      function Consumer() {
        renders += 1
        handle.api = useToast()
        return <p>I only use the API</p>
      }
      render(
        <ToastProvider>
          <Consumer />
        </ToastProvider>,
      )
      const rendersAfterMount = renders

      let firstId
      act(() => {
        firstId = handle.api.show('One', { duration: 1000 })
      })
      act(() => {
        handle.api.show('Two')
      })
      expect(messages()).toEqual(['One', 'Two'])

      act(() => {
        handle.api.dismiss(firstId)
      })
      advance(3000)
      expect(messages()).toEqual([])
      expect(renders).toBe(rendersAfterMount)
    })
  })

  describe('React StrictMode', () => {
    it('adds one toast per call, returns a working id, and times out normally', () => {
      const { show, dismiss } = renderApi({ strict: true })

      const id = show('Strict one')
      expect(messages()).toEqual(['Strict one'])
      dismiss(id)
      expect(messages()).toEqual([])

      show('Strict two', { duration: 2000 })
      expect(messages()).toEqual(['Strict two'])
      advance(1999)
      expect(messages()).toEqual(['Strict two'])
      advance(1)
      expect(messages()).toEqual([])
      expect(vi.getTimerCount()).toBe(0)
    })
  })

  describe('the demo App', () => {
    it('renders the four buttons and an empty Notifications region', () => {
      render(<App />)
      for (const name of ['Show info', 'Show success', 'Show error', 'Show sticky']) {
        expect(screen.getByRole('button', { name })).toBeInTheDocument()
      }
      expect(getRegion()).not.toBeNull()
      expect(getToasts()).toHaveLength(0)
    })

    it.each([
      ['Show info', INFO, 'info', 'status'],
      ['Show success', SUCCESS, 'success', 'status'],
      ['Show error', ERROR, 'error', 'alert'],
    ])('"%s" shows the toast "%s" (type %s, role %s)', (button, message, type, role) => {
      render(<App />)
      click(button)
      expect(messages()).toEqual([message])
      const [toast] = getToasts()
      expect(toast).toHaveAttribute('data-type', type)
      expect(toast).toHaveAttribute('role', role)
      expect(screen.getByRole(role)).toBe(toast)
    })

    it('the toasts of the App disappear after 3 seconds', () => {
      render(<App />)
      click('Show success')
      advance(2999)
      expect(messages()).toEqual([SUCCESS])
      advance(1)
      expect(messages()).toEqual([])
    })

    it('"Show sticky" shows a toast that stays until it is closed', () => {
      render(<App />)
      click('Show sticky')
      expect(messages()).toEqual([STICKY])
      expect(getToasts()[0]).toHaveAttribute('data-type', 'info')
      expect(getToasts()[0]).toHaveAttribute('role', 'status')
      advance(ONE_HOUR)
      expect(messages()).toEqual([STICKY])

      closeToast(findToast(STICKY))
      expect(messages()).toEqual([])
    })

    it('keeps at most three toasts when the buttons are clicked many times', () => {
      render(<App />)
      click('Show info')
      click('Show success')
      click('Show error')
      expect(messages()).toEqual([INFO, SUCCESS, ERROR])

      click('Show info')
      expect(messages()).toEqual([SUCCESS, ERROR, INFO])

      closeToast(findToast(ERROR))
      expect(messages()).toEqual([SUCCESS, INFO])
    })

    it('works inside StrictMode', () => {
      render(
        <StrictMode>
          <App />
        </StrictMode>,
      )
      click('Show error')
      expect(messages()).toEqual([ERROR])
      advance(3000)
      expect(messages()).toEqual([])
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
