interface CreateUserInput {
  fullName: string
  email: string
  password: string
  role: string
}

interface CreateDoctorInput {
  userId: string
  crmNumber: string
  specialty: string
  bio?: string
}

interface SeededDoctor {
  doctorId: string
  userId: string
  email: string
  password: string
  fullName: string
  crmNumber: string
  specialty: string
  accessToken: string
}

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
      createUserViaApi(input: CreateUserInput): Chainable<{ id: string }>
      deleteUserViaApi(id: string, accessToken?: string): Chainable<void>
      seedUser(): Chainable<{ id: string; email: string; fullName: string }>
      createDoctorViaApi(input: CreateDoctorInput, accessToken: string): Chainable<{ id: string }>
      deleteDoctorViaApi(id: string, accessToken?: string): Chainable<void>
      seedDoctor(): Chainable<SeededDoctor>
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

Cypress.Commands.add('deleteUserViaApi', (id: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/users/${id}`,
    failOnStatusCode: false,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
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

Cypress.Commands.add('createDoctorViaApi', (input: CreateDoctorInput, accessToken: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/doctors`,
    body: input,
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => ({ id: response.body.id as string }))
})

Cypress.Commands.add('deleteDoctorViaApi', (id: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/doctors/${id}`,
    failOnStatusCode: false,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
})

Cypress.Commands.add('seedDoctor', () => {
  const ts = Date.now()
  const password = 'Password123!'
  const userInput: CreateUserInput = {
    fullName: `Dr. Test ${ts}`,
    email: `doctor.${ts}@e2e.test`,
    password,
    role: 'user',
  }
  const crmNumber = `${String(ts).slice(-5)}/SP`
  const specialty = 'Cardiologia'

  return cy.createUserViaApi(userInput).then(({ id: userId }) => {
    return cy.request({
      method: 'POST',
      url: `${Cypress.env('API_URL')}/auth/login`,
      body: { email: userInput.email, password },
    }).then((loginResponse) => {
      const setCookieHeader = loginResponse.headers['set-cookie'] as string | string[] | undefined
      let accessToken = ''
      if (setCookieHeader) {
        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
        const tokenCookie = cookies.find((c) => c.startsWith('access_token='))
        if (tokenCookie) accessToken = tokenCookie.split(';')[0].replace('access_token=', '')
      }

      return cy.createDoctorViaApi({ userId, crmNumber, specialty }, accessToken).then(({ id: doctorId }) => ({
        doctorId,
        userId,
        email: userInput.email,
        password,
        fullName: userInput.fullName,
        crmNumber,
        specialty,
        accessToken,
      }))
    })
  })
})

export {}
