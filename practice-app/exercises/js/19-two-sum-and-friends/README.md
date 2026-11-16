# 19 - Two Sum and friends

**Level:** Medium | **Time:** 45 minutes | **Topics:** `Map` (hash table), stack, sliding window, sorting, one-pass algorithms, Big-O

## The task

This is the "warm-up algorithm set" that opens many frontend coding rounds. You write eight small functions. Each one has an obvious brute-force answer that is too slow, and a short, clever answer that interviewers hope to see. Your job is to find the short answer and to explain it clearly out loud.

Work in [`index.js`](./index.js). Do not edit the test file.

Words used below:

- An **index** is the position of an item in an array. The first item has index `0`.
- A **subarray** is a run of neighbouring items of an array, with no gaps.
- A **hash table** (in JavaScript a `Map`) finds a value by its key in about one step, however many keys it holds.
- A **character** is one letter, digit, space or symbol. The tests use only plain characters (no emoji), see exercise [20 - String utils](../20-string-utils/README.md) for the Unicode traps.

## Requirements

All eight functions are named exports of `index.js`. None of them changes its input. Each one throws a `TypeError` when an argument has the wrong type, as described below.

1. **`twoSum(nums, target)`**: `nums` is an array of numbers and `target` is a number. Return `[i, j]` with `i < j` and `nums[i] + nums[j] === target`. Return `null` when no such pair exists (this includes an empty array and an array with one item). An element can never be used twice, so `twoSum([3], 6)` is `null`. If several pairs work, any one of them is accepted. Throw a `TypeError` when `nums` is not an array or `target` is not a number.
2. **`isValidParentheses(str)`**: return `true` when every `(`, `[` and `{` is closed by the matching `)`, `]` or `}` in the correct order, and `false` otherwise. `"()[]{}"` and `"{[]}"` are valid, `"([)]"`, `"(("` and `"]"` are not. The empty string is valid. All other characters are ignored, so `"a(b)c"` is valid. Throw a `TypeError` when `str` is not a string.
3. **`groupAnagrams(words)`**: `words` is an array of strings. Return an array of groups, where each group is an array of words that are anagrams of each other (same characters, same number of each). The comparison is case sensitive: `"Ab"` and `"ab"` are different. Groups come out in the order of the first word of each group, and inside a group the words keep their input order. Duplicates are kept, and empty strings share one group. `[]` gives `[]`. Throw a `TypeError` when `words` is not an array or contains something that is not a string.
4. **`maxSubarray(nums)`**: return the largest sum of a non-empty subarray of `nums`. When every number is negative the answer is the largest single number (the one closest to zero). An empty array returns `0`. Throw a `TypeError` when `nums` is not an array.
5. **`mergeIntervals(intervals)`**: each interval is `[start, end]`, two finite numbers with `start <= end`, and both ends are included. Merge every group of intervals that overlap or touch (`[1, 4]` and `[4, 5]` become `[1, 5]`). Return the merged intervals sorted by `start`. The input may be unsorted. Do not change the input, and do not put the input's inner arrays into the result (changing the result must never change the input). `[]` gives `[]`. Throw a `TypeError` when `intervals` is not an array, or when any interval is not a pair of finite numbers with `start <= end`.
6. **`firstNonRepeatingChar(str)`**: return the first character of `str` that appears exactly once in the whole string, or `null` if there is none. Case sensitive (`"a"` and `"A"` are different) and spaces count as characters. `""` returns `null`. Throw a `TypeError` when `str` is not a string.
7. **`lengthOfLongestSubstring(str)`**: return the length of the longest substring (neighbouring characters, no gaps) in which no character appears twice. Case sensitive. `""` returns `0`. Throw a `TypeError` when `str` is not a string.
8. **`isPalindromeNumber(n)`**: `n` must be a safe integer (`Number.isSafeInteger(n)`). Return `true` when its digits read the same forwards and backwards. Negative numbers are never palindromes (the minus sign has no mirror), `0` is one, and any other number ending in `0` is not (`10` would need a leading zero). **Do not convert the number to a string**: no `String(n)`, `n.toString()`, `` `${n}` ``, `"" + n`, `.split` or `.join`. A small test reads the source text of your function and looks for these, so write your error message as plain text with no `${...}` in it. Throw a `TypeError` when `n` is not a safe integer (for example `1.5`, `NaN`, `Infinity`, `"121"` or `2 ** 53`).

## Examples

```text
twoSum([3, 2, 4], 6)                    -> [1, 2]      (not [0, 0]: an element is never used twice)

groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
                                        -> [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]

maxSubarray([-3, -1, -2])               -> -1          (all negative: take the biggest single number)

mergeIntervals([[8, 10], [1, 3], [2, 6], [6, 7]])
                                        -> [[1, 7], [8, 10]]   (sorted first, and [2, 6] touches [6, 7])

lengthOfLongestSubstring("dvdf")        -> 3           ("vdf": do not restart right after the first "d")
```

## Complexity target

Let `n` be the size of the input.

