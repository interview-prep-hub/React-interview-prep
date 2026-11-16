// Reference solution for exercise 20: string utilities.
//
// Key ideas:
// - Strings are immutable in JavaScript: every helper builds and returns a new string.
// - One small "split into words" helper powers camelCase, kebabCase and snakeCase,
//   so the three functions only differ in how they join the words again.
// - A Map remembers insertion order. That gives "earliest first" tie-breaking for
//   free in mostFrequentChar.
// - Looping with `for (const ch of str)` walks real characters (code points), so an
//   emoji counts as one character. `str.length` and `str[i]` count UTF-16 units.

function assertString(value, name = 'str') {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a string`)
  }
}

// ---------------------------------------------------------------------------
// reverseWords
// ---------------------------------------------------------------------------
export function reverseWords(str) {
  assertString(str)
  // trim() removes the outer spaces, split(/\s+/) treats any run of whitespace
  // as ONE separator, so extra spaces vanish. For '' the result is [''] and
  // join gives '' again.
  return str.trim().split(/\s+/).reverse().join(' ')
}

// ---------------------------------------------------------------------------
// isPalindrome
// ---------------------------------------------------------------------------
export function isPalindrome(str) {
  assertString(str)
  // Keep only letters and digits (\p{L} and \p{N} also cover accented letters).
  // Note that '_' is neither, which is why we do not use \w here.
  const chars = [...str.toLowerCase()].filter((ch) => /[\p{L}\p{N}]/u.test(ch))

  // Two pointers walk towards the middle.
  for (let left = 0, right = chars.length - 1; left < right; left++, right--) {
    if (chars[left] !== chars[right]) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// titleCase
// ---------------------------------------------------------------------------
export function titleCase(str) {
  assertString(str)
  // Lower-case everything, then upper-case the first character of each run of
  // non-space characters. Spaces, tabs and newlines are not touched.
  return str.toLowerCase().replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1))
}

// ---------------------------------------------------------------------------
// camelCase, kebabCase, snakeCase
// ---------------------------------------------------------------------------

// Cut any naming style into lower-case words:
//   'fooBar' 'foo_bar' 'foo-bar' 'Foo Bar' 'XMLHttpRequest'  ->  words
function splitWords(str) {
  return (
    str
      // fooBar -> foo Bar, item2Name -> item2 Name (lower-case or digit, then capital)
      .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
      // XMLHttp -> XML Http (the LAST capital of a run starts the next word)
      .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
      // everything that is not a letter or a digit separates words
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean) // drop the empty pieces at the start and end
      .map((word) => word.toLowerCase())
  )
}

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1)

export function camelCase(str) {
  assertString(str)
  return splitWords(str)
    .map((word, index) => (index === 0 ? word : capitalize(word)))
    .join('')
}

export function kebabCase(str) {
  assertString(str)
  return splitWords(str).join('-')
}

export function snakeCase(str) {
  assertString(str)
  return splitWords(str).join('_')
}

// ---------------------------------------------------------------------------
// truncate
// ---------------------------------------------------------------------------
export function truncate(str, max, ellipsis = '...') {
  assertString(str)
  if (!Number.isInteger(max) || max < 0) {
    throw new RangeError('max must be a non-negative integer')
  }

  if (str.length <= max) return str // already fits: nothing to do

  // No room for any text plus the ellipsis: just cut, so the limit still holds.
  if (max <= ellipsis.length) return str.slice(0, max)

  // Keep (max - ellipsis.length) characters, then add the ellipsis.
  return str.slice(0, max - ellipsis.length) + ellipsis
}

// ---------------------------------------------------------------------------
// countVowels
// ---------------------------------------------------------------------------
export function countVowels(str) {
  assertString(str)
  // match() returns null when there is no match, so fall back to an empty array.
  return (str.match(/[aeiou]/gi) ?? []).length
}

// ---------------------------------------------------------------------------
// mostFrequentChar
// ---------------------------------------------------------------------------
export function mostFrequentChar(str) {
  assertString(str)

  const counts = new Map() // char -> how many times, in order of first appearance
  for (const ch of str) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1)
  }

  let best = null
  let bestCount = 0
  for (const [ch, count] of counts) {
    // Strictly greater: on a tie the earlier character keeps the crown.
    if (count > bestCount) {
      best = ch
      bestCount = count
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// compress and decompress (run-length encoding)
// ---------------------------------------------------------------------------
export function compress(str) {
  assertString(str)
  if (/\d/.test(str)) {
    // 'a11' could mean "a, then 11" or "a1, then 1": digits make the output ambiguous.
    throw new RangeError('str must not contain digits')
  }

  const chars = [...str]
  let out = ''
  let i = 0
  while (i < chars.length) {
    let run = 1
    while (chars[i + run] === chars[i]) run++
    out += chars[i] + run
    i += run
  }

  // Only worth it when the result is strictly shorter.
  return out.length < str.length ? out : str
}

export function decompress(str) {
  assertString(str)

  // compress() hands back the original text when it did not get shorter.
  // That text has no digits, so there is nothing to expand.
  if (!/\d/.test(str)) return str

  // Valid compressed text is one or more pairs: a non-digit, then its count.
  if (!/^(?:\D\d+)+$/u.test(str)) {
    throw new SyntaxError('str is not valid compressed text')
  }
  return str.replace(/(\D)(\d+)/gu, (_pair, ch, count) => ch.repeat(Number(count)))
}

// ---------------------------------------------------------------------------
// format
// ---------------------------------------------------------------------------
export function format(template, values = {}) {
  assertString(template, 'template')
  if (values === null || typeof values !== 'object') {
    throw new TypeError('values must be an object')
  }

  // One pass over the template. The replacer FUNCTION decides the text, so
  // special patterns such as "$&" inside a value stay plain text, and the
  // inserted values are never scanned for placeholders again.
  return template.replace(/\{(\w+)\}/g, (placeholder, key) => {
    // hasOwn, not `key in values`: '{toString}' must not pick up inherited members.
    const value = Object.hasOwn(values, key) ? values[key] : undefined
    return value === undefined || value === null ? placeholder : String(value)
  })
}
