# TypeScript with React

> **Level:** Intermediate   **Time:** about 70 minutes   **Read first:** [Components and props](../01-basics/04-components-and-props.md), [useState in depth](../02-hooks/02-usestate-in-depth.md), [useRef](../02-hooks/04-useref.md)

## What you will learn
- Read and write basic TypeScript (types, interfaces, unions, generics, utility types) with no earlier TypeScript needed.
- Type props, children, events, state, refs, reducers, context and custom hooks in React 19.
- Build generic components and components that extend native HTML element props.
- Choose between `unknown`, `any`, `as`, `as const` and `satisfies`, and explain why.
- Validate API data at run time with Zod and get the type for free.
- Set up the `tsconfig` options that matter and explain what the TypeScript 7 compiler changes.

## 1. What TypeScript is, and how it runs with React
TypeScript (TS) is JavaScript plus **types**. A type is a label that says what shape a value has: "a number", "an object with a `name` string". A tool called the **type checker** reads your code before it runs and reports mismatches. Think of a spell checker for your program.

Three facts matter for React work:
- Types exist only while you write and build. They are erased, so the browser runs plain JavaScript.
- Vite and Vitest only strip types. They do **not** check them. The checking is done by `tsc` (the TypeScript compiler) and by your editor. The Vite React template builds with `tsc -b && vite build` for this reason.
- Use `.ts` for files without JSX and `.tsx` for files with JSX.

```bash
npm create vite@latest my-app -- --template react-ts
```

```ts
const price: number = 10
price.toUpperCase()
// error TS2339: Property 'toUpperCase' does not exist on type 'number'.
```

**What happens, step by step:**
1. `: number` is a **type annotation**. It says `price` holds a number.
2. `toUpperCase` is a string method, so the checker flags the call before anything runs.
3. Your editor underlines it in red, and `tsc` prints the same message and exits with an error.
4. Vite would still serve this file, and it would crash in the browser. The checker warns you, it does not stop the code.

**Common mistake:** thinking types check data at run time.
```ts
const user = (await res.json()) as User   // wrong idea: nothing checks the server data
```
```ts
const data: unknown = await res.json()    // better: say "I do not know yet", then validate (section 12)
```
Why: `as` only tells the checker "trust me". The real data can still have any shape.

## 2. Basic types, objects, and type vs interface
```ts
let userName: string = "Asha"
let age = 30                           // inferred: number (no annotation needed)
let tags: string[] = ["react", "ts"]
let pair: [string, number] = ["age", 30]   // a tuple: fixed length and order

function add(a: number, b: number): number {
  return a + b
}
const double = (n: number) => n * 2   // return type inferred as number

type User = { id: number; name: string; email?: string }   // email is optional
const u: User = { id: 1, name: "Asha" }
```

**What happens, step by step:**
1. TypeScript **infers** types from values, so `age` is a `number` without help. Annotate function parameters; let the rest be inferred.
2. `string[]` means "an array of strings". `[string, number]` is a tuple.
3. `email?: string` means the key may be missing, and when present it is a string.
4. `type User = {...}` gives a name to a shape so you can reuse it.

`type` and `interface` both describe object shapes:
```ts
interface Person { name: string }
interface Employee extends Person { company: string }   // extend with "extends"
type Admin = Person & { role: "admin" }                  // combine with "&" (intersection)
type Id = number | string                                // only "type" can name a union
interface Person { age?: number }                        // same name again: merged into one (interface only)
```
Both work for props. Pick one style per team. A common rule: `type` by default, `interface` when you want `extends` or merging.

**Common mistake:** mixing up "optional" and "can be undefined".
```ts
type A = { email?: string }               // key may be missing
type B = { email: string | undefined }    // key must be there (value may be undefined)
const a: A = {}                           // ok
const b: B = {}                           // error TS2741: Property 'email' is missing
```
Fix: use `?` when callers may leave the prop out. Use `| undefined` only when the key is always present.

## 3. Unions, literal types and narrowing
A **union** (`A | B`) means "one of these". A **literal type** is a type with exactly one value, like `"idle"`.
```ts
type Status = "idle" | "loading" | "error"
let s: Status = "idle"
s = "done"        // error TS2322: Type '"done"' is not assignable to type 'Status'.

function show(value: string | number) {
  if (typeof value === "string") return value.toUpperCase()   // value is string here
  return value.toFixed(2)                                      // value is number here
}
```
**Narrowing** means TypeScript shrinks a union to one member inside an `if`. It understands `typeof`, `===`, `in`, `instanceof`, `Array.isArray` and truthiness checks.

A **discriminated union** gives every member a literal field (the tag) that tells them apart. It is the most useful pattern in React TypeScript:
```ts
type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: string[] }

function render(r: LoadState): string {
  switch (r.status) {
    case "loading": return "Loading..."
    case "error": return r.message            // r is the error member: message exists
    case "success": return r.data.join(", ")  // r is the success member: data exists
    default: {
      const unreachable: never = r            // fails to compile if a new status is added
      return unreachable
    }
  }
}
```

**What happens, step by step:**
1. `r.status` is the tag. Inside each `case`, the checker knows which member `r` is.
2. `r.message` is only legal in the `"error"` case. Reading it elsewhere is a compile error.
3. In `default`, all members are used up, so `r` has type `never`. If you add `{ status: "empty" }` later, `r` is no longer `never` and the build fails until you handle it.

