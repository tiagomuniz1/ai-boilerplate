import { visitClinic } from '../../support/clinic'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockTitulares = [
  {
    id: 'aaaaaaaa-2222-2222-2222-000000000001',
    user: { id: 'user-uuid-1', fullName: 'Maria Silva', email: 'maria@test.com', isActive: true },
    phoneNumber: '11988887777',
    birthDate: '1985-03-10',
    documentNumber: '11122233344',
    gender: 'female',
    responsiblePatientId: null,
    kinshipType: null,
    responsiblePatient: null,
    dependents: [],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
  },
]

describe('Patients Create — Busca de titular', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('debounces the search and requests patients excluding dependents', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients?search=*`, {
      statusCode: 200,
      body: { data: mockTitulares, total: 1, page: 1, limit: 10 },
    }).as('searchTitulares')

    visitClinic('/patients/new', mockAuthUser)
    cy.get('[data-testid="patient-form-is-dependent"]').click()
    cy.get('[data-testid="patient-form-titular-search"]').type('Maria')

    cy.wait('@searchTitulares').its('request.url').should('include', 'excludeDependents=true')
    cy.get('[data-testid="patient-form-titular-search-results"]').should('be.visible')
    cy.get('[data-testid="patient-form-titular-option"]').should('contain', 'Maria Silva')
  })

  it('shows "Nenhum paciente encontrado" when search returns no results', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients?search=*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 10 },
    }).as('searchTitulares')

    visitClinic('/patients/new', mockAuthUser)
    cy.get('[data-testid="patient-form-is-dependent"]').click()
    cy.get('[data-testid="patient-form-titular-search"]').type('Ninguem')

    cy.wait('@searchTitulares')
    cy.contains('Nenhum paciente encontrado').should('be.visible')
  })

  it('selecting a titular fills the field, and typing again clears the selection', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients?search=*`, {
      statusCode: 200,
      body: { data: mockTitulares, total: 1, page: 1, limit: 10 },
    }).as('searchTitulares')

    visitClinic('/patients/new', mockAuthUser)
    cy.get('[data-testid="patient-form-is-dependent"]').click()
    cy.get('[data-testid="patient-form-titular-search"]').type('Maria')
    cy.wait('@searchTitulares')
    cy.get('[data-testid="patient-form-titular-option"]').click()
    cy.get('[data-testid="patient-form-titular-search"]').should('have.value', 'Maria Silva (111.222.333-44)')

    cy.get('[data-testid="patient-form-titular-search"]').type(' Costa')
    cy.get('[data-testid="patient-form-submit"]').click()
    cy.contains('Selecione o paciente titular').should('be.visible')
  })
})

export {}
