import { visitClinic, expectClinicPath, CLINIC_SLUG } from '../../support/clinic'

const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'
const SPEC_ID_2 = '00000000-0000-4000-a000-000000000002'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockProfessional = {
  id: 'aaaaaaaa-2222-2222-2222-000000000001',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@test.com' },
  registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: SPEC_ID_1, name: 'Cardiologia', registryNumber: null }],
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }
const populatedListResponse = { data: [mockProfessional], total: 1, page: 1, limit: 20 }

describe('Professionals List', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit(`/${CLINIC_SLUG}/professionals`)
    expectClinicPath('/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: populatedListResponse })
    }).as('getProfessionals')

    visitClinic('/professionals', mockAuthUser)
    cy.get('[data-testid="professional-list-skeleton"]').should('be.visible')
    cy.wait('@getProfessionals')
    cy.get('[data-testid="professional-list-skeleton"]').should('not.exist')
  })

  it('shows empty state when no professionals exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getProfessionals')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')
    cy.get('[data-testid="professional-list-empty"]').should('be.visible')
    cy.get('[data-testid="professional-list-table"]').should('not.exist')
  })

  it('shows error state when API fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getProfessionals')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')
    cy.get('[data-testid="professional-list-error"]').should('be.visible')
    cy.get('[data-testid="professional-list-table"]').should('not.exist')
  })

  it('shows professional rows with name, email, registration and specialty badge', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getProfessionals')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')

    cy.get('[data-testid="professional-list-table"]').should('be.visible')
    cy.get(`[data-testid="professional-table-row-${mockProfessional.id}"]`).should('exist')
    cy.get(`[data-testid="professional-name-${mockProfessional.id}"]`).should('contain', mockProfessional.user.fullName)
    cy.get(`[data-testid="professional-email-${mockProfessional.id}"]`).should('contain', mockProfessional.user.email)
    cy.get(`[data-testid="professional-crm-${mockProfessional.id}"]`).should('contain', '12345/SP')
    cy.get(`[data-testid="professional-specialty-badge-${SPEC_ID_1}"]`).should('contain', 'Cardiologia')
  })

  it('shows overflow indicator when professional has more than 2 specialties', () => {
    const professionalWithManySpecialties = {
      ...mockProfessional,
      specialties: [
        { id: SPEC_ID_1, name: 'Cardiologia', registryNumber: null },
        { id: SPEC_ID_2, name: 'Neurologia', registryNumber: null },
        { id: '00000000-0000-4000-a000-000000000003', name: 'Ortopedia', registryNumber: null },
        { id: '00000000-0000-4000-a000-000000000004', name: 'Pediatria', registryNumber: null },
      ],
    }
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: { data: [professionalWithManySpecialties], total: 1, page: 1, limit: 20 },
    }).as('getProfessionals')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')

    cy.get(`[data-testid="professional-specialty-badge-${SPEC_ID_1}"]`).should('be.visible')
    cy.get(`[data-testid="professional-specialty-badge-${SPEC_ID_2}"]`).should('be.visible')
    cy.get(`[data-testid="professional-specialty-${mockProfessional.id}"]`).should('contain', '+2 mais')
  })

  it('shows "Novo profissional" button that links to /professionals/new', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getProfessionals')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')
    cy.get('[data-testid="professional-list-new-button"]').should('be.visible')
    cy.get('[data-testid="professional-list-new-button"]').click()
    expectClinicPath('/professionals/new')
  })

  it('renders search input', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getProfessionals')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')
    cy.get('[data-testid="professional-list-search"]').should('be.visible')
  })

  it('typing in search sends query param to API', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getProfessionals')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')

    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('searchProfessionals')

    cy.get('[data-testid="professional-list-search"]').type('Cardio')
    cy.wait('@searchProfessionals').its('request.url').should('include', 'search=')
  })

  it('shows specific empty message when search returns no results', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getProfessionals')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')

    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('searchProfessionals')

    cy.get('[data-testid="professional-list-search"]').type('Inexistente')
    cy.wait('@searchProfessionals')
    cy.get('[data-testid="professional-list-empty"]')
      .should('be.visible')
      .and('contain', 'Nenhum profissional encontrado para a busca realizada')
  })

  it('renders view and edit links for each professional', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getProfessionals')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')

    cy.get(`[data-testid="professional-view-link-${mockProfessional.id}"]`).should('exist')
    cy.get(`[data-testid="professional-edit-link-${mockProfessional.id}"]`).should('exist')
  })
})

export {}
