// Stack real ponta a ponta — happy path de criar/editar usuário como ADMIN.
// Erros, loading e validação continuam mockados em users-create.cy.ts / users-update.cy.ts.

import { CLINIC_SLUG, expectClinicPath } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'

describe('Users — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('creates a user via the real form, then edits it, against the real backend', () => {
    const ts = Date.now()
    const fullName = `Usuário Real ${ts}`
    const email = `usuario.real.${ts}@e2e.test`
    const updatedFullName = `Usuário Real Atualizado ${ts}`
    const updatedEmail = `usuario.real.atualizado.${ts}@e2e.test`

    cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
      cy.visit(`/${CLINIC_SLUG}/users/new`)
      cy.get('[data-testid="user-form-fullname"]').type(fullName)
      cy.get('[data-testid="user-form-email"]').type(email)
      cy.get('[data-testid="user-form-password"]').type('Password123!')
      cy.get('[data-testid="user-form-submit"]').click()

      expectClinicPath('/users')

      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/users?search=${encodeURIComponent(fullName)}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((listResponse) => {
        const created = listResponse.body.data[0]
        expect(created).to.exist
        expect(created.email).to.eq(email)

        cy.get(`[data-testid="user-table-row-${created.id}"]`, { timeout: 10000 }).should('exist')

        cy.visit(`/${CLINIC_SLUG}/users/${created.id}/edit`)
        cy.get('[data-testid="user-form-fullname"]', { timeout: 10000 }).should('have.value', fullName)
        cy.get('[data-testid="user-form-fullname"]').clear().type(updatedFullName)
        cy.get('[data-testid="user-form-email"]').clear().type(updatedEmail)
        cy.get('[data-testid="user-form-submit"]').click()

        expectClinicPath('/users')

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/users/${created.id}`,
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then((getResponse) => {
          expect(getResponse.body.fullName).to.eq(updatedFullName)
          expect(getResponse.body.email).to.eq(updatedEmail)

          cy.deleteUserViaApi(created.id, adminToken)
        })
      })
    })
  })
})
