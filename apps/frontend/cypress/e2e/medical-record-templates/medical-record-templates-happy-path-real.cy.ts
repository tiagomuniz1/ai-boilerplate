// Stack real ponta a ponta — cobre o escopo por specialtyId (CRM) vs. councilType
// (demais profissões) e a constraint real de "no máximo um generalista por
// profissão por clínica" (409). Erros, loading e validação seguem mockados em
// medical-record-templates-create.cy.ts / medical-record-templates-professional-create.cy.ts.

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'

describe('Medical record templates — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('ADMIN creates a template for a clinic specialty', () => {
    cy.seedSpecialty().then((specialty) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, specialty.id, specialty.platformAdminToken)

      cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
        cy.visit(`/${CLINIC_SLUG}/medical-record-templates/new`)
        cy.get('[data-testid="template-form-specialty"]', { timeout: 10000 }).should('be.visible')
        cy.get('[data-testid="template-form-name"]').type(`Anamnese Real ${Date.now()}`)
        cy.get('[data-testid="template-form-specialty"]').select(specialty.id)
        cy.get('[data-testid="template-form-add-field"]').click()
        cy.get('[data-testid="field-editor-label-0"]').type('Sintoma')
        cy.get('[data-testid="template-form-submit"]').click()

        cy.location('pathname', { timeout: 10000 }).should('eq', `/${CLINIC_SLUG}/medical-record-templates`)

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/medical-record-templates?specialtyId=${specialty.id}`,
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then((listResponse) => {
          const created = listResponse.body.data[0]
          expect(created).to.exist
          expect(created.specialtyId).to.eq(specialty.id)

          cy.request({
            method: 'DELETE',
            url: `${Cypress.env('API_URL')}/medical-record-templates/${created.id}`,
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          cy.unlinkSpecialtyFromClinicViaApi(CLINIC_ID, specialty.id, specialty.platformAdminToken)
          cy.deleteSpecialtyViaApi(specialty.id, specialty.platformAdminToken)
        })
      })
    })
  })

  it('CRM professional creates a template restricted to their own specialty', () => {
    cy.seedProfessional().then((professional) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)

      cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then((professionalToken) => {
        cy.visit(`/${CLINIC_SLUG}/medical-record-templates/new`)
        cy.get('[data-testid="template-form-specialty"]', { timeout: 10000 }).should('be.visible')
        cy.get('[data-testid="template-form-council-type"]').should('not.exist')

        cy.get('[data-testid="template-form-name"]').type(`Anamnese Própria ${Date.now()}`)
        cy.get('[data-testid="template-form-specialty"]').select(professional.specialtyId)
        cy.get('[data-testid="template-form-add-field"]').click()
        cy.get('[data-testid="field-editor-label-0"]').type('Sintoma')
        cy.get('[data-testid="template-form-submit"]').click()

        cy.location('pathname', { timeout: 10000 }).should('eq', `/${CLINIC_SLUG}/medical-record-templates`)

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/medical-record-templates?specialtyId=${professional.specialtyId}`,
          headers: { Authorization: `Bearer ${professionalToken}` },
        }).then((listResponse) => {
          const created = listResponse.body.data[0]
          expect(created).to.exist
          expect(created.specialtyId).to.eq(professional.specialtyId)

          cy.request({
            method: 'DELETE',
            url: `${Cypress.env('API_URL')}/medical-record-templates/${created.id}`,
            headers: { Authorization: `Bearer ${professional.accessToken}` },
          })
          cy.deleteProfessionalViaApi(professional.professionalId, professional.accessToken)
          cy.deleteUserViaApi(professional.userId, professional.accessToken)
          cy.unlinkSpecialtyFromClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
          cy.deleteSpecialtyViaApi(professional.specialtyId, professional.platformAdminToken)
        })
      })
    })
  })

  it('CRN professional creates a generalist template, and a second one is rejected with 409', () => {
    const ts = Date.now()
    const password = 'Password123!'

    cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
      cy.createUserViaApi(
        { fullName: `Nutri Real ${ts}`, email: `nutri.tpl.${ts}@e2e.test`, password, role: 'professional' },
        adminToken,
      ).then((user) => {
        cy.createProfessionalViaApi(
          {
            userId: user.id,
            registrations: [{ councilType: 'crn', number: String(ts).slice(-8), state: 'SP', isPrimary: true }],
            specialties: [],
          },
          adminToken,
        ).then((professional) => {
          cy.loginAsClinicUser(`nutri.tpl.${ts}@e2e.test`, password, CLINIC_SLUG).then((professionalToken) => {
            cy.visit(`/${CLINIC_SLUG}/medical-record-templates/new`)
            cy.get('[data-testid="template-form-specialty"]').should('not.exist')
            cy.get('[data-testid="template-form-council-type"]').should('not.exist')

            cy.get('[data-testid="template-form-name"]').type('Avaliação Nutricional Real')
            cy.get('[data-testid="template-form-add-field"]').click()
            cy.get('[data-testid="field-editor-label-0"]').type('Peso')
            cy.get('[data-testid="template-form-submit"]').click()

            cy.location('pathname', { timeout: 10000 }).should('eq', `/${CLINIC_SLUG}/medical-record-templates`)

            // Second generalist template for the same council type: real backend
            // enforces "at most one generalist per profession per clinic".
            cy.request({
              method: 'POST',
              url: `${Cypress.env('API_URL')}/medical-record-templates`,
              headers: { Authorization: `Bearer ${professionalToken}` },
              body: {
                name: 'Segunda Avaliação Nutricional',
                fields: [{ label: 'Altura', type: 'text', required: true, order: 0, canonical: false }],
              },
              failOnStatusCode: false,
            }).then((secondResponse) => {
              expect(secondResponse.status).to.eq(409)

              cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/medical-record-templates?generalist=true&councilType=crn`,
                headers: { Authorization: `Bearer ${professionalToken}` },
              }).then((listResponse) => {
                const created = listResponse.body.data[0]
                if (created) {
                  cy.request({
                    method: 'DELETE',
                    url: `${Cypress.env('API_URL')}/medical-record-templates/${created.id}`,
                    headers: { Authorization: `Bearer ${adminToken}` },
                  })
                }
                cy.deleteProfessionalViaApi(professional.id, adminToken)
                cy.deleteUserViaApi(user.id, adminToken)
              })
            })
          })
        })
      })
    })
  })
})
