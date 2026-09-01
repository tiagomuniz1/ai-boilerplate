import { visitClinic, CLINIC_ID } from '../../support/clinic'

const DOC_UUID = '00000000-0000-4000-b000-000000000001'
const OTHER_DOC_UUID = '00000000-0000-4000-b000-000000000002'
const APPT_UUID = '00000000-0000-4000-d000-000000000001'

const mockAdminUser = {
  id: 'admin-uuid',
  fullName: 'Admin User',
  email: 'admin@pulso.center',
  role: 'admin',
  clinicId: CLINIC_ID,
}

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. Test',
  email: 'professional@pulso.center',
  role: 'professional',
  clinicId: CLINIC_ID,
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
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  date: '2025-06-10',
  startTime: '09:00',
  endTime: '09:30',
  status: 'scheduled',
  insuranceType: null,
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

const mockCandidates = [
  { professionalId: OTHER_DOC_UUID, professionalName: 'Dr. Beto', specialtyName: 'Cardiologia' },
]

const mockReassignedAppointment = {
  ...mockScheduledAppointment,
  professionalId: OTHER_DOC_UUID,
  professionalName: 'Dr. Beto',
}

describe('Appointments — reassign professional', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    // Sem ficha de profissional: o default para quem só administra ou recepciona.
    // O glob `/professionals*` não cobre esta rota — `*` não atravessa a barra.
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, { statusCode: 200, body: null })
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
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-certificates*`, { statusCode: 200, body: [] })
    cy.intercept('GET', `${Cypress.env('API_URL')}/exam-requests*`, { statusCode: 200, body: [] })
    cy.intercept('GET', `${Cypress.env('API_URL')}/consultation-photos*`, { statusCode: 200, body: [] })
  })

  it('ADMIN sees the reassign button; PROFESSIONAL does not', () => {
    visitClinic(`/appointments/${APPT_UUID}`, mockAdminUser)
    cy.get('[data-testid="appointment-detail-reassign-button"]').should('be.visible')

    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
    cy.get('[data-testid="appointment-detail-reassign-button"]').should('not.exist')
  })

  it('opens the dialog and lists eligible candidates', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}/reassign-candidates`, {
      statusCode: 200,
      body: mockCandidates,
    }).as('getCandidates')

    visitClinic(`/appointments/${APPT_UUID}`, mockAdminUser)

    cy.get('[data-testid="appointment-detail-reassign-button"]').click()
    cy.get('[data-testid="reassign-professional-dialog"]').should('be.visible')
    cy.wait('@getCandidates')
    cy.get('[data-testid="reassign-professional-select"]').find('option').should('have.length', 2)
  })

  it('reassigns to the selected professional and closes the dialog', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}/reassign-candidates`, {
      statusCode: 200,
      body: mockCandidates,
    }).as('getCandidates')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}/reassign`, {
      statusCode: 200,
      body: mockReassignedAppointment,
    }).as('reassignAppointment')

    visitClinic(`/appointments/${APPT_UUID}`, mockAdminUser)

    cy.get('[data-testid="appointment-detail-reassign-button"]').click()
    cy.wait('@getCandidates')
    cy.get('[data-testid="reassign-professional-select"]').select(OTHER_DOC_UUID)
    cy.get('[data-testid="reassign-dialog-confirm"]').click()

    cy.wait('@reassignAppointment').its('request.body').should('deep.equal', {
      professionalId: OTHER_DOC_UUID,
    })
    cy.get('[data-testid="reassign-professional-dialog"]').should('not.exist')
  })

  it('shows an empty state when no professional is available', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}/reassign-candidates`, {
      statusCode: 200,
      body: [],
    }).as('getCandidates')

    visitClinic(`/appointments/${APPT_UUID}`, mockAdminUser)

    cy.get('[data-testid="appointment-detail-reassign-button"]').click()
    cy.wait('@getCandidates')
    cy.get('[data-testid="reassign-empty"]').should('be.visible')
    cy.get('[data-testid="reassign-dialog-confirm"]').should('be.disabled')
  })

  it('closes the dialog when clicking Voltar', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}/reassign-candidates`, {
      statusCode: 200,
      body: mockCandidates,
    }).as('getCandidates')

    visitClinic(`/appointments/${APPT_UUID}`, mockAdminUser)

    cy.get('[data-testid="appointment-detail-reassign-button"]').click()
    cy.get('[data-testid="reassign-dialog-cancel"]').click()
    cy.get('[data-testid="reassign-professional-dialog"]').should('not.exist')
    cy.get('[data-testid="appointment-detail-reassign-button"]').should('be.visible')
  })
})
