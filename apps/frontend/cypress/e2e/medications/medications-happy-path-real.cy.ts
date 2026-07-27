// Stack real ponta a ponta — happy path (create/edit/toggle/delete) nunca
// bateu no backend real; a suíte existente é toda mockada.

const PLATFORM_EMAIL = 'platform@pulso.center'
const PLATFORM_PASSWORD = '123123123'

describe('Medications — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('creates, edits, deactivates and deletes a medication via the real UI', () => {
    cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
    cy.visit('/backoffice/medications/new')
    cy.get('[data-testid="medication-form"]', { timeout: 10000 }).should('be.visible')

    const name = `Medicamento Real ${Date.now()}`
    cy.get('[data-testid="medication-form-name"]').type(name)
    cy.get('[data-testid="medication-form-active-ingredient"]').type('Substância Teste')
    cy.get('[data-testid="medication-form-submit"]').click()

    cy.location('pathname', { timeout: 10000 }).should('eq', '/backoffice/medications')

    cy.getCookie('access_token').then((cookie) => {
      const platformToken = cookie!.value

      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/medications?search=${encodeURIComponent(name)}`,
        headers: { Authorization: `Bearer ${platformToken}` },
      }).then((listResponse) => {
        const created = listResponse.body.data[0]
        expect(created).to.exist

        // Catálogo tem 12k+ medicamentos (import ANVISA) — sem filtrar pela
        // busca real da UI, o item novo nunca aparece na primeira página.
        cy.get('[data-testid="medication-list-search"]').type(name)
        cy.get(`[data-testid="medication-row-${created.id}"]`, { timeout: 10000 }).should('exist')

        cy.get(`[data-testid="medication-edit-link-${created.id}"]`).click()
        cy.get('[data-testid="medication-form"]', { timeout: 10000 }).should('be.visible')
        const updatedName = `${name} Editado`
        cy.get('[data-testid="medication-form-name"]').clear().type(updatedName)
        cy.get('[data-testid="medication-form-submit"]').click()

        // update-medication não redireciona — fica na tela de edição com aviso inline.
        cy.get('[data-testid="edit-medication-success"]', { timeout: 10000 }).should('be.visible')

        cy.visit('/backoffice/medications')
        cy.get('[data-testid="medication-list-search"]').type(updatedName)
        cy.get(`[data-testid="medication-toggle-button-${created.id}"]`, { timeout: 10000 }).click()
        cy.get('[data-testid="medication-toggle-dialog"]').should('be.visible')
        cy.get('[data-testid="medication-toggle-dialog-cancel"]').click()
        cy.get('[data-testid="medication-toggle-dialog"]').should('not.exist')

        cy.get(`[data-testid="medication-toggle-button-${created.id}"]`).click()
        cy.get('[data-testid="medication-toggle-dialog"]').should('be.visible')
        cy.get('[data-testid="medication-toggle-dialog-confirm"]').click()

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/medications/${created.id}`,
          headers: { Authorization: `Bearer ${platformToken}` },
        }).then((getResponse) => {
          expect(getResponse.body.name).to.eq(updatedName)
          expect(getResponse.body.isActive).to.eq(false)

          cy.request({
            method: 'DELETE',
            url: `${Cypress.env('API_URL')}/medications/${created.id}`,
            headers: { Authorization: `Bearer ${platformToken}` },
          })
        })
      })
    })
  })
})
