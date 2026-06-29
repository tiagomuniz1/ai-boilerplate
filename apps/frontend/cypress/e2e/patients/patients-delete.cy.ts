import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const MOCK_PATIENT_ID = 'dddddddd-1111-1111-1111-000000000001'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockPatient = {
  id: MOCK_PATIENT_ID,
  user: { id: 'user-uuid-1', fullName: 'Paciente Para Excluir', email: 'excluir@test.com', isActive: true },
  phoneNumber: '(11) 99999-9999',
  birthDate: '1990-05-15',
  documentNumber: '12345678901',
  gender: 'male',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const populatedListResponse = { data: [mockPatient], total: 1, page: 1, limit: 20 }
const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }

describe('Patients Delete', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows delete confirmation dialog when delete button is clicked', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getPatients')

    visitClinic('/patients', mockAuthUser)
    cy.wait('@getPatients')
    cy.get(`[data-testid="patient-delete-button-${MOCK_PATIENT_ID}"]`).click()
    cy.get('[data-testid="delete-patient-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-patient-dialog-message"]').should('contain', mockPatient.user.fullName)
  })

  it('cancel button on dialog does not delete patient', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getPatients')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`).as('deletePatient')

    visitClinic('/patients', mockAuthUser)
    cy.wait('@getPatients')
    cy.get(`[data-testid="patient-delete-button-${MOCK_PATIENT_ID}"]`).click()
    cy.get('[data-testid="delete-patient-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-patient-dialog-cancel"]').click()
    cy.get('[data-testid="delete-patient-dialog"]').should('not.exist')
    cy.get(`[data-testid="patient-table-row-${MOCK_PATIENT_ID}"]`).should('exist')
  })

  it('shows error message when deletion fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getPatients')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 500,
      body: { status: 500, title: 'Internal Server Error' },
    }).as('deletePatient')

    visitClinic('/patients', mockAuthUser)
    cy.wait('@getPatients')
    cy.get(`[data-testid="patient-delete-button-${MOCK_PATIENT_ID}"]`).click()
    cy.get('[data-testid="delete-patient-dialog-confirm"]').click()
    cy.wait('@deletePatient')
    cy.get('[data-testid="delete-patient-dialog"]').should('not.exist')
    cy.get(`[data-testid="patient-table-row-${MOCK_PATIENT_ID}"]`).should('exist')
  })

  it('confirms deletion and shows success message', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getPatients')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deletePatient')

    visitClinic('/patients', mockAuthUser)
    cy.wait('@getPatients')
    cy.get(`[data-testid="patient-delete-button-${MOCK_PATIENT_ID}"]`).click()
    cy.get('[data-testid="delete-patient-dialog-confirm"]').click()
    cy.wait('@deletePatient')
    cy.get('[data-testid="patient-list-success"]').should('be.visible')
    cy.get('[data-testid="patient-list-success"]').should('contain', mockPatient.user.fullName)
  })

  it('deleted patient no longer appears in list', () => {
    let callCount = 0
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, (req) => {
      callCount++
      req.reply({
        statusCode: 200,
        body: callCount === 1 ? populatedListResponse : emptyListResponse,
      })
    }).as('getPatients')

    cy.intercept('DELETE', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deletePatient')

    visitClinic('/patients', mockAuthUser)
    cy.wait('@getPatients')
    cy.get(`[data-testid="patient-delete-button-${MOCK_PATIENT_ID}"]`).click()
    cy.get('[data-testid="delete-patient-dialog-confirm"]').click()
    cy.wait('@deletePatient')
    cy.wait('@getPatients')
    cy.get(`[data-testid="patient-table-row-${MOCK_PATIENT_ID}"]`).should('not.exist')
    cy.get('[data-testid="patient-list-empty"]').should('be.visible')
  })

  it('delete from details page navigates back to list', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 10 },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getPatients')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deletePatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-delete-button"]').click()
    cy.get('[data-testid="delete-patient-dialog-confirm"]').click()
    cy.wait('@deletePatient')
    expectClinicPath('/patients')
  })
})

export {}
