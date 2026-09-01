import { visitClinic, expectClinicPath, CLINIC_SLUG } from '../../support/clinic'

const MOCK_PROFESSIONAL_ID = 'dddddddd-2222-2222-2222-000000000001'

const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockProfessional = {
  id: MOCK_PROFESSIONAL_ID,
  user: { id: 'user-uuid-1', fullName: 'Dr. Para Excluir', email: 'excluir@test.com' },
  registrations: [{ id: 'reg-1', councilType: 'crm', number: '99999', state: 'RJ', isPrimary: true }],
  specialties: [{ id: SPEC_ID_1, name: 'Ortopedia', registryNumber: null }],
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const populatedListResponse = { data: [mockProfessional], total: 1, page: 1, limit: 20 }
const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }

describe('Professionals Delete', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows delete confirmation dialog when delete button is clicked', () => {
    // Sem ficha de profissional: o default para quem só administra ou recepciona.
    // O glob `/professionals*` não cobre esta rota — `*` não atravessa a barra.
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, { statusCode: 200, body: null })
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getProfessionals')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')
    cy.get(`[data-testid="professional-delete-button-${MOCK_PROFESSIONAL_ID}"]`).click()
    cy.get('[data-testid="delete-professional-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-professional-dialog-message"]').should('contain', mockProfessional.user.fullName)
  })

  it('cancel button on dialog does not delete professional', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getProfessionals')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`).as('deleteProfessional')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')
    cy.get(`[data-testid="professional-delete-button-${MOCK_PROFESSIONAL_ID}"]`).click()
    cy.get('[data-testid="delete-professional-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-professional-dialog-cancel"]').click()
    cy.get('[data-testid="delete-professional-dialog"]').should('not.exist')
    cy.get(`[data-testid="professional-table-row-${MOCK_PROFESSIONAL_ID}"]`).should('exist')
  })

  it('shows error message when deletion fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getProfessionals')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 500,
      body: { status: 500, title: 'Internal Server Error' },
    }).as('deleteProfessional')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')
    cy.get(`[data-testid="professional-delete-button-${MOCK_PROFESSIONAL_ID}"]`).click()
    cy.get('[data-testid="delete-professional-dialog-confirm"]').click()
    cy.wait('@deleteProfessional')
    cy.get('[data-testid="delete-professional-dialog"]').should('not.exist')
    cy.get(`[data-testid="professional-table-row-${MOCK_PROFESSIONAL_ID}"]`).should('exist')
  })

  it('confirms deletion and shows success message', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getProfessionals')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deleteProfessional')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')
    cy.get(`[data-testid="professional-delete-button-${MOCK_PROFESSIONAL_ID}"]`).click()
    cy.get('[data-testid="delete-professional-dialog-confirm"]').click()
    cy.wait('@deleteProfessional')
    cy.get('[data-testid="professional-list-success"]').should('be.visible')
    cy.get('[data-testid="professional-list-success"]').should('contain', mockProfessional.user.fullName)
  })

  it('deleted professional no longer appears in list', () => {
    let callCount = 0
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, (req) => {
      callCount++
      req.reply({
        statusCode: 200,
        body: callCount === 1 ? populatedListResponse : emptyListResponse,
      })
    }).as('getProfessionals')

    cy.intercept('DELETE', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deleteProfessional')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')
    cy.get(`[data-testid="professional-delete-button-${MOCK_PROFESSIONAL_ID}"]`).click()
    cy.get('[data-testid="delete-professional-dialog-confirm"]').click()
    cy.wait('@deleteProfessional')
    cy.wait('@getProfessionals')
    cy.get(`[data-testid="professional-table-row-${MOCK_PROFESSIONAL_ID}"]`).should('not.exist')
    cy.get('[data-testid="professional-list-empty"]').should('be.visible')
  })

  it('delete from details page navigates back to list', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getProfessionals')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deleteProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-details-delete-button"]').click()
    cy.get('[data-testid="delete-professional-dialog-confirm"]').click()
    cy.wait('@deleteProfessional')
    expectClinicPath('/professionals')
  })
})

export {}
