import { visitClinic } from '../../support/clinic'

const PROFESSIONAL_UUID = '00000000-0000-4000-b000-000000000001'
const APPT_UUID = '00000000-0000-4000-c000-000000000001'
const SPEC_UUID = '00000000-0000-4000-d000-000000000001'
const EXAM_REQUEST_UUID = '00000000-0000-4000-a000-000000000001'

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. João',
  email: 'professional@pulso.center',
  role: 'professional',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const mockAppointment = {
  id: APPT_UUID,
  professionalId: PROFESSIONAL_UUID,
  professionalName: 'Dr. João',
  patientId: 'patient-uuid',
  patientName: 'Ana Lima',
  specialtyId: SPEC_UUID,
  specialtyName: 'Cardiologia',
  scheduleId: 'sched-uuid',
  date: '2099-12-01',
  startTime: '09:00',
  endTime: '09:30',
  status: 'scheduled',
  reason: null,
  cancellationReason: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  patient: {
    fullName: 'Ana Lima',
    email: 'ana@test.com',
    phoneNumber: '11999990001',
    birthDate: '1990-01-01',
    documentNumber: '12345678901',
    gender: 'female',
  },
}

describe('Exames — Delete', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: {
        data: [{
          id: PROFESSIONAL_UUID,
          user: { id: 'professional-user-uuid', fullName: 'Dr. João', email: 'professional@pulso.center', isActive: true },
          registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345/SP', state: 'SP', isPrimary: true }],
          specialties: [{ id: SPEC_UUID, name: 'Cardiologia' }],
          bio: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
        total: 1,
        page: 1,
        limit: 200,
      },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}`, {
      statusCode: 200,
      body: mockAppointment,
    }).as('getAppointment')
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records/by-appointment/${APPT_UUID}`, {
      statusCode: 200,
      body: null,
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 1 },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/prescriptions*`, {
      statusCode: 200,
      body: [],
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-certificates*`, {
      statusCode: 200,
      body: [],
    })
  })

  it('PROFESSIONAL deletes an exam request and it disappears from the list', () => {
    cy.fixture('exames.json').then((examRequest) => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/exam-requests*`, {
        statusCode: 200,
        body: [examRequest],
      }).as('getExamRequests')
    })

    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)

    cy.wait('@getAppointment')
    cy.wait('@getExamRequests')

    cy.get('[data-testid="tab-exames"]').click()
    cy.get(`[data-testid="exame-item-${EXAM_REQUEST_UUID}"]`).should('be.visible')

    cy.intercept('DELETE', `${Cypress.env('API_URL')}/exam-requests/${EXAM_REQUEST_UUID}`, {
      statusCode: 204,
    }).as('deleteExamRequest')

    // After the delete the section invalidates and refetches the list — the mock
    // now needs to return an empty array for the UI to reflect the removal.
    cy.intercept('GET', `${Cypress.env('API_URL')}/exam-requests*`, {
      statusCode: 200,
      body: [],
    }).as('getExamRequestsAfterDelete')

    cy.get(`[data-testid="exame-delete-button-${EXAM_REQUEST_UUID}"]`).click()
    cy.get('[data-testid="exame-delete-dialog"]').should('be.visible')
    cy.get('[data-testid="exame-delete-dialog-confirm"]').click()

    cy.wait('@deleteExamRequest')
    cy.wait('@getExamRequestsAfterDelete')

    cy.get(`[data-testid="exame-item-${EXAM_REQUEST_UUID}"]`).should('not.exist')
    cy.get('[data-testid="exame-section-empty"]').should('be.visible')
  })
})
