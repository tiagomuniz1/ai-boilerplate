import { visitClinic, CLINIC_ID } from '../../support/clinic'

const PROFESSIONAL_ID = '00000000-0000-4000-b000-000000000001'
const APPT_ID = '00000000-0000-4000-d000-000000000002'

const mockAdminUser = {
  id: 'admin-uuid',
  fullName: 'Admin User',
  email: 'admin@clinic.com',
  role: 'admin',
  clinicId: CLINIC_ID,
}

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. Owner',
  email: 'professional@clinic.com',
  role: 'professional',
  clinicId: CLINIC_ID,
}

const mockAppointmentDetail = {
  id: APPT_ID,
  professionalId: PROFESSIONAL_ID,
  professionalName: 'Dr. Owner',
  patientId: 'patient-uuid',
  patientName: 'João Silva',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  scheduleId: 'sched-uuid',
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
    fullName: 'João Silva',
    email: 'joao@example.com',
    phoneNumber: '11999990001',
    birthDate: '1985-03-20',
    documentNumber: '12345678901',
    gender: 'male',
  },
}

const mockProfessionalsResponse = {
  data: [
    {
      id: PROFESSIONAL_ID,
      user: { id: 'professional-user-uuid', fullName: 'Dr. Owner', email: 'professional@clinic.com', isActive: true },
      registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345/SP', state: 'SP', isPrimary: true }],
      specialties: [],
      bio: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 100,
}

function stubAppointmentDetail(overrides: object = {}) {
  cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_ID}`, {
    statusCode: 200,
    body: { ...mockAppointmentDetail, ...overrides },
  }).as('getAppointmentDetail')
}

// `mine` é a ficha do próprio usuário: quem a tem, exerce. O glob
// `/professionals*` não cobre `/professionals/me` — no minimatch o `*` não
// atravessa a barra — então precisa de intercept próprio.
function stubProfessionals(mine: object | null = null) {
  cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, {
    statusCode: 200,
    body: mine,
  }).as('getMyProfessional')
  cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
    statusCode: 200,
    body: mockProfessionalsResponse,
  }).as('getProfessionals')
}

function stubMedicalRecord(body: object | null = null) {
  cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records/by-appointment/${APPT_ID}`, {
    statusCode: body ? 200 : 404,
    body: body ?? { status: 404, title: 'Not Found' },
  }).as('getMedicalRecord')
}

function stubTemplates() {
  cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
    statusCode: 200,
    body: { data: [], total: 0, page: 1, limit: 1 },
  }).as('getTemplates')
}

function stubPrescriptions() {
  cy.intercept('GET', `${Cypress.env('API_URL')}/prescriptions*`, {
    statusCode: 200,
    body: { data: [], total: 0, page: 1, limit: 20 },
  }).as('getPrescriptions')
}

function stubAtestados() {
  cy.intercept('GET', `${Cypress.env('API_URL')}/medical-certificates*`, {
    statusCode: 200,
    body: [],
  }).as('getAtestados')
}

function stubExamRequests() {
  cy.intercept('GET', `${Cypress.env('API_URL')}/exam-requests*`, {
    statusCode: 200,
    body: [],
  }).as('getExamRequests')
  // A página de detalhe monta a aba de fotos; sem stub a chamada dá 401 e o
  // interceptor do api-client joga o app num loop de redirect login/dashboard.
  cy.intercept('GET', `${Cypress.env('API_URL')}/consultation-photos*`, { statusCode: 200, body: [] })

  // A aba Vacinas monta no load da página, não ao clicar na aba: doses lançadas
  // nesta consulta e indicações emitidas nela. Sem stub, a chamada bate no
  // backend real com token mock, dá 401 e o interceptor do api-client joga o
  // app num loop de redirect — a página inteira some, inclusive o estado de erro.
  cy.intercept('GET', `${Cypress.env('API_URL')}/vaccinations*`, {
    statusCode: 200,
    body: { data: [], total: 0, page: 1, limit: 20 },
  })
  cy.intercept('GET', `${Cypress.env('API_URL')}/vaccine-indications*`, { statusCode: 200, body: [] })
  cy.intercept('GET', `${Cypress.env('API_URL')}/vaccines*`, {
    statusCode: 200,
    body: { data: [], total: 0, page: 1, limit: 100 },
  })
}

