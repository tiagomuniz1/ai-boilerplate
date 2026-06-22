import { visitClinic, expectClinicPath, CLINIC_ID } from '../../support/clinic'

const MOCK_TEMPLATE_ID = 'uuid-template-1'

const mockAdmin = {
  id: 'mock-user-id',
  fullName: 'Admin User',
  email: 'admin@clinic.com',
  role: 'admin',
  clinicId: CLINIC_ID,
}

const mockTemplate = {
  id: MOCK_TEMPLATE_ID,
  specialtyId: 'uuid-spec-1',
  specialtyName: 'Cardiologia',
  name: 'Anamnese Cardíaca',
  fields: [
    {
      key: 'field_k1',
      label: 'Sintoma principal',
      type: 'text',
      required: true,
      order: 0,
      options: null,
      placeholder: null,
      helpText: null,
      canonical: false,
      canonicalKey: null,
    },
  ],
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

describe('Medical Record Templates Update', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [],
    }).as('getCanonicalFields')
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 100 },
    }).as('getSpecialties')
  })

  it('shows skeleton during template load', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: mockTemplate })
    }).as('getTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}/edit`, mockAdmin)
    cy.get('[data-testid="template-list-skeleton"]').should('be.visible')
    cy.wait('@getTemplate')
    cy.get('[data-testid="template-list-skeleton"]').should('not.exist')
  })

  it('shows error state when template load fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 404,
      body: { title: 'Not Found' },
    }).as('getTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}/edit`, mockAdmin)
    cy.wait('@getTemplate')
    cy.get('[data-testid="edit-template-load-error"]').should('be.visible')
  })

  it('pre-fills form with existing template data', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}/edit`, mockAdmin)
    cy.wait('@getTemplate')

    cy.get('[data-testid="template-form-name"]').should('have.value', 'Anamnese Cardíaca')
    cy.get('[data-testid="field-editor-0"]').should('be.visible')
    cy.get('[data-testid="field-editor-label-0"]').should('have.value', 'Sintoma principal')
  })

  it('back button navigates to template details', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}/edit`, mockAdmin)
    cy.wait('@getTemplate')
    cy.get('[data-testid="edit-template-back-button"]').click()
    expectClinicPath(`/medical-record-templates/${MOCK_TEMPLATE_ID}`)
  })

  it('shows validation error on empty name submit', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}/edit`, mockAdmin)
    cy.wait('@getTemplate')

    cy.get('[data-testid="template-form-name"]').clear()
    cy.get('[data-testid="template-form-submit"]').click()
    cy.contains('Mínimo 2 caracteres').should('be.visible')
  })

  it('shows global error on 409 conflict', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 409,
      body: { title: 'Conflict' },
    }).as('updateTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}/edit`, mockAdmin)
    cy.wait('@getTemplate')
    cy.get('[data-testid="template-form-submit"]').click()
    cy.wait('@updateTemplate')
    cy.get('[data-testid="template-form-global-error"]').should('be.visible')
  })

  it('redirects to details on successful save', () => {
    const updated = { ...mockTemplate, name: 'Anamnese Cardíaca Atualizada' }
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: updated,
    }).as('updateTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}/edit`, mockAdmin)
    cy.wait('@getTemplate')
    cy.get('[data-testid="template-form-name"]').clear().type('Anamnese Cardíaca Atualizada')
    cy.get('[data-testid="template-form-submit"]').click()
    cy.wait('@updateTemplate')
    expectClinicPath(`/medical-record-templates/${MOCK_TEMPLATE_ID}`)
  })

  it('disables submit button while saving', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, (req) => {
      req.reply({ delay: 2000, statusCode: 200, body: mockTemplate })
    }).as('updateTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}/edit`, mockAdmin)
    cy.wait('@getTemplate')
    cy.get('[data-testid="template-form-submit"]').click()
    cy.get('[data-testid="template-form-submit"]').should('be.disabled')
  })
})
