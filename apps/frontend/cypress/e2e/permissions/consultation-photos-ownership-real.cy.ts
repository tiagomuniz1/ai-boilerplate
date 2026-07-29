// Stack real ponta a ponta — a regra mais crítica desta feature: um
// PROFESSIONAL nunca pode ver fotos que outro PROFESSIONAL anexou em
// consultas diferentes com o MESMO paciente, mesmo sendo a mesma clínica.
// ADMIN vê tudo. Verificado direto contra o backend real (sem stub), tanto na
// listagem por consulta quanto na galeria agregada por paciente
// (GET /consultation-photos/by-patient/:patientId). Os uploads em si passam
// pela UI real (selectFile), mesmo padrão já usado em exames-lifecycle-real —
// cy.request não tem suporte de primeira classe para multipart/form-data.

import { CLINIC_SLUG } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function futureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function uploadPhotoViaUi(appointmentId: string, fileName: string) {
  cy.visit(`/${CLINIC_SLUG}/appointments/${appointmentId}`)
  cy.get('[data-testid="tab-fotos"]', { timeout: 10000 }).click()
  cy.get('[data-testid="photo-section"]').should('be.visible')

  cy.intercept('POST', `${Cypress.env('API_URL')}/consultation-photos/appointments/${appointmentId}`).as(
    'uploadPhoto',
  )
  cy.get('[data-testid="photo-upload-input"]').selectFile(
    {
      contents: Cypress.Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]),
      fileName,
      mimeType: 'image/jpeg',
    },
    { force: true },
  )
  cy.wait('@uploadPhoto').its('response.statusCode').should('eq', 201)
}

