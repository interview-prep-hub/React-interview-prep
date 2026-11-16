# 13 - Event emitter

**Level:** Easy | **Time:** 25 minutes | **Topics:** classes, `Map`, closures, publish/subscribe (pub/sub), cleanup functions

## The task

Build an `EventEmitter` class. Other code can **subscribe** to a named event with a function (a "listener"), and later someone can **emit** that event, which calls every listener with the data.

This is the "publish/subscribe" idea (pub/sub). It is behind DOM events, Node.js streams, the `subscribe` function of state stores, and the cleanup function you return from `useEffect`.

Work in [`index.js`](./index.js). Do not edit the test file.

## Requirements

1. `new EventEmitter()` creates an emitter with no listeners. Event names can be strings (any string, even `'constructor'` or an empty string) or symbols. Two different symbols are two different events, even with the same description.
2. `on(event, listener)` adds a listener for `event` and **returns an unsubscribe function**. If `listener` is not a function, throw a `TypeError` and register nothing.
3. The unsubscribe function removes only the registration that `on` created. Calling it a second time does nothing.
4. `once(event, listener)` works like `on`, but the listener runs **at most one time** and is removed when it runs. It also returns an unsubscribe function (calling it before the event fires cancels the listener), and it throws a `TypeError` for a non-function listener. A once listener must not run twice even if a listener calls `emit` for the same event again while the first `emit` is still running (a nested emit). It is also removed if it throws.
5. `off(event, listener)` removes **one** registration of that function. If the same function was added twice, one registration stays. It also works for a function that was added with `once`. It does nothing for an unknown event or an unknown function.
6. `emit(event, ...args)` calls every listener of `event` with `args`, **in the order they were added** (`on` and `once` listeners share one order). It returns `true` if there was at least one listener when the call started, and `false` otherwise.
7. **Snapshot rule.** `emit` works on the list of listeners as it was when `emit` started:
   - A listener that unsubscribes itself (or any other listener) during `emit` must not make another listener get skipped.
   - A listener that was removed during `emit` (by `off`, by an unsubscribe function, or by `removeAllListeners`) still runs in that same `emit` (it was in the list when the call started), but not in the next one. This is also true for a `once` listener that is cancelled during `emit`.
   - A listener that was added during `emit` is not called in that same `emit`, only in the next one.
8. **Errors.** If a listener throws, the remaining listeners still run. After all of them have run, `emit` rethrows the **first** error. Whatever was thrown is rethrown unchanged, also when it is a falsy value such as `0` or `undefined`. (If two listeners throw, the second error is dropped.) This holds for `once` listeners too.
9. The same function added twice is called twice per `emit`.
10. `listenerCount(event)` returns how many registrations (`on` and `once` together) the event has right now. It is `0` for an unknown event.
11. `removeAllListeners(event)` removes every listener of that event. `removeAllListeners()` with no argument removes every listener of every event. Unsubscribe functions created before the call must not remove listeners that are added after it.

The return values of `off` and `removeAllListeners` are not checked. Returning `this` (so calls can be chained) is a nice habit.

## Examples

```js
const emitter = new EventEmitter()

const unsubscribe = emitter.on('greet', (name) => console.log(`Hello, ${name}`))
emitter.emit('greet', 'Ada') // logs "Hello, Ada", returns true
unsubscribe()
emitter.emit('greet', 'Ada') // logs nothing, returns false
```

```js
const emitter = new EventEmitter()

emitter.once('ready', () => console.log('ready!'))
emitter.listenerCount('ready') // 1
emitter.emit('ready')          // logs "ready!", returns true
emitter.emit('ready')          // logs nothing, returns false
emitter.listenerCount('ready') // 0
```

```js
const emitter = new EventEmitter()

emitter.on('x', () => console.log('first'))
emitter.on('x', () => { throw new Error('boom') })
emitter.on('x', () => console.log('third'))

emitter.emit('x')
// logs "first", then "third", and then throws Error('boom')
```

```js
const emitter = new EventEmitter()
const calls = []

const unsubscribe = emitter.on('x', () => {
  calls.push('a')
  unsubscribe() // removes itself while emit is running
})
emitter.on('x', () => calls.push('b'))

emitter.emit('x')
emitter.emit('x')
// calls is ['a', 'b', 'b']  ('b' was not skipped in the first emit)
```

```js
const emitter = new EventEmitter()
const f = () => {}

emitter.on('a', f)
emitter.on('a', f)
emitter.on('b', f)
emitter.listenerCount('a') // 2
emitter.off('a', f)
emitter.listenerCount('a') // 1
emitter.removeAllListeners()
emitter.listenerCount('b') // 0
```

## Complexity target

