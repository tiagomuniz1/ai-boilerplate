// Caderneta de vacinação — o registro do que o paciente já tomou.
//
// A tela aparece em dois lugares: na ficha do paciente e como aba da consulta.
// O que muda entre eles é só o vínculo com o atendimento.

import { visitClinic, CLINIC_ID } from '../../support/clinic'

const PATIENT_ID = 'aaaaaaaa-1111-1111-1111-000000000001'
const VACCINE_ID = 'cccccccc-3333-3333-3333-000000000001'
const MY_PROFESSIONAL = 'bbbbbbbb-2222-2222-2222-000000000001'

const mockAdmin = {
  id: 'mock-admin-id',
  fullName: 'Dra. Helena',
  email: 'helena@clinic.com',
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

const mockVaccine = {
  id: VACCINE_ID,
  name: 'Tríplice viral',
  abbreviation: 'SCR',
  preventedDiseases: 'sarampo, caxumba, rubéola',
  isActive: true,
  createdAt: '2026-01-01T10:00:00.000Z',
}

const makeVaccination = (overrides: Record<string, unknown> = {}) => ({
  id: 'vc-1',
  patientId: PATIENT_ID,
  vaccineId: VACCINE_ID,
  vaccineName: 'Tríplice viral',
  vaccineAbbreviation: 'SCR',
  appointmentId: null,
  recordedByProfessionalId: MY_PROFESSIONAL,
  recordedByProfessionalName: 'Dra. Helena',
  doseLabel: '1ª dose',
  appliedAt: '2019-04-12',
  appliedAtOurClinic: false,
  appliedAtDescription: 'UBS Centro',
  lotNumber: null,
  manufacturer: null,
  notes: null,
  createdAt: '2026-01-01T10:00:00.000Z',
  ...overrides,
})

const myProfessional = {
  id: MY_PROFESSIONAL,
  user: { id: 'mock-admin-id', fullName: 'Dra. Helena', email: 'helena@clinic.com', isActive: true },
  registrations: [{ id: 'r1', councilType: 'crm', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [],
  bio: null,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
}

function stubBasics(comFicha = true) {
  cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${PATIENT_ID}`, {
    statusCode: 200,
    body: mockPatient,
  }).as('getPatient')

  // `/professionals*` não cobre `/professionals/me` — no minimatch o `*` não
  // atravessa `/`.
  cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, {
    statusCode: 200,
    body: comFicha ? myProfessional : null,
  }).as('getMyProfessional')

  cy.intercept('GET', `${Cypress.env('API_URL')}/vaccines*`, {
    statusCode: 200,
    body: { data: [mockVaccine], total: 1, page: 1, limit: 100 },
  }).as('getVaccines')

  cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records*`, {
    statusCode: 200,
    body: { data: [], total: 0, page: 1, limit: 20 },
  })
  cy.intercept('GET', `${Cypress.env('API_URL')}/consultation-photos/**`, {
    statusCode: 200,
    body: { data: [], total: 0, page: 1, limit: 20 },
  })
}

describe('Caderneta de vacinação', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('mostra as doses do paciente na ficha dele', () => {
    stubBasics()
    cy.intercept('GET', `${Cypress.env('API_URL')}/vaccinations?*`, {
      statusCode: 200,
      body: { data: [makeVaccination()], total: 1, page: 1, limit: 20 },
    }).as('getVaccinations')

    visitClinic(`/patients/${PATIENT_ID}`, mockAdmin)
    cy.wait('@getVaccinations')

    cy.get('[data-testid="patient-vaccinations-section"]').should('exist')
    cy.get('[data-testid="vaccination-row-vc-1"]')
      .should('contain', 'Tríplice viral')
      .and('contain', '1ª dose')
      .and('contain', '12/04/2019')
      .and('contain', 'UBS Centro')
  })

  it('mostra estado vazio para paciente sem dose', () => {
    stubBasics()
    cy.intercept('GET', `${Cypress.env('API_URL')}/vaccinations?*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    }).as('getVaccinations')

    visitClinic(`/patients/${PATIENT_ID}`, mockAdmin)
    cy.wait('@getVaccinations')

    cy.get('[data-testid="vaccination-history-empty"]').should('be.visible')
  })

  it('mostra estado de erro quando a busca falha', () => {
    stubBasics()
    cy.intercept('GET', `${Cypress.env('API_URL')}/vaccinations?*`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('getVaccinationsError')

    visitClinic(`/patients/${PATIENT_ID}`, mockAdmin)
    cy.wait('@getVaccinationsError')

    cy.get('[data-testid="vaccination-history-error"]').should('be.visible')
  })

  // Registrar uma dose tomada em outro serviço, sem consulta nenhuma — o caso
  // mais comum da caderneta e o que motivou o `appointment_id` nulo.
  it('registra uma dose tomada fora, sem consulta', () => {
    stubBasics()
    cy.intercept('GET', `${Cypress.env('API_URL')}/vaccinations?*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    }).as('getVaccinations')

    visitClinic(`/patients/${PATIENT_ID}`, mockAdmin)
    cy.wait('@getVaccinations')

    cy.intercept('POST', `${Cypress.env('API_URL')}/vaccinations`, (req) => {
      expect(req.body.patientId).to.eq(PATIENT_ID)
      expect(req.body.appointmentId).to.be.undefined
      expect(req.body.doseLabel).to.eq('1ª dose')
      req.reply({ statusCode: 201, body: makeVaccination() })
    }).as('createVaccination')

    cy.get('[data-testid="vaccination-history-new-button"]').click()
    cy.get('[data-testid="vaccination-form"]').should('be.visible')
    cy.get('[data-testid="vaccination-form-vaccine"]').select(VACCINE_ID)
    cy.get('[data-testid="vaccination-form-dose"]').type('1ª dose')
    cy.get('[data-testid="vaccination-form-applied-at"]').type('2019-04-12')
    cy.get('[data-testid="vaccination-form-where"]').type('UBS Centro')
    cy.get('[data-testid="vaccination-form-submit"]').click()

    cy.wait('@createVaccination')
  })

  // Cargo dá escopo, ficha dá exercício — a regra do sistema inteiro.
  it('esconde o botão de registrar de quem não tem ficha', () => {
    stubBasics(false)
    cy.intercept('GET', `${Cypress.env('API_URL')}/vaccinations?*`, {
      statusCode: 200,
      body: { data: [makeVaccination()], total: 1, page: 1, limit: 20 },
    }).as('getVaccinations')

    visitClinic(`/patients/${PATIENT_ID}`, mockAdmin)
    cy.wait('@getVaccinations')
    cy.wait('@getMyProfessional')

    cy.get('[data-testid="vaccination-row-vc-1"]').should('be.visible')
    cy.get('[data-testid="vaccination-history-new-button"]').should('not.exist')
  })

  it('exclui uma dose pelo diálogo de confirmação', () => {
    stubBasics()
    cy.intercept('GET', `${Cypress.env('API_URL')}/vaccinations?*`, {
      statusCode: 200,
      body: { data: [makeVaccination()], total: 1, page: 1, limit: 20 },
    }).as('getVaccinations')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/vaccinations/vc-1`, {
      statusCode: 204,
      body: '',
    }).as('deleteVaccination')

    visitClinic(`/patients/${PATIENT_ID}`, mockAdmin)
    cy.wait('@getVaccinations')

    cy.get('[data-testid="vaccination-delete-vc-1"]').click()
    cy.get('[data-testid="vaccination-delete-dialog-message"]').should('be.visible')
    cy.get('[data-testid="vaccination-delete-confirm"]').click()

    cy.wait('@deleteVaccination')
  })

  it('o campo de data não aceita dia futuro', () => {
    stubBasics()
    cy.intercept('GET', `${Cypress.env('API_URL')}/vaccinations?*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    }).as('getVaccinations')

    visitClinic(`/patients/${PATIENT_ID}`, mockAdmin)
    cy.wait('@getVaccinations')

    cy.get('[data-testid="vaccination-history-new-button"]').click()
    const hoje = new Date().toISOString().slice(0, 10)
    cy.get('[data-testid="vaccination-form-applied-at"]').should('have.attr', 'max', hoje)
  })
})

export {}
