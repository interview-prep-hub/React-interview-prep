// Fake "server" for exercise 12. You do not need to change this file.
//
// searchCountries(query) pretends to call a server: it waits 100 ms and then
// resolves with the names that contain the query (ignoring upper/lower case).
// The tests replace this module with a mock, so they never wait for the 100 ms.

const COUNTRIES = [
  'Albania',
  'Algeria',
  'Argentina',
  'Australia',
  'Austria',
  'Belgium',
  'Brazil',
  'Canada',
  'Chile',
  'China',
  'Colombia',
  'Denmark',
  'Egypt',
  'Finland',
  'France',
  'Germany',
  'Greece',
  'Iceland',
  'India',
  'Indonesia',
  'Ireland',
  'Italy',
  'Japan',
  'Kenya',
  'Mexico',
  'Morocco',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nigeria',
  'Norway',
  'Pakistan',
  'Peru',
  'Poland',
  'Portugal',
  'Spain',
  'Sweden',
  'Switzerland',
  'Thailand',
  'Turkey',
  'Ukraine',
  'United Kingdom',
  'United States',
  'Vietnam',
]

export function searchCountries(query) {
  const needle = query.trim().toLowerCase()
  return new Promise((resolve) => {
    setTimeout(() => {
      if (needle === '') {
        resolve([])
        return
      }
      resolve(COUNTRIES.filter((name) => name.toLowerCase().includes(needle)))
    }, 100)
  })
}
