declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request('POST', `${Cypress.env('API_URL')}/auth/login`, { email, password })
})

export {}
