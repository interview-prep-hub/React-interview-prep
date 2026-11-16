import { useState } from 'react'
import { EMPLOYEES } from './employees.js'

// Exercise 23: Data table with sorting, filtering and pagination.
// Read README.md in this folder for the full requirements.
// Do not edit employees.js or the test file.

const PAGE_SIZE = 5

// The four columns. `key` is the property on each employee object.
// TODO 1: you will probably want more per column, for example how to compare
// two employees and how to turn one employee into the text of a cell.
const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'salary', label: 'Salary' },
  { key: 'startDate', label: 'Start date' },
]

export default function App({ employees = EMPLOYEES }) {
  // TODO 2: state. You need exactly three pieces:
  //   the filter text, the sort (which column + which direction), the page.
  //   Do NOT keep the rows themselves in state: derive them below.

  // TODO 3: derive the rows to show, during render:
  //   employees -> filter -> sort (on a COPY) -> cut out the current page.
  //   Also derive the total number of pages.
  //   (Optional: wrap the filter + sort part in useMemo, and say why in a comment.)
  const pageRows = employees // for now: everything, unsorted, unfiltered, unpaged

  return (
    <div>
      <h2>Employees</h2>

      <div>
        <label htmlFor="employee-filter">Filter</label>{' '}
        {/* TODO 4: make this a controlled input. Changing it must go back to page 1. */}
        <input id="employee-filter" type="text" />
      </div>

      <table aria-label="Employees">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              // TODO 5: add aria-sort to the <th>: "ascending", "descending" or "none".
              <th key={col.key}>
                {/* TODO 6: clicking this button sorts by the column (see the README rules). */}
                <button type="button">{col.label}</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((employee) => (
            <tr key={employee.id}>
              {/* TODO 7: format the salary and the start date (see the README). */}
              <td>{employee.name}</td>
              <td>{employee.role}</td>
              <td>{employee.salary}</td>
              <td>{employee.startDate}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TODO 8: show "No matching employees" here when there are no rows. */}

      <div>
        {/* TODO 9: Prev button, the text "Page X of Y", Next button. */}
      </div>
    </div>
  )
}
