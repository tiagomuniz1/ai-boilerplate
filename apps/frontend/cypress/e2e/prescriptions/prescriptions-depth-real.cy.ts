// Stack real ponta a ponta — aprofunda prescriptions-happy-path-real.cy.ts
// (que só cobria a aba "Digitar"). Módulo de maior risco (documento clínico
// assinado digitalmente) — os erros também são reais, não simulados.

import { CLINIC_SLUG } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function futureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function seedAppointment() {
  return cy.seedProfessional().then((professional) =>
    cy.seedPatient().then((patient) => {
      const dayOfWeek = DAY_NAMES[new Date().getDay()]
      return cy
        .createScheduleViaApi(
          { professionalId: professional.professionalId, dayOfWeek, startTime: '08:00', endTime: '18:00', slotDurationInMinutes: 30 },
          professional.accessToken,
        )
        .then((schedule) =>
          cy
            .createAppointmentViaApi(
              {
                professionalId: professional.professionalId,
                patientId: patient.patientId,
                specialtyId: professional.specialtyId,
                date: futureDateString(14),
                startTime: '09:00',
              },
              professional.accessToken,
            )
            .then((appointment) => ({ professional, patient, schedule, appointment })),
        )
    }),
  )
}

function cleanup(ctx: { professional: any; patient: any; schedule: any }) {
  cy.deleteScheduleViaApi(ctx.schedule.id, ctx.professional.accessToken)
  cy.deletePatientViaApi(ctx.patient.patientId, ctx.professional.accessToken)
  cy.deleteProfessionalViaApi(ctx.professional.professionalId, ctx.professional.accessToken)
  cy.deleteUserViaApi(ctx.professional.userId, ctx.professional.accessToken)
  cy.deleteSpecialtyViaApi(ctx.professional.specialtyId, ctx.professional.platformAdminToken)
}

