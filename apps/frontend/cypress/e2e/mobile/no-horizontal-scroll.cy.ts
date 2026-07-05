import { visitClinic } from '../../support/clinic'

const DOCTOR_UUID = '00000000-0000-4000-b000-000000000001'
const APPT_UUID = '00000000-0000-4000-c000-000000000001'
const SPEC_UUID = '00000000-0000-4000-d000-000000000001'

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
  doctorName: 'Maria Aurea de Andrade Borba',
  patientId: 'patient-uuid',
  patientName: 'Neuma Maria de Souza Santos',
  specialtyId: SPEC_UUID,
  specialtyName: 'Mastologia',
  scheduleId: 'sched-uuid',
  date: '2099-12-01',
  startTime: '09:00',
  endTime: '09:30',
  status: 'scheduled',
  reason: 'Consulta de revisão periódica de rotina anual',
  cancellationReason: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  patient: {
    fullName: 'Neuma Maria de Souza Santos',
    email: 'neuma@test.com',
    phoneNumber: '11999990001',
    birthDate: '1990-01-01',
    documentNumber: '12345678901',
    gender: 'female',
  },
}

const mockPrescriptions = [
  {
    id: 'rx-1',
    appointmentId: APPT_UUID,
    patientId: 'patient-uuid',
    patientName: mockAppointment.patientName,
    doctorId: DOCTOR_UUID,
    doctorName: mockAppointment.doctorName,
    issuedAt: '2026-07-01T22:27:00.000Z',
    items: [{ medicationId: 'med-1', name: 'Dipirona', activeIngredient: null, dosage: '500mg', quantity: 1, instructions: 'Tomar 1 cp' }],
    notes: null,
    createdAt: '2026-07-01T22:27:00.000Z',
  },
  {
    id: 'rx-2',
    appointmentId: APPT_UUID,
    patientId: 'patient-uuid',
    patientName: mockAppointment.patientName,
    doctorId: DOCTOR_UUID,
    doctorName: mockAppointment.doctorName,
    issuedAt: '2026-07-01T22:25:00.000Z',
    items: [
      { medicationId: 'med-2', name: 'Paracetamol', activeIngredient: null, dosage: '750mg', quantity: 1, instructions: 'Tomar 1 cp' },
      { medicationId: 'med-3', name: 'Ibuprofeno', activeIngredient: null, dosage: '400mg', quantity: 1, instructions: 'Tomar 1 cp' },
      { medicationId: 'med-4', name: 'Omeprazol', activeIngredient: null, dosage: '20mg', quantity: 1, instructions: 'Tomar 1 cp' },
    ],
    notes: null,
    createdAt: '2026-07-01T22:25:00.000Z',
  },
]

