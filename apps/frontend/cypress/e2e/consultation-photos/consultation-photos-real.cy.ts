// Stack real ponta a ponta — upload, visualização (imagem autenticada via blob),
// preview e exclusão de fotos de evolução na aba "Fotos" da consulta. Sem stub:
// bate no backend real (S3/local storage) para provar que a imagem realmente
// é servida via endpoint autenticado (nunca URL pública).

import { CLINIC_SLUG } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function futureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('Fotos da consulta — lifecycle real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('uploads a photo, renders the authenticated thumbnail, previews it and deletes it', () => {
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
              cy.get('[data-testid="tab-fotos"]', { timeout: 10000 }).click()
              cy.get('[data-testid="photo-section"]').should('be.visible')
              cy.get('[data-testid="photo-section-empty"]').should('be.visible')

              // Tipo de arquivo inválido — erro real, sem stub.
              cy.get('[data-testid="photo-upload-input"]').selectFile(
                {
                  contents: Cypress.Buffer.from('conteúdo qualquer'),
                  fileName: 'documento.pdf',
                  mimeType: 'application/pdf',
                },
                { force: true },
              )
              cy.get('[data-testid="photo-upload-error"]', { timeout: 10000 }).should('be.visible')

              cy.intercept('POST', `${Cypress.env('API_URL')}/consultation-photos/appointments/${appointment.id}`).as(
                'uploadPhoto',
              )
              cy.get('[data-testid="photo-upload-input"]').selectFile(
                {
                  contents: Cypress.Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]),
                  fileName: 'evolucao.jpg',
                  mimeType: 'image/jpeg',
                },
                { force: true },
              )
              cy.wait('@uploadPhoto').its('response.statusCode').should('eq', 201)

              cy.get('[data-testid="photo-section-grid"]', { timeout: 10000 }).should('be.visible')
              cy.get('[data-testid^="photo-thumbnail-"]').should('have.length', 1)

              // Prova de que a imagem é servida via blob (endpoint autenticado), nunca URL pública direta.
              cy.get('[data-testid^="photo-thumbnail-image-"]', { timeout: 10000 })
                .should('be.visible')
                .invoke('attr', 'src')
                .should('match', /^blob:/)

              // Segunda foto — para exercitar a navegação por setinhas entre fotos no preview.
              cy.intercept('POST', `${Cypress.env('API_URL')}/consultation-photos/appointments/${appointment.id}`).as(
                'uploadSecondPhoto',
              )
              cy.get('[data-testid="photo-upload-input"]').selectFile(
                {
                  contents: Cypress.Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 1]),
                  fileName: 'evolucao-2.jpg',
                  mimeType: 'image/jpeg',
                },
                { force: true },
              )
              cy.wait('@uploadSecondPhoto').its('response.statusCode').should('eq', 201)
              cy.get('[data-testid^="photo-thumbnail-"]').should('have.length', 2)

              cy.get('[data-testid^="photo-thumbnail-"]').first().click()
              cy.get('[data-testid="photo-preview-modal"]').should('be.visible')
              cy.get('[data-testid="photo-preview-image"]', { timeout: 10000 }).should('be.visible')

              // Navega para a próxima foto pela setinha e confirma a troca de imagem.
              cy.get('[data-testid="photo-preview-previous-button"]').should('not.exist')
              cy.get('[data-testid="photo-preview-next-button"]').should('be.visible').click()
              cy.get('[data-testid="photo-preview-previous-button"]').should('be.visible')
              cy.get('[data-testid="photo-preview-next-button"]').should('not.exist')

              // Volta pela setinha anterior.
              cy.get('[data-testid="photo-preview-previous-button"]').click()
              cy.get('[data-testid="photo-preview-next-button"]').should('be.visible')

              cy.get('[data-testid="photo-preview-delete-button"]').click()

              cy.get('[data-testid="photo-delete-dialog"]').should('be.visible')
              cy.get('[data-testid="photo-delete-dialog-cancel"]').click()
              cy.get('[data-testid="photo-delete-dialog"]').should('not.exist')
              cy.get('[data-testid^="photo-thumbnail-"]').should('have.length', 2)

              cy.get('[data-testid="photo-preview-delete-button"]').click()
              cy.get('[data-testid="photo-delete-dialog-confirm"]').click()
              cy.get('[data-testid="photo-preview-modal"]', { timeout: 10000 }).should('not.exist')
              cy.get('[data-testid^="photo-thumbnail-"]', { timeout: 10000 }).should('have.length', 1)

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
