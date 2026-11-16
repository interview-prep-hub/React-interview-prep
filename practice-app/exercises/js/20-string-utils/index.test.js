import {
  reverseWords,
  isPalindrome,
  titleCase,
  camelCase,
  kebabCase,
  snakeCase,
  truncate,
  countVowels,
  mostFrequentChar,
  compress,
  decompress,
  format,
} from './index.js'

// All functions here are pure and synchronous, so there are no timers or
// network calls. Every test uses plain English letters, digits, spaces and
// punctuation. Emoji and accented letters are not tested (see the README).

// ---------------------------------------------------------------------------
// Input checks shared by (almost) every function
// ---------------------------------------------------------------------------

describe('20 input checks', () => {
  const stringFunctions = {
    reverseWords,
    isPalindrome,
    titleCase,
    camelCase,
    kebabCase,
    snakeCase,
    countVowels,
    mostFrequentChar,
    compress,
    decompress,
  }

  it.each(Object.keys(stringFunctions))('%s throws a TypeError when the input is not a string', (name) => {
    const fn = stringFunctions[name]
    for (const bad of [123, null, undefined, ['a', 'b'], {}, true]) {
      expect(() => fn(bad)).toThrow(TypeError)
    }
  })

  it('truncate throws a TypeError when str is not a string', () => {
    expect(() => truncate(123, 5)).toThrow(TypeError)
    expect(() => truncate(null, 5)).toThrow(TypeError)
    expect(() => truncate(undefined, 5)).toThrow(TypeError)
  })

  it('format throws a TypeError when the template is not a string', () => {
    expect(() => format(123, {})).toThrow(TypeError)
    expect(() => format(null, {})).toThrow(TypeError)
    expect(() => format(undefined, {})).toThrow(TypeError)
  })
})

// ---------------------------------------------------------------------------
// reverseWords
// ---------------------------------------------------------------------------

