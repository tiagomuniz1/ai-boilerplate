// Stack real ponta a ponta — aprofunda atestados-happy-path-real.cy.ts (que só
// cobria o tipo "Comparecimento"). Módulo de maior risco (documento legal
// assinado digitalmente) — o erro também é real, não simulado.

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

describe('Atestados — depth real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('issues a leave (Afastamento) certificate via the real form and previews it', () => {
    seedAppointment().then((ctx) => {
      cy.loginAsClinicUser(ctx.professional.email, ctx.professional.password, CLINIC_SLUG).then((professionalToken) => {
        cy.visit(`/${CLINIC_SLUG}/appointments/${ctx.appointment.id}`)
        cy.get('[data-testid="tab-atestados"]', { timeout: 10000 }).click()
        cy.get('[data-testid="atestado-new-button"]').click()
        cy.get('[data-testid="atestado-form"]').should('be.visible')

        cy.get('[data-testid="atestado-form-type-leave"]').click()
        cy.get('[data-testid="atestado-form-days-off"]').clear().type('3')
        cy.get('[data-testid="atestado-form-start-date"]').type('2026-08-10')
        cy.get('[data-testid="atestado-form-cid-code"]').type('M54.5')
        cy.get('[data-testid="atestado-form-observations"]').type('Paciente deve evitar esforço físico.')
        cy.get('[data-testid="atestado-form-submit"]').click()

        cy.get('[data-testid="atestado-form"]').should('not.exist')
        cy.get('[data-testid="atestado-section-list"]', { timeout: 10000 }).should('be.visible')

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/medical-certificates?appointmentId=${ctx.appointment.id}`,
          headers: { Authorization: `Bearer ${professionalToken}` },
        }).then((listResponse) => {
          const created = Array.isArray(listResponse.body) ? listResponse.body[0] : listResponse.body.data[0]
          expect(created.type).to.eq('leave')
          expect(created.daysOff).to.eq(3)
          expect(created.cidCode).to.eq('M54.5')
          expect(created.observations).to.eq('Paciente deve evitar esforço físico.')

          cy.get(`[data-testid="atestado-preview-button-${created.id}"]`).click()
          cy.get('[data-testid="atestado-preview-modal"]', { timeout: 10000 }).should('be.visible')
          cy.get('[data-testid="atestado-preview-body"]').should('be.visible')
          cy.get('[data-testid="atestado-preview-observations"]').should('contain.text', 'Paciente deve evitar esforço físico.')

          cy.deleteMedicalCertificateViaApi(created.id, professionalToken)
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

  it('rejects issuing a certificate on a cancelled appointment (422 real)', () => {
    seedAppointment().then((ctx) => {
      cy.loginAsClinicUser(ctx.professional.email, ctx.professional.password, CLINIC_SLUG).then((professionalToken) => {
        cy.request({
          method: 'PATCH',
          url: `${Cypress.env('API_URL')}/appointments/${ctx.appointment.id}/cancel`,
          headers: { Authorization: `Bearer ${professionalToken}` },
          body: {},
        }).then(() => {
          cy.visit(`/${CLINIC_SLUG}/appointments/${ctx.appointment.id}`)
          cy.get('[data-testid="tab-atestados"]', { timeout: 10000 }).click()
          cy.get('[data-testid="atestado-new-button"]').click()
          cy.get('[data-testid="atestado-form"]').should('be.visible')

          cy.get('[data-testid="atestado-form-type-attendance"]').click()
          cy.get('[data-testid="atestado-form-attendance-date"]').type(futureDateString(14))
          cy.get('[data-testid="atestado-form-check-in-time"]').clear().type('09:00')
          cy.get('[data-testid="atestado-form-check-out-time"]').clear().type('09:30')
          cy.get('[data-testid="atestado-form-submit"]').click()

          cy.get('[data-testid="atestado-form-error"]', { timeout: 10000 }).should('be.visible')
          cy.get('[data-testid="atestado-form"]').should('be.visible')

          cleanup(ctx)
        })
      })
    })
  })
})
