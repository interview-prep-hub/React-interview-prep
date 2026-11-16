// Exercise 20: string utilities.
// Read README.md in this folder for the full requirements.
//
// Every function below returns undefined for now, so the tests fail.
// Replace each TODO with a real implementation. Do not change the names.
// Strings are immutable in JavaScript: every function returns a NEW string.

// 1. reverseWords("  the   sky is blue ") -> "blue is sky the"
export function reverseWords(str) {
  // TODO 1a: throw a TypeError when str is not a string.
  // TODO 1b: get the words (watch out for runs of spaces, tabs and line breaks),
  //          then rebuild the sentence with the words in the opposite order.
  return undefined
}

// 2. isPalindrome("A man, a plan, a canal: Panama") -> true
export function isPalindrome(str) {
  // TODO 2a: throw a TypeError when str is not a string.
  // TODO 2b: keep only the letters and digits, ignoring case.
  //          Careful: the underscore is NOT a letter or a digit.
  // TODO 2c: compare characters from both ends, moving towards the middle.
  return undefined
}

// 3. titleCase("hELLO wORLD") -> "Hello World"
export function titleCase(str) {
  // TODO 3a: throw a TypeError when str is not a string.
  // TODO 3b: a word is a run of non-space characters. Upper-case its first
  //          character and lower-case the rest. Keep all spacing exactly as it is.
  return undefined
}

// 4. camelCase / kebabCase / snakeCase: each accepts ANY naming style as input.
//    Tip: write ONE private helper that turns the input into an array of
//    lower-case words, and let the three functions only differ in how they
//    join those words. (Do not export the helper, the tests do not need it.)
//    Word rules (see the README): non-letters and non-digits are separators,
//    "fooBar" splits into foo and Bar, "XMLHttp" splits into XML and Http.
export function camelCase(str) {
  // TODO 4a: throw a TypeError when str is not a string.
  // TODO 4b: first word lower case, every other word with a capital first letter, no separator.
  return undefined
}

export function kebabCase(str) {
  // TODO 4c: words joined with "-"
  return undefined
}

export function snakeCase(str) {
  // TODO 4d: words joined with "_"
  return undefined
}

// 5. truncate("Hello world", 8) -> "Hello..." (never longer than max)
export function truncate(str, max, ellipsis = '...') {
  // TODO 5a: throw a TypeError when str is not a string.
  //          Throw a RangeError when max is not a non-negative integer.
  // TODO 5b: a string that already fits (str.length <= max) is returned unchanged.
  // TODO 5c: if there is no room for text plus the ellipsis (max <= ellipsis.length),
  //          return just the first max characters.
  // TODO 5d: otherwise keep (max - ellipsis.length) characters and add the ellipsis.
  return undefined
}

// 6. countVowels("The quick brown fox") -> 5   (a, e, i, o, u in any case)
export function countVowels(str) {
  // TODO 6: throw a TypeError for non-strings, then count the vowels.
  return undefined
}

// 7. mostFrequentChar("mississippi") -> "i"   (ties: the one that appears first)
export function mostFrequentChar(str) {
  // TODO 7a: throw a TypeError for non-strings. Return null for "".
  // TODO 7b: count every character.
  // TODO 7c: pick the highest count. Think about how to make the character that
  //          appears first win a tie.
  return undefined
}

// 8. compress("aaabb") -> "a3b2"   decompress("a3b2") -> "aaabb"
export function compress(str) {
  // TODO 8a: throw a TypeError for non-strings and a RangeError when str contains a digit.
  // TODO 8b: replace every run of the same character by the character and the run length.
  // TODO 8c: return the original string unless the result is strictly shorter.
  return undefined
}

export function decompress(str) {
  // TODO 8d: throw a TypeError for non-strings.
  // TODO 8e: text without any digit is returned unchanged.
  // TODO 8f: otherwise it must be pairs of "one non-digit character + its count".
  //          Expand each pair. Anything else is a SyntaxError.
  return undefined
}

// 9. format("Hi {name}, you are {age}", { name: "Ann", age: 30 }) -> "Hi Ann, you are 30"
export function format(template, values = {}) {
  // TODO 9a: throw a TypeError when template is not a string,
  //          or when values is null or not an object.
  // TODO 9b: find each {key} (letters, digits, underscore only) and replace it
  //          with String(values[key]), but ONLY when values has that key as its
  //          own property and the value is not null or undefined.
  // TODO 9c: unknown placeholders stay exactly as they were.
  return undefined
}
