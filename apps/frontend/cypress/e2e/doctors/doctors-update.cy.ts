const MOCK_TOKEN = 'mock-access-token'
const MOCK_DOCTOR_ID = 'cccccccc-2222-2222-2222-000000000001'

const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'
const SPEC_ID_2 = '00000000-0000-4000-a000-000000000002'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
}

const mockSpecialties = [
  { id: SPEC_ID_1, name: 'Cardiologia', description: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: SPEC_ID_2, name: 'Neurologia', description: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
]

const mockDoctor = {
  id: MOCK_DOCTOR_ID,
  user: { id: 'user-uuid-1', fullName: 'Dr. Original Silva', email: 'original@test.com' },
  crmNumber: '11111/SP',
  specialties: [{ id: SPEC_ID_1, name: 'Cardiologia' }],
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const mockUpdatedDoctor = {
  ...mockDoctor,
  specialties: [
    { id: SPEC_ID_1, name: 'Cardiologia' },
    { id: SPEC_ID_2, name: 'Neurologia' },
  ],
}

const specialtiesListResponse = { data: mockSpecialties, total: 2, page: 1, limit: 100 }

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

describe('Doctors Update', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: specialtiesListResponse,
    }).as('getSpecialties')
  })

  it('shows skeleton while loading doctor data', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: mockDoctor })
    }).as('getDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}/edit`)
    cy.get('[data-testid="edit-doctor-skeleton"]').should('be.visible')
    cy.wait('@getDoctor')
    cy.get('[data-testid="edit-doctor-skeleton"]').should('not.exist')
  })

  it('shows pre-filled form with current doctor data', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}/edit`)
    cy.wait('@getDoctor')
    cy.wait('@getSpecialties')

    cy.get('[data-testid="doctor-form-crm"]').should('have.value', mockDoctor.crmNumber)
    cy.get('[data-testid="doctor-form-user-readonly"]').should('contain', mockDoctor.user.fullName)
    cy.get(`[data-testid="doctor-form-specialty-${SPEC_ID_1}"]`).should('be.checked')
    cy.get(`[data-testid="doctor-form-specialty-${SPEC_ID_2}"]`).should('not.be.checked')
  })

  it('shows user as readonly and not a select', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}/edit`)
    cy.wait('@getDoctor')

    cy.get('[data-testid="doctor-form-user-readonly"]').should('exist')
    cy.get('[data-testid="doctor-form-user"]').should('not.exist')
  })

  it('shows load error when doctor does not exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'Doctor not found' },
    }).as('getDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}/edit`)
    cy.wait('@getDoctor')
    cy.get('[data-testid="edit-doctor-load-error"]').should('be.visible')
    cy.get('[data-testid="doctor-form"]').should('not.exist')
  })

  it('shows conflict error when CRM is already in use', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'CRM already in use' },
    }).as('updateDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}/edit`)
    cy.wait('@getDoctor')
    cy.get('[data-testid="doctor-form-crm"]').clear().type('99999/SP')
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.wait('@updateDoctor')
    cy.get('[data-testid="doctor-form-error"]').should('be.visible')
  })

  it('cancel button returns without saving changes', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}/edit`)
    cy.wait('@getDoctor')
    cy.get('[data-testid="edit-doctor-back-button"]').click()
    cy.url().should('include', `/doctors/${MOCK_DOCTOR_ID}`)
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, (req) => {
      req.reply({ delay: 2000, statusCode: 200, body: mockUpdatedDoctor })
    }).as('updateDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}/edit`)
    cy.wait('@getDoctor')
    cy.wait('@getSpecialties')
    cy.get(`[data-testid="doctor-form-specialty-${SPEC_ID_2}"]`).check()
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.get('[data-testid="doctor-form-submit"]').should('be.disabled')
    cy.wait('@updateDoctor')
  })

  it('updates doctor and redirects to details page', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockUpdatedDoctor,
    }).as('updateDoctor')

    visitWithMockAuth(`/doctors/${MOCK_DOCTOR_ID}/edit`)
    cy.wait('@getDoctor')
    cy.wait('@getSpecialties')

    cy.fixture('doctors').then((fixture) => {
      cy.get('[data-testid="doctor-form-crm"]').clear().type(fixture.updatedDoctor.crmNumber)
    })
    cy.get(`[data-testid="doctor-form-specialty-${SPEC_ID_2}"]`).check()
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.wait('@updateDoctor')
    cy.url().should('include', `/doctors/${MOCK_DOCTOR_ID}`)
  })

  it('shows details page correctly after navigating from list', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: { data: [mockDoctor], total: 1, page: 1, limit: 20 },
    }).as('getDoctors')
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors/${MOCK_DOCTOR_ID}`, {
      statusCode: 200,
      body: mockDoctor,
    }).as('getDoctor')

    visitWithMockAuth('/doctors')
    cy.wait('@getDoctors')
    cy.get(`[data-testid="doctor-view-link-${MOCK_DOCTOR_ID}"]`).click()
    cy.wait('@getDoctor')
    cy.get('[data-testid="doctor-details"]').should('be.visible')
    cy.get('[data-testid="doctor-details-name"]').should('contain', mockDoctor.user.fullName)
  })
})

export {}
