const MOCK_TOKEN = 'mock-access-token'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
}

const mockUser = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  fullName: 'Usuário Listado',
  email: 'listado@test.com',
  role: 'user',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }
const populatedListResponse = { data: [mockUser], total: 1, page: 1, limit: 20 }

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

describe('Users List', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit('/users')
    cy.url().should('include', '/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: populatedListResponse })
    }).as('getUsers')

    visitWithMockAuth('/users')
    cy.get('[data-testid="user-list-skeleton"]').should('be.visible')
    cy.wait('@getUsers')
    cy.get('[data-testid="user-list-skeleton"]').should('not.exist')
  })

  it('shows empty state when no users exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getUsers')

    visitWithMockAuth('/users')
    cy.wait('@getUsers')
    cy.get('[data-testid="user-list-empty"]').should('be.visible')
    cy.get('[data-testid="user-list-table"]').should('not.exist')
  })

  it('shows error state when API fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getUsers')

    visitWithMockAuth('/users')
    cy.wait('@getUsers')
    cy.get('[data-testid="user-list-error"]').should('be.visible')
    cy.get('[data-testid="user-list-table"]').should('not.exist')
  })

  it('shows user rows with name, email and role', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getUsers')

    visitWithMockAuth('/users')
    cy.wait('@getUsers')

    cy.get('[data-testid="user-list-table"]').should('be.visible')
    cy.get(`[data-testid="user-table-row-${mockUser.id}"]`).should('exist')
    cy.get(`[data-testid="user-name-${mockUser.id}"]`).should('contain', mockUser.fullName)
    cy.get(`[data-testid="user-email-${mockUser.id}"]`).should('contain', mockUser.email)
    cy.get(`[data-testid="user-role-${mockUser.id}"]`).should('contain', mockUser.role)
  })

  it('shows "Novo usuário" button that links to /users/new', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getUsers')

    visitWithMockAuth('/users')
    cy.wait('@getUsers')
    cy.get('[data-testid="user-list-new-button"]').should('be.visible')
    cy.get('[data-testid="user-list-new-button"]').click()
    cy.url().should('include', '/users/new')
  })

  it('shows user rows with data from real API', () => {
    let seededId: string

    cy.fixture('users').then((fixture) => {
      cy.login(fixture.admin.email, fixture.admin.password)
    })

    cy.seedUser().then((user) => {
      seededId = user.id
      cy.visit('/users')
      cy.get(`[data-testid="user-table-row-${user.id}"]`).should('exist')
      cy.get(`[data-testid="user-name-${user.id}"]`).should('contain', user.fullName)
      cy.get(`[data-testid="user-email-${user.id}"]`).should('contain', user.email)
    })

    cy.then(() => {
      if (seededId) cy.deleteUserViaApi(seededId)
    })
  })
})

export {}
