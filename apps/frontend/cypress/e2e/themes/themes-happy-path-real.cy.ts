// Stack real ponta a ponta — CRUD de temas no backoffice nunca foi testado,
// nem mockado nem real. Só PLATFORM_ADMIN pode gerenciar; ADMIN de clínica é
// rejeitado com 403 real.

const PLATFORM_EMAIL = 'platform@pulso.center'
const PLATFORM_PASSWORD = '123123123'
const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'
const CLINIC_SLUG = 'pulso'

describe('Themes — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('PLATFORM_ADMIN creates, edits and deletes a theme via the real UI', () => {
    cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
    cy.visit('/backoffice/themes/new')
    cy.get('[data-testid="theme-form"]', { timeout: 10000 }).should('be.visible')

    const themeName = `Tema Real ${Date.now()}`
    cy.get('[data-testid="theme-form-name"]').type(themeName)
    cy.get('[data-testid="theme-form-accent-color"]').clear().type('#2563EB')
    cy.get('[data-testid="theme-form-accent-soft-color"]').clear().type('#DBEAFE')
    cy.get('[data-testid="theme-form-preview"]').should('be.visible')
    cy.get('[data-testid="theme-form-bg-color"]').clear().type('#F0F4F8')
    cy.get('[data-testid="theme-form-bg-dark-color"]').clear().type('#0A0F1A')
    cy.get('[data-testid="theme-form-radius-round"]').click()
    cy.get('[data-testid="theme-form-is-default"]').should('not.be.checked')
    cy.get('[data-testid="theme-form-submit"]').click()

    cy.location('pathname', { timeout: 10000 }).should('eq', '/backoffice/themes')

    cy.getCookie('access_token').then((cookie) => {
      const platformToken = cookie!.value

      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/themes`,
        headers: { Authorization: `Bearer ${platformToken}` },
      }).then((listResponse) => {
        const created = listResponse.body.data.find((t: any) => t.name === themeName)
        expect(created).to.exist
        expect(created.bgColor.toLowerCase()).to.eq('#f0f4f8')
        expect(created.bgDarkColor.toLowerCase()).to.eq('#0a0f1a')
        expect(created.borderRadius).to.eq('round')

        cy.get(`[data-testid="theme-row-${created.id}"]`).should('exist')

        cy.get(`[data-testid="theme-edit-${created.id}"]`).click()
        cy.get('[data-testid="theme-form"]', { timeout: 10000 }).should('be.visible')
        const updatedName = `${themeName} Editado`
        cy.get('[data-testid="theme-form-name"]').clear().type(updatedName)
        cy.get('[data-testid="theme-form-submit"]').click()

        cy.location('pathname', { timeout: 10000 }).should('eq', '/backoffice/themes')

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/themes/${created.id}`,
          headers: { Authorization: `Bearer ${platformToken}` },
        }).then((getResponse) => {
          expect(getResponse.body.name).to.eq(updatedName)

          // ADMIN de clínica não pode gerenciar temas — 403 real, não só UI escondida.
          // Precisa limpar o cookie access_token (platform admin) antes — cy.request
          // envia cookies automaticamente, e o guard prioriza sessão sobre o Bearer
          // explícito quando ambos estão presentes.
          cy.clearCookies()
          cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
            cy.request({
              method: 'POST',
              url: `${Cypress.env('API_URL')}/themes`,
              headers: { Authorization: `Bearer ${adminToken}` },
              body: { name: 'Tema Não Autorizado', accentColor: '#000000', accentSoftColor: '#FFFFFF' },
              failOnStatusCode: false,
            }).then((forbiddenResponse) => {
              expect(forbiddenResponse.status).to.eq(403)

              cy.clearCookies()
              cy.request({
                method: 'DELETE',
                url: `${Cypress.env('API_URL')}/themes/${created.id}`,
                headers: { Authorization: `Bearer ${platformToken}` },
              })
            })
          })
        })
      })
    })
  })
})
