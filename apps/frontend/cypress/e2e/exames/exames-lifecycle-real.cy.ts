// Stack real ponta a ponta — exames-create/delete/upload-result.cy.ts existiam
// mas eram 100% mockados, nunca bateram no backend real. Cobre o ciclo
// completo: pedido → preview → upload de resultado (real, com erro real de
// tipo inválido — mesmo risco de arquivo da Onda 1) → download de
// resultado → exclusão de resultado → download de PDF do pedido → exclusão
// do pedido.

import { CLINIC_SLUG } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function futureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('Exames — lifecycle real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('requests exams, uploads/downloads/removes a result, downloads the PDF, then deletes the request', () => {
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
              cy.visit(`/${CLINIC_SLUG}/appointments/${appointment.id}`)
              cy.get('[data-testid="tab-exames"]', { timeout: 10000 }).click()
              cy.get('[data-testid="exame-section"]').should('be.visible')
              cy.get('[data-testid="exame-new-button"]').click()
              cy.get('[data-testid="exame-form"]').should('be.visible')

              cy.get('[data-testid="exame-form-item-name-0"]').type('Hemograma completo')
              cy.get('[data-testid="exame-form-item-observations-0"]').type('Jejum de 8 horas')
              cy.get('[data-testid="exame-form-submit"]').click()

              cy.get('[data-testid="exame-form"]').should('not.exist')
              cy.get('[data-testid="exame-section-list"]', { timeout: 10000 }).should('be.visible')

              cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/exam-requests?appointmentId=${appointment.id}`,
                headers: { Authorization: `Bearer ${professionalToken}` },
              }).then((listResponse) => {
                const created = Array.isArray(listResponse.body) ? listResponse.body[0] : listResponse.body.data[0]
                expect(created.items[0].name).to.eq('Hemograma completo')

                cy.get(`[data-testid="exame-preview-button-${created.id}"]`).click()
                cy.get('[data-testid="exame-preview-modal"]', { timeout: 10000 }).should('be.visible')
                cy.get('[data-testid="exame-preview-items"]').should('contain.text', 'Hemograma completo')
                cy.get('[data-testid="exame-preview-results-empty"]').should('be.visible')

                // Tipo de arquivo inválido — erro real, sem stub.
                cy.get('[data-testid="exame-result-upload-input"]').selectFile(
                  {
                    contents: Cypress.Buffer.from('conteúdo qualquer'),
                    fileName: 'resultado.exe',
                    mimeType: 'application/x-msdownload',
                  },
                  { force: true },
                )
                cy.get('[data-testid="exame-result-upload-error"], [data-testid="exame-preview-upload-error"]', { timeout: 10000 }).should('be.visible')

                cy.intercept('POST', `${Cypress.env('API_URL')}/exam-requests/${created.id}/results`).as('uploadResult')
                cy.get('[data-testid="exame-result-upload-input"]').selectFile(
                  {
                    contents: Cypress.Buffer.from('%PDF-1.4 fake result'),
                    fileName: 'hemograma-resultado.pdf',
                    mimeType: 'application/pdf',
                  },
                  { force: true },
                )
                cy.wait('@uploadResult').its('response.statusCode').should('eq', 201)
                cy.get('[data-testid^="exame-result-link-"]', { timeout: 10000 }).should('contain.text', 'hemograma-resultado.pdf')

                cy.request({
                  method: 'GET',
                  url: `${Cypress.env('API_URL')}/exam-requests/${created.id}`,
                  headers: { Authorization: `Bearer ${professionalToken}` },
                }).then((getResponse) => {
                  const resultId = getResponse.body.results[0].id

                  cy.request({
                    method: 'GET',
                    url: `${Cypress.env('API_URL')}/exam-results/${resultId}/file`,
                    headers: { Authorization: `Bearer ${professionalToken}` },
                  }).then((fileResponse) => {
                    expect(fileResponse.status).to.eq(200)

                    cy.get(`[data-testid="exame-result-remove-${resultId}"]`).click()
                    cy.get('[data-testid="exame-result-delete-dialog"]').should('be.visible')
                    cy.get('[data-testid="exame-result-delete-dialog-cancel"]').click()
                    cy.get('[data-testid="exame-result-delete-dialog"]').should('not.exist')
                    cy.get(`[data-testid="exame-result-${resultId}"]`).should('exist')

                    cy.get(`[data-testid="exame-result-remove-${resultId}"]`).click()
                    cy.get('[data-testid="exame-result-delete-dialog"]').should('be.visible')
                    cy.get('[data-testid="exame-result-delete-dialog-confirm"]').click()
                    cy.get(`[data-testid="exame-result-${resultId}"]`, { timeout: 10000 }).should('not.exist')

                    cy.request({
                      method: 'GET',
                      url: `${Cypress.env('API_URL')}/exam-requests/${created.id}/pdf`,
                      headers: { Authorization: `Bearer ${professionalToken}` },
                    }).then((pdfResponse) => {
                      expect(pdfResponse.status).to.eq(200)
                      expect(pdfResponse.headers['content-type']).to.include('application/pdf')

                      cy.get('[data-testid="exame-preview-modal"]').find('[aria-label="Fechar"]').click()
                      cy.get('[data-testid="exame-preview-modal"]').should('not.exist')

                      cy.get(`[data-testid="exame-delete-button-${created.id}"]`).click()
                      cy.get('[data-testid="exame-delete-dialog"]').should('be.visible')
                      cy.get('[data-testid="exame-delete-dialog-confirm"]').click()
                      cy.get(`[data-testid="exame-item-${created.id}"]`, { timeout: 10000 }).should('not.exist')

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
})
