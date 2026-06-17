import { visitBackoffice, expectBackofficePath } from '../../support/clinic'

const MOCK_SPECIALTY_ID = '33330000-0000-0000-0000-000000000001'

const mockAdminUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'platform_admin',
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
  updatedAt: '2024-01-20T10:00:00.000Z',
}

describe('Specialties Detail', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit(`/backoffice/specialties/${MOCK_SPECIALTY_ID}`)
    expectBackofficePath('/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: mockSpecialty })
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAdminUser)
    cy.get('[data-testid="specialty-details-skeleton"]').should('be.visible')
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-details-skeleton"]').should('not.exist')
  })

  it('shows error state when specialty does not exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'Specialty not found' },
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAdminUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-details-error"]').should('be.visible')
    cy.get('[data-testid="specialty-details"]').should('not.exist')
  })

  it('shows specialty details with name, createdAt and updatedAt', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAdminUser)
    cy.wait('@getSpecialty')

    cy.get('[data-testid="specialty-details"]').should('be.visible')
    cy.get('[data-testid="specialty-details-name"]').should('contain', mockSpecialty.name)
    cy.get('[data-testid="specialty-details-created-at"]').should('be.visible')
    cy.get('[data-testid="specialty-details-updated-at"]').should('be.visible')
  })

  it('shows description when specialty has one', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAdminUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-details-description"]').should('contain', mockSpecialty.description)
  })

  it('does not show description section when specialty has none', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: { ...mockSpecialty, description: null },
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAdminUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-details-description"]').should('not.exist')
  })

  it('back button navigates to /specialties', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAdminUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-details-back-button"]').click()
    expectBackofficePath('/specialties')
  })

  it('shows edit and delete buttons for ADMIN', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAdminUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-details-edit-button"]').should('be.visible')
    cy.get('[data-testid="specialty-details-delete-button"]').should('be.visible')
  })

  it('hides edit and delete buttons for non-admin', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockNonAdminUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-details-edit-button"]').should('not.exist')
    cy.get('[data-testid="specialty-details-delete-button"]').should('not.exist')
  })

  it('edit button navigates to /specialties/[id]/edit', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAdminUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-details-edit-button"]').click()
    expectBackofficePath(`/specialties/${MOCK_SPECIALTY_ID}/edit`)
  })

  it('delete button opens dialog with specialty name', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAdminUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-details-delete-button"]').click()
    cy.get('[data-testid="delete-specialty-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-specialty-dialog-message"]').should('contain', mockSpecialty.name)
  })

  it('cancel button on dialog closes dialog without deleting', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAdminUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-details-delete-button"]').click()
    cy.get('[data-testid="delete-specialty-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-specialty-dialog-cancel"]').click()
    cy.get('[data-testid="delete-specialty-dialog"]').should('not.exist')
    cy.get('[data-testid="specialty-details"]').should('be.visible')
  })

  it('delete failure closes dialog and keeps user on details page', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 500,
      body: { status: 500, title: 'Internal Server Error' },
    }).as('deleteSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAdminUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-details-delete-button"]').click()
    cy.get('[data-testid="delete-specialty-dialog-confirm"]').click()
    cy.wait('@deleteSpecialty')
    cy.get('[data-testid="delete-specialty-dialog"]').should('not.exist')
    expectBackofficePath(`/specialties/${MOCK_SPECIALTY_ID}`)
  })

  it('delete success navigates to /specialties', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deleteSpecialty')
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAdminUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-details-delete-button"]').click()
    cy.get('[data-testid="delete-specialty-dialog-confirm"]').click()
    cy.wait('@deleteSpecialty')
    expectBackofficePath('/specialties')
  })

})

export {}
