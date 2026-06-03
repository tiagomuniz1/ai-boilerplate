const MOCK_TOKEN = 'mock-access-token'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockPatient = {
  id: 'aaaaaaaa-1111-1111-1111-000000000001',
  user: { id: 'user-uuid-1', fullName: 'João Silva', email: 'joao@test.com', isActive: true },
  phoneNumber: '11999999999',
  birthDate: '1990-05-15',
  documentNumber: '12345678901',
  gender: 'male',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }
const populatedListResponse = { data: [mockPatient], total: 1, page: 1, limit: 20 }

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

describe('Patients List', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit('/patients')
    cy.url().should('include', '/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: populatedListResponse })
    }).as('getPatients')

    visitWithMockAuth('/patients')
    cy.get('[data-testid="patient-list-skeleton"]').should('be.visible')
    cy.wait('@getPatients')
    cy.get('[data-testid="patient-list-skeleton"]').should('not.exist')
  })

  it('shows empty state when no patients exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getPatients')

    visitWithMockAuth('/patients')
    cy.wait('@getPatients')
    cy.get('[data-testid="patient-list-empty"]').should('be.visible')
    cy.get('[data-testid="patient-list-table"]').should('not.exist')
  })

  it('shows error state when API fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getPatients')

    visitWithMockAuth('/patients')
    cy.wait('@getPatients')
    cy.get('[data-testid="patient-list-error"]').should('be.visible')
    cy.get('[data-testid="patient-list-table"]').should('not.exist')
  })

  it('shows patient rows with name, email and phone', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getPatients')

    visitWithMockAuth('/patients')
    cy.wait('@getPatients')

    cy.get('[data-testid="patient-list-table"]').should('be.visible')
    cy.get(`[data-testid="patient-table-row-${mockPatient.id}"]`).should('exist')
    cy.get(`[data-testid="patient-name-${mockPatient.id}"]`).should('contain', mockPatient.user.fullName)
    cy.get(`[data-testid="patient-email-${mockPatient.id}"]`).should('contain', mockPatient.user.email)
    cy.get(`[data-testid="patient-phone-${mockPatient.id}"]`).should('contain', '(11) 99999-9999')
  })

  it('shows "Novo paciente" button that links to /patients/new', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getPatients')

    visitWithMockAuth('/patients')
    cy.wait('@getPatients')
    cy.get('[data-testid="patient-list-new-button"]').should('be.visible')
    cy.get('[data-testid="patient-list-new-button"]').click()
    cy.url().should('include', '/patients/new')
  })

  it('renders search input', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getPatients')

    visitWithMockAuth('/patients')
    cy.wait('@getPatients')
    cy.get('[data-testid="patient-list-search"]').should('be.visible')
  })

  it('typing in search sends query param to API', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getPatients')

    visitWithMockAuth('/patients')
    cy.wait('@getPatients')

    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('searchPatients')

    cy.get('[data-testid="patient-list-search"]').type('João')
    cy.wait('@searchPatients').its('request.url').should('include', 'search=')
  })

  it('shows specific empty message when search returns no results', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getPatients')

    visitWithMockAuth('/patients')
    cy.wait('@getPatients')

    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('searchPatients')

    cy.get('[data-testid="patient-list-search"]').type('Inexistente')
    cy.wait('@searchPatients')
    cy.get('[data-testid="patient-list-empty"]')
      .should('be.visible')
      .and('contain', 'Nenhum paciente encontrado para a busca realizada')
  })

  it('renders view and edit links for each patient', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getPatients')

    visitWithMockAuth('/patients')
    cy.wait('@getPatients')

    cy.get(`[data-testid="patient-view-link-${mockPatient.id}"]`).should('exist')
    cy.get(`[data-testid="patient-edit-link-${mockPatient.id}"]`).should('exist')
  })
})

export {}
