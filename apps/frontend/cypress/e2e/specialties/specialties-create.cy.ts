const MOCK_TOKEN = 'mock-access-token'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockCreatedSpecialty = {
  id: '22220000-0000-0000-0000-000000000001',
  name: 'Cardiologia',
  description: 'Especialidade focada em doenças do coração',
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

describe('Specialties Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows validation error when submitting empty form', () => {
    visitWithMockAuth('/specialties/new')
    cy.get('[data-testid="specialty-form-submit"]').click()
    cy.contains('Nome deve ter no mínimo 3 caracteres').should('be.visible')
  })

  it('shows validation error when name is too short', () => {
    visitWithMockAuth('/specialties/new')
    cy.get('[data-testid="specialty-form-name"]').type('AB')
    cy.get('[data-testid="specialty-form-submit"]').click()
    cy.contains('Nome deve ter no mínimo 3 caracteres').should('be.visible')
  })

  it('shows validation error when name exceeds 100 characters', () => {
    visitWithMockAuth('/specialties/new')
    cy.get('[data-testid="specialty-form-name"]').type('A'.repeat(101))
    cy.get('[data-testid="specialty-form-submit"]').click()
    cy.contains('Nome deve ter no máximo 100 caracteres').should('be.visible')
  })

  it('shows conflict error when name already exists (409)', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/specialties`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Specialty with this name already exists' },
    }).as('createSpecialty')

    visitWithMockAuth('/specialties/new')
    cy.fixture('specialties').then((fixture) => {
      cy.get('[data-testid="specialty-form-name"]').type(fixture.newSpecialty.name)
    })
    cy.get('[data-testid="specialty-form-submit"]').click()
    cy.wait('@createSpecialty')
    cy.get('[data-testid="specialty-form-error"]').should('be.visible')
    cy.get('[data-testid="specialty-form-error"]').should('contain', 'Já existe uma especialidade com este nome')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/specialties`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedSpecialty })
    }).as('createSpecialty')

    visitWithMockAuth('/specialties/new')
    cy.fixture('specialties').then((fixture) => {
      cy.get('[data-testid="specialty-form-name"]').type(fixture.newSpecialty.name)
    })
    cy.get('[data-testid="specialty-form-submit"]').click()
    cy.get('[data-testid="specialty-form-submit"]').should('be.disabled')
    cy.wait('@createSpecialty')
  })

  it('cancel button returns to /specialties without creating', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getSpecialties')

    visitWithMockAuth('/specialties/new')
    cy.get('[data-testid="new-specialty-back-button"]').click()
    cy.url().should('match', /\/specialties$/)
  })

  it('creates specialty with description and redirects to /specialties', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/specialties`, {
      statusCode: 201,
      body: mockCreatedSpecialty,
    }).as('createSpecialty')
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: { data: [mockCreatedSpecialty], total: 1, page: 1, limit: 20 },
    }).as('getSpecialties')

    visitWithMockAuth('/specialties/new')
    cy.fixture('specialties').then((fixture) => {
      cy.get('[data-testid="specialty-form-name"]').type(fixture.newSpecialty.name)
      cy.get('[data-testid="specialty-form-description"]').type(fixture.newSpecialty.description)
    })
    cy.get('[data-testid="specialty-form-submit"]').click()
    cy.wait('@createSpecialty')
    cy.url().should('match', /\/specialties$/)
    cy.wait('@getSpecialties')
    cy.get(`[data-testid="specialty-table-row-${mockCreatedSpecialty.id}"]`).should('exist')
  })

  it('creates specialty without description (optional field)', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/specialties`, {
      statusCode: 201,
      body: { ...mockCreatedSpecialty, description: null },
    }).as('createSpecialty')
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getSpecialties')

    visitWithMockAuth('/specialties/new')
    cy.fixture('specialties').then((fixture) => {
      cy.get('[data-testid="specialty-form-name"]').type(fixture.newSpecialty.name)
    })
    cy.get('[data-testid="specialty-form-submit"]').click()
    cy.wait('@createSpecialty')
    cy.url().should('match', /\/specialties$/)
  })

  it('creates specialty via real API and redirects to /specialties', () => {
    let createdId: string

    cy.fixture('users').then((fixture) => {
      cy.login(fixture.admin.email, fixture.admin.password)
    })

    cy.intercept('POST', `${Cypress.env('API_URL')}/specialties`).as('createSpecialty')

    cy.visit('/specialties/new')
    cy.fixture('specialties').then((fixture) => {
      const ts = Date.now()
      cy.get('[data-testid="specialty-form-name"]').type(`${fixture.newSpecialty.name} ${ts}`)
      cy.get('[data-testid="specialty-form-description"]').type(fixture.newSpecialty.description)
    })
    cy.get('[data-testid="specialty-form-submit"]').click()

    cy.wait('@createSpecialty').then((interception) => {
      createdId = interception.response?.body.id
    })

    cy.url().should('match', /\/specialties$/)

    cy.then(() => {
      if (createdId) cy.deleteSpecialtyViaApi(createdId)
    })
  })
})

export {}