const mockAtestados = [
  {
    id: 'atestado-1',
    appointmentId: APPT_UUID,
    patientId: 'patient-uuid',
    patientName: mockAppointment.patientName,
    doctorId: DOCTOR_UUID,
    doctorName: mockAppointment.doctorName,
    type: 'leave',
    daysOff: 2,
    startDate: '2026-07-01T00:00:00.000Z',
    cidCode: null,
    attendanceDate: null,
    checkInTime: null,
    checkOutTime: null,
    observations: null,
    issuedAt: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
]

const mockExamRequests = [
  {
    id: 'exam-1',
    appointmentId: APPT_UUID,
    patientId: 'patient-uuid',
    patientName: mockAppointment.patientName,
    doctorId: DOCTOR_UUID,
    doctorName: mockAppointment.doctorName,
    items: [{ name: 'Hemograma completo', observations: 'Jejum de 8 horas' }],
    notes: null,
    status: 'requested',
    results: [],
    issuedAt: '2026-07-03T17:41:00.000Z',
    createdAt: '2026-07-03T17:41:00.000Z',
  },
  {
    id: 'exam-2',
    appointmentId: APPT_UUID,
    patientId: 'patient-uuid',
    patientName: mockAppointment.patientName,
    doctorId: DOCTOR_UUID,
    doctorName: mockAppointment.doctorName,
    items: [
      { name: 'Raio-X de tórax', observations: null },
      { name: 'Ultrassom abdominal', observations: null },
    ],
    notes: null,
    status: 'completed',
    results: [
      {
        id: 'result-1',
        examRequestId: 'exam-2',
        fileName: 'raio-x-torax.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 12345,
        createdAt: '2026-07-03T17:39:00.000Z',
      },
    ],
    issuedAt: '2026-07-03T17:39:00.000Z',
    createdAt: '2026-07-03T17:39:00.000Z',
  },
]

function assertNoHorizontalScroll(label: string) {
  cy.document().then((doc) => {
    expect(doc.documentElement.scrollWidth, `${label}: document.scrollWidth <= clientWidth`).to.be.at.most(
      doc.documentElement.clientWidth,
    )
  })
}

// scrollWidth alone doesn't catch content that overflows but gets clipped by an
// ancestor's overflow-hidden — a button can be cut off (unclickable) without ever
// producing a scrollbar. Assert every actionable element in the row is fully
// within the 375px viewport bounds.
function assertFullyInViewport(testId: string) {
  cy.get(`[data-testid="${testId}"]`).should(($el) => {
    const rect = $el[0].getBoundingClientRect()
    expect(rect.left, `${testId}: left >= 0`).to.be.at.least(0)
    expect(rect.right, `${testId}: right <= 375`).to.be.at.most(375)
  })
}

describe('Mobile (375px) — sem scroll horizontal', () => {
  beforeEach(() => {
    cy.viewport(375, 667)
    cy.clearCookies()
    cy.clearLocalStorage()

    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: {
        data: [
          {
            id: DOCTOR_UUID,
            user: { id: 'doctor-user-uuid', fullName: mockAppointment.doctorName, email: 'doctor@pulso.center', isActive: true },
            crmNumber: '12345/SP',
            specialties: [{ id: SPEC_UUID, name: 'Mastologia' }],
            bio: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
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
      body: mockPrescriptions,
    }).as('getPrescriptions')
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-certificates*`, {
      statusCode: 200,
      body: mockAtestados,
    }).as('getAtestados')
    cy.intercept('GET', `${Cypress.env('API_URL')}/exam-requests*`, {
      statusCode: 200,
      body: mockExamRequests,
    }).as('getExamRequests')
  })

  it('nenhuma aba da tela de consulta gera scroll horizontal da página', () => {
    visitClinic(`/appointments/${APPT_UUID}`, mockDoctorUser)
    cy.wait('@getAppointment')
    assertNoHorizontalScroll('resumo')
    // A barra de abas nunca deve rolar horizontalmente — deve quebrar linha
    // (flex-wrap) em vez disso, então cada aba precisa estar inteiramente visível.
    assertFullyInViewport('tab-resumo')
    assertFullyInViewport('tab-prontuario')
    assertFullyInViewport('tab-receitas')
    assertFullyInViewport('tab-atestados')
    assertFullyInViewport('tab-exames')

    cy.get('[data-testid="tab-receitas"]').click()
    cy.wait('@getPrescriptions')
    assertNoHorizontalScroll('receitas')
    assertFullyInViewport('prescription-delete-button-rx-2')

    cy.get('[data-testid="tab-atestados"]').click()
    cy.wait('@getAtestados')
    assertNoHorizontalScroll('atestados')
    assertFullyInViewport('atestado-delete-button-atestado-1')

    cy.get('[data-testid="tab-exames"]').click()
    cy.wait('@getExamRequests')
    assertNoHorizontalScroll('exames')
    assertFullyInViewport('exame-delete-button-exam-2')
  })

  it('abrir o menu mobile do sidebar não gera scroll horizontal', () => {
    visitClinic(`/appointments/${APPT_UUID}`, mockDoctorUser)
    cy.wait('@getAppointment')

    cy.get('[data-testid="header-mobile-menu"]').click()
    cy.get('[data-testid="sidebar-backdrop"]').should('be.visible')
    assertNoHorizontalScroll('sidebar aberto')
  })
})
