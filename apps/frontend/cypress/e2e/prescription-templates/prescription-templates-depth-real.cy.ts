// Aprofunda prescription-templates-happy-path-real.cy.ts (que só cobre a aba
// "Digitar"). A busca real no catálogo de medicamentos (aba "Buscar
// medicamento", modo padrão do formulário) nunca tinha sido exercitada aqui,
// mesmo já existindo para receitas avulsas em prescriptions-depth-real.cy.ts.

import { CLINIC_SLUG } from '../../support/clinic'

describe('Prescription templates — depth real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('finds a real medication via catalog search and saves it into a template', () => {
    cy.seedSpecialty().then((catalogSeed) => {
      const medicationName = `Dipirona Real ${Date.now()}`
      cy.createMedicationViaApi({ name: medicationName, activeIngredient: 'Dipirona sódica' }, catalogSeed.platformAdminToken).then((medication) => {
        cy.seedProfessional().then((professional) => {
          cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then((professionalToken) => {
            cy.visit(`/${CLINIC_SLUG}/prescription-templates`)
            cy.get('[data-testid="prescription-templates-page"]', { timeout: 10000 }).should('be.visible')
            cy.get('[data-testid="prescription-template-list-new-button"]').click()
            cy.get('[data-testid="prescription-template-create-modal"]').should('be.visible')

            const templateName = `Modelo Busca Real ${Date.now()}`
            cy.get('[data-testid="prescription-template-form-name"]').type(templateName)

            cy.get('[data-testid="prescription-template-form-tab-medication"]').should('have.class', 'bg-accent')
            cy.get('[data-testid="prescription-template-form-search"]').type(medicationName)
            cy.get(`[data-testid="prescription-template-form-search-result-${medication.id}"]`, { timeout: 10000 })
              .should('contain.text', 'Dipirona sódica')
              .click()
            cy.get('[data-testid="prescription-template-form-search-results"]').should('not.exist')
            cy.get('[data-testid="prescription-template-form-item-instructions-0"]').type('1 comprimido a cada 6 horas')
            cy.get('[data-testid="prescription-template-form-submit"]').click()

            cy.get('[data-testid="prescription-template-create-modal"]').should('not.exist')

            cy.request({
              method: 'GET',
              url: `${Cypress.env('API_URL')}/prescription-templates`,
              headers: { Authorization: `Bearer ${professionalToken}` },
            }).then((listResponse) => {
              const created = listResponse.body.find((t: any) => t.name === templateName)
              expect(created).to.exist
              expect(created.items[0].medicationId).to.eq(medication.id)

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

  it('shows a real "no results" state when the search matches no catalog medication', () => {
    cy.seedProfessional().then((professional) => {
      cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then(() => {
        cy.visit(`/${CLINIC_SLUG}/prescription-templates`)
        cy.get('[data-testid="prescription-template-list-new-button"]', { timeout: 10000 }).click()
        cy.get('[data-testid="prescription-template-create-modal"]').should('be.visible')

        cy.get('[data-testid="prescription-template-form-search"]').type(`Inexistente${Date.now()}`)
        cy.get('[data-testid="prescription-template-form-no-results"]', { timeout: 10000 }).should('be.visible')

        cy.deleteProfessionalViaApi(professional.professionalId, professional.accessToken)
        cy.deleteUserViaApi(professional.userId, professional.accessToken)
        cy.deleteSpecialtyViaApi(professional.specialtyId, professional.platformAdminToken)
      })
    })
  })
})
