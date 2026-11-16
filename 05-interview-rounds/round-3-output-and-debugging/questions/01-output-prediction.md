# Round 3 - Output Prediction and Debugging: Output Prediction

**How to use this file:** Give each question 2 to 4 minutes. Write your prediction on paper first: the exact text on the screen and the exact log lines, in order. Then run the code (see the round [README](../README.md)) and compare. Score yourself in the rubric from the README, and say the reason out loud as if an interviewer were listening. Unless a question says StrictMode, assume StrictMode is OFF. Every output in the answers file was checked by running the code with React 19.3.1.
**Answers:** [answers/01-output-prediction.md](../answers/01-output-prediction.md)  (do not open until you have tried)
**Learn first:** [state and events](../../../01-basics/05-state-and-events.md), [useState in depth](../../../02-hooks/02-usestate-in-depth.md), [useEffect](../../../02-hooks/03-useeffect.md), [how React renders](../../../04-advanced/01-how-react-renders.md), [lists and keys](../../../01-basics/06-conditional-rendering-and-lists.md), [useContext](../../../02-hooks/05-usecontext.md), [memoization](../../../02-hooks/07-memoization.md), [JavaScript deep dive](../../../01-basics/10-javascript-deep-dive-for-interviews.md)

## State and closures
**R3-SC-001 (Easy)** `Counter` starts at 0. You click `plain` once, then `updater` once. What does the paragraph show after each click?

```jsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  function addTwoPlain() {
    setCount(count + 1)
    setCount(count + 1)
  }

  function addTwoUpdater() {
    setCount((c) => c + 1)
    setCount((c) => c + 1)
  }

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={addTwoPlain}>plain</button>
      <button onClick={addTwoUpdater}>updater</button>
    </>
  )
}
```

**R3-SC-002 (Easy)** The page has loaded and `render 0` is already logged. You click the button once. Which lines does the click log, in order, and what does the button show afterwards?

```jsx
import { useState } from 'react'

function Logger() {
  const [count, setCount] = useState(0)
  console.log('render', count)

  function handleClick() {
    setCount(count + 1)
    console.log('handler', count)
  }

  return <button onClick={handleClick}>Count: {count}</button>
}
```

**R3-SC-003 (Medium)** `n` starts at 0. You click the button once. What does the button show?

```jsx
import { useState } from 'react'

function Queue() {
  const [n, setN] = useState(0)

  function handleClick() {
    setN((x) => x + 1)
    setN(5)
    setN((x) => x + 1)
  }

  return <button onClick={handleClick}>n = {n}</button>
}
```

**R3-SC-004 (Medium)** You click `mutate` once, then `copy` once. After each click, what does the paragraph show and which `render` lines are logged?

```jsx
import { useState } from 'react'

function Letters() {
  const [items, setItems] = useState(['a'])
  console.log('render', items.join(','))

  function mutate() {
    items.push('b')
    setItems(items)
  }

  function copy() {
    setItems([...items, 'c'])
  }

  return (
    <>
      <p>{items.join(' ')}</p>
      <button onClick={mutate}>mutate</button>
      <button onClick={copy}>copy</button>
    </>
  )
}
```

**R3-SC-005 (Medium)** You click `click` three times, then `redraw` once. What does the paragraph show after the three clicks, and after `redraw`? How many `render` lines are logged in total after the first render?

```jsx
import { useRef, useState } from 'react'

function RefCounter() {
  const clicks = useRef(0)
  const [, setTick] = useState(0)
  console.log('render')

  return (
    <>
      <p>clicks: {clicks.current}</p>
      <button onClick={() => { clicks.current += 1 }}>click</button>
      <button onClick={() => setTick((t) => t + 1)}>redraw</button>
    </>
  )
}
```

**R3-SC-006 (Medium)** The page loads, you click the button once, and you wait for the timer. Which lines are logged from the start, and what does the button show? (React 19, `createRoot`.)

```jsx
import { useState } from 'react'

function Batch() {
  const [a, setA] = useState(0)
  const [b, setB] = useState(0)
  console.log('render', a, b)

  function handleClick() {
    setTimeout(() => {
      setA(1)
      setB(1)
    }, 0)
  }

  return <button onClick={handleClick}>{a} {b}</button>
}
```

**R3-SC-007 (Medium)** The page has loaded (`n` is 0, `render 0` was logged). You click `set 0`, then `set 1`, then `set 1`, then `set 1` again. Which lines does each of the four clicks log? One of them is a surprise.

