// Exercise 23: Query string parse and stringify.
// Read README.md in this folder for the full requirements.
//
// Rules of this exercise:
// - Do NOT use URLSearchParams. The tests replace it with something that throws.
// - Write the logic yourself with split, indexOf, encodeURIComponent and
//   decodeURIComponent.
//
// Run the tests with:  npm test -- exercises/js/23-query-string

// Decode ONE key or ONE value from a query string.
// A helper like this keeps parseQuery short.
function decode(text) {
  // TODO 1: a "+" means a space in a query string.
  // TODO 2: decode the percent escapes with decodeURIComponent.
  // TODO 3: decodeURIComponent THROWS on a bad escape (for example "%" or "%zz").
  //         Catch that and return the original text unchanged.
  return undefined
}

export function parseQuery(query) {
  // TODO 4: if query is not a string, return an empty result.
  // TODO 5: remove ONE leading "?" if there is one.
  // TODO 6: split on "&" and skip empty pieces.
  // TODO 7: split each piece at the FIRST "=" only. No "=" means an empty value.
  //         Skip a piece that has an empty key.
  // TODO 8: decode the key and the value with decode().
  // TODO 9: the first time a key appears store a string, the second time turn it
  //         into an array, after that push to the array.
  //         Think about which kind of object you start with: keys such as
  //         "constructor" and "__proto__" must behave like any other key.
  return undefined
}

export function stringifyQuery(params, options) {
  // TODO 10: null or undefined params give an empty string.
  // TODO 11: take the keys of params (own keys only). If options.sort is true,
  //          sort the keys, but do not change the input object.
  // TODO 12: an array value becomes one "key=value" pair per item.
  //          undefined is skipped, null becomes an empty value.
  // TODO 13: encode every key and value with encodeURIComponent and join the
  //          pairs with "&" (no leading "?").
  return undefined
}
