const MOCK_TOKEN = 'mock-access-token'
const MOCK_DOCTOR_ID = 'dddddddd-2222-2222-2222-000000000001'

const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
}

const mockDoctor = {
  id: MOCK_DOCTOR_ID,
  user: { id: 'user-uuid-1', fullName: 'Dr. Para Excluir', email: 'excluir@test.com' },
  crmNumber: '99999/RJ',
  specialties: [{ id: SPEC_ID_1, name: 'Ortopedia' }],
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const populatedListResponse = { data: [mockDoctor], total: 1, page: 1, limit: 20 }
const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }

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

describe('Doctors Delete', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows delete confirmation dialog when delete button is clicked', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getDoctors')

    visitWithMockAuth('/doctors')
    cy.wait('@getDoctors')
    cy.get(`[data-testid="doctor-delete-button-${MOCK_DOCTOR_ID}"]`).click()
    cy.get('[data-testid="delete-doctor-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-doctor-dialog-message"]').should('contain', mockDoctor.user.fullName)
  })

  it('cancel button on dialog does not delete doctor', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getDoctors')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`).as('deleteDoctor')

    visitWithMockAuth('/doctors')
    cy.wait('@getDoctors')
    cy.get(`[data-testid="doctor-delete-button-${MOCK_DOCTOR_ID}"]`).click()
    cy.get('[data-testid="delete-doctor-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-doctor-dialog-cancel"]').click()
    cy.get('[data-testid="delete-doctor-dialog"]').should('not.exist')
    cy.get(`[data-testid="doctor-table-row-${MOCK_DOCTOR_ID}"]`).should('exist')
  })

  it('shows error message when deletion fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getDoctors')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 500,
      body: { status: 500, title: 'Internal Server Error' },
    }).as('deleteDoctor')

    visitWithMockAuth('/doctors')
    cy.wait('@getDoctors')
    cy.get(`[data-testid="doctor-delete-button-${MOCK_DOCTOR_ID}"]`).click()
    cy.get('[data-testid="delete-doctor-dialog-confirm"]').click()
    cy.wait('@deleteDoctor')
    cy.get('[data-testid="delete-doctor-dialog"]').should('not.exist')
    cy.get(`[data-testid="doctor-table-row-${MOCK_DOCTOR_ID}"]`).should('exist')
  })

  it('confirms deletion and shows success message', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getDoctors')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deleteDoctor')

    visitWithMockAuth('/doctors')
    cy.wait('@getDoctors')
    cy.get(`[data-testid="doctor-delete-button-${MOCK_DOCTOR_ID}"]`).click()
    cy.get('[data-testid="delete-doctor-dialog-confirm"]').click()
    cy.wait('@deleteDoctor')
    cy.get('[data-testid="doctor-list-success"]').should('be.visible')
    cy.get('[data-testid="doctor-list-success"]').should('contain', mockDoctor.user.fullName)
  })

  it('deleted doctor no longer appears in list', () => {
    let callCount = 0
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, (req) => {
      callCount++
      req.reply({
        statusCode: 200,
        body: callCount === 1 ? populatedListResponse : emptyListResponse,
      })
    }).as('getDoctors')

    cy.intercept('DELETE', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deleteDoctor')

    visitWithMockAuth('/doctors')
    cy.wait('@getDoctors')
    cy.get(`[data-testid="doctor-delete-button-${MOCK_DOCTOR_ID}"]`).click()
    cy.get('[data-testid="delete-doctor-dialog-confirm"]').click()
    cy.wait('@deleteDoctor')
    cy.wait('@getDoctors')
    cy.get(`[data-testid="doctor-table-row-${MOCK_DOCTOR_ID}"]`).should('not.exist')
    cy.get('[data-testid="doctor-list-empty"]').should('be.visible')
  })

  it('deleting a doctor also removes the linked user from the users list (real API)', () => {
    cy.fixture('users').then((fixture) => {
      cy.login(fixture.admin.email, fixture.admin.password)
    })

    cy.seedDoctor().then(({ doctorId, userId, accessToken: adminToken }) => {
      cy.intercept('DELETE', `${Cypress.env('API_URL')}/doctors/${doctorId}`).as('deleteDoctor')

      cy.visit('/doctors')
      cy.get(`[data-testid="doctor-table-row-${doctorId}"]`).should('exist')
      cy.get(`[data-testid="doctor-delete-button-${doctorId}"]`).click()
      cy.get('[data-testid="delete-doctor-dialog"]').should('be.visible')
      cy.get('[data-testid="delete-doctor-dialog-confirm"]').click()
      cy.wait('@deleteDoctor')
      cy.get('[data-testid="doctor-list-success"]').should('be.visible')
      cy.get(`[data-testid="doctor-table-row-${doctorId}"]`).should('not.exist')

      cy.visit('/users')
      cy.get('[data-testid="user-list-table"]').should('be.visible')
      cy.get(`[data-testid="user-table-row-${userId}"]`).should('not.exist')
    })
  })

  it('delete from details page navigates back to list', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getDoctors')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deleteDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}`)
    cy.wait('@getDoctor')
    cy.get('[data-testid="doctor-details-delete-button"]').click()
    cy.get('[data-testid="delete-doctor-dialog-confirm"]').click()
    cy.wait('@deleteDoctor')
    cy.url().should('match', /\/doctors$/)
  })
})

export {}
