// Stack real ponta a ponta — cobre as duas regras de negócio que só o backend
// real pode validar: o slot reservável é derivado da configuração de agenda
// (cliente manda só date+startTime), e "concluir" rejeita consulta futura mas
// aceita uma consulta passada. Erros, loading e validação seguem mockados em
// appointments-book.cy.ts / appointments-complete.cy.ts.

import { CLINIC_SLUG } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

describe('Appointments — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('PROFESSIONAL books a real slot derived from their schedule', () => {
    cy.seedProfessional().then((professional) => {
      cy.seedPatient().then((patient) => {
        const dayOfWeek = DAY_NAMES[new Date().getDay()]

        cy.createScheduleViaApi(
          {
            professionalId: professional.professionalId,
            dayOfWeek,
            startTime: '08:00',
            endTime: '18:00',
            slotDurationInMinutes: 30,
          },
          professional.accessToken,
        ).then((schedule) => {
          cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then((professionalToken) => {
            cy.visit(`/${CLINIC_SLUG}/appointments`)
            // Navigate 2 weeks forward so all slots on the recurring schedule are in the future.
            cy.get('[data-testid="toolbar-next"]', { timeout: 10000 }).click()
            cy.get('[data-testid="toolbar-next"]').click()

            cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 }).first().click()
            cy.get('[data-testid="book-appointment-dialog"]').should('be.visible')
            cy.get('[data-testid="book-dialog-patient"]').select(patient.patientId)
            cy.get('[data-testid="book-dialog-submit"]').click()
            cy.get('[data-testid="book-appointment-dialog"]').should('not.exist')

            cy.request({
              method: 'GET',
              url: `${Cypress.env('API_URL')}/appointments?patientId=${patient.patientId}`,
              headers: { Authorization: `Bearer ${professionalToken}` },
            }).then((listResponse) => {
              const created = listResponse.body.data[0]
              expect(created).to.exist
              expect(created.professionalId).to.eq(professional.professionalId)
              expect(created.status).to.eq('scheduled')

              cy.request({
                method: 'PATCH',
                url: `${Cypress.env('API_URL')}/appointments/${created.id}/cancel`,
                headers: { Authorization: `Bearer ${professionalToken}` },
                body: {},
              })
              cy.deleteScheduleViaApi(schedule.id, professional.accessToken)
            })
          })
        })
      })
    })
  })

  it('ADMIN completes a past appointment but is rejected on a future one', () => {
    cy.seedProfessional().then((professional) => {
      cy.seedPatient().then((patient) => {
        const dayOfWeek = DAY_NAMES[new Date().getDay()]

        cy.createScheduleViaApi(
          {
            professionalId: professional.professionalId,
            dayOfWeek,
            startTime: '08:00',
            endTime: '18:00',
            slotDurationInMinutes: 30,
          },
          professional.accessToken,
        ).then((schedule) => {
          // A past appointment can't be created through the API (it rejects
          // past slots by design — see create-appointment.use-case.ts) so it's
          // backdated directly in the DB, mirroring how the backend's own
          // integration test sets this up.
          const yesterday = new Date(Date.now() - 86400000)
          const pastDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
          const pastAppointmentId = crypto.randomUUID()

          cy.task('dbQuery', {
            sql: `INSERT INTO appointments (id, clinic_id, professional_id, patient_id, schedule_id, date, start_time, end_time, status)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled')`,
            params: [
              pastAppointmentId,
              '10000000-0000-4000-8000-000000000000',
              professional.professionalId,
              patient.patientId,
              schedule.id,
              pastDate,
              '08:00',
              '08:30',
            ],
          }).then(() => {
            cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
              cy.visit(`/${CLINIC_SLUG}/appointments/${pastAppointmentId}`)
              cy.get('[data-testid="appointment-detail-complete-button"]', { timeout: 10000 }).click()
              cy.get('[data-testid="complete-appointment-dialog"]').should('be.visible')
              cy.get('[data-testid="complete-dialog-confirm"]').click()
              cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/appointments/${pastAppointmentId}`,
                headers: { Authorization: `Bearer ${adminToken}` },
              }).then((getResponse) => {
                expect(getResponse.body.status).to.eq('completed')
              })

              // Future appointment: real backend rejects completion with 422.
              const target = new Date(Date.now() + 14 * 86400000)
              const targetDate = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`

              cy.createAppointmentViaApi(
                {
                  professionalId: professional.professionalId,
                  patientId: patient.patientId,
                  specialtyId: professional.specialtyId,
                  date: targetDate,
                  startTime: '09:00',
                },
                adminToken,
              ).then((futureAppointment) => {
                cy.visit(`/${CLINIC_SLUG}/appointments/${futureAppointment.id}`)
                cy.get('[data-testid="appointment-detail-complete-button"]', { timeout: 10000 }).click()
                cy.get('[data-testid="complete-appointment-dialog"]').should('be.visible')
                cy.get('[data-testid="complete-dialog-confirm"]').click()
                cy.get('[data-testid="appointment-detail-complete-error"]').should('contain.text', 'futura')

                cy.request({
                  method: 'PATCH',
                  url: `${Cypress.env('API_URL')}/appointments/${futureAppointment.id}/cancel`,
                  headers: { Authorization: `Bearer ${adminToken}` },
                  body: {},
                })
                cy.deleteScheduleViaApi(schedule.id, adminToken)
              })
            })
          })
        })
      })
    })
  })
})
