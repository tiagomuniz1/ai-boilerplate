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
  sections: [],
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

const mockSpecialties = {
  data: [{ id: 'uuid-spec-1', name: 'Cardiologia', description: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }],
  total: 1,
  page: 1,
  limit: 100,
}

describe('Medical Record Templates Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    // ADMIN sem ficha: o formulário pergunta "eu exerço?" e a resposta é não.
    // Sem stub a chamada bate no backend real com token mock e vira 401.
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, { statusCode: 200, body: null })
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [],
    }).as('getCanonicalFields')
    // O formulário lê as especialidades VINCULADAS À CLÍNICA, não o catálogo
    // da plataforma.
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/*/specialties*`, {
      statusCode: 200,
      body: {
        ...mockSpecialties,
        data: mockSpecialties.data.map((s) => ({
          id: `link-${s.id}`,
          clinicId: CLINIC_ID,
          specialtyId: s.id,
          name: s.name,
          description: s.description ?? null,
          linkedAt: '2024-01-01T00:00:00.000Z',
        })),
      },
    }).as('getSpecialties')
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
    cy.wait('@getSpecialties')
    cy.get('[data-testid="template-form-name"]').type('Nova Anamnese')
    cy.get('[data-testid="template-form-specialty"]').select('uuid-spec-1')
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
    cy.wait('@getSpecialties')
    cy.get('[data-testid="template-form-name"]').type('Anamnese')
    cy.get('[data-testid="template-form-specialty"]').select('uuid-spec-1')
    cy.get('[data-testid="template-form-add-field"]').click()
    cy.get('[data-testid="field-editor-label-0"]').type('Sintoma')
    cy.get('[data-testid="template-form-submit"]').click()

    cy.wait('@createTemplate')
    // The rule is one template per specialty, never per name — a message about
    // the name sends the user off renaming, which cannot clear the conflict.
    cy.get('[data-testid="template-form-global-error"]')
      .should('be.visible')
      .and('contain', 'já tem um modelo para esta especialidade')
  })

  it('names the profession, not the specialty, when the conflicting template is the generalist one', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/medical-record-templates`, {
      statusCode: 409,
      body: { title: 'Conflict' },
    }).as('createTemplate')

    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.wait('@getSpecialties')
    cy.get('[data-testid="template-form-name"]').type('Generalista')
    cy.get('[data-testid="template-form-add-field"]').click()
    cy.get('[data-testid="field-editor-label-0"]').type('Sintoma')
    cy.get('[data-testid="template-form-submit"]').click()

    cy.wait('@createTemplate')
    cy.get('[data-testid="template-form-global-error"]')
      .should('be.visible')
      .and('contain', 'modelo generalista para esta profissão')
  })

  // Real-backend happy path lives in medical-record-templates-happy-path-real.cy.ts.

  it('loads and shows canonical fields for adoption', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: mockCanonicalFields,
    }).as('getCanonicalFields')

    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.wait('@getCanonicalFields')
    cy.get('[data-testid="canonical-field-picker-adopt-cf-uuid-1"]').should('be.visible')
  })

  it('shows a loading state, then an empty state when there are no canonical fields', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [],
      delay: 500,
    }).as('getCanonicalFieldsSlow')

    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.get('[data-testid="canonical-field-picker-loading"]').should('be.visible')
    cy.wait('@getCanonicalFieldsSlow')
    cy.get('[data-testid="canonical-field-picker-loading"]').should('not.exist')
    cy.get('[data-testid="canonical-field-picker-empty"]').should('be.visible')
  })

  it('shows an error state when canonical fields fail to load', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('getCanonicalFieldsError')

    visitClinic('/medical-record-templates/new', mockAdmin)
    cy.wait('@getCanonicalFieldsError')
    cy.get('[data-testid="canonical-field-picker-error"]').should('be.visible')
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
