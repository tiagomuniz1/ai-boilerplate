// Stack real ponta a ponta — bloqueio de horário na agenda nunca foi testado,
// nem mockado nem real. Cobre o happy path (PROFESSIONAL bloqueia a própria
// agenda) e a regra de conflito real (409 quando já existe consulta na janela).

import { CLINIC_SLUG } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function futureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('Schedule exceptions — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('PROFESSIONAL blocks their own agenda via the real dialog', () => {
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
          cy.get('[data-testid="block-dialog-start-time"]').clear().type('10:00')
          cy.get('[data-testid="block-dialog-end-time"]').clear().type('11:00')
          cy.get('[data-testid="block-dialog-reason"]').type('Bloqueio de teste real')
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
            expect(created.startTime).to.eq('10:00')

            cy.get('[data-testid="block-banner"]').should('be.visible')

            cy.deleteScheduleExceptionViaApi(created.id, professionalToken)
            cy.deleteScheduleViaApi(schedule.id, professional.accessToken)
            cy.deleteProfessionalViaApi(professional.professionalId, professional.accessToken)
            cy.deleteUserViaApi(professional.userId, professional.accessToken)
            cy.deleteSpecialtyViaApi(professional.specialtyId, professional.platformAdminToken)
          })
        })
      })
    })
  })

  it('backend rejects blocking a window that already has an appointment (409)', () => {
    cy.seedProfessional().then((professional) => {
      cy.seedPatient().then((patient) => {
        const dayOfWeek = DAY_NAMES[new Date().getDay()]

        cy.createScheduleViaApi(
          { professionalId: professional.professionalId, dayOfWeek, startTime: '08:00', endTime: '18:00', slotDurationInMinutes: 30 },
          professional.accessToken,
        ).then((schedule) => {
          const targetDate = futureDateString(14)

          cy.createAppointmentViaApi(
            {
              professionalId: professional.professionalId,
              patientId: patient.patientId,
              specialtyId: professional.specialtyId,
              date: targetDate,
              startTime: '09:00',
            },
            professional.accessToken,
          ).then((appointment) => {
            cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then((professionalToken) => {
              cy.visit(`/${CLINIC_SLUG}/appointments`)
              cy.get('[data-testid="toolbar-next"]', { timeout: 10000 }).click()
              cy.get('[data-testid="toolbar-next"]').click()

              cy.get('[data-testid="toolbar-block-time"]').click()
              cy.get('[data-testid="block-time-dialog"]').should('be.visible')
              cy.get('[data-testid="block-dialog-date"]').clear().type(targetDate)
              cy.get('[data-testid="block-dialog-start-time"]').clear().type('09:00')
              cy.get('[data-testid="block-dialog-end-time"]').clear().type('09:30')
              cy.get('[data-testid="block-dialog-reason"]').type('Tentativa de bloqueio em conflito')
              cy.get('[data-testid="block-dialog-submit"]').click()

              cy.get('[data-testid="block-dialog-conflict-error"]').should('be.visible')

              cy.request({
                method: 'PATCH',
                url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/cancel`,
                headers: { Authorization: `Bearer ${professionalToken}` },
                body: {},
              })
              cy.deleteScheduleViaApi(schedule.id, professional.accessToken)
              cy.deletePatientViaApi(patient.patientId, professional.accessToken)
              cy.deleteProfessionalViaApi(professional.professionalId, professional.accessToken)
              cy.deleteUserViaApi(professional.userId, professional.accessToken)
              cy.deleteSpecialtyViaApi(professional.specialtyId, professional.platformAdminToken)
            })
          })
        })
      })
    })
  })

  it('shows real client-side validation errors for an empty date and time window', () => {
    cy.seedProfessional().then((professional) => {
      cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then(() => {
        cy.visit(`/${CLINIC_SLUG}/appointments`)
        cy.get('[data-testid="toolbar-block-time"]', { timeout: 10000 }).click()
        cy.get('[data-testid="block-time-dialog"]').should('be.visible')

        cy.get('[data-testid="block-dialog-date"]').clear()
        cy.get('[data-testid="block-dialog-start-time"]').clear()
        cy.get('[data-testid="block-dialog-end-time"]').clear()
        cy.get('[data-testid="block-dialog-submit"]').click()

        cy.get('[data-testid="block-dialog-date-error"]').should('be.visible')
        cy.get('[data-testid="block-dialog-start-time-error"]').should('be.visible')
        cy.get('[data-testid="block-dialog-end-time-error"]').should('be.visible')

        cy.get('[data-testid="block-dialog-cancel"]').click()
        cy.get('[data-testid="block-time-dialog"]').should('not.exist')

        cy.deleteProfessionalViaApi(professional.professionalId, professional.accessToken)
        cy.deleteUserViaApi(professional.userId, professional.accessToken)
        cy.deleteSpecialtyViaApi(professional.specialtyId, professional.platformAdminToken)
      })
    })
  })
})
