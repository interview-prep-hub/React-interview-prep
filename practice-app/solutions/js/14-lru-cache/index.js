// Reference solution for exercise 14: LRUCache.
//
// Key ideas:
// - A JavaScript Map remembers the order in which keys were inserted. We use
//   that order as the "recency" order: the FIRST key in the Map is the least
//   recently used, the LAST key is the most recently used.
// - To mark a key as "just used" we delete it and set it again. That moves it
//   to the end. Map.delete, Map.set, Map.has and Map.get are all O(1) on
//   average, so get and put are O(1).
// - To evict, we take the first key from the Map's key iterator (O(1)) and
//   delete it. We never scan or copy the whole Map on the hot path.
// - get() asks map.has(key) first instead of checking `value === undefined`,
//   so a stored `undefined` value still counts as present.
// - has() only reads. It must not change the order.
// - Capacity 0 is a valid cache that stores nothing.

export class LRUCache {
  #capacity
  #map = new Map()

  /**
   * @param {number} capacity an integer greater than or equal to 0
   * @throws {RangeError} when capacity is not a non-negative integer
   */
  constructor(capacity) {
    // Number.isInteger is false for NaN, Infinity, strings, null and undefined.
    if (!Number.isInteger(capacity) || capacity < 0) {
      throw new RangeError('LRUCache: capacity must be an integer greater than or equal to 0')
    }
    this.#capacity = capacity
  }

  /** How many entries are stored right now. */
  get size() {
    return this.#map.size
  }

  /** Returns the value, or undefined. Marks the key as most recently used. */
  get(key) {
    if (!this.#map.has(key)) return undefined

    const value = this.#map.get(key)
    this.#map.delete(key)
    this.#map.set(key, value) // re-inserting puts it at the end (most recent)
    return value
  }

  /** Inserts or updates a value, marks the key as most recently used, evicts if needed. */
  put(key, value) {
    if (this.#capacity === 0) return

    // Delete first so that an update also moves the key to the end.
    this.#map.delete(key)
    this.#map.set(key, value)

    if (this.#map.size > this.#capacity) {
      const leastRecentlyUsed = this.#map.keys().next().value
      this.#map.delete(leastRecentlyUsed)
    }
  }

  /** True if the key is stored. Does NOT change the recency order. */
  has(key) {
    return this.#map.has(key)
  }

  /** The keys from least recently used to most recently used (a new array). */
  keys() {
    return [...this.#map.keys()]
  }
}
