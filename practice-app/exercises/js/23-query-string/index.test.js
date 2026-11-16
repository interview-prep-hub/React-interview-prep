import { parseQuery, stringifyQuery } from './index.js'

describe('23 Query string: parseQuery', () => {
  it('parses the example from the README', () => {
    expect(parseQuery('?a=1&b=2&b=3&c=%20x&flag')).toEqual({
      a: '1',
      b: ['2', '3'],
      c: ' x',
      flag: '',
    })
  })

  it('works with or without a leading question mark', () => {
    expect(parseQuery('a=1&b=2')).toEqual({ a: '1', b: '2' })
    expect(parseQuery('?a=1&b=2')).toEqual({ a: '1', b: '2' })
  })

  it('removes only ONE leading question mark', () => {
    expect(parseQuery('??a=1')).toEqual({ '?a': '1' })
  })

  it('returns an empty object for empty or missing input', () => {
    expect(parseQuery('')).toEqual({})
    expect(parseQuery('?')).toEqual({})
    expect(parseQuery(undefined)).toEqual({})
    expect(parseQuery(null)).toEqual({})
  })

  it('gives an empty string to a key without a value', () => {
    expect(parseQuery('flag&other=')).toEqual({ flag: '', other: '' })
  })

  it('splits each pair at the FIRST equals sign only', () => {
    expect(parseQuery('eq=a=b=c')).toEqual({ eq: 'a=b=c' })
    expect(parseQuery('token=abc==')).toEqual({ token: 'abc==' })
  })

  it('turns a plus sign into a space, but %2B into a real plus', () => {
    expect(parseQuery('q=hello+world')).toEqual({ q: 'hello world' })
    expect(parseQuery('sum=1%2B1')).toEqual({ sum: '1+1' })
  })

  it('decodes percent escapes in keys and values, including multi-byte text', () => {
    expect(parseQuery('city=caf%C3%A9')).toEqual({ city: 'caf\u{e9}' })
    expect(parseQuery('check=%E2%9C%93')).toEqual({ check: '\u{2713}' })
    expect(parseQuery('first%20name=Ada+Lovelace')).toEqual({ 'first name': 'Ada Lovelace' })
  })

  it('decodes only once (no double decoding)', () => {
    expect(parseQuery('a=%2541')).toEqual({ a: '%41' })
  })

  it('collects repeated keys into an array, in order', () => {
    expect(parseQuery('b=1&b=2&b=3')).toEqual({ b: ['1', '2', '3'] })
    expect(parseQuery('b=1&a=x&b=2')).toEqual({ b: ['1', '2'], a: 'x' })
    expect(parseQuery('b=&b=')).toEqual({ b: ['', ''] })
  })

  it('a key that appears once is a string, a key that appears twice is an array', () => {
    expect(parseQuery('a=1')).toEqual({ a: '1' })
    expect(parseQuery('a=1&a=2')).toEqual({ a: ['1', '2'] })
  })

  it('skips empty pieces and pairs that have no key', () => {
    expect(parseQuery('a=1&&b=2&')).toEqual({ a: '1', b: '2' })
    expect(parseQuery('=x&a=1&=y')).toEqual({ a: '1' })
    expect(parseQuery('&&&')).toEqual({})
  })

  it('does not throw on bad percent encoding and keeps the raw text', () => {
    expect(parseQuery('a=%E0%A4%A&b=100%&c=%zz')).toEqual({
      a: '%E0%A4%A',
      b: '100%',
      c: '%zz',
    })
  })

  it('keeps the raw text exactly, so a plus stays a plus in a bad value', () => {
    expect(parseQuery('q=50%+off')).toEqual({ q: '50%+off' })
  })

  it('decodes the good parts even when a neighbour is bad', () => {
    expect(parseQuery('good=%41&bad=%&%zz=ok')).toEqual({ good: 'A', bad: '%', '%zz': 'ok' })
  })

  it('treats bracket keys as plain text (no nesting)', () => {
    expect(parseQuery('a[b]=1&c[]=1&c[]=2')).toEqual({ 'a[b]': '1', 'c[]': ['1', '2'] })
  })

  it('treats names that exist on every object as ordinary keys', () => {
    expect(parseQuery('constructor=1&toString=2&hasOwnProperty=3')).toEqual({
      constructor: '1',
      toString: '2',
      hasOwnProperty: '3',
    })
    expect(parseQuery('constructor=1&constructor=2').constructor).toEqual(['1', '2'])
  })

  it('treats __proto__ as an ordinary key and does not pollute anything', () => {
    const result = parseQuery('__proto__=a&__proto__=b&polluted=yes')
    expect(typeof result).toBe('object')
    expect(Object.keys(result)).toEqual(['__proto__', 'polluted'])
    expect(result['__proto__']).toEqual(['a', 'b'])
    expect(Array.isArray(Object.getPrototypeOf(result))).toBe(false)
    expect({}.polluted).toBeUndefined()
  })
})