- `on`, `once` and `listenerCount`: O(1).
- `emit`: O(n), where n is the number of listeners of that event (you have to call each one).
- `off` and unsubscribe: O(n) is fine (you search the list for the registration).

## Acceptance criteria (what the tests check)

- Listeners receive all arguments and run in registration order. Only the emitted event's listeners run.
- `emit` returns `true` or `false` as described, also after listeners were removed.
- The same listener added twice runs twice; `off` and each unsubscribe function remove one registration only (an unsubscribe function removes exactly the registration it created, not another one of the same function).
- `once` runs one time, keeps its place in the order, can be cancelled by the returned function or by `off` with the original function, and cannot run twice in a nested `emit`.
- `listenerCount` counts `on` and `once` registrations. `removeAllListeners` works with and without an event name.
- Adding or removing listeners during `emit` follows the snapshot rule, also for `once` listeners and `removeAllListeners`.
- A throwing listener (also a `once` listener) does not stop the others, the first thrown value is rethrown even when it is falsy, and a throwing `once` listener is still removed.
- A non-function listener gives a `TypeError`. Symbols work as event names, and so do strings such as `'constructor'`, `'__proto__'` and `''`.

## How to run

```bash
npm test -- exercises/js/13-event-emitter
```

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/13-event-emitter
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Keep the listeners in a `Map`: the key is the event name, the value is an array. Do not store the bare function in the array. Store a small object per registration (for example `{ listener, once }`), so that two registrations of the same function are two different things.
2. `on` pushes a registration and returns `() => remove(registration)`. To remove, look the registration up with `indexOf` and `splice` it out. If `indexOf` gives `-1`, do nothing: that is what makes a second call harmless.
3. In `emit`, start with a copy: `const snapshot = [...list]`, and loop over the copy. Changes to the real array cannot disturb the loop.
4. For `once`: mark the registration as done and remove it **before** you call its function. In the loop, skip registrations that are already done.
5. For errors, wrap each call in `try/catch`. Remember the first error in a variable and use a separate boolean such as `failed`, because a thrown value can be falsy. Rethrow after the loop.
6. For `off(event, fn)` to work on `once` listeners, compare against the original function you stored, not against a wrapper you created.

</details>

## Stretch goals

- Add `prependListener(event, listener)` (runs before the others) and `eventNames()`.
- Warn with `console.warn` when one event has more than 10 listeners (Node.js does this to help you find leaks).
- Accept `{ signal }` as a third argument to `on`, so that aborting an `AbortSignal` unsubscribes (this is how `addEventListener` works).
- Add `waitFor(event)` that returns a promise resolved with the first emit's arguments.
- Add `emitAsync(event, ...args)` that awaits async listeners one after another.

## Interview follow-ups to prepare for

1. **Where does pub/sub appear in React (stores, context)?**
   - `useSyncExternalStore(subscribe, getSnapshot)` needs a `subscribe(callback)` function that returns an unsubscribe function. That is exactly the contract of `emitter.on`. Sketch a tiny store on top of this class (you will build one in [22 - observable store](../22-observable-store/README.md)).
   - Redux and Zustand stores expose `subscribe` as well. How is that different from Context, where React itself re-renders every consumer when the value changes? Why do stores let a component subscribe to just one slice of the state?
2. **Memory leaks from a forgotten unsubscribe.**
   - What happens to a listener that is never removed? (The emitter keeps the function alive, and the function keeps its closure alive. It also keeps running after the component is gone.)
   - Why does `useEffect(() => emitter.on('x', handler), [])` clean up correctly? Why does StrictMode run the effect, its cleanup and the effect again in development?
   - How would you detect a leak? (`listenerCount` growing over time, the Node.js warning at more than 10 listeners, a heap snapshot.)
3. **Typed events in TypeScript.**
   - How do you make `emitter.on('login', (user) => ...)` know the type of `user`, and make `emitter.emit('login', 5)` a compile error?

   ```ts
   type AppEvents = {
     login: [user: string]
     logout: []
   }

   interface TypedEmitter<E extends Record<string, unknown[]>> {
     on<K extends keyof E>(event: K, listener: (...args: E[K]) => void): () => void
     emit<K extends keyof E>(event: K, ...args: E[K]): boolean
   }
   ```

   - Why describe each event as a tuple of arguments instead of one payload object? What can TypeScript not protect you from (data that arrives from outside, such as JSON or `postMessage`)?

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md)
- [useEffect and cleanup](../../../../02-hooks/03-useeffect.md)
- [Other hooks (useSyncExternalStore)](../../../../02-hooks/09-other-hooks.md)
- [useContext](../../../../02-hooks/05-usecontext.md)
- Advanced patterns (pub/sub) (planned)
- [TypeScript with React](../../../../03-intermediate/08-typescript-with-react.md)