- `twoSum`: O(n) time, O(n) extra space (a `Map`). The brute force with two nested loops is O(n^2).
- `isValidParentheses`: O(n) time, O(n) space (a stack).
- `groupAnagrams`: O(n * k log k) time when you sort each word (`k` is the longest word length). Counting letters instead of sorting gives O(n * k).
- `maxSubarray`: O(n) time, O(1) space.
- `mergeIntervals`: O(n log n) time (the sort), O(n) space for the result.
- `firstNonRepeatingChar`: O(n) time, O(m) space (`m` different characters).
- `lengthOfLongestSubstring`: O(n) time, O(m) space.
- `isPalindromeNumber`: O(number of digits) time, O(1) space.

The last four tests in the test file feed big inputs to `twoSum`, `maxSubarray`, `isValidParentheses` and `mergeIntervals`. A correct solution needs a few milliseconds. A nested-loop solution passes all the small tests, then fails the big ones because it takes far too long, so be patient (up to about a minute) before you decide that a run is stuck.

## Acceptance criteria (what the tests check)

- `twoSum`: a valid ascending pair for normal, negative, zero and duplicate inputs; never the same element twice; `null` for no pair, `[]` and one item; the input is not changed; `TypeError` for bad types.
- `isValidParentheses`: valid and invalid strings of all three bracket types (wrong order, extra closers, unclosed openers); `""` is valid; other characters are ignored; `TypeError` for non-strings.
- `groupAnagrams`: the classic example, group and word order, `[]`, empty strings, duplicates, "same letters but different counts" and different lengths are not grouped, case sensitivity, input unchanged, `TypeError` for bad input.
- `maxSubarray`: classic example, whole array, one element, all negatives, zeros, duplicates, restarting after a bad stretch, `[]` gives `0`, input unchanged.
- `mergeIntervals`: overlap, touching, gaps, unsorted input, contained intervals, equal starts, duplicates, single points, negatives, `[]`, input untouched and no shared inner arrays, `TypeError` for 8 kinds of bad input.
- `firstNonRepeatingChar`: classic words, all repeated gives `null`, `""` gives `null`, case sensitivity, spaces and punctuation count.
- `lengthOfLongestSubstring`: classic words, the "dvdf" and "abba" traps, empty and one-character strings, case sensitivity, spaces.
- `isPalindromeNumber`: palindromes and non-palindromes (including very large ones), negatives, trailing zeros, `TypeError` for non-integers, and a simple source-text check that you did not convert the number to a string.
- Four big-input tests for the complexity target.

## How to run

```bash
npm test -- exercises/js/19-two-sum-and-friends
```

The functions are synchronous and pure, so there are no timers and no flaky tests.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/19-two-sum-and-friends
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. **twoSum**: for each number ask "which earlier number would complete the pair?". That number is `target - nums[j]`. Keep a `Map` from value to index. Look up first, then store the current number, so an element cannot pair with itself.
2. **isValidParentheses**: use an array as a stack. Push every opener. For a closer, pop the stack and compare with the opener it needs. Popping an empty stack gives `undefined`, which never matches. At the end the stack must be empty.
3. **groupAnagrams**: two words are anagrams exactly when their sorted letters are equal, so the sorted letters make a good `Map` key. A `Map` remembers insertion order, which gives you the group order for free. A `Set` of letters is NOT a good key (it forgets how many times each letter appears).
4. **maxSubarray** (Kadane): keep two numbers, the best sum of a subarray that ends at the current item, and the best sum seen anywhere. At each item the best subarray ending here is either the item alone or the item added to the previous one. Start both numbers with `nums[0]`, not with `0`, or all-negative input breaks.
5. **mergeIntervals**: sort a COPY by start (`sort` changes the array it is called on). Then walk once. If the next interval starts at or before the end of the last kept interval, extend that end with `Math.max`. Otherwise keep the interval as a new one. Copy the inner arrays too.
6. **firstNonRepeatingChar**: loop once to count each character in a `Map`, loop again to return the first character whose count is `1`.
7. **lengthOfLongestSubstring**: keep a window `[start, end]` and a `Map` from character to the index where you last saw it. When the character at `end` was seen at an index that is inside the window, move `start` to one past that index. Check that the old index is `>= start`, otherwise "abba" fails. The window start never moves backwards.
8. **isPalindromeNumber**: `n % 10` is the last digit and `(n - lastDigit) / 10` drops it. Reverse only the second half of the digits: loop while the remaining first half is bigger than the reversed half. For an even digit count the two halves are equal, for an odd count drop the middle digit of the reversed half.

</details>

## Stretch goals

- Make `twoSum` work on a SORTED array with the two-pointer technique in O(1) extra space. Why does it need the sorted input?
- Make `maxSubarray` return `{ sum, start, end }` (the indices of the best subarray).
- Solve `groupAnagrams` with a count key (for lowercase words, 26 numbers joined into a string) instead of sorting. What is the new complexity?
- Add `threeSum(nums)` that returns every unique triple adding up to `0`. Sort first, then use two pointers.
- In a React component, group a big list with `groupAnagrams` inside `useMemo`, so the grouping is not repeated on every render (see [Memoization](../../../../02-hooks/07-memoization.md)).

