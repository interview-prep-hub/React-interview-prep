# 21 - classNames and cva

**Level:** Easy | **Time:** 20 minutes | **Topics:** recursion, `Array` and `Object` helpers, truthy and falsy values, string joining, API design for component styles

## The task

In React you write `className="btn btn-primary"` all the time. As soon as a class depends on state or props, you end up gluing strings together, and the result is full of stray spaces and `undefined`. Small helpers solve this, and interviewers like to ask for them.

You will build two of them:

1. `classNames(...args)`: a tiny version of the `clsx` and `classnames` packages. It turns strings, numbers, objects and arrays into one clean class string.
2. `cva(base, config)`: a tiny version of `class-variance-authority`. It builds a function that turns a component's props (`intent="danger"`, `size="lg"`) into a class string. Many Tailwind component libraries (such as shadcn/ui) use this idea.

Work in [`index.js`](./index.js). Do not edit the test file.

## Requirements

### classNames

1. `classNames(...args)` takes any number of arguments and returns one string.
2. A string is used **exactly as given** (it is not trimmed, split or changed, so `'btn btn-primary'` stays one piece). A number is used as text (`12` gives `'12'`), except `0`, which is skipped.
3. For an object, every key whose value is **truthy** is used, in the order of the keys. The function does not look inside the values (`{ a: { b: true } }` gives `'a'`).
4. An array is **flattened recursively**: every item is treated as if it had been passed as an argument, no matter how deeply the arrays are nested.
5. These falsy values are skipped: `null`, `undefined`, `false`, `''`, `0` and `NaN`. Every other value that is not a string, number, array or object (for example `true`, a function or a symbol) is ignored too.
6. **Duplicates are not removed.** `classNames('a', 'a')` is `'a a'`.
7. The pieces are joined with exactly one space. There is no leading or trailing space, and skipped values leave no gaps (`classNames(false, 'a', null, 'b')` is `'a b'`). Nothing to join gives `''`.
8. The arguments are never changed (they may be frozen objects).

### cva

9. `cva(base, config)` returns a function `getClassName(props)`. `base` can be anything `classNames` accepts (a string, an array, an object) and can be left out (`undefined` or `null`). `config` is optional and may have three optional parts: `variants`, `defaultVariants` and `compoundVariants`. The returned function can be called without any props.
10. `variants` maps a variant name to a table of its values, and each value to class names (anything `classNames` accepts, including `''` for "no class"):

    ```js
    variants: {
      intent: { primary: 'btn-primary', danger: 'btn-danger' },
      disabled: { true: 'opacity-50', false: '' },
    }
    ```

11. The **value of a variant** is the prop with that name. If the prop is `undefined` (or missing), the value comes from `defaultVariants`. `null` is a real choice: it means "no value", so the variant adds no class and the default is not used. `false` and `0` are real values too, they are **not** "missing".
12. To find the class names, the value is turned into text and used as a key in the table: `true` finds the key `'true'`, `2` finds `'2'`. A value that is not a key adds nothing, and it does **not** fall back to the default. Props that are not variants (`id`, `onClick`, ...) are ignored.
13. The result is built in this order: `base`, then the classes of the variants **in the order the variants are declared in `config.variants`** (not in the order of the props), then the classes of the compound variants that apply (in the order they are declared), then `props.class`, then `props.className`.
14. `compoundVariants` is an array of objects. Each object has some **conditions** and the class names to add in `class` and/or `className` (if both are there, `class` comes first). A condition is a variant name with an expected value, or a list of allowed values: `{ intent: 'danger', size: ['md', 'lg'], class: 'uppercase' }`. The entry applies when **every** condition matches the variant's value (rule 11 decides the value, so defaults count). Values are compared as text, so `true` matches `'true'`. A variant with no value (or `null`) never matches.
15. `config` and `props` are never changed, and two functions made by `cva` do not share any state.

## Examples

```js
classNames('btn', { active: true, hidden: false }, ['large', null, ['rounded']])
// 'btn active large rounded'

classNames(0, 1, '', false, 'a', null, 'a')
// '1 a a'   (0, '', false and null are skipped, the duplicate stays)

classNames()
// ''
```

