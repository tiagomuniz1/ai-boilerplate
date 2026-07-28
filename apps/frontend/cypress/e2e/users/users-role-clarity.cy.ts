import { visitClinic } from '../../support/clinic'

const MOCK_USER_ID = 'cccccccc-0000-0000-0000-000000000002'
const MOCK_PROFESSIONAL_ID = 'dddddddd-0000-0000-0000-000000000001'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
}

const mockReceptionistUser = {
  id: MOCK_USER_ID,
  fullName: 'Carla Recepção',
  email: 'carla@test.com',
  role: 'user',
  isActive: true,
  isProfessional: false,
  isPatient: false,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const mockProfessionalUser = {
  ...mockReceptionistUser,
  fullName: 'Ana Nutri',
  email: 'ana@test.com',
  role: 'professional',
  isProfessional: true,
}

const mockLinkedProfessional = {
  id: MOCK_PROFESSIONAL_ID,
  user: { id: MOCK_USER_ID, fullName: 'Ana Nutri', email: 'ana@test.com', isActive: true },
  registrations: [{ id: 'reg-1', councilType: 'crn', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [],
  bio: null,
  createdAt: '2024-01-10T00:00:00.000Z',
  updatedAt: '2024-01-10T00:00:00.000Z',
}

describe('Users — role vs. profession clarity', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('labels the USER role as "Recepcionista" when creating a user, not "Usuário"', () => {
    visitClinic('/users/new', mockAuthUser)

    cy.get('[data-testid="user-form-role"]').should('contain.text', 'Recepcionista')
    cy.get('[data-testid="user-form-role"]').should('not.contain.text', 'Usuário')
  })

  it('shows a description of what the selected access role can do', () => {
    visitClinic('/users/new', mockAuthUser)

    cy.get('[data-testid="user-form-role-description"]').should('be.visible')
  })

  it('shows the access role and the actual profession as two separate, labeled pieces of information', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockProfessionalUser,
    }).as('getUser')
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: { data: [mockLinkedProfessional], total: 1, page: 1, limit: 100 },
    }).as('getProfessionals')

    visitClinic(`/users/${MOCK_USER_ID}`, mockAuthUser)
    cy.wait('@getUser')

    cy.get('[data-testid="user-details-role"]').should('have.text', 'Profissional')
    cy.wait('@getProfessionals')
    cy.get('[data-testid="user-details-profession"]').should('contain.text', 'CRN 12345/SP')
  })

  it('does not show a profession row for a non-professional user', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockReceptionistUser,
    }).as('getUser')

    visitClinic(`/users/${MOCK_USER_ID}`, mockAuthUser)
    cy.wait('@getUser')

    cy.get('[data-testid="user-details-role"]').should('have.text', 'Recepcionista')
    cy.get('[data-testid="user-details-profession-cell"]').should('not.exist')
  })

  it('shows a read-only access-role notice (not an editable select) when editing a professional user', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users/${MOCK_USER_ID}`, {
      statusCode: 200,
      body: mockProfessionalUser,
    }).as('getUser')
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: { data: [mockLinkedProfessional], total: 1, page: 1, limit: 100 },
    }).as('getProfessionals')

    visitClinic(`/users/${MOCK_USER_ID}/edit`, mockAuthUser)
    cy.wait('@getUser')

    cy.get('[data-testid="user-form-role"]').should('not.exist')
    cy.get('[data-testid="user-form-role-readonly"]').should('have.text', 'Profissional')
    cy.wait('@getProfessionals')
    cy.get('[data-testid="user-form-professional-link"]')
      .should('be.visible')
      .and('have.attr', 'href')
      .and('include', `/professionals/${MOCK_PROFESSIONAL_ID}/edit`)
  })
})

export {}
