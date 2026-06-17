// Smoke tests — stack real ponta a ponta (sem mocks).
//
// Pré-requisitos: backend + frontend rodando localmente com dev seed executado.
// O seed cria a clínica `pulso` (SEED_CLINIC_ID), admin@pulso.center/123123123
// e platform@pulso.center/123123123.
//
// Cada teste verifica uma camada diferente do contrato front↔back:
//   1. Auth multi-tenant (cookie access_token_pulso) + sessão autenticada
//   2. CRUD de paciente em contexto de clínica (criação, listagem, deleção)
//   3. Auth de backoffice (access_token sem slug) + listagem real

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'
const PLATFORM_EMAIL = 'platform@pulso.center'
const PLATFORM_PASSWORD = '123123123'

describe('Smoke — stack real ponta a ponta', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('admin da clínica faz login com token real e acessa o dashboard', () => {
    cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG)

    cy.visit(`/${CLINIC_SLUG}/dashboard`)

    cy.get('[data-testid="dashboard"]', { timeout: 10000 }).should('be.visible')
    cy.location('pathname').should('eq', `/${CLINIC_SLUG}/dashboard`)
    cy.getCookie(`access_token_${CLINIC_SLUG}`).should('exist')
  })

  it('admin da clínica cria e deleta paciente via stack real', () => {
    cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((token) => {
      const ts = Date.now()
      const document = String(ts).slice(-11).padStart(11, '0')

      cy.request({
        method: 'POST',
        url: `${Cypress.env('API_URL')}/patients`,
        headers: { Authorization: `Bearer ${token}` },
        body: {
          fullName: `Paciente Smoke ${ts}`,
          email: `smoke.patient.${ts}@e2e.test`,
          phoneNumber: '(11) 98765-4321',
          birthDate: '1985-03-20',
          documentNumber: document,
          gender: 'female',
        },
      }).then((createRes) => {
        const patientId = createRes.body.id as string

        cy.visit(`/${CLINIC_SLUG}/patients`)
        cy.get(`[data-testid="patient-table-row-${patientId}"]`, { timeout: 10000 }).should('exist')

        cy.request({
          method: 'DELETE',
          url: `${Cypress.env('API_URL')}/patients/${patientId}`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        })
      })
    })
  })

  it('platform admin acessa backoffice e vê a listagem real de clínicas', () => {
    cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)

    cy.visit('/backoffice/clinics')

    cy.get('[data-testid="clinic-list-table"]', { timeout: 10000 }).should('be.visible')
    cy.get(`[data-testid="clinic-slug-${CLINIC_ID}"]`).should('contain', CLINIC_SLUG)
  })
})
