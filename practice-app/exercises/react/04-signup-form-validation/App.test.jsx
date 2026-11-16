import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

const LABELS = {
  name: 'Name',
  email: 'Email',
  password: 'Password',
  confirm: 'Confirm password',
}

const MESSAGES = {
  name: 'Name is required',
  email: 'Enter a valid email address',
  password: 'Password must be at least 8 characters',
  confirm: 'Passwords do not match',
}

const VALID = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'secret123',
  confirm: 'secret123',
}

function setup() {
  // delay: null skips the tiny pause between key presses, so the suite stays fast.
  const user = userEvent.setup({ delay: null })
  render(<App />)
  return user
}

// The label text is exact, so a string query finds "Password" but not "Confirm password".
const field = (key) => screen.getByLabelText(LABELS[key])
const submitButton = () => screen.getByRole('button', { name: /create account/i })

// Types into the four fields. Pass overrides to change a value ('' leaves the field empty).
async function fill(user, overrides = {}) {
  const values = { ...VALID, ...overrides }
  for (const key of Object.keys(LABELS)) {
    if (values[key] !== '') await user.type(field(key), values[key])
  }
}

// Checks that exactly these fields show an error, each one linked with aria-describedby,
// and that every other field is free of error markup.
function expectErrors(invalidKeys) {
  expect(screen.queryAllByRole('alert')).toHaveLength(invalidKeys.length)
  for (const key of Object.keys(LABELS)) {
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

function expectSuccess(name) {
  expect(screen.getByRole('status')).toHaveTextContent(`Account created for ${name}`)
  expect(screen.queryAllByRole('alert')).toHaveLength(0)
}

// No success text on screen. (An empty role="status" region would be fine, only the text matters.)
function expectNoSuccess() {
  expect(screen.queryByText(/account created/i)).not.toBeInTheDocument()
}

describe('04 Signup form with validation', () => {
  describe('structure', () => {
    it('renders four labelled empty fields and a submit button, with no messages yet', () => {
      setup()
      expect(field('name').type).toBe('text')
      expect(field('email').type).toBe('email')
      expect(field('password').type).toBe('password')
      expect(field('confirm').type).toBe('password')
      for (const key of Object.keys(LABELS)) {
        expect(field(key)).toHaveValue('')
      }
      expect(submitButton()).toBeInTheDocument()
      expect(screen.queryAllByRole('alert')).toHaveLength(0)
      expectNoSuccess()
    })

    it('turns off the browser validation with noValidate', () => {
      const { container } = render(<App />)
      expect(container.querySelector('form')).toHaveAttribute('novalidate')
    })
  })

  describe('validation rules (checked on submit)', () => {
    it('shows an error for every invalid field when an empty form is submitted', async () => {
      const user = setup()
      await user.click(submitButton())
      // Two empty passwords are equal, so the confirm field has no error here.
      expectErrors(['name', 'email', 'password'])
    })

    it('treats a name made only of spaces as missing', async () => {
      const user = setup()
      await fill(user, { name: '   ' })
      await user.click(submitButton())
      expectErrors(['name'])
    })

    // Spaces at the very start or end are removed by the browser itself for type="email",
    // so only spaces inside the text can reach the validation.
    it.each([
      'ada',
      'ada@',
      'ada@example',
      '@example.com',
      'ada@example.',
      'ada@@example.com',
      'ada lovelace@example.com',
      'ada@exam ple.com',
    ])(
      'rejects the email "%s"',
      async (email) => {
        const user = setup()
        await fill(user, { email })
        await user.click(submitButton())
        expectErrors(['email'])
      },
    )

    it.each(['ada@example.com', 'ada.lovelace+test@mail.example.co.uk'])(
      'accepts the email "%s"',
      async (email) => {
        const user = setup()
        await fill(user, { email })
        await user.click(submitButton())
        expectSuccess('Ada Lovelace')
      },
    )

    it('rejects a password shorter than 8 characters', async () => {
      const user = setup()
      await fill(user, { password: 'abcdefg', confirm: 'abcdefg' })
      await user.click(submitButton())
      expectErrors(['password'])
    })

    it('accepts a password with exactly 8 characters', async () => {
      const user = setup()
      await fill(user, { password: 'abcdefgh', confirm: 'abcdefgh' })
      await user.click(submitButton())
      expectSuccess('Ada Lovelace')
    })

    it('counts spaces as characters when checking the password length', async () => {
      const user = setup()
      await fill(user, { password: 'abc     ', confirm: 'abc     ' })
      await user.click(submitButton())
      expectSuccess('Ada Lovelace')
    })

    it('rejects a confirm password that differs from the password', async () => {
      const user = setup()
      await fill(user, { confirm: 'secret124' })
      await user.click(submitButton())
      expectErrors(['confirm'])
    })

    it('compares the two passwords exactly, including upper and lower case', async () => {
      const user = setup()
      await fill(user, { password: 'Secret123', confirm: 'secret123' })
      await user.click(submitButton())
      expectErrors(['confirm'])
    })

    it('compares the two passwords exactly, including spaces', async () => {
      const user = setup()
      await fill(user, { confirm: 'secret123 ' })
      await user.click(submitButton())
      expectErrors(['confirm'])
    })
  })

  describe('showing errors', () => {
    it('shows all four errors at once and links each one to its input', async () => {
      const user = setup()
      await fill(user, { name: '', email: 'nope', password: 'short', confirm: 'other' })
      await user.click(submitButton())
      expectErrors(['name', 'email', 'password', 'confirm'])

      for (const key of Object.keys(LABELS)) {
        const input = field(key)
        expect(input).toHaveAttribute('aria-describedby')
        const message = document.getElementById(input.getAttribute('aria-describedby'))
        expect(message).toHaveAttribute('role', 'alert')
        expect(message).toHaveTextContent(MESSAGES[key])
      }
    })

    it('does not submit when the form is invalid and keeps what the user typed', async () => {
      const user = setup()
      await fill(user, { email: 'nope' })
      await user.click(submitButton())

      expectNoSuccess()
      expect(field('name')).toHaveValue('Ada Lovelace')
      expect(field('email')).toHaveValue('nope')
      expect(field('password')).toHaveValue('secret123')
      expect(field('confirm')).toHaveValue('secret123')
    })

    it('does not validate while the user types or when a field loses focus', async () => {
      const user = setup()
      // Type something invalid in every field and leave each one with Tab.
      await user.type(field('name'), '  ')
      await user.tab()
      await user.type(field('email'), 'nope')
      await user.tab()
      await user.type(field('password'), 'short')
      await user.tab()
      await user.type(field('confirm'), 'other')
      await user.tab()
      expect(screen.queryAllByRole('alert')).toHaveLength(0)

      await user.click(submitButton())
      expectErrors(['name', 'email', 'password', 'confirm'])
    })

    it('does not let the browser reload the page when the form is submitted', async () => {
      // The browser reloads the page after a submit unless the handler prevents it.
      // React handles the event first, so by the time it bubbles up to the document
      // we can see whether the default action was cancelled.
      const submits = []
      const record = (event) => submits.push(event.defaultPrevented)
      document.addEventListener('submit', record)
      try {
        const user = setup()
        await user.click(submitButton()) // invalid form
        await fill(user)
        await user.click(submitButton()) // valid form
        expect(submits).toEqual([true, true])
      } finally {
        document.removeEventListener('submit', record)
      }
    })
  })

  describe('clearing errors', () => {
    it('removes an error as soon as the user edits that field, even if it is still invalid', async () => {
      const user = setup()
      await user.click(submitButton())
      expectErrors(['name', 'email', 'password'])

      // One character is not a valid email yet, but the error must already be gone.
      await user.type(field('email'), 'a')
      expectErrors(['name', 'password'])
    })

    it('removes only the error of the field that was edited', async () => {
      const user = setup()
      await fill(user, { email: 'nope', password: 'short', confirm: 'other' })
      await user.click(submitButton())
      expectErrors(['email', 'password', 'confirm'])

      await user.type(field('password'), '12345')
      expectErrors(['email', 'confirm'])
    })

    it('keeps the errors when a field is only visited, not edited', async () => {
      const user = setup()
      await user.click(submitButton())
      expectErrors(['name', 'email', 'password'])

      // Click into the first field, then Tab through all the others.
      await user.click(field('name'))
      await user.tab()
      await user.tab()
      await user.tab()
      await user.tab()
      expectErrors(['name', 'email', 'password'])
    })

    it('leaves no stale errors behind after a valid submit', async () => {
      const user = setup()
      await fill(user, { password: 'short', confirm: 'secret123' })
      await user.click(submitButton())
      expectErrors(['password', 'confirm'])

      await user.clear(field('password'))
      await user.type(field('password'), 'secret123')
      // The confirm error is still on screen: nobody edited that field.
      expectErrors(['confirm'])

      await user.click(submitButton())
      expectSuccess('Ada Lovelace')
    })
  })

  describe('successful submit', () => {
    it('shows "Account created for {name}" and clears the form', async () => {
      const user = setup()
      await fill(user)
      await user.click(submitButton())

      expectSuccess('Ada Lovelace')
      for (const key of Object.keys(LABELS)) {
        expect(field(key)).toHaveValue('')
      }
    })

    it('also submits with the Enter key', async () => {
      const user = setup()
      await fill(user, { confirm: 'secret123{Enter}' })
      expectSuccess('Ada Lovelace')
    })

    it('keeps the success message while the user edits or leaves a field', async () => {
      const user = setup()
      await fill(user)
      await user.click(submitButton())
      expectSuccess('Ada Lovelace')

      await user.type(field('name'), 'Grace')
      await user.tab()
      await user.type(field('email'), 'g')
      await user.tab()
      expectSuccess('Ada Lovelace')
    })

    it('keeps the success message until the next submit, however much time passes', async () => {
      // shouldAdvanceTime lets the short waits inside Testing Library finish while the clock is fake.
      vi.useFakeTimers({ shouldAdvanceTime: true })
      try {
        const user = setup()
        await fill(user)
        await user.click(submitButton())
        expectSuccess('Ada Lovelace')

        act(() => {
          vi.advanceTimersByTime(10 * 60 * 1000)
        })
        expectSuccess('Ada Lovelace')
      } finally {
        vi.useRealTimers()
      }
    })

    it('removes the success message on the next submit and can sign up again', async () => {
      const user = setup()
      await fill(user)
      await user.click(submitButton())
      expectSuccess('Ada Lovelace')

      await user.click(submitButton())
      expectNoSuccess()
      expectErrors(['name', 'email', 'password'])

      await fill(user, { name: 'Grace Hopper', email: 'grace@example.com' })
      await user.click(submitButton())
      expectSuccess('Grace Hopper')
    })
  })
})
