import { visitClinic, expectClinicPath, CLINIC_ID } from '../../support/clinic'

const MOCK_TEMPLATE_ID = 'uuid-template-1'

const mockAdmin = {
  id: 'mock-user-id',
  fullName: 'Admin User',
  email: 'admin@clinic.com',
  role: 'admin',
  clinicId: CLINIC_ID,
}

const mockProfessional = {
  id: 'mock-professional-id',
  fullName: 'Professional User',
  email: 'professional@clinic.com',
  role: 'professional',
  clinicId: CLINIC_ID,
}

const mockTemplate = {
  id: MOCK_TEMPLATE_ID,
  specialtyId: 'uuid-spec-1',
  specialtyName: 'Cardiologia',
  name: 'Anamnese Cardíaca',
  fields: [
    {
      key: 'k1',
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

describe('Medical Record Templates Details', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: mockTemplate })
    }).as('getTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}`, mockAdmin)
    cy.get('[data-testid="template-list-skeleton"]').should('be.visible')
    cy.wait('@getTemplate')
    cy.get('[data-testid="template-list-skeleton"]').should('not.exist')
  })

  it('shows error state when fetch fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 404,
      body: { title: 'Not Found' },
    }).as('getTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}`, mockAdmin)
    cy.wait('@getTemplate')
    cy.get('[data-testid="template-details-error"]').should('be.visible')
  })

  it('renders template details on success', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}`, mockAdmin)
    cy.wait('@getTemplate')

    cy.get('[data-testid="template-details-name"]').should('contain', 'Anamnese Cardíaca')
    cy.get('[data-testid="template-details-specialty"]').should('contain', 'Cardiologia')
    cy.get('[data-testid="template-details-status"]').should('contain', 'Ativo')
    cy.get('[data-testid="template-details-profession"]').should('be.visible')
    cy.get('[data-testid="template-details-fields"]').should('be.visible')
    cy.get('[data-testid="template-details-field-0"]').should('be.visible')
    cy.contains('Sintoma principal').should('be.visible')
  })

  it('shows a no-fields message when the template has none', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: { ...mockTemplate, fields: [] },
    }).as('getTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}`, mockAdmin)
    cy.wait('@getTemplate')

    cy.get('[data-testid="template-details-no-fields"]').should('be.visible')
  })

  it('shows edit and delete buttons for ADMIN', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}`, mockAdmin)
    cy.wait('@getTemplate')

    cy.get('[data-testid="template-details-edit-button"]').should('be.visible')
    cy.get('[data-testid="template-details-delete-button"]').should('be.visible')
  })

  it('never shows delete for PROFESSIONAL, even when owning the template', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: {
        data: [
          {
            id: 'professional-uuid',
            user: { id: mockProfessional.id, fullName: mockProfessional.fullName, email: mockProfessional.email },
            registrations: [{ id: 'reg-1', councilType: 'crm', number: '123456', state: 'SP', isPrimary: true }],
            specialties: [{ id: 'uuid-spec-1', name: 'Cardiologia', registryNumber: null }],
            bio: null,
            createdAt: '2024-01-15T10:00:00.000Z',
            updatedAt: '2024-01-15T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      },
    }).as('getMyProfessional')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}`, mockProfessional)
    cy.wait('@getTemplate')
    cy.wait('@getMyProfessional')

    cy.get('[data-testid="template-details-edit-button"]').should('be.visible')
    cy.get('[data-testid="template-details-delete-button"]').should('not.exist')
  })

  it('does NOT show edit for PROFESSIONAL who does not own the template scope', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: {
        data: [
          {
            id: 'professional-uuid',
            user: { id: mockProfessional.id, fullName: mockProfessional.fullName, email: mockProfessional.email },
            registrations: [{ id: 'reg-1', councilType: 'crm', number: '123456', state: 'SP', isPrimary: true }],
            specialties: [{ id: 'uuid-spec-other', name: 'Dermatologia', registryNumber: null }],
            bio: null,
            createdAt: '2024-01-15T10:00:00.000Z',
            updatedAt: '2024-01-15T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      },
    }).as('getMyProfessional')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}`, mockProfessional)
    cy.wait('@getTemplate')
    cy.wait('@getMyProfessional')

    cy.get('[data-testid="template-details-edit-button"]').should('not.exist')
    cy.get('[data-testid="template-details-delete-button"]').should('not.exist')
  })

  it('opens delete dialog when delete clicked', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}`, mockAdmin)
    cy.wait('@getTemplate')
    cy.get('[data-testid="template-details-delete-button"]').click()
    cy.get('[data-testid="template-delete-dialog"]').should('be.visible')
  })

  it('closes delete dialog on cancel', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}`, mockAdmin)
    cy.wait('@getTemplate')
    cy.get('[data-testid="template-details-delete-button"]').click()
    cy.get('[data-testid="template-delete-dialog-cancel"]').click()
    cy.get('[data-testid="template-delete-dialog"]').should('not.exist')
  })

  it('deletes template and redirects to list on confirm', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 204,
    }).as('deleteTemplate')
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    }).as('getTemplates')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}`, mockAdmin)
    cy.wait('@getTemplate')
    cy.get('[data-testid="template-details-delete-button"]').click()
    cy.get('[data-testid="template-delete-dialog-confirm"]').click()
    cy.wait('@deleteTemplate')
    expectClinicPath('/medical-record-templates')
  })

  it('shows error on failed delete', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/medical-record-templates/${MOCK_TEMPLATE_ID}`, {
      statusCode: 500,
      body: { title: 'Server Error' },
    }).as('deleteTemplate')

    visitClinic(`/medical-record-templates/${MOCK_TEMPLATE_ID}`, mockAdmin)
    cy.wait('@getTemplate')
    cy.get('[data-testid="template-details-delete-button"]').click()
    cy.get('[data-testid="template-delete-dialog-confirm"]').click()
    cy.wait('@deleteTemplate')
    cy.get('[data-testid="template-details-delete-error"]').should('be.visible')
  })
})
