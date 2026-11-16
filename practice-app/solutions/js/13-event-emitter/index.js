// Reference solution for exercise 13: EventEmitter.
//
// Key ideas:
// - A Map stores, for each event name, an array of "registrations" in the
//   order they were added. The Map accepts any value as a key (strings,
//   symbols), and the array keeps the registration order for free.
// - A registration is a small object, not just the function. That is what lets
//   the SAME function be added twice, and lets each unsubscribe function remove
//   only the registration it created.
// - emit() loops over a COPY (a snapshot) of the array. Listeners are allowed
//   to add or remove listeners while emit runs; because we loop over the copy,
//   nobody gets skipped and nothing runs twice by accident.
// - A once registration is removed BEFORE its function is called, and it has a
//   `done` flag. Together they make "at most once" true even when a listener
//   calls emit again for the same event (a nested emit).
// - Errors: we catch each listener error, remember only the first one, keep
//   going, and rethrow at the end. A flag (not "if (firstError)") is used,
//   because a thrown value can be falsy.
// - Empty arrays are deleted from the Map, so event names we no longer need do
//   not stay in memory.

export class EventEmitter {
  /** @type {Map<unknown, Array<{ listener: Function, once: boolean, done: boolean }>>} */
  #registrations = new Map()

  /**
   * Adds a listener. Returns a function that removes this registration.
   */
  on(event, listener) {
    return this.#add(event, listener, false)
  }

  /**
   * Adds a listener that runs at most one time. Returns an unsubscribe function.
   */
  once(event, listener) {
    return this.#add(event, listener, true)
  }

  /**
   * Removes ONE registration of `listener` (the most recently added one).
   * Works for listeners added with `on` and with `once`.
   */
  off(event, listener) {
    const list = this.#registrations.get(event)
    if (!list) return this

    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].listener === listener) {
        this.#remove(event, list[i])
        break
      }
    }
    return this
  }

  /**
   * Calls every listener of `event` with `args`, in registration order.
   * Returns true if there was at least one listener, false otherwise.
   * If listeners throw, all of them still run, then the first error is rethrown.
   */
  emit(event, ...args) {
    // Snapshot: changes made by listeners during this emit only affect the next one.
    const snapshot = [...(this.#registrations.get(event) ?? [])]
    if (snapshot.length === 0) return false

    let failed = false
    let firstError

    for (const registration of snapshot) {
      if (registration.once) {
        // Skip it if a nested emit already ran it.
        if (registration.done) continue
        registration.done = true
        this.#remove(event, registration)
      }

      try {
        registration.listener(...args)
      } catch (error) {
        if (!failed) {
          failed = true
          firstError = error
        }
      }
    }

    if (failed) throw firstError
    return true
  }

  /** How many registrations (on and once) the event has right now. */
  listenerCount(event) {
    return this.#registrations.get(event)?.length ?? 0
  }

  /** Removes all listeners of one event, or of every event when called with no argument. */
  removeAllListeners(event) {
    if (event === undefined) {
      this.#registrations.clear()
    } else {
      this.#registrations.delete(event)
    }
    return this
  }

  // ---- private helpers ----

  #add(event, listener, once) {
    if (typeof listener !== 'function') {
      throw new TypeError('EventEmitter: the listener must be a function')
    }

    const registration = { listener, once, done: false }
    const list = this.#registrations.get(event)
    if (list) {
      list.push(registration)
    } else {
      this.#registrations.set(event, [registration])
    }

    // Removing a registration that is already gone does nothing,
    // so calling the unsubscribe function twice is safe.
    return () => this.#remove(event, registration)
  }

  #remove(event, registration) {
    const list = this.#registrations.get(event)
    if (!list) return

    const index = list.indexOf(registration)
    if (index === -1) return

    list.splice(index, 1)
    // Do not keep an empty array around for an event nobody listens to.
    if (list.length === 0) this.#registrations.delete(event)
  }
}
