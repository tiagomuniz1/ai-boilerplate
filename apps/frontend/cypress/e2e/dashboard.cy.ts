const MOCK_TOKEN = 'mock-access-token'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
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

describe('Dashboard', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit('/dashboard')
    cy.url().should('include', '/login')
  })

  it('shows dashboard page when authenticated', () => {
    visitWithMockAuth('/dashboard')
    cy.get('[data-testid="dashboard"]').should('be.visible')
  })

  it('shows sidebar with navigation', () => {
    visitWithMockAuth('/dashboard')
    cy.get('[data-testid="sidebar"]').should('be.visible')
    cy.get('[data-testid="sidebar-nav"]').should('be.visible')
  })

  it('shows authenticated user info in sidebar', () => {
    visitWithMockAuth('/dashboard')
    cy.get('[data-testid="sidebar-user"]').should('be.visible')
    cy.get('[data-testid="sidebar-user-info"]').should('contain', mockAuthUser.fullName)
    cy.get('[data-testid="sidebar-user-info"]').should('contain', mockAuthUser.email)
  })

  it('sidebar navigation links to /users and /patients', () => {
    visitWithMockAuth('/dashboard')
    cy.get('[data-testid="sidebar-nav"]').within(() => {
      cy.get('a[href="/users"]').should('exist')
      cy.get('a[href="/patients"]').should('exist')
    })
  })
})

export {}
