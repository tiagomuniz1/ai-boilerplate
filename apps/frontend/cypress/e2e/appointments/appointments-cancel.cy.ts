import { visitClinic } from '../../support/clinic'

const DOC_UUID = '00000000-0000-4000-b000-000000000001'
const APPT_UUID = '00000000-0000-4000-d000-000000000001'

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. Test',
  email: 'professional@pulso.center',
  role: 'professional',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const mockProfessionalsList = {
  data: [
    {
      id: DOC_UUID,
      user: { id: 'professional-user-uuid', fullName: 'Dr. Test', email: 'professional@pulso.center', isActive: true },
      registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345/SP', state: 'SP', isPrimary: true }],
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
  professionalId: DOC_UUID,
  professionalName: 'Dr. Test',
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

const mockCancelledAppointment = {
  ...mockScheduledAppointment,
  status: 'cancelled',
  cancellationReason: 'Paciente remarcou',
}

describe('Appointments — cancel', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, { statusCode: 200, body: mockProfessionalsList })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}`, {
      statusCode: 200,
      body: mockScheduledAppointment,
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
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-certificates*`, {
      statusCode: 200,
      body: [],
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/exam-requests*`, {
      statusCode: 200,
      body: [],
    })
  })

  it('PROFESSIONAL sees cancel button on appointment detail page', () => {
    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)

    cy.get('[data-testid="appointment-detail-cancel-button"]').should('be.visible')
  })

  it('clicking cancel button opens CancelAppointmentDialog', () => {
    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)

    cy.get('[data-testid="appointment-detail-cancel-button"]').click()

    cy.get('[data-testid="cancel-appointment-dialog"]').should('be.visible')
  })

  it('confirms cancellation and closes dialog', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}/cancel`, {
      statusCode: 200,
      body: mockCancelledAppointment,
    }).as('cancelAppointment')

    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)

    cy.get('[data-testid="appointment-detail-cancel-button"]').click()
    cy.get('[data-testid="cancel-dialog-confirm"]').click()

    cy.wait('@cancelAppointment')
    cy.get('[data-testid="cancel-appointment-dialog"]').should('not.exist')
  })

  it('aborts cancellation when clicking close on cancel dialog', () => {
    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)

    cy.get('[data-testid="appointment-detail-cancel-button"]').click()
    cy.get('[data-testid="cancel-dialog-cancel"]').click()

    cy.get('[data-testid="cancel-appointment-dialog"]').should('not.exist')
    cy.get('[data-testid="appointment-detail-cancel-button"]').should('be.visible')
  })
})
