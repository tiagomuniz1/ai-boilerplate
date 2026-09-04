// Situação vacinal — o que falta pelo calendário, e a conduta do profissional.
//
// A tela faz afirmação clínica, então o que ela DIZ importa tanto quanto o que
// ela calcula: "pendente pelo calendário", nunca "em atraso", e sempre com o
// aviso de que a conduta é de quem atende.

import { visitClinic, CLINIC_ID } from '../../support/clinic'

const PATIENT_ID = 'aaaaaaaa-1111-1111-1111-000000000001'

const mockAdmin = {
  id: 'mock-admin-id',
  fullName: 'Dra. Helena',
  email: 'helena@clinic.com',
  role: 'admin',
  clinicId: CLINIC_ID,
}

const mockPatient = {
  id: PATIENT_ID,
  user: { id: 'user-uuid-1', fullName: 'Theo Monteiro Alves', email: 'theo@test.com', isActive: true },
  phoneNumber: '11988442170',
  birthDate: '2024-11-08',
  documentNumber: null,
  gender: 'male',
  responsiblePatientId: null,
  kinshipType: null,
  responsiblePatient: null,
  dependents: [],
  createdAt: '2024-11-08T10:00:00.000Z',
  updatedAt: '2024-11-08T10:00:00.000Z',
}

