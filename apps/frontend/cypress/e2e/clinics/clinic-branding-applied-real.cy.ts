// Sem um import ou export, o TypeScript trata o arquivo como script e as
// constantes de topo passam a dividir o escopo global com as outras specs —
// PLATFORM_EMAIL e companhia colidiam entre nove arquivos.
export {}

// Stack real ponta a ponta — a aplicação dinâmica de tema/favicon da clínica
// (ClinicFaviconApplier + useApplyClinicTheme, montados no layout autenticado
// e presentes em toda página) nunca teve teste algum: sobreviveu a todas as
// ondas anteriores como o único item do levantamento original ainda sem
// cobertura. Verifica que logar numa clínica com tema/favicon vinculados
// aplica as CSS custom properties e o <link rel="icon"> reais no documento.

const PLATFORM_EMAIL = 'platform@pulso.center'
const PLATFORM_PASSWORD = '123123123'

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('Clinic theme/favicon dynamic application — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('applies the real linked theme CSS variables and favicon on an authenticated page', () => {
    cy.seedClinic().then((clinic) => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('API_URL')}/themes`,
        headers: { Authorization: `Bearer ${clinic.platformAdminToken}` },
        body: { name: `Tema Aplicado Real ${Date.now()}`, accentColor: '#2563eb', accentSoftColor: '#dbeafe' },
      }).then((themeResponse) => {
        const theme = themeResponse.body

        cy.request({
          method: 'PATCH',
          url: `${Cypress.env('API_URL')}/clinics/${clinic.id}`,
          headers: { Authorization: `Bearer ${clinic.platformAdminToken}` },
          body: { themeId: theme.id },
        }).then(() => {
          cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
          cy.visit(`/backoffice/clinics/${clinic.id}`)
          cy.get('[data-testid="favicon-file-input"]', { timeout: 10000 }).should('exist')

          cy.intercept('POST', `${Cypress.env('API_URL')}/clinics/${clinic.id}/favicon`).as('uploadFavicon')
          cy.get('[data-testid="favicon-file-input"]').selectFile(
            {
              contents: Cypress.Buffer.from(TINY_PNG_BASE64, 'base64'),
              fileName: 'favicon.png',
              mimeType: 'image/png',
            },
            { force: true },
          )
          cy.wait('@uploadFavicon').its('response.statusCode').should('eq', 201)
          cy.get('[data-testid="favicon-upload-error"]').should('not.exist')

          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/clinics/${clinic.id}`,
            headers: { Authorization: `Bearer ${clinic.platformAdminToken}` },
          }).then((getResponse) => {
            const faviconUrl = getResponse.body.faviconUrl
            expect(faviconUrl).to.be.a('string')

            const ts = Date.now()
            cy.createUserViaApi(
              { fullName: `Admin Tema ${ts}`, email: `admin.tema.${ts}@e2e.test`, password: 'Password123!', role: 'admin', clinicId: clinic.id },
              clinic.platformAdminToken,
            ).then((adminUser) => {
              cy.clearCookies()
              cy.loginAsClinicUser(`admin.tema.${ts}@e2e.test`, 'Password123!', clinic.slug)
              cy.visit(`/${clinic.slug}/dashboard`)
              cy.get('[data-testid="dashboard"]', { timeout: 10000 }).should('be.visible')

              cy.window().should((win) => {
                const root = win.document.documentElement
                expect(root.style.getPropertyValue('--accentLight').trim().toLowerCase()).to.eq('#2563eb')
                expect(root.style.getPropertyValue('--bgLight').trim()).to.not.eq('')
              })

              cy.window().should((win) => {
                const link = win.document.head.querySelector('link[rel="icon"][data-clinic-favicon]') as HTMLLinkElement | null
                expect(link, 'clinic favicon link').to.exist
                expect(link!.href).to.eq(faviconUrl)
              })

              // Hard-delete first — deleteClinicViaApi hard-deletes the clinic row, which
              // a soft-deleted (still-present) user row referencing it via clinic_id
              // would block on the FK constraint.
              cy.task('dbQuery', { sql: 'DELETE FROM users WHERE id = $1', params: [adminUser.id] })
              cy.deleteClinicViaApi(clinic.id, clinic.platformAdminToken)
              cy.request({
                method: 'DELETE',
                url: `${Cypress.env('API_URL')}/themes/${theme.id}`,
                headers: { Authorization: `Bearer ${clinic.platformAdminToken}` },
              })
            })
          })
        })
      })
    })
  })

  it('does not apply any custom theme variables when the clinic has no linked theme', () => {
    cy.seedClinic().then((clinic) => {
      const ts = Date.now()
      cy.createUserViaApi(
        { fullName: `Admin Sem Tema ${ts}`, email: `admin.semtema.${ts}@e2e.test`, password: 'Password123!', role: 'admin', clinicId: clinic.id },
        clinic.platformAdminToken,
      ).then((adminUser) => {
        cy.loginAsClinicUser(`admin.semtema.${ts}@e2e.test`, 'Password123!', clinic.slug)
        cy.visit(`/${clinic.slug}/dashboard`)
        cy.get('[data-testid="dashboard"]', { timeout: 10000 }).should('be.visible')

        cy.window().should((win) => {
          const root = win.document.documentElement
          expect(root.style.getPropertyValue('--accentLight').trim()).to.eq('')
        })

        cy.task('dbQuery', { sql: 'DELETE FROM users WHERE id = $1', params: [adminUser.id] })
        cy.deleteClinicViaApi(clinic.id, clinic.platformAdminToken)
      })
    })
  })
})
