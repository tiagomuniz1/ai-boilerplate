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

const mockPastScheduledAppointment = {
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

describe('Appointments — complete', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    // Sem ficha de profissional: o default para quem só administra ou recepciona.
    // O glob `/professionals*` não cobre esta rota — `*` não atravessa a barra.
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, { statusCode: 200, body: null })
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, { statusCode: 200, body: mockProfessionalsList })
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
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-certificates*`, {
      statusCode: 200,
      body: [],
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/exam-requests*`, {
      statusCode: 200,
      body: [],
    })
    // A página de detalhe monta a aba de fotos; sem stub a chamada dá 401 e o
    // interceptor do api-client joga o app num loop de redirect login/dashboard.
    cy.intercept('GET', `${Cypress.env('API_URL')}/consultation-photos*`, { statusCode: 200, body: [] })
  })

  it('ADMIN sees complete button on appointment detail page', () => {
    visitClinic(`/appointments/${APPT_UUID}`, mockAdminUser)

    cy.get('[data-testid="appointment-detail-complete-button"]').should('be.visible')
  })

  it('cancels the complete confirmation dialog without completing', () => {
    visitClinic(`/appointments/${APPT_UUID}`, mockAdminUser)

    cy.get('[data-testid="appointment-detail-complete-button"]').click()
    cy.get('[data-testid="complete-appointment-dialog"]').should('be.visible')
    cy.get('[data-testid="complete-dialog-cancel"]').click()
    cy.get('[data-testid="complete-appointment-dialog"]').should('not.exist')
    cy.get('[data-testid="appointment-detail-status"]').should('contain', 'Agendada')
  })

  // Real-backend happy path (completes a real past appointment, rejects a
  // real future one with 422) lives in appointments-happy-path-real.cy.ts.
})
