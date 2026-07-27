// Stack real ponta a ponta — o atalho "Preencher prontuário" no cabeçalho da
// consulta (header-fill-record-button) nunca tinha teste algum: é um caminho
// de entrada distinto do botão dentro da própria aba "Prontuário" (esse já
// coberto em medical-records-happy-path-real.cy.ts), condicional a
// !hasRecord, que só troca a aba ativa para "prontuario".

import { CLINIC_SLUG } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

describe('Appointment header — fill record shortcut real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('jumps from the Resumo tab to Prontuário via the header shortcut button', () => {
    cy.seedProfessional().then((professional) => {
      cy.seedPatient().then((patient) => {
        const dayOfWeek = DAY_NAMES[new Date().getDay()]

        cy.createScheduleViaApi(
          { professionalId: professional.professionalId, dayOfWeek, startTime: '08:00', endTime: '18:00', slotDurationInMinutes: 30 },
          professional.accessToken,
        ).then((schedule) => {
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
            professional.accessToken,
          ).then((appointment) => {
            cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then((professionalToken) => {
              cy.visit(`/${CLINIC_SLUG}/appointments/${appointment.id}`)
              cy.get('[data-testid="appointment-detail-page"], [data-testid="tab-resumo"]', { timeout: 10000 }).should('be.visible')
              cy.get('[data-testid="tab-resumo"]').should('have.attr', 'aria-selected', 'true')

              cy.get('[data-testid="header-fill-record-button"]').should('be.visible').click()

              cy.get('[data-testid="tab-prontuario"]').should('have.attr', 'aria-selected', 'true')
              cy.get('[data-testid="fill-medical-record-button"]', { timeout: 10000 }).should('be.visible')

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
})
