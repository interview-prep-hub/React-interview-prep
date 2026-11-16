// Exercise 13: EventEmitter.
// Read README.md in this folder for the full requirements.

/**
 * A tiny publish/subscribe object.
 *
 *   const emitter = new EventEmitter()
 *   const unsubscribe = emitter.on('greet', (name) => console.log(name))
 *   emitter.emit('greet', 'Ada') // logs "Ada" and returns true
 *   unsubscribe()
 */
export class EventEmitter {
  // TODO 1: decide where the listeners live. A Map from the event name to an
  //         array of registrations keeps the order of registration for you.
  //         Think about what one "registration" must remember so that the SAME
  //         function can be added twice and removed one registration at a time.
  //         (A private field such as `#registrations = new Map()` works well.)

  /**
   * Adds `listener` for `event`.
   * @returns {() => void} a function that removes this registration
   */
  on(event, listener) {
    // TODO 2: throw a TypeError if `listener` is not a function.
    // TODO 3: store the registration and return the unsubscribe function.
    //         Calling that function a second time must do nothing.
  }

  /**
   * Like `on`, but the listener runs at most one time.
   * @returns {() => void} a function that removes this registration
   */
  once(event, listener) {
    // TODO 4: same checks as `on`. The listener must be removed BEFORE it is
    //         called, so a nested emit of the same event cannot run it twice.
  }

  /**
   * Removes ONE registration of `listener` for `event`.
   * It must also work for a listener that was added with `once`.
   */
  off(event, listener) {
    // TODO 5: find one registration whose function is `listener` and remove it.
    //         Do nothing if the event or the listener is unknown.
  }

  /**
   * Calls every listener of `event` with `args`, in registration order.
   * @returns {boolean} true if there was at least one listener, else false
   */
  emit(event, ...args) {
    // TODO 6: loop over a COPY of the registrations (a snapshot), so listeners
    //         that add or remove listeners while we loop cannot break the loop.
    // TODO 7: if a listener throws, keep calling the others. When all have run,
    //         rethrow the FIRST error that happened.
  }

  /**
   * @returns {number} how many registrations (on and once) the event has
   */
  listenerCount(event) {
    // TODO 8: return 0 for an event nobody listens to.
  }

  /**
   * Removes all listeners of `event`, or of every event when `event` is undefined.
   */
  removeAllListeners(event) {
    // TODO 9
  }
}
