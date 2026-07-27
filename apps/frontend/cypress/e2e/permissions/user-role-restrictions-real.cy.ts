// Stack real ponta a ponta — USER (recepcionista) tem acesso somente leitura
// a pacientes/profissionais/consultas. Nenhum teste hoje exercitava essas
// restrições contra o backend real (só via UI escondida em specs mockados).

import { CLINIC_SLUG } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function futureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('Permissions — USER role restrictions (real)', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('USER can read patients/professionals/appointments but cannot write to appointments, medical records or templates', () => {
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
            const ts = Date.now()
            cy.createUserViaApi(
              { fullName: `Recepcionista Real ${ts}`, email: `recepcionista.${ts}@e2e.test`, password: 'Password123!', role: 'user' },
              professional.accessToken,
            ).then((receptionUser) => {
              cy.loginAsClinicUser(`recepcionista.${ts}@e2e.test`, 'Password123!', CLINIC_SLUG).then((userToken) => {
                // Leitura permitida
                cy.request({
                  method: 'GET',
                  url: `${Cypress.env('API_URL')}/patients`,
                  headers: { Authorization: `Bearer ${userToken}` },
                }).then((r) => expect(r.status).to.eq(200))

                cy.request({
                  method: 'GET',
                  url: `${Cypress.env('API_URL')}/professionals`,
                  headers: { Authorization: `Bearer ${userToken}` },
                }).then((r) => expect(r.status).to.eq(200))

                cy.request({
                  method: 'GET',
                  url: `${Cypress.env('API_URL')}/appointments`,
                  headers: { Authorization: `Bearer ${userToken}` },
                }).then((r) => expect(r.status).to.eq(200))

                // Escrita bloqueada
                cy.request({
                  method: 'POST',
                  url: `${Cypress.env('API_URL')}/appointments`,
                  headers: { Authorization: `Bearer ${userToken}` },
                  body: {
                    professionalId: professional.professionalId,
                    patientId: patient.patientId,
                    date: futureDateString(15),
                    startTime: '10:00',
                  },
                  failOnStatusCode: false,
                }).then((r) => expect(r.status).to.eq(403))

                cy.request({
                  method: 'PATCH',
                  url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/cancel`,
                  headers: { Authorization: `Bearer ${userToken}` },
                  body: {},
                  failOnStatusCode: false,
                }).then((r) => expect(r.status).to.eq(403))

                cy.request({
                  method: 'PATCH',
                  url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/complete`,
                  headers: { Authorization: `Bearer ${userToken}` },
                  failOnStatusCode: false,
                }).then((r) => expect(r.status).to.eq(403))

                cy.request({
                  method: 'POST',
                  url: `${Cypress.env('API_URL')}/medical-records`,
                  headers: { Authorization: `Bearer ${userToken}` },
                  body: { appointmentId: appointment.id, data: {} },
                  failOnStatusCode: false,
                }).then((r) => expect(r.status).to.eq(403))

                cy.request({
                  method: 'POST',
                  url: `${Cypress.env('API_URL')}/medical-record-templates`,
                  headers: { Authorization: `Bearer ${userToken}` },
                  body: { name: 'Tentativa de template', fields: [{ label: 'X', type: 'text', required: false, order: 0, canonical: false }] },
                  failOnStatusCode: false,
                }).then((r) => expect(r.status).to.eq(403))

                cy.clearCookies()
                cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
                  cy.request({
                    method: 'PATCH',
                    url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/cancel`,
                    headers: { Authorization: `Bearer ${adminToken}` },
                    body: {},
                  })
                  cy.deleteUserViaApi(receptionUser.id, adminToken)
                  cy.deleteScheduleViaApi(schedule.id, adminToken)
                  cy.deletePatientViaApi(patient.patientId, adminToken)
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
