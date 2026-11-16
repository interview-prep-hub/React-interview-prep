import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

function setup() {
  // delay: null skips the tiny pause between key presses, so the suite stays fast.
  const user = userEvent.setup({ delay: null })
  render(<App />)
  return user
}

const control = (label) => screen.getByLabelText(label)
const submit = (user) => user.click(screen.getByRole('button', { name: 'Submit' }))
const alertTexts = () => screen.queryAllByRole('alert').map((el) => el.textContent)
const submittedJson = () => JSON.parse(screen.getByTestId('submitted-json').textContent)

// Fills the required fields of the sample schema with valid values.
async function fillRequired(user) {
  await user.type(control('Full name'), 'Ada Lovelace')
  await user.type(control('Email'), 'ada@example.com')
  await user.type(control('Age'), '36')
  await user.selectOptions(control('Role'), 'Developer')
  await user.click(control('I accept the terms'))
}

describe('30 Dynamic form builder (App with the sample schema)', () => {
  it('shows a heading and the fields of the sample schema that are visible at the start', () => {
    setup()
    expect(
      screen.getByRole('heading', { name: 'Dynamic form builder', level: 2 }),
    ).toBeInTheDocument()
    expect(control('Full name')).toBeInTheDocument()
    expect(control('Email')).toBeInTheDocument()
    expect(control('Age')).toBeInTheDocument()
    expect(control('Role')).toBeInTheDocument()
    expect(control('I work for a company')).not.toBeChecked()
    expect(control('I accept the terms')).not.toBeChecked()
    // These two depend on other fields.
    expect(screen.queryByLabelText('Company name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Team size')).not.toBeInTheDocument()
    // Nothing has been submitted yet.
    expect(screen.queryByTestId('submitted-json')).not.toBeInTheDocument()
    expect(screen.queryByText('Submitted values')).not.toBeInTheDocument()
  })

  it('shows the required errors of the sample schema on an empty submit', async () => {
    const user = setup()
    await submit(user)
    expect(alertTexts()).toEqual([
      'Full name is required',
      'Email is required',
      'Age is required',
      'Role is required',
      'I accept the terms is required',
    ])
    expect(screen.queryByTestId('submitted-json')).not.toBeInTheDocument()
  })

  it('applies the rules of the sample schema', async () => {
    const user = setup()
    await user.type(control('Full name'), 'A')
    await user.type(control('Email'), 'ada@example')
    await user.type(control('Age'), '17')
    await submit(user)
    expect(alertTexts()).toEqual([
      'Full name must be at least 2 characters',
      'Enter a valid email address',
      'Age must be at least 18',
      'Role is required',
      'I accept the terms is required',
    ])

    await user.clear(control('Age'))
    await user.type(control('Age'), '121')
    await submit(user)
    expect(screen.getByText('Age must be at most 120')).toHaveAttribute('role', 'alert')
  })

  it('shows Company name only while "I work for a company" is checked', async () => {
    const user = setup()
    await user.click(control('I work for a company'))
    expect(control('Company name')).toBeInTheDocument()
    await user.click(control('I work for a company'))
    expect(screen.queryByLabelText('Company name')).not.toBeInTheDocument()
  })

  it('shows Team size only when the role is Manager', async () => {
    const user = setup()
    await user.selectOptions(control('Role'), 'Manager')
    expect(control('Team size')).toBeInTheDocument()
    await user.selectOptions(control('Role'), 'Designer')
    expect(screen.queryByLabelText('Team size')).not.toBeInTheDocument()
  })

  it('requires the company name once it is shown, and checks the team size', async () => {
    const user = setup()
    await fillRequired(user)
    await user.click(control('I work for a company'))
    await user.selectOptions(control('Role'), 'Manager')
    await user.type(control('Team size'), '0')
    await submit(user)
    expect(alertTexts()).toEqual(['Team size must be at least 1', 'Company name is required'])
    expect(screen.queryByTestId('submitted-json')).not.toBeInTheDocument()
  })

  it('shows the submitted values as JSON, without the hidden fields', async () => {
    const user = setup()
    await fillRequired(user)
    await submit(user)

    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'Submitted values', level: 3 })).toBeInTheDocument()
    expect(submittedJson()).toStrictEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      age: 36,
      role: 'Developer',
      hasCompany: false,
      terms: true,
    })
  })

  it('formats the JSON with two spaces of indentation', async () => {
    const user = setup()
    await fillRequired(user)
    await submit(user)

    // Whatever the order of the keys is, the text must be JSON.stringify(values, null, 2).
    const text = screen.getByTestId('submitted-json').textContent
    expect(text).toBe(JSON.stringify(JSON.parse(text), null, 2))
    expect(text).toContain('\n  "age": 36')
  })

  it('includes the conditional fields when they are visible', async () => {
    const user = setup()
    await fillRequired(user)
    await user.selectOptions(control('Role'), 'Manager')
    await user.click(control('I work for a company'))
    await user.type(control('Company name'), 'Analytical Engines')
    await submit(user)

    expect(submittedJson()).toStrictEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      age: 36,
      role: 'Manager',
      teamSize: null, // optional and left empty
      hasCompany: true,
      company: 'Analytical Engines',
      terms: true,
    })
  })

  it('keeps the last valid JSON after a failed submit, and replaces it after the next valid one', async () => {
    const user = setup()
    await fillRequired(user)
    await submit(user)
    expect(submittedJson().age).toBe(36)

    await user.clear(control('Age'))
    await user.type(control('Age'), '5')
    await submit(user)
    expect(screen.getByText('Age must be at least 18')).toBeInTheDocument()
    expect(submittedJson().age).toBe(36)

    await user.clear(control('Age'))
    await user.type(control('Age'), '40')
    await submit(user)
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(submittedJson().age).toBe(40)
  })
})
