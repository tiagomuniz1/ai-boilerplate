// Stack real ponta a ponta — CRUD de templates de prescrição nunca foi
// testado, nem mockado nem real.

import { CLINIC_SLUG } from '../../support/clinic'

describe('Prescription templates — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('PROFESSIONAL creates, edits and deletes a prescription template via the real UI', () => {
    cy.seedProfessional().then((professional) => {
      cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then((professionalToken) => {
        cy.visit(`/${CLINIC_SLUG}/prescription-templates`)
        cy.get('[data-testid="prescription-templates-page"]', { timeout: 10000 }).should('be.visible')
        cy.get('[data-testid="prescription-template-list-new-button"]').click()
        cy.get('[data-testid="prescription-template-create-modal"]').should('be.visible')

        const templateName = `Modelo Real ${Date.now()}`
        cy.get('[data-testid="prescription-template-form-name"]').type(templateName)
        cy.get('[data-testid="prescription-template-form-tab-ingredient"]').click()
        cy.get('[data-testid="prescription-template-form-manual-input"]').type('Paracetamol')
        cy.get('[data-testid="prescription-template-form-manual-add"]').click()
        cy.get('[data-testid="prescription-template-form-item-instructions-0"]').type('1 comprimido se dor')
        cy.get('[data-testid="prescription-template-form-submit"]').click()

        cy.get('[data-testid="prescription-template-create-modal"]').should('not.exist')

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/prescription-templates`,
          headers: { Authorization: `Bearer ${professionalToken}` },
        }).then((listResponse) => {
          const created = listResponse.body.find((t: any) => t.name === templateName)
          expect(created).to.exist

          cy.get(`[data-testid="prescription-template-row-${created.id}"]`).should('exist')

          cy.get(`[data-testid="prescription-template-edit-${created.id}"]`).click()
          cy.get('[data-testid="prescription-template-edit-modal"]').should('be.visible')
          const updatedName = `${templateName} Editado`
          cy.get('[data-testid="prescription-template-form-name"]').clear().type(updatedName)
          cy.get('[data-testid="prescription-template-form-submit"]').click()
          cy.get('[data-testid="prescription-template-edit-modal"]').should('not.exist')

          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/prescription-templates/${created.id}`,
            headers: { Authorization: `Bearer ${professionalToken}` },
          }).then((getResponse) => {
            expect(getResponse.body.name).to.eq(updatedName)

            cy.deletePrescriptionTemplateViaApi(created.id, professionalToken)
            cy.deleteProfessionalViaApi(professional.professionalId, professional.accessToken)
            cy.deleteUserViaApi(professional.userId, professional.accessToken)
            cy.deleteSpecialtyViaApi(professional.specialtyId, professional.platformAdminToken)
          })
        })
      })
    })
  })
})
