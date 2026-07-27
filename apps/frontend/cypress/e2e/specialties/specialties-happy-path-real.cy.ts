// Stack real ponta a ponta — happy path (create/update/delete) nunca bateu no
// backend real; a suíte existente (specialties-create/update/delete/detail/list)
// é toda mockada.

const PLATFORM_EMAIL = 'platform@pulso.center'
const PLATFORM_PASSWORD = '123123123'

describe('Specialties — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('creates, edits and deletes a specialty via the real UI', () => {
    cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
    cy.visit('/backoffice/specialties/new')
    cy.get('[data-testid="specialty-form"]', { timeout: 10000 }).should('be.visible')

    const name = `Especialidade Real ${Date.now()}`
    cy.get('[data-testid="specialty-form-name"]').type(name)
    cy.get('[data-testid="specialty-form-submit"]').click()

    cy.location('pathname', { timeout: 10000 }).should('eq', '/backoffice/specialties')

    cy.getCookie('access_token').then((cookie) => {
      const platformToken = cookie!.value

      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/specialties?search=${encodeURIComponent(name)}`,
        headers: { Authorization: `Bearer ${platformToken}` },
      }).then((listResponse) => {
        const created = listResponse.body.data[0]
        expect(created).to.exist

        cy.get(`[data-testid="specialty-table-row-${created.id}"]`).should('exist')

        cy.get(`[data-testid="specialty-edit-link-${created.id}"]`).click()
        cy.get('[data-testid="specialty-form"]', { timeout: 10000 }).should('be.visible')
        const updatedName = `${name} Editada`
        cy.get('[data-testid="specialty-form-name"]').clear().type(updatedName)
        cy.get('[data-testid="specialty-form-submit"]').click()

        cy.location('pathname', { timeout: 10000 }).should('eq', `/backoffice/specialties/${created.id}`)

        cy.visit('/backoffice/specialties')
        cy.get(`[data-testid="specialty-table-row-${created.id}"]`, { timeout: 10000 }).should('contain.text', updatedName)

        cy.get(`[data-testid="specialty-delete-button-${created.id}"]`).click()
        cy.get('[data-testid="delete-specialty-dialog"]').should('be.visible')
        cy.get('[data-testid="delete-specialty-dialog-confirm"]').click()

        cy.get(`[data-testid="specialty-table-row-${created.id}"]`, { timeout: 10000 }).should('not.exist')
      })
    })
  })
})