describe('Prescriptions — depth real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('finds a real medication via autocomplete and prescribes it', () => {
    cy.seedSpecialty().then((catalogSeed) => {
      const medicationName = `Amoxicilina Real ${Date.now()}`
      cy.createMedicationViaApi({ name: medicationName, activeIngredient: 'Amoxicilina' }, catalogSeed.platformAdminToken).then((medication) => {
        seedAppointment().then((ctx) => {
          cy.loginAsClinicUser(ctx.professional.email, ctx.professional.password, CLINIC_SLUG).then((professionalToken) => {
            cy.visit(`/${CLINIC_SLUG}/appointments/${ctx.appointment.id}`)
            cy.get('[data-testid="tab-receitas"]', { timeout: 10000 }).click()
            cy.get('[data-testid="prescription-new-button"]').click()
            cy.get('[data-testid="prescription-form"]').should('be.visible')

            cy.get('[data-testid="prescription-form-search"]').type(medicationName)
            cy.get(`[data-testid="prescription-form-search-result-${medication.id}"]`, { timeout: 10000 }).should('be.visible').click()
            cy.get('[data-testid="prescription-form-item-instructions-0"]').type('1 cápsula a cada 8 horas')
            cy.get('[data-testid="prescription-form-submit"]').click()
            cy.get('[data-testid="prescription-form"]').should('not.exist')

            cy.request({
              method: 'GET',
              url: `${Cypress.env('API_URL')}/prescriptions?appointmentId=${ctx.appointment.id}`,
              headers: { Authorization: `Bearer ${professionalToken}` },
            }).then((listResponse) => {
              const created = listResponse.body[0]
              expect(created.items[0].medicationId).to.eq(medication.id)

              cy.deletePrescriptionViaApi(created.id, professionalToken)
              cy.request({
                method: 'PATCH',
                url: `${Cypress.env('API_URL')}/appointments/${ctx.appointment.id}/cancel`,
                headers: { Authorization: `Bearer ${professionalToken}` },
                body: {},
              })
              cleanup(ctx)
              cy.deleteMedicationViaApi(medication.id, catalogSeed.platformAdminToken)
              cy.deleteSpecialtyViaApi(catalogSeed.id, catalogSeed.platformAdminToken)
            })
          })
        })
      })
    })
  })

  it('saves a prescription as a template, then loads it back on a new prescription', () => {
    seedAppointment().then((ctx) => {
      cy.loginAsClinicUser(ctx.professional.email, ctx.professional.password, CLINIC_SLUG).then((professionalToken) => {
        cy.visit(`/${CLINIC_SLUG}/appointments/${ctx.appointment.id}`)
        cy.get('[data-testid="tab-receitas"]', { timeout: 10000 }).click()
        cy.get('[data-testid="prescription-new-button"]').click()
        cy.get('[data-testid="prescription-form"]').should('be.visible')

        cy.get('[data-testid="prescription-form-tab-ingredient"]').click()
        cy.get('[data-testid="prescription-form-manual-input"]').type('Dipirona')
        cy.get('[data-testid="prescription-form-manual-add"]').click()
        cy.get('[data-testid="prescription-form-item-instructions-0"]').type('Se dor, até 4x ao dia')

        const templateName = `Modelo Receita Real ${Date.now()}`
        cy.get('[data-testid="prescription-form-save-template-button"]').click()
        cy.get('[data-testid="prescription-form-save-template-modal"]').should('be.visible')
        cy.get('[data-testid="prescription-form-save-template-name"]').type(templateName)
        cy.get('[data-testid="prescription-form-save-template-confirm"]').click()
        cy.get('[data-testid="prescription-form-save-template-modal"]').should('not.exist')

        cy.get('[data-testid="prescription-form-submit"]').click()
        cy.get('[data-testid="prescription-form"]').should('not.exist')

        // Segunda receita, na mesma consulta: carrega o modelo salvo.
        cy.get('[data-testid="prescription-new-button"]').click()
        cy.get('[data-testid="prescription-form"]').should('be.visible')
        cy.get('[data-testid="prescription-form-load-template-button"]', { timeout: 10000 }).click()
        cy.get('[data-testid="prescription-form-load-template-modal"]').should('be.visible')
        cy.get('[data-testid="prescription-form-template-list"]').contains(templateName).click()
        cy.get('[data-testid="prescription-form-item-instructions-0"]').should('have.value', 'Se dor, até 4x ao dia')
        cy.get('[data-testid="prescription-form-submit"]').click()
        cy.get('[data-testid="prescription-form"]').should('not.exist')

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/prescriptions?appointmentId=${ctx.appointment.id}`,
          headers: { Authorization: `Bearer ${professionalToken}` },
        }).then((listResponse) => {
          expect(listResponse.body).to.have.length(2)

          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/prescription-templates`,
            headers: { Authorization: `Bearer ${professionalToken}` },
          }).then((templatesResponse) => {
            const savedTemplate = templatesResponse.body.find((t: any) => t.name === templateName)
            expect(savedTemplate).to.exist

            listResponse.body.forEach((p: any) => cy.deletePrescriptionViaApi(p.id, professionalToken))
            cy.deletePrescriptionTemplateViaApi(savedTemplate.id, professionalToken)
            cy.request({
              method: 'PATCH',
              url: `${Cypress.env('API_URL')}/appointments/${ctx.appointment.id}/cancel`,
              headers: { Authorization: `Bearer ${professionalToken}` },
              body: {},
            })
            cleanup(ctx)
          })
        })
      })
    })
  })

  it('rejects prescribing on a cancelled appointment (422 real) and 404s a PDF download for a deleted prescription', () => {
    seedAppointment().then((ctx) => {
      cy.loginAsClinicUser(ctx.professional.email, ctx.professional.password, CLINIC_SLUG).then((professionalToken) => {
        cy.request({
          method: 'PATCH',
          url: `${Cypress.env('API_URL')}/appointments/${ctx.appointment.id}/cancel`,
          headers: { Authorization: `Bearer ${professionalToken}` },
          body: {},
        }).then(() => {
          cy.visit(`/${CLINIC_SLUG}/appointments/${ctx.appointment.id}`)
          cy.get('[data-testid="tab-receitas"]', { timeout: 10000 }).click()
          cy.get('[data-testid="prescription-new-button"]').click()
          cy.get('[data-testid="prescription-form"]').should('be.visible')

          cy.get('[data-testid="prescription-form-tab-ingredient"]').click()
          cy.get('[data-testid="prescription-form-manual-input"]').type('Ibuprofeno')
          cy.get('[data-testid="prescription-form-manual-add"]').click()
          cy.get('[data-testid="prescription-form-item-instructions-0"]').type('Se dor')
          cy.get('[data-testid="prescription-form-submit"]').click()

          cy.get('[data-testid="prescription-form-error"]', { timeout: 10000 }).should('be.visible')
          cy.get('[data-testid="prescription-form"]').should('be.visible')

          // PDF de receita inexistente/excluída — 404 real.
          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/prescriptions/00000000-0000-4000-9000-000000000000/pdf`,
            headers: { Authorization: `Bearer ${professionalToken}` },
            failOnStatusCode: false,
          }).then((pdfResponse) => {
            expect(pdfResponse.status).to.eq(404)

            cleanup(ctx)
          })
        })
      })
    })
  })
})
