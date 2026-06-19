import { visitClinic } from '../../support/clinic'

const DOC_UUID = '00000000-0000-4000-b000-000000000001'
const APPT_UUID = '00000000-0000-4000-d000-000000000001'

const mockDoctorUser = {
  id: 'doctor-user-uuid',
  fullName: 'Dr. Test',
  email: 'doctor@pulso.center',
  role: 'doctor',
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

const mockScheduledAppointment = {
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

const mockCancelledAppointment = {
  ...mockScheduledAppointment,
  status: 'cancelled',
  cancellationReason: 'Paciente remarcou',
}

const mockPaginatedWithBooked = {
  data: [mockScheduledAppointment],
  total: 1,
  page: 1,
  limit: 100,
}

describe('Appointments — cancel', () => {
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
      body: mockScheduledAppointment,
    }).as('getAppointment')
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments*`, {
      statusCode: 200,
      body: mockPaginatedWithBooked,
    }).as('getAppointments')
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 200 },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedule-exceptions*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })
  })

  it('DOCTOR clicks booked slot and sees details with cancel button', () => {
    visitClinic('/appointments', mockDoctorUser)

    cy.get('[data-testid="agenda-slot-booked"]', { timeout: 10000 }).first().click()

    cy.get('[data-testid="appointment-details-dialog"]').should('be.visible')
    cy.get('[data-testid="details-cancel-button"]').should('be.visible')
  })

  it('clicking cancel button opens CancelAppointmentDialog', () => {
    visitClinic('/appointments', mockDoctorUser)

    cy.get('[data-testid="agenda-slot-booked"]', { timeout: 10000 }).first().click()
    cy.get('[data-testid="details-cancel-button"]').click()

    cy.get('[data-testid="cancel-appointment-dialog"]').should('be.visible')
  })

  it('confirms cancellation and closes both dialogs', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}/cancel`, {
      statusCode: 200,
      body: mockCancelledAppointment,
    }).as('cancelAppointment')

    visitClinic('/appointments', mockDoctorUser)

    cy.get('[data-testid="agenda-slot-booked"]', { timeout: 10000 }).first().click()
    cy.get('[data-testid="details-cancel-button"]').click()
    cy.get('[data-testid="cancel-dialog-confirm"]').click()

    cy.wait('@cancelAppointment')
    cy.get('[data-testid="cancel-appointment-dialog"]').should('not.exist')
    cy.get('[data-testid="appointment-details-dialog"]').should('not.exist')
  })

  it('aborts cancellation when clicking close on cancel dialog', () => {
    visitClinic('/appointments', mockDoctorUser)

    cy.get('[data-testid="agenda-slot-booked"]', { timeout: 10000 }).first().click()
    cy.get('[data-testid="details-cancel-button"]').click()
    cy.get('[data-testid="cancel-dialog-cancel"]').click()

    cy.get('[data-testid="cancel-appointment-dialog"]').should('not.exist')
    cy.get('[data-testid="appointment-details-dialog"]').should('be.visible')
  })
})
