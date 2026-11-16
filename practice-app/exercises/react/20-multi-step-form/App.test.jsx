import { StrictMode } from 'react'
import { createEvent, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

// Walking through the whole wizard is a lot of work for jsdom, so give slow computers some room.
vi.setConfig({ testTimeout: 15000 })

const LABEL = {
  email: 'Email',
  password: 'Password',
  fullName: 'Full name',
  age: 'Age',
}

const MESSAGES = {
  email: 'Enter a valid email address',
  password: 'Password must be at least 8 characters',
  fullName: 'Full name is required',
  age: 'Age must be a whole number from 18 to 120',
}

const VALID = {
  email: 'ada@example.com',
  password: 'secret123',
  fullName: 'Ada Lovelace',
  age: '36',
}

const ACCOUNT_FIELDS = ['email', 'password']
const PROFILE_FIELDS = ['fullName', 'age']

function setup(props, { strict = false } = {}) {
  // delay: null skips the tiny pause between key presses, so the suite stays fast.
  const user = userEvent.setup({ delay: null })
  const ui = <App {...props} />
  // StrictMode is what the playground uses: it runs state updaters and effects twice.
  render(strict ? <StrictMode>{ui}</StrictMode> : ui)
  return user
}

const field = (key) => screen.getByLabelText(LABEL[key])
const button = (name) => screen.getByRole('button', { name })
const next = (user) => user.click(button('Next'))

// Clicks into a field and pastes text at the end of it ('' leaves the field untouched).
// Pasting the whole string at once is much faster than typing it key by key, and it
// keeps spaces exactly as given. (Tests that care about single key presses use user.type.)
async function addText(user, key, text) {
  if (text === '') return
  await user.click(field(key))
  await user.paste(text)
}

// Replaces whatever is in a field.
async function replace(user, key, text) {
  await user.clear(field(key))
  await addText(user, key, text)
}

// Fills step 1. Pass overrides to change a value ('' leaves the field empty).
async function fillAccount(user, overrides = {}) {
  const v = { ...VALID, ...overrides }
  await addText(user, 'email', v.email)
  await addText(user, 'password', v.password)
}

async function fillProfile(user, overrides = {}) {
  const v = { ...VALID, ...overrides }
  await addText(user, 'fullName', v.fullName)
  await addText(user, 'age', v.age)
}

// Fills step 1 and presses Next. Ends on step 2.
async function goToProfile(user, overrides = {}) {
  await fillAccount(user, overrides)
  await next(user)
}

// Walks through steps 1 and 2 with valid data. Ends on step 3.
async function goToReview(user, overrides = {}) {
  await goToProfile(user, overrides)
  await fillProfile(user, overrides)
  await next(user)
}

function expectStep(number, title) {
  expect(screen.getByTestId('progress')).toHaveTextContent(new RegExp(`^Step ${number} of 3$`))
  expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
}

// Checks that exactly these fields show an error, each one linked with
// aria-describedby, and that every other field of the step is free of error markup.
function expectErrors(stepFields, invalidKeys) {
  expect(screen.queryAllByRole('alert')).toHaveLength(invalidKeys.length)
  for (const key of stepFields) {
    const input = field(key)
    if (invalidKeys.includes(key)) {
      expect(input).toHaveAccessibleDescription(MESSAGES[key])
      expect(input).toHaveAttribute('aria-invalid', 'true')
    } else {
      expect(input).not.toHaveAttribute('aria-describedby')
      expect(input).not.toHaveAttribute('aria-invalid', 'true')
    }
  }
}

describe('20 Multi-step form', () => {
  describe('structure', () => {
    it('starts on step 1 with empty Email and Password fields, a Next button and no Back button', () => {
      setup()
      expectStep(1, 'Account')
      // The "Sign up" heading and ONE form with novalidate (the wizard is a single form).
      expect(screen.getByRole('heading', { level: 2, name: 'Sign up' })).toBeInTheDocument()
      expect(document.querySelectorAll('form')).toHaveLength(1)
      expect(document.querySelector('form')).toHaveAttribute('novalidate')
      expect(field('email').type).toBe('email')
      expect(field('password').type).toBe('password')
      expect(field('email')).toHaveValue('')
      expect(field('password')).toHaveValue('')
      expect(button('Next')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
      expect(screen.queryByLabelText(LABEL.fullName)).not.toBeInTheDocument()
      expect(screen.queryAllByRole('alert')).toHaveLength(0)
      expect(screen.queryByText(/All done/)).not.toBeInTheDocument()
    })

    it('step 2 shows Full name and Age (empty) with Back and Next buttons', async () => {
      const user = setup()
      await goToProfile(user)
      expectStep(2, 'Profile')
      expect(field('fullName').type).toBe('text')
      expect(field('age').type).toBe('text')
      expect(field('age')).toHaveAttribute('inputmode', 'numeric')
      expect(field('fullName')).toHaveValue('')
      expect(field('age')).toHaveValue('')
      expect(button('Back')).toBeInTheDocument()
      expect(button('Next')).toBeInTheDocument()
      expect(screen.queryByLabelText(LABEL.email)).not.toBeInTheDocument()
      expect(screen.queryAllByRole('alert')).toHaveLength(0)
    })
  })

  describe('step 1 validation (Account)', () => {
    it('blocks Next on an empty step and shows two linked inline errors', async () => {
      const user = setup()
      await next(user)
      expectStep(1, 'Account')
      expectErrors(ACCOUNT_FIELDS, ['email', 'password'])
      expect(screen.getByText(MESSAGES.email)).toBeInTheDocument()
      expect(screen.getByText(MESSAGES.password)).toBeInTheDocument()
    })

    it('only the invalid field shows an error, the valid one has no error markup', async () => {
      const user = setup()
      await fillAccount(user, { password: 'short' })
      await next(user)
      expectStep(1, 'Account')
      expectErrors(ACCOUNT_FIELDS, ['password'])
    })

    it('keeps everything that was typed when Next is blocked', async () => {
      const user = setup()
      await fillAccount(user, { password: 'short' })
      await next(user)
      expectStep(1, 'Account')
      expect(field('email')).toHaveValue(VALID.email)
      expect(field('password')).toHaveValue('short')
    })

    it.each(['ada', 'ada@', 'ada@example', '@example.com', 'ada@example.', 'ada@@example.com', 'ada lovelace@example.com'])(
      'rejects the email %s',
      async (email) => {
        const user = setup()
        await fillAccount(user, { email })
        await next(user)
        expectStep(1, 'Account')
        expectErrors(ACCOUNT_FIELDS, ['email'])
      },
    )

    it.each(['ada@example.com', 'ada.lovelace+test@mail.example.co.uk'])('accepts the email %s', async (email) => {
      const user = setup()
      await goToProfile(user, { email })
      expectStep(2, 'Profile')
    })

    it('rejects a 7 character password', async () => {
      const user = setup()
      await fillAccount(user, { password: 'abcdefg' })
      await next(user)
      expectStep(1, 'Account')
      expectErrors(ACCOUNT_FIELDS, ['password'])
    })

    it('accepts an 8 character password', async () => {
      const user = setup()
      await goToProfile(user, { password: 'abcdefgh' })
      expectStep(2, 'Profile')
    })

    it('counts spaces as password characters', async () => {
      const user = setup()
      await goToProfile(user, { password: 'a b c d ' })
      expectStep(2, 'Profile')
    })

    it('does not validate while typing or when a field loses focus', async () => {
      const user = setup()
      await user.type(field('email'), 'not-an-email')
      await user.type(field('password'), 'abc')
      await user.tab()
      expectStep(1, 'Account')
      expect(screen.queryAllByRole('alert')).toHaveLength(0)
    })

    it('editing a field removes only its own error, and nothing is re-validated until the next Next', async () => {
      const user = setup()
      await next(user)
      expectErrors(ACCOUNT_FIELDS, ['email', 'password'])

      // One character is enough to remove the email error, even though it is still invalid.
      await user.type(field('email'), 'a')
      expectErrors(ACCOUNT_FIELDS, ['password'])

      // The next press of Next validates again.
      await next(user)
      expectErrors(ACCOUNT_FIELDS, ['email', 'password'])
    })
  })

  describe('step 2 validation (Profile)', () => {
    it('blocks Next on an empty step and shows two linked inline errors', async () => {
      const user = setup()
      await goToProfile(user)
      await next(user)
      expectStep(2, 'Profile')
      expectErrors(PROFILE_FIELDS, ['fullName', 'age'])
      expect(screen.getByText(MESSAGES.fullName)).toBeInTheDocument()
      expect(screen.getByText(MESSAGES.age)).toBeInTheDocument()
    })

    it('rejects a full name made only of spaces', async () => {
      const user = setup()
      await goToProfile(user)
      await fillProfile(user, { fullName: '   ' })
      await next(user)
      expectStep(2, 'Profile')
      expectErrors(PROFILE_FIELDS, ['fullName'])
    })

    it('accepts a full name with a single character', async () => {
      const user = setup()
      await goToProfile(user)
      await fillProfile(user, { fullName: 'A' })
      await next(user)
      expectStep(3, 'Review')
    })

    it('keeps everything that was typed when Next is blocked', async () => {
      const user = setup()
      await goToProfile(user)
      await fillProfile(user, { age: 'abc' })
      await next(user)
      expectStep(2, 'Profile')
      expect(field('fullName')).toHaveValue(VALID.fullName)
      expect(field('age')).toHaveValue('abc')
    })

    it.each([
      ['empty', ''],
      ['letters', 'abc'],
      ['0', '0'],
      ['17 (too young)', '17'],
      ['121 (too old)', '121'],
      ['a decimal number', '18.5'],
      ['a negative number', '-20'],
      ['exponent notation', '1e2'],
      ['a plus sign', '+30'],
    ])('rejects the age: %s', async (_description, age) => {
      const user = setup()
      await goToProfile(user)
      await fillProfile(user, { age })
      await next(user)
      expectStep(2, 'Profile')
      expectErrors(PROFILE_FIELDS, ['age'])
    })

    it.each(['18', '36', '120', ' 36 '])('accepts the age "%s"', async (age) => {
      const user = setup()
      await goToProfile(user)
      await fillProfile(user, { age })
      await next(user)
      expectStep(3, 'Review')
    })

    it('editing the age removes only the age error', async () => {
      const user = setup()
      await goToProfile(user)
      await next(user)
      expectErrors(PROFILE_FIELDS, ['fullName', 'age'])
      await user.type(field('age'), '1')
      expectErrors(PROFILE_FIELDS, ['fullName'])
    })

    it('does not validate while typing or when a field loses focus', async () => {
      const user = setup()
      await goToProfile(user)
      await user.type(field('age'), 'abc')
      await user.tab()
      expect(screen.queryAllByRole('alert')).toHaveLength(0)
    })
  })

  describe('moving between steps and keeping data', () => {
    it('Back keeps everything typed on both steps', async () => {
      const user = setup()
      await goToProfile(user)
      await fillProfile(user)

      await user.click(button('Back'))
      expectStep(1, 'Account')
      expect(field('email')).toHaveValue(VALID.email)
      expect(field('password')).toHaveValue(VALID.password)

      await next(user)
      expectStep(2, 'Profile')
      expect(field('fullName')).toHaveValue(VALID.fullName)
      expect(field('age')).toHaveValue(VALID.age)
    })

    it('Back does not need valid data and keeps invalid text too', async () => {
      const user = setup()
      await goToProfile(user)
      await fillProfile(user, { fullName: 'Ada', age: 'abc' })

      await user.click(button('Back'))
      expectStep(1, 'Account')
      expect(screen.queryAllByRole('alert')).toHaveLength(0)

      await next(user)
      expect(field('fullName')).toHaveValue('Ada')
      expect(field('age')).toHaveValue('abc')
      // Coming back does not show errors until Next is pressed again.
      expect(screen.queryAllByRole('alert')).toHaveLength(0)
    })

    it('Back works even when the current step is empty and shows no errors', async () => {
      const user = setup()
      await goToProfile(user)
      await user.click(button('Back'))
      expectStep(1, 'Account')
      expect(screen.queryAllByRole('alert')).toHaveLength(0)
    })

    it('error messages do not follow you to another step', async () => {
      const user = setup()
      await goToProfile(user)
      await next(user)
      expectErrors(PROFILE_FIELDS, ['fullName', 'age'])

      await user.click(button('Back'))
      expect(screen.queryAllByRole('alert')).toHaveLength(0)
      await next(user)
      expectStep(2, 'Profile')
      expect(screen.queryAllByRole('alert')).toHaveLength(0)
    })

    it('cannot go forward again with invalid data after changing an earlier step', async () => {
      const user = setup()
      await goToProfile(user)
      await user.click(button('Back'))
      await replace(user, 'email', 'broken')
      await next(user)
      expectStep(1, 'Account')
      expectErrors(ACCOUNT_FIELDS, ['email'])
    })
  })

  describe('Review step', () => {
    it('shows step 3 of 3 with every value, the password masked, and no inputs', async () => {
      const user = setup()
      await goToReview(user)
      expectStep(3, 'Review')

      expect(screen.getByTestId('review-email')).toHaveTextContent(VALID.email)
      expect(screen.getByTestId('review-password')).toHaveTextContent(/^\*{9}$/)
      expect(screen.getByTestId('review-fullName')).toHaveTextContent(VALID.fullName)
      expect(screen.getByTestId('review-age')).toHaveTextContent(VALID.age)
      // The secret itself must not be on screen.
      expect(screen.queryByText(VALID.password)).not.toBeInTheDocument()

      // Each value has a visible text label.
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Password')).toBeInTheDocument()
      expect(screen.getByText('Full name')).toBeInTheDocument()
      expect(screen.getByText('Age')).toBeInTheDocument()

      // No inputs at all (not even hidden ones).
      expect(document.querySelector('input')).toBeNull()
    })

    it('masks the password with one asterisk per character, spaces included', async () => {
      const user = setup()
      const password = 'correct horse '
      await goToReview(user, { password })
      expect(screen.getByTestId('review-password')).toHaveTextContent(/^\*{14}$/)
    })

    it('has Back, Submit, Edit account and Edit profile buttons and no Next button', async () => {
      const user = setup()
      await goToReview(user)
      expect(button('Back')).toBeInTheDocument()
      expect(button('Submit')).toBeInTheDocument()
      expect(button('Edit account')).toBeInTheDocument()
      expect(button('Edit profile')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    })

    it('Back returns to step 2 with the values still there', async () => {
      const user = setup()
      await goToReview(user)
      await user.click(button('Back'))
      expectStep(2, 'Profile')
      expect(field('fullName')).toHaveValue(VALID.fullName)
      expect(field('age')).toHaveValue(VALID.age)
    })

    it('Edit account jumps to step 1 with the values kept, and changes show up in the review', async () => {
      const user = setup()
      await goToReview(user)

      await user.click(button('Edit account'))
      expectStep(1, 'Account')
      expect(field('email')).toHaveValue(VALID.email)
      expect(field('password')).toHaveValue(VALID.password)

      await replace(user, 'email', 'grace@example.org')
      await next(user)
      expectStep(2, 'Profile')
      expect(field('fullName')).toHaveValue(VALID.fullName)
      await next(user)

      expectStep(3, 'Review')
      expect(screen.getByTestId('review-email')).toHaveTextContent('grace@example.org')
      expect(screen.getByTestId('review-fullName')).toHaveTextContent(VALID.fullName)
      expect(screen.getByTestId('review-age')).toHaveTextContent(VALID.age)
    })

    it('Edit profile jumps to step 2 with the values kept, and changes show up in the review', async () => {
      const user = setup()
      await goToReview(user)

      await user.click(button('Edit profile'))
      expectStep(2, 'Profile')
      expect(field('fullName')).toHaveValue(VALID.fullName)
      expect(field('age')).toHaveValue(VALID.age)

      await replace(user, 'fullName', 'Grace Hopper')
      await replace(user, 'age', '85')
      await next(user)

      expectStep(3, 'Review')
      expect(screen.getByTestId('review-email')).toHaveTextContent(VALID.email)
      expect(screen.getByTestId('review-fullName')).toHaveTextContent('Grace Hopper')
      expect(screen.getByTestId('review-age')).toHaveTextContent('85')
    })

    it('edited data is validated again before the Review step is shown', async () => {
      const user = setup()
      await goToReview(user)
      await user.click(button('Edit profile'))
      await replace(user, 'age', '5')
      await next(user)
      expectStep(2, 'Profile')
      expectErrors(PROFILE_FIELDS, ['age'])
    })
  })

  describe('Submit', () => {
    it('does not call onSubmit before the Submit button is pressed', async () => {
      const onSubmit = vi.fn()
      const user = setup({ onSubmit })
      await goToReview(user)
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('calls onSubmit once with all four values', async () => {
      const onSubmit = vi.fn()
      const user = setup({ onSubmit })
      await goToReview(user)
      await user.click(button('Submit'))
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith({
        email: VALID.email,
        password: VALID.password,
        fullName: VALID.fullName,
        age: VALID.age,
      })
    })

    it('sends the edited values when the user went back and changed things', async () => {
      const onSubmit = vi.fn()
      const user = setup({ onSubmit })
      await goToReview(user)
      await user.click(button('Edit profile'))
      await replace(user, 'fullName', 'Grace Hopper')
      await next(user)
      await user.click(button('Submit'))
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith({ ...VALID, fullName: 'Grace Hopper' })
    })

    it('sends the values exactly as typed, spaces included', async () => {
      const onSubmit = vi.fn()
      const user = setup({ onSubmit })
      const typed = { ...VALID, fullName: '  Ada Lovelace ', age: ' 36 ' }
      await goToReview(user, typed)
      await user.click(button('Submit'))
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(typed)
    })

    it('calls onSubmit only once even in StrictMode', async () => {
      const onSubmit = vi.fn()
      const user = setup({ onSubmit }, { strict: true })
      await goToReview(user)
      await user.click(button('Submit'))
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(VALID)
    })

    it('replaces the wizard with the message "All done, {name}!"', async () => {
      const user = setup()
      await goToReview(user)
      await user.click(button('Submit'))

      expect(screen.getByRole('heading', { level: 2, name: 'Sign up' })).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent(/^All done, Ada Lovelace!$/)
      expect(screen.queryByTestId('progress')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
      expect(screen.queryByLabelText(LABEL.email)).not.toBeInTheDocument()
      expect(screen.queryByTestId('review-email')).not.toBeInTheDocument()
    })

    it('leaves surrounding spaces out of the name in the message', async () => {
      const user = setup()
      await goToReview(user, { fullName: '  Ada  ' })
      await user.click(button('Submit'))
      expect(screen.getByRole('status')).toHaveTextContent(/^All done, Ada!$/)
    })

    it('works without an onSubmit prop', async () => {
      const user = setup()
      await goToReview(user)
      await user.click(button('Submit'))
      expect(screen.getByRole('status')).toHaveTextContent('All done, Ada Lovelace!')
    })
  })

  describe('keyboard', () => {
    it('pressing Enter in a field works like the Next button', async () => {
      const user = setup()
      await user.type(field('email'), VALID.email)
      await user.type(field('password'), `${VALID.password}{Enter}`)
      expectStep(2, 'Profile')

      await user.type(field('fullName'), VALID.fullName)
      await user.type(field('age'), `${VALID.age}{Enter}`)
      expectStep(3, 'Review')
    })

    it('pressing Enter on an invalid step shows the errors and stays on the step', async () => {
      const user = setup()
      await user.type(field('email'), 'nope{Enter}')
      expectStep(1, 'Account')
      expectErrors(ACCOUNT_FIELDS, ['email', 'password'])
    })

    it('the Back button does not submit the form', async () => {
      const user = setup()
      await goToProfile(user)
      await user.click(button('Back'))
      // If Back had submitted the form, validation would have run and we would
      // already be on step 2 again.
      expectStep(1, 'Account')
    })
  })

  describe('no page reload', () => {
    // A real browser reloads the page when a submit event is not cancelled.
    // jsdom does not reload, so we send the submit event ourselves and check
    // that the handler cancelled it. Returns true when it was cancelled.
    function submitForm() {
      const form = document.querySelector('form')
      const event = createEvent.submit(form)
      fireEvent(form, event)
      return event.defaultPrevented
    }

    it('cancels the default submit action on every step, valid or not', async () => {
      const user = setup()
      expect(submitForm()).toBe(true) // step 1, invalid
      expectErrors(ACCOUNT_FIELDS, ['email', 'password'])

      await fillAccount(user)
      expect(submitForm()).toBe(true) // step 1, valid
      expectStep(2, 'Profile')

      expect(submitForm()).toBe(true) // step 2, invalid
      expectErrors(PROFILE_FIELDS, ['fullName', 'age'])

      await fillProfile(user)
      expect(submitForm()).toBe(true) // step 2, valid
      expectStep(3, 'Review')

      expect(submitForm()).toBe(true) // Review step
      expect(screen.getByRole('status')).toHaveTextContent('All done, Ada Lovelace!')
    })
  })
})