**Common mistake:** one wide type with optional fields.
```ts
type Req = { status: string; data?: string[]; message?: string }   // allows impossible states
function g(r: Req) { return r.data.length }   // error: 'r.data' is possibly 'undefined'
```
Fix: use the discriminated union above. Each state carries only its own fields.

## 4. unknown vs any, as const and satisfies
`any` switches the checker off for that value. `unknown` means "could be anything, so prove it first".
```ts
let a: any = "hi"
a.foo.bar()          // no error, crashes at run time

let un: unknown = JSON.parse('{"a":1}')
un.a                 // error TS18046: 'un' is of type 'unknown'.
if (typeof un === "object" && un !== null && "a" in un) {
  console.log(un.a)  // allowed now, and un.a is itself unknown
}
```
Use `unknown` for data you do not control (API responses, `JSON.parse`, caught errors). Treat `any` as a last resort.

`as const` freezes a value to its narrowest type. It is how you turn a list into a union:
```ts
const sizes = ["sm", "md", "lg"] as const   // readonly ["sm", "md", "lg"]
type Size = (typeof sizes)[number]           // "sm" | "md" | "lg"
```
Without `as const`, `sizes` would be `string[]` and `Size` would just be `string`.

`satisfies` checks a value against a type **without widening** it. An annotation (`: Type`) replaces what TypeScript knows. `satisfies` keeps it:
```ts
type Sizes = Record<string, string | number>
const fontSizes = { small: 12, large: "2rem" } satisfies Sizes
fontSizes.small.toFixed(0)      // ok: still a number
fontSizes.large.toUpperCase()   // ok: still a string
fontSizes.huge                  // error: 'huge' does not exist (typo caught)

const annotated: Sizes = { small: 12, large: "2rem" }
annotated.small.toFixed(0)      // error: 'toFixed' does not exist on type 'string | number'
```
It also catches typos in style objects: `{ wrong: { colour: "x" } } satisfies Record<string, CSSProperties>` reports "Did you mean to write 'color'?".

**Common mistake:** using `as` or `!` to silence an error.
```ts
const el = document.getElementById("root")!   // "!" says "never null": a lie if the id is wrong
```
```ts
const el = document.getElementById("root")
if (el === null) throw new Error("Missing #root")   // checked, and el is narrowed to HTMLElement
```
Why: `as` and `!` remove safety. Narrowing keeps it. (`!` is accepted in one place: `createRoot(document.getElementById('root')!)` in the Vite template.)

## 5. Generics and utility types
A **generic** is a function (or type) with a type parameter, like a function argument but for types. `T` is a placeholder that is filled in per use.
```ts
function first<T>(items: T[]): T | undefined {
  return items[0]
}
const n = first([1, 2, 3])      // T is number, so n is number | undefined
const t = first(["a", "b"])     // T is string, so t is string | undefined

function byId<T extends { id: number }>(items: T[], id: number) {   // constraint: T must have an id
  return items.find((i) => i.id === id)
}
```
**What happens, step by step:** you call `first([1, 2, 3])`, TypeScript looks at the argument, decides `T = number`, and fills it into the signature. `extends` limits what `T` may be, so the body can rely on `i.id`.

**Utility types** build new types from old ones:
```ts
type U = { id: number; name: string; email: string }
type Draft = Partial<U>                    // every key optional
type Preview = Pick<U, "id" | "name">      // keep only these keys
type NewUser = Omit<U, "id">               // drop these keys
type UsersById = Record<number, U>         // an object used as a map

async function loadUser(): Promise<U> { return { id: 1, name: "A", email: "a@b.c" } }
type Loaded = Awaited<ReturnType<typeof loadUser>>   // ReturnType gives Promise<U>, Awaited unwraps it: U
```
Also handy: `Required`, `Readonly`, `NonNullable`, `Parameters<typeof fn>`, `Extract`, `Exclude`.

**Common mistake:** trusting `Record<string, U>` lookups.
```ts
const byId: Record<number, U> = {}
const x = byId[5]     // typed as U, not U | undefined, though it is undefined at run time
```
Fix: write `Record<number, U | undefined>` or turn on the `noUncheckedIndexedAccess` option.

## 6. Typing props and children
Props are one object, so you type that object. Write a `type` and put it on the destructured parameter.
```tsx
import type { ReactNode } from "react"

type CardProps = {
  title: string
  subtitle?: string       // optional
  children: ReactNode     // anything React can render
}

export function Card({ title, subtitle = "No subtitle", children }: CardProps) {
  return (
    <section>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      {children}
    </section>
  )
}

<Card title="Hi">Hello</Card>   // ok
<Card>Hello</Card>              // error TS2741: Property 'title' is missing
```

**What happens, step by step:**
1. `CardProps` lists each prop and its type. `?` makes `subtitle` optional.
2. `children: ReactNode` accepts strings, numbers, elements, arrays, `null` and `undefined`. `ReactElement` is narrower (JSX elements only), and you cannot restrict children to one component type.
3. `subtitle = "No subtitle"` is a plain JavaScript default value. It applies when the prop is missing or `undefined`. The type stays `string` inside the component.
4. Function props look like `onSelect: (id: number) => void`. Style props use `CSSProperties`.

