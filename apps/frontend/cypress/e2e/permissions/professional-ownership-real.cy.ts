// Stack real ponta a ponta — nenhum teste hoje exercitava as regras de
// "own-resource" descritas em ai/context/permissions.md contra o backend
// real: PROFESSIONAL só acessa os próprios recursos, ADMIN acessa qualquer um.
// O backend já tem esse padrão coberto em integration specs (ex:
// schedules.integration.spec.ts) — aqui replicamos via sessão HTTP real.

import { CLINIC_SLUG } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function futureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('Permissions — professional ownership (real)', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('professional B is forbidden from another professional’s schedule; ADMIN is not', () => {
    cy.seedProfessional().then((ownerProfessional) => {
      cy.seedProfessional().then((otherProfessional) => {
        const dayOfWeek = DAY_NAMES[new Date().getDay()]

        cy.createScheduleViaApi(
          { professionalId: ownerProfessional.professionalId, dayOfWeek, startTime: '08:00', endTime: '18:00', slotDurationInMinutes: 30 },
          ownerProfessional.accessToken,
        ).then((schedule) => {
          cy.loginAsClinicUser(otherProfessional.email, otherProfessional.password, CLINIC_SLUG).then((otherToken) => {
            cy.request({
              method: 'GET',
              url: `${Cypress.env('API_URL')}/schedules/${schedule.id}`,
              headers: { Authorization: `Bearer ${otherToken}` },
              failOnStatusCode: false,
            }).then((getResponse) => expect(getResponse.status).to.eq(403))

            cy.request({
              method: 'PATCH',
              url: `${Cypress.env('API_URL')}/schedules/${schedule.id}`,
              headers: { Authorization: `Bearer ${otherToken}` },
              body: { slotDurationInMinutes: 60 },
              failOnStatusCode: false,
            }).then((patchResponse) => expect(patchResponse.status).to.eq(403))

            cy.request({
              method: 'DELETE',
              url: `${Cypress.env('API_URL')}/schedules/${schedule.id}`,
              headers: { Authorization: `Bearer ${otherToken}` },
              failOnStatusCode: false,
            }).then((deleteResponse) => expect(deleteResponse.status).to.eq(403))

            cy.clearCookies()
            cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
              cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/schedules/${schedule.id}`,
                headers: { Authorization: `Bearer ${adminToken}` },
              }).then((getResponse) => expect(getResponse.status).to.eq(200))

              cy.deleteScheduleViaApi(schedule.id, adminToken)
              cy.deleteProfessionalViaApi(ownerProfessional.professionalId, ownerProfessional.accessToken)
              cy.deleteUserViaApi(ownerProfessional.userId, ownerProfessional.accessToken)
              cy.deleteSpecialtyViaApi(ownerProfessional.specialtyId, ownerProfessional.platformAdminToken)
              cy.deleteProfessionalViaApi(otherProfessional.professionalId, otherProfessional.accessToken)
              cy.deleteUserViaApi(otherProfessional.userId, otherProfessional.accessToken)
              cy.deleteSpecialtyViaApi(otherProfessional.specialtyId, otherProfessional.platformAdminToken)
            })
          })
        })
      })
    })
  })

  it('professional B is forbidden from another professional’s appointment; ADMIN is not', () => {
    cy.seedProfessional().then((ownerProfessional) => {
      cy.seedProfessional().then((otherProfessional) => {
        cy.seedPatient().then((patient) => {
          const dayOfWeek = DAY_NAMES[new Date().getDay()]

          cy.createScheduleViaApi(
            { professionalId: ownerProfessional.professionalId, dayOfWeek, startTime: '08:00', endTime: '18:00', slotDurationInMinutes: 30 },
            ownerProfessional.accessToken,
          ).then((schedule) => {
            cy.createAppointmentViaApi(
              {
                professionalId: ownerProfessional.professionalId,
                patientId: patient.patientId,
                specialtyId: ownerProfessional.specialtyId,
                date: futureDateString(14),
                startTime: '09:00',
              },
              ownerProfessional.accessToken,
            ).then((appointment) => {
              cy.loginAsClinicUser(otherProfessional.email, otherProfessional.password, CLINIC_SLUG).then((otherToken) => {
                cy.request({
                  method: 'PATCH',
                  url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/cancel`,
                  headers: { Authorization: `Bearer ${otherToken}` },
                  body: {},
                  failOnStatusCode: false,
                }).then((cancelResponse) => expect(cancelResponse.status).to.eq(403))

                cy.clearCookies()
                cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
                  cy.request({
                    method: 'GET',
                    url: `${Cypress.env('API_URL')}/appointments/${appointment.id}`,
                    headers: { Authorization: `Bearer ${adminToken}` },
                  }).then((getResponse) => expect(getResponse.status).to.eq(200))

                  cy.request({
                    method: 'PATCH',
                    url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/cancel`,
                    headers: { Authorization: `Bearer ${adminToken}` },
                    body: {},
                  })
                  cy.deleteScheduleViaApi(schedule.id, adminToken)
                  cy.deletePatientViaApi(patient.patientId, adminToken)
                  cy.deleteProfessionalViaApi(ownerProfessional.professionalId, ownerProfessional.accessToken)
                  cy.deleteUserViaApi(ownerProfessional.userId, ownerProfessional.accessToken)
                  cy.deleteSpecialtyViaApi(ownerProfessional.specialtyId, ownerProfessional.platformAdminToken)
                  cy.deleteProfessionalViaApi(otherProfessional.professionalId, otherProfessional.accessToken)
                  cy.deleteUserViaApi(otherProfessional.userId, otherProfessional.accessToken)
                  cy.deleteSpecialtyViaApi(otherProfessional.specialtyId, otherProfessional.platformAdminToken)
                })
              })
            })
          })
        })
      })
    })
  })

  it('professional B is forbidden from another professional’s medical record template; ADMIN can edit it', () => {
    cy.seedProfessional().then((ownerProfessional) => {
      cy.seedProfessional().then((otherProfessional) => {
        cy.linkSpecialtyToClinicViaApi(
          '10000000-0000-4000-8000-000000000000',
          ownerProfessional.specialtyId,
          ownerProfessional.platformAdminToken,
        )

        cy.createMedicalRecordTemplateViaApi(
          {
            specialtyId: ownerProfessional.specialtyId,
            name: `Template Ownership ${Date.now()}`,
            fields: [{ label: 'Campo', type: 'text', required: false, order: 0, canonical: false }],
          },
          ownerProfessional.accessToken,
        ).then((template) => {
          cy.loginAsClinicUser(otherProfessional.email, otherProfessional.password, CLINIC_SLUG).then((otherToken) => {
            cy.request({
              method: 'PATCH',
              url: `${Cypress.env('API_URL')}/medical-record-templates/${template.id}`,
              headers: { Authorization: `Bearer ${otherToken}` },
              body: { name: 'Tentativa de edição alheia' },
              failOnStatusCode: false,
            }).then((patchResponse) => expect(patchResponse.status).to.eq(403))

            cy.clearCookies()
            cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
              cy.request({
                method: 'PATCH',
                url: `${Cypress.env('API_URL')}/medical-record-templates/${template.id}`,
                headers: { Authorization: `Bearer ${adminToken}` },
                body: { name: 'Editado pelo admin' },
              }).then((patchResponse) => expect(patchResponse.status).to.eq(200))

              cy.deleteMedicalRecordTemplateViaApi(template.id, adminToken)
              cy.unlinkSpecialtyFromClinicViaApi(
                '10000000-0000-4000-8000-000000000000',
                ownerProfessional.specialtyId,
                ownerProfessional.platformAdminToken,
              )
              cy.deleteProfessionalViaApi(ownerProfessional.professionalId, ownerProfessional.accessToken)
              cy.deleteUserViaApi(ownerProfessional.userId, ownerProfessional.accessToken)
              cy.deleteSpecialtyViaApi(ownerProfessional.specialtyId, ownerProfessional.platformAdminToken)
              cy.deleteProfessionalViaApi(otherProfessional.professionalId, otherProfessional.accessToken)
              cy.deleteUserViaApi(otherProfessional.userId, otherProfessional.accessToken)
              cy.deleteSpecialtyViaApi(otherProfessional.specialtyId, otherProfessional.platformAdminToken)
            })
          })
        })
      })
    })
  })
})
