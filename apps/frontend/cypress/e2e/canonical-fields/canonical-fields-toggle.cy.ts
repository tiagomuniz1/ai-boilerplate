import { visitBackoffice } from '../../support/clinic'

const MOCK_FIELD_ID = '22220000-0000-0000-0000-000000000001'

const mockAdminUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'platform_admin',
}

const mockActiveField = {
  id: MOCK_FIELD_ID,
  canonicalKey: 'blood_pressure',
  label: 'Pressão arterial',
  type: 'number',
  options: null,
  unit: null,
  specialtyId: null,
  description: null,
  isActive: true,
}

const mockInactiveField = { ...mockActiveField, isActive: false }

describe('Canonical Fields Toggle', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('opens toggle dialog when "Desativar" button is clicked', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [mockActiveField],
    }).as('getFields')

    visitBackoffice('/canonical-fields', mockAdminUser)
    cy.wait('@getFields')

    cy.get(`[data-testid="canonical-field-toggle-button-${MOCK_FIELD_ID}"]`).click()
    cy.get('[data-testid="canonical-field-toggle-dialog-confirm"]').should('be.visible')
    cy.contains('Desativar campo').should('be.visible')
  })

  it('opens toggle dialog with "Ativar campo" title for inactive field', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [{ ...mockAdminUser, ...mockInactiveField }],
    }).as('getFields')

    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [mockInactiveField],
    }).as('getFieldsInactive')

    visitBackoffice('/canonical-fields', mockAdminUser)

    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [mockInactiveField],
    }).as('getFieldsInactive2')
    cy.get('[data-testid="canonical-field-list-include-inactive"]').check()
    cy.wait('@getFieldsInactive2')

    cy.get(`[data-testid="canonical-field-toggle-button-${MOCK_FIELD_ID}"]`).click()
    cy.contains('Ativar campo').should('be.visible')
  })

  it('closes dialog when cancel is clicked', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [mockActiveField],
    }).as('getFields')

    visitBackoffice('/canonical-fields', mockAdminUser)
    cy.wait('@getFields')

    cy.get(`[data-testid="canonical-field-toggle-button-${MOCK_FIELD_ID}"]`).click()
    cy.get('[data-testid="canonical-field-toggle-dialog-cancel"]').click()
    cy.get('[data-testid="canonical-field-toggle-dialog-confirm"]').should('not.exist')
  })

  it('deactivates field and shows success message', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [mockActiveField],
    }).as('getFields')

    cy.intercept('PATCH', `${Cypress.env('API_URL')}/medical-record-canonical-fields/${MOCK_FIELD_ID}`, {
      statusCode: 200,
      body: mockInactiveField,
    }).as('updateField')

    visitBackoffice('/canonical-fields', mockAdminUser)
    cy.wait('@getFields')

    cy.get(`[data-testid="canonical-field-toggle-button-${MOCK_FIELD_ID}"]`).click()
    cy.get('[data-testid="canonical-field-toggle-dialog-confirm"]').click()
    cy.wait('@updateField')

    cy.get('[data-testid="canonical-field-list-success"]').should('be.visible')
    cy.get('[data-testid="canonical-field-toggle-dialog-confirm"]').should('not.exist')
  })

  it('shows error message when toggle fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [mockActiveField],
    }).as('getFields')

    cy.intercept('PATCH', `${Cypress.env('API_URL')}/medical-record-canonical-fields/${MOCK_FIELD_ID}`, {
      statusCode: 500,
      body: { status: 500, title: 'Internal Server Error' },
    }).as('updateField')

    visitBackoffice('/canonical-fields', mockAdminUser)
    cy.wait('@getFields')

    cy.get(`[data-testid="canonical-field-toggle-button-${MOCK_FIELD_ID}"]`).click()
    cy.get('[data-testid="canonical-field-toggle-dialog-confirm"]').click()
    cy.wait('@updateField')

    cy.get('[data-testid="canonical-field-list-toggle-error"]').should('be.visible')
    cy.get('[data-testid="canonical-field-toggle-dialog-confirm"]').should('not.exist')
  })

  it('disables confirm button while PATCH is in flight', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [mockActiveField],
    }).as('getFields')

    cy.intercept('PATCH', `${Cypress.env('API_URL')}/medical-record-canonical-fields/${MOCK_FIELD_ID}`, (req) => {
      req.reply({ delay: 2000, statusCode: 200, body: mockInactiveField })
    }).as('updateFieldSlow')

    visitBackoffice('/canonical-fields', mockAdminUser)
    cy.wait('@getFields')

    cy.get(`[data-testid="canonical-field-toggle-button-${MOCK_FIELD_ID}"]`).click()
    cy.get('[data-testid="canonical-field-toggle-dialog-confirm"]').click()
    cy.get('[data-testid="canonical-field-toggle-dialog-confirm"]').should('be.disabled')
    cy.wait('@updateFieldSlow')
  })
})

export {}
