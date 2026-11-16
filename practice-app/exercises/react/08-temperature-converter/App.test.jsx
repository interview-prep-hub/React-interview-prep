import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App, { TemperatureInput } from './App.jsx'

const BOIL = 'The water would boil.'
const NOT_BOIL = 'The water would not boil.'
const ENTER = 'Enter a temperature'

// Renders the app and returns the two inputs plus a user-event instance.
function setup() {
  const user = userEvent.setup()
  render(<App />)
  return {
    user,
    celsius: screen.getByLabelText('Celsius'),
    fahrenheit: screen.getByLabelText('Fahrenheit'),
  }
}

const verdict = () => screen.getByTestId('verdict').textContent.trim()

// true when `a` comes before `b` in the page
const isBefore = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

describe('08 Temperature converter: TemperatureInput (the reusable child)', () => {
  it('shows the Celsius label and the value it is given', () => {
    render(<TemperatureInput scale="c" value="12" onChange={() => {}} />)
    expect(screen.getByLabelText('Celsius')).toHaveValue('12')
  })

  it('shows the Fahrenheit label for scale "f"', () => {
    render(<TemperatureInput scale="f" value="54" onChange={() => {}} />)
    expect(screen.getByLabelText('Fahrenheit')).toHaveValue('54')
  })

  it('shows the label text on the page, inside a <label> (not only in an aria-label)', () => {
    render(<TemperatureInput scale="c" value="" onChange={() => {}} />)
    expect(screen.getByText('Celsius').closest('label')).not.toBeNull()
  })

  it('is fully controlled: it reports typed text and shows only what the parent gives it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TemperatureInput scale="c" value="12" onChange={onChange} />)
    const input = screen.getByLabelText('Celsius')

    await user.type(input, '5')

    // The parent gets the new text as a plain string...
    expect(onChange).toHaveBeenCalledWith('125')
    // ...and because the parent did not change `value`, the input did not change either.
    expect(input).toHaveValue('12')
  })

  it('follows the value prop when the parent changes it', () => {
    const { rerender } = render(<TemperatureInput scale="c" value="12" onChange={() => {}} />)
    expect(screen.getByLabelText('Celsius')).toHaveValue('12')

    rerender(<TemperatureInput scale="c" value="99" onChange={() => {}} />)
    expect(screen.getByLabelText('Celsius')).toHaveValue('99')
  })

  it('two copies on one page each keep their own label and value', () => {
    render(
      <>
        <TemperatureInput scale="c" value="1" onChange={() => {}} />
        <TemperatureInput scale="f" value="2" onChange={() => {}} />
      </>,
    )
    expect(screen.getByLabelText('Celsius')).toHaveValue('1')
    expect(screen.getByLabelText('Fahrenheit')).toHaveValue('2')
  })
})

