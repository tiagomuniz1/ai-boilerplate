// Cobre três widgets secundários sem teste dedicado, encadeados no mesmo fluxo real:
// 1) o link "Consultas" na listagem de profissionais (filtra a agenda por médico)
// 2) o diálogo de detalhes rápidos ao clicar num slot já ocupado da agenda
// 3) a navegação pelos contadores de documentos na aba Resumo da consulta

import { CLINIC_SLUG } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function futureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('Appointment details dialog, "Consultas" link and resumo tab counters — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('filters the agenda from the professional list, opens the booked slot details, and follows a document counter into its tab', () => {
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
              cy.createPrescriptionViaApi(
                { appointmentId: appointment.id, items: [{ activeIngredientName: 'Dipirona', instructions: '1x ao dia' }] },
                professionalToken,
              ).then(() => {
                cy.clearCookies()

                cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
                  cy.visit(`/${CLINIC_SLUG}/professionals`)
                  cy.get('[data-testid="professional-list-search"]', { timeout: 10000 }).type(professional.fullName)
                  cy.get(`[data-testid="professional-appointments-link-${professional.professionalId}"]`).click()

                  cy.location('pathname', { timeout: 10000 }).should('eq', `/${CLINIC_SLUG}/appointments`)
                  cy.location('search').should('contain', `doctor=${professional.professionalId}`)
                  cy.get('[data-testid="toolbar-professional-select"]').should('have.value', professional.professionalId)
                  cy.get('[data-testid="agenda-empty-professional"]').should('not.exist')

                  // Navigate the day view to the target date to find the booked slot.
                  cy.get('[data-testid="toolbar-view-day"]').click()
                  for (let i = 0; i < 14; i++) {
                    cy.get('[data-testid="toolbar-next"]').click()
                  }

                  cy.get('[data-testid="agenda-slot-booked"]', { timeout: 10000 }).should('contain.text', patient.fullName).click()

                  cy.get('[data-testid="appointment-details-dialog"]').should('be.visible')
                  cy.get('[data-testid="details-patient"]').should('contain.text', patient.fullName)
                  cy.get('[data-testid="details-professional"]').should('contain.text', professional.fullName)

                  cy.get('[data-testid="go-to-appointment-button"]').click()
                  cy.location('pathname', { timeout: 10000 }).should('eq', `/${CLINIC_SLUG}/appointments/${appointment.id}`)

                  cy.get('[data-testid="resumo-tab"]', { timeout: 10000 }).should('be.visible')
                  cy.get('[data-testid="resumo-tab-prescriptions-count"]').should('contain.text', '1')

                  cy.get('[data-testid="resumo-tab-prescriptions"]').click()
                  cy.get('[data-testid="tab-receitas"]').should('have.attr', 'aria-selected', 'true')
                  cy.get('[data-testid="prescription-section"]', { timeout: 10000 }).should('be.visible')

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
})
