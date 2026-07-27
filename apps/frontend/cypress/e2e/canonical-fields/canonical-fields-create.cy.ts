import { visitBackoffice, expectBackofficePath } from '../../support/clinic'

const mockAdminUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'platform_admin',
}

const mockCreatedField = {
  id: '22220000-0000-0000-0000-000000000001',
  canonicalKey: 'blood_pressure',
  label: 'Pressão arterial',
  type: 'number',
  options: null,
  unit: 'mmHg',
  specialtyId: null,
  description: null,
  isActive: true,
}

const emptyListResponse: typeof mockCreatedField[] = []

describe('Canonical Fields Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows validation error when canonicalKey has invalid format', () => {
    visitBackoffice('/canonical-fields/new', mockAdminUser)
    cy.get('[data-testid="canonical-field-form-canonical-key"]').type('Invalid Key!')
    cy.get('[data-testid="canonical-field-form-label"]').type('Label')
    cy.get('[data-testid="canonical-field-form-type"]').select('number')
    cy.get('[data-testid="canonical-field-form-submit"]').click()
    cy.contains(/use apenas letras minúsculas/i).should('be.visible')
  })

  it('shows validation error when label is too short', () => {
    visitBackoffice('/canonical-fields/new', mockAdminUser)
    cy.get('[data-testid="canonical-field-form-canonical-key"]').type('weight')
    cy.get('[data-testid="canonical-field-form-label"]').type('P')
    cy.get('[data-testid="canonical-field-form-type"]').select('number')
    cy.get('[data-testid="canonical-field-form-submit"]').click()
    cy.contains('Deve ter no mínimo 2 caracteres').should('be.visible')
  })

  it('shows conflict error when canonicalKey already exists (409)', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/medical-record-canonical-fields`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Field with this key already exists' },
    }).as('createField')

    visitBackoffice('/canonical-fields/new', mockAdminUser)
    cy.get('[data-testid="canonical-field-form-canonical-key"]').type('blood_pressure')
    cy.get('[data-testid="canonical-field-form-label"]').type('Pressão arterial')
    cy.get('[data-testid="canonical-field-form-type"]').select('number')
    cy.get('[data-testid="canonical-field-form-submit"]').click()
    cy.wait('@createField')
    cy.get('[data-testid="canonical-field-form-error"]').should('contain', 'Já existe um campo com esta chave canônica')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/medical-record-canonical-fields`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedField })
    }).as('createField')

    visitBackoffice('/canonical-fields/new', mockAdminUser)
    cy.get('[data-testid="canonical-field-form-canonical-key"]').type('blood_pressure')
    cy.get('[data-testid="canonical-field-form-label"]').type('Pressão arterial')
    cy.get('[data-testid="canonical-field-form-type"]').select('number')
    cy.get('[data-testid="canonical-field-form-submit"]').click()
    cy.get('[data-testid="canonical-field-form-submit"]').should('be.disabled')
    cy.wait('@createField')
  })

  it('back button returns to /canonical-fields without creating', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getFields')

    visitBackoffice('/canonical-fields/new', mockAdminUser)
    cy.get('[data-testid="new-canonical-field-back-button"]').click()
    expectBackofficePath('/canonical-fields')
  })

  it('creates field and redirects to /canonical-fields on success', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/medical-record-canonical-fields`, {
      statusCode: 201,
      body: mockCreatedField,
    }).as('createField')
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [mockCreatedField],
    }).as('getFields')

    visitBackoffice('/canonical-fields/new', mockAdminUser)
    cy.fixture('canonical-fields-admin').then((fixture) => {
      cy.get('[data-testid="canonical-field-form-canonical-key"]').type(fixture.newField.canonicalKey)
      cy.get('[data-testid="canonical-field-form-label"]').type(fixture.newField.label)
      cy.get('[data-testid="canonical-field-form-type"]').select(fixture.newField.type)
    })
    cy.get('[data-testid="canonical-field-form-submit"]').click()
    cy.wait('@createField')
    expectBackofficePath('/canonical-fields')
    cy.wait('@getFields')
    cy.get(`[data-testid="canonical-field-row-${mockCreatedField.id}"]`).should('exist')
  })

  it('shows options editor when SELECT type is chosen', () => {
    visitBackoffice('/canonical-fields/new', mockAdminUser)
    cy.get('[data-testid="canonical-field-form-type"]').select('select')
    cy.get('[data-testid="canonical-field-options-editor"]').should('be.visible')
  })

  it('hides options editor for non-select types', () => {
    visitBackoffice('/canonical-fields/new', mockAdminUser)
    cy.get('[data-testid="canonical-field-form-type"]').select('number')
    cy.get('[data-testid="canonical-field-options-editor"]').should('not.exist')
  })

  it('shows a validation error when submitting a SELECT field with no options', () => {
    visitBackoffice('/canonical-fields/new', mockAdminUser)
    cy.get('[data-testid="canonical-field-form-canonical-key"]').type('risk_level')
    cy.get('[data-testid="canonical-field-form-label"]').type('Nível de risco')
    cy.get('[data-testid="canonical-field-form-type"]').select('select')
    cy.get('[data-testid="canonical-field-options-empty"]').should('be.visible')

    cy.get('[data-testid="canonical-field-form-submit"]').click()
    cy.get('[data-testid="canonical-field-options-error"]').should('be.visible')
  })

  it('adds an option to a SELECT field and creates it', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getFields')
    visitBackoffice('/canonical-fields/new', mockAdminUser)
    cy.get('[data-testid="canonical-field-form-canonical-key"]').type('risk_level')
    cy.get('[data-testid="canonical-field-form-label"]').type('Nível de risco')
    cy.get('[data-testid="canonical-field-form-type"]').select('select')

    cy.get('[data-testid="canonical-field-options-add"]').click()
    cy.get('[data-testid="canonical-field-options-empty"]').should('not.exist')
    cy.get('[data-testid="canonical-field-option-value-0"]').type('low')
    cy.get('[data-testid="canonical-field-option-label-0"]').type('Baixo')

    cy.intercept('POST', `${Cypress.env('API_URL')}/medical-record-canonical-fields`, {
      statusCode: 201,
      body: { ...mockCreatedField, type: 'select', options: [{ value: 'low', label: 'Baixo' }] },
    }).as('createField')
    cy.get('[data-testid="canonical-field-form-submit"]').click()
    cy.wait('@createField').its('request.body.options').should('deep.equal', [{ value: 'low', label: 'Baixo' }])
  })
})

export {}
