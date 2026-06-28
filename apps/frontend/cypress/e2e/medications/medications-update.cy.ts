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
  source: 'anvisa',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
}

describe('Medications Update', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows the load error state when the medication cannot be fetched', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications/${MOCK_MEDICATION_ID}`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getMedication')

    visitBackoffice(`/medications/${MOCK_MEDICATION_ID}/edit`, mockAdminUser)
    cy.wait('@getMedication')
    cy.get('[data-testid="edit-medication-load-error"]').should('be.visible')
  })

  it('populates the form and shows the source as readonly', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications/${MOCK_MEDICATION_ID}`, {
      statusCode: 200,
      body: mockMedication,
    }).as('getMedication')

    visitBackoffice(`/medications/${MOCK_MEDICATION_ID}/edit`, mockAdminUser)
    cy.wait('@getMedication')

    cy.get('[data-testid="medication-form-name"]').should('have.value', 'Dipirona Sódica')
    cy.get('[data-testid="medication-form-source-readonly"]').should('contain', 'ANVISA')
    cy.get('[data-testid="medication-form-is-active"]').should('be.checked')
  })

  it('updates the medication and shows a success message', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications/${MOCK_MEDICATION_ID}`, {
      statusCode: 200,
      body: mockMedication,
    }).as('getMedication')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/medications/${MOCK_MEDICATION_ID}`, {
      statusCode: 200,
      body: { ...mockMedication, name: 'Dipirona Sódica 1g' },
    }).as('updateMedication')

    visitBackoffice(`/medications/${MOCK_MEDICATION_ID}/edit`, mockAdminUser)
    cy.wait('@getMedication')

    cy.get('[data-testid="medication-form-name"]').clear().type('Dipirona Sódica 1g')
    cy.get('[data-testid="medication-form-submit"]').click()
    cy.wait('@updateMedication')
    cy.get('[data-testid="edit-medication-success"]').should('be.visible')
  })
})

export {}