```js
const button = cva('btn', {
  variants: {
    intent: { primary: 'btn-primary', danger: 'btn-danger' },
    size: { sm: 'btn-sm', lg: 'btn-lg' },
  },
  defaultVariants: { intent: 'primary', size: 'sm' },
  compoundVariants: [{ intent: 'danger', size: 'lg', class: 'btn-shout' }],
})

button()
// 'btn btn-primary btn-sm'

button({ intent: 'danger', size: 'lg', className: 'ml-2' })
// 'btn btn-danger btn-lg btn-shout ml-2'
```

## Complexity target

- `classNames`: O(n), where n is the total number of items, keys and strings in all the arguments. Visit each one once. Collect the pieces in an array and call `join` once at the end.
- The function returned by `cva`: one pass over the variants and one pass over the compound variants per call. Read the config once, when `cva` is called.

## Acceptance criteria (what the tests check)

- Strings and numbers are joined with single spaces; `0` is skipped; strings are used as given; duplicates stay.
- `null`, `undefined`, `false`, `''` and `NaN` are skipped without leaving extra spaces. `true`, functions and symbols are ignored.
- Objects add their truthy keys (any truthy value counts, not only `true`) and are not searched deeper.
- Arrays are flattened at any depth (200 levels and 5000 arguments are tested), and the arguments are not changed.
- `cva` builds `base` + variants + compound variants + `class` + `className` in that order, with variants in config order.
- Defaults are used for missing or `undefined` props, `null` switches a variant off, `false` and `0` are real values, and unknown values add nothing.
- Boolean and number values find the keys `'true'`, `'false'`, `'2'`; compound conditions compare as text and accept lists of allowed values.
- `cva` works with no config, no props and no base, and it does not change its inputs.

## How to run

```bash
npm test -- exercises/js/21-classnames
```

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/js/21-classnames
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. For `classNames`, create an empty array `parts`, add the class names you find, and return `parts.join(' ')`. Then you never have to think about extra spaces.
2. Write a helper `collect(value, parts)` that handles **one** value. The first line can be `if (!value) return`: that one check skips `null`, `undefined`, `false`, `''`, `0` and `NaN`.
3. After that, look at the type: `typeof value === 'string' || typeof value === 'number'` pushes `String(value)`. `Array.isArray(value)` calls `collect` again for each item (that is the recursion). A plain object loops over `Object.keys(value)` and pushes the keys whose value is truthy. Check for arrays before objects, because an array is also an object.
4. The rest-parameter `args` is itself an array, so `collect(args, parts)` starts the whole process.
5. For `cva`, destructure the config with defaults: `const { variants = {}, defaultVariants = {}, compoundVariants = [] } = config`.
6. Write a small helper that returns the value of one variant. Compare with `undefined` on purpose: `props[name] === undefined ? defaultVariants[name] : props[name]`. If you write `props[name] || defaultVariants[name]`, then `false` and `0` are lost.
7. `Object.keys(variants).map(...)` gives you the variants in the declared order. For each one, return `variants[name][String(value)]` (or `null` when there is nothing to add). `Object.hasOwn(table, key)` protects you from keys such as `'toString'`.
8. For compound entries, destructure `{ class: add, className: addName, ...conditions }` and use `Object.entries(conditions).every(...)`. A condition value may be an array, so wrap a single value in an array first and compare with `String`.
9. Finish with one call: `classNames(base, variantClasses, compoundClasses, props.class, props.className)`. Because `classNames` skips `null` and flattens arrays, you do not need to filter anything yourself.

</details>

## Stretch goals

