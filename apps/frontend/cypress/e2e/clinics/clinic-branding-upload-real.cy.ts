// Stack real ponta a ponta — zero cobertura hoje. Upload de identidade visual
// da clínica (logo, logo dark, favicon) é módulo de maior risco (upload de
// arquivo) — erro real de tipo/tamanho inválido também é provocado de
// verdade, não só simulado via intercept.

const PLATFORM_EMAIL = 'platform@pulso.center'
const PLATFORM_PASSWORD = '123123123'

// 1x1 transparent PNG.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('Clinic branding upload — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('uploads a real logo, then rejects an invalid file type and an oversized file client-side', () => {
    cy.seedClinic().then((clinic) => {
      cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
      cy.visit(`/backoffice/clinics/${clinic.id}`)

      cy.get('[data-testid="clinic-upload-section"]', { timeout: 10000 }).should('be.visible')

      // Passthrough intercept (no stubbed response) — only used to sync via
      // cy.wait on the real network round trip, request/response untouched.
      cy.intercept('POST', `${Cypress.env('API_URL')}/clinics/${clinic.id}/logo`).as('uploadLogo')

      cy.get('[data-testid="logo-file-input"]').selectFile(
        {
          contents: Cypress.Buffer.from(TINY_PNG_BASE64, 'base64'),
          fileName: 'logo.png',
          mimeType: 'image/png',
        },
        { force: true },
      )

      cy.wait('@uploadLogo').its('response.statusCode').should('eq', 201)
      cy.get('[data-testid="logo-upload-error"]').should('not.exist')

      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/clinics/${clinic.id}`,
        headers: { Authorization: `Bearer ${clinic.platformAdminToken}` },
      }).then((getResponse) => {
        expect(getResponse.body.logoUrl).to.be.a('string')

        // Tipo inválido — bloqueado no client, nunca chega a bater na API.
        cy.get('[data-testid="favicon-file-input"]').selectFile(
          {
            contents: Cypress.Buffer.from('not an image'),
            fileName: 'favicon.txt',
            mimeType: 'text/plain',
          },
          { force: true },
        )
        cy.get('[data-testid="favicon-upload-error"]').should('be.visible').and('contain.text', 'Tipo inválido')

        // Tamanho acima do limite (512KB para favicon) — também bloqueado no client.
        const oversized = Cypress.Buffer.alloc(513 * 1024, 1)
        cy.get('[data-testid="favicon-file-input"]').selectFile(
          {
            contents: oversized,
            fileName: 'favicon-grande.png',
            mimeType: 'image/png',
          },
          { force: true },
        )
        cy.get('[data-testid="favicon-upload-error"]').should('be.visible').and('contain.text', 'grande')

        cy.deleteClinicViaApi(clinic.id, clinic.platformAdminToken)
      })
    })
  })

  it('uploads a real dark-mode logo, then rejects an invalid file type client-side', () => {
    cy.seedClinic().then((clinic) => {
      cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
      cy.visit(`/backoffice/clinics/${clinic.id}`)

      cy.get('[data-testid="logo-dark-upload"]', { timeout: 10000 }).should('be.visible')

      cy.intercept('POST', `${Cypress.env('API_URL')}/clinics/${clinic.id}/logo-dark`).as('uploadLogoDark')

      cy.get('[data-testid="logo-dark-file-input"]').selectFile(
        {
          contents: Cypress.Buffer.from(TINY_PNG_BASE64, 'base64'),
          fileName: 'logo-dark.png',
          mimeType: 'image/png',
        },
        { force: true },
      )

      cy.wait('@uploadLogoDark').its('response.statusCode').should('eq', 201)
      cy.get('[data-testid="logo-dark-upload-error"]').should('not.exist')

      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/clinics/${clinic.id}`,
        headers: { Authorization: `Bearer ${clinic.platformAdminToken}` },
      }).then((getResponse) => {
        expect(getResponse.body.logoDarkUrl).to.be.a('string')

        // Tipo inválido — bloqueado no client, nunca chega a bater na API.
        cy.get('[data-testid="logo-dark-file-input"]').selectFile(
          {
            contents: Cypress.Buffer.from('not an image'),
            fileName: 'logo-dark.txt',
            mimeType: 'text/plain',
          },
          { force: true },
        )
        cy.get('[data-testid="logo-dark-upload-error"]').should('be.visible').and('contain.text', 'Tipo inválido')

        cy.deleteClinicViaApi(clinic.id, clinic.platformAdminToken)
      })
    })
  })
})
