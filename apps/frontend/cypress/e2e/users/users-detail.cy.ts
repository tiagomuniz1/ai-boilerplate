const MOCK_TOKEN = 'mock-access-token'
const MOCK_USER_ID = 'eeeeeeee-0000-0000-0000-000000000001'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockUser = {
  id: MOCK_USER_ID,
  fullName: 'Usuário Detalhe',
  email: 'detalhe@test.com',
  role: 'user',
  isActive: true,
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

describe('Users Detail', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit(`/users/${MOCK_USER_ID}`)
    cy.url().should('include', '/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: mockUser })
    }).as('getUser')

    visitWithMockAuth(`/users/${MOCK_USER_ID}`)
    cy.get('[data-testid="user-details-skeleton"]').should('be.visible')
    cy.wait('@getUser')
    cy.get('[data-testid="user-details-skeleton"]').should('not.exist')
  })

  it('shows error state when user does not exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'User not found' },
    }).as('getUser')

    visitWithMockAuth(`/users/${MOCK_USER_ID}`)
    cy.wait('@getUser')
    cy.get('[data-testid="user-details-error"]').should('be.visible')
    cy.get('[data-testid="user-details"]').should('not.exist')
  })

  it('shows user details with name, email, status and role', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockUser,
    }).as('getUser')

    visitWithMockAuth(`/users/${MOCK_USER_ID}`)
    cy.wait('@getUser')

    cy.get('[data-testid="user-details"]').should('be.visible')
    cy.get('[data-testid="user-details-name"]').should('contain', mockUser.fullName)
    cy.get('[data-testid="user-details-email"]').should('contain', mockUser.email)
    cy.get('[data-testid="user-details-status"]').should('contain', 'Ativo')
    cy.get('[data-testid="user-details-role"]').should('contain', 'Usuário')
    cy.get('[data-testid="user-details-created-at"]').should('be.visible')
  })

  it('shows inactive status for inactive user', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: { ...mockUser, isActive: false },
    }).as('getUser')

    visitWithMockAuth(`/users/${MOCK_USER_ID}`)
    cy.wait('@getUser')
    cy.get('[data-testid="user-details-status"]').should('contain', 'Inativo')
  })

  it('back button navigates to /users', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockUser,
    }).as('getUser')
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })

    visitWithMockAuth(`/users/${MOCK_USER_ID}`)
    cy.wait('@getUser')
    cy.get('[data-testid="user-details-back-button"]').click()
    cy.url().should('match', /\/users$/)
  })

  it('edit button navigates to /users/[id]/edit', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockUser,
    }).as('getUser')

    visitWithMockAuth(`/users/${MOCK_USER_ID}`)
    cy.wait('@getUser')
    cy.get('[data-testid="user-details-edit-button"]').click()
    cy.url().should('include', `/users/${MOCK_USER_ID}/edit`)
  })

  it('delete button opens dialog with user name', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockUser,
    }).as('getUser')

    visitWithMockAuth(`/users/${MOCK_USER_ID}`)
    cy.wait('@getUser')
    cy.get('[data-testid="user-details-delete-button"]').click()
    cy.get('[data-testid="delete-user-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-user-dialog-message"]').should('contain', mockUser.fullName)
  })

  it('cancel button on dialog closes dialog without deleting', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockUser,
    }).as('getUser')

    visitWithMockAuth(`/users/${MOCK_USER_ID}`)
    cy.wait('@getUser')
    cy.get('[data-testid="user-details-delete-button"]').click()
    cy.get('[data-testid="delete-user-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-user-dialog-cancel"]').click()
    cy.get('[data-testid="delete-user-dialog"]').should('not.exist')
    cy.get('[data-testid="user-details"]').should('be.visible')
  })

  it('delete failure closes dialog and keeps user on details page', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockUser,
    }).as('getUser')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 500,
      body: { status: 500, title: 'Internal Server Error' },
    }).as('deleteUser')

    visitWithMockAuth(`/users/${MOCK_USER_ID}`)
    cy.wait('@getUser')
    cy.get('[data-testid="user-details-delete-button"]').click()
    cy.get('[data-testid="delete-user-dialog-confirm"]').click()
    cy.wait('@deleteUser')
    cy.get('[data-testid="delete-user-dialog"]').should('not.exist')
    cy.url().should('include', `/users/${MOCK_USER_ID}`)
  })

  it('delete success navigates to /users', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockUser,
    }).as('getUser')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deleteUser')
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })

    visitWithMockAuth(`/users/${MOCK_USER_ID}`)
    cy.wait('@getUser')
    cy.get('[data-testid="user-details-delete-button"]').click()
    cy.get('[data-testid="delete-user-dialog-confirm"]').click()
    cy.wait('@deleteUser')
    cy.url().should('match', /\/users$/)
  })

  it('shows user details via real API', () => {
    let seededId: string

    cy.fixture('users').then((fixture) => {
      cy.login(fixture.admin.email, fixture.admin.password)
    })

    cy.seedUser().then((user) => {
      seededId = user.id

      cy.visit(`/users/${user.id}`)
      cy.get('[data-testid="user-details"]').should('be.visible')
      cy.get('[data-testid="user-details-name"]').should('contain', user.fullName)
      cy.get('[data-testid="user-details-email"]').should('contain', user.email)
    })

    cy.then(() => {
      if (seededId) cy.deleteUserViaApi(seededId)
    })
  })
})

export {}
