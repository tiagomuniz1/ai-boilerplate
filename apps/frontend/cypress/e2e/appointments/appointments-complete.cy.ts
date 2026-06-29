import { visitClinic } from '../../support/clinic'

const DOC_UUID = '00000000-0000-4000-b000-000000000001'
const APPT_UUID = '00000000-0000-4000-d000-000000000001'

const mockAdminUser = {
  id: 'admin-uuid',
  fullName: 'Admin User',
  email: 'admin@pulso.center',
  role: 'admin',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const mockDoctorsList = {
  data: [
    {
      id: DOC_UUID,
      user: { id: 'doctor-user-uuid', fullName: 'Dr. Test', email: 'doctor@pulso.center', isActive: true },
      crmNumber: '12345/SP',
      specialties: [],
      bio: null,
      createdAt: '2025-01-01T10:00:00.000Z',
      updatedAt: '2025-01-01T10:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 200,
}

const mockPastScheduledAppointment = {
  id: APPT_UUID,
  doctorId: DOC_UUID,
  doctorName: 'Dr. Test',
  patientId: 'patient-uuid',
  patientName: 'Patient One',
  scheduleId: 'sched-uuid',
  specialtyId: null,
  specialtyName: null,
  date: '2025-06-10',
  startTime: '09:00',
  endTime: '09:30',
  status: 'scheduled',
  reason: 'Rotina',
  cancellationReason: null,
  createdAt: '2025-06-01T10:00:00.000Z',
  updatedAt: '2025-06-01T10:00:00.000Z',
  patient: {
    fullName: 'Patient One',
    email: 'patient@test.com',
    phoneNumber: '11999990001',
    birthDate: '1990-01-01',
    documentNumber: '12345678901',
    gender: 'male',
  },
}

const mockCompletedAppointment = {
  ...mockPastScheduledAppointment,
  status: 'completed',
}

describe('Appointments — complete', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, { statusCode: 200, body: mockDoctorsList })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}`, {
      statusCode: 200,
      body: mockPastScheduledAppointment,
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
      body: { data: [], total: 0, page: 1, limit: 20 },
    })
  })

  it('ADMIN sees complete button on appointment detail page', () => {
    visitClinic(`/appointments/${APPT_UUID}`, mockAdminUser)

    cy.get('[data-testid="appointment-detail-complete-button"]').should('be.visible')
  })

  it('ADMIN completes appointment successfully', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}/complete`, {
      statusCode: 200,
      body: mockCompletedAppointment,
    }).as('completeAppointment')

    visitClinic(`/appointments/${APPT_UUID}`, mockAdminUser)

    cy.get('[data-testid="appointment-detail-complete-button"]').click()

    cy.wait('@completeAppointment').its('response.statusCode').should('eq', 200)
  })

  it('shows error when trying to complete a future appointment', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}/complete`, {
      statusCode: 422,
      body: { title: 'Unprocessable', detail: 'Cannot complete a future appointment' },
    }).as('completeFail')

    visitClinic(`/appointments/${APPT_UUID}`, mockAdminUser)

    cy.get('[data-testid="appointment-detail-complete-button"]').click()

    cy.wait('@completeFail')
    cy.get('[data-testid="appointment-detail-complete-error"]').should('contain.text', 'futura')
    cy.get('[data-testid="appointment-detail-complete-button"]').should('be.visible')
  })
})
