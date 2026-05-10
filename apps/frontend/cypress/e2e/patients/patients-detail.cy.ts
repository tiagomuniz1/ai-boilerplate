const MOCK_TOKEN = 'mock-access-token'
const MOCK_PATIENT_ID = 'eeeeeeee-1111-1111-1111-000000000001'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
}

const mockPatient = {
  id: MOCK_PATIENT_ID,
  fullName: 'Paciente Detalhe',
  email: 'detalhe@test.com',
  phoneNumber: '(11) 98765-4321',
  birthDate: '1990-05-15',
  documentNumber: '12345678901',
  gender: 'male',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

function visitWithMockAuth(url: string) {
  cy.intercept('GET', `${Cypress.env('API_URL')}/auth/me`, {
    statusCode: 200,
    body: mockAuthUser,
  })
  cy.setCookie('access_token', MOCK_TOKEN, {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    path: '/',
    domain: 'localhost',
  })
  cy.visit(url, {
    onBeforeLoad(win) {
      win.localStorage.setItem(
        'auth-user',
        JSON.stringify({ state: { user: mockAuthUser }, version: 0 }),
      )
    },
  })
}

describe('Patients Detail', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit(`/patients/${MOCK_PATIENT_ID}`)
    cy.url().should('include', '/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: mockPatient })
    }).as('getPatient')

    visitWithMockAuth(`/patients/${MOCK_PATIENT_ID}`)
    cy.get('[data-testid="patient-details-skeleton"]').should('be.visible')
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-skeleton"]').should('not.exist')
  })

  it('shows error state when patient does not exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'Patient not found' },
    }).as('getPatient')

    visitWithMockAuth(`/patients/${MOCK_PATIENT_ID}`)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-error"]').should('be.visible')
    cy.get('[data-testid="patient-details"]').should('not.exist')
  })

  it('shows patient details with name, email, phone, document, gender and birthdate', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')

    visitWithMockAuth(`/patients/${MOCK_PATIENT_ID}`)
    cy.wait('@getPatient')

    cy.get('[data-testid="patient-details"]').should('be.visible')
    cy.get('[data-testid="patient-details-name"]').should('contain', mockPatient.fullName)
    cy.get('[data-testid="patient-details-email"]').should('contain', mockPatient.email)
    cy.get('[data-testid="patient-details-phone"]').should('contain', mockPatient.phoneNumber)
    cy.get('[data-testid="patient-details-document"]').should('contain', mockPatient.documentNumber)
    cy.get('[data-testid="patient-details-gender"]').should('contain', 'Masculino')
    cy.get('[data-testid="patient-details-birthdate"]').should('be.visible')
    cy.get('[data-testid="patient-details-created-at"]').should('be.visible')
  })

  it('back button navigates to /patients', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })

    visitWithMockAuth(`/patients/${MOCK_PATIENT_ID}`)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-back-button"]').click()
    cy.url().should('match', /\/patients$/)
  })

  it('edit button navigates to /patients/[id]/edit', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')

    visitWithMockAuth(`/patients/${MOCK_PATIENT_ID}`)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-edit-button"]').click()
    cy.url().should('include', `/patients/${MOCK_PATIENT_ID}/edit`)
  })

  it('delete button opens dialog with patient name', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')

    visitWithMockAuth(`/patients/${MOCK_PATIENT_ID}`)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-delete-button"]').click()
    cy.get('[data-testid="delete-patient-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-patient-dialog-message"]').should('contain', mockPatient.fullName)
  })

  it('cancel button on dialog closes dialog without deleting', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')

    visitWithMockAuth(`/patients/${MOCK_PATIENT_ID}`)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-delete-button"]').click()
    cy.get('[data-testid="delete-patient-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-patient-dialog-cancel"]').click()
    cy.get('[data-testid="delete-patient-dialog"]').should('not.exist')
    cy.get('[data-testid="patient-details"]').should('be.visible')
  })

  it('delete failure closes dialog and keeps patient on details page', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 500,
      body: { status: 500, title: 'Internal Server Error' },
    }).as('deletePatient')

    visitWithMockAuth(`/patients/${MOCK_PATIENT_ID}`)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-delete-button"]').click()
    cy.get('[data-testid="delete-patient-dialog-confirm"]').click()
    cy.wait('@deletePatient')
    cy.get('[data-testid="delete-patient-dialog"]').should('not.exist')
    cy.url().should('include', `/patients/${MOCK_PATIENT_ID}`)
  })

  it('delete success navigates to /patients', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deletePatient')
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })

    visitWithMockAuth(`/patients/${MOCK_PATIENT_ID}`)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-delete-button"]').click()
    cy.get('[data-testid="delete-patient-dialog-confirm"]').click()
    cy.wait('@deletePatient')
    cy.url().should('match', /\/patients$/)
  })
})

export {}
