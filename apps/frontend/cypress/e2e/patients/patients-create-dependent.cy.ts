import { visitClinic } from '../../support/clinic'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const TITULAR_ID = 'ffffffff-1111-1111-1111-000000000001'

const mockTitular = {
  id: TITULAR_ID,
  user: { id: 'user-uuid-titular', fullName: 'Maria Silva', email: 'maria@test.com', isActive: true },
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
}

const mockCreatedDependent = {
  id: 'ffffffff-1111-1111-1111-000000000002',
  user: { id: 'user-uuid-dependent', fullName: 'Bebê Silva', email: 'bebe@test.com', isActive: false },
  phoneNumber: '11988887777',
  birthDate: '2024-01-01',
  documentNumber: null,
  gender: 'male',
  responsiblePatientId: TITULAR_ID,
  kinshipType: 'filho',
  responsiblePatient: { id: TITULAR_ID, fullName: 'Maria Silva', documentNumber: '11122233344' },
  dependents: [],
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

describe('Patients Create — Dependente', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('hides the CPF requirement and creates a dependent linked to a titular', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients?search=*`, {
      statusCode: 200,
      body: { data: [mockTitular], total: 1, page: 1, limit: 10 },
    }).as('searchTitulares')
    cy.intercept('POST', `${Cypress.env('API_URL')}/patients`, {
      statusCode: 201,
      body: mockCreatedDependent,
    }).as('createPatient')

    visitClinic('/patients/new', mockAuthUser)

    cy.get('[data-testid="patient-form-fullname"]').type('Bebê Silva')
    cy.get('[data-testid="patient-form-email"]').type('bebe@test.com')
    cy.get('[data-testid="patient-form-phone"]').type('11988887777')
    cy.get('[data-testid="patient-form-birthdate"]').type('2024-01-01')
    cy.get('[data-testid="patient-form-gender"]').select('male')

    cy.get('[data-testid="patient-form-document"]').should('be.visible')
    cy.get('[data-testid="patient-form-is-dependent"]').click()
    cy.get('[data-testid="patient-form-document"]').should('not.exist')

    cy.get('[data-testid="patient-form-titular-search"]').type('Maria')
    cy.wait('@searchTitulares')
    cy.get('[data-testid="patient-form-titular-option"]').should('contain', 'Maria Silva').click()
    cy.get('[data-testid="patient-form-kinship-type"]').select('filho')

    cy.get('[data-testid="patient-form-submit"]').click()
    cy.wait('@createPatient').its('request.body').should((body) => {
      expect(body.documentNumber).to.be.undefined
      expect(body.responsiblePatientId).to.eq(TITULAR_ID)
      expect(body.kinshipType).to.eq('filho')
    })
  })

  it('shows validation error when marked as dependent without selecting a titular', () => {
    visitClinic('/patients/new', mockAuthUser)

    cy.get('[data-testid="patient-form-is-dependent"]').click()
    cy.get('[data-testid="patient-form-submit"]').click()
    cy.contains('Selecione o paciente titular').should('be.visible')
  })
})

export {}
