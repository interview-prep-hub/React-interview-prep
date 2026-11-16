import { classNames, cva } from './index.js'

// Everything in this exercise is synchronous, so no timers are needed.

// Freezes an object and everything inside it. Writing to a frozen object
// throws in strict mode (ES modules are strict), so a function that tries to
// change its input fails the test.
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

describe('21 classNames: strings and numbers', () => {
  it('joins strings with a single space', () => {
    expect(classNames('btn', 'btn-primary', 'large')).toBe('btn btn-primary large')
  })

  it('returns an empty string when there is nothing to join', () => {
    expect(classNames()).toBe('')
    expect(classNames([])).toBe('')
    expect(classNames({})).toBe('')
  })

  it('uses a string exactly as given, even when it holds several classes', () => {
    expect(classNames('btn btn-primary', 'large')).toBe('btn btn-primary large')
  })

  it('includes numbers, except 0', () => {
    expect(classNames(1, 2, 'a')).toBe('1 2 a')
    expect(classNames('grid-cols', 12)).toBe('grid-cols 12')
    expect(classNames('a', 0, 'b')).toBe('a b')
    expect(classNames(0)).toBe('')
  })

  it('does not remove duplicates', () => {
    expect(classNames('a', 'b', 'a')).toBe('a b a')
    expect(classNames('a', { a: true }, ['a'])).toBe('a a a')
  })
})

describe('21 classNames: skipped values', () => {
  it('skips null, undefined, false, an empty string and NaN', () => {
    expect(classNames(null, undefined, false, '', NaN)).toBe('')
    expect(classNames('a', null, 'b', undefined, 'c', false, 'd', '', 'e')).toBe('a b c d e')
  })

  it('adds no extra spaces when skipped values are first, last or in the middle', () => {
    expect(classNames(false, 'a')).toBe('a')
    expect(classNames('a', false)).toBe('a')
    expect(classNames(null, 'a', undefined, 'b', '', null)).toBe('a b')
  })

  it('ignores values that are not class names: true, functions and symbols', () => {
    expect(classNames('a', true, 'b')).toBe('a b')
    expect(classNames('a', () => 'x', 'b')).toBe('a b')
    expect(classNames('a', Symbol('x'), 'b')).toBe('a b')
  })
})

describe('21 classNames: objects', () => {
  it('includes the keys whose value is truthy, in the order of the keys', () => {
    expect(classNames({ active: true, disabled: false, loading: true })).toBe('active loading')
  })

  it('decides by truthiness, not by the value true', () => {
    const result = classNames({
      one: 1,
      text: 'yes',
      emptyArray: [],
      emptyObject: {},
      zero: 0,
      empty: '',
      nothing: null,
      missing: undefined,
      notANumber: NaN,
      no: false,
    })

    expect(result).toBe('one text emptyArray emptyObject')
  })

  it('does not look inside object values', () => {
    expect(classNames({ outer: { inner: true } })).toBe('outer')
  })

  it('supports the usual pattern of one class name per condition', () => {
    const isActive = true
    const isDisabled = false
    expect(classNames('btn', { 'btn-active': isActive, 'btn-disabled': isDisabled })).toBe(
      'btn btn-active',
    )
  })
})

describe('21 classNames: arrays', () => {
  it('flattens arrays', () => {
    expect(classNames(['a', 'b'], 'c', ['d'])).toBe('a b c d')
  })

  it('flattens arrays recursively and handles objects and falsy values inside', () => {
    expect(classNames('a', ['b', [null, 'c', [false, { d: true, e: false }, [0, 'f']]]])).toBe(
      'a b c d f',
    )
  })

  it('adds no extra spaces for empty arrays and empty objects', () => {
    expect(classNames('a', [], {}, [[]], 'b')).toBe('a b')
  })

  it('copes with deep nesting and with a long list of arguments', () => {
    let deep = 'core'
    for (let i = 0; i < 200; i++) deep = ['level' + i, deep]
    const levels = Array.from({ length: 200 }, (_, i) => 'level' + (199 - i))
    expect(classNames(deep)).toBe([...levels, 'core'].join(' '))

    const many = Array.from({ length: 5000 }, (_, i) => 'c' + i)
    expect(classNames(...many)).toBe(many.join(' '))
  })
})

describe('21 classNames: realistic use and safety', () => {
  it('mixes every kind of argument', () => {
    const isLarge = true
    const hasError = false
    const extra = ['rounded', { shadow: true }]

    expect(
      classNames('btn', isLarge && 'btn-lg', hasError && 'btn-error', { active: 1 }, extra, null),
    ).toBe('btn btn-lg active rounded shadow')
  })

  it('does not change its arguments', () => {
    const args = deepFreeze([['a', { b: true }], { c: true, d: false }, 'e'])
    expect(classNames(...args)).toBe('a b c e')
    expect(args).toEqual([['a', { b: true }], { c: true, d: false }, 'e'])
  })

  it('gives the same result when called again with the same input', () => {
    const input = ['a', { b: true }]
    expect(classNames(input)).toBe('a b')
    expect(classNames(input)).toBe('a b')
  })
})

