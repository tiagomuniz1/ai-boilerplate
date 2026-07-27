import { visitBackoffice, expectBackofficePath } from '../../support/clinic'

const MOCK_SPECIALTY_ID = '55550000-0000-0000-0000-000000000001'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'platform_admin',
}

const mockSpecialty = {
  id: MOCK_SPECIALTY_ID,
  name: 'Cardiologia',
  description: 'Especialidade focada em doenças do coração',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const populatedListResponse = { data: [mockSpecialty], total: 1, page: 1, limit: 20 }
const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }

describe('Specialties Delete', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  describe('from list page', () => {
    it('shows delete dialog when delete button is clicked', () => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
        statusCode: 200,
        body: populatedListResponse,
      }).as('getSpecialties')

      visitBackoffice('/specialties', mockAuthUser)
      cy.wait('@getSpecialties')
      cy.get(`[data-testid="specialty-delete-button-${MOCK_SPECIALTY_ID}"]`).click()
      cy.get('[data-testid="delete-specialty-dialog"]').should('be.visible')
      cy.get('[data-testid="delete-specialty-dialog-message"]').should('contain', mockSpecialty.name)
    })

    it('cancel button does not delete specialty', () => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
        statusCode: 200,
        body: populatedListResponse,
      }).as('getSpecialties')
      cy.intercept('DELETE', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`).as('deleteSpecialty')

      visitBackoffice('/specialties', mockAuthUser)
      cy.wait('@getSpecialties')
      cy.get(`[data-testid="specialty-delete-button-${MOCK_SPECIALTY_ID}"]`).click()
      cy.get('[data-testid="delete-specialty-dialog"]').should('be.visible')
      cy.get('[data-testid="delete-specialty-dialog-cancel"]').click()
      cy.get('[data-testid="delete-specialty-dialog"]').should('not.exist')
      cy.get(`[data-testid="specialty-table-row-${MOCK_SPECIALTY_ID}"]`).should('exist')
    })

    it('shows error state when deletion fails', () => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
        statusCode: 200,
        body: populatedListResponse,
      }).as('getSpecialties')
      cy.intercept('DELETE', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
        statusCode: 500,
        body: { status: 500, title: 'Internal Server Error' },
      }).as('deleteSpecialty')

      visitBackoffice('/specialties', mockAuthUser)
      cy.wait('@getSpecialties')
      cy.get(`[data-testid="specialty-delete-button-${MOCK_SPECIALTY_ID}"]`).click()
      cy.get('[data-testid="delete-specialty-dialog-confirm"]').click()
      cy.wait('@deleteSpecialty')
      cy.get('[data-testid="delete-specialty-dialog"]').should('not.exist')
      cy.get('[data-testid="specialty-list-delete-error"]').should('be.visible')
      cy.get(`[data-testid="specialty-table-row-${MOCK_SPECIALTY_ID}"]`).should('exist')
    })

    it('confirms deletion and shows success message', () => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
        statusCode: 200,
        body: populatedListResponse,
      }).as('getSpecialties')
      cy.intercept('DELETE', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
        statusCode: 204,
        body: null,
      }).as('deleteSpecialty')

      visitBackoffice('/specialties', mockAuthUser)
      cy.wait('@getSpecialties')
      cy.get(`[data-testid="specialty-delete-button-${MOCK_SPECIALTY_ID}"]`).click()
      cy.get('[data-testid="delete-specialty-dialog-confirm"]').click()
      cy.wait('@deleteSpecialty')
      cy.get('[data-testid="specialty-list-success"]').should('be.visible')
      cy.get('[data-testid="specialty-list-success"]').should('contain', mockSpecialty.name)
    })

    it('deleted specialty no longer appears in list', () => {
      let callCount = 0
      cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, (req) => {
        callCount++
        req.reply({
          statusCode: 200,
          body: callCount === 1 ? populatedListResponse : emptyListResponse,
        })
      }).as('getSpecialties')

      cy.intercept('DELETE', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
        statusCode: 204,
        body: null,
      }).as('deleteSpecialty')

      visitBackoffice('/specialties', mockAuthUser)
      cy.wait('@getSpecialties')
      cy.get(`[data-testid="specialty-delete-button-${MOCK_SPECIALTY_ID}"]`).click()
      cy.get('[data-testid="delete-specialty-dialog-confirm"]').click()
      cy.wait('@deleteSpecialty')
      cy.wait('@getSpecialties')
      cy.get(`[data-testid="specialty-table-row-${MOCK_SPECIALTY_ID}"]`).should('not.exist')
      cy.get('[data-testid="specialty-list-empty"]').should('be.visible')
    })

    it('disables confirm button while deletion is in progress', () => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
        statusCode: 200,
        body: populatedListResponse,
      }).as('getSpecialties')
      cy.intercept('DELETE', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, (req) => {
        req.reply({ delay: 2000, statusCode: 204, body: null })
      }).as('deleteSpecialty')

      visitBackoffice('/specialties', mockAuthUser)
      cy.wait('@getSpecialties')
      cy.get(`[data-testid="specialty-delete-button-${MOCK_SPECIALTY_ID}"]`).click()
      cy.get('[data-testid="delete-specialty-dialog-confirm"]').click()
      cy.get('[data-testid="delete-specialty-dialog-confirm"]').should('be.disabled')
      cy.wait('@deleteSpecialty')
    })
  })

  describe('from detail page', () => {
    it('delete button opens dialog on detail page', () => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
        statusCode: 200,
        body: mockSpecialty,
      }).as('getSpecialty')

      visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAuthUser)
      cy.wait('@getSpecialty')
      cy.get('[data-testid="specialty-details-delete-button"]').click()
      cy.get('[data-testid="delete-specialty-dialog"]').should('be.visible')
    })

    it('cancel button closes dialog on detail page', () => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
        statusCode: 200,
        body: mockSpecialty,
      }).as('getSpecialty')

      visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAuthUser)
      cy.wait('@getSpecialty')
      cy.get('[data-testid="specialty-details-delete-button"]').click()
      cy.get('[data-testid="delete-specialty-dialog-cancel"]').click()
      cy.get('[data-testid="delete-specialty-dialog"]').should('not.exist')
      expectBackofficePath(`/specialties/${MOCK_SPECIALTY_ID}`)
    })

    it('confirms deletion from detail page and navigates to /specialties', () => {
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
        body: emptyListResponse,
      })

      visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}`, mockAuthUser)
      cy.wait('@getSpecialty')
      cy.get('[data-testid="specialty-details-delete-button"]').click()
      cy.get('[data-testid="delete-specialty-dialog-confirm"]').click()
      cy.wait('@deleteSpecialty')
      expectBackofficePath('/specialties')
    })
  })

})

export {}
