// Stack real ponta a ponta — nenhum teste hoje exercitava emissão de atestado:
// nem mockado, nem real. PROFESSIONAL emite via formulário real (tipo
// "comparecimento", mais simples que "afastamento"), item aparece na lista.

import { CLINIC_SLUG } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function futureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('Atestados — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('PROFESSIONAL issues an attendance certificate via the real form, then deletes it', () => {
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
              cy.visit(`/${CLINIC_SLUG}/appointments/${appointment.id}`)
              cy.get('[data-testid="tab-atestados"]', { timeout: 10000 }).click()
              cy.get('[data-testid="atestado-section"]').should('be.visible')
              cy.get('[data-testid="atestado-new-button"]').click()
              cy.get('[data-testid="atestado-form"]').should('be.visible')

              cy.get('[data-testid="atestado-form-type-attendance"]').click()
              cy.get('[data-testid="atestado-form-attendance-date"]').clear().type(targetDate)
              cy.get('[data-testid="atestado-form-check-in-time"]').clear().type('09:00')
              cy.get('[data-testid="atestado-form-check-out-time"]').clear().type('09:30')
              cy.get('[data-testid="atestado-form-submit"]').click()

              cy.get('[data-testid="atestado-form"]').should('not.exist')
              cy.get('[data-testid="atestado-section-list"]').should('be.visible')

              cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/medical-certificates?appointmentId=${appointment.id}`,
                headers: { Authorization: `Bearer ${professionalToken}` },
              }).then((listResponse) => {
                const created = Array.isArray(listResponse.body) ? listResponse.body[0] : listResponse.body.data[0]
                expect(created).to.exist
                expect(created.type).to.eq('attendance')

                cy.get(`[data-testid="atestado-item-${created.id}"]`).should('exist')

                cy.deleteMedicalCertificateViaApi(created.id, professionalToken)
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
})
