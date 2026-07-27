// Stack real ponta a ponta — preencher e visualizar um prontuário cujo
// template tem múltiplas seções (abas). Todos os testes reais anteriores
// usavam templates de campo único e sem seção, então medical-record-form-tabs
// e medical-record-view-tabs nunca tinham sido exercitados (só aparecem
// quando o template tem sections).

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

describe('Medical record — sectioned template real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('fills and views a real medical record across Geral/seções/Notas tabs', () => {
    cy.seedProfessional().then((professional) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
      cy.seedPatient().then((patient) => {
        cy.createMedicalRecordTemplateViaApi(
          {
            specialtyId: professional.specialtyId,
            name: `Template Seccionado Real ${Date.now()}`,
            sections: [
              { key: 'sintomas', title: 'Sintomas', order: 0 },
              { key: 'exame-fisico', title: 'Exame Físico', order: 1 },
            ],
            fields: [
              { label: 'Alergias', type: 'text', required: false, order: 0, canonical: false },
              { label: 'Queixa principal', type: 'text', required: true, order: 0, canonical: false, sectionKey: 'sintomas' },
              { label: 'Pressão arterial', type: 'text', required: false, order: 0, canonical: false, sectionKey: 'exame-fisico' },
            ],
          },
          professional.accessToken,
        ).then((template) => {
          const allergiesKey = template.fields[0].key
          const complaintKey = template.fields[1].key
          const bloodPressureKey = template.fields[2].key
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

                cy.get('[data-testid="medical-record-form-tabs"]').should('be.visible')
                cy.get('[data-testid="tab-__general__"]').should('have.attr', 'aria-selected', 'true')
                cy.get(`[data-testid="dynamic-field-${allergiesKey}"]`).type('Nenhuma')

                cy.get('[data-testid="tab-sintomas"]').click()
                cy.get(`[data-testid="dynamic-field-${complaintKey}"]`).type('Dor de cabeça persistente')

                cy.get('[data-testid="tab-exame-fisico"]').click()
                cy.get(`[data-testid="dynamic-field-${bloodPressureKey}"]`).type('120x80')

                cy.get('[data-testid="tab-__notes__"]').click()
                cy.get('[data-testid="medical-record-notes"]').type('Retorno em 30 dias.')

                cy.get('[data-testid="medical-record-form-submit"]').click()
                cy.get('[data-testid="medical-record-form"]').should('not.exist')

                cy.get('[data-testid="medical-record-view-tabs"]', { timeout: 10000 }).should('be.visible')
                cy.get('[data-testid="tab-sintomas"]').click()
                cy.get(`[data-testid="record-field-${complaintKey}"]`).should('contain.text', 'Dor de cabeça persistente')
                cy.get('[data-testid="tab-exame-fisico"]').click()
                cy.get(`[data-testid="record-field-${bloodPressureKey}"]`).should('contain.text', '120x80')

                cy.request({
                  method: 'PATCH',
                  url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/cancel`,
                  headers: { Authorization: `Bearer ${professionalToken}` },
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
