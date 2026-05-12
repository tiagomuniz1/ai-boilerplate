const MOCK_TOKEN = 'mock-access-token'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
}

const mockDoctor = {
  id: 'aaaaaaaa-2222-2222-2222-000000000001',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@test.com' },
  crmNumber: '12345/SP',
  specialty: 'Cardiologia',
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }
const populatedListResponse = { data: [mockDoctor], total: 1, page: 1, limit: 20 }

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

describe('Doctors List', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit('/doctors')
    cy.url().should('include', '/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: populatedListResponse })
    }).as('getDoctors')

    visitWithMockAuth('/doctors')
    cy.get('[data-testid="doctor-list-skeleton"]').should('be.visible')
    cy.wait('@getDoctors')
    cy.get('[data-testid="doctor-list-skeleton"]').should('not.exist')
  })

  it('shows empty state when no doctors exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getDoctors')

    visitWithMockAuth('/doctors')
    cy.wait('@getDoctors')
    cy.get('[data-testid="doctor-list-empty"]').should('be.visible')
    cy.get('[data-testid="doctor-list-table"]').should('not.exist')
  })

  it('shows error state when API fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getDoctors')

    visitWithMockAuth('/doctors')
    cy.wait('@getDoctors')
    cy.get('[data-testid="doctor-list-error"]').should('be.visible')
    cy.get('[data-testid="doctor-list-table"]').should('not.exist')
  })

  it('shows doctor rows with name, email, CRM and specialty', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getDoctors')

    visitWithMockAuth('/doctors')
    cy.wait('@getDoctors')

    cy.get('[data-testid="doctor-list-table"]').should('be.visible')
    cy.get(`[data-testid="doctor-table-row-${mockDoctor.id}"]`).should('exist')
    cy.get(`[data-testid="doctor-name-${mockDoctor.id}"]`).should('contain', mockDoctor.user.fullName)
    cy.get(`[data-testid="doctor-email-${mockDoctor.id}"]`).should('contain', mockDoctor.user.email)
    cy.get(`[data-testid="doctor-crm-${mockDoctor.id}"]`).should('contain', mockDoctor.crmNumber)
    cy.get(`[data-testid="doctor-specialty-${mockDoctor.id}"]`).should('contain', mockDoctor.specialty)
  })

  it('shows "Novo médico" button that links to /doctors/new', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getDoctors')

    visitWithMockAuth('/doctors')
    cy.wait('@getDoctors')
    cy.get('[data-testid="doctor-list-new-button"]').should('be.visible')
    cy.get('[data-testid="doctor-list-new-button"]').click()
    cy.url().should('include', '/doctors/new')
  })

  it('renders search input', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getDoctors')

    visitWithMockAuth('/doctors')
    cy.wait('@getDoctors')
    cy.get('[data-testid="doctor-list-search"]').should('be.visible')
  })

  it('typing in search sends query param to API', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getDoctors')

    visitWithMockAuth('/doctors')
    cy.wait('@getDoctors')

    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('searchDoctors')

    cy.get('[data-testid="doctor-list-search"]').type('Cardio')
    cy.wait('@searchDoctors').its('request.url').should('include', 'search=')
  })

  it('shows specific empty message when search returns no results', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getDoctors')

    visitWithMockAuth('/doctors')
    cy.wait('@getDoctors')

    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('searchDoctors')

    cy.get('[data-testid="doctor-list-search"]').type('Inexistente')
    cy.wait('@searchDoctors')
    cy.get('[data-testid="doctor-list-empty"]')
      .should('be.visible')
      .and('contain', 'Nenhum médico encontrado para a busca realizada')
  })

  it('renders view and edit links for each doctor', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getDoctors')

    visitWithMockAuth('/doctors')
    cy.wait('@getDoctors')

    cy.get(`[data-testid="doctor-view-link-${mockDoctor.id}"]`).should('exist')
    cy.get(`[data-testid="doctor-edit-link-${mockDoctor.id}"]`).should('exist')
  })
})

export {}
