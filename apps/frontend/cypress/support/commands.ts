interface CreateUserInput {
  fullName: string
  email: string
  password: string
  role: string
}

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
      createUserViaApi(input: CreateUserInput): Chainable<{ id: string }>
      deleteUserViaApi(id: string): Chainable<void>
      seedUser(): Chainable<{ id: string; email: string; fullName: string }>
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/auth/login`,
    body: { email, password },
  }).then((response) => {
    const setCookieHeader = response.headers['set-cookie'] as string | string[] | undefined
    if (!setCookieHeader) return
    const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    cookieStrings.forEach((cookieStr) => {
      const nameValue = cookieStr.split(';')[0].trim()
      const eqIdx = nameValue.indexOf('=')
      if (eqIdx === -1) return
      const name = nameValue.slice(0, eqIdx)
      const value = nameValue.slice(eqIdx + 1)
      cy.setCookie(name, value, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
        domain: 'localhost',
      })
    })
  })
})

Cypress.Commands.add('createUserViaApi', (input: CreateUserInput) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/users`,
    body: input,
  }).then((response) => ({ id: response.body.id as string }))
})

Cypress.Commands.add('deleteUserViaApi', (id: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/users/${id}`,
    failOnStatusCode: false,
  })
})

Cypress.Commands.add('seedUser', () => {
  const ts = Date.now()
  const input: CreateUserInput = {
    fullName: `Test User ${ts}`,
    email: `test.${ts}@e2e.test`,
    password: 'Password123!',
    role: 'user',
  }
  cy.createUserViaApi(input).then(({ id }) => ({
    id,
    email: input.email,
    fullName: input.fullName,
  }))
})

export {}