Good to know:
- `PropsWithChildren<{ title: string }>` is shorthand for adding `children`. Writing `children: ReactNode` yourself is clearer.
- **Do not use `Component.defaultProps`** on function components: React 19 ignores it and the type no longer exists. Use default values.
- **`React.FC` is optional.** The react.dev TypeScript guide types plain functions and never uses it. `FC` has had no implicit `children` since @types/react 18, and it cannot be generic. Both styles are accepted in code review, so follow your team.
- The global `JSX` namespace is gone in @types/react 19. You rarely need a return type, but if you do, write `React.JSX.Element`.

**Common mistake:** forgetting `children` in the props type.
```tsx
function Box(props: { color: string }) { return <div>{props.children}</div> }   // error: 'children' does not exist
```
Fix: add `children: ReactNode` (or `children?: ReactNode` when it is optional).

## 7. Typing events
React wraps browser events in its own types. The element goes in angle brackets.
```tsx
import { useState } from "react"
import type { ChangeEvent, KeyboardEvent, MouseEvent, SubmitEvent } from "react"

export function SearchBox() {
  const [text, setText] = useState("")

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setText(e.target.value)
  }
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") setText("")
  }
  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    console.log("search for", text)
  }
  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    console.log(e.currentTarget.textContent)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={text} onChange={handleChange} onKeyDown={handleKeyDown} />
      <button type="submit" onClick={handleClick}>Search</button>
    </form>
  )
}
```

**What happens, step by step:**
1. `ChangeEvent<HTMLInputElement>` tells TypeScript that `e.target` is an input, so `e.target.value` is a `string`.
2. `KeyboardEvent` adds `key`, `code` and modifier flags.
3. `e.currentTarget` is the element that **owns the handler** (the button). `e.target` is the element that was actually hit, which may be a child. Prefer `currentTarget` when you need the element.
4. `SubmitEvent<HTMLFormElement>` is the submit type in current @types/react (checked against 19.3.0; it first appeared in 19.2.10). `FormEvent` is marked deprecated, so older code and tutorials that use `FormEvent<HTMLFormElement>` still compile but show a strikethrough.

Two shortcuts: inline handlers need no annotation (`onChange={(e) => setText(e.target.value)}` types `e` for you), and for a stored handler you can type the whole function: `const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => ...`. `onKeyPress` is deprecated, so use `onKeyDown` or `onKeyUp`.

**Common mistake:** a generic-less event type.
```tsx
function handle(e: ChangeEvent) { return e.target.value }
// error TS2339: Property 'value' does not exist on type 'EventTarget & Element'.
```
Fix: `ChangeEvent<HTMLInputElement>`. Also avoid `e: any`, it hides every typo.

## 8. Typing useState, useRef and useReducer
**useState** infers the type from the first value. Say it yourself when the first value is `null` or an empty array:
```tsx
const [count, setCount] = useState(0)                   // number
const [user, setUser] = useState<User | null>(null)     // User | null
const [items, setItems] = useState<string[]>([])        // without <string[]>, [] is inferred as never[]
setUser((prev) => (prev === null ? prev : { ...prev, name: "Bo" }))   // the updater sees User | null
```
`useState(null)` alone would type the state as just `null`, and `useState([])` would be `never[]` (pushing a string is an error).

**useRef** has two jobs, and React 19 types make both need an argument:
```tsx
import { useEffect, useRef } from "react"

const inputRef = useRef<HTMLInputElement>(null)           // for a DOM element: starts as null
const timerId = useRef<number | undefined>(undefined)     // for a mutable value
const renders = useRef(0)                                 // inferred: number

useEffect(() => {
  inputRef.current?.focus()   // current is HTMLInputElement | null, so use ?.
}, [])
// <input ref={inputRef} />
```
- `useRef()` with no argument is an error in @types/react 19 ("Expected 1 arguments, but got 0").
- `useRef<HTMLInputElement>(null)` returns `RefObject<HTMLInputElement | null>`. In v19 every ref is mutable, and `MutableRefObject` is deprecated.
- React sets `current` after mount, so before that it is `null`. The `?.` handles it.

**useReducer** with a discriminated union of actions gives you checked `dispatch` calls:
```tsx
type State = { count: number }
type Action =
  | { type: "increment" }
  | { type: "add"; by: number }
  | { type: "reset" }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "increment": return { count: state.count + 1 }
    case "add": return { count: state.count + action.by }   // action.by exists only here
    case "reset": return { count: 0 }
  }
}

const [state, dispatch] = useReducer(reducer, { count: 0 })   // types come from the reducer
dispatch({ type: "add", by: 5 })    // ok
dispatch({ type: "add" })           // error TS2345: Property 'by' is missing
dispatch({ type: "nope" })          // error TS2322: not assignable to "add" | "increment" | "reset"
```

**What happens, step by step:**
1. `Action` lists every legal action and its payload. `type` is the tag.
2. Inside `case "add"`, the checker narrows `action`, so `action.by` is a `number`.
3. The `: State` return type makes a missing `case` an error (TS2366: "Function lacks ending return statement"). This is why you annotate the reducer's return type.
4. `useReducer(reducer, initial)` infers `state` and `dispatch` from the reducer. Do not pass `useReducer<typeof reducer>`, it is a compile error in the current types.

