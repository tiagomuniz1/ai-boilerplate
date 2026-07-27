// Stack real ponta a ponta — dashboard.cy.ts (20 testes) tem boa cobertura de
// UI, mas é 100% mockado, nunca bateu no backend real. Cria uma consulta real
// e confirma que o KPI "Agendadas" reflete o dado real do backend para o
// mesmo intervalo de datas.

import { CLINIC_SLUG } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function futureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('Dashboard — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('reflects a real appointment in the scheduled KPI for the selected date range', () => {
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
            cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
              cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/dashboard?from=${targetDate}&to=${targetDate}`,
                headers: { Authorization: `Bearer ${adminToken}` },
              }).then((dashboardResponse) => {
                expect(dashboardResponse.body.kpi.scheduled).to.be.at.least(1)

                cy.visit(`/${CLINIC_SLUG}/dashboard`)
                cy.get('[data-testid="dashboard-date-range"]', { timeout: 10000 }).should('be.visible')

                cy.get('[data-testid="dashboard-date-to"]').clear().type(targetDate)
                cy.get('[data-testid="dashboard-date-from"]').clear().type(targetDate)

                cy.get('[data-testid="dashboard-kpi-scheduled"]', { timeout: 10000 }).should(
                  'contain.text',
                  String(dashboardResponse.body.kpi.scheduled),
                )

                cy.request({
                  method: 'PATCH',
                  url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/cancel`,
                  headers: { Authorization: `Bearer ${adminToken}` },
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
  })
})
