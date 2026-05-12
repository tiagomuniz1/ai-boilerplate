const MOCK_TOKEN = 'mock-access-token'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
}

const mockUser = {
  id: 'user-uuid-1',
  fullName: 'Dr. João Silva',
  email: 'joao@test.com',
  role: 'user',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

const mockCreatedDoctor = {
  id: 'bbbbbbbb-2222-2222-2222-000000000001',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@test.com' },
  crmNumber: '12345/SP',
  specialty: 'Cardiologia',
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }
const usersListResponse = { data: [mockUser], total: 1, page: 1, limit: 100 }

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

describe('Doctors Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: usersListResponse,
    }).as('getUsers')
  })

  it('shows validation errors when submitting empty form', () => {
    visitWithMockAuth('/doctors/new')
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.contains('Selecione um usuário').should('be.visible')
    cy.contains('CRM obrigatório').should('be.visible')
  })

  it('shows validation error when CRM format is invalid', () => {
    visitWithMockAuth('/doctors/new')
    cy.get('[data-testid="doctor-form-crm"]').type('INVALID')
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.contains('CRM inválido').should('be.visible')
  })

  it('shows validation error when specialty is too short', () => {
    visitWithMockAuth('/doctors/new')
    cy.get('[data-testid="doctor-form-specialty"]').type('ab')
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.contains('Especialidade deve ter no mínimo 3 caracteres').should('be.visible')
  })

  it('shows conflict error when CRM already exists (409)', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/doctors`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'CRM number already in use' },
    }).as('createDoctor')

    visitWithMockAuth('/doctors/new')
    cy.wait('@getUsers')
    cy.get('[data-testid="doctor-form-user"]').select('user-uuid-1')
    cy.get('[data-testid="doctor-form-crm"]').type('12345/SP')
    cy.get('[data-testid="doctor-form-specialty"]').type('Cardiologia')
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.wait('@createDoctor')
    cy.get('[data-testid="doctor-form-error"]').should('be.visible')
    cy.get('[data-testid="doctor-form-error"]').should('contain', 'CRM já cadastrado')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/doctors`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedDoctor })
    }).as('createDoctor')

    visitWithMockAuth('/doctors/new')
    cy.wait('@getUsers')
    cy.get('[data-testid="doctor-form-user"]').select('user-uuid-1')
    cy.get('[data-testid="doctor-form-crm"]').type('12345/SP')
    cy.get('[data-testid="doctor-form-specialty"]').type('Cardiologia')
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.get('[data-testid="doctor-form-submit"]').should('be.disabled')
    cy.wait('@createDoctor')
  })

  it('cancel button returns to /doctors without creating doctor', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getDoctors')

    visitWithMockAuth('/doctors/new')
    cy.get('[data-testid="new-doctor-back-button"]').click()
    cy.url().should('match', /\/doctors$/)
  })

  it('creates doctor and redirects to /doctors list', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/doctors`, {
      statusCode: 201,
      body: mockCreatedDoctor,
    }).as('createDoctor')
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: { data: [mockCreatedDoctor], total: 1, page: 1, limit: 20 },
    }).as('getDoctors')

    visitWithMockAuth('/doctors/new')
    cy.wait('@getUsers')
    cy.get('[data-testid="doctor-form-user"]').select('user-uuid-1')
    cy.get('[data-testid="doctor-form-crm"]').type('12345/SP')
    cy.get('[data-testid="doctor-form-specialty"]').type('Cardiologia')
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.wait('@createDoctor')
    cy.url().should('match', /\/doctors$/)
    cy.wait('@getDoctors')
    cy.get(`[data-testid="doctor-table-row-${mockCreatedDoctor.id}"]`).should('exist')
  })
})

export {}