Types vanish at run time. In a test, `reducer({ count: 1 }, { type: "nope" })` called from untyped code returned `undefined`. Types protect your own code, not data from outside.

**Common mistake:** `useRef` with no argument.
```tsx
const inputRef = useRef<HTMLInputElement>()       // error TS2554: Expected 1 arguments, but got 0
```
```tsx
const inputRef = useRef<HTMLInputElement>(null)   // fixed
```
Why: React 19 types always want an initial value. Use `null` for DOM refs.

## 9. Typing context and custom hooks
`createContext` needs a default value. Real values only exist inside a provider, so use `null` and hide it behind a hook:
```tsx
import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"

type Theme = "light" | "dark"
type ThemeValue = { theme: Theme; toggle: () => void }

const ThemeContext = createContext<ThemeValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")
  const value: ThemeValue = {
    theme,
    toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")),
  }
  return <ThemeContext value={value}>{children}</ThemeContext>   // React 19: the context itself is the provider
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext)       // ThemeValue | null
  if (value === null) {
    throw new Error("useTheme must be used inside <ThemeProvider>")
  }
  return value                                  // narrowed to ThemeValue
}
```

**What happens, step by step:**
1. `createContext<ThemeValue | null>(null)` is honest: outside a provider the value is `null`.
2. `useTheme` checks for `null`, throws a clear error, and returns a value that is **never null**. Callers write `const { theme } = useTheme()` with no checks.
3. In a test, rendering a component that calls `useTheme()` without the provider throws `useTheme must be used inside <ThemeProvider>`. Inside the provider, the toggle button changes from "Theme: light" to "Theme: dark".
4. `<ThemeContext value=...>` works in React 19. In older code you will see `<ThemeContext.Provider value=...>`. For more on context see [useContext](../02-hooks/05-usecontext.md).

**Common mistake:** a fake default.
```tsx
const ThemeContext = createContext({} as ThemeValue)   // lies: toggle is undefined without a provider
```
Fix: use `| null` and the guard hook. A forgotten provider then fails loudly with a clear message.

**Custom hooks** are plain functions, so you type the parameters and the return value. For a pair, return a **tuple** with `as const`:
```ts
function useToggle(initial = false) {
  const [on, setOn] = useState(initial)
  const toggle = useCallback(() => setOn((v) => !v), [])
  return [on, toggle] as const        // readonly [boolean, () => void]
}
const [isOpen, toggleOpen] = useToggle()   // each name gets the right type
```
Without `as const`, TypeScript infers `(boolean | (() => void))[]`, a list of mixed things, and every destructured value becomes that union. For three or more values, return an object (`{ on, toggle }`): names document themselves and order does not matter. More hook design is in [Custom hooks](../02-hooks/08-custom-hooks.md).

## 10. Generic components
A **generic component** works with any data type and keeps the types connected. A list that renders items of type `T` is the classic case:
```tsx
import type { ReactNode } from "react"

type ListProps<T> = {
  items: readonly T[]
  getKey: (item: T) => string | number
  renderItem: (item: T) => ReactNode
}

export function List<T>({ items, getKey, renderItem }: ListProps<T>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={getKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  )
}

<List items={[{ id: 1, name: "Asha" }]} getKey={(u) => u.id} renderItem={(u) => u.name} />
```
**What happens, step by step:**
1. You pass `items` with objects like `{ id: number; name: string }`. TypeScript infers `T` from it.
2. In `getKey` and `renderItem`, `u` is that same type, so `u.name` autocompletes and `u.nmae` is an error.
3. The same `List` works for numbers, users or products, with full checking each time.

A `Select` shows a constraint. The values are strings, and the picked value must be one of the options:
```tsx
type SelectProps<T extends string> = {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
}

export function Select<T extends string>({ options, value, onChange }: SelectProps<T>) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

const sizes = ["sm", "md", "lg"] as const
// const [size, setSize] = useState<(typeof sizes)[number]>("md")
// <Select options={sizes} value={size} onChange={setSize} />   // setSize accepts "sm" | "md" | "lg"
```
The DOM hands you a plain `string`, so `as T` is needed once inside the component. That one cast keeps every caller safe.

Notes: use `function` declarations for generic components. A generic arrow function in a `.tsx` file needs `<T,>` (with the comma) so it is not read as a JSX tag. `React.FC` cannot declare a type parameter, which is one more reason it is optional.

**Common mistake:** typing the list as `any[]` or `unknown[]`.
Fix: make it generic. `any` loses all checking inside `renderItem`, and `unknown` forces a cast at every call.

## 11. Native element props, ref as a prop and the polymorphic `as` prop
A design-system `Button` should accept everything a `<button>` accepts. Do not retype `onClick`, `disabled` and the rest. Borrow them:
```tsx
import type { ComponentProps } from "react"

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "ghost" }

export function Button({ variant = "primary", className, ...rest }: ButtonProps) {
  return <button className={`btn btn-${variant} ${className ?? ""}`.trim()} {...rest} />
}

<Button onClick={(e) => e.currentTarget.blur()} disabled type="submit">Save</Button>
```
**What happens, step by step:**
1. `ComponentProps<"button">` is every prop of a `<button>`: `onClick`, `disabled`, `type`, `aria-*` and more.
2. `& { variant?: ... }` adds your own props. `e` in `onClick` is typed for you.
3. `...rest` forwards everything else to the real element.

