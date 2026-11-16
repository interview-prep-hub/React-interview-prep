// Turns cents into text for the screen: formatPrice(1250) returns "$12.50".
// This file is given: you do not need to change it.
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function formatPrice(cents) {
  return usd.format(cents / 100)
}