## Interview follow-ups to prepare for

**1. State the time and space complexity of each function.**

<details>
<summary>Show answer</summary>

Say what `n` is first, then give both numbers for each function.

- `twoSum`: O(n) time and O(n) space. One pass, and a `Map` that may hold every number. The brute force (two nested loops) is O(n^2) time and O(1) space, so we trade memory for speed. Sorting plus two pointers is O(n log n) time, but you lose the original indices unless you also store them, which costs O(n) space again.
- `isValidParentheses`: O(n) time. The stack is O(n) space in the worst case (a string of only openers).
- `groupAnagrams`: with `n` words of length up to `k`, sorting each word costs O(k log k), so O(n * k log k) in total. A letter-count key avoids the sort and gives O(n * k). The `Map` holds all the words, so O(n * k) space.
- `maxSubarray` (Kadane): O(n) time and O(1) space. The brute force over all start and end pairs is O(n^2), and O(n^3) if you re-add the numbers every time.
- `mergeIntervals`: the sort costs O(n log n) and the merge pass O(n), so O(n log n) overall. O(n) space for the output.
- `firstNonRepeatingChar`: O(n) time. The `Map` holds each distinct character, so O(m) space, where `m` is at most the alphabet size. For a fixed alphabet that is O(1).
- `lengthOfLongestSubstring`: O(n) time because `end` moves forward once and `start` never moves back. O(min(n, m)) space for the `Map`.
- `isPalindromeNumber`: O(log10 n) time, which is the number of digits, and O(1) space.

A good habit: after the complexity, name the dominant cost ("the sort", "the map lookups") and the trade-off you made.

</details>

**2. Which of these can be solved in one pass?**

<details>
<summary>Show answer</summary>

"One pass" means you look at each input item once, going forward, and never need to go back or start a second loop over the input.

One pass: `twoSum` (check the complement, then store the number), `isValidParentheses` (push and pop as you go), `maxSubarray` (Kadane keeps two running numbers), and `lengthOfLongestSubstring` (the sliding window: `end` moves forward once, and `start` only moves forward, so each position is visited at most twice, which is still O(n)).

Not quite one pass:

- `firstNonRepeatingChar` needs to know the FINAL count of a character before it can say it is unique, so it uses two loops: count, then find. A one-loop variant stores the characters in a `Map` in order of first appearance, then scans that `Map`. That second scan is over distinct characters only, but it is still a second loop.
- `mergeIntervals` needs the intervals sorted first. After the sort, the merge itself is one pass.
- `groupAnagrams` loops over the words once, but looks at every letter of each word (to sort or to count).
- `isPalindromeNumber` looks at only half of the digits.

Interviewers ask this because "can you do it in one pass?" is usually the hint that a `Map` or a running value will replace a nested loop.

</details>

**3. How do you explain your approach out loud while you code?**

<details>
<summary>Show answer</summary>

Use the same steps every time. Here they are, with `twoSum` as the example.

1. **Restate and check.** "I get an array of numbers and a target, and I return the indices of two different items that add up to the target. Can the same item be used twice? What if there is no pair? Is the array sorted? Can there be negatives or duplicates?"
2. **Give a brute force first.** "The simple way is two nested loops that test every pair. That is O(n^2) time and O(1) space. It works, but it is slow for big arrays."
3. **Find the waste.** "The inner loop searches for `target - nums[i]`. Searching an array is O(n), but a `Map` can answer 'have I seen this number, and where?' in O(1)."
4. **Walk one small example by hand.** "For `[2, 7, 11, 15]` and target 9. At 2, I need 7. My map is empty, so I store 2 at index 0. At 7, I need 2. The map has 2 at index 0, so I return `[0, 1]`."
5. **Write the code while you narrate.** "Lookup first, store second, so a number cannot match itself."
6. **Test out loud.** "Empty array, one item, duplicates like `[3, 3]` with target 6, negatives, and no answer."
7. **Finish with complexity and trade-offs.** "O(n) time and O(n) space. If memory mattered I could sort and use two pointers, but then I would keep the indices in a separate array."

If you get stuck, say so and say what you are trying: "I am not sure how to avoid the second loop. Let me think about what I could remember while I scan." Interviewers score the thinking, not only the answer. See also [How React interviews work](../../../../00-start-here/03-how-react-interviews-work.md) and the think-aloud script in the interview day checklist (planned).

</details>

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (array methods, destructuring, immutability: do not change your input)
- [How React interviews work](../../../../00-start-here/03-how-react-interviews-work.md) (how to think aloud)
- Interview day checklist (planned) (think-aloud script and time plan)
- [Memoization](../../../../02-hooks/07-memoization.md) (`useMemo`, for the React stretch goal)
- Related exercises: [18 - Array utils (groupBy, chunk)](../18-array-utils-groupby-chunk/README.md) and [20 - String utils](../20-string-utils/README.md)
- Interview round: [Round 5 - JavaScript coding](../../../../05-interview-rounds/round-5-javascript-coding/README.md)
