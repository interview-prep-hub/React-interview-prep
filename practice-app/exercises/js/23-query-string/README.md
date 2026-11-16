# 23 - Query string parse and stringify

**Level:** Easy | **Time:** 25 minutes | **Topics:** string processing, `encodeURIComponent`, `decodeURIComponent`, edge cases, URL as state

## The task

A query string is the part of a URL after the `?`, like `?page=2&tag=js&tag=react`. Almost every React app reads and writes one (filters, sorting, pagination, search text).

Write two functions without using `URLSearchParams`:

- `parseQuery(query)` turns a query string into an object.
- `stringifyQuery(params, options)` turns an object into a query string.

Work in [`index.js`](./index.js). Do not edit the test file.

Note: `URLSearchParams` is a real built-in that does a similar job, and in a real project you should usually use it. Interviewers ask you to write this by hand to see if you understand encoding, repeated keys and edge cases. The tests replace the global `URLSearchParams` with a class that throws, so it cannot be used here.

## Requirements

### `parseQuery(query)`

1. It takes a string and returns an object. Each key is the decoded name. Each value is a string, or an array of strings when the same key appears more than once.
2. A leading `?` is optional. Remove only ONE leading `?` (so `??a=1` gives the key `?a`).
3. Pairs are separated by `&`. Empty pieces are skipped (`a=1&&b=2&` has two pairs).
4. Split each pair at the FIRST `=` only, so a value may contain more `=` characters (`eq=a=b=c` gives `"a=b=c"`). A pair with no `=` (`flag`) or nothing after it (`flag=`) has the value `""`. A pair with an empty key (`=x`) is skipped.
5. Decode keys and values. A `+` means a space. Percent escapes are decoded as UTF-8 (`%C3%A9` gives `"é"`). An encoded plus, `%2B`, gives a real `+`. Decode only once (`%2541` gives `"%41"`, not `"A"`).
6. Bad percent encoding must NOT throw. If a key or a value cannot be decoded (for example `%`, `100%`, `%zz` or `%E0%A4%A`), keep that text exactly as it was written, including any `+` inside it (`50%+off` stays `"50%+off"`). Every key and every value is decoded on its own, so one bad value does not affect the others.
7. A key that appears once has a string value. A key that appears two or more times has an array of strings, in the order they appeared.
8. Brackets are not special. `a[b]=1` is simply the key `a[b]`, and `c[]=1&c[]=2` is the key `c[]` with the array `["1", "2"]`.
9. Names that every object already has (`constructor`, `toString`, `hasOwnProperty`) are ordinary keys, and so is `__proto__`. Parsing `__proto__=a` must not change the prototype of the result or of any other object.
10. If `query` is not a string (for example `undefined` or `null`), return an empty object.

### `stringifyQuery(params, options)`

11. It takes an object and returns a string like `a=1&b=2`, with NO leading `?`. Pairs follow the order of the object's own keys (`Object.keys`). Inherited properties are ignored.
12. Strings, numbers and booleans are turned into text with `String(value)`. The values `0`, `false` and `""` are real values and are kept (`{ n: 0 }` gives `n=0`). `null` is written as an empty value (`d=`). `undefined` is skipped completely (no key, no `=`).
13. An array value gives one pair per item (`{ b: ["x", "y"] }` gives `b=x&b=y`). Every item follows the same rules as a single value (`undefined` skipped, `null` empty). An empty array writes nothing.
14. Encode every key and every value with `encodeURIComponent`. A space becomes `%20` (never `+`), and `& = ? # / + %` are all escaped.
15. If `options.sort` is `true`, sort the keys with the default `Array.prototype.sort()` order (it compares character codes, so `"B"` comes before `"a"`). Only the keys are sorted, the items inside an array keep their order. The input object and its arrays must never be modified. `sort` is `false` when options is missing.
16. `stringifyQuery({})`, `stringifyQuery(null)` and `stringifyQuery(undefined)` return `""`.

**Complexity target:** `parseQuery` should read the string once, O(n) for n characters. When a key repeats, add to the existing array with `push`, do not rebuild the array each time. `stringifyQuery` is O(n) plus O(k log k) for sorting k keys.

## Examples

```js
parseQuery("?a=1&b=2&b=3&c=%20x&flag")
// { a: "1", b: ["2", "3"], c: " x", flag: "" }

parseQuery("q=hello+world&sum=1%2B1&bad=100%")
// { q: "hello world", sum: "1+1", bad: "100%" }

stringifyQuery({ a: 1, b: ["x", "y"], c: undefined, d: null, e: "a b&c" })
// "a=1&b=x&b=y&d=&e=a%20b%26c"

stringifyQuery({ b: 1, a: 2 }, { sort: true })
// "a=2&b=1"

parseQuery(stringifyQuery({ tag: ["only"], page: 2 }))
// { tag: "only", page: "2" }   (types are not kept: a one-item array and a number come back as strings)
```

## Acceptance criteria (what the tests check)

- The first and the third example above give exactly the documented results.
- The leading `?` is optional, empty input gives `{}`, and empty pieces or empty keys are skipped.
- `+`, `%2B`, UTF-8 escapes and double-encoded text decode correctly (once).
- Bad percent encoding never throws and the raw text is kept.
- Repeated keys become arrays in order; single keys stay strings; bracket keys are plain text.
- `constructor`, `toString` and `__proto__` work as normal keys and nothing is polluted.
- `stringifyQuery` skips `undefined`, writes `null` as empty, keeps `0`, `false` and `""`, handles arrays, encodes keys and values, and sorts keys only when asked.
- The input of `stringifyQuery` is never changed.
- Round trips: `parseQuery(stringifyQuery(x))` gives back `x` for string values, including awkward text such as `%`, `+`, `&`, `=`, new lines and non-ASCII characters.
- Neither function touches `URLSearchParams`.

