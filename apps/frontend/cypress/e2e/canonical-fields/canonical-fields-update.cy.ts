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

describe('Canonical Fields Update', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()

    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields/${MOCK_FIELD_ID}`, {
      statusCode: 200,
      body: mockField,
    }).as('getField')
  })

  it('shows loading skeleton while fetching field', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields/${MOCK_FIELD_ID}`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: mockField })
    }).as('getFieldSlow')

    visitBackoffice(`/canonical-fields/${MOCK_FIELD_ID}/edit`, mockAdminUser)
    cy.get('[data-testid="edit-canonical-field-skeleton"]').should('be.visible')
    cy.wait('@getFieldSlow')
    cy.get('[data-testid="edit-canonical-field-skeleton"]').should('not.exist')
  })

  it('shows error state when field not found', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields/${MOCK_FIELD_ID}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found' },
    }).as('getFieldNotFound')

    visitBackoffice(`/canonical-fields/${MOCK_FIELD_ID}/edit`, mockAdminUser)
    cy.wait('@getFieldNotFound')
    cy.get('[data-testid="edit-canonical-field-load-error"]').should('be.visible')
  })

  it('pre-fills form with existing field data', () => {
    visitBackoffice(`/canonical-fields/${MOCK_FIELD_ID}/edit`, mockAdminUser)
    cy.wait('@getField')

    cy.get('[data-testid="canonical-field-form-canonical-key-readonly"]').should('contain', 'blood_pressure')
    cy.get('[data-testid="canonical-field-form-label"]').should('have.value', 'Pressão arterial')
    cy.get('[data-testid="canonical-field-form-unit"]').should('have.value', 'mmHg')
  })

  it('canonicalKey is readonly in edit mode', () => {
    visitBackoffice(`/canonical-fields/${MOCK_FIELD_ID}/edit`, mockAdminUser)
    cy.wait('@getField')

    cy.get('[data-testid="canonical-field-form-canonical-key-readonly"]').should('exist')
    cy.get('[data-testid="canonical-field-form-canonical-key"]').should('not.exist')
  })

  it('shows validation error when label is too short', () => {
    visitBackoffice(`/canonical-fields/${MOCK_FIELD_ID}/edit`, mockAdminUser)
    cy.wait('@getField')

    cy.get('[data-testid="canonical-field-form-label"]').clear().type('P')
    cy.get('[data-testid="canonical-field-form-submit"]').click()
    cy.contains('Deve ter no mínimo 2 caracteres').should('be.visible')
  })

  it('updates field and stays on page on success', () => {
    const updatedField = { ...mockField, label: 'Pressão arterial (atualizada)' }
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/medical-record-canonical-fields/${MOCK_FIELD_ID}`, {
      statusCode: 200,
      body: updatedField,
    }).as('updateField')

    visitBackoffice(`/canonical-fields/${MOCK_FIELD_ID}/edit`, mockAdminUser)
    cy.wait('@getField')

    cy.fixture('canonical-fields-admin').then((fixture) => {
      cy.get('[data-testid="canonical-field-form-label"]').clear().type(fixture.updatedField.label)
    })
    cy.get('[data-testid="canonical-field-form-submit"]').click()
    cy.wait('@updateField')
    cy.get('[data-testid="edit-canonical-field-page"]').should('exist')
  })

  it('shows global error on 404 during update', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/medical-record-canonical-fields/${MOCK_FIELD_ID}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found' },
    }).as('updateField')

    visitBackoffice(`/canonical-fields/${MOCK_FIELD_ID}/edit`, mockAdminUser)
    cy.wait('@getField')

    cy.get('[data-testid="canonical-field-form-submit"]').click()
    cy.wait('@updateField')
    cy.get('[data-testid="canonical-field-form-error"]').should('contain', 'Campo não encontrado')
  })

  it('back button returns to /canonical-fields', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [mockField],
    }).as('getFields')

    visitBackoffice(`/canonical-fields/${MOCK_FIELD_ID}/edit`, mockAdminUser)
    cy.wait('@getField')

    cy.get('[data-testid="edit-canonical-field-back-button"]').click()
    expectBackofficePath('/canonical-fields')
  })

  it('disables submit button while updating', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/medical-record-canonical-fields/${MOCK_FIELD_ID}`, (req) => {
      req.reply({ delay: 2000, statusCode: 200, body: mockField })
    }).as('updateFieldSlow')

    visitBackoffice(`/canonical-fields/${MOCK_FIELD_ID}/edit`, mockAdminUser)
    cy.wait('@getField')

    cy.get('[data-testid="canonical-field-form-submit"]').click()
    cy.get('[data-testid="canonical-field-form-submit"]').should('be.disabled')
    cy.wait('@updateFieldSlow')
  })
})

export {}
