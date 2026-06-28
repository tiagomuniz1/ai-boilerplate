import { visitBackoffice, expectBackofficePath } from '../../support/clinic'

const MOCK_MEDICATION_ID = '33330000-0000-0000-0000-000000000001'

const mockAdminUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'platform_admin',
}

const mockCreatedMedication = {
  id: MOCK_MEDICATION_ID,
  name: 'Dipirona Sódica 500mg',
  activeIngredient: 'dipirona sódica',
  regulatoryCategory: null,
  therapeuticClass: 'Analgésicos',
  holderCompany: null,
  registrationNumber: null,
  registrationStatus: null,
  source: 'manual',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
}

const emptyPage = { data: [], total: 0, page: 1, limit: 20 }

describe('Medications Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows a validation error when the name is too short', () => {
    visitBackoffice('/medications/new', mockAdminUser)
    cy.get('[data-testid="medication-form-name"]').type('A')
    cy.get('[data-testid="medication-form-submit"]').click()
    cy.contains('Deve ter no mínimo 2 caracteres').should('be.visible')
  })

  it('shows a generic error when the API fails', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/medications`, {
      statusCode: 500,
      body: { status: 500, title: 'Internal Server Error' },
    }).as('createMedication')

    visitBackoffice('/medications/new', mockAdminUser)
    cy.get('[data-testid="medication-form-name"]').type('Dipirona Sódica')
    cy.get('[data-testid="medication-form-submit"]').click()
    cy.wait('@createMedication')
    cy.get('[data-testid="medication-form-error"]').should('contain', 'Não foi possível criar o medicamento')
  })

  it('disables the submit button while the request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/medications`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedMedication })
    }).as('createMedication')

    visitBackoffice('/medications/new', mockAdminUser)
    cy.get('[data-testid="medication-form-name"]').type('Dipirona Sódica')
    cy.get('[data-testid="medication-form-submit"]').click()
    cy.get('[data-testid="medication-form-submit"]').should('be.disabled')
    cy.wait('@createMedication')
  })

  it('returns to the list via the back button without creating', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: emptyPage,
    }).as('getMedications')

    visitBackoffice('/medications/new', mockAdminUser)
    cy.get('[data-testid="new-medication-back-button"]').click()
    expectBackofficePath('/medications')
  })

  it('creates a medication and redirects to the list on success', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/medications`, {
      statusCode: 201,
      body: mockCreatedMedication,
    }).as('createMedication')
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: { data: [mockCreatedMedication], total: 1, page: 1, limit: 20 },
    }).as('getMedications')

    visitBackoffice('/medications/new', mockAdminUser)
    cy.fixture('medications').then((fixture) => {
      cy.get('[data-testid="medication-form-name"]').type(fixture.newMedication.name)
      cy.get('[data-testid="medication-form-active-ingredient"]').type(fixture.newMedication.activeIngredient)
      cy.get('[data-testid="medication-form-therapeutic-class"]').type(fixture.newMedication.therapeuticClass)
    })
    cy.get('[data-testid="medication-form-submit"]').click()
    cy.wait('@createMedication')
    expectBackofficePath('/medications')
    cy.wait('@getMedications')
    cy.get(`[data-testid="medication-row-${mockCreatedMedication.id}"]`).should('exist')
  })
})

export {}
