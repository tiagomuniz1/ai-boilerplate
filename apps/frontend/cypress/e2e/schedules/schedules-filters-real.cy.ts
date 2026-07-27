// Stack real ponta a ponta — o filtro "Data de referência" (activeOn) da
// listagem de agendas nunca tinha teste algum: mostra só agendas cuja janela
// validFrom/validUntil cobre a data informada.

import { CLINIC_SLUG } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'

describe('Schedules — filters real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('filters the schedule list by a reference date, showing only schedules active on that date', () => {
    cy.seedProfessional().then((professional) => {
      cy.createScheduleViaApi(
        {
          professionalId: professional.professionalId,
          dayOfWeek: 'MONDAY',
          startTime: '08:00',
          endTime: '12:00',
          slotDurationInMinutes: 30,
          validFrom: '2020-01-01',
          validUntil: '2020-01-31',
        },
        professional.accessToken,
      ).then((januaryOnly) => {
        cy.createScheduleViaApi(
          {
            professionalId: professional.professionalId,
            dayOfWeek: 'TUESDAY',
            startTime: '08:00',
            endTime: '12:00',
            slotDurationInMinutes: 30,
            validFrom: '2020-03-01',
            validUntil: '2020-03-31',
          },
          professional.accessToken,
        ).then((marchOnly) => {
          cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
            cy.visit(`/${CLINIC_SLUG}/schedules`)
            cy.get(`[data-testid="schedule-table-row-${januaryOnly.id}"]`, { timeout: 10000 }).should('exist')
            cy.get(`[data-testid="schedule-table-row-${marchOnly.id}"]`).should('exist')

            cy.get('[data-testid="schedule-filter-active-on"]').type('2020-01-15')
            cy.get(`[data-testid="schedule-table-row-${januaryOnly.id}"]`, { timeout: 10000 }).should('exist')
            cy.get(`[data-testid="schedule-table-row-${marchOnly.id}"]`).should('not.exist')

            cy.get('[data-testid="schedule-filter-active-on"]').clear().type('2020-03-15')
            cy.get(`[data-testid="schedule-table-row-${marchOnly.id}"]`, { timeout: 10000 }).should('exist')
            cy.get(`[data-testid="schedule-table-row-${januaryOnly.id}"]`).should('not.exist')

            cy.deleteScheduleViaApi(januaryOnly.id, professional.accessToken)
            cy.deleteScheduleViaApi(marchOnly.id, professional.accessToken)
            cy.deleteProfessionalViaApi(professional.professionalId, professional.accessToken)
            cy.deleteUserViaApi(professional.userId, professional.accessToken)
            cy.deleteSpecialtyViaApi(professional.specialtyId, professional.platformAdminToken)
          })
        })
      })
    })
  })
})
