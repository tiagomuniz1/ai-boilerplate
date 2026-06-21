import { visitBackoffice, expectBackofficePath } from '../../support/clinic'

const MOCK_FIELD_ID = '22220000-0000-0000-0000-000000000001'

const mockAdminUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'platform_admin',
}

const mockField = {
  id: MOCK_FIELD_ID,
  canonicalKey: 'blood_pressure',
  label: 'Pressão arterial',
  type: 'number',
  options: null,
  unit: 'mmHg',
  specialtyId: null,
  description: null,
  isActive: true,
}

const emptyListResponse: typeof mockField[] = []
const populatedListResponse = [mockField]

describe('Canonical Fields List', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit('/backoffice/canonical-fields')
    expectBackofficePath('/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: populatedListResponse })
    }).as('getFields')

    visitBackoffice('/canonical-fields', mockAdminUser)
    cy.get('[data-testid="canonical-field-list-skeleton"]').should('be.visible')
    cy.wait('@getFields')
    cy.get('[data-testid="canonical-field-list-skeleton"]').should('not.exist')
  })

  it('shows empty state when no fields exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getFields')

    visitBackoffice('/canonical-fields', mockAdminUser)
    cy.wait('@getFields')
    cy.get('[data-testid="canonical-field-list-empty"]').should('be.visible')
    cy.get('[data-testid="canonical-field-list-table"]').should('not.exist')
  })

  it('shows error state when API fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getFields')

    visitBackoffice('/canonical-fields', mockAdminUser)
    cy.wait('@getFields')
    cy.get('[data-testid="canonical-field-list-error"]').should('be.visible')
    cy.get('[data-testid="canonical-field-list-table"]').should('not.exist')
  })

  it('shows field rows with key, label, type and status', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getFields')

    visitBackoffice('/canonical-fields', mockAdminUser)
    cy.wait('@getFields')

    cy.get('[data-testid="canonical-field-list-table"]').should('be.visible')
    cy.get(`[data-testid="canonical-field-row-${MOCK_FIELD_ID}"]`).should('exist')
    cy.get(`[data-testid="canonical-field-key-${MOCK_FIELD_ID}"]`).should('contain', 'blood_pressure')
    cy.get(`[data-testid="canonical-field-label-${MOCK_FIELD_ID}"]`).should('contain', 'Pressão arterial')
    cy.get(`[data-testid="canonical-field-type-${MOCK_FIELD_ID}"]`).should('contain', 'Número')
    cy.get(`[data-testid="canonical-field-status-${MOCK_FIELD_ID}"]`).should('contain', 'Ativo')
  })

  it('shows "Inativo" status for inactive field', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [{ ...mockField, isActive: false }],
    }).as('getFields')

    visitBackoffice('/canonical-fields', mockAdminUser)
    cy.wait('@getFields')
    cy.get(`[data-testid="canonical-field-status-${MOCK_FIELD_ID}"]`).should('contain', 'Inativo')
  })

  it('shows "Novo campo" button that links to /canonical-fields/new', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getFields')

    visitBackoffice('/canonical-fields', mockAdminUser)
    cy.wait('@getFields')
    cy.get('[data-testid="canonical-field-list-new-button"]').should('be.visible').click()
    expectBackofficePath('/canonical-fields/new')
  })

  it('shows edit link for each field', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getFields')

    visitBackoffice('/canonical-fields', mockAdminUser)
    cy.wait('@getFields')
    cy.get(`[data-testid="canonical-field-edit-link-${MOCK_FIELD_ID}"]`).should('exist')
  })

  it('shows include-inactive checkbox', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getFields')

    visitBackoffice('/canonical-fields', mockAdminUser)
    cy.wait('@getFields')
    cy.get('[data-testid="canonical-field-list-include-inactive"]').should('exist')
  })

  it('sends includeInactive param when checkbox is checked', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getFields')

    visitBackoffice('/canonical-fields', mockAdminUser)
    cy.wait('@getFields')

    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getFieldsWithInactive')

    cy.get('[data-testid="canonical-field-list-include-inactive"]').check()
    cy.wait('@getFieldsWithInactive').its('request.url').should('include', 'includeInactive=true')
  })
})

export {}
