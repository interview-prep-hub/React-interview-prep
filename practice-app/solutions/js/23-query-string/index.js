// Reference solution for exercise 23: query string parse and stringify.
//
// A note on URLSearchParams:
// Browsers and Node already ship `new URLSearchParams("a=1&b=2")`, with
// .get(), .getAll(), .append() and .toString(). In a real app you should
// usually use it. In an interview you are asked to write the logic by hand,
// to show that you understand the encoding rules. Be aware that it differs
// from this exercise in three ways:
//   1. toString() writes a space as "+" (form encoding), we write "%20".
//   2. It also escapes the characters ! ' ( ) ~ which encodeURIComponent keeps.
//   3. It does not turn repeated keys into arrays by itself, you call getAll().
// The tests make the global URLSearchParams throw, so it cannot be used here.

// Decode one key or one value.
// Key ideas:
// - "+" means a space in a query string, so we replace it BEFORE decoding.
//   (An encoded plus, "%2B", is not touched by the replace, and decodes to "+".)
// - decodeURIComponent throws a URIError on a bad escape such as "%" or "%zz".
//   A query string comes from users, so we must never crash: keep the raw text.
function decode(text) {
  try {
    return decodeURIComponent(text.replace(/\+/g, ' '))
  } catch {
    return text
  }
}

export function parseQuery(query) {
  // Null prototype: the result has NO inherited keys, so "constructor" and
  // "toString" are normal keys, and "__proto__" cannot change the prototype.
  const result = Object.create(null)
  if (typeof query !== 'string') return result

  const text = query.startsWith('?') ? query.slice(1) : query

  for (const pair of text.split('&')) {
    if (pair === '') continue // "a=1&&b=2" or a trailing "&"

    // Split at the FIRST "=" only, so a value may contain more "=" characters.
    const eq = pair.indexOf('=')
    const rawKey = eq === -1 ? pair : pair.slice(0, eq)
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1)
    if (rawKey === '') continue // "=x" has no key

    const key = decode(rawKey)
    const value = decode(rawValue)

    if (!Object.hasOwn(result, key)) {
      result[key] = value
    } else if (Array.isArray(result[key])) {
      result[key].push(value) // push, not concat: keeps the whole parse O(n)
    } else {
      result[key] = [result[key], value]
    }
  }

  return result
}

export function stringifyQuery(params, options) {
  if (params === null || params === undefined) return ''
  const { sort = false } = options ?? {}

  // Object.keys returns a new array, so sorting it does not touch the input.
  // Default sort order is by UTF-16 code unit: "B" comes before "a".
  const keys = Object.keys(params)
  if (sort) keys.sort()

  const pairs = []
  for (const key of keys) {
    const value = params[key]
    // One key with an array becomes one "key=value" pair per item.
    const items = Array.isArray(value) ? value : [value]

    for (const item of items) {
      if (item === undefined) continue // skipped completely
      const encodedValue = item === null ? '' : encodeURIComponent(String(item))
      pairs.push(`${encodeURIComponent(key)}=${encodedValue}`)
    }
  }

  return pairs.join('&')
}
