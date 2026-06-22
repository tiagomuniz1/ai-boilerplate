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
  status: 'scheduled',
  reason: null,
  cancellationReason: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockTemplate = {
  data: [
    {
      id: TPL_UUID,
      specialtyId: SPEC_UUID,
      specialtyName: 'Cardiologia',
      name: 'Consulta Cardiológica',
      fields: [
        {
          key: 'symptom',
          label: 'Sintoma',
          type: 'text',
          required: true,
          order: 0,
          options: null,
          placeholder: 'Descreva o sintoma',
          helpText: null,
          canonical: false,
          canonicalKey: null,
        },
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  total: 1,
  page: 1,
  limit: 1,
}

const mockCreatedRecord = {
  id: RECORD_UUID,
  appointmentId: APPT_UUID,
  patientId: 'patient-uuid',
  patientName: 'Ana Lima',
  doctorId: DOCTOR_UUID,
  doctorName: 'Dr. João',
  specialtyId: SPEC_UUID,
  specialtyName: 'Cardiologia',
  templateId: TPL_UUID,
  templateSchemaSnapshot: mockTemplate.data[0].fields,
  data: { symptom: 'Dor no peito' },
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('Medical Record Fill', () => {
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
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/availability*`, {
      statusCode: 200,
      body: { doctorId: DOCTOR_UUID, date: '2099-12-01', slots: [] },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}`, {
      statusCode: 200,
      body: mockAppointment,
    }).as('getAppointment')
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments*`, {
      statusCode: 200,
      body: { data: [mockAppointment], total: 1, page: 1, limit: 100 },
    }).as('getAppointments')
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedule-exceptions*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 100 },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records/by-appointment/${APPT_UUID}`, {
      statusCode: 200,
      body: null,
    }).as('getRecord')
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: mockTemplate,
    }).as('getTemplate')
    cy.intercept('POST', `${Cypress.env('API_URL')}/medical-records`, {
      statusCode: 201,
      body: mockCreatedRecord,
    }).as('createRecord')

    visitClinic('/appointments', mockDoctorUser)
  })

  it('DOCTOR sees fill-medical-record button for own scheduled appointment without record', () => {
    cy.get('[data-testid="agenda-slot-booked"]', { timeout: 10000 }).first().click()
    cy.wait('@getAppointment')
    cy.wait('@getRecord')

    cy.get('[data-testid="fill-medical-record-button"]').should('be.visible')
  })

  it('DOCTOR fills medical record form and creates record', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records/by-appointment/${APPT_UUID}`, {
      statusCode: 200,
      body: null,
    }).as('noRecord')

    cy.get('[data-testid="agenda-slot-booked"]', { timeout: 10000 }).first().click()
    cy.wait('@getAppointment')
    cy.wait('@noRecord')
    cy.wait('@getTemplate')

    cy.get('[data-testid="fill-medical-record-button"]').click()
    cy.get('[data-testid="medical-record-form"]').should('be.visible')

    cy.get('[data-testid="dynamic-field-symptom"]').type('Dor no peito')
    cy.get('[data-testid="medical-record-form-submit"]').click()
    cy.wait('@createRecord')
  })
})
