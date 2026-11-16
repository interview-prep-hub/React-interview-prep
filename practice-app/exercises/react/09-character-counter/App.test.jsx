import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

const MAX = 140

const getBox = () => screen.getByLabelText('Message')
const getSend = () => screen.getByRole('button', { name: /^send$/i })

// "1 word" and "1 words" are both accepted, every other number must be plural.
const wordsText = (n) => (n === 1 ? /^1 words?$/ : `${n} words`)
const overText = (n) =>
  n === 1 ? /^1 characters? over the limit$/ : new RegExp(`^${n} characters over the limit$`)

// Click into the textarea and paste a whole string at once (fast, and keeps
// spaces and line breaks exactly as given).
async function pasteText(user, text) {
  await user.click(getBox())
  await user.paste(text)
}

describe('09 Character counter', () => {
  it('starts empty with 0/140, 0 words and a disabled Send button', () => {
    render(<App />)
    expect(getBox()).toHaveValue('')
    expect(screen.getByText('0/140')).toBeInTheDocument()
    expect(screen.getByText('0 words')).toBeInTheDocument()
    expect(getSend()).toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('Message sent!')).not.toBeInTheDocument()
  })

  it('updates the character counter live while typing', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(getBox(), 'Hi')
    expect(screen.getByText('2/140')).toBeInTheDocument()
    await user.type(getBox(), ' there')
    expect(getBox()).toHaveValue('Hi there')
    expect(screen.getByText('8/140')).toBeInTheDocument()
  })

  it('counts words live', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(getBox(), 'Hello')
    expect(screen.getByText(wordsText(1))).toBeInTheDocument()
    await user.type(getBox(), ' big world')
    expect(screen.getByText('3 words')).toBeInTheDocument()
  })

  it('ignores extra spaces, tabs and line breaks when counting words', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pasteText(user, '  one   two\n\nthree\tfour  ')
    expect(screen.getByText('4 words')).toBeInTheDocument()
  })

  // Each kind of whitespace is checked on its own, so a solution that only
  // handles single spaces (or only trims the ends) cannot pass by luck.
  it.each([
    ['a space', 'red green'],
    ['several spaces', 'red    green'],
    ['a tab', 'red\tgreen'],
    ['a line break', 'red\ngreen'],
    ['blank lines', 'red\n\n\ngreen'],
    ['spaces around the text', '   red green   '],
  ])('counts 2 words when they are separated by %s', async (_label, text) => {
    const user = userEvent.setup()
    render(<App />)
    await pasteText(user, text)
    expect(screen.getByText('2 words')).toBeInTheDocument()
  })

  it('only whitespace separates words, punctuation does not', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pasteText(user, "Don't stop-now, ok?")
    expect(screen.getByText('3 words')).toBeInTheDocument()
  })

  it('counts every character (spaces and line breaks too) in the counter', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pasteText(user, 'a b\nc')
    expect(screen.getByText('5/140')).toBeInTheDocument()
  })

  it('pressing Enter adds a line break and does not send', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<App onSend={onSend} />)
    await user.type(getBox(), 'a{Enter}b')
    expect(getBox()).toHaveValue('a\nb')
    expect(screen.getByText('3/140')).toBeInTheDocument()
    expect(screen.getByText('2 words')).toBeInTheDocument()
    expect(onSend).not.toHaveBeenCalled()
    expect(screen.queryByText('Message sent!')).not.toBeInTheDocument()
  })

  it('keeps Send disabled for whitespace only text, but still counts the characters', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pasteText(user, '   ')
    expect(screen.getByText('3/140')).toBeInTheDocument()
    expect(screen.getByText('0 words')).toBeInTheDocument()
    expect(getSend()).toBeDisabled()
  })

  it('enables Send when there is real text, and disables it again when the text is removed', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(getBox(), 'Hi')
    expect(getSend()).toBeEnabled()
    await user.clear(getBox())
    expect(getSend()).toBeDisabled()
    expect(screen.getByText('0/140')).toBeInTheDocument()
  })

  it('allows exactly 140 characters: no warning, Send enabled', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pasteText(user, 'x'.repeat(MAX))
    expect(screen.getByText('140/140')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(getSend()).toBeEnabled()
  })

  it('warns at 141 characters and disables Send', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pasteText(user, 'x'.repeat(MAX + 1))
    expect(screen.getByText('141/140')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(overText(1))
    expect(getSend()).toBeDisabled()
  })

  it('shows how many characters are over the limit', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pasteText(user, 'x'.repeat(MAX + 10))
    expect(screen.getByText('150/140')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(overText(10))
  })

  it('counts spaces towards the limit, even at the end of the text', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pasteText(user, 'x'.repeat(MAX - 1) + '   ')
    expect(screen.getByText('142/140')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(overText(2))
    expect(getSend()).toBeDisabled()
  })

  it('does not block typing past the limit (no maxLength)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pasteText(user, 'x'.repeat(MAX + 5))
    expect(getBox()).toHaveValue('x'.repeat(MAX + 5))

    // keystrokes after the limit are accepted too
    await user.keyboard('abc')
    expect(getBox()).toHaveValue('x'.repeat(MAX + 5) + 'abc')
    expect(screen.getByText('148/140')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(overText(8))
  })

  it('removes the warning and enables Send once the text is back under the limit', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pasteText(user, 'x'.repeat(MAX + 1))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.keyboard('{Backspace}')
    expect(screen.getByText('140/140')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(getSend()).toBeEnabled()
  })

  it('does not send while Send is disabled', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<App onSend={onSend} />)

    // empty text
    expect(getSend()).toBeDisabled()
    await user.click(getSend())

    // over the limit
    await pasteText(user, 'x'.repeat(MAX + 1))
    expect(getSend()).toBeDisabled()
    await user.click(getSend())

    expect(onSend).not.toHaveBeenCalled()
    expect(screen.queryByText('Message sent!')).not.toBeInTheDocument()
  })

  it('Send calls onSend once with the text, clears the box and confirms', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<App onSend={onSend} />)
    await user.type(getBox(), 'Hello there')
    await user.click(getSend())

    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend).toHaveBeenCalledWith('Hello there')
    expect(getBox()).toHaveValue('')
    expect(screen.getByRole('status')).toHaveTextContent('Message sent!')
    expect(screen.getByText('0/140')).toBeInTheDocument()
    expect(screen.getByText('0 words')).toBeInTheDocument()
    expect(getSend()).toBeDisabled()

    // a second click on the (now disabled) button sends nothing more
    await user.click(getSend())
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('passes the text exactly as typed, without trimming', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<App onSend={onSend} />)
    await pasteText(user, '  hi  ')
    await user.click(getSend())
    expect(onSend).toHaveBeenCalledWith('  hi  ')
  })

  it('can send a message of exactly 140 characters', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<App onSend={onSend} />)
    const text = 'y'.repeat(MAX)
    await pasteText(user, text)
    await user.click(getSend())
    expect(onSend).toHaveBeenCalledWith(text)
  })

  it('works without an onSend prop', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(getBox(), 'No handler')
    await user.click(getSend())
    expect(getBox()).toHaveValue('')
    expect(screen.getByText('Message sent!')).toBeInTheDocument()
  })

  it('can send a second message after the first one', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<App onSend={onSend} />)

    await user.type(getBox(), 'one')
    await user.click(getSend())
    await user.type(getBox(), 'two')
    expect(getSend()).toBeEnabled()
    await user.click(getSend())

    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend).toHaveBeenNthCalledWith(1, 'one')
    expect(onSend).toHaveBeenNthCalledWith(2, 'two')
    expect(getBox()).toHaveValue('')
    expect(screen.getByRole('status')).toHaveTextContent('Message sent!')
  })

  it('hides "Message sent!" as soon as the user types again', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(getBox(), 'First')
    await user.click(getSend())
    expect(screen.getByText('Message sent!')).toBeInTheDocument()
    await user.type(getBox(), 'S')
    expect(screen.queryByText('Message sent!')).not.toBeInTheDocument()
    expect(screen.getByText('1/140')).toBeInTheDocument()
  })
})
