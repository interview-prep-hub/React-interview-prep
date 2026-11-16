import { createEvent, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DynamicForm from './DynamicForm.jsx'

// ---------- test schemas (passed as props, so the tests do not depend on schema.js) ----------

const baseSchema = [
  { name: 'username', label: 'Username', type: 'text', required: true, minLength: 3 },
  {
    name: 'promo',
    label: 'Promo code',
    type: 'text',
    pattern: '^[A-Z]{3}-\\d{2}$',
    patternMessage: 'Use the format ABC-12',
  },
  { name: 'age', label: 'Age', type: 'number', required: true, min: 18, max: 65 },
  { name: 'plan', label: 'Plan', type: 'select', required: true, options: ['Free', 'Pro', 'Team'] },
  { name: 'news', label: 'Subscribe to the newsletter', type: 'checkbox' },
  { name: 'terms', label: 'Accept the terms', type: 'checkbox', required: true },
]

const conditionalSchema = [
  { name: 'fullName', label: 'Full name', type: 'text', required: true },
  { name: 'contact', label: 'Contact by', type: 'select', options: ['Email', 'Phone'] },
  {
    name: 'phone',
    label: 'Phone number',
    type: 'text',
    required: true,
    showIf: { field: 'contact', equals: 'Phone' },
  },
  { name: 'hasPet', label: 'I have a pet', type: 'checkbox' },
  {
    name: 'petKind',
    label: 'Kind of pet',
    type: 'select',
    options: ['Cat', 'Dog'],
    showIf: { field: 'hasPet', equals: true },
  },
  {
    name: 'dogName',
    label: 'Dog name',
    type: 'text',
    required: true,
    showIf: { field: 'petKind', equals: 'Dog' },
  },
]

// ---------- helpers ----------

function setup(schema = baseSchema) {
  // delay: null skips the tiny pause between key presses, so the suite stays fast.
  const user = userEvent.setup({ delay: null })
  const onSubmit = vi.fn()
  const view = render(<DynamicForm schema={schema} onSubmit={onSubmit} />)
  return { user, onSubmit, ...view }
}

const control = (label) => screen.getByLabelText(label)
const submit = (user) => user.click(screen.getByRole('button', { name: 'Submit' }))
const alertTexts = () => screen.queryAllByRole('alert').map((el) => el.textContent)

// The values passed to onSubmit. Asserts first, so a form that never submits
// fails with a clear message instead of a TypeError.
function submittedValues(onSubmit) {
  expect(onSubmit).toHaveBeenCalledTimes(1)
  return onSubmit.mock.calls[0][0]
}

function expectError(element, message) {
  expect(element).toHaveAccessibleDescription(message)
  expect(element).toHaveAttribute('aria-invalid', 'true')
}

function expectNoError(element) {
  expect(element).not.toHaveAttribute('aria-describedby')
  expect(element).not.toHaveAttribute('aria-invalid', 'true')
}

// Fills every required field of baseSchema with a valid value.
async function fillValid(user) {
  await user.type(control('Username'), 'ada')
  await user.type(control('Age'), '30')
  await user.selectOptions(control('Plan'), 'Pro')
  await user.click(control('Accept the terms'))
}

// Types a new value into a field that may already contain text.
async function retype(user, element, text) {
  await user.clear(element)
  await user.type(element, text)
}

// ---------- tests ----------

describe('30 DynamicForm: rendering', () => {
  it('renders a labelled control of the right kind for every field type', () => {
    const { container } = setup()
    expect(container.querySelector('form')).toHaveAttribute('novalidate')
    expect(screen.getByRole('textbox', { name: 'Username' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Promo code' })).toHaveValue('')
    expect(screen.getByRole('spinbutton', { name: 'Age' })).toHaveValue(null)
    expect(screen.getByRole('combobox', { name: 'Plan' })).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: 'Subscribe to the newsletter' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Accept the terms' })).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit')
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })

  it('renders the fields in schema order', () => {
    const { container } = setup()
    const labels = [...container.querySelectorAll('input, select')].map(
      (el) => el.labels[0].textContent,
    )
    expect(labels).toEqual([
      'Username',
      'Promo code',
      'Age',
      'Plan',
      'Subscribe to the newsletter',
      'Accept the terms',
    ])
  })

  it('gives a select an empty placeholder option followed by its options', () => {
    setup()
    const select = control('Plan')
    const options = within(select).getAllByRole('option')
    expect(options.map((o) => [o.value, o.textContent])).toEqual([
      ['', 'Select...'],
      ['Free', 'Free'],
      ['Pro', 'Pro'],
      ['Team', 'Team'],
    ])
    expect(select).toHaveValue('')
  })

  it('puts the label of a checkbox after the box', () => {
    setup()
    const box = control('Accept the terms')
    const label = box.labels[0]
    expect(box.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('marks required fields with aria-required and leaves the others alone', () => {
    setup()
    for (const label of ['Username', 'Age', 'Plan', 'Accept the terms']) {
      expect(control(label)).toHaveAttribute('aria-required', 'true')
    }
    for (const label of ['Promo code', 'Subscribe to the newsletter']) {
      expect(control(label)).not.toHaveAttribute('aria-required')
    }
  })
})

describe('30 DynamicForm: validation on submit', () => {
  it('shows a required error under every empty required field and does not submit', async () => {
    const { user, onSubmit } = setup()
    await submit(user)

    expect(alertTexts()).toEqual([
      'Username is required',
      'Age is required',
      'Plan is required',
      'Accept the terms is required',
    ])
    expectError(control('Username'), 'Username is required')
    expectError(control('Age'), 'Age is required')
    expectError(control('Plan'), 'Plan is required')
    expectError(control('Accept the terms'), 'Accept the terms is required')
    // Optional fields have no error markup at all.
    expectNoError(control('Promo code'))
    expectNoError(control('Subscribe to the newsletter'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows each error right after its own control and before the next field', async () => {
    const { user, container } = setup()
    await submit(user)

    const controls = [...container.querySelectorAll('input, select')]
    const invalid = controls.filter((el) => el.getAttribute('aria-invalid') === 'true')
    expect(invalid).toHaveLength(4)
    for (const el of invalid) {
      const message = document.getElementById(el.getAttribute('aria-describedby'))
      expect(message).toHaveAttribute('role', 'alert')
      expect(el.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      const next = controls[controls.indexOf(el) + 1]
      if (next) {
        expect(message.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      }
    }
  })

  it('keeps everything the user typed after a failed submit', async () => {
    const { user, onSubmit } = setup()
    await user.type(control('Username'), 'ab')
    await user.type(control('Age'), '5')
    await user.selectOptions(control('Plan'), 'Team')
    await user.click(control('Subscribe to the newsletter'))
    await submit(user)

    expect(onSubmit).not.toHaveBeenCalled()
    expect(alertTexts()).toHaveLength(3)
    expect(control('Username')).toHaveValue('ab')
    expect(control('Age')).toHaveValue(5)
    expect(control('Plan')).toHaveValue('Team')
    expect(control('Subscribe to the newsletter')).toBeChecked()
  })

  it('stops the browser from reloading the page, on a failed and on a valid submit', async () => {
    const { user, container } = setup([
      { name: 'name', label: 'Name', type: 'text', required: true },
    ])
    const form = container.querySelector('form')

    const failed = createEvent.submit(form)
    fireEvent(form, failed)
    expect(failed.defaultPrevented).toBe(true)

    await user.type(control('Name'), 'Ada')
    const valid = createEvent.submit(form)
    fireEvent(form, valid)
    expect(valid.defaultPrevented).toBe(true)
  })

  it('does not validate while the user types or leaves a field', async () => {
    const { user } = setup()
    await user.type(control('Username'), 'a')
    await user.type(control('Age'), '5')
    await user.tab()
    await user.tab()
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })

  it('treats a text value made only of spaces as empty', async () => {
    const { user } = setup()
    await user.type(control('Username'), '     ')
    await submit(user)
    expectError(control('Username'), 'Username is required')
  })

  it('checks minLength on text fields', async () => {
    const { user } = setup()
    const username = control('Username')
    await user.type(username, 'ab')
    await submit(user)
    expectError(username, 'Username must be at least 3 characters')

    await retype(user, username, 'abc')
    await submit(user)
    expectNoError(username)
  })

  it('counts and matches the trimmed text, not the spaces around it', async () => {
    const { user, onSubmit } = setup()
    const username = control('Username')
    const promo = control('Promo code')
    await user.type(username, 'ab ') // 3 characters with the space, 2 after trimming
    await submit(user)
    expectError(username, 'Username must be at least 3 characters')

    await retype(user, username, ' abc ')
    await user.type(promo, '  ABC-12 ') // the pattern has ^ and $, so only the trimmed text matches
    await user.type(control('Age'), '30')
    await user.selectOptions(control('Plan'), 'Pro')
    await user.click(control('Accept the terms'))
    await submit(user)
    expect(alertTexts()).toEqual([])
    expect(submittedValues(onSubmit)).toMatchObject({ username: 'abc', promo: 'ABC-12' })
  })

  it('checks the pattern and shows the custom patternMessage', async () => {
    const { user } = setup()
    const promo = control('Promo code')
    await user.type(promo, 'abc-12')
    await submit(user)
    expectError(promo, 'Use the format ABC-12')

    await retype(user, promo, 'ABC-12')
    await submit(user)
    expectNoError(promo)
  })

  it('falls back to "<label> is invalid" when the schema has no patternMessage', async () => {
    const { user } = setup([
      { name: 'zip', label: 'Zip code', type: 'text', pattern: '^\\d{5}$' },
    ])
    await user.type(control('Zip code'), '12ab')
    await submit(user)
    expectError(control('Zip code'), 'Zip code is invalid')
  })

  it('checks min and max on number fields', async () => {
    const { user } = setup()
    const age = control('Age')

    await user.type(age, '17')
    await submit(user)
    expectError(age, 'Age must be at least 18')

    await retype(user, age, '66')
    await submit(user)
    expectError(age, 'Age must be at most 65')

    await retype(user, age, '18')
    await submit(user)
    expectNoError(age)

    await retype(user, age, '65')
    await submit(user)
    expectNoError(age)
  })

  it('treats 0 as a real number, not as an empty field', async () => {
    const { user } = setup([
      { name: 'qty', label: 'Quantity', type: 'number', required: true, min: 1 },
    ])
    await user.type(control('Quantity'), '0')
    await submit(user)
    expectError(control('Quantity'), 'Quantity must be at least 1')
  })

  it('reports only the first broken rule of a field: required, then length, then pattern', async () => {
    const { user, onSubmit } = setup([
      {
        name: 'handle',
        label: 'Handle',
        type: 'text',
        required: true,
        minLength: 4,
        pattern: '^[a-z]+$',
        patternMessage: 'Use lowercase letters only',
      },
    ])
    const handle = control('Handle')

    await submit(user)
    expect(alertTexts()).toEqual(['Handle is required'])

    await user.type(handle, 'AB') // too short AND not lowercase: the length rule comes first
    await submit(user)
    expect(alertTexts()).toEqual(['Handle must be at least 4 characters'])

    await retype(user, handle, 'ABCD') // long enough, still not lowercase
    await submit(user)
    expect(alertTexts()).toEqual(['Use lowercase letters only'])

    await retype(user, handle, 'abcd')
    await submit(user)
    expect(alertTexts()).toEqual([])
    expect(onSubmit).toHaveBeenCalledWith({ handle: 'abcd' })
  })

  it('skips every other rule for an optional field that is empty', async () => {
    const { user, onSubmit } = setup([
      { name: 'nick', label: 'Nickname', type: 'text', minLength: 5, pattern: '^[a-z]+$' },
      { name: 'score', label: 'Score', type: 'number', min: 10, max: 20 },
    ])
    await submit(user)
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('lets a number field use 0 as its minimum', async () => {
    const { user, onSubmit } = setup([
      { name: 'discount', label: 'Discount', type: 'number', min: 0, max: 100 },
    ])
    await user.type(control('Discount'), '0')
    await submit(user)
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(submittedValues(onSubmit)).toStrictEqual({ discount: 0 })
  })

  it('treats a min of 0 and a max of 0 as real limits', async () => {
    const { user } = setup([
      { name: 'balance', label: 'Balance', type: 'number', min: 0 },
      { name: 'debt', label: 'Debt', type: 'number', max: 0 },
    ])
    await user.type(control('Balance'), '-1')
    await user.type(control('Debt'), '1')
    await submit(user)
    expect(alertTexts()).toEqual(['Balance must be at least 0', 'Debt must be at most 0'])
  })

  it('ignores schema properties that do not apply to the type of the field', async () => {
    const { user, onSubmit } = setup([
      // A text value that looks like a number: min and max are for number fields only.
      { name: 'code', label: 'Code', type: 'text', min: 100, max: 1 },
      // minLength and pattern are for text fields only.
      { name: 'count', label: 'Count', type: 'number', minLength: 5, pattern: '^x$' },
    ])
    await user.type(control('Code'), '5')
    await user.type(control('Count'), '7')
    await submit(user)
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(submittedValues(onSubmit)).toStrictEqual({ code: '5', count: 7 })
  })
})

describe('30 DynamicForm: errors clear when the field changes', () => {
  it('removes only the error of the field that changed', async () => {
    const { user } = setup()
    await submit(user)
    expect(alertTexts()).toHaveLength(4)

    // One typed character is enough, even if the value is still invalid.
    await user.type(control('Username'), 'a')
    expectNoError(control('Username'))
    expect(alertTexts()).toEqual([
      'Age is required',
      'Plan is required',
      'Accept the terms is required',
    ])

    await user.selectOptions(control('Plan'), 'Free')
    expectNoError(control('Plan'))
    expect(alertTexts()).toEqual(['Age is required', 'Accept the terms is required'])

    await user.click(control('Accept the terms'))
    expectNoError(control('Accept the terms'))
    expect(alertTexts()).toEqual(['Age is required'])

    await user.type(control('Age'), '1')
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })

  it('does not validate again until the next submit', async () => {
    const { user } = setup()
    await submit(user)
    await user.type(control('Username'), 'a')
    // Still too short, but no new error appears while typing.
    await user.type(control('Username'), 'b')
    expectNoError(control('Username'))
    // Leaving the field does not validate it either.
    await user.tab()
    expectNoError(control('Username'))
    expect(alertTexts()).toEqual([
      'Age is required',
      'Plan is required',
      'Accept the terms is required',
    ])

    await submit(user)
    expectError(control('Username'), 'Username must be at least 3 characters')
  })
})

describe('30 DynamicForm: valid submit', () => {
  it('calls onSubmit once with typed values: numbers as numbers, checkboxes as booleans, text trimmed', async () => {
    const { user, onSubmit } = setup()
    await user.type(control('Username'), '  ada  ')
    await user.type(control('Promo code'), 'ABC-12')
    await user.type(control('Age'), '30')
    await user.selectOptions(control('Plan'), 'Pro')
    await user.click(control('Subscribe to the newsletter'))
    await user.click(control('Accept the terms'))
    await submit(user)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]).toHaveLength(1) // exactly one argument
    expect(submittedValues(onSubmit)).toStrictEqual({
      username: 'ada',
      promo: 'ABC-12',
      age: 30,
      plan: 'Pro',
      news: true,
      terms: true,
    })
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })

  it('submits empty optional fields as "", null, "" and false', async () => {
    const { user, onSubmit } = setup([
      { name: 'note', label: 'Note', type: 'text' },
      { name: 'size', label: 'Size', type: 'number' },
      { name: 'color', label: 'Color', type: 'select', options: ['Red', 'Blue'] },
      { name: 'gift', label: 'Gift wrap', type: 'checkbox' },
    ])
    await submit(user)
    expect(submittedValues(onSubmit)).toStrictEqual({
      note: '',
      size: null,
      color: '',
      gift: false,
    })
  })

  it('is generic: only the schema decides the rules, never the name of a field', async () => {
    // Names that look special (email, age, terms) but carry no rules in this schema.
    const { user, onSubmit } = setup([
      { name: 'email', label: 'Contact', type: 'text' },
      { name: 'age', label: 'Years', type: 'number' },
      { name: 'terms', label: 'Whatever', type: 'checkbox' },
    ])
    await user.type(control('Contact'), 'not an email')
    await user.type(control('Years'), '7')
    await submit(user)
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(submittedValues(onSubmit)).toStrictEqual({ email: 'not an email', age: 7, terms: false })
  })

  it('submits decimal numbers as numbers', async () => {
    const { user, onSubmit } = setup([{ name: 'price', label: 'Price', type: 'number' }])
    await user.type(control('Price'), '12.5')
    await submit(user)
    expect(submittedValues(onSubmit)).toStrictEqual({ price: 12.5 })
  })

  it('submits when the user presses Enter inside a field', async () => {
    const { user, onSubmit } = setup()
    await fillValid(user)
    await user.type(control('Username'), '{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('removes earlier errors and keeps the typed values after a valid submit', async () => {
    const { user, onSubmit } = setup()
    await submit(user)
    expect(alertTexts()).toHaveLength(4)
    expect(onSubmit).not.toHaveBeenCalled()

    await fillValid(user)
    await submit(user)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    // The form is not reset.
    expect(control('Username')).toHaveValue('ada')
    expect(control('Age')).toHaveValue(30)
    expect(control('Plan')).toHaveValue('Pro')
    expect(control('Accept the terms')).toBeChecked()
  })

  it('can be submitted again, and again validates the current values', async () => {
    const { user, onSubmit } = setup()
    await fillValid(user)
    await submit(user)
    await submit(user)
    expect(onSubmit).toHaveBeenCalledTimes(2)

    await retype(user, control('Age'), '10')
    await submit(user)
    expect(onSubmit).toHaveBeenCalledTimes(2)
    expectError(control('Age'), 'Age must be at least 18')
  })
})

describe('30 DynamicForm: conditional fields (showIf)', () => {
  it('does not render a hidden field and shows it when the condition becomes true', async () => {
    const { user } = setup(conditionalSchema)
    expect(screen.getByLabelText('Contact by')).toBeInTheDocument()
    expect(screen.queryByLabelText('Phone number')).not.toBeInTheDocument()
    expect(screen.queryByText('Phone number')).not.toBeInTheDocument()

    await user.selectOptions(control('Contact by'), 'Phone')
    expect(control('Phone number')).toBeInTheDocument()

    await user.selectOptions(control('Contact by'), 'Email')
    expect(screen.queryByLabelText('Phone number')).not.toBeInTheDocument()
  })

  it('does not validate or submit hidden fields', async () => {
    const { user, onSubmit } = setup(conditionalSchema)
    await user.type(control('Full name'), 'Ada')
    await submit(user)

    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    // No phone, petKind or dogName keys at all (not even undefined ones).
    expect(submittedValues(onSubmit)).toStrictEqual({
      fullName: 'Ada',
      contact: '',
      hasPet: false,
    })
  })

  it('validates and submits a field once it is visible', async () => {
    const { user, onSubmit } = setup(conditionalSchema)
    await user.type(control('Full name'), 'Ada')
    await user.selectOptions(control('Contact by'), 'Phone')
    await submit(user)
    expectError(control('Phone number'), 'Phone number is required')
    expect(onSubmit).not.toHaveBeenCalled()

    await user.type(control('Phone number'), '555-1234')
    await submit(user)
    expect(submittedValues(onSubmit)).toStrictEqual({
      fullName: 'Ada',
      contact: 'Phone',
      phone: '555-1234',
      hasPet: false,
    })
  })

  it('hides a field whose controlling field is hidden (chains), and brings the chain back', async () => {
    const { user } = setup(conditionalSchema)
    expect(screen.queryByLabelText('Kind of pet')).not.toBeInTheDocument()

    await user.click(control('I have a pet'))
    await user.selectOptions(control('Kind of pet'), 'Dog')
    expect(control('Dog name')).toBeInTheDocument()

    // "Kind of pet" still holds "Dog", but it is hidden, so "Dog name" must be hidden too.
    await user.click(control('I have a pet'))
    expect(screen.queryByLabelText('Kind of pet')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Dog name')).not.toBeInTheDocument()

    // Showing it again restores the old answer, and the chain comes back with it.
    await user.click(control('I have a pet'))
    expect(control('Kind of pet')).toHaveValue('Dog')
    expect(control('Dog name')).toBeInTheDocument()
  })

  it('keeps what the user typed in a field while it is hidden', async () => {
    const { user, onSubmit } = setup(conditionalSchema)
    await user.type(control('Full name'), 'Ada')
    await user.selectOptions(control('Contact by'), 'Phone')
    await user.type(control('Phone number'), '555-1234')

    await user.selectOptions(control('Contact by'), 'Email')
    await submit(user)
    // While hidden it is not submitted.
    expect(submittedValues(onSubmit)).toStrictEqual({
      fullName: 'Ada',
      contact: 'Email',
      hasPet: false,
    })

    await user.selectOptions(control('Contact by'), 'Phone')
    expect(control('Phone number')).toHaveValue('555-1234')
  })

  it('drops the error of a field when it becomes hidden, and does not bring it back', async () => {
    const { user } = setup(conditionalSchema)
    await user.selectOptions(control('Contact by'), 'Phone')
    await submit(user)
    expect(alertTexts()).toEqual(['Full name is required', 'Phone number is required'])

    await user.selectOptions(control('Contact by'), 'Email')
    // The hidden field's error is gone, the visible field's error stays.
    expect(alertTexts()).toEqual(['Full name is required'])
    expectError(control('Full name'), 'Full name is required')

    await user.selectOptions(control('Contact by'), 'Phone')
    expect(alertTexts()).toEqual(['Full name is required'])
    expectNoError(control('Phone number'))
  })

  it('does not let a hidden invalid field block the submit', async () => {
    const { user, onSubmit } = setup(conditionalSchema)
    await user.type(control('Full name'), 'Ada')
    await user.selectOptions(control('Contact by'), 'Phone')
    await submit(user)
    expect(onSubmit).not.toHaveBeenCalled()

    await user.selectOptions(control('Contact by'), 'Email')
    await submit(user)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('compares with the typed value: equals false matches an unchecked checkbox', async () => {
    const { user } = setup([
      { name: 'subscribe', label: 'Subscribe', type: 'checkbox' },
      {
        name: 'reason',
        label: 'Why not?',
        type: 'text',
        showIf: { field: 'subscribe', equals: false },
      },
    ])
    expect(control('Why not?')).toBeInTheDocument()
    await user.click(control('Subscribe'))
    expect(screen.queryByLabelText('Why not?')).not.toBeInTheDocument()
    await user.click(control('Subscribe'))
    expect(control('Why not?')).toBeInTheDocument()
  })

  it('compares with the typed value: equals 1 matches the number 1, not "12"', async () => {
    const { user } = setup([
      { name: 'guests', label: 'Guests', type: 'number' },
      {
        name: 'note',
        label: 'Table for one',
        type: 'text',
        showIf: { field: 'guests', equals: 1 },
      },
    ])
    expect(screen.queryByLabelText('Table for one')).not.toBeInTheDocument()
    await user.type(control('Guests'), '1')
    expect(control('Table for one')).toBeInTheDocument()
    await user.type(control('Guests'), '2')
    expect(screen.queryByLabelText('Table for one')).not.toBeInTheDocument()
  })

  it('compares with ===, so an empty number or an empty select never matches 0 or false', async () => {
    const { user } = setup([
      { name: 'qty', label: 'Quantity', type: 'number' },
      { name: 'why', label: 'Why none?', type: 'text', showIf: { field: 'qty', equals: 0 } },
      { name: 'color', label: 'Color', type: 'select', options: ['Red', 'Blue'] },
      { name: 'fallback', label: 'Fallback', type: 'text', showIf: { field: 'color', equals: false } },
    ])
    expect(screen.queryByLabelText('Why none?')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Fallback')).not.toBeInTheDocument()

    await user.type(control('Quantity'), '0') // the number 0 is a real value and does match
    expect(control('Why none?')).toBeInTheDocument()
  })

  it('compares the trimmed text of a text field', async () => {
    const { user } = setup([
      { name: 'answer', label: 'Answer', type: 'text' },
      { name: 'more', label: 'Tell us more', type: 'text', showIf: { field: 'answer', equals: 'yes' } },
    ])
    expect(screen.queryByLabelText('Tell us more')).not.toBeInTheDocument()
    await user.type(control('Answer'), ' yes ')
    expect(control('Tell us more')).toBeInTheDocument()
  })

  it('lets a field depend on a field that comes later in the schema', async () => {
    const { user, onSubmit } = setup([
      { name: 'extra', label: 'Extra info', type: 'text', showIf: { field: 'wants', equals: true } },
      { name: 'wants', label: 'I want to add extra info', type: 'checkbox' },
    ])
    expect(screen.queryByLabelText('Extra info')).not.toBeInTheDocument()
    await user.click(control('I want to add extra info'))
    // The new field appears above the checkbox. The checkbox must keep its place
    // (and the focus), which is what a stable key (the field name) gives you.
    expect(control('I want to add extra info')).toHaveFocus()
    await user.type(control('Extra info'), 'Hello')
    await submit(user)
    expect(submittedValues(onSubmit)).toStrictEqual({ extra: 'Hello', wants: true })
  })

  it('hides a field whose controlling field does not exist in the schema', () => {
    setup([
      { name: 'a', label: 'Visible one', type: 'text' },
      { name: 'b', label: 'Orphan', type: 'text', showIf: { field: 'nope', equals: 'x' } },
    ])
    expect(control('Visible one')).toBeInTheDocument()
    expect(screen.queryByLabelText('Orphan')).not.toBeInTheDocument()
  })
})
