// Exercise 14: LRUCache (least recently used cache).
// Read README.md in this folder for the full requirements.

/**
 * A cache with a fixed capacity. When it is full and a new key arrives,
 * the entry that was used LONGEST AGO is thrown away.
 *
 *   const cache = new LRUCache(2)
 *   cache.put('a', 1)
 *   cache.put('b', 2)
 *   cache.get('a')     // 1, and 'a' is now the most recently used
 *   cache.put('c', 3)  // over capacity: 'b' (least recently used) is evicted
 *   cache.keys()       // ['a', 'c']
 */
export class LRUCache {
  // TODO 1: decide how to store the entries. You need two things to be fast
  //         (O(1) on average): finding a key, and knowing which entry was used
  //         the longest time ago. A JavaScript Map remembers the order in which
  //         keys were inserted. Could that order be your "recency" order?
  //         Keep the capacity somewhere too.

  /**
   * @param {number} capacity an integer greater than or equal to 0
   * @throws {RangeError} when capacity is not an integer, or is negative
   */
  constructor(capacity) {
    // TODO 2: validate the capacity (negative, 1.5, NaN, Infinity, '3',
    //         null and undefined are all invalid) and store it.
  }

  /** How many entries are stored right now. This is a getter, not a method. */
  get size() {
    // TODO 3
  }

  /**
   * @returns the value for `key`, or undefined when the key is not stored.
   *          A successful get makes the key the most recently used.
   */
  get(key) {
    // TODO 4: return the value and refresh the recency of the key.
    //         Think about what happens when the stored value is `undefined`.
  }

  /**
   * Inserts or updates `key`. The key becomes the most recently used.
   * If the cache is now over capacity, evict the least recently used entry.
   */
  put(key, value) {
    // TODO 5: handle the capacity 0 case (store nothing).
    // TODO 6: insert or update the entry and refresh its recency.
    // TODO 7: evict the least recently used entry when over capacity.
  }

  /** True if `key` is stored. This must NOT change the recency order. */
  has(key) {
    // TODO 8
  }

  /** @returns {Array} the keys from least recently used to most recently used (a new array) */
  keys() {
    // TODO 9
  }
}
