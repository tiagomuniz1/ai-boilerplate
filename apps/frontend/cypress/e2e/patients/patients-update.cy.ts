import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const MOCK_PATIENT_ID = 'cccccccc-1111-1111-1111-000000000001'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockPatient = {
  id: MOCK_PATIENT_ID,
  user: { id: 'user-uuid-1', fullName: 'Paciente Original', email: 'original@test.com', isActive: true },
  phoneNumber: '11999999999',
  birthDate: '1990-05-15',
  documentNumber: '12345678901',
  gender: 'male',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const mockUpdatedPatient = {
  ...mockPatient,
  user: { ...mockPatient.user, fullName: 'Paciente Atualizado', email: 'atualizado@test.com' },
}

describe('Patients Update', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows skeleton while loading patient data', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: mockPatient })
    }).as('getPatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}/edit`, mockAuthUser)
    cy.get('[data-testid="edit-patient-skeleton"]').should('be.visible')
    cy.wait('@getPatient')
    cy.get('[data-testid="edit-patient-skeleton"]').should('not.exist')
  })

  it('shows pre-filled form with current patient data', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}/edit`, mockAuthUser)
    cy.wait('@getPatient')

    cy.get('[data-testid="patient-form-fullname"]').should('have.value', mockPatient.user.fullName)
    cy.get('[data-testid="patient-form-email"]').should('have.value', mockPatient.user.email)
    cy.get('[data-testid="patient-form-phone"]').should('have.value', '(11) 99999-9999')
    cy.get('[data-testid="patient-form-document"]').should('have.value', '123.456.789-01')
    cy.get('[data-testid="patient-form-gender"]').should('have.value', mockPatient.gender)
  })

  it('shows load error when patient does not exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'Patient not found' },
    }).as('getPatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}/edit`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="edit-patient-load-error"]').should('be.visible')
    cy.get('[data-testid="patient-form"]').should('not.exist')
  })

  it('shows conflict error when updating to an already existing email', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Email already in use' },
    }).as('updatePatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}/edit`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-form-email"]').clear().type('outro@test.com')
    cy.get('[data-testid="patient-form-submit"]').click()
    cy.wait('@updatePatient')
    cy.get('[data-testid="patient-form-error"]').should('be.visible')
  })

  it('cancel button returns without saving changes', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}/edit`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-form-fullname"]').clear().type('Nome não salvo')
    cy.get('[data-testid="edit-patient-back-button"]').click()
    expectClinicPath(`/patients/${MOCK_PATIENT_ID}`)
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, (req) => {
      req.reply({ delay: 2000, statusCode: 200, body: mockUpdatedPatient })
    }).as('updatePatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}/edit`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-form-fullname"]').clear().type('Nome Novo')
    cy.get('[data-testid="patient-form-submit"]').click()
    cy.get('[data-testid="patient-form-submit"]').should('be.disabled')
    cy.wait('@updatePatient')
  })

  // Real-backend happy path lives in patients-happy-path-real.cy.ts — this
  // file stays focused on client-side validation and mocked error/loading states.

  it('shows details page correctly after navigating from list', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: { data: [mockPatient], total: 1, page: 1, limit: 20 },
    }).as('getPatients')
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    }).as('getMedicalHistory')

    visitClinic('/patients', mockAuthUser)
    cy.wait('@getPatients')
    cy.get(`[data-testid="patient-view-link-${MOCK_PATIENT_ID}"]`).click()
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details"]').should('be.visible')
    cy.get('[data-testid="patient-details-name"]').should('contain', mockPatient.user.fullName)
  })
})

export {}
