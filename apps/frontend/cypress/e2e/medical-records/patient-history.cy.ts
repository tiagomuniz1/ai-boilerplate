import { visitClinic } from '../../support/clinic'

const PATIENT_UUID = '00000000-0000-4000-e000-000000000001'
const PROFESSIONAL_UUID = '00000000-0000-4000-b000-000000000001'
const SPEC_UUID = '00000000-0000-4000-d000-000000000001'

const mockAdminUser = {
  id: 'admin-user-uuid',
  fullName: 'Admin User',
  email: 'admin@pulso.center',
  role: 'admin',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const makeRecord = (id: string, date: string) => ({
  id,
  appointmentId: `appt-${id}`,
  patientId: PATIENT_UUID,
  patientName: 'Ana Lima',
  professionalId: PROFESSIONAL_UUID,
  professionalName: 'Dr. João',
  specialtyId: SPEC_UUID,
  specialtyName: 'Cardiologia',
  templateId: 'tpl-uuid',
  templateSchemaSnapshot: [],
  data: {},
  notes: null,
  createdAt: `${date}T10:00:00.000Z`,
  updatedAt: `${date}T10:00:00.000Z`,
})

const mockPatient = {
  id: PATIENT_UUID,
  user: { id: 'patient-user-uuid', fullName: 'Ana Lima', email: 'ana@test.com', isActive: true },
  fullName: 'Ana Lima',
  phoneNumber: '11999999999',
  birthDate: '1990-01-01',
  documentNumber: '12345678901',
  gender: 'female',
  // The kinship fields are required by PatientResponseDto and the detail page
  // reads `dependents.length` straight from the mapper. Omitting them here threw
  // "Cannot read properties of undefined" inside the app, which Cypress reports
  // as an uncaught application error with no hint about the stale fixture.
  responsiblePatientId: null,
  kinshipType: null,
  responsiblePatient: null,
  dependents: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockPaginatedPatients = { data: [mockPatient], total: 1, page: 1, limit: 200 }

describe('Patient Medical History', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${PATIENT_UUID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: mockPaginatedPatients,
    }).as('getPatients')
    // Stubs the photo gallery the detail page also mounts; the medical-records
    // intercept right below overrides this command's empty default.
    cy.stubPatientDetailWidgets()
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records*`, {
      statusCode: 200,
      body: {
        data: [makeRecord('r1', '2024-03-15'), makeRecord('r2', '2024-02-10')],
        total: 2,
        page: 1,
        limit: 10,
      },
    }).as('getHistory')

    visitClinic('/patients', mockAdminUser)
  })

  it('shows empty state when no medical records exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 10 },
    }).as('emptyHistory')

    cy.visit(`/pulso/patients/${PATIENT_UUID}`)
    cy.wait('@getPatient')

    cy.get('[data-testid="patient-history-empty"]').should('be.visible')
  })

  it('lists medical records in the patient history', () => {
    cy.visit(`/pulso/patients/${PATIENT_UUID}`)
    cy.wait('@getPatient')
    cy.wait('@getHistory')

    cy.get('[data-testid="history-card"]').should('have.length', 2)
  })

  it('shows specialty and professional name on each history card', () => {
    cy.visit(`/pulso/patients/${PATIENT_UUID}`)
    cy.wait('@getPatient')
    cy.wait('@getHistory')

    cy.get('[data-testid="history-card-specialty"]').first().should('contain.text', 'Cardiologia')
    cy.get('[data-testid="history-card-professional"]').first().should('contain.text', 'Dr. João')
  })

  it('shows a skeleton while loading, then an error state on failure', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 10 },
      delay: 500,
    }).as('getHistorySlow')

    cy.visit(`/pulso/patients/${PATIENT_UUID}`)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-history-skeleton"]').should('be.visible')
    cy.wait('@getHistorySlow')
    cy.get('[data-testid="patient-history-skeleton"]').should('not.exist')

    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records*`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('getHistoryError')
    cy.reload()
    cy.wait('@getPatient')
    cy.wait('@getHistoryError')
    cy.get('[data-testid="patient-history-error"]').should('be.visible')
  })

  it('shows a loading state in the record detail modal', () => {
    cy.visit(`/pulso/patients/${PATIENT_UUID}`)
    cy.wait('@getPatient')
    cy.wait('@getHistory')

    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records/r1`, {
      statusCode: 200,
      body: makeRecord('r1', '2024-03-15'),
      delay: 500,
    }).as('getRecordSlow')
    cy.get('[data-testid="history-card"]').first().click()
    cy.get('[data-testid="record-detail-loading"]').should('be.visible')
    cy.wait('@getRecordSlow')
    cy.get('[data-testid="record-detail-loading"]').should('not.exist')
  })
})
