// Consultas de um paciente — a tela nova, alcançada pela listagem de pacientes
// (ADMIN e recepção) e pela própria consulta (profissional, que não acessa a
// lista de pacientes).

import { visitClinic, expectClinicPath, CLINIC_ID } from '../../support/clinic'

const PATIENT_ID = 'aaaaaaaa-1111-1111-1111-000000000001'
const PROF_A = 'bbbbbbbb-2222-2222-2222-000000000001'
const PROF_B = 'bbbbbbbb-2222-2222-2222-000000000002'

const mockAdmin = {
  id: 'mock-admin-id',
  fullName: 'Admin User',
  email: 'admin@clinic.com',
  role: 'admin',
  clinicId: CLINIC_ID,
}

const mockPatient = {
  id: PATIENT_ID,
  user: { id: 'user-uuid-1', fullName: 'Clara Monteiro Alves', email: 'clara@test.com', isActive: true },
  phoneNumber: '11988442170',
  birthDate: '1988-03-22',
  documentNumber: '52014873065',
  gender: 'female',
  responsiblePatientId: null,
  kinshipType: null,
  responsiblePatient: null,
  dependents: [],
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const makeAppointment = (id: string, date: string, professionalId: string, professionalName: string) => ({
  id,
  professionalId,
  professionalName,
  patientId: PATIENT_ID,
  patientName: 'Clara Monteiro Alves',
  specialtyId: 'spec-uuid',
  specialtyName: 'Ginecologia e Obstetrícia',
  scheduleId: 'schedule-uuid',
  date,
  startTime: '09:00',
  endTime: '09:30',
  status: 'scheduled',
  reason: 'Consulta de rotina',
  cancellationReason: null,
  seriesId: null,
  seriesSequence: null,
  seriesTotalOccurrences: null,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
})

const RECENTE = makeAppointment('appt-recente', '2026-09-03', PROF_A, 'Dra. Helena Vasconcelos')
const ANTIGA = makeAppointment('appt-antiga', '2025-02-11', PROF_B, 'Dr. Rafael Andrade')

function stubProfessionals() {
  cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
    statusCode: 200,
    body: {
      data: [
        { id: PROF_A, user: { id: 'u-a', fullName: 'Dra. Helena Vasconcelos', email: 'helena@test.com', isActive: true }, registrations: [], specialties: [], bio: null, createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' },
        { id: PROF_B, user: { id: 'u-b', fullName: 'Dr. Rafael Andrade', email: 'rafael@test.com', isActive: true }, registrations: [], specialties: [], bio: null, createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' },
      ],
      total: 2, page: 1, limit: 100,
    },
  }).as('getProfessionals')
  cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, { statusCode: 200, body: null })
}

describe('Consultas do paciente', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')
    stubProfessionals()
  })

  // Separado do teste de conteúdo de propósito. Asserir o caminho logo após um
  // clique é o padrão de flake desta suíte — "clicou, não navegou" sob carga —,
  // e o que precisa ser garantido aqui é o destino do link, não o tempo que o
  // roteador leva para trocar de página.
  it('a listagem de pacientes aponta para a tela de consultas', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: { data: [mockPatient], total: 1, page: 1, limit: 20 },
    }).as('getPatients')

    visitClinic('/patients', mockAdmin)
    cy.wait('@getPatients')

    cy.get(`[data-testid="patient-appointments-link-${PATIENT_ID}"]`)
      .should('have.attr', 'href')
      .and('include', `/patients/${PATIENT_ID}/appointments`)

    cy.get(`[data-testid="patient-card-appointments-link-${PATIENT_ID}"]`)
      .should('have.attr', 'href')
      .and('include', `/patients/${PATIENT_ID}/appointments`)
  })

  it('mostra a consulta mais recente no topo', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments?*`, {
      statusCode: 200,
      body: { data: [RECENTE, ANTIGA], total: 2, page: 1, limit: 20 },
    }).as('getAppointments')

    visitClinic(`/patients/${PATIENT_ID}/appointments`, mockAdmin)
    cy.wait('@getAppointments')

    expectClinicPath(`/patients/${PATIENT_ID}/appointments`)
    cy.get('[data-testid="patient-appointments-title"]').should('contain', 'Clara Monteiro Alves')

    cy.get('[data-testid^="patient-appointment-row-"]').first()
      .should('have.attr', 'data-testid', 'patient-appointment-row-appt-recente')
      .and('contain', '03/09/2026')
    cy.get('[data-testid^="patient-appointment-row-"]').last()
      .should('have.attr', 'data-testid', 'patient-appointment-row-appt-antiga')
  })

  it('o ADMIN filtra por profissional', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments?*`, {
      statusCode: 200,
      body: { data: [RECENTE, ANTIGA], total: 2, page: 1, limit: 20 },
    }).as('getAppointments')

    visitClinic(`/patients/${PATIENT_ID}/appointments`, mockAdmin)
    cy.wait('@getAppointments')
    cy.get('[data-testid="patient-appointment-history-professional-filter"]').should('be.visible')

    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments?*`, (req) => {
      expect(req.url).to.include(`professionalId=${PROF_B}`)
      req.reply({ statusCode: 200, body: { data: [ANTIGA], total: 1, page: 1, limit: 20 } })
    }).as('getFiltradas')

    cy.get('[data-testid="patient-appointment-history-professional-filter"]').select(PROF_B)
    cy.wait('@getFiltradas')

    cy.get('[data-testid^="patient-appointment-row-"]').should('have.length', 1)
    cy.get('[data-testid="patient-appointment-row-appt-antiga"]').should('be.visible')
  })

  it('o profissional não recebe o seletor — o recorte é do servidor', () => {
    const mockProfessional = { ...mockAdmin, id: 'mock-prof-id', fullName: 'Dra. Helena', role: 'professional' }

    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments?*`, {
      statusCode: 200,
      body: { data: [RECENTE], total: 1, page: 1, limit: 20 },
    }).as('getAppointments')

    visitClinic(`/patients/${PATIENT_ID}/appointments`, mockProfessional)
    cy.wait('@getAppointments')

    cy.get('[data-testid="patient-appointment-history-table"]').should('be.visible')
    cy.get('[data-testid="patient-appointment-history-professional-filter"]').should('not.exist')
  })

  it('mostra estado vazio quando o paciente não tem consultas', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments?*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    }).as('getAppointments')

    visitClinic(`/patients/${PATIENT_ID}/appointments`, mockAdmin)
    cy.wait('@getAppointments')

    cy.get('[data-testid="patient-appointment-history-empty"]')
      .should('contain', 'ainda não tem consultas')
  })

  it('mostra estado de erro quando a busca falha', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments?*`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('getAppointmentsError')

    visitClinic(`/patients/${PATIENT_ID}/appointments`, mockAdmin)
    cy.wait('@getAppointmentsError')

    cy.get('[data-testid="patient-appointment-history-error"]').should('be.visible')
  })
})

export {}
