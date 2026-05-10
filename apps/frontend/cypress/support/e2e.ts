import './commands'

Cypress.on('uncaught:exception', (err) => {
  if (
    err.message.includes('Hydration failed') ||
    err.message.includes('hydrating') ||
    err.message.includes('server-rendered HTML')
  ) {
    return false
  }
  return true
})