In React 19, **`ref` is an ordinary prop**, and `ComponentProps<"button">` includes it. Because `rest` includes `ref`, this `Button` already forwards refs with no `forwardRef`. In a test, `ref.current` was the real `BUTTON` element. For a component that is not spreading native props, type the ref yourself:
```tsx
import type { Ref } from "react"

type InputProps = { label: string; ref?: Ref<HTMLInputElement> }

export function LabeledInput({ label, ref }: InputProps) {
  return <label>{label} <input ref={ref} /></label>
}
```
Use `ComponentPropsWithoutRef<"button">` when you do not want `ref` in the props. `forwardRef` still works in 19 and is expected to be deprecated later, so new code passes `ref` as a prop. See [useRef](../02-hooks/04-useref.md).

**Common mistake:** a clash between your prop and a native prop.
```tsx
type FieldProps = ComponentProps<"input"> & { size: "sm" | "lg" }   // native size is a number
// <Field size="sm" /> fails: the intersection reduces the props type to never
```
```tsx
type FieldProps = Omit<ComponentProps<"input">, "size"> & { size: "sm" | "lg" }   // fixed
```
Fix: `Omit` the native key first, then add your own.

**Polymorphic `as` prop (brief).** Sometimes one component must render different tags (`<Box as="a" href="/docs">`). The type must follow the tag you pick:
```tsx
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react"

type BoxProps<T extends ElementType> = {
  as?: T
  children?: ReactNode
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">

export function Box<T extends ElementType = "div">({ as, children, ...rest }: BoxProps<T>) {
  const Tag: ElementType = as ?? "div"
  return <Tag {...rest}>{children}</Tag>
}
// <Box>plain</Box>   <Box as="a" href="/docs">link</Box>   (href is only allowed because as="a")
```
This is advanced and easy to get wrong. Keep it for design-system code. More in Advanced patterns (planned).

## 12. Typing API data and validating it with Zod
`res.json()` returns `Promise<any>`. If you write `as User`, you only promise the shape. A wrong response then breaks somewhere far from the cause. The safe route: read it as `unknown` and **validate at run time**. A library like **Zod** lets you write one schema that does the check and also gives the type:
```ts
import { z } from "zod"

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  role: z.enum(["admin", "member"]),
})
export type User = z.infer<typeof UserSchema>   // { id: number; name: string; role: "admin" | "member" }

export async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: unknown = await res.json()
  return UserSchema.parse(data)          // throws a ZodError if the shape is wrong
}
```
**What happens, step by step:**
1. `UserSchema` is a run-time object that knows the rules.
2. `z.infer<typeof UserSchema>` reads the schema and produces the matching TypeScript type. One source of truth, no duplicated `type User`.
3. `data` is `unknown`, so the checker forces you to validate before using it.
4. `parse` returns a correctly typed `User` or throws. `safeParse` returns `{ success: true, data } | { success: false, error }`, a discriminated union, so you narrow on `result.success`.

In a test, `{ id: 1, name: "A", role: "admin" }` passes, and `{ id: "1", name: "A", role: "boss" }` fails with 2 issues (`id` is not a number, `role` is not allowed). Forms use the same idea, see [Forms with libraries](./04-forms-with-libraries.md). Fetching patterns are in [Data fetching](./02-data-fetching.md).

**Common mistake:** declaring `type User` by hand and also writing a validator, then letting them drift apart.
Fix: write the schema once and derive the type with `z.infer`.

## 13. Type-safe routing, in one page
URL values are strings and may be missing, so convert and validate them like any outside data (`Number(id)`, or a Zod schema). Some routers and frameworks can also generate types for route paths and params, which makes broken links a compile error. Check your router's docs for it, see [React Router](./03-react-router.md). A cheap hand-made version uses `as const satisfies`:
```ts
const routes = { home: "/", about: "/about" } as const satisfies Record<string, `/${string}`>
type Path = (typeof routes)[keyof typeof routes]   // "/" | "/about"
```
`satisfies` makes sure every route starts with `/`. `as const` keeps the exact strings, so `Path` is a precise union.

