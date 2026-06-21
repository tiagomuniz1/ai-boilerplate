import { visitClinic, expectClinicPath, CLINIC_ID } from '../../support/clinic'

const mockAdmin = {
  id: 'mock-user-id',
  fullName: 'Admin User',
  email: 'admin@clinic.com',
  role: 'admin',
  clinicId: CLINIC_ID,
}

const mockTemplate = {
  id: 'uuid-template-new',
  specialtyId: 'uuid-spec-1',
  specialtyName: 'Cardiologia',
  name: 'Nova Anamnese',
  fields: [],
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const mockCanonicalFields = [
  {
    id: 'cf-uuid-1',
    canonicalKey: 'blood_pressure',
    label: 'Pressão arterial',
    type: 'number',
    options: null,
    unit: 'mmHg',
    specialtyId: null,
    description: null,
    isActive: true,
  },
]

describe('Medical Record Templates Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [],
    }).as('getCanonicalFields')
  })

  it('back button navigates to list', () => {
    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.get('[data-testid="new-template-back-button"]').click()
    expectClinicPath('/medical-record-templates')
  })

  it('shows validation error when name is empty', () => {
    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.get('[data-testid="template-form-submit"]').click()
    cy.contains('Mínimo 2 caracteres').should('be.visible')
  })

  it('shows fields-required error when no fields added', () => {
    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.get('[data-testid="template-form-name"]').type('Anamnese')
    cy.get('[data-testid="template-form-submit"]').click()
    cy.get('[data-testid="template-form-fields-error"]').should('be.visible')
  })

  it('submit button is disabled while pending', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/medical-record-templates`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockTemplate })
    }).as('createTemplate')

    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.get('[data-testid="template-form-name"]').type('Nova Anamnese')
    cy.get('[data-testid="template-form-add-field"]').click()
    cy.get('[data-testid="field-editor-label-0"]').type('Sintoma')
    cy.get('[data-testid="template-form-submit"]').click()

    cy.get('[data-testid="template-form-submit"]').should('be.disabled')
  })

  it('adds and removes field editors', () => {
    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.get('[data-testid="template-form-fields-empty"]').should('be.visible')

    cy.get('[data-testid="template-form-add-field"]').click()
    cy.get('[data-testid="field-editor-0"]').should('be.visible')

    cy.get('[data-testid="field-editor-remove-0"]').click()
    cy.get('[data-testid="template-form-fields-empty"]').should('be.visible')
  })

  it('shows options panel for SELECT field type', () => {
    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.get('[data-testid="template-form-add-field"]').click()
    cy.get('[data-testid="field-editor-type-0"]').select('select')
    cy.get('[data-testid="field-editor-options-0"]').should('be.visible')
  })

  it('shows error when SELECT field has no options on submit', () => {
    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.get('[data-testid="template-form-name"]').type('Anamnese')
    cy.get('[data-testid="template-form-add-field"]').click()
    cy.get('[data-testid="field-editor-label-0"]').type('Diagnóstico')
    cy.get('[data-testid="field-editor-type-0"]').select('select')
    cy.get('[data-testid="template-form-submit"]').click()

    cy.get('[data-testid="field-editor-options-error-0"]').should('be.visible')
  })

  it('shows global error on 409 conflict', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/medical-record-templates`, {
      statusCode: 409,
      body: { title: 'Conflict' },
    }).as('createTemplate')

    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.get('[data-testid="template-form-name"]').type('Anamnese')
    cy.get('[data-testid="template-form-add-field"]').click()
    cy.get('[data-testid="field-editor-label-0"]').type('Sintoma')
    cy.get('[data-testid="template-form-submit"]').click()

    cy.wait('@createTemplate')
    cy.get('[data-testid="template-form-global-error"]').should('be.visible')
  })

  it('redirects to list on successful creation', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/medical-record-templates`, {
      statusCode: 201,
      body: mockTemplate,
    }).as('createTemplate')
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: { data: [mockTemplate], total: 1, page: 1, limit: 20 },
    }).as('getTemplates')

    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.get('[data-testid="template-form-name"]').type('Nova Anamnese')
    cy.get('[data-testid="template-form-add-field"]').click()
    cy.get('[data-testid="field-editor-label-0"]').type('Sintoma')
    cy.get('[data-testid="template-form-submit"]').click()

    cy.wait('@createTemplate')
    expectClinicPath('/medical-record-templates')
  })

  it('loads and shows canonical fields for adoption', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: mockCanonicalFields,
    }).as('getCanonicalFields')

    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.wait('@getCanonicalFields')
    cy.get('[data-testid="canonical-field-picker-adopt-cf-uuid-1"]').should('be.visible')
  })

  it('adopts canonical field and pre-fills the field editor', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: mockCanonicalFields,
    }).as('getCanonicalFields')

    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.wait('@getCanonicalFields')
    cy.get('[data-testid="canonical-field-picker-adopt-cf-uuid-1"]').click()

    cy.get('[data-testid="field-editor-0"]').should('be.visible')
    cy.get('[data-testid="field-editor-label-0"]').should('have.value', 'Pressão arterial')
  })
})