describe('08 Temperature converter: App', () => {
  describe('first render', () => {
    it('shows two empty text inputs, Celsius first, and asks for a temperature', () => {
      const { celsius, fahrenheit } = setup()
      const boxes = screen.getAllByRole('textbox')
      expect(boxes).toHaveLength(2)
      expect(boxes[0]).toBe(celsius)
      expect(boxes[1]).toBe(fahrenheit)
      expect(celsius).toHaveValue('')
      expect(fahrenheit).toHaveValue('')
      expect(verdict()).toBe(ENTER)
    })

    it('shows the heading, then Celsius, then Fahrenheit, then the sentence', () => {
      const { celsius, fahrenheit } = setup()
      const heading = screen.getByRole('heading', { name: 'Temperature converter' })
      const sentence = screen.getByTestId('verdict')
      expect(isBefore(heading, celsius)).toBe(true)
      expect(isBefore(celsius, fahrenheit)).toBe(true)
      expect(isBefore(fahrenheit, sentence)).toBe(true)
    })
  })

  describe('keeping the two inputs in sync', () => {
    it.each([
      ['37', '98.6'],
      ['0', '32'],
      ['100', '212'],
      ['-40', '-40'],
      ['-10', '14'],
    ])('typing %s in Celsius shows %s in Fahrenheit', async (typed, expected) => {
      const { user, celsius, fahrenheit } = setup()
      await user.type(celsius, typed)
      expect(celsius).toHaveValue(typed)
      expect(fahrenheit).toHaveValue(expected)
    })

    it.each([
      ['212', '100'],
      ['32', '0'],
      ['98.6', '37'],
      ['-4', '-20'],
      ['-40', '-40'],
    ])('typing %s in Fahrenheit shows %s in Celsius', async (typed, expected) => {
      const { user, celsius, fahrenheit } = setup()
      await user.type(fahrenheit, typed)
      expect(fahrenheit).toHaveValue(typed)
      expect(celsius).toHaveValue(expected)
    })

    it('works in both directions, one after the other', async () => {
      const { user, celsius, fahrenheit } = setup()

      await user.type(celsius, '0')
      expect(fahrenheit).toHaveValue('32')

      await user.clear(fahrenheit)
      await user.type(fahrenheit, '14')
      expect(celsius).toHaveValue('-10')

      await user.clear(celsius)
      await user.type(celsius, '100')
      expect(fahrenheit).toHaveValue('212')
    })

    it('keeps focus while typing several characters (the child must not be re-created)', async () => {
      const { user, celsius } = setup()
      await user.type(celsius, '123')
      const input = screen.getByLabelText('Celsius')
      expect(input).toHaveValue('123')
      expect(input).toHaveFocus()
    })
  })

  describe('rounding', () => {
    it.each([
      ['celsius', '36.6', 'fahrenheit', '97.88'],
      ['celsius', '0.1', 'fahrenheit', '32.18'],
      ['celsius', '36.123', 'fahrenheit', '97.02'],
      ['fahrenheit', '100', 'celsius', '37.78'],
      ['fahrenheit', '0', 'celsius', '-17.78'],
      ['fahrenheit', '33.333', 'celsius', '0.74'],
    ])('typing %s %s gives at most 2 decimals in %s (%s)', async (from, typed, to, expected) => {
      const { user, ...fields } = setup()
      await user.type(fields[from], typed)
      expect(fields[to]).toHaveValue(expected)
    })

    it('does not pad the result with trailing zeros', async () => {
      const { user, celsius, fahrenheit } = setup()
      await user.type(celsius, '20')
      expect(fahrenheit).toHaveValue('68')
      await user.clear(celsius)
      await user.type(celsius, '1')
      expect(fahrenheit).toHaveValue('33.8')
    })

    it('does not rewrite what you typed in the field you are editing (no rounding feedback loop)', async () => {
      const { user, celsius, fahrenheit } = setup()
      // 100.1 F is 37.83 C after rounding. Converting 37.83 back would give 100.09,
      // which must NOT replace the "100.1" the user typed.
      await user.type(fahrenheit, '100.1')
      expect(fahrenheit).toHaveValue('100.1')
      expect(celsius).toHaveValue('37.83')
    })

    it('keeps the exact text of the field being edited, even a trailing dot or zero', async () => {
      const { user, celsius, fahrenheit } = setup()

      await user.type(celsius, '36.')
      expect(celsius).toHaveValue('36.')
      expect(fahrenheit).toHaveValue('96.8')

      await user.clear(celsius)
      await user.type(celsius, '10.50')
      expect(celsius).toHaveValue('10.50')
      expect(fahrenheit).toHaveValue('50.9')
    })
  })

  describe('empty and invalid text', () => {
    it('clears the other field when the typed text is emptied', async () => {
      const { user, celsius, fahrenheit } = setup()

      await user.type(celsius, '10')
      expect(fahrenheit).toHaveValue('50')
      await user.clear(celsius)
      expect(celsius).toHaveValue('')
      expect(fahrenheit).toHaveValue('')

      await user.type(fahrenheit, '50')
      expect(celsius).toHaveValue('10')
      await user.clear(fahrenheit)
      expect(fahrenheit).toHaveValue('')
      expect(celsius).toHaveValue('')
    })

    it.each([['abc'], ['-'], ['.'], ['12abc'], ['1.2.3'], ['Infinity'], ['   ']])(
      'typing %j in Celsius is not a number, so Fahrenheit is empty and the sentence asks for a temperature',
      async (typed) => {
        const { user, celsius, fahrenheit } = setup()
        await user.type(fahrenheit, '50') // start from a good state
        expect(verdict()).toBe(NOT_BOIL)
        await user.clear(celsius)
        await user.type(celsius, typed)
        expect(celsius).toHaveValue(typed) // the text stays visible
        expect(fahrenheit).toHaveValue('')
        expect(verdict()).toBe(ENTER)
      },
    )

    it.each([['abc'], ['-'], ['.'], ['12abc'], ['Infinity'], ['   ']])(
      'typing %j in Fahrenheit is not a number, so Celsius is empty and the sentence asks for a temperature',
      async (typed) => {
        const { user, celsius, fahrenheit } = setup()
        await user.type(celsius, '20') // start from a good state
        expect(verdict()).toBe(NOT_BOIL)
        await user.clear(fahrenheit)
        await user.type(fahrenheit, typed)
        expect(fahrenheit).toHaveValue(typed)
        expect(celsius).toHaveValue('')
        expect(verdict()).toBe(ENTER)
      },
    )

    // Anything that Number() turns into a finite number counts as a number.
    it.each([
      ['celsius', '.5', 'fahrenheit', '32.9'],
      ['celsius', '1e1', 'fahrenheit', '50'],
      ['celsius', ' 10 ', 'fahrenheit', '50'],
      ['fahrenheit', '.5', 'celsius', '-17.5'],
    ])('typing in %s: %j is a number, so %s shows %s', async (from, typed, to, expected) => {
      const { user, ...fields } = setup()
      await user.type(fields[from], typed)
      expect(fields[from]).toHaveValue(typed)
      expect(fields[to]).toHaveValue(expected)
    })

    it('lets you type the minus sign first and the digits after it', async () => {
      const { user, celsius, fahrenheit } = setup()
      await user.type(celsius, '-')
      expect(celsius).toHaveValue('-')
      expect(fahrenheit).toHaveValue('')
      await user.type(celsius, '4')
      expect(celsius).toHaveValue('-4')
      expect(fahrenheit).toHaveValue('24.8')
    })
  })

  describe('the boiling sentence', () => {
    it.each([
      ['celsius', '100', BOIL],
      ['celsius', '250', BOIL],
      ['celsius', '99.99', NOT_BOIL],
      ['celsius', '0', NOT_BOIL],
      ['celsius', '-40', NOT_BOIL],
      ['fahrenheit', '212', BOIL],
      ['fahrenheit', '211', NOT_BOIL],
      ['fahrenheit', '32', NOT_BOIL],
    ])('typing in %s: %s gives "%s"', async (field, typed, expected) => {
      const { user, ...fields } = setup()
      await user.type(fields[field], typed)
      expect(verdict()).toBe(expected)
    })

    it('asks for a temperature again when the text is emptied or is not a number', async () => {
      const { user, celsius, fahrenheit } = setup()

      await user.type(celsius, '100')
      expect(verdict()).toBe(BOIL)

      await user.clear(celsius)
      expect(verdict()).toBe(ENTER)

      await user.type(fahrenheit, '70')
      expect(verdict()).toBe(NOT_BOIL)

      await user.clear(fahrenheit)
      await user.type(fahrenheit, 'hot')
      expect(verdict()).toBe(ENTER)
    })

    it('uses the Celsius value as shown: typed text as it is, converted text after rounding', async () => {
      const { user, celsius, fahrenheit } = setup()

      // Typed in Celsius: 99.999 is below 100, even though it would round to 100.
      await user.type(celsius, '99.999')
      expect(verdict()).toBe(NOT_BOIL)

      // Typed in Fahrenheit: 211.999 F is 99.99944 C, and the Celsius input shows 100.
      await user.clear(fahrenheit)
      await user.type(fahrenheit, '211.999')
      expect(celsius).toHaveValue('100')
      expect(verdict()).toBe(BOIL)
    })

    it('shows exactly one sentence at a time', async () => {
      const { user, celsius } = setup()
      await user.type(celsius, '100')
      expect(screen.getAllByTestId('verdict')).toHaveLength(1)
      expect(screen.queryByText(NOT_BOIL)).not.toBeInTheDocument()
      expect(screen.queryByText(ENTER)).not.toBeInTheDocument()
    })
  })
})
