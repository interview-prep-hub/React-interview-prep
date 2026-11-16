// A fake API for the demo app. You do not need to edit this file.
//
// It pretends to be slow (600 ms) and every third request fails, so you can
// SEE loading, background refetching and the error behaviour in the browser
// (npm run dev). The tests replace this whole file with a mock, so they never
// wait and never touch the network.

let requestCount = 0

export function fetchUser(id) {
  requestCount += 1
  const request = requestCount // which call is this? shown in the UI

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (request % 3 === 0) {
        reject(new Error('Network error'))
      } else {
        resolve({ id, name: 'Ada Lovelace', email: 'ada@example.com', request })
      }
    }, 600)
  })
}
