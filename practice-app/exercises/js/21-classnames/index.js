// Exercise 21: classNames and cva.
// Read README.md in this folder for the full requirements.

/**
 * Builds one class name string from strings, numbers, objects and arrays.
 *
 *   classNames('btn', { active: true, hidden: false }, ['a', ['b']])
 *   // 'btn active a b'
 */
export function classNames(...args) {
  // TODO 1: decide how to collect the pieces. An array of strings that you
  //         join with ' ' at the very end means you never have to clean up
  //         extra spaces.
  // TODO 2: write a small helper that looks at ONE value and adds what it
  //         finds to that array. Think about which types it must handle:
  //         falsy values, strings, numbers, arrays, objects, everything else.
  // TODO 3: arrays can contain arrays. What should the helper do for an array?
  return undefined
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
  // TODO 4: read variants, defaultVariants and compoundVariants from config.
  //         Give each of them a safe default so cva('btn') works.

  return function getClassName(props) {
    // TODO 5: find the value of each variant: the prop if it was given,
    //         otherwise the default. Be careful with false and 0, they are
    //         real values and must not be mistaken for "missing".
    // TODO 6: look up the class names of those values in `variants`.
    // TODO 7: check every entry of compoundVariants. An entry applies when
    //         all of its conditions match. Its class names are in `class`
    //         and/or `className`.
    // TODO 8: put it all together in the right order with classNames:
    //         base, variants, compound variants, then props.class and
    //         props.className.
    return undefined
  }
}