const myProfessional = {
  id: 'bbbbbbbb-2222-2222-2222-000000000001',
  user: { id: 'mock-admin-id', fullName: 'Dra. Helena', email: 'helena@clinic.com', isActive: true },
  registrations: [{ id: 'r1', councilType: 'crm', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [],
  bio: null,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
}

const statusBody = {
  patientId: PATIENT_ID,
  ageInMonths: 21,
  items: [
    {
      vaccineId: 'v-rota', vaccineName: 'Rotavírus humano', vaccineAbbreviation: 'VRH',
      status: 'atrasada', nextDoseLabel: '1ª dose', nextDoseDueFrom: '2025-01-08',
      dosesTaken: 0, dosesExpected: 2, decision: null, decisionReason: null, decidedByProfessionalName: null,
    },
    {
      vaccineId: 'v-scr', vaccineName: 'Tríplice viral', vaccineAbbreviation: 'SCR',
      status: 'pendente', nextDoseLabel: '1ª dose', nextDoseDueFrom: '2025-11-08',
      dosesTaken: 0, dosesExpected: 2, decision: null, decisionReason: null, decidedByProfessionalName: null,
    },
    {
      vaccineId: 'v-bcg', vaccineName: 'BCG', vaccineAbbreviation: 'BCG',
      status: 'em_dia', nextDoseLabel: null, nextDoseDueFrom: null,
      dosesTaken: 1, dosesExpected: 1, decision: null, decisionReason: null, decidedByProfessionalName: null,
    },
  ],
}

function stubBasics(comFicha = true) {
  cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${PATIENT_ID}`, { statusCode: 200, body: mockPatient })
  cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, {
    statusCode: 200,
    body: comFicha ? myProfessional : null,
  }).as('getMyProfessional')
  cy.intercept('GET', `${Cypress.env('API_URL')}/vaccines*`, {
    statusCode: 200, body: { data: [], total: 0, page: 1, limit: 100 },
  })
  cy.intercept('GET', `${Cypress.env('API_URL')}/vaccinations?*`, {
    statusCode: 200, body: { data: [], total: 0, page: 1, limit: 20 },
  })
  cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records*`, {
    statusCode: 200, body: { data: [], total: 0, page: 1, limit: 20 },
  })
  cy.intercept('GET', `${Cypress.env('API_URL')}/consultation-photos/**`, {
    statusCode: 200, body: { data: [], total: 0, page: 1, limit: 20 },
  })
}

describe('Situação vacinal', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('mostra o que falta, na ordem do que precisa ser olhado', () => {
    stubBasics()
    cy.intercept('GET', `${Cypress.env('API_URL')}/vaccine-schedules/patients/${PATIENT_ID}`, {
      statusCode: 200, body: statusBody,
    }).as('getStatus')

    visitClinic(`/patients/${PATIENT_ID}`, mockAdmin)
    cy.wait('@getStatus')

    cy.get('[data-testid="vaccine-status-summary"]').should('contain', '2 vacinas pendentes')

    cy.get('[data-testid^="vaccine-status-item-"]').first()
      .should('have.attr', 'data-testid', 'vaccine-status-item-v-rota')
    cy.get('[data-testid^="vaccine-status-item-"]').last()
      .should('have.attr', 'data-testid', 'vaccine-status-item-v-bcg')
  })

  // A linguagem é a decisão de produto: o sistema informa, não prescreve.
  it('fala em pendência pelo calendário e diz que a conduta é do profissional', () => {
    stubBasics()
    cy.intercept('GET', `${Cypress.env('API_URL')}/vaccine-schedules/patients/${PATIENT_ID}`, {
      statusCode: 200, body: statusBody,
    }).as('getStatus')

    visitClinic(`/patients/${PATIENT_ID}`, mockAdmin)
    cy.wait('@getStatus')

    cy.get('[data-testid="vaccine-status-badge-v-scr"]').should('contain', 'Pendente pelo calendário')
    cy.get('[data-testid="vaccine-status-disclaimer"]').should('contain', 'A conduta é do profissional')
  })

  it('registra a conduta com o motivo', () => {
    stubBasics()
    cy.intercept('GET', `${Cypress.env('API_URL')}/vaccine-schedules/patients/${PATIENT_ID}`, {
      statusCode: 200, body: statusBody,
    }).as('getStatus')

    visitClinic(`/patients/${PATIENT_ID}`, mockAdmin)
    cy.wait('@getStatus')

    cy.intercept('POST', `${Cypress.env('API_URL')}/vaccine-schedules/decisions`, (req) => {
      expect(req.body.decision).to.eq('dispensada')
      expect(req.body.reason).to.eq('Fora da faixa etária')
      req.reply({ statusCode: 201, body: {} })
    }).as('recordDecision')

    cy.get('[data-testid="vaccine-decide-v-rota"]').click()
    cy.get('[data-testid="vaccine-decision-select"]').select('dispensada')
    cy.get('[data-testid="vaccine-decision-reason"]').type('Fora da faixa etária')
    cy.get('[data-testid="vaccine-decision-confirm"]').click()

    cy.wait('@recordDecision')
  })

  it('exige motivo para dispensar', () => {
    stubBasics()
    cy.intercept('GET', `${Cypress.env('API_URL')}/vaccine-schedules/patients/${PATIENT_ID}`, {
      statusCode: 200, body: statusBody,
    }).as('getStatus')

    visitClinic(`/patients/${PATIENT_ID}`, mockAdmin)
    cy.wait('@getStatus')

    cy.get('[data-testid="vaccine-decide-v-rota"]').click()
    cy.get('[data-testid="vaccine-decision-select"]').select('dispensada')
    cy.get('[data-testid="vaccine-decision-confirm"]').click()

    cy.get('[data-testid="vaccine-decision-error"]').should('contain', 'Informe o motivo')
  })

  it('esconde a conduta de quem não tem ficha', () => {
    stubBasics(false)
    cy.intercept('GET', `${Cypress.env('API_URL')}/vaccine-schedules/patients/${PATIENT_ID}`, {
      statusCode: 200, body: statusBody,
    }).as('getStatus')

    visitClinic(`/patients/${PATIENT_ID}`, mockAdmin)
    cy.wait('@getStatus')
    cy.wait('@getMyProfessional')

    cy.get('[data-testid="vaccine-status-item-v-rota"]').should('be.visible')
    cy.get('[data-testid="vaccine-decide-v-rota"]').should('not.exist')
  })

  it('mostra estado de erro quando o cálculo falha', () => {
    stubBasics()
    cy.intercept('GET', `${Cypress.env('API_URL')}/vaccine-schedules/patients/${PATIENT_ID}`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'erro' },
    }).as('getStatusError')

    visitClinic(`/patients/${PATIENT_ID}`, mockAdmin)
    cy.wait('@getStatusError')

    cy.get('[data-testid="vaccine-status-error"]').should('be.visible')
  })
})

export {}
