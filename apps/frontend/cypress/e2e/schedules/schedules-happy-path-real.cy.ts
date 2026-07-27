// Stack real ponta a ponta — PROFESSIONAL cria a própria agenda (sem campo de
// seleção), ADMIN cria em nome de um profissional (com campo de seleção).
// Erros, loading e validação continuam mockados em schedules-create.cy.ts.

import { CLINIC_SLUG, expectClinicPath } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'

describe('Schedules — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('PROFESSIONAL creates their own schedule via the real form', () => {
    cy.seedProfessional().then((professional) => {
      cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then((professionalToken) => {
        cy.visit(`/${CLINIC_SLUG}/schedules/new`)
        cy.get('[data-testid="schedule-form-professional"]').should('not.exist')

        cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
        cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
        cy.get('[data-testid="schedule-form-end-time"]').clear().type('13:00')
        cy.get('[data-testid="schedule-form-slot"]').type('{selectall}60')
        cy.get('[data-testid="schedule-form-valid-from"]').type('2020-01-01')
        cy.get('[data-testid="schedule-form-valid-until"]').type('2020-12-31')
        cy.get('[data-testid="schedule-form-submit"]').click()

        expectClinicPath('/schedules')

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/schedules?professionalId=${professional.professionalId}`,
          headers: { Authorization: `Bearer ${professionalToken}` },
        }).then((listResponse) => {
          const created = listResponse.body.data[0]
          expect(created).to.exist
          expect(created.dayOfWeek).to.eq('TUESDAY')
          expect(created.startTime).to.eq('09:00')
          expect(created.validFrom).to.eq('2020-01-01')
          expect(created.validUntil).to.eq('2020-12-31')

          cy.deleteScheduleViaApi(created.id, professionalToken)
        })
      })
    })
  })

  it('ADMIN selects a professional and creates a schedule on their behalf', () => {
    cy.seedProfessional().then((professional) => {
      cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
        cy.visit(`/${CLINIC_SLUG}/schedules/new`)
        cy.get('[data-testid="schedule-form-professional"]', { timeout: 10000 }).select(professional.professionalId)
        cy.get('[data-testid="schedule-form-day"]').select('WEDNESDAY')
        cy.get('[data-testid="schedule-form-start-time"]').clear().type('08:00')
        cy.get('[data-testid="schedule-form-end-time"]').clear().type('12:00')
        cy.get('[data-testid="schedule-form-slot"]').type('{selectall}30')
        cy.get('[data-testid="schedule-form-submit"]').click()

        expectClinicPath('/schedules')

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/schedules?professionalId=${professional.professionalId}`,
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then((listResponse) => {
          const created = listResponse.body.data[0]
          expect(created).to.exist
          expect(created.professionalId).to.eq(professional.professionalId)
          expect(created.dayOfWeek).to.eq('WEDNESDAY')

          cy.deleteScheduleViaApi(created.id, adminToken)
        })
      })
    })
  })
})
