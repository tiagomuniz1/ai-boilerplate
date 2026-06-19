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
  date: '2025-06-10',
  startTime: '09:00',
  endTime: '09:30',
  status: 'scheduled',
  reason: 'Rotina',
  cancellationReason: null,
  createdAt: '2025-06-01T10:00:00.000Z',
  updatedAt: '2025-06-01T10:00:00.000Z',
}

const mockCompletedAppointment = {
  ...mockPastScheduledAppointment,
  status: 'completed',
}

const mockPaginatedWithBooked = {
  data: [mockPastScheduledAppointment],
  total: 1,
  page: 1,
  limit: 100,
}

describe('Appointments — complete', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, { statusCode: 200, body: mockDoctorsList })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/availability*`, {
      statusCode: 200,
      body: { doctorId: DOC_UUID, date: '2025-06-10', slots: [] },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}`, {
      statusCode: 200,
      body: mockPastScheduledAppointment,
    }).as('getAppointment')
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments*`, {
      statusCode: 200,
      body: mockPaginatedWithBooked,
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 200 },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedule-exceptions*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })
  })

  it('ADMIN clicks booked slot and sees complete button', () => {
    visitClinic('/appointments', mockAdminUser)

    cy.get('[data-testid="toolbar-doctor-select"]').select(DOC_UUID)
    cy.get('[data-testid="agenda-slot-booked"]', { timeout: 10000 }).first().click()

    cy.get('[data-testid="appointment-details-dialog"]').should('be.visible')
    cy.get('[data-testid="details-complete-button"]').should('be.visible')
  })

  it('ADMIN completes appointment and dialog closes', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}/complete`, {
      statusCode: 200,
      body: mockCompletedAppointment,
    }).as('completeAppointment')

    visitClinic('/appointments', mockAdminUser)

    cy.get('[data-testid="toolbar-doctor-select"]').select(DOC_UUID)
    cy.get('[data-testid="agenda-slot-booked"]', { timeout: 10000 }).first().click()
    cy.get('[data-testid="details-complete-button"]').click()

    cy.wait('@completeAppointment')
    cy.get('[data-testid="appointment-details-dialog"]').should('not.exist')
  })

  it('shows error when trying to complete a future appointment', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}/complete`, {
      statusCode: 422,
      body: { title: 'Unprocessable', detail: 'Cannot complete a future appointment' },
    }).as('completeFail')

    visitClinic('/appointments', mockAdminUser)

    cy.get('[data-testid="toolbar-doctor-select"]').select(DOC_UUID)
    cy.get('[data-testid="agenda-slot-booked"]', { timeout: 10000 }).first().click()
    cy.get('[data-testid="details-complete-button"]').click()

    cy.wait('@completeFail')
    cy.get('[data-testid="details-complete-error"]').should('contain.text', 'futura')
    cy.get('[data-testid="appointment-details-dialog"]').should('be.visible')
  })
})
