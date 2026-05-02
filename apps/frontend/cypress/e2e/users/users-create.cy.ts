const MOCK_TOKEN = 'mock-access-token'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
}

const mockCreatedUser = {
  id: 'bbbbbbbb-0000-0000-0000-000000000001',
  fullName: 'Novo Usuário E2E',
  email: 'novo.usuario.e2e@test.com',
  role: 'user',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

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

describe('Users Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows validation errors when submitting empty form', () => {
    visitWithMockAuth('/users/new')
    cy.get('[data-testid="user-form-submit"]').click()
    cy.contains('Nome deve ter no mínimo 3 caracteres').should('be.visible')
    cy.contains('E-mail inválido').should('be.visible')
    cy.contains('Senha deve ter no mínimo 8 caracteres').should('be.visible')
  })

  it('shows validation error when fullName is too short', () => {
    visitWithMockAuth('/users/new')
    cy.get('[data-testid="user-form-fullname"]').type('AB')
    cy.get('[data-testid="user-form-submit"]').click()
    cy.contains('Nome deve ter no mínimo 3 caracteres').should('be.visible')
  })

  it('shows validation error when password is too short', () => {
    visitWithMockAuth('/users/new')
    cy.get('[data-testid="user-form-email"]').type('valido@test.com')
    cy.get('[data-testid="user-form-fullname"]').type('Nome Válido')
    cy.get('[data-testid="user-form-password"]').type('short')
    cy.get('[data-testid="user-form-submit"]').click()
    cy.contains('Senha deve ter no mínimo 8 caracteres').should('be.visible')
  })

  it('shows conflict error when email already exists (409)', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/users`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Email already in use' },
    }).as('createUser')

    visitWithMockAuth('/users/new')
    cy.fixture('users').then((fixture) => {
      cy.get('[data-testid="user-form-fullname"]').type(fixture.newUser.fullName)
      cy.get('[data-testid="user-form-email"]').type(fixture.newUser.email)
      cy.get('[data-testid="user-form-password"]').type(fixture.newUser.password)
    })
    cy.get('[data-testid="user-form-submit"]').click()
    cy.wait('@createUser')
    cy.get('[data-testid="user-form-error"]').should('be.visible')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/users`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedUser })
    }).as('createUser')

    visitWithMockAuth('/users/new')
    cy.fixture('users').then((fixture) => {
      cy.get('[data-testid="user-form-fullname"]').type(fixture.newUser.fullName)
      cy.get('[data-testid="user-form-email"]').type(fixture.newUser.email)
      cy.get('[data-testid="user-form-password"]').type(fixture.newUser.password)
    })
    cy.get('[data-testid="user-form-submit"]').click()
    cy.get('[data-testid="user-form-submit"]').should('be.disabled')
    cy.wait('@createUser')
  })

  it('cancel button returns to /users without creating user', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getUsers')

    visitWithMockAuth('/users/new')
    cy.get('[data-testid="new-user-back-button"]').click()
    cy.url().should('match', /\/users$/)
  })

  it('creates user and redirects to /users list', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/users`, {
      statusCode: 201,
      body: mockCreatedUser,
    }).as('createUser')
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: { data: [mockCreatedUser], total: 1, page: 1, limit: 20 },
    }).as('getUsers')

    visitWithMockAuth('/users/new')
    cy.fixture('users').then((fixture) => {
      cy.get('[data-testid="user-form-fullname"]').type(fixture.newUser.fullName)
      cy.get('[data-testid="user-form-email"]').type(fixture.newUser.email)
      cy.get('[data-testid="user-form-password"]').type(fixture.newUser.password)
    })
    cy.get('[data-testid="user-form-submit"]').click()
    cy.wait('@createUser')
    cy.url().should('match', /\/users$/)
    cy.wait('@getUsers')
    cy.get(`[data-testid="user-table-row-${mockCreatedUser.id}"]`).should('exist')
  })

  it('creates user via real API and redirects to /users', () => {
    let createdId: string

    cy.fixture('users').then((fixture) => {
      cy.login(fixture.admin.email, fixture.admin.password)
    })

    cy.intercept('POST', `${Cypress.env('API_URL')}/users`).as('createUser')

    cy.visit('/users/new')
    cy.fixture('users').then((fixture) => {
      const ts = Date.now()
      cy.get('[data-testid="user-form-fullname"]').type(fixture.newUser.fullName)
      cy.get('[data-testid="user-form-email"]').type(`e2e.${ts}@test.com`)
      cy.get('[data-testid="user-form-password"]').type(fixture.newUser.password)
    })
    cy.get('[data-testid="user-form-submit"]').click()

    cy.wait('@createUser').then((interception) => {
      createdId = interception.response?.body.id
    })

    cy.url().should('match', /\/users$/)

    cy.then(() => {
      if (createdId) cy.deleteUserViaApi(createdId)
    })
  })
})

export {}
