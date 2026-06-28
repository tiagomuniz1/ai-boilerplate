import { visitBackoffice, expectBackofficePath } from '../../support/clinic'

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

const emptyPage = { data: [], total: 0, page: 1, limit: 20 }
const populatedPage = { data: [mockMedication], total: 1, page: 1, limit: 20 }

describe('Medications List', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit('/backoffice/medications')
    expectBackofficePath('/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: populatedPage })
    }).as('getMedications')

    visitBackoffice('/medications', mockAdminUser)
    cy.get('[data-testid="medication-list-skeleton"]').should('be.visible')
    cy.wait('@getMedications')
    cy.get('[data-testid="medication-list-skeleton"]').should('not.exist')
  })

  it('shows empty state when no medications exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: emptyPage,
    }).as('getMedications')

    visitBackoffice('/medications', mockAdminUser)
    cy.wait('@getMedications')
    cy.get('[data-testid="medication-list-empty"]').should('be.visible')
    cy.get('[data-testid="medication-list-table"]').should('not.exist')
  })

  it('shows error state when API fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getMedications')

    visitBackoffice('/medications', mockAdminUser)
    cy.wait('@getMedications')
    cy.get('[data-testid="medication-list-error"]').should('be.visible')
    cy.get('[data-testid="medication-list-table"]').should('not.exist')
  })

  it('shows medication rows with name, source and status', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: populatedPage,
    }).as('getMedications')

    visitBackoffice('/medications', mockAdminUser)
    cy.wait('@getMedications')

    cy.get('[data-testid="medication-list-table"]').should('be.visible')
    cy.get(`[data-testid="medication-row-${MOCK_MEDICATION_ID}"]`).should('exist')
    cy.get(`[data-testid="medication-name-${MOCK_MEDICATION_ID}"]`).should('contain', 'Dipirona Sódica')
    cy.get(`[data-testid="medication-source-${MOCK_MEDICATION_ID}"]`).should('contain', 'ANVISA')
    cy.get(`[data-testid="medication-status-${MOCK_MEDICATION_ID}"]`).should('contain', 'Ativo')
  })

  it('navigates to the create page from the "Novo medicamento" button', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: emptyPage,
    }).as('getMedications')

    visitBackoffice('/medications', mockAdminUser)
    cy.wait('@getMedications')
    cy.get('[data-testid="medication-list-new-button"]').should('be.visible').click()
    expectBackofficePath('/medications/new')
  })

  it('forwards the search term to the API', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: populatedPage,
    }).as('getMedications')

    visitBackoffice('/medications', mockAdminUser)
    cy.wait('@getMedications')

    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: populatedPage,
    }).as('searchMedications')

    cy.get('[data-testid="medication-list-search"]').type('dipi')
    cy.wait('@searchMedications').its('request.url').should('include', 'search=dipi')
  })

  it('sends includeInactive when the toggle is checked', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: populatedPage,
    }).as('getMedications')

    visitBackoffice('/medications', mockAdminUser)
    cy.wait('@getMedications')

    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: populatedPage,
    }).as('getInactive')

    cy.get('[data-testid="medication-list-include-inactive"]').check()
    cy.wait('@getInactive').its('request.url').should('include', 'includeInactive=true')
  })
})

export {}
