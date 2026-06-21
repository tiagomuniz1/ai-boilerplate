import { visitClinic, expectClinicPath, CLINIC_ID } from '../../support/clinic'

const MOCK_TEMPLATE_ID = 'uuid-template-1'

const mockAdmin = {
  id: 'mock-user-id',
  fullName: 'Admin User',
  email: 'admin@clinic.com',
  role: 'admin',
  clinicId: CLINIC_ID,
}

const mockDoctor = {
  id: 'mock-doctor-id',
  fullName: 'Doctor User',
  email: 'doctor@clinic.com',
  role: 'doctor',
  clinicId: CLINIC_ID,
}

const mockTemplate = {
  id: MOCK_TEMPLATE_ID,
  specialtyId: 'uuid-spec-1',
  specialtyName: 'Cardiologia',
  name: 'Anamnese Cardíaca',
  fields: [
    { key: 'k1', label: 'Sintoma', type: 'text', required: true, order: 0, options: null, placeholder: null, helpText: null, canonical: false, canonicalKey: null },
  ],
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const paginatedResponse = { data: [mockTemplate], total: 1, page: 1, limit: 20 }
const emptyPaginated = { data: [], total: 0, page: 1, limit: 20 }

describe('Medical Record Templates List', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit('/pulso/medical-record-templates')
    expectClinicPath('/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: paginatedResponse })
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockAdmin)
    cy.get('[data-testid="template-list-skeleton"]').should('be.visible')
    cy.wait('@getTemplates')
    cy.get('[data-testid="template-list-skeleton"]').should('not.exist')
  })

  it('shows empty state when no templates exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: emptyPaginated,
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockAdmin)
    cy.wait('@getTemplates')
    cy.get('[data-testid="template-list-empty"]').should('be.visible')
    cy.get('[data-testid="template-list-table"]').should('not.exist')
  })

  it('shows error state when fetch fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockAdmin)
    cy.wait('@getTemplates')
    cy.get('[data-testid="template-list-error"]').should('be.visible')
  })

  it('renders template table with correct data', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: paginatedResponse,
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockAdmin)
    cy.wait('@getTemplates')

    cy.get(`[data-testid="template-name-${MOCK_TEMPLATE_ID}"]`).should('contain', 'Anamnese Cardíaca')
    cy.get(`[data-testid="template-specialty-${MOCK_TEMPLATE_ID}"]`).should('contain', 'Cardiologia')
    cy.get(`[data-testid="template-status-${MOCK_TEMPLATE_ID}"]`).should('contain', 'Ativo')
  })

  it('shows new template button for ADMIN', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: emptyPaginated,
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockAdmin)
    cy.wait('@getTemplates')
    cy.get('[data-testid="template-list-new-button"]').should('be.visible')
  })

  it('does NOT show new template button for DOCTOR', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: emptyPaginated,
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockDoctor)
    cy.wait('@getTemplates')
    cy.get('[data-testid="template-list-new-button"]').should('not.exist')
  })

  it('view details link navigates to template page', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: paginatedResponse,
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockAdmin)
    cy.wait('@getTemplates')
    cy.get(`[data-testid="template-view-link-${MOCK_TEMPLATE_ID}"]`).should(
      'have.attr',
      'href',
      `/pulso/medical-record-templates/${MOCK_TEMPLATE_ID}`,
    )
  })
})
