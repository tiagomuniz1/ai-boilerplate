import { visitClinic } from '../../support/clinic'

const PATIENT_UUID = '00000000-0000-4000-e000-000000000001'
const DOCTOR_UUID = '00000000-0000-4000-b000-000000000001'
const SPEC_UUID = '00000000-0000-4000-d000-000000000001'

const mockAdminUser = {
  id: 'admin-user-uuid',
  fullName: 'Admin User',
  email: 'admin@pulso.center',
  role: 'admin',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const makeRecord = (id: string, date: string) => ({
  id,
  appointmentId: `appt-${id}`,
  patientId: PATIENT_UUID,
  patientName: 'Ana Lima',
  doctorId: DOCTOR_UUID,
  doctorName: 'Dr. João',
  specialtyId: SPEC_UUID,
  specialtyName: 'Cardiologia',
  templateId: 'tpl-uuid',
  templateSchemaSnapshot: [],
  data: {},
  notes: null,
  createdAt: `${date}T10:00:00.000Z`,
  updatedAt: `${date}T10:00:00.000Z`,
})

const mockPatient = {
  id: PATIENT_UUID,
  user: { id: 'patient-user-uuid', fullName: 'Ana Lima', email: 'ana@test.com', isActive: true },
  fullName: 'Ana Lima',
  phoneNumber: '11999999999',
  birthDate: '1990-01-01',
  documentNumber: '12345678901',
  gender: 'female',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockPaginatedPatients = { data: [mockPatient], total: 1, page: 1, limit: 200 }

describe('Patient Medical History', () => {
  beforeEach(() => {
    visitClinic('/patients', { user: mockAdminUser })

    cy.intercept('GET', `**/patients*`, { body: mockPaginatedPatients }).as('getPatients')
    cy.intercept('GET', `**/patients/${PATIENT_UUID}`, { body: mockPatient }).as('getPatient')
    cy.intercept('GET', `**/medical-records/patient/${PATIENT_UUID}*`, {
      body: {
        data: [makeRecord('r1', '2024-03-15'), makeRecord('r2', '2024-02-10')],
        total: 2,
        page: 1,
        limit: 10,
      },
    }).as('getHistory')
  })

  it('shows empty state when no medical records exist', () => {
    cy.intercept('GET', `**/medical-records/patient/${PATIENT_UUID}*`, {
      body: { data: [], total: 0, page: 1, limit: 10 },
    }).as('emptyHistory')

    cy.visit(`/pulso/patients/${PATIENT_UUID}`)
    cy.wait('@getPatient')

    cy.findByTestId('patient-history-empty').should('be.visible')
  })

  it('lists medical records in the patient history', () => {
    cy.visit(`/pulso/patients/${PATIENT_UUID}`)
    cy.wait('@getPatient')
    cy.wait('@getHistory')

    cy.findAllByTestId('history-card').should('have.length', 2)
  })

  it('shows specialty and doctor name on each history card', () => {
    cy.visit(`/pulso/patients/${PATIENT_UUID}`)
    cy.wait('@getPatient')
    cy.wait('@getHistory')

    cy.findAllByTestId('history-card-specialty').first().should('contain.text', 'Cardiologia')
    cy.findAllByTestId('history-card-doctor').first().should('contain.text', 'Dr. João')
  })
})
