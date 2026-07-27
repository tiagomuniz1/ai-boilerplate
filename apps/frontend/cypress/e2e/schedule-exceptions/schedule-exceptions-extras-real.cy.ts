// Aprofunda schedule-exceptions-happy-path-real.cy.ts (que só cobria criar um
// bloqueio com horário específico). Cobre a opção "dia inteiro" e o botão
// "Remover" do BlockBanner, ambos sem cobertura até aqui.

import { CLINIC_SLUG } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function futureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('Schedule exceptions — extras real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('blocks a full day, then removes the block via the banner', () => {
    cy.seedProfessional().then((professional) => {
      const dayOfWeek = DAY_NAMES[new Date().getDay()]

      cy.createScheduleViaApi(
        { professionalId: professional.professionalId, dayOfWeek, startTime: '08:00', endTime: '18:00', slotDurationInMinutes: 30 },
        professional.accessToken,
      ).then((schedule) => {
        const targetDate = futureDateString(14)

        cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then((professionalToken) => {
          cy.visit(`/${CLINIC_SLUG}/appointments`)
          cy.get('[data-testid="toolbar-next"]', { timeout: 10000 }).click()
          cy.get('[data-testid="toolbar-next"]').click()

          cy.get('[data-testid="toolbar-block-time"]').click()
          cy.get('[data-testid="block-time-dialog"]').should('be.visible')
          cy.get('[data-testid="block-dialog-date"]').clear().type(targetDate)
          cy.get('[data-testid="block-dialog-all-day"]').check()
          cy.get('[data-testid="block-dialog-start-time"]').should('be.disabled')
          cy.get('[data-testid="block-dialog-reason"]').type('Dia inteiro — real')
          cy.get('[data-testid="block-dialog-submit"]').click()

          cy.get('[data-testid="block-time-dialog"]').should('not.exist')

          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/schedule-exceptions?professionalId=${professional.professionalId}`,
            headers: { Authorization: `Bearer ${professionalToken}` },
          }).then((listResponse) => {
            const created = listResponse.body.data[0]
            expect(created).to.exist
            expect(created.date).to.eq(targetDate)
            expect(created.startTime).to.be.null

            cy.get('[data-testid="block-banner"]').should('be.visible')
            cy.get('[data-testid="block-banner-remove"]').click()

            cy.request({
              method: 'GET',
              url: `${Cypress.env('API_URL')}/schedule-exceptions/${created.id}`,
              headers: { Authorization: `Bearer ${professionalToken}` },
              failOnStatusCode: false,
            }).then((getResponse) => {
              expect(getResponse.status).to.eq(404)

              cy.deleteScheduleViaApi(schedule.id, professional.accessToken)
              cy.deleteProfessionalViaApi(professional.professionalId, professional.accessToken)
              cy.deleteUserViaApi(professional.userId, professional.accessToken)
              cy.deleteSpecialtyViaApi(professional.specialtyId, professional.platformAdminToken)
            })
          })
        })
      })
    })
  })
})
