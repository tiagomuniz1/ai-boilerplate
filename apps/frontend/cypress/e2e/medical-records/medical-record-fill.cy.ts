import { visitClinic } from '../../support/clinic'

const PROFESSIONAL_UUID = '00000000-0000-4000-b000-000000000001'
const APPT_UUID = '00000000-0000-4000-c000-000000000001'
const SPEC_UUID = '00000000-0000-4000-d000-000000000001'
const TPL_UUID = '00000000-0000-4000-e000-000000000001'
const RECORD_UUID = '00000000-0000-4000-f000-000000000001'

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. João',
  email: 'professional@pulso.center',
  role: 'professional',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const mockAppointment = {
  id: APPT_UUID,
  professionalId: PROFESSIONAL_UUID,
  professionalName: 'Dr. João',
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
  patient: {
    fullName: 'Ana Lima',
    email: 'ana@test.com',
    phoneNumber: '11999990001',
    birthDate: '1990-01-01',
    documentNumber: '12345678901',
    gender: 'female',
  },
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
  professionalId: PROFESSIONAL_UUID,
  professionalName: 'Dr. João',
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
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: {
        data: [{
          id: PROFESSIONAL_UUID,
          user: { id: 'professional-user-uuid', fullName: 'Dr. João', email: 'professional@pulso.center', isActive: true },
          registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345/SP', state: 'SP', isPrimary: true }],
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

  it('PROFESSIONAL sees fill-medical-record button for own scheduled appointment without record', () => {
    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)

    cy.wait('@getAppointment')
    cy.wait('@getRecord')

    cy.get('[data-testid="tab-prontuario"]').click()
    cy.get('[data-testid="fill-medical-record-button"]').should('be.visible')
  })

  it('PROFESSIONAL fills medical record form and creates record', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records/by-appointment/${APPT_UUID}`, {
      statusCode: 200,
      body: null,
    }).as('noRecord')

    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)

    cy.wait('@getAppointment')
    cy.wait('@noRecord')

    cy.get('[data-testid="tab-prontuario"]').click()
    cy.wait('@getTemplate')

    cy.get('[data-testid="fill-medical-record-button"]').click()
    cy.get('[data-testid="medical-record-form"]').should('be.visible')

    cy.get('[data-testid="dynamic-field-symptom"]').type('Dor no peito')
    cy.get('[data-testid="medical-record-form-submit"]').click()
    cy.wait('@createRecord')
  })
})
