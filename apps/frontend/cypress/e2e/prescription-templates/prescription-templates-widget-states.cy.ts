// Mocked — estados de loading/erro/vazio da listagem de modelos de receita e
// do formulário (validação de itens, erro de API), além do diálogo de
// exclusão, nunca tinham teste algum (só o happy path real).

import { visitClinic } from '../../support/clinic'

const TEMPLATE_UUID = '00000000-0000-4000-f000-000000000001'

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. João',
  email: 'professional@pulso.center',
  role: 'professional',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const mockTemplate = {
  id: TEMPLATE_UUID,
  name: 'Modelo Hipertensão',
  professionalId: 'professional-uuid',
  professionalName: 'Dr. João',
  items: [{ medicationId: null, name: 'Losartana', activeIngredient: 'Losartana', dosage: null, quantity: null, instructions: '1x ao dia' }],
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('Prescription templates — widget states (mocked)', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 10 },
    })
  })

  it('shows a skeleton while loading, then an error state on failure', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/prescription-templates`, {
      statusCode: 200,
      body: [],
      delay: 500,
    }).as('getTemplatesSlow')

    visitClinic('/prescription-templates', mockProfessionalUser)
    cy.get('[data-testid="prescription-template-list-skeleton"]').should('be.visible')
    cy.wait('@getTemplatesSlow')
    cy.get('[data-testid="prescription-template-list-skeleton"]').should('not.exist')

    cy.intercept('GET', `${Cypress.env('API_URL')}/prescription-templates`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('getTemplatesError')
    cy.reload()
    cy.wait('@getTemplatesError')
    cy.get('[data-testid="prescription-template-list-error"]').should('be.visible')
  })

  it('cancels and confirms deleting an existing template', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/prescription-templates`, {
      statusCode: 200,
      body: [mockTemplate],
    }).as('getTemplates')

    visitClinic('/prescription-templates', mockProfessionalUser)
    cy.wait('@getTemplates')

    cy.get(`[data-testid="prescription-template-delete-${TEMPLATE_UUID}"]`).click()
    cy.get('[data-testid="prescription-template-delete-dialog"]').should('be.visible')
    cy.get('[data-testid="prescription-template-delete-dialog-message"]').should('be.visible')
    cy.get('[data-testid="prescription-template-delete-dialog-cancel"]').click()
    cy.get('[data-testid="prescription-template-delete-dialog"]').should('not.exist')
    cy.get(`[data-testid="prescription-template-row-${TEMPLATE_UUID}"]`).should('exist')

    cy.intercept('DELETE', `${Cypress.env('API_URL')}/prescription-templates/${TEMPLATE_UUID}`, { statusCode: 204 }).as('deleteTemplate')
    cy.intercept('GET', `${Cypress.env('API_URL')}/prescription-templates`, {
      statusCode: 200,
      body: [],
    }).as('getTemplatesAfterDelete')

    cy.get(`[data-testid="prescription-template-delete-${TEMPLATE_UUID}"]`).click()
    cy.get('[data-testid="prescription-template-delete-dialog-confirm"]').click()
    cy.wait('@deleteTemplate')
    cy.wait('@getTemplatesAfterDelete')
    cy.get('[data-testid="prescription-template-delete-dialog"]').should('not.exist')
    cy.get('[data-testid="prescription-template-list-empty"]').should('be.visible')
  })

  it('shows a validation error when submitting with no items', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/prescription-templates`, {
      statusCode: 200,
      body: [],
    }).as('getTemplates')

    visitClinic('/prescription-templates', mockProfessionalUser)
    cy.wait('@getTemplates')

    cy.get('[data-testid="prescription-template-list-new-button"]').click()
    cy.get('[data-testid="prescription-template-form"]').should('be.visible')
    cy.get('[data-testid="prescription-template-form-name"]').type('Modelo Teste')
    cy.get('[data-testid="prescription-template-form-submit"]').click()

    cy.get('[data-testid="prescription-template-form-items-error"]').should('be.visible').and('contain.text', 'Adicione ao menos um medicamento')
  })

  it('shows a generic error when the API fails to create the template', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/prescription-templates`, {
      statusCode: 200,
      body: [],
    }).as('getTemplates')

    visitClinic('/prescription-templates', mockProfessionalUser)
    cy.wait('@getTemplates')

    cy.get('[data-testid="prescription-template-list-new-button"]').click()
    cy.get('[data-testid="prescription-template-form-name"]').type('Modelo Teste')
    cy.get('[data-testid="prescription-template-form-tab-ingredient"]').click()
    cy.get('[data-testid="prescription-template-form-manual-input"]').type('Paracetamol')
    cy.get('[data-testid="prescription-template-form-manual-add"]').click()
    cy.get('[data-testid="prescription-template-form-item-instructions-0"]').type('1 comprimido se dor')

    cy.intercept('POST', `${Cypress.env('API_URL')}/prescription-templates`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('createTemplateError')

    cy.get('[data-testid="prescription-template-form-submit"]').click()
    cy.wait('@createTemplateError')
    cy.get('[data-testid="prescription-template-form-error"]').should('be.visible')
    cy.get('[data-testid="prescription-template-create-modal"]').should('be.visible')
  })
})
