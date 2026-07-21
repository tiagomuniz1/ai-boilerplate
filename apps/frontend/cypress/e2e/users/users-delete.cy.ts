import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

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
  isProfessional: false,
  isPatient: false,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const populatedListResponse = { data: [mockUser], total: 1, page: 1, limit: 20 }
const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }

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

    visitClinic('/users', mockAuthUser)
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

    visitClinic('/users', mockAuthUser)
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

    visitClinic('/users', mockAuthUser)
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

    visitClinic('/users', mockAuthUser)
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

    visitClinic('/users', mockAuthUser)
    cy.wait('@getUsers')
    cy.get(`[data-testid="user-delete-button-${MOCK_USER_ID}"]`).click()
    cy.get('[data-testid="delete-user-dialog-confirm"]').click()
    cy.wait('@deleteUser')
    cy.wait('@getUsers')
    cy.get(`[data-testid="user-table-row-${MOCK_USER_ID}"]`).should('not.exist')
    cy.get('[data-testid="user-list-empty"]').should('be.visible')
  })

})

export {}
