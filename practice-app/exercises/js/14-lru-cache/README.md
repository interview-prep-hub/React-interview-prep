# 14 - LRU cache

**Level:** Medium | **Time:** 30 minutes | **Topics:** classes, `Map` insertion order, getters, caching and eviction, Big-O

## The task

Build an `LRUCache` class. A cache keeps recent results so that you do not have to compute or fetch them again. Memory is limited, so the cache has a fixed **capacity**. When it is full and a new entry arrives, it must throw one entry away.

"LRU" means **least recently used**: the entry that has not been used for the longest time is the one to go. An entry is "used" when it is read with `get` or written with `put`. Checking with `has` or listing with `keys` is not a use.

Work in [`index.js`](./index.js). Do not edit the test file.

## Requirements

1. `new LRUCache(capacity)` needs a capacity that is an **integer greater than or equal to 0**. Anything else throws a `RangeError`: a negative number, a fraction such as `1.5`, `NaN`, `Infinity`, a string such as `'3'`, `null`, or a missing argument.
2. `get(key)` returns the stored value, or `undefined` when the key is not stored. A successful `get` makes that key the **most recently used**. A miss changes nothing.
3. `put(key, value)` inserts a new entry or updates an existing one. In both cases the key becomes the **most recently used**. If the cache now holds more entries than its capacity, the **least recently used** entry is removed. (An update does not make the cache bigger, so it never evicts anything.)
4. `has(key)` returns `true` when the key is stored and `false` otherwise. It must **not** change the recency order.
5. `size` is a **getter** (used as `cache.size`, not `cache.size()`). It is the number of stored entries and never goes above the capacity.
6. `keys()` returns a **new array** with the keys ordered from the **least** recently used to the **most** recently used. Changing the returned array does not change the cache.
7. A capacity of `0` is valid and stores nothing: `put` is ignored, `get` returns `undefined`, `has` returns `false`, `size` is `0` and `keys()` is `[]`.
8. Values can be anything, including `undefined`, `null`, `0`, `''` and `false`. A key whose value is `undefined` still counts as stored (`has` is `true`, and `get` still refreshes it).
9. Keys are compared the way a `Map` compares them. Objects are keys by identity: two different objects that look the same are two different keys. `1` and `'1'` are different keys. `NaN` is equal to `NaN` (one key), and `0` is equal to `-0` (one key).

The return value of `put` is not checked.

## Examples

```js
const cache = new LRUCache(2)

cache.put(1, 'one')
cache.put(2, 'two')
cache.get(1)          // 'one' (1 is now the most recently used)
cache.put(3, 'three') // over capacity: evicts 2
cache.get(2)          // undefined
cache.put(4, 'four')  // over capacity: evicts 1
cache.get(1)          // undefined
cache.get(3)          // 'three'
cache.get(4)          // 'four'
```

```js
const cache = new LRUCache(2)
cache.put('a', 1)
cache.put('b', 2)

cache.has('a')  // true, but has does not count as a use
cache.keys()    // ['a', 'b']  (least recently used first)
cache.put('c', 3)
cache.keys()    // ['b', 'c']  ('a' was still the oldest, so it was evicted)
```

```js
const cache = new LRUCache(2)
cache.put('a', 1)
cache.put('b', 2)
cache.get('a')
cache.keys()      // ['b', 'a']

cache.put('b', 20) // an update also counts as a use
cache.keys()      // ['a', 'b']
cache.get('b')    // 20
cache.size        // 2
```

```js
const empty = new LRUCache(0)
empty.put('a', 1)
empty.size     // 0
empty.get('a') // undefined
empty.has('a') // false
```

```js
new LRUCache(-1)  // throws RangeError
new LRUCache(1.5) // throws RangeError
new LRUCache('3') // throws RangeError
new LRUCache()    // throws RangeError
```

## Complexity target

- `get`, `put`, `has` and `size`: **O(1)** on average.
- `keys()`: O(n), because it builds a new array.
- Extra space: O(capacity).

The tests cannot measure speed reliably, but an interviewer will ask. An array with `indexOf` and `splice` gives the right answers and is O(n), so it does not meet the target.

## Acceptance criteria (what the tests check)