describe('Permissions — consultation photos ownership (real)', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('PROFESSIONAL A never sees photos PROFESSIONAL B uploaded for the same patient — ADMIN sees both', () => {
    cy.seedProfessional().then((professionalA) => {
      cy.seedProfessional().then((professionalB) => {
        cy.seedPatient().then((patient) => {
          const dayOfWeek = DAY_NAMES[new Date().getDay()]

          cy.createScheduleViaApi(
            { professionalId: professionalA.professionalId, dayOfWeek, startTime: '08:00', endTime: '12:00', slotDurationInMinutes: 30 },
            professionalA.accessToken,
          ).then((scheduleA) => {
            cy.createScheduleViaApi(
              { professionalId: professionalB.professionalId, dayOfWeek, startTime: '13:00', endTime: '18:00', slotDurationInMinutes: 30 },
              professionalB.accessToken,
            ).then((scheduleB) => {
              cy.createAppointmentViaApi(
                {
                  professionalId: professionalA.professionalId,
                  patientId: patient.patientId,
                  specialtyId: professionalA.specialtyId,
                  date: futureDateString(14),
                  startTime: '09:00',
                },
                professionalA.accessToken,
              ).then((appointmentA) => {
                cy.createAppointmentViaApi(
                  {
                    professionalId: professionalB.professionalId,
                    patientId: patient.patientId,
                    specialtyId: professionalB.specialtyId,
                    date: futureDateString(15),
                    startTime: '14:00',
                  },
                  professionalB.accessToken,
                ).then((appointmentB) => {
                  cy.loginAsClinicUser(professionalA.email, professionalA.password, CLINIC_SLUG).then(() => {
                    uploadPhotoViaUi(appointmentA.id, 'foto-a.jpg')

                    cy.clearCookies()
                    cy.loginAsClinicUser(professionalB.email, professionalB.password, CLINIC_SLUG).then((tokenB) => {
                      uploadPhotoViaUi(appointmentB.id, 'foto-b.jpg')

                      // B cannot see A's appointment-scoped photos at all.
                      cy.request({
                        method: 'GET',
                        url: `${Cypress.env('API_URL')}/consultation-photos?appointmentId=${appointmentA.id}`,
                        headers: { Authorization: `Bearer ${tokenB}` },
                        failOnStatusCode: false,
                      }).then((res) => expect(res.status).to.eq(403))

                      // Critical: the patient gallery for B shows ONLY B's photo, never A's.
                      cy.request({
                        method: 'GET',
                        url: `${Cypress.env('API_URL')}/consultation-photos/by-patient/${patient.patientId}`,
                        headers: { Authorization: `Bearer ${tokenB}` },
                      }).then((res) => {
                        expect(res.status).to.eq(200)
                        expect(res.body.total).to.eq(1)
                        expect(res.body.data[0].fileName).to.eq('foto-b.jpg')
                      })

                      cy.clearCookies()
                      cy.loginAsClinicUser(professionalA.email, professionalA.password, CLINIC_SLUG).then((tokenA2) => {
                        // Symmetric: A's gallery shows ONLY A's photo, never B's.
                        cy.request({
                          method: 'GET',
                          url: `${Cypress.env('API_URL')}/consultation-photos/by-patient/${patient.patientId}`,
                          headers: { Authorization: `Bearer ${tokenA2}` },
                        }).then((res) => {
                          expect(res.status).to.eq(200)
                          expect(res.body.total).to.eq(1)
                          expect(res.body.data[0].fileName).to.eq('foto-a.jpg')
                        })

                        cy.clearCookies()
                        cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
                          // ADMIN sees both professionals' photos for the same patient.
                          cy.request({
                            method: 'GET',
                            url: `${Cypress.env('API_URL')}/consultation-photos/by-patient/${patient.patientId}`,
                            headers: { Authorization: `Bearer ${adminToken}` },
                          }).then((res) => {
                            expect(res.status).to.eq(200)
                            expect(res.body.total).to.eq(2)
                            const fileNames = res.body.data.map((p: { fileName: string }) => p.fileName)
                            expect(fileNames).to.include.members(['foto-a.jpg', 'foto-b.jpg'])
                          })

                          // USER has no access to the gallery at all.
                          cy.clearCookies()
                          cy.seedUser().then((plainUser) => {
                            cy.loginAsClinicUser(plainUser.email, 'Password123!', CLINIC_SLUG).then((userToken) => {
                              cy.request({
                                method: 'GET',
                                url: `${Cypress.env('API_URL')}/consultation-photos/by-patient/${patient.patientId}`,
                                headers: { Authorization: `Bearer ${userToken}` },
                                failOnStatusCode: false,
                              }).then((res) => expect(res.status).to.eq(403))

                              cy.clearCookies()
                              cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((cleanupToken) => {
                                cy.request({
                                  method: 'PATCH',
                                  url: `${Cypress.env('API_URL')}/appointments/${appointmentA.id}/cancel`,
                                  headers: { Authorization: `Bearer ${cleanupToken}` },
                                  body: {},
                                })
                                cy.request({
                                  method: 'PATCH',
                                  url: `${Cypress.env('API_URL')}/appointments/${appointmentB.id}/cancel`,
                                  headers: { Authorization: `Bearer ${cleanupToken}` },
                                  body: {},
                                })
                                cy.deleteUserViaApi(plainUser.id, cleanupToken)
                                cy.deleteScheduleViaApi(scheduleA.id, cleanupToken)
                                cy.deleteScheduleViaApi(scheduleB.id, cleanupToken)
                                cy.deletePatientViaApi(patient.patientId, cleanupToken)
                                cy.deleteProfessionalViaApi(professionalA.professionalId, professionalA.accessToken)
                                cy.deleteUserViaApi(professionalA.userId, professionalA.accessToken)
                                cy.deleteSpecialtyViaApi(professionalA.specialtyId, professionalA.platformAdminToken)
                                cy.deleteProfessionalViaApi(professionalB.professionalId, professionalB.accessToken)
                                cy.deleteUserViaApi(professionalB.userId, professionalB.accessToken)
                                cy.deleteSpecialtyViaApi(professionalB.specialtyId, professionalB.platformAdminToken)
                              })
                            })
                          })
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })
})
