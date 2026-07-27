import { visitClinic } from '../../support/clinic'

const PROFESSIONAL_UUID = '00000000-0000-4000-b000-000000000001'
const APPT_UUID = '00000000-0000-4000-c000-000000000001'
const SPEC_UUID = '00000000-0000-4000-d000-000000000001'
const EXAM_REQUEST_UUID = '00000000-0000-4000-a000-000000000001'

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. João',
  email: 'professional@pulso.center',
  role: 'professional',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const mockProfessional = {
  id: PROFESSIONAL_UUID,
  user: { id: 'professional-user-uuid', fullName: 'Dr. João', email: 'professional@pulso.center', isActive: true },
  registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345/SP', state: 'SP', isPrimary: true }],
  specialties: [{ id: SPEC_UUID, name: 'Cardiologia' }],
  bio: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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

describe('Exames — Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: { data: [mockProfessional], total: 1, page: 1, limit: 200 },
    })
    // ProfessionalSignatureSelect (rendered inside ExameForm) fetches the single
    // professional by id — a distinct route from the list above (`/professionals*`
    // does not match `/professionals/:id`, since `*` does not cross `/`).
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${PROFESSIONAL_UUID}`, {
      statusCode: 200,
      body: mockProfessional,
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}`, {
      statusCode: 200,
      body: mockAppointment,
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
      body: [],
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-certificates*`, {
      statusCode: 200,
      body: [],
    })
  })

  it('PROFESSIONAL requests exams with multiple items and sees it in the list with status Solicitado', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/exam-requests*`, {
      statusCode: 200,
      body: [],
    }).as('getExamRequests')

    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)

    cy.wait('@getAppointment')
    cy.wait('@getExamRequests')

    cy.get('[data-testid="tab-exames"]').click()
    cy.get('[data-testid="exame-new-button"]').click()
    cy.get('[data-testid="exame-form"]').should('be.visible')

    cy.get('[data-testid="exame-form-item-name-0"]').type('Hemograma completo')
    cy.get('[data-testid="exame-form-item-observations-0"]').type('Jejum de 8 horas')
    cy.get('[data-testid="exame-form-add-item"]').click()
    cy.get('[data-testid="exame-form-item-name-1"]').type('Raio-X de tórax')
    cy.get('[data-testid="exame-form-notes"]').type('Retornar com resultado em 7 dias')

    cy.fixture('exames.json').then((examRequest) => {
      cy.intercept('POST', `${Cypress.env('API_URL')}/exam-requests`, {
        statusCode: 201,
        body: examRequest,
      }).as('createExamRequest')

      // After creation the section invalidates and refetches the list — the mock
      // now needs to return the newly created request for the UI to reflect it.
      cy.intercept('GET', `${Cypress.env('API_URL')}/exam-requests*`, {
        statusCode: 200,
        body: [examRequest],
      }).as('getExamRequestsAfterCreate')
    })

    cy.get('[data-testid="exame-form-submit"]').click()
    cy.wait('@createExamRequest')
    cy.wait('@getExamRequestsAfterCreate')

    cy.get('[data-testid="exame-form-modal"]').should('not.exist')
    cy.get(`[data-testid="exame-item-status-${EXAM_REQUEST_UUID}"]`).should('contain.text', 'Solicitado')
    cy.get(`[data-testid="exame-item-summary-${EXAM_REQUEST_UUID}"]`).should('contain.text', '2 exames')
    cy.get('[data-testid="tab-exames"]').should('contain.text', '1')

    // Full detail (items + observations) lives behind "Visualizar"
    cy.get(`[data-testid="exame-preview-button-${EXAM_REQUEST_UUID}"]`).click()
    cy.get('[data-testid="exame-preview-modal"]').should('be.visible')
    cy.get('[data-testid="exame-preview-item-0"]').should('contain.text', 'Hemograma completo')
    cy.get('[data-testid="exame-preview-item-1"]').should('contain.text', 'Raio-X de tórax')
    cy.get('[data-testid="exame-preview-notes"]').should('contain.text', 'Retornar com resultado em 7 dias')
  })

  it('shows a generic error when the API fails to create the exam request', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/exam-requests*`, {
      statusCode: 200,
      body: [],
    }).as('getExamRequests')

    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
    cy.wait('@getAppointment')
    cy.wait('@getExamRequests')

    cy.get('[data-testid="tab-exames"]').click()
    cy.get('[data-testid="exame-new-button"]').click()
    cy.get('[data-testid="exame-form-item-name-0"]').type('Hemograma completo')

    cy.intercept('POST', `${Cypress.env('API_URL')}/exam-requests`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('createExamRequestError')

    cy.get('[data-testid="exame-form-submit"]').click()
    cy.wait('@createExamRequestError')
    cy.get('[data-testid="exame-form-error"]').should('be.visible')
    cy.get('[data-testid="exame-form-modal"]').should('be.visible')
  })
})