## 14. tsconfig essentials and the TypeScript 7 compiler
The Vite `react-ts` template (create-vite 9.3.4) writes a `tsconfig.app.json` like this:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```
The options that matter:
- **`strict`**: turns on the strict checks (null checks, no implicit `any`). It is on by default from TypeScript 6 and 7. On older setups set `"strict": true` yourself.
- **`jsx: "react-jsx"`**: the automatic JSX runtime, so you do not `import React` in every file. Never use `"jsx": "react"` in new code.
- **`moduleResolution: "bundler"`**: matches how Vite resolves imports.
- **`verbatimModuleSyntax`**: forces `import type { ... }` for type-only imports. That is why this lesson writes `import type { ReactNode } from "react"`.
- **`noEmit`**: `tsc` only checks. Vite produces the output.
- **`types`**: the default is now an empty list, so list ambient types you need, like `vite/client` or `vitest/globals`.
- **`paths`**: aliases such as `"@/*": ["./src/*"]`. `baseUrl` is gone in TypeScript 7, so use `./` in the path and make Vite agree (`resolve.alias` or `resolve.tsconfigPaths: true`).

**What TypeScript 7 changes.** TypeScript 7.0 (announced 2026-07-08) is the same compiler logic ported to Go (native code). It installs as the normal `typescript` package, and `tsc` is now the native program. The TypeScript team reports about 8x to 12x faster full builds and a faster editor (a vendor figure, not measured here). For you as an app developer:
- **Same language and the same type rules.** Your React types do not change. Code that compiled cleanly on TypeScript 6 (without `ignoreDeprecations`) should compile the same on 7.
- **Old options are errors**: `target: es5`, `downlevelIteration`, `moduleResolution: node`, `baseUrl`.
- **The old JavaScript programmatic API is gone in 7.0.** Tools that import `typescript` as a library need TypeScript 6 side by side. `typescript-eslint` 8.72 supports only versions below 6.1, so the template's ESLint option pins TypeScript 6. A new API is planned for 7.1 (a beta appeared on 2026-10-20).
- **Vite, Vitest, esbuild, SWC and Babel are not affected.** They strip types and never call the compiler API.

Net effect: faster `tsc` and editor, a few removed old options, and possibly two TypeScript versions in one project while tools catch up.

## How interviewers test this
- **Typing the basics fluently**: props with children, events, `useState<User | null>`, `useRef<HTMLInputElement>(null)`. They want correct types, written without hesitation, not `any`.
- **Discriminated unions**: for reducers, request state and component variants. A strong answer says the tag narrows the type and an exhaustive `never` check catches missing cases.
- **`unknown` over `any`**: and the idea that types do not validate run-time data. Mentioning Zod or another validator is a plus.
- **Generics and native props**: a typed `List<T>` or `Select<T>`, `ComponentProps<"button">`, `Omit` to avoid prop clashes.
- **Current knowledge**: React 19 type changes (`useRef` needs an argument, global `JSX` gone, `ref` as a prop). Red flags: `React.FC` as a rule, `!` everywhere, `as` to silence errors, `any` as a default, typing everything that is already inferred.

## Interview questions and model answers
### Q1. What is the difference between `type` and `interface`? (Easy)
Both describe the shape of objects, and both work for props. `interface` can be extended with `extends` and merged when declared twice (declaration merging). `type` can name anything: unions, tuples, primitives, mapped types. Intersections (`&`) are the `type` way to combine shapes. For props, either is fine, so follow the team style. A common rule is `type` by default and `interface` when you need merging or class-style `extends`.

### Q2. How do you type props and `children`? Do you use `React.FC`? (Easy)
Write a `type` for the props and annotate the destructured parameter: `function Card({ title, children }: { title: string; children: ReactNode })`. `ReactNode` covers everything renderable. `PropsWithChildren` is shorthand. Default values are normal destructuring defaults (`size = "md"`), because `defaultProps` is ignored on function components in React 19. `React.FC` is optional: it is not wrong, but it adds nothing in modern types, has no implicit `children`, and cannot be generic, so most guides skip it.

### Q3. How do you type event handlers? (Easy)
Use the React event type with the element: `ChangeEvent<HTMLInputElement>`, `MouseEvent<HTMLButtonElement>`, `KeyboardEvent<HTMLInputElement>`, and `SubmitEvent<HTMLFormElement>` for forms in current @types/react (`FormEvent` is deprecated). For an inline handler, skip the annotation because inference types `e`. Use `e.currentTarget` for the element that owns the handler and `e.target` for the element that was hit. A stored handler can use `ChangeEventHandler<HTMLInputElement>`.

### Q4. How do you type `useState` and `useRef`? What changed in React 19? (Medium)
`useState` infers from the initial value. Add a type argument when the start value is `null` or empty: `useState<User | null>(null)`, `useState<string[]>([])`. For DOM refs use `useRef<HTMLInputElement>(null)`, and read `ref.current?.focus()` because `current` is `null` before mount. In @types/react 19, `useRef` requires an argument (`useRef()` is an error), every ref is mutable, `MutableRefObject` is deprecated, and `ref` is a normal prop for function components so `forwardRef` is no longer needed.

### Q5. What is the difference between `any` and `unknown`? (Easy)
`any` turns type checking off: you can do anything with it, and mistakes show up at run time. `unknown` is the safe top type: you can assign anything to it, but you cannot use it until you narrow it with `typeof`, `in`, `instanceof` or a validator. Use `unknown` for API data, `JSON.parse` results and `catch` errors. In practice, parse API data with a Zod schema: `const data: unknown = await res.json(); return UserSchema.parse(data)`.

### Q6. What is a discriminated union, and how does it help `useReducer`? (Medium)
It is a union where every member has the same literal field, the tag (`type` or `status`). Checking the tag narrows the type, so the payload fields become available. For `useReducer`, `Action = { type: "add"; by: number } | { type: "reset" }` makes `dispatch({ type: "add" })` a compile error, narrows `action.by` inside `case "add"`, and with a `: State` return type or a `never` default it flags a forgotten case. The same pattern models loading/error/success state without impossible combinations.

### Q7. How do you type context so consumers never deal with `null`? (Medium)
Create the context with `createContext<Value | null>(null)`, which is honest. Then export a custom hook that calls `useContext`, throws a clear error when the value is `null`, and returns `Value`. TypeScript narrows after the `null` check, so every consumer gets the non-null type. The bad alternative is `createContext({} as Value)`, which lies and fails later with an unclear error.

### Q8. How do you extend native HTML props in your own component? (Medium)
Use `ComponentProps<"button">` (or `ComponentPropsWithoutRef<"button">`) and intersect your own props: `type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "ghost" }`. Destructure your props and spread the rest onto the element. If your prop name collides with a native one (`size` on `input`), use `Omit` first, or the intersection reduces to `never`. In React 19 `ComponentProps` includes `ref`, so spreading `rest` forwards the ref without `forwardRef`.

### Q9. How do you write a generic component such as `List<T>` or `Select<T>`? (Medium)
Declare a type parameter on the function and on the props type: `function List<T>({ items, renderItem }: { items: T[]; renderItem: (item: T) => ReactNode })`. TypeScript infers `T` from `items`, so `renderItem` gets the right item type. Add a constraint with `extends` when you need something from `T` (`T extends { id: number }`, or `T extends string` for a `Select`). Use a `function` declaration, because an arrow function in `.tsx` needs `<T,>`, and `React.FC` cannot take a type parameter.

### Q10. What does `satisfies` do, and how is it different from `as` and a type annotation? (Medium)
`satisfies` checks that a value matches a type but keeps the value's own, narrower type. An annotation (`: Type`) replaces the type with the wider one, so you lose details such as which keys exist. `as` skips the check and just asserts, so it can hide errors. With `const sizes = { small: 12, large: "2rem" } satisfies Record<string, string | number>`, typos in the shape are caught, `sizes.small` is still a `number`, and `sizes.huge` is an error. Pair it with `as const` for exact literal values, as in a routes table.

## Common mistakes and gotchas
- **`any` as a default**: it silently disables checks. Use `unknown` and narrow, or a precise type.
- **`!` and `as` to silence errors**: they hide real bugs. Check for `null` and narrow, or fix the type.
- **Over-typing**: `const count: number = 0` adds noise. Let inference work, and annotate function parameters and public boundaries.
- **Optional (`?`) vs `| undefined`**: `?` means the key may be missing, `| undefined` means it must be present. Pick on purpose.
- **`useState([])` and `useState(null)`**: they infer `never[]` and `null`. Write `useState<string[]>([])`, `useState<User | null>(null)`.
- **`useRef()` with no argument**: an error in @types/react 19. Pass `null` for DOM refs.
- **Using `defaultProps` or the global `JSX` namespace**: neither works on function components or in @types/react 19. Use default values and `React.JSX.Element`.
- **Trusting `as User` on API data**: types are erased. Validate with a schema.
- **Ref callbacks that return a value**: `ref={(c) => (inst = c)}` is a type error now (callbacks may return a cleanup). Write `ref={(c) => { inst = c }}`.
- **Forgetting that Vite does not type-check**: run `tsc` (or `npm run build`) in CI, or errors reach production.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.

1. **(Easy)** Predict: which of lines A, B, C, D produce a type error, and why?
   ```ts
   type Status = "idle" | "loading"
   let status: Status = "idle"
   status = "Idle"                              // A
   let count = 5
   count = "five"                               // B
   const sizes = ["sm", "lg"] as const
   const size: (typeof sizes)[number] = "md"    // C
   let sizes2 = ["sm", "lg"]
   sizes2.push("md")                            // D
   ```
<details>
<summary>Show answer</summary>

A, B and C are errors. D is fine.
- A: `"Idle"` is not in the union (the checker even suggests `"idle"`).
- B: `count` was inferred as `number`, so a string is not allowed.
- C: `as const` makes `sizes` a readonly tuple, so the type is `"sm" | "lg"` and `"md"` is rejected.
- D: without `as const`, `sizes2` is `string[]`, so any string can be pushed.

</details>

2. **(Easy)** Coding: type a `Badge` component with an optional `tone` of `"info" | "warning" | "danger"` (default `"info"`) and `children`. Show a usage that must fail to compile.
<details>
<summary>Show answer</summary>

```tsx
import type { ReactNode } from "react"

