// Aprofunda themes-happy-path-real.cy.ts (que só cobria o CRUD feliz + 403 de
// ADMIN comum). Formato de cor é validado no client com o mesmo regex do
// backend, então a rejeição de formato inválido é genuinamente real (nunca
// chega a bater na rede) — mas o 409 de slug duplicado só existe batendo no
// backend de verdade, então é provocado com um slug real já em uso.

const PLATFORM_EMAIL = 'platform@pulso.center'
const PLATFORM_PASSWORD = '123123123'

describe('Themes — validation real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('rejects an invalid hex color format client-side', () => {
    cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
    cy.visit('/backoffice/themes/new')
    cy.get('[data-testid="theme-form"]', { timeout: 10000 }).should('be.visible')

    cy.get('[data-testid="theme-form-name"]').type(`Tema Inválido ${Date.now()}`)
    cy.get('[data-testid="theme-form-accent-color"]').clear().type('azul')
    cy.get('[data-testid="theme-form-accent-soft-color"]').clear().type('#DBEAFE')
    cy.get('[data-testid="theme-form-submit"]').click()

    cy.contains('Cor inválida').should('be.visible')
    cy.location('pathname').should('eq', '/backoffice/themes/new')
  })

  it('rejects creating a theme with a slug already in use (409 real)', () => {
    cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
    cy.getCookie('access_token').then((cookie) => {
      const platformToken = cookie!.value
      const sharedSlug = `tema-duplicado-${Date.now()}`

      cy.request({
        method: 'POST',
        url: `${Cypress.env('API_URL')}/themes`,
        headers: { Authorization: `Bearer ${platformToken}` },
        body: { name: 'Tema Original', slug: sharedSlug, accentColor: '#2563EB', accentSoftColor: '#DBEAFE' },
      }).then((firstResponse) => {
        cy.visit('/backoffice/themes/new')
        cy.get('[data-testid="theme-form"]', { timeout: 10000 }).should('be.visible')

        cy.get('[data-testid="theme-form-name"]').type('Tema Duplicado')
        cy.get('[data-testid="theme-form-slug"]').type(sharedSlug)
        cy.get('[data-testid="theme-form-accent-color"]').clear().type('#16A34A')
        cy.get('[data-testid="theme-form-accent-soft-color"]').clear().type('#DCFCE7')
        cy.get('[data-testid="theme-form-submit"]').click()

        cy.get('[data-testid="theme-form-error"]', { timeout: 10000 }).should('be.visible')
        cy.location('pathname').should('eq', '/backoffice/themes/new')

        cy.request({
          method: 'DELETE',
          url: `${Cypress.env('API_URL')}/themes/${firstResponse.body.id}`,
          headers: { Authorization: `Bearer ${platformToken}` },
        })
      })
    })
  })
})