## How to run

```bash
npm test -- exercises/js/23-query-string
```

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/23-query-string
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Write a small `decode(text)` helper first. Replace `+` with a space, then call `decodeURIComponent` inside `try/catch` and return the original text if it throws.
2. Why replace `+` BEFORE decoding? Because an encoded plus (`%2B`) turns into `+` during decoding, and that one must stay a plus.
3. Use `indexOf("=")` to find the first equals sign, then `slice` on both sides. `split("=")` would cut the value into pieces.
4. For the result object, `Object.create(null)` gives an object with no inherited keys. Then `"constructor" in result` is `false` and `result.__proto__ = x` is an ordinary assignment. `Object.hasOwn(result, key)` is also a safe way to ask "have I seen this key?".
5. Three cases when you store a value: key not seen yet (store the string), seen once (replace the string with an array of two), seen more than once (push).
6. For `stringifyQuery`, first turn each value into an array (`Array.isArray(v) ? v : [v]`). Then one loop over the items covers both cases.
7. `Object.keys(obj)` returns a brand new array, so sorting that array does not change `obj`. Never call `.sort()` on the array that belongs to the caller.

</details>

## Stretch goals

- Add `{ arrayFormat: "brackets" }` to `stringifyQuery` (`b[]=x&b[]=y`) and `{ arrayFormat: "comma" }` (`b=x,y`).
- Add `{ addQueryPrefix: true }` to put the `?` in front (and nothing at all when the result is empty).
- Support nested keys (see the third follow-up question below) behind an option such as `{ nested: true }`.
- Write a React hook `useQueryParam(name)` that reads `window.location.search` with your `parseQuery`, and writes with `history.replaceState`.

## Interview follow-ups to prepare for

**1. URL as state in React apps (`useSearchParams`).** Imagine a product list with a search box, a category filter and a page number. Where should that state live? A strong answer: in the URL. Then a refresh keeps the screen, the back button works, and the user can share or bookmark the link. Be ready to explain:
- What belongs in the URL (filters, sort order, page, selected tab, search text) and what does not (hover state, secrets, big objects).
- In React Router you read it with `const [searchParams, setSearchParams] = useSearchParams()` and derive values on every render, for example `Number(searchParams.get("page") ?? "1")`. Do not copy it into `useState`, because then you have two sources of truth that drift apart.
- Values from the URL are user input. Parse numbers, clamp them to valid ranges and fall back to a default.
- `push` versus `replace`: typing in a search box should replace the current history entry (or be debounced), otherwise the back button needs 20 clicks.
- How would you build `useQueryState` yourself? Subscribe to the `popstate` event with `useSyncExternalStore`, use `location.search` as the snapshot, parse it with `parseQuery`, and write with `history.pushState`.

**2. Encoding pitfalls.** Expect questions like "why does `+` sometimes mean a space?" Be ready to explain:
- `encodeURIComponent` is for a single key or value. `encodeURI` is for a whole URL and leaves `& = ? # /` alone, so using it on a value is a bug.
- A space is `+` in form encoding (the `application/x-www-form-urlencoded` format of `URLSearchParams`) but `%20` in most other places. In a URL path a `+` is just a plus.
- Encode exactly once and decode exactly once. Double encoding produces `%2520`, double decoding breaks real percent signs.
- `decodeURIComponent` throws a `URIError` on bad input, and `encodeURIComponent` throws on a lone surrogate such as `"\uD800"`. Anything that comes from a user needs a `try/catch`.
- Non-ASCII text is encoded as UTF-8 bytes (`é` is `%C3%A9`). `encodeURIComponent` also leaves `! ' ( ) *` unescaped.
- Do not put secrets in query strings: they end up in browser history, server logs and the `Referer` header. Never put an unchecked query value into `href` or `innerHTML` (see the security lesson).

**3. Nested keys like `a[b]=1`.** Libraries such as `qs` read `a[b]=1&a[c]=2` as `{ a: { b: "1", c: "2" } }` and `a[]=1&a[]=2` as `{ a: ["1", "2"] }`. Be ready to explain:
- How you would implement it: split the key into a path such as `["a", "b"]` with a regular expression, then set the value along that path (this is the same idea as [exercise 10, get and set by path](../10-get-set-by-path/README.md)).
- The security risk: prototype pollution. A key like `__proto__[admin]=true` or `constructor[prototype][x]=1` can change `Object.prototype` for the whole app. Defences: objects with no prototype, `Object.hasOwn` checks, rejecting those key names, and limiting the depth.
- A second risk: `a[999999999]=1` can ask for a huge sparse array. Limit array indexes.
- Alternatives to nesting: flat names (`filter.status=open`), or one JSON value in a single parameter. Mention URL length limits (around 2000 characters is a safe rule) and readability.

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md)
- [React Router, including `useSearchParams`](../../../../03-intermediate/03-react-router.md)
- [State management, including URL state](../../../../03-intermediate/06-state-management.md)
- [Custom hooks](../../../../02-hooks/08-custom-hooks.md)
- [Other hooks, including `useSyncExternalStore`](../../../../02-hooks/09-other-hooks.md)
- [Security and internationalization](../../../../04-advanced/10-security-and-i18n.md)
