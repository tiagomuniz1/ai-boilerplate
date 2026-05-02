const MOCK_TOKEN = 'mock-access-token'
const MOCK_USER_ID = 'dddddddd-0000-0000-0000-000000000001'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
}

const mockUser = {
  id: MOCK_USER_ID,
  fullName: 'Usuário Para Excluir',
  email: 'excluir@test.com',
  role: 'user',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const populatedListResponse = { data: [mockUser], total: 1, page: 1, limit: 20 }
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

describe('Users Delete', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows delete confirmation dialog when delete button is clicked', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getUsers')

    visitWithMockAuth('/users')
    cy.wait('@getUsers')
    cy.get(`[data-testid="user-delete-button-${MOCK_USER_ID}"]`).click()
    cy.get('[data-testid="delete-user-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-user-dialog-message"]').should('contain', mockUser.fullName)
  })

  it('cancel button on dialog does not delete user', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getUsers')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`).as('deleteUser')

    visitWithMockAuth('/users')
    cy.wait('@getUsers')
    cy.get(`[data-testid="user-delete-button-${MOCK_USER_ID}"]`).click()
    cy.get('[data-testid="delete-user-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-user-dialog-cancel"]').click()
    cy.get('[data-testid="delete-user-dialog"]').should('not.exist')
    cy.get(`[data-testid="user-table-row-${MOCK_USER_ID}"]`).should('exist')
  })

  it('shows error message when deletion fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getUsers')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 500,
      body: { status: 500, title: 'Internal Server Error' },
    }).as('deleteUser')

    visitWithMockAuth('/users')
    cy.wait('@getUsers')
    cy.get(`[data-testid="user-delete-button-${MOCK_USER_ID}"]`).click()
    cy.get('[data-testid="delete-user-dialog-confirm"]').click()
    cy.wait('@deleteUser')
    cy.get('[data-testid="delete-user-dialog"]').should('not.exist')
    cy.get(`[data-testid="user-table-row-${MOCK_USER_ID}"]`).should('exist')
  })

  it('confirms deletion and shows success message', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getUsers')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deleteUser')

    visitWithMockAuth('/users')
    cy.wait('@getUsers')
    cy.get(`[data-testid="user-delete-button-${MOCK_USER_ID}"]`).click()
    cy.get('[data-testid="delete-user-dialog-confirm"]').click()
    cy.wait('@deleteUser')
    cy.get('[data-testid="user-list-success"]').should('be.visible')
    cy.get('[data-testid="user-list-success"]').should('contain', mockUser.fullName)
  })

  it('deleted user no longer appears in list', () => {
    let callCount = 0
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, (req) => {
      callCount++
      req.reply({
        statusCode: 200,
        body: callCount === 1 ? populatedListResponse : emptyListResponse,
      })
    }).as('getUsers')

    cy.intercept('DELETE', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deleteUser')

    visitWithMockAuth('/users')
    cy.wait('@getUsers')
    cy.get(`[data-testid="user-delete-button-${MOCK_USER_ID}"]`).click()
    cy.get('[data-testid="delete-user-dialog-confirm"]').click()
    cy.wait('@deleteUser')
    cy.wait('@getUsers')
    cy.get(`[data-testid="user-table-row-${MOCK_USER_ID}"]`).should('not.exist')
    cy.get('[data-testid="user-list-empty"]').should('be.visible')
  })

  it('deletes user via real API and verifies removal', () => {
    let seededId: string

    cy.fixture('users').then((fixture) => {
      cy.login(fixture.admin.email, fixture.admin.password)
    })

    cy.seedUser().then((user) => {
      seededId = user.id

      cy.intercept('DELETE', `${Cypress.env('API_URL')}/users/${user.id}`).as('deleteUser')

      cy.visit('/users')
      cy.get(`[data-testid="user-table-row-${user.id}"]`).should('exist')
      cy.get(`[data-testid="user-delete-button-${user.id}"]`).click()
      cy.get('[data-testid="delete-user-dialog"]').should('be.visible')
      cy.get('[data-testid="delete-user-dialog-confirm"]').click()
      cy.wait('@deleteUser')
      cy.get('[data-testid="user-list-success"]').should('be.visible')
      cy.get(`[data-testid="user-table-row-${user.id}"]`).should('not.exist')
    })

    cy.then(() => {
      if (seededId) cy.deleteUserViaApi(seededId)
    })
  })
})

export {}