describe('23 Query string: stringifyQuery', () => {
  it('builds the example from the README', () => {
    expect(
      stringifyQuery({ a: 1, b: ['x', 'y'], c: undefined, d: null, e: 'a b&c' }),
    ).toBe('a=1&b=x&b=y&d=&e=a%20b%26c')
  })

  it('does not add a leading question mark', () => {
    expect(stringifyQuery({ a: 1 })).toBe('a=1')
  })

  it('converts numbers and booleans to text and keeps 0, false and empty string', () => {
    expect(stringifyQuery({ n: 42, zero: 0, yes: true, no: false, empty: '' })).toBe(
      'n=42&zero=0&yes=true&no=false&empty=',
    )
  })

  it('skips undefined, writes null as an empty value', () => {
    expect(stringifyQuery({ a: undefined })).toBe('')
    expect(stringifyQuery({ a: null })).toBe('a=')
    expect(stringifyQuery({ a: 1, b: undefined, c: 2 })).toBe('a=1&c=2')
  })

  it('applies the same rules to every item of an array', () => {
    expect(stringifyQuery({ a: [1, undefined, null, 'z', 0] })).toBe('a=1&a=&a=z&a=0')
  })

  it('writes nothing for an empty array', () => {
    expect(stringifyQuery({ a: [], b: 1 })).toBe('b=1')
  })

  it('returns an empty string for an empty object or for null and undefined', () => {
    expect(stringifyQuery({})).toBe('')
    expect(stringifyQuery(null)).toBe('')
    expect(stringifyQuery(undefined)).toBe('')
  })

  it('percent-encodes values, using %20 for a space (never a plus)', () => {
    expect(stringifyQuery({ q: 'a b' })).toBe('q=a%20b')
    expect(stringifyQuery({ q: '1+1' })).toBe('q=1%2B1')
    expect(stringifyQuery({ q: 'x&y=z' })).toBe('q=x%26y%3Dz')
    expect(stringifyQuery({ q: '/?#' })).toBe('q=%2F%3F%23')
    expect(stringifyQuery({ q: '100%' })).toBe('q=100%25')
  })

  it('percent-encodes non-ASCII text as UTF-8', () => {
    expect(stringifyQuery({ city: 'caf\u{e9}', check: '\u{2713}' })).toBe(
      'city=caf%C3%A9&check=%E2%9C%93',
    )
  })

  it('percent-encodes keys too', () => {
    expect(stringifyQuery({ 'first name': 'Ada', 'a&b=c': '1' })).toBe(
      'first%20name=Ada&a%26b%3Dc=1',
    )
  })

  it('keeps the key order of the object by default', () => {
    expect(stringifyQuery({ b: 1, a: 2, c: 3 })).toBe('b=1&a=2&c=3')
    expect(stringifyQuery({ b: 1, a: 2 }, {})).toBe('b=1&a=2')
    expect(stringifyQuery({ b: 1, a: 2 }, { sort: false })).toBe('b=1&a=2')
  })

  it('sorts the keys when sort is true (plain default sort order)', () => {
    expect(stringifyQuery({ b: 1, a: 2, c: 3 }, { sort: true })).toBe('a=2&b=1&c=3')
    // Default sort compares character codes: uppercase letters come first.
    expect(stringifyQuery({ b: 1, a: 2, B: 3 }, { sort: true })).toBe('B=3&a=2&b=1')
  })

  it('sorting changes the order of keys only, not the order of array items', () => {
    expect(stringifyQuery({ b: ['2', '1'], a: 'x' }, { sort: true })).toBe('a=x&b=2&b=1')
  })

  it('does not modify its input', () => {
    const list = ['2', '1']
    const params = Object.freeze({ b: Object.freeze(list), a: 'x' })
    expect(stringifyQuery(params, { sort: true })).toBe('a=x&b=2&b=1')
    expect(list).toEqual(['2', '1'])
  })

  it('uses own enumerable properties only', () => {
    const params = Object.create({ inherited: 'no' })
    params.own = 'yes'
    expect(stringifyQuery(params)).toBe('own=yes')
  })
})

