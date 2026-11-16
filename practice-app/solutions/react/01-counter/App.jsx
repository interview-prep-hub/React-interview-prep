import { useState } from 'react'

// Reference solution for exercise 01.
// Key ideas:
// - the step stays a STRING in state, because that is what the input gives us
//   (so the user can clear the field and keep typing)
// - we convert to a number only at the moment we need it

const DEFAULT_STEP = 1

function toStepNumber(raw) {
  const n = Number(raw)
  return raw === '' || Number.isNaN(n) ? DEFAULT_STEP : n
}

export default function App() {
  const [count, setCount] = useState(0)
  const [step, setStep] = useState(String(DEFAULT_STEP))

  const change = (direction) => {
    // Functional update: always based on the latest count.
    setCount((c) => c + direction * toStepNumber(step))
  }

  const reset = () => {
    setCount(0)
    setStep(String(DEFAULT_STEP))
  }

  return (
    <div>
      <h2>Counter</h2>
      <p data-testid="count">{count}</p>

      <button onClick={() => change(1)}>Increment</button>
      <button onClick={() => change(-1)}>Decrement</button>
      <button onClick={reset}>Reset</button>

      <div>
        <label htmlFor="step">Step</label>
        <input
          id="step"
          type="number"
          value={step}
          onChange={(e) => setStep(e.target.value)}
        />
      </div>
    </div>
  )
}