type BadgeProps = { tone?: "info" | "warning" | "danger"; children: ReactNode }

export function Badge({ tone = "info", children }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

<Badge tone="warning">Careful</Badge>   // ok
<Badge tone="success">Done</Badge>      // error: "success" is not assignable to the tone union
```

</details>

3. **(Easy)** Coding: write a `NameForm` with a controlled input and a submit button. It takes `onSave: (name: string) => void`. Use extracted, fully typed handlers.
<details>
<summary>Show answer</summary>

```tsx
import { useState } from "react"
import type { ChangeEvent, SubmitEvent } from "react"

export function NameForm({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState("")

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setName(e.target.value)
  }
  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    onSave(name)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={handleChange} aria-label="Name" />
      <button type="submit">Save</button>
    </form>
  )
}
```
`useState("")` is inferred as `string`, so no type argument is needed. On an older @types/react, use `FormEvent<HTMLFormElement>`.

</details>

4. **(Medium)** Explain: why must `useRef<HTMLInputElement>(null)` be read as `ref.current?.focus()`, and what error does `useRef()` give in React 19 types?
<details>
<summary>Show answer</summary>

React fills `ref.current` with the DOM element only after the component mounts. Before that, and after it unmounts, it is `null`. The type reflects this: `RefObject<HTMLInputElement | null>`, so `current` may be `null` and `?.` (or an `if` check) is required. Calling `useRef()` with no argument is an error in @types/react 19: "Expected 1 arguments, but got 0". Pass `null` for DOM refs, or an initial value for a mutable box such as `useRef(0)` or `useRef<number | undefined>(undefined)`.

</details>

5. **(Medium)** Coding: write a typed reducer for a task list (`Task = { id: number; text: string; done: boolean }`) with actions `add`, `toggle` and `remove`, and a compile-time exhaustiveness check.
<details>
<summary>Show answer</summary>

```ts
type Task = { id: number; text: string; done: boolean }
type TaskAction =
  | { type: "add"; text: string }
  | { type: "toggle"; id: number }
  | { type: "remove"; id: number }

