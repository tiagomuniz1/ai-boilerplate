import { visitClinic, expectClinicPath, CLINIC_ID } from '../../support/clinic'

const MOCK_TEMPLATE_ID = 'uuid-template-sections'

const mockAdmin = {
  id: 'mock-user-id',
  fullName: 'Admin User',
  email: 'admin@clinic.com',
  role: 'admin',
  clinicId: CLINIC_ID,
}

const mockSpecialties = {
  data: [
    {
      id: 'uuid-spec-1',
      name: 'Cardiologia',
      description: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 100,
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

const mockCreatedTemplate = {
  id: MOCK_TEMPLATE_ID,
  specialtyId: 'uuid-spec-1',
  specialtyName: 'Cardiologia',
  name: 'Anamnese com Seções',
  fields: [
    {
      key: 'queixa_abc1',
      label: 'Queixa principal',
      type: 'text',
      required: false,
      order: 0,
      options: null,
      placeholder: null,
      helpText: null,
      canonical: false,
      canonicalKey: null,
      sectionKey: 's_client_001',
    },
  ],
  sections: [
    { key: 's_client_001', title: 'Anamnese', order: 0 },
  ],
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const mockTemplateWithSection = {
  id: MOCK_TEMPLATE_ID,
  specialtyId: 'uuid-spec-1',
  specialtyName: 'Cardiologia',
  name: 'Anamnese com Seções',
  fields: [
    {
      key: 'queixa_abc1',
      label: 'Queixa principal',
      type: 'text',
      required: false,
      order: 0,
      options: null,
      placeholder: null,
      helpText: null,
      canonical: false,
      canonicalKey: null,
      sectionKey: 'anamnese_xyz9',
    },
  ],
  sections: [
    { key: 'anamnese_xyz9', title: 'Anamnese', order: 0 },
  ],
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

describe('Medical Record Templates — Sections', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
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

  describe('create mode', () => {
    it('adds a section and shows the section editor', () => {
      visitClinic('/medical-record-templates/new', mockAdmin)

      cy.get('[data-testid="template-form-add-section"]').click()
      cy.get('[data-testid="section-editor-0"]').should('be.visible')
      cy.get('[data-testid="section-editor-title-0"]').should('be.visible')
    })

    it('adds a field inside a section', () => {
      visitClinic('/medical-record-templates/new', mockAdmin)

      cy.get('[data-testid="template-form-add-section"]').click()
      cy.get('[data-testid="section-editor-add-field-0"]').click()
      cy.get('[data-testid="field-editor-0"]').should('be.visible')
      cy.get('[data-testid="section-editor-fields-empty-0"]').should('not.exist')
    })

    it('removes a field from a section', () => {
      visitClinic('/medical-record-templates/new', mockAdmin)

      cy.get('[data-testid="template-form-add-section"]').click()
      cy.get('[data-testid="section-editor-add-field-0"]').click()
      cy.get('[data-testid="field-editor-0"]').should('be.visible')

      cy.get('[data-testid="field-editor-remove-0"]').click()
      cy.get('[data-testid="section-editor-fields-empty-0"]').should('be.visible')
    })

    it('removes the section', () => {
      visitClinic('/medical-record-templates/new', mockAdmin)

      cy.get('[data-testid="template-form-add-section"]').click()
      cy.get('[data-testid="section-editor-0"]').should('be.visible')

      cy.get('[data-testid="section-editor-remove-0"]').click()
      cy.get('[data-testid="section-editor-0"]').should('not.exist')
    })

    it('validates that at least one field is required (field in section counts)', () => {
      visitClinic('/medical-record-templates/new', mockAdmin)
      cy.wait('@getSpecialties')

      cy.get('[data-testid="template-form-name"]').type('Anamnese')
      cy.get('[data-testid="template-form-specialty"]').select('uuid-spec-1')
      cy.get('[data-testid="template-form-add-section"]').click()
      cy.get('[data-testid="template-form-submit"]').click()

      // Section without fields still triggers the "at least one field" error
      cy.get('[data-testid="template-form-fields-error"]').should('be.visible')
    })

    it('submits successfully with a section and field inside it', () => {
      cy.intercept('POST', `${Cypress.env('API_URL')}/medical-record-templates`, {
        statusCode: 201,
        body: mockCreatedTemplate,
      }).as('createTemplate')
      cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
        statusCode: 200,
        body: { data: [mockCreatedTemplate], total: 1, page: 1, limit: 20 },
      }).as('getTemplates')

      visitClinic('/medical-record-templates/new', mockAdmin)
      cy.wait('@getSpecialties')

      cy.get('[data-testid="template-form-name"]').type('Anamnese com Seções')
      cy.get('[data-testid="template-form-specialty"]').select('uuid-spec-1')

      cy.get('[data-testid="template-form-add-section"]').click()
      cy.get('[data-testid="section-editor-title-0"]').type('Anamnese')
      cy.get('[data-testid="section-editor-add-field-0"]').click()
      cy.get('[data-testid="field-editor-label-0"]').type('Queixa principal')

      cy.get('[data-testid="template-form-submit"]').click()

      cy.wait('@createTemplate').then((interception) => {
        const body = interception.request.body
        // Section must have a key so fields can reference it
        expect(body.sections).to.have.length(1)
        expect(body.sections[0].key).to.be.a('string')
        expect(body.sections[0].key).to.match(/^s_/)
        // Field sectionKey must match the section key
        expect(body.fields[0].sectionKey).to.equal(body.sections[0].key)
      })

      expectClinicPath('/medical-record-templates')
    })

    it('shows canonical fields picker inside section', () => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
        statusCode: 200,
        body: mockCanonicalFields,
      }).as('getCanonicalFields')

      visitClinic('/medical-record-templates/new', mockAdmin)
      cy.wait('@getCanonicalFields')

      cy.get('[data-testid="template-form-add-section"]').click()
      cy.get(`[data-testid="canonical-field-picker-adopt-cf-uuid-1"]`).should('have.length.gte', 1)
    })

    it('adopts canonical field inside a section', () => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
        statusCode: 200,
        body: mockCanonicalFields,
      }).as('getCanonicalFields')

      visitClinic('/medical-record-templates/new', mockAdmin)
      cy.wait('@getCanonicalFields')

      cy.get('[data-testid="template-form-add-section"]').click()
      // The picker inside section-0
      cy.get('[data-testid="section-editor-0"]')
        .find('[data-testid="canonical-field-picker-adopt-cf-uuid-1"]')
        .click()

      cy.get('[data-testid="section-editor-0"]')
        .find('[data-testid="field-editor-0"]')
        .should('be.visible')
      cy.get('[data-testid="field-editor-label-0"]').should('have.value', 'Pressão arterial')
    })
  })

  describe('moving fields between containers', () => {
    it('moves a flat field into a section', () => {
      visitClinic('/medical-record-templates/new', mockAdmin)

      // Add a flat field
      cy.get('[data-testid="template-form-add-field"]').click()
      cy.get('[data-testid="field-editor-label-0"]').type('Peso')

      // Add a section
      cy.get('[data-testid="template-form-add-section"]').click()
      cy.get('[data-testid="section-editor-title-0"]').type('Dados vitais')

      // Move the flat field into the section
      cy.get('[data-testid="field-editor-move-to-0"]').select('section-0')

      // Field should now be inside the section
      cy.get('[data-testid="section-editor-0"]')
        .find('[data-testid="field-editor-0"]')
        .should('be.visible')
      cy.get('[data-testid="section-editor-0"]')
        .find('[data-testid="field-editor-label-0"]')
        .should('have.value', 'Peso')

      // The section should show the field and not the empty placeholder
      cy.get('[data-testid="section-editor-fields-empty-0"]').should('not.exist')

      // Only one field-editor total (inside the section)
      cy.get('[data-testid="field-editor-0"]').should('have.length', 1)
    })

    it('moves a field from a section to general (flat)', () => {
      visitClinic('/medical-record-templates/new', mockAdmin)

      // Add a section with a field inside it
      cy.get('[data-testid="template-form-add-section"]').click()
      cy.get('[data-testid="section-editor-add-field-0"]').click()
      cy.get('[data-testid="field-editor-label-0"]').type('Altura')

      // Move the field out to general
      cy.get('[data-testid="field-editor-move-to-0"]').select('flat')

      // Section should be empty
      cy.get('[data-testid="section-editor-fields-empty-0"]').should('be.visible')

      // Flat area should now have the field
      cy.get('[data-testid="section-editor-0"]')
        .should('not.contain.text', 'Altura')
      cy.get('[data-testid="template-form-add-section"]')
        .closest('div')
        .parent()
        .find('[data-testid="field-editor-0"]')
        .should('not.exist')

      // The flat fields section should contain the field editor
      cy.get('[data-testid="template-form-add-field"]')
        .closest('div')
        .parent()
        .find('[data-testid="field-editor-0"]')
        .should('be.visible')
      cy.get('[data-testid="field-editor-label-0"]').should('have.value', 'Altura')
    })

    it('moves a field between two sections', () => {
      visitClinic('/medical-record-templates/new', mockAdmin)

      // Add two sections
      cy.get('[data-testid="template-form-add-section"]').click()
      cy.get('[data-testid="section-editor-title-0"]').type('Seção A')
      cy.get('[data-testid="template-form-add-section"]').click()
      cy.get('[data-testid="section-editor-title-1"]').type('Seção B')

      // Add a field to section 0
      cy.get('[data-testid="section-editor-add-field-0"]').click()
      cy.get('[data-testid="field-editor-label-0"]').type('Glicemia')

      // Move from section 0 to section 1
      cy.get('[data-testid="section-editor-0"]')
        .find('[data-testid="field-editor-move-to-0"]')
        .select('section-1')

      // Section 0 should now be empty
      cy.get('[data-testid="section-editor-fields-empty-0"]').should('be.visible')

      // Section 1 should have the field
      cy.get('[data-testid="section-editor-1"]')
        .find('[data-testid="field-editor-0"]')
        .should('be.visible')
      cy.get('[data-testid="field-editor-label-0"]').should('have.value', 'Glicemia')
    })
  })

  describe('details view', () => {
    beforeEach(() => {
      cy.intercept(
        'GET',
        `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`,
        { statusCode: 200, body: mockTemplateWithSection },
      ).as('getTemplate')
    })

    it('shows section title in details view', () => {
      visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}`, mockAdmin)
      cy.wait('@getTemplate')

      cy.get('[data-testid="template-details-section-0"]').should('be.visible')
      cy.get('[data-testid="template-details-section-title-0"]').should('contain', 'Anamnese')
    })

    it('shows fields grouped inside their section', () => {
      visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}`, mockAdmin)
      cy.wait('@getTemplate')

      cy.get('[data-testid="template-details-section-0"]')
        .find('[data-testid="template-details-field-0"]')
        .should('be.visible')
        .and('contain', 'Queixa principal')
    })
  })

  describe('edit mode — sections persisted', () => {
    beforeEach(() => {
      cy.intercept(
        'GET',
        `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`,
        { statusCode: 200, body: mockTemplateWithSection },
      ).as('getTemplate')
    })

    it('pre-fills existing section and its field', () => {
      visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}/edit`, mockAdmin)
      cy.wait('@getTemplate')

      cy.get('[data-testid="section-editor-0"]').should('be.visible')
      cy.get('[data-testid="section-editor-title-0"]').should('have.value', 'Anamnese')
      cy.get('[data-testid="field-editor-label-0"]').should('have.value', 'Queixa principal')
    })

    it('sends section key and matching sectionKey on update', () => {
      cy.intercept('PATCH', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
        statusCode: 200,
        body: mockTemplateWithSection,
      }).as('updateTemplate')
      cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
        statusCode: 200,
        body: { data: [mockTemplateWithSection], total: 1, page: 1, limit: 20 },
      }).as('getTemplates')

      visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}/edit`, mockAdmin)
      cy.wait('@getTemplate')

      cy.get('[data-testid="template-form-submit"]').click()

      cy.wait('@updateTemplate').then((interception) => {
        const body = interception.request.body
        expect(body.sections).to.have.length(1)
        expect(body.sections[0].key).to.equal('anamnese_xyz9')
        expect(body.fields[0].sectionKey).to.equal('anamnese_xyz9')
      })
    })
  })
})
