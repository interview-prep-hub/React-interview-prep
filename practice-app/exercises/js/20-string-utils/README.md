# 20 - String utilities

**Level:** Easy | **Time:** 30 minutes | **Topics:** string methods, regular expressions, loops vs regex, `Map`, immutability, Unicode basics

## The task

Write a toolbox of twelve small string helpers: reverse the words of a sentence, check a palindrome, change the naming style of a name (`camelCase`, `kebabCase`, `snakeCase`), shorten text with `...`, run-length compress text, and fill a template like `"Hi {name}"`. Real apps need these all the time (slugs, card titles, simple messages), and interviewers love them because each one hides a small trap.

Work in [`index.js`](./index.js). Do not edit the test file.

Words used below:

- **Immutable**: a JavaScript string never changes. Every method such as `toUpperCase()` or `slice()` returns a NEW string, so your functions return new strings too.
- **Whitespace**: a space, a tab or a line break.
- A **regular expression** (regex) is a pattern for matching text, for example `/\s+/` means "one or more whitespace characters".
- A **word** in the naming-style functions is defined in requirement 4.

All tests use plain English letters, digits, spaces and punctuation. Accented letters, emoji and other scripts are NOT tested. You may handle them in any way you like, and the first follow-up question below explains why they are tricky.

## Requirements

All functions are named exports of `index.js`. Every function throws a `TypeError` when its string argument (`str`, or `template` for `format`) is not a string. The extra rules for `truncate`, `compress`, `decompress` and `format` are in their items.

1. **`reverseWords(str)`**: reverse the ORDER of the words and join them with single spaces. Any run of whitespace (spaces, tabs, line breaks) separates words, and leading and trailing whitespace is dropped. The letters inside each word keep their order, and punctuation stays attached to its word. `"  the   sky is blue "` becomes `"blue is sky the"`. An empty or whitespace-only string gives `""`.
2. **`isPalindrome(str)`**: `true` when the string reads the same forwards and backwards, comparing only letters and digits and ignoring case. Spaces, punctuation and the underscore `_` are skipped (the underscore is not a letter or a digit). An empty string, or a string with no letters or digits, is a palindrome. `"A man, a plan, a canal: Panama"` is `true`, `"race a car"` and `"0P"` are `false`.
3. **`titleCase(str)`**: a word is any run of non-whitespace characters. Make the first character of each word upper case and the rest lower case. Whitespace is kept exactly as it was (no trimming, no collapsing). There is no list of small words, so `"a tale of two cities"` becomes `"A Tale Of Two Cities"`. Only whitespace splits words, so `"don't stop"` becomes `"Don't Stop"` and `"well-known"` becomes `"Well-known"`.
4. **`camelCase(str)`, `kebabCase(str)`, `snakeCase(str)`**: each accepts ANY naming style (`"hello world"`, `"hello-world"`, `"hello_world"`, `"helloWorld"`, `"HelloWorld"`, `"HELLO WORLD"`, ...) and turns it into its own style: `helloWorld`, `hello-world`, `hello_world`. First cut the input into lower-case words with these rules:
   - A character that is not a letter or a digit is a separator (space, `-`, `_`, `.`, ...). Separators are dropped, and several in a row count as one.
   - A lower-case letter or a digit followed by an upper-case letter starts a new word: `fooBar` is `foo` + `bar`, `item2Name` is `item2` + `name`.
   - In a run of capitals followed by a lower-case letter, the LAST capital starts the new word: `XMLHttpRequest` is `xml` + `http` + `request`, `parseHTMLString` is `parse` + `html` + `string`. A run of capitals on its own is one word: `HTML` is `html`.
   - Digits stay with the letters before them (`base64Encode` is `base64` + `encode`). A word that starts with a digit is its own word: `"version 2"` is `version` + `2`.
   - Then `camelCase` keeps the first word in lower case and gives every other word a capital first letter, `kebabCase` joins the lower-case words with `-`, and `snakeCase` joins them with `_`. Input without any word gives `""`.