describe('20 reverseWords', () => {
  it.each([
    ['the sky is blue', 'blue is sky the'],
    ['hello world', 'world hello'],
    ['one two three four', 'four three two one'],
  ])('reverses the order of the words in %j', (input, expected) => {
    expect(reverseWords(input)).toBe(expected)
  })

  it('collapses extra spaces and trims the ends', () => {
    expect(reverseWords('  hello   world  ')).toBe('world hello')
    expect(reverseWords('a    b     c')).toBe('c b a')
    expect(reverseWords('   leading')).toBe('leading')
    expect(reverseWords('trailing   ')).toBe('trailing')
  })

  it('treats tabs and newlines as spaces too', () => {
    expect(reverseWords('a\tb\n c')).toBe('c b a')
  })

  it('keeps the letters inside each word in the same order', () => {
    expect(reverseWords('abc def')).toBe('def abc')
    expect(reverseWords('Hello, world!')).toBe('world! Hello,')
  })

  it('returns a single word unchanged', () => {
    expect(reverseWords('single')).toBe('single')
    expect(reverseWords('  single  ')).toBe('single')
  })

  it('returns an empty string for empty or whitespace-only input', () => {
    expect(reverseWords('')).toBe('')
    expect(reverseWords('   ')).toBe('')
    expect(reverseWords(' \t\n ')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// isPalindrome
// ---------------------------------------------------------------------------

describe('20 isPalindrome', () => {
  it.each([
    'A man, a plan, a canal: Panama',
    'Was it a car or a cat I saw?',
    "No 'x' in Nixon",
    'racecar',
    'Madam',
    'Aa',
    '12321',
    'a',
  ])('accepts %j', (input) => {
    expect(isPalindrome(input)).toBe(true)
  })

  it.each(['race a car', 'hello', 'ab', 'abca', '123', 'Palindrome'])('rejects %j', (input) => {
    expect(isPalindrome(input)).toBe(false)
  })

  it('ignores case', () => {
    expect(isPalindrome('RaceCar')).toBe(true)
    expect(isPalindrome('aBbA')).toBe(true)
  })

  it('ignores spaces and punctuation', () => {
    expect(isPalindrome('a.b,c!c?b;a')).toBe(true)
    expect(isPalindrome('  r a c e  c a r  ')).toBe(true)
  })

  it('does not treat the underscore as a letter or a digit', () => {
    expect(isPalindrome('ab_a')).toBe(true)
    expect(isPalindrome('_a_b_')).toBe(false)
  })

  it('compares digits as well as letters', () => {
    expect(isPalindrome('0P')).toBe(false)
    expect(isPalindrome('1a2 2a1')).toBe(true)
    expect(isPalindrome('12 21 3')).toBe(false)
  })

  it('treats the empty string and strings without letters or digits as palindromes', () => {
    expect(isPalindrome('')).toBe(true)
    expect(isPalindrome(' ')).toBe(true)
    expect(isPalindrome('.,!?')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// titleCase
// ---------------------------------------------------------------------------

describe('20 titleCase', () => {
  it.each([
    ['hello world', 'Hello World'],
    ['HELLO WORLD', 'Hello World'],
    ['hELLO wORLD', 'Hello World'],
    ['the quick brown fox', 'The Quick Brown Fox'],
    ['a tale of two cities', 'A Tale Of Two Cities'],
    ['x', 'X'],
    ['Already Title Case', 'Already Title Case'],
  ])('turns %j into %j', (input, expected) => {
    expect(titleCase(input)).toBe(expected)
  })

  it('keeps the original spacing exactly', () => {
    expect(titleCase('  hello   world ')).toBe('  Hello   World ')
    expect(titleCase('hello\tworld\nfoo')).toBe('Hello\tWorld\nFoo')
  })

  it('treats a word as everything between spaces', () => {
    expect(titleCase("don't stop")).toBe("Don't Stop")
    expect(titleCase('well-known fact')).toBe('Well-known Fact')
    expect(titleCase("it's o'clock")).toBe("It's O'clock")
  })

  it('leaves a leading digit or symbol alone and lower-cases the rest of the word', () => {
    expect(titleCase('3D printing')).toBe('3d Printing')
    expect(titleCase('(hello) "world"')).toBe('(hello) "world"')
    expect(titleCase('123abc')).toBe('123abc')
  })

  it('returns an empty string for an empty string', () => {
    expect(titleCase('')).toBe('')
    expect(titleCase('   ')).toBe('   ')
  })
})

// ---------------------------------------------------------------------------
// camelCase, kebabCase, snakeCase
// ---------------------------------------------------------------------------

describe('20 camelCase, kebabCase and snakeCase', () => {
  // [input, camelCase, kebabCase, snakeCase]
  const table = [
    ['hello world', 'helloWorld', 'hello-world', 'hello_world'],
    ['Hello World', 'helloWorld', 'hello-world', 'hello_world'],
    ['HELLO WORLD', 'helloWorld', 'hello-world', 'hello_world'],
    ['hello-world', 'helloWorld', 'hello-world', 'hello_world'],
    ['hello_world', 'helloWorld', 'hello-world', 'hello_world'],
    ['helloWorld', 'helloWorld', 'hello-world', 'hello_world'],
    ['HelloWorld', 'helloWorld', 'hello-world', 'hello_world'],
    ['hello world foo bar', 'helloWorldFooBar', 'hello-world-foo-bar', 'hello_world_foo_bar'],
    ['one two-three_four five', 'oneTwoThreeFourFive', 'one-two-three-four-five', 'one_two_three_four_five'],
    ['user.first.name', 'userFirstName', 'user-first-name', 'user_first_name'],
    ['  hello   world  ', 'helloWorld', 'hello-world', 'hello_world'],
    ['--hello__world--', 'helloWorld', 'hello-world', 'hello_world'],
    ['hello', 'hello', 'hello', 'hello'],
    ['Hello', 'hello', 'hello', 'hello'],
    ['HTML', 'html', 'html', 'html'],
    ['a', 'a', 'a', 'a'],
  ]

  const cases = table.map(([input, camel, kebab, snake]) => ({ input, camel, kebab, snake }))

  it.each(cases)('camelCase($input) is $camel', ({ input, camel }) => {
    expect(camelCase(input)).toBe(camel)
  })

  it.each(cases)('kebabCase($input) is $kebab', ({ input, kebab }) => {
    expect(kebabCase(input)).toBe(kebab)
  })

  it.each(cases)('snakeCase($input) is $snake', ({ input, snake }) => {
    expect(snakeCase(input)).toBe(snake)
  })

  it('splits a run of capitals before a new capitalised word', () => {
    expect(camelCase('XMLHttpRequest')).toBe('xmlHttpRequest')
    expect(kebabCase('XMLHttpRequest')).toBe('xml-http-request')
    expect(snakeCase('parseHTMLString')).toBe('parse_html_string')
    expect(kebabCase('getHTTPResponseCode')).toBe('get-http-response-code')
  })

  it('keeps digits together with the word they belong to', () => {
    expect(camelCase('base64 encode')).toBe('base64Encode')
    expect(kebabCase('base64Encode')).toBe('base64-encode')
    expect(snakeCase('item2Name')).toBe('item2_name')
    expect(kebabCase('version 2')).toBe('version-2')
    expect(camelCase('item 2 name')).toBe('item2Name')
  })

  it('returns an empty string when there are no words', () => {
    for (const fn of [camelCase, kebabCase, snakeCase]) {
      expect(fn('')).toBe('')
      expect(fn('   ')).toBe('')
      expect(fn('---')).toBe('')
      expect(fn('_ - _')).toBe('')
    }
  })

  it('gives the same result whichever of the three formats you start from', () => {
    const samples = [
      'hello world',
      'helloWorld',
      'hello-world',
      'hello_world',
      'HelloWorld',
      'XMLHttpRequest',
      'parseHTMLString',
      'getHTTPResponseCode',
      '  spaced   out  words ',
    ]
    for (const sample of samples) {
      for (const [a, b] of [
        [camelCase, kebabCase],
        [camelCase, snakeCase],
        [kebabCase, camelCase],
        [kebabCase, snakeCase],
        [snakeCase, camelCase],
        [snakeCase, kebabCase],
      ]) {
        // Converting to format b first must not change the final result in format a.
        expect(a(b(sample))).toBe(a(sample))
      }
    }
    expect(camelCase(kebabCase('Some Mixed_input-here'))).toBe('someMixedInputHere')
  })
})

// ---------------------------------------------------------------------------
// truncate
// ---------------------------------------------------------------------------

describe('20 truncate', () => {
  it('cuts a long string and adds the default ellipsis, staying within max', () => {
    expect(truncate('Hello world', 8)).toBe('Hello...')
    expect(truncate('The quick brown fox', 10)).toBe('The qui...')
    expect(truncate('abcdefghij', 6)).toBe('abc...')
  })

  it('returns a string that fits unchanged', () => {
    expect(truncate('Hello world', 11)).toBe('Hello world')
    expect(truncate('Hello world', 50)).toBe('Hello world')
    expect(truncate('abc', 3)).toBe('abc')
  })

  it('returns an empty string unchanged', () => {
    expect(truncate('', 5)).toBe('')
    expect(truncate('', 0)).toBe('')
  })

  it('does not trim spaces before the ellipsis', () => {
    expect(truncate('Hello world', 9)).toBe('Hello ...')
  })

  it('supports a custom ellipsis, including a one-character one', () => {
    expect(truncate('Hello, world', 8, '…')).toBe('Hello, …')
    expect(truncate('Hello world', 8, ' [more]')).toBe('H [more]')
    expect(truncate('Hello world', 8, '~')).toBe('Hello w~')
  })

  it('supports an empty ellipsis', () => {
    expect(truncate('Hello world', 8, '')).toBe('Hello wo')
    expect(truncate('Hello world', 0, '')).toBe('')
  })

  it('cuts without an ellipsis when there is no room for text plus the ellipsis', () => {
    expect(truncate('Hello world', 3)).toBe('Hel') // max equals the ellipsis length
    expect(truncate('Hello world', 2)).toBe('He')
    expect(truncate('Hello world', 1)).toBe('H')
    expect(truncate('Hello world', 0)).toBe('')
    expect(truncate('Hello world', 4)).toBe('H...') // one character of room
  })

  it('never returns more than max characters', () => {
    const samples = ['', 'a', 'abc', 'Hello world', 'The quick brown fox jumps over the lazy dog']
    for (const ellipsis of ['...', '…', '', '--->', '.']) {
      for (const sample of samples) {
        for (let max = 0; max <= 16; max++) {
          const out = truncate(sample, max, ellipsis)
          expect(typeof out).toBe('string')
          expect(out.length).toBeLessThanOrEqual(max)
          if (sample.length <= max) {
            expect(out).toBe(sample)
          } else if (max > ellipsis.length) {
            expect(out.endsWith(ellipsis)).toBe(true)
            expect(out.length).toBe(max)
          }
        }
      }
    }
  })

  it('throws a RangeError when max is not a non-negative integer', () => {
    expect(() => truncate('abc', -1)).toThrow(RangeError)
    expect(() => truncate('abc', 2.5)).toThrow(RangeError)
    expect(() => truncate('abc', NaN)).toThrow(RangeError)
    expect(() => truncate('abc', Infinity)).toThrow(RangeError)
    expect(() => truncate('abc', '5')).toThrow(RangeError)
    expect(() => truncate('abc')).toThrow(RangeError)
    expect(() => truncate('', -1)).toThrow(RangeError) // checked even when the string is short
  })
})

// ---------------------------------------------------------------------------
// countVowels
// ---------------------------------------------------------------------------

describe('20 countVowels', () => {
  it.each([
    ['hello', 2],
    ['HELLO', 2],
    ['AEIOUaeiou', 10],
    ['The quick brown fox', 5],
    ['banana', 3],
    ['aaaa', 4],
  ])('counts the vowels in %j', (input, expected) => {
    expect(countVowels(input)).toBe(expected)
  })

  it('returns 0 when there are no vowels', () => {
    expect(countVowels('rhythm')).toBe(0)
    expect(countVowels('xyz')).toBe(0)
    expect(countVowels('12345 !?')).toBe(0)
  })

  it('returns 0 for the empty string', () => {
    expect(countVowels('')).toBe(0)
  })

  it('does not count y as a vowel', () => {
    expect(countVowels('Why? Yes!')).toBe(1)
    expect(countVowels('yyy')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// mostFrequentChar
// ---------------------------------------------------------------------------

describe('20 mostFrequentChar', () => {
  it.each([
    ['hello world', 'l'],
    ['aabbb', 'b'],
    ['mississippi', 'i'],
    ['abracadabra', 'a'],
    ['x', 'x'],
    ['112233', '1'],
  ])('finds the most frequent character of %j', (input, expected) => {
    expect(mostFrequentChar(input)).toBe(expected)
  })

  it('returns the character that appears first when there is a tie', () => {
    expect(mostFrequentChar('abcabc')).toBe('a')
    expect(mostFrequentChar('abba')).toBe('a')
    expect(mostFrequentChar('xyzzy')).toBe('y')
    expect(mostFrequentChar('zzaa')).toBe('z') // first in the string, not first in the alphabet
    expect(mostFrequentChar('bcaabc')).toBe('b')
  })

  it('returns null for the empty string', () => {
    expect(mostFrequentChar('')).toBeNull()
  })

  it('is case sensitive', () => {
    expect(mostFrequentChar('aA')).toBe('a')
    expect(mostFrequentChar('aAA')).toBe('A')
    expect(mostFrequentChar('Aaa')).toBe('a')
  })

  it('counts spaces and punctuation like any other character', () => {
    expect(mostFrequentChar('a  b')).toBe(' ')
    expect(mostFrequentChar('a!b!c!')).toBe('!')
  })
})

// ---------------------------------------------------------------------------
// compress and decompress
// ---------------------------------------------------------------------------

describe('20 compress', () => {
  it.each([
    ['aaabb', 'a3b2'],
    ['aaaa', 'a4'],
    ['aaa', 'a3'],
    ['aabcccccaaa', 'a2b1c5a3'],
    ['zzzzzzzzzzzz', 'z12'],
    ['aaaAAA', 'a3A3'],
    ['   ---', ' 3-3'],
  ])('compresses %j to %j', (input, expected) => {
    expect(compress(input)).toBe(expected)
  })

  it('returns the original when the compressed text is not shorter', () => {
    expect(compress('abc')).toBe('abc') // would be a1b1c1
    expect(compress('aabb')).toBe('aabb') // a2b2 has the same length
    expect(compress('aa')).toBe('aa') // a2 has the same length
    expect(compress('ab')).toBe('ab')
    expect(compress('a')).toBe('a')
  })

  it('returns an empty string for an empty string', () => {
    expect(compress('')).toBe('')
  })

  it('treats upper and lower case as different characters', () => {
    expect(compress('aAaA')).toBe('aAaA')
    expect(compress('aaAAAA')).toBe('a2A4')
  })

  it('throws a RangeError when the text contains a digit', () => {
    expect(() => compress('aa1')).toThrow(RangeError)
    expect(() => compress('1111')).toThrow(RangeError)
    expect(() => compress('abc9')).toThrow(RangeError)
  })
})

describe('20 decompress', () => {
  it.each([
    ['a3b2', 'aaabb'],
    ['a1b1c1', 'abc'],
    ['a2b1c5a3', 'aabcccccaaa'],
    ['x1', 'x'],
    ['a12', 'aaaaaaaaaaaa'],
    [' 3-3', '   ---'],
  ])('expands %j to %j', (input, expected) => {
    expect(decompress(input)).toBe(expected)
  })

  it('returns text without digits unchanged (what compress gives back when it cannot shrink)', () => {
    expect(decompress('abc')).toBe('abc')
    expect(decompress('aabb')).toBe('aabb')
    expect(decompress('')).toBe('')
  })

  it('undoes compress for many strings', () => {
    const samples = [
      'aaabb',
      'abc',
      'aabb',
      '',
      'a',
      'aaaaaaaaaaaaaaaa',
      'aabcccccaaa',
      'hello world',
      '   ---',
      'zzzzzzzzzzzzzzzzzzzzzzzzz yyyyyyyyyyyyy',
      'AAAAAAAAAAbbbbbbbbbbCCCCCCCCCC',
    ]
    for (const sample of samples) {
      expect(decompress(compress(sample))).toBe(sample)
    }
  })

  it('throws a SyntaxError for text that is not valid compressed text', () => {
    expect(() => decompress('a3b')).toThrow(SyntaxError) // b has no count
    expect(() => decompress('3a')).toThrow(SyntaxError) // starts with a count
    expect(() => decompress('12')).toThrow(SyntaxError) // counts without characters
    expect(() => decompress('ab2c')).toThrow(SyntaxError)
  })
})

// ---------------------------------------------------------------------------
// format
// ---------------------------------------------------------------------------

describe('20 format', () => {
  it('replaces placeholders with the values', () => {
    expect(format('Hi {name}, you are {age}', { name: 'Ann', age: 30 })).toBe('Hi Ann, you are 30')
    expect(format('{greeting}, {name}!', { greeting: 'Hello', name: 'Bob' })).toBe('Hello, Bob!')
  })

  it('replaces every copy of a repeated placeholder', () => {
    expect(format('{a}-{a}-{b}', { a: 'x', b: 'y' })).toBe('x-x-y')
    expect(format('{a}{b}', { a: 1, b: 2 })).toBe('12')
  })

  it('leaves unknown placeholders untouched', () => {
    expect(format('Hi {name}, you are {age}', { name: 'Ann' })).toBe('Hi Ann, you are {age}')
    expect(format('Hi {name}')).toBe('Hi {name}')
    expect(format('Hi {name}', {})).toBe('Hi {name}')
  })

  it('ignores values that the template does not use', () => {
    expect(format('Hi {name}', { name: 'Ann', age: 30, extra: true })).toBe('Hi Ann')
  })

  it('returns a template without placeholders unchanged', () => {
    expect(format('No placeholders here', { a: 1 })).toBe('No placeholders here')
    expect(format('')).toBe('')
  })

  it('replaces falsy values such as 0, false and an empty string', () => {
    expect(format('{n} items, {flag}, [{s}]', { n: 0, flag: false, s: '' })).toBe('0 items, false, []')
  })

  it('leaves the placeholder alone when the value is null or undefined', () => {
    expect(format('{a} {b}', { a: null, b: undefined })).toBe('{a} {b}')
  })

  it('converts numbers and booleans to text', () => {
    expect(format('{n} {x} {t}', { n: 1.5, x: -2, t: true })).toBe('1.5 -2 true')
  })

  it('accepts keys with letters, digits and underscores, and is case sensitive', () => {
    expect(format('{user_1} {2nd} {Name}', { user_1: 'a', '2nd': 'b', name: 'c' })).toBe('a b {Name}')
  })

  it('does not treat other brace patterns as placeholders', () => {
    for (const template of ['{}', '{ name }', '{na me}', '{name', 'name}', '{{', '}{', '{user.name}']) {
      expect(format(template, { name: 'Ann', 'user.name': 'Bob' })).toBe(template)
    }
  })

  it('does not look inside the inserted values for more placeholders', () => {
    expect(format('{a}', { a: '{b}', b: 'x' })).toBe('{b}')
  })

  it('inserts values literally, even if they contain $ patterns', () => {
    expect(format('Cost: {p}', { p: '$&' })).toBe('Cost: $&')
    expect(format('Cost: {p}', { p: "$1 and $$ and $'" })).toBe("Cost: $1 and $$ and $'")
  })

  it('does not use inherited properties as values', () => {
    expect(format('{constructor} {toString} {hasOwnProperty}', {})).toBe('{constructor} {toString} {hasOwnProperty}')
    expect(format('{__proto__}', {})).toBe('{__proto__}')
  })

  it('works with an object that has no prototype', () => {
    const values = Object.assign(Object.create(null), { a: 1 })
    expect(format('{a} {b}', values)).toBe('1 {b}')
  })

  it('keeps line breaks and surrounding text', () => {
    expect(format('Line 1: {a}\nLine 2: {b}\n', { a: 'x', b: 'y' })).toBe('Line 1: x\nLine 2: y\n')
  })

  it('throws a TypeError when values is not an object', () => {
    expect(() => format('x', null)).toThrow(TypeError)
    expect(() => format('x', 'text')).toThrow(TypeError)
    expect(() => format('x', 5)).toThrow(TypeError)
  })
})
