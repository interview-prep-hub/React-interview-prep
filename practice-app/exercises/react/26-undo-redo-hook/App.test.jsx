import { StrictMode } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

// Queries used by several tests.
const textbox = () => screen.getByRole('textbox', { name: 'Text' })
const undoButton = () => screen.getByRole('button', { name: 'Undo' })
const redoButton = () => screen.getByRole('button', { name: 'Redo' })
const resetButton = () => screen.getByRole('button', { name: 'Reset' })
const colorGroup = () => screen.getByRole('group', { name: 'Color' })
const colorButton = (name) => within(colorGroup()).getByRole('button', { name })
const swatch = () => screen.getByTestId('swatch')
const info = () => screen.getByTestId('history-info')

// jsdom reports colors as rgb(...), so we compare the computed color of the swatch
// with the rgb value of each color name.
const RGB = {
  red: 'rgb(255, 0, 0)',
  green: 'rgb(0, 128, 0)',
  blue: 'rgb(0, 0, 255)',
  orange: 'rgb(255, 165, 0)',
}
const expectSwatch = (name) => {
  expect(getComputedStyle(swatch()).backgroundColor).toBe(RGB[name])
}

describe('26 Undo/redo demo (App)', () => {
  it('starts with empty text, red selected, and nothing to undo or redo', () => {
    render(<App />)
    expect(textbox()).toHaveValue('')
    expectSwatch('red')

    const names = within(colorGroup())
      .getAllByRole('button')
      .map((button) => button.textContent)
    expect(names).toEqual(['Red', 'Green', 'Blue', 'Orange'])
    expect(colorButton('Red')).toHaveAttribute('aria-pressed', 'true')
    expect(colorButton('Green')).toHaveAttribute('aria-pressed', 'false')
    expect(colorButton('Blue')).toHaveAttribute('aria-pressed', 'false')
    expect(colorButton('Orange')).toHaveAttribute('aria-pressed', 'false')

    expect(undoButton()).toBeDisabled()
    expect(redoButton()).toBeDisabled()
    expect(info()).toHaveTextContent('Undo steps: 0, Redo steps: 0')
  })

  it('typing updates the text and enables Undo', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(textbox(), 'abc')
    expect(textbox()).toHaveValue('abc')
    expect(undoButton()).toBeEnabled()
    expect(redoButton()).toBeDisabled()
  })

  it('Undo removes one typed character at a time, until Undo is disabled', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(textbox(), 'abc')

    await user.click(undoButton())
    expect(textbox()).toHaveValue('ab')
    await user.click(undoButton())
    expect(textbox()).toHaveValue('a')
    await user.click(undoButton())
    expect(textbox()).toHaveValue('')

    expect(undoButton()).toBeDisabled()
    expect(redoButton()).toBeEnabled()
  })

  it('Redo brings the text back, until Redo is disabled', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(textbox(), 'ab')
    await user.click(undoButton())
    await user.click(undoButton())
    expect(textbox()).toHaveValue('')

    await user.click(redoButton())
    expect(textbox()).toHaveValue('a')
    await user.click(redoButton())
    expect(textbox()).toHaveValue('ab')
    expect(redoButton()).toBeDisabled()
    expect(undoButton()).toBeEnabled()
  })

  it('a color button changes the swatch and the pressed button, and Undo/Redo move between colors', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(colorButton('Blue'))
    expectSwatch('blue')
    expect(colorButton('Blue')).toHaveAttribute('aria-pressed', 'true')
    expect(colorButton('Red')).toHaveAttribute('aria-pressed', 'false')
    expect(undoButton()).toBeEnabled()

    await user.click(colorButton('Orange'))
    expectSwatch('orange')

    await user.click(undoButton())
    expectSwatch('blue')
    expect(colorButton('Blue')).toHaveAttribute('aria-pressed', 'true')
    await user.click(undoButton())
    expectSwatch('red')
    expect(colorButton('Red')).toHaveAttribute('aria-pressed', 'true')
    expect(undoButton()).toBeDisabled()

    await user.click(redoButton())
    expectSwatch('blue')
  })

  it('text and color share one history, undone in the order they were made', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(textbox(), 'a') // state 1: "a" and red
    await user.click(colorButton('Green')) // state 2: "a" and green
    await user.type(textbox(), 'b') // state 3: "ab" and green
    expect(textbox()).toHaveValue('ab')
    expectSwatch('green')

    await user.click(undoButton()) // back to state 2
    expect(textbox()).toHaveValue('a')
    expectSwatch('green')

    await user.click(undoButton()) // back to state 1
    expect(textbox()).toHaveValue('a')
    expectSwatch('red')

    await user.click(undoButton()) // back to the start
    expect(textbox()).toHaveValue('')
    expectSwatch('red')
    expect(undoButton()).toBeDisabled()

    await user.click(redoButton())
    await user.click(redoButton())
    expect(textbox()).toHaveValue('a')
    expectSwatch('green')
  })

  it('clicking the color that is already selected adds no history step', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(colorButton('Red')) // red is already selected
    expect(undoButton()).toBeDisabled()
    expect(info()).toHaveTextContent('Undo steps: 0, Redo steps: 0')

    await user.click(colorButton('Blue'))
    await user.click(colorButton('Blue'))
    expect(info()).toHaveTextContent('Undo steps: 1, Redo steps: 0')

    await user.click(undoButton())
    expectSwatch('red')
    expect(undoButton()).toBeDisabled()
  })

  it('clicking the selected color does not throw away the redo steps either', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(textbox(), 'a')
    await user.click(undoButton())
    expect(info()).toHaveTextContent('Undo steps: 0, Redo steps: 1')

    await user.click(colorButton('Red')) // red is already selected
    expect(redoButton()).toBeEnabled()
    expect(info()).toHaveTextContent('Undo steps: 0, Redo steps: 1')

    await user.click(redoButton())
    expect(textbox()).toHaveValue('a')
  })

  it('a new change after Undo throws away the redo steps', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(textbox(), 'ab')
    await user.click(undoButton())
    expect(textbox()).toHaveValue('a')
    expect(redoButton()).toBeEnabled()

    await user.click(colorButton('Blue'))
    expect(redoButton()).toBeDisabled()
    expect(info()).toHaveTextContent('Undo steps: 2, Redo steps: 0')

    await user.click(undoButton())
    expectSwatch('red')
    expect(textbox()).toHaveValue('a')
    await user.click(undoButton())
    expect(textbox()).toHaveValue('')
    expect(undoButton()).toBeDisabled()
  })

  it('shows how many undo and redo steps there are', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(textbox(), 'ab')
    expect(info()).toHaveTextContent('Undo steps: 2, Redo steps: 0')

    await user.click(undoButton())
    expect(info()).toHaveTextContent('Undo steps: 1, Redo steps: 1')
  })

  it('works inside StrictMode, where updater functions run twice', async () => {
    const user = userEvent.setup()
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    await user.type(textbox(), 'ab')
    await user.click(colorButton('Green'))
    expect(info()).toHaveTextContent('Undo steps: 3, Redo steps: 0')

    await user.click(undoButton())
    expectSwatch('red')
    expect(textbox()).toHaveValue('ab')
    await user.click(undoButton())
    expect(textbox()).toHaveValue('a')
    await user.click(redoButton())
    expect(textbox()).toHaveValue('ab')
    expect(info()).toHaveTextContent('Undo steps: 2, Redo steps: 1')
  })

  it('Reset restores the text and color and clears the whole history', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(textbox(), 'abc')
    await user.click(colorButton('Blue'))
    await user.click(undoButton()) // leaves something in the redo stack too

    await user.click(resetButton())
    expect(textbox()).toHaveValue('')
    expectSwatch('red')
    expect(colorButton('Red')).toHaveAttribute('aria-pressed', 'true')
    expect(undoButton()).toBeDisabled()
    expect(redoButton()).toBeDisabled()
    expect(info()).toHaveTextContent('Undo steps: 0, Redo steps: 0')

    // The history starts again from the reset state.
    await user.type(textbox(), 'x')
    await user.click(undoButton())
    expect(textbox()).toHaveValue('')
    expect(undoButton()).toBeDisabled()
  })
})
