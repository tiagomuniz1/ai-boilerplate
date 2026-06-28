import { visitBackoffice } from '../../support/clinic'

const MOCK_MEDICATION_ID = '33330000-0000-0000-0000-000000000001'

const mockAdminUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'platform_admin',
}

const mockMedication = {
  id: MOCK_MEDICATION_ID,
  name: 'Dipirona Sódica',
  activeIngredient: 'dipirona sódica',
  regulatoryCategory: 'Genérico',
  therapeuticClass: 'ANALGESICOS',
  holderCompany: 'ACME',
  registrationNumber: '123',
  registrationStatus: 'Ativo',
  source: 'manual',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
}

const populatedPage = { data: [mockMedication], total: 1, page: 1, limit: 20 }
const emptyPage = { data: [], total: 0, page: 1, limit: 20 }

describe('Medications Delete', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('cancels the deletion and keeps the medication in the list', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: populatedPage,
    }).as('getMedications')

    visitBackoffice('/medications', mockAdminUser)
    cy.wait('@getMedications')

    cy.get(`[data-testid="medication-delete-button-${MOCK_MEDICATION_ID}"]`).click()
    cy.get('[data-testid="medication-delete-dialog"]').should('be.visible')
    cy.get('[data-testid="medication-delete-dialog-cancel"]').click()
    cy.get('[data-testid="medication-delete-dialog"]').should('not.exist')
    cy.get(`[data-testid="medication-row-${MOCK_MEDICATION_ID}"]`).should('exist')
  })

  it('deletes the medication after confirmation', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: populatedPage,
    }).as('getMedications')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/medications/${MOCK_MEDICATION_ID}`, {
      statusCode: 204,
    }).as('deleteMedication')

    visitBackoffice('/medications', mockAdminUser)
    cy.wait('@getMedications')

    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: emptyPage,
    }).as('getMedicationsAfter')

    cy.get(`[data-testid="medication-delete-button-${MOCK_MEDICATION_ID}"]`).click()
    cy.get('[data-testid="medication-delete-dialog-confirm"]').click()
    cy.wait('@deleteMedication')
    cy.get('[data-testid="medication-list-success"]').should('be.visible')
    cy.wait('@getMedicationsAfter')
    cy.get('[data-testid="medication-list-empty"]').should('be.visible')
  })

  it('shows an error message when deletion fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: populatedPage,
    }).as('getMedications')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/medications/${MOCK_MEDICATION_ID}`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('deleteMedication')

    visitBackoffice('/medications', mockAdminUser)
    cy.wait('@getMedications')

    cy.get(`[data-testid="medication-delete-button-${MOCK_MEDICATION_ID}"]`).click()
    cy.get('[data-testid="medication-delete-dialog-confirm"]').click()
    cy.wait('@deleteMedication')
    cy.get('[data-testid="medication-list-action-error"]').should('be.visible')
  })
})

export {}