- A new cache is empty. Valid capacities (`0`, `1`, `5`, `1000`) work. Invalid capacities throw a `RangeError`.
- `get` and `put` store, return and update values, including falsy values and `undefined`. Missing keys give `undefined` and change nothing. Keys follow `Map` rules (objects by identity, `1` is not `'1'`, `NaN` equals `NaN`, `0` equals `-0`).
- Eviction removes the least recently used entry. `get` and an updating `put` refresh recency. `has` does not.
- The sequence from the first example behaves exactly as shown.
- Capacity `1` and capacity `0` work. An evicted key can be added again and then counts as the newest.
- `keys()` has the right order after a mix of operations and returns a copy. `size` is a number property.
- 100,000 operations never push the size above the capacity, and 3,000 pseudo-random operations (for several capacities) match a simple reference implementation.

## How to run

```bash
npm test -- exercises/js/14-lru-cache
```

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/14-lru-cache
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. A `Map` remembers the order in which keys were inserted, and `map.keys()` walks them from the oldest to the newest. If you keep "least recently used" at the front and "most recently used" at the end, you already have the order you need.
2. To make a key the newest, delete it from the Map and set it again. Re-inserting puts it at the end.
3. The oldest key is the first one the iterator gives you: `map.keys().next().value`. That is O(1). Do not copy all keys into an array just to read the first one.
4. In `get`, ask `map.has(key)` first. If you test `map.get(key) === undefined`, a stored `undefined` value looks like a miss.
5. `Number.isInteger(x)` is `false` for `NaN`, `Infinity`, strings, `null` and `undefined`, so one check plus `x < 0` covers the whole capacity rule.
6. `has` should only read from the Map. `keys()` should return `[...map.keys()]` so the caller gets a copy.

</details>

## Stretch goals

- Write a second version that does not use the Map's insertion order: a Map from key to node, plus a **doubly linked list** of nodes. Point the test import at your new class and run the same tests.
- Add `delete(key)`, `clear()`, `peek(key)` (read without refreshing) and `[Symbol.iterator]`.
- Add an `onEvict(key, value)` callback that is called when an entry is thrown away.
- Add a time-to-live: `put(key, value, ttlMs)`, where an expired entry counts as missing. Test it with `vi.useFakeTimers()` and `vi.advanceTimersByTime(...)` so that your test does not wait for real time.
- Use it to bound the memory of your [memoize](../03-memoize/README.md) function, with a `maxSize` option.

## Interview follow-ups to prepare for

1. **A doubly linked list plus hash map version.**
   - Explain the design without using the Map's insertion order. The map goes from a key to a node. The list keeps the nodes in recency order, with the most recently used at one end and the least recently used at the other.
   - Why a **doubly** linked list? (To remove a node from the middle in O(1) you must reach its previous neighbour. An array needs O(n) to remove from the middle.)
   - Why does each node store its **key** and not only its value? (When you evict the last node you must also delete its key from the map.)
   - What do dummy "sentinel" head and tail nodes save you? (They remove the special cases for an empty list and for the ends of the list.)
2. **LRU in HTTP and data caches (React Query `gcTime`).**
   - Where do real systems use this idea? (Browser and CDN caches, CPU caches, image caches in an app, bounded memoization.)
   - TanStack Query removes the cached data of a query that no component uses any more after `gcTime` has passed (5 minutes by default in the browser). Is that LRU? Compare time-based expiry with size-based eviction. Which one protects memory? What does `staleTime` control instead (when to refetch, not when to delete)?
   - If you capped the number of cached queries, what must you never evict? (An entry that is on screen right now.)
3. **LFU versus LRU.**
   - LFU evicts the **least frequently** used entry. Give one access pattern where LRU is better (the popular items change over time) and one where LFU is better (a one-time scan over many items would flush an LRU cache but not a cache of items that are used all the time).
   - What does LFU need to store extra? (A use count per key, and a way to find the lowest count in O(1), for example buckets of keys per count.) How do you break ties? (Evict the least recently used among the lowest count.)

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md)
- [Memoization (useMemo, useCallback, React.memo)](../../../../02-hooks/07-memoization.md)
- [Data fetching and caching](../../../../03-intermediate/02-data-fetching.md)
- [Frontend system design (caching)](../../../../04-advanced/11-frontend-system-design.md)
