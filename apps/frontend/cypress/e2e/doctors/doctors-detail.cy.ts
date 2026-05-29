const MOCK_TOKEN = 'mock-access-token'
const MOCK_DOCTOR_ID = 'eeeeeeee-2222-2222-2222-000000000001'

const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'
const SPEC_ID_2 = '00000000-0000-4000-a000-000000000002'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
}

const mockDoctor = {
  id: MOCK_DOCTOR_ID,
  user: { id: 'user-uuid-1', fullName: 'Dr. Detalhe Silva', email: 'detalhe@test.com' },
  crmNumber: '54321/MG',
  specialties: [
    { id: SPEC_ID_1, name: 'Cardiologia' },
    { id: SPEC_ID_2, name: 'Neurologia' },
  ],
  bio: 'Especialista em neurologia clínica.',
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

describe('Doctors Detail', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit(`/doctors/${MOCK_DOCTOR_ID}`)
    cy.url().should('include', '/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: mockDoctor })
    }).as('getDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}`)
    cy.get('[data-testid="doctor-details-skeleton"]').should('be.visible')
    cy.wait('@getDoctor')
    cy.get('[data-testid="doctor-details-skeleton"]').should('not.exist')
  })

  it('shows error state when doctor does not exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'Doctor not found' },
    }).as('getDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}`)
    cy.wait('@getDoctor')
    cy.get('[data-testid="doctor-details-error"]').should('be.visible')
    cy.get('[data-testid="doctor-details"]').should('not.exist')
  })

  it('shows doctor details with name, email, CRM, specialties and bio', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}`)
    cy.wait('@getDoctor')

    cy.get('[data-testid="doctor-details"]').should('be.visible')
    cy.get('[data-testid="doctor-details-name"]').should('contain', mockDoctor.user.fullName)
    cy.get('[data-testid="doctor-details-email"]').should('contain', mockDoctor.user.email)
    cy.get('[data-testid="doctor-details-crm"]').should('contain', mockDoctor.crmNumber)
    cy.get('[data-testid="doctor-details-specialties"]').should('be.visible')
    cy.get(`[data-testid="doctor-details-specialty-badge-${SPEC_ID_1}"]`).should('contain', 'Cardiologia')
    cy.get(`[data-testid="doctor-details-specialty-badge-${SPEC_ID_2}"]`).should('contain', 'Neurologia')
    cy.get('[data-testid="doctor-details-bio"]').should('contain', mockDoctor.bio)
    cy.get('[data-testid="doctor-details-created-at"]').should('be.visible')
  })

  it('shows all specialties as individual badges', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}`)
    cy.wait('@getDoctor')

    cy.get('[data-testid="doctor-details-specialties"]').within(() => {
      cy.get(`[data-testid="doctor-details-specialty-badge-${SPEC_ID_1}"]`).should('exist')
      cy.get(`[data-testid="doctor-details-specialty-badge-${SPEC_ID_2}"]`).should('exist')
    })
  })

  it('does not show bio section when bio is null', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: { ...mockDoctor, bio: null },
    }).as('getDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}`)
    cy.wait('@getDoctor')
    cy.get('[data-testid="doctor-details-bio"]').should('not.exist')
  })

  it('back button navigates to /doctors', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}`)
    cy.wait('@getDoctor')
    cy.get('[data-testid="doctor-details-back-button"]').click()
    cy.url().should('match', /\/doctors$/)
  })

  it('edit button navigates to /doctors/[id]/edit', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}`)
    cy.wait('@getDoctor')
    cy.get('[data-testid="doctor-details-edit-button"]').click()
    cy.url().should('include', `/doctors/${MOCK_DOCTOR_ID}/edit`)
  })

  it('delete button opens dialog with doctor name', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}`)
    cy.wait('@getDoctor')
    cy.get('[data-testid="doctor-details-delete-button"]').click()
    cy.get('[data-testid="delete-doctor-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-doctor-dialog-message"]').should('contain', mockDoctor.user.fullName)
  })

  it('cancel button on dialog closes dialog without deleting', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}`)
    cy.wait('@getDoctor')
    cy.get('[data-testid="doctor-details-delete-button"]').click()
    cy.get('[data-testid="delete-doctor-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-doctor-dialog-cancel"]').click()
    cy.get('[data-testid="delete-doctor-dialog"]').should('not.exist')
    cy.get('[data-testid="doctor-details"]').should('be.visible')
  })

  it('delete success navigates to /doctors', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deleteDoctor')
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}`)
    cy.wait('@getDoctor')
    cy.get('[data-testid="doctor-details-delete-button"]').click()
    cy.get('[data-testid="delete-doctor-dialog-confirm"]').click()
    cy.wait('@deleteDoctor')
    cy.url().should('match', /\/doctors$/)
  })
})

export {}