```jsx
import { useState } from 'react'

function Same() {
  const [n, setN] = useState(0)
  console.log('render', n)

  return (
    <>
      <button onClick={() => setN(0)}>set 0</button>
      <button onClick={() => setN(1)}>set 1</button>
    </>
  )
}
```

**R3-SC-008 (Hard)** (a) What is logged and shown when `<Bounded />` is rendered? (b) What happens when `<Unbounded />` is rendered?

```jsx
import { useState } from 'react'

function Bounded() {
  const [n, setN] = useState(0)
  console.log('render', n)
  if (n < 3) {
    setN(n + 1)
  }
  return <p>n = {n}</p>
}

function Unbounded() {
  const [n, setN] = useState(0)
  setN(n + 1)
  return <p>n = {n}</p>
}
```

**R3-SC-009 (Medium)** You click `next` once. What do the two paragraphs show?

```jsx
import { useState } from 'react'

function Panel({ start }) {
  const [value] = useState(start)
  return <p>panel: {value}</p>
}

function Dashboard() {
  const [start, setStart] = useState(0)
  return (
    <>
      <p>dashboard: {start}</p>
      <Panel start={start} />
      <button onClick={() => setStart(start + 1)}>next</button>
    </>
  )
}
```

**R3-SC-010 (Hard)** You click `show later`, and then, before three seconds have passed, you click `+1` three times. When the timer fires, what is logged? What does the paragraph show at that moment?

```jsx
import { useState } from 'react'

function Delayed() {
  const [count, setCount] = useState(0)

  function showLater() {
    setTimeout(() => console.log('count was', count), 3000)
  }

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={showLater}>show later</button>
    </>
  )
}
```

**R3-SC-011 (Medium)** This plain JavaScript runs in a browser. What is printed, in order?

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log('var', i), 0)
}

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log('let', j), 0)
}
```

**R3-SC-012 (Hard)** This plain JavaScript runs in a browser. What is printed, in order?

```js
console.log('script start')

setTimeout(() => console.log('timeout'), 0)

Promise.resolve().then(() => console.log('promise'))

async function run() {
  console.log('run start')
  await null
  console.log('run after await')
}
run()

console.log('script end')
```

## Effects
**R3-EF-001 (Medium)** `<Outer />` is mounted for the first time. Which lines are logged, in order?

```jsx
import { useEffect, useLayoutEffect } from 'react'

function Inner() {
  console.log('inner render')
  useLayoutEffect(() => {
    console.log('inner layout effect')
  }, [])
  useEffect(() => {
    console.log('inner effect')
  }, [])
  return <p>inner</p>
}

function Outer() {
  console.log('outer render')
  useLayoutEffect(() => {
    console.log('outer layout effect')
  }, [])
  useEffect(() => {
    console.log('outer effect')
  }, [])
  return <Inner />
}
```

**R3-EF-002 (Hard)** `<Branch />` has mounted (ignore the mount logs). (a) You click `+1` once: which lines are logged, in order? (b) Then the whole tree unmounts: which lines are logged, in order?

```jsx
import { useEffect, useLayoutEffect, useState } from 'react'

function Leaf({ n }) {
  useLayoutEffect(() => {
    console.log('leaf layout setup')
    return () => console.log('leaf layout cleanup')
  })
  useEffect(() => {
    console.log('leaf effect setup')
    return () => console.log('leaf effect cleanup')
  })
  return <p>{n}</p>
}

function Branch() {
  const [n, setN] = useState(0)
  useLayoutEffect(() => {
    console.log('branch layout setup')
    return () => console.log('branch layout cleanup')
  })
  useEffect(() => {
    console.log('branch effect setup')
    return () => console.log('branch effect cleanup')
  })
  return (
    <>
      <Leaf n={n} />
      <button onClick={() => setN(n + 1)}>+1</button>
    </>
  )
}
```

**R3-EF-003 (Hard)** The app runs in development inside `<StrictMode>`. (a) Which lines are logged on mount? (b) You click the button once: which lines are logged? (c) What does the button show?

```jsx
import { useEffect, useState } from 'react'

function Strict() {
  const [n, setN] = useState(() => {
    console.log('init')
    return 0
  })
  console.log('render', n)

  useEffect(() => {
    console.log('effect setup')
    return () => console.log('effect cleanup')
  }, [])

  function increment() {
    setN((x) => {
      console.log('updater')
      return x + 1
    })
  }

  return <button onClick={increment}>n = {n}</button>
}

// In main.jsx:
// <StrictMode><Strict /></StrictMode>
```

**R3-EF-004 (Medium)** Both timers are mounted at the same time (no StrictMode). What do the two paragraphs show after 1 second, after 2 seconds, and after 10 seconds?

```jsx
import { useEffect, useState } from 'react'

