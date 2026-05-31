const MOCK_TOKEN = 'mock-access-token'
const MOCK_SPECIALTY_ID = '11110000-0000-0000-0000-000000000001'

const mockAdminUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockNonAdminUser = {
  id: 'mock-user-id',
  fullName: 'Mock Usuário',
  email: 'mock@user.com',
  role: 'user',
}

const mockSpecialty = {
  id: MOCK_SPECIALTY_ID,
  name: 'Cardiologia',
  description: 'Especialidade focada em doenças do coração',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }
const populatedListResponse = { data: [mockSpecialty], total: 1, page: 1, limit: 20 }

function visitWithMockAuth(url: string, authUser = mockAdminUser) {
  cy.intercept('GET', `${Cypress.env('API_URL')}/auth/me`, {
    statusCode: 200,
    body: authUser,
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
        JSON.stringify({ state: { user: authUser }, version: 0 }),
      )
    },
  })
}

describe('Specialties List', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit('/specialties')
    cy.url().should('include', '/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: populatedListResponse })
    }).as('getSpecialties')

    visitWithMockAuth('/specialties')
    cy.get('[data-testid="specialty-list-skeleton"]').should('be.visible')
    cy.wait('@getSpecialties')
    cy.get('[data-testid="specialty-list-skeleton"]').should('not.exist')
  })

  it('shows empty state when no specialties exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getSpecialties')

    visitWithMockAuth('/specialties')
    cy.wait('@getSpecialties')
    cy.get('[data-testid="specialty-list-empty"]').should('be.visible')
    cy.get('[data-testid="specialty-list-table"]').should('not.exist')
  })

  it('shows error state when API fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getSpecialties')

    visitWithMockAuth('/specialties')
    cy.wait('@getSpecialties')
    cy.get('[data-testid="specialty-list-error"]').should('be.visible')
    cy.get('[data-testid="specialty-list-table"]').should('not.exist')
  })

  it('shows specialty rows with name, description and createdAt', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getSpecialties')

    visitWithMockAuth('/specialties')
    cy.wait('@getSpecialties')

    cy.get('[data-testid="specialty-list-table"]').should('be.visible')
    cy.get(`[data-testid="specialty-table-row-${MOCK_SPECIALTY_ID}"]`).should('exist')
    cy.get(`[data-testid="specialty-name-${MOCK_SPECIALTY_ID}"]`).should('contain', mockSpecialty.name)
    cy.get(`[data-testid="specialty-description-${MOCK_SPECIALTY_ID}"]`).should('contain', mockSpecialty.description)
    cy.get(`[data-testid="specialty-created-at-${MOCK_SPECIALTY_ID}"]`).should('be.visible')
  })

  it('shows "—" when specialty has no description', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: { data: [{ ...mockSpecialty, description: null }], total: 1, page: 1, limit: 20 },
    }).as('getSpecialties')

    visitWithMockAuth('/specialties')
    cy.wait('@getSpecialties')
    cy.get(`[data-testid="specialty-description-${MOCK_SPECIALTY_ID}"]`).should('contain', '—')
  })

  it('shows total count of specialties', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getSpecialties')

    visitWithMockAuth('/specialties')
    cy.wait('@getSpecialties')
    cy.contains('1 especialidade cadastrada').should('be.visible')
  })

  it('shows "Nova especialidade" button for ADMIN that links to /specialties/new', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getSpecialties')

    visitWithMockAuth('/specialties')
    cy.wait('@getSpecialties')
    cy.get('[data-testid="specialty-list-new-button"]').should('be.visible')
    cy.get('[data-testid="specialty-list-new-button"]').click()
    cy.url().should('include', '/specialties/new')
  })

  it('hides "Nova especialidade" button for non-admin', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getSpecialties')

    visitWithMockAuth('/specialties', mockNonAdminUser)
    cy.wait('@getSpecialties')
    cy.get('[data-testid="specialty-list-new-button"]').should('not.exist')
  })

  it('shows edit and delete buttons for ADMIN', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getSpecialties')

    visitWithMockAuth('/specialties')
    cy.wait('@getSpecialties')
    cy.get(`[data-testid="specialty-delete-button-${MOCK_SPECIALTY_ID}"]`).should('be.visible')
    cy.get(`[data-testid="specialty-edit-link-${MOCK_SPECIALTY_ID}"]`).should('exist')
  })

  it('hides edit and delete buttons for non-admin', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getSpecialties')

    visitWithMockAuth('/specialties', mockNonAdminUser)
    cy.wait('@getSpecialties')
    cy.get(`[data-testid="specialty-delete-button-${MOCK_SPECIALTY_ID}"]`).should('not.exist')
    cy.get(`[data-testid="specialty-edit-link-${MOCK_SPECIALTY_ID}"]`).should('not.exist')
  })

  it('renders view link for each specialty', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getSpecialties')

    visitWithMockAuth('/specialties')
    cy.wait('@getSpecialties')
    cy.get(`[data-testid="specialty-view-link-${MOCK_SPECIALTY_ID}"]`).should('exist')
  })

  it('renders search input', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getSpecialties')

    visitWithMockAuth('/specialties')
    cy.wait('@getSpecialties')
    cy.get('[data-testid="specialty-list-search"]').should('be.visible')
  })

  it('typing in search sends query param to API', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getSpecialties')

    visitWithMockAuth('/specialties')
    cy.wait('@getSpecialties')

    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('searchSpecialties')

    cy.get('[data-testid="specialty-list-search"]').type('Cardio')
    cy.wait('@searchSpecialties').its('request.url').should('include', 'search=')
  })

  it('shows specific empty message when search returns no results', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getSpecialties')

    visitWithMockAuth('/specialties')
    cy.wait('@getSpecialties')

    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('searchSpecialties')

    cy.get('[data-testid="specialty-list-search"]').type('Inexistente')
    cy.wait('@searchSpecialties')
    cy.get('[data-testid="specialty-list-empty"]').should('contain', 'busca realizada')
  })

  it('shows specialty rows with data from real API', () => {
    let seededId: string

    cy.fixture('users').then((fixture) => {
      cy.login(fixture.admin.email, fixture.admin.password)
    })

    cy.seedSpecialty().then((specialty) => {
      seededId = specialty.id

      cy.visit('/specialties')
      cy.get(`[data-testid="specialty-table-row-${specialty.id}"]`).should('exist')
      cy.get(`[data-testid="specialty-name-${specialty.id}"]`).should('contain', specialty.name)
    })

    cy.then(() => {
      if (seededId) cy.deleteSpecialtyViaApi(seededId)
    })
  })
})

export {}