export function taskReducer(tasks: Task[], action: TaskAction): Task[] {
  switch (action.type) {
    case "add":
      return [...tasks, { id: Date.now(), text: action.text, done: false }]
    case "toggle":
      return tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t))
    case "remove":
      return tasks.filter((t) => t.id !== action.id)
    default: {
      const unreachable: never = action
      return unreachable
    }
  }
}
```
If you add a fourth action and forget its `case`, `action` is no longer `never` in `default` and the build fails.

</details>

6. **(Medium)** Predict and fix: `type FieldProps = ComponentProps<"input"> & { size: "sm" | "lg" }`, then `<Field size="sm" />`. What happens and why?
<details>
<summary>Show answer</summary>

It fails to compile. The native `<input>` already has a `size` prop of type `number`. Intersecting `number | undefined` with `"sm" | "lg"` leaves nothing, so the checker reduces the whole props type to `never` and reports errors such as "Type 'string' is not assignable to type 'never'". Fix: remove the native key first.
```tsx
type FieldProps = Omit<ComponentProps<"input">, "size"> & { size: "sm" | "lg" }
```

</details>

7. **(Hard)** Coding: write a generic `Table<T extends { id: number }>` that takes `rows: T[]` and `columns: { key: keyof T; header: string }[]`. A misspelled column key must be a compile error.
<details>
<summary>Show answer</summary>

```tsx
type Column<T> = { key: keyof T; header: string }

export function Table<T extends { id: number }>({ rows, columns }: { rows: T[]; columns: Column<T>[] }) {
  return (
    <table>
      <thead>
        <tr>{columns.map((c) => <th key={String(c.key)}>{c.header}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((c) => <td key={String(c.key)}>{String(row[c.key])}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

<Table rows={[{ id: 1, name: "Asha" }]} columns={[{ key: "name", header: "Name" }]} />   // ok
<Table rows={[{ id: 1, name: "Asha" }]} columns={[{ key: "nmae", header: "Name" }]} />   // error: not "id" | "name"
```
`T` is inferred from `rows`, `keyof T` becomes `"id" | "name"`, so a typo is rejected. `String(...)` turns any cell value into text.

</details>

8. **(Hard)** Explain: a teammate wrote `const user = (await res.json()) as User`. What is the risk, and how would you fix it with Zod?
<details>
<summary>Show answer</summary>

`as User` is a promise to the checker, not a check. If the server sends `{ id: "7" }` or omits `role`, the app compiles fine and breaks later, far from the cause (for example `user.role.toUpperCase()`). Fix: validate and derive the type from one schema.
```ts
const UserSchema = z.object({ id: z.number(), name: z.string(), role: z.enum(["admin", "member"]) })
type User = z.infer<typeof UserSchema>

const data: unknown = await res.json()
const user: User = UserSchema.parse(data)   // throws on a bad shape; use safeParse to handle it without throwing
```

</details>

## Recap
- Types are erased at build time: Vite strips them, `tsc` and the editor check them, and nothing validates data at run time.
- Props: a `type` on the destructured parameter, `children: ReactNode`, default values by destructuring, `React.FC` optional.
- Events: `ChangeEvent<HTMLInputElement>`, `MouseEvent`, `KeyboardEvent`, `SubmitEvent<HTMLFormElement>`; use `currentTarget` for the owner element.
- State and refs: `useState<User | null>(null)`, `useRef<HTMLInputElement>(null)` (React 19 needs an argument), reducers with discriminated-union actions.
- Context: `createContext<Value | null>(null)` plus a guard hook that throws; custom hooks return `as const` tuples or objects.
- Generics and native props: `List<T>`, `Select<T extends string>`, `ComponentProps<"button">`, `Omit` on clashes, `ref` as a normal prop.
- Use `unknown` plus Zod (`z.infer`) for API data; use `satisfies` to check without widening and `as const` for literal unions.
- `tsconfig`: `strict`, `jsx: react-jsx`, `moduleResolution: bundler`; TypeScript 7 is a faster native `tsc` with the same type rules.

## Where to go next
- Next lesson: Tooling: Vite, ESLint and build (planned).
- Related: [useReducer](../02-hooks/06-usereducer.md), [useContext](../02-hooks/05-usecontext.md), [Component patterns](./01-component-patterns.md), [Forms with libraries](./04-forms-with-libraries.md), [React 19 and newer](../04-advanced/04-react-19-and-newer.md).
- Practice: pick any exercise in [the practice app](../practice-app/README.md) and rewrite its component in TypeScript in a scratch Vite `react-ts` app.
- Revise: [Round 2 concepts questions](../05-interview-rounds/round-2-concepts-and-theory/questions/01-fundamentals-and-hooks.md).
