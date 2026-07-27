// Stack real ponta a ponta — o histórico de prontuário do paciente
// (patient-medical-history.tsx, na tela de detalhe do paciente) nunca bateu no
// backend real, só era exercitado com fixtures mockadas em outros specs.

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

describe('Patient medical history — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows a real medical record card and opens its detail modal with the real data', () => {
    cy.seedProfessional().then((professional) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
      cy.seedPatient().then((patient) => {
        cy.createMedicalRecordTemplateViaApi(
          {
            specialtyId: professional.specialtyId,
            name: `Template Histórico Real ${Date.now()}`,
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
              cy.createMedicalRecordViaApi(
                { appointmentId: appointment.id, data: { [fieldKey]: 'Dor no peito real' } },
                professional.accessToken,
              ).then(() => {
                cy.loginAsClinicUser('admin@pulso.center', '123123123', CLINIC_SLUG).then((adminToken) => {
                  cy.visit(`/${CLINIC_SLUG}/patients/${patient.patientId}`)
                  cy.get('[data-testid="patient-medical-history"]', { timeout: 10000 }).should('be.visible')
                  cy.get('[data-testid="history-card"]').should('have.length.at.least', 1)
                  cy.get('[data-testid="history-card-professional"]').first().should('contain.text', professional.fullName)

                  cy.get('[data-testid="history-card"]').first().click()
                  cy.get('[data-testid="medical-record-view"]', { timeout: 10000 }).should('be.visible')
                  cy.get('[data-testid="record-patient-name"]').should('contain.text', patient.fullName)
                  cy.get('[data-testid="record-professional-name"]').should('contain.text', professional.fullName)
                  cy.get(`[data-testid="record-field-${fieldKey}"]`).should('contain.text', 'Dor no peito real')

                  cy.request({
                    method: 'PATCH',
                    url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/cancel`,
                    headers: { Authorization: `Bearer ${adminToken}` },
                    body: {},
                  })
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

  it('paginates through more than one page of real medical record history', () => {
    cy.seedProfessional().then((professional) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
      cy.seedPatient().then((patient) => {
        cy.createMedicalRecordTemplateViaApi(
          {
            specialtyId: professional.specialtyId,
            name: `Template Paginação Real ${Date.now()}`,
            fields: [{ label: 'Sintoma', type: 'text', required: true, order: 0, canonical: false }],
          },
          professional.accessToken,
        ).then((template) => {
          const fieldKey = template.fields[0].key
          const dayOfWeek = DAY_NAMES[new Date().getDay()]

          cy.createScheduleViaApi(
            { professionalId: professional.professionalId, dayOfWeek, startTime: '07:00', endTime: '19:00', slotDurationInMinutes: 30 },
            professional.accessToken,
          ).then((schedule) => {
            const target = new Date(Date.now() + 14 * 86400000)
            const targetDate = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`

            const recordCount = 11
            const appointmentIds: string[] = []

            for (let i = 0; i < recordCount; i++) {
              const hour = String(8 + i).padStart(2, '0')
              cy.createAppointmentViaApi(
                {
                  professionalId: professional.professionalId,
                  patientId: patient.patientId,
                  specialtyId: professional.specialtyId,
                  date: targetDate,
                  startTime: `${hour}:00`,
                },
                professional.accessToken,
              ).then((appointment) => {
                appointmentIds.push(appointment.id)
                cy.createMedicalRecordViaApi(
                  { appointmentId: appointment.id, data: { [fieldKey]: `Registro ${i + 1}` } },
                  professional.accessToken,
                )
              })
            }

            cy.then(() => {
              cy.loginAsClinicUser('admin@pulso.center', '123123123', CLINIC_SLUG).then((adminToken) => {
                cy.visit(`/${CLINIC_SLUG}/patients/${patient.patientId}`)
                cy.get('[data-testid="patient-medical-history"]', { timeout: 10000 }).should('be.visible')
                cy.get('[data-testid="history-card"]').should('have.length', 10)
                cy.get('[data-testid="history-page-info"]').should('contain.text', '1 / 2')
                cy.get('[data-testid="history-prev-page"]').should('be.disabled')

                cy.get('[data-testid="history-next-page"]').click()
                cy.get('[data-testid="history-page-info"]').should('contain.text', '2 / 2')
                cy.get('[data-testid="history-card"]').should('have.length', 1)
                cy.get('[data-testid="history-next-page"]').should('be.disabled')

                cy.get('[data-testid="history-prev-page"]').click()
                cy.get('[data-testid="history-page-info"]').should('contain.text', '1 / 2')
                cy.get('[data-testid="history-card"]').should('have.length', 10)

                appointmentIds.forEach((id) => {
                  cy.request({
                    method: 'PATCH',
                    url: `${Cypress.env('API_URL')}/appointments/${id}/cancel`,
                    headers: { Authorization: `Bearer ${adminToken}` },
                    body: {},
                  })
                })
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
