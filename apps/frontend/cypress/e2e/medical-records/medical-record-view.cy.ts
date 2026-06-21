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
}

describe('Medical Record View', () => {
  beforeEach(() => {
    visitClinic('/appointments', { user: mockDoctorUser })

    cy.intercept('GET', `**/appointments/${APPT_UUID}`, { body: mockAppointment }).as('getAppointment')
    cy.intercept('GET', `**/appointments*`, { body: { data: [mockAppointment], total: 1, page: 1, limit: 100 } }).as('getAppointments')
    cy.intercept('GET', `**/schedules/availability*`, { body: { doctorId: DOCTOR_UUID, date: '2099-12-01', slots: [] } }).as('getAvailability')
    cy.intercept('GET', `**/medical-records/by-appointment/${APPT_UUID}`, { body: mockRecord }).as('getRecord')
    cy.intercept('GET', `**/medical-records/${RECORD_UUID}`, { body: mockRecord }).as('getRecordById')
  })

  it('shows view-medical-record button when record exists', () => {
    cy.visit('/pulso/appointments')
    cy.wait('@getAppointments')

    cy.findByTestId('agenda-slot-booked').first().click()
    cy.wait('@getAppointment')
    cy.wait('@getRecord')

    cy.findByTestId('view-medical-record-button').should('be.visible')
  })

  it('opens medical-record-view modal when view button clicked', () => {
    cy.visit('/pulso/appointments')
    cy.wait('@getAppointments')

    cy.findByTestId('agenda-slot-booked').first().click()
    cy.wait('@getAppointment')
    cy.wait('@getRecord')

    cy.findByTestId('view-medical-record-button').click()
    cy.findByTestId('medical-record-view').should('be.visible')
  })

  it('displays field values in correct order', () => {
    cy.visit('/pulso/appointments')
    cy.wait('@getAppointments')

    cy.findByTestId('agenda-slot-booked').first().click()
    cy.wait('@getAppointment')
    cy.wait('@getRecord')

    cy.findByTestId('view-medical-record-button').click()

    cy.findByTestId('medical-record-view-modal').within(() => {
      cy.findByTestId('record-field-symptom').should('contain.text', 'Dor no peito')
      cy.findByTestId('record-field-chronic').should('contain.text', 'Não')
    })
  })

  it('shows notes when present', () => {
    cy.visit('/pulso/appointments')
    cy.wait('@getAppointments')

    cy.findByTestId('agenda-slot-booked').first().click()
    cy.wait('@getAppointment')
    cy.wait('@getRecord')

    cy.findByTestId('view-medical-record-button').click()
    cy.findByTestId('record-notes').should('contain.text', 'Paciente estável')
  })

  it('does not show edit-medical-record button for completed appointment', () => {
    cy.visit('/pulso/appointments')
    cy.wait('@getAppointments')

    cy.findByTestId('agenda-slot-booked').first().click()
    cy.wait('@getAppointment')
    cy.wait('@getRecord')

    cy.findByTestId('edit-medical-record-button').should('not.exist')
  })
})