- Write `bindClassNames(styles)` for CSS Modules. It returns a function that works like `classNames`, but maps each class name through the `styles` object (`styles.button` is something like `'_button_x9f2a'`) and keeps names that are not in `styles` as they are. (This is `classnames/bind`.)
- Write a tiny `cn(...inputs)` that calls `classNames` and then removes earlier classes that conflict with later ones, for a few Tailwind groups such as padding (`p-2`, `p-4`) and text size (`text-sm`, `text-lg`).
- Add a `classNamesUnique` that removes duplicates and keeps the first occurrence. What does it cost, and is it ever worth it?
- Make `cva` check variant values in development: log a warning when a prop value is not a key of the variant table.
- Write TypeScript types so that `button({ size: 'huge' })` is a compile error. (Real `cva` exposes them as `VariantProps`.)

## Interview follow-ups to prepare for

1. **Why do conflicting Tailwind classes need merging (tailwind-merge)?**
   - `classNames('p-2', 'p-4')` gives `'p-2 p-4'`. Both classes are on the element, and the browser applies the one that is **later in the generated stylesheet**, not the one that is later in the `class` attribute. So a component cannot be sure that the `className` from its caller beats the component's own padding.
   - `tailwind-merge` knows the Tailwind groups (all padding classes, all text sizes, ...) and keeps only the last class of each conflicting group. The usual helper in component libraries combines it with `clsx`:

     ```js
     import { clsx } from 'clsx'
     import { twMerge } from 'tailwind-merge'

     export const cn = (...inputs) => twMerge(clsx(inputs))
     ```

   - Be ready to explain why `classNames` cannot do this itself (it knows nothing about CSS), what the merge costs on every render (parsing, which the library caches), and how you would sketch a tiny version (map each class to a group, walk from the right, keep the first class you see for each group). Remember that `hover:p-4` and `p-4` are different groups.

2. **CSS Modules vs utility classes: where does `classNames` fit?**
   - With CSS Modules every class name in a file is renamed to a unique one, so `styles.button` cannot clash with another component. You still need a helper for conditions: `` classNames(styles.button, { [styles.active]: isActive }) `` (note the computed key).
   - With utility classes (Tailwind) you compose many small classes in the markup. There is nothing to name and no unused CSS, but the class lists get long, which is why helpers such as `cva` give names to the combinations.
   - Gotcha: Tailwind finds classes by scanning your source for complete strings. `` `bg-${color}-500` `` is never found, so the style is missing in production. Write full names in a lookup object, which is exactly what the `variants` tables of `cva` are.
   - Be ready to compare: who wins when two classes conflict (stylesheet order and specificity in both cases), dynamic values at runtime (CSS variables or the `style` prop), bundle size, theming and dark mode, and what you would pick for a shared design system and why.

3. **How would you design the variants API of a component?**
   - Prefer a few named props with a closed list of values (`intent="danger" size="lg"`) over many booleans (`<Button danger large>`). Booleans allow impossible combinations such as `primary` and `danger` together.
   - Give every variant a default so that `<Button>` looks right without props. Use compound variants for combinations that need extra styles. Add the caller's `className` **last** so the caller can extend the styles (and see the previous question about conflicts).
   - A component usually splits its props: the variant props go to `cva`, the rest goes to the DOM element.

     ```jsx
     const button = cva('btn', {
       variants: { intent: { primary: 'btn-primary', danger: 'btn-danger' } },
       defaultVariants: { intent: 'primary' },
     })

     function Button({ intent, className, ...rest }) {
       return <button className={button({ intent, className })} {...rest} />
     }
     ```

   - Be ready to discuss types (real `cva` can derive the prop types from the config, so a wrong value is a compile error, while here an unknown value silently adds nothing), how to test it (it is a pure function, so no DOM is needed, as in this exercise), and how you would let a caller render another element (`as` or `asChild`).

## Learn the concepts first

- [JavaScript for React](../../../../01-basics/01-javascript-for-react.md)
- [JSX (the `className` attribute)](../../../../01-basics/03-jsx.md)
- [Styling (CSS Modules, Tailwind)](../../../../03-intermediate/07-styling.md)
- [Component patterns (designing a component's props)](../../../../03-intermediate/01-component-patterns.md)
- [TypeScript with React (typing props)](../../../../03-intermediate/08-typescript-with-react.md)