5. **`truncate(str, max, ellipsis = "...")`**: the result is NEVER longer than `max` characters (lengths are `str.length`). A string with `str.length <= max` is returned unchanged, so an empty string stays empty. Otherwise keep the first `max - ellipsis.length` characters and add the ellipsis, with no trimming of spaces: `truncate("Hello world", 9)` is `"Hello ..."`. When there is no room for text plus the ellipsis (`max <= ellipsis.length`), return just the first `max` characters of `str` without the ellipsis: `truncate("Hello world", 3)` is `"Hel"`. `ellipsis` can be any string, including `""` and a one-character ellipsis. `max` must be a non-negative integer: otherwise throw a `RangeError` (this check also applies when the string is short).
6. **`countVowels(str)`**: how many of the letters `a`, `e`, `i`, `o`, `u` (upper or lower case) are in the string. `y` is not a vowel. `""` gives `0`.
7. **`mostFrequentChar(str)`**: the character that appears most often, as a one-character string. Case matters (`"a"` and `"A"` are different) and every character counts, including spaces and punctuation. On a tie, return the character whose FIRST appearance in the string comes earliest. `""` returns `null`.
8. **`compress(str)` and `decompress(str)`**: run-length encoding. `compress` replaces each run of the same character with the character followed by the run length, always including the count, even when it is `1`: `"aaabb"` becomes `"a3b2"`. If the result is not strictly shorter than the input, return the ORIGINAL string (so `"abc"`, `"aa"` and `"aabb"` come back unchanged). `compress("")` is `""`. Because digits would make the output ambiguous (`"a11"`), `compress` throws a `RangeError` when `str` contains a digit. `decompress` does the reverse: `"a3b2"` becomes `"aaabb"`, counts can have several digits (`"a12"` is twelve a's), and text with no digit at all is returned unchanged (that is what `compress` gives back when it cannot shrink the text). Text with digits must be made only of pairs "one non-digit character + its count". Anything else (`"a3b"`, `"3a"`, `"12"`) throws a `SyntaxError`. So `decompress(compress(s))` always gives back `s`.
9. **`format(template, values = {})`**: replace each `{key}` in the template with `String(values[key])`. A key is one or more letters, digits or underscores, written right between the braces (so `{ name }`, `{}` and `{user.name}` are NOT placeholders and stay as they are). The matching is case sensitive. Only the object's OWN properties count (`"{toString}"` and `"{constructor}"` stay untouched even though every object has them). A placeholder stays untouched when the key is missing, or when its value is `null` or `undefined`. Falsy values like `0`, `false` and `""` ARE inserted. Inserted values are plain text: they are not scanned for more placeholders, and special patterns such as `$&` inside a value are not interpreted. Throw a `TypeError` when `values` is `null` or not an object.

## Examples

```text
kebabCase("XMLHttpRequest")               -> "xml-http-request"
truncate("Hello world", 8)                -> "Hello..."          (5 letters + 3 dots = 8)
compress("aabcccccaaa")                   -> "a2b1c5a3"          (but compress("aabb") -> "aabb", not shorter)
mostFrequentChar("zzaa")                  -> "z"                 (tie: z appears first, not "first in the alphabet")
format("Hi {name}, you are {age}", { name: "Ann" })
                                          -> "Hi Ann, you are {age}"
```

## Complexity target

Every function should be O(n) for a string of length `n` (`truncate` only needs to touch about `max` characters). Do not hide a loop inside a loop: for example, do not call `str.indexOf(ch)` for every character to count them, use a `Map` or an object. `mostFrequentChar` needs O(k) extra memory, where `k` is the number of different characters.

## Acceptance criteria (what the tests check)

- Every string function throws a `TypeError` for numbers, `null`, `undefined`, arrays, objects and booleans.
- `reverseWords`: normal sentences, extra spaces, tabs and line breaks, punctuation, one word, empty and blank strings.
- `isPalindrome`: famous sentences, case, spaces and punctuation, the underscore, digits (`"0P"`), empty and symbol-only strings.
- `titleCase`: lower, upper and mixed case, exact whitespace, apostrophes and hyphens, leading digits and symbols.
- `camelCase`, `kebabCase`, `snakeCase`: a table of 16 inputs in the different styles, acronyms, digits, inputs with no words, and "same result whichever format you start from".
- `truncate`: the length limit for many inputs and ellipsis choices, fitting strings unchanged, custom and empty ellipsis, the "no room" case, and the `RangeError` cases.
- `countVowels`, `mostFrequentChar`: normal words, case, no vowels, `y`, ties, empty input, spaces and punctuation.
- `compress`, `decompress`: examples, "not shorter" returns the original, digits rejected, round trips for many strings, invalid compressed text rejected.
- `format`: values inserted, repeated placeholders, unknown ones kept, falsy values inserted, `null` and `undefined` kept, non-placeholders kept, no re-scanning, no `$` patterns, no inherited keys, objects without a prototype, line breaks.

## How to run

```bash
npm test -- exercises/js/20-string-utils
```

The functions are synchronous and pure, so there are no timers and no flaky tests.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/20-string-utils
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. **Input check**: write a tiny helper `assertString(value)` that throws a `TypeError`, and call it first in every function. Do not export it.
2. **reverseWords**: `str.trim().split(/\s+/)` gives the words (the regex `\s+` means "one or more whitespace characters"). Then `.reverse().join(' ')`. For `""` you get `[""]` and the result is `""`.
3. **isPalindrome**: lower-case the string, keep only letters and digits (a regex such as `/[^a-z0-9]/g` removes everything else), then compare from both ends with two index variables that walk towards the middle. Do not use `\w`, it also keeps `_`.
4. **titleCase**: `str.toLowerCase().replace(/\S+/g, word => ...)`. `\S` means "not whitespace", so the replacer function receives each word and the spaces between words are never touched.
5. **Naming styles**: write ONE private helper `splitWords(str)` and build the three functions on top of it. Two `replace` calls put a space at the word borders: one for `([a-z0-9])([A-Z])` and one for `([A-Z]+)([A-Z][a-z])`, both with the replacement `'$1 $2'`. Then `split(/[^a-zA-Z0-9]+/)`, drop the empty pieces with `.filter(Boolean)`, and lower-case each word.
6. **truncate**: check the inputs first, then the three cases in this order: it fits, there is no room for the ellipsis, the normal cut. `str.slice(0, n)` gives the first `n` characters.
7. **countVowels**: `str.match(/[aeiou]/gi)` returns an array of matches, or `null` when there is none. Use `?? []` for the `null` case.
8. **mostFrequentChar**: fill a `Map` of character to count. A `Map` keeps the order in which keys were first added. Walk it and replace the best only when the count is strictly greater, so on a tie the earlier character stays.
9. **compress**: walk the string with an index `i`. Count how many following characters equal `str[i]`, append the character and the count, then jump `i` forward by the run length. Compare lengths at the end.
10. **decompress**: no digits means "return the input". Otherwise test the WHOLE string with `/^(?:\D\d+)+$/` (`\D` is "not a digit"). If it matches, `str.replace(/(\D)(\d+)/g, (_, ch, count) => ch.repeat(Number(count)))` expands it.
11. **format**: `template.replace(/\{(\w+)\}/g, (placeholder, key) => ...)`. Inside the function, return the original `placeholder` when you want it unchanged. Use `Object.hasOwn(values, key)` to check own properties (it also works for objects without a prototype). Returning a string from a replacer function means `$&` is not interpreted.

</details>

## Stretch goals

- Add an option to `titleCase` that keeps small words (`a`, `an`, `the`, `of`, `and`, `in`) in lower case, except for the first and last word.
- Make `format` support nested paths like `{user.name}` and an escape for literal braces (`{{` and `}}`).
- Write `slugify(str)` for URLs: lower case, accents removed, words joined with `-`.
- Add a `truncateWords(str, max)` that cuts at the last space instead of in the middle of a word.
- Make `compress` accept digits by using an escape character, and explain why real formats need one.
- Use `truncate` and `titleCase` in a small React component with a controlled input (like [09 - Character counter](../../react/09-character-counter/README.md)) that shows a live preview.

## Interview follow-ups to prepare for

**1. What are the Unicode pitfalls when you work with strings (emoji, accents)?**

<details>
<summary>Show answer</summary>

A JavaScript string is a sequence of UTF-16 **code units** (16-bit numbers). `str.length`, `str[i]`, `slice` and `split("")` all count code units, not what a person sees as one character.

- **Emoji take two units.** Characters above U+FFFF are stored as a "surrogate pair" of two code units. `"😀".length` is `2`, and `"😀".split("")` gives two broken halves. `[..."😀"]` and `for (const ch of str)` walk **code points**, so they keep the emoji whole. This is why `reverse` by `split("")` scrambles emoji, and why a `truncate` that uses `slice` can cut an emoji in half.

  ```js
  "😀".length          // 2
  [..."😀"].length     // 1
  /^.$/.test("😀")     // false (without the u flag, . matches one code unit)
  /^.$/u.test("😀")    // true
  ```

- **One visible character can be several code points.** A flag is two code points, and a family emoji joins three emoji with invisible joiners (5 code points, 8 code units, 1 visible symbol). The visible unit is called a **grapheme cluster**. `Intl.Segmenter` splits a string into graphemes:

  ```js
  const graphemes = (s) => [...new Intl.Segmenter().segment(s)].map((part) => part.segment)
  graphemes("a👨‍👩‍👧b").length // 3
  ```

- **Normalisation.** The same visible text can be stored in two ways: `"é"` as one code point (U+00E9, "composed", NFC) or as `"e"` plus a combining accent (U+0301, "decomposed", NFD). They look identical, but `"é" === "é"` is `false` and the lengths are `1` and `2`. Compare, search and deduplicate user text after `str.normalize()` (it uses NFC by default). To remove accents, decompose and delete the combining marks: `str.normalize("NFD").replace(/\p{M}/gu, "")` turns `"crème"` into `"creme"`.
- **Case changes can change the length.** `"ß".toUpperCase()` is `"SS"`. In Turkish, `"I".toLocaleLowerCase("tr")` is `"ı"`, so use the `toLocale...Case` methods when the language matters.
- **Regex needs the `u` flag** for code points and for `\p{L}` (any letter) and `\p{N}` (any digit).

In this exercise your `isPalindrome`, `camelCase` and friends could use `\p{L}` and `\p{N}` with the `u` flag, instead of `a-z`, to work for accented letters. The tests do not check that, but it is the answer a senior interviewer likes to hear.

</details>

**2. Regex or plain loops: how do you choose?**

<details>
<summary>Show answer</summary>

Both are fine, the skill is choosing on purpose.

- **Use a regex** for pattern work that is short to write: splitting on whitespace (`str.split(/\s+/)`), finding every vowel (`str.match(/[aeiou]/gi)`), replacing placeholders (`template.replace(/\{(\w+)\}/g, ...)`). For a plain text replacement with no pattern, `str.replaceAll(".", "-")` is clearer than a regex that needs escaping.
- **Use a loop** when you need to remember something between characters or stop early: run lengths in `compress`, two pointers in `isPalindrome`, a `Map` of counts in `mostFrequentChar`, a stack for brackets. A loop is also easier to step through in a debugger.

Both versions of `countVowels` are O(n), so pick the one your team can read quickly:

```js
// regex
const countVowels = (s) => (s.match(/[aeiou]/gi) ?? []).length

// loop
function countVowelsLoop(s) {
  let count = 0
  for (const ch of s.toLowerCase()) {
    if ('aeiou'.includes(ch)) count++
  }
  return count
}
```

Regex gotchas worth knowing:

- A regex with the `g` flag remembers where it stopped (`lastIndex`). Reusing one global regex with `.test()` gives alternating results: `const g = /a/g; g.test("a")` is `true`, then `false`, then `true`.
- `str.replace(pattern, "$&$&")` with a STRING replacement reads `$&` and `$1` as special patterns. A replacer FUNCTION returns plain text. This is the `format` trap in this exercise.
- **Catastrophic backtracking**: a pattern with nested repeats such as `/^(a+)+$/` can take exponential time on input like `"aaaa...ab"` (about 3 seconds for only 24 letters on a laptop). With user input this is a denial-of-service risk ("ReDoS"). Keep patterns simple, and limit the input length.
- Do not parse nested structures (brackets, HTML) with a regex. Use a stack or a parser, see exercise [19 - Two Sum and friends](../19-two-sum-and-friends/README.md).

</details>

**3. Which `Intl` APIs help with locale-aware work, and why not write the rules yourself?**

<details>
<summary>Show answer</summary>

Sorting, casing, plurals, numbers, dates and lists all follow different rules in different languages. `Intl` is built into the browser and Node, so you get those rules without a library.

- **`Intl.Collator`** (or `localeCompare`) sorts strings the way users expect. The default `sort()` compares code units, so `"ä"` lands after `"z"`:

  ```js
  ["z", "ä", "a"].sort()                              // ["a", "z", "ä"]
  ["z", "ä", "a"].sort(new Intl.Collator("de").compare) // ["a", "ä", "z"]
  ["file10", "file2", "file1"].sort(new Intl.Collator(undefined, { numeric: true }).compare)
  // ["file1", "file2", "file10"]
  ```

- **`Intl.Segmenter`** splits text into graphemes, words or sentences, also for languages that do not use spaces between words. Use it for a correct `truncate`, character count or word count.
- **`toLocaleUpperCase(locale)` and `toLocaleLowerCase(locale)`** handle language rules such as Turkish `i`.
- **`Intl.NumberFormat`** formats numbers, currency and compact numbers: `new Intl.NumberFormat("en", { notation: "compact" }).format(1234)` is `"1.2K"`, and German currency formatting gives `1.234,50 €`.
- **`Intl.DateTimeFormat`** and **`Intl.RelativeTimeFormat`** format dates and phrases like "3 days ago" (`new Intl.RelativeTimeFormat("en").format(-3, "day")`).
- **`Intl.PluralRules`** picks the plural form (`"one"`, `"other"`, and more forms in languages like Arabic or Polish), so you do not write `count === 1 ? "item" : "items"` by hand.
- **`Intl.ListFormat`** joins lists: `["A", "B", "C"]` becomes `"A, B, and C"` in English.

In React, never build "1 item(s)", dates or money strings by hand. Create the formatter once outside the component (building an `Intl` object is not free) or inside `useMemo`, and pass the user's locale. The i18n basics are in [Security and i18n](../../../../04-advanced/10-security-and-i18n.md).

</details>

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md) (template strings, destructuring, array methods, immutability)
- [Security and i18n](../../../../04-advanced/10-security-and-i18n.md) (internationalization basics, for the `Intl` follow-up)
- [Memoization](../../../../02-hooks/07-memoization.md) (`useMemo`, for creating formatters once)
- Related exercises: [19 - Two Sum and friends](../19-two-sum-and-friends/README.md), [21 - classnames](../21-classnames/README.md), [23 - Query string](../23-query-string/README.md) and the React exercise [09 - Character counter](../../react/09-character-counter/README.md)
- Interview round: [Round 5 - JavaScript coding](../../../../05-interview-rounds/round-5-javascript-coding/README.md)
