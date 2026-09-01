import { visitClinic } from '../../support/clinic'

const DOC_UUID = '00000000-0000-4000-b000-000000000001'
const PATIENT_UUID = '00000000-0000-4000-e000-000000000001'
const SPEC_UUID_1 = '00000000-0000-4000-d000-000000000001'
const SPEC_UUID_2 = '00000000-0000-4000-d000-000000000002'

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. Test',
  email: 'professional@pulso.center',
  role: 'professional',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const makeProfessional = (specialties: { id: string; name: string }[]) => ({
  id: DOC_UUID,
  user: { id: 'professional-user-uuid', fullName: 'Dr. Test', email: 'professional@pulso.center', isActive: true },
  registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345/SP', state: 'SP', isPrimary: true }],
  specialties,
  bio: null,
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z',
})

const mockProfessionalsList = {
  data: [makeProfessional([{ id: SPEC_UUID_1, name: 'Cardiologia' }])],
  total: 1,
  page: 1,
  limit: 200,
}

const mockAvailability = {
  professionalId: DOC_UUID,
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
  professionalId: DOC_UUID,
  professionalName: 'Dr. Test',
  patientId: PATIENT_UUID,
  patientName: 'Patient One',
  specialtyId: SPEC_UUID_1,
  specialtyName: 'Cardiologia',
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
    // A ficha do próprio usuário: neste spec ele é o profissional.
    // O glob `/professionals*` não cobre esta rota — `*` não atravessa a barra.
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, { statusCode: 200, body: mockProfessionalsList.data[0] })
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, { statusCode: 200, body: mockProfessionalsList }).as('getProfessionals')
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${DOC_UUID}`, { statusCode: 200, body: makeProfessional([{ id: SPEC_UUID_1, name: 'Cardiologia' }]) }).as('getProfessional')
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/availability*`, { statusCode: 200, body: mockAvailability }).as('getAvailability')
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 100 } }).as('getAppointments')
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, { statusCode: 200, body: mockPatientsList }).as('getPatients')
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedule-exceptions*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 20 } })
    visitClinic('/appointments', mockProfessionalUser)
    // Navigate 2 weeks forward so all slots are definitively in the future
    cy.get('[data-testid="toolbar-next"]', { timeout: 10000 }).click()
    cy.get('[data-testid="toolbar-next"]').click()
  })

  it('PROFESSIONAL clicks free slot and sees BookAppointmentDialog', () => {
    cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 }).first().click()

    cy.get('[data-testid="book-appointment-dialog"]').should('be.visible')
    cy.get('[data-testid="book-dialog-time"]').should('contain.text', '09:00')
  })

  it('shows validation error when submitting without selecting patient', () => {
    cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 }).first().click()
    cy.get('[data-testid="book-dialog-submit"]').click()

    cy.get('[data-testid="book-dialog-patient-error"]').should('be.visible')
  })

  // Real-backend happy path (slot derived from the professional's actual
  // schedule) lives in appointments-happy-path-real.cy.ts.

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

  it('ADMIN books appointment with single-specialty professional without choosing specialty', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${DOC_UUID}`, {
      statusCode: 200,
      body: makeProfessional([{ id: SPEC_UUID_1, name: 'Cardiologia' }]),
    }).as('getProfessionalSingle')

    cy.intercept('POST', `${Cypress.env('API_URL')}/appointments`, {
      statusCode: 201,
      body: mockCreatedAppointment,
    }).as('bookAppointment')

    cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 }).first().click()

    cy.get('[data-testid="book-dialog-specialty-readonly"]', { timeout: 5000 }).should('contain.text', 'Cardiologia')
    cy.get('[data-testid="book-dialog-specialty"]').should('not.exist')

    cy.get('[data-testid="book-dialog-patient"]').select(PATIENT_UUID)
    cy.get('[data-testid="book-dialog-submit"]').click()

    cy.wait('@bookAppointment').its('request.body').should('include', { specialtyId: SPEC_UUID_1 })
    cy.get('[data-testid="book-appointment-dialog"]').should('not.exist')
  })

  it('ADMIN books appointment with multi-specialty professional by choosing specialty', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${DOC_UUID}`, {
      statusCode: 200,
      body: makeProfessional([
        { id: SPEC_UUID_1, name: 'Cardiologia' },
        { id: SPEC_UUID_2, name: 'Clínica Geral' },
      ]),
    }).as('getProfessionalMulti')

    cy.intercept('POST', `${Cypress.env('API_URL')}/appointments`, {
      statusCode: 201,
      body: { ...mockCreatedAppointment, specialtyId: SPEC_UUID_2, specialtyName: 'Clínica Geral' },
    }).as('bookAppointment')

    cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 }).first().click()

    cy.get('[data-testid="book-dialog-specialty"]', { timeout: 5000 }).should('be.visible')
    cy.get('[data-testid="book-dialog-patient"]').select(PATIENT_UUID)
    cy.get('[data-testid="book-dialog-submit"]').click()
    cy.get('[data-testid="book-dialog-specialty-error"]').should('be.visible')

    cy.get('[data-testid="book-dialog-specialty"]').select(SPEC_UUID_2)
    cy.get('[data-testid="book-dialog-reason"]').type('Consulta de rotina')
    cy.get('[data-testid="book-dialog-submit"]').click()

    cy.wait('@bookAppointment').its('request.body').should('include', { specialtyId: SPEC_UUID_2, reason: 'Consulta de rotina' })
    cy.get('[data-testid="book-appointment-dialog"]').should('not.exist')
  })
})
