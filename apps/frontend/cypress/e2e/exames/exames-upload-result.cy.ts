import { visitClinic } from '../../support/clinic'

const DOCTOR_UUID = '00000000-0000-4000-b000-000000000001'
const APPT_UUID = '00000000-0000-4000-c000-000000000001'
const SPEC_UUID = '00000000-0000-4000-d000-000000000001'
const EXAM_REQUEST_UUID = '00000000-0000-4000-a000-000000000001'
const EXAM_RESULT_UUID = '00000000-0000-4000-f000-000000000001'

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
  patient: {
    fullName: 'Ana Lima',
    email: 'ana@test.com',
    phoneNumber: '11999990001',
    birthDate: '1990-01-01',
    documentNumber: '12345678901',
    gender: 'female',
  },
}

describe('Exames — Upload de resultado', () => {
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
      body: null,
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/prescriptions*`, {
      statusCode: 200,
      body: [],
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-certificates*`, {
      statusCode: 200,
      body: [],
    })
  })

  it('DOCTOR attaches a result file and the badge changes to Concluído', () => {
    cy.fixture('exames.json').then((examRequest) => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/exam-requests*`, {
        statusCode: 200,
        body: [examRequest],
      }).as('getExamRequests')

      cy.wrap(examRequest).as('examRequest')
    })

    visitClinic(`/appointments/${APPT_UUID}`, mockDoctorUser)

    cy.wait('@getAppointment')
    cy.wait('@getExamRequests')

    cy.get('[data-testid="tab-exames"]').click()
    cy.get(`[data-testid="exame-item-status-${EXAM_REQUEST_UUID}"]`).should('contain.text', 'Solicitado')

    cy.get(`[data-testid="exame-preview-button-${EXAM_REQUEST_UUID}"]`).click()
    cy.get('[data-testid="exame-preview-modal"]').should('be.visible')
    cy.get('[data-testid="exame-preview-status"]').should('contain.text', 'Solicitado')

    cy.get('@examRequest').then((examRequest: any) => {
      const completedWithResult = {
        ...examRequest,
        status: 'completed',
        results: [
          {
            id: EXAM_RESULT_UUID,
            examRequestId: EXAM_REQUEST_UUID,
            fileName: 'hemograma.pdf',
            mimeType: 'application/pdf',
            fileSizeBytes: 12345,
            createdAt: new Date().toISOString(),
          },
        ],
      }

      cy.intercept('POST', `${Cypress.env('API_URL')}/exam-requests/${EXAM_REQUEST_UUID}/results`, {
        statusCode: 201,
        body: completedWithResult,
      }).as('addResult')

      // After the upload the section invalidates and refetches the list — the mock
      // now needs to return the completed request with its result for the UI to reflect it.
      cy.intercept('GET', `${Cypress.env('API_URL')}/exam-requests*`, {
        statusCode: 200,
        body: [completedWithResult],
      }).as('getExamRequestsAfterUpload')
    })

    cy.get('[data-testid="exame-result-upload-input"]').selectFile(
      {
        contents: Cypress.Buffer.from('%PDF-1.4 fake pdf content'),
        fileName: 'hemograma.pdf',
        mimeType: 'application/pdf',
      },
      { force: true },
    )

    cy.wait('@addResult')
    cy.wait('@getExamRequestsAfterUpload')

    cy.get(`[data-testid="exame-item-status-${EXAM_REQUEST_UUID}"]`).should('contain.text', 'Concluído')
    cy.get(`[data-testid="exame-result-link-${EXAM_RESULT_UUID}"]`).should('contain.text', 'hemograma.pdf')
  })
})
