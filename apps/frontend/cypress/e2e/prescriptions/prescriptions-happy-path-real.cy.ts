// Stack real ponta a ponta — nenhum teste hoje exercitava emissão de receita:
// nem mockado, nem real. PROFESSIONAL emite via formulário real (aba "Digitar"
// evita depender da base de medicamentos), item aparece na lista, e o PDF é
// baixável via GET real.

import { CLINIC_SLUG } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

describe('Prescriptions — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('PROFESSIONAL issues a prescription via the real form, downloads the PDF, then deletes it', () => {
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
              cy.get('[data-testid="tab-receitas"]', { timeout: 10000 }).click()
              cy.get('[data-testid="prescription-section"]').should('be.visible')
              cy.get('[data-testid="prescription-new-button"]').click()
              cy.get('[data-testid="prescription-form"]').should('be.visible')

              cy.get('[data-testid="prescription-form-tab-ingredient"]').click()
              cy.get('[data-testid="prescription-form-manual-input"]').type('Ibuprofeno')
              cy.get('[data-testid="prescription-form-manual-add"]').click()
              cy.get('[data-testid="prescription-form-item-instructions-0"]').type('1 comprimido a cada 8 horas')
              cy.get('[data-testid="prescription-form-submit"]').click()

              cy.get('[data-testid="prescription-form"]').should('not.exist')
              cy.get('[data-testid="prescription-section-list"]').should('be.visible')

              cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/prescriptions?appointmentId=${appointment.id}`,
                headers: { Authorization: `Bearer ${professionalToken}` },
              }).then((listResponse) => {
                const created = listResponse.body[0]
                expect(created).to.exist
                expect(created.items[0].instructions).to.eq('1 comprimido a cada 8 horas')

                cy.get(`[data-testid="prescription-item-${created.id}"]`).should('exist')

                cy.request({
                  method: 'GET',
                  url: `${Cypress.env('API_URL')}/prescriptions/${created.id}/pdf`,
                  headers: { Authorization: `Bearer ${professionalToken}` },
                  encoding: 'binary',
                }).then((pdfResponse) => {
                  expect(pdfResponse.status).to.eq(200)
                  expect(pdfResponse.headers['content-type']).to.include('application/pdf')

                  cy.deletePrescriptionViaApi(created.id, professionalToken)
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
                  cy.unlinkSpecialtyFromClinicViaApi(
                    '10000000-0000-4000-8000-000000000000',
                    professional.specialtyId,
                    professional.platformAdminToken,
                  )
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
