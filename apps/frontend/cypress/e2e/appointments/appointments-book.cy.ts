import { visitClinic } from '../../support/clinic'

const DOC_UUID = '00000000-0000-4000-b000-000000000001'
const PATIENT_UUID = '00000000-0000-4000-e000-000000000001'

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

const mockAvailability = {
  doctorId: DOC_UUID,
  date: '2025-07-04',
  slots: [
    { startTime: '09:00', endTime: '09:30', scheduleId: 'sched-uuid', slotDurationInMinutes: 30 },
  ],
}

const mockPatientsList = {
  data: [
    {
      id: PATIENT_UUID,
      user: { id: 'patient-user-uuid', fullName: 'Patient One', email: 'patient@test.com', isActive: true },
      fullName: 'Patient One',
      phoneNumber: '11999999999',
      birthDate: '1990-01-01',
      documentNumber: '12345678901',
      gender: 'male',
      createdAt: '2025-01-01T10:00:00.000Z',
      updatedAt: '2025-01-01T10:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 200,
}

const mockCreatedAppointment = {
  id: 'new-appt-uuid',
  doctorId: DOC_UUID,
  doctorName: 'Dr. Test',
  patientId: PATIENT_UUID,
  patientName: 'Patient One',
  scheduleId: 'sched-uuid',
  date: '2025-07-04',
  startTime: '09:00',
  endTime: '09:30',
  status: 'scheduled',
  reason: null,
  cancellationReason: null,
  createdAt: '2025-07-01T10:00:00.000Z',
  updatedAt: '2025-07-01T10:00:00.000Z',
}

describe('Appointments — book', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, { statusCode: 200, body: mockDoctorsList }).as('getDoctors')
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/availability*`, { statusCode: 200, body: mockAvailability }).as('getAvailability')
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 100 } }).as('getAppointments')
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, { statusCode: 200, body: mockPatientsList }).as('getPatients')
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedule-exceptions*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 20 } })
    visitClinic('/appointments', mockDoctorUser)
    // Navigate 2 weeks forward so all slots are definitively in the future
    cy.get('[data-testid="toolbar-next"]', { timeout: 10000 }).click()
    cy.get('[data-testid="toolbar-next"]').click()
  })

  it('DOCTOR clicks free slot and sees BookAppointmentDialog', () => {
    cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 }).first().click()

    cy.get('[data-testid="book-appointment-dialog"]').should('be.visible')
    cy.get('[data-testid="book-dialog-time"]').should('contain.text', '09:00')
  })

  it('shows validation error when submitting without selecting patient', () => {
    cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 }).first().click()
    cy.get('[data-testid="book-dialog-submit"]').click()

    cy.get('[data-testid="book-dialog-patient-error"]').should('be.visible')
  })

  it('DOCTOR books appointment successfully and dialog closes', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/appointments`, {
      statusCode: 201,
      body: mockCreatedAppointment,
    }).as('bookAppointment')

    cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 }).first().click()
    cy.get('[data-testid="book-dialog-patient"]').select(PATIENT_UUID)
    cy.get('[data-testid="book-dialog-submit"]').click()

    cy.wait('@bookAppointment')
    cy.get('[data-testid="book-appointment-dialog"]').should('not.exist')
  })

  it('shows 409 conflict error when slot is double-booked', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/appointments`, {
      statusCode: 409,
      body: { title: 'Conflict', detail: 'Slot already taken' },
    }).as('bookConflict')

    cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 }).first().click()
    cy.get('[data-testid="book-dialog-patient"]').select(PATIENT_UUID)
    cy.get('[data-testid="book-dialog-submit"]').click()

    cy.wait('@bookConflict')
    cy.get('[data-testid="book-dialog-error"]').should('contain.text', 'acabou de ser reservado')
  })

  it('cancels dialog without booking', () => {
    cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 }).first().click()
    cy.get('[data-testid="book-dialog-cancel"]').click()

    cy.get('[data-testid="book-appointment-dialog"]').should('not.exist')
  })
})
