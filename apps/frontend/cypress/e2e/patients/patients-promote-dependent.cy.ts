import { visitClinic } from '../../support/clinic'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const TITULAR_ID = 'bbbbbbbb-3333-3333-3333-000000000001'
const DEPENDENT_ID = 'bbbbbbbb-3333-3333-3333-000000000002'

const mockDependent = {
  id: DEPENDENT_ID,
  user: { id: 'user-uuid-dependent', fullName: 'Bebê Silva', email: 'bebe@test.com', isActive: false },
  phoneNumber: '11988887777',
  birthDate: '2010-01-01',
  documentNumber: null,
  gender: 'male',
  responsiblePatientId: TITULAR_ID,
  kinshipType: 'filho',
  responsiblePatient: { id: TITULAR_ID, fullName: 'Maria Silva', documentNumber: '11122233344' },
  dependents: [],
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const mockPromotedDependent = {
  ...mockDependent,
  documentNumber: '98765432100',
  responsiblePatientId: null,
  kinshipType: null,
  responsiblePatient: null,
}

describe('Patients — Promover dependente a independente', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('pre-fills the dependent link and promotes to independent after adding a CPF and removing the link', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${DEPENDENT_ID}`, {
      statusCode: 200,
      body: mockDependent,
    }).as('getPatient')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/patients/${DEPENDENT_ID}`, {
      statusCode: 200,
      body: mockPromotedDependent,
    }).as('updatePatient')

    visitClinic(`/patients/${DEPENDENT_ID}/edit`, mockAuthUser)
    cy.wait('@getPatient')

    cy.get('[data-testid="patient-form-is-dependent"]').should('be.checked')
    cy.get('[data-testid="patient-form-titular-search"]').should('have.value', 'Maria Silva (111.222.333-44)')
    cy.get('[data-testid="patient-form-kinship-type"]').should('have.value', 'filho')

    cy.get('[data-testid="patient-form-document"]').type('98765432100')
    cy.get('[data-testid="patient-form-is-dependent"]').click()
    cy.get('[data-testid="patient-form-submit"]').click()

    cy.wait('@updatePatient').its('request.body').should((body) => {
      expect(body.documentNumber).to.eq('98765432100')
      expect(body.responsiblePatientId).to.be.null
    })
  })

  it('no longer shows "Vinculado a" on the detail page after promotion', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${DEPENDENT_ID}`, {
      statusCode: 200,
      body: mockPromotedDependent,
    }).as('getPatient')
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 10 },
    })

    visitClinic(`/patients/${DEPENDENT_ID}`, mockAuthUser)
    cy.wait('@getPatient')

    cy.get('[data-testid="patient-details-document"]').should('contain', '987.654.321-00')
    cy.get('[data-testid="patient-details-responsible"]').should('not.exist')
  })
})

export {}