describe('23 Query string: round trips', () => {
  it('parse(stringify(x)) gives back x for string values', () => {
    const original = {
      a: '1',
      list: ['x', 'y', 'z'],
      spaced: ' x ',
      empty: '',
      tricky: 'a b&c=d?e#f/g+h%i',
      city: 'caf\u{e9}',
      'key with space': 'v',
    }
    expect(parseQuery(stringifyQuery(original))).toEqual(original)
  })

  it('stringify(parse(q)) gives back q when q is already in canonical form', () => {
    const query = 'a=1&b=2&b=3&c=%20x&flag='
    expect(stringifyQuery(parseQuery(query))).toBe(query)
  })

  it('a key without an equals sign comes back with one', () => {
    expect(stringifyQuery(parseQuery('a=1&flag'))).toBe('a=1&flag=')
  })

  it('round trip tolerates the leading question mark', () => {
    const params = { page: '2', tag: ['a', 'b'] }
    expect(parseQuery('?' + stringifyQuery(params))).toEqual(params)
  })

  it('types are not kept: numbers come back as strings', () => {
    expect(parseQuery(stringifyQuery({ page: 2, on: true, none: null }))).toEqual({
      page: '2',
      on: 'true',
      none: '',
    })
  })

  it('an array with one item comes back as a plain string', () => {
    expect(parseQuery(stringifyQuery({ tag: ['only'] }))).toEqual({ tag: 'only' })
  })

  it.each([
    ['empty string', ''],
    ['one space', ' '],
    ['plus sign', '+'],
    ['percent sign', '%'],
    ['text that looks like an escape', '%41'],
    ['a half escape', '%E0%A4%A'],
    ['ampersand', '&'],
    ['equals sign', '='],
    ['a whole query inside a value', 'a=b&c=d'],
    ['question mark and hash', '?#'],
    ['new line and tab', 'line\n\ttext'],
    ['accented letter', 'caf\u{e9}'],
    ['check mark', '\u{2713}'],
    ['a character outside the basic plane', '\u{1F600}'],
  ])('survives a round trip: %s', (_label, text) => {
    expect(parseQuery(stringifyQuery({ k: text }))).toEqual({ k: text })
    // It also has to work when the text is used as a key.
    if (text !== '') {
      expect(parseQuery(stringifyQuery({ [text]: 'v' }))).toEqual({ [text]: 'v' })
    }
  })
})

describe('23 Query string: no URLSearchParams', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'URLSearchParams',
      class {
        constructor() {
          throw new Error('URLSearchParams is off limits in this exercise')
        }
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parseQuery and stringifyQuery work without URLSearchParams', () => {
    expect(parseQuery('?a=1&b=2&b=3')).toEqual({ a: '1', b: ['2', '3'] })
    expect(stringifyQuery({ a: 1, b: ['x', 'y'] })).toBe('a=1&b=x&b=y')
  })
})