describe('Appointment Detail Page', () => {
  describe('ADMIN', () => {
    beforeEach(() => {
      stubProfessionals()
      stubMedicalRecord()
      stubTemplates()
      stubPrescriptions()
      stubAtestados()
      stubExamRequests()
    })

    it('renders appointment summary with patient info', () => {
      stubAppointmentDetail()
      visitClinic(`/appointments/${APPT_ID}`, mockAdminUser)

      cy.get('[data-testid="appointment-detail-page"]').should('exist')
      cy.get('[data-testid="appointment-detail-professional"]').should('contain', 'Dr. Owner')
      cy.get('[data-testid="appointment-detail-date"]').should('contain', '10/06/2025')
      cy.get('[data-testid="appointment-detail-status"]').should('contain', 'Agendada')
    })

    it('shows a skeleton while the appointment is loading', () => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_ID}`, {
        statusCode: 200,
        body: mockAppointmentDetail,
        delay: 500,
      }).as('getAppointmentDetailSlow')
      visitClinic(`/appointments/${APPT_ID}`, mockAdminUser)

      cy.get('[data-testid="appointment-detail-skeleton"]').should('be.visible')
      cy.wait('@getAppointmentDetailSlow')
      cy.get('[data-testid="appointment-detail-skeleton"]').should('not.exist')
    })

    it('shows an error state when the appointment fails to load', () => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_ID}`, {
        statusCode: 500,
        body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
      }).as('getAppointmentDetailError')
      visitClinic(`/appointments/${APPT_ID}`, mockAdminUser)

      cy.wait('@getAppointmentDetailError')
      cy.get('[data-testid="appointment-detail-error"]').should('be.visible')
    })

    it('renders patient info card', () => {
      stubAppointmentDetail()
      visitClinic(`/appointments/${APPT_ID}`, mockAdminUser)

      cy.get('[data-testid="patient-info-card"]').should('exist')
      cy.get('[data-testid="patient-info-name"]').should('contain', 'João Silva')
      cy.get('[data-testid="patient-info-email"]').should('contain', 'joao@example.com')
    })

    it('shows cancel and complete buttons for SCHEDULED appointment', () => {
      stubAppointmentDetail()
      visitClinic(`/appointments/${APPT_ID}`, mockAdminUser)

      cy.get('[data-testid="appointment-detail-cancel-button"]').should('exist')
      cy.get('[data-testid="appointment-detail-complete-button"]').should('exist')
    })

    it('does not show action buttons for COMPLETED appointment', () => {
      stubAppointmentDetail({ status: 'completed' })
      visitClinic(`/appointments/${APPT_ID}`, mockAdminUser)

      cy.get('[data-testid="appointment-detail-status"]').should('contain', 'Concluída')
      cy.get('[data-testid="appointment-detail-cancel-button"]').should('not.exist')
      cy.get('[data-testid="appointment-detail-complete-button"]').should('not.exist')
    })

    it('mobile: expands the collapsible details panel via the toggle button', () => {
      cy.viewport(375, 800)
      stubAppointmentDetail()
      visitClinic(`/appointments/${APPT_ID}`, mockAdminUser)

      cy.get('[data-testid="appointment-detail-patient-name"]').should('contain.text', 'João Silva')
      cy.get('[data-testid="appointment-detail-full-info"]').should('not.be.visible')
      cy.get('[data-testid="appointment-detail-toggle"]').should('have.attr', 'aria-expanded', 'false').click()
      cy.get('[data-testid="appointment-detail-toggle"]').should('have.attr', 'aria-expanded', 'true')
      cy.get('[data-testid="appointment-detail-full-info"]').should('be.visible')

      cy.get('[data-testid="appointment-detail-back-button-mobile"]').should('be.visible')
    })

    it('back button links to appointments list', () => {
      stubAppointmentDetail()
      visitClinic(`/appointments/${APPT_ID}`, mockAdminUser)

      cy.get('[data-testid="appointment-detail-back-button"]').should('exist')
    })

    it('opening lean modal and clicking "Ir para a consulta" navigates to detail page', () => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/appointments*`, (req) => {
        if (!req.url.includes('availability') && !req.url.includes(APPT_ID)) {
          req.reply({ statusCode: 200, body: { data: [], total: 0, page: 1, limit: 100 } })
        }
      }).as('getAppointments')

      stubAppointmentDetail()
      visitClinic('/appointments', mockAdminUser)

      cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_ID}`, {
        statusCode: 200,
        body: mockAppointmentDetail,
      }).as('getDetail')

      cy.visit(`/pulso/appointments/${APPT_ID}`)
      cy.get('[data-testid="appointment-detail-page"]').should('exist')
    })
  })

  describe('PROFESSIONAL (own appointment)', () => {
    it('sees actions and medical record section', () => {
      stubProfessionals(mockProfessionalsResponse.data[0])
      stubMedicalRecord()
      stubTemplates()
      stubPrescriptions()
      stubAtestados()
      stubExamRequests()
      stubAppointmentDetail({ professionalId: PROFESSIONAL_ID })
      visitClinic(`/appointments/${APPT_ID}`, mockProfessionalUser)

      cy.get('[data-testid="appointment-detail-cancel-button"]').should('exist')
      cy.get('[data-testid="tab-prontuario"]').click()
      cy.get('[data-testid="fill-medical-record-button"]').should('exist')
    })

    it('atestados tab: shows a skeleton while loading, then the empty state', () => {
      stubProfessionals(mockProfessionalsResponse.data[0])
      stubMedicalRecord()
      stubTemplates()
      stubPrescriptions()
      stubExamRequests()
      stubAppointmentDetail({ professionalId: PROFESSIONAL_ID })
      cy.intercept('GET', `${Cypress.env('API_URL')}/medical-certificates*`, {
        statusCode: 200,
        body: [],
        delay: 500,
      }).as('getAtestadosSlow')
      visitClinic(`/appointments/${APPT_ID}`, mockProfessionalUser)

      cy.get('[data-testid="tab-atestados"]').click()
      cy.get('[data-testid="atestado-list-skeleton"]').should('be.visible')
      cy.wait('@getAtestadosSlow')
      cy.get('[data-testid="atestado-list-skeleton"]').should('not.exist')
      cy.get('[data-testid="atestado-section-empty"]').should('be.visible')
    })

    it('atestados tab: shows an error state when the list fails to load', () => {
      stubProfessionals(mockProfessionalsResponse.data[0])
      stubMedicalRecord()
      stubTemplates()
      stubPrescriptions()
      stubExamRequests()
      stubAppointmentDetail({ professionalId: PROFESSIONAL_ID })
      cy.intercept('GET', `${Cypress.env('API_URL')}/medical-certificates*`, {
        statusCode: 500,
        body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
      }).as('getAtestadosError')
      visitClinic(`/appointments/${APPT_ID}`, mockProfessionalUser)

      cy.get('[data-testid="tab-atestados"]').click()
      cy.wait('@getAtestadosError')
      cy.get('[data-testid="atestado-section-error"]').should('be.visible')
    })

    it('atestados tab: cancels and confirms deleting an existing atestado', () => {
      const mockAtestado = {
        id: 'atestado-uuid',
        appointmentId: APPT_ID,
        type: 'attendance',
        attendanceDate: '2025-06-10T00:00:00.000Z',
        checkInTime: '09:00',
        checkOutTime: '09:30',
        daysOff: null,
        startDate: null,
        cidCode: null,
        observations: null,
        issuedAt: '2025-06-10T09:30:00.000Z',
        patientName: 'João Silva',
        professionalName: 'Dr. Owner',
      }
      stubProfessionals(mockProfessionalsResponse.data[0])
      stubMedicalRecord()
      stubTemplates()
      stubPrescriptions()
      stubExamRequests()
      stubAppointmentDetail({ professionalId: PROFESSIONAL_ID })
      cy.intercept('GET', `${Cypress.env('API_URL')}/medical-certificates*`, {
        statusCode: 200,
        body: [mockAtestado],
      }).as('getAtestados')
      visitClinic(`/appointments/${APPT_ID}`, mockProfessionalUser)

      cy.get('[data-testid="tab-atestados"]').click()
      cy.wait('@getAtestados')
      cy.get(`[data-testid="atestado-delete-button-${mockAtestado.id}"]`).click()
      cy.get('[data-testid="atestado-delete-dialog"]').should('be.visible')
      cy.get('[data-testid="atestado-delete-dialog-message"]').should('be.visible')
      cy.get('[data-testid="atestado-delete-dialog-cancel"]').click()
      cy.get('[data-testid="atestado-delete-dialog"]').should('not.exist')
      cy.get(`[data-testid="atestado-item-${mockAtestado.id}"]`).should('exist')

      cy.intercept('DELETE', `${Cypress.env('API_URL')}/medical-certificates/${mockAtestado.id}`, {
        statusCode: 204,
      }).as('deleteAtestado')
      cy.get(`[data-testid="atestado-delete-button-${mockAtestado.id}"]`).click()
      cy.get('[data-testid="atestado-delete-dialog-confirm"]').click()
      cy.wait('@deleteAtestado')
      cy.get('[data-testid="atestado-delete-dialog"]').should('not.exist')
    })
  })

  describe('USER', () => {
    it('does not see action buttons or medical record section', () => {
      stubProfessionals()
      stubMedicalRecord()
      stubTemplates()
      stubPrescriptions()
      stubAtestados()
      stubExamRequests()
      stubAppointmentDetail()

      const mockUserRole = { ...mockAdminUser, role: 'user' }
      visitClinic(`/appointments/${APPT_ID}`, mockUserRole)

      cy.get('[data-testid="resumo-tab"]').should('exist')
      cy.get('[data-testid="appointment-detail-cancel-button"]').should('not.exist')
      cy.get('[data-testid="tab-prontuario"]').should('not.exist')
    })
  })
})
