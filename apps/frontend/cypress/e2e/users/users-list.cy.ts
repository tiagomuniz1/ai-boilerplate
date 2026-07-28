import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
}

const mockUser = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  fullName: 'Usuário Listado',
  email: 'listado@test.com',
  role: 'user',
  isProfessional: false,
  isPatient: false,
  councilType: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const mockDoctorUser = {
  ...mockUser,
  id: 'aaaaaaaa-0000-0000-0000-000000000002',
  fullName: 'Ana Médica',
  email: 'ana.medica@test.com',
  role: 'professional',
  isProfessional: true,
  councilType: 'crm',
}

const mockPatientUser = {
  ...mockUser,
  id: 'aaaaaaaa-0000-0000-0000-000000000003',
  fullName: 'Paulo Paciente',
  email: 'paulo.paciente@test.com',
  role: 'user',
  isPatient: true,
}

const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }
const populatedListResponse = { data: [mockUser], total: 1, page: 1, limit: 20 }

describe('Users List', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit(`/${CLINIC_SLUG}/users`)
    expectClinicPath('/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: populatedListResponse })
    }).as('getUsers')

    visitClinic('/users', mockAuthUser)
    cy.get('[data-testid="user-list-skeleton"]').should('be.visible')
    cy.wait('@getUsers')
    cy.get('[data-testid="user-list-skeleton"]').should('not.exist')
  })

  it('shows empty state when no users exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getUsers')

    visitClinic('/users', mockAuthUser)
    cy.wait('@getUsers')
    cy.get('[data-testid="user-list-empty"]').should('be.visible')
    cy.get('[data-testid="user-list-table"]').should('not.exist')
  })

  it('shows error state when API fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getUsers')

    visitClinic('/users', mockAuthUser)
    cy.wait('@getUsers')
    cy.get('[data-testid="user-list-error"]').should('be.visible')
    cy.get('[data-testid="user-list-table"]').should('not.exist')
  })

  it('shows user rows with name, email and role', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getUsers')

    visitClinic('/users', mockAuthUser)
    cy.wait('@getUsers')

    cy.get('[data-testid="user-list-table"]').should('be.visible')
    cy.get(`[data-testid="user-table-row-${mockUser.id}"]`).should('exist')
    cy.get(`[data-testid="user-name-${mockUser.id}"]`).should('contain', mockUser.fullName)
    cy.get(`[data-testid="user-email-${mockUser.id}"]`).should('contain', mockUser.email)
    cy.get(`[data-testid="user-role-${mockUser.id}"]`).should('contain', 'Usuário')
  })

  it('shows "Novo usuário" button that links to /users/new', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getUsers')

    visitClinic('/users', mockAuthUser)
    cy.wait('@getUsers')
    cy.get('[data-testid="user-list-new-button"]').should('be.visible')
    cy.get('[data-testid="user-list-new-button"]').click()
    expectClinicPath('/users/new')
  })

  it('renders search input', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getUsers')

    visitClinic('/users', mockAuthUser)
    cy.wait('@getUsers')
    cy.get('[data-testid="user-list-search"]').should('be.visible')
  })

  it('shows a dash in the "Tipo" column for a user with no professional or patient record', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getUsers')

    visitClinic('/users', mockAuthUser)
    cy.wait('@getUsers')

    cy.get(`[data-testid="user-profiles-${mockUser.id}"]`).should('contain', '—')
  })

  it('shows the profession label (not the generic role) in the "Tipo" column for a professional', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: { data: [mockDoctorUser], total: 1, page: 1, limit: 20 },
    }).as('getUsers')

    visitClinic('/users', mockAuthUser)
    cy.wait('@getUsers')

    cy.get(`[data-testid="user-profile-professional-${mockDoctorUser.id}"]`).should('contain', 'Médico')
  })

  it('shows "Paciente" in the "Tipo" column for a patient', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: { data: [mockPatientUser], total: 1, page: 1, limit: 20 },
    }).as('getUsers')

    visitClinic('/users', mockAuthUser)
    cy.wait('@getUsers')

    cy.get(`[data-testid="user-profile-patient-${mockPatientUser.id}"]`).should('contain', 'Paciente')
  })

  it('typing in search sends query param to API', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getUsers')

    visitClinic('/users', mockAuthUser)
    cy.wait('@getUsers')

    cy.intercept('GET', `${Cypress.env('API_URL')}/users*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('searchUsers')

    cy.get('[data-testid="user-list-search"]').type('Usuário')
    cy.wait('@searchUsers').its('request.url').should('include', 'search=')
  })

})

export {}
