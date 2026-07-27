// Stack real ponta a ponta — o ramo "Usuário existente" do formulário de
// criação de profissional (vincular a um usuário já cadastrado via busca)
// nunca tinha teste algum: todos os specs reais explicitamente trocam para
// "Novo usuário" antes de preencher, embora "Usuário existente" seja o modo
// padrão do formulário.

import { CLINIC_SLUG, expectClinicPath } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'

describe('Professional creation — existing user mode real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('links a real existing user to a new professional via the search dropdown', () => {
    cy.seedUser().then((user) => {
      const ts = Date.now()
      const registrationNumber = String(ts).slice(-8)

      cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
        cy.visit(`/${CLINIC_SLUG}/professionals/new`)
        cy.get('[data-testid="professional-form-user-mode"]', { timeout: 10000 }).should('be.visible')
        cy.get('[data-testid="professional-form-user-mode-existing"]').should('be.checked')

        cy.get('[data-testid="professional-form-fullname"]').should('not.exist')
        cy.get('[data-testid="professional-form-user-search"]').should('be.visible').type(user.fullName.slice(0, 10))

        cy.get('[data-testid="professional-form-user-search-results"]', { timeout: 10000 }).should('be.visible')
        cy.get('[data-testid="professional-form-user-option"]').contains(user.email).click()
        cy.get('[data-testid="professional-form-user-search-results"]').should('not.exist')

        cy.get('[data-testid="professional-form-registration-council-type-0"]').select('crn')
        cy.get('[data-testid="professional-form-registration-number-0"]').type(registrationNumber)
        cy.get('[data-testid="professional-form-registration-state-0"]').select('SP')
        cy.get('[data-testid="professional-form-submit"]').click()

        expectClinicPath('/professionals')

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/professionals?search=${encodeURIComponent(user.fullName)}`,
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then((listResponse) => {
          const created = listResponse.body.data[0]
          expect(created).to.exist
          expect(created.user.id).to.eq(user.id)
          expect(created.user.email).to.eq(user.email)
          expect(created.registrations[0].councilType).to.eq('crn')

          cy.deleteProfessionalViaApi(created.id, adminToken)
          cy.deleteUserViaApi(created.user.id, adminToken)
        })
      })
    })
  })
})
