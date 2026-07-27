// Stack real ponta a ponta — o endpoint de verificação é público (sem login),
// consumido pela farmácia ao bipar o QR Code do PDF da receita. Zero cobertura
// hoje. O token de verificação em texto puro não é exposto por nenhuma rota —
// só existe na coluna do banco — por isso o cy.task('dbQuery') criado na Fase 1.

import { CLINIC_SLUG } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function futureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('Prescription verification — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows masked patient data for a valid token, and an invalid state for a bad token', () => {
    cy.seedProfessional().then((professional) => {
      cy.seedPatient().then((patient) => {
        const dayOfWeek = DAY_NAMES[new Date().getDay()]

        cy.createScheduleViaApi(
          { professionalId: professional.professionalId, dayOfWeek, startTime: '08:00', endTime: '18:00', slotDurationInMinutes: 30 },
          professional.accessToken,
        ).then((schedule) => {
          cy.createAppointmentViaApi(
            {
              professionalId: professional.professionalId,
              patientId: patient.patientId,
              specialtyId: professional.specialtyId,
              date: futureDateString(14),
              startTime: '09:00',
            },
            professional.accessToken,
          ).then((appointment) => {
            cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then((professionalToken) => {
            cy.createPrescriptionViaApi(
              { appointmentId: appointment.id, items: [{ activeIngredientName: 'Amoxicilina', instructions: '1 cápsula a cada 12 horas' }] },
              professionalToken,
            ).then((prescription) => {
              cy.task('dbQuery', {
                sql: 'SELECT verification_token FROM prescriptions WHERE id = $1',
                params: [prescription.id],
              }).then((rows: any) => {
                const token = rows[0].verification_token

                cy.clearCookies()
                cy.visit(`/${CLINIC_SLUG}/verify/prescriptions/${token}`)

                cy.get('[data-testid="verification-success"]', { timeout: 10000 }).should('be.visible')
                cy.get('[data-testid="verification-professional"]').should('contain.text', professional.fullName)
                cy.get('[data-testid="verification-patient"]').invoke('text').then((text) => {
                  expect(text).to.not.contain(patient.fullName)
                  expect(text.split(' ')[0]).to.eq(patient.fullName.split(' ')[0])
                })
                cy.get('[data-testid="verification-items"]').should('contain.text', 'Amoxicilina')

                cy.visit(`/${CLINIC_SLUG}/verify/prescriptions/invalid-token-that-does-not-exist`)
                cy.get('[data-testid="verification-invalid"]', { timeout: 10000 }).should('be.visible')

                cy.deletePrescriptionViaApi(prescription.id, professional.accessToken)
                cy.request({
                  method: 'PATCH',
                  url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/cancel`,
                  headers: { Authorization: `Bearer ${professional.accessToken}` },
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

  it('shows an invalid state for a soft-deleted prescription', () => {
    cy.seedProfessional().then((professional) => {
      cy.seedPatient().then((patient) => {
        const dayOfWeek = DAY_NAMES[new Date().getDay()]

        cy.createScheduleViaApi(
          { professionalId: professional.professionalId, dayOfWeek, startTime: '08:00', endTime: '18:00', slotDurationInMinutes: 30 },
          professional.accessToken,
        ).then((schedule) => {
          cy.createAppointmentViaApi(
            {
              professionalId: professional.professionalId,
              patientId: patient.patientId,
              specialtyId: professional.specialtyId,
              date: futureDateString(14),
              startTime: '10:00',
            },
            professional.accessToken,
          ).then((appointment) => {
            cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then((professionalToken) => {
            cy.createPrescriptionViaApi(
              { appointmentId: appointment.id, items: [{ activeIngredientName: 'Dipirona', instructions: 'Se dor' }] },
              professionalToken,
            ).then((prescription) => {
              cy.task('dbQuery', {
                sql: 'SELECT verification_token FROM prescriptions WHERE id = $1',
                params: [prescription.id],
              }).then((rows: any) => {
                const token = rows[0].verification_token

                cy.deletePrescriptionViaApi(prescription.id, professional.accessToken)

                cy.clearCookies()
                cy.visit(`/${CLINIC_SLUG}/verify/prescriptions/${token}`)
                cy.get('[data-testid="verification-invalid"]', { timeout: 10000 }).should('be.visible')

                cy.request({
                  method: 'PATCH',
                  url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/cancel`,
                  headers: { Authorization: `Bearer ${professional.accessToken}` },
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