describe('21 cva: base and variants', () => {
  const button = cva('btn', {
    variants: {
      intent: { primary: 'btn-primary', secondary: 'btn-secondary' },
      size: { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' },
    },
    defaultVariants: { intent: 'primary', size: 'md' },
  })

  it('returns a function that builds the class name from props', () => {
    expect(button({ intent: 'secondary', size: 'lg' })).toBe('btn btn-secondary btn-lg')
  })

  it('works without any variants and without any props', () => {
    expect(cva('btn')()).toBe('btn')
    expect(cva('btn', {})()).toBe('btn')
    expect(cva('btn', { defaultVariants: { size: 'sm' } })()).toBe('btn')
    expect(cva('btn', { variants: { size: { sm: 'btn-sm' } } })()).toBe('btn')
  })

  it('uses the default variants for props that are missing', () => {
    expect(button()).toBe('btn btn-primary btn-md')
    expect(button({})).toBe('btn btn-primary btn-md')
    expect(button({ intent: 'secondary' })).toBe('btn btn-secondary btn-md')
    expect(button({ size: 'sm' })).toBe('btn btn-primary btn-sm')
  })

  it('treats a prop that is undefined like a missing prop', () => {
    expect(button({ intent: undefined, size: undefined })).toBe('btn btn-primary btn-md')
  })

  it('lets null switch a variant off, even when it has a default', () => {
    expect(button({ intent: null })).toBe('btn btn-md')
    expect(button({ intent: null, size: null })).toBe('btn')
  })

  it('follows the order of the variants in the config, not the order of the props', () => {
    expect(button({ size: 'lg', intent: 'secondary' })).toBe('btn btn-secondary btn-lg')
  })

  it('adds nothing for an unknown value and does not fall back to the default', () => {
    expect(button({ size: 'huge' })).toBe('btn btn-primary')
    expect(button({ intent: 'toString', size: 'constructor' })).toBe('btn')
  })

  it('ignores props that are not variants', () => {
    expect(button({ id: 'save', onClick() {}, disabled: true })).toBe('btn btn-primary btn-md')
  })

  it('accepts anything classNames accepts as base and as variant values', () => {
    const card = cva(['card', { shadow: true, hidden: false }], {
      variants: {
        padding: { none: '', small: ['p-2', 'rounded'], large: { 'p-8': true, 'p-0': false } },
      },
    })

    expect(card({ padding: 'none' })).toBe('card shadow')
    expect(card({ padding: 'small' })).toBe('card shadow p-2 rounded')
    expect(card({ padding: 'large' })).toBe('card shadow p-8')
    expect(cva(null, { variants: { size: { sm: 'btn-sm' } } })({ size: 'sm' })).toBe('btn-sm')
    expect(cva()()).toBe('')
  })
})

describe('21 cva: boolean and number variants', () => {
  it('maps true and false to the keys "true" and "false"', () => {
    const input = cva('input', {
      variants: {
        invalid: { true: 'border-red', false: 'border-gray' },
        disabled: { true: 'opacity-50', false: '' },
      },
      defaultVariants: { invalid: false, disabled: false },
    })

    expect(input()).toBe('input border-gray')
    expect(input({ invalid: true })).toBe('input border-red')
    expect(input({ disabled: true })).toBe('input border-gray opacity-50')
    expect(input({ invalid: true, disabled: true })).toBe('input border-red opacity-50')
  })

  it('treats false and 0 as real values, not as "missing"', () => {
    const panel = cva('panel', {
      variants: {
        open: { true: 'is-open', false: 'is-closed' },
        gap: { 0: 'gap-0', 4: 'gap-4' },
      },
      defaultVariants: { open: true, gap: 4 },
    })

    expect(panel()).toBe('panel is-open gap-4')
    expect(panel({ open: false })).toBe('panel is-closed gap-4')
    expect(panel({ gap: 0 })).toBe('panel is-open gap-0')
  })

  it('matches number props with string keys and the other way round', () => {
    const grid = cva('grid', { variants: { cols: { 1: 'grid-cols-1', 2: 'grid-cols-2' } } })

    expect(grid({ cols: 2 })).toBe('grid grid-cols-2')
    expect(grid({ cols: '1' })).toBe('grid grid-cols-1')
  })
})

describe('21 cva: compound variants', () => {
  const alert = cva('alert', {
    variants: {
      intent: { info: 'alert-info', danger: 'alert-danger' },
      size: { sm: 'alert-sm', lg: 'alert-lg' },
    },
    defaultVariants: { intent: 'info', size: 'sm' },
    compoundVariants: [
      { intent: 'danger', size: 'lg', class: 'alert-danger-lg' },
      { intent: ['info', 'danger'], size: 'sm', className: 'compact' },
    ],
  })

  it('adds the class only when every condition matches', () => {
    expect(alert({ intent: 'danger', size: 'lg' })).toBe(
      'alert alert-danger alert-lg alert-danger-lg',
    )
    expect(alert({ intent: 'info', size: 'lg' })).toBe('alert alert-info alert-lg')
  })

  it('takes missing props from the default variants when it checks the conditions', () => {
    // intent is danger, size falls back to sm: only the second compound matches.
    expect(alert({ intent: 'danger' })).toBe('alert alert-danger alert-sm compact')
  })

  it('accepts a list of allowed values and the className key', () => {
    expect(alert()).toBe('alert alert-info alert-sm compact')
    expect(alert({ intent: 'danger', size: 'sm' })).toBe('alert alert-danger alert-sm compact')
  })

  it('applies every matching entry, in the order they are declared, after the variants', () => {
    const tag = cva('tag', {
      variants: {
        intent: { plain: 'tag-plain', loud: 'tag-loud' },
        size: { sm: 'tag-sm', lg: 'tag-lg' },
      },
      compoundVariants: [
        { size: 'lg', class: 'second' },
        { intent: 'loud', class: ['first', { third: true }] },
        { intent: 'loud', size: 'lg', class: 'fourth' },
      ],
    })

    expect(tag({ intent: 'loud', size: 'lg' })).toBe(
      'tag tag-loud tag-lg second first third fourth',
    )
  })

  it('compares booleans and numbers by their text', () => {
    const field = cva('field', {
      variants: { disabled: { true: 'is-disabled' }, cols: { 2: 'two' } },
      compoundVariants: [{ disabled: true, cols: 2, class: 'both' }],
    })

    expect(field({ disabled: true, cols: 2 })).toBe('field is-disabled two both')
    expect(field({ disabled: true, cols: '2' })).toBe('field is-disabled two both')
    expect(field({ disabled: false, cols: 2 })).toBe('field two')
  })

  it('does not match a condition on a variant that has no value at all', () => {
    const chip = cva('chip', {
      variants: { tone: { warm: 'chip-warm' } },
      compoundVariants: [{ tone: 'warm', class: 'chip-glow' }],
    })

    expect(chip()).toBe('chip')
    expect(chip({ tone: null })).toBe('chip')
    expect(chip({ tone: 'warm' })).toBe('chip chip-warm chip-glow')
  })
})

describe('21 cva: the class and className props', () => {
  const badge = cva('badge', {
    variants: { tone: { good: 'badge-good', bad: 'badge-bad' } },
    defaultVariants: { tone: 'good' },
    compoundVariants: [{ tone: 'good', class: 'badge-glow' }],
  })

  it('appends class after everything else', () => {
    expect(badge({ class: 'mt-2' })).toBe('badge badge-good badge-glow mt-2')
  })

  it('appends className after everything else', () => {
    expect(badge({ className: 'mt-2' })).toBe('badge badge-good badge-glow mt-2')
  })

  it('appends class and then className when both are given', () => {
    expect(badge({ tone: 'bad', class: 'first', className: 'second' })).toBe(
      'badge badge-bad first second',
    )
  })

  it('accepts arrays and objects for class and className', () => {
    expect(badge({ className: ['a', { b: true, c: false }, null] })).toBe(
      'badge badge-good badge-glow a b',
    )
  })
})

describe('21 cva: safety', () => {
  it('does not change the config or the props', () => {
    const config = deepFreeze({
      variants: { size: { sm: 'btn-sm', lg: 'btn-lg' } },
      defaultVariants: { size: 'sm' },
      compoundVariants: [{ size: 'lg', class: 'big' }],
    })
    const props = deepFreeze({ size: 'lg', className: 'extra' })
    const button = cva('btn', config)

    expect(button(props)).toBe('btn btn-lg big extra')
    expect(button(props)).toBe('btn btn-lg big extra')
    expect(button()).toBe('btn btn-sm')
  })

  it('keeps separate functions independent', () => {
    const a = cva('a', { variants: { size: { sm: 'a-sm' } }, defaultVariants: { size: 'sm' } })
    const b = cva('b', { variants: { size: { sm: 'b-sm', lg: 'b-lg' } } })

    expect(a()).toBe('a a-sm')
    expect(b()).toBe('b')
    expect(b({ size: 'lg' })).toBe('b b-lg')
    expect(a({ size: 'lg' })).toBe('a')
  })

  it('builds a typical component class name', () => {
    // The pattern from a real component: split out the variant props and
    // pass className last so the caller can still add classes.
    const button = cva(['inline-flex', 'items-center'], {
      variants: {
        intent: { primary: 'bg-blue', danger: 'bg-red' },
        size: { sm: 'h-8', lg: 'h-12' },
        disabled: { true: 'opacity-50 pointer-events-none', false: '' },
      },
      defaultVariants: { intent: 'primary', size: 'sm', disabled: false },
      compoundVariants: [{ intent: 'danger', size: 'lg', class: 'font-bold' }],
    })

    function buttonClass({ intent, size, disabled, className }) {
      return button({ intent, size, disabled, className })
    }

    expect(buttonClass({})).toBe('inline-flex items-center bg-blue h-8')
    expect(buttonClass({ intent: 'danger', size: 'lg', disabled: true, className: 'ml-2' })).toBe(
      'inline-flex items-center bg-red h-12 opacity-50 pointer-events-none font-bold ml-2',
    )
  })
})
