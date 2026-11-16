// Reference solution for exercise 21: classNames and cva.
//
// Key ideas:
// - Collect the pieces in an array and join them once at the end. Then there
//   are never double, leading or trailing spaces to clean up.
// - One small recursive helper looks at a single value and decides what to do.
//   Arrays simply call the helper again for every item.
// - cva is "classNames plus a lookup table". It decides WHICH strings to use
//   (base, variants, compound variants, the caller's class) and lets
//   classNames do the joining.

/**
 * Adds the class names found in `value` to `parts`.
 * Handles one value; arrays call this function again for each item.
 */
function collect(value, parts) {
  // One check covers every falsy value: null, undefined, false, '', 0, NaN.
  if (!value) return

  if (typeof value === 'string' || typeof value === 'number') {
    parts.push(String(value))
  } else if (Array.isArray(value)) {
    for (const item of value) collect(item, parts)
  } else if (typeof value === 'object') {
    // Plain object: the key is the class name, the value decides if it counts.
    for (const key of Object.keys(value)) {
      if (key && value[key]) parts.push(key)
    }
  }
  // Anything else (true, functions, symbols) is not a class name: ignore it.
}

export function classNames(...args) {
  const parts = []
  collect(args, parts)
  return parts.join(' ')
}

/**
 * A tiny version of class-variance-authority.
 *
 *   const button = cva('btn', {
 *     variants: { size: { sm: 'btn-sm', lg: 'btn-lg' } },
 *     defaultVariants: { size: 'sm' },
 *   })
 *   button({ size: 'lg' }) // 'btn btn-lg'
 */
export function cva(base, config = {}) {
  const { variants = {}, defaultVariants = {}, compoundVariants = [] } = config

  return function getClassName(props) {
    const input = props ?? {}

    // The value of a variant: the prop if it was given, else the default.
    // We test for undefined (not falsy) because false and 0 are real values.
    // null is also a real choice: it means "no value, not even the default".
    const resolve = (name) =>
      input[name] === undefined ? defaultVariants[name] : input[name]

    const variantClasses = Object.keys(variants).map((name) => {
      const value = resolve(name)
      if (value == null) return null
      // Object keys are strings, so true becomes 'true' and 2 becomes '2'.
      const key = String(value)
      return Object.hasOwn(variants[name], key) ? variants[name][key] : null
    })

    const compoundClasses = compoundVariants.map(
      ({ class: add, className: addName, ...conditions }) => {
        const matches = Object.entries(conditions).every(([name, expected]) => {
          const value = resolve(name)
          if (value == null) return false
          const allowed = Array.isArray(expected) ? expected : [expected]
          return allowed.map(String).includes(String(value))
        })
        return matches ? [add, addName] : null
      },
    )

    return classNames(
      base,
      variantClasses,
      compoundClasses,
      input.class,
      input.className,
    )
  }
}
