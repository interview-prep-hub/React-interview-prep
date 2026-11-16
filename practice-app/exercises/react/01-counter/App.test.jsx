import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

describe('01 Counter with step and reset', () => {
  it('starts with count 0 and step 1', () => {
    render(<App />)
    expect(screen.getByTestId('count')).toHaveTextContent('0')
    expect(screen.getByLabelText(/step/i)).toHaveValue(1)
  })

  it('increments by the step', async () => {
    const user = userEvent.setup()
    render(<App />)
    const inc = screen.getByRole('button', { name: /increment/i })
    await user.click(inc)
    await user.click(inc)
    await user.click(inc)
    expect(screen.getByTestId('count')).toHaveTextContent('3')
  })

  it('uses a custom step for both buttons', async () => {
    const user = userEvent.setup()
    render(<App />)
    const step = screen.getByLabelText(/step/i)
    await user.clear(step)
    await user.type(step, '5')
    await user.click(screen.getByRole('button', { name: /increment/i }))
    expect(screen.getByTestId('count')).toHaveTextContent('5')
    await user.click(screen.getByRole('button', { name: /decrement/i }))
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('reset restores count and step', async () => {
    const user = userEvent.setup()
    render(<App />)
    const step = screen.getByLabelText(/step/i)
    await user.clear(step)
    await user.type(step, '4')
    await user.click(screen.getByRole('button', { name: /increment/i }))
    expect(screen.getByTestId('count')).toHaveTextContent('4')
    await user.click(screen.getByRole('button', { name: /reset/i }))
    expect(screen.getByTestId('count')).toHaveTextContent('0')
    expect(screen.getByLabelText(/step/i)).toHaveValue(1)
  })

  it('treats an empty step as 1 and does not crash', async () => {
    const user = userEvent.setup()
    render(<App />)
    const step = screen.getByLabelText(/step/i)
    await user.clear(step)
    await user.click(screen.getByRole('button', { name: /increment/i }))
    expect(screen.getByTestId('count')).toHaveTextContent('1')
  })
})
