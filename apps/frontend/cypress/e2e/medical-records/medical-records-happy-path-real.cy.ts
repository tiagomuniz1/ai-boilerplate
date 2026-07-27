// Stack real ponta a ponta — preenche um prontuário pelo formulário real
// (especialidade herdada da consulta, campos vindos de um template real) e
// confirma que o backend real bloqueia edição após a consulta ser concluída
// (422), não só a UI escondendo o botão (já coberto mockado em medical-record-view.cy.ts).

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

describe('Medical records — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('PROFESSIONAL fills a medical record via the real form, inheriting the appointment specialty', () => {
    cy.seedProfessional().then((professional) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
      cy.seedPatient().then((patient) => {
        cy.createMedicalRecordTemplateViaApi(
          {
            specialtyId: professional.specialtyId,
            name: `Template Real ${Date.now()}`,
            fields: [{ label: 'Sintoma', type: 'text', required: true, order: 0, canonical: false }],
          },
          professional.accessToken,
        ).then((template) => {
          const fieldKey = template.fields[0].key
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
                cy.get('[data-testid="tab-prontuario"]', { timeout: 10000 }).click()
                cy.get('[data-testid="fill-medical-record-button"]', { timeout: 10000 }).click()
                cy.get('[data-testid="medical-record-form"]').should('be.visible')
                cy.get(`[data-testid="dynamic-field-${fieldKey}"]`).type('Dor no peito')
                cy.get('[data-testid="medical-record-form-submit"]').click()
                cy.get('[data-testid="medical-record-form"]').should('not.exist')

                cy.request({
                  method: 'GET',
                  url: `${Cypress.env('API_URL')}/medical-records/by-appointment/${appointment.id}`,
                  headers: { Authorization: `Bearer ${professionalToken}` },
                }).then((getResponse) => {
                  expect(getResponse.body).to.exist
                  expect(getResponse.body.specialtyId).to.eq(professional.specialtyId)
                  expect(getResponse.body.data[fieldKey]).to.eq('Dor no peito')

                  cy.request({
                    method: 'PATCH',
                    url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/cancel`,
                    headers: { Authorization: `Bearer ${professionalToken}` },
                    body: {},
                  })
                  cy.deleteScheduleViaApi(schedule.id, professionalToken)
                  cy.deleteMedicalRecordTemplateViaApi(template.id, professional.accessToken)
                  cy.deletePatientViaApi(patient.patientId, professional.accessToken)
                  cy.deleteProfessionalViaApi(professional.professionalId, professional.accessToken)
                  cy.deleteUserViaApi(professional.userId, professional.accessToken)
                  cy.unlinkSpecialtyFromClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
                  cy.deleteSpecialtyViaApi(professional.specialtyId, professional.platformAdminToken)
                })
              })
            })
          })
        })
      })
    })
  })

  it('backend rejects editing a medical record once the appointment is completed (422)', () => {
    cy.seedProfessional().then((professional) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
      cy.seedPatient().then((patient) => {
        cy.createMedicalRecordTemplateViaApi(
          {
            specialtyId: professional.specialtyId,
            name: `Template Real ${Date.now()}`,
            fields: [{ label: 'Sintoma', type: 'text', required: true, order: 0, canonical: false }],
          },
          professional.accessToken,
        ).then((template) => {
          const fieldKey = template.fields[0].key
          const dayOfWeek = DAY_NAMES[new Date().getDay()]

          cy.createScheduleViaApi(
            { professionalId: professional.professionalId, dayOfWeek, startTime: '08:00', endTime: '18:00', slotDurationInMinutes: 30 },
            professional.accessToken,
          ).then((schedule) => {
            // Same backdating trick as appointments-happy-path-real.cy.ts — a past
            // appointment can't be created through the API, only completion needs it.
            const yesterday = new Date(Date.now() - 86400000)
            const pastDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
            const pastAppointmentId = crypto.randomUUID()

            cy.task('dbQuery', {
              sql: `INSERT INTO appointments (id, clinic_id, professional_id, patient_id, specialty_id, schedule_id, date, start_time, end_time, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled')`,
              params: [
                pastAppointmentId,
                CLINIC_ID,
                professional.professionalId,
                patient.patientId,
                professional.specialtyId,
                schedule.id,
                pastDate,
                '08:00',
                '08:30',
              ],
            }).then(() => {
              cy.createMedicalRecordViaApi(
                { appointmentId: pastAppointmentId, data: { [fieldKey]: 'Dor no peito' } },
                professional.accessToken,
              ).then((record) => {
                cy.request({
                  method: 'PATCH',
                  url: `${Cypress.env('API_URL')}/appointments/${pastAppointmentId}/complete`,
                  headers: { Authorization: `Bearer ${professional.accessToken}` },
                }).then(() => {
                  cy.request({
                    method: 'PATCH',
                    url: `${Cypress.env('API_URL')}/medical-records/${record.id}`,
                    headers: { Authorization: `Bearer ${professional.accessToken}` },
                    body: { data: { [fieldKey]: 'Tentativa de edição pós-conclusão' } },
                    failOnStatusCode: false,
                  }).then((patchResponse) => {
                    expect(patchResponse.status).to.eq(422)

                    cy.deleteScheduleViaApi(schedule.id, professional.accessToken)
                    cy.deleteMedicalRecordTemplateViaApi(template.id, professional.accessToken)
                    cy.deletePatientViaApi(patient.patientId, professional.accessToken)
                    cy.deleteProfessionalViaApi(professional.professionalId, professional.accessToken)
                    cy.deleteUserViaApi(professional.userId, professional.accessToken)
                    cy.unlinkSpecialtyFromClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
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
})
