import { visitClinic } from '../../support/clinic'

const DOCTOR_UUID = '00000000-0000-4000-b000-000000000001'
const APPT_UUID = '00000000-0000-4000-c000-000000000001'
const SPEC_UUID = '00000000-0000-4000-d000-000000000001'
const TPL_UUID = '00000000-0000-4000-e000-000000000001'
const RECORD_UUID = '00000000-0000-4000-f000-000000000001'

const mockDoctorUser = {
  id: 'doctor-user-uuid',
  fullName: 'Dr. João',
  email: 'doctor@pulso.center',
  role: 'doctor',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const mockSchemaSnapshot = [
  {
    key: 'symptom',
    label: 'Sintoma',
    type: 'text',
    required: true,
    order: 0,
    options: null,
    placeholder: null,
    helpText: null,
    canonical: false,
    canonicalKey: null,
  },
  {
    key: 'chronic',
    label: 'Condição crônica',
    type: 'boolean',
    required: false,
    order: 1,
    options: null,
    placeholder: null,
    helpText: null,
    canonical: false,
    canonicalKey: null,
  },
]

const mockRecord = {
  id: RECORD_UUID,
  appointmentId: APPT_UUID,
  patientId: 'patient-uuid',
  patientName: 'Ana Lima',
  doctorId: DOCTOR_UUID,
  doctorName: 'Dr. João',
  specialtyId: SPEC_UUID,
  specialtyName: 'Cardiologia',
  templateId: TPL_UUID,
  templateSchemaSnapshot: mockSchemaSnapshot,
  data: { symptom: 'Dor no peito', chronic: false },
  notes: 'Paciente estável',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockAppointment = {
  id: APPT_UUID,
  doctorId: DOCTOR_UUID,
  doctorName: 'Dr. João',
  patientId: 'patient-uuid',
  patientName: 'Ana Lima',
  specialtyId: SPEC_UUID,
  specialtyName: 'Cardiologia',
  scheduleId: 'sched-uuid',
  date: '2099-12-01',
  startTime: '09:00',
  endTime: '09:30',
  status: 'completed',
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

describe('Medical Record View', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: {
        data: [{
          id: DOCTOR_UUID,
          user: { id: 'doctor-user-uuid', fullName: 'Dr. João', email: 'doctor@pulso.center', isActive: true },
          crmNumber: '12345/SP',
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
      body: mockRecord,
    }).as('getRecord')
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

    visitClinic(`/appointments/${APPT_UUID}`, mockDoctorUser)
  })

  it('shows medical record content when record exists', () => {
    cy.wait('@getAppointment')
    cy.wait('@getRecord')

    cy.get('[data-testid="tab-prontuario"]').click()

    cy.get('[data-testid="medical-record-view"]').should('be.visible')
  })

  it('displays field values in correct order', () => {
    cy.wait('@getAppointment')
    cy.wait('@getRecord')

    cy.get('[data-testid="tab-prontuario"]').click()

    cy.get('[data-testid="medical-record-view"]').within(() => {
      cy.get('[data-testid="record-field-symptom"]').should('contain.text', 'Dor no peito')
      cy.get('[data-testid="record-field-chronic"]').should('contain.text', 'Não')
    })
  })

  it('shows notes when present', () => {
    cy.wait('@getAppointment')
    cy.wait('@getRecord')

    cy.get('[data-testid="tab-prontuario"]').click()

    cy.get('[data-testid="record-notes"]').should('contain.text', 'Paciente estável')
  })

  it('does not show edit-medical-record button for completed appointment', () => {
    cy.wait('@getAppointment')
    cy.wait('@getRecord')

    cy.get('[data-testid="tab-prontuario"]').click()

    cy.get('[data-testid="edit-medical-record-button"]').should('not.exist')
  })
})
