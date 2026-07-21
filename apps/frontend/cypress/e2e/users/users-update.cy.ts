import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const MOCK_USER_ID = 'cccccccc-0000-0000-0000-000000000001'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
}

const mockUser = {
  id: MOCK_USER_ID,
  fullName: 'Usuário Original',
  email: 'original@test.com',
  role: 'user',
  isProfessional: false,
  isPatient: false,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const mockUpdatedUser = {
  ...mockUser,
  fullName: 'Usuário Atualizado',
  email: 'atualizado@test.com',
}

const listWithUpdatedUser = {
  data: [mockUpdatedUser],
  total: 1,
  page: 1,
  limit: 20,
}

describe('Users Update', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows skeleton while loading user data', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: mockUser })
    }).as('getUser')

    visitClinic(`/users/${MOCK_USER_ID}/edit`, mockAuthUser)
    cy.get('[data-testid="edit-user-skeleton"]').should('be.visible')
    cy.wait('@getUser')
    cy.get('[data-testid="edit-user-skeleton"]').should('not.exist')
  })

  it('shows pre-filled form with current user data', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockUser,
    }).as('getUser')

    visitClinic(`/users/${MOCK_USER_ID}/edit`, mockAuthUser)
    cy.wait('@getUser')

    cy.get('[data-testid="user-form-fullname"]').should('have.value', mockUser.fullName)
    cy.get('[data-testid="user-form-email"]').should('have.value', mockUser.email)
    cy.get('[data-testid="user-form-role"]').should('have.value', mockUser.role)
  })

  it('shows load error when user does not exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'User not found' },
    }).as('getUser')

    visitClinic(`/users/${MOCK_USER_ID}/edit`, mockAuthUser)
    cy.wait('@getUser')
    cy.get('[data-testid="edit-user-load-error"]').should('be.visible')
    cy.get('[data-testid="user-form"]').should('not.exist')
  })

  it('shows conflict error when updating to an already existing email', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockUser,
    }).as('getUser')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Email already in use' },
    }).as('updateUser')

    visitClinic(`/users/${MOCK_USER_ID}/edit`, mockAuthUser)
    cy.wait('@getUser')
    cy.get('[data-testid="user-form-email"]').clear().type('outro@test.com')
    cy.get('[data-testid="user-form-submit"]').click()
    cy.wait('@updateUser')
    cy.get('[data-testid="user-form-error"]').should('be.visible')
  })

  it('cancel button returns to /users without saving changes', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockUser,
    }).as('getUser')
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: listWithUpdatedUser,
    }).as('getUsers')

    visitClinic(`/users/${MOCK_USER_ID}/edit`, mockAuthUser)
    cy.wait('@getUser')
    cy.get('[data-testid="user-form-fullname"]').clear().type('Nome não salvo')
    cy.get('[data-testid="edit-user-back-button"]').click()
    expectClinicPath('/users')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockUser,
    }).as('getUser')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, (req) => {
      req.reply({ delay: 2000, statusCode: 200, body: mockUpdatedUser })
    }).as('updateUser')

    visitClinic(`/users/${MOCK_USER_ID}/edit`, mockAuthUser)
    cy.wait('@getUser')
    cy.get('[data-testid="user-form-fullname"]').clear().type('Nome Novo')
    cy.get('[data-testid="user-form-submit"]').click()
    cy.get('[data-testid="user-form-submit"]').should('be.disabled')
    cy.wait('@updateUser')
  })

  it('updates user and redirects to /users', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockUser,
    }).as('getUser')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockUpdatedUser,
    }).as('updateUser')
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: listWithUpdatedUser,
    }).as('getUsers')

    visitClinic(`/users/${MOCK_USER_ID}/edit`, mockAuthUser)
    cy.wait('@getUser')

    cy.fixture('users').then((fixture) => {
      cy.get('[data-testid="user-form-fullname"]').clear().type(fixture.updatedUser.fullName)
      cy.get('[data-testid="user-form-email"]').clear().type(fixture.updatedUser.email)
    })
    cy.get('[data-testid="user-form-submit"]').click()
    cy.wait('@updateUser')
    expectClinicPath('/users')
  })

  it('shows isActive checkbox checked when user is active', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: { ...mockUser, isActive: true },
    }).as('getUser')

    visitClinic(`/users/${MOCK_USER_ID}/edit`, mockAuthUser)
    cy.wait('@getUser')
    cy.get('[data-testid="user-form-isactive"]').should('be.checked')
  })

  it('shows isActive checkbox unchecked when user is inactive', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: { ...mockUser, isActive: false },
    }).as('getUser')

    visitClinic(`/users/${MOCK_USER_ID}/edit`, mockAuthUser)
    cy.wait('@getUser')
    cy.get('[data-testid="user-form-isactive"]').should('not.be.checked')
  })

  it('deactivates user by unchecking isActive and saving', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: { ...mockUser, isActive: true },
    }).as('getUser')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: { ...mockUpdatedUser, isActive: false },
    }).as('updateUser')
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: listWithUpdatedUser,
    })

    visitClinic(`/users/${MOCK_USER_ID}/edit`, mockAuthUser)
    cy.wait('@getUser')
    cy.get('[data-testid="user-form-isactive"]').should('be.checked')
    cy.get('[data-testid="user-form-isactive"]').uncheck()
    cy.get('[data-testid="user-form-submit"]').click()
    cy.wait('@updateUser').then((interception) => {
      expect(interception.request.body.isActive).to.equal(false)
    })
    expectClinicPath('/users')
  })

  it('activates user by checking isActive and saving', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: { ...mockUser, isActive: false },
    }).as('getUser')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: { ...mockUpdatedUser, isActive: true },
    }).as('updateUser')
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: listWithUpdatedUser,
    })

    visitClinic(`/users/${MOCK_USER_ID}/edit`, mockAuthUser)
    cy.wait('@getUser')
    cy.get('[data-testid="user-form-isactive"]').should('not.be.checked')
    cy.get('[data-testid="user-form-isactive"]').check()
    cy.get('[data-testid="user-form-submit"]').click()
    cy.wait('@updateUser').then((interception) => {
      expect(interception.request.body.isActive).to.equal(true)
    })
    expectClinicPath('/users')
  })
})

export {}
