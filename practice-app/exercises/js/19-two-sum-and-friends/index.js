// Exercise 19: two sum and friends.
// Read README.md in this folder for the full requirements.
//
// Every function below returns undefined for now, so the tests fail.
// Replace each TODO with a real implementation. Do not change the names.
// Stuck? The README has collapsible hints for every function.

// 1. twoSum(nums, target) -> [i, j] (with i < j) or null.
//    Goal: O(n) time. A pair of nested loops is easy but too slow.
export function twoSum(nums, target) {
  // TODO 1a: throw a TypeError when nums is not an array or target is not a number.
  // TODO 1b: scan the array once. What could you remember about the numbers you
  //          have already passed, so that you never need a second loop?
  // TODO 1c: return null when no pair exists.
  return undefined
}

// 2. isValidParentheses(str) -> boolean. Only ()[]{} matter, other characters are ignored.
export function isValidParentheses(str) {
  // TODO 2a: throw a TypeError when str is not a string.
  // TODO 2b: a closer must match the most recent opener that is still open.
  //          Which data structure gives you "the most recent one" first?
  // TODO 2c: decide what leftover openers at the end mean.
  return undefined
}

// 3. groupAnagrams(words) -> array of groups (arrays of words).
export function groupAnagrams(words) {
  // TODO 3a: throw a TypeError when words is not an array of strings.
  // TODO 3b: find a "key" that is identical for all anagrams of each other
  //          and different for words that are not anagrams.
  // TODO 3c: groups appear in order of first appearance, words keep their input order.
  return undefined
}

// 4. maxSubarray(nums) -> the largest sum of a non-empty run of neighbouring numbers.
export function maxSubarray(nums) {
  // TODO 4a: throw a TypeError when nums is not an array. Return 0 for [].
  // TODO 4b: scan once. At each number, is it better to keep the run you have
  //          so far, or to start a fresh run right here?
  // TODO 4c: all-negative input must return the biggest single number, not 0.
  return undefined
}

// 5. mergeIntervals(intervals) -> merged intervals sorted by start.
export function mergeIntervals(intervals) {
  // TODO 5a: throw a TypeError when the input is not an array of [start, end]
  //          pairs of finite numbers with start <= end.
  // TODO 5b: never change the input or share its inner arrays with the result.
  // TODO 5c: in what ORDER should you look at the intervals so that overlaps
  //          are always next to each other?
  return undefined
}

// 6. firstNonRepeatingChar(str) -> the character, or null.
export function firstNonRepeatingChar(str) {
  // TODO 6a: throw a TypeError when str is not a string.
  // TODO 6b: you cannot know that a character is unique before you have seen
  //          the whole string. What do you need to remember?
  return undefined
}

// 7. lengthOfLongestSubstring(str) -> number (sliding window).
export function lengthOfLongestSubstring(str) {
  // TODO 7a: throw a TypeError when str is not a string.
  // TODO 7b: keep a window of characters without a repeat. When a character
  //          would repeat, how far does the left edge have to move?
  //          (Careful: the left edge must never move backwards.)
  return undefined
}

// 8. isPalindromeNumber(n) -> boolean, WITHOUT turning n into a string.
export function isPalindromeNumber(n) {
  // TODO 8a: throw a TypeError unless n is a safe integer (Number.isSafeInteger).
  // TODO 8b: negative numbers are not palindromes. Numbers ending in 0 are not
  //          palindromes either (except 0 itself).
  // TODO 8c: how can you read the last digit of a number, and remove it, using maths only?
  return undefined
}