function StaleTimer() {
  const [c, setC] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setC(c + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return <p>stale: {c}</p>
}

function FreshTimer() {
  const [c, setC] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setC((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return <p>fresh: {c}</p>
}
```

**R3-EF-005 (Medium)** `Widget` and `WidgetMemo` are mounted together. Then you click each button twice. In total, how many times is `widget effect` logged, and how many times is `memo effect` logged?

```jsx
import { useEffect, useMemo, useState } from 'react'

function Widget() {
  const [tick, setTick] = useState(0)
  const options = { theme: 'dark' }

  useEffect(() => {
    console.log('widget effect')
  }, [options])

  return <button onClick={() => setTick(tick + 1)}>widget {tick}</button>
}

function WidgetMemo() {
  const [tick, setTick] = useState(0)
  const options = useMemo(() => ({ theme: 'dark' }), [])

  useEffect(() => {
    console.log('memo effect')
  }, [options])

  return <button onClick={() => setTick(tick + 1)}>memo {tick}</button>
}
```

**R3-EF-006 (Hard)** (a) What does React do when `<Loader />` mounts? (b) What happens when it unmounts?

```jsx
import { useEffect } from 'react'

function Loader() {
  useEffect(async () => {
    await Promise.resolve()
    console.log('loaded')
  }, [])

  return <p>loader</p>
}
```

**R3-EF-007 (Hard)** Each component is rendered on its own inside `<StrictMode>` in development, and 100 ms pass. For each component: how many times is `fakeFetch` called, which `set` lines are logged, and what does the paragraph show?

```jsx
import { StrictMode, useEffect, useState } from 'react'

let calls = 0

function fakeFetch() {
  calls += 1
  const n = calls
  return new Promise((resolve) => setTimeout(() => resolve('data ' + n), 100))
}

function NoGuard() {
  const [data, setData] = useState('none')

  useEffect(() => {
    fakeFetch().then((d) => {
      console.log('NoGuard set', d)
      setData(d)
    })
  }, [])

  return <p>{data}</p>
}

function Guarded() {
  const [data, setData] = useState('none')

  useEffect(() => {
    let ignore = false
    fakeFetch().then((d) => {
      if (!ignore) {
        console.log('Guarded set', d)
        setData(d)
      }
    })
    return () => {
      ignore = true
    }
  }, [])

  return <p>{data}</p>
}
```

**R3-EF-008 (Medium)** `<Mounted />` is rendered once (no StrictMode). Which lines are logged, and what is on the screen at the end?

```jsx
import { useEffect, useState } from 'react'

function Mounted() {
  const [ready, setReady] = useState(false)
  console.log('render, ready =', ready)

  useEffect(() => {
    setReady(true)
  }, [])

  return <p>{ready ? 'ready' : 'loading'}</p>
}
```

**R3-EF-009 (Medium)** You render `<Room id={1} />`, then `<Room id={2} />`, then `<Room id={2} />` again, and finally remove it. Which lines are logged at each of the four steps? (No StrictMode.)

```jsx
import { useEffect } from 'react'

function Room({ id }) {
  useEffect(() => {
    console.log('connect', id)
    return () => console.log('disconnect', id)
  }, [id])

  return <p>room {id}</p>
}
```

## Rendering, keys, memo and context
**R3-RM-001 (Medium)** What text does each of the four paragraphs contain?

```jsx
function Badges({ count, items, price }) {
  return (
    <div>
      <p>{count && <b>new</b>}</p>
      <p>{items.length && <b>has items</b>}</p>
      <p>{items && <b>list exists</b>}</p>
      <p>{price && <b>on sale</b>}</p>
    </div>
  )
}

// <Badges count={0} items={[]} price={NaN} />
```

**R3-RM-002 (Medium)** Each shop is rendered on its own. After you click its button twice, how many times has `Price render` been logged in total (including the first render) for `ShopInline`, and for `ShopMemo`?

```jsx
import { memo, useMemo, useState } from 'react'

const Price = memo(function Price({ style }) {
  console.log('Price render')
  return <p style={style}>$10</p>
})

function ShopInline() {
  const [n, setN] = useState(0)
  return (
    <>
      <button onClick={() => setN(n + 1)}>inline {n}</button>
      <Price style={{ color: 'red' }} />
    </>
  )
}

function ShopMemo() {
  const [n, setN] = useState(0)
  const style = useMemo(() => ({ color: 'red' }), [])
  return (
    <>
      <button onClick={() => setN(n + 1)}>memo {n}</button>
      <Price style={style} />
    </>
  )
}
```

**R3-RM-003 (Medium)** For each of `Switch` and `SwitchKeyed`: you click the counter button twice, then click `switch` once. What does the counter button show before and after the switch?

```jsx
import { useState } from 'react'

function CounterBtn({ label }) {
  const [n, setN] = useState(0)
  return (
    <button onClick={() => setN(n + 1)}>
      {label}: {n}
    </button>
  )
}

function Switch() {
  const [useA, setUseA] = useState(true)
  return (
    <>
      {useA ? <CounterBtn label="A" /> : <CounterBtn label="B" />}
      <button onClick={() => setUseA(!useA)}>switch</button>
    </>
  )
}

function SwitchKeyed() {
  const [useA, setUseA] = useState(true)
  return (
    <>
      {useA ? <CounterBtn key="A" label="A" /> : <CounterBtn key="B" label="B" />}
      <button onClick={() => setUseA(!useA)}>switch</button>
    </>
  )
}
```

**R3-RM-004 (Hard)** You type `abc` into the input, then click the clicks button once. What is in the input afterwards? Is it still the same DOM node? Why?

```jsx
import { useState } from 'react'

function Form() {
  const [clicks, setClicks] = useState(0)

  function NameField() {
    return <input aria-label="name" />
  }

  return (
    <>
      <NameField />
      <button onClick={() => setClicks(clicks + 1)}>clicks: {clicks}</button>
    </>
  )
}
```

**R3-RM-005 (Hard)** You type `hello` into the note box of the Ann row, then click `delete Ann`. Which rows remain, and what does each note box contain?

```jsx
import { useState } from 'react'

function Rows() {
  const [names, setNames] = useState(['Ann', 'Bob', 'Cy'])

  return (
    <ul>
      {names.map((name, index) => (
        <li key={index}>
          {name} <input aria-label={'note for ' + name} />
          <button onClick={() => setNames(names.filter((_, i) => i !== index))}>
            delete {name}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

**R3-RM-006 (Easy)** `<Tags tags={['react', 'hooks']} />` is rendered in development. What does React print to the console? Does the list still render?

```jsx
function Tags({ tags }) {
  return (
    <ul>
      {tags.map((tag) => (
        <li>{tag}</li>
      ))}
    </ul>
  )
}

// <Tags tags={['react', 'hooks']} />
```

**R3-RM-007 (Hard)** Each page is mounted, then its button is clicked once. Which lines does the click log for `PageA`, and which for `PageB`?

```jsx
import { memo, useState } from 'react'

const Box = memo(function Box({ children }) {
  console.log('Box render')
  return <div>{children}</div>
})

function Note() {
  console.log('Note render')
  return <p>note</p>
}

function PageA() {
  const [n, setN] = useState(0)
  return (
    <>
      <button onClick={() => setN(n + 1)}>A {n}</button>
      <Box>
        <Note />
      </Box>
    </>
  )
}

function Shell({ children }) {
  const [n, setN] = useState(0)
  return (
    <>
      <button onClick={() => setN(n + 1)}>B {n}</button>
      <Box>{children}</Box>
    </>
  )
}

function PageB() {
  return (
    <Shell>
      <Note />
    </Shell>
  )
}
```

**R3-RM-008 (Medium)** What do the three paragraphs contain?

```jsx
import { createContext, useContext } from 'react'

const ThemeContext = createContext('light')

function Label({ id }) {
  const theme = useContext(ThemeContext)
  return <p>{id}: theme = [{theme}]</p>
}

function ContextDemo() {
  return (
    <>
      <Label id="one" />
      <ThemeContext value="dark">
        <Label id="two" />
      </ThemeContext>
      <ThemeContext value={undefined}>
        <Label id="three" />
      </ThemeContext>
    </>
  )
}
```

**R3-RM-009 (Hard)** `<Top />` is mounted. Then you click `inc n` once. Then you click `inc other` once. Which lines are logged at mount, after `inc n`, and after `inc other`?

```jsx
import { createContext, memo, useContext, useState } from 'react'

const CountContext = createContext(0)

function Reader() {
  console.log('Reader render')
  const n = useContext(CountContext)
  return <p>n = {n}</p>
}

const Middle = memo(function Middle() {
  console.log('Middle render')
  return <Reader />
})

function Top() {
  const [n, setN] = useState(0)
  const [other, setOther] = useState(0)
  return (
    <CountContext value={n}>
      <button onClick={() => setN(n + 1)}>inc n</button>
      <button onClick={() => setOther(other + 1)}>inc other</button>
      <Middle />
    </CountContext>
  )
}
```
