interface CreateUserInput {
  fullName: string
  email: string
  password: string
  role: string
}

interface CreateSpecialtyInput {
  name: string
  description?: string | null
}

interface CreateDoctorInput {
  userId: string
  crmNumber: string
  specialtyIds: string[]
  bio?: string
}

interface SeededDoctor {
  doctorId: string
  userId: string
  specialtyId: string
  specialtyName: string
  email: string
  password: string
  fullName: string
  crmNumber: string
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
      deleteSpecialtyViaApi(id: string, accessToken?: string): Chainable<void>
      createSpecialtyViaApi(input: CreateSpecialtyInput): Chainable<{ id: string; name: string }>
      seedSpecialty(): Chainable<{ id: string; name: string; description: string }>
      seedPatient(): Chainable<{ patientId: string; userId: string; fullName: string }>
      deletePatientViaApi(id: string): Chainable<void>
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

Cypress.Commands.add('createSpecialtyViaApi', (input: CreateSpecialtyInput) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/specialties`,
    body: input,
  }).then((response) => ({ id: response.body.id as string, name: response.body.name as string }))
})

Cypress.Commands.add('seedSpecialty', () => {
  const ts = Date.now()
  const name = `Especialidade Teste ${ts}`
  const description = `Descrição de teste ${ts}`
  return cy.createSpecialtyViaApi({ name, description }).then(({ id }) => ({ id, name, description }))
})

Cypress.Commands.add('seedPatient', () => {
  const ts = Date.now()
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/patients`,
    body: {
      fullName: `Paciente Teste ${ts}`,
      email: `patient.${ts}@e2e.test`,
      phoneNumber: '(11) 99999-9999',
      birthDate: '1990-05-15',
      documentNumber: String(ts).slice(-11).padStart(11, '0'),
      gender: 'male',
    },
  }).then((response) => ({
    patientId: response.body.id as string,
    userId: response.body.user.id as string,
    fullName: response.body.user.fullName as string,
  }))
})

Cypress.Commands.add('deletePatientViaApi', (id: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/patients/${id}`,
    failOnStatusCode: false,
  })
})

Cypress.Commands.add('deleteSpecialtyViaApi', (id: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/specialties/${id}`,
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
    role: 'doctor',
  }
  const crmNumber = `${String(ts).slice(-5)}/SP`

  return cy.fixture('users').then((fixture) => {
    return cy.request({
      method: 'POST',
      url: `${Cypress.env('API_URL')}/auth/login`,
      body: { email: fixture.admin.email, password: fixture.admin.password },
    }).then((loginResponse) => {
      const setCookieHeader = loginResponse.headers['set-cookie'] as string | string[] | undefined
      let adminToken = ''
      if (setCookieHeader) {
        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
        const tokenCookie = cookies.find((c: string) => c.startsWith('access_token='))
        if (tokenCookie) adminToken = tokenCookie.split(';')[0].replace('access_token=', '')
      }

      return cy.request({
        method: 'POST',
        url: `${Cypress.env('API_URL')}/users`,
        body: userInput,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((userResponse) => {
        const userId = userResponse.body.id as string

        return cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/specialties`,
          body: { name: `Especialidade Test ${ts}`, description: null },
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then((specialtyResponse) => {
          const specialtyId = specialtyResponse.body.id as string
          const specialtyName = specialtyResponse.body.name as string

          return cy.request({
            method: 'POST',
            url: `${Cypress.env('API_URL')}/doctors`,
            body: { userId, crmNumber, specialtyIds: [specialtyId] },
            headers: { Authorization: `Bearer ${adminToken}` },
          }).then((doctorResponse) => {
            const doctorId = doctorResponse.body.id as string

            return ({
              doctorId,
              userId,
              specialtyId,
              specialtyName,
              email: userInput.email,
              password,
              fullName: userInput.fullName,
              crmNumber,
              accessToken: adminToken,
            })
          })
        })
      })
    })
  })
})

export {}
